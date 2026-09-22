/**
 * Phase 7D - Shipment & ASN tests.
 *
 * Covers the brand shipment flow on Tapatío (accepted PO-9002 -> Create
 * Shipment -> ASN with carton detail), the shortfall-detection path that
 * auto-raises a deduction, the Routing Request indicator for Astonish's
 * freight-collect POs, the prepaid delivery-window label, and the carrier
 * milestone update (live on retail).
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
  test('1. Create shipment with correct carton detail -> validates, submits', async ({ page }) => {
    await deskForgePO(page);
    const shipBtn = page.locator('button', { hasText: 'Create Shipment' }).first();
    await expect(shipBtn).toBeVisible({ timeout: 5000 });
    await shipBtn.click();
    await page.waitForTimeout(500);
    // Carton qty is pre-filled from the acknowledged amounts; submit the ASN.
    // Tapatío is Grocery (perishable/regulated) so lot number + expiry date are
    // mandatory on the ASN — supply simulated values (never real stock data).
    await page.getByLabel('Lot number').fill('SIM-LOT-PO-9002');
    await page.getByLabel('Expiry date').fill('2027-10-01');
    await page.locator('button', { hasText: 'File ASN' }).click();
    await expect(page.getByText(/ASN filed via/i).first()).toBeVisible({ timeout: 7000 });
  });

  test('2. Carton qty mismatch vs acked qty -> shortfall logged as deduction', async ({ page }) => {
    await deskForgePO(page);
    await page.locator('button', { hasText: 'Create Shipment' }).first().click();
    await page.waitForTimeout(500);
    // Zero out the first carton: clears a shortfall vs the acknowledged qty.
    await page.locator('input[type="number"]').first().fill('0');
    // Grocery (regulated) — mandatory lot + expiry on the ASN.
    await page.getByLabel('Lot number').fill('SIM-LOT-PO-9002');
    await page.getByLabel('Expiry date').fill('2027-10-01');
    await page.locator('button', { hasText: 'File ASN' }).click();
    await expect(page.getByText(/Shortfall logged as deduction/i).first()).toBeVisible({ timeout: 7000 });
  });

  test('3. Amazon freight (collect) -> routing step required, and NO unsupported channel deadline', async ({ page }) => {
    await loginAs(page, 'Astonish', 1100);
    await page.click('nav[aria-label="Primary"] >> text=Purchase Orders');
    await page.waitForTimeout(1000);
    /**
     * §WAVE 3 — REPOINTED. The indicator previously read "Routing Request
     * required" and attributed a deadline to the retail channel ("10am PT"). That
     * deadline is unsupported (`docs/AMAZON_VENDOR_TRUTH_VALIDATION_2026-09-20.md`
     * → AV-013), so the copy is now Mercenta-owned and the claim is asserted
     * ABSENT. The behaviour under test — a Freight Collect PO requires the
     * routing step — is unchanged.
     */
    await expect(page.getByText(/Routing step required \(Freight Collect\)/i).first()).toBeVisible({ timeout: 5000 });
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