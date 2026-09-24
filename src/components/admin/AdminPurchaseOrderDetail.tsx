import { useMemo, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
/** §P13 — the order DATE is rendered through the ONE display helper. */
import { orderDateLabel } from '@/lib/dates';
import { useApp } from '@/context/GlobalStateContext';
import { useBrands, useCanonicalStoreVersion, useDeductions, usePurchaseOrders } from '@/data/queries';
import { acknowledgePurchaseOrder, createShipmentForPO } from '@/data/api';
import {
  listChannelInstructions,
  requeueChannelInstruction,
} from '@/lib/commerce/channelInstructions';
import { beginProxyProcessing, processChannelInstruction } from '@/lib/commerce/proxyProcessor';
import { Badge, Button, Card, StatusBadge } from '@/components/ui';
import {
  ackStatusPresentation,
  ackWindowPresentation,
  deductionStatusPresentation,
} from '@/lib/statusPresentation';
import { cn } from '@/utils/cn';
import type { PurchaseOrder, PurchaseOrderLineItem } from '@/types';
import { PO_REJECTION_CODES } from '@/types';
import { AlertTriangle, CheckCircle2, X, Truck, Gavel, History } from 'lucide-react';
import { carrierOptionsForLane, selectCarrierForShipment } from '@/lib/shipping/carrierRouting';
import { backOrderAvailabilityLabel, canBackOrderLine } from '@/lib/commerce/backorderGate';

/**
 * §Canonical model §11 — the on-behalf ASN offers only Mercenta carrier
 * accounts (rule-driven), plus Amazon-arranged freight on collect POs. The
 * routing rule itself is centralised in `src/lib/shipping/carrierRouting.ts`.
 */
function carrierOptionsForPO(po: PurchaseOrder) {
  const decision = selectCarrierForShipment({});
  const options: { value: string; label: string }[] = carrierOptionsForLane(decision.lane).map(
    (o) => ({ value: o.value, label: o.label })
  );
  if (po.freightTerm === 'collect') {
    options.push({ value: 'amazon_partner', label: 'Partnered carrier (Amazon-arranged freight)' });
  }
  return options;
}

interface Props {
  poId: string;
  onClose: () => void;
}

/** §Batch-0.5 — Admin PO Detail */
export function AdminPurchaseOrderDetail({ poId, onClose }: Props) {
  const qc = useQueryClient();
  const { actingStaff } = useApp();
  const brands = useBrands().data?.data ?? [];
  const pos = usePurchaseOrders().data?.data ?? [];
  const deductions = useDeductions().data?.data ?? [];
  const po = pos.find((p) => p.id === poId);
  const brandName = po
    ? (brands.find((b) => b.id === po.brandId)?.profile.businessName ?? po.brandId)
    : '';

  const [onBehalfAck, setOnBehalfAck] = useState(false);
  /**
   * §P4 — the brand's INSTRUCTION to Mercenta for this PO, and Mercenta's
   * outcome. The admin surface is where Mercenta's operational staff see and
   * recover the automated channel action.
   */
  const canonicalVersion = useCanonicalStoreVersion();
  void canonicalVersion; // §P4 — canonical change signal → re-read Mercenta's outcome
  const instruction = poId
    ? listChannelInstructions({ purchaseOrderId: poId }).find((i) => i.type === 'po_acknowledgement')
    : undefined;
  const [proxyNotice, setProxyNotice] = useState<string | null>(null);
  const [ackStatuses, setAckStatuses] = useState<Record<string, 'accepted' | 'rejected' | 'backordered'>>({});
  const [ackQtys, setAckQtys] = useState<Record<string, number>>({});
  const [ackPrices, setAckPrices] = useState<Record<string, number>>({});
  const [ackShipDates, setAckShipDates] = useState<Record<string, string>>({});
  const [ackRejectionCodes, setAckRejectionCodes] = useState<Record<string, string>>({});
  const [ackNotice, setAckNotice] = useState<string | null>(null);
const [onBehalfAsn, setOnBehalfAsn] = useState(false);
  const [asnCarrier, setAsnCarrier] = useState('dhl');
  const [asnShipDate, setAsnShipDate] = useState(new Date().toISOString().slice(0, 10));
  const [asnPro, setAsnPro] = useState('');
  const [asnBol, setAsnBol] = useState('');
  const [asnCartons, setAsnCartons] = useState<Record<string, number>>({});
  const [asnNotice, setAsnNotice] = useState<string | null>(null);
  // §Phase 4.2 — regulated Grocery / Health & Personal Care brands must supply
  // lot number + expiry date on the on-behalf ASN (mirrors the brand ASN form).
  const [asnLot, setAsnLot] = useState('');
  const [asnExpiry, setAsnExpiry] = useState('');

  const poDeductions = po ? deductions.filter((d) => d.purchaseOrderId === poId) : [];

  if (!po) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60" onClick={onClose}>
        <div className="bg-ink-850 border border-white/[0.08] rounded-xl p-5 w-[600px] shadow-2xl" onClick={(e) => e.stopPropagation()}>
          <p className="text-xs text-zinc-600">Purchase order not found.</p>
          <Button className="text-xs mt-3" onClick={onClose}>Close</Button>
        </div>
      </div>
    );
  }

  const deadlineDate = new Date(po.orderDate);
  deadlineDate.setHours(deadlineDate.getHours() + 24);
  const now = new Date();
  const msLeft = deadlineDate.getTime() - now.getTime();
  const hoursLeft = Math.max(0, Math.floor(msLeft / (1000 * 60 * 60)));
  const minutesLeft = Math.max(0, Math.floor((msLeft % (1000 * 60 * 60)) / (1000 * 60)));
  const isDeadlinePassed = msLeft <= 0;
  const isAcknowledged = po.status !== 'received' && po.status !== 'under_review';
