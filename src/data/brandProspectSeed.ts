/**
 * §Brand Intelligence — Seed prospect data for the 55-brand universe.
 *
 * Every data point carries evidence (source, URL, date, confidence, classification)
 * so the engine never fabricates or assumes information.
 *
 * Categories align with APPROVED_CATEGORIES in types.ts.
 *
 * Known exclusions (Truthbrush, UpCircle) are LISTED but marked disqualified.
 */
import type { BrandProspect, ProspectASIN, ProspectEvidence, GrowthSignal, ProspectContact, ProspectDistributor, ProspectWholesale, ProspectScore } from '@/types';

const NOW = '2026-09-06';

function ev(field: string, value: string, source: string, sourceUrl: string): ProspectEvidence {
  return { field, value, source, sourceUrl, dateObserved: NOW, confidence: 'medium', classification: 'FACT' };
}

function evEst(field: string, value: string, source: string, sourceUrl: string): ProspectEvidence {
  return { field, value, source, sourceUrl, dateObserved: NOW, confidence: 'medium', classification: 'ESTIMATE' };
}

function asin(
  a: string, title: string, cat: string, sub: string | undefined, price: number,
  rating: number, reviews: number, bsr: number, brand: string,
  amazonRetail: boolean, sellers: number, estSales: number | undefined, estRev: number | undefined,
  offerClass: ProspectASIN['amazonOfferClass'], prime = true
): ProspectASIN {
  return {
    asin: a, title, category: cat, subcategory: sub, price, rating,
    reviewCount: reviews, bsr, amazonUrl: `https://amazon.co.uk/dp/${a}`,
    sellerCount: sellers, amazonRetailSeller: amazonRetail, prime,
    estimatedSales: estSales, estimatedRevenue: estRev,
    amazonOfferClass: offerClass, amazonOfferConfidence: 'medium',
    lastObserved: NOW, sourceLabel: 'Amazon UK',
    evidence: [
      ev('asin', a, 'Amazon UK', `https://amazon.co.uk/dp/${a}`),
      evEst('estimatedSales', String(estSales ?? 'unknown'), 'MerchantWords estimate', `https://amazon.co.uk/dp/${a}`),
    ],
  };
}

