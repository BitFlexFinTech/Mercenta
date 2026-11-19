#!/usr/bin/env node
/**
 * SECTION: PENPOT MCP — SECURE LOCAL CREDENTIAL ENTRY.
 *
 * WHY THIS EXISTS. Cline cannot complete Penpot's sign-in automatically. Verified against the
 * LIVE endpoint (2026-11-19): Penpot never returns `401` + `WWW-Authenticate`, so Cline's own
 * MCP OAuth — and `mcp-remote`'s, which reacts to the same challenge — can never fire. Penpot's
 * documented answer for "clients that cannot sign in" is the key in the URL:
 *
 *     https://design.penpot.app/mcp/stream?userToken=YOUR_MCP_KEY
 *
 * WHAT THIS DOES. Serves a LOCAL page (127.0.0.1 only) with a HIDDEN input field, then:
 *   1. CHECKS the key against Penpot BEFORE storing anything — a key Penpot rejects is never
 *      written to disk and never written into Cline's configuration.
 *   2. Stores it OUTSIDE the repository, at mode 600 in a 700 directory.
 *   3. Updates BOTH of Cline's MCP settings files consistently, MERGING — every other server
 *      (ClickUp in particular) is left byte-identical.
 *   4. Backs the settings files up before touching them, and tightens them to mode 600.
 *
 * SECURITY RULES BUILT IN:
 *   - The server binds to 127.0.0.1 ONLY. It is never reachable from the network.
 *   - The key arrives in a POST BODY. It is NEVER put in a URL the browser sees, never logged,
 *     never echoed back, and never printed.
 *   - `redact()` is the ONLY way a configuration URL may be shown anywhere — it replaces the
 *     key with `***`. There is no code path that prints the raw value.
 *   - The page is served with `Cache-Control: no-store` so a stale form can never be shown.
 *
 * USAGE
 *   node scripts/penpot/setup.mjs              start the local credential page
 *   node scripts/penpot/setup.mjs --status      what is configured right now?
 *   node scripts/penpot/setup.mjs --self-test   offline tests, no network, no secrets
 */
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import http from 'node:http';
import { execFile } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const CONFIG_DIR = path.join(os.homedir(), '.config', 'mercenta');
const CRED_FILE = path.join(CONFIG_DIR, 'penpot.env');

/** The HOSTED Penpot MCP endpoint. No locally self-hosted server is involved. */
export const PENPOT_ENDPOINT = 'https://design.penpot.app/mcp/stream';
const PARAM = 'userToken';

/** BOTH Cline settings files must stay consistent — they are kept in step by Cline itself. */
export const CLINE_SETTINGS = [
  path.join(os.homedir(), '.cline', 'data', 'settings', 'cline_mcp_settings.json'),
  path.join(os.homedir(), 'Library', 'Application Support', 'Code', 'User', 'globalStorage', 'saoudrizwan.claude-dev', 'settings', 'cline_mcp_settings.json'),
];

const DEFAULT_PORT = 8788;
const TIMEOUT_MS = 10 * 60 * 1000;

/* ================= redaction — the ONLY way a credential-bearing URL is ever shown ========= */

/**
 * Replace the key in a Penpot URL with `***`. EVERY log line, page and error message that
 * mentions a configured URL must go through this. Never log the raw URL.
 */
export function redact(url) {
  return String(url || '').replace(new RegExp('(' + PARAM + '=)[^&\\s]*', 'gi'), '$1***');
}

/** Describe a stored credential WITHOUT revealing anything about its value. */
export function describeCredential(value) {
  return value ? 'set' : 'not set';
}

/** Build the key-bearing MCP URL. The RESULT IS A SECRET and must never be logged raw. */
export function buildMcpUrl(endpoint, token) {
  return endpoint + '?' + PARAM + '=' + encodeURIComponent(String(token));
}

/** A key is usable only if it is non-empty and contains no whitespace. */
export function isUsableKey(token) {
  const t = String(token || '').trim();
  return t.length > 0 && !/\s/.test(t);
}

/* ================= credential storage (outside the repository) ================= */

export function ensureSecureDir(dir = CONFIG_DIR) {
  fs.mkdirSync(dir, { recursive: true, mode: 0o700 });
  try { fs.chmodSync(dir, 0o700); } catch { /* best effort on exotic filesystems */ }
  return dir;
}

