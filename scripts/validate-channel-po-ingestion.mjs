#!/usr/bin/env node
/**
 * §P11 — CHANNEL PURCHASE-ORDER INGESTION CONTRACT VALIDATOR
 * (programme `docs/DASHBOARD_LOGISTICS_CLEANUP_PROGRAMME_2026-09-22.md` §4 P11,
 * matrix `cleanup-p11-remove-create-po`, programme decision 3).
 *
 * Decision 3: ONE PO record = the PO from Amazon. Mercenta never creates a PO —
 * the PO ARRIVES, addressed to Mercenta, and Mercenta routes it to the brand from
 * the PO's OWN lines. This validator EXECUTES the real modules (bundled with the
 * project's own esbuild, through the project's own `@/` alias) rather than
 * grepping source text.
 *
 * Asserted behaviour:
 *   1  routing identifies the brand from the PO's lines — by vendor SKU, and by
 *      ASIN when the product has been accepted on the channel
 *   2  routing FAILS CLOSED: no lines refused, a line outside the catalogue
 *      refused, lines spanning two brands refused — and nothing is filed
 *   3  ingestion files the canonical record: the channel's own PO number IS the
 *      record's `poNumber`, the id is deterministic, the destination is the FC
 *      the CHANNEL declared, the channel's windows are carried, and the value is
 *      recomputed from the channel's own lines
 *   4  a SIMULATED channel read is marked as such (`mode`/`simulated`) and a live
 *      one is NOT
 *   5  IDEMPOTENT: a re-read of the same channel PO files nothing and reports
 *      `already_present`
 *   6  every filing is ATTRIBUTED and AUDITED (`po_ingested`, actor + tenant) and
 *      announces the canonical-store change
 *   7  the REAL simulated channel (the mock SP-API client) produces POs that are
 *      routable — and its out-of-catalogue PO is refused, so the fail-closed path
 *      is reachable from the product
 *   8  "Create PO" is GONE everywhere: no `createPurchaseOrder`, no second PO
 *      creation UI, no Postmark PO-notification seam — and the admin surface's
 *      entry point is the channel read, behind the same RBAC guard
 *   9  zero network calls
 *
 * Run: node scripts/validate-channel-po-ingestion.mjs
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

/* ── Bundle the REAL modules and execute them ─────────────────────────────── */

