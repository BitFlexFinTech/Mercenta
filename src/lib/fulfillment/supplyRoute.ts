/**
 * §PHASE 3 — THE SUPPLY ROUTE PROFILE (deterministic).
 *
 * WHAT IT IS
 * ----------
 * The Phase 3 route model for a product: origin, ship-from, production/export
 * lead time, freight mode, transit estimate, customs + customs buffer, UK final
 * mile, appointment requirement, total expected door-to-FC, safety buffer,
 * planning lead time and variability. It is the input the Logistics Escalation
 * Engine (`./escalation.ts`) reads to decide whether a 3PL (Delta Fulfillment) /
 * UK inventory buffer may be appropriate.
 *
 * WHAT IT IS NOT
 * --------------
 * - NOT AI-derived and NOT a network call: pure arithmetic over DECLARED inputs.
 * - NOT a channel rule: the planning figures are Mercenta's own planning model
 *   (`basis`), never a carrier or channel commitment.
 * - NOT a guess: a missing component yields `null` and is NAMED in `unknowns`,
 *   so a surface can state what is unknown instead of inventing a number.
 */

export type FreightMode = 'air' | 'sea' | 'road' | 'unknown';
export type RouteVariability = 'low' | 'medium' | 'high' | 'unknown';

/** The declared inputs the route is built from (all optional-but-explicit). */
export interface SupplyRouteInput {
  origin: string | null;
  shipFrom: string | null;
  productionLeadTimeDays: number | null;
  exportLeadTimeDays: number | null;
  freightMode: FreightMode;
  transitEstimateDays: number | null;
  customsRequired: boolean;
  /** Only counted when `customsRequired`. */
  customsBufferDays: number | null;
  ukFinalMile: boolean;
  appointmentRequired: boolean;
  safetyBufferDays: number | null;
  variability: RouteVariability;
}

export interface SupplyRouteProfile extends SupplyRouteInput {
  /**
   * production + export + transit + customs buffer (when required) — the raw
   * door-to-fulfilment-centre time. `null` when ANY component is unknown.
   */
  totalDoorToFcDays: number | null;
  /** door-to-FC + the declared safety buffer — the planning figure. */
  planningLeadTimeDays: number | null;
  /** What is still unknown — stated, never guessed. */
  unknowns: string[];
  /** The stated basis, rendered wherever the figures are shown. */
  basis: string;
}

export const SUPPLY_ROUTE_BASIS =
  'Mercenta-declared supply route planning model — a planning projection, not a carrier or channel commitment. A missing component is reported as unknown rather than estimated.';

function isNum(value: number | null | undefined): value is number {
  return typeof value === 'number' && Number.isFinite(value) && value >= 0;
}

/** Build the deterministic route profile from declared inputs. */
export function buildSupplyRouteProfile(input: SupplyRouteInput): SupplyRouteProfile {
  const unknowns: string[] = [];
  if (!input.origin) unknowns.push('origin is not recorded');
  if (!input.shipFrom) unknowns.push('ship-from is not recorded');
  if (input.freightMode === 'unknown') unknowns.push('freight mode is not declared');
  if (!isNum(input.productionLeadTimeDays)) unknowns.push('production lead time is not recorded');
  if (!isNum(input.exportLeadTimeDays)) unknowns.push('export lead time is not recorded');
  if (!isNum(input.transitEstimateDays)) unknowns.push('transit estimate is not recorded');
  if (input.customsRequired && !isNum(input.customsBufferDays)) {
    unknowns.push('customs is required but the customs buffer is not recorded');
  }
  if (!isNum(input.safetyBufferDays)) unknowns.push('safety buffer is not recorded');
  if (input.variability === 'unknown') unknowns.push('variability is not assessed');

  const doorComponents: (number | null)[] = [
    input.productionLeadTimeDays,
    input.exportLeadTimeDays,
    input.transitEstimateDays,
    input.customsRequired ? input.customsBufferDays : 0,
  ];
  const totalDoorToFcDays = doorComponents.every(isNum)
    ? doorComponents.reduce<number>((sum, n) => sum + (n as number), 0)
    : null;
  const planningLeadTimeDays =
    isNum(totalDoorToFcDays) && isNum(input.safetyBufferDays)
      ? totalDoorToFcDays + input.safetyBufferDays
      : null;

  return { ...input, totalDoorToFcDays, planningLeadTimeDays, unknowns, basis: SUPPLY_ROUTE_BASIS };
}
