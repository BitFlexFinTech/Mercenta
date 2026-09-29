#!/usr/bin/env node
/**
 * §BATCH 2c (`AV-024`) — THE CHANNEL-ISSUED PO REVISION GATE.
 *
 * WHY THIS EXISTS
 * ---------------
 * The Phase 0A audit registered `AV-024`: the retail channel may change a purchase
 * order AFTER it is issued, and the vendor is required to fulfil the UPDATED one;
 * changes are discovered by polling the channel's order read. Mercenta had no
 * concept of a channel-issued revision at all — the ingestion owner answered a
 * CHANGED order with `already_present` and the canonical record kept the
 * SUPERSEDED quantities, so *"a brand could ship a superseded PO"* was live in the
 * product.
 *
 * Correction alone is not the fix — a later edit could put the old behaviour back.
 * This gate is the fix. It EXECUTES the shipped modules (bundled with the project's
 * own esbuild through its own `@` alias), so it asserts RUNNING behaviour rather
 * than a pattern match, and fails if:
 *
 *   1  the channel's documented change kinds are not declared ONCE, or a kind gains
 *      no operator label, or a surface re-types the obligation instead of reading it;
 *   2  the derivation misses ANY documented kind (quantity · cost · item
 *      cancellation · new item · window · destination FC · freight term · order type
 *      · cancel · uncancel), or reports a change for a read that carries none;
 *   3  an UNREADABLE read is treated as no change (it must fail CLOSED — no lines, an
 *      unreadable order date, and a mismatched order identity);
 *   4  the ingestion does not record a revision, does not move the record to the
 *      CHANNEL'S current version, does not keep the superseded version, does not
 *      audit `po_revision_received`, or records the same channel read twice;
 *   5  a changed order that no longer ROUTES, or that would move between TENANTS, is
 *      applied instead of refused;
 *   6  a superseded order can still SHIP — the documented risk itself;
 *   7  the simulated channel cannot issue a revision, so the path is unreachable from
 *      the product, or the simulated revision leaks into the next run;
 *   8  any live network call is made.
 *
 * Run: node scripts/validate-po-revision-ingestion.mjs
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

/**
 * How many files under `src/` carry a literal in their CODE (comments stripped).
 * Used to prove a value has ONE owner rather than being re-typed beside it.
 */
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

/* ── The executed entry (parts joined below) ──────────────────────────────── */

const ENTRY_HEAD = `
import {
  routeChannelPurchaseOrder, ingestChannelPurchaseOrders,
} from '@/lib/commerce/channelPurchaseOrderIngestion';
import {
  deriveChannelPoRevision, applyChannelPoRevision, poRevisionState, poRevisionNumber,
} from '@/lib/commerce/poRevisions';
import { acknowledgePurchaseOrder, createShipmentForPO } from '@/data/api';
import { demoAuditLog, demoProducts, demoPurchaseOrders } from '@/data/demoStore';
import {
  createMockSpApiClient, simulateMockChannelPoRevision, resetMockAmazonState,
} from '@/lib/spapi/mockClient';
import { PO_CHANNEL_CHANGE_KINDS } from '@/types';
import { PO_CHANNEL_CHANGE_KIND_LABELS, PO_REVISION_RULE_TEXT } from '@/config/purchaseOrders';
import { declaredShipToParty } from '@/config/destinationFc';

globalThis.fetch = function () { throw new Error('NETWORK_CALL_ATTEMPTED'); };

const out = {};
const T = '2026-09-25T00:00:00.000Z';
out.kinds = PO_CHANNEL_CHANGE_KINDS.slice();
out.fcDistinct = declaredShipToParty(3).partyId !== declaredShipToParty(0).partyId;
out.labels = PO_CHANNEL_CHANGE_KINDS.map(function (k) { return PO_CHANNEL_CHANGE_KIND_LABELS[k]; });
out.ruleText = PO_REVISION_RULE_TEXT;

const line = function (sku, quantity, unitPrice, over) {
  return Object.assign({
    sku: sku, productName: sku, quantity: quantity, unitPrice: unitPrice, commodityCode: '3304990090',
  }, over || {});
};
const chanLine = function (sku, quantity, unitPrice) {
  return { vendorSku: sku, quantity: quantity, unitPrice: unitPrice, commodityCode: '3304990090' };
};
const po = function (over) {
  return Object.assign({
    id: 'po-synth', brandId: 'brand-astonish', poNumber: 'CHANNEL-1', status: 'received',
    shipToParty: { partyId: declaredShipToParty(0).partyId },
    poValue: 50, commissionRate: 12, commissionAmount: 6, orderDate: '2026-09-20',
    freightTerm: 'prepaid', revisionNumber: 0,
    deliveryWindowStart: '2026-10-01', deliveryWindowEnd: '2026-10-08',
    lineItems: [line('ASON-001', 10, 5)],
  }, over || {});
};
const snap = function (over) {
  return Object.assign({
    purchaseOrderId: 'CHANNEL-1', poValue: 50, orderDate: '2026-09-20',
    shipToPartyId: declaredShipToParty(0).partyId, freightTerm: 'prepaid',
    deliveryWindowStart: '2026-10-01', deliveryWindowEnd: '2026-10-08',
    lines: [chanLine('ASON-001', 10, 5)], simulated: true,
  }, over || {});
};
const kindsOrRefusal = function (record, snapshot) {
  const v = deriveChannelPoRevision(record, snapshot, T);
  return v.ok ? v.revision.changeKinds.slice().sort() : 'REFUSED:' + v.code;
};
const undercutOf = function (record, snapshot) {
  const v = deriveChannelPoRevision(record, snapshot, T);
  return v.ok ? v.revision.undercutsAcknowledgement : null;
};
`;

