/** §Xero — Shared types for the Xero integration layer. */

export interface XeroConnection {
  id: string;
  partner_id: string;
  xero_tenant_id: string;
  access_token: string;
  refresh_token: string;
  token_expires_at: string | null;
  last_synced_at: string | null;
  last_reset_at: string | null;
  status: 'active' | 'needs_reauth' | 'disconnected';
  created_at: string;
  updated_at: string;
}

export interface XeroSyncLogEntry {
  id: string;
  partner_id: string;
  operation: 'invoice_push' | 'contact_sync' | 'full_resync' | 'token_refresh';
  records_affected: number;
  success: boolean;
  error_message: string | null;
  api_calls_used: number;
  created_at: string;
}

export interface XeroInvoiceLineItem {
  description: string;
  quantity: number;
  unitAmount: number;
  accountCode?: string;        // Xero Chart of Accounts code
  taxType?: string;            // e.g. 'OUTPUT' (VAT)
  lineAmount?: number;
}

export interface XeroContact {
  contactID?: string;
  name: string;
  email?: string;
  phone?: string;
  addressLine1?: string;
  city?: string;
  region?: string;             // UK county
  postalCode?: string;
  country?: string;
  isCustomer?: boolean;
  isSupplier?: boolean;
}

export interface XeroInvoice {
  invoiceID?: string;
  invoiceNumber: string;
  reference?: string;          // e.g. "PO-12345" or "Mercenta PO Ref"
  contact: XeroContact;
  date: string;                // YYYY-MM-DD
  dueDate: string;             // YYYY-MM-DD
  lineItems: XeroInvoiceLineItem[];
  status?: 'DRAFT' | 'SUBMITTED' | 'AUTHORISED' | 'PAID' | 'DELETED' | 'VOIDED';
  total?: number;
  currencyCode?: string;       // e.g. 'GBP'
}

export interface XeroWebhookEvent {
  resourceId: string;          // UUID of the Xero resource
  resourceUrl: string;         // e.g. /api.xro/2.0/Invoices/{id}
  resourceType: string;        // e.g. 'INVOICE', 'CONTACT'
  eventType: string;           // e.g. 'CREATE', 'UPDATE', 'DELETE'
  eventDateUTC: string;        // ISO 8601
  tenantId: string;            // Xero tenant that owns the resource
  tenantType: string;          // e.g. 'ORGANISATION'
}

export interface XeroWebhookPayload {
  events: XeroWebhookEvent[];
  lastEventDateUTC?: string;
  firstEventDateUTC?: string;
  entropy?: string;
  eventNotificationId?: string;
}

/** Minimum PO data needed to push an invoice to Xero. */
export interface PoDataForInvoice {
  poNumber: string;
  partnerId: string;
  partnerName: string;
  lineItems: Array<{
    sku: string;
    description: string;
    quantity: number;
    unitPrice: number;
  }>;
  dueDate: string;
  reference?: string;
}

export type XeroClientMode = 'demo' | 'live';

export interface XeroRateLimitState {
  concurrent: number;
  minuteBucket: number;       // tokens remaining in 60-request-per-minute bucket
  minuteBucketReset: number;  // timestamp of last bucket refill
  dayCounter: number;         // requests today
  dayCounterReset: number;    // timestamp of last daily reset (midnight UTC)
}

/* ── New types for the IXeroClient interface ─────────────────────────── */

export interface XeroAccount {
  accountID?: string;
  code?: string;
  name: string;
  type: 'BANK' | 'CURRENT' | 'REVENUE' | 'EXPENSE' | 'EQUITY' | 'LIABILITY' | 'FIXED';
  taxType?: string;
  status?: 'ACTIVE' | 'ARCHIVED';
  description?: string;
  currencyCode?: string;
}

export interface XeroPayment {
  paymentID?: string;
  invoice?: { invoiceID: string };
  account?: { accountID: string };
  date: string;
  amount: number;
  reference?: string;
  currencyRate?: number;
  status?: string;
}

export interface XeroBankTransaction {
  bankTransactionID?: string;
  type: 'SPEND' | 'RECEIVE' | 'TRANSFER';
  contact?: XeroContact;
  date: string;
  lineItems: XeroInvoiceLineItem[];
  total?: number;
  reference?: string;
  status?: string;
}

export interface XeroOrganisationInfo {
  organisationID: string;
  name: string;
  legalName?: string;
  shortCode?: string;
  country?: string;
  currency?: string;
  taxNumber?: string;
  edition?: string;
  isDemoCompany?: boolean;
}

export interface FinancialSummary {
  period: string;
  revenue: number;
  expenses: number;
  netProfit: number;
  accountsReceivable: number;
  accountsPayable: number;
  vatDue: number;
  workingCapital: number;
}

export interface RemittanceSyncData {
  periodStart: string;
  periodEnd: string;
  brandName: string;
  lines: Array<{
    poNumber: string;
    grossValue: number;
    commission: number;
    deductions: Array<{ type: string; amountGbp: number }>;
  }>;
}

export interface BrandPayoutData {
  brandId: string;
  brandName: string;
  amountGbp: number;
  period: string;
  dueDate: string;
  status: 'pending' | 'paid' | 'failed';
}

export interface PennyReportData {
  period: string;
  infraCosts: Array<{
    category: string;
    costGbp: number;
    vendor: string;
  }>;
  totalCost: number;
}

export interface XeroSyncStatus {
  last_reseed_at: string | null;
  last_reset_detected_at: string | null;
  reseed_count: number;
}

export interface XeroReseedResult {
  ok: boolean;
  contactsSynced: number;
  invoicesSynced: number;
  billsSynced: number;
  paymentsSynced: number;
  message: string;
  error?: string;
}

declare global {
  interface ImportMetaEnv {
    XERO_CLIENT_ID?: string;
    XERO_CLIENT_SECRET?: string;
    XERO_TENANT_ID?: string;
    XERO_ACCESS_TOKEN?: string;
    XERO_MODE?: string;
    VITE_XERO_CLIENT_ID?: string;
    VITE_RAKAZO_URL?: string;
  }
}