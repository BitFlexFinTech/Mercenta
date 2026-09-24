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
  PO_ACK_NOTIFICATION_HOURS,
  PO_ACK_ON_BEHALF_WINDOW_HOURS,
  PO_ACK_STATUSES_WITH_OBLIGATION,
  PO_ACK_WINDOW_RULE_TEXT,
  type PoAckTimeliness,
  type PoChannelState,
} from '@/config/purchaseOrders';
import type { PurchaseOrder } from '@/types';

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
  const obligation = PO_ACK_STATUSES_WITH_OBLIGATION.includes(po.status);
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

  /** Amazon's `Closed` set — completed or rejected: no action remains. */
  if (po.status === 'rejected' || po.status === 'delivered') {
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

  /** Amazon's `Acknowledged` set — the decision is recorded, or none is owed. */
  if (recorded || !obligation) {
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

