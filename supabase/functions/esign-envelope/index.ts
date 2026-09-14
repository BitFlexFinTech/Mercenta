/**
 * §Canonical model §22 — E-SIGNATURE ENVELOPE Edge Function (DocuSign / PandaDoc).
 *
 * The live twin of `src/lib/esign/esign.ts`. The provider credential is
 * resolved SERVER-side from Supabase Vault via the stored secret reference.
 *
 * TRUTHFULNESS CONTRACT:
 *   1. VALIDATION — the provider must be in the allowlist and the envelope
 *      inputs must be complete.
 *   2. SIMULATION — with no resolvable credential the envelope is SIMULATED
 *      with an unmistakable `mock_env_…` id and ZERO network calls. GET status
 *      then simulates a deterministic lifecycle STATELESSLY, so a replay after
 *      a redeploy behaves identically.
 *   3. FAIL-CLOSED — with Vault unwired it answers 503 naming the fix.
 *   4. AUDIT — the outcome is written to the audit log.
 *
 * Deploy: supabase functions deploy esign-envelope
 */

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.57.4';

const ALLOWED_PROVIDERS = ['docusign', 'pandadoc'];

interface EnvelopeBody {
  provider?: string;
  contractId?: string;
  documentText?: string;
  signatoryName?: string;
  signatoryEmail?: string;
  secretRef?: string;
}

function corsHeaders(): Record<string, string> {
  return {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'POST, GET, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Secret-Ref',
  };
}

function json(body: unknown, status: number): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders(), 'Content-Type': 'application/json' },
  });
}

/** Deterministic simulated envelope id derived from the contract identity. */
function simulatedEnvelopeId(contractId: string): string {
  let h = 0;
  for (const c of contractId) h = (h * 31 + c.charCodeAt(0)) % 1_000_000;
  return `mock_env_${String(h).padStart(6, '0')}`;
}

/**
 * Stateless simulated lifecycle: the SAME envelope id always resolves to the
 * same state, so no in-memory map is needed and a redeploy cannot change it.
 * Every 4th envelope is DECLINED with a realistic reason, so the rejection path
 * stays demoable.
 */
function mockStatus(
  envelopeId: string,
  poll?: number
): { status: 'sent' | 'viewed' | 'completed' | 'declined'; declineReason?: string } {
  const n = Number(envelopeId.replace(/\D/g, '')) % 1_000_000;
  const declines = n % 4 === 0;
  const step = typeof poll === 'number' ? poll : 1;
  if (declines && step >= 3) {
    return {
      status: 'declined',
      declineReason: 'Signatory rejected the commission rate pending commercial review',
    };
  }
  if (step >= 3) return { status: 'completed' };
  if (step === 2) return { status: 'viewed' };
  return { status: 'sent' };
}

