/**
 * §PHASE 3 STAGE 3 — DERIVE THE DECLARED SUPPLY-ROUTE INPUTS FROM THE CANONICAL
 * RECORDS.
 *
 * The route model (`./supplyRoute.ts`) and the escalation engine
 * (`./escalation.ts`) are pure and take DECLARED inputs. This is the ONE place
 * those inputs are read off the platform's own records, so no surface re-derives
 * them — and none invents one. Every field the records genuinely do NOT hold stays
 * `null` and is NAMED as an unknown by the profile, so the surface shows what is
 * missing rather than guessing it.
 *
 * WHAT IS DERIVED (and from where):
 *   · origin           — the consignment's recorded origin;
 *   · freight mode     — the consignment's canonical status (sea / air transit);
 *   · customs required — the CANONICAL shipping lane (`resolveShippingLane`): a
 *                        non-UK origin is international, so customs apply;
 *   · UK final mile    — the destination is the channel's UK fulfilment centre;
 *   · appointment      — the linked purchase order's canonical appointment.
 * WHAT IS NOT RECORDED ANYWHERE (so it stays unknown): ship-from, production and
 * export lead time, transit estimate, customs buffer, safety buffer, variability,
 * and the purchase-order frequency.
 */
import { resolveShippingLane } from '@/lib/shipping/carrierRouting';
import type { FreightMode, RouteVariability, SupplyRouteInput } from './supplyRoute';

export interface SupplyRouteRecordInput {
  /** The consignment's recorded origin, when one is held. */
  origin: string | null;
  /** The brand's declared nation — drives the canonical shipping lane. */
  brandNation: string | null;
  /** The consignment's canonical status. */
  shipmentStatus: string;
  /** True when the linked purchase order carries a delivery appointment. */
  appointmentRequired: boolean;
}

export const ROUTE_DERIVATION_BASIS =
  'Derived from the platform’s own records: the consignment origin, the canonical shipping lane (customs), the consignment status (freight mode) and the purchase order’s appointment. Anything the records do not hold is reported as unknown, never estimated.';

/** The freight mode implied by the consignment's canonical status. */
export function freightModeForShipmentStatus(status: string): FreightMode {
  if (status === 'sea_transit') return 'sea';
  if (status === 'air_transit') return 'air';
  return 'unknown';
}

/** Build the DECLARED route input from records — a missing field stays unknown. */
export function deriveSupplyRouteInput(input: SupplyRouteRecordInput): SupplyRouteInput {
  const lane = resolveShippingLane({ brandNation: input.brandNation });
  const variability: RouteVariability = 'unknown';
  return {
    origin: input.origin,
    shipFrom: null,
    productionLeadTimeDays: null,
    exportLeadTimeDays: null,
    freightMode: freightModeForShipmentStatus(input.shipmentStatus),
    transitEstimateDays: null,
    customsRequired: lane === 'international',
    customsBufferDays: null,
    ukFinalMile: true,
    appointmentRequired: input.appointmentRequired,
    safetyBufferDays: null,
    variability,
  };
}