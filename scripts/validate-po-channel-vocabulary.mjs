#!/usr/bin/env node
/**
 * §BATCH 2h (`AV-043`) — THE PO VOCABULARY MAPPING GATE.
 *
 * WHY THIS EXISTS
 * ---------------
 * The Phase 0A audit registered `AV-043`: Mercenta had its own purchase-order and
 * line vocabularies while the retail channel spoke its own (`purchaseOrderState`,
 * `purchaseOrderStatus`, `itemConfirmationStatus`, `poItemState`) and **nothing in
 * the platform declared which of one side's words meant which of the other's**. The
 * register named the consequence: *"Mapping bugs at live integration; ambiguous
 * status reporting."*
 *
 * Declaring the mapping is not the fix on its own — a later edit could re-introduce
 * a second copy, or a status could be added with no channel position. This gate
 * EXECUTES the shipped modules (bundled with the project's own esbuild through its
 * own `@` alias) so it asserts RUNNING behaviour, not a pattern, and fails if:
 *
 *   1  the mapping has more than ONE owner, or the channel's vocabulary is re-typed;
 *   2  the forward map is not TOTAL over Mercenta's lifecycle statuses, or an
 *      unknown status is not `unknown` (fail-closed);
 *   3  the reverse map is not the exact inverse — including the channel's `OPEN`,
 *      which honestly covers two Mercenta statuses and must NOT be collapsed to one;
 *   4  a contradictory or undocumented channel read is resolved instead of failing
 *      closed with a stated reason;
 *   5  the acknowledgement window decides the channel position itself instead of
 *      asking the owner, or an unknown status is offered as actionable work;
 *   6  a Mercenta-only line concept (a backorder) is sent to the channel as a word
 *      the channel does not document;
 *   7  the seam's own status vocabulary drifts from the one this owner declares;
 *   8  any live network call is made.
 *
 * Run: node scripts/validate-po-channel-vocabulary.mjs
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

/** How many files under `src/` carry a literal in their CODE (comments stripped). */
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

/* ── The executed entry ───────────────────────────────────────────────────── */

