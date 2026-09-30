/**
 * §P13 — THE PO ACKNOWLEDGEMENT WINDOW (the ONE owner of the Amazon rule).
 *
 * WHY THIS MODULE EXISTS
 * ----------------------
 * Before this module the 24-hour rule was re-derived at each render
 * (`BrandPurchaseOrders.tsx`, `AdminPurchaseOrderDetail.tsx`,
 * `statusPresentation.ts`) and — critically — it was NOT applied by the work
 * layer at all, so `deriveWorkItems` produced "Acknowledge PO-9211" items for
 * POs that were already `shipped`, 41 days past their deadline. The root cause
 * was that no single owner decided "is this PO still actionable?".
 *
 * This module is that owner. It derives Amazon's own PO lifecycle state
 * (`New` → `Acknowledged` → `Closed`) plus the acknowledgement obligation, and
 * every surface, projection and writer asks IT rather than re-deriving.
 *
 * RULES IMPLEMENTED (all Amazon-documented — see `src/config/purchaseOrders.ts`
 * for the verbatim quotes; Mercenta invents nothing here):
 *   · deadline = `orderDate + 24h`
 *   · the actionable set is Amazon's `New` set — an unacknowledged PO inside its
 *     window. Acknowledged/closed POs are HISTORY, never queue rows.
 *   · past the 24-hour limit the documented action is a REJECTION, so an
 *     acceptance is refused and `mustReject` is TRUE.
 *   · the brand is notified at the declared schedule (12h/6h/2h remaining) and,
 *     if it has not acted, Mercenta performs the channel-REQUIRED rejection on
 *     the brand's behalf at the final stage, BEFORE the limit — so every PO ends
 *     acknowledged (accepted, backordered or rejected) and none is ever left
 *     unacknowledged.
 *
 * PURITY / DETERMINISM
 * --------------------
 * The module is PURE: the instant is always supplied by the caller
 * (`now`), so a validator can pin it and a surface can use the real clock. No
 * `Date.now()`, no randomness, no network, no store access.
 */
import {
  PO_ACKNOWLEDGEMENT_HOURS,
  PO_ACK_AUTO_REJECT_REASON,
  PO_ACK_NOTIFICATION_HOURS,
  PO_ACK_ON_BEHALF_WINDOW_HOURS,
  PO_ACK_UPDATE_WINDOW_HOURS,
  PO_ACK_WINDOW_RULE_TEXT,
  PO_AMENDABLE_FIELD_GROUP_LABELS,
  PO_AMENDABLE_FIELD_GROUPS,
  PO_AMENDABLE_FIELD_GROUPS_AFTER_WINDOW,
  type PoAckTimeliness,
  type PoAmendableFieldGroup,
  type PoChannelState,
} from '@/config/purchaseOrders';
import type { PoRejectionCode, PurchaseOrder } from '@/types';
/**
 * §BATCH 2h (`AV-043`) — WHICH CHANNEL POSITION A STATUS OCCUPIES IS DECLARED
 * ONCE, in the mapping owner, in both directions. This module used to decide it
 * here with its own status pair (`po.status === 'rejected' || po.status ===
 * 'delivered'`) plus a config list — an implicit mapping that could not be
 * reversed and would silently disagree with the rest of the platform the moment a
 * status was added. It now ASKS the owner.
 */
import { channelStateForStatus } from '@/lib/commerce/poChannelVocabulary';

const HOUR_MS = 3_600_000;
const MINUTE_MS = 60_000;

/** A declared notification stage (hours remaining when the brand is notified). */
export type PoNotificationStage = number;

