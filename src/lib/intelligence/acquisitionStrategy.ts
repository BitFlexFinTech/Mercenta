/**
 * §12–§17/M12 — BRAND INTELLIGENCE: ACQUISITION STRATEGY, SOURCE MARKETS,
 * TRADE PROGRAMMES AND SPEED-TO-REVENUE PRIORITISATION.
 *
 * This is NOT a second scoring system. It is the STRATEGY + PRIORITISATION layer
 * built strictly ON TOP of the existing canonical prospect data and scoring
 * (`src/lib/intelligence/scoringEngine.ts` → `prospect.score`, produced by the
 * existing discovery/BI pipeline). It re-derives nothing that already exists:
 * every input below comes from a `BrandProspect` the platform already holds.
 *
 * TWO STRATEGIES (§12):
 *   A — UK brands    : high-demand UK brands → UK retail channel. The near-term
 *                      revenue engine.
 *   B — global → UK  : brands ANYWHERE in the world → the UK market, via
 *                      Mercenta. The source market may be anywhere; the
 *                      DESTINATION market is the UK.
 *
 * HONESTY CONTRACT (§14/§16/§17):
 *   • every projection is labelled an ESTIMATE (`basis: 'estimate'`), never
 *     presented as measured marketplace data;
 *   • government/embassy/trade programmes are declared PROSPECTIVE — the product
 *     must never claim a partnership that does not exist;
 *   • nothing here contacts a network. It is pure derivation over stored data.
 */
import type { BrandProspect } from '@/types';
import type { CommercialModel } from '@/config/commercialModel';
import {
  DEMO_ACQUISITION_SHARE_PCT,
  DEMO_COMMISSION_RATE_PCT,
} from '@/config/commercialModel';
import {
  computeBuyResellModel,
  computeCommissionModel,
} from '@/lib/finance/commercialModel';

/* ─ §12 — the two acquisition strategies ────────────────────────────────── */

export type AcquisitionStrategyId = 'uk_brands' | 'global_to_uk';

/** The destination market for BOTH strategies. There is only one. */
export const DESTINATION_MARKET = 'United Kingdom' as const;

export interface AcquisitionStrategy {
  id: AcquisitionStrategyId;
  label: string;
  summary: string;
  /** Why a founder should work this strategy (the commercial rationale). */
  rationale: string;
}

export const ACQUISITION_STRATEGIES: Record<AcquisitionStrategyId, AcquisitionStrategy> = {
  uk_brands: {
    id: 'uk_brands',
    label: 'Strategy A — UK brands',
    summary:
      'Source high-demand UK brands that are already established, commercially attractive and compliance-ready, and route their products into the UK retail channel through Mercenta.',
    rationale:
      'Near-term revenue engine: the shortest path from outreach to a first purchase order, because the brand, the market and the logistics lane are already aligned.',
  },
  global_to_uk: {
    id: 'global_to_uk',
    label: 'Strategy B — global brands → UK',
    summary:
      'Source brands anywhere in the world whose products are likely to perform in the UK, and give them a UK route to market through Mercenta.',
    rationale:
      'Longer-term scale: a much larger universe of brands, each needing a UK importer of record, compliance and distribution partner — which is exactly what Mercenta is.',
  },
};

export const ACQUISITION_STRATEGY_ORDER: readonly AcquisitionStrategyId[] = [
  'uk_brands',
  'global_to_uk',
] as const;

/* ─ §15 — source markets (never UK-only) ────────────────────────────────── */

export type SourceMarketRegion =
  | 'uk'
  | 'europe'
  | 'africa'
  | 'middle_east'
  | 'asia'
  | 'north_america'
  | 'latin_america'
  | 'oceania';

export interface SourceMarket {
  id: string;
  label: string;
  region: SourceMarketRegion;
  /** Which strategy this source market belongs to. */
  strategy: AcquisitionStrategyId;
}

