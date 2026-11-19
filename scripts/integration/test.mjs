#!/usr/bin/env node
/**
 * SECTION: INTEGRATION LAYER — OFFLINE TESTS.
 *
 * NO network, NO real credential, NO writes to any system. Every fetch is injected, so each
 * failure mode the brief names is exercised deterministically: authentication failure, missing
 * credentials, duplicate delivery, retries, rate limits, conflicts, outages and recovery.
 *
 * USAGE:  node scripts/integration/test.mjs
 */
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {
  redact, refFor, refSystem, request, parseRetryAfter, backoffMs,
  appendAudit, readAudit, loadState, saveState, emptyState, remember, seenBefore,
  markSynced, readEnvKey,
} from './lib/core.mjs';
import { clickupHeader, classifyPenpot, penpotUrl } from './connectors.mjs';
import { buildJwtAssertion, driveFingerprint } from './drive.mjs';
import { diffSnapshot, itemsOf, detectConflicts, rememberStatuses, clickupHighlights, renderReport, runSync, SYSTEMS } from './sync.mjs';
import crypto from 'node:crypto';

let pass = 0; let fail = 0;
function test(name, ok, detail) {
  if (ok) { pass++; console.log('PASS  ' + name); }
  else { fail++; console.log('FAIL  ' + name + (detail !== undefined ? '  -> ' + detail : '')); }
}

const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'mercenta-int-test-'));
const noSleep = async () => {};

/** A fetch double that replays a scripted sequence of responses. */
function scripted(list) {
  const calls = [];
  const fn = async (url, opts) => {
    calls.push({ url, opts });
    const next = list.length > 1 ? list.shift() : list[0];
    if (next instanceof Error) throw next;
    const headers = new Map(Object.entries(next.headers || {}));
    return { ok: next.status >= 200 && next.status < 300, status: next.status, headers: { get: (k) => headers.get(String(k).toLowerCase()) ?? null }, text: async () => next.body || '' };
  };
  fn.calls = calls;
  return fn;
}

const json = (o) => JSON.stringify(o);

/* ── 1. secret redaction ────────────────────────────────────────────────── */
console.log('\n§ 1. Secret redaction\n');
test('a Penpot userToken is redacted', redact('https://x/mcp/stream?userToken=SECRETVALUE123').indexOf('SECRETVALUE123') === -1);
test('the endpoint survives redaction', redact('https://x/mcp/stream?userToken=S').indexOf('https://x/mcp/stream') === 0);
test('a ClickUp personal token is redacted', redact('Authorization: pk_123_ABCDEFGHIJKLMNOP').indexOf('ABCDEFGHIJKLMNOP') === -1);
test('a GitHub token is redacted', redact('token ghp_ABCDEFGHIJKLMNOPQRSTUV').indexOf('ABCDEFGHIJKLMNOPQRSTUV') === -1);
test('a JWT is redacted', redact('bearer eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiIxMjM0NTY3ODkwIn0.abcdefghij').indexOf('eyJzdWIiOiIxMjM0NTY3ODkwIn0') === -1);
test('a private key block is redacted', redact('-----BEGIN PRIVATE KEY-----\nABCDEF\n-----END PRIVATE KEY-----').indexOf('ABCDEF') === -1);
test('ordinary prose is left alone', redact('the workspace is reachable') === 'the workspace is reachable');

/* ── 2. cross-system references ─────────────────────────────────────────── */
console.log('\n§ 2. Common references\n');
test('a reference is deterministic', refFor('clickup', 'abc123') === refFor('clickup', 'abc123'));
test('different objects get different references', refFor('clickup', 'a') !== refFor('clickup', 'b'));
test('the system is encoded in the reference', refSystem(refFor('github', 'x')) === 'GI');
test('an unrelated string is not a reference', refSystem('hello') === null);

/* ── 3. retries, backoff and rate limits ────────────────────────────────── */
console.log('\n§ 3. Retries and rate limits\n');
test('Retry-After in seconds is honoured', parseRetryAfter('2') === 2000);
test('Retry-After is capped at 60s', parseRetryAfter('9999') === 60000);
test('an HTTP-date Retry-After is honoured', parseRetryAfter(new Date(Date.now() + 3000).toUTCString(), Date.now()) <= 4000);
test('an absent Retry-After yields null', parseRetryAfter(null) === null);
test('backoff stays within its ceiling', backoffMs(3, 100, 1000) <= 400);

