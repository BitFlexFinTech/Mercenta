/*
 * §PHASE 4 — the brand learning loop — registry reconciliation (2026-10-05).
 *
 * WHY. The Phase-4 row `phase4-learning-loop-validate` recorded the brand
 * education loop LEARN → WATCH → DO → VALIDATE → COMPLETE, including the VALIDATE
 * gate that proves a brand can actually do the step. The Phase-4 SEAMS already
 * existed (`academyStage` on `commercialReadiness`, `PRE_AUDIT_EDUCATIONAL_GAPS`,
 * `KB_ARTICLES`, `TOUR_REGISTRY`) but had NO owner for the loop itself. THIS
 * increment builds the ONE owner (`src/config/learningLoop.ts`) and the pure
 * resolver (`src/lib/education/resolveLearningProgress.ts`), wires them into the
 * Founder Control Centre and gates them.
 *
 * It also fixes a STALE citation: the old `evidence` pointed at
 * "docs — roadmap §PHASE 4", a document that does not exist. The corrected
 * evidence names the real owner + gate + browser spec. Old values are recorded
 * inline.
 *
 * Status is `built` (consistent with the sibling governance increments —
 * country framework / claims registry / product identity / localisation). The node
 * gate is the proof AND browser test 11 renders the surface live.
 *
 * Run: node scripts/reconcile-learning-loop-registry.cjs
 */
const fs = require('node:fs');
const path = require('node:path');

const REG = path.join(__dirname, '..', 'requirements-registry.json');
const reg = JSON.parse(fs.readFileSync(REG, 'utf8'));
const byId = new Map(reg.entries.map((e) => [e.id, e]));
const DATE = '2026-10-05';

const row = byId.get('phase4-learning-loop-validate');
if (!row) {
  console.error('MISSING ROW: phase4-learning-loop-validate');
  process.exit(1);
}

const OLD_STATUS = row.status;
const OLD_EVIDENCE = row.evidence;

row.status = 'built';
row.description =
  'Phase 4 — the LEARN → WATCH → DO → VALIDATE → COMPLETE brand education loop, including the VALIDATE gate that ' +
  'proves a brand can actually do the step. BUILT (2026-10-05): the ONE owner `src/config/learningLoop.ts` declares ' +
  'the five stages (LEARN reads the canonical Knowledge Base article, WATCH completes the canonical guided tour, DO ' +
  'performs the real action, VALIDATE is the GATE, COMPLETE is reached only once VALIDATE is satisfied), the two ' +
  'pinned invariants (VALIDATE_REQUIRES_EVIDENCE, STAGES_ARE_SEQUENTIAL) and the per-gap sources; the pure resolver ' +
  '`src/lib/education/resolveLearningProgress.ts` enforces the loop SEQUENTIALLY, makes completion depend ONLY on a ' +
  'real validation signal (acting is NOT completion), and FAILS CLOSED on an unknown topic or a validation signal ' +
  'that arrives before the action. The topic list is DERIVED from the canonical `PRE_AUDIT_EDUCATIONAL_GAPS` — no ' +
  'second list. Super-Admin governance view on the Founder Control Centre.';
row.evidence =
  'src/config/learningLoop.ts (the ONE owner); src/lib/education/resolveLearningProgress.ts (the pure resolver); ' +
  'src/lib/commandCentre/controlCentre.ts (computes + exposes learningLoop); ' +
  'src/components/admin/FounderControlCentre.tsx (Brands → Brand learning loop, Super-Admin only); ' +
  'gate scripts/validate-learning-loop.mjs (npm run validate:learning-loop, 35 assertions, mutation-proved TWICE); ' +
  'e2e/founder-operating-system.spec.ts test 11 renders it live.';
row.last_verified = DATE;
row.superseded_by = null;
row._audit_note =
  `§PHASE 4 (brand learning loop) (2026-10-05) — STATUS RAISED not_started -> built (old value recorded inline, ` +
  `never deleted). OLD status: "${OLD_STATUS}". OLD evidence (STALE — the cited "docs — roadmap §PHASE 4" does ` +
  `not exist): "${OLD_EVIDENCE}". Built as the ONE owner + the pure resolver over the canonical educational gaps, ` +
  `reusing the canonical Knowledge Base article + guided tour; surface declared in BOTH scope guards ` +
  `(E6 PHASE4_LEARNING_LOOP_SCOPE; E7 entries).`;

/* _meta: counts, date, changelog. */
const counts = {};
for (const e of reg.entries) counts[e.status] = (counts[e.status] || 0) + 1;
reg._meta.last_updated = DATE;
reg._meta.total_entries = reg.entries.length;
reg._meta.status_counts = {
  _note:
    'Recomputed 2026-10-05 by scripts/reconcile-learning-loop-registry.cjs after the §PHASE 4 (brand learning ' +
    'loop) increment (phase4-learning-loop-validate not_started -> built; no row added or removed: total_entries ' +
    'stays 540; built +1, not_started -1). Snapshot only.',
  ...counts,
};
reg._meta.learning_loop_increment = {
  increment: '§PHASE 4 — the brand learning loop (2026-10-05)',
  restated: ['phase4-learning-loop-validate'],
  added: [],
  validators: ['scripts/validate-learning-loop.mjs'],
  note:
    'The Phase-4 seams existed but had no owner for the loop itself. The owner + the pure resolver declare and ' +
    'enforce LEARN → WATCH → DO → VALIDATE → COMPLETE over the canonical educational gaps, with VALIDATE as the ' +
    'ONE gate satisfied only by a real signal — a topic is never complete merely because the brand acted. It is ' +
    'internally Super-Admin only and deterministic (no AI, no clock).',
};

fs.writeFileSync(REG, JSON.stringify(reg, null, 2) + '\n');
console.log(`registry reconciled: total_entries=${reg.entries.length}`);
console.log('status_counts:', JSON.stringify(counts));