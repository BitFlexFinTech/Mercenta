/**
 * §PHASE 1 — EXPLORE UK MARKET FIT / PRE-AUDIT — CANONICAL CONFIGURATION.
 *
 * SINGLE SOURCE OF TRUTH for everything the pre-audit assessment is allowed to
 * say, score, classify and promise. Nothing in the assessment may declare its
 * own threshold, its own classification label or its own claim wording: it must
 * read it from here, so the public surface, the engine, the founder surface and
 * the validators can never drift apart.
 *
 * WHAT THIS IS (and is not)
 * -------------------------
 * The assessment is a GUIDED COMMERCIAL ASSESSMENT of whether there appears to
 * be a credible UK opportunity for a brand. It is:
 *
 *   NOT a purchase-order predictor
 *   NOT a retail-channel acceptance guarantee
 *   NOT a guarantee of sales
 *   NOT an endorsement claim
 *   NOT a single "success score"
 *
 * It keeps three questions STRICTLY SEPARATE, because collapsing them is how an
 * assessment starts lying:
 *
 *   CATALOGUE ELIGIBILITY      can the product satisfy applicable requirements?
 *   COMMERCIAL OPPORTUNITY     does it look commercially worth pursuing?
 *   SUPPLY / REPLENISHMENT     can it be supplied reliably enough for the route?
 *
 * CHANNEL-NEUTRAL BY DEFAULT. This file names no retail channel. The platform's
 * provider-specific operational reality is internal; outward-facing assessment
 * copy describes the UK market and the retail channel generically. See
 * `src/lib/intelligence/amazonWording.ts` for the programme-claim rules and
 * `npm run validate:wording` for the static gate that enforces this.
 */
import type { IntelligenceBasis } from '@/lib/intelligence/intelligenceLayer';

/* ── Identity: the ONE place the CTA and its route are declared ───────────── */

/**
 * §3 — the public CTA / assessment name. Deliberately NOT "See My UK
 * Potential" / "See Your UK Potential": this is an assessment of evidence, not
 * a promise about the brand's potential.
 */
export const EXPLORE_UK_MARKET_FIT_CTA = 'Explore UK Market Fit';

/** The public route the CTA opens. */
export const EXPLORE_UK_MARKET_FIT_PATH = '/explore-uk-market-fit';

/** The assessment's own honest one-line description. */
export const EXPLORE_UK_MARKET_FIT_SUMMARY =
  'A guided assessment of whether there appears to be a credible UK opportunity for your products, based on the evidence available.';

/** §17 — Partner Login stays a separate secondary utility action in the header. */
export const PUBLIC_HEADER_UTILITY_ACTION = 'Partner Login';

/**
 * §9 — DECLARED: there is no single "success score". Pinned as a constant so a
 * future change cannot quietly introduce one, and asserted by the validator.
 */
export const NO_SINGLE_SUCCESS_SCORE = true;

/* ── §8B — UK MARKET PRESENCE CLASSIFICATIONS (A–F, the canonical six) ────── */

export type UkPresenceClass = 'A' | 'B' | 'C' | 'D' | 'E' | 'F';

export interface UkPresenceClassDefinition {
  id: UkPresenceClass;
  label: string;
  description: string;
  /** What this class means for the next step — never a promise. */
  implication: string;
}

export const UK_PRESENCE_CLASSES: readonly UkPresenceClassDefinition[] = [
  {
    id: 'A',
    label: 'Exact UK listing already exists',
    description: 'The same product appears to be listed in the UK under the same product identity.',
    implication: 'Catalogue overlap must be understood before any commercial discussion.',
  },
  {
    id: 'B',
    label: 'Same product under another UK listing',
    description: 'The product appears to be available in the UK, but not under the same product identity.',
    implication: 'Identity reconciliation would be required before any listing work.',
  },
  {
    id: 'C',
    label: 'Brand present, this product absent',
    description: 'The brand appears to trade in the UK, but this specific product does not appear to be present.',
    implication: 'A catalogue-expansion conversation, rather than a market-entry one.',
  },
  {
    id: 'D',
    label: 'Limited UK catalogue',
    description: 'The brand appears to have only a limited UK catalogue compared with its source market.',
    implication: 'Widening an existing footprint; existing UK operations may already be in place.',
  },
  {
    id: 'E',
    label: 'No meaningful UK presence',
    description: 'No meaningful UK presence was found for the brand or its products in the available evidence.',
    implication: 'A market-entry assessment, including supply and compliance readiness.',
  },
  {
    id: 'F',
    label: 'UK demand evidence, product unavailable',
    description: 'Evidence suggests UK demand for the product, but it does not appear to be available in the UK.',
    implication: 'The strongest apparent opening — still subject to evidence verification.',
  },
] as const;

