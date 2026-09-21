/**
 * §Phase 2 — COMMERCIAL READINESS + PRODUCT ECONOMICS (single source of truth).
 *
 * This file declares the VOCABULARY of commercial readiness. The arithmetic lives
 * in `src/lib/commercial/economics.ts` (pure, deterministic, explainable) and the
 * routing lives in `src/lib/routing/gateways.ts`. Nothing here re-derives a
 * margin and nothing here is AI-derived.
 *
 * ⚠️ THE CONCEPTS THAT MUST NEVER BE COLLAPSED (Phase 2 §15):
 *
 *   1. CATALOGUE ELIGIBILITY      — can the product be accepted at all?
 *                                   (Phase 1 `catalogueEligibility` indicator)
 *   2. COMMERCIAL OPPORTUNITY     — is it commercially attractive?
 *                                   (Phase 1 `commercialOpportunity` indicator)
 *   3. SUPPLY / REPLENISHMENT     — can it realistically be supplied?
 *                                   (Phase 1 `supplyViability` indicator)
 *   4. COMMERCIAL READINESS       — are the COMMERCIAL CONDITIONS satisfied? (Phase 2)
 *
 * `NO_SINGLE_SUCCESS_SCORE` and `NO_OVERALL_OPPORTUNITY_SCORE` are declared true
 * so a validator pins them: there is no composite score anywhere in Phase 2.
 *
 * ⚠️ NO INVENTED THRESHOLD. Every commercial threshold ships UNSET. An unset
 * threshold does NOT silently pass: it routes the product to `human_review`
 * (`COMMERCIAL_THRESHOLD_UNSET_ROUTES_TO`). Mercenta does not invent a commercial
 * rule the business has not agreed.
 */

/** The four routes an exclusive commercial gateway may select. Exactly one. */
export type CommercialViabilityRoute = 'ready' | 'remediation' | 'blocked' | 'human_review';

export interface CommercialRouteDefinition {
  id: CommercialViabilityRoute;
  label: string;
  /** What this route means operationally. */
  description: string;
  /** Can the product proceed to downstream catalogue/vendor operations? */
  proceeds: boolean;
  /** Does this route require an authorised human to act? */
  requiresHuman: boolean;
  /** Is this route a refusal (nothing proceeds)? */
  refusal: boolean;
  /** The declared next step the routed record must carry. */
  nextStep: string;
}

export const COMMERCIAL_VIABILITY_ROUTE_DEFINITIONS: Record<
  CommercialViabilityRoute,
  CommercialRouteDefinition
> = {
  ready: {
    id: 'ready',
    label: 'Ready',
    description:
      'Every declared commercial condition is satisfied, or every unset threshold was explicitly accepted by an authorised human.',
    proceeds: true,
    requiresHuman: false,
    refusal: false,
    nextStep: 'Proceed to the next declared readiness stage.',
  },
  remediation: {
    id: 'remediation',
    label: 'Remediation',
    description:
      'The commercial conditions are not yet satisfied but are genuinely fixable — information is missing, or a term is out of line and can be corrected.',
    proceeds: false,
    requiresHuman: false,
    refusal: false,
    nextStep: 'Raise a remediation action naming the gap and its owner.',
  },
  blocked: {
    id: 'blocked',
    label: 'Blocked',
    description:
      'A declared commercial condition is definitively unmet and cannot be fixed by supplying more information (e.g. the observed economics cannot work).',
    proceeds: false,
    requiresHuman: false,
    refusal: true,
    nextStep: 'Record the blocking condition; do not present the product as commercially viable.',
  },
  human_review: {
    id: 'human_review',
    label: 'Human review',
    description:
      'The gateway cannot decide deterministically — a required input is missing/unreadable, a condition could not be evaluated, or no threshold has been agreed. It fails closed to a human rather than guessing.',
    proceeds: false,
    requiresHuman: true,
    refusal: true,
    nextStep: 'An authorised human must decide, and the decision is audited.',
  },
};

/** Route order for the gate — `human_review` last, because it is the fallback refusal. */
export const COMMERCIAL_VIABILITY_ROUTE_ORDER: readonly CommercialViabilityRoute[] = [
  'ready',
  'remediation',
  'blocked',
  'human_review',
] as const;

/** The canonical gateway id for the commercial viability gate. */
export const COMMERCIAL_GATE_ID = 'commercial_viability';

