import { execSync } from 'node:child_process';
import { readFileSync, existsSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, '..');

let passed = 0;
let failed = 0;
const failures = [];

function check(name, condition) {
  if (condition) {
    passed++;
    console.log(`  \u2713 ${name}`);
  } else {
    failed++;
    failures.push(name);
    console.error(`  \u2717 ${name}`);
  }
}

function read(rel) {
  return readFileSync(resolve(root, rel), 'utf8');
}

function fileExists(rel) {
  return existsSync(resolve(root, rel));
}

console.log('\nMercenta Commerce \u2014 Automated Integrity Audit\n');

// 1. Required source files
const requiredFiles = [
  'src/App.tsx',
  'src/context/GlobalStateContext.tsx',
  'src/types.ts',
  'src/data/regionalDossiers.ts',
  'src/data/bootstrap.ts',
  'src/data/demoStore.ts',
  'src/components/marketing/Home.tsx',
  'src/components/auth/Login.tsx',
  'src/components/admin/AdminDashboard.tsx',
  'src/components/admin/SuperAdminPanel.tsx',
  'src/components/admin/MarketingHub.tsx',
  /* §P9 (programme decision 4) — REPOINTED: 'src/components/carrier/CarrierDashboard.tsx'
     and 'src/components/carrier/BakLogistics.tsx' are REMOVED from the required-file
     list because P9 DELETES them (the carrier surface is gone). Their removal is
     itself asserted below, so this list can no longer be satisfied by their return. */
  'src/components/brand/OnboardingWizard.tsx',
];
for (const f of requiredFiles) {
  check(`file exists: ${f}`, fileExists(f));
}

// 2. Compliant enterprise homepage — checks the CONTENT MODEL (§12 single
// source of truth) plus the component's wiring, since Home renders from it.
const home = read('src/components/marketing/Home.tsx');
const homeContent = read('src/config/homepageContent.ts');
/**
 * §UI/UX Wave 2 — REPOINTED. The homepage was deliberately re-positioned away
 * from "wholesale distribution" framing onto channel-neutral commercial-operations
 * language (the instruction forbids provider-specific customer-facing framing and
 * requires the real proposition). The INTENT of these checks is unchanged — the
 * homepage must carry a compliant, provider-neutral pitch, the canonical CTAs, the
 * expected sections, and no Amazon/1P relationship phrasing — so they now assert
 * the CURRENT canonical copy model. Prose checks use a comment-stripped copy of
 * the model so DOCUMENTATION may name the provider while customer-facing copy may
 * not.
 */
