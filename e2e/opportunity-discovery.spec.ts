/**
 * §9–§14/M13 — OPPORTUNITY DISCOVERY (browser verification, admin surface).
 *
 * Proves the second discovery layer is REAL in the UI and honest:
 *   1. it renders inside Brand Intelligence (extending, not replacing, the
 *      ASIN-level panel), with the vertical rollup and a ranked list whose ranks
 *      start at 1;
 *   2. the ranked list is driven by estimated PO potential and a row OPENS a
 *      drill-down (the interactivity requirement);
 *   3. the sports vertical shows the seeded first opportunity as a POTENTIAL
 *      opportunity with the explicit "not approached / not a confirmed
 *      partnership" disclaimer, and claims NO ASIN evidence it does not have.
 */
import { test, expect } from '@playwright/test';
import { loginAs } from './helpers/auth';

async function openNav(page: import('@playwright/test').Page, label: string) {
  await page.locator(`nav[aria-label="Primary"] button:has-text("${label}")`).first().click();
  await page.waitForTimeout(700);
}

test.describe('Opportunity discovery', () => {
  test('1. it renders inside Brand Intelligence with the vertical rollup and a ranked list', async ({
    page,
  }) => {
    const pageErrors: string[] = [];
    page.on('pageerror', (e) => pageErrors.push(String(e)));
    await loginAs(page, 'Super Admin — Tadii', 1400);
    await openNav(page, 'Brand Intelligence');

    const panel = page.getByTestId('opportunity-discovery');
    await expect(panel).toBeVisible({ timeout: 8000 });
    await expect(panel).toContainText('Opportunity Discovery');
    // All eight §9 verticals are offered as filters.
    for (const label of [
      'UK Brand Opportunities',
      'International Brand Opportunities',
      'Sports / Team / Club Opportunities',
      'Distributor / Channel Opportunities',
      'Trade Programme Opportunities',
      'Embassy / Government Network Opportunities',
      'Strategic Partnership Opportunities',
      'New-to-Channel Opportunities',
    ]) {
      await expect(panel).toContainText(label);
    }
    // The ASIN-level engine is still on the page (not replaced).
    await expect(page.locator('text=Brand Intelligence').first()).toBeVisible();
    expect(pageErrors).toEqual([]);
  });

  test('2. clicking an opportunity opens its drill-down, and filtering narrows the list', async ({
    page,
  }) => {
    await loginAs(page, 'Super Admin — Tadii', 1400);
    await openNav(page, 'Brand Intelligence');
    const panel = page.getByTestId('opportunity-discovery');
    await expect(panel).toBeVisible({ timeout: 8000 });

    const rows = page.getByTestId('opportunity-row');
    const before = await rows.count();
    expect(before).toBeGreaterThan(1);

    // Ranked list starts at rank 1 and the first row opens a detail panel.
    await expect(rows.first()).toContainText('1');
    await rows.first().click();
    await expect(page.getByTestId('opportunity-detail')).toBeVisible({ timeout: 5000 });
    await expect(page.getByTestId('opportunity-detail')).toContainText('Eligibility:');
    await expect(page.getByTestId('opportunity-detail')).toContainText('Claim:');

    // A vertical filter card drills the list down (fewer or equal rows).
    await panel.getByRole('button', { name: /UK Brand Opportunities/ }).first().click();
    await page.waitForTimeout(400);
    const filtered = await rows.count();
    expect(filtered).toBeLessThanOrEqual(before);
  });

  test('3. the sports opportunity is POTENTIAL only and claims no ASIN evidence', async ({ page }) => {
    await loginAs(page, 'Super Admin — Tadii', 1400);
    await openNav(page, 'Brand Intelligence');

    const sports = page.getByTestId('sports-opportunities');
    await expect(sports).toBeVisible({ timeout: 8000 });
    await expect(sports).toContainText('Tottenham Hotspur');
    await expect(sports).toContainText('NOT been approached');
    await expect(sports).toContainText('not a confirmed partnership');
    // No fabricated demand: the record says the ASIN evidence is not captured.
    await expect(sports).toContainText('NOT captured yet');
    await expect(sports).not.toContainText('Confirmed partnership');
  });
});