export interface PoAcknowledgementWindow {
  /** Amazon's own lifecycle vocabulary, derived for this PO. */
  channelState: PoChannelState;
  /** The 24-hour deadline (`orderDate + 24h`) as an ISO instant; null when unreadable. */
  deadline: string | null;
  msLeft: number | null;
  hoursLeft: number | null;
  minutesLeft: number | null;
  /** TRUE only for an unacknowledged PO inside its window — the QUEUE set. */
  actionable: boolean;
  /** TRUE inside the closing window: Mercenta may act on the brand's behalf (brand approves). */
  onBehalfAvailable: boolean;
  /** The declared notification stage currently in force (null before T−12h). */
  notificationStage: PoNotificationStage | null;
  /** The instant Mercenta performs the channel-required rejection on the brand's behalf. */
  autoRejectAt: string | null;
  /** TRUE once that instant has passed while the PO is still unacknowledged. */
  autoRejectDue: boolean;
  /** Past the limit: Amazon requires a rejection, so an acceptance is refused. */
  mustReject: boolean;
  /** TRUE when an acknowledgement record exists (whole-PO or per line). */
  acknowledgementRecorded: boolean;
  /** TRUE for acknowledged/closed POs — the HISTORY set. */
  history: boolean;
  /** TRUE for the QUEUE set (same predicate as `actionable`, named for surfaces). */
  inQueue: boolean;
  /** Honest, operator-readable explanation of the state. */
  reason: string;
}

/** Normalise any accepted instant input; an unusable value fails loudly. */
function instantOf(now: Date | string | number): number {
  const ms = now instanceof Date ? now.getTime() : new Date(now).getTime();
  if (!Number.isFinite(ms)) {
    throw new Error(`[po-ack] unusable "now" supplied to the acknowledgement window: ${String(now)}`);
  }
  return ms;
}

/**
 * The Amazon deadline for one PO: `orderDate + 24h`. Returns null when the
 * order date cannot be read — the caller then fails CLOSED (`unknown`).
 */
export function poAcknowledgementDeadline(po: Pick<PurchaseOrder, 'orderDate'>): string | null {
  const received = new Date(po.orderDate).getTime();
  if (!Number.isFinite(received)) return null;
  return new Date(received + PO_ACKNOWLEDGEMENT_HOURS * HOUR_MS).toISOString();
}

/** TRUE when the PO carries an acknowledgement record of any shape. */
export function poAcknowledgementRecorded(po: PurchaseOrder): boolean {
  if (po.acknowledgedAt) return true;
  return po.lineItems.some((l) => l.ackStatus !== undefined && l.ackStatus !== 'unacknowledged');
}

/* ── §BATCH 2b (`AV-006`) — THE AMENDMENT (UPDATE) WINDOW ──────────────────── */

/**
 * A line of an amendment submission. `src/data/api.ts → PoLineAckSubmission`
 * structurally satisfies this, so the owner module stays free of any dependency on
 * the domain boundary (which imports THIS module — importing it back would be a
 * cycle). Only the fields a change can touch are named.
 */
export interface PoAmendmentSubmissionLine {
  sku: string;
  acknowledgedQty?: number;
  unitPrice?: number;
  scheduledShipDate?: string;
}

/**
 * THE CHANNEL'S UPDATE WINDOW, DERIVED (`AV-006`).
 *
 * Amazon documents that *"You must submit an updated acknowledgment within 48
 * hours for any changes to quantity, price, ship dates, or delivery dates… After
 * 48 hours, we only expect to receive updates to ship dates or delivery dates."*
 * This type is that rule, derived from the ONE config owner so the window the
 * brand is told about and the window the writer enforces cannot disagree.
 *
 * FAIL CLOSED: an unreadable order date yields `unknown: true`, `open: false` and
 * NO permitted change groups — an unknown window is never treated as "still open".
 */
export interface PoAmendmentWindow {
  /** The update deadline (`orderDate + 48h`) as an ISO instant; null when unreadable. */
  deadline: string | null;
  msLeft: number | null;
  hoursLeft: number | null;
  /** TRUE while a change to quantity or price is still accepted. */
  open: boolean;
  /** The documented field groups a change may currently touch (empty when unknown). */
  permittedChangeGroups: readonly PoAmendableFieldGroup[];
  /** TRUE when the window could not be read from the order date. */
  unknown: boolean;
  /** Honest, operator-readable explanation of the state. */
  reason: string;
}

