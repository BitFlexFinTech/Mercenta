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
import type { CarrierId, ShippingEstimate, ShippingEstimateInput, ShippingMargin } from '@/types';
import { demoCarrierMarkup } from '@/data/demoStore';

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