/**
 * Store the credentials OUTSIDE the repository at mode 600. Only the key is stored — the
 * key-bearing URL is DERIVED, never duplicated here, so there is one source of truth.
 */
export function storeCredential(key, accessToken = '', file = CRED_FILE) {
  if (!isUsableKey(key)) throw new Error('refusing to store an unusable key');
  ensureSecureDir(path.dirname(file));
  let body =
    '# Mercenta Penpot credential. Written by scripts/penpot/setup.mjs.\n' +
    '# OUTSIDE the repository. Never commit, print, log or copy this value.\n' +
    'PENPOT_MCP_KEY=' + String(key).trim() + '\n';
  if (accessToken && String(accessToken).trim()) {
    body += 'PENPOT_ACCESS_TOKEN=' + String(accessToken).trim() + '\n';
  }
  body += 'PENPOT_OBTAINED=' + new Date().toISOString() + '\n';
  fs.writeFileSync(file, body, { mode: 0o600 });
  fs.chmodSync(file, 0o600);
  return file;
}

function readEnvValue(name, file = CRED_FILE) {
  if (!fs.existsSync(file)) return null;
  const m = fs.readFileSync(file, 'utf8').match(new RegExp('^\\s*' + name + '\\s*=\\s*(\\S+)\\s*$', 'm'));
  return m ? m[1].trim() : null;
}

export function readStoredKey(file = CRED_FILE) { return readEnvValue('PENPOT_MCP_KEY', file); }
export function readStoredAccessToken(file = CRED_FILE) { return readEnvValue('PENPOT_ACCESS_TOKEN', file); }

function oct(mode) { return (mode & 0o777).toString(8).padStart(3, '0'); }
export function fileMode(file) { return fs.existsSync(file) ? oct(fs.statSync(file).mode) : null; }
export function dirMode(dir = CONFIG_DIR) { return fs.existsSync(dir) ? oct(fs.statSync(dir).mode) : null; }

/* ================= Cline MCP settings: MERGE, never overwrite ================= */

/**
 * Return a NEW settings document with ONLY `mcpServers.penpot` set. Every other server object
 * is carried across untouched, so ClickUp (and anything else) cannot be altered by this call.
 */
export function mergePenpotUrl(doc, url) {
  const next = JSON.parse(JSON.stringify(doc || {}));
  next.mcpServers = next.mcpServers || {};
  next.mcpServers.penpot = {
    type: 'streamableHttp',
    url,
    disabled: false,
    autoApprove: [],
  };
  return next;
}

/** Does this document's penpot entry already carry a key? (used for status, never logs it) */
export function penpotUrlIsKeyed(doc) {
  const u = doc && doc.mcpServers && doc.mcpServers.penpot && doc.mcpServers.penpot.url;
  return typeof u === 'string' && u.indexOf(PARAM + '=') !== -1;
}

/**
 * Apply the key-bearing URL to EVERY settings file, backing each up first.
 * Returns a report of what changed — with every URL REDACTED.
 */
export function applyToAllSettings(url, paths = CLINE_SETTINGS, backupDir = '/tmp') {
  const report = [];
  for (const file of paths) {
    const entry = { file, existed: fs.existsSync(file), backup: null, serversBefore: [], serversAfter: [], othersPreserved: null, mode: null };
    if (!entry.existed) { report.push(entry); continue; }

    const before = JSON.parse(fs.readFileSync(file, 'utf8'));
    entry.serversBefore = Object.keys(before.mcpServers || {}).sort();

    entry.backup = path.join(backupDir, 'cline_mcp_settings.' + path.basename(path.dirname(file)) + '.backup.json');
    fs.writeFileSync(entry.backup, fs.readFileSync(file), { mode: 0o600 });

    const after = mergePenpotUrl(before, url);
    entry.serversAfter = Object.keys(after.mcpServers).sort();
    const othersAfter = JSON.stringify(
      Object.fromEntries(Object.entries(after.mcpServers).filter(([k]) => k !== 'penpot'))
    );
    entry.othersPreserved = JSON.stringify(Object.fromEntries(
      Object.entries(before.mcpServers || {}).filter(([k]) => k !== 'penpot')
    )) === othersAfter;

    fs.writeFileSync(file, JSON.stringify(after, null, 2) + '\n');
    fs.chmodSync(file, 0o600);            /* was world-readable; a file holding a key must not be */
    entry.mode = fileMode(file);
    entry.url = redact(after.mcpServers.penpot.url);
    report.push(entry);
  }
  return report;
}

