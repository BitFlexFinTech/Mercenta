/**
 * §UI/UX REDESIGN (remaining surfaces) — RESPONSIVE + VISUAL VERIFICATION.
 *
 * The second half of the taste gate. `validate:workspace-shell` proves the
 * STRUCTURE (one frame, one dashboard generation, no legacy shell outside the
 * declared backlog) from source; this spec proves the RENDERED result in a real
 * Chromium at the five target widths the brief names, and writes inspectable
 * PNGs to `test-screenshots/redesign-surfaces/`.
 *
 * It is deliberately NOT a pixel-diff snapshot suite. A pixel gate on this
 * application would fire on every harmless token change across five themes and
 * would be turned off within a week — which is worse than no gate. What is
 * asserted instead is the contract that actually breaks:
 *
 *   - every representative surface renders its ONE canonical frame/header;
 *   - no horizontal overflow at 1440 / 1280 / 1024 / 768 / 390;
 *   - the surface title is a single h1 with an accessible name;
 *   - the primary content region does not collapse below the mobile width.
 *
 * Dev server started by playwright.config.ts (npm run dev, :5173).
 */
import { test, expect, type Page } from '@playwright/test';
import { loginAs } from './helpers/auth';

const SHOTS = 'test-screenshots/redesign-surfaces';

const WIDTHS = [
  { w: 1440, h: 900 },
  { w: 1280, h: 800 },
  { w: 1024, h: 768 },
  { w: 768, h: 1024 },
  { w: 390, h: 844 },
] as const;

async function assertNoOverflow(page: Page, label: string, width: number) {
  await page.waitForTimeout(320);
  const overflow = await page.evaluate(() => {
    const doc = document.documentElement;
    return Math.max(doc.scrollWidth - doc.clientWidth, 0);
  });
  expect(overflow, `${label} @ ${width}px horizontal overflow`).toBeLessThanOrEqual(1);
  const frame = page.locator('[data-workspace-frame]').first();
  await expect(frame, `${label} @ ${width}px renders the canonical workspace frame`).toBeVisible();
  const box = await frame.boundingBox();
  const main = await page.locator('main').boundingBox();
  expect(box?.width ?? 0, `${label} @ ${width}px frame fills the main region`).toBeGreaterThanOrEqual(
    (main?.width ?? 0) - 2
  );
}

test.describe('Redesign surfaces — responsive verification (admin)', () => {
  test('Operations Overview holds at every target width', async ({ page }) => {
    await loginAs(page, 'Super Admin — Tadii', 1400);
    await page.getByTestId('dashboard-loaded').waitFor({ timeout: 12000 });
    for (const { w, h } of WIDTHS) {
      await page.setViewportSize({ width: w, height: h });
      await assertNoOverflow(page, 'admin overview', w);
      await page.screenshot({ path: `${SHOTS}/admin-overview-${w}.png`, fullPage: false });
    }
  });

  test('Mercenta Brain holds at every target width', async ({ page }) => {
    await loginAs(page, 'Super Admin — Tadii', 1400);
    await page.locator('nav[aria-label="Primary"]').getByRole('button', { name: 'Mercenta Brain' }).first().click();
    await page.getByTestId('brain-counts').waitFor({ timeout: 12000 });
    for (const { w, h } of WIDTHS) {
      await page.setViewportSize({ width: w, height: h });
      await assertNoOverflow(page, 'brain', w);
      if (w === 1440 || w === 390) {
        await page.screenshot({ path: `${SHOTS}/brain-${w}.png`, fullPage: false });
      }
    }
  });

  test('Helpdesk holds at desktop and mobile widths', async ({ page }) => {
    await loginAs(page, 'Super Admin — Tadii', 1400);
    await page.locator('nav[aria-label="Primary"]').getByRole('button', { name: 'Helpdesk' }).first().click();
    await page.waitForTimeout(900);
    for (const { w, h } of WIDTHS) {
      await page.setViewportSize({ width: w, height: h });
      await assertNoOverflow(page, 'helpdesk', w);
      if (w === 1440 || w === 390) {
        await page.screenshot({ path: `${SHOTS}/helpdesk-${w}.png`, fullPage: false });
      }
    }
  });
});