const thePo = po;
  function beginOnBehalfAck() {
    setOnBehalfAck(true);
    const initStatuses: Record<string, 'accepted' | 'rejected' | 'backordered'> = {};
    const initQtys: Record<string, number> = {};
    const initPrices: Record<string, number> = {};
    for (const li of thePo.lineItems) {
      initStatuses[li.sku] = (li.ackStatus as 'accepted' | 'rejected' | 'backordered') || 'accepted';
      initQtys[li.sku] = li.acknowledgedQty ?? li.quantity;
      initPrices[li.sku] = li.acknowledgedUnitPrice ?? li.unitPrice;
    }
    setAckStatuses(initStatuses);
    setAckQtys(initQtys);
    setAckPrices(initPrices);
    setAckNotice(null);
  }

  function handleOnBehalfAckSubmit() {
    const lineAcks = thePo.lineItems.map((li) => ({
      sku: li.sku,
      ackStatus: ackStatuses[li.sku] ?? 'accepted',
      acknowledgedQty: ackStatuses[li.sku] === 'rejected' ? 0 : (ackQtys[li.sku] ?? li.quantity),
      unitPrice: ackPrices[li.sku],
      ...(ackStatuses[li.sku] === 'backordered' ? { scheduledShipDate: ackShipDates[li.sku] } : {}),
      ...(ackStatuses[li.sku] === 'rejected' ? { rejectionCode: (ackRejectionCodes[li.sku] || undefined) as import('@/types').PoRejectionCode | undefined } : {}),
    }));
    const result = acknowledgePurchaseOrder(thePo.id, lineAcks, actingStaff?.id ?? 'unknown-admin');
    if (!result.ok) { setAckNotice(result.error ?? 'Failed.'); return; }
    /**
     * §P4 — the brand's decision is an INSTRUCTION to Mercenta. The admin has
     * recorded it on the brand's behalf; MERCENTA then performs the channel
     * action automatically (acknowledgement → routing request → ASN).
     */
    if (result.instructionId) beginProxyProcessing(result.instructionId);
    const actor = actingStaff?.name ?? 'Unknown admin';
    setAckNotice('Acknowledgment submitted on behalf of ' + brandName + ' by ' + actor + '. '
      + 'The decision is recorded as an instruction to Mercenta, which files the channel acknowledgement and the ASN.'
      + (result.warnings?.length ? ' Warnings: ' + result.warnings.join('; ') : ''));
    void qc.invalidateQueries({ queryKey: ['purchase_orders'] });
    setOnBehalfAck(false);
  }

  /** §P4 — Mercenta retries a refused instruction (an attributed, audited action). */
  async function retryInstruction() {
    if (!instruction) return;
    const actor = actingStaff?.name ?? 'Unknown admin';
    requeueChannelInstruction(instruction.id, actor, 'Retry requested from the admin PO detail.');
    const result = await processChannelInstruction(instruction.id);
    setProxyNotice(
      result?.state === 'actioned'
        ? 'Channel action completed by Mercenta.'
        : `Channel action still not completed: ${result?.outcome?.refusedReason ?? 'reason not recorded'}.`
    );
    void qc.invalidateQueries({ queryKey: ['purchase_orders'] });
    void qc.invalidateQueries({ queryKey: ['shipments'] });
  }
