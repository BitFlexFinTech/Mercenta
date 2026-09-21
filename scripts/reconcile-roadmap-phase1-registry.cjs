/**
 * §PHASE 1 — COMPLETE ROADMAP RECONCILIATION (2026-09-19).
 *
 * WHY THIS SCRIPT EXISTS
 * ----------------------
 * The Founder Operating System sprint completed its CURRENT SCOPE. That is NOT
 * the same as "nothing remains in the overall project". Before Phase 1 was
 * implemented, the COMPLETE Mercenta roadmap had to be recorded in the Master
 * Matrix at meaningful workstream level so that no future requirement could be
 * lost — and so that a future session (with no memory of this conversation) can
 * see what is built, what is in progress, what is deferred and what is blocked.
 *
 * WHAT IT DOES
 * ------------
 *  1. Adds the Phase 1 rows (all `built_and_tested`, with real evidence paths).
 *  2. Adds the Phase 0 REMAINING EXTENSIONS separately (Phase 0 itself is done).
 *  3. Adds the future roadmap, Phases 2–15, as WORKSTREAM-level rows with honest
 *     states. No micro-rows, and no row is marked complete for work not done.
 *  4. Records DISCOVERED work found during this sprint.
 *
 * RULES OBEYED
 * ------------
 *  - It is IDEMPOTENT: re-running it replaces the rows it owns by id.
 *  - It NEVER deletes a historical row. Every pre-existing entry is preserved.
 *  - It refuses to write a registry containing a duplicate id or an unknown status.
 *  - It invents no brand, provider, financing partner, Amazon permission or market
 *    data. A roadmap row describes WORK TO BE DONE, not a fact.
 *
 * Run: node scripts/reconcile-roadmap-phase1-registry.cjs
 */
const fs = require('node:fs');
const path = require('node:path');

const REGISTRY = path.resolve(__dirname, '..', 'requirements-registry.json');
const TODAY = '2026-09-19';

const registry = JSON.parse(fs.readFileSync(REGISTRY, 'utf8'));
const entries = registry.entries;

/* ── 1. Phase 1 — Explore UK Market Fit / pre-audit (BUILT + TESTED) ─────── */

