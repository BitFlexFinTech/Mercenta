/**
 * §Batch-7 — Alibaba supplier data client (mock-first).
 * Uses only Alibaba's PUBLIC verified-supplier signals visible on public,
 * non-authenticated pages — Trade Assurance badges, verified-supplier status,
 * response rates, product counts. Never logs into Alibaba.
 */
import type { ManufacturerProfile } from '@/types';

const MOCK_SUPPLIER_POOL: ManufacturerProfile[] = [
  { id: 'ali-001', companyName: 'Shenzhen Precision Electronics Co Ltd', country: 'China', category: 'Consumer Electronics', yearsInBusiness: 12, tradeAssurance: true, verifiedSupplier: true, capacity: '500,000 units/month', responseRate: 92, rating: 4.6, productCount: 340, exportsToUk: true, sourceUrl: 'https://shenzhenprecision.en.alibaba.com', specializations: ['Bluetooth speakers', 'Smart home devices', 'Wearables'], moq: '500 units', priceRange: '£2-£50' },
  { id: 'ali-002', companyName: 'GreenTech Packaging Ltd', country: 'China', category: 'Grocery', yearsInBusiness: 8, tradeAssurance: true, verifiedSupplier: true, capacity: '200,000 units/month', responseRate: 88, rating: 4.3, productCount: 180, exportsToUk: true, sourceUrl: 'https://greentechpack.en.alibaba.com', specializations: ['Eco-friendly packaging', 'Bamboo products', 'Compostable containers'], moq: '1000 units', priceRange: '£0.50-£5' },
  { id: 'ali-003', companyName: 'Pioneer Kitchenware Manufactory', country: 'China', category: 'Kitchen', yearsInBusiness: 15, tradeAssurance: true, verifiedSupplier: true, capacity: '1,000,000 units/month', responseRate: 95, rating: 4.7, productCount: 520, exportsToUk: true, sourceUrl: 'https://pioneerkitchen.en.alibaba.com', specializations: ['Stainless steel cookware', 'Bamboo cutting boards', 'Kitchen tools'], moq: '200 units', priceRange: '£1-£30' },
  { id: 'ali-004', companyName: 'CozyBaby Textiles Co', country: 'China', category: 'Baby', yearsInBusiness: 6, tradeAssurance: true, verifiedSupplier: false, capacity: '100,000 units/month', responseRate: 78, rating: 4.1, productCount: 95, exportsToUk: true, sourceUrl: 'https://cozybaby.en.alibaba.com', specializations: ['Baby clothing', 'Cotton sleepsuits', 'Baby bedding'], moq: '300 units', priceRange: '£3-£15' },
  { id: 'ali-005', companyName: 'ErgoWork Furniture Ltd', country: 'Vietnam', category: 'Office Products', yearsInBusiness: 10, tradeAssurance: true, verifiedSupplier: true, capacity: '50,000 units/month', responseRate: 85, rating: 4.4, productCount: 210, exportsToUk: true, sourceUrl: 'https://ergowork.vn.alibaba.com', specializations: ['Ergonomic chairs', 'Standing desks', 'Office accessories'], moq: '100 units', priceRange: '£20-£200' },
  { id: 'ali-006', companyName: 'LuxeHome Decor Ltd', country: 'India', category: 'Home', yearsInBusiness: 7, tradeAssurance: false, verifiedSupplier: true, capacity: '80,000 units/month', responseRate: 72, rating: 3.9, productCount: 150, exportsToUk: false, sourceUrl: 'https://luxehome.in.alibaba.com', specializations: ['Home decor', 'Handwoven textiles', 'Ceramic items'], moq: '500 units', priceRange: '£5-£40' },
  { id: 'ali-007', companyName: 'PureCare Health Manufacturing', country: 'China', category: 'Health & Personal Care', yearsInBusiness: 9, tradeAssurance: true, verifiedSupplier: true, capacity: '300,000 units/month', responseRate: 91, rating: 4.5, productCount: 280, exportsToUk: true, sourceUrl: 'https://purecare.en.alibaba.com', specializations: ['Skincare packaging', 'Vitamin bottles', 'Personal care items'], moq: '1000 units', priceRange: '£0.80-£8' },
  { id: 'ali-008', companyName: 'AutoParts Direct Factory', country: 'China', category: 'Automotive', yearsInBusiness: 14, tradeAssurance: true, verifiedSupplier: true, capacity: '200,000 units/month', responseRate: 96, rating: 4.8, productCount: 450, exportsToUk: true, sourceUrl: 'https://autoparts.en.alibaba.com', specializations: ['Dash cams', 'Car accessories', 'LED lighting'], moq: '200 units', priceRange: '£5-£80' },
  { id: 'ali-009', companyName: 'TechConnect Cable Factory', country: 'China', category: 'Personal Computer', yearsInBusiness: 5, tradeAssurance: false, verifiedSupplier: false, capacity: '400,000 units/month', responseRate: 65, rating: 3.5, productCount: 60, exportsToUk: false, sourceUrl: 'https://techconnect.en.alibaba.com', specializations: ['USB cables', 'Chargers', 'Hubs'], moq: '5000 units', priceRange: '£0.50-£10' },
  { id: 'ali-010', companyName: 'ApparelPro Garment Co', country: 'Bangladesh', category: 'Apparel', yearsInBusiness: 11, tradeAssurance: true, verifiedSupplier: true, capacity: '500,000 units/month', responseRate: 87, rating: 4.2, productCount: 320, exportsToUk: true, sourceUrl: 'https://apparelpro.bd.alibaba.com', specializations: ['Casual wear', 'Merino wool scarves', 'Knitted accessories'], moq: '1000 units', priceRange: '£2-£25' },
];
export interface AlibabaClient {
  readonly mode: 'mock' | 'real';
  searchSuppliers(category: string, query?: string): Promise<ManufacturerProfile[]>;
  getSupplierDetail(url: string): Promise<ManufacturerProfile | null>;
}