/* ================= the READ-ONLY verification (touches no design) ================= */

/**
 * `execute_code` is the tool that touches designs, and Penpot gates it on the key. We call it
 * with an INERT snippet that returns a constant, purely to read back whether the key was taken:
 *
 *   · "No userToken found in session context" -> key NOT accepted. Nothing is stored.
 *   · any other outcome                        -> key WAS accepted (Penpot then moves on to its
 *                                                 next precondition: a connected Penpot tab).
 *
 * This call reads nothing from a design and changes nothing: it returns `1`.
 */
export const PROBE_CODE = 'return 1;';

/** Classify Penpot's reply WITHOUT ever looking at, or keeping, the credential. */
export function classifyProbe(text) {
  if (/No userToken found/i.test(String(text || ''))) return { accepted: false, reason: 'key-rejected' };
  return { accepted: true, reason: 'key-accepted' };
}

/**
 * Prove the key works before it is written anywhere. The URL passed to fetch carries the key,
 * so it is NEVER logged; only the classification is returned.
 */
export async function verifyKey(key, fetchImpl = fetch, endpoint = PENPOT_ENDPOINT) {
  if (!isUsableKey(key)) return { ok: false, reason: 'missing-key' };
  const payload = JSON.stringify({
    jsonrpc: '2.0',
    id: 1,
    method: 'tools/call',
    params: { name: 'execute_code', arguments: { code: PROBE_CODE } },
  });
  let res;
  try {
    res = await fetchImpl(buildMcpUrl(endpoint, key), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json, text/event-stream' },
      body: payload,
    });
  } catch (e) {
    return { ok: false, reason: 'network-error', error: String(e && e.message ? e.message : e) };
  }
  if (!res.ok) return { ok: false, reason: 'http-error', status: res.status };
  let text = '';
  try { text = await res.text(); } catch { text = ''; }
  const verdict = classifyProbe(text);
  return verdict.accepted ? { ok: true, reason: verdict.reason } : { ok: false, reason: verdict.reason };
}

/** A harmless reachability check: the tool list needs no credential and changes nothing. */
export async function listTools(fetchImpl = fetch, endpoint = PENPOT_ENDPOINT) {
  let res;
  try {
    res = await fetchImpl(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json, text/event-stream' },
      body: JSON.stringify({ jsonrpc: '2.0', id: 2, method: 'tools/list', params: {} }),
    });
  } catch (e) {
    return { ok: false, reason: 'network-error', error: String(e && e.message ? e.message : e) };
  }
  if (!res.ok) return { ok: false, reason: 'http-error', status: res.status };
  let text = '';
  try { text = await res.text(); } catch { text = ''; }
  const names = [...text.matchAll(/"name"\s*:\s*"([^"]+)"/g)].map((m) => m[1]);
  const tools = names.filter((n) => n !== 'penpot');
  return { ok: tools.length > 0, tools };
}

/* ================= the localhost-only credential page ================= */

function page(title, body) {
  return '<!doctype html><html lang="en"><head><meta charset="utf-8"><title>' + title + '</title>' +
    '<meta name="viewport" content="width=device-width,initial-scale=1">' +
    '<style>body{font:15px/1.6 system-ui,-apple-system,sans-serif;max-width:660px;margin:3rem auto;padding:0 1.2rem;color:#111}' +
    'h1{font-size:1.35rem}h2{font-size:1.05rem;margin:1.6rem 0 .4rem}' +
    'code{background:#f3f3f3;padding:.15rem .35rem;border-radius:4px;word-break:break-all;font-family:ui-monospace,monospace}' +
    'input{width:100%;padding:.6rem;font-size:14px;margin:.25rem 0 1rem;box-sizing:border-box;font-family:ui-monospace,monospace;border:1px solid #ccc;border-radius:6px}' +
    'button{background:#111;color:#fff;border:0;padding:.7rem 1.2rem;font-size:15px;border-radius:6px;cursor:pointer}' +
    'label{font-weight:600;font-size:13px;text-transform:uppercase;letter-spacing:.03em}' +
    'hr{border:0;border-top:1px solid #e5e5e5;margin:2rem 0}.ok{color:#15803d;font-weight:600}.bad{color:#b91c1c;font-weight:600}' +
    'table{border-collapse:collapse;font-size:14px}td,th{border:1px solid #e5e5e5;padding:.35rem .6rem;text-align:left}' +
    '.note{background:#f7f7f7;border-left:3px solid #999;padding:.7rem 1rem;margin:1rem 0;font-size:14px}</style></head>' +
    '<body><h1>' + title + '</h1>' + body + '</body></html>';
}

