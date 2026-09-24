/**
 * §P13 — PO ACKNOWLEDGEMENT WINDOW validation.
 *
 * Proves, against the REAL modules (no mocks, zero network calls):
 *  1. The declared terms are Amazon's documented ones (24h / 48h) and the
 *     auto-rejection reason is one of Amazon's three documented codes.
 *  2. The window arithmetic is exact at every boundary (inside, at, past).
 *  3. Amazon's own lifecycle vocabulary is derived correctly (`New` /
 *     `Acknowledged` / `Closed`) and an unreadable window FAILS CLOSED.
 *  4. The queue/history split is total: every PO is in exactly one of them, and
 *     the POs the founder reported (shipped, 41 days past the deadline) are
 *     HISTORY — never acknowledgement work.
 *  5. Past the limit an acceptance is refused while the documented late action
 *     (an all-rejected submission) is permitted.
 *  6. The module is pure and deterministic: no clock, no randomness, no network,
 *     no store access.
 */
import { createServer } from 'vite';
import { readFileSync } from 'node:fs';

const server = await createServer({ server: { middlewareMode: true }, logLevel: 'error' });

let failures = 0;
function test(name, cond, extra) {
  console.log(`${cond ? '✓' : '✗'} ${name}${cond || !extra ? '' : ` — ${extra}`}`);
  if (!cond) failures++;
}

const cfg = await server.ssrLoadModule('/src/config/purchaseOrders.ts');
const win = await server.ssrLoadModule('/src/lib/commerce/poAcknowledgementWindow.ts');
const types = await server.ssrLoadModule('/src/types.ts');
const store = await server.ssrLoadModule('/src/data/demoStore.ts');

/* ── 1. The declared terms are Amazon's, and the mapping is documented ─────── */
test('the acknowledgement window is Amazon’s 24 hours', cfg.PO_ACKNOWLEDGEMENT_HOURS === 24);
test('the update window is Amazon’s 48 hours', cfg.PO_ACK_UPDATE_WINDOW_HOURS === 48);
test(
  'the notification schedule is the declared 12/6/2 descending',
  JSON.stringify(cfg.PO_ACK_NOTIFICATION_HOURS) === JSON.stringify([12, 6, 2])
);
test(
  'every notification stage falls inside the 24-hour window',
  cfg.PO_ACK_NOTIFICATION_HOURS.every((h) => h > 0 && h < cfg.PO_ACKNOWLEDGEMENT_HOURS)
);
test(
  'the auto-rejection happens at the FINAL notification stage (before expiry)',
  cfg.PO_ACK_ON_BEHALF_WINDOW_HOURS ===
    Math.min(...cfg.PO_ACK_NOTIFICATION_HOURS) &&
    cfg.PO_ACK_ON_BEHALF_WINDOW_HOURS > 0
);
test(
  'the auto-rejection reason is one of Amazon’s documented codes',
  cfg.PO_ACK_AUTO_REJECT_REASON === 'TemporarilyUnavailable' &&
    types.PO_REJECTION_CODES.includes(cfg.PO_ACK_AUTO_REJECT_REASON),
  cfg.PO_ACK_AUTO_REJECT_REASON
);
test(
  'the obligation set is Amazon’s `New` operational set',
  JSON.stringify(cfg.PO_ACK_STATUSES_WITH_OBLIGATION) === JSON.stringify(['received', 'under_review'])
);
test(
  'the rule text states the documented obligation without a prohibited claim',
  cfg.PO_ACK_WINDOW_RULE_TEXT.includes('24 hours') &&
    cfg.PO_ACK_WINDOW_RULE_TEXT.includes('rejected') &&
    !/guaranteed|will buy|bypass/i.test(cfg.PO_ACK_WINDOW_RULE_TEXT)
);

/* ── 2. Boundary arithmetic ───────────────────────────────────────────────── */
const ORDER = '2026-09-24T10:00:00.000Z';
const DEADLINE = '2026-09-25T10:00:00.000Z';
const HOUR = 3_600_000;
function po(over = {}) {
  return {
    id: 'po-t', brandId: 'brand-t', poNumber: 'PO-T', status: 'received',
    poValue: 1000, commissionRate: 0.2, commissionAmount: 200,
    orderDate: ORDER, lineItems: [], ...over,
  };
}
const at = (msBeforeDeadline) => new Date(new Date(DEADLINE).getTime() - msBeforeDeadline);

