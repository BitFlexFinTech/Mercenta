/**
 * §S9 — THE ONE OWNER OF THE RECEIPT → INVOICE AUTOMATION.
 *
 * Programme `docs/SPRINT_PO_ACKNOWLEDGEMENT_2026-09-24.md` §S9 (stage row
 * "RECEIPT → INVOICE automation").
 *
 * WHAT THIS OWNS. Until S9 the receipt and the invoice were TWO human actions
 * with nothing between them: `commerceLifecycle.receiveCommercePurchaseOrder`
 * logged the receipt (deriving the receiving status and auto-raising the
 * shortage deductions) and `issueCommerceInvoice` raised the invoice only when
 * somebody pressed a button. This module owns the missing LINK — the decision
 * that the invoice is raised AUTOMATICALLY at the moment the receipt is logged,
 * the terms it carries, and the refusals that stop it.
 *
 * THE AUTOMATION IS MERCENTA'S OWN PROCESS, LABELLED AS MERCENTA'S. The channel
 * documents its invoice rules (`AV-022`) and documents invoicing a SHIPPED order;
 * invoicing AFTER RECEIPT is Mercenta's own, stricter rule (`AV-018`). The
 * automation of that rule is therefore a Mercenta operating decision and is never
 * presented as a channel requirement — `RECEIPT_INVOICE_AUTOMATION_STATEMENT`
 * says so in the words every surface renders.
 *
 * PURE + INJECTED WRITER (the `channelReceivingSync.ts` shape). The DECISION is
 * pure — no store, no clock, no randomness, no network — so the validator
 * executes the real arithmetic. The WRITE path takes the canonical invoice writer
 * INJECTED, so this module never becomes a second way to raise an invoice: the
 * ONE write path stays `commerceLifecycle.issueCommerceInvoice`, with every
 * `AV-022` rule, the registry number and the canonical trail unchanged.
 *
 * FAIL CLOSED, NEVER SILENT
 * -------------------------
 *   · terms that are not one of the declared `14 | 30 | 60` ⇒ REFUSED, never
 *     coerced (`invoiceTerms.isInvoiceTermDays`);
 *   · an ACTIVE invoice already on the PO ⇒ `skipped` — a second invoice is never
 *     raised and the terms already chosen are never overwritten (`AV-022`'s
 *     correction path is cancel + a NEW Invoice ID);
 *   · a PO that is not DELIVERED ⇒ REFUSED (an invoice requires a delivered PO);
 *   · anything the canonical writer refuses (a zero-value invoice, the receipt
 *     gate) is passed through UNCHANGED as a refusal — never swallowed, never
 *     retried around.
 * A refusal leaves the RECEIPT standing (the goods genuinely arrived) and is
 * recorded on the canonical activity trail, because a silent no-op would hide a
 * broken money chain.
 *
 * ATTRIBUTION. The automatic invoice is raised by Mercenta's DECLARED automatic
 * identity (`RECEIPT_INVOICE_AUTOMATION_ACTOR_ID`) with the human whose receipt
 * triggered it NAMED on the record — the S2/S5 precedent
 * (`PO_ACK_SYSTEM_ACTOR_ID`). The trigger's own authorisation is what authorises
 * the act: the receipt writer has already enforced RBAC and tenant isolation
 * before this module is reached.
 */
import type { CommerceInvoice, InvoiceTermDays, PurchaseOrder } from '@/types';
import { INVOICE_TERM_CHOICES, INVOICE_TERM_DAYS, isInvoiceTermDays } from './invoiceTerms';

/**
 * The declared identity every AUTOMATIC receipt → invoice action is attributed
 * to. Declared ONCE, here, so the writer, the audit trail and the surfaces can
 * never disagree about who acted.
 */
export const RECEIPT_INVOICE_AUTOMATION_ACTOR_ID = 'mercenta-system:receipt-invoice';

/** The outcome codes, declared once (surfaces, gates and the trail use these). */
export const RECEIPT_INVOICE_AUTOMATION_CODES = {
  /** The happy path: the invoice was raised by the receipt. */
  issued: 'issue_on_receipt',
  /** An active invoice already exists — nothing to do, and nothing overwritten. */
  alreadyInvoiced: 'already_invoiced',
  /** The PO is not delivered, so an invoice is not permitted yet. */
  notDelivered: 'not_delivered',
  /** The stated terms are not one of the declared choices. */
  undeclaredTerms: 'undeclared_terms',
  /** The canonical invoice writer refused (zero-value, the receipt gate, …). */
  writerRefused: 'writer_refused',
} as const;