/** The Amazon update deadline for one PO: `orderDate + 48h`; null when unreadable. */
export function poAmendmentDeadline(po: Pick<PurchaseOrder, 'orderDate'>): string | null {
  const received = new Date(po.orderDate).getTime();
  if (!Number.isFinite(received)) return null;
  return new Date(received + PO_ACK_UPDATE_WINDOW_HOURS * HOUR_MS).toISOString();
}

/** Derive the update window for ONE purchase order at an INSTANT. Pure. */
export function poAmendmentWindow(
  po: Pick<PurchaseOrder, 'orderDate'>,
  now: Date | string | number = new Date()
): PoAmendmentWindow {
  const nowMs = instantOf(now);
  const deadline = poAmendmentDeadline(po);

  if (!deadline) {
    return {
      deadline: null,
      msLeft: null,
      hoursLeft: null,
      open: false,
      permittedChangeGroups: [],
      unknown: true,
      reason:
        'The update window could not be read — the order date is unusable, so no change is accepted (fail-closed).',
    };
  }

  const msLeft = new Date(deadline).getTime() - nowMs;
  const open = msLeft > 0;
  const permittedChangeGroups = open ? PO_AMENDABLE_FIELD_GROUPS : PO_AMENDABLE_FIELD_GROUPS_AFTER_WINDOW;

  return {
    deadline,
    msLeft,
    hoursLeft: msLeft / HOUR_MS,
    open,
    permittedChangeGroups,
    unknown: false,
    reason: open
      ? `Inside the update window (closes ${deadline}): quantity, price, ship-date and delivery-date changes are accepted.`
      : `Past the update window (closed ${deadline}): only ship-date and delivery-date changes are expected.`,
  };
}

/** The operator-readable label of a declared change group (`quantity` → "acknowledged quantity"). */
export function amendableGroupLabel(group: PoAmendableFieldGroup): string {
  return PO_AMENDABLE_FIELD_GROUP_LABELS[group];
}

/**
 * WHICH DOCUMENTED CHANGE GROUPS a submission actually changes, relative to the
 * PO's current acknowledged state. Only the groups the submission can express are
 * ever returned (`quantity` · `price` · `ship_dates`); `delivery_dates` is a
 * channel-issued PO-level change and arrives through the revision path (`AV-024`).
 */
export function amendmentChangedGroups(
  po: PurchaseOrder,
  submission: readonly PoAmendmentSubmissionLine[]
): PoAmendableFieldGroup[] {
  const changed = new Set<PoAmendableFieldGroup>();
  for (const line of po.lineItems) {
    const ack = submission.find((a) => a.sku === line.sku);
    if (!ack) continue;
    if (ack.acknowledgedQty !== undefined && ack.acknowledgedQty !== (line.acknowledgedQty ?? line.quantity)) {
      changed.add('quantity');
    }
    if (ack.unitPrice !== undefined && ack.unitPrice !== (line.acknowledgedUnitPrice ?? line.unitPrice)) {
      changed.add('price');
    }
    if (ack.scheduledShipDate !== undefined && ack.scheduledShipDate !== (line.scheduledShipDate ?? '')) {
      changed.add('ship_dates');
    }
  }
  return PO_AMENDABLE_FIELD_GROUPS.filter((g) => changed.has(g));
}

/**
 * THE UPDATE RULE, ENFORCED — the refusal for a change the channel does not accept
 * at this instant, or `null` when the change is permitted (`AV-006`).
 *
 * The one refusal this returns is the documented one: a quantity or price change
 * past the update window. It quotes the rule's ONE owner, so the brand is told its
 * real obligation rather than a Mercenta invention.
 */
