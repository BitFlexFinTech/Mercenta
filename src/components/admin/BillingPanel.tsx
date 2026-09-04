import { useMemo } from 'react';
import { useIntegrations } from '@/integrations/IntegrationsContext';
import { useBrands, useCommissions, useSubscriptions, useShippingMargins, useDeductions } from '@/data/queries';
import { generateInvoice } from '@/lib/billing/invoice';
import { generateRemittanceStatement } from '@/lib/billing/remittance';
import { downloadCsv } from '@/lib/csv';
import { DemoBanner } from '@/components/shared/DemoBanner';
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

  return (
    <div className="p-6 space-y-4 max-w-[1400px] mx-auto">
      <DemoBanner />
      {!stripeLive && (<div className="bg-amber-500/10 border border-amber-500/20 rounded-lg p-3 text-[11px] text-amber-200 flex items-start gap-2"><FlaskConical className="w-3.5 h-3.5 mt-0.5 flex-shrink-0" /><span>Stripe runs in <strong>(Mock) mode</strong> &mdash; subscription ids are simulated (<code>mock:sub-&hellip;</code>) and nothing is billed.</span></div>)}
      <div className="flex items-center gap-3"><CreditCard className="w-5 h-5 text-emerald-400" /><div><h2 className="text-lg font-semibold text-white">Billing Panel</h2><p className="text-xs text-zinc-500 mt-0.5">Brand Subscriptions, commissions, and remittance statements</p></div></div>

      <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4">
        {(brandsQuery.data?.data ?? []).map(function(b) {
          const sub = (subsQuery.data?.data ?? []).find(function(s) { return s.brandId === b.id; });
          const brandComms = (commQuery.data?.data ?? []).filter(function(c) { return c.brandId === b.id; });
          const brandMargins = (marginsQuery.data?.data ?? []).filter(function(m) { return m.brandId === b.id; });
          const brandDeductions = deductionTotals.rows.filter(function(d) { return d.brandId === b.id; });
          const inv = generateInvoice({ brand: b, periodStart: '2026-08-01', periodEnd: '2026-08-31', sequence: (brandsQuery.data?.data ?? []).indexOf(b) + 1, subscription: sub && sub.status === 'active' ? { planTier: sub.planTier, monthlyFee: sub.monthlyFee } : undefined, commissions: brandComms });
          const marginTotal = brandMargins.reduce(function(a, m) { return a + (m.brandBilledPrice - m.carrierCostPrice); }, 0);
          const deductionsTotal = brandDeductions.reduce(function(a, d) { return a + d.amountGbp; }, 0);
          return (<Card key={b.id} className="p-0 overflow-hidden">
            <div className="px-4 py-3 border-b border-white/[0.06] flex items-center justify-between">
              <span className="text-sm font-medium text-white">{b.profile.businessName}</span>
              {sub && <Badge className={cn('text-[9px]', sub.status === 'active' ? 'bg-emerald-500/15 text-emerald-300' : 'bg-zinc-500/15 text-zinc-400')}>{sub.planTier}</Badge>}
            </div>
            <div className="p-4 space-y-2">
              <div className="flex items-center justify-between text-[11px]"><span className="text-zinc-500">Invoice</span><span className="font-mono text-zinc-200">&pound;{inv.subtotalGbp.toFixed(2)} <span className="text-zinc-500 text-[10px]">{inv.number}</span></span></div>
              <div className="flex items-center justify-between text-[11px]"><span className="text-zinc-500">Shipping</span><span className={cn('font-mono', marginTotal >= 0 ? 'text-emerald-300' : 'text-red-300')}>&pound;{marginTotal.toFixed(2)}</span></div>
              <div className="flex items-center justify-between text-[11px]"><span className="text-zinc-500">Deductions</span><span className="font-mono text-red-300">&pound;{deductionsTotal.toFixed(2)}</span></div>
              {inv.notes.length > 0 && <p className="text-[9px] text-zinc-600">{inv.notes.join(' &middot; ')}</p>}
            </div>
            <div className="px-4 py-2 border-t border-white/[0.06] flex justify-end">
              <Button variant="ghost" className="text-[10px]" disabled={brandComms.length === 0}
                onClick={function() { downloadCsv('commission-'.concat(b.id).concat('.csv'), ['PO','Gross','Commission','Status'], brandComms.map(function(c) { return [c.purchaseOrderId, String(c.poValue), String(c.commissionAmount), c.status]; })); }}>Export CSV</Button>
            </div>
          </Card>);
        })}
      </div>

      <Card title="Remittance Statements &mdash; Current Period">
        <div className="space-y-2">{(brandsQuery.data?.data ?? []).map(function(b) {
          const brandComms = (commQuery.data?.data ?? []).filter(function(c) { return c.brandId === b.id; });
          const brandLineItems = brandComms.map(function(c) { return ({ poNumber: c.purchaseOrderId, grossValue: c.poValue, commission: c.commissionAmount, deductions: deductionTotals.rows.filter(function(d) { return d.brandId === b.id && d.purchaseOrderId === c.purchaseOrderId; }).map(function(d) { return ({ type: d.type, amountGbp: d.amountGbp }); }), }); });
          const stmt = generateRemittanceStatement({ brandName: b.profile.businessName, periodStart: '2026-08-01', periodEnd: '2026-08-31', statementNumber: 'RS-2026-08-' + b.id.slice(0, 8), lines: brandLineItems });
          const empty = stmt.lines.length === 0;
          return (<div key={b.id} className="flex items-center justify-between bg-white/[0.02] border border-white/[0.05] rounded-lg px-4 py-2.5">
            <div><div className="text-xs font-medium text-white">{b.profile.businessName}</div><div className="text-[10px] text-zinc-500 font-mono">{stmt.statementNumber} &middot; net paid <span className={empty ? 'text-zinc-600' : 'text-emerald-300'}>&pound;{stmt.netPaid.toFixed(2)}</span>{empty && ' &middot; no settled POs'}</div></div>
            <Button variant="ghost" className="text-[11px] text-brass" disabled={empty}
              onClick={function() { const w = window.open('', '_blank'); if (w) { w.document.write(stmt.html); w.document.close(); } }}>View statement</Button>
          </div>);})}
        </div>
        <p className="text-[10px] text-zinc-600 mt-3">Gross PO value &minus; commission &minus; deductions = net paid per payout period.</p>
      </Card>
    </div>
  );
}
