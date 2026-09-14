/**
 * §18/M12 — AMAZON SALES ESTIMATOR + §17 BORN-TO-RUN MODELLING.
 *
 * WHAT THIS IS: a deterministic estimation engine that turns the product/market
 * inputs a brand actually knows (category, price, competitor count, reviews,
 * pack size, launch state) into an ESTIMATED monthly sales range and the
 * resulting Mercenta economics.
 *
 * WHAT IT IS NOT:
 *   • it is NOT measured Amazon data. Nothing here is presented as actual sales,
 *     and every result carries `basis: 'simulated_estimate'` + a disclaimer
 *     (`amazonWording.ts → ESTIMATE_DISCLAIMER`);
 *   • it is NOT an Amazon programme application. The Born-to-Run model only
 *     IDENTIFIES opportunities and projects demand/quantities/economics. It does
 *     not submit anything to Amazon, and it declares
 *     `programmeStatus: 'not_confirmed_with_amazon'` + `tosVerificationRequired`.
 *
 * SEAMS (mock-first, §25):
 *   • ASIN-level evidence comes from the EXISTING canonical Amazon data seam
 *     (`discoveryClient.createAmazonDataClient()`), never a parallel one;
 *   • the live data providers are the registered `keepa` / `amazon_sp_api`
 *     integrations, resolved through the canonical fail-closed
 *     `resolveProviderMode` + `isProviderSimulationSafe`. This build NEVER claims
 *     a live data connection it does not have.
 */
import type { IntegrationId } from '@/integrations/types';
import {
  isProviderSimulationSafe,
  resolveProviderMode,
  type IntegrationMode,
  type ProviderResolutionMode,
} from '@/integrations/types';
import { defaultIntegrationMode } from '@/integrations/registry';
import { createAmazonDataClient } from './discoveryClient';
import type { BrandProspect, ProspectASIN } from '@/types';
import type { CommercialModel } from '@/config/commercialModel';
import {
  DEMO_ACQUISITION_SHARE_PCT,
  DEMO_COMMISSION_RATE_PCT,
} from '@/config/commercialModel';
import {
  computeBuyResellModel,
  computeCommissionModel,
} from '@/lib/finance/commercialModel';
import {
  AMAZON_NO_APPROVAL_CLAIM,
  AMAZON_PROGRAMME_STATUS,
  AMAZON_TOS_VERIFICATION_NOTE,
  AMAZON_TOS_VERIFICATION_REQUIRED,
  ESTIMATE_DISCLAIMER,
} from './amazonWording';

/** The providers that could supply real sales/rank data, in preference order. */
export const SALES_DATA_PROVIDERS: readonly IntegrationId[] = ['keepa', 'amazon_sp_api'] as const;

/**
 * Category baselines — ESTIMATED monthly ORDER velocity for a listing that is
 * "typical" for its category in the UK. Illustrative planning constants for the
 * estimator, declared in ONE place and never presented as measured data.
 */
export const CATEGORY_BASELINE_MONTHLY_UNITS: Record<string, number> = {
  'Health & Personal Care': 420,
  Home: 260,
  Baby: 310,
  'Office Products': 190,
  Kitchen: 280,
  'Consumer Electronics': 160,
  Automotive: 150,
  Grocery: 520,
  'Personal Computer': 120,
  Apparel: 480,
};

/** Used when a category has no baseline — deliberately conservative. */
export const DEFAULT_BASELINE_MONTHLY_UNITS = 200;

/** How wide the estimate band is (fraction of the midpoint). */
export const ESTIMATE_BAND_PCT = 0.35;

/** A DECLARED fact: results are estimates, not measurements. */
export const SALES_ESTIMATE_BASIS = 'simulated_estimate' as const;

export type EstimateConfidence = 'low' | 'medium' | 'high';

const round2 = (n: number): number => Math.round(n * 100) / 100;
const roundInt = (n: number): number => Math.max(0, Math.round(n));
const clamp = (n: number, lo: number, hi: number): number => Math.max(lo, Math.min(hi, n));

/** A provider's truthful mode: caller-supplied map first, else the app default. */
export function salesDataProviderMode(
  provider: IntegrationId,
  modes?: Partial<Record<IntegrationId, IntegrationMode>>
): ProviderResolutionMode {
  return modes ? resolveProviderMode(modes, provider) : defaultIntegrationMode(provider);
}

