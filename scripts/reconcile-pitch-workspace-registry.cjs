/*
 * §PHASE 8 — the founder capital workspace / pitch workspace — registry reconciliation (2026-10-06).
 *
 * WHY. The Phase-8 row `phase8-financier-pitch-workspace` recorded the founder capital
 * workspace — Mercenta overview, business model, Vendor infrastructure, acquisition
 * pipeline, purchase volumes, supplier payment requirements, capital requirements,
 * facility request, repayment model, risk controls, evidence, documents, contact
 * history, meetings, follow-ups and pitch preparation — with the rule that "AI may help
 * prepare/explain; the financial numbers stay deterministic". THIS increment builds the
 * ONE owner (`src/config/pitchWorkspace.ts` — the section structure, each section naming
 * how its content is produced) and the pure resolver
 * (`src/lib/finance/pitchWorkspace.ts`), and raises the row to `built`.
 *
 * The row's old evidence ("docs — roadmap §PHASE 8") was a STALE citation — the roadmap
 * lives in `docs/archive/MASTER_CHATGPT_HANDOFF.md` — so it is replaced here by the real
 * built artefacts.
 *
 * Run: node scripts/reconcile-pitch-workspace-registry.cjs
 */
const fs = require('node:fs');
const path = require('node:path');

const REG = path.join(__dirname, '..', 'requirements-registry.json');
const reg = JSON.parse(fs.readFileSync(REG, 'utf8'));
const byId = new Map(reg.entries.map((e) => [e.id, e]));
const DATE = '2026-10-06';

const row = byId.get('phase8-financier-pitch-workspace');
if (!row) {
  console.error('MISSING ROW: phase8-financier-pitch-workspace');
  process.exit(1);
}

const OLD_STATUS = row.status;
const OLD_EVIDENCE = row.evidence;

row.status = 'built';
row.description =
  'Phase 8 — the founder capital workspace: Mercenta overview, business model, Vendor infrastructure, ' +
  'acquisition pipeline, purchase volumes, supplier payment requirements, capital requirements, facility ' +
  'request, repayment model, risk controls, evidence, documents, contact history, meetings, follow-ups and ' +
  'pitch preparation, where AI may help prepare/explain but the financial numbers stay deterministic. ' +
  'BUILT (2026-10-06): the ONE owner `src/config/pitchWorkspace.ts` declares the workspace once — each of ' +
  'the sixteen sections names HOW its content is produced, so every financial section names its ' +
  'deterministic canonical owner and AI may draft only the narrative. The pure resolver ' +
  '`src/lib/finance/pitchWorkspace.ts` applies it: an unknown section is REFUSED ' +
  '(PITCH_SECTION_UNKNOWN), a financial section produced by anyone but its canonical owner is REFUSED ' +
  '(PITCH_FINANCIAL_REQUIRES_DETERMINISTIC_SOURCE), AI producing anything but narrative is REFUSED ' +
  '(PITCH_AI_MAY_ONLY_DRAFT_NARRATIVE) and the workspace is not READY while a required section is missing ' +
  '(PITCH_REQUIRES_ALL_REQUIRED_SECTIONS). Deterministic (no AI, no clock) and internal (Super-Admin only).';
row.evidence =
  'src/config/pitchWorkspace.ts (the ONE owner); src/lib/finance/pitchWorkspace.ts (the pure fail-closed ' +
  'resolver); src/lib/commandCentre/controlCentre.ts (computes + exposes pitchWorkspace); ' +
  'src/components/admin/FounderControlCentre.tsx (Finance → Pitch workspace, Super-Admin only); gate ' +
  'scripts/validate-pitch-workspace.mjs (npm run validate:pitch-workspace, mutation-proved TWICE); ' +
  'e2e/founder-operating-system.spec.ts test 16 renders it live.';
row.last_verified = DATE;
row.superseded_by = null;
row._audit_note =
  `§PHASE 8 (pitch workspace) (2026-10-06) — STATUS RAISED not_started -> built (old value recorded ` +
  `inline, never deleted). OLD status: ${JSON.stringify(OLD_STATUS)}. OLD evidence: ` +
  `${JSON.stringify(OLD_EVIDENCE)} (a STALE "roadmap §PHASE 8" citation, fixed at source). Built as the ONE ` +
  `owner + the pure fail-closed resolver: every FINANCIAL figure comes from its deterministic canonical ` +
  `owner and AI may help only the narrative — a financial section is never produced by AI, and the workspace ` +
  `is not ready while a required section is missing. Surface declared in BOTH scope guards (E6 ` +
  `PHASE8_PITCH_WORKSPACE_SCOPE; E7 entries).`;

/* _meta: counts, date, changelog. */
const counts = {};
for (const e of reg.entries) counts[e.status] = (counts[e.status] || 0) + 1;
reg._meta.last_updated = DATE;
reg._meta.total_entries = reg.entries.length;
reg._meta.status_counts = {
  _note:
    'Recomputed 2026-10-06 by scripts/reconcile-pitch-workspace-registry.cjs after the §PHASE 8 ' +
    '(pitch workspace) increment (phase8-financier-pitch-workspace not_started -> built; no row added or ' +
    'removed: total_entries stays 540; built +1, not_started -1). Snapshot only.',
  ...counts,
};
reg._meta.pitch_workspace_increment = {
  increment: '§PHASE 8 — the founder capital workspace / pitch workspace (2026-10-06)',
  restated: ['phase8-financier-pitch-workspace'],
  added: [],
  validators: ['scripts/validate-pitch-workspace.mjs'],
  note:
    'The founder capital workspace (the capital case Mercenta prepares for a financing partner) had no ' +
    'owner; it was described only in the roadmap. The owner + the pure fail-closed resolver declare it ' +
    'once: each section names HOW its content is produced, so every financial figure comes from its ' +
    'deterministic canonical owner and AI may help only the narrative; an unknown section, an AI-produced ' +
    'figure or an incomplete pitch is REFUSED. It is internal (Super-Admin only) and deterministic (no AI ' +
    'figure, no clock).',
};

fs.writeFileSync(REG, JSON.stringify(reg, null, 2) + '\n');
console.log(`registry reconciled: total_entries=${reg.entries.length}`);
console.log('status_counts:', JSON.stringify(counts));