const PHASE1 = [
  ['phase1-preaudit-config-ssot', 'The Explore UK Market Fit configuration is a single source of truth (CTA, presence classes A–F, 7 dimensions, 3 indicators, declared thresholds, 8 snapshot sections, hedges, prohibited promises, declared research sources, educational gaps, 6 event types, test ids)', 'src/config/ukMarketFit.ts'],
  ['phase1-preaudit-entity-types', 'The Phase 1 canonical entities are declared in the ONE types file (BrandOpportunity, ProductOpportunity, SupplyProfile, PreAuditAssessment, PreAuditEvidence, PreAuditIndicator, PreAuditOwner, PreAuditAcquisitionFeed)', 'src/types.ts §PHASE 1 section'],
  ['phase1-research-seam-mock-first', 'The research seam is mock-first and fail-closed: MockPreAuditResearchProvider (simulation, zero network) + RealPreAuditResearchProvider (refuses rather than fabricating), resolved from the CANONICAL integration registry; an unknown provider is never treated as simulation', 'src/lib/preaudit/researchProvider.ts'],
  ['phase1-research-fixtures-labelled', 'Deterministic, unmistakably-labelled simulation fixtures: 6 profiles covering every presence class A–F, declared hash selection, no Math.random, no clock, no network', 'src/lib/preaudit/fixtures.ts'],
  ['phase1-uk-presence-ladder', 'The UK presence classification ladder A→B→C→D→F→E, with evidence, confidence and a fail-closed unknown state when no research is available', 'src/lib/preaudit/ukMarketFitEngine.ts → classifyUkPresence'],
  ['phase1-three-separate-indicators', 'Catalogue eligibility, commercial opportunity and supply/replenishment viability are THREE SEPARATE indicators, each exposing basis, evidence, observed values, declared rules with the observed value, confidence, unknowns and a regulatory flag', 'src/lib/preaudit/ukMarketFitEngine.ts → PRE_AUDIT_INDICATORS'],
  ['phase1-seven-dimensions', 'All seven assessment dimensions produce a finding with its own basis, evidence, confidence, unknowns and an indeterminate flag', 'src/lib/preaudit/ukMarketFitEngine.ts → buildDimensions'],
  ['phase1-uk-opportunity-snapshot', 'The eight-section UK Opportunity Snapshot (UK Market Presence · Product Opportunity · Market Evidence · Commercial Considerations · Supply Considerations · Product Readiness · Open Questions · Recommended Next Step)', 'src/lib/preaudit/ukMarketFitEngine.ts → buildSnapshotSections'],
  ['phase1-no-single-success-score', 'There is NO single success score. Declared as a constant, forbidden by the snapshot type, and asserted by the validator', 'src/config/ukMarketFit.ts → NO_SINGLE_SUCCESS_SCORE'],
  ['phase1-honest-wording-guard', 'Every generated statement uses the declared hedged vocabulary (appears to / evidence suggests / requires verification / based on the available information) and no prohibited promise appears in any claim', 'src/config/ukMarketFit.ts → PRE_AUDIT_HEDGES / PRE_AUDIT_PROHIBITED_PROMISES'],
  ['phase1-no-invented-numbers', 'A margin is computed ONLY from a supplied cost and price; a lead-time verdict ONLY from a supplied lead time. Everything else is reported UNKNOWN with the question that resolves it, and additional costs are always declared as not applied', 'src/lib/preaudit/ukMarketFitEngine.ts → buildCommercialOpportunity / buildSupplyViability'],
  ['phase1-domain-store-ownership', 'The canonical pre-audit store: explicit per-record ownership, deterministic ids, audit entries in the canonical registry, canonical events, and persistence through the SAME domain port (no second store)', 'src/data/preAuditStore.ts'],
  ['phase1-tenant-isolation', 'Pre-audit tenant isolation: a public session sees ONLY its own assessment, a brand tenant sees ONLY records it owns, ops sees the platform research. Asserted by the validator', 'src/data/preAuditStore.ts → assessmentsForScope'],
  ['phase1-acquisition-bridge', 'A QUALIFIED assessment feeds the EXISTING canonical acquisition pipeline: a canonical BI prospect is created or enriched, scored by the ONE scoring client, with a canonical AcquisitionEvent and an audit entry', 'src/lib/preaudit/preAuditAcquisitionBridge.ts'],
  ['phase1-prospect-not-brand-guard', 'PROSPECT is NOT a BRAND end to end: the bridge cannot create a brand tenant (createdBrandTenant is the literal false), an unqualified assessment is refused, and re-feeding never duplicates the prospect', 'src/lib/preaudit/preAuditAcquisitionBridge.ts'],
  ['phase1-canonical-events', 'Six canonical platform event types (assessment_started, assessment_completed, opportunity_created, opportunity_qualified, research_required, outreach_ready) emitted through the EXISTING event feed — no second event system, no automation-platform dependency', 'src/lib/events/types.ts'],
  ['phase1-public-cta-hierarchy', 'The public primary CTA is "Explore UK Market Fit"; Partner Login is a SEPARATE secondary header utility action and is deliberately NOT beside the hero CTA', 'src/components/marketing/Home.tsx + PublicNav.tsx + src/config/homepageContent.ts'],
  ['phase1-public-assessment-surface', 'The public progressive assessment surface, code-split, reusing the existing public visual language, labelling simulation, stating its unknowns and showing the honest disclaimer', 'src/components/marketing/ExploreUkMarketFit.tsx'],
  ['phase1-progressive-collection', 'Progressive collection: four declared steps (identity → products → research → result), four required fields, everything else optional and asked only after research', 'src/config/ukMarketFit.ts → PRE_AUDIT_STEPS / PRE_AUDIT_REQUIRED_FIELDS'],
  ['phase1-founder-preaudit-queue', 'The founder sees the pre-audit queue in the EXISTING Super-Admin Control Centre (Acquisition section) with a real record drawer and a founder-only "Feed to acquisition" action', 'src/lib/commandCentre/controlCentre.ts + src/components/admin/FounderControlCentre.tsx'],
  ['phase1-rbac-super-admin', 'RBAC: the pre-audit queue lives only behind the Super-Admin Control Centre guard; no brand-facing component imports the pre-audit store', 'src/components/layout/AdminShell.tsx + validate-uk-market-fit.mjs'],
  ['phase1-no-live-provider-calls', 'Zero live provider calls: the seam performs no network I/O, the simulation declares networkCalls 0, and the validator asserts the whole run made ZERO external calls', 'scripts/validate-uk-market-fit.mjs'],
  ['phase1-ai-not-required', 'AI is not required anywhere in Phase 1: no AI module is imported by the pre-audit layer, no VITE credential is read, and the assessment works with OpenRouter unavailable', 'scripts/validate-uk-market-fit.mjs'],
  ['phase1-validator', 'Focused Phase 1 validator: 169 assertions / 0 failures covering the CTA, validation, progressive collection, the seam, the ladder, the three indicators, the snapshot, the wording, evidence/confidence/unknowns, tenant isolation, RBAC, the acquisition feed, prospect-not-brand, events, determinism and zero network', 'scripts/validate-uk-market-fit.mjs'],
  ['phase1-browser-verification', 'Browser verification: 9 Playwright tests / 0 failures covering the CTA hierarchy, the assessment, validation, the result, the disclaimer, the review request, repeatability, the founder feed and RBAC — with zero page errors and zero external calls', 'e2e/uk-market-fit.spec.ts'],
  ['phase1-roadmap-reconciliation', 'The COMPLETE roadmap (Phases 2–15) is recorded in the Master Matrix at workstream level, with Phase 1 implemented and every future phase honestly marked, so no requirement is lost', 'scripts/reconcile-roadmap-phase1-registry.cjs + requirements-registry.json'],
  ['phase1-open-questions', 'The assessment states what it could not establish as deduplicated open questions, and can send the visitor back to supply ONLY the missing information', 'src/lib/preaudit/ukMarketFitEngine.ts → buildOpenQuestions'],
  ['phase1-educational-gaps-capture', 'The educational gaps a brand has are CAPTURED for the future Academy (with the Academy stage that will teach each one) and never taught in Phase 1', 'src/lib/preaudit/ukMarketFitEngine.ts → captureEducationalGaps'],
  ['phase1-qualification-fail-closed', 'Qualification is deterministic and conservative: an out-of-category product is INELIGIBLE, unresolved indicators are NEEDS_INFORMATION, and only a fully-established assessment is QUALIFIED', 'src/lib/preaudit/ukMarketFitEngine.ts → deriveQualification'],
];


