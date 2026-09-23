/**
 * §P4 + §P5 — LIVE VERIFICATION against the DEPLOYED demo (https://demo.mercenta.co.uk).
 *
 * Not part of the local suite: it is the third leg of the completion contract and
 * exercises the REAL deployed bundle in a real browser. Every check prints its
 * own PASS/FAIL with evidence; the script exits non-zero if any check fails.
 *
 * The P4 checks (the proxy direction on the brand PO surface) are kept, and §P5
 * adds the arrival-node checks: the deployed map draws destination-FC nodes and no
 * `mercenta_hub` node, no surface names a Mercenta hub as a destination, and the
 * admin Overview h1 reads "Overview".
 */
import { chromium } from 'playwright';

const BASE = process.env.LIVE_BASE ?? 'https://demo.mercenta.co.uk';
let failures = 0;
const results = [];
function check(name, ok, extra = '') {
  results.push(`${ok ? 'PASS' : 'FAIL'} — ${name}${extra ? ` :: ${extra}` : ''}`);
  console.log(`${ok ? 'PASS' : 'FAIL'} — ${name}${extra ? ` :: ${extra}` : ''}`);
  if (!ok) failures++;
}

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
const pageErrors = [];
const consoleErrors = [];
page.on('pageerror', (e) => pageErrors.push(String(e)));
page.on('console', (m) => {
  if (m.type() === 'error') consoleErrors.push(m.text());
});

/* ── 1. The deployed bundle MOUNTS (the check the P3 live leg added) ──────── */
await page.goto(BASE, { waitUntil: 'domcontentloaded', timeout: 60000 });
await page.waitForTimeout(4000);
const rootHtml = (await page.locator('#root').innerHTML().catch(() => '')).length;
check('the deployed app mounts (#root non-empty)', rootHtml > 500, `#root html length ${rootHtml}`);
check('no uncaught page error on boot', pageErrors.length === 0, pageErrors.slice(0, 2).join(' | '));
check('the marketing homepage renders its Partner Login entry',
  await page.getByRole('button', { name: 'Partner Login' }).first().isVisible({ timeout: 8000 }).catch(() => false));

/* ── 2. A brand session sees STATUS, not a filing control ────────────────── */
await page.getByRole('button', { name: 'Partner Login' }).first().click().catch(async () => {
  await page.getByRole('button', { name: 'Open navigation' }).click();
  await page.waitForTimeout(400);
  await page.getByRole('button', { name: 'Partner Login' }).last().click();
});
await page.waitForTimeout(800);
await page.click('text=Tapatío');
await page.waitForTimeout(2500);
/**
 * Navigate the way the product does (click the Operations nav item) — NOT by a
 * hand-written URL, which would only match the nav label and prove nothing.
 */
await page.click('nav[aria-label="Primary"] >> text=Purchase Orders');
await page.waitForTimeout(3500);

const body = await page.locator('body').innerText().catch(() => '');
check('the brand Purchase Orders surface renders on the deployed build',
  /Queue value/i.test(body) || /Acknowledge each line/i.test(body) || /Purchase orders/i.test(body));
check('NO brand-side filing control exists ("Create Shipment" absent)',
  !/Create Shipment/i.test(body));
check('NO brand-side filing control exists ("File ASN" absent)', !/"File ASN"|File ASN\b/i.test(body));
check('NO brand-side routing filing form ("Confirm routing step" absent)',
  !/Confirm routing step/i.test(body));
const packingBtn = page.locator('button', { hasText: 'Packing differs?' }).first();
const hasPacking = await packingBtn.waitFor({ state: 'visible', timeout: 10000 }).then(() => true).catch(() => false);
check('the packing-correction exception IS offered', hasPacking);

/* ── 2b. A brand ACCEPTANCE issues the instruction on the live build ─────── */
const ackBtn = page.locator('button', { hasText: 'Acknowledge' }).first();
if (await ackBtn.waitFor({ state: 'visible', timeout: 8000 }).then(() => true).catch(() => false)) {
  await ackBtn.click();
  await page.waitForTimeout(700);
  await page.locator('button', { hasText: 'Submit acknowledgment' }).click();
  const issued = await page.getByText(/Decision issued to Mercenta/i).first()
    .waitFor({ state: 'visible', timeout: 15000 }).then(() => true).catch(() => false);
  check('the brand decision is issued to MERCENTA on the live build', issued);
  const ackTransmitted = await page.getByText(/Mercenta filed the acknowledgement with the retail channel/i).first()
    .waitFor({ state: 'visible', timeout: 15000 }).then(() => true).catch(() => false);
  check('MERCENTA files the channel acknowledgement (live)', ackTransmitted);
  const simulatedNote = await page.getByText(/simulated, no live call/i).first()
    .waitFor({ state: 'visible', timeout: 10000 }).then(() => true).catch(() => false);
  check('the channel submission is labelled SIMULATED (never claimed live)', simulatedNote);
  const statusPanelAck = await page.locator('[data-testid^="po-mercenta-ack-"]').first()
    .waitFor({ state: 'visible', timeout: 10000 }).then(() => true).catch(() => false);
  check('the channel-status panel shows the acknowledgement reference (live)', statusPanelAck);
}

