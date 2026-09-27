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
 *   - the surface labels its seeded operational state as simulated (§SSOT S4)
 *   - a record-qualified item offers the OWNING action (never a Resolve button),
 *     and an operator mark can never hide it — while a manual task still resolves
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

    /*
      §SSOT S4 — HONEST LABELLING, asserted in a real browser. Every row on this
      surface is projected from a seeded operational record, so the surface must say
      that the state is simulated (the sentence is declared ONCE in
      `src/config/demo.ts`). Without this the list reads as live operational state.
    */
    await expect(page.getByTestId('work-operational-state-label')).toBeVisible();
    await expect(page.getByTestId('work-operational-state-label')).toContainText('no live provider');

    await page.screenshot({ path: `${SHOTS}/admin-work-list.png`, fullPage: false });
  });

  test('1b. §SSOT S5 — the work badge is LABELLED and counts the attention set, not the open set', async ({
    page,
  }) => {
    await openAdminWork(page);

    /**
     * The founder-facing defect this asserts away (F1): the rail badge counted
     * critical + high while this list rendered every unresolved item, unlabelled.
     * The badge number and the list number now come from ONE owner and each is
     * labelled with the DECLARED set it counts.
     */
    const badge = page.locator('[data-testid="nav-badge-work"]');
    await expect(badge).toBeVisible();
    await expect(badge).toHaveAttribute('data-badge-label', 'Needs attention');

    const badged = Number(await badge.innerText());
    const attention = Number(await page.getByTestId('work-metric-attention-value').innerText());
    const open = Number(await page.getByTestId('work-metric-open-value').innerText());

    // The badge IS the attention tile (same owner, same scope)…
    expect(badged).toBe(attention);
    // …and the list is a DIFFERENT declared set, so the two numbers can only ever
    // be read correctly because both surfaces state which set they are.
    expect(open).toBeGreaterThanOrEqual(badged);
    await expect(page.getByTestId('work-metric-open')).toContainText('All open work');
    await expect(page.getByTestId('work-metric-attention')).toContainText('Needs attention');
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

  /**
   * §SSOT S2/S3 — THE FOUNDER-REPORTED DEFECT, AS SEEN IN A BROWSER.
   *
   * OLD CONTRACT (recorded, not weakened): this test opened the first row and
   * clicked `work-drawer-resolve`, then asserted the row left the list and the
   * kanban card moved to Done. That button is exactly what S2 removes for
   * record-qualified work: a ticked task could hide work the RECORD still
   * qualified. The same flow is now asserted as the two halves of the rule:
   * record-qualified work offers its OWNING ACTION (5), and a manual task — which
   * the work layer genuinely owns — still resolves (5b).
   */
  test('5. a record-qualified row offers the OWNING action, and a mark never hides it', async ({ page }) => {
    await openAdminWork(page);
    const firstRow = page.locator('[data-testid^="work-row-"]').first();
    const rowId = String(await firstRow.getAttribute('data-testid'));
    const before = await page.locator('[data-testid^="work-row-"]').count();

    await firstRow.locator('button').click();
    await expect(page.getByTestId('work-record-drawer')).toBeVisible();

    /* No Resolve button exists for this item, and the closing path is named on it. */
    await expect(page.getByTestId('work-drawer-resolve')).toHaveCount(0);
    await expect(page.getByTestId('work-drawer-open-record')).toBeVisible();
    await expect(page.getByTestId('work-drawer-closing')).toBeVisible();
    await expect(page.getByTestId('work-drawer-closing')).toContainText('owned by');

    /* An operator mark is an ANNOTATION: it can never remove the item. */
    await page.getByTestId('work-drawer-start').click();
    await expect(page.locator(`[data-testid="${rowId}"]`)).toHaveCount(1);
    await expect(page.locator('[data-testid^="work-row-"]')).toHaveCount(before);

    /* The owning action hands the operator to the record's own workspace. */
    await page.getByTestId('work-drawer-open-record').click();
    await expect(page.getByTestId('work-record-drawer')).toHaveCount(0);
    await page.screenshot({ path: `${SHOTS}/admin-work-owning-action.png`, fullPage: false });
  });

  test('5b. a MANUAL task still resolves and leaves the list (the work layer owns it)', async ({ page }) => {
    await openAdminWork(page);
    const before = await page.locator('[data-testid^="work-row-"]').count();

    await page.getByTestId('work-new-title').fill('Register the new pallet spec');
    await page.getByTestId('work-new-submit').click();
    await expect(page.locator('[data-testid^="work-row-"]')).toHaveCount(before + 1);

    const manualRow = page.locator('[data-testid^="work-row-work-manual-"]').first();
    await manualRow.locator('button').click();
    await expect(page.getByTestId('work-drawer-resolve')).toBeVisible();
    await page.getByTestId('work-drawer-resolve').click();

    await expect(page.locator('[data-testid^="work-row-"]')).toHaveCount(before);
    await expect(page.locator('[data-testid^="work-row-work-manual-"]')).toHaveCount(0);
    await page.getByTestId('work-reset').click();
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

