/**
 * §Canonical model §3/§25 — THE TWO COMMERCIAL MODELS, COMPUTED.
 *
 * The single implementation of each commercial model's arithmetic. Both models
 * are expressed as pure functions over canonical inputs, so the investor demo,
 * any admin surface and any future reporting all read the SAME numbers from the
 * SAME code — no screen re-derives a margin locally.
 *
 * Money discipline:
 *   • every figure is rounded to pennies through one helper;
 *   • the VAT figures come from `src/config/vat.ts` and are labelled as the DEMO
 *     ILLUSTRATION — never as a production tax determination;
 *   • the shipping illustration is DERIVED from the canonical
 *     `computeShippingCommercials` + `SHIPPING_COMMERCIAL_TERMS`, so the
 *     negotiated discount / mark-up exist in exactly one place.
 */
import type { CommercialModel } from '@/config/commercialModel';
import { computeVat, DEMO_VAT_ILLUSTRATION, type VatBreakdown } from '@/config/vat';
import { computeShippingCommercials } from '@/lib/shipping/shippingCalculator';

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

function illustrativeVat(netGbp: number, ratePct?: number): VatBreakdown {
  return computeVat({
    netGbp,
    treatment: DEMO_VAT_ILLUSTRATION.treatment,
    ratePct: ratePct ?? DEMO_VAT_ILLUSTRATION.ratePct,
  });
}

/* ── Model A — commission / agent-style ──────────────────────────────────── */

export interface CommissionModelInput {
  /** The retail-channel PO value (what the channel pays Mercenta). */
  retailChannelRevenueGbp: number;
  /** The agreed Mercenta commission rate, as a PERCENTAGE. */
  commissionRatePct: number;
  /** Demo VAT rate for the illustration (defaults to the standard UK rate). */
  vatRatePct?: number;
}

export interface CommissionModelResult {
  model: Extract<CommercialModel, 'commission_agent'>;
  retailChannelRevenueGbp: number;
  commissionRatePct: number;
  mercentaCommissionGbp: number;
  brandAmountGbp: number;
  /** VAT illustration applied to the COMMISSION Mercenta charges. */
  vat: VatBreakdown;
  formula: string;
}

/**
 * Model A: Mercenta retains an agreed commission; the remainder is the brand's
 * economic amount.
 */
export function computeCommissionModel(input: CommissionModelInput): CommissionModelResult {
  const retailChannelRevenueGbp = round2(input.retailChannelRevenueGbp);
  const mercentaCommissionGbp = round2(
    (retailChannelRevenueGbp * input.commissionRatePct) / 100
  );
  const brandAmountGbp = round2(retailChannelRevenueGbp - mercentaCommissionGbp);
  return {
    model: 'commission_agent',
    retailChannelRevenueGbp,
    commissionRatePct: input.commissionRatePct,
    mercentaCommissionGbp,
    brandAmountGbp,
    vat: illustrativeVat(mercentaCommissionGbp, input.vatRatePct),
    formula: `£${retailChannelRevenueGbp.toFixed(2)} retail-channel PO × ${
      input.commissionRatePct
    }% = £${mercentaCommissionGbp.toFixed(2)} Mercenta commission; £${brandAmountGbp.toFixed(
      2
    )} is the brand's economic amount.`,
  };
}

/* ── Model B — buy / resell / distribution ───────────────────────────────── */

export interface BuyResellModelInput {
  /** What the retail channel pays Mercenta for the goods. */
  retailChannelRevenueGbp: number;
  /** What Mercenta pays the brand to acquire the goods. */
  brandAcquisitionCostGbp: number;
  /** Carrier cost borne by Mercenta (from the shipping commercial model). */
  carrierCostGbp?: number;
  /** Payment-processing fees. */
  paymentFeesGbp?: number;
  /** Any other agreed fee between Mercenta and the brand. */
  otherAgreedFeesGbp?: number;
  /** Deductions/chargebacks that reduce the realised revenue. */
  deductionsGbp?: number;
  vatRatePct?: number;
}