/* ── 3. A packing correction reaches Mercenta, which files the ASN ───────── */
if (hasPacking) {
  await packingBtn.click();
  await page.waitForTimeout(800);
  /**
   * Scoped, not a whole-page text match: "Carrier" appears elsewhere on the page
   * (the admin nav item, the commerce panel), so the check is that the CORRECTION
   * FORM itself offers no carrier field — exactly what the local spec asserts.
   */
  const carrierLabels = await page.locator('label', { hasText: 'Carrier' }).count();
  const carrierSelects = await page.locator('select[aria-label="Carrier"], label:has-text("Carrier") select').count();
  check('the correction form offers NO carrier choice to the brand',
    carrierLabels === 0 && carrierSelects === 0, `labels=${carrierLabels} selects=${carrierSelects}`);
  await page.locator('button', { hasText: 'Send packing correction to Mercenta' }).click();
  const sent = await page.getByText(/Packing correction sent to Mercenta/i).first()
    .waitFor({ state: 'visible', timeout: 15000 }).then(() => true).catch(() => false);
  check('the correction is issued to Mercenta on the live build', sent);
  const asnFiled = await page.getByText(/Mercenta filed the ASN/i).first()
    .waitFor({ state: 'visible', timeout: 15000 }).then(() => true).catch(() => false);
  check('MERCENTA files the ASN from it (live)', asnFiled);
  const statusPanel = await page.locator('[data-testid^="po-mercenta-asn-"]').first()
    .waitFor({ state: 'visible', timeout: 10000 }).then(() => true).catch(() => false);
  check('the Mercenta channel-status panel renders the ASN + consignment (live)', statusPanel);
}

check('no uncaught page error during the brand flow', pageErrors.length === 0, pageErrors.slice(0, 2).join(' | '));

/* ── 4. Mercenta's side is visible on the admin PO detail ────────────────── */
const admin = await browser.newPage({ viewport: { width: 1440, height: 900 } });
const adminErrors = [];
admin.on('pageerror', (e) => adminErrors.push(String(e)));
await admin.goto(BASE, { waitUntil: 'domcontentloaded', timeout: 60000 });
await admin.waitForTimeout(4000);
await admin.getByRole('button', { name: 'Partner Login' }).first().click().catch(async () => {
  await admin.getByRole('button', { name: 'Open navigation' }).click();
  await admin.waitForTimeout(400);
  await admin.getByRole('button', { name: 'Partner Login' }).last().click();
});
await admin.waitForTimeout(800);
await admin.click('text=Mercenta Admin Hub');
await admin.waitForTimeout(2500);
await admin.goto(`${BASE}/admin/purchase-orders`, { waitUntil: 'domcontentloaded' }).catch(() => {});
await admin.waitForTimeout(3000);
const adminBody = await admin.locator('body').innerText().catch(() => '');
check('the admin Purchase Orders surface renders on the deployed build', /Purchase Orders/i.test(adminBody));
check('no uncaught page error on the admin flow', adminErrors.length === 0, adminErrors.slice(0, 2).join(' | '));

/* ── 5. §P5 — THE DEPLOYED ARRIVAL NODE IS THE FC ON THE PO, NOT A HUB ───── */
await page.click('nav[aria-label="Primary"] >> text=Logistics Hub').catch(() => {});
await page.waitForTimeout(4000);
const hubBody = await page.locator('body').innerText().catch(() => '');
const hubNodeKinds = await page
  .locator('[data-testid^="logistics-node-"]')
  .evaluateAll((els) => els.map((e) => e.getAttribute('data-kind')))
  .catch(() => []);
check('the brand Logistics Hub renders on the deployed build',
  /Logistics Hub/i.test(hubBody) || hubNodeKinds.length > 0);
