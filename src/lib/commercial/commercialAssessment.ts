/**
 * §Phase 2 — THE COMMERCIAL ASSESSMENT STEP (gate → canonical routing decision).
 *
 * Deliberately tiny and dependency-free of any store: it performs the TWO
 * deterministic steps every commercial assessment must perform, so the demo
 * seed, the founder surface, the brand action and a reassessment all produce the
 * SAME auditable routing decision through ONE implementation.
 *
 * It does NOT write the readiness record: that is the readiness store's job
 * (`upsertCommercialReadinessRecord`), which is why this module can be used by
 * the store's own boot without a circular dependency.
 */
import { evaluateCommercialViability, type CommercialViabilityEvaluation, type CommercialViabilityInput } from './commercialGate';
import { recordRoutingDecision, type RouteRecordResult } from '@/data/routingStore';

export interface CommercialAssessment {
  evaluation: CommercialViabilityEvaluation;
  routing: RouteRecordResult;
}

export function runCommercialAssessment(input: CommercialViabilityInput): CommercialAssessment {
  const evaluation = evaluateCommercialViability(input);
  const routing = recordRoutingDecision(evaluation.decision, input.actor);
  return { evaluation, routing };
}