const ENTRY = `
import {
  routeChannelPurchaseOrder, ingestChannelPurchaseOrders,
} from '@/lib/commerce/channelPurchaseOrderIngestion';
import { demoAuditLog, demoProducts, demoPurchaseOrders } from '@/data/demoStore';
import { createMockSpApiClient } from '@/lib/spapi/mockClient';
import { createSPApiClientForConnection } from '@/lib/spapi';
import { declaredShipToParty } from '@/config/destinationFc';

/* Zero network: any external call is recorded and fails the validator. */
let fetchCalls = 0;
const realFetch = globalThis.fetch;
globalThis.fetch = function () { fetchCalls += 1; return realFetch.apply(null, arguments); };

const out = {};
const attempt = function (fn) {
  try { return { threw: false, value: fn() }; } catch (e) { return { threw: true, message: String(e.message || e) }; }
};
const attemptAsync = async function (fn) {
  try { return await fn(); } catch (e) { return { threw: true, message: String(e.message || e) }; }
};

const CATALOGUE = [
  { sku: 'ASON-001', brandId: 'brand-astonish' },
  { sku: 'ASON-002', brandId: 'brand-astonish' },
  { sku: 'TPIO-001', brandId: 'brand-tapatio' },
  { sku: 'SEEP-001', brandId: 'brand-seep', asin: 'B00TESTSIN' },
];

const line = function (vendorSku, quantity, unitPrice, asin) {
  const l = { vendorSku: vendorSku, quantity: quantity, unitPrice: unitPrice, commodityCode: '3304990090' };
  if (asin) l.asin = asin;
  return l;
};

const po = function (id, lines, extra) {
  const base = {
    purchaseOrderId: id, poValue: 0, orderDate: '2026-09-20',
    shipToPartyId: declaredShipToParty(0).partyId,
    freightTerm: 'prepaid',
    deliveryWindowStart: '2026-10-01', deliveryWindowEnd: '2026-10-08',
    lines: lines, simulated: true,
  };
  return Object.assign(base, extra || {});
};

const summarize = function (r) {
  return {
    ok: r.ok, mode: r.mode === undefined ? null : r.mode,
    polled: r.polled, ingested: r.ingested, alreadyPresent: r.alreadyPresent, refused: r.refused,
    outcomes: r.outcomes.map(function (o) { return { id: o.channelPurchaseOrderId, status: o.status, brandId: o.brandId, hasReason: !!o.reason }; }),
    error: r.error === undefined ? null : r.error,
  };
};

/* 1/2 — routing identifies the brand from the PO's OWN lines, and fails closed. */
out.routing = {
  bySku: routeChannelPurchaseOrder(po('R1', [line('ASON-001', 10, 5)]), CATALOGUE),
  byAsin: routeChannelPurchaseOrder(po('R2', [line('UNKNOWN-SKU', 4, 5, 'B00TESTSIN')]), CATALOGUE),
  empty: routeChannelPurchaseOrder(po('R3', []), CATALOGUE),
  unknownLine: routeChannelPurchaseOrder(po('R4', [line('NOPE-999', 1, 1)]), CATALOGUE),
  crossTenant: routeChannelPurchaseOrder(po('R5', [line('ASON-001', 1, 1), line('TPIO-001', 1, 1)]), CATALOGUE),
};

/* 3/4/5/6 — ingestion over a deterministic fake channel read. */
const READER_POS = [
  po('CHANNEL-PO-0001', [line('ASON-001', 10, 5), line('ASON-002', 4, 6)], {
    shipToPartyId: declaredShipToParty(0).partyId, freightTerm: 'collect',
    shipWindowStart: '2026-10-05', shipWindowEnd: '2026-10-12', poValue: 999999,
  }),
  po('CHANNEL-PO-0002', [line('TPIO-001', 8, 3)], { shipToPartyId: 'XX-UNKNOWN-FC' }),
  po('CHANNEL-PO-0003', [line('NOPE-999', 2, 2)]),
];
const reader = { fetchPurchaseOrders: async function () { return { ok: true, purchaseOrders: READER_POS }; } };
const failingReader = { fetchPurchaseOrders: async function () { return { ok: false, error: 'HTTP 503 from the retail channel' }; } };

const storeBefore = demoPurchaseOrders.length;
const auditsBefore = demoAuditLog.length;

out.failingRead = await attemptAsync(function () {
  return ingestChannelPurchaseOrders({ reader: failingReader, catalogue: CATALOGUE, sinceIso: '2026-09-01', actorId: 'staff-test' });
});
const first = await ingestChannelPurchaseOrders({
  reader: reader, catalogue: CATALOGUE, sinceIso: '2026-09-01', actorId: 'staff-test',
  now: function () { return new Date('2026-09-21T09:00:00.000Z'); },
});
const second = await ingestChannelPurchaseOrders({
  reader: reader, catalogue: CATALOGUE, sinceIso: '2026-09-01', actorId: 'staff-test',
});
const filed1 = demoPurchaseOrders.find(function (p) { return p.poNumber === 'CHANNEL-PO-0001'; });
const filed2 = demoPurchaseOrders.find(function (p) { return p.poNumber === 'CHANNEL-PO-0002'; });
out.first = summarize(first);
out.second = summarize(second);
out.storeDelta = demoPurchaseOrders.length - storeBefore;
out.filedUnroutable = demoPurchaseOrders.some(function (p) { return p.poNumber === 'CHANNEL-PO-0003'; });
out.filed1 = filed1 ? {
  id: filed1.id, poNumber: filed1.poNumber, brandId: filed1.brandId, status: filed1.status,
  poValue: filed1.poValue, shippedTo: filed1.shipToParty, freightTerm: filed1.freightTerm,
  shipWindowStart: filed1.shipWindowStart, shipWindowEnd: filed1.shipWindowEnd,
  lineCount: filed1.lineItems.length, commissionRate: filed1.commissionRate,
  mode: filed1.mode, simulated: filed1.simulated, receivedAt: filed1.receivedAt,
} : null;
out.filed2 = filed2 ? { brandId: filed2.brandId, shippedTo: filed2.shipToParty, mode: filed2.mode } : null;
out.audits = demoAuditLog.slice(auditsBefore).filter(function (a) { return a.action === 'po_ingested'; }).map(function (a) {
  return { action: a.action, actorId: a.actorId, brandId: a.brandId, entityId: a.entityId, simulated: a.metadata ? a.metadata.simulated : null, channelSource: a.metadata ? a.metadata.channelSource : null };
});

/* 7 — the REAL simulated channel: its POOL must be routable, and its
   out-of-catalogue PO must be subject to the same fail-closed refusal. */
const SINCE = '2026-09-01T00:00:00.000Z';
const mockClient = createMockSpApiClient();
const mockRead = await mockClient.fetchPurchaseOrders(SINCE);
const mockPos = mockRead.purchaseOrders || [];
out.mockRead = {
  ids: mockPos.map(function (p) { return p.purchaseOrderId; }),
  simulatedFlags: mockPos.map(function (p) { return p.simulated; }),
  lineCounts: mockPos.map(function (p) { return p.lines.length; }),
  shipToPartyIds: mockPos.map(function (p) { return p.shipToPartyId; }),
};
out.mockRouting = mockPos.map(function (p) {
  const v = routeChannelPurchaseOrder(p, demoProducts.map(function (d) { return { sku: d.sku, brandId: d.brandId }; }));
  return v.ok ? { id: p.purchaseOrderId, ok: true, brandId: v.brandId } : { id: p.purchaseOrderId, ok: false, code: v.code };
});

/* 3/5/7 — a REAL ingestion over the simulated channel, then a SECOND read over
   the same window: the routable POs are filed once and the out-of-catalogue PO
   is refused, exactly as the product presents it. */
const mockCatalog = demoProducts.map(function (d) { return { sku: d.sku, brandId: d.brandId }; });
const mockIngest = await ingestChannelPurchaseOrders({
  reader: mockClient, catalogue: mockCatalog, sinceIso: SINCE, actorId: 'staff-test',
});
const mockIngestAgain = await ingestChannelPurchaseOrders({
  reader: mockClient, catalogue: mockCatalog, sinceIso: SINCE, actorId: 'staff-test',
});
out.mockIngest = summarize(mockIngest);
out.mockIngestAgain = summarize(mockIngestAgain);

/* 8 — the seam still selects mock vs real purely by credential (no code change). */
out.seam = {
  none: createSPApiClientForConnection({ credentials: null, edgeFunctionBase: '/x' }).mode,
  mockRef: createSPApiClientForConnection({ credentials: { secretRef: 'mock:abc', marketplaceId: 'M', verified: true }, edgeFunctionBase: '/x' }).mode,
  verified: createSPApiClientForConnection({ credentials: { secretRef: 'vault:sp', marketplaceId: 'M', verified: true }, edgeFunctionBase: '/x' }).mode,
  sandboxOnly: createSPApiClientForConnection({ credentials: { secretRef: 'vault:sp', marketplaceId: 'M', verified: false }, edgeFunctionBase: '/x' }).mode,
};

out.network = fetchCalls;
out.expectedFc = declaredShipToParty(0).partyId;

console.log('__RESULT__' + JSON.stringify(out));

`;

