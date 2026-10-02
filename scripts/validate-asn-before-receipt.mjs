#!/usr/bin/env node
/**
 * §BATCH 2l (`AV-015`) — THE ASN-BEFORE-RECEIPT GATE.
 *
 * WHY THIS EXISTS
 * ---------------
 * The Phase 0A audit registered `AV-015`: the channel documents that *"Amazon must
 * receive the shipment confirmation prior to the product being received at the Amazon
 * fulfillment center. Missing or delayed shipment confirmations result in
 * chargebacks."* The platform recorded that evidence but ENFORCED the ordering nowhere
 * and SURFACED it nowhere — a consignment could be received with no confirmation on
 * file and nothing said so. The fix is the ordering owner
 * (`src/lib/shipping/asnBeforeReceipt.ts`), which compares the ASN filing instant against
 * the channel's OWN logged receipt and fails closed.
 *
 * Declaring the rule is not the fix on its own — a later edit could re-type the
 * vocabulary, drop the fail-closed branches, claim `compliant` from an unread state, or
 * read a not-received order as compliant. This gate EXECUTES the shipped module (bundled
 * with the project's own esbuild through its own `@` alias, with `fetch` sabotaged) so it
 * asserts RUNNING behaviour, not a pattern, and fails if:
 *
 *   1  the vocabulary has more than ONE owner, or a label is missing;
 *   2  the rule text does not state the BEFORE-receipt ordering and the chargebacks;
 *   3  a confirmation filed before (or exactly at) the receipt is not `compliant`;
 *   4  a receipt with NO confirmation on file, or a confirmation filed AFTER the
 *      receipt, is not `exposed` (the documented chargeback trigger);
 *   5  a not-yet-received order is not `pending`, with the "must reach the channel
 *      BEFORE the goods do" duty stated when no confirmation is on file;
 *   6  an unread channel state, a receipt without a readable instant, or an unreadable
 *      filing instant is not `unknown` (FAIL CLOSED — never `compliant`);
 *   7  the receiving-status helper misreads a partial receipt as not received;
 *   8  the writer does not record the ASN filing instant, or a surface re-implements the
 *      concept instead of consuming the ONE owner;
 *   9  any live network call is made.
 *
 * Run: node scripts/validate-asn-before-receipt.mjs
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
import { asnBeforeReceiptVerdict, channelReceivingReportsReceived } from '@/lib/shipping/asnBeforeReceipt';
import { ASN_BEFORE_RECEIPT_STATE_LABELS, ASN_BEFORE_RECEIPT_RULE_TEXT } from '@/config/shipping';
import { ASN_BEFORE_RECEIPT_STATES } from '@/types';

globalThis.fetch = function () { throw new Error('NETWORK_CALL_ATTEMPTED'); };

const FILED = '2026-10-01T10:00:00.000Z';
const RECEIVED = '2026-10-03T10:00:00.000Z';

const out = {};
out.vocabulary = ASN_BEFORE_RECEIPT_STATES;
out.labels = ASN_BEFORE_RECEIPT_STATE_LABELS;
out.ruleMentionsBefore = /BEFORE/i.test(ASN_BEFORE_RECEIPT_RULE_TEXT);
out.ruleMentionsChargeback = /chargeback/i.test(ASN_BEFORE_RECEIPT_RULE_TEXT);

out.verdict = {
  compliant: asnBeforeReceiptVerdict({ asnFiledAt: FILED, channelReportsReceived: true, receivedAt: RECEIVED }),
  sameInstant: asnBeforeReceiptVerdict({ asnFiledAt: RECEIVED, channelReportsReceived: true, receivedAt: RECEIVED }),
  filedAfter: asnBeforeReceiptVerdict({ asnFiledAt: '2026-10-05T10:00:00.000Z', channelReportsReceived: true, receivedAt: RECEIVED }),
  noAsn: asnBeforeReceiptVerdict({ asnFiledAt: null, channelReportsReceived: true, receivedAt: RECEIVED }),
  pendingOnFile: asnBeforeReceiptVerdict({ asnFiledAt: FILED, channelReportsReceived: false, receivedAt: null }),
  pendingNone: asnBeforeReceiptVerdict({ asnFiledAt: null, channelReportsReceived: false, receivedAt: null }),
  unread: asnBeforeReceiptVerdict({ asnFiledAt: FILED, channelReportsReceived: null, receivedAt: null }),
  receivedNoDate: asnBeforeReceiptVerdict({ asnFiledAt: FILED, channelReportsReceived: true, receivedAt: null }),
  badFiling: asnBeforeReceiptVerdict({ asnFiledAt: 'not-a-date', channelReportsReceived: true, receivedAt: RECEIVED }),
};

out.receiving = {
  received: channelReceivingReportsReceived('received'),
  partial: channelReceivingReportsReceived('partially_received'),
  notReceived: channelReceivingReportsReceived('not_received'),
};

out.network = 'sabotaged';
console.log('__RESULT__' + JSON.stringify(out));
`;

const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'mercenta-asnbr-'));
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
  console.log('ASN_BEFORE_RECEIPT_VALIDATION_FAIL (0 passed, 1 failed)');
  process.exit(1);
}

const OWNER = 'src/lib/shipping/asnBeforeReceipt.ts';
const STATES = ['compliant', 'pending', 'exposed', 'unknown'];

/* ── 1. one owner, one vocabulary, labels complete ───────────────────────────── */