/** The fail-closed state when no classification can honestly be reached. */
export const UK_PRESENCE_UNKNOWN = 'unknown' as const;
export type UkPresenceOutcome = UkPresenceClass | typeof UK_PRESENCE_UNKNOWN;

/* ── Evidence bases — re-exported from the canonical BI findings layer ────── */

/**
 * The four evidence bases are declared ONCE (in the BI findings layer). This
 * module re-uses that declaration rather than re-stating it, so a fifth basis
 * can never appear in one place only.
 */
export type PreAuditEvidenceBasis = IntelligenceBasis;

/** Runtime list, for the validator's cross-check against the canonical set. */
export const PRE_AUDIT_EVIDENCE_BASES: readonly PreAuditEvidenceBasis[] = [
  'canonical',
  'simulated',
  'external_research',
  'ai_interpretation',
] as const;

/* ── §8 — THE SEVEN ASSESSMENT DIMENSIONS ─────────────────────────────────── */

export type UkMarketFitDimensionId =
  | 'source_market_demand'
  | 'uk_market_presence'
  | 'uk_category_opportunity'
  | 'product_fit'
  | 'commercial_opportunity'
  | 'supply_replenishment_viability'
  | 'compliance_readiness';

export interface UkMarketFitDimensionDefinition {
  id: UkMarketFitDimensionId;
  label: string;
  question: string;
  /** What the dimension is allowed to conclude from. */
  observes: readonly string[];
  /** What it must never claim. */
  mustNotClaim: string;
}

export const UK_MARKET_FIT_DIMENSIONS: readonly UkMarketFitDimensionDefinition[] = [
  {
    id: 'source_market_demand',
    label: 'Source-market demand',
    question: 'Is there evidence of real demand for this product where the brand already trades?',
    observes: ['demand indicators', 'review volume', 'ratings', 'marketplace presence', 'category position', 'catalogue traction'],
    mustNotClaim: 'That source-market demand transfers to the UK, or that it predicts UK sales.',
  },
  {
    id: 'uk_market_presence',
    label: 'UK market presence',
    question: 'What is the brand’s and product’s current position in the UK market?',
    observes: ['exact UK listing', 'equivalent UK listing', 'brand-level UK presence', 'UK catalogue depth', 'demand evidence without availability'],
    mustNotClaim: 'That a classification is certain — it is what the available evidence suggests.',
  },
  {
    id: 'uk_category_opportunity',
    label: 'UK category opportunity',
    question: 'Does the product’s category look like an opening in the UK?',
    observes: ['category', 'competition', 'product positioning', 'price environment', 'catalogue depth', 'differentiation'],
    mustNotClaim: 'That a category is easy, or that competition has been measured directly.',
  },
  {
    id: 'product_fit',
    label: 'Product fit',
    question: 'Does this specific product look like a fit for the UK market?',
    observes: ['product identity', 'demand evidence', 'differentiation', 'brand strength', 'catalogue expansion potential'],
    mustNotClaim: 'That the product will be accepted, listed or sold.',
  },
  {
    id: 'commercial_opportunity',
    label: 'Commercial opportunity',
    question: 'Does the product look commercially worth pursuing?',
    observes: ['observed price', 'supplied cost/wholesale price', 'margin opportunity', 'logistics', 'commercial feasibility'],
    mustNotClaim: 'A margin, a landed cost or a profit figure that has not been supplied or derived from a real number.',
  },
  {
    id: 'supply_replenishment_viability',
    label: 'Supply / replenishment viability',
    question: 'Could this product be supplied reliably enough for the intended route?',
    observes: ['origin', 'lead time', 'transit', 'customs', 'supply variability', 'MOQ', 'case pack', 'logistics route'],
    mustNotClaim: 'A universal maximum lead time, or any lead time that was not supplied.',
  },
  {
    id: 'compliance_readiness',
    label: 'Compliance / readiness',
    question: 'What is known, and what is still unknown, about this product’s documentation?',
    observes: ['known documentation', 'obvious category requirements', 'missing information', 'regulatory questions'],
    mustNotClaim: 'A legal or regulatory determination — this is not a compliance clearance.',
  },
] as const;

