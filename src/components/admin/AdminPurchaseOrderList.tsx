/**
 * §Batch-10 — Admin Purchase Order Management.
 * Shows all POs across all brands with full detail, acknowledgment status,
 * ASN filing, and on-behalf actions. Replaces the old 3PL Terminal view.
 */
import { useState, useMemo } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useApp } from '@/context/GlobalStateContext';
import { useBrands, usePurchaseOrders, useDeductions, useProducts } from '@/data/queries';
import { createPurchaseOrder } from '@/data/api';
import { Button, Card } from '@/components/ui';
import { cn } from '@/utils/cn';
import { AdminPurchaseOrderDetail } from '@/components/admin/AdminPurchaseOrderDetail';
import { Search, Truck, Eye, Plus, X, Package } from 'lucide-react';

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
  const deductions = deductionsQuery.data?.data ?? [];
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [selectedPoId, setSelectedPoId] = useState<string | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [createBrandId, setCreateBrandId] = useState('');
  const [createLines, setCreateLines] = useState<{ productId: string; quantity: number }[]>([]);
  const [createNote, setCreateNote] = useState<string | null>(null);

  const brandName = (id: string) => brands.find((b) => b.id === id)?.profile.businessName ?? id;

  const grouped = useMemo(() => {
    const map = new Map<string, typeof pos>();
    let list = [...pos];
    if (statusFilter !== 'all') list = list.filter((p) => p.status === statusFilter);
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
  }, [pos, statusFilter, searchQuery, brands]);

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
    <div className="p-6 space-y-4 max-w-[1400px] mx-auto">
      <div className="flex items-center gap-3">
        <Truck className="w-5 h-5 text-brass-400" />
        <div>
          <h2 className="text-lg font-semibold text-white">Purchase Orders</h2>
          <p className="text-xs text-zinc-500 mt-0.5">
            {pos.length} POs across {brands.length} brands — create, manage, acknowledge, and file ASNs on behalf of brands
          </p>
        </div>
        <div className="ml-auto flex items-center gap-2">
          {createNote && <span className="text-[10px] text-emerald-400">{createNote}</span>}
          <Button className="text-[10px]" data-state="admin-po-create" disabled={!canCurrentUserMutate}
            title={canCurrentUserMutate ? undefined : 'View-only staff cannot create purchase orders'}
            onClick={function() { setShowCreate(true); }}>
            <Plus className="w-3 h-3 mr-1" /> Create PO
          </Button>
        </div>
      </div>

      <div className="flex items-center gap-3">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-zinc-500" />
          <input type="text" value={searchQuery} onChange={function(e) { setSearchQuery(e.target.value); }}
            placeholder="Search by PO number or brand…"
            className="w-full bg-ink-900 border border-white/[0.08] rounded-lg pl-8 pr-3 py-1.5 text-xs text-white placeholder-zinc-600 focus:outline-none focus:border-brass-500/40" />
        </div>
        <select value={statusFilter} onChange={function(e) { setStatusFilter(e.target.value); }}
          className="bg-ink-900 border border-white/[0.08] rounded-md px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-brass-500/40">
          <option value="all">All Statuses</option>
          {STATUS_ORDER.map(function(s) { return (<option key={s} value={s}>{s.replace(/_/g, ' ')}</option>); })}
        </select>
      </div>

      <div className="space-y-3">
        {grouped.map(function([brandId, brandPos]) { return (
          <Card key={brandId} title={brandName(brandId)}>
            <div className="divide-y divide-white/[0.04]">
              {brandPos.map(function(po) {
                const poDeductions = deductions.filter(function(d) { return d.purchaseOrderId === po.id; });
                return (
                  <div key={po.id} className="flex items-center justify-between px-1 py-2.5 hover:bg-white/[0.02]">
                    <div className="flex items-center gap-3 min-w-0">
                      <span className="font-mono text-xs text-white font-medium">{po.poNumber}</span>
                      {/* §Phase E5 (G2) — truthful provenance on the admin PO list. */}
                      {po.simulated === true && (
                        <span className="text-[9px] px-1.5 py-0.5 rounded bg-brass-500/15 text-brass-400 border border-brass-500/20">(sim)</span>
                      )}
                      <span className={cn('text-[10px] px-1.5 py-0.5 rounded capitalize',
                        po.status === 'received' ? 'bg-blue-500/15 text-blue-300' :
                        po.status === 'accepted' ? 'bg-emerald-500/15 text-emerald-300' :
                        po.status === 'rejected' ? 'bg-red-500/15 text-red-300' :
                        po.status === 'shipped' || po.status === 'delivered' ? 'bg-purple-500/15 text-purple-300' :
                        'bg-amber-500/15 text-amber-300'
                      )}>{po.status.replace(/_/g, ' ')}</span>
                      <span className="font-mono text-[10px] text-zinc-500">GBP {po.poValue.toLocaleString()}</span>
                      <span className="text-[10px] text-zinc-600">{po.lineItems.length} items</span>
                      {po.acknowledgedAt && <span className="text-[9px] text-emerald-500/70">Acknowledged</span>}
                      {poDeductions.length > 0 && <span className="text-[9px] text-amber-500/70">{poDeductions.length} deduction(s)</span>}
                    </div>
                    <button onClick={function() { setSelectedPoId(po.id); }}
                      className="p-1.5 text-zinc-500 hover:text-white" title="View detail">
                      <Eye className="w-3.5 h-3.5" />
                    </button>
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
                <label className="text-[10px] text-zinc-500 font-medium mb-1 block">Brand</label>
                <select value={createBrandId} onChange={function(e) { setCreateBrandId(e.target.value); setCreateLines([]); }}
                  className="w-full bg-ink-900 border border-white/[0.08] rounded-md px-2.5 py-2 text-xs text-white">
                  <option value="">Select a brand…</option>
                  {brands.map(function(b) { return (<option key={b.id} value={b.id}>{b.profile.businessName}</option>); })}
                </select>
              </div>
              {createBrandId && (
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <label className="text-[10px] text-zinc-500 font-medium">Products / Line Items</label>
                  </div>
                  <div className="space-y-2">
                    {createLines.map(function(l, i) {
                      const p = products.find(function(pp) { return pp.id === l.productId; });
                      return (<div key={i} className="flex items-center gap-2 bg-white/[0.02] rounded-lg px-3 py-2">
                        <span className="text-xs text-zinc-300 flex-1">{p?.name ?? 'Unknown'}</span>
                        <input type="number" value={l.quantity} onChange={function(e) { updateQty(i, parseInt(e.target.value) || 1); }} className="w-16 bg-ink-900 border border-white/[0.08] rounded px-2 py-1 text-xs text-white text-center" min="1" />
                        <span className="text-[10px] text-zinc-500 font-mono w-16 text-right">GBP {(p?.exWorksPrice ?? 0).toFixed(2)}</span>
                        <button onClick={function() { removeLine(i); }} className="text-zinc-500 hover:text-red-400"><X className="w-3 h-3" /></button>
                      </div>);
                    })}
                    {createLines.length === 0 && <p className="text-xs text-zinc-600">No line items yet. Add products below.</p>}
                  </div>
                  <div className="mt-3 flex flex-wrap gap-1">
                    {products.filter(function(p) { return p.brandId === createBrandId && !createLines.some(function(l) { return l.productId === p.id; }); }).slice(0, 10).map(function(p) { return (
                      <button key={p.id} onClick={function() { addLine(p.id); }} className="bg-ink-900 border border-white/[0.06] rounded px-2 py-1 text-[9px] text-zinc-300 hover:border-brass-500/40">{p.name} <span className="text-zinc-500">+</span></button>
                    );})}
                  </div>
                </div>
              )}
            </div>
            <div className="flex items-center justify-between px-5 py-3 border-t border-white/[0.06]">
              <p className="text-[8px] text-zinc-700">
                {canCurrentUserMutate ? 'Admin action on behalf of brand' : 'View-only staff — creating is refused'}
              </p>
              <div className="flex gap-2">
                <Button variant="ghost" className="text-[10px]" onClick={function() { setShowCreate(false); }}>Cancel</Button>
                <Button className="text-[10px]" disabled={!canCurrentUserMutate || !createBrandId || createLines.length === 0} onClick={handleCreate}>
                  <Package className="w-3 h-3 mr-1" /> Create PO
                </Button>
              </div>
            </div>
          </Card>
        </div>
      )}
    </div>
  );
}