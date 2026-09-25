/**
 * §P13 / S7 — THE ACKNOWLEDGEMENT ADMIN SURFACES.
 *
 * S6 removed the last place where a BRAND surface re-derived the 24-hour
 * acknowledgement rule. S7 does the same for the ADMIN side, where the rule was
 * re-typed in FIVE surfaces — more than the S6 record listed (the same way S6 found
 * a fourth brand copy):
 *
 *   1. `AdminPurchaseOrderDetail.tsx` derived the window itself —
 *      `new Date(po.orderDate)` mutated in LOCAL time by
 *      `setHours(getHours() + 24)` (which drifts across a DST boundary), its own
 *      `msLeft`/`hoursLeft`/`minutesLeft`, its own `isDeadlinePassed`, its own
 *      `EXPIRED` wording, its own header badge (through a SECOND presentation
 *      helper) and its own actionability predicate
 *      `po.status !== 'received' && po.status !== 'under_review'` — so past the
 *      limit it offered an acceptance the domain writer REFUSES and an unreadable
 *      order date rendered a countdown;
 *   2. `AdminPurchaseOrderList.tsx` derived its "Awaiting action" figure from the
 *      same status predicate and its record preview from
 *      `orderDate + 24 * 3600 * 1000` with `Math.max(0, …)` clamps and a minutes
 *      term that is ALWAYS 0;
 *   3. `AdminDashboard.tsx` held a third copy of the obligation set
 *      (`new Set(['received', 'under_review'])`) driving the "POs awaiting action"
 *      KPI, and a fourth as a pipeline bucket literal;
 *   4. `CommerceOperationsPanel.tsx` re-typed `'received' || 'under_review'` for the
 *      legitimate-next-actions flag;
 *   5. the shared `NotificationCenter.tsx` re-typed it for its PO queue, and
 *      `src/lib/commerce/commerceLifecycle.ts` re-typed it in the domain guard.
 *
 * ALL of them are repointed: the WINDOW comes from its ONE owner
 * (`src/lib/commerce/poAcknowledgementWindow.ts`), the urgency from the ONE
 * presentation owner (`ackDeadlinePresentation`), and the obligation FAMILY from the
 * ONE config array (`PO_ACK_STATUSES_WITH_OBLIGATION`). The second acknowledgement
 * presentation helper (`ackWindowPresentation`) is removed, because two competing
 * renderings of one value is how a rule drifts.
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

const owner = await server.ssrLoadModule('/src/lib/commerce/poAcknowledgementWindow.ts');
const cfg = await server.ssrLoadModule('/src/config/purchaseOrders.ts');
const store = await server.ssrLoadModule('/src/data/demoStore.ts');
const pres = await server.ssrLoadModule('/src/lib/statusPresentation.ts');

const NOW = new Date();
const HOUR = 3_600_000;
const HOURS_BACK = (h) => new Date(NOW.getTime() - h * HOUR).toISOString();

/** §6 rule — the OLD contract is recorded inline, so comments are not code. */
const stripComments = (s) => s.replace(/\/\*[\s\S]*?\*\//g, ' ').replace(/\/\/[^\n]*/g, ' ');
const src = (p) => readFileSync(p, 'utf8');
const code = (p) => stripComments(src(p));

const DETAIL_SRC = src('src/components/admin/AdminPurchaseOrderDetail.tsx');
const DETAIL = code('src/components/admin/AdminPurchaseOrderDetail.tsx');
const LIST_SRC = src('src/components/admin/AdminPurchaseOrderList.tsx');
const LIST = code('src/components/admin/AdminPurchaseOrderList.tsx');
const DASH_SRC = src('src/components/admin/AdminDashboard.tsx');
const DASH = code('src/components/admin/AdminDashboard.tsx');
const CENTRE = code('src/components/shared/NotificationCenter.tsx');
const PANEL = code('src/components/admin/CommerceOperationsPanel.tsx');
const LIFECYCLE = code('src/lib/commerce/commerceLifecycle.ts');
const SEED = code('src/data/demoData.ts');
const PRES_SRC = src('src/lib/statusPresentation.ts');

/* ── 1. ONE OWNER — the ADMIN DETAIL consumes the rule, never re-derives it ───── */
test(
  'the admin PO detail consumes the acknowledgement-window OWNER',
  /poAcknowledgementWindow\(po\)/.test(DETAIL) &&
    /from '@\/lib\/commerce\/poAcknowledgementWindow'/.test(DETAIL)
);
test(
  'the hand-rolled deadline arithmetic is GONE as code (the recorded comment survives)',
  !/setHours\(/.test(DETAIL) &&
    !/24 \* 60|24 \* 3600/.test(DETAIL) &&
    /setHours\(getHours\(\) \+ 24\)/.test(DETAIL_SRC),
  'the inline §REPOINTED record must survive'
);
test(
  'the admin detail’s ACCEPTANCE control is offered by the owner’s `inQueue`',
  /\{ackWindow\.inQueue && !onBehalfAck && \(/.test(DETAIL)
);
test(
  'the admin detail no longer hand-rolls the actionability predicate (old predicate absent as code)',
  !/po\.status !== 'received' && po\.status !== 'under_review'/.test(DETAIL)
);
test(
  'it STATES the owner’s own reason in that paragraph (never a silent absence)',
  /admin-po-ack-state-\$\{po\.poNumber\}\`\}[\s\S]{0,80}\{ackWindow\.reason\}/.test(DETAIL)
);
test(
  'the DEADLINE tile is the owner’s classification — no EXPIRED wording, no hand-rolled countdown',
  !/EXPIRED/.test(DETAIL) &&
    !/'h ' \+ minutesLeft/.test(DETAIL) &&
    /ackDeadlinePresentation\(ackWindow\.hoursLeft\)/.test(DETAIL)
);
test(
  'the header badge is derived from the owner’s channel state (every state handled)',
  /function ackHeaderBadge\(/.test(DETAIL) &&
    /window\.channelState === 'unknown'/.test(DETAIL) &&
    /window\.channelState === 'acknowledged'/.test(DETAIL) &&
    /window\.channelState === 'closed'/.test(DETAIL) &&
    /window\.onBehalfAvailable/.test(DETAIL) &&
    /title=\{ackWindow\.reason\}/.test(DETAIL)
);

/* ── 2. ONE OWNER — the ADMIN LIST (queue figure + record preview) ───────────── */
test(
  'the admin list’s "Awaiting action" figure IS the owner’s `inQueue`',
  /const awaiting = pos\.filter\(\(p\) => poAcknowledgementWindow\(p\)\.inQueue\);/.test(LIST)
);
test(
  'the admin list no longer hand-rolls the old status predicate (absent as code)',
  !/p\.status === 'received' \|\| p\.status === 'under_review'/.test(LIST)
);
test(
  'the record preview reads the WINDOW from the owner and the urgency from the ONE presenter',
  /const ackWindow = poAcknowledgementWindow\(po\);/.test(LIST) &&
    /ackDeadlinePresentation\(ackWindow\.hoursLeft\)/.test(LIST)
);
test(
  'the preview’s hand-rolled 24-hour arithmetic is GONE as code (the record survives)',
  !/24 \* 3600/.test(LIST) && /24 \* 3600 \* 1000/.test(LIST_SRC)
);
test(
  'a decided or closed order renders NO window badge, and an unreadable one is STATED',
  /ackWindow\.channelState === 'acknowledged' \|\| ackWindow\.channelState === 'closed'/.test(LIST) &&
    /'Ack window unreadable'/.test(LIST) &&
    /ack_unknown/.test(LIST)
);

/* ── 3. ONE OWNER — the DASHBOARD KPI and its status-family bucket ───────────── */
test(
  'the dashboard’s "POs awaiting action" KPI IS the owner’s `inQueue`',
  /const posAwaitingAction = posAll\.filter\(\(p\) => poAcknowledgementWindow\(p\)\.inQueue\);/.test(DASH)
);
test(
  'the dashboard’s hand-written obligation SET is gone as code (the record survives)',
  !/PO_AWAITING/.test(DASH) &&
    !/new Set\(\['received', 'under_review'\]\)/.test(DASH_SRC) &&
    /PO_AWAITING/.test(DASH_SRC)
);
test(
  'the dashboard’s pipeline bucket reads the CONFIG-owned status family (no re-typed literal)',
  /statuses: PO_ACK_STATUSES_WITH_OBLIGATION/.test(DASH)
);

/* ── 4. ONE OWNER — the shared centre and the config-owned obligation FAMILY ─── */
test(
  'the shared notification centre’s PO queue reads the owner',
  /\.filter\(\(p\) => poAcknowledgementWindow\(p\)\.inQueue\)/.test(CENTRE)
);
test(
  'the centre no longer hand-rolls the status predicate (absent as code)',
  !/p\.status === 'received' \|\| p\.status === 'under_review'/.test(CENTRE)
);
test(
  'the centre’s rows are TENANT-SCOPED before that filter (shared-component scoping)',
  /const pos = inScope\(usePurchaseOrders\(\)\.data\?\.data \?\? \[\]\);/.test(CENTRE)
);
test(
  'the commerce operations panel reads the CONFIG-owned obligation family',
  /ack: PO_ACK_STATUSES_WITH_OBLIGATION\.includes\(po\.status\)/.test(PANEL)
);
test(
  'the simulated commerce lifecycle reads the SAME family (no re-typed literal)',
  /if \(!PO_ACK_STATUSES_WITH_OBLIGATION\.includes\(po\.status\)\)/.test(LIFECYCLE)
);
test(
  'the demo seed reads the SAME family in ONE place (two consumers, no literal)',
  /const openForAcknowledgement = PO_ACK_STATUSES_WITH_OBLIGATION\.includes\(status\);/.test(SEED) &&
    /isBackOrderAllowed: openForAcknowledgement && bi === 1/.test(SEED) &&
    !/status === 'received' \|\| status === 'under_review'/.test(SEED)
);

/* ── 5. ONE PRESENTATION — a second rendering of the window cannot reappear ──── */
test(
  'there is now ONE acknowledgement-window presentation (the second one is removed)',
  !/export function ackWindowPresentation/.test(PRES_SRC) &&
    /export function ackDeadlinePresentation/.test(PRES_SRC)
);
test(
  'the admin surfaces import the ONE urgency presenter and never the removed one',
  /ackDeadlinePresentation/.test(DETAIL) &&
    /ackDeadlinePresentation/.test(LIST) &&
    !/ackWindowPresentation/.test(DETAIL + LIST)
);

/* ── 6. THE REPOINT CHANGED NO DEMO BEHAVIOUR, and removes both dead states ──── */
const SEEDED = store.demoPurchaseOrders.filter((p) => !p.id.startsWith('po-s7-'));
const ownerQueue = SEEDED.filter((p) => owner.poAcknowledgementWindow(p, NOW).inQueue);
const oldPredicate = SEEDED.filter((p) => p.status === 'received' || p.status === 'under_review');
test(
  'the owner’s queue set and the old status predicate AGREE over the real seed (no control lost)',
  ownerQueue.length > 0 &&
    ownerQueue.map((p) => p.id).join(',') === oldPredicate.map((p) => p.id).join(','),
  `${ownerQueue.length} vs ${oldPredicate.length}`
);

const template = store.demoPurchaseOrders.find((p) => p.status === 'received') ?? store.demoPurchaseOrders[0];
const cleanLines = template.lineItems.map((l) => ({
  ...l,
  ackStatus: undefined,
  acknowledgedQty: undefined,
}));
const pastLimit = {
  ...template,
  id: 'po-s7-past-limit',
  poNumber: 'PO-S7-PAST',
  status: 'received',
  acknowledgedAt: undefined,
  onBehalfDraft: undefined,
  lineItems: cleanLines,
  /** PAST the 24-hour limit: the documented action is a rejection. */
  orderDate: HOURS_BACK(25),
};
store.demoPurchaseOrders.push(pastLimit);
const pastWindow = owner.poAcknowledgementWindow(pastLimit, NOW);
test(
  'PAST the limit the owner offers NO acceptance (so the admin gate presents none)',
  pastWindow.mustReject === true && pastWindow.inQueue === false && pastWindow.history === true
);
test(
  'PAST the limit the remaining action IS Mercenta’s on-behalf draft (the documented past-limit action)',
  owner.poNeedsAutoRejection(pastLimit, NOW) === true &&
    owner.poOnBehalfRejectionDraft(pastLimit, NOW).available === true &&
    owner.poOnBehalfRejectionDraft(pastLimit, NOW).brandMayStillDecide === false
);

const unreadable = {
  ...template,
  id: 'po-s7-unreadable',
  poNumber: 'PO-S7-NODATE',
  status: 'received',
  acknowledgedAt: undefined,
  onBehalfDraft: undefined,
  lineItems: cleanLines,
  orderDate: 'not-a-date',
};
store.demoPurchaseOrders.push(unreadable);
const unknownWindow = owner.poAcknowledgementWindow(unreadable, NOW);
test(
  'an UNREADABLE order date fails CLOSED — no window, no action, and NO NaN countdown',
  unknownWindow.channelState === 'unknown' &&
    unknownWindow.hoursLeft === null &&
    unknownWindow.inQueue === false,
  unknownWindow.channelState
);
test(
  'the admin surfaces STATE that fail-closed case instead of rendering a figure from it',
  /Ack window unreadable/.test(DETAIL) && /ack_unknown/.test(DETAIL) && /Window unreadable/.test(DETAIL)
);
test(
  'the seeded CLOSING-window PO is what the admin surfaces exercise (inside the limit, on-behalf due)',
  (() => {
    const po9001 = store.demoPurchaseOrders.find((p) => p.poNumber === 'PO-9001');
    if (!po9001) return false;
    const w = owner.poAcknowledgementWindow(po9001, NOW);
    return w.channelState === 'new' && w.inQueue === true && w.onBehalfAvailable === true && w.mustReject === false;
  })()
);
test(
  'the urgency tiers the admin surfaces render are the ONE presenter’s own',
  pres.ackDeadlinePresentation(10).dataStatus === 'ack_due' &&
    pres.ackDeadlinePresentation(3).dataStatus === 'ack_urgent' &&
    pres.ackDeadlinePresentation(-1).dataStatus === 'ack_overdue'
);
test(
  'the window’s own limit stays a CONFIG value, never a surface literal',
  cfg.PO_ACKNOWLEDGEMENT_HOURS === 24 &&
    cfg.PO_ACK_ON_BEHALF_WINDOW_HOURS === 2 &&
    !/24 \* 3600|24 \* 60 \* 60|setHours\(/.test(DETAIL + LIST + DASH)
);

test(
  'every assertion above ran with fetch sabotaged (zero network calls)',
  fetchCalls === 0,
  String(fetchCalls)
);

await server.close();
console.log(
  failures === 0
    ? '\nPO_ACK_ADMIN_SURFACES_VALIDATION_PASS — every assertion above is green (0 network calls).'
    : `\nPO_ACK_ADMIN_SURFACES_VALIDATION_FAIL — ${failures} assertion(s) failed.`
);
process.exit(failures === 0 ? 0 : 1);

