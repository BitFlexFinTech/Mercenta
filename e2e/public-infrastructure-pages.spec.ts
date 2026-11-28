/**
 * §PUBLIC SURFACES BATCH 5 PART 2 (2026-11-27) — THE ENRICHED PUBLIC PAGES, IN A BROWSER.
 *
 * WHY THIS FILE EXISTS. `scripts/validate-public-page-standard.mjs` proves the DATA is complete: a
 * picture is named and on disk, an illustration has stages, a limits section exists. None of that
 * proves the PAGE works. An illustration could render without its labels, a `limits` array could be
 * present in the model and never reach the screen, and a lazy-loaded picture below the fold could be
 * an empty box — because a missing picture is SILENT by design (`PublicImage` paints the reserved box
 * in the page's own colour). Every one of those passes a typecheck, a build and the corpus gate.
 *
 * WHAT IT ASSERTS, per page, from the owner (never a retyped list):
 *   1. the opening — the page's own heading, as level-1;
 *   2. the labelled worked illustration, with one labelled stage per stage in the owner;
 *   3. what it does not do, with one line per declared limit;
 *   4. exactly one next step (the closing call to action);
 *   5. every picture on the page DECODES (`naturalWidth > 0`) after scrolling, and every path is a
 *      LOCAL file — the public site makes no third-party image requests;
 *   6. no uncaught error, and no horizontal overflow at 390.
 *
 * Dev server is started by playwright.config.ts. The pages are DISCOVERED from the groups the batch
 * names, so renaming a group cannot quietly turn this spec into a test of nothing.
 *
 * §Phase §PUBLIC SURFACES BATCH 5 PART 4 (2026-11-28) — `'Solutions'` is APPENDED to the same list the
 * gate appends to, in the same change, so the two scopes cannot drift: the four Solutions pages are
 * asserted here exactly as the eleven before them are. Replacing the list would have stopped testing
 * the eleven.
 */
import { test, expect } from '@playwright/test';
import { PUBLIC_CONTENT_PAGES } from '../src/config/publicPages';

const SCOPE_GROUPS = ['Retail Infrastructure', 'Platform', 'Solutions'];
const PAGES = PUBLIC_CONTENT_PAGES.filter((p) => SCOPE_GROUPS.includes(p.navGroup));

test.describe('The enriched public pages — the full page standard, rendered', () => {
  test("the scope was discovered from the pages themselves (a vacuous discovery is a FAILURE)", () => {
    expect(SCOPE_GROUPS.length).toBeGreaterThan(0);
    expect(PAGES.length).toBeGreaterThanOrEqual(SCOPE_GROUPS.length);
  });

  for (const page of PAGES) {
    test(`${page.path} — opening, labelled illustration, limits and one next step`, async ({ page: view }) => {
      const errors: string[] = [];
      view.on('pageerror', (e) => errors.push(e.message));

      await view.setViewportSize({ width: 1440, height: 900 });
      await view.goto(page.path);

      await expect(view.getByRole('heading', { level: 1 })).toHaveText(page.heading);

      /* The illustration: one labelled stage per stage the owner declares. */
      expect(page.illustration, `${page.id} has no illustration to render`).toBeTruthy();
      const illustration = view.getByTestId('public-page-illustration');
      await expect(illustration).toBeVisible();
      await expect(illustration.locator('li')).toHaveCount(page.illustration!.stages.length);
      for (const stage of page.illustration!.stages) {
        await expect(illustration).toContainText(stage.label);
        await expect(illustration).toContainText(stage.detail);
      }

      /* What this does not do: one line per declared limit. */
      expect(page.limits, `${page.id} declares no limits`).toBeTruthy();
      const limits = view.getByTestId('public-page-limits');
      await expect(limits).toBeVisible();
      await expect(limits.locator('li')).toHaveCount(page.limits!.length);
      for (const line of page.limits!) await expect(limits).toContainText(line);

      /* Exactly one next step. */
      await expect(view.getByTestId('public-content-cta')).toHaveCount(1);

      /* No horizontal overflow at the narrow width the design is corrected for. */
      await view.setViewportSize({ width: 390, height: 844 });
      const overflow = await view.evaluate(
        () => document.documentElement.scrollWidth - window.innerWidth
      );
      expect(overflow, `horizontal overflow of ${overflow}px at 390`).toBeLessThanOrEqual(0);

      expect(errors).toEqual([]);
    });

    test(`${page.path} — every picture decodes at BOTH widths, and every path is local`, async ({ page: view }) => {
      /**
       * §PUBLIC SURFACES BATCH 5 PART 4 (2026-11-28) — BOTH WIDTHS, AND IT WAITS.
       *
       * `PublicImage` serves TWO files per role: the large one at ≥900px and the small one below it. This
       * test used to run only at the default viewport, so it exercised the LARGE file on every page and the
       * SMALL file on NONE — a broken small file would have shipped silently, which is precisely the failure
       * `PublicImage` documents as silent (the reserved box is painted in the page's own colour, so the page
       * looks finished with a hole in it). Measured on 2026-11-28: at 390 the lowest four pictures of
       * `/categories` reported `naturalWidth === 0` while this spec passed at the default width.
       *
       * It also WAITS for the images instead of trusting a fixed scroll cadence: lazy loading fetches on
       * intersection, and a scroll loop can outrun it — which is how a test passes or fails for the WRONG
       * reason. The wait is bounded, so a genuinely missing file still fails rather than hanging.
       */
      for (const width of [1440, 390]) {
        await view.setViewportSize({ width, height: 900 });
        await view.goto(page.path);

        await view.evaluate(async () => {
          for (let y = 0; y < document.body.scrollHeight; y += 250) {
            window.scrollTo(0, y);
            await new Promise((r) => setTimeout(r, 100));
          }
          window.scrollTo(0, 0);
          await Promise.race([
            Promise.all(
              [...document.querySelectorAll('main img')].map((node) => {
                const img = node as HTMLImageElement;
                return img.complete && img.naturalWidth > 0
                  ? Promise.resolve()
                  : new Promise((res) => {
                      img.addEventListener('load', res, { once: true });
                      img.addEventListener('error', res, { once: true });
                    });
              })
            ),
            new Promise((r) => setTimeout(r, 15000)),
          ]);
        });

        const pictures = await view.evaluate(() =>
          [...document.querySelectorAll('main img')].map((node) => {
            const img = node as HTMLImageElement;
            return {
              src: img.getAttribute('src') ?? '',
              current: img.currentSrc,
              width: img.naturalWidth,
            };
          })
        );

        /* The opening picture, plus the picture in the block that carries one. */
        expect(
          pictures.length,
          `${page.id} at ${width}px renders ${pictures.length} picture(s)`
        ).toBeGreaterThanOrEqual(2);
        expect(
          pictures.filter((p) => p.width === 0).map((p) => `${p.current || p.src} at ${width}px`),
          `${page.id}: a picture did not decode`
        ).toEqual([]);
        expect(pictures.filter((p) => !p.src.startsWith('/imagery/'))).toEqual([]);
      }
    });
  }
});
