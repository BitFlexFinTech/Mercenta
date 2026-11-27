/**
 * §PUBLIC MESSAGING B4 (2026-09-29) — THE PUBLIC CHROME.
 *
 * WHY THIS FILE EXISTS. B4 changed the footer, added the cookie notice and moved
 * every public label into one owner, and each of those can be broken while a
 * typecheck and a build stay green:
 *
 *   · the footer's ten categories are READ from `APPROVED_CATEGORIES`, so a
 *     detached canonical list renders the wrong number with no error anywhere;
 *   · the cookie notice's whole point is that answering it STICKS and that it can
 *     be re-opened — a notice that returns on every visit is decorative, and only
 *     a real browser can tell the difference;
 *   · the header and the footer must not name the same destination two ways.
 *
 * Everything asserted here is READ FROM ITS OWNER (`src/config/positioning.ts`,
 * `src/types.ts`) rather than retyped, so this spec cannot pass while the owner
 * changes. `scripts/verify-live-demo.mjs` L12 asserts the same properties against
 * the DEPLOYED site; this spec asserts them against the dev server, so a
 * regression is caught before deployment.
 *
 * Dev server is started by playwright.config.ts (`npm run dev`, :5182).
 */
import { test, expect } from '@playwright/test';
import { APPROVED_CATEGORIES } from '../src/types';
import {
  PUBLIC_NAV,
  PUBLIC_LINK,
  PUBLIC_FOOTER_COLUMNS,
  PUBLIC_COOKIE_NOTICE,
  PUBLIC_COOKIE_NOTICE_REGION,
  PUBLIC_COOKIE_SETTINGS_LABEL,
} from '../src/config/positioning';

const NOTICE_SELECTOR = `[role="region"][aria-label="${PUBLIC_COOKIE_NOTICE_REGION}"]`;
const CATEGORY_HEADING = (
  PUBLIC_FOOTER_COLUMNS.find((c) => c.kind === 'categories') as { heading: string }
).heading;

