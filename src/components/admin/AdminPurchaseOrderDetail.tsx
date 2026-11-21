import { useEffect, useMemo, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
/** §P13 — the order DATE is rendered through the ONE display helper. */
import { orderDateLabel } from '@/lib/dates';
import { useApp } from '@/context/GlobalStateContext';
import { useBrands, useCanonicalStoreVersion, useDeductions, usePurchaseOrders } from '@/data/queries';
import {
  acknowledgePurchaseOrder,
  approveOnBehalfRejection,
  createShipmentForPO,
  draftOnBehalfRejection,
} from '@/data/api';
/**
 * §P13 / S4 / S7 — the on-behalf DRAFT, the question "is it Mercenta's to perform?"
 * AND the acknowledgement WINDOW itself are answered by the rule's OWNER, never
 * re-derived on the surface.
 */
import {
  poAcknowledgementWindow,
  poNeedsAutoRejection,
  poOnBehalfRejectionDraft,
} from '@/lib/commerce/poAcknowledgementWindow';
/**
 * §DEFECT FIXED AT SOURCE (owner-reported, 2026-09-30) — WHO MAY DECIDE A BRAND'S ORDER is
 * derived by its ONE owner, so this surface states the same position the writer enforces.
 */
import { poOnBehalfAuthority } from '@/lib/commerce/poOnBehalfAuthority';
/**
 * §BATCH 2c (`AV-024`) — the CHANNEL-ISSUED revision position of this order is read
 * from its ONE owner (`poRevisionState`) and the rule/labels from the config, exactly
 * as the brand surface does. The console never re-derives the version and never
 * re-types the obligation.
 */
import { poRevisionState } from '@/lib/commerce/poRevisions';
import {
  PO_CHANNEL_CHANGE_KIND_LABELS,
  PO_REVISION_RULE_TEXT,
} from '@/config/purchaseOrders';
import {
  listChannelInstructions,
  requeueChannelInstruction,
} from '@/lib/commerce/channelInstructions';
import { beginProxyProcessing, processChannelInstruction } from '@/lib/commerce/proxyProcessor';
import { Badge, Button, Card, StatusBadge } from '@/components/ui';
import type { StatusTone } from '@/components/ui';
import {
  ackDeadlinePresentation,
  ackStatusPresentation,
  deductionStatusPresentation,
  poStatusPresentation,
} from '@/lib/statusPresentation';
import { cn } from '@/utils/cn';
import type { PoAcknowledgementWindow } from '@/lib/commerce/poAcknowledgementWindow';
import type { PurchaseOrder, PurchaseOrderLineItem } from '@/types';
import { PO_REJECTION_CODES } from '@/types';
import { AlertTriangle, CheckCircle2, X, Truck, Gavel, History } from 'lucide-react';
import { carrierOptionsForLane, selectCarrierForShipment } from '@/lib/shipping/carrierRouting';
import { backOrderAvailabilityLabel, canBackOrderLine } from '@/lib/commerce/backorderGate';
/**
 * §BATCH 2d (`AV-008` / `AV-023`) — the acknowledgement ↔ invoice price DIVERGENCE and
 * its warning are derived by the rule's ONE owner (`invoicePriceMatch.ts`); this surface
 * renders the owner's own wording and never re-derives the comparison.
 */
import {
  ACK_INVOICE_PRICE_RULE_TEXT,
  ACK_PRICE_DISCREPANCY_TITLE,
  ackPriceDivergence,
  ackPriceDivergences,
} from '@/lib/commerce/invoicePriceMatch';

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

/**
 * §P13 / S7 — THE HEADER BADGE, DERIVED FROM THE WINDOW'S OWNER.
 *
 * The owner's channel state decides what the badge says: an unreadable window
 * fails CLOSED and STATES that (never a figure rendered from it), a decided order
 * shows its own decision, a closed order shows its own closed status, and an open
 * order shows the owner's urgency — with the closing window called out, because
 * Mercenta may act on the brand's behalf inside it. The owner's own `reason` is
 * the tooltip at the call site.
 *
 * Pure and module-level (no hooks), so the render body stays readable.
 */
function ackHeaderBadge(
  po: PurchaseOrder,
  window: PoAcknowledgementWindow
): { label: string; tone: StatusTone; dataStatus: string } {
  if (window.channelState === 'unknown') {
    return { label: 'Ack window unreadable', tone: 'neutral', dataStatus: 'ack_unknown' };
  }
  if (window.channelState === 'acknowledged') {
    return { label: 'Acknowledged', tone: 'success', dataStatus: 'acknowledged' };
  }
  if (window.channelState === 'closed') {
    const closed = poStatusPresentation(po.status);
    return { label: closed.label, tone: closed.tone, dataStatus: closed.dataStatus };
  }
  const urgency = window.hoursLeft === null ? null : ackDeadlinePresentation(window.hoursLeft);
  return {
    label: `${urgency?.label ?? 'Ack window unreadable'}${
      window.onBehalfAvailable ? ' · closing window' : ''
    }`,
    tone: urgency?.tone ?? 'neutral',
    dataStatus: urgency?.dataStatus ?? 'ack_unknown',
  };
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
  /**
   * §P13 / S4 — MERCENTA'S ON-BEHALF REJECTION DRAFT FOR THIS PURCHASE ORDER.
   *
   * The draft is DERIVED by the rule's owner and produced (idempotently,
   * attributed to Mercenta's declared automatic identity and audited) as soon as
   * the channel's required rejection becomes Mercenta's to perform, so the brand
   * portal finds a draft to approve and Mercenta's staff see the same one. The
   * `useEffect` sits above the not-found return so the hook order is unconditional.
   */
  const [onBehalfRejectNotice, setOnBehalfRejectNotice] = useState<string | null>(null);
  useEffect(() => {
    if (po && poNeedsAutoRejection(po)) draftOnBehalfRejection(po.id);
  }, [po]);
  const onBehalfRejectDraft = po ? poOnBehalfRejectionDraft(po) : null;

  const poDeductions = po ? deductions.filter((d) => d.purchaseOrderId === poId) : [];

  if (!po) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-surface-hover" onClick={onClose}>
        <div className="bg-ink-850 border border-hairline rounded-ds-lg p-5 w-[600px] shadow-ds-overlay" onClick={(e) => e.stopPropagation()}>
          <p className="text-xs text-zinc-600">Purchase order not found.</p>
          <Button className="text-xs mt-3" onClick={onClose}>Close</Button>
        </div>
      </div>
    );
  }

  /**
   * §P13 / S7 — THE WINDOW COMES FROM ITS OWNER.
   *
   * REPOINTED (the old contract is recorded here): this surface derived the window
   * itself — `new Date(po.orderDate)` mutated in LOCAL time by
   * `setHours(getHours() + 24)` (which drifts across a DST boundary), its own
   * `msLeft / hoursLeft / minutesLeft`, its own `isDeadlinePassed`, and its own
   * actionability predicate `po.status !== 'received' && po.status !== 'under_review'`
   * — a second copy of the 24-hour rule AND a second copy of the config's own
   * obligation set (`PO_ACK_STATUSES_WITH_OBLIGATION`). Past the limit it therefore
   * offered an acceptance the domain writer REFUSES, and an unreadable order date
   * rendered a countdown instead of failing closed.
   *
   * Now the owner (`src/lib/commerce/poAcknowledgementWindow.ts`) derives the
   * window, its `reason` states it verbatim (the badge's tooltip), the presentation
   * owner classifies the urgency, and the acceptance control is offered exactly when
   * the owner permits an acceptance.
   */
  const ackWindow = poAcknowledgementWindow(po);
  /** The owner's urgency classification — only while a window is genuinely owed. */
  const ackUrgency =
    ackWindow.channelState === 'new' && ackWindow.hoursLeft !== null
      ? ackDeadlinePresentation(ackWindow.hoursLeft)
      : null;
  const ackBadge = ackHeaderBadge(po, ackWindow);
  /**
   * §DEFECT FIXED AT SOURCE (owner-reported, 2026-09-30) — WHO MAY DECIDE THIS ORDER, read
   * from its ONE owner. The surface now STATES the position and offers the on-behalf control
   * only where the writer would accept it, so an operator is never left guessing why the
   * platform refuses (and the writer refuses regardless of what this surface offers).
   */
  const onBehalfAuthority = poOnBehalfAuthority(po);
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

  /**
   * §P13 / S4 — MERCENTA'S STAFF RECORD THE BRAND'S APPROVAL OF THE ON-BEHALF
   * REJECTION DRAFT (an ATTRIBUTED OVERRIDE).
   *
   * The brand approves from its own portal; where Mercenta's staff must record the
   * approval (the brand is unreachable, the window is closing), this surface does it
   * — attributed to the acting staff member and audited as an override. It approves
   * the EXACT draft on record (content-addressed), never a re-invented one, and the
   * channel action itself is performed by the ONE writer, not here.
   */
  function handleOnBehalfRejectApprove() {
    const result = approveOnBehalfRejection(thePo.id, {
      actorStaffId: actingStaff?.id ?? 'unknown-admin',
      actorLabel: actingStaff?.name ?? 'Unknown admin',
      draftId: onBehalfRejectDraft?.draftId,
    });
    if (!result.ok) {
      setOnBehalfRejectNotice(result.error ?? 'Refused.');
      return;
    }
    setOnBehalfRejectNotice(
      `On-behalf rejection performed for ${brandName} by ${actingStaff?.name ?? 'Unknown admin'} — draft ` +
        `${result.draftId} approved, channel action recorded against the instruction` +
        `${result.instructionId ? ` ${result.instructionId}` : ''}.`
    );
    void qc.invalidateQueries({ queryKey: ['purchase_orders'] });
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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-surface-hover" onClick={onClose}>
      <div className="bg-ink-850 border border-hairline rounded-ds-lg w-[720px] max-h-[90vh] overflow-y-auto shadow-ds-overlay" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between px-5 py-4 border-b border-hairline">
          <div>
            <h2 className="text-sm font-semibold text-strong">{po.poNumber}</h2>
            <p className="text-ds-label text-zinc-400 mt-0.5">{brandName} £{po.poValue.toLocaleString()}</p>
          </div>
          <div className="flex items-center gap-2">
            <span title={ackWindow.reason}>
              <StatusBadge
                className="text-ds-micro"
                dataStatus={ackBadge.dataStatus}
                tone={ackBadge.tone}
              >
                {ackBadge.label}
              </StatusBadge>
            </span>
            <button onClick={onClose} className="text-zinc-500 hover:text-strong transition-colors"><X className="w-4 h-4" /></button>
          </div>
        </div>

        <div className="p-5 space-y-4">
          <div className="grid grid-cols-3 gap-3">
            <div className="bg-ink-900 rounded-ds-md p-2.5">
              <p className="text-ds-micro text-zinc-500">Order date</p>
              <p className="text-xs text-strong font-mono">{orderDateLabel(po.orderDate)}</p>
            </div>
            <div className="bg-ink-900 rounded-ds-md p-2.5">
              <p className="text-ds-micro text-zinc-500">Status</p>
              <p className="text-xs text-strong capitalize">{po.status.replace(/_/g, ' ')}</p>
            </div>
            <div className="bg-ink-900 rounded-ds-md p-2.5">
              <p className="text-ds-micro text-zinc-500">Deadline</p>
              <p
                className="text-xs text-strong font-mono"
                title={ackWindow.reason}
                data-testid={`admin-po-ack-window-${po.poNumber}`}
              >
                {ackUrgency
                  ? ackUrgency.label
                  : ackWindow.deadline
                    ? ackWindow.deadline.slice(0, 16).replace('T', ' ')
                    : 'Window unreadable'}
              </p>
            </div>
          </div>
          <Card title={'Line Items (' + po.lineItems.length + ')'}>
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-hairline text-xs text-zinc-500">
                  <th className="text-left font-medium px-3 py-2">SKU</th>
                  <th className="text-left font-medium px-3 py-2">Product</th>
                  <th className="text-right font-medium px-3 py-2">Ordered</th>
                  <th className="text-right font-medium px-3 py-2">Confirmed</th>
                  <th className="text-right font-medium px-3 py-2">Unit price</th>
                  <th className="text-center font-medium px-3 py-2">Status</th>
                  <th className="w-8 px-3 py-2" />
                </tr>
              </thead>
              <tbody className="divide-y divide-hairline-06">
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

          {/* §BATCH 2c (`AV-024`) — the channel's own revisions of this order, with
              the recorded change list. Renders nothing for an unrevised order. */}
          <ChannelRevisionHistory po={po} />

          {/**
            * §P13 / S7 — the acceptance is offered EXACTLY when the owner permits
            * one (Amazon's `New` set INSIDE the window). Past the limit the domain
            * writer REFUSES an acceptance, so no such control is offered and the
            * remaining action is Mercenta's on-behalf rejection draft below; an
            * unreadable window fails closed, and the owner's own `reason` states
            * why no acceptance is on offer.
            */}
          {/**
            * §DEFECT FIXED AT SOURCE (owner-reported, 2026-09-30) — THE ON-BEHALF CONTROL
            * STATES ITS AUTHORITY.
            *
            * The owner reported that a Super Admin could acknowledge any order for a brand at
            * any time with nothing recording the brand's agreement. The writer now REFUSES
            * that (`onBehalfDecisionRefusal`), and this surface states why: the brand's
            * authorisation, or the closing window and the channel-required rejection only.
            */}
          <p
            className="text-ds-micro leading-snug text-zinc-500"
            data-testid={`admin-po-on-behalf-authority-${po.poNumber}`}
            data-on-behalf-permitted={onBehalfAuthority.permitted}
          >
            {onBehalfAuthority.statement} {onBehalfAuthority.ruleText}
          </p>
          {ackWindow.inQueue && !onBehalfAck && onBehalfAuthority.permitted === 'any_decision' && (
            <div className="flex gap-2">
              <Button className="text-xs" onClick={beginOnBehalfAck}>
                <CheckCircle2 className="w-3.5 h-3.5 mr-1" />
                Acknowledge on behalf of {brandName}
              </Button>
            </div>
          )}
          {ackWindow.inQueue && !onBehalfAck && onBehalfAuthority.permitted === 'rejection_only' && (
            <p
              className="text-ds-micro leading-snug text-amber-300/90"
              data-testid={`admin-po-on-behalf-rejection-only-${po.poNumber}`}
            >
              Without the brand’s authorisation Mercenta may record ONLY the rejection the retail channel
              requires — never an acceptance. Use the channel-required rejection below, which the brand is asked
              to approve.
            </p>
          )}
          {!ackWindow.inQueue && !onBehalfAck && (
            <p
              className="text-ds-micro text-zinc-500"
              data-testid={`admin-po-ack-state-${po.poNumber}`}
            >
              {ackWindow.reason}
            </p>
          )}
          {onBehalfAck && (
            <div className="bg-brass-500/10 border border-brass-500/20 rounded-ds-md p-3">
              <p className="text-ds-label text-brass-300 mb-2">
                Acknowledging on behalf of {brandName} as <strong>{actingStaff?.name ?? 'Admin'}</strong>
              </p>
              <Button className="text-xs" onClick={handleOnBehalfAckSubmit}>Submit On-Behalf Acknowledgment</Button>
              {ackNotice && <p className={cn('text-ds-micro mt-2', ackNotice.startsWith('Acknowledgment') ? 'text-emerald-400' : 'text-red-400')}>{ackNotice}</p>}
            </div>
          )}

          {/**
            * §P13 / S4 — THE ON-BEHALF REJECTION DRAFT, AND MERCENTA'S ATTRIBUTED
            * OVERRIDE TO RECORD THE BRAND'S APPROVAL OF IT.
            *
            * The draft is what the channel's rule REQUIRES once the window reaches its
            * final stage, so it is stated in full: the rule, the reason code, the
            * lines it rejects, the draft's content address, and the two instants that
            * matter (the limit, and the earlier on-behalf stage). The approval records
            * the EXACT draft on record; the channel action is performed by the ONE
            * writer and attributed to Mercenta's declared automatic identity.
            */}
          {onBehalfRejectDraft?.available && (
            <div
              className="bg-red-500/5 border border-red-500/20 rounded-ds-md p-3 space-y-2"
              data-testid={`admin-po-onbehalf-draft-${po.poNumber}`}
            >
              <p className="text-ds-label text-state-danger font-medium">
                On-behalf rejection draft — awaiting {brandName}'s approval
              </p>
              <p className="text-ds-micro text-zinc-400">{onBehalfRejectDraft.ruleText}</p>
              <p className="text-ds-micro text-zinc-400" data-testid={`admin-po-onbehalf-draft-id-${po.poNumber}`}>
                Draft <span className="font-mono">{onBehalfRejectDraft.draftId}</span> · produced by{' '}
                <span className="font-mono">{po.onBehalfDraft?.createdBy ?? 'pending'}</span>
                {po.onBehalfDraft ? ` at ${new Date(po.onBehalfDraft.createdAt).toLocaleString('en-GB')}` : ''} · reason
                code <span className="font-mono">{onBehalfRejectDraft.rejectionCode}</span>
                {onBehalfRejectDraft.acknowledgementDeadline
                  ? ` · limit ${new Date(onBehalfRejectDraft.acknowledgementDeadline).toLocaleString('en-GB')}`
                  : ''}
                {onBehalfRejectDraft.autoRejectAt
                  ? ` · on-behalf stage ${new Date(onBehalfRejectDraft.autoRejectAt).toLocaleString('en-GB')}`
                  : ''}
              </p>
              <p className="text-ds-micro text-amber-300" data-testid={`admin-po-onbehalf-state-${po.poNumber}`}>
                {onBehalfRejectDraft.brandMayStillDecide
                  ? `Still inside the 24-hour window — the brand may decide for itself until the limit.`
                  : `The 24-hour window has closed — the documented action past the limit is a rejection.`}
              </p>
              <ul className="space-y-0.5">
                {onBehalfRejectDraft.lines.map((l) => (
                  <li key={l.sku} className="text-ds-micro text-zinc-300 font-mono">
                    {l.sku} · {l.productName} · reject {l.quantity} @ £{l.unitPrice} · {l.rejectionCode}
                  </li>
                ))}
              </ul>
              <Button
                className="text-xs"
                data-testid={`admin-po-onbehalf-approve-${po.poNumber}`}
                onClick={handleOnBehalfRejectApprove}
              >
                <Gavel className="w-3.5 h-3.5 mr-1" />
                Approve on behalf of {brandName} (attributed override)
              </Button>
            </div>
          )}

          {/**
            * §P13 / S4 — MERCENTA'S REPORTED OUTCOME. It is rendered OUTSIDE the
            * draft panel because a successful approval makes the draft no longer
            * available, and the outcome must not vanish with it.
            */}
          {onBehalfRejectNotice && (
            <p
              role="status"
              data-testid={`admin-po-onbehalf-notice-${po.poNumber}`}
              className={cn(
                'text-ds-micro',
                onBehalfRejectNotice.startsWith('On-behalf') ? 'text-emerald-400' : 'text-red-400'
              )}
            >
              {onBehalfRejectNotice}
            </p>
          )}

          {/* §P13 / S4 — the recorded draft and the human approval of it */}
          {po.onBehalfDraft?.approvedAt && (
            <p className="text-ds-micro text-zinc-500" data-testid={`admin-po-onbehalf-approved-${po.poNumber}`}>
              On-behalf rejection draft <span className="font-mono">{po.onBehalfDraft.id}</span> approved by{' '}
              {po.onBehalfDraft.approvedBy}
              {po.onBehalfDraft.approvedByAdmin ? ' (Mercenta admin override)' : ' (brand)'} at{' '}
              {new Date(po.onBehalfDraft.approvedAt).toLocaleString('en-GB')} · reason{' '}
              {po.onBehalfDraft.rejectionCode}
            </p>
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
                  State: <span className="text-strong">{instruction.state.replace(/_/g, ' ')}</span>
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
                    <div key={li.sku} className="flex items-center justify-between text-xs border-b border-hairline py-1">
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
                <div className="bg-brass-500/10 border border-brass-500/20 rounded-ds-md p-3">
                  <p className="text-ds-label text-brass-300 mb-2">
                    Filing ASN on behalf of {brandName} as <strong>{actingStaff?.name ?? 'Admin'}</strong>
                  </p>
                  <div className="flex flex-wrap gap-2 mb-2">
                    <select value={asnCarrier} onChange={(e) => setAsnCarrier(e.target.value)}
                      className="bg-ink-900 border border-hairline rounded-ds-sm px-2 py-1 text-xs text-strong">
                      {carrierOptionsForPO(po).map((c) => (
                        <option key={c.value} value={c.value}>{c.label}</option>
                      ))}
                    </select>
                    <input type="date" value={asnShipDate} onChange={(e) => setAsnShipDate(e.target.value)}
                      className="bg-ink-900 border border-hairline rounded-ds-sm px-2 py-1 text-xs text-strong" />
                    <input value={asnLot} onChange={(e) => setAsnLot(e.target.value)}
                      placeholder="Lot number (required for Grocery / H&PC)" aria-label="Lot number"
                      className="bg-ink-900 border border-hairline rounded-ds-sm px-2 py-1 text-xs text-strong" />
                    <input type="date" value={asnExpiry} onChange={(e) => setAsnExpiry(e.target.value)}
                      placeholder="Expiry date" aria-label="Expiry date"
                      className="bg-ink-900 border border-hairline rounded-ds-sm px-2 py-1 text-xs text-strong" />
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
                    <div key={li.sku + '-' + idx} className="flex items-center justify-between text-xs border-b border-hairline py-1.5">
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

          {ackPriceDivergences(po).length > 0 && (
            <div
              className="bg-amber-500/10 border border-amber-500/20 rounded-ds-md p-3"
              data-testid={`ack-price-discrepancy-${po.poNumber}`}
            >
              <p className="text-ds-label text-amber-300 flex items-center gap-1.5">
                <AlertTriangle className="w-3.5 h-3.5" /> {ACK_PRICE_DISCREPANCY_TITLE}
              </p>
              {ackPriceDivergences(po).map((d) => (
                <p key={d.sku} className="text-ds-micro text-amber-400/70 mt-1">
                  {d.sku}: order unit price {String.fromCharCode(163)}{d.poUnitPrice.toFixed(2)} → acknowledged{' '}
                  {String.fromCharCode(163)}{d.acknowledgedUnitPrice.toFixed(2)} — the invoice bills the acknowledged price
                </p>
              ))}
              <p className="text-ds-micro text-amber-300/70 mt-1">{ACK_INVOICE_PRICE_RULE_TEXT}</p>
            </div>
          )}

          {poDeductions.length > 0 && (
            <Card title={'Deductions (' + poDeductions.length + ')'}>
              <div className="space-y-1">
                {poDeductions.map((d) => (
                  <div key={d.id} className="flex items-center justify-between text-xs border-b border-hairline py-1.5">
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
/* ── CHANNEL-ISSUED REVISION HISTORY (§BATCH 2c / `AV-024`) ─────────────────
 *
 * WHY THIS EXISTS: the retail channel can change a purchase order AFTER it was
 * issued, and the vendor must fulfil the UPDATED one; Mercenta discovers a change
 * by polling the channel's own order read. Before this surface, an operator could
 * not see that the channel had changed an order, which version the brand had
 * acknowledged, or that a recorded decision had been undercut — the documented
 * AV-024 risk.
 *
 * It renders EVERY recorded revision, oldest first (the record's `revisions` list is
 * append-only, so nothing here is reconstructed from the current state), and for
 * each one states: the version, when it was observed, whether the read was a
 * SIMULATED channel read, the value before and after, each change labelled from the
 * ONE change-kind map with its own detail, and Mercenta's review flag when the
 * change undercut an acknowledgement already recorded. The rule statement is
 * rendered from `PO_REVISION_RULE_TEXT` rather than written again here.
 *
 * Renders NOTHING for an order the channel has never changed.
 */
function ChannelRevisionHistory({ po }: { po: PurchaseOrder }) {
  const state = poRevisionState(po);
  const revisions = po.revisions ?? [];
  if (revisions.length === 0) return null;
  return (
    <Card
      title={`Channel revisions (${revisions.length})`}
      data-testid={`admin-po-revisions-${po.poNumber}`}
    >
      <p className="text-ds-micro text-zinc-500" data-testid={`admin-po-revision-rule-${po.poNumber}`}>
        {PO_REVISION_RULE_TEXT}
      </p>
      {state.channelCancelled && (
        <p className="mt-2 text-ds-label text-red-300" data-testid={`admin-po-revision-cancelled-${po.poNumber}`}>
          The retail channel has cancelled this order. The record holds its current version and the
          cancellation cannot be acknowledged or shipped.
        </p>
      )}
      {state.acknowledgementStale && (
        <p className="mt-2 text-ds-micro text-amber-300" data-testid={`admin-po-revision-stale-${po.poNumber}`}>
          The acknowledgement on this order answers an EARLIER version (version{' '}
          {po.acknowledgedRevision ?? 0}) while the channel's current version is {state.revisionNumber},
          so it is stale and no shipment may be derived from it.
        </p>
      )}
      <div className="mt-2 space-y-2">
        {revisions.map((revision) => (
          <div
            key={revision.digest}
            className="rounded-ds-sm border border-hairline bg-ink-900 p-2.5"
            data-testid={`admin-po-revision-${po.poNumber}-${revision.revisionNumber}`}
          >
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span className="flex items-center gap-2 text-ds-label text-zinc-200">
                <History className="w-3 h-3 text-zinc-500" />
                Version {revision.revisionNumber} — the retail channel&apos;s current order
                {revision.simulated && (
                  <Badge className="text-ds-micro bg-brass-500/15 text-brass-400 border-brass-500/20">
                    (sim)
                  </Badge>
                )}
              </span>
              <span className="flex items-center gap-3 text-ds-micro font-mono text-zinc-500">
                <span>{revision.observedAt.slice(0, 16).replace('T', ' ')}</span>
                {revision.previousPoValue !== revision.newPoValue && (
                  <span>
                    {String.fromCharCode(163)}
                    {revision.previousPoValue.toFixed(2)} → {String.fromCharCode(163)}
                    {revision.newPoValue.toFixed(2)}
                  </span>
                )}
              </span>
            </div>
            {revision.changes.length > 0 ? (
              <ul className="mt-1.5 space-y-0.5">
                {revision.changes.map((change, index) => (
                  <li
                    key={`${change.kind}-${change.subject}-${index}`}
                    className="text-ds-micro text-zinc-400"
                  >
                    <span className="text-zinc-300">{PO_CHANNEL_CHANGE_KIND_LABELS[change.kind]}</span>
                    {' — '}
                    {change.detail}
                  </li>
                ))}
              </ul>
            ) : (
              /**
               * A revision always declares its kinds. If a recorded revision carries no
               * change rows (a cancellation recorded without detail), the kinds are
               * still stated rather than rendering an empty body.
               */
              <p className="mt-1.5 text-ds-micro text-zinc-400">
                {revision.changeKinds
                  .map((kind) => PO_CHANNEL_CHANGE_KIND_LABELS[kind])
                  .join(' · ')}
              </p>
            )}
            {revision.reviewReason && (
              <p
                className="mt-1.5 text-ds-micro text-amber-300"
                data-testid={`admin-po-revision-review-${po.poNumber}-${revision.revisionNumber}`}
              >
                {revision.reviewReason}
              </p>
            )}
          </div>
        ))}
      </div>
    </Card>
  );
}

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

  /** §BATCH 2d — the owner-derived divergence between the order price and the acknowledged price. */
  const priceDivergence = ackPriceDivergence(line);

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
          className="w-20 bg-ink-900 border border-hairline rounded-ds-sm px-1.5 py-0.5 text-xs text-strong text-right" />
      ) : (
        String.fromCharCode(163) + line.unitPrice.toFixed(2)
      )}
      {priceDivergence && (
        <span className="text-ds-micro text-amber-400 block">
          acknowledged {String.fromCharCode(163)}{priceDivergence.acknowledgedUnitPrice.toFixed(2)}
        </span>
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
          className="bg-ink-900 border border-hairline rounded-ds-sm px-1 py-0.5 text-xs text-strong"
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
          className="block mt-1 bg-ink-900 border border-hairline rounded-ds-sm px-1 py-0.5 text-ds-micro text-strong w-full">
          <option value="">Select reason...</option>
          {PO_REJECTION_CODES.map((c) => (
            <option key={c} value={c}>{c.replace(/([A-Z])/g, ' $1').trim()}</option>
          ))}
        </select>
      )}
      {isOnBehalf && ackStatus === 'backordered' && (
        <input type="date" value={ackShipDate ?? ''}
          onChange={(e) => onAckShipDateChange(e.target.value)}
          className="block mt-1 bg-ink-900 border border-hairline rounded-ds-sm px-1 py-0.5 text-ds-micro text-strong w-full"
          placeholder="Ship by date" />
      )}
    </td>
    <td className="px-3 py-2" />
  </tr>);
}
