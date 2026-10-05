// §ADMIN-SHELL-CHUNK — THE ADMIN-SHELL BUNDLE BUDGET GATE.
//
// WHY THIS EXISTS
// ---------------
// `discovered-adminshell-chunk-size` recorded a REAL build-output finding: the
// admin portal's single `AdminShell-*.js` chunk was 909 kB (230 kB gzip) because
// the shell EAGERLY imported all ~34 admin view panels — so an operator
// downloaded every panel to open any one of them, and `vite build` warned
// ("Some chunks are larger than 500 kB after minification").
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
//   7. the two heaviest panels (AdminDashboard, MercentaBrain) are split into
//      their own chunks.
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
/** The budget, in kB, the admin shell chunk must stay under. */
const ADMIN_SHELL_BUDGET_KB = 300;
/** How many of the ~33 panels must be split into their own chunk. */
const MIN_PANEL_CHUNKS = 25;
/** How many `lazy(() => import(` bindings the shell must declare. */
const MIN_LAZY = 30;



/** Every admin view panel basename the shell lazily loads (Vite names a
 *  dynamic-import chunk `<basename>-<hash>.js`). */
const PANEL_BASENAMES = [
  'AdminDashboard', 'LogisticsControl', 'BrandCRM', 'CatalogManagerAdmin',
  'ComplianceApprovals', 'MarketingHub', 'IntegrationsPanel', 'UsertourAdminPanel',
  'PostizAdminPanel', 'WhatsAppAdminPanel', 'FulfillmentTrack', 'RetailPipeline',
  'BillingPanel', 'ContractsAdminPanel', 'MessagesHub', 'HelpdeskDashboard',
  'ReturnsTrackingDashboard', 'MonitoringDashboard', 'AdminPurchaseOrderList',
  'SuperAdminPanel', 'AdminAuditLog', 'BrandIntelligencePanel',
  'BrandIntelligenceStrategyPanel', 'OpportunityDiscoveryPanel',
  'ProductDiscoveryPanel', 'RegionalPriorityPanel', 'AmazonAdsDashboard',
  'FounderControlCentre', 'MercentaBrain', 'FounderInvestorCentre',
  'PartnershipsCentre', 'OnboardingPipeline', 'WorkManagement',
];

/* ── 1–3. the source contract ─────────────────────────────────────────────── */
const shellPath = 'src/components/layout/AdminShell.tsx';
const shell = read(shellPath);

const eagerAdminImports = [...shell.matchAll(/^\s*import[^;]*from\s+'@\/components\/admin\/[^']+';/gm)].map(
  (m) => m[0].trim()
);
test('AdminShell holds NO static import from @/components/admin/ (every panel is a dynamic import)',
  eagerAdminImports.length === 0, eagerAdminImports.join(' | '));

const lazyBindings = [...shell.matchAll(/lazy\(\s*\(\)\s*=>\s*import\(/g)].length;
test(`AdminShell declares at least ${MIN_LAZY} lazy(() => import(...)) panel bindings`,
  lazyBindings >= MIN_LAZY, `${lazyBindings} found`);

test('AdminShell renders its view switch inside a <Suspense>',
  /<Suspense\b/.test(shell));

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

  const shellChunk = js.filter((f) => /^AdminShell-.*\.js$/.test(f));
  test('an AdminShell chunk exists', shellChunk.length === 1, shellChunk.join(', '));
  if (shellChunk.length === 1) {
    const kb = sizeKb(shellChunk[0]);
    test(`the AdminShell chunk is ≤ ${ADMIN_SHELL_BUDGET_KB} kB (was 909 kB before the split)`,
      kb <= ADMIN_SHELL_BUDGET_KB, `${shellChunk[0]} = ${kb.toFixed(2)} kB`);
  }

  const panelChunks = PANEL_BASENAMES.filter((n) =>
    js.some((f) => new RegExp(`^${n}-[^/]*\\.js$`).test(f))
  );
  test(`at least ${MIN_PANEL_CHUNKS} of ${PANEL_BASENAMES.length} panels are split into their own chunk`,
    panelChunks.length >= MIN_PANEL_CHUNKS,
    `${panelChunks.length} found: ${panelChunks.join(', ')}`);

  for (const heavy of ['AdminDashboard', 'MercentaBrain']) {
    test(`the heavy panel "${heavy}" is split into its own chunk`,
      js.some((f) => new RegExp(`^${heavy}-[^/]*\\.js$`).test(f)));
  }
}

console.log(`\n${checks - failures}/${checks} checks passed`);
if (failures) {
  console.error(`\n${failures} FAILED`);
  process.exit(1);
}
console.log('ADMIN_SHELL_BUNDLE_VALIDATION_PASS');
process.exit(0);
