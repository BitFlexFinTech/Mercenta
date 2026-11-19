/**
 * SECTION: MERCENTA INTEGRATION LAYER — CORE.
 *
 * One place that owns the four things every connector must do the same way:
 *   · REDACTION    — a credential must never reach a log, a report or the audit trail
 *   · HTTP         — retries, backoff, rate-limit awareness, timeouts
 *   · AUDIT        — an append-only record of every synchronisation attempt
 *   · STATE        — cached state + idempotency keys, so a repeated run changes nothing
 *
 * DESIGN RULES
 *   - No new dependency. Google's JWT-bearer flow is implemented with node:crypto.
 *   - Every network call is injectable, so the tests run with NO network at all.
 *   - Everything written lives under `reports/`, which is already gitignored.
 *   - Nothing here mutates a remote system. Writes are added deliberately, per direction.
 */
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import os from 'node:os';
import { fileURLToPath } from 'node:url';

export const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..', '..');
export const OUT_DIR = path.join(ROOT, 'reports', 'integration');
export const AUDIT_FILE = path.join(OUT_DIR, 'audit.jsonl');
export const STATE_FILE = path.join(OUT_DIR, 'state.json');
export const REPORT_DIR = path.join(ROOT, 'reports');

/* ================= redaction — the ONE way text leaves this layer ================= */

/**
 * Remove anything that looks like a credential from a string. Applied to EVERY message this
 * layer logs or stores. Deliberately broad: a false positive costs a `***`, a false negative
 * leaks a token.
 */
