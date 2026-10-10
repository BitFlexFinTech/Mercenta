/**
 * §BATCH 4 (2026-10-10) — THE MERCENTA BRAIN REMOVAL: registry + catalogue reconciliation.
 *
 * IDEMPOTENT. Reconciles the project-state sources after the owner instructed the
 * Mercenta Brain's COMPLETE removal (§BATCH 4 of
 * `docs/NEXT_BUILD_PLAN_2026-10-10.md`, Part 2.5). It:
 *   1. marks every Brain CAPABILITY row `removed`, with the removal record as its evidence;
 *   2. repoints rows that merely CITED the Brain but whose capability survives (so no
 *      ACTIVE row keeps citing a deleted file — asserted by
 *      `scripts/validate-mercenta-brain.mjs` A14);
 *   3. deletes the eleven `op-brain-*` scenario rows (the surface they enumerated is gone)
 *      and leaves the auto-seeded `spec-mercenta-brain` row in place;
 *   4. recomputes `_meta.status_counts` FROM THE ENTRIES THEMSELVES.
 *
 * Run: node scripts/reconcile-mercenta-brain-removal-registry.cjs
 *      (then: npm run catalogue:e2e  — regenerates the projected matrix document)
 */
const fs = require('fs');

const REG = 'requirements-registry.json';
const CATALOGUE = 'docs/scenario-catalogue.json';
const DATE = '2026-10-10';

const REMOVAL_EVIDENCE =
  'REMOVED 2026-10-10 (§BATCH 4 of docs/NEXT_BUILD_PLAN_2026-10-10.md, owner directive: the Mercenta Brain "serves no purpose"). Deleted: src/components/admin/MercentaBrain.tsx; src/components/shared/brain/ (BrainCanvas, BrainCanvas3D, BrainScene); src/lib/intelligence/brain/ (buildGraph, layout, layout3d, project, types); src/components/brand/BrandRelationshipMap.tsx; src/lib/hooks/useWebglPalette.ts; src/lib/hooks/usePrefersReducedMotion.ts; scripts/brain-runtime-check.ts. ABSENCE guarded by scripts/validate-mercenta-brain.mjs (the contract validator REWRITTEN into an absence guard, rule 08) + e2e/mercenta-brain.spec.ts + scripts/validate-canonical-propagation.mjs (S4/R2) + scripts/verify-live-demo.mjs (L26).';

/** Brain CAPABILITY rows — the capability itself is gone. */
const REMOVED_ROWS = [
  ['uiux-wave4-brain-3d', 'the 3D Brain renderer'],
  ['mercenta-brain-entity-model', 'the Brain entity model'],
  ['mercenta-brain-relationship-model', 'the Brain relationship model'],
  ['mercenta-brain-provenance-and-epistemic-honesty', 'the Brain provenance / epistemic-honesty model'],
  ['mercenta-brain-surface', 'the Brain admin surface'],
  ['brand-intelligence-relationship-map', 'the brand relationship graph'],
  ['mercenta-brain-contract-gate', 'the Brain contract gate'],
  ['brain-dynamic-projection', 'the Brain dynamic projection'],
  ['m12-wording-brand-brain-fix', 'the brand-scoped Brain retail-channel wording fix'],
];

/** Rows whose capability SURVIVES but whose evidence cited the Brain. */
const EVIDENCE_PATCHES = [
  ['discovered-adminshell-chunk-size',
    '(incl. the heaviest, AdminDashboard + MercentaBrain)',
    '(incl. the heaviest, AdminDashboard — §BATCH 4 removed the former second heavy panel, MercentaBrain)'],
  ['redesign-one-workspace-system',
    'repointed consumers AdminDashboard/LogisticsHub/MercentaBrain;',
    'repointed consumers AdminDashboard/LogisticsHub (§BATCH 4 later removed the former consumer MercentaBrain);'],
  ['redesign-one-workspace-system',
    'e2e/mercenta-brain.spec.ts + e2e/logistics-hub-map.spec.ts',
    'e2e/logistics-hub-map.spec.ts'],
  ['logistics-map-dynamic-projection',
    'e2e/canonical-propagation.spec.ts tests 1 and 2 (EXECUTED: admin legs grow 3 → 5 after the canonical lifecycle; the owning brand hub shows the new PO; the other tenant does not);',
    'e2e/canonical-propagation.spec.ts tests 1 and 2 (REPOINTED by §BATCH 3/§BATCH 4 to the canonical consignment list the map\'s removal left behind: the brand hub\'s "consignments in scope" count grows after the canonical lifecycle; the owning brand shows the new PO; the other tenant does not);'],
];

/* ── catalogue: remove the Brain scenario rows ─────────────────────────────── */
const catalogue = JSON.parse(fs.readFileSync(CATALOGUE, 'utf8'));
const before = catalogue.scenarios.length;
catalogue.scenarios = catalogue.scenarios.filter((s) => !/^op-brain-/.test(s.id));
const removedScenarios = before - catalogue.scenarios.length;
fs.writeFileSync(CATALOGUE, JSON.stringify(catalogue, null, 2) + '\n');
console.log(`catalogue: removed ${removedScenarios} op-brain-* scenario rows (${before} -> ${catalogue.scenarios.length})`);

