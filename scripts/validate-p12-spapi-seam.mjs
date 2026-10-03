#!/usr/bin/env node
/**
 * §P12 — SP-API SEAM EXTENSION CONTRACT VALIDATOR (`AV-040`).
 *
 * Programme `docs/DASHBOARD_LOGISTICS_CLEANUP_PROGRAMME_2026-09-22.md` §4 P12. §P4
 * built `submitAcknowledgement` and §P11 the purchase-order read; this phase
 * completes the channel's documented vendor surface:
 *
 *   getPurchaseOrdersStatus · submitShipmentRequest · getShipmentDetails ·
 *   getShipmentLabels · submitShipmentConfirmations · submitInvoices ·
 *   submitInventoryUpdate
 *
 * The validator EXECUTES the real modules (bundled with the project's own esbuild,
 * through the project's own `@/` alias) rather than grepping source text, and it
 * makes ZERO network calls — any call is recorded and fails the run.
 *
 * Run: node scripts/validate-p12-spapi-seam.mjs
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
const stripComments = (src) => src.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/[^\n]*/g, '');

/* ── Bundle the REAL modules and execute them ─────────────────────────────── */

const ENTRY = `
import { createMockSpApiClient, resetMockAmazonState } from '@/lib/spapi/mockClient';
import { createSpApiClient } from '@/lib/spapi/client';
import { createSPApiClientForConnection } from '@/lib/spapi';
import { channelShipmentLabelsAvailability } from '@/config/shipping';
import { UK_MARKETPLACE_ID } from '@/lib/spapi/transform';
import {
  readChannelReceivingStatus, applyChannelReceivingReading,
} from '@/lib/commerce/channelReceivingSync';
import {
  raiseChannelShipmentRequest, readChannelRoutingInstructions,
  fileChannelShipmentConfirmation,
} from '@/lib/shipping/channelShipmentOperations';
import {
  submitInvoiceToChannel, channelInvoiceSubmission, resetChannelInvoiceSubmissions,
} from '@/lib/commerce/channelInvoiceSubmission';
import { pushInventoryToChannel } from '@/lib/inventory/channelInventoryPush';
import { declaredShipToParty } from '@/config/destinationFc';
import { TRUCKLOAD_CONFIRMATION_LIMIT } from '@/lib/shipping/consolidation';
import { earliestRequestedPickUp } from '@/lib/shipping/collectChain';
import { demoProducts, demoPurchaseOrders } from '@/data/demoStore';
import { ingestChannelPurchaseOrders } from '@/lib/commerce/channelPurchaseOrderIngestion';

/* Zero network: any external call is recorded and fails the validator. */
let fetchCalls = 0;
const realFetch = globalThis.fetch;
globalThis.fetch = function () { fetchCalls += 1; return realFetch.apply(null, arguments); };

const attemptAsync = async function (fn) {
  try { return { threw: false, value: await fn() }; }
  catch (e) { return { threw: true, message: String(e && e.message ? e.message : e) }; }
};

resetMockAmazonState();
const mock = createMockSpApiClient();
const FC = declaredShipToParty(1).partyId;
const out = {};
const typed = (r) => (r.threw ? { threw: true, message: r.message } : { threw: false, ok: r.value.ok });
const refused = (r) => (r.threw
  ? { threw: true, message: r.message }
  : {
      threw: false, ok: r.value.ok,
      refusal: r.value.refusal ?? r.value.error ?? r.value.refusedReason ?? null,
    });

/* 1/2 — the real client's operations without a verified connection. */
const locked = createSpApiClient(() => null, '/fn');
out.locked = {
  status: await attemptAsync(() => locked.getPurchaseOrdersStatus(['A'])),
  request: await attemptAsync(() => locked.submitShipmentRequest({ purchaseOrderNumbers: ['A'], freightTerm: 'collect', shipToPartyId: 'X' })),
  details: await attemptAsync(() => locked.getShipmentDetails('A')),
  confirmations: await attemptAsync(() => locked.submitShipmentConfirmations({ shipmentId: 'A', purchaseOrderNumbers: ['A'], cartons: [{ cartonId: 'C1', vendorSku: 'S', quantity: 1, purchaseOrderNumber: 'A' }] })),
  invoices: await attemptAsync(() => locked.submitInvoices({ purchaseOrderNumber: 'A', invoiceNumber: 'N', invoiceDate: '2026-09-20', currency: 'GBP', total: 1, lines: [] })),
  inventory: await attemptAsync(() => locked.submitInventoryUpdate({ sku: 'S', quantity: 1, unitOfMeasure: 'Eaches' })),
};
out.lockedMethods = Object.keys(locked).sort();
out.mockMethods = Object.keys(mock).sort();

/* 2 — the label region rule, in both clients, before any network work. */
let labelTransportCalls = 0;
const counting = async () => { labelTransportCalls += 1; return { ok: true, status: 200, json: async () => ({}) }; };
const ukClient = createSpApiClient(() => ({ secretRef: 'vault:sp', marketplaceId: UK_MARKETPLACE_ID, verified: true }), '/fn', counting);
const naClient = createSpApiClient(() => ({ secretRef: 'vault:sp', marketplaceId: 'ATVPDKIKX0DER', verified: true }), '/fn', counting);
const ukLabels = await attemptAsync(() => ukClient.getShipmentLabels('any'));
const naLabels = await attemptAsync(() => naClient.getShipmentLabels('any'));
out.labels = {
  uk: { threw: ukLabels.threw, refused: ukLabels.threw ? null : ukLabels.value.refused, reason: ukLabels.threw ? null : ukLabels.value.refusedReason },
  na: { threw: naLabels.threw, refused: naLabels.threw ? null : naLabels.value.refused, ok: naLabels.threw ? null : naLabels.value.ok },
  naTransportCalls: labelTransportCalls,
  mock: refused(await attemptAsync(() => mock.getShipmentLabels('any'))),
  availabilityUk: channelShipmentLabelsAvailability(UK_MARKETPLACE_ID),
  availabilityUnknown: channelShipmentLabelsAvailability('NOT-A-MARKETPLACE'),
  availabilityNa: channelShipmentLabelsAvailability('ATVPDKIKX0DER'),
};

/* 3/4 — the receiving sync, and the fail-closed apply path. */
/*
 * The product's real order of operations: the channel's purchase orders are
 * INGESTED first (§P11, the ONE PO entry point), and only then can the receiving
 * sync be read against them — a status for a purchase order Mercenta does not hold
 * is refused by the sync, which is asserted below.
 */
const ingested = await ingestChannelPurchaseOrders({
  reader: mock,
  catalogue: demoProducts.map((p) => ({ sku: p.sku, brandId: p.brandId })),
  sinceIso: '2026-08-01T00:00:00.000Z',
  actorId: 'staff-test',
});
out.ingested = { polled: ingested.polled, ingested: ingested.ingested, refused: ingested.refused };
const canonicalNumbers = demoPurchaseOrders
  .filter((p) => !/^MOCK-PO-/.test(p.poNumber))
  .slice(0, 2)
  .map((p) => p.poNumber);
const receiving = await readChannelReceivingStatus({
  reader: mock, purchaseOrderIds: ['MOCK-PO-8841', 'MOCK-PO-8842', 'NOT-A-PO'],
});
out.receiving = {
  ok: receiving.ok, mode: receiving.mode,
  readings: receiving.readings.map((r) => ({
    id: r.channelPurchaseOrderId, status: r.channelStatus, receiving: r.channelReceivingStatus,
    poId: r.poId, brandId: r.brandId, lines: r.lines.length,
    received: r.lines.reduce((s, l) => s + l.receivedQty, 0),
    mercenta: r.mercentaReceivingStatus, differs: r.differs, simulated: r.simulated,
  })),
  unknown: receiving.unknownPurchaseOrderIds,
  refusedCount: receiving.refused.length,
};
const overCanonical = await readChannelReceivingStatus({ reader: mock, purchaseOrderIds: canonicalNumbers });
out.overCanonical = { ids: canonicalNumbers, unknown: overCanonical.unknownPurchaseOrderIds, readings: overCanonical.readings.length };
const empty = await readChannelReceivingStatus({ reader: mock, purchaseOrderIds: [] });
out.emptySync = { ok: empty.ok, mode: empty.mode, readings: empty.readings.length };
const simulatedReading = receiving.readings[0];
out.applySimulated = applyChannelReceivingReading({
  reading: simulatedReading, actorId: 'staff-test', writer: { receive: () => ({ ok: true }) },
});
let capturedBySku = null;
out.applyLive = applyChannelReceivingReading({
  reading: Object.assign({}, simulatedReading, { simulated: false }),
  actorId: 'staff-test',
  writer: { receive: (input) => { capturedBySku = input.receivedBySku; return { ok: true, receivingStatus: 'received' }; } },
});
out.applyCaptured = capturedBySku;
out.applyWriterRefusal = applyChannelReceivingReading({
  reading: Object.assign({}, simulatedReading, { simulated: false }),
  actorId: 'staff-test',
  writer: { receive: () => ({ ok: false, error: 'FORBIDDEN — the acting account is view-only.' }) },
});

/* the CHANNEL's OWN client-level guards (reachable by calling the seam directly) */
out.clientGuards = {
  requestEmpty: refused(await attemptAsync(() => mock.submitShipmentRequest({ purchaseOrderNumbers: [], freightTerm: 'collect', shipToPartyId: 'X' }))),
  requestTooLarge: refused(await attemptAsync(() => mock.submitShipmentRequest({ purchaseOrderNumbers: Array.from({ length: TRUCKLOAD_CONFIRMATION_LIMIT + 1 }, (_, i) => 'PO-' + i), freightTerm: 'collect', shipToPartyId: 'X' }))),
  statusIdsEmpty: refused(await attemptAsync(() => mock.getPurchaseOrdersStatus([]))),
  invoiceNumberMissing: refused(await attemptAsync(() => mock.submitInvoices({ purchaseOrderNumber: 'A', invoiceNumber: '  ', invoiceDate: '2026-09-20', currency: 'GBP', total: 1, lines: [] }))),
  inventorySkuMissing: refused(await attemptAsync(() => mock.submitInventoryUpdate({ sku: '', quantity: 1, unitOfMeasure: 'Eaches' }))),
};

/* 5/6 — the shipment request, the routing instructions, and the ASN. */
const single = [{ poNumber: 'MOCK-PO-8842', brandId: 'brand-tapatio' }];
const request = await raiseChannelShipmentRequest({
  reader: mock, purchaseOrders: single, freightTerm: 'collect', shipToPartyId: FC, requestedPickUp: earliestRequestedPickUp(),
});
out.request = request;
out.requestEmpty = await raiseChannelShipmentRequest({
  reader: mock, purchaseOrders: [], freightTerm: 'collect', shipToPartyId: FC,
});
out.requestDuplicate = await raiseChannelShipmentRequest({
  reader: mock,
  purchaseOrders: [{ poNumber: 'MOCK-PO-8842', brandId: 'brand-tapatio' }, { poNumber: 'MOCK-PO-8842', brandId: 'brand-tapatio' }],
  freightTerm: 'collect', shipToPartyId: FC,
});
out.requestCrossTenant = await raiseChannelShipmentRequest({
  reader: mock,
  purchaseOrders: [{ poNumber: 'MOCK-PO-8841', brandId: 'brand-astonish' }, { poNumber: 'MOCK-PO-8842', brandId: 'brand-tapatio' }],
  freightTerm: 'collect', shipToPartyId: FC,
});
out.requestTooLarge = await raiseChannelShipmentRequest({
  reader: mock,
  purchaseOrders: Array.from({ length: TRUCKLOAD_CONFIRMATION_LIMIT + 1 }, (_, i) => ({ poNumber: 'PO-' + i, brandId: 'brand-tapatio' })),
  freightTerm: 'collect', shipToPartyId: FC,
});
/* §BATCH 2m (AV-014) — the pickup lead time is ENFORCED (refusals do not reach the channel). */
out.requestTooEarlyPickUp = await raiseChannelShipmentRequest({
  reader: mock, purchaseOrders: single, freightTerm: 'collect', shipToPartyId: FC, requestedPickUp: '2000-01-01',
});
out.requestMissingPickUp = await raiseChannelShipmentRequest({
  reader: mock, purchaseOrders: single, freightTerm: 'collect', shipToPartyId: FC,
});
out.requestUnreadablePickUp = await raiseChannelShipmentRequest({
  reader: mock, purchaseOrders: single, freightTerm: 'collect', shipToPartyId: FC, requestedPickUp: 'next-tuesday',
});
out.truckloadLimit = TRUCKLOAD_CONFIRMATION_LIMIT;
const requestId = request.shipmentRequestId;
const routingFirst = await readChannelRoutingInstructions({ reader: mock, shipmentRequestId: requestId });
const routingSecond = await readChannelRoutingInstructions({ reader: mock, shipmentRequestId: requestId });
const routingUnknown = await readChannelRoutingInstructions({ reader: mock, shipmentRequestId: 'MOCK-SHP-REQ-99999' });
out.routing = {
  first: { ok: routingFirst.ok, pending: routingFirst.pending, hasInstructions: !!routingFirst.instructions, mode: routingFirst.mode },
  second: { ok: routingSecond.ok, pending: routingSecond.pending, arn: routingSecond.instructions ? routingSecond.instructions.arn : null, mode: routingSecond.instructions ? routingSecond.instructions.mode : null },
  unknown: { ok: routingUnknown.ok, pending: routingUnknown.pending, refusal: routingUnknown.refusal },
};
const po8842 = demoPurchaseOrders.find((p) => p.poNumber === 'MOCK-PO-8842');
const cartonSku = po8842.lineItems[0].sku;
out.cartonSku = cartonSku;
const cartons = [{ cartonId: 'C1', vendorSku: cartonSku, quantity: 10, purchaseOrderNumber: 'MOCK-PO-8842' }];
out.confirmation = await fileChannelShipmentConfirmation({
  reader: mock, shipmentId: 'shp-1', purchaseOrderNumbers: ['MOCK-PO-8842'], cartons, carrier: 'carrier',
});
out.confirmationEmpty = await fileChannelShipmentConfirmation({
  reader: mock, shipmentId: 'shp-1', purchaseOrderNumbers: ['MOCK-PO-8842'], cartons: [],
});
out.confirmationNoPos = await fileChannelShipmentConfirmation({
  reader: mock, shipmentId: 'shp-1', purchaseOrderNumbers: [], cartons,
});
out.confirmationOutside = await fileChannelShipmentConfirmation({
  reader: mock, shipmentId: 'shp-1', purchaseOrderNumbers: ['MOCK-PO-8842'],
  cartons: [{ cartonId: 'C9', vendorSku: 'X', quantity: 1, purchaseOrderNumber: 'OTHER-PO' }],
});
const afterConfirmation = await readChannelReceivingStatus({ reader: mock, purchaseOrderIds: ['MOCK-PO-8842'] });
out.afterConfirmation = afterConfirmation.readings.map((r) => ({
  id: r.channelPurchaseOrderId, status: r.channelStatus, receiving: r.channelReceivingStatus,
  received: r.lines.reduce((s, l) => s + l.receivedQty, 0), date: r.receivedDate ? 'present' : null,
}));

/* 8 — invoice submission (submitInvoices, AV-022). */
resetChannelInvoiceSubmissions();
const invoice = {
  id: 'cinv-brand-tapatio-MOCK-PO-8842', brandId: 'brand-tapatio', purchaseOrderId: 'po-x',
  poNumber: 'MOCK-PO-8842', number: 'SIM-INV-MOCK-PO-8842', lines: [], subtotalGbp: 250,
  status: 'issued', currency: 'GBP', mode: 'simulation', simulated: true, issuedAt: '2026-09-20T09:00:00.000Z',
};
const submit = (inv) => submitInvoiceToChannel({
  reader: mock, invoice: inv, poNumber: inv.poNumber, invoiceDate: inv.issuedAt.slice(0, 10),
  lines: [{ vendorSku: 'TPIO-001', quantity: 10, unitPrice: 25 }],
});
out.invoice = await submit(invoice);
out.invoiceAgain = await submit(invoice);
out.invoiceCancelled = await submit(Object.assign({}, invoice, { id: 'cinv-2', status: 'cancelled' }));
out.invoiceZero = await submit(Object.assign({}, invoice, { id: 'cinv-3', subtotalGbp: 0 }));
out.invoiceReusedNumber = await submit(Object.assign({}, invoice, { id: 'cinv-4' }));
out.invoiceRecorded = !!channelInvoiceSubmission(invoice.id);

/* 9 — the stock push, DERIVED from the ledger (submitInventoryUpdate). */
const movement = (bucket, delta, type, id) => ({
  id, brandId: 'brand-tapatio', sku: 'TPIO-001', productId: 'prd-tapatio', bucket,
  quantityDelta: delta, enteredQuantity: delta, enteredUom: 'eaches',
  unitsPerCaseUsed: 1, type, actorId: 'seed', recordedAt: '2026-09-01T00:00:00.000Z',
});
const ledger = [movement('on_hand', 120, 'opening', 'm1'), movement('committed', 20, 'commitment', 'm2')];
const product = { sku: 'TPIO-001', brandId: 'brand-tapatio', unitsPerCase: 12 };
out.push = {
  eaches: await pushInventoryToChannel({ reader: mock, product, movements: ledger }),
  cases: await pushInventoryToChannel({ reader: mock, product, movements: ledger, unitOfMeasure: 'Cases' }),
  badUnit: await pushInventoryToChannel({ reader: mock, product: { sku: 'TPIO-001', brandId: 'brand-tapatio' }, movements: ledger, unitOfMeasure: 'Pallets' }),
  lossyCases: await pushInventoryToChannel({ reader: mock, product: { sku: 'TPIO-001', brandId: 'brand-tapatio', unitsPerCase: 7 }, movements: ledger, unitOfMeasure: 'Cases' }),
  negative: await pushInventoryToChannel({ reader: mock, product: { sku: 'TPIO-001', brandId: 'brand-tapatio' }, movements: [movement('on_hand', -5, 'adjustment', 'm3')] }),
};

/* 10 — the seam still selects mock vs real by CREDENTIAL alone. */
out.seam = {
  none: createSPApiClientForConnection({ credentials: null, edgeFunctionBase: '/x' }).mode,
  mockRef: createSPApiClientForConnection({ credentials: { secretRef: 'mock:abc', marketplaceId: 'M', verified: true }, edgeFunctionBase: '/x' }).mode,
  verified: createSPApiClientForConnection({ credentials: { secretRef: 'vault:sp', marketplaceId: 'M', verified: true }, edgeFunctionBase: '/x' }).mode,
};
out.network = fetchCalls;

console.log('__RESULT__' + JSON.stringify(out));
`;