export function redact(value) {
  let s = typeof value === 'string' ? value : JSON.stringify(value);
  if (typeof s !== 'string') return String(value);
  s = s.replace(/(userToken=)[^&\s"']*/gi, '$1***');
  s = s.replace(/(authorization["'\s:=]+)(bearer\s+)?[A-Za-z0-9._~+/=-]{12,}/gi, '$1$2***');
  s = s.replace(/\b(pk_\d+_)[A-Za-z0-9]{8,}/g, '$1***');
  s = s.replace(/\b(gh[pousr]_)[A-Za-z0-9]{12,}/g, '$1***');
  s = s.replace(/\beyJ[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{5,}/g, '***JWT***');
  s = s.replace(/-----BEGIN [A-Z ]*PRIVATE KEY-----[\s\S]*?-----END [A-Z ]*PRIVATE KEY-----/g, '***PRIVATE KEY***');
  s = s.replace(/("?(?:private_key|client_secret|access_token|refresh_token|api_key|mcp_key)"?\s*[:=]\s*")[^"]{6,}"/gi, '$1***"');
  return s;
}

/* ================= common cross-system references ================= */

/**
 * A stable reference for one object in one system, e.g. `MER-CU-3f9a2b71`.
 * Deterministic, so the SAME object always yields the SAME reference on every run — that is
 * what lets an audit trail, a state file and a report all agree without a shared database.
 */
export function refFor(system, id) {
  const h = crypto.createHash('sha1').update(String(system) + ':' + String(id)).digest('hex').slice(0, 8);
  return 'MER-' + String(system).toUpperCase().slice(0, 2) + '-' + h;
}

/** Parse a reference back into its system prefix. */
export function refSystem(ref) {
  const m = String(ref || '').match(/^MER-([A-Z0-9]{2})-/);
  return m ? m[1] : null;
}

/* ================= clock (injectable, so tests are deterministic) ================= */

export function nowIso(clock = () => Date.now()) {
  return new Date(clock()).toISOString();
}

export function ensureOutDir(dir = OUT_DIR) {
  fs.mkdirSync(dir, { recursive: true });
  return dir;
}

/** The credential files, read from OUTSIDE the repository. Never logged. */
export const CRED = {
  clickup: path.join(os.homedir(), '.config', 'mercenta', 'clickup.env'),
  penpot: path.join(os.homedir(), '.config', 'mercenta', 'penpot.env'),
  driveServiceAccount: path.join(os.homedir(), '.config', 'mercenta', 'drive-service-account.json'),
  driveFolder: path.join(os.homedir(), '.config', 'mercenta', 'drive-folder.json'),
  driveOAuth: path.join(os.homedir(), '.config', 'mercenta', 'drive-oauth.json'),
};

/** Read one KEY=value out of an env-style credential file. Returns null when absent. */
export function readEnvKey(name, file, env = process.env) {
  if (env[name]) return env[name];                 /* CI supplies these as secrets */
  if (!fs.existsSync(file)) return null;
  const m = fs.readFileSync(file, 'utf8').match(new RegExp('^\\s*' + name + '\\s*=\\s*(\\S+)\\s*$', 'm'));
  return m ? m[1].trim() : null;
}

/* ================= HTTP: retries, backoff, rate-limit awareness ================= */

const defaultSleep = (ms) => new Promise((r) => setTimeout(r, ms));

/** Parse a Retry-After header in either documented form (seconds, or an HTTP date). */
export function parseRetryAfter(value, now = Date.now()) {
  if (value == null) return null;
  const s = String(value).trim();
  if (/^\d+$/.test(s)) return Math.min(Number(s) * 1000, 60000);
  const t = Date.parse(s);
  if (!Number.isNaN(t)) return Math.max(0, Math.min(t - now, 60000));
  return null;
}

/** Full jitter backoff — spreads retries so a shared rate limit is not hammered in lockstep. */
export function backoffMs(attempt, base = 500, cap = 15000) {
  const ceiling = Math.min(cap, base * Math.pow(2, attempt - 1));
  return Math.round(Math.random() * ceiling);
}

/**
 * One HTTP request with retries. NEVER throws for an HTTP status — it returns a structured
 * result, so a caller cannot mistake a failure for a success. Retries only what is safe to
 * retry: network errors, 429 and 5xx. A 4xx is returned immediately (retrying cannot help).
 */
export async function request(url, opts = {}) {
  const {
    method = 'GET',
    headers = {},
    body,
    fetchImpl = fetch,
    retries = 3,
    timeoutMs = 20000,
    baseDelayMs = 500,
    sleep = defaultSleep,
    clock = () => Date.now(),
  } = opts;

  let attempts = 0;
  let lastError = null;

  for (attempts = 1; attempts <= retries + 1; attempts++) {
    const controller = typeof AbortController === 'function' ? new AbortController() : null;
    const timer = controller ? setTimeout(() => controller.abort(), timeoutMs) : null;
    try {
      const res = await fetchImpl(url, { method, headers, body, signal: controller ? controller.signal : undefined });
      if (timer) clearTimeout(timer);
      const text = await res.text();
      const retryable = res.status === 429 || res.status >= 500;
      if (!retryable) {
        return { ok: res.ok, status: res.status, headers: res.headers || {}, text, attempts, error: null };
      }
      lastError = 'HTTP ' + res.status;
      if (attempts > retries) {
        return { ok: false, status: res.status, headers: res.headers || {}, text, attempts, error: lastError };
      }
      const wait = parseRetryAfter((res.headers && typeof res.headers.get === 'function' ? res.headers.get('retry-after') : null), clock())
        ?? backoffMs(attempts, baseDelayMs);
      await sleep(wait);
    } catch (e) {
      if (timer) clearTimeout(timer);
      lastError = String((e && e.message) || e);
      if (attempts > retries) return { ok: false, status: 0, headers: {}, text: '', attempts, error: lastError };
      await sleep(backoffMs(attempts, baseDelayMs));
    }
  }
  return { ok: false, status: 0, headers: {}, text: '', attempts, error: lastError || 'unreachable' };
}

/* ================= the audit trail (append-only, redacted, outside git) ================= */

export function newRunId(clock = () => Date.now()) {
  return 'run-' + new Date(clock()).toISOString().replace(/[:.]/g, '-');
}

/**
 * Append ONE audit record. Every field that could carry a credential goes through `redact`,
 * so the audit trail can be committed to a report without leaking anything.
 */
export function appendAudit(entry, file = AUDIT_FILE) {
  ensureOutDir(path.dirname(file));
  const record = {
    at: entry.at || new Date().toISOString(),
    run: entry.run || null,
    system: entry.system,
    action: entry.action,
    ref: entry.ref || null,
    outcome: entry.outcome,
    attempts: entry.attempts === undefined ? null : entry.attempts,
    detail: entry.detail ? redact(entry.detail) : null,
  };
  fs.appendFileSync(file, JSON.stringify(record) + '\n');
  return record;
}

export function readAudit(file = AUDIT_FILE, limit = 500) {
  if (!fs.existsSync(file)) return [];
  const lines = fs.readFileSync(file, 'utf8').split('\n').filter(Boolean);
  return lines.slice(-limit).map((l) => { try { return JSON.parse(l); } catch { return null; } }).filter(Boolean);
}

/* ================= cached state + idempotency ================= */

export function emptyState() {
  return { version: 1, idempotency: {}, lastSync: {}, refs: {} };
}

export function loadState(file = STATE_FILE) {
  if (!fs.existsSync(file)) return emptyState();
  try {
    const s = JSON.parse(fs.readFileSync(file, 'utf8'));
    return { ...emptyState(), ...s };
  } catch {
    return emptyState();   /* a corrupt state file must not stop a run; it is rebuilt */
  }
}

export function saveState(state, file = STATE_FILE) {
  ensureOutDir(path.dirname(file));
  const tmp = file + '.tmp';
  fs.writeFileSync(tmp, JSON.stringify(state, null, 2));
  fs.renameSync(tmp, file);      /* atomic, so an interrupted run cannot corrupt it */
  return file;
}

/** Has this exact event been handled before? The key is the event's own identity. */
export function seenBefore(state, key) {
  return Object.prototype.hasOwnProperty.call(state.idempotency, key);
}

/** Record an event as handled. Re-recording the SAME key changes only the counters. */
export function remember(state, key, at = new Date().toISOString()) {
  const prev = state.idempotency[key];
  state.idempotency[key] = prev
    ? { firstSeen: prev.firstSeen, lastSeen: at, count: prev.count + 1 }
    : { firstSeen: at, lastSeen: at, count: 1 };
  return state.idempotency[key];
}

export function markSynced(state, system, at = new Date().toISOString()) {
  state.lastSync[system] = at;
  return at;
}

