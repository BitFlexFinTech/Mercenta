/** §Batch-6 — Product Research Engine. */
import type { KeepaProduct, ProductGap, AcceptanceScoreFactors, ProductResearchReport } from '@/types';
import { APPROVED_CATEGORIES } from '@/types';
import { createKeepaClient } from './keepaClient';

function estimateMonthlySales(salesRank: number): number {
  if (salesRank <= 100) return 5000;
  if (salesRank <= 500) return 2000;
  if (salesRank <= 1000) return 1000;
  if (salesRank <= 3000) return 500;
  if (salesRank <= 5000) return 200;
  if (salesRank <= 10000) return 100;
  return 50;
}

function computeAcceptanceScore(product: KeepaProduct): { score: number; factors: AcceptanceScoreFactors } {
  const categoryFit = APPROVED_CATEGORIES.includes(product.category as (typeof APPROVED_CATEGORIES)[number]) ? 25 : 0;
  const restrictedTerms = ['vape', 'alcohol', 'firearm', 'hazardous', 'chemical'];
  const hasRestricted = restrictedTerms.some((t) => product.title.toLowerCase().includes(t) || product.brandName.toLowerCase().includes(t));
  const complianceFit = hasRestricted ? 5 : 25;
  const marginFit = product.currentPrice >= 5 && product.currentPrice <= 200 ? 20 : product.currentPrice > 200 ? 25 : product.currentPrice >= 2 ? 10 : 0;
  const knownBrands = ['apple', 'samsung', 'sony', 'nike', 'adidas', 'dyson', 'lego', 'philips', 'bosch', 'pampers', 'loreal', 'nestle'];
  const hasKnown = knownBrands.some((b) => product.brandName.toLowerCase().includes(b) || product.title.toLowerCase().includes(b));
  const ipConflictFree = hasKnown ? 10 : 25;
  const score = categoryFit + complianceFit + marginFit + ipConflictFree;
  return { score, factors: { categoryFit, complianceFit, marginFit, ipConflictFree } };
}

function checkAlreadyListed(product: KeepaProduct, knownBrandNames: string[]): { listed: boolean; brandName?: string } {
  const match = knownBrandNames.find((name) => name.toLowerCase() === product.brandName.toLowerCase());
  return match ? { listed: true, brandName: match } : { listed: false };
}

interface CandidateBrand { name: string; country: string; fitScore: number; }

const MOCK_CANDIDATES: Record<string, CandidateBrand[]> = {
  Kitchen: [{ name: 'Harvest Lane Organics', country: 'Zimbabwe', fitScore: 85 }, { name: 'Culinary Forge', country: 'South Africa', fitScore: 72 }],
  'Office Products': [{ name: 'DeskForge', country: 'Kenya', fitScore: 78 }, { name: 'Pixel Perch', country: 'United States', fitScore: 65 }],
  Baby: [{ name: 'LittleKiwi Baby', country: 'New Zealand', fitScore: 82 }, { name: 'Sahara Threads', country: 'Ghana', fitScore: 55 }],
  Home: [{ name: 'Voltaic Home', country: 'Kenya', fitScore: 80 }, { name: 'Sahara Threads', country: 'Ghana', fitScore: 70 }],
  'Health & Personal Care': [{ name: 'Zambezi Organic Extracts', country: 'Zimbabwe', fitScore: 90 }, { name: 'Nordhaus Naturals', country: 'Germany', fitScore: 75 }],
  'Consumer Electronics': [{ name: 'Voltaic Home', country: 'Kenya', fitScore: 85 }, { name: 'Pixel Perch', country: 'United States', fitScore: 80 }],
  Automotive: [{ name: 'ApexDrive', country: 'Germany', fitScore: 82 }, { name: 'DeskForge', country: 'Kenya', fitScore: 45 }],
  Grocery: [{ name: 'Harvest Lane Organics', country: 'Zimbabwe', fitScore: 88 }, { name: 'TeaBlossom', country: 'Kenya', fitScore: 76 }],
  'Personal Computer': [{ name: 'Pixel Perch', country: 'United States', fitScore: 84 }, { name: 'DeskForge', country: 'Kenya', fitScore: 60 }],
  Apparel: [{ name: 'Sahara Threads', country: 'Ghana', fitScore: 85 }, { name: 'Zambezi Organic Extracts', country: 'Zimbabwe', fitScore: 50 }],
};

function getCandidateBrands(category: string): CandidateBrand[] {
  return MOCK_CANDIDATES[category] ?? [{ name: 'Various (discovery engine)', country: 'TBD', fitScore: 50 }];
}

