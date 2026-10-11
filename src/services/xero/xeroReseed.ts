/** §Xero — 28-day reset detection + auto-reseed from Supabase.
 * Supabase = single source of truth. When Xero demo company resets,
 * detect by checking contacts count, reseed all data. Idempotent:
 * checks existing records by reference before creating.
 */
import { supabase } from '@/lib/supabase';
import { isXeroDemoMode, createXeroClient, getXeroClientMode } from './xeroClient';
import { ensureFreshToken } from './tokenManager';
import { logSync } from './syncEngine';
import type { XeroReseedResult, XeroContact, XeroInvoice, XeroInvoiceLineItem, XeroSyncStatus } from './types';

async function upsertXeroSyncStatusLocal(
  partnerId: string,
  status: Partial<XeroSyncStatus>,
): Promise<void> {
  if (!supabase) return;
  try {
    await supabase.from('xero_sync_status').upsert(
      { partner_id: partnerId, ...status },
      { onConflict: 'partner_id' },
    );
  } catch { /* silent */ }
}

/** Count custom Xero contacts — if 0, the demo company was reset. */
export async function detectReset(partnerId: string): Promise<boolean> {
  if (!isXeroDemoMode()) return false;
  const tokenResult = await ensureFreshToken(partnerId);
  if (tokenResult.error || !tokenResult.accessToken) return false;
  if (!supabase) return false;
  const { data: conn } = await supabase.from('xero_connections')
    .select('xero_tenant_id').eq('partner_id', partnerId).maybeSingle();
  if (!conn) return false;
  const client = createXeroClient(partnerId, tokenResult.accessToken, conn.xero_tenant_id);
  const contacts = await client.getContacts();
  return contacts.length === 0;
}

