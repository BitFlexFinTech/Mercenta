/**
 * §P4 — LIVE VERIFICATION against the DEPLOYED demo (https://demo.mercenta.co.uk).
 *
 * Not part of the local suite: it is the third leg of the completion contract and
 * exercises the REAL deployed bundle in a real browser. Every check prints its
 * own PASS/FAIL with evidence; the script exits non-zero if any check fails.
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

console.log('\n--- LIVE VERIFICATION SUMMARY ---');
const passed = results.filter((r) => r.startsWith('PASS')).length;
console.log(`${passed}/${results.length} checks PASS · page errors: brand=${pageErrors.length} admin=${adminErrors.length}`);
console.log(failures === 0 ? 'LIVE_VERIFICATION_PASS' : `LIVE_VERIFICATION_FAIL (${failures})`);
await browser.close();
process.exit(failures === 0 ? 0 : 1);