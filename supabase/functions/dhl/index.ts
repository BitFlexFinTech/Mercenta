/**
 * §BATCH1a — THE `dhl` PROXY EDGE FUNCTION (DHL Express).
 *
 * The helper the real client (`src/lib/dhl/client.ts` → `/functions/v1/dhl/...`)
 * has always called and which did not exist.
 *
 * Route behaviour is declared ONCE in
 * `supabase/functions/_shared/proxyRoutes.ts`:
 *   · POST /shipments        — SIMULATED (a live MyDHL booking needs addresses and
 *                              package weights the shipment domain does not hold,
 *                              so live mode refuses with a stated code);
 *   · GET  /shipments/{wb}   — SIMULATED, and LIVE (tracking, confirmed contract);
 *   · POST /shipments/pickup — SIMULATED (live refuses, same missing input).
 *
 * Simulation makes ZERO network calls and does zero credential work; live calls
 * require a verified operator session. Deploy with JWT verification ON:
 * `supabase functions deploy dhl`.
 */
import {
  handleProxyRequest,
  proxyRequestTarget,
  resolveProxyMode,
  type ProxyRequest,
} from '../_shared/proxyRoutes.ts';
import { defaultLiveFetch } from '../_shared/liveFetch.ts';
import { parseCredentialBlob, readVaultSecret } from '../_shared/vault.ts';
import { operatorFromAuthorization } from '../_shared/operatorAuth.ts';
import { createDhlLiveCall, type DhlLiveCredentials } from '../_shared/live/dhlLive.ts';

const PROVIDER = 'dhl' as const;

/** Server env names — declared once, quoted by PRODUCTION_READINESS.md. */
const ENV = {
  apiKey: 'DHL_API_KEY',
  accountNumber: 'DHL_ACCOUNT_NUMBER',
} as const;

function corsHeaders(): Record<string, string> {
  return {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Secret-Ref',
  };
}

function json(body: unknown, status: number): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders(), 'Content-Type': 'application/json' },
  });
}

/** Resolve a LIVE DHL credential server-side (function env, then Vault). */
async function resolveCredentials(secretRef: string | null): Promise<DhlLiveCredentials | null> {
  const apiKey = Deno.env.get(ENV.apiKey) ?? '';
  const accountNumber = Deno.env.get(ENV.accountNumber) ?? '';
  if (apiKey) return { apiKey, ...(accountNumber ? { accountNumber } : {}) };
  if (!secretRef || !secretRef.startsWith('vault:')) return null;
  const raw = await readVaultSecret(secretRef);
  if (!raw) return null;
  const blob = parseCredentialBlob(raw, 'apiKey');
  if (!blob?.apiKey) return null;
  return { apiKey: blob.apiKey, ...(blob.accountNumber ? { accountNumber: blob.accountNumber } : {}) };
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
            'OPERATOR_REQUIRED — a live carrier call requires a verified operator session (super_admin or admin_staff).',
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

  const credentials = mode === 'live' ? await resolveCredentials(secretRef ?? null) : null;

  const request: ProxyRequest = {
    provider: PROVIDER,
    method: req.method,
    path: target.path,
    query: target.query,
    secretRef,
    body,
  };

  const outcome = await handleProxyRequest(request, {
    serverCredentialsResolved: credentials !== null,
    liveCall: credentials ? createDhlLiveCall(credentials, defaultLiveFetch) : undefined,
  });

  return json(outcome.body, outcome.status);
});