/** True only when EVERY sales-data provider is POSITIVELY simulation. */
export function salesEstimationIsFullySimulated(
  modes?: Partial<Record<IntegrationId, IntegrationMode>>
): boolean {
  return SALES_DATA_PROVIDERS.every((p) => isProviderSimulationSafe(salesDataProviderMode(p, modes)));
}

export interface SalesEstimateInput {
  /** Approved category (drives the baseline velocity). */
  category: string;
  /** Retail price per unit in GBP. */
  priceGbp: number;
  /** How many competing listings the brand/operator observes. */
  competitorCount?: number;
  /** Reviews on the brand's own most relevant listing, if any. */
  reviewCount?: number;
  /** Units per sale — the estimate is returned per ORDER multiplied by pack size. */
  packSize?: number;
  /** 1 = brand-new listing, 5 = firmly established. Defaults to 3. */
  listingMaturity?: number;
}

export interface SalesEstimate {
  category: string;
  priceGbp: number;
  packSize: number;
  estimatedMonthlyOrders: { low: number; mid: number; high: number };
  estimatedMonthlyUnits: { low: number; mid: number; high: number };
  estimatedMonthlyRevenueGbp: { low: number; mid: number; high: number };
  estimatedAnnualRevenueGbp: { low: number; mid: number; high: number };
  confidence: EstimateConfidence;
  /** Why the confidence is what it is — never a bare number. */
  confidenceReason: string;
  /** Always `simulated_estimate`. */
  basis: typeof SALES_ESTIMATE_BASIS;
  estimateLabel: string;
  disclaimers: string[];
  dataSource: 'simulated_dataset';
  /** The truthful mode of each registered live provider (never claimed live). */
  providerModes: { provider: string; mode: ProviderResolutionMode; live: boolean }[];
  /** True only when a live provider could be used AND this build supports it. */
  liveDataUsed: false;
}

/** The truthful provider modes, for display next to the estimate. */
export function salesDataProviderModes(
  modes?: Partial<Record<IntegrationId, IntegrationMode>>
): SalesEstimate['providerModes'] {
  return SALES_DATA_PROVIDERS.map((provider) => ({
    provider,
    mode: salesDataProviderMode(provider, modes),
    // This build has no live estimator transport, so no provider is reported
    // live even if it is configured. Never fake a live data connection.
    live: false,
  }));
}

/**
 * §18 — the estimator itself. Deterministic: same inputs ⇒ same estimate, no
 * clock, no randomness, no network.
 *
 * The model is deliberately simple and EXPLAINED, because an unexplained number
 * is indistinguishable from a made-up one:
 *   baseline (category) → competition/review/maturity/price adjustments → band.
 */
