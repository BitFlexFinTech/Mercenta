#!/usr/bin/env node
/**
 * §P0 — THE WHOLE-LOOP TRACE GATE (`docs/CLEANUP_AND_VERIFICATION_PLAN_2026-09-30.md`, P0).
 *
 * WHY THIS EXISTS
 * ---------------
 * The owner asked four questions about what the platform ACTUALLY does with a
 * purchase order, and the plan's P0 is to answer them with an EXECUTED trace rather
 * than a description: one order, every step, printing who acted, which writer ran,
 * what was recorded, and what the channel returned (and whether that was simulated).
 *
 *   1. does the order land ONLY with the brand whose SKUs match? (including a
 *      deliberately UNMATCHED SKU, whose refusal must be shown — not asserted);
 *   2. does the brand's decision reach the channel as MERCENTA? (the acknowledgement
 *      id/status/mode the seam returned);
 *   3. on acceptance, is the ASN created automatically and the confirmation sent?
 *      (the consignment id, and the channel's confirmation id);
 *   4. can the brand DOWNLOAD a label/document for that consignment?
 *
 * This gate DRIVES the shipped code — bundled with the project's own esbuild through
 * its own `@` alias, with `fetch` SABOTAGED so any live network call fails the run —
 * and refuses to pass if any of the following regresses:
 *
 *   · the arrival leg stops routing by SKU, or a line outside the catalogue is no
 *     longer refused WHOLE (a partial ingestion would file a PO Mercenta cannot account for);
 *   · the brand's decision stops becoming an INSTRUCTION that MERCENTA (never the brand)
 *     performs through the channel seam;
 *   · the ASN stops being filed automatically on acceptance, or its confirmation is
 *     claimed when the channel did not accept it;
 *   · the money chain (receipt → automatic invoice → payment → reconciliation →
 *     payout) stops reaching a SETTLED payout, or a payout stops being idempotent;
 *   · any live network call is made;
 *   · the source loses the truth this gate reports about the label/document question
 *     (the pack is PRINTABLE/OPENABLE and there is NO file-download control), so the
 *     owner's expectation cannot silently drift again.
 *
 * Run: node scripts/validate-commerce-loop.mjs
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

const ENTRY = `
import {
  ingestChannelPurchaseOrders, acknowledgePurchaseOrder, settleBrandPayout,
} from '@/data/api';
import { processChannelInstruction, PROXY_ACTOR_ID } from '@/lib/commerce/proxyProcessor';
import { getChannelInstruction } from '@/lib/commerce/channelInstructions';
import { receiveCommercePurchaseOrder, recordCommercePayment } from '@/lib/commerce/commerceLifecycle';
import { reconcilePayment, evaluatePayoutEligibility, listAllPayouts } from '@/lib/finance/financialReconciliation';
import { RECEIPT_INVOICE_AUTOMATION_ACTOR_ID } from '@/lib/commerce/receiptInvoiceAutomation';
import { invoiceDueDate } from '@/lib/commerce/invoiceTerms';
import { demoProducts, demoPurchaseOrders, demoShipments, demoAuditLog, getCommission } from '@/data/demoStore';

/* ZERO NETWORK: any external call is counted and made to fail the run. */
let networkCalls = 0;
globalThis.fetch = function () {
  networkCalls += 1;
  throw new Error('NETWORK_CALL_ATTEMPTED');
};

const out = { steps: [], networkCalls: 0 };
const step = (id, who, writer, detail) => out.steps.push({ id, who, writer, detail });

/* ── STEP 1 — THE ORDER ARRIVES from the retail channel and is ROUTED ──────── */
const arrival = await ingestChannelPurchaseOrders({ actorId: 'validator:commerce-loop' });
out.arrival = {
  ok: arrival.ok, mode: arrival.mode ?? null, polled: arrival.polled,
  ingested: arrival.ingested, refused: arrival.refused, revised: arrival.revised,
  alreadyPresent: arrival.alreadyPresent,
};
out.arrivalOutcomes = arrival.outcomes.map((o) => ({
  channelPo: o.channelPurchaseOrderId, status: o.status, brandId: o.brandId,
  poNumber: o.po ? o.po.poNumber : null,
  lineSkus: o.po ? o.po.lineItems.map((l) => l.sku) : [],
  reason: o.reason ?? null,
}));

