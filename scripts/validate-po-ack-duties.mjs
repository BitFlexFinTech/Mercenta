#!/usr/bin/env node
/**
 * §BATCH 2j (`AV-009` / `AV-010b`) — THE PO ACKNOWLEDGEMENT DUTIES GATE.
 *
 * WHY THIS EXISTS
 * ---------------
 * The Phase 0A audit registered two findings about the acknowledgement, both still open:
 *
 *   `AV-009` — the channel requires a COMPLETE acknowledgement covering every line item and
 *              *"if you do not provide all line items …, Amazon implicitly rejects the missing
 *              line items"*. Mercenta applied the consequence but never declared the rule,
 *              never told the brand BEFORE submission, and left no record that a submission
 *              had been incomplete (a fact that cannot be recovered afterwards).
 *
 *   `AV-010b` — *"Vendors must reject any purchase order that is on hold past the 24-hour time
 *              limit."* Mercenta had no hold concept at all, so the duty could neither be
 *              stated nor enforced, and an order the channel was holding looked exactly like
 *              one it was not.
 *
 * Declaring either is not the fix on its own. This gate EXECUTES the shipped modules —
 * bundled with the project's own esbuild through its own `@` alias, with `fetch` sabotaged —
 * so it asserts RUNNING behaviour, and fails if:
 *
 *   1  the channel hold vocabulary has more than ONE owner, or a state loses its label;
 *   2  completeness is judged from the SUBMISSION rather than the order (so a submission
 *      could appear complete by sending extra or unknown SKUs);
 *   3  an omitted or `unacknowledged` line is not reported as missing, or an order with no
 *      readable lines is reported as complete (fail-closed);
 *   4  a record with no hold statement is NOT `unknown` — an unread state silently read as
 *      "not held", or as "held";
 *   5  the channel's on-hold duty does not refuse an acceptance past the limit, refuses the
 *      required all-rejected submission, or fires on a state that could not be read;
 *   6  the WRITER does not enforce it, does not record the lines a submission omitted, does
 *      not state the rule in its audit trail, or refuses the channel-REQUIRED rejection of a
 *      held order past the 48-hour update window (the defect this batch fixed);
 *   7  the surfaces re-implement the rule instead of consuming the owner's statement;
 *   8  any live network call is made.
 *
 * Run: node scripts/validate-po-ack-duties.mjs
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

/** How many COMPONENT files (only `src/components/**`) carry a literal in their CODE. */
const countInComponents = (literal) =>
  sourceFiles()
    .filter((file) => file.includes(`${path.sep}components${path.sep}`))
    .filter((file) =>
      fs
        .readFileSync(file, 'utf8')
        .replace(/\/\*[\s\S]*?\*\//g, '')
        .replace(/\/\/[^\n]*/g, '')
        .includes(literal)
    ).length;

/* ── The executed entry ───────────────────────────────────────────────────── */

const ENTRY = `
import {
  PO_CHANNEL_HOLD_STATE_LABELS, PO_ACK_COMPLETENESS_RULE_TEXT, PO_ON_HOLD_REJECT_RULE_TEXT,
} from '@/config/purchaseOrders';
import { PO_CHANNEL_HOLD_STATES } from '@/types';
import {
  poChannelHoldDuty, onHoldRejectionRefusal, poChannelHoldWarning, holdRejectionPermitted,
} from '@/lib/commerce/poAcknowledgementWindow';
import { poAcknowledgementCompleteness } from '@/lib/commerce/poAcknowledgementCompleteness';
import { acknowledgePurchaseOrder, recordChannelPurchaseOrderHold } from '@/data/api';
import { demoPurchaseOrders, demoAuditLog } from '@/data/demoStore';

globalThis.fetch = function () { throw new Error('NETWORK_CALL_ATTEMPTED'); };

const H = 3_600_000;
const T = '2026-01-10T00:00:00.000Z';
const Tms = Date.parse(T);

const out = {};
out.vocabulary = [...PO_CHANNEL_HOLD_STATES];
out.labels = PO_CHANNEL_HOLD_STATE_LABELS;
out.completenessRule = PO_ACK_COMPLETENESS_RULE_TEXT;
out.onHoldRule = PO_ON_HOLD_REJECT_RULE_TEXT;

/* ── 2-3. Completeness: judged from the ORDER, fail-closed ────────────────── */
const po2 = {
  poNumber: 'PO-C-TEST',
  lineItems: [
    { sku: 'S1', productName: 'One', quantity: 10, unitPrice: 5, commodityCode: 'x' },
    { sku: 'S2', productName: 'Two', quantity: 4, unitPrice: 5, commodityCode: 'x' },
  ],
};
out.completeness = {
  full: poAcknowledgementCompleteness(po2, [
    { sku: 'S1', ackStatus: 'accepted' },
    { sku: 'S2', ackStatus: 'rejected' },
  ]),
  omitted: poAcknowledgementCompleteness(po2, [{ sku: 'S1', ackStatus: 'accepted' }]),
  unacknowledged: poAcknowledgementCompleteness(po2, [
    { sku: 'S1', ackStatus: 'accepted' },
    { sku: 'S2', ackStatus: 'unacknowledged' },
  ]),
  extraSkuOnly: poAcknowledgementCompleteness(po2, [
    { sku: 'S1', ackStatus: 'accepted' },
    { sku: 'Z9', ackStatus: 'accepted' },
  ]),
  noLines: poAcknowledgementCompleteness({ poNumber: 'PO-EMPTY', lineItems: [] }, []),
};

/* ── 4-5. The hold duty: fail-closed, and the refusal ─────────────────────── */
const holdPo = (declared) => ({
  id: 'po-hold-test', brandId: 'brand-a', poNumber: 'PO-HOLD-TEST', status: 'received',
  orderDate: T, poValue: 0, commissionRate: 0, commissionAmount: 0, lineItems: [],
  ...(declared
    ? { channelHold: { state: declared, recordedAt: T, simulated: true, recordedBy: 'gate' } }
    : {}),
});
const INSIDE = new Date(Tms + 10 * H);
const PAST = new Date(Tms + 30 * H);
out.duty = {
  unread: poChannelHoldDuty(holdPo(null), PAST),
  declaredInside: poChannelHoldDuty(holdPo('declared'), INSIDE),
  declaredPast: poChannelHoldDuty(holdPo('declared'), PAST),
  cleared: poChannelHoldDuty(holdPo('cleared'), PAST),
};
out.holdRefusal = {
  acceptInside: onHoldRejectionRefusal(holdPo('declared'), false, INSIDE),
  acceptPast: onHoldRejectionRefusal(holdPo('declared'), false, PAST),
  allRejectedPast: onHoldRejectionRefusal(holdPo('declared'), true, PAST),
  unreadPast: onHoldRejectionRefusal(holdPo(null), false, PAST),
  clearedPast: onHoldRejectionRefusal(holdPo('cleared'), false, PAST),
};
out.holdPermitted = {
  allRejectedPast: holdRejectionPermitted(holdPo('declared'), true, PAST),
  acceptPast: holdRejectionPermitted(holdPo('declared'), false, PAST),
  allRejectedUnread: holdRejectionPermitted(holdPo(null), true, PAST),
};
out.holdWarning = poChannelHoldWarning(holdPo('declared'), INSIDE);

/* ── 6a. The WRITER: an INCOMPLETE submission is recorded as such ─────────── */
const fresh = demoPurchaseOrders.find(
  (p) => p.lineItems.length >= 2 && p.lineItems.every((l) => !l.ackStatus || l.ackStatus === 'unacknowledged')
);
out.foundFreshPo = Boolean(fresh);
out.freshLines = fresh ? fresh.lineItems.map((l) => l.sku) : [];
if (fresh) {
  out.poNumber = fresh.poNumber;
  const omitted = fresh.lineItems.slice(1).map((l) => l.sku);

  const partial = acknowledgePurchaseOrder(fresh.id, [
    { sku: fresh.lineItems[0].sku, ackStatus: 'accepted', acknowledgedQty: fresh.lineItems[0].quantity },
  ]);
  out.partial = {
    ok: partial.ok,
    error: partial.error ?? null,
    implicitRecorded: fresh.implicitlyRejectedLines ? [...fresh.implicitlyRejectedLines] : null,
    warningsMentionRule: (partial.warnings ?? []).some((w) =>
      w.includes(PO_ACK_COMPLETENESS_RULE_TEXT.slice(0, 40))
    ),
    firstLineStatus: fresh.lineItems[0].ackStatus,
    omittedRejected: omitted.every(
      (sku) => fresh.lineItems.find((l) => l.sku === sku)?.ackStatus === 'rejected'
    ),
  };
  const audit = demoAuditLog.filter(
    (a) => a.entityId === fresh.id && a.action === 'purchase_order_acknowledged'
  );
  const last = audit[audit.length - 1];
  out.partialAudit = {
    count: audit.length,
    namesOmitted: Boolean(last && last.reason.includes('omitted')),
    metadataImplicit: last ? last.metadata.implicitlyRejectedLines : null,
  };
}

/* ── 6b. The WRITER: a HELD order may only be rejected ───────────────────── */
const held = demoPurchaseOrders.find((p) => p.lineItems.some((l) => l.isBackOrderAllowed === true));
out.foundHoldPo = Boolean(held);
if (held) {
  out.holdPoNumber = held.poNumber;
  const orderMsHeld = Date.parse(held.orderDate);
  const record = recordChannelPurchaseOrderHold(held.id, 'declared', {
    recordedBy: 'gate',
    simulated: true,
  });
  out.record = {
    ok: record.ok,
    written: record.written ?? null,
    state: held.channelHold ? held.channelHold.state : null,
    simulated: held.channelHold ? held.channelHold.simulated : null,
    auditWritten: demoAuditLog.some(
      (a) => a.action === 'purchase_order_channel_hold_recorded' && a.entityId === held.id
    ),
    idempotent:
      recordChannelPurchaseOrderHold(held.id, 'declared', { recordedBy: 'gate', simulated: true })
        .written === false,
    liveRefused: recordChannelPurchaseOrderHold(held.id, 'cleared', {
      recordedBy: 'gate',
      simulated: false,
    }),
    undeclaredRefused: recordChannelPurchaseOrderHold(held.id, 'paused', {
      recordedBy: 'gate',
      simulated: true,
    }),
  };
  const pastNow = new Date(orderMsHeld + 30 * H);
  const acceptAll = held.lineItems.map((l) => ({
    sku: l.sku,
    ackStatus: 'accepted',
    acknowledgedQty: l.quantity,
  }));
  const acceptOnHold = acknowledgePurchaseOrder(held.id, acceptAll, undefined, pastNow);
  out.holdAcceptRefused = { ok: acceptOnHold.ok, error: acceptOnHold.error ?? null };
  const rejectAll = held.lineItems.map((l) => ({
    sku: l.sku,
    ackStatus: 'rejected',
    rejectionCode: 'TemporarilyUnavailable',
  }));
  const rejectOnHold = acknowledgePurchaseOrder(held.id, rejectAll, undefined, pastNow);
  out.holdRejectAccepted = { ok: rejectOnHold.ok, error: rejectOnHold.error ?? null };
  out.holdClosedByRejection = Boolean(held.acknowledgedAt);
}

/* An order with NO hold statement must never be refused BY the duty. */
const plain = demoPurchaseOrders.find(
  (p) => !p.channelHold && p.lineItems.length > 0 && !p.acknowledgedAt
);
out.plainPoRefusal = plain
  ? onHoldRejectionRefusal(plain, false, new Date(Date.parse(plain.orderDate) + 30 * H))
  : 'no-unacknowledged-order';

out.network = 'sabotaged';
console.log('__RESULT__' + JSON.stringify(out));
`;

const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'mercenta-ack-duties-'));
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
  console.log('PO_ACK_DUTIES_VALIDATION_FAIL (0 passed, 1 failed)');
  process.exit(1);
}