/** The canonical workflow id Phase 2 routing decisions are raised under. */
export const COMMERCIAL_READINESS_WORKFLOW_ID = 'commercial_readiness';

/* ── Commercial term fields ────────────────────────────────────────────────── */

export type CommercialTermFieldId =
  | 'rrp'
  | 'wholesale_cost'
  | 'expected_uk_retail'
  | 'currency'
  | 'unit_economics'
  | 'moq'
  | 'case_pack'
  | 'master_carton'
  | 'production_lead_time'
  | 'supply_capacity';

export type CommercialTermUnit =
  | 'gbp'
  | 'currency_code'
  | 'units'
  | 'units_per_case'
  | 'units_per_carton'
  | 'days'
  | 'units_per_period';

export interface CommercialTermField {
  id: CommercialTermFieldId;
  label: string;
  /** The canonical unit the value must be expressed in (never implicit). */
  unit: CommercialTermUnit;
  /** True when the field must be present before the gate can reach `ready`. */
  required: boolean;
  description: string;
}

export const COMMERCIAL_TERM_FIELDS: readonly CommercialTermField[] = [
  {
    id: 'rrp',
    label: 'Recommended retail price',
    unit: 'gbp',
    required: false,
    description: 'The brand’s recommended retail price. Guidance, not a channel commitment.',
  },
  {
    id: 'wholesale_cost',
    label: 'Wholesale / cost price',
    unit: 'gbp',
    required: true,
    description: 'What the product costs Mercenta to acquire, per unit.',
  },
  {
    id: 'expected_uk_retail',
    label: 'Expected UK retail price',
    unit: 'gbp',
    required: true,
    description: 'The expected selling price in the UK channel — an estimate unless evidenced.',
  },
  {
    id: 'currency',
    label: 'Settlement currency',
    unit: 'currency_code',
    required: true,
    description: 'The currency the terms are expressed in. Never assumed.',
  },
  {
    id: 'unit_economics',
    label: 'Unit economics',
    unit: 'gbp',
    required: false,
    description: 'Derived: expected UK retail less acquisition cost and declared per-unit costs.',
  },
  {
    id: 'moq',
    label: 'Brand MOQ',
    unit: 'units',
    required: false,
    description: 'The brand’s minimum order quantity. NOT the same thing as a PO quantity.',
  },
  {
    id: 'case_pack',
    label: 'Case pack',
    unit: 'units_per_case',
    required: false,
    description: 'Units in one case.',
  },
  {
    id: 'master_carton',
    label: 'Master carton',
    unit: 'units_per_carton',
    required: false,
    description: 'Units in one master carton, derived from case pack × cases per carton.',
  },
  {
    id: 'production_lead_time',
    label: 'Production lead time',
    unit: 'days',
    required: false,
    description: 'Declared production lead time in days. Never a carrier commitment.',
  },
  {
    id: 'supply_capacity',
    label: 'Supply capacity',
    unit: 'units_per_period',
    required: false,
    description: 'Declared units the brand can supply per period.',
  },
] as const;

/** The fields that must be present before the gate may select `ready`. */
export const COMMERCIAL_REQUIRED_TERM_FIELDS: readonly CommercialTermFieldId[] =
  COMMERCIAL_TERM_FIELDS.filter((f) => f.required).map((f) => f.id);

/* ── Value basis (§16 — actual / observed / calculated / estimated / assumed / unknown) ── */

/**
 * EVERY commercial number carries its basis. A figure whose basis is `assumed`
 * or `unknown` can never be presented as evidence, and a condition resting on
 * one can never silently produce `ready`.
 */
export type CommercialValueBasis =
  | 'actual'
  | 'observed'
  | 'calculated'
  | 'estimated'
  | 'assumed'
  | 'unknown';

export interface CommercialValueBasisDefinition {
  id: CommercialValueBasis;
  label: string;
  description: string;
  /** May a `ready` route rest on a value with this basis? */
  supportsReady: boolean;
}

