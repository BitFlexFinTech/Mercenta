/** §Xero — Token refresh Edge Function.
 * Server-side only: holds XERO_CLIENT_SECRET in Deno.env, never exposed to browser.
 * POST /functions/v1/xero-token
 *
 * Body: { partnerId: string; refreshToken: string; grantType: 'refresh_token' | 'authorization_code'; code?: string; redirectUri?: string }
 * Returns: { accessToken: string; refreshToken: string; expiresIn: number; error?: string }
 *
 * §PHASE B (2026-10-13) — THE ANONYMOUS-ACCESS DEFECT FIXED HERE.
 *
 * REPOINTED. This function was documented as `deploy … --no-verify-jwt` and had
 * NO caller check of any kind. It therefore let an ANONYMOUS caller:
 *   · exchange an arbitrary `authorization_code` using Mercenta's own
 *     XERO_CLIENT_SECRET, and receive the resulting access AND refresh tokens in
 *     the response body; and
 *   · write those tokens into `xero_connections` for an arbitrary `partnerId`
 *     using the SERVICE-ROLE key, bypassing row-level security entirely.
 *
 * It now requires a verified OPERATOR session (`super_admin` or `admin_staff`) —
 * the same rule the provider proxies and `payouts-transfer` already apply —
 * checked BEFORE the Xero token endpoint is contacted and before any database
 * write. JWT verification must stay ON at deploy time.
 *
 * Deploy with JWT verification ON: `supabase functions deploy xero-token`
 * (never `--no-verify-jwt`). The browser attaches the session token
 * automatically — see `src/services/xero/tokenManager.ts`.
 */
import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.57.4';
import { rateLimitGuard } from '../_shared/rateLimit.ts';
import { operatorFromAuthorization } from '../_shared/operatorAuth.ts';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL') ?? '';
const SUPABASE_SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
const XERO_CLIENT_ID = Deno.env.get('XERO_CLIENT_ID') ?? '';
const XERO_CLIENT_SECRET = Deno.env.get('XERO_CLIENT_SECRET') ?? '';

function isConfigured(): boolean {
  return Boolean(XERO_CLIENT_ID && XERO_CLIENT_SECRET);
}

serve(async (req: Request) => {
  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  };

  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: corsHeaders });
  }
  const limited = rateLimitGuard(req, 'xero-token', corsHeaders);
  if (limited) return limited;
  if (req.method !== 'POST') {
    return new Response('Method not allowed', { status: 405, headers: corsHeaders });
  }

  /* §PHASE B — AUTHORISE BEFORE ANYTHING ELSE. No operator session means no
     Xero call and no database write. */
  const operator = operatorFromAuthorization(req.headers.get('Authorization'));
  if (!operator) {
    return new Response(
      JSON.stringify({
        error:
          'OPERATOR_REQUIRED — exchanging or refreshing a Xero token requires a verified operator session (super_admin or admin_staff).',
      }),
      { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  try {
    const body = await req.json() as {
      partnerId: string;
      refreshToken?: string;
      grantType: 'refresh_token' | 'authorization_code';
      code?: string;
      redirectUri?: string;
    };

    if (!isConfigured()) {
      return new Response(JSON.stringify({ error: 'Xero credentials not configured on server' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const params = new URLSearchParams();
    params.set('grant_type', body.grantType);
    params.set('client_id', XERO_CLIENT_ID);
    params.set('client_secret', XERO_CLIENT_SECRET);

    if (body.grantType === 'refresh_token' && body.refreshToken) {
      params.set('refresh_token', body.refreshToken);
    } else if (body.grantType === 'authorization_code' && body.code && body.redirectUri) {
      params.set('code', body.code);
      params.set('redirect_uri', body.redirectUri);
    } else {
      return new Response(JSON.stringify({ error: 'Missing required parameters for grant type' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Call Xero identity token endpoint
    const xeroRes = await fetch('https://identity.xero.com/connect/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: params.toString(),
    });

    if (!xeroRes.ok) {
      const text = await xeroRes.text();
      return new Response(JSON.stringify({ error: text, status: xeroRes.status }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const data = await xeroRes.json() as {
      access_token: string;
      refresh_token: string;
      expires_in: number;
    };

    // Update xero_connections in Supabase when we have a partnerId
    if (body.partnerId && SUPABASE_URL && SUPABASE_SERVICE_KEY) {
      const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);
      const expiresAt = new Date(Date.now() + data.expires_in * 1000).toISOString();
      await supabase.from('xero_connections').update({
        access_token: data.access_token,
        refresh_token: data.refresh_token,
        token_expires_at: expiresAt,
        status: 'active',
      }).eq('partner_id', body.partnerId);

      // Also log to xero_sync_log
      try {
        await supabase.from('xero_sync_log').insert({
          partner_id: body.partnerId,
          operation: 'token_refresh',
          records_affected: 0,
          success: true,
          error_message: null,
          api_calls_used: 1,
        });
      } catch { /* silent */ }
    }

    return new Response(JSON.stringify({
      accessToken: data.access_token,
      refreshToken: data.refresh_token,
      expiresIn: data.expires_in,
    }), { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Unknown error';
    return new Response(JSON.stringify({ error: msg }), {
      status: 500, headers: { 'Content-Type': 'application/json' },
    });
  }
});