export const SOURCE_MARKETS: Record<string, SourceMarket> = {
  GB: { id: 'GB', label: 'United Kingdom', region: 'uk', strategy: 'uk_brands' },
  IE: { id: 'IE', label: 'Ireland', region: 'europe', strategy: 'global_to_uk' },
  DE: { id: 'DE', label: 'Germany', region: 'europe', strategy: 'global_to_uk' },
  FR: { id: 'FR', label: 'France', region: 'europe', strategy: 'global_to_uk' },
  NL: { id: 'NL', label: 'Netherlands', region: 'europe', strategy: 'global_to_uk' },
  IT: { id: 'IT', label: 'Italy', region: 'europe', strategy: 'global_to_uk' },
  ES: { id: 'ES', label: 'Spain', region: 'europe', strategy: 'global_to_uk' },
  PL: { id: 'PL', label: 'Poland', region: 'europe', strategy: 'global_to_uk' },
  TR: { id: 'TR', label: 'Türkiye', region: 'europe', strategy: 'global_to_uk' },
  ZW: { id: 'ZW', label: 'Zimbabwe', region: 'africa', strategy: 'global_to_uk' },
  ZA: { id: 'ZA', label: 'South Africa', region: 'africa', strategy: 'global_to_uk' },
  KE: { id: 'KE', label: 'Kenya', region: 'africa', strategy: 'global_to_uk' },
  NG: { id: 'NG', label: 'Nigeria', region: 'africa', strategy: 'global_to_uk' },
  GH: { id: 'GH', label: 'Ghana', region: 'africa', strategy: 'global_to_uk' },
  MA: { id: 'MA', label: 'Morocco', region: 'africa', strategy: 'global_to_uk' },
  AE: { id: 'AE', label: 'United Arab Emirates', region: 'middle_east', strategy: 'global_to_uk' },
  SA: { id: 'SA', label: 'Saudi Arabia', region: 'middle_east', strategy: 'global_to_uk' },
  IN: { id: 'IN', label: 'India', region: 'asia', strategy: 'global_to_uk' },
  SG: { id: 'SG', label: 'Singapore', region: 'asia', strategy: 'global_to_uk' },
  CN: { id: 'CN', label: 'China', region: 'asia', strategy: 'global_to_uk' },
  JP: { id: 'JP', label: 'Japan', region: 'asia', strategy: 'global_to_uk' },
  KR: { id: 'KR', label: 'South Korea', region: 'asia', strategy: 'global_to_uk' },
  VN: { id: 'VN', label: 'Vietnam', region: 'asia', strategy: 'global_to_uk' },
  ID: { id: 'ID', label: 'Indonesia', region: 'asia', strategy: 'global_to_uk' },
  US: { id: 'US', label: 'United States', region: 'north_america', strategy: 'global_to_uk' },
  CA: { id: 'CA', label: 'Canada', region: 'north_america', strategy: 'global_to_uk' },
  MX: { id: 'MX', label: 'Mexico', region: 'latin_america', strategy: 'global_to_uk' },
  BR: { id: 'BR', label: 'Brazil', region: 'latin_america', strategy: 'global_to_uk' },
  CL: { id: 'CL', label: 'Chile', region: 'latin_america', strategy: 'global_to_uk' },
  AU: { id: 'AU', label: 'Australia', region: 'oceania', strategy: 'global_to_uk' },
  NZ: { id: 'NZ', label: 'New Zealand', region: 'oceania', strategy: 'global_to_uk' },
};

/** Country NAME → market id, for prospects whose `countries` are names. */
const MARKET_BY_NAME: Record<string, string> = Object.fromEntries(
  Object.values(SOURCE_MARKETS).map((m) => [m.label.toLowerCase(), m.id])
);

/** Resolve a country (name or code) to a canonical source-market id, or null. */
export function resolveSourceMarketId(country?: string | null): string | null {
  if (!country) return null;
  const trimmed = country.trim();
  if (SOURCE_MARKETS[trimmed.toUpperCase()]) return trimmed.toUpperCase();
  return MARKET_BY_NAME[trimmed.toLowerCase()] ?? null;
}