const OWNER = 'src/lib/commerce/poAcknowledgementCompleteness.ts';
const WINDOW_OWNER = 'src/lib/commerce/poAcknowledgementWindow.ts';

/* ── 1. ONE owner, one vocabulary ─────────────────────────────────────────── */

console.log('\n§ 1. The channel hold vocabulary has ONE owner (`AV-010b`)\n');
check(
  'the declared hold states are exactly declared · cleared · unknown',
  JSON.stringify(result.vocabulary) === JSON.stringify(['declared', 'cleared', 'unknown']),
  JSON.stringify(result.vocabulary)
);
check(
  'the vocabulary array is declared in exactly ONE file (the canonical types file)',
  countInSrc('PO_CHANNEL_HOLD_STATES = [') === 1,
  `occurrences: ${countInSrc('PO_CHANNEL_HOLD_STATES = [')}`
);
check(
  'every declared state carries a config-owned label',
  result.vocabulary.every((s) => typeof result.labels[s] === 'string' && result.labels[s].length > 0),
  JSON.stringify(result.labels)
);
check(
  'no component declares its own hold vocabulary or a competing union type',
  countInComponents("'declared' |") === 0 &&
    countInComponents("'declared'|") === 0 &&
    countInComponents("['declared'") === 0,
  `competing declarations in components: ${
    countInComponents("'declared' |") + countInComponents("'declared'|") + countInComponents("['declared'")
  } (passing a declared member as an argument is NOT a competing declaration — the type makes it compile-checked)`
);

