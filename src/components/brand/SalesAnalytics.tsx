/**
 * §Batch-22 — Brand-side analytics page (redesign).
 * Premium Recharts visualizations with drill-down on every metric.
 */
import { useState, useMemo } from 'react';
import { useApp } from '@/context/GlobalStateContext';
import { usePurchaseOrders } from '@/data/queries';
import { assertBrandScope } from '@/lib/auth/rbac';
import { useRechartsTokens } from '@/components/shared/charts/rechartsTokens';
import { Badge, Card, LoadingState } from '@/components/ui';
import { WorkspaceFrame, WorkspaceHeader } from '@/components/shared/workspace';
import { DeductionsLedger } from '@/components/brand/DeductionsLedger';
import { cn } from '@/utils/cn';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell, PieChart, Pie } from 'recharts';
import { TrendingUp, TrendingDown, Package, DollarSign, BarChart3, X, ArrowUpRight } from 'lucide-react';

// §UI/UX Wave 2 — series colours come from the canonical chart tokens
// (`CHART.palette`); only the tooltip surface remains local.
const INK_LIGHT = '#2A2A30';
export function SalesAnalytics({ onNavigate }: { onNavigate?: (view: string) => void }) {
  const { session, brandProfile } = useApp();
  // §UI/UX Wave 2 — one canonical chart language (grid/axis/stroke/palette from
  // src/config/themes.ts), so this surface stops being a second visual system.
  const CHART = useRechartsTokens();
  const poQuery = usePurchaseOrders();
  const pos = useMemo(() => assertBrandScope(session, poQuery.data?.data ?? []), [session, poQuery.data]);
  const [drillCard, setDrillCard] = useState<string | null>(null);
  const [chartTab, setChartTab] = useState<'revenue' | 'volume'>('revenue');
  const accepted = useMemo(() => pos.filter((p) =>
    ['accepted', 'ready_to_fulfil', 'shipped', 'delivered'].includes(p.status)), [pos]);
  const totalValue = useMemo(() => accepted.reduce((s, p) => s + p.poValue, 0), [accepted]);
  const totalUnits = useMemo(() => accepted.reduce((s, p) => s + p.lineItems.reduce((sl, li) => sl + li.quantity, 0), 0), [accepted]);
  const avgOrder = accepted.length ? Math.round(totalValue / accepted.length) : 0;
  const skuCount = useMemo(() => {
    const s = new Set<string>();
    for (const po of accepted) for (const li of po.lineItems) if (li.ackStatus !== 'rejected') s.add(li.sku);
    return s.size;
  }, [accepted]);
  const monthlyData = useMemo(() => {
    const rev = new Map<string, number>();
    const vol = new Map<string, number>();
    for (const po of accepted) {
      const k = po.orderDate.slice(0, 7);
      rev.set(k, (rev.get(k) ?? 0) + po.poValue);
      vol.set(k, (vol.get(k) ?? 0) + po.lineItems.reduce((sl, li) => sl + li.quantity, 0));
    }
    return [...new Set([...rev.keys(), ...vol.keys()])].sort().slice(-6).map((k) => ({
      month: k, revenue: rev.get(k) ?? 0, volume: vol.get(k) ?? 0,
    }));
  }, [accepted]);
  const skuStats = useMemo(() => {
    const m = new Map<string, { name: string; units: number; revenue: number }>();
    for (const po of accepted) {
      for (const li of po.lineItems) {
        if (li.ackStatus === 'rejected') continue;
        const u = li.acknowledgedQty ?? li.quantity;
        const c = m.get(li.sku) ?? { name: li.productName, units: 0, revenue: 0 };
        c.units += u; c.revenue += u * li.unitPrice;
        m.set(li.sku, c);
      }
    }
    return [...m.values()].sort((a, b) => b.revenue - a.revenue).slice(0, 8);
  }, [accepted]);
  const statusDist = useMemo(() =>
    (['received', 'accepted', 'shipped', 'delivered', 'rejected'] as const).map((s) => ({
      name: s.replace(/_/g, ' '), count: pos.filter((p) => p.status === s).length,
    })), [pos]);
  const maxStatus = Math.max(1, ...statusDist.map((x) => x.count));

  /* §Wave 3 Part 5 — while the purchase-order query resolves, `.data` is
     undefined so `pos` is [] and this report rendered its EMPTY version
     ("No POs yet for …") and a board of zeroed metrics. Measured in a real
     browser with a slow data source. */
  if (poQuery.isPending) {
    return (
      <WorkspaceFrame className="space-y-4" busy>
        <WorkspaceHeader
          eyebrow="BRAND PORTAL · ANALYTICS"
          title="Sales Analytics"
          description={`Loading revenue & performance for ${brandProfile.businessName || 'your brand'}`}
        />
        <Card title="Sales Analytics">
          <LoadingState rows={5} label="Loading your sales analytics…" />
        </Card>
      </WorkspaceFrame>
    );
  }

  if (pos.length === 0) {
    return (
      <WorkspaceFrame className="space-y-4">
        <WorkspaceHeader
          eyebrow="BRAND PORTAL · ANALYTICS"
          title="Sales Analytics"
          description={`Revenue & performance for ${brandProfile.businessName || 'your brand'}`}
        />
        <Card title="Sales Analytics">
          <p className="text-xs text-zinc-600">No POs yet for {brandProfile.businessName || 'your brand'}</p>
        </Card>
        {/* §Phase G1 — the deductions ledger is independent of PO volume, so it
            renders (with its own honest empty state) on every tenant. */}
        <div className="mt-6"><DeductionsLedger /></div>
      </WorkspaceFrame>
    );
  }
return (
    <WorkspaceFrame className="space-y-6">
      <WorkspaceHeader
        eyebrow="BRAND PORTAL · ANALYTICS"
        title="Sales Analytics"
        description={`Revenue & performance for ${brandProfile.businessName || 'your brand'}`}
      />

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <MetricCard label="Revenue" value={"\u00a3" + (totalValue / 1000).toFixed(0) + "k"} trend={accepted.length + " POs"} trendUp icon={<DollarSign className="w-4 h-4" />} onClick={() => setDrillCard("rev")} />
        <MetricCard label="Avg Order" value={"\u00a3" + avgOrder.toLocaleString()} trend="Per PO" trendUp={avgOrder > 5000} icon={<TrendingUp className="w-4 h-4" />} onClick={() => setDrillCard("avg")} />
        <MetricCard label="Units Shipped" value={totalUnits.toLocaleString()} trend={skuCount + " SKUs"} trendUp icon={<Package className="w-4 h-4" />} onClick={() => setDrillCard("units")} />
        <MetricCard label="Active SKUs" value={String(skuCount)} trend="Distinct" trendUp={skuCount > 2} icon={<BarChart3 className="w-4 h-4" />} onClick={() => setDrillCard("units")} />
      </div>

      <Card title={chartTab === "revenue" ? "Monthly Revenue Trend" : "Monthly Volume Trend"}
        action={<div className="flex gap-1">{( ["revenue","volume"] as const).map((t) => (
          <button key={t} onClick={() => setChartTab(t)} className={"px-2.5 py-1 rounded-ds-sm text-ds-micro font-medium transition-colors " + (chartTab === t ? "bg-brass-500/20 text-brass-400" : "text-zinc-500 hover:text-zinc-300")}>{t === "revenue" ? "Revenue" : "Volume"}</button>
        ))}</div>}>
        <div className="h-[280px]" onClick={() => setDrillCard("monthly")}>
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={monthlyData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
              <defs>
                <linearGradient id="revG" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor={CHART.palette[0]} stopOpacity={0.3} /><stop offset="100%" stopColor={CHART.palette[0]} stopOpacity={0} /></linearGradient>
                <linearGradient id="volG" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor={CHART.palette[2]} stopOpacity={0.3} /><stop offset="100%" stopColor={CHART.palette[2]} stopOpacity={0} /></linearGradient>
              </defs>
              <CartesianGrid {...CHART.gridProps} />
              <XAxis dataKey="month" {...CHART.axisProps} />
              <YAxis {...CHART.axisProps} tickFormatter={(v: any) => chartTab === "revenue" ? "\u00a3" + (v / 1000).toFixed(0) + "k" : String(v)} />
              <Tooltip contentStyle={CHART_TT} formatter={(v: any) => [chartTab === "revenue" ? "\u00a3" + v.toLocaleString() : v.toLocaleString() + " units", chartTab === "revenue" ? "Revenue" : "Volume"]} />
              <Area type="monotone" dataKey={chartTab === "revenue" ? "revenue" : "volume"} stroke={chartTab === "revenue" ? CHART.palette[0] : CHART.palette[2]} strokeWidth={CHART.strokeWidth} fill={"url(#" + (chartTab === "revenue" ? "revG" : "volG") + ")"} activeDot={{ r: 4 }} />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </Card>

      {/* Best-selling SKUs — top performers by revenue */}
      <Card title="Best-selling SKUs">
        <div className="space-y-2">
          {skuStats.length === 0 && <p className="text-xs text-zinc-600">No data yet.</p>}
          {skuStats.map((s, i) => (
            <div key={s.name} className="flex items-center justify-between text-ds-label">
              <div className="flex items-center gap-2">
                <span className="text-zinc-600 font-mono w-4">{i + 1}.</span>
                <span className="text-zinc-300">{s.name}</span>
              </div>
              <div className="text-right font-mono text-zinc-400">
                {s.units} units · £{s.revenue.toFixed(0)}
              </div>
            </div>
          ))}
        </div>
      </Card>

      {drillCard && <DrillModal card={drillCard} onClose={() => setDrillCard(null)} data={{ totalValue, totalUnits, avgOrder, skuCount, monthlyData, skuStats, accepted }} onNavigate={onNavigate} />}

      {/* §Phase G1 — brand deductions ledger (Tour 5 surface). APPENDED after
          all existing content so no existing browser assertion changes. */}
      <DeductionsLedger />
    </WorkspaceFrame>
  );
}
function MetricCard({ label, value, trend, trendUp, icon, onClick }: {
  label: string; value: string; trend: string; trendUp?: boolean; icon: React.ReactNode; onClick?: () => void;
}) {
  return (
    <button type="button" onClick={onClick} disabled={!onClick} className="w-full text-left disabled:cursor-default">
      <Card className={"p-4 " + (onClick ? "cursor-pointer hover:border-white/[0.14] transition-colors" : "")}>
        <div className="flex items-start justify-between mb-2">
          <span className="text-ds-micro text-zinc-500 font-medium">{label}</span>
          <div className="w-7 h-7 rounded-ds-md bg-white/[0.04] flex items-center justify-center text-zinc-400">{icon}</div>
        </div>
        <div className="text-lg font-bold text-white tracking-tight">{value}</div>
        <div className={"flex items-center gap-1 text-ds-micro mt-0.5 " + (trendUp !== undefined ? (trendUp ? "text-emerald-400" : "text-zinc-500") : "")}>
          {trendUp !== undefined && (trendUp ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />)}
          {trend}
        </div>
        {onClick && <span className="mt-1 block text-ds-micro text-zinc-600">Click for details \u2192</span>}
      </Card>
    </button>
  );
}

function DrillModal({ card, onClose, data, onNavigate }: {
  card: string; onClose: () => void;
  data: { totalValue: number; totalUnits: number; avgOrder: number; skuCount: number; monthlyData: any[]; skuStats: any[]; accepted: any[] };
  onNavigate?: (view: string) => void;
}) {
  const title = card.startsWith("sku:") ? "SKU Detail" : card.startsWith("status:") ? "Status: " + card.slice(7) : card === "rev" ? "Revenue Breakdown" : card === "avg" ? "Average Order" : card === "monthly" ? "Monthly Data" : "Details";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60" onClick={onClose}>
      <div className="bg-ink-850 border border-white/[0.08] rounded-ds-lg p-5 w-[540px] max-h-[80vh] overflow-y-auto shadow-ds-overlay" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-semibold text-white">{title}</h3>
          <button onClick={onClose} className="text-zinc-500 hover:text-white"><X className="w-4 h-4" /></button>
        </div>
        {card === "rev" && (
          <div className="space-y-3">
            <p className="text-xs text-zinc-400">Revenue across {data.accepted.length} fulfilled POs</p>
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-ink-900 rounded-ds-md p-3"><p className="text-ds-micro text-zinc-500">Total Revenue</p><p className="text-lg font-semibold text-white font-mono">\u00a3{data.totalValue.toLocaleString()}</p></div>
              <div className="bg-ink-900 rounded-ds-md p-3"><p className="text-ds-micro text-zinc-500">Avg per PO</p><p className="text-lg font-semibold text-white font-mono">\u00a3{data.avgOrder.toLocaleString()}</p></div>
              <div className="bg-ink-900 rounded-ds-md p-3"><p className="text-ds-micro text-zinc-500">Units</p><p className="text-lg font-semibold text-white font-mono">{data.totalUnits.toLocaleString()}</p></div>
              <div className="bg-ink-900 rounded-ds-md p-3"><p className="text-ds-micro text-zinc-500">SKUs</p><p className="text-lg font-semibold text-white font-mono">{data.skuCount}</p></div>
            </div>
            <button onClick={() => { onClose(); onNavigate?.("purchase_orders"); }} className="text-ds-micro text-brass-400 hover:text-brass-300 flex items-center gap-1">View all POs <ArrowUpRight className="w-3 h-3" /></button>
          </div>
        )}
        {(card === "units" || card === "monthly") && (
          <div className="space-y-2">
            <p className="text-xs text-zinc-400">{card === "units" ? "SKU-level breakdown" : "Monthly trend data"}</p>
            <div className="max-h-60 overflow-y-auto space-y-1">
              {(card === "units" ? data.skuStats : data.monthlyData).map((item: any, i: number) => (
                <div key={i} className="flex items-center justify-between text-xs border-b border-white/[0.04] py-1.5">
                  <span className="text-zinc-300">{item.name || item.month}</span>
                  <span className="text-zinc-400 font-mono">{card === "units" ? item.units + "u \u00b7 \u00a3" + item.revenue.toLocaleString() : "\u00a3" + item.revenue.toLocaleString() + " \u00b7 " + item.volume.toLocaleString() + "u"}</span>
                </div>
              ))}
            </div>
          </div>
        )}
        {card.startsWith("sku:") && (() => {
          const sku = data.skuStats.find((x: any) => x.name === card.slice(4));
          if (!sku) return <p className="text-xs text-zinc-600">SKU not found.</p>;
          return (<div className="grid grid-cols-2 gap-3">
            <div className="bg-ink-900 rounded-ds-md p-3"><p className="text-ds-micro text-zinc-500">Units</p><p className="text-lg font-semibold text-white font-mono">{sku.units.toLocaleString()}</p></div>
            <div className="bg-ink-900 rounded-ds-md p-3"><p className="text-ds-micro text-zinc-500">Revenue</p><p className="text-lg font-semibold text-white font-mono">\u00a3{sku.revenue.toLocaleString()}</p></div>
          </div>);
        })()}
        {card === "avg" && <div className="bg-ink-900 rounded-ds-md p-4 text-center"><p className="text-ds-micro text-zinc-500">Average Order Value</p><p className="text-3xl font-bold text-brass-400 font-mono mt-1">\u00a3{data.avgOrder.toLocaleString()}</p><p className="text-ds-micro text-zinc-600 mt-2">Based on {data.accepted.length} fulfilled POs</p></div>}
      </div>
    </div>
  );
}
const CHART_TT = { background: INK_LIGHT, border: '1px solid rgba(255,255,255,0.08)', borderRadius: '8px', fontSize: '11px', color: '#E4E4E7' };