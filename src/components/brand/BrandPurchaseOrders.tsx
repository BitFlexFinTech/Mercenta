import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useApp } from '@/context/GlobalStateContext';
import {
  acknowledgePurchaseOrder,
  createShipmentForPO,
  fetchBrands,
  fetchPurchaseOrders,
} from '@/data/api';
import type { PurchaseOrder } from '@/types';
import { PO_REJECTION_CODES } from '@/types';
import { Badge, Button, Card } from '@/components/ui';
import { BrandCommPanel } from '@/components/shared/BrandComm';
import { ShippingCostEstimate } from '@/components/shared/ShippingCostEstimate';
import { RoutingRequestIndicator, RoutingRequestForm } from '@/components/shared/RoutingRequest';
import { downloadCsv } from '@/lib/csv';
import { cn } from '@/utils/cn';
import { CheckCircle2, MessageSquare, Phone, Truck } from 'lucide-react';

const SHIP_CARRIERS: { value: string; label: string }[] = [
  { value: 'dhl', label: 'DHL Express (parcel/general)' },
  { value: 'fedex', label: 'FedEx' },
  { value: 'bak', label: 'BAK Logistics' },
  { value: 'palletline', label: 'Palletline (palletised freight)' },
  { value: 'amazon_partner', label: 'Partnered carrier' },
];

const STATUS_BADGE: Record<PurchaseOrder['status'], string> = {
  received: 'bg-blue-500/15 text-blue-300 border-blue-500/20',
  under_review: 'bg-amber-500/15 text-amber-300 border-amber-500/20',
  accepted: 'bg-emerald-500/15 text-emerald-300 border-emerald-500/20',
  rejected: 'bg-red-500/15 text-red-300 border-red-500/20',
  ready_to_fulfil: 'bg-purple-500/15 text-purple-300 border-purple-500/20',
  shipped: 'bg-cyan-500/15 text-cyan-300 border-cyan-500/20',
  delivered: 'bg-emerald-500/15 text-emerald-300 border-emerald-500/20',
};

const STATUS_LABEL: Record<PurchaseOrder['status'], string> = {
  received: 'Received',
  under_review: 'Under Review',
  accepted: 'Accepted',
  rejected: 'Rejected',
  ready_to_fulfil: 'Ready to Fulfil',
  shipped: 'Shipped',
  delivered: 'Delivered',
};

