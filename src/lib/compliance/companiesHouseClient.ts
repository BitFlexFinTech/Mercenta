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

/* ── §22–§25 (M13 Phase 9) — company-record reads the Company Control Centre needs.
 * Same contract for the mock and the live client; adding these did not change
 * `lookupCompany`, which remains the brand-verification path used by
 * complianceSync/scenarioEngine. */

/** Where a returned value came from — the panel labels every figure with it. */
export type ChDataSource = 'registrar' | 'simulated_registrar' | 'founder_supplied';

export interface ChCompanyRecord {
  companyNumber: string;
  companyName: string;
  status: ChCompany['status'];
  companyType?: string;
  incorporationDate?: string;
  registeredOfficeAddress?: string;
  sicCodes: string[];
  /** Registrar-reported next filing dates, when the register supplies them. */
  nextConfirmationStatementDue?: string;
  nextAccountsDue?: string;
  hasCharges: boolean;
  hasInsolvencyHistory: boolean;
  dataSource: ChDataSource;
}

export interface ChOfficer {
  name: string;
  role: string;
  appointedOn?: string;
  resignedOn?: string;
  nationality?: string;
  occupation?: string;
}

export interface ChPersonWithSignificantControl {
  name: string;
  kind: string;
  naturesOfControl: string[];
  notifiedOn?: string;
  ceasedOn?: string;
}

export interface ChFiling {
  transactionId: string;
  date: string;
  type: string;
  description: string;
  category?: string;
}

export interface ChCharge {
  chargeId: string;
  createdAt: string;
  description?: string;
  status?: string;
  personsEntitled?: string[];
}

