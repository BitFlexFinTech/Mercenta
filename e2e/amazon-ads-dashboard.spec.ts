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

// ALL_DEMO_BRANDS = 10 demo brands + 1 PC brand + 2 compliance-scenario brands.
const BRAND_UNIVERSE = 13;
// demoAdSpend = brands where i % 3 === 0 → active. 13 brands → indices 0,3,6,9,12.
const ACTIVE_CAMPAIGNS = 5;

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
});
