#!/usr/bin/env node
/**
 * SECTION: CLICKUP OAUTH — OFFLINE TESTS.
 *
 * No network. No real credential. The FAILURE paths are exercised deliberately.
 * Token-storage tests write to a TEMPORARY directory, so the real credential file at
 * ~/.config/mercenta/clickup.env is never touched by a test run.
 *
 * USAGE:  node scripts/clickup/auth.test.mjs
 */
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {
  generateState, validateState, buildAuthorizeUrl, parseCallback, redirectUriFor,
  storeToken, readStoredToken, readStoredTokenKind, hasStoredToken, fileMode, dirMode, ensureSecureDir,
  exchangeCode, verifyToken, authHeaderFor, startSetupServer,
} from './auth.mjs';

let pass = 0;
let fail = 0;
function test(name, ok, detail) {
  if (ok) { pass++; console.log('PASS  ' + name); }
  else { fail++; console.log('FAIL  ' + name + (detail !== undefined ? '  -> ' + detail : '')); }
}

const tmpRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'mercenta-auth-test-'));
const tmpDir = path.join(tmpRoot, 'cfg');
const tmpFile = path.join(tmpDir, 'clickup.env');

const TOKEN_URL = 'https://api.clickup.com/api/v2/oauth/token';
const AUTHORIZE_URL = 'https://app.clickup.com/api';
const WORKSPACE = '1200400000014349';

/** A fake fetch that records the request and returns a chosen response. */
function fakeFetch(status, body) {
  const calls = [];
  const fn = async (url, opts) => {
    calls.push({ url, opts });
    return { ok: status >= 200 && status < 300, status, json: async () => body };
  };
  fn.calls = calls;
  return fn;
}

/* ── 1. state generation and validation ─────────────────────────────────── */
console.log('\n§ 1. OAuth state\n');
const s1 = generateState();
const s2 = generateState();
test('generateState returns 64 hex characters (32 CSPRNG bytes)', /^[0-9a-f]{64}$/.test(s1), s1.length);
test('two states are different (not time- or counter-derived)', s1 !== s2);
test('validateState accepts the identical value', validateState(s1, s1) === true);
test('validateState REJECTS a different value', validateState(s1, s2) === false);
test('validateState REJECTS an empty received value', validateState('', s1) === false);
test('validateState REJECTS an empty expected value', validateState(s1, '') === false);
test('validateState REJECTS a different length (no throw)', validateState('abc', s1) === false);
test('validateState REJECTS non-string input (no throw)', validateState(null, undefined) === false);
test('validateState REJECTS a prefix of the real state', validateState(s1.slice(0, 32), s1) === false);

/* ── 2. callback parameter handling ─────────────────────────────────────── */
console.log('\n§ 2. Callback parameters\n');
const p = (qs) => parseCallback(new URLSearchParams(qs));
test('a missing code is reported, not ignored', p('state=abc').reason === 'missing-code');
test('a missing state is reported, not ignored', p('code=xyz').reason === 'missing-state');
test('a provider error is surfaced with its own reason', p('error=access_denied').reason === 'provider-error');
test('a provider error keeps the provider message', p('error=access_denied').error === 'access_denied');
test('a valid callback yields the code', p('code=xyz&state=abc').ok === true && p('code=xyz&state=abc').code === 'xyz');
test('a valid callback yields the state for comparison', p('code=xyz&state=abc').state === 'abc');

/* ── 3. authorize URL construction ──────────────────────────────────────── */
console.log('\n§ 3. Authorize URL\n');
const authUrl = buildAuthorizeUrl('CID', 'http://localhost:8787/callback', 'STATE');
test('the authorize URL uses the ClickUp documented host', authUrl.startsWith(AUTHORIZE_URL + '?'));
test('the authorize URL carries client_id', authUrl.includes('client_id=CID'));
test('the authorize URL carries a URL-encoded redirect_uri', authUrl.includes('redirect_uri=http%3A%2F%2Flocalhost%3A8787%2Fcallback'));
test('the authorize URL carries the state', authUrl.includes('state=STATE'));
test('redirectUriFor builds the documented callback path', redirectUriFor(8787) === 'http://localhost:8787/callback');

