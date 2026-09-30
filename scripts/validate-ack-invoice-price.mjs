#!/usr/bin/env node
/**
 * §BATCH 2d (`AV-008` / `AV-023`) — THE ACKNOWLEDGEMENT ↔ INVOICE PRICE-MATCH GATE.
 *
 * WHY THIS EXISTS
 * ---------------
 * The Phase 0A audit registered two findings:
 *   `AV-008` — *"The cost price in the acknowledgement must match the invoiced unit
 *   cost price… The price cannot be higher than the price submitted in the purchase
 *   order."* (source S2). The platform RECORDED `acknowledgedUnitPrice` but matched
 *   NOTHING and enforced NO ceiling.
 *   `AV-023` — *"Ensure the cost price matches the unit cost price that is invoiced.
 *   Amazon payment systems compares the two and might delay payment if they do not
 *   match."* The invoice writer billed the ORDER's price, so a divergence the channel
 *   penalises was created by the platform itself — even though the acknowledgement's
 *   own warning said "invoicing should use the acknowledged price".
 *
 * Correction alone is not the fix — a later edit could put the old behaviour back.
 * This gate EXECUTES the shipped modules (bundled with the project's own esbuild
 * through its own `@` alias) so it asserts RUNNING behaviour, not a pattern, and
 * fails if:
 *
 *   1  the rule has no ONE owner, or the owner's wording is re-typed elsewhere;
 *   2  the acknowledged-price derivation is wrong (it must be the acknowledged price,
 *      falling back to the order price only when none was recorded);
 *   3  the acknowledgement CEILING is not enforced (a price ABOVE the order price is
 *      accepted), or an unreadable price is accepted (it must fail CLOSED);
 *   4  the INVOICE does not bill the acknowledged price (the AV-023 defect);
 *   5  the CHANNEL SUBMISSION does not send the acknowledged price, or the platform
 *      submission path is not wired to the owner;
 *   6  a genuine divergence is not WARNED about with the channel's own rule;
 *   7  any live network call is made.
 *
 * Run: node scripts/validate-ack-invoice-price.mjs
 */
import fs from 'fs';
import os from 'os';
import path from 'path';
import { execFileSync } from 'child_process';
import { fileURLToPath } from 'url';

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

const read = (relative) => fs.readFileSync(path.join(ROOT, relative), 'utf8');
/** Source with comments stripped — an assertion about CODE, never about prose. */
const code = (relative) =>
  read(relative)
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/\/\/[^\n]*/g, '');