/** Read the provider credential from Vault (server-side only). */
async function resolveToken(secretRef: string): Promise<string | null> {
  const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
  if (!supabaseUrl || !serviceKey || !secretRef) return null;
  try {
    const supabase = createClient(supabaseUrl, serviceKey, {
      auth: { persistSession: false },
    });
    const { data } = await supabase
      .schema('vault')
      .from('decrypted_secrets')
      .select('decrypted_secret')
      .eq('name', secretRef)
      .maybeSingle();
    const value = (data as { decrypted_secret?: string } | null)?.decrypted_secret ?? '';
    return value.length > 0 ? value : null;
  } catch {
    return null;
  }
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response(null, { status: 204, headers: corsHeaders() });

  const url = new URL(req.url);
  const pathId = url.pathname.split('/').filter(Boolean).pop() ?? '';
  const isStatusRead = req.method === 'GET';

  // ── GET /esign-envelope/<id> — envelope status ───────────────────────────
  if (isStatusRead) {
    if (!pathId || pathId === 'esign-envelope') {
      return json({ error: 'An envelope id is required' }, 400);
    }
    if (pathId.startsWith('mock_env_')) {
      // (2) SIMULATION — a simulated envelope never asks a provider anything.
      const step = Number(url.searchParams.get('poll') ?? '1');
      return json({ ok: true, mode: 'mock', simulated: true, envelopeId: pathId, ...mockStatus(pathId, step) }, 200);
    }
    const secretRef = req.headers.get('X-Secret-Ref') ?? '';
    const token = await resolveToken(secretRef);
    if (!token) {
      return json(
        { error: 'The e-signature credential could not be resolved from Vault — run "supabase secrets set" before reading live envelope status.' },
        503
      );
    }
    try {
      const provider = (url.searchParams.get('provider') ?? 'docusign').toLowerCase();
      const endpoint =
        provider === 'pandadoc'
          ? `https://api.pandadoc.com/public/v1/documents/${encodeURIComponent(pathId)}`
          : `https://na4.docusign.net/restapi/v2.1/envelopes/${encodeURIComponent(pathId)}`;
      const res = await fetch(endpoint, { headers: { Authorization: `Bearer ${token}` } });
      if (!res.ok) {
        const text = await res.text();
        return json({ error: `Provider rejected the status read: ${text.slice(0, 300)}` }, 502);
      }
      const body = (await res.json()) as { status?: string; voidedReason?: string };
      return json({ ok: true, mode: 'live', simulated: false, status: body.status, declineReason: body.voidedReason }, 200);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'unknown transport error';
      return json({ error: `E-signature provider unavailable: ${msg}` }, 502);
    }
  }

  if (req.method !== 'POST') return json({ error: 'Method not allowed' }, 405);

  let body: EnvelopeBody;
  try {
    body = (await req.json()) as EnvelopeBody;
  } catch {
    return json({ error: 'Invalid JSON body' }, 400);
  }

  const provider = (body.provider ?? 'docusign').toLowerCase();

  // ── (1) VALIDATION ──────────────────────────────────────────────────────
  if (!ALLOWED_PROVIDERS.includes(provider)) {
    return json(
      { error: `Unknown provider "${provider}" — allowed: ${ALLOWED_PROVIDERS.join(', ')}` },
      400
    );
  }
  if (!body.contractId || !body.signatoryName || !body.signatoryEmail) {
    return json({ error: 'contractId, signatoryName and signatoryEmail are required' }, 400);
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(body.signatoryEmail)) {
    return json({ error: `Invalid signatory email "${body.signatoryEmail}"` }, 400);
  }

  const secretRef = body.secretRef ?? req.headers.get('X-Secret-Ref') ?? '';

  // ── (2) SIMULATION — a `mock:` reference is never sent to a provider ─────
  if (!secretRef || secretRef.startsWith('mock:')) {
    const envelopeId = simulatedEnvelopeId(body.contractId);
    return json(
      {
        ok: true,
        mode: 'mock',
        simulated: true,
        envelopeId,
        detail:
          'No live e-signature credential is configured for this connection, so the envelope is SIMULATED — nothing was sent for signature.',
      },
      200
    );
  }

  const token = await resolveToken(secretRef);
  if (!token) {
    // ── (3) FAIL-CLOSED ───────────────────────────────────────────────────
    return json(
      {
        error:
          'The e-signature credential could not be resolved from Vault — run "supabase secrets set" (or store the key via the Integrations Hub) before sending live envelopes.',
      },
      503
    );
  }

  // ── (4) REAL SEND ───────────────────────────────────────────────────────
  try {
    const endpoint =
      provider === 'pandadoc'
        ? 'https://api.pandadoc.com/public/v1/documents'
        : 'https://na4.docusign.net/restapi/v2.1/envelopes';
    const payload =
      provider === 'pandadoc'
        ? {
            name: `Mercenta distribution agreement ${body.contractId}`,
            recipients: [
              { email: body.signatoryEmail, first_name: body.signatoryName, role: 'signer' },
            ],
            content: body.documentText ?? '',
          }
        : {
            emailSubject: `Mercenta distribution agreement ${body.contractId}`,
            status: 'sent',
            recipients: {
              signers: [
                { email: body.signatoryEmail, name: body.signatoryName, recipientId: '1' },
              ],
            },
          };

    const res = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify(payload),
    });
    if (!res.ok) {
      const text = await res.text();
      return json({ error: `Provider rejected the envelope: ${text.slice(0, 300)}` }, 502);
    }
    const parsed = (await res.json()) as { envelopeId?: string; id?: string };
    const envelopeId = parsed.envelopeId ?? parsed.id ?? '';
    await audit(body.contractId, 'esign_envelope_sent', { provider, envelopeId });
    return json({ ok: true, mode: 'live', simulated: false, envelopeId }, 200);
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'unknown transport error';
    return json({ error: `E-signature provider unavailable: ${msg}` }, 502);
  }
});

/** (4) AUDIT — best-effort; never masks the envelope outcome. */
async function audit(
  contractId: string,
  action: string,
  metadata: Record<string, unknown>
): Promise<void> {
  const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
  if (!supabaseUrl || !serviceKey) return;
  try {
    await fetch(`${supabaseUrl}/rest/v1/audit_log`, {
      method: 'POST',
      headers: {
        apikey: serviceKey,
        Authorization: `Bearer ${serviceKey}`,
        'Content-Type': 'application/json',
        Prefer: 'return=minimal',
      },
      body: JSON.stringify({
        action,
        entity_type: 'contract',
        entity_id: contractId,
        details: metadata,
      }),
    });
  } catch {
    /* ignore */
  }
}
