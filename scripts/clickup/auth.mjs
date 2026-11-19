#!/usr/bin/env node
/**
 * SECTION: CLICKUP OAUTH — MERCENTA ONE-CLICK AUTHORISATION.
 *
 * WHY THIS EXISTS. The ClickUp MCP token on this machine CANNOT authenticate the local
 * reporting scripts: it is issued for mcp.clickup.com, and api.clickup.com rejects it with
 * HTTP 401 OAUTH_019 (proved by a live test, 2026-11-19). So the scripts need their OWN
 * credential.
 *
 * TWO WAYS IN — the two are kept strictly apart and are never mixed:
 *   · OPTION 1 (recommended, and the one actually used): a PERSONAL API token (`pk_...`).
 *     ClickUp documents this for "individual or testing purposes"; it needs no app
 *     registration and never expires. Entered once on the local setup page.
 *   · OPTION 2: the OAuth authorisation-code flow (register an app, then click Allow).
 *     The app is registered and this path is kept working, but it is NOT needed for the
 *     scripts, and its credentials are never mixed with the personal token.
 *
 * A submitted token is CHECKED AGAINST CLICKUP BEFORE IT IS SAVED, so a wrong token is
 * never written to disk.
 *
 * SECURITY RULES BUILT IN:
 *   - The server binds to 127.0.0.1 ONLY. It is never reachable from the network.
 *   - A token is sent in a POST BODY only — never in a URL, query string or log line.
 *   - OAuth `state` is generated with a CSPRNG and validated on the callback (CSRF guard).
 *   - No secret or token is ever printed, logged, or written into the repository.
 *   - The token file lives OUTSIDE the project, in a 700 directory, as a 600 file.
 *   - The server shuts itself down after a success, an error, or a timeout.
 *   - Existing valid credentials are NEVER overwritten without --force.
 *
 * USAGE
 *   node scripts/clickup/auth.mjs             start the local setup page
 *   node scripts/clickup/auth.mjs --status     is a connection already configured?
 *   node scripts/clickup/auth.mjs --self-test  offline tests, no network, no secrets
 *   node scripts/clickup/auth.mjs --force      replace existing credentials
 */
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import http from 'node:http';
import crypto from 'node:crypto';
import { execFile } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const CONFIG_DIR = path.join(os.homedir(), '.config', 'mercenta');
const TOKEN_FILE = path.join(CONFIG_DIR, 'clickup.env');
const APP_NAME = 'Mercenta Automation';
const AUTHORIZE_URL = 'https://app.clickup.com/api';
const TOKEN_URL = 'https://api.clickup.com/api/v2/oauth/token';
const API_BASE = 'https://api.clickup.com/api/v2';
const WORKSPACE = '1200400000014349';
/**
 * §REPOINTED (2026-11-19) — the page that ACTUALLY holds OAuth app creation.
 * `https://app.clickup.com/settings/apps` ("App Settings") offers only personal API tokens
 * and authorized apps, and has NO app-creation control at all — confirmed by reading the
 * live page on 2026-11-19. The control (labelled "Create", NOT "Create new app") lives on
 * the "ClickUp API Settings" sub-tab of this URL. The old value sent the Owner to a page
 * where the button does not exist.
 */
const APPS_PAGE = 'https://app.clickup.com/' + WORKSPACE + '/settings/team/' + WORKSPACE + '/clickup-api/settings';
const DEFAULT_PORT = 8787;
const PLACEHOLDER = 'REPLACE_WITH_YOUR_CLICKUP_TOKEN';
const SETUP_TIMEOUT_MS = 10 * 60 * 1000;

/* ================= pure helpers (all unit-testable offline) ================= */

/** A CSPRNG OAuth state value. Never derived from time or Math.random. */
export function generateState() {
  return crypto.randomBytes(32).toString('hex');
}

/** Constant-time comparison, so a timing signal cannot leak the expected state. */
export function validateState(received, expected) {
  if (typeof received !== 'string' || typeof expected !== 'string') return false;
  if (received.length === 0 || expected.length === 0) return false;
  const a = Buffer.from(received);
  const b = Buffer.from(expected);
  if (a.length !== b.length) return false;
  return crypto.timingSafeEqual(a, b);
}

/** The exact URL the owner's browser is sent to. */
export function buildAuthorizeUrl(clientId, redirectUri, state) {
  const u = new URL(AUTHORIZE_URL);
  u.searchParams.set('client_id', clientId);
  u.searchParams.set('redirect_uri', redirectUri);
  u.searchParams.set('state', state);
  return u.toString();
}

