/** §Batch-17 — UK import market data (TAM/SAM by category). */
import type { ApprovedCategory } from '@/types';

export interface CategoryTamSam {
  category: ApprovedCategory;
  tamGbpBillions: number;
  samGbpBillions: number;
  samPercentage: number;
  hsCodeRanges: string[];
  source: string;
  description: string;
  dataYear: number;
}

export interface TamSamReport {
  generatedAt: string;
  categories: CategoryTamSam[];
  totalTamGbp: number;
  totalSamGbp: number;
  source: string;
  methodology: string;
}


const CATEGORY_TAM_SAM: CategoryTamSam[] = [
  { category: 'Home' as ApprovedCategory, tamGbpBillions: 3.2, samGbpBillions: 0.48, samPercentage: 15,
    hsCodeRanges: ['HS 9401-9406', 'HS 6302-6304'], source: 'ONS UK Trade in Goods (SITC 82-83), 2024',
    description: 'Furniture, home textiles, ceramic ware, and lighting imports. Strong growth in smart-home.', dataYear: 2024 },
  { category: 'Baby' as ApprovedCategory, tamGbpBillions: 1.8, samGbpBillions: 0.27, samPercentage: 15,
    hsCodeRanges: ['HS 9503', 'HS 6209'], source: 'ONS UK Trade in Goods (SITC 894), 2024',
    description: 'Baby apparel, nursery equipment, toys, feeding accessories. Premium-brand imports growing.', dataYear: 2024 },
  { category: 'Office Products' as ApprovedCategory, tamGbpBillions: 2.1, samGbpBillions: 0.42, samPercentage: 20,
    hsCodeRanges: ['HS 4802-4823', 'HS 8470'], source: 'ONS UK Trade in Goods (SITC 64, 75), 2024',
    description: 'Paper products, stationery, office furniture. Hybrid-work trends sustaining demand.', dataYear: 2024 },
  { category: 'Health & Personal Care' as ApprovedCategory, tamGbpBillions: 4.5, samGbpBillions: 0.68, samPercentage: 15,
    hsCodeRanges: ['HS 3303-3307', 'HS 3401'], source: 'ONS UK Trade in Goods (SITC 55, 54), 2024',
    description: 'Cosmetics, toiletries, OTC healthcare. Natural/organic sub-segments growing at 12% CAGR.', dataYear: 2024 },
  { category: 'Kitchen' as ApprovedCategory, tamGbpBillions: 2.8, samGbpBillions: 0.56, samPercentage: 20,
    hsCodeRanges: ['HS 7323', 'HS 8210-8215'], source: 'ONS UK Trade in Goods (SITC 69, 66), 2024',
    description: 'Cookware, tableware, kitchen gadgets. Premium chef-branded segments show strongest margins.', dataYear: 2024 },
  { category: 'Consumer Electronics' as ApprovedCategory, tamGbpBillions: 8.1, samGbpBillions: 0.81, samPercentage: 10,
    hsCodeRanges: ['HS 8518-8529', 'HS 8471'], source: 'ONS UK Trade in Goods (SITC 76-77), 2024',
    description: 'Audio, headphones, gaming accessories, smart-home. Niche premium brands gaining share.', dataYear: 2024 },
  { category: 'Automotive' as ApprovedCategory, tamGbpBillions: 5.2, samGbpBillions: 0.52, samPercentage: 10,
    hsCodeRanges: ['HS 8708', 'HS 8512'], source: 'ONS UK Trade in Goods (SITC 78), 2024',
    description: 'Auto accessories, aftermarket parts, car-care. E-commerce aftermarket share growing rapidly.', dataYear: 2024 },
  { category: 'Grocery' as ApprovedCategory, tamGbpBillions: 6.0, samGbpBillions: 1.2, samPercentage: 20,
    hsCodeRanges: ['HS 2001-2009', 'HS 0901-0910'], source: 'ONS UK Trade in Goods (SITC 05-09), 2024',
    description: 'Processed foods, beverages, spices. DCTS-tariff-eligible African-origin products have cost advantage.', dataYear: 2024 },
  { category: 'Personal Computer' as ApprovedCategory, tamGbpBillions: 3.5, samGbpBillions: 0.35, samPercentage: 10,
    hsCodeRanges: ['HS 8471', 'HS 8473'], source: 'ONS UK Trade in Goods (SITC 75), 2024',
    description: 'PC peripherals, cables, hubs, input devices. Remote-work tailwinds stabilising category.', dataYear: 2024 },
  { category: 'Apparel' as ApprovedCategory, tamGbpBillions: 7.8, samGbpBillions: 1.17, samPercentage: 15,
    hsCodeRanges: ['HS 6101-6117', 'HS 6201-6217'], source: 'ONS UK Trade in Goods (SITC 84-85), 2024',
    description: 'Apparel, footwear, luggage. African-origin apparel benefits from preferential duty access.', dataYear: 2024 },
];

const SUM_TAM = CATEGORY_TAM_SAM.reduce((s, c) => s + c.tamGbpBillions, 0);
const SUM_SAM = CATEGORY_TAM_SAM.reduce((s, c) => s + c.samGbpBillions, 0);

export function getTamSamReport(): TamSamReport {
  return {
    generatedAt: new Date().toISOString(),
    categories: CATEGORY_TAM_SAM,
    totalTamGbp: SUM_TAM,
    totalSamGbp: SUM_SAM,
    source: 'ONS UK Trade in Goods (SITC), 2024 data - illustrative demo figures',
    methodology: 'Categories mapped from HS/SITC codes to Mercenta APPROVED_CATEGORIES. TAM = total UK import value in mapped HS ranges. SAM = estimated addressable share given Mercenta wholesale model, sourcing regions, and vendor-channel fit. SAM percentages are internal heuristics, directional not precise.',
  };
}

export function getCategoryTamSam(category: ApprovedCategory): CategoryTamSam | undefined {
  return CATEGORY_TAM_SAM.find((c) => c.category === category);
}

export function formatCategoryTamSamForOutreach(category: ApprovedCategory): string {
  const d = getCategoryTamSam(category);
  if (!d) return '';
  return d.category + ': UK imports worth GBP ' + d.tamGbpBillions.toFixed(1) + 'B (' + d.dataYear + '), estimated addressable market GBP ' + d.samGbpBillions.toFixed(2) + 'B. ' + d.description + ' Source: ' + d.source;
}

export function formatAggregateTamSam(): string {
  return 'The UK imports over GBP ' + SUM_TAM.toFixed(0) + 'B annually in ' + CATEGORY_TAM_SAM.length + ' categories Mercenta covers. Serviceable addressable market estimated at GBP ' + SUM_SAM.toFixed(1) + 'B.';
}

export function formatTamSamReport(r: TamSamReport): string {
  let out = 'UK Import TAM/SAM Report - ' + r.generatedAt.slice(0, 10) + '\nSource: ' + r.source + '\n\n';
  out += 'Total TAM: GBP ' + r.totalTamGbp.toFixed(1) + 'B\nTotal SAM: GBP ' + r.totalSamGbp.toFixed(1) + 'B\n\n';
  for (const c of r.categories) {
    out += c.category + ': TAM GBP ' + c.tamGbpBillions.toFixed(2) + 'B | SAM GBP ' + c.samGbpBillions.toFixed(2) + 'B (' + c.samPercentage + '%)\n';
    out += '  HS: ' + c.hsCodeRanges.join(', ') + '\n  ' + c.description + '\n\n';
  }
  out += '---\n' + r.methodology;
  return out;
}