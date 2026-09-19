/**
 * §Functional-completion (2026-09-17) — Automated Listing Analyzer (§8).
 * DETERMINISTIC, brand-facing catalogue analysis. Reuses the canonical
 * salesEstimator (estimateAmazonSales) and productCompleteness engines —
 * it is NOT a second estimation/scoring engine. Same inputs ⇒ same
 * analysis, no clock, no network, no AI call. Workflow: Mercenta prepares
 * the analysis → the brand approves / edits / rejects each suggestion.
 * Every marketplace figure is an ESTIMATE over a simulated dataset.
 */
import {
  estimateAmazonSales,
  SALES_ESTIMATE_BASIS,
} from '@/lib/intelligence/salesEstimator';
import { evaluateProductCompleteness } from '@/lib/catalog/productCompleteness';
import type {
  ListingDimensionScore,
  ListingRecommendation,
  ProductListingAnalysis,
} from '@/types';

/** Stable 0..1 hash — deterministic across processes. */
function hashUnit(key: string): number {
  let h = 2166136261;
  for (let i = 0; i < key.length; i++) {
    h ^= key.charCodeAt(i);
    h = (h * 16777619) & 0xffffffff;
  }
  return (h % 100000) / 100000;
}

const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v));
const round2 = (n: number) => Math.round(n * 100) / 100;

export interface ListingAnalyzerOptions {
  /** Approved category the product belongs to. */
  category: string;
  /** Brand id the product belongs to (tenant scoping). */
  brandId?: string;
  /** How many brands are tracked in the same category (qualitative context). */
  competitorBrandCount?: number;
}

const HEALTH_LEVELS: [number, 'poor' | 'fair' | 'good' | 'strong'][] = [
  [80, 'strong'],
  [65, 'good'],
  [45, 'fair'],
  [0, 'poor'],
];

function levelFor(score: number): 'poor' | 'fair' | 'good' | 'strong' {
  const found = HEALTH_LEVELS.find(([threshold]) => score >= threshold);
  return found ? found[1] : 'poor';
}