/**
 * Serve the credential page. BINDS TO 127.0.0.1 ONLY. Resolves { ok, ... } and always closes.
 * The key arrives in a POST BODY and is never placed in a URL, logged, or echoed back.
 */
export function startSetupServer({ port, onLog = () => {}, fetchImpl = fetch, credFile = CRED_FILE, settingsPaths = CLINE_SETTINGS, backupDir = '/tmp' }) {
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
    /* A credential page must never be cached — a stale form is confusing and unsafe. */
    const rawWriteHead = res.writeHead.bind(res);
    res.writeHead = (status, headers) => rawWriteHead(status, {
      'Cache-Control': 'no-store, no-cache, must-revalidate',
      Pragma: 'no-cache',
      ...(headers || {}),
    });

    const url = new URL(req.url, 'http://127.0.0.1:' + port);

    if (req.method === 'GET' && url.pathname === '/') {
      const already = fs.existsSync(credFile);
      res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
      res.end(page('Mercenta Automation — Penpot credentials', [
        '<div class="note">This page is served from <code>127.0.0.1</code> only, so it is never reachable from the network. The key is sent to this local page and to Penpot — nowhere else.</div>',
        '<p>Endpoint: <code>' + PENPOT_ENDPOINT + '</code></p>',
        already ? '<p>A credential is <strong>already stored</strong>. Submitting again replaces it, and the new key is checked before anything is written.</p>' : '',
        '<p>Paste the credentials from your private notes. Both fields are hidden, and nothing is shown back.</p>',
        '<form method="POST" action="/save" autocomplete="off">',
        '<label for="k">Penpot MCP key <span class="ok">(required for MCP)</span></label>',
        '<input id="k" name="mcp_key" type="password" autocomplete="off" spellcheck="false" required>',
        '<label for="t">Penpot personal access token <span style="font-weight:400;text-transform:none">(optional &mdash; for the Penpot API, not needed for MCP)</span></label>',
        '<input id="t" name="access_token" type="password" autocomplete="off" spellcheck="false">',
        '<button type="submit">Save and test the connection</button>',
        '</form>',
        '<p><small>The key is checked against Penpot <strong>before</strong> it is saved, so a wrong key is never written to disk or into Cline\u2019s configuration. It is stored outside the project at mode 600, and never shown, logged or printed.</small></p>',
      ].join('')));
      return;
    }

    if (req.method === 'POST' && url.pathname === '/save') {
      let raw = '';
      req.on('data', (c) => { raw += c; if (raw.length > 1e5) req.destroy(); });
      req.on('end', async () => {
        const form = new URLSearchParams(raw);
        const key = (form.get('mcp_key') || '').trim();
        const accessToken = (form.get('access_token') || '').trim();
        /* The values are never logged, never echoed back, and never placed in a URL. */
        if (!isUsableKey(key)) {
          res.writeHead(400, { 'Content-Type': 'text/html; charset=utf-8' });
          res.end(page('Key rejected', '<p class="bad">No usable key was received.</p><p><a href="/">Try again</a></p>'));
          return;
        }
        onLog('A Penpot key was submitted (value never logged). Checking it against Penpot...');

        const reach = await listTools(fetchImpl);
        if (!reach.ok) {
          res.writeHead(502, { 'Content-Type': 'text/html; charset=utf-8' });
          res.end(page('Penpot unreachable', '<p class="bad">Could not reach the Penpot MCP server (' + reach.reason +
            '). <strong>Nothing was saved.</strong></p><p><a href="/">Try again</a></p>'));
          return;
        }
        const check = await verifyKey(key, fetchImpl);
        if (!check.ok) {
          res.writeHead(400, { 'Content-Type': 'text/html; charset=utf-8' });
          res.end(page('Key rejected', '<p class="bad">Penpot did not accept this key (' + check.reason +
            '). <strong>Nothing was saved.</strong></p><p>Penpot replied <em>No userToken found in session context</em>, so the key was not recognised.</p>' +
            '<p><a href="/">Try again</a></p>'));
          return;
        }

        let report;
        try {
          storeCredential(key, accessToken, credFile);
          report = applyToAllSettings(buildMcpUrl(PENPOT_ENDPOINT, key), settingsPaths, backupDir);
        } catch {
          res.writeHead(500, { 'Content-Type': 'text/html; charset=utf-8' });
          res.end(page('Storage failed', '<p class="bad">The key was accepted but could not be stored.</p>'));
          finish({ ok: false, reason: 'storage-failed' });
          return;
        }

        const rows = report.map((r) => '<tr><td><code>' + r.file.replace(os.homedir(), '~') + '</code></td><td>' +
          (r.existed ? r.serversBefore.join(', ') + ' &rarr; ' + r.serversAfter.join(', ') : '<em>not found</em>') + '</td>' +
          '<td>' + (r.othersPreserved === null ? '&mdash;' : (r.othersPreserved ? '<span class="ok">preserved</span>' : '<span class="bad">CHANGED</span>')) + '</td>' +
          '<td>' + (r.mode || '&mdash;') + '</td></tr>').join('');

        res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
        res.end(page('Connected', [
          '<p class="ok">Penpot is connected.</p>',
          '<p>The key was <strong>accepted by Penpot before anything was saved</strong>. Tools seen: <code>' + reach.tools.join(', ') + '</code>.</p>',
          '<h2>What was written</h2>',
          '<table><tr><th>File</th><th>Servers</th><th>Other servers</th><th>Mode</th></tr>' + rows + '</table>',
          '<p><small>Credential file: <code>' + credFile.replace(os.homedir(), '~') + '</code> at mode <strong>' +
          (fileMode(credFile) || '?') + '</strong> in a <strong>' + (dirMode(path.dirname(credFile)) || '?') +
          '</strong> directory. Configured URL (key hidden): <code>' + redact(buildMcpUrl(PENPOT_ENDPOINT, key)) + '</code></small></p>',
          '<p>You can close this window. <strong>Reload the VS Code window</strong> (&#8984;R) so Cline picks up the new configuration.</p>',
        ].join('')));
        finish({ ok: true, report, tools: reach.tools });
      });
      return;
    }
    res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
    res.end('Not found');
  });

  const timer = setTimeout(() => {
    onLog('Timed out after 10 minutes with no credential submitted.');
    finish({ ok: false, reason: 'timeout' });
  }, TIMEOUT_MS);

  return {
    listen: () => new Promise((resolve, reject) => {
      server.once('error', reject);
      server.listen(port, '127.0.0.1', () => resolve(server.address()));
    }),
    done,
    /* Clear the timeout too: a pending timer keeps a Node process alive even after the
       socket is closed, which would hang anything that awaits this server's completion. */
    close: () => {
      try { clearTimeout(timer); } catch { /* nothing to clear */ }
      try { server.close(); } catch { /* already closed */ }
    },
  };
}

