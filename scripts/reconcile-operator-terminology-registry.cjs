/*
 * §OPERATOR-RELABEL — the non-canonical role name relabelled — registry reconciliation (2026-10-05).
 *
 * WHY. Founder decision T-3 (docs/AMAZON_RECONCILIATION_STATUS.md) declares the
 * canonical human control role to be **Founder / Super Admin**, not "Mercenta
 * Operator". The phrase had leaked into application code as a human review/approval
 * role (16 occurrences in `src/` + 1 in an Edge Function) — a role the type system
 * does not contain. Matrix row D13-14 recorded it as OPEN — RELABEL.
 *
 * This script raises the registry row `s0-discovered-operator-terminology-reconciliation`
 * from `not_started` to `built`, records the OLD status inline (never silently
 * overwritten), and recomputes `_meta`. Status is `built`, NOT `built_and_tested`:
 * the fix is proven by a node gate (`npm run validate:operator-terminology`) and
 * no browser spec exercises the role-name copy.
 *
 * Run: node scripts/reconcile-operator-terminology-registry.cjs
 */
const fs = require('node:fs');
const path = require('node:path');

const REG = path.join(__dirname, '..', 'requirements-registry.json');
const reg = JSON.parse(fs.readFileSync(REG, 'utf8'));
const byId = new Map(reg.entries.map((e) => [e.id, e]));
const DATE = '2026-10-05';

const row = byId.get('s0-discovered-operator-terminology-reconciliation');
if (!row) {
  console.error('MISSING ROW: s0-discovered-operator-terminology-reconciliation');
  process.exit(1);
}

const OLD_STATUS = row.status;
const OLD_DESCRIPTION = row.description;
const OLD_EVIDENCE = row.evidence;

row.status = 'built';
row.description =
  'DISCOVERED (S0): the phrase "Mercenta operator" was used as a human review role in source locations, which ' +
  'contradicted Founder decision T-3 (the canonical human control role is Founder / Super Admin). ' +
  'DONE — RELABELLED (2026-10-05): the non-canonical role name was replaced with **"Founder / Super Admin"** ' +
  'across 16 `src/` occurrences + 1 Edge Function (10 files). This was a wording reconciliation only — the ' +
  'existing Staff/RBAC functionality is retained per T-5 and was NOT deleted to remove the terminology.';
row.evidence =
  'scripts/validate-operator-terminology.mjs (npm run validate:operator-terminology) — asserts NO file under ' +
  '`src/` or `supabase/functions/` uses the non-canonical role name, that every relabelled file names the ' +
  'canonical "Founder / Super Admin", and that the records are no longer stale; mutation-proved (reintroducing ' +
  'the old phrase in a `src/` file trips the gate, exit 1). Relabelled files: src/integrations/registry.ts; ' +
  'src/components/admin/LogisticsControl.tsx; src/components/admin/AccountingPanel.tsx; ' +
  'src/components/admin/ComplianceApprovals.tsx; src/lib/commerce/channelPurchaseOrderIngestion.ts; ' +
  'src/lib/simulation/investorDemo.ts; src/lib/verification/documentVerification.ts; ' +
  'src/lib/finance/financialReconciliation.ts; src/data/api.ts; supabase/functions/payouts-transfer/index.ts. ' +
  'Records updated: docs/MERCENTA_MASTER_FEATURE_FUNCTION_MATRIX.md (D13-14); docs/AMAZON_RECONCILIATION_STATUS.md (T-3).';
row.last_verified = DATE;
row.superseded_by = null;
row._audit_note =
  `§OPERATOR-RELABEL (2026-10-05) — STATUS RAISED not_started -> built (old value recorded inline, never deleted). ` +
  `OLD status: "${OLD_STATUS}". OLD description: "${OLD_DESCRIPTION}". OLD evidence: "${OLD_EVIDENCE}". ` +
  `The phrase is deliberately preserved in decision records and historical reconcile scripts as a NEGATIVE quotation ` +
  `(T-3 records that "Mercenta Operator" is NOT canonical); the gate therefore scans application code only.`;

/* _meta: counts, date, changelog. */
const counts = {};
for (const e of reg.entries) counts[e.status] = (counts[e.status] || 0) + 1;
reg._meta.last_updated = DATE;
reg._meta.total_entries = reg.entries.length;
reg._meta.status_counts = {
  _note:
    'Recomputed 2026-10-05 by scripts/reconcile-operator-terminology-registry.cjs after the §OPERATOR-RELABEL ' +
    'increment (s0-discovered-operator-terminology-reconciliation not_started -> built). Snapshot only.',
  ...counts,
};
reg._meta.operator_relabel_increment = {
  increment: '§OPERATOR-RELABEL — the non-canonical role name relabelled (2026-10-05)',
  restated: ['s0-discovered-operator-terminology-reconciliation'],
  added: [],
  validators: ['scripts/validate-operator-terminology.mjs'],
  note:
    'T-3: the canonical human control role is Founder / Super Admin, not "Mercenta Operator". The phrase was ' +
    'relabelled across 16 `src/` occurrences + 1 Edge Function (10 files); Staff/RBAC untouched. Status is `built`, ' +
    'not `built_and_tested`: no browser spec exercises the role-name copy; the node gate is the proof.',
};

fs.writeFileSync(REG, JSON.stringify(reg, null, 2) + '\n');
console.log(`registry reconciled: total_entries=${reg.entries.length}`);
console.log('status_counts:', JSON.stringify(counts));