/* ── 4. the code exchange ───────────────────────────────────────────────── */
console.log('\n§ 4. Code exchange\n');
const missing = await exchangeCode({ clientId: '', clientSecret: 's', code: 'c' });
test('missing input is refused before any network call', missing.ok === false && missing.reason === 'missing-input');

const netFail = await exchangeCode({ clientId: 'a', clientSecret: 'b', code: 'c', fetchImpl: async () => { throw new Error('boom'); } });
test('a network error is reported as network-error', netFail.ok === false && netFail.reason === 'network-error');

const rejected = await exchangeCode({ clientId: 'a', clientSecret: 'b', code: 'c', fetchImpl: fakeFetch(401, { err: 'Oauth token not found' }) });
test('a rejected exchange reports its HTTP status', rejected.ok === false && rejected.reason === 'rejected' && rejected.status === 401);
test('a rejected exchange keeps the provider message', rejected.error === 'Oauth token not found');

const noToken = await exchangeCode({ clientId: 'a', clientSecret: 'b', code: 'c', fetchImpl: fakeFetch(200, {}) });
test('a 200 with NO access_token is treated as failure', noToken.ok === false && noToken.reason === 'no-token-in-response');

const okFetch = fakeFetch(200, { access_token: 'tok_offline_test' });
const good = await exchangeCode({ clientId: 'a', clientSecret: 'b', code: 'c', fetchImpl: okFetch });
test('a good exchange returns the token', good.ok === true && good.token === 'tok_offline_test');
test('the exchange POSTs to the documented token URL', okFetch.calls[0].url === TOKEN_URL);
test('the exchange uses POST', okFetch.calls[0].opts.method === 'POST');
test('the exchange sends exactly the three required body fields', (() => {
  const b = JSON.parse(okFetch.calls[0].opts.body);
  return Object.keys(b).sort().join(',') === 'client_id,client_secret,code';
})());

/* ── 5. token verification against the live API shape ───────────────────── */
console.log('\n§ 5. Token verification\n');
const noTok = await verifyToken('', fakeFetch(200, {}));
test('a missing token is refused before any request', noTok.ok === false && noTok.reason === 'missing-token');

const vReject = await verifyToken('x', fakeFetch(401, { err: 'Oauth token not found' }));
test('an API-rejected token is NOT reported as working', vReject.ok === false && vReject.reason === 'rejected');

const vOther = await verifyToken('x', fakeFetch(200, { teams: [{ id: '999', name: 'Other' }] }));
test('a token that cannot see the Mercenta workspace is flagged', vOther.ok === true && vOther.workspaceFound === false);

const vGood = await verifyToken('x', fakeFetch(200, { teams: [{ id: WORKSPACE, name: 'Workspace' }] }));
test('a token that CAN see the Mercenta workspace is confirmed', vGood.ok === true && vGood.workspaceFound === true);
test('the confirmed workspace name is returned', vGood.workspaceName === 'Workspace');

/* ── 6. credential storage, permissions and missing credentials ─────────── */
console.log('\n§ 6. Credential storage\n');
test('nothing is stored before the first write', readStoredToken(tmpFile) === null);
test('hasStoredToken is false with no file', hasStoredToken(tmpFile) === false);

ensureSecureDir(tmpDir);
test('the credential DIRECTORY is created 700', dirMode(tmpDir) === '700', dirMode(tmpDir));

storeToken('tok_offline_test', tmpFile);
test('the credential FILE is written 600', fileMode(tmpFile) === '600', fileMode(tmpFile));
test('the stored token round-trips', readStoredToken(tmpFile) === 'tok_offline_test');
test('hasStoredToken is true once stored', hasStoredToken(tmpFile) === true);
test('the file records its kind as oauth', fs.readFileSync(tmpFile, 'utf8').includes('CLICKUP_TOKEN_KIND=oauth'));
test('the file is OUTSIDE the project directory', !tmpFile.startsWith(path.resolve('.')));

