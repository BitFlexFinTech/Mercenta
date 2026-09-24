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
/** The UK marketplace id's ONE canonical home (§P12 reads it, never retypes it). */
import { UK_MARKETPLACE_ID } from '@/lib/spapi/transform';

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

/**
 * Mercenta carrier-account labels — one declaration, reused by every UI.
 *
 * §P9 (programme decision 1) — REPOINTED: the old contract also carried
 * `fedex: 'FedEx'` and `bak: 'BAK Logistics'`. Carriers are DHL + Palletline
 * ONLY, so no retired carrier is presentable as a carrier any more.
 */
export const MERCENTA_CARRIER_LABELS: Record<CarrierId, string> = {
  dhl: 'DHL Express (Mercenta account)',
  palletline: 'Palletline (Mercenta account)',
};

/**
 * §P9 (programme decision 1) — RETIRED CARRIER IDS (recorded once, for REFUSAL).
 *
 * `fedex` and `bak` are no longer `CarrierId`s, no longer labelled, no longer
 * capability-declared and no longer reachable from any UI. The business model
 * still requires that a carrier which is NOT a Mercenta account is REFUSED, and
 * that the refusal names the reason — so the two retired ids are declared here,
 * in the same single source of truth, purely so
 * `carrierEligibility`/`carrierRouting` can refuse them explicitly instead of
 * falling back to a generic "unknown carrier".
 *
 * They confer nothing: they are never selectable, never capable and never
 * operational.
 */
export const RETIRED_CARRIER_IDS: readonly string[] = ['fedex', 'bak'] as const;

/** Is this a carrier id Mercenta has RETIRED (never an account, never usable)? */
export function isRetiredCarrier(carrier: string | null | undefined): boolean {
  return !!carrier && RETIRED_CARRIER_IDS.includes(carrier);
}

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

/**
 * §WAVE 3 — DECLARED LANE CAPABILITY PER MERCENTA CARRIER ACCOUNT.
 *
 * Eligibility is a DERIVATION (see `src/lib/shipping/carrierEligibility.ts`):
 * declared capability × provider state × lane × freight term. Declaring the
 * capability HERE, once, is what stops eligibility collapsing back into a
 * hardcoded if/else inside a component.
 *
 * The values are NOT invented: they restate the canonical business model and the
 * existing account labels in this file — international → DHL (parcel/general),
 * UK domestic → Palletline (palletised freight). Nothing else is claimed, and a
 * consignment whose declared service is not covered is refused rather than
 * silently booked on an account that does not declare it.
 */
export const MERCENTA_CARRIER_LANE_CAPABILITY: Record<
  CarrierId,
  { lanes: readonly ShippingLane[]; services: readonly ('parcel' | 'palletised')[]; label: string }
> = {
  dhl: {
    lanes: ['international'],
    services: ['parcel'],
    label: 'International parcel / general freight (Mercenta DHL UK account)',
  },
  palletline: {
    lanes: ['uk_domestic'],
    services: ['palletised'],
    label: 'UK domestic palletised freight (Mercenta Palletline account)',
  },
  /* §P9 (programme decision 1) — REPOINTED: the `fedex` and `bak` entries
     ('Retired carrier — no Mercenta account, never eligible') are REMOVED from
     the capability table. Retired carriers are refused through the declared
     `RETIRED_CARRIER_IDS` refusal path instead, so the table describes ONLY the
     accounts Mercenta actually holds. */
};

export type ShippingCommercialTerms = typeof SHIPPING_COMMERCIAL_TERMS;

/**
 * §P12 — CHANNEL-GENERATED SHIPMENT LABELS: THE REGION RULE (declared once).
 *
 * The retail channel's `GetShipmentLabels` operation — *"Generate shipping labels
 * from Amazon"* — is offered in **one region only: NA** (programme
 * `docs/DASHBOARD_LOGISTICS_CLEANUP_PROGRAMME_2026-09-22.md` §3, and its
 * "never claim downloadable Amazon labels for UK/EU" rule). Mercenta operates the
 * UK/EU marketplaces, so the operation is NOT available to it, and the platform
 * must never claim a channel-generated label for a UK/EU consignment.
 *
 * Mercenta's OWN labels (the DHL / Palletline templates it issues as the account
 * holder) are unaffected — this rule governs the CHANNEL's label service only.
 *
 * It lives HERE, not in a component and not in a client, because it is a RULE
 * about the channel: both SP-API clients read this one declaration, so a client
 * cannot "succeed" at an operation the channel does not offer in this region.
 */