console.log('\n§ 1. The rule has ONE owner (`AV-015`) and every state is labelled\n');
check(
  'the vocabulary is exactly the four declared states',
  JSON.stringify(result.vocabulary) === JSON.stringify(STATES),
  JSON.stringify(result.vocabulary)
);
check(
  'the vocabulary array is declared in exactly ONE file',
  countInSrc('ASN_BEFORE_RECEIPT_STATES = [') === 1,
  `occurrences: ${countInSrc('ASN_BEFORE_RECEIPT_STATES = [')}`
);
check(
  'the label map is declared in exactly ONE file',
  countInSrc('ASN_BEFORE_RECEIPT_STATE_LABELS: Record') === 1,
  `occurrences: ${countInSrc('ASN_BEFORE_RECEIPT_STATE_LABELS: Record')}`
);
check(
  'every declared state carries a non-empty label',
  STATES.every((s) => typeof result.labels[s] === 'string' && result.labels[s].length > 0),
  JSON.stringify(result.labels)
);
check(
  'no component re-types the vocabulary',
  sourceFiles()
    .filter((f) => /\/components\//.test(f) && read(path.relative(ROOT, f)).includes('ASN_BEFORE_RECEIPT_STATES'))
    .length === 0
);
check('the owner contains no TODO/FIXME placeholder', !/TODO|FIXME/.test(read(OWNER)));
check('the owner makes no network call of its own', !/fetch\s*\(|XMLHttpRequest|axios/.test(code(OWNER)));

/* ── 2. the documented rule ──────────────────────────────────────────────────── */

console.log('\n§ 2. The rule text states the BEFORE-receipt ordering and the chargebacks\n');
check('the rule states the ordering must be BEFORE receipt', result.ruleMentionsBefore === true);
check('the rule names the documented chargebacks', result.ruleMentionsChargeback === true);

/* ── 3. compliant only when the confirmation was on file first ───────────────── */

console.log('\n§ 3. `compliant` is claimed only when the confirmation preceded the receipt\n');
check(
  'filed before receipt ⇒ compliant',
  result.verdict.compliant.state === 'compliant' && result.verdict.compliant.compliant === true
);
check('filed at the receipt instant ⇒ compliant (on file no later)', result.verdict.sameInstant.state === 'compliant');
check(
  'compliant is never at risk',
  result.verdict.compliant.exposed === false && result.verdict.sameInstant.exposed === false
);

/* ── 4. the documented chargeback trigger is `exposed` ───────────────────────── */

console.log('\n§ 4. A receipt without the confirmation on file first is EXPOSED\n');
check(
  'filed AFTER the receipt ⇒ exposed',
  result.verdict.filedAfter.state === 'exposed' && result.verdict.filedAfter.exposed === true
);
check(
  'received with NO confirmation on file ⇒ exposed',
  result.verdict.noAsn.state === 'exposed' && result.verdict.noAsn.exposed === true
);
check(
  'exposed is never compliant',
  result.verdict.filedAfter.compliant === false && result.verdict.noAsn.compliant === false
);

/* ── 5. not received yet ⇒ pending, with the duty stated ─────────────────────── */

console.log('\n§ 5. A not-yet-received order is `pending`, and the duty is stated\n');
check('not received, confirmation on file ⇒ pending', result.verdict.pendingOnFile.state === 'pending');
check(
  'not received, NO confirmation ⇒ pending AND the "before the goods" duty is stated',
  result.verdict.pendingNone.state === 'pending' && /BEFORE the goods do/i.test(result.verdict.pendingNone.statement)
);

/* ── 6. fail-closed: unreadable is never `compliant` ─────────────────────────── */

console.log('\n§ 6. Every unreadable input fails closed (never `compliant`)\n');
check('an unread channel state ⇒ unknown', result.verdict.unread.state === 'unknown');
check('a receipt without a readable instant ⇒ unknown', result.verdict.receivedNoDate.state === 'unknown');
check('an unreadable filing instant ⇒ unknown', result.verdict.badFiling.state === 'unknown');
check(
  'no unknown case is compliant or exposed',
  [result.verdict.unread, result.verdict.receivedNoDate, result.verdict.badFiling].every(
    (v) => v.state === 'unknown' && v.compliant === false && v.exposed === false
  )
);

/* ── 7. the receiving-status helper ──────────────────────────────────────────── */

console.log('\n§ 7. The channel receiving status maps correctly (a partial receipt counts)\n');
check('`received` reports received', result.receiving.received === true);
check('`partially_received` reports received (goods arrived)', result.receiving.partial === true);
check('`not_received` does not', result.receiving.notReceived === false);

/* ── 8. the writer records the instant; the surface consumes the owner ───────── */

console.log('\n§ 8. The writer records the filing instant; the surface consumes the owner\n');
check(
  'the proxy processor records `asn.filedAt` when the ASN is filed',
  /filedAt: new Date\(\)\.toISOString\(\)/.test(code('src/lib/commerce/proxyProcessor.ts'))
);
check(
  'the channel-operations console consumes the ONE owner',
  /asnBeforeReceiptVerdict\(/.test(code('src/components/admin/ChannelOperationsPanel.tsx'))
);
check(
  'the console reuses the receiving read (no second channel call)',
  !/readAcknowledgementVerification\(/.test(code('src/components/admin/ChannelOperationsPanel.tsx'))
);

/* ── 9. no live call ─────────────────────────────────────────────────────────── */

console.log('\n§ 9. The executed modules made no network call\n');
check('the executed entry ran with fetch sabotaged', result.network === 'sabotaged');

/* ── summary ─────────────────────────────────────────────────────────────────── */

console.log('');
if (fail === 0) {
  console.log(`ASN_BEFORE_RECEIPT_VALIDATION_PASS (${pass} passed, 0 failed)`);
  process.exit(0);
} else {
  console.log(`ASN_BEFORE_RECEIPT_VALIDATION_FAIL (${pass} passed, ${fail} failed)`);
  for (const e of errors) console.log(`  - ${e}`);
  process.exit(1);
}