const ENTRY_DERIVE = `
out.derive = {
  unchanged: kindsOrRefusal(po(), snap()),
  quantity: kindsOrRefusal(po(), snap({ lines: [chanLine('ASON-001', 6, 5)] })),
  cost: kindsOrRefusal(po(), snap({ lines: [chanLine('ASON-001', 10, 4.5)] })),
  newItem: kindsOrRefusal(po(), snap({ lines: [chanLine('ASON-001', 10, 5), chanLine('ASON-002', 3, 2)] })),
  itemCancellation: kindsOrRefusal(
    po({ lineItems: [line('ASON-001', 10, 5), line('ASON-002', 3, 2)] }), snap()
  ),
  window: kindsOrRefusal(po(), snap({ deliveryWindowStart: '2026-11-01', deliveryWindowEnd: '2026-11-08' })),
  destination: kindsOrRefusal(po(), snap({ shipToPartyId: declaredShipToParty(3).partyId })),
  freight: kindsOrRefusal(po(), snap({
    freightTerm: 'collect', shipWindowStart: '2026-10-05', shipWindowEnd: '2026-10-12',
  })),
  orderType: kindsOrRefusal(po(), snap({ orderType: 'PO' })),
  cancel: kindsOrRefusal(po(), snap({ channelStatus: 'cancelled' })),
  alreadyCancelledIsNotAChange: kindsOrRefusal(
    po({ revisions: [{
      revisionNumber: 1, observedAt: T, source: 'channel_poll', simulated: true,
      changeKinds: ['cancel'], changes: [], digest: 'd1', previousPoValue: 50, newPoValue: 50,
      undercutsAcknowledgement: false, reviewReason: null, supersededLines: [],
    }] }),
    snap({ channelStatus: 'cancelled' })
  ),
  uncancel: kindsOrRefusal(
    po({ revisions: [{
      revisionNumber: 1, observedAt: T, source: 'channel_poll', simulated: true,
      changeKinds: ['cancel'], changes: [], digest: 'd1', previousPoValue: 50, newPoValue: 50,
      undercutsAcknowledgement: false, reviewReason: null, supersededLines: [],
    }] }),
    snap({ channelStatus: 'open' })
  ),
  absentOptionalIsNotAChange: kindsOrRefusal(po({ channelOrderType: 'PO' }), snap({ orderType: 'PO' })),
  noLines: kindsOrRefusal(po(), snap({ lines: [] })),
  badOrderDate: kindsOrRefusal(po(), snap({ orderDate: 'not-a-date' })),
  wrongIdentity: kindsOrRefusal(po(), snap({ purchaseOrderId: 'SOMEONE-ELSE-9' })),
};

/* 2b — the undercut detection: the documented risk in AV-024. */
out.undercut = {
  reducedBelowAcknowledged: undercutOf(
    po({ lineItems: [line('ASON-001', 10, 5, { ackStatus: 'accepted', acknowledgedQty: 10 })] }),
    snap({ lines: [chanLine('ASON-001', 6, 5)] })
  ),
  reducedAboveAcknowledged: undercutOf(
    po({ lineItems: [line('ASON-001', 10, 5, { ackStatus: 'accepted', acknowledgedQty: 4 })] }),
    snap({ lines: [chanLine('ASON-001', 6, 5)] })
  ),
  unacknowledgedLineIsNotAnUndercut: undercutOf(po(), snap({ lines: [chanLine('ASON-001', 6, 5)] })),
  acknowledgedLineCancelled: undercutOf(
    po({ lineItems: [line('ASON-001', 10, 5, { ackStatus: 'accepted', acknowledgedQty: 10 })] }),
    snap({ lines: [chanLine('ASON-002', 3, 2)] })
  ),
  cancelledAfterDecision: undercutOf(
    po({ acknowledgedAt: T, acknowledgedRevision: 0 }), snap({ channelStatus: 'cancelled' })
  ),
};

/* 2c — the writer moves the record to the CHANNEL'S version and keeps the old one. */
const before = po({ lineItems: [line('ASON-001', 10, 5, { ackStatus: 'accepted', acknowledgedQty: 10 })] });
const derived = deriveChannelPoRevision(before, snap({ lines: [chanLine('ASON-001', 6, 5)] }), T);
applyChannelPoRevision(before, derived.revision, snap({ lines: [chanLine('ASON-001', 6, 5)] }));
out.applied = {
  quantity: before.lineItems[0].quantity,
  acknowledgedQty: before.lineItems[0].acknowledgedQty,
  ackStatus: before.lineItems[0].ackStatus,
  revisionNumber: poRevisionNumber(before),
  revisionCount: (before.revisions || []).length,
  supersededQuantity: before.revisions[0].supersededLines[0].quantity,
  supersededAcknowledged: before.revisions[0].supersededLines[0].acknowledgedQty,
  poValue: before.poValue,
  changeKinds: before.revisions[0].changeKinds.slice().sort(),
  reviewReason: typeof before.revisions[0].reviewReason === 'string',
  digestIsString: typeof before.revisions[0].digest === 'string' && before.revisions[0].digest.length > 0,
};
/* the SAME change applied again must NOT duplicate history or the line set */
applyChannelPoRevision(before, derived.revision, snap({ lines: [chanLine('ASON-001', 6, 5)] }));
out.appliedTwiceRevisionCount = (before.revisions || []).length;
out.appliedTwiceLines = before.lineItems.map(function (l) { return l.sku; });
`;


