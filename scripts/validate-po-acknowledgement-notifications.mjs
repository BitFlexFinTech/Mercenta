/**
 * §P13 / S5 — THE ACKNOWLEDGEMENT NOTIFICATION FAN-OUT + THE INSTANT-MESSAGE SEAM.
 *
 * S1 declared the notification schedule (12/6/2h remaining — Mercenta OPERATIONAL
 * SCHEDULING, never a retail-channel rule) and S4 gave the S2 writer its producer.
 * S5 makes the schedule REACH the brand: every declared stage is delivered on every
 * channel the platform can genuinely deliver on, the FINAL stage produces Mercenta's
 * on-behalf rejection draft, and the EXTERNAL instant-message channel is declared and
 * FAILS CLOSED (an unverified provider is never treated as simulation).
 *
 * Proves, against the REAL modules (no mocks):
 *  1. ONE OWNER: the schedule, the stages, the window, the reason code and the rule
 *     text all come from the config + the window owner — no second copy, no timer.
 *  2. The plan is PURE and derived, and fails closed (decided / unreadable / past the
 *     limit / no subscription).
 *  3. Destinations are the brand's DECLARED records — never fabricated.
 *  4. The INSTANT-MESSAGE seam: the authoritative mode is not simulation-safe, so the
 *     channel is refused WITH ITS REASON; the factory selects the mock for a
 *     positively-resolved simulation and the real adapter for a live connection.
 *  5. The seeded fan-out delivers the in-app and email channels, REFUSES the
 *     instant-message channel, and produces the on-behalf draft at the final stage —
 *     performing nothing.
 *  6. Idempotency, tenant isolation, attribution, audit and the automation seam.
 *  7. Zero network calls: `fetch` is sabotaged BEFORE any module loads.
 */
import { createServer } from 'vite';
import { readFileSync } from 'node:fs';
import { BANNED_PATTERNS } from '../src/lib/discovery/banned-patterns.mjs';

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

const fanout = await server.ssrLoadModule('/src/lib/commerce/poAcknowledgementNotifications.ts');
const win = await server.ssrLoadModule('/src/lib/commerce/poAcknowledgementWindow.ts');
const cfg = await server.ssrLoadModule('/src/config/purchaseOrders.ts');
const store = await server.ssrLoadModule('/src/data/demoStore.ts');
const api = await server.ssrLoadModule('/src/data/api.ts');
const automation = await server.ssrLoadModule('/src/lib/automation/registry.ts');
const integrations = await server.ssrLoadModule('/src/integrations/registry.ts');
const demoData = await server.ssrLoadModule('/src/data/demoData.ts');

const NOW = new Date();
const HOUR = 3_600_000;
const HOURS_BACK = (h) => new Date(NOW.getTime() - h * HOUR).toISOString();

/** The CANONICAL seed rows, captured before any fixture is pushed. */
const SEED_POS = store.demoPurchaseOrders.map((p) => ({ ...p }));
const SEED_IDS = new Set(SEED_POS.map((p) => p.id));
const SEED_BRAND_IDS = new Set(store.demoBrands.map((b) => b.id));

/** Fixtures are pushed through the REAL store — never a hand-built object. */
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

const deliveriesFor = (poId) =>
  fanout.getPoAckDeliveries('admin').filter((d) => d.poId === poId);
const auditFor = (action, poId) =>
  store.demoAuditLog.filter((a) => a.action === action && a.entityId === poId);

/* ── 1. ONE OWNER — the schedule, the rule and the window are consumed ─────────── */
const SRC = readFileSync('src/lib/commerce/poAcknowledgementNotifications.ts', 'utf8');
const CENTRE_SRC = readFileSync('src/components/shared/NotificationCenter.tsx', 'utf8');
const REGISTRY_SRC = readFileSync('src/lib/automation/registry.ts', 'utf8');

