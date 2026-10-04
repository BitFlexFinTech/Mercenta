/**
 * §PHASE 3 — the fulfilment (3PL) seam's public surface: the deterministic Supply
 * Route Profile and the fail-closed Logistics Escalation Engine. Import from here.
 */
export type {
  FreightMode,
  RouteVariability,
  SupplyRouteInput,
  SupplyRouteProfile,
} from './supplyRoute';
export { SUPPLY_ROUTE_BASIS, buildSupplyRouteProfile } from './supplyRoute';
export type {
  LogisticsRouteDecision,
  LogisticsEscalationInput,
  LogisticsEscalationResult,
} from './escalation';
export { evaluateLogisticsEscalation } from './escalation';
