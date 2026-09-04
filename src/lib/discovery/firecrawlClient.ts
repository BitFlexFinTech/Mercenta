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
  'harvestlane.co.zw': { title: 'Harvest Lane Organics', content: 'Family-owned organic farm in Zimbabwe since 2012. Specialises in organic fruits, vegetables, herbal teas. Soil Association certified. 200 employees, 50 tons monthly. Products: rooibos tea, dried mango, baobab powder, moringa.' },
  'saharathreads.com': { title: 'Sahara Threads Ltd', content: 'Accra-based textile manufacturer, 15 years. Handwoven cotton fabrics for international markets. 300+ artisans. GOTS certified organic cotton. Exports to UK, US, EU. MOQ: 500 yards. Kente cloth, batik, organic cotton scarves.' },
  'pixelperch.io': { title: 'PixelPerch Accessories Inc', content: 'US tech accessories designer/manufacturer since 2018. USB-C hubs, laptop stands, cable organisers. Contract manufacturing in Shenzhen. UK retailers. UKCA/CE certified. 12-person design team.' },
  'voltaic.co.ke': { title: 'Voltaic Home Appliance Co', content: 'Nairobi home appliances and solar electronics since 2015. LED lighting, solar chargers, smart home devices. Exports to 15 countries including UK. ISO 9001. 50,000 units/month. KEPROBA registered.' },
  'apexdrive.de': { title: 'ApexDrive Accessories GmbH', content: 'Munich automotive accessories since 2010. Dash cams, phone mounts, LED lighting. TUV certified. 80 employees, 12M EUR revenue. Expanding to UK market.' },
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