/* ── §9 — THE THREE SEPARATE INDICATORS (never merged) ────────────────────── */

export type PreAuditIndicatorId =
  | 'catalogue_eligibility'
  | 'commercial_opportunity'
  | 'supply_viability';

/** Deliberately qualitative — an indicator state is a judgement, not a score. */
export type PreAuditIndicatorState = 'favourable' | 'workable' | 'constrained' | 'unknown';

export interface PreAuditIndicatorDefinition {
  id: PreAuditIndicatorId;
  label: string;
  question: string;
  /** Shown next to the indicator so its meaning can never be over-read. */
  meaning: string;
}

export const PRE_AUDIT_INDICATORS: readonly PreAuditIndicatorDefinition[] = [
  {
    id: 'catalogue_eligibility',
    label: 'Catalogue eligibility',
    question: 'Can the product satisfy the applicable catalogue and product requirements?',
    meaning: 'About requirements and documentation — not about demand, price or profitability.',
  },
  {
    id: 'commercial_opportunity',
    label: 'Commercial opportunity',
    question: 'Does the product appear commercially worth pursuing?',
    meaning: 'About the apparent commercial case — not about requirements or supply.',
  },
  {
    id: 'supply_viability',
    label: 'Supply / replenishment viability',
    question: 'Can the product be supplied reliably enough for the intended route?',
    meaning: 'About supply reliability — not about demand, price or requirements.',
  },
] as const;

/* ── §9/§8 — DECLARED THRESHOLDS (every indicator exposes the one it used) ── */

export const UK_MARKET_FIT_THRESHOLDS = {
  /** Review volume at or above this is treated as catalogue traction (declared bar). */
  reviewTractionFloor: 50,
  /** Review volume at or above this is treated as strong traction. */
  reviewTractionStrong: 500,
  /** Rating at or above this is treated as a credible rating signal. */
  credibleRatingFloor: 4.0,
  /** Rating below this is treated as a weakness signal. */
  weakRatingCeiling: 3.5,
  /** A source-market listing count at or above this suggests catalogue depth. */
  catalogueDepthFloor: 3,
  /** MOQ at or below this is treated as low-friction for a first order. */
  lowFrictionMoq: 500,
  /** MOQ above this is treated as a supply constraint for a first order. */
  highFrictionMoq: 5000,
  /** Supplied lead time (days) at or below this is treated as short. */
  shortLeadTimeDays: 30,
  /** Supplied lead time (days) above this is treated as long. */
  longLeadTimeDays: 90,
  /** A supplied margin share at or above this is treated as workable. */
  workableMarginPct: 15,
  /** A supplied margin share below this is treated as constrained. */
  constrainedMarginPct: 8,
} as const;

/* ── §7 — CANONICAL ASSESSMENT STATES ─────────────────────────────────────── */

export type PreAuditStatus =
  | 'started'
  | 'researching'
  | 'research_unavailable'
  | 'assessed'
  | 'withdrawn';

export type PreAuditQualification =
  | 'unqualified'
  | 'needs_information'
  | 'qualified'
  | 'ineligible';

export interface PreAuditQualificationDefinition {
  id: PreAuditQualification;
  label: string;
  description: string;
  /** May this assessment be fed into the acquisition pipeline? */
  feedsAcquisition: boolean;
}

export const PRE_AUDIT_QUALIFICATIONS: readonly PreAuditQualificationDefinition[] = [
  {
    id: 'unqualified',
    label: 'Not qualified yet',
    description: 'Not enough evidence has been gathered to form a view.',
    feedsAcquisition: false,
  },
  {
    id: 'needs_information',
    label: 'Needs more information',
    description: 'The assessment is workable, but specific missing information must be supplied first.',
    feedsAcquisition: false,
  },
  {
    id: 'qualified',
    label: 'Qualified for review',
    description: 'The available evidence suggests a credible UK opportunity worth a Mercenta review.',
    feedsAcquisition: true,
  },
  {
    id: 'ineligible',
    label: 'Not eligible for this route',
    description: 'The product falls outside the categories Mercenta can evaluate for this route.',
    feedsAcquisition: false,
  },
] as const;

/* ── §10 — THE UK OPPORTUNITY SNAPSHOT (eight sections, canonical order) ──── */

export type UkOpportunitySnapshotSectionId =
  | 'uk_market_presence'
  | 'product_opportunity'
  | 'market_evidence'
  | 'commercial_considerations'
  | 'supply_considerations'
  | 'product_readiness'
  | 'open_questions'
  | 'recommended_next_step';

