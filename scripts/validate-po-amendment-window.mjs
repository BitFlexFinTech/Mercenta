#!/usr/bin/env node
/**
 * §BATCH 2b (`AV-006`) — THE PO AMENDMENT-WINDOW GATE.
 *
 * WHY THIS EXISTS
 * ---------------
 * The Phase 0A audit registered `AV-006`: the channel's documented 48-hour UPDATE
 * window was not modelled at all, so Mercenta could not tell a brand its real
 * obligation — and, worse, the writer refused ANY second acknowledgement outright,
 * an over-restriction Mercenta had invented. The documented rule is:
 *
 *   "You must submit an updated acknowledgment within 48 hours for any changes to
 *    quantity, price, ship dates, or delivery dates… After 48 hours, we only expect
 *    to receive updates to ship dates or delivery dates."
 *
 * Correction alone is not the fix — a later edit could put the old behaviour back.
 * This gate is the fix. It EXECUTES the shipped modules (bundled with the project's
 * own esbuild through its own `@` alias), so it asserts the RUNNING behaviour
 * rather than a pattern match, and fails if:
 *
 *   1  the window is not 48h from the order, or the number gains a second owner;
 *   2  the declared change groups are not the documented four, or the after-window
 *      set is not exactly ship dates + delivery dates;
 *   3  an unreadable order date is treated as "still open" (it must fail closed);
 *   4  a quantity or price change past the window is ACCEPTED;
 *   5  a schedule change past the window, or a quantity change inside it, is
 *      REFUSED;
 *   6  the domain writer still refuses every second acknowledgement (the invented
 *      over-restriction), or no longer records an amendment as an amendment;
 *   7  the ONE rule statement is not rendered by the brand surface, or the surface
 *      re-types the rule instead of importing it.
 *
 * Run: node scripts/validate-po-amendment-window.mjs
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

/* ── Bundle the REAL modules and execute them (no re-implementation) ─────── */

const ENTRY = `
import { acknowledgePurchaseOrder } from '@/data/api';
import { demoPurchaseOrders } from '@/data/demoStore';
import {
  poAmendmentWindow, poAmendmentDeadline, amendmentRefusal, amendmentChangedGroups, amendableGroupLabel,
} from '@/lib/commerce/poAcknowledgementWindow';
import {
  PO_ACK_UPDATE_WINDOW_HOURS, PO_AMENDABLE_FIELD_GROUPS, PO_AMENDABLE_FIELD_GROUPS_AFTER_WINDOW,
  PO_AMENDMENT_WINDOW_RULE_TEXT, PO_ACK_ONBOARDING_STATEMENT,
} from '@/config/purchaseOrders';

globalThis.fetch = () => { throw new Error('NETWORK_CALL_ATTEMPTED'); };

const out = {};
const H = 3_600_000;
const T = '2026-01-10T00:00:00.000Z';
const Tms = Date.parse(T);
const synthetic = {
  orderDate: T,
  poNumber: 'PO-TEST',
  lineItems: [
    { sku: 'S1', quantity: 10, unitPrice: 5, commodityCode: 'x', acknowledgedQty: 10, ackStatus: 'accepted' },
  ],
};

/* ── 1-3. The declared rule and the pure derivation ─────────────────────── */
out.hours = PO_ACK_UPDATE_WINDOW_HOURS;
out.deadline = poAmendmentDeadline({ orderDate: T });
out.inside = poAmendmentWindow({ orderDate: T }, new Date(Tms + 47 * H));
out.after = poAmendmentWindow({ orderDate: T }, new Date(Tms + 49 * H));
out.unknown = poAmendmentWindow({ orderDate: 'not-a-date' }, new Date(Tms));
out.groups = [...PO_AMENDABLE_FIELD_GROUPS];
out.groupsAfter = [...PO_AMENDABLE_FIELD_GROUPS_AFTER_WINDOW];
out.labels = PO_AMENDABLE_FIELD_GROUPS.map((g) => amendableGroupLabel(g));
out.ruleText = PO_AMENDMENT_WINDOW_RULE_TEXT;
out.statementAmend = PO_ACK_ONBOARDING_STATEMENT.amendmentText;
out.statementText = PO_ACK_ONBOARDING_STATEMENT.text;

/* ── 4-5. The enforced refusal ──────────────────────────────────────────── */
out.refusalQtyAfter = amendmentRefusal(synthetic, [{ sku: 'S1', acknowledgedQty: 5 }], new Date(Tms + 49 * H));
out.refusalPriceAfter = amendmentRefusal(synthetic, [{ sku: 'S1', unitPrice: 4 }], new Date(Tms + 49 * H));
out.refusalQtyInside = amendmentRefusal(synthetic, [{ sku: 'S1', acknowledgedQty: 5 }], new Date(Tms + 47 * H));
out.refusalShipAfter = amendmentRefusal(synthetic, [{ sku: 'S1', scheduledShipDate: '2026-02-01' }], new Date(Tms + 49 * H));
out.changedQty = amendmentChangedGroups(synthetic, [{ sku: 'S1', acknowledgedQty: 5 }]);
out.changedNone = amendmentChangedGroups(synthetic, [{ sku: 'S1', acknowledgedQty: 10 }]);

/* ── 6. The domain boundary ─────────────────────────────────────────────── */
const po = demoPurchaseOrders.find((p) => p.lineItems.some((l) => l.isBackOrderAllowed === true));
out.foundPo = Boolean(po);
if (po) {
  const orderMs = Date.parse(po.orderDate);
  const line = po.lineItems[0];
  const acceptedAll = po.lineItems.map((l) => ({ sku: l.sku, ackStatus: 'accepted', acknowledgedQty: l.quantity }));
  out.firstAck = acknowledgePurchaseOrder(po.id, acceptedAll);
  out.firstAckInstant = po.acknowledgedAt || null;

  const insideNow = new Date(orderMs + 30 * H);
  out.qtyInside = acknowledgePurchaseOrder(
    po.id,
    [{ sku: line.sku, acknowledgedQty: line.quantity - 10 }, ...acceptedAll.slice(1)],
    undefined,
    insideNow
  );
  out.historyInside = line.ackHistory[line.ackHistory.length - 1] || null;
  out.lastAmendedAt = po.lastAmendedAt || null;
  out.firstAckInstantUnchanged = po.acknowledgedAt === out.firstAckInstant;

  const pastNow = new Date(orderMs + 49 * H);
  out.qtyPast = acknowledgePurchaseOrder(
    po.id,
    [{ sku: line.sku, acknowledgedQty: line.quantity - 20 }, ...acceptedAll.slice(1)],
    undefined,
    pastNow
  );
  out.shipPast = acknowledgePurchaseOrder(
    po.id,
    [{ sku: line.sku, acknowledgedQty: line.quantity - 10, scheduledShipDate: '2026-03-01' }, ...acceptedAll.slice(1)],
    undefined,
    pastNow
  );
}

console.log('__RESULT__' + JSON.stringify(out));
`;

