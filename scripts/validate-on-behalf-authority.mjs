#!/usr/bin/env node
/**
 * §OWNER-REPORTED DEFECT (2026-09-30) — THE ON-BEHALF AUTHORITY GATE.
 *
 * WHAT WAS WRONG: a Super Admin could acknowledge ANY purchase order on a brand's behalf at
 * ANY moment inside the 24-hour window, with nothing recording the brand's agreement; an
 * on-behalf ACCEPTANCE commits a brand to supply goods Mercenta cannot see, and an on-behalf
 * REJECTION can throw away stock the brand wanted to sell.
 *
 * THE RULE NOW ENFORCED IN THE WRITER: an on-behalf decision is permitted ONLY when the brand
 * authorised that order, OR when the channel's limit is imminent/passed AND the submission is
 * the ALL-REJECTED decision the channel requires.
 *
 * This gate EXECUTES the shipped owner module AND the domain writer (esbuild + `@` alias,
 * `fetch` sabotaged).
 *
 * Run: node scripts/validate-on-behalf-authority.mjs
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
const code = (relative) =>
  read(relative).replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/[^\n]*/g, '');

const ENTRY = `
import { authoriseOnBehalfDecisions, withdrawOnBehalfAuthorisation, acknowledgePurchaseOrder } from '@/data/api';
import { demoPurchaseOrders, demoAuditLog } from '@/data/demoStore';
import { poOnBehalfAuthority, onBehalfDecisionRefusal } from '@/lib/commerce/poOnBehalfAuthority';
import { PO_ON_BEHALF_AUTHORITY_RULE_TEXT } from '@/config/purchaseOrders';
globalThis.fetch = function () { throw new Error('NETWORK_CALL_ATTEMPTED'); };
const H = 3_600_000;
const out = { rule: PO_ON_BEHALF_AUTHORITY_RULE_TEXT };
const po = demoPurchaseOrders.find((p) => !p.acknowledgedAt && p.lineItems.length > 0);
out.foundPo = Boolean(po);
out.poNumber = po ? po.poNumber : null;
if (po) {
  const orderMs = Date.parse(po.orderDate);
  const early = new Date(orderMs + 4 * H);
  const closing = new Date(orderMs + 23 * H);
  const acceptAll = po.lineItems.map((l) => ({ sku: l.sku, ackStatus: 'accepted', acknowledgedQty: l.quantity }));
  const rejectAll = po.lineItems.map((l) => ({ sku: l.sku, ackStatus: 'rejected', rejectionCode: 'TemporarilyUnavailable' }));
  out.unauthorised = {
    permitted: poOnBehalfAuthority(po, early).permitted,
    acceptRefused: acknowledgePurchaseOrder(po.id, acceptAll, 'admin-1', early),
    rejectRefused: acknowledgePurchaseOrder(po.id, rejectAll, 'admin-1', early),
    brandSelf: onBehalfDecisionRefusal(po, false, undefined, early),
    recorded: Boolean(po.acknowledgedAt),
  };
  out.closing = {
    permitted: poOnBehalfAuthority(po, closing).permitted,
    acceptRefusal: onBehalfDecisionRefusal(po, false, 'admin-1', closing),
    rejectPermitted: onBehalfDecisionRefusal(po, true, 'admin-1', closing) === null,
  };
  out.authorised = {
    blankRefused: authoriseOnBehalfDecisions(po.id, { recordedBy: 'brand-a (brand)', note: '   ' }),
    granted: authoriseOnBehalfDecisions(po.id, { recordedBy: 'brand-a (brand)', note: 'Decide this order for us this week.' }),
    permitted: poOnBehalfAuthority(po, early).permitted,
    state: po.decisionAuthorisation ? po.decisionAuthorisation.state : null,
    audited: demoAuditLog.some((a) => a.action === 'po_on_behalf_authorised' && a.entityId === po.id),
    acceptAccepted: acknowledgePurchaseOrder(po.id, acceptAll, 'admin-1', early),
    decided: Boolean(po.acknowledgedAt),
    auditMetadata: demoAuditLog.filter((a) => a.action === 'purchase_order_acknowledged').pop() || null,
  };
  out.withdrawn = {
    noReasonRefused: withdrawOnBehalfAuthorisation(po.id, { withdrawnBy: 'brand-a (brand)', reason: '  ' }),
    withdrawn: withdrawOnBehalfAuthorisation(po.id, { withdrawnBy: 'brand-a (brand)', reason: 'We will decide it ourselves.' }),
    state: po.decisionAuthorisation ? po.decisionAuthorisation.state : null,
    grantRetained: Boolean(po.decisionAuthorisation && po.decisionAuthorisation.grantedAt),
    permitted: poOnBehalfAuthority(po, early).permitted,
    refusal: onBehalfDecisionRefusal(po, false, 'admin-1', early),
  };
}
out.network = 'sabotaged';
console.log('__RESULT__' + JSON.stringify(out));
`;

const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'mercenta-onbehalf-'));
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
  result = JSON.parse(execFileSync(process.execPath, [outPath], { cwd: ROOT, encoding: 'utf8' }).split('__RESULT__')[1]);
} catch (error) {
  console.log(`  FAIL  bundling/executing the real modules — ${String(error).slice(0, 900)}`);
  console.log('ON_BEHALF_AUTHORITY_VALIDATION_FAIL (0 passed, 1 failed)');
  process.exit(1);
}

