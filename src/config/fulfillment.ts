/**
 * §PHASE 3 — THE FULFILMENT (3PL) PARTNER CONFIGURATION.
 *
 * WHY THIS FILE EXISTS
 * --------------------
 * The Founder directed (2026-10-04) that the platform's third-party-logistics
 * (3PL) partner is **Delta Fulfillment**, and that the back-end wiring/routing to
 * it must be worked out. Until now the platform had NO 3PL partner concept at
 * all: goods move on DHL (international) and Palletline (UK domestic), and the
 * Phase 3 "Logistics Escalation Engine" (`phase3-logistics-escalation-engine`),
 * which decides WHEN a 3PL / UK inventory buffer / consolidation route may be
 * appropriate, was never built.
 *
 * WHAT A 3PL IS — AND IS NOT
 * --------------------------
 * A 3PL is a FULFILMENT partner, NOT a carrier. DHL and Palletline MOVE goods;
 * Delta Fulfillment would HOLD and handle them (UK warehousing, an inventory
 * buffer, consolidation, pick/pack and the final-mile hand-off). That is why the
 * partner lives HERE and not in the protected `CarrierId` list or the
 * DHL+Palletline lane rule (`src/config/shipping.ts`) — adding a 3PL must never
 * change how a carrier is chosen.
 *
 * RELATIONSHIP (unchanged law)
 * ----------------------------
 * Mercenta operates the Amazon Vendor Central account and **holds the partner
 * relationship and its credentials**. A brand NEVER configures a 3PL and never
 * selects one — the route (this file + `src/lib/fulfillment/escalation.ts`)
 * decides. Nothing here exposes Mercenta's commercial terms.
 *
 * FAIL CLOSED — NO INVENTED LEAD-TIME RULE
 * ----------------------------------------
 * The escalation thresholds below are Mercenta-DECLARED and default to `null`,
 * which means NOT AGREED. While any required threshold is unagreed the engine
 * recommends NO escalation and routes the decision to human review. A universal
 * maximum-lead-time rule is deliberately NOT invented
 * (`requirements-registry.json → phase3-logistics-escalation-engine`).
 */

/** The ONLY declared 3PL partner today. A future second partner is a config row. */
export type FulfillmentPartnerId = 'delta_fulfillment';

export interface FulfillmentPartnerCapability {
  /** One-line, operator-readable statement of what the partner does. */
  label: string;
  /** The declared services. Nothing here is a channel rule. */
  services: readonly string[];
}

export interface FulfillmentPartner {
  id: FulfillmentPartnerId;
  /** The partner's name, exactly as the business names it. */
  name: string;
  /** The partner's ROLE — a 3PL fulfils; it does not carry. */
  role: '3pl';
  /** Who holds the relationship + credentials. Mercenta, never the brand. */
  relationshipOwner: 'mercenta';
  /** The declared capability. */
  capability: FulfillmentPartnerCapability;
  /** The stated basis, rendered wherever the partner is shown. */
  basis: string;
  /** How the real partner turns on — no code change. */
  activation: string;
}

/**
 * THE canonical fulfilment-partner universe. One declaration, consumed by the
 * escalation engine, the surfaces and the validator — so no surface invents its
 * own partner list or its own wording.
 */
export const FULFILLMENT_PARTNERS: Record<FulfillmentPartnerId, FulfillmentPartner> = {
  delta_fulfillment: {
    id: 'delta_fulfillment',
    name: 'Delta Fulfillment',
    role: '3pl',
    relationshipOwner: 'mercenta',
    capability: {
      label: 'UK warehousing, inventory buffer, consolidation and final-mile hand-off',
      services: [
        'UK warehousing and inventory buffer',
        'Consolidation across purchase orders',
        'Pick, pack and the final-mile hand-off to the channel’s fulfilment centre',
      ],
    },
    basis:
      'Mercenta-declared 3PL partner. A 3PL fulfils — it does not carry. Goods still move on DHL (international) and Palletline (UK domestic); Delta Fulfillment would hold and handle them where the route justifies a UK buffer.',
    activation:
      'Entering Delta Fulfillment’s account details in the Integrations Hub activates the already-built adapter — no code change. Until then the route is simulated (mock-first).',
  },
};

/** The declared 3PL partner (the ONE place a default partner is named). */
export const DECLARED_3PL_PARTNER: FulfillmentPartnerId = 'delta_fulfillment';

/** Look a partner up; an undeclared id is REFUSED, never silently defaulted. */
export function getFulfillmentPartner(id: FulfillmentPartnerId): FulfillmentPartner {
  const partner = FULFILLMENT_PARTNERS[id];
  if (!partner) {
    throw new Error(`Undeclared fulfilment partner: ${id}. A 3PL is never invented at the call site.`);
  }
  return partner;
}

/**
 * THE ESCALATION THRESHOLDS — Mercenta-declared, and `null` until the business
 * agrees them. A `null` threshold means NOT AGREED → the engine recommends no
 * escalation and routes to human review (fail closed). Never invent a number.
 */
export interface FulfillmentEscalationThresholds {
  /**
   * Door-to-fulfilment-centre planning days ABOVE which a UK inventory buffer
   * may be justified. `null` = NOT AGREED.
   */
  maxDirectDoorToFcDays: number | null;
  /**
   * Purchase-order frequency (per month) BELOW which a buffer is not justified.
   * `null` = NOT AGREED.
   */
  minPoFrequencyPerMonth: number | null;
  /** The stated basis — rendered wherever a threshold decision is shown. */
  basis: string;
}

export const FULFILLMENT_ESCALATION_THRESHOLDS: FulfillmentEscalationThresholds = {
  maxDirectDoorToFcDays: null,
  minPoFrequencyPerMonth: null,
  basis:
    'Mercenta-declared escalation thresholds. Null means NOT AGREED, so no escalation is recommended and the decision is routed to human review. A universal maximum-lead-time rule is deliberately NOT invented — the route is a Mercenta planning model, not a channel rule.',
};
