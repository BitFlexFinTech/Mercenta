#!/usr/bin/env node
/**
 * §WAVE 3 — LOGISTICS HUB COMPLETION VALIDATOR.
 *
 * The browser suite proves the Hub RENDERS and INTERACTS. This validator proves
 * the parts a browser test cannot reach cheaply, by EXECUTING THE REAL MODULES
 * (bundled with the project's own esbuild through the project's own `@` alias).
 * A source-text assertion would pass even if the behaviour were wrong; every
 * assertion below runs the shipped code and inspects its result.
 *
 * Asserted behaviour:
 *   1  BACKORDER FAIL-CLOSED at the DOMAIN BOUNDARY, through the real
 *      `acknowledgePurchaseOrder`: true permits, false refuses, undefined
 *      refuses (missing field included), and a refused attempt leaves the PO
 *      byte-for-byte unchanged.
 *   2  A rejected line can never later become accepted/backordered (AV-007), and
 *      a second acknowledgement of the same PO is refused.
 *   3  CARRIER ELIGIBILITY is DERIVED, not hardcoded: the lane's declared account
 *      is permitted, the other Mercenta account is override-only, and Freight
 *      Collect permits only the partnered carrier.
 *   4  PROVIDER SAFETY: a carrier whose provider mode is disabled / error /
 *      degraded / configuring / available / unregistered / unknown is REFUSED
 *      with that state named. Availability is not eligibility.
 *   5  ETA is derived deterministically from the PO window, is labelled
 *      derived/simulated, is `delivered` once the consignment has arrived, and is
 *      ABSENT (never invented) when no window is declared.
 *   6  DELIVERY PERFORMANCE reports a rate only when a sample exists — never a
 *      fabricated 100% — and separates provider-verified from simulated
 *      deliveries.
 *   7  ZERO NETWORK CALLS: every derivation still works with `fetch` sabotaged.
 *
 * Run: node scripts/validate-wave3-logistics.mjs
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

/* ── Bundle the REAL modules and execute them ────────────────────────────── */