export interface BuyResellModelResult {
  model: Extract<CommercialModel, 'buy_resell'>;
  retailChannelRevenueGbp: number;
  brandAcquisitionCostGbp: number;
  /** retail-channel revenue − brand acquisition cost. */
  grossCommercialSpreadGbp: number;
  costs: {
    carrierCostGbp: number;
    paymentFeesGbp: number;
    otherAgreedFeesGbp: number;
    deductionsGbp: number;
  };
  totalAdditionalCostsGbp: number;
  /** gross spread − additional costs. */
  netMercentaMarginGbp: number;
  /** VAT illustration applied to the gross commercial spread. */
  vat: VatBreakdown;
  formula: string;
}

/**
 * Model B: Mercenta acquires the goods and resells them. The gross commercial
 * spread is stated FIRST, then every additional cost is deducted SEPARATELY so
 * no cost is ever hidden inside the margin.
 */
export function computeBuyResellModel(input: BuyResellModelInput): BuyResellModelResult {
  const retailChannelRevenueGbp = round2(input.retailChannelRevenueGbp);
  const brandAcquisitionCostGbp = round2(input.brandAcquisitionCostGbp);
  const grossCommercialSpreadGbp = round2(retailChannelRevenueGbp - brandAcquisitionCostGbp);
  const costs = {
    carrierCostGbp: round2(input.carrierCostGbp ?? 0),
    paymentFeesGbp: round2(input.paymentFeesGbp ?? 0),
    otherAgreedFeesGbp: round2(input.otherAgreedFeesGbp ?? 0),
    deductionsGbp: round2(input.deductionsGbp ?? 0),
  };
  const totalAdditionalCostsGbp = round2(
    costs.carrierCostGbp +
      costs.paymentFeesGbp +
      costs.otherAgreedFeesGbp +
      costs.deductionsGbp
  );
  const netMercentaMarginGbp = round2(grossCommercialSpreadGbp - totalAdditionalCostsGbp);
  return {
    model: 'buy_resell',
    retailChannelRevenueGbp,
    brandAcquisitionCostGbp,
    grossCommercialSpreadGbp,
    costs,
    totalAdditionalCostsGbp,
    netMercentaMarginGbp,
    vat: illustrativeVat(grossCommercialSpreadGbp, input.vatRatePct),
    formula:
      `£${retailChannelRevenueGbp.toFixed(2)} retail-channel revenue − £${brandAcquisitionCostGbp.toFixed(
        2
      )} brand acquisition cost = £${grossCommercialSpreadGbp.toFixed(
        2
      )} gross commercial spread; − £${totalAdditionalCostsGbp.toFixed(
        2
      )} additional costs = £${netMercentaMarginGbp.toFixed(2)} net Mercenta margin.`,
  };
}

/* ── §25 — the investor-demo figures, DERIVED (never retyped) ────────────── */

/**
 * Brand A on Model A: a £10,000 retail-channel PO at a 20% commission.
 * → £2,000 Mercenta commission, £8,000 brand economic amount.
 */
export const DEMO_MODEL_A_BRAND_A = computeCommissionModel({
  retailChannelRevenueGbp: 10_000,
  commissionRatePct: 20,
});

/**
 * Brand B on Model B: £10,000 retail-channel revenue on a £7,500 acquisition.
 * → £2,500 gross commercial spread, then costs shown separately.
 */
export const DEMO_MODEL_B_BRAND_B = computeBuyResellModel({
  retailChannelRevenueGbp: 10_000,
  brandAcquisitionCostGbp: 7_500,
  carrierCostGbp: 60,
  paymentFeesGbp: 120,
  otherAgreedFeesGbp: 50,
  deductionsGbp: 0,
});

/**
 * §12/§25 shipping illustration, DERIVED from the canonical commercial terms:
 * carrier list £100 → 40% negotiated discount → £60 carrier cost → 50% mark-up
 * → £90 brand charge → £30 gross shipping margin.
 */
export function demoShippingCommercialExample() {
  return computeShippingCommercials({
    lane: 'international',
    carrier: 'dhl',
    carrierListCost: 100,
  });
}

/** §25 — which demo brand runs which model (investor-visible). */
export const DEMO_BRAND_COMMERCIAL_MODELS = {
  brandA: 'commission_agent',
  brandB: 'buy_resell',
} as const satisfies Record<string, CommercialModel>;