export type MarketplaceRegion = 'NA' | 'EU' | 'FE';

/** The ONLY region the channel's label generation covers. */
export const CHANNEL_SHIPMENT_LABEL_REGIONS: readonly MarketplaceRegion[] = ['NA'] as const;

/**
 * The channel's NA marketplace identifiers — declared explicitly so availability
 * is decided by a known id list rather than by "not obviously Europe", and an
 * UNKNOWN marketplace fails closed instead of defaulting to available.
 */
export const CHANNEL_NA_MARKETPLACE_IDS: readonly string[] = [
  /** amazon.com */
  'ATVPDKIKX0DER',
  /** amazon.ca */
  'A2EUQ1WTGCTBG2',
  /** amazon.com.mx */
  'A1AM78C64UM0Y8',
] as const;

/**
 * Marketplace id → region. The ONE mapping. `UK_MARKETPLACE_ID` is imported from
 * its existing canonical home rather than retyped, so the UK id cannot drift.
 */
export const MARKETPLACE_REGION_BY_ID: Record<string, MarketplaceRegion> = {
  [UK_MARKETPLACE_ID]: 'EU',
  ...Object.fromEntries(CHANNEL_NA_MARKETPLACE_IDS.map((id) => [id, 'NA' as MarketplaceRegion])),
};

/** The rule, stated once with its source, for surfaces and validators. */
export const CHANNEL_SHIPMENT_LABEL_RULE = {
  label: 'Channel-generated shipping labels',
  source:
    'GetShipmentLabels — the retail channel’s own label-generation operation. Regions: NA (only). Programme research table §3.',
  statement:
    'The retail channel generates shipment labels in NA only, so Mercenta never issues a channel-generated label for a UK/EU consignment. Mercenta issues its own carrier labels (DHL / Palletline) as the account holder.',
} as const;

/**
 * The region a marketplace belongs to — `'unknown'` when it is not declared,
 * which is REFUSED by `channelShipmentLabelsAvailability` rather than assumed.
 */
export function marketplaceRegion(
  marketplaceId: string | null | undefined
): MarketplaceRegion | 'unknown' {
  if (!marketplaceId) return 'unknown';
  return MARKETPLACE_REGION_BY_ID[marketplaceId] ?? 'unknown';
}

export interface ChannelShipmentLabelsAvailability {
  available: boolean;
  region: MarketplaceRegion | 'unknown';
  /** A stated reason either way — never a silent no-op. */
  reason: string;
}

/**
 * Whether the CHANNEL will generate shipment labels for this marketplace.
 *
 * FAIL CLOSED: only a positively-declared NA marketplace is available. A UK/EU
 * marketplace — and any marketplace this platform does not know — is refused,
 * naming the rule. This is a rule-driven refusal, not a provider error, so a
 * caller can present it truthfully.
 */
export function channelShipmentLabelsAvailability(
  marketplaceId: string | null | undefined
): ChannelShipmentLabelsAvailability {
  const region = marketplaceRegion(marketplaceId);
  if (region !== 'unknown' && CHANNEL_SHIPMENT_LABEL_REGIONS.includes(region)) {
    return {
      available: true,
      region,
      reason: `${CHANNEL_SHIPMENT_LABEL_RULE.label} are generated by the channel in ${region} — the operation is offered in this region. ${CHANNEL_SHIPMENT_LABEL_RULE.source}`,
    };
  }
  return {
    available: false,
    region,
    reason: `${region === 'unknown' ? 'MARKETPLACE_REGION_UNKNOWN' : 'LABELS_NOT_GENERATED_IN_REGION'} — ${CHANNEL_SHIPMENT_LABEL_RULE.statement} ${CHANNEL_SHIPMENT_LABEL_RULE.source}`,
  };
}