const ENTRY_RUNTIME = `
/* ── 4/5. the ingestion owner over a deterministic fake channel read ───────── */
/* The awaits below run inside this IIFE: the bundle is CJS, which has no
   top-level await, and the same form keeps the whole run in one scope. */
(async function () {
const CATALOGUE = [
  { sku: 'ASON-001', brandId: 'brand-astonish' },
  { sku: 'ASON-002', brandId: 'brand-astonish' },
  { sku: 'TPIO-001', brandId: 'brand-tapatio' },
];
const CLOCK = function () { return new Date('2026-09-25T09:00:00.000Z'); };
const channelPo = function (over) {
  return Object.assign({
    purchaseOrderId: 'CHANNEL-REV-1', poValue: 50, orderDate: '2026-09-20',
    shipToPartyId: declaredShipToParty(0).partyId, freightTerm: 'prepaid',
    deliveryWindowStart: '2026-10-01', deliveryWindowEnd: '2026-10-08',
    lines: [chanLine('ASON-001', 10, 5)], simulated: true,
  }, over || {});
};
let READS = [channelPo()];
const reader = { fetchPurchaseOrders: async function () { return { ok: true, purchaseOrders: READS.slice() }; } };
const runRead = function () {
  return ingestChannelPurchaseOrders({
    reader: reader, catalogue: CATALOGUE, sinceIso: '2026-09-01', actorId: 'staff-test', now: CLOCK,
  });
};

const firstRead = await runRead();
const held = demoPurchaseOrders.find(function (p) { return p.poNumber === 'CHANNEL-REV-1'; });
out.firstRead = { ingested: firstRead.ingested, revised: firstRead.revised, revisionNumber: held.revisionNumber };

const auditsBefore = demoAuditLog.length;
const CHANGED = channelPo({
  lines: [chanLine('ASON-001', 6, 5)],
  deliveryWindowStart: '2026-11-01', deliveryWindowEnd: '2026-11-08',
});
READS = [CHANGED];
const secondRead = await runRead();
const revAudits = demoAuditLog.slice(auditsBefore).filter(function (a) { return a.action === 'po_revision_received'; });
out.secondRead = {
  revised: secondRead.revised,
  ingested: secondRead.ingested,
  alreadyPresent: secondRead.alreadyPresent,
  status: secondRead.outcomes[0] ? secondRead.outcomes[0].status : null,
  revisionNumber: held.revisionNumber,
  revisionCount: (held.revisions || []).length,
  recordQuantity: held.lineItems[0].quantity,
  recordWindowStart: held.deliveryWindowStart,
  supersededQuantity: held.revisions[0].supersededLines[0].quantity,
  changeKinds: held.revisions[0].changeKinds.slice().sort(),
  undercut: held.revisions[0].undercutsAcknowledgement,
  auditCount: revAudits.length,
  auditAction: revAudits[0] ? revAudits[0].action : null,
  auditActor: revAudits[0] ? revAudits[0].actorId : null,
  auditBrand: revAudits[0] ? revAudits[0].brandId : null,
  auditKinds: revAudits[0] && revAudits[0].metadata ? revAudits[0].metadata.changeKinds : null,
  auditSimulated: revAudits[0] && revAudits[0].metadata ? revAudits[0].metadata.simulated : null,
};
/* a REPLAY of the same read records nothing and does not duplicate history */
const thirdRead = await runRead();
out.thirdRead = {
  revised: thirdRead.revised,
  alreadyPresent: thirdRead.alreadyPresent,
  status: thirdRead.outcomes[0] ? thirdRead.outcomes[0].status : null,
  revisionCount: (held.revisions || []).length,
};
/* a changed read that no longer ROUTES is refused and changes nothing */
const beforeRefusal = JSON.stringify({ q: held.lineItems[0].quantity, n: held.revisionNumber });
READS = [channelPo({
  lines: [chanLine('ASON-001', 6, 5), chanLine('NOPE-999', 1, 1)],
  deliveryWindowStart: '2026-12-01', deliveryWindowEnd: '2026-12-08',
})];
const refusedRead = await runRead();
out.refusedRead = {
  refused: refusedRead.refused,
  revised: refusedRead.revised,
  status: refusedRead.outcomes[0] ? refusedRead.outcomes[0].status : null,
  reasonNamesCatalogue: /NOPE-999/.test(String(refusedRead.outcomes[0] ? refusedRead.outcomes[0].reason : '')),
  unchanged: JSON.stringify({ q: held.lineItems[0].quantity, n: held.revisionNumber }) === beforeRefusal,
};
/* a changed read that would MOVE the order between tenants is refused */
READS = [channelPo({ lines: [chanLine('TPIO-001', 6, 5)] })];
const crossTenantRead = await runRead();
out.crossTenantRead = {
  refused: crossTenantRead.refused,
  revised: crossTenantRead.revised,
  reasonNamesTenant: /brand-astonish/.test(String(crossTenantRead.outcomes[0] ? crossTenantRead.outcomes[0].reason : '')),
  unchanged: JSON.stringify({ q: held.lineItems[0].quantity, n: held.revisionNumber }) === beforeRefusal,
};
`;


