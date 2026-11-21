/**
 * Batch 35 Brand Reports with Recharts, CSV export, period selector.
 */
import { useMemo, useState } from 'react';
import { useApp } from '@/context/GlobalStateContext';
import { useCanonicalStoreVersion, usePurchaseOrders } from '@/data/queries';
import { assertBrandScope } from '@/lib/auth/rbac';
import { inventorySummaryForBrand } from '@/lib/inventory/inventoryLifecycle';
import { downloadCsv } from '@/lib/csv';
import { Badge, Button, Card, LoadingState } from '@/components/ui';
import { WorkspaceFrame, WorkspaceHeader } from '@/components/shared/workspace';
import { DeductionsLedger } from '@/components/brand/DeductionsLedger';
import { cn } from '@/utils/cn';
import { TrendingUp, TrendingDown, Package, DollarSign, BarChart3, ShoppingCart, X, Download, Calendar } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { useRechartsTokens } from '@/components/shared/charts/rechartsTokens';

type Period = 30 | 60 | 90;
// §UI/UX Wave 2 — series colours now come from the canonical chart tokens
// (`CHART.palette`) rather than local hex literals.
/* §BRAND IDENTITY — was hardcoded #1A1A20 / #E4E4E7 (a zinc family outside the
   approved palette). Now theme tokens, so the tooltip follows both themes. */
const CHART_TT = {
  background: 'var(--mr-surface-overlay)',
  border: '1px solid var(--mr-hairline)',
  borderRadius: '8px',
  fontSize: '11px',
  color: 'var(--mr-text)',
};

