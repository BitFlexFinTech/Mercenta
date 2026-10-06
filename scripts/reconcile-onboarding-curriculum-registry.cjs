/*
 * §PHASE 4 — the onboarding academy curriculum — registry reconciliation (2026-10-05).
 *
 * WHY. The Phase-4 row `phase4-onboarding-academy-curriculum` recorded the Brand
 * Education / Onboarding Academy curriculum "across its five stages plus the final
 * product/catalogue readiness stage". The Academy SEAMS already existed (the
 * per-gap `academyStage`, `PRE_AUDIT_EDUCATIONAL_GAPS`, and the sibling learning
 * loop). THIS increment builds the ONE owner
 * (`src/config/onboardingCurriculum.ts`) and the pure resolver
 * (`src/lib/education/resolveCurriculum.ts`), which REUSE the learning loop so a
 * topic — and therefore a stage — is complete only when its VALIDATE gate is
 * satisfied. It wires them into the Founder Control Centre and gates them.
 *
 * Status is `built` (consistent with the sibling governance increments — country
 * framework / claims registry / product identity / localisation / learning loop).
 * The node gate is the proof AND browser test 12 renders the surface live.
 *
 * Run: node scripts/reconcile-onboarding-curriculum-registry.cjs
 */
const fs = require('node:fs');
const path = require('node:path');

const REG = path.join(__dirname, '..', 'requirements-registry.json');
const reg = JSON.parse(fs.readFileSync(REG, 'utf8'));
const byId = new Map(reg.entries.map((e) => [e.id, e]));
const DATE = '2026-10-05';

const row = byId.get('phase4-onboarding-academy-curriculum');
if (!row) {
  console.error('MISSING ROW: phase4-onboarding-academy-curriculum');
  process.exit(1);
}

const OLD_STATUS = row.status;
const OLD_EVIDENCE = row.evidence;

row.status = 'built';
row.description =
  'Phase 4 — the Brand Education / Onboarding Academy curriculum across its five stages plus the final ' +
  'product/catalogue readiness stage. BUILT (2026-10-05): the ONE owner `src/config/onboardingCurriculum.ts` declares ' +
  'the five canonical stages (1 Understand Mercenta · 2 Commercial · 3 Product & Packaging · 4 Product Readiness · ' +
  '5 Operations — the taxonomy from MASTER_CHATGPT_HANDOFF §16) plus the final readiness stage, the pinned invariants ' +
  '(CURRICULUM_IS_SEQUENTIAL, FINAL_READINESS_REQUIRES_ALL_STAGES, STAGES_REUSE_CANONICAL_GAPS) and the per-stage ' +
  'topics DERIVED from the canonical educational gaps (no second list). The pure resolver ' +
  '`src/lib/education/resolveCurriculum.ts` REUSES the learning loop, so a topic — and therefore a stage — is ' +
  'complete ONLY when its VALIDATE gate is satisfied by a real signal; the curriculum is SEQUENTIAL, the final ' +
  'readiness stage is a RESULT reached only once every teaching stage is complete, and an unknown stage is REFUSED. ' +
  'Super-Admin governance view on the Founder Control Centre.';
row.evidence =
  'src/config/onboardingCurriculum.ts (the ONE owner); src/lib/education/resolveCurriculum.ts (the pure resolver, ' +
  'reusing the learning loop); src/lib/commandCentre/controlCentre.ts (computes + exposes onboardingCurriculum); ' +
  'src/components/admin/FounderControlCentre.tsx (Brands → Onboarding academy curriculum, Super-Admin only); ' +
  'gate scripts/validate-onboarding-curriculum.mjs (npm run validate:onboarding-curriculum, mutation-proved TWICE); ' +
  'e2e/founder-operating-system.spec.ts test 12 renders it live.';
row.last_verified = DATE;
row.superseded_by = null;
row._audit_note =
  `§PHASE 4 (onboarding academy curriculum) (2026-10-05) — STATUS RAISED not_started -> built (old value recorded ` +
  `inline, never deleted). OLD status: "${OLD_STATUS}". OLD evidence: "${OLD_EVIDENCE}". Built as the ONE owner + ` +
  `the pure resolver over the canonical educational gaps, reusing the learning loop; the five-stage taxonomy is the ` +
  `canonical Phase-4 definition (MASTER_CHATGPT_HANDOFF §16 'Academy stages'). Surface declared in BOTH scope guards ` +
  `(E6 PHASE4_ONBOARDING_CURRICULUM_SCOPE; E7 entries).`;

/* _meta: counts, date, changelog. */
const counts = {};
for (const e of reg.entries) counts[e.status] = (counts[e.status] || 0) + 1;
reg._meta.last_updated = DATE;
reg._meta.total_entries = reg.entries.length;
reg._meta.status_counts = {
  _note:
    'Recomputed 2026-10-05 by scripts/reconcile-onboarding-curriculum-registry.cjs after the §PHASE 4 (onboarding ' +
    'academy curriculum) increment (phase4-onboarding-academy-curriculum not_started -> built; no row added or ' +
    'removed: total_entries stays 540; built +1, not_started -1). Snapshot only.',
  ...counts,
};
reg._meta.onboarding_curriculum_increment = {
  increment: '§PHASE 4 — the onboarding academy curriculum (2026-10-05)',
  restated: ['phase4-onboarding-academy-curriculum'],
  added: [],
  validators: ['scripts/validate-onboarding-curriculum.mjs'],
  note:
    'The Phase-4 Academy seam existed (a per-gap academyStage) but had no owner for the curriculum itself. The ' +
    'owner + the pure resolver declare and enforce the five canonical stages plus the final readiness stage over ' +
    'the canonical educational gaps, reusing the learning loop so a stage closes only when its topics VALIDATE. It ' +
    'is internally Super-Admin only and deterministic (no AI, no clock).',
};

fs.writeFileSync(REG, JSON.stringify(reg, null, 2) + '\n');
console.log(`registry reconciled: total_entries=${reg.entries.length}`);
console.log('status_counts:', JSON.stringify(counts));
