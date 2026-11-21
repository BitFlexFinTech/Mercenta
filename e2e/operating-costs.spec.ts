/**
 * §27 / M13 Phase 10 — OPERATING COSTS (browser verification, Super Admin).
 *
 * Proves the cost surface is real in the UI:
 *   1. it renders every provider line with an explicit source label and states
 *      that no live billing API is connected;
 *   2. the AI section reports the runtime maximum model, the ceilings and the
 *      cost-protection state, and honestly says when no AI call has been made;
 *   3. the pricing inputs are flagged as requiring founder approval and the
 *      subscription price is shown as unset, with the break-even figure derived.
 */
import { test, expect } from '@playwright/test';
import { loginAs } from './helpers/auth';
/**
 * §BRAND REDESIGN (2026-11-19) — THE COUNT IS READ FROM THE OWNER, NOT RETYPED.
 *
 * This spec asserted a hardcoded 13 provider lines. The owner
 * (`src/config/operatingCosts.ts`) holds 11, so the assertion failed for a
 * reason that had nothing to do with the product being wrong: a hand-maintained
 * number in a test had drifted from the data it described. Importing the owner's
 * own list means the assertion cannot drift again — add or remove a provider and
 * this test follows automatically, while still failing if the UI stops rendering
 * one that the owner declares.
 */
import { OPERATING_COST_LINES } from '../src/config/operatingCosts';

async function openCosts(page: import('@playwright/test').Page) {
  await loginAs(page, 'Super Admin — Tadii', 1400);
  await page.locator('button:has-text("Super Admin")').first().click();
  await page.waitForTimeout(600);
  await page.locator('button:has-text("Operating Costs")').first().click();
  await page.waitForTimeout(600);
}

test.describe('Operating costs', () => {
  test('1. it renders the provider lines, labels and the honest disclaimer', async ({ page }) => {
    const pageErrors: string[] = [];
    page.on('pageerror', (e) => pageErrors.push(String(e)));
    await openCosts(page);

    const panel = page.getByTestId('operating-costs');
    await expect(panel).toBeVisible({ timeout: 8000 });
    await expect(panel).toContainText('No live billing API is connected');

    const rows = page.getByTestId('cost-provider');
    await expect(rows).toHaveCount(OPERATING_COST_LINES.length);
    // Every line is labelled; nothing claims LIVE.
    const text = await page.getByTestId('cost-providers').innerText();
    expect(text).toMatch(/MANUAL|ESTIMATED|NOT CONNECTED/);
    expect(text).not.toMatch(/\bLIVE\b/);
    await expect(page.getByTestId('cost-providers')).toContainText('OpenRouter');
    await expect(page.getByTestId('cost-providers')).toContainText('NOT CONNECTED');
    expect(pageErrors).toEqual([]);
  });

  test('2. the AI section shows the policy model, ceilings and cost protection', async ({ page }) => {
    await openCosts(page);
    await expect(page.getByTestId('operating-costs')).toContainText('deepseek/deepseek-v4-flash');
    await expect(page.getByTestId('ai-protection-reason')).toContainText('Within the configured AI ceilings');
    // No runtime call has been made in a fresh session — and the panel says so.
    await expect(page.getByTestId('ai-usage-empty')).toContainText('Nothing is claimed');
    await expect(page.getByTestId('ai-calls')).toHaveText('0');
    await expect(page.getByTestId('ai-refused')).toHaveText('0');
  });

  test('3. pricing stays unset + founder-gated, and the break-even figure is derived', async ({ page }) => {
    await openCosts(page);
    await expect(page.getByTestId('cost-inputs')).toContainText('requires founder approval');
    await expect(page.getByTestId('cost-inputs')).toContainText('Brand subscription (default plan)');
    await expect(page.getByTestId('cost-inputs')).toContainText('£0.00/month');
    await expect(page.getByTestId('derived-min-subscription')).toContainText('Break-even subscription per brand');
    await expect(page.getByTestId('revenue-streams')).toContainText('not priced — founder approval required');
    await expect(page.getByTestId('contribution-gross')).toBeVisible();
  });
});