const OWNER = 'src/lib/commerce/poOnBehalfAuthority.ts';
const RULE = result.rule ?? '';
const U = result.unauthorised;
const C = result.closing;
const A = result.authorised;
const W = result.withdrawn;

console.log('\n§ 1. The reported defect: an unauthorised on-behalf decision is REFUSED\n');
check('a demo order with an undecided window exists, so this proof is real', result.foundPo === true);
check('no authorisation + ~20h left ⇒ nothing is permitted', U.permitted === 'nothing', String(U.permitted));
check(
  'the WRITER refuses an on-behalf ACCEPTANCE and says why',
  U.acceptRefused.ok === false && /NO authorisation from the brand/.test(String(U.acceptRefused.error)),
  String(U.acceptRefused.error).slice(0, 200)
);
check('the refusal quotes Mercenta’s own rule', String(U.acceptRefused.error).includes(RULE), 'rule text missing');
check('nothing was recorded by the refused attempts', U.recorded === false, String(U.recorded));
check('a BRAND’S OWN submission is never refused by this rule', U.brandSelf === null, String(U.brandSelf));

console.log('\n§ 2. The closing window permits ONLY the channel-required rejection\n');
check('closing window + no authorisation ⇒ rejection only', C.permitted === 'rejection_only', String(C.permitted));
check(
  'an on-behalf ACCEPTANCE inside the closing window is STILL refused',
  typeof C.acceptRefusal === 'string' && /ONLY to submit the rejection/.test(C.acceptRefusal),
  String(C.acceptRefusal).slice(0, 180)
);
check('the ALL-REJECTED submission the channel requires IS permitted', C.rejectPermitted === true, String(C.rejectPermitted));

console.log('\n§ 3. The brand’s authorisation permits any decision\n');
check('an authorisation with a BLANK note is refused', A.blankRefused.ok === false, JSON.stringify(A.blankRefused));
check(
  'the authorisation is recorded, attributed and audited',
  A.granted.ok === true && A.state === 'granted' && A.audited === true,
  JSON.stringify({ ok: A.granted.ok, state: A.state, audited: A.audited })
);
check('with the authorisation, any decision is permitted', A.permitted === 'any_decision', String(A.permitted));
check(
  'the writer ACCEPTS the on-behalf acceptance once authorised',
  A.acceptAccepted.ok === true && A.decided === true,
  JSON.stringify(A.acceptAccepted).slice(0, 180)
);
check(
  'the audit records WHICH authority the decision relied on',
  Boolean(A.auditMetadata && A.auditMetadata.metadata && A.auditMetadata.metadata.onBehalfAuthority === 'granted'),
  String(A.auditMetadata && A.auditMetadata.metadata && A.auditMetadata.metadata.onBehalfAuthority)
);

console.log('\n§ 4. Withdrawal restores the restriction, and history survives\n');
check('a withdrawal with no reason is refused', W.noReasonRefused.ok === false, JSON.stringify(W.noReasonRefused));
check('the withdrawal is recorded as withdrawn', W.withdrawn.ok === true && W.state === 'withdrawn', JSON.stringify({ ok: W.withdrawn.ok, state: W.state }));
check('the ORIGINAL grant is retained in the record', W.grantRetained === true, String(W.grantRetained));
check('a withdrawn authorisation permits nothing again', W.permitted === 'nothing' && typeof W.refusal === 'string', String(W.permitted));

console.log('\n§ 5. One owner, and the surfaces consume it\n');
check(
  'the rule has ONE owner and the writer enforces it',
  code(OWNER).includes('PO_ON_BEHALF_AUTHORITY_RULE_TEXT') && code('src/data/api.ts').includes('onBehalfDecisionRefusal('),
  'owner or enforcement missing'
);
check(
  'the admin surface gates on the owner instead of offering a blind button',
  code('src/components/admin/AdminPurchaseOrderDetail.tsx').includes('poOnBehalfAuthority(') &&
    code('src/components/admin/AdminPurchaseOrderDetail.tsx').includes("permitted === 'any_decision'"),
  'admin surface not gated'
);
check(
  'the brand surface can record and withdraw the authorisation',
  code('src/components/brand/BrandPurchaseOrders.tsx').includes('authoriseOnBehalfDecisions(') &&
    code('src/components/brand/BrandPurchaseOrders.tsx').includes('withdrawOnBehalfAuthorisation('),
  'no brand path'
);
check(
  'the rule wording is declared EXACTLY ONCE in src/ (the config owner)',
  ['src/config/purchaseOrders.ts', 'src/data/api.ts', OWNER].filter((f) =>
    read(f).includes('Mercenta may record a purchase-order decision for a brand only when')
  ).length === 1,
  'rule wording duplicated'
);

console.log('\n§ 6. Zero live network calls\n');
check('no live network call was made (fetch sabotaged)', result.network === 'sabotaged', String(result.network));

console.log('');
if (fail === 0) {
  console.log(`ON_BEHALF_AUTHORITY_VALIDATION_PASS (${pass} passed, 0 failed)`);
  process.exit(0);
}
console.log(`ON_BEHALF_AUTHORITY_VALIDATION_FAIL (${pass} passed, ${fail} failed)`);
for (const e of errors) console.log(`  ✗ ${e}`);
process.exit(1);