export const COMMERCIAL_VALUE_BASES: Record<CommercialValueBasis, CommercialValueBasisDefinition> = {
  actual: {
    id: 'actual',
    label: 'Actual',
    description: 'A real, contracted or invoiced figure.',
    supportsReady: true,
  },
  observed: {
    id: 'observed',
    label: 'Observed',
    description: 'Observed in the market or in a source, with the source retained.',
    supportsReady: true,
  },
  calculated: {
    id: 'calculated',
    label: 'Calculated',
    description: 'Derived deterministically from other terms by the commercial calculator.',
    supportsReady: true,
  },
  estimated: {
    id: 'estimated',
    label: 'Estimated',
    description: 'A reasoned estimate. It is labelled as an estimate wherever it is shown.',
    supportsReady: true,
  },
  assumed: {
    id: 'assumed',
    label: 'Assumed',
    description: 'An assumption, not evidence. It can never by itself justify `ready`.',
    supportsReady: false,
  },
  unknown: {
    id: 'unknown',
    label: 'Unknown',
    description: 'Not established. It is stated as unknown rather than filled with a guess.',
    supportsReady: false,
  },
};

/* ── §17 — MOQ / CASE PACK / MASTER CARTON as FIRST-CLASS concepts ─────────── */

/**
 * These are deliberately SEVEN distinct concepts. The pre-Phase-2 model carried
 * only `moq` and `casePack`, which is exactly why they are declared together
 * here with their explicit differences: conflating them is a real commercial
 * error (a brand MOQ is not a production MOQ, and neither is a PO quantity; a
 * shipment quantity is what was actually shipped).
 */
export type PackConceptId =
  | 'brand_moq'
  | 'production_moq'
  | 'case_pack'
  | 'master_carton'
  | 'po_quantity'
  | 'shipment_quantity'
  | 'pallet_profile';

export interface PackConceptDefinition {
  id: PackConceptId;
  label: string;
  unit: 'units' | 'units_per_case' | 'units_per_carton' | 'cartons_per_pallet';
  description: string;
  /** The concepts this one is routinely — and wrongly — confused with. */
  distinctFrom: readonly PackConceptId[];
}

export const PACK_CONCEPTS: Record<PackConceptId, PackConceptDefinition> = {
  brand_moq: {
    id: 'brand_moq',
    label: 'Brand MOQ',
    unit: 'units',
    description: 'The minimum quantity the BRAND will accept on one order.',
    distinctFrom: ['production_moq', 'po_quantity'],
  },
  production_moq: {
    id: 'production_moq',
    label: 'Production MOQ',
    unit: 'units',
    description: 'The minimum quantity the manufacturer will run in one production batch.',
    distinctFrom: ['brand_moq', 'po_quantity'],
  },
  case_pack: {
    id: 'case_pack',
    label: 'Case pack',
    unit: 'units_per_case',
    description: 'Units in one case.',
    distinctFrom: ['master_carton'],
  },
  master_carton: {
    id: 'master_carton',
    label: 'Master carton',
    unit: 'units_per_carton',
    description: 'Units in one master carton — case pack × cases per carton.',
    distinctFrom: ['case_pack'],
  },
  po_quantity: {
    id: 'po_quantity',
    label: 'PO quantity',
    unit: 'units',
    description: 'The quantity on the purchase order. Never assumed to equal any MOQ.',
    distinctFrom: ['brand_moq', 'production_moq', 'shipment_quantity'],
  },
  shipment_quantity: {
    id: 'shipment_quantity',
    label: 'Shipment quantity',
    unit: 'units',
    description: 'What was ACTUALLY shipped. Recorded separately from what was ordered.',
    distinctFrom: ['po_quantity'],
  },
  pallet_profile: {
    id: 'pallet_profile',
    label: 'Pallet profile',
    unit: 'cartons_per_pallet',
    description: 'Cartons per pallet — relevant to freight costing, not to unit economics.',
    distinctFrom: [],
  },
};

/** Display order for the pack concepts. */
export const PACK_CONCEPT_ORDER: readonly PackConceptId[] = [
  'brand_moq',
  'production_moq',
  'case_pack',
  'master_carton',
  'po_quantity',
  'shipment_quantity',
  'pallet_profile',
] as const;

/** The declared pack-mathematics rule the calculator must satisfy. */
export const PACK_MATHS_RULE = 'units_per_master_carton = case_pack × cases_per_carton';

/** §17 — the worked example the validator pins (6 units/case × 4 cases/carton = 24). */
export const PACK_MATHS_WORKED_EXAMPLE = {
  casePack: 6,
  casesPerCarton: 4,
  unitsPerMasterCarton: 24,
} as const;

