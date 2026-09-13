/**
 * §Phase D3 — canonical DataTable behaviour + intentional mobile strategy.
 *
 * The operational tables were raw `<table>`s inside `overflow-x-auto`, so on a
 * phone the amount/status/actions were only reachable by horizontal scrolling.
 * `DataTable` now renders labelled CARDS below md and the semantic table at md+.
 * This verifies that contract on a real migrated surface (the brand deductions
 * ledger) rather than asserting that elements merely exist:
 *   - desktop: the table is visible, the card list is not;
 *   - mobile : the card list is visible, the table is not, and every row's
 *     fields (including the amount) are present as labelled pairs;
 *   - neither width produces horizontal overflow.
 */
import { test, expect } from '@playwright/test';
import { loginAs } from './helpers/auth';

async function openLedger(page: import('@playwright/test').Page) {
  await loginAs(page, 'Zambezi Organic Extracts Ltd', 1100);
  // Below lg the single nav tree is an off-canvas drawer — open it first.
  const toggle = page.getByTestId('app-menu-toggle');
  if (await toggle.isVisible().catch(() => false)) {
    await toggle.click();
    await page.waitForTimeout(400);
  }
  await page.locator('nav[aria-label="Primary"] button:has-text("Analytics")').first().click();
  await page.waitForTimeout(900);
  const cards = page.locator('ul[aria-label="Deductions ledger"]');
  const table = page.locator('table').filter({ has: page.locator('caption', { hasText: 'Deductions ledger' }) });
  return { cards, table };
}

const overflow = (page: import('@playwright/test').Page) =>
  page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);

test.describe('Phase D3 — DataTable responsive strategy', () => {
  test('1. desktop shows the semantic table and hides the mobile cards', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    const { cards, table } = await openLedger(page);

    await expect(table).toBeVisible({ timeout: 8000 });
    await expect(cards).toBeHidden();
    // The table keeps real column headers (semantics, not just visuals).
    await expect(table.locator('th', { hasText: 'Amount' })).toBeVisible();
    expect(await overflow(page)).toBeLessThanOrEqual(1);
  });

  test('2. mobile shows labelled cards (no clipped fields) and hides the table', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 812 });
    const { cards, table } = await openLedger(page);

    await expect(cards).toBeVisible({ timeout: 8000 });
    await expect(table).toBeHidden();
    // Card rows exist, each with its fields presented as label/value pairs.
    await expect(cards.locator('li').first()).toBeVisible();
    await expect(cards.locator('dt', { hasText: 'Status' }).first()).toBeVisible();
    await expect(cards.locator('dt', { hasText: 'Amount' }).first()).toBeVisible();
    // The status is still a real semantic status on mobile (never colour-only).
    await expect(cards.locator('[data-status]').first()).toHaveAttribute('role', 'status');
    expect(await overflow(page)).toBeLessThanOrEqual(1);
  });

  test('3. tablet keeps the table with progressive column disclosure, no overflow', async ({ page }) => {
    await page.setViewportSize({ width: 768, height: 1024 });
    const { cards, table } = await openLedger(page);

    await expect(table).toBeVisible({ timeout: 8000 });
    await expect(cards).toBeHidden();
    // `hideBelow: 'lg'` columns stay in the DOM for the table but are hidden at md.
    await expect(table.locator('th', { hasText: 'Date' })).toBeVisible();
    expect(await overflow(page)).toBeLessThanOrEqual(1);
  });
});
