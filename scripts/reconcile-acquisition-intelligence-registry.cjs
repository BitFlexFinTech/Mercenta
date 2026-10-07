/*
 * §PHASE 10 — Acquisition intelligence at scale — registry reconciliation (2026-10-08).
 *
 * WHY. The row `phase10-acquisition-intelligence-scale` recorded that acquisition
 * intelligence must operate AT SCALE over the REAL research sources and must NEVER be
 * fabricated when no provider exists. THIS increment builds the ONE owner
 * (`src/config/acquisitionIntelligence.ts`) and the pure fail-closed resolver
 * (`src/lib/intelligence/acquisitionIntelligence.ts`), surfaces it on the Super-Admin
 * Founder Control Centre (Business view) and raises the row to `built`. No live research
 * provider is configured, so NO real signal is produced — the row records the WHAT and the
 * RULE; nothing is invented.
 *
 * Run: node scripts/reconcile-acquisition-intelligence-registry.cjs
 */
const fs = require('node:fs');
const path = require('node:path');

const REG = path.join(__dirname, '..', 'requirements-registry.json');
const reg = JSON.parse(fs.readFileSync(REG, 'utf8'));
const byId = new Map(reg.entries.map((e) => [e.id, e]));
const DATE = '2026-10-08';

const row = byId.get('phase10-acquisition-intelligence-scale');
if (!row) {
  console.error('MISSING ROW: phase10-acquisition-intelligence-scale');
  process.exit(1);
}

const OLD_STATUS = row.status;
const OLD_EVIDENCE = row.evidence;

row.status = 'built';
row.description =
  'Phase 10 — acquisition intelligence at scale over the REAL research sources (never ' +
  'fabricated when no provider exists). BUILT (2026-10-08): the ONE owner ' +
  '`src/config/acquisitionIntelligence.ts` declares the DIMENSIONS acquisition intelligence ' +
  'scales over (brand profile · product catalogue · demand signal · competition landscape · ' +
  'company register · decision-maker contact) and the RESEARCH SOURCES that may supply them, ' +
  'each REUSING a canonical integration-registry provider id (amazon_sp_api · keepa · ' +
  'firecrawl · companies_house · hunter · lead_sourcing — AI/openrouter is NOT a source). The ' +
  'pure resolver `src/lib/intelligence/acquisitionIntelligence.ts` applies ONE rule FAIL-CLOSED: ' +
  'a signal exists ONLY when it names a DECLARED source that SUPPLIES its dimension and whose ' +
  'provider is genuinely available — an unknown dimension, no source, an unknown source, a ' +
  'source that does not supply the dimension, and a signal with no available provider are ALL ' +
  'refused (never fabricated). Deterministic (no AI, no clock) and internal (Super-Admin only).';
row.evidence =
  'src/config/acquisitionIntelligence.ts (the ONE owner — the dimensions + the research ' +
  'sources, each REUSING a canonical integration provider); src/lib/intelligence/' +
  'acquisitionIntelligence.ts (the pure fail-closed resolver); src/lib/commandCentre/' +
  'controlCentre.ts (computes + exposes acquisitionIntelligence); src/components/admin/' +
  'FounderControlCentre.tsx (Business → Acquisition intelligence at scale, Super-Admin only); ' +
  'gate scripts/validate-acquisition-intelligence.mjs (npm run ' +
  'validate:acquisition-intelligence, 30 assertions, mutation-proved TWICE); ' +
  'e2e/founder-operating-system.spec.ts test 23 renders it live.';
row.last_verified = DATE;
row.superseded_by = null;
row._audit_note =
  `§PHASE 10 (acquisition intelligence at scale) (2026-10-08) — ` +
  `STATUS RAISED not_started -> built (old value recorded inline, never deleted). OLD status: ` +
  `${JSON.stringify(OLD_STATUS)}. OLD evidence: ${JSON.stringify(OLD_EVIDENCE)}. Built as the ` +
  `ONE owner + the pure fail-closed resolver: the intelligence declares the dimensions it scales ` +
  `over and the research sources that may supply them (REUSING the canonical integration ` +
  `providers), and a signal exists ONLY when it names a declared source that supplies its ` +
  `dimension and whose provider is genuinely available — when no provider is available NO value ` +
  `is produced, never fabricated. Surface declared in the E6 scope guard ` +
  `(PHASE10_ACQUISITION_INTELLIGENCE_SCOPE).`;

/* _meta: counts, date, changelog. */
const counts = {};
for (const e of reg.entries) counts[e.status] = (counts[e.status] || 0) + 1;
reg._meta.last_updated = DATE;
reg._meta.total_entries = reg.entries.length;
reg._meta.status_counts = {
  _note:
    'Recomputed 2026-10-08 by scripts/reconcile-acquisition-intelligence-registry.cjs after ' +
    'the §PHASE 10 (acquisition intelligence at scale) increment ' +
    '(phase10-acquisition-intelligence-scale not_started -> built; no row added or removed: ' +
    'total_entries stays 540; built +1, not_started -1). Snapshot only.',
  ...counts,
};
reg._meta.acquisition_intelligence_increment = {
  increment: '§PHASE 10 — Acquisition intelligence at scale (2026-10-08)',
  restated: ['phase10-acquisition-intelligence-scale'],
  added: [],
  validators: ['scripts/validate-acquisition-intelligence.mjs'],
  note:
    'Acquisition intelligence had no single owner declaring what may be produced and from ' +
    'which source. The owner declares the dimensions it scales over and the research sources ' +
    'that may supply them (each REUSING a canonical integration-registry provider id), and the ' +
    'pure fail-closed resolver enforces it: an unknown dimension, no source, an unknown source, ' +
    'a source that does not supply the dimension, and a signal with no available provider are ' +
    'all refused — when no provider exists NO value is produced, never fabricated. Deterministic ' +
    '(no AI, no clock) and internal (Super-Admin).',
};

fs.writeFileSync(REG, JSON.stringify(reg, null, 2) + '\n');
console.log(`registry reconciled: total_entries=${reg.entries.length}`);
console.log('status_counts:', JSON.stringify(counts));
