/**
 * Phase 7D - Shipment & ASN tests.
 *
 * Covers the brand shipment flow on DeskForge (accepted PO-9002 -> Create
 * Shipment -> ASN with carton detail), the shortfall-detection path that
 * auto-raises a deduction, the Routing Request indicator for Zambezi's
 * freight-collect POs, the prepaid delivery-window label, and the carrier
 * milestone update (live on retail).
 */
import { test, expect } from '@playwright/test';
import { loginAs } from './helpers/auth';

async function deskForgePO(page: any) {
  await loginAs(page, 'DeskForge Supplies Inc', 1100);
  const ob = page.locator('text=Onboarding').first();
  if (await ob.isVisible({ timeout: 1500 }).catch(() => false)) {
    await ob.click();
    await page.waitForTimeout(300);
  }
  await page.click('nav[aria-label="Primary"] >> text=Purchase Orders');
  await page.waitForTimeout(1000);
}

test.describe('Shipment & ASN', () => {
  test('1. Create shipment with correct carton detail -> validates, submits', async ({ page }) => {
    await deskForgePO(page);
    const shipBtn = page.locator('button', { hasText: 'Create Shipment' }).first();
    await expect(shipBtn).toBeVisible({ timeout: 5000 });
    await shipBtn.click();
    await page.waitForTimeout(500);
    // Carton qty is pre-filled from the acknowledged amounts; submit the ASN.
    await page.locator('button', { hasText: 'File ASN' }).click();
    await expect(page.getByText(/ASN filed via/i).first()).toBeVisible({ timeout: 7000 });
  });

  test('2. Carton qty mismatch vs acked qty -> shortfall logged as deduction', async ({ page }) => {
    await deskForgePO(page);
    await page.locator('button', { hasText: 'Create Shipment' }).first().click();
    await page.waitForTimeout(500);
    // Zero out the first carton: clears a shortfall vs the acknowledged qty.
    await page.locator('input[type="number"]').first().fill('0');
    await page.locator('button', { hasText: 'File ASN' }).click();
    await expect(page.getByText(/Shortfall logged as deduction/i).first()).toBeVisible({ timeout: 7000 });
  });

  test('3. Amazon freight (collect) -> Routing Request required', async ({ page }) => {
    await loginAs(page, 'Zambezi Organic Extracts Ltd', 1100);
    await page.click('nav[aria-label="Primary"] >> text=Purchase Orders');
    await page.waitForTimeout(1000);
    await expect(page.getByText(/Routing Request required/i).first()).toBeVisible({ timeout: 5000 });
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
});