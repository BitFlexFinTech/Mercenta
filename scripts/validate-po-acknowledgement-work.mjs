/**
 * §P13 / S3 — THE PO ACKNOWLEDGEMENT WORK LAYER validation.
 *
 * S1 proved the window RULE; S2 proved it is ENFORCED at the domain boundary and
 * that Mercenta performs the required rejection on the brand's behalf. S3 removes
 * the founder-reported defect AT SOURCE: `deriveWorkItems` no longer re-derives
 * "is this PO still actionable?" — it asks the rule's OWNER, so the
 * acknowledgement queue can no longer advertise work the channel does not permit
 * (PO-9201 / PO-9211 — shipped, 41 days past their deadline — used to arrive as
 * "Acknowledge PO-…" items).
 *
 * Proves, against the REAL modules (no mocks):
 *  1. ONE OWNER: the work layer imports the window owner, and the hand-rolled
 *     predicate, the hand-written window wording and the duplicate deadline
 *     arithmetic are all gone.
 *  2. The derived queue IS the owner's queue — a BIJECTION: every derived
 *     acknowledgement item's PO is `inQueue`, every queue PO has exactly ONE item
 *     (deterministic id, critical, dated with the OWNER's deadline, scoped to the
 *     PO's own tenant).
 *  3. The founder-reported stale POs derive NO acknowledgement work.
 *  4. The row's wording IS the owner's own `reason` for that PO at the SAME
 *     pinned instant (so the queue row and the PO surface cannot disagree), and
 *     it states the REAL window state — time left in the queue, and the closing
 *     on-behalf window near the limit.
 *  5. Fail-closed and closed cases derive nothing: past the limit, unreadable
 *     order date, already acknowledged, channel-closed, or no obligation.
 *  6. THE CLOCK SEAM: the window is judged on an INSTANT (`now`, injectable),
 *     never on the pinned demo DATE — the same PO is in the queue at one instant
 *     and out of it at another.
 *  7. Tenant isolation survives, and resolving an acknowledgement item stops its
 *     reminders (it leaves the attention set).
 *  8. Zero network calls: `fetch` is sabotaged BEFORE any module loads.
 */
import { createServer } from 'vite';
import { readFileSync } from 'node:fs';

/* §8 — no live call is possible anywhere in this run. */
let fetchCalls = 0;
globalThis.fetch = () => {
  fetchCalls++;
  throw new Error('NETWORK_CALL_ATTEMPTED');
};

const server = await createServer({ server: { middlewareMode: true }, logLevel: 'error' });

let failures = 0;
function test(name, cond, extra) {
  console.log(`${cond ? '✓' : '✗'} ${name}${cond || !extra ? '' : ` — ${extra}`}`);
  if (!cond) failures++;
}

const work = await server.ssrLoadModule('/src/lib/work/workStore.ts');
const win = await server.ssrLoadModule('/src/lib/commerce/poAcknowledgementWindow.ts');
const cfg = await server.ssrLoadModule('/src/config/purchaseOrders.ts');
const store = await server.ssrLoadModule('/src/data/demoStore.ts');

const NOW = new Date();
const HOUR = 3_600_000;

/** Fixtures are pushed through the REAL store, as the scenario engine does — never
    a hand-built object the work layer cannot look up. */
function pushPo(over) {
  const po = {
    id: over.id,
    brandId: over.brandId ?? 'brand-tapatio',
    poNumber: over.poNumber,
    status: over.status ?? 'received',
    poValue: 1000,
    commissionRate: 0.2,
    commissionAmount: 200,
    orderDate: over.orderDate,
    ...(over.acknowledgedAt ? { acknowledgedAt: over.acknowledgedAt } : {}),
    lineItems: [
      {
        sku: 'FIX-001',
        productName: 'Fixture line 001',
        quantity: 10,
        unitPrice: 10,
        commodityCode: '0000000000',
      },
    ],
  };
  store.demoPurchaseOrders.push(po);
  return po;
}

/** Every acknowledgement item derived at the pinned instant, with its PO. */
const ackItemsAt = (now) =>
  work
    .deriveWorkItems(now)
    .filter((w) => w.source === 'po_acknowledgement')
    .map((w) => ({ item: w, po: store.demoPurchaseOrders.find((p) => p.id === w.entity.id) }));

const ackIdsAt = (now) => ackItemsAt(now).map(({ item }) => item.entity.id);

