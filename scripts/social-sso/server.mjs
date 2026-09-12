/**
 * §Phase E8 — MERCENTA SOCIAL SSO + PROVISIONING SERVICE (server-side only).
 *
 * Purpose: give an approved Mercenta brand a session in the real Postiz
 * application WITHOUT the brand ever signing up, creating an account, choosing a
 * plan or handling a password.
 *
 * How it works (no Postiz application code is modified):
 *   1. Mercenta's server mints a one-time handoff token
 *      t = base64url(payload) + "." + HMAC-SHA256(payload) where
 *      payload = { tenant, exp } — the Mercenta side holds the same SSO_SECRET
 *      (Supabase edge function, see supabase/functions/social-session).
 *   2. The brand's browser opens  {engineHost}/sso?t=<token>
 *      (Caddy routes /sso here; this service runs INSIDE the engine network).
 *   3. The service derives the brand's deterministic engine identity from the
 *      tenant, ensures it exists (login → register only on first use), and signs
 *      in SERVER-SIDE using the engine's real API.
 *   4. It forwards the engine's own session cookie to the browser and redirects
 *      into the application. The cookie is set first-party on the engine origin,
 *      so the full application opens already authenticated.
 *
 * Guarantees:
 *   - the brand's engine password NEVER reaches the browser;
 *   - no engine signup/login path is publicly exposed (Caddy answers 403 for
 *     /auth*, /api/auth/* from the internet; only this service can reach them,
 *     over the internal docker network);
 *   - provisioning is DETERMINISTIC and IDEMPOTENT: the same Mercenta tenant
 *     always maps to the same engine identity, so a refresh, a re-login or a
 *     repeated call can never create a second organization;
 *   - tenant isolation is the engine's own: each brand identity owns its own
 *     Organization, and the engine only returns that identity's organizations.
 *
 * Endpoints:
 *   GET /sso?t=<token>        → 302 into the application + session cookie
 *   GET /sso?t=<token>&json=1 → { ok, email, reused, organizationId } (no secret)
 *   GET /health               → 200 "ok"
 */
import { createHmac, timingSafeEqual } from 'node:crypto';
import { createServer } from 'node:http';

const ENGINE = process.env.ENGINE_INTERNAL || 'http://postiz:5000';
const SSO_SECRET = process.env.SSO_SECRET || '';
const BRAND_PASSWORD_SEED = process.env.BRAND_PASSWORD_SEED || '';
const BRAND_EMAIL_DOMAIN = process.env.BRAND_EMAIL_DOMAIN || 'social.mercenta.co.uk';
const PORT = Number(process.env.PORT || 8080);
const TOKEN_MAX_AGE_SECONDS = 900;

/** Deterministic engine identity for a Mercenta tenant. */
function engineIdentity(tenant) {
  const slug = String(tenant)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
  const digest = createHmac('sha256', SSO_SECRET).update(`email:${tenant}`).digest('hex').slice(0, 8);
  const email = `${slug}-${digest}@${BRAND_EMAIL_DOMAIN}`;
  const raw = createHmac('sha256', BRAND_PASSWORD_SEED)
    .update(`pw:${tenant}`)
    .digest('base64url')
    .slice(0, 20);
  return { email, password: `${raw}Aa1!` };
}

/** Verify a Mercenta handoff token. Returns the tenant, or null. */
function verifyToken(token) {
  if (!token || !SSO_SECRET) return null;
  const [payload, sig] = String(token).split('.');
  if (!payload || !sig) return null;
  const expected = createHmac('sha256', SSO_SECRET).update(payload).digest('base64url');
  try {
    const a = Buffer.from(sig);
    const b = Buffer.from(expected);
    if (a.length !== b.length || !timingSafeEqual(a, b)) return null;
  } catch {
    return null;
  }
  let parsed;
  try {
    parsed = JSON.parse(Buffer.from(payload, 'base64url').toString('utf8'));
  } catch {
    return null;
  }
  if (!parsed?.tenant) return null;
  if (typeof parsed.exp === 'number' && Date.now() / 1000 > parsed.exp + TOKEN_MAX_AGE_SECONDS) {
    return null;
  }
  return String(parsed.tenant);
}

