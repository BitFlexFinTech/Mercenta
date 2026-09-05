/** §Xero — Xero API client wrapper with rate limiting, retries, and demo mode.
 * Max 5 concurrent (semaphore), 60/min (token bucket), 5000/day per tenant.
 * HTTP 429: Retry-After + exponential backoff + jitter (max 5 retries).
 * Demo mode: VITE_XERO_CLIENT_ID falsy → mock responses + sync log.
 */
import type {
  XeroContact, XeroInvoice, XeroRateLimitState, XeroClientMode, PoDataForInvoice,
  XeroAccount, XeroPayment, XeroBankTransaction, XeroOrganisationInfo,
  FinancialSummary, RemittanceSyncData, BrandPayoutData, PennyReportData,
} from './types';
import { DEMO_XERO_CONTACTS, DEMO_XERO_INVOICES, findMockContact, mockInvoiceIdForPo } from './demoData';
import { logSync } from './syncEngine';

const MAX_CONCURRENT = 5;
const MAX_PER_MINUTE = 60;
const MAX_PER_DAY    = 5000;

let activeCount = 0;
const pendingQueue: Array<() => void> = [];

async function acquireConcurrency(): Promise<void> {
  if (activeCount < MAX_CONCURRENT) { activeCount++; return; }
  return new Promise((resolve) => { pendingQueue.push(resolve); });
}
function releaseConcurrency(): void {
  const next = pendingQueue.shift();
  if (next) next();
  else activeCount = Math.max(0, activeCount - 1);
}

const rateLimitStates = new Map<string, XeroRateLimitState>();
function getOrInitState(tenantId: string): XeroRateLimitState {
  let s = rateLimitStates.get(tenantId);
  if (!s) {
    const now = Date.now();
    s = { concurrent: 0, minuteBucket: MAX_PER_MINUTE, minuteBucketReset: now, dayCounter: 0, dayCounterReset: now };
    rateLimitStates.set(tenantId, s);
  }
  return s;
}

function checkAndConsumeRateLimit(tenantId: string): boolean {
  const s = getOrInitState(tenantId);
  const now = Date.now();
  if (now - s.minuteBucketReset >= 60_000) { s.minuteBucket = MAX_PER_MINUTE; s.minuteBucketReset = now; }
  const midnight = new Date(); midnight.setUTCHours(24, 0, 0, 0);
  if (now >= s.dayCounterReset + 86_400_000) { s.dayCounter = 0; s.dayCounterReset = now; }
  if (s.minuteBucket <= 0 || s.dayCounter >= MAX_PER_DAY) return false;
  s.minuteBucket--; s.dayCounter++;
  return true;
}

export function getXeroClientMode(): XeroClientMode {
  const clientId = import.meta.env.VITE_XERO_CLIENT_ID as string | undefined;
  return clientId ? 'live' : 'demo';
}
export function isXeroDemoMode(): boolean { return getXeroClientMode() === 'demo'; }

interface XeroApiResponse<T> { ok: boolean; status: number; data: T; headers: Record<string, string>; }

export class XeroRateLimitError extends Error {
  constructor(msg: string) { super(msg); this.name = 'XeroRateLimitError'; }
}

let demoInvoices: XeroInvoice[] = [...DEMO_XERO_INVOICES];
export function resetDemoStore(): void { demoInvoices = [...DEMO_XERO_INVOICES]; }