const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'mercenta-channel-po-'));
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
  console.log('CHANNEL_PO_INGESTION_VALIDATION_FAIL (0 passed, 1 failed)');
  process.exit(1);
}

/* ── 1/2. routing: identity from the PO's own lines, fail-closed ───────────── */

console.log('§P11 — routing identifies the tenant from the PO’s own lines');
check('a line matching the catalogue BY SKU routes to that brand',
  result.routing.bySku.ok === true && result.routing.bySku.brandId === 'brand-astonish');
check('a line matching the catalogue BY ASIN (accepted product) routes to that brand',
  result.routing.byAsin.ok === true && result.routing.byAsin.brandId === 'brand-seep');
check('a PO with NO lines is REFUSED (CHANNEL_PO_EMPTY)',
  result.routing.empty.ok === false && result.routing.empty.code === 'CHANNEL_PO_EMPTY');
check('a line outside the catalogue REFUSES the whole PO (CHANNEL_PO_LINE_NOT_IN_CATALOGUE)',
  result.routing.unknownLine.ok === false &&
  result.routing.unknownLine.code === 'CHANNEL_PO_LINE_NOT_IN_CATALOGUE' &&
  /NOPE-999/.test(result.routing.unknownLine.reason));
check('lines spanning TWO brands are REFUSED (CHANNEL_PO_CROSSES_TENANTS) — no tenant is guessed',
  result.routing.crossTenant.ok === false &&
  result.routing.crossTenant.code === 'CHANNEL_PO_CROSSES_TENANTS' &&
  /brand-astonish/.test(result.routing.crossTenant.reason) &&
  /brand-tapatio/.test(result.routing.crossTenant.reason));