const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'mercenta-p12-seam-'));
const entryPath = path.join(tmpDir, 'entry.ts');
const outPath = path.join(tmpDir, 'bundle.mjs');
fs.writeFileSync(entryPath, ENTRY, 'utf8');

let result;
try {
  execFileSync(
    path.join(ROOT, 'node_modules/.bin/esbuild'),
    [
      entryPath,
      '--bundle',
      '--format=esm',
      '--platform=node',
      `--alias:@=${path.join(ROOT, 'src')}`,
      '--define:import.meta.env={}',
      `--outfile=${outPath}`,
      '--log-level=error',
    ],
    { cwd: ROOT, stdio: ['ignore', 'inherit', 'inherit'] }
  );
  const stdout = execFileSync(process.execPath, [outPath], { cwd: ROOT, encoding: 'utf8' });
  result = JSON.parse(stdout.split('__RESULT__')[1]);
} catch (error) {
  console.log(`  FAIL  bundling/executing the real modules — ${String(error).slice(0, 600)}`);
  console.log('');
  console.log('P12_SPAPI_SEAM_VALIDATION_FAIL (0 passed, 1 failed)');
  process.exit(1);
}

/* ── 1. BOTH clients implement the whole documented vendor surface ────────── */

const SEVEN = [
  'getPurchaseOrdersStatus',
  'getShipmentDetails',
  'getShipmentLabels',
  'submitInvoices',
  'submitInventoryUpdate',
  'submitShipmentConfirmations',
  'submitShipmentRequest',
];