export interface UkOpportunitySnapshotSectionDefinition {
  id: UkOpportunitySnapshotSectionId;
  title: string;
  purpose: string;
}

export const UK_OPPORTUNITY_SNAPSHOT_SECTIONS: readonly UkOpportunitySnapshotSectionDefinition[] = [
  { id: 'uk_market_presence', title: 'UK Market Presence', purpose: 'What the available evidence suggests about the brand’s and product’s UK position.' },
  { id: 'product_opportunity', title: 'Product Opportunity', purpose: 'The apparent opening for this specific product.' },
  { id: 'market_evidence', title: 'Market Evidence', purpose: 'The evidence the assessment actually rests on, with its basis.' },
  { id: 'commercial_considerations', title: 'Commercial Considerations', purpose: 'The apparent commercial case — and what is not known.' },
  { id: 'supply_considerations', title: 'Supply Considerations', purpose: 'Origin, route, lead time and replenishment considerations.' },
  { id: 'product_readiness', title: 'Product Readiness', purpose: 'Documentation and category requirements that appear to apply.' },
  { id: 'open_questions', title: 'Open Questions', purpose: 'What still has to be confirmed before a decision can be made.' },
  { id: 'recommended_next_step', title: 'Recommended Next Step', purpose: 'The single next action, stated as a recommendation.' },
] as const;

/* ── §10 — THE HONEST-WORDING VOCABULARY ──────────────────────────────────── */

/**
 * Every generated statement must be phrased with one of these hedges. Declared
 * here so the engine and the surface use the same vocabulary, and so the
 * validator can assert that a hedge is actually present.
 */
export const PRE_AUDIT_HEDGES = {
  appears: 'appears to',
  evidenceSuggests: 'evidence suggests',
  requiresVerification: 'requires verification',
  basedOnAvailableInformation: 'based on the available information',
  couldNotBeEstablished: 'could not be established from the available information',
} as const;

/** §10 — what the assessment may NEVER promise. Asserted by the validator. */
export const PRE_AUDIT_PROHIBITED_PROMISES: readonly string[] = [
  'guaranteed purchase order',
  'guaranteed PO',
  'guaranteed sales',
  'guaranteed demand',
  'guaranteed listing',
  'guaranteed margin',
  'guaranteed acceptance',
  'guaranteed approval',
  'endorsed',
  'partnership',
  'approved by',
] as const;

/** The honest disclaimer shown with every result. */

/* ── §13 — DECLARED RESEARCH SOURCES (the future seam, named honestly) ────── */

export type PreAuditResearchSourceId =
  | 'brand_website'
  | 'marketplace_listing_data'
  | 'marketplace_api'
  | 'product_research_provider'
  | 'company_register'
  | 'public_product_data';

export interface PreAuditResearchSourceDefinition {
  id: PreAuditResearchSourceId;
  label: string;
  /** Honest current state. NOTHING here is live in this build. */
  state: 'simulated' | 'not_configured';
  /** Which credential would turn it on (never a value, just the name). */
  credential: string;
}

export const PRE_AUDIT_RESEARCH_SOURCES: readonly PreAuditResearchSourceDefinition[] = [
  { id: 'brand_website', label: 'Brand website', state: 'simulated', credential: 'none — fetched only when a crawl provider is configured' },
  { id: 'marketplace_listing_data', label: 'Marketplace listing data', state: 'simulated', credential: 'MARKETPLACE_DATA_PROVIDER_KEY' },
  /**
   * §PUBLIC MESSAGING B6 (2026-09-29) — `label` is RENDERED on the public growth
   * page as "Source consulted: …", and it used to read "Marketplace API", which
   * the red-line family `platform-internals` forbids (`\bAPI\b`). The ID
   * (`marketplace_api`) is a canonical internal identifier and is unchanged.
   */
  { id: 'marketplace_api', label: 'Marketplace product data', state: 'not_configured', credential: 'MARKETPLACE_API_CREDENTIALS' },
  { id: 'product_research_provider', label: 'Product research provider', state: 'simulated', credential: 'PRODUCT_RESEARCH_PROVIDER_KEY' },
  { id: 'company_register', label: 'Company register', state: 'not_configured', credential: 'COMPANY_REGISTER_API_KEY' },
  { id: 'public_product_data', label: 'Public product data', state: 'simulated', credential: 'none — public data only' },
] as const;

