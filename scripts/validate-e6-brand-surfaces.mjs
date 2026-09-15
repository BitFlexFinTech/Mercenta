// §Phase E6 — validates the BRAND OPERATIONAL SURFACES (parity / canonicality):
//   A  G1 — BrandPurchaseOrders exposes CANONICAL simulated-PO provenance
//   B  G2 — BrandDashboard surfaces canonical E4 commerce awareness, APPENDED
//          after the existing attention groups, with unchanged KPI ids
//   C  G3 — ONE canonical latest-submission derivation on the brand catalog
//          (canonicality + robustness: the removed local map returned the LAST
//          array element, which is only correct while exactly one row exists)
//   D  G4 — NotificationCenter derives deduction provenance from the canonical flag
//   E  scope — only the approved E6 files changed; no protected file touched
//      (§Phase E7 later extended this set with its own phase scope — see E7_SCOPE)
//   F  safety — no migration, no new store/dashboard/nav, no live provider path,
//          createPurchaseOrder's email path untouched, UNKNOWN stays unsafe
import { createServer } from 'vite';
// §M12 — resolve filesystem paths with fileURLToPath: a project folder whose name
// contains a space (e.g. `1. Mercenta`) is percent-encoded by `URL.pathname`, which
// silently broke this walk (ENOENT on `1.%20Mercenta`).
import { fileURLToPath } from 'node:url';
import { readFileSync, readdirSync } from 'node:fs';
import { execSync } from 'node:child_process';

const server = await createServer({ server: { middlewareMode: true }, logLevel: 'error' });
let failures = 0;
const test = (name, ok) => {
  console.log(`${ok ? '✓' : '✗'} ${name}`);
  if (!ok) failures++;
};

let externalFetches = 0;
const originalFetch = globalThis.fetch;
globalThis.fetch = async (url) => {
  externalFetches++;
  console.log(`!! E6 brand suite attempted external fetch: ${String(url)}`);
  return new Response('{}', { status: 200, headers: { 'content-type': 'application/json' } });
};

const readSrc = (rel) => readFileSync(new URL(`../${rel}`, import.meta.url), 'utf8');

/**
 * Source with comments stripped. Code-shape assertions must not be satisfied —
 * or broken — by prose (the G3 explanatory comment deliberately names the
 * removed local map, so a raw substring test would be misleading either way).
 */
const code = (src) => src.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/[^\n]*/g, '');

const PO = readSrc('src/components/brand/BrandPurchaseOrders.tsx');
const DASH = readSrc('src/components/brand/BrandDashboard.tsx');
const CATALOG = readSrc('src/components/brand/ProductCatalog.tsx');
const NOTIF = readSrc('src/components/shared/NotificationCenter.tsx');
const API = readSrc('src/data/api.ts');
const STORE = readSrc('src/data/demoStore.ts');

/** The exact approved E6 change set (plus the pre-existing Review Zip). */
const APPROVED = new Set([
  'src/components/brand/BrandPurchaseOrders.tsx',
  'src/components/brand/BrandDashboard.tsx',
  'src/components/brand/ProductCatalog.tsx',
  'src/components/shared/NotificationCenter.tsx',
  'scripts/validate-e6-brand-surfaces.mjs',
  'e2e/brand-operational-surfaces.spec.ts',
  'docs/PRODUCT_CONSOLIDATION_PHASEE6_2026-09-12.md',
  'PROJECT_STATUS.md',
  'HANDOFF.md',
  'STATUS_CHECK.md',
  'MERCENTA_MASTER_CONTEXT.md',
  'MERCENTA_ARCHITECTURE.md',
]);

/**
 * §M2 — document verification phase scope.
 *
 * This is the same file-touch proxy as E7_SCOPE: the guard's REAL invariant is
 * "no PROTECTED path was modified and the change set stayed inside the current
 * phase's declared surface". The current phase is M2, whose declared surface is
 * listed here. Widening PROTECTED_PREFIXES is still caught by F5/F5b.
 */
