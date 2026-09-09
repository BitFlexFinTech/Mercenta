/**
 * Phase 7D - Rakazo tab tests.
 *
 * Super Admin -> Super Admin panel -> Rakazo. The droplet iframe may be
 * unreachable from the test network; the panel always renders its header and
 * its Open-in-new-tab / Refresh controls, so those are asserted.
 */
import { test, expect } from '@playwright/test';
import { loginAs } from './helpers/auth';

async function openRakazo(page: any) {
  await loginAs(page, 'Super Admin — Tadii', 1200);
  await page.click('nav[aria-label="Primary"] >> text=Super Admin');
  await page.waitForTimeout(600);
  await page.locator('button', { hasText: 'Rakazo' }).first().click();
  await page.waitForTimeout(900);
}

test.describe('Rakazo Bot Dashboard', () => {
  test('1. Rakazo tab renders in Super Admin panel', async ({ page }) => {
    await openRakazo(page);
    await expect(page.locator('text=Rakazo Bot Dashboard').first()).toBeVisible({ timeout: 6000 });
  });

  test('2. "Open in new tab" button is present', async ({ page }) => {
    await openRakazo(page);
    await expect(page.locator('button', { hasText: 'Open in new tab' }).first()).toBeVisible({ timeout: 5000 });
  });

  test('3. "Refresh" button is present', async ({ page }) => {
    await openRakazo(page);
    await expect(page.locator('button', { hasText: 'Refresh' }).first()).toBeVisible({ timeout: 5000 });
  });
});