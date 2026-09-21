/**
 * §Phase 2 §18/§19 — THE COMMERCIAL VIABILITY GATE.
 *
 * This module turns the DECLARED commercial conditions
 * (`src/config/commercialReadiness.ts → COMMERCIAL_CONDITIONS`) into ONE
 * exclusive-gateway evaluation using the deterministic calculator
 * (`src/lib/commercial/economics.ts`) and the routing evaluators
 * (`src/lib/routing/gateways.ts`).
 *
 * WHAT IT IS NOT
 * --------------
 * - It is NOT a score. There is no "commercial score" and no "overall
 *   opportunity score": the output is a ROUTE plus the evaluated conditions.
 * - It is NOT AI-derived. Every figure comes from the deterministic calculator,
 *   and every condition states the rule and the value it observed.
 * - It is NOT a second opportunity model. It REFERENCES the Phase 1 entities by
 *   id (`assessmentId`, `supplyProfileId`, `productOpportunityId`).
 * - It is NOT a channel claim. An MOQ is reported with its disclaimer; no
 *   channel is implied to honour it.
 *
 * THREE INDICATORS STAY SEPARATE (§15)
 * ------------------------------------
 * Catalogue eligibility, commercial opportunity and supply/replenishment
 * viability remain the Phase 1 indicators. This gate adds a FOURTH, distinct
 * concept — commercial READINESS — and never merges them into one verdict.
 */
import type {
  CommercialReadinessRecord,
  CommercialTermValue,
  PackProfile,
  RouteConditionEvaluation,
  RoutingOwner,
  RoutingSubjectRef,
  WorkflowRoutingDecision,
} from '@/types';
import {
  COMMERCIAL_CONDITIONS,
  COMMERCIAL_GATE_ID,
  COMMERCIAL_GATE_PRECEDENCE,
  COMMERCIAL_GATE_PRECEDENCE_RULE,
  COMMERCIAL_READINESS_WORKFLOW_ID,
  COMMERCIAL_THRESHOLDS,
  COMMERCIAL_VIABILITY_ROUTE_DEFINITIONS,
  COMMERCIAL_VIABILITY_ROUTE_ORDER,
  MOQ_HONOUR_DISCLAIMER,
  type CommercialConditionId,
  type CommercialTermFieldId,
  type CommercialViabilityRoute,
} from '@/config/commercialReadiness';
import {
  buildPackProfile,
  computeUnitEconomics,
  detectSupplyCommercialConditions,
  missingRequiredTermFields,
  unevaluableTermFields,
} from '@/lib/commercial/economics';
import { evaluateExclusiveGateway, type GatewayConditionInput, type GatewayRouteInput } from '@/lib/routing/gateways';

export interface CommercialViabilityInput {
  owner: RoutingOwner;
  actor: string;
  subject: RoutingSubjectRef;
  /** The Phase 1 assessment this readiness belongs to (the ONE identity). */
  assessmentId: string;
  /** The Phase 1 supply profile, by reference. */
  supplyProfileId: string;
  productOpportunityId?: string | null;
  /** §10 — the canonical product this readiness is about (never a second identity). */
  productRef?: string | null;
  /** §10 — the human product label the surface shows. */
  productLabel?: string | null;
  /** Canonical brand identity key (`normalizeBrandKey`). */
  dedupeKey: string;
  terms: readonly CommercialTermValue[];
  pack: {
    brandMoq?: number | null;
    productionMoq?: number | null;
    casePack?: number | null;
    casesPerCarton?: number | null;
    poQuantity?: number | null;
    shipmentQuantity?: number | null;
    cartonsPerPallet?: number | null;
  };
  /** Declared per-unit costs, when known. */
  perUnitLogisticsCostGbp?: number | null;
  perUnitChannelCostGbp?: number | null;
  /** The quantity the business intends to order. */
  intendedOrderQuantity?: number | null;
  /** Projected demand, when it has been projected. */
  projectedDemandUnits?: number | null;
  /** Declared supply capacity from the SupplyProfile. */
  declaredSupplyCapacityUnits?: number | null;
  /** Declared supply variability from the SupplyProfile. */
  supplyVariability?: 'low' | 'medium' | 'high' | 'unknown';
  /** Declared planning lead time from the SupplyProfile. */
  planningLeadTimeDays?: number | null;
  /** A lead-time limit applies ONLY when the business has agreed one. */
  agreedMaxLeadTimeDays?: number | null;
  /** Deterministic clock override (defaults to the pinned demo clock). */
  at?: string;
}