/* ================= the command line ================= */

function openBrowser(url) {
  try {
    const cmd = process.platform === 'darwin' ? 'open' : process.platform === 'win32' ? 'cmd' : 'xdg-open';
    const args = process.platform === 'win32' ? ['/c', 'start', '', url] : [url];
    execFile(cmd, args, () => { /* convenience only; failure is not fatal */ });
    return true;
  } catch {
    return false;
  }
}

/** Report the current state WITHOUT revealing any credential. */
export async function status() {
  const key = readStoredKey();
  const access = readStoredAccessToken();
  console.log('credential file :', CRED_FILE);
  console.log('file mode       :', fileMode(CRED_FILE) || '(absent)');
  console.log('dir mode        :', dirMode(CONFIG_DIR) || '(absent)');
  console.log('mcp key         :', describeCredential(key));
  console.log('access token    :', describeCredential(access));
  for (const f of CLINE_SETTINGS) {
    if (!fs.existsSync(f)) { console.log('settings        :', f, '(absent)'); continue; }
    const doc = JSON.parse(fs.readFileSync(f, 'utf8'));
    console.log('settings        :', f.replace(os.homedir(), '~'),
      '| servers:', Object.keys(doc.mcpServers || {}).sort().join(','),
      '| penpot keyed:', penpotUrlIsKeyed(doc),
      '| mode:', fileMode(f));
  }
  if (!key) return 1;
  const reach = await listTools();
  console.log('penpot reachable:', reach.ok ? 'YES — tools: ' + reach.tools.join(', ') : 'NO (' + reach.reason + ')');
  const check = await verifyKey(key);
  console.log('key accepted    :', check.ok ? 'YES' : 'NO (' + check.reason + ')');
  return check.ok ? 0 : 1;
}

