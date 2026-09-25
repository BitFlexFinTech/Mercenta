/**
 * §P13 / S6 — THE ACKNOWLEDGEMENT BRAND SURFACES.
 *
 * S5 made the declared reminder schedule REACH the brand and recorded every
 * delivery and every refusal in the canonical ledger. S6 makes the BRAND'S OWN
 * SURFACES present what actually happened — and removes the last place where a
 * surface re-derived the rule:
 *
 *   1. the brand purchase-order surface consumes the ONE owner
 *      (`src/lib/commerce/poAcknowledgementWindow.ts`) for its window badge, its
 *      preview badge, the window state it states to the brand, AND its
 *      actionability predicate — the hand-rolled `received + 24 * 60 * 60 * 1000`,
 *      `+ 24 * 3600 * 1000` and `status === 'received' || status === 'under_review'`
 *      are gone;
 *   2. the notification centre's delivered reminders carry their OWN brand-side
 *      record detail — the channel, the DESTINATION it reached, and the fail-closed
 *      reason for any channel that could not be used — all from the domain's view
 *      of the ledger, with no copy written by the surface;
 *   3. the repoint changed NO demo behaviour (the owner's `inQueue` set and the old
 *      status predicate agree over the real seed), while a PAST-LIMIT purchase order
 *      no longer offers an acceptance the domain would refuse and an UNREADABLE
 *      order date fails closed instead of rendering `Ack within NaNh`.
 *
 * Proves, against the REAL modules (no mocks), with `fetch` sabotaged before any
 * module loads.
 */
import { createServer } from 'vite';
import { readFileSync } from 'node:fs';

/* §6 — no live call is possible anywhere in this run. */
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

const fanout = await server.ssrLoadModule('/src/lib/commerce/poAcknowledgementNotifications.ts');
const win = await server.ssrLoadModule('/src/lib/commerce/poAcknowledgementWindow.ts');
const cfg = await server.ssrLoadModule('/src/config/purchaseOrders.ts');
const store = await server.ssrLoadModule('/src/data/demoStore.ts');
const pres = await server.ssrLoadModule('/src/lib/statusPresentation.ts');

const NOW = new Date();
const HOUR = 3_600_000;
const HOURS_BACK = (h) => new Date(NOW.getTime() - h * HOUR).toISOString();

