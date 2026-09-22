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
import { Badge, Button, Card, StatusBadge } from '@/components/ui';
import {
  ackDeadlinePresentation,
  ackStatusPresentation,
  poStatusPresentation,
  PO_STATUS_ORDER,
} from '@/lib/statusPresentation';
import { BrandCommPanel } from '@/components/shared/BrandComm';
/**
 * §UI/UX Wave 2 completion — the brand PO list gains the established
 * QUEUE → PREVIEW (RecordDrawer) → ACT step. Only the record's own real fields
 * are shown; the existing inline acknowledgment/ASN workflow is untouched.
 */
import { RecordDrawer, RecordFieldList, MetricBand, SegmentedControl, WorkspaceFrame, WorkspaceHeader } from '@/components/shared/workspace';
import { CommerceSimulationPanel } from '@/components/shared/CommerceSimulationPanel';
import { ShippingCostEstimate } from '@/components/shared/ShippingCostEstimate';
import { RoutingRequestIndicator, RoutingRequestForm } from '@/components/shared/RoutingRequest';
import { downloadCsv } from '@/lib/csv';
import { cn } from '@/utils/cn';
import { CheckCircle2, FileText, MessageSquare, Phone, Truck } from 'lucide-react';
import { navigateProductView } from '@/lib/runtime/productRoutes';
import { MERCENTA_CARRIER_LABELS } from '@/config/shipping';
import { carrierOptionsForLane, selectCarrierForShipment } from '@/lib/shipping/carrierRouting';
import { backOrderAvailabilityLabel, canBackOrderLine } from '@/lib/commerce/backorderGate';

/**
 * §Canonical model §11 — a brand does NOT choose an arbitrary carrier. The
 * carrier is decided by the canonical routing rule; the select only ever
 * offers Mercenta carrier accounts (plus the Amazon-arranged partnered carrier
 * on Freight Collect POs). The rule itself lives in
 * `src/lib/shipping/carrierRouting.ts`, never here.
 */
function carrierOptionsForPO(po: PurchaseOrder, brandNation?: string) {
  const decision = selectCarrierForShipment({ brandNation });
  const options: { value: string; label: string }[] = carrierOptionsForLane(decision.lane).map(
    (o) => ({ value: o.value, label: o.label })
  );
  if (po.freightTerm === 'collect') {
    options.push({ value: 'amazon_partner', label: 'Partnered carrier (retail-channel-arranged freight)' });
  }
  return options;
}