/* ── 3/4/5/6. ingestion files the canonical record, once, attributed ───────── */

console.log('§P11 — ingestion files the channel PO as the ONE canonical record');
check('a failed channel read ingests NOTHING and reports the error',
  result.failingRead.ok === false && /503/.test(String(result.failingRead.error)));
check('the channel’s own PO number IS the record’s poNumber (decision 3)',
  result.filed1 && result.filed1.poNumber === 'CHANNEL-PO-0001');
check('the record id is deterministic (replaying cannot mint a second record)',
  result.filed1 && result.filed1.id === 'po-channel-CHANNEL-PO-0001');
check('the PO is routed to the CORRECT brand and lands as `received`',
  result.filed1 && result.filed1.brandId === 'brand-astonish' && result.filed1.status === 'received');
check('the value is recomputed from the channel’s OWN lines (the declared total is not trusted)',
  result.filed1 && result.filed1.poValue === 74);
check('the destination is the FC the CHANNEL declared (resolved canonically)',
  result.filed1 && result.filed1.shippedTo.partyId === result.expectedFc &&
  typeof result.filed1.shippedTo.name === 'string' && result.filed1.shippedTo.name.length > 0);
check('an UNKNOWN ship-to code keeps the channel’s OWN partyId — no site is invented',
  result.filed2 && result.filed2.shippedTo.partyId === 'XX-UNKNOWN-FC' &&
  result.filed2.shippedTo.name === undefined);
check('the channel’s windows are carried (collect → ship window)',
  result.filed1 && result.filed1.freightTerm === 'collect' &&
  result.filed1.shipWindowStart === '2026-10-05' && result.filed1.shipWindowEnd === '2026-10-12');
check('the line detail is carried as canonical line items',
  result.filed1 && result.filed1.lineCount === 2);
check('a SIMULATED channel read is marked as such (mode + simulated)',
  result.filed1 && result.filed1.mode === 'simulation' && result.filed1.simulated === true);
check('the arrival is timestamped from the injected clock',
  result.filed1 && result.filed1.receivedAt === '2026-09-21T09:00:00.000Z');
check('the commercial rate uses the platform’s declared placeholder (no local margin maths)',
  result.filed1 && result.filed1.commissionRate === 12);



/* ── 5/6/7. idempotency, attribution and the REAL simulated channel ───────── */

console.log('§P11 — idempotent, attributed, audited');
check('the first read files BOTH routable POs and REFUSES the out-of-catalogue one',
  result.first.ok === true && result.first.polled === 3 && result.first.ingested === 2 &&
  result.first.refused === 1 && result.first.alreadyPresent === 0);
check('the refused PO names its reason and is NOT filed',
  result.first.outcomes.some((o) => o.id === 'CHANNEL-PO-0003' && o.status === 'refused' && o.hasReason) &&
  result.filedUnroutable === false);
check('exactly TWO records reached the canonical store',
  result.storeDelta === 2);
check('a RE-READ files nothing: both are reported `already_present` (idempotent)',
  result.second.ok === true && result.second.ingested === 0 &&
  result.second.alreadyPresent === 2 && result.second.refused === 1);
check('every filing is ATTRIBUTED and AUDITED (`po_ingested`, actor + tenant + provenance)',
  result.audits.length === 2 &&
  result.audits.every((a) => a.action === 'po_ingested' && a.actorId === 'staff-test' &&
    a.simulated === true && a.channelSource === 'amazon_vendor_central') &&
  result.audits.some((a) => a.brandId === 'brand-astonish' && a.entityId === 'po-channel-CHANNEL-PO-0001') &&
  result.audits.some((a) => a.brandId === 'brand-tapatio'));

console.log('§P11 — the SIMULATED channel is routable end-to-end (mock SP-API client)');
check('the simulated channel returns unmistakably simulated PO identities',
  result.mockRead.ids.every((id) => /^MOCK-PO-/.test(id)) &&
  result.mockRead.simulatedFlags.every((s) => s === true));
