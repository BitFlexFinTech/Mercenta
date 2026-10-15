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
 * §OPENSHIP MAPPING (2026-10-15) — REPOINTED AGAIN: minimal-light and serious implement
 * OpenShip Light (violet #7C3AED), professional implements DIM (lime #B7ED5A), fun implements
 * DARK (orange #F97316), and bold stays preserved exactly. Three distinct accents are rendered
 * ON PURPOSE, and each theme takes the scrim and tint of the design it implements.
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
  {
    id: 'minimal-light',
    accent: '#7C3AED',
    /* §OPENSHIP BATCH 4 — the theme's own SCRIM (spec §2.5) and its hover tint
       (the reference's foreground tint, spec §7.6): asserted from the COMPUTED
       style, so a token that never reaches the DOM fails here. */
    scrim: [0, 0, 0],
    tint: [0, 0, 0],
    cardBorder: 'none' as const,
  },
  { id: 'professional', accent: '#B7ED5A', scrim: [0, 0, 0], tint: [255, 255, 255], cardBorder: 'none' as const },
  {
    id: 'bold',
    accent: '#7C3AED',
    scrim: [0, 0, 0],
    tint: [255, 255, 255],
    /* The Owner's instruction: `bold` is preserved exactly — so its card keeps the
       border it draws today (its token reproduces the old rgba(255,255,255,0.06)). */
    cardBorder: 'hairline' as const,
  },
  { id: 'fun', accent: '#F97316', scrim: [20, 20, 20], tint: [255, 255, 255], cardBorder: 'none' as const },
  {
    id: 'serious',
    accent: '#7C3AED',
    /* The scrim now DARKENS (this theme implements the LIGHT design): on a pure-black page the reference LIGHTENS the veil
       (`rgb(20 20 20 / 60%)`, spec §2.3) — the trap this assertion pins. */
    scrim: [0, 0, 0],
    tint: [0, 0, 0],
    cardBorder: 'none' as const,
  },
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
  /* §OPENSHIP MAPPING BATCH 3 — REPRODUCIBILITY. Two identical runs of this spec
     were MEASURED to differ by up to 2.921% of their pixels on 6 of the 30 screens,
     because the app scrolls a target into view (the onboarding tour) and smooth
     scrolling lands at a different offset depending on elapsed time — so the
     comparison could not tell a real change from run-to-run noise. Under
     `prefers-reduced-motion: reduce` the browser scrolls instantly, so the captured
     frame no longer depends on how long the page has been settling. */
  await page.emulateMedia({ reducedMotion: 'reduce' });
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

  /**
   * §OPENSHIP MAPPING BATCH 3 (2026-10-15) — THE SOLID PRIMARY ACTION, MEASURED IN THE DOM.
   *
   * `scripts/validate-theme-distinctness.mjs` proves the tokens are declared, wired and
   * design-matched in the SOURCE. This proves what the BROWSER computes: the page primary
   * action (the `primary` variant's `.ds-btn`) takes the design's own button fill — near-black
   * with white text on the two LIGHT designs, WHITE with black text on dim and dark (spec
   * §2.3–§2.5, §2.7) — while `bold`, which is preserved by contract, computes exactly the flat
   * accent its button painted before this batch (rgb(124,58,237) = its #7C3AED accent, with its
   * own surface token as the label colour).
   */
  test('the solid primary action computes the design\'s own button colour', async ({ page }) => {
    const EXPECTED: Record<string, { bg: string; color: string }> = {
      'minimal-light': { bg: 'rgba(0, 0, 0, 0.92)', color: 'rgb(255, 255, 255)' },
      serious: { bg: 'rgba(0, 0, 0, 0.92)', color: 'rgb(255, 255, 255)' },
      professional: { bg: 'rgb(255, 255, 255)', color: 'rgb(0, 0, 0)' },
      fun: { bg: 'rgb(255, 255, 255)', color: 'rgb(0, 0, 0)' },
      bold: { bg: 'rgb(124, 58, 237)', color: 'rgb(18, 19, 24)' },
    };
    for (const theme of THEMES) {
      await selectTheme(page, theme.id);
      const computed = await page.evaluate(() => {
        const el = document.createElement('button');
        el.className = 'ds-btn';
        el.textContent = 'probe';
        document.body.appendChild(el);
        const cs = getComputedStyle(el);
        const out = { bg: cs.backgroundColor, color: cs.color };
        el.remove();
        return out;
      });
      expect(computed, `${theme.id}: the solid primary action's computed colour`).toEqual(
        EXPECTED[theme.id]
      );
    }
  });

  /**
   * §OPENSHIP MAPPING BATCH 3 (2026-10-15) — A CALL SITE'S OWN COLOUR STILL WINS.
   *
   * The `.ds-btn` default is a DEFAULT, not an override: it is declared inside the
   * `components` layer so a caller's own utility beats it, exactly as `.ds-card`
   * states for the card border. A real call site depends on this —
   * `src/components/shared/TourEngine.tsx:372` gives the "Skip Tour" confirm button
   * its own neutral `bg-zinc-700` / `hover:bg-zinc-600` / `text-white`, because a
   * full-strength primary action is wrong inside that modal.
   *
   * This probe is the discriminator: the theme's own fill on `minimal-light` is
   * `rgba(0, 0, 0, 0.92)`, so if the default were UNLAYERED the computed background
   * would be that — not the caller's opaque black. It therefore fails if the rule
   * ever moves out of the layer.
   */
  test("a call site's own colour utility still wins over the `.ds-btn` default", async ({ page }) => {
    await selectTheme(page, 'minimal-light');
    const computed = await page.evaluate(() => {
      const el = document.createElement('button');
      el.className = 'ds-btn bg-black text-white';
      document.body.appendChild(el);
      const cs = getComputedStyle(el);
      const out = { bg: cs.backgroundColor, color: cs.color };
      el.remove();
      return out;
    });
    expect(
      computed.bg,
      'a call-site utility must beat the component default (the components-layer contract)'
    ).toBe('rgb(0, 0, 0)');
    expect(computed.color, 'the same holds for the label colour').toBe('rgb(255, 255, 255)');
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
    expect(new Set(values).size, `accents rendered: ${JSON.stringify(seen)}`).toBeGreaterThanOrEqual(3); /* OPENSHIP MAPPING 2026-10-15: minimal-light and serious share the Light accent by the Owner instruction, so the floor is the three DESIGNS (light violet, dim lime, dark orange). The old five-distinct rule would forbid the mapping. */
  });

  /**
   * §OPENSHIP BATCH 4 (2026-10-15) — THE SHARED SURFACES, VERIFIED IN THE DOM.
   *
   * `scripts/validate-shared-surfaces.mjs` proves the WIRING in the source. This
   * proves what the browser COMPUTES, per theme, for the four surfaces the batch
   * changes — including the two traits it exists for: a BORDERLESS card, and a
   * nested card that cannot VANISH inside it (with `bold`, whose token reproduces
   * today's rendering, deliberately unchanged).
   *
   * The probes are the primitive's own class strings (the same technique the CTA
   * test above uses), so a token that is declared but never reaches the DOM fails.
   */
  test('the shared-surface treatments reach the DOM (card · nested card · scrim · dropdown)', async ({
    page,
  }) => {
    const alphaOf = (color: string) => {
      const body = color.replace(/^rgba?\(/, '').replace(/\)$/, '');
      if (body.includes('/')) return Number(body.split('/')[1].trim());
      const parts = body.split(',');
      return parts.length >= 4 ? Number(parts[3]) : 1;
    };
    const rgbOf = (color: string) => {
      const body = color.replace(/^rgba?\(/, '').replace(/\)$/, '').split('/')[0].trim();
      return body.split(/[\s,]+/).slice(0, 3).map(Number);
    };

    for (const theme of THEMES) {
      await selectTheme(page, theme.id);
      const probe = await page.evaluate(() => {
        const mk = (cls: string, parent: HTMLElement = document.body) => {
          const el = document.createElement('div');
          el.className = cls;
          parent.appendChild(el);
          return el;
        };
        // The primitive's own shape: BOTH cards carry the card fill, so the nested
        // rule has to beat the element's own utility — which is its whole point.
        const outer = mk('ds-card bg-ink-850');
        const inner = mk('ds-card bg-ink-850', outer);
        const menu = mk('bg-ink-800/70 backdrop-blur-xl');
        const scrim = mk('absolute inset-0 backdrop-blur-lg');
        scrim.style.background = 'var(--mr-overlay-tint)';
        const tint = mk('bg-tint');
        const cs = (el: HTMLElement) => getComputedStyle(el);
        const out = {
          cardBorder: cs(outer).borderTopColor,
          outerBg: cs(outer).backgroundColor,
          innerBg: cs(inner).backgroundColor,
          menuBg: cs(menu).backgroundColor,
          menuBlur: cs(menu).backdropFilter,
          scrimBg: cs(scrim).backgroundColor,
          scrimBlur: cs(scrim).backdropFilter,
          tintBg: cs(tint).backgroundColor,
        };
        outer.remove();
        menu.remove();
        scrim.remove();
        tint.remove();
        return out;
      });

      if (theme.cardBorder === 'none') {
        expect(alphaOf(probe.cardBorder), `${theme.id}: the card must be BORDERLESS`).toBe(0);
      } else {
        expect(alphaOf(probe.cardBorder), `${theme.id}: bold keeps the card border it draws today`).toBeGreaterThan(0);
      }

      if (theme.id === 'bold') {
        expect(probe.innerBg, 'bold: a nested card keeps its own fill — the rule is a NO-OP there').toBe(probe.outerBg);
      } else {
        expect(probe.innerBg, `${theme.id}: a nested card must NOT vanish (its fill differs)`).not.toBe(probe.outerBg);
      }

      expect(alphaOf(probe.menuBg), `${theme.id}: the dropdown is TRANSLUCENT`).toBeLessThan(1);
      expect(probe.menuBlur, `${theme.id}: the dropdown carries a real backdrop blur`).toContain('blur(');
      expect(probe.scrimBlur, `${theme.id}: the modal scrim carries a real backdrop blur`).toContain('blur(');
      expect(alphaOf(probe.scrimBg), `${theme.id}: the modal scrim is a real veil`).toBeGreaterThan(0);
      expect(rgbOf(probe.scrimBg), `${theme.id}: the theme's OWN scrim colour`).toEqual([...theme.scrim]);
      expect(alphaOf(probe.tintBg), `${theme.id}: the floating-surface hover tint is a real colour`).toBeGreaterThan(0);
      expect(rgbOf(probe.tintBg), `${theme.id}: the hover tint is the foreground tint`).toEqual([...theme.tint]);
    }

    /* And on a REAL screen: a REAL card, rendered by the primitive, must actually be
       borderless in a non-Bold theme — the batch's whole point, proven where a user
       sees it rather than in a probe. `minimal-light` is chosen because it is the
       default theme an operator first meets, and an explicitly-bordered dialog card
       is excluded (26 call sites keep their own border by design, spec §13 Batch-4
       divergence 2). */
    await selectTheme(page, 'minimal-light');
    await loginAs(page, 'Super Admin — Tadii', 1400);
    await page
      .locator('nav[aria-label="Primary"] button', { hasText: 'Purchase Orders' })
      .first()
      .click({ timeout: 8000 });
    await page.waitForTimeout(650);
    const realCard = page.locator('.ds-card:not([class*="border-white"])').first();
    await expect(realCard).toBeVisible({ timeout: 8000 });
    const realBorder = await realCard.evaluate((el) => getComputedStyle(el).borderTopColor);
    expect(alphaOf(realBorder), `a real card on a real screen must be BORDERLESS (${realBorder})`).toBe(0);
  });
});
