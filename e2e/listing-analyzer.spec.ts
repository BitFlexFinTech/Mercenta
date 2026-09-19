/**
 * §Functional-completion (2026-09-17) — Automated Listing Analyzer (§8).
 *
 * Verifies through the application:
 *   • the analyzer renders inside Market Intel with Mercenta-prepared
 *     deterministic health, dimension scores and estimated market position;
 *   • every figure is honestly labelled simulated (never live data);
 *   • the brand can Approve / Edit / Reject each suggested improvement and
 *     the decision is one-shot and shows its final status;
 *   • the per-SKU product-performance section is tenant-scoped (Astonish
 *     sees only its own ASTR-* SKUs);
 *   • zero page errors throughout.
 */
import { test, expect } from '@playwright/test';
import { loginAs } from './helpers/auth';

const MARKET_INTEL_NAV = 'nav[aria-label="Primary"] button:has-text("Market Intel")';

async function openMarketIntel(page: import('@playwright/test').Page) {
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await loginAs(page, 'Astonish', 1000);
  await page.locator(MARKET_INTEL_NAV).first().click();
  await page.waitForTimeout(800);
  await expect(page.getByTestId('listing-analyzer')).toBeVisible({ timeout: 8000 });
  return errors;
}

test.describe('Automated Listing Analyzer (Functional-completion)', () => {
  test('1. Mercenta-prepared analysis renders with simulated health + estimates', async ({ page }) => {
    const errors = await openMarketIntel(page);

    const analyzer = page.getByTestId('listing-analyzer');
    await expect(analyzer.getByRole('heading', { name: 'Listing Analyzer' })).toBeVisible();
    await expect(analyzer.getByText('Deterministic simulation', { exact: true })).toBeVisible();

    // Health badge: <level> · <score>/100, prepared by Mercenta, simulation label.
    const health = analyzer.getByTestId('la-health');
    await expect(health).toBeVisible();
    await expect(health.getByText(/· \d{1,3}\/100/)).toBeVisible();
    await expect(health.getByText(/Prepared by Mercenta/)).toBeVisible();
    await expect(health.getByText(/simulated|not measured marketplace data/i)).toBeVisible();

    // All eight health dimensions are present.
    for (const dim of ['title', 'images', 'content', 'pricing', 'demand', 'reviews', 'competition', 'gaps']) {
      await expect(analyzer.getByTestId(`la-dim-${dim}`)).toBeVisible();
    }

    // Estimated market position card (units + revenue + BSR band + demand signal).
    const estimates = analyzer.getByText('Estimated market position');
    await expect(estimates).toBeVisible();
    await expect(analyzer.getByText('Est. units / month')).toBeVisible();
    await expect(analyzer.getByText('Est. BSR band')).toBeVisible();

    expect(errors).toEqual([]);
  });

  test('2. approving a suggestion is one-shot and shows the final status', async ({ page }) => {
    const errors = await openMarketIntel(page);

    const analyzer = page.getByTestId('listing-analyzer');
    const recs = analyzer.getByTestId('la-recommendations');
    await expect(recs).toBeVisible();
    const firstRec = recs.locator('[data-testid^="la-rec-"]').first();
    await expect(firstRec).toContainText('Suggested by Mercenta');
    await firstRec.getByRole('button', { name: 'Approve' }).click();
    await expect(analyzer.getByTestId('la-notice')).toContainText('approved', { timeout: 6000 });
    await expect(firstRec).toContainText('Approved by you');
    await expect(firstRec.getByRole('button', { name: 'Approve' })).toHaveCount(0);

    expect(errors).toEqual([]);
  });

  test('3. editing a suggestion records the brand edit and marks it edited', async ({ page }) => {
    const errors = await openMarketIntel(page);

    const analyzer = page.getByTestId('listing-analyzer');
    const recs = analyzer.getByTestId('la-recommendations');
    const firstRec = recs.locator('[data-testid^="la-rec-"]').first();
    await firstRec.getByRole('button', { name: 'Edit' }).click();
    const recId = (await firstRec.getAttribute('data-testid'))!.replace('la-rec-', '');
    const editor = analyzer.getByTestId(`la-edit-input-${recId}`);
    await editor.fill('Brand copy: emphasise the proven 30-second clean and non-slip grip.');
    await analyzer.getByRole('button', { name: 'Confirm edit' }).click();
    await expect(analyzer.getByTestId('la-notice')).toContainText('edited', { timeout: 6000 });
    await expect(firstRec).toContainText('Edited by you');
    await expect(firstRec.getByText(/Your edited version:/)).toBeVisible();

    expect(errors).toEqual([]);
  });

  test('4. rejecting a suggestion is final', async ({ page }) => {
    const errors = await openMarketIntel(page);

    const analyzer = page.getByTestId('listing-analyzer');
    const recs = analyzer.getByTestId('la-recommendations');
    // Pick the LAST suggestion so it is untouched by prior decisions in this page.
    const rec = recs.locator('[data-testid^="la-rec-"]').last();
    await rec.getByRole('button', { name: 'Reject' }).click();
    await expect(analyzer.getByTestId('la-notice')).toContainText('rejected', { timeout: 6000 });
    await expect(rec).toContainText('Rejected by you');
    await expect(rec.getByRole('button', { name: 'Reject' })).toHaveCount(0);

    expect(errors).toEqual([]);
  });

  test('5. product performance section is tenant-scoped to the brand', async ({ page }) => {
    const errors = await openMarketIntel(page);

    const perf = page.getByTestId('bi-product-performance');
    await expect(perf).toBeVisible();
    await expect(page.locator('[data-testid^="bi-sku-ASTO-"]')).toHaveCount(2);
    // Another tenant's SKU pattern (e.g. Tapatío's TAPT-*) never appears.
    await expect(page.locator('[data-testid^="bi-sku-TAPT-"]')).toHaveCount(0);

    expect(errors).toEqual([]);
  });
});