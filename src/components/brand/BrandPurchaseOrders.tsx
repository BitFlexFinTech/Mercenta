import { useEffect, useMemo, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
/** §P13 — the order DATE is rendered through the ONE display helper. */
import { orderDateLabel } from '@/lib/dates';
import { useApp } from '@/context/GlobalStateContext';
import {
  acknowledgePurchaseOrder,
  approveOnBehalfRejection,
  authoriseOnBehalfDecisions,
  draftOnBehalfRejection,
  fetchBrands,
  fetchPurchaseOrders,
  withdrawOnBehalfAuthorisation,
} from '@/data/api';
/**
 * §P13 / S4 / S6 — the on-behalf DRAFT is derived by the rule's OWNER
 * (`poOnBehalfRejectionDraft`), never hand-written here, so the draft the brand
 * approves and the rejection Mercenta performs cannot state different windows.
 *
 * §S6 — the WINDOW ITSELF is now read from the same owner (`poAcknowledgementWindow`):
 * the surface's actionable predicate, its deadline badge, its preview badge and the
 * window state it states to the brand are all the owner's own derivation. The
 * hand-rolled `received + 24 * 60 * 60 * 1000`, `+ 24 * 3600 * 1000` and
 * `status === 'received' || status === 'under_review'` are gone (the last one was
 * the same class of defect S3 removed from the work layer).
 */
import {
  poAcknowledgementWindow,
  poAmendmentWindow,
  poChannelHoldDuty,
  poNeedsAutoRejection,
  poOnBehalfRejectionDraft,
} from '@/lib/commerce/poAcknowledgementWindow';
/**
 * §BATCH 2j (`AV-009`) — the channel's COMPLETENESS rule and which lines a submission
 * leaves undecided come from the rule's ONE owner, so the brand is told BEFORE it submits
 * that an undecided line is rejected, rather than discovering it afterwards.
 */
import { poAcknowledgementCompleteness } from '@/lib/commerce/poAcknowledgementCompleteness';
/**
 * §DEFECT FIXED AT SOURCE (owner-reported, 2026-09-30) — the brand's authorisation for
 * Mercenta to decide an order is derived by its ONE owner, so this surface states the same
 * position the writer enforces.
 */
import { poOnBehalfAuthority } from '@/lib/commerce/poOnBehalfAuthority';
/**
 * §BATCH 2d (`AV-008` / `AV-023`) — the brand is told, on the order itself, that the
 * invoice bills the price it acknowledged and that a price differing from the order
 * price is the divergence the channel's payment system compares. The divergence and
 * its wording come from the rule's ONE owner (`invoicePriceMatch.ts`).
 */
import {
  ACK_INVOICE_PRICE_RULE_TEXT,
  ACK_PRICE_DISCREPANCY_TITLE,
  ackPriceDivergences,
} from '@/lib/commerce/invoicePriceMatch';
/**
 * §BATCH 2b (`AV-006`) — the channel's 48-hour UPDATE rule is rendered from its ONE
 * owner; the surface never re-types the window.
 *
 * §BATCH 2c (`AV-024`) — the CHANNEL's own change of an order is a different fact
 * from a brand amendment, so its rule statement and its change labels come from the
 * same owner too. The brand is told which version of the order it is working from,
 * what the channel changed, and whether its acknowledgement must be brought up to
 * the updated order — never re-derived on this surface.
 */
import {
  PO_ACK_COMPLETENESS_RULE_TEXT,
  PO_AMENDMENT_WINDOW_RULE_TEXT,
  PO_CHANNEL_CHANGE_KIND_LABELS,
  PO_REVISION_RULE_TEXT,
} from '@/config/purchaseOrders';
import { fulfillmentTrackLabel } from '@/config/fulfillmentTrack';
import { poRevisionState } from '@/lib/commerce/poRevisions';
import { useCanonicalStoreVersion } from '@/data/queries';
import {
  instructionLineFor,
  issueChannelInstruction,
  listChannelInstructions,
} from '@/lib/commerce/channelInstructions';
import { processPendingChannelInstructions } from '@/lib/commerce/proxyProcessor';
import type { ChannelInstruction, PurchaseOrder } from '@/types';
import { PO_REJECTION_CODES } from '@/types';
import { Badge, Button, Card, LoadingState, StatusBadge } from '@/components/ui';
import {
  ackDeadlinePresentation,
  ackStatusPresentation,
  poStatusPresentation,
  PO_STATUS_ORDER,
} from '@/lib/statusPresentation';
import { BrandCommPanel } from '@/components/shared/BrandComm';
import { BACKORDER_RESTOCK_TARGET } from '@/config/deductions';
/**
 * §UI/UX Wave 2 completion — the brand PO list gains the established
 * QUEUE → PREVIEW (RecordDrawer) → ACT step. Only the record's own real fields
 * are shown; the existing inline acknowledgment workflow is untouched.
 *
 * §P4 — DIRECTION CORRECTED. The brand's only jobs are accept/reject/backorder →
 * download & print its documents → ship on time. The brand no longer "creates a
 * shipment" or "files the ASN": its decision writes an INSTRUCTION to Mercenta
 * (`src/lib/commerce/channelInstructions.ts`) and MERCENTA performs the channel
 * acknowledgement, raises the routing request and files the ASN
 * (`src/lib/commerce/proxyProcessor.ts`). The brand sees the resulting STATUS,
 * and intervenes only when its physical packing differs (programme decision 9).
 */
import { RecordDrawer, RecordFieldList, MetricBand, SegmentedControl, WorkspaceFrame, WorkspaceHeader } from '@/components/shared/workspace';
import { CommerceSimulationPanel } from '@/components/shared/CommerceSimulationPanel';
import { ShippingCostEstimate } from '@/components/shared/ShippingCostEstimate';
import { RoutingRequestIndicator, RoutingRequestStatus, routingCarrierLabel } from '@/components/shared/RoutingRequest';
import { downloadCsv } from '@/lib/csv';
import { cn } from '@/utils/cn';
import { CheckCircle2, FileText, MessageSquare, Phone, Truck } from 'lucide-react';
import { navigateProductView } from '@/lib/runtime/productRoutes';
import { useRecordDeepLink } from '@/lib/runtime/recordDeepLink';
import { MERCENTA_CARRIER_LABELS } from '@/config/shipping';
/**
 * §P4 — the canonical routing RULE is read here for the preview's read-only
 * "carrier route" field (international → DHL, UK domestic → Palletline). The
 * brand no longer selects a carrier: it is Mercenta's routing decision.
 */
import { selectCarrierForShipment } from '@/lib/shipping/carrierRouting';
import { backOrderAvailabilityLabel, canBackOrderLine } from '@/lib/commerce/backorderGate';

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

  /**
   * §Canonical model §11 — the carrier label for a consignment comes from the
   * canonical carrier config (never a local map). The brand does not CHOOSE the
   * carrier (see §P4): this is presentation of Mercenta's routing only.
   */
  const shipCarrierLabel = (v: string) =>
    MERCENTA_CARRIER_LABELS[v as keyof typeof MERCENTA_CARRIER_LABELS] ??
    (v === 'amazon_partner' ? 'Partnered carrier' : v);

  /**
   * §P4 — the canonical instruction store's change signal. The brand surface
   * must re-read Mercenta's outcome (acknowledgement reference, routing request,
   * ASN) as soon as it lands, without a reload.
   */
  const canonicalVersion = useCanonicalStoreVersion();
  void canonicalVersion; // §P4 — canonical change signal → re-read Mercenta's outcome
  /**
   * §P4 — every instruction this PO has issued. The ACKNOWLEDGEMENT is the PO's
   * primary decision record; a PACKING CORRECTION is the brand's later statement
   * about its physical packing and carries its own channel action. Both are read
   * so the brand sees Mercenta's most complete outcome, and a correction is never
   * hidden just because an acknowledgement exists.
   */
  const instructionsByPO = new Map<string, ChannelInstruction[]>();
  for (const current of listChannelInstructions()) {
    const list = instructionsByPO.get(current.purchaseOrderId) ?? [];
    list.push(current);
    instructionsByPO.set(current.purchaseOrderId, list);
  }
  const instructionFor = (poId: string): ChannelInstruction | undefined => {
    const list = instructionsByPO.get(poId) ?? [];
    return list.find((i) => i.type === 'po_acknowledgement') ?? list[0];
  };

  /* ── §Stage-24 — line-item acknowledgment state ── */
  const [ackingPO, setAckingPO] = useState<string | null>(null);
  const [lineAcks, setLineAcks] = useState<
    Record<string, { ackStatus: 'accepted' | 'rejected' | 'backordered'; acknowledgedQty: number; scheduledShipDate?: string; rejectionCode?: string; unitPrice?: number }>
  >({});
  /**
   * §P4 — PACKING CORRECTION state (replaced the brand-side ASN filing).
   *
   * The brand's only packing-related job is to say when its PHYSICAL packing
   * differs from the acknowledged volumes (programme decision 9); the ASN itself
   * is filed by Mercenta. So this state carries carton quantities and a note —
   * no carrier, ship date, PRO/BOL, lot or expiry, because the brand neither
   * routes the freight nor files the document.
   */
  const [correctionPO, setCorrectionPO] = useState<string | null>(null);
  const [correctionCartons, setCorrectionCartons] = useState<Record<string, number>>({});
  const [correctionNote, setCorrectionNote] = useState('');
  /**
   * §UI/UX Wave 2 completion — the brand's PO list is a real record surface, so
   * it gains the established QUEUE → PREVIEW → ACT step: the RecordDrawer previews
   * the real PO record and hands off to the existing inline acknowledgment
   * workflow.
   */
  const [previewPO, setPreviewPO] = useState<string | null>(null);
  /** REAL density control — it changes the rendered PO card padding. */
  const [density, setDensity] = useState<'compact' | 'comfortable'>('compact');

  function beginAck(po: PurchaseOrder) {
    setAckingPO(po.id);
    const init: typeof lineAcks = {};
    /**
     * §BATCH 2b (`AV-006`) — the panel opens on the RECORDED decision when one
     * exists, so an amendment starts from what was acknowledged and a brand that
     * changes one field does not silently re-submit the ordered quantities (which
     * would itself be an unintended amendment).
     */
    for (const l of po.lineItems) {
      init[l.sku] = {
        ackStatus: l.ackStatus && l.ackStatus !== 'unacknowledged' ? l.ackStatus : 'accepted',
        acknowledgedQty: l.acknowledgedQty ?? l.quantity,
        unitPrice: l.acknowledgedUnitPrice ?? l.unitPrice,
        ...(l.scheduledShipDate ? { scheduledShipDate: l.scheduledShipDate } : {}),
        ...(l.rejectionCode ? { rejectionCode: l.rejectionCode } : {}),
      };
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
    /**
     * §P4 — the brand's decision is now an INSTRUCTION to Mercenta. This surface
     * reports the corrected direction and then runs MERCENTA's side of the chain
     * (channel acknowledgement → routing request → ASN) so the brand sees what
     * actually happened to its order.
     */
    const processed = await processPendingChannelInstructions();
    const outcome = processed
      .map((i) => i.outcome)
      .find((o): o is NonNullable<typeof o> => !!o);
    setNotice(
      [
        'Decision issued to Mercenta.',
        outcome?.channelAcknowledgement?.ok
          ? `Mercenta filed the acknowledgement with the retail channel (${outcome.channelAcknowledgement.acknowledgementId}, ${outcome.channelAcknowledgement.status})${outcome.channelAcknowledgement.mode === 'mock' ? ' — simulated, no live call' : ''}.`
          : '',
        outcome?.routingRequest?.raised ? `Mercenta raised the routing request (${outcome.routingRequest.reference}).` : '',
        outcome?.asn?.filed ? `Mercenta filed the ASN (${outcome.asn.reference}).` : outcome?.asn?.note ?? '',
        outcome?.asn?.deductionId
          ? `Shortfall logged as deduction ${outcome.asn.deductionId} — Mercenta will dispute or accept it.`
          : '',
        outcome?.refusedReason ? `Mercenta could not complete the channel action: ${outcome.refusedReason}` : '',
        ...(result.warnings ?? []),
      ]
        .filter(Boolean)
        .join(' • ')
    );
    setAckingPO(null);
    await qc.invalidateQueries({ queryKey: ['purchase_orders'] });
    // §P4 — Mercenta's channel action creates the consignment; refresh the feed.
    await qc.invalidateQueries({ queryKey: ['shipments'] });
    await qc.invalidateQueries({ queryKey: ['deductions'] });
  }

  /**
   * §P4 — PACKING CORRECTION (replaced the brand-side ASN filing).
   *
   * The ASN is automatic on acceptance (decision 9); the brand intervenes ONLY
   * when its physical packing differs from the acknowledged volumes. It therefore
   * sends Mercenta an intended-packaging statement — Mercenta re-files the ASN.
   */
  function beginCorrection(po: PurchaseOrder) {
    setCorrectionPO(po.id);
    setCorrectionNote('');
    const qtyInit: Record<string, number> = {};
    for (const l of po.lineItems) {
      if (l.ackStatus !== 'rejected') {
        qtyInit[l.sku] = l.acknowledgedQty ?? l.quantity;
      }
    }
    setCorrectionCartons(qtyInit);
  }

  async function submitCorrection(po: PurchaseOrder) {
    const issued = issueChannelInstruction({
      type: 'packing_correction',
      brandId: po.brandId,
      purchaseOrderId: po.id,
      poNumber: po.poNumber,
      issuedBy: tenantId ?? po.brandId,
      /** The correction states the actual packing; the acknowledgement lines are restated. */
      lines: po.lineItems.map((l) => instructionLineFor(po, l)),
      cartons: Object.entries(correctionCartons).map(([sku, quantity]) => ({ sku, quantity })),
      ...(correctionNote.trim() ? { note: correctionNote.trim() } : {}),
    });
    if (!issued.ok) {
      setNotice(issued.error ?? 'Packing correction failed.');
      return;
    }
    const corrected = !issued.created;
    const processed = corrected ? [] : await processPendingChannelInstructions();
    const outcome = processed.map((i) => i.outcome).find((o): o is NonNullable<typeof o> => !!o);
    setNotice(
      [
        corrected
          ? 'A packing correction is already recorded for this PO.'
          : 'Packing correction sent to Mercenta.',
        outcome?.asn?.filed
          ? `Mercenta filed the ASN (${outcome.asn.reference}).`
          : outcome?.asn?.note ?? '',
        outcome?.asn?.deductionId
          ? `Shortfall logged as deduction ${outcome.asn.deductionId} — Mercenta will dispute or accept it.`
          : '',
        outcome?.refusedReason ? `Mercenta could not complete the channel action: ${outcome.refusedReason}` : '',
      ]
        .filter(Boolean)
        .join(' • ')
    );
    setCorrectionPO(null);
    await qc.invalidateQueries({ queryKey: ['purchase_orders'] });
    await qc.invalidateQueries({ queryKey: ['shipments'] });
    await qc.invalidateQueries({ queryKey: ['deductions'] });
  }

  const brands = brandsQuery.data?.data ?? [];
  // §Stage-20.3 — tenant-pinned: the brand's own id, always.
  const viewingBrandId_ = tenantId ?? brands[0]?.id ?? null;
  const allPOs = poQuery.data?.data ?? [];
  const pos = allPOs.filter((p) => p.brandId === viewingBrandId_);

  /**
   * §BATCH 7 (Part 4.1) — DEEP LINK: `/brand/purchase_orders?po=PO-9200` expands that
   * purchase order's record. Uses the SAME `?po=` contract the admin PO list consumes,
   * so a work item's "Open record" lands on the record in either shell. Applied once,
   * so it never overrides an expansion the operator makes afterwards.
   */
  const deepLinkPo = useRecordDeepLink('po');
  useEffect(() => {
    if (!deepLinkPo) return;
    const match = pos.find((p) => p.poNumber === deepLinkPo);
    if (!match) return;
    setExpandedPO(match.id);
  }, [deepLinkPo, pos]);
  /**
   * §Wave 3 Part 5 — THE ONE LOADING FLAG for this surface. While a query is
   * resolving its `data` is undefined, so `pos` is [] — and every empty/zero
   * branch below used to fire on a lie ("No purchase orders for this brand
   * yet.", "Showing 0 of 0", "Queue value £0"). Measured in a real browser with
   * a slow data source: those exact strings were painted during load and
   * replaced by 5 orders and £55,832 when the data arrived.
   */
  const pendingPOs = poQuery.isPending || brandsQuery.isPending;
  const filteredPos = pos
    .filter((p) => statusFilter === 'all' || p.status === statusFilter)
    .filter(
      (p) =>
        poSearch.trim() === '' ||
        p.poNumber.toLowerCase().includes(poSearch.trim().toLowerCase())
    );

  /**
   * §P13 / S6 — REPOINTED to the rule's OWNER (the old contract is recorded here).
   *
   * This used to hand-roll the predicate
   * (`po.status === 'received' || po.status === 'under_review'`) — exactly the
   * defect S3 removed from the work layer: a purchase order PAST its 24-hour limit
   * still offered the brand an acknowledgement control that the domain writer
   * (`src/data/api.ts → acknowledgePurchaseOrder`) REFUSES, and one whose order date
   * could not be read was treated as actionable rather than failing closed.
   *
   * The QUEUE set is the owner's own `inQueue` (Amazon's `New` set INSIDE the
   * window), so the control the brand is offered is exactly the action the rule
   * permits — and past the limit the remaining action is the owner's own on-behalf
   * rejection draft below, not a dead acceptance button.
   */
  const actionable = (po: PurchaseOrder) => poAcknowledgementWindow(po).inQueue;

  /** The PO record the preview drawer is showing (brand-scoped list only). */
  const previewRecord = pos.find((p) => p.id === previewPO) ?? null;
  /** The brand's own business name — used to attribute the brand's own approval. */
  const brandLabel =
    brands.find((b) => b.id === viewingBrandId_)?.profile.businessName ??
    viewingBrandId_ ??
    'this brand';

  /**
   * §P13 / S4 — MERCENTA'S ON-BEHALF REJECTION DRAFT, PRODUCED FOR THE BRAND.
   *
   * A purchase order that reaches the final notification stage without the brand's
   * decision gets Mercenta's DRAFT of the rejection the retail channel requires, and
   * the brand approves it before anything is performed. `draftOnBehalfRejection` is
   * IDEMPOTENT (one record per draft content, attributed to Mercenta's declared
   * automatic identity and audited) and FAILS CLOSED, so asking for it on every
   * render is safe: it writes at most once per draft, and never for a purchase order
   * that does not owe the channel a rejection.
   */
  useEffect(() => {
    for (const po of pos) {
      if (poNeedsAutoRejection(po)) draftOnBehalfRejection(po.id);
    }
  }, [pos]);

  /** The draft to SHOW — derived by the rule's OWNER; null when none is due. */
  const onBehalfDraftFor = (po: PurchaseOrder) => {
    const draft = poOnBehalfRejectionDraft(po);
    return draft.available ? draft : null;
  };

  /**
   * §P13 / S4 — THE BRAND'S APPROVAL.
   *
   * This is the ONLY thing that makes Mercenta perform the channel rejection, and it
   * approves the EXACT draft that was shown (its content-addressed id), so an
   * approval can never be aimed at a stale draft. Nothing here performs the channel
   * action itself: the domain operation does that through the ONE writer.
   */
  async function approveOnBehalf(po: PurchaseOrder, draftId: string) {
    const result = approveOnBehalfRejection(po.id, {
      actorBrandId: viewingBrandId_ ?? undefined,
      actorLabel: `${brandLabel} (brand approval)`,
      draftId,
    });
    if (!result.ok) {
      setNotice(result.error ?? 'Approval failed.');
      return;
    }
    /**
     * §P4 — the approved rejection is an INSTRUCTION to Mercenta, so this surface
     * then runs MERCENTA's side of the chain and reports what actually happened.
     */
    const processed = await processPendingChannelInstructions();
    const outcome = processed
      .map((i) => i.outcome)
      .find((o): o is NonNullable<typeof o> => !!o);
    setNotice(
      [
        `Approved — Mercenta performed the retail channel's required rejection on your behalf (draft ${result.draftId}).`,
        outcome?.channelAcknowledgement?.ok
          ? `Channel acknowledgement ${outcome.channelAcknowledgement.acknowledgementId} (${outcome.channelAcknowledgement.status})${outcome.channelAcknowledgement.mode === 'mock' ? ' — simulated, no live call' : ''}.`
          : '',
        outcome?.refusedReason ? `Mercenta could not complete the channel action: ${outcome.refusedReason}` : '',
      ]
        .filter(Boolean)
        .join(' • ')
    );
    await qc.invalidateQueries({ queryKey: ['purchase_orders'] });
    await qc.invalidateQueries({ queryKey: ['shipments'] });
    await qc.invalidateQueries({ queryKey: ['deductions'] });
  }

  /**
   * §Stage-24 / §P13 / S6 — THE 24-HOUR ACKNOWLEDGEMENT WINDOW, PRESENTED FROM ITS
   * OWNER.
   *
   * REPOINTED (the old contract is recorded here): this previously computed the
   * deadline itself — `received + 24 * 60 * 60 * 1000` — and derived `hoursLeft`
   * from it, which was a second copy of an Amazon rule whose owner is
   * `src/lib/commerce/poAcknowledgementWindow.ts`. It also rendered
   * `Ack within NaNh` for a purchase order whose order date could not be read
   * (instead of failing closed, as the owner requires).
   *
   * Now: the owner derives the window, the owner's `reason` states it (verbatim)
   * and the presentation owner (`ackDeadlinePresentation`) renders the urgency. An
   * unreadable window is stated as unreadable — never as an open one.
   */
  function AckDeadline({ po }: { po: PurchaseOrder }) {
    const window = poAcknowledgementWindow(po);
    /** Nothing is owed (or the decision is recorded) — the owner says so. */
    if (window.channelState === 'acknowledged' || window.channelState === 'closed') return null;
    if (window.channelState === 'unknown' || window.hoursLeft === null) {
      return (
        <span title={window.reason}>
          <StatusBadge className="text-ds-micro" tone="neutral" dataStatus="ack_unknown">
            Ack window unreadable
          </StatusBadge>
        </span>
      );
    }
    const ack = ackDeadlinePresentation(window.hoursLeft);
    return (
      <span title={window.reason}>
        <StatusBadge className="text-ds-micro" tone={ack.tone} dataStatus={ack.dataStatus}>
          {ack.label}
          {window.onBehalfAvailable ? ' · closing window' : ''}
        </StatusBadge>
      </span>
    );
  }

  return (
    <WorkspaceFrame>
      <WorkspaceHeader
        eyebrow="Brand workspace · Commerce"
        title="Purchase Orders"
        description="Review, accept or reject purchase orders from the UK retail network"
        meta={
          <>{pendingPOs ? (
            <span className="text-ds-label text-muted" role="status" aria-live="polite">
              Loading your order queue…
            </span>
          ) : (
          <>
            <span className="text-ds-label text-muted">
              Showing <span className="font-mono text-strong">{filteredPos.length}</span> of{' '}
              <span className="font-mono text-strong">{pos.length}</span>
            </span>
            <span className="text-ds-label text-muted">
              Queue value{' '}
              <span className="font-mono text-strong">
                £{pos.reduce((sum, p) => sum + p.poValue, 0).toLocaleString()}
              </span>
            </span>
          </>
          )}</>
        }
        toolbar={
          <div className="flex flex-wrap items-center gap-2">
            <input
              value={poSearch}
              onChange={(e) => setPoSearch(e.target.value)}
              placeholder="Search PO number…"
              aria-label="Search purchase orders"
              className="bg-surface border border-hairline rounded-ds-sm px-3 py-1.5 text-xs text-strong w-52 focus:outline-none focus:border-accent-500/40"
            />
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              aria-label="Filter by status"
              className="bg-surface border border-hairline rounded-ds-sm px-2 py-1.5 text-xs text-strong cursor-pointer"
            >
              <option value="all">Status: all</option>
              {PO_STATUS_ORDER.map((s) => (
                <option key={s} value={s}>{poStatusPresentation(s).label}</option>
              ))}
            </select>
            <span className="ml-auto flex items-center gap-2">
              <span className="hidden text-ds-micro uppercase tracking-[0.14em] text-faint sm:inline">
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
                className="text-ds-label text-muted hover:text-strong"
                onClick={() =>
                  downloadCsv(
                    `mercenta-pos-${viewingBrandId_ ?? 'all'}.csv`,
                    ['PO', 'Date', 'Status', 'Lines', 'Value GBP'],
                    filteredPos.map((p) => [
                      p.poNumber,
                      orderDateLabel(p.orderDate),
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
        /* §Wave 3 Part 5 — the band shows the canonical loading state while the
           queries resolve, instead of four tiles asserting 0 orders and £0. */
        loading={pendingPOs}
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
            /**
             * §DEFECT FIXED AT SOURCE (owner-reported, 2026-09-30) — this tile said
             * "Received", which read as *the goods arrived* while it actually counts
             * orders whose first lifecycle state is "the order arrived from the
             * channel". The label now comes FROM THE OWNER
             * (`poStatusPresentation`), so it cannot drift from the badge on the row.
             */
            label: poStatusPresentation('received').label,
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
        <div role="status" className="mt-3 bg-sky-500/10 border border-sky-500/20 rounded-ds-md p-3 text-xs text-state-info">
          {notice}
        </div>
      )}

      {/* PO list */}
      <div className="mt-3 space-y-3">
        {/* §Wave 3 Part 5 — while the query resolves, this list must not claim
            the brand has no orders. Measured defect: it showed "Showing 0 of 0",
            "Queue value £0" and "No purchase orders for this brand yet." during
            load and, once loaded, 5 orders and £55,832. */}
        {pendingPOs ? (
          <Card>
            <LoadingState rows={5} label="Loading purchase orders…" />
          </Card>
        ) : null}
        {!pendingPOs && filteredPos.map((po) => {
          const canAct = actionable(po);
          /**
           * §BATCH 2b (`AV-006`) — AN AMENDMENT CONTROL, offered exactly when the
           * channel's update window is OPEN. The rule's OWNER decides
           * (`poAmendmentWindow`), so past the window — where only ship-date and
           * delivery-date changes remain — no control is offered that the domain
           * writer would then refuse (the defect class S3 removed from the work
           * layer). A PO already in an acknowledgement obligation keeps the
           * first-decision control above instead.
           */
          const canAmend = !canAct && poAmendmentWindow(po).open && po.status !== 'rejected';
          const expanded = expandedPO === po.id;
          /**
           * §P13 / S4 / S6 — the on-behalf rejection draft for THIS purchase order,
           * derived by the rule's OWNER (`poOnBehalfRejectionDraft`). Present only
           * while the rejection the retail channel requires is Mercenta's to perform
           * and the brand has not already decided.
           *
           * §S6 — NOT gated on `canAct`: the owner offers the draft in the closing
           * window AND PAST the limit, which is exactly the case where the brand can
           * no longer accept and a rejection is the only remaining action. The
           * owner's own `available` predicate is the gate (it fails closed with a
           * stated refusal everywhere else).
           */
          const onBehalfDraft = onBehalfDraftFor(po);
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
                    <span className="font-mono text-xs text-accent">{po.poNumber}</span>
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
                      <Badge className="text-ds-micro bg-accent-500/15 text-accent-400 border-accent-500/20">(sim)</Badge>
                    )}
                  </div>
                  <div className="font-mono text-ds-micro text-faint mt-1">
                    {orderDateLabel(po.orderDate)} · {po.lineItems.length} line item(s)
                    {po.freightTerm && (
                      <span className="ml-2 text-muted">
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
                        routing={instructionFor(po.id)?.outcome?.routingRequest}
                      />
                    </div>
                  )}
                  </button>
                {/* §Wave-3 Part 4 — the action cluster may WRAP. It held its
                    controls (acknowledgment chip, Preview, shipping documents)
                    on one unshrinkable line, so at 390px it measured 240px wider
                    than the content region and the page had to be scrolled
                    sideways to reach a control. Wrapping changes nothing above the
                    width where everything already fits. */}
                <div className="flex flex-wrap items-center gap-2 sm:gap-3">
                  {po.status === 'rejected' && (
                    <Badge className="text-ds-micro bg-red-500/15 text-red-300 border-red-500/20 max-w-[220px] truncate">
                      {po.rejectionReason}
                    </Badge>
                  )}
                  {/* §Stage-24 / §P13 / S6 — the 24-hour acknowledgment window, as its
                      OWNER derives it. A decided or closed purchase order renders
                      nothing; an unreadable window is stated as unreadable. */}
                  <AckDeadline po={po} />
                  <Button
                    variant="ghost"
                    className="text-ds-label"
                    data-state={`brand-po-preview-${po.id}`}
                    onClick={() => setPreviewPO(po.id)}
                  >
                    Preview
                  </Button>
                  {/*
                    §Dashboard-cleanup P0 — the brand's ACTUAL next step after
                    accepting a PO: open its shipping documents in the Logistics
                    Hub. The old post-acceptance experience ended on a deadline
                    note, which told the brand nothing they could act on.

                    §Dashboard + logistics cleanup programme (2026-09-22, session
                    13) — DEFECT FIXED AT ITS CAUSE. This control was first placed
                    INSIDE the row's expand `<button>`, which axe correctly reported
                    as `nested-interactive` (serious) on BRAND · Purchase Orders:
                    a button inside a button is invalid for keyboard and assistive
                    technology, and clicking it also toggled the row. It now sits in
                    the row's ACTION CLUSTER beside the other controls, as a sibling
                    of the expand button — same behaviour, same data-testid, no
                    nested interactive elements.
                  */}
                  {(po.status === 'accepted' || po.status === 'ready_to_fulfil') && (
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
                  )}
                  <span className="font-mono text-sm font-semibold text-strong">
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
                  {/* §BATCH 2b (`AV-006`) — amend a recorded acknowledgement inside
                      the channel's 48-hour update window. */}
                  {canAmend && (
                    <Button
                      variant="secondary"
                      className={cn('text-xs', ackingPO === po.id && 'bg-emerald-500/20')}
                      data-testid={`po-amend-${po.poNumber}`}
                      onClick={() => (ackingPO === po.id ? submitAck(po) : beginAck(po))}
                    >
                      <CheckCircle2 className="w-3.5 h-3.5 mr-1" />
                      {ackingPO === po.id ? 'Submit amendment' : 'Amend acknowledgement'}
                    </Button>
                  )}
                  {!canAct &&
                    po.status !== 'rejected' &&
                    (po.status === 'accepted' || po.status === 'ready_to_fulfil') &&
                    !isFinanced && (
                      /**
                       * §P4 — REPLACED "Create Shipment / File ASN".
                       *
                       * That control was the brand filing the channel document
                       * (with its own carrier choice), which is the wrong
                       * direction: Mercenta files the ASN automatically on
                       * acceptance (programme decision 9). The brand's remaining
                       * packing job is to tell Mercenta when the PHYSICAL packing
                       * differs — an instruction, not a filing.
                       */
                      <Button
                        variant="ghost"
                        className="text-xs text-muted hover:text-strong"
                        data-testid={`po-packing-correction-${po.poNumber}`}
                        onClick={() => (correctionPO === po.id ? setCorrectionPO(null) : beginCorrection(po))}
                      >
                        <Truck className="w-3.5 h-3.5 mr-1.5" />
                        Packing differs?
                      </Button>
                    )}
                  {/* §Stage-17 — contact the brand about THIS PO, inline. */}
                  <div className="flex gap-1">
                    <Button
                      variant="ghost"
                      className="text-xs text-muted hover:text-strong"
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
                      className="text-xs text-muted hover:text-strong"
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

              {/* §BATCH 2c (`AV-024`) — the retail CHANNEL changed this order. The
                  notice is on the order itself (not behind a control), because the
                  brand must know which version it is working from before it decides
                  anything. It renders nothing for an unrevised order. */}
              <ChannelRevisionNotice po={po} />
              {/* §BATCH 2d (`AV-008` / `AV-023`) — and the acknowledged-price notice,
                  so the brand sees the price its invoice will bill before anything else. */}
              <AckPriceNotice po={po} />
              {/* §BATCH 2j (`AV-010b`) — the channel's HOLD statement, when the record
                  carries one (declared or lifted). Renders nothing when the record carries
                  no statement — an unread hold state is stated where the duty is judged,
                  inside the acknowledgement panel, never invented as "not held". */}
              <ChannelHoldNotice po={po} />
              {/* §BATCH 2j (`AV-009`) — which lines the channel implicitly rejected because
                  the acknowledgement omitted them. Renders nothing for a complete one. */}
              <ImplicitRejectionNotice po={po} />
              {/* §DEFECT FIXED (owner-reported, 2026-09-30) — the brand's own authorisation
                  for Mercenta to decide this order. Renders nothing inside the closing window
                  or once the order is decided. */}
              <OnBehalfAuthorisationControl po={po} actor={`${po.brandId} (brand)`} />
              {/* Inline brand communication (shared layer, same thread as Messages Hub) */}
              {contactingPO?.id === po.id && (
                <div className="mt-3 pt-3 border-t border-hairline">
                  <BrandCommPanel
                    brandId={po.brandId}
                    compact
                    poRef={po.poNumber}
                  />
                </div>
              )}

              {/* §Stage-24 — line-item acknowledgment panel.
                  §BATCH 2b (`AV-006`) — the same panel also serves an AMENDMENT
                  when the channel's update window is open. */}
              {ackingPO === po.id && (canAct || canAmend) && (
                <div className="mt-3 bg-emerald-500/10 border border-state-success/20 rounded-ds-md p-3 space-y-3">
                  <p className="text-ds-label text-state-success">
                    Acknowledge each line — Accepted, Rejected (reason code
                    required), or Backordered (scheduled ship date required).
                    Acknowledged quantity can never exceed the ordered quantity.
                  </p>
                  {/* §BATCH 2b (`AV-006`) — the UPDATE rule, rendered from its ONE
                      owner so the brand is told its real obligation. */}
                  {canAmend && (
                    <p
                      className="text-ds-micro text-state-info/80"
                      data-testid={`po-amend-window-state-${po.poNumber}`}
                    >
                      {PO_AMENDMENT_WINDOW_RULE_TEXT}
                    </p>
                  )}
                  {/* §P13 / S6 — the window this decision is being made inside, stated
                      by the rule's OWNER verbatim (never re-derived by the surface). */}
                  <p
                    className="text-ds-micro text-state-success/80"
                    data-testid={`po-ack-window-state-${po.poNumber}`}
                  >
                    {poAcknowledgementWindow(po).reason}
                  </p>
                  {/* §BATCH 2j (`AV-010b`) — THE CHANNEL'S HOLD DUTY, stated by its OWNER at
                      the moment of decision. An order whose hold state has not been read says
                      exactly that: the duty is UNVERIFIED, never assumed satisfied. */}
                  <HoldDutyLine po={po} />
                  {/* §BATCH 2j (`AV-009`) — the completeness of the submission being prepared,
                      derived by the rule's owner BEFORE it is sent, so the brand can decide
                      every line rather than have the channel reject the ones it omitted. */}
                  <SubmitCompletenessNotice po={po} lineAcks={lineAcks} />
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
                        <span className="font-mono text-strong w-20">{li.sku}</span>
                        <span className="text-muted w-40 truncate">{li.productName}</span>
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
                          className="bg-surface border border-hairline rounded-ds-sm px-1.5 py-1 text-xs text-strong"
                          data-testid={`po-ack-status-${li.sku}`}
                          data-backorder-allowed={backOrderAllowed ? 'true' : 'false'}
                        >
                          <option value="accepted">Accepted</option>
                          {backOrderAllowed && <option value="backordered">Backordered</option>}
                          <option value="rejected">Rejected</option>
                        </select>
                        {!backOrderAllowed && (
                          <span
                            className="text-ds-micro text-muted"
                            data-testid={`po-backorder-blocked-${li.sku}`}
                          >
                            {backOrderAvailabilityLabel(li)}
                          </span>
                        )}
                        {a.ackStatus !== 'rejected' && (
                          <label className="text-muted">
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
                              className="w-16 ml-1 bg-surface border border-hairline rounded-ds-sm px-2 py-1 text-strong"
                            />
                            <span className="ml-1">/ {li.quantity}</span>
                          </label>
                        )}
                        {/* §Batch-3 — unit price input for cost-price consistency check */}
                        {a.ackStatus !== 'rejected' && (
                          <label className="text-muted">
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
                              className="w-20 ml-1 bg-surface border border-hairline rounded-ds-sm px-2 py-1 text-strong"
                            />
                          </label>
                        )}
                        {a.ackStatus === 'backordered' && (
                          <label className="text-muted">
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
                              className="ml-1 bg-surface border border-hairline rounded-ds-sm px-2 py-1 text-strong"
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
                            className="bg-surface border border-hairline rounded-ds-sm px-1.5 py-1 text-xs text-strong"
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

              {/* §P13 / S4 — THE ON-BEHALF REJECTION DRAFT MERCENTA PRODUCED FOR THE BRAND */}
              {onBehalfDraft && (
                <div
                  className="mt-3 bg-red-500/5 border border-red-500/20 rounded-ds-md p-3 space-y-2"
                  data-testid={`po-onbehalf-draft-${po.poNumber}`}
                >
                  <p className="text-ds-label text-state-danger font-medium">
                    Mercenta's draft — the rejection the retail channel requires
                  </p>
                  <p className="text-ds-micro text-muted">{onBehalfDraft.ruleText}</p>
                  <p className="text-ds-micro text-muted" data-testid={`po-onbehalf-draft-id-${po.poNumber}`}>
                    Draft <span className="font-mono">{onBehalfDraft.draftId}</span> · drafted by Mercenta
                    (automatic) for {brandLabel} · reason code{' '}
                    <span className="font-mono">{onBehalfDraft.rejectionCode}</span>
                    {onBehalfDraft.acknowledgementDeadline
                      ? ` · deadline ${new Date(onBehalfDraft.acknowledgementDeadline).toLocaleString('en-GB')}`
                      : ''}
                    {onBehalfDraft.autoRejectAt
                      ? ` · on-behalf stage ${new Date(onBehalfDraft.autoRejectAt).toLocaleString('en-GB')}`
                      : ''}
                  </p>
                  <p className="text-ds-micro text-state-warning" data-testid={`po-onbehalf-state-${po.poNumber}`}>
                    {onBehalfDraft.brandMayStillDecide
                      ? 'You may still decide for yourself inside the 24-hour window — approving lets Mercenta perform the required rejection for you.'
                      : 'The 24-hour window has closed: the documented action past the limit is a rejection, and an acceptance is refused.'}
                  </p>
                  <ul className="space-y-0.5">
                    {onBehalfDraft.lines.map((l) => (
                      <li key={l.sku} className="text-ds-micro text-strong font-mono">
                        {l.sku} · {l.productName} · reject {l.quantity} @ £{l.unitPrice} · {l.rejectionCode}
                      </li>
                    ))}
                  </ul>
                  <Button
                    className="text-xs"
                    data-testid={`po-onbehalf-approve-${po.poNumber}`}
                    onClick={() => void approveOnBehalf(po, onBehalfDraft.draftId)}
                  >
                    <CheckCircle2 className="w-3.5 h-3.5 mr-1" />
                    Approve — reject all lines on my behalf
                  </Button>
                </div>
              )}

              {/* §P13 / S4 — the recorded draft and the brand's approval of it */}
              {po.onBehalfDraft?.approvedAt && (
                <p
                  className="mt-2 text-ds-micro text-muted"
                  data-testid={`po-onbehalf-approved-${po.poNumber}`}
                >
                  On-behalf rejection draft <span className="font-mono">{po.onBehalfDraft.id}</span> approved by{' '}
                  {po.onBehalfDraft.approvedBy} at{' '}
                  {new Date(po.onBehalfDraft.approvedAt).toLocaleString('en-GB')}
                  {po.onBehalfDraft.approvedByAdmin ? ' (Mercenta admin override)' : ''} · reason{' '}
                  {po.onBehalfDraft.rejectionCode}
                </p>
              )}

              {/* §P4 — MERCENTA'S CHANNEL ACTION FOR THIS PO (the brand sees status) */}
              {(() => {
                const list = instructionsByPO.get(po.id) ?? [];
                const instruction = instructionFor(po.id);
                if (!instruction) return null;
                const o = instruction.outcome;
                const correction = list.find((i) => i.type === 'packing_correction');
                const correctionOutcome = correction?.outcome;
                return (
                  <div
                    className="mt-3 bg-sky-500/5 border border-sky-500/20 rounded-ds-md p-3 space-y-1"
                    data-testid={`po-mercenta-status-${po.poNumber}`}
                  >
                    <p className="text-ds-label text-state-info font-medium">
                      Mercenta channel action — you are not required to file anything
                    </p>
                    <p className="text-ds-micro text-muted">
                      Your decision was issued to Mercenta as an instruction. Mercenta submits the
                      acknowledgement, raises the routing request and files the ASN on your behalf.
                    </p>
                    {instruction.state === 'pending_mercenta_action' && (
                      <p className="text-ds-micro text-state-warning" data-testid={`po-mercenta-pending-${po.poNumber}`}>
                        Pending — Mercenta is submitting the acknowledgement to the retail channel.
                      </p>
                    )}
                    {instruction.state === 'refused' && (
                      <p className="text-ds-micro text-red-300" data-testid={`po-mercenta-refused-${po.poNumber}`}>
                        Mercenta could not complete the channel action: {o?.refusedReason ?? 'reason not recorded'} —
                        no channel step was completed. Mercenta retries it as an attributed action.
                      </p>
                    )}
                    {o?.channelAcknowledgement?.ok && (
                      <p className="text-ds-micro text-strong" data-testid={`po-mercenta-ack-${po.poNumber}`}>
                        Acknowledgement transmitted by Mercenta — {o.channelAcknowledgement.acknowledgementId} ·{' '}
                        {o.channelAcknowledgement.status}
                        {o.channelAcknowledgement.mode === 'mock' ? ' · simulated (no live channel call)' : ''}
                      </p>
                    )}
                    {o?.routingRequest && (
                      <p className="text-ds-micro text-strong" data-testid={`po-mercenta-routing-${po.poNumber}`}>
                        {o.routingRequest.raised
                          ? `Routing request raised by Mercenta — ${o.routingRequest.reference} · ${routingCarrierLabel(o.routingRequest)}`
                          : `Routing request not applicable — ${o.routingRequest.reference}`}
                      </p>
                    )}
                    {o?.asn && (
                      <p className="text-ds-micro text-strong" data-testid={`po-mercenta-asn-${po.poNumber}`}>
                        {o.asn.filed
                          ? `ASN filed by Mercenta — ${o.asn.reference}${o.asn.shipmentId ? ` · consignment ${o.asn.shipmentId}` : ''}`
                          : `ASN — ${o.asn.note ?? 'not filed'}`}
                      </p>
                    )}
                    {/* The brand's packing correction is a separate instruction with its own action. */}
                    {correction && correction !== instruction && (
                      <p className="text-ds-micro text-strong" data-testid={`po-mercenta-correction-${po.poNumber}`}>
                        {correctionOutcome?.asn?.filed
                          ? `Packing correction recorded — Mercenta filed the ASN from it (${correctionOutcome.asn.reference}).`
                          : correctionOutcome?.refusedReason
                            ? `Packing correction recorded — Mercenta could not complete it: ${correctionOutcome.refusedReason}`
                            : 'Packing correction recorded — Mercenta is acting on it.'}
                      </p>
                    )}
                  </div>
                );
              })()}

              {/*
                §P4 — PACKING CORRECTION (replaced the brand-side ASN filing form).
                The ASN is automatic on acceptance; the brand states only when its
                PHYSICAL packing differs, and Mercenta re-files the document.
              */}
              {correctionPO === po.id && (
                <div className="mt-3 bg-blue-500/10 border border-blue-500/20 rounded-ds-md p-3 space-y-2">
                  <p className="text-ds-label text-state-info">
                    Tell Mercenta how this consignment was actually packed. Mercenta re-files the ASN
                    with these quantities — you do not file the document and you do not choose the carrier.
                  </p>
                  <table className="w-full text-ds-label">
                    <thead>
                      <tr className="text-muted">
                        <th className="text-left py-1">SKU</th>
                        <th className="text-right py-1">Acknowledged</th>
                        <th className="text-right py-1">Packed qty</th>
                      </tr>
                    </thead>
                    <tbody>
                      {po.lineItems
                        .filter((l) => l.ackStatus !== 'rejected')
                        .map((l) => (
                          <tr key={l.sku}>
                            <td className="py-1 font-mono text-muted">{l.sku}</td>
                            <td className="py-1 text-right font-mono text-muted">
                              {l.acknowledgedQty ?? l.quantity}
                            </td>
                            <td className="py-1 text-right">
                              <input
                                type="number"
                                min={0}
                                max={l.acknowledgedQty ?? l.quantity}
                                value={correctionCartons[l.sku] ?? 0}
                                onChange={(e) =>
                                  setCorrectionCartons((prev) => ({ ...prev, [l.sku]: Number(e.target.value) }))
                                }
                                className="w-20 bg-surface border border-hairline rounded-ds-sm px-2 py-1 text-strong text-right"
                              />
                            </td>
                          </tr>
                        ))}
                    </tbody>
                  </table>
                  <label className="block text-ds-label text-muted">
                    Note for Mercenta (optional)
                    <input
                      value={correctionNote}
                      onChange={(e) => setCorrectionNote(e.target.value)}
                      className="block w-full mt-0.5 bg-surface border border-hairline rounded-ds-sm px-2 py-1 text-strong"
                    />
                  </label>
                  {/* §P4 — Mercenta's routing status (read-only; the brand files nothing). */}
                  <RoutingRequestStatus
                    poFreightTerm={po.freightTerm}
                    shipWindowEnd={po.shipWindowEnd}
                    routing={instructionFor(po.id)?.outcome?.routingRequest}
                  />
                  <ShippingCostEstimate
                    carrier={(po.freightTerm === 'collect' ? 'amazon_partner' : 'dhl') as 'dhl'}
                    totalWeightKg={po.lineItems.reduce((s, l) => s + ((l.acknowledgedQty ?? l.quantity) * 0.4), 0)}
                    totalCbm={po.lineItems.length * 0.05}
                    cartonCount={po.lineItems.filter((l) => l.ackStatus !== 'rejected').length}
                    compact
                  />
                  <div className="flex items-center gap-2">
                    <Button className="text-xs" onClick={() => submitCorrection(po)}>
                      Send packing correction to Mercenta
                    </Button>
                    <Button variant="ghost" className="text-xs text-muted" onClick={() => setCorrectionPO(null)}>
                      Close
                    </Button>
                  </div>
                </div>
              )}

              {/* Expanded detail + fulfillment-track branching */}
              {expanded && (
                <div className="mt-4 pt-3 border-t border-hairline space-y-3">
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="text-faint">
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
                          <td className="py-1 font-mono text-muted">{li.sku}</td>
                          <td className="py-1 text-strong">{li.productName}</td>
                          <td className="py-1 text-right font-mono">{li.quantity}</td>
                          <td className="py-1 text-right font-mono">£{li.unitPrice}</td>
                          <td className="py-1 text-right font-mono">
                            £{(li.quantity * li.unitPrice).toFixed(2)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>

                  {/* §BATCH 2a (`AV-020b`) — Mercenta's OWN replenishment target.
                      It used to announce that channel visibility had been lost
                      once the date passed — a consequence no channel source
                      states. That announcement is removed. */}
                  {po.lineItems.some((l) => l.ackStatus === 'backordered' && l.backorderRestockDeadline) && (
                    <div className="border border-state-warning/20 bg-amber-500/5 rounded-ds-md p-2">
                      <p className="text-ds-micro font-medium text-state-warning mb-1">{BACKORDER_RESTOCK_TARGET.heading}</p>
                      <div className="space-y-1">
                        {po.lineItems.filter((l) => l.ackStatus === 'backordered' && l.backorderRestockDeadline).map((l) => {
                          const deadline = new Date(l.backorderRestockDeadline + 'T00:00:00Z');
                          const daysLeft = Math.ceil((deadline.getTime() - Date.now()) / 86400000);
                          return (
                            <div key={l.sku} className="flex items-center justify-between text-ds-micro">
                              <span className="font-mono text-muted">{l.sku}</span>
                              <span className={daysLeft <= 0 ? 'text-red-400 font-medium' : daysLeft <= 7 ? 'text-state-warning' : 'text-muted'}>
                                {daysLeft <= 0
                                  ? BACKORDER_RESTOCK_TARGET.overdueLabel
                                  : daysLeft + " day(s) to Mercenta's restock target (" + new Date(l.backorderRestockDeadline as string).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' }) + ')'
                                }
                              </span>
                            </div>
                          );
                        })}
                      </div>
                      <p className="text-ds-micro text-faint mt-1">{BACKORDER_RESTOCK_TARGET.attributionNote}</p>
                    </div>
                  )}

                  {/* §Batch-3 — Acknowledgment history per line */}
                  {po.lineItems.some((l) => l.ackHistory && l.ackHistory.length > 0) && (
                    <div className="border border-hairline rounded-ds-md p-2">
                      <p className="text-ds-micro font-medium text-muted mb-1">Acknowledgment History</p>
                      <table className="w-full text-ds-micro">
                        <thead>
                          <tr className="text-faint">
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
                                  <td className="py-0.5 font-mono text-muted">{l.sku}</td>
                                  <td className="py-0.5 text-center text-muted">{h.acknowledgedAt.slice(0, 16).replace('T', ' ')}</td>
                                  <td className="py-0.5 text-center">
                                    <StatusBadge
                                      className="text-ds-micro"
                                      dataStatus={ackStatusPresentation(h.ackStatus).dataStatus}
                                      tone={ackStatusPresentation(h.ackStatus).tone}
                                    >
                                      {ackStatusPresentation(h.ackStatus).label}
                                    </StatusBadge>
                                  </td>
                                  <td className="py-0.5 text-right font-mono text-muted">{h.acknowledgedQty}</td>
                                  <td className="py-0.5 text-right font-mono text-muted">£{h.unitPrice.toFixed(2)}</td>
                                  <td className="py-0.5 text-muted">{h.rejectionCode ?? '—'}</td>
                                </tr>
                              ))
                            )}
                        </tbody>
                      </table>
                    </div>
                  )}

                  {isFinanced && (po.status === 'accepted' || po.status === 'ready_to_fulfil') && (
                    <div className="bg-emerald-500/10 border border-state-success/20 rounded-ds-md p-3 text-ds-label text-state-success flex items-start gap-2">
                      <CheckCircle2 className="w-4 h-4 mt-0.5 flex-shrink-0" />
                      <span>
                        Accepted — Mercenta is handling fulfilment and financing for this
                        purchase order. No shipment action is needed from you; payouts
                        follow your financed payment terms.
                      </span>
                    </div>
                  )}
                  {!isFinanced && po.status === 'accepted' && (
                    <div className="bg-blue-500/10 border border-blue-500/20 rounded-ds-md p-3 text-ds-label text-state-info flex items-start gap-2">
                      <Truck className="w-4 h-4 mt-0.5 flex-shrink-0" />
                      <span>
                        {fulfillmentTrackLabel('direct_fulfillment')} — Mercenta raises the shipment request and files the ASN
                        for this PO. Your part is to ship on time and to say here if your physical
                        packing differs from the acknowledged quantities.
                      </span>
                    </div>
                  )}
                </div>
              )}
            </Card>
            </div>
          );
        })}
        {!pendingPOs && filteredPos.length === 0 && (
          <Card className="p-8 text-center">
            <p className="text-xs text-faint">No purchase orders for this brand yet.</p>
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
              <span className="text-ds-micro text-faint">
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

/* ── CHANNEL-ISSUED REVISION NOTICE (§BATCH 2c / `AV-024`) ──────────────────
 *
 * A channel-issued revision is the RETAIL CHANNEL changing the ORDER. It is not a
 * brand amendment to its own acknowledgement (`AV-006`), so the brand must be told:
 *
 *   · which VERSION of the order it is working from (`poRevisionState`, the ONE
 *     owner of that answer — never re-derived here);
 *   · exactly what changed, labelled from the ONE change-kind map;
 *   · when the channel's change undercut a decision the brand had already recorded,
 *     that Mercenta's own review flag applies and the acknowledgement must be
 *     brought up to the updated order before anything can ship;
 *   · and the rule itself, rendered from `PO_REVISION_RULE_TEXT`.
 *
 * It renders NOTHING when the channel has never changed the order, so no brand is
 * ever shown an empty notice. Pure and module-level (no hooks).
 */
function ChannelRevisionNotice({ po }: { po: PurchaseOrder }) {
  const state = poRevisionState(po);
  if (state.revisionNumber === 0) return null;
  const latest = state.latest;
  return (
    <div
      className="mt-3 rounded-ds-md border border-sky-500/20 bg-sky-500/10 p-3"
      data-testid={`po-revision-notice-${po.poNumber}`}
    >
      <p className="text-ds-label text-state-info">
        The retail channel changed this purchase order — you are working from version{' '}
        {state.revisionNumber} of it.
      </p>
      {state.channelCancelled && (
        <p
          className="mt-1 text-ds-label text-red-300"
          data-testid={`po-revision-cancelled-${po.poNumber}`}
        >
          The retail channel cancelled this order.
        </p>
      )}
      {latest && latest.changes.length > 0 && (
        <ul className="mt-1.5 space-y-0.5" data-testid={`po-revision-changes-${po.poNumber}`}>
          {latest.changes.map((change, index) => (
            <li
              key={`${change.kind}-${change.subject}-${index}`}
              className="text-ds-micro text-state-info/80"
            >
              {PO_CHANNEL_CHANGE_KIND_LABELS[change.kind]} — {change.detail}
            </li>
          ))}
        </ul>
      )}
      {latest && latest.changes.length === 0 && (
        <p className="mt-1.5 text-ds-micro text-state-info/80">
          {latest.changeKinds.map((kind) => PO_CHANNEL_CHANGE_KIND_LABELS[kind]).join(' · ')}
        </p>
      )}
      {latest?.reviewReason && (
        <p
          className="mt-1.5 text-ds-micro text-state-warning"
          data-testid={`po-revision-review-${po.poNumber}`}
        >
          {latest.reviewReason}
        </p>
      )}
      {state.acknowledgementStale && (
        <p
          className="mt-1.5 text-ds-micro text-state-warning"
          data-testid={`po-revision-stale-${po.poNumber}`}
        >
          Your acknowledgement answers an earlier version of this order, so it must be updated
          before this order can be shipped.
        </p>
      )}
      <p
        className="mt-1.5 text-ds-micro text-state-info/70"
        data-testid={`po-revision-rule-${po.poNumber}`}
      >
        {PO_REVISION_RULE_TEXT}
      </p>
    </div>
  );
}

/**
 * §BATCH 2d (`AV-008` / `AV-023`) — THE BRAND-FACING ACKNOWLEDGED-PRICE NOTICE.
 *
 * Shown on the order itself, and only when the price the brand acknowledged differs
 * from the order price. It states (a) the order price and the acknowledged price, (b)
 * that the invoice bills the acknowledged price — so the acknowledgement and the
 * invoice match, and (c) the channel's own documented rule that its payment system
 * compares the two and may delay payment when they differ. Derived entirely from the
 * rule's ONE owner; renders nothing for an order with no divergence.
 */
function AckPriceNotice({ po }: { po: PurchaseOrder }) {
  const divergences = ackPriceDivergences(po);
  if (divergences.length === 0) return null;
  return (
    <div
      className="mt-3 rounded-ds-md border border-state-warning/20 bg-amber-500/10 p-3"
      data-testid={`ack-price-notice-${po.poNumber}`}
    >
      <p className="text-ds-label text-state-warning">{ACK_PRICE_DISCREPANCY_TITLE}</p>
      <ul className="mt-1.5 space-y-0.5">
        {divergences.map((d) => (
          <li key={d.sku} className="text-ds-micro text-state-warning/80">
            {d.sku}: order unit price £{d.poUnitPrice.toFixed(2)} → acknowledged £
            {d.acknowledgedUnitPrice.toFixed(2)} — your invoice bills the acknowledged price
          </li>
        ))}
      </ul>
      <p className="mt-1.5 text-ds-micro text-state-warning/70">{ACK_INVOICE_PRICE_RULE_TEXT}</p>
    </div>
  );
}

/**
 * §BATCH 2j (`AV-010b`) — THE CHANNEL'S HOLD STATEMENT ON THE ORDER.
 *
 * Renders ONLY when the record actually carries a statement from the channel (`declared` or
 * `cleared`), because an order whose hold state was never read has nothing truthful to show
 * here — and showing "not on hold" for an unread state is exactly the assumption this batch
 * removed. The unread state is stated where the duty is judged, inside the acknowledgement
 * panel. Every word comes from the rule's ONE owner; this component derives nothing.
 */
function ChannelHoldNotice({ po }: { po: PurchaseOrder }) {
  const duty = poChannelHoldDuty(po);
  if (!po.channelHold) return null;
  return (
    <div
      className={cn(
        'mt-3 rounded-ds-md border p-3',
        duty.held ? 'border-state-warning/20 bg-amber-500/10' : 'border-hairline bg-tint'
      )}
      data-testid={`po-channel-hold-${po.poNumber}`}
    >
      <p className={cn('text-ds-label', duty.held ? 'text-state-warning' : 'text-strong')}>
        {duty.held ? 'Retail channel hold: this order is on hold' : 'Retail channel hold lifted'}
      </p>
      <p className="mt-1.5 text-ds-micro text-strong/90">{duty.statement}</p>
      <p className="mt-1.5 text-ds-micro text-muted">{duty.ruleText}</p>
    </div>
  );
}

/**
 * §BATCH 2j (`AV-009`) — WHICH LINES THE CHANNEL REJECTED BECAUSE THE ACKNOWLEDGEMENT
 * OMITTED THEM.
 *
 * Read from the order's own record (`implicitlyRejectedLines`), which is the only place the
 * fact survives — after the write, an implicit rejection looks exactly like an explicit one.
 * Renders nothing when the submission covered every line. The rule is quoted from its owner.
 */
function ImplicitRejectionNotice({ po }: { po: PurchaseOrder }) {
  const lines = po.implicitlyRejectedLines ?? [];
  if (lines.length === 0) return null;
  return (
    <div
      className="mt-3 rounded-ds-md border border-state-warning/20 bg-amber-500/10 p-3"
      data-testid={`po-implicit-rejections-${po.poNumber}`}
    >
      <p className="text-ds-label text-state-warning">
        The acknowledgement omitted {lines.length} of {po.lineItems.length} lines
      </p>
      <ul className="mt-1.5 space-y-0.5">
        {lines.map((sku) => (
          <li key={sku} className="text-ds-micro text-state-warning/80">
            {sku} — rejected because the acknowledgement did not include it
          </li>
        ))}
      </ul>
      <p className="mt-1.5 text-ds-micro text-state-warning/70">{PO_ACK_COMPLETENESS_RULE_TEXT}</p>
    </div>
  );
}

/**
 * §DEFECT FIXED AT SOURCE (owner-reported, 2026-09-30) — THE BRAND'S SIDE OF THE ON-BEHALF RULE.
 *
 * This is the "authorised" half. The brand states, on the order itself, that Mercenta may
 * decide it — which is what permits an on-behalf decision at ANY time. Without a recorded
 * authorisation Mercenta may only record the rejection the channel requires inside the
 * closing window (`src/lib/commerce/poOnBehalfAuthority.ts` is the ONE owner of that rule,
 * and the writer enforces it). Renders nothing once the order is decided.
 */
function OnBehalfAuthorisationControl({ po, actor }: { po: PurchaseOrder; actor: string }) {
  const authority = poOnBehalfAuthority(po);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [note, setNote] = useState('');

  if (authority.closingWindow || authority.pastLimit) return null;

  return (
    <div
      className="mt-3 rounded-ds-md border border-hairline bg-tint p-3"
      data-testid={`po-on-behalf-authorisation-${po.poNumber}`}
      data-authorisation-state={authority.state}
    >
      <p className="text-ds-label text-strong">
        Mercenta deciding this order for you: {authority.stateLabel}
      </p>
      <p className="mt-1 text-ds-micro leading-snug text-muted">{authority.statement}</p>
      <p className="mt-1 text-ds-micro leading-snug text-muted">{authority.ruleText}</p>
      {authority.state !== 'granted' && (
        <div className="mt-2 flex flex-wrap items-center gap-2">
          <input
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="Say what Mercenta may do (your own words)"
            aria-label="What Mercenta may do on your behalf, in your own words"
            className="min-w-[16rem] flex-1 rounded-ds-sm border border-hairline bg-surface px-2 py-1 text-ds-micro text-strong"
            data-testid={`po-on-behalf-note-${po.poNumber}`}
          />
          <Button
            className="text-xs"
            disabled={busy || note.trim().length === 0}
            onClick={() => {
              setBusy(true);
              const result = authoriseOnBehalfDecisions(po.id, { recordedBy: actor, note });
              setNotice(
                result.ok
                  ? result.written
                    ? 'Recorded: Mercenta may decide this order for you. It will be attributed to you.'
                    : 'This order already carries your authorisation.'
                  : result.error ?? 'Refused.'
              );
              setBusy(false);
            }}
          >
            Authorise Mercenta to decide this order
          </Button>
        </div>
      )}
      {authority.state === 'granted' && (
        <Button
          variant="ghost"
          className="mt-2 text-xs"
          disabled={busy}
          onClick={() => {
            setBusy(true);
            const result = withdrawOnBehalfAuthorisation(po.id, {
              withdrawnBy: actor,
              reason: 'The brand withdrew its authorisation from its own order screen.',
            });
            setNotice(result.ok ? 'Authorisation withdrawn. Mercenta will not decide this order for you.' : result.error ?? 'Refused.');
            setBusy(false);
          }}
        >
          Withdraw that authorisation
        </Button>
      )}
      {notice && (
        <p className="mt-1.5 text-ds-micro text-accent-300" data-testid={`po-on-behalf-notice-${po.poNumber}`}>
          {notice}
        </p>
      )}
    </div>
  );
}

/**
 * §BATCH 2j (`AV-010b`) — THE HOLD DUTY INSIDE THE ACKNOWLEDGEMENT PANEL.
 *
 * Stated on EVERY order the panel is open for, because this is where the duty is judged: a
 * record that carries no hold statement reports the duty as UNVERIFIED — the honest answer —
 * rather than silently implying the order is not held. Wording: the rule's ONE owner.
 */
function HoldDutyLine({ po }: { po: PurchaseOrder }) {
  const duty = poChannelHoldDuty(po);
  return (
    <p
      className="text-ds-micro text-state-warning/80"
      data-testid={`po-hold-duty-${po.poNumber}`}
    >
      {duty.statement} {duty.ruleText}
    </p>
  );
}

/**
 * §BATCH 2j (`AV-009`) — THE COMPLETENESS RULE AT THE MOMENT OF SUBMISSION.
 *
 * The channel requires a COMPLETE acknowledgement and rejects a line the submission omits, so
 * the rule is stated here on every acknowledgement — and when the panel's current choices would
 * leave a line undecided, the owner's verdict names those lines instead. Both come from the ONE
 * owner; the surface decides nothing.
 *
 * WHY IT ALWAYS RENDERS (and is therefore not dead UI): the brand panel decides every line by
 * design, so in the demo the verdict is "complete" and this line states the requirement. An
 * INCOMPLETE submission reaches the writer from other callers (an integration read, an admin
 * action), and this line, the writer's warning and the record then all state what happened.
 */
function SubmitCompletenessNotice({
  po,
  lineAcks,
}: {
  po: PurchaseOrder;
  lineAcks: Record<string, { ackStatus: string }>;
}) {
  const verdict = poAcknowledgementCompleteness(
    po,
    Object.entries(lineAcks).map(([sku, a]) => ({ sku, ackStatus: a.ackStatus }))
  );
  return (
    <p
      className={`text-ds-micro ${verdict.statement ? 'text-state-warning/80' : 'text-muted'}`}
      data-testid={`po-submit-completeness-${po.poNumber}`}
      data-completeness={verdict.complete ? 'complete' : 'incomplete'}
    >
      {verdict.statement ?? verdict.ruleText}
    </p>
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
  /**
   * §P13 / S6 — REPOINTED (the old contract is recorded here).
   *
   * This previously hand-rolled the whole window:
   * `Math.floor((orderDate + 24 * 3600 * 1000 − now) / 3600000)` plus its own
   * `hoursLeft <= 0 ? 'ack_overdue' : 'ack_due'` mapping and its own labels
   * ("Acknowledgment deadline passed" / "Acknowledge within Nh") — three copies of
   * an Amazon rule and of the presentation layer's own vocabulary, and it showed
   * an unreadable order date as an open window.
   *
   * Now the OWNER derives the window, the owner's `reason` states it, and the
   * presentation owner renders the urgency. A decided or closed purchase order
   * renders no window badge at all; an unreadable one says so.
   */
  const ackWindow = poAcknowledgementWindow(po);
  const ackPresentation =
    ackWindow.hoursLeft === null ? null : ackDeadlinePresentation(ackWindow.hoursLeft);
  const ackBadge =
    ackWindow.channelState === 'acknowledged' || ackWindow.channelState === 'closed'
      ? null
      : ackPresentation
        ? {
            dataStatus: ackPresentation.dataStatus,
            tone: ackPresentation.tone,
            label: ackPresentation.label,
          }
        : {
            dataStatus: 'ack_unknown',
            tone: 'neutral' as const,
            label: 'Ack window unreadable',
          };
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <StatusBadge dataStatus={status.dataStatus} tone={status.tone}>
          {status.label}
        </StatusBadge>
        {po.simulated === true && (
          <Badge className="text-ds-micro bg-accent-500/15 text-accent-400 border-accent-500/20">(sim)</Badge>
        )}
        {ackBadge && (
          <span title={ackWindow.reason}>
            <StatusBadge dataStatus={ackBadge.dataStatus} tone={ackBadge.tone}>
              {ackBadge.label}
            </StatusBadge>
          </span>
        )}
      </div>

      {/* §BATCH 2c (`AV-024`) — the preview states the same channel revision the row
          does, so the record the brand opens cannot omit it. */}
      <ChannelRevisionNotice po={po} />

      {/* §BATCH 2d (`AV-008` / `AV-023`) — the preview states the acknowledged-price
          divergence too, so the record the brand opens cannot omit it. */}
      <AckPriceNotice po={po} />

      {/* §BATCH 2j (`AV-010b` / `AV-009`) — and the channel's hold statement plus the
          lines its completeness rule rejected, so the record the brand opens cannot omit
          either fact. Both render nothing when there is nothing to state. */}
      <ChannelHoldNotice po={po} />
      <ImplicitRejectionNotice po={po} />

      <RecordFieldList
        fields={[
          { label: 'Order date', value: orderDateLabel(po.orderDate) },
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
          <h3 className="mb-1.5 text-ds-label font-semibold uppercase tracking-[0.14em] text-muted">
            Rejection reason
          </h3>
          <p className="text-ds-label leading-snug text-muted">{po.rejectionReason}</p>
        </section>
      )}

      <section aria-label="Lines">
        <h3 className="mb-1.5 text-ds-label font-semibold uppercase tracking-[0.14em] text-muted">
          Lines
        </h3>
        <div className="overflow-hidden rounded-ds-md border border-hairline">
          <table className="w-full text-left text-ds-label">
            <thead className="bg-tint text-ds-micro uppercase tracking-wider text-muted">
              <tr>
                <th scope="col" className="px-2 py-1.5">SKU</th>
                <th scope="col" className="px-2 py-1.5">Product</th>
                <th scope="col" className="px-2 py-1.5 text-right">Qty</th>
                <th scope="col" className="px-2 py-1.5 text-right">Unit</th>
                <th scope="col" className="px-2 py-1.5">Ack</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-hairline-06">
              {po.lineItems.map((line) => {
                const ack = ackStatusPresentation(line.ackStatus);
                return (
                  <tr key={line.sku}>
                    <td className="px-2 py-1.5 font-mono text-muted">{line.sku}</td>
                    <td className="px-2 py-1.5 text-strong">{line.productName}</td>
                    <td className="px-2 py-1.5 text-right font-mono text-strong">{line.quantity}</td>
                    <td className="px-2 py-1.5 text-right font-mono text-strong">{line.unitPrice.toFixed(2)}</td>
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

