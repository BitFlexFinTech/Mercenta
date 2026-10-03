#!/usr/bin/env node
/**
 * §BATCH 2m (`AV-014`) — THE CHANNEL PICKUP LEAD-TIME ENFORCEMENT GATE.
 *
 * WHY THIS EXISTS
 * ---------------
 * The Phase 0A audit registered `AV-014`: the channel documents that a collect
 * vendor's `requestedPickUp` must be *"a date at least two business days after the
 * current date"*. From P6 the platform DERIVED that date from the owner
 * (`src/lib/shipping/collectChain.ts`) and SURFACED it — but a caller-supplied
 * value was never REFUSED, so a shipment request could be raised EARLIER than the
 * channel allows and nothing stopped it. The fix is the fail-closed validator
 * (`validateRequestedPickUp`) plus its enforcement at the seam boundary
 * (`src/lib/shipping/channelShipmentOperations.ts → raiseChannelShipmentRequest`).
 *
 * This gate EXECUTES the shipped modules (bundled with the project's own esbuild
 * through its own `@` alias, with `fetch` sabotaged) so it asserts RUNNING
 * behaviour, not a pattern, and fails if:
 *
 *   1  the lead-time owner is declared anywhere but ONE place;
 *   2  a valid `requestedPickUp` (== the earliest date, or later) is not ACCEPTED;
 *   3  a too-early date, a missing date, an unreadable date or an invalid calendar
 *      date is not REFUSED with its stated reason (FAIL CLOSED);
 *   4  the boundary SUBMITS a channel request when the lead time is violated, or
 *      makes ANY channel call before refusing;
 *   5  the lead-time rule is (wrongly) applied to a PREPAID lane;
 *   6  a surface re-implements the verdict instead of consuming the ONE owner;
 *   7  any live network call is made.
 *
 * Run: node scripts/validate-pickup-lead-time.mjs
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
  PICKUP_LEAD_TIME, earliestRequestedPickUp, validateRequestedPickUp, pickupLeadTimeVerdict,
} from '@/lib/shipping/collectChain';
import { raiseChannelShipmentRequest } from '@/lib/shipping/channelShipmentOperations';

globalThis.fetch = function () { throw new Error('NETWORK_CALL_ATTEMPTED'); };

const out = {};
out.leadTime = PICKUP_LEAD_TIME;

/* A fixed Monday so the derivation is deterministic in the gate. */
const FROM = new Date('2026-10-05T09:00:00.000Z');
out.from = FROM.toISOString();
out.earliest = earliestRequestedPickUp(FROM);
/* The day BEFORE the earliest — always too early for this FROM. */
const beforeMs = Date.parse(out.earliest + 'T00:00:00Z') - 86400000;
const dayBefore = new Date(beforeMs).toISOString().slice(0, 10);

out.check = {
  validEarliest: validateRequestedPickUp(out.earliest, FROM),
  validLater: validateRequestedPickUp('2026-12-01', FROM),
  tooEarly: validateRequestedPickUp(dayBefore, FROM),
  ancient: validateRequestedPickUp('2000-01-01', FROM),
  missing: validateRequestedPickUp(undefined, FROM),
  blank: validateRequestedPickUp('   ', FROM),
  unreadable: validateRequestedPickUp('next-tuesday', FROM),
  impossibleDay: validateRequestedPickUp('2026-02-31', FROM),
};
out.dayBefore = dayBefore;

out.verdict = {
  none: pickupLeadTimeVerdict(null, FROM),
  valid: pickupLeadTimeVerdict(out.earliest, FROM),
  early: pickupLeadTimeVerdict(dayBefore, FROM),
};

/* ── The boundary: refusals make NO channel call; a valid request does. ─────── */
let calls = 0;
const reader = {
  submitShipmentRequest: async () => { calls += 1; return { ok: true, shipmentRequestId: 'SIM-REQ-1', status: 'carrier_assignment_pending', simulated: true }; },
  getShipmentDetails: async () => ({ ok: false, error: 'NOT_USED' }),
  submitShipmentConfirmations: async () => ({ ok: false, error: 'NOT_USED' }),
};
const single = [{ poNumber: 'MOCK-PO-1', brandId: 'brand-x' }];

