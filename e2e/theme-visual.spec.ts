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
 * The TWO approved appearances and the values each MUST render
 * (`src/config/themes.ts`).
 *
 * §BRAND REDESIGN (2026-11-19) — REPOINTED, NOT WEAKENED. The selectable set is
 * now EXACTLY TWO, both built from the approved Mercenta identity (black
 * #000000 · white #FFFFFF · orange #FF6A00):
 *
 *   `brand-dark` (DEFAULT)  ·  `brand-light`
 *
 * The five retired themes — minimal-light, professional, bold, fun, serious —
 * are REMOVED IN FULL and `isThemeId()` rejects their ids, so a returning visitor
 * carrying one lands on `DEFAULT_THEME`. The old five-entry table below is
 * therefore not merely stale: it would select an id the app no longer accepts and
 * the theme would never change, which is exactly the failure this spec exists to
 * catch. The contract is repointed to the two real appearances and made STRICTLY
 * STRONGER in three places:
 *
 *   · the accent is now SHARED on purpose (one brand orange), so "the accents
 *     differ" can no longer be the proof that a theme switch did anything — the
 *     PAGE BACKGROUND is asserted instead (`#000000` vs `#FFFFFF`);
 *   · BOTH appearances now draw a hairline card edge (`#2B2B2B` / `#DCDCDC`), so
 *     the "borderless card" branch is gone and both are asserted to have a real
 *     edge;
 *   · the gradient CTA is retired in both (`--mr-accent-image: none`), so the
 *     primary action is asserted to be a FLAT brand-orange fill with black type.
 *
 * This spec must be updated in the SAME change as any theme value: it is the only
 * gate that proves a theme reaches the DOM.
 */
const THEMES = [
  {
    id: 'brand-dark',
    accent: '#FF6A00',
    /* The theme's own SCRIM (`--mr-overlay-tint`: rgba(0,0,0,0.72)) and its hover
       tint (`--mr-hover-tint`: rgba(255,255,255,0.05)): asserted from the COMPUTED
       style, so a token that never reaches the DOM fails here. */
    scrim: [0, 0, 0],
    tint: [255, 255, 255],
    /* Both brand appearances draw a hairline edge: `--mr-card-border` is
       #2B2B2B on dark. */
    cardBorder: 'hairline' as const,
    /* The page fill — the discriminator now that the accent is shared. */
    bg: '#000000',
  },
  {
    id: 'brand-light',
    accent: '#FF6A00',
    /* `--mr-overlay-tint`: rgba(0,0,0,0.50); `--mr-hover-tint`: rgba(0,0,0,0.04). */
    scrim: [0, 0, 0],
    tint: [0, 0, 0],
    /* `--mr-card-border` is #DCDCDC on light. */
    cardBorder: 'hairline' as const,
    bg: '#FFFFFF',
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
  /* §BRAND REDESIGN (2026-11-19) — STRICTLY STRONGER. The accent is now SHARED by
     both appearances (one brand orange), so it can no longer prove a switch
     happened. The page fill is the discriminator: #000000 on `brand-dark`,
     #FFFFFF on `brand-light`. Asserting the exact value (not merely "non-empty")
     is what makes "the appearance really changed" a fact about the browser. */
  expect(norm(applied.bg), `computed --mr-bg for ${theme.id}`).toBe(norm(theme.bg));
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
   * §BRAND REDESIGN (2026-11-19) — THE PRIMARY ACTION IS FLAT, VERIFIED IN THE DOM.
   *
   * REPOINTED, NOT WEAKENED. The approved identity carries ONE flat brand orange
   * (`#FF6A00`); the decorative gradient CTA that the retired OpenShip mapping
   * carried is gone in BOTH appearances (`--mr-accent-image: none` and
   * `--mr-accent-image-hover: none`). The old assertion demanded a gradient on four
   * themes and `none` on one — under the current contract that would fail on every
   * theme, so it is repointed to the behaviour that is actually approved.
   *
   * The check is not simply inverted to "expect none": the SAME probe also asserts
   * the fill that replaced the gradient, so a theme that painted NO background at
   * all could not pass. Declaring a token is not rendering it; this proves what the
   * browser computes.
   */
  test('the primary action paints the flat brand fill, with no decorative gradient', async ({
    page,
  }) => {
    for (const theme of THEMES) {
      await selectTheme(page, theme.id);
      const computed = await page.evaluate(() => {
        const el = document.createElement('button');
        el.className = 'ds-btn-accent bg-brass-500';
        el.textContent = 'probe';
        document.body.appendChild(el);
        const cs = getComputedStyle(el);
        const out = { image: cs.backgroundImage, bg: cs.backgroundColor };
        el.remove();
        return out;
      });
      expect(
        computed.image,
        `${theme.id} must paint NO decorative gradient (the brand fill is flat)`
      ).toBe('none');
      expect(
        computed.bg,
        `${theme.id} must still paint the brand orange fill beneath the flat action`
      ).toBe('rgb(255, 106, 0)');
    }
  });

  /**
   * §BRAND REDESIGN (2026-11-19) — THE SOLID PRIMARY ACTION, MEASURED IN THE DOM.
   *
   * REPOINTED, NOT WEAKENED. `scripts/validate-theme-distinctness.mjs` proves the
   * tokens are declared and wired in the SOURCE; this proves what the BROWSER
   * computes. Under the approved identity the page primary action is ONE brand
   * button in BOTH appearances: `--mr-btn-bg` #FF6A00 with `--mr-btn-text` #000000.
   * The retired five-theme table (near-black/white fills per design) is gone with
   * those themes, so the expectation is repointed to the single approved pair.
   *
   * The contrast this pins is real: brand orange on black type is a deliberate
   * high-contrast action, and a theme that drifted its label colour would become
   * unreadable — which is exactly what the assertion catches.
   */
  test('the solid primary action computes the brand button colours', async ({ page }) => {
    const EXPECTED: Record<string, { bg: string; color: string }> = {
      'brand-dark': { bg: 'rgb(255, 106, 0)', color: 'rgb(0, 0, 0)' },
      'brand-light': { bg: 'rgb(255, 106, 0)', color: 'rgb(0, 0, 0)' },
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
   * This probe is the discriminator: the theme's own fill is the brand orange
   * `rgb(255, 106, 0)`, so if the default were UNLAYERED the computed background
   * would be that — not the caller's opaque black. It therefore fails if the rule
   * ever moves out of the layer. (`brand-light` is used so the light shell's own
   * remaps are exercised at the same time.)
   */
  test("a call site's own colour utility still wins over the `.ds-btn` default", async ({ page }) => {
    await selectTheme(page, 'brand-light');
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

  /**
   * §BRAND REDESIGN (2026-11-19) — A SWITCH THAT CHANGES NOTHING IS STILL NOT A THEME.
   *
   * REPOINTED, NOT WEAKENED. The old test asserted that the five themes painted
   * five different accents. Under the approved identity there is exactly ONE brand
   * accent (`#FF6A00`) and BOTH appearances must paint it — so "different accents"
   * is no longer the proof that a switch did anything, and asserting it would
   * contradict the contract. The proof is repointed to the two facts that ARE the
   * contract, and both are stricter than the old floor:
   *
   *   1. both appearances compute the SAME single brand accent (`#FF6A00`) — a
   *      drift here would mean the accent had been retyped per theme;
   *   2. the PAGE FILL differs between them (`#000000` vs `#FFFFFF`) — a switch
   *      that changed nothing would fail here.
   */
  test('both appearances share the one brand accent and differ in page fill', async ({ page }) => {
    const seen: Record<string, { accent: string; bg: string }> = {};
    for (const theme of THEMES) {
      await selectTheme(page, theme.id);
      seen[theme.id] = await page.evaluate(() => {
        const cs = getComputedStyle(document.documentElement);
        return {
          accent: cs.getPropertyValue('--mr-accent').trim().toLowerCase(),
          bg: cs.getPropertyValue('--mr-bg').trim().toLowerCase(),
        };
      });
    }
    const accents = Object.values(seen).map((s) => s.accent);
    expect(
      new Set(accents).size,
      `both appearances must paint the ONE brand accent: ${JSON.stringify(seen)}`
    ).toBe(1);
    expect(accents[0], 'the shared accent is the approved brand orange').toBe('#ff6a00');

    const fills = Object.values(seen).map((s) => s.bg);
    expect(
      new Set(fills).size,
      `the page fill must differ between the two appearances: ${JSON.stringify(seen)}`
    ).toBe(2);
  });

  /**
   * §BRAND REDESIGN (2026-11-19) — THE SHARED SURFACES, VERIFIED IN THE DOM.
   *
   * `scripts/validate-shared-surfaces.mjs` proves the WIRING in the source. This
   * proves what the browser COMPUTES, per appearance, for the four surfaces the
   * design system owns: the card edge, the nested card, the modal scrim and the
   * floating dropdown.
   *
   * REPOINTED, NOT WEAKENED. The retired OpenShip contract made the card BORDERLESS
   * on four themes and kept the border only on `bold`; the approved identity draws
   * a hairline edge on BOTH appearances (`#2B2B2B` on dark, `#DCDCDC` on light), so
   * the "borderless" branch is removed and BOTH appearances are asserted to carry a
   * real edge — a stricter requirement than the old one. The `bold`-only nested-card
   * exception is removed with that theme; the nested card must not VANISH in either
   * appearance, which is the trait the rule exists for.
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

      /* Both approved appearances draw a real hairline edge from `--mr-card-border`.
         A theme whose card lost its edge would render as a floating rectangle with
         no separation on a same-colour page — the defect this pins. */
      expect(
        alphaOf(probe.cardBorder),
        `${theme.id}: the card edge must be a real hairline (${probe.cardBorder})`
      ).toBeGreaterThan(0);

      /* A nested card must never VANISH inside its parent: its fill has to differ
         from the outer card's, or the nesting reads as one flat block. */
      expect(
        probe.innerBg,
        `${theme.id}: a nested card must NOT vanish (its fill differs)`
      ).not.toBe(probe.outerBg);

      expect(alphaOf(probe.menuBg), `${theme.id}: the dropdown is TRANSLUCENT`).toBeLessThan(1);
      expect(probe.menuBlur, `${theme.id}: the dropdown carries a real backdrop blur`).toContain('blur(');
      expect(probe.scrimBlur, `${theme.id}: the modal scrim carries a real backdrop blur`).toContain('blur(');
      expect(alphaOf(probe.scrimBg), `${theme.id}: the modal scrim is a real veil`).toBeGreaterThan(0);
      expect(rgbOf(probe.scrimBg), `${theme.id}: the theme's OWN scrim colour`).toEqual([...theme.scrim]);
      expect(alphaOf(probe.tintBg), `${theme.id}: the floating-surface hover tint is a real colour`).toBeGreaterThan(0);
      expect(rgbOf(probe.tintBg), `${theme.id}: the hover tint is the foreground tint`).toEqual([...theme.tint]);
    }

    /* And on a REAL screen: a REAL card, rendered by the primitive, must carry the
       theme's hairline edge — proven where a user sees it rather than in a probe.
       `brand-light` is chosen because it is the appearance whose edge is lightest
       against its own page fill, so a lost edge is most visible there. An
       explicitly-bordered dialog card is excluded (call sites may keep their own
       border by design), so the selector skips `border-white` variants. */
    await selectTheme(page, 'brand-light');
    await loginAs(page, 'Super Admin — Tadii', 1400);
    await page
      .locator('nav[aria-label="Primary"] button', { hasText: 'Purchase Orders' })
      .first()
      .click({ timeout: 8000 });
    await page.waitForTimeout(650);
    const realCard = page.locator('.ds-card:not([class*="border-white"])').first();
    await expect(realCard).toBeVisible({ timeout: 8000 });
    const realBorder = await realCard.evaluate((el) => getComputedStyle(el).borderTopColor);
    expect(
      alphaOf(realBorder),
      `a real card on a real screen must carry the theme's hairline edge (${realBorder})`
    ).toBeGreaterThan(0);
  });
});
