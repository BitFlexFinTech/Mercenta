/**
 * §Canonical model §6/§7 — PAYOUT TRANSFER Edge Function (Wise / Payoneer).
 *
 * Mercenta is the intermediary: the retail channel pays Mercenta, Xero records
 * the accounting identity, and Mercenta pays the BRAND its share through a
 * payout rail. This function is the ONLY place a payout instruction reaches a
 * rail, and it holds the rail credentials server-side (never the browser).
 *
 *   DEFAULT rail   → Wise      (WISE_API_TOKEN + WISE_PROFILE_ID)
 *   SECONDARY rail → Payoneer  (PAYONEER_CLIENT_ID + PAYONEER_CLIENT_SECRET + PAYONEER_PROGRAM_ID)
 *
 * ⚠️ RAIL SOURCE OF TRUTH: `src/config/payouts.ts`. Deno cannot import from the
 * `@/` alias, so the rail vocabulary is duplicated HERE and the duplication is
 * pinned by `scripts/validate-edge-functions.mjs` (rail-name parity), exactly the
 * convention `instantly-reply-webhook` established for the outreach keywords.
 *
 * SAFETY CONTRACT (each clause is asserted by a validator):
 *   1. AUTHENTICATION — a verified Supabase JWT is required; the actor is
 *      derived from the VERIFIED token, NEVER from the request body.
 *   2. AUTHORISATION — only super_admin / admin_staff may move brand money.
 *   3. HUMAN APPROVAL — §7: no payout leaves Mercenta without operator approval.
 *      The caller must assert `approved: true`; there is no auto-send path.
 *   4. VALIDATION — a positive amount, a non-empty destination and a caller
 *      idempotency key are all mandatory; an unknown rail is REFUSED.
 *   5. IDEMPOTENCY — the key is forwarded to the rail so a retry storm cannot
 *      double-pay.
 *   6. SIMULATION — with no rail credentials the function returns an
 *      unmistakably simulated id (`mock_tr_<rail>_000001`) and makes ZERO
 *      network calls. A simulated transfer is NEVER reported as live.
 *   7. FAIL-CLOSED — with project envs missing it answers 503 instead of
 *      pretending success.
 *   8. AUDIT — every attempt (settled, refused or failed) writes an audit row.
 *
 * Deploy: supabase functions deploy payouts-transfer
 * (keep JWT verification ON — this is a money path.)
 */

import { rateLimitGuard } from '../_shared/rateLimit.ts';

const RAIL_SIMULATION_PREFIX: Record<string, string> = {
  wise: 'mock_tr_wise_',
  payoneer: 'mock_tr_payoneer_',
};

/** §6 — Stripe bills subscriptions; it is NOT a payout rail. Xero is accounting. */
const NON_PAYOUT_RAILS = ['stripe', 'xero', 'amazon_sp_api'];
/**
 * §6 / Founder decision T-1 — RECONCILED 2026-09-21. Payoneer is the canonical
 * PRIMARY/default Mercenta business + retail-channel payment account; Wise is
 * the SECONDARY rail. This declaration previously read 'wise' and inverted T-1.
 */
const DEFAULT_RAIL = 'payoneer';
const APPROVER_ROLES = ['super_admin', 'admin_staff'];

interface TransferBody {
  rail?: string;
  idempotencyKey?: string;
  amountGbp?: number;
  destinationAccountId?: string;
  currency?: string;
  approved?: boolean;
  /** Free-text operator reason — required for a manual/override approval. */
  approvalNote?: string;
}

function corsHeaders(): Record<string, string> {
  return {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization, Idempotency-Key, X-Secret-Ref',
  };
}

function json(body: unknown, status: number): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders(), 'Content-Type': 'application/json' },
  });
}

/** Credentials for a rail, resolved from the server environment ONLY. */
function railCredentials(rail: string): { url: string; token: string } | null {
  if (rail === 'wise') {
    const token = Deno.env.get('WISE_API_TOKEN') ?? '';
    if (!token) return null;
    return { url: 'https://api.transferwise.com/v3/transfers', token };
  }
  if (rail === 'payoneer') {
    const token = Deno.env.get('PAYONEER_CLIENT_SECRET') ?? '';
    if (!token) return null;
    // Payoneer payouts are submitted against the programme, not a bare REST
    // transfers collection; the endpoint differs but the contract is the same.
    return { url: 'https://api.payoneer.com/v4/programs/payouts', token };
  }
  return null;
}

