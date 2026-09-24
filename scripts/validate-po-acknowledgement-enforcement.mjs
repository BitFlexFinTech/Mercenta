/**
 * §P13 / S2 — PO ACKNOWLEDGEMENT ENFORCEMENT validation.
 *
 * S1 proved the window OWNER (the pure rule). This gate proves the RULE IS
 * ENFORCED where it matters and that the outcome is recorded honestly:
 *
 *  1. The timeliness vocabulary and the declared system actor are the config's
 *     (one owner; nothing re-invents them).
 *  2. The DEMO's own open purchase orders are genuinely INSIDE their window, so
 *     the workflow the rule governs is reachable (and so the live verification
 *     that exercises it stays truthful).
 *  3. At the DOMAIN BOUNDARY (`src/data/api.ts → acknowledgePurchaseOrder`):
 *     inside the window a decision is accepted and recorded as `on_time`; PAST
 *     the limit an acceptance is REFUSED and the PO is left byte-for-byte
 *     unchanged; the SAME PO accepts the documented late action (all lines
 *     rejected) and records `late`; an unreadable window fails CLOSED.
 *  4. The per-line quantity contract is judged BEFORE the window (unchanged), so
 *     the enforcement adds a rule without replacing one.
 *  5. `autoRejectPurchaseOrderOnBehalf` performs the channel-REQUIRED rejection
 *     on the brand's behalf at the final notification stage — attributed to the
 *     declared system actor, audited, issued as an INSTRUCTION, leaving every
 *     line rejected with Amazon's own documented reason — and it is IDEMPOTENT,
 *     refuses a PO that is not yet due, and never touches a PO with no obligation
 *     or an unreadable window.
 *  6. The overdue presentation the seed no longer contains is still correct.
 *  7. Zero network calls: `fetch` is sabotaged BEFORE any module loads.
 */
import { createServer } from 'vite';
import { readFileSync } from 'node:fs';

/* §7 — no live call is possible anywhere in this run. */
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

const cfg = await server.ssrLoadModule('/src/config/purchaseOrders.ts');
const win = await server.ssrLoadModule('/src/lib/commerce/poAcknowledgementWindow.ts');
const store = await server.ssrLoadModule('/src/data/demoStore.ts');
const api = await server.ssrLoadModule('/src/data/api.ts');
const instructions = await server.ssrLoadModule('/src/lib/commerce/channelInstructions.ts');
const pres = await server.ssrLoadModule('/src/lib/statusPresentation.ts');

const NOW = new Date();
const HOUR = 3_600_000;

/* ── 1. The declared vocabulary has ONE owner ─────────────────────────────── */
test(
  'the timeliness vocabulary is the declared on_time / late / on_behalf',
  JSON.stringify(cfg.PO_ACK_TIMELINESS) === JSON.stringify(['on_time', 'late', 'on_behalf']),
  JSON.stringify(cfg.PO_ACK_TIMELINESS)
);
test(
  'the automatic writer is attributed to a DECLARED system actor',
  typeof cfg.PO_ACK_SYSTEM_ACTOR_ID === 'string' &&
    cfg.PO_ACK_SYSTEM_ACTOR_ID.length > 0 &&
    /mercenta/i.test(cfg.PO_ACK_SYSTEM_ACTOR_ID),
  cfg.PO_ACK_SYSTEM_ACTOR_ID
);
test('the window is declared exactly once, as Amazon documents it', cfg.PO_ACKNOWLEDGEMENT_HOURS === 24);
test(
  'the automatic rejection reason is Amazon’s own documented code',
  cfg.PO_ACK_AUTO_REJECT_REASON === 'TemporarilyUnavailable'
);