export function amendmentRefusal(
  po: PurchaseOrder,
  submission: readonly PoAmendmentSubmissionLine[],
  now: Date | string | number = new Date()
): string | null {
  const window = poAmendmentWindow(po, now);
  if (window.unknown) return window.reason;

  const changed = amendmentChangedGroups(po, submission);
  const disallowed = changed.filter((g) => !window.permittedChangeGroups.includes(g));
  if (disallowed.length === 0) return null;

  const named = disallowed.map((g) => `\`${PO_AMENDABLE_FIELD_GROUP_LABELS[g]}\``).join(' and ');
  return (
    `PO ${po.poNumber}: ${named} cannot be changed now — the ${PO_ACK_UPDATE_WINDOW_HOURS}-hour update window closed ` +
    `at ${window.deadline}. After the window only ship-date and delivery-date changes are expected, so this change is ` +
    `refused.`
  );
}

/**
 * The declared notification stages that have been REACHED (hours remaining ≤ the
 * stage). The producer raises each stage once, keyed idempotently, so a missed
 * sweep still delivers every stage exactly once.
 */
export function poNotificationStagesDue(
  po: PurchaseOrder,
  now: Date | string | number = new Date()
): PoNotificationStage[] {
  const deadline = poAcknowledgementDeadline(po);
  if (!deadline) return [];
  const hoursLeft = (new Date(deadline).getTime() - instantOf(now)) / HOUR_MS;
  return PO_ACK_NOTIFICATION_HOURS.filter((h) => hoursLeft <= h);
}

/** The notification stage currently in force (the smallest stage reached). */
function currentStage(hoursLeft: number): PoNotificationStage | null {
  const reached = PO_ACK_NOTIFICATION_HOURS.filter((h) => hoursLeft <= h);
  return reached.length > 0 ? reached[reached.length - 1] : null;
}

/**
 * Derive the acknowledgement window for ONE purchase order.
 *
 * FAIL CLOSED: an unreadable order date yields `unknown` with NO actionable
 * control anywhere — an unknown window is never treated as "still open".
 */
