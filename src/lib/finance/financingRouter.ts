/**
 * §PHASE 6 — THE DETERMINISTIC FINANCING ROUTER (the ONE owner).
 *
 * Model B means Mercenta buys the goods and is repaid by the channel, so a
 * purchase needs WORKING CAPITAL. The capital model
 * (`src/lib/finance/capitalRequirement.ts`) says HOW MUCH; THIS module says
 * WHERE that need is MET, deterministically routing each purchase to exactly ONE
 * financing route:
 *
 *   self_funded        the advance fits Mercenta's own-cash buffer — no draw
 *   facility_draw      the advance fits the facility's remaining capital
 *   external_referral  the advance exceeds the facility's remaining capital
 *
 * THREE RULES make it safe, and they are the reason this is not just an `if`:
 *
 *   1. NO SECOND ENGINE. The routing is handed to the CANONICAL exclusive-gateway
 *      evaluator (`src/lib/routing/gateways.ts → evaluateExclusiveGateway`), the
 *      same one the commercial gate uses. There is no second routing system, no
 *      second store and no second event system: the returned decision is the
 *      ordinary, auditable `WorkflowRoutingDecision`.
 *   2. DETERMINISTIC + NO AI. No model call, no provider call, no `Math.random`,
 *      no clock inside the rules — the same inputs always give the same route and
 *      the same decision id.
 *   3. FAIL CLOSED. The declared routes are mutually exclusive and complete, so a
 *      genuine ambiguity is impossible by construction; and if the CONFIGURATION
 *      is malformed (an undeclared route, a condition with no route) the gateway
 *      REFUSES rather than guessing. A refusal is queued, never defaulted.
 *
 * Financing is INTERNAL: nothing here is reachable from a brand session and a
 * brand is never shown which route a purchase took.
 */
import {
  evaluateExclusiveGateway,
  type GatewayConditionInput,
  type GatewayRouteInput,
} from '@/lib/routing/gateways';
import type { RouteConditionEvaluation } from '@/types';
import type { CapitalFacilityTerms } from '@/config/financing';
import type {
  FinancingRouteDefinition,
  FinancingRouteId,
  FinancingRoutingConfig,
} from '@/config/financingRouter';
import {
  computePurchaseCapital,
  type FinancedPurchase,
} from '@/lib/finance/capitalRequirement';
import { MERCENTA_OPS_TENANT } from '@/data/domainRepository';

const FINANCING_ROUTING_WORKFLOW_ID = 'financing-route';
const FINANCING_ROUTING_ACTOR = 'system:financing-router';

/** The routing decision for ONE financed purchase. */
export interface FinancedRouteDecision {
  purchaseId: string;
  brandId: string;
  brandName: string;
  /** The advance the purchase draws (supplier cost × advance rate). */
  advanceGbp: number;
  /** The selected route; null only when the gateway itself refused. */
  routeId: FinancingRouteId | null;
  refused: boolean;
  refusalReason: string | null;
  /** Plain-language rationale for the selected route — or the refusal. */
  rationale: string;
  /** The canonical routing decision — recordable through `recordRoutingDecision`. */
  decision: ReturnType<typeof evaluateExclusiveGateway>;
  /** The declared conditions, each with its rule and its observed value. */
  conditions: RouteConditionEvaluation[];
}

/** The tally over one route. */
export interface FinancingRouteBucket {
  routeId: FinancingRouteId;
  label: string;
  count: number;
  advanceGbp: number;
}