function buildReasoning(product: KeepaProduct, score: number, factors: AcceptanceScoreFactors): string {
  const parts: string[] = [];
  parts.push(product.title + ' (' + product.asin + ') is a ' + product.category + ' product at ' + String.fromCharCode(163) + product.currentPrice.toFixed(2) + ' BSR ' + product.salesRank);
  if (factors.categoryFit >= 25) parts.push('Fits an approved category.');
  if (factors.complianceFit < 25) parts.push('Potential compliance flag - review required.');
  if (factors.marginFit >= 20) parts.push('Price viable for wholesale.');
  if (factors.ipConflictFree < 25) parts.push('Brand may conflict with established brand.');
  parts.push('Est. monthly: ~' + estimateMonthlySales(product.salesRank) + ' units. Acceptance: ' + score + '/100.');
  return parts.join(' ');
}
export interface ResearchEngineOptions {
  keepaApiKey: string | null;
  knownBrandNames?: string[];
  categories?: string[];
  maxResults?: number;
}

export async function runProductResearch(opts: ResearchEngineOptions): Promise<ProductResearchReport> {
  const client = createKeepaClient(opts.keepaApiKey);
  const categories = opts.categories ?? [...APPROVED_CATEGORIES];
  const maxResults = opts.maxResults ?? 20;
  const knownBrandNames = opts.knownBrandNames ?? [];
  const allProducts = await client.fetchTopSellers(categories, 100);
  const gaps: ProductGap[] = [];

  for (const product of allProducts) {
    const { listed, brandName } = checkAlreadyListed(product, knownBrandNames);
    const { score, factors } = computeAcceptanceScore(product);
    const catApproved = APPROVED_CATEGORIES.includes(product.category as (typeof APPROVED_CATEGORIES)[number]);
    const candidates = catApproved ? getCandidateBrands(product.category) : [];
    const reasoning = buildReasoning(product, score, factors);
    gaps.push({
      asin: product.asin, productTitle: product.title, category: product.category,
      currentPrice: product.currentPrice, salesRank: product.salesRank,
      estimatedMonthlySales: estimateMonthlySales(product.salesRank),
      alreadyListed: listed, listedByBrand: brandName, categoryApproved: catApproved,
      acceptanceScore: score, acceptanceFactors: factors, candidateBrands: candidates, reasoning,
    });
  }

  gaps.sort((a, b) => {
    if (b.acceptanceScore !== a.acceptanceScore) return b.acceptanceScore - a.acceptanceScore;
    return a.salesRank - b.salesRank;
  });

  const topGaps = gaps.filter((g) => !g.alreadyListed && g.categoryApproved).slice(0, maxResults);

  return {
    generatedAt: new Date().toISOString(),
    scannedCount: allProducts.length, gaps, topGaps,
    source: client.mode === 'mock' ? 'mock' : 'keepa',
    sourceLabel: client.mode === 'mock' ? 'Keepa (Mock)' : 'Keepa API',
  };
}

export function formatReportAsText(report: ProductResearchReport): string {
  let out = '';
  out += 'Product Research Report - ' + report.generatedAt.slice(0, 10) + '\n';
  out += 'Source: ' + report.sourceLabel + ' | Scanned: ' + report.scannedCount + ' | Gaps: ' + report.gaps.length + ' | Top: ' + report.topGaps.length + '\n\n';
  out += '--- TOP OPPORTUNITIES ---\n\n';
  for (const gap of report.topGaps) {
    out += (report.topGaps.indexOf(gap) + 1) + '. ' + gap.productTitle + '\n';
    out += '   ASIN: ' + gap.asin + ' | Category: ' + gap.category + '\n';
    out += '   Price: ' + String.fromCharCode(163) + gap.currentPrice.toFixed(2) + ' | BSR: ' + gap.salesRank + ' | Est. monthly: ' + gap.estimatedMonthlySales + ' units\n';
    out += '   Acceptance score: ' + gap.acceptanceScore + '/100\n';
    if (gap.alreadyListed) out += '   Already listed by: ' + gap.listedByBrand + '\n';
    else out += '   NOT currently in Mercenta catalog\n';
    if (gap.candidateBrands.length > 0) {
      out += '   Candidate brands: ' + gap.candidateBrands.map((c) => c.name + ' (' + c.country + ', fit ' + c.fitScore + ')').join(', ') + '\n';
    }
    out += '   Reasoning: ' + gap.reasoning + '\n\n';
  }
  return out;
}