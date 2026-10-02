// §P4 — DEAD CODE — the dead-code gate.
//
// WHY THIS EXISTS
// ---------------
// `docs/CLEANUP_AND_VERIFICATION_PLAN_2026-09-30.md` §3 P4 requires that the
// unreferenced source files named in §1.5 be removed and that a real gate
// prevents dead litter from creeping back. A typecheck and a build BOTH pass
// cleanly on a module nothing imports — Vite only bundles what is reachable
// from the entry point, so an orphan module is simply never compiled, never
// errors, and never appears in any test that only loads reachable code. Only an
// explicit reference scan catches it.
//
// THE DEFINITION OF "DEAD" (deliberately narrow, so it cannot delete live code)
// ----------------------------------------------------------------------------
// A file X under `src/` is DEAD when NO OTHER file anywhere in the repository
// imports it — i.e. no quoted module specifier resolves to X. The scan reads
// every `.ts/.tsx/.mjs/.js/.cjs/.html/.json` file under `src/`, `scripts/`,
// `e2e/`, `supabase/`, and the repo root, and looks for a QUOTED specifier that
// ends in the file's own basename (`.../foo`, `.../foo.ts`, `./foo`, `@/…/foo`).
//
// Two deliberate rules make this safe:
//
//   R3 (the plan's own risk) — TESTS AND TOOLING COUNT. A reference from a
//       `scripts/validate-*.mjs` validator (e.g. `ssrLoadModule('…/resellerTracker.ts')`)
//       is a real reference, so a module that only a validator loads is NOT dead
//       and must never be deleted (deleting it would break that validator).
//   DOC MENTIONS DO NOT COUNT. A filename written inside prose or a JSON
//       evidence string is not an import — a registry row that merely NAMES a
//       file does not keep it alive. (The quoted-specifier rule naturally ignores
//       those, because the character after `.ts` is `;`, ` ` or `)`.)
//
// `.d.ts` ambient declaration files are EXCLUDED: they are type-only and are
// legitimately never imported. The entry point is NOT special-cased — it is
// imported by name from `index.html`, which the scan reads.
//
// The gate passes when the candidate list is EMPTY (the plan's acceptance
// criterion). Every mutation-sensitive assertion here was PROVED ABLE TO FAIL in
// the session that added it (a synthetic orphan file made the gate fail; it was
// then removed, leaving the tree byte-identical).
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { join, relative } from 'node:path';

let failures = 0;
let checks = 0;
const test = (name, ok, detail) => {
  checks++;
  console.log(`${ok ? '✓' : '✗'} ${name}`);
  if (!ok) {
    failures++;
    if (detail !== undefined) console.log(`      ${String(detail).slice(0, 800)}`);
  }
};

const ROOT = fileURLToPath(new URL('..', import.meta.url));
const SRC = join(ROOT, 'src');
// This gate names the removed files in its own P4_REMOVED list; those quoted
// strings must never count as references to the files they pin, or the gate
// would exonerate exactly the litter it exists to catch.
const SELF = fileURLToPath(import.meta.url);

/** Files the scan READS (to find import specifiers). */
const READ_DIRS = ['src', 'scripts', 'e2e', 'supabase'];
const READ_ROOT_EXT = /\.(ts|tsx|mjs|js|cjs|html|json)$/;

function walk(dir, ext, out = []) {
  let entries;
  try { entries = readdirSync(dir); } catch { return out; }
  for (const entry of entries) {
    if (entry === 'node_modules' || entry === 'dist' || entry === '.git') continue;
    const p = join(dir, entry);
    const s = statSync(p);
    if (s.isDirectory()) walk(p, ext, out);
    else if (ext.test(entry)) out.push(p);
  }
  return out;
}

/** Every candidate source file (`.ts`/`.tsx`, NOT `.d.ts`). */
const candidates = walk(SRC, /\.(ts|tsx)$/).filter((f) => !f.endsWith('.d.ts'));

/** Every file the scan reads for specifiers. */
const readers = [];
for (const d of READ_DIRS) readers.push(...walk(join(ROOT, d), READ_ROOT_EXT));
for (const entry of readdirSync(ROOT)) {
  if (READ_ROOT_EXT.test(entry) && statSync(join(ROOT, entry)).isFile()) readers.push(join(ROOT, entry));
}

/**
 * Pull every MODULE SPECIFIER out of a reader — i.e. every quoted path that
 * sits in an IMPORT context (`from '…'`, `import('…')`, `require('…')`,
 * `ssrLoadModule('…')`, a side-effect `import '…'`) or a Vite HTML entry
 * (`<script src="…">`). A path merely WRITTEN somewhere (a scope-guard list, a
 * registry evidence string, a comment) is NOT a specifier and must not keep a
 * file alive — that is exactly the false-negative that would let dead litter
 * hide behind a mention of its own name.
 */