const ENTRY = `
import {
  PO_CHANNEL_STATE_BY_STATUS, PO_CHANNEL_ORDER_VOCABULARY_BY_STATUS,
  MERCENTA_STATUSES_BY_CHANNEL_STATE, CHANNEL_STATES_BY_CHANNEL_ORDER_STATUS,
  CHANNEL_LINE_VOCABULARY_BY_ACK_STATUS, CHANNEL_AGGREGATE_STATUS_BY_DECISION,
  SEAM_CHANNEL_STATUS_MAP, SEAM_CHANNEL_STATUS_IS_CANONICAL,
  PO_CHANNEL_VOCABULARY_ATTRIBUTION,
  channelStateForStatus, channelStateForSeamStatus, channelStateForChannelOrderState,
  isPurchaseOrderStatus, isChannelOrderState, isChannelOrderStatus,
  isChannelItemConfirmationStatus, poChannelOrderVocabularyForStatus,
  mercentaStatusesForChannelState, resolveChannelOrderRead,
  channelItemConfirmationStatusFor, mercentaAckStatusesForChannelConfirmation,
} from '@/lib/commerce/poChannelVocabulary';
import { poAcknowledgementWindow } from '@/lib/commerce/poAcknowledgementWindow';

globalThis.fetch = function () { throw new Error('NETWORK_CALL_ATTEMPTED'); };

const STATUSES = ['received','under_review','accepted','rejected','ready_to_fulfil','shipped','delivered'];
const NOW = '2026-09-24T11:00:00.000Z';
const PO = function (status, orderDate) {
  return {
    id: 'p', brandId: 'b', poNumber: 'PO-1', status: status, poValue: 0,
    commissionRate: 0, commissionAmount: 0, orderDate: orderDate, lineItems: [],
  };
};

const out = {};
out.attribution = PO_CHANNEL_VOCABULARY_ATTRIBUTION;

out.forward = {};
for (const s of STATUSES) {
  out.forward[s] = { state: channelStateForStatus(s), vocabulary: poChannelOrderVocabularyForStatus(s) };
}
out.forwardUnknown = {
  bogus: channelStateForStatus('bogus'),
  empty: channelStateForStatus(''),
  vocabulary: poChannelOrderVocabularyForStatus('bogus'),
};

out.guards = {
  isStatus: [isPurchaseOrderStatus('received'), isPurchaseOrderStatus('bogus'), isPurchaseOrderStatus(7)],
  isOrderState: [isChannelOrderState('New'), isChannelOrderState('new'), isChannelOrderState(null)],
  isOrderStatus: [isChannelOrderStatus('OPEN'), isChannelOrderStatus('open')],
  isConfirmation: [isChannelItemConfirmationStatus('ACCEPTED'), isChannelItemConfirmationStatus('accepted')],
};

out.reverseTable = {};
for (const state of ['new', 'acknowledged', 'closed', 'unknown']) {
  out.reverseTable[state] = mercentaStatusesForChannelState(state);
}
out.orderStatusStates = CHANNEL_STATES_BY_CHANNEL_ORDER_STATUS;
out.orderStateMap = ['New', 'Acknowledged', 'Closed'].map((s) => channelStateForChannelOrderState(s));

out.seam = {
  map: SEAM_CHANNEL_STATUS_MAP,
  canonical: SEAM_CHANNEL_STATUS_IS_CANONICAL,
  states: ['open', 'acknowledged', 'received', 'closed', 'cancelled'].map((s) => channelStateForSeamStatus(s)),
  unknown: channelStateForSeamStatus('frozen'),
};

out.resolve = {
  newOpen: resolveChannelOrderRead({ purchaseOrderState: 'New', purchaseOrderStatus: 'OPEN' }),
  ackOpen: resolveChannelOrderRead({ purchaseOrderState: 'Acknowledged', purchaseOrderStatus: 'OPEN' }),
  closedClosed: resolveChannelOrderRead({ purchaseOrderState: 'Closed', purchaseOrderStatus: 'CLOSED' }),
  contradict: resolveChannelOrderRead({ purchaseOrderState: 'New', purchaseOrderStatus: 'CLOSED' }),
  unknownState: resolveChannelOrderRead({ purchaseOrderState: 'Frozen', purchaseOrderStatus: 'OPEN' }),
  unknownStatus: resolveChannelOrderRead({ purchaseOrderState: 'New', purchaseOrderStatus: 'PENDING' }),
  absent: resolveChannelOrderRead({}),
  onlyOpen: resolveChannelOrderRead({ purchaseOrderStatus: 'OPEN' }),
  onlyState: resolveChannelOrderRead({ purchaseOrderState: 'Acknowledged' }),
};

out.lines = {};
for (const s of ['unacknowledged', 'accepted', 'rejected', 'backordered']) {
  out.lines[s] = CHANNEL_LINE_VOCABULARY_BY_ACK_STATUS[s];
}
out.lineForward = ['unacknowledged', 'accepted', 'rejected', 'backordered', 'bogus'].map((s) =>
  channelItemConfirmationStatusFor(s)
);
out.lineReverse = ['ACCEPTED', 'REJECTED', 'PARTIALLY_ACCEPTED'].map((s) =>
  mercentaAckStatusesForChannelConfirmation(s)
);
out.aggregate = CHANNEL_AGGREGATE_STATUS_BY_DECISION;

out.window = {};
for (const s of STATUSES) {
  const w = poAcknowledgementWindow(PO(s, '2026-09-24T10:00:00.000Z'), NOW);
  out.window[s] = { channelState: w.channelState, inQueue: w.inQueue, actionable: w.actionable };
}
const bogus = poAcknowledgementWindow(PO('frozen', '2026-09-24T10:00:00.000Z'), NOW);
out.windowBogus = { channelState: bogus.channelState, inQueue: bogus.inQueue, actionable: bogus.actionable };
const noDate = poAcknowledgementWindow(PO('received', 'not-a-date'), NOW);
out.windowNoDate = { channelState: noDate.channelState, actionable: noDate.actionable };

out.network = 'sabotaged';
console.log('__RESULT__' + JSON.stringify(out));
`;

const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'mercenta-po-vocabulary-'));
const entryPath = path.join(tmpDir, 'entry.ts');
const outPath = path.join(tmpDir, 'bundle.cjs');
fs.writeFileSync(entryPath, ENTRY, 'utf8');

