/*
 * §PHASE 11 — Founder intelligence expansion — registry reconciliation (2026-10-06).
 *
 * WHY. The row `phase11-founder-intelligence-expansion` recorded the founder intelligence
 * expansion: the founder's standing questions, each answered from a canonical deterministic
 * owner, with AI permitted to SUMMARISE only. THIS increment builds the ONE owner
 * (`src/config/founderIntelligence.ts`) and the pure fail-closed resolver
 * (`src/lib/intelligence/founderIntelligence.ts`), surfaces it on the Super-Admin Founder
 * Control Centre (Business view) and raises the row to `built`.
 *
 * Run: node scripts/reconcile-founder-intelligence-registry.cjs
 */
const fs = require('node:fs');
const path = require('node:path');

const REG = path.join(__dirname, '..', 'requirements-registry.json');
const reg = JSON.parse(fs.readFileSync(REG, 'utf8'));
const byId = new Map(reg.entries.map((e) => [e.id, e]));
const DATE = '2026-10-06';

const row = byId.get('phase11-founder-intelligence-expansion');
if (!row) {
  console.error('MISSING ROW: phase11-founder-intelligence-expansion');
  process.exit(1);
}

const OLD_STATUS = row.status;
const OLD_EVIDENCE = row.evidence;

row.status = 'built';
row.description =
  'Phase 11 — the founder intelligence expansion: the founder’s standing questions ' +
  '(what is happening, what needs attention, what opportunities exist, what is blocked, ' +
  'which brands to pursue, which products matter, which POs need action, where capital is ' +
  'tied up, where financing is needed, which financier conversations need follow-up, what ' +
  'changed this week). BUILT (2026-10-06): the ONE owner ' +
  '`src/config/founderIntelligence.ts` declares the eleven questions once, each naming the ' +
  'canonical owner that DETERMINISTICALLY answers it; the pure resolver ' +
  '`src/lib/intelligence/founderIntelligence.ts` applies ONE rule FAIL-CLOSED — the DATA ' +
  'behind an answer comes only from its declared canonical owner (AI is REFUSED as the ' +
  'producer of data), while AI (or a human) MAY produce a SUMMARY. An unknown question is ' +
  'REFUSED. Canonical deterministic data stays the source of truth. Deterministic (no AI, ' +
  'no clock) and internal (Super-Admin surface only).';
row.evidence =
  'src/config/founderIntelligence.ts (the ONE owner — the eleven founder questions + the ' +
  'rule over them); src/lib/intelligence/founderIntelligence.ts (the pure fail-closed ' +
  'resolver); src/lib/commandCentre/controlCentre.ts (computes + exposes ' +
  'founderIntelligence); src/components/admin/FounderControlCentre.tsx (Business → Founder ' +
  'intelligence, Super-Admin only); gate scripts/validate-founder-intelligence.mjs ' +
  '(npm run validate:founder-intelligence, mutation-proved TWICE); ' +
  'e2e/founder-operating-system.spec.ts test 20 renders it live.';
row.last_verified = DATE;
row.superseded_by = null;
row._audit_note =
  `§PHASE 11 (Founder intelligence expansion) (2026-10-06) — STATUS RAISED not_started -> ` +
  `built (old value recorded inline, never deleted). OLD status: ${JSON.stringify(OLD_STATUS)}. ` +
  `OLD evidence: ${JSON.stringify(OLD_EVIDENCE)}. Built as the ONE owner + the pure ` +
  `fail-closed resolver: every question names the canonical owner that deterministically ` +
  `answers it, AI may only SUMMARISE (an AI-supplied figure is refused), and an unknown ` +
  `question is refused. Surface declared in BOTH scope guards (E6 ` +
  `PHASE11_FOUNDER_INTELLIGENCE_SCOPE; E7 PHASE11_FOUNDER_INTELLIGENCE_DECLARED + allowed ` +
  `entries).`;

/* _meta: counts, date, changelog. */
const counts = {};
for (const e of reg.entries) counts[e.status] = (counts[e.status] || 0) + 1;
reg._meta.last_updated = DATE;
reg._meta.total_entries = reg.entries.length;
reg._meta.status_counts = {
  _note:
    'Recomputed 2026-10-06 by scripts/reconcile-founder-intelligence-registry.cjs after the ' +
    '§PHASE 11 (founder intelligence expansion) increment ' +
    '(phase11-founder-intelligence-expansion not_started -> built; no row added or removed: ' +
    'total_entries stays 540; built +1, not_started -1). Snapshot only.',
  ...counts,
};
reg._meta.founder_intelligence_increment = {
  increment: '§PHASE 11 — Founder intelligence expansion (2026-10-06)',
  restated: ['phase11-founder-intelligence-expansion'],
  added: [],
  validators: ['scripts/validate-founder-intelligence.mjs'],
  note:
    'The founder’s standing questions had no single owner. The owner declares the eleven ' +
    'questions once and the pure fail-closed resolver applies ONE rule over them: the data ' +
    'behind an answer comes only from its declared canonical owner, AI may only summarise, ' +
    'and an unknown question is refused. It is internal (Super-Admin) and deterministic (no ' +
    'AI, no clock).',
};

fs.writeFileSync(REG, JSON.stringify(reg, null, 2) + '\n');
console.log(`registry reconciled: total_entries=${reg.entries.length}`);
console.log('status_counts:', JSON.stringify(counts));