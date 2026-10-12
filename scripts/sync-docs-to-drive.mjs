#!/usr/bin/env node
/**
 * §GOOGLE DRIVE — MERCENTA'S DOCUMENT SYNC.
 *
 * Mirrors the project's DOCUMENTATION (the whole `docs/**` tree plus the root
 * `*.md` files) into the owner's Google Drive folder `Mercenta`, so the documents
 * can be read and kept organised away from this machine.
 *
 * IDENTITY — one app per project (`~/.cline/GOOGLE_APPS.md`, rule `google-app-per-project.md`):
 *   · Cloud project .......... `mercenta-partners`   (Mercenta's OWN, under mercentapartners@gmail.com)
 *   · Identity (service acct) . `mercenta-drive@mercenta-partners.iam.gserviceaccount.com`
 *   · Key file (OUTSIDE repo) . `~/.config/mercenta/drive-service-account.json`
 *
 * WHY THE OWNER'S LOGIN DOES THE WRITING. A Google service account has **no
 * storage quota**, so it cannot CREATE files in a personal My Drive. Writes use
 * the owner's own Google login (`mercentapartners@gmail.com`, signed in once with
 * `gcloud auth login --enable-gdrive-access`), which gcloud refreshes silently —
 * never the 7-day "Testing mode" expiry. The service-account key is shared INTO
 * the folder (writer) for future read tools.
 *
 * IDEMPOTENT. Every uploaded file carries `appProperties.rel` (its path relative
 * to the project root); a re-run finds each file and UPDATES it in place, so no
 * duplicates are ever created.
 *
 * Usage:
 *   node scripts/sync-docs-to-drive.mjs             # sync
 *   node scripts/sync-docs-to-drive.mjs --dry-run   # show what would be uploaded
 */
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { execSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const ACCOUNT = 'mercentapartners@gmail.com';
const SA_EMAIL = 'mercenta-drive@mercenta-partners.iam.gserviceaccount.com';
const DRIVE_FOLDER = 'Mercenta';
const PIN = path.join(os.homedir(), '.config/mercenta/drive-folder.json');
const DRY = process.argv.includes('--dry-run');

const MIME = {
  '.md': 'text/markdown', '.json': 'application/json', '.txt': 'text/plain',
  '.csv': 'text/csv', '.html': 'text/html', '.css': 'text/css', '.js': 'text/javascript',
  '.ts': 'text/plain', '.yml': 'text/yaml', '.yaml': 'text/yaml', '.svg': 'image/svg+xml',
  '.png': 'image/png', '.jpg': 'image/jpeg', '.pdf': 'application/pdf',
};
const mimeOf = (f) => MIME[path.extname(f).toLowerCase()] || 'application/octet-stream';

function token() {
  const base = `gcloud auth print-access-token --account=${ACCOUNT}`;
  for (const args of [`${base} --scopes=https://www.googleapis.com/auth/drive`, base]) {
    try {
      const t = execSync(`${args} 2>/dev/null`, { encoding: 'utf8' }).trim();
      if (t) return t;
    } catch { /* try the next form */ }
  }
  throw new Error('could not obtain a Drive access token — is ' + ACCOUNT + ' signed in with --enable-gdrive-access?');
}

let TOKEN = '';
async function api(url, init = {}) {
  const res = await fetch(url, {
    ...init,
    headers: { Authorization: `Bearer ${TOKEN}`, ...(init.headers || {}) },
  });
  const text = await res.text();
  if (!res.ok) throw new Error(`${res.status} ${res.statusText}: ${text.slice(0, 400)}`);
  return text ? JSON.parse(text) : {};
}
const esc = (s) => s.replace(/\\/g, '\\\\').replace(/'/g, "\\'");

async function findFolder(name, parent) {
  const q = `mimeType='application/vnd.google-apps.folder' and name='${esc(name)}' and trashed=false and '${parent}' in parents`;
  const r = await api(`https://www.googleapis.com/drive/v3/files?q=${encodeURIComponent(q)}&fields=files(id,name)`);
  return r.files?.[0]?.id || null;
}
async function ensureFolder(name, parent) {
  if (DRY) return `dry:${parent}/${name}`; // a dry run is purely local — no API calls
  const found = await findFolder(name, parent);
  if (found) return found;
  const r = await api('https://www.googleapis.com/drive/v3/files', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name, mimeType: 'application/vnd.google-apps.folder', parents: [parent] }),
  });
  return r.id;
}
async function findFileByRel(rel, parent) {
  const q = `appProperties has { key='rel' and value='${esc(rel)}' } and trashed=false and '${parent}' in parents`;
  const r = await api(`https://www.googleapis.com/drive/v3/files?q=${encodeURIComponent(q)}&fields=files(id,name)`);
  return r.files?.[0]?.id || null;
}
async function createFile(rel, name, parent, buf) {
  const boundary = 'mercenta' + Date.now();
  const meta = { name, parents: [parent], appProperties: { rel } };
  const body = Buffer.concat([
    Buffer.from(`--${boundary}\r\nContent-Type: application/json; charset=UTF-8\r\n\r\n${JSON.stringify(meta)}\r\n--${boundary}\r\nContent-Type: ${mimeOf(name)}\r\n\r\n`),
    buf,
    Buffer.from(`\r\n--${boundary}--`),
  ]);
  const r = await api('https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=id', {
    method: 'POST',
    headers: { 'Content-Type': `multipart/related; boundary=${boundary}` },
    body,
  });
  return r.id;
}
async function updateFile(id, buf, name) {
  await api(`https://www.googleapis.com/upload/drive/v3/files/${id}?uploadType=media&fields=id`, {
    method: 'PATCH',
    headers: { 'Content-Type': mimeOf(name) },
    body: buf,
  });
}

