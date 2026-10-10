/**
 * §UI/UX REDESIGN — LEGACY PAGE-SHELL RETIREMENT: registry reconciliation
 * (IDEMPOTENT).
 *
 * The previous pass left an explicit 14-file backlog of surfaces still carrying
 * the pre-workspace page shell. This pass migrated all 14, which retires the
 * debt entirely and flips the gate's assertion from "no new offender" to "no
 * file in src/ may declare it at all".
 *
 * Historical treatment: the old `redesign-legacy-page-shell-backlog` row is NOT
 * deleted — it is marked `superseded_by` the retirement row, so the record of
 * what was outstanding at the previous checkpoint survives.
 *
 * Idempotency: re-running is a no-op (new rows are skipped when their id
 * already exists; existing rows only have evidence/date refreshed).
 *
 * Run: node scripts/reconcile-redesign-backlog-retirement-registry.cjs
 */
/**
 * §BATCH 5 (2026-10-10) — SUPERSEDED, AND GUARDED AGAINST REGRESSION.
 *
 * This tool's `evidence` strings name MERCENTA SOCIAL artefacts that the owner
 * instructed us to REMOVE COMPLETELY (`src/components/brand/MercentaSocial.tsx`,
 * `e2e/embedded-social.spec.ts`). Because the script REFRESHES a row's evidence when
 * it differs, re-running it would OVERWRITE the reconciled rows in
 * `requirements-registry.json` and re-introduce citations of DELETED files.
 *
 * It is kept (history is never deleted) but REFUSES to run by default; those rows
 * are reconciled by hand and the feature's ABSENCE is guarded by
 * `scripts/validate-retired-platforms.mjs` §2c (rule 08).
 */
if (!process.env.ALLOW_SUPERSEDED_SOCIAL_RECONCILE) {
  console.error(
    'reconcile-redesign-backlog-retirement-registry.cjs — SUPERSEDED by §BATCH 5 (2026-10-10): Mercenta Social was removed.\n' +
      'Its rows are reconciled in requirements-registry.json and guarded by\n' +
      'scripts/validate-retired-platforms.mjs §2c. Re-running would re-introduce citations of deleted files.\n' +
      'Set ALLOW_SUPERSEDED_SOCIAL_RECONCILE=1 only if you have read that and still intend to run it.'
  );
  process.exit(1);
}
const fs = require('fs');
const path = 'requirements-registry.json';

const reg = JSON.parse(fs.readFileSync(path, 'utf8'));
const byId = (id) => reg.entries.find((e) => e.id === id);

const SOURCE = 'Complete Platform Redesign — legacy page-shell retirement pass (2026-09-21 session 4)';
const DATE = '2026-09-21';