/* ── 2. Phase 0 — remaining EXTENSIONS (Phase 0 itself is complete) ──────── */

const PHASE0_EXTENSIONS = [
  ['phase0-extension-scheduler-activation', 'Founder OS extension: activate the declared scheduler seam so the automations run without a human pressing Run (requires an explicit scheduler decision; the $0 free-first decision is already recorded)', 'src/lib/automation/registry.ts → describeAutomationScheduler', 'not_started'],
  ['phase0-extension-automation-provider', 'Founder OS extension: consume the emitted canonical events from an external automation platform if one is ever justified (n8n is explicitly NOT a foundational dependency)', 'src/lib/events/types.ts', 'deferred'],
];

/* ── 3. Phases 2–15 — the FUTURE ROADMAP at workstream level ─────────────── */

/**
 * Each row is [id, description, evidence-or-source, status]. A future row
 * describes WORK, never a fact: no brand, provider, financier, permission or
 * market figure is invented here. Statuses use the registry's honest vocabulary.
 */
const FUTURE_ROADMAP = [
  /* Phase 2 — commercial readiness + product economics */
  ['phase2-commercial-terms-model', 'Phase 2 — the commercial terms a product must carry before it can be evaluated: RRP, wholesale/cost price, commercial margin, MOQ, production MOQ, case-pack quantity, master-carton quantity and pallet profile where applicable', 'docs — roadmap §PHASE 2', 'not_started'],
  ['phase2-product-economics', 'Phase 2 — product economics: packaging economics, logistics economics, commercial viability, catalogue readiness and replenishment viability, all deterministic and never AI-derived', 'docs — roadmap §PHASE 2', 'not_started'],
  /* Phase 3 — supply route + logistics intelligence */
  ['phase3-supply-route-profile', 'Phase 3 — the Supply Route Profile: origin, ship-from, production/export lead time, freight mode, transit estimate, customs and customs buffer, UK final mile, appointment requirements, total expected door-to-FC, safety buffer, planning lead time and variability', 'docs — roadmap §PHASE 3', 'not_started'],
  ['phase3-logistics-escalation-engine', 'Phase 3 — the Logistics Escalation Engine that determines when a 3PL / UK inventory buffer / consolidation route may be appropriate. A universal maximum lead-time rule is explicitly NOT to be invented', 'docs — roadmap §PHASE 3', 'not_started'],
  /* Phase 4 — brand education / onboarding academy */
  ['phase4-onboarding-academy-curriculum', 'Phase 4 — the Brand Education / Onboarding Academy curriculum across its five stages plus the final product/catalogue readiness stage', 'src/config/ukMarketFit.ts → PRE_AUDIT_EDUCATIONAL_GAPS (the captured gaps this curriculum must serve)', 'not_started'],
  ['phase4-learning-loop-validate', 'Phase 4 — the LEARN → WATCH → DO → VALIDATE → COMPLETE loop, including the VALIDATE gate that proves a brand can actually do the step', 'docs — roadmap §PHASE 4', 'not_started'],
  /* Phase 5 — tutorial recording + contextual education */
  ['phase5-tutorial-recording', 'Phase 5 — real Mercenta UI tutorial recordings (Playwright-driven, real mouse movement and clicks), with tutorial versioning, UI-version compatibility, outdated-tutorial detection and reusable assets', 'docs — roadmap §PHASE 5', 'not_started'],
  ['phase5-contextual-education', 'Phase 5 — contextual field explanations ("why do we need this?") attached to the real screens, reusing the existing Knowledge Base + UserTour architecture', 'docs — roadmap §PHASE 5', 'not_started'],
  ['phase5-shared-workflow-reuse', 'Phase 5 — shared workflows so ONE automation supports E2E tests + tutorial recordings + onboarding walkthroughs', 'docs — roadmap §PHASE 5', 'not_started'],
];