/** ONE declared condition, evaluated — with the route it takes when it fails. */
interface DeclaredConditionOutcome {
  evaluation: RouteConditionEvaluation;
  /** Where this condition sends the product when it is NOT satisfied. */
  unmetRoute: CommercialViabilityRoute;
  /** Where it sends the product when it cannot be evaluated at all. */
  unevaluableRoute: CommercialViabilityRoute;
}

function conditionDef(id: CommercialConditionId) {
  const def = COMMERCIAL_CONDITIONS.find((c) => c.id === id);
  if (!def) throw new Error(`Unknown declared commercial condition: ${id}`);
  return def;
}

function outcome(
  id: CommercialConditionId,
  rule: string,
  observed: string,
  expected: string,
  met: boolean | null,
  notEvaluatedReason: string | null
): DeclaredConditionOutcome {
  const def = conditionDef(id);
  return {
    evaluation: {
      id: def.id,
      label: def.label,
      rule,
      observed,
      expected,
      met: met === true,
      notEvaluatedReason: met === null ? notEvaluatedReason : null,
      routeId: met === null ? def.unevaluableRoute : def.unmetRoute,
    },
    unmetRoute: def.unmetRoute,
    unevaluableRoute: def.unevaluableRoute,
  };
}

/** Read one recorded term value by field, without inventing a default. */
function termNumber(terms: readonly CommercialTermValue[], field: string): number | null {
  const t = terms.find((x) => x.field === field);
  if (!t) return null;
  if (typeof t.value === 'number') return t.value;
  if (typeof t.value === 'string' && t.value.trim() !== '' && !Number.isNaN(Number(t.value))) {
    return Number(t.value);
  }
  return null;
}

interface EvaluatedConditions {
  conditions: DeclaredConditionOutcome[];
  pack: PackProfile;
  missingInputs: string[];
  /** The commercial FIELD ids genuinely missing — the brand's actionable list. */
  missingTermFieldIds: CommercialTermFieldId[];
  openQuestions: string[];
}

/**
 * Evaluate the DECLARED commercial conditions in their declared order. Each
 * condition carries the rule it was judged against and the value it observed, so
 * the outcome is explainable without reading this code.
 */