/** §2 rule — the OLD contract is recorded inline, so comments are not code. */
const stripComments = (s) => s.replace(/\/\*[\s\S]*?\*\//g, ' ').replace(/\/\/[^\n]*/g, ' ');
const BRAND_SRC = readFileSync('src/components/brand/BrandPurchaseOrders.tsx', 'utf8');
const BRAND_CODE = stripComments(BRAND_SRC);
const CENTRE_SRC = readFileSync('src/components/shared/NotificationCenter.tsx', 'utf8');
const CENTRE_CODE = stripComments(CENTRE_SRC);
const FANOUT_SRC = readFileSync('src/lib/commerce/poAcknowledgementNotifications.ts', 'utf8');

/* ── 1. ONE OWNER — the brand surface CONSUMES the rule, never re-derives it ──── */
test(
  'the brand PO surface consumes the acknowledgement-window OWNER',
  /poAcknowledgementWindow/.test(BRAND_CODE) &&
    /from '@\/lib\/commerce\/poAcknowledgementWindow'/.test(BRAND_CODE)
);
test(
  'the hand-rolled 24-hour arithmetic is GONE as code (only the recorded comment remains)',
  !/24\s*\*\s*60\s*\*\s*60|24\s*\*\s*3600/.test(BRAND_CODE) && /24\s*\*\s*60\s*\*\s*60/.test(BRAND_SRC),
  'the inline §REPOINTED record must survive'
);
test(
  'the surface’s ACTIONABLE predicate IS the owner’s `inQueue`',
  /const actionable = \(po: PurchaseOrder\) => poAcknowledgementWindow\(po\)\.inQueue;/.test(BRAND_CODE)
);
test(
  'the surface no longer hand-rolls the actionability rule (old predicate absent as code)',
  !/po\.status === 'received' \|\| po\.status === 'under_review'/.test(BRAND_CODE)
);
test(
  'the window state the brand is shown IS the owner’s own `reason` (verbatim)',
  /poAcknowledgementWindow\(po\)\.reason/.test(BRAND_CODE)
);
test(
  'the on-behalf draft is offered by the OWNER’s predicate, not by `canAct`',
  !/canAct \? onBehalfDraftFor\(po\) : null/.test(BRAND_CODE)
);
test(
  'urgency presentation still comes from the ONE presentation owner',
  /ackDeadlinePresentation\(/.test(BRAND_CODE) &&
    /export function ackDeadlinePresentation/.test(readFileSync('src/lib/statusPresentation.ts', 'utf8'))
);

/* ── 2. THE VIEW reflects the ledger: destinations, refusals, stages ─────────── */
const DEMO_BRAND = 'brand-astonish';
const DEMO_PO = store.demoPurchaseOrders.find((p) => p.poNumber === 'PO-9001');
const run = fanout.runPoAckNotificationFanout('brand', DEMO_BRAND, 'validate:s6', { now: NOW });
const views = fanout.poAckReminderViews('brand', DEMO_BRAND);

test(
  'the brand-scope run delivered reminders and recorded a refusal',
  run.deliveries.length > 0 && run.refused.length > 0,
  `${run.deliveries.length} / ${run.refused.length}`
);
test(
  'every view is an IN-APP delivery on record (a dispatching live send is not presented)',
  views.length > 0 &&
    views.every((v) => v.delivery.channel === 'in_app' && v.delivery.state === 'delivered')
);
test(
  'each view carries its OWN stage from the ledger',
  views.every((v) => v.delivery.stage === run.deliveries.find((d) => d.id === v.delivery.id)?.stage)
);
test(
  'each view states EVERY channel attempted for that PO at that stage (the refusals included)',
  views.every(
    (v) =>
      v.channels.some((c) => c.state === 'delivered') &&
      v.channels.some((c) => c.channel === 'sms' && c.state === 'refused')
  )
);
test(
  'the disposition states the DESTINATION each delivered channel actually reached',
  views.every((v) =>
    v.channels
      .filter((c) => c.state === 'delivered')
      .every((c) => c.destination === fanout.poAckDestinationFor(v.delivery.brandId, c.channel))
  )
);
test(
  'the disposition states the fail-closed reason VERBATIM for the refused channel',
  views.every((v) => {
    const refusal = v.channels.find((c) => c.channel === 'sms' && c.state === 'refused');
    const record = fanout
      .getPoAckDeliveries('brand', DEMO_BRAND)
      .find((r) => r.id === `po-ack-notify-${v.delivery.poId}-${v.delivery.stage}-sms`);
    return !!refusal && !!record && refusal.reason === record.reason;
  })
);
const sampleView = views[0];
const sampleDetail = fanout.poAckReminderChannelDetail(sampleView);
test(
  'the ONE sentence names the delivered channels WITH their destinations, then the unusable one',
  /\u2192/.test(sampleDetail) &&
    /Instant message unavailable — /.test(sampleDetail) &&
    sampleDetail.includes(sampleView.channels.find((c) => c.channel === 'sms').reason),
  sampleDetail
);
test(
  'the sentence is DERIVED (two derivations are byte-identical)',
  fanout.poAckReminderChannelDetail(fanout.poAckReminderViews('brand', DEMO_BRAND)[0]) === sampleDetail
);
test(
  'no destination in the sentence is invented (every one is a canonical record or the in-app constant)',
  views.every((v) =>
    v.channels.every(
      (c) => c.destination === null || c.destination === fanout.poAckDestinationFor(v.delivery.brandId, c.channel)
    )
  )
);

/* ── 3. THE BRAND-SIDE VIEW is OWNED by the domain (surfaces write none of it) ── */
test(
  'the fan-out module OWNS the brand-side view + the channel-disposition sentence',
  /export function poAckReminderViews\(/.test(FANOUT_SRC) &&
    /export function poAckReminderChannelDetail\(/.test(FANOUT_SRC) &&
    /export interface PoAckChannelDisposition/.test(FANOUT_SRC)
);
test(
  'the view is derived from the canonical ledger accessors (tenant-scoped, fail-closed)',
  /poAckInAppDeliveries\(scope, tenantId\)/.test(FANOUT_SRC) &&
    /getPoAckDeliveries\(scope, tenantId\)/.test(FANOUT_SRC)
);
test(
  'the notification centre CONSUMES the domain view and the detail sentence',
  /poAckReminderViews\(workScope, tenantId\)/.test(CENTRE_CODE) &&
    /poAckReminderChannelDetail\(view\)/.test(CENTRE_CODE)
);
test(
  'the centre writes NO channel outcome itself (the arrow sentence and the refusal copy are the domain’s)',
  // The centre’s own comments DO reference the arrow (they explain the owner), so
  // the code alone is examined — exactly as the Stage-24 gate treats §REPOINTED.
  !/\u2192/.test(CENTRE_CODE) && !/unavailable —/.test(CENTRE_CODE)
);
test(
  'the centre renders the detail as its own line (the reminder is not a one-line row)',
  /meta\?: string/.test(CENTRE_CODE) && /data-notification-meta=/.test(CENTRE_CODE)
);

/* ── 4. THE SEAM'S SUCCESS PATH — a channel it could not use IS used, truthfully ─ */
const FIXTURE_BRAND = 'brand-s6-fixture';
const FIXTURE_NUMBER = '+44 7700 900123';
store.demoBrands.push({
  id: FIXTURE_BRAND,
  profile: { businessName: 'S6 Fixture Brand', phone: FIXTURE_NUMBER },
});
store.demoNotificationPrefs.push({
  id: `np-${FIXTURE_BRAND}-ack`,
  brandId: FIXTURE_BRAND,
  eventType: fanout.PO_ACK_EVENT_TYPE,
  channels: ['in_app', 'sms'],
  enabled: true,
});
const fixturePo = {
  id: 'po-s6-instant-message',
  brandId: FIXTURE_BRAND,
  poNumber: 'PO-S6-IM',
  status: 'received',
  poValue: 1000,
  commissionRate: 0.2,
  commissionAmount: 200,
  orderDate: HOURS_BACK(23),
  lineItems: [
    {
      sku: 'S6-001',
      productName: 'S6 fixture line',
      quantity: 5,
      unitPrice: 20,
      commodityCode: '0000000000',
    },
  ],
};
store.demoPurchaseOrders.push(fixturePo);

fanout.runPoAckNotificationFanout('brand', FIXTURE_BRAND, 'validate:s6', {
  now: NOW,
  instantMessageMode: 'simulation',
});
const fixtureViews = fanout.poAckReminderViews('brand', FIXTURE_BRAND);
const fixtureSms = fixtureViews[0]?.channels.find((c) => c.channel === 'sms');
test(
  'a positively-resolved simulation DELIVERS the instant message to the record’s own number',
  !!fixtureSms &&
    fixtureSms.state === 'delivered' &&
    fixtureSms.destination === FIXTURE_NUMBER &&
    fixtureSms.simulated === true,
  JSON.stringify(fixtureSms)
);
test(
  'the sentence LABELS that send as simulated (never presented as a live provider call)',
  /\(simulated\)/.test(fanout.poAckReminderChannelDetail(fixtureViews[0])),
  fanout.poAckReminderChannelDetail(fixtureViews[0])
);

/* §4b — the SAME number, with a provider mode that is NOT provably safe: refused. */
const UNSAFE_BRAND = 'brand-s6-unsafe';
store.demoBrands.push({
  id: UNSAFE_BRAND,
  profile: { businessName: 'S6 Unsafe Brand', phone: FIXTURE_NUMBER },
});
store.demoNotificationPrefs.push({
  id: `np-${UNSAFE_BRAND}-ack`,
  brandId: UNSAFE_BRAND,
  eventType: fanout.PO_ACK_EVENT_TYPE,
  channels: ['in_app', 'sms'],
  enabled: true,
});
store.demoPurchaseOrders.push({
  ...fixturePo,
  id: 'po-s6-unsafe',
  brandId: UNSAFE_BRAND,
  poNumber: 'PO-S6-UNSAFE',
});
fanout.runPoAckNotificationFanout('brand', UNSAFE_BRAND, 'validate:s6', {
  now: NOW,
  instantMessageMode: 'available',
});
const unsafeView = fanout.poAckReminderViews('brand', UNSAFE_BRAND)[0];
const unsafeSms = unsafeView.channels.find((c) => c.channel === 'sms');
test(
  'an UNVERIFIED provider mode is refused even with a number on record, and NAMES the mode',
  unsafeSms.state === 'refused' &&
    unsafeSms.destination === null &&
    /"available"/.test(unsafeSms.reason) &&
    /never treated as/i.test(unsafeSms.reason),
  unsafeSms.reason
);
test(
  'the refusal reason reaches the brand’s own detail line (never a silent absence)',
  /Instant message unavailable — /.test(fanout.poAckReminderChannelDetail(unsafeView))
);

/* ── 5. TENANT ISOLATION — fail closed, at both accessors ───────────────────── */
test(
  'a brand scope with NO tenant yields NOTHING (fail closed)',
  fanout.poAckReminderViews('brand', null).length === 0 &&
    fanout.poAckReminderViews('brand', undefined).length === 0
);
test(
  'a brand scope yields ONLY that brand’s own reminders',
  fanout.poAckReminderViews('brand', DEMO_BRAND).every((v) => v.delivery.brandId === DEMO_BRAND) &&
    fanout
      .poAckReminderViews('brand', FIXTURE_BRAND)
      .every((v) => v.delivery.brandId === FIXTURE_BRAND)
);
test(
  'the centre resolves its scope from the SESSION’s own tier (shared shell, tenant-pinned)',
  /const workScope: 'admin' \| 'brand' = isBrandSession \? 'brand' : 'admin'/.test(CENTRE_SRC) &&
    /poAckReminderViews\(workScope, tenantId\)/.test(CENTRE_SRC)
);



/* ── 6. THE REPOINT CHANGED NO DEMO BEHAVIOUR, and it removes the two dead states ─ */
const SEEDED = store.demoPurchaseOrders.filter((p) => !p.id.startsWith('po-s6-'));
const ownerQueue = SEEDED.filter((p) => win.poAcknowledgementWindow(p, NOW).inQueue);
const oldPredicate = SEEDED.filter((p) => p.status === 'received' || p.status === 'under_review');
test(
  'the owner’s queue set and the old status predicate AGREE over the real seed (no control lost)',
  ownerQueue.length > 0 &&
    ownerQueue.map((p) => p.id).join(',') === oldPredicate.map((p) => p.id).join(','),
  `${ownerQueue.length} vs ${oldPredicate.length}`
);
const pastLimit = {
  ...fixturePo,
  id: 'po-s6-past-limit',
  brandId: DEMO_BRAND,
  poNumber: 'PO-S6-PAST',
  // PAST the 24-hour limit: the documented action is a rejection.
  orderDate: HOURS_BACK(25),
};
store.demoPurchaseOrders.push(pastLimit);
const pastWindow = win.poAcknowledgementWindow(pastLimit, NOW);
test(
  'PAST the limit the owner offers NO acceptance (so no dead control is presented)',
  pastWindow.mustReject === true && pastWindow.inQueue === false && pastWindow.history === true
);
test(
  'PAST the limit the remaining action IS Mercenta’s on-behalf draft (the documented past-limit action)',
  win.poNeedsAutoRejection(pastLimit, NOW) === true &&
    win.poOnBehalfRejectionDraft(pastLimit, NOW).available === true &&
    win.poOnBehalfRejectionDraft(pastLimit, NOW).brandMayStillDecide === false
);
const unreadable = {
  ...fixturePo,
  id: 'po-s6-unreadable',
  brandId: DEMO_BRAND,
  poNumber: 'PO-S6-NODATE',
  orderDate: 'not-a-date',
};
store.demoPurchaseOrders.push(unreadable);
const unknownWindow = win.poAcknowledgementWindow(unreadable, NOW);
test(
  'an UNREADABLE order date fails CLOSED — no window, no action, and NO NaN countdown',
  unknownWindow.channelState === 'unknown' &&
    unknownWindow.hoursLeft === null &&
    unknownWindow.inQueue === false,
  unknownWindow.channelState
);
test(
  'the surface STATES that fail-closed case instead of rendering a number from it',
  /Ack window unreadable/.test(BRAND_CODE) && /ack_unknown/.test(BRAND_CODE)
);
test(
  'the closing window’s own reason (the owner’s wording) names the brand’s approval',
  /approval/.test(win.poAcknowledgementWindow(DEMO_PO, NOW).reason),
  win.poAcknowledgementWindow(DEMO_PO, NOW).reason
);
test(
  'the urgency presentation still classifies the owner’s own figures (no second mapping)',
  pres.ackDeadlinePresentation(10).dataStatus === 'ack_due' &&
    pres.ackDeadlinePresentation(3).dataStatus === 'ack_urgent' &&
    pres.ackDeadlinePresentation(-1).dataStatus === 'ack_overdue'
);
test(
  'the stage the brand is reminded at is a CONFIG value, never a surface literal',
  cfg.PO_ACK_NOTIFICATION_HOURS.includes(sampleView.delivery.stage) && !/12\s*,\s*6\s*,\s*2/.test(BRAND_CODE)
);

test(
  'every assertion above ran with fetch sabotaged (zero network calls)',
  fetchCalls === 0,
  String(fetchCalls)
);

await server.close();
console.log(
  failures === 0
    ? '\nPO_ACK_BRAND_SURFACES_VALIDATION_PASS — every assertion above is green (0 network calls).'
    : `\nPO_ACK_BRAND_SURFACES_VALIDATION_FAIL — ${failures} assertion(s) failed.`
);
process.exit(failures === 0 ? 0 : 1);
