/**
 * Phase 7D - PO Notification & Auto-Fulfilment automations.
 *
 * Exercises the real automation contracts: the admin PO-creation entry point,
 * the acknowledgement flow that AUTO-creates a shipment draft (surfaced in
 * the brand's Inbound Shipments feed), ASN filing that pushes the shipment,
 * and the Labels modal. Email sending itself goes through the Postmark (Mock)
 * adapter and is not observable in the demo browser, so it is not asserted.
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

test.describe('PO Notifications & Auto-Fulfilment', () => {
  test('1. Admin PO-creation entry exists (new PO flow reachable)', async ({ page }) => {
    await loginAs(page, 'Mercenta Admin Hub', 1100);
    await page.click('nav[aria-label="Primary"] >> text=Purchase Orders');
    await page.waitForTimeout(900);
    await expect(page.locator('button', { hasText: 'Create PO' }).first()).toBeVisible({ timeout: 5000 });
  });

  test('2. Brand accepts all lines -> shipment draft auto-created and visible in logistics', async ({ page }) => {
    await deskForgePO(page);
    const ackBtn = page.locator('button', { hasText: 'Acknowledge' }).first();
    await expect(ackBtn).toBeVisible({ timeout: 5000 });
    await ackBtn.click();
    await page.waitForTimeout(400);
    await page.locator('button', { hasText: 'Submit acknowledgment' }).click();
    await expect(page.getByText(/Acknowledgment submitted/i).first()).toBeVisible({ timeout: 5000 });
    await page.click('nav[aria-label="Primary"] >> text=Inbound Shipments');
    await page.waitForTimeout(1000);
    // The auto-created draft appears in the feed (its card title carries the
    // PO number).
    await expect(page.getByText(/Tapatío — PO-9002/).first()).toBeVisible({ timeout: 7000 });
  });

  test('3. ASN filing pushes the shipment', async ({ page }) => {
    await deskForgePO(page);
    const createShipment = page.locator('button', { hasText: 'Create Shipment' }).first();
    await expect(createShipment).toBeVisible({ timeout: 5000 });
    await createShipment.click();
    await page.waitForTimeout(500);
    // Tapatío is Grocery (perishable/regulated) — lot + expiry are mandatory.
    await page.getByLabel('Lot number').fill('SIM-LOT-PO-9002');
    await page.getByLabel('Expiry date').fill('2027-10-01');
    await page.locator('button', { hasText: 'File ASN' }).click();
    await expect(page.getByText(/ASN filed via/i).first()).toBeVisible({ timeout: 6000 });
  });

  test('4. Labels modal opens for a filed shipment', async ({ page }) => {
    // The demo dataset has no ready/shipped seed POs for the cleared tenants,
    // so the label surface only exists after a real ASN is filed.
    await deskForgePO(page);
    await page.locator('button', { hasText: 'Create Shipment' }).first().click();
    await page.waitForTimeout(500);
    // Grocery (regulated) — mandatory lot + expiry on the ASN.
    await page.getByLabel('Lot number').fill('SIM-LOT-PO-9002');
    await page.getByLabel('Expiry date').fill('2027-10-01');
    await page.locator('button', { hasText: 'File ASN' }).click();
    await page.waitForTimeout(800);
    await page.click('nav[aria-label="Primary"] >> text=Inbound Shipments');
    await page.waitForTimeout(1000);
    const labelsBtn = page.locator('button', { hasText: 'Labels' }).first();
    await expect(labelsBtn).toBeVisible({ timeout: 7000 });
    await labelsBtn.click();
    await expect(page.getByText('Shipping Label').first()).toBeVisible({ timeout: 4000 });
  });
});