const before = calls;
out.boundary = {};
out.boundary.tooEarly = await raiseChannelShipmentRequest({ reader, purchaseOrders: single, freightTerm: 'collect', shipToPartyId: 'FC', requestedPickUp: '2000-01-01' });
out.boundary.tooEarlyCalls = calls - before;
out.boundary.missing = await raiseChannelShipmentRequest({ reader, purchaseOrders: single, freightTerm: 'collect', shipToPartyId: 'FC' });
out.boundary.missingCalls = calls - before;
out.boundary.unreadable = await raiseChannelShipmentRequest({ reader, purchaseOrders: single, freightTerm: 'collect', shipToPartyId: 'FC', requestedPickUp: 'nope' });
out.boundary.unreadableCalls = calls - before;
out.boundary.valid = await raiseChannelShipmentRequest({ reader, purchaseOrders: single, freightTerm: 'collect', shipToPartyId: 'FC', requestedPickUp: earliestRequestedPickUp() });
out.boundary.validCalls = calls - before;
out.boundary.prepaidNoPickup = await raiseChannelShipmentRequest({ reader, purchaseOrders: single, freightTerm: 'prepaid', shipToPartyId: 'FC' });

out.network = 'sabotaged';
console.log('__RESULT__' + JSON.stringify(out));
`;

const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'mercenta-pickup-lead-'));
const entryPath = path.join(tmpDir, 'entry.ts');
const outPath = path.join(tmpDir, 'bundle.mjs');
fs.writeFileSync(entryPath, ENTRY, 'utf8');

let result;
try {
  execFileSync(
    path.join(ROOT, 'node_modules/.bin/esbuild'),
    [
      entryPath, '--bundle', '--format=esm', '--platform=node',
      `--alias:@=${path.join(ROOT, 'src')}`, `--define:import.meta.env={}`,
      `--outfile=${outPath}`, '--log-level=error',
    ],
    { cwd: ROOT, stdio: ['ignore', 'inherit', 'inherit'] }
  );
  const stdout = execFileSync(process.execPath, [outPath], { cwd: ROOT, encoding: 'utf8' });
  result = JSON.parse(stdout.split('__RESULT__')[1]);
} catch (error) {
  console.log(`  FAIL  bundling/executing the real modules — ${String(error).slice(0, 900)}`);
  console.log('');
  console.log('PICKUP_LEAD_TIME_VALIDATION_FAIL (0 passed, 1 failed)');
  process.exit(1);
}

const OWNER = 'src/lib/shipping/collectChain.ts';
const SURFACE = 'src/components/admin/ChannelOperationsPanel.tsx';
const BOUNDARY = 'src/lib/shipping/channelShipmentOperations.ts';

/* ── 1. one owner ────────────────────────────────────────────────────────────── */

console.log('\n§ 1. The lead-time rule has ONE owner (`AV-014`)\n');
check(
  'the documented lead time is two business days, attributed to the retail channel',
  result.leadTime.businessDays === 2 && result.leadTime.owner === 'retail channel',
  JSON.stringify(result.leadTime)
);
check(
  'the lead-time constant is declared in exactly ONE file',
  countInSrc('PICKUP_LEAD_TIME = {') === 1,
  `occurrences: ${countInSrc('PICKUP_LEAD_TIME = {')}`
);
check(
  'the enforcement function is declared in exactly ONE file',
  countInSrc('export function validateRequestedPickUp(') === 1,
  `occurrences: ${countInSrc('export function validateRequestedPickUp(')}`
);
check('the owner contains no TODO/FIXME placeholder', !/TODO|FIXME/.test(read(OWNER)));
check('the owner makes no network call of its own', !/fetch\s*\(|XMLHttpRequest|axios/.test(code(OWNER)));

/* ── 2. a valid date is accepted ─────────────────────────────────────────────── */

console.log('\n§ 2. A valid `requestedPickUp` is accepted\n');
check(
  'the earliest permitted date is accepted',
  result.check.validEarliest.ok === true && result.check.validEarliest.requestedPickUp === result.earliest,
  JSON.stringify(result.check.validEarliest)
);
check('a later date is accepted', result.check.validLater.ok === true);

/* ── 3. fail closed ──────────────────────────────────────────────────────────── */

console.log('\n§ 3. A bad `requestedPickUp` is REFUSED with its stated reason\n');
check(
  'a date BEFORE the earliest is refused as TOO_EARLY',
  result.check.tooEarly.ok === false && /REQUESTED_PICKUP_TOO_EARLY/.test(result.check.tooEarly.error),
  result.check.tooEarly.error
);
check(
  'the refusal names the two-business-day rule and the earliest date',
  /(two|2) business days after the current date/i.test(result.check.tooEarly.error) &&
    result.check.tooEarly.error.includes(result.earliest),
  result.check.tooEarly.error
);
check(
  'an ancient date is refused',
  result.check.ancient.ok === false && /REQUESTED_PICKUP_TOO_EARLY/.test(result.check.ancient.error)
);
check(
  'a MISSING date is refused as MISSING (fail closed)',
  result.check.missing.ok === false && /REQUESTED_PICKUP_MISSING/.test(result.check.missing.error),
  result.check.missing.error
);
check('a BLANK date is refused', result.check.blank.ok === false && /REQUESTED_PICKUP_MISSING/.test(result.check.blank.error));
check(
  'an unreadable value is refused as UNREADABLE',
  result.check.unreadable.ok === false && /REQUESTED_PICKUP_UNREADABLE/.test(result.check.unreadable.error),
  result.check.unreadable.error
);
check(
  'an impossible calendar day (2026-02-31) is refused as UNREADABLE',
  result.check.impossibleDay.ok === false && /REQUESTED_PICKUP_UNREADABLE/.test(result.check.impossibleDay.error),
  result.check.impossibleDay.error
);

/* ── 4. the boundary refuses BEFORE any channel call ─────────────────────────── */

console.log('\n§ 4. The boundary refuses and makes NO channel call\n');
check(
  'a too-early request is refused at the boundary',
  result.boundary.tooEarly.ok === false && /^SHIPMENT_REQUEST_REFUSED/.test(result.boundary.tooEarly.refusal ?? ''),
  result.boundary.tooEarly.refusal
);
check('the too-early refusal made NO channel call', result.boundary.tooEarlyCalls === 0, String(result.boundary.tooEarlyCalls));
check(
  'a missing date is refused at the boundary, with no channel call',
  result.boundary.missing.ok === false && /REQUESTED_PICKUP_MISSING/.test(result.boundary.missing.refusal ?? '') && result.boundary.missingCalls === 0
);
check(
  'an unreadable date is refused at the boundary, with no channel call',
  result.boundary.unreadable.ok === false && /REQUESTED_PICKUP_UNREADABLE/.test(result.boundary.unreadable.refusal ?? '') && result.boundary.unreadableCalls === 0
);
check(
  'a VALID collect request IS submitted to the channel',
  result.boundary.valid.ok === true && result.boundary.validCalls >= 1,
  JSON.stringify({ ok: result.boundary.valid.ok, calls: result.boundary.validCalls })
);

/* ── 5. the rule is COLLECT-only ─────────────────────────────────────────────── */

console.log('\n§ 5. The lead-time rule applies to the Freight Collect lane only\n');
check(
  'a PREPAID request with no pickup date is NOT refused by the lead-time rule',
  result.boundary.prepaidNoPickup.ok === true,
  result.boundary.prepaidNoPickup.refusal
);

/* ── 6. the surface consumes the ONE owner ───────────────────────────────────── */

console.log('\n§ 6. The console consumes the ONE owner (no re-implementation)\n');
check(
  'the console uses the lead-time verdict from the owner',
  /pickupLeadTimeVerdict\(/.test(code(SURFACE))
);
check(
  'the enforcement lives in the boundary, not the surface',
  /validateRequestedPickUp\(input\.requestedPickUp\)/.test(code(BOUNDARY))
);
check(
  'no component re-types the lead-time vocabulary',
  sourceFiles().filter((f) => /\/components\//.test(f) && read(path.relative(ROOT, f)).includes('PICKUP_LEAD_TIME = {')).length === 0
);

/* ── 7. no live call ─────────────────────────────────────────────────────────── */

console.log('\n§ 7. The executed modules made no network call\n');
check('the executed entry ran with fetch sabotaged', result.network === 'sabotaged');

/* ── summary ─────────────────────────────────────────────────────────────────── */

console.log('');
if (fail === 0) {
  console.log(`PICKUP_LEAD_TIME_VALIDATION_PASS (${pass} passed, 0 failed)`);
  process.exit(0);
} else {
  console.log(`PICKUP_LEAD_TIME_VALIDATION_FAIL (${pass} passed, ${fail} failed)`);
  for (const e of errors) console.log(`  - ${e}`);
  process.exit(1);
}

