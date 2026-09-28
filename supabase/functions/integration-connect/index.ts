/**
 * §BATCH1b — THE `integration-connect` EDGE FUNCTION (the wizard's steps 2 + 3).
 *
 * The ONE server-side connect endpoint the Integrations wizard calls for an
 * API-key provider. It runs the harmless provider test, stores the credential in
 * Vault on success, and returns ONLY the reference — the browser never holds a
 * real secret and never has to reach the provider directly.
 *
 * AUTHORISATION: a LIVE connect writes a credential and performs a provider call,
 * so it requires a verified operator session — the same rule `payouts-transfer`
 * and the provider proxies apply. SIMULATION needs no role: it makes no call and
 * stores nothing, which is what keeps the demo usable without credentials.
 *
 * Deploy with JWT verification ON: `supabase functions deploy integration-connect`
 * (never --no-verify-jwt).
 */
import { handleProviderConnect, type ConnectRequest } from '../_shared/providerConnect.ts';
import { credentialSecretName, writeVaultSecret } from '../_shared/vault.ts';
import { operatorFromAuthorization } from '../_shared/operatorAuth.ts';
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
  if (req.method !== 'POST') return json({ ok: false, error: 'POST required.' }, 405);

  let body: ConnectRequest;
  try {
    body = (await req.json()) as ConnectRequest;
  } catch {
    return json({ ok: false, code: 'BAD_REQUEST', error: 'A JSON body is required.' }, 400);
  }

  const simulate = body.simulate === true;
  if (!simulate) {
    const operator = operatorFromAuthorization(req.headers.get('Authorization'));
    if (!operator) {
      return json(
        {
          ok: false,
          simulated: false,
          code: 'OPERATOR_REQUIRED',
          error:
            'OPERATOR_REQUIRED — connecting a live provider requires a verified operator session (super_admin or admin_staff).',
        },
        403
      );
    }
  }

  const outcome = await handleProviderConnect(body, {
    transport: defaultLiveFetch,
    writeSecret: writeVaultSecret,
    secretName: credentialSecretName,
    now: () => new Date().toISOString(),
  });

  return json(outcome.body, outcome.status);
});