function specifiersIn(txt) {
  const out = [];
  const push = (re) => { let m; while ((m = re.exec(txt))) out.push(m[1]); };
  push(/\bfrom\s*['"`]([^'"`\n]+)['"`]/g);
  push(/\bimport\s+['"`]([^'"`\n]+)['"`]/g);
  push(/\bimport\s*\(\s*['"`]([^'"`\n]+)['"`]/g);
  push(/\brequire\s*\(\s*['"`]([^'"`\n]+)['"`]/g);
  push(/ssrLoadModule\s*\(\s*['"`]([^'"`\n]+)['"`]/g);
  push(/<script\b[^>]*\bsrc\s*=\s*['"`]([^'"`\n]+)['"`]/g);
  return out;
}

/**
 * A file is REFERENCED when some reader (that is not the file itself) imports it
 * through a specifier that resolves to the file.
 */
function isReferenced(target, readersList) {
  const rel = relative(ROOT, target);
  const relNoExt = rel.replace(/\.tsx?$/, '');
  const base = target.split('/').pop().replace(/\.tsx?$/, '');
  for (const r of readersList) {
    if (r === target || r === SELF) continue;
    let txt;
    try { txt = readFileSync(r, 'utf8'); } catch { continue; }
    for (const spec of specifiersIn(txt)) {
      const s = spec.split(/[?#]/)[0];
      if (s === rel || s === relNoExt || s === '@/' + relNoExt || s === '@/' + rel) return relative(ROOT, r);
      if (s.endsWith('/' + rel) || s.endsWith('/' + relNoExt)) return relative(ROOT, r);
      if (s === './' + base || s === base) return relative(ROOT, r);
      if (s.endsWith('/' + base) || s.endsWith('/' + base + '.ts') || s.endsWith('/' + base + '.tsx')) return relative(ROOT, r);
    }
  }
  return null;
}

// ── DC0 — scan sanity ────────────────────────────────────────────────────────
test('DC0 scan is not silently empty (found the source tree)', candidates.length > 100,
  `candidates=${candidates.length}`);
test('DC0 scan reads more than the source tree (tests/tooling included, per plan risk R3)',
  readers.length > candidates.length, `readers=${readers.length}`);

/**
 * DECLARED-UNWIRED ALLOWLIST — the FEW files that are deliberately NOT imported
 * and are kept anyway, each with the reason it is a decision rather than litter.
 * The dead-code gate must name them explicitly (and DC5 proves they are still
 * present and still unreferenced) so a declared exception can never silently rot
 * into an undeclared one — or grow.
 */
const DECLARED_UNWIRED = new Map([
  ['src/lib/discovery/firecrawlClient.ts',
    'The Firecrawl web-crawl SEAM (Mock*/Real* behind the registry row ' +
    'integration-audit-firecrawl-provenance, a documented CONTROLLED LIVE CANDIDATE). ' +
    'Its only importer was the unreached glue `firecrawlResearch.ts`, which P4 removed; ' +
    'removing the SEAM itself is a FEATURE decision deferred to P5/D2, so the seam stays, ' +
    'declared here until it is either wired to a product surface or removed by the owner.'],
]);

// ── DC1 — no undeclared unreferenced source file (the plan's "0 candidates") ──
const dead = [];
for (const f of candidates) {
  const rel = relative(ROOT, f);
  if (DECLARED_UNWIRED.has(rel)) continue;
  if (!isReferenced(f, readers)) dead.push(rel);
}
test('DC1 no UNDECLARED unreferenced source file under src/ (0 dead-code candidates)',
  dead.length === 0,
  dead.length ? `dead candidates:\n        - ${dead.join('\n        - ')}` : undefined);

// ── DC2 — the P4-removed files stay removed (the fixed defect cannot return) ──
// These were the unreferenced files P4 deleted. If either is re-added as an
// orphan, DC1 already fails — this pins the SPECIFIC names so an accidental
// re-introduction is named explicitly.
const P4_REMOVED = [
  'src/lib/research/dailyReport.ts',
  'src/lib/discovery/firecrawlResearch.ts',
];
for (const rel of P4_REMOVED) {
  let exists = true;
  try { statSync(join(ROOT, rel)); } catch { exists = false; }
  test(`DC2 P4-removed file is gone: ${rel}`, !exists);
}

// ── DC3 — the entry point is detected through index.html (proves the scan reads HTML) ──
test('DC3 the entry point src/main.tsx is detected as referenced (index.html is read)',
  isReferenced(join(SRC, 'main.tsx'), readers) !== null);

// ── DC4 — no unresolved TODO/FIXME STUB in src/ (a dead stub is dead code) ────
// P4 resolved the LAST remaining `TODO` in all of `src/` (the `src/data/api.ts`
// ASN auto-push stub). The zero-placeholder rule means a `TODO`/`FIXME` marker in
// shipped source marks unfinished work that renders as if done. `XXX` is NOT
// flagged — it occurs legitimately inside mock id literals (`mock:sub-XXXX`).
const stubs = [];
for (const f of candidates) {
  const txt = readFileSync(f, 'utf8');
  txt.split('\n').forEach((line, i) => {
    if (/\b(TODO|FIXME)\b/.test(line)) stubs.push(`${relative(ROOT, f)}:${i + 1}`);
  });
}
test('DC4 no unresolved TODO/FIXME stub in src/ (the P4 stub is resolved)',
  stubs.length === 0,
  stubs.length ? `stubs:\n        - ${stubs.join('\n        - ')}` : undefined);

// ── DC5 — the declared-unwired allowlist cannot rot ──────────────────────────
// Every declared exception must STILL exist and STILL be unreferenced. If it were
// wired up, the entry is stale and must be removed; if it were deleted, the entry
// is a phantom. Either way the declaration must be corrected, not ignored.
for (const [rel, reason] of DECLARED_UNWIRED) {
  const abs = join(ROOT, rel);
  let exists = true;
  try { statSync(abs); } catch { exists = false; }
  test(`DC5 declared-unwired file still exists: ${rel}`, exists, reason);
  test(`DC5 declared-unwired file is still genuinely unreferenced: ${rel}`,
    exists && isReferenced(abs, readers) === null, reason);
}

console.log(`\nDEAD_CODE_VALIDATION ${failures === 0 ? 'PASS' : 'FAIL'} (${checks - failures}/${checks} checks)`);
process.exit(failures > 0 ? 1 : 0);