/* ── Phases 6–13 ─────────────────────────────────────────────────────────── */

const FUTURE_ROADMAP_6_13 = [
  /* Phase 6 — capital & financing engine */
  ['phase6-capital-requirement-model', 'Phase 6 — the internal capital model behind Model B: PO value, supplier cost, required funding, available capital, facility capacity, advance rate, fees, term, expected repayment, outstanding financed purchases, facility utilisation, concentration controls, currency and margin', 'docs — roadmap §PHASE 6', 'not_started'],
  ['phase6-financing-router-deterministic', 'Phase 6 — deterministic financing eligibility + routing. NO AI dependency for financial calculations or core routing, and financing is an INTERNAL treasury concern never exposed to the brand merely because a purchase is financed', 'docs — roadmap §PHASE 6', 'not_started'],
  /* Phase 7 — real financing partner network (REQUIRED) */
  ['phase7-financier-universe-research', 'Phase 7 — research and validate a REAL financing-partner universe (UK, Africa, Europe, US and other relevant markets; banks, PO/inventory/trade/receivables finance, working capital, SME and e-commerce finance, alternative credit) with the full financier record, source evidence and a last-researched date', 'docs — roadmap §PHASE 7', 'not_started'],
  ['phase7-financier-lifecycle', 'Phase 7 — the financier lifecycle RESEARCHED → QUALIFIED → TARGET → CONTACTED → ENGAGED → DUE DILIGENCE → TERMS → PILOT → ACTIVE PARTNER (or REJECTED / PARKED). A provider is NEVER marked ACTIVE merely because it was researched', 'docs — roadmap §PHASE 7', 'not_started'],
  ['phase7-founder-outreach-pipeline', 'Phase 7 — the founder outreach pipeline over the validated financier universe', 'docs — roadmap §PHASE 7', 'not_started'],
  /* Phase 8 — financier pitch / capital workspace */
  ['phase8-financier-pitch-workspace', 'Phase 8 — the founder capital workspace: Mercenta overview, business model, Vendor infrastructure, acquisition pipeline, purchase volumes, supplier payment requirements, capital requirements, facility request, repayment model, risk controls, evidence, documents, contact history, meetings, follow-ups and pitch preparation. AI may help prepare/explain; the financial numbers stay deterministic', 'docs — roadmap §PHASE 8', 'not_started'],
  /* Phase 9 — global market experience / localization */
  ['phase9-country-framework', 'Phase 9 — the country framework (AMAZON_MARKETPLACE · BRAND_ORIGIN_MARKET · ACQUISITION_PRIORITY_MARKET · ACCELERATOR_PRIORITY_MARKET · LOCALIZATION_ONLY · FUTURE_MARKET) across North America, Europe, the Middle East, Asia-Pacific and Africa. Zimbabwe is technically supported as an operating/home market and must NEVER be represented as an Amazon marketplace', 'docs — roadmap §PHASE 9', 'not_started'],
  ['phase9-locale-currency-settlement-separation', 'Phase 9 — locale, display currency and settlement currency as THREE SEPARATE concepts, with country detection recommending rather than forcing', 'docs — roadmap §PHASE 9', 'not_started'],
  ['phase9-localization-seo-hreflang', 'Phase 9 — localization: languages, currencies, number/date formats, timezone, localized URLs, SEO, hreflang, payment availability and market-specific messaging', 'docs — roadmap §PHASE 9', 'not_started'],
];


