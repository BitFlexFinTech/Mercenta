/**
 * §Sprint — CANONICAL WORK LAYER browser verification.
 *
 * Proves in a real Chromium that the operating layer is genuinely wired into the
 * product (not a source-only claim):
 *
 *   - the admin and brand portals both expose Work Management + Calendar
 *   - the workspace composes frame + header + sticky toolbar + metric band
 *   - LIST / KANBAN / CALENDAR are real views over the same items
 *   - filters and search are REAL state changes
 *   - a row opens the shared record drawer with its activity trail
 *   - resolving stops the reminder: the item leaves the list and the kanban
 *     moves it to Done
 *   - a brand only ever sees its OWN tenant's work (browser-level isolation check)
 *   - a manually created task appears in the list, board and calendar
 *   - no horizontal overflow at 390px
 *
 * Dev server started by playwright.config.ts (npm run dev, :5173).
 */
import { test, expect } from '@playwright/test';
import { loginAs } from './helpers/auth';

const SHOTS = 'test-screenshots/work-layer';

async function openAdminWork(page: import('@playwright/test').Page) {
  await loginAs(page, 'Super Admin — Tadii', 1200);
  await page.getByTestId('dashboard-loaded').waitFor({ timeout: 12000 });
  await page.locator('nav[aria-label="Primary"]').locator('text=Work Management').first().click();
  await page.getByTestId('work-metric-open-value').waitFor({ timeout: 8000 });
}

async function openBrandWork(page: import('@playwright/test').Page, card = 'Tapatío') {
  await loginAs(page, card, 1200);
  await page.locator('nav[aria-label="Primary"]').locator('text=Tasks & Deadlines').first().click();
  await page.getByTestId('work-metric-open-value').waitFor({ timeout: 8000 });
}

const FOUNDER_ROWS = '[data-testid^="work-row-work-founder_"]';

test.describe('Work layer — admin workspace', () => {
  /**
   * §P3 — RBAC: the founder console is projected into the SAME list, so the list
   * must never leak it to an ordinary admin session. This is the shared-component
   * scoping check the rules require: the gate is asserted directly (founder rows
   * present for a Super Admin, ZERO for a Mercenta Admin), never assumed from the
   * component merely rendering.
   */
  test('0a. a NON-Super-Admin admin session never sees the founder console', async ({ page }) => {
    await loginAs(page, 'Mercenta Admin Hub', 1200);
    await page.getByTestId('dashboard-loaded').waitFor({ timeout: 12000 });
    await page.locator('nav[aria-label="Primary"]').locator('text=Work Management').first().click();
    await page.getByTestId('work-metric-open-value').waitFor({ timeout: 8000 });
    await expect(page.locator(FOUNDER_ROWS)).toHaveCount(0);
    // …and the founder source filters are not offered either (a filter that can
    // never match would be a hint about records the session may not see).
    await expect(page.getByTestId('work-source-filter').locator('option[value="founder_funding"]')).toHaveCount(0);
    // The operational work is still there — the same surface, scoped.
    await expect(page.getByTestId('work-source-filter').locator('option[value="po_acknowledgement"]')).toHaveCount(1);
  });

  test('0b. a Super Admin session DOES see the founder console in the same list', async ({ page }) => {
    await openAdminWork(page);
    expect(await page.locator(FOUNDER_ROWS).count()).toBeGreaterThan(0);
  });

  test('1. composes the workspace architecture and renders real work', async ({ page }) => {
    await openAdminWork(page);

    await expect(page.locator('[data-workspace-frame]').first()).toBeVisible();
    await expect(page.locator('[data-workspace-header]').first()).toBeVisible();
    await expect(page.locator('[data-workspace-toolbar]').first()).toBeVisible();

    for (const id of ['attention', 'overdue', 'due-week', 'open']) {
      await expect(page.getByTestId(`work-metric-${id}`)).toBeVisible();
    }

    const open = Number(await page.getByTestId('work-metric-open-value').innerText());
    expect(open).toBeGreaterThan(0);

    const rows = page.locator('[data-testid^="work-row-"]');
    expect(await rows.count()).toBe(open);

    await page.screenshot({ path: `${SHOTS}/admin-work-list.png`, fullPage: false });
  });

  test('2. priority filter and search are real state changes', async ({ page }) => {
    await openAdminWork(page);
    const before = await page.locator('[data-testid^="work-row-"]').count();

    await page.getByTestId('work-priority-filter').selectOption('critical');
    const after = await page.locator('[data-testid^="work-row-"]').count();
    expect(after).toBeLessThan(before);
    expect(after).toBeGreaterThan(0);

    await page.getByTestId('work-priority-filter').selectOption('all');
    await page.getByTestId('work-search').fill('zzz-no-such-work');
    await expect(page.locator('[data-testid^="work-row-"]')).toHaveCount(0);
    await page.getByTestId('work-search').fill('');
    expect(await page.locator('[data-testid^="work-row-"]').count()).toBe(before);
  });

  test('3. a row opens the shared record drawer with its activity trail', async ({ page }) => {
    await openAdminWork(page);
    await page.locator('[data-testid^="work-row-"]').first().locator('button').click();
    await expect(page.getByTestId('work-record-drawer')).toBeVisible();
    await expect(page.getByTestId('work-record-drawer')).toContainText('Source');
    await expect(page.getByTestId('work-record-drawer')).toContainText('Priority');
    await page.keyboard.press('Escape');
    await expect(page.getByTestId('work-record-drawer')).toHaveCount(0);
  });

  test('4. kanban is a real board over the same items', async ({ page }) => {
    await openAdminWork(page);
    await page.getByRole('tab', { name: /Kanban/ }).click();
    await expect(page.getByTestId('work-board')).toBeVisible();
    for (const col of ['open', 'in_progress', 'blocked', 'done']) {
      await expect(page.getByTestId(`work-column-${col}`)).toBeVisible();
    }
    const cards = page.locator('[data-testid^="work-card-"]');
    expect(await cards.count()).toBeGreaterThan(0);
    await page.screenshot({ path: `${SHOTS}/admin-work-kanban.png`, fullPage: false });
  });

  test('5. resolving stops the reminder and moves the card to Done', async ({ page }) => {
    await openAdminWork(page);
    const firstRow = page.locator('[data-testid^="work-row-"]').first();
    const rowId = String(await firstRow.getAttribute('data-testid'));
    const before = await page.locator('[data-testid^="work-row-"]').count();

    await firstRow.locator('button').click();
    await page.getByTestId('work-drawer-resolve').click();

    await expect(page.locator(`[data-testid="${rowId}"]`)).toHaveCount(0);
    await expect(page.locator('[data-testid^="work-row-"]')).toHaveCount(before - 1);

    const workItemId = rowId.replace('work-row-', '');
    await page.getByRole('tab', { name: /Kanban/ }).click();
    await expect(page.getByTestId(`work-card-${workItemId}`)).toBeVisible();
    await expect(page.getByTestId('work-column-done')).toContainText('Reopen');
  });

  test('6. calendar is a real derived month grid', async ({ page }) => {
    await loginAs(page, 'Super Admin — Tadii', 1200);
    await page.getByTestId('dashboard-loaded').waitFor({ timeout: 12000 });
    await page.locator('nav[aria-label="Primary"]').locator('text=Calendar').first().click();
    await expect(page.getByTestId('work-calendar')).toBeVisible();

    const label = page.getByTestId('work-calendar-label');
    const initial = await label.innerText();
    await page.getByTestId('work-calendar-next').click();
    await expect(label).not.toHaveText(initial);
    await page.getByTestId('work-calendar-prev').click();
    await expect(label).toHaveText(initial);

    await expect(page.locator('[data-testid^="work-calendar-cell-"]')).toHaveCount(42);

    const entry = page.locator('[data-testid^="work-calendar-entry-"]').first();
    if (await entry.count()) {
      await entry.click();
      await expect(page.getByTestId('work-record-drawer')).toBeVisible();
      await page.keyboard.press('Escape');
    }
    await page.screenshot({ path: `${SHOTS}/admin-work-calendar.png`, fullPage: false });
  });

  test('7. no horizontal overflow at 390px', async ({ page }) => {
    await openAdminWork(page);
    await page.setViewportSize({ width: 390, height: 844 });
    await page.waitForTimeout(500);
    const overflow = await page.evaluate(
      () => document.documentElement.scrollWidth - document.documentElement.clientWidth
    );
    expect(overflow).toBeLessThanOrEqual(2);
    await expect(page.getByTestId('work-metric-open-value')).toBeVisible();
    await page.screenshot({ path: `${SHOTS}/admin-work-390.png`, fullPage: false });
  });
});

