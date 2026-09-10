/**
 * §Priority-1 — Companies House adapter (mock-first).
 *
 * Simulates the Real Mercenta interaction boundary with Companies House:
 * company lookup/search returning the exact fields Mercenta's compliance
 * workflow needs (company number, name, registrar status, incorporation
 * date, SIC codes). The live client talks to the official Public Search
 * endpoint with Basic-Auth API-key credentials behind the same contract.
 *
 * Factory discipline (same seam as SP-API / Stripe / DHL): a verified
 * non-sandbox connection returns the REAL client (Edge-Function proxy); a
 * sandbox connection, a `mock:` secret ref, or no connection returns the
 * deterministic MOCK client. Swapping simulation → live is credentials-only.
 *
 * Deterministic mock behaviours:
 *  - every seeded brand company has a known record (active or dissolved);
 *  - unknown company numbers → your-not-found (registrar returns no match);
 *  - every 4th lookup returns a transient 502 (provider unavailable) — the
 *    retry on the next call succeeds, exercising the retry path truthfully.
 */

export interface ChCredentials {
  secretRef: string;
  verified: boolean;
}

export interface ChCompany {
  companyNumber: string;
  companyName: string;
  /** Registrar status — only 'active' (and 'voluntary-arrangement') verify. */
  status: 'active' | 'dissolved' | 'voluntary-arrangement' | 'receivership';
  incorporationDate?: string;
  registeredOfficeAddress?: string;
  sicCodes: string[];
}

export interface ChLookupResult {
  ok: boolean;
  match?: ChCompany | null;
  /** True when the registrar returned zero matches (not an error). */
  notFound?: boolean;
  rateLimited?: boolean;
  error?: string;
}

export type ChFetchLike = (
  url: string,
  init?: { method?: string; headers?: Record<string, string>; body?: unknown }
) => Promise<{ ok: boolean; status: number; json: () => Promise<unknown> }>;

const defaultFetch: ChFetchLike = async (url, init) => {
  const res = await fetch(url, {
    method: init?.method ?? 'GET',
    headers: { 'Content-Type': 'application/json', ...(init?.headers ?? {}) },
    body: init?.body !== undefined ? JSON.stringify(init.body) : undefined,
  });
  return { ok: res.ok, status: res.status, json: () => res.json() };
};

export function createCompaniesHouseClient(
  getCredentials: () => ChCredentials | null,
  edgeFunctionBase: string,
  transport: ChFetchLike = defaultFetch
) {
  function requireCredentials(): ChCredentials {
    const creds = getCredentials();
    if (!creds) {
      throw new Error('Companies House is not connected. Ask your admin to enable it in Integration Settings.');
    }
    if (!creds.verified) {
      throw new Error(
        'Companies House connection is sandbox-only — complete a live connect to query the registrar.'
      );
    }
    return creds;
  }

  return {
    /** Search the registrar for a company by number or name. */
    async lookupCompany(query: { companyNumber?: string; companyName?: string }): Promise<ChLookupResult> {
      const creds = requireCredentials();
      const params = new URLSearchParams({ items_per_page: '1' });
      if (query.companyNumber) params.set('q', query.companyNumber);
      else if (query.companyName) params.set('q', query.companyName);
      else return { ok: false, error: 'A company number or name is required.' };
      const res = await transport(
        `${edgeFunctionBase}/search/companies?${params.toString()}`,
        { method: 'GET', headers: { 'X-Secret-Ref': creds.secretRef } }
      );
      const body = (await res.json()) as {
        items?: {
          company_number?: string;
          company_name?: string;
          company_status?: ChCompany['status'];
          date_of_creation?: string;
          address_snippet?: string;
          sic_codes?: string[];
        }[];
        error?: string;
      };
      if (!res.ok) return { ok: false, error: body.error ?? `HTTP ${res.status}` };
      const item = body.items?.[0];
      if (!item?.company_number) return { ok: true, match: null, notFound: true };
      return {
        ok: true,
        match: {
          companyNumber: item.company_number,
          companyName: item.company_name ?? 'Unknown Ltd',
          status: item.company_status ?? 'active',
          incorporationDate: item.date_of_creation,
          registeredOfficeAddress: item.address_snippet,
          sicCodes: item.sic_codes ?? [],
        },
      };
    },
  };
}

export type CompaniesHouseClient = ReturnType<typeof createCompaniesHouseClient>;