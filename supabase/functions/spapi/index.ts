/**
 * §BATCH1a — THE `spapi` PROXY EDGE FUNCTION (Amazon Selling Partner API).
 *
 * This is the helper the real client (`src/lib/spapi/client.ts`) has always
 * called and which DID NOT EXIST: every `/functions/v1/spapi/...` route in that
 * client previously reached nothing, so entering a real key could never make
 * anything sync.
 *
 * WHAT IT DOES
 *   · routes every declared route through the ONE manifest
 *     (`supabase/functions/_shared/proxyRoutes.ts`);
 *   · SIMULATION (no `X-Secret-Ref`, or a `mock:` ref): returns the same shapes
 *     the mock client returns, unmistakably labelled, with ZERO network calls and
 *     zero credential work;
 *   · LIVE (`vault:` ref): resolves the credential server-side (function env or
 *     Vault), then performs the real call — but only for routes whose contract is
 *     confirmed. Everything else refuses with a stated code;
 *   · FAILS CLOSED on an unknown credential scheme (never treated as simulation)
 *     and on a missing credential (503, never a pretend success).
 *
 * AUTHORISATION: a LIVE call requires a verified operator session — a brand must
 * never be able to trigger a channel read with Mercenta's own credentials.
 * Deploy with JWT verification ON: `supabase functions deploy spapi`.
 */
import {
  UK_MARKETPLACE_ID,
  handleProxyRequest,
  proxyRequestTarget,
  resolveProxyMode,
  type ProxyRequest,
} from '../_shared/proxyRoutes.ts';
import { defaultLiveFetch } from '../_shared/liveFetch.ts';
import { parseCredentialBlob, readVaultSecret } from '../_shared/vault.ts';
import { operatorFromAuthorization } from '../_shared/operatorAuth.ts';
import { createSpapiLiveCall, type SpapiLiveCredentials } from '../_shared/live/spapiLive.ts';

const PROVIDER = 'spapi' as const;

/** Server env names — declared once, quoted by PRODUCTION_READINESS.md. */
const ENV = {
  clientId: 'SPAPI_CLIENT_ID',
  clientSecret: 'SPAPI_CLIENT_SECRET',
  refreshToken: 'SPAPI_REFRESH_TOKEN',
  marketplaceId: 'SPAPI_MARKETPLACE_ID',
} as const;

function corsHeaders(): Record<string, string> {
  return {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Secret-Ref, X-Marketplace-Id',
  };
}

function json(body: unknown, status: number): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders(), 'Content-Type': 'application/json' },
  });
}

/**
 * Resolve a LIVE credential SERVER-SIDE, in this order:
 *   1. the function's own environment (`SPAPI_*`);
 *   2. Supabase Vault, through the `vault:` reference the wizard stored.
 * Returns null when neither holds a credential — the orchestrator then answers
 * 503 and NO provider call is made.
 */
async function resolveCredentials(secretRef: string | null): Promise<SpapiLiveCredentials | null> {
  const clientId = Deno.env.get(ENV.clientId) ?? '';
  const clientSecret = Deno.env.get(ENV.clientSecret) ?? '';
  const refreshToken = Deno.env.get(ENV.refreshToken) ?? '';
  const marketplaceId = Deno.env.get(ENV.marketplaceId) ?? UK_MARKETPLACE_ID;
  if (clientId && clientSecret && refreshToken) {
    return { clientId, clientSecret, refreshToken, marketplaceId };
  }
  if (!secretRef || !secretRef.startsWith('vault:')) return null;
  const raw = await readVaultSecret(secretRef);
  if (!raw) return null;
  const blob = parseCredentialBlob(raw);
  if (!blob?.clientId || !blob?.clientSecret || !blob?.refreshToken) return null;
  return {
    clientId: blob.clientId,
    clientSecret: blob.clientSecret,
    refreshToken: blob.refreshToken,
    marketplaceId: blob.marketplaceId || marketplaceId,
  };
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response(null, { status: 204, headers: corsHeaders() });

  const secretRef = req.headers.get('X-Secret-Ref');
  const mode = resolveProxyMode(secretRef);
  const target = proxyRequestTarget(req.url, PROVIDER);

  if (mode === 'live') {
    const operator = operatorFromAuthorization(req.headers.get('Authorization'));
    if (!operator) {
      return json(
        {
          ok: false,
          simulated: false,
          mode: 'live',
          error:
            'OPERATOR_REQUIRED — a live retail-channel call requires a verified operator session (super_admin or admin_staff).',
        },
        403
      );
    }
  }

  let body: unknown;
  if (req.method === 'POST') {
    try {
      body = await req.json();
    } catch {
      body = undefined;
    }
  }

  // Simulation does NO credential work at all — that is structural, not a promise.
  const credentials = mode === 'live' ? await resolveCredentials(secretRef ?? null) : null;

  const request: ProxyRequest = {
    provider: PROVIDER,
    method: req.method,
    path: target.path,
    query: target.query,
    secretRef,
    body,
    marketplaceId: credentials?.marketplaceId ?? req.headers.get('X-Marketplace-Id'),
  };

  const outcome = await handleProxyRequest(request, {
    serverCredentialsResolved: credentials !== null,
    liveCall: credentials ? createSpapiLiveCall(credentials, defaultLiveFetch) : undefined,
  });

  return json(outcome.body, outcome.status);
});
