/**
 * §P7 — ADMIN INVOICING CONTRACT VALIDATOR.
 *
 * The browser suite proves the admin flows RENDER and ACT. This validator proves
 * the parts a browser test cannot reach cheaply, and it EXECUTES the REAL modules
 * through the PROJECT'S OWN module graph (Vite SSR, the same loader
 * `validate-e4-commerce` and `validate-work-layer` use) rather than grepping
 * source text — a text assertion would pass even if the arithmetic were wrong.
 *
 * Asserted behaviour (programme decision 2 · register `AV-022` · `AV-018`):
 *   1  the terms are 14/30/60 and the declared default is 30; an undeclared term
 *      is REFUSED, never coerced, and a legacy row keeps the pre-P7 behaviour
 *   2  an invoice's due date is DERIVED from ITS OWN terms — never a global
 *      constant — and it agrees with the platform's own date helper
 *   3  RECEIVABLES = issued-and-unpaid: a paid invoice, a cancelled invoice and a
 *      settled invoice are all excluded; overdue/upcoming come from the SAME rule
 *   4  invoice numbers are UNIQUE and NEVER reused; a voided number stays consumed
 *      for ever; two POs can never collide; the ledger is append-only and idempotent
 *   5  a ZERO-VALUE invoice FAILS validation
 *   6  the receiving status is DERIVED (not/partially/fully) and the invoice gate
 *      FAILS CLOSED on an unreceived PO, naming the register it rests on
 *   7  the real DOMAIN enforces all of it: an unreceived PO cannot be invoiced, an
 *      undeclared term is refused, a cancellation needs a reason, a cancelled
 *      invoice is never receivable, a re-issue takes a NEW number, a PAID invoice
 *      can never be cancelled, and RBAC + tenant isolation hold
 *   8  ONE owner per value: no second declaration of the terms, the receiving
 *      statuses, the registry or the due-date arithmetic anywhere in `src/`
 *   9  zero network calls — asserted by intercepting `fetch` AND by source scan
 *
 * Run: node scripts/validate-p7-invoicing.mjs
 */
import { createServer } from 'vite';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

let pass = 0;
let fail = 0;
const errors = [];

function check(name, ok, detail = '') {
  if (ok) {
    pass++;
    console.log(`  PASS  ${name}`);
  } else {
    fail++;
    errors.push(`${name}${detail ? ` — ${detail}` : ''}`);
    console.log(`  FAIL  ${name}${detail ? ` — ${detail}` : ''}`);
  }
}

/* ── Zero-network guard: any intercepted call would be a P7 defect ────────── */

let externalFetches = 0;
globalThis.fetch = async (url) => {
  externalFetches++;
  console.log(`!! P7 suite attempted an external fetch: ${String(url)}`);
  return new Response('{}', { status: 200, headers: { 'content-type': 'application/json' } });
};

const readSrc = (rel) => readFileSync(path.join(ROOT, rel), 'utf8');

/* ── Load the REAL modules through the project's own graph ────────────────── */

const server = await createServer({ server: { middlewareMode: true }, logLevel: 'error' });

const store = await server.ssrLoadModule('/src/data/demoStore.ts');
const commerce = await server.ssrLoadModule('/src/lib/commerce/commerceLifecycle.ts');
const terms = await server.ssrLoadModule('/src/lib/commerce/invoiceTerms.ts');
const registry = await server.ssrLoadModule('/src/lib/commerce/invoiceRegistry.ts');
const receiving = await server.ssrLoadModule('/src/lib/commerce/receivingStatus.ts');
const dates = await server.ssrLoadModule('/src/lib/dates.ts');

const BRAND = 'p7-brand-a';
const OTHER = 'p7-brand-b';
const actor = { staffId: `brand:${BRAND}`, canMutate: true, tenantId: BRAND };
const otherActor = { staffId: `brand:${OTHER}`, canMutate: true, tenantId: OTHER };
const viewOnly = { staffId: 'staff-005', canMutate: false, tenantId: BRAND };

/** A canonical PO in the store, exactly as the receiving path would leave it. */
let poSeq = 0;
function makePurchaseOrder(overrides = {}) {
  poSeq += 1;
  const po = {
    id: `po-p7-${poSeq}`,
    brandId: BRAND,
    poNumber: `PO-P7-${9000 + poSeq}`,
    status: 'delivered',
    poValue: 1000,
    commissionRate: 0.2,
    commissionAmount: 200,
    orderDate: '2026-09-01T00:00:00.000Z',
    mode: 'simulation',
    simulated: true,
    lineItems: [
      {
        sku: `SKU-P7-${poSeq}`,
        productName: 'P7 widget',
        quantity: 10,
        unitPrice: 100,
        commodityCode: '1234',
        ackStatus: 'accepted',
        acknowledgedQty: 10,
        receivedQty: 10,
      },
    ],
    ...overrides,
  };
  store.demoPurchaseOrders.push(po);
  return po;
}