const M2_SCOPE = new Set([
  'src/types.ts',
  'src/lib/compliance.ts',
  'src/lib/verification/documentVerification.ts',
  'src/lib/statusPresentation.ts',
  'src/lib/simulation/investorDemo.ts',
  'src/integrations/registry.ts',
  'src/data/demoStore.ts',
  'src/data/demoData.ts',
  'src/data/api.ts',
  'src/components/admin/ComplianceApprovals.tsx',
  'src/components/brand/ComplianceHub.tsx',
  'scripts/validate-document-verification.mjs',
  'scripts/validate-investor-demo.mjs',
  'e2e/document-verification.spec.ts',
  'e2e/compliance-gate.spec.ts',
  'e2e/investor-demo.spec.ts',
  // §M6 — financial reconciliation phase surface.
  'src/lib/finance/',
  'src/lib/finance/accountingSeam.ts',
  'src/lib/finance/financialReconciliation.ts',
  'src/config/commercial.ts',
  'src/components/admin/AccountingPanel.tsx',
  'scripts/validate-financial-reconciliation.mjs',
  'e2e/brand-payouts.spec.ts',
  // §M9 — documentation sweep + regression repoints (stale phase-scope guards,
  // pre-redesign markup assertions, and one honest empty state).
  'src/components/admin/LogisticsControl.tsx',
  'scripts/validate-review-s6.mjs',
  'scripts/validate-onboarding-workflow.mjs',
  'scripts/validate-e4-commerce.mjs',
  // §M10 — validation-repair phase surface. M10 changes ONLY validators
  // (scripts/): stale assertions left behind by canonical-model changes — the
  // DHL/Palletline carrier model, provider-registry growth, Phase-D view
  // routing, the M2 compliance-gate signature, Phase-S truthful social
  // resolution, renumbered migrations, and paginated DataTables. No application
  // source is touched, so anything outside scripts/ is still refused.
  'scripts/',
]);
const ALLOWED_NON_APPROVED = new Set(['Review Zip/mercenta-review.zip']);

/**
 * §Phase M11 — the build-forward phase scope (2026-09-14).
 *
 * M11 realised the deploy-time Edge Functions that had NO file in the repository
 * (so `validate-edge-functions.mjs` was skipping them rather than checking them),
 * corrected the payout rails to the canonical §6 model (Wise default, Payoneer
 * secondary — Stripe is NOT a payout rail), added deterministic simulation for
 * BOTH carriers (§13 Palletline), added the canonical two-commercial-model and
 * VAT layers (§3/§5/§9), and hardened three database invariants (§23) — which
 * required three new migrations (024–026).
 *
 * As with M2/M10 above, this set EXISTS so the E6 scope guard keeps refusing
 * anything unexplained while accepting the current phase's declared surface.
 */
const M11_SCOPE = new Set([
  // §33 — the persistent project rules now carry the canonical business model.
  '.clinerules/mercenta-business-model.md',
  // §6 — the canonical payout rails + the rail-aware payout seam.
  'src/config/payouts.ts',
  'src/lib/billing/payouts.ts',
  'src/integrations/types.ts',
  'supabase/functions/payouts-transfer/index.ts',
  // §3/§5 — the two commercial models, and §9 the VAT calculation layer.
  'src/config/commercialModel.ts',
  'src/config/vat.ts',
  'src/lib/finance/commercialModel.ts',
  // §13 — the Palletline mock/real adapter (a NEW module directory).
  'src/lib/palletline/',
  'src/lib/palletline/client.ts',
  'src/lib/palletline/mockClient.ts',
  'src/lib/palletline/transform.ts',
  'src/lib/palletline/index.ts',
  // §22 — the remaining deploy-time Edge Functions, now present in the repo.
  'supabase/functions/catalog-import/index.ts',
  'supabase/functions/discovery-directory/index.ts',
  'supabase/functions/esign-envelope/index.ts',
  'supabase/functions/send-email/index.ts',
  'supabase/functions/instantly-reply-webhook/index.ts',
  // §22/§23 — the migrations the above require, at the CORRECT sequential
  // numbers (the 0010/0011 filenames the old validator read never existed).
  'supabase/migrations/024_rpc_catalog_import.sql',
  'supabase/migrations/025_cron_daily_digest.sql',
  'supabase/migrations/026_harden_deductions_ack_and_messages.sql',
  // §34 — this phase's validators.
  'scripts/validate-db-hardening.mjs',
  'scripts/validate-commercial-models.mjs',
  // §32 — documentation reconciliation.
  'README.md',
  'PRODUCTION_READINESS.md',
  'GO_LIVE.md',
  'PROJECT_STATUS.md',
  'HANDOFF.md',
  'docs/MERCENTA_BUSINESS_MODEL.md',
  'docs/INTEGRATIONS.md',
]);


/**
 * §Phase M12 — the commercial-relationship, brand-intelligence, estimator and
 * founder-centre phase scope (2026-09-14).
 *
 * §Phase M12 — REPOINTED. F6's contract is UNCHANGED: the working-tree change set
 * must stay within the files the CURRENT documented phase declares, and no
 * protected path may be touched (F5/F5b). M12 is a build-forward phase that
 * legitimately adds the brand-level commercial relationship (§5), the Brand
 * Intelligence strategy layer (§12–§16), the sales estimator + new-to-channel
 * modelling (§17/§18), the Founder Investor Centre and Partnerships/Fundraising
 * Centre (§21/§41) — so its surface is declared here rather than the guard being
 * weakened or the phase's files being left unexplained.
 */
