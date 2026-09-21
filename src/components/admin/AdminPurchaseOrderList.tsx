/**
 * §Batch-10 — Admin Purchase Order Management.
 * Shows all POs across all brands with full detail, acknowledgment status,
 * ASN filing, and on-behalf actions. Replaces the old 3PL Terminal view.
 */
import { useState, useMemo } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useApp } from '@/context/GlobalStateContext';
import {
  useBrands,
  usePurchaseOrders,
  useDeductions,
  useProducts,
  useShipmentsAll,
} from '@/data/queries';
import { createPurchaseOrder } from '@/data/api';
import { Button, Card, StatusBadge } from '@/components/ui';
import { cn } from '@/utils/cn';
import { AdminPurchaseOrderDetail } from '@/components/admin/AdminPurchaseOrderDetail';
/**
 * §UI/UX Wave 2 completion — this surface is migrated onto the SAME workspace
 * architecture Operations Overview uses (frame → header → toolbar → metric band →
 * record queue → context rail), and the RecordDrawer is the QUEUE → PREVIEW step
 * in front of the EXISTING full record page (AdminPurchaseOrderDetail). The row
 * contract the existing suites assert (`div.flex.items-center.justify-between`
 * with `button[title="View detail"]`) is deliberately preserved.
 */
import {
  ActivityFeed,
  ContextPanel,
  MetricBand,
  RecordDrawer,
  RecordFieldList,
  SegmentedControl,
  WorkspaceFrame,
  WorkspaceGrid,
  WorkspaceHeader,
  WorkspaceSection,
} from '@/components/shared/workspace';
import {
  ackStatusPresentation,
  ackWindowPresentation,
  poStatusPresentation,
} from '@/lib/statusPresentation';
import type { Deduction, PurchaseOrder } from '@/types';
import type { DemoShipment } from '@/data/demoData';
import { Search, Eye, Plus, X, Package } from 'lucide-react';

const STATUS_ORDER = ['received', 'under_review', 'accepted', 'ready_to_fulfil', 'shipped', 'delivered', 'rejected'];

