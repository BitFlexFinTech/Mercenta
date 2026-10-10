// §ADMIN-SHELL-CHUNK — THE PORTAL-SHELL BUNDLE BUDGET GATE (AdminShell + BrandShell).
//
// WHY THIS EXISTS
// ---------------
// `discovered-adminshell-chunk-size` recorded a REAL build-output finding: the
// admin portal's single `AdminShell-*.js` chunk was 909 kB (230 kB gzip) because
// the shell EAGERLY imported all ~34 admin view panels — so an operator
// downloaded every panel to open any one of them, and `vite build` warned
// ("Some chunks are larger than 500 kB after minification").
//
// The SAME defect was found in `BrandShell` in the same session — ~637 kB, 24
// eagerly imported brand view panels — and is fixed in the same increment, so
// this gate covers BOTH portal shells (AdminShell AND BrandShell).
//
// The fix is APP-level code splitting: each panel is reached by a
// `React.lazy(() => import(…))` dynamic import and rendered inside a
// `<Suspense>`, so the shell ships small and a panel's chunk loads only when its
// view is opened. `node_modules` still lands in ONE `vendor` chunk — the §P3
// initialisation-cycle fix — and that invariant is asserted here too, so this
// gate can never be satisfied by re-splitting the vendor graph.
//
// WHAT IT ASSERTS
// ---------------
//  Source contract (static):
//   1. AdminShell.tsx holds NO static `import … from '@/components/admin/…'` —
//      every admin panel must be reached by a dynamic import.
//   2. AdminShell.tsx declares at least MIN_LAZY `lazy(() => import(` bindings.
//   3. AdminShell.tsx renders its view switch inside a `<Suspense>`.
//  Build output (the real, measured contract):
//   4. exactly ONE `vendor-*.js` chunk (the §P3 single-vendor invariant);
//   5. an `AdminShell-*.js` chunk exists and is ≤ ADMIN_SHELL_BUDGET_KB;
//   6. at least MIN_PANEL_CHUNKS distinct panel chunks exist by basename;
//   7. the heaviest panel (AdminDashboard) is split into its own chunk.
//      §BATCH 4 (2026-10-10) — REPOINTED: `MercentaBrain` was the second heavy
//      panel; the Mercenta Brain was removed by owner instruction, so only
//      `AdminDashboard` is named here now.
//
// PROVED ABLE TO FAIL: run against the PRE-FIX bundle (eager imports) it fails
// 1, 2, 3, 5, 6 and 7 (recorded in the session report).
//
// USAGE: node scripts/validate-admin-shell-bundle.mjs [--no-build]
//   (default: run `npm run build` first; --no-build reads the existing dist/.)
import { readFileSync, readdirSync, statSync, existsSync } from 'node:fs';
import { execSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

let failures = 0;
let checks = 0;
const test = (name, ok, detail) => {
  checks++;
  console.log(`${ok ? '✓' : '✗'} ${name}`);
  if (!ok) {
    failures++;
    if (detail !== undefined) console.log(`      ${String(detail).slice(0, 600)}`);
  }
};

const ROOT = fileURLToPath(new URL('..', import.meta.url));
const read = (p) => readFileSync(`${ROOT}/${p}`, 'utf8');
/**
 * The portal shells this gate covers. §ADMIN-SHELL-CHUNK (2026-10-05) found the
 * SAME defect in BOTH: a shell that eagerly imported all of its view panels put
 * them all in ONE chunk (AdminShell 909 kB, BrandShell ~637 kB), so a user
 * downloaded every panel to open any one of them.
 *
 * Vite names a dynamic-import chunk `<basename>-<hash>.js`, which is how the
 * "is this panel split into its own chunk?" assertions below work.
 */
const SHELLS = [
  {
    label: 'AdminShell',
    file: 'src/components/layout/AdminShell.tsx',
    dir: '@/components/admin/',
    /** the shell chunk budget, in kB (measured 16.57 kB after the split) */
    budget: 300,
    /** how many of the panels must be split into their own chunk */
    minPanels: 25,
    /** how many `lazy(() => import(` bindings the shell must declare */
    minLazy: 30,
    panels: [
      'AdminDashboard', 'LogisticsControl', 'BrandCRM', 'CatalogManagerAdmin',
      'ComplianceApprovals', 'MarketingHub', 'IntegrationsPanel', 'UsertourAdminPanel',
      'PostizAdminPanel', 'WhatsAppAdminPanel', 'FulfillmentTrack', 'RetailPipeline',
      'BillingPanel', 'ContractsAdminPanel', 'MessagesHub', 'HelpdeskDashboard',
      'ReturnsTrackingDashboard', 'MonitoringDashboard', 'AdminPurchaseOrderList',
      'SuperAdminPanel', 'AdminAuditLog', 'BrandIntelligencePanel',
      'BrandIntelligenceStrategyPanel', 'OpportunityDiscoveryPanel',
      'ProductDiscoveryPanel', 'RegionalPriorityPanel', 'AmazonAdsDashboard',
      'FounderControlCentre', 'FounderInvestorCentre',
      'PartnershipsCentre', 'OnboardingPipeline', 'WorkManagement',
    ],
    /* §BATCH 4 (2026-10-10) — 'MercentaBrain' left both lists with the surface. */
    heavy: ['AdminDashboard'],
  },
  {
    label: 'BrandShell',
    file: 'src/components/layout/BrandShell.tsx',
    dir: '@/components/brand/',
    /** the shell chunk budget, in kB */
    budget: 300,
    minPanels: 18,
    minLazy: 20,
    panels: [
      'BrandDashboard', 'OnboardingWizard', 'OnboardingSummary', 'ProductCatalog',
      'BrandInventory', 'LogisticsHub', 'ComplianceHub', 'BrandContractView',
      'BrandPurchaseOrders', 'BrandReturns', 'BrandReports', 'BrandSelfService',
      'BrandSettings', 'BrandTeamMessages', 'BrandSocialConnect', 'BrandIntelligence',
      'CommercialReadiness', 'BrandAdvertising', 'ListingAnalyzer',
      'SalesEstimatorCard', 'SalesAnalytics', 'WorkManagement', 'BrandSupport',
    ],
    heavy: ['ProductCatalog', 'LogisticsHub'],
  },
];




/* ── 1–3. the source contract (per shell) ─────────────────────────────────── */
for (const s of SHELLS) {
  const src = read(s.file);

  // An EAGER import is `… from '@/components/<dir>/…';`. A LAZY one is
  // `import('@/components/<dir>/…')` — which contains no `from '`, so this
  // discriminates cleanly.
  const eager = src
    .split('\n')
    .filter((l) => /^\s*import\b/.test(l) && l.includes(`from '${s.dir}`));
  test(`${s.label} holds NO static import from ${s.dir} (every panel is a dynamic import)`,
    eager.length === 0, eager.map((l) => l.trim()).join(' | '));

  const lazyBindings = [...src.matchAll(/lazy\(\s*\(\)\s*=>\s*import\(/g)].length;
  test(`${s.label} declares at least ${s.minLazy} lazy(() => import(...)) panel bindings`,
    lazyBindings >= s.minLazy, `${lazyBindings} found`);

  test(`${s.label} renders its view switch inside a <Suspense>`,
    /<Suspense\b/.test(src));
}

/* ── 4–7. the build output ────────────────────────────────────────────────── */
const noBuild = process.argv.includes('--no-build');
const distAssets = `${ROOT}/dist/assets`;
if (!noBuild) {
  console.log('· building (npm run build) …');
  execSync('npm run build', { cwd: ROOT, stdio: 'inherit' });
}

if (!existsSync(distAssets)) {
  test('dist/assets exists (run without --no-build to build)', false, distAssets);
} else {
  const js = readdirSync(distAssets).filter((f) => f.endsWith('.js'));
  const sizeKb = (f) => statSync(`${distAssets}/${f}`).size / 1024;

  const vendor = js.filter((f) => /^vendor-.*\.js$/.test(f));
  test('exactly ONE vendor chunk exists (the §P3 single-vendor invariant holds)',
    vendor.length === 1, vendor.join(', '));

  const has = (base) => js.some((f) => new RegExp(`^${base}-[^/]*\\.js$`).test(f));

  for (const s of SHELLS) {
    const shellChunk = js.filter((f) => new RegExp(`^${s.label}-.*\\.js$`).test(f));
    test(`a ${s.label} chunk exists`, shellChunk.length === 1, shellChunk.join(', '));
    if (shellChunk.length === 1) {
      const kb = sizeKb(shellChunk[0]);
      test(`the ${s.label} chunk is ≤ ${s.budget} kB`,
        kb <= s.budget, `${shellChunk[0]} = ${kb.toFixed(2)} kB`);
    }

    const split = s.panels.filter(has);
    test(`at least ${s.minPanels} of ${s.panels.length} ${s.label} panels are split into their own chunk`,
      split.length >= s.minPanels, `${split.length} found: ${split.join(', ')}`);

    for (const heavy of s.heavy) {
      test(`the heavy ${s.label} panel "${heavy}" is split into its own chunk`, has(heavy));
    }
  }
}

console.log(`\n${checks - failures}/${checks} checks passed`);
if (failures) {
  console.error(`\n${failures} FAILED`);
  process.exit(1);
}
console.log('ADMIN_SHELL_BUNDLE_VALIDATION_PASS');
process.exit(0);
