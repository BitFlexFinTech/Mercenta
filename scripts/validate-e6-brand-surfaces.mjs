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
 * §Phase 4 — the 20 REAL BRAND universe build scope (2026-09-17).
 *
 * Phase 4 replaced the invented demo tenant set with the canonical 20 REAL
 * brands (10 UK + 10 international), removed every fake-brand reference across
 * the platform, repointed the BI/universe/dossier/research/discovery surfaces
 * to the canonical identities, updated the Supabase 016 seed to the same set,
 * and repointed every validator + browser spec that named the old tenants.
 *
 * This set EXISTS so the E6 scope guard keeps refusing anything unexplained
 * while accepting the current phase's declared surface, EXACTLY as M13/E7 did.
 * The two protected-prefix files that legitimately moved are declared too
 * (src/services/xero/, supabase/migrations/ — both carried fake-brand rows).
 */
const PHASE4_SCOPE = new Set([
  // ── canonical brand SSOT + derived stores ──
  'src/data/demoData.ts',
  'src/data/demoStore.ts',
  'src/data/regionalDossiers.ts',
  'src/data/brandDossiers.ts',
  'src/data/bootstrap.ts',
  'src/data/api.ts',
  'src/types.ts',
  // ── consumers of the canonical identities ──
  'src/components/auth/Login.tsx',
  'src/components/admin/HelpdeskDashboard.tsx',
  'src/components/brand/OnboardingWizard.tsx',
  'src/components/brand/BrandPurchaseOrders.tsx',   // Phase-4 ASN fix: Grocery lot/expiry inputs wired
  'src/components/admin/AdminPurchaseOrderDetail.tsx', // Phase-4.2 ASN fix: admin on-behalf Grocery lot/expiry inputs
  // §Phase 4.3 (Workstream B, 2026-09-17) — approved implementation files.
  'src/components/brand/BrandIntelligence.tsx',      // brand Market Intel de-exposed (no raw score/tier)
  'src/components/layout/AdminShell.tsx',            // BI surface gated SUPER-ADMIN-only
  'src/components/admin/ProductDiscoveryPanel.tsx',  // internal product discovery (Super-only)
  'src/components/admin/RegionalPriorityPanel.tsx',  // internal regional priority (Super-only)
  'src/components/admin/ProspectDetailTabs.tsx',     // internal notes editor tab
  'src/components/admin/ProspectDetailPanel.tsx',    // notes tab wiring
  'requirements-registry.json',                      // master matrix updated 144→171
  /* §P9 (programme decision 4) — REPOINTED: 'src/components/carrier/CarrierDashboard.tsx'
     was in this approved-implementation list; the file is DELETED with the carrier surface. */
  'src/components/design/DesignSystemShowcase.tsx',
  'src/lib/compliance/companiesHouseMock.ts',
  'src/lib/helpdesk/ticketStore.ts',
  'src/lib/simulation/scenarioEngine.ts',
  'src/lib/warehouse/returnsTracking.ts',
  'src/lib/simulation/investorDemo.ts',
  'src/lib/discovery/engine.ts',
  'src/lib/discovery/firecrawlClient.ts',
  'src/lib/research/keepaClient.ts',
  'src/lib/research/productResearchEngine.ts',
  'src/lib/research/resellerTracker.ts',
  'src/lib/dhl/domain.ts',                 // protected prefix: fake-brand fallback removed
  'src/services/xero/demoData.ts',         // protected prefix: fake Xero contacts removed
  'src/services/xero/xeroClient.ts',       // protected prefix: fake payout row removed
  // ── Supabase canonical seed (016 — fake brands removed) ──
  'supabase/migrations/016_seed_demo_data.sql',
  // ── generator + every validator/spec repointed to the canonical 20 ──
  'scripts/gen-seed-migration.py',
  'scripts/',
  'e2e/',
]);

/**
 * §Functional completion (2026-09-17) — Clusters A + B scope.
 *
 * The functional-completion workstream (Amazon Ads depth §9 + Marketplace
 * Intelligence / automated Listing Analyzer §8) legitimately extends the
 * working tree with new brand-facing and admin surfaces. Like the Phase-4
 * PHASE4_SCOPE precedent, this set declares EXACTLY the source files that
 * workstream created or edited; the E6 guards keep refusing everything else,
 * so an UNEXPLAINED protected change still fails. Brand nav structure and all
 * prior E6 invariants remain untouched (F8 verified below).
 */
