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
  /**
   * §B5 (2026-09-29) — THE TWO LEGAL DOCUMENTS ARE PUBLIC PAGES TOO, and until
   * B5 they were the only public surfaces that hardcoded the dark palette,
   * carried no navigation or footer, and said nothing about what is stored on a
   * visitor's device while the positioning owner described them as the place
   * holding the full picture. They are rendered, theme-checked and
   * red-line-checked here exactly like the four marketing pages.
   */
  { route: PUBLIC_NAV[1].children.find((l) => l.page === 'privacy')!.page, h1: /privacy policy/i },
  { route: PUBLIC_NAV[1].children.find((l) => l.page === 'terms')!.page, h1: /terms of service/i },
];

const RED_LINES = PUBLIC_CLAIM_RED_LINES.flatMap((family) =>
  family.patterns.map((source) => ({ family: family.id, re: new RegExp(source, 'i') }))
);

/**
 * §B5 (2026-09-29) — BOTH SHELLS, AND THE SHELL THAT WAS ACTUALLY TAKEN.
 *
 * The B3 version of this spec asserted only that a `[data-shell-theme]` element
 * was VISIBLE, while its name claimed the page "takes the shell". Those are not
 * the same statement: a page that hardcoded the dark palette rendered a visible
 * `[data-shell-theme]` and passed. The defect the assertions exist for — the
 * four inner pages ignoring the light shell (B3), and the two legal documents
 * doing the same (B5) — was therefore only caught by `npm run verify:live`, and
 * only after deployment.
 *
 * Each page is now rendered under BOTH themes and the value of the attribute is
 * asserted, exactly as `scripts/verify-live-demo.mjs` L11 does against the
 * deployed site — so the dev-side spec fails for the same reason the live check
 * does, before anything is deployed.
 */
const THEMES = [
  { id: 'bold', expected: 'dark' },
  { id: 'minimal-light', expected: 'light' },
] as const;

test.describe('The six inner public pages — render, shell theme and no red-line claim (B3 · B5)', () => {
  for (const theme of THEMES) {
    for (const meta of PAGES) {
      test(`/${meta.route} [${theme.id}] renders, takes the ${theme.expected} shell and publishes no internal detail`, async ({ page }) => {
        const errors: string[] = [];
        page.on('pageerror', (e) => errors.push(e.message));

        /** The shell the visitor chose, set before the page boots. */
        await page.addInitScript((t) => {
          try {
            window.localStorage.setItem('mercenta.theme', t);
          } catch {
            /* private mode — the default theme applies and the assertion will say so. */
          }
        }, theme.id);

        /** Rendered at the narrow width the design was corrected for. */
        await page.setViewportSize({ width: 390, height: 844 });
        await page.goto(`/${meta.route}`);

        await expect(page.locator('h1')).toHaveText(meta.h1);
        /** SEEN, and the shell it is actually in — not merely present. */
        await expect(page.locator('[data-shell-theme]').first()).toBeVisible();
        await expect(page.locator('[data-shell-theme]').first()).toHaveAttribute('data-shell-theme', theme.expected);
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
  }
});