/** A delivered PO the channel's receiving system has logged NOTHING against. */
function makeUnreceivedPurchaseOrder() {
  return makePurchaseOrder({
    lineItems: [
      {
        sku: `SKU-P7-UNRECEIVED`,
        productName: 'P7 un-received widget',
        quantity: 10,
        unitPrice: 100,
        commodityCode: '1234',
        ackStatus: 'accepted',
        acknowledgedQty: 10,
      },
    ],
  });
}

/** An invoice row as the ledger holds it (the terms are the only variable). */
const invoiceRow = (id, issuedAt, termDays, status = 'issued') => ({
  id,
  brandId: BRAND,
  purchaseOrderId: `po-${id}`,
  poNumber: `PO-${id}`,
  number: `SIM-INV-PO-${id}`,
  lines: [{ description: 'line', amountGbp: 500 }],
  subtotalGbp: 500,
  status,
  termDays,
  currency: 'GBP',
  mode: 'simulation',
  simulated: true,
  issuedAt,
});
/* ── 1. the terms (14/30/60) and the declared default ─────────────────────── */

check(
  'the declared terms are exactly 14/30/60 (programme decision 2)',
  JSON.stringify([...terms.INVOICE_TERM_CHOICES]) === JSON.stringify([14, 30, 60]),
  JSON.stringify([...terms.INVOICE_TERM_CHOICES])
);
check('the declared DEFAULT term is 30 days', terms.INVOICE_TERM_DAYS === 30, String(terms.INVOICE_TERM_DAYS));
check(
  'only a declared term is accepted; anything else is refused (never coerced)',
  [14, 30, 60].every((t) => terms.isInvoiceTermDays(t)) &&
    [0, 7, 45, 90, -30, '30', null, undefined, NaN, 'sixty'].every((v) => !terms.isInvoiceTermDays(v))
);
check(
  '§P7: an invoice carries ITS OWN terms when declared',
  terms.invoiceTermDays({ termDays: 14 }) === 14 && terms.invoiceTermDays({ termDays: 60 }) === 60
);
check(
  '§P7: a legacy row written before the choice keeps the DECLARED default (pre-P7 behaviour preserved)',
  terms.invoiceTermDays({}) === 30 && terms.invoiceTermDays({ termDays: undefined }) === 30
);
check(
  '§P7: an UNDECLARED term on a legacy row falls back to the default, never to the undeclared value',
  terms.invoiceTermDays({ termDays: 90 }) === 30
);

/* ── 2. the derived due date uses the INVOICE's own terms ────────────────── */

const issued = '2026-09-01T08:30:00.000Z';
check(
  'a 14-day invoice is due 14 days after its own issue date',
  terms.invoiceDueDate({ issuedAt: issued, termDays: 14 }) === '2026-09-15',
  terms.invoiceDueDate({ issuedAt: issued, termDays: 14 })
);
check(
  'a 30-day invoice is due 30 days after its own issue date',
  terms.invoiceDueDate({ issuedAt: issued, termDays: 30 }) === '2026-10-01',
  terms.invoiceDueDate({ issuedAt: issued, termDays: 30 })
);
check(
  'a 60-day invoice is due 60 days after its own issue date',
  terms.invoiceDueDate({ issuedAt: issued, termDays: 60 }) === '2026-10-31',
  terms.invoiceDueDate({ issuedAt: issued, termDays: 60 })
);
check(
  '§P7: two invoices issued the SAME DAY with different terms are due on DIFFERENT dates (no global term)',
  terms.invoiceDueDate({ issuedAt: issued, termDays: 14 }) !==
    terms.invoiceDueDate({ issuedAt: issued, termDays: 60 })
);
check(
  'the derived due date agrees with the platform’s own date helper (one date step, not two)',
  terms.invoiceDueDate({ issuedAt: issued, termDays: 60 }) === dates.addDays('2026-09-01', 60)
);
check(
  'days-until-due is measured from the invoice’s own due date',
  terms.invoiceDaysUntilDue({ issuedAt: issued, termDays: 30 }, '2026-09-20') === 11,
  String(terms.invoiceDaysUntilDue({ issuedAt: issued, termDays: 30 }, '2026-09-20'))
);
check(
  'a legacy invoice (no terms recorded) keeps the pre-P7 due date: issue + 30',
  terms.invoiceDueDate({ issuedAt: issued }) === dates.addDays('2026-09-01', 30)
);
check(
  'the derivation basis names the register that makes a derived payment date necessary (S14)',
  /S14/.test(terms.PAYMENT_DERIVATION_BASIS) && /derived/i.test(terms.PAYMENT_DERIVATION_BASIS)
);


/* ── 3. receivables = issued-and-unpaid ──────────────────────────────────── */

const issuedInvoice = invoiceRow('rec-1', '2026-09-01T00:00:00.000Z', 30);
const paidInvoice = invoiceRow('rec-2', '2026-09-01T00:00:00.000Z', 30, 'paid');
const cancelledRow = invoiceRow('rec-3', '2026-09-01T00:00:00.000Z', 30, 'cancelled');
const settledPayment = { invoiceId: issuedInvoice.id };
const otherPayment = { invoiceId: 'someone-else' };