/** §17 — a PO quantity is a commercial decision; it is not derived from an MOQ. */
export const PO_QUANTITY_IS_NOT_DERIVED_FROM_MOQ = true;
/** §17 — Mercenta never implies a channel will honour a brand MOQ without contractual support. */
export const CHANNEL_WILL_HONOUR_MOQ_IS_UNSUPPORTED = true;
/** §17 — the declared label used whenever an MOQ is presented. */
export const MOQ_HONOUR_DISCLAIMER =
  'A brand MOQ is the brand’s own minimum order quantity. It does not establish that any retail channel will order at that quantity.';

/* ── §18/§19 — the declared commercial thresholds (ALL UNSET, fail-closed) ─── */

export type CommercialThresholdId =
  | 'minimum_gross_margin_pct'
  | 'maximum_brand_moq_units'
  | 'maximum_planning_lead_time_days'
  | 'minimum_units_per_case'
  | 'maximum_units_per_case'
  | 'minimum_operational_supply_months';

export interface DeclaredCommercialThreshold {
  id: CommercialThresholdId;
  label: string;
  /** Always `null` until the business agrees a figure. Never defaulted. */
  value: number | null;
  unit: 'pct' | 'units' | 'days' | 'months';
  /** False ⇒ the condition it guards routes to human_review. */
  configured: boolean;
  note: string;
}

export const COMMERCIAL_THRESHOLDS: Record<CommercialThresholdId, DeclaredCommercialThreshold> = {
  minimum_gross_margin_pct: {
    id: 'minimum_gross_margin_pct',
    label: 'Minimum gross margin',
    value: null,
    unit: 'pct',
    configured: false,
    note: 'No minimum margin has been agreed by the business, so the gate cannot decide it.',
  },
  maximum_brand_moq_units: {
    id: 'maximum_brand_moq_units',
    label: 'Maximum acceptable brand MOQ',
    value: null,
    unit: 'units',
    configured: false,
    note: 'No MOQ ceiling has been agreed. An MOQ is reported, never judged against an invented limit.',
  },
  maximum_planning_lead_time_days: {
    id: 'maximum_planning_lead_time_days',
    label: 'Maximum planning lead time',
    value: null,
    unit: 'days',
    configured: false,
    note: 'Deliberately unset — a universal lead-time rule must not be invented (Phase 3 owns this).',
  },
  minimum_units_per_case: {
    id: 'minimum_units_per_case',
    label: 'Minimum units per case',
    value: null,
    unit: 'units',
    configured: false,
    note: 'Placeholder for a future agreed packaging floor.',
  },
  maximum_units_per_case: {
    id: 'maximum_units_per_case',
    label: 'Maximum units per case',
    value: null,
    unit: 'units',
    configured: false,
    note: 'Placeholder for a future agreed packaging ceiling.',
  },
  minimum_operational_supply_months: {
    id: 'minimum_operational_supply_months',
    label: 'Minimum operational supply cover',
    value: null,
    unit: 'months',
    configured: false,
    note: 'Replenishment viability floor — unset until the business agrees one.',
  },
};

/** An unset threshold NEVER passes silently. */
export const COMMERCIAL_THRESHOLD_UNSET_ROUTES_TO: CommercialViabilityRoute = 'human_review';

/** The declared condition catalogue of the commercial gate. */
export type CommercialConditionId =
  | 'required_terms_present'
  | 'terms_are_evaluable'
  | 'economics_supportive'
  | 'moq_supports_intended_volume'
  | 'pack_mathematics_valid'
  | 'supply_capacity_supports_demand'
  | 'lead_time_within_agreed_limit';

export interface CommercialConditionDefinition {
  id: CommercialConditionId;
  label: string;
  description: string;
  /** Where the condition is unmet but FIXABLE → this route. */
  unmetRoute: CommercialViabilityRoute;
  /** Where the condition cannot be evaluated at all → this route (fail-closed). */
  unevaluableRoute: CommercialViabilityRoute;
}

