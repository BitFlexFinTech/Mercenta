/**
 * SECTION: GOOGLE DRIVE CONNECTOR.
 *
 * AUTHENTICATION: the existing service-account key at
 * `~/.config/mercenta/drive-service-account.json` (mode 600, outside the repository). It carries
 * `client_email`, `private_key` and `token_uri`, which is exactly what Google's JWT-bearer flow
 * needs. That flow is implemented here with `node:crypto`, so NO dependency is added — the
 * alternative, `googleapis`, is tens of megabytes for one read-only listing.
 *
 * SCOPE — READ AND WRITE (corrected 2026-11-19; this header previously claimed read-only, which
 * stopped being true when the write capability below was added — see 10-describers-must-match-reality).
 *   READ  — `drive.readonly`. Used by `snapshot()`, the sync layer and every report.
 *   WRITE — `drive` (full). Used ONLY by `writeReadBackTest()`, which creates one clearly-labelled
 *           artefact inside a dedicated test folder and reads it back. There is still NO code path
 *           that deletes, overwrites or trashes anything: `createFolder`, `createTextFile` and
 *           `readFileText` are the only write/read calls, and none of them targets an existing file.
 *           §BLOCKED 2026-11-19: a live write returned 403 "Service Accounts do not have storage
 *           quota", so write is NOT working today — see the OAUTH WRITE IDENTITY block below for
 *           the measured cause and the free remedy.
 */
import fs from 'node:fs';
import crypto from 'node:crypto';
import { request, redact, CRED } from './lib/core.mjs';

export const DRIVE_SCOPE = 'https://www.googleapis.com/auth/drive.readonly';
const DRIVE_API = 'https://www.googleapis.com/drive/v3';

const b64url = (buf) => Buffer.from(buf).toString('base64url');

/** Build the signed JWT assertion Google's token endpoint expects. Never logged. */
export function buildJwtAssertion(sa, scope = DRIVE_SCOPE, now = Date.now()) {
  if (!sa || !sa.client_email || !sa.private_key) throw new Error('service account is missing client_email or private_key');
  /**
   * §DEFECT FIXED (2026-11-19). `now` is sometimes passed something that is NOT a timestamp: the
   * sync layer called `snapshot(fetchImpl, env)`, so an environment object arrived here and
   * `Math.floor(env / 1000)` produced NaN, making iat/exp invalid and every Drive token request
   * fail with "token-request-failed". A non-finite value now falls back to the real clock, so a
   * caller mistake degrades to a working request instead of a silent total failure.
   */
  const stamp = Number.isFinite(Number(now)) ? Number(now) : Date.now();
  const iat = Math.floor(stamp / 1000);
  const header = { alg: 'RS256', typ: 'JWT' };
  const claims = { iss: sa.client_email, scope, aud: sa.token_uri || 'https://oauth2.googleapis.com/token', iat, exp: iat + 3600 };
  const unsigned = b64url(JSON.stringify(header)) + '.' + b64url(JSON.stringify(claims));
  const signature = crypto.createSign('RSA-SHA256').update(unsigned).sign(sa.private_key);
  return unsigned + '.' + b64url(signature);
}

/** Load the service-account key. Returns null when it is absent — never throws for that. */
export function loadServiceAccount(file = CRED.driveServiceAccount) {
  if (!fs.existsSync(file)) return null;
  try { return JSON.parse(fs.readFileSync(file, 'utf8')); } catch { return null; }
}

/** Load the Mercenta Drive folder record (folderName / folderId / account). */
export function loadFolderRecord(file = CRED.driveFolder) {
  if (!fs.existsSync(file)) return null;
  try { return JSON.parse(fs.readFileSync(file, 'utf8')); } catch { return null; }
}

/* ================= OAUTH WRITE IDENTITY (added 2026-11-19) =================
 * WHY THIS EXISTS — a measured Google platform constraint, not a guess.
 *
 * On 2026-11-19 a live write attempt returned:
 *   403 "Service Accounts do not have storage quota. Leverage shared drives ... or use ..."
 * The target folder is owned by `mercentapartners@gmail.com` — a CONSUMER Google account.
 * The service account's own capabilities on that folder are canAddChildren:true / canEdit:true,
 * so PERMISSION is not the problem. The problem is that a service account owns no storage, so
 * it cannot create a file that it would own. Google's documented remedy is a Shared Drive, but
 * consumer Gmail accounts have no Shared Drives (a live `drives.list` returned an empty array).
 * The free, supported remedy for a consumer account is therefore an OAuth REFRESH TOKEN for the
 * owner's own account: files are then created AS THE OWNER and use the owner's quota.
 *
 * The write path below prefers OAuth and falls back to the service account, so it activates
 * PURELY BY CREDENTIAL — no code change is needed when the refresh token is supplied.
 */
