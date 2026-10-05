/**
 * §Phase E8 — MERCENTA SOCIAL SESSION BRIDGE (Supabase Edge Function).
 *
 * The ONLY component that may mint an engine handoff token. It runs server-side,
 * holds `SOCIAL_SSO_SECRET` (the secret the engine's SSO service verifies with),
 * and returns:
 *
 *   { url, email, organizationId, reused }
 *
 * where `url` is the one-time handoff URL the brand's browser opens. Opening it
 * provisions the brand's engine organization (first use) or reuses it, signs the
 * brand in server-side, sets the engine session cookie first-party on the engine
 * origin and lands in the full Postiz application.
 *
 * Security posture (explicit, and a go-live item — see PRODUCTION_READINESS.md):
 *   - the secret never leaves the server; the browser only ever receives a
 *     short-lived HMAC token URL;
 *   - minting for a tenant is REFUSED unless the deployment explicitly allows
 *     simulation tenants (`SOCIAL_SSO_ALLOW_DEMO=true`), which matches this
 *     platform's existing simulation-first demo posture (the demo login portal
 *     already exposes every seeded demo brand deliberately);
 *   - in production the tenant must be resolved from the caller's verified
 *     Mercenta session, not from the request body.
 *
 * Deploy:  supabase functions deploy social-session
 * Secrets: SOCIAL_SSO_SECRET, SOCIAL_ENGINE_URL, SOCIAL_SSO_ALLOW_DEMO
 */
import { rateLimitGuard } from '../_shared/rateLimit.ts';

const ENGINE_URL = Deno.env.get('SOCIAL_ENGINE_URL') ?? '';
const SSO_SECRET = Deno.env.get('SOCIAL_SSO_SECRET') ?? '';
const ALLOW_DEMO = Deno.env.get('SOCIAL_SSO_ALLOW_DEMO') === 'true';
const BRAND_EMAIL_DOMAIN = Deno.env.get('SOCIAL_BRAND_EMAIL_DOMAIN') ?? 'social.mercenta.co.uk';

const CORS = {
  'access-control-allow-origin': '*',
  'access-control-allow-headers': 'authorization, content-type',
  'access-control-allow-methods': 'POST, OPTIONS',
};

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json', ...CORS },
  });
}

function base64url(bytes: Uint8Array): string {
  let s = '';
  for (const b of bytes) s += String.fromCharCode(b);
  return btoa(s).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

/** Deterministic brand email — must match the SSO service's derivation inputs. */
function brandEmail(tenant: string): string {
  const slug = tenant.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
  return `${slug}@${BRAND_EMAIL_DOMAIN}`;
}

/** Mint `base64url({tenant,exp}) + "." + HMAC-SHA256(payload)`. */
async function mintToken(tenant: string, ttlSeconds = 300): Promise<string> {
  const exp = Math.floor(Date.now() / 1000) + ttlSeconds;
  const payload = base64url(new TextEncoder().encode(JSON.stringify({ tenant, exp })));
  const key = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(SSO_SECRET),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );
  const sig = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(payload));
  return `${payload}.${base64url(new Uint8Array(sig))}`;
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response(null, { status: 204, headers: CORS });
  const limited = rateLimitGuard(req, 'social-session', CORS);
  if (limited) return limited;
  if (req.method !== 'POST') return json({ ok: false, error: 'method not allowed' }, 405);

  if (!ENGINE_URL || !SSO_SECRET) {
    return json(
      { ok: false, error: 'Mercenta Social is not configured on the server (SOCIAL_ENGINE_URL / SOCIAL_SSO_SECRET missing).' },
      503
    );
  }

  let tenant = '';
  try {
    const body = await req.json();
    tenant = String(body?.tenantId ?? '').trim();
  } catch {
    return json({ ok: false, error: 'invalid JSON body' }, 400);
  }
  if (!tenant) return json({ ok: false, error: 'tenantId is required' }, 400);
  if (!ALLOW_DEMO) {
    return json(
      {
        ok: false,
        error:
          'Refused: minting is restricted to authenticated Mercenta sessions. Set SOCIAL_SSO_ALLOW_DEMO=true only for a simulation deployment.',
      },
      403
    );
  }

  const token = await mintToken(tenant);
  const launchUrl = `${ENGINE_URL}/sso?t=${encodeURIComponent(token)}&company=${encodeURIComponent(tenant)}`;

  // Resolve/provision the engine organization so the caller can record the real
  // engine link (idempotent: a repeat call reuses the same organization).
  let organizationId = '';
  let reused = false;
  try {
    const probe = await fetch(`${ENGINE_URL}/sso?t=${encodeURIComponent(token)}&json=1`);
    if (probe.ok) {
      const data = await probe.json();
      organizationId = String(data?.organizationId ?? '');
      reused = data?.reused === true;
    }
  } catch {
    organizationId = '';
  }

  return json({ ok: true, url: launchUrl, email: brandEmail(tenant), organizationId, reused });
});