/** Full reseed: pull ALL data from Supabase, push to Xero. Idempotent. */
export async function fullReseed(partnerId: string): Promise<XeroReseedResult> {
  const tokenResult = await ensureFreshToken(partnerId);
  if (tokenResult.error || !tokenResult.accessToken) {
    return { ok: false, contactsSynced: 0, invoicesSynced: 0, billsSynced: 0, paymentsSynced: 0, message: 'No token', error: tokenResult.error };
  }
  if (!supabase) {
    return { ok: false, contactsSynced: 0, invoicesSynced: 0, billsSynced: 0, paymentsSynced: 0, message: 'No Supabase client', error: 'No Supabase client' };
  }

  const { data: conn } = await supabase.from('xero_connections')
    .select('*').eq('partner_id', partnerId).maybeSingle();
  if (!conn || conn.status !== 'active') {
    return { ok: false, contactsSynced: 0, invoicesSynced: 0, billsSynced: 0, paymentsSynced: 0, message: 'No active Xero connection', error: 'No active connection' };
  }

  const client = createXeroClient(partnerId, tokenResult.accessToken, conn.xero_tenant_id);
  if (client.mode === 'demo') {
    await logSync(partnerId, 'full_resync', 0, true, null, 1);
    await upsertXeroSyncStatusLocal(partnerId, { last_reseed_at: new Date().toISOString(), reseed_count: 0 });
    return { ok: true, contactsSynced: 0, invoicesSynced: 0, billsSynced: 0, paymentsSynced: 0, message: 'Xero reseed complete. 0 contacts, 0 invoices, 0 bills, 0 payments synced. (Demo mode)' };
  }

  let contactsSynced = 0;
  let invoicesSynced = 0;
  const billsSynced = 0;
  const paymentsSynced = 0;
  const errors: string[] = [];
try {
    // 1. Sync brands as Xero contacts (idempotent — skip if name exists)
    const { data: brands } = await supabase.from('brands').select('*');
    if (brands) {
      const existingContacts = await client.getContacts();
      for (const brand of brands) {
        const exists = existingContacts.find(
          (c: XeroContact) => c.name?.toLowerCase() === (brand.name || brand.brand_name || '').toLowerCase(),
        );
        if (exists) continue;
        const result = await client.createContact({
          name: brand.name || brand.brand_name || 'Unknown Brand',
          email: brand.email || undefined,
          country: brand.country || 'GB',
          isCustomer: true,
        });
        if (result.ok) contactsSynced++;
        else errors.push(`Failed to create contact ${brand.name}: ${result.error}`);
      }
    }

    // 2. Sync POs as Xero invoices (idempotent — skip if reference exists)
    const { data: pos } = await supabase.from('purchase_orders').select('*');
    if (pos) {
      const xeroContacts = await client.getContacts();
      const existingInvoices = await client.getInvoices();
      for (const po of pos) {
        const ref = po.po_number || po.id;
        const exists = existingInvoices.find(
          (inv: XeroInvoice) => inv.reference === ref || inv.invoiceNumber === `MERC-INV-${ref}`,
        );
        if (exists) continue;

        const brand = brands?.find((b: any) => b.id === po.brand_id);
        const contact = xeroContacts.find(
          (c: XeroContact) => c.name?.toLowerCase() === (brand?.name || brand?.brand_name || '').toLowerCase(),
        );
        if (!contact) continue;

        const lineItems: XeroInvoiceLineItem[] = (po.line_items || []).map((li: any) => ({
          description: li.description || li.sku || 'Item',
          quantity: li.quantity || 1,
          unitAmount: li.unit_price || li.unitPrice || 0,
        }));
        if (lineItems.length === 0) {
          lineItems.push({ description: 'PO Total', quantity: 1, unitAmount: po.total_amount || po.total || 0 });
        }

        const result = await client.createInvoice({
          invoiceNumber: `MERC-INV-${ref}`,
          reference: ref,
          contact,
          date: po.created_at ? new Date(po.created_at).toISOString().slice(0, 10) : new Date().toISOString().slice(0, 10),
          dueDate: po.due_date || po.estimated_delivery || new Date(Date.now() + 30 * 86400000).toISOString().slice(0, 10),
          lineItems,
          currencyCode: 'GBP',
          status: 'DRAFT',
        });
        if (result.ok) invoicesSynced++;
        else errors.push(`Failed to create invoice for PO ${ref}: ${result.error}`);
      }
    }

    await upsertXeroSyncStatusLocal(partnerId, { last_reseed_at: new Date().toISOString(), reseed_count: 1 });
    await logSync(partnerId, 'full_resync', contactsSynced + invoicesSynced, true, null, contactsSynced + invoicesSynced + 2);
    const message = `Xero reseed complete. ${contactsSynced} contacts, ${invoicesSynced} invoices, 0 bills, 0 payments synced.`;
    return { ok: true, contactsSynced, invoicesSynced, billsSynced, paymentsSynced, message, error: errors.length > 0 ? errors.join('; ') : undefined };
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Unknown error';
    await logSync(partnerId, 'full_resync', 0, false, msg, 1);
    return { ok: false, contactsSynced, invoicesSynced, billsSynced, paymentsSynced, message: 'Reseed failed', error: msg };
  }
}

/** Check if reset detected, then auto-reseed. Logs in audit_log. */
export async function autoReseedIfReset(partnerId: string): Promise<XeroReseedResult | null> {
  if (!isXeroDemoMode()) return null;
  const wasReset = await detectReset(partnerId);
  if (!wasReset) return null;
  await upsertXeroSyncStatusLocal(partnerId, { last_reset_detected_at: new Date().toISOString() });
  if (supabase) {
    try {
      await supabase.from('audit_log').insert({
        actor_id: partnerId,
        action: 'xero_28_day_reset_detected',
        details: { message: 'Xero demo company reset detected — auto-reseeding from Supabase' },
      });
    } catch { /* silent */ }
  }
  return fullReseed(partnerId);
}

/** Called at the start of Margaret's daily run (the Super Admin 'Sync Now' button
 *  that used to call it too was REMOVED in §BATCH 7 Part 4.3 — it had no handler). */
export async function checkAndReseed(partnerId: string): Promise<XeroReseedResult | null> {
  const mode = getXeroClientMode();
  if (mode === 'demo') return autoReseedIfReset(partnerId);
  return null; // production mode: incremental sync only
}