check('the deployed map draws DESTINATION-FC nodes',
  hubNodeKinds.includes('amazon_fc'), `kinds=${[...new Set(hubNodeKinds)].join(',')}`);
check('the deployed map draws NO mercenta_hub node',
  !hubNodeKinds.includes('mercenta_hub'), `kinds=${[...new Set(hubNodeKinds)].join(',')}`);
check('no deployed surface names a Mercenta hub as a destination',
  !/Mercenta\s+(UK\s+)?(Distribution\s+)?Hub/i.test(hubBody));
/**
 * The canonical milestone strip renders INSIDE the consignment tracking timeline,
 * so the live proof opens it (rather than hoping a whole-page regex matches a label
 * that is only rendered on demand). Every milestone is listed there, so the
 * pre-live state must appear under its own name — and the retired hub must not.
 */
const trackBtn = page.locator('button', { hasText: 'Track' }).first();
const trackOpened = await trackBtn.click().then(() => true).catch(() => false);
let timelineText = '';
if (trackOpened) {
  const dialog = page.locator('[data-testid="logistics-tracking-dialog"]').first();
  const opened = await dialog.waitFor({ state: 'visible', timeout: 10000 }).then(() => true).catch(() => false);
  if (opened) timelineText = await dialog.innerText().catch(() => '');
}
check('a consignment tracking timeline opens on the deployed build', timelineText.length > 0);
check('the deployed milestone strip names the canonical pre-live state ("Delivered to Destination FC")',
  /Delivered to Destination FC/i.test(timelineText), timelineText.replace(/\s+/g, ' ').slice(0, 160));
check('the deployed milestone strip names NO Mercenta hub',
  !/Mercenta\s+(UK\s+)?(Distribution\s+)?Hub/i.test(timelineText));
check('no uncaught page error on the Logistics Hub live flow',
  pageErrors.length === 0, pageErrors.slice(0, 2).join(' | '));

/* ── 6. §P5 copy pass — the admin Overview header is the deployed title ──── */
await admin.goto(`${BASE}/admin/overview`, { waitUntil: 'domcontentloaded' }).catch(() => {});
await admin.waitForTimeout(3500);
const adminH1s = await admin
  .locator('h1')
  .evaluateAll((els) => els.map((e) => (e.textContent ?? '').trim()))
  .catch(() => []);
check('the deployed admin Overview h1 reads "Overview" (not "Operations Overview")',
  adminH1s.includes('Overview') && !adminH1s.includes('Operations Overview'),
  `h1s=${adminH1s.slice(0, 3).join(' | ')}`);

/* ── 7. §P6 — THE DEPLOYED DOCUMENT PACK + THE COLLECT CHAIN ─────────────── */

/**
 * The P6 live leg: the changed functionality must be present ON the deployed
 * build. The brand accepts a PO, follows the product's own "Open shipping
 * documents" hand-off, and the pack must be there — with honest readiness (SSCC
 * ready because Mercenta generated them from the ASN it filed; the waybill NOT
 * ready because no carrier has booked one) and the SSCC labels printing complete
 * 18-digit identifiers under the stated placeholder prefix.
 */
await page.goto(`${BASE}/brand/purchase-orders`, { waitUntil: 'domcontentloaded' }).catch(() => {});
await page.waitForTimeout(3000);
const liveAck = page.locator('button', { hasText: 'Acknowledge' }).first();
const liveAckOpened = await liveAck.click().then(() => true).catch(() => false);
if (liveAckOpened) {
  await page.waitForTimeout(600);
  await page.locator('button', { hasText: 'Submit acknowledgment' }).first().click().catch(() => {});
  await page.waitForTimeout(2500);
}
const liveCta = page.locator('[data-testid^="po-open-documents-"]').first();
const liveCtaOpened = await liveCta.click().then(() => true).catch(() => false);
await page.waitForTimeout(3000);
const livePack = page.locator('[data-testid="po-documents-panel"]').first();
const livePackVisible = await livePack
  .waitFor({ state: 'visible', timeout: 12000 })
  .then(() => true)
  .catch(() => false);
check('§P6 the deployed build offers "Open shipping documents" after acceptance', liveCtaOpened);
check('§P6 the deployed Logistics Hub renders "Documents for this PO"', livePackVisible);

const livePackText = livePackVisible ? await livePack.innerText().catch(() => '') : '';
check('§P6 every document the pack declares is listed on the deployed build',
  ['SSCC carton labels', 'Carrier shipping label', 'Freight waybill', 'Packing list & delivery note', 'ASN sheet']
    .every((title) => livePackText.includes(title)),
  livePackText.replace(/\s+/g, ' ').slice(0, 200));
