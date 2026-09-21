/**
 * §Phase 2 §10/§22 — THE COMMERCIAL READINESS RECORDER.
 *
 * The ONE place that performs a commercial readiness ASSESSMENT end to end, so a
 * product opportunity, a brand action and a reassessment all travel the exact
 * same path:
 *
 *   evaluateCommercialViability (the declared gate, deterministic)
 *     → recordRoutingDecision (the canonical routing store: audited, idempotent)
 *       → upsertCommercialReadinessRecord (the canonical readiness store)
 *
 * WHY IT IS SEPARATE FROM THE STORE
 * ---------------------------------
 * The store owns the records; this module owns the ASSESSMENT WORKFLOW. Keeping
 * them apart is what stops the store from becoming a second evaluator and stops
 * the gate from becoming a second store.
 *
 * A REASSESSMENT IS REPRODUCIBLE
 * ------------------------------
 * `reassessCommercialReadiness` rebuilds the gate input from the RECORD ITSELF
 * (`terms`, `pack`, `assessmentInput` — the retained basis), so the same record
 * always reassesses to the same route for the same information. Nothing is
 * re-invented between the first assessment and the reassessment.
 */
import type { CommercialReadinessRecord, CommercialTermValue } from '@/types';
import {
  type CommercialViabilityEvaluation,
  type CommercialViabilityInput,
} from '@/lib/commercial/commercialGate';
import { runCommercialAssessment } from '@/lib/commercial/commercialAssessment';
import { type RouteRecordResult } from '@/data/routingStore';
import {
  getCommercialReadinessRecord,
  submitCommercialTerms,
  upsertCommercialReadinessRecord,
  type CommercialTermSubmission,
  type ReadinessWriteResult,
  type TermSubmissionResult,
} from '@/data/commercialReadinessStore';

export interface CommercialAssessmentOutcome {
  evaluation: CommercialViabilityEvaluation;
  /** The canonical routing decision store's outcome (idempotence evidence). */
  routing: RouteRecordResult;
  /** The canonical readiness record store's outcome. */
  write: ReadinessWriteResult;
}

/**
 * Assess ONE product's commercial readiness. Idempotent: identical inputs produce
 * an identical decision id, which the routing store and the readiness store both
 * suppress and report.
 */
export function assessCommercialReadiness(input: CommercialViabilityInput): CommercialAssessmentOutcome {
  const { evaluation, routing } = runCommercialAssessment(input);
  const write = upsertCommercialReadinessRecord(evaluation.record, input.actor);
  return { evaluation, routing, write };
}

/**
 * The DECLARED pack arithmetic, applied to a stored record.
 *
 * A brand supplies `case_pack` (units per case) and `master_carton` (units per
 * carton) as commercial terms; the gate needs `casePack` + `casesPerCarton`. The
 * master carton is DEFINED by the pack-maths rule as
 * `casePack × casesPerCarton`, so when the record does not already carry
 * `casesPerCarton` it is DERIVED from the declared terms using that rule — never
 * guessed, and only when the division is exact.
 */
function packWithDeclaredTerms(
  pack: CommercialReadinessRecord['pack'],
  terms: readonly CommercialTermValue[]
): CommercialViabilityInput['pack'] {
  const termNum = (field: string): number | null => {
    const t = terms.find((x) => x.field === field);
    if (!t) return null;
    if (typeof t.value === 'number') return t.value;
    if (typeof t.value === 'string' && t.value.trim() !== '' && !Number.isNaN(Number(t.value))) {
      return Number(t.value);
    }
    return null;
  };

  const casePack = pack.casePack ?? termNum('case_pack');
  const masterCartonUnits = termNum('master_carton');
  const derivedCasesPerCarton =
    casePack !== null && masterCartonUnits !== null && masterCartonUnits % casePack === 0
      ? masterCartonUnits / casePack
      : null;

  return {
    brandMoq: pack.brandMoq ?? termNum('moq'),
    productionMoq: pack.productionMoq,
    casePack,
    casesPerCarton: pack.casesPerCarton ?? derivedCasesPerCarton,
    poQuantity: pack.poQuantity,
    shipmentQuantity: pack.shipmentQuantity,
    cartonsPerPallet: pack.cartonsPerPallet,
  };
}

/**
 * Rebuild the gate input from the RECORD ITSELF. The retained `assessmentInput`
 * is the basis that produced the current route, so a reassessment evaluates the
 * same case rather than a newly invented one.
 */
export function commercialViabilityInputFromRecord(
  record: CommercialReadinessRecord,
  actor: string
): CommercialViabilityInput {
  const basis = record.assessmentInput;
  return {
    owner: record.owner,
    actor,
    subject: {
      type: 'product_opportunity',
      id: record.productRef ?? record.id,
      label: record.productLabel ?? record.id,
    },
    assessmentId: record.assessmentId,
    supplyProfileId: record.supplyProfileId,
    productOpportunityId: record.productOpportunityId,
    productRef: record.productRef,
    productLabel: record.productLabel,
    dedupeKey: record.dedupeKey,
    terms: record.terms,
    pack: packWithDeclaredTerms(record.pack, record.terms),
    perUnitLogisticsCostGbp: basis?.perUnitLogisticsCostGbp ?? null,
    perUnitChannelCostGbp: basis?.perUnitChannelCostGbp ?? null,
    intendedOrderQuantity: basis?.intendedOrderQuantity ?? null,
    projectedDemandUnits: basis?.projectedDemandUnits ?? null,
    declaredSupplyCapacityUnits: basis?.declaredSupplyCapacityUnits ?? null,
    supplyVariability: basis?.supplyVariability ?? 'unknown',
    planningLeadTimeDays: basis?.planningLeadTimeDays ?? null,
    agreedMaxLeadTimeDays: basis?.agreedMaxLeadTimeDays ?? null,
  };
}

/** Reassess ONE stored record through the SAME gate. Returns null if unknown. */
export function reassessCommercialReadiness(
  recordId: string,
  actor: string
): CommercialAssessmentOutcome | null {
  const record = getCommercialReadinessRecord(recordId);
  if (!record) return null;
  return assessCommercialReadiness(commercialViabilityInputFromRecord(record, actor));
}

export interface BrandSubmissionOutcome {
  submission: TermSubmissionResult;
  /** The reassessment, when anything was accepted. */
  reassessment: CommercialAssessmentOutcome | null;
  /** True when the supplier's input produced no change at all. */
  unchanged: boolean;
}

/**
 * THE BRAND ACTION (§10/§12): supply the missing commercial information, then
 * REASSESS.
 *
 * A submission that supplies nothing usable is refused and NO reassessment is run
 * (so a failed operation can never be reported as progress). A submission that
 * supplies the same value twice is accepted by the store, and the reassessment is
 * then suppressed as a duplicate — `unchanged: true` — which is the idempotence
 * evidence the validator asserts.
 */
export function submitCommercialTermsAndReassess(
  recordId: string,
  values: readonly CommercialTermSubmission[],
  actor: string
): BrandSubmissionOutcome {
  const submission = submitCommercialTerms(recordId, values, actor);
  if (!submission.ok || !submission.record) {
    // Nothing changed (a duplicate) OR nothing was accepted (invalid input):
    // either way NO reassessment runs, so a failed or empty operation can never
    // be reported as progress.
    return {
      submission,
      reassessment: null,
      unchanged: submission.refused.length === 0 && submission.ignored.length > 0,
    };
  }
  const reassessment = reassessCommercialReadiness(recordId, actor);
  return {
    submission,
    reassessment,
    unchanged: reassessment ? reassessment.write.duplicateSuppressed : true,
  };
}