/** Every source market that belongs to one strategy. */
export function sourceMarketsForStrategy(strategy: AcquisitionStrategyId): SourceMarket[] {
  return Object.values(SOURCE_MARKETS).filter((m) => m.strategy === strategy);
}

/* ─ §16 — government / embassy / trade-partner programmes (PROSPECTIVE) ─── */

export type TradeProgrammeId =
  | 'dbt'
  | 'british_embassy'
  | 'british_high_commission'
  | 'chamber_of_commerce'
  | 'bilateral_business_council'
  | 'trade_organisation'
  | 'export_agency'
  | 'country_trade_body';

export interface TradeProgramme {
  id: TradeProgrammeId;
  label: string;
  /** What the programme could give Mercenta if a relationship were agreed. */
  potentialValue: string;
  /**
   * ALWAYS `prospective_partnership`: the product must never imply that a
   * relationship with any of these bodies already exists.
   */
  status: 'prospective_partnership';
}

export const TRADE_PROGRAMMES: Record<TradeProgrammeId, TradeProgramme> = {
  dbt: {
    id: 'dbt',
    label: 'UK Department for Business and Trade (DfBT)',
    potentialValue:
      'Market-entry introductions, UK market intelligence and access to incoming trade delegations.',
    status: 'prospective_partnership',
  },
  british_embassy: {
    id: 'british_embassy',
    label: 'British Embassy (in a source market)',
    potentialValue: 'Warm introductions to export-ready brands and local trade contacts.',
    status: 'prospective_partnership',
  },
  british_high_commission: {
    id: 'british_high_commission',
    label: 'British High Commission (Commonwealth markets)',
    potentialValue: 'Introductions through Commonwealth trade networks.',
    status: 'prospective_partnership',
  },
  chamber_of_commerce: {
    id: 'chamber_of_commerce',
    label: 'Chamber of commerce',
    potentialValue: 'Member directories, event access and referral relationships.',
    status: 'prospective_partnership',
  },
  bilateral_business_council: {
    id: 'bilateral_business_council',
    label: 'Bilateral business council',
    potentialValue: 'Curated brand introductions in a specific bilateral corridor.',
    status: 'prospective_partnership',
  },
  trade_organisation: {
    id: 'trade_organisation',
    label: 'Trade organisation / industry association',
    potentialValue: 'Sector-specific brand pools and credibility.',
    status: 'prospective_partnership',
  },
  export_agency: {
    id: 'export_agency',
    label: 'National export agency',
    potentialValue: 'Brands actively seeking an export route to the UK.',
    status: 'prospective_partnership',
  },
  country_trade_body: {
    id: 'country_trade_body',
    label: 'Country-specific trade body',
    potentialValue: 'A single channel into one source market.',
    status: 'prospective_partnership',
  },
};

/** A DECLARED fact the validators and the UI both pin. */
export const TRADE_PARTNERSHIPS_ARE_PROSPECTIVE = true;

export const TRADE_PARTNERSHIP_DISCLAIMER =
  'Prospective partnership strategy. Mercenta does NOT currently hold a partnership, mandate or endorsement from any government department, embassy, high commission, chamber of commerce, business council or trade body. Any brand or opportunity tagged against a programme here reflects a PLANNED approach route, not an existing agreement.';

/* ─ §16 — market-access tagging on a prospect ───────────────────────────── */

export interface MarketAccessTag {
  /** Source market the brand is based in (name or ISO code). */
  sourceCountry?: string;
  /** Which trade programme / route the introduction came through. */
  programme?: TradeProgrammeId;
  /** Referral source (a person, body or route), free text but trimmed. */
  partnerSource?: string;
  /** Campaign this opportunity belongs to. */
  campaign?: string;
  /** Named market-access programme, where the founder runs several. */
  marketAccessProgramme?: string;
}

const clean = (v?: string | null): string | undefined => {
  const t = (v ?? '').trim();
  return t.length ? t : undefined;
};

