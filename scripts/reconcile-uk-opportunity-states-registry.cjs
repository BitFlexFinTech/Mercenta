/*
 * §PHASE 10 — The UK opportunity states at scale — registry reconciliation (2026-10-08).
 *
 * WHY. The row `phase10-uk-opportunity-states` recorded that the six UK opportunity
 * states A–F must operate AT SCALE, feeding UK Market Fit → qualification →
 * outreach, and that §PHASE 1 implements the classification while PHASE 10 scales
 * the EVIDENCE behind it. THIS increment builds the ONE owner
 * (`src/config/ukOpportunityStates.ts`) and the pure fail-closed resolver
 * (`src/lib/intelligence/ukOpportunityStates.ts`), surfaces it on the Super-Admin
 * Founder Control Centre (Business view) and raises the row to `built`. No live
 * research provider is configured, so NO state is asserted — the row records the
 * WHAT and the RULE; nothing is invented.
 *
 * Run: node scripts/reconcile-uk-opportunity-states-registry.cjs
 */
const fs = require('node:fs');
const path = require('node:path');

const REG = path.join(__dirname, '..', 'requirements-registry.json');
const reg = JSON.parse(fs.readFileSync(REG, 'utf8'));
const byId = new Map(reg.entries.map((e) => [e.id, e]));
const DATE = '2026-10-08';

const row = byId.get('phase10-uk-opportunity-states');
if (!row) {
  console.error('MISSING ROW: phase10-uk-opportunity-states');
  process.exit(1);
}

const OLD_STATUS = row.status;
const OLD_EVIDENCE = row.evidence;
const OLD_DESCRIPTION = row.description;

row.status = 'built';
row.description =
  'Phase 10 — the UK opportunity states A–F at scale, feeding UK Market Fit → qualification → ' +
  'outreach (never fabricated when the evidence behind a state is unavailable). BUILT (2026-10-08): ' +
  '§PHASE 1 already implements the classification (`src/config/ukMarketFit.ts → UK_PRESENCE_CLASSES` ' +
  '+ `src/lib/preaudit/ukMarketFitEngine.ts → classifyUkPresence`); THIS increment adds the ONE owner ' +
  '`src/config/ukOpportunityStates.ts` that declares the SCALED EVIDENCE behind each state — the ' +
  'RESEARCH SOURCES that may back a state (each REUSING a canonical integration-registry provider id: ' +
  'amazon_sp_api · keepa · firecrawl · companies_house) and, for each of the six states A–F, the ' +
  'evidence it rests on (the state ids and labels are REUSED from UK_PRESENCE_CLASSES). The states feed ' +
  'the canonical UK Market Fit → qualification → outreach chain (stage ids REUSED from the integrated ' +
  'loop). The pure resolver `src/lib/intelligence/ukOpportunityStates.ts` applies ONE rule FAIL-CLOSED: ' +
  'a state may be asserted ONLY when it names a DECLARED evidence source and EVERY one of its sources is ' +
  'backed by a genuinely available provider — an unknown state, a state with no evidence and a state ' +
  'naming an unknown source are ALL refused (never fabricated). Deterministic (no AI, no clock) and ' +
  'internal (Super-Admin only).';
row.evidence =
  'src/config/ukOpportunityStates.ts (the ONE owner — the evidence sources + the six states, each ' +
  'state’s evidence REUSING a canonical integration provider; the states/chain REUSE UK_PRESENCE_CLASSES ' +
  'and the integrated-loop stage ids); src/lib/intelligence/ukOpportunityStates.ts (the pure fail-closed ' +
  'resolver); src/lib/commandCentre/controlCentre.ts (computes + exposes ukOpportunityStates); ' +
  'src/components/admin/FounderControlCentre.tsx (Business → UK opportunity states at scale, Super-Admin ' +
  'only); gate scripts/validate-uk-opportunity-states.mjs (npm run validate:uk-opportunity-states, 34 ' +
  'assertions, mutation-proved TWICE); e2e/founder-operating-system.spec.ts test 24 renders it live.';
row.last_verified = DATE;
row.superseded_by = null;
row._audit_note =
  `§PHASE 10 (UK opportunity states at scale) (2026-10-08) — ` +
  `STATUS RAISED not_started -> built (old values recorded inline, never deleted). OLD status: ` +
  `${JSON.stringify(OLD_STATUS)}. OLD description: ${JSON.stringify(OLD_DESCRIPTION)}. OLD evidence: ` +
  `${JSON.stringify(OLD_EVIDENCE)}. Built as the ONE owner + the pure fail-closed resolver: the states ` +
  `and labels REUSE the §PHASE 1 UK_PRESENCE_CLASSES, the evidence sources REUSE the canonical ` +
  `integration providers, and a state may be asserted ONLY when every evidence source behind it is ` +
  `backed by an available provider — when no provider is available NO state is asserted, never ` +
  `fabricated. Surface declared in the E6 scope guard (PHASE10_UK_OPPORTUNITY_STATES_SCOPE).`;

/* _meta: counts, date, changelog. */
const counts = {};
for (const e of reg.entries) counts[e.status] = (counts[e.status] || 0) + 1;
reg._meta.last_updated = DATE;
reg._meta.total_entries = reg.entries.length;
reg._meta.status_counts = {
  _note:
    'Recomputed 2026-10-08 by scripts/reconcile-uk-opportunity-states-registry.cjs after the §PHASE 10 ' +
    '(UK opportunity states at scale) increment (phase10-uk-opportunity-states not_started -> built; no ' +
    'row added or removed: total_entries stays 540; built +1, not_started -1). Snapshot only.',
  ...counts,
};
reg._meta.uk_opportunity_states_increment = {
  increment: '§PHASE 10 — The UK opportunity states at scale (2026-10-08)',
  restated: ['phase10-uk-opportunity-states'],
  added: [],
  validators: ['scripts/validate-uk-opportunity-states.mjs'],
  note:
    'The six UK opportunity states A–F had no single owner declaring the EVIDENCE each state must rest ' +
    'on at scale. The owner declares the evidence sources (each REUSING a canonical integration-registry ' +
    'provider id) and each state’s evidence (ids/labels REUSED from UK_PRESENCE_CLASSES), and the states ' +
    'feed the UK Market Fit → qualification → outreach chain (stage ids reused from the integrated loop). ' +
    'The pure fail-closed resolver enforces it: an unknown state, a state with no evidence and a state ' +
    'naming an unknown source are all refused, and a state whose evidence provider is unavailable is ' +
    'refused — when no provider exists NO state is asserted, never fabricated. Deterministic (no AI, no ' +
    'clock) and internal (Super-Admin).',
};

fs.writeFileSync(REG, JSON.stringify(reg, null, 2) + '\n');
console.log(`registry reconciled: total_entries=${reg.entries.length}`);
console.log('status_counts:', JSON.stringify(counts));
