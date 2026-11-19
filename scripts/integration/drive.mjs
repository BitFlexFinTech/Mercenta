/**
 * SECTION: GOOGLE DRIVE CONNECTOR — READ-ONLY.
 *
 * AUTHENTICATION: the existing service-account key at
 * `~/.config/mercenta/drive-service-account.json` (mode 600, outside the repository). It carries
 * `client_email`, `private_key` and `token_uri`, which is exactly what Google's JWT-bearer flow
 * needs. That flow is implemented here with `node:crypto`, so NO dependency is added — the
 * alternative, `googleapis`, is tens of megabytes for one read-only listing.
 *
 * SCOPE: `drive.readonly` ONLY. This connector cannot create, modify or delete anything.
 * Nothing in this file issues a write request, and there is no code path that could.
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