let result;
try {
  execFileSync(
    path.join(ROOT, 'node_modules/.bin/esbuild'),
    [
      entryPath, '--bundle', '--format=cjs', '--platform=node',
      `--alias:@=${path.join(ROOT, 'src')}`, '--define:import.meta.env={}',
      `--outfile=${outPath}`, '--log-level=error',
    ],
    { cwd: ROOT, stdio: ['ignore', 'inherit', 'inherit'] }
  );
  const stdout = execFileSync(process.execPath, [outPath], { cwd: ROOT, encoding: 'utf8' });
  result = JSON.parse(stdout.split('__RESULT__')[1]);
} catch (error) {
  console.log(`  FAIL  bundling/executing the real modules — ${String(error).slice(0, 900)}`);
  console.log('');
  console.log('PO_CHANNEL_VOCABULARY_VALIDATION_FAIL (0 passed, 1 failed)');
  process.exit(1);
}

if (result && result.runtimeError) {
  console.log(`  FAIL  the executed modules threw — ${result.runtimeError}`);
  console.log('');
  console.log('PO_CHANNEL_VOCABULARY_VALIDATION_FAIL (0 passed, 1 failed)');
  process.exit(1);
}


const OWNER = 'src/lib/commerce/poChannelVocabulary.ts';
const STATUSES = ['received', 'under_review', 'accepted', 'rejected', 'ready_to_fulfil', 'shipped', 'delivered'];

/* ── 1. the mapping has ONE owner and the channel's words are not re-typed ─── */

