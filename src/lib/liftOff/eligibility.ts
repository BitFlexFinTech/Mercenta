/**
 * §LIFT OFF — ELIGIBILITY EVALUATOR (deterministic, tenant-scoped, fail-closed).
 *
 * WHY A SEPARATE PURE FUNCTION
 * ----------------------------
 * The brand workspace must answer "does my brand qualify for Lift Off?" from the
 * brand's OWN real records — never from a decorative checklist. So the answers are
 * DERIVED here from the canonical data (the approved-category owner, the brand's
 * catalogue count, the canonical compliance gate and the commercial-model owner),
 * exactly as the rest of the platform derives what it shows.
 *
 * FAIL-CLOSED (the platform's rule): a criterion that cannot be POSITIVELY satisfied
 * is reported `unmet`, never `met`. An unknown category, a missing model and an
 * unresolved compliance gate are therefore all `unmet` — the section can never tell a
 * brand it qualifies when the platform does not actually know that it does.
 *
 * It reads the RULES from the ONE owner (`src/config/liftOff.ts`), so the labels and
 * the criteria can never drift from the programme's declaration.
 */
import { isApprovedCategory } from '@/types';
import { isCommercialModel } from '@/config/commercialModel';
import {
  LIFT_OFF_ELIGIBILITY_RULES,
  type LiftOffEligibilityId,
  type LiftOffEligibilityRule,
} from '@/config/liftOff';

export interface LiftOffEligibilityInput {
  /** The brand's declared category (from its own profile). */
  category?: string | null;
  /** How many products the brand has in its catalogue. */
  productCount: number;
  /** True only when the canonical compliance gate says the brand is cleared. */
  complianceCleared: boolean;
  /** The brand's agreed commercial relationship, if any. */
  commercialModel?: string | null;
}

export type LiftOffEligibilityState = 'met' | 'unmet';

export interface LiftOffEligibilityOutcome {
  rule: LiftOffEligibilityRule;
  state: LiftOffEligibilityState;
}

export interface LiftOffEligibilityResult {
  outcomes: LiftOffEligibilityOutcome[];
  met: number;
  total: number;
  /** True only when EVERY criterion is positively met. */
  eligible: boolean;
}

/**
 * Evaluate the declared Lift Off criteria against a brand's real records.
 * Pure and deterministic: no clock, no randomness, no network.
 */
export function evaluateLiftOffEligibility(
  input: LiftOffEligibilityInput
): LiftOffEligibilityResult {
  const decided: Record<LiftOffEligibilityId, boolean> = {
    approved_category: isApprovedCategory(input.category ?? ''),
    catalogue_product: input.productCount > 0,
    compliance_cleared: input.complianceCleared === true,
    commercial_model_set: isCommercialModel(input.commercialModel),
  };

  const outcomes: LiftOffEligibilityOutcome[] = LIFT_OFF_ELIGIBILITY_RULES.map((rule) => ({
    rule,
    state: (decided[rule.id] ? 'met' : 'unmet') as LiftOffEligibilityState,
  }));

  const met = outcomes.filter((o) => o.state === 'met').length;
  return { outcomes, met, total: outcomes.length, eligible: met === outcomes.length };
}
