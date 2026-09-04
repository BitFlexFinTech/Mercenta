/**
 * Unauthorized Reseller Tracker — extension of the Product Research Agent.
 * Checks whether a prospective brand's products have grey-market/arbitrage
 * sellers undermining UK pricing. Legitimate public research only.
 */

import type { KeepaProduct } from '@/types';
import { createKeepaClient } from './keepaClient';

export interface ResellerListing {
  asin: string;
  productTitle: string;
  brandPrice: number;
  lowestResellerPrice: number;
  priceGap: number;
  estimatedMonthlySales: number;
  resellerCount: number;
  riskLevel: 'low' | 'medium' | 'high';
}

export interface ResellerTrackerReport {
  generatedAt: string;
  brandName: string;
  asinsChecked: string[];
  totalListings: number;
  highRisk: ResellerListing[];
  mediumRisk: ResellerListing[];
  lowRisk: ResellerListing[];
  pitchSummary: string;
  source: 'mock' | 'keepa';
}

const MOCK_DATA: Record<string, ResellerListing[]> = {
  'Zambezi Organic Extracts': [
    { asin: 'B0EXAMPLE01', productTitle: 'Marula Oil 100ml', brandPrice: 24.99, lowestResellerPrice: 18.50, priceGap: 6.49, estimatedMonthlySales: 500, resellerCount: 4, riskLevel: 'high' },
    { asin: 'B0EXAMPLE02', productTitle: 'Baobab Serum 50ml', brandPrice: 34.99, lowestResellerPrice: 32.00, priceGap: 2.99, estimatedMonthlySales: 300, resellerCount: 2, riskLevel: 'medium' },
    { asin: 'B0EXAMPLE03', productTitle: 'Shea Butter 200g', brandPrice: 14.99, lowestResellerPrice: 14.50, priceGap: 0.49, estimatedMonthlySales: 800, resellerCount: 1, riskLevel: 'low' },
  ],
  'Harvest Lane Organics': [
    { asin: 'B0EXAMPLE04', productTitle: 'Organic Honey 500g', brandPrice: 12.99, lowestResellerPrice: 9.99, priceGap: 3.00, estimatedMonthlySales: 1200, resellerCount: 6, riskLevel: 'high' },
  ],
};

function getMockData(brandName: string): ResellerListing[] {
  return MOCK_DATA[brandName] ?? [
    { asin: 'B0MOCK001', productTitle: 'Mock Product A', brandPrice: 29.99, lowestResellerPrice: 28.00, priceGap: 1.99, estimatedMonthlySales: 200, resellerCount: 2, riskLevel: 'medium' },
    { asin: 'B0MOCK002', productTitle: 'Mock Product B', brandPrice: 49.99, lowestResellerPrice: 49.50, priceGap: 0.49, estimatedMonthlySales: 100, resellerCount: 0, riskLevel: 'low' },
  ];
}

function classifyRisk(priceGap: number, resellerCount: number): 'low' | 'medium' | 'high' {
  if (priceGap > 0 && priceGap > 0.1 * (priceGap + 1)) return 'high';
  if (resellerCount >= 3) return 'high';
  if (resellerCount >= 1) return 'medium';
  return 'low';
}

function buildSummary(total: number, high: number, medium: number): string {
  const affected = high + medium;
  if (affected === 0) return 'No unauthorized reseller activity detected — pricing is stable.';
  const pct = Math.round((affected / total) * 100);
  return `${affected} of ${total} products (${pct}%) show unauthorized reseller activity. ${high} at high risk, ${medium} at medium risk. We can help stabilize pricing.`;
}

export interface ResellerTrackerOptions {
  keepaApiKey: string | null;
  brandName: string;
  asins: string[];
  knownBrandPrices?: Record<string, number>;
}

export async function checkUnauthorizedResellers(opts: ResellerTrackerOptions): Promise<ResellerTrackerReport> {
  const client = createKeepaClient(opts.keepaApiKey);
  const isMock = client.mode === 'mock';

  if (isMock) {
    const listings = getMockData(opts.brandName);
    return {
      generatedAt: new Date().toISOString(), brandName: opts.brandName, asinsChecked: opts.asins,
      totalListings: listings.length, source: 'mock',
      highRisk: listings.filter((l) => l.riskLevel === 'high'),
      mediumRisk: listings.filter((l) => l.riskLevel === 'medium'),
      lowRisk: listings.filter((l) => l.riskLevel === 'low'),
      pitchSummary: buildSummary(listings.length, listings.filter((l) => l.riskLevel === 'high').length, listings.filter((l) => l.riskLevel === 'medium').length),
    };
  }

  const products: KeepaProduct[] = await client.searchProducts(opts.brandName, 50);
  const listings: ResellerListing[] = products.map((p) => {
    const brandPrice = opts.knownBrandPrices?.[p.asin] ?? p.currentPrice;
    const priceGap = Math.max(0, brandPrice - p.currentPrice);
    const resellerCount = priceGap > 0 ? 1 : 0;
    return {
      asin: p.asin, productTitle: p.title, brandPrice, lowestResellerPrice: p.currentPrice,
      priceGap,
      estimatedMonthlySales: p.salesRank <= 1000 ? 1000 : 100,
      resellerCount,
      riskLevel: classifyRisk(priceGap, resellerCount),
    };
  });

  return {
    generatedAt: new Date().toISOString(), brandName: opts.brandName, asinsChecked: opts.asins,
    totalListings: listings.length, source: 'keepa',
    highRisk: listings.filter((l) => l.riskLevel === 'high'),
    mediumRisk: listings.filter((l) => l.riskLevel === 'medium'),
    lowRisk: listings.filter((l) => l.riskLevel === 'low'),
    pitchSummary: buildSummary(listings.length, listings.filter((l) => l.riskLevel === 'high').length, listings.filter((l) => l.riskLevel === 'medium').length),
  };
}