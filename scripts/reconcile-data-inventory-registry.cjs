/*
 * §PHASE 15 — THIRD-PARTY DATA INVENTORY — registry reconciliation (2026-10-05).
 *
 * WHY. Phase 15's legal/privacy gate needed "a third-party data inventory" and it
 * lived only as prose. This session built it as a single-owner module
 * (`src/config/dataProcessing.ts`) with a real gate
 * (`scripts/validate-data-inventory.mjs`), and wired the privacy policy's "who we
 * share it with" section to READ the owner. The gate's `phase15-legal-privacy`
 * row is updated to say the inventory is now BUILT (still blocked on legal
 * sign-off), and a NEW row records the inventory owner + gate.
 *
 * Run: node scripts/reconcile-data-inventory-registry.cjs
 */
const fs = require('node:fs');
const path = require('node:path');

const REG = path.join(__dirname, '..', 'requirements-registry.json');
const reg = JSON.parse(fs.readFileSync(REG, 'utf8'));
const byId = new Map(reg.entries.map((e) => [e.id, e]));
const DATE = '2026-10-05';

/* The legal/privacy row: the inventory is now BUILT (status stays `blocked` —
   legal sign-off remains a human decision). */
const legal = byId.get('phase15-legal-privacy');
if (!legal) {
  console.error('MISSING ROW: phase15-legal-privacy');
  process.exit(1);
}
legal.status = 'blocked';
legal.evidence =
  'src/config/dataProcessing.ts; src/components/marketing/PrivacyPolicy.tsx · src/components/marketing/TermsOfService.tsx · ' +
  'src/components/marketing/CookieNotice.tsx · scripts/validate-phase15-launch.mjs · scripts/validate-data-inventory.mjs. ' +
  '§Phase 15 (2026-10-05, was: blocked): the privacy policy, terms, cookie notice AND the third-party data inventory are now ' +
  'BUILT — the policy derives its processor list from the inventory owner, gated by `validate:data-inventory`. STILL BLOCKED on ' +
  'LEGAL SIGN-OFF of the published wording and of the inventory — a human/business decision, not a repository change.';
legal.last_verified = DATE;
legal.superseded_by = null;

/* NEW row: the inventory owner + its gate. Status is `built`, NOT
   `built_and_tested`: the enum's `built_and_tested` requires an e2e reference and
   no browser test exercises the inventory specifically (it is proven by the node
   gate). */
const INVENTORY_ROW = {
  id: 'phase15-data-inventory-owner',
  description:
    'Phase 15 — the third-party data inventory (UK GDPR Article 30 register) as a single-owner module, plus the gate that keeps it complete against the integration registry and prevents a supplier name leaking into public copy',
  source: '§Phase 15 legal/privacy gate (2026-10-05)',
  status: 'built',
  evidence:
    'src/config/dataProcessing.ts; scripts/validate-data-inventory.mjs; package.json · src/components/marketing/PrivacyPolicy.tsx. ' +
    '§Phase 15: 23 processors declared, 17 public-safe categories, 2 reasoned exclusions; the gate proves every registered provider is ' +
    'declared or consciously excluded, the legal sign-off stays PENDING, and no supplier name leaks into the public projection — ' +
    'proved able to fail (2 mutations, file restored byte-identical).',
  last_verified: DATE,
  superseded_by: null,
};
const existing = byId.get(INVENTORY_ROW.id);
if (existing) {
  Object.assign(existing, INVENTORY_ROW);
} else {
  reg.entries.push(INVENTORY_ROW);
}

/* _meta: counts, date, changelog. */
const counts = {};
for (const e of reg.entries) counts[e.status] = (counts[e.status] || 0) + 1;
reg._meta.last_updated = DATE;
reg._meta.total_entries = reg.entries.length;
reg._meta.status_counts = {
  _note:
    'Recomputed 2026-10-05 by scripts/reconcile-data-inventory-registry.cjs after the third-party data inventory increment ' +
    '(phase15-legal-privacy restated; +1 row phase15-data-inventory-owner). Snapshot only.',
  ...counts,
};
reg._meta.data_inventory_increment = {
  increment: '§PHASE 15 — THIRD-PARTY DATA INVENTORY (2026-10-05)',
  added: ['phase15-data-inventory-owner'],
  validator: 'scripts/validate-data-inventory.mjs',
  note:
    'src/config/dataProcessing.ts is the ONE owner of the processor inventory; the privacy policy reads its public-safe projection. ' +
    'Gates: validate:data-inventory (15 assertions) + validate:phase15-launch now 63/63 repo-side.',
};

fs.writeFileSync(REG, JSON.stringify(reg, null, 2) + '\n');
console.log(`registry reconciled: total_entries=${reg.entries.length}`);
console.log('status_counts:', JSON.stringify(counts));
