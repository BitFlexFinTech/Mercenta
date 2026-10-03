/**
 * §BATCH 3c — THE BUILT-ROW EVIDENCE-INTEGRITY GATE.
 *
 * WHY THIS EXISTS
 * ---------------
 * The Master Matrix (`requirements-registry.json`) carries a `status` per row.
 * A row is `built` when the capability was implemented but never INDEPENDENTLY
 * re-verified (that enum — `built_and_tested` — additionally requires a browser
 * reference). Batch 3c is the page-by-page functional parity audit of the 126
 * `built` rows; this gate is its FIRST, mechanical half.
 *
 * The audit found the evidence of many `built` rows was STALE: it cited e2e
 * specs that had since been renamed/consolidated (e2e/admin-views.spec.ts,
 * e2e/brand-views.spec.ts, e2e/cross-role-po.spec.ts, …), files that had been
 * moved (ShippingCostEstimate.tsx lives in components/shared, not
 * components/shipping), and — in a few rows — files that NEVER existed in this
 * repository at all (`supabase/functions/_shared/rateLimit.ts`,
 * `supabase/functions/health-check/index.ts`,
 * `.clinerules/always-check-requirements-registry.md`,
 * `supabase/migrations/0018_freight_term_and_windows.sql`). A matrix whose own
 * evidence points at files that do not exist cannot be trusted to say what is
 * built.
 *
 * WHAT IT ASSERTS (deterministic, no network, no false positives)
 * --------------------------------------------------------------
 *   1. the registry parses and every entry carries a `status`;
 *   2. every `built` row has NON-EMPTY `evidence`;
 *   3. every file reference inside a `built` row's evidence RESOLVES to a file
 *      that exists in the repository — a bare filename is resolved by basename
 *      index (so `BrandSelfService.tsx` -> src/components/brand/…), a path with a
 *      directory is resolved as written;
 *   4. every `npm run validate:*` / `validate:*` reference is a REGISTERED
 *      package.json script;
 *   5. an intentional HISTORICAL mention ("… deleted", "… removed", "no longer
 *      exists", "orphaned") is allowed and not counted as a dead reference.
 *
 * A dead reference (rule 3/4 not met) FAILS the run — that is the point: the
 * registry's own evidence is now mechanically checkable, and drift fails the
 * corpus instead of quietly misleading a reader.
 */
import { readFileSync, readdirSync } from 'node:fs';
import { resolve, join } from 'node:path';

const ROOT = process.cwd();
const REGISTRY = resolve(ROOT, 'requirements-registry.json');

/* ── Build a file index: every relative path and every basename under the repo
 *    source trees. Ignores generated/junk dirs. */
const SKIP_DIRS = new Set([
  'node_modules', '.git', 'dist', 'build', 'coverage',
  'test-results', 'playwright-report', 'e2e-report',
  'test-screenshots', 'forensic-captures', 'Review Zip', '.cache', '.vite',
]);
const allPaths = new Set();
const byBasename = new Map();
function walk(dir, rel) {
  let entries;
  try { entries = readdirSync(dir, { withFileTypes: true }); } catch { return; }
  for (const e of entries) {
    if (SKIP_DIRS.has(e.name)) continue;
    const childRel = rel ? `${rel}/${e.name}` : e.name;
    const childAbs = join(dir, e.name);
    if (e.isDirectory()) walk(childAbs, childRel);
    else if (e.isFile()) {
      allPaths.add(childRel);
      if (!byBasename.has(e.name)) byBasename.set(e.name, []);
      byBasename.get(e.name).push(childRel);
    }
  }
}
walk(ROOT, '');

/* ── Load registry + package.json scripts */
let registry;
try { registry = JSON.parse(readFileSync(REGISTRY, 'utf8')); }
catch (e) { console.error('BUILT_ROWS_VALIDATION_FAIL — registry did not parse:', e.message); process.exit(1); }
const entries = registry.entries || [];
const pkg = JSON.parse(readFileSync(resolve(ROOT, 'package.json'), 'utf8'));
const registeredScripts = new Set(Object.keys(pkg.scripts || {}));