export function poAcknowledgementWindow(
  po: PurchaseOrder,
  now: Date | string | number = new Date()
): PoAcknowledgementWindow {
  const nowMs = instantOf(now);
  const recorded = poAcknowledgementRecorded(po);
  /**
   * §BATCH 2h (`AV-043`) — the order's CHANNEL position, taken from the ONE
   * mapping owner rather than decided here.
   */
  const statusState = channelStateForStatus(po.status);
  const deadline = poAcknowledgementDeadline(po);

  const base = {
    deadline,
    msLeft: null as number | null,
    hoursLeft: null as number | null,
    minutesLeft: null as number | null,
    actionable: false,
    onBehalfAvailable: false,
    notificationStage: null as PoNotificationStage | null,
    autoRejectAt: null as string | null,
    autoRejectDue: false,
    mustReject: false,
    acknowledgementRecorded: recorded,
  };

  if (!deadline) {
    return {
      ...base,
      channelState: 'unknown',
      history: true,
      inQueue: false,
      reason:
        'No acknowledgement window on record — the order date could not be read, so no channel action is offered (fail-closed).',
    };
  }

  const deadlineMs = new Date(deadline).getTime();
  const msLeft = deadlineMs - nowMs;
  const hoursLeft = msLeft / HOUR_MS;
  const autoRejectAtMs = deadlineMs - PO_ACK_ON_BEHALF_WINDOW_HOURS * HOUR_MS;

  /**
   * §BATCH 2h (`AV-043`) — FAIL CLOSED on a status the platform does not
   * recognise. Before the mapping had ONE owner this case fell into the `New`
   * branch (because an unknown status was simply "not in the obligation list"),
   * so an order whose lifecycle position could not be derived was offered as an
   * ACTIONABLE acknowledgement — exactly the class of phantom work item this
   * module exists to prevent. An unknown position now offers no channel action.
   */
  if (statusState === 'unknown') {
    return {
      ...base,
      channelState: 'unknown',
      history: true,
      inQueue: false,
      reason: `Status "${po.status}" is not one of the declared purchase-order lifecycle statuses, so the order's channel position cannot be derived — no channel action is offered (fail-closed).`,
    };
  }

  /** The channel's `Closed` set — completed or rejected: no action remains. */
  if (statusState === 'closed') {
    return {
      ...base,
      channelState: 'closed',
      msLeft,
      hoursLeft,
      minutesLeft: Math.floor((msLeft % HOUR_MS) / MINUTE_MS),
      history: true,
      inQueue: false,
      reason:
        po.status === 'rejected'
          ? 'Rejected — the order is closed (the channel’s own status vocabulary: a completed order).'
          : 'Delivered and received — the order is closed and lives in history.',
    };
  }

  /** The channel's `Acknowledged` set — the decision is recorded, or none is owed. */
  if (recorded || statusState === 'acknowledged') {
    return {
      ...base,
      channelState: 'acknowledged',
      msLeft,
      hoursLeft,
      minutesLeft: Math.floor((msLeft % HOUR_MS) / MINUTE_MS),
      history: true,
      inQueue: false,
      reason: recorded
        ? `Acknowledged${
            po.acknowledgedAt ? ` on ${po.acknowledgedAt.slice(0, 10)}` : ''
          } — in the fulfilment track, not the acknowledgement queue.`
        : `Status "${po.status}" is past the acknowledgement decision — no acknowledgement obligation remains.`,
    };
  }

  /** Amazon's `New` set — an unacknowledged PO inside (or past) its window. */
  const actionable = msLeft > 0;
  const onBehalfAvailable = actionable && msLeft <= PO_ACK_ON_BEHALF_WINDOW_HOURS * HOUR_MS;
  const mustReject = msLeft <= 0;
  const autoRejectDue = nowMs >= autoRejectAtMs;
  const hours = Math.max(0, Math.floor(msLeft / HOUR_MS));
  const minutes = Math.max(0, Math.floor((msLeft % HOUR_MS) / MINUTE_MS));

  return {
    ...base,
    channelState: 'new',
    msLeft,
    hoursLeft,
    minutesLeft: minutes,
    actionable,
    onBehalfAvailable,
    notificationStage: currentStage(hoursLeft),
    autoRejectAt: new Date(autoRejectAtMs).toISOString(),
    autoRejectDue,
    mustReject,
    history: !actionable,
    inQueue: actionable,
    reason: actionable
      ? `Awaiting the brand's decision — ${hours}h ${minutes}m left of the 24-hour window${
          onBehalfAvailable
            ? '; Mercenta may act on the brand’s behalf inside this closing window, with the brand’s approval'
            : ''
        }.`
      : `The 24-hour acknowledgement window closed on ${deadline.slice(
          0,
          10
        )} — the documented action past the limit is a rejection, and an acceptance is refused.`,
  };
}


/** Thin predicates so no surface re-derives the queue/history split itself. */
export function poInQueue(po: PurchaseOrder, now: Date | string | number = new Date()): boolean {
  return poAcknowledgementWindow(po, now).inQueue;
}

export function poInHistory(po: PurchaseOrder, now: Date | string | number = new Date()): boolean {
  return poAcknowledgementWindow(po, now).history;
}

/**
 * The refusal the acknowledgement WRITER must apply (Amazon-documented): past
 * the 24-hour limit only a rejection is valid, so an acceptance or backorder is
 * refused. An all-rejected submission is permitted — that IS the documented late
 * action — and an unreadable window fails closed.
 */
export function lateAcceptanceRefusal(
  po: PurchaseOrder,
  allLinesRejected: boolean,
  now: Date | string | number = new Date()
): string | null {
  const window = poAcknowledgementWindow(po, now);
  if (window.channelState === 'unknown') {
    return `PO ${po.poNumber}: no acknowledgement window on record — the order date could not be read, so no acknowledgement is accepted (fail-closed).`;
  }
  if (window.channelState !== 'new' || !window.mustReject) return null;
  if (allLinesRejected) return null;
  return `PO ${po.poNumber}: the 24-hour acknowledgement window closed on ${
    window.deadline?.slice(0, 10) ?? 'record'
  }. The retail channel’s documented action past the limit is a rejection, so an acceptance or backorder is refused.`;
}

