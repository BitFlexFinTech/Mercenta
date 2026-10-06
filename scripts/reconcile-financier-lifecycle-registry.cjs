/*
 * §PHASE 7 — the financier lifecycle — registry reconciliation (2026-10-06).
 *
 * WHY. The Phase-7 row `phase7-financier-lifecycle` recorded the lifecycle a
 * financing partner (a bank, PO / inventory / trade / receivables financier, a
 * working-capital or alternative-credit provider) moves through — RESEARCHED →
 * QUALIFIED → TARGET → CONTACTED → ENGAGED → DUE DILIGENCE → TERMS → PILOT →
 * ACTIVE PARTNER (or REJECTED / PARKED) — and the rule that a provider is NEVER
 * marked ACTIVE merely because it was researched. THIS increment builds the ONE
 * owner (`src/config/financierLifecycle.ts` — the forward-only, fail-closed
 * lifecycle whose transitions are DERIVED from the ordered stages) and the pure
 * resolver (`src/lib/finance/financierLifecycle.ts`), and raises the row to
 * `built`.
 *
 * The row's old evidence ("docs — roadmap §PHASE 7") was a STALE citation — the
 * roadmap lives in `docs/archive/MASTER_CHATGPT_HANDOFF.md` §28.1 — so it is
 * replaced here by the real built artefacts.
 *
 * Run: node scripts/reconcile-financier-lifecycle-registry.cjs
 */
const fs = require('node:fs');
const path = require('node:path');

const REG = path.join(__dirname, '..', 'requirements-registry.json');
const reg = JSON.parse(fs.readFileSync(REG, 'utf8'));
const byId = new Map(reg.entries.map((e) => [e.id, e]));
const DATE = '2026-10-06';

const row = byId.get('phase7-financier-lifecycle');
if (!row) {
  console.error('MISSING ROW: phase7-financier-lifecycle');
  process.exit(1);
}

const OLD_STATUS = row.status;
const OLD_EVIDENCE = row.evidence;

row.status = 'built';
row.description =
  'Phase 7 — the financier lifecycle RESEARCHED → QUALIFIED → TARGET → CONTACTED → ENGAGED → ' +
  'DUE DILIGENCE → TERMS → PILOT → ACTIVE PARTNER (or REJECTED / PARKED), where a provider is NEVER ' +
  'marked ACTIVE merely because it was researched. BUILT (2026-10-06): the ONE owner ' +
  '`src/config/financierLifecycle.ts` declares the forward-only, fail-closed lifecycle — the transitions ' +
  'are DERIVED from the ordered stages (one forward step plus the two off-ramps), ACTIVE PARTNER and ' +
  'REJECTED are terminal and PARKED re-enters at RESEARCHED. The pure resolver ' +
  '`src/lib/finance/financierLifecycle.ts` applies it: ACTIVE PARTNER is reachable ONLY from PILOT (a ' +
  'researched provider is REFUSED with FINANCIER_ACTIVE_REQUIRES_PILOT), an unknown stage is REFUSED ' +
  '(FINANCIER_STAGE_UNKNOWN) and an undeclared move is REFUSED (FINANCIER_TRANSITION_ILLEGAL). ' +
  'Deterministic (no AI, no clock) and internal (Super-Admin surface only).';
row.evidence =
  'src/config/financierLifecycle.ts (the ONE owner); src/lib/finance/financierLifecycle.ts (the pure ' +
  'fail-closed resolver); src/lib/commandCentre/controlCentre.ts (computes + exposes financierLifecycle); ' +
  'src/components/admin/FounderControlCentre.tsx (Finance → Financier lifecycle, Super-Admin only); ' +
  'gate scripts/validate-financier-lifecycle.mjs (npm run validate:financier-lifecycle, mutation-proved ' +
  'TWICE); e2e/founder-operating-system.spec.ts test 15 renders it live.';
row.last_verified = DATE;
row.superseded_by = null;
row._audit_note =
  `§PHASE 7 (financier lifecycle) (2026-10-06) — STATUS RAISED not_started -> built (old value recorded ` +
  `inline, never deleted). OLD status: ${JSON.stringify(OLD_STATUS)}. OLD evidence: ` +
  `${JSON.stringify(OLD_EVIDENCE)} (a STALE "roadmap §PHASE 7" citation, fixed at source). Built as the ONE ` +
  `owner + the pure fail-closed resolver: a financing partner advances one stage at a time and ACTIVE PARTNER ` +
  `is reachable ONLY through a completed PILOT — a provider is never marked ACTIVE merely because it was ` +
  `researched. Surface declared in BOTH scope guards (E6 PHASE7_FINANCIER_LIFECYCLE_SCOPE; E7 entries).`;

/* _meta: counts, date, changelog. */
const counts = {};
for (const e of reg.entries) counts[e.status] = (counts[e.status] || 0) + 1;
reg._meta.last_updated = DATE;
reg._meta.total_entries = reg.entries.length;
reg._meta.status_counts = {
  _note:
    'Recomputed 2026-10-06 by scripts/reconcile-financier-lifecycle-registry.cjs after the §PHASE 7 ' +
    '(financier lifecycle) increment (phase7-financier-lifecycle not_started -> built; no row added or ' +
    'removed: total_entries stays 540; built +1, not_started -1). Snapshot only.',
  ...counts,
};
reg._meta.financier_lifecycle_increment = {
  increment: '§PHASE 7 — the financier lifecycle (2026-10-06)',
  restated: ['phase7-financier-lifecycle'],
  added: [],
  validators: ['scripts/validate-financier-lifecycle.mjs'],
  note:
    'The financier lifecycle (the approach Mercenta makes to a financing partner) had no owner; it was ' +
    'described only in the roadmap. The owner + the pure fail-closed resolver declare it once: forward-only, ' +
    'one stage at a time, ACTIVE PARTNER reachable ONLY through PILOT, with REJECTED / PARKED off-ramps; an ' +
    'unknown stage or an illegal move is REFUSED. It is internal (Super-Admin only) and deterministic (no AI, ' +
    'no clock).',
};

fs.writeFileSync(REG, JSON.stringify(reg, null, 2) + '\n');
console.log(`registry reconciled: total_entries=${reg.entries.length}`);
console.log('status_counts:', JSON.stringify(counts));