/* ── 1. ONE owner for the question, the wording and the deadline ─────────── */
const SRC = readFileSync('src/lib/work/workStore.ts', 'utf8');
test('the work layer imports the window OWNER', /from '@\/lib\/commerce\/poAcknowledgementWindow'/.test(SRC));
test('the hand-rolled "unacknowledged" predicate is GONE', !/if \(!po\.acknowledgedAt\)/.test(SRC));
test(
  'the hand-rolled channel-closed short-circuit is GONE (the owner classifies)',
  !/po\.status === 'rejected' \|\| po\.status === 'delivered'\) continue/.test(SRC)
);
test('the acknowledgement row asks the owner’s QUEUE', /ackWindow\.inQueue/.test(SRC));
test('the row wording IS the owner’s own reason', /ackWindow\.reason/.test(SRC));
test('the row deadline IS the owner’s own deadline', /poAcknowledgementDeadline\(po\)/.test(SRC));
test('no second copy of the deadline arithmetic remains', !/addDays\(po\.orderDate, 1\)/.test(SRC));
test(
  'the declared window still has ONE owner (re-exported, never re-declared)',
  !/PO_ACKNOWLEDGEMENT_HOURS\s*=\s*24/.test(SRC) &&
    work.PO_ACKNOWLEDGEMENT_HOURS === cfg.PO_ACKNOWLEDGEMENT_HOURS
);

/* ── 2. The derived queue IS the owner's queue (a bijection) ─────────────── */
const queuePos = store.demoPurchaseOrders.filter((p) => win.poAcknowledgementWindow(p, NOW).inQueue);
const ackItems = ackItemsAt(NOW);
test('the seeded demo produces acknowledgement work to exercise the rule', ackItems.length > 0, String(ackItems.length));
test(
  'EVERY derived acknowledgement item belongs to a PO the owner has in its QUEUE',
  ackItems.every(({ po }) => po && win.poAcknowledgementWindow(po, NOW).inQueue === true)
);
test(
  'and EVERY queue PO has exactly ONE derived item (the queue is a bijection)',
  JSON.stringify(ackItems.map(({ po }) => po.id).sort()) === JSON.stringify(queuePos.map((p) => p.id).sort()),
  `items=${ackItems.length} queue=${queuePos.length}`
);
test(
  'every item id is the deterministic work id for its PO',
  ackItems.every(({ item, po }) => item.id === work.workItemId('po_acknowledgement', po.id))
);
test(
  'every item is critical and carries a DATE deadline (calendar contract)',
  ackItems.every(({ item }) => item.priority === 'critical' && /^\d{4}-\d{2}-\d{2}$/.test(item.dueDate ?? ''))
);
test(
  'every deadline IS the owner’s deadline date for that PO',
  ackItems.every(({ item, po }) => item.dueDate === win.poAcknowledgementDeadline(po).slice(0, 10))
);
test(
  'every item is scoped to its PO’s own tenant',
  ackItems.every(({ item, po }) => item.tenantId === po.brandId && item.entity.type === 'purchase_order')
);
test(
  'every item is titled for the acknowledgement it asks for (the surface regex)',
  ackItems.every(({ item, po }) => item.title === `Acknowledge ${po.poNumber}`)
);

/* ── 3. The founder-reported defect, removed at source ───────────────────── */
const staleSeeded = store.demoPurchaseOrders.filter((p) => ['PO-9201', 'PO-9211'].includes(p.poNumber));
test(
  'the founder-reported POs are still in the demo (the regression fixture)',
  staleSeeded.length > 0,
  String(staleSeeded.length)
);
test(
  'the founder-reported stale POs derive NO acknowledgement work at all',
  staleSeeded.every((p) => !ackItems.some(({ po }) => po.id === p.id))
);

/* ── 4. The wording IS the owner's, and it states the REAL window state ──── */
const inQueueSample = ackItems.find(({ po }) => win.poAcknowledgementWindow(po, NOW).hoursLeft > 2);
test('an in-window queue item EXISTS to check the wording', Boolean(inQueueSample));
test(
  'the row states the owner’s own reason VERBATIM (evaluated at the same instant)',
  Boolean(inQueueSample) &&
    inQueueSample.item.detail.includes(win.poAcknowledgementWindow(inQueueSample.po, NOW).reason)
);
test(
  'the row therefore states the time LEFT of the 24-hour window',
  /left of the 24-hour window/.test(inQueueSample?.item.detail ?? ''),
  inQueueSample?.item.detail
);
test(
  'the row names its brand and its value alongside the window state',
  Boolean(inQueueSample) &&
    /£/.test(inQueueSample.item.detail) &&
    inQueueSample.item.detail.startsWith(work.brandLabel(inQueueSample.po.brandId))
);

