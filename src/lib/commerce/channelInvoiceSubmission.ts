/**
 * §P12 — THE ONE OWNER OF INVOICE SUBMISSION TO THE CHANNEL.
 *
 * Programme `docs/DASHBOARD_LOGISTICS_CLEANUP_PROGRAMME_2026-09-22.md` §4 P12;
 * register **`AV-040`**. §P7 built the channel's documented invoicing RULES
 * (`AV-022`) and said honestly that "no part of this is a live submission". This
 * owner is that submission: the invoice is handed to the channel's
 * accounts-payable system through the SP-API seam (mock-first) AS THE REGISTRY
 * ISSUED IT — never re-numbered, re-dated or re-priced here.
 *
 * FAIL-CLOSED GUARDS (checked BEFORE any channel call)
 * ---------------------------------------------------
 *   · only an ISSUED, IN-FORCE invoice is submitted — a cancelled invoice is never
 *     a receivable and is never sent (`AV-022`);
 *   · a zero/negative total is refused (the channel's own rule, `AV-022` R3);
 *   · the number must be the registry's own, non-empty number;
 *   · re-submitting the SAME invoice is idempotent — the recorded submission is
 *     returned rather than sent twice (the channel treats a reused number as an
 *     error, so a retry must not become a duplicate).
 *
 * HONEST LIMIT: the submission ledger is IN MEMORY in this environment, exactly
 * like the invoice ledger itself (the D4 persistence port holds no submission
 * table). Nothing here is claimed as durable, and the register's `S11` activation
 * precondition — parallel testing with the channel's accounts-payable team —
 * remains a business step, recorded in `PRODUCTION_READINESS.md`.
 */
import type { CommerceInvoice } from '@/types';
import type { InvoiceSubmissionResult } from '@/lib/spapi/client';

/** The seam shape this owner needs — the SP-API client satisfies it exactly. */
export interface ChannelInvoiceReader {
  submitInvoices(payload: {
    purchaseOrderNumber: string;
    invoiceNumber: string;
    invoiceDate: string;
    currency: string;
    total: number;
    lines: { vendorSku: string; quantity: number; unitPrice: number }[];
  }): Promise<InvoiceSubmissionResult>;
}

export interface ChannelInvoiceSubmissionRecord {
  /** The canonical invoice this submission belongs to. */
  invoiceId: string;
  invoiceNumber: string;
  poNumber: string;
  brandId: string;
  /** The channel's own acknowledgement reference. */
  submissionId?: string;
  status?: InvoiceSubmissionResult['status'];
  submittedAt: string;
  mode: 'mock' | 'real';
  simulated: boolean;
  /** TRUE when this invoice had ALREADY been submitted (idempotent retry). */
  alreadySubmitted?: boolean;
  /** A stated refusal — never a silent no-op. */
  refusal?: string;
}

export const CHANNEL_INVOICE_SUBMISSION_REFUSALS = {
  notIssued:
    'INVOICE_NOT_ISSUED — only an issued invoice is submitted to the channel; this one is not in force.',
  cancelled:
    'INVOICE_CANCELLED — a cancelled invoice is not a receivable and is never submitted (AV-022).',
  numberMissing:
    'INVOICE_NUMBER_MISSING — the invoice carries no registry number, so it cannot be submitted (AV-022).',
  zeroValue: 'INVOICE_ZERO_VALUE — a zero-value invoice fails the channel’s validation (AV-022).',
} as const;

/** The submission ledger — module-level, in memory, documented as such. */
const submissions = new Map<string, ChannelInvoiceSubmissionRecord>();

/** Read a recorded submission (no mutation) — used by the surfaces and the gate. */
export function channelInvoiceSubmission(invoiceId: string): ChannelInvoiceSubmissionRecord | null {
  return submissions.get(invoiceId) ?? null;
}

/** Every recorded submission, newest last (for the surfaces and the gate). */
export function channelInvoiceSubmissions(): ChannelInvoiceSubmissionRecord[] {
  return [...submissions.values()];
}

/** Reset the ledger (automated tests only). */
export function resetChannelInvoiceSubmissions(): void {
  submissions.clear();
}

/**
 * Submit ONE issued invoice to the channel through the seam.
 *
 * The invoice's own lines are sent as the channel's per-line payload
 * (`vendorSku`, quantity, unit price) — the SAME figures the platform issued, so
 * the channel receives what the brand and Mercenta already account for.
 */
export async function submitInvoiceToChannel(input: {
  reader: ChannelInvoiceReader;
  invoice: CommerceInvoice;
  /** The channel's own PO number (the canonical `poNumber` — decision 3). */
  poNumber: string;
  /** The invoice date as issued. */
  invoiceDate: string;
  /** The per-line SKU detail the registry's invoice carries. */
  lines?: readonly { vendorSku: string; quantity: number; unitPrice: number }[];
}): Promise<ChannelInvoiceSubmissionRecord> {
  const { invoice } = input;
  const base = {
    invoiceId: invoice.id,
    invoiceNumber: invoice.number,
    poNumber: input.poNumber,
    brandId: invoice.brandId,
    submittedAt: new Date().toISOString(),
    mode: invoice.mode === 'live' ? ('real' as const) : ('mock' as const),
    simulated: invoice.simulated,
  };

  /** Idempotent: an invoice already submitted is never sent a second time. */
  const already = submissions.get(invoice.id);
  if (already) return { ...already, alreadySubmitted: true };

  const refusal = (refusalReason: string): ChannelInvoiceSubmissionRecord =>
    ({ ...base, refusal: refusalReason }) as ChannelInvoiceSubmissionRecord;

  if (invoice.status === 'cancelled') return refusal(CHANNEL_INVOICE_SUBMISSION_REFUSALS.cancelled);
  if (invoice.status !== 'issued' && invoice.status !== 'paid') {
    return refusal(CHANNEL_INVOICE_SUBMISSION_REFUSALS.notIssued);
  }
  if (!invoice.number?.trim()) return refusal(CHANNEL_INVOICE_SUBMISSION_REFUSALS.numberMissing);
  if (!(invoice.subtotalGbp > 0)) return refusal(CHANNEL_INVOICE_SUBMISSION_REFUSALS.zeroValue);

  const response = await input.reader.submitInvoices({
    purchaseOrderNumber: input.poNumber,
    invoiceNumber: invoice.number,
    invoiceDate: input.invoiceDate,
    currency: invoice.currency,
    total: invoice.subtotalGbp,
    lines: (input.lines ?? []).map((line) => ({ ...line })),
  });

  if (!response.ok) {
    return refusal(response.error ?? 'INVOICE_SUBMISSION_REFUSED');
  }

  const record: ChannelInvoiceSubmissionRecord = {
    ...base,
    ...(response.submissionId ? { submissionId: response.submissionId } : {}),
    ...(response.status ? { status: response.status } : {}),
    /** The seam's OWN claim, recorded verbatim — never inferred from configuration. */
    mode: response.simulated ? 'mock' : 'real',
    simulated: !!response.simulated,
  };
  submissions.set(invoice.id, record);
  return record;
}