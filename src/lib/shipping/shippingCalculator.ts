/**
 * §Batch-14 — Shipping cost estimate calculator.
 *
 * Computes estimated carrier costs from weight/volume/carton-count inputs
 * using built-in mock rates (placeholder until real carrier rate cards are
 * loaded). The markup layer applies the admin-configured CarrierMarkupConfig
 * to produce the brand-facing price.
 *
 * Mock rate tables approximate real UK domestic and EU-origin commercial
 * parcel/pallet pricing. DHL is the primary parcel carrier; Palletline is
 * the dedicated palletised-freight option (Amazon IPCP).
 */
import type {
  CarrierId,
  ShippingCommercialBreakdown,
  ShippingEstimate,
  ShippingEstimateInput,
  ShippingLane,
  ShippingMargin,
} from '@/types';
import { demoCarrierMarkup } from '@/data/demoStore';
import { SHIPPING_COMMERCIAL_TERMS } from '@/config/shipping';

/* ── Mock carrier rate tables ─────────────────────────────────────── */

/** Per-kg rate bands for DHL Express (UK domestic / EU origin). */
function mockDhlRate(totalWeightKg: number, totalCbm: number): number {
  const base = 12.50;
  const perKg = totalWeightKg * 1.85;
  const volumeFactor = Math.max(0, (totalCbm * 250) - totalWeightKg * 1.2);
  return base + perKg + volumeFactor;
}

/** FedEx International Economy rates (approximate). */
function mockFedExRate(totalWeightKg: number, totalCbm: number): number {
  const base = 18.00;
  const perKg = totalWeightKg * 2.10;
  const volWeight = totalCbm * 200;
  const chargeable = Math.max(totalWeightKg, volWeight);
  return base + chargeable * 2.10;
}

/** BAK Logistics consolidated sea-freight rates (long lead time, bulk). */
function mockBakRate(totalWeightKg: number, totalCbm: number): number {
  const base = 45.00;
  const perCbm = totalCbm * 85;
  const perKg = totalWeightKg * 0.35;
  return base + perCbm + perKg;
}

/** Palletline IPCP palletised-freight rates (per pallet + per-kg above threshold). */
function mockPalletlineRate(palletCount: number, totalWeightKg: number): number {
  const perPallet = 38.00;
  const palletBase = palletCount * perPallet;
  // Excess weight charge above 500kg per pallet
  const excessPerPallet = Math.max(0, (totalWeightKg / palletCount) - 500) * 0.12;
  return palletBase + excessPerPallet * palletCount + 15.00; // booking fee
}

/* ── Default markup config ────────────────────────────────────────── */

const DEFAULT_MARKUP_PERCENTAGE = 0.07; // 7% default mark-up from carrier cost

/**
 * Get active markup rate for a given carrier.
 * Reads from the admin-configurable CarrierMarkupConfig list in demoStore.
 * Falls back to per-carrier config, then global default, then hardcoded 7%.
 */
export function getMarkupRate(carrier: CarrierId): number {
  // Try carrier-specific config first
  const carrierConfig = demoCarrierMarkup.find((m) => m.carrier === carrier && m.active);
  if (carrierConfig) {
    return carrierConfig.markupType === 'percentage' ? carrierConfig.markupValue : 0;
  }
  // Fall back to global default
  const globalConfig = demoCarrierMarkup.find((m) => m.carrier === 'global' && m.active);
  if (globalConfig) {
    return globalConfig.markupType === 'percentage' ? globalConfig.markupValue : 0;
  }
  return DEFAULT_MARKUP_PERCENTAGE;
}

/* ── Main calculator ──────────────────────────────────────────────── */

export function computeShippingEstimate(input: ShippingEstimateInput): ShippingEstimate {
  const { carrier, totalWeightKg, totalCbm, cartonCount, palletised, palletCount } = input;
  let baseCarrierCost: number;

  switch (carrier) {
    case 'dhl':
      baseCarrierCost = mockDhlRate(totalWeightKg, totalCbm);
      break;
    case 'fedex':
      baseCarrierCost = mockFedExRate(totalWeightKg, totalCbm);
      break;
    case 'bak':
      baseCarrierCost = mockBakRate(totalWeightKg, totalCbm);
      break;
    case 'palletline': {
      const pc = palletCount ?? Math.max(1, Math.ceil(cartonCount / 8));
      baseCarrierCost = mockPalletlineRate(pc, totalWeightKg);
      break;
    }
    default:
      baseCarrierCost = mockDhlRate(totalWeightKg, totalCbm);
  }

  const markupRate = getMarkupRate(carrier);
  const markupApplied = Math.round(baseCarrierCost * markupRate * 100) / 100;
  const brandPrice = Math.round((baseCarrierCost + markupApplied) * 100) / 100;

  return {
    baseCarrierCost: Math.round(baseCarrierCost * 100) / 100,
    markupApplied,
    brandPrice,
    currency: 'GBP',
    carrier,
    mockRate: true,
  };
}

