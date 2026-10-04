/**
 * §PHASE 3 — THE LOGISTICS ESCALATION ENGINE
 * (`requirements-registry.json → phase3-logistics-escalation-engine`).
 *
 * WHAT IT DECIDES
 * ---------------
 * Whether a product's route should ship **direct to the channel's fulfilment
 * centre**, or whether a **3PL (Delta Fulfillment) / UK inventory buffer /
 * consolidation** route MAY be appropriate — and, when it escalates, it NAMES
 * the declared partner (Delta Fulfillment). See `src/config/fulfillment.ts`.
 *
 * FAIL CLOSED — THE CARDINAL RULE
 * -------------------------------
 * The escalation thresholds are Mercenta-DECLARED and default to `null`
 * (NOT AGREED). The engine recommends an escalation ONLY when the route is known
 * AND the thresholds are agreed AND the purchase-order frequency is known.
 * Anything else returns `review` with NO partner recommended. A universal
 * maximum-lead-time rule is deliberately NOT invented (the registry row states
 * this explicitly). No AI, no network, deterministic.
 */

import type { SupplyRouteProfile } from './supplyRoute';
import {
  DECLARED_3PL_PARTNER,
  FULFILLMENT_ESCALATION_THRESHOLDS,
  getFulfillmentPartner,
  type FulfillmentEscalationThresholds,
  type FulfillmentPartnerId,
} from '@/config/fulfillment';

export type LogisticsRouteDecision = 'direct_to_fc' | 'escalate_to_3pl' | 'review';

export interface LogisticsEscalationInput {
  route: SupplyRouteProfile;
  /** Purchase-order frequency per month, when the business has measured it. */
  poFrequencyPerMonth: number | null;
}

export interface LogisticsEscalationResult {
  decision: LogisticsRouteDecision;
  /** The 3PL partner — set ONLY when the decision is `escalate_to_3pl`; else null. */
  partnerId: FulfillmentPartnerId | null;
  partnerName: string | null;
  /** Every fact the decision rests on, in order — so a surface can explain it. */
  reasons: string[];
  /** True only when BOTH required thresholds are agreed (numbers, not null). */
  thresholdsAgreed: boolean;
  basis: string;
}

function isNum(value: number | null | undefined): value is number {
  return typeof value === 'number' && Number.isFinite(value);
}

function review(
  reasons: string[],
  thresholds: FulfillmentEscalationThresholds
): LogisticsEscalationResult {
  return {
    decision: 'review',
    partnerId: null,
    partnerName: null,
    reasons,
    thresholdsAgreed: false,
    basis: thresholds.basis,
  };
}

/**
 * Evaluate the escalation decision. Pure and deterministic.
 *
 * `thresholds` defaults to the CANONICAL declared thresholds (which are
 * unagreed/`null` today, so the real platform fails closed to `review`). It is an
 * INJECTABLE parameter so a gate can exercise the agreed branches — the same
 * "inject the input, never mutate the world" pattern the project uses for clocks.
 */
export function evaluateLogisticsEscalation(
  input: LogisticsEscalationInput,
  thresholds: FulfillmentEscalationThresholds = FULFILLMENT_ESCALATION_THRESHOLDS
): LogisticsEscalationResult {
  const maxDirect = thresholds.maxDirectDoorToFcDays;
  const minFreq = thresholds.minPoFrequencyPerMonth;

  if (!isNum(input.route.totalDoorToFcDays)) {
    return review(
      [
        'The door-to-fulfilment-centre time is not known, so no escalation is recommended (fail closed).',
        `Unknown: ${input.route.unknowns.join('; ') || 'route components'}.`,
      ],
      thresholds
    );
  }
  if (maxDirect === null || minFreq === null) {
    return review(
      [
        'The escalation thresholds are NOT AGREED, so a 3PL / UK buffer is not recommended and the decision is routed to human review.',
        'A universal maximum-lead-time rule is deliberately NOT invented — the business must first agree the thresholds.',
      ],
      thresholds
    );
  }
  if (!isNum(input.poFrequencyPerMonth)) {
    return review(
      [
        'The purchase-order frequency is not known, so a UK inventory buffer cannot be justified (fail closed).',
        'A 3PL / buffer is introduced only where actual order frequency justifies it.',
      ],
      thresholds
    );
  }

  const doorToFc = input.route.totalDoorToFcDays;
  const frequency = input.poFrequencyPerMonth;

  if (doorToFc > maxDirect && frequency >= minFreq) {
    const partner = getFulfillmentPartner(DECLARED_3PL_PARTNER);
    return {
      decision: 'escalate_to_3pl',
      partnerId: partner.id,
      partnerName: partner.name,
      reasons: [
        `Door-to-FC planning time is ${doorToFc} days, above the agreed maximum of ${maxDirect}.`,
        `Purchase-order frequency is ${frequency}/month, at or above the agreed minimum of ${minFreq}.`,
        `A UK inventory buffer / consolidation route may be appropriate — ${partner.name} is the declared 3PL partner.`,
      ],
      thresholdsAgreed: true,
      basis: thresholds.basis,
    };
  }

  return {
    decision: 'direct_to_fc',
    partnerId: null,
    partnerName: null,
    reasons: [
      `Door-to-FC planning time is ${doorToFc} days (agreed maximum ${maxDirect}).`,
      `Purchase-order frequency is ${frequency}/month (agreed minimum ${minFreq}).`,
      'The route stays direct to the channel’s fulfilment centre — no 3PL / UK buffer is justified.',
    ],
    thresholdsAgreed: true,
    basis: thresholds.basis,
  };
}
