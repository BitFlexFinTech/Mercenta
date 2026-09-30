/**
 * §BATCH 2d (`AV-008` / `AV-023`) — THE ONE OWNER of the ACKNOWLEDGEMENT ↔ INVOICE
 * unit-price match rule.
 *
 * Documented channel rules implemented here — neither invented (source S2 of the
 * Phase 0A audit; register `docs/AMAZON_VENDOR_DISCREPANCY_REGISTER_2026-09-20.md`
 * rows `AV-008` and `AV-023`):
 *
 *   R1  the cost price in the acknowledgement MUST MATCH the invoiced unit cost —
 *       "The cost price in the acknowledgement must match the invoiced unit cost
 *       price" (`AV-008`);
 *   R2  the acknowledged price can NEVER be HIGHER than the price submitted on the
 *       purchase order — "The price cannot be higher than the price submitted in
 *       the purchase order" (`AV-008`);
 *   R3  the channel compares the two prices and MAY DELAY PAYMENT when they differ —
 *       "…payment systems compares the two and might delay payment if they do not
 *       match" (`AV-023`). The platform therefore BILLS what was acknowledged and
 *       WARNS about any divergence from the order price.
 *
 * WHY THIS MODULE EXISTS (the defect it replaces, fixed at source):
 * before Batch 2d the acknowledgement warned "Invoicing should use the acknowledged
 * price" while the invoice writer (`commerceLifecycle.issueCommerceInvoice`) and the
 * channel submission (`api.submitCommerceInvoiceToChannel`) both billed the ORDER's
 * price — so the platform itself created a divergence the channel penalises. The two
 * writers and the acknowledgement boundary now read THIS module, and the warning is
 * derived here rather than re-typed inline. No component re-implements it.
 *
 * PURE: every function takes the records it needs. No store access, no clock.
 */
import type { PurchaseOrder, PurchaseOrderLineItem } from '@/types';

/** R1/R3 — the channel's documented match rule, in its own words, attributed to it. */
export const ACK_INVOICE_PRICE_RULE_TEXT =
  'The retail channel documented that the cost price in the acknowledgement must match the invoiced unit ' +
  'cost, and that its payment systems compare the two and may delay payment when they do not match ' +
  '(register AV-008 / AV-023).';

/** R2 — the channel's documented ceiling, in its own words, attributed to it. */
export const PO_ACK_PRICE_CEILING_RULE_TEXT =
  'The retail channel documented that the acknowledged cost price cannot be higher than the price submitted ' +
  'in the purchase order (register AV-008).';

/** The ONE title the surfaces render for a divergence (never re-typed). */
export const ACK_PRICE_DISCREPANCY_TITLE = 'Acknowledged price differs from the order price';

/** The smallest difference treated as a real divergence (one thousandth of a pound). */
export const PRICE_MATCH_EPSILON = 0.001;

/** The minimum a line must expose for this module to resolve its acknowledged price. */
export interface AckPricedLine {
  unitPrice: number;
  acknowledgedUnitPrice?: number;
}

/**
 * THE ONE derivation of the price the acknowledgement recorded — and therefore the
 * price the invoice and the channel submission MUST use (R1: they have to match).
 *
 * A line with no recorded acknowledgement price falls back to the order price, which
 * is exactly what the brand acknowledged when it submitted no price of its own.
 */
export function acknowledgedUnitPriceFor(line: AckPricedLine): number {
  return line.acknowledgedUnitPrice ?? line.unitPrice;
}

export interface AckPriceDivergence {
  sku: string;
  /** The price on the purchase order (what the channel issued). */
  poUnitPrice: number;
  /** The price the acknowledgement recorded (what the channel is invoiced at). */
  acknowledgedUnitPrice: number;
  /** acknowledged − order, rounded to 2dp (negative when the brand acknowledged lower). */
  delta: number;
}

/**
 * The divergence between the ORDER's price and the ACKNOWLEDGED price, or `null`
 * when the line has no recorded acknowledgement price or the two agree. A difference
 * that rounds away to a thousandth of a pound is not a divergence.
 */
export function ackPriceDivergence(line: PurchaseOrderLineItem): AckPriceDivergence | null {
  if (line.acknowledgedUnitPrice === undefined) return null;
  const delta = Math.round((line.acknowledgedUnitPrice - line.unitPrice) * 100) / 100;
  if (Math.abs(delta) < PRICE_MATCH_EPSILON) return null;
  return {
    sku: line.sku,
    poUnitPrice: line.unitPrice,
    acknowledgedUnitPrice: line.acknowledgedUnitPrice,
    delta,
  };
}

/** Every line whose acknowledged price diverges from the order price, in line order. */
export function ackPriceDivergences(po: Pick<PurchaseOrder, 'lineItems'>): AckPriceDivergence[] {
  return po.lineItems
    .map(ackPriceDivergence)
    .filter((d): d is AckPriceDivergence => d !== null);
}

/**
 * The operator-readable WARNING for ONE divergent line, stated with the channel's own
 * rule (R1/R3) so an operator is told the real obligation, never a Mercenta invention.
 */
export function ackPriceDivergenceWarning(d: AckPriceDivergence): string {
  return (
    `Line ${d.sku}: the acknowledged unit price (£${d.acknowledgedUnitPrice.toFixed(2)}) differs from the order ` +
    `unit price (£${d.poUnitPrice.toFixed(2)}). The invoice bills the acknowledged price. ` +
    ACK_INVOICE_PRICE_RULE_TEXT
  );
}

/**
 * A line of an acknowledgement submission, as far as the price ceiling needs it.
 * `src/data/api.ts → PoLineAckSubmission` structurally satisfies this, so this module
 * stays free of any dependency on the domain boundary (which imports THIS module).
 */
export interface AckPriceCeilingSubmissionLine {
  sku: string;
  ackStatus?: string;
  unitPrice?: number;
}

/**
 * THE ACKNOWLEDGEMENT CEILING, ENFORCED (R2 — `AV-008`).
 *
 * Returns the refusal for the FIRST line that acknowledges a price HIGHER than the
 * order's own, or `null` when no line breaches it. A rejected line carries no price
 * obligation and is skipped. FAIL CLOSED: a non-finite submitted price is refused
 * rather than silently accepted — an unreadable price is never treated as valid.
 */
export function ackPriceCeilingRefusal(
  po: Pick<PurchaseOrder, 'lineItems'>,
  submission: readonly AckPriceCeilingSubmissionLine[]
): string | null {
  for (const line of po.lineItems) {
    const ack = submission.find((a) => a.sku === line.sku);
    if (!ack || ack.unitPrice === undefined || ack.ackStatus === 'rejected') continue;
    if (!Number.isFinite(ack.unitPrice)) {
      return (
        `Line ${line.sku}: the acknowledged unit price is not a number, so it cannot be checked against the ` +
        `order price. The acknowledgement is refused (fail-closed).`
      );
    }
    if (ack.unitPrice - line.unitPrice > PRICE_MATCH_EPSILON) {
      return (
        `Line ${line.sku}: the acknowledged unit price (£${ack.unitPrice.toFixed(2)}) cannot be higher than the ` +
        `order unit price (£${line.unitPrice.toFixed(2)}). ${PO_ACK_PRICE_CEILING_RULE_TEXT}`
      );
    }
  }
  return null;
}
