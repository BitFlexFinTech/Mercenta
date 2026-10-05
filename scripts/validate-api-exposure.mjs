/**
 * §PHASE 15 — API-EXPOSURE & SECRET-EXPOSURE AUDIT (security launch gate).
 *
 * WHY THIS EXISTS
 * ---------------
 * The `phase15-security` gate declares its scope as including an
 * "API exposure audit" and "authentication security", but nothing asserted them:
 * the gate only checked `.gitignore`, the `.htaccess` headers and the presence of
 * the RBAC/RLS gates. This validator makes the browser-facing exposure surface
 * into a MACHINE-CHECKED invariant.
 *
 * WHAT IT ASSERTS (over the SHIPPED client source, `src/**\/*.ts(x)`)
 * ----------------------------------------------------------------
 *   A. NO non-`VITE_` `import.meta.env` read. Vite exposes ONLY `VITE_`-prefixed
 *      vars to the browser, so a non-prefixed read is either dead code or an
 *      intent to leak a secret into the bundle. (The `xeroClient` defect this
 *      gate was built for: it fell back to `XERO_ACCESS_TOKEN` / `XERO_TENANT_ID`.)
 *   B. EVERY `VITE_` var read is on a DECLARED browser-safe allowlist, so a new
 *      (possibly secret) var cannot silently start shipping to the client. The
 *      demo-only keys are declared AS demo-only.
 *   C. NO obvious secret literal (Stripe/OpenAI/AWS/GitHub/Slack/Google-style
 *      keys) in shipped source.
 *   D. Authentication security is pinned to REAL gates, not prose: the RBAC owner
 *      and the tenant-isolation and RLS gates must exist.
 *
 * Comments are STRIPPED before scanning, so this gate reads CODE, not prose.
 *
 * Usage: node scripts/validate-api-exposure.mjs  (exit 1 on any failure)
 */
import { readFileSync, readdirSync, existsSync } from 'node:fs';
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

/** Strip block and line comments so a gate never mistakes prose for code.
 *  The line-comment rule requires `//` NOT preceded by `:`, so `https://…` survives. */
const stripComments = (code) =>
  code.replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|[^:])\/\/[^\n]*/g, '$1');

const files = readdirSync(SRC, { recursive: true })
  .filter((f) => typeof f === 'string' && /\.(ts|tsx)$/.test(f))
  .map((f) => join(SRC, f));
const rel = (p) => p.replace(ROOT, '');

/* Vite built-ins — always present, never secrets. */
const VITE_BUILTINS = new Set(['DEV', 'PROD', 'MODE', 'BASE_URL', 'SSR']);

/* The DECLARED browser-safe env vars. Adding a new `VITE_` var read anywhere in
   `src/` without adding it here FAILS the gate — that is the point. */
const BROWSER_SAFE = new Map([
  ['VITE_SUPABASE_URL', 'the project URL (public)'],
  ['VITE_SUPABASE_ANON_KEY', 'the RLS-bound anon key — browser-safe by design; RLS is the guard, not secrecy'],
  ['VITE_XERO_CLIENT_ID', 'a public OAuth client id (not a secret)'],
  ['VITE_SENTRY_DSN', 'a public error-reporting DSN (write-only)'],
  ['VITE_RAKAZO_URL', 'a URL'],
  ['VITE_OPENROUTER_API_KEY', 'DEMO-ONLY — must never hold a production key'],
  ['VITE_HUNTER_API_KEY', 'DEMO-ONLY — must never hold a production key'],
  ['VITE_INSTANTLY_API_KEY', 'DEMO-ONLY — must never hold a production key'],
]);

/* ── A + B: env reads ──────────────────────────────────────────────────────── */
const envReads = [];
for (const f of files) {
  const code = stripComments(readFileSync(f, 'utf8'));
  const re = /import\.meta\.env\.([A-Z][A-Z0-9_]*)/g;
  let m;
  while ((m = re.exec(code)) !== null) {
    if (VITE_BUILTINS.has(m[1])) continue;
    envReads.push({ file: rel(f), name: m[1] });
  }
}

const nonVite = envReads.filter((e) => !e.name.startsWith('VITE_'));
test(
  'api-exposure: NO non-`VITE_` env read in shipped source (the browser can only read `VITE_` vars)',
  nonVite.length === 0,
  nonVite.map((e) => `${e.file}: ${e.name}`).join(', ')
);

const undeclared = [...new Set(envReads.filter((e) => e.name.startsWith('VITE_')).map((e) => e.name))]
  .filter((n) => !BROWSER_SAFE.has(n));
test(
  'api-exposure: every `VITE_` var read is DECLARED browser-safe (a new one cannot ship silently)',
  undeclared.length === 0,
  undeclared.join(', ')
);

/* ── C: secret literals ────────────────────────────────────────────────────── */
const SECRET_RE = /(sk-[A-Za-z0-9]{20,}|AKIA[0-9A-Z]{16}|xox[baprs]-[A-Za-z0-9-]{10,}|ghp_[A-Za-z0-9]{36}|AIza[0-9A-Za-z_-]{35})/;
const withLiteral = files.filter((f) => SECRET_RE.test(stripComments(readFileSync(f, 'utf8'))));
test(
  'api-exposure: no secret-looking literal in shipped source',
  withLiteral.length === 0,
  withLiteral.map(rel).join(', ')
);

/* ── D: authentication security is pinned to real gates ────────────────────── */
test('api-exposure: RBAC owner exists (authentication security)', existsSync(join(ROOT, 'src/lib/auth/rbac.ts')));
test('api-exposure: tenant-isolation gate exists', existsSync(join(ROOT, 'scripts/validate-tenant-coherence.mjs')));
test('api-exposure: RLS-hardening gate exists', existsSync(join(ROOT, 'scripts/validate-rls-hardening.mjs')));
test('api-exposure: RLS audit exists (every schema table is RLS-protected)', existsSync(join(ROOT, 'scripts/rls-audit.mjs')));

console.log('');
console.log(`API_EXPOSURE_${failures ? 'FAIL' : 'PASS'} — ${checks - failures}/${checks} assertions`);
if (failures > 0) process.exit(1);