function evaluateCommercialConditions(input: CommercialViabilityInput): EvaluatedConditions {
  const conditions: DeclaredConditionOutcome[] = [];
  const missingInputs: string[] = [];
  const missingTermFieldIds: CommercialTermFieldId[] = [];
  const openQuestions: string[] = [];

  /* 1. required_terms_present */
  const missingRequired = missingRequiredTermFields(input.terms);
  conditions.push(
    outcome(
      'required_terms_present',
      'Every term declared REQUIRED must be present (`COMMERCIAL_TERM_FIELDS.required`).',
      missingRequired.length === 0
        ? 'All required commercial terms are present.'
        : `Missing: ${missingRequired.join(', ')}.`,
      'No required commercial term missing.',
      missingRequired.length === 0,
      null
    )
  );
  if (missingRequired.length > 0) {
    missingInputs.push(...missingRequired.map((f) => `${f} (missing)`));
    missingTermFieldIds.push(...missingRequired);
  }

  /* 2. terms_are_evaluable */
  const unevaluable = unevaluableTermFields(input.terms);
  conditions.push(
    outcome(
      'terms_are_evaluable',
      'A recorded value must carry a basis that is not `assumed` or `unknown`.',
      unevaluable.length === 0
        ? 'Every recorded value carries a usable basis.'
        : `Recorded from an assumption rather than evidence: ${unevaluable.join(', ')}.`,
      'No value resting on an assumption or an unknown.',
      unevaluable.length === 0,
      null
    )
  );
  if (unevaluable.length > 0) {
    missingInputs.push(...unevaluable.map((f) => `${f} (assumed, not evidenced)`));
    openQuestions.push(
      `Confirm the commercial terms currently recorded as assumptions: ${unevaluable.join(', ')}.`
    );
  }

  /* 3. economics_supportive */
  const unitEconomics = computeUnitEconomics({
    expectedUkRetailGbp: termNumber(input.terms, 'expected_uk_retail'),
    wholesaleCostGbp: termNumber(input.terms, 'wholesale_cost'),
    perUnitLogisticsCostGbp: input.perUnitLogisticsCostGbp ?? null,
    perUnitChannelCostGbp: input.perUnitChannelCostGbp ?? null,
  });
  const marginThreshold = COMMERCIAL_THRESHOLDS.minimum_gross_margin_pct;
  if (!unitEconomics.evaluated) {
    conditions.push(
      outcome(
        'economics_supportive',
        'Unit economics must be computable and produce a positive contribution.',
        unitEconomics.unevaluableReason ?? 'Unit economics could not be computed.',
        'A positive contribution per unit.',
        null,
        unitEconomics.unevaluableReason
      )
    );
  } else if ((unitEconomics.contributionGbp ?? 0) <= 0) {
    conditions.push(
      outcome(
        'economics_supportive',
        'Unit economics must produce a POSITIVE contribution per unit.',
        unitEconomics.formula,
        'A positive contribution per unit.',
        false,
        null
      )
    );
  } else {
    conditions.push(
      outcome(
        'economics_supportive',
        marginThreshold.configured
          ? `Contribution must also meet the agreed minimum margin (${marginThreshold.value}%).`
          : 'Unit economics must produce a POSITIVE contribution per unit. No minimum margin threshold has been agreed, so a positive contribution is reported as supportive rather than judged against an invented floor.',
        unitEconomics.formula,
        marginThreshold.configured
          ? `A positive contribution meeting ${marginThreshold.value}%.`
          : 'A positive contribution per unit.',
        true,
        null
      )
    );
  }
  if (!marginThreshold.configured) {
    openQuestions.push(
      'No minimum gross margin threshold has been agreed for this category. Mercenta reports the computed contribution and does not judge it against an invented minimum.'
    );
  }
  if (unitEconomics.assumptions.length > 0) openQuestions.push(...unitEconomics.assumptions);

  /* 4. moq_supports_intended_volume */
  const brandMoq = input.pack.brandMoq ?? null;
  const intended = input.intendedOrderQuantity ?? null;
  conditions.push(
    outcome(
      'moq_supports_intended_volume',
      'The intended order quantity must be at least the brand MOQ. A PO quantity is never assumed to satisfy an MOQ.',
      brandMoq === null || intended === null
        ? `Brand MOQ ${brandMoq ?? 'not recorded'}; intended order quantity ${intended ?? 'not recorded'}.`
        : `Brand MOQ ${brandMoq} units; intended order quantity ${intended} units.`,
      'Intended order quantity ≥ brand MOQ.',
      brandMoq === null || intended === null ? null : intended >= brandMoq,
      brandMoq === null || intended === null
        ? 'The brand MOQ and the intended order quantity must both be recorded before this condition can be judged.'
        : null
    )
  );
  if (brandMoq === null || intended === null) {
    missingInputs.push('brand MOQ and intended order quantity (one or both not recorded)');
  }
  openQuestions.push(MOQ_HONOUR_DISCLAIMER);

  /* 5. pack_mathematics_valid */
  const pack = buildPackProfile(input.pack);
  const packInputsPresent = pack.casePack !== null && pack.casesPerCarton !== null;
  conditions.push(
    outcome(
      'pack_mathematics_valid',
      pack.rule,
      packInputsPresent
        ? `Case pack ${pack.casePack} × cases per carton ${pack.casesPerCarton} = ${pack.unitsPerMasterCarton} units per master carton.${
            pack.issue ? ` ${pack.issue}` : ''
          }`
        : `Case pack ${pack.casePack ?? 'not recorded'}; cases per carton ${pack.casesPerCarton ?? 'not recorded'}.`,
      `${pack.rule}, with no contradictory quantity.`,
      packInputsPresent ? pack.valid : null,
      packInputsPresent
        ? null
        : 'The carton arithmetic cannot be validated until the case pack and cases per carton are both recorded.'
    )
  );
  if (!packInputsPresent) missingInputs.push('case pack and cases per carton');

  /* 6. supply_capacity_supports_demand */
  const capacity = input.declaredSupplyCapacityUnits ?? null;
  const demand = input.projectedDemandUnits ?? null;
  conditions.push(
    outcome(
      'supply_capacity_supports_demand',
      'Declared supply capacity must cover the projected demand — the commercial ↔ SupplyProfile interaction.',
      capacity === null || demand === null
        ? `Declared capacity ${capacity ?? 'not recorded'}; projected demand ${demand ?? 'not recorded'}.`
        : `Declared capacity ${capacity} units; projected demand ${demand} units.`,
      'Declared capacity ≥ projected demand.',
      capacity === null || demand === null ? null : capacity >= demand,
      capacity === null || demand === null
        ? 'Both the declared supply capacity and the projected demand must be recorded before this condition can be judged.'
        : null
    )
  );
  if (capacity === null || demand === null) {
    missingInputs.push('projected demand and declared supply capacity (one or both not recorded)');
  }

  /* 7. lead_time_within_agreed_limit */
  const leadTime = input.planningLeadTimeDays ?? null;
  const agreedMax = input.agreedMaxLeadTimeDays ?? null;
  conditions.push(
    outcome(
      'lead_time_within_agreed_limit',
      'Planning lead time must be inside an AGREED limit. With no agreed limit, no universal rule is invented.',
      leadTime === null
        ? 'No planning lead time is recorded.'
        : agreedMax === null
          ? `Planning lead time ${leadTime} days; the business has not agreed a maximum lead time.`
          : `Planning lead time ${leadTime} days against an agreed maximum of ${agreedMax} days.`,
      'Planning lead time ≤ the agreed maximum.',
      leadTime === null || agreedMax === null ? null : leadTime <= agreedMax,
      leadTime === null
        ? 'No planning lead time is recorded.'
        : agreedMax === null
          ? 'No maximum planning lead time has been agreed, so this condition cannot be judged and is routed to human review. A universal lead-time limit is deliberately NOT invented (Phase 3 owns the Supply Route Profile).'
          : null
    )
  );
  if (leadTime === null || agreedMax === null) {
    missingInputs.push('planning lead time and an AGREED maximum lead time (one or both not recorded)');
  }

  return { conditions, pack, missingInputs, missingTermFieldIds, openQuestions };
}