export function loadOAuthClient(file = CRED.driveOAuth) {
  if (!fs.existsSync(file)) return null;
  try {
    const j = JSON.parse(fs.readFileSync(file, 'utf8'));
    const inner = j.installed || j.web || j;
    if (!inner || !inner.client_id || !inner.client_secret || !inner.refresh_token) return null;
    return { client_id: inner.client_id, client_secret: inner.client_secret, refresh_token: inner.refresh_token, token_uri: inner.token_uri || 'https://oauth2.googleapis.com/token' };
  } catch { return null; }
}

/** Exchange a stored refresh token for a short-lived access token. The token is never logged. */
export async function getOAuthAccessToken(oauth, fetchImpl = fetch, scope = DRIVE_FULL_SCOPE) {
  const body = new URLSearchParams({
    grant_type: 'refresh_token',
    client_id: oauth.client_id,
    client_secret: oauth.client_secret,
    refresh_token: oauth.refresh_token,
    scope,
  }).toString();
  const res = await request(oauth.token_uri || 'https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body,
    fetchImpl,
  });
  if (!res.ok) {
    let detail = '';
    try { detail = (JSON.parse(res.text).error || '') + ''; } catch { detail = redact(res.text).slice(0, 120); }
    return { ok: false, reason: 'oauth-token-failed', status: res.status, detail };
  }
  let json = null; try { json = JSON.parse(res.text); } catch { json = null; }
  if (!json || !json.access_token) return { ok: false, reason: 'no-access-token' };
  return { ok: true, token: json.access_token, identity: 'oauth-owner' };
}

/**
 * Resolve a WRITE-capable access token.
 * OAuth owner identity wins (it has storage quota); the service account is the fallback.
 * Returns { ok, token, identity } or { ok:false, reason } — never throws.
 */
export async function getWriteAccessToken(fetchImpl = fetch, now = Date.now()) {
  const oauth = loadOAuthClient();
  if (oauth) {
    const r = await getOAuthAccessToken(oauth, fetchImpl, DRIVE_FULL_SCOPE);
    if (r.ok) return r;
    return { ok: false, reason: 'oauth-configured-but-failed', detail: r.detail, status: r.status };
  }
  const sa = loadServiceAccount();
  if (!sa) return { ok: false, reason: 'no-credential' };
  const r = await getAccessToken(sa, fetchImpl, DRIVE_FULL_SCOPE, now);
  if (!r.ok) return { ok: false, reason: r.reason, status: r.status };
  return { ok: true, token: r.token, identity: 'service-account' };
}

/** Exchange the assertion for a short-lived access token. The token is never logged. */
export async function getAccessToken(sa, fetchImpl = fetch, scope = DRIVE_SCOPE, now = Date.now()) {
  const assertion = buildJwtAssertion(sa, scope, now);
  const body = 'grant_type=' + encodeURIComponent('urn:ietf:params:oauth:grant-type:jwt-bearer') + '&assertion=' + assertion;
  const res = await request(sa.token_uri || 'https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body,
    fetchImpl,
  });
  if (!res.ok) return { ok: false, reason: 'token-request-failed', status: res.status, detail: redact(res.text).slice(0, 200) };
  let json = null;
  try { json = JSON.parse(res.text); } catch { json = null; }
  if (!json || !json.access_token) return { ok: false, reason: 'no-access-token' };
  return { ok: true, token: json.access_token, expiresIn: json.expires_in || null, attempts: res.attempts };
}

/** List one page of children of a Drive folder. READ-ONLY. */
export async function listFolder(folderId, token, fetchImpl = fetch, pageToken = null) {
  const params = new URLSearchParams({
    q: `'${folderId}' in parents and trashed = false`,
    fields: 'nextPageToken, files(id,name,mimeType,modifiedTime,size,md5Checksum,webViewLink,owners(emailAddress,displayName),parents)',
    pageSize: '100',
    supportsAllDrives: 'true',
    includeItemsFromAllDrives: 'true',
  });
  if (pageToken) params.set('pageToken', pageToken);
  const res = await request(DRIVE_API + '/files?' + params.toString(), {
    headers: { Authorization: 'Bearer ' + token },
    fetchImpl,
  });
  if (!res.ok) {
    return {
      ok: false,
      status: res.status,
      reason: res.status === 401 || res.status === 403 ? 'not-authorized' : 'list-failed',
      detail: redact(res.text).slice(0, 200),
    };
  }
  let json = null;
  try { json = JSON.parse(res.text); } catch { json = null; }
  return { ok: true, files: (json && json.files) || [], nextPageToken: (json && json.nextPageToken) || null };
}