const NEW = [
  {
    id: 'redesign-legacy-shell-retired',
    description:
      'LEGACY PAGE SHELL FULLY RETIRED — all 14 surfaces that still carried the pre-workspace `p-6 … max-w-[1400px] mx-auto` container were migrated onto `WorkspaceFrame` + `WorkspaceHeader`. `grep -rn "max-w-[1400px]" src/` now returns NO code match anywhere (only explanatory comments). The gate\'s `LEGACY_SHELL_BACKLOG` is EMPTY and its assertion has flipped from "no new offender" to "no file in src/ may declare it at all"; the backlog MECHANISM is deliberately retained (not deleted) so a reintroduction must be explicit and visible in review rather than silent. Header actions/toolbars were moved into the canonical header slots (e.g. the carrier context switch became an aria-pressed toolbar group), and the AccessDenied guard gained a real h1 instead of a lone h2.',
    source: SOURCE,
    status: 'built_and_tested',
    evidence:
      'scripts/validate-workspace-shell.mjs (EXECUTED: WORKSPACE SHELL: 92 PASS / 0 FAIL; Legacy page-shell backlog: 0 file(s) remaining); grep -rn "max-w-[1400px]" src/ returns no code occurrence; migrated: src/components/layout/AdminShell.tsx (AccessDenied), src/components/admin/{CarrierMonitor,ContractsAdminPanel,FulfillmentTrack,MarketingHub,MonitoringDashboard,RetailPipeline}.tsx, src/components/brand/{BrandAdvertising,BrandTeamMessages,ListingAnalyzer,MercentaSocial,OnboardingSummary}.tsx, src/components/carrier/{BakLogistics,CarrierDashboard}.tsx',
    last_verified: DATE,
    superseded_by: null,
  },
  {
    id: 'redesign-admin-carrier-shell-migration',
    description:
      'ADMIN + CARRIER SHELL MIGRATION — the seven admin surfaces and two carrier terminals moved onto the canonical frame/header. Real controls were relocated rather than dropped: the Carrier terminal context switch became a labelled `role="group"` toolbar with `aria-pressed` + `data-state` on every button; Contract Cycle\'s "New Contract" and System Monitoring\'s "Run Health Check" moved into the header action slot; Retail Pipeline\'s locked AND unlocked branches were both migrated; Fulfillment Track kept its tab bar (four views) intact.',
    source: SOURCE,
    status: 'built_and_tested',
    evidence:
      'src/components/carrier/{CarrierDashboard,BakLogistics}.tsx (aria-pressed carrier group, BAK token as header status); src/components/admin/{CarrierMonitor,ContractsAdminPanel,FulfillmentTrack,MarketingHub,MonitoringDashboard,RetailPipeline}.tsx; scripts/validate-workspace-shell.mjs SHELL_MIGRATED_SURFACES assertions (EXECUTED, part of the 92 PASS); e2e/fulfillment-tracks.spec.ts 4 passed; tsc 0 errors; eslint 0 problems; build PASS',
    last_verified: DATE,
    superseded_by: null,
  },
  {
    id: 'redesign-brand-shell-migration',
    description:
      'BRAND SHELL MIGRATION (guards and secondary surfaces) — Brand Advertising (both the no-tenant guard and the main surface, whose simulated-ad badge moved into the header status slot), Support & Team (chat layout preserved via a `flex h-full flex-col` frame), Listing Analyzer (both guard branches, test ids preserved), Mercenta Social (all three branches: no-session, access-denied and the main workspace, with the engine-state badge moved into the header status slot and the `ms-engine-state` / `ms-access-denied` test ids preserved), and Onboarding Complete.',
    source: SOURCE,
    status: 'built_and_tested',
    evidence:
      'src/components/brand/{BrandAdvertising,BrandTeamMessages,ListingAnalyzer,MercentaSocial,OnboardingSummary}.tsx; scripts/validate-workspace-shell.mjs SHELL_MIGRATED_SURFACES (EXECUTED, part of the 92 PASS); e2e/brand-advertising.spec.ts + e2e/listing-analyzer.spec.ts + e2e/embedded-social.spec.ts + e2e/onboarding-handoff.spec.ts + e2e/onboarding-workflow.spec.ts passed in the targeted run',
    last_verified: DATE,
    superseded_by: null,
  },
  {
    id: 'redesign-dom-order-regression-defect',
    description:
      'REAL DEFECT CLASS FOUND AND FIXED (not hidden): the migration changed the DOM text order on Fulfillment Track, so an order-sensitive assertion (`getByText(/Direct Fulfillment/i).first()`) began resolving to a hidden `<option>` inside a `<select>` instead of the visible header copy. Root cause was the header copy written during the migration, not the test. Fixed on the SURFACE — the header description now names both models ("Direct Fulfillment vs Financed"), which is also better IA for a page whose purpose is to document them — and the spec was left untouched. Lesson recorded: a page-header copy change is a DOM-order change and can break order-sensitive selectors.',
    source: SOURCE,
    status: 'built_and_tested',
    evidence:
      'e2e/fulfillment-tracks.spec.ts (1 failed after the migration → 4 passed after fixing the header copy; the spec file itself is unmodified); src/components/admin/FulfillmentTrack.tsx header description',
    last_verified: DATE,
    superseded_by: null,
  },
];

let added = 0;
let refreshed = 0;
for (const row of NEW) {
  const existing = byId(row.id);
  if (!existing) {
    reg.entries.push(row);
    added++;
  } else {
    if (existing.evidence !== row.evidence || existing.last_verified !== row.last_verified) {
      existing.evidence = row.evidence;
      existing.last_verified = row.last_verified;
      refreshed++;
    }
    if (existing.status !== row.status) existing.status = row.status;
  }
}

/* ── Historical treatment: supersede the retired backlog row ───────────── */

const backlog = byId('redesign-legacy-page-shell-backlog');
if (backlog) {
  backlog.superseded_by = 'redesign-legacy-shell-retired';
  backlog.evidence = `${backlog.evidence} — SUPERSEDED by 'redesign-legacy-shell-retired' (all 14 files migrated; gate backlog now 0).`;
  backlog.last_verified = DATE;
}

const gate = byId('redesign-workspace-shell-gate');
if (gate) {
  gate.evidence =
    'scripts/validate-workspace-shell.mjs (EXECUTED: WORKSPACE SHELL: 92 PASS / 0 FAIL; Legacy page-shell backlog: 0 file(s) remaining; SHELL_MIGRATED_SURFACES assertions added for the 14 retired files); package.json script validate:workspace-shell';
  gate.last_verified = DATE;
}

reg._meta = reg._meta || {};
reg._meta.last_reconciled = DATE;
reg._meta.total_entries = reg.entries.length;

fs.writeFileSync(path, JSON.stringify(reg, null, 2) + '\n');

console.log(
  `REDESIGN BACKLOG-RETIREMENT RECONCILE: added ${added}, refreshed ${refreshed}, total_entries ${reg.entries.length}`
);
console.log('superseded: redesign-legacy-page-shell-backlog -> redesign-legacy-shell-retired');
console.log('ids: ' + NEW.map((r) => r.id).join(', '));