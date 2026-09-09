/**
 * Phase 7D - Xero Accounting tab tests.
 *
 * Super Admin -> Super Admin panel -> Accounting. In demo mode the panel shows
 * the not-connected state, the credential form, and the financial summary
 * placeholder; those are verified exactly as the app renders them.
 */
import { test, expect } from '@playwright/test';
import { loginAs } from './helpers/auth';

async function openAccounting(page: any) {
  await loginAs(page, 'Super Admin — Tadii', 1200);
  await page.click('nav[aria-label="Primary"] >> text=Super Admin');
  await page.waitForTimeout(700);
  await page.locator('button', { hasText: 'Accounting' }).first().click();
  await page.waitForTimeout(900);
}

test.describe('Xero Accounting', () => {
  test('1. Accounting tab shows "Not Connected" state', async ({ page }) => {
    await openAccounting(page);
    await expect(page.getByText(/Xero Not Connected/).first()).toBeVisible({ timeout: 6000 });
  });

  test('2. "Enter Xero Credentials" form appears', async ({ page }) => {
    await openAccounting(page);
    await page.locator('button', { hasText: 'Enter Xero Credentials' }).click();
    await expect(page.locator('text=Xero API Credentials').first()).toBeVisible({ timeout: 4000 });
  });

  test('3. Financial Summary section renders', async ({ page }) => {
    await openAccounting(page);
    await expect(page.getByText(/Financial Summary/).first()).toBeVisible({ timeout: 5000 });
  });

  test('4. Summary shows placeholder when not connected', async ({ page }) => {
    await openAccounting(page);
    await expect(page.getByText(/Connect Xero to see financial summary/).first()).toBeVisible({ timeout: 5000 });
  });

  test('5. Connection status or credentials control present', async ({ page }) => {
    await openAccounting(page);
    const control = page.getByText(/Xero Not Connected/).or(page.locator('button', { hasText: 'Enter Xero Credentials' }));
    await expect(control.first()).toBeVisible({ timeout: 5000 });
  });
});