export function estimateAmazonSales(input: SalesEstimateInput): SalesEstimate {
  const packSize = Math.max(1, Math.round(input.packSize ?? 1));
  const priceGbp = Math.max(0, round2(input.priceGbp));
  const baseline =
    CATEGORY_BASELINE_MONTHLY_UNITS[input.category] ?? DEFAULT_BASELINE_MONTHLY_UNITS;
  const competitorCount = Math.max(0, input.competitorCount ?? 0);
  const reviewCount = Math.max(0, input.reviewCount ?? 0);
  const maturity = clamp(input.listingMaturity ?? 3, 1, 5);

  // Competition: more competing listings ⇒ lower share for our brand.
  const competitionFactor = clamp(1 / (1 + competitorCount / 25), 0.25, 1);
  // Reviews: social proof scales demand, with a soft ceiling.
  const reviewFactor = clamp(0.7 + Math.min(1, Math.log10(reviewCount + 1) / 2.2), 0.7, 1.4);
  // Maturity: a brand-new listing sells less than an established one.
  const maturityFactor = 0.55 + (maturity - 1) * 0.15;
  // Price: demand is price-sensitive, but a premium price is not 0 demand.
  const priceFactor = clamp(1 / (1 + Math.max(0, priceGbp - 20) / 45), 0.35, 1.15);

  const mid = roundInt(baseline * competitionFactor * reviewFactor * maturityFactor * priceFactor);
  const low = roundInt(mid * (1 - ESTIMATE_BAND_PCT));
  const high = roundInt(mid * (1 + ESTIMATE_BAND_PCT));

  const revenue = (orders: number) => round2(orders * packSize * priceGbp);

  // Confidence is driven by how much real evidence supports the inputs.
  const evidencePoints =
    (competitorCount > 0 ? 1 : 0) + (reviewCount > 0 ? 1 : 0) + (maturity >= 3 ? 1 : 0);
  const confidence: EstimateConfidence =
    evidencePoints >= 3 ? 'high' : evidencePoints === 2 ? 'medium' : 'low';
  const confidenceReason =
    evidencePoints >= 3
      ? 'Competition, review and maturity inputs were all supplied, so the band is anchored on three real signals.'
      : evidencePoints === 2
        ? 'Two of three anchors (competition, reviews, maturity) were supplied; the estimate is moderately anchored.'
        : 'Fewer than two anchor inputs were supplied, so the estimate relies mostly on the category baseline. Treat it as a planning range only.';

  return {
    category: input.category,
    priceGbp,
    packSize,
    estimatedMonthlyOrders: { low, mid, high },
    estimatedMonthlyUnits: { low: low * packSize, mid: mid * packSize, high: high * packSize },
    estimatedMonthlyRevenueGbp: { low: revenue(low), mid: revenue(mid), high: revenue(high) },
    estimatedAnnualRevenueGbp: {
      low: revenue(low * 12),
      mid: revenue(mid * 12),
      high: revenue(high * 12),
    },
    confidence,
    confidenceReason,
    basis: SALES_ESTIMATE_BASIS,
    estimateLabel: 'Estimated sales range — modelled projection, not Amazon data',
    disclaimers: [
      ESTIMATE_DISCLAIMER,
      `Data source: simulated planning dataset (${SALES_DATA_PROVIDERS.join(' / ')} providers are not connected in this build).`,
      AMAZON_TOS_VERIFICATION_REQUIRED ? AMAZON_TOS_VERIFICATION_NOTE : '',
    ].filter(Boolean),
    dataSource: 'simulated_dataset',
    providerModes: salesDataProviderModes(),
    liveDataUsed: false,
  };
}

/**
 * §18/§25 — estimate from a STORED prospect, using the canonical Amazon data
 * seam for ASIN-level evidence. Deterministic and offline: the mock Amazon data
 * client reads the seed dataset, so the same prospect always yields the same
 * estimate. `liveDataUsed` stays false — the seam reports its own truth.
 */
export async function estimateFromProspect(
  prospect: BrandProspect
): Promise<SalesEstimate & { asinEvidenceCount: number; amazonDataMode: 'mock' | 'live' }> {
  const client = createAmazonDataClient();
  let asins: ProspectASIN[] = [];
  try {
    asins = await client.searchBrand(prospect.brand, {
      maxBrands: 25,
      maxAsinsPerBrand: 10,
      minBsr: 0,
      requiredCategories: [],
    } as never);
  } catch {
    asins = [];
  }
  // Prefer the prospect's own stored ASINs when the seam returns nothing.
  const evidence = asins.length ? asins : (prospect.asins ?? []);
  const price =
    evidence.length > 0
      ? round2(evidence.reduce((sum, a) => sum + (a.price ?? 0), 0) / evidence.length)
      : 20;
  const reviews = evidence.reduce((sum, a) => sum + (a.reviewCount ?? 0), 0);
  const competitors = evidence.reduce((sum, a) => sum + (a.sellerCount ?? 0), 0);
  const estimate = estimateAmazonSales({
    category: prospect.category,
    priceGbp: price,
    competitorCount: competitors,
    reviewCount: reviews,
    packSize: 1,
    listingMaturity: evidence.length ? 3 : 2,
  });
  return {
    ...estimate,
    asinEvidenceCount: evidence.length,
    amazonDataMode: client.mode,
  };
}

/* ── §17 — BORN TO RUN OPPORTUNITY MODELLING (simulation only) ───────────── */

export interface BornToRunInput extends SalesEstimateInput {
  /** True when the brand/product already sells on the retail channel. */
  currentlyOnAmazon?: boolean;
  /** Which commercial model's economics to project. */
  model?: CommercialModel;
}

