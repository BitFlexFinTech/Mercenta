/**
 * §BATCH 2k (`AV-011`) — THE ONE OWNER of the VERIFICATION of a transmitted
 * acknowledgement (the "confirmation step" the Phase 0A audit found missing).
 *
 * WHY THIS MODULE EXISTS (the defect it closes)
 * --------------------------------------------
 * Mercenta transmits a brand's acknowledgement to the retail channel
 * (`src/lib/commerce/proxyProcessor.ts` → `submitAcknowledgement`) and records the
 * channel's own reference — but it NEVER confirmed the version actually APPEARED at
 * the channel. Register `AV-011`: *"an ack could silently fail"*. The channel
 * documents both halves of the answer:
 *
 *   · an acknowledgement's status is VERIFIABLE — it can be read back; and
 *   · *"if the original or updated version doesn't appear after 30 minutes"*
 *      something is wrong.
 *
 * This owner turns those two documented facts into a verdict, derived from:
 *   · WHEN Mercenta transmitted the acknowledgement (`ChannelInstructionOutcome`'s
 *     `channelAcknowledgement.submittedAt`), and
 *   · what the channel's OWN order state read reports
 *     (`getPurchaseOrdersStatus`, source `S5` / register `AV-018` — the SAME read the
 *     receiving sync already performs; NO second channel call and NO new channel
 *     vocabulary is invented here).
 *
 * WHAT THIS MODULE DELIBERATELY DOES **NOT** DO
 * ---------------------------------------------
 * It does not model the channel's Transaction Status API (`getTransaction`). That
 * read's request/response shape and status vocabulary are not established by the
 * platform's evidence, which is why `AV-040`'s remaining `getTransaction` operation
 * is EVIDENCE-BLOCKED. Here the confirmation reuses a read the channel ALREADY
 * documents and the platform already performs, and it FAILS CLOSED
 * (`unreadable`) whenever that read cannot be obtained — an unread state is never
 * reported as `confirmed`.
 *
 * PURITY / DETERMINISM
 * --------------------
 * `verifyAcknowledgement` is PURE: the instant is supplied by the caller (`now`), so
 * a validator can pin it and a surface can use the real clock. No `Date.now()`, no
 * randomness, no network, no store access. `readAcknowledgementVerification` is the
 * thin async convenience that performs the SAME read the receiving sync performs and
 * hands the result to the pure owner.
 */
import {
  PO_ACK_VERIFICATION_RULE_TEXT,
  PO_ACK_VERIFICATION_STATE_LABELS,
  PO_ACK_VERIFICATION_WINDOW_MINUTES,
} from '@/config/purchaseOrders';
import type {
  ChannelPurchaseOrderStatus,
  ChannelPurchaseOrdersStatusResult,
} from '@/lib/spapi/client';
import type { PoAckVerificationState } from '@/types';

const MINUTE_MS = 60_000;

/** The channel's own purchase-order state, as far as verification needs it. */
export type AckVerificationChannelState = ChannelPurchaseOrderStatus['status'];

export interface PoAcknowledgementVerification {
  /** The ONE verdict (see `PO_ACK_VERIFICATION_STATES` in `@/types`). */
  state: PoAckVerificationState;
  /** TRUE ONLY when the channel's own read reports the order acknowledged (or beyond). */
  confirmed: boolean;
  /** TRUE ONLY for `not_confirmed` — the documented at-risk condition. */
  atRisk: boolean;
  /** The transmission instant the window is measured from (ISO), when readable. */
  submittedAt: string | null;
  /** The instant the appearance window elapses (ISO), when measurable. */
  appearanceDeadline: string | null;
  /** Whole minutes elapsed since transmission, when measurable. */
  minutesElapsed: number | null;
  /** The channel's own order state as read, or null when it could not be read. */
  channelState: AckVerificationChannelState | null;
  /** TRUE when the read that produced this verdict came from the simulated channel. */
  simulated: boolean;
  /** The ONE operator-facing statement of the verdict. ALWAYS present. */
  statement: string;
  /** The channel's documented rule, quoted from its config owner. */
  ruleText: string;
  /** The operator-readable label of the state (declared once, in the config owner). */
  stateLabel: string;
}

