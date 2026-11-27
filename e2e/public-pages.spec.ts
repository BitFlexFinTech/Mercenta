/**
 * §PUBLIC MESSAGING B3 (2026-09-29) — THE FOUR INNER PUBLIC PAGES, SMOKE-RENDERED.
 * EXTENDED IN B5 (the two legal documents) AND B6 (the assessment).
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
 * §B5 added /privacy and /terms. §B6 added the assessment's ENTRY view and
 * strengthened the shell assertion: it now measures the PAGE's own root — the
 * `[data-shell-theme]` element that ENCLOSES `<main>` — because `Home` appends the
 * cookie notice after the page body, so `.first()` on the attribute could belong
 * to the notice. Measured before that change: the assessment had NO enclosing
 * shell root at all and the assertion still passed.
 *
 * `scripts/verify-live-demo.mjs` L11 asserts the same properties against the
 * DEPLOYED site; this spec asserts them against the dev server, so a regression
 * is caught before deployment. It also closes the recorded registry defect that
 * the B3 row declared `built_and_tested` while no e2e spec referenced it.
 *
 * Dev server is started by playwright.config.ts (`npm run dev`, :5182).
 */
import { test, expect } from '@playwright/test';
import { PUBLIC_NAV, PUBLIC_LINK, PUBLIC_CLAIM_RED_LINES } from '../src/config/positioning';

/**
 * §BRAND REDESIGN (2026-11-19) — RESOLVED BY PAGE, NOT BY POSITION.
 *
 * This used to reach into `PUBLIC_NAV[0]` and `PUBLIC_NAV[1]` by INDEX. When the
 * approved information architecture took the header from two groups to seven,
 * `PUBLIC_NAV[1]` stopped being the group that holds the FAQ and the two legal
 * documents, so the lookup returned `undefined` and the whole spec failed at
 * collection time — before a single assertion ran. A positional index is a
 * second, silent copy of the navigation's shape; searching every group for the
 * page means the spec follows the owner instead of a remembered layout.
 */
const routeOf = (page: string): string => {
  for (const group of PUBLIC_NAV) {
    const link = group.children.find((l) => l.page === page);
    if (link) return link.page;
  }
  /**
   * §PUBLIC SURFACES BATCH 2 (2026-11-27) — A PAGE NEED NOT BE IN THE MENU TO BE A PAGE.
   *
   * This lookup used to search `PUBLIC_NAV` ONLY and throw otherwise, which made the menu the
   * gatekeeper for whether a page could be tested at all. When the owner removed the header's
   * "Legal" group, `routeOf('privacy')` and `routeOf('terms')` threw AT COLLECTION TIME — before a
   * single test ran — and took the other five pages' coverage with them. The two documents had not
   * stopped existing; they stopped being in the MENU.
   *
   * A page's reachability is its DECLARED route, not its menu slot, so the fallback asks the link
   * owner (`PUBLIC_LINK`, which is where the footer's own Legal column reads them). The throw is
   * kept for a page that exists in neither place: that is a real disagreement and must be loud.
   */
  const declared = Object.values(PUBLIC_LINK).find((l) => l.page === page);
  if (declared) return declared.page;
  throw new Error(
    `public page "${page}" is neither in PUBLIC_NAV nor declared in PUBLIC_LINK — the navigation owner and this spec disagree`
  );
};

/** Each page, its route (read from the navigation owner) and its H1. */
const PAGES = [
  { route: routeOf('how-it-works'), h1: /how mercenta works/i },
  { route: routeOf('uk-market-access'), h1: /uk market access/i },
  { route: routeOf('for-brands'), h1: /for brands/i },
  { route: routeOf('faq'), h1: /questions brands ask us/i },
  /**
   * §B5 (2026-09-29) — THE TWO LEGAL DOCUMENTS ARE PUBLIC PAGES TOO, and until
   * B5 they were the only public surfaces that hardcoded the dark palette,
   * carried no navigation or footer, and said nothing about what is stored on a
   * visitor's device while the positioning owner described them as the place
   * holding the full picture. They are rendered, theme-checked and
   * red-line-checked here exactly like the four marketing pages.
   */
  { route: routeOf('privacy'), h1: /privacy policy/i },
  { route: routeOf('terms'), h1: /terms of service/i },
  /**
   * §B6 (2026-09-29) — THE ASSESSMENT IS A PUBLIC PAGE TOO, and it was the LAST
   * one still hardcoding the dark palette: measured, `main` had no enclosing
   * `[data-shell-theme]` at all, so the light shell never reached it. Its ENTRY
   * view is rendered, theme-checked and red-line-checked here; the RESULT view
   * (which is composed by the engine and published six red-line claims of its
   * own) is driven and scanned in `e2e/uk-market-fit.spec.ts`.
   */
  { route: routeOf('explore-uk-market-fit'), h1: /explore uk market fit/i },
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
/* §BRAND REDESIGN (2026-11-19) — REPOINTED, NOT WEAKENED. The two retired ids
   (`bold`, `minimal-light`) no longer exist in the app, so setting them in
   localStorage would fall back to the default and the "expected shell" assertion
   would be measuring the default rather than the theme it names. The approved
   appearances are `brand-dark` / `brand-light`, and both are still exercised. */
const THEMES = [
  { id: 'brand-dark', expected: 'dark' },
  { id: 'brand-light', expected: 'light' },
] as const;

test.describe('The seven public pages — render, shell theme and no red-line claim (B3 · B5 · B6)', () => {
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
        /**
         * §B6 (2026-09-29) — THE SHELL TAKEN BY THE PAGE, NOT BY THE COOKIE NOTICE.
         *
         * B5 strengthened this from "some `[data-shell-theme]` element is visible"
         * to "the attribute carries the expected value", but it still took
         * `.first()` — and `Home` appends the cookie notice AFTER the page body,
         * so a page that hardcoded the dark palette while the notice carried the
         * right attribute would still have passed. Measured on the pre-audit page
         * before B6: `main` had NO `[data-shell-theme]` ancestor at all and the
         * first matching element was the notice.
         *
         * The assertion is now anchored to the page: the shell root that ENCLOSES
         * `<main>`, exactly as `scripts/verify-live-demo.mjs` measures it live.
         */
        const pageShell = await page.evaluate(() => {
          let n: HTMLElement | null = document.querySelector('main');
          while (n && !n.hasAttribute('data-shell-theme')) n = n.parentElement;
          return n ? n.getAttribute('data-shell-theme') : null;
        });
        expect(
          pageShell,
          `the page itself (the shell root enclosing <main>) must take the ${theme.expected} shell`
        ).toBe(theme.expected);
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

/**
 * §PHASE 15 — THE CUSTOM 404 (website-integrity launch gate).
 *
 * The site is an SPA whose host serves `index.html` for EVERY path, so before this
 * gate an unknown address silently rendered the HOMEPAGE. This asserts the SSOT's
 * `unknown` verdict now has a matching VIEW: a real "not found" page with a heading
 * and the two real exits, and no uncaught error.
 */
test.describe('§Phase 15 — an unknown address renders the custom 404, not the homepage', () => {
  test('/this-page-does-not-exist shows the 404 view with real exits', async ({ page }) => {
    const errors: string[] = [];
    page.on('pageerror', (e) => errors.push(e.message));

    await page.goto('/this-page-does-not-exist');

    await expect(page.getByRole('heading', { level: 1 })).toHaveText(/couldn.t find that page/i);
    await expect(page.getByRole('button', { name: /back to homepage/i })).toBeVisible();
    await expect(page.getByRole('button', { name: /partner login/i })).toBeVisible();

    expect(errors).toEqual([]);
  });
});