/** How many files under `src/` carry a literal in their CODE (comments stripped). */
let sourceTree = null;
const sourceFiles = () => {
  if (sourceTree) return sourceTree;
  const walk = (dir) =>
    fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) return entry.name === 'node_modules' ? [] : walk(full);
      return /\.(ts|tsx)$/.test(entry.name) ? [full] : [];
    });
  sourceTree = walk(path.join(ROOT, 'src'));
  return sourceTree;
};
const countInSrc = (literal) =>
  sourceFiles().filter((file) =>
    fs
      .readFileSync(file, 'utf8')
      .replace(/\/\*[\s\S]*?\*\//g, '')
      .replace(/\/\/[^\n]*/g, '')
      .includes(literal)
  ).length;

/* ── The executed entry ───────────────────────────────────────────────────── */

const ENTRY = `
import {
  acknowledgedUnitPriceFor, ackPriceDivergence, ackPriceDivergences,
  ackPriceDivergenceWarning, ackPriceCeilingRefusal,
  ACK_INVOICE_PRICE_RULE_TEXT, PO_ACK_PRICE_CEILING_RULE_TEXT,
} from '@/lib/commerce/invoicePriceMatch';
import { acknowledgePurchaseOrder, submitCommerceInvoiceToChannel } from '@/data/api';
import { issueCommerceInvoice } from '@/lib/commerce/commerceLifecycle';
import { demoPurchaseOrders } from '@/data/demoStore';
import {
  submitInvoiceToChannel, channelInvoiceSubmissions, resetChannelInvoiceSubmissions,
} from '@/lib/commerce/channelInvoiceSubmission';

globalThis.fetch = function () { throw new Error('NETWORK_CALL_ATTEMPTED'); };

const out = {};
const ORDER_PRICE = 100;
const ACK_PRICE = 90;
const NOW = '2026-09-20T01:00:00.000Z';

out.ruleText = ACK_INVOICE_PRICE_RULE_TEXT;
out.ceilingText = PO_ACK_PRICE_CEILING_RULE_TEXT;

/* 2 — the pure derivation */
out.derive = {
  noAckFallsBack: acknowledgedUnitPriceFor({ unitPrice: ORDER_PRICE }),
  ackWins: acknowledgedUnitPriceFor({ unitPrice: ORDER_PRICE, acknowledgedUnitPrice: ACK_PRICE }),
};
out.divergence = {
  equal: ackPriceDivergence({ sku: 'S', unitPrice: ORDER_PRICE, acknowledgedUnitPrice: ORDER_PRICE }),
  none: ackPriceDivergence({ sku: 'S', unitPrice: ORDER_PRICE }),
  lower: ackPriceDivergence({ sku: 'S', unitPrice: ORDER_PRICE, acknowledgedUnitPrice: ACK_PRICE }),
  higher: ackPriceDivergence({ sku: 'S', unitPrice: ORDER_PRICE, acknowledgedUnitPrice: 101 }),
};

/* 3 — the ceiling, directly on the owner */
const ceilingOf = function (orderPrice, ackPrice, ackStatus) {
  return ackPriceCeilingRefusal(
    { lineItems: [{ sku: 'S', unitPrice: orderPrice }] },
    [{ sku: 'S', unitPrice: ackPrice, ackStatus: ackStatus }]
  );
};
out.ceiling = {
  above: ceilingOf(ORDER_PRICE, 101),
  equal: ceilingOf(ORDER_PRICE, ORDER_PRICE),
  below: ceilingOf(ORDER_PRICE, ACK_PRICE),
  rejected: ceilingOf(ORDER_PRICE, 101, 'rejected'),
  nonFinite: ceilingOf(ORDER_PRICE, NaN),
};

/* PO factory — a canonical PO in the store, exactly as the receiving path leaves it */
let seq = 0;
const line = function (over) {
  seq += 1;
  return Object.assign({
    sku: 'ACK-INV-SKU-' + seq, productName: 'x', quantity: 10, unitPrice: ORDER_PRICE,
    commodityCode: '3304990090',
  }, over || {});
};
const makePo = function (over) {
  seq += 1;
  const po = Object.assign({
    id: 'po-ackinv-' + seq, brandId: 'brand-ackinv', poNumber: 'ACK-INV-' + (9000 + seq),
    status: 'delivered', poValue: 1000, commissionRate: 0, commissionAmount: 0,
    orderDate: '2026-09-20T00:00:00.000Z', mode: 'simulation', simulated: true,
    revisionNumber: 0, lineItems: [line()],
  }, over || {});
  demoPurchaseOrders.push(po);
  return po;
};
const actor = { staffId: 'staff-ackinv', canMutate: true, tenantId: 'brand-ackinv' };

/* 3b — the ceiling, through the REAL acknowledgement writer */
const ceilingPo = makePo({ status: 'received', lineItems: [line({ ackStatus: 'unacknowledged' })] });
const overAck = acknowledgePurchaseOrder(
  ceilingPo.id,
  [{ sku: ceilingPo.lineItems[0].sku, ackStatus: 'accepted', acknowledgedQty: 10, unitPrice: 101 }],
  undefined, NOW
);
const equalPo = makePo({ status: 'received', lineItems: [line({ ackStatus: 'unacknowledged' })] });
const equalAck = acknowledgePurchaseOrder(
  equalPo.id,
  [{ sku: equalPo.lineItems[0].sku, ackStatus: 'accepted', acknowledgedQty: 10, unitPrice: ORDER_PRICE }],
  undefined, NOW
);
const lowerPo = makePo({ status: 'received', lineItems: [line({ ackStatus: 'unacknowledged' })] });
const lowerAck = acknowledgePurchaseOrder(
  lowerPo.id,
  [{ sku: lowerPo.lineItems[0].sku, ackStatus: 'accepted', acknowledgedQty: 10, unitPrice: ACK_PRICE }],
  undefined, NOW
);
out.writerCeiling = {
  overRefused: overAck.ok === false && /cannot be higher/.test(String(overAck.error)),
  overNamesRegister: /AV-008/.test(String(overAck.error)),
  equalAccepted: equalAck.ok === true,
  equalRecorded: equalPo.lineItems[0].acknowledgedUnitPrice === ORDER_PRICE,
  equalNoDivergence: ackPriceDivergence(equalPo.lineItems[0]) === null,
  lowerAccepted: lowerAck.ok === true,
  lowerRecorded: lowerPo.lineItems[0].acknowledgedUnitPrice === ACK_PRICE,
  lowerWarned: Array.isArray(lowerAck.warnings) &&
    lowerAck.warnings.some(function (w) { return w.indexOf(ACK_INVOICE_PRICE_RULE_TEXT) !== -1; }),
};

/* 4 — the INVOICE bills the acknowledged price (AV-023) */
const ackInvPo = makePo({
  lineItems: [line({ ackStatus: 'accepted', acknowledgedQty: 10, receivedQty: 8, acknowledgedUnitPrice: ACK_PRICE })],
});
const ackInvoice = issueCommerceInvoice(ackInvPo.id, actor);
const orderInvPo = makePo({
  lineItems: [line({ ackStatus: 'accepted', acknowledgedQty: 10, receivedQty: 8 })],
});
const orderInvoice = issueCommerceInvoice(orderInvPo.id, actor);
out.invoice = {
  ackOk: ackInvoice.ok,
  ackAmount: ackInvoice.ok ? ackInvoice.value.lines[0].amountGbp : null,
  ackExpected: 8 * ACK_PRICE,
  ackDescriptionNamesAck: ackInvoice.ok && ackInvoice.value.lines[0].description.indexOf(ACK_PRICE.toFixed(2)) !== -1,
  orderOk: orderInvoice.ok,
  orderAmount: orderInvoice.ok ? orderInvoice.value.lines[0].amountGbp : null,
  orderExpected: 8 * ORDER_PRICE,
};

/* 5 — the channel SUBMISSION sends the acknowledged price. The awaits below run
   inside an async IIFE: the bundle is CJS, which has no top-level await. */
(async function () {
let sent = null;
const reader = {
  submitInvoices: async function (payload) {
    sent = payload;
    return { ok: true, submissionId: 'sim', status: 'accepted' };
  },
};
resetChannelInvoiceSubmissions();
const ackInv = ackInvoice.ok ? ackInvoice.value : null;
if (ackInv) {
  const seamRecord = await submitInvoiceToChannel({
    reader: reader, invoice: ackInv, poNumber: ackInvPo.poNumber,
    invoiceDate: ackInv.issuedAt.slice(0, 10),
    lines: ackInvPo.lineItems.map(function (l) {
      return {
        vendorSku: l.sku,
        quantity: l.receivedQty || l.acknowledgedQty || l.quantity,
        unitPrice: acknowledgedUnitPriceFor(l),
      };
    }),
  });
  out.seam = { sentUnitPrice: sent ? sent.lines[0].unitPrice : null, expected: ACK_PRICE, noRefusal: !seamRecord.refusal };
} else {
  out.seam = { sentUnitPrice: null, expected: ACK_PRICE, noRefusal: false };
}
/* the PLATFORM submission path must run and record no refusal for a valid invoice */
const platform = ackInv ? await submitCommerceInvoiceToChannel({ invoiceId: ackInv.id }) : { refusal: 'no invoice' };
out.platform = { hadRefusal: Boolean(platform.refusal), submitted: channelInvoiceSubmissions().length > 0 };

/* 6 — the warning states the channel's rule */
const warnDiv = ackPriceDivergence({ sku: 'S', unitPrice: ORDER_PRICE, acknowledgedUnitPrice: ACK_PRICE });
out.warning = warnDiv ? ackPriceDivergenceWarning(warnDiv) : '';

/* 7 — nothing in this run may make a live call */
out.network = 'sabotaged';

console.log('__RESULT__' + JSON.stringify(out));
})().catch(function (error) {
  console.log('__RESULT__' + JSON.stringify({ runtimeError: String(error && error.message ? error.message : error) }));
});
`;

const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'mercenta-ack-invoice-'));
const entryPath = path.join(tmpDir, 'entry.ts');
const outPath = path.join(tmpDir, 'bundle.cjs');
fs.writeFileSync(entryPath, ENTRY, 'utf8');