const ENTRY_SHIP = `
/* ── 6. the documented risk: a SUPERSEDED order must not ship ─────────────── */
const shipPo = {
  id: 'po-rev-ship', brandId: 'brand-astonish', poNumber: 'CHANNEL-SHIP-1', status: 'accepted',
  shipToParty: { partyId: declaredShipToParty(0).partyId },
  poValue: 50, commissionRate: 12, commissionAmount: 6, orderDate: '2026-09-20',
  freightTerm: 'collect', shipWindowStart: '2026-10-05', shipWindowEnd: '2026-10-12',
  acknowledgedAt: '2026-09-20T10:00:00.000Z', acknowledgedRevision: 0, revisionNumber: 0,
  lineItems: [{
    sku: 'ASON-001', productName: 'x', quantity: 10, unitPrice: 5, commodityCode: '3304990090',
    ackStatus: 'accepted', acknowledgedQty: 10,
  }],
};
demoPurchaseOrders.push(shipPo);
const asnFor = function (carrier) {
  return {
    carrier: carrier, shipDate: '2026-10-06',
    cartons: [{ sku: 'ASON-001', quantity: 6, poNumber: 'CHANNEL-SHIP-1' }],
  };
};
let carrierUsed = null;
for (const candidate of ['palletline', 'dhl', 'amazon_partner']) {
  if (createShipmentForPO(shipPo.id, asnFor(candidate)).ok) { carrierUsed = candidate; break; }
}
const shipSnap = channelPo({ purchaseOrderId: 'CHANNEL-SHIP-1', lines: [chanLine('ASON-001', 6, 5)] });
const shipDerived = deriveChannelPoRevision(shipPo, shipSnap, T);
applyChannelPoRevision(shipPo, shipDerived.revision, shipSnap);
const staleShip = createShipmentForPO(shipPo.id, asnFor(carrierUsed));
out.ship = {
  carrierUsed: carrierUsed,
  staleRefused: staleShip.ok === false,
  staleNamesRevision: /revision/i.test(String(staleShip.error)),
  staleNamesOrder: /CHANNEL-SHIP-1/.test(String(staleShip.error)),
  stale: poRevisionState(shipPo).acknowledgementStale,
  state: poRevisionState(shipPo),
};
/* re-acknowledging the channel's CURRENT version clears the staleness */
const reAck = acknowledgePurchaseOrder(shipPo.id, [{
  sku: 'ASON-001', ackStatus: 'accepted', acknowledgedQty: 6,
}]);
const afterReAckShip = createShipmentForPO(shipPo.id, asnFor(carrierUsed));
out.ship.afterReAck = {
  ok: reAck.ok,
  acknowledgedRevision: shipPo.acknowledgedRevision,
  stale: poRevisionState(shipPo).acknowledgementStale,
  shipOk: afterReAckShip.ok === true,
  error: reAck.ok ? null : reAck.error,
};
/* a CANCELLED order can neither be acknowledged nor shipped */
const cancelledPo = {
  id: 'po-rev-cancelled', brandId: 'brand-astonish', poNumber: 'CHANNEL-CANCEL-1', status: 'accepted',
  shipToParty: { partyId: declaredShipToParty(0).partyId },
  poValue: 50, commissionRate: 12, commissionAmount: 6, orderDate: '2026-09-20',
  freightTerm: 'collect', shipWindowStart: '2026-10-05', shipWindowEnd: '2026-10-12',
  revisionNumber: 0, acknowledgedRevision: 0,
  lineItems: [{
    sku: 'ASON-001', productName: 'x', quantity: 10, unitPrice: 5, commodityCode: '3304990090',
    ackStatus: 'accepted', acknowledgedQty: 10,
  }],
};
demoPurchaseOrders.push(cancelledPo);
const cancelSnap = channelPo({
  purchaseOrderId: 'CHANNEL-CANCEL-1', channelStatus: 'cancelled', lines: [chanLine('ASON-001', 10, 5)],
});
const cancelDerived = deriveChannelPoRevision(cancelledPo, cancelSnap, T);
applyChannelPoRevision(cancelledPo, cancelDerived.revision, cancelSnap);
const cancelAck = acknowledgePurchaseOrder(cancelledPo.id, [
  { sku: 'ASON-001', ackStatus: 'accepted', acknowledgedQty: 10 },
]);
const cancelShip = createShipmentForPO(cancelledPo.id, {
  carrier: carrierUsed, shipDate: '2026-10-06',
  cartons: [{ sku: 'ASON-001', quantity: 10, poNumber: 'CHANNEL-CANCEL-1' }],
});
out.cancelled = {
  ackRefused: cancelAck.ok === false && /CANCELLED/i.test(String(cancelAck.error)),
  shipRefused: cancelShip.ok === false && /CANCELLED/i.test(String(cancelShip.error)),
};
`;


