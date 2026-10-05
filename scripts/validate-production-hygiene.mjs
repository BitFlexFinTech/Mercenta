/**
 * §PHASE 15 — PRODUCTION-HYGIENE AUDIT (production-data-cleanup launch gate).
 *
 * WHY THIS EXISTS
 * ---------------
 * The `phase15-production-data-cleanup` gate declares its scope as "remove
 * accidental test data and debug content … and development endpoint audit", but
 * the gate only checked one file (`App.tsx`) for TODO/FIXME and the existence of
 * the dead-code gate. This validator makes "no debug content ships" and "no
 * dev-only endpoint ships" into MACHINE-CHECKED invariants over the WHOLE shipped
 * client source.
 *
 * WHAT IT ASSERTS (over `src/**\/*.ts(x)`, comments STRIPPED so prose is ignored)
 * ---------------------------------------------------------------------------
 *   A. NO debug output — no `console.log`, `console.debug`, `debugger`.
 *      (`console.info`/`warn`/`error` are allowed: they are operational logging,
 *      e.g. the monitoring seam.)
 *   B. NO `TODO` / `FIXME` placeholder markers.
 *   C. NO dev-only host (`localhost` / `127.0.0.1`) EXCEPT a DECLARED allowlist —
 *      the parked-integration default URLs, which are recorded here with a reason
 *      rather than left unexplained.
 *
 * Usage: node scripts/validate-production-hygiene.mjs  (exit 1 on any failure)
 */
import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = fileURLToPath(new URL('../', import.meta.url));
const SRC = join(ROOT, 'src');

let checks = 0;
let failures = 0;
const test = (name, ok, detail = '') => {
  checks++;
  console.log(`${ok ? '✓' : '✗'} ${name}${!ok && detail ? ` — ${detail}` : ''}`);
  if (!ok) failures++;
};

/** Strip block and line comments (the line rule requires `//` not preceded by
 *  `:` so `https://…` survives) so the audit reads CODE, not prose. */
const stripComments = (code) =>
  code.replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|[^:])\/\/[^\n]*/g, '$1');

const files = readdirSync(SRC, { recursive: true })
  .filter((f) => typeof f === 'string' && /\.(ts|tsx)$/.test(f))
  .map((f) => join(SRC, f));
const rel = (p) => p.replace(ROOT, '');
const codeOf = (f) => stripComments(readFileSync(f, 'utf8'));

/* ── A: debug output ───────────────────────────────────────────────────────── */
const DEBUG_RE = /\bconsole\.(log|debug)\s*\(|\bdebugger\b/;
const withDebug = files.filter((f) => DEBUG_RE.test(codeOf(f)));
test(
  'production-hygiene: no `console.log` / `console.debug` / `debugger` in shipped source',
  withDebug.length === 0,
  withDebug.map(rel).join(', ')
);

/* ── B: placeholder markers ────────────────────────────────────────────────── */
const TODO_RE = /\b(TODO|FIXME)\b/;
const withTodo = files.filter((f) => TODO_RE.test(codeOf(f)));
test(
  'production-hygiene: no `TODO` / `FIXME` in shipped source',
  withTodo.length === 0,
  withTodo.map(rel).join(', ')
);

/* ── C: dev-only hosts, with a DECLARED allowlist ──────────────────────────── */
const DEV_HOST_RE = /\b(localhost|127\.0\.0\.1)\b/;
/* The ONLY files allowed to carry a dev host, each with its reason. These are the
   DEFAULT URLs of integrations that are PARKED by decision (Postiz admin panel,
   Usertour) — a placeholder default, never a production endpoint. */
const DEV_HOST_ALLOWED = new Map([
  ['src/integrations/registry.ts', 'parked-integration placeholder defaults (Postiz :8100, Usertour :8090)'],
  ['src/components/admin/PostizAdminPanel.tsx', 'parked integration (Postiz) default URL'],
  ['src/lib/usertour/useUsertour.ts', 'parked integration (Usertour) default URL'],
]);
const withDevHost = files.filter((f) => DEV_HOST_RE.test(codeOf(f)));
const undeclaredHosts = withDevHost.filter((f) => !DEV_HOST_ALLOWED.has(rel(f)));
test(
  'production-hygiene: no undeclared dev-only host (`localhost` / `127.0.0.1`) in shipped source',
  undeclaredHosts.length === 0,
  undeclaredHosts.map(rel).join(', ')
);

console.log('');
console.log(`PRODUCTION_HYGIENE_${failures ? 'FAIL' : 'PASS'} — ${checks - failures}/${checks} assertions`);
if (failures > 0) process.exit(1);