/**
 * Routing is DERIVED, so the check is: every ingested order's brand must equal the
 * brand of the catalogue product whose SKU the channel ordered. Computed from the
 * SAME canonical catalogue the ingestion used — never from the result itself.
 */
out.routingBySku = out.arrivalOutcomes
  .filter((o) => o.status === 'ingested')
  .map((o) => ({
    channelPo: o.channelPo,
    routedTo: o.brandId,
    skuBrands: [...new Set(o.lineSkus.map((sku) => {
      const product = demoProducts.find((p) => p.sku === sku);
      return product ? product.brandId : 'UNKNOWN-SKU';
    }))],
  }));

/* The order the rest of the trace follows: a routable one whose brand's payout
   destination is VERIFIED (the one seeded exception is brand-sennheiser). */
const routedPo = arrival.outcomes.find(
  (o) => o.status === 'ingested' && o.po && o.brandId !== 'brand-sennheiser'
)?.po ?? null;
out.tracedPo = routedPo
  ? {
      id: routedPo.id, poNumber: routedPo.poNumber, brandId: routedPo.brandId,
      status: routedPo.status, orderDate: routedPo.orderDate, poValue: routedPo.poValue,
      freightTerm: routedPo.freightTerm,
      lines: routedPo.lineItems.map((l) => ({ sku: l.sku, quantity: l.quantity, unitPrice: l.unitPrice })),
    }
  : null;

/* ── STEP 2 — A RE-READ IS IDEMPOTENT (nothing is filed twice) ─────────────── */
const second = await ingestChannelPurchaseOrders({ actorId: 'validator:commerce-loop' });
out.secondRead = {
  ingested: second.ingested, alreadyPresent: second.alreadyPresent, refused: second.refused,
  statuses: second.outcomes.map((o) => o.status),
};
out.mockPoCountAfterReRead = demoPurchaseOrders.filter((p) => p.poNumber.startsWith('MOCK-PO-')).length;
/* ── STEP 3 — THE BRAND DECIDES (the caller's clock, as §P13 designs it) ───── */
/**
 * The channel's simulated order arrived three days ago, so a decision taken "now"
 * would be PAST the 24-hour limit and the channel's documented action past the limit
 * is a REJECTION — an acceptance would be refused, correctly. The writer therefore
 * takes the CALLER'S clock (§P13), and a simulation decides inside the window that
 * received the order. The trace states the instant it used.
 */
const decidedAt = new Date(Date.parse(routedPo.orderDate + 'T00:00:00.000Z') + 6 * 3_600_000);
step('decision-clock', 'brand', 'acknowledgePurchaseOrder', 'decidedAt=' + decidedAt.toISOString());
const acks = routedPo.lineItems.map((l) => ({
  sku: l.sku, ackStatus: 'accepted', acknowledgedQty: l.quantity,
}));
const decision = acknowledgePurchaseOrder(routedPo.id, acks, undefined, decidedAt);
out.decision = {
  ok: decision.ok,
  error: decision.error ?? null,
  instructionId: decision.instructionId ?? null,
  timeliness: decision.timeliness ?? null,
  poStatusAfter: (demoPurchaseOrders.find((p) => p.id === routedPo.id) || {}).status ?? null,
};

/* ── STEP 4 — MERCENTA PERFORMS THE CHANNEL ACTION (never the brand) ───────── */
const instructionId = decision.instructionId ?? null;
const shipmentsBefore = demoShipments.length;
const processed = instructionId ? await processChannelInstruction(instructionId) : undefined;
out.mercentaAction = processed
  ? {
      instructionId: processed.id,
      state: processed.state,
      type: processed.type,
      purchaseOrderId: processed.purchaseOrderId,
      actionedAt: processed.outcome?.actionedAt ?? null,
      refusedReason: processed.outcome?.refusedReason ?? null,
      channelAcknowledgement: processed.outcome?.channelAcknowledgement ?? null,
      routingRequest: processed.outcome?.routingRequest ?? null,
      asn: processed.outcome?.asn ?? null,
      documentsGeneratedAt: processed.outcome?.documentsGeneratedAt ?? null,
      documentCount: processed.outcome?.documentCount ?? null,
      documentsReady: processed.outcome?.documentsReady ?? null,
    }
  : null;
