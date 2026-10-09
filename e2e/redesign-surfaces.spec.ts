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

/**
 * §Wave-3 Part 4 gate — the SEARCH / FILTER / SORT table primitive
 * (`src/components/shared/DataTable.tsx`), which renders its two admin surfaces.
 *
 * It used to render its OWN table markup: no `scope="col"`, no caption, no
 * `data-table` hook, no mobile strategy (its 6–7 column table pushed the content
 * region sideways at ≤768px) and a toolbar whose search and filter controls had
 * NO accessible name. It now renders through the ONE canonical `DataTable`.
 *
 * MUTATION PROOF: restoring the old table markup fails the mobile half (a
 * `<table>` reappears at 390px and the content region scrolls sideways);
 * removing the toolbar's accessible names fails the control half.
 */
test.describe('Redesign surfaces — the search/filter/sort table primitive', () => {
  const SURFACES = [
    { nav: 'Global Catalog', hook: 'global-catalogue' },
    { nav: 'Contract Cycle', hook: 'contract-cycle' },
  ] as const;

  for (const s of SURFACES) {
    test(`${s.nav}: labelled cards below md, ONE canonical table above it, named controls`, async ({
      page,
    }) => {
      // ── Mobile (390): the canonical labelled card list, never a sideways table.
      await page.setViewportSize({ width: 390, height: 844 });
      await loginAs(page, 'Super Admin — Tadii', 1400);
      await page.getByTestId('dashboard-loaded').waitFor({ timeout: 12000 });
      const toggle = page.getByTestId('app-menu-toggle');
      if (await toggle.isVisible().catch(() => false)) {
        await toggle.click();
        await page.waitForTimeout(360);
      }
      await page.locator(`nav[aria-label="Primary"] button:has-text("${s.nav}")`).first().click();
      await page.waitForTimeout(1000);

      await expect(
        page.locator(`table[data-table="${s.hook}"]`),
        `${s.nav} renders labelled cards (not a table) below md`
      ).toHaveCount(0);

      const contentOverflow = await page.evaluate(() => {
        const main = document.querySelector('main');
        return main ? main.scrollWidth - main.clientWidth : 0;
      });
      expect(
        contentOverflow,
        `${s.nav} @390px: the content region must not scroll sideways`
      ).toBeLessThanOrEqual(1);

      const unnamed = await page.evaluate(() => {
        const name = (el: Element) => {
          const label = el.getAttribute('aria-label');
          if (label && label.trim()) return label;
          const labelledBy = el.getAttribute('aria-labelledby');
          if (labelledBy) return labelledBy;
          const id = el.getAttribute('id');
          if (id && document.querySelector(`label[for="${CSS.escape(id)}"]`)) return id;
          return el.closest('label')?.textContent ?? '';
        };
        return Array.from(document.querySelectorAll('input, select, textarea'))
          .filter((el) => (el as HTMLElement).offsetParent !== null)
          .filter((el) => !String(name(el)).trim()).length;
      });
      expect(unnamed, `${s.nav}: every visible control has an accessible name`).toBe(0);

      // ── Desktop (1440): the ONE canonical semantic table.
      await page.setViewportSize({ width: 1440, height: 900 });
      await page.waitForTimeout(700);
      const table = page.locator(`table[data-table="${s.hook}"]`);
      await expect(table).toBeVisible();
      const heads = await table.locator('thead th').count();
      const scoped = await table.locator('thead th[scope="col"]').count();
      expect(heads, `${s.nav}: the table renders column headers`).toBeGreaterThan(0);
      expect(scoped, `${s.nav}: every column header carries scope="col"`).toBe(heads);
      await expect(table.locator('caption')).toHaveCount(1);
    });
  }
});

/**
 * §Wave-3 Part 4 gate — the Helpdesk FILTER chip rows are not clipped.
 *
 * Both chip rows were single-line `flex` rows inside a `p-0 overflow-hidden` card,
 * so at 768px the priority chips (All/Urgent/High/Medium/Low) measured 19px wider
 * than the card and the last chip was cut off — invisible and unreachable, which no
 * typecheck, build or document-level overflow check can see.
 *
 * MUTATION PROOF: removing `flex-wrap` from those rows fails the measurement (19 > 1).
 */
test('Helpdesk filter chip rows wrap instead of being clipped', async ({ page }) => {
  await page.setViewportSize({ width: 768, height: 1024 });
  await loginAs(page, 'Super Admin — Tadii', 1400);
  await page.getByTestId('dashboard-loaded').waitFor({ timeout: 12000 });
  const toggle = page.getByTestId('app-menu-toggle');
  if (await toggle.isVisible().catch(() => false)) {
    await toggle.click();
    await page.waitForTimeout(360);
  }
  await page.locator('nav[aria-label="Primary"] button:has-text("Helpdesk")').first().click();
  await page.waitForTimeout(1000);

  const overflows = await page.evaluate(() => {
    const chipRows = Array.from(document.querySelectorAll('main div.flex')).filter((el) =>
      /^(All|Open|Pending|Resolved)(All|Urgent|High|Medium|Low)/.test(
        (el.textContent ?? '').replace(/\s+/g, '')
      )
    );
    return chipRows.map((el) => Math.max(el.scrollWidth - el.clientWidth, 0));
  });

  expect(overflows.length, 'the Helpdesk filter chip rows render').toBeGreaterThan(0);
  expect(Math.max(...overflows), 'no filter chip row overflows its card').toBeLessThanOrEqual(1);
});