export const COMMERCIAL_CONDITIONS: readonly CommercialConditionDefinition[] = [
  {
    id: 'required_terms_present',
    label: 'Required terms present',
    description: 'Every required commercial term is present and expressed in a declared unit.',
    unmetRoute: 'remediation',
    unevaluableRoute: 'human_review',
  },
  {
    id: 'terms_are_evaluable',
    label: 'Terms are evaluable',
    description: 'Each recorded value carries a basis, and that basis is not assumed/unknown.',
    unmetRoute: 'remediation',
    unevaluableRoute: 'human_review',
  },
  {
    id: 'economics_supportive',
    label: 'Economics supportive',
    description:
      'Unit economics are positive, or a margin threshold (if one is configured) is met.',
    unmetRoute: 'blocked',
    unevaluableRoute: 'human_review',
  },
  {
    id: 'moq_supports_intended_volume',
    label: 'MOQ supports the intended volume',
    description:
      'The brand MOQ can be met by the intended order quantity — expressed as a business rule, never against an invented ceiling.',
    unmetRoute: 'blocked',
    unevaluableRoute: 'human_review',
  },
  {
    id: 'pack_mathematics_valid',
    label: 'Pack mathematics valid',
    description: `Case pack, cases per carton and master carton must satisfy: ${PACK_MATHS_RULE}.`,
    unmetRoute: 'remediation',
    unevaluableRoute: 'human_review',
  },
  {
    id: 'supply_capacity_supports_demand',
    label: 'Supply capacity supports demand',
    description:
      'Declared supply capacity can cover the projected demand — the commercial ↔ SupplyProfile interaction.',
    unmetRoute: 'blocked',
    unevaluableRoute: 'human_review',
  },
  {
    id: 'lead_time_within_agreed_limit',
    label: 'Lead time within the agreed limit',
    description:
      'Planning lead time is inside an AGREED limit. With no agreed limit the condition is unevaluable and routes to human review — no universal rule is invented.',
    unmetRoute: 'blocked',
    unevaluableRoute: 'human_review',
  },
] as const;

/* ── Declarations (pinned by the validator) ────────────────────────────────── */

/** §9/§15 — there is no single success score and no overall opportunity score. */
export const NO_SINGLE_SUCCESS_SCORE = true;
export const NO_OVERALL_OPPORTUNITY_SCORE = true;
/** §16/§19 — the arithmetic is deterministic and never AI-derived. */
export const COMMERCIAL_READINESS_NEVER_AI_DERIVED = true;
/** §20 — commercial viability is evaluated WITH the SupplyProfile, never in isolation. */
export const COMMERCIAL_READINESS_CONSIDERS_SUPPLY_PROFILE = true;
/** §3/§15 — the model-independent compliance rule still holds. */
export const COMMERCIAL_READINESS_NEVER_CHANGES_COMPLIANCE = true;

export const COMMERCIAL_READINESS_TEST_IDS = {
  routeBadge: 'commercial-readiness-route',
  conditionsTable: 'commercial-readiness-conditions',
  missingInputs: 'commercial-readiness-missing-inputs',
  packMaths: 'commercial-readiness-pack-maths',
  /** §12 — the founder/ops workspace + the brand-facing view. */
  adminWorkspace: 'commercial-readiness-workspace',
  adminQueueRow: 'commercial-readiness-queue-row',
  adminDrawer: 'commercial-readiness-drawer',
  adminConditions: 'commercial-readiness-conditions',
  brandView: 'brand-commercial-readiness',
  brandProduct: 'brand-commercial-product',
  brandRoute: 'brand-commercial-route',
  brandMissing: 'brand-commercial-missing',
  brandGuidance: 'brand-commercial-guidance',
  brandSubmit: 'brand-commercial-submit',
} as const;

/** §12 — the declared destinations the commercial surfaces are reached from. */
export const COMMERCIAL_READINESS_SURFACE = {
  /** The existing Super-Admin destination; the section is added to it, not a new dashboard. */
  adminDestination: 'control_centre',
  /** The brand view id inside the existing brand shell. */
  brandView: 'commercial_readiness',
  brandNavLabel: 'Commercial Readiness',
} as const;

/**
 * §21 — the canonical event emitted when the commercial gate selects a route.
 * Declared next to the gate it belongs to (one declaration), and typed against
 * the canonical event union by the emitter, so it can never drift from
 * `src/lib/events/types.ts`.
 */
export const COMMERCIAL_ROUTE_SELECTED_EVENT = 'commercial_route_selected' as const;