/** Parse the callback query string. Returns a typed result, never throws. */
export function parseCallback(searchParams) {
  const error = searchParams.get('error');
  const code = searchParams.get('code');
  const state = searchParams.get('state');
  if (error) return { ok: false, reason: 'provider-error', error };
  if (!code) return { ok: false, reason: 'missing-code' };
  if (!state) return { ok: false, reason: 'missing-state' };
  return { ok: true, code, state };
}

/** The redirect URI that must be registered on the ClickUp app. */
export function redirectUriFor(port) {
  return `http://localhost:${port}/callback`;
}

/* ================= credential storage (outside the repository) ================= */

export function ensureSecureDir(dir = CONFIG_DIR) {
  fs.mkdirSync(dir, { recursive: true, mode: 0o700 });
  try { fs.chmodSync(dir, 0o700); } catch { /* best effort on exotic filesystems */ }
  return dir;
}

/**
 * Store the token. The key is CLICKUP_API_TOKEN — the SAME key the reporting script
 * already reads — so report.mjs needs no restructuring to consume it.
 *
 * `kind` records WHICH kind of credential this is ('personal' or 'oauth'). The two are
 * deliberately kept apart: a personal token needs no OAuth app credentials, and nothing
 * here ever mixes the two.
 */
export function storeToken(token, file = TOKEN_FILE, kind = 'oauth') {
  if (typeof token !== 'string' || token.trim().length === 0) {
    throw new Error('refusing to store an empty token');
  }
  if (/\s/.test(token.trim())) {
    throw new Error('refusing to store a token containing whitespace');
  }
  ensureSecureDir(path.dirname(file));
  const body =
    '# Mercenta ClickUp credential. Written by scripts/clickup/auth.mjs.\n' +
    '# OUTSIDE the repository. Never commit, print, log or copy this value.\n' +
    `CLICKUP_API_TOKEN=${token.trim()}\n` +
    'CLICKUP_TOKEN_KIND=' + (kind === 'personal' ? 'personal' : 'oauth') + '\n' +
    `CLICKUP_TOKEN_OBTAINED=${new Date().toISOString()}\n`;
  fs.writeFileSync(file, body, { mode: 0o600 });
  fs.chmodSync(file, 0o600);
  return file;
}

/** Which kind of credential is stored: 'personal' | 'oauth' | null. */
export function readStoredTokenKind(file = TOKEN_FILE) {
  if (!fs.existsSync(file)) return null;
  const m = fs.readFileSync(file, 'utf8').match(/^\s*CLICKUP_TOKEN_KIND\s*=\s*(\S+)\s*$/m);
  return m ? m[1].trim() : null;
}

/** Read the stored token, or null. A placeholder counts as NOT configured. */
export function readStoredToken(file = TOKEN_FILE) {
  if (!fs.existsSync(file)) return null;
  const txt = fs.readFileSync(file, 'utf8');
  const m = txt.match(/^\s*CLICKUP_API_TOKEN\s*=\s*(\S+)\s*$/m);
  if (!m) return null;
  const v = m[1].trim();
  if (!v || v === PLACEHOLDER) return null;
  return v;
}

export function hasStoredToken(file = TOKEN_FILE) {
  return readStoredToken(file) !== null;
}

function oct(mode) {
  return (mode & 0o777).toString(8).padStart(3, '0');
}

export function fileMode(file = TOKEN_FILE) {
  return fs.existsSync(file) ? oct(fs.statSync(file).mode) : null;
}

export function dirMode(dir = CONFIG_DIR) {
  return fs.existsSync(dir) ? oct(fs.statSync(dir).mode) : null;
}

/* ================= the authorization-code exchange ================= */

/**
 * Exchange the one-time code for an access token.
 * `fetchImpl` is injectable so the offline tests can exercise success AND every failure
 * without touching the network. The secret is never logged, in any branch.
 */
export async function exchangeCode({ clientId, clientSecret, code, fetchImpl = fetch }) {
  if (!clientId || !clientSecret || !code) {
    return { ok: false, reason: 'missing-input' };
  }
  let res;
  try {
    res = await fetchImpl(TOKEN_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ client_id: clientId, client_secret: clientSecret, code }),
    });
  } catch (e) {
    return { ok: false, reason: 'network-error', error: String(e && e.message ? e.message : e) };
  }
  let body = null;
  try { body = await res.json(); } catch { body = null; }
  if (!res.ok) {
    return {
      ok: false,
      reason: 'rejected',
      status: res.status,
      error: body && (body.err || body.error) ? String(body.err || body.error) : 'HTTP ' + res.status,
    };
  }
  if (!body || typeof body.access_token !== 'string' || body.access_token.length === 0) {
    return { ok: false, reason: 'no-token-in-response' };
  }
  return { ok: true, token: body.access_token };
}