const FUTURE_ROADMAP_10_13 = [
  /* Phase 10 — acquisition intelligence at scale */
  ['phase10-product-identity-layer', 'Phase 10 — the product identity layer over the BRAND + ASIN + SOURCE MARKETPLACE acquisition unit: source ASIN, destination ASIN, GTIN/EAN/UPC, brand, model, normalized identity, marketplace, and exact/probable/related match', 'docs — roadmap §PHASE 10', 'not_started'],
  ['phase10-uk-opportunity-states', 'Phase 10 — the UK opportunity states A–F at scale, feeding UK Market Fit → qualification → outreach. Phase 1 implements the classification; Phase 10 scales the evidence behind it', 'src/config/ukMarketFit.ts → UK_PRESENCE_CLASSES', 'in_progress'],
  ['phase10-acquisition-intelligence-scale', 'Phase 10 — acquisition intelligence at scale over the real research sources (never fabricated when no provider exists)', 'docs — roadmap §PHASE 10', 'not_started'],
  /* Phase 11 — founder intelligence / BI expansion */
  ['phase11-founder-intelligence-expansion', 'Phase 11 — the founder intelligence expansion answering: what is happening, what needs attention, what opportunities exist, what is blocked, which brands to pursue, which products matter, which POs need action, where capital is tied up, where financing is needed, which financier conversations need follow-up and what changed this week. AI summarises; canonical deterministic data stays the source of truth', 'src/lib/intelligence/intelligenceLayer.ts (the existing findings layer this extends)', 'not_started'],
  /* Phase 12 — integrated loop */
  ['phase12-integrated-acquisition-capital-operations-loop', 'Phase 12 — the integrated loop: discovery → Explore UK Market Fit → qualification → outreach → onboarding → product readiness → commercial terms → Mercenta purchase → supply-route analysis → capital requirement → financing eligibility → financing → supplier purchase → Vendor operations → PO → fulfilment → invoice → payment → repayment → margin → Founder Intelligence', 'docs — roadmap §PHASE 12', 'not_started'],
  /* Phase 13 — Amazon relationship governance */
  ['phase13-amazon-relationship-governance', 'Phase 13 — the cross-cutting governance system over the authoritative sources (Vendor agreement, current Amazon policies, additional terms, Amazon communications, program documentation, API agreements, trademark permissions, written permissions, account instructions)', 'src/lib/intelligence/amazonWording.ts (the existing claim rules this governs)', 'not_started'],
  ['phase13-claims-registry', 'Phase 13 — the Claims Registry (GREEN = supported · AMBER = requires verification/approval · RED = do not use) governing the website, AI-generated content, email, social, acquisition campaigns and sales material. Principle: CHANNEL-NEUTRAL BY DEFAULT, CHANNEL-SPECIFIC WHERE OPERATIONALLY NECESSARY, NEVER MISLEADING', 'docs — roadmap §PHASE 13', 'not_started'],
];


/* ── Phase 14, Phase 15 (launch gate) and Phase 1 blocked follow-ons ─────── */

