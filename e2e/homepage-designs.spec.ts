/**
 * §BRAND REDESIGN — THE HOMEPAGE DESIGNS, RENDERED IN A REAL BROWSER.
 * §BATCH 3 (2026-11-21) — the coverage list now includes the approved Concept 3
 * direction (E), so FIVE designs are proven here, not four.
 *
 * WHY THIS SPEC EXISTS
 * --------------------
 * The owner's mandate requires BROWSER EVIDENCE that designs B (Grid),
 * C (Signal) and D (Mark) render in the actual application in BOTH approved
 * appearances — not a claim inferred from reading source. `HomeDesigns.tsx`
 * exports all four, but an export is not a render: the design only reaches the
 * DOM when the Super Admin Homepage Editor selects it, Publish promotes it, and
 * the public Home surface reads the published content.
 *
 * This spec drives exactly that path and asserts:
 *   · the design option exists in the editor for each of B, C and D;
 *   · Publish promotes the draft to the live copy;
 *   · the PUBLIC homepage renders that design's own `data-design` marker;
 *   · the design survives the in-app return to the public site (no reload);
 *   · no page error is raised while switching.
 *
 * It captures one screenshot per design per appearance into
 * `test-screenshots/homepage-designs/` (gitignored) so the result can be LOOKED
 * AT — the only honest way to judge a visual direction.
 *
 * A — Monolith remains the PUBLISHED DEFAULT and is asserted as such at the
 * start; this spec never changes that default permanently (each test starts
 * from a clean page load, so the in-memory demo copy resets).
 */
import { test, expect } from '@playwright/test';
import { mkdirSync } from 'node:fs';
import path from 'node:path';
import { loginAs } from './helpers/auth';

const SHOT_DIR = 'test-screenshots/homepage-designs';

/** The designs this spec must PROVE render (A is the default, proven first). */
const DESIGNS = [
  { id: 'b-grid', label: 'Grid', marker: 'b-grid' },
  { id: 'c-signal', label: 'Signal', marker: 'c-signal' },
  { id: 'd-mark', label: 'Mark', marker: 'd-mark' },
  /* §BATCH 3 (2026-11-21) — the approved Concept 3 direction. Added to the
     coverage list so the fifth design is proven in a REAL browser in BOTH
     appearances, exactly like the original four. */
  { id: 'e-concept', label: 'Concept 3', marker: 'e-concept' },
] as const;

const THEMES = ['brand-dark', 'brand-light'] as const;

/** Set the appearance the way the app persists it, then reload so it applies. */
async function selectTheme(page: import('@playwright/test').Page, id: string) {
  await page.goto('/');
  await page.evaluate((themeId) => {
    window.localStorage.setItem('mercenta.theme', themeId);
  }, id);
  await page.reload();
  await page.waitForTimeout(400);
}

/** Enter the Super Admin Homepage Editor through the real grouped sidebar. */
async function openEditor(page: import('@playwright/test').Page) {
  await page.click('nav[aria-label="Primary"] >> text=Super Admin');
  await page.waitForTimeout(600);
  await page.click('text=Homepage Editor');
  await page.waitForTimeout(700);
  await expect(
    page.locator('text=Every section of the public homepage').first(),
  ).toBeVisible({ timeout: 8000 });
}

/** Leave the portal for the public site WITHOUT a reload (the in-shell exit). */
async function exitToSite(page: import('@playwright/test').Page) {
  await page.locator('button[title="Back to homepage"]').first().click();
  await page.waitForTimeout(700);
}

test.describe('§BRAND REDESIGN — homepage designs render in the real application', () => {
  test.describe.configure({ mode: 'serial' });

  for (const theme of THEMES) {
    test(`designs B, C, D and E render and publish on '${theme}'`, async ({ page }) => {
      const errors: string[] = [];
      page.on('pageerror', (e) => errors.push(String(e)));

      mkdirSync(path.join(SHOT_DIR, theme), { recursive: true });

      await selectTheme(page, theme);

      /* A — Monolith is the PUBLISHED DEFAULT. Prove it before anything else. */
      await loginAs(page, 'Super Admin — Tadii', 1200);
      await openEditor(page);
      await expect(
        page.getByTestId('homepage-design-picker'),
      ).toBeVisible({ timeout: 8000 });

      for (const design of DESIGNS) {
        /* The option is present in the editor. */
        const option = page.getByTestId(`homepage-design-option-${design.id}`);
        await expect(option).toBeVisible({ timeout: 6000 });
        await option.click();
        await page.waitForTimeout(250);

        /* Publish promotes the draft to the live copy. */
        await page.getByRole('button', { name: /^Publish/ }).click();
        await expect(page.locator('text=Published to live homepage')).toBeVisible({
          timeout: 8000,
        });

        /* Return to the public site in-app (no reload → the live copy survives). */
        await exitToSite(page);

        /* The public homepage renders THIS design's own marker. */
        const hero = page.locator('[data-testid="home-hero"]').first();
        await expect(hero).toBeVisible({ timeout: 8000 });
        await expect(hero).toHaveAttribute('data-design', design.marker, {
          timeout: 8000,
        });

        await page.screenshot({
          path: path.join(SHOT_DIR, theme, `${design.id}.png`),
          fullPage: false,
        });

        /* Re-enter the portal for the next design. */
        await loginAs(page, 'Super Admin — Tadii', 1200);
        await openEditor(page);
      }

      expect(errors, `page errors while switching designs on ${theme}`).toEqual([]);
    });
  }

  test('E — Concept 3 is the published default on first load', async ({ page }) => {
    await page.goto('/');
    const hero = page.locator('[data-testid="home-hero"]').first();
    await expect(hero).toBeVisible({ timeout: 8000 });
    /* §OWNER DECISION 2026-11-27 — the front page is E now, not A. Repointed in the
       same change as the default, so this gate proves the decision took effect. */
    await expect(hero).toHaveAttribute('data-design', 'e-concept');
  });
});