/**
 * ClickUp accepts TWO token shapes and they use DIFFERENT headers:
 *   · a personal API token (`pk_...`) goes in RAW:   Authorization: pk_...
 *   · an OAuth access token goes as a BEARER:        Authorization: Bearer ...
 * Sending the wrong one returns 401, so the shape is DETECTED rather than guessed.
 * (report.mjs already sends the raw token, which is correct for a personal token.)
 */
export function authHeaderFor(token) {
  const t = String(token || '');
  return t.startsWith('pk_') ? t : 'Bearer ' + t;
}

/**
 * Prove a token actually works against the ordinary ClickUp API before we rely on it.
 * This is the check that would have caught the MCP token (HTTP 401 OAUTH_019).
 *
 * The header the token's shape implies is tried FIRST; if that is rejected the other
 * form is tried too, so a token that works either way is never reported as broken.
 */
export async function verifyToken(token, fetchImpl = fetch) {
  if (!token) return { ok: false, reason: 'missing-token' };
  const first = authHeaderFor(token);
  const candidates = [first, first.startsWith('Bearer ') ? String(token) : 'Bearer ' + token];

  let res = null;
  let lastError = null;
  for (const header of candidates) {
    try {
      res = await fetchImpl(`${API_BASE}/team`, { headers: { Authorization: header } });
    } catch (e) {
      lastError = e;
      res = null;
      continue;
    }
    if (res.ok) break;
  }
  if (!res) {
    return { ok: false, reason: 'network-error', error: String(lastError && lastError.message ? lastError.message : lastError) };
  }
  if (!res.ok) {
    return { ok: false, reason: 'rejected', status: res.status };
  }
  let body = null;
  try { body = await res.json(); } catch { body = null; }
  const teams = (body && Array.isArray(body.teams)) ? body.teams : [];
  const found = teams.find((t) => String(t.id) === WORKSPACE) || null;
  return {
    ok: true,
    workspaceFound: Boolean(found),
    workspaceName: found ? found.name : null,
    teamCount: teams.length,
  };
}

/* ================= the localhost-only callback server ================= */

function page(title, body) {
  return '<!doctype html><html lang="en"><head><meta charset="utf-8"><title>' + title + '</title>' +
    '<meta name="viewport" content="width=device-width,initial-scale=1">' +
    '<style>body{font:15px/1.6 system-ui,-apple-system,sans-serif;max-width:660px;margin:3rem auto;padding:0 1.2rem;color:#111}' +
    'h1{font-size:1.35rem}code{background:#f3f3f3;padding:.15rem .35rem;border-radius:4px;word-break:break-all;font-family:ui-monospace,monospace}' +
    'input{width:100%;padding:.6rem;font-size:14px;margin:.25rem 0 1rem;box-sizing:border-box;font-family:ui-monospace,monospace;border:1px solid #ccc;border-radius:6px}' +
    'button{background:#111;color:#fff;border:0;padding:.7rem 1.2rem;font-size:15px;border-radius:6px;cursor:pointer}' +
    'label{font-weight:600;font-size:13px;text-transform:uppercase;letter-spacing:.03em}' +
    'h2{font-size:1.05rem;margin:1.8rem 0 .4rem}hr{border:0;border-top:1px solid #e5e5e5;margin:2.2rem 0}' +
    'a{color:#1d4ed8}' +
    '.ok{color:#15803d;font-weight:600}.bad{color:#b91c1c;font-weight:600}ol{padding-left:1.2rem}li{margin:.4rem 0}' +
    '.note{background:#f7f7f7;border-left:3px solid #999;padding:.7rem 1rem;margin:1rem 0;font-size:14px}</style></head>' +
    '<body><h1>' + title + '</h1>' + body + '</body></html>';
}

/**
 * The one-click setup server.
 * BINDS TO 127.0.0.1 ONLY — never 0.0.0.0, never the LAN.
 * Resolves { ok, token?, reason? } and always closes itself.
 */