check('an ISSUED invoice with no settled payment is a receivable', terms.invoiceIsOutstanding(issuedInvoice, []));
check('a PAID invoice is not a receivable', !terms.invoiceIsOutstanding(paidInvoice, []));
check('a CANCELLED invoice is not a receivable', !terms.invoiceIsOutstanding(cancelledRow, []));
check(
  'an issued invoice WITH a settled payment is not a receivable',
  !terms.invoiceIsOutstanding(issuedInvoice, [settledPayment])
);
check(
  'a payment against ANOTHER invoice does not settle this one',
  terms.invoiceIsOutstanding(issuedInvoice, [otherPayment])
);
check(
  'an invoice is overdue only when its OWN derived due date has passed AND it is unpaid',
  terms.invoiceIsOverdue(invoiceRow('rec-4', '2026-09-01T00:00:00.000Z', 14), [], '2026-09-20') &&
    !terms.invoiceIsOverdue(invoiceRow('rec-5', '2026-09-01T00:00:00.000Z', 60), [], '2026-09-20') &&
    !terms.invoiceIsOverdue(invoiceRow('rec-6', '2026-09-01T00:00:00.000Z', 14, 'paid'), [], '2026-09-20')
);
check(
  'upcoming means it falls due within the DECLARED horizon (30 days), not merely unpaid',
  terms.invoiceIsUpcoming(invoiceRow('rec-7', '2026-09-01T00:00:00.000Z', 14), [], '2026-09-01') &&
    !terms.invoiceIsUpcoming(invoiceRow('rec-8', '2026-09-01T00:00:00.000Z', 60), [], '2026-09-01')
);

const ledger = [
  invoiceRow('sum-1', '2026-09-01T00:00:00.000Z', 14), // £500 · due 2026-09-15
  invoiceRow('sum-2', '2026-09-01T00:00:00.000Z', 60), // £500 · due 2026-10-31 (beyond the horizon)
  invoiceRow('sum-3', '2026-09-01T00:00:00.000Z', 30, 'paid'),
  invoiceRow('sum-4', '2026-09-01T00:00:00.000Z', 30, 'cancelled'),
  invoiceRow('sum-5', '2026-09-01T00:00:00.000Z', 30), // settled below → excluded
];
const summary = terms.summariseInvoiceLedger(ledger, [{ invoiceId: 'sum-5' }], '2026-09-20');
check(
  '§P7: receivables EXCLUDE paid, cancelled and settled invoices (issued-and-unpaid only)',
  summary.outstanding.length === 2 && summary.outstanding.every((i) => i.id === 'sum-1' || i.id === 'sum-2'),
  summary.outstanding.map((i) => i.id).join(',')
);
check(
  'receivables value = the sum of the outstanding invoices (£1,000.00)',
  summary.receivablesGbp === 1000,
  String(summary.receivablesGbp)
);
check(
  'overdue is the subset whose OWN terms have elapsed (the 14-day invoice, £500.00)',
  summary.overdue.length === 1 && summary.overdue[0].id === 'sum-1' && summary.overdueGbp === 500,
  String(summary.overdueGbp)
);
check(
  'upcoming within the 30-day horizon excludes a 60-day invoice',
  summary.upcoming.length === 1 && summary.upcoming[0].id === 'sum-1' && summary.upcomingGbp === 500,
  String(summary.upcomingGbp)
);
check(
  'a cancelled invoice stops being receivable the moment it is cancelled',
  terms.summariseInvoiceLedger([cancelledRow], [], '2026-09-20').receivablesGbp === 0
);


/* ── 4. the invoice-number registry (AV-022) ─────────────────────────────── */

check(
  'the first number for a PO is SIM-INV-<poNumber> (the platform shape is preserved)',
  registry.invoiceNumberForOrdinal('PO-1', 1) === 'SIM-INV-PO-1',
  registry.invoiceNumberForOrdinal('PO-1', 1)
);
check(
  'a RE-ISSUE takes a NEW number, never the old one',
  registry.invoiceNumberForOrdinal('PO-1', 2) === 'SIM-INV-PO-1-R2' &&
    registry.invoiceNumberForOrdinal('PO-1', 3) === 'SIM-INV-PO-1-R3'
);
check(
  'two different POs can never collide',
  registry.invoiceNumberForOrdinal('PO-1', 1) !== registry.invoiceNumberForOrdinal('PO-2', 1)
);
check(
  'the invoice ID moves with the number (first invoice keeps the pre-P7 id)',
  registry.invoiceIdForOrdinal('brand-a', 'PO-1', 1) === 'cinv-brand-a-PO-1' &&
    registry.invoiceIdForOrdinal('brand-a', 'PO-1', 2) === 'cinv-brand-a-PO-1-r2'
);