/* ── 2-3. Completeness (`AV-009`) ─────────────────────────────────────────── */

console.log('\n§ 2. Completeness is judged from the ORDER, and fails closed (`AV-009`)\n');
const C = result.completeness;
check(
  'a submission that decides every line is COMPLETE, with nothing to state',
  C.full.complete === true && C.full.judgeable === true && C.full.missing.length === 0 && C.full.statement === null,
  JSON.stringify(C.full)
);
check(
  'an OMITTED line is reported missing, by SKU, in the order’s own line order',
  C.omitted.complete === false && JSON.stringify(C.omitted.missing) === JSON.stringify(['S2']),
  JSON.stringify(C.omitted.missing)
);
check(
  'an `unacknowledged` line counts as missing (the channel rejects it)',
  C.unacknowledged.complete === false && JSON.stringify(C.unacknowledged.missing) === JSON.stringify(['S2']),
  JSON.stringify(C.unacknowledged.missing)
);
check(
  'a submission CANNOT appear complete by sending unknown SKUs',
  C.extraSkuOnly.complete === false && JSON.stringify(C.extraSkuOnly.missing) === JSON.stringify(['S2']),
  JSON.stringify(C.extraSkuOnly)
);
check(
  'an order with no readable lines is NOT complete and says it cannot be judged (fail-closed)',
  C.noLines.complete === false &&
    C.noLines.judgeable === false &&
    typeof C.noLines.statement === 'string' &&
    C.noLines.statement.length > 0,
  JSON.stringify(C.noLines)
);
check(
  'the completeness statement quotes the config-owned rule',
  typeof C.omitted.statement === 'string' && C.omitted.statement.includes(result.completenessRule),
  C.omitted.statement
);
check(
  'the completeness owner declares the rule from the config (no second copy of the wording)',
  code(OWNER).includes('PO_ACK_COMPLETENESS_RULE_TEXT') &&
    countInSrc('The retail channel requires a complete acknowledgement') === 1,
  `wording carriers: ${countInSrc('The retail channel requires a complete acknowledgement')}`
);

