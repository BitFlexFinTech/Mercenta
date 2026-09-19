/**
 * §12 / PHASE 1 (0B.4 #1) — AMAZON ADS DASHBOARD e2e.
 *
 * Verifies the REQUIRED ad-spend surface is a real, wired platform view:
 *   • reachable from Super Admin navigation;
 *   • renders one row per brand in the canonical universe (dataset completeness);
 *   • KPI tiles are derived from the seam (active campaigns = i%3 of the brand
 *     universe), not hardcoded;
 *   • clearly labelled SIMULATED (never a fabricated live claim);
 *   • a row click opens the per-brand detail (interactivity, not a static card);
 *   • zero page errors.
 */
import { test, expect } from '@playwright/test';
import { loginAs } from './helpers/auth';

// ALL_DEMO_BRANDS = 20 canonical real brands (10 UK + 10 international).
const BRAND_UNIVERSE = 20;
// demoAdSpend = brands where i % 3 === 0 → active. 20 brands → indices 0,3,6,9,12,15,18.
const ACTIVE_CAMPAIGNS = 7;

test.describe('Phase 1 — Amazon Ads dashboard (REQUIRED §12)', () => {
  test('1. reachable from Super Admin nav and renders the seam truthfully', async ({ page }) => {
    const errors: string[] = [];
    page.on('pageerror', (e) => errors.push(e.message));

    await loginAs(page, 'Super Admin — Tadii', 1200);
    await page.locator('nav[aria-label="Primary"] button:has-text("Ad Spend")').first().click();
    await page.waitForTimeout(700);

    const dash = page.getByTestId('amazon-ads-dashboard');
    await expect(dash).toBeVisible({ timeout: 8000 });
    await expect(dash.getByRole('heading', { name: 'Amazon Ads' })).toBeVisible();

    // One row per brand in the canonical universe (no curated subset hidden).
    const rows = dash.locator('table[data-table="amazon-ads"] tbody tr');
    await expect(rows).toHaveCount(BRAND_UNIVERSE);

    // KPI tiles derived from the seam.
    await expect(dash.getByText(`${ACTIVE_CAMPAIGNS}`, { exact: true }).first()).toBeVisible();
    await expect(dash.getByText(`${ACTIVE_CAMPAIGNS}/${BRAND_UNIVERSE}`, { exact: true })).toBeVisible();

    // Honest simulated label — never a fabricated live claim.
    await expect(dash.getByText(/Data is simulated from the platform seed seam/i).first()).toBeVisible();
    await expect(dash.getByText(/No live ad data is claimed/i).first()).toBeVisible();

    expect(errors).toEqual([]);
  });

  test('2. a brand row opens its detail (not a static card)', async ({ page }) => {
    await loginAs(page, 'Super Admin — Tadii', 1200);
    await page.locator('nav[aria-label="Primary"] button:has-text("Ad Spend")').first().click();
    await page.waitForTimeout(700);

    const dash = page.getByTestId('amazon-ads-dashboard');
    await expect(dash).toBeVisible({ timeout: 8000 });

    // Click the first row; the per-brand detail card must appear with figures.
    const firstRow = dash.locator('table[data-table="amazon-ads"] tbody tr').first();
    await firstRow.click();
    await page.waitForTimeout(300);
    await expect(dash.getByText('Monthly budget').first()).toBeVisible();
  });

  test('3. campaign drill-down + manual budget input (functional, not a static card)', async ({ page }) => {
    const errors: string[] = [];
    page.on('pageerror', (e) => errors.push(e.message));

    await loginAs(page, 'Super Admin — Tadii', 1200);
    await page.locator('nav[aria-label="Primary"] button:has-text("Ad Spend")').first().click();
    await page.waitForTimeout(700);

    const dash = page.getByTestId('amazon-ads-dashboard');
    await expect(dash).toBeVisible({ timeout: 8000 });
    await dash.locator('table[data-table="amazon-ads"] tbody tr').first().click();
    await page.waitForTimeout(300);

    // Campaigns for the first (active) brand are listed.
    await expect(dash.getByTestId('ad-campaigns-panel')).toBeVisible();
    const campaignRows = dash.locator('table[data-table="ad-campaigns"] tbody tr');
    await expect(campaignRows).toHaveCount(3);

    // Manual monthly budget input updates the row immediately (simulation).
    await dash.getByRole('button', { name: 'Set monthly budget' }).click();
    const budgetInput = dash.getByTestId('ad-budget-input');
    await budgetInput.fill('1500');
    await dash.getByRole('button', { name: 'Save budget' }).click();
    await expect(dash.getByTestId('ad-budget-notice')).toContainText('£1,500', { timeout: 6000 });
    // The shared store + query invalidation reflect the new value in the table row.
    await expect(dash.locator('table[data-table="amazon-ads"] tbody tr').first()).toContainText('£1,500.00', { timeout: 6000 });

    expect(errors).toEqual([]);
  });

  test('4. recommended monthly spend can be approved (attributed, one-shot)', async ({ page }) => {
    const errors: string[] = [];
    page.on('pageerror', (e) => errors.push(e.message));

    await loginAs(page, 'Super Admin — Tadii', 1200);
    await page.locator('nav[aria-label="Primary"] button:has-text("Ad Spend")').first().click();
    await page.waitForTimeout(700);

    const dash = page.getByTestId('amazon-ads-dashboard');
    await expect(dash).toBeVisible({ timeout: 8000 });
    await dash.locator('table[data-table="amazon-ads"] tbody tr').first().click();
    await page.waitForTimeout(300);

    const recCard = dash.getByTestId('ad-recommendation-card');
    await expect(recCard).toBeVisible();
    const rec = recCard.locator('[data-testid^="ad-recommendation-row-"]').first();
    await expect(rec).toContainText('Proposed');
    await rec.getByRole('button', { name: 'Approve' }).click();
    await expect(dash.getByTestId('ad-rec-notice')).toContainText('approved', { timeout: 6000 });
    await expect(rec).toContainText('Approved by brand');

    // A settled recommendation cannot be re-opened — buttons disappear / notice stays final.
    await expect(rec.getByRole('button', { name: 'Approve' })).toHaveCount(0);

    expect(errors).toEqual([]);
  });

});