/* ── Execute the bundle (project's own esbuild + `@` alias) ─────────────── */

const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'mercenta-amend-'));
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
  console.log('PO_AMENDMENT_WINDOW_VALIDATION_FAIL (0 passed, 1 failed)');
  process.exit(1);
}

const H = 3_600_000;
const T = '2026-01-10T00:00:00.000Z';

console.log('\n§ 1-2. The declared window and its ONE owner\n');
check('the update window is declared as the documented 48 hours', R.hours === 48, `hours=${R.hours}`);
check(
  'the update deadline is the order instant + the declared window',
  R.deadline === new Date(Date.parse(T) + 48 * H).toISOString(),
  R.deadline
);
const srcFiles = [];
(function walk(dir) {
  for (const entry of fs.readdirSync(path.join(ROOT, dir))) {
    const rel = `${dir}/${entry}`;
    const st = fs.statSync(path.join(ROOT, rel));
    if (st.isDirectory()) walk(rel);
    else if (/\.(ts|tsx)$/.test(entry)) srcFiles.push(rel);
  }
})('src');
const srcAll = srcFiles.map((p) => fs.readFileSync(path.join(ROOT, p), 'utf8')).join('\n');
const declCount = (srcAll.match(/PO_ACK_UPDATE_WINDOW_HOURS\s*=\s*48\b/g) || []).length;
check('the number 48 for the update window is declared exactly once in src/', declCount === 1, `count=${declCount}`);
check(
  'the declared change groups are the documented four',
  R.groups.length === 4 &&
    ['quantity', 'price', 'ship_dates', 'delivery_dates'].every((g) => R.groups.includes(g)),
  JSON.stringify(R.groups)
);
check(
  'after the window only ship dates + delivery dates are expected',
  R.groupsAfter.length === 2 && R.groupsAfter.includes('ship_dates') && R.groupsAfter.includes('delivery_dates'),
  JSON.stringify(R.groupsAfter)
);
check('every change group has a non-empty label', R.labels.every((l) => typeof l === 'string' && l.length > 0));

