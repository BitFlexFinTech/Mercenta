/**
 * §Batch-6 — Keepa API client (mock-first).
 * Keepa is a legitimate, ToS-compliant Amazon price/BSR/review-history data
 * provider. Mock client returns realistic simulated data so the full pipeline
 * runs today with zero credentials. Swapping to real requires only a Keepa key.
 */
import type { KeepaProduct } from '@/types';

const MOCK_PRODUCT_POOL: KeepaProduct[] = [
  { asin: 'B0EX001', title: 'Premium Bamboo Cutting Board Set', category: 'Kitchen', currentPrice: 24.99, salesRank: 1250, reviewCount: 342, averageRating: 4.5, brandName: 'EcoKitchen', isFba: true },
  { asin: 'B0EX002', title: 'Ergonomic Office Chair Mesh Back', category: 'Office Products', currentPrice: 189.99, salesRank: 890, reviewCount: 512, averageRating: 4.3, brandName: 'WorkComfort Pro', isFba: true },
  { asin: 'B0EX003', title: 'Organic Cotton Baby Sleepsuit 3-Pack', category: 'Baby', currentPrice: 19.99, salesRank: 3400, reviewCount: 128, averageRating: 4.7, brandName: 'LittleDreams', isFba: false },
  { asin: 'B0EX004', title: 'Smart LED Desk Lamp with Wireless Charger', category: 'Home', currentPrice: 49.99, salesRank: 2100, reviewCount: 267, averageRating: 4.4, brandName: 'LumiTech', isFba: true },
  { asin: 'B0EX005', title: 'Vitamin C Brightening Serum 30ml', category: 'Health & Personal Care', currentPrice: 14.99, salesRank: 560, reviewCount: 890, averageRating: 4.6, brandName: 'GlowLab', isFba: true },
  { asin: 'B0EX006', title: 'Portable Bluetooth Speaker IPX7', category: 'Consumer Electronics', currentPrice: 39.99, salesRank: 1750, reviewCount: 445, averageRating: 4.2, brandName: 'Sennheiser', isFba: true },
  { asin: 'B0EX007', title: 'Dash Cam 4K with Night Vision', category: 'Automotive', currentPrice: 79.99, salesRank: 980, reviewCount: 312, averageRating: 4.5, brandName: 'Autoglym', isFba: true },
  { asin: 'B0EX008', title: 'Organic Green Tea Bags 100-Count', category: 'Grocery', currentPrice: 8.99, salesRank: 4200, reviewCount: 156, averageRating: 4.1, brandName: 'Clipper Teas', isFba: false },
  { asin: 'B0EX009', title: 'USB-C Hub 7-in-1 for MacBook', category: 'Personal Computer', currentPrice: 34.99, salesRank: 1450, reviewCount: 678, averageRating: 4.4, brandName: 'Logitech', isFba: true },
  { asin: 'B0EX010', title: 'Merino Wool Scarf Unisex', category: 'Apparel', currentPrice: 29.99, salesRank: 2800, reviewCount: 89, averageRating: 4.3, brandName: 'Regatta', isFba: false },
  { asin: 'B0EX011', title: 'Shea Butter Moisturiser 200ml', category: 'Health & Personal Care', currentPrice: 12.99, salesRank: 3100, reviewCount: 234, averageRating: 4.5, brandName: 'Bulldog Skincare', isFba: true },
  { asin: 'B0EX012', title: 'Handwoven Cotton Throw Blanket', category: 'Home', currentPrice: 45.00, salesRank: 5200, reviewCount: 78, averageRating: 4.6, brandName: 'Seep', isFba: false },
  { asin: 'B0EX013', title: 'Portable Solar Charger 20W', category: 'Consumer Electronics', currentPrice: 59.99, salesRank: 4300, reviewCount: 167, averageRating: 4.2, brandName: 'Roberts Radio', isFba: true },
];

export interface KeepaClient {
  readonly mode: 'mock' | 'real';
  fetchByCategory(category: string, limit?: number): Promise<KeepaProduct[]>;
  searchProducts(query: string, limit?: number): Promise<KeepaProduct[]>;
  fetchTopSellers(categories?: string[], limit?: number): Promise<KeepaProduct[]>;
}

export class MockKeepaClient implements KeepaClient {
  readonly mode = 'mock' as const;
  async fetchByCategory(category: string, limit = 20): Promise<KeepaProduct[]> {
    return MOCK_PRODUCT_POOL.filter((p) => p.category.toLowerCase() === category.toLowerCase()).slice(0, limit);
  }
  async searchProducts(query: string, limit = 20): Promise<KeepaProduct[]> {
    const q = query.toLowerCase();
    return MOCK_PRODUCT_POOL.filter((p) => p.title.toLowerCase().includes(q) || p.brandName.toLowerCase().includes(q)).slice(0, limit);
  }
  async fetchTopSellers(categories?: string[], limit = 20): Promise<KeepaProduct[]> {
    let pool = MOCK_PRODUCT_POOL;
    if (categories && categories.length > 0) {
      const cats = new Set(categories.map((c) => c.toLowerCase()));
      pool = pool.filter((p) => cats.has(p.category.toLowerCase()));
    }
    return [...pool].sort((a, b) => a.salesRank - b.salesRank).slice(0, limit);
  }
}

export type FetchLike = (url: string, init?: { method?: string; headers?: Record<string, string>; body?: unknown }) => Promise<{ ok: boolean; status: number; json: () => Promise<unknown> }>;

export class RealKeepaClient implements KeepaClient {
  readonly mode = 'real' as const;
  constructor(private readonly apiKey: string, private readonly transport: FetchLike = fetch as unknown as FetchLike) {}
  private async request(endpoint: string, params: Record<string, string | number>): Promise<KeepaProduct[]> {
    const query = new URLSearchParams();
    query.set('key', this.apiKey);
    for (const [k, v] of Object.entries(params)) query.set(k, String(v));
    const url = 'https://api.keepa.com/' + endpoint + '?' + query.toString();
    const res = await this.transport(url);
    if (!res.ok) throw new Error('Keepa HTTP ' + res.status);
    const data = await res.json() as { products?: Record<string, unknown>[] };
    return (data.products ?? []).map((p) => ({
      asin: String(p.asin ?? ''),
      title: String(p.title ?? ''),
      category: String(p.category ?? ''),
      currentPrice: Number(p.price ?? 0),
      salesRank: Number(p.salesRank ?? 99999),
      reviewCount: Number(p.reviewCount ?? 0),
      averageRating: Number(p.averageRating ?? 0),
      brandName: String(p.brand ?? ''),
      isFba: Boolean(p.fbaFulfilled ?? false),
    }));
  }
  async fetchByCategory(category: string, limit = 20): Promise<KeepaProduct[]> { return this.request('category', { category, limit, domain: 'uk' }); }
  async searchProducts(query: string, limit = 20): Promise<KeepaProduct[]> { return this.request('search', { query, limit, domain: 'uk' }); }
  async fetchTopSellers(_categories?: string[], limit = 20): Promise<KeepaProduct[]> { return this.request('bestSellers', { limit, domain: 'uk' }); }
}

export function createKeepaClient(apiKey: string | null, transport?: FetchLike): KeepaClient {
  if (apiKey && apiKey.length > 0 && !apiKey.startsWith('mock:')) return new RealKeepaClient(apiKey, transport);
  return new MockKeepaClient();
}