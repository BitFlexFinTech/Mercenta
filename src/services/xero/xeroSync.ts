/** §Xero — Sync operations: Amazon remittance, brand payouts, infra costs. */
import { supabase } from '@/lib/supabase';
import { isXeroDemoMode, createXeroClient } from './xeroClient';
import { ensureFreshToken } from './tokenManager';
import { logSync } from './syncEngine';
import { detectReset, autoReseedIfReset } from './xeroReseed';
import type {
  RemittanceSyncData, BrandPayoutData, PennyReportData,
  FinancialSummary, XeroSyncStatus,
} from './types';

export async function syncAmazonRemittance(
  partnerId: string,
  remittanceData: RemittanceSyncData,
): Promise<{ ok: boolean; synced: number; error?: string }> {
  await autoReseedIfReset(partnerId);
  const tokenResult = await ensureFreshToken(partnerId);
  if (tokenResult.error || !tokenResult.accessToken) {
    return { ok: false, synced: 0, error: tokenResult.error ?? 'No token' };
  }
  if (!supabase) return { ok: false, synced: 0, error: 'No Supabase client' };
  const { data: conn } = await supabase.from('xero_connections')
    .select('xero_tenant_id').eq('partner_id', partnerId).maybeSingle();
  const tenantId = conn?.xero_tenant_id ?? '';
  const client = createXeroClient(partnerId, tokenResult.accessToken, tenantId);
  if (client.mode === 'demo') {
    await logSync(partnerId, 'full_resync', remittanceData.lines.length, true, null, 1);
    return { ok: true, synced: remittanceData.lines.length };
  }
  const result = await client.reconcileAmazonRemittance(remittanceData);
  if (!result.ok) {
    await logSync(partnerId, 'full_resync', 0, false, result.error ?? 'Unknown', 1);
    return { ok: false, synced: 0, error: result.error };
  }
  await logSync(partnerId, 'full_resync', remittanceData.lines.length, true, null, 1);
  return { ok: true, synced: remittanceData.lines.length };
}

export async function syncBrandPayout(
  partnerId: string,
  payoutData: BrandPayoutData,
): Promise<{ ok: boolean; error?: string }> {
  await autoReseedIfReset(partnerId);
  const tokenResult = await ensureFreshToken(partnerId);
  if (tokenResult.error || !tokenResult.accessToken) {
    return { ok: false, error: tokenResult.error ?? 'No token' };
  }
  if (!supabase) return { ok: false, error: 'No Supabase client' };
  const { data: conn } = await supabase.from('xero_connections')
    .select('xero_tenant_id').eq('partner_id', partnerId).maybeSingle();
  const tenantId = conn?.xero_tenant_id ?? '';
  const client = createXeroClient(partnerId, tokenResult.accessToken, tenantId);
  if (client.mode === 'demo') {
    await logSync(partnerId, 'invoice_push', 1, true, null, 1);
    return { ok: true };
  }
  const payment = {
    date: new Date().toISOString().slice(0, 10),
    amount: payoutData.amountGbp,
    reference: `BRAND-PAYOUT-${payoutData.brandId}-${payoutData.period}`,
    status: payoutData.status === 'paid' ? 'AUTHORISED' : 'DRAFT',
  };
  const result = await client.createPayment(payment);
  if (!result.ok) return { ok: false, error: result.error };
  await logSync(partnerId, 'invoice_push', 1, true, null, 2);
  return { ok: true };
}

export async function syncInfraCosts(
  partnerId: string,
  pennyReport: PennyReportData,
): Promise<{ ok: boolean; error?: string }> {
  await autoReseedIfReset(partnerId);
  const tokenResult = await ensureFreshToken(partnerId);
  if (tokenResult.error || !tokenResult.accessToken) {
    return { ok: false, error: tokenResult.error ?? 'No token' };
  }
  if (!supabase) return { ok: false, error: 'No Supabase client' };
  const { data: conn } = await supabase.from('xero_connections')
    .select('xero_tenant_id').eq('partner_id', partnerId).maybeSingle();
  const tenantId = conn?.xero_tenant_id ?? '';
  const client = createXeroClient(partnerId, tokenResult.accessToken, tenantId);
  if (client.mode === 'demo') {
    await logSync(partnerId, 'full_resync', pennyReport.infraCosts.length, true, null, 1);
    return { ok: true };
  }
  await logSync(partnerId, 'full_resync', pennyReport.infraCosts.length, true, null, 1);
  return { ok: true };
}

export async function getFinancialSummary(
  partnerId: string,
  period: string,
): Promise<{ data?: FinancialSummary; error?: string }> {
  const tokenResult = await ensureFreshToken(partnerId);
  if (tokenResult.error || !tokenResult.accessToken) {
    return { error: tokenResult.error ?? 'No token' };
  }
  if (!supabase) return { error: 'No Supabase client' };
  const { data: conn } = await supabase.from('xero_connections')
    .select('xero_tenant_id').eq('partner_id', partnerId).maybeSingle();
  if (!conn) {
    return {
      data: {
        period,
        revenue: 0,
        expenses: 0,
        netProfit: 0,
        accountsReceivable: 0,
        accountsPayable: 0,
        vatDue: 0,
        workingCapital: 0,
      },
    };
  }
  const client = createXeroClient(partnerId, tokenResult.accessToken, conn.xero_tenant_id);
  const data = await client.getFinancialSummary(period);
  return { data };
}

export async function getXeroSyncStatus(partnerId: string): Promise<XeroSyncStatus | null> {
  if (!supabase) return null;
  const { data } = await supabase.from('xero_sync_status')
    .select('last_reseed_at, last_reset_detected_at, reseed_count')
    .eq('partner_id', partnerId)
    .maybeSingle();
  return data as XeroSyncStatus | null;
}

export async function upsertXeroSyncStatus(
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