test('the deadline is orderDate + 24h', win.poAcknowledgementDeadline(po()) === DEADLINE);
test('1ms before the deadline the PO is still actionable', win.poAcknowledgementWindow(po(), at(1)).actionable === true);
test('AT the deadline the window has closed', win.poAcknowledgementWindow(po(), at(0)).actionable === false);
test('at the deadline a rejection is required', win.poAcknowledgementWindow(po(), at(0)).mustReject === true);
test('1ms past the deadline a rejection is required', win.poAcknowledgementWindow(po(), at(-1)).mustReject === true);
test('exactly T−2h is inside the on-behalf closing window', win.poAcknowledgementWindow(po(), at(2 * HOUR)).onBehalfAvailable === true);
test('T−2h + 1ms is NOT yet inside the on-behalf window', win.poAcknowledgementWindow(po(), at(2 * HOUR + 1)).onBehalfAvailable === false);
test('the auto-rejection is due at exactly T−2h', win.poAcknowledgementWindow(po(), at(2 * HOUR)).autoRejectDue === true);
test('the auto-rejection is not due 1ms before T−2h', win.poAcknowledgementWindow(po(), at(2 * HOUR + 1)).autoRejectDue === false);
test('hours and minutes remaining are reported', (() => {
  const w = win.poAcknowledgementWindow(po(), at(3 * HOUR + 30 * 60_000));
  return w.hoursLeft > 3.49 && w.hoursLeft < 3.51 && w.minutesLeft === 30;
})());

/* ── 3. Notification stages ───────────────────────────────────────────────── */
const stage = (msBefore) => win.poAcknowledgementWindow(po(), at(msBefore)).notificationStage;
test('before T−12h no stage is in force', stage(13 * HOUR) === null);
test('T−11h is inside stage 12', stage(11 * HOUR) === 12);
test('T−5h is inside stage 6', stage(5 * HOUR) === 6);
test('T−1h is inside stage 2', stage(1 * HOUR) === 2);
test('past the deadline the final stage still reports', stage(-HOUR) === 2);
const due = (msBefore) => win.poNotificationStagesDue(po(), at(msBefore)).join(',');
test('stages due accumulate as the window closes', due(13 * HOUR) === '' && due(11 * HOUR) === '12' && due(5 * HOUR) === '12,6' && due(1 * HOUR) === '12,6,2');


/* ── 4. Amazon's lifecycle vocabulary + fail-closed ───────────────────────── */
const state = (over, msBefore = HOUR) => win.poAcknowledgementWindow(po(over), at(msBefore)).channelState;
test('an unacknowledged PO inside the window is `new`', state({ status: 'received' }) === 'new');
test('an under_review PO inside the window is `new`', state({ status: 'under_review' }) === 'new');
test('an acknowledged PO is `acknowledged`', state({ acknowledgedAt: '2026-09-24T11:00:00.000Z' }) === 'acknowledged');
test('a per-line acknowledgement also marks it acknowledged', state({ lineItems: [{ sku: 'S', ackStatus: 'accepted' }] }) === 'acknowledged');
test('a legacy accepted PO with no acknowledgement is `acknowledged`, not queue work', state({ status: 'accepted' }) === 'acknowledged');
test('a shipped PO is `acknowledged` (no acknowledgement obligation remains)', state({ status: 'shipped' }) === 'acknowledged');
test('a delivered PO is `closed`', state({ status: 'delivered' }) === 'closed');
test('a rejected PO is `closed`', state({ status: 'rejected' }) === 'closed');
const unknown = win.poAcknowledgementWindow(po({ orderDate: 'not-a-date' }), at(HOUR));
test('an unreadable order date FAILS CLOSED as `unknown`', unknown.channelState === 'unknown');
test('an unknown window offers no action', unknown.actionable === false && unknown.inQueue === false && unknown.onBehalfAvailable === false);
test('an unknown window is not silently treated as open work', unknown.history === true && unknown.mustReject === false);
test('the legacy accepted PO reports no acknowledgement record', win.poAcknowledgementWindow(po({ status: 'accepted' }), at(HOUR)).acknowledgementRecorded === false);
test('an acknowledged PO reports the record', win.poAcknowledgementWindow(po({ acknowledgedAt: '2026-09-24T11:00:00.000Z' }), at(HOUR)).acknowledgementRecorded === true);

/* ── 5. The late-action rule (Amazon: past the limit, reject) ─────────────── */
test('inside the window nothing is refused', win.lateAcceptanceRefusal(po(), false, at(HOUR)) === null);
const lateAccept = win.lateAcceptanceRefusal(po(), false, at(-HOUR));
test('past the limit an acceptance is refused, naming the rule', typeof lateAccept === 'string' && /rejection/.test(lateAccept));
test('past the limit the documented late action (all lines rejected) is permitted', win.lateAcceptanceRefusal(po(), true, at(-HOUR)) === null);
test('an unreadable window refuses every acknowledgement (fail-closed)', typeof win.lateAcceptanceRefusal(po({ orderDate: 'nope' }), false, at(HOUR)) === 'string');

