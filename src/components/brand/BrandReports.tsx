/**
 * Batch 35 Brand Reports with Recharts, CSV export, period selector.
 */
import { useMemo, useState } from 'react';
import { useApp } from '@/context/GlobalStateContext';
import { usePurchaseOrders } from '@/data/queries';
import { assertBrandScope } from '@/lib/auth/rbac';
import { downloadCsv } from '@/lib/csv';
import { Badge, Button, Card } from '@/components/ui';
import { cn } from '@/utils/cn';
import { TrendingUp, TrendingDown, Package, DollarSign, BarChart3, ShoppingCart, X, Download, Calendar } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

type Period = 30 | 60 | 90;
const BRASS = '#D4A853';
const EMERALD = '#10B981';
const ZINC = '#52525B';
const CHART_TT = { backgroundColor: '#1A1A20', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '8px', fontSize: '11px', color: '#E4E4E7' };

export function BrandReports({ onNavigate }: { onNavigate?: (view: string) => void }) {
  const { session, brandProfile, products } = useApp();
  const poQuery = usePurchaseOrders();
  const [drillCard, setDrillCard] = useState<string | null>(null);
  const [period, setPeriod] = useState<Period>(90);
  const pos = useMemo(() => assertBrandScope(session, poQuery.data?.data ?? []), [session, poQuery.data]);
  const cutoff = new Date(Date.now() - period * 864e5).toISOString().slice(0, 10);
  const rp = pos.filter((p) => p.orderDate >= cutoff);
  const openPOs = rp.filter((p) => ['received', 'under_review', 'accepted', 'ready_to_fulfil'].includes(p.status));
  const deliveredPOs = rp.filter((p) => p.status === 'delivered');
  const shippedPOs = rp.filter((p) => p.status === 'shipped');
  const totalLines = rp.reduce((s, p) => s + p.lineItems.length, 0);
  const confirmedLines = rp.reduce((s, p) => s + p.lineItems.filter((l) => l.ackStatus === 'accepted' || l.ackStatus === 'backordered').length, 0);
  const asinRate = totalLines > 0 ? Math.round((confirmedLines / totalLines) * 100) : 0;
  const outOfStock = products.filter((p) => p.isAvailable === false).length;
  const totalValueShipped = [...shippedPOs, ...deliveredPOs].reduce((s, p) => s + p.poValue, 0);
  const totalUnitsShipped = [...shippedPOs, ...deliveredPOs].reduce((s, p) => s + p.lineItems.reduce((sl, li) => sl + li.quantity, 0), 0);
  const netPPM = totalUnitsShipped > 0 ? Math.round((totalValueShipped / totalUnitsShipped) * 1000) : 0;
  const openPOQty = openPOs.reduce((s, p) => s + p.lineItems.reduce((sl, li) => sl + li.quantity, 0), 0);
  const onHandInv = products.reduce((s, p) => s + (p.unitsPerCase ?? 1) * 10, 0);

  const dispatchChart = useMemo(() => {
    const b = new Map<string, number>();
    for (const po of [...shippedPOs, ...deliveredPOs]) {
      const key = po.orderDate.slice(0, 7);
      b.set(key, (b.get(key) ?? 0) + po.lineItems.reduce((sl, li) => sl + li.quantity, 0));
    }
    return [...b].sort((a, b) => a[0].localeCompare(b[0])).slice(-6).map(([month, units]) => ({ month, units }));
  }, [shippedPOs, deliveredPOs]);

  const salesChart = useMemo(() => {
    const b = new Map<string, number>();
    for (const po of [...shippedPOs, ...deliveredPOs]) {
      const key = po.orderDate.slice(0, 7);
      b.set(key, (b.get(key) ?? 0) + po.poValue);
    }
    return [...b].sort((a, b) => a[0].localeCompare(b[0])).slice(-6).map(([month, value]) => ({ month, value }));
  }, [shippedPOs, deliveredPOs]);

  const metrics = [
    { label: 'ASIN Confirmation Rate', value: asinRate + '%', icon: BarChart3, trend: totalLines > 0 ? confirmedLines + '/' + totalLines + ' lines' : 'No data', trendUp: asinRate >= 80 },
    { label: 'Sourceable Products OOS', value: String(outOfStock), icon: Package, trend: 'of ' + products.length + ' total SKUs', trendUp: outOfStock === 0 },
    { label: 'Open PO Quantity', value: String(openPOQty), icon: ShoppingCart, trend: openPOs.length + ' open POs', trendUp: false },
    { label: 'On-Hand Inventory (est.)', value: String(onHandInv), icon: Package, trend: 'Estimated units', trendUp: true },
    { label: 'Net PPM', value: '\u00a3' + netPPM.toLocaleString(), icon: DollarSign, trend: 'Per 1000 units shipped', trendUp: netPPM > 500 },
  ];
  const poStatuses = ['received', 'under_review', 'accepted', 'ready_to_fulfil', 'shipped', 'delivered', 'rejected'] as const;

  if (pos.length === 0) {
    return (
      <div className="p-6 max-w-[1400px] mx-auto">
        <Card title="Reports">
          <p className="text-xs text-zinc-600">No purchase orders yet for {brandProfile.businessName || 'your brand'} in the selected period.</p>
        </Card>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6 max-w-[1400px] mx-auto">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div className="flex items-center gap-3">
          <BarChart3 className="w-5 h-5 text-brass-400" />
          <div>
            <h2 className="text-lg font-semibold text-white">Reports</h2>
            <p className="text-xs text-zinc-500 mt-0.5">
              Performance metrics for {brandProfile.businessName || 'your brand'}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex bg-ink-850 border border-white/[0.06] rounded-lg overflow-hidden">
            {([30, 60, 90] as Period[]).map((p) => (
              <button key={p} onClick={() => setPeriod(p)}
                className={cn('px-3 py-1.5 text-[11px] font-medium transition-colors',
                  period === p ? 'bg-brass-500/20 text-brass-400' : 'text-zinc-500 hover:text-zinc-300')}>
                {p}d
              </button>
            ))}
          </div>
          <Button className="text-[10px]" onClick={() => {
            const csv = [['PO','Status','Value','Units','ASIN Rate']];
            for (const po of rp) {
              const units = po.lineItems.reduce((s,l) => s + l.quantity, 0);
              csv.push([po.poNumber, po.status, String(po.poValue), String(units), String(asinRate)+'%']);
            }
            downloadCsv('brand-reports.csv', csv[0], csv.slice(1).map(r => r.join(',')).join('\\n'));
          }}>
            <Download className="w-3 h-3 mr-1" /> Export CSV
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
        {metrics.map((m) => {
          const Icon = m.icon;
          return (
            <button key={m.label} type="button" onClick={() => setDrillCard(m.label)}
              className="bg-ink-850 border border-white/[0.06] hover:border-white/[0.12] rounded-xl p-4 text-left transition-all">
              <div className="flex items-center gap-2 mb-2">
                <Icon className="w-4 h-4 text-zinc-500" />
                <span className="text-[10px] text-zinc-500 font-medium">{m.label}</span>
              </div>
              <div className="text-xl font-bold text-white">{m.value}</div>
              <div className="flex items-center gap-1 mt-1">
                <span className={cn('text-[10px]', m.trendUp ? 'text-emerald-400' : 'text-zinc-500')}>{m.trend}</span>
              </div>
            </button>
          );
        })}
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card title="Sales Trend (shipped)" subtitle="Monthly PO value shipped">
          {salesChart.length > 0 ? (
            <div className="h-52">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={salesChart}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" vertical={false} />
                  <XAxis dataKey="month" stroke={ZINC} fontSize={11} tickLine={false} axisLine={false} />
                  <YAxis stroke={ZINC} fontSize={11} tickLine={false} axisLine={false} tickFormatter={(v) => '\\u00a3' + (v/1000).toFixed(0) + 'k'} />
                  <Tooltip contentStyle={CHART_TT} formatter={(v: number) => ['\\u00a3' + v.toLocaleString(), 'Shipped Value']} />
                  <Bar dataKey="value" fill={BRASS} radius={[4,4,0,0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          ) : <p className="text-xs text-zinc-600 text-center py-8">No shipped POs in this period.</p>}
        </Card>
        <Card title="Dispatch Volume (shipped)" subtitle="Monthly units shipped">
          {dispatchChart.length > 0 ? (
            <div className="h-52">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={dispatchChart}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" vertical={false} />
                  <XAxis dataKey="month" stroke={ZINC} fontSize={11} tickLine={false} axisLine={false} />
                  <YAxis stroke={ZINC} fontSize={11} tickLine={false} axisLine={false} />
                  <Tooltip contentStyle={CHART_TT} formatter={(v: number) => [v.toLocaleString() + ' units', 'Dispatched']} />
                  <Bar dataKey="units" fill={EMERALD} radius={[4,4,0,0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          ) : <p className="text-xs text-zinc-600 text-center py-8">No shipped POs in this period.</p>}
        </Card>
      </div>

      {/* PO Status Distribution */}
      <Card title="PO Status Distribution" subtitle="All POs in selected period">
        <div className="flex flex-wrap gap-2">
          {poStatuses.map((s) => {
            const count = rp.filter((p) => p.status === s).length;
            const pct = rp.length > 0 ? Math.round((count/rp.length)*100) : 0;
            if (count === 0) return null;
            return (
              <div key={s} className="bg-ink-850 border border-white/[0.06] rounded-lg px-3 py-2 text-center min-w-[80px]">
                <div className="text-lg font-bold text-white">{count}</div>
                <div className="text-[9px] text-zinc-500 capitalize">{s.replace(/_/g, ' ')}</div>
                <div className="text-[9px] text-zinc-600">{pct}%</div>
              </div>
            );
          })}
        </div>
      </Card>

      {/* Drill-down modal */}
      {drillCard && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm" onClick={() => setDrillCard(null)}>
          <div className="bg-ink-850 border border-white/[0.08] rounded-xl w-full max-w-lg max-h-[80vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between px-5 py-4 border-b border-white/[0.06]">
              <h3 className="text-sm font-semibold text-white">{drillCard}</h3>
              <button onClick={() => setDrillCard(null)} className="text-zinc-500 hover:text-white"><X className="w-4 h-4" /></button>
            </div>
            <div className="px-5 py-4 space-y-3">
              {drillCard === 'ASIN Confirmation Rate' && (
                <div className="space-y-2">
                  <p className="text-xs text-zinc-400">{confirmedLines} of {totalLines} lines confirmed ({asinRate}%)</p>
                  <div className="h-2 bg-white/[0.06] rounded-full overflow-hidden">
                    <div className="h-full bg-brass-500 rounded-full transition-all" style={{ width: asinRate + '%' }} />
                  </div>
                </div>
              )}
              {drillCard === 'Sourceable Products OOS' && (
                <div className="space-y-2">
                  <p className="text-xs text-zinc-400">{outOfStock} of {products.length} products out of stock</p>
                  {products.filter((p) => !p.isAvailable).map((p) => (
                    <div key={p.sku} className="flex items-center justify-between text-xs border-b border-white/[0.04] py-1">
                      <span className="text-zinc-300">{p.name}</span>
                      <span className="text-zinc-500 font-mono">{p.sku}</span>
                    </div>
                  ))}
                </div>
              )}
              {drillCard === 'Open PO Quantity' && (
                <div className="space-y-2">
                  <p className="text-xs text-zinc-400">{openPOQty} units across {openPOs.length} open POs</p>
                  {openPOs.map((po) => (
                    <div key={po.id} className="flex items-center justify-between text-xs border-b border-white/[0.04] py-1">
                      <span className="text-zinc-300">{po.poNumber}</span>
                      <span className="text-zinc-500 font-mono">{po.lineItems.reduce((s,l) => s + l.quantity, 0)} units</span>
                    </div>
                  ))}
                </div>
              )}
              {drillCard === 'Net PPM' && (
                <div className="text-center py-4">
                  <p className="text-3xl font-bold text-brass-400 font-mono">\\u00a3{netPPM.toLocaleString()}</p>
                  <p className="text-xs text-zinc-500 mt-2">Per 1000 units shipped</p>
                </div>
              )}
              {drillCard === 'On-Hand Inventory (est.)' && (
                <div className="space-y-2">
                  <p className="text-xs text-zinc-400">Estimated {onHandInv} units on hand</p>
                  <p className="text-[10px] text-zinc-600">Calculated from case-pack x 10 per SKU</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
