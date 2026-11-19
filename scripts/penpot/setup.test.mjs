#!/usr/bin/env node
/**
 * SECTION: PENPOT CREDENTIAL SETUP — OFFLINE TESTS.
 *
 * No network. No real credential. Every temp file lives under a throwaway directory, so the
 * REAL credential file and the REAL Cline settings are never touched by a test run.
 *
 * USAGE:  node scripts/penpot/setup.test.mjs
 */
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {
  redact, describeCredential, buildMcpUrl, isUsableKey, mergePenpotUrl, penpotUrlIsKeyed,
  applyToAllSettings, storeCredential, readStoredKey, readStoredAccessToken, fileMode, dirMode,
  ensureSecureDir, classifyProbe, verifyKey, listTools, startSetupServer, PENPOT_ENDPOINT,
} from './setup.mjs';

let pass = 0;
let fail = 0;
function test(name, ok, detail) {
  if (ok) { pass++; console.log('PASS  ' + name); }
  else { fail++; console.log('FAIL  ' + name + (detail !== undefined ? '  -> ' + detail : '')); }
}

const tmpRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'mercenta-penpot-test-'));
const tmpDir = path.join(tmpRoot, 'cfg');
const credFile = path.join(tmpDir, 'penpot.env');
const FAKE_KEY = 'FAKE-KEY-FOR-TESTS-ONLY';

/** A fake fetch that records the URL and returns a chosen body. */
function fakeFetch(status, body) {
  const calls = [];
  const fn = async (url, opts) => {
    calls.push({ url, opts });
    return { ok: status >= 200 && status < 300, status, text: async () => body };
  };
  fn.calls = calls;
  return fn;
}

/**
 * A fake fetch that answers `tools/list` and `tools/call` DIFFERENTLY, because the page calls
 * both. Feeding the same body to both would make the reachability check fail and mask the very
 * behaviour under test.
 */
function smartFetch(toolsBody, callBody) {
  const calls = [];
  const fn = async (url, opts) => {
    calls.push({ url, opts });
    const isList = String((opts && opts.body) || '').indexOf('tools/list') !== -1;
    return { ok: true, status: 200, text: async () => (isList ? toolsBody : callBody) };
  };
  fn.calls = calls;
  return fn;
}

const TOOLS_BODY = '{"result":{"tools":[{"name":"penpot"},{"name":"execute_code"},{"name":"export_shape"}]}}';

/* ── 1. redaction — the guarantee that the key cannot be logged ─────────── */
console.log('\n§ 1. Redaction\n');
const keyed = buildMcpUrl(PENPOT_ENDPOINT, FAKE_KEY);
test('buildMcpUrl puts the key in the documented userToken parameter', keyed.indexOf('userToken=' + FAKE_KEY) !== -1);
test('redact REPLACES the key with ***', redact(keyed).indexOf(FAKE_KEY) === -1);
test('redact keeps the endpoint readable', redact(keyed).indexOf(PENPOT_ENDPOINT) === 0);
test('redact shows the placeholder', redact(keyed).indexOf('userToken=***') !== -1);
test('redact is safe on a url with no key', redact(PENPOT_ENDPOINT) === PENPOT_ENDPOINT);
test('redact is safe on undefined', redact(undefined) === '');
test('describeCredential reveals NOTHING about the value', describeCredential(FAKE_KEY) === 'set');
test('describeCredential reports absence', describeCredential(null) === 'not set');

/* ── 2. key usability ──────────────────────────────────────────────────── */
console.log('\n§ 2. Key validation\n');
test('an empty key is not usable', isUsableKey('') === false);
test('a whitespace-only key is not usable', isUsableKey('   ') === false);
test('a key containing a space is not usable', isUsableKey('a b') === false);
test('a key containing a newline is not usable', isUsableKey('a\nb') === false);
test('a normal key is usable', isUsableKey(FAKE_KEY) === true);
test('a key is trimmed before use', isUsableKey('  ' + FAKE_KEY + '  ') === true);

/* ── 3. Penpot reply classification (the read-only gate) ───────────────── */
console.log('\n§ 3. Probe classification\n');
test('the unauthenticated reply means REJECTED', classifyProbe('Tool execution failed: Error: No userToken found in session context. Multi-user mode requires authentication.').accepted === false);
test('the classification reason is explicit', classifyProbe('No userToken found').reason === 'key-rejected');
test('any OTHER reply means ACCEPTED', classifyProbe('Tool execution failed: Error: No Penpot session connected').accepted === true);
test('an empty reply is treated as accepted (Penpot answered)', classifyProbe('').accepted === true);

/* ── 4. verifyKey / listTools with an injected fetch ───────────────────── */
console.log('\n§ 4. Verification (offline)\n');
const noKey = await verifyKey('', fakeFetch(200, ''));
test('a missing key is refused before any request', noKey.ok === false && noKey.reason === 'missing-key');