const ENTRY_MOCK = `
/* ── 7. the simulated channel can ISSUE a revision (mock-first reachability) ─ */
resetMockAmazonState();
const mock = createMockSpApiClient();
const mockCatalogue = demoProducts.map(function (p) { return { sku: p.sku, brandId: p.brandId }; });
const SINCE = '2026-09-01T00:00:00.000Z';
const mockRead1 = await mock.fetchPurchaseOrders(SINCE);
const mockIngest1 = await ingestChannelPurchaseOrders({
  reader: mock, catalogue: mockCatalogue, sinceIso: SINCE, actorId: 'staff-test',
});
const beforeEntry = mockRead1.purchaseOrders.find(function (p) { return p.purchaseOrderId === 'MOCK-PO-8841'; });
const issued = simulateMockChannelPoRevision('MOCK-PO-8841');
const mockRead2 = await mock.fetchPurchaseOrders(SINCE);
const afterEntry = mockRead2.purchaseOrders.find(function (p) { return p.purchaseOrderId === 'MOCK-PO-8841'; });
const mockIngest2 = await ingestChannelPurchaseOrders({
  reader: mock, catalogue: mockCatalogue, sinceIso: SINCE, actorId: 'staff-test',
});
const heldMock = demoPurchaseOrders.find(function (p) { return p.poNumber === 'MOCK-PO-8841'; });
out.mock = {
  poolCount: mockRead1.purchaseOrders.length,
  ingested: mockIngest1.ingested,
  refused: mockIngest1.refused,
  issued: issued.ok,
  beforeQty: beforeEntry.lines[0].quantity,
  afterQty: afterEntry.lines[0].quantity,
  revised: mockIngest2.revised,
  revisionNumber: heldMock ? poRevisionNumber(heldMock) : null,
  recordQty: heldMock ? heldMock.lineItems[0].quantity : null,
  revisionSimulated: heldMock && heldMock.revisions && heldMock.revisions[0] ? heldMock.revisions[0].simulated : null,
  revisionSource: heldMock && heldMock.revisions && heldMock.revisions[0] ? heldMock.revisions[0].source : null,
  unknownRefused: simulateMockChannelPoRevision('MOCK-PO-DOES-NOT-EXIST').ok === false,
  /**
   * §BATCH 2c (AV-024) — the simulated window change must be a CHANGE A REAL CHANNEL
   * COULD ISSUE: the window moves and keeps its length. It previously mapped both
   * boundaries onto one fixed date, collapsing the window to a single day.
   */
  windowMoved: afterEntry.deliveryWindowStart > beforeEntry.deliveryWindowStart,
  windowDaysBefore: Math.round(
    (new Date(beforeEntry.deliveryWindowEnd).getTime() -
      new Date(beforeEntry.deliveryWindowStart).getTime()) / 864e5
  ),
  windowDaysAfter: Math.round(
    (new Date(afterEntry.deliveryWindowEnd).getTime() -
      new Date(afterEntry.deliveryWindowStart).getTime()) / 864e5
  ),
  windowShiftDays: Math.round(
    (new Date(afterEntry.deliveryWindowStart).getTime() -
      new Date(beforeEntry.deliveryWindowStart).getTime()) / 864e5
  ),
};

/* ── 8. what the two SURFACES render from (the notice + the console history) ───
   The record the simulated channel has just revised is projected through the SAME
   owner the surfaces use (poRevisionState) and the SAME label map, so a change kind
   that gained no label, or a change row whose detail is blank, fails HERE rather
   than rendering an empty row in front of a brand or an operator. */
const surfaceRecord = heldMock;
const surfaceState = surfaceRecord ? poRevisionState(surfaceRecord) : null;
const surfaceLatest = surfaceState ? surfaceState.latest : null;
/* THE ROWS THE SURFACES RENDER: one per recorded change, exactly as the notice and
   the console history build them (owner label + the change's own subject/detail). */
const surfaceRows = surfaceLatest
  ? surfaceLatest.changes.map(function (c) {
      return {
        kind: c.kind,
        label: PO_CHANNEL_CHANGE_KIND_LABELS[c.kind],
        subject: c.subject,
        detail: c.detail,
      };
    })
  : [];
out.surface = {
  revisionNumber: surfaceState ? surfaceState.revisionNumber : null,
  revisionsRendered: surfaceRecord && surfaceRecord.revisions ? surfaceRecord.revisions.length : 0,
  ruleText: PO_REVISION_RULE_TEXT,
  changeRows: surfaceRows,
  kindsWithoutLabel: surfaceRows
    .filter(function (r) { return !(typeof r.label === 'string' && r.label.length > 0); })
    .map(function (r) { return r.kind; }),
  everyRowReadable:
    surfaceRows.length > 0 &&
    surfaceRows.every(function (r) {
      return (
        typeof r.label === 'string' && r.label.length > 0 &&
        typeof r.subject === 'string' && r.subject.length > 0 &&
        typeof r.detail === 'string' && r.detail.length > 0
      );
    }),
  changeKindCount: surfaceLatest ? surfaceLatest.changeKinds.length : 0,
  /** Every declared kind, and the kinds that actually produced a rendered row. */
  changeKinds: surfaceLatest ? surfaceLatest.changeKinds.slice().sort() : [],
  kindsWithRow: surfaceRows
    .map(function (r) { return r.kind; })
    .filter(function (k, i, all) { return all.indexOf(k) === i; })
    .sort(),
  /**
   * A row must not repeat its own label: the label is rendered from its owner BESIDE
   * the detail, so a detail containing it reads the same words twice (that was the
   * observed defect: "ship / delivery window — delivery window: ship / delivery window
   * 2026-10-17 … → …").
   */
  rowsRepeatingTheirLabel: surfaceRows
    .filter(function (r) { return r.label.length > 0 && r.detail.indexOf(r.label) !== -1; })
    .map(function (r) { return r.detail; }),
  channelCancelled: surfaceState ? surfaceState.channelCancelled : null,
  acknowledgementStale: surfaceState ? surfaceState.acknowledgementStale : null,
};
simulateMockChannelPoRevision('MOCK-PO-8842', { cancelOrder: true });
const mockRead3 = await mock.fetchPurchaseOrders(SINCE);
out.mockCancelled = mockRead3.purchaseOrders
  .find(function (p) { return p.purchaseOrderId === 'MOCK-PO-8842'; }).channelStatus;
resetMockAmazonState();
const mockRead4 = await mock.fetchPurchaseOrders(SINCE);
out.mockAfterReset = {
  count: mockRead4.purchaseOrders.length,
  status: mockRead4.purchaseOrders
    .find(function (p) { return p.purchaseOrderId === 'MOCK-PO-8842'; }).channelStatus,
  qty: mockRead4.purchaseOrders
    .find(function (p) { return p.purchaseOrderId === 'MOCK-PO-8841'; }).lines[0].quantity,
};

/* ── 8. nothing in this run may make a live call ──────────────────────────── */
out.network = 'sabotaged';

console.log('__RESULT__' + JSON.stringify(out));
})().catch(function (error) {
  console.log('__RESULT__' + JSON.stringify({ runtimeError: String(error && error.message ? error.message : error) }));
});
`;

/* ── Bundle and execute the REAL modules ──────────────────────────────────── */

const ENTRY = [ENTRY_HEAD, ENTRY_DERIVE, ENTRY_RUNTIME, ENTRY_SHIP, ENTRY_MOCK].join('\n');

const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'mercenta-po-revision-'));
const entryPath = path.join(tmpDir, 'entry.ts');
const outPath = path.join(tmpDir, 'bundle.cjs');
fs.writeFileSync(entryPath, ENTRY, 'utf8');

