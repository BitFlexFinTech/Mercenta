/**
 * §32 / M13 Phase 11 — SUPER ADMIN COMMAND CENTRE (browser verification).
 *
 * Proves the founder's command centre is real in the UI:
 *   1. the admin overview opens with the NOW / TODAY / THIS WEEK bands and only
 *      real, derived actions (each with a CTA);
 *   2. a CTA that targets a Super Admin TAB actually lands on that tab — the
 *      "no hunting through five screens" requirement, verified end to end;
 *   3. the category/region-aware sections (opportunities, fundraising,
 *      operations, finance, AI cost) are present.
 */
import { test, expect } from '@playwright/test';
import { loginAs } from './helpers/auth';

async function openOverview(page: import('@playwright/test').Page) {
  // The founder's own session: the overview is the landing view, and only the
  // Super Admin tier may be routed into Super Admin tabs.
  await loginAs(page, 'Super Admin — Tadii', 1600);
}

test.describe('Super Admin command centre', () => {
  test('1. the overview renders the bands and real derived actions', async ({ page }) => {
    const pageErrors: string[] = [];
    page.on('pageerror', (e) => pageErrors.push(String(e)));
    await openOverview(page);

    const centre = page.getByTestId('command-centre');
    await expect(centre).toBeVisible({ timeout: 10000 });
    await expect(centre).toContainText('Command centre');
    await expect(page.getByTestId('command-band-now')).toContainText('NOW');
    await expect(page.getByTestId('command-band-today')).toContainText('TODAY');
    await expect(page.getByTestId('command-band-week')).toContainText('THIS WEEK');

    // Every action row exposes exactly one CTA button.
    const actions = page.getByTestId('command-action');
    expect(await actions.count()).toBeGreaterThan(0);
    await expect(actions.first().getByRole('button')).toBeVisible();
    expect(pageErrors).toEqual([]);
  });

  test('2. a CTA routes to the exact Super Admin tab (no hunting)', async ({ page }) => {
    await openOverview(page);
    const centre = page.getByTestId('command-centre');
    await expect(centre).toBeVisible({ timeout: 10000 });

    // The unread-register compliance action always exists in a fresh session and
    // targets Super Admin → Company.
    const row = page.getByTestId('command-action').filter({ hasText: 'Companies House register' }).first();
    await expect(row).toBeVisible();
    await row.getByRole('button').first().click();
    await page.waitForTimeout(900);

    // It must land on the Company tab, not the default Staff tab.
    await expect(page.getByTestId('company-control-centre')).toBeVisible({ timeout: 8000 });
    await expect(page.getByTestId('company-control-centre')).toContainText('Mercenta Partners Ltd');
  });

  test('3. the category/region-aware sections render', async ({ page }) => {
    await openOverview(page);
    await expect(page.getByTestId('command-centre')).toBeVisible({ timeout: 10000 });
    for (const section of ['opportunities', 'fundraising', 'operations', 'finance', 'ai_cost']) {
      await expect(page.getByTestId(`command-section-${section}`)).toBeVisible();
    }
    await expect(page.getByTestId('command-section-fundraising')).toContainText('no relationship is claimed');
    await expect(page.getByTestId('command-section-ai_cost')).toContainText('ceiling');
  });

  /**
   * §27/§28 (M13c Phase D) — the RANKED queue: every row must show its rank and
   * an explicit WHY breakdown, the ranking basis must state that no AI is used,
   * and the relationship/funding slots must be real items whose CTA actually
   * lands on the screen that performs the action (no dead CTAs).
   */
  test('4. every ranked row shows its rank and WHY, and the funding slot routes', async ({ page }) => {
    const pageErrors: string[] = [];
    page.on('pageerror', (e) => pageErrors.push(String(e)));
    await openOverview(page);

    const centre = page.getByTestId('command-centre');
    await expect(centre).toBeVisible({ timeout: 10000 });

    const basis = page.getByTestId('command-queue-basis');
    await expect(basis).toBeVisible();
    await expect(basis).toContainText('No AI');

    const actions = page.getByTestId('command-action');
    const count = await actions.count();
    expect(count).toBeGreaterThan(0);
    for (let i = 0; i < count; i += 1) {
      const row = actions.nth(i);
      const why = row.locator('[data-testid="command-why"]');
      await expect(why).toBeVisible();
      await expect(why).toContainText('Why:');
      await expect(why).toContainText('=');
      await expect(row).toContainText(/#\d+/);
    }

    // The accelerator/funding slot is a real derived route with a working CTA.
    const accelerator = page
      .getByTestId('command-action')
      .filter({ hasText: 'Solo Founders Program' })
      .first();
    await expect(accelerator).toBeVisible();
    await expect(accelerator).toContainText('Funding relevance');
    await accelerator.getByRole('button').first().click();
    await page.waitForTimeout(900);
    await expect(page.getByTestId('funding-pipeline')).toBeVisible({ timeout: 8000 });
    expect(pageErrors).toEqual([]);
  });
});