export async function runSetup({ port = Number(process.env.PENPOT_SETUP_PORT || DEFAULT_PORT) } = {}) {
  const srv = startSetupServer({ port, onLog: (m) => console.log('  ' + m) });
  try {
    const addr = await srv.listen();
    const setupUrl = 'http://127.0.0.1:' + addr.port + '/';
    console.log('');
    console.log('MERCENTA AUTOMATION — PENPOT CREDENTIALS');
    console.log('  local server : http://127.0.0.1:' + addr.port + '   (localhost only, never the network)');
    console.log('  endpoint     : ' + PENPOT_ENDPOINT);
    console.log('  stores to    : ' + CRED_FILE.replace(os.homedir(), '~') + '  (mode 600, outside the repo)');
    console.log('  configures   : both Cline MCP settings files, merging — other servers preserved');
    console.log('');
    console.log('Opening the credential page in your browser...');
    console.log('Waiting for the credentials (10 minute limit)...');
    openBrowser(setupUrl);
    const result = await srv.done;
    if (!result.ok) { console.log('NOT CONFIGURED — ' + result.reason); return 1; }
    console.log('');
    console.log('STORED AND VERIFIED — the key was accepted by Penpot before anything was written.');
    for (const r of result.report) {
      console.log('  ' + r.file.replace(os.homedir(), '~') +
        '  servers: ' + (r.serversBefore.join(',') || '-') + ' -> ' + r.serversAfter.join(',') +
        '  others preserved: ' + r.othersPreserved + '  mode: ' + r.mode);
      console.log('    url (key hidden): ' + r.url);
    }
    return 0;
  } catch (e) {
    console.log('SETUP FAILED — ' + (e && e.message ? e.message : e));
    return 1;
  } finally {
    srv.close();
  }
}

/**
 * READ-ONLY design-access probe. Runs `return 1;` inside the plugin context: it reads nothing
 * from a design, changes nothing, and returns a constant. It answers one question — is a Penpot
 * tab actually CONNECTED? The credential is read internally and never printed.
 */
export async function probeDesign() {
  const key = readStoredKey();
  if (!key) { console.log('no key stored — run the setup page first'); return 1; }
  let text = '';
  try {
    const res = await fetch(buildMcpUrl(PENPOT_ENDPOINT, key), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json, text/event-stream' },
      body: JSON.stringify({ jsonrpc: '2.0', id: 9, method: 'tools/call', params: { name: 'execute_code', arguments: { code: PROBE_CODE } } }),
    });
    text = await res.text();
  } catch (e) {
    console.log('design access : UNREACHABLE (' + (e && e.message ? e.message : e) + ')');
    return 1;
  }
  const m = text.match(/"text":"((?:[^"\\]|\\.)*)"/);
  const said = m ? JSON.parse('"' + m[1] + '"') : text.slice(0, 300);
  if (/No userToken found/i.test(text)) {
    console.log('design access : KEY NOT ACCEPTED — the stored key was refused');
    return 1;
  }
  if (said.trim() === '1') {
    console.log('design access : CONNECTED — a Penpot file is live and answering');
    return 0;
  }
  console.log('design access : KEY OK, but NO Penpot file is connected yet');
  console.log('penpot said   : ' + said.slice(0, 200));
  return 2;
}

async function main() {
  const args = process.argv.slice(2);
  if (args.includes('--self-test')) { await import('./setup.test.mjs'); return; }
  if (args.includes('--status')) { process.exit(await status()); }
  if (args.includes('--probe')) { process.exit(await probeDesign()); }
  process.exit(await runSetup());
}

/* Run ONLY when this file is the entry point, so importing the helpers starts nothing. */
const isEntry = process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isEntry) main();