let refused = false;
try { storeToken('', tmpFile); } catch { refused = true; }
test('an EMPTY token is refused, never written', refused === true);

fs.writeFileSync(tmpFile, 'CLICKUP_API_TOKEN=REPLACE_WITH_YOUR_CLICKUP_TOKEN\n', { mode: 0o600 });
test('a PLACEHOLDER token counts as NOT configured', readStoredToken(tmpFile) === null);

fs.writeFileSync(tmpFile, 'NOT_A_TOKEN_LINE=1\n', { mode: 0o600 });
test('a file with no token line counts as NOT configured', readStoredToken(tmpFile) === null);

/* ── 7. the localhost-only callback server ──────────────────────────────── */
console.log('\n§ 7. Callback server\n');
const serverTokenFile = path.join(tmpDir, 'server-test.env');
const state = generateState();
const srv = startSetupServer({
  port: 0,
  state,
  onLog: () => {},
  fetchImpl: fakeFetch(200, { access_token: 'tok_from_server_test' }),
  tokenFile: serverTokenFile,
});
const addr = await srv.listen();
const base = 'http://127.0.0.1:' + addr.port;

test('the server binds to 127.0.0.1 ONLY (never the network)', addr.address === '127.0.0.1', addr.address);

const home = await fetch(base + '/');
const homeHtml = await home.text();
test('GET / serves the setup page', home.status === 200 && homeHtml.includes('<form'));
test('the setup page shows the exact redirect URL to register', homeHtml.includes(srv.redirectUri));
test('the setup page names the app', homeHtml.includes('Mercenta Automation'));
/**
 * §REPOINTED (2026-11-19) — NOT weakened, and the same class of breakage as the note above.
 * This assertion used to REQUIRE `app.clickup.com/settings/apps` — the "App Settings" page,
 * which offers only personal API tokens and authorized apps and has NO app-creation control
 * at all (confirmed by reading the live page). It was asserting a link that sent the Owner
 * to a page where the button does not exist. It is repointed to the page that actually holds
 * the control, and still FAILS if that link is removed or drifts back.
 */
test('the setup page links to the ClickUp page that HAS the Create control', homeHtml.includes('clickup-api/settings'));
test('the setup page states the secret goes outside the project', homeHtml.includes('.config/mercenta/clickup.env'));

const missing404 = await fetch(base + '/does-not-exist');
test('an unknown path returns 404', missing404.status === 404);

const badSave = await fetch(base + '/save', { method: 'POST', body: new URLSearchParams({ client_id: '', client_secret: '' }) });
test('POST /save with EMPTY fields is refused (400)', badSave.status === 400);

const noCode = await fetch(base + '/callback');
test('GET /callback with NO parameters is refused (400)', noCode.status === 400);

const wrongState = await fetch(base + '/callback?code=x&state=' + generateState());
test('GET /callback with a WRONG state is refused (400) — CSRF guard', wrongState.status === 400);

const save = await fetch(base + '/save', {
  method: 'POST',
  body: new URLSearchParams({ client_id: 'cid_test', client_secret: 'sec_test' }),
  redirect: 'manual',
});
test('POST /save with valid fields redirects to ClickUp', save.status === 302);
test('the redirect goes to the ClickUp authorize URL with the state', (save.headers.get('location') || '').includes('app.clickup.com/api') && (save.headers.get('location') || '').includes('state=' + state));
test('the redirect carries the registered redirect_uri', (save.headers.get('location') || '').includes(encodeURIComponent(srv.redirectUri)));

const cb = await fetch(base + '/callback?code=testcode&state=' + state);
const cbHtml = await cb.text();
test('GET /callback with the CORRECT state succeeds', cb.status === 200 && cbHtml.includes('Authorised'));