export type BornToRunEconomics =
  | {
      model: 'commission_agent';
      retailChannelRevenueGbp: number;
      mercentaCommissionGbp: number;
      brandAmountGbp: number;
      formula: string;
    }
  | {
      model: 'buy_resell';
      retailChannelRevenueGbp: number;
      brandAcquisitionCostGbp: number;
      grossCommercialSpreadGbp: number;
      netMercentaMarginGbp: number;
      formula: string;
    };

export interface BornToRunOpportunity {
  /** True when the brand has no current retail-channel offer. */
  newToAmazon: boolean;
  estimate: SalesEstimate;
  projectedInitialMonthlyOrders: number;
  /** A launch-ready first quantity (the top of the estimated band). */
  suggestedLaunchQuantity: number;
  estimatedLaunchRevenueGbp: number;
  economics: BornToRunEconomics;
  /**
   * ALWAYS `not_confirmed_with_amazon`: Mercenta does not represent an Amazon
   * programme as a guaranteed service and does not claim Amazon approval.
   */
  programmeStatus: typeof AMAZON_PROGRAMME_STATUS;
  /** TRUE until the current Vendor terms/account agreement are verified. */
  tosVerificationRequired: true;
  tosNote: string;
  /** Everything here is simulation — no submission to Amazon happens, ever. */
  simulated: true;
  disclaimers: string[];
}

/**
 * §17 — model the "new to the retail channel" opportunity for a product.
 *
 * It IDENTIFIES and PROJECTS; it does not submit anything to Amazon and does not
 * claim a programme place. The economics come from the canonical commercial-model
 * arithmetic, so they cannot disagree with any other screen.
 */
export function modelBornToRunOpportunity(input: BornToRunInput): BornToRunOpportunity {
  const estimate = estimateAmazonSales(input);
  const projectedInitialMonthlyOrders = estimate.estimatedMonthlyOrders.mid;
  const suggestedLaunchQuantity = Math.max(1, estimate.estimatedMonthlyOrders.high);
  const estimatedLaunchRevenueGbp = round2(
    suggestedLaunchQuantity * estimate.packSize * estimate.priceGbp
  );
  const model: CommercialModel = input.model ?? 'commission_agent';
  const economics: BornToRunEconomics =
    model === 'commission_agent'
      ? (() => {
          const r = computeCommissionModel({
            retailChannelRevenueGbp: estimatedLaunchRevenueGbp,
            commissionRatePct: DEMO_COMMISSION_RATE_PCT,
          });
          return {
            model: 'commission_agent' as const,
            retailChannelRevenueGbp: r.retailChannelRevenueGbp,
            mercentaCommissionGbp: r.mercentaCommissionGbp,
            brandAmountGbp: r.brandAmountGbp,
            formula: r.formula,
          };
        })()
      : (() => {
          const r = computeBuyResellModel({
            retailChannelRevenueGbp: estimatedLaunchRevenueGbp,
            brandAcquisitionCostGbp:
              (estimatedLaunchRevenueGbp * DEMO_ACQUISITION_SHARE_PCT) / 100,
            carrierCostGbp: round2(estimatedLaunchRevenueGbp * 0.006),
            paymentFeesGbp: round2(estimatedLaunchRevenueGbp * 0.012),
            otherAgreedFeesGbp: round2(estimatedLaunchRevenueGbp * 0.005),
            deductionsGbp: 0,
          });
          return {
            model: 'buy_resell' as const,
            retailChannelRevenueGbp: r.retailChannelRevenueGbp,
            brandAcquisitionCostGbp: r.brandAcquisitionCostGbp,
            grossCommercialSpreadGbp: r.grossCommercialSpreadGbp,
            netMercentaMarginGbp: r.netMercentaMarginGbp,
            formula: r.formula,
          };
        })();

  return {
    newToAmazon: input.currentlyOnAmazon !== true,
    estimate,
    projectedInitialMonthlyOrders,
    suggestedLaunchQuantity,
    estimatedLaunchRevenueGbp,
    economics,
    programmeStatus: AMAZON_PROGRAMME_STATUS,
    tosVerificationRequired: true,
    tosNote: AMAZON_TOS_VERIFICATION_NOTE,
    simulated: true,
    disclaimers: [
      'Simulation only: no application, submission or listing is created, and nothing is sent to Amazon by this model.',
      AMAZON_NO_APPROVAL_CLAIM,
      AMAZON_TOS_VERIFICATION_NOTE,
      ESTIMATE_DISCLAIMER,
    ],
  };
}