/**
 * Does the channel's OWN order state imply the acknowledgement APPEARED?
 *
 * Once the channel has logged the acknowledgement the order leaves `open`; a
 * `received`/`closed` order necessarily passed through `acknowledged`. A `cancelled`
 * order does NOT imply an acknowledgement, so it is not treated as confirmation.
 */
function channelStateReportsAcknowledged(state: AckVerificationChannelState): boolean {
  return state === 'acknowledged' || state === 'received' || state === 'closed';
}

function parseInstant(value: string | null | undefined): number | null {
  if (value === null || value === undefined || value === '') return null;
  const ms = Date.parse(value);
  return Number.isFinite(ms) ? ms : null;
}

function instantMs(value: Date | string | number): number {
  if (value instanceof Date) return value.getTime();
  if (typeof value === 'number') return value;
  const ms = Date.parse(value);
  return Number.isFinite(ms) ? ms : Number.NaN;
}

interface VerdictBase {
  ruleText: string;
  simulated: boolean;
  submittedAt: string | null;
  channelState: AckVerificationChannelState | null;
}
interface VerdictDetail {
  confirmed: boolean;
  atRisk: boolean;
  appearanceDeadline: string | null;
  minutesElapsed: number | null;
  statement: string;
}

function verdict(
  state: PoAckVerificationState,
  base: VerdictBase,
  detail: VerdictDetail
): PoAcknowledgementVerification {
  return { state, stateLabel: PO_ACK_VERIFICATION_STATE_LABELS[state], ...base, ...detail };
}

/**
 * THE verdict. Pure; the instant is supplied by the caller.
 *
 * FAIL-CLOSED ORDER (each unreadable input yields `unreadable`, never `confirmed`):
 *   1. nothing transmitted                 → `not_submitted`
 *   2. transmission time not readable      → `unreadable`
 *   3. the channel's own state unreadable  → `unreadable`
 *   4. the channel reports it acknowledged → `confirmed`
 *   5. the instant is not readable         → `unreadable`
 *   6. inside the appearance window        → `awaiting_visibility`
 *   7. past the window, not acknowledged   → `not_confirmed` (AT RISK)
 */
