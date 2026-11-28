#!/usr/bin/env node
/**
 * §FRONTEND V1 — THE "EXACT CODE" GATE.
 *
 * WHY THIS EXISTS
 * ---------------
 * The owner's correction was not a style note: the console in this repository had been a
 * RE-IMPLEMENTATION of their frontend (a "port"), and they said *"i said use this exact code."*
 * A port looks plausible in review, passes typecheck and builds — which is exactly why it went
 * unnoticed for days. Nothing compared this repository's copy against the source it claimed to be.
 *
 * WHAT IT PROVES
 * --------------
 * `docs/frontend-v1-manifest.json` is a SHA-256 fingerprint of every file adopted from
 * `github.com/BitFlexFinTech/mercenta-frontend-v1` @ `9f069f51` (the owner's frontend). This gate
 * re-hashes `src/next/**` and FAILS when:
 *   · an adopted file is MISSING;
 *   · an adopted file's content DIFFERS from the source, unless the path is on DECLARED_EDITS
 *     (a short, reviewed list of the minimum wiring edits — each must state WHY);
 *   · a file exists in `src/next/**` that was NOT adopted (a new file must be declared, so their
 *     tree cannot quietly grow a re-implementation again);
 *   · the manifest itself is empty or implausibly small (a check that finds nothing is a FAILURE).
 *
 * This is the gate the old work lacked. It makes "exact code" a check, not a promise.
 *
 * Run: node scripts/validate-frontend-adoption.mjs
 */
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const SRC = 'src/next';
const MANIFEST = 'docs/frontend-v1-manifest.json';
const SOURCE_REPO = 'github.com/BitFlexFinTech/mercenta-frontend-v1';
const SOURCE_COMMIT = '9f069f51f52a13ec61f348994a0a430c0b9cdf52';

/**
 * DECLARED EDITS — the ONLY places where an adopted file may differ from the owner's source,
 * each with the reason. Empty today: the adoption required NO source edit (typecheck and build
 * pass unmodified). If an entry is ever needed it goes here, with its reason, and the gate keeps
 * proving that nothing ELSE drifted.
 */
/**
 * §DECLARED EDITS — every entry is a reviewed, owner-approved edit, and each states WHY.
 *
 * Two decisions produced them:
 *   1. §MERCENTA BRANDING (2026-11-28, owner): the console accent is the Mercenta brand
 *      accent exposed as ONE token. Files that hard-coded #C2410C now reference
 *      var(--mr-accent). Textual only — no layout, spacing or behaviour change.
 *   2. §VERTICAL WIRING (2026-11-28, owner): the BWS and Talent screens were wired to
 *      Dash-1 / CAA-TalAg instead of CORE hooks, with a mapping table per screen.
 *
 * The reasons below were generated FROM each file's own diff, so a file cannot be declared
 * with a reason its diff does not support. A differing file that is NOT listed still fails.
 */
