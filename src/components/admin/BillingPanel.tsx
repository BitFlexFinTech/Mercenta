import { useMemo, useState } from 'react';
import { useIntegrations } from '@/integrations/IntegrationsContext';
import { useBrands, useCommissions, useSubscriptions, useShippingMargins, useDeductions } from '@/data/queries';
import { generateInvoice } from '@/lib/billing/invoice';
import { generateRemittanceStatement } from '@/lib/billing/remittance';
import { downloadCsv } from '@/lib/csv';
import { DemoBanner } from '@/components/shared/DemoBanner';
import {
  ContextPanel,
  MetricBand,
  RecordFieldList,
  SegmentedControl,
  WorkspaceFrame,
  WorkspaceHeader,
  type MetricTileData,
} from '@/components/shared/workspace';
import { Badge, Button, Card } from '@/components/ui';
import { cn } from '@/utils/cn';
import { CreditCard, FlaskConical } from 'lucide-react';

export function BillingPanel() {
  const { integrations } = useIntegrations();
  const stripe = integrations.stripe;
  const stripeLive = stripe?.status === 'connected' && !stripe.sandbox;

  const brandsQuery = useBrands();
  const subsQuery = useSubscriptions();
  const commQuery = useCommissions();
  const marginsQuery = useShippingMargins();
  const deductionsQuery = useDeductions();

  const deductionTotals = useMemo(function() {
    const rows = deductionsQuery.data?.data ?? [];
    return { rows: rows, open: rows.filter(function(d) { return d.status === 'open'; }).reduce(function(a, d) { return a + d.amountGbp; }, 0), disputed: rows.filter(function(d) { return d.status === 'disputed'; }).reduce(function(a, d) { return a + d.amountGbp; }, 0), applied: rows.filter(function(d) { return d.status === 'accepted' || d.status === 'resolved'; }).reduce(function(a, d) { return a + d.amountGbp; }, 0) };
  }, [deductionsQuery.data]);

  /* §Sprint — real filtering over the same rows (no second data source). */
  const [focus, setFocus] = useState<'all' | 'subscriptions' | 'commissions' | 'deductions'>('all');
  const allBrands = useMemo(() => brandsQuery.data?.data ?? [], [brandsQuery.data]);
  const visibleBrands = useMemo(
    () =>
      allBrands.filter((b) => {
        if (focus === 'all') return true;
        if (focus === 'subscriptions') {
          const sub = (subsQuery.data?.data ?? []).find((s) => s.brandId === b.id);
          return !!sub && sub.status === 'active';
        }
        if (focus === 'commissions') return (commQuery.data?.data ?? []).some((c) => c.brandId === b.id);
        return deductionTotals.rows.some((d) => d.brandId === b.id);
      }),
    [allBrands, focus, subsQuery.data, commQuery.data, deductionTotals]
  );

  const periodTotals = useMemo(
    () => ({
      invoiced: allBrands.reduce((a, b, i) => {
        const sub = (subsQuery.data?.data ?? []).find((s) => s.brandId === b.id);
        const inv = generateInvoice({
          brand: b,
          periodStart: '2026-08-01',
          periodEnd: '2026-08-31',
          sequence: i + 1,
          subscription: sub && sub.status === 'active' ? { planTier: sub.planTier, monthlyFee: sub.monthlyFee } : undefined,
          commissions: (commQuery.data?.data ?? []).filter((c) => c.brandId === b.id),
        });
        return a + inv.subtotalGbp;
      }, 0),
      shipping: (marginsQuery.data?.data ?? []).reduce((a, m) => a + (m.brandBilledPrice - m.carrierCostPrice), 0),
      deductions: deductionTotals.rows.reduce((a, d) => a + d.amountGbp, 0),
      activeSubs: (subsQuery.data?.data ?? []).filter((s) => s.status === 'active').length,
    }),
    [allBrands, subsQuery.data, commQuery.data, marginsQuery.data, deductionTotals]
  );

  const metrics: MetricTileData[] = [
    {
      id: 'billing-invoiced',
      label: 'Invoiced (period)',
      value: '£' + periodTotals.invoiced.toFixed(2),
      size: 'hero',
      tone: 'info',
      statusText: allBrands.length + ' brands',
      context: 'Subscription + commission subtotal, Aug 2026',
      domain: 'finance',
      onOpen: () => setFocus('all'),
      testId: 'billing-metric-invoiced',
    },
    {
      id: 'billing-subs',
      label: 'Active subscriptions',
      value: String(periodTotals.activeSubs),
      tone: periodTotals.activeSubs > 0 ? 'success' : 'neutral',
      statusText: stripeLive ? 'Stripe live' : 'Stripe (Mock)',
      context: 'Flat monthly fee — Stripe is never a payout rail',
      domain: 'catalogue',
      onOpen: () => setFocus('subscriptions'),
      testId: 'billing-metric-subs',
    },
    {
      id: 'billing-shipping',
      label: 'Shipping margin',
      value: '£' + periodTotals.shipping.toFixed(2),
      tone: periodTotals.shipping >= 0 ? 'success' : 'danger',
      statusText: periodTotals.shipping >= 0 ? 'Positive' : 'Negative',
      context: 'Brand-billed price less carrier cost',
      domain: 'logistics',
      onOpen: () => setFocus('commissions'),
      testId: 'billing-metric-shipping',
    },
    {
      id: 'billing-deductions',
      label: 'Deductions',
      value: '£' + periodTotals.deductions.toFixed(2),
      tone: periodTotals.deductions > 0 ? 'warning' : 'success',
      statusText: deductionTotals.rows.length + ' posted',
      context: 'Chargebacks netted against the remittance',
      domain: 'compliance',
      onOpen: () => setFocus('deductions'),
      testId: 'billing-metric-deductions',
    },
  ];


  return (
    <WorkspaceFrame className="space-y-4">
      <DemoBanner />
      {!stripeLive && (<div className="bg-amber-500/10 border border-amber-500/20 rounded-ds-md p-3 text-ds-label text-state-warning flex items-start gap-2"><FlaskConical className="w-3.5 h-3.5 mt-0.5 flex-shrink-0" /><span>Stripe runs in <strong>(Mock) mode</strong> &mdash; subscription ids are simulated (<code>mock:sub-&hellip;</code>) and nothing is billed. Stripe is never a payout rail.</span></div>)}

      {/* §Sprint — workspace header + interactive metric band over the SAME
          canonical billing functions; the metric tiles are real drill-downs
          (each one narrows the brand list below). */}
      <WorkspaceHeader
        eyebrow="Admin Hub · Finance"
        title="Billing"
        description="Brand Subscriptions, commission invoices and remittance statements. Gross PO value − commission − deductions = net paid per payout period."
        meta={
          <>
            <span className="font-mono text-ds-label text-zinc-500">Period 2026-08-01 → 2026-08-31</span>
            <span className="font-mono text-ds-label text-zinc-500">Showing {visibleBrands.length} of {allBrands.length} brands</span>
          </>
        }
        actions={<div className="flex items-center gap-2"><CreditCard className="w-4 h-4 text-emerald-400" aria-hidden="true" /></div>}
        toolbar={
          <SegmentedControl
            ariaLabel="Billing focus"
            active={focus}
            onSelect={(v) => setFocus(v as 'all' | 'subscriptions' | 'commissions' | 'deductions')}
            items={[
              { id: 'all', label: 'All brands', count: allBrands.length },
              { id: 'subscriptions', label: 'Subscriptions', count: periodTotals.activeSubs },
              { id: 'commissions', label: 'Commission' },
              { id: 'deductions', label: 'Deductions', count: deductionTotals.rows.length },
            ]}
          />
        }
      />

      <MetricBand items={metrics} columns={4} loading={brandsQuery.isLoading} />

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-[minmax(0,1fr)_300px]">
        <div className="min-w-0 space-y-4">
      <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4">
        {visibleBrands.map(function(b) {
          const sub = (subsQuery.data?.data ?? []).find(function(s) { return s.brandId === b.id; });
          const brandComms = (commQuery.data?.data ?? []).filter(function(c) { return c.brandId === b.id; });
          const brandMargins = (marginsQuery.data?.data ?? []).filter(function(m) { return m.brandId === b.id; });
          const brandDeductions = deductionTotals.rows.filter(function(d) { return d.brandId === b.id; });
          const inv = generateInvoice({ brand: b, periodStart: '2026-08-01', periodEnd: '2026-08-31', sequence: (brandsQuery.data?.data ?? []).indexOf(b) + 1, subscription: sub && sub.status === 'active' ? { planTier: sub.planTier, monthlyFee: sub.monthlyFee } : undefined, commissions: brandComms });
          const marginTotal = brandMargins.reduce(function(a, m) { return a + (m.brandBilledPrice - m.carrierCostPrice); }, 0);
          const deductionsTotal = brandDeductions.reduce(function(a, d) { return a + d.amountGbp; }, 0);
          return (<Card key={b.id} className="p-0 overflow-hidden">
            <div className="px-4 py-3 border-b border-hairline flex items-center justify-between">
              <span className="text-sm font-medium text-strong">{b.profile.businessName}</span>
              {sub && <Badge className={cn('text-ds-micro', sub.status === 'active' ? 'bg-emerald-500/15 text-emerald-300' : 'bg-zinc-500/15 text-zinc-400')}>{sub.planTier}</Badge>}
            </div>
            <div className="p-4 space-y-2">
              <div className="flex items-center justify-between text-ds-label"><span className="text-zinc-500">Invoice</span><span className="font-mono text-zinc-200">&pound;{inv.subtotalGbp.toFixed(2)} <span className="text-zinc-500 text-ds-micro">{inv.number}</span></span></div>
              <div className="flex items-center justify-between text-ds-label"><span className="text-zinc-500">Shipping</span><span className={cn('font-mono', marginTotal >= 0 ? 'text-emerald-300' : 'text-red-300')}>&pound;{marginTotal.toFixed(2)}</span></div>
              <div className="flex items-center justify-between text-ds-label"><span className="text-zinc-500">Deductions</span><span className="font-mono text-red-300">&pound;{deductionsTotal.toFixed(2)}</span></div>
              {inv.notes.length > 0 && <p className="text-ds-micro text-zinc-600">{inv.notes.join(' &middot; ')}</p>}
            </div>
            <div className="px-4 py-2 border-t border-hairline flex justify-end">
              <Button variant="ghost" className="text-ds-micro" disabled={brandComms.length === 0}
                onClick={function() { downloadCsv('commission-'.concat(b.id).concat('.csv'), ['PO','Gross','Commission','Status'], brandComms.map(function(c) { return [c.purchaseOrderId, String(c.poValue), String(c.commissionAmount), c.status]; })); }}>Export CSV</Button>
            </div>
          </Card>);
        })}
      </div>

      <Card title="Remittance Statements &mdash; Current Period">
        <div className="space-y-2">{visibleBrands.map(function(b) {
          const brandComms = (commQuery.data?.data ?? []).filter(function(c) { return c.brandId === b.id; });
          const brandLineItems = brandComms.map(function(c) { return ({ poNumber: c.purchaseOrderId, grossValue: c.poValue, commission: c.commissionAmount, deductions: deductionTotals.rows.filter(function(d) { return d.brandId === b.id && d.purchaseOrderId === c.purchaseOrderId; }).map(function(d) { return ({ type: d.type, amountGbp: d.amountGbp }); }), }); });
          const stmt = generateRemittanceStatement({ brandName: b.profile.businessName, periodStart: '2026-08-01', periodEnd: '2026-08-31', statementNumber: 'RS-2026-08-' + b.id.slice(0, 8), lines: brandLineItems });
          const empty = stmt.lines.length === 0;
          return (<div key={b.id} className="flex items-center justify-between bg-tint border border-hairline rounded-ds-md px-4 py-2.5">
            <div><div className="text-xs font-medium text-strong">{b.profile.businessName}</div><div className="text-ds-micro text-zinc-500 font-mono">{stmt.statementNumber} &middot; net paid <span className={empty ? 'text-zinc-600' : 'text-emerald-300'}>&pound;{stmt.netPaid.toFixed(2)}</span>{empty && ' &middot; no settled POs'}</div></div>
            <Button variant="ghost" className="text-ds-label text-brass" disabled={empty}
              onClick={function() { const w = window.open('', '_blank'); if (w) { w.document.write(stmt.html); w.document.close(); } }}>View statement</Button>
          </div>);})}
        </div>
        <p className="text-ds-micro text-zinc-600 mt-3">Gross PO value &minus; commission &minus; deductions = net paid per payout period.</p>
      </Card>
        </div>
        <div className="space-y-3">
          <ContextPanel title="How billing works">
            <p className="text-ds-label leading-snug text-zinc-400">
              Every figure above comes from the canonical billing functions
              (<code>generateInvoice</code>, <code>generateRemittanceStatement</code>) over the same
              stores the finance workflow writes — nothing is re-derived for this screen.
            </p>
          </ContextPanel>
          <ContextPanel title="Period summary">
            <RecordFieldList
              fields={[
                { label: 'Brands', value: String(allBrands.length) },
                { label: 'Invoiced', value: '£' + periodTotals.invoiced.toFixed(2) },
                { label: 'Shipping margin', value: '£' + periodTotals.shipping.toFixed(2) },
                { label: 'Deductions', value: '£' + periodTotals.deductions.toFixed(2) },
                { label: 'Active subscriptions', value: String(periodTotals.activeSubs) },
                { label: 'Stripe', value: stripeLive ? 'Live' : '(Mock)' },
              ]}
            />
          </ContextPanel>
          <ContextPanel title="Payout rails">
            <p className="text-ds-label leading-snug text-zinc-400">
              Payoneer is the default payout rail and Wise the secondary. Stripe bills the flat
              subscription only and is explicitly refused as a payout rail, as is Xero. No payout
              leaves Mercenta without explicit human approval.
            </p>
          </ContextPanel>
        </div>
      </div>
    </WorkspaceFrame>
  );
}