export type ReceiptInvoiceAutomationCode =
  (typeof RECEIPT_INVOICE_AUTOMATION_CODES)[keyof typeof RECEIPT_INVOICE_AUTOMATION_CODES];

export type ReceiptInvoiceAutomationAction = 'issued' | 'skipped' | 'refused';

/**
 * THE statement the surfaces render — the automation stated as MERCENTA'S OWN
 * process, with the terms basis derived from their owner. Never re-typed in a
 * component (a second rendering of one rule is how a rule drifts).
 */
export const RECEIPT_INVOICE_AUTOMATION_STATEMENT = {
  headline:
    'The channel invoice is raised automatically the moment the receipt is logged.',
  mercentaProcess:
    `Invoicing at receipt is Mercenta's own operating process — stricter than invoicing a shipped order — and not a ` +
    `channel rule. The channel's own invoice rules are unchanged (register AV-022).`,
  terms:
    `The invoice carries the terms chosen at the receipt (${INVOICE_TERM_CHOICES.join('/')} days); ` +
    `${INVOICE_TERM_DAYS} days is the declared default when the receipt states no choice.`,
  correction:
    'A wrong invoice is cancelled and re-issued under a NEW Invoice ID — a number is never reused (AV-022).',
  simulation:
    'The invoice is simulated and labelled: no accounting provider is contacted.',
  text:
    `The channel invoice is raised automatically the moment the receipt is logged. Invoicing at receipt is ` +
    `Mercenta's own operating process — stricter than invoicing a shipped order — and not a channel rule. The ` +
    `invoice carries the terms chosen at the receipt (${INVOICE_TERM_CHOICES.join('/')} days); ${INVOICE_TERM_DAYS} ` +
    `days is the declared default when the receipt states no choice.`,
} as const;


/* ── The DECISION (pure) ───────────────────────────────────────────────────── */

export interface ReceiptInvoiceAutomationInput {
  /** The PO as the receipt left it. */
  po: Pick<PurchaseOrder, 'status'>;
  /** The invoice currently in force on the PO, if any. */
  existingInvoice?: Pick<CommerceInvoice, 'id' | 'number' | 'status'> | undefined;
  /** The terms the TRIGGER stated, if any (an undeclared value is refused). */
  termDays?: unknown;
}

export interface ReceiptInvoiceAutomationDecision {
  action: 'issue' | 'skip' | 'refuse';
  code: ReceiptInvoiceAutomationCode;
  /** The stated reason — never a silent no-op. */
  reason: string;
  /** The terms the automatic invoice would carry (resolved, never guessed). */
  termDays: InvoiceTermDays;
}

/**
 * Whether the invoice should be raised now, and with which terms.
 *
 * The TERMS are validated FIRST — a validation pass runs before the state is
 * judged (the S2 precedent), so an undeclared choice is never silently ignored
 * merely because the PO happened to be already invoiced.
 */
export function receiptInvoiceAutomationDecision(
  input: ReceiptInvoiceAutomationInput
): ReceiptInvoiceAutomationDecision {
  const stated = input.termDays;
  if (stated !== undefined && !isInvoiceTermDays(stated)) {
    return {
      action: 'refuse',
      code: RECEIPT_INVOICE_AUTOMATION_CODES.undeclaredTerms,
      termDays: INVOICE_TERM_DAYS,
      reason:
        `RECEIPT_INVOICE_TERM_RULE — "${String(stated)}" is not a declared term; Mercenta offers ` +
        `${INVOICE_TERM_CHOICES.join('/')} days on an invoice (programme decision 2), so no invoice was raised ` +
        `automatically.`,
    };
  }
  const termDays: InvoiceTermDays = stated === undefined ? INVOICE_TERM_DAYS : stated;

  if (input.existingInvoice && input.existingInvoice.status !== 'cancelled') {
    return {
      action: 'skip',
      code: RECEIPT_INVOICE_AUTOMATION_CODES.alreadyInvoiced,
      termDays,
      reason:
        `invoice ${input.existingInvoice.number} is already in force on this purchase order, so no second invoice ` +
        `was raised and its terms were not overwritten (AV-022: a correction is a cancellation and a NEW Invoice ID).`,
    };
  }

  if (input.po.status !== 'delivered') {
    return {
      action: 'refuse',
      code: RECEIPT_INVOICE_AUTOMATION_CODES.notDelivered,
      termDays,
      reason:
        `RECEIPT_INVOICE_ILLEGAL_STATE — an invoice requires a DELIVERED purchase order (currently ` +
        `"${input.po.status}"), so no invoice was raised automatically.`,
    };
  }

  return {
    action: 'issue',
    code: RECEIPT_INVOICE_AUTOMATION_CODES.issued,
    termDays,
    reason:
      `raised automatically on receipt with ${termDays}-day terms` +
      (stated === undefined ? ' (the declared default — the receipt stated no choice)' : ''),
  };
}