export function startSetupServer({ port, state, onLog = () => {}, fetchImpl = fetch, tokenFile = TOKEN_FILE }) {
  const redirectUri = redirectUriFor(port);
  let creds = { clientId: '', clientSecret: '' };
  let settled = false;
  let resolveDone;
  const done = new Promise((r) => { resolveDone = r; });

  const finish = (result) => {
    if (settled) return;
    settled = true;
    clearTimeout(timer);
    server.close();
    resolveDone(result);
  };

  const server = http.createServer(async (req, res) => {
    /**
     * §DEFECT FIXED AT SOURCE (2026-11-19). The setup page was CACHEABLE, so after the
     * helper was updated the browser kept showing the OLD single-option form — a stale
     * credential page, which is both confusing and unsafe (a stale "Connected" page is
     * worse still). One shim here covers EVERY html response below.
     */
    const rawWriteHead = res.writeHead.bind(res);
    res.writeHead = (status, headers) => rawWriteHead(status, {
      'Cache-Control': 'no-store, no-cache, must-revalidate',
      Pragma: 'no-cache',
      ...(headers || {}),
    });

    const url = new URL(req.url, 'http://127.0.0.1:' + port);

    if (req.method === 'GET' && url.pathname === '/') {
      res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
      res.end(page('Mercenta Automation — ClickUp connection', [
        '<div class="note">This page is served from <code>127.0.0.1</code> only, so it is never reachable from the network. The token is sent to this local page and to ClickUp — nowhere else, and never into a web address.</div>',

        '<h2>Option 1 &mdash; personal API token &nbsp;<span class="ok">(recommended)</span></h2>',
        '<p>ClickUp\u2019s own guidance is to use a personal API token for scripts like ours: it needs no app registration and it never expires.</p>',
        '<ol>',
        '<li>In ClickUp open <a href="' + APPS_PAGE + '" target="_blank" rel="noopener">Settings &rarr; ClickUp API</a> and stay on the <strong>API tokens</strong> sub-tab.</li>',
        '<li>Click <strong>Create token</strong>, then click <strong>Copy</strong>.</li>',
        '<li>Paste it into the box below and press the button.</li>',
        '</ol>',
        '<form method="POST" action="/token">',
        '<label for="token">Personal API token</label>',
        '<input id="token" name="token" type="password" autocomplete="off" spellcheck="false" placeholder="pk_..." required>',
        '<button type="submit">Save and test the connection</button>',
        '</form>',
        '<p><small>The token is checked against ClickUp <strong>before</strong> it is saved, so a wrong token is never written to disk.</small></p>',

        '<hr>',
        '<h2>Option 2 &mdash; OAuth app</h2>',
        '<p>Use this only if you want the OAuth app instead. It must be registered in ClickUp first:</p>',
        '<ol>',
        '<li>Open <a href="' + APPS_PAGE + '" target="_blank" rel="noopener">Settings &rarr; ClickUp API</a> and switch to the <strong>ClickUp API Settings</strong> sub-tab.</li>',
        '<li>In <strong>OAuth apps</strong> click <strong>Create</strong>, and name it <code>' + APP_NAME + '</code>.</li>',
        '<li>Paste this <strong>Redirect URL</strong> exactly: <code>' + redirectUri + '</code></li>',
        '<li>Copy the app Client ID and Client Secret into the fields below.</li>',
        '</ol>',
        '<form method="POST" action="/save">',
        '<label for="id">Client ID</label><input id="id" name="client_id" autocomplete="off" required>',
        '<label for="secret">Client Secret</label><input id="secret" name="client_secret" type="password" autocomplete="off" required>',
        '<button type="submit">Save and continue to ClickUp</button>',
        '</form>',

        '<p><small>Either way the credential is written only to <code>' + TOKEN_FILE.replace(os.homedir(), '~') +
        '</code> &mdash; outside the project, at mode 600, never to Git, ClickUp, Drive, logs or this chat.</small></p>',
      ].join('')));
      return;
    }

    /* ---------- Option 1: a personal API token, verified BEFORE it is stored ---------- */
    if (req.method === 'POST' && url.pathname === '/token') {
      let raw = '';
      req.on('data', (c) => { raw += c; if (raw.length > 1e5) req.destroy(); });
      req.on('end', async () => {
        const token = (new URLSearchParams(raw).get('token') || '').trim();
        /* The value is never logged, never echoed back, and never placed in a URL. */
        if (!token || /\s/.test(token)) {
          res.writeHead(400, { 'Content-Type': 'text/html; charset=utf-8' });
          res.end(page('Token rejected', '<p class="bad">No usable token was received.</p><p><a href="/">Try again</a></p>'));
          return;
        }
        onLog('A personal token was submitted (value never logged). Checking it against ClickUp...');
        const check = await verifyToken(token, fetchImpl);
        if (!check.ok) {
          res.writeHead(400, { 'Content-Type': 'text/html; charset=utf-8' });
          res.end(page('Token rejected', '<p class="bad">ClickUp rejected this token (' + check.reason +
            (check.status ? ', HTTP ' + check.status : '') + '). <strong>Nothing was saved.</strong></p>' +
            '<p><a href="/">Try again</a></p>'));
          return;
        }
        if (!check.workspaceFound) {
          res.writeHead(400, { 'Content-Type': 'text/html; charset=utf-8' });
          res.end(page('Wrong workspace', '<p class="bad">The token works, but it cannot see the Mercenta workspace. ' +
            '<strong>Nothing was saved.</strong></p><p><a href="/">Try again</a></p>'));
          return;
        }
        try {
          storeToken(token, tokenFile, 'personal');
        } catch {
          res.writeHead(500, { 'Content-Type': 'text/html; charset=utf-8' });
          res.end(page('Storage failed', '<p class="bad">The token was accepted but could not be stored.</p>'));
          finish({ ok: false, reason: 'storage-failed' });
          return;
        }
        res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
        res.end(page('Connected', '<p class="ok">ClickUp is connected.</p>' +
          '<p>Verified against workspace <strong>' + (check.workspaceName || 'Mercenta') + '</strong> <em>before</em> saving.</p>' +
          '<p>You can close this window. The token is stored outside the project at mode 600, and was never shown, logged, or put in a web address.</p>'));
        finish({ ok: true, token, kind: 'personal' });
      });
      return;
    }

    if (req.method === 'POST' && url.pathname === '/save') {
      let raw = '';
      req.on('data', (c) => { raw += c; if (raw.length > 1e5) req.destroy(); });
      req.on('end', () => {
        const form = new URLSearchParams(raw);
        const clientId = (form.get('client_id') || '').trim();
        const clientSecret = (form.get('client_secret') || '').trim();
        if (!clientId || !clientSecret) {
          res.writeHead(400, { 'Content-Type': 'text/html; charset=utf-8' });
          res.end(page('Missing details', '<p class="bad">Both the Client ID and the Client Secret are required.</p><p><a href="/">Try again</a></p>'));
          return;
        }
        creds = { clientId, clientSecret };
        onLog('App credentials received (not logged, not printed).');
        res.writeHead(302, { Location: buildAuthorizeUrl(clientId, redirectUri, state) });
        res.end();
      });
      return;
    }

    if (req.method === 'GET' && url.pathname === '/callback') {
      const parsed = parseCallback(url.searchParams);
      if (!parsed.ok) {
        onLog('Callback rejected: ' + parsed.reason);
        res.writeHead(400, { 'Content-Type': 'text/html; charset=utf-8' });
        res.end(page('Authorisation failed', '<p class="bad">ClickUp did not return a usable code (' + parsed.reason + ').</p><p><a href="/">Start again</a></p>'));
        return;
      }
      if (!validateState(parsed.state, state)) {
        onLog('Callback rejected: state mismatch (possible CSRF).');
        res.writeHead(400, { 'Content-Type': 'text/html; charset=utf-8' });
        res.end(page('Authorisation failed', '<p class="bad">The security check (state) did not match, so this request was not started by this setup.</p><p><a href="/">Start again</a></p>'));
        return;
      }
      if (!creds.clientId || !creds.clientSecret) {
        res.writeHead(400, { 'Content-Type': 'text/html; charset=utf-8' });
        res.end(page('Authorisation failed', '<p class="bad">No app credentials are loaded in this session.</p><p><a href="/">Start again</a></p>'));
        return;
      }
      const result = await exchangeCode({ clientId: creds.clientId, clientSecret: creds.clientSecret, code: parsed.code, fetchImpl });
      if (!result.ok) {
        onLog('Token exchange failed: ' + result.reason);
        res.writeHead(502, { 'Content-Type': 'text/html; charset=utf-8' });
        res.end(page('Authorisation failed', '<p class="bad">ClickUp rejected the code exchange (' + result.reason + ').</p><p><a href="/">Start again</a></p>'));
        finish({ ok: false, reason: result.reason });
        return;
      }
      try {
        storeToken(result.token, tokenFile);
      } catch {
        res.writeHead(500, { 'Content-Type': 'text/html; charset=utf-8' });
        res.end(page('Storage failed', '<p class="bad">The token was received but could not be stored.</p>'));
        finish({ ok: false, reason: 'storage-failed' });
        return;
      }
      res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
      res.end(page('Authorised', '<p class="ok">ClickUp is authorised.</p><p>You can close this window. The connection is stored outside the project and is verified next.</p>'));
      finish({ ok: true, token: result.token });
      return;
    }

    res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
    res.end('Not found');
  });

  const timer = setTimeout(() => {
    onLog('Setup timed out after 10 minutes with no authorisation.');
    finish({ ok: false, reason: 'timeout' });
  }, SETUP_TIMEOUT_MS);

  return {
    redirectUri,
    listen: () => new Promise((resolve, reject) => {
      server.once('error', reject);
      server.listen(port, '127.0.0.1', () => resolve(server.address()));
    }),
    done,
    close: () => { try { server.close(); } catch { /* already closed */ } },
  };
}

