/*
 * §PHASE 5 — The tutorial recordings — registry reconciliation (2026-10-08).
 *
 * WHY. The row `phase5-tutorial-recording` recorded that the platform needs REAL
 * Mercenta UI tutorial recordings with tutorial VERSIONING, UI-VERSION
 * COMPATIBILITY, OUTDATED-tutorial DETECTION and REUSABLE ASSETS. THIS increment
 * builds the ONE owner (`src/config/tutorialRecordings.ts`) and the pure
 * fail-closed resolver (`src/lib/education/resolveTutorialRecording.ts`), surfaces
 * it on the Super-Admin Founder Control Centre (Communications view) and raises the
 * row to `built`. No recording asset is captured yet, so NO tutorial is shown as
 * playable — the row records the WHAT and the RULE; nothing is invented.
 *
 * Run: node scripts/reconcile-tutorial-recordings-registry.cjs
 */
const fs = require('node:fs');
const path = require('node:path');

const REG = path.join(__dirname, '..', 'requirements-registry.json');
const reg = JSON.parse(fs.readFileSync(REG, 'utf8'));
const byId = new Map(reg.entries.map((e) => [e.id, e]));
const DATE = '2026-10-08';

const row = byId.get('phase5-tutorial-recording');
if (!row) {
  console.error('MISSING ROW: phase5-tutorial-recording');
  process.exit(1);
}

const OLD_STATUS = row.status;
const OLD_EVIDENCE = row.evidence;
const OLD_DESCRIPTION = row.description;

row.status = 'built';
row.description =
  'Phase 5 — the tutorial recordings, with tutorial versioning, UI-version compatibility, ' +
  'outdated-tutorial detection and reusable assets. BUILT (2026-10-08): the ONE owner ' +
  '`src/config/tutorialRecordings.ts` declares the ONE served UI version and the tutorial ' +
  'catalogue — one recording per canonical SHARED WORKFLOW (the workflow ids REUSED from ' +
  '`src/config/sharedWorkflows.ts`, never re-declared), each declaring the UI version it is ' +
  'compatible with, its own version and its reusable asset (one asset per workflow, derived from ' +
  'the workflow id). The pure fail-closed resolver `src/lib/education/resolveTutorialRecording.ts` ' +
  'applies ONE rule: a recording is CURRENT only when its asset genuinely exists AND its compatible ' +
  'UI version equals the served version; an unknown id, no workflow, an unknown workflow and a ' +
  'missing asset are ALL refused, an uncaptured asset is PENDING and a recording on an older UI ' +
  'version is DETECTED as OUTDATED — never shown as if it worked. Deterministic (no AI, no clock) ' +
  'and internal (Super-Admin only).';
row.evidence =
  'src/config/tutorialRecordings.ts (the ONE owner — the served UI version + the tutorial ' +
  'catalogue, each recording REUSING a canonical shared workflow and declaring a compatible UI ' +
  'version, its version and a reusable asset); src/lib/education/resolveTutorialRecording.ts (the ' +
  'pure fail-closed resolver); src/lib/commandCentre/controlCentre.ts (computes + exposes ' +
  'tutorialRecordings); src/components/admin/FounderControlCentre.tsx (Communications → Tutorial ' +
  'recordings, Super-Admin only); gate scripts/validate-tutorial-recordings.mjs ' +
  '(npm run validate:tutorial-recordings, 35 assertions, mutation-proved TWICE); ' +
  'e2e/founder-operating-system.spec.ts test 25 renders it live.';
row.last_verified = DATE;
row.superseded_by = null;
row._audit_note =
  `§PHASE 5 (tutorial recordings) (2026-10-08) — STATUS RAISED not_started -> built (old values ` +
  `recorded inline, never deleted). OLD status: ${JSON.stringify(OLD_STATUS)}. OLD description: ` +
  `${JSON.stringify(OLD_DESCRIPTION)}. OLD evidence: ${JSON.stringify(OLD_EVIDENCE)}. Built as the ` +
  `ONE owner + the pure fail-closed resolver: one recording per canonical shared workflow (workflow ` +
  `ids REUSED), each declaring the UI version it is compatible with against the ONE served version; a ` +
  `recording is CURRENT only when its asset genuinely exists AND its version matches the served ` +
  `version, an uncaptured tutorial is PENDING and an older-UI-version recording is DETECTED as ` +
  `OUTDATED — nothing is ever fabricated. Surface declared in the E6 scope guard ` +
  `(PHASE5_TUTORIAL_RECORDINGS_SCOPE).`;

/* _meta: counts, date, changelog. */
const counts = {};
for (const e of reg.entries) counts[e.status] = (counts[e.status] || 0) + 1;
reg._meta.last_updated = DATE;
reg._meta.total_entries = reg.entries.length;
reg._meta.status_counts = {
  _note:
    'Recomputed 2026-10-08 by scripts/reconcile-tutorial-recordings-registry.cjs after the §PHASE 5 ' +
    '(tutorial recordings) increment (phase5-tutorial-recording not_started -> built; no row added or ' +
    'removed: total_entries stays 540; built +1, not_started -1). Snapshot only.',
  ...counts,
};

fs.writeFileSync(REG, JSON.stringify(reg, null, 2) + '\n');
console.log('[reconcile-tutorial-recordings] phase5-tutorial-recording not_started -> built');
console.log('[reconcile-tutorial-recordings] counts:', JSON.stringify(counts));
