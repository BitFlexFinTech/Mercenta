/**
 * §PHASE 6 — THE DETERMINISTIC FINANCING ROUTER CONFIGURATION (the ONE owner).
 *
 * Phase 6 has two halves, and this is the second. The FIRST
 * (`src/config/financing.ts` + `src/lib/finance/capitalRequirement.ts`) answers
 * HOW MUCH capital a Model B purchase needs. THIS one answers WHERE that need is
 * MET: each purchase is deterministically routed to exactly ONE financing route
 * — Mercenta's own cash, the revolving working-capital facility, or an external
 * financier — with NO AI, NO model call and NO clock anywhere in the decision.
 *
 * TWO DISTINCT FACTS, never collapsed (the same discipline as
 * `src/config/financing.ts` and `src/config/vat.ts`):
 *   • the PRODUCTION routing policy — `FINANCING_ROUTING_CONFIGURED` stays `false`
 *     until the real treasury thresholds are a decided commercial matter; and
 *   • the DEMO ILLUSTRATION — `DEMO_FINANCING_ROUTING` below, a labelled example
 *     so the founder can see real routing. It is NEVER presented as Mercenta's
 *     actual policy, and its threshold is an example, not a commitment.
 *
 * Financing is an INTERNAL treasury concern: a brand is never shown which route a
 * purchase took, nor is a brand ever told a purchase is financed (see
 * `.clinerules/mercenta-business-model.md`). A brand cannot import this module.
 */

/**
 * The financing routes Mercenta supports. Exactly ONE applies to a purchase —
 * the set is complete and mutually exclusive, so the exclusive-gateway evaluator
 * the router reuses never faces a genuine ambiguity.
 */
export type FinancingRouteId = 'self_funded' | 'facility_draw' | 'external_referral';

/** ONE declared financing route, with what it does and where the operator acts. */
export interface FinancingRouteDefinition {
  routeId: FinancingRouteId;
  label: string;
  /** What the route does when selected. */
  action: string;
  /** Where the operator acts (an EXISTING destination — never a new screen). */
  destination: string;
}

export interface FinancingRoutingConfig {
  /** True once Mercenta's REAL routing thresholds have been decided. */
  configured: boolean;
  /**
   * Mercenta's own cash it will deploy on ONE purchase before drawing the
   * facility (GBP). At or below this the purchase is self-funded.
   */
  ownCashBufferGbp: number;
  /** The declared routes, in precedence order (one condition each). */
  routes: readonly FinancingRouteDefinition[];
  /** The declared precedence rule, stated in full — the router is never a black box. */
  rule: string;
  /** Human-readable statement of whether this is the real policy. */
  label: string;
  /** What the numbers do and do NOT mean. */
  disclaimer: string;
}

/**
 * §PHASE 6 — whether Mercenta's REAL financing-routing thresholds have been
 * decided. Mirrors `CAPITAL_FACILITY_CONFIGURED`: while this is `false`, any
 * route on screen follows a labelled illustration and NOT a production policy.
 */
export const FINANCING_ROUTING_CONFIGURED = false;

/** The declared precedence rule — stated ONCE, quoted by the router and the gate. */
export const FINANCING_ROUTING_RULE =
  'Exactly one route applies to each purchase: self-funded when the advance is at or below ' +
  'the own-cash buffer; otherwise a facility draw when the advance fits the facility’s ' +
  'remaining capital; otherwise an external referral. The three are mutually exclusive and ' +
  'complete, and the decision is deterministic — no AI, no model call, no clock.';

/**
 * §PHASE 6 — THE DEMO ILLUSTRATION. Example thresholds chosen only so the founder
 * can see real routing. Deliberately a separate constant from the production
 * policy so the demo can never be mistaken for Mercenta's real terms. The values
 * are NOT a commitment and NOT advice.
 */
export const DEMO_FINANCING_ROUTING: FinancingRoutingConfig = {
  configured: false,
  ownCashBufferGbp: 5_000,
  routes: [
    {
      routeId: 'self_funded',
      label: 'Self-funded (own cash)',
      action:
        'Fund the purchase from Mercenta’s own cash — no facility draw, no financing fee.',
      destination: 'control_centre',
    },
    {
      routeId: 'facility_draw',
      label: 'Draw on the working-capital facility',
      action:
        'Draw the advance on the revolving facility and repay it when the channel settles.',
      destination: 'control_centre',
    },
    {
      routeId: 'external_referral',
      label: 'Refer to an external financier',
      action:
        'The advance exceeds the facility’s remaining capital — refer the purchase to an external financing partner (Phase 7 universe; a human decides).',
      destination: 'control_centre',
    },
  ],
  rule: FINANCING_ROUTING_RULE,
  label: 'Illustrative example — a financing routing policy (not Mercenta’s actual policy)',
  disclaimer:
    'Illustration only. Mercenta’s real financing-routing thresholds are an external commercial decision and are NOT configured; the own-cash buffer shown is an example value chosen to demonstrate the routing, and the routing is internal — it is never shown to a brand.',
};
