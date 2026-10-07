/*
 * §PHASE 7 — the founder outreach pipeline — registry reconciliation (2026-10-06).
 *
 * WHY. The Phase-7 row `phase7-founder-outreach-pipeline` recorded the outreach
 * pipeline Mercenta runs over the financing-partner universe — the ordered approach
 * that moves a financing partner along the canonical financier lifecycle
 * (`src/config/financierLifecycle.ts`) from TARGET → CONTACTED → ENGAGED. THIS
 * increment builds the ONE owner (`src/config/founderOutreach.ts` — the declared
 * channels, touchpoint types and a deterministic cadence of day OFFSETS) and the pure
 * fail-closed resolver (`src/lib/finance/founderOutreach.ts`), and raises the row to
 * `built`.
 *
 * The row's old evidence ("docs — roadmap §PHASE 7") was a STALE citation, so it is
 * replaced here by the real built artefacts.
 *
 * Run: node scripts/reconcile-founder-outreach-registry.cjs
 */
const fs = require('node:fs');
const path = require('node:path');

const REG = path.join(__dirname, '..', 'requirements-registry.json');
const reg = JSON.parse(fs.readFileSync(REG, 'utf8'));
const byId = new Map(reg.entries.map((e) => [e.id, e]));
const DATE = '2026-10-06';

const row = byId.get('phase7-founder-outreach-pipeline');
if (!row) {
  console.error('MISSING ROW: phase7-founder-outreach-pipeline');
  process.exit(1);
}

const OLD_STATUS = row.status;
const OLD_EVIDENCE = row.evidence;

row.status = 'built';
row.description =
  'Phase 7 — the founder outreach pipeline over the financing-partner universe: the ordered approach that ' +
  'moves a financing partner along the canonical financier lifecycle from TARGET → CONTACTED → ENGAGED. ' +
  'BUILT (2026-10-06): the ONE owner `src/config/founderOutreach.ts` declares the declared channels, the ' +
  'touchpoint types and a deterministic follow-up cadence of day OFFSETS (strictly increasing, starting with ' +
  'the initial contact); the three outreach stages (TARGET / CONTACTED / ENGAGED) are REUSED from the ONE ' +
  'lifecycle owner (no second list). The pure resolver `src/lib/finance/founderOutreach.ts` applies it: ' +
  'outreach BEGINS at TARGET (a merely researched/qualified provider is REFUSED with ' +
  'OUTREACH_REQUIRES_TARGET_STAGE), the pipeline is FORWARD-ONLY (a follow-up before an open contact is ' +
  'REFUSED with OUTREACH_FOLLOWUP_REQUIRES_CONTACT; a second initial contact is REFUSED with ' +
  'OUTREACH_INITIAL_ALREADY_DONE), an off-ramped provider is not in the pipeline ' +
  '(OUTREACH_STAGE_NOT_IN_PIPELINE) and an unknown channel, type or stage is REFUSED ' +
  '(OUTREACH_CHANNEL_UNKNOWN / OUTREACH_TYPE_UNKNOWN / OUTREACH_STAGE_UNKNOWN). Deterministic (no AI, no ' +
  'clock) and internal (Super-Admin surface only).';
row.evidence =
  'src/config/founderOutreach.ts (the ONE owner); src/lib/finance/founderOutreach.ts (the pure fail-closed ' +
  'resolver); src/lib/commandCentre/controlCentre.ts (computes + exposes founderOutreach); ' +
  'src/components/admin/FounderControlCentre.tsx (Finance → Founder outreach pipeline, Super-Admin only); ' +
  'gate scripts/validate-founder-outreach.mjs (npm run validate:founder-outreach, mutation-proved TWICE); ' +
  'e2e/founder-operating-system.spec.ts test 17 renders it live.';
row.last_verified = DATE;
row.superseded_by = null;
row._audit_note =
  `§PHASE 7 (founder outreach pipeline) (2026-10-06) — STATUS RAISED not_started -> built (old value recorded ` +
  `inline, never deleted). OLD status: ${JSON.stringify(OLD_STATUS)}. OLD evidence: ${JSON.stringify(OLD_EVIDENCE)} ` +
  `(a STALE "roadmap §PHASE 7" citation, fixed at source). Built as the ONE owner + the pure fail-closed resolver: ` +
  `outreach begins at TARGET and is forward-only (a follow-up requires an open contact), every touchpoint names a ` +
  `declared channel and type, and an unknown channel/type/stage is refused. Surface declared in BOTH scope guards ` +
  `(E6 PHASE7_FOUNDER_OUTREACH_SCOPE; E7 entries).`;

/* _meta: counts, date, changelog. */
const counts = {};
for (const e of reg.entries) counts[e.status] = (counts[e.status] || 0) + 1;
reg._meta.last_updated = DATE;
reg._meta.total_entries = reg.entries.length;
reg._meta.status_counts = {
  _note:
    'Recomputed 2026-10-06 by scripts/reconcile-founder-outreach-registry.cjs after the §PHASE 7 (founder ' +
    'outreach pipeline) increment (phase7-founder-outreach-pipeline not_started -> built; no row added or ' +
    'removed: total_entries stays 540; built +1, not_started -1). Snapshot only.',
  ...counts,
};
reg._meta.founder_outreach_increment = {
  increment: '§PHASE 7 — the founder outreach pipeline (2026-10-06)',
  restated: ['phase7-founder-outreach-pipeline'],
  added: [],
  validators: ['scripts/validate-founder-outreach.mjs'],
  note:
    'The outreach pipeline (the ordered approach Mercenta makes to a financing partner) had no owner; it was ' +
    'described only in the roadmap. The owner + the pure fail-closed resolver declare it once: outreach begins at ' +
    'the TARGET lifecycle stage and is forward-only (a follow-up requires an open contact), the cadence is a ' +
    'deterministic sequence of day OFFSETS, and an unknown channel, type or stage is REFUSED. It is internal ' +
    '(Super-Admin only) and deterministic (no AI, no clock).',
};

fs.writeFileSync(REG, JSON.stringify(reg, null, 2) + '\n');
console.log(`registry reconciled: total_entries=${reg.entries.length}`);
console.log('status_counts:', JSON.stringify(counts));
