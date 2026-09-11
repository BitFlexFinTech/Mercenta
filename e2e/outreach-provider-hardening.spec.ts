/**
 * §Phase D3 — outreach / provider hardening (browser gate).
 *
 * Proves in the running app that:
 *   1. the provider state is reported HONESTLY (the demo default is the
 *      deterministic simulation path — never a live claim), and the full human
 *      approval flow (prepare → modify → approve → send) works with NO provider
 *      credentials configured;
 *   2. the entire flow makes ZERO external network requests;
 *   3. human approval needs neither Rakazo nor Postiz — the workflow completes on
 *      the acquisition surface with no Rakazo/Postiz surface present.
 *
 * The domain-level proof (transport resolution matrix, fail-closed live gate,
 * UNKNOWN ≠ LIVE, credential refusal, RBAC, isolation, revision-history
 * integrity) lives in `scripts/validate-outreach-provider-hardening.mjs`.
 */
import { test, expect } from '@playwright/test';
import { loginAs } from './helpers/auth';

async function openOutreach(page: import('@playwright/test').Page) {
  await loginAs(page, 'Super Admin — Tadii', 1200);
  await page.locator('nav[aria-label="Primary"] button:has-text("Brand Intelligence")').first().click();
  await page.waitForTimeout(800);
  await page.fill('input[placeholder="Search..."]', 'Tapatío');
  await page.waitForTimeout(400);
  await page.locator('table tbody tr').first().click();
  await page.waitForTimeout(600);
  await page.locator('button:has-text("Outreach")').first().click();
  await page.waitForTimeout(600);
  await expect(page.locator('[data-section="recommendation"]').first()).toBeVisible({ timeout: 6000 });
}

test.describe('Phase D3 — outreach provider hardening', () => {
  test('1. honest provider state + full approval flow with no credentials configured', async ({ page }) => {
    await openOutreach(page);

    // The demo default is NOT a live provider and must say so plainly.
    await expect(page.locator('[data-section="targeting"]').first())
      .toContainText('simulation (no provider connected)');

    // Human approval: prepare → modify → approve → send (all without credentials).
    await page.locator('button[data-state="prepare"]').first().click();
    await expect(page.locator('[data-notice="ok"]').first()).toBeVisible({ timeout: 6000 });
    await expect(page.locator('[data-section="recommendation"]')).toContainText('revision 1');
    await expect(page.locator('[data-section="recommendation"]')).toContainText('status pending_approval');

    await page.locator('textarea').first().fill('Operator-modified body — approved after review.');
    await page.locator('button[data-state="modify"]').first().click();
    await expect(page.locator('[data-section="recommendation"]')).toContainText('revision 2', { timeout: 6000 });

    await page.locator('button[data-state="approve"]').first().click();
    await expect(page.locator('[data-section="recommendation"]')).toContainText('status approved', { timeout: 6000 });

    await page.locator('button[data-state="send"]').first().click();
    await expect(page.locator('[data-notice="ok"]').first()).toContainText('simulation', { timeout: 8000 });
    // The stored revision records the SIMULATION transport — never a live claim.
    await expect(page.locator('[data-section="recommendation"]')).toContainText('status sent');
    await expect(page.locator('[data-section="recommendation"]')).toContainText('transport simulation');
    await expect(page.locator('[data-section="recommendation"]')).not.toContainText('transport live');
  });

  test('2. the whole flow makes zero external network requests', async ({ page }) => {
    const external: string[] = [];
    page.on('request', (req) => {
      const url = req.url();
      const isLocal = url.startsWith('http://localhost') || url.startsWith('http://127.0.0.1');
      const isWs = url.startsWith('ws://') || url.startsWith('wss://');
      if (!isLocal && !isWs) external.push(url);
    });

    await openOutreach(page);
    const baseline = external.length;

    await page.locator('button[data-state="prepare"]').first().click();
    await expect(page.locator('[data-notice="ok"]').first()).toBeVisible({ timeout: 6000 });
    await page.locator('button[data-state="approve"]').first().click();
    await expect(page.locator('[data-section="recommendation"]')).toContainText('status approved', { timeout: 6000 });
    await page.locator('button[data-state="send"]').first().click();
    await expect(page.locator('[data-notice="ok"]').first()).toContainText('simulation', { timeout: 8000 });
    await page.waitForTimeout(600);

    // No NEW external request after the flow began (assets/fonts excluded by baseline).
    expect(external.slice(baseline)).toEqual([]);
  });

  test('3. human approval needs neither Rakazo nor Postiz', async ({ page }) => {
    await openOutreach(page);
    const workflow = page.locator('[data-section="acquisition-workflow"]').first();

    // No Rakazo/Postiz surface is present on, or required by, the approval path.
    await expect(page.locator('iframe[title="Rakazo Bot Dashboard"]')).toHaveCount(0);
    await expect(workflow).not.toContainText('Rakazo');
    await expect(workflow).not.toContainText('Postiz');

    // The approval controls are all present and usable without any other system.
    await expect(page.locator('button[data-state="prepare"]').first()).toBeEnabled();
    await expect(page.locator('[data-section="targeting"]').first())
      .toContainText('simulation (no provider connected)');
  });
});