const doneResult = await srv.done;
test('the server reports success', doneResult.ok === true);
test('the token was stored in the injected file, not the real one', readStoredToken(serverTokenFile) === 'tok_from_server_test');
test('the REAL credential file was NOT written by the test', !fs.existsSync(path.join(os.homedir(), '.config', 'mercenta', 'server-test.env')));

let closed = false;
try { await fetch(base + '/'); } catch { closed = true; }
test('the server shuts itself down after success', closed === true);

/* ── 8. an already-authorised connection is not re-authorised by accident ── */
console.log('\n§ 8. Existing authenticated state\n');
storeToken('tok_offline_test', tmpFile);
test('a stored credential is detected', hasStoredToken(tmpFile) === true);
test('a placeholder is NOT treated as an existing credential', (() => {
  const f = path.join(tmpDir, 'ph.env');
  fs.writeFileSync(f, 'CLICKUP_API_TOKEN=REPLACE_WITH_YOUR_CLICKUP_TOKEN\n', { mode: 0o600 });
  return hasStoredToken(f) === false;
})());

/* ── 9. personal-token support (Option 1) ───────────────────────────────── */
console.log('\n§ 9. Personal API token\n');

test('a pk_ token is sent RAW, as ClickUp documents', authHeaderFor('pk_123_abc') === 'pk_123_abc');
test('an OAuth token is sent as a Bearer', authHeaderFor('eyJhbGci') === 'Bearer eyJhbGci');

const pkFetch = fakeFetch(200, { teams: [{ id: WORKSPACE, name: 'Workspace' }] });
const pkVerify = await verifyToken('pk_123_abc', pkFetch);
test('a personal token is verified with the RAW header, not Bearer', pkFetch.calls[0].opts.headers.Authorization === 'pk_123_abc');
test('a personal token that works is accepted', pkVerify.ok === true && pkVerify.workspaceFound === true);

const tried = [];
const retryFetch = async (url, opts) => {
  tried.push(opts.headers.Authorization);
  if (opts.headers.Authorization.startsWith('Bearer ')) return { ok: false, status: 401, json: async () => ({}) };
  return { ok: true, status: 200, json: async () => ({ teams: [{ id: WORKSPACE, name: 'W' }] }) };
};
const retried = await verifyToken('tok_plain', retryFetch);
test('a token rejected as Bearer is retried RAW before being called broken', retried.ok === true && tried.length === 2);

const kindFile = path.join(tmpDir, 'kind.env');
storeToken('pk_999_zzz', kindFile, 'personal');
test('a personal token is recorded with kind=personal', readStoredTokenKind(kindFile) === 'personal');
test('the stored value round-trips', readStoredToken(kindFile) === 'pk_999_zzz');
storeToken('tok_oauth', kindFile, 'oauth');
test('an oauth token is recorded with kind=oauth', readStoredTokenKind(kindFile) === 'oauth');
test('the default kind is oauth, so existing callers are unchanged', (() => {
  const f = path.join(tmpDir, 'default-kind.env');
  storeToken('tok_x', f);
  return readStoredTokenKind(f) === 'oauth';
})());

let wsRefused = false;
try { storeToken('pk_1_a b', kindFile, 'personal'); } catch { wsRefused = true; }
test('a token containing whitespace is refused', wsRefused === true);

/* ── 10. the /token route: verified BEFORE it is stored ─────────────────── */
console.log('\n§ 10. Token entry route\n');

let n = 0;
async function startTokenServer(fetchImpl) {
  n += 1;
  const file = path.join(tmpDir, 'route-' + n + '.env');
  const s = startSetupServer({ port: 0, state: generateState(), onLog: () => {}, fetchImpl, tokenFile: file });
  const a = await s.listen();
  return { s, file, base: 'http://127.0.0.1:' + a.port };
}

