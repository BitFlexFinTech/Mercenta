/**
 * §BATCH1b — THE `spapi-token-exchange` EDGE FUNCTION.
 *
 * The function `src/components/admin/integrations/IntegrationsPanel.tsx →
 * completeOAuthExchange` has ALWAYS called and which DID NOT EXIST. It exchanges
 * the SP-API consent authorization code at Amazon Login-with-Amazon and writes the
 * resulting credential to Supabase Vault.
 *
 * AUTHORISATION: the exchange stores a live credential, so it requires a verified
 * operator session. An explicit simulation needs no role.
 *
 * Supabase secrets required for a LIVE exchange:
 *   SPAPI_CLIENT_ID · SPAPI_CLIENT_SECRET   (supabase secrets set ...)
 *
 * Deploy with JWT verification ON: `supabase functions deploy spapi-token-exchange`
 * (never --no-verify-jwt).
 */
import { handleSpapiTokenExchange, type TokenExchangeRequest } from '../_shared/tokenExchange.ts';
import { credentialSecretName, writeVaultSecret } from '../_shared/vault.ts';
import { operatorFromAuthorization } from '../_shared/operatorAuth.ts';
import { rateLimitGuard } from '../_shared/rateLimit.ts';
import { defaultLiveFetch } from '../_shared/liveFetch.ts';

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
  const limited = rateLimitGuard(req, 'spapi-token-exchange', corsHeaders());
  if (limited) return limited;
  if (req.method !== 'POST') return json({ ok: false, error: 'POST required.' }, 405);

  let body: TokenExchangeRequest;
  try {
    body = (await req.json()) as TokenExchangeRequest;
  } catch {
    return json({ ok: false, code: 'BAD_REQUEST', error: 'A JSON body is required.' }, 400);
  }

  if (body.simulate !== true) {
    const operator = operatorFromAuthorization(req.headers.get('Authorization'));
    if (!operator) {
      return json(
        {
          ok: false,
          simulated: false,
          code: 'OPERATOR_REQUIRED',
          error:
            'OPERATOR_REQUIRED — exchanging an authorization code stores a live credential and requires a verified operator session (super_admin or admin_staff).',
        },
        403
      );
    }
  }

  const outcome = await handleSpapiTokenExchange(body, {
    transport: defaultLiveFetch,
    writeSecret: writeVaultSecret,
    secretName: credentialSecretName,
    env: {
      SPAPI_CLIENT_ID: Deno.env.get('SPAPI_CLIENT_ID'),
      SPAPI_CLIENT_SECRET: Deno.env.get('SPAPI_CLIENT_SECRET'),
    },
    now: () => new Date().toISOString(),
  });

  return json(outcome.body, outcome.status);
});
