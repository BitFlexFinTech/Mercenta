/**
 * §Priority-1 — MOCK Companies House client (mock-first policy).
 *
 * Implements the EXACT same method signatures and result shapes as the real
 * client in companiesHouseClient.ts. Every brand company is a deterministic
 * record in a simulated registrar; unknown numbers are truly not-found; every
 * 4th lookup is rate-limited once (the retry succeeds), proving failure/retry
 * without any network call.
 */

import type {
  ChCharge,
  ChCompany,
  ChCompanyRecord,
  ChFiling,
  ChLookupResult,
  ChOfficer,
  ChPersonWithSignificantControl,
  ChRecordResult,
} from './companiesHouseClient';
import { COMPANY_REGISTRATION } from '@/config/company';

interface MockChCompany extends ChCompany {
  lookupTotal: number;
}

const registry = new Map<string, MockChCompany>();
let counter = 0;

/**
 * §22–§25 (M13 Phase 9) — Mercenta's OWN simulated registrar record.
 *
 * Deliberately carries NO incorporation date, registered office, SIC codes or
 * filing dates: Mercenta has not read the real register, and a mock must never
 * invent Mercenta's own facts. `dataSource` marks every value as simulated so
 * the Company Control Centre can label it and can never present it as the real
 * register.
 */
const MERCENTA_SIMULATED_RECORD: ChCompanyRecord = {
  companyNumber: COMPANY_REGISTRATION.companyNumber,
  companyName: COMPANY_REGISTRATION.legalName,
  status: 'active',
  companyType: 'private-limited-company (simulated)',
  registeredOfficeAddress: 'SIMULATED REGISTRAR — no registered office returned',
  sicCodes: [],
  hasCharges: false,
  hasInsolvencyHistory: false,
  dataSource: 'simulated_registrar',
};

/**
 * A SEPARATE counter for the company-record reads. The pinned `lookupCompany`
 * rate-limit behaviour (every 4th call) is deliberately left untouched, so the
 * existing brand-verification contract cannot shift.
 */
let detailCounter = 0;

/** True when the queried number is Mercenta's own company. */
export function isMercentaCompanyNumber(companyNumber: string): boolean {
  return companyNumber.trim() === COMPANY_REGISTRATION.companyNumber;
}

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
  detailCounter = 0;
}

/** Deterministic default seed (matches the demo brand registry). */
export function ensureCompaniesHouseSeed(): void {
  if (registry.size > 0) return;
  seedCompaniesHouse([
    { id: 'brand-astonish', name: 'Astonish' },
    { id: 'brand-tapatio', name: 'Tapatío' },
    { id: 'brand-seep', name: 'Seep' },
    { id: 'brand-clipper', name: 'Clipper Teas' },
  ]);
}