/* ── 6. The queue/history split over the REAL demo POs ────────────────────── */
const NOW = new Date();
const pos = store.demoPurchaseOrders;
const windows = pos.map((p) => ({ po: p, w: win.poAcknowledgementWindow(p, NOW) }));
test('every PO is in exactly one of queue/history', windows.every(({ w }) => w.inQueue !== w.history));
test(
  'queue membership implies an actionable `new` window',
  windows.filter(({ w }) => w.inQueue).every(({ w }) => w.channelState === 'new' && w.actionable)
);
const independentQueue = pos.filter(
  (p) =>
    (p.status === 'received' || p.status === 'under_review') &&
    !p.acknowledgedAt &&
    new Date(p.orderDate).getTime() + 24 * HOUR > NOW.getTime()
);
test(
  'the queue is exactly the unacknowledged in-window set',
  windows.filter(({ w }) => w.inQueue).length === independentQueue.length,
  `queue=${windows.filter(({ w }) => w.inQueue).length} expected=${independentQueue.length}`
);
test(
  'no shipped/delivered/rejected PO is ever acknowledgement work',
  windows
    .filter(({ po: p }) => ['shipped', 'delivered', 'rejected'].includes(p.status))
    .every(({ w }) => !w.inQueue)
);
const reported = pos.filter((p) => ['PO-9201', 'PO-9211'].includes(p.poNumber));
test('the founder-reported 41-day POs exist in the demo set', reported.length === 2);
test(
  'THE DEFECT: PO-9201 / PO-9211 are HISTORY, not 41-day-overdue acknowledgement work',
  reported.length === 2 &&
    reported.every((p) => {
      const w = win.poAcknowledgementWindow(p, NOW);
      return w.inQueue === false && w.history === true && w.mustReject === false;
    })
);
test(
  'no demo PO is presented as an overdue acknowledgement item',
  windows.every(({ w }) => !(w.inQueue && (w.msLeft ?? 0) < 0))
);

/* ── 7. Ordering: queue first (soonest first), then history ───────────────── */
const ORDER_NOW = '2026-09-24T12:00:00.000Z';
const queueSample = [
  po({ id: 'h', poNumber: 'PO-H', acknowledgedAt: '2026-09-24T11:00:00.000Z' }),
  po({ id: 'b', poNumber: 'PO-B', orderDate: '2026-09-24T08:00:00.000Z' }),
  po({ id: 'a', poNumber: 'PO-A', orderDate: '2026-09-24T09:00:00.000Z' }),
];
test(
  'the ordering sample really is two queue rows and one history row',
  queueSample.map((p) => win.poAcknowledgementWindow(p, ORDER_NOW).inQueue).join(',') === 'false,true,true'
);
const ordered = win.sortPosByUrgency(queueSample, ORDER_NOW).map((p) => p.id);
test('the queue is ordered by soonest deadline, history last', JSON.stringify(ordered) === JSON.stringify(['b', 'a', 'h']), ordered.join(','));


/* ── 8. Purity, determinism, and zero network calls ───────────────────────── */
for (const f of ['src/config/purchaseOrders.ts', 'src/lib/commerce/poAcknowledgementWindow.ts']) {
  const code = readFileSync(f, 'utf8')
    .split('\n')
    .filter((l) => !/^\s*(\*|\/\/|\/\*)/.test(l))
    .join('\n');
  test(`${f} contains no Math.random()`, !/Math\.random\(/.test(code));
  test(`${f} contains no Date.now()`, !/Date\.now\(/.test(code));
  test(`${f} performs no network call`, !/\bfetch\(|axios|XMLHttpRequest/.test(code));
}
test(
  'the window module is pure — it imports no store, demo data or React',
  !/from '@\/data\/|demoStore|react/.test(readFileSync('src/lib/commerce/poAcknowledgementWindow.ts', 'utf8'))
);
test(
  'the auto-rejection reason is guarded against drifting off Amazon’s codes',
  /PO_REJECTION_CODES\.includes\(PO_ACK_AUTO_REJECT_REASON\)/.test(readFileSync('src/config/purchaseOrders.ts', 'utf8'))
);
const twice = JSON.stringify(pos.map((p) => win.poAcknowledgementWindow(p, NOW)));
const again = JSON.stringify(pos.map((p) => win.poAcknowledgementWindow(p, NOW)));
test('derivation is deterministic for identical inputs', twice === again);
test(
  'an unusable `now` fails loudly rather than guessing',
  (() => {
    try {
      win.poAcknowledgementWindow(po(), 'not-an-instant');
      return false;
    } catch {
      return true;
    }
  })()
);

await server.close();
console.log(
  failures === 0
    ? '\nPO_ACK_WINDOW_VALIDATION_PASS — every assertion above is green (0 network calls).'
    : `\nPO_ACK_WINDOW_VALIDATION_FAIL — ${failures} assertion(s) failed.`
);
process.exit(failures === 0 ? 0 : 1);