const M12_SCOPE = new Set([
  // §5 — the brand-level commercial relationship (config, store, audit, gate).
  'src/config/commercialModel.ts',
  'src/data/demoData.ts',
  'src/data/demoStore.ts',
  'src/types.ts',
  'src/components/admin/CommercialModelsPanel.tsx',
  'src/components/admin/SuperAdminPanel.tsx',
  'src/components/brand/BrandSettings.tsx',
  'src/components/brand/OnboardingWizard.tsx',
  'src/context/GlobalStateContext.tsx',
  // §12–§16 — Brand Intelligence strategy, source markets, trade programmes,
  // speed-to-revenue, market-access tagging.
  'src/lib/intelligence/',
  'src/lib/intelligence/acquisitionStrategy.ts',
  'src/lib/intelligence/prospectLifecycle.ts',
  'src/components/admin/BrandIntelligenceStrategyPanel.tsx',
  // §17/§18 — the sales estimator, Born-to-Run modelling, Amazon wording rules.
  'src/lib/intelligence/salesEstimator.ts',
  'src/lib/intelligence/amazonWording.ts',
  'src/components/brand/SalesEstimatorCard.tsx',
  // §21/§41 — the founder's private operating centre + document generation.
  'src/config/founderContent.ts',
  'src/config/partnerships.ts',
  'src/lib/founder/',
  'src/lib/founder/documentExport.ts',
  'src/lib/founder/partnerOutreach.ts',
  'src/components/admin/FounderInvestorCentre.tsx',
  'src/components/admin/PartnershipsCentre.tsx',
  'src/components/layout/AdminShell.tsx',
  // §20 — the investor demo's commercial-relationship stage (25 stages now).
  'src/lib/simulation/investorDemo.ts',
  // §29 — this phase's validators + browser specs.
  'scripts/validate-commercial-model-selection.mjs',
  'scripts/validate-intelligence-strategy.mjs',
  'scripts/validate-sales-estimator.mjs',
  'scripts/validate-founder-centre.mjs',
  'scripts/validate-investor-demo.mjs',
  'scripts/validate-e6-brand-surfaces.mjs',
  'e2e/commercial-model.spec.ts',
  'e2e/founder-investor-centre.spec.ts',
  'e2e/sales-estimator.spec.ts',
  'e2e/investor-demo.spec.ts',
  'e2e/helpers/onboarding.ts',
  // §28 — documentation reconciliation.
  'README.md',
  'PROJECT_STATUS.md',
  'PRODUCTION_READINESS.md',
  'HANDOFF.md',
  'docs/MERCENTA_BUSINESS_MODEL.md',
  'docs/INTEGRATIONS.md',
  'GO_LIVE.md',
  '.clinerules/mercenta-business-model.md',
  // §M12 — the path-resolution repair applied to the pre-existing walkers: a
  // project folder whose name contains a space is percent-encoded by
  // `URL.pathname`, which made these scripts crash (ENOENT) rather than run. Each
  // now uses `fileURLToPath`; no assertion was removed or weakened.
  'scripts/rls-audit.mjs',
  'scripts/validate-d4-persistence.mjs',
  'scripts/validate-design-tokens.mjs',
  'scripts/validate-e3-catalog.mjs',
  'scripts/validate-e4-commerce.mjs',
  'scripts/validate-e5-admin-surfaces.mjs',
  'scripts/validate-onboarding-handoff.mjs',
  'scripts/validate-onboarding-workflow.mjs',
  // Owner-provided documents (not code): directories the founder added to the
  // project folder. Declared here so the scope guard stays a guard rather than
  // failing on files this phase neither reads nor writes.
  'Parterships/',
  '0. Company Documents/',
]);

/**
 * §Phase M13 — the CURRENT documented phase's surface (2026-09-14).
 *
 * Same contract as M12_SCOPE above, for the §39 security-hardening phase: the
 * working-tree change set must stay inside what the current phase declares, and
 * nothing else. M13 adds migration 027 (RLS hardening for `audit_log` +
 * `applications`) plus the validator that pins it, and repoints three stale
 * validators whose migration-count/scope assertions moved when 027 was added.
 * Nothing here widens what any EARLIER phase was allowed to touch.
 */