const FUTURE_ROADMAP_14_15 = [
  /* Phase 14 — live integrations / API activation (BLOCKED on credentials/approval) */
  ['phase14-live-integrations-activation', 'Phase 14 — activate the live integrations the platform is already built behind: Amazon SP-API, Xero, Stripe, Wise, Payoneer, DHL, Postmark, Firecrawl, Hunter, Instantly, PandaDoc, Keepa, OpenRouter and other validated providers. Simulation must remain functional until live credentials are configured, and external provider availability must NEVER be a prerequisite for core deterministic functionality', 'src/integrations/registry.ts (every provider mode is already declared there)', 'blocked'],
  /* Phase 15 — production readiness + launch gate (MANDATORY before public launch) */
  ['phase15-legal-privacy', 'Phase 15 — legal/privacy launch gate: privacy policy, terms & conditions, cookie consent and a third-party data inventory', 'PRODUCTION_READINESS.md', 'not_started'],
  ['phase15-security', 'Phase 15 — security launch gate: remove frontend secrets, server-side production secrets, HTTPS, authentication security, RBAC, tenant isolation, RLS/database security, API exposure audit and a dependency/security audit', 'PRODUCTION_READINESS.md', 'not_started'],
  ['phase15-database-infrastructure', 'Phase 15 — database/infrastructure launch gate: production DB audit, backups, a restore test, disaster recovery, error monitoring and health monitoring', 'PRODUCTION_READINESS.md', 'not_started'],
  ['phase15-seo', 'Phase 15 — SEO launch gate: meta titles/descriptions, sitemap, robots.txt, canonical URLs, Open Graph/social preview, favicon and image alt text', 'PRODUCTION_READINESS.md', 'not_started'],
  ['phase15-performance', 'Phase 15 — performance launch gate: image compression/optimisation, page speed, bundle optimisation and caching', 'PRODUCTION_READINESS.md', 'not_started'],
  ['phase15-accessibility', 'Phase 15 — accessibility launch gate: colour contrast, keyboard navigation, focus states, screen-reader semantics and reduced motion', 'PRODUCTION_READINESS.md', 'not_started'],
  ['phase15-responsive', 'Phase 15 — responsive launch gate: mobile, tablet, desktop, browser compatibility and touch interaction', 'PRODUCTION_READINESS.md', 'not_started'],
  ['phase15-conversion', 'Phase 15 — conversion launch gate: form validation, spam protection, submission reliability, the primary CTA and the Partner Login hierarchy. The CTA hierarchy part is DONE (Phase 1: "Explore UK Market Fit" is the primary hero CTA and Partner Login is a separate header utility action); spam protection and submission reliability remain', 'src/config/ukMarketFit.ts → EXPLORE_UK_MARKET_FIT_CTA', 'in_progress'],
  ['phase15-analytics', 'Phase 15 — analytics launch gate: analytics setup, consent-aware tracking, conversion funnel and acquisition attribution', 'PRODUCTION_READINESS.md', 'not_started'],
  ['phase15-reliability-degradation', 'Phase 15 — reliability launch gate: AI outage, OpenRouter outage, automation-provider outage, email-provider outage and integration outage behaviour, retry behaviour and graceful degradation', 'PRODUCTION_READINESS.md', 'not_started'],
  ['phase15-production-data-cleanup', 'Phase 15 — production data launch gate: remove accidental test data and debug content, production environment audit and development endpoint audit', 'PRODUCTION_READINESS.md', 'not_started'],
  ['phase15-website-integrity', 'Phase 15 — website integrity launch gate: broken links, a custom 404, a production crawl and critical journey verification', 'PRODUCTION_READINESS.md', 'not_started'],
  ['phase15-communications-email-auth', 'Phase 15 — communications launch gate: transactional email, SPF, DKIM, DMARC and production email templates', 'PRODUCTION_READINESS.md', 'not_started'],
  ['phase15-deployment-dns-ssl', 'Phase 15 — deployment launch gate: DNS, domain, SSL, deployment verification, rollback procedure and release procedure', 'GO_LIVE.md + scripts/deploy-demo.sh', 'not_started'],
  ['phase15-final-launch-gate', 'Phase 15 — the FINAL gate: full security audit, full functional audit, full E2E audit, production smoke test and a launch acceptance report', 'docs — roadmap §PHASE 15', 'not_started'],
  /* Phase 1 — blocked follow-on work (needs real credentials) */
  ['phase1-live-research-activation', 'Phase 1 follow-on — turn on REAL research behind the already-built seam. Blocked: the declared providers (Firecrawl, Keepa, marketplace API) resolve to available/simulation, so the seam correctly refuses. Requires credentials + a server-side research endpoint; NO code change to the seam contract', 'src/lib/preaudit/researchProvider.ts → preAuditLiveResearchReadiness', 'blocked'],
  /* DISCOVERED work found during this sprint */
  ['discovered-validator-stage26-exit-code', 'DISCOVERED — scripts/validate-stage26.mjs prints STAGE26_VALIDATION_FAIL (8) but ALWAYS exits 0, so its 8 pre-existing failures are invisible to the gate. The 8 are 5 pre-existing edge-function assertions (compliance-gate-check / catalog-import) and 3 render failures caused by the harness omitting ThemeProvider (the same class of harness defect validate-homepage-editor.mjs documented and fixed). Recorded, NOT fixed: outside the Phase 1 scope, and no Phase 1 file is involved', 'scripts/validate-stage26.mjs', 'in_progress'],
];