function delay(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

export function createMockCompaniesHouseClient(): {
  lookupCompany(query: { companyNumber?: string; companyName?: string }): Promise<ChLookupResult>;
  getCompanyRecord(companyNumber: string): Promise<ChRecordResult<ChCompanyRecord>>;
  getOfficers(companyNumber: string): Promise<ChRecordResult<ChOfficer[]>>;
  getPersonsWithSignificantControl(
    companyNumber: string
  ): Promise<ChRecordResult<ChPersonWithSignificantControl[]>>;
  getFilingHistory(companyNumber: string): Promise<ChRecordResult<ChFiling[]>>;
  getCharges(companyNumber: string): Promise<ChRecordResult<ChCharge[]>>;
} {
  /**
   * §22–§25 — one simulated registrar read. The record is looked up by company
   * number; an unknown number is truly NOT FOUND (never invented). Every 4th
   * read fails once (simulated registrar unavailable) so the retry path is
   * exercised truthfully — the same discipline as `lookupCompany`.
   */
  async function readCompanyRecord(companyNumber: string): Promise<ChRecordResult<ChCompanyRecord>> {
    ensureCompaniesHouseSeed();
    await delay(180);
    detailCounter += 1;
    if (detailCounter % 4 === 0) {
      return {
        ok: false,
        error: 'Simulated registrar read unavailable — retry',
        dataSource: 'simulated_registrar',
      };
    }
    if (isMercentaCompanyNumber(companyNumber)) {
      return { ok: true, data: { ...MERCENTA_SIMULATED_RECORD }, dataSource: 'simulated_registrar' };
    }
    const key = companyNumber.trim().toLowerCase();
    for (const rec of registry.values()) {
      if (rec.companyNumber.toLowerCase() === key) {
        return {
          ok: true,
          dataSource: 'simulated_registrar',
          data: {
            companyNumber: rec.companyNumber,
            companyName: rec.companyName,
            status: rec.status,
            companyType: 'private-limited-company (simulated)',
            incorporationDate: rec.incorporationDate,
            registeredOfficeAddress: rec.registeredOfficeAddress,
            sicCodes: rec.sicCodes,
            hasCharges: false,
            hasInsolvencyHistory: rec.status === 'dissolved',
            dataSource: 'simulated_registrar',
          },
        };
      }
    }
    return { ok: true, notFound: true, dataSource: 'simulated_registrar' };
  }


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
    getCompanyRecord: readCompanyRecord,

    /**
     * Officers of the company. For MERCENTA'S OWN company the simulated
     * registrar returns NONE — the founder's real officer record has not been
     * read and must never be fabricated.
     */
    async getOfficers(companyNumber: string): Promise<ChRecordResult<ChOfficer[]>> {
      const rec = await readCompanyRecord(companyNumber);
      if (!rec.ok) return { ok: false, error: rec.error, dataSource: 'simulated_registrar' };
      if (rec.notFound || !rec.data || isMercentaCompanyNumber(companyNumber)) {
        return { ok: true, data: [], dataSource: 'simulated_registrar' };
      }
      return {
        ok: true,
        dataSource: 'simulated_registrar',
        data: [
          {
            name: `${rec.data.companyName} Director (simulated)`,
            role: 'director',
            appointedOn: rec.data.incorporationDate,
            occupation: 'Director (simulated)',
          },
        ],
      };
    },

    async getPersonsWithSignificantControl(
      companyNumber: string
    ): Promise<ChRecordResult<ChPersonWithSignificantControl[]>> {
      const rec = await readCompanyRecord(companyNumber);
      if (!rec.ok) return { ok: false, error: rec.error, dataSource: 'simulated_registrar' };
      if (rec.notFound || !rec.data || isMercentaCompanyNumber(companyNumber)) {
        return { ok: true, data: [], dataSource: 'simulated_registrar' };
      }
      return {
        ok: true,
        dataSource: 'simulated_registrar',
        data: [
          {
            name: `${rec.data.companyName} Shareholder (simulated)`,
            kind: 'individual-person-with-significant-control (simulated)',
            naturesOfControl: ['ownership-of-shares-75-to-100-percent (simulated)'],
            notifiedOn: rec.data.incorporationDate,
          },
        ],
      };
    },

    /**
     * Filing history. For MERCENTA'S OWN company this is EMPTY — no Mercenta
     * filing is ever invented.
     */
    async getFilingHistory(companyNumber: string): Promise<ChRecordResult<ChFiling[]>> {
      const rec = await readCompanyRecord(companyNumber);
      if (!rec.ok) return { ok: false, error: rec.error, dataSource: 'simulated_registrar' };
      if (rec.notFound || !rec.data || isMercentaCompanyNumber(companyNumber)) {
        return { ok: true, data: [], dataSource: 'simulated_registrar' };
      }
      return {
        ok: true,
        dataSource: 'simulated_registrar',
        data: [
          {
            transactionId: `MOCK-FIL-${rec.data.companyNumber.slice(-6)}-1`,
            date: rec.data.incorporationDate ?? '',
            type: 'NEWINC',
            description: 'Incorporation (simulated)',
            category: 'incorporation',
          },
        ],
      };
    },

    /** Charges. Always empty in the simulation — no charge is ever invented. */
    async getCharges(companyNumber: string): Promise<ChRecordResult<ChCharge[]>> {
      const rec = await readCompanyRecord(companyNumber);
      if (!rec.ok) return { ok: false, error: rec.error, dataSource: 'simulated_registrar' };
      return { ok: true, data: [], dataSource: 'simulated_registrar' };
    },


  };
}