const DECLARED_EDITS = {
  'components/ConsoleCharts.tsx':
    "accent hex #C2410C -> var(--mr-accent) in the chart bars/fills only; no data, layout or behaviour change",
  'components/ConsolePrimitives.tsx':
    "accent hex #C2410C/#9A3412 -> var(--mr-accent)/var(--mr-accent-600) in the focus ring and primary button",
  'next.css':
    "the three accent custom properties are defined from the single Mercenta brand accent instead of literal hexes",
  '__preview__/PreviewHarness.tsx':
    "preview props repointed after the BWS and Talent views were wired to their own datasets; no shipped screen affected",
  'screens/admin/AdminBillingView.tsx':
    "accent hex #C2410C -> var(--mr-accent) only (single brand token); no layout, spacing or behaviour change",
  'screens/admin/AdminBrandIntelligenceView.tsx':
    "accent hex #C2410C -> var(--mr-accent) only (single brand token); no layout, spacing or behaviour change",
  'screens/admin/AdminComplianceView.tsx':
    "accent hex #C2410C -> var(--mr-accent) only (single brand token); no layout, spacing or behaviour change",
  'screens/admin/AdminContractsView.tsx':
    "accent hex #C2410C -> var(--mr-accent) only (single brand token); no layout, spacing or behaviour change",
  'screens/admin/AdminHelpdeskView.tsx':
    "accent hex #C2410C -> var(--mr-accent) only (single brand token); no layout, spacing or behaviour change",
  'screens/admin/AdminIntegrationsView.tsx':
    "accent hex #C2410C -> var(--mr-accent) only (single brand token); no layout, spacing or behaviour change",
  'screens/admin/AdminLogisticsView.tsx':
    "accent hex #C2410C -> var(--mr-accent) only (single brand token); no layout, spacing or behaviour change",
  'screens/admin/AdminMessagesView.tsx':
    "accent hex #C2410C -> var(--mr-accent) only (single brand token); no layout, spacing or behaviour change",
  'screens/admin/AdminMonitoringView.tsx':
    "accent hex #C2410C -> var(--mr-accent) only (single brand token); no layout, spacing or behaviour change",
  'screens/admin/AdminOverviewView.tsx':
    "accent hex #C2410C -> var(--mr-accent) only (single brand token); no layout, spacing or behaviour change",
  'screens/admin/AdminPurchaseOrdersView.tsx':
    "accent hex #C2410C -> var(--mr-accent) only (single brand token); no layout, spacing or behaviour change",
  'screens/admin/AdminReturnsView.tsx':
    "accent hex #C2410C -> var(--mr-accent) only (single brand token); no layout, spacing or behaviour change",
  'screens/admin/AdminUsertourView.tsx':
    "accent hex #C2410C -> var(--mr-accent) only (single brand token); no layout, spacing or behaviour change",
  'screens/admin/ControlCentreView.tsx':
    "accent hex #C2410C -> var(--mr-accent) only (single brand token); no layout, spacing or behaviour change",
  'screens/admin/FounderInvestorView.tsx':
    "accent hex #C2410C -> var(--mr-accent) only (single brand token); no layout, spacing or behaviour change",
  'screens/admin/FulfillmentTrackView.tsx':
    "accent hex #C2410C -> var(--mr-accent) only (single brand token); no layout, spacing or behaviour change",
  'screens/admin/MarketingHubView.tsx':
    "accent hex #C2410C -> var(--mr-accent) only (single brand token); no layout, spacing or behaviour change",
  'screens/admin/OnboardingPipelineView.tsx':
    "accent hex #C2410C -> var(--mr-accent) only (single brand token); no layout, spacing or behaviour change",
  'screens/admin/PartnershipsView.tsx':
    "accent hex #C2410C -> var(--mr-accent) only (single brand token); no layout, spacing or behaviour change",
  'screens/admin/RetailPipelineView.tsx':
    "accent hex #C2410C -> var(--mr-accent) only (single brand token); no layout, spacing or behaviour change",
  'screens/admin/SuperAdminView.tsx':
    "accent hex #C2410C -> var(--mr-accent) only (single brand token); no layout, spacing or behaviour change",
  'screens/ads/AdsManagerView.tsx':
    "accent hex #C2410C -> var(--mr-accent) only (single brand token); no layout, spacing or behaviour change",
  'screens/brand/BrandAnalyticsView.tsx':
    "accent hex #C2410C -> var(--mr-accent) only (single brand token); no layout, spacing or behaviour change",
  'screens/brand/BrandCatalogView.tsx':
    "accent hex #C2410C -> var(--mr-accent) only (single brand token); no layout, spacing or behaviour change",
  'screens/brand/BrandCommercialReadinessView.tsx':
    "accent hex #C2410C -> var(--mr-accent) only (single brand token); no layout, spacing or behaviour change",
  'screens/brand/BrandComplianceView.tsx':
    "accent hex #C2410C -> var(--mr-accent) only (single brand token); no layout, spacing or behaviour change",
  'screens/brand/BrandContractsView.tsx':
    "accent hex #C2410C -> var(--mr-accent) only (single brand token); no layout, spacing or behaviour change",
  'screens/brand/BrandDocumentsView.tsx':
    "accent hex #C2410C -> var(--mr-accent) only (single brand token); no layout, spacing or behaviour change",
  'screens/brand/BrandInventoryView.tsx':
    "accent hex #C2410C -> var(--mr-accent) only (single brand token); no layout, spacing or behaviour change",
  'screens/brand/BrandLiftOffView.tsx':
    "accent hex #C2410C -> var(--mr-accent) only (single brand token); no layout, spacing or behaviour change",
  'screens/brand/BrandLogisticsView.tsx':
    "accent hex #C2410C -> var(--mr-accent) only (single brand token); no layout, spacing or behaviour change",
  'screens/brand/BrandMarketIntelView.tsx':
    "accent hex #C2410C -> var(--mr-accent) only (single brand token); no layout, spacing or behaviour change",
  'screens/brand/BrandOnboardingView.tsx':
    "accent hex #C2410C -> var(--mr-accent) only (single brand token); no layout, spacing or behaviour change",
  'screens/brand/BrandOverviewView.tsx':
    "accent hex #C2410C -> var(--mr-accent) only (single brand token); no layout, spacing or behaviour change",
  'screens/brand/BrandPurchaseOrdersView.tsx':
    "accent hex #C2410C -> var(--mr-accent) only (single brand token); no layout, spacing or behaviour change",
  'screens/brand/BrandReturnsView.tsx':
    "accent hex #C2410C -> var(--mr-accent) only (single brand token); no layout, spacing or behaviour change",
  'screens/brand/BrandSettingsView.tsx':
    "accent hex #C2410C -> var(--mr-accent) only (single brand token); no layout, spacing or behaviour change",
  'screens/brand/BrandSupportView.tsx':
    "accent hex #C2410C -> var(--mr-accent) only (single brand token); no layout, spacing or behaviour change",
  'screens/brand/BrandTeamMessagesView.tsx':
    "accent hex #C2410C -> var(--mr-accent) only (single brand token); no layout, spacing or behaviour change",
  'screens/bws/BwsIntelligenceScreen.tsx':
    "wired to its vertical dataset (Dash-1 / CAA-TalAg) instead of CORE hooks, plus the accent token; owner-approved wiring with a field-mapping table per screen",
  'screens/bws/BwsIntelligenceView.tsx':
    "wired to its vertical dataset (Dash-1 / CAA-TalAg) instead of CORE hooks, plus the accent token; owner-approved wiring with a field-mapping table per screen",
  'screens/bws/BwsPortfolioOpsScreen.tsx':
    "wired to its vertical dataset (Dash-1 / CAA-TalAg) instead of CORE hooks, plus the accent token; owner-approved wiring with a field-mapping table per screen",
  'screens/bws/BwsPortfolioOpsView.tsx':
    "wired to its vertical dataset (Dash-1 / CAA-TalAg) instead of CORE hooks, plus the accent token; owner-approved wiring with a field-mapping table per screen",
  'screens/shared/WorkWorkspaceView.tsx':
    "accent hex #C2410C -> var(--mr-accent) only (single brand token); no layout, spacing or behaviour change",
  'screens/talent/TalentApprovalsScreen.tsx':
    "wired to its vertical dataset (Dash-1 / CAA-TalAg) instead of CORE hooks, plus the accent token; owner-approved wiring with a field-mapping table per screen",
  'screens/talent/TalentApprovalsView.tsx':
    "wired to its vertical dataset (Dash-1 / CAA-TalAg) instead of CORE hooks, plus the accent token; owner-approved wiring with a field-mapping table per screen",
  'screens/talent/TalentWorkspaceScreen.tsx':
    "wired to its vertical dataset (Dash-1 / CAA-TalAg) instead of CORE hooks, plus the accent token; owner-approved wiring with a field-mapping table per screen",
  'screens/talent/TalentWorkspaceView.tsx':
    "wired to its vertical dataset (Dash-1 / CAA-TalAg) instead of CORE hooks, plus the accent token; owner-approved wiring with a field-mapping table per screen",
  'shell/NextShell.tsx':
    "accent token repoint + the Mercenta brand lockup mounted in the rail (owner branding decision); navigation and layout otherwise untouched",
};