/* ── 2. The demo's own open POs really are inside the window ──────────────── */
const openPos = store.demoPurchaseOrders.filter(
  (p) => (p.status === 'received' || p.status === 'under_review') && !p.acknowledgedAt
);
test(
  'the seeded demo contains open purchase orders to exercise the rule',
  openPos.length > 0,
  String(openPos.length)
);
test(
  'EVERY seeded open PO is inside its 24-hour window (and therefore actionable)',
  openPos.every((p) => {
    const w = win.poAcknowledgementWindow(p, NOW);
    return w.channelState === 'new' && w.inQueue && w.actionable && w.msLeft > 0;
  }),
  openPos.map((p) => `${p.poNumber}:${Math.round(win.poAcknowledgementWindow(p, NOW).hoursLeft)}h`).join(' ')
);
test(
  'the founder-reported stale POs are still HISTORY, never acknowledgement work',
  store.demoPurchaseOrders
    .filter((p) => ['PO-9201', 'PO-9211'].includes(p.poNumber))
    .every((p) => win.poAcknowledgementWindow(p, NOW).inQueue === false)
);

/* fixtures: POs dated relative to NOW through the REAL store, as the scenario
   engine does — never a hand-built object the writer cannot look up. */
function pushPo(over) {
  const po = {
    id: over.id,
    brandId: 'brand-tapatio',
    poNumber: over.poNumber,
    status: over.status ?? 'received',
    poValue: 1000,
    commissionRate: 0.2,
    commissionAmount: 200,
    orderDate: over.orderDate,
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

/* ── 3. The domain boundary — a real in-window acceptance ────────────────── */
const live = openPos.find((p) => p.lineItems.length > 0);
const accepted = api.acknowledgePurchaseOrder(
  live.id,
  live.lineItems.map((l) => ({ sku: l.sku, ackStatus: 'accepted', acknowledgedQty: l.quantity }))
);
test(
  'an IN-WINDOW acceptance is accepted at the domain boundary and reads `on_time`',
  accepted.ok === true && accepted.timeliness === 'on_time',
  JSON.stringify(accepted)
);
test(
  'every recorded event carries the decision’s timeliness',
  live.lineItems.every(
    (l) => (l.ackHistory ?? []).length > 0 && l.ackHistory.every((h) => h.timeliness === 'on_time')
  )
);
const ackAudit = [...store.demoAuditLog]
  .reverse()
  .find((a) => a.action === 'purchase_order_acknowledged' && a.entityId === live.id);
test(
  'the canonical audit entry records the timeliness AND the deadline it met',
  ackAudit?.metadata?.timeliness === 'on_time' &&
    typeof ackAudit?.metadata?.acknowledgementDeadline === 'string',
  JSON.stringify(ackAudit?.metadata)
);
test('the audit reason states the timeliness', /on_time/.test(ackAudit?.reason ?? ''), ackAudit?.reason);

/* ── 4. The domain boundary — past the limit ─────────────────────────────── */
const stale = pushPo({
  id: 'po-p13-stale',
  poNumber: 'PO-P13-STALE',
  orderDate: new Date(NOW.getTime() - 30 * HOUR).toISOString(),
});
test(
  'the fixture really is past its limit',
  win.poAcknowledgementWindow(stale, NOW).mustReject === true
);
const staleBefore = JSON.stringify(stale.lineItems);
const refused = api.acknowledgePurchaseOrder(
  stale.id,
  stale.lineItems.map((l) => ({ sku: l.sku, ackStatus: 'accepted', acknowledgedQty: l.quantity }))
);
test(
  'PAST THE LIMIT an acceptance is REFUSED, naming the documented action',
  refused.ok === false && /rejection/i.test(refused.error ?? '') && /24-hour/.test(refused.error ?? ''),
  refused.error
);
test(
  'the refusal left the purchase order byte-for-byte unchanged',
  JSON.stringify(stale.lineItems) === staleBefore && !stale.acknowledgedAt
);
test(
  'a backorder is refused past the limit too (only a rejection is valid)',
  api.acknowledgePurchaseOrder(stale.id, [
    {
      sku: stale.lineItems[0].sku,
      ackStatus: 'backordered',
      acknowledgedQty: 1,
      scheduledShipDate: '2026-12-01',
    },
  ]).ok === false
);
const overQty = api.acknowledgePurchaseOrder(stale.id, [
  {
    sku: stale.lineItems[0].sku,
    ackStatus: 'accepted',
    acknowledgedQty: stale.lineItems[0].quantity + 1,
  },
]);
test(
  'the quantity contract is judged BEFORE the window (its refusal is unchanged)',
  overQty.ok === false && /cannot exceed ordered quantity/.test(overQty.error ?? ''),
  overQty.error
);
const late = api.acknowledgePurchaseOrder(
  stale.id,
  stale.lineItems.map((l) => ({
    sku: l.sku,
    ackStatus: 'rejected',
    rejectionCode: 'TemporarilyUnavailable',
  }))
);
test(
  'PAST THE LIMIT the documented late action (all lines rejected) IS accepted and reads `late`',
  late.ok === true && late.timeliness === 'late',
  JSON.stringify(late)
);
test(
  'the late decision records `late` on every event',
  stale.lineItems.every((l) => l.ackHistory.every((h) => h.timeliness === 'late'))
);

const unreadable = pushPo({
  id: 'po-p13-unreadable',
  poNumber: 'PO-P13-UNREADABLE',
  orderDate: 'not-an-instant',
});
const unknownAck = api.acknowledgePurchaseOrder(unreadable.id, [
  {
    sku: unreadable.lineItems[0].sku,
    ackStatus: 'accepted',
    acknowledgedQty: unreadable.lineItems[0].quantity,
  },
]);
test(
  'an unreadable window FAILS CLOSED — no acknowledgement is accepted at all',
  unknownAck.ok === false && /fail-closed/i.test(unknownAck.error ?? ''),
  unknownAck.error
);

/* ── 5. The on-behalf rejection Mercenta performs for the brand ──────────── */
const fresh = pushPo({
  id: 'po-p13-fresh',
  poNumber: 'PO-P13-FRESH',
  orderDate: new Date(NOW.getTime() - 4 * HOUR).toISOString(),
});
test(
  'the on-behalf instant is the final notification stage, BEFORE the limit',
  win.poAcknowledgementWindow(fresh, NOW).autoRejectAt ===
    new Date(new Date(fresh.orderDate).getTime() + (24 - 2) * HOUR).toISOString(),
  win.poAcknowledgementWindow(fresh, NOW).autoRejectAt
);
test('an in-window PO is NOT yet Mercenta’s to reject', win.poNeedsAutoRejection(fresh, NOW) === false);
const notDue = api.autoRejectPurchaseOrderOnBehalf(fresh.id, NOW);
test(
  'the writer REFUSES to act before the on-behalf instant, naming it',
  notDue.ok === false &&
    /not due yet/.test(notDue.error ?? '') &&
    (notDue.error ?? '').includes(win.poAcknowledgementWindow(fresh, NOW).autoRejectAt),
  notDue.error
);
test(
  'the refused on-behalf write changed NOTHING',
  !fresh.acknowledgedAt && fresh.lineItems.every((l) => !l.ackHistory)
);

const duePo = pushPo({
  id: 'po-p13-due',
  poNumber: 'PO-P13-DUE',
  orderDate: new Date(NOW.getTime() - 23 * HOUR).toISOString(),
});
test('the on-behalf instant HAS passed for this PO', win.poNeedsAutoRejection(duePo, NOW) === true);
const dueWindow = win.poAcknowledgementWindow(duePo, NOW);
const historyBefore = duePo.lineItems.map((l) => (l.ackHistory ?? []).length);
const auditBefore = store.demoAuditLog.length;
const auto = api.autoRejectPurchaseOrderOnBehalf(duePo.id, NOW);
test(
  'the writer performs the required rejection on the brand’s behalf',
  auto.ok === true && auto.timeliness === 'on_behalf',
  JSON.stringify(auto)
);
test(
  'every line is rejected with Amazon’s own documented reason',
  duePo.lineItems.every(
    (l) =>
      l.ackStatus === 'rejected' &&
      l.acknowledgedQty === 0 &&
      l.rejectionCode === cfg.PO_ACK_AUTO_REJECT_REASON
  )
);
test(
  'each event is appended with `on_behalf` timeliness (never overwriting history)',
  duePo.lineItems.every(
    (l, i) =>
      (l.ackHistory ?? []).length === historyBefore[i] + 1 &&
      l.ackHistory.at(-1).timeliness === 'on_behalf'
  )
);
test(
  'the PO ends ACKNOWLEDGED and rejected, with the rule as its stated reason',
  Boolean(duePo.acknowledgedAt) && duePo.status === 'rejected' && /24-hour/i.test(duePo.rejectionReason ?? ''),
  duePo.rejectionReason
);
const autoAuditEntries = store.demoAuditLog.filter(
  (a) => a.action === 'purchase_order_auto_rejected' && a.entityId === duePo.id
);
const autoAudit = autoAuditEntries.at(-1);
test(
  'the automatic action is ATTRIBUTED to Mercenta’s declared system actor, and audited exactly once',
  autoAuditEntries.length === 1 &&
    store.demoAuditLog.length > auditBefore &&
    autoAudit.actorId === cfg.PO_ACK_SYSTEM_ACTOR_ID &&
    autoAudit.metadata?.timeliness === 'on_behalf',
  JSON.stringify(autoAudit?.metadata)
);
test(
  'the audit entry names the window it acted on (stage + deadline + reason)',
  autoAudit.metadata?.autoRejectAt === dueWindow.autoRejectAt &&
    autoAudit.metadata?.acknowledgementDeadline === dueWindow.deadline &&
    autoAudit.metadata?.rejectionCode === cfg.PO_ACK_AUTO_REJECT_REASON,
  JSON.stringify(autoAudit?.metadata)
);
const autoInstruction = instructions.getChannelInstruction(auto.instructionId);
test(
  'the automatic decision is issued to Mercenta as an INSTRUCTION (proxy direction)',
  Boolean(autoInstruction) &&
    autoInstruction.state === 'pending_mercenta_action' &&
    autoInstruction.lines.every((l) => l.ackStatus === 'rejected'),
  JSON.stringify(autoInstruction?.lines)
);
test(
  'the instruction is attributed to the SYSTEM actor, never to the brand itself',
  autoInstruction?.issuedBy === cfg.PO_ACK_SYSTEM_ACTOR_ID,
  autoInstruction?.issuedBy
);
test(
  'the PO now leaves the acknowledgement queue, acknowledged',
  win.poAcknowledgementWindow(duePo, NOW).channelState === 'closed' &&
    win.poAcknowledgementWindow(duePo, NOW).inQueue === false &&
    win.poAcknowledgementWindow(duePo, NOW).acknowledgementRecorded === true
);
const historyAfter = JSON.stringify(duePo.lineItems.map((l) => l.ackHistory));
const auditAfter = store.demoAuditLog.length;
const again = api.autoRejectPurchaseOrderOnBehalf(duePo.id, NOW);
test(
  'the writer is IDEMPOTENT — a second call writes nothing and audits nothing twice',
  again.ok === true &&
    again.alreadyAcknowledged === true &&
    JSON.stringify(duePo.lineItems.map((l) => l.ackHistory)) === historyAfter &&
    store.demoAuditLog.length === auditAfter
);
const delivered = store.demoPurchaseOrders.find((p) => p.status === 'delivered');
const onDelivered = api.autoRejectPurchaseOrderOnBehalf(delivered.id, NOW);
test(
  'a PO with NO acknowledgement obligation is never auto-rejected',
  onDelivered.ok === true && onDelivered.alreadyAcknowledged === true && !delivered.acknowledgedAt
);
const onUnreadable = api.autoRejectPurchaseOrderOnBehalf(unreadable.id, NOW);
test(
  'an unreadable window is never treated as due (fail-closed, nothing written)',
  onUnreadable.ok === true && onUnreadable.alreadyAcknowledged === true && !unreadable.acknowledgedAt
);
const onMissing = api.autoRejectPurchaseOrderOnBehalf('po-does-not-exist', NOW);
test(
  'an unknown purchase order is REFUSED, never silently ignored',
  onMissing.ok === false && /Unknown purchase order/.test(onMissing.error ?? ''),
  onMissing.error
);

/* ── 6. ONE owner for every declaration the enforcement consumed ─────────── */
const workSrc = readFileSync('src/lib/work/workStore.ts', 'utf8');
test(
  'the work layer RE-EXPORTS the acknowledgement window, never a second copy of the number',
  /export \{ PO_ACKNOWLEDGEMENT_HOURS \}/.test(workSrc) &&
    !/PO_ACKNOWLEDGEMENT_HOURS\s*=\s*24/.test(workSrc)
);
const apiSrc = readFileSync('src/data/api.ts', 'utf8');
test(
  'the writer takes the reason and the system actor from the config owner',
  /from '@\/config\/purchaseOrders'/.test(apiSrc) &&
    /PO_ACK_AUTO_REJECT_REASON/.test(apiSrc) &&
    /PO_ACK_SYSTEM_ACTOR_ID/.test(apiSrc)
);
const winSrc = readFileSync('src/lib/commerce/poAcknowledgementWindow.ts', 'utf8');
/** Comments stripped, as in S1: prose may NAME the things the code must not do. */
const winCode = winSrc
  .split('\n')
  .filter((l) => !/^\s*(\*|\/\/|\/\*)/.test(l))
  .join('\n');
test(
  'the window owner stays PURE — no clock, no randomness, no store, no React, no network',
  !/Math\.random\(/.test(winCode) &&
    !/Date\.now\(/.test(winCode) &&
    !/\bfetch\(|axios|XMLHttpRequest/.test(winCode) &&
    !/from '@\/data\/|demoStore|react/.test(winCode)
);
test(
  'the timeliness union is not re-declared outside the config owner',
  !/export const PO_ACK_TIMELINESS/.test(winSrc) && !/export const PO_ACK_TIMELINESS/.test(apiSrc)
);

/* ── 7. The overdue presentation the seed no longer contains is intact ───── */
test(
  'an overdue window still PRESENTS as passed (presentation owner intact)',
  pres.ackDeadlinePresentation(-1).dataStatus === 'ack_overdue' &&
    /PASSED/.test(pres.ackDeadlinePresentation(-1).label)
);
test(
  'an in-window window presents as due/urgent, never as passed',
  pres.ackDeadlinePresentation(10).dataStatus === 'ack_due' &&
    pres.ackDeadlinePresentation(3).dataStatus === 'ack_urgent'
);

/* ── 8. Zero network calls, and the run is deterministic ─────────────────── */
test('every assertion above ran with fetch sabotaged (zero network calls)', fetchCalls === 0, String(fetchCalls));
const twice = JSON.stringify(win.poAcknowledgementWindow(duePo, NOW));
const onceMore = JSON.stringify(win.poAcknowledgementWindow(duePo, NOW));
test('derivation stays deterministic after every write above', twice === onceMore);

await server.close();
console.log(
  failures === 0
    ? '\nPO_ACK_ENFORCEMENT_VALIDATION_PASS — every assertion above is green (0 network calls).'
    : `\nPO_ACK_ENFORCEMENT_VALIDATION_FAIL — ${failures} assertion(s) failed.`
);
process.exit(failures === 0 ? 0 : 1);
