/**
 * §PHASE C (2026-10-13) — THEMES VERIFIED BY RENDERING, NOT BY READING CODE.
 *
 * WHY THIS SPEC EXISTS
 * --------------------
 * `scripts/validate-theme-distinctness.mjs` proves the DECLARED palettes are
 * distinct and readable — but a declaration is not a screen. A theme can be
 * perfectly distinct in `themes.ts` and still never reach the DOM: `ThemeContext`
 * applies it in a `useLayoutEffect`, the light-shell remap layer keys off
 * `data-shell-theme`, and any of those links can break silently while every unit
 * check still passes.
 *
 * So this spec drives a real browser, switches the theme the way the app persists
 * it (`localStorage['mercenta.theme']`), and then asserts the RENDERED document:
 *   · `data-mercenta-theme` equals the theme that was selected;
 *   · the COMPUTED `--mr-accent` on `:root` equals that theme's declared accent;
 *   · it still holds after navigating between screens, not only at boot;
 *   · no page error is raised while switching.
 *
 * It also captures a screenshot per screen per theme into `test-screenshots/`
 * (gitignored), so the result can be LOOKED AT — the only way to judge a visual
 * change.
 */
import { test, expect } from '@playwright/test';
import { mkdirSync } from 'node:fs';
import path from 'node:path';
import { loginAs } from './helpers/auth';

const SHOT_DIR = 'test-screenshots/themes';

/**
 * The five themes and the accent each MUST render (src/config/themes.ts).
 *
 * §OPENSHIP BATCH 3 (2026-10-14) — REPOINTED, NOT WEAKENED. Four accents moved
 * because the four non-Bold themes now carry OpenShip's designs (spec §13) and
 * OpenShip's own accent hues: the light design's violet→blue pair, its `dim`
 * design's lime, and the dark design's orange. `bold` is deliberately unchanged
 * (#7C3AED) — the Owner's instruction is that it is preserved exactly — so it is
 * still pinned here as the control. This spec must be updated in the SAME change
 * as any theme value: it is the only gate that proves a theme reaches the DOM.
 */
const THEMES = [
  { id: 'minimal-light', accent: '#7E22CE' },
  { id: 'professional', accent: '#2563EB' },
  { id: 'bold', accent: '#7C3AED' },
  { id: 'fun', accent: '#A9F04D' },
  { id: 'serious', accent: '#F97316' },
] as const;

const ADMIN_SCREENS = [
  { label: 'Overview', file: 'admin-overview' },
  { label: 'Purchase Orders', file: 'admin-purchase-orders' },
  { label: 'Audit Log', file: 'admin-audit-log' },
  { label: 'Integration Settings', file: 'admin-integrations' },
] as const;

const BRAND_SCREENS = [
  { label: 'Purchase Orders', file: 'brand-purchase-orders' },
  { label: 'UK Compliance', file: 'brand-compliance' },
] as const;

const norm = (hex: string) => hex.trim().toLowerCase();

/** Select a theme the way the app persists it, then reload so it is applied. */
async function selectTheme(page: import('@playwright/test').Page, id: string) {
  await page.goto('/');
  await page.evaluate((themeId) => {
    window.localStorage.setItem('mercenta.theme', themeId);
  }, id);
  await page.reload();
  await page.waitForTimeout(500);
}

/**
 * Assert the theme really reached the rendered document.
 * The accent is read from the COMPUTED style, so a variable that was set but
 * consumed by no rule still fails here.
 */
async function expectThemeApplied(
  page: import('@playwright/test').Page,
  theme: (typeof THEMES)[number]
) {
  const applied = await page.evaluate(() => {
    const root = document.documentElement;
    const cs = getComputedStyle(root);
    return {
      attr: root.dataset.mercentaTheme ?? null,
      accent: cs.getPropertyValue('--mr-accent').trim(),
      bg: cs.getPropertyValue('--mr-bg').trim(),
    };
  });
  expect(applied.attr, `data-mercenta-theme for ${theme.id}`).toBe(theme.id);
  expect(norm(applied.accent), `computed --mr-accent for ${theme.id}`).toBe(norm(theme.accent));
  expect(applied.bg.length, `computed --mr-bg for ${theme.id}`).toBeGreaterThan(0);
}