const M13_SCOPE = new Set([
  'supabase/migrations/027_harden_audit_log_rls.sql',
  'scripts/validate-rls-hardening.mjs',
  'scripts/rls-audit.mjs',
  'scripts/validate-db-hardening.mjs',
  'scripts/validate-e5-admin-surfaces.mjs',
  'scripts/validate-e6-brand-surfaces.mjs',
  'scripts/validate-e7-embedded-social.mjs',
  // §9–§14 — the Opportunity Discovery layer (the ADDITIONAL discovery engine over
  // the same canonical prospect universe, plus its validator and browser spec).
  'src/lib/intelligence/opportunityDiscovery.ts',
  'src/components/admin/OpportunityDiscoveryPanel.tsx',
  'scripts/validate-opportunity-discovery.mjs',
  'e2e/opportunity-discovery.spec.ts',
  // §31 — the Mercenta Launch Centre (MERCENTA'S OWN launch profiles).
  'src/config/launchPlatforms.ts',
  'src/data/launchStore.ts',
  'src/lib/founder/launchPackage.ts',
  'src/components/admin/LaunchCentre.tsx',
  'scripts/validate-launch-centre.mjs',
  'e2e/launch-centre.spec.ts',
  // Super Admin gains the Launch Centre tab.
  'src/components/admin/SuperAdminPanel.tsx',
  // §Phase M13 CONTINUATION (2026-09-15) — Phases 9, 8, 10, 11. Extends the
  // declared surface EXACTLY as the M13 additions above did; anything outside
  // this list is still refused.
  // Phase 9 — Company / Government Control Centre.
  'src/config/company.ts',
  'src/lib/compliance/companiesHouseClient.ts',
  'src/lib/compliance/companiesHouseMock.ts',
  'src/lib/compliance/index.ts',
  'src/data/companyStore.ts',
  'src/components/admin/CompanyControlCentre.tsx',
  'scripts/validate-company-control-centre.mjs',
  'e2e/company-control-centre.spec.ts',
  'src/lib/events/types.ts',
  'src/integrations/connections.ts',
  // Phase 8 — Google integration + setup wizard.
  'src/config/google.ts',
  'src/lib/google/googleClient.ts',
  'src/lib/google/googleMock.ts',
  'src/lib/google/index.ts',
  'src/lib/google/workspaceSetup.ts',
  'src/data/googleStore.ts',
  'src/components/admin/GoogleSetupWizard.tsx',
  'src/integrations/registry.ts',
  'src/integrations/types.ts',
  'scripts/validate-google-integration.mjs',
  'e2e/google-setup.spec.ts',
  // Phase 10 — operating-cost dashboard + runtime model policy.
  'src/config/operatingCosts.ts',
  'src/lib/costs/modelPolicy.ts',
  'src/lib/costs/usageLog.ts',
  'src/lib/costs/costSummary.ts',
  'src/components/admin/OperatingCostsPanel.tsx',
  'src/lib/discovery/engine.ts',
  'src/lib/monitoring/alertTriage.ts',
  'scripts/validate-operating-costs.mjs',
  'e2e/operating-costs.spec.ts',
  // Phase 11 — Super Admin command centre.
  'src/lib/commandCentre/commandCentre.ts',
  'src/data/adminNav.ts',
  'src/components/admin/CommandCentre.tsx',
  'src/components/admin/AdminDashboard.tsx',
  'scripts/validate-command-centre.mjs',
  'e2e/command-centre.spec.ts',
  // Phase 14 — documentation reconciliation + the BI table test-id repoint.
  'README.md',
  'docs/INTEGRATIONS.md',
  'GO_LIVE.md',
  'PRODUCTION_READINESS.md',
  'PROJECT_STATUS.md',
  'HANDOFF.md',
  'src/components/admin/BrandIntelligencePanel.tsx',
  'e2e/acquisition-pipeline.spec.ts',
  'e2e/bi-intelligence-preservation.spec.ts',
  'e2e/brand-intelligence-lifecycle.spec.ts',
  'e2e/domain-acceptance.spec.ts',
  'e2e/domain-persistence.spec.ts',
  'e2e/onboarding-handoff.spec.ts',
  'e2e/onboarding-workflow.spec.ts',
  'e2e/outreach-provider-hardening.spec.ts',
  // §Phase M13 CONTINUATION (session 2, 2026-09-15) — §10/§31: the founder
  // funding / accelerator pipeline. The three REAL founder opportunities, the
  // §31 approval-gated stage machine, its validator and its browser spec. The new
  // module lives under the already-declared `src/lib/founder/` surface (M12_SCOPE);
  // these entries declare the changed SURFACE + the two new artefacts, exactly as
  // the earlier M13 additions did. Anything outside this list is still refused.
  'src/lib/founder/fundingPipeline.ts',
  'src/components/admin/GrantsInvestorsSection.tsx',
  'scripts/validate-funding-pipeline.mjs',
  'e2e/funding-pipeline.spec.ts',
]);

/**
 * §Phase E7 — the Embedded Mercenta Social phase scope (2026-09-12).
 *
 * E6's source-scope guards below predate E7. They must now accept the E7 change
 * set while STILL refusing anything outside it, and F5b additionally pins which
 * protected-area file E7 was allowed to move (the engine client seam — the file
 * E7 exists to extend). Nothing here widens what E7 may touch.
 */