/* ── engine calls (internal network only) ──────────────────────────────── */

async function enginePost(path, body) {
  const res = await fetch(`${ENGINE}${path}`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  });
  return { status: res.status, cookie: res.headers.get('set-cookie') || '', text: await res.text() };
}

async function engineGet(path, cookie) {
  const res = await fetch(`${ENGINE}${path}`, { headers: { cookie } });
  return { status: res.status, text: await res.text() };
}

/**
 * Ensure the brand's engine identity exists and return its session cookie.
 * LOGIN FIRST (idempotent: a re-login must never create a second org), and only
 * REGISTER on first use.
 */
async function ensureSession(tenant, company) {
  const { email, password } = engineIdentity(tenant);

  const login = await enginePost('/api/auth/login', { email, password, provider: 'LOCAL' });
  if (login.status === 200 && login.cookie) {
    return { ok: true, cookie: login.cookie, email, reused: true };
  }

  const register = await enginePost('/api/auth/register', {
    email,
    password,
    company: company || tenant,
    provider: 'LOCAL',
  });
  if (register.status === 200 || register.status === 201) {
    return { ok: true, cookie: register.cookie, email, reused: false };
  }
  return {
    ok: false,
    email,
    reused: false,
    error: `engine login ${login.status} / register ${register.status}: ${register.text.slice(0, 200)}`,
  };
}

function sessionCookieValue(setCookie) {
  const match = /(?:^|;\s*)auth=([^;]+)/.exec(setCookie);
  return match ? match[1] : '';
}

/* ── HTTP surface ──────────────────────────────────────────────────────── */

const server = createServer(async (req, res) => {
  const url = new URL(req.url || '/', 'http://internal');

  if (url.pathname === '/health') {
    res.writeHead(200, { 'content-type': 'text/plain' });
    res.end('ok');
    return;
  }

  if (url.pathname !== '/sso') {
    res.writeHead(404, { 'content-type': 'text/plain' });
    res.end('not found');
    return;
  }

  const tenant = verifyToken(url.searchParams.get('t'));
  if (!tenant) {
    res.writeHead(401, { 'content-type': 'text/plain' });
    res.end('invalid or expired handoff token');
    return;
  }

  let result;
  try {
    result = await ensureSession(tenant, url.searchParams.get('company') || undefined);
  } catch (err) {
    res.writeHead(502, { 'content-type': 'text/plain' });
    res.end(`engine unreachable: ${String(err?.message || err)}`);
    return;
  }

  if (!result.ok) {
    res.writeHead(502, { 'content-type': 'text/plain' });
    res.end(`provisioning failed — ${result.error}`);
    return;
  }

  // Diagnostics: never returns a password; the session cookie belongs to the
  // caller who already holds a valid handoff token for that tenant.
  if (url.searchParams.get('json') === '1') {
    const cookie = result.cookie.split(';')[0];
    const orgs = await engineGet('/api/user/organizations', cookie);
    let organizationId = '';
    try {
      const parsed = JSON.parse(orgs.text);
      organizationId = Array.isArray(parsed) && parsed[0]?.id ? String(parsed[0].id) : '';
    } catch {
      organizationId = '';
    }
    res.writeHead(200, { 'content-type': 'application/json', 'cache-control': 'no-store' });
    res.end(JSON.stringify({ ok: true, email: result.email, reused: result.reused, organizationId }));
    return;
  }

  const value =
    sessionCookieValue(result.cookie) || result.cookie.split(';')[0].replace(/^auth=/, '');
  res.writeHead(302, {
    location: '/',
    'set-cookie': `auth=${value}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=2592000`,
    'cache-control': 'no-store',
  });
  res.end();
});

server.listen(PORT, () => {
  console.log(`mercenta-social-sso listening on ${PORT} → engine ${ENGINE}`);
});

export { verifyToken, engineIdentity, ensureSession };