out.shipmentsCreatedByMercenta = demoShipments.length - shipmentsBefore;
out.consignmentId = processed?.outcome?.asn?.shipmentId ?? null;
const consignment = demoShipments.find((s) => s.id === out.consignmentId) ?? null;
out.consignment = consignment
  ? {
      id: consignment.id, poNumber: consignment.poNumber, brandId: consignment.brandId,
      carrier: consignment.carrier ?? null, status: consignment.status,
      trackingNumber: consignment.trackingNumber ?? null, waybill: consignment.waybill ?? null,
    }
  : null;

/* Re-processing is IDEMPOTENT: no second channel action, no second consignment. */
const reprocessed = instructionId ? await processChannelInstruction(instructionId) : undefined;
out.reprocess = {
  sameActionedAt: (reprocessed?.outcome?.actionedAt ?? null) === (processed?.outcome?.actionedAt ?? null),
  shipmentsAfterReplay: demoShipments.length - shipmentsBefore,
};

/* ── STEP 5 — THE GOODS ARE RECEIVED → THE INVOICE IS AUTOMATIC (§S9) ──────── */
const opsActor = { staffId: 'staff-001', canMutate: true };
const receipt = receiveCommercePurchaseOrder(routedPo.id, opsActor);
out.receipt = receipt.ok
  ? {
      ok: true,
      poStatus: receipt.value.po.status,
      receivingStatus: receipt.value.receivingStatus,
      shortfalls: receipt.value.shortfalls.length,
      deductions: receipt.value.deductions.length,
      invoiceAutomation: {
        action: receipt.value.invoiceAutomation?.action ?? null,
        code: receipt.value.invoiceAutomation?.code ?? null,
        reason: receipt.value.invoiceAutomation?.reason ?? null,
      },
      invoice: receipt.value.invoice
        ? {
            id: receipt.value.invoice.id, number: receipt.value.invoice.number,
            status: receipt.value.invoice.status, subtotalGbp: receipt.value.invoice.subtotalGbp,
            termDays: receipt.value.invoice.termDays ?? null,
            /**
             * The due date is DERIVED by its owner (invoiceTerms.invoiceDueDate) —
             * never retyped arithmetic here, and never read from the invoice record,
             * which does not store it.
             */
            dueDate: invoiceDueDate(receipt.value.invoice),
            issuedAt: receipt.value.invoice.issuedAt,
            mode: receipt.value.invoice.mode ?? null, simulated: receipt.value.invoice.simulated ?? null,
          }
        : null,
      automationActor: RECEIPT_INVOICE_AUTOMATION_ACTOR_ID,
    }
  : { ok: false, error: receipt.error };
out.invoiceId = receipt.ok && receipt.value.invoice ? receipt.value.invoice.id : null;
/* ── STEP 6 — THE CHANNEL'S PAYMENT IS RECORDED, THEN RECONCILED ───────────── */
const invoiceId = out.invoiceId;
const payment = invoiceId ? recordCommercePayment(invoiceId, opsActor) : null;
out.payment = payment && payment.ok
  ? {
      ok: true, id: payment.value.id, amountGbp: payment.value.amountGbp,
      status: payment.value.status, method: payment.value.method,
      mode: payment.value.mode ?? null, simulated: payment.value.simulated ?? null,
      invoiceId: payment.value.invoiceId,
    }
  : { ok: false, error: payment ? payment.error : 'NO_INVOICE' };

const paymentId = payment && payment.ok ? payment.value.id : null;
const reconciliation = paymentId ? await reconcilePayment(paymentId, opsActor) : null;
out.reconciliation = reconciliation && reconciliation.ok
  ? {
      ok: true, id: reconciliation.value.id, state: reconciliation.value.state,
      netToBrandGbp: reconciliation.value.fact ? reconciliation.value.fact.netToBrandGbp : null,
      payoutEligible: reconciliation.value.payoutEligible ?? null,
      accounting: reconciliation.value.accounting
        ? reconciliation.value.accounting.provider + ' (' + reconciliation.value.accounting.mode + ')'
        : null,
    }
  : { ok: false, error: reconciliation ? reconciliation.error : 'NO_PAYMENT' };

