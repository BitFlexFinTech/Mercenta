#!/usr/bin/env node
/**
 * §BATCH 4 (2026-10-10) — THE MERCENTA BRAIN ABSENCE GUARD.
 *
 * REWRITTEN, NOT DELETED (global rule 08 — removal coherence). This file used to
 * be the Brain's CONTRACT validator: it asserted the entity/relationship
 * catalogue existed, that tenant isolation held in the builder, that the
 * epistemic four-state model was not collapsed, and it EXECUTED
 * `scripts/brain-runtime-check.ts` against the real domain stores.
 *
 * The owner instructed the Mercenta Brain's complete removal ("it serves no
 * purpose"), so the thing this gate ASSERTED no longer exists. Per rule 08 the
 * check is not deleted and not weakened — it is REPOINTED to prove the ABSENCE:
 * the surface, its graph modules, its renderers, its two dedicated hooks and its
 * runtime harness are all GONE, and nothing in the product reaches them. This
 * gate FAILS if any part of the Brain returns.
 *
 * It is deliberately still called `validate-mercenta-brain.mjs` and still
 * registered as `npm run validate:brain`, and it is swept by the standard
 * command (`scripts/validate-all.sh` globs every `scripts/validate-*.mjs`), so
 * the removal is verified on every ordinary check rather than by a one-off
 * script nobody runs again.
 *
 * Deterministic, no browser, no network, no clock.
 *
 * Run: node scripts/validate-mercenta-brain.mjs
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

let pass = 0;
let fail = 0;
const errors = [];

function check(name, ok, detail = '') {
  if (ok) pass++;
  else {
    fail++;
    errors.push(`${name}${detail ? ` — ${detail}` : ''}`);
  }
}

const abs = (rel) => path.join(ROOT, rel);
const exists = (rel) => fs.existsSync(abs(rel));
const read = (rel) => fs.readFileSync(abs(rel), 'utf8');

/**
 * Strip comments before scanning. MANDATORY here: this removal REQUIRES an
 * inline `§BATCH 4 — REMOVED` record at every site (rule 08), and those comments
 * necessarily name the surface that was removed. A naive scan would fail on the
 * historical record itself. (This is the same reason the original validator
 * stripped comments — a gate that fails on its own documentation is a broken
 * gate.)
 */
function code(src) {
  return src
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .split('\n')
    .filter((line) => !line.trim().startsWith('//'))
    .join('\n');
}

/** Every `.ts`/`.tsx` file under a directory (recursive). */
function walkTs(dir, out = []) {
  const start = abs(dir);
  if (!fs.existsSync(start)) return out;
  for (const entry of fs.readdirSync(start, { withFileTypes: true })) {
    const p = path.join(dir, entry.name);
    if (entry.isDirectory()) walkTs(p, out);
    else if (/\.tsx?$/.test(entry.name)) out.push(p);
  }
  return out;
}

/* ── A1–A6 — every part of the Brain is DELETED ────────────────────────────── */

check('§BATCH4 the Brain surface is DELETED (src/components/admin/MercentaBrain.tsx)',
  !exists('src/components/admin/MercentaBrain.tsx'));
check('§BATCH4 the Brain renderers are DELETED (src/components/shared/brain/)',
  walkTs('src/components/shared/brain').length === 0);
check('§BATCH4 the Brain graph modules are DELETED (src/lib/intelligence/brain/)',
  walkTs('src/lib/intelligence/brain').length === 0);
check('§BATCH4 the brand relationship graph is DELETED (src/components/brand/BrandRelationshipMap.tsx)',
  !exists('src/components/brand/BrandRelationshipMap.tsx'));
check('§BATCH4 the two Brain-only hooks are DELETED',
  !exists('src/lib/hooks/useWebglPalette.ts') && !exists('src/lib/hooks/usePrefersReducedMotion.ts'));
check('§BATCH4 the Brain runtime harness is DELETED (scripts/brain-runtime-check.ts)',
  !exists('scripts/brain-runtime-check.ts'));

/* ── A7 — NO live source mentions the Brain at all ─────────────────────────── */

const srcFiles = walkTs('src');
const liveHits = [];
for (const f of srcFiles) {
  const body = code(read(f));
  if (/\bbrain\b/i.test(body)) liveHits.push(path.relative(ROOT, f));
}
check('§BATCH4 no live source file under src/ mentions the Brain (comments excluded)',
  liveHits.length === 0, liveHits.join(', '));

/* ── A8 — no file imports a removed Brain module ───────────────────────────── */

