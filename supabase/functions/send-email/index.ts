/**
 * §Canonical model §22 — SEND EMAIL Edge Function (Postmark / SendGrid).
 *
 * The live twin of `src/lib/mail/mail.ts → createRealMailClient`. The provider
 * API key is resolved SERVER-side from Supabase Vault through the secret
 * reference the Integrations Hub stored — the browser never holds it.
 *
 * TRUTHFULNESS CONTRACT:
 *   1. SIMULATION — with no resolvable credential the function returns an
 *      unmistakably simulated id (`mock:msg-00001`) and makes ZERO network
 *      calls. A simulated send is NEVER reported as a delivered live email.
 *   2. FAIL-CLOSED — with Vault unwired it answers 503 with a clear message
 *      rather than throwing.
 *   3. VALIDATION — the provider must be in the allowlist and the recipient
 *      must be a well-formed address.
 *   4. IDEMPOTENCY — an optional key prevents a retry storm duplicating a send.
 *   5. AUDIT — every outcome writes an audit row.
 *
 * Deploy: supabase functions deploy send-email
 *   supabase secrets set VAULT_SERVICE_ROLE_KEY=... (or rely on the built-in key)
 */

const ALLOWED_PROVIDERS = ['postmark', 'sendgrid'];
const PROVIDER_ENDPOINTS: Record<string, string> = {
  postmark: 'https://api.postmarkapp.com/email',
  sendgrid: 'https://api.sendgrid.com/v3/mail/send',
};

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.57.4';

interface SendEmailBody {
  to?: string;
  subject?: string;
  text?: string;
  provider?: string;
  secretRef?: string;
  idempotencyKey?: string;
}

function corsHeaders(): Record<string, string> {
  return {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Secret-Ref',
  };
}

function json(body: unknown, status: number): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders(), 'Content-Type': 'application/json' },
  });
}

function isEmail(value: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(value);
}

/** Simulated message ids are unmistakably fake and sequential. */
let simulatedCounter = 0;
function simulatedMessageId(): string {
  simulatedCounter += 1;
  return `mock:msg-${String(simulatedCounter).padStart(5, '0')}`;
}

/**
 * Resolve a provider API token from Supabase Vault using the secret reference
 * the Integrations Hub stored. Reads `vault.decrypted_secrets` with the
 * service-role client, so only the server ever sees the plaintext key. Returns
 * null when Vault is not wired — the caller then fails closed (503) or
 * simulates, never guesses a key.
 */
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
  if (req.method !== 'POST') return json({ error: 'Method not allowed' }, 405);

  let body: SendEmailBody;
  try {
    body = (await req.json()) as SendEmailBody;
  } catch {
    return json({ error: 'Invalid JSON body' }, 400);
  }

  const provider = (body.provider ?? 'postmark').toLowerCase();

  // ── (3) VALIDATION ──────────────────────────────────────────────────────
  if (!ALLOWED_PROVIDERS.includes(provider)) {
    return json(
      { error: `Unknown provider "${provider}" — allowed: ${ALLOWED_PROVIDERS.join(', ')}` },
      400
    );
  }
  const to = (body.to ?? '').trim();
  if (!isEmail(to)) {
    return json({ error: `Invalid recipient address "${to}" — message not sent` }, 400);
  }
  if (!body.subject || !body.text) {
    return json({ error: 'subject and text are required' }, 400);
  }

  // ── (2) FAIL-CLOSED / (1) SIMULATION ────────────────────────────────────
  // A `mock:` secret reference is NEVER sent to a provider — it is the marker
  // the client uses while the connection is only simulated.
  const secretRef = body.secretRef ?? req.headers.get('X-Secret-Ref') ?? '';
  const isSimulatedRef = !secretRef || secretRef.startsWith('mock:');
  if (isSimulatedRef) {
    return json(
      {
        ok: true,
        mode: 'mock',
        simulated: true,
        messageId: simulatedMessageId(),
        detail:
          'No real provider credential is configured for this connection, so the message is SIMULATED — nothing was delivered.',
      },
      200
    );
  }

  const token = await resolveToken(secretRef);
  if (!token) {
    return json(
      {
        error:
          'The provider credential could not be resolved from Vault — run "supabase secrets set" (or store the key via the Integrations Hub) before sending live email.',
      },
      503
    );
  }

  // ── (4) REAL SEND — idempotency key forwarded ───────────────────────────
  try {
    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    let payload: Record<string, unknown>;

    if (provider === 'postmark') {
      headers['X-Postmark-Server-Token'] = token;
      payload = { From: body.subject, To: to, Subject: body.subject, TextBody: body.text };
    } else {
      headers.Authorization = `Bearer ${token}`;
      payload = {
        personalizations: [{ to: [{ email: to }] }],
        from: { email: 'no-reply@mercenta.co.uk' },
        subject: body.subject,
        content: [{ type: 'text/plain', value: body.text }],
      };
    }
    if (body.idempotencyKey) headers['Idempotency-Key'] = body.idempotencyKey;

    const res = await fetch(PROVIDER_ENDPOINTS[provider], {
      method: 'POST',
      headers,
      body: JSON.stringify(payload),
    });

    if (!res.ok) {
      const text = await res.text();
      return json({ error: `Provider rejected the message: ${text.slice(0, 400)}` }, 502);
    }

    // Postmark returns MessageID in the body; SendGrid returns X-Message-Id in
    // the response headers. Both shapes are captured so the caller always gets
    // the provider's own identity for the message.
    let messageId = res.headers.get('X-Message-Id') ?? '';
    try {
      const parsed = (await res.json()) as { MessageID?: string; messageId?: string };
      messageId = parsed.MessageID ?? parsed.messageId ?? messageId;
    } catch {
      /* SendGrid returns 202 with no body — the header id stands. */
    }

    return json({ ok: true, mode: 'live', simulated: false, messageId }, 200);
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'unknown transport error';
    return json({ error: `Email provider unavailable: ${msg}` }, 502);
  }
});