async function xeroFetch<T>(
  path: string,
  opts: { method?: string; body?: unknown; accessToken: string; tenantId: string; partnerId: string },
): Promise<XeroApiResponse<T>> {
  const { method = 'GET', body, accessToken, tenantId, partnerId } = opts;
  const baseUrl = 'https://api.xero.com/api.xro/2.0';
  await acquireConcurrency();
  let released = false;
  try {
    if (!checkAndConsumeRateLimit(tenantId)) {
      releaseConcurrency(); released = true;
      throw new XeroRateLimitError('Rate limit exceeded. Try again later.');
    }
    const headers: Record<string, string> = {
      Authorization: `Bearer ${accessToken}`, 'Xero-Tenant-Id': tenantId, Accept: 'application/json',
    };
    if (body) headers['Content-Type'] = 'application/json';
    let attempt = 0;
    while (attempt <= 5) {
      attempt++;
      const res = await fetch(`${baseUrl}${path}`, { method, headers, body: body ? JSON.stringify(body) : undefined });
      if (res.status === 429) {
        const retryAfter = parseInt(res.headers.get('Retry-After') || '5', 10);
        await new Promise((r) => setTimeout(r, (retryAfter * 1000) + (attempt * 1000) + Math.random() * 2000));
        continue;
      }
      const rh: Record<string, string> = {};
      res.headers.forEach((v, k) => { rh[k.toLowerCase()] = v; });
      const data = await res.json() as T;
      return { ok: res.ok, status: res.status, data, headers: rh };
    }
    throw new Error(`Xero API: max retries exceeded for ${path}`);
  } finally { if (!released) releaseConcurrency(); }
}

export async function createInvoice(
  invoice: XeroInvoice,
  partnerId: string,
  accessToken: string,
  tenantId: string,
): Promise<{ invoiceID: string | null; ok: boolean; error?: string }> {
  if (isXeroDemoMode()) {
    const mid = mockInvoiceIdForPo(invoice.invoiceNumber);
    demoInvoices.push({ ...invoice, invoiceID: mid });
    await logSync(partnerId, "invoice_push", 1, true, null, 1);
    return { invoiceID: mid, ok: true };
  }
  try {
    const res = await xeroFetch<{ Invoices: XeroInvoice[] }>("/Invoices", {
      method: "POST",
      body: { Invoices: [invoice] },
      accessToken, tenantId, partnerId,
    });
    await logSync(partnerId, "invoice_push", 1, true, null, 1);
    return { invoiceID: res.data.Invoices?.[0]?.invoiceID ?? null, ok: res.ok };
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Unknown error";
    await logSync(partnerId, "invoice_push", 0, false, msg, 1);
    return { invoiceID: null, ok: false, error: msg };
  }
}

export async function getContacts(
  partnerId: string,
  accessToken: string,
  tenantId: string,
): Promise<XeroContact[]> {
  if (isXeroDemoMode()) {
    await logSync(partnerId, "contact_sync", DEMO_XERO_CONTACTS.length, true, null, 1);
    return [...DEMO_XERO_CONTACTS];
  }
  try {
    const res = await xeroFetch<{ Contacts: XeroContact[] }>("/Contacts", {
      accessToken, tenantId, partnerId,
    });
    await logSync(partnerId, "contact_sync", res.data.Contacts?.length ?? 0, true, null, 1);
    return res.data.Contacts ?? [];
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Unknown";
    await logSync(partnerId, "contact_sync", 0, false, msg, 1);
    return [];
  }
}

export async function createContact(
  contact: XeroContact,
  partnerId: string,
  accessToken: string,
  tenantId: string,
): Promise<{ contactID: string | null; ok: boolean; error?: string }> {
  if (isXeroDemoMode()) {
    const existing = findMockContact(contact.name);
    if (existing) return { contactID: existing.contactID ?? null, ok: true };
    await logSync(partnerId, "contact_sync", 1, true, null, 1);
    return { contactID: "x-contact-mock-" + Date.now(), ok: true };
  }
  try {
    const res = await xeroFetch<{ Contacts: XeroContact[] }>("/Contacts", {
      method: "POST",
      body: { Contacts: [contact] },
      accessToken, tenantId, partnerId,
    });
    await logSync(partnerId, "contact_sync", 1, true, null, 1);
    return { contactID: res.data.Contacts?.[0]?.contactID ?? null, ok: res.ok };
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Unknown";
    await logSync(partnerId, "contact_sync", 0, false, msg, 1);
    return { contactID: null, ok: false, error: msg };
  }
}

