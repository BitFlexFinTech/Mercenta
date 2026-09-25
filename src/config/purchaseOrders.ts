/**
 * §P13 — THE AMAZON PURCHASE-ORDER ACKNOWLEDGEMENT RULES (ONE declaration).
 *
 * FOUNDER RULE (strict, 2026-09-24): *Mercenta invents NOTHING in the Amazon
 * purchase-order process.* Every rule below is either (a) an Amazon-documented
 * rule, quoted from Amazon's own developer documentation, or (b) the NOTIFICATION
 * SCHEDULE (when Mercenta reminds a brand), which is operational scheduling and
 * is labelled as such — never presented as an Amazon rule.
 *
 * The PO lifecycle itself is Amazon's own vocabulary (`vendorOrders.json`):
 *
 *   `New`          "Status of the orders that are newly created." — the set
 *                  "you have not acknowledged or fulfilled"
 *   `Acknowledged` "Status of the orders acknowledged by vendors."
 *   `Closed`       "Status of the orders that are completed."
 *
 * So "a PO is only visible while it is actionable, and moves to history when it
 * is not" is NOT a Mercenta invention — it is the documented channel model, and
 * `src/lib/commerce/poAcknowledgementWindow.ts` derives it.
 *
 * AMAZON-DOCUMENTED (source: developer-docs.amazon.com → submit-order-acknowledgement,
 * cancel-and-change-orders, get-purchase-order-status):
 *   · "Submit the acknowledgment within 24 hours, including backordered items."
 *   · "You have 24 hours to accept a purchase order. Vendors must reject any
 *      purchase order that is on hold past the 24-hour time limit."
 *   · "You must submit an updated acknowledgment within 48 hours for any changes
 *      to quantity, price, ship dates, or delivery dates… After 48 hours, we only
 *      expect to receive updates to ship dates or delivery dates."
 *   · "You must provide a complete acknowledgement, including all purchase order
 *      line items… If you do not provide all line items…, Amazon implicitly
 *      rejects the missing line items."
 *   · "If the first acknowledgment code for a specific line item was `rejected`,
 *      you cannot change this with your update to either `accepted` or
 *      `backordered`."
 *   · Acknowledgement codes: `Accepted` · `Backordered` · `Rejected`, with exactly
 *      three reasons: `TemporarilyUnavailable` · `InvalidProductIdentifier` ·
 *      `ObsoleteProduct`.
 */
import { PO_REJECTION_CODES, type PoRejectionCode, type PurchaseOrderStatus } from '@/types';

/**
 * AMAZON-DOCUMENTED — the acknowledgement window. Deadline = `orderDate + 24h`.
 * Declared ONCE; `src/lib/work/workStore.ts` re-exports this constant so no
 * second copy of the number exists anywhere in the platform.
 */
export const PO_ACKNOWLEDGEMENT_HOURS = 24;

/**
 * AMAZON-DOCUMENTED — the update window for changes to quantity, price, ship
 * dates or delivery dates. Declared here so the later update rule has ONE owner
 * (it is not yet enforced by the acknowledgement writer).
 */
export const PO_ACK_UPDATE_WINDOW_HOURS = 48;

/**
 * NOTIFICATION SCHEDULE (Mercenta operational scheduling — NOT an Amazon rule).
 *
 * Hours remaining in the 24-hour window at which Mercenta notifies the brand on
 * every connected channel. Descending, so the smallest matching stage is the one
 * currently in force. Founder directive: "12hours, 6hours, 2hours… this is just
 * for notification purposes."
 */
export const PO_ACK_NOTIFICATION_HOURS: readonly number[] = [12, 6, 2];

/**
 * THE FINAL NOTIFICATION STAGE — the last declared schedule point, which is also
 * the instant Mercenta performs the channel-REQUIRED rejection on the brand's
 * behalf if the brand has not acted (see `PO_ACK_AUTO_REJECT_REASON`).
 */
export const PO_ACK_ON_BEHALF_WINDOW_HOURS = 2;

/**
 * THE REJECTION REASON USED WHEN THE WINDOW CLOSES WITHOUT A BRAND DECISION.
 *
 * Amazon permits exactly three reasons, so this is a MAPPING onto Amazon's own
 * vocabulary, never a new code: `TemporarilyUnavailable` = *"items are currently
 * not available"*, which is the honest reading of "availability was not confirmed
 * inside the 24-hour window". Confirmed by the founder 2026-09-24.
 *
 * Amazon requires that a PO on hold past the limit is REJECTED; Mercenta performs
 * that required rejection BEFORE the limit expires so no PO is ever left
 * unacknowledged. This guard fails closed at module load if the declared reason
 * ever stops being one of Amazon's documented codes.
 */
export const PO_ACK_AUTO_REJECT_REASON: PoRejectionCode = 'TemporarilyUnavailable';

if (!PO_REJECTION_CODES.includes(PO_ACK_AUTO_REJECT_REASON)) {
  throw new Error(
    `[purchaseOrders] PO_ACK_AUTO_REJECT_REASON "${PO_ACK_AUTO_REJECT_REASON}" is not one of the retail ` +
      `channel's documented rejection reasons (${PO_REJECTION_CODES.join(', ')}). Mercenta never invents a ` +
      `rejection code. (Provenance: the channel's own published acknowledgement schema.)`
  );
}

