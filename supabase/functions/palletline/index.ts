/**
 * §BATCH1a — THE `palletline` PROXY EDGE FUNCTION (UK-domestic palletised freight).
 *
 * The helper the real client (`src/lib/palletline/client.ts`) has always called:
 * with the shared `/functions/v1` base it requests
 * `/functions/v1/palletline/<route>`.
 *
 * HONEST LIMIT, stated rather than hidden: Palletline's wire contract is NOT
 * confirmed (the client's own header records that), so EVERY Palletline route is
 * simulated only and live mode refuses with the stated code
 * `PALLETLINE_CONTRACT_NOT_CONFIRMED`. The simulation is fully functional
 * (booking, the UK-domestic milestone lifecycle, depot exception + retry, failed
 * delivery + retry, the collection cut-off on cancellation, the carrier invoice),
 * so the whole UK-domestic lane stays demoable — but no live Palletline call is
 * invented.
 *
 * Simulation makes ZERO network calls and does zero credential work. Deploy with
 * JWT verification ON: `supabase functions deploy palletline`.
 */
import {
  handleProxyRequest,
  proxyRequestTarget,
  resolveProxyMode,
  type ProxyRequest,
} from '../_shared/proxyRoutes.ts';
import { operatorFromAuthorization } from '../_shared/operatorAuth.ts';
import { rateLimitGuard } from '../_shared/rateLimit.ts';

const PROVIDER = 'palletline' as const;

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

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response(null, { status: 204, headers: corsHeaders() });
  const limited = rateLimitGuard(req, 'palletline', corsHeaders());
  if (limited) return limited;

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

  const request: ProxyRequest = {
    provider: PROVIDER,
    method: req.method,
    path: target.path,
    query: target.query,
    secretRef,
    body,
  };

  /**
   * NO live caller is supplied, by design: every Palletline route is
   * `liveStatus: 'unsupported'`, so `handleProxyRequest` refuses in live mode
   * with the stated contract code before this point. `serverCredentialsResolved`
   * stays false, which is the truth — this function holds no Palletline
   * credential, because there is no confirmed contract for one to be used with.
   */
  const outcome = await handleProxyRequest(request, { serverCredentialsResolved: false });

  return json(outcome.body, outcome.status);
});