const flaky = scripted([{ status: 500, body: 'boom' }, { status: 500, body: 'boom' }, { status: 200, body: 'ok' }]);
const flakyRes = await request('https://x', { fetchImpl: flaky, sleep: noSleep });
test('a 500 is retried and the eventual success is returned', flakyRes.ok === true && flakyRes.attempts === 3, 'attempts=' + flakyRes.attempts);

const rate = scripted([{ status: 429, headers: { 'retry-after': '1' }, body: '' }, { status: 200, body: 'ok' }]);
const rateRes = await request('https://x', { fetchImpl: rate, sleep: noSleep });
test('a 429 is retried and then succeeds', rateRes.ok === true && rateRes.attempts === 2);

const forbidden = scripted([{ status: 403, body: 'no' }]);
const forbiddenRes = await request('https://x', { fetchImpl: forbidden, sleep: noSleep });
test('a 4xx is NOT retried (retrying cannot help)', forbiddenRes.attempts === 1 && forbiddenRes.ok === false);

const down = scripted([new Error('ECONNRESET'), new Error('ECONNRESET'), { status: 200, body: 'ok' }]);
const downRes = await request('https://x', { fetchImpl: down, sleep: noSleep });
test('a network failure is retried, then RECOVERS', downRes.ok === true && downRes.attempts === 3);

const always = scripted([{ status: 503, body: 'down' }]);
const alwaysRes = await request('https://x', { fetchImpl: always, sleep: noSleep, retries: 2 });
test('a persistent outage stops after the retry budget and reports failure', alwaysRes.ok === false && alwaysRes.attempts === 3);
test('a failure is never reported as a success', alwaysRes.ok === false);

/* ── 4. credentials and authentication failure ──────────────────────────── */
console.log('\n§ 4. Credentials\n');
test('a pk_ token is sent RAW to ClickUp', clickupHeader('pk_1_abc') === 'pk_1_abc');
test('an OAuth token is sent as a Bearer', clickupHeader('eyJx') === 'Bearer eyJx');

const envFile = path.join(tmp, 'cred.env');
fs.writeFileSync(envFile, 'CLICKUP_API_TOKEN=from-file\n', { mode: 0o600 });
test('the environment WINS over the file (CI supplies secrets)', readEnvKey('CLICKUP_API_TOKEN', envFile, { CLICKUP_API_TOKEN: 'from-env' }) === 'from-env');
test('the file is used when the environment has nothing', readEnvKey('CLICKUP_API_TOKEN', envFile, {}) === 'from-file');
test('a MISSING credential returns null, not a crash', readEnvKey('CLICKUP_API_TOKEN', path.join(tmp, 'nope.env'), {}) === null);
test('a missing key in an existing file returns null', readEnvKey('PENPOT_MCP_KEY', envFile, {}) === null);

test('a rejected Penpot key is detected', classifyPenpot('No userToken found in session context').keyAccepted === false);
test('an accepted key with no design is detected', classifyPenpot('No Penpot instance connected for user token').designConnected === false);
test('a connected design is detected', classifyPenpot('"result":{"content":[{"text":"1"}]}').designConnected === true);
test('the Penpot URL carries the key when one exists', penpotUrl('K').indexOf('userToken=K') !== -1);
test('the Penpot URL omits the key when there is none', penpotUrl(null).indexOf('userToken') === -1);