/* ── 4-5. The on-hold duty (`AV-010b`) ───────────────────────────────────── */

console.log('\n§ 3. A record that carries no hold statement is UNKNOWN, never "not held" (`AV-010b`)\n');
const D = result.duty;
check(
  'no statement ⇒ state `unknown`, `unread` true, no required action',
  D.unread.state === 'unknown' && D.unread.held === false && D.unread.unread === true && D.unread.requiredAction === null,
  JSON.stringify({ state: D.unread.state, held: D.unread.held, unread: D.unread.unread })
);
check(
  'no statement ⇒ the platform STATES the duty is unverified',
  /UNVERIFIED/.test(D.unread.statement) && D.unread.statement.length > 0,
  D.unread.statement
);
check(
  'a DECLARED hold inside the limit requires no rejection yet, and warns',
  D.declaredInside.held === true &&
    D.declaredInside.pastLimit === false &&
    D.declaredInside.requiredAction === null &&
    typeof result.holdWarning === 'string' &&
    result.holdWarning.includes(result.onHoldRule),
  JSON.stringify({ pastLimit: D.declaredInside.pastLimit, requiredAction: D.declaredInside.requiredAction })
);
check(
  'a DECLARED hold past the limit REQUIRES a rejection',
  D.declaredPast.held === true && D.declaredPast.pastLimit === true && D.declaredPast.requiredAction === 'reject',
  JSON.stringify({ pastLimit: D.declaredPast.pastLimit, requiredAction: D.declaredPast.requiredAction })
);
check(
  'a CLEARED hold carries no duty',
  D.cleared.state === 'cleared' && D.cleared.held === false && D.cleared.requiredAction === null,
  JSON.stringify({ state: D.cleared.state, requiredAction: D.cleared.requiredAction })
);
check(
  'the duty’s limit is READ from the window owner (one 24-hour declaration)',
  D.declaredPast.deadline === new Date(Date.parse('2026-01-10T00:00:00.000Z') + 24 * 3600000).toISOString(),
  String(D.declaredPast.deadline)
);