/**
 * HOW THE DECISION MEETS THE WINDOW — the ONE classifier every writer records
 * (`AckHistoryEntry.timeliness` + the canonical audit entry), so the trail can
 * never say something the window owner would contradict.
 *
 *   · `on_behalf` — Mercenta performed the required rejection for the brand;
 *   · `late`      — past the limit (only an all-rejected submission is valid);
 *   · `on_time`   — decided inside the 24-hour window.
 */
export function poAckTimeliness(
  po: PurchaseOrder,
  now: Date | string | number = new Date(),
  onBehalf = false
): PoAckTimeliness {
  if (onBehalf) return 'on_behalf';
  return poAcknowledgementWindow(po, now).mustReject ? 'late' : 'on_time';
}

/**
 * TRUE when the channel-REQUIRED rejection is now Mercenta's to perform: the PO
 * is still unacknowledged (Amazon's `New` set) and the declared on-behalf instant
 * (the final notification stage, BEFORE the limit) has passed.
 *
 * Used by the automatic producer and asserted by the gate; the WRITE itself is
 * `src/data/api.ts → autoRejectPurchaseOrderOnBehalf`, which is idempotent.
 */
export function poNeedsAutoRejection(
  po: PurchaseOrder,
  now: Date | string | number = new Date()
): boolean {
  const window = poAcknowledgementWindow(po, now);
  return window.channelState === 'new' && window.autoRejectDue;
}

/* ── §P13 / S4 — THE ON-BEHALF REJECTION DRAFT (pure; content-addressed) ──── */

/** One line of the drafted rejection — the PO's own line, at its ordered quantity. */
export interface PoOnBehalfRejectionDraftLine {
  sku: string;
  productName: string;
  quantity: number;
  unitPrice: number;
  /** The documented acknowledgement code the drafted line carries. */
  ackStatus: 'rejected';
  rejectionCode: PoRejectionCode;
}

/**
 * §P13 / S4 — WHAT THE BRAND IS ASKED TO APPROVE.
 *
 * Mercenta drafts the channel-REQUIRED rejection for a purchase order that has
 * reached the final notification stage without the brand's decision
 * (`PO_ACK_ON_BEHALF_WINDOW_HOURS`), and the brand approves it before anything is
 * performed. This type is the DRAFT'S CONTENT, derived — never hand-written by a
 * surface and never stored, so it cannot drift from the rule or from the PO.
 *
 * `available` is the owner's OWN predicate (`poNeedsAutoRejection` = Amazon's
 * `New` set at/after the on-behalf instant), so the draft is offered exactly when
 * the rejection is Mercenta's to perform and the S2 writer will perform it:
 *   · the CLOSING window — the brand may still decide for itself
 *     (`brandMayStillDecide`), and Mercenta offers to act for it;
 *   · PAST the limit — the documented action is a rejection, so the draft is the
 *     action that is actually left.
 * Anything else fails CLOSED with a stated `refusal` and no draft at all.
 *
 * `digest` content-addresses the draft (PO, instants, reason and every line's
 * sku/quantity/price), so an approval can be bound to the exact draft the brand
 * was shown and a stale one refused.
 */
export interface PoOnBehalfRejectionDraft {
  available: boolean;
  /** Why no draft is offered (null when it is). Never a silent absence. */
  refusal: string | null;
  poId: string;
  poNumber: string;
  brandId: string;
  /** TRUE while the brand may still decide for itself, inside the 24-hour window. */
  brandMayStillDecide: boolean;
  /** The channel's own documented rejection reason (config-owned, never invented). */
  rejectionCode: PoRejectionCode;
  /** The ONE operator-facing statement of the window rule (config-owned wording). */
  ruleText: string;
  acknowledgementDeadline: string | null;
  autoRejectAt: string | null;
  lines: PoOnBehalfRejectionDraftLine[];
  digest: string;
  /** Content-addressed identity: `draft-<poId>-<digest>`. */
  draftId: string;
}