/* ── 5. Google Drive JWT (no dependency) ───────────────────────────────── */
console.log('\n§ 5. Drive JWT-bearer\n');
const { privateKey } = crypto.generateKeyPairSync('rsa', { modulusLength: 2048 });
const sa = { client_email: 'test@example.iam.gserviceaccount.com', private_key: privateKey.export({ type: 'pkcs8', format: 'pem' }), token_uri: 'https://oauth2.googleapis.com/token' };
const jwt = buildJwtAssertion(sa, 'https://www.googleapis.com/auth/drive.readonly', 1700000000000);
const parts = jwt.split('.');
test('the assertion has three parts', parts.length === 3);
test('the header declares RS256', JSON.parse(Buffer.from(parts[0], 'base64url').toString()).alg === 'RS256');
test('the claims carry the service-account email as iss', JSON.parse(Buffer.from(parts[1], 'base64url').toString()).iss === sa.client_email);
test('the claims carry the READ-ONLY scope', JSON.parse(Buffer.from(parts[1], 'base64url').toString()).scope === 'https://www.googleapis.com/auth/drive.readonly');
test('the signature verifies against the public key', crypto.createVerify('RSA-SHA256').update(parts[0] + '.' + parts[1]).verify(crypto.createPublicKey(privateKey), Buffer.from(parts[2], 'base64url')));
test('an incomplete service account is refused', (() => { try { buildJwtAssertion({ client_email: 'x' }); return false; } catch { return true; } })());
/* §DEFECT (2026-11-19): the sync layer passed an ENV object where a timestamp belonged, producing
   NaN iat/exp and making every Drive token request fail. A non-finite clock must fall back. */
const oddJwt = buildJwtAssertion(sa, 'https://www.googleapis.com/auth/drive.readonly', { not: 'a timestamp' });
const oddParts = oddJwt.split('.');
const oddClaims = JSON.parse(Buffer.from(oddParts[1], 'base64url').toString());
test('a NON-NUMERIC clock falls back instead of producing NaN', Number.isFinite(oddClaims.iat) && Number.isFinite(oddClaims.exp));
test('the fallback token is still correctly signed', crypto.createVerify('RSA-SHA256').update(oddParts[0] + '.' + oddParts[1]).verify(crypto.createPublicKey(privateKey), Buffer.from(oddParts[2], 'base64url')));

test('a Drive fingerprint changes when the file is modified', driveFingerprint({ id: 'a', modifiedTime: 't1' }) !== driveFingerprint({ id: 'a', modifiedTime: 't2' }));
test('an unchanged Drive file keeps the same fingerprint', driveFingerprint({ id: 'a', modifiedTime: 't1' }) === driveFingerprint({ id: 'a', modifiedTime: 't1' }));

/* ── 6. state, idempotency and recovery ────────────────────────────────── */
console.log('\n§ 6. State and idempotency\n');
const stateFile = path.join(tmp, 'state.json');
test('a missing state file yields an empty state', loadState(stateFile).idempotency && Object.keys(loadState(stateFile).idempotency).length === 0);
const st = emptyState();
test('a key is unseen before it is remembered', seenBefore(st, 'evt-1') === false);
remember(st, 'evt-1');
test('a key is seen once remembered', seenBefore(st, 'evt-1') === true);
remember(st, 'evt-1');
test('re-delivering the SAME event only increments its count', st.idempotency['evt-1'].count === 2);
test('re-delivering does not create a second entry', Object.keys(st.idempotency).length === 1);
markSynced(st, 'clickup');
test('markSynced records the time', typeof st.lastSync.clickup === 'string');
saveState(st, stateFile);
test('state round-trips through disk', loadState(stateFile).idempotency['evt-1'].count === 2);
fs.writeFileSync(stateFile, '{ this is not json');
test('a CORRUPT state file is recovered, not fatal', Object.keys(loadState(stateFile).idempotency).length === 0);

/* ── 7. change detection ───────────────────────────────────────────────── */
console.log('\n§ 7. Change detection\n');
const snapA = { ok: true, tasks: [{ id: 't1', ref: 'MER-CL-1', name: 'A', status: 'to do', list: 'L' }, { id: 't2', ref: 'MER-CL-2', name: 'B', status: 'to do', list: 'L' }] };
const empty = emptyState();
const d1 = diffSnapshot('clickup', snapA, empty);
test('a first run reports every item as ADDED', d1.added.length === 2 && d1.changed.length === 0);
empty.refs.clickup = d1.next;
const d2 = diffSnapshot('clickup', snapA, empty);
test('an IDENTICAL second run reports ZERO changes (idempotent)', d2.added.length === 0 && d2.changed.length === 0 && d2.unchanged.length === 2);
const snapB = { ok: true, tasks: [{ id: 't1', ref: 'MER-CL-1', name: 'A', status: 'complete', list: 'L' }, { id: 't2', ref: 'MER-CL-2', name: 'B', status: 'to do', list: 'L' }] };
const d3 = diffSnapshot('clickup', snapB, empty);
test('a changed status is reported as CHANGED', d3.changed.length === 1 && d3.changed[0].item.id === 't1');
const d4 = diffSnapshot('clickup', { ok: true, tasks: [snapA.tasks[0]] }, empty);
test('a removed item is reported as REMOVED', d4.removed.length === 1);
test('itemsOf ignores a failed snapshot entirely', itemsOf('clickup', { ok: false }).length === 0);