/* §Phase D2 — PO status labels/tones now come from the canonical presentation
   layer (src/lib/statusPresentation.ts); the local STATUS_BADGE/STATUS_LABEL maps
   were a second source of truth for the same domain states. */

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
    MERCENTA_CARRIER_LABELS[v as keyof typeof MERCENTA_CARRIER_LABELS] ??
    (v === 'amazon_partner' ? 'Partnered carrier' : v);

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
  /**
   * §UI/UX Wave 2 completion — the brand's PO list is a real record surface, so
   * it gains the established QUEUE → PREVIEW → ACT step: the RecordDrawer previews
   * the real PO record and hands off to the existing inline acknowledgment/ASN
   * workflow (which is unchanged).
   */
  const [previewPO, setPreviewPO] = useState<string | null>(null);
  /** REAL density control — it changes the rendered PO card padding. */
  const [density, setDensity] = useState<'compact' | 'comfortable'>('compact');

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
    // §7D — acknowledgment auto-creates a shipment draft; invalidate the
    // shipments feed so LogisticsHub reflects it immediately.
    await qc.invalidateQueries({ queryKey: ['shipments'] });
  }

  function beginAsn(po: PurchaseOrder) {
    setAsnPO(po.id);
    const nation = brands.find((b) => b.id === po.brandId)?.nation;
    setAsnCarrier(selectCarrierForShipment({ brandNation: nation }).carrier);
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
    }, undefined, tenantId ?? undefined);
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
    // §7D — filed ASN creates a shipment; reflect it in the logistics feed.
    void qc.invalidateQueries({ queryKey: ['shipments'] });
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

  /** The PO record the preview drawer is showing (brand-scoped list only). */
  const previewRecord = pos.find((p) => p.id === previewPO) ?? null;

  /** §Stage-24 — 24-hour acknowledgment deadline, a real Vendor Central rule. */
  function AckDeadline({ orderDate }: { orderDate: string }) {
    const received = new Date(orderDate).getTime();
    const deadline = received + 24 * 60 * 60 * 1000;
    const hoursLeft = Math.ceil((deadline - Date.now()) / (60 * 60 * 1000));
    const ack = ackDeadlinePresentation(hoursLeft);
    return (
      <StatusBadge className="text-ds-micro" tone={ack.tone} dataStatus={ack.dataStatus}>
        {ack.label}
      </StatusBadge>
    );
  }

  return (
    <WorkspaceFrame>
      <WorkspaceHeader
        eyebrow="Brand workspace · Commerce"
        title="Purchase Orders"
        description="Review, accept or reject purchase orders from the UK retail network"
        meta={
          <>
            <span className="text-ds-label text-zinc-500">
              Showing <span className="font-mono text-zinc-300">{filteredPos.length}</span> of{' '}
              <span className="font-mono text-zinc-300">{pos.length}</span>
            </span>
            <span className="text-ds-label text-zinc-500">
              Queue value{' '}
              <span className="font-mono text-zinc-300">
                £{pos.reduce((sum, p) => sum + p.poValue, 0).toLocaleString()}
              </span>
            </span>
          </>
        }
        toolbar={
          <div className="flex flex-wrap items-center gap-2">
            <input
              value={poSearch}
              onChange={(e) => setPoSearch(e.target.value)}
              placeholder="Search PO number…"
              aria-label="Search purchase orders"
              className="bg-ink-900 border border-white/[0.08] rounded-md px-3 py-1.5 text-xs text-white w-52 focus:outline-none focus:border-brass-500/40"
            />
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              aria-label="Filter by status"
              className="bg-ink-900 border border-white/[0.08] rounded-md px-2 py-1.5 text-xs text-zinc-300 cursor-pointer"
            >
              <option value="all">Status: all</option>
              {PO_STATUS_ORDER.map((s) => (
                <option key={s} value={s}>{poStatusPresentation(s).label}</option>
              ))}
            </select>
            <span className="ml-auto flex items-center gap-2">
              <span className="hidden text-ds-micro uppercase tracking-[0.14em] text-zinc-600 sm:inline">
                Density
              </span>
              <SegmentedControl
                ariaLabel="Row density"
                active={density}
                onSelect={(id) => setDensity(id as 'compact' | 'comfortable')}
                items={[
                  { id: 'compact', label: 'Compact' },
                  { id: 'comfortable', label: 'Comfortable' },
                ]}
              />
              <Button
                variant="ghost"
                className="text-ds-label text-zinc-400 hover:text-white"
                onClick={() =>
                  downloadCsv(
                    `mercenta-pos-${viewingBrandId_ ?? 'all'}.csv`,
                    ['PO', 'Date', 'Status', 'Lines', 'Value GBP'],
                    filteredPos.map((p) => [
                      p.poNumber,
                      p.orderDate,
                      poStatusPresentation(p.status).label,
                      p.lineItems.length,
                      p.poValue,
                    ])
                  )
                }
              >
                Export CSV
              </Button>
            </span>
          </div>
        }
      />

      {/* §UI/UX Wave 2 completion — interactive metric band. Deliberately carries
          NO tone/statusText: this surface's machine-readable status vocabulary
          must stay exactly the canonical PO/ack vocabulary the status-semantics
          contract asserts. */}
      <MetricBand
        columns={4}
        items={[
          {
            id: 'brand-po-total',
            label: 'Purchase orders',
            value: String(pos.length),
            context: 'All orders',
            onOpen: () => { setStatusFilter('all'); setPoSearch(''); },
          },
          {
            id: 'brand-po-actionable',
            label: 'Received',
            value: String(pos.filter((p) => p.status === 'received').length),
            context: 'Awaiting your decision',
            onOpen: () => setStatusFilter('received'),
          },
          {
            id: 'brand-po-review',
            label: 'Under review',
            value: String(pos.filter((p) => p.status === 'under_review').length),
            context: 'Decision in progress',
            onOpen: () => setStatusFilter('under_review'),
          },
          {
            id: 'brand-po-value',
            label: 'Queue value',
            value: `£${pos.reduce((sum, p) => sum + p.poValue, 0).toLocaleString()}`,
            context: 'Net order value',
            onOpen: () => { setStatusFilter('all'); setPoSearch(''); },
          },
        ]}
      />

      {notice && (
        <div role="status" className="mt-3 bg-sky-500/10 border border-sky-500/20 rounded-lg p-3 text-xs text-sky-200">
          {notice}
        </div>
      )}

      {/* PO list */}
      <div className="mt-3 space-y-3">
        {filteredPos.map((po) => {
          const canAct = actionable(po);
          const expanded = expandedPO === po.id;
          const isFinanced =
            brands.find((b) => b.id === viewingBrandId_)?.track === 'financed';
          return (
            <div key={po.id} data-density={density}>
            <Card className={cn(density === 'compact' ? 'p-3' : 'p-4')}>
              <div className="flex flex-wrap items-center justify-between gap-3">
                <button
                  className="text-left min-w-0"
                  onClick={() => setExpandedPO(expanded ? null : po.id)}
                >
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-xs text-brass">{po.poNumber}</span>
                    <StatusBadge
                      className="text-ds-micro"
                      dataStatus={poStatusPresentation(po.status).dataStatus}
                      tone={poStatusPresentation(po.status).tone}
                    >
                      {poStatusPresentation(po.status).label}
                    </StatusBadge>
                    {/* §Phase E6 (G1) — truthful simulation provenance, taken ONLY
                        from the canonical PO flag. Additive: this adds no control
                        and does not change the DOM order of any existing button or
                        input (the E4 lesson). */}
                    {po.simulated === true && (
                      <Badge className="text-ds-micro bg-brass-500/15 text-brass-400 border-brass-500/20">(sim)</Badge>
                    )}
                  </div>
                  <div className="font-mono text-ds-micro text-zinc-600 mt-1">
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
                  {/*
                    §Dashboard-cleanup P0 — the brand's ACTUAL next step after
                    accepting a PO: open its shipping documents in the Logistics
                    Hub. The old post-acceptance experience ended on a deadline
                    note, which told the brand nothing they could act on.
                  */}
                  {(po.status === 'accepted' || po.status === 'ready_to_fulfil') && (
                    <div className="mt-2">
                      <Button
                        variant="secondary"
                        className="text-xs"
                        data-testid={`po-open-documents-${po.poNumber}`}
                        onClick={() =>
                          navigateProductView('brand', 'logistics', { po: po.poNumber })
                        }
                      >
                        <FileText className="w-3.5 h-3.5 mr-1.5" />
                        Open shipping documents
                      </Button>
                    </div>
                  )}
                </button>
                <div className="flex items-center gap-3">
                  {po.status === 'rejected' && (
                    <Badge className="text-ds-micro bg-red-500/15 text-red-300 border-red-500/20 max-w-[220px] truncate">
                      {po.rejectionReason}
                    </Badge>
                  )}
                  {/* §Stage-24 — 24-hour acknowledgment deadline countdown */}
                  {canAct && <AckDeadline orderDate={po.orderDate} />}
                  <Button
                    variant="ghost"
                    className="text-ds-label"
                    data-state={`brand-po-preview-${po.id}`}
                    onClick={() => setPreviewPO(po.id)}
                  >
                    Preview
                  </Button>
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
                  <p className="text-ds-label text-emerald-200">
                    Acknowledge each line — Accepted, Rejected (reason code
                    required), or Backordered (scheduled ship date required).
                    Acknowledged quantity can never exceed the ordered quantity.
                  </p>
                  {po.lineItems.map((li) => {
                    const a = lineAcks[li.sku];
                    if (!a) return null;
                    /**
                     * §WAVE 3 — the backorder option is offered ONLY where the
                     * retail channel positively allows it on this line. The
                     * domain boundary enforces the same rule, so this is the
                     * visible half of one gate, not the gate itself.
                     */
                    const backOrderAllowed = canBackOrderLine(li);
                    return (
                      <div key={li.sku} className="flex flex-wrap items-center gap-2 text-ds-label">
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
                          data-testid={`po-ack-status-${li.sku}`}
                          data-backorder-allowed={backOrderAllowed ? 'true' : 'false'}
                        >
                          <option value="accepted">Accepted</option>
                          {backOrderAllowed && <option value="backordered">Backordered</option>}
                          <option value="rejected">Rejected</option>
                        </select>
                        {!backOrderAllowed && (
                          <span
                            className="text-ds-micro text-zinc-500"
                            data-testid={`po-backorder-blocked-${li.sku}`}
                          >
                            {backOrderAvailabilityLabel(li)}
                          </span>
                        )}
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
                  <p className="text-ds-label text-blue-200">
                    Advance Shipping Notice — carton quantities are validated
                    against your acknowledged amounts before submission; shortfalls
                    are logged automatically as potential shortage claims.
                  </p>
                  <table className="w-full text-ds-label">
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
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-2 text-ds-label">
                    <label className="text-zinc-500">Carrier
                      <select value={asnCarrier} onChange={(e) => setAsnCarrier(e.target.value)}
                        className="block w-full mt-0.5 bg-ink-900 border border-white/[0.08] rounded-md px-2 py-1 text-white">
                        {carrierOptionsForPO(po, brands.find((b) => b.id === po.brandId)?.nation).map((c) => (<option key={c.value} value={c.value}>{c.label}</option>))}
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
                    <label className="text-zinc-500">Lot number
                      <input value={asnLot} onChange={(e) => setAsnLot(e.target.value)}
                        placeholder="Required for Grocery / H&PC"
                        className="block w-full mt-0.5 bg-ink-900 border border-white/[0.08] rounded-md px-2 py-1 text-white font-mono" />
                    </label>
                    <label className="text-zinc-500">Expiry date
                      <input type="date" value={asnExpiry} onChange={(e) => setAsnExpiry(e.target.value)}
                        className="block w-full mt-0.5 bg-ink-900 border border-white/[0.08] rounded-md px-2 py-1 text-white" />
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
                      <p className="text-ds-micro font-medium text-amber-300 mb-1">Backorder Restock Deadlines</p>
                      <div className="space-y-1">
                        {po.lineItems.filter((l) => l.ackStatus === 'backordered' && l.backorderRestockDeadline).map((l) => {
                          const deadline = new Date(l.backorderRestockDeadline + 'T00:00:00Z');
                          const daysLeft = Math.ceil((deadline.getTime() - Date.now()) / 86400000);
                          return (
                            <div key={l.sku} className="flex items-center justify-between text-ds-micro">
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
                      <p className="text-ds-micro font-medium text-zinc-500 mb-1">Acknowledgment History</p>
                      <table className="w-full text-ds-micro">
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
                                    <StatusBadge
                                      className="text-ds-micro"
                                      dataStatus={ackStatusPresentation(h.ackStatus).dataStatus}
                                      tone={ackStatusPresentation(h.ackStatus).tone}
                                    >
                                      {ackStatusPresentation(h.ackStatus).label}
                                    </StatusBadge>
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
                    <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-lg p-3 text-ds-label text-emerald-200 flex items-start gap-2">
                      <CheckCircle2 className="w-4 h-4 mt-0.5 flex-shrink-0" />
                      <span>
                        Accepted — Mercenta is handling fulfilment and financing for this
                        purchase order. No shipment action is needed from you; payouts
                        follow your financed payment terms.
                      </span>
                    </div>
                  )}
                  {!isFinanced && po.status === 'accepted' && (
                    <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-3 text-ds-label text-blue-200 flex items-start gap-2">
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
            </div>
          );
        })}
        {filteredPos.length === 0 && (
          <Card className="p-8 text-center">
            <p className="text-xs text-zinc-600">No purchase orders for this brand yet.</p>
          </Card>
        )}
      </div>

      {/* §Phase E4 — the operational commerce simulation console (brand-facing).
          Deliberately rendered AFTER the PO list so the pre-existing PO/ASN
          control order (and every existing browser assertion that selects by
          control order) is unchanged. */}
      <CommerceSimulationPanel />

      {/* ── QUEUE → PREVIEW → ACT ──────────────────────────────────────────
          Previews the REAL brand-owned PO record. The inline acknowledgment /
          ASN workflow is untouched; the drawer's action simply opens it. */}
      <RecordDrawer
        open={previewRecord !== null}
        onClose={() => setPreviewPO(null)}
        title={previewRecord ? previewRecord.poNumber : ''}
        subtitle={previewRecord ? poStatusPresentation(previewRecord.status).label : undefined}
        testId="brand-po-record-drawer"
        footer={
          previewRecord ? (
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span className="text-ds-micro text-zinc-600">
                {previewRecord.simulated === true
                  ? 'Operational simulation record'
                  : 'Recorded purchase order'}
              </span>
              <div className="flex items-center gap-2">
                {actionable(previewRecord) && (
                  <Button
                    className="text-ds-micro"
                    data-state="brand-po-drawer-acknowledge"
                    onClick={() => {
                      beginAck(previewRecord);
                      setExpandedPO(previewRecord.id);
                      setPreviewPO(null);
                    }}
                  >
                    Acknowledge
                  </Button>
                )}
                <Button
                  variant="ghost"
                  className="text-ds-micro"
                  data-state="brand-po-drawer-open-record"
                  onClick={() => {
                    setExpandedPO(previewRecord.id);
                    setPreviewPO(null);
                  }}
                >
                  Open full record
                </Button>
              </div>
            </div>
          ) : undefined
        }
      >
        {previewRecord ? (
          <BrandPoPreviewBody
            po={previewRecord}
            carrierLabel={shipCarrierLabel}
          />
        ) : null}
      </RecordDrawer>
    </WorkspaceFrame>
  );
}

/* ── RECORD PREVIEW BODY ────────────────────────────────────────────────────
 * Only the sections a brand-owned purchase order genuinely supports. No
 * cross-tenant data and no admin-only fields are exposed here.
 */
function BrandPoPreviewBody({
  po,
  carrierLabel,
}: {
  po: PurchaseOrder;
  carrierLabel: (v: string) => string;
}) {
  const status = poStatusPresentation(po.status);
  const hoursLeft = Math.floor(
    (new Date(po.orderDate).getTime() + 24 * 3600 * 1000 - Date.now()) / 3600000
  );
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <StatusBadge dataStatus={status.dataStatus} tone={status.tone}>
          {status.label}
        </StatusBadge>
        {po.simulated === true && (
          <Badge className="text-ds-micro bg-brass-500/15 text-brass-400 border-brass-500/20">(sim)</Badge>
        )}
        {po.status === 'received' || po.status === 'under_review' ? (
          <StatusBadge dataStatus={hoursLeft <= 0 ? 'ack_overdue' : 'ack_due'} tone={hoursLeft <= 0 ? 'danger' : 'warning'}>
            {hoursLeft <= 0 ? 'Acknowledgment deadline passed' : `Acknowledge within ${hoursLeft}h`}
          </StatusBadge>
        ) : null}
      </div>

      <RecordFieldList
        fields={[
          { label: 'Order date', value: po.orderDate },
          { label: 'Order value', value: `£${po.poValue.toLocaleString()}` },
          { label: 'Line items', value: String(po.lineItems.length) },
          { label: 'Acknowledged', value: po.acknowledgedAt ? po.acknowledgedAt.slice(0, 16).replace('T', ' ') : 'Not yet' },
          { label: 'Freight term', value: po.freightTerm === 'collect' ? 'Freight Collect' : po.freightTerm === 'prepaid' ? 'Freight Prepaid' : '—' },
          {
            label: 'Ship window',
            value: po.freightTerm === 'collect'
              ? [po.shipWindowStart, po.shipWindowEnd].filter(Boolean).join(' → ') || '—'
              : '—',
          },
          {
            label: 'Delivery window',
            value: po.freightTerm === 'prepaid'
              ? [po.deliveryWindowStart, po.deliveryWindowEnd].filter(Boolean).join(' → ') || '—'
              : '—',
          },
          { label: 'Carrier route', value: carrierLabel(selectCarrierForShipment({}).carrier) },
        ]}
      />

      {po.rejectionReason && (
        <section aria-label="Rejection reason">
          <h3 className="mb-1.5 text-ds-label font-semibold uppercase tracking-[0.14em] text-zinc-400">
            Rejection reason
          </h3>
          <p className="text-ds-label leading-snug text-zinc-400">{po.rejectionReason}</p>
        </section>
      )}

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
              {po.lineItems.map((line) => {
                const ack = ackStatusPresentation(line.ackStatus);
                return (
                  <tr key={line.sku}>
                    <td className="px-2 py-1.5 font-mono text-zinc-400">{line.sku}</td>
                    <td className="px-2 py-1.5 text-zinc-200">{line.productName}</td>
                    <td className="px-2 py-1.5 text-right font-mono text-zinc-300">{line.quantity}</td>
                    <td className="px-2 py-1.5 text-right font-mono text-zinc-300">{line.unitPrice.toFixed(2)}</td>
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
    </div>
  );
}