/**
 * Record a shipping margin ledger entry from an actual shipment.
 * This is called when a shipment is created so the margin between carrier
 * cost and brand-billed price is tracked.
 */
export function buildShippingMargin(
  shipmentId: string,
  brandId: string,
  carrier: string,
  carrierCostPrice: number,
  brandBilledPrice: number,
): ShippingMargin {
  return {
    id: `sm-${shipmentId}`,
    shipmentId,
    brandId,
    carrier,
    carrierCostPrice,
    brandBilledPrice,
    createdAt: new Date().toISOString(),
  };
}

/* ── §12 Canonical shipping commercial model ──────────────────────────── */

const round2 = (n: number) => Math.round(n * 100) / 100;

/**
 * Compute the FULL shipping commercial breakdown for a lane/carrier and its
 * carrier LIST cost.
 *
 * This is the canonical model: it keeps BOTH sides of the transaction — the
 * carrier list cost, the negotiated discount, what Mercenta actually pays the
 * carrier, the brand-facing charge, fees/surcharge and the VAT treatment —
 * and derives the shipping margin. It NEVER overwrites the carrier cost with
 * the customer price.
 *
 * The terms live in `src/config/shipping.ts` (per-carrier negotiated discount,
 * mark-up, fees, VAT) and are all placeholder-configurable pending sign-off.
 * Nothing here assumes a fixed mark-up such as "90%".
 */
export function computeShippingCommercials(input: {
  lane: ShippingLane;
  carrier: CarrierId;
  /** Carrier list cost (pre-discount). Use computeShippingEstimate().baseCarrierCost. */
  carrierListCost: number;
  /** Whether the carrier cost is a mock rate (defaults to true in simulation). */
  mockRate?: boolean;
}): ShippingCommercialBreakdown {
  const terms = SHIPPING_COMMERCIAL_TERMS;
  const { lane, carrier } = input;

  const carrierListCost = round2(Math.max(0, input.carrierListCost));
  const negotiatedDiscountPct = terms.negotiatedDiscountPct[carrier] ?? 0;
  const negotiatedDiscountAmount = round2(carrierListCost * negotiatedDiscountPct);
  const carrierInvoiceCost = round2(carrierListCost - negotiatedDiscountAmount);

  const markUpAmount = round2(carrierInvoiceCost * (terms.markUpPct[carrier] ?? 0));
  const surchargeAmount = round2(carrierInvoiceCost * terms.surchargePct);
  const handlingFee = round2(terms.handlingFeeGbp);

  const brandAmountCharged = round2(
    carrierInvoiceCost + markUpAmount + surchargeAmount + handlingFee
  );

  const vatTreatment = terms.vatTreatment;
  const vatRate = vatTreatment === 'standard' ? terms.vatRate : 0;
  const vatAmount = round2(brandAmountCharged * vatRate);
  const brandAmountChargedIncVat = round2(brandAmountCharged + vatAmount);

  const inputVatRecoverable = round2(carrierInvoiceCost * vatRate);
  const vatPayableToHmrc = round2(vatAmount - inputVatRecoverable);

  const grossShippingMargin = round2(brandAmountCharged - carrierInvoiceCost);
  const netMercentaRevenue = round2(grossShippingMargin - vatPayableToHmrc);

  return {
    carrier,
    lane,
    carrierListCost,
    negotiatedDiscountPct,
    negotiatedDiscountAmount,
    carrierInvoiceCost,
    markUpAmount,
    surchargeAmount,
    handlingFee,
    brandAmountCharged,
    vatTreatment,
    vatRate,
    vatAmount,
    inputVatRecoverable,
    vatPayableToHmrc,
    brandAmountChargedIncVat,
    grossShippingMargin,
    netMercentaRevenue,
    currency: 'GBP',
    mockRate: input.mockRate ?? true,
    placeholderTerms: terms.placeholder,
  };
}