/* ── 5. Closed / fail-closed cases derive NOTHING (fixtures, real store) ─── */
const closing = pushPo({ id: 'po-s3-closing', poNumber: 'PO-S3-CLOSING', orderDate: new Date(NOW.getTime() - 23 * HOUR).toISOString() });
const stale = pushPo({ id: 'po-s3-stale', poNumber: 'PO-S3-STALE', orderDate: new Date(NOW.getTime() - 30 * HOUR).toISOString() });
const unreadable = pushPo({ id: 'po-s3-unknown', poNumber: 'PO-S3-UNKNOWN', orderDate: 'not-an-instant' });
const acked = pushPo({ id: 'po-s3-acked', poNumber: 'PO-S3-ACKED', orderDate: NOW.toISOString(), acknowledgedAt: NOW.toISOString() });
const delivered = pushPo({ id: 'po-s3-delivered', poNumber: 'PO-S3-DELIVERED', status: 'delivered', orderDate: NOW.toISOString() });
const rejected = pushPo({ id: 'po-s3-rejected', poNumber: 'PO-S3-REJECTED', status: 'rejected', orderDate: NOW.toISOString() });
const pastDecision = pushPo({ id: 'po-s3-accepted', poNumber: 'PO-S3-ACCEPTED', status: 'accepted', orderDate: NOW.toISOString() });

test(
  'the fixtures really ARE in those states (the refusals below are not vacuous)',
  win.poAcknowledgementWindow(closing, NOW).inQueue === true &&
    win.poAcknowledgementWindow(stale, NOW).mustReject === true &&
    win.poAcknowledgementWindow(unreadable, NOW).channelState === 'unknown' &&
    win.poAcknowledgementWindow(acked, NOW).channelState === 'acknowledged' &&
    win.poAcknowledgementWindow(delivered, NOW).channelState === 'closed'
);
const fixtureIds = ackIdsAt(NOW);
test('a PO inside the CLOSING window is still queue work', fixtureIds.includes(closing.id));
const closingRow = ackItemsAt(NOW).find(({ po }) => po.id === closing.id);
test(
  '…and its row states the closing window’s on-behalf stance',
  /behalf/.test(closingRow?.item.detail ?? ''),
  closingRow?.item.detail
);
test('a PO PAST THE LIMIT derives NO acknowledgement work', !fixtureIds.includes(stale.id));
test('an UNREADABLE order date derives NO work (fail closed, never "still open")', !fixtureIds.includes(unreadable.id));
test('an ALREADY ACKNOWLEDGED PO derives NO work', !fixtureIds.includes(acked.id));
test('a channel-CLOSED (delivered) PO derives NO work', !fixtureIds.includes(delivered.id));
test('a channel-CLOSED (rejected) PO derives NO work', !fixtureIds.includes(rejected.id));
test('a PO with NO obligation (past the acknowledgement decision) derives NO work', !fixtureIds.includes(pastDecision.id));

/* ── 6. The clock seam — an INSTANT rule, never the pinned demo DATE ─────── */
test(
  'THE CLOCK SEAM: the same PO is in the queue at NOW and OUT of it 30h later',
  ackIdsAt(NOW).includes(closing.id) && !ackIdsAt(new Date(NOW.getTime() + 30 * HOUR)).includes(closing.id)
);
test(
  'the judgement is NOT driven by the pinned demo DATE',
  (() => {
    work.setDemoClock('2020-01-01');
    const ids = ackIdsAt(NOW);
    work.setDemoClock(null);
    return ids.includes(closing.id);
  })()
);
test(
  'derivation at a pinned instant is deterministic (ids, deadlines, priorities, wording)',
  JSON.stringify(ackItemsAt(NOW)) === JSON.stringify(ackItemsAt(NOW))
);

/* ── 7. Tenant isolation + reminders stop ───────────────────────────────── */
const tenants = [...new Set(ackItems.map(({ po }) => po.brandId))];
test('acknowledgement work exists in more than one tenant', tenants.length > 1, String(tenants.length));
const [tA, tB] = tenants;
const brandA = work.getWorkItems('brand', tA).filter((w) => w.source === 'po_acknowledgement');
test(
  'a brand scope only ever returns its OWN acknowledgement work',
  brandA.length > 0 && brandA.every((w) => w.tenantId === tA)
);
test('a brand NEVER receives another tenant’s acknowledgement work', !brandA.some((w) => w.tenantId === tB));
const target = brandA[0];
const before = work.getWorkItems('brand', tA).length;
const resolved = work.resolveWorkItem(target.id, 'staff:mercenta-ops', 'S3 gate: acknowledgement worked');
test('resolving an acknowledgement item marks it done', resolved !== null && resolved.status === 'done');
test('…and its reminders STOP (it has left the attention set)', work.getWorkItems('brand', tA).length === before - 1);

/* ── 8. Zero network calls, and the run stays deterministic ─────────────── */
test('every assertion above ran with fetch sabotaged (zero network calls)', fetchCalls === 0, String(fetchCalls));
test(
  'derivation stays deterministic after every fixture and mutation above',
  JSON.stringify(ackItemsAt(NOW)) === JSON.stringify(ackItemsAt(NOW))
);

await server.close();
console.log(
  failures === 0
    ? '\nPO_ACK_WORK_VALIDATION_PASS — every assertion above is green (0 network calls).'
    : `\nPO_ACK_WORK_VALIDATION_FAIL — ${failures} assertion(s) failed.`
);
process.exit(failures === 0 ? 0 : 1);