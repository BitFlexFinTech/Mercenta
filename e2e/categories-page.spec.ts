/**
 * §PUBLIC SURFACES BATCH 5 (2026-11-27) — THE CATEGORIES PAGE, IN A REAL BROWSER.
 *
 * WHY THIS FILE EXISTS. The static gate (`validate-category-guides.mjs`) proves the data is complete
 * and the files exist. Neither of those proves the PAGE works: a card could render without its text, a
 * picture could point at a path the dev server does not serve, and a lazy-loaded image below the fold
 * could be an empty box while every check stayed green. A missing picture is silent by design (the
 * reserved box is painted in the page's own colour), so the only way to catch it is to look.
 *
 * WHAT IT ASSERTS
 *   1. one card per APPROVED category — the count read from the owner, never retyped;
 *   2. each card carries its own explanation and its own caption;
 *   3. every picture DECODES (`naturalWidth > 0`), after scrolling the page so lazy loading fires.
 */
import { test, expect } from '@playwright/test';
import { APPROVED_CATEGORIES } from '../src/types';
import { CATEGORY_GUIDES } from '../src/config/categoryGuides';

const testIdFor = (category: string) =>
  `category-guide-${category.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`;

test.describe('Categories page — every category explained, with a picture that loads', () => {
  test('one card per approved category, each carrying its own explanation', async ({ page }) => {
    const errors: string[] = [];
    page.on('pageerror', (e) => errors.push(e.message));

    await page.goto('/categories');
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible();

    const cards = page.locator('[data-testid^="category-guide-"]');
    await expect(cards).toHaveCount(APPROVED_CATEGORIES.length);

    for (const guide of CATEGORY_GUIDES) {
      const card = page.getByTestId(testIdFor(guide.category));
      await expect(card).toBeVisible();
      await expect(card).toContainText(guide.belongs);
      await expect(card).toContainText(guide.strong);
      await expect(card).toContainText(guide.caption);
    }

    expect(errors).toEqual([]);
  });

  test('every category picture decodes — a reserved box is not a picture', async ({ page }) => {
    await page.goto('/categories');

    /**
     * Scroll the whole page so lazy loading actually fetches the pictures below the fold. Without
     * this the assertion would read `naturalWidth === 0` for images that were simply never requested,
     * and the test would fail (or pass) for the wrong reason.
     */
    await page.evaluate(async () => {
      for (let y = 0; y < document.body.scrollHeight; y += 400) {
        window.scrollTo(0, y);
        await new Promise((r) => setTimeout(r, 60));
      }
      window.scrollTo(0, 0);
    });
    await page.waitForLoadState('networkidle');

    const pictures = await page.evaluate(() =>
      [...document.querySelectorAll('[data-testid^="category-guide-"] img')].map((img) => ({
        src: img.getAttribute('src') ?? '',
        width: (img as HTMLImageElement).naturalWidth,
      }))
    );

    expect(pictures).toHaveLength(APPROVED_CATEGORIES.length);
    expect(pictures.filter((p) => p.width === 0)).toEqual([]);
    /* Every path must be a LOCAL file — the public site makes no third-party image requests. */
    expect(pictures.filter((p) => !p.src.startsWith('/imagery/'))).toEqual([]);
  });
});