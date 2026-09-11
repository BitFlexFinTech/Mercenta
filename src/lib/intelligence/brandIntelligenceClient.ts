/**
 * Brand Intelligence Client — scores, ranks, dashboards.
 * Uses scoringEngine.ts for the math. Mock-first.
 */
import type { BrandProspect, ProspectASIN, ProspectScore, IntelligencePipelineConfig, IntelligenceDashboard, BrandMarketIntelligence, ProspectRestriction } from '@/types';
import type { IntelligenceEngineOptions, IntelligencePipelineResult } from './intelligenceTypes';
import { calculateScore, checkDisq } from './scoringEngine';

export interface BrandIntelligenceClient {
  readonly mode: 'mock' | 'live';
  scoreProspect(p: Partial<BrandProspect>): BrandProspect;
  runPipeline(prospects: BrandProspect[], opts?: IntelligenceEngineOptions): Promise<IntelligencePipelineResult>;
  getDashboard(prospects: BrandProspect[]): IntelligenceDashboard;
  getBrandIntelligence(p: BrandProspect): BrandMarketIntelligence;
}

function zeroScore(): ProspectScore {
  return { amazonDemand: 0, poPotential: 0, growth: 0, distributionOpenness: 0, acceptanceProbability: 0, mercentaFit: 0, logisticsSuitability: 0, total: 0, tier: 'unscored', calculatedAt: new Date().toISOString().slice(0, 10) };
}

class MockClient implements BrandIntelligenceClient {
  readonly mode = 'mock' as const;

  scoreProspect(p: Partial<BrandProspect>): BrandProspect {
    const asins = p.asins ?? []; const signals = p.growthSignals ?? [];
    const dist = p.distributors ?? []; const restr = p.restrictions ?? [];
    const contacts = p.contacts ?? []; const cat = p.category ?? 'Home';
    const disq = checkDisq(asins, restr);
    const score: ProspectScore = disq.dq ? zeroScore() : calculateScore(asins, signals, dist, restr, contacts, cat);

    return {
      // §Phase C root-cause fix — preserve every caller-supplied field the
      // scoring engine does NOT own (countries, incumbentChallenged, notes,
      // owner, outreach history, check stamps). Phase B's literal dropped them,
      // so the canonical store lost e.g. `countries` (needed to derive the ICP
      // origin region) and `incumbentChallenged` (rendered in prospect detail)
      // the moment the universe booted.
      ...p,
      id: p.id ?? `p-${Date.now()}`, brand: p.brand ?? 'Unknown', category: cat,
      website: p.website, ukPresence: p.ukPresence, brandMaturity: p.brandMaturity ?? 'challenger',
      whyInteresting: p.whyInteresting, asins, distributors: dist,
      wholesale: p.wholesale ?? { wholesaleAvailable: false, distributorProgramme: false, retailerProgramme: false, source: '', sourceUrl: '', confidence: 'low', evidence: [] },
      restrictions: restr, growthSignals: signals, contacts, score,
      outreachStatus: disq.dq ? 'disqualified' : (p.outreachStatus ?? 'uncontacted'),
      createdAt: p.createdAt ?? new Date().toISOString(), lastResearched: new Date().toISOString(),
      evidence: p.evidence ?? [], disqualified: disq.dq, disqualificationReason: disq.reason, source: 'mock',
    };
  }

  async runPipeline(prospects: BrandProspect[], opts?: IntelligenceEngineOptions): Promise<IntelligencePipelineResult> {
    const startedAt = new Date().toISOString();
    const scored = prospects.map(p => this.scoreProspect(p));
    const ranked = scored.filter(p => !p.disqualified).sort((a, b) => b.score.total - a.score.total);
    const maxB = opts?.config?.maxBrands ?? 50;
    return {
      runId: `run-${Date.now()}`, startedAt, completedAt: new Date().toISOString(),
      prospects: ranked.slice(0, maxB), scannedCount: prospects.length,
      disqualifiedCount: scored.filter(p => p.disqualified).length,
      newCount: 0, mode: 'mock', errorCount: 0,
      summary: `Scanned ${prospects.length}. Ranked ${ranked.length}. Top: ${ranked[0]?.brand ?? 'none'} (${ranked[0]?.score.total ?? 0}/100).`,
    };
  }

  getDashboard(prospects: BrandProspect[]): IntelligenceDashboard {
    const s = prospects.filter(p => !p.disqualified);
    const cats = s.reduce((a, p) => { a[p.category] = (a[p.category] ?? 0) + 1; return a; }, {} as Record<string, number>);
    return {
      totalBrandsTracked: prospects.length, tier1Count: s.filter(p => p.score.tier === 'tier_1').length,
      tier2Count: s.filter(p => p.score.tier === 'tier_2').length, tier3Count: s.filter(p => p.score.tier === 'tier_3').length,
      tier4Count: s.filter(p => p.score.tier === 'tier_4').length, newThisWeek: 0,
      distributorGaps: s.filter(p => p.distributors.length === 0).length,
      highPriorityCount: s.filter(p => p.score.tier === 'tier_1' || p.score.tier === 'tier_2').length,
      categoryBreakdown: Object.entries(cats).map(([c, n]) => ({ category: c, count: n })),
      topProspect: s[0], generatedAt: new Date().toISOString(),
    };
  }

  getBrandIntelligence(p: BrandProspect): BrandMarketIntelligence {
    return {
      brandName: p.brand, category: p.category,
      estimatedMonthlySales: p.asins.reduce((s, a) => s + (a.estimatedSales ?? 0), 0),
      estimatedMonthlyRevenue: p.asins.reduce((s, a) => s + (a.estimatedRevenue ?? 0), 0),
      categoryAverageSales: 0, categoryMarketSize: 0, topCompetitors: [], salesTrend: [],
      priceDistribution: [], reviewDistribution: [], categoryGrowth: 12,
      generatedAt: new Date().toISOString(), source: 'mock', sourceLabel: 'Mock Intelligence',
    };
  }
}

export function createBrandIntelligenceClient(_forceMock?: boolean): BrandIntelligenceClient {
  return new MockClient();
}