/* ── 8. conflict detection ─────────────────────────────────────────────── */
console.log('\n§ 8. Conflicts\n');
const dupSnap = { ok: true, tasks: [{ id: 't1', ref: 'MER-CL-SAME', name: 'A', status: 'to do' }, { id: 't2', ref: 'MER-CL-SAME', name: 'B', status: 'to do' }] };
const dupConf = detectConflicts({ snapshots: { clickup: dupSnap }, state: emptyState() });
test('a duplicate reference is detected', dupConf.some((c) => c.kind === 'duplicate-ref'));

const regState = emptyState();
regState.statusMemory = { clickup: { t1: 'complete' } };
const regConf = detectConflicts({ snapshots: { clickup: { ok: true, tasks: [{ id: 't1', ref: 'MER-CL-1', name: 'A', status: 'to do' }] } }, state: regState });
test('a ClickUp task that regressed from complete is detected', regConf.some((c) => c.kind === 'clickup-regression'));

const runState = emptyState();
runState.statusMemory = { githubRuns: { 99: 'success' } };
const runConf = detectConflicts({ snapshots: { github: { ok: true, workflowRuns: [{ id: 99, conclusion: 'failure' }] } }, state: runState });
test('a workflow that regressed from success is detected', runConf.some((c) => c.kind === 'workflow-regression'));

test('a healthy snapshot yields NO conflicts', detectConflicts({ snapshots: { clickup: snapA }, state: emptyState() }).length === 0);
test('rememberStatuses records the statuses for next time', (() => {
  const s = emptyState();
  rememberStatuses(s, { clickup: snapB, github: { ok: true, workflowRuns: [{ id: 1, conclusion: 'success' }] } });
  return s.statusMemory.clickup.t1 === 'complete' && s.statusMemory.githubRuns[1] === 'success';
})());

/* ── 9. audit trail ────────────────────────────────────────────────────── */
console.log('\n§ 9. Audit trail\n');
const auditFile = path.join(tmp, 'audit.jsonl');
appendAudit({ system: 'clickup', action: 'snapshot', outcome: 'ok', detail: 'all good' }, auditFile);
appendAudit({ system: 'penpot', action: 'snapshot', outcome: 'failed', detail: 'key was pk_123_SUPERSECRETVALUE' }, auditFile);
const audited = readAudit(auditFile);
test('both records are written', audited.length === 2);
test('the record carries system, action and outcome', audited[0].system === 'clickup' && audited[0].action === 'snapshot' && audited[0].outcome === 'ok');
test('a SECRET in the detail is redacted before it is written', audited[1].detail.indexOf('SUPERSECRETVALUE') === -1);
test('the redacted detail still explains what happened', audited[1].detail.indexOf('pk_123_') !== -1);
test('the audit file holds no raw secret on disk', fs.readFileSync(auditFile, 'utf8').indexOf('SUPERSECRETVALUE') === -1);
test('reading a non-existent audit yields an empty list', readAudit(path.join(tmp, 'none.jsonl')).length === 0);

/* ── 10. report rendering ──────────────────────────────────────────────── */
console.log('\n§ 10. Report\n');
const hi = clickupHighlights({ tasks: [
  { ref: 'MER-CL-1', name: 'Blocked one', status: 'blocked', list: 'L' },
  { ref: 'MER-CL-2', name: 'Awaiting one', status: 'awaiting approval', list: 'L' },
  { ref: 'MER-CL-3', name: 'Done', status: 'complete', list: 'L' },
] });
test('blocked tasks are counted', hi.blocked === 1);
test('awaiting approval is counted', hi.awaiting === 1);
test('complete is counted', hi.complete === 1);
test('the blocked task is named, not just counted', hi.blockedList[0].name === 'Blocked one');