export class MockAlibabaClient implements AlibabaClient {
  readonly mode = 'mock' as const;
  async searchSuppliers(category: string, _query?: string): Promise<ManufacturerProfile[]> {
    const cat = category.toLowerCase();
    let filtered = MOCK_SUPPLIER_POOL.filter((s) => s.category.toLowerCase() === cat);
    if (filtered.length === 0) filtered = MOCK_SUPPLIER_POOL.filter((s) => s.specializations.some((sp) => sp.toLowerCase().includes(cat)));
    if (filtered.length === 0) filtered = MOCK_SUPPLIER_POOL;
    return [...filtered].sort((a, b) => scoreSupplier(b) - scoreSupplier(a));
  }
  async getSupplierDetail(url: string): Promise<ManufacturerProfile | null> {
    return MOCK_SUPPLIER_POOL.find((s) => s.sourceUrl === url) ?? null;
  }
}

export type FetchLike = (url: string, init?: { method?: string; headers?: Record<string, string>; body?: unknown }) => Promise<{ ok: boolean; status: number; json: () => Promise<unknown>; text: () => Promise<string> }>;

export class RealAlibabaClient implements AlibabaClient {
  readonly mode = 'real' as const;
  constructor(_transport: FetchLike = fetch as unknown as FetchLike) {}
  async searchSuppliers(_category: string, _query?: string): Promise<ManufacturerProfile[]> {
    throw new Error('RealAlibabaClient requires the /discovery/directory Edge Function to be deployed');
  }
  async getSupplierDetail(_url: string): Promise<ManufacturerProfile | null> {
    throw new Error('RealAlibabaClient requires the /discovery/directory Edge Function to be deployed');
  }
}

export function createAlibabaClient(_transport?: FetchLike): AlibabaClient {
  return new MockAlibabaClient();
}

function scoreSupplier(s: ManufacturerProfile): number {
  let score = 0;
  if (s.tradeAssurance) score += 30;
  if (s.verifiedSupplier) score += 25;
  if (s.exportsToUk) score += 20;
  score += Math.min(s.yearsInBusiness * 2, 15);
  score += Math.min(s.productCount / 10, 10);
  return score;
}