/* ── The WRITE path (canonical writer injected) ────────────────────────────── */

export interface ReceiptInvoiceWriter {
  /**
   * The canonical invoice write, wired to
   * `commerceLifecycle.issueCommerceInvoice` at the app seam. Injected rather
   * than imported so this owner stays executable in isolation — and so the ONE
   * way an invoice is raised is never duplicated here.
   */
  issue(input: {
    poId: string;
    termDays: InvoiceTermDays;
    /** The human whose receipt triggered the automatic issue. */
    triggerActorId: string;
  }): { ok: boolean; error?: string; invoice?: CommerceInvoice };
}

export interface ReceiptInvoiceAutomationOutcome {
  action: ReceiptInvoiceAutomationAction;
  code: ReceiptInvoiceAutomationCode;
  reason: string;
  termDays: InvoiceTermDays;
  /** The invoice in force after the automation: the one raised, or the one already there. */
  invoice?: CommerceInvoice;
}

/**
 * Run the automation for one receipt: decide, and — only when the decision is to
 * issue — raise the invoice through the injected canonical writer.
 *
 * The writer's own refusal is passed through UNCHANGED (its text names the rule
 * it rests on), so a zero-value receipt or a failed receipt gate is never hidden
 * behind a generic message.
 */
export function applyReceiptInvoiceAutomation(input: {
  po: { id: string; status: PurchaseOrder['status'] };
  existingInvoice?: CommerceInvoice | undefined;
  termDays?: unknown;
  triggerActorId: string;
  writer: ReceiptInvoiceWriter;
}): ReceiptInvoiceAutomationOutcome {
  const decision = receiptInvoiceAutomationDecision({
    po: input.po,
    existingInvoice: input.existingInvoice,
    termDays: input.termDays,
  });

  if (decision.action === 'skip') {
    return {
      action: 'skipped',
      code: decision.code,
      reason: decision.reason,
      termDays: decision.termDays,
      ...(input.existingInvoice ? { invoice: input.existingInvoice } : {}),
    };
  }
  if (decision.action === 'refuse') {
    return {
      action: 'refused',
      code: decision.code,
      reason: decision.reason,
      termDays: decision.termDays,
    };
  }

  const written = input.writer.issue({
    poId: input.po.id,
    termDays: decision.termDays,
    triggerActorId: input.triggerActorId,
  });
  if (!written.ok || !written.invoice) {
    return {
      action: 'refused',
      code: RECEIPT_INVOICE_AUTOMATION_CODES.writerRefused,
      reason:
        written.error ??
        'RECEIPT_INVOICE_WRITE_REFUSED — the canonical invoice writer refused without a stated reason.',
      termDays: decision.termDays,
    };
  }
  return {
    action: 'issued',
    code: RECEIPT_INVOICE_AUTOMATION_CODES.issued,
    reason: decision.reason,
    termDays: decision.termDays,
    invoice: written.invoice,
  };
}

/* ── The ONE surface wording ───────────────────────────────────────────────── */

/**
 * The ONE line a surface states about what the receipt did — so the admin panel
 * and the brand console cannot describe the same outcome differently.
 */
export function receiptInvoiceAutomationSummary(
  outcome: ReceiptInvoiceAutomationOutcome
): string {
  switch (outcome.action) {
    case 'issued':
      return (
        `invoice ${outcome.invoice?.number ?? '(number unavailable)'} raised automatically · ` +
        `${outcome.termDays}-day terms (sim)`
      );
    case 'skipped':
      return `invoice ${outcome.invoice?.number ?? 'in force'} already in force — nothing raised (sim)`;
    case 'refused':
      return `invoice NOT raised automatically (${outcome.code}) — ${outcome.reason}`;
  }
}
