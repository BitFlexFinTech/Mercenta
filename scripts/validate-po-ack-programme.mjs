/**
 * §S10 — THE PO-ACK PROGRAMME'S CLOSING INVENTORY GATE.
 *
 * Programme: `docs/SPRINT_PO_ACKNOWLEDGEMENT_2026-09-24.md` (stage row
 * "SEED / gates / deploy (final pass)").
 *
 * S1–S9 each shipped its own gate. This gate is the INVENTORY that makes the
 * set auditable as ONE programme, and it exists because a stage gate that is
 * not registered, was emptied, or no longer names its stage is not a gate —
 * and nothing else in the repository would notice.
 *
 * Asserted, against the real files and the real modules (no mocks, zero network
 * calls — `fetch` is sabotaged before any module loads):
 *   1  the ten-stage table exists, is a TEN-row table, and S1–S9 are DONE;
 *   2  every stage's gate FILE exists on disk;
 *   3  every stage's gate is REGISTERED as a `validate:*` npm script and that
 *      script really runs the file;
 *   4  every gate really asserts (a non-zero assertion count, above a floor) and
 *      NAMES its own stage;
 *   5  the live-verification script carries the programme's live legs (S3–S10),
 *      so the deployed leg of the contract is part of the inventory;
 *   6  the ONE-OWNER invariants still hold: the config owner declares the rule,
 *      the pure owner derives it, the surfaces render the owner's statement, and
 *      no module outside the owner re-declares a window constant;
 *   7  the SEED inventory recorded by the closing pass: the seeded channel POs
 *      still carry NO simulation provenance (`types.ts`: unknown provenance is
 *      never re-labelled as simulation), the E4 eligibility seed still resolves
 *      positively (so the operational-simulation control is genuinely operable in
 *      the deployed demo), and the acquisition/onboarding stores boot empty, as
 *      the S8 record states.
 *
 * Run: node scripts/validate-po-ack-programme.mjs
 */
import { createServer } from 'vite';
import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

/* ── Zero-network guard: an inventory gate must never reach the network ─────── */

let fetchCalls = 0;
globalThis.fetch = () => {
  fetchCalls++;
  throw new Error('NETWORK_CALL_ATTEMPTED');
};

let pass = 0;
let fail = 0;
const failures = [];
function check(name, ok, detail = '') {
  if (ok) {
    pass++;
    console.log(`  PASS  ${name}`);
  } else {
    fail++;
    failures.push(`${name}${detail ? ` — ${detail}` : ''}`);
    console.log(`  FAIL  ${name}${detail ? ` — ${detail}` : ''}`);
  }
}

