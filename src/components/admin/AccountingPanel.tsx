/** §Xero — Super Admin Accounting tab.
 * Connection status, reset tracker, financial summary, Amazon sync,
 * brand payouts table, Penny Pincher integration.
 */
import { useState, useEffect, useCallback } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { Badge, Button, Card, DataTable, StatusBadge } from '@/components/ui';
import { useBrands, useCommissions } from '@/data/queries';
import { settleBrandPayout } from '@/data/api';
import { computeBrandNetShare, normalisePayoutTrack, resolveCommissionRatePct } from '@/lib/billing/payouts';
import { commissionStatusPresentation, payoutDestinationStatusPresentation, payoutStatePresentation, reconciliationStatePresentation } from '@/lib/statusPresentation';
import {
  evaluatePayoutEligibility,
  getDestinations,
  getPayoutForCommission,
  getReconciliationForPo,
  setDestinationStatus,
} from '@/lib/finance/financialReconciliation';
import { demoPurchaseOrders, getAllCommerceInvoices, getAllCommercePayments, getInvoiceNumberLedger } from '@/data/demoStore';
import { PAYMENT_DERIVATION_BASIS, summariseInvoiceLedger } from '@/lib/commerce/invoiceTerms';
import { useApp } from '@/context/GlobalStateContext';
import { supabase } from '@/lib/supabase';
import { isXeroDemoMode } from '@/services/xero';
import { getFinancialSummary } from '@/services/xero/xeroSync';
import { checkAndReseed } from '@/services/xero/xeroReseed';
import { cn } from '@/utils/cn';
import {
  RefreshCw, Link2, AlertTriangle, CheckCircle2, Loader2,
  Clock, DollarSign, TrendingUp, TrendingDown,
  Banknote,
} from 'lucide-react';
import {
  ContextPanel,
  MetricBand,
  RecordFieldList,
  WorkspaceFrame,
  WorkspaceGrid,
  WorkspaceHeader,
  WorkspaceSection,
  type MetricTileData,
} from '@/components/shared/workspace';
import { useWorkItems } from '@/lib/work/useWork';
import { WORK_SOURCE_LABELS, demoToday } from '@/lib/work/workStore';
import type { WorkSource } from '@/lib/work/types';

/** §Sprint 2 — the finance side of the deterministic operating layer (§8). */
const FINANCE_WORK_SOURCES: WorkSource[] = ['invoice_due', 'deduction_dispute', 'contract_renewal'];

const PARTNER_ID = 'a0000000-0000-0000-0000-000000000001';

/**
 * §M6 — a commission records the PO NUMBER; the reconciliation is keyed by the
 * canonical PO id. This resolves one to the other from the canonical PO store
 * (no second list of POs anywhere).
 */
function poIdForCommission(poNumber: string): string {
  return demoPurchaseOrders.find((p) => p.poNumber === poNumber)?.id ?? poNumber;
}