/**
 * §18 — the DECLARED precedence ladder of the commercial gate.
 *
 * An exclusive gateway permits exactly one route, so the four routes must be
 * mutually exclusive BY CONSTRUCTION. This ladder is the business rule that makes
 * them so — declared here, not buried in the evaluator, because changing it
 * changes a commercial decision:
 *
 *   1. BLOCKED      — a condition is definitively unmet by the observed values
 *                     (fixing the DATA cannot help: the economics/volume/capacity
 *                     genuinely do not work),
 *   2. REMEDIATION  — a real gap that supplying information can close,
 *   3. HUMAN_REVIEW — something could not be evaluated and the gap is NOT
 *                     something data can close (it needs a business DECISION,
 *                     e.g. no maximum lead time has been agreed),
 *   4. READY        — every declared condition satisfied.
 *
 * `blocked` leads because a definitively unmet condition is the primary truth.
 * `remediation` precedes `human_review` deliberately: supplying the missing
 * information may make the unevaluable condition evaluable, so it is addressed
 * first; if the gap is closed and a condition is STILL unevaluable, the next
 * evaluation routes to human review.
 */
export const COMMERCIAL_GATE_PRECEDENCE: readonly CommercialViabilityRoute[] = [
  'blocked',
  'remediation',
  'human_review',
  'ready',
] as const;

export const COMMERCIAL_GATE_PRECEDENCE_RULE =
  'Applied in order: blocked (definitively unmet by the observed values), then remediation (a gap the supply of information can close), then human_review (a condition that cannot be evaluated and needs a business decision), then ready (every declared condition satisfied).';

/* ── §13 — DECLARED COMMERCIAL WORK SOURCES (the work-layer integration) ────
 *
 * A commercial route that needs a human action becomes REAL WORK in the
 * EXISTING work layer (`src/lib/work/workStore.ts`), derived from the readiness
 * record — never an orphan task, never a second task system. The declaration
 * lives here so changing a commercial SLA changes the business behaviour in ONE
 * place.
 *
 *   - `ready` raises NO work (nothing is outstanding),
 *   - `remediation` is the BRAND's action (supply the missing information),
 *   - `blocked` / `human_review` need a MERCENTA decision the deterministic gate
 *     is not entitled to make.
 *
 * The work item id is deterministic (`work-<source>-<recordId>`) and its deadline
 * is `record.createdAt + slaDays`. Because the item is DERIVED from the record,
 * re-assessing the record to a different route removes the item from the
 * attention set automatically — a repeat assessment can never duplicate work.
 */

/** The two declared commercial work sources. `null` ⇒ no work is raised. */
export type CommercialWorkSourceId = 'commercial_remediation' | 'commercial_review';

export interface CommercialWorkDefinition {
  source: CommercialWorkSourceId | null;
  /** Declared SLA in days from the record's own `createdAt`. Never random. */
  slaDays: number | null;
  priority: 'critical' | 'high' | 'normal';
  /** Who must act: the brand supplies information, Mercenta decides. */
  owner: 'brand' | 'mercenta_ops';
  /** Plain-language action the owner must take. */
  actionLabel: string;
}

export const COMMERCIAL_WORK_BY_ROUTE: Record<CommercialViabilityRoute, CommercialWorkDefinition> = {
  ready: {
    source: null,
    slaDays: null,
    priority: 'normal',
    owner: 'mercenta_ops',
    actionLabel: 'Proceed to the next declared readiness stage.',
  },
  remediation: {
    source: 'commercial_remediation',
    slaDays: 14,
    priority: 'high',
    owner: 'brand',
    actionLabel: 'Supply the missing commercial information so the product can be reassessed.',
  },
  blocked: {
    source: 'commercial_review',
    slaDays: 7,
    priority: 'critical',
    owner: 'mercenta_ops',
    actionLabel: 'Decide what happens to a product whose observed economics or volume genuinely do not work.',
  },
  human_review: {
    source: 'commercial_review',
    slaDays: 7,
    priority: 'high',
    owner: 'mercenta_ops',
    actionLabel: 'Decide the commercial question the deterministic gate is not entitled to answer.',
  },
};

/** The declared commercial work source ids — pinned by the validator. */
export const COMMERCIAL_WORK_SOURCE_IDS: readonly CommercialWorkSourceId[] = [
  'commercial_remediation',
  'commercial_review',
] as const;