export function analyzeProductListing(
  product: Record<string, unknown> | undefined,
  opts: ListingAnalyzerOptions
): ProductListingAnalysis {
  if (!product) throw new Error('analyzeProductListing requires a product');
  const sku = String(product.sku ?? product.id ?? 'unknown');
  const name = String(product.name ?? sku);
  const barcode = String(product.barcode ?? '');
  const price = Math.max(0, Number(product.ukRetailPrice ?? 0));
  const category = opts.category;
  const competitorBrandCount = Math.max(0, opts.competitorBrandCount ?? 0);
  const seed = hashUnit(`${sku}|${barcode}|${price}`);

  const completeness = evaluateProductCompleteness(product);
  const images = Array.isArray(product.productImages) && product.productImages.length > 0
    ? product.productImages.length
    : (typeof product.image === 'string' && product.image.trim() ? 1 : 0);

  /* demand via the canonical estimator (no second engine) */
  const competitorCount = Math.max(4, Math.round(competitorBrandCount * 1.6 + 8));
  const reviewCount = Math.round(seed * 90);
  const packSize = Math.max(1, Math.round(Number(product.unitsPerCase ?? 1)));
  const listingMaturity = clamp(1 + Math.round(seed * 4), 1, 5);
  const estimate = estimateAmazonSales({
    category,
    priceGbp: price,
    competitorCount,
    reviewCount,
    packSize,
    listingMaturity,
  });
  const unitsMid = estimate.estimatedMonthlyUnits.mid;
  const demandSignal: 'low' | 'medium' | 'high' =
    unitsMid >= 400 ? 'high' : unitsMid >= 150 ? 'medium' : 'low';

  /* dimension scores (0–100) */
  const titleLen = name.length;
  const titleScore = clamp(Math.round(((titleLen - 12) / (60 - 12)) * 100), 0, 100);
  const imagesScore = clamp(Math.round(images * 34), 0, 100);
  const contentScore = completeness.percent;
  const pricingScore = price <= 0
    ? 10
    : clamp(Math.round((100 - Math.abs(20 - price) * 2) + (seed * 10)), 30, 100);
  const demandScore = demandSignal === 'high' ? 88 : demandSignal === 'medium' ? 62 : 32;
  const reviewsScore = clamp(Math.round(30 + seed * 55), 30, 85);
  const competitionScore = competitorBrandCount > 12
    ? 70
    : competitorBrandCount > 5
      ? 78
      : 85;
  const gapsScore = completeness.complete ? 90 : Math.max(10, 100 - completeness.missing.length * 22);

  const dimensions: ListingDimensionScore[] = [
    { key: 'title', label: 'Title', score: titleScore, note: titleLen >= 45 ? 'Clear, informative title length.' : titleLen >= 30 ? 'Title could be more informative.' : 'Short title — expand with the main benefit and use case.' },
    { key: 'images', label: 'Images', score: imagesScore, note: images >= 3 ? `${images} images supplied.` : images > 0 ? 'Add more lifestyle/detail images.' : 'No product images supplied — the listing cannot sell without them.' },
    { key: 'content', label: 'Content', score: contentScore, note: contentScore === 100 ? 'All catalogue prerequisites supplied.' : `Missing: ${completeness.missingLabels.join(', ')}.` },
    { key: 'pricing', label: 'Pricing', score: pricingScore, note: price > 0 ? `Retail price £${price.toFixed(2)} — ${price < 20 ? 'entry price point.' : 'mid/premium price point.'}` : 'No retail price set.' },
    { key: 'demand', label: 'Demand', score: demandScore, note: `${estimate.estimatedMonthlyUnits.low}–${estimate.estimatedMonthlyUnits.high} est. units/month in ${category}.` },
    { key: 'reviews', label: 'Reviews', score: reviewsScore, note: `${reviewCount} est. review base (simulated baseline).` },
    { key: 'competition', label: 'Competition', score: competitionScore, note: `${Math.max(0, competitorBrandCount)} brands tracked in ${category}.` },
    { key: 'gaps', label: 'Content gaps', score: gapsScore, note: completeness.missing.length === 0 ? 'No catalogue prerequisites missing.' : `${completeness.missing.length} catalogue prerequisites missing.` },
];
const weights: Record<string, number> = {
    title: 0.15, images: 0.2, content: 0.2, pricing: 0.1,
    demand: 0.1, reviews: 0.1, competition: 0.05, gaps: 0.1,
  };
  const healthScore = clamp(
    Math.round(dimensions.reduce((sum, d) => sum + d.score * (weights[d.key] ?? 0.1), 0)),
    0,
    100
  );

  /* ── rule-based recommendations (all start 'suggested') ─────────── */
  const recommendations: ListingRecommendation[] = [];
  const rec = (area: string, title: string, detail: string, impact: string, suggestedCopy?: string) =>
    recommendations.push({
      id: `${sku}__${area}`,
      sku,
      area,
      title,
      detail,
      impact,
      status: 'suggested',
      suggestedCopy,
    });

  if (images === 0) {
    rec('hero_image', 'Add a high-resolution hero image', 'A listing with no main image cannot compete in the retail channel.', 'High — first impression determines click-through.', 'Add a 1600×1600px white-background hero image of the full product.');
  } else if (images < 3) {
    rec('image_set', 'Add lifestyle and detail images', 'One image is not enough for buyers to assess the product.', 'Medium — more imagery lifts conversion.', 'Add at least two more images: one lifestyle/in-use shot and one detail/scale shot.');
  }
  if (!completeness.complete) {
    rec('content_gaps', 'Complete the catalogue prerequisites', `Missing fields: ${completeness.missingLabels.join(', ')}.`, 'High — the listing cannot be submitted until these are supplied.', `Supply ${completeness.missingLabels.join(', ')} in the catalogue before the next retail cycle.`);
  }
  if (titleLen < 45) {
    rec('title', 'Strengthen the listing title', `Current title is ${titleLen} characters. Retail buyers scan titles quickly.`, 'Medium — clearer titles raise organic visibility.', 'Lead with brand + product type + key attribute + use case (aim for 60–90 characters).');
  }
  if (reviewCount < 15) {
    rec('review_velocity', 'Build review velocity', 'A thin review base undercuts conversion versus established listings.', 'Medium — social proof drives the buy box position over time.', 'Plan a post-purchase review sequence for the first 90 days.');
  }
  if ((product.isAvailable ?? true) === false) {
    rec('availability', 'Restore availability', 'The product is marked unavailable — it cannot receive purchase orders.', 'High — availability is a hard gate.', 'Re-enable availability once stock is confirmed in the catalogue.');
  }
  if (competitorBrandCount > 8) {
    rec('differentiation', 'Differentiate the listing', `There are ${competitorBrandCount} brands tracked in ${category}.`, 'Medium — differentiation defends margin.', 'Emphasise the unique attribute or formulation in the first bullet.');
  }
  if (recommendations.length === 0) {
    rec('maintain', 'Keep the listing current', 'The listing is in good shape.', 'Low — routine upkeep.', 'Re-run this analysis after each catalogue change.');
  }

  /* ── position + opportunity indicators ──────────────────────────── */
  const bsrBand = `${Math.max(800, Math.round(9000 - seed * 7500)).toLocaleString('en-GB')}–${Math.max(1200, Math.round(14000 - seed * 11000)).toLocaleString('en-GB')}`;
  const categoryPercentile = Math.round(40 + seed * 50);
  const opportunityIndicators: string[] = [];
  if (demandSignal === 'high') opportunityIndicators.push('High estimated demand window');
  if (competitorBrandCount > 8) opportunityIndicators.push('Crowded category — differentiation opportunity');
  if (images === 0 || !completeness.complete) opportunityIndicators.push('Quick-win: complete catalogue prerequisites');
  if (price > 0 && price < 20) opportunityIndicators.push('Entry price point — volume opportunity');

  return {
    sku,
    brandId: opts.brandId ?? '',
    productName: name,
    analyzedAt: new Date('2026-09-17T09:00:00.000Z').toISOString(),
    healthScore,
    healthLevel: levelFor(healthScore),
    preparedBy: 'Mercenta',
    dimensions,
    estimates: {
      monthlyUnitsLow: estimate.estimatedMonthlyUnits.low,
      monthlyUnitsHigh: estimate.estimatedMonthlyUnits.high,
      monthlyRevenueMidGbp: round2(estimate.estimatedMonthlyRevenueGbp.mid),
      annualRevenueMidGbp: round2(estimate.estimatedAnnualRevenueGbp.mid),
      priceGbp: round2(price),
      bsrBand,
      velocityPerMonth: unitsMid,
      demandSignal,
      categoryPosition: `Est. ${categoryPercentile}th percentile bandwidth in ${category}`,
      competitivePosition: competitorBrandCount > 12
        ? 'Crowded category'
        : competitorBrandCount > 5
          ? 'Moderately competitive category'
          : 'Thin competition — early-mover advantage',
      opportunityIndicators,
    },
    recommendations,
    simulationLabel: `Deterministic simulated analysis (${SALES_ESTIMATE_BASIS}) — not measured marketplace data.`,
  };
}