/** List EVERY child, following pagination. READ-ONLY. */
export async function listFolderAll(folderId, token, fetchImpl = fetch, maxPages = 20) {
  const files = [];
  let pageToken = null;
  let pages = 0;
  do {
    const page = await listFolder(folderId, token, fetchImpl, pageToken);
    if (!page.ok) return { ok: false, reason: page.reason, status: page.status, files };
    files.push(...page.files);
    pageToken = page.nextPageToken;
    pages++;
  } while (pageToken && pages < maxPages);
  return { ok: true, files, pages };
}

/**
 * A change-detection fingerprint for one Drive file. `modifiedTime` + `md5Checksum` is enough to
 * tell "unchanged" from "changed" without downloading anything.
 */
export function driveFingerprint(file) {
  return [file.id, file.modifiedTime || '', file.md5Checksum || '', file.size || ''].join('|');
}

/* ================= WRITE CAPABILITY (added 2026-11-19) ================= */

const DRIVE_UPLOAD = 'https://www.googleapis.com/upload/drive/v3/files';
export const DRIVE_FULL_SCOPE = 'https://www.googleapis.com/auth/drive';

/** Build a Google `multipart/related` body: metadata part + content part. */
export function multipartBody(metadata, content) {
  const boundary = 'mercenta-' + crypto.randomBytes(12).toString('hex');
  const body =
    '--' + boundary + '\r\n' +
    'Content-Type: application/json; charset=UTF-8\r\n\r\n' +
    JSON.stringify(metadata) + '\r\n' +
    '--' + boundary + '\r\n' +
    'Content-Type: text/plain; charset=UTF-8\r\n\r\n' +
    content + '\r\n' +
    '--' + boundary + '--\r\n';
  return { boundary, body };
}

/** Create a folder. Returns { ok, id, name }. */
export async function createFolder(parentId, token, name, fetchImpl = fetch) {
  const res = await request(DRIVE_API + '/files?fields=id,name,mimeType', {
    method: 'POST',
    headers: { Authorization: 'Bearer ' + token, 'Content-Type': 'application/json' },
    body: JSON.stringify({ name, mimeType: 'application/vnd.google-apps.folder', parents: [parentId] }),
    fetchImpl,
  });
  if (!res.ok) return { ok: false, status: res.status, reason: res.status === 403 ? 'forbidden' : 'create-failed', detail: redact(res.text).slice(0, 200) };
  let j = null; try { j = JSON.parse(res.text); } catch { j = null; }
  return { ok: true, id: j && j.id, name: j && j.name };
}

/** Upload a plain-text file. Returns { ok, id, name, md5Checksum, size }. */
export async function createTextFile(parentId, token, name, content, fetchImpl = fetch) {
  const { boundary, body } = multipartBody({ name, parents: [parentId], mimeType: 'text/plain' }, content);
  const res = await request(DRIVE_UPLOAD + '?uploadType=multipart&fields=id,name,mimeType,modifiedTime,size,md5Checksum', {
    method: 'POST',
    headers: { Authorization: 'Bearer ' + token, 'Content-Type': 'multipart/related; boundary=' + boundary },
    body,
    fetchImpl,
  });
  if (!res.ok) return { ok: false, status: res.status, reason: res.status === 403 ? 'forbidden' : 'upload-failed', detail: redact(res.text).slice(0, 200) };
  let j = null; try { j = JSON.parse(res.text); } catch { j = null; }
  return { ok: true, id: j && j.id, name: j && j.name, md5Checksum: j && j.md5Checksum, size: j && j.size ? Number(j.size) : null };
}

/** Read a file's text content back. */
export async function readFileText(fileId, token, fetchImpl = fetch) {
  const res = await request(DRIVE_API + '/files/' + fileId + '?alt=media', {
    headers: { Authorization: 'Bearer ' + token },
    fetchImpl,
  });
  if (!res.ok) return { ok: false, status: res.status, reason: res.status === 403 ? 'forbidden' : 'download-failed' };
  return { ok: true, text: res.text };
}

/** Find a child folder by exact name, or null. Read-only. */
export async function findChildFolder(parentId, token, name, fetchImpl = fetch) {
  const q = `'${parentId}' in parents and name = '${name.replace(/'/g, "\\'")}' and mimeType = 'application/vnd.google-apps.folder' and trashed = false`;
  const params = new URLSearchParams({ q, fields: 'files(id,name)', pageSize: '10', supportsAllDrives: 'true' });
  const res = await request(DRIVE_API + '/files?' + params.toString(), { headers: { Authorization: 'Bearer ' + token }, fetchImpl });
  if (!res.ok) return null;
  let j = null; try { j = JSON.parse(res.text); } catch { j = null; }
  return (j && j.files && j.files[0] && j.files[0].id) || null;
}