export function normaliseMarketAccessTag(tag: MarketAccessTag | undefined): MarketAccessTag {
  if (!tag) return {};
  const out: MarketAccessTag = {};
  const country = clean(tag.sourceCountry);
  if (country) out.sourceCountry = country;
  if (tag.programme && TRADE_PROGRAMMES[tag.programme]) out.programme = tag.programme;
  const source = clean(tag.partnerSource);
  if (source) out.partnerSource = source;
  const campaign = clean(tag.campaign);
  if (campaign) out.campaign = campaign;
  const map = clean(tag.marketAccessProgramme);
  if (map) out.marketAccessProgramme = map;
  return out;
}

/** One-line description of a tag, for tables. Never invents a partnership. */
export function describeMarketAccessTag(tag: MarketAccessTag | undefined): string {
  const t = normaliseMarketAccessTag(tag);
  if (!t.sourceCountry && !t.programme && !t.partnerSource && !t.campaign) return 'Direct sourcing';
  const parts: string[] = [];
  if (t.sourceCountry) parts.push(t.sourceCountry);
  if (t.programme) parts.push(TRADE_PROGRAMMES[t.programme].label);
  if (t.partnerSource) parts.push(`via ${t.partnerSource}`);
  if (t.campaign) parts.push(`campaign: ${t.campaign}`);
  if (t.marketAccessProgramme) parts.push(`programme: ${t.marketAccessProgramme}`);
  return parts.join(' · ');
}

/*  §14 — SPEED-TO-REVENUE PRIORITISATION ───────────────────────────────── */

/**
 * The weighting behind the prioritisation score. Declared ONCE so the UI, the
 * Founder Centre and the validators cannot disagree about what "first" means.
 * Total = 100.
 */
export const SPEED_TO_REVENUE_WEIGHTS = {
  /** Projected Mercenta margin per opportunity. */
  expectedMargin: 25,
  /** Likelihood the brand actually onboards. */
  onboardingProbability: 20,
  /** How close the brand already is to satisfying compliance. */
  complianceReadiness: 15,
  /** How ready the products are for the retail channel. */
  amazonReadiness: 15,
  /** Operational simplicity (inverse of onboarding difficulty). */
  operationalSimplicity: 10,
  /** Speed: inverted time-to-revenue. */
  timeToRevenue: 15,
} as const;

/** A DECLARED fact: these are PROJECTIONS over stored data, not measurements. */
export const SPEED_TO_REVENUE_IS_AN_ESTIMATE = true;

export const SPEED_TO_REVENUE_BASIS = 'estimate' as const;

export const ESTIMATE_LABEL = 'Estimate — projection, not measured marketplace data';

const pct = (value: number, max: number): number =>
  max <= 0 ? 0 : Math.max(0, Math.min(100, Math.round((value / max) * 100)));

const clamp = (n: number, lo: number, hi: number): number => Math.max(lo, Math.min(hi, n));

const round2 = (n: number): number => Math.round(n * 100) / 100;

export interface OpportunityAssessment {
  prospectId: string;
  brand: string;
  category: string;
  strategy: AcquisitionStrategyId;
  destinationMarket: typeof DESTINATION_MARKET;
  sourceMarketId: string | null;
  sourceMarketLabel: string;
  /** Every figure below is a labelled ESTIMATE (0-100 unless stated). */
  marketFit: number;
  demandPotential: number;
  competitionHeadroom: number;
  pricingOpportunity: number;
  categorySuitability: number;
  complianceFeasibility: number;
  logisticsFeasibility: number;
  amazonOpportunity: number;
  commercialAttractiveness: number;
  /** Higher = harder to convert. */
  onboardingDifficulty: number;
  onboardingProbability: number;
  timeToRevenueWeeks: number;
  projectedRevenueGbp: number;
  projectedMercentaMarginGbp: number;
  speedToRevenueScore: number;
  basis: typeof SPEED_TO_REVENUE_BASIS;
  estimateLabel: string;
}

