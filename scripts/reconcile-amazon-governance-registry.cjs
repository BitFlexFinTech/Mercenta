/*
 * §PHASE 13 — Amazon relationship governance — registry reconciliation (2026-10-06).
 *
 * WHY. The row `phase13-amazon-relationship-governance` recorded the cross-cutting governance
 * over the authoritative sources of Mercenta's retail-channel relationship (vendor agreement,
 * current policies, additional terms, channel communications, programme documentation, API
 * agreements, trademark permissions, written permissions, account instructions). THIS increment
 * builds the ONE owner (`src/config/amazonRelationshipGovernance.ts`) and the pure fail-closed
 * resolver (`src/lib/intelligence/amazonRelationshipGovernance.ts`), surfaces it on the
 * Super-Admin Founder Control Centre and raises the row to `built`.
 *
 * The programme status is REUSED from `src/lib/intelligence/amazonWording.ts` (the existing
 * claim rules this governance rests on) — never a second copy.
 *
 * Run: node scripts/reconcile-amazon-governance-registry.cjs
 */
const fs = require('node:fs');
const path = require('node:path');

const REG = path.join(__dirname, '..', 'requirements-registry.json');
const reg = JSON.parse(fs.readFileSync(REG, 'utf8'));
const byId = new Map(reg.entries.map((e) => [e.id, e]));
const DATE = '2026-10-06';

const row = byId.get('phase13-amazon-relationship-governance');
if (!row) {
  console.error('MISSING ROW: phase13-amazon-relationship-governance');
  process.exit(1);
}

const OLD_STATUS = row.status;
const OLD_EVIDENCE = row.evidence;

row.status = 'built';
row.description =
  'Phase 13 — the cross-cutting governance over the AUTHORITATIVE SOURCES of Mercenta’s ' +
  'retail-channel relationship (vendor agreement, current policies, additional terms, channel ' +
  'communications, programme documentation, API agreements, trademark permissions, written ' +
  'permissions, account instructions). BUILT (2026-10-06): the ONE owner ' +
  '`src/config/amazonRelationshipGovernance.ts` declares the nine document classes once (each ' +
  'naming the codebase owner of the behaviour it governs) and the governance rule over them; the ' +
  'pure resolver `src/lib/intelligence/amazonRelationshipGovernance.ts` applies it FAIL-CLOSED — ' +
  'a claim may cite only a declared source (an unknown id is REFUSED), the claim wording must ' +
  'still pass the canonical wording safeguard (a failing claim is REFUSED), and a claim may rest ' +
  'only on a source actually held AND verified (an unverified source is REFUSED). Nothing is ' +
  'verified with the channel today, so every relationship claim currently fails closed. The ' +
  'programme status is REUSED from `src/lib/intelligence/amazonWording.ts`, never re-typed. ' +
  'Deterministic (no AI, no clock) and internal (Super-Admin surface only).';
row.evidence =
  'src/config/amazonRelationshipGovernance.ts (the ONE owner — the authoritative-source universe ' +
  '+ the fail-closed rule); src/lib/intelligence/amazonRelationshipGovernance.ts (the pure ' +
  'fail-closed resolver); src/lib/intelligence/amazonWording.ts (the wording owner this governance ' +
  'rests on — READ, never modified); src/lib/commandCentre/controlCentre.ts (computes + exposes ' +
  'amazonGovernance); src/components/admin/FounderControlCentre.tsx (Commercial → Amazon ' +
  'relationship governance, Super-Admin only); gate scripts/validate-amazon-governance.mjs ' +
  '(npm run validate:amazon-governance, 32 assertions, mutation-proved TWICE); ' +
  'e2e/founder-operating-system.spec.ts test 19 renders it live.';
row.last_verified = DATE;
row.superseded_by = null;
row._audit_note =
  `§PHASE 13 (Amazon relationship governance) (2026-10-06) — STATUS RAISED not_started -> built ` +
  `(old value recorded inline, never deleted). OLD status: ${JSON.stringify(OLD_STATUS)}. OLD ` +
  `evidence: ${JSON.stringify(OLD_EVIDENCE)}. Built as the ONE owner + the pure fail-closed ` +
  `resolver: a claim rests only on a source actually held AND verified, an unknown source and a ` +
  `wording-failing claim are REFUSED, and the programme status is reused from the wording owner ` +
  `(no second copy). Surface declared in BOTH scope guards (E6 PHASE13_AMAZON_GOVERNANCE_SCOPE; ` +
  `E7 PHASE13_AMAZON_GOVERNANCE_DECLARED + allowed entries).`;

/* _meta: counts, date, changelog. */
const counts = {};
for (const e of reg.entries) counts[e.status] = (counts[e.status] || 0) + 1;
reg._meta.last_updated = DATE;
reg._meta.total_entries = reg.entries.length;
reg._meta.status_counts = {
  _note:
    'Recomputed 2026-10-06 by scripts/reconcile-amazon-governance-registry.cjs after the §PHASE 13 ' +
    '(Amazon relationship governance) increment (phase13-amazon-relationship-governance ' +
    'not_started -> built; no row added or removed: total_entries stays 540; built +1, not_started -1). Snapshot only.',
  ...counts,
};
reg._meta.amazon_governance_increment = {
  increment: '§PHASE 13 — Amazon relationship governance (2026-10-06)',
  restated: ['phase13-amazon-relationship-governance'],
  added: [],
  validators: ['scripts/validate-amazon-governance.mjs'],
  note:
    'The authoritative sources of Mercenta’s retail-channel relationship had no single owner; the ' +
    'row was described only in the roadmap. The owner declares the nine document classes once and ' +
    'the pure fail-closed resolver applies ONE rule over them: a claim may rest only on a source ' +
    'actually held AND verified, an unknown source is refused, and the programme status is reused ' +
    'from the wording owner (`src/lib/intelligence/amazonWording.ts`) rather than held twice. It is ' +
    'internal (Super-Admin) and deterministic (no AI, no clock).',
};

fs.writeFileSync(REG, JSON.stringify(reg, null, 2) + '\n');
console.log(`registry reconciled: total_entries=${reg.entries.length}`);
console.log('status_counts:', JSON.stringify(counts));
