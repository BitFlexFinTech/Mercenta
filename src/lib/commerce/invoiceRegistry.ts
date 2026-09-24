/**
 * §P7 — THE ONE OWNER of retail-channel INVOICE NUMBERS.
 *
 * Documented channel rules implemented here — none of them invented (source
 * `S11`, register **`AV-022`**):
 *
 *   R2  an invoice number must be **unique and NEVER reused**;
 *   R3  a **zero-value** invoice FAILS;
 *   R4  a wrong invoice is **CANCELLED** by the channel and must be re-sent under
 *       a **NEW Invoice ID** — so the number of a voided invoice is consumed for
 *       ever and can never be allocated again.
 *
 * DETERMINISTIC: a number is derived from the PO number plus the allocation
 * ordinal recorded in the canonical ledger (`demoInvoiceNumberRegistry`), never
 * from a clock and never from a random source. The same ledger therefore always
 * produces the same numbers, a reprint is byte-identical, and two POs can never
 * collide (a PO number is unique per PO).
 *
 * PURE: the ledger is passed in and returned; this module never touches a store.
 * That is what lets the validator execute the REAL allocation arithmetic.
 */
import type { CommerceInvoice, InvoiceNumberAllocation } from '@/types';

/** The unmistakably-simulated prefix (never a plausible-looking live number). */
export const INVOICE_NUMBER_PREFIX = 'SIM-INV';

/** The `AV-022` rules, as text, for the surfaces and the docs to state. */
export const INVOICE_NUMBER_RULES = [
  'Invoice numbers are unique and are never reused (AV-022).',
  'A zero-value invoice fails validation and is never issued (AV-022).',
  'A wrong invoice is cancelled and re-sent under a NEW Invoice ID — its old number stays consumed for ever (AV-022).',
  'Issuing invoices through the channel API requires parallel testing with the channel’s accounts-payable team before payments process (register S11) — an activation precondition, not a code change.',
] as const;

/**
 * The deterministic number for one allocation ordinal on one PO.
 * Ordinal 1 → `SIM-INV-<poNumber>` (the shape the platform has always used);
 * a re-issue after a cancellation → `SIM-INV-<poNumber>-R<n>`.
 */
export function invoiceNumberForOrdinal(poNumber: string, ordinal: number): string {
  if (ordinal <= 1) return `${INVOICE_NUMBER_PREFIX}-${poNumber}`;
  return `${INVOICE_NUMBER_PREFIX}-${poNumber}-R${ordinal}`;
}

/** How many allocations a PO has ever consumed (voided ones included). */
export function allocationCountForPo(
  ledger: readonly InvoiceNumberAllocation[],
  purchaseOrderId: string
): number {
  return ledger.filter((a) => a.purchaseOrderId === purchaseOrderId).length;
}

/**
 * The NEXT never-used number for a PO. Does not write: the caller records the
 * allocation (`recordInvoiceNumberAllocation`) in the SAME step that records the
 * invoice, so a number cannot be handed out without an invoice consuming it.
 */
export function nextInvoiceNumber(
  ledger: readonly InvoiceNumberAllocation[],
  po: { id: string; poNumber: string }
): { number: string; ordinal: number } {
  const ordinal = allocationCountForPo(ledger, po.id) + 1;
  return { number: invoiceNumberForOrdinal(po.poNumber, ordinal), ordinal };
}

/** The allocation that consumed a number, if any (voided allocations included). */
export function allocationForNumber(
  ledger: readonly InvoiceNumberAllocation[],
  number: string
): InvoiceNumberAllocation | undefined {
  return ledger.find((a) => a.number === number);
}

/** TRUE when the number has already been consumed — it may never be reused. */
export function invoiceNumberIsConsumed(
  ledger: readonly InvoiceNumberAllocation[],
  number: string
): boolean {
  return allocationForNumber(ledger, number) !== undefined;
}

/** The deterministic invoice ID for an allocation ordinal on a PO. */
export function invoiceIdForOrdinal(
  brandId: string,
  poNumber: string,
  ordinal: number
): string {
  const base = `cinv-${brandId}-${poNumber}`;
  return ordinal <= 1 ? base : `${base}-r${ordinal}`;
}

/* ── The AV-022 validation rules ───────────────────────────────────────────── */

/** R3 — a zero-value (or negative) invoice FAILS. Never rounded away. */
export function invoiceAmountIsValid(subtotalGbp: number): boolean {
  return Number.isFinite(subtotalGbp) && Math.round(subtotalGbp * 100) > 0;
}

/** An invoice that may carry a payment: issued, not cancelled, not already paid. */
export function invoiceCannotBeCancelled(
  invoice: Pick<CommerceInvoice, 'status'>
): boolean {
  return invoice.status !== 'issued';
}