function collectDocs() {
  const files = [];
  const walk = (dir) => {
    for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
      const p = path.join(dir, e.name);
      if (e.isDirectory()) walk(p);
      else if (e.isFile()) files.push(path.relative(ROOT, p));
    }
  };
  const docsDir = path.join(ROOT, 'docs');
  if (fs.existsSync(docsDir)) walk(docsDir);
  for (const e of fs.readdirSync(ROOT, { withFileTypes: true })) {
    if (e.isFile() && e.name.toLowerCase().endsWith('.md')) files.push(e.name);
  }
  return files.sort();
}

async function main() {
  TOKEN = token();
  const me = await api('https://www.googleapis.com/drive/v3/about?fields=user(emailAddress,displayName)');
  console.log(`Sync target account: ${me.user.displayName} <${me.user.emailAddress}>`);
  console.log(`Mode: ${DRY ? 'DRY RUN (nothing written)' : 'LIVE'}\n`);

  let rootId = null;
  if (fs.existsSync(PIN)) rootId = JSON.parse(fs.readFileSync(PIN, 'utf8')).folderId || null;
  if (rootId) {
    try { await api(`https://www.googleapis.com/drive/v3/files/${rootId}?fields=id`); }
    catch { rootId = null; } // pinned folder gone — fall through and re-create
  }
  if (!rootId) rootId = await ensureFolder(DRIVE_FOLDER, 'root');
  if (!DRY && rootId && !rootId.startsWith('dry:')) {
    fs.writeFileSync(PIN, JSON.stringify({ folderName: DRIVE_FOLDER, folderId: rootId, account: ACCOUNT }, null, 2));
  }
  console.log(`Root folder "${DRIVE_FOLDER}" id: ${rootId}\n`);

  // Share write access with Mercenta's own service-account identity (future read tools).
  if (!DRY) {
    try {
      await api(`https://www.googleapis.com/drive/v3/files/${rootId}/permissions?sendNotificationEmail=false`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: 'user', role: 'writer', emailAddress: SA_EMAIL }),
      });
      console.log(`Shared the folder with the identity ${SA_EMAIL} (writer).\n`);
    } catch (e) {
      console.log(`(folder share step skipped: ${String(e).split('\n')[0]})\n`);
    }
  }

  const folders = new Map([['.', rootId]]);
  const ensurePath = async (relDir) => {
    if (folders.has(relDir)) return folders.get(relDir);
    const parentRel = path.dirname(relDir);
    const parentId = await ensurePath(parentRel === '.' ? '.' : parentRel);
    const id = await ensureFolder(path.basename(relDir), parentId);
    folders.set(relDir, id);
    return id;
  };

  const docs = collectDocs();
  let created = 0, updated = 0;
  for (const rel of docs) {
    const parentId = await ensurePath(path.dirname(rel));
    const buf = fs.readFileSync(path.join(ROOT, rel));
    if (DRY) { console.log(`[dry] ${rel} (${buf.length} bytes)`); continue; }
    const existing = await findFileByRel(rel, parentId);
    if (existing) { await updateFile(existing, buf, rel); updated++; }
    else { await createFile(rel, path.basename(rel), parentId, buf); created++; }
  }
  console.log(`\nSync complete: ${created} created, ${updated} updated, ${docs.length} document(s) total.`);
}

main().catch((e) => { console.error('\nSYNC FAILED:', e.message || e); process.exit(1); });
