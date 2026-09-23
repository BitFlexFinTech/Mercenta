/**
 * Phase 7D - Shipment & ASN tests.
 *
 * §P4 — REPOINTED (old contract recorded). These tests previously drove a
 * BRAND-SIDE filing flow: "Create Shipment" opened an ASN form where the brand
 * supplied carton detail AND chose the carrier, then "File ASN" submitted it
 * ("ASN filed via … — visible to your 3PL team"). That is the wrong direction of
 * the proxy model: Mercenta holds the retail-channel account, so **Mercenta
 * raises the routing/shipment request and files the ASN**, and the brand sees
 * STATUS. The behaviour under test is preserved and strengthened:
 *   1  a packing correction (the brand's ONLY packing job) reaches Mercenta and
 *      Mercenta files the ASN (a real consignment appears);
 *   2  the shortfall-vs-acknowledged rule still raises a shortage-claim deduction;
 *   3  a Freight Collect PO still shows the routing step — now attributed to
 *      MERCENTA, still with NO unsupported channel deadline (AV-013);
 *   4  the prepaid delivery window is unchanged;
 *   5  the carrier milestone update is unchanged;
 *   6/7 the ADMIN on-behalf ASN path is unchanged (there, Mercenta IS the actor).
 */
import { test, expect } from '@playwright/test';
import { loginAs } from './helpers/auth';

async function deskForgePO(page: any) {
  await loginAs(page, 'Tapatío', 1100);
  const ob = page.locator('text=Onboarding').first();
  if (await ob.isVisible({ timeout: 1500 }).catch(() => false)) {
    await ob.click();
    await page.waitForTimeout(300);
  }
  await page.click('nav[aria-label="Primary"] >> text=Purchase Orders');
  await page.waitForTimeout(1000);
}

/** §P4 — open the brand's packing-correction panel for an accepted PO. */
async function openPackingCorrection(page: any) {
  const btn = page.locator('button', { hasText: 'Packing differs?' }).first();
  await expect(btn).toBeVisible({ timeout: 6000 });
  await btn.click();
  await page.waitForTimeout(400);
}

/**
 * §Phase 4.2 — admin on-behalf ASN. Opens the admin PO detail for a given PO,
 * acknowledges ALL lines on behalf of the brand (seed POs arrive un-acknowledged,
 * which is what unlocks the ASN / Shipment panel), then leaves the on-behalf ASN
 * panel open ready for carton / lot / expiry inputs.
 */
async function adminOpenAsnPanel(page: any, brandName: string, poNumber: string) {
  await loginAs(page, 'Mercenta Admin Hub', 1100);
  await page.click('nav[aria-label="Primary"] >> text=Purchase Orders');
  await page.waitForTimeout(1000);
  const row = page
    .locator('div.flex.items-center.justify-between', { hasText: poNumber })
    .filter({ has: page.locator('button[title="View detail"]') })
    .first();
  await expect(row).toBeVisible({ timeout: 6000 });
  await row.locator('button[title="View detail"]').click();
  await expect(page.getByRole('heading', { name: poNumber }).first()).toBeVisible({ timeout: 5000 });
  // Acknowledge on behalf of the brand so the ASN panel unlocks.
  const ackBtn = page.locator('button', { hasText: `Acknowledge on behalf of ${brandName}` }).first();
  await expect(ackBtn).toBeVisible({ timeout: 5000 });
  await ackBtn.click();
  await page.waitForTimeout(400);
  await page.locator('button', { hasText: 'Submit On-Behalf Acknowledgment' }).click();
  // The ack panel closes immediately on success, so its success notice never
  // renders (pre-existing admin-panel quirk) — assert the structural outcome
  // instead: the ASN / Shipment card unlocks once acknowledgedAt is set.
  const fileBtn = page.locator('button', { hasText: `File / correct ASN on behalf of ${brandName}` }).first();
  await expect(fileBtn).toBeVisible({ timeout: 7000 });
  await fileBtn.click();
  await expect(page.getByText(new RegExp(`Filing ASN on behalf of ${brandName}`)).first()).toBeVisible({ timeout: 5000 });
}

