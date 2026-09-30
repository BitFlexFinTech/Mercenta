#!/usr/bin/env node
/**
 * §BATCH 2i (`AV-045`) — THE DELIVERY-APPOINTMENT GATE.
 *
 * WHY THIS EXISTS
 * ---------------
 * The Phase 0A audit registered `AV-045`: *"delivery appointments: add the
 * appointment concept"*. Inbound delivery to the retail channel is
 * appointment-based (`S15`) and the channel documents one hard rule about it —
 * the carrier-requested delivery date must fall within the purchase order's
 * delivery window. Mercenta modelled none of it.
 *
 * Declaring the concept is not the fix on its own — a later edit could add a
 * second copy of the vocabulary, drop fail-closed resolution, or let a requested
 * date pass a window it is outside. This gate EXECUTES the shipped module
 * (bundled with the project's own esbuild through its own `@` alias, with `fetch`
 * sabotaged) so it asserts RUNNING behaviour, not a pattern, and fails if:
 *
 *   1  the vocabulary has more than ONE owner, or a component re-types a state;
 *   2  the behaviour table is not TOTAL over the channel's seven states;
 *   3  an undocumented or absent appointment state is not `unknown` (fail-closed);
 *   4  the window rule passes a date outside the window, or "passes" one it
 *      cannot evaluate (no window declared, an undocumented/impossible date);
 *   5  the derivation invents an appointment, claims a channel confirmation, or
 *      fails to reflect an arrival/a recorded delay;
 *   6  the data layer or the brand surface re-implements the concept instead of
 *      consuming the ONE owner;
 *   7  any live network call is made.
 *
 * Run: node scripts/validate-delivery-appointment.mjs
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
  APPOINTMENT_STATE_BEHAVIOUR, CHANNEL_FPY_THRESHOLD_DOCUMENTED, CHANNEL_DEFECT_RATE_DEFINITION,
  DELIVERY_APPOINTMENT_ATTRIBUTION, isChannelAppointmentState, resolveChannelAppointmentState,
  validateAppointmentWithinDeliveryWindow, deriveDeliveryAppointment, appointmentPresentation,
} from '@/lib/shipping/deliveryAppointment';
import { CHANNEL_APPOINTMENT_STATES } from '@/types';

globalThis.fetch = function () { throw new Error('NETWORK_CALL_ATTEMPTED'); };

const STATES = ['Pending','Scheduled','Arrived','Deleted','Cancelled','Defect','Closed'];
const WIN = { start: '2026-10-01', end: '2026-10-07' };

const out = {};
out.vocabulary = CHANNEL_APPOINTMENT_STATES;
out.attribution = DELIVERY_APPOINTMENT_ATTRIBUTION;
out.fpyDocumented = CHANNEL_FPY_THRESHOLD_DOCUMENTED;
out.defectDefinition = CHANNEL_DEFECT_RATE_DEFINITION;

out.behaviour = {};
for (const s of STATES) {
  const b = APPOINTMENT_STATE_BEHAVIOUR[s];
  out.behaviour[s] = b
    ? { label: b.label, live: b.live, actionable: b.actionable, terminal: b.terminal, milestone: b.mercentaMilestone, meaning: b.meaning }
    : null;
}

out.guards = {
  valid: isChannelAppointmentState('Scheduled'),
  lowercase: isChannelAppointmentState('scheduled'),
  number: isChannelAppointmentState(7),
  nullValue: isChannelAppointmentState(null),
};

out.resolve = {
  scheduled: resolveChannelAppointmentState('Scheduled'),
  bogus: resolveChannelAppointmentState('Frozen'),
  absent: resolveChannelAppointmentState(undefined),
  empty: resolveChannelAppointmentState(''),
};

out.window = {
  inside: validateAppointmentWithinDeliveryWindow({ carrierRequestedDeliveryDate: '2026-10-05', deliveryWindowStart: WIN.start, deliveryWindowEnd: WIN.end }),
  onStart: validateAppointmentWithinDeliveryWindow({ carrierRequestedDeliveryDate: WIN.start, deliveryWindowStart: WIN.start, deliveryWindowEnd: WIN.end }),
  onEnd: validateAppointmentWithinDeliveryWindow({ carrierRequestedDeliveryDate: WIN.end, deliveryWindowStart: WIN.start, deliveryWindowEnd: WIN.end }),
  before: validateAppointmentWithinDeliveryWindow({ carrierRequestedDeliveryDate: '2026-09-30', deliveryWindowStart: WIN.start, deliveryWindowEnd: WIN.end }),
  after: validateAppointmentWithinDeliveryWindow({ carrierRequestedDeliveryDate: '2026-10-08', deliveryWindowStart: WIN.start, deliveryWindowEnd: WIN.end }),
  noWindow: validateAppointmentWithinDeliveryWindow({ carrierRequestedDeliveryDate: '2026-10-05', deliveryWindowStart: null, deliveryWindowEnd: null }),
  noDate: validateAppointmentWithinDeliveryWindow({ carrierRequestedDeliveryDate: null, deliveryWindowStart: WIN.start, deliveryWindowEnd: WIN.end }),
  malformed: validateAppointmentWithinDeliveryWindow({ carrierRequestedDeliveryDate: '05/10/2026', deliveryWindowStart: WIN.start, deliveryWindowEnd: WIN.end }),
  impossible: validateAppointmentWithinDeliveryWindow({ carrierRequestedDeliveryDate: '2026-02-31', deliveryWindowStart: '2026-02-01', deliveryWindowEnd: '2026-03-01' }),
  openStart: validateAppointmentWithinDeliveryWindow({ carrierRequestedDeliveryDate: '2026-10-05', deliveryWindowStart: WIN.start, deliveryWindowEnd: null }),
};

out.derive = {
  arrived: deriveDeliveryAppointment({ milestone: 'destination_fc', deliveryWindowStart: WIN.start, deliveryWindowEnd: WIN.end }),
  live: deriveDeliveryAppointment({ milestone: 'live_amazon', deliveryWindowStart: WIN.start, deliveryWindowEnd: WIN.end }),
  delayed: deriveDeliveryAppointment({ milestone: 'sea_transit', delayed: true, deliveryWindowStart: WIN.start, deliveryWindowEnd: WIN.end }),
  exception: deriveDeliveryAppointment({ milestone: 'factory_intake', exception: true, deliveryWindowStart: WIN.start, deliveryWindowEnd: WIN.end }),
  scheduled: deriveDeliveryAppointment({ milestone: 'sea_transit', deliveryWindowStart: WIN.start, deliveryWindowEnd: WIN.end }),
  noWindow: deriveDeliveryAppointment({ milestone: 'bak_depot' }),
  unknownMilestone: deriveDeliveryAppointment({ milestone: 'frozen' }),
};

out.presentation = {
  scheduled: appointmentPresentation(out.derive.scheduled),
  arrived: appointmentPresentation(out.derive.arrived),
  delayed: appointmentPresentation(out.derive.delayed),
  noWindow: appointmentPresentation(out.derive.noWindow),
  unknown: appointmentPresentation(out.derive.unknownMilestone),
};

out.network = 'sabotaged';
console.log('__RESULT__' + JSON.stringify(out));
`;

const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'mercenta-appointment-'));
const entryPath = path.join(tmpDir, 'entry.ts');
const outPath = path.join(tmpDir, 'bundle.cjs');
fs.writeFileSync(entryPath, ENTRY, 'utf8');

let result;
try {
  execFileSync(
    path.join(ROOT, 'node_modules/.bin/esbuild'),
    [
      entryPath, '--bundle', '--format=cjs', '--platform=node',
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
  console.log('DELIVERY_APPOINTMENT_VALIDATION_FAIL (0 passed, 1 failed)');
  process.exit(1);
}

const OWNER = 'src/lib/shipping/deliveryAppointment.ts';
const STATES = ['Pending', 'Scheduled', 'Arrived', 'Deleted', 'Cancelled', 'Defect', 'Closed'];

/* ── 1. one owner, one vocabulary ─────────────────────────────────────────── */