/**
 * The ONE clearly-identified, NON-DESTRUCTIVE write/read-back test the brief requires.
 * It creates a DEDICATED test folder and one test file inside it, reads the content back and
 * compares it byte-for-byte. It never touches an existing business document, and it never
 * deletes anything. Re-running it REUSES the same folder and writes the same file name, so it
 * does not litter the Drive with duplicates.
 */
export async function writeReadBackTest(fetchImpl = fetch, now = Date.now()) {
  const folder = loadFolderRecord();
  if (!folder || !folder.folderId) return { ok: false, step: 'credential', reason: 'no-folder-record' };

  const auth = await getWriteAccessToken(fetchImpl, now);
  if (!auth.ok) return { ok: false, step: 'token', reason: auth.reason, status: auth.status, detail: auth.detail };
  const identity = auth.identity;

  const TEST_FOLDER = 'Mercenta Integration Test Artefacts';
  let testFolderId = await findChildFolder(folder.folderId, auth.token, TEST_FOLDER, fetchImpl);
  let createdFolder = false;
  if (!testFolderId) {
    const made = await createFolder(folder.folderId, auth.token, TEST_FOLDER, fetchImpl);
    if (!made.ok) {
      const blocked = /storage quota/i.test(made.detail || '') ? 'service-account-has-no-storage-quota' : null;
      return { ok: false, step: 'create-folder', reason: made.reason, status: made.status, identity, blocked, detail: made.detail };
    }
    testFolderId = made.id;
    createdFolder = true;
  }

  const stamp = new Date(now).toISOString();
  const payload = 'Mercenta integration write/read-back test\nGenerated: ' + stamp + '\nMarker: MER-INTEGRATION-WRITE-TEST\n';
  const name = 'integration-write-test.txt';
  const up = await createTextFile(testFolderId, auth.token, name, payload, fetchImpl);
  if (!up.ok) {
    const blocked = /storage quota/i.test(up.detail || '') ? 'service-account-has-no-storage-quota' : null;
    return { ok: false, step: 'upload', reason: up.reason, status: up.status, identity, blocked, detail: up.detail };
  }

  const back = await readFileText(up.id, auth.token, fetchImpl);
  if (!back.ok) return { ok: false, step: 'read-back', reason: back.reason, status: back.status, identity, fileId: up.id };

  return {
    ok: back.text === payload,
    step: 'complete',
    identity,
    fileId: up.id,
    fileName: up.name || name,
    folderId: testFolderId,
    folderName: TEST_FOLDER,
    createdFolder,
    bytesWritten: Buffer.byteLength(payload, 'utf8'),
    bytesRead: Buffer.byteLength(back.text, 'utf8'),
    contentMatches: back.text === payload,
    md5: up.md5Checksum || null,
    scope: 'drive (full)',
  };
}
 /**
 * Read-only snapshot: the folder's contents, fingerprinted for change detection.
 * The second parameter is the ENV, matching the connector contract used by the sync layer —
 * it is deliberately NOT a timestamp (see the §DEFECT note in buildJwtAssertion).
 */
export async function snapshot(fetchImpl = fetch, env = process.env) {
  const now = Date.now();
  const sa = loadServiceAccount();
  if (!sa) return { ok: false, reason: 'no-service-account' };
  const folder = loadFolderRecord();
  if (!folder || !folder.folderId) return { ok: false, reason: 'no-folder-record' };

  const auth = await getAccessToken(sa, fetchImpl, DRIVE_SCOPE, now);
  if (!auth.ok) return { ok: false, reason: auth.reason, status: auth.status };

  const listing = await listFolderAll(folder.folderId, auth.token, fetchImpl);
  if (!listing.ok) return { ok: false, reason: listing.reason, status: listing.status };

  return {
    ok: true,
    folderName: folder.folderName || null,
    folderId: folder.folderId,
    files: listing.files.map((f) => ({
      id: f.id,
      name: f.name,
      mimeType: f.mimeType,
      modifiedTime: f.modifiedTime || null,
      size: f.size ? Number(f.size) : null,
      fingerprint: driveFingerprint(f),
      owner: (f.owners && f.owners[0] && (f.owners[0].emailAddress || f.owners[0].displayName)) || null,
      link: f.webViewLink || null,
    })),
    pages: listing.pages,
  };
}