console.log('§P12 — both clients implement the seven documented operations');
check(
  'the MOCK client implements every §P12 operation',
  SEVEN.every((m) => result.mockMethods.includes(m)),
  result.mockMethods.join(',')
);
check(
  'the REAL client implements every §P12 operation',
  SEVEN.every((m) => result.lockedMethods.includes(m)),
  result.lockedMethods.join(',')
);
check(
  'the two clients expose the SAME operation set (swappable by credential alone)',
  SEVEN.every((m) => result.mockMethods.includes(m) === result.lockedMethods.includes(m))
);

/* ── 2. the label region rule ─────────────────────────────────────────────── */

console.log('§P12 — GetShipmentLabels is REFUSED BY RULE for UK/EU (never claimed)');
check(
  'a UK/EU marketplace is REFUSED as a RULE (not a provider error)',
  result.labels.uk.threw === false &&
    result.labels.uk.refused === true &&
    /NA only/i.test(result.labels.uk.reason ?? ''),
  JSON.stringify(result.labels.uk)
);
check(
  'the UK/EU refusal happens BEFORE any credential or network work',
  result.labels.naTransportCalls === 1,
  String(result.labels.naTransportCalls)
);
check(
  'a declared NA marketplace is offered the operation (the rule is region-scoped, not a blanket refusal)',
  result.labels.na.refused !== true && result.labels.na.ok === true,
  JSON.stringify(result.labels.na)
);
check(
  'the SIMULATED channel refuses the same way (it never fabricates a channel label)',
  /^LABELS_NOT_GENERATED_IN_REGION/.test(result.labels.mock.refusal ?? '') &&
    /never issues a channel-generated label for a UK\/EU consignment/.test(result.labels.mock.refusal ?? ''),
  JSON.stringify(result.labels.mock)
);
check(
  'an UNKNOWN marketplace fails closed',
  result.labels.availabilityUnknown.available === false &&
    result.labels.availabilityUnknown.region === 'unknown' &&
    /MARKETPLACE_REGION_UNKNOWN/.test(result.labels.availabilityUnknown.reason),
  JSON.stringify(result.labels.availabilityUnknown)
);
check(
  'the availability rule reads the UK marketplace from its ONE canonical owner',
  result.labels.availabilityUk.available === false && result.labels.availabilityUk.region === 'EU'
);

