/**
 * §Batch-8 — Firecrawl web-fetching client (mock-first).
 * Crawls web pages and returns clean structured content for LLM consumption.
 * Handles JS-rendered pages better than raw HTTP fetch.
 * Used as the discovery engine's research-stage web-fetching layer.
 */
import { chargeService } from './budget';

export interface CrawlResult {
  url: string;
  title: string;
  content: string;
}

export interface FirecrawlClient {
  readonly mode: 'mock' | 'real';
  crawl(url: string): Promise<CrawlResult>;
  crawlBatch(urls: string[]): Promise<CrawlResult[]>;
}

const ESTIMATED_COST_PER_CRAWL_GBP = 0.01;

const MOCK_CONTENT: Record<string, { title: string; content: string }> = {
  'clipper-teas.com': { title: 'Clipper Teas', content: 'UK organic tea and coffee brand. Organic and fairtrade ranges sold in supermarkets and online. Committed to organic farming and environmental responsibility.' },
  'regatta.com': { title: 'Regatta', content: 'UK outdoor clothing and footwear brand. Range includes waterproofs, fleeces, baselayers and accessories for men, women and kids. Widely stocked across UK retail.' },
  'logitech.com': { title: 'Logitech', content: 'Global computer peripherals and accessories brand. Keyboards, mice, webcams and headsets for work and gaming. Broad UK retail presence.' },
  'seepuk.com': { title: 'Seep', content: 'UK microfibre cleaning cloths and accessories brand. Deeply folded premium microfibre made in the UK. Sold through UK retail and online marketplaces.' },
  'autoglym.com': { title: 'Autoglym', content: 'UK car care and detailing products manufacturer. Wash, polish, clay and interior care ranges. Owned by a global energy group; strong UK retail presence.' },
};

const FALLBACK = { title: 'Company Website', content: 'Manufacturer of quality products for international markets. Exports to UK. Experienced with European distributors. Multiple relevant certifications.' };
export class MockFirecrawlClient implements FirecrawlClient {
  readonly mode = 'mock' as const;
  async crawl(url: string): Promise<CrawlResult> {
    await new Promise((r) => setTimeout(r, 100));
    const domain = url.replace(/^https?:\/\//, '').replace(/\/.*$/, '').replace(/^www\./, '');
    const page = MOCK_CONTENT[domain] ?? FALLBACK;
    return { url, title: page.title, content: page.content };
  }
  async crawlBatch(urls: string[]): Promise<CrawlResult[]> {
    return Promise.all(urls.map((u) => this.crawl(u)));
  }
}

export type FetchLike = (url: string, init?: { method?: string; headers?: Record<string, string>; body?: unknown }) => Promise<{ ok: boolean; status: number; json: () => Promise<unknown> }>;

export class RealFirecrawlClient implements FirecrawlClient {
  readonly mode = 'real' as const;
  constructor(private readonly apiKey: string, private readonly transport: FetchLike = fetch as unknown as FetchLike) {}
  async crawl(url: string): Promise<CrawlResult> {
    if (!chargeService('firecrawl', ESTIMATED_COST_PER_CRAWL_GBP)) {
      throw new Error('Firecrawl budget cap reached');
    }
    const res = await this.transport('https://api.firecrawl.dev/v1/crawl', {
      method: 'POST',
      headers: { Authorization: 'Bearer ' + this.apiKey, 'Content-Type': 'application/json' },
      body: { url, formats: ['markdown'], onlyMainContent: true },
    });
    if (!res.ok) throw new Error('Firecrawl HTTP ' + res.status);
    const data = (await res.json()) as { data?: { markdown?: string; metadata?: { title?: string } }[] };
    const first = data.data?.[0];
    return { url, title: first?.metadata?.title ?? url, content: first?.markdown ?? '' };
  }
  async crawlBatch(urls: string[]): Promise<CrawlResult[]> {
    const results: CrawlResult[] = [];
    for (const url of urls) {
      try { results.push(await this.crawl(url)); }
      catch { results.push({ url, title: url, content: '' }); }
    }
    return results;
  }
}

export function createFirecrawlClient(apiKey: string | null, transport?: FetchLike): FirecrawlClient {
  if (apiKey && apiKey.length > 0 && !apiKey.startsWith('mock:')) return new RealFirecrawlClient(apiKey, transport);
  return new MockFirecrawlClient();
}
