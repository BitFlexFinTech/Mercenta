#!/usr/bin/env node
/**
 * §BATCH 2k (`AV-011`) — THE ACKNOWLEDGEMENT-VERIFICATION GATE.
 *
 * WHY THIS EXISTS
 * ---------------
 * The Phase 0A audit registered `AV-011`: Mercenta transmits an acknowledgement to
 * the retail channel but never CONFIRMS it arrived, so *"an ack could silently
 * fail"*. The channel documents that an acknowledgement is verifiable and that
 * *"if the original or updated version doesn't appear after 30 minutes"* something is
 * wrong. The fix is the confirmation step in
 * `src/lib/commerce/poAcknowledgementVerification.ts`, which reads the channel's OWN
 * order state back (`getPurchaseOrdersStatus`, already built) and fails closed.
 *
 * Declaring the step is not the fix on its own — a later edit could re-type the
 * vocabulary, drop the fail-closed branches, judge the window before the channel is
 * readable, or let an unread state read as `confirmed`. This gate EXECUTES the
 * shipped module (bundled with the project's own esbuild through its own `@` alias,
 * with `fetch` sabotaged) so it asserts RUNNING behaviour, not a pattern, and fails
 * if:
 *
 *   1  the vocabulary has more than ONE owner, or a label is missing;
 *   2  an order with nothing transmitted is not `not_submitted`;
 *   3  an unreadable transmission time, an unreadable channel state, or an unreadable
 *      instant is not `unreadable` (FAIL CLOSED — never `confirmed`);
 *   4  the channel reporting the order acknowledged (or beyond) is not `confirmed`,
 *      or `open`/`cancelled` is wrongly read as acknowledged;
 *   5  the 30-minute appearance window is not applied exactly (inside → awaiting;
 *      at/after → not_confirmed);
 *   6  the read-composing convenience does not fail closed on a throwing seam, a
 *      not-ok read, or an unknown order id;
 *   7  the writer does not record the transmission instant, or a surface re-implements
 *      the concept instead of consuming the ONE owner;
 *   8  any live network call is made.
 *
 * Run: node scripts/validate-ack-verification.mjs
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
import { verifyAcknowledgement, readAcknowledgementVerification } from '@/lib/commerce/poAcknowledgementVerification';
import {
  PO_ACK_VERIFICATION_STATE_LABELS,
  PO_ACK_VERIFICATION_WINDOW_MINUTES, PO_ACK_VERIFICATION_RULE_TEXT,
} from '@/config/purchaseOrders';
import { PO_ACK_VERIFICATION_STATES } from '@/types';

globalThis.fetch = function () { throw new Error('NETWORK_CALL_ATTEMPTED'); };

const SUBMITTED = '2026-10-02T10:00:00.000Z';
const at = (mins) => new Date(Date.parse(SUBMITTED) + mins * 60000).toISOString();

const out = {};
out.vocabulary = PO_ACK_VERIFICATION_STATES;
out.windowMinutes = PO_ACK_VERIFICATION_WINDOW_MINUTES;
out.ruleMentionsThirty = /30/.test(PO_ACK_VERIFICATION_RULE_TEXT);
out.labels = PO_ACK_VERIFICATION_STATE_LABELS;

out.pure = {
  notSubmitted: verifyAcknowledgement({ submittedAt: null, channelState: null, now: at(60) }),
  badTime: verifyAcknowledgement({ submittedAt: 'not-a-date', channelState: 'open', now: at(60) }),
  unreadable: verifyAcknowledgement({ submittedAt: SUBMITTED, channelState: null, now: at(60) }),
  confirmed: verifyAcknowledgement({ submittedAt: SUBMITTED, channelState: 'acknowledged', now: at(5) }),
  confirmedReceived: verifyAcknowledgement({ submittedAt: SUBMITTED, channelState: 'received', now: at(5) }),
  confirmedClosed: verifyAcknowledgement({ submittedAt: SUBMITTED, channelState: 'closed', now: at(1) }),
  openEarly: verifyAcknowledgement({ submittedAt: SUBMITTED, channelState: 'open', now: at(29) }),
  openBoundary: verifyAcknowledgement({ submittedAt: SUBMITTED, channelState: 'open', now: at(30) }),
  openLate: verifyAcknowledgement({ submittedAt: SUBMITTED, channelState: 'open', now: at(75) }),
  cancelledEarly: verifyAcknowledgement({ submittedAt: SUBMITTED, channelState: 'cancelled', now: at(5) }),
  cancelledLate: verifyAcknowledgement({ submittedAt: SUBMITTED, channelState: 'cancelled', now: at(60) }),
  badNow: verifyAcknowledgement({ submittedAt: SUBMITTED, channelState: 'open', now: 'nonsense' }),
  simulatedConfirmed: verifyAcknowledgement({ submittedAt: SUBMITTED, channelState: 'acknowledged', simulated: true, now: at(5) }),
};

const readerReturning = (status) => ({ getPurchaseOrdersStatus: async (ids) => ({
  ok: true,
  statuses: status ? [{ purchaseOrderId: ids[0], status, receivingStatus: 'not_received', lines: [], simulated: true }] : [],
  ...(status ? {} : { unknownPurchaseOrderIds: ids }),
}) });
const readerThrowing = { getPurchaseOrdersStatus: async () => { throw new Error('NO_VERIFIED_CONNECTION'); } };
const readerNotOk = { getPurchaseOrdersStatus: async () => ({ ok: false, error: 'HTTP 500' }) };

(async () => {
  out.reader = {
    confirmed: await readAcknowledgementVerification({ reader: readerReturning('acknowledged'), purchaseOrderId: 'PO-1', submittedAt: SUBMITTED, now: at(5) }),
    unknown: await readAcknowledgementVerification({ reader: readerReturning(null), purchaseOrderId: 'PO-9', submittedAt: SUBMITTED, now: at(60) }),
    threw: await readAcknowledgementVerification({ reader: readerThrowing, purchaseOrderId: 'PO-1', submittedAt: SUBMITTED, now: at(60) }),
    notOk: await readAcknowledgementVerification({ reader: readerNotOk, purchaseOrderId: 'PO-1', submittedAt: SUBMITTED, now: at(60) }),
    emptyId: await readAcknowledgementVerification({ reader: readerReturning('acknowledged'), purchaseOrderId: '  ', submittedAt: SUBMITTED, now: at(60) }),
  };
  out.network = 'sabotaged';
  console.log('__RESULT__' + JSON.stringify(out));
})();
`;

const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'mercenta-ackverif-'));
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
  console.log('ACK_VERIFICATION_VALIDATION_FAIL (0 passed, 1 failed)');
  process.exit(1);
}

const OWNER = 'src/lib/commerce/poAcknowledgementVerification.ts';
const STATES = ['not_submitted', 'awaiting_visibility', 'confirmed', 'not_confirmed', 'unreadable'];

/* ── 1. one owner, one vocabulary, labels complete ───────────────────────────── */