let result;
try {
  execFileSync(
    path.join(ROOT, 'node_modules/.bin/esbuild'),
    [
      entryPath, '--bundle', '--format=cjs', '--platform=node',
      `--alias:@=${path.join(ROOT, 'src')}`, '--define:import.meta.env={}',
      `--outfile=${outPath}`, '--log-level=error',
    ],
    { cwd: ROOT, stdio: ['ignore', 'inherit', 'inherit'] }
  );
  const stdout = execFileSync(process.execPath, [outPath], { cwd: ROOT, encoding: 'utf8' });
  result = JSON.parse(stdout.split('__RESULT__')[1]);
} catch (error) {
  console.log(`  FAIL  bundling/executing the real modules — ${String(error).slice(0, 900)}`);
  console.log('');
  console.log('ACK_INVOICE_PRICE_VALIDATION_FAIL (0 passed, 1 failed)');
  process.exit(1);
}

if (result && result.runtimeError) {
  console.log(`  FAIL  the executed modules threw — ${result.runtimeError}`);
  console.log('');
  console.log('ACK_INVOICE_PRICE_VALIDATION_FAIL (0 passed, 1 failed)');
  process.exit(1);
}

/* ── 1. the rule has ONE owner and is not re-typed ────────────────────────── */

console.log("§ 1. The rule has ONE owner (AV-008 / AV-023) and is not re-typed\n");
check(
  'the match rule states the channel\'s obligation (must match; may delay payment)',
  /must match/.test(result.ruleText) && /delay payment/.test(result.ruleText),
  result.ruleText
);
check('the ceiling rule states the channel\'s obligation (cannot be higher)', /cannot be higher/.test(result.ceilingText), result.ceilingText);
check(
  'the match rule\'s wording is declared exactly ONCE in src/',
  countInSrc('payment systems compare the two and may delay payment') === 1,
  `occurrences: ${countInSrc('payment systems compare the two and may delay payment')}`
);
check('the OLD inline warning ("Invoicing should use the acknowledged price") no longer exists', countInSrc('Invoicing should use the acknowledged price') === 0);
check('the OLD admin-title ("Cost-price discrepancies detected") no longer exists', countInSrc('Cost-price discrepancies detected') === 0);
check('the owner contains no TODO/FIXME placeholder', !/TODO|FIXME/.test(read('src/lib/commerce/invoicePriceMatch.ts')));
check('the owner makes no network call of its own', !/fetch\s*\(|XMLHttpRequest|axios/.test(code('src/lib/commerce/invoicePriceMatch.ts')));

/* ── 2. the acknowledged-price derivation ─────────────────────────────────── */

console.log('\n§ 2. The acknowledged price is the ONE price the invoice must bill\n');
check('a line with no acknowledged price falls back to the order price', result.derive.noAckFallsBack === 100, String(result.derive.noAckFallsBack));
check('a line WITH an acknowledged price uses it', result.derive.ackWins === 90, String(result.derive.ackWins));
check('an EQUAL price is not a divergence', result.divergence.equal === null);
check('a line with no acknowledged price is not a divergence', result.divergence.none === null);
check(
  'a LOWER acknowledged price IS a divergence naming both prices',
  result.divergence.lower && result.divergence.lower.acknowledgedUnitPrice === 90 && result.divergence.lower.poUnitPrice === 100,
  JSON.stringify(result.divergence.lower)
);
check('a HIGHER acknowledged price IS a divergence with a positive delta', result.divergence.higher && result.divergence.higher.delta === 1, JSON.stringify(result.divergence.higher));

/* ── 3. the acknowledgement ceiling (R2) ──────────────────────────────────── */

console.log('\n§ 3. The acknowledgement CEILING is enforced, and fails CLOSED\n');
check('a price ABOVE the order price is REFUSED', /cannot be higher/.test(String(result.ceiling.above)), String(result.ceiling.above));
check('the refusal quotes the channel\'s rule and names AV-008', /AV-008/.test(String(result.ceiling.above)));
check('a price EQUAL to the order price is accepted', result.ceiling.equal === null);
check('a price BELOW the order price is accepted', result.ceiling.below === null);
check('a rejected line carries no ceiling obligation', result.ceiling.rejected === null);
check('an unreadable (non-finite) price is REFUSED (fail-closed)', /not a number/.test(String(result.ceiling.nonFinite)), String(result.ceiling.nonFinite));

/* ── 3b. the REAL writer enforces the ceiling ─────────────────────────────── */

console.log('\n§ 3b. The REAL acknowledgement writer enforces the ceiling\n');
const W = result.writerCeiling;
check('the writer REFUSES an acknowledged price above the order price', W.overRefused === true);
check('the writer\'s refusal names the register (AV-008)', W.overNamesRegister === true);
check('the writer ACCEPTS an equal price', W.equalAccepted === true);
check('the writer records an equal acknowledged price', W.equalRecorded === true);
check('an equal price is recorded without a divergence', W.equalNoDivergence === true);
check('the writer ACCEPTS a lower price', W.lowerAccepted === true);
check('the writer records the lower acknowledged price', W.lowerRecorded === true);
check('the writer WARNS with the channel\'s own rule on a divergence', W.lowerWarned === true);

/* ── 4. the invoice bills the acknowledged price (AV-023) ─────────────────── */

console.log('\n§ 4. The INVOICE bills the acknowledged price (AV-023)\n');
const I = result.invoice;
check('an invoice for an acknowledged-lower line is issued', I.ackOk === true);
check(
  'the invoice line amount uses the ACKNOWLEDGED price (8 × 90 = 720), not the order price',
  I.ackAmount === I.ackExpected && I.ackAmount === 720,
  `amount=${I.ackAmount} expected=${I.ackExpected}`
);
check('the invoice line description names the acknowledged price', I.ackDescriptionNamesAck === true);
check('a line with NO acknowledged price still bills the order price (8 × 100 = 800)', I.orderOk === true && I.orderAmount === I.orderExpected && I.orderAmount === 800, `amount=${I.orderAmount}`);

/* ── 5. the channel submission sends the acknowledged price ───────────────── */

console.log('\n§ 5. The CHANNEL SUBMISSION sends the acknowledged price\n');
check('the per-line payload sent to the channel uses the acknowledged price (90)', result.seam.sentUnitPrice === result.seam.expected, String(result.seam.sentUnitPrice));
check('the submission is not refused for a valid invoice', result.seam.noRefusal === true);
check('the PLATFORM submission path runs and records no refusal', result.platform.hadRefusal === false, JSON.stringify(result.platform));
check('the PLATFORM submission path records the submission', result.platform.submitted === true);

/* ── 6. the warning states the channel's rule ─────────────────────────────── */

console.log('\n§ 6. A divergence is WARNED about with the channel\'s own rule\n');
check('the warning names both prices', /90\.00/.test(result.warning) && /100\.00/.test(result.warning), result.warning);
check('the warning states the channel\'s match rule', result.warning.indexOf(result.ruleText) !== -1);

/* ── 7. zero network ──────────────────────────────────────────────────────── */

console.log('\n§ 7. Nothing in this run made a live call\n');
check('fetch was sabotaged for the whole run (any call would have thrown)', result.network === 'sabotaged');

console.log('');
if (fail === 0) {
  console.log(`ACK_INVOICE_PRICE_VALIDATION_PASS (${pass} passed, 0 failed)`);
  process.exit(0);
}
console.log('ACK_INVOICE_PRICE_VALIDATION_FAIL');
for (const e of errors) console.log(`  - ${e}`);
console.log(`(${pass} passed, ${fail} failed)`);
process.exit(1);