const stripComments = (s) => s.replace(/\/\*[\s\S]*?\*\//g, ' ').replace(/^\s*\/\/.*$/gm, ' ');
const homeContentCopy = stripComments(homeContent);
const homeCopy = stripComments(home);

check(
  'homepage contains compliant channel-neutral pitch',
  // §UI/UX Wave 2 — REPOINTED from the old 'Wholesale Distribution' /
  // 'gets independent brands into the UK market' literal contract.
  // §Phase 1 — REPOINTED again: the primary prospect CTA is now the canonical
  // pre-audit CTA ("Explore UK Market Fit") rather than the retired
  // "See if your brand qualifies" label. The INTENT is unchanged — the homepage
  // must carry the canonical, single-source CTA — so the check asserts the
  // CURRENT canonical label, taken from the same content model the page renders.
  homeContentCopy.includes('operating layer between your brand and the retail channel') &&
    homeContentCopy.includes('Explore UK Market Fit')
);
// §Phase F audit repair: the CTA was deliberately renamed from the obsolete
// "Get Started" to "Partner Login" (single source: hero.secondaryCta). The check
// now asserts the CANONICAL CTA exists and that the stale copy cannot return.
// §Phase 1 — REPOINTED: the hero's primary CTA is "Explore UK Market Fit" and
// Partner Login is now a HEADER utility action (PublicNav), deliberately NOT
// beside the hero CTA. Both canonical labels must still exist in the model, and
// the two retired labels must still be absent.
check(
  'homepage CTA is the canonical single-source label (no stale "Get Started")',
  homeContent.includes('Partner Login') &&
    homeContent.includes('Explore UK Market Fit') &&
    !homeContent.includes('Get Started') &&
    !home.includes('Get Started') &&
    !/See (My|Your) UK Potential/.test(homeContentCopy)
);
check('homepage has "Partner Login" action', homeContent.includes('Partner Login'));
check(
  'homepage primary CTA opens the assessment and carries its declared test id',
  // §SEO FOUNDATION increment — REPOINTED: the CTA previously called the local
  // view setter directly (`setPublicView('explore-uk-market-fit')`). It now goes
  // through the ONE in-app navigation function (`navigate(...)`), which sets the
  // view, pushes the canonical URL and applies the route metadata. The INTENT is
  // unchanged — the homepage primary CTA opens the assessment and carries its
  // declared test id — so the check reads the CURRENT canonical call.
  home.includes("navigate('explore-uk-market-fit')") &&
    home.includes('PRE_AUDIT_TESTIDS.cta') &&
    !/c\.hero\.secondaryCta/.test(homeCopy)
);
check(
  'homepage nav includes About/Services (no Global Network)',
  // §UI/UX Wave 2 — REPOINTED: the sections are still present and the stale
  // "Global Network" framing still cannot return, but the redesigned homepage
  // renders them as <section id="about"> / <section id="services"> from the
  // content model rather than as the literal heading strings.
  home.includes('id="about"') &&
    home.includes('id="services"') &&
    !home.includes('Global Network')
);
check(
  'homepage removes Amazon / 1P relationship phrasing',
  // §UI/UX Wave 2 — REPOINTED to the comment-stripped copies: documentation may
  // name the provider, customer-facing copy may not.
  !/amazon|vendor central|\b1P\b/i.test(homeCopy) &&
    !/amazon|vendor central|seller central/i.test(homeContentCopy)
);
check(
  'homepage is UK-only destination (no EU-destination phrasing)',
  /UK Retail/i.test(homeContentCopy) &&
    !/UK & EU|EU retail|European retail network|UK and EU/i.test(homeContentCopy)
);
// §Phase F audit repair: the public marketing shell (PublicNav) owns the brand
// mark + BRAND_NAME now, so the identity check follows the real render path.
const publicNav = read('src/components/marketing/PublicNav.tsx');
check(
  'homepage/public shell use brand config + logo assets (not hardcoded identity)',
  home.includes("@/config/brand") &&
    publicNav.includes("@/config/brand") &&
    publicNav.includes('mercenta-mark-dark-bg.svg') &&
    fileExists('src/assets/mercenta-mark-dark-bg.svg') &&
    fileExists('src/assets/mercenta-logo-lockup.svg')
);

// 3. Multi-region demo dossiers
const login = read('src/components/auth/Login.tsx');
// §Stage-17 fix #1: the login screen must derive its brand cards from the
// canonical ALL_DEMO_BRANDS dataset (dataset completeness) — a hardcoded
// curated subset of 3 is exactly the bug class this audit exists to catch.
check(
  'login derives demo cards from the CANONICAL ALL_DEMO_BRANDS (single source, not a hidden hardcoded list)',
  login.includes('ALL_DEMO_BRANDS.filter') && login.includes('activateDemoBrand')
);
check(
  'login renders ONLY the canonical representative subset (DEMO_LOGIN_BRAND_IDS) — never 20 buttons',
  login.includes('DEMO_LOGIN_BRAND_IDS') && login.includes('demoSubset')
);
check('login lists Super Admin Tadii', login.includes('Super Admin \u2014 Tadii'));

const mock = read('src/data/regionalDossiers.ts');
check(
  'REGIONAL_DOSSIERS is DERIVED from canonical real brands (buildBrandDossier) — no fake dossier data',
  mock.includes('buildBrandDossier') && mock.includes('REGIONAL_DOSSIERS')
);
check('regionalDossiers has UK dossier (Astonish, real)', mock.includes("'brand-astonish'"));
check('regionalDossiers has USA dossier (Tapatío, real)', mock.includes("'brand-tapatio'"));
check('regionalDossiers has Europe dossier (Le Creuset, real)', mock.includes("'brand-lecreuset'"));
check('REGIONAL_DOSSIERS exported', mock.includes('export const REGIONAL_DOSSIERS'));

// 4. Super Admin identity
const sap = read('src/components/admin/SuperAdminPanel.tsx');
check('Super Admin identity is Tadii', sap.includes('Tadii'));

// 5. Global state orchestration
const ctx = read('src/context/GlobalStateContext.tsx');
check('activateDemo in global state', ctx.includes('const activateDemo'));
check('signOut clears to landing homepage', /setEnvironment\('home'\)/.test(ctx));

// 6. §P9 (programme decision 4) — THE CARRIER SURFACE IS GONE.
// REPOINTED from the old contract, which asserted "CarrierShell imports
// BakLogistics", "CarrierShell registers BAK Logistics Hub nav", "CarrierShell
// renders BakLogistics" and "App lazy-renders CarrierShell". Those files no
// longer exist, so the same invariant is now proven the other way round: the
// carrier shell, its two carrier views, the admin Carrier Monitor and the App
// import are all DELETED, and nothing may reintroduce them.
for (const f of [
  'src/components/layout/CarrierShell.tsx',
  'src/components/carrier/CarrierDashboard.tsx',
  'src/components/carrier/BakLogistics.tsx',
  'src/components/admin/CarrierMonitor.tsx',
]) {
  check(`§P9 removed file is deleted: ${f}`, !fileExists(f));
}
const appCodeNoComments = read('src/App.tsx').replace(/\/\*[\s\S]*?\*\//g, '');
check('§P9 App does not render a carrier shell',
  !appCodeNoComments.includes("import('@/components/layout/CarrierShell')") &&
  !appCodeNoComments.includes('<CarrierShell'));
check('§P9 the carrier session role no longer exists',
  !read('src/lib/auth/rbac.ts')
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .includes("'3pl'"));
check('§P9 the carrier login card is gone',
  !read('src/components/auth/Login.tsx').includes('3PL Carrier Terminal'));

// 7b. §Batch-0 Item 3 — Broadened layout/shell component audit:
//      Session-derived identity, non-hardcoded values, click handlers present.
const header = read('src/components/layout/Header.tsx');
check('Header uses useSessionIdentity() (not hardcoded identity)', header.includes('useSessionIdentity'));
check('Header has NO hardcoded TA/Tadii identity literals', !header.includes("'TA'") && !header.includes("'Tadii'") && !header.includes('tadii@mercenta'));
check('Header account-menu buttons have onClick handlers via props',
  header.includes('onClick: onNavSettings') &&
  header.includes('onClick: onNavBilling') &&
  header.includes('onClick: onNavApiKeys')
);
check('Header fallback name is Mercenta Staff (not hardcoded Tadii)',
  header.includes("'Mercenta Staff'")
);

const sidebar = read('src/components/layout/Sidebar.tsx');
check('Sidebar derives user identity from props (not hardcoded)', sidebar.includes('userName'));
check('Sidebar has NO hardcoded identity literals', !sidebar.includes("'TA'") && !sidebar.includes("'Tadii'"));

const envRouter = read('src/components/layout/EnvironmentRouter.tsx');
check('EnvironmentRouter defines environments from types (not hardcoded labels with identity)',
  envRouter.includes('import type { Environment }') &&
  envRouter.includes("'brand'") && envRouter.includes("'admin'") &&
  // §P9 (programme decision 4) — REPOINTED: the old contract also required
  // `envRouter.includes("'carrier'")`. The carrier environment is REMOVED, so the
  // invariant is now that the switcher CANNOT offer it (comment-stripped, so the
  // §P9 repoint comment that quotes the old entry does not satisfy the check).
  !/id: 'carrier'/.test(envRouter.replace(/\/\*[\s\S]*?\*\//g, ''))
);

const appContent = read('src/App.tsx');
// §Phase F audit repair: Phase 6 made each role SHELL the single owner of the
// account-menu wiring (App renders the shell; the shell owns the view state), so
// these assertions follow the real architecture while keeping the original
// intent: every account-menu button routes to a valid, DISTINCT view.
const brandShell = read('src/components/layout/BrandShell.tsx');
check('Brand onNavSettings routes to settings view', brandShell.includes("onNavSettings={() => setBrandView('settings')}"));
check('Brand onNavBilling routes to settings view', brandShell.includes("onNavBilling={() => setBrandView('settings')}"));
check('Brand onNavApiKeys routes to settings view', brandShell.includes("onNavApiKeys={() => setBrandView('settings')}"));
// Admin context: distinct routing per account-menu button
const adminShell = read('src/components/layout/AdminShell.tsx');
check('Admin onNavSettings routes to super_admin', adminShell.includes("onNavSettings={() => setAdminView('super_admin')}"));
check('Admin onNavBilling routes to billing', adminShell.includes("onNavBilling={() => setAdminView('billing')}"));
check('Admin onNavApiKeys routes to integrations', adminShell.includes("onNavApiKeys={() => setAdminView('integrations')}"));
// AppShell must FORWARD the three handlers into the Header (the shared shell).
const appShell = read('src/components/layout/AppShell.tsx');
check('AppShell forwards the account-menu handlers to Header',
  appShell.includes('onNavSettings={onNavSettings}') &&
    appShell.includes('onNavBilling={onNavBilling}') &&
    appShell.includes('onNavApiKeys={onNavApiKeys}')
);
// Integrations panel is admin-only (no brandView route for integrations)
check('IntegrationsPanel is admin-only (no brandView route for integrations)',
  !appContent.includes("brandView === 'integrations'")
);
// Check against stale hardcoded identity patterns in layout components
check('No hardcoded TA initals in brand userName derivation', !appContent.includes("'TA'"));
check('No hardcoded Tadii in brand userName derivation', !appContent.includes("userName='Tadii'"));

// 7c. §Batch-3 UX — Interactivity check: every brand-facing metric/summary card
//      must have a drill-down onClick handler (ground-rules check 5 applied
//      to Batch 1-2 brand screens that came after the original audit).
const brandReports = read('src/components/brand/BrandReports.tsx');
check('BrandReports metric cards have drill-down onClick',
  brandReports.includes('setDrillCard')
);
check('BrandReports drill-down modal renders for each metric',
  brandReports.includes('asinRate') && brandReports.includes('netPPM')
);
const brandReturns = read('src/components/brand/BrandReturns.tsx');
check('BrandReturns summary cards have drill-down onClick',
  brandReturns.includes("onClick={() => setDrillCard(")
);
check('BrandReturns drill-down modal renders for each card',
  brandReturns.includes("drillCard === 'Total returned units'") &&
  brandReturns.includes("drillCard === 'Deductions linked'")
);
check('BrandReturns table has search input',
  brandReturns.includes('searchQuery') &&
  brandReturns.includes('placeholder="Search by PO')
);

// 7. Compiler integrity
function run(cmd) {
  try {
    execSync(cmd, { cwd: root, stdio: 'pipe' });
    return true;
  } catch {
    return false;
  }
}

console.log('\n  Running compiler checks\u2026');
check('npm run typecheck', run('npm run typecheck'));
check('npm run build', run('npm run build'));
check('npm run validate:wording (static outward-facing wording gate)', run('npm run validate:wording'));

console.log('----------------------------------------');
console.log(`  PASSED: ${passed}   FAILED: ${failed}`);
if (failed > 0) {
  console.log('  Failures: ' + failures.join(', '));
  console.log('  \u2717 INTEGRITY AUDIT FAILED');
  process.exit(1);
} else {
  console.log('  \u2713 INTEGRITY AUDIT PASSED \u2014 100%');
  process.exit(0);
}