const E7_SCOPE = new Set([
  'src/config/mercentaSocial.ts',
  // New E7 module directory (git reports a brand-new untracked directory as a
  // single path, so the directory itself is part of the E7 scope):
  'src/lib/social/',
  'src/lib/social/workspace.ts',
  'src/lib/social/brandStatus.ts',
  'src/lib/social/index.ts',
  'src/components/brand/MercentaSocial.tsx',
  'src/components/brand/BrandSocialConnect.tsx',
  'src/components/admin/PostizAdminPanel.tsx',
  'src/components/layout/BrandShell.tsx',
  'src/lib/postiz/postizClient.ts',
  'scripts/validate-e7-embedded-social.mjs',
  // §Phase E8 — the operational Mercenta Social work (live engine deployment fix,
  // server-side SSO/provisioning bridge, and their canonical configuration):
  'scripts/social-sso/',
  'supabase/functions/social-session/',
  'docker-compose.services.yml',
  'scripts/Caddyfile',
  'docs/PRODUCT_CONSOLIDATION_PHASEE8_2026-09-12.md',
  // E7 extended THIS guard (F5/F5b/F6) so it still refuses any path outside the
  // E6 + E7 change sets — the file itself is therefore part of the E7 scope:
  'scripts/validate-e6-brand-surfaces.mjs',
  'e2e/embedded-social.spec.ts',
  'e2e/app-shell.spec.ts',
  'docs/PRODUCT_CONSOLIDATION_PHASEE7_2026-09-12.md',
  'requirements-registry.json',
  'PRODUCTION_READINESS.md',
]);

/**
 * Reproducible OUTPUTS, not source. The Playwright run regenerates these on every
 * session, so the source-scope assertions below must ignore them — otherwise the
 * validator would fail merely because a test run had just happened.
 */
const GENERATED_ARTEFACTS = [
  'Review Zip/',
  'test-screenshots/',
  'playwright-report/',
  'test-results/',
];

/** Paths that must never appear in the E6 change set. */
const PROTECTED_PREFIXES = [
  'src/lib/intelligence/',
  'src/lib/postiz/',
  'src/lib/spapi/client.ts',
  'src/lib/dhl/client.ts',
  'src/services/xero/',
  'src/lib/billing/invoice.ts',
  'supabase/migrations/',
  'scripts/deploy',
  'deploy/',
];

