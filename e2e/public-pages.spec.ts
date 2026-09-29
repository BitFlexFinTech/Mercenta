/**
 * §PUBLIC MESSAGING B3 (2026-09-29) — THE FOUR INNER PUBLIC PAGES, SMOKE-RENDERED.
 *
 * WHY THIS FILE EXISTS. B3 rewrote HowItWorks, UKMarketAccess, ForBrands and FAQ
 * so they stop publishing the platform's internal specification, and made them
 * take the shell theme. Neither property is visible to a typecheck or a build:
 *
 *   · a page that renders but THROWS still compiles, so every page is held to
 *     "rendered with no uncaught error";
 *   · a page that hardcodes the dark palette compiles perfectly and simply
 *     ignores the light shell, so the shell actually taken is asserted;
 *   · the red-line claim list must not be retyped here (that would be a second
 *     source of truth for the same rule) — it is READ from
 *     `src/config/positioning.ts` §11, the owner.
 *
 * `scripts/verify-live-demo.mjs` L11 asserts the same properties against the
 * DEPLOYED site; this spec asserts them against the dev server, so a regression
 * is caught before deployment. It also closes the recorded registry defect that
 * the B3 row declared `built_and_tested` while no e2e spec referenced it.
 *
 * Dev server is started by playwright.config.ts (`npm run dev`, :5173).
 */
import { test, expect } from '@playwright/test';
import { PUBLIC_NAV, PUBLIC_CLAIM_RED_LINES } from '../src/config/positioning';

/** Each page, its route (read from the navigation owner) and its H1. */
const PAGES = [
  { route: PUBLIC_NAV[0].children.find((l) => l.page === 'how-it-works')!.page, h1: /how mercenta works/i },
  { route: PUBLIC_NAV[0].children.find((l) => l.page === 'uk-market-access')!.page, h1: /uk market access/i },
  { route: PUBLIC_NAV[0].children.find((l) => l.page === 'for-brands')!.page, h1: /for brands/i },
  { route: PUBLIC_NAV[1].children.find((l) => l.page === 'faq')!.page, h1: /questions brands ask us/i },
];

const RED_LINES = PUBLIC_CLAIM_RED_LINES.flatMap((family) =>
  family.patterns.map((source) => ({ family: family.id, re: new RegExp(source, 'i') }))
);

test.describe('The four inner public pages — render, theme and no red-line claim (B3)', () => {
  for (const meta of PAGES) {
    test(`/${meta.route} renders, takes the shell and publishes no internal detail`, async ({ page }) => {
      const errors: string[] = [];
      page.on('pageerror', (e) => errors.push(e.message));

      /** Rendered at the narrow width the design was corrected for. */
      await page.setViewportSize({ width: 390, height: 844 });
      await page.goto(`/${meta.route}`);

      await expect(page.locator('h1')).toHaveText(meta.h1);
      await expect(page.locator('[data-shell-theme]').first()).toBeVisible();
      await expect(page.locator('footer')).toBeVisible();

      /** No horizontal overflow at 390. */
      const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
      expect(overflow).toBeLessThanOrEqual(0);

      /** The notice the whole workstream exists for: no internal detail in public copy. */
      const body = await page.locator('body').innerText();
      const hits = RED_LINES.filter((r) => r.re.test(body)).map((r) => `${r.family}:${r.re.source}`);
      expect(hits, `red-line claims found on /${meta.route}: ${hits.join(', ')}`).toEqual([]);

      expect(errors).toEqual([]);
    });
  }
});