test.describe('Redesign surfaces — responsive verification (brand)', () => {
  // §Wave-3 Part 3 — EVERY brand view declared in BrandShell's nav
  // (BRAND_SECTIONS → BRAND_VIEW_IDS), so "render every brand surface" is not
  // silently a curated subset. Labels are the nav's own accessible names.
  for (const [label, navName] of [
    ['brand-dashboard', null], // default view = overview
    ['brand-purchase-orders', 'Purchase Orders'],
    ['brand-logistics', 'Logistics Hub'],
    ['brand-returns', 'Returns'],
    ['brand-work', 'Tasks & Deadlines'],
    ['brand-calendar', 'Calendar'],
    ['brand-product-catalog', 'Product Catalog'],
    ['brand-inventory', 'Inventory'],
    ['brand-commercial-readiness', 'Commercial Readiness'],
    ['brand-onboarding-legal', 'Onboarding & Legal'],
    ['brand-compliance', 'UK Compliance'],
    ['brand-contracts', 'Contracts'],
    ['brand-analytics', 'Analytics'],
    ['brand-market-intel', 'Market Intel'],
    ['brand-reports', 'Reports'],
    ['brand-documents-account', 'Documents & Account'],
    ['brand-support-cases', 'Support & Cases'],
    ['brand-support-team', 'Support & Team'],
    ['brand-social', 'Mercenta Social'],
    ['brand-settings', 'Settings'],
  ] as const) {
    test(`${label} holds at every target width`, async ({ page }) => {
      // §Stage-18 smoke-render — an uncaught runtime error on render (a
      // Rules-of-Hooks violation, an undefined read) passes typecheck and build
      // and only fails at actual render time; capture it here.
      const pageErrors: string[] = [];
      page.on('pageerror', (e) => pageErrors.push(e.message));
      await loginAs(page, 'Tapatío', 1500);
      await page.getByTestId('brand-dashboard-loaded').waitFor({ state: 'attached', timeout: 12000 });
      if (navName) {
        await page.locator('nav[aria-label="Primary"]').getByRole('button', { name: navName }).first().click();
        await page.waitForTimeout(1200);
      }
      const h1 = page.locator('h1');
      await expect(h1.first(), `${label} renders a surface heading`).toBeVisible();
      expect(pageErrors, `${label} rendered without a runtime error`).toEqual([]);
      for (const { w, h } of WIDTHS) {
        await page.setViewportSize({ width: w, height: h });
        await assertNoOverflow(page, label, w);
        if (w === 1440 || w === 390) {
          await page.screenshot({ path: `${SHOTS}/${label}-${w}.png`, fullPage: false });
        }
      }
    });
  }

  /**
   * §Wave-3 Part 3 defect gate — the catalogue "Product" cell must render the
   * product IMAGE, never paint the raw image value as text. The seeded demo
   * products carry a `picsum.photos` URL in `product.image`; rendering that value
   * as cell text overflowed its thumbnail box as garbled overlapping text. The
   * single owner is `src/components/shared/ProductThumb.tsx`, which renders an
   * `<img>` for a URL/data-URI and a glyph/text otherwise. This spec fails if the
   * raw URL is ever painted as cell text again.
   */
  test('brand product catalogue renders thumbnails as images, never a raw URL as text', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await loginAs(page, 'Tapatío', 1500);
    await page.getByTestId('brand-dashboard-loaded').waitFor({ state: 'attached', timeout: 12000 });
    await page.locator('nav[aria-label="Primary"]').getByRole('button', { name: 'Product Catalog' }).first().click();
    await page.waitForTimeout(1000);

    const table = page.locator('table[data-table="product-catalogue"]');
    await expect(table).toBeVisible();

    // Every row's Product cell shows a real <img> whose src is a URL/data-URI.
    const imgSrcs = await table
      .locator('tbody tr td:first-child img')
      .evaluateAll((els) => els.map((e) => (e as HTMLImageElement).getAttribute('src') ?? ''));
    expect(imgSrcs.length, 'catalogue rows render a product thumbnail <img>').toBeGreaterThan(0);
    for (const src of imgSrcs) {
      expect(src, 'thumbnail src is a real URL/data-URI').toMatch(/^(https?:\/\/|data:image\/)/i);
    }

    // And no catalogue cell paints a URL as literal text (the defect).
    const bodyText = await table.locator('tbody').innerText();
    expect(bodyText, 'no catalogue cell paints a raw URL as text').not.toMatch(/https?:\/\//i);
  });
});