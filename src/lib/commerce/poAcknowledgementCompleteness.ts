/**
 * §BATCH 2j (`AV-009`) — THE ONE OWNER of the COMPLETENESS of a purchase-order
 * acknowledgement.
 *
 * Documented channel rule implemented here (source `S2` of the Phase 0A audit;
 * register `docs/AMAZON_VENDOR_DISCREPANCY_REGISTER_2026-09-20.md` row `AV-009`):
 *
 *   "You must provide a complete acknowledgement, including all purchase order line
 *    items… If you do not provide all line items…, Amazon implicitly rejects the
 *    missing line items."
 *
 * WHY THIS MODULE EXISTS (the defect it closes):
 * the acknowledgement writer already applied the CONSEQUENCE — an omitted line was
 * written as a rejection — but nothing declared the RULE, so:
 *   · the brand was never told, at the moment of submission, that a line it left
 *     undecided would be rejected (the rule could not be stated anywhere because it
 *     was not written down anywhere);
 *   · the submission left no record that it had been INCOMPLETE, and that fact is NOT
 *     derivable afterwards — once written, an implicit rejection is indistinguishable
 *     from an explicit one;
 *   · no gate could assert either behaviour.
 *
 * The verdict is PURE and is computed BEFORE the write, from the submission the caller
 * sent and the order's own lines. No store access, no clock.
 */
import { PO_ACK_COMPLETENESS_RULE_TEXT } from '@/config/purchaseOrders';
import type { PurchaseOrder } from '@/types';

/**
 * A line of an acknowledgement submission, as far as completeness needs it.
 * `src/data/api.ts → PoLineAckSubmission` structurally satisfies this, so this module
 * stays free of any dependency on the domain boundary (which imports THIS module —
 * importing it back would be a cycle).
 */
export interface AckCompletenessSubmissionLine {
  sku: string;
  ackStatus?: string;
}

export interface PoAcknowledgementCompleteness {
  /** TRUE when the submission decides every line on the order. */
  complete: boolean;
  /**
   * FALSE when the ORDER itself cannot be read (it carries no lines), so completeness
   * cannot be judged at all. FAIL CLOSED: an unjudgeable submission is never reported
   * as complete.
   */
  judgeable: boolean;
  /** The SKUs this submission leaves undecided, in the order's own line order. */
  missing: readonly string[];
  /** The channel's rule, quoted from its config owner. */
  ruleText: string;
  /** The ONE operator-facing statement of the verdict; `null` when the submission is complete. */
  statement: string | null;
}

/** Is this line decided by the submission? An omitted or `unacknowledged` line is NOT. */
function lineIsDecided(sku: string, submission: readonly AckCompletenessSubmissionLine[]): boolean {
  const ack = submission.find((a) => a.sku === sku);
  return !!ack && ack.ackStatus !== undefined && ack.ackStatus !== 'unacknowledged';
}

/**
 * THE verdict. `missing` is derived from the ORDER's own lines — never from the
 * submission — so a submission that sends extra or unknown SKUs cannot make itself
 * appear complete.
 */
export function poAcknowledgementCompleteness(
  po: Pick<PurchaseOrder, 'poNumber' | 'lineItems'>,
  submission: readonly AckCompletenessSubmissionLine[]
): PoAcknowledgementCompleteness {
  const ruleText = PO_ACK_COMPLETENESS_RULE_TEXT;

  if (po.lineItems.length === 0) {
    return {
      complete: false,
      judgeable: false,
      missing: [],
      ruleText,
      statement:
        `Order ${po.poNumber} carries no readable line items, so the completeness of an acknowledgement cannot be ` +
        `judged. Nothing is accepted as complete on an unreadable order (fail-closed).`,
    };
  }

  const missing = po.lineItems.map((l) => l.sku).filter((sku) => !lineIsDecided(sku, submission));

  if (missing.length === 0) {
    return { complete: true, judgeable: true, missing: [], ruleText, statement: null };
  }

  return {
    complete: false,
    judgeable: true,
    missing,
    ruleText,
    statement:
      `This acknowledgement leaves ${missing.length} of the order's ${po.lineItems.length} lines undecided ` +
      `(${missing.join(', ')}). ${ruleText}`,
  };
}
