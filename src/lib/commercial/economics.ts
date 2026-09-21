/**
 * §Phase 2 §16/§19 — THE DETERMINISTIC COMMERCIAL CALCULATOR.
 *
 * Pure functions only. There is NO AI here and there never will be: the
 * commercial arithmetic is deterministic, explainable and reproducible, so a
 * founder can see exactly which value came from where and which assumption was
 * used.
 *
 * DISCIPLINE THIS MODULE ENFORCES:
 *   - every output states its `formula` — a number is never a black box;
 *   - every input carries its basis (actual / observed / calculated / estimated
 *     / assumed / unknown);
 *   - a missing input produces an EXPLICIT `missingInputs` entry and a null
 *     result — never a zero, never a guess;
 *   - NO VAT is computed: the production treatment is undecided
 *     (`src/config/commercial.ts → VAT_TREATMENT_CONFIGURED = false`), so this
 *     module declares `vatApplied: false` rather than inventing a tax figure;
 *   - the pack arithmetic is validated against the DECLARED rule
 *     (`PACK_MATHS_RULE`), so "6 units/case × 4 cases/carton = 24" is provable.
 *
 * It reuses the existing canonical arithmetic where the concept is the SAME: the
 * brand commercial-relationship models stay in
 * `src/lib/finance/commercialModel.ts` and are NOT re-implemented here (that
 * module answers "what does Mercenta earn on this brand relationship"; this one
 * answers "does this PRODUCT's unit economics work").
 */
import type { CommercialTermValue, PackProfile } from '@/types';
import {
  COMMERCIAL_TERM_FIELDS,
  MOQ_HONOUR_DISCLAIMER,
  PACK_MATHS_RULE,
  PACK_MATHS_WORKED_EXAMPLE,
  type CommercialTermFieldId,
  type CommercialValueBasis,
} from '@/config/commercialReadiness';
import type { ConfidenceLevel } from '@/types';

/** Money is rounded to pennies in ONE place, so no surface can round differently. */
function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

const termField = (id: CommercialTermFieldId) => COMMERCIAL_TERM_FIELDS.find((f) => f.id === id)!;

/**
 * Build ONE canonical term value. The basis is REQUIRED — a value can never be
 * recorded without stating what kind of value it is.
 */
export function commercialTermValue(input: {
  field: CommercialTermFieldId;
  value: number | string | null;
  basis: CommercialValueBasis;
  source?: string | null;
  observedAt?: string | null;
  confidence?: ConfidenceLevel;
  note?: string | null;
}): CommercialTermValue {
  const def = termField(input.field);
  return {
    field: def.id,
    label: def.label,
    value: input.value,
    unit: def.unit,
    basis: input.basis,
    source: input.source ?? null,
    observedAt: input.observedAt ?? null,
    confidence:
      input.confidence ??
      (input.basis === 'actual' ? 'high' : input.basis === 'observed' ? 'medium' : 'low'),
    note: input.note ?? null,
  };
}

/** The term values that are required before the gate may ever reach `ready`. */
export function missingRequiredTermFields(
  terms: readonly CommercialTermValue[]
): CommercialTermFieldId[] {
  const present = new Set(
    terms.filter((t) => t.value !== null && t.value !== '').map((t) => t.field)
  );
  return COMMERCIAL_TERM_FIELDS.filter((f) => f.required && !present.has(f.id)).map((f) => f.id);
}

/** The recorded values whose basis cannot support a `ready` route. */
export function unevaluableTermFields(
  terms: readonly CommercialTermValue[]
): CommercialTermFieldId[] {
  return terms
    .filter((t) => t.value !== null && (t.basis === 'assumed' || t.basis === 'unknown'))
    .map((t) => t.field);
}

/* ── §17 — pack mathematics (first-class, validated) ──────────────────────── */

export interface PackProfileInput {
  brandMoq?: number | null;
  productionMoq?: number | null;
  casePack?: number | null;
  casesPerCarton?: number | null;
  poQuantity?: number | null;
  shipmentQuantity?: number | null;
  cartonsPerPallet?: number | null;
}