/* ── §18 — the declared precedence ladder ────────────────────────────────── */

export interface CommercialRouteSelection {
  route: CommercialViabilityRoute;
  reason: string;
  /** The conditions that produced the route, in declared order. */
  drivingConditionIds: CommercialConditionId[];
}

/**
 * Apply the DECLARED precedence ladder (`COMMERCIAL_GATE_PRECEDENCE`) to the
 * evaluated conditions. Exactly one route results, so the exclusive gateway is
 * given mutually exclusive conditions rather than an ambiguity to resolve.
 */
export function commercialRouteFor(
  conditions: readonly DeclaredConditionOutcome[]
): CommercialRouteSelection {
  // The ladder is DECLARED (`COMMERCIAL_GATE_PRECEDENCE`): walk it in order and
  // take the FIRST route whose declared test applies. Changing the declared order
  // therefore changes the business behaviour — which is exactly why it is declared
  // in the config rather than hard-coded here.
  for (const route of COMMERCIAL_GATE_PRECEDENCE) {
    if (route === 'human_review') {
      const notEvaluable = conditions.filter((c) => c.evaluation.notEvaluatedReason !== null);
      if (notEvaluable.length > 0) {
        return {
          route: 'human_review',
          reason: `${notEvaluable.length} declared condition(s) could not be evaluated, so the gate fails closed: ${notEvaluable
            .map((c) => c.evaluation.id)
            .join(', ')}.`,
          drivingConditionIds: notEvaluable.map((c) => c.evaluation.id as CommercialConditionId),
        };
      }
      continue;
    }
    if (route === 'blocked') {
      const blocked = conditions.filter(
        (c) => !c.evaluation.met && c.evaluation.notEvaluatedReason === null && c.unmetRoute === 'blocked'
      );
      if (blocked.length > 0) {
        return {
          route: 'blocked',
          reason: `Definitively unmet by the observed values: ${blocked
            .map((c) => c.evaluation.id)
            .join(', ')}.`,
          drivingConditionIds: blocked.map((c) => c.evaluation.id as CommercialConditionId),
        };
      }
      continue;
    }
    if (route === 'remediation') {
      const unmet = conditions.filter(
        (c) => !c.evaluation.met && c.evaluation.notEvaluatedReason === null
      );
      if (unmet.length > 0) {
        return {
          route: 'remediation',
          reason: `Fixable gap(s): ${unmet.map((c) => c.evaluation.id).join(', ')}.`,
          drivingConditionIds: unmet.map((c) => c.evaluation.id as CommercialConditionId),
        };
      }
      continue;
    }
    // 'ready' — reached only when every declared condition above was satisfied.
    return {
      route: 'ready',
      reason: 'Every declared commercial condition is satisfied.',
      drivingConditionIds: [],
    };
  }

  // Unreachable given the declared ladder, but never returns a silent success.
  return {
    route: 'human_review',
    reason:
      'The declared commercial precedence ladder contains no route this gate can act on, so the case is parked for a human rather than guessed.',
    drivingConditionIds: [],
  };
}

