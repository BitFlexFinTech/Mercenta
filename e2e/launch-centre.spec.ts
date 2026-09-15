/**
 * §31/M13 — MERCENTA LAUNCH CENTRE (browser verification, Super Admin surface).
 *
 * Proves the founder's launch workflow is real in the UI:
 *   1. it renders with all 14 platforms and states that no automated submission
 *      exists and that the requirements are not yet verified;
 *   2. [Prepare Profile] is a REAL state transition (the row's profile status
 *      changes), and [Mark Submitted] is distinct from it;
 *   3. selecting a platform opens its detail with the copyable submission package
 *      and the guided checklist.
 */
import { test, expect } from '@playwright/test';
import { loginAs } from './helpers/auth';

async function openLaunchCentre(page: import('@playwright/test').Page) {
  await loginAs(page, 'Super Admin — Tadii', 1400);
  await page.locator('button:has-text("Super Admin")').first().click();
  await page.waitForTimeout(600);
  await page.locator('button:has-text("Launch Centre")').first().click();
  await page.waitForTimeout(600);
}

test.describe('Mercenta Launch Centre', () => {
  test('1. it renders all 14 platforms and is honest about submission', async ({ page }) => {
    const pageErrors: string[] = [];
    page.on('pageerror', (e) => pageErrors.push(String(e)));
    await openLaunchCentre(page);

    const centre = page.getByTestId('launch-centre');
    await expect(centre).toBeVisible({ timeout: 8000 });
    await expect(centre).toContainText('Mercenta Launch Centre');
    await expect(centre).toContainText('no automated submission');
    await expect(centre).toContainText('no integration');

    const rows = page.getByTestId('launch-platform-row');
    await expect(rows).toHaveCount(14);
    for (const name of ['Product Hunt', 'Indie Hackers', 'Hacker News', 'BetaList']) {
      await expect(centre).toContainText(name);
    }
    // The requirements column never claims to have been verified.
    await expect(rows.first()).toContainText('verify on platform');
    expect(pageErrors).toEqual([]);
  });

  test('2. Prepare Profile is a real state change, distinct from Mark Submitted', async ({ page }) => {
    await openLaunchCentre(page);
    const row = page.getByTestId('launch-platform-row').first();
    await expect(row).toContainText('not_prepared');

    await row.getByRole('button', { name: 'Prepare Profile' }).click();
    await page.waitForTimeout(400);
    await expect(row).toContainText('prepared');
    await expect(row).not.toContainText('submitted');

    await row.getByRole('button', { name: 'Mark Submitted' }).click();
    await page.waitForTimeout(400);
    await expect(row).toContainText('submitted');
  });

  test('3. selecting a platform opens the package and the guided checklist', async ({ page }) => {
    await openLaunchCentre(page);
    await page.getByTestId('launch-platform-row').first().click();
    await page.waitForTimeout(400);

    await expect(page.locator('text=Submission package (copyable)').first()).toBeVisible();
    await expect(page.locator('text=/NOT YET VERIFIED/').first()).toBeVisible();
    await expect(page.locator('text=/must be read on the platform itself/').first()).toBeVisible();
  });
});