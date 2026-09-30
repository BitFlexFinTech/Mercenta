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
import {
  PO_CHANNEL_CHANGE_KINDS,
  PO_REJECTION_CODES,
  type PoChannelChangeKind,
  type PoRejectionCode,
  type PurchaseOrderStatus,
} from '@/types';
/**
 * §BATCH 2h (`AV-043`) — the PO vocabulary mapping's ONE owner. Imported as a
 * VALUE (not a type) so `PO_ACK_STATUSES_WITH_OBLIGATION` below can be DERIVED
 * from it instead of writing the same two statuses down a second time.
 */
import { mercentaStatusesForChannelState } from '@/lib/commerce/poChannelVocabulary';

/**
 * AMAZON-DOCUMENTED — the acknowledgement window. Deadline = `orderDate + 24h`.
 * Declared ONCE; `src/lib/work/workStore.ts` re-exports this constant so no
 * second copy of the number exists anywhere in the platform.
 */
export const PO_ACKNOWLEDGEMENT_HOURS = 24;

/**
 * AMAZON-DOCUMENTED — the UPDATE window that governs a change to an
 * acknowledgement (register `AV-006`): *"You must submit an updated
 * acknowledgment within 48 hours for any changes to quantity, price, ship dates,
 * or delivery dates… After 48 hours, we only expect to receive updates to ship
 * dates or delivery dates."*
 *
 * Declared ONCE here. `src/lib/commerce/poAcknowledgementWindow.ts` derives the
 * window from it and the acknowledgement writer enforces it, so no second copy of
 * the number exists anywhere in the platform.
 */
export const PO_ACK_UPDATE_WINDOW_HOURS = 48;

/**
 * AMAZON-DOCUMENTED — the field groups a change to an acknowledgement may touch.
 * Inside the update window ALL of them are accepted; after it only the SCHEDULE
 * groups are expected (see `PO_AMENDABLE_FIELD_GROUPS_AFTER_WINDOW`). Declared
 * once so the rule and the writer cannot drift.
 *
 *   `quantity`        — the acknowledged units on a line
 *   `price`           — the acknowledged unit cost price on a line
 *   `ship_dates`      — the scheduled ship date on a line
 *   `delivery_dates`  — the PO's delivery window (a channel-issued change, `AV-024`)
 */
export const PO_AMENDABLE_FIELD_GROUPS = ['quantity', 'price', 'ship_dates', 'delivery_dates'] as const;
export type PoAmendableFieldGroup = (typeof PO_AMENDABLE_FIELD_GROUPS)[number];

/**
 * AMAZON-DOCUMENTED — after the update window closes, *"we only expect to receive
 * updates to ship dates or delivery dates."* A quantity or price change past the
 * window is therefore REFUSED, and the refusal quotes this declaration.
 */
export const PO_AMENDABLE_FIELD_GROUPS_AFTER_WINDOW: readonly PoAmendableFieldGroup[] = [
  'ship_dates',
  'delivery_dates',
];

/** Operator-readable labels for the declared field groups, derived from the group names. */
export const PO_AMENDABLE_FIELD_GROUP_LABELS: Record<PoAmendableFieldGroup, string> = {
  quantity: 'acknowledged quantity',
  price: 'cost price',
  ship_dates: 'ship dates',
  delivery_dates: 'delivery dates',
};

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
 * The statuses that carry an acknowledgement OBLIGATION — i.e. the channel's `New`
 * set for an operational PO. A PO in any other status is already past the
 * acknowledgement decision and therefore derives NO acknowledgement work.
 *
 * §BATCH 2h (`AV-043`) — DERIVED, never re-typed. This set IS "the statuses whose
 * channel lifecycle position is `New`", and `src/lib/commerce/poChannelVocabulary.ts`
 * owns that mapping in both directions. Writing `'received'` / `'under_review'`
 * out here as well would be a SECOND representation of one fact: it would drift
 * the moment a lifecycle status is added, and the set and the mapping would then
 * silently disagree about which orders are actionable.
 */
export const PO_ACK_STATUSES_WITH_OBLIGATION: readonly PurchaseOrderStatus[] =
  mercentaStatusesForChannelState('new');

/** Amazon's own PO lifecycle vocabulary, as derived for a Mercenta PO. */
export const PO_CHANNEL_STATES = ['new', 'acknowledged', 'closed', 'unknown'] as const;
export type PoChannelState = (typeof PO_CHANNEL_STATES)[number];