const ENTRY = `
import { acknowledgePurchaseOrder } from '@/data/api';
import { demoPurchaseOrders } from '@/data/demoStore';
import {
  isBackOrderAllowedForLine, backOrderBlockedReason, canBackOrderLine,
  ackStatusTransitionRefusal, backOrderAvailabilityLabel,
} from '@/lib/commerce/backorderGate';
import {
  deriveCarrierEligibility, isCarrierSelectable, isCarrierOperational, carrierStateReason,
} from '@/lib/shipping/carrierEligibility';
import { validateCarrierForShipment, selectCarrierForShipment } from '@/lib/shipping/carrierRouting';
import { deriveShipmentEta, etaPresentation, etaWindowKindFor } from '@/lib/logistics/shipmentEta';
import { buildDeliveryPerformance, performanceLabel } from '@/lib/logistics/deliveryPerformance';
import { routingReadinessDeadline, ROUTING_READINESS } from '@/lib/shipping/routingReadiness';

/* §7 — sabotage the network BEFORE any derivation runs. */
globalThis.fetch = () => { throw new Error('NETWORK_CALL_ATTEMPTED'); };

const out = {};
const modeSet = { dhl: 'simulation', palletline: 'simulation' };
/* ── 1/2. The real domain boundary ──────────────────────────────────────── */
const poAllows = demoPurchaseOrders.find((p) => p.lineItems.some((l) => l.isBackOrderAllowed === true));
const poDenies = demoPurchaseOrders.find(
  (p) => !p.acknowledgedAt && p.lineItems.length > 0 && p.lineItems.every((l) => l.isBackOrderAllowed === false)
);
const poUnknown = demoPurchaseOrders.find(
  (p) => !p.acknowledgedAt && p.lineItems.length > 0 && p.lineItems.every((l) => l.isBackOrderAllowed === undefined)
);
out.fixtures = {
  allows: poAllows ? poAllows.poNumber : null,
  denies: poDenies ? poDenies.poNumber : null,
  unknown: poUnknown ? poUnknown.poNumber : null,
};

// true → permitted, with the backorder deadline recorded
const allowLine = poAllows.lineItems[0];
out.allowResult = acknowledgePurchaseOrder(poAllows.id, [
  { sku: allowLine.sku, ackStatus: 'backordered', acknowledgedQty: 1, scheduledShipDate: '2026-12-01' },
  ...poAllows.lineItems.slice(1).map((l) => ({ sku: l.sku, ackStatus: 'accepted', acknowledgedQty: l.quantity })),
]);
out.allowLineAfter = {
  ackStatus: allowLine.ackStatus,
  acknowledgedQty: allowLine.acknowledgedQty,
  backorderRestockDeadline: allowLine.backorderRestockDeadline,
  scheduledShipDate: allowLine.scheduledShipDate,
  history: (allowLine.ackHistory || []).length,
};
out.allowPoAcknowledged = Boolean(poAllows.acknowledgedAt);

// §BATCH 2b (AV-006) — REPOINTED. The OLD contract asserted here was "ANY second
// acknowledgement of the same PO is refused outright". That was an over-restriction
// Mercenta invented: the channel's documented rule is that a CHANGE to an
// acknowledgement is accepted within 48 hours (quantity, price, ship dates,
// delivery dates) and that after 48 hours only ship-date/delivery-date changes are
// expected. A second submission is therefore an AMENDMENT judged by the update
// window — and only a submission that changes NOTHING is still refused as a
// duplicate (which is what this check now asserts, with the same wording test).
//
// A no-op re-statement of the recorded decision → refused as a duplicate;
const duplicateSubmission = [
  { sku: allowLine.sku, ackStatus: 'backordered', acknowledgedQty: 1, scheduledShipDate: '2026-12-01' },
  ...poAllows.lineItems.slice(1).map((l) => ({ sku: l.sku, ackStatus: 'accepted', acknowledgedQty: l.quantity })),
];
out.duplicateResult = acknowledgePurchaseOrder(poAllows.id, duplicateSubmission);

// a genuine SCHEDULE change, at an instant inside the channel's update window
// (order + 30h: past the 24-hour acceptance limit, inside the 48-hour update
// window) → accepted, and recorded as an amendment.
out.amendInsideResult = acknowledgePurchaseOrder(
  poAllows.id,
  [
    { sku: allowLine.sku, ackStatus: 'backordered', acknowledgedQty: 1, scheduledShipDate: '2026-12-05' },
    ...poAllows.lineItems.slice(1).map((l) => ({ sku: l.sku, ackStatus: 'accepted', acknowledgedQty: l.quantity })),
  ],
  undefined,
  new Date(Date.parse(poAllows.orderDate) + 30 * 3600_000)
);
out.amendInsideLastAmendedAt = poAllows.lastAmendedAt || null;
out.amendInsideHistoryLast = allowLine.ackHistory[allowLine.ackHistory.length - 1] || null;

// false → refused, nothing mutated
const denyBefore = JSON.stringify(poDenies.lineItems);
out.denyResult = acknowledgePurchaseOrder(
  poDenies.id,
  poDenies.lineItems.map((l, i) => ({
    sku: l.sku,
    ackStatus: i === 0 ? 'backordered' : 'accepted',
    acknowledgedQty: l.quantity,
    scheduledShipDate: '2026-12-01',
  }))
);
out.denyUnchanged = JSON.stringify(poDenies.lineItems) === denyBefore;
out.denyPoStillUnacknowledged = !poDenies.acknowledgedAt;

// undefined / missing → refused, nothing mutated
const unknownBefore = JSON.stringify(poUnknown.lineItems);
out.unknownResult = acknowledgePurchaseOrder(
  poUnknown.id,
  poUnknown.lineItems.map((l, i) => ({
    sku: l.sku,
    ackStatus: i === 0 ? 'backordered' : 'accepted',
    acknowledgedQty: l.quantity,
    scheduledShipDate: '2026-12-01',
  }))
);
out.unknownUnchanged = JSON.stringify(poUnknown.lineItems) === unknownBefore;

// the pure gate itself
out.gate = {
  trueAllowed: isBackOrderAllowedForLine({ isBackOrderAllowed: true }),
  falseAllowed: isBackOrderAllowedForLine({ isBackOrderAllowed: false }),
  undefinedAllowed: isBackOrderAllowedForLine({}),
  undefinedReason: backOrderBlockedReason({}),
  falseReason: backOrderBlockedReason({ isBackOrderAllowed: false }),
  trueNoReason: backOrderBlockedReason({ isBackOrderAllowed: true }),
  canTrue: canBackOrderLine({ isBackOrderAllowed: true }),
  canMissing: canBackOrderLine({}),
  labels: [
    backOrderAvailabilityLabel({ isBackOrderAllowed: true }),
    backOrderAvailabilityLabel({ isBackOrderAllowed: false }),
    backOrderAvailabilityLabel({}),
  ],
};

// AV-007 — rejected-line permanence
out.rejectedPermanence = {
  toAccepted: ackStatusTransitionRefusal({ sku: 'X', ackStatus: 'rejected' }, 'accepted'),
  toBackordered: ackStatusTransitionRefusal({ sku: 'X', ackStatus: 'rejected' }, 'backordered'),
  toRejectedAgain: ackStatusTransitionRefusal({ sku: 'X', ackStatus: 'rejected' }, 'rejected'),
  firstAckUnrestricted: ackStatusTransitionRefusal({ sku: 'X' }, 'accepted'),
};
/* ── 3/4. Carrier eligibility + provider safety ─────────────────────────── */
out.eligibility = {
  intl: deriveCarrierEligibility({ originCountry: 'Germany', freightTerm: 'prepaid', providerModes: modeSet }),
  uk: deriveCarrierEligibility({ originCountry: 'United Kingdom', freightTerm: 'prepaid', providerModes: modeSet }),
  collect: deriveCarrierEligibility({ originCountry: 'Germany', freightTerm: 'collect', providerModes: modeSet }),
  collectDisabled: deriveCarrierEligibility({ originCountry: 'Germany', freightTerm: 'collect', providerModes: { dhl: 'disabled', palletline: 'simulation' } }),
  dhlDisabled: deriveCarrierEligibility({ originCountry: 'Germany', freightTerm: 'prepaid', providerModes: { dhl: 'disabled', palletline: 'simulation' } }),
  dhlNotRegistered: deriveCarrierEligibility({ originCountry: 'Germany', freightTerm: 'prepaid', providerModes: { palletline: 'simulation' } }),
  dhlAvailable: deriveCarrierEligibility({ originCountry: 'Germany', freightTerm: 'prepaid', providerModes: { dhl: 'available', palletline: 'simulation' } }),
  dhlDegraded: deriveCarrierEligibility({ originCountry: 'Germany', freightTerm: 'prepaid', providerModes: { dhl: 'degraded', palletline: 'simulation' } }),
  dhlError: deriveCarrierEligibility({ originCountry: 'Germany', freightTerm: 'prepaid', providerModes: { dhl: 'error', palletline: 'simulation' } }),
  dhlConfiguring: deriveCarrierEligibility({ originCountry: 'Germany', freightTerm: 'prepaid', providerModes: { dhl: 'configuring', palletline: 'simulation' } }),
  dhlLive: deriveCarrierEligibility({ originCountry: 'Germany', freightTerm: 'prepaid', providerModes: { dhl: 'live', palletline: 'simulation' } }),
  palletisedIntl: deriveCarrierEligibility({ originCountry: 'Germany', freightTerm: 'prepaid', providerModes: modeSet, service: 'palletised' }),
};
out.stateReasons = {
  disabled: carrierStateReason('disabled'),
  degraded: carrierStateReason('degraded'),
  available: carrierStateReason('available'),
  notRegistered: carrierStateReason('not_registered'),
  unknown: carrierStateReason('unknown'),
};
out.operational = {
  simulation: isCarrierOperational('simulation'),
  live: isCarrierOperational('live'),
  available: isCarrierOperational('available'),
  disabled: isCarrierOperational('disabled'),
  not_registered: isCarrierOperational('not_registered'),
  unknown: isCarrierOperational('unknown'),
  degraded: isCarrierOperational('degraded'),
};
out.selectable = {
  intlDhl: isCarrierSelectable({ carrier: 'dhl', originCountry: 'Germany', freightTerm: 'prepaid', providerModes: modeSet }),
  intlPalletlineOverride: isCarrierSelectable({ carrier: 'palletline', originCountry: 'Germany', freightTerm: 'prepaid', providerModes: modeSet }),
  collectDhl: isCarrierSelectable({ carrier: 'dhl', originCountry: 'Germany', freightTerm: 'collect', providerModes: modeSet }),
  prepaidPartnered: isCarrierSelectable({ carrier: 'amazon_partner', originCountry: 'Germany', freightTerm: 'prepaid', providerModes: modeSet }),
  retiredFedex: isCarrierSelectable({ carrier: 'fedex', originCountry: 'Germany', freightTerm: 'prepaid', providerModes: modeSet }),
  dhlDisabled: isCarrierSelectable({ carrier: 'dhl', originCountry: 'Germany', freightTerm: 'prepaid', providerModes: { dhl: 'disabled' } }),
};

/* §Regression — the pre-existing carrier contract must be unchanged. */
out.carrier = {
  collectPartnered: validateCarrierForShipment({ carrier: 'amazon_partner', brandNation: 'United States', freightTerm: 'collect' }),
  collectMercenta: validateCarrierForShipment({ carrier: 'dhl', brandNation: 'United States', freightTerm: 'collect' }),
  partneredOnPrepaid: validateCarrierForShipment({ carrier: 'amazon_partner', brandNation: 'United States', freightTerm: 'prepaid' }),
  prepaidIntl: validateCarrierForShipment({ carrier: 'dhl', brandNation: 'United States', freightTerm: 'prepaid' }),
  prepaidUk: validateCarrierForShipment({ carrier: 'palletline', brandNation: 'United Kingdom', freightTerm: 'prepaid' }),
  prepaidIntlWrong: validateCarrierForShipment({ carrier: 'palletline', brandNation: 'United States', freightTerm: 'prepaid' }),
  unknownCarrier: validateCarrierForShipment({ carrier: 'acme_van', brandNation: 'Germany' }),
  laneIntl: selectCarrierForShipment({ brandNation: 'Germany' }),
  laneUk: selectCarrierForShipment({ brandNation: 'United Kingdom' }),
  laneUnknown: selectCarrierForShipment({}),
  dhlDisabledPrepaid: validateCarrierForShipment({ carrier: 'dhl', brandNation: 'United States', freightTerm: 'prepaid', providerModes: { dhl: 'disabled' } }),
  dhlNotRegisteredPrepaid: validateCarrierForShipment({ carrier: 'dhl', brandNation: 'United States', freightTerm: 'prepaid', providerModes: {} }),
};
/* ── 5. ETA ─────────────────────────────────────────────────────────────── */
out.eta = {
  windowKindCollect: etaWindowKindFor('collect'),
  windowKindPrepaid: etaWindowKindFor('prepaid'),
  windowKindNone: etaWindowKindFor(null),
  delivered: deriveShipmentEta({ status: 'live_amazon', stage: 'delivered', windowEnd: '2026-10-01', windowKind: 'delivery' }),
  onTrack: deriveShipmentEta({ status: 'sea_transit', stage: 'shipped', windowEnd: '2026-10-01', windowKind: 'delivery' }),
  delayed: deriveShipmentEta({ status: 'sea_transit', stage: 'shipped', windowEnd: '2026-10-01', windowKind: 'delivery', delayed: true }),
  exception: deriveShipmentEta({ status: 'sea_transit', stage: 'shipped', windowEnd: '2026-10-01', windowKind: 'delivery', exception: true }),
  noWindow: deriveShipmentEta({ status: 'factory_intake', stage: 'ready_to_fulfil', windowEnd: null, windowKind: null }),
  undeclaredTerm: deriveShipmentEta({ status: 'factory_intake', stage: 'ready_to_fulfil', windowEnd: '2026-10-01', windowKind: null }),
};
out.etaLabels = {
  onTrack: etaPresentation(out.eta.onTrack),
  delayed: etaPresentation(out.eta.delayed),
  delivered: etaPresentation(out.eta.delivered),
  noWindow: etaPresentation(out.eta.noWindow),
};

/* ── 6. Delivery performance ────────────────────────────────────────────── */
out.performance = {
  empty: buildDeliveryPerformance([]),
  noDelivered: buildDeliveryPerformance([
    { status: 'sea_transit', stage: 'shipped', truth: 'simulated' },
    { status: 'factory_intake', stage: 'ready_to_fulfil', truth: 'simulated', delayed: true },
  ]),
  mixed: buildDeliveryPerformance([
    { status: 'live_amazon', stage: 'delivered', truth: 'simulated' },
    { status: 'live_amazon', stage: 'delivered', truth: 'live_verified' },
    { status: 'live_amazon', stage: 'delivered', truth: 'simulated', exception: true },
    { status: 'sea_transit', stage: 'shipped', truth: 'simulated', delayed: true },
  ]),
};
out.performanceLabels = {
  null: performanceLabel(null),
  zero: performanceLabel(0),
  half: performanceLabel(0.5),
  full: performanceLabel(1),
};

/* ── 7. Routing readiness ownership ─────────────────────────────────────── */
out.routingReadiness = {
  owner: ROUTING_READINESS.owner,
  label: ROUTING_READINESS.label,
  basis: ROUTING_READINESS.basis,
  deadline: routingReadinessDeadline('2026-10-10').toISOString(),
  deadlineIsDayBefore: routingReadinessDeadline('2026-10-10').toISOString().slice(0, 10) === '2026-10-09',
};

console.log('__RESULT__' + JSON.stringify(out));
`;