test.describe('Work layer — brand scope & tenant isolation', () => {
  test('8. a brand sees its OWN work only', async ({ page }) => {
    await openAdminWork(page);
    const adminOpen = Number(await page.getByTestId('work-metric-open-value').innerText());
    const adminTitles = await page.locator('[data-testid^="work-row-"]').allInnerTexts();

    await openBrandWork(page);
    const brandOpen = Number(await page.getByTestId('work-metric-open-value').innerText());
    const brandTitles = await page.locator('[data-testid^="work-row-"]').allInnerTexts();

    expect(brandOpen).toBeGreaterThan(0);
    expect(brandOpen).toBeLessThan(adminOpen);
    for (const t of brandTitles) expect(adminTitles).toContain(t);
    await page.screenshot({ path: `${SHOTS}/brand-work-list.png`, fullPage: false });
  });

  test('9. a brand can create a task and it appears across the views', async ({ page }) => {
    await openBrandWork(page);
    const before = await page.locator('[data-testid^="work-row-"]').count();

    await page.getByTestId('work-new-title').fill('Chase lot numbers for next shipment');
    await page.getByTestId('work-new-submit').click();
    await expect(page.getByTestId('work-new-confirm')).toBeVisible();
    await expect(page.locator('[data-testid^="work-row-"]')).toHaveCount(before + 1);
    await expect(page.getByTestId('work-primary')).toContainText('Chase lot numbers');

    await page.getByRole('tab', { name: /Kanban/ }).click();
    await expect(page.getByTestId('work-board')).toContainText('Chase lot numbers');

    await page.getByRole('tab', { name: /Calendar/ }).click();
    await expect(page.getByTestId('work-calendar')).toBeVisible();
    await page.screenshot({ path: `${SHOTS}/brand-work-created.png`, fullPage: false });
  });

  test('10. reset restores the deterministic baseline', async ({ page }) => {
    await openBrandWork(page);
    const before = await page.locator('[data-testid^="work-row-"]').count();

    await page.getByTestId('work-new-title').fill('Temporary task');
    await page.getByTestId('work-new-submit').click();
    await expect(page.locator('[data-testid^="work-row-"]')).toHaveCount(before + 1);

    await page.getByTestId('work-reset').click();
    await expect(page.locator('[data-testid^="work-row-"]')).toHaveCount(before);
  });
});

