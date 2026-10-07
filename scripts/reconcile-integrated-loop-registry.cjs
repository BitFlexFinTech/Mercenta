/*
 * §PHASE 12 — Integrated acquisition → capital → operations loop — registry reconciliation
 * (2026-10-06).
 *
 * WHY. The row `phase12-integrated-acquisition-capital-operations-loop` recorded the end-to-end
 * loop (discovery → Explore UK Market Fit → qualification → outreach → onboarding → product
 * readiness → commercial terms → Mercenta purchase → supply-route analysis → capital requirement
 * → financing eligibility → financing → supplier purchase → Vendor operations → PO → fulfilment
 * → invoice → payment → repayment → margin → Founder Intelligence). THIS increment builds the
 * ONE owner (`src/config/integratedLoop.ts`) and the pure fail-closed resolver
 * (`src/lib/intelligence/integratedLoop.ts`), surfaces it on the Super-Admin Founder Control
 * Centre (Business view) and raises the row to `built`.
 *
 * Run: node scripts/reconcile-integrated-loop-registry.cjs
 */
const fs = require('node:fs');
const path = require('node:path');

const REG = path.join(__dirname, '..', 'requirements-registry.json');
const reg = JSON.parse(fs.readFileSync(REG, 'utf8'));
const byId = new Map(reg.entries.map((e) => [e.id, e]));
const DATE = '2026-10-06';

const row = byId.get('phase12-integrated-acquisition-capital-operations-loop');
if (!row) {
  console.error('MISSING ROW: phase12-integrated-acquisition-capital-operations-loop');
  process.exit(1);
}

const OLD_STATUS = row.status;
const OLD_EVIDENCE = row.evidence;

row.status = 'built';
row.description =
  'Phase 12 — the integrated loop: discovery → Explore UK Market Fit → qualification → ' +
  'outreach → onboarding → product readiness → commercial terms → Mercenta purchase → ' +
  'supply-route analysis → capital requirement → financing eligibility → financing → supplier ' +
  'purchase → Vendor operations → PO → fulfilment → invoice → payment → repayment → margin → ' +
  'Founder Intelligence. BUILT (2026-10-06): the ONE owner ' +
  '`src/config/integratedLoop.ts` declares the twenty-one stages once, each naming the canonical ' +
  'owner that DETERMINISTICALLY owns its behaviour; the pure resolver ' +
  '`src/lib/intelligence/integratedLoop.ts` applies ONE rule FAIL-CLOSED — the loop is ' +
  'FORWARD-ONLY (the moves are DERIVED from the ordered list, so a stage is reached only from ' +
  'its declared predecessor), an unknown stage or an illegal move is REFUSED, and the loop ' +
  'CLOSES into the founder’s own intelligence (the final stage is Founder Intelligence). ' +
  'Deterministic (no AI, no clock) and internal (Super-Admin surface only).';
row.evidence =
  'src/config/integratedLoop.ts (the ONE owner — the twenty-one loop stages + the rule over ' +
  'them); src/lib/intelligence/integratedLoop.ts (the pure fail-closed resolver); ' +
  'src/lib/commandCentre/controlCentre.ts (computes + exposes integratedLoop); ' +
  'src/components/admin/FounderControlCentre.tsx (Business → Integrated loop, Super-Admin only); ' +
  'gate scripts/validate-integrated-loop.mjs (npm run validate:integrated-loop, mutation-proved ' +
  'TWICE); e2e/founder-operating-system.spec.ts test 21 renders it live.';
row.last_verified = DATE;
row.superseded_by = null;
row._audit_note =
  `§PHASE 12 (integrated acquisition → capital → operations loop) (2026-10-06) — STATUS RAISED ` +
  `not_started -> built (old value recorded inline, never deleted). OLD status: ` +
  `${JSON.stringify(OLD_STATUS)}. OLD evidence: ${JSON.stringify(OLD_EVIDENCE)}. Built as the ` +
  `ONE owner + the pure fail-closed resolver: the loop is declared once, forward-only (the ` +
  `moves are derived from the ordered list), and closes into the founder’s own intelligence. ` +
  `Surface declared in BOTH scope guards (E6 PHASE12_INTEGRATED_LOOP_SCOPE; E7 ` +
  `PHASE12_INTEGRATED_LOOP_DECLARED + allowed entries).`;

/* _meta: counts, date, changelog. */
const counts = {};
for (const e of reg.entries) counts[e.status] = (counts[e.status] || 0) + 1;
reg._meta.last_updated = DATE;
reg._meta.total_entries = reg.entries.length;
reg._meta.status_counts = {
  _note:
    'Recomputed 2026-10-06 by scripts/reconcile-integrated-loop-registry.cjs after the ' +
    '§PHASE 12 (integrated acquisition → capital → operations loop) increment ' +
    '(phase12-integrated-acquisition-capital-operations-loop not_started -> built; no row added ' +
    'or removed: total_entries stays 540; built +1, not_started -1). Snapshot only.',
  ...counts,
};
reg._meta.integrated_loop_increment = {
  increment: '§PHASE 12 — Integrated acquisition → capital → operations loop (2026-10-06)',
  restated: ['phase12-integrated-acquisition-capital-operations-loop'],
  added: [],
  validators: ['scripts/validate-integrated-loop.mjs'],
  note:
    'The end-to-end business loop had no single owner. The owner declares the twenty-one ' +
    'stages once, each naming the canonical owner that deterministically owns its behaviour, and ' +
    'the pure fail-closed resolver applies ONE rule over them: the loop is forward-only (a stage ' +
    'is reached only from its declared predecessor, the moves being derived from the ordered ' +
    'list) and it closes into the founder’s own intelligence. An unknown stage or an illegal ' +
    'move is refused. It is internal (Super-Admin) and deterministic (no AI, no clock).',
};

fs.writeFileSync(REG, JSON.stringify(reg, null, 2) + '\n');
console.log(`registry reconciled: total_entries=${reg.entries.length}`);
console.log('status_counts:', JSON.stringify(counts));