function beginOnBehalfAsn() {
    setOnBehalfAsn(true);
    const init: Record<string, number> = {};
    for (const li of thePo.lineItems) {
      if (li.ackStatus !== 'rejected') {
        init[li.sku] = li.acknowledgedQty ?? li.quantity;
      }
    }
    setAsnCartons(init);
    setAsnPro('PRO-' + thePo.poNumber);
    setAsnBol('BOL-' + thePo.poNumber);
    setAsnLot('');
    setAsnExpiry('');
    setAsnNotice(null);
  }

  function handleOnBehalfAsnSubmit() {
    const targetPo = po!;
    // §Phase 4.2 — regulated/perishable categories REQUIRE lot + expiry on the
    // ASN (same UX pre-check the brand form performs; the seam re-enforces it).
    const asnBrand = brands.find((b) => b.id === targetPo.brandId);
    const needsLot = asnBrand && ['Grocery', 'Health & Personal Care'].includes(asnBrand.category);
    if (needsLot && (!asnLot.trim() || !asnExpiry)) {
      setAsnNotice('Lot number and expiry date are required for perishable/regulated categories.');
      return;
    }
    const asn = {
      cartons: Object.entries(asnCartons)
        .filter(([, qty]) => qty > 0)
        .map(([sku, quantity]) => ({
          sku, quantity,
          weightKg: Math.max(1, Math.round(quantity * 0.4)),
          lengthCm: 40, widthCm: 30, heightCm: 25,
        })),
      shipDate: asnShipDate, carrier: asnCarrier,
      proNumber: asnPro || 'PRO-' + targetPo.poNumber,
      bolNumber: asnBol || 'BOL-' + targetPo.poNumber,
      lotNumber: asnLot || undefined,
      expiryDate: asnExpiry || undefined,
    };
    const result = createShipmentForPO(targetPo.id, asn, actingStaff?.id ?? 'unknown-admin');
    if (!result.ok) { setAsnNotice(result.error ?? 'Failed.'); return; }
    const actor = actingStaff?.name ?? 'Unknown admin';
    setAsnNotice('ASN filed on behalf of ' + brandName + ' by ' + actor + '.'
      + (result.warnings?.length ? ' Warnings: ' + result.warnings.join('; ') : ''));
    void qc.invalidateQueries({ queryKey: ['purchase_orders', 'shipments'] });
    setOnBehalfAsn(false);
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60" onClick={onClose}>
      <div className="bg-ink-850 border border-white/[0.08] rounded-xl w-[720px] max-h-[90vh] overflow-y-auto shadow-2xl" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between px-5 py-4 border-b border-white/[0.06]">
          <div>
            <h2 className="text-sm font-semibold text-white">{po.poNumber}</h2>
            <p className="text-ds-label text-zinc-400 mt-0.5">{brandName} £{po.poValue.toLocaleString()}</p>
          </div>
          <div className="flex items-center gap-2">
            <StatusBadge
              className="text-ds-micro"
              dataStatus={ackWindowPresentation(isAcknowledged, hoursLeft, minutesLeft).dataStatus}
              tone={ackWindowPresentation(isAcknowledged, hoursLeft, minutesLeft).tone}
            >
              {ackWindowPresentation(isAcknowledged, hoursLeft, minutesLeft).label}
            </StatusBadge>
            <button onClick={onClose} className="text-zinc-500 hover:text-white transition-colors"><X className="w-4 h-4" /></button>
          </div>
        </div>

        <div className="p-5 space-y-4">
          <div className="grid grid-cols-3 gap-3">
            <div className="bg-ink-900 rounded-lg p-2.5">
              <p className="text-ds-micro text-zinc-500">Order date</p>
              <p className="text-xs text-white font-mono">{orderDateLabel(po.orderDate)}</p>
            </div>
            <div className="bg-ink-900 rounded-lg p-2.5">
              <p className="text-ds-micro text-zinc-500">Status</p>
              <p className="text-xs text-white capitalize">{po.status.replace(/_/g, ' ')}</p>
            </div>
            <div className="bg-ink-900 rounded-lg p-2.5">
              <p className="text-ds-micro text-zinc-500">Deadline</p>
              <p className="text-xs text-white font-mono">
                {isDeadlinePassed ? <span className="text-red-400">EXPIRED</span> : hoursLeft + 'h ' + minutesLeft + 'm'}
              </p>
            </div>
          </div>
          <Card title={'Line Items (' + po.lineItems.length + ')'}>
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-white/[0.06] text-xs text-zinc-500">
                  <th className="text-left font-medium px-3 py-2">SKU</th>
                  <th className="text-left font-medium px-3 py-2">Product</th>
                  <th className="text-right font-medium px-3 py-2">Ordered</th>
                  <th className="text-right font-medium px-3 py-2">Confirmed</th>
                  <th className="text-right font-medium px-3 py-2">Unit price</th>
                  <th className="text-center font-medium px-3 py-2">Status</th>
                  <th className="w-8 px-3 py-2" />
                </tr>
              </thead>
              <tbody className="divide-y divide-white/[0.04]">
                {po.lineItems.map((li) => (
                  <AdminPoLineItemRow
                    key={li.sku} line={li}
                    isOnBehalf={onBehalfAck}
                    ackStatus={ackStatuses[li.sku]}
                    ackPrice={ackPrices[li.sku]}
                    ackShipDate={ackShipDates[li.sku]}
                    ackRejectionCode={ackRejectionCodes[li.sku]}
                    onAckStatusChange={(v) => setAckStatuses((p) => ({ ...p, [li.sku]: v }))}
                    onAckPriceChange={(v) => setAckPrices((p) => ({ ...p, [li.sku]: v }))}
                    onAckShipDateChange={(v) => setAckShipDates((p) => ({ ...p, [li.sku]: v }))}
                    onAckRejectionCodeChange={(v) => setAckRejectionCodes((p) => ({ ...p, [li.sku]: v }))}
                  />
                ))}
              </tbody>
            </table>
          </Card>

          {!isAcknowledged && !onBehalfAck && (
            <div className="flex gap-2">
              <Button className="text-xs" onClick={beginOnBehalfAck}>
                <CheckCircle2 className="w-3.5 h-3.5 mr-1" />
                Acknowledge on behalf of {brandName}
              </Button>
            </div>
          )}
          {onBehalfAck && (
            <div className="bg-brass-500/10 border border-brass-500/20 rounded-lg p-3">
              <p className="text-ds-label text-brass-300 mb-2">
                Acknowledging on behalf of {brandName} as <strong>{actingStaff?.name ?? 'Admin'}</strong>
              </p>
              <Button className="text-xs" onClick={handleOnBehalfAckSubmit}>Submit On-Behalf Acknowledgment</Button>
              {ackNotice && <p className={cn('text-ds-micro mt-2', ackNotice.startsWith('Acknowledgment') ? 'text-emerald-400' : 'text-red-400')}>{ackNotice}</p>}
            </div>
          )}

          {/**
            * §P4 — THE BRAND'S INSTRUCTION AND MERCENTA'S OUTCOME.
            *
            * Mercenta operates the retail-channel account, so this is the surface
            * where Mercenta's operational staff can see what the brand instructed,
            * what the automated chain achieved, and retry a refused action.
            */}
          {instruction && (
            <Card title="Instruction to Mercenta (proxy model)" className="mt-3">
              <div className="space-y-1 text-xs">
                <p className="text-zinc-400">
                  Issued by <span className="font-mono text-zinc-300">{instruction.issuedBy}</span> at{' '}
                  {new Date(instruction.issuedAt).toLocaleString('en-GB')} · {instruction.type} ·{' '}
                  <span className="font-mono text-zinc-300">{instruction.id}</span>
                </p>
                <p className="text-zinc-400">
                  State: <span className="text-white">{instruction.state.replace(/_/g, ' ')}</span>
                  {instruction.outcome?.channelAcknowledgement?.ok && (
                    <>
                      {' · '}channel acknowledgement{' '}
                      <span className="font-mono text-zinc-300">
                        {instruction.outcome.channelAcknowledgement.acknowledgementId}
                      </span>{' '}
                      ({instruction.outcome.channelAcknowledgement.status}
                      {instruction.outcome.channelAcknowledgement.mode === 'mock' ? ', simulated — no live call' : ''})
                    </>
                  )}
                  {instruction.outcome?.routingRequest && (
                    <>
                      {' · '}routing{' '}
                      {instruction.outcome.routingRequest.raised
                        ? `raised (${instruction.outcome.routingRequest.reference})`
                        : 'not applicable'}
                    </>
                  )}
                  {instruction.outcome?.asn?.filed && (
                    <>
                      {' · '}ASN filed ({instruction.outcome.asn.reference})
                    </>
                  )}
                  {instruction.outcome?.asn?.deductionId && (
                    <>
                      {' · '}shortfall deduction {instruction.outcome.asn.deductionId}
                    </>
                  )}
                </p>
                {instruction.outcome?.asn?.note && (
                  <p className="text-amber-300">{instruction.outcome.asn.note}</p>
                )}
                {instruction.outcome?.refusedReason && (
                  <p className="text-red-400" data-testid="admin-instruction-refused">
                    {instruction.outcome.refusedReason}
                  </p>
                )}
                {proxyNotice && <p className="text-ds-micro text-brass-300">{proxyNotice}</p>}
                {(instruction.state === 'refused' || instruction.state === 'pending_mercenta_action') && (
                  <Button className="text-xs mt-1" data-testid="admin-instruction-retry" onClick={retryInstruction}>
                    <Truck className="w-3.5 h-3.5 mr-1" />
                    {instruction.state === 'refused' ? 'Retry channel action' : 'Run channel action now'}
                  </Button>
                )}
              </div>
            </Card>
          )}

          {po.acknowledgedAt && (
            <>
              <Card title="ASN / Shipment" className="mt-3">
                <div className="space-y-2">
                  {po.lineItems.filter((li) => li.ackStatus !== 'rejected').map((li) => (
                    <div key={li.sku} className="flex items-center justify-between text-xs border-b border-white/[0.04] py-1">
                      <span className="text-zinc-300">{li.sku} - {li.productName}</span>
                      <span className="text-zinc-400 font-mono">{li.acknowledgedQty ?? li.quantity} confirmed</span>
                    </div>
                  ))}
                  {!onBehalfAsn && (
                    <Button className="text-xs mt-2" onClick={beginOnBehalfAsn}>
                      <Truck className="w-3.5 h-3.5 mr-1" />
                      File / correct ASN on behalf of {brandName}
                    </Button>
                  )}
                </div>
              </Card>
              {onBehalfAsn && (
                <div className="bg-brass-500/10 border border-brass-500/20 rounded-lg p-3">
                  <p className="text-ds-label text-brass-300 mb-2">
                    Filing ASN on behalf of {brandName} as <strong>{actingStaff?.name ?? 'Admin'}</strong>
                  </p>
                  <div className="flex flex-wrap gap-2 mb-2">
                    <select value={asnCarrier} onChange={(e) => setAsnCarrier(e.target.value)}
                      className="bg-ink-900 border border-white/[0.08] rounded-md px-2 py-1 text-xs text-white">
                      {carrierOptionsForPO(po).map((c) => (
                        <option key={c.value} value={c.value}>{c.label}</option>
                      ))}
                    </select>
                    <input type="date" value={asnShipDate} onChange={(e) => setAsnShipDate(e.target.value)}
                      className="bg-ink-900 border border-white/[0.08] rounded-md px-2 py-1 text-xs text-white" />
                    <input value={asnLot} onChange={(e) => setAsnLot(e.target.value)}
                      placeholder="Lot number (required for Grocery / H&PC)" aria-label="Lot number"
                      className="bg-ink-900 border border-white/[0.08] rounded-md px-2 py-1 text-xs text-white" />
                    <input type="date" value={asnExpiry} onChange={(e) => setAsnExpiry(e.target.value)}
                      placeholder="Expiry date" aria-label="Expiry date"
                      className="bg-ink-900 border border-white/[0.08] rounded-md px-2 py-1 text-xs text-white" />
                  </div>
                  <Button className="text-xs" onClick={handleOnBehalfAsnSubmit}>Submit On-Behalf ASN</Button>
                  {asnNotice && <p className={cn('text-ds-micro mt-2', asnNotice.startsWith('ASN') ? 'text-emerald-400' : 'text-red-400')}>{asnNotice}</p>}
                </div>
              )}
            </>
          )}

          {po.lineItems.some((li) => !!li.ackHistory && li.ackHistory.length > 0) && (
            <Card title="Acknowledgment History">
              <div className="max-h-48 overflow-y-auto space-y-1">
                {po.lineItems.filter((li) => !!li.ackHistory && li.ackHistory.length > 0).flatMap((li) =>
                  li.ackHistory!.map((h, idx) => (
                    <div key={li.sku + '-' + idx} className="flex items-center justify-between text-xs border-b border-white/[0.04] py-1.5">
                      <span className="flex items-center gap-2 text-zinc-300">
                        <History className="w-3 h-3 text-zinc-500" />{li.sku}
                      </span>
                      <span className="text-zinc-400">{h.ackStatus} - {h.acknowledgedQty} u{h.rejectionCode && ' - ' + h.rejectionCode}</span>
                      <span className="text-ds-micro text-zinc-600 font-mono">{new Date(h.acknowledgedAt).toLocaleString()}</span>
                    </div>
                  ))
                )}
              </div>
            </Card>
          )}

          {po.lineItems.some((li) => li.acknowledgedUnitPrice && Math.abs(li.acknowledgedUnitPrice - li.unitPrice) > 0.001) && (
            <div className="bg-amber-500/10 border border-amber-500/20 rounded-lg p-3">
              <p className="text-ds-label text-amber-300 flex items-center gap-1.5">
                <AlertTriangle className="w-3.5 h-3.5" /> Cost-price discrepancies detected
              </p>
              {po.lineItems.filter((li) => li.acknowledgedUnitPrice && Math.abs(li.acknowledgedUnitPrice - li.unitPrice) > 0.001).map((li) => (
                <p key={li.sku} className="text-ds-micro text-amber-400/70 mt-1">
                  {li.sku}: PO unit price {String.fromCharCode(163)}{li.unitPrice.toFixed(2)} to acknowledged {String.fromCharCode(163)}{li.acknowledgedUnitPrice!.toFixed(2)}
                </p>
              ))}
            </div>
          )}

          {poDeductions.length > 0 && (
            <Card title={'Deductions (' + poDeductions.length + ')'}>
              <div className="space-y-1">
                {poDeductions.map((d) => (
                  <div key={d.id} className="flex items-center justify-between text-xs border-b border-white/[0.04] py-1.5">
                    <span className="flex items-center gap-1.5 text-zinc-300">
                      <Gavel className="w-3 h-3 text-zinc-500" /> {d.type.replace(/_/g, ' ')}
                    </span>
                    <span className="text-zinc-400 font-mono">{String.fromCharCode(163)}{d.amountGbp.toFixed(2)}</span>
                    <StatusBadge
                      className="text-ds-micro"
                      dataStatus={deductionStatusPresentation(d.status).dataStatus}
                      tone={deductionStatusPresentation(d.status).tone}
                    >
                      {deductionStatusPresentation(d.status).label}
                    </StatusBadge>
                  </div>
                ))}
              </div>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
/* Line item row for admin detail view */
function AdminPoLineItemRow({
  line, isOnBehalf, ackStatus, ackPrice, ackShipDate, ackRejectionCode,
  onAckStatusChange, onAckPriceChange,
  onAckShipDateChange, onAckRejectionCodeChange,
}: {
  line: PurchaseOrderLineItem; isOnBehalf: boolean;
  ackStatus?: 'accepted' | 'rejected' | 'backordered';
  ackPrice?: number; ackShipDate?: string; ackRejectionCode?: string;
  onAckStatusChange: (v: 'accepted' | 'rejected' | 'backordered') => void;
  onAckPriceChange: (v: number) => void;
  onAckShipDateChange: (v: string) => void; onAckRejectionCodeChange: (v: string) => void;
}) {
  const statusBadge = (status?: string) => {
    const p = ackStatusPresentation(status);
    return (
      <StatusBadge className="text-ds-micro" dataStatus={p.dataStatus} tone={p.tone}>
        {p.label}
      </StatusBadge>
    );
  };

  return (<tr className="align-top">
    <td className="px-3 py-2 font-mono text-xs text-zinc-400">{line.sku}</td>
    <td className="px-3 py-2 text-xs text-zinc-300"><span className="font-medium">{line.productName}</span></td>
    <td className="px-3 py-2 text-right font-mono text-xs text-zinc-400">{line.quantity}</td>
    <td className="px-3 py-2 text-right font-mono text-xs text-zinc-400">
      {line.acknowledgedQty ?? (line.ackStatus === 'accepted' ? line.quantity : '-')}
    </td>
    <td className="px-3 py-2 text-right font-mono text-xs text-zinc-400">
      {isOnBehalf ? (
        <input type="number" step="0.01" value={ackPrice ?? line.unitPrice}
          onChange={(e) => onAckPriceChange(Number(e.target.value))}
          className="w-20 bg-ink-900 border border-white/[0.08] rounded px-1.5 py-0.5 text-xs text-white text-right" />
      ) : (
        String.fromCharCode(163) + line.unitPrice.toFixed(2)
      )}
      {line.acknowledgedUnitPrice && Math.abs(line.acknowledgedUnitPrice - line.unitPrice) > 0.001 && (
        <span className="text-ds-micro text-amber-400 block">was {String.fromCharCode(163)}{line.acknowledgedUnitPrice.toFixed(2)}</span>
      )}
    </td>
    <td className="px-3 py-2 text-center">
      {isOnBehalf ? (
        /**
         * §WAVE 3 — the backorder option appears ONLY where the retail channel
         * positively allows it on this line. The domain boundary
         * (`src/data/api.ts → acknowledgePurchaseOrder`) enforces the same rule,
         * so an admin cannot bypass it from this surface either.
         */
        <select value={ackStatus ?? line.ackStatus ?? 'accepted'}
          onChange={(e) => onAckStatusChange(e.target.value as 'accepted' | 'rejected' | 'backordered')}
          className="bg-ink-900 border border-white/[0.08] rounded px-1 py-0.5 text-xs text-white"
          data-testid={`admin-po-ack-status-${line.sku}`}
          data-backorder-allowed={canBackOrderLine(line) ? 'true' : 'false'}>
          <option value="accepted">Accept</option>
          <option value="rejected">Reject</option>
          {canBackOrderLine(line) && <option value="backordered">Backorder</option>}
        </select>
      ) : statusBadge(line.ackStatus)}
      {isOnBehalf && !canBackOrderLine(line) && (
        <span className="block mt-1 text-ds-micro text-zinc-500" data-testid={`admin-po-backorder-blocked-${line.sku}`}>
          {backOrderAvailabilityLabel(line)}
        </span>
      )}
      {isOnBehalf && ackStatus === 'rejected' && (
        <select value={ackRejectionCode ?? ''}
          onChange={(e) => onAckRejectionCodeChange(e.target.value)}
          className="block mt-1 bg-ink-900 border border-white/[0.08] rounded px-1 py-0.5 text-ds-micro text-white w-full">
          <option value="">Select reason...</option>
          {PO_REJECTION_CODES.map((c) => (
            <option key={c} value={c}>{c.replace(/([A-Z])/g, ' $1').trim()}</option>
          ))}
        </select>
      )}
      {isOnBehalf && ackStatus === 'backordered' && (
        <input type="date" value={ackShipDate ?? ''}
          onChange={(e) => onAckShipDateChange(e.target.value)}
          className="block mt-1 bg-ink-900 border border-white/[0.08] rounded px-1 py-0.5 text-ds-micro text-white w-full"
          placeholder="Ship by date" />
      )}
    </td>
    <td className="px-3 py-2" />
  </tr>);
}