/**
 * HOW A RECORDED DECISION MET THE CHANNEL'S 24-HOUR WINDOW. Declared ONCE here
 * (consumed by `src/lib/commerce/poAcknowledgementWindow.ts`,
 * `src/data/api.ts` and every surface/audit projection):
 *
 *   `on_time`   — the brand decided inside the 24-hour window;
 *   `late`      — past the limit, where Amazon's only documented action is a
 *                 rejection (so the submission is an all-rejected one);
 *   `on_behalf` — the brand did not decide, so Mercenta performed the
 *                 channel-REQUIRED rejection on its behalf at the final
 *                 notification stage, BEFORE the limit.
 */
export const PO_ACK_TIMELINESS = ['on_time', 'late', 'on_behalf'] as const;
export type PoAckTimeliness = (typeof PO_ACK_TIMELINESS)[number];

/**
 * THE ACTOR MERCENTA'S OWN AUTOMATIC CHANNEL ACTIONS ARE ATTRIBUTED TO.
 *
 * Mercenta operates the retail-channel account, so when a window closes without
 * the brand's decision the rejection is MERCENTA's own action performed on the
 * brand's behalf — never the brand's. Every such write is attributed to this
 * declared identity and audited (`.clinerules/mercenta-business-model.md`:
 * "every intervention is attributed and audited"). Declared once so the audit
 * trail can never disagree with itself.
 */
export const PO_ACK_SYSTEM_ACTOR_ID = 'mercenta-system:po-acknowledgement';

/**
 * The statuses that carry an acknowledgement OBLIGATION — i.e. Amazon's `New`
 * set for an operational PO. A PO in any other status is already past the
 * acknowledgement decision and therefore derives NO acknowledgement work.
 */
export const PO_ACK_STATUSES_WITH_OBLIGATION: readonly PurchaseOrderStatus[] = [
  'received',
  'under_review',
];

/** Amazon's own PO lifecycle vocabulary, as derived for a Mercenta PO. */
export const PO_CHANNEL_STATES = ['new', 'acknowledged', 'closed', 'unknown'] as const;
export type PoChannelState = (typeof PO_CHANNEL_STATES)[number];

/**
 * THE ONE OPERATOR-FACING STATEMENT OF THE WINDOW RULE. Surfaces render this
 * instead of writing their own copy, so the rule can never drift between the
 * brand portal and the admin console. Wording-safe: it states the documented
 * obligation and never claims an Amazon relationship, permission or outcome.
 */
export const PO_ACK_WINDOW_RULE_TEXT =
  'The retail channel requires every purchase order to be acknowledged within 24 hours of receipt — accepted, ' +
  'backordered or rejected. Past the 24-hour limit the documented action is a rejection.';

/**
 * §P13 / S8 — THE ONE BRAND-FACING STATEMENT FOR THE ONBOARDING SURFACES.
 *
 * The brand's onboarding teaches the acknowledgement rule in four places — the
 * guided tours, the knowledge-base article those tours link to, the wizard's
 * operational-guidance step and the purchase-orders blurb. Before S8 each of them
 * RE-TYPED the rule and, worse, ASSERTED a consequence the platform's own
 * discrepancy register records as unsupported (`docs/AMAZON_RECONCILIATION_STATUS.md`
 * AV-003: *"No Amazon source reached documents a vendor performance rating or its
 * triggers"*): an unacknowledged order was said to be *"flagged"* and to cause a
 * *"vendor performance deduction"*. The founder directive is that Mercenta invents
 * NOTHING in the channel's purchase-order process, so those claims are removed and
 * every onboarding surface now renders THIS object.
 *
 * Everything below is DERIVED from the declarations above — no figure, code or
 * consequence is re-typed:
 *   · `ruleText`       — the config-owned rule sentence, verbatim.
 *   · `shortText`      — the list/summary form, derived from `PO_ACKNOWLEDGEMENT_HOURS`.
 *   · `mercentaProcess`— MERCENTA'S OWN declared operating process (the notification
 *                        schedule + the on-behalf rejection), labelled as Mercenta's
 *                        and never presented as a channel rule.
 *   · `rejectionCodes` — the channel's documented rejection reasons (`types.ts`).
 *   · `text`           — the ONE paragraph the onboarding surfaces render.
 */
export const PO_ACK_ONBOARDING_STATEMENT = {
  ruleText: PO_ACK_WINDOW_RULE_TEXT,
  shortText:
    `Acknowledge each purchase order within ${PO_ACKNOWLEDGEMENT_HOURS} hours of receipt — accepted, backordered ` +
    `or rejected — and acknowledge only what you can actually ship.`,
  mercentaProcess:
    `Mercenta reminds you at ${PO_ACK_NOTIFICATION_HOURS.join('/')} hours remaining and, if you have not decided by ` +
    `the final stage, performs the rejection the channel requires on your behalf. That schedule and that on-behalf ` +
    `action are Mercenta's own operating process, not channel rules.`,
  rejectionCodes: PO_REJECTION_CODES,
  text:
    `${PO_ACK_WINDOW_RULE_TEXT} Mercenta reminds you at ${PO_ACK_NOTIFICATION_HOURS.join('/')} hours remaining and, ` +
    `if you have not decided by the final stage, performs the rejection the channel requires on your behalf. That ` +
    `schedule and that on-behalf action are Mercenta's own operating process, not channel rules.`,
} as const;