const ledgerRows = [];
check(
  'with nothing allocated, the next number for a PO is ordinal 1',
  (() => {
    const next = registry.nextInvoiceNumber(ledgerRows, { id: 'po-a', poNumber: 'PO-A' });
    return next.number === 'SIM-INV-PO-A' && next.ordinal === 1;
  })()
);
ledgerRows.push({
  number: 'SIM-INV-PO-A',
  purchaseOrderId: 'po-a',
  poNumber: 'PO-A',
  brandId: BRAND,
  ordinal: 1,
  invoiceId: 'cinv-brand-a-PO-A',
  allocatedAt: '2026-09-01T00:00:00.000Z',
});
check(
  '§P7/AV-022: once a number is allocated the next allocation is a DIFFERENT number',
  (() => {
    const next = registry.nextInvoiceNumber(ledgerRows, { id: 'po-a', poNumber: 'PO-A' });
    return next.ordinal === 2 && next.number === 'SIM-INV-PO-A-R2' && next.number !== ledgerRows[0].number;
  })()
);
check('a consumed number reports as consumed', registry.invoiceNumberIsConsumed(ledgerRows, 'SIM-INV-PO-A'));
check(
  'an unallocated number reports as free',
  !registry.invoiceNumberIsConsumed(ledgerRows, 'SIM-INV-PO-A-R2')
);
check(
  'the allocation that consumed a number is retrievable (the ledger is the evidence)',
  registry.allocationForNumber(ledgerRows, 'SIM-INV-PO-A')?.invoiceId === 'cinv-brand-a-PO-A'
);

/* A VOIDED number stays consumed for ever. */
store.recordInvoiceNumberAllocation({
  number: 'SIM-INV-PO-VOID',
  purchaseOrderId: 'po-void',
  poNumber: 'PO-VOID',
  brandId: BRAND,
  ordinal: 1,
  invoiceId: 'cinv-brand-a-PO-VOID',
  allocatedAt: '2026-09-02T00:00:00.000Z',
});
const voided = store.voidInvoiceNumberAllocation('SIM-INV-PO-VOID', 'wrong quantity', '2026-09-03T00:00:00.000Z');
check('voiding a number records when and why, and keeps the row (append-only)', !!voided?.voidedAt && voided.voidReason === 'wrong quantity');
check(
  '§P7/AV-022: a VOIDED number still reports as consumed — it can never be reused',
  registry.invoiceNumberIsConsumed(store.getInvoiceNumberLedger(), 'SIM-INV-PO-VOID')
);
check(
  '§P7/AV-022: after a void, the next number for that PO is the NEXT ordinal, never the voided number',
  (() => {
    const next = registry.nextInvoiceNumber(store.getInvoiceNumberLedger(), { id: 'po-void', poNumber: 'PO-VOID' });
    return next.ordinal === 2 && next.number === 'SIM-INV-PO-VOID-R2';
  })()
);
const ledgerLengthBefore = store.getInvoiceNumberLedger().length;
store.recordInvoiceNumberAllocation({
  number: 'SIM-INV-PO-VOID',
  purchaseOrderId: 'po-void',
  poNumber: 'PO-VOID',
  brandId: BRAND,
  ordinal: 1,
  invoiceId: 'cinv-brand-a-PO-VOID',
  allocatedAt: '2026-09-04T00:00:00.000Z',
});
check(
  're-recording an allocation is idempotent on the NUMBER (the ledger cannot grow a duplicate)',
  store.getInvoiceNumberLedger().length === ledgerLengthBefore
);
check(
  'the registry cannot be shrunk: demoStore never splices the ledger',
  !/demoInvoiceNumberRegistry\.(splice|pop|shift)/.test(readSrc('src/data/demoStore.ts'))
);

/* ── 5. a zero-value invoice FAILS (AV-022) ──────────────────────────────── */

check(
  '§P7/AV-022: a ZERO-VALUE invoice fails validation',
  !registry.invoiceAmountIsValid(0) && !registry.invoiceAmountIsValid(-5)
);
check(
  'a sub-penny total rounds to zero and therefore also fails',
  !registry.invoiceAmountIsValid(0.001)
);
check('a real value passes', registry.invoiceAmountIsValid(0.01) && registry.invoiceAmountIsValid(1234.56));
check(
  'a non-finite total fails (never silently treated as valid)',
  !registry.invoiceAmountIsValid(NaN) && !registry.invoiceAmountIsValid(Infinity)
);
check(
  'only an ISSUED invoice may be cancelled',
  !registry.invoiceCannotBeCancelled({ status: 'issued' }) &&
    registry.invoiceCannotBeCancelled({ status: 'paid' }) &&
    registry.invoiceCannotBeCancelled({ status: 'cancelled' })
);
check(
  'the AV-022 rules are stated as text (they are shown where the numbers are handled)',
  registry.INVOICE_NUMBER_RULES.length >= 4 &&
    registry.INVOICE_NUMBER_RULES.some((r) => /never reused/i.test(r)) &&
    registry.INVOICE_NUMBER_RULES.some((r) => /zero-value/i.test(r)) &&
    registry.INVOICE_NUMBER_RULES.some((r) => /NEW Invoice ID/i.test(r))
);