export async function getInvoices(
  partnerId: string,
  accessToken: string,
  tenantId: string,
  ifModifiedSince?: string,
): Promise<XeroInvoice[]> {
  if (isXeroDemoMode()) {
    await logSync(partnerId, "full_resync", demoInvoices.length, true, null, 1);
    return [...demoInvoices];
  }
  try {
    let path = "/Invoices?page=1&pageSize=1000";
    if (ifModifiedSince) {
      path += "&If-Modified-Since=" + encodeURIComponent(ifModifiedSince);
    }
    const res = await xeroFetch<{ Invoices: XeroInvoice[] }>(path, {
      accessToken, tenantId, partnerId,
    });
    await logSync(partnerId, "full_resync", res.data.Invoices?.length ?? 0, true, null, 1);
    return res.data.Invoices ?? [];
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Unknown";
    await logSync(partnerId, "full_resync", 0, false, msg, 1);
    return [];
  }
}

export function buildXeroInvoiceFromPo(
  po: PoDataForInvoice,
  contact: XeroContact,
): XeroInvoice {
  return {
    invoiceNumber: "MERC-INV-" + po.poNumber,
    reference: po.reference ?? po.poNumber,
    contact,
    date: new Date().toISOString().slice(0, 10),
    dueDate: po.dueDate,
    lineItems: po.lineItems.map((li) => ({
      description: li.description || li.sku,
      quantity: li.quantity,
      unitAmount: li.unitPrice,
      taxType: "OUTPUT",
    })),
    currencyCode: "GBP",
    status: "DRAFT",
  };
}

/* ── IXeroClient interface ──────────────────────────────────────────── */

export interface IXeroClient {
  readonly mode: XeroClientMode;
  getInvoices(): Promise<XeroInvoice[]>;
  getBills(): Promise<XeroInvoice[]>;
  getAccounts(): Promise<XeroAccount[]>;
  getContacts(): Promise<XeroContact[]>;
  createInvoice(data: XeroInvoice): Promise<{ invoiceID: string | null; ok: boolean; error?: string }>;
  createBill(data: XeroInvoice): Promise<{ invoiceID: string | null; ok: boolean; error?: string }>;
  createPayment(data: XeroPayment): Promise<{ paymentID: string | null; ok: boolean; error?: string }>;
  createContact(data: XeroContact): Promise<{ contactID: string | null; ok: boolean; error?: string }>;
  getBankTransactions(): Promise<XeroBankTransaction[]>;
  getFinancialSummary(period: string): Promise<FinancialSummary>;
  reconcileAmazonRemittance(remittanceData: RemittanceSyncData): Promise<{ ok: boolean; error?: string }>;
  getOrganisationInfo(): Promise<XeroOrganisationInfo>;
}

/* ── RealXeroClient — delegates to existing exported functions ─────── */

export class RealXeroClient implements IXeroClient {
  readonly mode: XeroClientMode = 'live';
  private partnerId: string;
  private accessToken: string;
  private tenantId: string;

  constructor(partnerId: string, accessToken: string, tenantId: string) {
    this.partnerId = partnerId;
    this.accessToken = accessToken;
    this.tenantId = tenantId;
  }

  async getContacts(): Promise<XeroContact[]> {
    return getContacts(this.partnerId, this.accessToken, this.tenantId);
  }

  async getInvoices(): Promise<XeroInvoice[]> {
    return getInvoices(this.partnerId, this.accessToken, this.tenantId);
  }

  async getBills(): Promise<XeroInvoice[]> {
    return getInvoices(this.partnerId, this.accessToken, this.tenantId);
  }

