/** §Xero — Demo/mock data for Xero API simulation.
 * Returns clearly-marked mock responses when no real Xero credentials exist.
 */
import type { XeroContact, XeroInvoice, XeroSyncLogEntry } from './types';

export const DEMO_XERO_CONTACTS: XeroContact[] = [
  { contactID: 'x-contact-mock-001', name: 'Zambezi Organic Extracts Ltd', isCustomer: true, email: 'accounts@zambezi-organic.co.zw', country: 'ZW' },
  { contactID: 'x-contact-mock-002', name: 'Nordhaus Living ApS',         isCustomer: true, email: 'finance@nordhaus-living.dk',   country: 'DK' },
  { contactID: 'x-contact-mock-003', name: 'Little Kiwi Baby Co',         isCustomer: true, email: 'billing@littlekiwi.co.nz',     country: 'NZ' },
  { contactID: 'x-contact-mock-004', name: 'DeskForge Supplies Inc',      isCustomer: true, email: 'ap@deskforge.com',             country: 'US' },
  { contactID: 'x-contact-mock-005', name: 'Munich Clean-Care GmbH',      isCustomer: true, email: 'rechnung@clean-care.de',      country: 'DE' },
  { contactID: 'x-contact-mock-006', name: 'Culinary Forge B.V.',         isCustomer: true, email: 'facturen@culinaryforge.nl',    country: 'NL' },
  { contactID: 'x-contact-mock-007', name: 'Voltaic Audio LLC',           isCustomer: true, email: 'ar@voltaicaudio.com',          country: 'US' },
  { contactID: 'x-contact-mock-008', name: 'ApexDrive Auto Care Ltd',     isCustomer: true, email: 'accounts@apexdrive.co.uk',     country: 'GB' },
  { contactID: 'x-contact-mock-009', name: 'Harvest Lane Foods Pty',      isCustomer: true, email: 'billing@harvestlane.com.au',   country: 'AU' },
  { contactID: 'x-contact-mock-010', name: 'Sahara Threads SARL',         isCustomer: true, email: 'compta@saharathreads.ma',     country: 'MA' },
  { contactID: 'x-contact-mock-011', name: 'PixelPerch Accessories Inc',  isCustomer: true, email: 'finance@pixelperch.com',       country: 'US' },
];

export const DEMO_XERO_INVOICES: XeroInvoice[] = [
  { invoiceID: 'x-inv-mock-001', invoiceNumber: 'MERC-INV-2026-0001', reference: 'PO-2026-001', contact: DEMO_XERO_CONTACTS[0], date: '2026-08-01', dueDate: '2026-09-01', lineItems: [{ description: 'Zambezi Health & Personal Care Line 1', quantity: 100, unitAmount: 12.00 }, { description: 'Zambezi Health & Personal Care Line 2', quantity: 50, unitAmount: 16.00 }], status: 'AUTHORISED', total: 2000.00, currencyCode: 'GBP' },
  { invoiceID: 'x-inv-mock-002', invoiceNumber: 'MERC-INV-2026-0002', reference: 'PO-2026-002', contact: DEMO_XERO_CONTACTS[1], date: '2026-08-05', dueDate: '2026-09-05', lineItems: [{ description: 'Nordhaus Home Line 1', quantity: 80, unitAmount: 13.00 }], status: 'SUBMITTED', total: 1040.00, currencyCode: 'GBP' },
  { invoiceID: 'x-inv-mock-003', invoiceNumber: 'MERC-INV-2026-0003', reference: 'PO-2026-003', contact: DEMO_XERO_CONTACTS[3], date: '2026-08-10', dueDate: '2026-09-10', lineItems: [{ description: 'DeskForge Office Products Line 1', quantity: 200, unitAmount: 15.00 }, { description: 'DeskForge Office Products Line 2', quantity: 150, unitAmount: 19.00 }], status: 'DRAFT', total: 5850.00, currencyCode: 'GBP' },
];

export const DEMO_SYNC_LOG: XeroSyncLogEntry[] = [
  { id: 'x-sync-mock-001', partner_id: 'a0000000-0000-0000-0000-000000000001', operation: 'invoice_push', records_affected: 1, success: true, error_message: null, api_calls_used: 2, created_at: '2026-09-04T10:00:00Z' },
  { id: 'x-sync-mock-002', partner_id: 'a0000000-0000-0000-0000-000000000001', operation: 'contact_sync', records_affected: 1, success: true, error_message: null, api_calls_used: 1, created_at: '2026-09-04T10:30:00Z' },
  { id: 'x-sync-mock-003', partner_id: 'a0000000-0000-0000-0000-000000000002', operation: 'invoice_push', records_affected: 0, success: false, error_message: '(Mock) Rate limit exceeded', api_calls_used: 3, created_at: '2026-09-04T11:00:00Z' },
  { id: 'x-sync-mock-004', partner_id: 'a0000000-0000-0000-0000-000000000002', operation: 'full_resync', records_affected: 5, success: true, error_message: null, api_calls_used: 4, created_at: '2026-09-04T12:00:00Z' },
  { id: 'x-sync-mock-005', partner_id: 'a0000000-0000-0000-0000-000000000004', operation: 'contact_sync', records_affected: 1, success: true, error_message: null, api_calls_used: 1, created_at: '2026-09-04T13:00:00Z' },
  { id: 'x-sync-mock-006', partner_id: 'a0000000-0000-0000-0000-000000000004', operation: 'token_refresh', records_affected: 0, success: true, error_message: null, api_calls_used: 1, created_at: '2026-09-04T14:00:00Z' },
  { id: 'x-sync-mock-007', partner_id: 'a0000000-0000-0000-0000-000000000006', operation: 'invoice_push', records_affected: 1, success: true, error_message: null, api_calls_used: 2, created_at: '2026-09-04T15:00:00Z' },
  { id: 'x-sync-mock-008', partner_id: 'a0000000-0000-0000-0000-000000000003', operation: 'full_resync', records_affected: 0, success: false, error_message: '(Mock) Connection is needs_reauth', api_calls_used: 0, created_at: '2026-09-04T16:00:00Z' },
  { id: 'x-sync-mock-009', partner_id: 'a0000000-0000-0000-0000-000000000008', operation: 'invoice_push', records_affected: 1, success: true, error_message: null, api_calls_used: 2, created_at: '2026-09-04T17:00:00Z' },
  { id: 'x-sync-mock-010', partner_id: 'a0000000-0000-0000-0000-00000000000b', operation: 'full_resync', records_affected: 3, success: true, error_message: null, api_calls_used: 4, created_at: '2026-09-04T18:00:00Z' },
];

export function findMockContact(name: string): XeroContact | undefined {
  return DEMO_XERO_CONTACTS.find((c) => c.name.toLowerCase() === name.toLowerCase());
}

export function mockInvoiceIdForPo(poNumber: string): string {
  return `x-inv-mock-po-${poNumber.replace(/[^a-zA-Z0-9-]/g, '')}`;
}

export function findMockInvoiceByReference(ref: string): XeroInvoice | undefined {
  return DEMO_XERO_INVOICES.find((inv) => inv.reference === ref);
}