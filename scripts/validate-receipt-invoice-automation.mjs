/**
 * §S9 — RECEIPT → INVOICE AUTOMATION CONTRACT VALIDATOR.
 *
 * The stage's scope is the LEG between two writers that existed but were never
 * connected: `commerceLifecycle.receiveCommercePurchaseOrder` (the receipt) and
 * `commerceLifecycle.issueCommerceInvoice` (the invoice, §P7). This validator
 * proves the automation against the REAL modules through the project's own module
 * graph (Vite SSR — the same loader `validate-e4-commerce` and
 * `validate-p7-invoicing` use), so a wrong decision or a duplicated writer cannot
 * pass on a text match.
 *
 * Asserted behaviour:
 *   1  the automation has ONE owner and ONE declared automatic identity; its
 *      statement labels the automation as MERCENTA'S OWN process, never as a
 *      channel rule
 *   2  the pure DECISION: the terms are validated FIRST (an undeclared term is
 *      refused, never coerced — even when an invoice already exists), an ACTIVE
 *      invoice skips (nothing raised, nothing overwritten), a cancelled invoice
 *      does NOT skip (AV-022's correction path), a non-delivered PO is refused,
 *      and the absent-terms case resolves to the owner's DECLARED default
 *   3  the WRITE path calls the canonical writer exactly once when it issues,
 *      NEVER when it skips or refuses, and passes the writer's own refusal through
 *      unchanged
 *   4  the REAL DOMAIN: the RECEIPT raises the invoice through the SAME writer —
 *      one registry number consumed, the terms the receipt stated, the derived due
 *      date, attributed to the declared automatic identity with the human trigger
 *      NAMED on both canonical records
 *   5  idempotency: a second receipt is refused and raises no second invoice
 *   6  fail closed, never silent: an undeclared term and a zero-value receipt
 *      leave the RECEIPT standing, raise NO invoice, consume NO number, and record
 *      the refusal on the canonical trail
 *   7  a partial receipt invoices the quantity that arrived
 *   8  RBAC and tenant isolation are unchanged: a view-only or cross-tenant actor's
 *      receipt writes nothing at all
 *   9  the channel-receiving seam still REFUSES a simulated reading (unchanged)
 *  10  ONE owner: `commerceLifecycle` consumes the owner rather than re-deciding,
 *      the surfaces render the owner's own statement, and the automation does NOT
 *      auto-submit to the channel (the recorded out-of-scope decision)
 *  11  zero network calls — `fetch` is sabotaged before any module loads, and the
 *      owner + lifecycle are scanned for a network call
 *
 * Run: node scripts/validate-receipt-invoice-automation.mjs
 */
import { createServer } from 'vite';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

/* ── Zero-network guard: any attempted call is an S9 defect ─────────────────── */

let fetchCalls = 0;
globalThis.fetch = () => {
  fetchCalls++;
  throw new Error('NETWORK_CALL_ATTEMPTED');
};

let pass = 0;
let fail = 0;
const failures = [];
function check(name, ok, detail = '') {
  if (ok) {
    pass++;
    console.log(`  PASS  ${name}`);
  } else {
    fail++;
    failures.push(`${name}${detail ? ` — ${detail}` : ''}`);
    console.log(`  FAIL  ${name}${detail ? ` — ${detail}` : ''}`);
  }
}