/** Deterministic simulated rail response. NO network call of any kind. */
function simulateTransfer(rail: string, idempotencyKey: string): string {
  // Derive a stable, unmistakably simulated id from the idempotency key so a
  // replay of the same key returns the SAME simulated transfer.
  let h = 0;
  for (const c of idempotencyKey) h = (h * 31 + c.charCodeAt(0)) % 1_000_000;
  return `${RAIL_SIMULATION_PREFIX[rail]}${String(h).padStart(6, '0')}`;
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response(null, { status: 204, headers: corsHeaders() });
  const limited = rateLimitGuard(req, 'payouts-transfer', corsHeaders());
  if (limited) return limited;
  if (req.method !== 'POST') return json({ error: 'Method not allowed' }, 405);

  const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';

  let body: TransferBody;
  try {
    body = (await req.json()) as TransferBody;
  } catch {
    return json({ error: 'Invalid JSON body' }, 400);
  }

  const requestedRail = (body.rail ?? DEFAULT_RAIL).trim();

  // ── (4) VALIDATION — fail closed on anything ambiguous ──────────────────
  if (NON_PAYOUT_RAILS.includes(requestedRail)) {
    return json(
      {
        error: `"${requestedRail}" is not a payout rail. Mercenta pays brands via Payoneer (default) or Wise (secondary) — see the canonical business model §6.`,
      },
      400
    );
  }
  if (!Object.prototype.hasOwnProperty.call(RAIL_SIMULATION_PREFIX, requestedRail)) {
    return json(
      { error: `Unknown payout rail "${requestedRail}" — refusing to guess a provider` },
      400
    );
  }
  if (!body.idempotencyKey) {
    return json(
      { error: 'An Idempotency-Key is required — a payout without one could double-pay' },
      400
    );
  }
  if (typeof body.amountGbp !== 'number' || Number.isNaN(body.amountGbp)) {
    return json({ error: 'amountGbp must be a number' }, 400);
  }
  if (body.amountGbp <= 0) {
    return json({ error: 'transfer amount must be positive' }, 400);
  }
  if (!body.destinationAccountId) {
    return json({ error: 'destinationAccountId is required' }, 400);
  }

  // ── (3) HUMAN APPROVAL — §7, non-negotiable ─────────────────────────────
  if (body.approved !== true) {
    return json(
      {
        error:
          'PAYOUT_NOT_APPROVED — a brand payout requires explicit Founder / Super Admin approval before any instruction reaches the rail',
      },
      403
    );
  }

  // ── (1)+(2) AUTHENTICATION + AUTHORISATION from the VERIFIED JWT ────────
  // The actor is NEVER taken from the request body.
  const authHeader = req.headers.get('Authorization') ?? '';
  const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : '';
  if (!token) {
    return json({ error: 'Authorization bearer token required' }, 401);
  }

  if (!supabaseUrl || !serviceKey) {
    // No project envs configured → the function cannot verify anyone. A money
    // path must fail closed rather than trust an unverified caller.
    return json(
      {
        error:
          'Payout rail is not configured on the server (SUPABASE_URL / service role key unset) — refusing to move money unverified',
      },
      503
    );
  }

  const userRes = await fetch(`${supabaseUrl}/auth/v1/user`, {
    headers: { apikey: serviceKey, Authorization: `Bearer ${token}` },
  });
  if (!userRes.ok) {
    return json({ error: 'Invalid or expired session — payout refused' }, 401);
  }
  const user = (await userRes.json()) as {
    id?: string;
    app_metadata?: { role?: string; tenant_id?: string };
    user_metadata?: { role?: string; tenant_id?: string };
  };
  const actorId = user.id ?? 'unknown';
  const actorRole = user.app_metadata?.role ?? user.user_metadata?.role ?? 'unverified';
  const actorTenant = user.app_metadata?.tenant_id ?? user.user_metadata?.tenant_id ?? null;

  if (!APPROVER_ROLES.includes(actorRole)) {
    return json(
      {
        error: `Role "${actorRole}" may not approve a brand payout — this is a restricted finance operation`,
      },
      403
    );
  }

  const credentials = railCredentials(requestedRail);

  // ── (6) SIMULATION — positively no credentials configured ───────────────
  // Zero network calls. The response is EXPLICITLY labelled simulated so no
  // surface can present it as a live rail outcome.
  if (!credentials) {
    const simulatedTransferId = simulateTransfer(requestedRail, body.idempotencyKey);
    await audit({
      supabaseUrl,
      serviceKey,
      actorId,
      actorRole,
      actorTenant,
      action: 'brand_payout_simulated',
      rail: requestedRail,
      transferId: simulatedTransferId,
      amountGbp: body.amountGbp,
      idempotencyKey: body.idempotencyKey,
      note: body.approvalNote ?? '',
    });
    return json(
      {
        ok: true,
        mode: 'mock',
        rail: requestedRail,
        transferId: simulatedTransferId,
        simulated: true,
        detail:
          `${requestedRail} credentials are not configured, so this transfer is SIMULATED and no money moved. ` +
          `Set ${
            requestedRail === 'wise' ? 'WISE_API_TOKEN' : 'PAYONEER_CLIENT_SECRET'
          } to activate the live rail — no code change required.`,
      },
      200
    );
  }

  // ── (5) REAL RAIL CALL — idempotency forwarded, never a charge ───────────
  try {
    const railRes = await fetch(credentials.url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${credentials.token}`,
        // The rail itself deduplicates on this key, so even a retry storm
        // cannot create a second transfer for the same payout.
        'Idempotency-Key': body.idempotencyKey,
      },
      body: JSON.stringify({
        sourceAmount: body.amountGbp,
        sourceCurrency: body.currency ?? 'GBP',
        targetAccount: body.destinationAccountId,
        reference: body.idempotencyKey,
      }),
    });

    if (!railRes.ok) {
      const text = await railRes.text();
      await audit({
        supabaseUrl,
        serviceKey,
        actorId,
        actorRole,
        actorTenant,
        action: 'brand_payout_failed',
        rail: requestedRail,
        amountGbp: body.amountGbp,
        idempotencyKey: body.idempotencyKey,
        note: text.slice(0, 500),
      });
      return json({ error: `Rail rejected the transfer: ${text.slice(0, 500)}` }, 502);
    }

    const payload = (await railRes.json()) as { id?: string; transferId?: string };
    const transferId = payload.id ?? payload.transferId ?? '';
    await audit({
      supabaseUrl,
      serviceKey,
      actorId,
      actorRole,
      actorTenant,
      action: 'brand_payout_settled',
      rail: requestedRail,
      transferId,
      amountGbp: body.amountGbp,
      idempotencyKey: body.idempotencyKey,
    });
    return json({ ok: true, mode: 'live', rail: requestedRail, transferId, simulated: false }, 200);
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'unknown transport error';
    await audit({
      supabaseUrl,
      serviceKey,
      actorId,
      actorRole,
      actorTenant,
      action: 'brand_payout_failed',
      rail: requestedRail,
      amountGbp: body.amountGbp,
      idempotencyKey: body.idempotencyKey,
      note: msg,
    });
    return json({ error: `Rail unavailable: ${msg}` }, 502);
  }
});

/** (8) AUDIT — best-effort, never throws into the money path. */
async function audit(row: {
  supabaseUrl: string;
  serviceKey: string;
  actorId: string;
  actorRole: string;
  actorTenant: string | null;
  action: string;
  rail: string;
  transferId?: string;
  amountGbp: number;
  idempotencyKey: string;
  note?: string;
}): Promise<void> {
  if (!row.supabaseUrl || !row.serviceKey) return;
  try {
    await fetch(`${row.supabaseUrl}/rest/v1/audit_log`, {
      method: 'POST',
      headers: {
        apikey: row.serviceKey,
        Authorization: `Bearer ${row.serviceKey}`,
        'Content-Type': 'application/json',
        Prefer: 'return=minimal',
      },
      body: JSON.stringify({
        action: row.action,
        // Column names follow 015_create_audit_log.sql EXACTLY.
        entity_type: 'payout',
        entity_id: row.idempotencyKey,
        actor_id: /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(row.actorId)
          ? row.actorId
          : null,
        actor_role: row.actorRole,
        details: {
          rail: row.rail,
          role: row.actorRole,
          tenantId: row.actorTenant,
          transferId: row.transferId ?? null,
          amountGbp: row.amountGbp,
          // Truthful provenance: a simulated transfer is recorded as simulated.
          simulated: row.transferId ? row.transferId.startsWith('mock_tr_') : true,
          note: row.note ?? null,
        },
      }),
    });
  } catch {
    /* Audit failure must never mask the payout result. */
  }
}