/* ── §16 — EDUCATIONAL GAPS (the Phase-4 Academy seam) ────────────────────── */

/**
 * The concepts a brand frequently does not yet have when it arrives. The
 * assessment CAPTURES which of these are missing; it does not teach them (that
 * is Phase 4 — the Brand Education / Onboarding Academy). Capturing them here
 * is what lets a future Academy start from the brand's real gaps.
 */
export type PreAuditEducationalGapId =
  | 'wholesale_cost_price'
  | 'moq'
  | 'case_pack'
  | 'master_carton'
  | 'sellable_unit'
  | 'packaging_hierarchy'
  | 'labelling'
  | 'product_identifiers'
  | 'dimensions_weight'
  | 'product_images'
  | 'compliance_documentation'
  | 'category_requirements'
  | 'purchase_orders'
  | 'po_acknowledgement'
  | 'shipping_fulfilment'
  | 'invoices_payments'
  | 'returns_deductions';

export interface PreAuditEducationalGapDefinition {
  id: PreAuditEducationalGapId;
  label: string;
  /** The Academy stage that will eventually teach it (Phase 4 curriculum). */
  academyStage: 1 | 2 | 3 | 4 | 5;
}

export const PRE_AUDIT_EDUCATIONAL_GAPS: readonly PreAuditEducationalGapDefinition[] = [
  { id: 'wholesale_cost_price', label: 'Wholesale / cost price', academyStage: 2 },
  { id: 'moq', label: 'Minimum order quantity', academyStage: 2 },
  { id: 'case_pack', label: 'Case pack quantity', academyStage: 3 },
  { id: 'master_carton', label: 'Master carton quantity', academyStage: 3 },
  { id: 'sellable_unit', label: 'Sellable unit', academyStage: 3 },
  { id: 'packaging_hierarchy', label: 'Packaging hierarchy', academyStage: 3 },
  { id: 'labelling', label: 'Labelling', academyStage: 3 },
  { id: 'product_identifiers', label: 'Product identifiers', academyStage: 4 },
  { id: 'dimensions_weight', label: 'Dimensions and weight', academyStage: 4 },
  { id: 'product_images', label: 'Product images', academyStage: 4 },
  { id: 'compliance_documentation', label: 'Compliance documentation', academyStage: 4 },
  { id: 'category_requirements', label: 'Category requirements', academyStage: 4 },
  { id: 'purchase_orders', label: 'Purchase orders', academyStage: 5 },
  /**
   * §PUBLIC MESSAGING B6 (2026-09-29) — THE LABEL IS RENDERED ON A PUBLIC PAGE.
   *
   * The assessment renders each captured gap as a chip, and this one read
   * "Purchase-order acknowledgement" — another company's workflow vocabulary, and
   * a `src/config/positioning.ts` §11 family-3 pattern (`\backnowledg`). The ID
   * (`po_acknowledgement`) is a canonical internal identifier and is unchanged;
   * only the public sentence is.
   */
  { id: 'po_acknowledgement', label: 'Confirming purchase orders', academyStage: 5 },
  { id: 'shipping_fulfilment', label: 'Shipping and fulfilment', academyStage: 5 },
  { id: 'invoices_payments', label: 'Invoices and payments', academyStage: 5 },
  { id: 'returns_deductions', label: 'Returns and deductions', academyStage: 5 },
] as const;

export const PRE_AUDIT_DISCLAIMER =
  /*
    §PUBLIC MESSAGING B6 (2026-09-29) — THE NEGATION NO LONGER USES A RED-LINE
    TERM. It read "…not an endorsement, a partnership or an approval", and
    `partnership` is a `src/config/positioning.ts` §11 family-7 pattern
    (unevidenced claims). The sentence DENIED a partnership, which is why the
    pre-audit validator deliberately excluded the disclaimer from its own claim
    scan — but every mechanical scan of the RENDERED public page (the B8 gate and
    the live check) must treat it exactly like any other published sentence, and a
    naive scan cannot tell a denial from a claim.

    The denial is preserved in substance and made explicit: nothing on the
    assessment CREATES A RELATIONSHIP, an endorsement or an approval. The
    arithmetic and the "where a figure was not supplied, no figure is shown" clause
    are unchanged.
  */
  'This is a guided commercial assessment based on the available information, not a promise of purchase orders, acceptance, sales, demand, a listing or a margin. Nothing here creates a relationship, an endorsement or an approval, and Mercenta does not control the retail channel’s decisions. Where a figure was not supplied, no figure is shown.';

