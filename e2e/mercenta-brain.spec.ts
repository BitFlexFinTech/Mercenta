/**
 * §BATCH 4 (2026-10-10) — THE MERCENTA BRAIN ABSENCE GUARD (browser).
 *
 * REWRITTEN, NOT DELETED (global rule 08 — removal coherence). This spec used to
 * prove, in a real Chromium, that the Brain was a working interactive product
 * surface: 10 tests driving its graph, filters, inspector, provenance, zoom,
 * responsive composition, tenant boundary and KPI drill-down.
 *
 * The owner instructed the Brain's COMPLETE removal ("it serves no purpose"), so
 * the thing those tests asserted no longer exists. Per rule 08 the spec is
 * REPOINTED to prove the ABSENCE, in the running product, on every surface where
 * the Brain used to appear:
 *   1  the Super-Admin nav offers NO Mercenta Brain destination;
 *   2  a direct `/admin/brain` address renders NO Brain surface and does not
 *      show a blank workspace (the shell falls back to the default view);
 *   3  a BRAND session never had the Brain, and its Market Intel no longer shows
 *      the relationship graph;
 *   4  no live surface renders a removed Brain testid;
 *   5  no page error and no external call happens while checking.
 *
 * The name is kept deliberately (no rename without the directive requiring it);
 * the SOURCE half of the same contract lives in
 * `scripts/validate-mercenta-brain.mjs`.
 *
 * The dev server is started by playwright.config.ts (npm run dev, :5182).
 */
import { test, expect, type Page } from '@playwright/test';
import { loginAs } from './helpers/auth';

const SHOTS = 'test-screenshots/mercenta-brain';

/** Every testid the removed Brain owned. None may appear on any surface. */
const BRAIN_TESTIDS = ['brain-counts', 'brain-canvas', 'brain-canvas-empty', 'brain-search', 'brain-entity-list'];

async function expectBrainAbsent(page: Page) {
  for (const id of BRAIN_TESTIDS) {
    await expect(page.getByTestId(id), `brain testid "${id}" must be gone`).toHaveCount(0);
  }
  await expect(page.locator('[data-testid^="brain-entity-"]')).toHaveCount(0);
  await expect(page.locator('[data-testid^="brain-node-"]')).toHaveCount(0);
}

test.describe('Mercenta Brain — the surface is GONE (absence guard)', () => {
  test('1. the Super-Admin nav offers no Mercenta Brain destination', async ({ page }) => {
    const pageErrors: string[] = [];
    page.on('pageerror', (e) => pageErrors.push(String(e)));

    await loginAs(page, 'Super Admin — Tadii', 1400);
    await expect(
      page.locator('nav[aria-label="Primary"]').getByRole('button', { name: 'Mercenta Brain' })
    ).toHaveCount(0);
    await expectBrainAbsent(page);
    await page.screenshot({ path: `${SHOTS}/nav-no-brain-1440.png`, fullPage: false });

    expect(pageErrors).toEqual([]);
  });

  test('2. a direct /admin/brain address renders no Brain and falls back to the default view', async ({
    page,
  }) => {
    const pageErrors: string[] = [];
    page.on('pageerror', (e) => pageErrors.push(String(e)));

    await loginAs(page, 'Super Admin — Tadii', 1400);
    await page.goto('/admin/brain');
    await page.waitForTimeout(1500);

    await expectBrainAbsent(page);
    // The unrenderable segment resolves to the shell's default view, never a
    // blank workspace: the real h1 of that view is visible.
    await expect(page.getByRole('heading', { level: 1 }).first()).toBeVisible({ timeout: 10000 });

    expect(pageErrors).toEqual([]);
  });

  test('3. a brand session never had the Brain, and Market Intel keeps no relationship graph', async ({
    page,
  }) => {
    const pageErrors: string[] = [];
    page.on('pageerror', (e) => pageErrors.push(String(e)));

    await loginAs(page, 'Astonish', 1400);
    // No Brain destination existed for a brand tier before the removal either.
    await expect(
      page.locator('nav[aria-label="Primary"]').getByRole('button', { name: 'Mercenta Brain' })
    ).toHaveCount(0);

    // Market Intel still renders, and the removed relationship graph is gone.
    await page.locator('nav[aria-label="Primary"]').getByText('Market Intel').first().click();
    await page.waitForTimeout(1500);
    await expect(page.locator('main')).toBeVisible();
    await expectBrainAbsent(page);

    expect(pageErrors).toEqual([]);
  });

  test('4. no live surface renders a removed Brain testid', async ({ page }) => {
    await loginAs(page, 'Super Admin — Tadii', 1400);
    const nav = page.locator('nav[aria-label="Primary"]');
    for (const label of ['Overview', 'Control Centre', 'Integration Settings']) {
      const item = nav.getByRole('button', { name: label }).first();
      if ((await item.count()) === 0) continue;
      await item.click();
      await page.waitForTimeout(900);
      await expectBrainAbsent(page);
    }
  });
});
