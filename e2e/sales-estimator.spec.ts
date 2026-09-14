/**
 * §18/§17/M12 — SALES ESTIMATOR (browser verification, brand-facing).
 *
 * Proves a brand can actually use the estimator: it renders in Market Intel,
 * responds to inputs, always labels the result an estimate, reports truthful
 * provider modes, and the new-to-channel model states that no programme place is
 * claimed (simulation only).
 */
import { test, expect } from '@playwright/test';
import { loginAs } from './helpers/auth';

async function openNav(page: import('@playwright/test').Page, label: string) {
  await page.locator(`nav[aria-label="Primary"] button:has-text("${label}")`).first().click();
  await page.waitForTimeout(700);
}

test.describe('Amazon sales estimator', () => {
  test('1. a brand can estimate a range, and it is always labelled an estimate', async ({ page }) => {
    const pageErrors: string[] = [];
    page.on('pageerror', (e) => pageErrors.push(String(e)));
    await loginAs(page, 'Zambezi Organic Extracts Ltd', 1400);
    await openNav(page, 'Market Intel');

    const card = page.locator('h2, h3').filter({ hasText: 'Amazon Sales Estimator' }).first();
    await expect(card).toBeVisible({ timeout: 6000 });
    await expect(page.getByTestId('sales-estimate-result')).toBeVisible();

    const before = await page.getByTestId('sales-estimate-result').innerText();
    // Changing competition changes the estimate (the model actually responds).
    await page.getByLabel(/Competing listings/).first().fill('90');
    await page.waitForTimeout(400);
    const after = await page.getByTestId('sales-estimate-result').innerText();
    expect(after).not.toEqual(before);

    // The estimate is labelled, and no live data connection is claimed.
    await expect(page.locator('text=/not measured Amazon sales data/i').first()).toBeVisible();
    await expect(page.locator('text=/no live data connection is claimed or used/i').first()).toBeVisible();
    await expect(page.locator('text=/keepa →/').first()).toBeVisible();
    expect(pageErrors).toEqual([]);
  });

  test('2. the new-to-channel model claims no programme place (simulation only)', async ({ page }) => {
    await loginAs(page, 'Zambezi Organic Extracts Ltd', 1400);
    await openNav(page, 'Market Intel');
    await page.getByRole('button', { name: /Model a new-to-channel launch/ }).click();
    await expect(page.getByTestId('born-to-run-result')).toBeVisible({ timeout: 5000 });
    await expect(page.getByTestId('born-to-run-result')).toContainText(
      'not_confirmed_with_amazon'
    );
    await expect(page.getByTestId('born-to-run-result')).toContainText(
      'submits nothing to Amazon'
    );
    await expect(page.getByTestId('born-to-run-result')).toContainText('Simulation only');
  });
});