const readSrc = (rel) => readFileSync(path.join(ROOT, rel), 'utf8');
const stripComments = (s) => s.replace(/\/\*[\s\S]*?\*\//g, ' ').replace(/\/\/[^\n]*/g, ' ');
const codeOf = (rel) => stripComments(readSrc(rel));
const exists = (rel) => existsSync(path.join(ROOT, rel));

/** Every source file under src/, so a duplicate declaration cannot hide. */
function walk(dir, out = []) {
  for (const entry of readdirSync(path.join(ROOT, dir))) {
    const rel = `${dir}/${entry}`;
    const st = statSync(path.join(ROOT, rel));
    if (st.isDirectory()) walk(rel, out);
    else if (/\.(ts|tsx)$/.test(entry)) out.push(rel);
  }
  return out;
}
/* ── 1. THE STAGE INVENTORY (the programme's own declared set) ──────────────── */

const PROGRAMME_DOC = 'docs/SPRINT_PO_ACKNOWLEDGEMENT_2026-09-24.md';

/**
 * The ten stages, each with the gate it shipped and the npm script that runs it.
 * `markers` is what the gate file must contain to prove it NAMES its stage: S1's
 * gate predates the per-stage prefix and is marked `§P13`; S9's is marked `§S9`.
 */
const STAGES = [
  { stage: 'S1', scope: 'the window owner', file: 'scripts/validate-po-acknowledgement-window.mjs', npm: 'validate:po-ack-window', markers: ['§P13'] },
  { stage: 'S2', scope: 'domain enforcement + the on-behalf rejection', file: 'scripts/validate-po-acknowledgement-enforcement.mjs', npm: 'validate:po-ack-enforcement', markers: ['§P13 / S2'] },
  { stage: 'S3', scope: 'the work layer consumes the owner', file: 'scripts/validate-po-acknowledgement-work.mjs', npm: 'validate:po-ack-work', markers: ['§P13 / S3'] },
  { stage: 'S4', scope: 'the on-behalf draft + the approval', file: 'scripts/validate-po-acknowledgement-on-behalf.mjs', npm: 'validate:po-ack-on-behalf', markers: ['§P13 / S4'] },
  { stage: 'S5', scope: 'all-channel fan-out + the instant-message seam', file: 'scripts/validate-po-acknowledgement-notifications.mjs', npm: 'validate:po-ack-notifications', markers: ['§P13 / S5'] },
  { stage: 'S6', scope: 'the brand surfaces', file: 'scripts/validate-po-acknowledgement-brand-surfaces.mjs', npm: 'validate:po-ack-brand', markers: ['§P13 / S6'] },
  { stage: 'S7', scope: 'the admin surfaces', file: 'scripts/validate-po-acknowledgement-admin-surfaces.mjs', npm: 'validate:po-ack-admin', markers: ['§P13 / S7'] },
  { stage: 'S8', scope: 'the onboarding surfaces + the canonical LINK', file: 'scripts/validate-po-acknowledgement-onboarding-surfaces.mjs', npm: 'validate:po-ack-onboarding', markers: ['§P13 / S8'] },
  { stage: 'S9', scope: 'receipt → invoice automation', file: 'scripts/validate-receipt-invoice-automation.mjs', npm: 'validate:receipt-invoice', markers: ['§S9'] },
  { stage: 'S10', scope: 'seed / gates / deploy (the closing pass)', file: 'scripts/validate-po-ack-programme.mjs', npm: 'validate:po-ack-programme', markers: ['§S10'] },
];

/* ── 1a. The programme document's own stage table ──────────────────────────── */

const doc = readSrc(PROGRAMME_DOC);
const docRows = doc.split('\n').filter((l) => /^\|\s\*\*S(10|[1-9])\*\*\s\|/.test(l));
check(
  'the programme doc declares a TEN-row stage table',
  docRows.length === 10,
  `${docRows.length} row(s)`
);
const stageRows = docRows.map((row) => {
  const m = row.match(/^\|\s*\*\*(S(?:10|[1-9]))\*\*\s*\|\s*(.*?)\s*\|\s*(.*?)\s*\|$/);
  return m ? { stage: m[1], scope: m[2], status: m[3] } : null;
});
check(
  'every stage row (S1…S10) parses with a scope and a status',
  stageRows.every((r) => r && r.scope && r.status),
  stageRows.filter((r) => !r).length ? 'an unparsable row exists' : ''
);
for (const row of stageRows.filter(Boolean).filter((r) => r.stage !== 'S10')) {
  check(`the doc records ${row.stage} as DONE`, /DONE/.test(row.status), row.status);
}
check(
  'the doc records S10 as IN PROGRESS or DONE (never NOT STARTED once implemented)',
  stageRows.some((r) => r && r.stage === 'S10' && /IN PROGRESS|DONE/.test(r.status)),
  stageRows.find((r) => r && r.stage === 'S10')?.status ?? 'S10 row missing'
);
check('the doc carries an §S10 section recording the closing pass', /^## S10 —/m.test(doc));

/* ── 1b. The contract the closing pass fixed from the repository ───────────── */

check(
  'the §S10 contract records WHY no seed fixture is fabricated for the two empty-at-boot states',
  /unknown provenance is never[\s\S]{0,80}re-labelled as simulation/.test(doc) &&
    /no-op, so their behaviour is[\s\S]{0,20}unchanged/.test(doc)
);

/* ── 2. Every stage's gate FILE exists ─────────────────────────────────────── */

for (const s of STAGES) {
  check(`${s.stage} ships a gate file (${s.file})`, exists(s.file));
}

/* ── 3. Every gate is REGISTERED and the script really runs the file ───────── */

const pkg = JSON.parse(readSrc('package.json'));
for (const s of STAGES) {
  const script = pkg.scripts?.[s.npm];
  check(
    `${s.stage}'s gate is registered as \`npm run ${s.npm}\``,
    typeof script === 'string' && script.includes(s.file),
    script ? `script runs: ${script}` : 'not registered'
  );
}
check(
  'no two stages share a gate file (the inventory cannot double-count one gate)',
  new Set(STAGES.map((s) => s.file)).size === STAGES.length
);

/* ── 4. Every gate really ASSERTS, and NAMES its own stage ────────────────── */

const ASSERTION_FLOOR = 20;
for (const s of STAGES) {
  const code = exists(s.file) ? codeOf(s.file) : '';
  const count = (code.match(/(?:^|\n)\s*(?:test|check)\(/g) || []).length;
  check(
    `${s.stage}'s gate asserts a non-trivial number of checks (${count} ≥ ${ASSERTION_FLOOR})`,
    count >= ASSERTION_FLOOR,
    `${count} assertion call(s) found`
  );
  check(
    `${s.stage}'s gate NAMES its stage (${s.markers.join(' / ')})`,
    exists(s.file) && s.markers.some((m) => readSrc(s.file).includes(m))
  );
}

/* ── 5. The live-verification script carries the programme's live legs ─────── */

const LIVE = 'scripts/verify-demo-live.mjs';
const liveCode = codeOf(LIVE);
check('the live-verification script exists', exists(LIVE));
check("the live script carries the programme's live-leg prefix (§P13)", liveCode.includes('§P13'));
for (const stage of ['S3', 'S4', 'S5', 'S6', 'S7', 'S8', 'S9', 'S10']) {
  check(
    `the deployed live run carries the ${stage} legs`,
    liveCode.includes(`§P13/${stage}`) || liveCode.includes(`§${stage}`)
  );
}
check(
  'the live script asserts a substantial number of checks (the whole-programme run)',
  (liveCode.match(/check\(/g) || []).length >= 150,
  `${(liveCode.match(/check\(/g) || []).length} check(s)`
);
/* ── 6. THE ONE-OWNER INVARIANTS (against the REAL modules) ────────────────── */

const server = await createServer({ server: { middlewareMode: true }, logLevel: 'error' });
const cfg = await server.ssrLoadModule('/src/config/purchaseOrders.ts');
const win = await server.ssrLoadModule('/src/lib/commerce/poAcknowledgementWindow.ts');
const automation = await server.ssrLoadModule('/src/lib/commerce/receiptInvoiceAutomation.ts');
const typesMod = await server.ssrLoadModule('/src/types.ts');
const demoStore = await server.ssrLoadModule('/src/data/demoStore.ts');
const demoData = await server.ssrLoadModule('/src/data/demoData.ts');
const acquisition = await server.ssrLoadModule('/src/data/acquisitionStore.ts');
const commerce = await server.ssrLoadModule('/src/lib/commerce/commerceLifecycle.ts');

/* 6a — the declarations are the documented channel facts, unchanged. */
check('the config owner declares the documented 24-hour window', cfg.PO_ACKNOWLEDGEMENT_HOURS === 24);
check('the config owner declares the 48-hour update window', cfg.PO_ACK_UPDATE_WINDOW_HOURS === 48);
check(
  'the notification schedule is the DECLARED schedule (scheduling, not a channel rule)',
  Array.isArray(cfg.PO_ACK_NOTIFICATION_HOURS) &&
    cfg.PO_ACK_NOTIFICATION_HOURS.join(',') === '12,6,2' &&
    cfg.PO_ACK_ON_BEHALF_WINDOW_HOURS === 2
);
check(
  'the auto-rejection reason is one of the channel DOCUMENTED codes (never a fourth)',
  typesMod.PO_REJECTION_CODES.includes(cfg.PO_ACK_AUTO_REJECT_REASON) &&
    typesMod.PO_REJECTION_CODES.length === 3
);
check(
  'the obligation family is the two `New` statuses the channel documents',
  Array.isArray(cfg.PO_ACK_STATUSES_WITH_OBLIGATION) &&
    cfg.PO_ACK_STATUSES_WITH_OBLIGATION.join(',') === 'received,under_review'
);
check(
  'the brand-facing statement is DERIVED from the declarations, not re-typed',
  cfg.PO_ACK_ONBOARDING_STATEMENT.ruleText === cfg.PO_ACK_WINDOW_RULE_TEXT &&
    cfg.PO_ACK_ONBOARDING_STATEMENT.rejectionCodes === typesMod.PO_REJECTION_CODES
);

/* 6b — the PURE owner really derives the rule (not merely declares it). */
const HOUR = 3_600_000;
const base = '2026-06-01T00:00:00.000Z';
const poAt = (orderDate, extra = {}) => ({
  id: 'po-inventory', brandId: 'brand-astonish', poNumber: 'PO-INV-1', status: 'received',
  poValue: 100, commissionRate: 10, commissionAmount: 10, orderDate, lineItems: [], ...extra,
});
check(
  'the derived deadline is orderDate + the declared window',
  win.poAcknowledgementDeadline(poAt(base)) === new Date(new Date(base).getTime() + 24 * HOUR).toISOString()
);
const insideClosing = win.poAcknowledgementWindow(
  poAt(base),
  new Date(new Date(base).getTime() + 23 * HOUR)
);
check(
  'a PO inside its closing window is actionable AND offers the on-behalf draft',
  insideClosing.inQueue === true && insideClosing.actionable === true &&
    insideClosing.onBehalfAvailable === true && insideClosing.mustReject === false
);
const pastLimit = win.poAcknowledgementWindow(poAt(base), new Date(new Date(base).getTime() + 25 * HOUR));
check(
  'past the limit the documented action is a rejection (the owner classifies it)',
  pastLimit.mustReject === true && pastLimit.inQueue === false && pastLimit.history === true
);
check(
  'an unreadable window FAILS CLOSED to `unknown`',
  win.poAcknowledgementWindow(poAt('not-a-date')).channelState === 'unknown'
);

/* 6c — S9's owner: ONE declared identity, ONE statement, ONE writer. */
check(
  'the automation declares ONE automatic identity',
  automation.RECEIPT_INVOICE_AUTOMATION_ACTOR_ID === 'mercenta-system:receipt-invoice'
);
check(
  "the automation statement labels the rule as MERCENTA'S OWN process, not a channel rule",
  /Mercenta'?s own operating process/.test(automation.RECEIPT_INVOICE_AUTOMATION_STATEMENT.mercentaProcess) &&
    /not a[\s\S]{0,20}channel rule/.test(automation.RECEIPT_INVOICE_AUTOMATION_STATEMENT.mercentaProcess)
);
const lifecycleCode = codeOf('src/lib/commerce/commerceLifecycle.ts');
check(
  'the receipt consumes the automation owner instead of re-deciding',
  /from '\.\/receiptInvoiceAutomation'/.test(lifecycleCode) &&
    /RECEIPT_INVOICE_AUTOMATION/.test(lifecycleCode)
);
check(
  'the WHOLE programme has only ONE declaration of each window constant',
  walk('src').every((f) => {
    const code = codeOf(f);
    const declaresWindow = /PO_ACKNOWLEDGEMENT_HOURS\s*=/.test(code);
    const declaresSchedule = /PO_ACK_NOTIFICATION_HOURS\s*[:=]/.test(code);
    const declaresOnBehalf = /PO_ACK_ON_BEHALF_WINDOW_HOURS\s*=/.test(code);
    if (!declaresWindow && !declaresSchedule && !declaresOnBehalf) return true;
    return f === 'src/config/purchaseOrders.ts';
  })
);
/* ── 7. THE SEED INVENTORY (the closing pass's recorded findings) ─────────── */

const seededPos = demoStore.demoPurchaseOrders;
check(
  "the SEED inventory is non-empty (the demo really carries the channel's POs)",
  seededPos.length >= 10,
  `${seededPos.length} seeded PO(s)`
);
check(
  'SEED CONTRACT — no seeded channel PO is re-labelled as simulation (types.ts provenance rule)',
  seededPos.every((p) => p.simulated !== true && p.mode === undefined),
  `${seededPos.filter((p) => p.simulated === true || p.mode !== undefined).length} re-labelled row(s)`
);
check(
  'SEED state recorded honestly: the deployed demo boots with ZERO operable simulated POs',
  seededPos.filter((p) => p.simulated === true).length === 0
);
const astonishProducts = demoData.productsForBrand('brand-astonish');
check(
  'the first cleared tenant owns seeded catalog products (the E4 precondition)',
  astonishProducts.length > 0,
  `${astonishProducts.length} product(s)`
);
const eligibility = await commerce.evaluateCommerceEligibility('brand-astonish', astonishProducts[0].sku, {
  staffId: 'staff-005',
  canMutate: true,
});
check(
  'SEED REACHABILITY — the operational-simulation control is genuinely operable (eligibility resolves true)',
  eligibility.ok === true && eligibility.value.eligible === true,
  eligibility.ok ? eligibility.value.reasons.join(' | ') : eligibility.error
);
check(
  'the eligibility seed is a labelled SIMULATED submission, never a live one',
  demoStore.demoProductSubmissions.length > 0 &&
    demoStore.demoProductSubmissions.every((s) => s.simulated === true && /^SEED-SIM-/.test(s.submissionId))
);
check(
  'SEED contract recorded by §S10: demo tenants hold NO canonical onboarding record (the S8 no-op)',
  acquisition.getOnboardings().length === 0 && acquisition.getOpportunities().length === 0,
  `${acquisition.getOnboardings().length} onboarding record(s), ${acquisition.getOpportunities().length} opportunity(ies)`
);

/* ── 8. ZERO NETWORK ──────────────────────────────────────────────────────── */

check(
  'zero network calls: the inventory gate never reaches the network',
  fetchCalls === 0,
  `${fetchCalls} intercepted call(s)`
);

console.log(
  `\n§S10 — ${pass} assertions PASS, ${fail} FAIL` +
    `${fetchCalls === 0 ? ' · 0 network calls' : ` · ${fetchCalls} NETWORK CALLS`}\n`
);
if (fail > 0) {
  console.log('Failures:');
  for (const f of failures) console.log(`  · ${f}`);
  console.log('');
}
await server.close();
process.exit(fail === 0 && fetchCalls === 0 ? 0 : 1);