/* ── 6. the receiving status + the receipt gate (AV-018) ─────────────────── */

const line = (over = {}) => ({
  sku: 'SKU-P7-R',
  productName: 'P7 receiving line',
  quantity: 10,
  unitPrice: 10,
  commodityCode: '1234',
  ackStatus: 'accepted',
  acknowledgedQty: 10,
  ...over,
});

check(
  'no received quantity ⇒ not_received',
  receiving.deriveReceivingStatus({ lineItems: [line()] }) === 'not_received'
);
check(
  'part of the confirmed quantity ⇒ partially_received',
  receiving.deriveReceivingStatus({ lineItems: [line({ receivedQty: 4 })] }) === 'partially_received'
);
check(
  'the full confirmed quantity ⇒ received',
  receiving.deriveReceivingStatus({ lineItems: [line({ receivedQty: 10 })] }) === 'received'
);
check(
  'receiving is never "received" while a line is still short',
  receiving.deriveReceivingStatus({ lineItems: [line({ receivedQty: 10 }), line({ sku: 'SKU-P7-2', receivedQty: 3 })] }) ===
    'partially_received'
);
check(
  'a REJECTED line is out of scope for receiving',
  receiving.deriveReceivingStatus({
    lineItems: [line({ ackStatus: 'rejected', acknowledgedQty: 0 }), line({ sku: 'SKU-P7-3', receivedQty: 10 })],
  }) === 'received'
);
const rs = receiving.summariseReceiving({ lineItems: [line({ receivedQty: 7 })] });
check(
  'the receipt summary reports ordered / confirmed / received / shortfall units',
  rs.orderedUnits === 10 &&
    rs.confirmedUnits === 10 &&
    rs.receivedUnits === 7 &&
    rs.shortfallUnits === 3 &&
    rs.linesAwaiting === 1,
  JSON.stringify(rs)
);
const gateNo = receiving.invoiceReceiptGate({ lineItems: [line()] });
check(
  '§P7: an UNRECEIVED PO cannot be invoiced — the gate fails closed',
  gateNo.allowed === false && gateNo.status === 'not_received'
);
check(
  'the refusal NAMES the register it rests on (AV-018)',
  /RECEIPT_REQUIRED/.test(gateNo.reason) && /AV-018/.test(gateNo.reason)
);
check(
  'a PARTIAL receipt may be invoiced (it bills the quantity that arrived)',
  receiving.invoiceReceiptGate({ lineItems: [line({ receivedQty: 4 })] }).allowed === true
);
check(
  'a full receipt may be invoiced',
  receiving.invoiceReceiptGate({ lineItems: [line({ receivedQty: 10 })] }).allowed === true
);
check(
  'the receiving status labels cover all three declared states',
  Object.keys(receiving.RECEIVING_STATUS_LABELS).length === 3
);


/* ── 7. the real DOMAIN enforces it all ──────────────────────────────────── */

/* 7a — an unreceived PO is refused, and NOTHING is recorded. */
const unreceived = makeUnreceivedPurchaseOrder();
const invoicesBefore = store.demoCommerceInvoices.length;
const ledgerBefore = store.getInvoiceNumberLedger().length;
const refused = commerce.issueCommerceInvoice(unreceived.id, actor);
check(
  '§P7: the DOMAIN refuses an invoice for a delivered but UNRECEIVED PO',
  refused.ok === false && /RECEIPT_REQUIRED/.test(refused.error),
  refused.ok ? 'issued' : refused.error
);
check('the refusal recorded no invoice', store.demoCommerceInvoices.length === invoicesBefore);
check('the refusal consumed no invoice number', store.getInvoiceNumberLedger().length === ledgerBefore);

/* 7b — a received PO issues, with the terms chosen FOR IT. */
const po = makePurchaseOrder();
const issuedResult = commerce.issueCommerceInvoice(po.id, actor, { termDays: 60 });
check('a received PO issues an invoice', issuedResult.ok === true, issuedResult.ok ? '' : issuedResult.error);
const inv = issuedResult.value;
check('§P7: the invoice carries the terms CHOSEN for it (60), not a global constant', inv.termDays === 60, String(inv.termDays));
check(
  '§P7: the due date is derived from the invoice’s OWN terms (60 days)',
  terms.invoiceDueDate(inv) === dates.addDays(inv.issuedAt.slice(0, 10), 60)
);
check('the number comes from the registry (SIM-INV-<poNumber>)', inv.number === `SIM-INV-${po.poNumber}`, inv.number);
check('a registry row was consumed for the number', !!store.getInvoiceNumberAllocation(inv.number));
check(
  'the allocation names the invoice that consumed it',
  store.getInvoiceNumberAllocation(inv.number).invoiceId === inv.id
);
check(
  'the issue is recorded on the canonical activity trail',
  store.getAllCommerceActivities().some((a) => a.type === 'invoice_issued' && a.invoiceId === inv.id)
);
check(
  'the issue is attributed on the EXISTING audit log (actor + invoice in the metadata)',
  store.demoAuditLog.some(
    (a) => a.action === 'commerce_invoice_issued' && a.metadata?.invoiceId === inv.id && a.actorId === actor.staffId
  )
);
const again = commerce.issueCommerceInvoice(po.id, actor, { termDays: 14 });
check(
  '§P7: issuing again returns the SAME invoice — the chosen terms are never overwritten',
  again.ok === true && again.value.id === inv.id && again.value.termDays === 60
);
check(
  'a second issue consumes no additional number',
  store.getInvoiceNumberLedger().filter((r) => r.purchaseOrderId === po.id).length === 1
);