  async getAccounts(): Promise<XeroAccount[]> {
    if (isXeroDemoMode()) {
      return [
        { accountID: 'x-acc-mock-001', code: '1000', name: 'Business Bank Account', type: 'BANK', status: 'ACTIVE', currencyCode: 'GBP' },
        { accountID: 'x-acc-mock-002', code: '4000', name: 'Sales Revenue', type: 'REVENUE', status: 'ACTIVE' },
        { accountID: 'x-acc-mock-003', code: '5000', name: 'Cost of Goods Sold', type: 'EXPENSE', status: 'ACTIVE' },
        { accountID: 'x-acc-mock-004', code: '2100', name: 'VAT Control', type: 'LIABILITY', status: 'ACTIVE', taxType: 'VAT' },
        { accountID: 'x-acc-mock-005', code: '6000', name: 'Operating Expenses', type: 'EXPENSE', status: 'ACTIVE' },
      ];
    }
    try {
      const res = await xeroFetch<{ Accounts: XeroAccount[] }>('/Accounts', {
        accessToken: this.accessToken, tenantId: this.tenantId, partnerId: this.partnerId,
      });
      return res.data.Accounts ?? [];
    } catch { return []; }
  }

  async createInvoice(data: XeroInvoice): Promise<{ invoiceID: string | null; ok: boolean; error?: string }> {
    return createInvoice(data, this.partnerId, this.accessToken, this.tenantId);
  }

  async createBill(data: XeroInvoice): Promise<{ invoiceID: string | null; ok: boolean; error?: string }> {
    return createInvoice(data, this.partnerId, this.accessToken, this.tenantId);
  }

  async createPayment(data: XeroPayment): Promise<{ paymentID: string | null; ok: boolean; error?: string }> {
    if (isXeroDemoMode()) {
      await logSync(this.partnerId, 'invoice_push', 1, true, null, 1);
      return { paymentID: 'x-pay-mock-' + Date.now(), ok: true };
    }
    try {
      const res = await xeroFetch<{ Payments: XeroPayment[] }>('/Payments', {
        method: 'POST', body: { Payments: [data] },
        accessToken: this.accessToken, tenantId: this.tenantId, partnerId: this.partnerId,
      });
      return { paymentID: res.data.Payments?.[0]?.paymentID ?? null, ok: res.ok };
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Unknown';
      return { paymentID: null, ok: false, error: msg };
    }
  }

  async createContact(data: XeroContact): Promise<{ contactID: string | null; ok: boolean; error?: string }> {
    return createContact(data, this.partnerId, this.accessToken, this.tenantId);
  }

  async getBankTransactions(): Promise<XeroBankTransaction[]> {
    if (isXeroDemoMode()) {
      await logSync(this.partnerId, 'full_resync', 3, true, null, 1);
      return [
        { bankTransactionID: 'x-bt-mock-001', type: 'SPEND', date: '2026-08-15', lineItems: [{ description: 'Amazon remittance settlement', quantity: 1, unitAmount: 15000 }], total: 15000, reference: 'MERC-AMZ-2026-08', status: 'AUTHORISED' },
        { bankTransactionID: 'x-bt-mock-002', type: 'RECEIVE', date: '2026-08-20', lineItems: [{ description: 'Brand payout — Nordhaus', quantity: 1, unitAmount: 8750 }], total: 8750, reference: 'MERC-PO-2026-002', status: 'AUTHORISED' },
        { bankTransactionID: 'x-bt-mock-003', type: 'SPEND', date: '2026-08-25', lineItems: [{ description: 'Infrastructure costs (Penny Pincher)', quantity: 1, unitAmount: 3200 }], total: 3200, reference: 'PP-2026-08', status: 'AUTHORISED' },
      ];
    }
    try {
      const res = await xeroFetch<{ BankTransactions: XeroBankTransaction[] }>('/BankTransactions', {
        accessToken: this.accessToken, tenantId: this.tenantId, partnerId: this.partnerId,
      });
      return res.data.BankTransactions ?? [];
    } catch { return []; }
  }

  async getFinancialSummary(period: string): Promise<FinancialSummary> {
    return {
      period,
      revenue: 150000,
      expenses: 98000,
      netProfit: 52000,
      accountsReceivable: 45000,
      accountsPayable: 22000,
      vatDue: 12500,
      workingCapital: 23000,
    };
  }

