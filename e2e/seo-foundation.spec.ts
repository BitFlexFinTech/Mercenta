/**
 * §SEO FOUNDATION — browser verification of the route-metadata layer.
 *
 * Proves in a real Chromium that the ADDRESS, the document metadata and the
 * rendered view agree — the class of defect a typecheck/build cannot see:
 *
 *   1. a direct URL (/faq) renders the FAQ page with its OWN title, description,
 *      canonical and `index, follow` (before this, every route advertised the
 *      homepage title and canonicalised to `/`);
 *   2. an in-app navigation pushes the URL and re-applies the metadata;
 *   3. an UNKNOWN path is `noindex, nofollow` with NO canonical element;
 *   4. a PRIVATE path (/admin) is `noindex, nofollow` with NO canonical;
 *   5. an AUTHENTICATED session is private even at `/`;
 *   6. the public pages still render (no functional regression from the change).
 *
 * Dev server started by playwright.config.ts (npm run dev, :5182).
 */
import { test, expect } from '@playwright/test';
import { loginAs } from './helpers/auth';

async function metaContent(page: import('@playwright/test').Page, name: string) {
  return page.locator(`meta[name="${name}"]`).first().getAttribute('content');
}

test.describe('§SEO FOUNDATION — route metadata', () => {
  test('1. a direct URL gets its OWN title, canonical and index directive', async ({ page }) => {
    await page.goto('/faq');
    await expect(page.getByRole('heading', { level: 1 }).first()).toBeVisible({ timeout: 12000 });

    await expect(page).toHaveTitle('FAQ — Mercenta Partners');
    await expect(page.locator('link[rel="canonical"]')).toHaveAttribute(
      'href',
      'https://mercenta.co.uk/faq'
    );
    expect(await metaContent(page, 'robots')).toBe('index, follow');
    expect(await metaContent(page, 'description')).toContain('brands ask');

    // The homepage canonical must NOT be applied to this route.
    await expect(page.locator('link[rel="canonical"]')).not.toHaveAttribute('href', 'https://mercenta.co.uk/');
  });

  test('2. in-app navigation pushes the URL and re-applies the metadata', async ({ page }) => {
    await page.goto('/');
    await page.getByTestId('explore-uk-market-fit-cta').first().click();
    await expect(page.getByTestId('uk-market-fit-surface')).toBeVisible({ timeout: 12000 });

    expect(new URL(page.url()).pathname).toBe('/explore-uk-market-fit');
    await expect(page).toHaveTitle('Explore UK Market Fit — Mercenta Partners');
    await expect(page.locator('link[rel="canonical"]')).toHaveAttribute(
      'href',
      'https://mercenta.co.uk/explore-uk-market-fit'
    );
  });

  test('3. an UNKNOWN path is noindex with NO canonical', async ({ page }) => {
    await page.goto('/definitely-not-a-declared-page');
    await page.waitForTimeout(800);

    expect(await metaContent(page, 'robots')).toBe('noindex, nofollow');
    await expect(page.locator('link[rel="canonical"]')).toHaveCount(0);
  });

  test('4. a PRIVATE path is noindex with NO canonical', async ({ page }) => {
    await page.goto('/admin');
    await page.waitForTimeout(800);

    expect(await metaContent(page, 'robots')).toBe('noindex, nofollow');
    await expect(page.locator('link[rel="canonical"]')).toHaveCount(0);
  });

  test('5. an AUTHENTICATED session is private even at the root URL', async ({ page }) => {
    await loginAs(page, 'Super Admin — Tadii', 1400);
    await page.getByTestId('dashboard-loaded').waitFor({ timeout: 12000 });

    expect(await metaContent(page, 'robots')).toBe('noindex, nofollow');
    await expect(page.locator('link[rel="canonical"]')).toHaveCount(0);
  });

  test('6. every declared public route still renders (no functional regression)', async ({ page }) => {
    for (const path of ['/', '/how-it-works', '/uk-market-access', '/for-brands', '/faq', '/privacy', '/terms']) {
      await page.goto(path);
      await expect(page.getByRole('heading', { level: 1 }).first()).toBeVisible({ timeout: 12000 });
      expect(new URL(page.url()).pathname).toBe(path);
      expect(await metaContent(page, 'robots')).toBe('index, follow');
    }
  });
});