/* 7c — an undeclared term is refused. */
const badTerms = commerce.issueCommerceInvoice(makePurchaseOrder().id, actor, { termDays: 7 });
check(
  '§P7: an UNDECLARED term is refused by the domain',
  badTerms.ok === false && /INVOICE_TERM_RULE/.test(badTerms.error),
  badTerms.ok ? 'issued' : badTerms.error
);

/* 7d — a zero-value invoice FAILS. */
const zeroPo = makePurchaseOrder({
  commissionAmount: 0,
  commissionRate: 0,
  lineItems: [
    {
      sku: 'SKU-P7-ZERO',
      productName: 'zero-value widget',
      quantity: 1,
      unitPrice: 0,
      commodityCode: '1234',
      ackStatus: 'accepted',
      acknowledgedQty: 1,
      receivedQty: 1,
    },
  ],
});
const zero = commerce.issueCommerceInvoice(zeroPo.id, actor);
check(
  '§P7/AV-022: a ZERO-VALUE invoice is refused by the domain',
  zero.ok === false && /INVOICE_ZERO_VALUE/.test(zero.error),
  zero.ok ? 'issued' : zero.error
);
check(
  'the refused zero-value invoice consumed nothing',
  store.getInvoiceNumberLedger().every((r) => r.purchaseOrderId !== zeroPo.id)
);

/* 7e — cancellation + re-issue under a NEW number (AV-022). */
check(
  'a cancellation with NO reason is refused (it must be attributable)',
  commerce.cancelCommerceInvoice(inv.id, actor, '   ').ok === false
);
const cancelled = commerce.cancelCommerceInvoice(inv.id, actor, 'wrong invoiced quantity');
check(
  '§P7/AV-022: an issued invoice can be cancelled with a stated reason',
  cancelled.ok === true && cancelled.value.status === 'cancelled',
  cancelled.ok ? '' : cancelled.error
);
check(
  'the cancellation records when and why',
  !!cancelled.value.cancelledAt && cancelled.value.cancellationReason === 'wrong invoiced quantity'
);
check(
  '§P7/AV-022: cancelling VOIDS the number for ever',
  !!store.getInvoiceNumberAllocation(inv.number)?.voidedAt
);
check('a cancelled invoice is never a receivable', !terms.invoiceIsOutstanding({ id: inv.id, status: 'cancelled' }, []));
check(
  'the cancellation is on the canonical activity trail',
  store.getAllCommerceActivities().some((a) => a.type === 'invoice_cancelled' && a.invoiceId === inv.id)
);
check('cancelling twice is refused', commerce.cancelCommerceInvoice(inv.id, actor, 'again').ok === false);
const reissue = commerce.issueCommerceInvoice(po.id, actor, { termDays: 14 });
check(
  '§P7/AV-022: the correction is issued under a NEW number',
  reissue.ok === true && reissue.value.number === `${inv.number}-R2`,
  reissue.ok ? reissue.value.number : reissue.error
);
check('the replacement points back at the invoice it supersedes', reissue.value.replacesInvoiceId === inv.id);
check(
  'the superseded invoice points forward to its replacement (the journal has no gap)',
  store.getCommerceInvoice(inv.id)?.replacedByInvoiceId === reissue.value.id
);
check(
  'the replacement carries ITS OWN terms (14) and its own derived due date',
  reissue.value.termDays === 14 &&
    terms.invoiceDueDate(reissue.value) === dates.addDays(reissue.value.issuedAt.slice(0, 10), 14)
);
check(
  'the PO now has TWO registry rows — the voided number is never reissued',
  store.getInvoiceNumberLedger().filter((r) => r.purchaseOrderId === po.id).length === 2
);
check(
  'the invoice IN FORCE for the PO is the replacement',
  store.getCommerceInvoiceForPo(po.id)?.id === reissue.value.id
);


/* 7f — a SETTLED invoice can never be cancelled. */
const paidPo = makePurchaseOrder();
const paidInv = commerce.issueCommerceInvoice(paidPo.id, actor).value;
commerce.recordCommercePayment(paidInv.id, actor);
const cancelPaid = commerce.cancelCommerceInvoice(paidInv.id, actor, 'changed my mind');
check(
  '§P7: a SETTLED invoice cannot be cancelled — the ledger corrects it, never a rewrite',
  cancelPaid.ok === false && /INVOICE_NOT_CANCELLABLE/.test(cancelPaid.error),
  cancelPaid.ok ? 'cancelled' : cancelPaid.error
);
check('a settled invoice is not a receivable', !terms.invoiceIsOutstanding({ id: paidInv.id, status: 'paid' }, []));