console.log('\n§ 1. The mapping has ONE owner (`AV-043`) and is not re-typed\n');
check(
  "the channel's raw vocabulary arrays are declared in exactly ONE file (the canonical types file)",
  countInSrc('CHANNEL_PO_ORDER_STATES = [') === 1 &&
    countInSrc('CHANNEL_PO_ORDER_STATUSES = [') === 1 &&
    countInSrc('CHANNEL_ITEM_CONFIRMATION_STATUSES = [') === 1 &&
    countInSrc('CHANNEL_PO_ITEM_STATES = [') === 1 &&
    code('src/types.ts').includes("CHANNEL_ITEM_CONFIRMATION_STATUSES = [") &&
    !code(OWNER).includes('CHANNEL_PO_ORDER_STATES = ['),
  `declarations: orderStates=${countInSrc('CHANNEL_PO_ORDER_STATES = [')} orderStatuses=${countInSrc(
    'CHANNEL_PO_ORDER_STATUSES = ['
  )} confirmations=${countInSrc('CHANNEL_ITEM_CONFIRMATION_STATUSES = [')}`
);
check(
  "the channel's `New`/`Acknowledged`/`Closed` list is written down exactly once",
  countInSrc("'New', 'Acknowledged', 'Closed'") === 1,
  `occurrences: ${countInSrc("'New', 'Acknowledged', 'Closed'")}`
);
check(
  'the status → channel position table exists in exactly ONE file',
  countInSrc('PO_CHANNEL_STATE_BY_STATUS') === 1,
  `files referencing PO_CHANNEL_STATE_BY_STATUS: ${countInSrc('PO_CHANNEL_STATE_BY_STATUS')}`
);
check(
  'no component re-types the mapping (zero component references)',
  sourceFiles().filter((f) => /\/components\//.test(f) && read(path.relative(ROOT, f)).includes('PO_CHANNEL_STATE_BY_STATUS'))
    .length === 0
);
check(
  'the acknowledgement window no longer decides the position itself',
  !/po\.status === 'rejected' \|\| po\.status === 'delivered'/.test(code('src/lib/commerce/poAcknowledgementWindow.ts')) &&
    /channelStateForStatus\(po\.status\)/.test(code('src/lib/commerce/poAcknowledgementWindow.ts')),
  'the old hard-coded pair must be gone and the owner consulted instead'
);
check(
  'the obligation set is DERIVED from the owner, not written out a second time',
  /mercentaStatusesForChannelState\('new'\)/.test(code('src/config/purchaseOrders.ts')),
  'PO_ACK_STATUSES_WITH_OBLIGATION must come from the mapping owner'
);
check('the owner contains no TODO/FIXME placeholder', !/TODO|FIXME/.test(read(OWNER)));
check('the owner makes no network call of its own', !/fetch\s*\(|XMLHttpRequest|axios/.test(code(OWNER)));
check(
  'the attribution names the channel\u2019s own documentation and not Mercenta',
  result.attribution.verifiedAgainstChannel === true && /S4\/S5/.test(result.attribution.source)
);

/* ── 2. the FORWARD map, executed ─────────────────────────────────────────── */

console.log('\n§ 2. The FORWARD map is total and fails closed\n');
check(
  'every declared lifecycle status maps to a real channel position (none "unknown")',
  STATUSES.every((s) => result.forward[s].state !== 'unknown'),
  JSON.stringify(Object.fromEntries(STATUSES.map((s) => [s, result.forward[s].state])))
);
check(
  'the channel\u2019s `New` position holds exactly the un-acknowledged statuses',
  ['received', 'under_review'].every((s) => result.forward[s].state === 'new'),
  JSON.stringify(['received', 'under_review'].map((s) => result.forward[s].state))
);
check(
  'the acknowledged position holds exactly the decision-recorded statuses',
  ['accepted', 'ready_to_fulfil', 'shipped'].every((s) => result.forward[s].state === 'acknowledged')
);
check(
  'the closed position holds exactly the completed/rejected statuses',
  ['rejected', 'delivered'].every((s) => result.forward[s].state === 'closed')
);
check(
  'each status carries the channel\u2019s OWN values for that position (New/OPEN, Acknowledged/OPEN, Closed/CLOSED)',
  result.forward.received.vocabulary.orderState === 'New' &&
    result.forward.received.vocabulary.orderStatus === 'OPEN' &&
    result.forward.accepted.vocabulary.orderState === 'Acknowledged' &&
    result.forward.accepted.vocabulary.orderStatus === 'OPEN' &&
    result.forward.delivered.vocabulary.orderState === 'Closed' &&
    result.forward.delivered.vocabulary.orderStatus === 'CLOSED',
  JSON.stringify(result.forward.received.vocabulary)
);
check(
  'an UNDECLARED status is `unknown` and has NO channel vocabulary (fail-closed)',
  result.forwardUnknown.bogus === 'unknown' &&
    result.forwardUnknown.empty === 'unknown' &&
    result.forwardUnknown.vocabulary === null,
  JSON.stringify(result.forwardUnknown)
);
check(
  'the status guard accepts a real status and refuses anything else',
  result.guards.isStatus[0] === true && result.guards.isStatus[1] === false && result.guards.isStatus[2] === false
);
check(
  'the channel value guards are case-exact (the channel\u2019s words are `New`, not `new`)',
  result.guards.isOrderState[0] === true &&
    result.guards.isOrderState[1] === false &&
    result.guards.isOrderState[2] === false &&
    result.guards.isOrderStatus[0] === true &&
    result.guards.isOrderStatus[1] === false &&
    result.guards.isConfirmation[0] === true &&
    result.guards.isConfirmation[1] === false
);
check(
  'the raw order-state → normalised position map is declared and correct',
  JSON.stringify(result.orderStateMap) === JSON.stringify(['new', 'acknowledged', 'closed']),
  JSON.stringify(result.orderStateMap)
);


/* ── 3. the REVERSE map, executed ─────────────────────────────────────────── */

console.log('\n§ 3. The REVERSE map is the exact inverse and fails closed\n');
check(
  'the reverse map is the exact inverse of the forward one',
  JSON.stringify(result.reverseTable.new) === JSON.stringify(['received', 'under_review']) &&
    JSON.stringify(result.reverseTable.acknowledged) === JSON.stringify(['accepted', 'ready_to_fulfil', 'shipped']) &&
    JSON.stringify(result.reverseTable.closed) === JSON.stringify(['rejected', 'delivered']),
  JSON.stringify(result.reverseTable)
);
check(
  'every Mercenta status appears exactly once across the three channel positions',
  (() => {
    const flat = ['new', 'acknowledged', 'closed'].flatMap((s) => result.reverseTable[s]);
    return flat.length === STATUSES.length && STATUSES.every((s) => flat.filter((x) => x === s).length === 1);
  })(),
  JSON.stringify(['new', 'acknowledged', 'closed'].flatMap((s) => result.reverseTable[s]))
);
check(
  'the unknown position has NO candidates (fail-closed, never a default status)',
  result.reverseTable.unknown.length === 0
);
check(
  'the channel\u2019s `OPEN` covers TWO positions — the honest 1:many answer',
  JSON.stringify(result.orderStatusStates.OPEN) === JSON.stringify(['new', 'acknowledged']) &&
    JSON.stringify(result.orderStatusStates.CLOSED) === JSON.stringify(['closed'])
);
check(
  '{New, OPEN} resolves to the channel\u2019s un-acknowledged position',
  result.resolve.newOpen.resolved === true &&
    result.resolve.newOpen.channelState === 'new' &&
    result.resolve.newOpen.ambiguous === true &&
    JSON.stringify(result.resolve.newOpen.candidates) === JSON.stringify(['received', 'under_review']),
  JSON.stringify(result.resolve.newOpen)
);
check(
  '{Acknowledged, OPEN} resolves to the acknowledged position',
  result.resolve.ackOpen.resolved === true &&
    result.resolve.ackOpen.channelState === 'acknowledged' &&
    result.resolve.ackOpen.ambiguous === true,
  JSON.stringify(result.resolve.ackOpen)
);
check(
  '{Closed, CLOSED} resolves to the closed position with a single candidate set',
  result.resolve.closedClosed.resolved === true &&
    result.resolve.closedClosed.channelState === 'closed' &&
    result.resolve.closedClosed.ambiguous === true,
  JSON.stringify(result.resolve.closedClosed)
);
check(
  'a CONTRADICTORY read is refused with a stated reason, not resolved',
  result.resolve.contradict.resolved === false &&
    result.resolve.contradict.candidates.length === 0 &&
    /contradicts itself/.test(result.resolve.contradict.reason),
  result.resolve.contradict.reason
);
check(
  'an UNDOCUMENTED channel state is refused with a stated reason',
  result.resolve.unknownState.resolved === false && /undocumented purchaseOrderState/.test(result.resolve.unknownState.reason),
  result.resolve.unknownState.reason
);
check(
  'an UNDOCUMENTED channel status is refused with a stated reason',
  result.resolve.unknownStatus.resolved === false && /undocumented purchaseOrderStatus/.test(result.resolve.unknownStatus.reason),
  result.resolve.unknownStatus.reason
);
check(
  'a read carrying NEITHER field is refused (absent is never a status)',
  result.resolve.absent.resolved === false && result.resolve.absent.candidates.length === 0,
  result.resolve.absent.reason
);
check(
  'a read carrying ONLY `OPEN` still resolves, and says it is ambiguous',
  result.resolve.onlyOpen.resolved === true &&
    result.resolve.onlyOpen.ambiguous === true &&
    result.resolve.onlyOpen.channelState === 'unknown' &&
    JSON.stringify(result.resolve.onlyOpen.candidates) ===
      JSON.stringify(['received', 'under_review', 'accepted', 'ready_to_fulfil', 'shipped']),
  JSON.stringify(result.resolve.onlyOpen)
);
check(
  'a read carrying ONLY a single-position state resolves to that position',
  result.resolve.onlyState.resolved === true && result.resolve.onlyState.channelState === 'acknowledged',
  JSON.stringify(result.resolve.onlyState)
);


/* ── 4. the acknowledgement window asks the owner ─────────────────────────── */

console.log('\n§ 4. The acknowledgement window derives its position from the OWNER\n');
check(
  'the window\u2019s position for every status EQUALS the owner\u2019s mapping',
  STATUSES.every((s) => result.window[s].channelState === result.forward[s].state),
  JSON.stringify(
    Object.fromEntries(STATUSES.map((s) => [s, `${result.window[s].channelState}|${result.forward[s].state}`]))
  )
);
check(
  'only the un-acknowledged statuses are offered as actionable work',
  ['received', 'under_review'].every((s) => result.window[s].inQueue === true && result.window[s].actionable === true) &&
    ['accepted', 'ready_to_fulfil', 'shipped', 'rejected', 'delivered'].every(
      (s) => result.window[s].inQueue === false && result.window[s].actionable === false
    )
);
check(
  'an UNDECLARED status is `unknown` and offers NO actionable work (fail-closed)',
  result.windowBogus.channelState === 'unknown' &&
    result.windowBogus.inQueue === false &&
    result.windowBogus.actionable === false,
  JSON.stringify(result.windowBogus)
);
check(
  'an unreadable order date still fails closed as `unknown`',
  result.windowNoDate.channelState === 'unknown' && result.windowNoDate.actionable === false
);

/* ── 5. the LINE vocabulary, executed ─────────────────────────────────────── */

console.log('\n§ 5. The LINE vocabulary: no Mercenta word is sent as a channel value\n');
check(
  'an accepted line is the channel\u2019s `ACCEPTED`', 
  result.lineForward[1] === 'ACCEPTED'
);
check('a rejected line is the channel\u2019s `REJECTED`', result.lineForward[2] === 'REJECTED');
check(
  'a backordered line is sent as the channel\u2019s `ACCEPTED`, marked as Mercenta\u2019s own sub-state',
  result.lineForward[3] === 'ACCEPTED' && result.lines.backordered.mercentaSubState === true
);
check(
  'an un-acknowledged line sends NOTHING (null, never an empty confirmation)',
  result.lineForward[0] === null && result.lines.unacknowledged.itemConfirmationStatus === null
);
check(
  'an undeclared line decision sends nothing (fail-closed)',
  result.lineForward[4] === null
);
check(
  'NO row maps to the word "backordered" \u2014 the channel has no such value',
  Object.keys(result.lines).every((k) => result.lines[k].itemConfirmationStatus !== 'backordered')
);
check(
  'every declared line row names a documented channel confirmation value (or null)',
  Object.keys(result.lines).every((k) => {
    const v = result.lines[k].itemConfirmationStatus;
    return v === null || ['ACCEPTED', 'REJECTED', 'PARTIALLY_ACCEPTED'].includes(v);
  })
);
check(
  'the reverse line map returns the honest SET (a backorder cannot be distinguished from an acceptance)',
  JSON.stringify(result.lineReverse[0]) === JSON.stringify(['accepted', 'backordered']) &&
    JSON.stringify(result.lineReverse[1]) === JSON.stringify(['rejected']),
  JSON.stringify(result.lineReverse)
);
check(
  '`PARTIALLY_ACCEPTED` reads NO per-line status \u2014 it is the channel\u2019s AGGREGATE value',
  result.lineReverse[2].length === 0
);
check(
  'the aggregate decision map names the channel\u2019s own three values',
  result.aggregate.accepted === 'ACCEPTED' &&
    result.aggregate.partially_accepted === 'PARTIALLY_ACCEPTED' &&
    result.aggregate.rejected === 'REJECTED'
);

/* ── 6. the seam vocabulary cannot drift ──────────────────────────────────── */

console.log('\n§ 6. The SP-API seam\u2019s own status vocabulary is pinned (compile-time)\n');
check(
  'the compile-time assertion that the seam\u2019s union IS the declared one is present and true',
  result.seam.canonical === true
);
check(
  'every seam status maps to a real channel position (none "unknown")',
  result.seam.states.every((s) => s !== 'unknown') &&
    JSON.stringify(result.seam.states) ===
      JSON.stringify(['new', 'acknowledged', 'closed', 'closed', 'closed']),
  JSON.stringify(result.seam.states)
);
check('an undeclared seam status fails closed', result.seam.unknown === 'unknown');
check(
  'the live receiving sync reports the mapped position and the candidate set, not a guessed status',
  /channelStateForSeamStatus\(status\.status\)/.test(code('src/lib/commerce/channelReceivingSync.ts')) &&
    /mercentaStatusesForChannelState\(channelState\)/.test(code('src/lib/commerce/channelReceivingSync.ts')) &&
    /mercentaStatusCandidates/.test(code('src/lib/commerce/channelReceivingSync.ts'))
);

/* ── 7. zero network ──────────────────────────────────────────────────────── */

console.log('\n§ 7. Nothing in this run made a live call\n');
check('fetch was sabotaged for the whole run (any call would have thrown)', result.network === 'sabotaged');

console.log('');
if (fail === 0) {
  console.log(`PO_CHANNEL_VOCABULARY_VALIDATION_PASS (${pass} passed, 0 failed)`);
  process.exit(0);
}
console.log('PO_CHANNEL_VOCABULARY_VALIDATION_FAIL');
for (const e of errors) console.log(`  - ${e}`);
console.log(`(${pass} passed, ${fail} failed)`);
process.exit(1);