console.log('\n§ 4. The refusal: only the documented action survives (`AV-010b`)\n');
const R = result.holdRefusal;
check(
  'an acceptance past the limit on a HELD order is REFUSED, in the rule’s words',
  typeof R.acceptPast === 'string' && R.acceptPast.includes(result.onHoldRule),
  String(R.acceptPast).slice(0, 160)
);
check(
  'the REFUSAL does not fire inside the limit (any decision is valid there)',
  R.acceptInside === null,
  String(R.acceptInside)
);
check(
  'the ALL-REJECTED submission IS the required action — permitted past the limit',
  R.allRejectedPast === null && result.holdPermitted.allRejectedPast === true,
  `refusal: ${String(R.allRejectedPast)} · permitted: ${result.holdPermitted.allRejectedPast}`
);
check(
  'an UNREAD hold state REFUSES NOTHING (nothing is invented from a state we could not read)',
  R.unreadPast === null && result.holdPermitted.allRejectedUnread === false,
  `refusal: ${String(R.unreadPast)}`
);
check(
  'a CLEARED hold refuses nothing',
  R.clearedPast === null,
  String(R.clearedPast)
);
check(
  'the duty does not let an acceptance through by permitting it as a "rejection"',
  result.holdPermitted.acceptPast === false,
  String(result.holdPermitted.acceptPast)
);
check(
  'an order that carries NO hold statement is never refused by the duty in the data layer',
  result.plainPoRefusal === null || result.plainPoRefusal === 'no-unacknowledged-order',
  String(result.plainPoRefusal)
);

/* ── 5. The domain writer, EXECUTED ──────────────────────────────────────── */

console.log('\n§ 5. The writer enforces and RECORDS both duties (executed, not described)\n');
const P = result.partial ?? null;
check(
  'a demo order with undecided lines exists, so this proof is real',
  result.foundFreshPo === true,
  `lines: ${JSON.stringify(result.freshLines)}`
);
if (P) {
  check(
    'an INCOMPLETE submission is accepted AND the channel’s completeness rule is stated to the caller',
    P.ok === true && P.warningsMentionRule === true,
    JSON.stringify({ ok: P.ok, warningsMentionRule: P.warningsMentionRule })
  );
  check(
    'the omitted lines are written as REJECTED — the documented consequence, applied by the real writer',
    P.omittedRejected === true && P.firstLineStatus === 'accepted',
    JSON.stringify({ omittedRejected: P.omittedRejected, firstLine: P.firstLineStatus })
  );
  check(
    'the fact is RECORDED on the order (it could not be derived afterwards)',
    JSON.stringify(P.implicitRecorded) === JSON.stringify(result.freshLines.slice(1)),
    JSON.stringify(P.implicitRecorded)
  );
  check(
    'the audit trail states, in words, that the acknowledgement omitted lines',
    result.partialAudit.namesOmitted === true &&
      JSON.stringify(result.partialAudit.metadataImplicit) === JSON.stringify(result.freshLines.slice(1)),
    JSON.stringify(result.partialAudit)
  );
}