/**
 * Build the canonical pack profile and VALIDATE the carton arithmetic.
 *
 * The error this prevents: treating brand MOQ, production MOQ and PO quantity as
 * interchangeable, or reporting a master-carton size that the case arithmetic
 * does not actually produce.
 */
export function buildPackProfile(input: PackProfileInput): PackProfile {
  const casePack = input.casePack ?? null;
  const casesPerCarton = input.casesPerCarton ?? null;
  const bothPresent = casePack !== null && casesPerCarton !== null;
  const unitsPerMasterCarton = bothPresent ? casePack * casesPerCarton : null;

  const issues: string[] = [];
  if (casePack !== null && casePack <= 0) {
    issues.push('Case pack must be a positive whole number of units.');
  }
  if (casesPerCarton !== null && casesPerCarton <= 0) {
    issues.push('Cases per carton must be a positive whole number.');
  }
  if (casePack !== null && !Number.isInteger(casePack)) {
    issues.push('Case pack must be a whole number of units.');
  }
  if (casesPerCarton !== null && !Number.isInteger(casesPerCarton)) {
    issues.push('Cases per carton must be a whole number.');
  }
  if (input.brandMoq != null && input.brandMoq <= 0) {
    issues.push('A brand MOQ must be greater than zero.');
  }
  if (input.productionMoq != null && input.productionMoq <= 0) {
    issues.push('A production MOQ must be greater than zero.');
  }
  if (input.poQuantity != null && input.brandMoq != null && input.poQuantity < input.brandMoq) {
    issues.push(
      'The PO quantity is below the brand MOQ, so the brand MOQ is not met by the current order quantity. A PO quantity is a commercial decision and is never assumed to satisfy an MOQ.'
    );
  }

  return {
    brandMoq: input.brandMoq ?? null,
    productionMoq: input.productionMoq ?? null,
    casePack,
    casesPerCarton,
    unitsPerMasterCarton,
    poQuantity: input.poQuantity ?? null,
    shipmentQuantity: input.shipmentQuantity ?? null,
    cartonsPerPallet: input.cartonsPerPallet ?? null,
    valid: issues.length === 0 && bothPresent,
    issue:
      issues.length > 0
        ? issues.join(' ')
        : bothPresent
          ? null
          : 'The carton arithmetic cannot be validated until the case pack and cases per carton are both recorded.',
    rule: PACK_MATHS_RULE,
  };
}

/** The declared worked example, computed — 6 × 4 = 24. Pinned by the validator. */
export function packMathsWorkedExample(): PackProfile {
  return buildPackProfile({
    casePack: PACK_MATHS_WORKED_EXAMPLE.casePack,
    casesPerCarton: PACK_MATHS_WORKED_EXAMPLE.casesPerCarton,
  });
}

/** §17 — the disclaimer that must accompany any MOQ presentation. */
export const PACK_MOQ_DISCLAIMER = MOQ_HONOUR_DISCLAIMER;

/* ── §16 — unit economics (explainable, never a black box) ────────────────── */

export interface UnitEconomicsInput {
  /** What the product is expected to sell for in the UK channel. */
  expectedUkRetailGbp: number | null;
  /** What Mercenta pays the brand per unit. */
  wholesaleCostGbp: number | null;
  /** Declared per-unit logistics cost, when known (Phase 3 supplies the real figure). */
  perUnitLogisticsCostGbp?: number | null;
  /** Declared per-unit channel cost. */
  perUnitChannelCostGbp?: number | null;
}

export interface UnitEconomicsResult {
  /** False when the arithmetic could not run at all — never a silently-zero result. */
  evaluated: boolean;
  unevaluableReason: string | null;
  retailGbp: number | null;
  acquisitionGbp: number | null;
  variableCostsGbp: number | null;
  /** retail − acquisition − variable costs, per unit. */
  contributionGbp: number | null;
  /** contribution ÷ retail, as a percentage. Null when retail is zero/absent. */
  contributionPct: number | null;
  /** Every input that was required and is not present. */
  missingInputs: string[];
  /** The declared assumptions this calculation rests on. */
  assumptions: string[];
  /** The full formula, so the figure can be checked by hand. */
  formula: string;
  /** DECLARED: no VAT figure is computed (the production treatment is undecided). */
  vatApplied: false;
}