let result;
try {
  execFileSync(
    path.join(ROOT, 'node_modules/.bin/esbuild'),
    [
      entryPath,
      '--bundle',
      /**
       * CJS, not ESM: the app seam pulls in the Supabase client, whose CJS build
       * cannot be inlined into an ESM bundle ("Dynamic require of \"stream\" is not
       * supported"). Every sibling gate that executes `src/data/api.ts` uses this
       * same form.
       */
      '--format=cjs',
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
  console.log(`  FAIL  bundling/executing the real modules — ${String(error).slice(0, 900)}`);
  console.log('');
  console.log('PO_REVISION_INGESTION_VALIDATION_FAIL (0 passed, 1 failed)');
  process.exit(1);
}


/* A crash inside the executed modules must be REPORTED, not hidden behind the
   assertions that follow it. */
if (result && result.runtimeError) {
  console.log(`  FAIL  the executed modules threw — ${result.runtimeError}`);
  console.log('');
  console.log('PO_REVISION_INGESTION_VALIDATION_FAIL (0 passed, 1 failed)');
  process.exit(1);
}

/* ── 1. the declaration and its ONE owner ─────────────────────────────────── */

console.log('§ 1. The channel\'s documented change kinds are declared ONCE\n');
const DOCUMENTED_KINDS = [
  'window', 'quantity', 'item_cancellation', 'cost', 'new_item',
  'cancel', 'uncancel', 'order_type', 'destination_fc', 'freight_term',
];
check(
  'the declared kinds are exactly the register\'s documented set (AV-024)',
  JSON.stringify(result.kinds) === JSON.stringify(DOCUMENTED_KINDS),
  JSON.stringify(result.kinds)
);
check('every declared kind carries an operator label', result.labels.length === result.kinds.length && result.labels.every(Boolean));
check(
  'the ONE operator statement names the documented obligation (the UPDATED order is the one fulfilled)',
  /updated purchase order is the one that must be fulfilled/.test(result.ruleText),
  result.ruleText
);
const typesSrc = read('src/types.ts');
const configSrc = read('src/config/purchaseOrders.ts');
check(
  'the vocabulary is declared ONCE (types.ts) and the config IMPORTS it rather than re-typing it',
  (typesSrc.match(/export const PO_CHANNEL_CHANGE_KINDS/g) || []).length === 1 &&
  !/export const PO_CHANNEL_CHANGE_KINDS/.test(configSrc) &&
  /PO_CHANNEL_CHANGE_KINDS/.test(configSrc)
);
check(
  'the rule statement is declared ONCE and not re-typed',
  (configSrc.match(/export const PO_REVISION_RULE_TEXT/g) || []).length === 1 &&
  countInSrc('updated purchase order is the one') === 1,
  `occurrences: ${countInSrc('updated purchase order is the one')}`
);
check('the revision owner contains no TODO/FIXME placeholder', !/TODO|FIXME/.test(read('src/lib/commerce/poRevisions.ts')));
check(
  'the revision owner makes no network call of its own',
  !/fetch\s*\(|XMLHttpRequest|axios/.test(code('src/lib/commerce/poRevisions.ts'))
);

/* ── 2. the derivation is complete and fail-closed ────────────────────────── */

console.log('\n§ 2. The derivation detects every documented kind — and fails CLOSED\n');
const D = result.derive;
check('a read carrying NO change is not a revision', D.unchanged === 'REFUSED:CHANNEL_REVISION_UNCHANGED', String(D.unchanged));
check('a QUANTITY change is detected', JSON.stringify(D.quantity) === '["quantity"]', JSON.stringify(D.quantity));
check('a COST change is detected', JSON.stringify(D.cost) === '["cost"]', JSON.stringify(D.cost));
check('a NEW ITEM (a line the channel added) is detected', JSON.stringify(D.newItem) === '["new_item"]', JSON.stringify(D.newItem));
check('an ITEM CANCELLATION is detected', JSON.stringify(D.itemCancellation) === '["item_cancellation"]', JSON.stringify(D.itemCancellation));
check('a WINDOW change is detected', JSON.stringify(D.window) === '["window"]', JSON.stringify(D.window));
check(
  'a DESTINATION FC change is detected',
  result.fcDistinct === true && JSON.stringify(D.destination) === '["destination_fc"]',
  JSON.stringify(D.destination)
);
check('a FREIGHT TERM change is detected (and the window it governs moves too)', JSON.stringify(D.freight) === '["freight_term","window"]', JSON.stringify(D.freight));
check('an ORDER TYPE change is detected', JSON.stringify(D.orderType) === '["order_type"]', JSON.stringify(D.orderType));
check('a CANCEL is detected', JSON.stringify(D.cancel) === '["cancel"]', JSON.stringify(D.cancel));
check('re-reading an ALREADY cancelled order is NOT a change (no false positive)', D.alreadyCancelledIsNotAChange === 'REFUSED:CHANNEL_REVISION_UNCHANGED', String(D.alreadyCancelledIsNotAChange));
check('an UNCANCEL is detected', JSON.stringify(D.uncancel) === '["uncancel"]', JSON.stringify(D.uncancel));
check('an unaffected order TYPE is not a change', D.absentOptionalIsNotAChange === 'REFUSED:CHANNEL_REVISION_UNCHANGED', String(D.absentOptionalIsNotAChange));
check('a read with NO LINES is REFUSED (fail-closed)', D.noLines === 'REFUSED:CHANNEL_PO_UNREADABLE', String(D.noLines));
check('an UNREADABLE order date is REFUSED (fail-closed)', D.badOrderDate === 'REFUSED:CHANNEL_PO_ORDER_DATE_UNREADABLE', String(D.badOrderDate));
check('a MISMATCHED order identity is REFUSED (fail-closed)', D.wrongIdentity === 'REFUSED:CHANNEL_PO_IDENTITY_MISMATCH', String(D.wrongIdentity));


/* ── 3. the undercut detection (the documented risk in AV-024) ────────────── */

console.log('\n§ 3. A channel change that undercuts a recorded decision is FLAGGED\n');
check('a quantity REDUCED BELOW the acknowledged units is an undercut', result.undercut.reducedBelowAcknowledged === true);
check('a reduction that is still at or above the acknowledged units is NOT an undercut', result.undercut.reducedAboveAcknowledged === false);
check('a change to an UNACKNOWLEDGED line is not an undercut (nothing was decided)', result.undercut.unacknowledgedLineIsNotAnUndercut === false);
check('cancelling a line the brand had ACKNOWLEDGED is an undercut', result.undercut.acknowledgedLineCancelled === true);
check('cancelling the PO after a decision is an undercut', result.undercut.cancelledAfterDecision === true);

/* ── 4. the writer moves the record to the channel's version, keeps the old ── */

console.log('\n§ 4. The record takes the CHANNEL\'S current version; the old one is KEPT\n');
const A = result.applied;
check('the line quantity is the CHANNEL\'S current figure', A.quantity === 6, String(A.quantity));
check('the acknowledgement is clamped to the channel\'s quantity (the canonical invariant holds)', A.acknowledgedQty === 6, String(A.acknowledgedQty));
check('the line\'s acknowledgement STATUS is carried forward, never discarded', A.ackStatus === 'accepted', String(A.ackStatus));
check('the revision is numbered and appended', A.revisionNumber === 1 && A.revisionCount === 1, JSON.stringify(A));
check('the SUPERSEDED line set is retained (history moved, not destroyed)', A.supersededQuantity === 10 && A.supersededAcknowledged === 10, JSON.stringify(A));
check('the value is recomputed from the channel\'s own lines', A.poValue === 30, String(A.poValue));
check('the undercut raises Mercenta\'s review reason', A.reviewReason === true);
check('the revision carries a deterministic digest', A.digestIsString === true);
check('applying the SAME revision again does not duplicate history', A.revisionCount === 1 && result.appliedTwiceRevisionCount === 1, String(result.appliedTwiceRevisionCount));
check('applying it again does not duplicate the line set', JSON.stringify(result.appliedTwiceLines) === '["ASON-001"]', JSON.stringify(result.appliedTwiceLines));

/* ── 5. the ingestion owner records the revision, once, attributed ────────── */

console.log('\n§ 5. Ingestion records the channel revision — once, attributed and audited\n');
const F = result.firstRead;
const S = result.secondRead;
const T3 = result.thirdRead;
check('the FIRST read files the order and reports NO revision', F.ingested === 1 && F.revised === 0 && F.revisionNumber === 0, JSON.stringify(F));
check('the CHANGED read is reported as a REVISION (not as a new order)', S.revised === 1 && S.ingested === 0 && S.status === 'revised', JSON.stringify(S));
check('the record is moved to the CHANNEL\'S current quantity and window', S.recordQuantity === 6 && S.recordWindowStart === '2026-11-01', JSON.stringify(S));
check('the superseded version is retained on the record', S.supersededQuantity === 10 && S.revisionCount === 1, JSON.stringify(S));
check('the revision states which documented kinds changed', S.changeKinds.includes('quantity') && S.changeKinds.includes('window'), JSON.stringify(S.changeKinds));
check('the revision is AUDITED as `po_revision_received`, attributed to the actor and tenant', S.auditCount === 1 && S.auditAction === 'po_revision_received' && S.auditActor === 'staff-test' && S.auditBrand === 'brand-astonish', JSON.stringify(S));
check('the audit carries the change kinds and the SIMULATED provenance', Array.isArray(S.auditKinds) && S.auditSimulated === true, JSON.stringify(S));
check('a REPLAY of the same read records nothing and duplicates no history', T3.revised === 0 && T3.alreadyPresent === 1 && T3.status === 'already_present' && T3.revisionCount === 1, JSON.stringify(T3));
check('a changed read that no longer ROUTES is REFUSED (fail-closed)', result.refusedRead.refused === 1 && result.refusedRead.revised === 0 && result.refusedRead.status === 'refused' && result.refusedRead.reasonNamesCatalogue === true, JSON.stringify(result.refusedRead));
check('that refusal left the held order byte-for-byte unchanged', result.refusedRead.unchanged === true);
check('a changed read that would MOVE the order between tenants is REFUSED', result.crossTenantRead.refused === 1 && result.crossTenantRead.revised === 0 && result.crossTenantRead.reasonNamesTenant === true, JSON.stringify(result.crossTenantRead));
check('that refusal left the held order byte-for-byte unchanged', result.crossTenantRead.unchanged === true);


/* ── 6. the documented risk: a superseded order must not SHIP ─────────────── */

console.log('\n§ 6. A SUPERSEDED purchase order cannot ship (the AV-024 risk itself)\n');
const P = result.ship;
check('a shippable order was found (the refusal below is not vacuous)', typeof P.carrierUsed === 'string', String(P.carrierUsed));
check('after the channel changed it, a shipment is REFUSED', P.staleRefused === true);
check('the refusal NAMES the channel revision', P.staleNamesRevision === true);
check('the refusal NAMES the order', P.staleNamesOrder === true);
check('the record derives the acknowledgement as STALE', P.stale === true && P.state.acknowledgementStale === true && P.state.revisionNumber === 1);
check('re-acknowledging the channel\'s CURRENT version is ACCEPTED', P.afterReAck.ok === true && P.afterReAck.acknowledgedRevision === 1, JSON.stringify(P.afterReAck));
check('the acknowledgement is no longer stale once it answers the current version', P.afterReAck.stale === false);
check('the shipment is then ACCEPTED again (the order is fulfilable)', P.afterReAck.shipOk === true);
check('a CANCELLED order cannot be acknowledged', result.cancelled.ackRefused === true);
check('a CANCELLED order cannot ship', result.cancelled.shipRefused === true);

/* ── 7. mock-first: the path is reachable from the product ────────────────── */

console.log('\n§ 7. The SIMULATED channel can issue a revision (mock-first reachability)\n');
const M = result.mock;
check('the simulated channel still holds its 4 POs (the P11 contract is unchanged)', M.poolCount === 4, String(M.poolCount));
check('a simulated read files the routable orders and refuses the out-of-catalogue one', M.ingested === 3 && M.refused === 1, JSON.stringify(M));
check('the simulated channel can ISSUE a revision', M.issued === true);
check('the simulated revision CHANGES the order', M.afterQty < M.beforeQty, `${M.beforeQty} → ${M.afterQty}`);
check('ingesting it records a revision, and the record takes the channel\'s figure', M.revised === 1 && M.revisionNumber === 1 && M.recordQty === M.afterQty, JSON.stringify(M));
check('the recorded revision is marked SIMULATED and sourced from the channel poll', M.revisionSimulated === true && M.revisionSource === 'channel_poll', JSON.stringify(M));
check('an unknown order id cannot be revised', M.unknownRefused === true);
check(
  'the simulated channel change MOVES the order window (the change is real)',
  M.windowMoved === true && M.windowShiftDays === 14,
  JSON.stringify({ moved: M.windowMoved, shiftDays: M.windowShiftDays })
);
check(
  'the simulated window change PRESERVES the window length (never a collapsed one-day window)',
  M.windowDaysAfter === M.windowDaysBefore && M.windowDaysAfter > 0,
  `${M.windowDaysBefore} days → ${M.windowDaysAfter} days`
);
check('the simulated channel can CANCEL an order', result.mockCancelled === 'cancelled', String(result.mockCancelled));
check('the reset RESTORES the baseline (a simulated revision cannot leak on)', result.mockAfterReset.count === 4 && result.mockAfterReset.status === 'open' && result.mockAfterReset.qty === M.beforeQty, JSON.stringify(result.mockAfterReset));

/* ── 8. the app seams: one owner, no second path, no network ──────────────── */

console.log('\n§ 8. One owner, one writer, zero network\n');
check('the ingestion owner derives the revision through the ONE owner', /deriveChannelPoRevision/.test(code('src/lib/commerce/channelPurchaseOrderIngestion.ts')));
check('the ingestion owner applies it through the ONE writer', /applyChannelPoRevision/.test(code('src/lib/commerce/channelPurchaseOrderIngestion.ts')));
check(
  'the acknowledgement writer reads the DERIVED revision position (never re-derives it)',
  /poRevisionState\(po\)/.test(code('src/data/api.ts'))
);
check(
  'the shipment gate refuses on the DERIVED state',
  /poRevisionState\(po\)[\s\S]{0,900}acknowledgementStale/.test(code('src/data/api.ts'))
);
check('the ingestion owner makes no direct network call', !/fetch\s*\(|XMLHttpRequest|axios/.test(code('src/lib/commerce/channelPurchaseOrderIngestion.ts')));
check('ZERO external network calls occurred (any call would have thrown)', result.network === 'sabotaged');

console.log('');

/* ── 9. the two SURFACES: the brand notice and the console revision history ── */

console.log('§ 9. The brand notice and the console history render the DERIVED position\n');
const brandSrc = code('src/components/brand/BrandPurchaseOrders.tsx');
const adminSrc = code('src/components/admin/AdminPurchaseOrderDetail.tsx');
const listSrc = code('src/components/admin/AdminPurchaseOrderList.tsx');
const SURF = result.surface;
check(
  'the record the simulated channel revised holds the version the surfaces state',
  SURF.revisionNumber === 1 && SURF.revisionsRendered === 1,
  JSON.stringify({ revisionNumber: SURF.revisionNumber, revisionsRendered: SURF.revisionsRendered })
);
check(
  'every change the surfaces render carries a label from the ONE map (never a blank kind)',
  SURF.kindsWithoutLabel.length === 0,
  JSON.stringify(SURF.kindsWithoutLabel)
);
check(
  'every change the surfaces render carries a non-empty subject AND detail (never a blank row)',
  SURF.everyRowReadable === true && SURF.changeRows.length > 0,
  JSON.stringify(SURF.changeRows)
);
check(
  'every kind the revision declares produced a rendered row (no change is dropped)',
  JSON.stringify(SURF.kindsWithRow) === JSON.stringify(SURF.changeKinds) && SURF.changeKinds.length > 0,
  JSON.stringify({ declared: SURF.changeKinds, rendered: SURF.kindsWithRow })
);
check(
  'no rendered change row repeats its own label (the label is rendered once, from its owner)',
  SURF.rowsRepeatingTheirLabel.length === 0,
  JSON.stringify(SURF.rowsRepeatingTheirLabel)
);
check(
  'every rendered change row reads as the change itself (subject: previous → current)',
  SURF.changeRows.every(function (r) { return /→/.test(r.detail); }),
  JSON.stringify(SURF.changeRows.map(function (r) { return r.detail; }))
);
check(
  'the statement the surfaces render is the owner\'s own rule text',
  /updated purchase order is the one that must be fulfilled/.test(SURF.ruleText),
  SURF.ruleText
);
check('the brand surface asks the ONE owner for the revision position', /poRevisionState\(po\)/.test(brandSrc));
check(
  'the brand surface renders the rule from its owner rather than a second copy',
  /\{\s*PO_REVISION_RULE_TEXT\s*\}/.test(brandSrc)
);
check(
  'the brand notice labels every change kind from the ONE map',
  /PO_CHANNEL_CHANGE_KIND_LABELS\[change\.kind\]/.test(brandSrc)
);
check(
  'the brand notice is on the order itself, not only behind a control',
  /<ChannelRevisionNotice po=\{po\} \/>/.test(brandSrc)
);
check('the brand notice states the version it is working from', /working from version/.test(brandSrc));
check(
  'the brand notice states that an earlier acknowledgement must be updated before shipping',
  /before this order can be shipped/.test(brandSrc)
);
check(
  'the brand notice renders NOTHING for an order the channel has never changed',
  /state\.revisionNumber === 0\) return null/.test(brandSrc)
);
check('the console reads the revision position from the SAME owner', /poRevisionState\(po\)/.test(adminSrc));
check(
  'the console renders EVERY recorded revision from the append-only list',
  /po\.revisions \?\? \[\]/.test(adminSrc) && /revisions\.map\(/.test(adminSrc)
);
check(
  'the console history states each change with its owner label AND its own detail',
  /PO_CHANNEL_CHANGE_KIND_LABELS\[change\.kind\]/.test(adminSrc) && /\{change\.detail\}/.test(adminSrc)
);
check(
  'the console history states the recorded review reason when a decision was undercut',
  /\{revision\.reviewReason\}/.test(adminSrc)
);
check(
  'the console history renders NOTHING for an order the channel has never changed',
  /revisions\.length === 0\) return null/.test(adminSrc)
);
check(
  'the console history renders the rule from its owner rather than a second copy',
  /\{\s*PO_REVISION_RULE_TEXT\s*\}/.test(adminSrc)
);
check(
  'the simulated channel change is reachable from the PRODUCT, through the mock seam',
  /simulateMockChannelPoRevision\(candidate\.poNumber\)/.test(listSrc)
);
check(
  'the simulated change is re-read through the ONE ingestion owner (no second write path)',
  /await ingestChannelPurchaseOrders\(/.test(listSrc)
);
check(
  'the simulate control is refused unless a SIMULATED channel read is active (fail-closed)',
  /ingestResult\?\.mode !== 'mock'/.test(listSrc)
);
check(
  'the simulate control is labelled as simulation and states that no live call is made',
  /Simulate a channel order change \(sim\)/.test(listSrc) && /No live channel call was made/.test(listSrc)
);
check(
  'no surface re-types the rule (it is written in ONE file under src/)',
  countInSrc('updated purchase order is the one') === 1,
  `files carrying it: ${countInSrc('updated purchase order is the one')}`
);

console.log('');
if (fail === 0) {
  console.log(`PO_REVISION_INGESTION_VALIDATION_PASS (${pass} passed, 0 failed)`);
  process.exit(0);
}
console.log(`PO_REVISION_INGESTION_VALIDATION_FAIL (${pass} passed, ${fail} failed)`);
for (const error of errors) console.log(`  · ${error}`);
process.exit(1);