/** §12 — which strategy a stored prospect belongs to. */
export function strategyForProspect(prospect: BrandProspect): AcquisitionStrategyId {
  if (prospect.ukPresence) return 'uk_brands';
  const countries = (prospect.countries ?? []).map((c) => c.trim().toLowerCase());
  if (countries.some((c) => c === 'uk' || c === 'gb' || c === 'united kingdom')) return 'uk_brands';
  return 'global_to_uk';
}

/**
 * §14 — assess ONE stored prospect. Pure derivation from the prospect's own
 * canonical score + evidence: this function never fetches, and never claims a
 * measurement it does not have.
 */
export function assessOpportunity(
  prospect: BrandProspect,
  opts: { model?: CommercialModel } = {}
): OpportunityAssessment {
  const s = prospect.score;
  const amazonReadiness = pct(s.amazonDemand, 25);
  const demandPotential = Math.round((pct(s.amazonDemand, 25) + pct(s.poPotential, 20)) / 2);
  const marketFit = Math.round(
    (prospect.ukPresence ? 100 : 55) * 0.6 + pct(s.acceptanceProbability, 10) * 0.4
  );
  // Fewer observed competitor ASINs ⇒ more headroom for Mercenta's brand.
  const competitionHeadroom = clamp(100 - prospect.asins.length * 15, 0, 100);
  const pricingOpportunity = Math.round(
    pct(s.mercentaFit, 10) * 0.5 + pct(s.logisticsSuitability, 5) * 0.5
  );
  const categorySuitability = clamp(60 + prospect.growthSignals.length * 8, 0, 100);
  // A detected restriction lowers feasibility; an unknown state never raises it.
  const complianceFeasibility = clamp(100 - prospect.restrictions.length * 25, 0, 100);
  const logisticsFeasibility = pct(s.logisticsSuitability, 5);
  const amazonOpportunity = Math.round((amazonReadiness + competitionHeadroom) / 2);
  const commercialAttractiveness = pct(s.total, 100);
  const onboardingProbability = pct(s.acceptanceProbability, 10);
  const onboardingDifficulty = 100 - onboardingProbability;

  // Time to revenue: operational reality, not optimism. Difficulty and
  // compliance gaps add weeks; strong retail-channel readiness removes them.
  const timeToRevenueWeeks = clamp(
    Math.round(
      3 +
        (onboardingDifficulty / 100) * 18 +
        ((100 - complianceFeasibility) / 100) * 6 -
        (amazonReadiness / 100) * 4
    ),
    2,
    30
  );

  // Projected revenue is a NAMED formula over the canonical score — never a
  // measure of any real marketplace.
  const projectedRevenueGbp = round2(1_500 + s.amazonDemand * 450 + s.poPotential * 600);

  const model: CommercialModel = opts.model ?? 'commission_agent';
  const projectedMercentaMarginGbp =
    model === 'commission_agent'
      ? computeCommissionModel({
          retailChannelRevenueGbp: projectedRevenueGbp,
          commissionRatePct: DEMO_COMMISSION_RATE_PCT,
        }).mercentaCommissionGbp
      : computeBuyResellModel({
          retailChannelRevenueGbp: projectedRevenueGbp,
          brandAcquisitionCostGbp: (projectedRevenueGbp * DEMO_ACQUISITION_SHARE_PCT) / 100,
          // Demo cost ratios, applied to the projection (the same ratios as §19).
          carrierCostGbp: round2(projectedRevenueGbp * 0.006),
          paymentFeesGbp: round2(projectedRevenueGbp * 0.012),
          otherAgreedFeesGbp: round2(projectedRevenueGbp * 0.005),
          deductionsGbp: 0,
        }).netMercentaMarginGbp;

  // Margin is normalised against the canonical demo ceiling (£10,000 Model A at
  // 20% = £2,000) so the weighting is absolute, not relative to the cohort.
  const marginScore = clamp((projectedMercentaMarginGbp / 2_000) * 100, 0, 100);
  const speedScore = clamp((1 - (timeToRevenueWeeks - 2) / 28) * 100, 0, 100);

  const speedToRevenueScore = Math.round(
    (marginScore * SPEED_TO_REVENUE_WEIGHTS.expectedMargin +
      onboardingProbability * SPEED_TO_REVENUE_WEIGHTS.onboardingProbability +
      complianceFeasibility * SPEED_TO_REVENUE_WEIGHTS.complianceReadiness +
      amazonReadiness * SPEED_TO_REVENUE_WEIGHTS.amazonReadiness +
      (100 - onboardingDifficulty) * SPEED_TO_REVENUE_WEIGHTS.operationalSimplicity +
      speedScore * SPEED_TO_REVENUE_WEIGHTS.timeToRevenue) /
      100
  );

  const sourceMarketId = resolveSourceMarketId((prospect.countries ?? [])[0]);
  return {
    prospectId: prospect.id,
    brand: prospect.brand,
    category: prospect.category,
    strategy: strategyForProspect(prospect),
    destinationMarket: DESTINATION_MARKET,
    sourceMarketId,
    sourceMarketLabel: sourceMarketId
      ? SOURCE_MARKETS[sourceMarketId].label
      : 'Unknown source market',
    marketFit,
    demandPotential,
    competitionHeadroom,
    pricingOpportunity,
    categorySuitability,
    complianceFeasibility,
    logisticsFeasibility,
    amazonOpportunity,
    commercialAttractiveness,
    onboardingDifficulty,
    onboardingProbability,
    timeToRevenueWeeks,
    projectedRevenueGbp,
    projectedMercentaMarginGbp,
    speedToRevenueScore,
    basis: SPEED_TO_REVENUE_BASIS,
    estimateLabel: ESTIMATE_LABEL,
  };
}

