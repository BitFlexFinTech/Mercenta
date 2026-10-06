/**
 * §PHASE 6 — THE INTERNAL CAPITAL MODEL BEHIND MODEL B (the ONE owner).
 *
 * Model B (buy / resell / distribution) means Mercenta pays the brand for the
 * goods and is repaid by the retail channel, so it needs working capital in the
 * window between the two. This is the single implementation of that arithmetic:
 * every figure the founder sees comes from here, so no screen re-derives an
 * advance, a fee, a repayment or a utilisation.
 *
 * DETERMINISTIC BY CONSTRUCTION — no AI, no external call, no clock. Financing is
 * an INTERNAL treasury concern: it is never exposed to a brand, and nothing here
 * is reachable from a brand session.
 *
 * Money discipline (the same rule as `src/lib/finance/commercialModel.ts`): every
 * figure is rounded to pennies through ONE helper, and the facility terms come
 * from `src/config/financing.ts` — never retyped here.
 */
import type { CapitalFacilityTerms } from '@/config/financing';
import { DEMO_MODEL_B_BRAND_B } from '@/lib/finance/commercialModel';

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

/**
 * §PHASE 6 — the share of a Model B channel receivable that is the brand
 * acquisition cost, DERIVED from the canonical demo Model B figures (never
 * retyped): the demo buys at £7,500 against a £10,000 receivable → 0.75. It is
 * used ONLY to illustrate the model against the demo's own purchase orders, whose
 * records do not (yet) carry a stored supplier cost; a real purchase would carry
 * its own supplier cost and this ratio would not be applied.
 */
export const MODEL_B_ACQUISITION_RATIO =
  DEMO_MODEL_B_BRAND_B.brandAcquisitionCostGbp / DEMO_MODEL_B_BRAND_B.retailChannelRevenueGbp;

/** One purchase Mercenta must fund (a Model B acquisition). */
export interface FinancedPurchase {
  id: string;
  brandId: string;
  /** Display name of the brand (optional). */
  brandName?: string;
  /** What the retail channel will pay Mercenta for the goods (the receivable). */
  channelReceivableGbp: number;
  /** What Mercenta must pay the brand to acquire the goods (the capital need). */
  supplierCostGbp: number;
}

/** The capital position of ONE purchase. */
export interface PurchaseCapital {
  id: string;
  brandId: string;
  brandName: string;
  channelReceivableGbp: number;
  supplierCostGbp: number;
  /** The capital the facility advances against the supplier cost. */
  advanceDrawnGbp: number;
  /** The financing fee on the drawn advance for the term. */
  financingFeeGbp: number;
  /** advance + fee — what is repaid when the channel settles. */
  expectedRepaymentGbp: number;
  /** receivable − supplier cost (the Model B gross commercial spread). */
  grossSpreadGbp: number;
  /** gross spread − financing fee (never called a net margin without the fee). */
  netMarginGbp: number;
}

/** The concentration of funding on ONE brand. */
export interface BrandConcentration {
  brandId: string;
  brandName: string;
  advanceGbp: number;
  /** The brand's share of the total advance drawn, as a percentage. */
  sharePct: number;
  /** True when the brand exceeds the facility's concentration limit. */
  breachesLimit: boolean;
}

/** The capital requirement over a set of purchases. */
export interface CapitalRequirement {
  /** False while the facility terms are an illustration (see the config owner). */
  configured: boolean;
  currency: string;
  facility: CapitalFacilityTerms;
  purchases: PurchaseCapital[];
  /** How many purchases are being financed. */
  outstandingFinancedPurchases: number;
  /** Σ supplier cost — the total capital the purchases need. */
  totalRequiredFundingGbp: number;
  /** Σ advance drawn. */
  totalAdvanceDrawnGbp: number;
  /** Σ financing fees. */
  totalFinancingFeesGbp: number;
  /**
   * available capital − total advance drawn. May be NEGATIVE — an over-committed
   * facility is STATED, never clamped to zero.
   */
  availableCapitalAfterGbp: number;
  /** total advance drawn ÷ facility capacity × 100. */
  facilityUtilisationPct: number;
  /** True when the advance drawn fits inside the facility capacity. */
  withinCapacity: boolean;
  /** Concentration by brand, largest first. */
  concentration: BrandConcentration[];
  /** Brands that exceed the concentration limit (may be empty). */
  concentrationBreaches: BrandConcentration[];
  /** Human-readable statement of what the figures mean. */
  basis: string;
}

/**
 * The capital position of ONE purchase. Pure — the same inputs always give the
 * same output, and no value is read from anywhere else.
 */