export function verifyAcknowledgement(input: {
  /** The recorded transmission instant, when one exists. */
  submittedAt: string | null | undefined;
  /** The channel's OWN order state as read, or null when it could not be read. */
  channelState: AckVerificationChannelState | null;
  /** TRUE when the read came from the simulated channel (no live call occurred). */
  simulated?: boolean;
  now?: Date | string | number;
}): PoAcknowledgementVerification {
  const ruleText = PO_ACK_VERIFICATION_RULE_TEXT;
  const simulated = !!input.simulated;
  const hasSubmission =
    input.submittedAt !== null && input.submittedAt !== undefined && String(input.submittedAt) !== '';
  const submittedMs = parseInstant(input.submittedAt ?? null);
  const base: VerdictBase = {
    ruleText,
    simulated,
    submittedAt: submittedMs !== null ? new Date(submittedMs).toISOString() : null,
    channelState: input.channelState,
  };

  /* 1. Nothing transmitted — the duty here is the acknowledgement window's (AV-001). */
  if (!hasSubmission) {
    return verdict('not_submitted', base, {
      confirmed: false,
      atRisk: false,
      appearanceDeadline: null,
      minutesElapsed: null,
      statement:
        'No acknowledgement has been transmitted for this order, so there is nothing to confirm yet. ' + ruleText,
    });
  }

  /* 2. Transmitted, but WHEN cannot be read — the window cannot be measured. */
  if (submittedMs === null) {
    return verdict('unreadable', base, {
      confirmed: false,
      atRisk: false,
      appearanceDeadline: null,
      minutesElapsed: null,
      statement:
        'An acknowledgement was transmitted for this order but its transmission time cannot be read, so the ' +
        'appearance window cannot be measured and it cannot be confirmed. ' +
        ruleText,
    });
  }

  const deadlineMs = submittedMs + PO_ACK_VERIFICATION_WINDOW_MINUTES * MINUTE_MS;
  const appearanceDeadline = new Date(deadlineMs).toISOString();
  const nowMs = input.now === undefined ? Date.now() : instantMs(input.now);

  /* 3. The channel's own state could not be read — fail closed. */
  if (input.channelState === null) {
    return verdict('unreadable', base, {
      confirmed: false,
      atRisk: false,
      appearanceDeadline,
      minutesElapsed: null,
      statement:
        'The acknowledgement was transmitted but the channel’s own order state could not be read, so the ' +
        'acknowledgement cannot be confirmed (an unread state is never reported as confirmed). ' +
        ruleText,
    });
  }

  /* 4. The channel reports the order acknowledged — the version APPEARED. */
  if (channelStateReportsAcknowledged(input.channelState)) {
    return verdict('confirmed', base, {
      confirmed: true,
      atRisk: false,
      appearanceDeadline,
      minutesElapsed: null,
      statement:
        'The retail channel’s own order state reports this order as acknowledged, so the acknowledgement ' +
        `appeared.${simulated ? ' (Simulated channel read — no live channel call was made.)' : ''}`,
    });
  }

  /* 5. The instant is not readable — fail closed rather than judge the window. */
  if (!Number.isFinite(nowMs)) {
    return verdict('unreadable', base, {
      confirmed: false,
      atRisk: false,
      appearanceDeadline,
      minutesElapsed: null,
      statement:
        'An acknowledgement was transmitted and the channel’s own order state does not report it acknowledged, ' +
        'but the current instant cannot be read, so the appearance window cannot be judged. ' +
        ruleText,
    });
  }

  const minutesElapsed = Math.max(0, Math.floor((nowMs - submittedMs) / MINUTE_MS));

  /* 6. Inside the appearance window — nothing is concluded yet. */
  if (nowMs < deadlineMs) {
    return verdict('awaiting_visibility', base, {
      confirmed: false,
      atRisk: false,
      appearanceDeadline,
      minutesElapsed,
      statement:
        `The acknowledgement was transmitted ${minutesElapsed} minute(s) ago and the channel’s documented ` +
        `${PO_ACK_VERIFICATION_WINDOW_MINUTES}-minute appearance window has not yet elapsed — nothing is ` +
        `concluded yet. ${ruleText}`,
    });
  }

  /* 7. Past the window and still not acknowledged — the documented AT-RISK condition. */
  return verdict('not_confirmed', base, {
    confirmed: false,
    atRisk: true,
    appearanceDeadline,
    minutesElapsed,
    statement:
      `The acknowledgement was transmitted ${minutesElapsed} minute(s) ago and the channel’s own order state ` +
      `still does NOT report it acknowledged — past the documented ` +
      `${PO_ACK_VERIFICATION_WINDOW_MINUTES}-minute appearance window, so the acknowledgement may not have ` +
      `landed and is AT RISK.${simulated ? ' (Simulated channel read — no live channel call was made.)' : ''} ` +
      ruleText,
  });
}

/** The seam shape this owner needs — the SP-API client satisfies it exactly. */
export interface AckVerificationChannelReader {
  getPurchaseOrdersStatus(purchaseOrderIds: string[]): Promise<ChannelPurchaseOrdersStatusResult>;
}

/**
 * The "when live" convenience: read the channel's own PO state back through the seam
 * and hand it to the PURE owner. With real credentials this is a live channel call;
 * without them the seam's mock answers and the verdict is labelled `simulated`.
 *
 * FAIL CLOSED, ALWAYS: if the seam throws (no verified connection), returns not-ok, or
 * does not know the order id, the channel state stays null and the owner returns
 * `unreadable` — never `confirmed`. An id the channel does not know is reported as
 * unread, exactly as the receiving sync reports `unknownPurchaseOrderIds` separately
 * (source `S5`: *"absent" must never be read as "not received"*).
 */
export async function readAcknowledgementVerification(input: {
  reader: AckVerificationChannelReader;
  purchaseOrderId: string;
  submittedAt: string | null | undefined;
  now?: Date | string | number;
}): Promise<PoAcknowledgementVerification> {
  const id = input.purchaseOrderId.trim();
  let channelState: AckVerificationChannelState | null = null;
  let simulated = false;
  if (id) {
    try {
      const read = await input.reader.getPurchaseOrdersStatus([id]);
      if (read.ok) {
        const match = (read.statuses ?? []).find((s) => s.purchaseOrderId === id);
        if (match) {
          channelState = match.status;
          simulated = match.simulated;
        }
      }
    } catch {
      /** No verified connection ⇒ the seam throws. Reported as unread, never confirmed. */
      channelState = null;
    }
  }
  return verifyAcknowledgement({ submittedAt: input.submittedAt, channelState, simulated, now: input.now });
}