const post = (base, tok) =>
  fetch(base + '/token', { method: 'POST', body: new URLSearchParams({ token: tok }) });

// (a) the setup page offers the personal-token option, and points at the RIGHT ClickUp page
const A = await startTokenServer(fakeFetch(200, {}));
const pageHtml = await (await fetch(A.base + '/')).text();
test('the setup page offers Option 1 (personal token)', pageHtml.includes('Option 1') && pageHtml.includes('Personal API token'));
test('the setup page posts the token to /token', pageHtml.includes('action="/token"'));
test('the setup page still offers Option 2 (OAuth app)', pageHtml.includes('Option 2'));
test('the page sends the Owner to the page that HAS the Create control', pageHtml.includes('clickup-api/settings'));
test('the page no longer sends the Owner to the page with NO Create control', pageHtml.includes('app.clickup.com/settings/apps"') === false);
/**
 * §DEFECT FIXED (2026-11-19): the setup page was CACHEABLE, so after the helper changed the
 * browser kept showing the OLD form. This asserts the credential page is never cached again.
 */
const pageRes = await fetch(A.base + '/');
test('the credential page is served with Cache-Control: no-store', String(pageRes.headers.get('cache-control') || '').includes('no-store'));
A.s.close();

// (b) an empty token is refused and nothing is written
const B = await startTokenServer(fakeFetch(200, {}));
const empty = await post(B.base, '');
test('an empty token is refused (400)', empty.status === 400);
test('nothing is written for an empty token', readStoredToken(B.file) === null);
B.s.close();

// (c) a token ClickUp REJECTS is refused and NOT saved
const C = await startTokenServer(fakeFetch(401, { err: 'Token invalid' }));
const bad = await post(C.base, 'pk_1_bad');
const badHtml = await bad.text();
test('a token ClickUp rejects is refused (400)', bad.status === 400);
test('the refusal says plainly that nothing was saved', badHtml.includes('Nothing was saved'));
test('a REJECTED token is never written to disk', readStoredToken(C.file) === null);
C.s.close();

// (d) a token that cannot see the Mercenta workspace is refused and NOT saved
const D = await startTokenServer(fakeFetch(200, { teams: [{ id: '999', name: 'Other' }] }));
const wrong = await post(D.base, 'pk_1_other');
test('a token that cannot see the workspace is refused (400)', wrong.status === 400);
test('a wrong-workspace token is never written to disk', readStoredToken(D.file) === null);
D.s.close();

// (e) a GOOD token: verified, saved as personal, never echoed, server stops
const E = await startTokenServer(fakeFetch(200, { teams: [{ id: WORKSPACE, name: 'Mercenta' }] }));
const okRes = await post(E.base, 'pk_1_good');
const okHtml = await okRes.text();
test('a good token is accepted (200)', okRes.status === 200 && okHtml.includes('Connected'));
test('the token is NEVER echoed back into the page', okHtml.includes('pk_1_good') === false);
test('the token is NEVER placed in a URL', okRes.url.endsWith('/token'));
const doneE = await E.s.done;
test('the server reports success and the personal kind', doneE.ok === true && doneE.kind === 'personal');
test('the good token is stored as kind=personal', readStoredTokenKind(E.file) === 'personal');
test('the good token round-trips intact', readStoredToken(E.file) === 'pk_1_good');
let closedE = false;
try { await fetch(E.base + '/'); } catch { closedE = true; }
test('the server shuts itself down after a successful entry', closedE === true);

/* ── verdict ────────────────────────────────────────────────────────────── */

try { fs.rmSync(tmpRoot, { recursive: true, force: true }); } catch { /* best effort */ }
console.log('');
console.log(fail === 0
  ? 'AUTH_SELF_TEST_PASS (' + pass + ' checks, 0 failed)'
  : 'AUTH_SELF_TEST_FAIL (' + fail + ' of ' + (pass + fail) + ' failed)');
process.exit(fail === 0 ? 0 : 1);