/* 7g — RBAC + tenant isolation, enforced IN THE DOMAIN. */
const rbacPo = makePurchaseOrder();
check('a view-only actor cannot issue an invoice', commerce.issueCommerceInvoice(rbacPo.id, viewOnly).ok === false);
check(
  'a view-only actor cannot cancel an invoice',
  commerce.cancelCommerceInvoice(reissue.value.id, viewOnly, 'nope').ok === false
);
const crossIssue = commerce.issueCommerceInvoice(paidPo.id, otherActor);
check(
  'another tenant cannot issue an invoice for this brand’s PO',
  crossIssue.ok === false && /CROSS_TENANT/.test(crossIssue.error),
  crossIssue.ok ? 'issued' : crossIssue.error
);
const crossCancel = commerce.cancelCommerceInvoice(reissue.value.id, otherActor, 'no');
check(
  'another tenant cannot cancel this brand’s invoice',
  crossCancel.ok === false && /CROSS_TENANT/.test(crossCancel.error),
  crossCancel.ok ? 'cancelled' : crossCancel.error
);

/* 7h — the receiving step records the receipt and the derived status. */
const recvPo = makePurchaseOrder({
  status: 'accepted',
  lineItems: [
    {
      sku: 'SKU-P7-RECV',
      productName: 'receiving widget',
      quantity: 10,
      unitPrice: 10,
      commodityCode: '1234',
      ackStatus: 'accepted',
      acknowledgedQty: 10,
    },
  ],
});
const recv = commerce.receiveCommercePurchaseOrder(recvPo.id, actor);
check(
  'the receiving path reports the DERIVED receiving status',
  recv.ok === true && recv.value.receivingStatus === 'received',
  recv.ok ? recv.value.receivingStatus : recv.error
);
check(
  'the receipt is RECORDED on the PO (the timestamp cannot be derived)',
  !!store.demoPurchaseOrders.find((p) => p.id === recvPo.id)?.receivedAt
);
check('the PO can then be invoiced', commerce.issueCommerceInvoice(recvPo.id, actor).ok === true);

const shortPo = makePurchaseOrder({
  status: 'accepted',
  lineItems: [
    {
      sku: 'SKU-P7-SHORT',
      productName: 'short widget',
      quantity: 10,
      unitPrice: 10,
      commodityCode: '1234',
      ackStatus: 'accepted',
      acknowledgedQty: 10,
    },
  ],
});
const shortRecv = commerce.receiveCommercePurchaseOrder(shortPo.id, actor, { 'SKU-P7-SHORT': 4 });
check(
  'a partial receipt reports partially_received',
  shortRecv.ok === true && shortRecv.value.receivingStatus === 'partially_received',
  shortRecv.ok ? shortRecv.value.receivingStatus : shortRecv.error
);
const shortInvoice = commerce.issueCommerceInvoice(shortPo.id, actor);
check(
  'a partially received PO CAN be invoiced (on the received quantity)',
  shortInvoice.ok === true && shortInvoice.value.lines.some((l) => /4 ×/.test(l.description)),
  shortInvoice.ok ? shortInvoice.value.lines.map((l) => l.description).join(' | ') : shortInvoice.error
);


/* ── 8. ONE owner per value (no second source of truth in src/) ──────────── */

const srcFiles = [
  'src/types.ts',
  'src/data/demoStore.ts',
  'src/lib/dates.ts',
  'src/lib/work/workStore.ts',
  'src/lib/commerce/invoiceTerms.ts',
  'src/lib/commerce/invoiceRegistry.ts',
  'src/lib/commerce/receivingStatus.ts',
  'src/lib/commerce/commerceLifecycle.ts',
  'src/lib/commandCentre/controlCentre.ts',
  'src/lib/ai/founderOpsAi.ts',
  'src/lib/automation/registry.ts',
  'src/components/admin/AdminDashboard.tsx',
  'src/components/admin/CommerceOperationsPanel.tsx',
  'src/components/admin/AccountingPanel.tsx',
  'src/components/brand/BrandDashboard.tsx',
  'src/lib/simulation/investorDemo.ts',
].map(readSrc);