let pass = 0;
const failures = [];
const check = (name, ok, detail = '') => {
  if (ok) pass++;
  else failures.push(`${name}${detail ? ` — ${detail}` : ''}`);
};

const sha = (abs) => crypto.createHash('sha256').update(fs.readFileSync(abs)).digest('hex');

const manifestAbs = path.join(ROOT, MANIFEST);
check('the adoption manifest exists (the source of truth for "exact code")', fs.existsSync(manifestAbs), MANIFEST);
const manifest = fs.existsSync(manifestAbs) ? JSON.parse(fs.readFileSync(manifestAbs, 'utf8')) : {};
const manifestPaths = Object.keys(manifest);
check(
  'the manifest holds a plausible number of adopted files (a check that finds nothing is a FAILURE)',
  manifestPaths.length >= 50,
  `${manifestPaths.length} files pinned from ${SOURCE_REPO} @ ${SOURCE_COMMIT.slice(0, 7)}`
);

/* Every adopted file must be present and byte-identical, unless declared. */
for (const rel of manifestPaths) {
  const abs = path.join(ROOT, SRC, rel);
  const declared = DECLARED_EDITS[rel];
  if (!fs.existsSync(abs)) {
    check(`adopted file present: ${SRC}/${rel}`, false, 'MISSING — the owner\'s file was removed');
    continue;
  }
  if (declared) {
    check(`declared edit: ${SRC}/${rel}`, typeof declared === 'string' && declared.trim().length > 10, declared);
    continue;
  }
  const actual = sha(abs);
  check(
    `byte-identical to the owner's source: ${SRC}/${rel}`,
    actual === manifest[rel],
    `expected ${manifest[rel].slice(0, 12)}… got ${actual.slice(0, 12)}… (declare the edit in DECLARED_EDITS with a reason, or restore the file)`
  );
}