export interface RankedOpportunity extends OpportunityAssessment {
  rank: number;
}

/**
 * §14 — "who should I contact first to generate revenue as quickly as
 * possible?" Ordered by the weighted score, with a deterministic tiebreak on
 * projected margin then brand name, so the ranking is stable across replays.
 */
export function rankBySpeedToRevenue(
  prospects: readonly BrandProspect[],
  opts: { model?: CommercialModel } = {}
): RankedOpportunity[] {
  return prospects
    .filter((p) => !p.disqualified)
    .map((p) => assessOpportunity(p, opts))
    .sort(
      (a, b) =>
        b.speedToRevenueScore - a.speedToRevenueScore ||
        b.projectedMercentaMarginGbp - a.projectedMercentaMarginGbp ||
        a.brand.localeCompare(b.brand)
    )
    .map((a, i) => ({ ...a, rank: i + 1 }));
}

export interface StrategyRollup {
  count: number;
  projectedRevenueGbp: number;
  projectedMarginGbp: number;
  averageWeeksToRevenue: number;
}

/** Strategy-level rollup for the acquisition dashboard (estimates only). */
export function summariseByStrategy(
  prospects: readonly BrandProspect[],
  opts: { model?: CommercialModel } = {}
): Record<AcquisitionStrategyId, StrategyRollup> {
  const out: Record<AcquisitionStrategyId, StrategyRollup> = {
    uk_brands: { count: 0, projectedRevenueGbp: 0, projectedMarginGbp: 0, averageWeeksToRevenue: 0 },
    global_to_uk: { count: 0, projectedRevenueGbp: 0, projectedMarginGbp: 0, averageWeeksToRevenue: 0 },
  };
  for (const p of prospects) {
    if (p.disqualified) continue;
    const a = assessOpportunity(p, opts);
    const bucket = out[a.strategy];
    bucket.count += 1;
    bucket.projectedRevenueGbp = round2(bucket.projectedRevenueGbp + a.projectedRevenueGbp);
    bucket.projectedMarginGbp = round2(bucket.projectedMarginGbp + a.projectedMercentaMarginGbp);
    bucket.averageWeeksToRevenue = Math.round(
      (bucket.averageWeeksToRevenue * (bucket.count - 1) + a.timeToRevenueWeeks) / bucket.count
    );
  }
  return out;
}