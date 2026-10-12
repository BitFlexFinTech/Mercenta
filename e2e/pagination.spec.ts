/**
 * §BATCH 10 — PAGINATION COVERAGE.
 *
 * Registry row `s0-discovered-pagination-and-error-boundary-coverage-gap`.
 *
 * WHY THIS EXISTS
 * ---------------
 * The S0 coverage audit found that NO browser spec asserted pagination behaviour
 * — not page switching, not page size, not totals — even though the platform
 * owns a canonical pagination primitive (`src/components/ui.tsx → Pagination`)
 * and a search / filter / sort / PAGINATION table layer
 * (`src/components/shared/DataTable.tsx`, mounted by the admin Global Catalog and
 * the Contract Cycle). A regression that broke the controls, the page count or
 * the totals could therefore ship unseen.
 *
 * The deterministic demo carries only FOUR catalogue products (two cleared
 * brands, two SKUs each), so at the default page size of 10 the DataTable cannot
 * show a second page. This spec therefore proves BOTH halves:
 *   · the canonical `Pagination` primitive end-to-end on the one surface that
 *     mounts it (Super Admin → Design System): its page count, its Previous /
 *     Next enablement and REAL page switching across four pages; and
 *   · the admin Global Catalog's real DataTable pagination, after a LARGER
 *     catalogue is injected IN FLIGHT (the dev-server route patches
 *     `src/data/demoData.ts` so each cleared brand carries twelve SKUs — the SAME
 *     no-application-change technique `state-coverage.spec.ts` already uses):
 *     page switching, the page-size control and the totals the header reports.
 *
 * If either injection seam disappears the spec FAILS LOUDLY — a gate that tests
 * nothing must never pass (rule 07).
 */
import { test, expect, type Page } from '@playwright/test';
import { loginAs } from './helpers/auth';

/** The catalogue header's own total ("X of Y products") is the owner of the count. */
async function headerTotal(page: Page): Promise<number> {
  const text = await page.getByText(/\d+ of \d+ products/).first().innerText();
  return Number(text.match(/(\d+) of (\d+)/)![2]);
}

/** Make the demo catalogue large enough to paginate, WITHOUT touching app code. */
async function enlargeCatalog(page: Page) {
  await page.route('**/src/data/demoData.ts*', async (route) => {
    const res = await route.fetch();
    const body = await res.text();
    const patched = body.replace(
      '[1, 2].map((n) => ({',
      '[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map((n) => ({'
    );
    if (patched === body) {
      throw new Error(
        'pagination gate: the demoData product-count seam was not found — the gate would test nothing'
      );
    }
    await route.fulfill({
      response: res,
      body: patched,
      headers: { ...res.headers(), 'content-type': 'application/javascript' },
    });
  });
}

/** Open the off-canvas primary nav on narrow viewports before clicking a nav item. */
async function openPrimaryNav(page: Page) {
  const toggle = page.getByTestId('app-menu-toggle');
  if (await toggle.isVisible().catch(() => false)) {
    await toggle.click();
    await page.waitForTimeout(300);
  }
}

test.describe('§BATCH 10 — pagination behaviour', () => {
  test('1. the canonical Pagination primitive switches pages and reports its page count', async ({ page }) => {
    await loginAs(page, 'Super Admin — Tadii', 900);
    // Super Admin → Design System — the one surface that mounts `Pagination`.
    await openPrimaryNav(page);
    await page.click('nav >> text=Super Admin');
    await page.waitForTimeout(600);
    await page.click('text=Design System');
    await page.waitForTimeout(500);

    const pager = page.locator('nav[aria-label="Pagination"]').first();
    await expect(pager).toBeVisible({ timeout: 8000 });
    const label = pager.getByTestId('pagination-page');
    const prev = pager.locator('button').first();
    const next = pager.locator('button').last();

    // TOTALS — the primitive is told there are four pages.
    await expect(label).toHaveText('Page 1 of 4');
    await expect(prev).toBeDisabled();
    await expect(next).toBeEnabled();

    // PAGE SWITCHING — forward to the last page, then back one.
    await next.click();
    await expect(label).toHaveText('Page 2 of 4');
    await expect(prev).toBeEnabled();
    await next.click();
    await next.click();
    await expect(label).toHaveText('Page 4 of 4');
    await expect(next).toBeDisabled();
    await prev.click();
    await expect(label).toHaveText('Page 3 of 4');
  });

  test('2. the admin catalogue DataTable paginates — page switching, page size and totals', async ({ page }) => {
    await enlargeCatalog(page);
    await loginAs(page, 'Super Admin — Tadii', 1200);
    await openPrimaryNav(page);
    await page.locator('nav[aria-label="Primary"]').getByText('Global Catalog', { exact: true }).first().click();
    await page.waitForTimeout(900);

    const table = page.locator('table[data-table="global-catalogue"]');
    await expect(table).toBeVisible({ timeout: 10000 });
    const rows = table.locator('tbody tr');

    const total = await headerTotal(page);
    const expectedPages = Math.ceil(total / 10);
    // The seam really did enlarge the catalogue into more than one page.
    expect(total, 'the injected catalogue must exceed one page of ten').toBeGreaterThan(10);
    expect(expectedPages).toBeGreaterThan(1);

    const size = page.locator('select[aria-label="Rows per page"]');
    const prev = page.getByRole('button', { name: 'Previous page' });
    const next = page.getByRole('button', { name: 'Next page' });
    const indicator = page.locator('span.font-mono', { hasText: /^\d+ \/ \d+$/ }).first();

    // TOTALS — page 1 of ceil(total / 10), one full page of rows, Previous off.
    await expect(size).toHaveValue('10');
    await expect(indicator).toHaveText(`1 / ${expectedPages}`);
    await expect(prev).toBeDisabled();
    await expect(rows).toHaveCount(10);

    // PAGE SWITCHING — the second page shows different rows.
    const firstRow = await rows.first().innerText();
    await next.click();
    await expect(indicator).toHaveText(`2 / ${expectedPages}`);
    await expect(prev).toBeEnabled();
    await expect(rows.first()).not.toHaveText(firstRow);

    // PAGE SIZE — fifty rows per page collapses the list to a single page.
    await size.selectOption('50');
    await expect(indicator).toHaveText('1 / 1');
    await expect(next).toBeDisabled();
    await expect(rows).toHaveCount(total);
  });
});