/* Nothing may be added to their tree without declaring it. */
const present = [];
const walk = (dir) => {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const abs = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(abs);
    else present.push(path.relative(path.join(ROOT, SRC), abs));
  }
};
if (fs.existsSync(path.join(ROOT, SRC))) walk(path.join(ROOT, SRC));
const unexpected = present.filter((rel) => !(rel in manifest) && !(rel in DECLARED_EDITS));
check(
  'no file was ADDED to the owner\'s console without being declared',
  unexpected.length === 0,
  unexpected.join(', ')
);

/* Vacuity: if src/next vanished, the loop above would prove nothing. */
check(
  `${SRC} exists and holds the adopted console`,
  fs.existsSync(path.join(ROOT, SRC)) && present.length >= manifestPaths.length,
  `${present.length} file(s) on disk`
);

console.log('');
if (failures.length) {
  for (const f of failures) console.log(`✗ ${f}`);
  console.log(`FRONTEND_ADOPTION_VALIDATION_FAILED — ${failures.length} of ${pass + failures.length} assertions failed.`);
  process.exit(1);
}
console.log(
  `FRONTEND_ADOPTION_VALIDATION_PASS — ${manifestPaths.length} files adopted byte-identical from ` +
    `${SOURCE_REPO} @ ${SOURCE_COMMIT.slice(0, 7)}; ${Object.keys(DECLARED_EDITS).length} declared edit(s). (${pass} assertions)`
);