test.describe('Shipment & ASN', () => {
  test('1. Packing correction reaches Mercenta, which files the ASN', async ({ page }) => {
    await deskForgePO(page);
    await openPackingCorrection(page);
    // The brand states its ACTUAL packing; Mercenta files the ASN from it.
    await page.locator('button', { hasText: 'Send packing correction to Mercenta' }).click();
    await expect(page.getByText(/Packing correction sent to Mercenta/i).first()).toBeVisible({ timeout: 8000 });
    await expect(page.getByText(/Mercenta filed the ASN/i).first()).toBeVisible({ timeout: 8000 });
  });

  test('2. Packed qty below acknowledged qty -> shortfall logged as deduction', async ({ page }) => {
    await deskForgePO(page);
    await openPackingCorrection(page);
    // Zero out the first line's packed quantity: a shortfall vs the acked qty.
    await page.locator('input[type="number"]').first().fill('0');
    await page.locator('button', { hasText: 'Send packing correction to Mercenta' }).click();
    await expect(page.getByText(/Shortfall logged as deduction/i).first()).toBeVisible({ timeout: 8000 });
  });

  test('3. Amazon freight (collect) -> routing step raised by MERCENTA, and NO unsupported channel deadline', async ({ page }) => {
    await loginAs(page, 'Astonish', 1100);
    await page.click('nav[aria-label="Primary"] >> text=Purchase Orders');
    await page.waitForTimeout(1000);
    /**
     * §WAVE 3 + §P4 — REPOINTED. The indicator once read "Routing Request
     * required" and attributed a deadline to the retail channel ("10am PT"); that
     * deadline is unsupported (`docs/AMAZON_VENDOR_TRUTH_VALIDATION_2026-09-20.md`
     * → AV-013). It then became Mercenta-owned copy that still implied a
     * BRAND-side filing. Under the proxy model MERCENTA raises the routing step,
     * so the copy now says exactly that — and the unsupported channel deadline is
     * still asserted ABSENT. The underlying behaviour (a Freight Collect PO
     * requires the routing step before the ship window closes) is unchanged.
     */
    await expect(page.getByText(/Routing step — Mercenta raises it \(Freight Collect\)/i).first()).toBeVisible({ timeout: 5000 });
    const body = await page.locator('body').innerText();
    expect(body).not.toMatch(/10am PT|10am Pacific|10 am Pacific/i);
  });

  test('4. Vendor freight (prepaid) -> fixed delivery window respected', async ({ page }) => {
    await deskForgePO(page);
    await expect(page.getByText(/Deliver by/i).first()).toBeVisible({ timeout: 5000 });
  });

  test('5. Shipment marked delivered -> status updates to live on retail', async ({ page }) => {
    await loginAs(page, '3PL Carrier Terminal', 1200);
    // Advance the first manifest row to live_amazon in the carrier terminal.
    const select = page.locator('table select').first();
    await expect(select).toBeVisible({ timeout: 5000 });
    const row = select.locator('..').locator('..');
    await select.selectOption('live_amazon');
    await page.waitForTimeout(500);
    await expect(row.getByText(/Live on retail-channel/i).first()).toBeVisible({ timeout: 4000 });
  });

  test('6. Admin on-behalf ASN for a regulated Grocery brand -> lot + expiry required and submitted', async ({ page }) => {
    await adminOpenAsnPanel(page, 'Tapatío', 'PO-9002');
    // Regulated gate: the seam refuses the on-behalf ASN without lot + expiry
    // (the panel stays open and renders the refusal notice).
    await page.locator('button', { hasText: 'Submit On-Behalf ASN' }).click();
    await expect(page.getByText(/Lot number and expiry date are required/).first()).toBeVisible({ timeout: 5000 });
    // Deterministic SIMULATED values — never real inventory/stock data.
    await page.getByLabel('Lot number').fill('SIM-LOT-ADMIN-PO-9002');
    await page.getByLabel('Expiry date').fill('2027-10-01');
    // A successful on-behalf ASN closes the filing panel (the admin notice is
    // set on the same tick the panel closes, so it is not visible — assert the
    // structural success signal: panel closes only on the success path).
    await page.locator('button', { hasText: 'Submit On-Behalf ASN' }).click();
    await expect(page.locator('button', { hasText: 'Submit On-Behalf ASN' })).toHaveCount(0, { timeout: 7000 });
  });

  test('7. Admin on-behalf ASN for a non-regulated brand -> submits without lot/expiry', async ({ page }) => {
    await adminOpenAsnPanel(page, 'Astonish', 'PO-9001');
    // Home is not regulated — the on-behalf ASN submits without lot/expiry.
    await page.locator('button', { hasText: 'Submit On-Behalf ASN' }).click();
    await expect(page.locator('button', { hasText: 'Submit On-Behalf ASN' })).toHaveCount(0, { timeout: 7000 });
  });
});