/*
 * §PHASE 5 — shared workflow reuse — registry reconciliation (2026-10-06).
 *
 * WHY. The Phase-5 row `phase5-shared-workflow-reuse` recorded "shared workflows
 * so ONE automation supports E2E tests + tutorial recordings + onboarding
 * walkthroughs". The SEAMS already existed (the canonical `TOUR_REGISTRY` guided
 * tours, the `data-tour` anchor contract that a Playwright test also drives, and
 * the canonical `KB_ARTICLES`). THIS increment builds the ONE owner
 * (`src/config/sharedWorkflows.ts`) and the pure fail-closed resolver
 * (`src/lib/education/resolveSharedWorkflow.ts`) that declare each canonical
 * journey and link it to the SAME automation all three consumers share: the
 * canonical tour defines the journey, its step anchors are the SAME contract the
 * E2E test drives, and the steps are DERIVED from the tour (no second list).
 *
 * Status is `built` (consistent with the sibling governance increments — country
 * framework / localisation / learning loop / onboarding curriculum / contextual
 * education). The node gate is the proof AND browser test 14 renders it live.
 *
 * Run: node scripts/reconcile-shared-workflow-reuse-registry.cjs
 */
const fs = require('node:fs');
const path = require('node:path');

const REG = path.join(__dirname, '..', 'requirements-registry.json');
const reg = JSON.parse(fs.readFileSync(REG, 'utf8'));
const byId = new Map(reg.entries.map((e) => [e.id, e]));
const DATE = '2026-10-06';

const row = byId.get('phase5-shared-workflow-reuse');
if (!row) {
  console.error('MISSING ROW: phase5-shared-workflow-reuse');
  process.exit(1);
}

const OLD_STATUS = row.status;
const OLD_EVIDENCE = row.evidence;

row.status = 'built';
row.description =
  'Phase 5 — shared workflows so ONE automation supports E2E tests + tutorial recordings + onboarding ' +
  'walkthroughs. BUILT (2026-10-06): the ONE owner `src/config/sharedWorkflows.ts` declares each canonical ' +
  'journey through the real screens and LINKS it to the single automation all three consumers share — the ' +
  'canonical guided tour drives the onboarding walkthrough AND the tutorial recording, and the same `data-tour` ' +
  'anchors drive the E2E test (pinned invariants ONE_WORKFLOW_OWNER + WORKFLOWS_REUSE_CANONICAL_TOURS + ' +
  'WORKFLOWS_MAP_TO_REAL_E2E_SPECS). The steps are DERIVED from the canonical tour, so there is no second list. ' +
  'The pure fail-closed resolver `src/lib/education/resolveSharedWorkflow.ts` resolves each workflow live; an ' +
  'UNKNOWN workflow id is REFUSED (WORKFLOW_UNKNOWN) and a workflow whose tour does not exist is REFUSED ' +
  '(WORKFLOW_TOUR_MISSING). Super-Admin governance view on the Founder Control Centre.';
row.evidence =
  'src/config/sharedWorkflows.ts (the ONE owner); src/lib/education/resolveSharedWorkflow.ts (the pure ' +
  'fail-closed resolver, deriving the steps from the canonical tour); ' +
  'src/lib/commandCentre/controlCentre.ts (computes + exposes sharedWorkflows); ' +
  'src/components/admin/FounderControlCentre.tsx (Brands → Shared workflows, Super-Admin only); ' +
  'gate scripts/validate-shared-workflow-reuse.mjs (npm run validate:shared-workflow-reuse, mutation-proved TWICE); ' +
  'e2e/founder-operating-system.spec.ts test 14 renders it live.';
row.last_verified = DATE;
row.superseded_by = null;
row._audit_note =
  `§PHASE 5 (shared workflow reuse) (2026-10-06) — STATUS RAISED not_started -> built (old value recorded ` +
  `inline, never deleted). OLD status: "${OLD_STATUS}". OLD evidence: "${OLD_EVIDENCE}". Built as the ONE owner + ` +
  `the pure fail-closed resolver over the canonical tour registry + Knowledge Base, so ONE automation serves the ` +
  `E2E test, the tutorial recording and the onboarding walkthrough and the three can never describe the same ` +
  `journey differently. Surface declared in BOTH scope guards (E6 PHASE5_SHARED_WORKFLOW_SCOPE; E7 entries).`;

/* _meta: counts, date, changelog. */
const counts = {};
for (const e of reg.entries) counts[e.status] = (counts[e.status] || 0) + 1;
reg._meta.last_updated = DATE;
reg._meta.total_entries = reg.entries.length;
reg._meta.status_counts = {
  _note:
    'Recomputed 2026-10-06 by scripts/reconcile-shared-workflow-reuse-registry.cjs after the §PHASE 5 (shared ' +
    'workflow reuse) increment (phase5-shared-workflow-reuse not_started -> built; no row added or removed: ' +
    'total_entries stays 540; built +1, not_started -1). Snapshot only.',
  ...counts,
};
reg._meta.shared_workflow_reuse_increment = {
  increment: '§PHASE 5 — shared workflow reuse (2026-10-06)',
  restated: ['phase5-shared-workflow-reuse'],
  added: [],
  validators: ['scripts/validate-shared-workflow-reuse.mjs'],
  note:
    'The Phase-5 seam (guided tours + the data-tour anchor contract) existed but had no owner declaring the ' +
    'canonical WORKFLOWS that the E2E test, the tutorial recording and the onboarding walkthrough all reuse. The ' +
    'owner + the pure fail-closed resolver declare each journey and derive its steps from the canonical tour; an ' +
    'unknown workflow or a missing tour is REFUSED. It is internally Super-Admin only and deterministic (no AI, ' +
    'no clock).',
};

fs.writeFileSync(REG, JSON.stringify(reg, null, 2) + '\n');
console.log(`registry reconciled: total_entries=${reg.entries.length}`);
console.log('status_counts:', JSON.stringify(counts));