/* ── §18 — BRAND-FACING GUIDANCE ("never make the brand know something
 *          Mercenta can teach them") ────────────────────────────────────────
 *
 * The brand sees the SAME evaluated conditions as the founder, explained in
 * business language with the action it must take. Only the customer-facing
 * explanation is exposed — never internal BI scores, internal risk notes or
 * founder-only intelligence.
 *
 * `articleId` references a REAL article in the existing Knowledge Base
 * (`src/data/knowledgeBase.ts`), and `academyStage` reuses the Phase 1
 * educational-gap curriculum seam (`src/config/ukMarketFit.ts`), so the future
 * Academy (Phase 4) starts from a real gap rather than a new taxonomy.
 */

export interface CommercialBrandGuidance {
  /** What the term/concept actually is, in plain language. */
  what: string;
  /** Why Mercenta needs it. */
  why: string;
  /** Exactly what the brand should do. */
  action: string;
  /** The existing Knowledge Base article that explains it. */
  articleId: string;
  /** The Academy stage that will teach it (Phase 4 seam). */
  academyStage: 1 | 2 | 3 | 4 | 5;
}

export const COMMERCIAL_BRAND_TERM_GUIDANCE: Record<CommercialTermFieldId, CommercialBrandGuidance> = {
  rrp: {
    what: 'The recommended retail price is the price you suggest the product should sell for.',
    why: 'It tells Mercenta what the product is expected to sell for, so the commercial picture can be assessed.',
    action: 'Provide the recommended retail price, in pounds.',
    articleId: 'kb-catalog',
    academyStage: 2,
  },
  wholesale_cost: {
    what: 'The wholesale/cost price is what the product costs Mercenta to acquire from you, per unit.',
    why: 'Without your cost price no commercial assessment of the opportunity is possible.',
    action: 'Provide your wholesale/cost price per unit, and say whether it is an actual figure or an estimate.',
    articleId: 'kb-catalog',
    academyStage: 2,
  },
  expected_uk_retail: {
    what: 'The expected UK retail price is what the product is expected to sell for in the UK channel.',
    why: 'The expected selling price drives the commercial assessment; it is not a guaranteed price.',
    action: 'Provide the expected UK selling price per unit and the evidence behind it.',
    articleId: 'kb-catalog',
    academyStage: 2,
  },
  currency: {
    what: 'The settlement currency is the currency your commercial terms are expressed in.',
    why: 'Mercenta never assumes a currency, so it must be stated.',
    action: 'State the currency your prices are quoted in (for example GBP).',
    articleId: 'kb-guidance',
    academyStage: 2,
  },
  unit_economics: {
    what: 'Unit economics is what is left per unit once the product cost and per-unit costs are taken out of the selling price.',
    why: 'It shows whether the product can work commercially before anyone commits to it.',
    action: 'Nothing to supply — Mercenta calculates this from your prices once they are provided.',
    articleId: 'kb-catalog',
    academyStage: 2,
  },
  moq: {
    what: 'Your minimum order quantity (MOQ) is the smallest number of units you will produce or supply in one order.',
    why: 'It tells Mercenta the smallest viable order. It is not the same thing as a purchase-order quantity.',
    action: 'Provide your minimum order quantity in units.',
    articleId: 'kb-catalog',
    academyStage: 2,
  },
  case_pack: {
    what: 'The case pack is how many sellable units go into one case.',
    why: 'Mercenta needs it to plan handling, storage and shipment quantities accurately.',
    action: 'Provide the number of units in one case.',
    articleId: 'kb-catalog',
    academyStage: 3,
  },
  master_carton: {
    what: 'A master carton is the shipping box — how many cases go into one carton, and therefore how many units.',
    why: 'Carton quantities determine freight and handling, and the pack arithmetic must add up.',
    action: 'Provide how many cases fit in one master carton.',
    articleId: 'kb-catalog',
    academyStage: 3,
  },
  production_lead_time: {
    what: 'Production lead time is how long it takes you to produce the order after it is placed.',
    why: 'It determines whether you can meet a supply window.',
    action: 'Provide your production lead time in days.',
    articleId: 'kb-shipments',
    academyStage: 3,
  },
  supply_capacity: {
    what: 'Supply capacity is how many units you can supply in a given period.',
    why: 'Mercenta compares it with the expected demand so a supply plan is realistic.',
    action: 'Provide how many units you can supply per month.',
    articleId: 'kb-catalog',
    academyStage: 3,
  },
};

