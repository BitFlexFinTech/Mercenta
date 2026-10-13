/**
 * §PHASE B (2026-10-13) — `integration-secrets-status`.
 *
 * WHY THIS EXISTS
 * ---------------
 * The Integrations surface used to learn whether a provider key was present by
 * reading `import.meta.env['VITE_OPENROUTER_API_KEY']` IN THE BROWSER. Vite
 * inlines every `VITE_*` value into the public bundle, so that hint was only
 * available by shipping the key itself to every visitor. This function replaces
 * it: the answer now comes from the server, which reads Supabase Vault and
 * returns a NAME and a BOOLEAN — never a value.
 *
 * WHAT IT DELIBERATELY DOES NOT DO
 * -------------------------------
 * It never returns a secret, a fragment of one, its length, or a hash. It returns
 * `{ present: { <providerId>: true | false } }` and nothing else. A caller can
 * therefore learn only "Mercenta holds a key for this provider", which is exactly
 * what the operator hint needs and nothing more.
 *
 * AUTHORISATION: an operator session is REQUIRED (super_admin or admin_staff).
 * Knowing which providers Mercenta holds credentials for is business
 * intelligence, so it is not served to an anonymous caller. The check runs BEFORE
 * any Vault read, so an unauthorised request touches nothing.
 *
 * Deploy with JWT verification ON: `supabase functions deploy integration-secrets-status`
 * (never `--no-verify-jwt`).
 */
import { INTEGRATION_SECRET_PROVIDERS, secretPrefixFor } from '../_shared/integrationSecrets.ts';
import { listVaultSecretNames } from '../_shared/vault.ts';
import { operatorFromAuthorization } from '../_shared/operatorAuth.ts';
import { rateLimitGuard } from '../_shared/rateLimit.ts';

function corsHeaders(): Record<string, string> {
  return {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  };
}

function json(body: unknown, status: number): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders(), 'Content-Type': 'application/json' },
  });
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response(null, { status: 204, headers: corsHeaders() });
  const limited = rateLimitGuard(req, 'integration-secrets-status', corsHeaders());
  if (limited) return limited;
  if (req.method !== 'POST') return json({ ok: false, error: 'POST required.' }, 405);

  /* Authorisation BEFORE any Vault access. */
  const operator = operatorFromAuthorization(req.headers.get('Authorization'));
  if (!operator) {
    return json(
      {
        ok: false,
        code: 'OPERATOR_REQUIRED',
        error:
          'OPERATOR_REQUIRED — listing Mercenta-held provider credentials requires a verified operator session.',
      },
      403
    );
  }

  let requested: string[] = [];
  try {
    const body = (await req.json()) as { providers?: unknown };
    if (Array.isArray(body.providers)) {
      requested = body.providers.filter((p): p is string => typeof p === 'string');
    }
  } catch {
    /* An empty body is allowed: the answer then covers every known provider. */
  }

  /* The ALLOWLIST is the authority — a caller may narrow it but never widen it. */
  const ids =
    requested.length > 0
      ? INTEGRATION_SECRET_PROVIDERS.filter((p) => requested.includes(p))
      : [...INTEGRATION_SECRET_PROVIDERS];

  const present: Record<string, boolean> = {};
  for (const id of ids) {
    const names = await listVaultSecretNames(secretPrefixFor(id));
    /* A boolean derived from NAMES. No value, no fragment, no length leaves here. */
    present[id] = names.length > 0;
  }

  return json({ ok: true, present }, 200);
});
