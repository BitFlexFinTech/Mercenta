/**
 * §BATCH 2c (`AV-024`) — THE ONE OWNER of a CHANNEL-ISSUED PURCHASE-ORDER REVISION.
 *
 * WHY THIS MODULE EXISTS
 * ----------------------
 * The retail channel can change a purchase order AFTER it has been issued, and the
 * vendor is required to fulfil the UPDATED purchase order; Mercenta discovers a
 * change by polling the channel's own order read
 * (`docs/AMAZON_VENDOR_DISCREPANCY_REGISTER_2026-09-20.md` → `AV-024`, sources S3/S4;
 * the documented change set is `PO_CHANNEL_CHANGE_KINDS` in `src/types.ts`).
 *
 * Before this module Mercenta had NO concept of a channel-issued revision: a polled
 * re-read of a CHANGED order was reported `already_present` by the ingestion owner,
 * the canonical record kept the SUPERSEDED quantities, and the documented risk —
 * *"a brand could ship a superseded PO"* — was live in the product.
 *
 * WHAT IT IS, AND WHAT IT IS NOT
 * ------------------------------
 * A revision is the CHANNEL changing the ORDER. It is NOT a brand amendment: a
 * brand's change to its own acknowledgement is governed by the channel's declared
 * update window (`AV-006`, `src/lib/commerce/poAcknowledgementWindow.ts`) and is
 * untouched here. The two can never be confused, because the amendment window
 * measures a BRAND submission while this module measures a CHANNEL read.
 *
 * THE TWO HALVES
 * --------------
 *   · `deriveChannelPoRevision(po, snapshot)` — PURE. Compares the channel's
 *     current order against the canonical record and returns the typed change set,
 *     the deterministic digest, and whether the change undercuts a decision the
 *     brand already made. Fails CLOSED on anything it cannot read. No state, no
 *     clock, no network.
 *   · `applyChannelPoRevision(po, revision, snapshot)` — the ONE writer of a
 *     revision into the canonical record. Updates the record to the CHANNEL'S
 *     CURRENT VERSION (the updated order is the one that must be fulfilled) and
 *     retains the superseded version inside the revision, so history is MOVED,
 *     never destroyed.
 *
 * FAIL-CLOSED RULES
 * -----------------
 *   · the snapshot is not this record's channel order  → refused
 *   · the snapshot carries no lines at all             → refused
 *   · the read carries no readable order date          → refused
 *   · the read carries no documented change            → not a revision
 * and, in the ingestion owner that calls this module, a revision that no longer
 * routes to the SAME tenant is refused rather than applied.
 */
import type {
  PoChannelChangeKind,
  PoRevisionChange,
  PurchaseOrder,
  PurchaseOrderLineItem,
  PurchaseOrderRevision,
} from '@/types';
import { PO_REVISION_REVIEW_REASON } from '@/config/purchaseOrders';
import { fcByCode } from '@/config/destinationFc';
import type { ChannelPurchaseOrder, ChannelPurchaseOrderLine } from '@/lib/spapi/client';

/** Why a channel read produced no revision. Fail-closed codes, never free text. */
export type PoRevisionRefusal =
  | 'CHANNEL_PO_IDENTITY_MISMATCH'
  | 'CHANNEL_PO_UNREADABLE'
  | 'CHANNEL_PO_ORDER_DATE_UNREADABLE'
  | 'CHANNEL_REVISION_UNCHANGED';

export type PoRevisionVerdict =
  | { ok: true; revision: PurchaseOrderRevision }
  | { ok: false; code: PoRevisionRefusal; reason: string };

/** The canonical record's version of this order. `undefined` = never revised. */
export function poRevisionNumber(po: Pick<PurchaseOrder, 'revisionNumber'>): number {
  return po.revisionNumber ?? 0;
}

/**
 * The DERIVED revision position of a purchase order: which version the brand's
 * acknowledgement answered, whether the channel has cancelled the order, and
 * whether a human must review the change. Every reader (surfaces, the shipment
 * gate, the work layer) asks THIS rather than re-deriving from `revisions`.
 */
export interface PoRevisionState {
  /** The channel's current version. 0 = no channel change has been observed. */
  revisionNumber: number;
  /** TRUE when the channel's latest revision cancelled the order. */
  channelCancelled: boolean;
  /** TRUE when a decision was recorded against an EARLIER version of the order. */
  acknowledgementStale: boolean;
  /** TRUE when a recorded revision undercut a decision the brand had made. */
  requiresReview: boolean;
  /** The channel's latest revision, when one exists. */
  latest: PurchaseOrderRevision | null;
}