export function BrandPurchaseOrders() {
  const qc = useQueryClient();
  const { session } = useApp();
  // §Stage-20.3 SECURITY FIX — a brand sees ONLY its own POs. The previous
  // all-brands <select> was a cross-tenant data leak (Stage 23 isolation).
  const tenantId = session?.tier === 'brand' ? session.tenantId : null;
  const brandsQuery = useQuery({ queryKey: ['brands'], queryFn: fetchBrands });
  const poQuery = useQuery({ queryKey: ['purchase_orders'], queryFn: fetchPurchaseOrders });

  const [expandedPO, setExpandedPO] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  /** §Stage-17 — inline brand contact per PO ('message' | 'call' | null). */
  const [contactingPO, setContactingPO] = useState<{ id: string; mode: 'message' | 'call' } | null>(null);
  /** §Stage-19.2 — search + status filter over the brand's PO list. */
  const [poSearch, setPoSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');

  const shipCarrierLabel = (v: string) =>
    SHIP_CARRIERS.find((c) => c.value === v)?.label ?? v;

  /* ── §Stage-24 — line-item acknowledgment state ── */
  const [ackingPO, setAckingPO] = useState<string | null>(null);
  const [lineAcks, setLineAcks] = useState<
    Record<string, { ackStatus: 'accepted' | 'rejected' | 'backordered'; acknowledgedQty: number; scheduledShipDate?: string; rejectionCode?: string; unitPrice?: number }>
  >({});
  /** §Stage-24 — ASN filing state per PO. */
  const [asnPO, setAsnPO] = useState<string | null>(null);
  const [asnCartons, setAsnCartons] = useState<Record<string, number>>({});
  const [asnCarrier, setAsnCarrier] = useState('dhl');
  const [asnShipDate, setAsnShipDate] = useState(new Date().toISOString().slice(0, 10));
  const [asnPro, setAsnPro] = useState('');
  const [asnBol, setAsnBol] = useState('');
  const [asnTrailer, setAsnTrailer] = useState('');
  const [asnLot, setAsnLot] = useState('');
  const [asnExpiry, setAsnExpiry] = useState('');
  /** §Routing Request — per-PO tracking for freight collect POs. */
  const [routingRequestFiledPOs, setRoutingRequestFiledPOs] = useState<Record<string, boolean>>({});

  function beginAck(po: PurchaseOrder) {
    setAckingPO(po.id);
    const init: typeof lineAcks = {};
    for (const l of po.lineItems) {
      init[l.sku] = { ackStatus: 'accepted', acknowledgedQty: l.quantity, unitPrice: l.unitPrice };
    }
    setLineAcks(init);
  }

  async function submitAck(po: PurchaseOrder) {
    const result = acknowledgePurchaseOrder(
      po.id,
      Object.entries(lineAcks).map(([sku, a]) => ({
        sku,
        ...a,
        rejectionCode: a.rejectionCode as import('@/types').PoRejectionCode | undefined,
      }))
    );
    if (!result.ok) {
      setNotice(result.error ?? 'Acknowledgment failed.');
      return;
    }
    const warnings = result.warnings;
    setNotice(
      [
        'Acknowledgment submitted.',
        ...(warnings ?? []),
      ].join(' • ')
    );
    setAckingPO(null);
    await qc.invalidateQueries({ queryKey: ['purchase_orders'] });
  }

  function beginAsn(po: PurchaseOrder) {
    setAsnPO(po.id);
    setAsnCarrier('dhl');
    setAsnShipDate(new Date().toISOString().slice(0, 10));
    setAsnPro(`PRO-${po.poNumber}`);
    setAsnBol(`BOL-${po.poNumber}`);
    setAsnTrailer('');
    setAsnLot('');
    setAsnExpiry('');
    const qtyInit: Record<string, number> = {};
    for (const l of po.lineItems) {
      if (l.ackStatus !== 'rejected') {
        qtyInit[l.sku] = l.acknowledgedQty ?? l.quantity;
      }
    }
    setAsnCartons(qtyInit);
  }

  function handleShip(poId: string) {
    const po = pos.find((p) => p.id === poId);
    if (!po) return;
    const asnBrand = brands.find((b) => b.id === viewingBrandId_);
    const needsLot = asnBrand && ['Grocery', 'Health & Personal Care'].includes(asnBrand.category);
    if (needsLot && (!asnLot.trim() || !asnExpiry)) {
      setNotice('Lot number and expiry date are required for perishable/regulated categories.');
      return;
    }
    const result = createShipmentForPO(poId, {
      cartons: Object.entries(asnCartons)
        .filter(([, q]) => q > 0)
        .map(([sku, quantity]) => ({ sku, quantity, weightKg: Math.max(1, Math.round(quantity * 0.4)), lengthCm: 40, widthCm: 30, heightCm: 25 })),
      shipDate: asnShipDate,
      carrier: asnCarrier,
      proNumber: asnPro || undefined,
      bolNumber: asnBol || undefined,
      trailerNumber: asnTrailer || undefined,
      lotNumber: asnLot || undefined,
      expiryDate: asnExpiry || undefined,
    });
    if (!result.ok) {
      setNotice(result.error ?? 'ASN submission failed.');
      return;
    }
    setNotice(
      [
        `ASN filed via ${shipCarrierLabel(asnCarrier)} — visible to your 3PL team.`,
        ...result.warnings,
        result.deductionId ? `Shortfall logged as deduction ${result.deductionId} — Mercenta will dispute or accept it.` : '',
      ]
        .filter(Boolean)
        .join(' ')
    );
    setAsnPO(null);
    void qc.invalidateQueries({ queryKey: ['purchase_orders'] });
    void qc.invalidateQueries({ queryKey: ['deductions'] });
  }

  const brands = brandsQuery.data?.data ?? [];
  // §Stage-20.3 — tenant-pinned: the brand's own id, always.
  const viewingBrandId_ = tenantId ?? brands[0]?.id ?? null;
  const allPOs = poQuery.data?.data ?? [];
  const pos = allPOs.filter((p) => p.brandId === viewingBrandId_);
  const filteredPos = pos
    .filter((p) => statusFilter === 'all' || p.status === statusFilter)
    .filter(
      (p) =>
        poSearch.trim() === '' ||
        p.poNumber.toLowerCase().includes(poSearch.trim().toLowerCase())
    );

  const actionable = (po: PurchaseOrder) =>
    po.status === 'received' || po.status === 'under_review';

  /** §Stage-24 — 24-hour acknowledgment deadline, a real Vendor Central rule. */
  function AckDeadline({ orderDate }: { orderDate: string }) {
    const received = new Date(orderDate).getTime();
    const deadline = received + 24 * 60 * 60 * 1000;
    const hoursLeft = Math.ceil((deadline - Date.now()) / (60 * 60 * 1000));
    if (hoursLeft <= 0) {
      return (
        <Badge className="text-[10px] bg-red-500/15 text-red-300 border-red-500/20">
          Ack deadline PASSED — risk of forced cancellation
        </Badge>
      );
    }
    const urgent = hoursLeft <= 6;
    return (
      <Badge
        className={cn(
          'text-[10px]',
          urgent
            ? 'bg-red-500/15 text-red-300 border-red-500/20'
            : 'bg-amber-500/15 text-amber-300 border-amber-500/20'
        )}
      >
        Ack within {hoursLeft}h
      </Badge>
    );
  }

  return (
    <div className="p-6 space-y-4 max-w-[1400px] mx-auto">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold text-white">Purchase Orders</h2>
          <p className="text-xs text-zinc-500 mt-0.5">
            Review, accept or reject purchase orders from the UK retail network
          </p>
        </div>
      </div>

      {/* §Stage-19.2 + 19.8 — search, status filter, CSV export */}
      <div className="flex flex-wrap items-center gap-2">
        <input
          value={poSearch}
          onChange={(e) => setPoSearch(e.target.value)}
          placeholder="Search PO number…"
          className="bg-ink-900 border border-white/[0.08] rounded-md px-3 py-1.5 text-xs text-white w-52 focus:outline-none focus:border-brass-500/40"
        />
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="bg-ink-900 border border-white/[0.08] rounded-md px-2 py-1.5 text-xs text-zinc-300 cursor-pointer"
        >
          <option value="all">Status: all</option>
          {Object.keys(STATUS_LABEL).map((s) => (
            <option key={s} value={s}>{STATUS_LABEL[s as PurchaseOrder['status']]}</option>
          ))}
        </select>
        <Button
          variant="ghost"
          className="text-[11px] text-zinc-400 hover:text-white ml-auto"
          onClick={() =>
            downloadCsv(
              `mercenta-pos-${viewingBrandId_ ?? 'all'}.csv`,
              ['PO', 'Date', 'Status', 'Lines', 'Value GBP'],
              filteredPos.map((p) => [
                p.poNumber,
                p.orderDate,
                STATUS_LABEL[p.status],
                p.lineItems.length,
                p.poValue,
              ])
            )
          }
        >
          Export CSV
        </Button>
        <span className="text-[10px] text-zinc-600">{filteredPos.length} PO(s)</span>
      </div>

      {notice && (
        <div className="bg-sky-500/10 border border-sky-500/20 rounded-lg p-3 text-xs text-sky-200">
          {notice}
        </div>
      )}

      {/* PO list */}
      <div className="space-y-3">
        {filteredPos.map((po) => {
          const canAct = actionable(po);
          const expanded = expandedPO === po.id;
          const isFinanced =
            brands.find((b) => b.id === viewingBrandId_)?.track === 'financed';
          return (
            <Card key={po.id} className="p-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <button
                  className="text-left min-w-0"
                  onClick={() => setExpandedPO(expanded ? null : po.id)}
                >
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-xs text-brass">{po.poNumber}</span>
                    <Badge className={cn('text-[10px]', STATUS_BADGE[po.status])}>
                      {STATUS_LABEL[po.status]}
                    </Badge>
                  </div>
                  <div className="font-mono text-[10px] text-zinc-600 mt-1">
                    {po.orderDate} · {po.lineItems.length} line item(s)
                    {po.freightTerm && (
                      <span className="ml-2 text-zinc-500">
                        · {po.freightTerm === 'collect' ? 'Freight Collect' : 'Freight Prepaid'}
                        {po.freightTerm === 'collect' && po.shipWindowEnd
                          ? ` · Ship by ${new Date(po.shipWindowEnd).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}`
                          : po.freightTerm === 'prepaid' && po.deliveryWindowEnd
                          ? ` · Deliver by ${new Date(po.deliveryWindowEnd).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}`
                          : ''}
                      </span>
                    )}
                  </div>
                  {po.freightTerm === 'collect' && (
                    <div className="mt-1">
                      <RoutingRequestIndicator
                        poFreightTerm={po.freightTerm}
                        shipWindowEnd={po.shipWindowEnd}
                        routingRequestFiled={!!routingRequestFiledPOs[po.id]}
                      />
                    </div>
                  )}
                </button>
                <div className="flex items-center gap-3">
                  {po.status === 'rejected' && (
                    <Badge className="text-[10px] bg-red-500/15 text-red-300 border-red-500/20 max-w-[220px] truncate">
                      {po.rejectionReason}
                    </Badge>
                  )}
                  {/* §Stage-24 — 24-hour acknowledgment deadline countdown */}
                  {canAct && <AckDeadline orderDate={po.orderDate} />}
                  <span className="font-mono text-sm font-semibold text-white">
                    £{po.poValue.toLocaleString()}
                  </span>
                  {canAct && (
                    <Button
                      onClick={() => (ackingPO === po.id ? submitAck(po) : beginAck(po))}
                      className={cn('text-xs', ackingPO === po.id && 'bg-emerald-500/20')}
                    >
                      <CheckCircle2 className="w-3.5 h-3.5 mr-1" />
                      {ackingPO === po.id ? 'Submit acknowledgment' : 'Acknowledge'}
                    </Button>
                  )}
                  {!canAct &&
                    po.status !== 'rejected' &&
                    (po.status === 'accepted' || po.status === 'ready_to_fulfil') &&
                    !isFinanced && (
                      <Button
                        onClick={() => (asnPO === po.id ? handleShip(po.id) : beginAsn(po))}
                        className="text-xs"
                      >
                        <Truck className="w-3.5 h-3.5 mr-1.5" />
                        {asnPO === po.id ? 'File ASN' : 'Create Shipment'}
                      </Button>
                    )}
                  {/* §Stage-17 — contact the brand about THIS PO, inline. */}
                  <div className="flex gap-1">
                    <Button
                      variant="ghost"
                      className="text-xs text-zinc-400 hover:text-white"
                      onClick={() =>
                        setContactingPO(
                          contactingPO?.id === po.id && contactingPO.mode === 'message'
                            ? null
                            : { id: po.id, mode: 'message' }
                        )
                      }
                    >
                      <MessageSquare className="w-3.5 h-3.5 mr-1" /> Message
                    </Button>
                    <Button
                      variant="ghost"
                      className="text-xs text-zinc-400 hover:text-white"
                      onClick={() =>
                        setContactingPO(
                          contactingPO?.id === po.id && contactingPO.mode === 'call'
                            ? null
                            : { id: po.id, mode: 'call' }
                        )
                      }
                    >
                      <Phone className="w-3.5 h-3.5 mr-1" /> Log call
                    </Button>
                  </div>
                </div>
              </div>

              {/* Inline brand communication (shared layer, same thread as Messages Hub) */}
              {contactingPO?.id === po.id && (
                <div className="mt-3 pt-3 border-t border-white/[0.05]">
                  <BrandCommPanel
                    brandId={po.brandId}
                    compact
                    poRef={po.poNumber}
                  />
                </div>
              )}

              {/* §Stage-24 — line-item acknowledgment panel */}
              {ackingPO === po.id && canAct && (
                <div className="mt-3 bg-emerald-500/10 border border-emerald-500/20 rounded-lg p-3 space-y-3">
                  <p className="text-[11px] text-emerald-200">
                    Acknowledge each line — Accepted, Rejected (reason code
                    required), or Backordered (scheduled ship date required).
                    Acknowledged quantity can never exceed the ordered quantity.
                  </p>
                  {po.lineItems.map((li) => {
                    const a = lineAcks[li.sku];
                    if (!a) return null;
                    return (
                      <div key={li.sku} className="flex flex-wrap items-center gap-2 text-[11px]">
                        <span className="font-mono text-zinc-300 w-20">{li.sku}</span>
                        <span className="text-zinc-500 w-40 truncate">{li.productName}</span>
                        <select
                          value={a.ackStatus}
                          onChange={(e) =>
                            setLineAcks((prev) => ({
                              ...prev,
                              [li.sku]: {
                                ...prev[li.sku],
                                ackStatus: e.target.value as 'accepted' | 'rejected' | 'backordered',
                              },
                            }))
                          }
                          className="bg-ink-900 border border-white/[0.08] rounded-md px-1.5 py-1 text-xs text-white"
                        >
                          <option value="accepted">Accepted</option>
                          <option value="backordered">Backordered</option>
                          <option value="rejected">Rejected</option>
                        </select>
                        {a.ackStatus !== 'rejected' && (
                          <label className="text-zinc-500">
                            Qty
                            <input
                              type="number"
                              min={1}
                              max={li.quantity}
                              value={a.acknowledgedQty}
                              onChange={(e) =>
                                setLineAcks((prev) => ({
                                  ...prev,
                                  [li.sku]: { ...prev[li.sku], acknowledgedQty: Number(e.target.value) },
                                }))
                              }
                              className="w-16 ml-1 bg-ink-900 border border-white/[0.08] rounded-md px-2 py-1 text-white"
                            />
                            <span className="ml-1">/ {li.quantity}</span>
                          </label>
                        )}
                        {/* §Batch-3 — unit price input for cost-price consistency check */}
                        {a.ackStatus !== 'rejected' && (
                          <label className="text-zinc-500">
                            Unit price £
                            <input
                              type="number"
                              min={0.01}
                              step={0.01}
                              value={a.unitPrice ?? li.unitPrice}
                              onChange={(e) =>
                                setLineAcks((prev) => ({
                                  ...prev,
                                  [li.sku]: { ...prev[li.sku], unitPrice: Number(e.target.value) },
                                }))
                              }
                              className="w-20 ml-1 bg-ink-900 border border-white/[0.08] rounded-md px-2 py-1 text-white"
                            />
                          </label>
                        )}
                        {a.ackStatus === 'backordered' && (
                          <label className="text-zinc-500">
                            Ship by
                            <input
                              type="date"
                              value={a.scheduledShipDate ?? ''}
                              onChange={(e) =>
                                setLineAcks((prev) => ({
                                  ...prev,
                                  [li.sku]: { ...prev[li.sku], scheduledShipDate: e.target.value },
                                }))
                              }
                              className="ml-1 bg-ink-900 border border-white/[0.08] rounded-md px-2 py-1 text-white"
                            />
                          </label>
                        )}
                        {a.ackStatus === 'rejected' && (
                          <select
                            value={a.rejectionCode ?? ''}
                            onChange={(e) =>
                              setLineAcks((prev) => ({
                                ...prev,
                                [li.sku]: { ...prev[li.sku], rejectionCode: e.target.value },
                              }))
                            }
                            className="bg-ink-900 border border-white/[0.08] rounded-md px-1.5 py-1 text-xs text-white"
                          >
                            <option value="">Rejection code…</option>
                            {PO_REJECTION_CODES.map((c) => (
                              <option key={c} value={c}>{c.replace(/([A-Z])/g, ' $1').trim()}</option>
                            ))}
                          </select>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}

              {/* §Stage-24 — ASN filing form (carton detail + tracking) */}
              {asnPO === po.id && (
                <div className="mt-3 bg-blue-500/10 border border-blue-500/20 rounded-lg p-3 space-y-2">
                  <p className="text-[11px] text-blue-200">
                    Advance Shipping Notice — carton quantities are validated
                    against your acknowledged amounts before submission; shortfalls
                    are logged automatically as potential shortage claims.
                  </p>
                  <table className="w-full text-[11px]">
                    <thead>
                      <tr className="text-zinc-500">
                        <th className="text-left py-1">SKU</th>
                        <th className="text-right py-1">Ack.</th>
                        <th className="text-right py-1">Carton qty</th>
                      </tr>
                    </thead>
                    <tbody>
                      {po.lineItems
                        .filter((l) => l.ackStatus !== 'rejected')
                        .map((l) => (
                          <tr key={l.sku}>
                            <td className="py-1 font-mono text-zinc-400">{l.sku}</td>
                            <td className="py-1 text-right font-mono text-zinc-400">
                              {l.acknowledgedQty ?? l.quantity}
                            </td>
                            <td className="py-1 text-right">
                              <input
                                type="number"
                                min={0}
                                max={l.acknowledgedQty ?? l.quantity}
                                value={asnCartons[l.sku] ?? 0}
                                onChange={(e) =>
                                  setAsnCartons((prev) => ({ ...prev, [l.sku]: Number(e.target.value) }))
                                }
                                className="w-20 bg-ink-900 border border-white/[0.08] rounded-md px-2 py-1 text-white text-right"
                              />
                            </td>
                          </tr>
                        ))}
                    </tbody>
                  </table>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-2 text-[11px]">
                    <label className="text-zinc-500">Carrier
                      <select value={asnCarrier} onChange={(e) => setAsnCarrier(e.target.value)}
                        className="block w-full mt-0.5 bg-ink-900 border border-white/[0.08] rounded-md px-2 py-1 text-white">
                        {SHIP_CARRIERS.map((c) => (<option key={c.value} value={c.value}>{c.label}</option>))}
                      </select>
                    </label>
                    <label className="text-zinc-500">Ship date
                      <input type="date" value={asnShipDate} onChange={(e) => setAsnShipDate(e.target.value)}
                        className="block w-full mt-0.5 bg-ink-900 border border-white/[0.08] rounded-md px-2 py-1 text-white" />
                    </label>
                    <label className="text-zinc-500">PRO number
                      <input value={asnPro} onChange={(e) => setAsnPro(e.target.value)}
                        className="block w-full mt-0.5 bg-ink-900 border border-white/[0.08] rounded-md px-2 py-1 text-white font-mono" />
                    </label>
                    <label className="text-zinc-500">BOL number
                      <input value={asnBol} onChange={(e) => setAsnBol(e.target.value)}
                        className="block w-full mt-0.5 bg-ink-900 border border-white/[0.08] rounded-md px-2 py-1 text-white font-mono" />
                    </label>
                    <label className="text-zinc-500">Trailer / container
                      <input value={asnTrailer} onChange={(e) => setAsnTrailer(e.target.value)}
                        className="block w-full mt-0.5 bg-ink-900 border border-white/[0.08] rounded-md px-2 py-1 text-white font-mono" />
                    </label>
                  </div>
                  {/* §Routing Request — collect POs require routing request before ASN */}
                  <RoutingRequestForm
                    poFreightTerm={po.freightTerm}
                    shipWindowEnd={po.shipWindowEnd}
                    routingRequestFiled={!!routingRequestFiledPOs[po.id]}
                    onFile={() => setRoutingRequestFiledPOs((prev) => ({ ...prev, [po.id]: true }))}
                    onClose={() => {}}
                  />
                  <ShippingCostEstimate
                    carrier={asnCarrier as any}
                    totalWeightKg={po.lineItems.reduce((s, l) => s + ((l.acknowledgedQty ?? l.quantity) * 0.4), 0)}
                    totalCbm={po.lineItems.length * 0.05}
                    cartonCount={po.lineItems.filter((l) => l.ackStatus !== 'rejected').length}
                    compact
                  />
                </div>
              )}

              {/* Expanded detail + fulfillment-track branching */}
              {expanded && (
                <div className="mt-4 pt-3 border-t border-white/[0.05] space-y-3">
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="text-zinc-600">
                        <th className="text-left py-1">SKU</th>
                        <th className="text-left py-1">Product</th>
                        <th className="text-right py-1">Qty</th>
                        <th className="text-right py-1">Unit</th>
                        <th className="text-right py-1">Total</th>
                      </tr>
                    </thead>
                    <tbody>
                      {po.lineItems.map((li) => (
                        <tr key={li.sku}>
                          <td className="py-1 font-mono text-zinc-400">{li.sku}</td>
                          <td className="py-1 text-zinc-300">{li.productName}</td>
                          <td className="py-1 text-right font-mono">{li.quantity}</td>
                          <td className="py-1 text-right font-mono">£{li.unitPrice}</td>
                          <td className="py-1 text-right font-mono">
                            £{(li.quantity * li.unitPrice).toFixed(2)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>

                  {/* §30-day backorder restock deadline — visible countdown */}
                  {po.lineItems.some((l) => l.ackStatus === 'backordered' && l.backorderRestockDeadline) && (
                    <div className="border border-amber-500/20 bg-amber-500/5 rounded-lg p-2">
                      <p className="text-[10px] font-medium text-amber-300 mb-1">Backorder Restock Deadlines</p>
                      <div className="space-y-1">
                        {po.lineItems.filter((l) => l.ackStatus === 'backordered' && l.backorderRestockDeadline).map((l) => {
                          const deadline = new Date(l.backorderRestockDeadline + 'T00:00:00Z');
                          const daysLeft = Math.ceil((deadline.getTime() - Date.now()) / 86400000);
                          return (
                            <div key={l.sku} className="flex items-center justify-between text-[10px]">
                              <span className="font-mono text-zinc-400">{l.sku}</span>
                              <span className={daysLeft <= 0 ? 'text-red-400 font-medium' : daysLeft <= 7 ? 'text-amber-400' : 'text-zinc-500'}>
                                {daysLeft <= 0
                                  ? 'Visibility LOST — restock overdue'
                                  : daysLeft + ' day(s) to restock deadline (' + new Date(l.backorderRestockDeadline as string).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' }) + ')'
                                }
                              </span>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {/* §Batch-3 — Acknowledgment history per line */}
                  {po.lineItems.some((l) => l.ackHistory && l.ackHistory.length > 0) && (
                    <div className="border border-white/[0.06] rounded-lg p-2">
                      <p className="text-[10px] font-medium text-zinc-500 mb-1">Acknowledgment History</p>
                      <table className="w-full text-[10px]">
                        <thead>
                          <tr className="text-zinc-600">
                            <th className="text-left py-0.5">SKU</th>
                            <th className="text-center py-0.5">Date</th>
                            <th className="text-center py-0.5">Status</th>
                            <th className="text-right py-0.5">Qty</th>
                            <th className="text-right py-0.5">£/u</th>
                            <th className="text-left py-0.5">Code</th>
                          </tr>
                        </thead>
                        <tbody>
                          {po.lineItems
                            .filter((l) => l.ackHistory && l.ackHistory.length > 0)
                            .flatMap((l) =>
                              l.ackHistory!.map((h) => (
                                <tr key={`${l.sku}-${h.acknowledgedAt}`}>
                                  <td className="py-0.5 font-mono text-zinc-400">{l.sku}</td>
                                  <td className="py-0.5 text-center text-zinc-500">{h.acknowledgedAt.slice(0, 16).replace('T', ' ')}</td>
                                  <td className="py-0.5 text-center">
                                    <Badge className={cn('text-[9px]',
                                      h.ackStatus === 'accepted' ? 'bg-emerald-500/15 text-emerald-300' :
                                      h.ackStatus === 'backordered' ? 'bg-amber-500/15 text-amber-300' :
                                      'bg-red-500/15 text-red-300'
                                    )}>
                                      {h.ackStatus}
                                    </Badge>
                                  </td>
                                  <td className="py-0.5 text-right font-mono text-zinc-400">{h.acknowledgedQty}</td>
                                  <td className="py-0.5 text-right font-mono text-zinc-400">£{h.unitPrice.toFixed(2)}</td>
                                  <td className="py-0.5 text-zinc-500">{h.rejectionCode ?? '—'}</td>
                                </tr>
                              ))
                            )}
                        </tbody>
                      </table>
                    </div>
                  )}

                  {isFinanced && (po.status === 'accepted' || po.status === 'ready_to_fulfil') && (
                    <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-lg p-3 text-[11px] text-emerald-200 flex items-start gap-2">
                      <CheckCircle2 className="w-4 h-4 mt-0.5 flex-shrink-0" />
                      <span>
                        Accepted — Mercenta is handling fulfilment and financing for this
                        purchase order. No shipment action is needed from you; payouts
                        follow your financed payment terms.
                      </span>
                    </div>
                  )}
                  {!isFinanced && po.status === 'accepted' && (
                    <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-3 text-[11px] text-blue-200 flex items-start gap-2">
                      <Truck className="w-4 h-4 mt-0.5 flex-shrink-0" />
                      <span>
                        Direct fulfillment — create a shipment above to move this PO into
                        transit.
                      </span>
                    </div>
                  )}
                </div>
              )}
            </Card>
          );
        })}
        {filteredPos.length === 0 && (
          <Card className="p-8 text-center">
            <p className="text-xs text-zinc-600">No purchase orders for this brand yet.</p>
          </Card>
        )}
      </div>
    </div>
  );
}

