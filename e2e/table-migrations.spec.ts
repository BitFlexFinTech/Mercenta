/**
 * §Phase D — the migrated operational tables, verified by INTENT.
 *
 * Migrating a raw `<table>` to the canonical `DataTable` is only a real
 * improvement if the things that made the raw table usable survive:
 *   - no field and no ACTION becomes unreachable at 375px;
 *   - interactive controls stay interactive (never become static labels);
 *   - changing a control updates the SAME record's canonical status;
 *   - the page never gains horizontal overflow.
 *
 * The catalogue is the hardest case (15 columns) and the carrier manifest is
 * the only migrated table whose control writes domain state, so those two are
 * asserted end-to-end here; the remaining migrations are covered by their own
 * existing specs (deductions column indices, Logistics Control PO link, etc.).
 */
import { test, expect } from '@playwright/test';
import { loginAs } from './helpers/auth';

async function openNav(page: import('@playwright/test').Page, label: string) {
  // Below lg the single nav tree is an off-canvas drawer — open it first.
  const toggle = page.getByTestId('app-menu-toggle');
  if (await toggle.isVisible().catch(() => false)) {
    await toggle.click();
    await page.waitForTimeout(400);
  }
  await page.locator(`nav[aria-label="Primary"] button:has-text("${label}")`).first().click();
  await page.waitForTimeout(900);
}

const overflow = (page: import('@playwright/test').Page) =>
  page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);

test.describe('Phase D — migrated operational tables', () => {
  test('1. the 15-column catalogue reads as labelled cards on a phone, with every field and action', async ({
    page,
  }) => {
    await page.setViewportSize({ width: 375, height: 812 });
    await loginAs(page, 'Zambezi Organic Extracts Ltd', 1100);
    await openNav(page, 'Product Catalog');

    const cards = page.locator('ul[aria-label="Product catalogue"]');
    const table = page.locator('table[data-table="product-catalogue"]');
    await expect(cards).toBeVisible({ timeout: 8000 });
    // Exactly ONE representation is in the DOM at a time (no hidden duplicate).
    await expect(table).toHaveCount(0);

    const first = cards.locator('li').first();
    await expect(first).toBeVisible();
    // Trade + logistics columns are reachable as labelled pairs, not squeezed out.
    for (const label of [
      'SKU / Barcode',
      'Ex-Works (£)',
      'UK MSRP (£)',
      'Commodity Code',
      'Availability',
      'Submission',
      'Actions',
    ]) {
      await expect(first.locator('dt', { hasText: label }).first()).toBeVisible();
    }

    // The availability control is a real control on mobile and its click has a
    // visible consequence (it is not a decorative chip).
    const toggle = first.locator('button[aria-label^="Toggle availability for"]');
    await expect(toggle).toBeVisible();
    await expect(toggle).toBeEnabled();
    const before = (await toggle.innerText()).trim();
    await toggle.click();
    await expect(toggle).not.toHaveText(before);

    expect(await overflow(page)).toBeLessThanOrEqual(1);
  });

  test('2. the carrier manifest keeps its interactive milestone select on a phone and the canonical status follows it', async ({
    page,
  }) => {
    await page.setViewportSize({ width: 375, height: 812 });
    await loginAs(page, '3PL Carrier Terminal', 1100);
    await openNav(page, 'Manifest Management');

    const cards = page.locator('ul[aria-label="Carrier manifest"]');
    await expect(cards).toBeVisible({ timeout: 8000 });
    await expect(page.locator('table[data-table="carrier-manifest"]')).toHaveCount(0);

    const select = page.locator('select[aria-label^="Update milestone for"]').first();
    await expect(select).toBeVisible();
    await expect(select).toBeEnabled();

    const target = 'mercenta_hub';
    const label = (await select.locator(`option[value="${target}"]`).innerText()).trim();
    await select.selectOption(target);
    await expect(select).toHaveValue(target);

    // The SAME record's canonical status badge now reads the new milestone label
    // (state really propagated; the control was not converted to a static label).
    const card = cards
      .locator('li')
      .filter({ has: page.locator('select[aria-label^="Update milestone for"]') })
      .first();
    await expect(card.locator('[data-status]').first()).toContainText(label);

    expect(await overflow(page)).toBeLessThanOrEqual(1);
  });
});