check('§P6 the deployed pack names NO Mercenta site as the destination',
  !/Mercenta\s+(UK\s+)?(Distribution\s+)?Hub/i.test(livePackText));
const liveSsccStanding = await page
  .locator('[data-testid="po-document-status-sscc_carton_labels"]')
  .getAttribute('data-standing')
  .catch(() => null);
const liveWaybillStanding = await page
  .locator('[data-testid="po-document-status-freight_waybill"]')
  .getAttribute('data-standing')
  .catch(() => null);
check('§P6 the deployed SSCC labels are READY (generated from the filed ASN)',
  liveSsccStanding === 'ready', String(liveSsccStanding));
check('§P6 the deployed waybill is honestly NOT READY (no carrier booking exists)',
  liveWaybillStanding === 'not_ready', String(liveWaybillStanding));

const liveSsccOpened = await page
  .locator('[data-testid="po-document-open-sscc_carton_labels"]')
  .click()
  .then(() => true)
  .catch(() => false);
let liveSsccText = '';
if (liveSsccOpened) {
  const liveFrame = page.locator('[data-testid="po-document-frame"]').first();
  const liveFrameVisible = await liveFrame
    .waitFor({ state: 'visible', timeout: 10000 })
    .then(() => true)
    .catch(() => false);
  if (liveFrameVisible) {
    const frame = page.frameLocator('[data-testid="po-document-frame"]').first();
    liveSsccText = await frame.locator('body').innerText().catch(() => '');
  }
  const placeholderNotice = await page
    .locator('[data-testid="po-document-placeholder-notice"]')
    .innerText()
    .catch(() => '');
  check('§P6 the deployed SSCC label document states the unassigned GS1 placeholder prefix',
    /XX-PENDING-GS1-LICENCE/.test(placeholderNotice), placeholderNotice.slice(0, 120));
  await page.keyboard.press('Escape').catch(() => {});
}
const liveIdentifiers = liveSsccText.match(/\b0{8}\d{10}\b/g) ?? [];
check('§P6 the deployed SSCC labels print complete 18-digit identifiers per carton',
  liveIdentifiers.length > 0 && liveIdentifiers.every((i) => i.length === 18),
  `${liveIdentifiers.length} identifier(s)`);
check('§P6 the deployed brand rail carries the document-download badge',
  (await page.locator('[data-testid="nav-badge-logistics"]').count().catch(() => 0)) > 0);
check('no uncaught page error on the deployed P6 document-pack flow',
  pageErrors.length === 0, pageErrors.slice(0, 2).join(' | '));

/**
 * The collect chain on the deployed build: the seeded Freight Collect PO shows the
 * documented order, and the channel steps say "awaiting the channel" — the
 * deployed build must not present an ARN it does not have.
 */
await page.goto(`${BASE}/brand/logistics?po=PO-9200`, { waitUntil: 'domcontentloaded' }).catch(() => {});
await page.waitForTimeout(3500);
const liveChain = page.locator('[data-testid="collect-chain"]').first();
const liveChainVisible = await liveChain
  .waitFor({ state: 'visible', timeout: 12000 })
  .then(() => true)
  .catch(() => false);
const liveChainText = liveChainVisible ? await liveChain.innerText().catch(() => '') : '';
check('§P6 the deployed collect lane renders the documented chain', liveChainVisible);
check('§P6 the deployed chain states the channel pickup lead time (two business days)',
  /at least two business days/i.test(liveChainText));
const liveArnState = await page
  .locator('[data-testid="collect-step-arn"]')
  .getAttribute('data-state')
  .catch(() => null);
check('§P6 the deployed ARN step awaits the channel — no fabricated ARN',
  liveArnState === null || liveArnState === 'awaiting_channel' || liveArnState === 'not_applicable',
  String(liveArnState));
check('§P6 the deployed collect lane presents no ARN value',
  !/ARN\s+[A-Z0-9-]{4,}/.test(liveChainText));

console.log('\n--- LIVE VERIFICATION SUMMARY ---');
const passed = results.filter((r) => r.startsWith('PASS')).length;
console.log(`${passed}/${results.length} checks PASS · page errors: brand=${pageErrors.length} admin=${adminErrors.length}`);
console.log(failures === 0 ? 'LIVE_VERIFICATION_PASS' : `LIVE_VERIFICATION_FAIL (${failures})`);
await browser.close();
process.exit(failures === 0 ? 0 : 1);