/** Shown when the assessment ran on simulated research rather than live sources. */
export const PRE_AUDIT_SIMULATION_LABEL =
  'Simulated research — this assessment was produced by the deterministic simulation seam, not from live third-party sources.';

/** Shown when live research is not configured. Never presented as a live result. */
export const PRE_AUDIT_UNCONFIGURED_LABEL =
  'Live research sources are not configured in this environment. The assessment below is simulated and clearly labelled as such.';

/** The qualification states that may feed acquisition (derived, never re-listed). */
export const PRE_AUDIT_FEEDS_ACQUISITION_STATES: readonly PreAuditQualification[] =
  PRE_AUDIT_QUALIFICATIONS.filter((q) => q.feedsAcquisition).map((q) => q.id);


/* ── §20 — CANONICAL EVENTS THIS PHASE EMITS ──────────────────────────────── */

/**
 * The canonical platform event types the pre-audit emits. These are added to the
 * EXISTING event feed (`src/lib/events/types.ts`) — there is no second event
 * system, and no external automation platform is a dependency.
 */
export const PRE_AUDIT_EVENT_TYPES = [
  'assessment_started',
  'assessment_completed',
  'opportunity_created',
  'opportunity_qualified',
  'research_required',
  'outreach_ready',
] as const;

export type PreAuditEventType = (typeof PRE_AUDIT_EVENT_TYPES)[number];

/* ── §21 — DECLARED PROGRESSIVE-COLLECTION STEPS ──────────────────────────── */

export type PreAuditStepId = 'identity' | 'products' | 'research' | 'result';

export interface PreAuditStepDefinition {
  id: PreAuditStepId;
  title: string;
  /** Why the step asks what it asks — shown to the visitor. */
  rationale: string;
}

export const PRE_AUDIT_STEPS: readonly PreAuditStepDefinition[] = [
  {
    id: 'identity',
    title: 'Your brand',
    rationale: 'The minimum needed to start research: who you are and where you trade.',
  },
  {
    id: 'products',
    title: 'Your products',
    rationale: 'Asked only for what cannot be researched reliably. Skip anything you do not know.',
  },
  {
    id: 'research',
    title: 'Research',
    rationale: 'Mercenta gathers what can be found, then asks only for what is still missing.',
  },
  {
    id: 'result',
    title: 'UK Opportunity Snapshot',
    rationale: 'What the evidence suggests, what is unknown, and the recommended next step.',
  },
] as const;

/** §6 — the fields genuinely required to start research (everything else is optional). */
export const PRE_AUDIT_REQUIRED_FIELDS: readonly string[] = ['brandName', 'website', 'country', 'category'] as const;

/**
 * §6 — the fields the visitor MAY supply. The assessment asks for these only
 * after research, and only where research could not establish them.
 */
export const PRE_AUDIT_OPTIONAL_FIELDS: readonly string[] = [
  'productName',
  'productIdentifiers',
  'existingUkPresence',
  'sourceMarketplacePresence',
  'wholesaleCost',
  'retailPrice',
  'moq',
  'casePack',
  'leadTimeDays',
  'origin',
  'knownDocumentation',
  'contactName',
  'contactEmail',
] as const;

/** §21 — the declared test-visible test ids (single source for e2e + validator). */
export const PRE_AUDIT_TESTIDS = {
  cta: 'explore-uk-market-fit-cta',
  headerUtility: 'public-header-partner-login',
  surface: 'uk-market-fit-surface',
  step: (id: PreAuditStepId) => `uk-market-fit-step-${id}`,
  next: 'uk-market-fit-next',
  back: 'uk-market-fit-back',
  submit: 'uk-market-fit-submit',
  result: 'uk-market-fit-result',
  snapshotSection: (id: UkOpportunitySnapshotSectionId) => `uk-snapshot-${id}`,
  indicator: (id: PreAuditIndicatorId) => `uk-indicator-${id}`,
  simulationBadge: 'uk-market-fit-simulation-badge',
  /** The header line stating which research source is active (distinct from the result badge). */
  researchSource: 'uk-market-fit-research-source',
  qualification: 'uk-market-fit-qualification',
  openQuestions: 'uk-market-fit-open-questions',
  gap: 'uk-market-fit-educational-gap',
  requestReview: 'uk-market-fit-request-review',
  restart: 'uk-market-fit-restart',
} as const;