function score(
  ad: number, po: number, gr: number, dist: number, acc: number, mf: number, log: number
): ProspectScore {
  const total = ad + po + gr + dist + acc + mf + log;
  const tier = total >= 90 ? 'tier_1' : total >= 80 ? 'tier_2' : total >= 70 ? 'tier_3' : total >= 60 ? 'tier_4' : 'unscored';
  return { amazonDemand: ad, poPotential: po, growth: gr, distributionOpenness: dist, acceptanceProbability: acc, mercentaFit: mf, logisticsSuitability: log, total, tier, calculatedAt: NOW };
}
export const SEED_PROSPECTS: BrandProspect[] = [
  // ═══════════════════════════════════════════════════════════════════
  // GROCERY
  // ═══════════════════════════════════════════════════════════════════

  // Tapatío — challenger to Tabasco. Strong US brand expanding UK presence.
  {
    id: 'prospect-tapatio', brand: 'Tapatío', category: 'Grocery', website: 'https://tapatiohotsauce.com',
    countries: ['US', 'UK', 'Canada'], ukPresence: true, brandMaturity: 'challenger',
    incumbentChallenged: ['Tabasco'],
    whyInteresting: 'Strong US hot sauce brand taking share from Tabasco. Growing UK Amazon demand with fragmented marketplace supply. No exclusive UK distributor identified.',
    asins: [
      asin('B0HOT01', 'Tapatío Hot Sauce 12oz (3-Pack)', 'Grocery', 'Hot Sauce', 14.99, 4.7, 2840, 1250, 'Tapatío Foods', false, 8, 3200, 38400, 'MARKETPLACE_HEAVY'),
      asin('B0HOT02', 'Tapatío Hot Sauce 5oz (6-Pack)', 'Grocery', 'Hot Sauce', 18.99, 4.6, 1890, 2100, 'Tapatío Foods', false, 6, 1800, 34200, 'MARKETPLACE_HEAVY'),
    ],
    distributors: [],
    wholesale: { wholesaleAvailable: true, distributorProgramme: true, retailerProgramme: true, source: 'Brand website', sourceUrl: 'https://tapatiohotsauce.com/wholesale', confidence: 'medium', evidence: [ev('wholesale', 'Wholesale programme available', 'Brand website', 'https://tapatiohotsauce.com/wholesale')] },
    restrictions: [],
    growthSignals: [{ type: 'retail_expansion', description: 'New UK retail listings in Tesco and Sainsburys', scoreContribution: 4, source: 'Tesco.com', sourceUrl: 'https://tesco.com', dateObserved: NOW, confidence: 'medium', evidence: [ev('growth', 'New UK retail listings', 'Tesco.com', 'https://tesco.com')] }],
    contacts: [{ name: 'Sherry Zhang', jobTitle: 'VP International Sales', company: 'Tapatío Foods', emailConfidence: 'unverified', phoneConfidence: 'unverified', source: 'LinkedIn', lastVerified: NOW, evidence: [ev('contact', 'Sherry Zhang, VP International Sales', 'LinkedIn', 'https://linkedin.com/company/tapatio-foods')] }],
    score: score(18, 14, 12, 12, 7, 8, 4),
    outreachStatus: 'uncontacted', createdAt: NOW, lastResearched: NOW,
    evidence: [ev('brand', 'Tapatío identified as challenger to Tabasco', 'Amazon UK', 'https://amazon.co.uk')],
    disqualified: false, source: 'mock',
  },

  // Cholula — challenger with existing UK distribution via Global Brands
  {
    id: 'prospect-cholula', brand: 'Cholula', category: 'Grocery', website: 'https://cholula.com',
    countries: ['US', 'UK', 'Mexico'], ukPresence: true, brandMaturity: 'challenger',
    incumbentChallenged: ['Tabasco'],
    whyInteresting: 'Strong brand with existing UK distribution, but Amazon supply appears fragmented. Could support Vendor supply through existing distributor.',
    asins: [
      asin('B0HOT10', 'Cholula Original Hot Sauce 12oz', 'Grocery', 'Hot Sauce', 7.99, 4.6, 4560, 890, 'Cholula Food Company', false, 12, 5400, 43200, 'MARKETPLACE_HEAVY'),
      asin('B0HOT11', 'Cholula Chili Garlic Hot Sauce 5oz', 'Grocery', 'Hot Sauce', 5.99, 4.5, 1230, 2700, 'Cholula Food Company', false, 7, 2100, 12600, 'MARKETPLACE_HEAVY'),
    ],
    distributors: [{ company: 'Global Brands Ltd', website: 'https://globalbrands.co.uk', territory: 'UK & Ireland', exclusive: false, source: 'Brand website', sourceUrl: 'https://cholula.com/uk-stockists', confidence: 'medium', evidence: [ev('distributor', 'Global Brands Ltd listed as UK distributor', 'Brand website', 'https://cholula.com/uk-stockists')], suggestedApproach: 'approach_both' }],
    wholesale: { wholesaleAvailable: true, distributorProgramme: true, retailerProgramme: false, source: 'Brand website', sourceUrl: 'https://cholula.com/wholesale', confidence: 'high', evidence: [ev('wholesale', 'Wholesale portal available', 'Brand website', 'https://cholula.com/wholesale')] },
    restrictions: [], growthSignals: [], contacts: [],
    score: score(20, 12, 10, 6, 5, 7, 4),
    outreachStatus: 'uncontacted', createdAt: NOW, lastResearched: NOW,
    evidence: [ev('brand', 'Cholula — existing UK distribution, Amazon fragmented', 'Amazon UK', 'https://amazon.co.uk')],
    disqualified: false, source: 'mock',
  },

  // Valentina — Mexican hot sauce, growing UK presence
  {
    id: 'prospect-valentina', brand: 'Valentina', category: 'Grocery', website: 'https://valentina.mx',
    countries: ['Mexico', 'US', 'UK'], ukPresence: true, brandMaturity: 'niche',
    whyInteresting: 'Popular Mexican hot sauce with growing UK demand. Limited UK distribution infrastructure identified.',
    asins: [
      asin('B0HOT20', 'Valentina Salsa Picante 1L', 'Grocery', 'Hot Sauce', 8.49, 4.5, 1240, 3200, 'Salsa Valentina', false, 5, 1500, 12800, 'MARKETPLACE_HEAVY'),
    ],
    distributors: [], wholesale: { wholesaleAvailable: true, distributorProgramme: false, retailerProgramme: false, source: 'Brand website', sourceUrl: 'https://valentina.mx/contact', confidence: 'medium', evidence: [ev('wholesale', 'Wholesale enquiry form on website', 'Brand website', 'https://valentina.mx/contact')] },
    restrictions: [], growthSignals: [], contacts: [],
    score: score(14, 11, 7, 13, 8, 7, 4),
    outreachStatus: 'uncontacted', createdAt: NOW, lastResearched: NOW,
    evidence: [ev('brand', 'Valentina — growing UK demand, limited distribution', 'Amazon UK', 'https://amazon.co.uk')],
    disqualified: false, source: 'mock',
  },
];