const REC = result.record ?? null;
check(
  'a hold statement is WRITTEN on the order, attributed and labelled simulated',
  result.foundHoldPo === true &&
    REC !== null &&
    REC.ok === true &&
    REC.state === 'declared' &&
    REC.simulated === true,
  JSON.stringify(REC)
);
check(
  'the writer records ONE attributed audit entry for the hold statement',
  REC !== null && REC.auditWritten === true,
  JSON.stringify(REC && REC.auditWritten)
);
check(
  're-recording the same statement writes nothing a second time (idempotent)',
  REC !== null && REC.idempotent === true,
  JSON.stringify(REC && REC.idempotent)
);
check(
  'a statement claiming a LIVE source is REFUSED (there is no live hold read yet)',
  REC !== null &&
    REC.liveRefused &&
    REC.liveRefused.ok === false &&
    /no live channel read/.test(String(REC.liveRefused.error)),
  JSON.stringify(REC && REC.liveRefused)
);
check(
  'an UNDECLARED hold state is refused rather than stored (fail-closed)',
  REC !== null && REC.undeclaredRefused && REC.undeclaredRefused.ok === false,
  JSON.stringify(REC && REC.undeclaredRefused)
);
check(
  'the writer REFUSES an acceptance on a held order past its limit, quoting the rule',
  result.holdAcceptRefused &&
    result.holdAcceptRefused.ok === false &&
    String(result.holdAcceptRefused.error).includes(result.onHoldRule),
  JSON.stringify(result.holdAcceptRefused)
);
check(
  'the writer ACCEPTS the channel-REQUIRED all-rejected submission (the defect this batch fixed)',
  result.holdRejectAccepted &&
    result.holdRejectAccepted.ok === true &&
    result.holdClosedByRejection === true,
  JSON.stringify(result.holdRejectAccepted)
);

/* ── 6. The surfaces consume the owner ───────────────────────────────────── */

console.log('\n§ 6. The surfaces consume the owners — they do not re-implement the rules\n');
const BRAND = 'src/components/brand/BrandPurchaseOrders.tsx';
const ADMIN = 'src/components/admin/AdminPurchaseOrderList.tsx';
const brand = code(BRAND);
check(
  'the brand surface renders the hold duty from its owner (statement + rule)',
  brand.includes('poChannelHoldDuty(') && brand.includes('duty.ruleText') && brand.includes('duty.statement'),
  'brand surface does not compose the owner'
);
check(
  'the brand surface derives completeness from its owner BEFORE submission',
  brand.includes('poAcknowledgementCompleteness('),
  'brand surface does not ask the completeness owner'
);
check(
  'the brand surface does not re-type either rule',
  !brand.includes('must be rejected once its 24-hour limit has passed') &&
    !brand.includes('requires a complete acknowledgement covering every line'),
  'a rule was re-typed on the surface'
);
check(
  'the channel hold is REACHABLE from the console, through the ONE recorder, labelled simulated',
  code(ADMIN).includes('recordChannelPurchaseOrderHold(') &&
    code(ADMIN).includes('admin-po-simulate-hold') &&
    code(ADMIN).includes("ingestResult?.mode !== 'mock'"),
  'admin control does not exist or is not guarded'
);
check(
  'each rule statement is declared EXACTLY ONCE in `src/` (the config owner)',
  countInSrc('A purchase order the retail channel has placed on hold must be rejected') === 1 &&
    countInSrc('The retail channel requires a complete acknowledgement') === 1,
  `hold: ${countInSrc('A purchase order the retail channel has placed on hold must be rejected')} · completeness: ${countInSrc('The retail channel requires a complete acknowledgement')}`
);
check(
  'the window owner declares the hold duty from the config (no second copy of the wording)',
  code(WINDOW_OWNER).includes('PO_ON_HOLD_REJECT_RULE_TEXT'),
  'the window owner re-typed the rule'
);

/* ── 7. No network ───────────────────────────────────────────────────────── */

console.log('\n§ 7. Zero live network calls\n');
check(
  'the executed bundle made no live network call (fetch sabotaged, never needed)',
  result.network === 'sabotaged',
  String(result.network)
);

console.log('');
if (fail === 0) {
  console.log(`PO_ACK_DUTIES_VALIDATION_PASS (${pass} passed, 0 failed)`);
  process.exit(0);
}
console.log(`PO_ACK_DUTIES_VALIDATION_FAIL (${pass} passed, ${fail} failed)`);
for (const e of errors) console.log(`  ✗ ${e}`);
process.exit(1);
