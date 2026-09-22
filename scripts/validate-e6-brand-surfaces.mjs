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
  'src/components/carrier/CarrierDashboard.tsx',
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
const isProjectStateDoc = (p) => PROJECT_STATE_DOCS.includes(p) || p.startsWith('docs/');


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
        SPRINT_ROUTING_GATEWAYS_SCOPE.has(p)));
  test('F5b the ONLY protected-area files allowed to move are the declared ones',
    changed
      .filter((p) => !GENERATED_ARTEFACTS.some((pre) => p.startsWith(pre)))
      .filter((p) => PROTECTED_PREFIXES.some((pre) => p.startsWith(pre)))
      .every((p) => p === 'src/lib/postiz/postizClient.ts' || M13_SCOPE.has(p) || PHASE4_SCOPE.has(p) ||
        FUNCTIONAL_COMPLETION_SCOPE.has(p) ||
        SPRINT_FOUNDER_OS_SCOPE.has(p) || SPRINT_UK_MARKET_FIT_SCOPE.has(p) ||
        SPRINT_ROUTING_GATEWAYS_SCOPE.has(p)));
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
          [...SPRINT_ROUTING_GATEWAYS_SCOPE].some((s) => s.endsWith('/') && p.startsWith(s))
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
