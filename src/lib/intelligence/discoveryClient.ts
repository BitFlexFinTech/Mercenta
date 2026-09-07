/**
 * §Brand Intelligence — Mock Discovery Client.
 * Enriches prospects by searching for distributors, contacts, restrictions, and growth signals.
 * Mock-first: uses built-in brand lookups + seed data. Returns empty results for unknown brands.
 */
import type { GrowthSignal, ProspectContact, ProspectDistributor } from '@/types';
import { SEED_PROSPECTS } from '@/data/brandProspectSeed';
import { EXTRA_PROSPECTS } from '@/data/brandExtraSeed';
import type { DiscoveryClient, AmazonDataClient } from './intelligenceTypes';
import type { IntelligencePipelineConfig, ProspectASIN } from '@/types';

/* ── Brand lookup index built from seed data ─────────────────────── */

const ALL_SEED = [...SEED_PROSPECTS, ...EXTRA_PROSPECTS];
const BRAND_INDEX = new Map<string, typeof ALL_SEED[0]>();
for (const p of ALL_SEED) {
  BRAND_INDEX.set(p.brand.toLowerCase(), p);
}

function lookup(brandName: string) {
  return BRAND_INDEX.get(brandName.toLowerCase());
}

/* ── Mock Discovery Client ───────────────────────────────────────── */

class MockDiscoveryClientImpl implements DiscoveryClient {
  readonly mode = 'mock' as const;

  async searchForDistributors(brandName: string): Promise<{
    distributors: { company: string; website: string; territory: string; exclusive: boolean; source: string; sourceUrl: string }[];
    status: 'NONE_FOUND' | 'BRAND_DIRECT' | 'DISTRIBUTOR_IDENTIFIED' | 'EXCLUSIVE_DISTRIBUTOR' | 'UNKNOWN';
  }> {
    const brand = lookup(brandName);
    if (brand && brand.distributors.length > 0) {
      const dists = brand.distributors.map(d => ({
        company: d.company, website: d.website, territory: d.territory,
        exclusive: d.exclusive, source: d.source, sourceUrl: d.sourceUrl,
      }));
      const anyExclusive = dists.some(d => d.exclusive);
      return { distributors: dists, status: anyExclusive ? 'EXCLUSIVE_DISTRIBUTOR' : 'DISTRIBUTOR_IDENTIFIED' };
    }
    // Known brand with no distributor data
    if (brand) return { distributors: [], status: 'NONE_FOUND' };
    return { distributors: [], status: 'UNKNOWN' };
  }

  async searchForContacts(brandName: string, _category: string): Promise<{
    contacts: { name: string; jobTitle: string; linkedInUrl?: string; email?: string }[];
  }> {
    const brand = lookup(brandName);
    if (brand && brand.contacts.length > 0) {
      return {
        contacts: brand.contacts.map(c => ({
          name: c.name, jobTitle: c.jobTitle, linkedInUrl: c.linkedInUrl, email: c.email,
        })),
      };
    }
    return { contacts: [] };
  }

  async checkAmazonRestrictions(brandName: string): Promise<{
    restricted: boolean;
    restrictions: { description: string; severity: 'hard' | 'conditional' | 'unknown'; sourceUrl: string }[];
  }> {
    const brand = lookup(brandName);
    if (brand && brand.restrictions.length > 0) {
      const hasHard = brand.restrictions.some(r => r.severity === 'hard');
      return {
        restricted: hasHard,
        restrictions: brand.restrictions.map(r => ({
          description: r.description, severity: r.severity, sourceUrl: r.sourceUrl,
        })),
      };
    }
    return { restricted: false, restrictions: [] };
  }

  async detectGrowthSignals(brandName: string): Promise<{
    signals: { type: GrowthSignal['type']; description: string; scoreContribution: number; sourceUrl: string }[];
  }> {
    const brand = lookup(brandName);
    if (brand && brand.growthSignals.length > 0) {
      return {
        signals: brand.growthSignals.map(s => ({
          type: s.type, description: s.description, scoreContribution: s.scoreContribution, sourceUrl: s.sourceUrl,
        })),
      };
    }
    return { signals: [] };
  }
}

/* ── Mock Amazon Data Client ─────────────────────────────────────── */

class MockAmazonDataClientImpl implements AmazonDataClient {
  readonly mode = 'mock' as const;

  async searchCategory(_category: string, _config: IntelligencePipelineConfig): Promise<ProspectASIN[]> {
    return [];
  }

  async searchBrand(brandName: string, _config: IntelligencePipelineConfig): Promise<ProspectASIN[]> {
    const brand = lookup(brandName);
    return brand?.asins ?? [];
  }

  async getAsinDetail(asin: string): Promise<ProspectASIN | null> {
    for (const p of ALL_SEED) {
      const found = p.asins.find(a => a.asin === asin);
      if (found) return found;
    }
    return null;
  }
}

/* ── Factory ─────────────────────────────────────────────────────── */

export function createDiscoveryClient(): DiscoveryClient {
  return new MockDiscoveryClientImpl();
}

export function createAmazonDataClient(): AmazonDataClient {
  return new MockAmazonDataClientImpl();
}