/** FNV-1a — content addressing without crypto, so the digest is pure and deterministic. */
function draftDigest(input: string): string {
  let hash = 0x811c9dc5;
  for (let i = 0; i < input.length; i++) {
    hash ^= input.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193) >>> 0;
  }
  return hash.toString(16).padStart(8, '0');
}

/** Derive the on-behalf rejection draft for ONE purchase order at an INSTANT. */
export function poOnBehalfRejectionDraft(
  po: PurchaseOrder,
  now: Date | string | number = new Date()
): PoOnBehalfRejectionDraft {
  const window = poAcknowledgementWindow(po, now);
  const lines: PoOnBehalfRejectionDraftLine[] = po.lineItems.map((l) => ({
    sku: l.sku,
    productName: l.productName,
    quantity: l.quantity,
    unitPrice: l.unitPrice,
    ackStatus: 'rejected',
    rejectionCode: PO_ACK_AUTO_REJECT_REASON,
  }));
  const digest = draftDigest(
    [
      po.id,
      window.deadline ?? 'unreadable',
      window.autoRejectAt ?? 'unreadable',
      PO_ACK_AUTO_REJECT_REASON,
      ...lines.map((l) => `${l.sku}:${l.quantity}:${l.unitPrice}`),
    ].join('|')
  );
  const base = {
    poId: po.id,
    poNumber: po.poNumber,
    brandId: po.brandId,
    rejectionCode: PO_ACK_AUTO_REJECT_REASON,
    ruleText: PO_ACK_WINDOW_RULE_TEXT,
    acknowledgementDeadline: window.deadline,
    autoRejectAt: window.autoRejectAt,
    lines,
    digest,
    draftId: `draft-${po.id}-${digest}`,
  };

  /** Fail CLOSED: an unreadable window drafts nothing. */
  if (window.channelState === 'unknown') {
    return {
      ...base,
      available: false,
      brandMayStillDecide: false,
      refusal:
        `PO ${po.poNumber}: the acknowledgement window could not be read from the order date, so no on-behalf ` +
        `draft is offered (fail-closed).`,
    };
  }

  /**
   * Available exactly when the owner says the rejection is Mercenta's to perform —
   * so the draft and the writer agree by construction.
   */
  if (!poNeedsAutoRejection(po, now)) {
    return {
      ...base,
      available: false,
      brandMayStillDecide: window.actionable,
      refusal: window.autoRejectDue
        ? `PO ${po.poNumber}: the acknowledgement decision is already recorded, so no on-behalf rejection is drafted.`
        : `PO ${po.poNumber}: the on-behalf draft is not due yet — Mercenta drafts it at the final notification ` +
          `stage (${window.autoRejectAt ?? 'unreadable'}), and the brand may still decide until ` +
          `${window.deadline ?? 'unreadable'}.`,
    };
  }

  return { ...base, available: true, brandMayStillDecide: window.actionable, refusal: null };
}

/**
 * Queue first (soonest deadline first), history after (most recent first) — ONE
 * ordering used by BOTH portals, so the two can never disagree.
 */
export function sortPosByUrgency(
  pos: readonly PurchaseOrder[],
  now: Date | string | number = new Date()
): PurchaseOrder[] {
  const windows = new Map(pos.map((po) => [po.id, poAcknowledgementWindow(po, now)]));
  return [...pos].sort((a, b) => {
    const wa = windows.get(a.id)!;
    const wb = windows.get(b.id)!;
    if (wa.inQueue !== wb.inQueue) return wa.inQueue ? -1 : 1;
    if (wa.inQueue && wb.inQueue) return (wa.msLeft ?? 0) - (wb.msLeft ?? 0);
    return (b.orderDate ?? '').localeCompare(a.orderDate ?? '');
  });
}

/** The ONE statement of the window rule (config owns the wording). */
export { PO_ACK_WINDOW_RULE_TEXT };
/** §P13 — the timeliness vocabulary is config-owned; re-exported for consumers. */
export type { PoAckTimeliness };