export function computePurchaseCapital(
  facility: CapitalFacilityTerms,
  purchase: FinancedPurchase
): PurchaseCapital {
  const channelReceivableGbp = round2(purchase.channelReceivableGbp);
  const supplierCostGbp = round2(purchase.supplierCostGbp);
  const advanceDrawnGbp = round2(supplierCostGbp * facility.advanceRate);
  const financingFeeGbp = round2((advanceDrawnGbp * facility.feeRatePctPerTerm) / 100);
  const expectedRepaymentGbp = round2(advanceDrawnGbp + financingFeeGbp);
  const grossSpreadGbp = round2(channelReceivableGbp - supplierCostGbp);
  const netMarginGbp = round2(grossSpreadGbp - financingFeeGbp);
  return {
    id: purchase.id,
    brandId: purchase.brandId,
    brandName: purchase.brandName ?? purchase.brandId,
    channelReceivableGbp,
    supplierCostGbp,
    advanceDrawnGbp,
    financingFeeGbp,
    expectedRepaymentGbp,
    grossSpreadGbp,
    netMarginGbp,
  };
}

/**
 * The capital requirement over a set of purchases. Every portfolio figure is a
 * sum (or ratio) of the per-purchase figures above, so the two can never
 * disagree. A brand's concentration is its share of the total advance drawn.
 */
export function computeCapitalRequirement(
  facility: CapitalFacilityTerms,
  purchases: FinancedPurchase[]
): CapitalRequirement {
  const rows = purchases.map((p) => computePurchaseCapital(facility, p));

  const totalRequiredFundingGbp = round2(rows.reduce((s, r) => s + r.supplierCostGbp, 0));
  const totalAdvanceDrawnGbp = round2(rows.reduce((s, r) => s + r.advanceDrawnGbp, 0));
  const totalFinancingFeesGbp = round2(rows.reduce((s, r) => s + r.financingFeeGbp, 0));
  const availableCapitalAfterGbp = round2(facility.availableCapitalGbp - totalAdvanceDrawnGbp);
  const facilityUtilisationPct =
    facility.facilityCapacityGbp > 0
      ? round2((totalAdvanceDrawnGbp / facility.facilityCapacityGbp) * 100)
      : 0;
  const withinCapacity = totalAdvanceDrawnGbp <= facility.facilityCapacityGbp;

  const byBrand = new Map<string, { brandName: string; advanceGbp: number }>();
  for (const r of rows) {
    const cur = byBrand.get(r.brandId) ?? { brandName: r.brandName, advanceGbp: 0 };
    cur.advanceGbp = round2(cur.advanceGbp + r.advanceDrawnGbp);
    byBrand.set(r.brandId, cur);
  }
  const concentration: BrandConcentration[] = [...byBrand.entries()]
    .map(([brandId, v]) => {
      const sharePct =
        totalAdvanceDrawnGbp > 0 ? round2((v.advanceGbp / totalAdvanceDrawnGbp) * 100) : 0;
      return {
        brandId,
        brandName: v.brandName,
        advanceGbp: v.advanceGbp,
        sharePct,
        breachesLimit: sharePct > facility.concentrationLimitPct,
      };
    })
    .sort((a, b) => b.advanceGbp - a.advanceGbp);

  const concentrationBreaches = concentration.filter((c) => c.breachesLimit);

  const basis = rows.length
    ? `${rows.length} purchase${rows.length === 1 ? '' : 's'} need £${totalRequiredFundingGbp.toFixed(
        2
      )}; the facility advances £${totalAdvanceDrawnGbp.toFixed(2)} at ${
        facility.advanceRate * 100
      }% against supplier cost, plus £${totalFinancingFeesGbp.toFixed(2)} in fees = £${round2(
        totalAdvanceDrawnGbp + totalFinancingFeesGbp
      ).toFixed(2)} to repay when the channel settles. Utilisation is ${facilityUtilisationPct.toFixed(
        1
      )}% of a £${facility.facilityCapacityGbp.toFixed(2)} facility.${
        concentrationBreaches.length
          ? ` ${concentrationBreaches.length} brand(s) exceed the ${facility.concentrationLimitPct}% concentration limit.`
          : ''
      }`
    : 'No Model B purchase is currently being financed, so the facility is undrawn.';

  return {
    configured: facility.configured,
    currency: facility.currency,
    facility,
    purchases: rows,
    outstandingFinancedPurchases: rows.length,
    totalRequiredFundingGbp,
    totalAdvanceDrawnGbp,
    totalFinancingFeesGbp,
    availableCapitalAfterGbp,
    facilityUtilisationPct,
    withinCapacity,
    concentration,
    concentrationBreaches,
    basis,
  };
}

/** £ formatting for a surface — ONE helper so every money figure reads the same. */
export function formatGbp(n: number): string {
  return `£${round2(n).toLocaleString('en-GB', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