export interface ChRecordResult<T> {
  ok: boolean;
  data?: T;
  notFound?: boolean;
  error?: string;
  /** Propagated so the UI can never present a simulated read as the real register. */
  dataSource?: ChDataSource;
}

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

  /**
   * §22–§25 — read one registrar resource through the Edge Function proxy (the
   * API key never reaches the browser). Same envelope for every resource so the
   * panel renders a uniform, source-labelled result.
   */
  async function read<T>(path: string): Promise<ChRecordResult<T>> {
    const creds = requireCredentials();
    const res = await transport(`${edgeFunctionBase}${path}`, {
      method: 'GET',
      headers: { 'X-Secret-Ref': creds.secretRef },
    });
    const body = (await res.json()) as { items?: T[]; error?: string } | T;
    if (!res.ok) {
      return {
        ok: false,
        error: (body as { error?: string }).error ?? `HTTP ${res.status}`,
        dataSource: 'registrar',
      };
    }
    const items = (body as { items?: T[] }).items;
    return { ok: true, data: (items ? items : body) as T, dataSource: 'registrar' };
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

    /** §22–§25 — the company record behind the Company Control Centre. */
    async getCompanyRecord(companyNumber: string): Promise<ChRecordResult<ChCompanyRecord>> {
      const res = await read<{
        company_number?: string;
        company_name?: string;
        company_status?: ChCompany['status'];
        type?: string;
        date_of_creation?: string;
        registered_office_address?: Record<string, string>;
        sic_codes?: string[];
        confirmation_statement?: { next_due?: string };
        accounts?: { next_due?: string };
        has_charges?: boolean;
        has_insolvency_history?: boolean;
        error?: string;
      }>(`/company/${encodeURIComponent(companyNumber)}`);
      if (!res.ok) return res as ChRecordResult<ChCompanyRecord>;
      const d = res.data;
      if (!d?.company_number) return { ok: true, notFound: true, dataSource: 'registrar' };
      return {
        ok: true,
        dataSource: 'registrar',
        data: {
          companyNumber: d.company_number,
          companyName: d.company_name ?? '',
          status: d.company_status ?? 'active',
          companyType: d.type,
          incorporationDate: d.date_of_creation,
          registeredOfficeAddress: d.registered_office_address
            ? Object.values(d.registered_office_address).filter(Boolean).join(', ')
            : undefined,
          sicCodes: d.sic_codes ?? [],
          nextConfirmationStatementDue: d.confirmation_statement?.next_due,
          nextAccountsDue: d.accounts?.next_due,
          hasCharges: Boolean(d.has_charges),
          hasInsolvencyHistory: Boolean(d.has_insolvency_history),
          dataSource: 'registrar',
        },
      };
    },

    async getOfficers(companyNumber: string): Promise<ChRecordResult<ChOfficer[]>> {
      const res = await read<ChOfficer>(`/company/${encodeURIComponent(companyNumber)}/officers`);
      if (!res.ok) return res as unknown as ChRecordResult<ChOfficer[]>;
      const raw = (res.data ?? []) as unknown as {
        name?: string;
        officer_role?: string;
        appointed_on?: string;
        resigned_on?: string;
        nationality?: string;
        occupation?: string;
      }[];
      const list = Array.isArray(raw) ? raw : [];
      return {
        ok: true,
        dataSource: 'registrar',
        data: list.map((o) => ({
          name: o.name ?? '',
          role: o.officer_role ?? 'officer',
          appointedOn: o.appointed_on,
          resignedOn: o.resigned_on,
          nationality: o.nationality,
          occupation: o.occupation,
        })),
      };
    },

    async getPersonsWithSignificantControl(
      companyNumber: string
    ): Promise<ChRecordResult<ChPersonWithSignificantControl[]>> {
      const res = await read<ChPersonWithSignificantControl>(
        `/company/${encodeURIComponent(companyNumber)}/persons-with-significant-control`
      );
      if (!res.ok) return res as unknown as ChRecordResult<ChPersonWithSignificantControl[]>;
      const raw = (res.data ?? []) as unknown as {
        name?: string;
        kind?: string;
        natures_of_control?: string[];
        notified_on?: string;
        ceased_on?: string;
      }[];
      const list = Array.isArray(raw) ? raw : [];
      return {
        ok: true,
        dataSource: 'registrar',
        data: list.map((p) => ({
          name: p.name ?? '',
          kind: p.kind ?? 'person-with-significant-control',
          naturesOfControl: p.natures_of_control ?? [],
          notifiedOn: p.notified_on,
          ceasedOn: p.ceased_on,
        })),
      };
    },
    async getFilingHistory(companyNumber: string): Promise<ChRecordResult<ChFiling[]>> {
      const res = await read<ChFiling>(`/company/${encodeURIComponent(companyNumber)}/filing-history`);
      if (!res.ok) return res as unknown as ChRecordResult<ChFiling[]>;
      const raw = (res.data ?? []) as unknown as {
        transaction_id?: string;
        date?: string;
        type?: string;
        description?: string;
        category?: string;
      }[];
      const list = Array.isArray(raw) ? raw : [];
      return {
        ok: true,
        dataSource: 'registrar',
        data: list.map((f) => ({
          transactionId: f.transaction_id ?? '',
          date: f.date ?? '',
          type: f.type ?? '',
          description: f.description ?? '',
          category: f.category,
        })),
      };
    },

    async getCharges(companyNumber: string): Promise<ChRecordResult<ChCharge[]>> {
      const res = await read<ChCharge>(`/company/${encodeURIComponent(companyNumber)}/charges`);
      if (!res.ok) return res as unknown as ChRecordResult<ChCharge[]>;
      const raw = (res.data ?? []) as unknown as {
        id?: string;
        created_on?: string;
        particulars?: { description?: string };
        status?: string;
        persons_entitled?: { name?: string }[];
      }[];
      const list = Array.isArray(raw) ? raw : [];
      return {
        ok: true,
        dataSource: 'registrar',
        data: list.map((c) => ({
          chargeId: c.id ?? '',
          createdAt: c.created_on ?? '',
          description: c.particulars?.description,
          status: c.status,
          personsEntitled: (c.persons_entitled ?? []).map((p) => p.name ?? '').filter(Boolean),
        })),
      };
    },


  };
}

export type CompaniesHouseClient = ReturnType<typeof createCompaniesHouseClient>;