/*
 * §ADMIN-SHELL-CHUNK — the admin-shell bundle budget — registry reconciliation (2026-10-05).
 *
 * WHY. `discovered-adminshell-chunk-size` recorded a REAL build-output finding: the
 * single `AdminShell-*.js` chunk was 909 kB (230 kB gzip) because the shell EAGERLY
 * imported all ~34 admin view panels, so every operator downloaded every panel to
 * open any one of them, and `vite build` warned about a >500 kB chunk. Each panel
 * is now a `React.lazy(() => import(…))` dynamic import rendered inside a
 * `<Suspense>`, so the shell chunk is 16.57 kB and a panel loads only when its view
 * opens (`node_modules` still lands in the ONE `vendor` chunk, the §P3 invariant).
 *
 * This script does three things, all at source:
 *   1. raises `discovered-adminshell-chunk-size` from `not_started` to
 *      `built_and_tested` (proved by the NEW node gate + `e2e/app-shell.spec.ts`,
 *      which navigates admin destinations and therefore loads the lazy chunks);
 *   2. RECONCILES two STALE rows that two sources of truth disagreed on:
 *      `cleanup-p8-inventory-asin` and `cleanup-p10-logistics-hub-completion` both
 *      still said "NOT STARTED - no code exists yet" while the programme document
 *      (docs/DASHBOARD_LOGISTICS_CLEANUP_PROGRAMME_2026-09-22.md §12/§14) records
 *      P8 and P10 DONE and the code + gates exist. They are raised to
 *      `built_and_tested`. (Defect fixed at source per 07-fix-defects-at-source.md.)
 * The OLD value of every field is recorded inline in `_audit_note` — never silently
 * overwritten — and `_meta` is recomputed.
 *
 * Run: node scripts/reconcile-admin-shell-chunk-registry.cjs
 */
const fs = require('node:fs');
const path = require('node:path');

const REG = path.join(__dirname, '..', 'requirements-registry.json');
const reg = JSON.parse(fs.readFileSync(REG, 'utf8'));
const byId = new Map(reg.entries.map((e) => [e.id, e]));
const DATE = '2026-10-05';

/** Raise one row, recording its old value inline. */
function raise(id, status, description, evidence, note) {
  const row = byId.get(id);
  if (!row) {
    console.error('MISSING ROW: ' + id);
    process.exit(1);
  }
  const OLD = { status: row.status, description: row.description, evidence: row.evidence };
  row.status = status;
  row.description = description;
  row.evidence = evidence;
  row.last_verified = DATE;
  row.superseded_by = null;
  row._audit_note =
    `§ADMIN-SHELL-CHUNK (2026-10-05) — STATUS RAISED ${OLD.status} -> ${status} ` +
    `(old value recorded inline, never deleted). OLD status: "${OLD.status}". ` +
    `OLD description: "${OLD.description}". OLD evidence: "${OLD.evidence}". ` + note;
  return OLD.status;
}

/* ── 1. the build item itself ──────────────────────────────────────────────── */
const a = raise(
  'discovered-adminshell-chunk-size',
  'built_and_tested',
  'DISCOVERED by a build output: the `AdminShell` chunk was 1,010 kB (263 kB gzip) and the build warned ' +
    'about it, because the admin shell imported all ~34 admin view panels EAGERLY. FIXED (2026-10-05): every ' +
    'panel is now a `React.lazy(() => import(…))` dynamic import rendered inside a `<Suspense>`, so the shell ' +
    'chunk is 16.57 kB (4.83 kB gzip) and a panel\'s chunk loads only when its view is opened. APP-code ' +
    'splitting only — `node_modules` still lands in the ONE `vendor` chunk required by the §P3 ' +
    'initialisation-cycle fix (asserted here and by validate-production-boot).',
  'scripts/validate-admin-shell-bundle.mjs (npm run validate:admin-shell-bundle) — asserts the shell holds NO ' +
    'static import from `@/components/admin/`, declares ≥30 `lazy(() => import(` bindings, renders its switch ' +
    'inside a `<Suspense>`, keeps exactly ONE `vendor` chunk, holds the AdminShell chunk ≤ 300 kB, and splits ' +
    '≥25 panels (incl. the heaviest, AdminDashboard — §BATCH 4 (2026-10-10) removed the former second heavy panel, ' +
    'MercentaBrain) into their own chunks. PROVED ABLE TO ' +
    'FAIL against the pre-fix bundle (7/9 assertions fail: eager imports, no lazy bindings, no Suspense, ' +
    '890 kB shell chunk, 0 panel chunks). Browser: e2e/app-shell.spec.ts navigates admin destinations ' +
    '(e.g. `nav >> text=Super Admin`) and therefore loads the lazily-split panel chunks.',
  'This row was a genuine PERFORMANCE defect, not a coverage gap.'
);

