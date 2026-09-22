/**
 * §WAVE 3 — BACKORDER GATE — FAIL CLOSED.
 *
 * THE AUTHORITATIVE RULE
 * ----------------------
 * Backorders are gated PER LINE by the retail channel's own field
 * (`isBackOrderAllowed`), documented in
 * `docs/AMAZON_VENDOR_TRUTH_VALIDATION_2026-09-20.md` (S3/S4) and recorded as
 * discrepancy `AV-010` in `docs/AMAZON_VENDOR_DISCREPANCY_REGISTER_2026-09-20.md`
 * ("Backorder accepted unconditionally … Amazon gates this behind
 * `isBackOrderAllowed` (documented)").
 *
 *   true            → a backorder MAY be offered for that line
 *   false           → a backorder MUST NOT be offered
 *   undefined/absent→ UNKNOWN → a backorder MUST NOT be offered (fail closed)
 *
 * This module is the ONE implementation of that gate. The domain boundary
 * (`src/data/api.ts → acknowledgePurchaseOrder`) refuses a backorder that this
 * module does not permit, so the UI cannot be the only thing enforcing it — and
 * no alternate path (admin "on behalf of brand", simulation, a direct store
 * call) can bypass it.
 *
 * REJECTED-LINE PERMANENCE (AV-007)
 * ---------------------------------
 * "A line rejected first can never later become accepted/backordered." The gate
 * therefore also refuses a status transition OUT of `rejected`, which is what
 * stops a re-submitted acknowledgment turning a rejected line into a shipped
 * one through contradictory state.
 */
import type { LineAckStatus, PurchaseOrderLineItem } from '@/types';

/** The exact refusal shown when the channel has not allowed a backorder. */
export const BACKORDER_NOT_ALLOWED_MESSAGE =
  'This line is not backorder-eligible: the retail channel has not set ' +
  'isBackOrderAllowed for it. A backorder may only be filed where the channel ' +
  'explicitly allows one — accept the line or reject it with a reason code.';

/** True ONLY when the channel positively allows a backorder on this line. */
export function isBackOrderAllowedForLine(
  line: Pick<PurchaseOrderLineItem, 'isBackOrderAllowed'>
): boolean {
  return line.isBackOrderAllowed === true;
}

/**
 * The refusal reason for a backorder attempt, or `null` when it is permitted.
 * Used by BOTH the domain boundary and the UI, so the two can never disagree.
 */
export function backOrderBlockedReason(
  line: Pick<PurchaseOrderLineItem, 'isBackOrderAllowed'>
): string | null {
  return isBackOrderAllowedForLine(line) ? null : BACKORDER_NOT_ALLOWED_MESSAGE;
}

/** Convenience predicate for a UI that must decide whether to offer the option. */
export function canBackOrderLine(
  line: Pick<PurchaseOrderLineItem, 'isBackOrderAllowed'>
): boolean {
  return isBackOrderAllowedForLine(line);
}

/** How the channel's field should be described to a user, per state. */
export function backOrderAvailabilityLabel(
  line: Pick<PurchaseOrderLineItem, 'isBackOrderAllowed'>
): string {
  if (line.isBackOrderAllowed === true) return 'Backorder allowed by the retail channel on this line.';
  if (line.isBackOrderAllowed === false) return 'Backorder not allowed by the retail channel on this line.';
  return 'Backorder not declared by the retail channel for this line — treated as not allowed (fail closed).';
}

/**
 * AV-007 — the ack status of a line is forward-only out of `rejected`.
 *
 * Returns a refusal message when the transition must not happen, else `null`.
 * A line that has never been acknowledged (no current status) may take any
 * status, which is what keeps the normal first acknowledgement working.
 */
export function ackStatusTransitionRefusal(
  line: Pick<PurchaseOrderLineItem, 'sku' | 'ackStatus'>,
  next: LineAckStatus
): string | null {
  if (line.ackStatus !== 'rejected') return null;
  if (next === 'rejected' || next === 'unacknowledged') return null;
  return (
    `Line ${line.sku} was rejected and a rejection is permanent — it can never later become ` +
    `${next}. Re-submit the remaining lines only.`
  );
}