test.describe('Public chrome — footer, cookie notice and nav labels (B4)', () => {
  test('the homepage renders with no uncaught error and shows the footer', async ({ page }) => {
    const errors: string[] = [];
    page.on('pageerror', (e) => errors.push(e.message));
    await page.goto('/');
    await expect(page.locator('footer')).toBeVisible();
    expect(errors).toEqual([]);
  });

  test('the footer carries the five-column shape: every owner heading and every canonical category', async ({ page }) => {
    await page.goto('/');
    const footer = page.locator('footer');

    /** The brand column, then the four owner columns. */
    await expect(footer.locator('img').first()).toBeVisible();
    for (const col of PUBLIC_FOOTER_COLUMNS) {
      await expect(footer.locator('h4', { hasText: col.heading })).toBeVisible();
    }

    /** Each category must be present, and the column must hold EXACTLY the owner's list. */
    for (const category of APPROVED_CATEGORIES) {
      await expect(footer.getByText(category, { exact: true }).first()).toBeVisible();
    }
    const renderedCategories = await page.evaluate((heading) => {
      const h4 = [...document.querySelectorAll('footer h4')].find((x) => x.textContent?.trim() === heading);
      return h4?.parentElement ? h4.parentElement.querySelectorAll('span').length : -1;
    }, CATEGORY_HEADING);
    expect(renderedCategories).toBe(APPROVED_CATEGORIES.length);
  });

  test('the header publishes the owner\'s labels and the footer agrees with them', async ({ page }) => {
    await page.goto('/');
    /**
     * §BRAND REDESIGN (2026-11-19) — SCOPED TO THE HEADER NAV.
     *
     * A bare `locator('nav')` matches BOTH the header's `<nav aria-label="Main">`
     * and the footer's `<nav aria-label="Footer">`. Once the redesign added a
     * "Categories" group to the header, the footer's "All Categories" link also
     * matched the name "Categories" and Playwright's strict mode refused the
     * ambiguous locator. The header is the surface this test is about, so it is
     * named explicitly instead of being found by a selector that also matches the
     * footer.
     */
    const nav = page.getByRole('navigation', { name: 'Main' });
    for (const group of PUBLIC_NAV) {
      await expect(nav.getByRole('button', { name: group.label })).toBeVisible();
    }
    /** Every footer link uses the SAME label the owner gives the same route. */
    const footer = page.locator('footer');
    for (const col of PUBLIC_FOOTER_COLUMNS) {
      if (col.kind !== 'links') continue;
      for (const link of col.links) {
        await expect(footer.getByRole('button', { name: link.label })).toBeVisible();
      }
    }

    /**
     * §PUBLIC SURFACES BATCH 2 (2026-11-27) — WHAT WAS REMOVED FROM THE MENU MUST STILL BE REACHABLE.
     *
     * Two groups were deleted (Legal and Categories). A removal that also removed the PAGES would be
     * a regression, not a tidy-up, and neither a typecheck nor the corpus can see it — the pages
     * would simply have no way in. Both are therefore asserted here, from their own owners:
     * the two legal documents through the footer's Legal column (which reads `PUBLIC_LINK`, not a
     * group), and the categories page through whichever MENU GROUP publishes it — derived, so this
     * assertion follows the owner instead of naming a group that may be renamed.
     */
    for (const legal of [PUBLIC_LINK.privacy, PUBLIC_LINK.terms]) {
      await expect(footer.getByRole('button', { name: legal.label })).toBeVisible();
    }
    const categoriesHost = PUBLIC_NAV.find((g) =>
      g.children.some((c) => c.page === PUBLIC_LINK.categorySpecialization.page)
    );
    expect(
      categoriesHost,
      'the categories page must remain reachable from a menu group (it was published by the deleted "Categories" group)'
    ).toBeTruthy();
    await expect(nav.getByRole('button', { name: categoriesHost!.label })).toBeVisible();
  });

  test('the cookie notice is shown to a first-time visitor and states what is actually stored', async ({ page }) => {
    await page.goto('/');
    const notice = page.locator(NOTICE_SELECTOR);
    await expect(notice).toBeVisible();
    await expect(notice).toContainText(PUBLIC_COOKIE_NOTICE.heading);
    await expect(notice).toContainText(PUBLIC_COOKIE_NOTICE.body);
    await expect(notice.getByRole('button', { name: PUBLIC_COOKIE_NOTICE.acknowledgeLabel })).toBeVisible();
    await expect(notice.getByRole('button', { name: PUBLIC_COOKIE_NOTICE.policyLabel })).toBeVisible();
  });

  test('answering the notice STICKS across a reload, and the footer can re-open it', async ({ page }) => {
    await page.goto('/');
    await expect(page.locator(NOTICE_SELECTOR)).toBeVisible();

    await page.getByRole('button', { name: PUBLIC_COOKIE_NOTICE.acknowledgeLabel }).first().click();
    await expect(page.locator(NOTICE_SELECTOR)).toHaveCount(0);

    /**
     * STICKY, AND ASSERTED WITHOUT A RACE.
     *
     * A "must NOT appear" assertion is the one shape that can pass for the wrong
     * reason: the notice starts hidden and is revealed by a mount effect, so
     * `toHaveCount(0)` immediately after the reload passed BEFORE the component
     * had any chance to appear. MEASURED with a mutant that stopped recording the
     * answer: the notice DID return on reload, and this test still passed. The
     * settle below is what makes the assertion mean what it says — wait for the
     * page to be mounted, then observe the window in which a decorative notice
     * would (wrongly) appear.
     */
    await page.reload({ waitUntil: 'networkidle' });
    await expect(page.locator('footer')).toBeVisible();
    await page.waitForTimeout(600);
    await expect(page.locator(NOTICE_SELECTOR)).toHaveCount(0);

    /** Re-openable: a choice you cannot revisit is not a choice. */
    await page.getByRole('button', { name: PUBLIC_COOKIE_SETTINGS_LABEL }).first().click();
    await expect(page.locator(NOTICE_SELECTOR)).toBeVisible();
  });

  test('the notice appears on an inner public page too, not only the homepage', async ({ page }) => {
    /**
     * §BRAND REDESIGN (2026-11-19) — resolved BY PAGE, not by index. The header
     * went from two groups to seven, so `PUBLIC_NAV[1]` no longer means "the
     * group the inner pages live in"; the lookup below asks the navigation owner
     * for the inner page by name, so this test cannot silently start measuring a
     * different destination than the one it names.
     */
    const inner = PUBLIC_NAV.flatMap((g) => g.children).find((l) => l.page === 'how-it-works');
    expect(inner).toBeTruthy();
    await page.goto(`/${inner!.page}`);
    await expect(page.locator('footer')).toBeVisible();
    await expect(page.locator(NOTICE_SELECTOR)).toBeVisible();
  });
});