const rejectedFetch = fakeFetch(200, 'No userToken found in session context');
const rejected = await verifyKey(FAKE_KEY, rejectedFetch);
test('a key Penpot does not recognise is REJECTED', rejected.ok === false && rejected.reason === 'key-rejected');
test('the key is sent in the URL to Penpot (never a header guess)', rejectedFetch.calls[0].url.indexOf('userToken=' + FAKE_KEY) !== -1);

const accepted = await verifyKey(FAKE_KEY, fakeFetch(200, 'No Penpot session connected'));
test('a key Penpot accepts is ACCEPTED', accepted.ok === true);

const netFail = await verifyKey(FAKE_KEY, async () => { throw new Error('boom'); });
test('a network failure is reported, not swallowed', netFail.ok === false && netFail.reason === 'network-error');

const httpFail = await verifyKey(FAKE_KEY, fakeFetch(500, ''));
test('an HTTP error is reported', httpFail.ok === false && httpFail.reason === 'http-error');

const tools = await listTools(fakeFetch(200, '{"result":{"tools":[{"name":"penpot"},{"name":"execute_code"},{"name":"export_shape"}]}}'));
test('listTools finds the real tools and ignores the server name', tools.ok === true && tools.tools.join(',') === 'execute_code,export_shape');

/* ── 5. credential storage ─────────────────────────────────────────────── */
console.log('\n§ 5. Credential storage\n');
test('nothing is stored before the first write', readStoredKey(credFile) === null);
ensureSecureDir(tmpDir);
test('the credential DIRECTORY is 700', dirMode(tmpDir) === '700', dirMode(tmpDir));
storeCredential(FAKE_KEY, '', credFile);
test('the credential FILE is 600', fileMode(credFile) === '600', fileMode(credFile));
test('the stored key round-trips', readStoredKey(credFile) === FAKE_KEY);
test('no access token is stored when none is given', readStoredAccessToken(credFile) === null);
test('the file lives OUTSIDE the project directory', credFile.indexOf(path.resolve('.')) !== 0);
let refused = false;
try { storeCredential('', '', credFile); } catch { refused = true; }
test('an unusable key is refused, never written', refused === true);

storeCredential(FAKE_KEY, 'FAKE-ACCESS-TOKEN', credFile);
test('an optional access token is stored when given', readStoredAccessToken(credFile) === 'FAKE-ACCESS-TOKEN');

/* ── 6. settings merge — ClickUp must survive untouched ────────────────── */
console.log('\n§ 6. Settings merge\n');
const baseDoc = {
  mcpServers: {
    clickup: { command: 'npx', args: ['-y', 'mcp-remote', 'https://mcp.clickup.com/mcp'], disabled: false, autoApprove: [] },
    penpot: { type: 'streamableHttp', url: PENPOT_ENDPOINT, disabled: false, autoApprove: [] },
  },
};
const merged = mergePenpotUrl(baseDoc, keyed);
test('the penpot url now carries the key', penpotUrlIsKeyed(merged) === true);
test('clickup is UNCHANGED by the merge', JSON.stringify(merged.mcpServers.clickup) === JSON.stringify(baseDoc.mcpServers.clickup));
test('the original document is not mutated', penpotUrlIsKeyed(baseDoc) === false);
/* Written crash-safely: if a mutation wipes the other servers, this must REPORT a failure
   rather than throw, or a single mutation would mask every later assertion. */
test('an unrelated server added later is preserved', (() => {
  const out = mergePenpotUrl({ mcpServers: { clickup: { a: 1 }, somethingelse: { b: 2 } } }, keyed);
  return !!(out.mcpServers.somethingelse && out.mcpServers.somethingelse.b === 2);
})());

/* ── 7. applyToAllSettings — backup, merge, preserve, tighten ──────────── */
console.log('\n§ 7. Applying to BOTH settings files\n');
const s1 = path.join(tmpRoot, 'settings-a.json');
const s2 = path.join(tmpRoot, 'settings-b.json');
const seed = JSON.stringify({
  mcpServers: {
    clickup: { command: 'npx', args: ['-y', 'mcp-remote', 'https://mcp.clickup.com/mcp'], disabled: false, autoApprove: [] },
    penpot: { type: 'streamableHttp', url: PENPOT_ENDPOINT, disabled: false, autoApprove: [] },
  },
}, null, 2) + '\n';
fs.writeFileSync(s1, seed); fs.writeFileSync(s2, seed);
const report = applyToAllSettings(keyed, [s1, s2], tmpRoot);
test('both files are reported', report.length === 2);
test('every file was backed up first', report.every((r) => r.backup && fs.existsSync(r.backup)));
test('each backup still holds the ORIGINAL text', fs.readFileSync(report[0].backup, 'utf8') === seed);
test('other servers are reported as PRESERVED', report.every((r) => r.othersPreserved === true));
test('both files now list clickup AND penpot', report.every((r) => r.serversAfter.join(',') === 'clickup,penpot'));
test('the files were tightened to mode 600', report.every((r) => r.mode === '600'), report.map((r) => r.mode).join(','));
test('the reported url is REDACTED', report.every((r) => r.url.indexOf(FAKE_KEY) === -1));
test('the written file really contains the key', fs.readFileSync(s1, 'utf8').indexOf(FAKE_KEY) !== -1);
test('both files ended up IDENTICAL', fs.readFileSync(s1, 'utf8') === fs.readFileSync(s2, 'utf8'));
test('a missing settings file is reported, not crashed on', applyToAllSettings(keyed, [path.join(tmpRoot, 'nope.json')], tmpRoot)[0].existed === false);

