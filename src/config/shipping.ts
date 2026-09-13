/**
 * §Canonical business model §11/§12 — shipping carrier routing + commercial terms.
 *
 * THE SINGLE SOURCE OF TRUTH for:
 *   1. which Mercenta carrier account is used for which lane, and
 *   2. the shipping commercial model (negotiated discount, mark-up, fees, VAT).
 *
 * Business rule (non-negotiable, centralised HERE — never duplicated in a UI):
 *   International brands  → DHL        (Mercenta's DHL UK account)
 *   UK domestic brands    → Palletline (Mercenta's Palletline account)
 *
 * Mercenta is the account holder. A brand never selects an arbitrary carrier;
 * the lane decides the carrier. Admin may override a single shipment, but the
 * default is this rule.
 *
 * ⚠️ COMMERCIAL TERMS BELOW ARE PLACEHOLDERS pending commercial sign-off. They
 * exist so the shipping economics are modelled end-to-end and are configurable
 * in ONE place. Nothing customer-facing should treat them as agreed terms.
 */

import type { CarrierId, ShippingLane } from '@/types';

/** Canonical Mercenta carrier accounts — the ONLY carriers Mercenta can select. */
export const MERCENTA_CARRIER_ACCOUNTS: readonly CarrierId[] = ['dhl', 'palletline'] as const;

/** The partnered-carrier pseudo-id used when Amazon arranges freight (collect). */
export const AMAZON_PARTNERED_CARRIER = 'amazon_partner';

/** Lane → carrier account. The whole routing rule, declared exactly once. */
export const SHIPPING_CARRIER_ROUTING: Record<ShippingLane, CarrierId> = {
  international: 'dhl',
  uk_domestic: 'palletline',
};

/** Human-readable lane labels (one declaration). */
export const SHIPPING_LANE_LABELS: Record<ShippingLane, string> = {
  international: 'International (DHL)',
  uk_domestic: 'UK domestic (Palletline)',
};

/** Mercenta carrier-account labels — one declaration, reused by every UI. */
export const MERCENTA_CARRIER_LABELS: Record<CarrierId, string> = {
  dhl: 'DHL Express (Mercenta account)',
  palletline: 'Palletline (Mercenta account)',
  fedex: 'FedEx',
  bak: 'BAK Logistics',
};

/**
 * Nation/region inputs that count as UK-domestic.
 * Europe is NOT domestic — only the United Kingdom itself.
 */
export const UK_DOMESTIC_NATION_ALIASES: readonly string[] = [
  'united kingdom',
  'uk',
  'gb',
  'great britain',
  'england',
  'scotland',
  'wales',
  'northern ireland',
] as const;

/**
 * §12 — shipping commercial model. All values are configurable placeholders.
 *
 * DHL negotiated discount = 40% (illustrative); the carrier list cost is
 * discounted to the ACTUAL carrier invoice cost. Mercenta charges the brand a
 * mark-up on the discounted cost and keeps the margin. Carrier cost and the
 * brand charge are BOTH recorded — never overwritten into each other.
 */
export const SHIPPING_COMMERCIAL_TERMS = {
  /** Placeholder flag — true until finance signs the real terms off. */
  placeholder: true,
  /** Negotiated discount off the carrier list cost, by carrier (fraction). */
  negotiatedDiscountPct: {
    dhl: 0.4, // illustrative — NOT the customer mark-up
    palletline: 0.25,
  } as Record<CarrierId, number>,
  /** Mercenta mark-up applied to the discounted carrier cost (fraction). */
  markUpPct: {
    dhl: 0.5,
    palletline: 0.5,
  } as Record<CarrierId, number>,
  /** Fixed handling fee per shipment (GBP). Placeholder. */
  handlingFeeGbp: 0,
  /** Fuel/surcharge fraction of the discounted cost. Placeholder. */
  surchargePct: 0,
  /**
   * VAT treatment for shipping. Placeholder — the accounting treatment is NOT
   * finalised, so this is configurable rather than silently assumed.
   */
  vatTreatment: 'standard' as 'standard' | 'zero_rated' | 'exempt' | 'not_applicable',
  /** Standard UK VAT rate (fraction). Placeholder. */
  vatRate: 0.2,
} as const;

export type ShippingCommercialTerms = typeof SHIPPING_COMMERCIAL_TERMS;