/* ── 3/4. the receiving sync and its fail-closed write path ───────────────── */

console.log('§P12 — the receiving sync reads the CHANNEL’s own state (`AV-018`)');
check(
  'the channel’s own status is mapped per canonical purchase order, with provenance',
  result.receiving.ok === true &&
    result.receiving.mode === 'mock' &&
    result.receiving.readings.length === 2 &&
    result.receiving.readings.every((r) => r.simulated === true && r.lines > 0 && !!r.poId && !!r.brandId),
  JSON.stringify(result.receiving)
);
check(
  'a PO the channel has not received reports not_received with zero received units',
  result.receiving.readings.every((r) => r.receiving === 'not_received' && r.received === 0)
);
check(
  'an id the CHANNEL does not know is reported separately, never read as “not received”',
  result.receiving.unknown.length === 1 && result.receiving.unknown[0] === 'NOT-A-PO',
  JSON.stringify(result.receiving.unknown)
);
check(
  'asking about CANONICAL purchase orders the channel does not know returns them all as unknown',
  result.overCanonical.readings === 0 && result.overCanonical.unknown.length === result.overCanonical.ids.length,
  JSON.stringify(result.overCanonical)
);
check(
  'an empty id set makes NO channel call and reports `unknown` provenance',
  result.emptySync.ok === true && result.emptySync.mode === 'unknown' && result.emptySync.readings === 0
);