/** The financing-routing position over a set of purchases. */
export interface FinancingRoutingSummary {
  configured: boolean;
  currency: string;
  routes: readonly FinancingRouteDefinition[];
  decisions: FinancedRouteDecision[];
  /** One bucket per declared route, in precedence order. */
  byRoute: FinancingRouteBucket[];
  selfFundedCount: number;
  facilityDrawCount: number;
  externalReferralCount: number;
  /** Purchases the gateway refused to route (queued for a human). */
  refusedCount: number;
  /** Σ advance over every routed purchase. */
  totalAdvanceRoutedGbp: number;
  basis: string;
  label: string;
  disclaimer: string;
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

function money(n: number): string {
  return `£${round2(n).toFixed(2)}`;
}

/** The plain-language rationale for a selected route. */
function selectedRationale(
  routeId: FinancingRouteId | null,
  advance: number,
  ownCash: number,
  facilityAvailable: number
): string {
  switch (routeId) {
    case 'self_funded':
      return `Advance ${money(advance)} is within the own-cash buffer ${money(
        ownCash
      )} — funded from own cash, no financing fee.`;
    case 'facility_draw':
      return `Advance ${money(advance)} exceeds the own-cash buffer ${money(
        ownCash
      )} but fits the facility's remaining ${money(
        facilityAvailable
      )} — drawn on the working-capital facility.`;
    case 'external_referral':
      return `Advance ${money(advance)} exceeds the facility's remaining ${money(
        facilityAvailable
      )} — referred to an external financier for a human decision.`;
    default:
      return 'No financing route could be selected deterministically.';
  }
}

/**
 * Route ONE purchase to exactly one financing route. Pure and deterministic: the
 * same facility, config and purchase always produce the same route and the same
 * canonical decision id.
 *
 * It REFUSES rather than guessing when the routing CONFIGURATION is malformed
 * (handled by the canonical exclusive gateway) — a refusal carries its reason and
 * is queued, never defaulted.
 */
export function routeFinancingPurchase(
  facility: CapitalFacilityTerms,
  purchase: FinancedPurchase,
  config: FinancingRoutingConfig,
  at?: string
): FinancedRouteDecision {
  const capital = computePurchaseCapital(facility, purchase);
  const advance = capital.advanceDrawnGbp;
  const ownCash = config.ownCashBufferGbp;
  const facilityAvailable = facility.availableCapitalGbp;

  // The declared routes are mutually exclusive AND complete, so exactly one of
  // these holds for every purchase. (If a future config broke that, the exclusive
  // gateway would refuse — see the fail-closed path below.)
  const selfFunded = advance <= ownCash;
  const facilityDraw = !selfFunded && advance <= facilityAvailable;
  const externalReferral = !selfFunded && advance > facilityAvailable;

  const metByRoute: Record<FinancingRouteId, boolean> = {
    self_funded: selfFunded,
    facility_draw: facilityDraw,
    external_referral: externalReferral,
  };

  const routeInputs: GatewayRouteInput[] = config.routes.map((r) => ({
    routeId: r.routeId,
    label: r.label,
    action: r.action,
    destination: r.destination,
  }));

  const conditions: GatewayConditionInput[] = config.routes.map((r) => ({
    id: `financing_route_${r.routeId}`,
    label: `${r.label} route applies`,
    rule: config.rule,
    observed: metByRoute[r.routeId]
      ? selectedRationale(r.routeId, advance, ownCash, facilityAvailable)
      : `Not this route for an advance of ${money(advance)}.`,
    expected: r.label,
    met: metByRoute[r.routeId],
    routeId: r.routeId,
  }));

  const decision = evaluateExclusiveGateway({
    workflowId: FINANCING_ROUTING_WORKFLOW_ID,
    gatewayId: `financing-route-${purchase.id}`,
    subject: {
      type: 'financed_purchase',
      id: purchase.id,
      label: `${capital.brandName} · ${purchase.id}`,
    },
    owner: { kind: 'ops', tenantId: MERCENTA_OPS_TENANT },
    actor: FINANCING_ROUTING_ACTOR,
    routes: routeInputs,
    conditions,
    at,
  });

  const routeId: FinancingRouteId | null = decision.refused
    ? null
    : ((decision.selectedRouteIds[0] as FinancingRouteId) ?? null);

  return {
    purchaseId: purchase.id,
    brandId: purchase.brandId,
    brandName: capital.brandName,
    advanceGbp: advance,
    routeId,
    refused: decision.refused,
    refusalReason: decision.refusalReason,
    rationale: decision.refused
      ? (decision.refusalDetail ?? 'The financing gateway refused to select a route.')
      : selectedRationale(routeId, advance, ownCash, facilityAvailable),
    decision,
    conditions: decision.conditions,
  };
}

/**
 * Route a whole portfolio. Every figure is a sum over the per-purchase decisions
 * above, so the two can never disagree. A refusal is counted and queued, never
 * hidden.
 */
export function routeFinancing(
  facility: CapitalFacilityTerms,
  purchases: FinancedPurchase[],
  config: FinancingRoutingConfig,
  at?: string
): FinancingRoutingSummary {
  const decisions = purchases.map((p) => routeFinancingPurchase(facility, p, config, at));

  const byRoute: FinancingRouteBucket[] = config.routes.map((r) => {
    const rows = decisions.filter((d) => d.routeId === r.routeId);
    return {
      routeId: r.routeId,
      label: r.label,
      count: rows.length,
      advanceGbp: round2(rows.reduce((s, d) => s + d.advanceGbp, 0)),
    };
  });

  const countOf = (id: FinancingRouteId) => byRoute.find((b) => b.routeId === id)?.count ?? 0;
  const totalAdvanceRoutedGbp = round2(
    decisions.filter((d) => !d.refused).reduce((s, d) => s + d.advanceGbp, 0)
  );
  const refusedCount = decisions.filter((d) => d.refused).length;

  const basis = decisions.length
    ? `${decisions.length} purchase${decisions.length === 1 ? '' : 's'} routed: ${countOf(
        'self_funded'
      )} self-funded · ${countOf('facility_draw')} facility draw · ${countOf(
        'external_referral'
      )} external referral${
        refusedCount ? ` · ${refusedCount} refused (queued for a human)` : ''
      }. ${money(
        totalAdvanceRoutedGbp
      )} of advance routed deterministically — no AI, no model call.`
    : 'No Model B purchase is currently awaiting a financing route.';

  return {
    configured: config.configured,
    currency: facility.currency,
    routes: config.routes,
    decisions,
    byRoute,
    selfFundedCount: countOf('self_funded'),
    facilityDrawCount: countOf('facility_draw'),
    externalReferralCount: countOf('external_referral'),
    refusedCount,
    totalAdvanceRoutedGbp,
    basis,
    label: config.label,
    disclaimer: config.disclaimer,
  };
}
