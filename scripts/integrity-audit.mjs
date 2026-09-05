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
  'src/components/carrier/CarrierDashboard.tsx',
  'src/components/carrier/BakLogistics.tsx',
  'src/components/brand/OnboardingWizard.tsx',
];
for (const f of requiredFiles) {
  check(`file exists: ${f}`, fileExists(f));
}

// 2. Compliant enterprise homepage — checks the CONTENT MODEL (§12 single
// source of truth) plus the component's wiring, since Home renders from it.
const home = read('src/components/marketing/Home.tsx');
const homeContent = read('src/config/homepageContent.ts');
check(
  'homepage contains compliant wholesale pitch',
  homeContent.includes('purchase inventory wholesale and distribute') &&
    homeContent.includes('Wholesale Distribution')
);
check('homepage has "Get Started" CTA', homeContent.includes('Get Started'));
check('homepage has "Partner Login" action', homeContent.includes('Partner Login'));
check(
  'homepage nav includes About/Services (no Global Network)',
  home.includes('About Us') && home.includes('Services') && !home.includes('Global Network')
);
check(
  'homepage removes Amazon / 1P relationship phrasing',
  !/amazon|vendor central|\b1P\b/i.test(home) && !/vendor central|seller central/i.test(homeContent)
);
check(
  'homepage is UK-only destination (no EU-destination phrasing)',
  /UK Retail/i.test(homeContent) &&
    !/UK & EU|EU retail|European retail network|UK and EU/i.test(homeContent)
);
check(
  'homepage uses brand config + logo assets (not hardcoded identity)',
  home.includes("@/config/brand") &&
    home.includes('mercenta-mark-dark-bg.svg') &&
    home.includes('mercenta-logo-lockup.svg')
);

// 3. Multi-region demo dossiers
const login = read('src/components/auth/Login.tsx');
// §Stage-17 fix #1: the login screen must derive its brand cards from the
// canonical ALL_DEMO_BRANDS dataset (dataset completeness) — a hardcoded
// curated subset of 3 is exactly the bug class this audit exists to catch.
check('login renders every brand from ALL_DEMO_BRANDS (derived, not hardcoded)', login.includes('ALL_DEMO_BRANDS.map') && login.includes('activateDemoBrand'));
check('login does NOT hardcode a brand subset', !login.includes('Zambezi Organic Extracts Ltd'));
check('login lists Super Admin Tadii', login.includes('Super Admin \u2014 Tadii'));

const mock = read('src/data/regionalDossiers.ts');
check('regionalDossiers has Africa dossier', mock.includes('AFRICA_DOSSIER'));
check('regionalDossiers has USA dossier', mock.includes('USA_DOSSIER'));
check('regionalDossiers has Europe dossier', mock.includes('EUROPE_DOSSIER'));
check('REGIONAL_DOSSIERS exported', mock.includes('export const REGIONAL_DOSSIERS'));
check(
  'dossiers carry dual-factor ZWL financials',
  mock.includes("currency: 'ZWL'") && mock.includes("currency: 'USD'")
);

// 4. Super Admin identity
const sap = read('src/components/admin/SuperAdminPanel.tsx');
check('Super Admin identity is Tadii', sap.includes('Tadii'));

// 5. Global state orchestration
const ctx = read('src/context/GlobalStateContext.tsx');
check('activateDemo in global state', ctx.includes('const activateDemo'));
check('signOut clears to landing homepage', /setEnvironment\('home'\)/.test(ctx));

// 6. BAK Logistics hub wiring
const app = read('src/App.tsx');
check('App imports BakLogistics', app.includes("from '@/components/carrier/BakLogistics'"));
check('App registers BAK Logistics Hub nav', app.includes("label: 'BAK Logistics Hub'"));

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
  envRouter.includes("'brand'") && envRouter.includes("'admin'") && envRouter.includes("'carrier'")
);

const appContent = read('src/App.tsx');
// Brand context: all three account-menu buttons route to a valid view
check('Brand onNavSettings routes to settings view', appContent.includes("onNavSettings={() => setBrandView('settings')}"));
check('Brand onNavBilling routes to settings view', appContent.includes("onNavBilling={() => setBrandView('settings')}"));
check('Brand onNavApiKeys routes to settings view', appContent.includes("onNavApiKeys={() => setBrandView('settings')}"));
// Admin context: distinct routing per account-menu button
check('Admin onNavSettings routes to super_admin', appContent.includes("onNavSettings={() => setAdminView('super_admin')}"));
check('Admin onNavBilling routes to billing', appContent.includes("onNavBilling={() => setAdminView('billing')}"));
check('Admin onNavApiKeys routes to integrations', appContent.includes("onNavApiKeys={() => setAdminView('integrations')}"));
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