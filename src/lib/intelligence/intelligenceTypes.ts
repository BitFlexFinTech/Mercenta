/**
 * §Brand Intelligence — Engine-specific types that are internal to the
 * intelligence pipeline and separate from the shared model in types.ts.
 *
 * These describe scoring configs, engine options, pipeline state, and
 * derived intermediate types that consumers of the engine don't need to import.
 */
import type {
  BrandProspect,
  ProspectASIN,
  ProspectScore,
  ProspectTier,
  IntelligencePipelineConfig,
  GrowthSignal,
  BrandMaturity,
  DistributorStatus,
  AmazonOfferClassification,
  ProspectEvidence,
} from '@/types';

/* ── Engine options ────────────────────────────────────────────────── */

/** Options for running the full or partial intelligence pipeline. */
export interface IntelligenceEngineOptions {
  /** Pipeline config (categories, thresholds, etc.). */
  config: IntelligencePipelineConfig;
  /** If true, run in mock mode regardless of credential presence. */
  forceMock?: boolean;
  /** Seed brand names to research (if omitted, discover from categories). */
  seedBrands?: string[];
  /** Known disqualifications to skip. */
  knownExclusions?: { brand: string; reason: string }[];
}

/** Results of a pipeline run. */
export interface IntelligencePipelineResult {
  runId: string;
  startedAt: string;
  completedAt: string;
  /** All ranked prospects. */
  prospects: BrandProspect[];
  /** Number of brands scanned. */
  scannedCount: number;
  /** Number of brands disqualified. */
  disqualifiedCount: number;
  /** Number of new brands discovered (not in previous snapshot). */
  newCount: number;
  /** Execution mode. */
  mode: 'mock' | 'live';
  /** Error count during run. */
  errorCount: number;
  /** Human-readable summary. */
  summary: string;
}

/* ── Intermediate scoring types (internal to engine) ───────────────── */

/** Raw factors before weighting, used internally by the scoring model. */
export interface RawScoreFactors {
  amazonDemand: {
    reviewScore: number;       // 0-8
    bsrScore: number;          // 0-7
    searchDemandScore: number; // 0-5
    salesEstimateScore: number;// 0-5
  };
  poPotential: {
    amazonRetailOpportunity: number; // 0-6
    skuDepth: number;                // 0-4
    repeatPurchase: number;          // 0-4
    supplyFragmentation: number;     // 0-3
    brandGrowth: number;             // 0-3
  };
  growth: {
    signalScore: number;       // 0-8
    challengerBonus: number;   // 0-4
    retailExpansion: number;   // 0-3
  };
  distribution: {
    gapScore: number;          // 0-10 (inverted — no distributor = high)
    opennessEvidence: number;  // 0-5
  };
  acceptance: {
    wholesaleOpenness: number; // 0-3
    founderAccessibility: number; // 0-2
    sophisticationRisk: number;   // 0-2 (inverted — sophisticated = lower)
    restrictionRisk: number;      // 0-3 (inverted — restriction = lower)
  };
  mercentaFit: {
    skuBreadth: number;          // 0-3
    repeatPurchaseFit: number;   // 0-2
    crossBorderNeed: number;     // 0-2
    operationalComplexity: number;// 0-2
    selfServiceReadiness: number; // 0-1
  };
  logistics: {
    weightClass: number;     // 0-2
    hazmatRisk: number;      // 0-1 (inverted)
    marginSuitability: number;// 0-2
  };
}

/* ── Scoring weights ──────────────────────────────────────────────── */

export const INTELLIGENCE_SCORE_WEIGHTS = {
  amazonDemand: 25,
  poPotential: 20,
  growth: 15,
  distributionOpenness: 15,
  acceptanceProbability: 10,
  mercentaFit: 10,
  logisticsSuitability: 5,
} as const;

export const TIER_THRESHOLDS = {
  tier_1: { min: 90, max: 100 },
  tier_2: { min: 80, max: 89 },
  tier_3: { min: 70, max: 79 },
  tier_4: { min: 60, max: 69 },
} as const;

export const GROWTH_SIGNAL_POINTS: Record<string, number> = {
  major_growth_announcement: 5,
  new_national_retailer: 4,
  amazon_growth: 3,
  funding: 3,
  new_distributor: 2,
  major_product_launch: 2,
  new_stockist: 1,
  retail_expansion: 4,
  international_expansion: 3,
  uk_launch: 3,
  increased_amazon_reviews: 2,
  social_traction: 1,
};

/* ── Tier labels ──────────────────────────────────────────────────── */

export const TIER_LABELS: Record<ProspectTier, string> = {
  tier_1: 'Attack Immediately',
  tier_2: 'High Probability',
  tier_3: 'Good Upside',
  tier_4: 'Reserve',
  unscored: 'Not Scored',
};

export const TIER_COLORS: Record<ProspectTier, string> = {
  tier_1: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/30',
  tier_2: 'text-blue-400 bg-blue-500/10 border-blue-500/30',
  tier_3: 'text-amber-400 bg-amber-500/10 border-amber-500/30',
  tier_4: 'text-zinc-400 bg-zinc-500/10 border-zinc-500/30',
  unscored: 'text-zinc-600 bg-zinc-500/5 border-zinc-500/20',
};

/* ── Engine sub-module interfaces ──────────────────────────────────── */

/** Interface for the discovery sub-module (distributor/contact/restriction detection). */
export interface DiscoveryClient {
  readonly mode: 'mock' | 'live';
  searchForDistributors(brandName: string): Promise<{
    distributors: { company: string; website: string; territory: string; exclusive: boolean; source: string; sourceUrl: string }[];
    status: DistributorStatus;
  }>;
  searchForContacts(brandName: string, category: string): Promise<{
    contacts: { name: string; jobTitle: string; linkedInUrl?: string; email?: string }[];
  }>;
  checkAmazonRestrictions(brandName: string): Promise<{
    restricted: boolean;
    restrictions: { description: string; severity: 'hard' | 'conditional' | 'unknown'; sourceUrl: string }[];
  }>;
  detectGrowthSignals(brandName: string): Promise<{
    signals: { type: GrowthSignal['type']; description: string; scoreContribution: number; sourceUrl: string }[];
  }>;
}

/** Interface for the Amazon data sub-module. */
export interface AmazonDataClient {
  readonly mode: 'mock' | 'live';
  searchCategory(category: string, config: IntelligencePipelineConfig): Promise<ProspectASIN[]>;
  searchBrand(brandName: string, config: IntelligencePipelineConfig): Promise<ProspectASIN[]>;
  getAsinDetail(asin: string): Promise<ProspectASIN | null>;
}

/** Interface for the scoring sub-module. */
export interface ScoringEngine {
  calculate(asins: ProspectASIN[], signals: GrowthSignal[], status: DistributorStatus): ProspectScore;
  calculateRaw(asins: ProspectASIN[], signals: GrowthSignal[], status: DistributorStatus): RawScoreFactors;
  assignTier(total: number): ProspectTier;
  checkDisqualifiers(asins: ProspectASIN[], restrictions: { severity: string }[]): { disqualified: boolean; reason?: string };
}