console.log('\n§ 1. The verification concept has ONE owner (`AV-011`) and every state is labelled\n');
check(
  'the verification vocabulary is exactly the five declared states',
  JSON.stringify(result.vocabulary) === JSON.stringify(STATES),
  JSON.stringify(result.vocabulary)
);
check(
  'the vocabulary array is declared in exactly ONE file (the canonical types file)',
  countInSrc('PO_ACK_VERIFICATION_STATES = [') === 1,
  `occurrences: ${countInSrc('PO_ACK_VERIFICATION_STATES = [')}`
);
check(
  'the label map is declared in exactly ONE file (the config owner)',
  countInSrc('PO_ACK_VERIFICATION_STATE_LABELS: Record') === 1,
  `occurrences: ${countInSrc('PO_ACK_VERIFICATION_STATE_LABELS: Record')}`
);
check(
  'every declared state carries a non-empty label',
  STATES.every((s) => typeof result.labels[s] === 'string' && result.labels[s].length > 0),
  JSON.stringify(result.labels)
);
check(
  'no component re-types the verification vocabulary',
  sourceFiles()
    .filter((f) => /\/components\//.test(f) && read(path.relative(ROOT, f)).includes('PO_ACK_VERIFICATION_STATES'))
    .length === 0
);
check('the owner contains no TODO/FIXME placeholder', !/TODO|FIXME/.test(read(OWNER)));
check('the owner makes no network call of its own', !/fetch\s*\(|XMLHttpRequest|axios/.test(code(OWNER)));

/* ── 2. the 30-minute window is declared ONCE ────────────────────────────────── */

console.log('\n§ 2. The channel’s 30-minute appearance window is declared once\n');
check('the window is the channel’s documented 30 minutes', result.windowMinutes === 30);
check('the rule text states the 30-minute window', result.ruleMentionsThirty === true);
check(
  'the window constant is written down in exactly ONE place',
  countInSrc('PO_ACK_VERIFICATION_WINDOW_MINUTES = ') === 1,
  `occurrences: ${countInSrc('PO_ACK_VERIFICATION_WINDOW_MINUTES = ')}`
);

/* ── 3. fail-closed: unreadable is never `confirmed` ─────────────────────────── */

console.log('\n§ 3. Every unreadable input fails closed (never `confirmed`)\n');
check(
  'nothing transmitted ⇒ not_submitted, not confirmed',
  result.pure.notSubmitted.state === 'not_submitted' && result.pure.notSubmitted.confirmed === false
);
check('an unreadable transmission time ⇒ unreadable', result.pure.badTime.state === 'unreadable');
check(
  'an unreadable channel state ⇒ unreadable',
  result.pure.unreadable.state === 'unreadable' && result.pure.unreadable.confirmed === false
);
check('an unreadable instant ⇒ unreadable (the window is never judged blind)', result.pure.badNow.state === 'unreadable');
check(
  'no unreadable case is ever reported as confirmed or at-risk',
  [result.pure.badTime, result.pure.unreadable, result.pure.badNow].every(
    (v) => v.state === 'unreadable' && v.confirmed === false && v.atRisk === false
  )
);

/* ── 4. the channel’s own state decides confirmation ─────────────────────────── */

console.log('\n§ 4. Confirmation comes ONLY from the channel’s own order state\n');
check(
  'the channel reporting `acknowledged` ⇒ confirmed',
  result.pure.confirmed.state === 'confirmed' && result.pure.confirmed.confirmed === true
);
check('`received` (past acknowledgement) ⇒ confirmed', result.pure.confirmedReceived.state === 'confirmed');
check('`closed` (past acknowledgement) ⇒ confirmed', result.pure.confirmedClosed.state === 'confirmed');
check(
  '`cancelled` is NOT read as acknowledged',
  result.pure.cancelledEarly.state === 'awaiting_visibility' && result.pure.cancelledLate.state === 'not_confirmed'
);
check(
  'a simulated confirmed read is labelled simulated',
  result.pure.simulatedConfirmed.simulated === true && /Simulated channel read/.test(result.pure.simulatedConfirmed.statement)
);

/* ── 5. the 30-minute window is applied exactly ──────────────────────────────── */

console.log('\n§ 5. Inside the window nothing is concluded; at/after it the ack is AT RISK\n');
check(
  '29 minutes in and not acknowledged ⇒ awaiting_visibility',
  result.pure.openEarly.state === 'awaiting_visibility' && result.pure.openEarly.atRisk === false
);
check(
  'exactly at 30 minutes ⇒ not_confirmed (window elapsed)',
  result.pure.openBoundary.state === 'not_confirmed' && result.pure.openBoundary.atRisk === true
);
check(
  'past the window and not acknowledged ⇒ not_confirmed, at_risk',
  result.pure.openLate.state === 'not_confirmed' && result.pure.openLate.atRisk === true
);
check(
  'the appearance deadline is reported for a measurable window',
  /2026-10-02T10:30:00/.test(result.pure.openLate.appearanceDeadline ?? '')
);

/* ── 6. the read-composing convenience fails closed ──────────────────────────── */

console.log('\n§ 6. Reading the channel back fails closed on every unread result\n');
check('a positive channel read ⇒ confirmed', result.reader.confirmed.state === 'confirmed');
check(
  'an order the channel does not know ⇒ unreadable (never “not acknowledged”)',
  result.reader.unknown.state === 'unreadable'
);
check('a throwing seam (no verified connection) ⇒ unreadable', result.reader.threw.state === 'unreadable');
check('a not-ok channel read ⇒ unreadable', result.reader.notOk.state === 'unreadable');
check('an empty order id makes no read and stays unreadable', result.reader.emptyId.state === 'unreadable');

/* ── 7. the writer records the instant; the surface consumes the owner ────────── */

console.log('\n§ 7. The writer records the transmission instant; the surface consumes the owner\n');
check(
  'the proxy processor records `submittedAt` when it transmits the acknowledgement',
  /ackSubmittedAt = new Date\(\)\.toISOString\(\)/.test(code('src/lib/commerce/proxyProcessor.ts')) &&
    /submittedAt: ackSubmittedAt/.test(code('src/lib/commerce/proxyProcessor.ts'))
);
check(
  'the channel-operations console consumes the ONE owner (not a re-implementation)',
  /verifyAcknowledgement\(/.test(code('src/components/admin/ChannelOperationsPanel.tsx'))
);
check(
  'the console reuses the receiving read rather than making a second channel call',
  !/readAcknowledgementVerification\(/.test(code('src/components/admin/ChannelOperationsPanel.tsx'))
);

/* ── 8. no live call ─────────────────────────────────────────────────────────── */

console.log('\n§ 8. The executed modules made no network call\n');
check('the executed entry ran with fetch sabotaged', result.network === 'sabotaged');

/* ── summary ─────────────────────────────────────────────────────────────────── */

console.log('');
if (fail === 0) {
  console.log(`ACK_VERIFICATION_VALIDATION_PASS (${pass} passed, 0 failed)`);
  process.exit(0);
} else {
  console.log(`ACK_VERIFICATION_VALIDATION_FAIL (${pass} passed, ${fail} failed)`);
  for (const e of errors) console.log(`  - ${e}`);
  process.exit(1);
}