const zero = { added: 0, changed: 0, unchanged: 0, removed: 0 };
const fakeResult = {
  run: 'run-test',
  at: '2026-01-01T00:00:00.000Z',
  results: {
    clickup: { ok: true, total: 3, counts: { added: 1, changed: 0, unchanged: 2, removed: 0 } },
    github: { ok: true, total: 2, counts: zero },
    penpot: { ok: true, total: 0, counts: zero },
    drive: { ok: true, total: 0, counts: zero },
  },
  conflicts: [{ kind: 'duplicate-ref', system: 'clickup', ref: 'MER-CL-SAME', detail: 'twice' }],
  snapshots: {
    clickup: { ok: true, tasks: [{ ref: 'MER-CL-1', name: 'Blocked one', status: 'blocked', list: 'L' }] },
    github: { ok: true, commits: [{ sha: 'abcdef1234567', short: 'abcdef1', message: 'test commit', author: 'me' }], pullRequests: [{ number: 1 }], issues: [], workflowRuns: [{ name: 'CI', conclusion: 'success', branch: 'main', sha: 'abcdef1' }] },
    penpot: { ok: true, keyAccepted: true, designConnected: false },
    drive: { ok: true, folderName: 'Mercenta Drive', files: [{ name: 'Report.docx', modifiedTime: '2026-01-01' }], pages: 1 },
  },
  state: { lastSync: { clickup: '2026-01-01T00:00:00.000Z' }, refs: {}, idempotency: {} },
};
const md = renderReport(fakeResult, 'daily');
test('the report names the run', md.indexOf('run-test') !== -1);
test('the report shows ClickUp as the command centre', md.indexOf('command centre') !== -1);
test('the report counts blocked tasks', md.indexOf('**1** blocked') !== -1);
test('the report names the blocked task', md.indexOf('Blocked one') !== -1);
test('the report shows the GitHub workflow conclusion', md.indexOf('**success**') !== -1);
test('the report states Penpot design is NOT connected', md.indexOf('Design file connected: **no**') !== -1);
test('the report names the Drive folder', md.indexOf('Mercenta Drive') !== -1);
test('the report lists the conflict', md.indexOf('duplicate-ref') !== -1);
test('the report states the read-only limitation', md.indexOf('read-only') !== -1);
test('the report claims NO bidirectional sync', md.indexOf('No bidirectional synchronisation') !== -1);

/* ── 11. data preservation — nothing may delete, and writes are confined ── */
/**
 * §REWRITTEN 2026-11-19 (rule 08-removal-coherence §2). Two assertions here previously proved
 * "the Drive connector is READ-ONLY", and the Google Drive write capability made them false.
 * They were not deleted and not weakened: they were converted into STRONGER guards that pin the
 * blast radius of the one write that now exists —
 *   (a) NOTHING anywhere may issue DELETE / PUT / PATCH;
 *   (b) ClickUp / GitHub / Penpot remain STRICTLY read-only (unchanged property, still pinned);
 *   (c) Drive write is confined to two named helpers that can only CREATE, never update;
 *   (d) the write test can only ever write inside its own dedicated test folder;
 *   (e) the READ path still uses drive.readonly; the broad scope appears exactly once, for write.
 */
console.log('\n§ 11. Data preservation\n');
const readSrc = (f) => fs.readFileSync(new URL('./' + f, import.meta.url), 'utf8');
const connectorsSrc = readSrc('connectors.mjs');
const driveSrc = readSrc('drive.mjs');

