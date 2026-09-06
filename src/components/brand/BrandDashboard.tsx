/**
 * Batch 37 dashboard with KPI widgets, quick actions, charts.
 * Preserves deductions, revenue chart, MetricCard, activity feed.
 */
import { useState, useMemo } from 'react';
import { useApp } from '@/context/GlobalStateContext';
import { useDeductions, usePurchaseOrders } from '@/data/queries';
import { assertBrandScope } from '@/lib/auth/rbac';
import { Card, Badge } from '@/components/ui';
import { cn } from '@/utils/cn';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { REVENUE_DATA } from '@/data/demoCharts';
import { STAGE_LABELS, STAGE_ORDER } from '@/types';
import type { ShipmentStage } from '@/types';
import { TrendingUp, TrendingDown, Package, Truck, CheckCircle2, Boxes, ClipboardList, ShoppingCart, BarChart3, ArrowRight } from 'lucide-react';

export function BrandDashboard({ onNavigate }: { onNavigate?: (view: string) => void }) {
  const { shipments, activityLogs, brandProfile, financials, complianceDocs, session, products } = useApp();
  const [timeFilter, setTimeFilter] = useState('6M');
  const [activeStage, setActiveStage] = useState<ShipmentStage | null>(null);
  const allDeductions = useDeductions().data?.data ?? [];
  const tenantId = session?.tenantId;
  const deductions = useMemo(() => tenantId ? allDeductions.filter((d) => d.brandId === tenantId) : [], [allDeductions, tenantId]);
  const deductedTotal = useMemo(() => deductions.reduce((a, d) => a + d.amountGbp, 0), [deductions]);
  const poQuery = usePurchaseOrders();
  const pos = useMemo(() => assertBrandScope(session, poQuery.data?.data ?? []), [session, poQuery.data]);
  const openPOs = useMemo(() => pos.filter((p) => ['received', 'under_review', 'accepted', 'ready_to_fulfil'].includes(p.status)), [pos]);
  const shippedPOs = useMemo(() => pos.filter((p) => p.status === 'shipped' || p.status === 'delivered'), [pos]);
  const totalLines = useMemo(() => pos.reduce((s, p) => s + p.lineItems.length, 0), [pos]);
  const confirmedLines = useMemo(() => pos.reduce((s, p) => s + p.lineItems.filter((l) => l.ackStatus === 'accepted' || l.ackStatus === 'backordered').length, 0), [pos]);
  const ackRate = useMemo(() => totalLines > 0 ? Math.round((confirmedLines / totalLines) * 100) : 0, [totalLines, confirmedLines]);
  const openPOValue = useMemo(() => openPOs.reduce((s, p) => s + p.poValue, 0), [openPOs]);
  const outOfStock = useMemo(() => products.filter((p) => p.isAvailable === false).length, [products]);
  const onHandEst = useMemo(() => products.reduce((s, p) => s + (p.unitsPerCase ?? 1) * 10, 0), [products]);
  const totalRevenue = useMemo(() => shipments.reduce((sum, s) => sum + s.value, 0), [shipments]);
  const activeShipments = useMemo(() => shipments.filter((s) => s.status !== 'live_amazon').length, [shipments]);
  const complianceScore = 94.2;
  const stageCounts = useMemo(() => STAGE_ORDER.map((stage) => ({ stage, count: shipments.filter((s) => s.stage === stage).length })), [shipments]);

  return (
    <div className="p-6 space-y-6 max-w-[1400px] mx-auto">
      {/* Quick Actions */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <button onClick={() => onNavigate?.('purchase_orders')} className="bg-ink-850 border border-white/[0.06] hover:border-brass-500/40 rounded-xl p-3 text-left transition-colors">
          <ShoppingCart className="w-4 h-4 text-brass-400 mb-1" />
          <div className="text-xs font-medium text-white">Purchase Orders</div>
          <div className="text-[10px] text-zinc-500">{openPOs.length} open / {shippedPOs.length} shipped</div>
        </button>
        <button onClick={() => onNavigate?.('catalog')} className="bg-ink-850 border border-white/[0.06] hover:border-brass-500/40 rounded-xl p-3 text-left transition-colors">
          <Package className="w-4 h-4 text-brass-400 mb-1" />
          <div className="text-xs font-medium text-white">Catalog</div>
          <div className="text-[10px] text-zinc-500">{products.length} products / {outOfStock} OOS</div>
        </button>
        <button onClick={() => onNavigate?.('compliance')} className="bg-ink-850 border border-white/[0.06] hover:border-brass-500/40 rounded-xl p-3 text-left transition-colors">
          <ClipboardList className="w-4 h-4 text-brass-400 mb-1" />
          <div className="text-xs font-medium text-white">Compliance</div>
          <div className="text-[10px] text-zinc-500">{complianceDocs.length} docs / {complianceScore}%</div>
        </button>
        <button onClick={() => onNavigate?.('reports')} className="bg-ink-850 border border-white/[0.06] hover:border-brass-500/40 rounded-xl p-3 text-left transition-colors">
          <BarChart3 className="w-4 h-4 text-brass-400 mb-1" />
          <div className="text-xs font-medium text-white">Reports</div>
          <div className="text-[10px] text-zinc-500">ASIN {ackRate}% / Net PPM</div>
        </button>
      </div>

      {/* KPI Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
        <MetricCard label="Revenue" value={'\u00a3' + Math.round(totalRevenue / 1000) + 'k'} trend={'\u00a3' + (openPOValue / 1000).toFixed(0) + 'k open PO'} trendUp icon={<Boxes className="w-4 h-4" />} onClick={() => onNavigate?.('reports')} />
        <MetricCard label="Active Shipments" value={String(activeShipments)} trend={openPOs.length + ' open POs'} trendUp icon={<Package className="w-4 h-4" />} onClick={() => onNavigate?.('logistics')} />
        <MetricCard label="Compliance Score" value={complianceScore + '%'} trend={ackRate + '% ack rate'} trendUp={complianceScore > 80} icon={<CheckCircle2 className="w-4 h-4" />} onClick={() => onNavigate?.('compliance')} />
        <MetricCard label="Inventory (est.)" value={String(onHandEst)} trend={outOfStock + ' SKUs OOS'} trendUp={outOfStock === 0} icon={<Truck className="w-4 h-4" />} onClick={() => onNavigate?.('catalog')} />
      </div>

      {/* Dossier */}
      <Card className="p-5">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <div className="text-xs text-zinc-500 uppercase tracking-wider">Active Dossier</div>
            <div className="text-lg font-semibold text-white mt-0.5">{brandProfile.businessName || 'No profile loaded'}</div>
            <div className="text-xs text-zinc-500 mt-0.5">{brandProfile.nation} - {brandProfile.taxId} - Payout {brandProfile.payoutCurrency}</div>
          </div>
          <div className="flex gap-2">
            {brandProfile.bakConnected && <Badge className="bg-blue-500/15 text-blue-300">BAK</Badge>}
            {brandProfile.fedexConnected && <Badge className="bg-purple-500/15 text-purple-300">FedEx</Badge>}
            {brandProfile.dhlConnected && <Badge className="bg-amber-500/15 text-amber-300">DHL</Badge>}
          </div>
        </div>
      </Card>

      {/* Deductions */}
      {deductions.length > 0 && (
        <Card title={'Deductions - \u00a3' + deductedTotal.toFixed(2)}>
          <table className="w-full text-sm">
            <tbody className="divide-y divide-white/[0.04]">
              {deductions.map((d) => (
                <tr key={d.id}>
                  <td className="px-4 py-2 font-mono text-xs text-zinc-400">{d.date}</td>
                  <td className="px-4 py-2 font-mono text-xs text-zinc-400">{d.purchaseOrderId}</td>
                  <td className="px-4 py-2 text-xs capitalize text-zinc-300">{d.type.replace(/_/g, ' ')}</td>
                  <td className="px-4 py-2 text-right font-mono text-xs text-red-300">-\u00a3{d.amountGbp.toFixed(2)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      )}
{/* Fulfilment pipeline */}
      <Card title="Fulfilment Pipeline Tracker">
        <div className="flex flex-wrap gap-2 px-5 py-3">
          {stageCounts.map((s) => (
            <button key={s.stage} onClick={() => setActiveStage(activeStage === s.stage ? null : s.stage)}
              className={cn('flex items-center gap-2 px-3 py-2 rounded-lg text-xs transition-colors', activeStage === s.stage ? 'bg-brass-500/20 text-brass-300 ring-1 ring-brass-500/30' : 'bg-white/[0.04] text-zinc-400 hover:bg-white/[0.08]')}>
              <span className="font-medium">{STAGE_LABELS[s.stage].split(' ')[0]}</span>
              <span className="font-mono text-zinc-500">{s.count}</span>
            </button>
          ))}
        </div>
        {activeStage && (
          <div className="mx-5 mb-3 p-2 bg-ink-900 rounded-lg text-[10px] text-zinc-400">
            {STAGE_LABELS[activeStage]} - {stageCounts.find((s) => s.stage === activeStage)?.count ?? 0} shipments
            <button onClick={() => onNavigate?.('logistics')} className="ml-2 text-brass-400 hover:text-brass-300 inline-flex items-center gap-0.5">
              View details <ArrowRight className="w-3 h-3" />
            </button>
          </div>
        )}
      </Card>

      {/* Chart + Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card title="Revenue and Order Volume Trend" action={
          <div className="flex gap-1">
            {['6M', '1Y', 'All'].map((f) => (
              <button key={f} onClick={() => setTimeFilter(f)}
                className={cn('px-2.5 py-1 rounded-md text-[11px] font-medium transition-colors', timeFilter === f ? 'bg-brass-500/20 text-brass-400' : 'text-zinc-500 hover:text-zinc-300')}>{f}</button>
            ))}
          </div>
        }>
          <div className="p-4 h-[280px]">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={REVENUE_DATA} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <defs><linearGradient id="revG" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#D4A853" stopOpacity={0.4} /><stop offset="100%" stopColor="#D4A853" stopOpacity={0} /></linearGradient></defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#ffffff10" vertical={false} />
                <XAxis dataKey="month" stroke="#52525b" fontSize={11} tickLine={false} axisLine={false} />
                <YAxis stroke="#52525b" fontSize={11} tickLine={false} axisLine={false} tickFormatter={(v) => '\u00a3' + (v / 1000).toFixed(0) + 'k'} />
                <Tooltip contentStyle={{ backgroundColor: '#121214', border: '1px solid #ffffff10', borderRadius: '8px', fontSize: '12px' }} formatter={(v) => ['\u00a3' + Number(v).toLocaleString(), 'Revenue']} />
                <Area type="monotone" dataKey="revenue" stroke="#D4A853" strokeWidth={2.5} fill="url(#revG)" activeDot={{ r: 5 }} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </Card>

        <Card title="Activity Feed">
          <div className="px-5 py-3 max-h-[320px] overflow-y-auto">
            <div className="relative">
              {activityLogs.map((log, i) => (
                <div key={log.id} className="flex gap-3 pb-4 last:pb-0 relative">
                  {i < activityLogs.length - 1 && <div className="absolute left-[7px] top-4 bottom-0 w-px bg-white/[0.06]" />}
                  <div className={cn('w-3.5 h-3.5 rounded-full flex-shrink-0 mt-1 border-2 border-ink-850', log.status === 'live_amazon' ? 'bg-emerald-500' : log.status === 'uk_customs_cleared' ? 'bg-emerald-500/60' : log.status === 'bak_depot' ? 'bg-amber-500' : 'bg-brass-500')} />
                  <div className="flex-1 min-w-0">
                    <span className="text-xs font-medium text-white truncate">{log.message}</span>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className="text-[10px] text-zinc-600">{log.timestamp}</span>
                      <span className="text-[10px] text-zinc-600 font-mono">{log.shipmentRef}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}

function MetricCard({ label, value, trend, trendUp, icon, onClick }: {
  label: string; value: string; trend: string; trendUp: boolean; icon: React.ReactNode; onClick?: () => void;
}) {
  return (
    <button type="button" onClick={onClick} disabled={!onClick} className="w-full text-left disabled:cursor-default">
      <Card className={cn('p-5', onClick && 'cursor-pointer hover:border-white/[0.14] transition-colors')}>
        <div className="flex items-start justify-between mb-3">
          <span className="text-xs text-zinc-500 font-medium">{label}</span>
          <div className="w-8 h-8 rounded-lg bg-white/[0.04] flex items-center justify-center text-zinc-400">{icon}</div>
        </div>
        <div className="flex items-end justify-between">
          <span className="text-2xl font-bold text-white tracking-tight">{value}</span>
          <span className={cn('flex items-center gap-1 text-xs font-medium', trendUp ? 'text-emerald-400' : 'text-red-400')}>
            {trendUp ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
            {trend}
          </span>
        </div>
        {onClick && <span className="mt-2 block text-[10px] text-zinc-600">Click for details &gt;</span>}
      </Card>
    </button>
  );
}
