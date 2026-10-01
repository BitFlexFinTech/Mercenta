/**
 * §DEFECT FIXED AT SOURCE (owner-reported, 2026-09-30) — THE ONE OWNER OF THE QUESTION
 * *"MAY MERCENTA DECIDE THIS ORDER FOR THE BRAND?"*
 *
 * WHAT WAS WRONG. A Super Admin could acknowledge ANY purchase order on a brand's behalf
 * at ANY moment inside the 24-hour window, with nothing recording the brand's agreement —
 * while the NARROWER action (Mercenta performing the channel-required rejection at the end
 * of the window) was already properly gated through a brand-approved draft. The risk the
 * owner named is real in both directions: an on-behalf ACCEPTANCE commits a brand to supply
 * goods nobody at Mercenta can see, and an on-behalf REJECTION can throw away stock the
 * brand wanted to sell.
 *
 * THE RULE (Mercenta's own operating rule — `src/config/purchaseOrders.ts` owns the wording;
 * the retail channel says nothing about who inside a vendor may press the button):
 *
 *   · THE BRAND AUTHORISED IT (`po.decisionAuthorisation.state === 'granted'`) → Mercenta
 *     may record ANY decision for that order, because the brand has said so, attributed and
 *     withdrawable.
 *   · THE CLOSING WINDOW — no authorisation, but the channel's limit is imminent (the
 *     declared `PO_ACK_ON_BEHALF_WINDOW_HOURS`) or already passed → Mercenta may record ONLY
 *     the ALL-REJECTED decision the channel requires. It can never accept, so it can never
 *     promise supply. This is what keeps Mercenta able to satisfy a written channel
 *     instruction when the brand is unreachable.
 *   · ANYTHING ELSE IS REFUSED, and the refusal is enforced in the WRITER
 *     (`src/data/api.ts → acknowledgePurchaseOrder`), not merely by hiding a button.
 *
 * PURE: it takes the record and the instant. No store, no clock, no network.
 */
import {
  PO_DECISION_AUTHORISATION_LABELS,
  PO_ON_BEHALF_AUTHORITY_RULE_TEXT,
} from '@/config/purchaseOrders';
import { poAcknowledgementWindow } from '@/lib/commerce/poAcknowledgementWindow';
import type { PoDecisionAuthorisationState, PurchaseOrder } from '@/types';

export interface PoOnBehalfAuthority {
  /** `granted` · `withdrawn`, or `none` when the record carries no authorisation at all. */
  state: PoDecisionAuthorisationState | 'none';
  /** TRUE only while the brand's authorisation is in force. */
  authorised: boolean;
  authorisedBy: string | null;
  authorisedAt: string | null;
  /** The brand's own words (or the instruction recorded for it). */
  note: string | null;
  /** TRUE when the channel's limit is imminent — the declared closing window. */
  closingWindow: boolean;
  /** TRUE past the channel's 24-hour limit, where only a rejection is valid. */
  pastLimit: boolean;
  /** What Mercenta may record for this brand right now. */
  permitted: 'any_decision' | 'rejection_only' | 'nothing';
  /** The instant the channel's limit falls, when the window is readable. */
  limitAt: string | null;
  /** The ONE statement of the position (the rule is quoted separately from its owner). */
  statement: string;
  /** The operator-readable label of the derived state (config-owned wording). */
  stateLabel: string;
  ruleText: string;
}

/** Derive the on-behalf authority for ONE purchase order at an INSTANT. Pure. */
export function poOnBehalfAuthority(
  po: PurchaseOrder,
  now: Date | string | number = new Date()
): PoOnBehalfAuthority {
  const record = po.decisionAuthorisation ?? null;
  const state: PoDecisionAuthorisationState | 'none' = record ? record.state : 'none';
  const authorised = state === 'granted';

  const window = poAcknowledgementWindow(po, now);
  const closingWindow = window.onBehalfAvailable;
  const pastLimit = window.channelState === 'new' && window.mustReject;

  const permitted: PoOnBehalfAuthority['permitted'] = authorised
    ? 'any_decision'
    : closingWindow || pastLimit
      ? 'rejection_only'
      : 'nothing';

  const limitOn = window.deadline?.slice(0, 10) ?? 'record';

  const statement = authorised
    ? `The brand has authorised Mercenta to decide this order${
        record
          ? ` (recorded by ${record.recordedBy} on ${record.grantedAt.slice(0, 10)}: “${record.note}”)`
          : ''
      }. Mercenta may record any decision for it.`
    : state === 'withdrawn'
      ? `The brand WITHDREW its authorisation for this order${
          record?.withdrawnAt ? ` on ${record.withdrawnAt.slice(0, 10)}` : ''
        }, so Mercenta may act only inside the closing window to record the rejection the channel requires.`
      : closingWindow || pastLimit
        ? `No authorisation is recorded for this order, and the retail channel's limit (${limitOn}) is imminent or has passed, so Mercenta may record ONLY the rejection the channel requires — never an acceptance.`
        : `No authorisation is recorded for this order and the retail channel's limit is not imminent (${limitOn}), so Mercenta may not decide this order for the brand. Ask the brand to decide, or to authorise Mercenta.`;

  return {
    state,
    authorised,
    authorisedBy: record?.recordedBy ?? null,
    authorisedAt: record?.grantedAt ?? null,
    note: record?.note ?? null,
    closingWindow,
    pastLimit,
    permitted,
    limitAt: window.deadline,
    statement,
    stateLabel:
      state === 'none' ? 'no authorisation on record' : PO_DECISION_AUTHORISATION_LABELS[state],
    ruleText: PO_ON_BEHALF_AUTHORITY_RULE_TEXT,
  };
}

/**
 * THE RULE, ENFORCED — the refusal for an ON-BEHALF submission that no authorisation or
 * closing-window rejection covers, or `null` when it is permitted.
 *
 * An ordinary BRAND SELF-ACTION (`actorStaffId` absent) is not this rule's business and is
 * never refused here. FAIL CLOSED: an unreadable window leaves `permitted` at `nothing`
 * (no authorisation, no closing window), so Mercenta cannot act on a record whose deadline
 * it cannot read.
 */
export function onBehalfDecisionRefusal(
  po: PurchaseOrder,
  allLinesRejected: boolean,
  actorStaffId: string | undefined,
  now: Date | string | number = new Date()
): string | null {
  if (!actorStaffId) return null;

  const authority = poOnBehalfAuthority(po, now);
  if (authority.permitted === 'any_decision') return null;
  if (authority.permitted === 'rejection_only' && allLinesRejected) return null;

  if (authority.permitted === 'rejection_only') {
    return (
      `PO ${po.poNumber}: Mercenta may act for this brand without an authorisation ONLY to submit the rejection ` +
      `the retail channel requires, and this submission is not that. ${PO_ON_BEHALF_AUTHORITY_RULE_TEXT}`
    );
  }
  return (
    `PO ${po.poNumber}: Mercenta has NO authorisation from the brand to decide this order, and the retail ` +
    `channel's limit (${authority.limitAt?.slice(0, 10) ?? 'unreadable'}) is not yet imminent. ` +
    `${PO_ON_BEHALF_AUTHORITY_RULE_TEXT}`
  );
}