/* ── 2. the two STALE cleanup rows — reconciled at source ──────────────────── */
raise(
  'cleanup-p8-inventory-asin',
  'built_and_tested',
  "P8: inventory linked to the brand's catalogue with an ASIN field - brand-entered inside Mercenta (never an " +
    'Amazon login); ASIN added by the brand if the product already exists, otherwise populated by Mercenta when ' +
    'Amazon accepts the product (clearly-simulated placeholder in simulation; the code never invents a ' +
    'real-looking ASIN). DONE (programme P8, 2026-09-23).',
  'scripts/validate-p8-inventory.mjs (npm run validate:inventory) — the §P8 contract gate (append-only movement ' +
    'ledger, every figure derived; Eaches/Cases fail-closed; the declaration path + the channel-assignment path; ' +
    'the attributed admin override). Domain owners: src/lib/inventory/inventoryLifecycle.ts, ' +
    'src/lib/inventory/inventoryRecord.ts, src/lib/inventory/channelInventoryPush.ts. Browser: ' +
    'e2e/inventory.spec.ts (real Chromium walkthrough of the P8 surfaces). Programme record: ' +
    'docs/DASHBOARD_LOGISTICS_CLEANUP_PROGRAMME_2026-09-22.md §12.',
  'This row was STALE — two sources of truth disagreed. The programme document §12 and the code + gate record ' +
    'P8 DONE, while this row still claimed "NOT STARTED - no code exists yet".'
);

raise(
  'cleanup-p10-logistics-hub-completion',
  'built_and_tested',
  'P10: Logistics Hub completion - provider configuration + the PO documents; consolidation recorded as ' +
    'documented-but-DEFERRED with the model supporting 1..n POs. DONE (programme P10, 2026-09-24).',
  'scripts/validate-po-documents.mjs (npm run validate:po-documents) — the PO-document gate (53 assertions), ' +
    'including the §P10 provider-configuration + PO-document-download-queue assertions; ' +
    'scripts/validate-logistics-providers.mjs (npm run validate:logistics-providers, 96 assertions) proves the ' +
    'domain behaviour. Browser: e2e/logistics-providers.spec.ts (real Chromium walkthrough). Programme record: ' +
    'docs/DASHBOARD_LOGISTICS_CLEANUP_PROGRAMME_2026-09-22.md §14 (matrix D10-10, decision 11).',
  'This row was STALE — two sources of truth disagreed. The programme document §14 and the code + gates record ' +
    'P10 DONE, while this row still claimed "NOT STARTED - no code exists yet".'
);

/* ── _meta: counts, date, changelog ────────────────────────────────────────── */
const counts = {};
for (const e of reg.entries) counts[e.status] = (counts[e.status] || 0) + 1;
reg._meta.last_updated = DATE;
reg._meta.total_entries = reg.entries.length;
reg._meta.status_counts = {
  _note:
    'Recomputed 2026-10-05 by scripts/reconcile-admin-shell-chunk-registry.cjs after the §ADMIN-SHELL-CHUNK ' +
    'increment (discovered-adminshell-chunk-size not_started -> built_and_tested; the two STALE cleanup rows ' +
    'cleanup-p8-inventory-asin + cleanup-p10-logistics-hub-completion not_started -> built_and_tested). Snapshot only.',
  ...counts,
};
reg._meta.admin_shell_chunk_increment = {
  increment: '§ADMIN-SHELL-CHUNK — the admin-shell bundle budget (2026-10-05)',
  restated: [
    'discovered-adminshell-chunk-size',
    'cleanup-p8-inventory-asin',
    'cleanup-p10-logistics-hub-completion',
  ],
  added: [],
  validators: ['scripts/validate-admin-shell-bundle.mjs'],
  note:
    'The admin shell imported all ~34 panels eagerly (909 kB chunk). Each panel is now lazy + Suspense, so the ' +
    'shell chunk is 16.57 kB. The two cleanup rows were STALE (they claimed no code existed while the programme ' +
    'document and the code + gates record P8/P10 DONE) — reconciled at source, not mirrored.',
};

fs.writeFileSync(REG, JSON.stringify(reg, null, 2) + '\n');
console.log(`registry reconciled: total_entries=${reg.entries.length}`);
console.log('status_counts:', JSON.stringify(counts));