const REMOVED_SPECIFIERS = /(intelligence\/brain|shared\/brain|BrainCanvas|BrainScene|MercentaBrain|BrandRelationshipMap|useWebglPalette|usePrefersReducedMotion)/;
const importHits = [];
for (const f of [...srcFiles, ...walkTs('e2e'), ...walkTs('scripts')]) {
  const body = code(read(f));
  const specifiers = [
    ...body.matchAll(/\bfrom\s*['"`]([^'"`\n]+)['"`]/g),
    ...body.matchAll(/\bimport\s*\(\s*['"`]([^'"`\n]+)['"`]/g),
  ].map((m) => m[1]);
  if (specifiers.some((s) => REMOVED_SPECIFIERS.test(s))) importHits.push(path.relative(ROOT, f));
}
check('§BATCH4 no file imports a removed Brain module',
  importHits.length === 0, importHits.join(', '));

/* ── A9 — the admin shell declares no Brain destination ────────────────────── */

const adminShell = read('src/components/layout/AdminShell.tsx');
const adminShellCode = code(adminShell);
check("§BATCH4 the admin shell declares NO 'brain' nav item",
  !/id:\s*'brain'/.test(adminShellCode));
check('§BATCH4 the admin shell holds NO brain render branch',
  !/[a-zA-Z_]*[vV]iew\s*===\s*'brain'/.test(adminShellCode));
check('§BATCH4 the admin shell no longer names the Brain breadcrumb',
  !/brain\s*:\s*'/.test(adminShellCode));
check('§BATCH4 the Super-Admin allowlist no longer hides a brain destination',
  !/'brain'/.test(adminShellCode));

/* ── A10 — the brand shell keeps no relationship-graph mount ───────────────── */

const bi = code(read('src/components/brand/BrandIntelligence.tsx'));
check('§BATCH4 Brand Intelligence no longer imports or mounts the relationship graph',
  !/BrandRelationshipMap/.test(bi));

/* ── A11 — the removed address resolves to the default view, not a blank page ──
 * `ADMIN_VIEW_IDS` is DERIVED from `ADMIN_SECTIONS`; with no 'brain' item the
 * segment is refused by `resolveProductView` and falls back to the default view.
 * This asserts the derivation is still the shell's own declared nav set, so the
 * guarantee cannot be silently broken by hardcoding a view list. */
check('§BATCH4 ADMIN_VIEW_IDS is derived from the declared nav sections',
  /const ADMIN_VIEW_IDS[^=]*=\s*ADMIN_SECTIONS\.flatMap/.test(adminShellCode));

/* ── A12 — no e2e spec DRIVES the removed Brain testids (outside its guardian) ──
 * The dedicated absence spec and a negative assertion may NAME the removed
 * testids (that is how they prove they never appear), but no other spec may
 * WAIT FOR, CLICK or otherwise DRIVE one — that is what would mean the surface had
 * returned and a browser test still depended on it. */
const POSITIVE_USE = /(?:getByTestId|locator)\(\s*[`'"][^`'"\n]*brain-[^`'"\n]*[`'"]\s*\)[^\n]*(?:waitFor|toBeVisible|\.click\(|\.first\(\))/;
const e2eHits = [];
for (const f of walkTs('e2e')) {
  const rel = path.relative(ROOT, f);
  if (rel === 'e2e/mercenta-brain.spec.ts') continue;
  const body = code(read(f));
  if (POSITIVE_USE.test(body)) e2eHits.push(rel);
}
check('§BATCH4 no other e2e spec drives a removed Brain testid',
  e2eHits.length === 0, e2eHits.join(', '));

/* ── A13 — the old reconcile tool can no longer re-introduce the rows ───────── */

const reconcile = read('scripts/reconcile-mercenta-brain-registry.cjs');
check('§BATCH4 the Brain registry reconcile tool is NEUTRALISED (refuses by default)',
  /ALLOW_SUPERSEDED_MERCENTA_BRAIN_RECONCILE/.test(reconcile) &&
    /process\.exit\(1\)/.test(reconcile));

/* ── A14 — no ACTIVE registry row cites a deleted Brain file as evidence ────── */

const registry = JSON.parse(read('requirements-registry.json'));
const staleRows = registry.entries
  .filter((e) => e.status !== 'removed' && e.status !== 'deferred')
  .filter((e) =>
    /MercentaBrain\.tsx|BrandRelationshipMap\.tsx|shared\/brain\/|intelligence\/brain\/|useWebglPalette|brain-runtime-check\.ts/.test(
      String(e.evidence ?? '')
    )
  )
  .map((e) => `${e.id} (${e.status})`);
check('§BATCH4 no ACTIVE registry row cites a deleted Brain file as evidence',
  staleRows.length === 0, staleRows.join(', '));

/* ── A15 — this gate stays wired into the standard command ─────────────────── */

const pkg = JSON.parse(read('package.json'));
check('§BATCH4 the absence guard stays registered (npm run validate:brain)',
  pkg.scripts?.['validate:brain'] === 'node scripts/validate-mercenta-brain.mjs');

/* ── Report ─────────────────────────────────────────────────────────────── */

if (fail > 0) {
  console.error(`MERCENTA_BRAIN_ABSENCE_GUARD_FAIL (${fail} of ${pass + fail})`);
  for (const e of errors) console.error(`  ✗ ${e}`);
  process.exit(1);
}
console.log(`MERCENTA_BRAIN_ABSENCE_GUARD_PASS (${pass} assertions, the Brain is GONE, 0 network calls)`);


