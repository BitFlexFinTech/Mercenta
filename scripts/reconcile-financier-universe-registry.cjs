/*
 * §PHASE 7 — The financier universe (research record + source-evidence discipline) —
 * registry reconciliation (2026-10-07).
 *
 * WHY. The row `phase7-financier-universe-research` recorded the REAL financing-partner
 * universe with the full financier record, source evidence and a last-researched date. THIS
 * increment builds the ONE owner (`src/config/financierUniverse.ts`) and the pure fail-closed
 * resolver (`src/lib/finance/financierUniverse.ts`), surfaces it on the Super-Admin Founder
 * Control Centre (Finance view) and raises the row to `built`. The real universe holds ZERO
 * providers — nothing is invented; the row records the RECORD and the RULE.
 *
 * Run: node scripts/reconcile-financier-universe-registry.cjs
 */
const fs = require('node:fs');
const path = require('node:path');

const REG = path.join(__dirname, '..', 'requirements-registry.json');
const reg = JSON.parse(fs.readFileSync(REG, 'utf8'));
const byId = new Map(reg.entries.map((e) => [e.id, e]));
const DATE = '2026-10-07';

const row = byId.get('phase7-financier-universe-research');
if (!row) {
  console.error('MISSING ROW: phase7-financier-universe-research');
  process.exit(1);
}

const OLD_STATUS = row.status;
const OLD_EVIDENCE = row.evidence;

row.status = 'built';
row.description =
  'Phase 7 — the financier universe: the REAL financing-partner universe (banks and PO / ' +
  'inventory / trade / receivables financiers, working-capital, SME and e-commerce finance ' +
  'providers and alternative-credit funds across the UK, Europe, Africa, the US and other ' +
  'markets) with the FULL financier record, the SOURCE EVIDENCE and a LAST-RESEARCHED date. ' +
  'BUILT (2026-10-07): the ONE owner `src/config/financierUniverse.ts` declares the provider ' +
  'taxonomy, the market scope, the full record and the research discipline; the pure resolver ' +
  '`src/lib/finance/financierUniverse.ts` applies ONE rule FAIL-CLOSED — a provider enters ONLY ' +
  'with a NAMED, PUBLISHED source and a LAST-RESEARCHED date, an unknown provider type or ' +
  'market is refused, and an illustrative placeholder is refused. The real universe holds ZERO ' +
  'providers (nothing is invented). Deterministic (no AI, no clock) and internal (Super-Admin only).';
row.evidence =
  'src/config/financierUniverse.ts (the ONE owner — the provider taxonomy, the market scope, ' +
  'the full financier record + the research discipline); src/lib/finance/financierUniverse.ts ' +
  '(the pure fail-closed resolver); src/lib/commandCentre/controlCentre.ts (computes + exposes ' +
  'financierUniverse); src/components/admin/FounderControlCentre.tsx (Finance → Financier ' +
  'universe, Super-Admin only); gate scripts/validate-financier-universe.mjs (npm run ' +
  'validate:financier-universe, mutation-proved TWICE); e2e/founder-operating-system.spec.ts ' +
  'test 22 renders it live.';
row.last_verified = DATE;
row.superseded_by = null;
row._audit_note =
  `§PHASE 7 (financier universe — research record + source-evidence discipline) (2026-10-07) — ` +
  `STATUS RAISED not_started -> built (old value recorded inline, never deleted). OLD status: ` +
  `${JSON.stringify(OLD_STATUS)}. OLD evidence: ${JSON.stringify(OLD_EVIDENCE)}. Built as the ` +
  `ONE owner + the pure fail-closed resolver: the universe declares the full record and the rule ` +
  `that a provider enters ONLY with a NAMED PUBLISHED source and a LAST-RESEARCHED date (the ` +
  `platform's evidence rule applied to financing partners). The real universe holds ZERO ` +
  `providers — the research population is a separate, explicitly-pending data action and no ` +
  `provider is ever invented. Surface declared in the E6 scope guard (PHASE7_FINANCIER_UNIVERSE_SCOPE).`;

/* _meta: counts, date, changelog. */
const counts = {};
for (const e of reg.entries) counts[e.status] = (counts[e.status] || 0) + 1;
reg._meta.last_updated = DATE;
reg._meta.total_entries = reg.entries.length;
reg._meta.status_counts = {
  _note:
    'Recomputed 2026-10-07 by scripts/reconcile-financier-universe-registry.cjs after the ' +
    '§PHASE 7 (financier universe) increment (phase7-financier-universe-research not_started ' +
    '-> built; no row added or removed: total_entries stays 540; built +1, not_started -1). ' +
    'Snapshot only.',
  ...counts,
};
reg._meta.financier_universe_increment = {
  increment: '§PHASE 7 — Financier universe (research record + source-evidence discipline) (2026-10-07)',
  restated: ['phase7-financier-universe-research'],
  added: [],
  validators: ['scripts/validate-financier-universe.mjs'],
  note:
    'The financing-partner universe had no owner: three modules (financierLifecycle, ' +
    'founderOutreach, pitchWorkspace) deliberately held no provider and pointed at this row. ' +
    'The owner declares the provider taxonomy, the market scope, the full financier record and ' +
    'the research discipline, and the pure fail-closed resolver enforces it: an unknown provider ' +
    'type or market, an entry with no named source, an entry with no research date and an ' +
    'illustrative placeholder are all refused. The real universe holds ZERO providers; the ' +
    'research population is a separate, explicitly-pending data action. Deterministic (no AI, no ' +
    'clock) and internal (Super-Admin).',
};

fs.writeFileSync(REG, JSON.stringify(reg, null, 2) + '\n');
console.log(`registry reconciled: total_entries=${reg.entries.length}`);
console.log('status_counts:', JSON.stringify(counts));
