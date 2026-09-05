/** §Xero — Sync engine: pushInvoice, syncContacts, fullResync, 28-day reset.
 * Every sync checks the 28-day reset cycle; triggers fullResync automatically.
 */
import { supabase } from '@/lib/supabase';
import type { XeroContact, PoDataForInvoice } from './types';
import { isXeroDemoMode, createInvoice, getContacts, getInvoices, buildXeroInvoiceFromPo, createContact as xeroCreateContact } from './xeroClient';
import { ensureFreshToken } from './tokenManager';
import { findMockContact } from './demoData';

const TWENTY_EIGHT_DAYS_MS = 28 * 24 * 60 * 60 * 1000;

export async function logSync(
  partnerId: string,
  operation: 'invoice_push' | 'contact_sync' | 'full_resync' | 'token_refresh',
  recordsAffected: number, success: boolean, errorMessage: string | null, apiCallsUsed: number,
): Promise<void> {
  if (!supabase) return;
  try { await supabase.from('xero_sync_log').insert({ partner_id: partnerId, operation, records_affected: recordsAffected, success, error_message: errorMessage, api_calls_used: apiCallsUsed }); } catch { /* silent */ }
}

async function checkAndRun28DayReset(partnerId: string): Promise<void> {
  if (!supabase) return;
  const { data } = await supabase.from('xero_connections').select('last_reset_at').eq('partner_id', partnerId).single();
  const lastReset = data?.last_reset_at ? new Date(data.last_reset_at).getTime() : 0;
  if (Date.now() - lastReset >= TWENTY_EIGHT_DAYS_MS) {
    const { accessToken, error } = await ensureFreshToken(partnerId);
    if (error || !accessToken) return;
    const conn = await getConnectionMeta(partnerId);
    if (!conn) return;
    await fullResyncCore(partnerId, accessToken, conn.xero_tenant_id);
  }
}

async function getConnectionMeta(partnerId: string): Promise<{ xero_tenant_id: string } | null> {
  if (!supabase) return null;
  const { data } = await supabase.from('xero_connections').select('xero_tenant_id, status').eq('partner_id', partnerId).single();
  if (!data || data.status !== 'active') return null;
  return { xero_tenant_id: data.xero_tenant_id };
}

export async function pushInvoice(partnerId: string, poData: PoDataForInvoice): Promise<{ invoiceID: string | null; ok: boolean; error?: string }> {
  await checkAndRun28DayReset(partnerId);
  const tokenResult = await ensureFreshToken(partnerId);
  if (tokenResult.error) return { invoiceID: null, ok: false, error: tokenResult.error };
  const conn = await getConnectionMeta(partnerId);
  if (!conn) return { invoiceID: null, ok: false, error: 'No active Xero connection' };
  let contact: XeroContact;
  if (isXeroDemoMode()) {
    const existing = findMockContact(poData.partnerName);
    contact = existing ?? { name: poData.partnerName, isCustomer: true };
  } else {
    contact = { name: poData.partnerName, isCustomer: true };
    const contacts = await getContacts(partnerId, tokenResult.accessToken, conn.xero_tenant_id);
    const found = contacts.find((c) => c.name.toLowerCase() === poData.partnerName.toLowerCase());
    if (found) { contact = found; } else {
      const created = await xeroCreateContact(contact, partnerId, tokenResult.accessToken, conn.xero_tenant_id);
      if (!created.ok) return { invoiceID: null, ok: false, error: 'Failed to create Xero contact' };
    }
  }
  const invoice = buildXeroInvoiceFromPo(poData, contact);
  return await createInvoice(invoice, partnerId, tokenResult.accessToken, conn.xero_tenant_id);
}
export async function syncContacts(partnerId: string): Promise<{ ok: boolean; contactsSynced: number; error?: string }> {
  await checkAndRun28DayReset(partnerId);
  const tokenResult = await ensureFreshToken(partnerId);
  if (tokenResult.error) return { ok: false, contactsSynced: 0, error: tokenResult.error };
  const conn = await getConnectionMeta(partnerId);
  if (!conn) return { ok: false, contactsSynced: 0, error: 'No active Xero connection' };
  try {
    const contacts = await getContacts(partnerId, tokenResult.accessToken, conn.xero_tenant_id);
    await logSync(partnerId, 'contact_sync', contacts.length, true, null, 1);
    return { ok: true, contactsSynced: contacts.length };
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Unknown error';
    await logSync(partnerId, 'contact_sync', 0, false, msg, 1);
    return { ok: false, contactsSynced: 0, error: msg };
  }
}

export async function fullResync(partnerId: string): Promise<{ ok: boolean; invoicesSynced: number; contactsSynced: number; error?: string }> {
  const tokenResult = await ensureFreshToken(partnerId);
  if (tokenResult.error) return { ok: false, invoicesSynced: 0, contactsSynced: 0, error: tokenResult.error };
  const conn = await getConnectionMeta(partnerId);
  if (!conn) return { ok: false, invoicesSynced: 0, contactsSynced: 0, error: 'No active Xero connection' };
  return await fullResyncCore(partnerId, tokenResult.accessToken, conn.xero_tenant_id);
}

async function fullResyncCore(partnerId: string, accessToken: string, tenantId: string): Promise<{ ok: boolean; invoicesSynced: number; contactsSynced: number; error?: string }> {
  let totalApiCalls = 0;
  try {
    const invoices = await getInvoices(partnerId, accessToken, tenantId);
    totalApiCalls++;
    const contacts = await getContacts(partnerId, accessToken, tenantId);
    totalApiCalls++;
    if (supabase) {
      await supabase.from('xero_connections').update({ last_reset_at: new Date().toISOString() }).eq('partner_id', partnerId);
    }
    await logSync(partnerId, 'full_resync', invoices.length + contacts.length, true, null, totalApiCalls);
    return { ok: true, invoicesSynced: invoices.length, contactsSynced: contacts.length };
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Unknown error';
    await logSync(partnerId, 'full_resync', 0, false, msg, totalApiCalls);
    return { ok: false, invoicesSynced: 0, contactsSynced: 0, error: msg };
  }
}