/**
 * §BATCH 2c (`AV-024`) — THE ONE PLACE THE CHANNEL'S CHANGE LIST IS LABELLED.
 *
 * The vocabulary itself is declared in `src/types.ts`
 * (`PO_CHANNEL_CHANGE_KINDS`) because it is the CHANNEL's own, exactly like
 * `PO_REJECTION_CODES`; this config attaches the operator-readable label for each
 * kind, so a surface or an audit line never invents its own wording. The guard
 * below fails at module load if the two ever drift apart.
 */
export const PO_CHANNEL_CHANGE_KIND_LABELS: Record<PoChannelChangeKind, string> = {
  window: 'ship / delivery window',
  quantity: 'ordered quantity',
  item_cancellation: 'a line the channel removed',
  cost: 'unit cost price',
  new_item: 'a line the channel added',
  cancel: 'cancellation of the order',
  uncancel: 'reinstatement of the order',
  order_type: 'order type',
  destination_fc: 'destination fulfilment centre',
  freight_term: 'freight term',
};

for (const kind of PO_CHANNEL_CHANGE_KINDS) {
  if (!PO_CHANNEL_CHANGE_KIND_LABELS[kind]) {
    throw new Error(
      `[purchaseOrders] the channel's change kind "${kind}" has no declared label. Every documented change ` +
        `kind must be labelled once, here, so no surface invents its own wording.`
    );
  }
}

/**
 * §BATCH 2c (`AV-024`) — THE ONE OPERATOR-FACING STATEMENT OF THE REVISION RULE.
 *
 * The retail channel may change a purchase order after it has been issued, and
 * the vendor is required to fulfil the UPDATED purchase order; Mercenta discovers
 * a change by polling the channel's order read. Surfaces render THIS string
 * instead of writing their own copy, so the rule cannot drift between the brand
 * portal and the admin console. Wording-safe: it states the documented obligation
 * and claims no channel relationship, permission or outcome.
 */
export const PO_REVISION_RULE_TEXT =
  'When a purchase order has been issued the retail channel can still change it — the order window, the ordered ' +
  'quantity, a line, the cost price, the destination or the freight term. The updated purchase order is the one ' +
  'that must be fulfilled, so Mercenta records every change and shows you which version of the order you are ' +
  'working from.';

/**
 * §BATCH 2c (`AV-024`) — MERCENTA'S OWN review flag (labelled as Mercenta's, never
 * as a channel rule), stated only when a channel change undercut a decision the
 * brand had already made. The updated order still stands; the acknowledgement
 * must be brought up to it before any shipment is derived from the record.
 */
export const PO_REVISION_REVIEW_REASON =
  'Mercenta review required: the channel changed this order in a way that undercuts the acknowledgement already ' +
  'recorded — a quantity reduced below the acknowledged units, a cancelled line that had been acknowledged, or ' +
  'cancellation of the order. The updated order stands, and the acknowledgement must be updated before any ' +
  'shipment is derived from this purchase order.';


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
 * §BATCH 2b (`AV-006`) — THE ONE OPERATOR-FACING STATEMENT OF THE UPDATE RULE.
 *
 * Amazon documents that a change to an acknowledgement must be submitted within
 * 48 hours for changes to quantity, price, ship dates or delivery dates, and that
 * after 48 hours only ship-date or delivery-date updates are expected. Before this
 * declaration Mercenta modelled NEITHER the window nor the after-window limit, so
 * it could not tell a brand its real obligation.
 *
 * Surfaces render THIS string (derived from the declared hours and group sets
 * above) instead of writing their own copy — so the rule can never drift between
 * the brand portal, the admin console, the knowledge base and Operational Guidance.
 */
export const PO_AMENDMENT_WINDOW_RULE_TEXT =
  `A change to an acknowledgement must be submitted within ${PO_ACK_UPDATE_WINDOW_HOURS} hours of the order for changes ` +
  `to quantity, price, ship dates or delivery dates. After ${PO_ACK_UPDATE_WINDOW_HOURS} hours only updates to ship ` +
  `dates or delivery dates are expected.`;

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
 *   · `amendmentText`  — the config-owned UPDATE rule (`PO_AMENDMENT_WINDOW_RULE_TEXT`,
 *                        `AV-006`), so the onboarding surfaces teach the amendment
 *                        window as well as the acknowledgement window.
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
  amendmentText: PO_AMENDMENT_WINDOW_RULE_TEXT,
  text:
    `${PO_ACK_WINDOW_RULE_TEXT} ${PO_AMENDMENT_WINDOW_RULE_TEXT} Mercenta reminds you at ` +
    `${PO_ACK_NOTIFICATION_HOURS.join('/')} hours remaining and, if you have not decided by the final stage, performs ` +
    `the rejection the channel requires on your behalf. That schedule and that on-behalf action are Mercenta's own ` +
    `operating process, not channel rules.`,
} as const;
