/**
 * §21 / M13 Phase 8 — GOOGLE SETUP WIZARD (browser verification, Super Admin).
 *
 * Proves the wizard is REAL in the UI:
 *   1. it renders the founder's personal Google account, states that the password
 *      is never requested, shows the four capability tests in the plan, and is
 *      honest that nothing has been set up yet;
 *   2. [Run workspace setup] executes the whole plan through the simulation-first
 *      client and reports per-item outcomes labelled SIMULATED;
 *   3. an implausible OAuth client id is REFUSED before any Google window opens.
 */
import { test, expect } from '@playwright/test';
import { loginAs } from './helpers/auth';

async function openGoogleSetup(page: import('@playwright/test').Page) {
  await loginAs(page, 'Super Admin — Tadii', 1400);
  await page.locator('button:has-text("Super Admin")').first().click();
  await page.waitForTimeout(600);
  await page.locator('button:has-text("Google")').first().click();
  await page.waitForTimeout(600);
}

test.describe('Google setup wizard', () => {
  test('1. it renders the personal account, the no-password policy and the honest un-run state', async ({ page }) => {
    const pageErrors: string[] = [];
    page.on('pageerror', (e) => pageErrors.push(String(e)));
    await openGoogleSetup(page);

    const wizard = page.getByTestId('google-setup-wizard');
    await expect(wizard).toBeVisible({ timeout: 8000 });
    await expect(wizard).toContainText('mercentapartners@gmail.com');
    await expect(wizard).toContainText('never asks for your Google password');
    await expect(wizard).toContainText('Personal');
    await expect(page.getByTestId('google-connection-state')).toHaveText('none');
    await expect(page.getByTestId('google-setup-not-run')).toContainText('has not been created yet');
    expect(pageErrors).toEqual([]);
  });

  test('2. running the setup executes the whole plan and labels it SIMULATED', async ({ page }) => {
    await openGoogleSetup(page);
    await page.getByRole('button', { name: 'Run workspace setup' }).click();
    await page.waitForTimeout(1500);

    await expect(page.getByTestId('google-setup-message')).toContainText('SIMULATED run complete');
    await expect(page.getByTestId('google-run-mode')).toHaveText('simulation');

    // Every planned item reports an outcome; the capability tests all passed.
    // The plan is exactly 22 items (14 folders incl. root, 2 master sheets,
    // 2 templates, 4 capability tests) — each must report an outcome.
    const steps = page.getByTestId('google-setup-step');
    await expect(steps).toHaveCount(22);
    await expect(page.getByTestId('google-setup-steps')).toContainText('capability test');
    await expect(page.getByTestId('google-setup-wizard')).toContainText('22/22');
    await expect(page.getByTestId('google-setup-wizard')).toContainText('4/4');
    // A simulated run can never look live.
    expect(await page.getByTestId('google-setup-steps').innerText()).not.toContain('live');
  });

  test('3. an implausible OAuth client id is refused before any Google window opens', async ({ page }) => {
    await openGoogleSetup(page);
    let popupOpened = false;
    page.on('popup', () => {
      popupOpened = true;
    });
    await page.getByPlaceholder('xxxxxxxx.apps.googleusercontent.com').fill('short');
    await page.getByRole('button', { name: 'Connect Google' }).click();
    await page.waitForTimeout(500);

    await expect(page.getByTestId('google-setup-message')).toContainText('does not look like a Google OAuth client id');
    expect(popupOpened).toBe(false);
    await expect(page.getByTestId('google-connection-state')).toHaveText('none');
  });
});