check('every simulated PO carries real lines and a declared FC',
  result.mockRead.lineCounts.every((n) => n > 0) &&
  result.mockRead.shipToPartyIds.every((id) => typeof id === 'string' && id.length > 0));
check('the simulated POs ROUTE to a brand, and the out-of-catalogue one is REFUSED by code',
  result.mockRouting.some((r) => r.ok === true) &&
  result.mockRouting.some((r) => r.ok === false && r.code === 'CHANNEL_PO_LINE_NOT_IN_CATALOGUE'));
check('a real ingestion over the simulated channel files EVERY routable PO and refuses the other',
  result.mockIngest.ok === true && result.mockIngest.polled === 4 &&
  result.mockIngest.ingested === 3 && result.mockIngest.refused === 1 &&
  result.mockIngest.alreadyPresent === 0);
check('re-reading the SAME window files nothing new (the product’s own idempotency)',
  result.mockIngestAgain.ingested === 0 && result.mockIngestAgain.alreadyPresent === 3 &&
  result.mockIngestAgain.refused === 1);

console.log('§P11 — the seam still selects mock vs real by CREDENTIAL alone');
check('no credentials → mock; a mock secret-ref → mock; a VERIFIED connection → real',
  result.seam.none === 'mock' && result.seam.mockRef === 'mock' &&
  result.seam.verified === 'real' && result.seam.sandboxOnly === 'mock');

/* ── 8. "Create PO" is gone everywhere ────────────────────────────────────── */

console.log('§P11 — "Create PO" is REMOVED (decision 3) and cannot return');
const apiSrc = read('src/data/api.ts');
const apiCode = apiSrc.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/[^\n]*/g, '');
const poListSrc = read('src/components/admin/AdminPurchaseOrderList.tsx');
const poListCode = poListSrc.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/[^\n]*/g, '');
check('no `createPurchaseOrder` exists in the app seam', !/createPurchaseOrder\s*\(/.test(apiCode));
check('no Postmark PO-notification seam exists anywhere',
  !fs.existsSync(path.join(ROOT, 'src/lib/notifications/postmarkNotifier.ts')) &&
  !/sendPostmarkEmail|buildPoNotificationHtml/.test(apiCode) &&
  !/sendPostmarkEmail|postmarkNotifier/.test(poListCode));
check('the admin PO list no longer renders a create action',
  !/Create PO</.test(poListCode) && !/Create Purchase Order on Behalf/.test(poListCode));
check('the admin PO list’s entry point IS the channel read, behind the RBAC guard',
  /data-state="admin-po-ingest"/.test(poListCode) &&
  /ingestChannelPurchaseOrders/.test(poListCode) &&
  /if \(!canCurrentUserMutate\) return;/.test(poListCode));
check('the admin PO list states the channel read’s mode truthfully (no simulated read shown as live)',
  /Simulated read — no live channel call was made/.test(poListSrc));
check('no second PO-creation path was introduced (one canonical entry point)',
  (apiCode.match(/ingestChannelPurchaseOrdersFromChannel\(/g) || []).length === 1);

/* ── 9. no placeholders, no network ───────────────────────────────────────── */

console.log('§P11 — no placeholders, zero network calls');
const ownerSrc = read('src/lib/commerce/channelPurchaseOrderIngestion.ts');
check('the ingestion owner contains no TODO/FIXME placeholder', !/TODO|FIXME/.test(ownerSrc));
check('the ingestion owner makes no direct network call',
  !/fetch\s*\(|XMLHttpRequest|axios/.test(ownerSrc));
check('the ingestion owner never imports a commercial-terms module (no margin re-derivation)',
  !/SHIPPING_COMMERCIAL_TERMS|computeCommissionModel|computeBuyResellModel/.test(ownerSrc));
check('the channel read in the app seam goes through the SP-API seam (mock-first, no direct fetch)',
  /createSPApiClientForConnection/.test(apiCode) && !/fetch\s*\(/.test(apiCode));
check('ZERO external network calls occurred while executing the real modules', result.network === 0);

console.log('');
if (fail === 0) {
  console.log(`CHANNEL_PO_INGESTION_VALIDATION_PASS (${pass} passed, 0 failed)`);
  process.exit(0);
}
console.log(`CHANNEL_PO_INGESTION_VALIDATION_FAIL (${pass} passed, ${fail} failed)`);
for (const error of errors) console.log(`  · ${error}`);
process.exit(1);