test.describe('§PHASE C — every theme renders, on real screens', () => {
  test.describe.configure({ mode: 'serial' });

  for (const theme of THEMES) {
    test(`theme '${theme.id}' applies and paints the admin screens`, async ({ page }) => {
      const errors: string[] = [];
      page.on('pageerror', (e) => errors.push(String(e)));

      mkdirSync(path.join(SHOT_DIR, theme.id), { recursive: true });
      await selectTheme(page, theme.id);

      await loginAs(page, 'Super Admin — Tadii', 1400);
      await expectThemeApplied(page, theme);

      for (const screen of ADMIN_SCREENS) {
        const nav = page
          .locator('nav[aria-label="Primary"] button', { hasText: screen.label })
          .first();
        await nav.click({ timeout: 8000 });
        await page.waitForTimeout(650);
        /* The theme must still hold after navigation, not only at boot. */
        await expectThemeApplied(page, theme);
        await page.screenshot({
          path: path.join(SHOT_DIR, theme.id, `${screen.file}.png`),
          fullPage: false,
        });
      }

      expect(errors, `page errors in '${theme.id}'`).toEqual([]);
    });

    test(`theme '${theme.id}' applies and paints the brand screens`, async ({ page }) => {
      const errors: string[] = [];
      page.on('pageerror', (e) => errors.push(String(e)));

      mkdirSync(path.join(SHOT_DIR, theme.id), { recursive: true });
      await selectTheme(page, theme.id);

      await loginAs(page, 'Astonish', 1400);
      await expectThemeApplied(page, theme);

      for (const screen of BRAND_SCREENS) {
        const nav = page
          .locator('nav[aria-label="Primary"] button', { hasText: screen.label })
          .first();
        await nav.click({ timeout: 8000 });
        await page.waitForTimeout(650);
        await expectThemeApplied(page, theme);
        await page.screenshot({
          path: path.join(SHOT_DIR, theme.id, `${screen.file}.png`),
          fullPage: false,
        });
      }

      expect(errors, `page errors in '${theme.id}'`).toEqual([]);
    });
  }

  /**
   * §OPENSHIP BATCH 3 — THE PRIMARY-ACTION GRADIENT, VERIFIED IN THE DOM.
   *
   * Declaring a token is not rendering it. This asserts the COMPUTED
   * `background-image` of an element carrying the utility the `primary` Button
   * variant now uses, under each theme: the four non-bold themes must compute a
   * real gradient (the radial highlight layer plus the three-stop gradient), and
   * `bold` must compute `none` — which is what makes "bold is preserved" a fact
   * about the browser rather than a claim about the config.
   */
  test('the primary-action gradient reaches the DOM (and is ABSENT in bold)', async ({ page }) => {
    for (const theme of THEMES) {
      await selectTheme(page, theme.id);
      const computed = await page.evaluate(() => {
        const el = document.createElement('button');
        el.className = 'ds-btn-accent';
        el.textContent = 'probe';
        document.body.appendChild(el);
        const value = getComputedStyle(el).backgroundImage;
        el.remove();
        return value;
      });
      if (theme.id === 'bold') {
        expect(computed, 'bold must paint NO image, so its button keeps its flat accent').toBe('none');
      } else {
        expect(computed, `${theme.id} must paint a real gradient`).toContain('linear-gradient');
        expect(computed, `${theme.id} must also paint the radial highlight layer`).toContain(
          'radial-gradient'
        );
      }
    }
  });

  test('the five themes render five DIFFERENT accents (a switch that changes nothing is not a theme)', async ({
    page,
  }) => {
    const seen: Record<string, string> = {};
    for (const theme of THEMES) {
      await selectTheme(page, theme.id);
      seen[theme.id] = await page.evaluate(() =>
        getComputedStyle(document.documentElement).getPropertyValue('--mr-accent').trim().toLowerCase()
      );
    }
    const values = Object.values(seen);
    expect(new Set(values).size, `accents rendered: ${JSON.stringify(seen)}`).toBe(THEMES.length);
  });
});