/* ── STEP 7 — THE PAYOUT PROPOSAL, THE HUMAN APPROVAL, THE SETTLEMENT ──────── */
const commissionId = 'comm-' + routedPo.id;
const eligibilityBefore = evaluatePayoutEligibility(commissionId);
out.payoutEligibility = {
  commissionId,
  eligible: eligibilityBefore.eligible,
  blockers: eligibilityBefore.blockers,
  netAmountGbp: eligibilityBefore.netAmountGbp,
};
const settlement = await settleBrandPayout(commissionId, 'staff-001');
out.settlement = {
  ok: settlement.ok, mode: settlement.mode,
  transferId: settlement.transferId ?? null,
  netShareGbp: settlement.netShareGbp ?? null,
  error: settlement.error ?? null,
};
const payoutRecord = listAllPayouts().find((p) => p.commissionId === commissionId) ?? null;
out.payoutRecord = payoutRecord
  ? {
      id: payoutRecord.id, state: payoutRecord.state, attempts: payoutRecord.attempts,
      transferId: payoutRecord.transferId ?? null, mode: payoutRecord.mode,
      simulated: payoutRecord.simulated, destinationId: payoutRecord.destinationId ?? null,
      settledAt: payoutRecord.settledAt ?? null,
    }
  : null;
out.commissionStatusAfter = (getCommission(commissionId) || {}).status ?? null;

/* A SECOND settlement is REFUSED — a payout leaves Mercenta once. */
const secondSettlement = await settleBrandPayout(commissionId, 'staff-001');
out.secondSettlement = { ok: secondSettlement.ok, error: secondSettlement.error ?? null };
const payoutsForCommission = listAllPayouts().filter((p) => p.commissionId === commissionId).length;
out.payoutsForCommission = payoutsForCommission;

/* ── STEP 8 — THE CANONICAL AUDIT TRAIL (attribution, not prose) ───────────── */
out.auditTrail = demoAuditLog
  .filter((a) => a.brandId === routedPo.brandId)
  .slice(-10)
  .map((a) => ({ at: a.createdAt, actorId: a.actorId, action: a.action, entity: a.entityType, reason: a.reason }));

out.proxyActorId = PROXY_ACTOR_ID;
out.networkCalls = networkCalls;
console.log('__RESULT__' + JSON.stringify(out));