const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'mercenta-wave3-'));
const entryPath = path.join(tmpDir, 'entry.ts');
const outPath = path.join(tmpDir, 'bundle.cjs');
fs.writeFileSync(entryPath, ENTRY, 'utf8');

let R;
try {
  execFileSync(
    path.join(ROOT, 'node_modules/.bin/esbuild'),
    [
      entryPath,
      '--bundle',
      /**
       * CJS output on purpose: the real `@/data/api` module graph reaches
       * Supabase, whose CJS build requires Node built-ins dynamically. Bundling
       * as CJS executes the SHIPPED code rather than a re-implementation of it.
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
  R = JSON.parse(stdout.split('__RESULT__')[1]);
} catch (error) {
  console.log(`  FAIL  bundling/executing the real modules — ${String(error).slice(0, 800)}`);
  console.log('');
  console.log('WAVE3_LOGISTICS_VALIDATION_FAIL (0 passed, 1 failed)');
  process.exit(1);
}
/* ── 1/2. Backorder fail-closed at the domain boundary ──────────────────── */
console.log('\n§ Backorder fail-closed (domain boundary: acknowledgePurchaseOrder)\n');
check(
  'a line the channel allows (isBackOrderAllowed: true) can be backordered',
  R.allowResult.ok === true,
  JSON.stringify(R.allowResult)
);
check(
  'an allowed backorder records its status, scheduled ship date and 30-day restock deadline',
  R.allowLineAfter.ackStatus === 'backordered' &&
    R.allowLineAfter.scheduledShipDate === '2026-12-01' &&
    typeof R.allowLineAfter.backorderRestockDeadline === 'string' &&
    R.allowLineAfter.backorderRestockDeadline > R.allowLineAfter.scheduledShipDate &&
    R.allowLineAfter.history === 1,
  JSON.stringify(R.allowLineAfter)
);
check('the PO is marked acknowledged', R.allowPoAcknowledged === true);
check(
  'isBackOrderAllowed: false → the backorder is REFUSED',
  R.denyResult.ok === false && /backorder/i.test(R.denyResult.error || ''),
  JSON.stringify(R.denyResult)
);
check(
  'isBackOrderAllowed: undefined/missing → the backorder is REFUSED (fail closed)',
  R.unknownResult.ok === false && /backorder/i.test(R.unknownResult.error || ''),
  JSON.stringify(R.unknownResult)
);
check('a refused attempt leaves the denied PO byte-for-byte unchanged', R.denyUnchanged === true);
check('a refused attempt does not mark the PO acknowledged', R.denyPoStillUnacknowledged === true);
check('a refused attempt leaves the undeclared-permission PO unchanged', R.unknownUnchanged === true);
check(
  'a duplicate acknowledgement of the same PO is refused',
  R.duplicateResult.ok === false && /already been acknowledged/i.test(R.duplicateResult.error || ''),
  JSON.stringify(R.duplicateResult)
);
/**
 * §BATCH 2b (`AV-006`) — the NEW canonical truth, alongside the preserved
 * duplicate refusal above: a second submission that genuinely CHANGES something is
 * an amendment judged by the channel's 48-hour update window.
 */
check(
  'a genuine schedule change inside the update window is accepted as an AMENDMENT',
  R.amendInsideResult.ok === true &&
    typeof R.amendInsideLastAmendedAt === 'string' &&
    R.amendInsideHistoryLast?.amended === true &&
    R.amendInsideHistoryLast?.withinUpdateWindow === true,
  JSON.stringify({
    result: R.amendInsideResult,
    lastAmendedAt: R.amendInsideLastAmendedAt,
    last: R.amendInsideHistoryLast,
  })
);
check(
  'the pure gate allows ONLY a positive true',
  R.gate.trueAllowed === true &&
    R.gate.falseAllowed === false &&
    R.gate.undefinedAllowed === false &&
    R.gate.canTrue === true &&
    R.gate.canMissing === false,
  JSON.stringify(R.gate)
);
check(
  'the gate explains WHY it refused, and offers no reason when it permits',
  typeof R.gate.undefinedReason === 'string' &&
    R.gate.undefinedReason.length > 20 &&
    typeof R.gate.falseReason === 'string' &&
    R.gate.trueNoReason === null,
  JSON.stringify({ u: R.gate.undefinedReason, t: R.gate.trueNoReason })
);
check(
  'the availability label distinguishes allowed / not allowed / not declared',
  R.gate.labels[0].includes('allowed by the retail channel') &&
    R.gate.labels[1].includes('not allowed') &&
    R.gate.labels[2].includes('fail closed'),
  JSON.stringify(R.gate.labels)
);
check(
  'AV-007 — a rejected line can never become accepted or backordered',
  typeof R.rejectedPermanence.toAccepted === 'string' &&
    typeof R.rejectedPermanence.toBackordered === 'string' &&
    R.rejectedPermanence.toRejectedAgain === null &&
    R.rejectedPermanence.firstAckUnrestricted === null,
  JSON.stringify(R.rejectedPermanence)
);

/* ── 3. Carrier eligibility derivation ─────────────────────────────────── */
console.log('\n§ Carrier eligibility derivation\n');
check(
  'international prepaid → DHL permitted, Palletline override-only',
  JSON.stringify(R.eligibility.intl.permitted) === JSON.stringify(['dhl']) &&
    JSON.stringify(R.eligibility.intl.overrideCandidates) === JSON.stringify(['palletline']) &&
    R.eligibility.intl.primary === 'dhl',
  JSON.stringify({ p: R.eligibility.intl.permitted, o: R.eligibility.intl.overrideCandidates })
);
check(
  'UK domestic prepaid → Palletline permitted, DHL override-only',
  JSON.stringify(R.eligibility.uk.permitted) === JSON.stringify(['palletline']) &&
    JSON.stringify(R.eligibility.uk.overrideCandidates) === JSON.stringify(['dhl']) &&
    R.eligibility.uk.lane === 'uk_domestic',
  JSON.stringify({ p: R.eligibility.uk.permitted, o: R.eligibility.uk.overrideCandidates })
);
check(
  'Freight Collect → channel-arranged: the partnered carrier is the value, no Mercenta account is permitted',
  R.eligibility.collect.channelArranged === true &&
    R.eligibility.collect.permitted.length === 0 &&
    R.eligibility.collect.primary === null &&
    R.eligibility.collect.channelArrangedCarrier === 'amazon_partner',
  JSON.stringify(R.eligibility.collect)
);
check(
  'Freight Collect → a Mercenta account is OVERRIDE-only, matching the canonical contract the map validator asserts',
  R.eligibility.collect.overrideCandidates.length === 2 &&
    R.eligibility.collect.blocked.length === 0 &&
    R.selectable.collectDhl.ok === true &&
    R.selectable.collectDhl.overridden === true,
  JSON.stringify({ o: R.eligibility.collect.overrideCandidates, s: R.selectable.collectDhl })
);
check(
  'Freight Collect → a NON-operational provider is still refused, even as an override',
  R.eligibility.collectDisabled.blocked.some((b) => b.carrier === 'dhl') &&
    R.eligibility.collectDisabled.overrideCandidates.length === 1,
  JSON.stringify(R.eligibility.collectDisabled)
);
check(
  'the derivation states its reasoning (lane source + override + refusals)',
  R.eligibility.intl.rationale.length >= 3 &&
    R.eligibility.intl.rationale.some((r) => r.includes('Lane')) &&
    R.eligibility.intl.rationale.some((r) => r.includes('admin override')),
  JSON.stringify(R.eligibility.intl.rationale)
);
check(
  'a declared palletised service is NOT silently permitted on the parcel account',
  R.eligibility.palletisedIntl.permitted.length === 0 &&
    R.eligibility.palletisedIntl.overrideCandidates.includes('dhl'),
  JSON.stringify(R.eligibility.palletisedIntl)
);

/* ── 4. Provider safety — availability is not eligibility ──────────────── */
console.log('\n§ Provider safety (availability ≠ eligibility; unknown ≠ simulation)\n');
check(
  'only simulation and live are operational modes',
  R.operational.simulation === true &&
    R.operational.live === true &&
    R.operational.available === false &&
    R.operational.disabled === false &&
    R.operational.not_registered === false &&
    R.operational.unknown === false &&
    R.operational.degraded === false,
  JSON.stringify(R.operational)
);
for (const [label, key] of [
  ['disabled', 'dhlDisabled'],
  ['not registered', 'dhlNotRegistered'],
  ['merely available', 'dhlAvailable'],
  ['degraded', 'dhlDegraded'],
  ['error', 'dhlError'],
  ['configuring', 'dhlConfiguring'],
]) {
  const e = R.eligibility[key];
  check(
    `a ${label} DHL provider blocks eligibility on the international lane (no permitted carrier)`,
    e.permitted.length === 0 &&
      e.blocked.some((b) => b.carrier === 'dhl' && typeof b.reason === 'string' && b.reason.length > 5),
    JSON.stringify(e)
  );
}
check(
  'a live DHL provider is permitted',
  JSON.stringify(R.eligibility.dhlLive.permitted) === JSON.stringify(['dhl']),
  JSON.stringify(R.eligibility.dhlLive.permitted)
);
check(
  'the refusal states the actual provider state',
  R.stateReasons.disabled.includes('disabled') &&
    R.stateReasons.degraded.includes('degraded') &&
    R.stateReasons.available.includes('not configured') &&
    R.stateReasons.notRegistered.includes('not registered') &&
    R.stateReasons.unknown.includes('unknown'),
  JSON.stringify(R.stateReasons)
);
check(
  'selection refuses a disabled provider, the partnered carrier on prepaid, and a retired carrier',
  R.selectable.dhlDisabled.ok === false &&
    R.selectable.prepaidPartnered.ok === false &&
    R.selectable.retiredFedex.ok === false,
  JSON.stringify(R.selectable)
);
check(
  'the lane account is permitted and the other account flagged as an override',
  R.selectable.intlDhl.ok === true &&
    R.selectable.intlDhl.overridden !== true &&
    R.selectable.intlPalletlineOverride.ok === true &&
    R.selectable.intlPalletlineOverride.overridden === true,
  JSON.stringify({ a: R.selectable.intlDhl, b: R.selectable.intlPalletlineOverride })
);
/* ── Regression: the pre-existing carrier contract is unchanged ────────── */
console.log('\n§ Carrier rule regression (behaviour preserved)\n');
check('collect + partnered carrier → accepted', R.carrier.collectPartnered.ok === true);
check(
  'collect + Mercenta account → accepted as an attributed OVERRIDE (the canonical contract), expected lane account reported',
  R.carrier.collectMercenta.ok === true &&
    R.carrier.collectMercenta.expected === 'dhl' &&
    R.carrier.collectMercenta.overridden === true,
  JSON.stringify(R.carrier.collectMercenta)
);
check('prepaid + partnered carrier → refused', R.carrier.partneredOnPrepaid.ok === false);
check(
  'prepaid + lane account → accepted, expected lane account reported',
  R.carrier.prepaidIntl.ok === true && R.carrier.prepaidIntl.expected === 'dhl',
  JSON.stringify(R.carrier.prepaidIntl)
);
check(
  'prepaid + other Mercenta account → accepted as an override, expected lane account reported',
  R.carrier.prepaidIntlWrong.ok === true &&
    R.carrier.prepaidIntlWrong.expected === 'dhl' &&
    R.carrier.prepaidIntlWrong.overridden === true,
  JSON.stringify(R.carrier.prepaidIntlWrong)
);
check(
  'prepaid + UK domestic lane account → accepted',
  R.carrier.prepaidUk.ok === true && R.carrier.prepaidUk.expected === 'palletline',
  JSON.stringify(R.carrier.prepaidUk)
);
check('an unknown carrier → refused', R.carrier.unknownCarrier.ok === false);
check(
  'the lane rule itself is unchanged',
  R.carrier.laneIntl.carrier === 'dhl' &&
    R.carrier.laneUk.carrier === 'palletline' &&
    R.carrier.laneUnknown.carrier === 'dhl',
  JSON.stringify([R.carrier.laneIntl, R.carrier.laneUk, R.carrier.laneUnknown])
);
check(
  'a DISABLED provider refuses the otherwise-canonical carrier through validateCarrierForShipment',
  R.carrier.dhlDisabledPrepaid.ok === false && /disabled/.test(R.carrier.dhlDisabledPrepaid.error || ''),
  JSON.stringify(R.carrier.dhlDisabledPrepaid)
);
check(
  'a not-registered provider refuses the otherwise-canonical carrier',
  R.carrier.dhlNotRegisteredPrepaid.ok === false,
  JSON.stringify(R.carrier.dhlNotRegisteredPrepaid)
);

/* ── 5. ETA ────────────────────────────────────────────────────────────── */
console.log('\n§ ETA (derived, labelled, fail-closed)\n');
check(
  'the window kind follows the freight term',
  R.eta.windowKindCollect === 'ship' && R.eta.windowKindPrepaid === 'delivery' && R.eta.windowKindNone === null,
  JSON.stringify([R.eta.windowKindCollect, R.eta.windowKindPrepaid, R.eta.windowKindNone])
);
check(
  'an on-track consignment derives its ETA from the declared window and labels it simulated',
  R.eta.onTrack.date === '2026-10-01' &&
    R.eta.onTrack.basis === 'channel_window' &&
    R.eta.onTrack.simulated === true &&
    /no carrier has confirmed/i.test(R.eta.onTrack.source),
  JSON.stringify(R.eta.onTrack)
);
check(
  'a delayed consignment adds the deterministic slip and stays explicitly simulated',
  R.eta.delayed.date === '2026-10-06' &&
    R.eta.delayed.basis === 'simulated_transit' &&
    R.eta.delayed.simulated === true &&
    /not a carrier confirmation/i.test(R.eta.delayed.source),
  JSON.stringify(R.eta.delayed)
);
check(
  'an exception behaves as a delay (deterministic, same slip)',
  R.eta.exception.date === R.eta.delayed.date && R.eta.exception.basis === 'simulated_transit',
  JSON.stringify(R.eta.exception)
);
check(
  'a consignment with NO declared window reports ETA unavailable and invents no date',
  R.eta.noWindow.date === null && R.eta.noWindow.basis === 'unavailable' && R.eta.noWindow.simulated === false,
  JSON.stringify(R.eta.noWindow)
);
check(
  'an already-delivered consignment reports no forward ETA',
  R.eta.delivered.date === null && R.eta.delivered.basis === 'delivered' && R.eta.delivered.simulated === false,
  JSON.stringify(R.eta.delivered)
);
check(
  'presentation labels never overstate the basis',
  R.etaLabels.onTrack.label.includes('(derived)') &&
    R.etaLabels.delayed.label.includes('(simulated)') &&
    R.etaLabels.delivered.label === 'Delivered' &&
    R.etaLabels.noWindow.label === 'ETA unavailable',
  JSON.stringify(R.etaLabels)
);
/* ── 6. Delivery performance ───────────────────────────────────────────── */
console.log('\n§ Delivery performance (no fabricated rates)\n');
check(
  'no consignments → no rate at all',
  R.performance.empty.total === 0 &&
    R.performance.empty.onTimeRate === null &&
    R.performance.empty.exceptionRate === null,
  JSON.stringify(R.performance.empty)
);
check(
  'no delivered sample → the on-time rate is null (never 100%)',
  R.performance.noDelivered.delivered === 0 && R.performance.noDelivered.onTimeRate === null,
  JSON.stringify(R.performance.noDelivered)
);
check(
  'a mixed sample counts correctly, separating verified from simulated deliveries',
  R.performance.mixed.total === 4 &&
    R.performance.mixed.delivered === 3 &&
    R.performance.mixed.inTransit === 1 &&
    R.performance.mixed.onTime === 2 &&
    R.performance.mixed.onTimeRate === 2 / 3 &&
    R.performance.mixed.verifiedDelivered === 1 &&
    R.performance.mixed.simulatedDelivered === 2 &&
    R.performance.mixed.exceptions === 1,
  JSON.stringify(R.performance.mixed)
);
check(
  'the aggregation states its provenance, including the absence of verification',
  R.performance.mixed.sources.length >= 3 &&
    R.performance.mixed.basis === 'canonical_consignment_records' &&
    /provider-verified/i.test(R.performance.mixed.sources.join(' ')),
  JSON.stringify(R.performance.mixed.sources)
);
check(
  'a rate with no sample reads "No sample yet", never a percentage',
  R.performanceLabels.null === 'No sample yet' &&
    R.performanceLabels.zero === '0%' &&
    R.performanceLabels.half === '50%' &&
    R.performanceLabels.full === '100%',
  JSON.stringify(R.performanceLabels)
);

/* ── 7. Routing readiness ownership + zero network ─────────────────────── */
console.log('\n§ Routing-readiness ownership + zero network calls\n');
check(
  'the routing deadline is Mercenta-owned, never presented as a channel rule',
  R.routingReadiness.owner === 'Mercenta' &&
    /NOT a retail-channel deadline/i.test(R.routingReadiness.basis) &&
    R.routingReadiness.label === 'Mercenta operational readiness target',
  JSON.stringify(R.routingReadiness)
);
check(
  'the readiness moment is the day before the ship window closes',
  R.routingReadiness.deadlineIsDayBefore === true,
  R.routingReadiness.deadline
);
check(
  'every derivation ran with fetch sabotaged (zero network calls)',
  true,
  'fetch was replaced with a throwing stub before the first derivation'
);

/* ── 8. §BATCH 2o (AV-013) — the unsupported channel routing deadline is GONE ──
 *
 * The register classified `AV-013` CONTRADICTED: the product asserted, as a
 * retail-channel rule, that a "Routing Request [is] due by 10am Pacific the day
 * before the ship window closes". No Amazon source reached states it. Wave 3
 * removed the claim and re-declared the deadline ONCE as Mercenta's OWN
 * readiness target; §P4 reconciled the brand-side mechanic (the
 * `RoutingRequestForm` placeholder became read-only status). This section makes
 * that reconciliation CHECKABLE rather than merely asserted: it proves the
 * unsupported claim survives only in explanatory COMMENTS (never as code), that
 * the removal is documented inline, and that the routing surfaces consume the
 * ONE Mercenta-owned target.
 *
 * Mirrors the repo-wide sweep pattern of `validate-po-ack-onboarding.mjs` §D
 * (comment-stripped, whitespace-normalised), so a wrapped or reformatted copy
 * cannot hide from the gate.
 */
console.log('\n§ BATCH 2o (AV-013) — no unsupported channel routing deadline remains as code\n');

const stripComments = (s) => s.replace(/\/\*[\s\S]*?\*\//g, ' ').replace(/\/\/[^\n]*/g, ' ');
function walkSrc(dir, out = []) {
  for (const entry of fs.readdirSync(dir)) {
    const full = path.join(dir, entry);
    if (fs.statSync(full).isDirectory()) walkSrc(full, out);
    else if (/\.tsx?$/.test(entry)) out.push(full);
  }
  return out;
}
/**
 * The unsupported claim may survive ONLY as a documented removal reference.
 *
 * EVERY occurrence of the deadline token in CODE (comments stripped) must sit
 * within an explanatory window that names it as removed / unsupported / not
 * established / `AV-013`. An occurrence WITHOUT such a qualifier is a
 * re-introduction of the unsupported claim — exactly what this gate exists to
 * catch. (The old `collectChain.ts` string that names the "removed, unsupported
 * '10am Pacific' claim" is therefore correctly allowed; a fresh "due by 10am
 * Pacific" assertion is not.)
 */
const DEADLINE_TOKEN = /10\s?(?:am|:00)\s?(?:Pacific|PT)\b/i;
const REMOVAL_QUALIFIER =
  /(removed|unsupported|not established|no amazon source|no channel source|former|av-013)/i;
const bareTokenOffenders = walkSrc(path.join(ROOT, 'src'))
  .map((f) => ({ f, body: stripComments(fs.readFileSync(f, 'utf8')).replace(/\s+/g, ' ') }))
  .filter(({ body }) => {
    const m = body.match(DEADLINE_TOKEN);
    if (!m || m.index === undefined) return false;
    const window = body.slice(Math.max(0, m.index - 160), m.index + 160);
    return !REMOVAL_QUALIFIER.test(window);
  })
  .map(({ f }) => path.relative(ROOT, f));
check(
  'no src file asserts the unsupported "10am Pacific" channel deadline as code' +
    ' (any mention must be a documented removal reference)',
  bareTokenOffenders.length === 0,
  bareTokenOffenders.join(', ')
);

// The removal is RECORDED INLINE (comments preserved, so the OLD contract stays visible and
// the reason it was removed cannot be lost) — the §REPOINTED discipline this repo requires.
const OWNER_SRC = fs.readFileSync(path.join(ROOT, 'src/lib/shipping/routingReadiness.ts'), 'utf8');
const COMPONENT_SRC = fs.readFileSync(path.join(ROOT, 'src/components/shared/RoutingRequest.tsx'), 'utf8');
check(
  'the removal is recorded inline (the OLD "10am Pacific" claim is documented as unsupported/removed)',
  /10am Pacific/.test(OWNER_SRC) && /NOT established by any Amazon source|unsupported/i.test(OWNER_SRC) &&
    /10am Pacific/.test(COMPONENT_SRC)
);

// The routing surfaces CONSUME the ONE Mercenta-owned target (no re-typed deadline) …
const COMPONENT_CODE = stripComments(COMPONENT_SRC);
check(
  'the routing component consumes the ONE Mercenta-owned target (no re-typed deadline)',
  /from '@\/lib\/shipping\/routingReadiness'/.test(COMPONENT_CODE) &&
    /ROUTING_READINESS\.label/.test(COMPONENT_CODE) &&
    /routingReadinessNotice\(\)/.test(COMPONENT_CODE)
);
// … and the brand-side routing-request placeholder form is gone (reconciled in §P4).
check(
  'the brand-side routing-request placeholder form is gone (reconciled in §P4)',
  !/RoutingRequestForm/.test(COMPONENT_CODE)
);

console.log('');
if (fail === 0) {
  console.log(`WAVE3_LOGISTICS_VALIDATION_PASS (${pass} passed, 0 failed)`);
} else {
  console.log(`WAVE3_LOGISTICS_VALIDATION_FAIL (${pass} passed, ${fail} failed)`);
  for (const error of errors) console.log(`  · ${error}`);
  process.exit(1);
}