export function BrandReports({ onNavigate }: { onNavigate?: (view: string) => void }) {
  const { session, brandProfile, products } = useApp();
  /**
   * §P8 — REPOINTED (not weakened). This surface used to FABRICATE the on-hand
   * figure as `unitsPerCase × 10` per SKU — an invented number presented as an
   * inventory estimate, with no ledger behind it. On-hand now comes from the
   * CANONICAL inventory owner (the movement ledger's own sum), which is what the
   * whole platform reads.
   */
  const canonicalVersion = useCanonicalStoreVersion();
  void canonicalVersion; // canonical store change signal → re-read the derived figure
  const inventoryBrandId = session?.tier === 'brand' ? session.tenantId ?? null : null;
  const inventorySummary = useMemo(() => {
    void canonicalVersion; // reactivity anchor (the canonical store change signal)
    if (!inventoryBrandId) return undefined;
    const res = inventorySummaryForBrand(inventoryBrandId, {
      staffId: `brand:${inventoryBrandId}`,
      canMutate: false,
      tenantId: inventoryBrandId,
    });
    return res.ok ? res.value : undefined;
  }, [inventoryBrandId, canonicalVersion]);
  // §UI/UX Wave 2 — canonical chart language (grid/axis/palette from
  // src/config/themes.ts) instead of this surface's own hardcoded colours.
  const CHART = useRechartsTokens();
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
  /** §P8 — the CANONICAL on-hand figure (the ledger's own sum), never invented. */
  const canonicalOnHand = inventorySummary?.unitsOnHand;

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
    { label: 'On-Hand Inventory', value: canonicalOnHand === undefined ? '—' : String(canonicalOnHand), icon: Package, trend: 'Recorded units on hand', trendUp: true },
    { label: 'Net PPM', value: '\u00a3' + netPPM.toLocaleString(), icon: DollarSign, trend: 'Per 1000 units shipped', trendUp: netPPM > 500 },
  ];
  const poStatuses = ['received', 'under_review', 'accepted', 'ready_to_fulfil', 'shipped', 'delivered', 'rejected'] as const;

  /* §Wave 3 Part 5 — while the purchase-order query resolves, `.data` is
     undefined so `pos` is [] and this surface rendered its EMPTY report: "No
     accepted activity in the selected period yet.", "No purchase orders yet for
     Astonish in the selected period." and a board of zeroed metrics. Measured in
     a real browser with a slow data source: those strings were painted during
     load and gone once the 5 seeded orders arrived. */
  if (poQuery.isPending) {
    return (
      <WorkspaceFrame className="space-y-4" busy>
        <WorkspaceHeader
          eyebrow="BRAND PORTAL · REPORTING"
          title="Reports"
          description={`Loading performance metrics for ${brandProfile.businessName || 'your brand'}.`}
        />
        <Card title="Reports">
          <LoadingState rows={5} label="Loading your performance metrics…" />
        </Card>
      </WorkspaceFrame>
    );
  }

  if (pos.length === 0) {
    return (
      <WorkspaceFrame className="space-y-4">
        <WorkspaceHeader
          eyebrow="BRAND PORTAL · REPORTING"
          title="Reports"
          description={`Performance metrics for ${brandProfile.businessName || 'your brand'}.`}
          meta={<span className="text-ds-label text-muted">No accepted activity in the selected period yet.</span>}
        />
        <Card title="Reports">
          <p className="text-xs text-faint">No purchase orders yet for {brandProfile.businessName || 'your brand'} in the selected period.</p>
        </Card>
        {/* §Phase G1 — the deductions ledger is independent of the reporting
            period, so it renders (with its own honest empty state) on every
            tenant. APPENDED after existing content. */}
        <div className="mt-6"><DeductionsLedger /></div>
      </WorkspaceFrame>
    );
  }

  return (
    <WorkspaceFrame className="space-y-4">
      <WorkspaceHeader
        eyebrow="BRAND PORTAL · REPORTING"
        title="Reports"
        description={`Performance metrics for ${brandProfile.businessName || 'your brand'}`}
        toolbar={
          <div className="flex flex-wrap items-center justify-between gap-3">
            <span className="text-ds-micro font-semibold uppercase tracking-[0.14em] text-muted">
              Reporting period
            </span>
            <div className="flex items-center gap-2">
              <div className="flex overflow-hidden rounded-ds-md border border-hairline bg-surface-raised" role="group" aria-label="Reporting period">
                {([30, 60, 90] as Period[]).map((p) => (
                  <button key={p} onClick={() => setPeriod(p)}
                    aria-pressed={period === p}
                    data-state={period === p ? 'active' : 'idle'}
                    className={cn('px-3 py-1.5 text-ds-label font-medium transition-ds duration-ds-fast',
                      period === p ? 'bg-surface-hover text-strong' : 'text-muted hover:text-strong')}>
                    Last {p} days
                  </button>
                ))}
              </div>
              <Button className="text-ds-micro" onClick={() => {
            const csv = [['PO','Status','Value','Units','ASIN Rate']];
            for (const po of rp) {
              const units = po.lineItems.reduce((s,l) => s + l.quantity, 0);
              csv.push([po.poNumber, po.status, String(po.poValue), String(units), String(asinRate)+'%']);
            }
            downloadCsv('brand-reports.csv', csv[0], csv.slice(1));
          }}>
            <Download className="w-3 h-3 mr-1" /> Export CSV
          </Button>
            </div>
          </div>
        }
      />

      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
        {metrics.map((m) => {
          const Icon = m.icon;
          return (
            <button key={m.label} type="button" onClick={() => setDrillCard(m.label)}
              className="bg-surface-raised border border-hairline hover:border-hairline-strong rounded-ds-lg p-4 text-left transition-all">
              <div className="flex items-center gap-2 mb-2">
                <Icon className="w-4 h-4 text-muted" />
                <span className="text-ds-micro text-muted font-medium">{m.label}</span>
              </div>
              <div className="text-xl font-bold text-strong">{m.value}</div>
              <div className="flex items-center gap-1 mt-1">
                <span className={cn('text-ds-micro', m.trendUp ? 'text-state-success' : 'text-muted')}>{m.trend}</span>
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
                  <CartesianGrid {...CHART.gridProps} />
                  <XAxis dataKey="month" {...CHART.axisProps} />
                  <YAxis {...CHART.axisProps} tickFormatter={(v) => '\\u00a3' + (v/1000).toFixed(0) + 'k'} />
                  <Tooltip contentStyle={CHART_TT} formatter={(v) => ['£' + Number(v ?? 0).toLocaleString(), 'Shipped Value']} />
                  <Bar dataKey="value" fill={CHART.palette[0]} radius={[4,4,0,0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          ) : <p className="text-xs text-faint text-center py-8">No shipped POs in this period.</p>}
        </Card>
        <Card title="Dispatch Volume (shipped)" subtitle="Monthly units shipped">
          {dispatchChart.length > 0 ? (
            <div className="h-52">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={dispatchChart}>
                  <CartesianGrid {...CHART.gridProps} />
                  <XAxis dataKey="month" {...CHART.axisProps} />
                  <YAxis {...CHART.axisProps} />
                  <Tooltip contentStyle={CHART_TT} formatter={(v) => [Number(v ?? 0).toLocaleString() + ' units', 'Dispatched']} />
                  <Bar dataKey="units" fill={CHART.palette[2]} radius={[4,4,0,0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          ) : <p className="text-xs text-faint text-center py-8">No shipped POs in this period.</p>}
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
              <div key={s} className="bg-surface-raised border border-hairline rounded-ds-md px-3 py-2 text-center min-w-[80px]">
                <div className="text-lg font-bold text-strong">{count}</div>
                <div className="text-ds-micro text-muted capitalize">{s.replace(/_/g, ' ')}</div>
                <div className="text-ds-micro text-faint">{pct}%</div>
              </div>
            );
          })}
        </div>
      </Card>

      {/* Drill-down modal */}
      {drillCard && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-surface-hover backdrop-blur-sm" onClick={() => setDrillCard(null)}>
          <div className="bg-surface-raised border border-hairline rounded-ds-lg w-full max-w-lg max-h-[80vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between px-5 py-4 border-b border-hairline">
              <h3 className="text-sm font-semibold text-strong">{drillCard}</h3>
              <button onClick={() => setDrillCard(null)} className="text-muted hover:text-strong"><X className="w-4 h-4" /></button>
            </div>
            <div className="px-5 py-4 space-y-3">
              {drillCard === 'ASIN Confirmation Rate' && (
                <div className="space-y-2">
                  <p className="text-xs text-muted">{confirmedLines} of {totalLines} lines confirmed ({asinRate}%)</p>
                  <div className="h-2 bg-tint rounded-full overflow-hidden">
                    <div className="h-full bg-accent-500 rounded-full transition-all" style={{ width: asinRate + '%' }} />
                  </div>
                </div>
              )}
              {drillCard === 'Sourceable Products OOS' && (
                <div className="space-y-2">
                  <p className="text-xs text-muted">{outOfStock} of {products.length} products out of stock</p>
                  {products.filter((p) => !p.isAvailable).map((p) => (
                    <div key={p.sku} className="flex items-center justify-between text-xs border-b border-hairline py-1">
                      <span className="text-strong">{p.name}</span>
                      <span className="text-muted font-mono">{p.sku}</span>
                    </div>
                  ))}
                </div>
              )}
              {drillCard === 'Open PO Quantity' && (
                <div className="space-y-2">
                  <p className="text-xs text-muted">{openPOQty} units across {openPOs.length} open POs</p>
                  {openPOs.map((po) => (
                    <div key={po.id} className="flex items-center justify-between text-xs border-b border-hairline py-1">
                      <span className="text-strong">{po.poNumber}</span>
                      <span className="text-muted font-mono">{po.lineItems.reduce((s,l) => s + l.quantity, 0)} units</span>
                    </div>
                  ))}
                </div>
              )}
              {drillCard === 'Net PPM' && (
                <div className="text-center py-4">
                  <p className="text-3xl font-bold text-accent-400 font-mono">\\u00a3{netPPM.toLocaleString()}</p>
                  <p className="text-xs text-muted mt-2">Per 1000 units shipped</p>
                </div>
              )}
              {drillCard === 'On-Hand Inventory' && (
                <div className="space-y-2">
                  <p className="text-xs text-muted">
                    {canonicalOnHand === undefined
                      ? 'No inventory recorded for this tenant yet.'
                      : `${canonicalOnHand} units on hand, derived from the movement ledger`}
                  </p>
                  <p className="text-ds-micro text-faint">
                    Source: the canonical inventory ledger (§P8) — the same figures the Inventory
                    surface shows. Nothing is estimated here.
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* §Phase G1 — brand deductions ledger (Tour 5 surface). APPENDED after
          all existing content so no existing browser assertion changes. */}
      <DeductionsLedger />
    </WorkspaceFrame>
  );
}