/**
 * Compute the product's unit economics deterministically.
 *
 * A missing required input yields `evaluated: false` with the reason — the
 * caller must route to remediation/human review, never treat it as zero margin.
 */
export function computeUnitEconomics(input: UnitEconomicsInput): UnitEconomicsResult {
  const missingInputs: string[] = [];
  if (input.expectedUkRetailGbp === null || input.expectedUkRetailGbp === undefined) {
    missingInputs.push('expected_uk_retail');
  }
  if (input.wholesaleCostGbp === null || input.wholesaleCostGbp === undefined) {
    missingInputs.push('wholesale_cost');
  }

  if (missingInputs.length > 0) {
    return {
      evaluated: false,
      unevaluableReason: `Unit economics cannot be computed without: ${missingInputs.join(', ')}.`,
      retailGbp: null,
      acquisitionGbp: null,
      variableCostsGbp: null,
      contributionGbp: null,
      contributionPct: null,
      missingInputs,
      assumptions: [],
      formula: 'Not computed — required commercial terms are missing.',
      vatApplied: false,
    };
  }

  const retail = round2(input.expectedUkRetailGbp as number);
  const acquisition = round2(input.wholesaleCostGbp as number);
  const logistics = round2(input.perUnitLogisticsCostGbp ?? 0);
  const channel = round2(input.perUnitChannelCostGbp ?? 0);
  const variableCosts = round2(logistics + channel);
  const contribution = round2(retail - acquisition - variableCosts);
  const contributionPct = retail === 0 ? null : round2((contribution / retail) * 100);

  const assumptions: string[] = [];
  if (input.perUnitLogisticsCostGbp == null) {
    assumptions.push(
      'Per-unit logistics cost is not recorded and is treated as £0.00 for this calculation only — it is not asserted to be zero.'
    );
  }
  if (input.perUnitChannelCostGbp == null) {
    assumptions.push(
      'Per-unit channel cost is not recorded and is treated as £0.00 for this calculation only — it is not asserted to be zero.'
    );
  }

  return {
    evaluated: true,
    unevaluableReason: null,
    retailGbp: retail,
    acquisitionGbp: acquisition,
    variableCostsGbp: variableCosts,
    contributionGbp: contribution,
    contributionPct,
    missingInputs,
    assumptions,
    formula: `£${retail.toFixed(2)} expected UK retail − £${acquisition.toFixed(
      2
    )} acquisition − £${variableCosts.toFixed(2)} variable costs = £${contribution.toFixed(
      2
    )} contribution per unit${contributionPct === null ? '' : ` (${contributionPct}% of retail)`}.`,
    vatApplied: false,
  };
}

/* ── §20 — commercial ↔ supply interaction (system conditions) ────────────── */

export type SupplyCommercialConditionKind =
  | 'low_unit_economics_with_expensive_route'
  | 'viable_economics_with_excessive_lead_time'
  | 'attractive_product_with_excessive_moq'
  | 'strong_demand_with_insufficient_capacity'
  | 'viable_margin_with_unacceptable_variability';

export interface SupplyCommercialObservation {
  kind: SupplyCommercialConditionKind;
  detected: boolean;
  /** The observed values behind the finding — never a bare verdict. */
  observed: string;
  /** True when this condition must be surfaced even if nothing else is wrong. */
  requiresAttention: boolean;
}

export interface SupplyCommercialInput {
  unitEconomics: UnitEconomicsResult;
  /** Carrier/freight cost per unit, when a route has been priced. */
  perUnitFreightCostGbp?: number | null;
  /** The declared planning lead time from the SupplyProfile. */
  planningLeadTimeDays?: number | null;
  /** A lead-time limit is only applied when the BUSINESS has agreed one. */
  agreedMaxLeadTimeDays?: number | null;
  brandMoq?: number | null;
  /** The quantity the business intends to order. */
  intendedOrderQuantity?: number | null;
  /** What demand is projected to need. */
  projectedDemandUnits?: number | null;
  /** What the brand has declared it can supply. */
  declaredSupplyCapacityUnits?: number | null;
  supplyVariability?: 'low' | 'medium' | 'high' | 'unknown';
}