let pass = 0;
let fail = 0;
const dead = [];
function check(name, ok, detail) {
  if (ok) { pass++; } else { fail++; dead.push(detail ? `${name} — ${detail}` : name); }
}

/* ── Tokens that are citations of a repository file (needs a known extension). */
const FILE_TOKEN = /[\w][\w./-]*\.(tsx|ts|mjs|cjs|json|js|sql|md|yml|yaml|sh|py|html|css)/g;
const SCRIPT_TOKEN = /(?:npm run |run )?\b(validate:[a-z0-9-]+)\b/g;
/* A mention is HISTORICAL — and therefore not a dead reference — when the clause
 * around it records a removal rather than a live claim. */
const HISTORICAL = /(deleted|removed|no longer exists|no longer|never existed|never actually existed|was never|orphan)/i;

const KNOWN_PREFIXES = ['src/', 'e2e/', 'scripts/', 'docs/', 'supabase/', '.clinerules/', '.github/', 'deploy/', 'public/', 'Marketing/'];

function resolveToken(token) {
  /* A path WITH a directory: resolve as written (prefix must be known). */
  if (token.includes('/')) {
    if (token.startsWith('http')) return { ok: true, note: 'url' };
    if (KNOWN_PREFIXES.some((p) => token.startsWith(p))) {
      return allPaths.has(token)
        ? { ok: true }
        : { ok: false, detail: `missing path: ${token}` };
    }
    /* Not a repo path we track (e.g. supabase function URL fragments). */
    return { ok: true, note: 'external/relative-not-a-repo-file' };
  }
  /* A bare filename: resolve by basename anywhere in the repo. */
  const hits = byBasename.get(token);
  if (hits && hits.length > 0) return { ok: true, note: hits[0] };
  return { ok: false, detail: `bare filename not found anywhere: ${token}` };
}

/* Evidence-bearing rows: `built` AND `built_and_tested` — both cite implementation
 * evidence; both must resolve. (`removed` rows mention dead names as HISTORY.) */
const built = entries.filter((e) => e.status === 'built' || e.status === 'built_and_tested');
check(`the registry has ${built.length} evidence-bearing rows (built + built_and_tested)`, built.length > 0);

/* A hashed build-bundle filename (e.g. index-BSQXgh2W.js) is a BUILD OUTPUT, not a
 * source file — it is never present in the tracked tree and must not be flagged. */
const BUNDLE = /^(index|vendor|main|runtime|chunk|assets)-[A-Za-z0-9_]{4,}\.(js|css)$/;

let refsChecked = 0;
for (const row of built) {
  const ev = row.evidence || '';
  check(`row "${row.id}" has non-empty evidence`, ev.trim().length > 0);

  /* File references */
  for (const m of ev.matchAll(FILE_TOKEN)) {
    const token = m[0];
    if (BUNDLE.test(token)) continue;            // hashed build bundle, not source
    const around = ev.slice(Math.max(0, m.index - 60), m.index + token.length + 60);
    if (HISTORICAL.test(around)) continue;       // recorded removal, not a live claim
    if (/^MERCENTA_[A-Z_]+$/.test(token)) continue;
    const r = resolveToken(token);
    refsChecked++;
    check(`row "${row.id}" cites an existing file: ${token}`, r.ok, r.detail);
  }

  /* Registered-script references */
  for (const m of ev.matchAll(SCRIPT_TOKEN)) {
    const name = m[1];
    refsChecked++;
    check(`built row "${row.id}" names a registered script "${name}"`, registeredScripts.has(name),
      `unregistered script: ${name} (row ${row.id})`);
  }
}

console.log(`\nEVIDENCE-ROW INTEGRITY: ${built.length} evidence rows (built + built_and_tested) · ${refsChecked} references checked · ${pass} PASS / ${fail} FAIL`);
if (fail > 0) console.log(dead.map((d) => `  x ${d}`).join('\n'));
console.log(fail === 0 ? 'BUILT_ROWS_VALIDATION_PASS' : `BUILT_ROWS_VALIDATION_FAIL (${fail})`);
process.exit(fail === 0 ? 0 : 1);