export const COMMERCIAL_BRAND_CONDITION_GUIDANCE: Record<CommercialConditionId, CommercialBrandGuidance> = {
  required_terms_present: {
    what: 'Some of the commercial information Mercenta needs is not on your product yet.',
    why: 'Mercenta cannot assess the commercial opportunity until every required detail is present.',
    action: 'Add the missing details listed next to this item and submit them for reassessment.',
    articleId: 'kb-catalog',
    academyStage: 2,
  },
  terms_are_evaluable: {
    what: 'A figure is currently recorded as an assumption rather than as evidence.',
    why: 'An assumed figure cannot be treated as fact, so the assessment cannot rest on it.',
    action: 'Confirm the figure and the evidence behind it — for example a price list or a quote.',
    articleId: 'kb-catalog',
    academyStage: 2,
  },
  economics_supportive: {
    what: 'At the current prices the product does not leave a positive amount per unit.',
    why: 'A negative contribution per unit means the product cannot work commercially as priced.',
    action: 'Review your cost and expected selling prices. If they are already correct, Mercenta will review it with you.',
    articleId: 'kb-catalog',
    academyStage: 2,
  },
  moq_supports_intended_volume: {
    what: 'Your minimum order quantity is larger than the quantity Mercenta intends to order.',
    why: 'An order below your MOQ cannot be placed, so the commercial route cannot proceed as it stands.',
    action: 'Confirm your MOQ, or ask Mercenta to review the intended order quantity with you.',
    articleId: 'kb-catalog',
    academyStage: 2,
  },
  pack_mathematics_valid: {
    what: 'The case pack and master carton quantities do not add up consistently.',
    why: 'Incorrect pack quantities cause errors in handling, freight and shipment paperwork.',
    action: 'Correct the case pack and carton quantities so they are consistent.',
    articleId: 'kb-catalog',
    academyStage: 3,
  },
  supply_capacity_supports_demand: {
    what: 'The declared supply capacity does not cover the expected demand.',
    why: 'If you cannot supply the expected volume, the commercial plan cannot be met.',
    action: 'Confirm your supply capacity, or ask Mercenta to review the expected volume with you.',
    articleId: 'kb-catalog',
    academyStage: 3,
  },
  lead_time_within_agreed_limit: {
    what: 'Your production lead time has not yet been agreed against a limit.',
    why: 'Mercenta does not apply a universal lead-time rule; the limit has to be agreed.',
    action: 'Provide your production lead time so Mercenta can agree a limit with you.',
    articleId: 'kb-shipments',
    academyStage: 3,
  },
};

/** The route-level brand-facing outcome, in customer language. */
export const COMMERCIAL_BRAND_ROUTE_GUIDANCE: Record<
  CommercialViabilityRoute,
  { headline: string; explanation: string }
> = {
  ready: {
    headline: 'Commercially ready',
    explanation:
      'The commercial information for this product is complete and the checks pass. It can move on to the next readiness stage.',
  },
  remediation: {
    headline: 'Information needed',
    explanation:
      'Mercenta needs a few more commercial details from you. Add them and the product is reassessed.',
  },
  blocked: {
    headline: 'Not commercially viable as it stands',
    explanation:
      'On the information provided, this product does not work commercially. It cannot be presented as an opportunity until that changes.',
  },
  human_review: {
    headline: 'With Mercenta for review',
    explanation:
      'A commercial question on this product needs a decision from the Mercenta team rather than an automatic answer.',
  },
};

/** §16 — the wording rule that governs every brand-facing commercial sentence. */
export const COMMERCIAL_BRAND_OUTCOME_DISCLAIMER =
  'Commercial readiness is a statement about the information Mercenta holds, not a promise of a purchase order, sales, demand or a margin. Being ready does not guarantee an order.';

/** §21 — the canonical events the Phase 2 readiness lifecycle emits. */
export const COMMERCIAL_READINESS_EVENT_TYPES = [
  'commercial_readiness_assessed',
  'commercial_readiness_reassessed',
  'commercial_readiness_terms_submitted',
] as const;

export type CommercialReadinessEventType = (typeof COMMERCIAL_READINESS_EVENT_TYPES)[number];