/**
 * Detect the §20 SYSTEM conditions — where commercial economics and the
 * SupplyProfile interact. These are deliberately NOT collapsed into one score:
 * each condition is reported separately, with the values that produced it.
 */
export function detectSupplyCommercialConditions(
  input: SupplyCommercialInput
): SupplyCommercialObservation[] {
  const observations: SupplyCommercialObservation[] = [];
  const { unitEconomics } = input;

  const expensiveRoute =
    input.perUnitFreightCostGbp != null &&
    unitEconomics.contributionGbp != null &&
    input.perUnitFreightCostGbp > Math.max(unitEconomics.contributionGbp, 0);
  observations.push({
    kind: 'low_unit_economics_with_expensive_route',
    detected: expensiveRoute,
    observed:
      input.perUnitFreightCostGbp == null || unitEconomics.contributionGbp == null
        ? 'Not evaluated — the freight cost or the unit contribution is not recorded.'
        : `Freight £${input.perUnitFreightCostGbp.toFixed(2)}/unit against a contribution of £${unitEconomics.contributionGbp.toFixed(2)}/unit.`,
    requiresAttention: expensiveRoute,
  });

  const excessiveLeadTime =
    input.planningLeadTimeDays != null &&
    input.agreedMaxLeadTimeDays != null &&
    input.planningLeadTimeDays > input.agreedMaxLeadTimeDays;
  observations.push({
    kind: 'viable_economics_with_excessive_lead_time',
    detected: excessiveLeadTime,
    observed:
      input.planningLeadTimeDays == null
        ? 'Not evaluated — no planning lead time is recorded.'
        : input.agreedMaxLeadTimeDays == null
          ? `Planning lead time ${input.planningLeadTimeDays} days, but NO agreed maximum exists — a universal lead-time rule is not invented, so this routes to human review.`
          : `Planning lead time ${input.planningLeadTimeDays} days against an agreed maximum of ${input.agreedMaxLeadTimeDays} days.`,
    requiresAttention: input.planningLeadTimeDays != null && input.agreedMaxLeadTimeDays == null,
  });

  const excessiveMoq =
    input.brandMoq != null &&
    input.intendedOrderQuantity != null &&
    input.intendedOrderQuantity < input.brandMoq;
  observations.push({
    kind: 'attractive_product_with_excessive_moq',
    detected: excessiveMoq,
    observed:
      input.brandMoq == null || input.intendedOrderQuantity == null
        ? 'Not evaluated — the brand MOQ or the intended order quantity is not recorded.'
        : `Brand MOQ ${input.brandMoq} units against an intended order of ${input.intendedOrderQuantity} units.`,
    requiresAttention: excessiveMoq,
  });

  const insufficientCapacity =
    input.projectedDemandUnits != null &&
    input.declaredSupplyCapacityUnits != null &&
    input.declaredSupplyCapacityUnits < input.projectedDemandUnits;
  observations.push({
    kind: 'strong_demand_with_insufficient_capacity',
    detected: insufficientCapacity,
    observed:
      input.projectedDemandUnits == null || input.declaredSupplyCapacityUnits == null
        ? 'Not evaluated — the projected demand or the declared supply capacity is not recorded.'
        : `Declared capacity ${input.declaredSupplyCapacityUnits} units against projected demand ${input.projectedDemandUnits} units.`,
    requiresAttention: insufficientCapacity,
  });

  const unacceptableVariability =
    input.supplyVariability === 'high' &&
    unitEconomics.contributionPct !== null &&
    unitEconomics.contributionPct > 0;
  observations.push({
    kind: 'viable_margin_with_unacceptable_variability',
    detected: unacceptableVariability,
    observed: `Declared supply variability: ${input.supplyVariability ?? 'unknown'}${
      unitEconomics.contributionPct === null
        ? ''
        : `, contribution ${unitEconomics.contributionPct}% of retail`
    }.`,
    requiresAttention: unacceptableVariability,
  });

  return observations;
}