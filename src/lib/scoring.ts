/**
 * §5 Fulfillment Track — pure scoring engine.
 *
 * totalScore = tradingHistory + exportExperience + scale + workingCapital
 *            + categoryRisk + reliability          (0-100)
 *
 * track = manualOverride ? existing track
 *       : totalScore >= 65 ? 'direct_fulfillment' : 'financed'
 *
 * Borderline band (55–74): NOT silently auto-assigned — flagged for manual
 * admin review and batched into the daily digest (§8), never pushed live.
 */
import type { FulfillmentScore, FulfillmentTrack } from '@/types';

export type WorkingCapitalAnswer = 'yes' | 'partially' | 'no';

export interface ScoreInputs {
  /** Years the brand has been exporting. */
  yearsExporting: number;
  /** Has shipped to UK/EU retail before. */
  priorUkEuExport: boolean;
  /** Holds a valid EORI number. */
  hasEori: boolean;
  /** Self-reported annual revenue, GBP. */
  annualRevenueGbp: number;
  /** Number of SKUs offered. */
  catalogSize: number;
  /** Answer to: "Can your business fund 30–90 days of stock before payment lands?" */
  workingCapitalAnswer: WorkingCapitalAnswer;
  /** Category is perishable/hazmat-sensitive (lowers categoryRiskScore). */
  hazmatOrPerishableCategory: boolean;
  /**
   * Confirmed on-time ship rate once live (0–1). Pre-launch brands have no
   * history: omit and reliability scores 0.
   */
  onTimeShipRate?: number;
}

const clamp = (v: number, max: number) => Math.max(0, Math.min(max, Math.round(v)));

export const BORDERLINE_BAND = { min: 55, max: 74 } as const;

/** A total in the 55–74 band requires manual admin review before it sticks. */
export function isBorderline(totalScore: number): boolean {
  return totalScore >= BORDERLINE_BAND.min && totalScore <= BORDERLINE_BAND.max;
}

/** Auto-assignment rule. Only applied outside the borderline band. */
export function assignTrack(totalScore: number): FulfillmentTrack {
  return totalScore >= 65 ? 'direct_fulfillment' : 'financed';
}

export function computeComponentScores(inputs: ScoreInputs) {
  // 0-20 — years exporting: 4 points per year up to 5 years.
  const tradingHistoryScore = clamp(inputs.yearsExporting * 4, 20);

  // 0-15 — export experience: prior UK/EU placement 10 + valid EORI 5.
  const exportExperienceScore =
    (inputs.priorUkEuExport ? 10 : 0) + (inputs.hasEori ? 5 : 0);

  // 0-20 — scale: revenue band (max 12) + catalogue depth (max 8).
  const revenueBand =
    inputs.annualRevenueGbp >= 1_000_000 ? 12
    : inputs.annualRevenueGbp >= 500_000 ? 9
    : inputs.annualRevenueGbp >= 250_000 ? 6
    : inputs.annualRevenueGbp >= 100_000 ? 4
    : 2;
  const catalogBand =
    inputs.catalogSize >= 50 ? 8
    : inputs.catalogSize >= 20 ? 6
    : inputs.catalogSize >= 5 ? 4
    : 2;
  const scaleScore = clamp(revenueBand + catalogBand, 20);

  // 0-20 — working capital straight from the onboarding question.
  const workingCapitalScore =
    inputs.workingCapitalAnswer === 'yes' ? 20
    : inputs.workingCapitalAnswer === 'partially' ? 10
    : 0;

  // 0-15 — category risk: 15 clean, 7 for hazmat/perishable categories.
  const categoryRiskScore = inputs.hazmatOrPerishableCategory ? 7 : 15;

  // 0-10 — reliability: 0 pre-launch; confirmed on-time rate once trading.
  const reliabilityScore =
    inputs.onTimeShipRate === undefined
      ? 0
      : clamp(inputs.onTimeShipRate * 10, 10);

  const totalScore =
    tradingHistoryScore +
    exportExperienceScore +
    scaleScore +
    workingCapitalScore +
    categoryRiskScore +
    reliabilityScore;

  return {
    tradingHistoryScore,
    exportExperienceScore,
    scaleScore,
    workingCapitalScore,
    categoryRiskScore,
    reliabilityScore,
    totalScore,
  };
}

export interface ScoringResult {
  components: ReturnType<typeof computeComponentScores>;
  /** Proposed track — only auto-applied OUTSIDE the borderline band. */
  proposedTrack: FulfillmentTrack;
  /** True → surface "Needs review" badge, batch into daily digest. */
  needsManualReview: boolean;
}

/**
 * Full scoring pass. When `existing` carries a manual override, the existing
 * track wins and the result is still returned for audit/digest purposes.
 */
export function scoreBrand(
  inputs: ScoreInputs,
  existing?: Pick<FulfillmentScore, 'manualOverride' | 'track'>
): ScoringResult {
  const components = computeComponentScores(inputs);
  const borderline = isBorderline(components.totalScore);
  const proposedTrack = existing?.manualOverride
    ? existing.track
    : borderline
      ? existing?.track ?? 'unassigned'
      : assignTrack(components.totalScore);
  return {
    components,
    proposedTrack,
    needsManualReview: borderline && !existing?.manualOverride,
  };
}