console.log('§P12 — a SIMULATED reading is NEVER written as a canonical receipt');
check(
  'the simulated reading is REFUSED by the write path, naming the reason',
  result.applySimulated.ok === false &&
    /^CHANNEL_READ_SIMULATED/.test(result.applySimulated.refusal ?? ''),
  JSON.stringify(result.applySimulated)
);
check(
  'a LIVE reading is applied through the injected canonical writer',
  result.applyLive.ok === true && result.applyLive.receivingStatus === 'received',
  JSON.stringify(result.applyLive)
);
check(
  'the applied quantities are the CHANNEL’s own per-line received quantities',
  result.applyCaptured !== null &&
    Object.keys(result.applyCaptured).length === result.receiving.readings[0].lines,
  JSON.stringify(result.applyCaptured)
);
check(
  'a refusal from the canonical writer is passed through, not swallowed',
  result.applyWriterRefusal.ok === false && /FORBIDDEN/.test(result.applyWriterRefusal.refusal ?? '')
);

/* ── 5/6/7. the shipment request, the routing instructions, the ASN ───────── */

console.log('§P12 — the shipment request carries the declared 1..n set and fails closed');
check(
  'the request is SUBMITTED to the channel and carries the channel’s own reference',
  result.request.ok === true &&
    /^MOCK-SHP-REQ-/.test(result.request.shipmentRequestId ?? '') &&
    result.request.purchaseOrderNumbers.length === 1 &&
    result.request.awaitingCarrierAssignment === true &&
    result.request.mode === 'mock' &&
    result.request.simulated === true,
  JSON.stringify(result.request)
);
check(
  'an EMPTY declaration is refused BEFORE any channel call (the consolidation guard)',
  result.requestEmpty.ok === false && /at least one purchase order/i.test(result.requestEmpty.refusal ?? ''),
  result.requestEmpty.refusal
);
check(
  'the CHANNEL ITSELF refuses an empty declaration (its own stated code)',
  /^SHIPMENT_REQUEST_EMPTY/.test(result.clientGuards.requestEmpty.refusal ?? ''),
  JSON.stringify(result.clientGuards.requestEmpty)
);
check(
  'a DUPLICATED purchase order is refused (the consolidation invariant)',
  result.requestDuplicate.ok === false && /declared twice/i.test(result.requestDuplicate.refusal ?? ''),
  result.requestDuplicate.refusal
);
check(
  'a CROSS-TENANT declaration is refused (one consignment, one brand)',
  result.requestCrossTenant.ok === false && /another brand/i.test(result.requestCrossTenant.refusal ?? ''),
  result.requestCrossTenant.refusal
);
check(
  'a declaration above the channel’s truckload limit is refused, naming the limit',
  result.requestTooLarge.ok === false &&
    /exceed the channel['’]s limit of \d+ shipment confirmations/i.test(result.requestTooLarge.refusal ?? '') &&
    result.requestTooLarge.refusal.includes(String(result.truckloadLimit)),
  result.requestTooLarge.refusal
);
check(
  'the CHANNEL ITSELF refuses a declaration above the truckload limit',
  /^SHIPMENT_REQUEST_TOO_LARGE/.test(result.clientGuards.requestTooLarge.refusal ?? ''),
  JSON.stringify(result.clientGuards.requestTooLarge)
);
/* §BATCH 2m (AV-014) — the pickup lead time is ENFORCED against a SUBMITTED value. */
console.log('§BATCH 2m (AV-014) — the channel pickup lead time is ENFORCED at the boundary');
check(
  'a TOO-EARLY caller-supplied requestedPickUp is refused, stating the documented lead time',
  result.requestTooEarlyPickUp.ok === false &&
    /^SHIPMENT_REQUEST_REFUSED/.test(result.requestTooEarlyPickUp.refusal ?? '') &&
    /REQUESTED_PICKUP_TOO_EARLY/.test(result.requestTooEarlyPickUp.refusal ?? ''),
  result.requestTooEarlyPickUp.refusal
);
check(
  'a MISSING requestedPickUp on a collect request is refused (fail closed)',
  result.requestMissingPickUp.ok === false &&
    /REQUESTED_PICKUP_MISSING/.test(result.requestMissingPickUp.refusal ?? ''),
  result.requestMissingPickUp.refusal
);
check(
  'an UNREADABLE requestedPickUp is refused (fail closed)',
  result.requestUnreadablePickUp.ok === false &&
    /REQUESTED_PICKUP_UNREADABLE/.test(result.requestUnreadablePickUp.refusal ?? ''),
  result.requestUnreadablePickUp.refusal
);
check(
  'the CHANNEL refuses an empty status read and an unnamed inventory SKU',
  /^PURCHASE_ORDER_IDS_EMPTY/.test(result.clientGuards.statusIdsEmpty.refusal ?? '') &&
    /^INVENTORY_SKU_MISSING/.test(result.clientGuards.inventorySkuMissing.refusal ?? '') &&
    /^INVOICE_NUMBER_MISSING/.test(result.clientGuards.invoiceNumberMissing.refusal ?? '')
);

console.log('§P12 — routing instructions appear ONLY when the channel returns an ARN');
check(
  'the FIRST read reports carrier assignment PENDING with NO ARN (never fabricated)',
  result.routing.first.ok === true &&
    result.routing.first.pending === true &&
    result.routing.first.hasInstructions === false
);
check(
  'a LATER read returns the channel’s own routing instructions, marked simulated',
  result.routing.second.ok === true &&
    result.routing.second.pending === false &&
    /^MOCK-ARN-/.test(result.routing.second.arn ?? '') &&
    result.routing.second.mode === 'mock',
  JSON.stringify(result.routing.second)
);
check(
  'an UNKNOWN shipment request yields no instructions and states the refusal',
  result.routing.unknown.ok === false &&
    result.routing.unknown.pending === true &&
    /SHIPMENT_REQUEST_UNKNOWN/.test(result.routing.unknown.refusal ?? '')
);

console.log('§P12 — the ASN goes to the channel, with its own refusals');
check(
  'the confirmation is ACCEPTED and carries the channel’s own reference',
  result.confirmation.ok === true &&
    /^MOCK-ASN-/.test(result.confirmation.confirmationId ?? '') &&
    result.confirmation.status === 'accepted' &&
    result.confirmation.simulated === true,
  JSON.stringify(result.confirmation)
);
check(
  'an EMPTY confirmation is refused',
  result.confirmationEmpty.ok === false && /SHIPMENT_CONFIRMATION_EMPTY/.test(result.confirmationEmpty.refusal ?? '')
);
check(
  'a confirmation naming no purchase order is refused',
  result.confirmationNoPos.ok === false &&
    /SHIPMENT_CONFIRMATION_NO_PURCHASE_ORDERS/.test(result.confirmationNoPos.refusal ?? '')
);
check(
  'a carton referencing an UNDECLARED purchase order is refused',
  result.confirmationOutside.ok === false &&
    /NOT_DECLARED/.test(result.confirmationOutside.refusal ?? ''),
  result.confirmationOutside.refusal
);
check(
  'a CONFIRMED shipment makes the receiving sync report a receipt (one coherent world)',
  result.afterConfirmation.length === 1 &&
    result.afterConfirmation[0].receiving === 'received' &&
    result.afterConfirmation[0].received === 10 &&
    result.afterConfirmation[0].date === 'present',
  JSON.stringify(result.afterConfirmation)
);

/* ── 8. invoice submission ────────────────────────────────────────────────── */

console.log('§P12 — the invoice goes to the channel AS THE REGISTRY ISSUED IT');
check(
  'the submitted invoice carries the channel’s own acknowledgement reference',
  /^MOCK-INV-ACK-/.test(result.invoice.submissionId ?? '') &&
    result.invoice.status === 'submitted' &&
    result.invoice.mode === 'mock' &&
    result.invoice.simulated === true &&
    result.invoice.invoiceNumber === 'SIM-INV-MOCK-PO-8842',
  JSON.stringify(result.invoice)
);
check(
  're-submitting the SAME invoice is IDEMPOTENT (no second channel call)',
  result.invoiceAgain.alreadySubmitted === true &&
    result.invoiceAgain.submissionId === result.invoice.submissionId
);
check(
  'a CANCELLED invoice is never submitted (`AV-022`)',
  /^INVOICE_CANCELLED/.test(result.invoiceCancelled.refusal ?? '')
);
check(
  'a ZERO-VALUE invoice is refused (`AV-022` R3)',
  /^INVOICE_ZERO_VALUE/.test(result.invoiceZero.refusal ?? '')
);
check(
  'a REUSED invoice number is REFUSED BY THE CHANNEL (`AV-022` R2)',
  /^INVOICE_NUMBER_ALREADY_USED/.test(result.invoiceReusedNumber.refusal ?? ''),
  result.invoiceReusedNumber.refusal
);
check('a successful submission is RECORDED against its invoice', result.invoiceRecorded === true);

/* ── 9. the stock push is DERIVED, never supplied ─────────────────────────── */

console.log('§P12 — the stock push derives its quantity from the canonical ledger');
check(
  'the pushed quantity IS the ledger’s on-hand figure (120 eaches)',
  result.push.eaches.quantity === 120 &&
    result.push.eaches.eaches === 120 &&
    result.push.eaches.unitOfMeasure === 'Eaches' &&
    /^MOCK-INV-UPD-/.test(result.push.eaches.submissionId ?? '') &&
    result.push.eaches.simulated === true,
  JSON.stringify(result.push.eaches)
);
check(
  'a CASES push converts through the product’s OWN case pack (120 / 12 = 10)',
  result.push.cases.quantity === 10 && result.push.cases.unitOfMeasure === 'Cases',
  JSON.stringify(result.push.cases)
);
check(
  'an UNDECLARED unit is refused',
  /^INVENTORY_UNIT_UNDECLARED/.test(result.push.badUnit.refusal ?? '')
);
check(
  'a LOSSY case conversion is refused rather than rounded',
  /^INVENTORY_CASE_CONVERSION_LOSSY/.test(result.push.lossyCases.refusal ?? '')
);
check(
  'a NEGATIVE derived position is refused (a push cannot report negative stock)',
  /^INVENTORY_PUSH_NEGATIVE/.test(result.push.negative.refusal ?? '')
);

/* ── 10. the seam, the credentials rule, and zero network ─────────────────── */

console.log('§P12 — the seam still selects mock vs real by CREDENTIAL alone');
check(
  'no credentials → mock; a mock secret-ref → mock; a VERIFIED connection → real',
  result.seam.none === 'mock' && result.seam.mockRef === 'mock' && result.seam.verified === 'real'
);
check(
  'EVERY credential-bound §P12 operation THROWS without a verified connection',
  [result.locked.status, result.locked.request, result.locked.details, result.locked.confirmations,
    result.locked.invoices, result.locked.inventory].every((r) => r.threw === true),
  JSON.stringify(result.locked).slice(0, 300)
);
check('ZERO external network calls occurred while executing the real modules', result.network === 0);

/* ── source-level: one owner, no placeholders, no direct network ──────────── */

console.log('§P12 — one owner per rule, no placeholders, no direct network');
const configSrc = read('src/config/shipping.ts');
const clientSrc = read('src/lib/spapi/client.ts');
const mockSrc = read('src/lib/spapi/mockClient.ts');
const apiSrc = stripComments(read('src/data/api.ts'));
const owners = [
  'src/lib/commerce/channelReceivingSync.ts',
  'src/lib/commerce/channelInvoiceSubmission.ts',
  'src/lib/shipping/channelShipmentOperations.ts',
  'src/lib/inventory/channelInventoryPush.ts',
];
check(
  'the label region rule is declared ONCE and BOTH clients read it',
  /export function channelShipmentLabelsAvailability/.test(configSrc) &&
    /channelShipmentLabelsAvailability/.test(clientSrc) &&
    /channelShipmentLabelsAvailability/.test(mockSrc)
);
check(
  'the four owners contain no TODO/FIXME placeholder',
  owners.every((f) => !/TODO|FIXME/.test(read(f))),
  owners.filter((f) => /TODO|FIXME/.test(read(f))).join(',')
);
check(
  'the four owners make NO direct network call (the seam is the only path)',
  owners.every((f) => !/fetch\s*\(|XMLHttpRequest|axios/.test(read(f))),
  owners.filter((f) => /fetch\s*\(|XMLHttpRequest|axios/.test(read(f))).join(',')
);
check(
  'the app entry points go through the SP-API seam (no direct fetch)',
  /createSPApiClientForConnection/.test(apiSrc) && !/fetch\s*\(/.test(apiSrc)
);
check(
  'the receiving owner never mutates the canonical store (its write path is injected)',
  !/demoPurchaseOrders\.(push|splice)\(/.test(read('src/lib/commerce/channelReceivingSync.ts')) &&
    !/reconcileDelivery|setPurchaseOrderStatus/.test(read('src/lib/commerce/channelReceivingSync.ts'))
);
check(
  'the stock push takes NO quantity from its caller — it derives it from the movements',
  !/pushInventoryToChannel\(input: \{[\s\S]*?\}\): Promise/.test(
    read('src/lib/inventory/channelInventoryPush.ts')
  ) ||
    !/quantity/.test(
      (read('src/lib/inventory/channelInventoryPush.ts').match(
        /pushInventoryToChannel\(input: \{[\s\S]*?\}\): Promise/
      ) ?? [''])[0]
    ),
  'the input type declares a quantity'
);
check(
  'the pushed quantity is derived by the canonical ledger arithmetic',
  /bucketTotals\(input\.movements\)/.test(read('src/lib/inventory/channelInventoryPush.ts'))
);
check(
  'the app seam derives the pushed quantity from the canonical ledger accessor',
  /movements: getInventoryMovements\(/.test(apiSrc)
);
/**
 * §P12 — THE CANONICAL WRITE PATH MUST BE WIRED INTO THE PRODUCT, not merely
 * exported. This assertion exists because the FIRST live run caught exactly that:
 * the apply path was implemented and gate-proven, but NO surface called it, so the
 * bundler dropped it and even a live channel reading could never have been applied.
 */
const panelSrc = read('src/components/admin/ChannelOperationsPanel.tsx');
check(
  'the console WIRES the canonical receiving write path (a live reading can be applied)',
  /applyChannelReceivingReadingToStore/.test(panelSrc) &&
    /applyChannelReceivingReadingToStore\(reading, actor\)/.test(panelSrc)
);
check(
  'a SIMULATED reading offers no apply control — its refusal is stated instead',
  /channel-apply-refused/.test(panelSrc) && /reading\.simulated \?/.test(panelSrc)
);
check('the gate is registered as an npm script', /"validate:p12-spapi-seam"/.test(read('package.json')));

/* ── §BATCH 2g (`AV-040`) — the disposition RECORD must match the code ──────── */
/*  The record said "OPEN — not applied" for months while EIGHT seam operations
 *  existed, which under-reported the work in the opposite direction. These
 *  checks make the row and the code agree, so neither a stale "not applied" nor
 *  a silent addition/removal can drift again. */
const reconRow = (read('docs/AMAZON_RECONCILIATION_STATUS.md').split('\n')
  .find((l) => l.startsWith('| AV-040 ')) ?? '');
check('§AV-040 the reconciliation row exists', reconRow.length > 0);
check('§AV-040 the row no longer claims "OPEN — not applied"',
  !/OPEN\s*—\s*not applied/i.test(reconRow));
check('§AV-040 the row states a PARTIAL application, not full completion',
  /PARTIALLY APPLIED/i.test(reconRow) && /BLOCKED ON EVIDENCE/i.test(reconRow));
check('§AV-040 the row names `getTransaction` as the ONE remaining documented operation',
  /getTransaction/.test(reconRow));
check('§AV-040 the seam and the record AGREE: `getTransaction` is still not implemented',
  !/getTransaction/.test(read('src/lib/spapi/client.ts')) &&
    !/getTransaction/.test(read('src/lib/spapi/mockClient.ts')),
  'a seam method was added/removed — update the AV-040 row in the same change');

console.log('');
if (fail === 0) {
  console.log(`P12_SPAPI_SEAM_VALIDATION_PASS (${pass} passed, 0 failed)`);
  process.exit(0);
}
console.log(`P12_SPAPI_SEAM_VALIDATION_FAIL (${pass} passed, ${fail} failed)`);
for (const error of errors) console.log(`  · ${error}`);
process.exit(1);