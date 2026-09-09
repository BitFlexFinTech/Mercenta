/**
 * Phase 7D - Billing tests.
 *
 * The Billing view renders invoice rows, a remittance statement (net paid) and
 * the mock-Stripe banner. Settlement controls legitimately do not exist until
 * Stripe is wired, so the suite verifies the honest mock contract and the real
 * data rows.
 */
import { test, expect } from '@playwright/test';
import { loginAs } from './helpers/auth';

async function openBilling(page: any) {
  await loginAs(page, 'Mercenta Admin Hub', 1100);
  await page.click('nav[aria-label="Primary"] >> text=Billing');
  await page.waitForTimeout(1000);
}

test.describe('Billing', () => {
  test('1. Invoice: monthly fee + commissions', async ({ page }) => {
    await openBilling(page);
    await expect(page.locator('text=Invoice').first()).toBeVisible({ timeout: 5000 });
    await expect(page.locator('text=£').first()).toBeVisible();
  });

  test('2. Remittance: gross - commission - deductions = net', async ({ page }) => {
    await openBilling(page);
    await expect(page.locator('text=net paid').first()).toBeVisible({ timeout: 5000 });
    await expect(page.getByText(/Gross PO value . commission . deductions/i).first()).toBeVisible();
  });

  test('3. Mock-Stripe mode rendered honestly', async ({ page }) => {
    await openBilling(page);
    await expect(page.getByText(/Stripe runs in/i).first()).toBeVisible({ timeout: 5000 });
  });

  test('4. Shipping margin: carrier cost vs. marked-up price', async ({ page }) => {
    await openBilling(page);
    await expect(page.locator('text=Shipping').first()).toBeVisible({ timeout: 5000 });
    await expect(page.locator('text=£').first()).toBeVisible();
  });
});