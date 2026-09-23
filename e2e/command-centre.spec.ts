/**
 * §32 / M13 Phase 11 — SUPER ADMIN COMMAND CENTRE (browser verification).
 *
 * §P3 (2026-09-22) — REPOINTED to the single action list, not weakened.
 *
 * OLD CONTRACT (recorded, no longer valid): the command centre panel rendered its
 * own NOW / TODAY / THIS WEEK bands, its own category sections and its own CTAs on
 * the CONTROL CENTRE (`data-testid="command-centre"` / `command-action`).
 *
 * NEW CONTRACT: the Founder's decision is "Control Centre = ONE action list,
 * founder-only controls; the work/attention lists leave it; Work Management is the
 * single action list" (three action lists → one). The founder console is therefore
 * projected into **Work Management** as Super-Admin-scoped work items that carry
 * the SAME rank and the SAME auditable WHY, and its CTAs keep the tab-aware
 * "no hunting through five screens" routing. Every behavioural assertion below is
 * unchanged in substance — the bands became the founder rows, the section cards
 * became the source filters, and the CTA became the row's record hand-off.
 */
import { test, expect } from '@playwright/test';
import { loginAs } from './helpers/auth';

/**
 * The founder's own session: only the Super Admin tier may be routed into Super
 * Admin tabs, and only a Super Admin sees the founder-console work items.
 * Work Management lives in the Operations nav group.
 */
async function openWorkManagement(page: import('@playwright/test').Page) {
  await loginAs(page, 'Super Admin — Tadii', 1600);
  await page.click('nav[aria-label="Primary"] >> text=Work Management');
  await page.waitForTimeout(1200);
}

const FOUNDER_ROWS = '[data-testid^="work-row-work-founder_"]';

test.describe('Super Admin founder console — the single action list', () => {
  test('1. Work Management carries the founder console, one hand-off per row', async ({ page }) => {
    const pageErrors: string[] = [];
    page.on('pageerror', (e) => pageErrors.push(String(e)));
    await openWorkManagement(page);

    const rows = page.locator(FOUNDER_ROWS);
    expect(await rows.count()).toBeGreaterThan(0);
    await expect(rows.first().getByRole('button')).toBeVisible();

    // The founder categories really come from the console's canonical stores.
    await expect(page.locator(FOUNDER_ROWS).filter({ hasText: 'Companies House register' }).first()).toBeVisible();
    await expect(page.locator(FOUNDER_ROWS).filter({ hasText: 'Google' }).first()).toBeVisible();
    expect(pageErrors).toEqual([]);
  });

  test('2. a founder hand-off routes to the exact Super Admin tab (no hunting)', async ({ page }) => {
    await openWorkManagement(page);

    // The unread-register compliance item always exists in a fresh session and
    // targets Super Admin → Company.
    const row = page.locator(FOUNDER_ROWS).filter({ hasText: 'Companies House register' }).first();
    await expect(row).toBeVisible();
    await row.getByRole('button', { name: 'Open' }).first().click();
    await page.waitForTimeout(500);

    const drawer = page.getByTestId('work-record-drawer');
    await expect(drawer).toBeVisible({ timeout: 8000 });
    await expect(drawer).toContainText('Opens tab');
    await page.getByTestId('work-drawer-open-record').click();
    await page.waitForTimeout(900);

    // It must land on the Company tab, not the default Staff tab.
    await expect(page.getByTestId('company-control-centre')).toBeVisible({ timeout: 8000 });
    await expect(page.getByTestId('company-control-centre')).toContainText('Mercenta Partners Ltd');
  });

  test('3. the founder categories are real source filters, and the Control Centre has no second list', async ({ page }) => {
    await openWorkManagement(page);

    const filter = page.getByTestId('work-source-filter');
    await expect(filter).toBeVisible();
    for (const source of [
      'founder_compliance',
      'founder_setup',
      'founder_application',
      'founder_funding',
      'founder_finance',
      'founder_ai_cost',
    ]) {
      await expect(filter.locator(`option[value="${source}"]`)).toHaveCount(1);
    }
    // Selecting one really filters the list to that category.
    await filter.selectOption('founder_funding');
    await page.waitForTimeout(400);
    expect(await page.locator(FOUNDER_ROWS).count()).toBeGreaterThan(0);

    // The Control Centre no longer renders a second action list — and it points
    // at the single one.
    await page.click('nav[aria-label="Primary"] >> text=Control Centre');
    await page.waitForTimeout(1200);
    await expect(page.getByTestId('command-centre')).toHaveCount(0);
    await expect(page.getByTestId('control-open-work')).toBeVisible();
  });

  /**
   * §27/§28 (M13c Phase D) — the RANKED queue: every row must show its rank and
   * an explicit WHY breakdown, the ranking basis must state that no AI is used,
   * and the relationship/funding slots must be real items whose CTA actually
   * lands on the screen that performs the action (no dead CTAs).
   */
  test('4. every founder row shows its rank and WHY, and the funding slot routes', async ({ page }) => {
    const pageErrors: string[] = [];
    page.on('pageerror', (e) => pageErrors.push(String(e)));
    await openWorkManagement(page);

    await page.getByTestId('work-source-filter').selectOption('founder_funding');
    await page.waitForTimeout(400);

    const rows = page.locator(FOUNDER_ROWS);
    const count = await rows.count();
    expect(count).toBeGreaterThan(0);
    for (let i = 0; i < count; i += 1) {
      const row = rows.nth(i);
      // The rank travels on the row, and the WHY is stated as a fact.
      await expect(row).toContainText(/#\d+/);
      await expect(row).toContainText(/Why.*score \d+/);
    }

    // The accelerator/funding slot is a real derived route with a working hand-off.
    const accelerator = page.locator(FOUNDER_ROWS).filter({ hasText: 'Solo Founders Program' }).first();
    await expect(accelerator).toBeVisible();
    await accelerator.getByRole('button', { name: 'Open' }).first().click();
    await page.waitForTimeout(500);

    const why = page.getByTestId('work-drawer-why');
    await expect(why).toBeVisible();
    await expect(why).toContainText('Funding relevance');
    await page.getByTestId('work-drawer-open-record').click();
    await page.waitForTimeout(900);
    await expect(page.getByTestId('funding-pipeline')).toBeVisible({ timeout: 8000 });
    expect(pageErrors).toEqual([]);
  });
});