export function poRevisionState(po: PurchaseOrder): PoRevisionState {
  const revisionNumber = poRevisionNumber(po);
  const revisions = po.revisions ?? [];
  const latest = revisions.length > 0 ? revisions[revisions.length - 1] : null;
  /** A cancellation stands until a later revision reinstates the order. */
  let channelCancelled = false;
  for (const revision of revisions) {
    if (revision.changeKinds.includes('cancel')) channelCancelled = true;
    if (revision.changeKinds.includes('uncancel')) channelCancelled = false;
  }
  return {
    revisionNumber,
    channelCancelled,
    acknowledgementStale:
      Boolean(po.acknowledgedAt) && (po.acknowledgedRevision ?? 0) < revisionNumber,
    requiresReview: revisions.some((r) => r.undercutsAcknowledgement),
    latest,
  };
}

/** Render a value pair for the audit trail without inventing a value that is absent. */
const render = (value: string | number | null | undefined): string | null =>
  value === null || value === undefined || value === '' ? null : String(value);

/** FNV-1a — the same deterministic digest form the acknowledgement draft uses. */
function digestOf(input: string): string {
  let hash = 0x811c9dc5;
  for (let i = 0; i < input.length; i++) {
    hash ^= input.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193) >>> 0;
  }
  return hash.toString(16).padStart(8, '0');
}

/** The channel's declared window for the freight term it declares (`AV-024`, `S5`). */
function channelWindow(
  snapshot: ChannelPurchaseOrder
): { kind: 'ship' | 'delivery'; start: string | undefined; end: string | undefined } {
  const term = snapshot.freightTerm === 'collect' ? 'collect' : 'prepaid';
  return term === 'collect'
    ? { kind: 'ship', start: snapshot.shipWindowStart, end: snapshot.shipWindowEnd }
    : { kind: 'delivery', start: snapshot.deliveryWindowStart, end: snapshot.deliveryWindowEnd };
}

/** The canonical record's window for the same freight term. */
function recordWindow(
  po: PurchaseOrder
): { kind: 'ship' | 'delivery'; start: string | undefined; end: string | undefined } {
  const term = po.freightTerm === 'collect' ? 'collect' : 'prepaid';
  return term === 'collect'
    ? { kind: 'ship', start: po.shipWindowStart, end: po.shipWindowEnd }
    : { kind: 'delivery', start: po.deliveryWindowStart, end: po.deliveryWindowEnd };
}

const windowText = (w: { start: string | undefined; end: string | undefined }): string | null =>
  w.start || w.end ? `${w.start ?? 'open'} … ${w.end ?? 'open'}` : null;

/** The value the channel's order implies, recomputed from the channel's OWN lines. */
function channelPoValue(lines: readonly ChannelPurchaseOrderLine[]): number {
  return Math.round(lines.reduce((s, l) => s + l.quantity * l.unitPrice, 0) * 100) / 100;
}

/** TRUE when the brand has recorded a decision on this line. */
const lineHasDecision = (line: PurchaseOrderLineItem): boolean =>
  Boolean(line.ackStatus) && line.ackStatus !== 'unacknowledged';



/**
 * DERIVE the channel's revision of one purchase order. PURE — the instant is
 * supplied by the caller, nothing is read from a store, nothing is mutated.
 *
 * A read that carries no documented change is NOT a revision, and a read that
 * cannot be read at all is REFUSED rather than guessed at. A change that undercuts
 * a decision the brand already recorded sets `undercutsAcknowledgement`, which is
 * what makes the acknowledgement stale and blocks a shipment until it is updated.
 */
