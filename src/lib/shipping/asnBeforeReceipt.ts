/**
 * §BATCH 2l (`AV-015`) — THE ONE OWNER of the ASN-BEFORE-RECEIPT ordering rule.
 *
 * WHY THIS MODULE EXISTS (the defect it closes)
 * --------------------------------------------
 * The Phase 0A audit registered `AV-015`: the channel documents that *"Amazon must
 * receive the shipment confirmation prior to the product being received at the Amazon
 * fulfillment center. Missing or delayed shipment confirmations result in
 * chargebacks."* The platform recorded that evidence but ENFORCED the ordering nowhere
 * and SURFACED it nowhere — a consignment could be received with no confirmation on
 * file and nothing said so. That is the documented chargeback trigger, invisible.
 *
 * This owner makes the trigger visible. It compares TWO recorded instants:
 *   · WHEN Mercenta filed the ASN (`ChannelInstructionOutcome.asn.filedAt`), against
 *   · WHEN the channel's OWN receiving read logged the receipt (`getPurchaseOrdersStatus`
 *     → `receivedDate`, source `S5` / register `AV-018` — the SAME read the receiving
 *     sync already performs; no second channel call, no new channel vocabulary).
 *
 * FAIL CLOSED, ALWAYS: a channel state that could not be read, or a receipt logged
 * without a readable instant, yields `unknown` — an unread state is NEVER reported as
 * `compliant`. `compliant` is claimed only when the confirmation was on file no later
 * than the receipt.
 *
 * PURITY / DETERMINISM: pure — no clock, no randomness, no network, no store access.
 * Every instant is the channel's or the platform's OWN recorded value.
 */
import {
  ASN_BEFORE_RECEIPT_RULE_TEXT,
  ASN_BEFORE_RECEIPT_STATE_LABELS,
} from '@/config/shipping';
import type { AsnBeforeReceiptState, ReceivingStatus } from '@/types';

export interface AsnBeforeReceiptVerdict {
  /** The ONE verdict (see `ASN_BEFORE_RECEIPT_STATES` in `@/types`). */
  state: AsnBeforeReceiptState;
  /** TRUE only when the confirmation was on file no later than the receipt. */
  compliant: boolean;
  /** TRUE only for `exposed` — the documented chargeback trigger. */
  exposed: boolean;
  /** When Mercenta filed the ASN (ISO), when recorded. */
  asnFiledAt: string | null;
  /** When the channel logged the receipt (ISO), when recorded. */
  receivedAt: string | null;
  /** The channel's documented rule, quoted from its config owner. */
  ruleText: string;
  /** The operator-readable label of the state (declared once, in the config owner). */
  stateLabel: string;
  /** The ONE operator-facing statement of the verdict. ALWAYS present. */
  statement: string;
}

function parseInstant(value: string | null | undefined): number | null {
  if (value === null || value === undefined || value === '') return null;
  const ms = Date.parse(value);
  return Number.isFinite(ms) ? ms : null;
}

function day(iso: string): string {
  return iso.slice(0, 10);
}

/**
 * TRUE when the channel's own receiving state means the goods ARRIVED at its FC. A
 * PARTIAL receipt still means goods arrived, so it counts; `not_received` does not.
 */
export function channelReceivingReportsReceived(status: ReceivingStatus): boolean {
  return status === 'received' || status === 'partially_received';
}

export function asnBeforeReceiptVerdict(input: {
  /** When Mercenta filed the ASN, when it did. */
  asnFiledAt: string | null | undefined;
  /**
   * TRUE when the channel's own receiving state reports the goods received; FALSE when
   * it reports not received; NULL when it could not be read at all (fail closed).
   */
  channelReportsReceived: boolean | null;
  /** The channel's own logged receipt instant, when the channel reports a receipt. */
  receivedAt: string | null | undefined;
}): AsnBeforeReceiptVerdict {
  const ruleText = ASN_BEFORE_RECEIPT_RULE_TEXT;
  const asnMs = parseInstant(input.asnFiledAt ?? null);
  const asnFiledAt = asnMs !== null ? new Date(asnMs).toISOString() : null;
  const receivedMs = parseInstant(input.receivedAt ?? null);
  const receivedAt = receivedMs !== null ? new Date(receivedMs).toISOString() : null;

  const base = { ruleText, asnFiledAt, receivedAt };
  const build = (
    state: AsnBeforeReceiptState,
    statement: string
  ): AsnBeforeReceiptVerdict => ({
    state,
    compliant: state === 'compliant',
    exposed: state === 'exposed',
    stateLabel: ASN_BEFORE_RECEIPT_STATE_LABELS[state],
    ...base,
    statement,
  });

  /* 1. The channel's receiving state could not be read — fail closed. */
  if (input.channelReportsReceived === null) {
    return build(
      'unknown',
      'The channel’s receiving state could not be read, so whether the confirmation preceded the receipt cannot ' +
        `be judged (an unread state is never reported as compliant). ${ruleText}`
    );
  }

  /* 2. Not received yet — the ordering rule is not due. */
  if (input.channelReportsReceived === false) {
    return build(
      'pending',
      asnFiledAt
        ? `The channel has not logged a receipt yet and a confirmation was filed on ${day(asnFiledAt)} — the ` +
            `confirmation is on file before any receipt. ${ruleText}`
        : 'The channel has not logged a receipt yet, but NO confirmation is on file for this purchase order — it ' +
            `must reach the channel BEFORE the goods do. ${ruleText}`
    );
  }

  /* 3. Received — but with no readable receipt instant: fail closed. */
  if (receivedMs === null) {
    return build(
      'unknown',
      'The channel reports the goods received but logged no readable receipt instant, so the confirmation’s ' +
        `ordering cannot be judged. ${ruleText}`
    );
  }

  /* 4. Received with NO confirmation on file — the documented chargeback trigger. */
  if (input.asnFiledAt === null || input.asnFiledAt === undefined || String(input.asnFiledAt) === '') {
    return build(
      'exposed',
      `The goods were received on ${day(new Date(receivedMs).toISOString())} with NO confirmation on file for ` +
        `this purchase order — the documented chargeback trigger. ${ruleText}`
    );
  }

  /* 5. A filing is recorded but its instant cannot be read — fail closed. */
  if (asnMs === null) {
    return build(
      'unknown',
      'The goods were received and a confirmation filing is recorded, but its instant cannot be read, so the ' +
        `ordering cannot be judged. ${ruleText}`
    );
  }

  /* 6. Received AND the confirmation was on file no later than the receipt — compliant. */
  if (asnMs <= receivedMs) {
    return build(
      'compliant',
      `The confirmation was on file before the channel logged the receipt (filed ${day(
        new Date(asnMs).toISOString()
      )}, received ${day(new Date(receivedMs).toISOString())}), so the documented ordering rule was met.`
    );
  }

  /* 7. Received, but the confirmation was filed AFTERWARDS — the chargeback trigger. */
  return build(
    'exposed',
    `The goods were received on ${day(new Date(receivedMs).toISOString())} but the confirmation was filed ` +
      `AFTERWARDS (${day(new Date(asnMs).toISOString())}) — the documented chargeback trigger. ${ruleText}`
  );
}