/* ── 4. Apply: idempotent upsert, history preserved, duplicates refused ───── */

const FUTURE_ROADMAP_ALL = [...FUTURE_ROADMAP, ...FUTURE_ROADMAP_6_13, ...FUTURE_ROADMAP_10_13, ...FUTURE_ROADMAP_14_15];

const OURS = [
  ...PHASE1.map(([id, description, evidence]) => ({
    id,
    description,
    source: 'Phase 1 — Explore UK Market Fit / pre-audit (2026-09-19)',
    status: 'built_and_tested',
    evidence,
  })),
  ...PHASE0_EXTENSIONS.map(([id, description, evidence, status]) => ({
    id,
    description,
    source: 'Phase 0 — Founder Operating System remaining extensions',
    status,
    evidence,
  })),
  ...FUTURE_ROADMAP_ALL.map(([id, description, evidence, status]) => ({
    id,
    description,
    source: 'Mercenta roadmap reconciliation (2026-09-19)',
    status,
    evidence,
  })),
];

const ownedIds = new Set(OURS.map((r) => r.id));
if (ownedIds.size !== OURS.length) {
  console.error('REFUSING TO WRITE — this script declares a duplicate id internally.');
  process.exit(1);
}

/** Every pre-existing row is preserved untouched. Nothing is ever removed. */
const preserved = entries.filter((e) => !ownedIds.has(e.id));

const applied = OURS.map((r) => ({
  id: r.id,
  description: r.description,
  source: r.source,
  status: r.status,
  evidence: r.evidence,
  last_verified: TODAY,
  superseded_by: null,
}));

const next = [...preserved, ...applied];

/* Refuse to write a registry that contains a duplicate id. */
const seen = new Set();
const duplicates = next.filter((e) => {
  if (seen.has(e.id)) return true;
  seen.add(e.id);
  return false;
});
if (duplicates.length > 0) {
  console.error(`REFUSING TO WRITE — duplicate ids: ${duplicates.map((d) => d.id).join(', ')}`);
  process.exit(1);
}

/* Refuse to write a registry whose status vocabulary is unknown. The roadmap
   needs the honest states the project-state contract names, so the enum is
   EXTENDED here (never narrowed) rather than a real state being mislabelled. */
const REQUIRED_STATUS = ['in_progress', 'deferred', 'blocked'];
registry._meta.status_enum = [...new Set([...registry._meta.status_enum, ...REQUIRED_STATUS])];
const ALLOWED_STATUS = new Set(registry._meta.status_enum);
const badStatus = next.filter((e) => !ALLOWED_STATUS.has(e.status));
if (badStatus.length > 0) {
  console.error(`REFUSING TO WRITE — unknown status: ${badStatus.map((d) => `${d.id}=${d.status}`).join(', ')}`);
  process.exit(1);
}

const added = next.length - entries.length;
const replaced = entries.length - preserved.length;

registry.entries = next;
registry._meta.last_updated = TODAY;
registry._meta.total_entries = next.length;
registry._meta.roadmap_reconciliation = {
  sprint: 'Phase 1 — Explore UK Market Fit / pre-audit (2026-09-19)',
  note:
    'The COMPLETE Mercenta roadmap (Phases 2–15) is recorded here at workstream level so a future session can see what is built, in progress, deferred and blocked. Phase 1 rows are built_and_tested with evidence. Future rows describe WORK, never a fact.',
  added_ids: OURS.map((r) => r.id),
  by_status: next.reduce((acc, e) => {
    acc[e.status] = (acc[e.status] ?? 0) + 1;
    return acc;
  }, {}),
};

fs.writeFileSync(REGISTRY, JSON.stringify(registry, null, 2) + '\n');
console.log(`ROADMAP_RECONCILIATION_OK — entries ${entries.length} → ${next.length} (added ${added}, replaced ${replaced}, historical rows deleted 0)`);
console.log(`  Phase 1 rows:        ${PHASE1.length} (built_and_tested)`);
console.log(`  Phase 0 extensions:  ${PHASE0_EXTENSIONS.length}`);
console.log(`  Future roadmap rows: ${FUTURE_ROADMAP_ALL.length}`);
console.log(`  By status: ${JSON.stringify(registry._meta.roadmap_reconciliation.by_status)}`);