/* ================= the command line ================= */

function openBrowser(url) {
  try {
    const cmd = process.platform === 'darwin' ? 'open' : process.platform === 'win32' ? 'cmd' : 'xdg-open';
    const args = process.platform === 'win32' ? ['/c', 'start', '', url] : [url];
    execFile(cmd, args, () => { /* opening is a convenience; failure is not fatal */ });
    return true;
  } catch {
    return false;
  }
}

export async function status() {
  const token = readStoredToken();
  console.log('credential file :', TOKEN_FILE);
  console.log('file mode       :', fileMode() || '(absent)');
  console.log('dir mode        :', dirMode() || '(absent)');
  console.log('configured      :', token
    ? 'YES — a ' + (readStoredTokenKind() || 'token') + ' credential is stored'
    : 'NO');
  if (!token) return 1;
  const v = await verifyToken(token);
  console.log('live check      :', v.ok
    ? (v.workspaceFound ? 'OK — workspace "' + v.workspaceName + '" is reachable' : 'OK, but the Mercenta workspace was not returned')
    : 'FAILED (' + v.reason + (v.status ? ', HTTP ' + v.status : '') + ')');
  return v.ok && v.workspaceFound ? 0 : 1;
}

export async function runSetup({ force = false } = {}) {
  if (hasStoredToken() && !force) {
    console.log('A credential is already stored, so nothing was changed.');
    console.log('Re-run with --force to replace it. Use --status to check it.');
    return 0;
  }
  const state = generateState();
  const port = Number(process.env.CLICKUP_AUTH_PORT || DEFAULT_PORT);
  const srv = startSetupServer({ port, state, onLog: (m) => console.log('  ' + m) });
  try {
    const addr = await srv.listen();
    const setupUrl = 'http://127.0.0.1:' + addr.port + '/';
    console.log('');
    console.log('MERCENTA AUTOMATION — CLICKUP CONNECTION');
    console.log('  local server : http://127.0.0.1:' + addr.port + '   (localhost only, never the network)');
    console.log('  setup page   : ' + setupUrl);
    console.log('  Option 1     : paste a personal API token  (recommended)');
    console.log('  Option 2     : OAuth app — redirect URL ' + srv.redirectUri);
    console.log('');
    console.log('Opening the setup page in your browser...');
    console.log('Waiting for the token (10 minute limit)...');
    openBrowser(setupUrl);
    const result = await srv.done;
    if (!result.ok) {
      console.log('NOT AUTHORISED — ' + result.reason);
      return 1;
    }
    console.log('Token stored outside the project. Verifying against the live ClickUp API...');
    const v = await verifyToken(result.token);
    if (!v.ok) {
      console.log('VERIFICATION FAILED — ' + v.reason + (v.status ? ' (HTTP ' + v.status + ')' : ''));
      return 1;
    }
    console.log('VERIFIED — workspace "' + (v.workspaceName || 'unknown') + '" is reachable.');
    return 0;
  } catch (e) {
    console.log('SETUP FAILED — ' + (e && e.message ? e.message : e));
    return 1;
  } finally {
    srv.close();
  }
}

async function main() {
  const args = process.argv.slice(2);
  if (args.includes('--self-test')) {
    await import('./auth.test.mjs');
    return;
  }
  if (args.includes('--status')) {
    process.exit(await status());
  }
  process.exit(await runSetup({ force: args.includes('--force') }));
}

/* Run ONLY when this file is the entry point. Without this guard, importing the
   helpers from the test file would start a server. */
const isEntry = process.argv[1] &&
  path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isEntry) main();