`;


/* ── Bundle the REAL modules through the project's own alias and run them ───── */

const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'mercenta-commerce-loop-'));
const entryPath = path.join(tmpDir, 'entry.ts');
const outPath = path.join(tmpDir, 'bundle.mjs');
fs.writeFileSync(entryPath, ENTRY, 'utf8');

let result;
try {
  execFileSync(
    path.join(ROOT, 'node_modules/.bin/esbuild'),
    [
      entryPath, '--bundle', '--format=esm', '--platform=node',
      /**
       * The ESM bundle carries supabase's CJS dependencies, which call `require()`
       * for Node built-ins (`stream`, …). Under ESM there is no ambient `require`, so
       * the bundle provides one via `createRequire` — the same shim any ESM bundle of
       * this project needs. Without it the bundle dies before any step runs.
       */
      '--banner:js=import{createRequire as __cr}from"module";const require=__cr(import.meta.url);',
      `--alias:@=${path.join(ROOT, 'src')}`, `--define:import.meta.env={}`,
      `--outfile=${outPath}`, '--log-level=error',
    ],
    { cwd: ROOT, stdio: ['ignore', 'inherit', 'inherit'] }
  );
  const stdout = execFileSync(process.execPath, [outPath], { cwd: ROOT, encoding: 'utf8' });
  result = JSON.parse(stdout.split('__RESULT__')[1]);
} catch (error) {
  console.log(`  FAIL  bundling/executing the real modules — ${String(error).slice(0, 1200)}`);
  console.log('');
  console.log('COMMERCE_LOOP_VALIDATION_FAIL (0 passed, 1 failed)');
  process.exit(1);
}

/* ── THE TRACE — what actually happened, step by step ──────────────────────── */

const line = (label, value) => console.log(`    ${String(label).padEnd(24)} ${value}`);

console.log('\n════ THE WHOLE LOOP, EXECUTED (one order, every step) ════\n');
console.log('STEP 1 — THE ORDER ARRIVES (read through the channel seam)');
line('seam mode', `${result.arrival.mode} (mock = NO live channel call was made)`);
line('orders read', result.arrival.polled);
line('routed/refused', `${result.arrival.ingested} routed · ${result.arrival.refused} refused · ${result.arrival.revised} revised · ${result.arrival.alreadyPresent} already held`);
console.log('STEP 2 — ROUTING BY SKU (who got what)');
for (const r of result.routingBySku) {
  line(r.channelPo, `-> ${r.routedTo}  (line SKUs belong to: ${r.skuBrands.join(', ')})`);
}
const refusedOutcome = result.arrivalOutcomes.find((o) => o.status === 'refused');
console.log('STEP 3 — THE DELIBERATELY UNMATCHED SKU (fail-closed)');
if (refusedOutcome) {
  line(refusedOutcome.channelPo, `${refusedOutcome.status} -> brandId ${JSON.stringify(refusedOutcome.brandId)}`);
  line('reason', refusedOutcome.reason);
} else {
  line('unmatched SKU', 'NO REFUSAL RETURNED — the fail-closed path is not covered');
}
console.log('STEP 4 — A SECOND READ IS IDEMPOTENT');
line('re-read', `${result.secondRead.ingested} new · ${result.secondRead.alreadyPresent} already held · ${result.secondRead.refused} refused`);
line('statuses', result.secondRead.statuses.join(', '));
line('channel POs held', result.mockPoCountAfterReRead);
;
console.log('STEP 5 — THE BRAND DECIDES');
line('order', `${result.tracedPo.poNumber} (${result.tracedPo.brandId})`);
line('decision', `${result.decision.ok ? 'ACCEPTED' : 'REFUSED'} · timeliness ${result.decision.timeliness}`);
line('writer', `acknowledgePurchaseOrder — actor "brand" · ${result.steps.find((s) => s.id === 'decision-clock')?.detail}`);
line('instruction', result.decision.instructionId);
line('PO status after', result.decision.poStatusAfter);
console.log('STEP 6 — MERCENTA PERFORMS THE CHANNEL ACTION');
const ma = result.mercentaAction;
line('actor', `${result.proxyActorId} (Mercenta — never the brand)`);
line('instruction state', ma ? ma.state : 'NOT PROCESSED');
line('channel ack', ma && ma.channelAcknowledgement
  ? `${ma.channelAcknowledgement.ok ? 'ok' : 'refused'} · id ${ma.channelAcknowledgement.acknowledgementId} · status ${ma.channelAcknowledgement.status} · mode ${ma.channelAcknowledgement.mode}`
  : 'none');
line('routing request', ma && ma.routingRequest
  ? `${ma.routingRequest.reference} · carrier ${ma.routingRequest.carrier} · mode ${ma.routingRequest.mode}`
  : 'none');
line('ASN (automatic)', ma && ma.asn
  ? `${ma.asn.filed ? 'FILED' : 'NOT FILED'} · consignment ${ma.asn.shipmentId} · channel confirmation ${ma.asn.channelConfirmationId ?? '—'} (${ma.asn.channelMode ?? '—'})`
  : 'none');
line('document pack', ma ? `${ma.documentCount} applicable · ${ma.documentsReady} ready · generated ${ma.documentsGeneratedAt}` : 'none');
line('consignments created', result.shipmentsCreatedByMercenta);
line('consignment', result.consignment
  ? `${result.consignment.id} · ${result.consignment.carrier} · ${result.consignment.status} · tracking ${result.consignment.trackingNumber}`
  : 'none');
line('replay', `same action instant ${result.reprocess.sameActionedAt} · consignments after replay ${result.reprocess.shipmentsAfterReplay}`);
console.log('STEP 7 — RECEIPT → AUTOMATIC INVOICE');
line('receipt', result.receipt.ok
  ? `PO ${result.receipt.poStatus} · receiving ${result.receipt.receivingStatus} · shortfalls ${result.receipt.shortfalls} · deductions ${result.receipt.deductions}`
  : JSON.stringify(result.receipt));
line('automation', result.receipt.ok ? `${result.receipt.invoiceAutomation.action} (${result.receipt.invoiceAutomation.code}) · actor ${result.receipt.automationActor}` : '—');
line('invoice', result.receipt.ok && result.receipt.invoice
  ? `${result.receipt.invoice.number} · £${result.receipt.invoice.subtotalGbp} · terms ${result.receipt.invoice.termDays}d · due ${result.receipt.invoice.dueDate} · ${result.receipt.invoice.status}`
  : 'NONE');
console.log('STEP 8 — PAYMENT → RECONCILIATION');
line('payment', result.payment.ok
  ? `£${result.payment.amountGbp} · ${result.payment.status} · ${result.payment.method} · simulated ${result.payment.simulated}`
  : JSON.stringify(result.payment));
line('reconciliation', result.reconciliation.ok
  ? `${result.reconciliation.state} · net to brand £${result.reconciliation.netToBrandGbp} · accounting ${result.reconciliation.accounting}`
  : JSON.stringify(result.reconciliation));
console.log('STEP 9 — PAYOUT PROPOSAL → HUMAN APPROVAL → SETTLEMENT');
line('eligibility', `${result.payoutEligibility.eligible ? 'ELIGIBLE' : 'BLOCKED'} · blockers: ${result.payoutEligibility.blockers.length === 0 ? 'none' : result.payoutEligibility.blockers.join('; ')}`);
line('settlement', `${result.settlement.ok ? 'SETTLED' : 'REFUSED'} · £${result.settlement.netShareGbp} · transfer ${result.settlement.transferId} · mode ${result.settlement.mode}`);
line('payout record', result.payoutRecord
  ? `${result.payoutRecord.state} · attempts ${result.payoutRecord.attempts} · simulated ${result.payoutRecord.simulated} · destination ${result.payoutRecord.destinationId}`
  : 'NONE');
line('commission', result.commissionStatusAfter);
line('second attempt', `${result.secondSettlement.ok ? 'PAID AGAIN (DEFECT)' : 'refused'} · ${result.secondSettlement.error}`);
line('payout rows', result.payoutsForCommission);
console.log('STEP 10 — THE AUDIT TRAIL (who acted, on what)');
for (const a of result.auditTrail) {
  line(a.action, `${a.actorId} · ${a.entity} · ${a.reason.slice(0, 110)}`);
}
;


/* ── §1. THE ARRIVAL LEG — routed by SKU, and fail-closed on an unknown SKU ── */
console.log('\n§ 1. Arrival + routing (by SKU, derived — never supplied by a caller)\n');
check('the read ran through the channel seam in SIMULATION (no live call)',
  result.arrival.ok === true && result.arrival.mode === 'mock', `mode ${result.arrival.mode}`);
check('at least one order was routed and at least one was refused',
  result.arrival.ingested >= 1 && result.arrival.refused >= 1,
  `ingested ${result.arrival.ingested}, refused ${result.arrival.refused}`);
check('EVERY routed order landed with the brand that owns the ordered SKUs',
  result.routingBySku.length >= 1 &&
    result.routingBySku.every((r) => r.skuBrands.length === 1 && r.skuBrands[0] === r.routedTo),
  JSON.stringify(result.routingBySku));
check('an order whose line matches NO catalogue product is refused WHOLE (brandId null)',
  !!refusedOutcome && refusedOutcome.brandId === null &&
    /matches no product|held for Mercenta review/i.test(refusedOutcome.reason ?? ''),
  refusedOutcome ? refusedOutcome.reason : 'no refusal returned');
check('a re-read files nothing new (the channel PO id is the record identity)',
  result.secondRead.ingested === 0 &&
    result.secondRead.alreadyPresent === result.arrival.ingested &&
    result.mockPoCountAfterReRead === result.arrival.ingested,
  `new ${result.secondRead.ingested}, already held ${result.secondRead.alreadyPresent}, held ${result.mockPoCountAfterReRead}`);

/* ── §2. THE BRAND'S DECISION BECOMES AN INSTRUCTION MERCENTA PERFORMS ─────── */
console.log('\n§ 2. The decision is an INSTRUCTION; MERCENTA performs the channel action\n');
check('the brand acceptance was recorded on the order (inside the 24-hour window)',
  result.decision.ok === true && result.decision.timeliness === 'on_time' &&
    result.decision.poStatusAfter === 'accepted',
  `ok ${result.decision.ok}, timeliness ${result.decision.timeliness}, status ${result.decision.poStatusAfter} — ${result.decision.error}`);
check('the decision produced an INSTRUCTION record (never a direct brand->channel call)',
  typeof result.decision.instructionId === 'string' && result.decision.instructionId.startsWith('instr-ack-'),
  String(result.decision.instructionId));
check('MERCENTA (not the brand) actioned it, and the channel answered through the seam',
  !!result.mercentaAction && result.mercentaAction.state === 'actioned' &&
    !!result.mercentaAction.channelAcknowledgement &&
    result.mercentaAction.channelAcknowledgement.ok === true &&
    result.mercentaAction.channelAcknowledgement.mode === 'mock' &&
    !!result.mercentaAction.channelAcknowledgement.acknowledgementId,
  JSON.stringify(result.mercentaAction && result.mercentaAction.channelAcknowledgement));
check('the acting identity is Mercenta proxy automation, not a brand session',
  /mercenta/i.test(result.proxyActorId), result.proxyActorId);
check('the routing/shipment request was raised through the channel too',
  !!result.mercentaAction.routingRequest && result.mercentaAction.routingRequest.raised === true &&
    result.mercentaAction.routingRequest.mode === 'mock',
  JSON.stringify(result.mercentaAction.routingRequest));

/* ── §3. THE ASN IS AUTOMATIC, THE CONFIRMATION IS SENT, THE REPLAY IS SAFE ── */
console.log('\n§ 3. The ASN is automatic on acceptance, the confirmation is sent, the replay is safe\n');
check('the ASN was FILED automatically on acceptance, with a consignment identity',
  !!result.mercentaAction.asn && result.mercentaAction.asn.filed === true && !!result.consignmentId,
  JSON.stringify(result.mercentaAction.asn));
check('the consignment exists in the canonical store against that PO and brand',
  !!result.consignment && result.consignment.poNumber === result.tracedPo.poNumber &&
    result.consignment.brandId === result.tracedPo.brandId,
  JSON.stringify(result.consignment));
check('the channel CONFIRMED the shipment (its own id, recorded with the seam mode)',
  !!result.mercentaAction.asn && !!result.mercentaAction.asn.channelConfirmationId &&
    result.mercentaAction.asn.channelMode === 'mock',
  JSON.stringify(result.mercentaAction.asn));
check('exactly ONE consignment was created — and a replay created no second one',
  result.shipmentsCreatedByMercenta === 1 && result.reprocess.sameActionedAt === true &&
    result.reprocess.shipmentsAfterReplay === 1,
  `created ${result.shipmentsCreatedByMercenta}, replay ${result.reprocess.shipmentsAfterReplay}`);
check('the document pack was generated automatically on acceptance',
  result.mercentaAction.documentCount > 0 && !!result.mercentaAction.documentsGeneratedAt,
  JSON.stringify({ count: result.mercentaAction.documentCount, ready: result.mercentaAction.documentsReady, at: result.mercentaAction.documentsGeneratedAt }));

/* ── §4. THE MONEY CHAIN REACHES A SETTLED, IDEMPOTENT PAYOUT ─────────────── */
console.log('\n§ 4. Receipt → invoice → payment → reconciliation → payout (settled, once)\n');
/**
 * The declared action vocabulary and term choices are read from their ONE owners
 * rather than retyped, so a rename can never make these assertions vacuous.
 */
const automationActorId =
  (read('src/lib/commerce/receiptInvoiceAutomation.ts').match(
    /RECEIPT_INVOICE_AUTOMATION_ACTOR_ID\s*=\s*'([^']+)'/
  ) || [])[1] ?? null;
const automationIssuedAction =
  (read('src/lib/commerce/receiptInvoiceAutomation.ts').match(
    /ReceiptInvoiceAutomationAction\s*=\s*'([^']+)'/
  ) || [])[1] ?? null;
const termChoices = (read('src/types.ts').match(
  /INVOICE_TERM_CHOICES\s*=\s*\[([^\]]+)\]/
) || [])[1]
  ?.split(',')
  .map((v) => Number(v.trim().replace(/[^0-9]/g, '')))
  .filter((n) => Number.isFinite(n)) ?? [];
check('the receipt was recorded and the PO reached DELIVERED',
  result.receipt.ok === true && result.receipt.poStatus === 'delivered' &&
    result.receipt.shortfalls === 0 && result.receipt.deductions === 0,
  JSON.stringify(result.receipt).slice(0, 300));
check('the invoice was raised AUTOMATICALLY by the declared automation identity',
  result.receipt.ok === true && !!automationIssuedAction &&
    result.receipt.invoiceAutomation.action === automationIssuedAction &&
    !!automationActorId && result.receipt.automationActor === automationActorId,
  result.receipt.ok ? `${result.receipt.invoiceAutomation.action} (${result.receipt.invoiceAutomation.code}) · ${result.receipt.automationActor} (owner: ${automationActorId})` : 'no receipt');
check('the invoice is a real amount with a declared term and a derived due date',
  result.receipt.ok === true && !!result.receipt.invoice && result.receipt.invoice.subtotalGbp > 0 &&
    termChoices.includes(result.receipt.invoice.termDays) && !!result.receipt.invoice.dueDate,
  result.receipt.ok ? JSON.stringify(result.receipt.invoice) : 'no invoice');
check('the channel payment is recorded as SIMULATED (no payment provider contacted)',
  result.payment.ok === true && result.payment.simulated === true && result.payment.status === 'settled',
  JSON.stringify(result.payment));
check('the payment is reconciled to the PO (the gate a payout depends on)',
  result.reconciliation.ok === true && result.reconciliation.state === 'reconciled',
  JSON.stringify(result.reconciliation));
check('the payout is ELIGIBLE with NO blockers once the money is reconciled',
  result.payoutEligibility.eligible === true && result.payoutEligibility.blockers.length === 0,
  result.payoutEligibility.blockers.join('; '));
check('the payout SETTLED through the simulated rail and is marked simulated',
  result.settlement.ok === true && !!result.settlement.transferId &&
    result.settlement.mode === 'mock' && !!result.payoutRecord &&
    result.payoutRecord.state === 'settled' && result.payoutRecord.simulated === true,
  JSON.stringify({ settlement: result.settlement, payout: result.payoutRecord }));
check('the commission is marked paid after settlement',
  result.commissionStatusAfter === 'paid', String(result.commissionStatusAfter));
check('a SECOND settlement is REFUSED and no second payout row exists (double-payout guard)',
  result.secondSettlement.ok === false && result.payoutsForCommission === 1,
  `second ok ${result.secondSettlement.ok}, rows ${result.payoutsForCommission}`);

/* ── §5. ZERO NETWORK ─────────────────────────────────────────────────────── */
console.log('\n§ 5. No live network call was attempted anywhere in the loop\n');
check('the whole loop made ZERO external calls', result.networkCalls === 0, `observed ${result.networkCalls}`);

/* ── §6. THE LABEL / DOCUMENT QUESTION — THE TRUTH, FROM THE SOURCE ───────── */
console.log('\n§ 6. Question 4 — can a brand DOWNLOAD a label/document for the consignment?\n');
const packPanel = code('src/components/shared/logistics/PoDocumentPackPanel.tsx');
const hub = code('src/components/brand/LogisticsHub.tsx');
const logisticsDir = path.join(ROOT, 'src/components/shared/logistics');
const walked = fs.readdirSync(logisticsDir, { withFileTypes: true }).flatMap((entry) =>
  entry.isDirectory()
    ? []
    : /\.(ts|tsx)$/.test(entry.name)
      ? [path.join(logisticsDir, entry.name)]
      : []
);
const logisticsCode = walked
  .map((f) => fs.readFileSync(f, 'utf8').replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/[^\n]*/g, ''))
  .join('\n');

check('the pack surface offers an OPEN control for an inline document',
  /Open/.test(packPanel) && /setOpenDoc/.test(packPanel));
check('the pack surface offers a PRINT control that opens the carrier own dialogue',
  /Print/.test(packPanel) && /onOpenCarrierArtefact/.test(packPanel));
check('the carrier label dialogue renders a PRINTABLE label and calls window.print()',
  /printable-label/.test(hub) && /window\.print\(\)/.test(hub) && /Print labels/.test(hub));
check('NO consignment document is offered as a FILE DOWNLOAD anywhere in logistics',
  !/createObjectURL/.test(logisticsCode) && !/\.download\s*=/.test(logisticsCode) &&
    !/createObjectURL/.test(packPanel),
  'a download control was found — the answer below would be wrong');
check('the pack surface cannot claim a download it does not implement',
  !/Download/.test(packPanel),
  'the panel promises a download it does not perform');
console.log('  ANSWER: the brand can OPEN and PRINT every applicable document (the carrier');
console.log('          label/waybill through the carrier own dialogue, which calls the');
console.log('          browser print dialog — "Save as PDF" is the browser, not ours).');
console.log('          There is NO file-download control for a consignment document.');
console.log('          That is a GAP against programme decision 6 ("brands download their');
console.log('          shipping labels + ALL PO documents") and needs the owner decision D3.');

/* ── Summary ──────────────────────────────────────────────────────────────── */
console.log('');
console.log(
  `COMMERCE_LOOP_VALIDATION_${fail === 0 ? 'PASS' : `FAIL (${fail})`} (${pass} passed, ${fail} failed, ${pass + fail} checks)`
);
if (fail > 0) {
  console.log('\nFailures:');
  for (const e of errors) console.log(`  · ${e}`);
}
process.exit(fail === 0 ? 0 : 1);