/* ── 8. the local credential page ──────────────────────────────────────── */
console.log('\n§ 8. The credential page\n');
let n = 0;
async function startServer(fetchImpl) {
  n += 1;
  const file = path.join(tmpDir, 'route-' + n + '.env');
  const a1 = path.join(tmpRoot, 'srv-a-' + n + '.json');
  const a2 = path.join(tmpRoot, 'srv-b-' + n + '.json');
  fs.writeFileSync(a1, seed); fs.writeFileSync(a2, seed);
  const srv = startSetupServer({ port: 0, onLog: () => {}, fetchImpl, credFile: file, settingsPaths: [a1, a2], backupDir: tmpRoot });
  const addr = await srv.listen();
  return { srv, file, a1, a2, base: 'http://127.0.0.1:' + addr.port };
}
const post = (base, body) => fetch(base + '/save', { method: 'POST', body: new URLSearchParams(body) });

const A = await startServer(smartFetch(TOOLS_BODY, 'irrelevant'));
const homeRes = await fetch(A.base + '/');
const homeHtml = await homeRes.text();
test('the page has a HIDDEN field for the MCP key', homeHtml.indexOf('name="mcp_key" type="password"') !== -1);
test('the page has a HIDDEN field for the optional access token', homeHtml.indexOf('name="access_token" type="password"') !== -1);
test('the page posts to /save', homeHtml.indexOf('action="/save"') !== -1);
test('the page is served with Cache-Control: no-store', String(homeRes.headers.get('cache-control') || '').indexOf('no-store') !== -1);
test('the page names the hosted Penpot endpoint', homeHtml.indexOf('design.penpot.app') !== -1);
const empty = await post(A.base, { mcp_key: '' });
test('an empty key is refused (400)', empty.status === 400);
test('nothing was written for an empty key', readStoredKey(A.file) === null);
A.srv.close();

const B = await startServer(smartFetch(TOOLS_BODY, 'No userToken found in session context'));
const bad = await post(B.base, { mcp_key: 'BAD-KEY' });
const badHtml = await bad.text();
test('a key Penpot REJECTS is refused (400)', bad.status === 400);
test('the refusal says nothing was saved', badHtml.indexOf('Nothing was saved') !== -1);
test('a REJECTED key is never written to disk', readStoredKey(B.file) === null);
test('a REJECTED key is never written into the settings', fs.readFileSync(B.a1, 'utf8').indexOf('BAD-KEY') === -1);
B.srv.close();

const C = await startServer(smartFetch(TOOLS_BODY, 'No Penpot session connected'));
const okRes = await post(C.base, { mcp_key: FAKE_KEY, access_token: 'FAKE-ACCESS-TOKEN' });
const okHtml = await okRes.text();
test('an accepted key succeeds (200)', okRes.status === 200 && okHtml.indexOf('Connected') !== -1);
test('the key is NEVER echoed back into the page', okHtml.indexOf(FAKE_KEY) === -1);
test('the key is NEVER placed in a URL', okRes.url.indexOf(FAKE_KEY) === -1);
test('the access token is NEVER echoed back either', okHtml.indexOf('FAKE-ACCESS-TOKEN') === -1);
test('the page reports other servers as preserved', okHtml.indexOf('preserved') !== -1);
const doneC = await C.srv.done;
test('the server reports success', doneC.ok === true);
test('the key was stored', readStoredKey(C.file) === FAKE_KEY);
test('BOTH settings files were configured', fs.readFileSync(C.a1, 'utf8').indexOf('userToken=' + FAKE_KEY) !== -1 && fs.readFileSync(C.a2, 'utf8').indexOf('userToken=' + FAKE_KEY) !== -1);
test('clickup survived in both files', JSON.parse(fs.readFileSync(C.a1, 'utf8')).mcpServers.clickup.command === 'npx' && JSON.parse(fs.readFileSync(C.a2, 'utf8')).mcpServers.clickup.command === 'npx');
let closed = false;
try { await fetch(C.base + '/'); } catch { closed = true; }
test('the server shuts itself down after success', closed === true);

/* ── verdict ───────────────────────────────────────────────────────────── */
try { fs.rmSync(tmpRoot, { recursive: true, force: true }); } catch { /* best effort */ }
console.log('');
console.log(fail === 0
  ? 'PENPOT_SETUP_SELF_TEST_PASS (' + pass + ' checks, 0 failed)'
  : 'PENPOT_SETUP_SELF_TEST_FAIL (' + fail + ' of ' + (pass + fail) + ' failed)');
process.exit(fail === 0 ? 0 : 1);