export function AdminPurchaseOrderList() {
  const qc = useQueryClient();
  // §Phase E5 (G3) — the on-behalf create action is a MUTATION and must honour
  // the EXISTING staff permission tier. `createPurchaseOrder`'s real
  // notification behaviour is deliberately UNCHANGED — this adds the guard the
  // surface was missing, it does not alter the email path.
  const { canCurrentUserMutate } = useApp();
  const brandsQuery = useBrands();
  const productsQuery = useProducts();
  const posQuery = usePurchaseOrders();
  const deductionsQuery = useDeductions();
  const brands = useMemo(() => brandsQuery.data?.data ?? [], [brandsQuery.data]);
  const products = productsQuery.data?.data ?? [];
  const pos = useMemo(() => posQuery.data?.data ?? [], [posQuery.data]);
  const deductions = useMemo(() => deductionsQuery.data?.data ?? [], [deductionsQuery.data]);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [selectedPoId, setSelectedPoId] = useState<string | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [createBrandId, setCreateBrandId] = useState('');
  const [createLines, setCreateLines] = useState<{ productId: string; quantity: number }[]>([]);
  const [createNote, setCreateNote] = useState<string | null>(null);
  /* §UI/UX Wave 2 completion — workspace state: queue density (REAL — it changes
     the rendered row padding), the simulated-only filter, and the record preview. */
  const [density, setDensity] = useState<'compact' | 'comfortable'>('compact');
  const [simOnly, setSimOnly] = useState(false);
  const [previewPoId, setPreviewPoId] = useState<string | null>(null);

  const brandName = (id: string) => brands.find((b) => b.id === id)?.profile.businessName ?? id;

  /* Canonical shipment → PO join is `DemoShipment.poNumber` (the same join
     Logistics Control uses) — never a re-derived guess. */
  const shipments = useShipmentsAll().data?.data ?? [];

  /** Queue metrics — every figure derived from the canonical stores above. */
  const queueMetrics = useMemo(() => {
    const awaiting = pos.filter((p) => p.status === 'received' || p.status === 'under_review');
    return {
      total: pos.length,
      value: pos.reduce((sum, p) => sum + p.poValue, 0),
      awaiting: awaiting.length,
      simulated: pos.filter((p) => p.simulated === true).length,
      deductions: deductions.length,
    };
  }, [pos, deductions]);

  const previewPo = pos.find((p) => p.id === previewPoId) ?? null;

  const grouped = useMemo(() => {
    const map = new Map<string, typeof pos>();
    let list = [...pos];
    if (statusFilter !== 'all') list = list.filter((p) => p.status === statusFilter);
    if (simOnly) list = list.filter((p) => p.simulated === true);
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      list = list.filter((p) => p.poNumber.toLowerCase().includes(q) || (brands.find((b) => b.id === p.brandId)?.profile.businessName ?? p.brandId).toLowerCase().includes(q));
    }
    list.sort(function(a, b) { return STATUS_ORDER.indexOf(a.status) - STATUS_ORDER.indexOf(b.status); });
    for (const po of list) {
      if (!map.has(po.brandId)) map.set(po.brandId, []);
      map.get(po.brandId)!.push(po);
    }
    return [...map.entries()].sort((a, b) => a[0].localeCompare(b[0]));
  }, [pos, statusFilter, searchQuery, brands, simOnly]);

  function addLine(productId: string) { setCreateLines(function(prev) { return [...prev, { productId: productId, quantity: 1 }]; }); }
  function removeLine(idx: number) { setCreateLines(function(prev) { return prev.filter(function(_, i) { return i !== idx; }); }); }
  function updateQty(idx: number, qty: number) { setCreateLines(function(prev) { return prev.map(function(l, i) { return i === idx ? { ...l, quantity: Math.max(1, qty) } : l; }); }); }
  function handleCreate() {
    // §Phase E5 (G3) — RBAC: a view-only account may not create purchase orders.
    if (!canCurrentUserMutate) return;
    if (!createBrandId || createLines.length === 0) return;
    const brandProducts = products.filter(function(p) { return p.brandId === createBrandId; });
    const lineItems = createLines.map(function(l) { const p = brandProducts.find(function(pp) { return pp.id === l.productId; }); return { sku: p?.sku ?? 'UNKNOWN', productName: p?.name ?? 'Unknown', quantity: l.quantity, unitPrice: p?.exWorksPrice ?? 0, commodityCode: p?.commodityCode ?? '00000000' }; });
    const po = createPurchaseOrder(createBrandId, lineItems, 'admin');
    setCreateNote('PO ' + po.poNumber + ' created for ' + (brands.find(function(b) { return b.id === createBrandId; })?.profile.businessName ?? createBrandId));
    setCreateBrandId('');
    setCreateLines([]);
    setShowCreate(false);
    setTimeout(function() { setCreateNote(null); qc.invalidateQueries(); }, 3000);
  }