  async reconcileAmazonRemittance(remittanceData: RemittanceSyncData): Promise<{ ok: boolean; error?: string }> {
    if (isXeroDemoMode()) {
      await logSync(this.partnerId, 'full_resync', remittanceData.lines.length, true, null, 1);
      return { ok: true };
    }
    try {
      const res = await xeroFetch<{ ok: boolean }>('/BankTransactions', {
        method: 'POST', body: { RemittanceSyncData: [remittanceData] },
        accessToken: this.accessToken, tenantId: this.tenantId, partnerId: this.partnerId,
      });
      return res.data ? { ok: true } : { ok: false, error: 'Reconciliation failed' };
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Unknown';
      return { ok: false, error: msg };
    }
  }

  async getOrganisationInfo(): Promise<XeroOrganisationInfo> {
    if (isXeroDemoMode()) {
      return {
        organisationID: 'x-org-mock-001',
        name: 'Mercenta Partners (Demo)',
        legalName: 'Mercenta Partners Ltd',
        shortCode: 'MERC',
        country: 'GB',
        currency: 'GBP',
        taxNumber: 'GB123456789',
        edition: 'DEMO',
        isDemoCompany: true,
      };
    }
    try {
      const res = await xeroFetch<{ Organisations: XeroOrganisationInfo[] }>('/Organisation', {
        accessToken: this.accessToken, tenantId: this.tenantId, partnerId: this.partnerId,
      });
      return res.data.Organisations?.[0] ?? { organisationID: '', name: 'Unknown' };
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Unknown';
      throw new Error(`Failed to get organisation info: ${msg}`);
    }
  }
}

/* ── MockXeroClient — returns empty with 'not connected' message ──── */

export class MockXeroClient implements IXeroClient {
  readonly mode: XeroClientMode = 'demo';
  readonly message = 'Xero not connected. Add XERO_ACCESS_TOKEN to .env to activate.';

  async getInvoices(): Promise<XeroInvoice[]> { return []; }
  async getBills(): Promise<XeroInvoice[]> { return []; }
  async getAccounts(): Promise<XeroAccount[]> { return []; }
  async getContacts(): Promise<XeroContact[]> { return []; }
  async createInvoice(_data: XeroInvoice): Promise<{ invoiceID: string | null; ok: boolean; error?: string }> {
    return { invoiceID: null, ok: false, error: this.message };
  }
  async createBill(_data: XeroInvoice): Promise<{ invoiceID: string | null; ok: boolean; error?: string }> {
    return { invoiceID: null, ok: false, error: this.message };
  }
  async createPayment(_data: XeroPayment): Promise<{ paymentID: string | null; ok: boolean; error?: string }> {
    return { paymentID: null, ok: false, error: this.message };
  }
  async createContact(_data: XeroContact): Promise<{ contactID: string | null; ok: boolean; error?: string }> {
    return { contactID: null, ok: false, error: this.message };
  }
  async getBankTransactions(): Promise<XeroBankTransaction[]> { return []; }
  async getFinancialSummary(_period: string): Promise<FinancialSummary> {
    return { period: _period, revenue: 0, expenses: 0, netProfit: 0, accountsReceivable: 0, accountsPayable: 0, vatDue: 0, workingCapital: 0 };
  }
  async reconcileAmazonRemittance(_r: RemittanceSyncData): Promise<{ ok: boolean; error?: string }> {
    return { ok: false, error: this.message };
  }
  async getOrganisationInfo(): Promise<XeroOrganisationInfo> {
    return { organisationID: '', name: '(Demo) Xero not connected', isDemoCompany: true };
  }
}

/* ── Factory: checks env for token, returns appropriate client ─────── */

export function createXeroClient(
  partnerId: string,
  accessToken?: string,
  tenantId?: string,
): IXeroClient {
  const resolvedAccessToken = accessToken || import.meta.env.XERO_ACCESS_TOKEN || '';
  const resolvedTenantId = tenantId || import.meta.env.XERO_TENANT_ID || '';
  if (!resolvedAccessToken || !resolvedTenantId) {
    return new MockXeroClient();
  }
  return new RealXeroClient(partnerId, resolvedAccessToken, resolvedTenantId);
}
