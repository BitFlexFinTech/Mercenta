/**
 * §P7 — THE ONE OWNER of a retail-channel invoice's PAYMENT TERMS and of every
 * timing figure derived from them.
 *
 * Business basis (none of it invented):
 *  - Mercenta's programme decision 2 fixes the terms Mercenta offers at
 *    **14 / 30 / 60 days**, chosen **PER INVOICE** — there is no global term.
 *  - Register **S14**: *"There is no public Vendor Payments, Deductions,
 *    Chargebacks or Vendor-Performance API."* A payment date can therefore only
 *    ever be **DERIVED** from the invoice's own date plus its terms, and it must
 *    be LABELLED as derived wherever it is shown.
 *
 * Everything that needs "is this invoice outstanding?", "is it overdue?" or "what
 * is receivable in the next 30 days?" reads THIS module. Before P7 those figures
 * were re-derived independently in the admin Overview, the founder control
 * centre, the automation registry, the founder AI context and the work layer —
 * five copies that could silently disagree. They now share one implementation.
 *
 * Pure: every function takes the records it needs. No store access, no clock.
 */
import type { CommerceInvoice, CommercePayment, InvoiceTermDays } from '@/types';
import { INVOICE_TERM_CHOICES } from '@/types';
import { addDays } from '@/lib/dates';

/** The terms Mercenta offers on a retail-channel invoice (programme decision 2). */
export { INVOICE_TERM_CHOICES };
export type { InvoiceTermDays };

/**
 * §P7 — the DECLARED default terms.
 *
 * REPOINTED (not re-declared): this value used to live in
 * `src/lib/work/workStore.ts` as `INVOICE_TERM_DAYS`. The work layer now
 * re-exports it from here, so its public surface is unchanged while the
 * DECLARATION has exactly one home.
 */
export const INVOICE_TERM_DAYS: InvoiceTermDays = 30;

/** The honest basis line every derived payment figure must be able to state. */
export const PAYMENT_DERIVATION_BASIS =
  'derived from the invoice date plus the terms on that invoice — no Vendor Payments API exists (register S14)';

/** How far ahead "upcoming payments" looks (declared, not a UI accident). */
export const UPCOMING_PAYMENTS_HORIZON_DAYS = 30;

/**
 * An unknown/undeclared term is REFUSED, never coerced. `14 | 30 | 60` are the
 * only terms the platform may put on an invoice.
 */
export function isInvoiceTermDays(value: unknown): value is InvoiceTermDays {
  return (INVOICE_TERM_CHOICES as readonly number[]).includes(value as number);
}

/**
 * The terms an invoice actually carries: its OWN, or the declared default for a
 * legacy row written before the choice existed. Never guessed per caller.
 */
export function invoiceTermDays(
  invoice: Pick<CommerceInvoice, 'termDays'>
): InvoiceTermDays {
  return isInvoiceTermDays(invoice.termDays) ? invoice.termDays : INVOICE_TERM_DAYS;
}

/**
 * The DERIVED due date: the invoice's own issue date plus ITS OWN terms. Never
 * the invoice date plus a global constant.
 */
export function invoiceDueDate(
  invoice: Pick<CommerceInvoice, 'issuedAt' | 'termDays'>
): string {
  return addDays(invoice.issuedAt.slice(0, 10), invoiceTermDays(invoice));
}

/** Days from `today` until the invoice falls due (negative ⇒ overdue). */
export function invoiceDaysUntilDue(
  invoice: Pick<CommerceInvoice, 'issuedAt' | 'termDays'>,
  today: string
): number {
  return Math.round(
    (new Date(invoiceDueDate(invoice)).getTime() - new Date(today).getTime()) / 86_400_000
  );
}

/** A settled payment exists for the invoice (settlement is the payment record). */
export function invoiceHasSettledPayment(
  invoice: Pick<CommerceInvoice, 'id' | 'status'>,
  payments: readonly Pick<CommercePayment, 'invoiceId'>[]
): boolean {
  return invoice.status === 'paid' || payments.some((p) => p.invoiceId === invoice.id);
}

/**
 * §P7 / programme decision 2 — **RECEIVABLES = issued-and-unpaid.**
 *
 * An invoice is a receivable when it is ISSUED (not cancelled, not settled) and
 * has no settled payment. A cancelled invoice is never receivable — its place is
 * taken by its replacement under a new number (`AV-022`).
 */
export function invoiceIsOutstanding(
  invoice: Pick<CommerceInvoice, 'id' | 'status'>,
  payments: readonly Pick<CommercePayment, 'invoiceId'>[]
): boolean {
  if (invoice.status !== 'issued') return false;
  return !payments.some((p) => p.invoiceId === invoice.id);
}

/** Whether the invoice's DERIVED due date has already passed. */
export function invoiceIsOverdue(
  invoice: Pick<CommerceInvoice, 'id' | 'status' | 'issuedAt' | 'termDays'>,
  payments: readonly Pick<CommercePayment, 'invoiceId'>[],
  today: string
): boolean {
  return invoiceIsOutstanding(invoice, payments) && invoiceDueDate(invoice) < today;
}

/** Whether the invoice falls due within the declared upcoming-payments horizon. */
export function invoiceIsUpcoming(
  invoice: Pick<CommerceInvoice, 'id' | 'status' | 'issuedAt' | 'termDays'>,
  payments: readonly Pick<CommercePayment, 'invoiceId'>[],
  today: string,
  horizonDays: number = UPCOMING_PAYMENTS_HORIZON_DAYS
): boolean {
  if (!invoiceIsOutstanding(invoice, payments)) return false;
  return invoiceDueDate(invoice) <= addDays(today, horizonDays);
}

export interface InvoiceLedgerSummary {
  /** Every issued-and-unpaid invoice (receivables), in ledger order. */
  outstanding: CommerceInvoice[];
  receivablesGbp: number;
  /** The subset already past its derived due date. */
  overdue: CommerceInvoice[];
  overdueGbp: number;
  /** The subset falling due within the horizon. */
  upcoming: CommerceInvoice[];
  upcomingGbp: number;
}

/**
 * THE receivables / overdue / upcoming-payments arithmetic. Callers pass the
 * canonical ledger; they never re-implement the filter or the rounding.
 */
export function summariseInvoiceLedger(
  invoices: readonly CommerceInvoice[],
  payments: readonly CommercePayment[],
  today: string,
  horizonDays: number = UPCOMING_PAYMENTS_HORIZON_DAYS
): InvoiceLedgerSummary {
  const round2 = (n: number) => Math.round(n * 100) / 100;
  const outstanding = invoices.filter((i) => invoiceIsOutstanding(i, payments));
  const overdue = outstanding.filter((i) => invoiceDueDate(i) < today);
  const upcoming = outstanding.filter(
    (i) => invoiceDueDate(i) <= addDays(today, horizonDays)
  );
  const sum = (rows: CommerceInvoice[]) => round2(rows.reduce((s, i) => s + i.subtotalGbp, 0));
  return {
    outstanding,
    receivablesGbp: sum(outstanding),
    overdue,
    overdueGbp: sum(overdue),
    upcoming,
    upcomingGbp: sum(upcoming),
  };
}