return (
    <WorkspaceFrame>
      <WorkspaceHeader
        eyebrow="Admin Hub · Commerce operations"
        title="Purchase Orders"
        description={`${pos.length} POs across ${brands.length} brands — create, manage, acknowledge, and file ASNs on behalf of brands`}
        meta={
          <>
            <span className="text-ds-label text-zinc-500">
              Queue value{' '}
              <span className="font-mono text-zinc-300">
                GBP {queueMetrics.value.toLocaleString()}
              </span>
            </span>
            <span className="text-ds-label text-zinc-500">
              Awaiting action <span className="font-mono text-zinc-300">{queueMetrics.awaiting}</span>
            </span>
            {queueMetrics.simulated > 0 && (
              <span className="text-ds-label text-zinc-500">
                Simulated <span className="font-mono text-zinc-300">{queueMetrics.simulated}</span>
              </span>
            )}
          </>
        }
        actions={
          <>
            {createNote && (
              <span className="text-ds-micro text-emerald-400" role="status">
                {createNote}
              </span>
            )}
            <Button className="text-ds-micro" data-state="admin-po-create" disabled={!canCurrentUserMutate}
              title={canCurrentUserMutate ? undefined : 'View-only staff cannot create purchase orders'}
              onClick={function() { setShowCreate(true); }}>
              <Plus className="w-3 h-3 mr-1" /> Create PO
            </Button>
          </>
        }
        toolbar={
          <div className="flex flex-wrap items-center gap-2">
            <div className="relative min-w-[180px] flex-1 sm:max-w-md">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-zinc-500" aria-hidden="true" />
              <input type="text" value={searchQuery} onChange={function(e) { setSearchQuery(e.target.value); }}
                aria-label="Search purchase orders"
                placeholder="Search by PO number or brand…"
                className="w-full bg-ink-900 border border-white/[0.08] rounded-lg pl-8 pr-3 py-1.5 text-xs text-white placeholder-zinc-600 focus:outline-none focus:border-brass-500/40" />
            </div>
            <select value={statusFilter} onChange={function(e) { setStatusFilter(e.target.value); }}
              aria-label="Filter by status"
              className="bg-ink-900 border border-white/[0.08] rounded-md px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-brass-500/40">
              <option value="all">All Statuses</option>
              {STATUS_ORDER.map(function(s) { return (<option key={s} value={s}>{s.replace(/_/g, ' ')}</option>); })}
            </select>
            <button
              type="button"
              data-testid="po-sim-filter"
              aria-pressed={simOnly}
              onClick={function() { setSimOnly(function(v) { return !v; }); }}
              className={cn(
                'rounded-ds-md border px-2.5 py-1.5 text-ds-label font-medium transition-ds duration-ds-fast',
                simOnly
                  ? 'border-brass-500/40 bg-brass-500/15 text-brass-300'
                  : 'border-white/[0.08] bg-white/[0.02] text-zinc-400 hover:text-zinc-200'
              )}
            >
              Simulated only
            </button>
            <span className="ml-auto flex items-center gap-2">
              <span className="hidden text-ds-micro uppercase tracking-[0.14em] text-zinc-600 sm:inline">
                Density
              </span>
              <SegmentedControl
                ariaLabel="Row density"
                active={density}
                onSelect={function(id) { setDensity(id as 'compact' | 'comfortable'); }}
                items={[
                  { id: 'compact', label: 'Compact' },
                  { id: 'comfortable', label: 'Comfortable' },
                ]}
              />
            </span>
          </div>
        }
      />

      <WorkspaceGrid
        rail={
          <>
            <ContextPanel title="Queue posture">
              <dl className="space-y-2">
                {[
                  { label: 'Awaiting action', value: queueMetrics.awaiting },
                  { label: 'Acknowledged / later', value: queueMetrics.total - queueMetrics.awaiting },
                  { label: 'Deductions raised', value: queueMetrics.deductions },
                  { label: 'Simulated (sim)', value: queueMetrics.simulated },
                ].map(function(row) {
                  return (
                    <div key={row.label} className="flex items-center justify-between gap-3">
                      <dt className="text-ds-label text-zinc-500">{row.label}</dt>
                      <dd className="font-mono text-ds-label text-zinc-200">{row.value}</dd>
                    </div>
                  );
                })}
              </dl>
              <p className="mt-2 border-t border-white/[0.06] pt-2 text-ds-micro leading-snug text-zinc-600">
                Every figure is derived from the canonical purchase-order and deduction
                stores — nothing is estimated.
              </p>
            </ContextPanel>
            <ContextPanel title="Status distribution">
              {queueMetrics.total === 0 ? (
                <p className="text-ds-label text-zinc-500">No purchase orders to summarise.</p>
              ) : (
                <ul className="space-y-1.5" data-testid="po-status-distribution">
                  {STATUS_ORDER.map(function(s) {
                    const n = pos.filter(function(p) { return p.status === s; }).length;
                    const p = poStatusPresentation(s);
                    return (
                      <li key={s} className="flex items-center justify-between gap-2">
                        <StatusBadge className="text-ds-micro" dataStatus={p.dataStatus} tone={p.tone}>
                          {p.label}
                        </StatusBadge>
                        <span className="font-mono text-ds-label text-zinc-300">{n}</span>
                      </li>
                    );
                  })}
                </ul>
              )}
            </ContextPanel>
          </>
        }
      >
        <MetricBand
          columns={4}
          items={[
            {
              id: 'po-queue-total',
              label: 'Purchase orders',
              value: String(queueMetrics.total),
              context: `${brands.length} brands`,
              onOpen: function() { setStatusFilter('all'); setSearchQuery(''); setSimOnly(false); },
            },
            {
              id: 'po-queue-value',
              label: 'Value in queue',
              value: `GBP ${queueMetrics.value.toLocaleString()}`,
              context: 'Net order value',
              onOpen: function() { setStatusFilter('all'); setSearchQuery(''); },
            },
            {
              id: 'po-queue-awaiting',
              label: 'Awaiting action',
              value: String(queueMetrics.awaiting),
              tone: queueMetrics.awaiting > 0 ? 'warning' : 'success',
              statusText: queueMetrics.awaiting > 0 ? 'Needs review' : 'All actioned',
              onOpen: function() { setStatusFilter('received'); },
            },
            {
              id: 'po-queue-simulated',
              label: 'Simulated (sim)',
              value: String(queueMetrics.simulated),
              context: 'Operational simulation',
              onOpen: function() { setSimOnly(true); },
            },
          ]}
        />

        <WorkspaceSection
          title="Order queue"
          domain="orders"
          description="Grouped by brand. Preview a record without leaving the queue, or open the full record page to act."
        >
          <div className="space-y-3">
        {grouped.map(function([brandId, brandPos]) { return (
          <Card key={brandId} title={brandName(brandId)}>
            <div className="divide-y divide-white/[0.04]">
              {brandPos.map(function(po) {
                const poDeductions = deductions.filter(function(d) { return d.purchaseOrderId === po.id; });
                return (
                  <div key={po.id} data-density={density} className={cn('flex items-center justify-between px-1 hover:bg-white/[0.02]', density === 'compact' ? 'py-2' : 'py-2.5')}>
                    <div className="flex items-center gap-3 min-w-0">
                      <span className="font-mono text-xs text-white font-medium">{po.poNumber}</span>
                      {/* §Phase E5 (G2) — truthful provenance on the admin PO list. */}
                      {po.simulated === true && (
                        <span className="text-ds-micro px-1.5 py-0.5 rounded bg-brass-500/15 text-brass-400 border border-brass-500/20">(sim)</span>
                      )}
                      <span className={cn('text-ds-micro px-1.5 py-0.5 rounded capitalize',
                        po.status === 'received' ? 'bg-blue-500/15 text-blue-300' :
                        po.status === 'accepted' ? 'bg-emerald-500/15 text-emerald-300' :
                        po.status === 'rejected' ? 'bg-red-500/15 text-red-300' :
                        po.status === 'shipped' || po.status === 'delivered' ? 'bg-purple-500/15 text-purple-300' :
                        'bg-amber-500/15 text-amber-300'
                      )}>{po.status.replace(/_/g, ' ')}</span>
                      <span className="font-mono text-ds-micro text-zinc-500">GBP {po.poValue.toLocaleString()}</span>
                      <span className="text-ds-micro text-zinc-600">{po.lineItems.length} items</span>
                      {po.acknowledgedAt && <span className="text-ds-micro text-emerald-500/70">Acknowledged</span>}
                      {poDeductions.length > 0 && <span className="text-ds-micro text-amber-500/70">{poDeductions.length} deduction(s)</span>}
                    </div>
                    <div className="flex items-center gap-1.5 flex-shrink-0">
                      <button
                        type="button"
                        data-testid={`po-preview-${po.id}`}
                        onClick={function() { setPreviewPoId(po.id); }}
                        className="rounded-ds-sm border border-white/[0.08] px-2 py-1 text-ds-micro font-medium text-zinc-300 transition-ds duration-ds-fast hover:border-white/[0.16] hover:text-white"
                        title="Preview record"
                      >
                        Preview
                      </button>
                      <button onClick={function() { setSelectedPoId(po.id); }}
                        className="p-1.5 text-zinc-500 hover:text-white" title="View detail">
                        <Eye className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </Card>
        );})}
        {grouped.length === 0 && (
          <Card className="p-8 text-center"><p className="text-xs text-zinc-600">No purchase orders match your filters.</p></Card>
        )}
          </div>
        </WorkspaceSection>
      </WorkspaceGrid>

      {/* ── QUEUE → PREVIEW → RECORD PAGE ──────────────────────────────────
          The drawer is the preview step over the REAL PO record; the existing
          full record page (`AdminPurchaseOrderDetail`) is still reached by the
          row's "View detail" control, so no workflow was replaced. */}
      <RecordDrawer
        open={previewPo !== null}
        onClose={function() { setPreviewPoId(null); }}
        title={previewPo ? previewPo.poNumber : ''}
        subtitle={previewPo ? brandName(previewPo.brandId) : undefined}
        testId="po-record-drawer"
        footer={
          previewPo ? (
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span className="text-ds-micro text-zinc-600">
                {previewPo.simulated === true
                  ? 'Operational simulation record'
                  : 'Recorded purchase order'}
              </span>
              <Button
                className="text-ds-micro"
                data-state="po-drawer-open-record"
                onClick={function() { setSelectedPoId(previewPo.id); setPreviewPoId(null); }}
              >
                Open full record
              </Button>
            </div>
          ) : undefined
        }
      >
        {previewPo ? (
          <PoPreviewBody
            po={previewPo}
            brandName={brandName(previewPo.brandId)}
            deductions={deductions.filter(function(d) { return d.purchaseOrderId === previewPo.id; })}
            shipments={shipments.filter(function(s) { return s.poNumber === previewPo.poNumber; })}
          />
        ) : null}
      </RecordDrawer>

      {selectedPoId && (
        <AdminPurchaseOrderDetail poId={selectedPoId} onClose={function() { setSelectedPoId(null); qc.invalidateQueries(); }} />
      )}

      {showCreate && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <Card className="w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col bg-ink-850 border-white/[0.08]">
            <div className="flex items-center justify-between px-5 py-4 border-b border-white/[0.06]">
              <span className="text-sm font-semibold text-white">Create Purchase Order on Behalf of Brand</span>
              <button onClick={function() { setShowCreate(false); }} className="text-zinc-400 hover:text-white"><X className="w-3.5 h-3.5" /></button>
            </div>
            <div className="flex-1 overflow-y-auto p-5 space-y-4">
              <div>
                <label className="text-ds-micro text-zinc-500 font-medium mb-1 block">Brand</label>
                <select value={createBrandId} onChange={function(e) { setCreateBrandId(e.target.value); setCreateLines([]); }}
                  className="w-full bg-ink-900 border border-white/[0.08] rounded-md px-2.5 py-2 text-xs text-white">
                  <option value="">Select a brand…</option>
                  {brands.map(function(b) { return (<option key={b.id} value={b.id}>{b.profile.businessName}</option>); })}
                </select>
              </div>
              {createBrandId && (
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <label className="text-ds-micro text-zinc-500 font-medium">Products / Line Items</label>
                  </div>
                  <div className="space-y-2">
                    {createLines.map(function(l, i) {
                      const p = products.find(function(pp) { return pp.id === l.productId; });
                      return (<div key={i} className="flex items-center gap-2 bg-white/[0.02] rounded-lg px-3 py-2">
                        <span className="text-xs text-zinc-300 flex-1">{p?.name ?? 'Unknown'}</span>
                        <input type="number" value={l.quantity} onChange={function(e) { updateQty(i, parseInt(e.target.value) || 1); }} className="w-16 bg-ink-900 border border-white/[0.08] rounded px-2 py-1 text-xs text-white text-center" min="1" />
                        <span className="text-ds-micro text-zinc-500 font-mono w-16 text-right">GBP {(p?.exWorksPrice ?? 0).toFixed(2)}</span>
                        <button onClick={function() { removeLine(i); }} className="text-zinc-500 hover:text-red-400"><X className="w-3 h-3" /></button>
                      </div>);
                    })}
                    {createLines.length === 0 && <p className="text-xs text-zinc-600">No line items yet. Add products below.</p>}
                  </div>
                  <div className="mt-3 flex flex-wrap gap-1">
                    {products.filter(function(p) { return p.brandId === createBrandId && !createLines.some(function(l) { return l.productId === p.id; }); }).slice(0, 10).map(function(p) { return (
                      <button key={p.id} onClick={function() { addLine(p.id); }} className="bg-ink-900 border border-white/[0.06] rounded px-2 py-1 text-ds-micro text-zinc-300 hover:border-brass-500/40">{p.name} <span className="text-zinc-500">+</span></button>
                    );})}
                  </div>
                </div>
              )}
            </div>
            <div className="flex items-center justify-between px-5 py-3 border-t border-white/[0.06]">
              <p className="text-ds-micro text-zinc-700">
                {canCurrentUserMutate ? 'Admin action on behalf of brand' : 'View-only staff — creating is refused'}
              </p>
              <div className="flex gap-2">
                <Button variant="ghost" className="text-ds-micro" onClick={function() { setShowCreate(false); }}>Cancel</Button>
                <Button className="text-ds-micro" disabled={!canCurrentUserMutate || !createBrandId || createLines.length === 0} onClick={handleCreate}>
                  <Package className="w-3 h-3 mr-1" /> Create PO
                </Button>
              </div>
            </div>
          </Card>
        </div>
      )}
    </WorkspaceFrame>
  );
}

/* ── RECORD PREVIEW BODY ────────────────────────────────────────────────────
 * Only the sections a purchase order genuinely supports are rendered (summary,
 * lines, finance, logistics, activity). Nothing is invented and no empty
 * placeholder section is shown: a section with no real rows simply does not
 * appear.
 */
function PoPreviewBody({
  po,
  brandName,
  deductions,
  shipments,
}: {
  po: PurchaseOrder;
  brandName: string;
  deductions: Deduction[];
  shipments: DemoShipment[];
}) {
  const status = poStatusPresentation(po.status);
  const hoursLeft = Math.floor(
    (new Date(po.orderDate).getTime() + 24 * 3600 * 1000 - Date.now()) / 3600000
  );
  const ackWindow = ackWindowPresentation(
    Boolean(po.acknowledgedAt),
    Math.max(0, hoursLeft),
    Math.max(0, Math.floor(((hoursLeft % 1) * 60) | 0))
  );
  const deductionsTotal = deductions.reduce(function(sum, d) { return sum + d.amountGbp; }, 0);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <StatusBadge dataStatus={status.dataStatus} tone={status.tone}>
          {status.label}
        </StatusBadge>
        <StatusBadge dataStatus={ackWindow.dataStatus} tone={ackWindow.tone}>
          {ackWindow.label}
        </StatusBadge>
        {po.simulated === true && (
          <span className="rounded border border-brass-500/20 bg-brass-500/15 px-1.5 py-0.5 text-ds-micro text-brass-400">
            (sim)
          </span>
        )}
      </div>

      <RecordFieldList
        fields={[
          { label: 'Brand', value: brandName },
          { label: 'Order date', value: po.orderDate || '—' },
          { label: 'Order value', value: `GBP ${po.poValue.toLocaleString()}` },
          { label: 'Commission', value: `${po.commissionRate}% · GBP ${po.commissionAmount.toLocaleString()}` },
          { label: 'Line items', value: String(po.lineItems.length) },
          { label: 'Freight term', value: po.freightTerm ? po.freightTerm.replace(/_/g, ' ') : '—' },
          { label: 'Acknowledged', value: po.acknowledgedAt ? po.acknowledgedAt.slice(0, 16).replace('T', ' ') : 'Not yet' },
          {
            label: 'Ship / delivery window',
            value:
              po.freightTerm === 'collect'
                ? [po.shipWindowStart, po.shipWindowEnd].filter(Boolean).join(' → ') || '—'
                : [po.deliveryWindowStart, po.deliveryWindowEnd].filter(Boolean).join(' → ') || '—',
          },
        ]}
      />

      <section aria-label="Lines">
        <h3 className="mb-1.5 text-ds-label font-semibold uppercase tracking-[0.14em] text-zinc-400">
          Lines
        </h3>
        <div className="overflow-hidden rounded-ds-md border border-white/[0.06]">
          <table className="w-full text-left text-ds-label">
            <thead className="bg-white/[0.02] text-ds-micro uppercase tracking-wider text-zinc-500">
              <tr>
                <th scope="col" className="px-2 py-1.5">SKU</th>
                <th scope="col" className="px-2 py-1.5">Product</th>
                <th scope="col" className="px-2 py-1.5 text-right">Qty</th>
                <th scope="col" className="px-2 py-1.5 text-right">Unit</th>
                <th scope="col" className="px-2 py-1.5">Ack</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/[0.04]">
              {po.lineItems.map(function(line) {
                const ack = ackStatusPresentation(line.ackStatus);
                return (
                  <tr key={line.sku}>
                    <td className="px-2 py-1.5 font-mono text-zinc-400">{line.sku}</td>
                    <td className="px-2 py-1.5 text-zinc-200">{line.productName}</td>
                    <td className="px-2 py-1.5 text-right font-mono text-zinc-300">{line.quantity}</td>
                    <td className="px-2 py-1.5 text-right font-mono text-zinc-300">
                      {line.unitPrice.toFixed(2)}
                    </td>
                    <td className="px-2 py-1.5">
                      <StatusBadge className="text-ds-micro" dataStatus={ack.dataStatus} tone={ack.tone}>
                        {ack.label}
                      </StatusBadge>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>

      {(deductions.length > 0 || shipments.length > 0) && (
        <section aria-label="Finance and logistics">
          <h3 className="mb-1.5 text-ds-label font-semibold uppercase tracking-[0.14em] text-zinc-400">
            Finance &amp; logistics
          </h3>
          <RecordFieldList
            fields={[
              { label: 'Deductions', value: `${deductions.length} · GBP ${deductionsTotal.toFixed(2)}` },
              { label: 'Shipments', value: String(shipments.length) },
            ]}
          />
          {shipments.length > 0 && (
            <ul className="mt-2 space-y-1">
              {shipments.map(function(s) {
                return (
                  <li key={s.id} className="flex flex-wrap items-center gap-2 text-ds-label">
                    <span className="font-mono text-zinc-400">{s.reference}</span>
                    <span className="text-zinc-300">{s.carrier}</span>
                    <span className="text-zinc-500">{s.status}</span>
                    {s.delayed && <span className="text-amber-400">delayed</span>}
                    {s.exception && <span className="text-red-400">exception</span>}
                  </li>
                );
              })}
            </ul>
          )}
        </section>
      )}

      <section aria-label="Activity">
        <h3 className="mb-1.5 text-ds-label font-semibold uppercase tracking-[0.14em] text-zinc-400">
          Activity
        </h3>
        <ActivityFeed
          entries={[
            ...(po.orderDate
              ? [{ id: 'raised', title: 'Purchase order raised', meta: brandName, at: po.orderDate }]
              : []),
            ...(po.acknowledgedAt
              ? [{ id: 'ack', title: 'Acknowledged', meta: 'Line-level acknowledgment recorded', at: po.acknowledgedAt }]
              : []),
          ]}
        />
      </section>
    </div>
  );
}