check(
  'the terms are DECLARED once (types.ts) and never re-declared',
  (readSrc('src/types.ts').match(/export const INVOICE_TERM_CHOICES/g) ?? []).length === 1 &&
    srcFiles.filter((s) => s !== srcFiles[0] && /export const INVOICE_TERM_CHOICES/.test(s)).length === 0
);
check(
  'the default term is DECLARED once (invoiceTerms.ts) — the work layer only re-exports it',
  (readSrc('src/lib/commerce/invoiceTerms.ts').match(/export const INVOICE_TERM_DAYS/g) ?? []).length === 1 &&
    !/export const INVOICE_TERM_DAYS/.test(readSrc('src/lib/work/workStore.ts')) &&
    /export \{ INVOICE_TERM_DAYS \} from '@\/lib\/commerce\/invoiceTerms'/.test(readSrc('src/lib/work/workStore.ts'))
);
check(
  'the receiving statuses are DECLARED once',
  (readSrc('src/types.ts').match(/export const RECEIVING_STATUSES/g) ?? []).length === 1
);
check(
  'the registry ledger is DECLARED once',
  (readSrc('src/data/demoStore.ts').match(/export const demoInvoiceNumberRegistry/g) ?? []).length === 1
);
check(
  'the due-date derivation is DECLARED once and imported everywhere else',
  (readSrc('src/lib/commerce/invoiceTerms.ts').match(/export function invoiceDueDate/g) ?? []).length === 1 &&
    srcFiles.filter((s) => /export function invoiceDueDate/.test(s)).length === 1
);
check(
  'the number allocation is DECLARED once',
  srcFiles.filter((s) => /export function nextInvoiceNumber/.test(s)).length === 1
);
check(
  '§P7 — NO consumer re-derives a due date from the global term constant',
  srcFiles.every((s) => !/addDays\(\s*[^)]*INVOICE_TERM_DAYS/.test(s))
);
check(
  'the readers use the ONE owner (due date / outstanding / overdue / ledger summary)',
  /invoiceDueDate\(/.test(readSrc('src/lib/work/workStore.ts')) &&
    /invoiceIsOutstanding\(/.test(readSrc('src/lib/work/workStore.ts')) &&
    /summariseInvoiceLedger\(/.test(readSrc('src/components/admin/AdminDashboard.tsx')) &&
    /summariseInvoiceLedger\(/.test(readSrc('src/lib/commandCentre/controlCentre.ts')) &&
    /invoiceIsOverdue\(/.test(readSrc('src/lib/ai/founderOpsAi.ts')) &&
    /invoiceIsOverdue\(/.test(readSrc('src/lib/automation/registry.ts'))
);
check(
  'the invoice / receiving-status / registry records are declared ONCE each in the types file',
  (readSrc('src/types.ts').match(/export interface CommerceInvoice\b/g) ?? []).length === 1 &&
    (readSrc('src/types.ts').match(/export type ReceivingStatus\b/g) ?? []).length === 1 &&
    (readSrc('src/types.ts').match(/export interface InvoiceNumberAllocation\b/g) ?? []).length === 1
);
check(
  'the invoice-number rules are stated in ONE place (the registry owner)',
  (readSrc('src/lib/commerce/invoiceRegistry.ts').match(/export const INVOICE_NUMBER_RULES/g) ?? []).length === 1 &&
    srcFiles.filter((s) => /export const INVOICE_NUMBER_RULES/.test(s)).length === 1
);
check(
  'the admin surface exposes the terms choice, the receiving status and the cancel path',
  (() => {
    const panel = readSrc('src/components/admin/CommerceOperationsPanel.tsx');
    return (
      /admin-commerce-terms-select/.test(panel) &&
      /admin-commerce-receiving-status/.test(panel) &&
      /admin-commerce-cancel-invoice/.test(panel) &&
      /admin-commerce-cancel-reason/.test(panel)
    );
  })()
);
check(
  'the P7 test hooks sit on elements that RENDER the attribute — `Badge` does not forward `data-*`',
  !/<Badge[\s\S]{0,240}?data-state/.test(readSrc('src/components/admin/CommerceOperationsPanel.tsx'))
);
check(
  'the accounting surface shows the registry ledger',
  /accounting-invoice-registry/.test(readSrc('src/components/admin/AccountingPanel.tsx'))
);

/* ── 9. zero network calls ───────────────────────────────────────────────── */

const PURE_MODULES = [
  'src/lib/dates.ts',
  'src/lib/commerce/invoiceTerms.ts',
  'src/lib/commerce/invoiceRegistry.ts',
  'src/lib/commerce/receivingStatus.ts',
];
for (const rel of PURE_MODULES) {
  const code = readSrc(rel).replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/.*$/gm, '');
  check(
    `no-network: ${rel} performs no network call`,
    !/\bfetch\s*\(/.test(code) && !/XMLHttpRequest|axios|navigator\.sendBeacon/.test(code)
  );
}
check('zero external network calls were attempted for the whole suite', externalFetches === 0, String(externalFetches));

/* ── Report ─────────────────────────────────────────────────────────────── */

await server.close();

console.log('');
if (fail === 0) {
  console.log(`P7_INVOICING_VALIDATION_PASS (${pass} assertions, ${externalFetches} network calls)`);
  process.exit(0);
}
console.log(`P7_INVOICING_VALIDATION_FAIL (${pass} passed, ${fail} failed)`);
for (const e of errors) console.log(`  - ${e}`);
process.exit(1);