const readSrc = (rel) => readFileSync(path.join(ROOT, rel), 'utf8');
const stripComments = (s) => s.replace(/\/\*[\s\S]*?\*\//g, ' ').replace(/\/\/[^\n]*/g, ' ');
const codeOf = (rel) => stripComments(readSrc(rel));

/* ── The REAL modules, through the project's own graph ─────────────────────── */

const server = await createServer({ server: { middlewareMode: true }, logLevel: 'error' });
const commerce = await server.ssrLoadModule('/src/lib/commerce/commerceLifecycle.ts');
const automation = await server.ssrLoadModule('/src/lib/commerce/receiptInvoiceAutomation.ts');
const store = await server.ssrLoadModule('/src/data/demoStore.ts');
const terms = await server.ssrLoadModule('/src/lib/commerce/invoiceTerms.ts');
const dates = await server.ssrLoadModule('/src/lib/dates.ts');

const OWNER = 'src/lib/commerce/receiptInvoiceAutomation.ts';
const LIFECYCLE = 'src/lib/commerce/commerceLifecycle.ts';

const BRAND = 'recv-brand-a';
const OTHER = 'recv-brand-b';
const actor = { staffId: `brand:${BRAND}`, canMutate: true, tenantId: BRAND };
const otherActor = { staffId: `brand:${OTHER}`, canMutate: true, tenantId: OTHER };
const viewOnly = { staffId: 'staff-005', canMutate: false, tenantId: BRAND };

/** A canonical PO as the lifecycle leaves one, ready to be received. */
let poSeq = 0;
function makeReceivablePurchaseOrder(overrides = {}) {
  poSeq += 1;
  const po = {
    id: `po-s9-${poSeq}`,
    brandId: BRAND,
    poNumber: `PO-S9-${9000 + poSeq}`,
    status: 'accepted',
    poValue: 100,
    commissionRate: 0.2,
    commissionAmount: 20,
    orderDate: '2026-09-01T00:00:00.000Z',
    mode: 'simulation',
    simulated: true,
    lineItems: [
      {
        sku: `SKU-S9-${poSeq}`,
        productName: 'S9 widget',
        quantity: 10,
        unitPrice: 10,
        commodityCode: '1234',
        ackStatus: 'accepted',
        acknowledgedQty: 10,
      },
    ],
    ...overrides,
  };
  store.demoPurchaseOrders.push(po);
  return po;
}

console.log('\n§S9 — receipt → invoice automation\n');

/* ══ 1. THE OWNER'S DECLARATIONS ═══════════════════════════════════════════ */

check(
  'the declared automatic identity is declared ONCE in src/',
  readSrc(OWNER).includes(`RECEIPT_INVOICE_AUTOMATION_ACTOR_ID = '${automation.RECEIPT_INVOICE_AUTOMATION_ACTOR_ID}'`) &&
    !readSrc(LIFECYCLE).includes('mercenta-system:receipt-invoice'),
  automation.RECEIPT_INVOICE_AUTOMATION_ACTOR_ID
);
check(
  'the automation is labelled as MERCENTA’S OWN process, never as a channel rule',
  /Mercenta's own operating process/.test(automation.RECEIPT_INVOICE_AUTOMATION_STATEMENT.mercentaProcess) &&
    /not a channel rule/.test(automation.RECEIPT_INVOICE_AUTOMATION_STATEMENT.mercentaProcess) &&
    /not a channel rule/.test(automation.RECEIPT_INVOICE_AUTOMATION_STATEMENT.text)
);
check(
  'the statement DERIVES the terms from their owner (no hand-typed 14/30/60)',
  automation.RECEIPT_INVOICE_AUTOMATION_STATEMENT.terms.includes(terms.INVOICE_TERM_CHOICES.join('/')) &&
    automation.RECEIPT_INVOICE_AUTOMATION_STATEMENT.terms.includes(String(terms.INVOICE_TERM_DAYS)) &&
    automation.RECEIPT_INVOICE_AUTOMATION_STATEMENT.text.includes(String(terms.INVOICE_TERM_DAYS))
);
check(
  'the statement states the AV-022 correction rule and the simulation provenance',
  /NEW Invoice ID/.test(automation.RECEIPT_INVOICE_AUTOMATION_STATEMENT.correction) &&
    /never reused/.test(automation.RECEIPT_INVOICE_AUTOMATION_STATEMENT.correction) &&
    /no accounting provider is contacted/.test(automation.RECEIPT_INVOICE_AUTOMATION_STATEMENT.simulation)
);
/* ══ 2. THE PURE DECISION ══════════════════════════════════════════════════ */

const decided = (input) => automation.receiptInvoiceAutomationDecision(input);
const deliveredPo = { status: 'delivered' };
const activeInvoice = { id: 'cinv-x', number: 'SIM-INV-X', status: 'issued' };

check(
  'no terms stated ⇒ the owner’s DECLARED default (never a guessed number)',
  decided({ po: deliveredPo }).action === 'issue' &&
    decided({ po: deliveredPo }).termDays === terms.INVOICE_TERM_DAYS,
  String(decided({ po: deliveredPo }).termDays)
);
check('the terms stated by the trigger are the terms carried', decided({ po: deliveredPo, termDays: 60 }).termDays === 60);
check(
  'an UNDECLARED term is REFUSED, never coerced',
  decided({ po: deliveredPo, termDays: 7 }).action === 'refuse' &&
    decided({ po: deliveredPo, termDays: 7 }).code === 'undeclared_terms' &&
    /RECEIPT_INVOICE_TERM_RULE/.test(decided({ po: deliveredPo, termDays: 7 }).reason),
  decided({ po: deliveredPo, termDays: 7 }).code
);
check(
  'the terms are validated FIRST — an undeclared term is refused even when an invoice already exists',
  decided({ po: deliveredPo, termDays: 7, existingInvoice: activeInvoice }).code === 'undeclared_terms'
);
check(
  'an ACTIVE invoice ⇒ skip: nothing raised, the chosen terms never overwritten',
  decided({ po: deliveredPo, existingInvoice: activeInvoice }).action === 'skip' &&
    decided({ po: deliveredPo, existingInvoice: activeInvoice }).code === 'already_invoiced' &&
    /AV-022/.test(decided({ po: deliveredPo, existingInvoice: activeInvoice }).reason)
);
check(
  'a SETTLED invoice also skips (money has moved; AV-022 never rewrites it)',
  decided({ po: deliveredPo, existingInvoice: { ...activeInvoice, status: 'paid' } }).action === 'skip'
);
check(
  'a CANCELLED invoice does NOT skip — AV-022’s correction path may raise the replacement',
  decided({ po: deliveredPo, existingInvoice: { ...activeInvoice, status: 'cancelled' } }).action === 'issue'
);
check(
  'a PO that is not DELIVERED is REFUSED (an invoice requires a delivered PO)',
  decided({ po: { status: 'shipped' } }).action === 'refuse' &&
    decided({ po: { status: 'shipped' } }).code === 'not_delivered' &&
    /RECEIPT_INVOICE_ILLEGAL_STATE/.test(decided({ po: { status: 'shipped' } }).reason)
);
check(
  'the decision is PURE — it needs no store and writes nothing',
  store.demoCommerceInvoices.length === 0 && !/demoStore/.test(readSrc(OWNER))
);

/* ── the injected writer: called exactly once, and only when issuing ───────── */

function fakeWriter(result) {
  const calls = [];
  return {
    calls,
    writer: {
      issue: (input) => {
        calls.push(input);
        return result;
      },
    },
  };
}
const issuedRecord = { id: 'cinv-fake', number: 'SIM-INV-FAKE', status: 'issued' };

const issueRun = fakeWriter({ ok: true, invoice: issuedRecord });
const issueOutcome = automation.applyReceiptInvoiceAutomation({
  po: { id: 'po-fake', status: 'delivered' },
  termDays: 14,
  triggerActorId: actor.staffId,
  writer: issueRun.writer,
});
check(
  'the write path calls the canonical writer EXACTLY once, with the resolved terms and the trigger',
  issueRun.calls.length === 1 &&
    issueRun.calls[0].poId === 'po-fake' &&
    issueRun.calls[0].termDays === 14 &&
    issueRun.calls[0].triggerActorId === actor.staffId
);
check(
  'an issued outcome carries the invoice the canonical writer returned',
  issueOutcome.action === 'issued' &&
    issueOutcome.code === 'issue_on_receipt' &&
    issueOutcome.invoice?.id === 'cinv-fake'
);

const skipRun = fakeWriter({ ok: true, invoice: issuedRecord });
const skipOutcome = automation.applyReceiptInvoiceAutomation({
  po: { id: 'po-fake', status: 'delivered' },
  existingInvoice: { id: 'cinv-existing', number: 'SIM-INV-EXISTING', status: 'issued' },
  triggerActorId: actor.staffId,
  writer: skipRun.writer,
});
check(
  'a skip NEVER calls the writer and reports the invoice already in force',
  skipRun.calls.length === 0 && skipOutcome.action === 'skipped' && skipOutcome.invoice?.number === 'SIM-INV-EXISTING'
);

const refuseRun = fakeWriter({ ok: true, invoice: issuedRecord });
const refuseOutcome = automation.applyReceiptInvoiceAutomation({
  po: { id: 'po-fake', status: 'shipped' },
  triggerActorId: actor.staffId,
  writer: refuseRun.writer,
});
check(
  'a refusal NEVER calls the writer and states the code',
  refuseRun.calls.length === 0 && refuseOutcome.action === 'refused' && refuseOutcome.code === 'not_delivered'
);

const writerRefusal = fakeWriter({
  ok: false,
  error: 'INVOICE_ZERO_VALUE — a zero-value invoice fails validation and was not issued (AV-022).',
});
const writerRefusalOutcome = automation.applyReceiptInvoiceAutomation({
  po: { id: 'po-fake', status: 'delivered' },
  triggerActorId: actor.staffId,
  writer: writerRefusal.writer,
});
check(
  'the canonical writer’s OWN refusal is passed through UNCHANGED',
  writerRefusalOutcome.action === 'refused' &&
    writerRefusalOutcome.code === 'writer_refused' &&
    /INVOICE_ZERO_VALUE/.test(writerRefusalOutcome.reason)
);
check(
  'the surface wording is ONE owner: issued / skipped / refused each state the outcome',
  /raised automatically/.test(automation.receiptInvoiceAutomationSummary(issueOutcome)) &&
    /already in force/.test(automation.receiptInvoiceAutomationSummary(skipOutcome)) &&
    /NOT raised automatically/.test(automation.receiptInvoiceAutomationSummary(refuseOutcome))
);

/* ══ 3. THE REAL DOMAIN — THE RECEIPT RAISES THE INVOICE ═══════════════════ */

/* 3a — the happy path, with the terms chosen AT the receipt. */
const po = makeReceivablePurchaseOrder();
const received = commerce.receiveCommercePurchaseOrder(po.id, actor, undefined, { termDays: 60 });
check(
  'the receipt succeeds and reports the automation as ISSUED',
  received.ok === true && received.value.invoiceAutomation.action === 'issued',
  received.ok ? received.value.invoiceAutomation.action : received.error
);
const autoInvoice = received.ok ? received.value.invoice : undefined;
check('the receipt returns the invoice it raised', !!autoInvoice && autoInvoice.status === 'issued');
check('the invoice is the CANONICAL record for that PO', store.getCommerceInvoiceForPo(po.id)?.id === autoInvoice?.id);
check(
  'the number comes from the ONE registry (SIM-INV-<poNumber>)',
  autoInvoice?.number === `SIM-INV-${po.poNumber}`,
  autoInvoice?.number
);
check(
  'exactly ONE number was consumed for the PO',
  store.getInvoiceNumberLedger().filter((r) => r.purchaseOrderId === po.id).length === 1
);
check(
  'the allocation names the invoice that consumed it',
  store.getInvoiceNumberAllocation(autoInvoice.number)?.invoiceId === autoInvoice.id
);
check(
  '§S9: the invoice carries the terms the RECEIPT stated (60), not a global constant',
  autoInvoice?.termDays === 60,
  String(autoInvoice?.termDays)
);
check(
  '§P7: the due date is still DERIVED from the invoice’s OWN terms',
  !!autoInvoice && terms.invoiceDueDate(autoInvoice) === dates.addDays(autoInvoice.issuedAt.slice(0, 10), 60)
);
check('the invoice bills the RECEIVED quantity', !!autoInvoice && autoInvoice.lines.some((l) => /10 ×/.test(l.description)));
check(
  'the activity trail holds the receipt AND the issue for the PO',
  store.getAllCommerceActivities().some((a) => a.type === 'po_received' && a.purchaseOrderId === po.id) &&
    store.getAllCommerceActivities().some((a) => a.type === 'invoice_issued' && a.invoiceId === autoInvoice?.id)
);
check(
  '§S9: the automatic issue is attributed to the DECLARED automatic identity on the platform audit log',
  store.demoAuditLog.some(
    (a) =>
      a.action === 'commerce_invoice_issued' &&
      a.metadata?.invoiceId === autoInvoice?.id &&
      a.actorId === automation.RECEIPT_INVOICE_AUTOMATION_ACTOR_ID
  )
);
check(
  '§S9: the human whose receipt triggered it is NAMED on both canonical records',
  store.demoAuditLog.some(
    (a) =>
      a.action === 'commerce_invoice_issued' &&
      a.metadata?.invoiceId === autoInvoice?.id &&
      /receipt by brand:recv-brand-a/.test(a.reason)
  ) &&
    store.getAllCommerceActivities().some(
      (a) => a.type === 'invoice_issued' && a.invoiceId === autoInvoice?.id && /AUTOMATICALLY/.test(a.detail)
    )
);

/* 3b — idempotency: a second receipt is refused and raises no second invoice. */
const secondReceive = commerce.receiveCommercePurchaseOrder(po.id, actor, undefined, { termDays: 14 });
check(
  'a second receipt is refused (ILLEGAL_TRANSITION)',
  secondReceive.ok === false && /ILLEGAL_TRANSITION/.test(secondReceive.error)
);
check(
  'the refused second receipt raised NO second invoice and consumed NO number',
  store.getAllCommerceInvoicesForPo(po.id).length === 1 &&
    store.getInvoiceNumberLedger().filter((r) => r.purchaseOrderId === po.id).length === 1
);

/* 3c — the writer stays IDEMPOTENT when reached by hand after the automation. */
const again = commerce.issueCommerceInvoice(po.id, actor, { termDays: 14 });
check(
  'a manual issue after the automatic one returns the SAME invoice — the terms are never overwritten',
  again.ok === true && again.value.id === autoInvoice?.id && again.value.termDays === 60
);
check(
  'it consumed no additional number',
  store.getInvoiceNumberLedger().filter((r) => r.purchaseOrderId === po.id).length === 1
);

/* 3d — no terms stated ⇒ the owner’s declared default, stated as such. */
const defaultPo = makeReceivablePurchaseOrder();
const defaultReceipt = commerce.receiveCommercePurchaseOrder(defaultPo.id, actor);
check(
  'the declared default terms apply when the receipt states no choice',
  defaultReceipt.ok === true && defaultReceipt.value.invoice?.termDays === terms.INVOICE_TERM_DAYS,
  String(defaultReceipt.ok ? defaultReceipt.value.invoice?.termDays : defaultReceipt.error)
);
check(
  'the outcome SAYS the default was used (never implied)',
  defaultReceipt.ok === true && /declared default/.test(defaultReceipt.value.invoiceAutomation.reason)
);

/* 3e — a partial receipt invoices the quantity that arrived. */
const partialPo = makeReceivablePurchaseOrder();
const partial = commerce.receiveCommercePurchaseOrder(partialPo.id, actor, {
  [partialPo.lineItems[0].sku]: 4,
});
check(
  'a partial receipt still raises the invoice, on the quantity that arrived',
  partial.ok === true &&
    partial.value.invoiceAutomation.action === 'issued' &&
    partial.value.invoice?.lines.some((l) => /4 ×/.test(l.description)),
  partial.ok ? partial.value.invoiceAutomation.action : partial.error
);
check(
  'the receiving status is the derived PARTIAL one (§P7 unchanged)',
  partial.ok === true && partial.value.receivingStatus === 'partially_received'
);

/* 3f — an UNDECLARED term: the receipt STANDS, nothing is raised, the refusal is RECORDED. */
const badTermPo = makeReceivablePurchaseOrder();
const ledgerBeforeBadTerm = store.getInvoiceNumberLedger().length;
const badTerm = commerce.receiveCommercePurchaseOrder(badTermPo.id, actor, undefined, { termDays: 7 });
check(
  'an undeclared term leaves the RECEIPT standing (the goods arrived)',
  badTerm.ok === true && badTerm.value.po.status === 'delivered'
);
check(
  'the automation REFUSED with the stated code',
  badTerm.ok === true &&
    badTerm.value.invoiceAutomation.action === 'refused' &&
    badTerm.value.invoiceAutomation.code === 'undeclared_terms'
);
check(
  'no invoice was raised and no number consumed',
  !store.getCommerceInvoiceForPo(badTermPo.id) && store.getInvoiceNumberLedger().length === ledgerBeforeBadTerm
);
check(
  'the refusal is RECORDED on the canonical trail (never a silent no-op)',
  store.getAllCommerceActivities().some(
    (a) => a.type === 'invoice_automation_refused' && a.purchaseOrderId === badTermPo.id
  )
);
check(
  'the recorded refusal names the rule it rests on',
  store.getAllCommerceActivities().some(
    (a) => a.type === 'invoice_automation_refused' && /RECEIPT_INVOICE_TERM_RULE/.test(a.detail)
  )
);

/* 3g — a ZERO-VALUE receipt: the receipt stands, the writer’s OWN refusal is recorded. */
const zeroPo = makeReceivablePurchaseOrder({
  commissionAmount: 0,
  commissionRate: 0,
  lineItems: [
    {
      sku: 'SKU-S9-ZERO',
      productName: 'zero-value widget',
      quantity: 1,
      unitPrice: 0,
      commodityCode: '1234',
      ackStatus: 'accepted',
      acknowledgedQty: 1,
    },
  ],
});
const ledgerBeforeZero = store.getInvoiceNumberLedger().length;
const zero = commerce.receiveCommercePurchaseOrder(zeroPo.id, actor);
check('a zero-value receipt still records the receipt', zero.ok === true && zero.value.po.status === 'delivered');
check(
  'the automation refused with the canonical writer’s OWN code and text',
  zero.ok === true &&
    zero.value.invoiceAutomation.action === 'refused' &&
    zero.value.invoiceAutomation.code === 'writer_refused' &&
    /INVOICE_ZERO_VALUE/.test(zero.value.invoiceAutomation.reason)
);
check(
  'no zero-value invoice exists and no number was consumed',
  store.getAllCommerceInvoicesForPo(zeroPo.id).length === 0 &&
    store.getInvoiceNumberLedger().length === ledgerBeforeZero
);
check(
  'the zero-value refusal is RECORDED on the canonical trail',
  store.getAllCommerceActivities().some(
    (a) => a.type === 'invoice_automation_refused' && a.purchaseOrderId === zeroPo.id
  )
);

/* 3h — RBAC and tenant isolation: a refused receipt writes NOTHING at all. */
const activitiesBeforeRefusal = store.demoCommerceActivities.length;
const invoicesBeforeRefusal = store.demoCommerceInvoices.length;
const ledgerBeforeRefusal = store.getInvoiceNumberLedger().length;
const viewPo = makeReceivablePurchaseOrder();
const viewReceipt = commerce.receiveCommercePurchaseOrder(viewPo.id, viewOnly);
check(
  'a VIEW-ONLY actor’s receipt is refused by the domain (FORBIDDEN)',
  viewReceipt.ok === false && /FORBIDDEN/.test(viewReceipt.error)
);
const foreignPo = makeReceivablePurchaseOrder();
const foreignReceipt = commerce.receiveCommercePurchaseOrder(foreignPo.id, otherActor);
check(
  'a CROSS-TENANT receipt is refused by the domain',
  foreignReceipt.ok === false && /CROSS_TENANT/.test(foreignReceipt.error)
);
check(
  'the refused receipts wrote NOTHING: no invoice, no number, no activity',
  store.demoCommerceInvoices.length === invoicesBeforeRefusal &&
    store.getInvoiceNumberLedger().length === ledgerBeforeRefusal &&
    store.demoCommerceActivities.length === activitiesBeforeRefusal
);

/* 3i — the §P12 channel-receiving seam is UNCHANGED: a simulated reading is refused. */
const applied = commerce.applyChannelReceivingReadingToStore(
  {
    channelPurchaseOrderId: po.poNumber,
    poId: po.id,
    brandId: BRAND,
    channelStatus: 'Closed',
    channelReceivingStatus: 'received',
    lines: [{ vendorSku: po.lineItems[0].sku, orderedQty: 10, receivedQty: 10 }],
    mercentaReceivingStatus: 'received',
    differs: false,
    simulated: true,
  },
  actor
);
check(
  '§P12 unchanged: a SIMULATED channel reading is never written as a receipt',
  applied.ok === false && /CHANNEL_READ_SIMULATED/.test(applied.refusal ?? '')
);

/* ══ 4. ONE OWNER, ONE WRITER, AND THE RECORDED BOUNDARY ═══════════════════ */

const LIFECYCLE_CODE = codeOf(LIFECYCLE);
const OWNER_CODE = codeOf(OWNER);
const ADMIN_PANEL = 'src/components/admin/CommerceOperationsPanel.tsx';
const SHARED_PANEL = 'src/components/shared/CommerceSimulationPanel.tsx';

check(
  'the lifecycle CONSUMES the owner instead of re-deciding (no outcome code is re-typed there)',
  /from '\.\/receiptInvoiceAutomation'/.test(readSrc(LIFECYCLE)) &&
    !/already_invoiced|undeclared_terms|writer_refused/.test(LIFECYCLE_CODE)
);
check(
  'the receipt path invokes the automation owner (never a hand-rolled issue)',
  /applyReceiptInvoiceAutomation\(\{/.test(LIFECYCLE_CODE)
);
check(
  'the invoice is still raised by the ONE writer (the owner allocates no number and imports no writer)',
  !/nextInvoiceNumber|invoiceIdForOrdinal/.test(OWNER_CODE) && !/issueCommerceInvoice\(/.test(OWNER_CODE)
);
check(
  'the automation does NOT auto-submit to the channel (the recorded out-of-scope decision)',
  !/channelInvoiceSubmission|submitInvoices/.test(OWNER_CODE) &&
    !/channelInvoiceSubmission|submitInvoices/.test(LIFECYCLE_CODE)
);
check(
  'the admin surface states the automation from its ONE owner (no hand-typed copy)',
  /RECEIPT_INVOICE_AUTOMATION_STATEMENT/.test(readSrc(ADMIN_PANEL)) &&
    /receiptInvoiceAutomationSummary/.test(readSrc(ADMIN_PANEL)) &&
    !/raised automatically the moment the receipt is logged/.test(codeOf(ADMIN_PANEL))
);
check(
  'the brand console states the automation from its ONE owner (no hand-typed copy)',
  /RECEIPT_INVOICE_AUTOMATION_STATEMENT/.test(readSrc(SHARED_PANEL)) &&
    /receiptInvoiceAutomationSummary/.test(readSrc(SHARED_PANEL)) &&
    !/raised automatically the moment the receipt is logged/.test(codeOf(SHARED_PANEL))
);
check(
  'the terms travel WITH the receipt on the admin surface (the receipt raises the invoice)',
  /receiveCommercePurchaseOrder\(po\.id, actor, undefined, \{/.test(codeOf(ADMIN_PANEL)) &&
    /termDays: chosenTerms/.test(codeOf(ADMIN_PANEL))
);
check(
  'the manual issue control remains, as the fallback and the AV-022 correction path',
  /data-state="admin-commerce-issue-invoice"/.test(codeOf(ADMIN_PANEL)) &&
    /issueCommerceInvoice\(po\.id, actor, \{ termDays: chosenTerms \}\)/.test(codeOf(ADMIN_PANEL))
);
check(
  'zero network calls: nothing in the owner or the lifecycle reaches the network',
  fetchCalls === 0 &&
    !/\bfetch\(|axios|XMLHttpRequest|new WebSocket/.test(OWNER_CODE) &&
    !/\bfetch\(|axios|XMLHttpRequest|new WebSocket/.test(LIFECYCLE_CODE),
  `${fetchCalls} intercepted call(s)`
);

console.log(
  `\n§S9 — ${pass} assertions PASS, ${fail} FAIL` +
    `${fetchCalls === 0 ? ' · 0 network calls' : ` · ${fetchCalls} NETWORK CALLS`}\n`
);
if (fail > 0) {
  console.log('Failures:');
  for (const f of failures) console.log(`  · ${f}`);
  console.log('');
}
await server.close();
process.exit(fail === 0 && fetchCalls === 0 ? 0 : 1);
