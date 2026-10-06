/*
 * §PHASE 5 — contextual education — registry reconciliation (2026-10-05).
 *
 * WHY. The Phase-5 row `phase5-contextual-education` recorded "contextual field
 * explanations ("why do we need this?") attached to the real screens, reusing the
 * existing Knowledge Base + UserTour architecture". The SEAMS already existed (the
 * canonical `KB_ARTICLES` LEARN content and the canonical `TOUR_REGISTRY` WATCH
 * content). THIS increment builds the ONE owner
 * (`src/config/contextualEducation.ts`) and the pure fail-closed resolver
 * (`src/lib/education/resolveContextualHelp.ts`), which LINK each field explanation
 * to its canonical article + guided tour (the help text is never duplicated). It
 * wires them into the Founder Control Centre and gates them.
 *
 * Status is `built` (consistent with the sibling governance increments — country
 * framework / localisation / learning loop / onboarding curriculum). The node gate
 * is the proof AND browser test 13 renders the surface live.
 *
 * Run: node scripts/reconcile-contextual-education-registry.cjs
 */
const fs = require('node:fs');
const path = require('node:path');

const REG = path.join(__dirname, '..', 'requirements-registry.json');
const reg = JSON.parse(fs.readFileSync(REG, 'utf8'));
const byId = new Map(reg.entries.map((e) => [e.id, e]));
const DATE = '2026-10-05';

const row = byId.get('phase5-contextual-education');
if (!row) {
  console.error('MISSING ROW: phase5-contextual-education');
  process.exit(1);
}

const OLD_STATUS = row.status;
const OLD_EVIDENCE = row.evidence;

row.status = 'built';
row.description =
  'Phase 5 — contextual field explanations ("why do we need this?") attached to the real screens, reusing the ' +
  'existing Knowledge Base + UserTour architecture. BUILT (2026-10-05): the ONE owner ' +
  '`src/config/contextualEducation.ts` declares each real field on a real screen with a short "why do we need this?" ' +
  'explanation that points at the canonical Knowledge Base article which teaches it (LEARN) and the canonical guided ' +
  'tour of that screen (WATCH) — the help text is never duplicated (pinned invariants ' +
  'EXPLANATIONS_REUSE_CANONICAL_KB + EXPLANATIONS_ATTACH_TO_REAL_SCREENS). The pure fail-closed resolver ' +
  '`src/lib/education/resolveContextualHelp.ts` resolves each explanation live from the article + tour registries; an ' +
  'UNKNOWN field key is REFUSED (CONTEXTUAL_HELP_UNKNOWN) and an explanation whose article does not exist is REFUSED ' +
  '(CONTEXTUAL_HELP_ARTICLE_MISSING). Super-Admin governance view on the Founder Control Centre.';
row.evidence =
  'src/config/contextualEducation.ts (the ONE owner); src/lib/education/resolveContextualHelp.ts (the pure ' +
  'fail-closed resolver, linking the canonical Knowledge Base article + guided tour); ' +
  'src/lib/commandCentre/controlCentre.ts (computes + exposes contextualEducation); ' +
  'src/components/admin/FounderControlCentre.tsx (Brands → Contextual education, Super-Admin only); ' +
  'gate scripts/validate-contextual-education.mjs (npm run validate:contextual-education, mutation-proved TWICE); ' +
  'e2e/founder-operating-system.spec.ts test 13 renders it live.';
row.last_verified = DATE;
row.superseded_by = null;
row._audit_note =
  `§PHASE 5 (contextual education) (2026-10-05) — STATUS RAISED not_started -> built (old value recorded ` +
  `inline, never deleted). OLD status: "${OLD_STATUS}". OLD evidence: "${OLD_EVIDENCE}". Built as the ONE owner + ` +
  `the pure fail-closed resolver over the canonical Knowledge Base + tour registries, so the "why do we need this?" ` +
  `explanation on each real field LINKS to the canonical help text rather than duplicating it. Surface declared in ` +
  `BOTH scope guards (E6 PHASE5_CONTEXTUAL_EDUCATION_SCOPE; E7 entries).`;

/* _meta: counts, date, changelog. */
const counts = {};
for (const e of reg.entries) counts[e.status] = (counts[e.status] || 0) + 1;
reg._meta.last_updated = DATE;
reg._meta.total_entries = reg.entries.length;
reg._meta.status_counts = {
  _note:
    'Recomputed 2026-10-05 by scripts/reconcile-contextual-education-registry.cjs after the §PHASE 5 (contextual ' +
    'education) increment (phase5-contextual-education not_started -> built; no row added or removed: total_entries ' +
    'stays 540; built +1, not_started -1). Snapshot only.',
  ...counts,
};
reg._meta.contextual_education_increment = {
  increment: '§PHASE 5 — contextual education (2026-10-05)',
  restated: ['phase5-contextual-education'],
  added: [],
  validators: ['scripts/validate-contextual-education.mjs'],
  note:
    'The Phase-5 seam (a Knowledge Base + guided-tour architecture) existed but had no owner for the field ' +
    'explanations. The owner + the pure fail-closed resolver declare the "why do we need this?" explanation for each ' +
    'real field on a real screen and LINK it to the canonical KB article + tour; an unknown field or a missing ' +
    'article is REFUSED. It is internally Super-Admin only and deterministic (no AI, no clock).',
};

fs.writeFileSync(REG, JSON.stringify(reg, null, 2) + '\n');
console.log(`registry reconciled: total_entries=${reg.entries.length}`);
console.log('status_counts:', JSON.stringify(counts));