const destructive = [];
for (const [name, src] of [['connectors.mjs', connectorsSrc], ['drive.mjs', driveSrc]]) {
  if (/\bmethod:\s*['"](DELETE|PUT|PATCH)['"]/i.test(src)) destructive.push(name + ': destructive verb');
  if (/\.trash\b|files\/[^?'"]*\/delete/i.test(src)) destructive.push(name + ': delete endpoint');
}
test('nothing issues a DELETE, PUT or PATCH', destructive.length === 0, destructive.join(', '));

/**
 * (b) ClickUp / GitHub / Penpot remain READ-ONLY. POST is permitted ONLY as a JSON-RPC envelope to
 * the Penpot MCP server, because that protocol has no other transport — every such body must carry
 * a `jsonrpc` field. Any NON-JSON-RPC POST, and any PUT/PATCH/DELETE at all, is a failure.
 * (Refined 2026-11-19 after the first version of this guard flagged the legal MCP probe.)
 */
const connectorWrites = [];
const postBlocks = connectorsSrc.match(/method:\s*['"]POST['"][\s\S]{0,400}?fetchImpl/g) || [];
for (const b of postBlocks) {
  if (!/jsonrpc/.test(b)) connectorWrites.push('connectors.mjs: POST that is not a JSON-RPC envelope');
}
if (/\bmethod:\s*['"](PUT|PATCH|DELETE)['"]/i.test(connectorsSrc)) connectorWrites.push('connectors.mjs: destructive verb');
test('the ClickUp / GitHub / Penpot connectors remain read-only (POST only as JSON-RPC)',
  connectorWrites.length === 0, connectorWrites.join(', '));

test('the Penpot execute_code probes are non-mutating',
  !/execute_code'[\s\S]{0,240}?(createBoard|addPage|deleteFile|removePage|setFile|saveFile)/i.test(connectorsSrc),
  'the connector must only probe, never mutate the design file');

test('Drive can only CREATE — it never updates an existing file',
  !/files\/update|uploadType=resumable/i.test(driveSrc) &&
  /export async function createFolder/.test(driveSrc) &&
  /export async function createTextFile/.test(driveSrc));

test('the write test writes ONLY inside its own dedicated test folder',
  /const TEST_FOLDER = 'Mercenta Integration Test Artefacts'/.test(driveSrc) &&
  /createTextFile\(testFolderId/.test(driveSrc) &&
  !/createTextFile\(folder\.folderId/.test(driveSrc),
  'the test artefact must never be created in the business root folder');

test('the read path still requests the narrow drive.readonly scope',
  /export const DRIVE_SCOPE = 'https:\/\/www\.googleapis\.com\/auth\/drive\.readonly'/.test(driveSrc) &&
  /getAccessToken\(sa, fetchImpl, DRIVE_SCOPE/.test(driveSrc));

test('the broad drive scope is declared exactly once, for the write path',
  (driveSrc.match(/auth\/drive'/g) || []).length === 1,
  'DRIVE_FULL_SCOPE must be the single occurrence of the broad scope');

/* ── 12. end-to-end run (offline, everything failing) ───────────────────── */
console.log('\n§ 12. Whole-run exercise\n');
/**
 * Calls the REAL runSync with an injected fetch and fake credentials, so the entire code path
 * executes — including the state, audit and status-memory writes. Every request 401s, so this
 * also proves the run reports failures honestly instead of throwing or claiming success.
 * A missing import or a typo anywhere in that path fails here rather than at runtime.
 */
const e2eState = path.join(tmp, 'e2e-state.json');
const e2eAudit = path.join(tmp, 'e2e-audit.jsonl');
let e2eError = null;
let e2eResult = null;
try {
  e2eResult = await runSync({
    fetchImpl: scripted([{ status: 401, body: '{"err":"unauthorized"}' }]),
    env: { CLICKUP_API_TOKEN: 'pk_1_fake', GITHUB_TOKEN: 'ghp_fakefakefakefake' },
    stateFile: e2eState,
    auditFile: e2eAudit,
    clock: () => 1700000000000,
  });
} catch (e) { e2eError = e; }
test('the whole run completes without throwing', e2eError === null, e2eError && e2eError.message);
test('the run returns a run id', Boolean(e2eResult && e2eResult.run));
test('every unreachable system is reported as NOT ok', e2eResult && SYSTEMS.every((s) => e2eResult.results[s].ok === false));
test('the run still writes an audit record per system', readAudit(e2eAudit).length >= 4);
test('the run still persists state', fs.existsSync(e2eState));
test('a failing run reports NO synchronisation time', e2eResult && Object.keys(e2eResult.state.lastSync || {}).length === 0);

/* ── verdict ───────────────────────────────────────────────────────────── */
try { fs.rmSync(tmp, { recursive: true, force: true }); } catch { /* best effort */ }
console.log('');
console.log(fail === 0
  ? 'INTEGRATION_SELF_TEST_PASS (' + pass + ' checks, 0 failed)'
  : 'INTEGRATION_SELF_TEST_FAIL (' + fail + ' of ' + (pass + fail) + ' failed)');
process.exit(fail === 0 ? 0 : 1);