console.log('\n§ 1. The appointment concept has ONE owner (`AV-045`) and is not re-typed\n');
check(
  'the channel’s appointment vocabulary is exactly the seven documented states',
  JSON.stringify(result.vocabulary) === JSON.stringify(STATES),
  JSON.stringify(result.vocabulary)
);
check(
  'the vocabulary array is declared in exactly ONE file (the canonical types file)',
  countInSrc('CHANNEL_APPOINTMENT_STATES: readonly') === 1,
  `occurrences: ${countInSrc('CHANNEL_APPOINTMENT_STATES: readonly')}`
);
check(
  'the behaviour table exists in exactly ONE file',
  countInSrc('APPOINTMENT_STATE_BEHAVIOUR') === 1,
  `files referencing APPOINTMENT_STATE_BEHAVIOUR: ${countInSrc('APPOINTMENT_STATE_BEHAVIOUR')}`
);
check(
  'no component re-types the behaviour table (zero component references)',
  sourceFiles().filter((f) => /\/components\//.test(f) && read(path.relative(ROOT, f)).includes('APPOINTMENT_STATE_BEHAVIOUR')).length === 0
);
check('the owner contains no TODO/FIXME placeholder', !/TODO|FIXME/.test(read(OWNER)));
check('the owner makes no network call of its own', !/fetch\s*\(|XMLHttpRequest|axios/.test(code(OWNER)));
check(
  'the attribution names the channel’s own documentation and not Mercenta',
  result.attribution.verifiedAgainstChannel === true && /S15/.test(result.attribution.source)
);
check(
  'the undocumented FPY eligibility threshold is recorded as NOT modelled (never invented)',
  result.fpyDocumented === false
);
check(
  'the channel’s defect-rate definition is recorded verbatim-ish (the 24-hour rule)',
  /within 24 hours/i.test(result.defectDefinition)
);

/* ── 2. the behaviour table is TOTAL and says what Mercenta must do ────────── */

console.log('\n§ 2. Every documented state carries a declared behaviour\n');
check(
  'every one of the seven states has a behaviour (none missing, none empty)',
  STATES.every((s) => result.behaviour[s] && result.behaviour[s].label && result.behaviour[s].meaning),
  JSON.stringify(Object.fromEntries(STATES.map((s) => [s, Boolean(result.behaviour[s])])))
);
check(
  'the live states are exactly Pending / Scheduled / Arrived',
  STATES.filter((s) => result.behaviour[s].live).join(',') === 'Pending,Scheduled,Arrived'
);
check(
  'the actionable states are exactly Deleted / Cancelled / Defect',
  STATES.filter((s) => result.behaviour[s].actionable).join(',') === 'Deleted,Cancelled,Defect'
);
check(
  'exactly one state is terminal (Closed)',
  STATES.filter((s) => result.behaviour[s].terminal).join(',') === 'Closed'
);
check(
  'only Arrived and Closed imply a Mercenta milestone (destination_fc); the rest claim none',
  STATES.filter((s) => result.behaviour[s].milestone === 'destination_fc').join(',') === 'Arrived,Closed' &&
    STATES.filter((s) => result.behaviour[s].milestone !== null).length === 2
);

/* ── 3. resolution fails closed ───────────────────────────────────────────── */

console.log('\n§ 3. An undocumented or absent state is `unknown` — never defaulted\n');
check(
  'a documented value resolves to itself and is recognised',
  result.resolve.scheduled.state === 'Scheduled' && result.resolve.scheduled.recognised === true
);
check(
  'an undocumented value ("Frozen") resolves to unknown and names it',
  result.resolve.bogus.state === 'unknown' &&
    result.resolve.bogus.recognised === false &&
    result.resolve.bogus.reason.includes('Frozen')
);
check(
  'an absent value resolves to unknown with a stated reason',
  result.resolve.absent.state === 'unknown' && result.resolve.absent.reason.length > 0
);
check('an empty value resolves to unknown', result.resolve.empty.state === 'unknown');
check(
  'the type guard accepts only exact documented values',
  result.guards.valid === true &&
    result.guards.lowercase === false &&
    result.guards.number === false &&
    result.guards.nullValue === false
);
check(
  'resolution does not depend on the type guard alone — the behaviour lookup fails closed',
  /const behaviour = APPOINTMENT_STATE_BEHAVIOUR\[raw\]/.test(code(OWNER)) && /if \(!behaviour\) \{/.test(code(OWNER)),
  'a recognition bug must resolve to unknown, never throw on the read path'
);

/* ── 4. the window rule — never assumed compliant ─────────────────────────── */

console.log('\n§ 4. The carrier-requested delivery date must fall WITHIN the PO delivery window\n');
check(
  'a date inside the window passes as within-window',
  result.window.inside.ok === true && result.window.inside.code === 'within-window'
);
check(
  'the window bounds themselves are inside (inclusive)',
  result.window.onStart.ok === true && result.window.onEnd.ok === true
);
check(
  'a date BEFORE the window is refused as before-window',
  result.window.before.ok === false && result.window.before.code === 'before-window'
);
check(
  'a date AFTER the window is refused as after-window',
  result.window.after.ok === false && result.window.after.code === 'after-window'
);
check(
  'no declared delivery window refuses as no-delivery-window (a ship window is not substituted)',
  result.window.noWindow.ok === false && result.window.noWindow.code === 'no-delivery-window'
);
check(
  'a missing requested date refuses as undocumented-date (compliance cannot be established)',
  result.window.noDate.ok === false && result.window.noDate.code === 'undocumented-date'
);
check(
  'a malformed date (05/10/2026) refuses as undocumented-date',
  result.window.malformed.ok === false && result.window.malformed.code === 'undocumented-date'
);
check(
  'an impossible date (2026-02-31) refuses as undocumented-date',
  result.window.impossible.ok === false && result.window.impossible.code === 'undocumented-date'
);
check(
  'a one-sided window is still applied (no end bound declared)',
  result.window.openStart.ok === true
);
check(
  'every verdict carries a stated reason',
  Object.values(result.window).every((v) => typeof v.reason === 'string' && v.reason.length > 10),
  JSON.stringify(Object.entries(result.window).filter(([, v]) => !v.reason || v.reason.length <= 10).map(([k]) => k))
);
check(
  'ok is never true unless the code is within-window',
  Object.values(result.window).every((v) => v.ok === (v.code === 'within-window'))
);

/* ── 5. derivation — honest, labelled, fail-closed ─────────────────────────── */

console.log('\n§ 5. The derived appointment never invents a state or claims a confirmation\n');
check(
  'a consignment at the destination derives as Arrived',
  result.derive.arrived.state === 'Arrived' && result.derive.arrived.basis === 'derived'
);
check('the terminal live_amazon milestone also derives as Arrived', result.derive.live.state === 'Arrived');
check(
  'a consignment with a recorded delay derives as Defect (the slot did not materialise)',
  result.derive.delayed.state === 'Defect'
);
check(
  'a consignment with a recorded exception derives as Defect',
  result.derive.exception.state === 'Defect'
);
check(
  'a consignment in transit with a declared window derives as Scheduled, with the window’s opening as the requested date',
  result.derive.scheduled.state === 'Scheduled' &&
    result.derive.scheduled.carrierRequestedDeliveryDate === '2026-10-01'
);
check(
  'that derived scheduled appointment passes the window rule (the requested date is inside)',
  result.derive.scheduled.window.ok === true
);
check(
  'a PO with no declared delivery window derives as Pending with NO invented date',
  result.derive.noWindow.state === 'Pending' &&
    result.derive.noWindow.carrierRequestedDeliveryDate === null &&
    result.derive.noWindow.window.code === 'no-delivery-window'
);
check(
  'an unrecognised milestone derives as unknown / unavailable',
  result.derive.unknownMilestone.state === 'unknown' && result.derive.unknownMilestone.basis === 'unavailable'
);
check(
  'EVERY derived appointment is marked simulated (never a channel confirmation)',
  Object.values(result.derive).every((a) => a.simulated === true)
);
check(
  'EVERY derived appointment carries a non-empty source explaining its basis',
  Object.values(result.derive).every((a) => typeof a.source === 'string' && a.source.length > 20)
);

/* ── 6. presentation — the label never overstates the basis ────────────────── */

console.log('\n§ 6. The label does not overstate what is known\n');
check(
  'a scheduled appointment presents as derived (not confirmed)',
  result.presentation.scheduled.label === 'Appointment scheduled' && result.presentation.scheduled.tone === 'derived'
);
check(
  'an arrived appointment presents as confirmed',
  result.presentation.arrived.tone === 'confirmed'
);
check(
  'an appointment that did not materialise presents as an action',
  result.presentation.delayed.tone === 'action'
);
check(
  'a pending appointment presents as derived with its own label',
  result.presentation.noWindow.label === 'Appointment pending' && result.presentation.noWindow.tone === 'derived'
);
check(
  'an unknown appointment presents as unknown',
  result.presentation.unknown.label === 'Appointment unknown' && result.presentation.unknown.tone === 'unknown'
);
check(
  'every presentation carries the window rule’s own words (never blank)',
  Object.values(result.presentation).every((p) => typeof p.windowDetail === 'string' && p.windowDetail.length > 10)
);

/* ── 7. ONE derivation point; the data layer and the surface consume the owner ─ */

console.log('\n§ 7. The projection and the surface CONSUME the owner (no second copy)\n');
check(
  'the data layer imports the owner’s derivation and calls it exactly once',
  /import \{ deriveDeliveryAppointment \} from '@\/lib\/shipping\/deliveryAppointment'/.test(code('src/data/api.ts')) &&
    (code('src/data/api.ts').match(/deriveDeliveryAppointment\(/g) || []).length === 1,
  `calls: ${(code('src/data/api.ts').match(/deriveDeliveryAppointment\(/g) || []).length}`
);
check(
  'both shipment readers compose the ONE appointment projection point',
  (code('src/data/api.ts').match(/\.map\(attachShipmentAppointment\)/g) || []).length === 2
);
check(
  'the data layer does not re-type the appointment states',
  !code('src/data/api.ts').includes('APPOINTMENT_STATE_BEHAVIOUR') &&
    !code('src/data/api.ts').includes('CHANNEL_APPOINTMENT_STATES')
);
check(
  'the brand logistics surface renders the appointment through the owner’s presentation',
  /appointmentPresentation/.test(code('src/components/brand/LogisticsHub.tsx')) &&
    /data-testid=\{`appointment-\$\{shipment\.reference\}`\}/.test(read('src/components/brand/LogisticsHub.tsx'))
);
check(
  'no component hard-codes an appointment state list',
  sourceFiles()
    .filter((f) => /\/components\//.test(f) && read(path.relative(ROOT, f)).includes('CHANNEL_APPOINTMENT_STATES'))
    .length === 0
);

/* ── 8. no live call ───────────────────────────────────────────────────────── */

console.log('\n§ 8. The executed modules made no network call\n');
check('the executed entry ran with fetch sabotaged', result.network === 'sabotaged');

/* ── summary ───────────────────────────────────────────────────────────────── */

console.log('');
if (fail === 0) {
  console.log(`DELIVERY_APPOINTMENT_VALIDATION_PASS (${pass} passed, 0 failed)`);
  process.exit(0);
} else {
  console.log(`DELIVERY_APPOINTMENT_VALIDATION_FAIL (${pass} passed, ${fail} failed)`);
  for (const e of errors) console.log(`  - ${e}`);
  process.exit(1);
}




