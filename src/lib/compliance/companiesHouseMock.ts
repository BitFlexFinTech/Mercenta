/**
 * §Priority-1 — MOCK Companies House client (mock-first policy).
 *
 * Implements the EXACT same method signatures and result shapes as the real
 * client in companiesHouseClient.ts. Every brand company is a deterministic
 * record in a simulated registrar; unknown numbers are truly not-found; every
 * 4th lookup is rate-limited once (the retry succeeds), proving failure/retry
 * without any network call.
 */

import type { ChCompany, ChLookupResult } from './companiesHouseClient';

interface MockChCompany extends ChCompany {
  lookupTotal: number;
}

const registry = new Map<string, MockChCompany>();
let counter = 0;

function seeded(id: string, name: string, status: ChCompany['status']): MockChCompany {
  counter += 1;
  return {
    companyNumber: `MOCK-CH-${String(10000000 + counter)}`,
    companyName: name,
    status,
    incorporationDate: `20${String(10 + (counter % 12))}-0${(counter % 9) + 1}-01`,
    registeredOfficeAddress: '1 Simulated Street, London',
    sicCodes: ['47910'],
    lookupTotal: 0,
  };
}

/** Deterministic simulated registrar for known demo brands. */
export function seedCompaniesHouse(brands: { id: string; name: string; dissolved?: boolean }[]): void {
  registry.clear();
  counter = 0;
  for (const brand of brands) {
    const rec = seeded(brand.id, `${brand.name} Ltd`, brand.dissolved ? 'dissolved' : 'active');
    registry.set(brand.id, rec);
  }
}

export function resetMockCompaniesHouseState(): void {
  registry.clear();
  counter = 0;
}

/** Deterministic default seed (matches the demo brand registry). */
export function ensureCompaniesHouseSeed(): void {
  if (registry.size > 0) return;
  seedCompaniesHouse([
    { id: 'brand-zambezi', name: 'Zambezi Traders' },
    { id: 'brand-deskforge', name: 'DeskForge' },
    { id: 'brand-nordhaus', name: 'Nordhaus' },
    { id: 'brand-kalahari', name: 'Kalahari Goods' },
  ]);
}

function delay(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

export function createMockCompaniesHouseClient(): {
  lookupCompany(query: { companyNumber?: string; companyName?: string }): Promise<ChLookupResult>;
} {
  return {
    async lookupCompany(query: { companyNumber?: string; companyName?: string }): Promise<ChLookupResult> {
      ensureCompaniesHouseSeed();
      await delay(180);
      const key = (query.companyNumber ?? query.companyName ?? '').toLowerCase();
      // Deterministic transient 502 on every 4th lookup (simulated rate limit).
      counter += 1;
      if (counter % 4 === 0) {
        return { ok: false, rateLimited: true, error: 'Companies House rate limit (simulated) — retry' };
      }
      for (const rec of registry.values()) {
        if (
          (query.companyNumber && rec.companyNumber.toLowerCase() === key) ||
          (query.companyName && rec.companyName.toLowerCase().includes(key))
        ) {
          rec.lookupTotal += 1;
          return { ok: true, match: { ...rec } as ChCompany };
        }
      }
      return { ok: true, match: null, notFound: true };
    },
  };
}