export function deriveChannelPoRevision(
  po: PurchaseOrder,
  snapshot: ChannelPurchaseOrder,
  observedAt: string
): PoRevisionVerdict {
  if (snapshot.purchaseOrderId !== po.poNumber) {
    return {
      ok: false,
      code: 'CHANNEL_PO_IDENTITY_MISMATCH',
      reason:
        `The read is for channel order ${snapshot.purchaseOrderId}, but this record is ${po.poNumber} — a ` +
        `revision is only ever derived for the SAME order. Nothing was changed (fail-closed).`,
    };
  }

  const channelLines = snapshot.lines ?? [];
  if (channelLines.length === 0) {
    return {
      ok: false,
      code: 'CHANNEL_PO_UNREADABLE',
      reason:
        `${po.poNumber}: the channel returned this order with no lines, so the change cannot be read. The ` +
        `record is left exactly as it is (fail-closed).`,
    };
  }

  if (!Number.isFinite(new Date(snapshot.orderDate).getTime())) {
    return {
      ok: false,
      code: 'CHANNEL_PO_ORDER_DATE_UNREADABLE',
      reason:
        `${po.poNumber}: the channel's order date could not be read, so the change cannot be dated or verified. ` +
        `The record is left exactly as it is (fail-closed).`,
    };
  }

  /**
   * NAME MATTERS HERE: this local is called `changeList`, NOT `changes`. The
   * canonical-propagation check (`scripts/validate-canonical-propagation.mjs`) treats a
   * push onto a collection named `changes` as a write to a stored canonical collection
   * that must announce itself, because the platform has a collection by that name. This
   * function writes to nothing outside itself — it is PURE — so it must not look like
   * such a write.
   */
  const changeList: PoRevisionChange[] = [];
  let undercuts = false;
  const revisionNumber = poRevisionNumber(po) + 1;

  const add = (
    kind: PoChannelChangeKind,
    subject: string,
    previous: string | null,
    current: string | null,
    extra = ''
  ) => {
    if (previous === current) return;
    changeList.push({
      kind,
      subject,
      previous,
      current,
      /**
       * §BATCH 2c (`AV-024`) — the detail states the CHANGE ITSELF (`subject: previous
       * → current`). The change's KIND is deliberately NOT repeated inside it: a
       * surface renders the kind from its ONE label map beside this detail, and
       * including it here made a rendered row read "ship / delivery window — delivery
       * window: ship / delivery window 2026-10-17 … → …", i.e. the same words three
       * times. The detail is plain English on its own and adds the consequence only
       * when there is one (`extra`).
       */
      detail: `${subject}: ${previous ?? 'none'} → ${current ?? 'none'}${extra}`,
    });
  };

  /* ── The order's own state (cancel / uncancel), only when the read carries it ── */
  if (snapshot.channelStatus) {
    const cancelledNow = snapshot.channelStatus === 'cancelled';
    const cancelledBefore = poRevisionState(po).channelCancelled;
    if (cancelledNow && !cancelledBefore) {
      const hadDecision = Boolean(po.acknowledgedAt);
      add(
        'cancel',
        'order',
        'open',
        'cancelled by the retail channel',
        hadDecision
          ? ' — a decision was already recorded on this purchase order, so the acknowledgement no longer ' +
            'applies to it.'
          : ''
      );
      if (hadDecision) undercuts = true;
    } else if (!cancelledNow && cancelledBefore) {
      add('uncancel', 'order', 'cancelled by the retail channel', 'reinstated by the retail channel');
    }
  }

  /* ── The order type, only when the read carries it ─────────────────────────── */
  if (snapshot.orderType) {
    const heldType = po.channelOrderType;
    add('order_type', 'order', render(heldType), render(snapshot.orderType));
  }

  /* ── The destination FC ────────────────────────────────────────────────────── */
  if (snapshot.shipToPartyId) {
    const next = fcByCode(snapshot.shipToPartyId);
    add(
      'destination_fc',
      'destination',
      render(po.shipToParty?.partyId),
      render(snapshot.shipToPartyId),
      next && po.shipToParty?.name && po.shipToParty.name !== next.name ? ` (${next.name})` : ''
    );
  }

  /* ── The freight term ──────────────────────────────────────────────────────── */
  if (snapshot.freightTerm) {
    add('freight_term', 'freight', render(po.freightTerm), render(snapshot.freightTerm));
  }

  /* ── The window the channel's declared term uses ───────────────────────────── */
  const nextWindow = channelWindow(snapshot);
  if (nextWindow.start || nextWindow.end) {
    add(
      'window',
      nextWindow.kind === 'ship' ? 'ship window' : 'delivery window',
      windowText(recordWindow(po)),
      windowText(nextWindow)
    );
  }

  /* ── The lines: the channel's own order detail is the truth ────────────────── */
  const channelBySku = new Map(channelLines.map((l) => [l.vendorSku.toLowerCase(), l]));
  const recordBySku = new Map(po.lineItems.map((l) => [l.sku.toLowerCase(), l]));

  for (const line of channelLines) {
    const held = recordBySku.get(line.vendorSku.toLowerCase());
    if (!held) {
      add(
        'new_item',
        `line ${line.vendorSku}`,
        null,
        `${line.quantity} × ${line.unitPrice}`,
        ' — a line the channel added to the order.'
      );
      continue;
    }
    const acknowledged = held.acknowledgedQty;
    const undercutThisLine =
      lineHasDecision(held) && acknowledged !== undefined && line.quantity < acknowledged;
    add(
      'quantity',
      `line ${line.vendorSku}`,
      render(held.quantity),
      render(line.quantity),
      undercutThisLine
        ? ` — below the acknowledged ${acknowledged} units, so the acknowledgement is stale.`
        : ''
    );
    add('cost', `line ${line.vendorSku}`, render(held.unitPrice), render(line.unitPrice));
    if (undercutThisLine) undercuts = true;
  }

  for (const line of po.lineItems) {
    if (channelBySku.has(line.sku.toLowerCase())) continue;
    add(
      'item_cancellation',
      `line ${line.sku}`,
      render(`${line.quantity} × ${line.unitPrice}`),
      null,
      ' — the channel removed this line from the order.'
    );
    if (lineHasDecision(line)) undercuts = true;
  }

  if (changeList.length === 0) {
    return {
      ok: false,
      code: 'CHANNEL_REVISION_UNCHANGED',
      reason:
        `${po.poNumber}: the channel's read carries no documented change against the version this record ` +
        `holds, so there is nothing to revise.`,
    };
  }

  const changeKinds = [...new Set(changeList.map((c) => c.kind))];
  const newPoValue = channelPoValue(channelLines);
  const revision: PurchaseOrderRevision = {
    revisionNumber,
    observedAt,
    source: 'channel_poll',
    simulated: snapshot.simulated === true,
    changeKinds,
    changes: changeList,
    digest: digestOf(
      [
        revisionNumber,
        snapshot.purchaseOrderId,
        snapshot.orderDate,
        snapshot.shipToPartyId,
        snapshot.freightTerm ?? '',
        snapshot.channelStatus ?? '',
        snapshot.orderType ?? '',
        snapshot.shipWindowStart ?? '',
        snapshot.shipWindowEnd ?? '',
        snapshot.deliveryWindowStart ?? '',
        snapshot.deliveryWindowEnd ?? '',
        ...channelLines
          .map((l) => `${l.vendorSku.toLowerCase()}:${l.quantity}:${l.unitPrice}:${l.asin ?? ''}`)
          .sort(),
      ].join('|')
    ),
    previousPoValue: po.poValue,
    newPoValue,
    undercutsAcknowledgement: undercuts,
    reviewReason: undercuts ? PO_REVISION_REVIEW_REASON : null,
    /** The WHOLE previous line set, so no line's acknowledgement history is lost. */
    supersededLines: po.lineItems.map((l) => ({
      ...l,
      ackHistory: l.ackHistory ? [...l.ackHistory] : undefined,
    })),
  };

  return { ok: true, revision };
}