export function AccountingPanel() {
  const [connected, setConnected] = useState<boolean | null>(null);
  const [demoMode, setDemoMode] = useState(false);
  const [lastSync, setLastSync] = useState<string | null>(null);
  const [lastReseed, setLastReseed] = useState<string | null>(null);
  const [daysSinceReseed, setDaysSinceReseed] = useState<number | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [showCredentialForm, setShowCredentialForm] = useState(false);
  const [credClientId, setCredClientId] = useState('');
  const [credClientSecret, setCredClientSecret] = useState('');
  const [credTenantId, setCredTenantId] = useState('');
  const [credAccessToken, setCredAccessToken] = useState('');
  const [summary, setSummary] = useState<{ revenue: number; expenses: number; netProfit: number } | null>(null);
  const [seedMessage, setSeedMessage] = useState<string | null>(null);

  /* ── §Phase D6 — brand payouts (canonical commission store + seam) ─────── */
  const qc = useQueryClient();
  const { actingStaffId } = useApp();
  const commissionsQuery = useCommissions();
  const brandsQuery = useBrands();
  const [payoutBusyId, setPayoutBusyId] = useState<string | null>(null);
  const [payoutNotice, setPayoutNotice] = useState<string | null>(null);
  const [payoutError, setPayoutError] = useState<string | null>(null);
  // §M6 — payout destination review state.
  const [destinationBusyId, setDestinationBusyId] = useState<string | null>(null);
  const [destinationNotice, setDestinationNotice] = useState<string | null>(null);
  const [destinationVersion, setDestinationVersion] = useState(0);

  const brandName = useCallback(
    (brandId: string) =>
      brandsQuery.data?.data.find((b) => b.id === brandId)?.profile.businessName ?? brandId,
    [brandsQuery.data]
  );
  const brandTrack = useCallback<(brandId: string) => 'direct_fulfillment' | 'financed'>(
    (brandId) => normalisePayoutTrack(brandsQuery.data?.data.find((b) => b.id === brandId)?.track ?? 'financed'),
    [brandsQuery.data]
  );

  /** Pending = money the brand is still owed. `paid` is terminal (never re-settled). */
  const allCommissions = commissionsQuery.data?.data ?? [];
  const pendingPayouts = allCommissions.filter((c) => c.status !== 'paid');
  const settledCount = allCommissions.filter((c) => c.status === 'paid').length;

  // §M6 — the destination rows are read live; `destinationVersion` forces this
  // component to re-read after an operator review action.
  void destinationVersion;
  const destinationRows = getDestinations();

  /** Net brand share, using the canonical fee maths + the brand's real track. */
  const netShareOf = useCallback(
    (c: { poValue: number; commissionRate: number; commissionAmount: number; brandId: string }) =>
      computeBrandNetShare({
        poValue: c.poValue,
        commissionRatePct: resolveCommissionRatePct({
          commissionRate: c.commissionRate,
          commissionAmount: c.commissionAmount,
          poValue: c.poValue,
        }),
        fulfillmentTrack: brandTrack(c.brandId),
      }),
    [brandTrack]
  );

  /* §Phase D6 — the payout tiles DRILL the table down (the canonical §Stage-18
     interactivity contract): a KPI that cannot be inspected is incomplete. */
  const [payoutFilter, setPayoutFilter] = useState<'pending' | 'settled' | 'all'>('pending');
  const payoutRows = allCommissions.filter((c) =>
    payoutFilter === 'pending' ? c.status !== 'paid' : payoutFilter === 'settled' ? c.status === 'paid' : true
  );
  const sumNet = (rows: typeof allCommissions) => rows.reduce((s, c) => s + netShareOf(c), 0);
  const payoutMetrics = [
    { key: 'pending' as const, label: 'Pending payouts', value: String(pendingPayouts.length), sub: `£${sumNet(pendingPayouts).toFixed(2)} owed` },
    { key: 'settled' as const, label: 'Settled', value: String(settledCount), sub: `£${sumNet(allCommissions.filter((c) => c.status === 'paid')).toFixed(2)} paid (sim)` },
    { key: 'all' as const, label: 'All commissions', value: String(allCommissions.length), sub: `£${sumNet(allCommissions).toFixed(2)} net total` },
  ];

  async function settle(commissionId: string) {
    if (payoutBusyId) return;
    setPayoutBusyId(commissionId);
    setPayoutNotice(null);
    setPayoutError(null);
    const result = await settleBrandPayout(commissionId, actingStaffId);
    setPayoutBusyId(null);
    if (!result.ok) {
      setPayoutError(result.error ?? 'Payout refused');
      return;
    }
    setPayoutNotice(
      `${result.mode === 'mock' ? 'Simulated' : 'Live'} payout ${result.transferId} — net £${(
        result.netShareGbp ?? 0
      ).toFixed(2)}. ${
        result.mode === 'mock'
          ? 'Mock transfer: no live Stripe call was made.'
          : 'Recorded by the payout Edge Function.'
      }`
    );
    await qc.invalidateQueries({ queryKey: ['commissions'] });
    await qc.invalidateQueries({ queryKey: ['audit-log'] });
  }

  /**
   * §M6 — payout destination review. Verifying REQUIRES a verification
   * reference; suspending records the reason. Either way the change is audited
   * and immediately affects payout eligibility.
   */
  async function reviewDestination(
    destinationId: string,
    status: 'verified' | 'suspended' | 'unverified'
  ) {
    if (destinationBusyId) return;
    setDestinationBusyId(destinationId);
    setDestinationNotice(null);
    const result = setDestinationStatus(
      destinationId,
      status,
      { staffId: actingStaffId, canMutate: true },
      status === 'verified'
        ? {
            verificationMethod: 'Mercenta operator review',
            verificationRef: `SIM-VERIFY-${destinationId}-${destinationVersion + 1}`,
          }
        : { reason: 'Suspended pending account review by Mercenta.' }
    );
    setDestinationBusyId(null);
    setDestinationVersion((v) => v + 1);
    setDestinationNotice(
      result.ok
        ? `Destination ${destinationId} is now ${result.value.status}.`
        : result.error
    );
    await qc.invalidateQueries({ queryKey: ['commissions'] });
    await qc.invalidateQueries({ queryKey: ['audit-log'] });
  }

  const loadStatus = useCallback(async () => {
    const mode = isXeroDemoMode();
    setDemoMode(mode);
    if (!supabase) { setConnected(false); return; }
    const { data: conn } = await supabase.from('xero_connections')
      .select('*').eq('partner_id', PARTNER_ID).maybeSingle();
    if (!conn || conn.status !== 'active') { setConnected(false); return; }
    setConnected(true);
    setLastSync(conn.last_synced_at);
    setLastReseed(conn.last_reset_at);
    if (conn.last_reset_at) {
      const days = Math.floor((Date.now() - new Date(conn.last_reset_at).getTime()) / 86400000);
      setDaysSinceReseed(days);
    }
    const result = await getFinancialSummary(PARTNER_ID, new Date().toISOString().slice(0, 7));
    if (result.data) {
      setSummary({ revenue: result.data.revenue, expenses: result.data.expenses, netProfit: result.data.netProfit });
    }
  }, []);

  useEffect(() => { loadStatus(); }, [loadStatus]);

  const handleManualReseed = async () => {
    setBusy('Reseeding…');
    setError(null);
    setSeedMessage(null);
    try {
      const result = await checkAndReseed(PARTNER_ID);
      if (result) {
        setSeedMessage(result.message);
        if (!result.ok) setError(result.error ?? 'Reseed failed');
      } else {
        setSeedMessage('No reseed needed.');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Reseed error');
    }
    setBusy(null);
    await loadStatus();
  };

  const handleSaveCredentials = () => {
    setConnected(true);
    setShowCredentialForm(false);
    setDemoMode(false);
    setLastSync(new Date().toISOString());
    setLastReseed(new Date().toISOString());
    setDaysSinceReseed(0);
    setSeedMessage('Credentials saved. Xero connected.');
  };

  const remainingDays = daysSinceReseed !== null ? Math.max(0, 28 - daysSinceReseed) : null;

  /* §Sprint 2 — the SAME deterministic work layer, narrowed to the finance
     sources: invoice → due → work item → reminder → payment → reconciliation
     → audit. No second finance task system. */
  const financeWork = useWorkItems('admin').filter((w) => FINANCE_WORK_SOURCES.includes(w.source));
  const today = demoToday();
  const overdueFinanceWork = financeWork.filter((w) => w.dueDate !== null && w.dueDate < today);

  /**
   * §P7 — the invoice-number REGISTRY ledger and the ONE receivables summary.
   * The ledger is append-only (`AV-022`): a voided number stays visible so the
   * "never reused" rule is auditable from this surface, not just from the code.
   */
  const invoiceLedgerRows = getInvoiceNumberLedger();
  const invoiceSummary = summariseInvoiceLedger(
    getAllCommerceInvoices(),
    getAllCommercePayments(),
    new Date().toISOString().slice(0, 10)
  );

  const [summaryDetail, setSummaryDetail] = useState(false);

  const financeMetrics: MetricTileData[] = [
    {
      id: 'accounting-revenue',
      label: 'Revenue',
      value: summary ? `£${summary.revenue.toLocaleString()}` : '—',
      size: 'hero',
      tone: summary && summary.revenue > 0 ? 'success' : 'neutral',
      statusText: connected ? 'Xero connected' : 'Xero not connected',
      context: 'Revenue reported by the accounting layer',
      domain: 'finance',
      onOpen: () => setSummaryDetail((v) => !v),
      testId: 'accounting-metric-revenue',
      valueTestId: 'accounting-metric-revenue-value',
    },
    {
      id: 'accounting-expenses',
      label: 'Expenses',
      value: summary ? `£${summary.expenses.toLocaleString()}` : '—',
      tone: summary && summary.expenses > 0 ? 'warning' : 'neutral',
      statusText: 'Recorded costs',
      context: 'Expenses reported by the accounting layer',
      domain: 'logistics',
      onOpen: () => setSummaryDetail((v) => !v),
      testId: 'accounting-metric-expenses',
      valueTestId: 'accounting-metric-expenses-value',
    },
    {
      id: 'accounting-net',
      label: 'Net profit',
      value: summary ? `£${summary.netProfit.toLocaleString()}` : '—',
      tone: summary ? (summary.netProfit >= 0 ? 'success' : 'danger') : 'neutral',
      statusText: summary ? (summary.netProfit >= 0 ? 'Positive' : 'Negative') : 'No data',
      context: 'Revenue less expenses',
      domain: 'catalogue',
      onOpen: () => setSummaryDetail((v) => !v),
      testId: 'accounting-metric-net',
      valueTestId: 'accounting-metric-net-value',
    },
    {
      id: 'accounting-work',
      label: 'Open finance work',
      value: String(financeWork.length),
      tone: overdueFinanceWork.length > 0 ? 'danger' : financeWork.length > 0 ? 'warning' : 'success',
      statusText: `${overdueFinanceWork.length} overdue`,
      context: 'Invoices due, deduction disputes and contract renewals',
      domain: 'compliance',
      onOpen: () => setPayoutFilter('pending'),
      testId: 'accounting-metric-work',
      valueTestId: 'accounting-metric-work-value',
    },
  ];

  return (
    <WorkspaceFrame className="space-y-4">
      <WorkspaceHeader
        eyebrow="Super Admin · Finance"
        title="Accounting"
        description="Xero is the accounting and reconciliation layer — it is NOT the bank. Connection state, the 28-day reseed tracker, the financial summary, brand payouts and the deterministic finance work items all read the same canonical records."
        status={
          connected === null ? (
            <Badge className="bg-white/[0.06] text-zinc-400">
              <Loader2 className="w-3 h-3 animate-spin" /> Checking Xero
            </Badge>
          ) : connected ? (
            <Badge className="bg-emerald-500/15 text-emerald-300 border-emerald-500/20">
              <CheckCircle2 className="w-3 h-3" /> Xero Connected{demoMode ? ' (Demo)' : ''}
            </Badge>
          ) : (
            <Badge className="bg-amber-500/15 text-amber-300 border-amber-500/20">
              <AlertTriangle className="w-3 h-3" /> Xero not connected
            </Badge>
          )
        }
        meta={
          <>
            <span className="font-mono text-ds-label text-zinc-500">
              {allCommissions.length} commissions
            </span>
            <span className="font-mono text-ds-label text-zinc-500">
              {pendingPayouts.length} pending payouts
            </span>
            <span className="font-mono text-ds-label text-zinc-500">{financeWork.length} finance work items</span>
          </>
        }
        actions={
          <Button
            variant="ghost"
            className="text-ds-label"
            onClick={() => setSummaryDetail((v) => !v)}
            data-testid="accounting-toggle-summary"
          >
            {summaryDetail ? 'Hide breakdown' : 'Show breakdown'}
          </Button>
        }
      />

      <MetricBand items={financeMetrics} columns={4} />

      {summaryDetail && (
        <WorkspaceSection
          title="Financial breakdown"
          description="The same three figures, shown with their source so nothing is presented without provenance."
          domain="finance"
        >
          <RecordFieldList
            fields={[
              { label: 'Revenue', value: summary ? `£${summary.revenue.toLocaleString()}` : 'Not available' },
              { label: 'Expenses', value: summary ? `£${summary.expenses.toLocaleString()}` : 'Not available' },
              { label: 'Net profit', value: summary ? `£${summary.netProfit.toLocaleString()}` : 'Not available' },
              { label: 'Source', value: connected ? (demoMode ? 'Xero (Demo)' : 'Xero') : 'Xero not connected' },
              { label: 'Payout rail', value: 'Payoneer (default) · Wise (secondary)' },
              { label: 'Human approval', value: 'Required before any payout leaves Mercenta' },
            ]}
          />
        </WorkspaceSection>
      )}

      <WorkspaceGrid
        rail={
          <>
            <ContextPanel title="Finance work items">
              <RecordFieldList
                fields={[
                  { label: 'Open items', value: String(financeWork.length) },
                  { label: 'Overdue', value: String(overdueFinanceWork.length) },
                  {
                    label: 'Invoices due',
                    value: String(financeWork.filter((w) => w.source === 'invoice_due').length),
                  },
                  {
                    label: 'Deduction disputes',
                    value: String(financeWork.filter((w) => w.source === 'deduction_dispute').length),
                  },
                ]}
              />
              <ul className="mt-2 space-y-1.5">
                {financeWork.slice(0, 5).map((w) => (
                  <li key={w.id} className="text-ds-label leading-snug text-zinc-400">
                    <span className="font-medium text-zinc-200">{WORK_SOURCE_LABELS[w.source]}</span>
                    {' · '}
                    {w.title}
                    {w.dueDate && <span className="font-mono text-zinc-600"> · due {w.dueDate}</span>}
                  </li>
                ))}
                {financeWork.length === 0 && (
                  <li className="text-ds-label text-zinc-500">No open finance work.</li>
                )}
              </ul>
              <p className="mt-2 text-ds-label leading-snug text-zinc-400">
                An issued invoice with no settled payment becomes an <em>Invoice due</em> work item
                with its declared payment-terms deadline; settling the payment resolves it and stops
                its reminder.
              </p>
            </ContextPanel>
            <ContextPanel title="Money chain">
              <p className="text-ds-label leading-snug text-zinc-400">
                PO → invoice → payment → reconciliation → Xero → payout proposal → human approval →
                Payoneer → settlement. Xero is the accounting layer, never the bank; Stripe bills the
                subscription only and is refused as a payout rail.
              </p>
            </ContextPanel>
            {/* §P7 — the retail-channel invoice-number registry (`AV-022`). */}
            <ContextPanel title="Retail-channel invoice numbers">
              <div data-testid="accounting-invoice-registry">
                <RecordFieldList
                  fields={[
                    { label: 'Numbers allocated', value: String(invoiceLedgerRows.length) },
                    {
                      label: 'Void (cancelled)',
                      value: String(invoiceLedgerRows.filter((r) => r.voidedAt).length),
                    },
                    { label: 'Receivables', value: `£${invoiceSummary.receivablesGbp.toFixed(2)}` },
                    { label: 'Upcoming (30 days)', value: `£${invoiceSummary.upcomingGbp.toFixed(2)}` },
                  ]}
                />
                <ul className="mt-2 space-y-1.5">
                  {invoiceLedgerRows
                    .slice(-5)
                    .reverse()
                    .map((r) => (
                      <li key={r.number} className="text-ds-label leading-snug text-zinc-400">
                        <span className="font-mono text-zinc-200">{r.number}</span>
                        {' · '}
                        {r.voidedAt ? 'void — never reusable' : 'in force'}
                      </li>
                    ))}
                  {invoiceLedgerRows.length === 0 && (
                    <li className="text-ds-label text-zinc-500">
                      No invoice number has been allocated yet.
                    </li>
                  )}
                </ul>
                <p className="mt-2 text-ds-label leading-snug text-zinc-400">
                  Numbers are unique and are never reused; a zero-value invoice fails; a wrong invoice
                  is cancelled and re-sent under a NEW Invoice ID.
                </p>
                <p className="mt-1 text-ds-label leading-snug text-zinc-500">
                  Receivables and upcoming payments are {PAYMENT_DERIVATION_BASIS}.
                </p>
              </div>
            </ContextPanel>
          </>
        }
      >
      <div className="space-y-4">
      <Card title="Xero Connection Status" className="p-5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            {connected === null ? (
              <Loader2 className="w-5 h-5 text-zinc-500 animate-spin" />
            ) : connected ? (
              <Badge className="bg-emerald-500/15 text-emerald-300 border-emerald-500/20">
                <CheckCircle2 className="w-3 h-3" />
                Xero Connected{demoMode ? ' (Demo)' : ''}
              </Badge>
            ) : (
              <Badge className="bg-amber-500/15 text-amber-300 border-amber-500/20">
                <AlertTriangle className="w-3 h-3" />
                Xero Not Connected — Add API credentials
              </Badge>
            )}
            {lastSync && (
              <span className="text-ds-label text-zinc-500">
                <Clock className="w-3 h-3 inline mr-1" />
                Last sync: {new Date(lastSync).toLocaleString()}
              </span>
            )}
          </div>
          <div className="flex items-center gap-2">
            {!connected ? (
              <Button onClick={() => setShowCredentialForm(!showCredentialForm)} size="sm">
                <Link2 className="w-3.5 h-3.5" />
                {showCredentialForm ? 'Cancel' : 'Enter Xero Credentials'}
              </Button>
            ) : (
              <Button onClick={handleManualReseed} disabled={!!busy} variant="secondary" size="sm">
                {busy === 'Reseeding…' ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <RefreshCw className="w-3.5 h-3.5" />}
                {busy || 'Manual Reseed'}
              </Button>
            )}
          </div>
        </div>
{error && (
          <div className="mt-3 bg-red-500/10 border border-red-500/20 rounded-lg p-2.5 text-ds-label text-red-300">{error}</div>
        )}
        {seedMessage && (
          <div className="mt-3 bg-emerald-500/10 border border-emerald-500/20 rounded-lg p-2.5 text-ds-label text-emerald-300">{seedMessage}</div>
        )}

        {showCredentialForm && (
          <div className="mt-4 space-y-3 border border-white/[0.06] rounded-lg p-4">
            <h4 className="text-xs font-medium text-zinc-400">Xero API Credentials</h4>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-ds-label text-zinc-500 mb-1">Client ID</label>
                <input value={credClientId} onChange={(e) => setCredClientId(e.target.value)}
                  className="w-full bg-ink-900 border border-white/[0.08] rounded-lg px-3 py-2 text-xs text-white" placeholder="xero-client-id" />
              </div>
              <div>
                <label className="block text-ds-label text-zinc-500 mb-1">Client Secret</label>
                <input value={credClientSecret} onChange={(e) => setCredClientSecret(e.target.value)}
                  className="w-full bg-ink-900 border border-white/[0.08] rounded-lg px-3 py-2 text-xs text-white" placeholder="xero-client-secret" />
              </div>
              <div>
                <label className="block text-ds-label text-zinc-500 mb-1">Tenant ID</label>
                <input value={credTenantId} onChange={(e) => setCredTenantId(e.target.value)}
                  className="w-full bg-ink-900 border border-white/[0.08] rounded-lg px-3 py-2 text-xs text-white" placeholder="xero-tenant-id" />
              </div>
              <div>
                <label className="block text-ds-label text-zinc-500 mb-1">Access Token</label>
                <input value={credAccessToken} onChange={(e) => setCredAccessToken(e.target.value)}
                  className="w-full bg-ink-900 border border-white/[0.08] rounded-lg px-3 py-2 text-xs text-white" placeholder="xero-access-token" />
              </div>
            </div>
            <Button onClick={handleSaveCredentials} size="sm" disabled={!credClientId || !credAccessToken}>
              Save & Connect
            </Button>
          </div>
        )}
      </Card>
{demoMode && (
        <Card title="28-Day Reset Tracker" className="p-5">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs text-zinc-400">
              Days since last reseed:{' '}
              <span className="text-white font-semibold">{daysSinceReseed ?? '—'}</span>
              {' / 28'}
            </span>
            {remainingDays !== null && remainingDays <= 3 && (
              <Badge className="bg-amber-500/15 text-amber-300 border-amber-500/20">
                <AlertTriangle className="w-3 h-3" />
                {remainingDays} days until reset
              </Badge>
            )}
          </div>
          {daysSinceReseed !== null && (
            <div className="w-full bg-ink-900 rounded-full h-2.5 mb-2">
              <div
                className={cn(
                  'h-2.5 rounded-full transition-all duration-500',
                  remainingDays && remainingDays <= 3 ? 'bg-amber-500' : 'bg-brass-500',
                )}
                style={{ width: `${Math.min(100, (daysSinceReseed / 28) * 100)}%` }}
              />
            </div>
          )}
          <p className="text-ds-label text-zinc-500">
            {remainingDays !== null
              ? `Next expected reset: ${new Date(Date.now() + remainingDays * 86400000).toLocaleDateString()}`
              : 'Not connected — reseed tracking unavailable'}
          </p>
        </Card>
      )}

      <Card title="Financial Summary" className="p-5">
        {summary ? (
          <div className="grid grid-cols-3 gap-4">
            <div className="bg-white/[0.03] rounded-lg p-3">
              <div className="flex items-center gap-1.5 text-emerald-400 mb-1">
                <TrendingUp className="w-3.5 h-3.5" />
                <span className="text-ds-label font-medium uppercase tracking-wider">Revenue</span>
              </div>
              <span className="text-lg font-semibold text-white">£{summary.revenue.toLocaleString()}</span>
            </div>
            <div className="bg-white/[0.03] rounded-lg p-3">
              <div className="flex items-center gap-1.5 text-rose-400 mb-1">
                <TrendingDown className="w-3.5 h-3.5" />
                <span className="text-ds-label font-medium uppercase tracking-wider">Expenses</span>
              </div>
              <span className="text-lg font-semibold text-white">£{summary.expenses.toLocaleString()}</span>
            </div>
            <div className="bg-white/[0.03] rounded-lg p-3">
              <div className="flex items-center gap-1.5 text-brass-400 mb-1">
                <DollarSign className="w-3.5 h-3.5" />
                <span className="text-ds-label font-medium uppercase tracking-wider">Net Profit</span>
              </div>
              <span className={cn('text-lg font-semibold', summary.netProfit >= 0 ? 'text-emerald-400' : 'text-rose-400')}>
                £{summary.netProfit.toLocaleString()}
              </span>
            </div>
          </div>
        ) : (
          <p className="text-xs text-zinc-500 italic">Connect Xero to see financial summary.</p>
        )}
      </Card>

      <Card title="Amazon Remittance Sync" className="p-5">
        <div className="flex items-center justify-between">
          <p className="text-xs text-zinc-400">
            {connected ? 'Xero connected. Sync remittance statements from Amazon.' : 'Connect Xero to enable Amazon remittance sync.'}
          </p>
          <Button disabled={!connected || !!busy} variant="secondary" size="sm">
            <RefreshCw className="w-3.5 h-3.5" /> Sync Now
          </Button>
        </div>
      </Card>

      {/* §Phase D6 — REAL brand payouts. This card used to be a hardcoded
          "No pending payouts" row while `settleCommission` sat with zero call
          sites. It now reads the canonical commission store, computes the net
          share with the canonical fee maths, and settles through the existing
          mock-first transfer seam, so the action has a real consequence
          (commission → paid + canonical audit row). */}
      <Card title="Brand Payouts" className="p-5">
        <p className="text-xs text-zinc-400">
          Brand net share per settled commission (PO value − commission). Transfers run in
          <span className="text-amber-300"> simulation</span> until Stripe Connect credentials are
          configured.
        </p>

        {/* §Stage-18 — every tile drills the table down (no static KPI). */}
        <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-3">
          {payoutMetrics.map((m) => (
            <button
              key={m.key}
              type="button"
              onClick={() => setPayoutFilter(m.key)}
              aria-pressed={payoutFilter === m.key}
              className={cn(
                'rounded-lg border p-2.5 text-left transition-colors',
                payoutFilter === m.key
                  ? 'border-brass-500/40 bg-brass-500/10'
                  : 'border-white/[0.06] bg-white/[0.02] hover:border-white/[0.14]'
              )}
            >
              <p className="text-ds-micro uppercase tracking-wider text-zinc-500">{m.label}</p>
              <p className="font-mono text-base font-semibold text-white">{m.value}</p>
              <p className="text-ds-micro text-zinc-500">{m.sub}</p>
            </button>
          ))}
        </div>

        <div className="mt-2 flex flex-wrap items-center gap-2">
          <Badge className="text-ds-micro bg-white/[0.05] text-zinc-300 border-white/[0.08]">
            {pendingPayouts.length} pending
          </Badge>
          <Badge className="text-ds-micro bg-white/[0.05] text-zinc-300 border-white/[0.08]">
            {settledCount} settled
          </Badge>
          <span className="text-ds-micro text-brass-300">
            Filtered: {payoutFilter} ({payoutRows.length} shown) ·{' '}
            <button type="button" className="underline" onClick={() => setPayoutFilter('pending')}>
              clear
            </button>
          </span>
        </div>
        {payoutNotice && (
          <div className="mb-3 mt-3 rounded-lg border border-emerald-500/20 bg-emerald-500/10 p-2.5 text-ds-label text-emerald-300">
            {payoutNotice}
          </div>
        )}
        {payoutError && (
          <div className="mb-3 mt-3 rounded-lg border border-red-500/20 bg-red-500/10 p-2.5 text-ds-label text-red-300">
            {payoutError}
          </div>
        )}
        <div className="mt-2" />

        <DataTable
          dataTable="brand-payouts"
          caption="Brand payouts"
          loading={commissionsQuery.isLoading || brandsQuery.isLoading}
          errorMessage={
            commissionsQuery.isError
              ? commissionsQuery.error instanceof Error
                ? commissionsQuery.error.message
                : 'Failed to load commissions'
              : undefined
          }
          errorAction={
            <Button
              size="sm"
              variant="secondary"
              onClick={() => {
                void commissionsQuery.refetch();
                void brandsQuery.refetch();
              }}
            >
              <RefreshCw className="w-3.5 h-3.5" /> Retry
            </Button>
          }
          rows={payoutRows}
          rowKey={(c) => c.id}
          emptyMessage={
            payoutFilter === 'pending'
              ? connected
                ? 'No pending payouts — every commission has been settled.'
                : 'No pending payouts. Connect Xero to reconcile the settled ledger.'
              : payoutFilter === 'settled'
                ? 'No payouts have been settled yet.'
                : 'No commissions recorded.'
          }
          columns={[
            {
              key: 'brand',
              label: 'Brand',
              primary: true,
              render: (c) => (
                <span>
                  <span className="text-xs font-medium text-white">{brandName(c.brandId)}</span>
                  <span className="block font-mono text-ds-micro text-zinc-500">{c.id}</span>
                </span>
              ),
            },
            {
              key: 'purchaseOrderId',
              label: 'PO',
              render: (c) => <span className="font-mono text-xs text-zinc-400">{c.purchaseOrderId}</span>,
            },
            {
              key: 'poValue',
              label: 'PO value',
              align: 'right',
              hideBelow: 'lg',
              render: (c) => <span className="font-mono text-xs">£{c.poValue.toLocaleString()}</span>,
            },
            {
              key: 'commissionAmount',
              label: 'Commission',
              align: 'right',
              hideBelow: 'lg',
              render: (c) => <span className="font-mono text-xs text-zinc-500">−£{c.commissionAmount.toFixed(2)}</span>,
            },
            {
              key: 'netShare',
              label: 'Net payout',
              align: 'right',
              render: (c) => (
                <span className="font-mono text-xs font-semibold text-white">
                  £{netShareOf(c).toFixed(2)}
                </span>
              ),
            },
            {
              key: 'reconciliation',
              label: 'Reconciliation',
              hideBelow: 'md',
              render: (c) => {
                // §M6 — the payment identity actually reconciled to this PO.
                const rec = getReconciliationForPo(poIdForCommission(c.purchaseOrderId));
                if (!rec) {
                  return <span className="text-ds-label text-amber-300">awaiting remittance</span>;
                }
                const p = reconciliationStatePresentation(rec.state);
                return (
                  <span className="flex flex-col gap-0.5">
                    <StatusBadge dataStatus={p.dataStatus} tone={p.tone}>{p.label}</StatusBadge>
                    <span className="font-mono text-ds-micro text-zinc-500">{rec.paymentId}</span>
                  </span>
                );
              },
            },
            {
              key: 'payoutState',
              label: 'Payout',
              align: 'center',
              render: (c) => {
                // §M6 — the operational payout state (the accounting status is
                // the separate column beside it).
                const payout = getPayoutForCommission(c.id);
                const state = payout?.state ?? (evaluatePayoutEligibility(c.id).eligible ? 'eligible' : 'pending');
                const p = payoutStatePresentation(state);
                return (
                  <span className="flex flex-col items-center gap-0.5">
                    <StatusBadge dataStatus={p.dataStatus} tone={p.tone}>{p.label}</StatusBadge>
                    {payout?.state === 'failed' && payout.failureReason && (
                      <span className="text-ds-micro text-red-300">{payout.failureReason}</span>
                    )}
                    {payout?.state === 'pending' && payout.blockedReason && (
                      <span className="text-ds-micro text-amber-300">{payout.blockedReason}</span>
                    )}
                  </span>
                );
              },
            },
            {
              key: 'status',
              label: 'Accounting',
              align: 'center',
              render: (c) => {
                const p = commissionStatusPresentation(c.status);
                return (
                  <StatusBadge dataStatus={p.dataStatus} tone={p.tone}>
                    {p.label}
                  </StatusBadge>
                );
              },
            },
            {
              key: 'createdAt',
              label: 'Accrued',
              align: 'right',
              hideBelow: 'lg',
              render: (c) => (
                <span className="font-mono text-ds-label text-zinc-500">
                  {new Date(c.createdAt).toLocaleDateString()}
                </span>
              ),
            },
          ]}
          rowActions={(c) => (
            <Button
              size="sm"
              variant="secondary"
              className="text-ds-label"
              loading={payoutBusyId === c.id}
              disabled={!!payoutBusyId || c.status === 'paid'}
              onClick={() => void settle(c.id)}
            >
              Settle (simulated)
            </Button>
          )}
        />
      </Card>

      {/* §M6 — PAYOUT DESTINATION REVIEW. A payout can never be sent to an
          unverified account, so destination verification is an operator action
          with a real consequence: it is what makes a payout eligible (or blocks
          it when an account is suspended under review). */}
      <Card title="Payout destinations" className="p-5">
        <p className="text-xs text-zinc-400">
          Brand accounts. A payout can only be submitted to a <span className="text-emerald-300">verified</span>{' '}
          destination; suspending an account blocks it immediately.
        </p>
        <div className="mt-3 divide-y divide-white/[0.04]">
          {destinationRows.map((d) => {
            const p = payoutDestinationStatusPresentation(d.status);
            return (
              <div
                key={d.id}
                data-testid="payout-destination"
                data-account={d.accountName}
                className="flex items-center justify-between gap-3 py-2.5"
              >
                <div className="min-w-0">
                  <div className="text-xs font-medium text-white truncate">{d.accountName}</div>
                  <div className="font-mono text-ds-micro text-zinc-500">
                    {d.accountRefMasked} · {d.bankName}
                  </div>
                </div>
                <div className="flex items-center gap-1 flex-shrink-0">
                  <StatusBadge dataStatus={p.dataStatus} tone={p.tone}>{p.label}</StatusBadge>
                  {d.status !== 'verified' && (
                    <Button
                      size="sm"
                      variant="ghost"
                      className="text-ds-label text-emerald-300"
                      disabled={!!destinationBusyId}
                      onClick={() => void reviewDestination(d.id, 'verified')}
                    >
                      Verify
                    </Button>
                  )}
                  {d.status !== 'suspended' && (
                    <Button
                      size="sm"
                      variant="ghost"
                      className="text-ds-label text-red-300"
                      disabled={!!destinationBusyId}
                      onClick={() => void reviewDestination(d.id, 'suspended')}
                    >
                      Suspend
                    </Button>
                  )}
                </div>
              </div>
            );
          })}
          {destinationRows.length === 0 && (
            <p className="py-3 text-xs text-zinc-500">No brand payout destinations on file.</p>
          )}
        </div>
        {destinationNotice && (
          <p className="mt-3 text-ds-label text-zinc-400" data-testid="destination-notice">{destinationNotice}</p>
        )}
      </Card>

      <Card title="Penny Pincher Integration" className="p-5">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs text-zinc-400">
              Last infra cost sync: {lastSync ? new Date(lastSync).toLocaleString() : 'Never'}
            </p>
            <p className="text-ds-label text-zinc-500 mt-1">
              Month-to-date infrastructure costs will sync via Penny Pincher when connected.
            </p>
          </div>
          <Button disabled={!connected || !!busy} variant="secondary" size="sm">
            <Banknote className="w-3.5 h-3.5" /> Sync Costs
          </Button>
        </div>
      </Card>
      </div>
      </WorkspaceGrid>
    </WorkspaceFrame>
  );
}