/* ── The public gate ─────────────────────────────────────────────────────── */

export interface CommercialViabilityEvaluation {
  /** The canonical routing decision. Record it with `recordRoutingDecision`. */
  decision: WorkflowRoutingDecision;
  /** The route the gate selected; null only if the gateway itself refused. */
  route: CommercialViabilityRoute | null;
  refused: boolean;
  routeReason: string;
  /** The SEVEN declared conditions, each with its rule and its observed value. */
  conditions: RouteConditionEvaluation[];
  pack: PackProfile;
  supplyObservations: ReturnType<typeof detectSupplyCommercialConditions>;
  missingInputs: string[];
  openQuestions: string[];
  moqDisclaimer: string;
  nextStep: string;
  /** The canonical readiness record (persisted by the Phase 2 readiness store). */
  record: CommercialReadinessRecord;
}

/**
 * Evaluate the commercial viability gate for ONE product readiness case.
 *
 * It runs the seven declared conditions deterministically, applies the declared
 * precedence ladder, and hands the result to the EXCLUSIVE gateway evaluator so
 * the decision is recorded, audited and idempotent exactly like any other route.
 */
export function evaluateCommercialViability(
  input: CommercialViabilityInput
): CommercialViabilityEvaluation {
  const evaluated = evaluateCommercialConditions(input);
  const selection = commercialRouteFor(evaluated.conditions);

  // §20 — the commercial ↔ SupplyProfile interaction, reported SEPARATELY.
  const unitEconomics = computeUnitEconomics({
    expectedUkRetailGbp: termNumber(input.terms, 'expected_uk_retail'),
    wholesaleCostGbp: termNumber(input.terms, 'wholesale_cost'),
    perUnitLogisticsCostGbp: input.perUnitLogisticsCostGbp ?? null,
    perUnitChannelCostGbp: input.perUnitChannelCostGbp ?? null,
  });
  const supplyObservations = detectSupplyCommercialConditions({
    unitEconomics,
    perUnitFreightCostGbp: input.perUnitLogisticsCostGbp ?? null,
    planningLeadTimeDays: input.planningLeadTimeDays ?? null,
    agreedMaxLeadTimeDays: input.agreedMaxLeadTimeDays ?? null,
    brandMoq: input.pack.brandMoq ?? null,
    intendedOrderQuantity: input.intendedOrderQuantity ?? null,
    projectedDemandUnits: input.projectedDemandUnits ?? null,
    declaredSupplyCapacityUnits: input.declaredSupplyCapacityUnits ?? null,
    supplyVariability: input.supplyVariability ?? 'unknown',
  });

  // ONE condition per route, exactly one of which holds — so the exclusive
  // gateway never faces a genuine ambiguity.
  const routeInputs: GatewayRouteInput[] = COMMERCIAL_VIABILITY_ROUTE_ORDER.map((route) => ({
    routeId: route,
    label: COMMERCIAL_VIABILITY_ROUTE_DEFINITIONS[route].label,
    action: COMMERCIAL_VIABILITY_ROUTE_DEFINITIONS[route].description,
    // Existing admin destinations; the Phase 2 surface wiring is a later stage.
    destination: route === 'ready' ? 'catalog' : 'control_centre',
  }));
  const ladderConditions: GatewayConditionInput[] = COMMERCIAL_VIABILITY_ROUTE_ORDER.map(
    (route) => ({
      id: `commercial_route_${route}`,
      label: `${COMMERCIAL_VIABILITY_ROUTE_DEFINITIONS[route].label} route applies`,
      rule: COMMERCIAL_GATE_PRECEDENCE_RULE,
      observed:
        selection.route === route ? selection.reason : `Not the selected route: ${selection.route} applies.`,
      expected: COMMERCIAL_VIABILITY_ROUTE_DEFINITIONS[route].label,
      met: selection.route === route,
      routeId: route,
    })
  );

  const decision = evaluateExclusiveGateway({
    workflowId: COMMERCIAL_READINESS_WORKFLOW_ID,
    gatewayId: COMMERCIAL_GATE_ID,
    subject: input.subject,
    owner: input.owner,
    actor: input.actor,
    routes: routeInputs,
    conditions: ladderConditions,
    at: input.at,
  });

  const route: CommercialViabilityRoute | null = decision.refused
    ? null
    : ((decision.selectedRouteIds[0] as CommercialViabilityRoute) ?? null);
  const effectiveRoute: CommercialViabilityRoute = route ?? 'human_review';
  const definition = COMMERCIAL_VIABILITY_ROUTE_DEFINITIONS[effectiveRoute];

  const missingInputs = [...new Set(evaluated.missingInputs)];
  const openQuestions = [
    ...new Set([
      ...evaluated.openQuestions,
      ...supplyObservations
        .filter((o) => o.requiresAttention)
        .map((o) => `${o.observed} (${o.kind})`),
    ]),
  ];

  const record: CommercialReadinessRecord = {
    id: `commercial-readiness-${input.assessmentId}`,
    owner: input.owner,
    assessmentId: input.assessmentId,
    productOpportunityId: input.productOpportunityId ?? null,
    productRef: input.productRef ?? null,
    productLabel: input.productLabel ?? null,
    supplyProfileId: input.supplyProfileId,
    dedupeKey: input.dedupeKey,
    terms: [...input.terms],
    pack: evaluated.pack,
    conditions: evaluated.conditions.map((c) => c.evaluation),
    route: effectiveRoute,
    refused: decision.refused,
    refusalReason: decision.refusalReason,
    routingDecisionId: decision.id,
    missingInputs,
    missingTermFieldIds: [...new Set(evaluated.missingTermFieldIds)],
    openQuestions,
    assessmentInput: {
      perUnitLogisticsCostGbp: input.perUnitLogisticsCostGbp ?? null,
      perUnitChannelCostGbp: input.perUnitChannelCostGbp ?? null,
      intendedOrderQuantity: input.intendedOrderQuantity ?? null,
      projectedDemandUnits: input.projectedDemandUnits ?? null,
      declaredSupplyCapacityUnits: input.declaredSupplyCapacityUnits ?? null,
      supplyVariability: input.supplyVariability ?? 'unknown',
      planningLeadTimeDays: input.planningLeadTimeDays ?? null,
      agreedMaxLeadTimeDays: input.agreedMaxLeadTimeDays ?? null,
    },
    moqDisclaimer: MOQ_HONOUR_DISCLAIMER,
    nextStep: definition.nextStep,
    createdAt: decision.createdAt,
    updatedAt: decision.updatedAt,
  };

  return {
    decision,
    route,
    refused: decision.refused,
    routeReason: selection.reason,
    conditions: evaluated.conditions.map((c) => c.evaluation),
    pack: evaluated.pack,
    supplyObservations,
    missingInputs,
    openQuestions,
    moqDisclaimer: MOQ_HONOUR_DISCLAIMER,
    nextStep: definition.nextStep,
    record,
  };
}