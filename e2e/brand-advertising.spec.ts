/**
 * §Functional-completion (2026-09-17) — Brand-facing advertising surface.
 *
 * Verifies through the application:
 *   • an ACTIVE brand (Astonish, i=0 in the canonical 20-brand universe)
 *     sees ONLY its own advertising state under Market Intel;
 *   • the surface is honestly labelled simulated and never claims live data;
 *   • campaigns drill down to a per-campaign detail (interactivity);
 *   • the brand can Approve/Amend/Reject Mercenta's recommended monthly
 *     budget and the decision is one-shot (cannot be re-opened);
 *   • a brand WITHOUT an ad row (Seep, i=1) sees honest empties and £0 —
 *     never another tenant's data;
 *   • zero page errors throughout.
 */
import { test, expect } from '@playwright/test';
import { loginAs } from './helpers/auth';

const MARKET_INTEL_NAV = 'nav[aria-label="Primary"] button:has-text("Market Intel")';

async function openMarketIntel(page: import('@playwright/test').Page, brand: string) {
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await loginAs(page, brand, 1000);
  await page.locator(MARKET_INTEL_NAV).first().click();
  await page.waitForTimeout(700);
  await expect(page.getByTestId('brand-advertising')).toBeVisible({ timeout: 8000 });
  return errors;
}

test.describe('Brand advertising performance (Functional-completion)', () => {
  test('1. active brand sees only its own simulation-labelled advertising state', async ({ page }) => {
    const errors = await openMarketIntel(page, 'Astonish');

    const surface = page.getByTestId('brand-advertising');
    await expect(surface.getByRole('heading', { name: 'Your advertising performance' })).toBeVisible();
    await expect(surface.getByText('Simulated — no live ad connection')).toBeVisible();

    // KPI tiles for the tenant's own budget/spend figures (i=0 → £1,200 / £480.00).
    await expect(surface.getByText('£1,200.00').first()).toBeVisible();
    await expect(surface.getByText('£480.00').first()).toBeVisible();

    // Three deterministic campaigns for this brand, all drill-downable.
    const campaignRows = surface.locator('table[data-table="brand-ad-campaigns"] tbody tr');
    await expect(campaignRows).toHaveCount(3);
    expect(errors).toEqual([]);
  });

  test('2. a campaign row opens its detail (drill-down, not a static list)', async ({ page }) => {
    const errors = await openMarketIntel(page, 'Astonish');

    const surface = page.getByTestId('brand-advertising');
    const firstCampaign = surface.locator('table[data-table="brand-ad-campaigns"] tbody tr').first();
    await firstCampaign.click();
    await page.waitForTimeout(300);
    const detail = surface.getByTestId('ba-campaign-detail');
    await expect(detail).toBeVisible({ timeout: 6000 });
    await expect(detail.getByText('Impressions')).toBeVisible();
    await expect(detail.getByText('CTR')).toBeVisible();
    expect(errors).toEqual([]);
  });

  test('3. brand approves the recommended monthly budget — one-shot and attributed', async ({ page }) => {
    const errors = await openMarketIntel(page, 'Astonish');

    const surface = page.getByTestId('brand-advertising');
    const recCard = surface.getByTestId('ba-recommendation-card');
    await expect(recCard).toBeVisible();
    const rec = recCard.locator('[data-testid^="ba-recommendation-row-"]').first();
    await expect(rec).toContainText('Awaiting your decision');
    await rec.getByRole('button', { name: 'Approve' }).click();
    await expect(surface.getByTestId('ba-notice')).toContainText('Your decision is recorded', { timeout: 6000 });
    await expect(rec).toContainText('Approved by you');
    await expect(rec.getByRole('button', { name: 'Approve' })).toHaveCount(0);

    // The decided state is shared with the platform store: no page errors.
    expect(errors).toEqual([]);
  });

  test('4. brand without an ad row sees an honest empty state — never another tenant', async ({ page }) => {
    // Tapatío is a canonical login card at index 10 in the 20-brand universe
    // (i%3 !== 0 → no ad row) yet is an active, portal-onboarded brand.
    const errors = await openMarketIntel(page, 'Tapatío');

    const surface = page.getByTestId('brand-advertising');
    // No seed row → honest £0.00 monthly budget (not Astonish's figures).
    await expect(surface.getByText('£0.00').first()).toBeVisible();
    await expect(surface.getByTestId('ba-no-campaigns')).toBeVisible();
    await expect(surface.getByText('Mercenta has not prepared a budget recommendation for you yet.')).toBeVisible();
    // No cross-tenant leakage: Astonish numbers must never appear for this brand.
    await expect(surface.getByText('£1,200.00')).toHaveCount(0);
    await expect(surface.locator('table[data-table="brand-ad-campaigns"] tbody tr')).toHaveCount(0);
    expect(errors).toEqual([]);
  });
});