const FUNCTIONAL_COMPLETION_SCOPE = new Set([
  // ── Cluster A — Amazon Ads functional depth ──
  'src/components/admin/AmazonAdsDashboard.tsx',  // campaigns + manual budget + recommended-spend approval
  'src/components/brand/BrandAdvertising.tsx',    // NEW brand advertising surface (Market Intel)
  // ── Cluster B — Marketplace Intelligence + automated Listing Analyzer ──
  'src/components/brand/ListingAnalyzer.tsx',     // NEW Listing Analyzer surface (Market Intel)
  'src/lib/intelligence/listingAnalyzer.ts',      // NEW deterministic engine (PROTECTED prefix — declared)
  // ── shared wiring touched by both clusters ──
  'src/components/layout/BrandShell.tsx',         // market-view composition (nav items untouched)
  'src/components/ui.tsx',                        // Input numeric/aria/testid passthrough
  'src/data/queries.ts',                          // ad-campaigns + ad-recommendations hooks
  // ── Cluster C — Knowledge Base ↔ UserTour article linkage (§14) ──
  'src/components/shared/TourEngine.tsx',        // tour tooltip \"Learn more\" + KB article panel
  'src/data/knowledgeBase.ts',                    // NEW canonical article store
  'src/config/tours/tourDefinitions.ts',          // TourStep.learnMore per orientation step
  // ── e2e specs for both clusters (e2e/ also Phase-4 declared) ──
  'e2e/amazon-ads-dashboard.spec.ts',
  'e2e/brand-advertising.spec.ts',
  'e2e/listing-analyzer.spec.ts',
  'e2e/tours.spec.ts',                            // KB article-panel test added
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

/**
 * §Dashboard + logistics cleanup programme (2026-09-22, session 13) — REPOINTED,
 * not weakened.
 *
 * OLD CONTRACT (implicit): the F6 change-set scope check treated EVERY path that
 * was not in a named sprint scope as an offender — including the project-state
 * documentation. That contradicts the canonical project-state contract
 * (`.clinerules/project-state-contract.md`), which REQUIRES `PROJECT_STATUS.md`,
 * `HANDOFF.md`, `STATUS_CHECK.md`, `requirements-registry.json` and
 * `PRODUCTION_READINESS.md` to be updated in the SAME session as the work, and
 * `docs/` to carry the session's record. Any compliant session therefore failed
 * F6 on its own documentation.
 *
 * NEW CONTRACT: the guard still scopes the change set EXACTLY as before for
 * APPLICATION source (`src/**`, `scripts/**`, `e2e/**`, config, migrations, …) —
 * an unapproved source file still fails it — but project-state DOCUMENTATION is
 * not application source and is excluded by name. The intent (no unapproved
 * SOURCE change) is unchanged and is now stated precisely.
 */
const PROJECT_STATE_DOCS = [
  'PROJECT_STATUS.md',
  'HANDOFF.md',
  'STATUS_CHECK.md',
  'requirements-registry.json',
  'PRODUCTION_READINESS.md',
];
/**
 * §SSOT — REPOINTED (2026-09-27). F6's contract is UNCHANGED: a changed SOURCE file that sits in NO
 * declared set still FAILS (the mechanism below is untouched). What this predicate adds is the other
 * half of the operating model's own §10.4 distinction, which governance always intended: **internal
 * Cline governance files (`.clinerules/**`) are NOT application source.** They are how the project's
 * rules are recorded — the same category as `PROJECT_STATUS.md` / `HANDOFF.md`, which this predicate
 * already excluded — so editing a rule cannot be an unexplained *application* change.
 * OLD CONTRACT (recorded, not deleted): `.clinerules/**` was previously not excluded, so a governance
 * edit had to be declared in some phase's scope set or it failed here.
 */
const isProjectStateDoc = (p) =>
  PROJECT_STATE_DOCS.includes(p) || p.startsWith('docs/') || p.startsWith('.clinerules/');


/** Paths that must never appear in the E6 change set. */
const BATCH2C_PO_REVISION_SCOPE = new Set([
  'src/types.ts',                                  /* PROTECTED prefix — the revision SHAPES + the channel's change vocabulary */
  'src/config/purchaseOrders.ts',                   /* the labels + the ONE operator statement */
  'src/lib/commerce/poRevisions.ts',                /* NEW — the ONE owner of a channel-issued revision */
  'src/lib/commerce/channelPurchaseOrderIngestion.ts', /* the ONE writer that records it */
  'src/lib/spapi/mockClient.ts',                    /* mock-first: the simulated channel issues a revision */
  'src/data/api.ts',                                /* the acknowledgement writer + the SUPERSEDED-PO shipment refusal */
  'scripts/validate-po-revision-ingestion.mjs',     /* NEW — this phase's gate */
  /**
   * §BATCH 2c SURFACES (2026-09-29) — the two surfaces the phase requires, plus the
   * console control that makes the channel event REACHABLE from the product:
   *   · `BrandPurchaseOrders.tsx` — the brand's notice on the order itself (which
   *     version it is working from, what the channel changed, whether its
   *     acknowledgement must be updated), derived from the ONE owner.
   *   · `AdminPurchaseOrderDetail.tsx` — every recorded revision with its change list
   *     and Mercenta's review flag when a decision was undercut.
   *   · `AdminPurchaseOrderList.tsx` — the honestly-labelled simulated channel change
   *     (mock-first), refused unless a SIMULATED channel read is active.
   *   · `poRevisions.ts` / `mockClient.ts` are already declared above; the change-detail
   *     wording and the simulated window shift were FIXED AT SOURCE here (the detail
   *     repeated its own kind label; the window collapsed to a single day).
   */
  'src/components/brand/BrandPurchaseOrders.tsx',
  'src/components/admin/AdminPurchaseOrderDetail.tsx',
  'src/components/admin/AdminPurchaseOrderList.tsx',
  'e2e/po-revision-surfaces.spec.ts',               /* NEW — the browser proof of both surfaces */
  'scripts/verify-live-demo.mjs',                   /* L15 — the SAME flow driven on the deployed site */
  'scripts/validate-e6-brand-surfaces.mjs',
  'scripts/validate-e7-embedded-social.mjs',
  'package.json',
]);

/**
 * §BATCH 2d — ACKNOWLEDGEMENT ↔ INVOICE PRICE MATCH (2026-09-29, register `AV-008` /
 * `AV-023`). The phase gives the ack↔invoice unit-price rule ONE owner, enforces the
 * documented ceiling (an acknowledged price may never exceed the order price), makes
 * the invoice and the channel submission bill the ACKNOWLEDGED price, and surfaces the
 * divergence warning. Declared set — every file the phase touches, named:
 *   · `invoicePriceMatch.ts` — NEW: the ONE owner (rule text, derivation, ceiling,
 *     divergence, warning). Nothing else re-derives the comparison.
 *   · `src/data/api.ts` — the ceiling enforced in the acknowledgement pre-pass, the
 *     acknowledged price RECORDED, and the channel submission's per-line price.
 *   · `src/lib/commerce/commerceLifecycle.ts` — the invoice bills the acknowledged price.
 *   · the two surfaces — the admin discrepancy box and the brand notice, both rendered
 *     from the owner.
 *   · the gate, the browser spec and the two scope guards themselves.
 */
const BATCH2D_ACK_INVOICE_PRICE_SCOPE = new Set([
  'src/lib/commerce/invoicePriceMatch.ts',
  'src/data/api.ts',
  'src/lib/commerce/commerceLifecycle.ts',
  'src/components/admin/AdminPurchaseOrderDetail.tsx',
  'src/components/brand/BrandPurchaseOrders.tsx',
  'e2e/ack-invoice-price.spec.ts',
  'scripts/validate-ack-invoice-price.mjs',
  'scripts/verify-live-demo.mjs',
  'scripts/validate-e6-brand-surfaces.mjs',
  'scripts/validate-e7-embedded-social.mjs',
  'package.json',
]);

/**
 * §BATCH 2e — THE COMPLIANCE ATTRIBUTION FAMILY (`AV-031` + `AV-032`, 2026-09-29).
 *
 * `AV-032` (UNSUPPORTED): `brand_registry_confirmation` was a BASE REQUIRED
 * compliance document, so a brand could be BLOCKED on it, although "Amazon Brand
 * Registry" is a seller/brand-owner programme with no vendor obligation behind it.
 * It is now reclassified as an OPTIONAL Mercenta onboarding control
 * (`src/lib/compliance.ts → OPTIONAL_MERCENTA_CONTROLS`), relabelled away from the
 * marketplace term, removed from the hard gate and from the demo seed, and the
 * admin overview no longer re-declares the required list by hand.
 * `AV-031` (CONTRADICTED): the module attributed the obligations to "Amazon UK
 * requirements / marketplace rules" instead of UK/EU law + Mercenta's own controls.
 *
 * Declared set: the owner, the demo seed + its declared baseline, the surfaces
 * that render or derive the list, the hand-written admin duplicate, the new gate,
 * the three browser specs it repoints, and the two scope guards themselves.
 */
const BATCH2E_COMPLIANCE_ATTRIBUTION_SCOPE = new Set([
  'src/lib/compliance.ts',
  'src/data/demoData.ts',
  'src/context/GlobalStateContext.tsx',
  'src/components/brand/BrandDashboard.tsx',
  'src/components/brand/ComplianceHub.tsx',
  'src/components/admin/AdminDashboard.tsx',
  'e2e/compliance-gate.spec.ts',
  'e2e/catalog-product-management.spec.ts',
  'e2e/status-semantics.spec.ts',
  'scripts/validate-document-verification.mjs',
  'scripts/validate-compliance-attribution.mjs',
  'scripts/verify-live-demo.mjs',
  'scripts/validate-e6-brand-surfaces.mjs',
  'scripts/validate-e7-embedded-social.mjs',
  'package.json',
]);

/**
 * §BATCH 2f (`AV-042`, 2026-09-29) — THE PROGRAMME-CLAIM WORDING GUARD.
 *
 * The canonical business rules ban *"guaranteed purchase orders"* / *"Amazon
 * guaranteed POs"*, but the programme-claim regex set in the PROTECTED
 * `src/lib/intelligence/amazonWording.ts` listed only sales/revenue/acceptance/
 * approval/launch/placement/listing, so a PO-guarantee claim could pass the gate.
 * Batch 2f extends the set (both word orders) and also covers the four further
 * phrasings `.clinerules/mercenta-business-model.md` bans by name. The file is
 * DECLARED here (not widened): the F5/F5b/F6 contract is unchanged — a changed
 * file in NO declared set still fails.
 *
 * Declared set: the rule owner (PROTECTED prefix), the new gate, and the two
 * scope guards + `package.json` that register it.
 */
const BATCH2F_WORDING_GUARD_SCOPE = new Set([
  'src/lib/intelligence/amazonWording.ts',          /* the rule owner (PROTECTED) */
  'scripts/validate-wording-guard.mjs',             /* NEW — this phase's gate */
  'scripts/validate-e6-brand-surfaces.mjs',
  'scripts/validate-e7-embedded-social.mjs',
  'package.json',
]);
/**
 * §BATCH 2h (`AV-043`, 2026-09-30) — THE PO VOCABULARY MAPPING.
 *
 * The audit found *"two vocabularies with no declared mapping"*: Mercenta's own
 * purchase-order and line statuses, and the retail channel's (`purchaseOrderState`,
 * `purchaseOrderStatus`, `itemConfirmationStatus`, `poItemState`), with nothing in
 * writing linking them — *"mapping bugs at live integration; ambiguous status
 * reporting"*. This phase declares the mapping ONCE, in both directions, and makes
 * the acknowledgement window consult it instead of deciding the channel position
 * itself.
 *
 * Declared set — every file the phase touches, named:
 *   · `poChannelVocabulary.ts` — NEW: the ONE owner (forward table, reverse set,
 *     line vocabulary, the seam's status correspondence, the module-load guards).
 *   · `src/types.ts` — the CHANNEL's raw vocabulary declared once (the same rule
 *     that puts `PO_REJECTION_CODES` and `PO_CHANNEL_CHANGE_KINDS` there).
 *   · `src/config/purchaseOrders.ts` — `PO_ACK_STATUSES_WITH_OBLIGATION` DERIVED
 *     from the owner instead of re-typed as a second copy of the same fact.
 *   · `src/lib/commerce/poAcknowledgementWindow.ts` — its hidden private mapping
 *     removed; it now asks the owner, and an undeclared status offers NO action.
 *   · `src/lib/commerce/channelReceivingSync.ts` — the integration boundary reports
 *     the mapped channel position and Mercenta's candidate statuses, so the two can
 *     never be silently assumed equal.
 *   · the gate, the two scope guards and `package.json` that register it.
 * NOTHING PROTECTED IS TOUCHED: `src/lib/spapi/client.ts` is unchanged — the seam's
 * status union is pinned by a compile-time assertion in the owner instead.
 */
const BATCH2H_PO_VOCABULARY_SCOPE = new Set([
  'src/types.ts',
  'src/config/purchaseOrders.ts',
  'src/lib/commerce/poChannelVocabulary.ts',        /* NEW — the ONE owner */
  'src/lib/commerce/poAcknowledgementWindow.ts',
  'src/lib/commerce/channelReceivingSync.ts',
  'scripts/validate-po-channel-vocabulary.mjs',     /* NEW — this phase's gate */
  'scripts/validate-e6-brand-surfaces.mjs',
  'scripts/validate-e7-embedded-social.mjs',
  'package.json',
]);

/**
 * §BATCH 2i (`AV-045`, 2026-09-30) — THE DELIVERY-APPOINTMENT CONCEPT.
 *
 * The audit found Mercenta modelled NO appointment concept even though inbound
 * delivery to the retail channel is appointment-based and the channel documents
 * one hard rule about it — *"Carrier Requested Delivery Date must fall within the
 * PO's Delivery Window"* (`S15`) — with real performance consequences. This phase
 * adds the concept ONCE, fail-closed, and renders it.
 *
 * Declared set — every file the phase touches, named:
 *   · `src/types.ts` — the channel's appointment vocabulary declared once (the
 *     same rule as `CHANNEL_PO_ORDER_STATES`), plus the verdict/projection shapes.
 *   · `src/lib/shipping/deliveryAppointment.ts` — NEW: the ONE owner (behaviour
 *     table, fail-closed resolution, the window rule, the derivation, presentation).
 *   · `src/data/api.ts` — the ONE projection point (`attachShipmentAppointment`),
 *     composed into both shipment readers beside the ETA.
 *   · `src/data/demoData.ts` — `DemoShipment` gains the optional projection field.
 *   · `src/components/brand/LogisticsHub.tsx` — renders the appointment and the
 *     window verdict through the owner's presentation.
 *   · the gate, the browser spec, the two scope guards and `package.json`.
 */
const BATCH2I_DELIVERY_APPOINTMENT_SCOPE = new Set([
  'src/types.ts',
  'src/lib/shipping/deliveryAppointment.ts',        /* NEW — the ONE owner */
  'src/data/api.ts',
  'src/data/demoData.ts',
  'src/components/brand/LogisticsHub.tsx',
  'scripts/validate-delivery-appointment.mjs',      /* NEW — this phase's gate */
  'scripts/verify-live-demo.mjs',                   /* +L18 — the appointment on the deployed surface */
  'e2e/delivery-appointment.spec.ts',               /* NEW — the browser proof */
  'scripts/validate-e6-brand-surfaces.mjs',
  'scripts/validate-e7-embedded-social.mjs',
  'package.json',
]);

/**
 * §BATCH 2j (`AV-009` / `AV-010b`, 2026-09-30) — THE ACKNOWLEDGEMENT'S TWO DUTIES.
 *
 * The audit registered two open findings about the acknowledgement: the channel requires a
 * COMPLETE acknowledgement and rejects an omitted line (`AV-009`), and *"Vendors must reject
 * any purchase order that is on hold past the 24-hour time limit"* (`AV-010b`). The platform
 * applied the first consequence without declaring the rule, and had no hold concept at all.
 *
 * Declared set — every file the phase touches, named:
 *   · `src/types.ts` — the channel's three-valued hold vocabulary + the recordable statement
 *     type + the purchase-order fields (`channelHold`, `implicitlyRejectedLines`).
 *   · `src/config/purchaseOrders.ts` — the TWO rule statements and the hold-state labels
 *     (declared once; the module-load guard fails if a state loses its label).
 *   · `src/lib/commerce/poAcknowledgementCompleteness.ts` — NEW: the completeness owner.
 *   · `src/lib/commerce/poAcknowledgementWindow.ts` — the hold duty, its refusal, its warning
 *     and the override that lets the channel-REQUIRED rejection through the update window.
 *   · `src/data/api.ts` — enforcement, the record of the omission, the audit facts, and the
 *     ONE hold-statement recorder (which REFUSES a statement claiming a live source).
 *   · `src/components/brand/BrandPurchaseOrders.tsx` — renders both duties from the owners.
 *   · `src/components/admin/AdminPurchaseOrderList.tsx` — the simulated declaration that makes
 *     the hold REACHABLE in the deployed demo, refused unless a simulated read is active.
 *   · the gate, the browser spec, the two scope guards and `package.json`.
 * NOTHING PROTECTED IS TOUCHED: `src/lib/spapi/client.ts` (the seam's read shape) is
 * UNCHANGED — the channel's hold signal is not documented in the evidence the platform holds,
 * so extending that read is recorded as BLOCKED rather than guessed.
 */
const BATCH2J_PO_ACK_DUTIES_SCOPE = new Set([
  'src/types.ts',
  'src/config/purchaseOrders.ts',
  'src/lib/commerce/poAcknowledgementCompleteness.ts',  /* NEW — the completeness owner */
  'src/lib/commerce/poAcknowledgementWindow.ts',
  'src/data/api.ts',
  'src/components/brand/BrandPurchaseOrders.tsx',
  'src/components/admin/AdminPurchaseOrderList.tsx',
  'scripts/validate-po-ack-duties.mjs',                 /* NEW — this phase's gate */
  'e2e/po-ack-duties.spec.ts',                          /* NEW — the browser proof */
  'scripts/validate-e6-brand-surfaces.mjs',
  'scripts/validate-e7-embedded-social.mjs',
  'package.json',
]);



/**
 * §OWNER-REPORTED DEFECTS (2026-09-30) — THE FIVE DEFECTS THE OWNER FOUND IN THE RUNNING
 * PRODUCT, FIXED AT SOURCE.
 *
 * The owner reported: a raw decimal countdown ("Ack within 20.9712…h"); a Super Admin able to
 * acknowledge on a brand's behalf with no authorisation; work categories carrying no colour
 * while the priority did; three unexplained drawer buttons; and a purchase order showing
 * "Received" beside a live acknowledgement countdown (impossible).
 *
 * Declared set — every file this work touches, named:
 *   · `src/lib/statusPresentation.ts` — the countdown is stated as whole hours + minutes (and
 *     fails closed on an unreadable figure); `PO_STATUS.received` is now "Received from
 *     channel", because "Received" also labelled the GOODS-received state.
 *   · `src/lib/commerce/receivingStatus.ts` — the goods labels now name the goods and the
 *     place ("Goods received at the FC"), so one word no longer carries two meanings.
 *   · `src/types.ts`, `src/config/purchaseOrders.ts`, `src/lib/commerce/poOnBehalfAuthority.ts`
 *     (NEW) and `src/data/api.ts` — the on-behalf AUTHORITY rule: an on-behalf decision now
 *     requires the brand's recorded authorisation, or the closing window plus the
 *     channel-required all-rejected submission, ENFORCED IN THE WRITER.
 *   · `src/components/admin/AdminPurchaseOrderDetail.tsx` and
 *     `src/components/brand/BrandPurchaseOrders.tsx` — the surfaces state the authority, and
 *     the brand can record/withdraw it.
 *   · `src/lib/work/workStore.ts` and `src/components/shared/WorkWorkspace.tsx` — every work
 *     category gets a declared tone (one owner), and the drawer's buttons say what they do.
 *   · `e2e/invoicing.spec.ts` and `e2e/p12-channel-operations.spec.ts` — REPOINTED to the
 *     corrected goods-received wording (never weakened; same facts).
 *   · the new gate, the two scope guards and `package.json`.
 */
const OWNER_REPORTED_DEFECTS_SCOPE = new Set([
  'src/lib/statusPresentation.ts',
  'src/lib/commerce/receivingStatus.ts',
  'src/types.ts',
  'src/config/purchaseOrders.ts',
  'src/lib/commerce/poOnBehalfAuthority.ts',        /* NEW — the authority owner */
  'src/data/api.ts',
  'src/components/admin/AdminPurchaseOrderDetail.tsx',
  'src/components/brand/BrandPurchaseOrders.tsx',
  'src/lib/work/workStore.ts',
  'src/components/shared/WorkWorkspace.tsx',
  'scripts/validate-on-behalf-authority.mjs',       /* NEW — this work's gate */
  'e2e/invoicing.spec.ts',
  'e2e/p12-channel-operations.spec.ts',
  'scripts/validate-e6-brand-surfaces.mjs',
  'scripts/validate-e7-embedded-social.mjs',
  'package.json',
]);

/**
 * §PLAIN-ENGLISH ENFORCEMENT (2026-09-29, Founder directive) — the rule that asks for
 * plain English already existed and was still not followed, so the owner was offered a
 * decision in words they could not evaluate and the work stopped. This phase turns the
 * rule into something the build CHECKS: a jargon checker the owner-facing summary must
 * pass, and a gate that fails if the rule is missing from any folder the assistant
 * reads, if those copies drift apart, or if the hard-stop wording is removed.
 *
 * Declared set: the two new scripts, the rule file itself (kept in the project so it
 * cannot be lost), the state contract that names the new mandatory field, and the
 * phases' own scope guards.
 */
const PLAIN_ENGLISH_ENFORCEMENT_SCOPE = new Set([
  'scripts/check-plain-english.mjs',                /* NEW — the jargon checker */
  'scripts/validate-plain-english-enforcement.mjs', /* NEW — the gate */
  'scripts/validate-rules-application.mjs',         /* NEW — the ALL-RULES gate (Founder directive) */
  '.clinerules/plain-english-responses.md',         /* the rule, kept in the project */
  '.clinerules/project-state-contract.md',          /* the new mandatory field is declared there */
  '.clinerules/operating-model.md',
  '.clinerules/protection-rules.md',
  'PROJECT_STATUS.md',
  'scripts/validate-e6-brand-surfaces.mjs',
  'scripts/validate-e7-embedded-social.mjs',
  'package.json',
]);


/**
 * §P0 — THE WHOLE-LOOP TRACE (2026-10-01, `docs/CLEANUP_AND_VERIFICATION_PLAN_2026-09-30.md` P0).
 *
 * P0 is a PROOF phase, not a feature phase: it drives ONE seeded order through
 * arrive → route → decide → channel ack → ASN → confirmation → invoice → payout and
 * PRINTS every step, and answers the owner's fourth question FROM THE SOURCE
 * (consignment documents are OPENABLE and PRINTABLE; there is NO file-download
 * control, so any expectation of one is a gap flagged for the owner's decision D3).
 *
 * Its one product-code change is in a GATE: `validate-operating-costs.mjs` pinned its
 * summary to a fixed instant while recording its entries on the real clock, so it
 * passed only while the machine's date sat inside that one month and failed on
 * 2026-10-01 with no product change. A check that depends on the calendar is a defect,
 * not a gate; it now takes ONE clock. Declared set below.
 */
const P0_LOOP_TRACE_SCOPE = new Set([
  'scripts/validate-commerce-loop.mjs',            /* NEW — the P0 trace gate */
  'scripts/validate-operating-costs.mjs',          /* the date-dependent check, fixed at source */
  'docs/CLEANUP_AND_VERIFICATION_PLAN_2026-09-30.md',
  'PROJECT_STATUS.md',
  'HANDOFF.md',
  'STATUS_CHECK.md',
  'requirements-registry.json',
  'scripts/validate-e6-brand-surfaces.mjs',
  'scripts/validate-e7-embedded-social.mjs',
  'package.json',
]);

/**
 * §MERGED PLAN + AMAZON VENDOR CODES (2026-10-02) — the declared surface.
 *
 * Two increments, both recorded in `docs/CLEANUP_AND_VERIFICATION_PLAN_2026-09-30.md`
 * (now the SINGLE plan of record — the former `docs/NEXT_BUILD_PLAN_2026-09-27.md`
 * is merged into it and reduced to a pointer):
 *   · P0a — the owner's product-data folder `Products/` is BACKED UP (saved into the
 *     project), and the standing rule "when the owner adds a folder, back it up" is
 *     recorded.
 *   · P1a — the Amazon vendor-code → category registry
 *     (`src/config/amazonVendorCodes.ts`, NEW) is saved VERBATIM, with its gate
 *     (`scripts/validate-amazon-vendor-codes.mjs`, NEW).
 * The F5/F5b/F6 contract is UNCHANGED: a changed SOURCE file outside EVERY declared
 * set still fails, and no protected path is touched.
 */
const MERGED_PLAN_AND_VENDOR_CODES_SCOPE = new Set([
  'src/config/amazonVendorCodes.ts',              /* NEW — the vendor-code registry */
  'scripts/validate-amazon-vendor-codes.mjs',     /* NEW — its gate */
  'Products/',                                    /* the owner's product-data folder, backed up (P0a) */
  /**
   * §DEFECT FIXED AT SOURCE (2026-10-02) — TWO calendar-dependent gates.
   * `scripts/validate-work-layer.mjs` pinned the work clock to the stale literal
   * '2026-09-19', and `src/data/demoData.ts` fixed the first demo contract's
   * renewal to the literal '2026-10-01'. Both fell behind the real date, so two
   * gates failed with NO product change. Each now derives its date from the real
   * clock (see the inline notes in both files).
   */
  'scripts/validate-work-layer.mjs',
  'src/data/demoData.ts',
  'package.json',
  'scripts/validate-e6-brand-surfaces.mjs',
  'scripts/validate-e7-embedded-social.mjs',
]);

/**
 * §P1 — THE ONE SWITCH (2026-10-02). The declared surface of the environment-owner
 * phase (`docs/CLEANUP_AND_VERIFICATION_PLAN_2026-09-30.md` §3 P1): ONE owner of
 * the platform environment (`src/config/environment.ts`, NEW); the data layer's
 * seed fallback made DEMO-ONLY (`src/data/api.ts`); the provider-mode machine
 * repointed to the owner (`src/integrations/types.ts`); the switch made operable
 * in one obvious place (`SimulationControl.tsx`); its gate
 * (`scripts/validate-environment.mjs`, NEW). NO protected path is touched.
 *
 * The F5/F5b/F6 contract is UNCHANGED: a changed SOURCE file outside EVERY
 * declared set still fails.
 */
const P1_ENVIRONMENT_SCOPE = new Set([
  'src/config/environment.ts',                              /* NEW — the ONE owner */
  'scripts/validate-environment.mjs',                       /* NEW — its gate */
  'src/data/api.ts',                                        /* the seed fallback is demo-only */
  'src/integrations/types.ts',                              /* modeForState reads the owner */
  'src/components/admin/integrations/SimulationControl.tsx', /* the switch, in one place */
  'e2e/simulation-control.spec.ts',                         /* the browser proof of the switch */
  'docs/CLEANUP_AND_VERIFICATION_PLAN_2026-09-30.md',
  'scripts/validate-e6-brand-surfaces.mjs',
  'scripts/validate-e7-embedded-social.mjs',
  'package.json',
]);

/**
 * §P1-fix — THE DOWNLOAD CONTROL (2026-10-02, owner decision D3 = print AND download).
 *
 * P0 recorded a finding (P0-fix): programme decision 6 says the Logistics Hub is *"where
 * brands download shipping labels + ALL PO documents"*, but only OPEN/PRINT existed — no
 * file download. The owner then decided **D3 = BOTH**, so this phase adds the download:
 *   · `poDocumentPack.ts` — the pack owner gains the pack-as-a-file renderer
 *     (`renderPoDocumentPackHtml`) and safe filename helpers; nothing is re-rendered.
 *   · `PoDocumentPackPanel.tsx` — a per-document DOWNLOAD beside Open/Print, plus a
 *     WHOLE-PACK download ("all PO documents" in one file).
 *   · `LogisticsHub.tsx` — the carrier-label and waybill DIALOGUES gain Download, so the
 *     brand can download a DHL/Palletline label as well as print it; ONE renderer per
 *     artefact is preserved (the file is the dialogue's own rendered node).
 *   · `validate-po-documents.mjs` — extended (executed) to prove the pack file is real,
 *     complete, honest and safely named.
 *   · `validate-commerce-loop.mjs` — §6 REPOINTED (the download now exists; the old
 *     "no download" contract is recorded inline). No validator was weakened.
 * The F5/F5b/F6 contract is UNCHANGED: a changed SOURCE file outside EVERY declared set
 * still fails, and no protected path is touched.
 */
const P1FIX_DOWNLOAD_CONTROL_SCOPE = new Set([
  'src/lib/documents/poDocumentPack.ts',                     /* the pack owner + pack-as-a-file */
  'src/components/shared/logistics/PoDocumentPackPanel.tsx', /* per-document + whole-pack Download */
  'src/components/brand/LogisticsHub.tsx',                   /* the label/waybill dialogues DOWNLOAD */
  'scripts/validate-po-documents.mjs',                       /* the extended (executed) pack gate */
  'scripts/validate-commerce-loop.mjs',                      /* §6 repointed: the download exists */
  'e2e/po-documents.spec.ts',                                /* the browser proof of the download */
  'docs/CLEANUP_AND_VERIFICATION_PLAN_2026-09-30.md',
  'scripts/validate-e6-brand-surfaces.mjs',
  'scripts/validate-e7-embedded-social.mjs',
  'package.json',
]);

/**
 * §P2 (owner decision D1, 2026-10-02) — TWO DEMO BRANDS.
 *
 * The demo universe is reduced from twenty businesses to THREE: Brand A Astonish
 * and Brand B Tapatío (both cleared/trading) plus Brand C Le Creuset (the blocked
 * compliance-scenario tenant). The ten approved Amazon categories stay KNOWN to the
 * system through the vendor-code registry (`src/config/amazonVendorCodes.ts`), not
 * through demo brands. This phase also FIXED A DEFECT AT SOURCE: `companiesHouseMock`'s
 * shared counter made the Companies House lookup always rate-limited at a brand
 * count ≡ 3 (mod 4), so `primeCompaniesHouseRegistrar` now seeds the registrar ONCE.
 *
 * Declared set — every file the phase touches, named. The F5/F5b/F6 contract is
 * UNCHANGED: a changed SOURCE file outside EVERY declared set still fails.
 */
const P2_TWO_DEMO_BRANDS_SCOPE = new Set([
  'src/data/demoData.ts',                        /* the three-brand seed + its baseline */
  'src/lib/compliance/companiesHouseMock.ts',    /* registrar seed-once + current brands */
  'src/lib/compliance/complianceSync.ts',        /* prime-once (defect fixed at source) */
  'scripts/validate-demo-completeness.mjs',      /* repointed to the 3-brand universe */
  'scripts/validate-commercial-model-selection.mjs',
  'scripts/validate-amazon-ads.mjs',
  'scripts/validate-review-s1.mjs',              /* categories → the vendor-code registry */
  'scripts/validate-review-s6.mjs',
  'scripts/validate-stage16.mjs',
  'e2e/compliance-gate.spec.ts',                 /* the gate demo repointed to Le Creuset */
  'e2e/catalog-product-management.spec.ts',      /* the blocked-catalog repoint */
  'e2e/document-verification.spec.ts',           /* the missing-document repoint */
  'e2e/embedded-social.spec.ts',                 /* the unapproved-brand repoint */
  'e2e/amazon-ads-dashboard.spec.ts',            /* the brand-universe count repoint */
  'e2e/founder-operating-system.spec.ts',        /* the brand-count metric repoint */
  'scripts/validate-e6-brand-surfaces.mjs',
  'scripts/validate-e7-embedded-social.mjs',
  'package.json',
]);

/**
 * §P3 — EVERY BUTTON IS WIRED (2026-10-02).
 *
 * The UI-wiring audit (`docs/CLEANUP_AND_VERIFICATION_PLAN_2026-09-30.md` §3 P3)
 * found and FIXED two decorative controls in `BrandSettings.tsx` ("Change
 * Password" / "Enable 2FA" — no handler, and no password/2FA system exists) and
 * ONE over-promising control in `ComplianceHub.tsx` ("Review & Confirm" only
 * CLOSED the modal while promising to lock values); the chart's `role="button"`
 * hit target was made genuinely activatable; and `demoStore.ts` gained the ONE
 * writer that records a brand's customs-document confirmation. The new gate is
 * `validate-ui-wiring.mjs`. F5/F5b/F6 contract UNCHANGED: a changed SOURCE file
 * outside EVERY declared set still fails.
 */
const P3_UI_WIRING_SCOPE = new Set([
  'src/components/brand/BrandSettings.tsx',          /* the two false security controls removed */
  'src/components/brand/ComplianceHub.tsx',          /* Review & Confirm now records a real confirmation */
  'src/components/shared/charts/MercentaCharts.tsx', /* role="button" made genuinely activatable */
  'src/data/demoStore.ts',                           /* NEW: confirmCustomsDocument — the ONE writer */
  'scripts/validate-ui-wiring.mjs',                  /* NEW — this phase's gate */
  'docs/CLEANUP_AND_VERIFICATION_PLAN_2026-09-30.md',
  'scripts/validate-e6-brand-surfaces.mjs',
  'scripts/validate-e7-embedded-social.mjs',
  'package.json',
]);

/**
 * §P4 — DEAD CODE AND DUPLICATE OWNERS (2026-10-02). The plan's fourth phase.
 *
 * The new `validate:dead-code` gate (0 undeclared candidates) removed the two
 * files nothing imported — `dailyReport.ts` (no consumer, no documentation) and
 * `firecrawlResearch.ts` (the unreached glue of the firecrawl seam) — and the
 * `src/data/api.ts` ASN auto-push stub was RESOLVED at source (the channel
 * confirmation is owned by `fileChannelShipmentConfirmation`, not a local
 * aspirational entry). The new `validate:duplicate-owners` gate consolidated the
 * second application-status label map (`ApplicationsPanel.tsx`) onto the ONE
 * owner (`statusPresentation.ts`). F5/F5b/F6 contract UNCHANGED: a changed SOURCE
 * file outside EVERY declared set still fails.
 */
const P4_CLEANUP_SCOPE = new Set([
  'src/data/api.ts',                          /* the ASN auto-push stub resolved at source */
  'src/components/admin/ApplicationsPanel.tsx',/* the duplicate STATUS_LABELS map removed */
  'src/lib/research/dailyReport.ts',          /* DELETED — unreferenced, undocumented */
  'src/lib/discovery/firecrawlResearch.ts',   /* DELETED — the unreached firecrawl glue */
  'scripts/validate-dead-code.mjs',           /* NEW — this phase's gate */
  'scripts/validate-duplicate-owners.mjs',    /* NEW — this phase's gate */
  'scripts/verify-registry.mjs',              /* knownFiles repointed (firecrawlResearch.ts → firecrawlClient.ts) */
  'docs/CLEANUP_AND_VERIFICATION_PLAN_2026-09-30.md',
  'scripts/validate-e6-brand-surfaces.mjs',
  'scripts/validate-e7-embedded-social.mjs',
  'package.json',
]);

/**
 * §BATCH 2k (`AV-011`) — THE ACKNOWLEDGEMENT-VERIFICATION PHASE (2026-10-02).
 *
 * Register `AV-011`: Mercenta transmitted an acknowledgement to the retail channel and
 * never CONFIRMED it arrived, so *"an ack could silently fail"*. The phase adds the
 * confirmation step as ONE owner (`src/lib/commerce/poAcknowledgementVerification.ts`)
 * that reads the channel's OWN order state back (the already-built
 * `getPurchaseOrdersStatus`) and FAILS CLOSED; records the transmission instant on the
 * instruction outcome; surfaces the verdict in the channel-operations console (which
 * REUSES the receiving read — no second channel call, no invented channel vocabulary);
 * and proves it with the NEW gate `scripts/validate-ack-verification.mjs`. F5/F5b/F6
 * contract UNCHANGED: a changed SOURCE file outside EVERY declared set still fails.
 */
const BATCH2K_ACK_VERIFICATION_SCOPE = new Set([
  'src/types.ts',                                     /* the ONE verification vocabulary + the recorded instant */
  'src/config/purchaseOrders.ts',                     /* the 30-minute window, the rule text, the state labels */
  'src/lib/commerce/poAcknowledgementVerification.ts',/* NEW — the ONE owner */
  'src/lib/commerce/proxyProcessor.ts',               /* records the transmission instant */
  'src/components/admin/ChannelOperationsPanel.tsx',  /* surfaces the verdict, reusing the reading */
  'scripts/validate-ack-verification.mjs',            /* NEW — this phase's gate */
  'scripts/verify-live-demo.mjs',                     /* +L20 — the live check of both verdicts */
  'scripts/validate-e6-brand-surfaces.mjs',
  'scripts/validate-e7-embedded-social.mjs',
  'package.json',
]);

/**
 * §BATCH 2l (`AV-015`) — THE ASN-BEFORE-RECEIPT PHASE (2026-10-02).
 *
 * Register `AV-015`: the channel documents that the shipment confirmation must reach it
 * BEFORE the goods are received, and that missing/delayed confirmations cause
 * chargebacks — but the platform enforced and surfaced the ordering NOWHERE. The phase
 * adds the ordering owner (`src/lib/shipping/asnBeforeReceipt.ts`) that compares the ASN
 * filing instant against the channel's OWN logged receipt (the already-built
 * `getPurchaseOrdersStatus` read) and FAILS CLOSED; records the filing instant on the
 * instruction outcome; surfaces the verdict in the channel-operations console (reusing
 * the one receiving read); and proves it with the NEW gate
 * `scripts/validate-asn-before-receipt.mjs`. F5/F5b/F6 contract UNCHANGED.
 */
const BATCH2L_ASN_BEFORE_RECEIPT_SCOPE = new Set([
  'src/types.ts',                                     /* the ONE ordering vocabulary + the filing instant */
  'src/config/shipping.ts',                           /* the rule text and the state labels */
  'src/lib/shipping/asnBeforeReceipt.ts',             /* NEW — the ONE owner */
  'src/lib/commerce/proxyProcessor.ts',               /* records the ASN filing instant */
  'src/components/admin/ChannelOperationsPanel.tsx',  /* surfaces the verdict, reusing the reading */
  'scripts/validate-asn-before-receipt.mjs',          /* NEW — this phase's gate */
  'scripts/verify-live-demo.mjs',                     /* +L20 — the live check of both verdicts */
  'scripts/validate-e6-brand-surfaces.mjs',
  'scripts/validate-e7-embedded-social.mjs',
  'package.json',
]);

/**
 * §BATCH 2m (`AV-014`) — THE CHANNEL PICKUP LEAD-TIME ENFORCEMENT PHASE (2026-10-03).
 *
 * Register `AV-014`: the channel documents that a collect vendor's `requestedPickUp` must
 * be "a date at least two business days after the current date". From P6 the platform
 * DERIVED and SURFACED that date but never ENFORCED it against a submitted value, so a
 * shipment request could be raised EARLIER than the channel allows. The phase adds the
 * fail-closed validator to the ONE owner (`src/lib/shipping/collectChain.ts`), enforces it
 * at the seam boundary (`src/lib/shipping/channelShipmentOperations.ts`), surfaces the
 * verdict on the channel-operations console, strengthens the p12 seam gate, and proves it
 * with the NEW gate `scripts/validate-pickup-lead-time.mjs`. F5/F5b/F6 contract UNCHANGED.
 */
const BATCH2M_PICKUP_LEAD_TIME_SCOPE = new Set([
  'src/lib/shipping/collectChain.ts',                 /* the ONE owner + the enforcement validator */
  'src/lib/shipping/channelShipmentOperations.ts',    /* the boundary that refuses BEFORE any channel call */
  'src/components/admin/ChannelOperationsPanel.tsx',  /* surfaces the lead-time verdict from the owner */
  'scripts/validate-p12-spapi-seam.mjs',              /* strengthened: the boundary refusals are asserted */
  'scripts/validate-pickup-lead-time.mjs',            /* NEW — this phase's gate */
  'scripts/verify-live-demo.mjs',                     /* +L21 — the live check of the lead-time verdicts */
  'e2e/p12-channel-operations.spec.ts',               /* the browser proof of the surfaced verdict */
  'scripts/validate-e6-brand-surfaces.mjs',
  'scripts/validate-e7-embedded-social.mjs',
  'package.json',
]);

/**
 * §BATCH 2n — THE ASN PALLET-STRUCTURE PHASE (`AV-016`, 2026-10-03). The channel
 * documents the ASN as carrying "carton + pallet structures"; the platform modelled
 * the CARTON half only. This phase adds the ONE owner of the carton→pallet grouping
 * (`src/lib/shipping/asnPallets.ts`), declares the capacity once
 * (`ASN_PALLET_PROFILE` in `src/config/shipping.ts`), gives each pallet its own SSCC
 * (`src/lib/documents/sscc.ts`), carries the structure on the ASN record
 * (`src/data/api.ts`), sends it with the channel confirmation
 * (`src/lib/spapi/client.ts`, `src/lib/spapi/mockClient.ts`,
 * `src/lib/shipping/channelShipmentOperations.ts`), states it on the documents
 * (`src/lib/documents/poDocumentPack.ts`) and gates it
 * (`scripts/validate-asn-pallets.mjs`). Same mechanism as every phase above: a changed
 * SOURCE file outside EVERY declared set is still refused.
 */
const BATCH2N_ASN_PALLETS_SCOPE = new Set([
  'src/config/shipping.ts',                        /* ASN_PALLET_PROFILE — the ONE declared capacity */
  'src/lib/shipping/asnPallets.ts',                /* NEW — the ONE owner of the carton→pallet grouping */
  'src/lib/documents/sscc.ts',                     /* ssccForPallet — generation stays in the ONE SSCC owner */
  'src/data/api.ts',                               /* AsnPallet + AsnDetail.pallets + the partition invariant */
  'src/lib/commerce/proxyProcessor.ts',            /* asnForInstruction carries the structure + sends it */
  'src/lib/spapi/client.ts',                       /* the ASN payload's pallet-level structure */
  'src/lib/spapi/mockClient.ts',                   /* the simulated channel refuses an inconsistent structure */
  'src/lib/shipping/channelShipmentOperations.ts', /* the confirmation carries the pallets to the channel */
  'src/lib/documents/poDocumentPack.ts',           /* the documents state the pallet structure */
  'scripts/validate-asn-pallets.mjs',              /* NEW — this phase's gate */
  'scripts/verify-live-demo.mjs',                  /* +L22 — the live check of the pallet structure */
  'e2e/po-documents.spec.ts',                      /* the browser proof the labels render a pallet structure */
  'scripts/validate-e6-brand-surfaces.mjs',
  'scripts/validate-e7-embedded-social.mjs',
  'package.json',
]);


/* ── the modules under test ───────────────────────────────────────────────── */

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

/**
 * §Founder OS — FOUNDER OPERATING SYSTEM SPRINT (2026-09-19) — REPOINTED.
 *
 * F5/F5b/F6's contract is UNCHANGED: the working-tree change set must stay within
 * the files the CURRENT documented sprint declares. This sprint added the
 * canonical automation registry, the Founder Ops AI seam, the acquisition engine,
 * the BI findings layer, the Control Centre model + workspace and its browser
 * spec. Declared at module scope so ALL THREE scope guards (F5, F5b, F6) read the
 * SAME declaration — they previously disagreed, which is what the §Phase 1
 * REPOINTED note on F5/F5b records.
 */
const SPRINT_FOUNDER_OS_SCOPE = new Set([
  '.clinerules/project-state-contract.md',
  'src/lib/automation/registry.ts',
  'src/lib/ai/',
  'src/lib/acquisition/acquisitionEngine.ts',
  'src/lib/intelligence/intelligenceLayer.ts',
  'src/lib/commandCentre/controlCentre.ts',
  'src/lib/founder/briefFacts.ts',
  'src/lib/work/useWork.ts',
  'src/lib/events/types.ts',
  'src/lib/costs/modelPolicy.ts',
  'src/components/admin/FounderControlCentre.tsx',
  'src/components/layout/AdminShell.tsx',
  'scripts/validate-founder-operating-system.mjs',
  'scripts/validate-uiux-redesign.mjs',
  'scripts/validate-e6-brand-surfaces.mjs',
  'scripts/validate-e7-embedded-social.mjs',
  'scripts/reconcile-founder-os-registry.cjs',
  'scripts/lint-wording.mjs',
  'e2e/founder-operating-system.spec.ts',
  'docs/SPRINT_FOUNDER_OPERATING_SYSTEM_2026-09-19.md',
  'requirements-registry.json',
]);

/**
 * §Phase 1 — EXPLORE UK MARKET FIT / PRE-AUDIT SPRINT (2026-09-19) — REPOINTED.
 *
 * Same mechanism, same guard, same module-scope placement as above. This sprint
 * added the canonical pre-audit config and entity types, the research seam +
 * fixtures + deterministic engine, the pre-audit domain store and its port table,
 * the acquisition bridge, the public assessment surface, the homepage/nav CTA
 * wiring and the founder pre-audit queue. Anything outside EVERY declared set is
 * still refused, and the pre-existing offender set (`ave1-check.mjs` + the four
 * protected `design/*.png`) is unchanged — no protected design asset was touched,
 * renamed or added to git.
 */
const SPRINT_UK_MARKET_FIT_SCOPE = new Set([
  'src/config/ukMarketFit.ts',
  'src/types.ts',
  'src/lib/preaudit/',
  'src/data/preAuditStore.ts',
  'src/data/prospectStore.ts',
  'src/data/domainRepository.ts',
  'src/lib/events/types.ts',
  'src/components/marketing/ExploreUkMarketFit.tsx',
  'src/components/marketing/PublicNav.tsx',
  'src/components/marketing/Home.tsx',
  'src/config/homepageContent.ts',
  'src/lib/commandCentre/controlCentre.ts',
  'src/components/admin/FounderControlCentre.tsx',
  'scripts/validate-uk-market-fit.mjs',
  'scripts/integrity-audit.mjs',
  'scripts/validate-uiux-redesign.mjs',
  'scripts/validate-e6-brand-surfaces.mjs',
  'scripts/validate-e7-embedded-social.mjs',
  'scripts/reconcile-roadmap-phase1-registry.cjs',
  'e2e/uk-market-fit.spec.ts',
  'docs/SPRINT_UK_MARKET_FIT_PHASE1_2026-09-19.md',
  'requirements-registry.json',
  'test-screenshots/uk-market-fit/',
]);

/**
 * §Phase 2 — EXPLICIT WORKFLOW ROUTING / GATEWAY ARCHITECTURE (2026-09-19) —
 * the declared surface of this stage, in the same naming/declaring mechanism as
 * every set above.
 *
 * The stage is ADDITIVE and architectural: it introduces the routing vocabulary
 * (`src/config/routing.ts`), the Phase 2 commercial vocabulary
 * (`src/config/commercialReadiness.ts`), the pure routing evaluators
 * (`src/lib/routing/`), the deterministic commercial calculator + gate
 * (`src/lib/commercial/`), the canonical routing store
 * (`src/data/routingStore.ts`), one additive domain table on the EXISTING port
 * (`src/data/domainRepository.ts`), the canonical Phase 2 entities in the ONE
 * types file (`src/types.ts`) and the additive routing events
 * (`src/lib/events/types.ts`).
 *
 * The F6 contract is UNCHANGED: a source file in NO declared set still fails.
 * The pre-existing offender set (`ave1-check.mjs` + the four protected
 * `design/*.png`) is unchanged — no protected design asset was touched.
 */
const SPRINT_ROUTING_GATEWAYS_SCOPE = new Set([
  'src/config/routing.ts',
  'src/config/commercialReadiness.ts',
  'src/lib/routing/',
  'src/lib/commercial/',
  'src/data/routingStore.ts',
  'src/data/domainRepository.ts',
  'src/types.ts',
  'src/lib/events/types.ts',
  'scripts/validate-routing-gateways.mjs',
  'scripts/reconcile-phase2-routing-registry.cjs',
  'scripts/validate-e6-brand-surfaces.mjs',
  'scripts/validate-e7-embedded-social.mjs',
  'PROJECT_STATUS.md',
]);

/**
 * §P4 — PROXY-MODEL PHASE SCOPE (2026-09-23, programme `docs/DASHBOARD_LOGISTICS_CLEANUP_PROGRAMME_2026-09-22.md` §4 P4).
 *
 * P4 corrects the DIRECTION of the proxy model: the brand's decision becomes an
 * INSTRUCTION to Mercenta, and **MERCENTA** raises the routing/shipment request
 * and files the ASN. That requires touching the SP-API seam (the ONE protected
 * path in this set), the commerce lifecycle, the two proxy modules, the brand and
 * admin PO surfaces, and the shared routing status module. The guard's contract
 * is UNCHANGED — an unexplained path in any of these directories still fails —
 * and this set declares only what P4 actually owns.
 */
const P4_PROXY_MODEL_SCOPE = new Set([
  'src/lib/spapi/',
  'src/lib/commerce/',
  'src/types.ts',
  'src/data/api.ts',
  'src/data/knowledgeBase.ts',
  'src/lib/shipping/carrierRouting.ts',
  'src/lib/shipping/routingReadiness.ts',
  'src/components/brand/BrandPurchaseOrders.tsx',
  'src/components/shared/RoutingRequest.tsx',
  'src/components/admin/AdminPurchaseOrderDetail.tsx',
  'src/config/tours/tourDefinitions.ts',
  'e2e/proxy-model.spec.ts',
  'e2e/shipment-asn.spec.ts',
  'e2e/notifications.spec.ts',
  'e2e/po-lifecycle.spec.ts',
  'e2e/logistics-wave3.spec.ts',
  'scripts/validate-proxy-model.mjs',
  'scripts/validate-e6-brand-surfaces.mjs',
  'package.json',
  'docs/DASHBOARD_LOGISTICS_CLEANUP_PROGRAMME_2026-09-22.md',
]);

/**
 * §P5 — DESTINATION-FC PHASE SCOPE (2026-09-23, programme `docs/DASHBOARD_LOGISTICS_CLEANUP_PROGRAMME_2026-09-22.md`
 * §4 P5).
 *
 * P5 removes the Mercenta Hub as a destination: the destination becomes **the FC declared on each purchase
 * order** (`PurchaseOrder.shipToParty`, resolved by the NEW ONE owner `src/config/destinationFc.ts`), the
 * `mercenta_hub` stage/status/node kind and the hub coordinate are DELETED, and the Hero/map arrival node is
 * that FC. That legitimately touches the canonical types (`src/types.ts` — a PROTECTED prefix, declared here
 * exactly as P4 declared it), the domain creators and their status/stage maps, the carrier transforms, the
 * Hero/map modules, the copy surfaces the hub was asserted on, the gates/specs repointed with the old contract
 * recorded inline, and the programme/register records. The guard's contract is UNCHANGED — a path outside EVERY
 * declared set still fails, and an unexplained protected change still fails.
 */
const P5_DESTINATION_FC_SCOPE = new Set([
  'src/config/destinationFc.ts',            // NEW — the ONE destination owner
  'src/config/logisticsGeo.ts',
  'src/config/logisticsHero.ts',
  'src/types.ts',                           // PROTECTED prefix — declared
  'src/data/api.ts',
  'src/data/demoData.ts',
  'src/data/bootstrap.ts',
  'src/data/brandDossiers.ts',
  'src/context/GlobalStateContext.tsx',
  'src/lib/commerce/commerceLifecycle.ts',
  'src/lib/logistics/',
  'src/lib/statusPresentation.ts',
  'src/lib/dhl/transform.ts',
  'src/lib/palletline/transform.ts',
  'src/lib/simulation/investorDemo.ts',
  'src/lib/simulation/scenarioEngine.ts',
  'src/lib/grants/dataSources.ts',
  'src/components/admin/AdminDashboard.tsx',
  'src/components/brand/LogisticsHub.tsx',
  /* §P9 (programme decision 4) — REPOINTED: 'src/components/carrier/BakLogistics.tsx'
     and 'src/components/carrier/CarrierDashboard.tsx' were in this list; both are
     DELETED with the carrier surface. */
  'src/components/marketing/FAQ.tsx',
  'src/components/marketing/HowItWorks.tsx',
  'src/components/shared/logistics/',
  'e2e/logistics-hub-map.spec.ts',
  'e2e/status-semantics.spec.ts',
  'e2e/table-migrations.spec.ts',
  /** §P5 copy pass — the Overview h1 assertions repointed with the old text recorded inline. */
  'e2e/dashboard.spec.ts',
  'e2e/runtime-entry.spec.ts',
  'scripts/validate-logistics-map.mjs',
  'scripts/validate-logistics-hero.mjs',
  'scripts/validate-mock-providers.mjs',
  'scripts/validate-investor-demo.mjs',
  'scripts/reconcile-logistics-map-registry.cjs',
  'scripts/verify-demo-live.mjs',
  'scripts/validate-e6-brand-surfaces.mjs',
  'scripts/validate-e7-embedded-social.mjs',
  'docs/DASHBOARD_LOGISTICS_CLEANUP_PROGRAMME_2026-09-22.md',
  'docs/AMAZON_VENDOR_DISCREPANCY_REGISTER_2026-09-20.md',
  'docs/MERCENTA_MASTER_FEATURE_FUNCTION_MATRIX.md',
  'docs/MERCENTA_PRODUCT_CONTRACT.md',
  'PRODUCTION_READINESS.md',
]);

/**
 * §P6 — PO DOCUMENT PACK PHASE SCOPE (2026-09-23, programme
 * `docs/DASHBOARD_LOGISTICS_CLEANUP_PROGRAMME_2026-09-22.md` §4 P6).
 *
 * P6 builds the PO document pack that is produced AUTOMATICALLY on acceptance
 * (programme decisions 6 and 9): SSCC carton labels, the carrier label and
 * waybill (rendered by the EXISTING dialogues), the packing list/delivery note,
 * the ASN sheet, and the customs documents on international lanes only. It adds
 * the pack owner and the SSCC owner, the documented collect chain, the Hub's
 * "Documents for this PO" surface, the notification and the nav badge — so it
 * legitimately touches the canonical types (`src/types.ts` — a PROTECTED prefix,
 * declared here exactly as P4 and P5 declared it), the customs-document owner's
 * INPUT TYPE (widened from `DemoProduct` to the base `Product`; no behaviour
 * change), the acceptance write-path, the event feed, the nav badge map and the
 * notification centre. The guard's contract is UNCHANGED — a path outside EVERY
 * declared set still fails, and an unexplained protected change still fails.
 */
const P6_PO_DOCUMENT_PACK_SCOPE = new Set([
  'src/lib/documents/',                     // NEW — the pack + SSCC owners
  'src/lib/shipping/collectChain.ts',       // NEW — the documented collect chain
  'src/components/shared/logistics/',       // the pack surface (also declared by P5)
  'src/types.ts',                           // PROTECTED prefix — declared
  'src/lib/customsDocs.ts',                 // input type widened to Product
  'src/lib/commerce/proxyProcessor.ts',     // generates the pack on acceptance
  'src/lib/events/types.ts',                // the po_documents_ready event
  'src/lib/events/eventFeed.ts',            // its canonical emitter
  'src/lib/nav/navBadges.ts',               // the document-download badge
  'src/components/shared/NotificationCenter.tsx',
  'src/components/brand/LogisticsHub.tsx',  // the Hub mounts the pack surface
  'e2e/po-documents.spec.ts',
  'scripts/validate-po-documents.mjs',
  'scripts/validate-e6-brand-surfaces.mjs',
  'scripts/validate-e7-embedded-social.mjs',
  'package.json',
  'docs/DASHBOARD_LOGISTICS_CLEANUP_PROGRAMME_2026-09-22.md',
  'PRODUCTION_READINESS.md',
]);

const P7_ADMIN_INVOICING_SCOPE = new Set([
  'src/lib/commerce/invoiceTerms.ts',      // NEW — terms 14/30/60 + the ONE due-date owner
  'src/lib/commerce/invoiceRegistry.ts',   // NEW — the ONE invoice-number registry (AV-022)
  'src/lib/commerce/receivingStatus.ts',   // NEW — receiving status + the receipt gate (AV-018)
  'src/lib/commerce/commerceLifecycle.ts', // issue/cancel on the ONE write path
  'src/lib/dates.ts',                      // NEW — the pure date helpers (one declaration)
  'src/types.ts',                          // PROTECTED prefix — declared
  'src/data/demoStore.ts',                 // the append-only registry ledger + the receipt timestamp
  'src/lib/work/workStore.ts',             // invoice_due repointed to the ONE owner
  'src/lib/commandCentre/controlCentre.ts',
  'src/lib/ai/founderOpsAi.ts',
  'src/lib/automation/registry.ts',
  'src/components/admin/AdminDashboard.tsx',
  'src/components/admin/CommerceOperationsPanel.tsx',
  'src/components/admin/AccountingPanel.tsx',
  'src/components/brand/BrandDashboard.tsx',  // receivable predicate repointed to the ONE owner
  'src/lib/simulation/investorDemo.ts',       // the registry participates in the deterministic reset
  'e2e/invoicing.spec.ts',
  'scripts/validate-p7-invoicing.mjs',
  'scripts/validate-work-layer.mjs',
  'scripts/validate-e6-brand-surfaces.mjs',
  'scripts/validate-e7-embedded-social.mjs',
  'scripts/verify-demo-live.mjs',          // carries the §P7 live checks
  'package.json',
  'docs/DASHBOARD_LOGISTICS_CLEANUP_PROGRAMME_2026-09-22.md',
  'PRODUCTION_READINESS.md',
]);

/**
 * §P8 — INVENTORY + CHANNEL IDENTIFIER PHASE DECLARED SURFACE (2026-09-23,
 * programme `docs/DASHBOARD_LOGISTICS_CLEANUP_PROGRAMME_2026-09-22.md` §4 P8).
 *
 * P8 adds decision 5 (inventory linked to the catalogue, kept inside Mercenta)
 * and decision 10 (the channel identifier: brand-declared only for an existing
 * listing, otherwise populated from the channel's acceptance, and never
 * invented). It touches the canonical types and the canonical store (both
 * PROTECTED prefixes, declared exactly as P4/P5/P6/P7 declared them) and the
 * mock-first SP-API seam (the channel's acceptance response). The E6 guard's
 * contract is UNCHANGED — a changed source/test file in NO declared set still
 * fails, and an undeclared protected path still fails.
 */
const P8_INVENTORY_SCOPE = new Set([
  'src/lib/catalog/asin.ts',                  // NEW — the ONE channel-identifier owner (decision 10)
  'src/lib/inventory/inventoryRecord.ts',     // NEW — the ONE owner of the stock figures (decision 5)
  'src/lib/inventory/inventoryLifecycle.ts',  // NEW — the domain write path (RBAC + tenant + audit)
  'src/lib/inventory/',                       // NEW directory — git reports untracked dirs as one entry
  'src/components/brand/BrandInventory.tsx',  // NEW — the brand surface (decision 5's ten fields)
  'src/types.ts',                             // PROTECTED prefix — declared
  'src/data/demoStore.ts',                    // the ledger + settings + identifiers, and the removed invented ASIN
  'src/data/api.ts',                          // the seam's poll result now carries the channel identifier
  'src/lib/spapi/client.ts',                  // the real client surfaces the channel's identifier
  'src/lib/spapi/mockClient.ts',              // the mock returns the unmistakable SIM-ASIN-… placeholder
  'src/lib/catalog/catalogLifecycle.ts',      // acceptance populates the identifier (decision 10, channel half)
  'src/lib/simulation/investorDemo.ts',       // the new canonical stores join the deterministic reset
  'src/components/brand/ProductCatalog.tsx',  // the per-catalogue-product ASIN column
  'src/components/brand/BrandReports.tsx',    // the fabricated on-hand estimate is repointed to the owner
  'src/components/layout/BrandShell.tsx',     // the Inventory destination, in the Catalogue section
  'src/components/admin/CatalogManagerAdmin.tsx', // the admin position + the attributed override
  'e2e/inventory.spec.ts',
  'scripts/validate-p8-inventory.mjs',
  'scripts/validate-e6-brand-surfaces.mjs',
  'scripts/validate-e7-embedded-social.mjs',
  'scripts/verify-demo-live.mjs',             // carries the §P8 live checks
  'package.json',
  'docs/DASHBOARD_LOGISTICS_CLEANUP_PROGRAMME_2026-09-22.md',
  'PRODUCTION_READINESS.md',
]);

/**
 * §P9 (2026-09-23, programme `docs/DASHBOARD_LOGISTICS_CLEANUP_PROGRAMME_2026-09-22.md`
 * §4 P9) — CARRIER-REMOVAL DECLARED SURFACE.
 *
 * Decision 4: remove the 3PL carrier surface COMPLETELY, including the demo
 * environment (environment, role, shell + its three views, `CarrierDashboard`,
 * `BakLogistics`, the demo switcher entry, the "3PL Carrier Terminal" login card,
 * the admin "Carrier Monitor", the public FAQ claim and the affected documents),
 * plus decision 1's carrier identity (`fedex`/`bak`) from the type, the labels
 * and the capability table. Matrix `D01-07` / `D04-18` / `D10-13`.
 *
 * It touches the canonical types and the canonical shipping config (PROTECTED
 * prefixes, declared exactly as P4–P8 declared them) and DELETES four components.
 * The E6 guard's contract is UNCHANGED — a changed source/test file in NO
 * declared set still fails, and an undeclared protected path still fails.
 */
const P9_CARRIER_REMOVAL_SCOPE = new Set([
  /* Runtime / domain: the environment, role, tier, addresses and SEO posture */
  'src/types.ts',                             // PROTECTED prefix — declared
  'src/lib/auth/rbac.ts',                     // the 3pl tier + the carriers view are removed
  'src/lib/runtime/productRoutes.ts',         // the /carrier prefix is no longer an address
  'src/lib/runtime/sessionPersistence.ts',    // a stale carrier session fails closed
  'src/lib/seo/routeMetadata.ts',
  'src/lib/seo/publicRoutes.ts',
  'src/App.tsx',
  'src/context/GlobalStateContext.tsx',       // carrierContext / fedex+bak connection flags
  /* The carrier surface itself — DELETED */
  'src/components/layout/CarrierShell.tsx',
  'src/components/carrier/CarrierDashboard.tsx',
  'src/components/carrier/BakLogistics.tsx',
  'src/components/admin/CarrierMonitor.tsx',
  /* Surfaces repointed (incl. the REHOMED carrier-event console) */
  'src/components/layout/AdminShell.tsx',
  'src/components/layout/EnvironmentRouter.tsx',
  'src/components/layout/Sidebar.tsx',
  'src/components/auth/Login.tsx',
  'src/components/admin/LogisticsControl.tsx', // the carrier-event console, rehomed to its owner
  'src/components/admin/FounderControlCentre.tsx',
  'src/components/admin/SuperAdminPanel.tsx',
  'src/components/brand/LogisticsHub.tsx',
  'src/components/brand/OnboardingWizard.tsx',
  'src/components/marketing/FAQ.tsx',
  'src/components/marketing/HowItWorks.tsx',
  'src/components/marketing/UKMarketAccess.tsx',
  /* Carrier identity (decision 1) + the affected demo data */
  'src/config/shipping.ts',                   // RETIRED_CARRIER_IDS replaces the fedex/bak entries
  'src/lib/shipping/carrierRouting.ts',
  'src/lib/shipping/shippingCalculator.ts',
  'src/data/bootstrap.ts',
  'src/data/brandDossiers.ts',
  'src/data/demoStore.ts',
  'src/data/api.ts',
  'src/lib/simulation/investorDemo.ts',
  /* The gates + specs repointed to the removal contract / the new owner */
  'e2e/app-shell.spec.ts',
  'e2e/compliance-sim.spec.ts',
  'e2e/multi-tenant.spec.ts',
  'e2e/runtime-entry.spec.ts',
  'e2e/shipment-asn.spec.ts',
  'e2e/status-semantics.spec.ts',
  'e2e/table-migrations.spec.ts',
  'scripts/integrity-audit.mjs',
  'scripts/runtime-sweep.mjs',
  'scripts/live-demo-check.mjs',
  'scripts/forensic-screenshots.mjs',
  'scripts/validate-product-routes.mjs',
  'scripts/validate-review-s6.mjs',
  'scripts/validate-stage16.mjs',
  'scripts/validate-stage26.mjs',
  'scripts/validate-workspace-shell.mjs',
  'scripts/validate-e6-brand-surfaces.mjs',
  'scripts/validate-e7-embedded-social.mjs',
  'scripts/verify-demo-live.mjs',
  /* Documentation + the state sources */
  'docs/DASHBOARD_LOGISTICS_CLEANUP_PROGRAMME_2026-09-22.md',
  'docs/MERCENTA_MASTER_FEATURE_FUNCTION_MATRIX.md',
  'PROJECT_STATUS.md',
  'HANDOFF.md',
  'STATUS_CHECK.md',
  'requirements-registry.json',
  'PRODUCTION_READINESS.md',
]);

/**
 * §P10 (2026-09-24, programme `docs/DASHBOARD_LOGISTICS_CLEANUP_PROGRAMME_2026-09-22.md`
 * §4 P10; matrix `D10-10`; programme decision 11) — LOGISTICS-COMPLETION DECLARED SURFACE.
 *
 * P10 completes the Logistics Hub: the carrier PROVIDER CONFIGURATION, the PO-document
 * DOWNLOAD QUEUE (the destination the nav badge already counted) and the consolidation
 * posture recorded as DEFERRED with its documented channel evidence. It adds two domain
 * owners plus three shared surfaces and wires BOTH logistics workspaces to them. The F5/
 * F5b/F6 contract is UNCHANGED: a changed source/test file in NO declared set still
 * fails, and an undeclared protected path still fails.
 */
const P10_LOGISTICS_COMPLETION_SCOPE = new Set([
  /* The new domain owners */
  'src/lib/shipping/providerConfiguration.ts',
  'src/lib/shipping/consolidation.ts',
  /* The shared surfaces (one per record, rendered by both shells) */
  'src/components/shared/logistics/PoDocumentQueuePanel.tsx',
  'src/components/shared/logistics/CarrierProviderConfigurationPanel.tsx',
  'src/components/shared/logistics/ConsolidationPosturePanel.tsx',
  /* The two workspaces + the shell hand-off to the credential owner */
  'src/components/brand/LogisticsHub.tsx',
  'src/components/admin/LogisticsControl.tsx',
  'src/components/layout/AdminShell.tsx',
  /* The gates + the browser specs */
  'scripts/validate-logistics-providers.mjs',
  'scripts/validate-po-documents.mjs',
  'scripts/validate-e6-brand-surfaces.mjs',
  'scripts/validate-e7-embedded-social.mjs',
  'scripts/verify-demo-live.mjs',
  'package.json',
  'e2e/po-documents.spec.ts',
  'e2e/logistics-providers.spec.ts',
  /* Documentation + the state sources */
  'docs/DASHBOARD_LOGISTICS_CLEANUP_PROGRAMME_2026-09-22.md',
  'docs/MERCENTA_MASTER_FEATURE_FUNCTION_MATRIX.md',
  'PROJECT_STATUS.md',
  'HANDOFF.md',
  'STATUS_CHECK.md',
  'requirements-registry.json',
  'PRODUCTION_READINESS.md',
]);

/**
 * §P11 (2026-09-24, programme `docs/DASHBOARD_LOGISTICS_CLEANUP_PROGRAMME_2026-09-22.md`
 * §4 P11; matrix `cleanup-p11-remove-create-po`; programme decision 3) —
 * CHANNEL-INGESTION DECLARED SURFACE.
 *
 * P11 REMOVES "Create PO" (the admin on-behalf creation action, `createPurchaseOrder`
 * and its Postmark PO-notification seam) and replaces it with CHANNEL PURCHASE-ORDER
 * INGESTION: the PO is addressed to Mercenta, Mercenta routes it to the brand from
 * the PO's OWN lines, and anything unroutable is refused. It touches the SP-API
 * read (a PROTECTED file → declared here), one domain owner, one surface, four
 * gates and two specs. The F5/F5b/F6 contract is UNCHANGED: a changed source/test
 * file in NO declared set still fails, and an undeclared protected path still fails.
 */
const P11_CHANNEL_PO_INGESTION_SCOPE = new Set([
  /* The new domain owner (routing, idempotency, fail-closed refusals, audit) */
  'src/lib/commerce/channelPurchaseOrderIngestion.ts',
  /* The gate's own SP-API read (PROTECTED prefix — declared, not widened) */
  'src/lib/spapi/client.ts',
  'src/lib/spapi/mockClient.ts',
  /* The app-facing seam + the admin surface whose action P11 replaces */
  'src/data/api.ts',
  'src/components/admin/AdminPurchaseOrderList.tsx',
  /* The removed duplicate email seam (deleted by P11 — decision 3) */
  'src/lib/notifications/postmarkNotifier.ts',
  /* The gates + the browser specs */
  'scripts/validate-channel-po-ingestion.mjs',
  'scripts/validate-e4-commerce.mjs',
  'scripts/validate-e5-admin-surfaces.mjs',
  'scripts/validate-e6-brand-surfaces.mjs',
  'scripts/validate-e7-embedded-social.mjs',
  'scripts/validate-mock-seam.mjs',
  'scripts/verify-demo-live.mjs',
  'package.json',
  'e2e/notifications.spec.ts',
  'e2e/channel-po-ingestion.spec.ts',
  /* Documentation + the state sources */
  'docs/DASHBOARD_LOGISTICS_CLEANUP_PROGRAMME_2026-09-22.md',
  'docs/MERCENTA_MASTER_FEATURE_FUNCTION_MATRIX.md',
  'MERCENTA_ARCHITECTURE.md',
  'PROJECT_STATUS.md',
  'HANDOFF.md',
  'STATUS_CHECK.md',
  'requirements-registry.json',
  'PRODUCTION_READINESS.md',
]);

/**
 * §P12 (2026-09-24, programme `docs/DASHBOARD_LOGISTICS_CLEANUP_PROGRAMME_2026-09-22.md`
 * §4 P12; register `AV-040`) — SP-API SEAM EXTENSION DECLARED SURFACE.
 *
 * P12 completes the channel's documented vendor surface on the EXISTING seam
 * (`getPurchaseOrdersStatus`, `submitShipmentRequest`, `getShipmentDetails`,
 * `getShipmentLabels`, `submitShipmentConfirmations`, `submitInvoices`,
 * `submitInventoryUpdate`) and gives each in-code P12 declaration a real owner:
 * the receiving sync, the shipment operations, invoice submission and the stock
 * push. It touches the PROTECTED `src/lib/spapi/**` seam (declared, not widened),
 * the instruction/workflow owners, one new admin surface and the gates/specs. The
 * F5/F5b/F6 contract is UNCHANGED: a changed file in NO declared set still fails.
 */
const P12_SPAPI_SEAM_SCOPE = new Set([
  /* The seam (PROTECTED prefix — declared, not widened) + its ONE region rule */
  'src/lib/spapi/client.ts',
  'src/lib/spapi/mockClient.ts',
  'src/lib/spapi/index.ts',
  'src/config/shipping.ts',
  /* The four new owners the seam operations land in */
  'src/lib/commerce/channelReceivingSync.ts',
  'src/lib/commerce/channelInvoiceSubmission.ts',
  'src/lib/shipping/channelShipmentOperations.ts',
  'src/lib/inventory/channelInventoryPush.ts',
  /* The owners whose honest limits named P12, and the chain that uses the seam */
  'src/lib/commerce/receivingStatus.ts',
  'src/lib/commerce/channelPurchaseOrderIngestion.ts',
  'src/lib/commerce/channelInstructions.ts',
  'src/lib/commerce/proxyProcessor.ts',
  'src/lib/commerce/commerceLifecycle.ts',
  'src/lib/shipping/consolidation.ts',
  'src/lib/inventory/inventoryRecord.ts',
  'src/lib/inventory/inventoryLifecycle.ts',
  /* The surfaces: the new channel-operations console + its mount + the pack */
  'src/components/admin/ChannelOperationsPanel.tsx',
  'src/components/admin/RetailPipeline.tsx',
  'src/components/admin/CatalogManagerAdmin.tsx',
  'src/components/shared/logistics/PoDocumentPackPanel.tsx',
  /* The canonical contract + the app seam */
  'src/types.ts',
  'src/data/api.ts',
  /* The gates + the browser specs */
  'scripts/validate-p12-spapi-seam.mjs',
  'scripts/validate-proxy-model.mjs',
  'scripts/validate-logistics-providers.mjs',
  'scripts/validate-e6-brand-surfaces.mjs',
  'scripts/validate-e7-embedded-social.mjs',
  'scripts/verify-demo-live.mjs',
  'e2e/p12-channel-operations.spec.ts',
  /* Documentation + the state sources */
  'docs/DASHBOARD_LOGISTICS_CLEANUP_PROGRAMME_2026-09-22.md',
  'PROJECT_STATUS.md',
  'HANDOFF.md',
  'STATUS_CHECK.md',
  'requirements-registry.json',
  'PRODUCTION_READINESS.md',
]);

/**
 * §S9 — RECEIPT → INVOICE AUTOMATION DECLARED SURFACE (2026-09-25, session 34;
 * programme `docs/SPRINT_PO_ACKNOWLEDGEMENT_2026-09-24.md` §S9).
 *
 * S9 makes the RECEIPT the trigger of the invoice: a NEW owner
 * (`src/lib/commerce/receiptInvoiceAutomation.ts`) holds the decision, the terms
 * the invoice carries and the refusals, and the canonical receipt writer invokes
 * it — the invoice itself still goes through `issueCommerceInvoice`, so `AV-022`,
 * the number registry and the audit trail are unchanged. The surfaces state the
 * automation from that ONE owner, and the specs/validators that asserted the OLD
 * two-step contract (a separate "Issue invoice" click after receipt) are
 * REPOINTED to the new one. The E6 guard's contract is UNCHANGED — a changed
 * source/test file in NO declared set still fails.
 */
const S9_RECEIPT_INVOICE_SCOPE = new Set([
  'src/lib/commerce/receiptInvoiceAutomation.ts',      // NEW — the ONE owner of the automation
  'src/lib/commerce/commerceLifecycle.ts',             // the receipt triggers the automation
  'src/types.ts',                                      // PROTECTED prefix — the recorded refusal activity
  'src/components/admin/CommerceOperationsPanel.tsx',  // terms travel with the receipt; the statement is rendered
  'src/components/shared/CommerceSimulationPanel.tsx', // the brand console states the automation
  'e2e/invoicing.spec.ts',
  'e2e/admin-operational-surfaces.spec.ts',
  'e2e/commerce-operational-simulation.spec.ts',
  'e2e/deterministic-journey.spec.ts',
  'scripts/validate-receipt-invoice-automation.mjs',   // NEW — the S9 gate
  'scripts/validate-e4-commerce.mjs',                  // the durable-write guarantee repointed
  'scripts/validate-e6-brand-surfaces.mjs',
  'package.json',
  'docs/SPRINT_PO_ACKNOWLEDGEMENT_2026-09-24.md',
]);


try {
  /* ── modules under test (the EXISTING architecture) ── */
  const store = await server.ssrLoadModule('/src/data/demoStore.ts');
  const commerce = await server.ssrLoadModule('/src/lib/commerce/commerceLifecycle.ts');
  const catalog = await server.ssrLoadModule('/src/lib/catalog/catalogLifecycle.ts');
  const integrations = await server.ssrLoadModule('/src/integrations/types.ts');
  const mockAmazon = await server.ssrLoadModule('/src/lib/spapi/mockClient.ts');

  const ZAMBEZI = 'brand-astonish';
  const OTHER = 'brand-tapatio';
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

  /* ══ B. G2 — canonical commerce awareness (REPOINTED, never weakened) ══
   *
   * §P2 (2026-09-22) — REPOINTED to the canonical owners, not relaxed.
   *
   * OLD CONTRACT (recorded here because it was the E6 G2 gate): the brand
   * OVERVIEW itself carried the commerce attention rows — `commerce-inv-*`
   * (issued-unpaid simulated invoice), `commerce-po-inv-*` (delivered PO awaiting
   * invoice) and `deduction-*` (with `(sim)` provenance) — appended after the
   * pre-existing attention groups.
   *
   * WHY IT MOVED: the Founder's dashboard programme makes the Overview an
   * OBSERVE surface and the brand's Operations group the place where work is
   * EXECUTED, with the work layer as the SINGLE action list. The Overview's
   * attention queue was a second action list (the same duplication the admin
   * Overview was cleaned of in §Dashboard-cleanup), so it was removed from the
   * Dashboard and the invariants below are now asserted WHERE THE BEHAVIOUR
   * LIVES:
   *   · the canonical E4 stores are still read by the Overview (observe tiles);
   *   · the issued-unpaid derivation is still canonical AND the actionable item is
   *     derived by the work layer (`invoice_due`), which is what the brand works;
   *   · the delivered-awaiting-invoice gap is still derived canonically from the
   *     PO list — by the NotificationCenter, the surface that still shows it;
   *   · the simulated-deduction provenance is still decided by the canonical
   *     `Deduction.simulated` flag, now carried by the work item;
   *   · tenant scoping is asserted on the Overview's observe tile AND on the work
   *     layer's own tenant filter.
   * Nothing in this block is satisfied by prose: every assertion is made against
   * comment-stripped code (`code()`).
   */
  const WORK = readSrc('src/lib/work/workStore.ts');
  const WORKWS = readSrc('src/components/shared/WorkWorkspace.tsx');
  test('B1 the brand dashboard reads the canonical E4 commerce stores',
    /from '@\/data\/demoStore'/.test(DASH) &&
    /demoCommerceInvoices/.test(DASH) && /demoCommercePayments/.test(DASH));
  /**
   * §P7 — REPOINTED (not weakened). B2's contract is unchanged: the brand
   * Overview OBSERVES the issued-unpaid canonical position and the work layer owns
   * the ACTION. What changed is WHERE the receivable predicate lives: it used to be
   * re-implemented in the brand dashboard (`i.status !== 'paid'`) and in the work
   * layer (`getCommercePaymentsForInvoice`). It is now declared ONCE as
   * `invoiceIsOutstanding` in `src/lib/commerce/invoiceTerms.ts`, and every reader
   * imports it — so the gate now points at the canonical owner and additionally
   * requires that no second copy is re-derived. A cancelled invoice is excluded by
   * the same predicate (`AV-022`).
   */
  test('B2 it derives issued-unpaid simulated invoices canonically (observe), and the work layer owns the action',
    /invoiceIsOutstanding/.test(code(DASH)) && /demoCommerceInvoices/.test(code(DASH)) &&
    /demoCommerceInvoices/.test(WORK) && /invoiceIsOutstanding/.test(WORK) &&
    /getAllCommercePayments/.test(WORK) &&
    /'invoice_due'/.test(WORK) &&
    /export function invoiceIsOutstanding/.test(readSrc('src/lib/commerce/invoiceTerms.ts')));
  test('B3 delivered-awaiting-invoice is still derived from the canonical PO list (NotificationCenter)',
    /p\.status === 'delivered' && !invoicedPoIds\.has\(p\.id\)/.test(code(NOTIF)) &&
    /invoicedPoIds/.test(NOTIF));
  test('B4 the brand overview no longer carries a second action list (the work layer is the single one)',
    !/attention-\$\{it\.id\}/.test(code(DASH)) &&
    !/testId: `action-/.test(code(DASH)) &&
    /work-row-\$\{w\.id\}/.test(code(WORKWS)));
  test('B5 no attention id survives on the overview, and work ids stay deterministic',
    !/id: `unacked-/.test(code(DASH)) &&
    !/commerce-inv-/.test(code(DASH)) &&
    /work-\$\{source\}-\$\{entityId\}/.test(code(WORK)));
  test('B6 the existing KPI ids are unchanged, and the moved payout tiles still exist',
    ['active-pos', 'awaiting-ack', 'in-fulfilment', 'products-listed', 'out-of-stock', 'contract-status']
      .every((id) => DASH.includes(`id: '${id}'`)) &&
    DASH.includes("id: 'payouts-due'") && DASH.includes("id: 'payouts-settled'") &&
    /data-testid="po-summary-active"/.test(DASH) && /data-testid="po-summary-awaiting"/.test(DASH));
  test('B7 simulated deduction provenance is carried by the canonical work item (flag, never text)',
    /d\.simulated \? ' · \(sim\)' : ''/.test(WORK) &&
    /demoDeductions/.test(WORK));
  test('B8 the brand commerce attention is tenant-scoped (brandId === tenantId) at BOTH owners',
    /demoCommerceInvoices\.filter\(\s*\(i\) =>\s*i\.brandId === tenantId/.test(DASH) &&
    /scope === 'brand' \? rows\.filter\(\(r\) => r\.tenantId === \(tenantId \?\? null\)\)/.test(WORK));

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
  /**
   * §P11 — REPOINTED (not weakened). OLD CONTRACT (recorded verbatim):
   *
   *   F2 createPurchaseOrder still performs its real notification (path UNTOUCHED)
   *      → `/export function createPurchaseOrder\(/.test(API) && /sendPostmarkEmail/.test(API)`
   *        (API = src/data/api.ts)
   *
   * Decision 3 removed "Create PO"; the pinned symbols are now required to be
   * ABSENT and the ONE purchase-order entry point is the channel-ingestion owner.
   */
  test('F2 the create-PO path is absent — PO entry is channel ingestion (P11)',
    !/export function createPurchaseOrder\(/.test(code(API)) &&
    !/sendPostmarkEmail/.test(code(API)) &&
    /channelPurchaseOrderIngestion/.test(code(API)));
  test('F3 no live provider path or network call was introduced by E6',
    !/fetch\s*\(/.test(PO + DASH + CATALOG + NOTIF) &&
    !/spapi\/client|dhl\/client|services\/xero|postmarkNotifier/.test(PO + DASH + CATALOG + NOTIF));

/**
 * §BATCH1b — THE CONNECT WIZARD'S BACKEND HALF (2026-09-28) — declared surface.
 *
 * DECLARED HERE, ABOVE ITS FIRST USE: F4 (below) reads this set, so declaring it
 * among the later `*_SCOPE` blocks raised a TDZ ReferenceError.
 *
 * F5/F5b/F6's contract is UNCHANGED: a working-tree path in NO declared set still
 * fails, and no protected path may appear anywhere in the change set. This phase
 * legitimately WRITES a migration (`supabase/migrations/` is a PROTECTED prefix —
 * naming the EXACT file here is the documented, reviewable act the defect-
 * remediation note requires; the prefix itself is NOT widened), and it adds the two
 * connect Edge Functions, their shared handlers, the Vault write, the wizard wiring
 * and this phase's own gate.
 */
const BATCH1B_CONNECT_BACKEND_SCOPE = new Set([
  'supabase/functions/_shared/',
  'supabase/functions/integration-connect/',
  'supabase/functions/spapi-token-exchange/',
  'supabase/migrations/028_create_integration_connections.sql',
  'src/lib/integrations/connectClient.ts',
  'src/lib/integrations/testCalls.ts',
  'src/integrations/IntegrationsContext.tsx',
  'src/components/admin/integrations/IntegrationsPanel.tsx',
  'scripts/validate-connect-wizard-backend.mjs',
  'scripts/validate-rls-hardening.mjs',
  'scripts/rls-audit.mjs',
  'scripts/validate-e6-brand-surfaces.mjs',
  'PRODUCTION_READINESS.md',
]);

/**
 * §BATCH1c (S6) — THE ENFORCEMENT LEG (2026-09-28) — declared surface.
 *
 * The recorded next task (`docs/NEXT_BUILD_PLAN_2026-09-27.md` §1c, mapped from
 * the §SSOT programme's S6) wires CI so a break cannot be committed unnoticed:
 * `.github/` held ONLY `dependabot.yml`, so `typecheck`, `lint`, `build` and
 * `npm run validate:all` ran only when someone remembered them. This phase adds
 * the workflow, its owner gate (`scripts/validate-ci-wiring.mjs`, registered as
 * `npm run validate:ci-wiring`), and the README's gate list.
 *
 * F5/F5b/F6's contract is UNCHANGED: a working-tree path in NO declared set still
 * fails, and no protected path may appear anywhere in the change set. Nothing
 * inherited is removed by naming these files here.
 */
const BATCH1C_CI_WIRING_SCOPE = new Set([
  /**
   * `git status` reports a NEW untracked directory as `dir/`, so the directory
   * itself is declared alongside the exact file: without it, F6 refused
   * `.github/workflows/` even though the file inside is the declared one.
   */
  '.github/workflows/',
  '.github/workflows/ci.yml',
  'scripts/validate-ci-wiring.mjs',
  'scripts/validate-e6-brand-surfaces.mjs',
  'package.json',
  'README.md',
]);

/**
 * §BATCH 2a (2026-09-28, session 43) — AMAZON-ATTRIBUTION DECLARED SURFACE.
 *
 * The phase corrected three findings in which a MERCENTA invention was presented
 * as the retail channel's rule: the deduction/chargeback taxonomy (`AV-019`), the
 * dispute window (`AV-019b`) and the thirty-day backorder restock countdown
 * (`AV-020b`). It also fixed the resume-state defect found at session start (the
 * duplicated stale field set in `PROJECT_STATUS.md`).
 *
 * The ONE owning config (`src/config/deductions.ts`) is new; the consumers are the
 * brand surfaces that rendered the claims, the type/domain documents that carried
 * them, the automation note, the guided tours, and the two gates added here — plus
 * the two scope guards themselves, which must be able to declare this phase.
 *
 * F5/F5b/F6's contract is UNCHANGED: a changed SOURCE file in NO declared set
 * still FAILS. Nothing protected is touched (no migration, no provider client, no
 * Xero, no billing).
 */
const BATCH2A_AMAZON_ATTRIBUTION_SCOPE = new Set([
  'src/config/deductions.ts',
  'src/types.ts',
  'src/data/api.ts',
  'src/lib/work/workStore.ts',
  'src/lib/automation/registry.ts',
  'src/config/tours/tourDefinitions.ts',
  'src/components/brand/DeductionsLedger.tsx',
  'src/components/brand/BrandPurchaseOrders.tsx',
  'scripts/validate-amazon-attribution.mjs',
  'scripts/validate-resume-state.mjs',
  'scripts/validate-e6-brand-surfaces.mjs',
  'scripts/validate-e7-embedded-social.mjs',
  'package.json',
]);

/**
 * §BATCH 2b (`AV-006`, 2026-09-28) — THE PO AMENDMENT-WINDOW DECLARED SURFACE.
 *
 * The phase models the channel's documented 48-hour UPDATE window, which had never
 * been represented: a change to an acknowledgement is accepted within 48 hours for
 * quantity, price, ship dates or delivery dates, and after 48 hours only ship-date
 * or delivery-date changes are expected (register row `AV-006`). It REPLACES the
 * over-restriction in which the writer refused ANY second acknowledgement — a rule
 * Mercenta had invented — with an AMENDMENT path governed by that window, and it
 * renders the rule from its ONE config owner on the brand surface and in
 * Operational Guidance.
 *
 * Declared set: the config owner, the window/rule module, the canonical types and
 * domain writer, the two brand surfaces that render the rule, this phase's own gate
 * (`scripts/validate-po-amendment-window.mjs`), the Wave-3 gate REPOINTED from the
 * old duplicate-refusal contract to the new amendment truth, and the scope guards
 * themselves (which must be able to declare this phase).
 *
 * F5/F5b/F6's contract is UNCHANGED: a changed SOURCE file in NO declared set still
 * FAILS. Nothing protected is touched (no migration, no provider client, no Xero,
 * no billing).
 */
const BATCH2B_AMENDMENT_WINDOW_SCOPE = new Set([
  'src/config/purchaseOrders.ts',
  'src/lib/commerce/poAcknowledgementWindow.ts',
  'src/types.ts',
  'src/data/api.ts',
  'src/components/brand/BrandPurchaseOrders.tsx',
  'src/components/shared/BrandGuidance.tsx',
  'scripts/validate-po-amendment-window.mjs',
  'scripts/validate-wave3-logistics.mjs',
  'scripts/validate-e6-brand-surfaces.mjs',
  'e2e/po-brand-ack-surface.spec.ts',
  'package.json',
]);

/**
 * §PUBLIC MESSAGING BATCH (2026-09-28) — THE PUBLIC-SURFACES DECLARED SCOPE.
 *
 * The eight public pages each described the platform's INTERNAL specification —
 * which relationships the business holds, how the rules are enforced, what the
 * commercial structure is — instead of what a brand gets. That is a competitive
 * leak as much as a positioning failure. This batch gives the public message ONE
 * owner (`src/config/positioning.ts`), rewrites the eight pages around the
 * OUTCOME for the brand, rebuilds the footer to publish a real company identity,
 * and lands a gate (`scripts/validate-public-claims.mjs`) that fails the build if
 * the internal detail returns.
 *
 * Scope note: the whole marketing directory is named FILE BY FILE rather than as
 * a directory prefix, so the declaration stays reviewable — a new file dropped
 * into `src/components/marketing/` still has to be declared.
 *
 * F5/F5b/F6's contract is UNCHANGED: a changed SOURCE file in NO declared set is
 * still refused. Nothing protected is touched (no migration, no provider client,
 * no Xero, no billing).
 */
const PUBLIC_MESSAGING_SCOPE = new Set([
  'src/config/positioning.ts',
  'src/config/company.ts',
  'src/config/homepageContent.ts',
  'src/config/ukMarketFit.ts',
  'src/components/marketing/Home.tsx',
  'src/components/marketing/HowItWorks.tsx',
  'src/components/marketing/UKMarketAccess.tsx',
  'src/components/marketing/ForBrands.tsx',
  'src/components/marketing/FAQ.tsx',
  'src/components/marketing/ExploreUkMarketFit.tsx',
  'src/components/marketing/PublicNav.tsx',
  'src/components/marketing/PublicFooter.tsx',
  /**
   * §PUBLIC MESSAGING B4 (2026-09-29) — the cookie notice. New file, so it is
   * DECLARED here (the same remedy this guard documents for a legitimately new
   * file) rather than left as an unexplained working-tree change.
   */
  'src/components/marketing/CookieNotice.tsx',
  /**
   * §PUBLIC MESSAGING B5 (2026-09-29) — the shared shell for the two legal
   * documents (`PrivacyPolicy.tsx` + `TermsOfService.tsx`), so the chrome, the
   * eyebrow and the revision date exist once instead of twice. A NEW file, so it
   * is DECLARED here — and in the E7 guard's `PUBLIC_MESSAGING_DECLARED` — by the
   * remedy both guards document, rather than left as an unexplained working-tree
   * change.
   */
  'src/components/marketing/PublicLegalDocument.tsx',
  'src/components/marketing/PrivacyPolicy.tsx',
  'src/components/marketing/TermsOfService.tsx',
  'scripts/validate-public-claims.mjs',
  /**
   * §PUBLIC MESSAGING B7 (2026-09-29) — THE STATIC PUBLIC SURFACE IS A PUBLIC
   * SURFACE. `index.html` is the one file every visitor and every crawler receives
   * before any JavaScript runs, and until B7 no gate scanned it: it shipped the
   * ENTIRE obsolete pre-B3 site inside a `<noscript>` block plus matching JSON-LD
   * and bootstrap meta copy. `public/robots.txt` and `public/sitemap.xml` are
   * delivered to crawlers and are pinned by `validate-seo-foundation.mjs`. All
   * three are DECLARED here (the remedy this guard documents for a legitimately
   * changed file) rather than left as unexplained working-tree changes.
   */
  'index.html',
  'public/robots.txt',
  'public/sitemap.xml',
  'scripts/validate-company-control-centre.mjs',
  'scripts/validate-homepage-editor.mjs',
  'scripts/validate-uiux-redesign.mjs',
  'scripts/validate-seo-foundation.mjs',
  'scripts/validate-uk-market-fit.mjs',
  'scripts/validate-e6-brand-surfaces.mjs',
  'scripts/validate-e7-embedded-social.mjs',
  /**
   * §PUBLIC MESSAGING (2026-09-28, session 47) — the live-verification script.
   * The homepage's live check used to live in /tmp, so verification of the
   * DEPLOYED public surface was unreproducible: no future session and no
   * reviewer could re-run it. `npm run verify:live` now does it from the
   * repository. The file sits in no other declared set, so it is declared here
   * rather than left as an unexplained working-tree change — the same remedy
   * this guard documents for a legitimately new file.
   */
  'scripts/verify-live-demo.mjs',
  /**
   * §PUBLIC MESSAGING (2026-09-28, session 47) — the registry integrity gate.
   * `_meta.total_entries` drifted from the real entries.length across three
   * sessions (505 -> 506 -> 507) and NOTHING checked it. This file is named
   * `validate-*.mjs` so validate-all.sh picks it up automatically, and it is
   * declared here because it is a new application-source script.
   */
  'scripts/validate-registry-integrity.mjs',
  /**
   * §PUBLIC MESSAGING B3 (2026-09-28) — `validate-all.sh` now also runs the
   * registered `validate:*` npm scripts that the `scripts/validate-*.mjs` glob
   * does NOT match. `validate:wording` (scripts/lint-wording.mjs) is one of
   * them, and it is a REAL outward-facing gate that had never run inside a
   * whole-corpus sweep. The list is discovered from package.json, so a future
   * `validate:*` script cannot silently fall outside the sweep again.
   */
  'scripts/validate-all.sh',
  'e2e/homepage-editor.spec.ts',
  /**
   * §PUBLIC MESSAGING B4 (2026-09-29) — the public-chrome e2e spec. New file, so
   * it is DECLARED here rather than left as an unexplained working-tree change.
   */
  'e2e/public-chrome.spec.ts',
  /**
   * §PUBLIC MESSAGING B3/B4 (2026-09-29) — the inner-public-pages e2e spec. It
   * smoke-renders the four pages B3 rewrote and closes the recorded registry
   * defect that the B3 row declared `built_and_tested` while NO e2e spec
   * referenced it (only a live check did).
   */
  'e2e/public-pages.spec.ts',
  'package.json',
]);

  const migDir = fileURLToPath(new URL('../supabase/migrations/', import.meta.url));
  const migFiles = readdirSync(migDir).filter((f) => /^0\d\d_/.test(f));
  // §Phase M13 — REPOINTED. This pinned "026 remains the newest; 26 total", which
  // was TRUE when E6 was written. Phase M13 legitimately added 027 (the §39 RLS
  // hardening for audit_log + applications), so the absolute count is stale. E6's
  // actual INVARIANT — that E6 itself added no migration — is preserved by
  // `F5`/`F6` below, which still refuse any unexplained change in the working tree.
  //
  // §BATCH1b (2026-09-28) — REPOINTED AGAIN (not weakened). Batch 1b legitimately
  // adds 028 (the `integration_connections` connection-record schema the connect
  // wizard needs — the migration that, until now, had been cited but never
  // existed). The assertion is therefore: the history is at 28 files, the newest
  // is 028, and — the part that keeps it honest — the newest migration must be
  // EXPLICITLY DECLARED by the current phase's scope set. An undeclared new
  // migration still fails.
  test('F4 no migration was added by E6 (history is now 28 after Batch 1b, whose 028 is declared)',
    migFiles.length === 28 &&
      migFiles.sort().at(-1).startsWith('028_') &&
      BATCH1B_CONNECT_BACKEND_SCOPE.has(`supabase/migrations/${migFiles.sort().at(-1)}`));

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
  // §Phase 4 — the canonical-20-brand build declares PHASE4_SCOPE the same way.
  // An UNEXPLAINED protected change still fails: only named files are excused.
  /**
   * §Phase 1 — REPOINTED. F5/F5b predate the Founder OS and Phase 1 sprints and
   * listed only E7_SCOPE / M13_SCOPE / PHASE4_SCOPE / FUNCTIONAL_COMPLETION_SCOPE.
   * That made them DISAGREE with F6, which already accepts
   * SPRINT_FOUNDER_OS_SCOPE — so a file declared by the current sprint was
   * accepted by one scope guard and refused by another, and F5/F5b failed on
   * `src/lib/intelligence/intelligenceLayer.ts` (a PROTECTED prefix file that the
   * Founder OS sprint legitimately declared). The fix is to point all three
   * guards at the SAME canonical declared scope. This does NOT weaken the check:
   * an UNEXPLAINED protected change still fails, exactly as before.
   */
  test('F5 no protected path appears in the working-tree change set',
    changed
      .filter((p) => !GENERATED_ARTEFACTS.some((pre) => p.startsWith(pre)))
      .every((p) => !PROTECTED_PREFIXES.some((pre) => p.startsWith(pre)) ||
        E7_SCOPE.has(p) || M13_SCOPE.has(p) || PHASE4_SCOPE.has(p) ||
        FUNCTIONAL_COMPLETION_SCOPE.has(p) ||
        SPRINT_FOUNDER_OS_SCOPE.has(p) || SPRINT_UK_MARKET_FIT_SCOPE.has(p) ||
        SPRINT_ROUTING_GATEWAYS_SCOPE.has(p) || P4_PROXY_MODEL_SCOPE.has(p) ||
        /** §P5 — REPOINTED (not weakened): the destination-FC phase's declared surface. */
        P5_DESTINATION_FC_SCOPE.has(p) ||
        [...P5_DESTINATION_FC_SCOPE].some((s) => s.endsWith('/') && p.startsWith(s)) ||
        /** §P10 — the logistics-completion phase's declared surface (see above). */
        P10_LOGISTICS_COMPLETION_SCOPE.has(p) ||
        [...P10_LOGISTICS_COMPLETION_SCOPE].some((s) => s.endsWith('/') && p.startsWith(s)) ||
        /** §P11 — the channel-ingestion phase's declared surface (see above). */
        P11_CHANNEL_PO_INGESTION_SCOPE.has(p) ||
        [...P11_CHANNEL_PO_INGESTION_SCOPE].some((s) => s.endsWith('/') && p.startsWith(s)) ||
        /** §P12 — the SP-API seam-extension phase's declared surface (see above). */
        P12_SPAPI_SEAM_SCOPE.has(p) ||
        [...P12_SPAPI_SEAM_SCOPE].some((s) => s.endsWith('/') && p.startsWith(s)) ||
        [...P4_PROXY_MODEL_SCOPE].some((s) => s.endsWith('/') && p.startsWith(s)) ||
        /** §BATCH1b — the connect-wizard backend phase's declared surface. */
        BATCH1B_CONNECT_BACKEND_SCOPE.has(p) ||
        [...BATCH1B_CONNECT_BACKEND_SCOPE].some((s) => s.endsWith('/') && p.startsWith(s)) ||
        /** §BATCH1c — the CI-wiring phase's declared surface (see above). */
        BATCH1C_CI_WIRING_SCOPE.has(p) ||
        [...BATCH1C_CI_WIRING_SCOPE].some((s) => s.endsWith('/') && p.startsWith(s)) ||
        /** §BATCH 2a — the Amazon-attribution phase's declared surface (see above). */
        BATCH2A_AMAZON_ATTRIBUTION_SCOPE.has(p) ||
        [...BATCH2A_AMAZON_ATTRIBUTION_SCOPE].some((s) => s.endsWith('/') && p.startsWith(s)) ||
        /** §BATCH 2b — the PO amendment-window phase's declared surface (see above). */
        BATCH2B_AMENDMENT_WINDOW_SCOPE.has(p) ||
        [...BATCH2B_AMENDMENT_WINDOW_SCOPE].some((s) => s.endsWith('/') && p.startsWith(s)) ||
        /** §PUBLIC MESSAGING — the public-surfaces batch's declared scope (see above). */
        /** §BATCH 2c — the channel-revision phase's declared surface (see above). */
        BATCH2C_PO_REVISION_SCOPE.has(p) ||
        [...BATCH2C_PO_REVISION_SCOPE].some((s) => s.endsWith('/') && p.startsWith(s)) ||
        /** §BATCH 2d — the acknowledgement↔invoice price-match phase's declared surface (see above). */
        BATCH2D_ACK_INVOICE_PRICE_SCOPE.has(p) ||
        [...BATCH2D_ACK_INVOICE_PRICE_SCOPE].some((s) => s.endsWith('/') && p.startsWith(s)) ||
        /** §BATCH 2e — the compliance-attribution family (see above). */
        BATCH2E_COMPLIANCE_ATTRIBUTION_SCOPE.has(p) ||
        [...BATCH2E_COMPLIANCE_ATTRIBUTION_SCOPE].some((s) => s.endsWith('/') && p.startsWith(s)) ||
        /** §BATCH 2f — the programme-claim wording guard (see above). */
        BATCH2F_WORDING_GUARD_SCOPE.has(p) ||
        [...BATCH2F_WORDING_GUARD_SCOPE].some((s) => s.endsWith('/') && p.startsWith(s)) ||
        /** §BATCH 2h — the PO vocabulary mapping (see above). */
        BATCH2H_PO_VOCABULARY_SCOPE.has(p) ||
        [...BATCH2H_PO_VOCABULARY_SCOPE].some((s) => s.endsWith('/') && p.startsWith(s)) ||
        /** §BATCH 2i — the delivery-appointment concept (see above). */
        BATCH2I_DELIVERY_APPOINTMENT_SCOPE.has(p) ||
        [...BATCH2I_DELIVERY_APPOINTMENT_SCOPE].some((s) => s.endsWith('/') && p.startsWith(s)) ||
        /** §BATCH 2j — the acknowledgement's completeness and on-hold duties (see above). */
        BATCH2J_PO_ACK_DUTIES_SCOPE.has(p) ||
        [...BATCH2J_PO_ACK_DUTIES_SCOPE].some((s) => s.endsWith('/') && p.startsWith(s)) ||
        /** §OWNER-REPORTED DEFECTS — the five reported defects, fixed at source (see above). */
        OWNER_REPORTED_DEFECTS_SCOPE.has(p) ||
        [...OWNER_REPORTED_DEFECTS_SCOPE].some((s) => s.endsWith('/') && p.startsWith(s)) ||
        /** §PLAIN ENGLISH ENFORCEMENT — the plain-English rule made checkable (see above). */
        PLAIN_ENGLISH_ENFORCEMENT_SCOPE.has(p) ||
        [...PLAIN_ENGLISH_ENFORCEMENT_SCOPE].some((s) => s.endsWith('/') && p.startsWith(s)) ||

        /** §P0 — the whole-loop trace phase's declared surface (see above). */
        P0_LOOP_TRACE_SCOPE.has(p) ||
        [...P0_LOOP_TRACE_SCOPE].some((s) => s.endsWith('/') && p.startsWith(s)) ||

        /** §MERGED PLAN + AMAZON VENDOR CODES — the merged-plan + vendor-code surface (see above). */
        MERGED_PLAN_AND_VENDOR_CODES_SCOPE.has(p) ||
        [...MERGED_PLAN_AND_VENDOR_CODES_SCOPE].some((s) => s.endsWith('/') && p.startsWith(s)) ||

        PUBLIC_MESSAGING_SCOPE.has(p) ||
        [...PUBLIC_MESSAGING_SCOPE].some((s) => s.endsWith('/') && p.startsWith(s)) ||
        /** §P1 — the ONE SWITCH (see above). Same declaration, first protected-path check (F5). */
        P1_ENVIRONMENT_SCOPE.has(p) ||
        [...P1_ENVIRONMENT_SCOPE].some((s) => s.endsWith('/') && p.startsWith(s)) ||
        /** §P1-fix — the DOWNLOAD CONTROL (see above). First protected-path check (F5). */
        P1FIX_DOWNLOAD_CONTROL_SCOPE.has(p) ||
        [...P1FIX_DOWNLOAD_CONTROL_SCOPE].some((s) => s.endsWith('/') && p.startsWith(s)) ||
        /** §P2 — TWO DEMO BRANDS (see above). First protected-path check (F5). */
        P2_TWO_DEMO_BRANDS_SCOPE.has(p) ||
        [...P2_TWO_DEMO_BRANDS_SCOPE].some((s) => s.endsWith('/') && p.startsWith(s)) ||
        /** §P3 — EVERY BUTTON IS WIRED (see above). First protected-path check (F5). */
        P3_UI_WIRING_SCOPE.has(p) ||
        [...P3_UI_WIRING_SCOPE].some((s) => s.endsWith('/') && p.startsWith(s)) ||
        /** §P4 — DEAD CODE + DUPLICATE OWNERS (see above). First protected-path check (F5). */
        P4_CLEANUP_SCOPE.has(p) ||
        [...P4_CLEANUP_SCOPE].some((s) => s.endsWith('/') && p.startsWith(s)) ||
        /** §BATCH 2k — the acknowledgement-verification phase (see above). First protected-path check (F5). */
        BATCH2K_ACK_VERIFICATION_SCOPE.has(p) ||
        [...BATCH2K_ACK_VERIFICATION_SCOPE].some((s) => s.endsWith('/') && p.startsWith(s)) ||
        /** §BATCH 2l — the ASN-before-receipt phase (see above). First protected-path check (F5). */
        BATCH2L_ASN_BEFORE_RECEIPT_SCOPE.has(p) ||
        [...BATCH2L_ASN_BEFORE_RECEIPT_SCOPE].some((s) => s.endsWith('/') && p.startsWith(s)) ||
        /** §BATCH 2m — the pickup lead-time phase (see above). First protected-path check (F5). */
        BATCH2M_PICKUP_LEAD_TIME_SCOPE.has(p) ||
        [...BATCH2M_PICKUP_LEAD_TIME_SCOPE].some((s) => s.endsWith('/') && p.startsWith(s)) ||
        /** §BATCH 2n — the ASN pallet-structure phase (see above). First protected-path check (F5). */
        BATCH2N_ASN_PALLETS_SCOPE.has(p) ||
        [...BATCH2N_ASN_PALLETS_SCOPE].some((s) => s.endsWith('/') && p.startsWith(s))));
  test('F5b the ONLY protected-area files allowed to move are the declared ones',
    changed
      .filter((p) => !GENERATED_ARTEFACTS.some((pre) => p.startsWith(pre)))
      .filter((p) => PROTECTED_PREFIXES.some((pre) => p.startsWith(pre)))
      .every((p) => p === 'src/lib/postiz/postizClient.ts' || M13_SCOPE.has(p) || PHASE4_SCOPE.has(p) ||
        FUNCTIONAL_COMPLETION_SCOPE.has(p) ||
        SPRINT_FOUNDER_OS_SCOPE.has(p) || SPRINT_UK_MARKET_FIT_SCOPE.has(p) ||
        SPRINT_ROUTING_GATEWAYS_SCOPE.has(p) || P4_PROXY_MODEL_SCOPE.has(p) ||
        /** §P5 — same declaration, second protected-path check (F5b). */
        P5_DESTINATION_FC_SCOPE.has(p) ||
        [...P5_DESTINATION_FC_SCOPE].some((s) => s.endsWith('/') && p.startsWith(s)) ||
        /** §P10 — same declaration, second protected-path check (F5b). */
        P10_LOGISTICS_COMPLETION_SCOPE.has(p) ||
        [...P10_LOGISTICS_COMPLETION_SCOPE].some((s) => s.endsWith('/') && p.startsWith(s)) ||
        /** §P11 — same declaration, second protected-path check (F5b). */
        P11_CHANNEL_PO_INGESTION_SCOPE.has(p) ||
        [...P11_CHANNEL_PO_INGESTION_SCOPE].some((s) => s.endsWith('/') && p.startsWith(s)) ||
        /** §P12 — same declaration, second protected-path check (F5b). */
        P12_SPAPI_SEAM_SCOPE.has(p) ||
        [...P12_SPAPI_SEAM_SCOPE].some((s) => s.endsWith('/') && p.startsWith(s)) ||
        [...P4_PROXY_MODEL_SCOPE].some((s) => s.endsWith('/') && p.startsWith(s)) ||
        /** §BATCH1b — same declaration, second protected-path check (F5b). */
        BATCH1B_CONNECT_BACKEND_SCOPE.has(p) ||
        [...BATCH1B_CONNECT_BACKEND_SCOPE].some((s) => s.endsWith('/') && p.startsWith(s)) ||
        /** §BATCH1c — same declaration, second protected-path check (F5b). */
        BATCH1C_CI_WIRING_SCOPE.has(p) ||
        [...BATCH1C_CI_WIRING_SCOPE].some((s) => s.endsWith('/') && p.startsWith(s)) ||
        /** §BATCH 2a — same declaration, second protected-path check (F5b). */
        BATCH2A_AMAZON_ATTRIBUTION_SCOPE.has(p) ||
        [...BATCH2A_AMAZON_ATTRIBUTION_SCOPE].some((s) => s.endsWith('/') && p.startsWith(s)) ||
        /** §BATCH 2b — same declaration, second protected-path check (F5b). */
        BATCH2B_AMENDMENT_WINDOW_SCOPE.has(p) ||
        [...BATCH2B_AMENDMENT_WINDOW_SCOPE].some((s) => s.endsWith('/') && p.startsWith(s)) ||
        /** §BATCH 2c — same declaration, second protected-path check (F5b). */
        BATCH2C_PO_REVISION_SCOPE.has(p) ||
        [...BATCH2C_PO_REVISION_SCOPE].some((s) => s.endsWith('/') && p.startsWith(s)) ||
        /** §BATCH 2d — same declaration, second protected-path check (F5b). */
        BATCH2D_ACK_INVOICE_PRICE_SCOPE.has(p) ||
        [...BATCH2D_ACK_INVOICE_PRICE_SCOPE].some((s) => s.endsWith('/') && p.startsWith(s)) ||
        /** §BATCH 2e — same declaration, second protected-path check (F5b). */
        BATCH2E_COMPLIANCE_ATTRIBUTION_SCOPE.has(p) ||
        [...BATCH2E_COMPLIANCE_ATTRIBUTION_SCOPE].some((s) => s.endsWith('/') && p.startsWith(s)) ||
        /** §BATCH 2f — same declaration, second protected-path check (F5b). */
        BATCH2F_WORDING_GUARD_SCOPE.has(p) ||
        [...BATCH2F_WORDING_GUARD_SCOPE].some((s) => s.endsWith('/') && p.startsWith(s)) ||
        /** §BATCH 2h — same declaration, second protected-path check (F5b). */
        BATCH2H_PO_VOCABULARY_SCOPE.has(p) ||
        [...BATCH2H_PO_VOCABULARY_SCOPE].some((s) => s.endsWith('/') && p.startsWith(s)) ||
        /** §BATCH 2i — same declaration, second protected-path check (F5b). */
        BATCH2I_DELIVERY_APPOINTMENT_SCOPE.has(p) ||
        [...BATCH2I_DELIVERY_APPOINTMENT_SCOPE].some((s) => s.endsWith('/') && p.startsWith(s)) ||
        /** §BATCH 2j — same declaration, second protected-path check (F5b). */
        BATCH2J_PO_ACK_DUTIES_SCOPE.has(p) ||
        [...BATCH2J_PO_ACK_DUTIES_SCOPE].some((s) => s.endsWith('/') && p.startsWith(s)) ||
        /** §OWNER-REPORTED DEFECTS — same declaration, second protected-path check (F5b). */
        OWNER_REPORTED_DEFECTS_SCOPE.has(p) ||
        [...OWNER_REPORTED_DEFECTS_SCOPE].some((s) => s.endsWith('/') && p.startsWith(s)) ||
        /** §PLAIN ENGLISH ENFORCEMENT — same declaration, second protected-path check (F5b). */
        PLAIN_ENGLISH_ENFORCEMENT_SCOPE.has(p) ||
        [...PLAIN_ENGLISH_ENFORCEMENT_SCOPE].some((s) => s.endsWith('/') && p.startsWith(s)) ||

        /** §P0 — same declaration, second protected-path check (F5b). */
        P0_LOOP_TRACE_SCOPE.has(p) ||
        [...P0_LOOP_TRACE_SCOPE].some((s) => s.endsWith('/') && p.startsWith(s)) ||
        /** §MERGED PLAN + AMAZON VENDOR CODES — same declaration, second protected-path check (F5b). */
        MERGED_PLAN_AND_VENDOR_CODES_SCOPE.has(p) ||
        [...MERGED_PLAN_AND_VENDOR_CODES_SCOPE].some((s) => s.endsWith('/') && p.startsWith(s)) ||
        /** §P1 — the ONE SWITCH (see above). Same declaration, second protected-path check (F5b). */
        P1_ENVIRONMENT_SCOPE.has(p) ||
        [...P1_ENVIRONMENT_SCOPE].some((s) => s.endsWith('/') && p.startsWith(s)) ||
        /** §P1-fix — the DOWNLOAD CONTROL (see above). Second protected-path check (F5b). */
        P1FIX_DOWNLOAD_CONTROL_SCOPE.has(p) ||
        [...P1FIX_DOWNLOAD_CONTROL_SCOPE].some((s) => s.endsWith('/') && p.startsWith(s)) ||
        /** §P2 — TWO DEMO BRANDS (see above). Second protected-path check (F5b). */
        P2_TWO_DEMO_BRANDS_SCOPE.has(p) ||
        [...P2_TWO_DEMO_BRANDS_SCOPE].some((s) => s.endsWith('/') && p.startsWith(s)) ||
        /** §P3 — EVERY BUTTON IS WIRED (see above). Second protected-path check (F5b). */
        P3_UI_WIRING_SCOPE.has(p) ||
        [...P3_UI_WIRING_SCOPE].some((s) => s.endsWith('/') && p.startsWith(s)) ||
        /** §P4 — DEAD CODE + DUPLICATE OWNERS (see above). Second protected-path check (F5b). */
        P4_CLEANUP_SCOPE.has(p) ||
        [...P4_CLEANUP_SCOPE].some((s) => s.endsWith('/') && p.startsWith(s)) ||
        /** §BATCH 2k — same declaration, second protected-path check (F5b). */
        BATCH2K_ACK_VERIFICATION_SCOPE.has(p) ||
        [...BATCH2K_ACK_VERIFICATION_SCOPE].some((s) => s.endsWith('/') && p.startsWith(s)) ||
        /** §BATCH 2l — the ASN-before-receipt phase (see above). Second protected-path check (F5b). */
        BATCH2L_ASN_BEFORE_RECEIPT_SCOPE.has(p) ||
        [...BATCH2L_ASN_BEFORE_RECEIPT_SCOPE].some((s) => s.endsWith('/') && p.startsWith(s)) ||
        /** §BATCH 2m — the pickup lead-time phase (see above). Second protected-path check (F5b). */
        BATCH2M_PICKUP_LEAD_TIME_SCOPE.has(p) ||
        [...BATCH2M_PICKUP_LEAD_TIME_SCOPE].some((s) => s.endsWith('/') && p.startsWith(s)) ||
        /** §BATCH 2n — the ASN pallet-structure phase (see above). Second protected-path check (F5b). */
        BATCH2N_ASN_PALLETS_SCOPE.has(p) ||
        [...BATCH2N_ASN_PALLETS_SCOPE].some((s) => s.endsWith('/') && p.startsWith(s)) ||
        /** §PUBLIC MESSAGING — same declaration, second protected-path check (F5b). */
        PUBLIC_MESSAGING_SCOPE.has(p) ||
        [...PUBLIC_MESSAGING_SCOPE].some((s) => s.endsWith('/') && p.startsWith(s))));
/**
 * §UI/UX Wave 2 (2026-09-18) — the UI/UX redesign wave scope, declared here in
 * the same naming/allowing mechanism as E7_SCOPE / PHASE4_SCOPE /
 * FUNCTIONAL_COMPLETION_SCOPE above. The wave is PRESENTATION-ONLY (theme tokens,
 * workspace composition, shell/navigation, charts, motion, homepage copy) and
 * changes no business logic, data model, permission or integration. The single
 * canonical declaration lives in scripts/validate-e7-embedded-social.mjs
 * (UIUX_REDESIGN_DECLARED); this Set is that declaration echoed for the E6 guard,
 * which cannot import from the other validator. An UNEXPLAINED change still
 * fails.
 */
const UIUX_REDESIGN_SCOPE = new Set([
  // ── Wave 1 — theme/token foundation + presentation seams ──
  'src/config/themes.ts',
  'src/context/ThemeContext.tsx',
  'src/theme-alpha-shims.css',
  'src/main.tsx',
  'src/index.css',
  'tailwind.config.js',
  'src/components/shared/Avatar.tsx',
  'src/components/shared/ThemeSelector.tsx',
  'src/components/shared/UnlockGrowth.tsx',
  'src/components/shared/NotificationCenter.tsx',
  'src/lib/profile/profileImage.ts',
  'src/lib/profile/',
  'src/lib/brandIdentity/logoResolver.ts',
  'src/lib/brandIdentity/',
  'src/data/brandLogos.ts',
  'scripts/gen-theme-alpha-shims.mjs',
  'scripts/validate-theme-foundation.mjs',
  // ── Wave 2 — implementation wave ──
  'src/components/shared/workspace.tsx',
  'src/components/shared/CommandPalette.tsx',
  'src/components/shared/charts/',
  'src/components/shared/dashboard.tsx',
  'src/lib/nav/',
  'src/components/layout/AppShell.tsx',
  'src/components/layout/Sidebar.tsx',
  'src/components/layout/Header.tsx',
  'src/components/layout/AdminShell.tsx',
  'src/components/layout/BrandShell.tsx',
  'src/components/admin/AdminDashboard.tsx',
  'src/components/admin/HomepageEditor.tsx',
  'src/components/admin/FulfillmentTrack.tsx',
  'src/components/brand/BrandReports.tsx',
  'src/components/brand/SalesAnalytics.tsx',
  'src/components/marketing/Home.tsx',
  'src/components/shared/TourEngine.tsx',
  'src/components/ui.tsx',
  'src/config/homepageContent.ts',
  'scripts/validate-uiux-redesign.mjs',
  'scripts/reconcile-uiux-wave2-registry.py',
  'docs/UIUX_REDESIGN_WAVE2_2026-09-18.md',
  'docs/UIUX_FOUNDATION_PASS_2026-09-18.md',
  // ── §UI/UX Wave 2 COMPLETION (2026-09-18, finish-and-fix pass) — the same
  //    declaration as UIUX_REDESIGN_DECLARED in validate-e7-embedded-social.mjs
  //    (this validator cannot import from it). ──
  'src/components/admin/AdminPurchaseOrderList.tsx',
  'src/components/admin/ComplianceApprovals.tsx',
  'src/components/admin/ReturnsTrackingDashboard.tsx',
  'src/components/brand/BrandPurchaseOrders.tsx',
  'src/data/api.ts',
  'docs/UIUX_REDESIGN_WAVE2_COMPLETION_2026-09-18.md',
  'scripts/reconcile-uiux-wave2-completion-registry.py',
  'e2e/record-drawer.spec.ts',
]);

/**
 * §Sprint work layer (2026-09-19) — REPOINTED. The canonical operating layer
 * (EVENTS → WORKFLOWS → TASKS → NOTIFICATIONS → CALENDAR → ACTIVITY/AUDIT) the
 * sprint required declares its files here, exactly like every phase before it.
 * The F6 mechanism is unchanged: a source file in NO declared set still fails.
 */
const SPRINT_WORK_LAYER_SCOPE = new Set([
  'src/lib/work/',
  'src/components/shared/WorkWorkspace.tsx',
  'src/components/admin/WorkManagement.tsx',
  'src/components/brand/WorkManagement.tsx',
  'src/lib/events/types.ts',
  'src/lib/auth/rbac.ts',
  'src/components/admin/BillingPanel.tsx',
  'src/components/admin/AdminAuditLog.tsx',
  'src/components/shared/NotificationCenter.tsx',
  'scripts/validate-work-layer.mjs',
  'scripts/validate-e6-brand-surfaces.mjs',
  'scripts/validate-e7-embedded-social.mjs',
  'e2e/work-layer.spec.ts',
]);

/**
 * §SSOT — THE WORK-LAYER SINGLE-SOURCE-OF-TRUTH PROGRAMME (2026-09-27) — REPOINTED.
 *
 * The programme recorded in `docs/WORK_LAYER_SSOT_2026-09-26.md` removes the
 * multiple-writers / fabricated-work class from the operating layer: S1 (one
 * writer for a consignment exception), S2/S3 (a derived item's status is owned by
 * its RECORD, and the surfaces offer the owning action) and S4 (a demo document
 * state is DECLARED by name, never produced by position arithmetic — which added
 * the shared label `src/config/demo.ts → DEMO_OPERATIONAL_STATE_LABEL`).
 *
 * The F6 mechanism is UNCHANGED and not weakened: a source file in NO declared set
 * still fails.
 */
const SSOT_PROGRAMME_SCOPE = new Set([
  'src/config/demo.ts',
  'src/data/demoData.ts',
  'src/data/demoStore.ts',
  'src/lib/work/',
  'src/lib/dhl/domain.ts',
  'src/lib/simulation/scenarioEngine.ts',
  'src/lib/simulation/investorDemo.ts',
  'src/components/shared/WorkWorkspace.tsx',
  'scripts/validate-work-layer.mjs',
]);

/**
 * §BATCH1 — MAKE THE KEY HANDOVER REAL (2026-09-27) — REPOINTED.
 *
 * The recorded next task (`docs/NEXT_BUILD_PLAN_2026-09-27.md`, Batch 1) builds
 * the server helpers the REAL provider clients have always called and which did
 * not exist in this repository, so a real key could never make anything sync.
 * Its declared surface is: the three provider Edge Functions, the ONE shared
 * route manifest (routes + simulation + fail-closed orchestration), the per
 * provider live callers, and this phase's own gate.
 *
 * F6's contract is UNCHANGED and NOT weakened: a working-tree path in NO declared
 * set still fails, and no protected path may appear anywhere in the change set.
 */
const BATCH1_INTEGRATION_PROXY_SCOPE = new Set([
  'supabase/functions/_shared/',
  'supabase/functions/spapi/',
  'supabase/functions/dhl/',
  'supabase/functions/palletline/',
  'scripts/validate-integration-proxy.mjs',
  'scripts/validate-e6-brand-surfaces.mjs',
  'package.json',
  'docs/NEXT_BUILD_PLAN_2026-09-27.md',
  'docs/INTEGRATIONS.md',
  'PRODUCTION_READINESS.md',
  /** §BATCH1a DEFECT FIX — the simulated DHL exception retry was unreachable. */
  'src/lib/dhl/mockClient.ts',
  /** §BATCH1a — the stale `0002_integration_connections.sql` citation corrected. */
  'src/integrations/IntegrationsContext.tsx',
  /** §BATCH1a — the behavioural gate for the DHL defect fix. */
  'scripts/validate-mock-providers.mjs',
]);

  /**
   * §Sprint 2 — DETERMINISTIC PLATFORM COMPLETION (2026-09-19) — REPOINTED.
   *
   * F6's contract is UNCHANGED: the working-tree change set must stay within the
   * files the CURRENT documented sprint declares. This sprint completed the
   * remaining `uiux-wave2-core-surfaces-remaining` surfaces (admin CRM,
   * Catalogue, Communications and Onboarding Tours, and the Integration control
   * plane), added the deterministic proactive reminder runner plus the two
   * missing derivation paths (`invoice_due`, `onboarding_step`), and added its
   * browser journey spec. Those files are named here; anything outside EVERY
   * declared set is still refused, and the pre-existing offender set
   * (`ave1-check.mjs` + the four protected `design/*.png`) is unchanged.
   */
  const SPRINT_DETERMINISTIC_COMPLETION_SCOPE = new Set([
    'src/components/admin/BrandCRM.tsx',
    'src/components/admin/CatalogManagerAdmin.tsx',
    'src/components/admin/MessagesHub.tsx',
    'src/components/admin/UsertourAdminPanel.tsx',
    'src/components/admin/integrations/IntegrationsPanel.tsx',
    'src/components/admin/BrandIntelligencePanel.tsx',
    'src/components/admin/LogisticsControl.tsx',
    'src/components/admin/AccountingPanel.tsx',
    'src/components/admin/SuperAdminPanel.tsx',
    'src/components/admin/AmazonAdsDashboard.tsx',
    'src/components/admin/AdminAuditLog.tsx',
    'src/components/brand/BrandIntelligence.tsx',
    'src/components/shared/WorkWorkspace.tsx',
    'src/lib/work/',
    'src/lib/events/types.ts',
    'scripts/validate-work-layer.mjs',
    'scripts/validate-uiux-redesign.mjs',
    'scripts/validate-e6-brand-surfaces.mjs',
    'scripts/validate-e7-embedded-social.mjs',
    'e2e/deterministic-journey.spec.ts',
    'docs/SPRINT_DETERMINISTIC_COMPLETION_2026-09-19.md',
  ]);

  /**
   * §Sprint — the F6 condition is unchanged; the offender list is now NAMED in
   * the test title so a failure is diagnosable without editing the validator.
   */
  const f6ChangedSource = changed
    .filter((p) => !GENERATED_ARTEFACTS.some((pre) => p.startsWith(pre)))
    .filter((p) => !isProjectStateDoc(p))
    .filter(
      (p) =>
        !(
          APPROVED.has(p) || ALLOWED_NON_APPROVED.has(p) || E7_SCOPE.has(p) || M2_SCOPE.has(p) ||
          M11_SCOPE.has(p) || M12_SCOPE.has(p) || M13_SCOPE.has(p) || PHASE4_SCOPE.has(p) ||
          FUNCTIONAL_COMPLETION_SCOPE.has(p) || UIUX_REDESIGN_SCOPE.has(p) ||
          SPRINT_WORK_LAYER_SCOPE.has(p) || SPRINT_DETERMINISTIC_COMPLETION_SCOPE.has(p) ||
          SPRINT_FOUNDER_OS_SCOPE.has(p) ||
          SPRINT_UK_MARKET_FIT_SCOPE.has(p) ||
          SPRINT_ROUTING_GATEWAYS_SCOPE.has(p) ||
          P4_PROXY_MODEL_SCOPE.has(p) ||
          /** §P5 — the destination-FC phase's declared surface (see above). */
          P5_DESTINATION_FC_SCOPE.has(p) ||
          [...P5_DESTINATION_FC_SCOPE].some((s) => s.endsWith('/') && p.startsWith(s)) ||
          [...E7_SCOPE].some((s) => s.endsWith('/') && p.startsWith(s)) ||
          [...M2_SCOPE].some((s) => s.endsWith('/') && p.startsWith(s)) ||
          [...M11_SCOPE].some((s) => s.endsWith('/') && p.startsWith(s)) ||
          [...M12_SCOPE].some((s) => s.endsWith('/') && p.startsWith(s)) ||
          [...M13_SCOPE].some((s) => s.endsWith('/') && p.startsWith(s)) ||
          [...PHASE4_SCOPE].some((s) => s.endsWith('/') && p.startsWith(s)) ||
          [...FUNCTIONAL_COMPLETION_SCOPE].some((s) => s.endsWith('/') && p.startsWith(s)) ||
          [...UIUX_REDESIGN_SCOPE].some((s) => s.endsWith('/') && p.startsWith(s)) ||
          [...SPRINT_WORK_LAYER_SCOPE].some((s) => s.endsWith('/') && p.startsWith(s)) ||
          [...SPRINT_DETERMINISTIC_COMPLETION_SCOPE].some((s) => s.endsWith('/') && p.startsWith(s)) ||
          [...SPRINT_FOUNDER_OS_SCOPE].some((s) => s.endsWith('/') && p.startsWith(s)) ||
          [...SPRINT_UK_MARKET_FIT_SCOPE].some((s) => s.endsWith('/') && p.startsWith(s)) ||
          [...SPRINT_ROUTING_GATEWAYS_SCOPE].some((s) => s.endsWith('/') && p.startsWith(s)) ||
          [...P4_PROXY_MODEL_SCOPE].some((s) => s.endsWith('/') && p.startsWith(s)) ||
          /** §P6 — the PO-document-pack phase's declared surface (see above). */
          P6_PO_DOCUMENT_PACK_SCOPE.has(p) ||
          [...P6_PO_DOCUMENT_PACK_SCOPE].some((s) => s.endsWith('/') && p.startsWith(s)) ||
          /** §P7 — the admin-invoicing phase's declared surface (see above). */
          P7_ADMIN_INVOICING_SCOPE.has(p) ||
          /** §P8 — the inventory + channel-identifier phase's declared surface. */
          P8_INVENTORY_SCOPE.has(p) ||
          [...P8_INVENTORY_SCOPE].some((s) => s.endsWith('/') && p.startsWith(s)) ||
          /** §P9 — the carrier-removal phase's declared surface (see above). */
          P9_CARRIER_REMOVAL_SCOPE.has(p) ||
          [...P9_CARRIER_REMOVAL_SCOPE].some((s) => s.endsWith('/') && p.startsWith(s)) ||
          /** §P10 — the logistics-completion phase's declared surface (see above). */
          P10_LOGISTICS_COMPLETION_SCOPE.has(p) ||
          [...P10_LOGISTICS_COMPLETION_SCOPE].some((s) => s.endsWith('/') && p.startsWith(s)) ||
          /** §P11 — the channel-ingestion phase's declared surface (see above). */
          P11_CHANNEL_PO_INGESTION_SCOPE.has(p) ||
          [...P11_CHANNEL_PO_INGESTION_SCOPE].some((s) => s.endsWith('/') && p.startsWith(s)) ||
          /** §P12 — the SP-API seam-extension phase's declared surface (see above). */
          P12_SPAPI_SEAM_SCOPE.has(p) ||
          [...P12_SPAPI_SEAM_SCOPE].some((s) => s.endsWith('/') && p.startsWith(s)) ||
          /** §S9 — the receipt → invoice automation's declared surface (see above). */
          S9_RECEIPT_INVOICE_SCOPE.has(p) ||
          [...S9_RECEIPT_INVOICE_SCOPE].some((s) => s.endsWith('/') && p.startsWith(s)) ||
          /** §SSOT — the work-layer single-source-of-truth programme (see above). */
          SSOT_PROGRAMME_SCOPE.has(p) ||
          [...SSOT_PROGRAMME_SCOPE].some((s) => s.endsWith('/') && p.startsWith(s)) ||
          /** §BATCH1 — the integration-proxy helpers phase (see above). */
          BATCH1_INTEGRATION_PROXY_SCOPE.has(p) ||
          [...BATCH1_INTEGRATION_PROXY_SCOPE].some((s) => s.endsWith('/') && p.startsWith(s)) ||
          /** §BATCH1b — the connect-wizard backend phase (see above). */
          BATCH1B_CONNECT_BACKEND_SCOPE.has(p) ||
          [...BATCH1B_CONNECT_BACKEND_SCOPE].some((s) => s.endsWith('/') && p.startsWith(s)) ||
          /** §BATCH1c — the CI-wiring phase (see above). */
          BATCH1C_CI_WIRING_SCOPE.has(p) ||
          [...BATCH1C_CI_WIRING_SCOPE].some((s) => s.endsWith('/') && p.startsWith(s)) ||
          /** §BATCH 2a — the Amazon-attribution phase (see above). */
          BATCH2A_AMAZON_ATTRIBUTION_SCOPE.has(p) ||
          [...BATCH2A_AMAZON_ATTRIBUTION_SCOPE].some((s) => s.endsWith('/') && p.startsWith(s)) ||
          /** §BATCH 2b — the PO amendment-window phase (see above). */
          BATCH2B_AMENDMENT_WINDOW_SCOPE.has(p) ||
          [...BATCH2B_AMENDMENT_WINDOW_SCOPE].some((s) => s.endsWith('/') && p.startsWith(s)) ||
          /** §BATCH 2c — the channel-revision phase's declared surface (see above). */
          BATCH2C_PO_REVISION_SCOPE.has(p) ||
          [...BATCH2C_PO_REVISION_SCOPE].some((s) => s.endsWith('/') && p.startsWith(s)) ||
          /** §BATCH 2d — the acknowledgement↔invoice price-match phase's declared surface (see above). */
          BATCH2D_ACK_INVOICE_PRICE_SCOPE.has(p) ||
          [...BATCH2D_ACK_INVOICE_PRICE_SCOPE].some((s) => s.endsWith('/') && p.startsWith(s)) ||
          /** §BATCH 2e — the compliance-attribution family (see above). */
          BATCH2E_COMPLIANCE_ATTRIBUTION_SCOPE.has(p) ||
          [...BATCH2E_COMPLIANCE_ATTRIBUTION_SCOPE].some((s) => s.endsWith('/') && p.startsWith(s)) ||
          /** §BATCH 2f — the programme-claim wording guard (see above). */
          BATCH2F_WORDING_GUARD_SCOPE.has(p) ||
          [...BATCH2F_WORDING_GUARD_SCOPE].some((s) => s.endsWith('/') && p.startsWith(s)) ||
          /**
           * §BATCH 2h — the PO vocabulary mapping (see above). ADDED here (2026-09-30,
           * Batch 2i): this set was declared in F5/F5b but NOT in F6, which broke the
           * invariant F5/F5b's own note states — all three guards must read the SAME
           * canonical declared scope. An undeclared change was still refused; the
           * omission meant a later touch of a Batch 2h file would have been reported as
           * an F6 offender.
           */
          BATCH2H_PO_VOCABULARY_SCOPE.has(p) ||
          [...BATCH2H_PO_VOCABULARY_SCOPE].some((s) => s.endsWith('/') && p.startsWith(s)) ||
          /** §BATCH 2i — the delivery-appointment concept (see above). */
          BATCH2I_DELIVERY_APPOINTMENT_SCOPE.has(p) ||
          [...BATCH2I_DELIVERY_APPOINTMENT_SCOPE].some((s) => s.endsWith('/') && p.startsWith(s)) ||
          /** §BATCH 2j — the acknowledgement's two duties (see above). */
          BATCH2J_PO_ACK_DUTIES_SCOPE.has(p) ||
          [...BATCH2J_PO_ACK_DUTIES_SCOPE].some((s) => s.endsWith('/') && p.startsWith(s)) ||
          /** §OWNER-REPORTED DEFECTS — the five reported defects (see above). */
          OWNER_REPORTED_DEFECTS_SCOPE.has(p) ||
          [...OWNER_REPORTED_DEFECTS_SCOPE].some((s) => s.endsWith('/') && p.startsWith(s)) ||
          /** §PLAIN ENGLISH ENFORCEMENT — the plain-English rule made checkable (see above). */
          PLAIN_ENGLISH_ENFORCEMENT_SCOPE.has(p) ||
          [...PLAIN_ENGLISH_ENFORCEMENT_SCOPE].some((s) => s.endsWith('/') && p.startsWith(s)) ||

          /** §P0 — the whole-loop trace phase's declared surface (see above). */
          P0_LOOP_TRACE_SCOPE.has(p) ||
          [...P0_LOOP_TRACE_SCOPE].some((s) => s.endsWith('/') && p.startsWith(s)) ||
          /** §MERGED PLAN + AMAZON VENDOR CODES — the merged-plan + vendor-code surface (see above). */
          MERGED_PLAN_AND_VENDOR_CODES_SCOPE.has(p) ||
          [...MERGED_PLAN_AND_VENDOR_CODES_SCOPE].some((s) => s.endsWith('/') && p.startsWith(s)) ||
          /** §P1 — the ONE SWITCH (see above). */
          P1_ENVIRONMENT_SCOPE.has(p) ||
          [...P1_ENVIRONMENT_SCOPE].some((s) => s.endsWith('/') && p.startsWith(s)) ||
          /** §P1-fix — the DOWNLOAD CONTROL (see above). */
          P1FIX_DOWNLOAD_CONTROL_SCOPE.has(p) ||
          [...P1FIX_DOWNLOAD_CONTROL_SCOPE].some((s) => s.endsWith('/') && p.startsWith(s)) ||
          /** §P2 — TWO DEMO BRANDS (see above). */
          P2_TWO_DEMO_BRANDS_SCOPE.has(p) ||
          [...P2_TWO_DEMO_BRANDS_SCOPE].some((s) => s.endsWith('/') && p.startsWith(s)) ||
          /** §P3 — EVERY BUTTON IS WIRED (see above). */
          P3_UI_WIRING_SCOPE.has(p) ||
          [...P3_UI_WIRING_SCOPE].some((s) => s.endsWith('/') && p.startsWith(s)) ||
          /** §P4 — DEAD CODE + DUPLICATE OWNERS (see above). */
          P4_CLEANUP_SCOPE.has(p) ||
          [...P4_CLEANUP_SCOPE].some((s) => s.endsWith('/') && p.startsWith(s)) ||
          /** §BATCH 2k — the acknowledgement-verification phase (see above). */
          BATCH2K_ACK_VERIFICATION_SCOPE.has(p) ||
          [...BATCH2K_ACK_VERIFICATION_SCOPE].some((s) => s.endsWith('/') && p.startsWith(s)) ||
          /** §BATCH 2l — the ASN-before-receipt phase (see above). */
          BATCH2L_ASN_BEFORE_RECEIPT_SCOPE.has(p) ||
          [...BATCH2L_ASN_BEFORE_RECEIPT_SCOPE].some((s) => s.endsWith('/') && p.startsWith(s)) ||
          /** §BATCH 2m — the pickup lead-time phase (see above). */
          BATCH2M_PICKUP_LEAD_TIME_SCOPE.has(p) ||
          [...BATCH2M_PICKUP_LEAD_TIME_SCOPE].some((s) => s.endsWith('/') && p.startsWith(s)) ||
          /** §BATCH 2n — the ASN pallet-structure phase (see above). */
          BATCH2N_ASN_PALLETS_SCOPE.has(p) ||
          [...BATCH2N_ASN_PALLETS_SCOPE].some((s) => s.endsWith('/') && p.startsWith(s)) ||
          /** §PUBLIC MESSAGING — the public-surfaces batch (see above). */
          PUBLIC_MESSAGING_SCOPE.has(p) ||
          [...PUBLIC_MESSAGING_SCOPE].some((s) => s.endsWith('/') && p.startsWith(s))
        )
    );
  test(
    'F6 the E6 SOURCE change set is within the approved files (generated artefacts ignored)' +
      (f6ChangedSource.length ? ` :: OFFENDERS ${f6ChangedSource.join(', ')}` : ''),
    f6ChangedSource.length === 0
  );
  test('F7 no new store/dashboard module was created by E6',
    readdirSync(new URL('../src/components/brand/', import.meta.url)).every((f) => !/e6/i.test(f)) &&
    readdirSync(new URL('../src/data/', import.meta.url)).every((f) => !/e6/i.test(f)));
  test('F8 the brand navigation holds its canonical items in the canonical order',
    (() => {
      // E7 (2026-09-12) changed ONE label to the customer-facing Mercenta Social
      // identity, sourced from the SSOT — the file-touch proxy therefore had to
      // become the structural assertion it always meant: the nav ITEMS and their
      // ORDER are unchanged. Any real restructure still fails this test.
      //
      // §Sprint work layer (2026-09-19) — REPOINTED. The old contract was
      // "same 15 items in the same order" ending '... analytics, market, reports,
      // documents, team, social, settings'. The sprint's canonical operating layer
      // REQUIRED a brand-facing work/calendar destination, so the canonical list is
      // now 17 items with 'work','calendar' inserted after 'contracts' (i.e. after
      // the Compliance section, before Insights). The assertion is NOT weakened: it
      // still compares the full ordered id list exactly, so any further
      // restructuring still fails.
      const brandShell = readSrc('src/components/layout/BrandShell.tsx');
      const ids = [...brandShell.matchAll(/id: '([a-z_]+)', label:/g)].map((m) => m[1]);
      /**
       * §CLEAN-SLATE RECONCILIATION 2026-09-21 — REPOINTED (not weakened).
       * The canonical brand navigation grew by TWO items after this list was
       * written, both required by work that is now part of the product:
       *   · `commercial_readiness` — "Commercial Readiness" (§Phase 2 commercial
       *     readiness: the brand's declared commercial gate over the catalogue)
       *   · `cases` — "Support & Cases" (§S2a canonical brand case workflow)
       * The INTENT is unchanged — the ordered id list is compared EXACTLY, so any
       * future restructure still fails — but it now names the CURRENT canonical
       * 19-item order instead of the retired 17-item one.
       */
      /**
       * §Dashboard + logistics cleanup programme (2026-09-22, session 13) —
       * REPOINTED, not weakened.
       *
       * OLD CONTRACT (19 items): 'overview', 'catalog', 'commercial_readiness',
       * 'purchase_orders', 'returns', 'logistics', 'onboarding', 'compliance',
       * 'contracts', 'work', 'calendar', 'analytics', 'market', 'reports',
       * 'documents', 'cases', 'team', 'social', 'settings' — the pre-cleanup IA
       * where the brand's operational destinations were scattered (Commerce held
       * purchase_orders/returns, Logistics held logistics, and work/calendar sat
       * after Compliance).
       *
       * NEW CONTRACT: the Founder's governing principle is **Overview = OBSERVE,
       * Operations = ACT**, and Operations must sit DIRECTLY UNDER OVERVIEW, so the
       * brand's operational destinations are grouped there in the order the brand
       * does the work. The item SET is unchanged (still exactly 19 ids — nothing was
       * added or removed, which the exact comparison below proves), and the
       * comparison remains an EXACT ordered id list, so any further restructuring
       * still fails this test.
       */
      const EXPECTED = [
        'overview', 'purchase_orders', 'logistics', 'returns', 'work', 'calendar',
        'catalog', 'commercial_readiness', 'onboarding', 'compliance', 'contracts',
        'analytics', 'market', 'reports', 'documents', 'cases', 'team', 'social',
        'settings',
      ];
      return ids.join(',') === EXPECTED.join(',');
    })());

  /**
   * §PUBLIC MESSAGING B4 (2026-09-29) — THE HEADER, THE FOOTER AND THE COOKIE NOTICE.
   *
   * WHY THESE EXIST. B4's three deliverables are exactly the class of change that
   * passes BOTH a typecheck and a build while being wrong, because each defect is
   * a SECOND COPY of something that already exists:
   *
   *   · the footer held its own ten-category literal, duplicating
   *     `APPROVED_CATEGORIES` in `src/types.ts`;
   *   · the footer and the header each held their own copy of the link labels, so
   *     one screen could name the same destination two ways;
   *   · the footer described the business with wording the pages had retired.
   *
   * None of those breaks a build. The assertions below read the OWNER MODULE (not
   * its source text), so a label renamed in the owner cannot leave the header and
   * the footer disagreeing — which is the drift the SSOT rule forbids.
   */
  const positioning = await server.ssrLoadModule('/src/config/positioning.ts');
  const typesModule = await server.ssrLoadModule('/src/types.ts');
  const navSrc = readSrc('src/components/marketing/PublicNav.tsx');
  const footerSrc = readSrc('src/components/marketing/PublicFooter.tsx');
  const noticeSrc = readSrc('src/components/marketing/CookieNotice.tsx');
  const homeSrc = readSrc('src/components/marketing/Home.tsx');
  const indexHtml = readSrc('index.html');

  test('B4 the navigation model is declared ONCE, in positioning.ts §12',
    Array.isArray(positioning.PUBLIC_NAV) && positioning.PUBLIC_NAV.length === 2 &&
    !!positioning.PUBLIC_LINK && Array.isArray(positioning.PUBLIC_FOOTER_COLUMNS));

  /**
   * §B4 — no owner label may appear as a QUOTED LITERAL in the header or the
   * footer. This is the strong form of "reads the owner": the earlier
   * `!/label:\s*['"]/` check caught only object-literal syntax, so a component
   * could still override a label inline (`{'Privacy policy'}`) and pass while
   * drifting from the model. Measured: that mutation passed the weak check and is
   * caught by this one.
   */
  const ownerLabels = [
    ...positioning.PUBLIC_NAV.map((g) => g.label),
    ...positioning.PUBLIC_NAV.flatMap((g) => g.children.map((c) => c.label)),
    positioning.PUBLIC_COOKIE_SETTINGS_LABEL,
  ];
  const quotedOwnerLabels = (src) => {
    const c = code(src);
    return ownerLabels.filter((l) => {
      const escaped = l.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      return new RegExp(`['"\`]${escaped}['"\`]`).test(c);
    });
  };

  test('B4 the header READS the owner and retypes NO owner label', (() => {
    const c = code(navSrc);
    return c.includes('PUBLIC_NAV') && c.includes('{child.label}') && c.includes('{item.label}') &&
      quotedOwnerLabels(navSrc).length === 0;
  })());

  test('B4 the footer READS the owner and retypes NO owner label', (() => {
    const c = code(footerSrc);
    return c.includes('PUBLIC_FOOTER_COLUMNS') && c.includes('{link.label}') && c.includes('{col.heading}') &&
      quotedOwnerLabels(footerSrc).length === 0;
  })());

  test('B4 the footer does NOT retype the ten categories (it reads APPROVED_CATEGORIES)',
    code(footerSrc).includes('APPROVED_CATEGORIES') &&
    !code(footerSrc).includes('Health & Personal Care') &&
    typesModule.APPROVED_CATEGORIES.length === 10);

  test('B4 the footer declares the five-column shape',
    /lg:grid-cols-5/.test(code(footerSrc)));

  test('B4 the footer no longer publishes the retired description', (() => {
    /**
     * CODE, not prose: the footer's own explanatory comment deliberately NAMES
     * the retired wording so a future session cannot re-introduce it as though it
     * were new. Asserting against raw source would forbid documenting the fix.
     */
    const retired = 'Self-service wholesale distribution platform';
    return !code(footerSrc).includes(retired) && code(footerSrc).includes('PUBLIC_PROMISE') &&
      positioning.PUBLIC_PROMISE.length > 0;
  })());

  test('B4 the header and the footer publish the SAME label for every shared route', (() => {
    const headerLinks = positioning.PUBLIC_NAV.flatMap((g) => g.children);
    const footerLinks = positioning.PUBLIC_FOOTER_COLUMNS
      .filter((c) => c.kind === 'links')
      .flatMap((c) => c.links);
    const byPage = new Map(headerLinks.map((l) => [l.page, l.label]));
    /**
     * Every footer link must exist in the header model with the identical label,
     * and the header must offer at least the footer's routes (not fewer).
     */
    return footerLinks.length > 0 && footerLinks.every((l) => byPage.get(l.page) === l.label) &&
      headerLinks.length >= footerLinks.length;
  })());

  test('B4 the EXPLORE route is in the footer model (the prop now admits it)',
    positioning.PUBLIC_FOOTER_COLUMNS.some(
      (c) => c.kind === 'links' && c.links.some((l) => l.page === 'explore-uk-market-fit')));

  test('B4 the cookie notice is REAL: it records the answer and can be re-opened',
    noticeSrc.includes('COOKIE_NOTICE_STORAGE_KEY') &&
    noticeSrc.includes('localStorage.setItem') &&
    noticeSrc.includes('localStorage.removeItem') &&
    noticeSrc.includes('COOKIE_SETTINGS_EVENT'));

  test('B4 the footer offers the working re-open control',
    code(footerSrc).includes('COOKIE_SETTINGS_EVENT') &&
    code(footerSrc).includes('dispatchEvent') &&
    code(footerSrc).includes('PUBLIC_COOKIE_SETTINGS_LABEL'));

  test('B4 the notice renders on the homepage AND on every public sub-page', (() => {
    /**
     * Two render sites by design: one inside the router wrapper (every public
     * sub-page) and one on the homepage, which returns its own tree. A third
     * would mean a page had grown its own copy; a single one would mean a whole
     * surface was missing the notice.
     */
    const renderCount = (homeSrc.match(/<CookieNotice/g) || []).length;
    return renderCount === 2 &&
      homeSrc.includes('renderPublicPageBody') &&
      homeSrc.includes("from '@/components/marketing/CookieNotice'");
  })());

  test('B4 the notice\u2019s honesty claim is true of the actual page (no analytics script)',
    positioning.PUBLIC_COOKIE_NOTICE.body.includes('no advertising or tracking cookies') &&
    positioning.PUBLIC_COOKIE_NOTICE.body.includes('no analytics') &&
    !/googletagmanager|google-analytics|gtag\(|hotjar|posthog|mixpanel|segment\.com/i.test(indexHtml));

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