/** Rows whose evidence is a long claim that must be rewritten in full. */
const EVIDENCE_REPLACEMENTS = [
  ['batch3c-part2b-functional-parity-gate',
    'scripts/validate-functional-parity.mjs (npm run validate:functional-parity; F1 pins react-hooks rules-of-hooks + exhaustive-deps at ERROR and the plugin dependency; F2 dataset-consumer assertions; F3 named components implement their capability inline AND never redirect; F4 no dead metric band + §BATCH4 the removed Brain surfaces stay removed + the audited tiles keep their drill-down + the metric primitive renders a real button). REPOINTED 2026-10-10: the F4b Brain KPI-band assertions became an ABSENCE guard and the L26 live probe (scripts/verify-live-demo.mjs) became a live Brain-absence probe when the Mercenta Brain was removed by owner instruction (§BATCH 4). Browser: e2e/mercenta-brain.spec.ts (REWRITTEN as the absence guard). The Brain KPI-band surface the phase originally fixed is now DELETED.'],
  ['editor-typecheck-gap-e2e-and-functions',
    'Fixed 2026-10-04. `npm run typecheck` = 0 across ALL FOUR projects (app + node + e2e + functions; was src-only). The new coverage found and FIXED ~30 real latent defects in 9 e2e specs (a wrong Playwright `exact` option in multi-tenant.spec.ts; a double-prefixed KPI selector in uiux-foundation.spec.ts that made a test UNABLE TO FAIL; ~28 strict-DOM / union-narrowing issues) and 4 in the then-stray Brain runtime harness under scripts/. REPOINTED 2026-10-10 (§BATCH 4): that harness was DELETED with the Mercenta Brain it exercised, so the tooling project no longer includes it and `scripts/validate-typecheck-coverage.mjs` now asserts its ABSENCE instead. The coverage gate itself is unchanged in force.'],
  ['e2e-coverage-operations-domain',
    '`docs/scenario-catalogue.json` — the `operations` domain holds 50 enumerated `op-*` traceable rows reaching the live specs. §BATCH 4 (2026-10-10) REMOVED the eleven `op-brain-*` rows with the Mercenta Brain they enumerated; the remaining enumerated set is still traceable and `scripts/validate-e2e-scenarios.mjs` passes, with the projected doc regenerated by `npm run catalogue:e2e`.'],
];

/* ── registry: mark removed rows, repoint citations, recompute counts ──────── */
const reg = JSON.parse(fs.readFileSync(REG, 'utf8'));
const byId = (id) => reg.entries.find((e) => e.id === id);

for (const [id, label] of REMOVED_ROWS) {
  const e = byId(id);
  if (!e) { console.warn(`  ! row not found: ${id}`); continue; }
  e.status = 'removed';
  /* idempotent: never stack the removal prefix on a row already reconciled */
  if (!String(e.description).startsWith('§BATCH 4')) {
    e.description = `§BATCH 4 (2026-10-10) — REMOVED with the Mercenta Brain (${label}). Was: ${String(e.description).slice(0, 300)}`;
  }
  e.evidence = REMOVAL_EVIDENCE;
  e.last_verified = DATE;
  e.superseded_by = null;
}
console.log(`registry: ${REMOVED_ROWS.length} Brain capability rows marked removed`);

for (const [id, from, to] of EVIDENCE_PATCHES) {
  const e = byId(id);
  if (!e) { console.warn(`  ! row not found: ${id}`); continue; }
  if (!String(e.evidence).includes(from)) { console.warn(`  ! patch target missing in ${id}`); continue; }
  e.evidence = String(e.evidence).replace(from, to);
  e.last_verified = DATE;
}
console.log(`registry: ${EVIDENCE_PATCHES.length} evidence citations repointed`);

for (const [id, evidence] of EVIDENCE_REPLACEMENTS) {
  const e = byId(id);
  if (!e) { console.warn(`  ! row not found: ${id}`); continue; }
  e.evidence = evidence;
  e.last_verified = DATE;
}
console.log(`registry: ${EVIDENCE_REPLACEMENTS.length} evidence blocks rewritten`);

/* the status enum must be honest about every status in use (rule 07) */
for (const s of ['removed', 'complete']) {
  if (!reg._meta.status_enum.includes(s)) reg._meta.status_enum.push(s);
}

/* recompute the snapshot FROM THE ENTRIES THEMSELVES */
const counts = {};
for (const e of reg.entries) counts[e.status] = (counts[e.status] ?? 0) + 1;
const summary = Object.entries(counts).map(([k, v]) => `${k}:${v}`).join(', ');
reg._meta.status_counts = {
  _note: `Recomputed ${DATE} after §BATCH 4 (the Mercenta Brain removal). Snapshot only, derived from the entries: ${summary}.`,
  ...counts,
};
reg._meta.total_entries = reg.entries.length;
reg._meta.last_updated = DATE;
fs.writeFileSync(REG, JSON.stringify(reg, null, 2) + '\n');
console.log(`registry: status_counts recomputed (${summary}); total_entries ${reg._meta.total_entries}`);