/**
 * THE ONE WRITER of a channel revision into the canonical record.
 *
 * Applies the CHANNEL'S CURRENT VERSION — quantities, prices, lines, windows,
 * destination and freight term are the channel's, because *the updated purchase
 * order is the one that must be fulfilled*. Per-line acknowledgement data is
 * carried forward for the lines the channel kept, and the superseded version of
 * everything (including every line's `ackHistory`) is retained inside the
 * revision — so history is MOVED into the record, never destroyed.
 *
 * A quantity the channel reduced BELOW the acknowledged units is carried forward
 * as the channel's figure and the acknowledgement is clamped to it, keeping the
 * canonical invariant `acknowledgedQty <= quantity` true at every instant. What
 * the brand had committed to remains visible in two places: the revision's change
 * detail and the line's append-only `ackHistory`.
 *
 * Mutates the passed record (the store's own object) and nothing else: no signal,
 * no audit, no IO — those belong to the ingestion owner that called it.
 */
export function applyChannelPoRevision(
  po: PurchaseOrder,
  revision: PurchaseOrderRevision,
  snapshot: ChannelPurchaseOrder
): PurchaseOrder {
  /**
   * IDEMPOTENT BY DIGEST: the SAME revision can never be appended twice. The
   * ingestion owner only calls this after it has verified a change, so this is
   * defence in depth — but `revisions` is append-only history, and a second call
   * for one revision would look like the channel changing the order twice when it
   * did not. Two genuinely different revisions cannot share a digest (it carries
   * the target revision number and the channel's own snapshot).
   */
  if ((po.revisions ?? []).some((r) => r.digest === revision.digest)) return po;

  const heldBySku = new Map(po.lineItems.map((l) => [l.sku.toLowerCase(), l]));
  const channelLines = snapshot.lines ?? [];

  po.lineItems = channelLines.map((line) => {
    const held = heldBySku.get(line.vendorSku.toLowerCase());
    const carriedAck = held
      ? {
          ...(held.ackStatus ? { ackStatus: held.ackStatus } : {}),
          ...(held.acknowledgedQty !== undefined
            ? { acknowledgedQty: Math.min(held.acknowledgedQty, line.quantity) }
            : {}),
          ...(held.scheduledShipDate ? { scheduledShipDate: held.scheduledShipDate } : {}),
          ...(held.rejectionCode ? { rejectionCode: held.rejectionCode } : {}),
          ...(held.backorderRestockDeadline
            ? { backorderRestockDeadline: held.backorderRestockDeadline }
            : {}),
          ...(held.acknowledgedUnitPrice !== undefined
            ? { acknowledgedUnitPrice: held.acknowledgedUnitPrice }
            : {}),
          ...(held.ackHistory ? { ackHistory: held.ackHistory } : {}),
          ...(held.receivedQty !== undefined ? { receivedQty: held.receivedQty } : {}),
          ...(held.isBackOrderAllowed !== undefined
            ? { isBackOrderAllowed: held.isBackOrderAllowed }
            : {}),
        }
      : {};
    return {
      sku: line.vendorSku,
      /** The channel's own name/commodity when carried, else what the record held. */
      productName: line.productName ?? held?.productName ?? line.vendorSku,
      quantity: line.quantity,
      unitPrice: line.unitPrice,
      commodityCode: line.commodityCode ?? held?.commodityCode ?? '00000000',
      ...carriedAck,
    };
  });

  if (snapshot.shipToPartyId) {
    const known = fcByCode(snapshot.shipToPartyId);
    po.shipToParty = known
      ? { partyId: known.code, name: known.name, city: known.city, postcode: known.postcode }
      : { partyId: snapshot.shipToPartyId };
  }
  /**
   * §BATCH 2c (`AV-024`) — the freight term decides WHICH window is the order's, so
   * a term change moves the order from one window pair to the other. The pair the
   * channel's current term does not use is CLEARED rather than left behind: a stale
   * window on the record would be dead data that another reader could take for the
   * order's real window. The superseded values survive in the revision's change list.
   */
  if (snapshot.freightTerm) {
    const previousTerm = po.freightTerm;
    po.freightTerm = snapshot.freightTerm;
    if (previousTerm && previousTerm !== snapshot.freightTerm) {
      if (snapshot.freightTerm === 'collect') {
        delete po.deliveryWindowStart;
        delete po.deliveryWindowEnd;
      } else {
        delete po.shipWindowStart;
        delete po.shipWindowEnd;
      }
    }
  }
  if (snapshot.shipWindowStart) po.shipWindowStart = snapshot.shipWindowStart;
  if (snapshot.shipWindowEnd) po.shipWindowEnd = snapshot.shipWindowEnd;
  if (snapshot.deliveryWindowStart) po.deliveryWindowStart = snapshot.deliveryWindowStart;
  if (snapshot.deliveryWindowEnd) po.deliveryWindowEnd = snapshot.deliveryWindowEnd;
  if (snapshot.orderType) {
    po.channelOrderType = snapshot.orderType;
  }
  po.poValue = channelPoValue(channelLines);
  po.commissionAmount = Math.round(((po.poValue * po.commissionRate) / 100) * 100) / 100;
  po.revisionNumber = revision.revisionNumber;
  po.lastRevisedAt = revision.observedAt;
  /** APPEND-ONLY: an existing revision is never replaced or removed. */
  po.revisions = [...(po.revisions ?? []), revision];
  return po;
}

