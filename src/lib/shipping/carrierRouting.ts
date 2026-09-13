/**
 * §Canonical business model §11 — carrier ROUTING rule.
 *
 * The single implementation of "which Mercenta carrier account moves this
 * shipment". Both the brand ASN flow and the admin override path consult THIS
 * module; no UI holds its own copy of the rule.
 *
 *   International → DHL        (Mercenta's DHL UK account)
 *   UK domestic   → Palletline (Mercenta's Palletline account)
 *
 * Amazon-arranged freight (`freightTerm === 'collect'`) is NOT a Mercenta
 * carrier account — Amazon books the carrier, so the partnered-carrier path is
 * permitted for those POs only.
 */
import type { CarrierId, CarrierRouteDecision, FreightTerm, ShippingLane } from '@/types';
import {
  AMAZON_PARTNERED_CARRIER,
  MERCENTA_CARRIER_ACCOUNTS,
  SHIPPING_CARRIER_ROUTING,
  SHIPPING_LANE_LABELS,
  UK_DOMESTIC_NATION_ALIASES,
} from '@/config/shipping';

/** Normalise a nation/country string for comparison. */
export function normaliseNation(nation?: string | null): string {
  return (nation ?? '').trim().toLowerCase();
}

/** Does this nation/country describe the United Kingdom? */
export function isUkDomesticNation(nation?: string | null): boolean {
  const n = normaliseNation(nation);
  if (!n) return false;
  return UK_DOMESTIC_NATION_ALIASES.some((alias) => n === alias || n.includes(alias));
}

/**
 * Resolve the shipping lane. Prefers the brand's nation; falls back to the
 * consignment origin country. Unknown origin is treated as INTERNATIONAL
 * (the conservative default: DHL operates the international lane).
 */
export function resolveShippingLane(input: {
  brandNation?: string | null;
  originCountry?: string | null;
}): ShippingLane {
  const nation = input.brandNation ?? input.originCountry ?? null;
  return isUkDomesticNation(nation) ? 'uk_domestic' : 'international';
}

/** The canonical Mercenta carrier account for a lane. */
export function selectCarrierForLane(lane: ShippingLane): CarrierId {
  return SHIPPING_CARRIER_ROUTING[lane];
}

/** Full routing decision with an auditable reason. */
export function selectCarrierForShipment(input: {
  brandNation?: string | null;
  originCountry?: string | null;
}): CarrierRouteDecision {
  const lane = resolveShippingLane(input);
  const carrier = selectCarrierForLane(lane);
  const source = input.brandNation ? 'brand nation' : input.originCountry ? 'consignment origin' : 'unknown origin (default)';
  return {
    lane,
    carrier,
    reason: `${SHIPPING_LANE_LABELS[lane]} selected by the canonical routing rule (${source}: ${input.brandNation ?? input.originCountry ?? 'unknown'}).`,
  };
}

/** Is this carrier one of Mercenta's own carrier accounts? */
export function isCanonicalMercentaCarrier(carrier: string): boolean {
  return (MERCENTA_CARRIER_ACCOUNTS as readonly string[]).includes(carrier);
}

/** The carrier options a brand may choose for a given lane (canonical only). */
export function carrierOptionsForLane(lane: ShippingLane): { value: CarrierId; label: string }[] {
  const primary = selectCarrierForLane(lane);
  return [
    { value: primary, label: SHIPPING_LANE_LABELS[lane] },
    { value: primary === 'dhl' ? 'palletline' : 'dhl', label: primary === 'dhl' ? 'Palletline (palletised freight)' : 'DHL Express (parcel/general)' },
  ];
}

export interface CarrierValidation {
  ok: boolean;
  /** Present when ok === false. */
  error?: string;
  /** The carrier the routing rule expects (absent for Amazon-arranged freight). */
  expected?: CarrierId;
  /** True when the shipment rides Amazon's arranged carrier (freight collect). */
  amazonArranged?: boolean;
}

/**
 * Validate a carrier choice against the canonical rule.
 *
 * Refuses any carrier that is neither (a) the lane's canonical Mercenta account,
 * (b) the OTHER Mercenta account (a permitted admin override within Mercenta's
 * own accounts), nor (c) the partnered carrier on an Amazon-arranged PO.
 */
export function validateCarrierForShipment(input: {
  carrier: string;
  brandNation?: string | null;
  originCountry?: string | null;
  freightTerm?: FreightTerm;
}): CarrierValidation {
  const decision = selectCarrierForShipment(input);

  if (input.carrier === AMAZON_PARTNERED_CARRIER) {
    if (input.freightTerm === 'collect') {
      return { ok: true, amazonArranged: true };
    }
    return {
      ok: false,
      expected: decision.carrier,
      error:
        'The partnered carrier may only be used on retail-channel-arranged (Freight Collect) purchase orders. ' +
        `This PO is not Freight Collect — file the ASN with ${decision.carrier === 'dhl' ? 'DHL' : 'Palletline'}.`,
    };
  }

  if (isCanonicalMercentaCarrier(input.carrier)) {
    return { ok: true, expected: decision.carrier };
  }

  return {
    ok: false,
    expected: decision.carrier,
    error:
      `Carrier "${input.carrier}" is not a Mercenta carrier account. ` +
      `Shipping is routed by rule: international → DHL, UK domestic → Palletline ` +
      `(this shipment resolves to ${decision.carrier}).`,
  };
}