console.log('\n§ 3. Fail closed on an unreadable window\n');
check('an unreadable order date fails closed (unknown, not open)', R.unknown.unknown === true && R.unknown.open === false);
check(
  'an unreadable window permits NO change group at all',
  Array.isArray(R.unknown.permittedChangeGroups) && R.unknown.permittedChangeGroups.length === 0,
  JSON.stringify(R.unknown.permittedChangeGroups)
);

console.log('\n§ 4-5. The enforced update rule\n');
check('inside the window every group is permitted', R.inside.open === true && R.inside.permittedChangeGroups.length === 4);
check('past the window the window is closed and only schedule groups remain', R.after.open === false && R.after.permittedChangeGroups.length === 2);
check('a QUANTITY change past the window is REFUSED', typeof R.refusalQtyAfter === 'string' && /quantity/i.test(R.refusalQtyAfter), String(R.refusalQtyAfter));
check('a PRICE change past the window is REFUSED', typeof R.refusalPriceAfter === 'string' && /price/i.test(R.refusalPriceAfter), String(R.refusalPriceAfter));
check('a quantity change INSIDE the window is ACCEPTED', R.refusalQtyInside === null, String(R.refusalQtyInside));
check('a SCHEDULE change past the window is ACCEPTED', R.refusalShipAfter === null, String(R.refusalShipAfter));
check('the change detector reports the changed group', JSON.stringify(R.changedQty) === '["quantity"]', JSON.stringify(R.changedQty));
check('the change detector reports nothing for a no-op submission', R.changedNone.length === 0, JSON.stringify(R.changedNone));

console.log('\n§ 6. The domain boundary (the real writer)\n');
check('a purchase order with a channel-allowed line was found', R.foundPo === true);
check('the FIRST acknowledgement still succeeds', R.firstAck?.ok === true, JSON.stringify(R.firstAck));
check('a genuine quantity change inside the window is APPLIED (not refused as a duplicate)', R.qtyInside?.ok === true, JSON.stringify(R.qtyInside));
check(
  'the applied change is recorded as an AMENDMENT inside the update window',
  R.historyInside?.amended === true && R.historyInside?.withinUpdateWindow === true,
  JSON.stringify(R.historyInside)
);
check('the amendment records its own instant', typeof R.lastAmendedAt === 'string', String(R.lastAmendedAt));
check('the FIRST decision instant is never overwritten by an amendment', R.firstAckInstantUnchanged === true, String(R.firstAckInstantUnchanged));
check('a quantity change PAST the window is REFUSED by the writer', R.qtyPast?.ok === false && /quantity/i.test(R.qtyPast?.error || ''), JSON.stringify(R.qtyPast));
check('a schedule change PAST the window is ACCEPTED', R.shipPast?.ok === true, JSON.stringify(R.shipPast));

console.log('\n§ 7. The ONE rule statement is rendered (not re-typed)\n');
check('the rule statement names the declared window', R.ruleText.includes('48 hours'), R.ruleText);
check('the onboarding statement carries the amendment rule verbatim', R.statementAmend === R.ruleText);
check('the onboarding paragraph includes the amendment rule', R.statementText.includes(R.ruleText));
const BRAND_SURFACE = 'src/components/brand/BrandPurchaseOrders.tsx';
const brandSrc = fs.readFileSync(path.join(ROOT, BRAND_SURFACE), 'utf8');
check('the brand surface imports the rule from its owner', /PO_AMENDMENT_WINDOW_RULE_TEXT/.test(brandSrc));
check('the brand surface renders the owner rule', /\{\s*PO_AMENDMENT_WINDOW_RULE_TEXT\s*\}/.test(brandSrc));
check(
  'the brand surface offers an amend control gated by the derived update window',
  /poAmendmentWindow\(po\)\.open/.test(brandSrc) && /Amend acknowledgement/.test(brandSrc)
);
const GUIDANCE = 'src/components/shared/BrandGuidance.tsx';
const guidanceSrc = fs.readFileSync(path.join(ROOT, GUIDANCE), 'utf8');
check('Operational Guidance renders the amendment rule from the owner', guidanceSrc.includes('PO_ACK_ONBOARDING_STATEMENT.amendmentText'));

console.log('');
if (fail === 0) {
  console.log(`PO_AMENDMENT_WINDOW_VALIDATION_PASS (${pass} passed, 0 failed)`);
  process.exit(0);
}
console.log(`PO_AMENDMENT_WINDOW_VALIDATION_FAIL (${pass} passed, ${fail} failed)`);
for (const e of errors) console.log(`  · ${e}`);
process.exit(1);