test(
  'the fan-out consumes the window OWNER (stages, window, auto-rejection predicate)',
  /poNotificationStagesDue/.test(SRC) &&
    /poAcknowledgementWindow\(po, now\)/.test(SRC) &&
    /poNeedsAutoRejection\(po, now\)/.test(SRC)
);
test(
  'the rule text and the rejection reason stay CONFIG-owned (never re-declared)',
  /PO_ACK_WINDOW_RULE_TEXT/.test(SRC) &&
    /PO_ACK_AUTO_REJECT_REASON/.test(SRC) &&
    !/export const PO_ACK_WINDOW_RULE_TEXT/.test(SRC) &&
    !/export const PO_ACK_AUTO_REJECT_REASON/.test(SRC)
);
test(
  'the schedule is never hand-written in the fan-out (no [12, 6, 2] literal)',
  !/\[\s*12\s*,\s*6\s*,\s*2\s*\]/.test(SRC)
);
test(
  'the 24-hour window is never re-derived in the fan-out (no hand-rolled arithmetic)',
  !/24\s*\*\s*60\s*\*\s*60|24\s*\*\s*3_?600|3_?600_?000\s*\*\s*24/.test(SRC)
);
test(
  'NO TIMER is the source of truth (no setInterval/setTimeout CALL anywhere in the fan-out)',
  !/\bsetInterval\s*\(|\bsetTimeout\s*\(/.test(SRC)
);
test(
  'the FINAL stage is DERIVED from the declared schedule, never hand-written',
  fanout.PO_ACK_FINAL_NOTIFICATION_STAGE === Math.min(...cfg.PO_ACK_NOTIFICATION_HOURS)
);
test(
  'the declared final notification stage IS the on-behalf instant (the config says so)',
  fanout.PO_ACK_FINAL_NOTIFICATION_STAGE === cfg.PO_ACK_ON_BEHALF_WINDOW_HOURS,
  `${fanout.PO_ACK_FINAL_NOTIFICATION_STAGE} vs ${cfg.PO_ACK_ON_BEHALF_WINDOW_HOURS}`
);
test(
  'the in-app SURFACE consumes the ledger through the tenant-scoped accessor',
  /poAckInAppDeliveries/.test(CENTRE_SRC) && /subscribePoAckNotifications/.test(CENTRE_SRC)
);
test(
  'the fan-out runs through the EXISTING automation seam (registry + one declared id)',
  /runPoAckNotificationFanout/.test(REGISTRY_SRC) &&
    /PO_ACK_NOTIFICATION_AUTOMATION_ID/.test(REGISTRY_SRC) &&
    automation.AUTOMATION_ORDER.includes(fanout.PO_ACK_NOTIFICATION_AUTOMATION_ID)
);

/* ── 2. THE PLAN is pure, derived and fail-closed ─────────────────────────────── */
const closingSeed = SEED_POS.find((p) => p.poNumber === 'PO-9001');
const closingLive = store.demoPurchaseOrders.find((p) => p.id === closingSeed.id);
const closingPlan = fanout.poAckNotificationPlan(closingLive, NOW);
test(
  'the seeded closing-window PO plans the owner’s OWN stages (all three declared)',
  closingPlan.stages.length === cfg.PO_ACK_NOTIFICATION_HOURS.length &&
    closingPlan.stages.join(',') === win.poNotificationStagesDue(closingLive, NOW).join(','),
  closingPlan.stages.join(',')
);
test(
  'the plan’s final stage is the declared final stage',
  closingPlan.finalStage === fanout.PO_ACK_FINAL_NOTIFICATION_STAGE
);
test(
  'the plan is DUE and refuses nothing (reason null)',
  closingPlan.due === true && closingPlan.reason === null
);
test(
  'the plan is deterministic (two derivations are byte-identical)',
  JSON.stringify(fanout.poAckNotificationPlan(closingLive, NOW)) === JSON.stringify(closingPlan)
);
test(
  'the plan carries the CONFIG rule text and the owner’s own deadline',
  closingPlan.messages.every(
    (m) =>
      m.ruleText === cfg.PO_ACK_WINDOW_RULE_TEXT &&
      m.body.includes(cfg.PO_ACK_WINDOW_RULE_TEXT) &&
      m.body.includes(
        win.poAcknowledgementWindow(closingLive, NOW).deadline.slice(0, 16).replace('T', ' ')
      )
  )
);
test(
  'the final-stage message names the drafted rejection and that NOTHING is performed without approval',
  closingPlan.messages
    .filter((m) => m.finalStage)
    .every(
      (m) =>
        m.body.includes(cfg.PO_ACK_AUTO_REJECT_REASON) &&
        /nothing is performed until you approve it/.test(m.body)
    )
);

const decidedFixture = pushPo({
  id: 'po-s5-decided',
  poNumber: 'PO-S5-DECIDED',
  orderDate: HOURS_BACK(23),
  acknowledgedAt: NOW.toISOString(),
});
test(
  'a purchase order that already carries a decision plans NOTHING',
  fanout.poAckNotificationPlan(decidedFixture, NOW).due === false
);

const unreadableFixture = pushPo({
  id: 'po-s5-unreadable',
  poNumber: 'PO-S5-UNREADABLE',
  orderDate: 'not-a-date',
});
const unreadablePlan = fanout.poAckNotificationPlan(unreadableFixture, NOW);
test(
  'an unreadable window FAILS CLOSED — nothing is planned and the reason says why',
  unreadablePlan.due === false && /fail-closed/.test(unreadablePlan.reason ?? '')
);

const pastFixture = pushPo({
  id: 'po-s5-past',
  poNumber: 'PO-S5-PAST',
  orderDate: HOURS_BACK(30),
});
const pastPlan = fanout.poAckNotificationPlan(pastFixture, NOW);
test(
  'PAST the limit the schedule does NOT replay reminders — only the required rejection is owed',
  pastPlan.messages.length === 0 && pastPlan.stages.length === 0 && pastPlan.draftDue === true
);
test(
  'past the limit the plan says the notification schedule no longer applies',
  /notification schedule no longer\s+applies/.test(pastPlan.reason ?? ''),
  pastPlan.reason
);

/* ── 3. Destinations are DECLARED records — never fabricated ──────────────────── */
test(
  'the in-app channel is INTERNAL and needs no address',
  fanout.resolvePoAckChannel('brand-astonish', 'in_app').deliverable === true &&
    fanout.PO_ACK_IN_APP_DESTINATION.includes('in-app')
);
test(
  'the email destination is the brand’s DECLARED contact email (canonical record)',
  fanout.poAckDestinationFor('brand-astonish', 'email') ===
    demoData.ALL_DEMO_BRANDS.find((b) => b.id === 'brand-astonish').email
);
test(
  'no instant-message number is on record for any demo brand (so the channel fails closed)',
  demoData.ALL_DEMO_BRANDS.every((b) => fanout.poAckDestinationFor(b.id, 'sms') === null) &&
    [...SEED_BRAND_IDS].every((id) => fanout.poAckDestinationFor(id, 'sms') === null)
);
test(
  'a brand’s channels come from its OWN declared preference (Astonish: email + in-app + instant)',
  fanout.poAckChannelsFor('brand-astonish').join(',') === 'email,in_app,sms'
);
test(
  'a brand with NO preference record gets NO channels (fail closed — no invented subscription)',
  fanout.poAckChannelsFor('brand-not-subscribed').length === 0
);

/* ── 4. THE INSTANT-MESSAGE SEAM — declared, and FAILING CLOSED ───────────────── */
const authoritativeMode = integrations.defaultIntegrationMode(
  fanout.PO_ACK_INSTANT_MESSAGE_PROVIDER
);
test(
  'the authoritative instant-message provider mode is NOT simulation (so it must fail closed)',
  authoritativeMode !== 'simulation',
  authoritativeMode
);
const refusedInstant = fanout.resolvePoAckChannel('brand-astonish', 'sms');
test(
  'the instant-message channel is REFUSED, and the refusal NAMES the resolved mode',
  refusedInstant.deliverable === false &&
    (refusedInstant.refusal ?? '').includes(authoritativeMode),
  refusedInstant.refusal
);
test(
  'the refusal states the canonical rule — an unverified provider is never treated as simulation',
  /NEVER treated as\s+simulation/.test(refusedInstant.refusal ?? '') &&
    /fail-closed/.test(refusedInstant.refusal ?? '')
);
test(
  'a positively-resolved SIMULATION selects the mock instant-message client',
  (() => {
    const r = fanout.resolveInstantMessageClient('simulation');
    return r.ok === true && r.mode === 'simulation' && r.client.mode === 'simulation';
  })()
);
test(
  'a LIVE connection selects the REAL provider adapter (the Twilio-backed client)',
  (() => {
    const r = fanout.resolveInstantMessageClient('live');
    return r.ok === true && r.mode === 'live' && r.client.mode === 'live';
  })()
);
test(
  'every OTHER mode refuses the factory (available / configuring / degraded / unknown / not_registered)',
  ['available', 'configuring', 'degraded', 'error', 'disabled', 'unknown', 'not_registered'].every(
    (m) => fanout.resolveInstantMessageClient(m).ok === false
  )
);
test(
  'with a simulation mode but NO number on record the channel still refuses (destination gate)',
  (() => {
    const r = fanout.resolvePoAckChannel('brand-astonish', 'sms', 'simulation');
    return r.deliverable === false && /No instant-message number is on record/.test(r.refusal ?? '');
  })()
);

/* ── 5. THE SEEDED FAN-OUT — the schedule actually REACHES the brand ─────────── */
const eventsBefore = (await server.ssrLoadModule('/src/lib/events/eventFeed.ts')).queryEvents({})
  .length;
const auditBefore = store.demoAuditLog.length;
const first = fanout.runPoAckNotificationFanout('admin', null, 'staff:s5-gate', { now: NOW });
test(
  'the fan-out examined every purchase order in scope',
  first.evaluated === store.demoPurchaseOrders.length,
  `${first.evaluated} vs ${store.demoPurchaseOrders.length}`
);
test(
  'the fan-out delivered messages on the brand’s OWN channels and produced the run report',
  first.deliveries.length > 0 && first.channels.some((c) => c.delivered > 0)
);

const expectedMessages = closingPlan.messages.length;
const expectedRefusals = closingPlan.refusals.length;
const closingRecords = deliveriesFor(closingLive.id);
test(
  'the seeded closing-window PO received ONE message per reached stage per deliverable channel',
  closingRecords.filter((r) => r.state !== 'refused').length === expectedMessages &&
    closingRecords.every((r) => r.poNumber === 'PO-9001'),
  `${closingRecords.filter((r) => r.state !== 'refused').length} vs ${expectedMessages}`
);
test(
  'the INSTANT-MESSAGE channel is refused for the closing-window PO — one refusal per stage, with its reason',
  closingRecords.filter((r) => r.state === 'refused').length === expectedRefusals &&
    closingRecords
      .filter((r) => r.state === 'refused')
      .every(
        (r) =>
          r.channel === 'sms' &&
          /NEVER treated as|No instant-message number/.test(r.reason ?? '')
      ),
  `${closingRecords.filter((r) => r.state === 'refused').length} vs ${expectedRefusals}`
);
test(
  'the in-app channel delivered the reminders (the brand sees the schedule Mercenta sent)',
  closingRecords.filter((r) => r.channel === 'in_app' && r.state === 'delivered').length ===
    closingPlan.stages.length
);
test(
  'the deliveries are visible through the IN-APP surface accessor, tenant-scoped',
  fanout
    .poAckInAppDeliveries('admin')
    .some((r) => r.poId === closingLive.id) &&
    fanout.poAckInAppDeliveries('brand', 'brand-astonish').every((r) => r.brandId === 'brand-astonish') &&
    fanout.poAckInAppDeliveries('brand', null).length === 0
);

/** The email channel goes through the mock adapter, which answers asynchronously. */
await new Promise((r) => setTimeout(r, 500));
const closingAfterEmail = deliveriesFor(closingLive.id);
test(
  'the email channel delivered through the platform adapter, labelled SIMULATED (mock:msg-…)',
  closingAfterEmail
    .filter((r) => r.channel === 'email')
    .every((r) => r.state === 'delivered' && r.simulated === true && /^mock:msg-/.test(r.reference ?? '')),
  JSON.stringify(closingAfterEmail.filter((r) => r.channel === 'email').map((r) => [r.state, r.reference]))
);

/* ── 6. THE FINAL STAGE PRODUCES MERCENTA'S DRAFT — and performs nothing ─────── */
const onBehalfDraftId = `draft-${closingLive.id}-`;
test(
  'the FINAL stage produced Mercenta’s on-behalf rejection draft (S4’s producer, invoked by the schedule)',
  first.draftsProduced.some((id) => id.startsWith(onBehalfDraftId)) &&
    Boolean(closingLive.onBehalfDraft) &&
    closingLive.onBehalfDraft.createdBy === cfg.PO_ACK_SYSTEM_ACTOR_ID,
  first.draftsProduced.join(', ')
);
test(
  'nothing was PERFORMED — the purchase order is still undecided and unrejected',
  !closingLive.acknowledgedAt &&
    ['received', 'under_review'].includes(closingLive.status) &&
    closingLive.lineItems.every((l) => l.ackStatus !== 'rejected') &&
    store.demoAuditLog.filter((a) => a.action === 'purchase_order_auto_rejected').length === 0
);
test(
  'the draft production is audited by the S4 producer itself (not re-audited here)',
  auditFor('purchase_order_on_behalf_draft_created', closingLive.id).length === 1
);

/* ── 7. IDEMPOTENT — a repeat fan-out delivers nothing twice ─────────────────── */
const ledgerAfterFirst = fanout.getPoAckDeliveries('admin').length;
const second = fanout.runPoAckNotificationFanout('admin', null, 'staff:s5-gate', { now: NOW });
test(
  'the second fan-out delivered NOTHING new (a delivery is made at most once)',
  second.deliveries.length === 0 && second.duplicatesSuppressed > 0,
  `${second.deliveries.length} delivered / ${second.duplicatesSuppressed} suppressed`
);
test(
  'the second fan-out recorded no second refusal (an unchanged reason is not re-recorded)',
  second.refused.length === 0
);
test(
  'the second fan-out produced no second draft and did not perform anything',
  second.draftsProduced.length === 0 && !closingLive.acknowledgedAt
);
test(
  'the delivery ledger is unchanged by the repeat run',
  fanout.getPoAckDeliveries('admin').length === ledgerAfterFirst
);
test(
  'the delivery id is deterministic: po-ack-notify-<poId>-<stage>-<channel>',
  closingRecords.every((r) => r.id === `po-ack-notify-${r.poId}-${r.stage}-${r.channel}`)
);

/* ── 8. ATTRIBUTION, AUDIT AND THE CANONICAL EVENT ───────────────────────────── */
const feed = await server.ssrLoadModule('/src/lib/events/eventFeed.ts');
test(
  'every delivery names the SENDER (Mercenta’s declared identity) and the TRIGGER (the invoker)',
  first.deliveries.every(
    (d) => d.sentBy === cfg.PO_ACK_SYSTEM_ACTOR_ID && d.triggeredBy === 'staff:s5-gate'
  )
);
test(
  'every refusal is attributed the same way (nothing is anonymous)',
  first.refused.every(
    (r) => r.sentBy === cfg.PO_ACK_SYSTEM_ACTOR_ID && r.triggeredBy === 'staff:s5-gate'
  )
);
test(
  'each delivery is audited ONCE, by the invoking actor, naming the sender',
  auditFor('purchase_order_ack_notification_sent', closingLive.id).length ===
    closingRecords.filter((r) => r.channel !== 'sms').length &&
    auditFor('purchase_order_ack_notification_sent', closingLive.id).every(
      (a) => a.actorId === 'staff:s5-gate' && a.metadata?.sentBy === cfg.PO_ACK_SYSTEM_ACTOR_ID
    ),
  String(auditFor('purchase_order_ack_notification_sent', closingLive.id).length)
);
test(
  'each refusal is audited with its reason and the channel it refused',
  auditFor('purchase_order_ack_notification_refused', closingLive.id).length === expectedRefusals &&
    auditFor('purchase_order_ack_notification_refused', closingLive.id).every(
      (a) => a.metadata?.channel === 'sms' && /fail-closed|treated as/.test(a.reason)
    )
);
const fanoutEvents = feed.queryEvents({ type: 'po_acknowledgement_notification' });
test(
  'every delivery and refusal emitted exactly ONE canonical event (no second feed, no duplicates)',
  fanoutEvents.length === first.deliveries.length + first.refused.length,
  `${fanoutEvents.length} vs ${first.deliveries.length + first.refused.length}`
);
test(
  'the audit log really grew (the fan-out is not a silent no-op)',
  store.demoAuditLog.length > auditBefore
);

/* ── 9. TENANT ISOLATION — a brand run can only ever touch its own tenant ─────── */
const tapatioPos = store.demoPurchaseOrders.filter((p) => p.brandId === 'brand-tapatio').length;
const brandRun = fanout.runPoAckNotificationFanout('brand', 'brand-tapatio', 'staff:brand', {
  now: NOW,
});
test(
  'a brand-scope fan-out examines ONLY that brand’s purchase orders',
  brandRun.evaluated === tapatioPos,
  `${brandRun.evaluated} vs ${tapatioPos}`
);
test(
  'a brand-scope fan-out never records anything for another tenant',
  brandRun.deliveries.every((d) => d.brandId === 'brand-tapatio') &&
    brandRun.refused.every((r) => r.brandId === 'brand-tapatio')
);
const noTenantRun = fanout.runPoAckNotificationFanout('brand', null, 'staff:brand', { now: NOW });
test(
  'a brand-scope fan-out with NO tenant produces NOTHING and says why (fail closed)',
  noTenantRun.evaluated === 0 &&
    noTenantRun.deliveries.length === 0 &&
    /must name its tenant/.test(noTenantRun.notes[0] ?? ''),
  noTenantRun.notes[0]
);
test(
  'the delivery queries are tenant-scoped and fail closed',
  fanout.getPoAckDeliveries('brand', 'brand-tapatio').every((r) => r.brandId === 'brand-tapatio') &&
    fanout.getPoAckDeliveries('brand', null).length === 0 &&
    fanout.getPoAckDeliveries('admin').length >=
      fanout.getPoAckDeliveries('brand', 'brand-tapatio').length
);

/* ── 10. THE AUTOMATION SEAM — the declared way the fan-out is invoked ───────── */
const definition = automation.AUTOMATION_REGISTRY[fanout.PO_ACK_NOTIFICATION_AUTOMATION_ID];
test(
  'the automation is declared DETERMINISTIC, TENANT-SCOPED, AI-free and needs no approval',
  definition.deterministic === true &&
    definition.tenantScoped === true &&
    definition.requiresAi === false &&
    definition.approvalRequired === false
);
test(
  'the automation declares the instant-message provider it would need, and its entry point',
  definition.externalProviders.includes('twilio_whatsapp') &&
    definition.entryPoint.includes(fanout.PO_ACK_NOTIFICATION_AUTOMATION_ID) &&
    /12h \/ 6h \/ 2h/.test(definition.cadence)
);
const automationRun = automation.runAutomation(fanout.PO_ACK_NOTIFICATION_AUTOMATION_ID, {
  actor: 'staff:s5-gate',
});
test(
  'running the automation executes the fan-out and reports its own numbers (never invented)',
  automationRun.status === 'succeeded' &&
    automationRun.evaluated === store.demoPurchaseOrders.length &&
    automationRun.notes.length > 0,
  `${automationRun.status} / ${automationRun.evaluated}`
);
const automationRunAgain = automation.runAutomation(fanout.PO_ACK_NOTIFICATION_AUTOMATION_ID, {
  actor: 'staff:s5-gate',
});
test(
  'a repeat run with unchanged canonical input is SUPPRESSED (no duplicate work, event or notification)',
  automationRunAgain.status === 'duplicate_suppressed',
  automationRunAgain.status
);
test(
  'the suppressed run produced no further notification event',
  feed.queryEvents({ type: 'po_acknowledgement_notification' }).length === fanoutEvents.length
);

/* ── 11. THE MESSAGE — derived, truthful and wording-safe ───────────────────── */
const firstMessage = closingRecords.find((r) => r.channel === 'in_app');
test(
  'the subject carries the purchase-order number and the time the brand actually has',
  /PO-9001/.test(firstMessage.subject) && /left to acknowledge/.test(firstMessage.subject),
  firstMessage.subject
);
test(
  'the body states the config-owned rule verbatim',
  firstMessage.body.includes(cfg.PO_ACK_WINDOW_RULE_TEXT)
);
const wordingClean = (text) =>
  BANNED_PATTERNS.every((p) => {
    p.re.lastIndex = 0;
    return !p.re.test(text);
  });
test(
  'the delivered copy never names the retail channel (outward-facing wording rule)',
  wordingClean(firstMessage.subject) &&
    wordingClean(firstMessage.body) &&
    closingRecords.every((r) => wordingClean(r.subject) && wordingClean(r.body))
);

/* ── 12. THE SCHEDULER SEAM + zero network calls ─────────────────────────────── */
const seam = fanout.describePoAckNotificationFanout();
test(
  'the fan-out declares its scheduler seam — deterministic, no timer, zero network calls',
  seam.deterministic === true &&
    seam.usesTimer === false &&
    seam.networkCalls === 0 &&
    /runPoAckNotificationFanout/.test(seam.entryPoint) &&
    /po-ack-notify/.test(seam.idempotencyKey)
);
test(
  'the schedule is declared in the cadence it actually uses (the config’s own 12/6/2h)',
  seam.cadence.includes(`${cfg.PO_ACK_NOTIFICATION_HOURS.join('/')}h`)
);
test(
  'the INSTANT-MESSAGE seam declares its live path honestly (the one provider call)',
  /positively resolves/.test(seam.liveInstantMessagePath)
);
test(
  'every assertion above ran with fetch sabotaged (zero network calls)',
  fetchCalls === 0,
  String(fetchCalls)
);

await server.close();
console.log(
  failures === 0
    ? '\nPO_ACK_NOTIFICATIONS_VALIDATION_PASS — every assertion above is green (0 network calls).'
    : `\nPO_ACK_NOTIFICATIONS_VALIDATION_FAIL — ${failures} assertion(s) failed.`
);
process.exit(failures === 0 ? 0 : 1);