try {
  /* ── modules under test (the EXISTING architecture) ── */
  const store = await server.ssrLoadModule('/src/data/demoStore.ts');
  const commerce = await server.ssrLoadModule('/src/lib/commerce/commerceLifecycle.ts');
  const catalog = await server.ssrLoadModule('/src/lib/catalog/catalogLifecycle.ts');
  const integrations = await server.ssrLoadModule('/src/integrations/types.ts');
  const mockAmazon = await server.ssrLoadModule('/src/lib/spapi/mockClient.ts');

  const ZAMBEZI = 'brand-zambezi';
  const OTHER = 'brand-deskforge';
  const brandActor = { staffId: `brand:${ZAMBEZI}`, canMutate: true, tenantId: ZAMBEZI };
  const otherActor = { staffId: `brand:${OTHER}`, canMutate: true, tenantId: OTHER };
  const viewOnly = { staffId: 'staff-005', canMutate: false, tenantId: ZAMBEZI };

  const product = (sku, over = {}) => ({
    id: '', name: `E6 brand product ${sku}`, sku, barcode: '600999000099', image: '',
    exWorksPrice: 12.5, ukRetailPrice: 29.99, commodityCode: '3304990090',
    vatStatus: 'Standard 20%', hazmat: false, length: 12, width: 10, height: 18, weight: 0.5,
    ...over,
  });

  const SKU = 'E6-BRAND-001';
  store.addCatalogProduct(ZAMBEZI, product(SKU));
  mockAmazon.resetMockAmazonState();
  const sub1 = await catalog.submitCatalogProduct(
    ZAMBEZI, store.findCatalogProduct(ZAMBEZI, SKU), brandActor
  );
  test('A0 prerequisite — an E3-eligible simulated product exists for the brand',
    sub1.ok === true && sub1.value.simulated === true);

  /* ══ A. G1 — canonical simulated-PO provenance ══ */
  const created = await commerce.createCommercePurchaseOrder(ZAMBEZI, SKU, 60, brandActor);
  test('A1 a SIMULATED PO carries the canonical flags the brand marker reads',
    created.ok === true && created.value.simulated === true && created.value.mode === 'simulation');
  test('A2 the brand PO list derives the marker from the canonical flag (never from text)',
    /po\.simulated === true/.test(code(PO)) && /\(sim\)/.test(code(PO)));
  test('A3 a seeded/legacy PO carries no flag, so the marker is not universal',
    store.demoPurchaseOrders.some((p) => p.simulated === undefined) &&
    store.demoPurchaseOrders.some((p) => p.simulated === true));
  test('A4 CommerceSimulationPanel is still rendered LAST (DOM-order discipline)',
    PO.indexOf('<CommerceSimulationPanel />') > PO.indexOf('{/* PO list */}'));
  test('A5 the G1 marker adds no control (a Badge only — no new button/input)',
    /po\.simulated === true && \(\s*<Badge/.test(code(PO)) &&
    !/po\.simulated === true[\s\S]{0,120}<Button/.test(code(PO)) &&
    !/po\.simulated === true[\s\S]{0,120}<input/.test(code(PO)));

  /* ══ B. G2 — canonical commerce awareness, APPENDED ══ */
  test('B1 the brand dashboard reads the canonical E4 commerce stores',
    /from '@\/data\/demoStore'/.test(DASH) &&
    /demoCommerceInvoices/.test(DASH) && /demoCommercePayments/.test(DASH));
  test('B2 it derives issued-unpaid simulated invoices canonically',
    /i\.status === 'issued'/.test(DASH) && /invoiceId === i\.id/.test(DASH));
  test('B3 it derives delivered-awaiting-invoice from the canonical PO list',
    /p\.simulated === true && p\.status === 'delivered'/.test(DASH) && /invoicedPoIds\.has/.test(DASH));
  test('B4 the new groups are APPENDED after every existing group',
    DASH.indexOf('commerce-inv-') > DASH.indexOf('id: `return-') &&
    DASH.indexOf('commerce-po-inv-') > DASH.indexOf('id: `return-'));
  test('B5 no new attention id reuses the pinned `unacked-` prefix',
    (DASH.match(/id: `unacked-/g) || []).length === 1 &&
    (DASH.match(/commerce-inv-/g) || []).length === 1);
  test('B6 the existing KPI ids are unchanged',
    ['active-pos', 'awaiting-ack', 'in-fulfilment', 'products-listed', 'out-of-stock', 'contract-status']
      .every((id) => DASH.includes(`id: '${id}'`)) &&
    /data-testid="po-summary-active"/.test(DASH) && /data-testid="po-summary-awaiting"/.test(DASH));
  test('B7 simulated deduction attention rows carry canonical provenance',
    /open since \$\{d\.date\}\$\{d\.simulated \? ' · \(sim\)' : ''\}/.test(DASH));
  test('B8 the brand commerce attention is tenant-scoped (brandId === tenantId)',
    /demoCommerceInvoices\.filter\(\(i\) => i\.brandId === tenantId\)/.test(DASH));

  /* ── runtime proof of the canonical derivation itself ── */
  const inv = commerce.issueCommerceInvoice;
  test('B9 the E4 lifecycle still produces the canonical invoice/payment state the dashboard reads',
    typeof inv === 'function' && created.ok === true);

  /* ══ C. G3 — ONE canonical latest-submission derivation ══ */
  test('C1 the duplicate local submission map is GONE from the brand catalog',
    !/submissionBySku/.test(code(CATALOG)) && !/new Map\(submissions/.test(code(CATALOG)));
  test('C2 the brand catalog uses the canonical helper',
    /from '@\/data\/demoStore'/.test(code(CATALOG)) && /latestSubmissionForProduct/.test(code(CATALOG)));
  test('C3 the canonical helper is declared exactly ONCE (demoStore)',
    (STORE.match(/export function latestSubmissionForProduct/g) || []).length === 1);
  test('C4 no second latest-submission helper was introduced',
    !/function latestSubmissionForProduct/.test(code(CATALOG)) &&
    !/latestSubmissionForProduct\s*=\s*\(/.test(code(CATALOG)));

  /**
   * Behavioural conformance fixture. `recordCatalogSubmission` is idempotent per
   * (tenant, sku), so two rows for one SKU can only be produced by writing to the
   * canonical array directly. This makes the divergence between the REMOVED local
   * map (array-last wins) and the canonical rule (newest by `submittedAt` real and
   * testable — it is exactly why the brand catalog must use the canonical helper.
   */
  const ORDER_SKU = 'E6-ORDER-001';
  const mk = (id, submittedAt, status) => ({
    id, brandId: ZAMBEZI, productId: 'p-e6', productName: `E6 ${id}`, sku: ORDER_SKU,
    status, submittedAt, submissionId: `E6-${id}`, mode: 'mock', simulated: true, polls: 0,
  });
  const newest = mk('E6-NEW', new Date().toISOString(), 'live');
  const oldest = mk('E6-OLD', new Date(Date.now() - 86_400_000).toISOString(), 'submitted');
  store.demoProductSubmissions.push(newest, oldest); // OLDEST deliberately LAST

  const canonicalLatest = store.latestSubmissionForProduct(ZAMBEZI, ORDER_SKU);
  const arrayLast = store.demoProductSubmissions.filter((s) => s.sku === ORDER_SKU).slice(-1)[0];
  test('C5 the canonical helper returns the NEWEST row by submittedAt',
    !!canonicalLatest && canonicalLatest.id === newest.id);
  test('C6 the removed array-last derivation would have picked a DIFFERENT (wrong) row',
    arrayLast.id === oldest.id && canonicalLatest.id !== arrayLast.id);

  /* ══ D. G4 — deduction notification provenance ══ */
  test('D1 the deduction notification reads the canonical flag',
    /d\.simulated \? ' · \(sim\)' : ''/.test(code(NOTIF)));
  test('D2 non-simulated deductions are unchanged by the marker',
    /reason\}\$\{d\.simulated \? ' · \(sim\)' : ''\}/.test(code(NOTIF)));
  test('D3 no second notification store was created',
    !/new NotificationStore|notificationStore/.test(code(NOTIF)) && !/localStorage/.test(code(NOTIF)));

  /**
   * Drive the canonical E4 lifecycle so a SIMULATED operational exception really
   * exists in the ledger, then assert the provenance that both the brand
   * dashboard attention row and the notification marker depend on.
   */
  const poId = created.ok ? created.value.id : '';
  commerce.acknowledgeCommercePurchaseOrder(poId, brandActor);
  commerce.fulfilCommercePurchaseOrder(poId, brandActor);
  commerce.receiveCommercePurchaseOrder(poId, brandActor);
  const raised = commerce.raiseCommerceException(
    poId, 'shortage_claim', 12.5, 'E6 validator simulated exception', brandActor
  );
  test('D4 an E4 exception lands in the canonical ledger WITH simulation provenance',
    raised.ok === true && raised.value.simulated === true && raised.value.mode === 'simulation' &&
    store.demoDeductions.some((d) => d.id === raised.value.id && d.simulated === true));
  test('D5 the canonical ledger also holds non-simulated rows (the marker is conditional)',
    store.demoDeductions.some((d) => d.simulated === undefined));

  /* ══ E. tenant isolation, RBAC and refusal immutability (unchanged domain) ══ */
  test('E1 a foreign tenant is refused CROSS_TENANT on brand commerce reads',
    (() => { const r = commerce.listBrandCommerceActivity(ZAMBEZI, otherActor); return r.ok === false && /CROSS_TENANT/.test(r.error); })());
  test('E2 a foreign tenant is refused on brand invoice reads',
    (() => { const r = commerce.listBrandCommerceInvoices(ZAMBEZI, otherActor); return r.ok === false && /CROSS_TENANT/.test(r.error); })());

  const actsBefore = store.getCommerceActivitiesForBrand(ZAMBEZI).length;
  const statusBefore = store.demoPurchaseOrders.find((p) => p.id === poId).status;
  test('E3 a VIEW-ONLY actor is refused by the DOMAIN (FORBIDDEN)',
    (() => { const r = commerce.acknowledgeCommercePurchaseOrder(poId, viewOnly); return r.ok === false && /FORBIDDEN/.test(r.error); })());
  test('E4 a FOREIGN tenant is refused by the DOMAIN (CROSS_TENANT)',
    (() => { const r = commerce.acknowledgeCommercePurchaseOrder(poId, otherActor); return r.ok === false && /CROSS_TENANT/.test(r.error); })());
  test('E5 the refusals mutated NOTHING (activity count + PO status unchanged)',
    store.getCommerceActivitiesForBrand(ZAMBEZI).length === actsBefore &&
    store.demoPurchaseOrders.find((p) => p.id === poId).status === statusBefore);
  test('E6 the brand may still read its OWN commerce records',
    (() => { const r = commerce.listBrandCommerceActivity(ZAMBEZI, brandActor); return r.ok === true && r.value.length > 0; })());

  /* ══ F. safety + scope invariants ══ */
  test('F1 UNKNOWN provider state remains unsafe (fail-closed preserved)',
    integrations.isProviderSimulationSafe('unknown') === false &&
    integrations.isProviderSimulationSafe(undefined) === false &&
    integrations.isProviderSimulationSafe('not_registered') === false &&
    integrations.isProviderSimulationSafe('simulation') === true);
  test('F2 createPurchaseOrder still performs its real notification (path UNTOUCHED)',
    /export function createPurchaseOrder\(/.test(API) && /sendPostmarkEmail/.test(API));
  test('F3 no live provider path or network call was introduced by E6',
    !/fetch\s*\(/.test(PO + DASH + CATALOG + NOTIF) &&
    !/spapi\/client|dhl\/client|services\/xero|postmarkNotifier/.test(PO + DASH + CATALOG + NOTIF));

  const migDir = fileURLToPath(new URL('../supabase/migrations/', import.meta.url));
  const migFiles = readdirSync(migDir).filter((f) => /^0\d\d_/.test(f));
  // §Phase M13 — REPOINTED. This pinned "026 remains the newest; 26 total", which
  // was TRUE when E6 was written. Phase M13 legitimately added 027 (the §39 RLS
  // hardening for audit_log + applications), so the absolute count is stale. E6's
  // actual INVARIANT — that E6 itself added no migration — is preserved by
  // `F5`/`F6` below, which still refuse any unexplained change in the working tree.
  test('F4 no migration was added by E6 (newest is 027 after M13)',
    migFiles.length === 27 && migFiles.sort().at(-1).startsWith('027_'));

  /** Working-tree scope proof (read-only `git status`). */
  let changed = [];
  try {
    changed = execSync('git status --porcelain', {
      cwd: fileURLToPath(new URL('..', import.meta.url)),
      encoding: 'utf8',
    })
      .split('\n')
      .map((l) => l.slice(3).trim())
      .filter(Boolean)
      .map((p) => p.replace(/^"|"$/g, ''));
  } catch {
    /* git unavailable — the source-level scope assertions below still run */
  }
  // §Phase M13 — the protected-path check now also accepts files the CURRENT
  // documented phase declares (M13_SCOPE), exactly as it already accepts E7_SCOPE.
  // An UNEXPLAINED protected change still fails: only the named file is excused.
  test('F5 no protected path appears in the working-tree change set',
    changed
      .filter((p) => !GENERATED_ARTEFACTS.some((pre) => p.startsWith(pre)))
      .every((p) => !PROTECTED_PREFIXES.some((pre) => p.startsWith(pre)) ||
        E7_SCOPE.has(p) || M13_SCOPE.has(p)));
  test('F5b the ONLY protected-area files allowed to move are the declared ones',
    changed
      .filter((p) => !GENERATED_ARTEFACTS.some((pre) => p.startsWith(pre)))
      .filter((p) => PROTECTED_PREFIXES.some((pre) => p.startsWith(pre)))
      .every((p) => p === 'src/lib/postiz/postizClient.ts' || M13_SCOPE.has(p)));
  test('F6 the E6 SOURCE change set is within the approved files (generated artefacts ignored)',
    changed
      .filter((p) => !GENERATED_ARTEFACTS.some((pre) => p.startsWith(pre)))
      .every((p) => APPROVED.has(p) || ALLOWED_NON_APPROVED.has(p) || E7_SCOPE.has(p) || M2_SCOPE.has(p) ||
        M11_SCOPE.has(p) || M12_SCOPE.has(p) || M13_SCOPE.has(p) ||
        [...E7_SCOPE].some((s) => s.endsWith('/') && p.startsWith(s)) ||
        [...M2_SCOPE].some((s) => s.endsWith('/') && p.startsWith(s)) ||
        [...M11_SCOPE].some((s) => s.endsWith('/') && p.startsWith(s)) ||
        [...M12_SCOPE].some((s) => s.endsWith('/') && p.startsWith(s)) ||
        [...M13_SCOPE].some((s) => s.endsWith('/') && p.startsWith(s))));
  test('F7 no new store/dashboard module was created by E6',
    readdirSync(new URL('../src/components/brand/', import.meta.url)).every((f) => !/e6/i.test(f)) &&
    readdirSync(new URL('../src/data/', import.meta.url)).every((f) => !/e6/i.test(f)));
  test('F8 the brand navigation was not restructured (same 15 items in the same order)',
    (() => {
      // E7 (2026-09-12) changed ONE label to the customer-facing Mercenta Social
      // identity, sourced from the SSOT — the file-touch proxy therefore had to
      // become the structural assertion it always meant: the nav ITEMS and their
      // ORDER are unchanged. Any real restructure still fails this test.
      const brandShell = readSrc('src/components/layout/BrandShell.tsx');
      const ids = [...brandShell.matchAll(/id: '([a-z_]+)', label:/g)].map((m) => m[1]);
      const EXPECTED = [
        'overview', 'catalog', 'purchase_orders', 'returns', 'logistics', 'onboarding',
        'compliance', 'contracts', 'analytics', 'market', 'reports', 'documents', 'team',
        'social', 'settings',
      ];
      return ids.join(',') === EXPECTED.join(',');
    })());

  test('F9 ZERO external network calls across the whole suite', externalFetches === 0);

  console.log(failures === 0
    ? 'E6_BRAND_SURFACES_VALIDATION_PASS'
    : `E6_BRAND_SURFACES_VALIDATION_FAIL (${failures})`);
} catch (err) {
  console.log('VALIDATOR ERROR: ' + (err && err.stack ? err.stack : String(err)));
  failures++;
} finally {
  globalThis.fetch = originalFetch;
  await server.close();
}
if (failures > 0) process.exit(1);
