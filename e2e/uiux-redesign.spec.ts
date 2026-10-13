/**
 * §UI/UX Wave 2 — REDESIGN browser verification.
 *
 * Proves in a real Chromium that the redesigned experience is a genuine UI/UX
 * architecture change (not a palette swap) and that the existing functional
 * contracts survived it:
 *
 *   - Operations Overview is a WORKSPACE (frame + context bar + header +
 *     metric band + pipeline + queue + context rail). §REPOINTED (2026-10-12,
 *     `discovered-overview-vestigial-toolbar-strip` option (a)): the Overview's
 *     `sticky toolbar` slot was REMOVED — it held only an inert ⌘K hint and read
 *     as an empty control bar, so the assertion on `[data-workspace-toolbar]` is
 *     gone from test 1. The shared workspace shell still renders the toolbar slot
 *     for the workspaces that own real controls (its guard lives in
 *     `validate-uiux-redesign.mjs`).
 *   - the saturated palette is actually rendered (solid pipeline fills, metric
 *     accents, on-palette text)
 *   - real charts render and are ANIMATED (draw-in / arc / bar growth)
 *   - the density + grouping controls genuinely change the rendered queue
 *   - ⌘K opens the real command palette, filters it, and closes on Escape
 *   - the palette inherits RBAC from the shell's own navigation
 *   - every theme applies ITS OWN declared palette (§REPOINTED 2026-10-13: the
 *     earlier claim here was "all five themes express the same palette with
 *     distinct saturated values", which the §PHASE C theme work made false — see
 *     test 8)
 *   - responsive: no horizontal overflow at 1440 / 1280 / 1024 / 390
 *   - homepage: redesigned, TAM/SAM gone, tracker animation preserved
 *
 * Dev server started by playwright.config.ts (npm run dev, :5182).
 */
import { test, expect } from '@playwright/test';
import { loginAs } from './helpers/auth';
import { THEMES } from '../src/config/themes';
import type { ThemeId, ThemeMode } from '../src/config/themes';

const SHOTS = 'test-screenshots/uiux-redesign';

test.describe('UI/UX Wave 2 — Operations Overview workspace', () => {
  test('1. composes the workspace architecture, not stacked cards', async ({ page }) => {
    await loginAs(page, 'Super Admin — Tadii', 1400);
    await page.getByTestId('dashboard-loaded').waitFor({ timeout: 12000 });

    await expect(page.locator('[data-workspace-frame]').first()).toBeVisible();
    await expect(page.locator('[data-workspace-header]').first()).toBeVisible();
    // §REPOINTED — the Overview no longer renders a sticky toolbar (see the file header).

    await expect(page.getByTestId('kpi-value-pending-pos')).toBeVisible();
    await expect(page.getByTestId('kpi-value-gate')).toBeVisible();

    const stages = page.locator('[data-pipeline-stage]');
    await expect(stages).toHaveCount(5);
    const firstStageBg = await page.evaluate(() => {
      const el = document.querySelector('[data-pipeline-stage] span');
      return el ? getComputedStyle(el).backgroundColor : null;
    });
    expect(firstStageBg).toBeTruthy();
    expect(firstStageBg).not.toBe('rgba(0, 0, 0, 0)');
    expect(firstStageBg).not.toBe('transparent');

    await expect(page.locator('[role="complementary"][aria-label="Context"]')).toBeVisible();
    await expect(page.locator('aside')).toHaveCount(1);
    await expect(page.locator('nav[aria-label="Primary"] [aria-current="page"]')).toHaveCount(1);
    await page.screenshot({ path: `${SHOTS}/overview-1440.png` });
  });

  test('2. real charts render and are animated', async ({ page }) => {
    await loginAs(page, 'Super Admin — Tadii', 1400);
    await page.getByTestId('dashboard-loaded').waitFor({ timeout: 12000 });

    await expect(page.locator('[data-chart="line"]').first()).toBeVisible();
    const stroke = await page.evaluate(() => {
      const poly = document.querySelector('[data-chart="line"] polyline');
      return poly ? poly.getAttribute('stroke-width') : null;
    });
    expect(stroke).toBe('1.5');
    const drawAnim = await page.evaluate(() => {
      const poly = document.querySelector('[data-chart="line"] polyline');
      return poly ? getComputedStyle(poly).animationName : null;
    });
    expect(drawAnim).toBe('mr-draw');
    await expect(page.locator('[data-chart="bars"]').first()).toBeVisible();
    await expect(page.locator('[data-chart="doughnut"]').first()).toBeVisible();
  });

  test('3. the overview is a read-only business view — the removed action surfaces stay removed', async ({ page }) => {
    await loginAs(page, 'Super Admin — Tadii', 1400);
    await page.getByTestId('dashboard-loaded').waitFor({ timeout: 12000 });
    /**
     * §Dashboard-cleanup (2026-09-22) — REPOINTED, not weakened.
     *
     * OLD CONTRACT (recorded, no longer valid): this test asserted that the
     * Overview's attention queue existed and that its Group/Flat rows toggle
     * changed the rendering while keeping the same row count. Both the queue and
     * the toggle were REMOVED from the Overview as duplicated surfaces — the work
     * list is owned by Work Management / Operations Calendar and founder
     * attention by the Control Centre.
     *
     * NEW CONTRACT: the Overview is a read-only business overview. It must show
     * the business sections and must NOT carry a second attention queue, a second
     * next-action list, the Command Centre, or the removed toggle.
     */
    await expect(page.getByTestId('command-centre')).toHaveCount(0);
    await expect(page.locator('[data-testid^="attention-"]')).toHaveCount(0);
    await expect(page.locator('[data-testid^="action-"]')).toHaveCount(0);
    await expect(page.getByTestId('toggle-group-attention')).toHaveCount(0);
    // The business overview itself is intact: Portfolio first, charts present.
    await expect(page.locator('section >> text=Portfolio at a glance').first()).toBeVisible();
    await expect(page.locator('[data-chart="line"]').first()).toBeVisible();
    await expect(page.locator('[data-chart="doughnut"]').first()).toBeVisible();
  });

  test('4. KPI drill-down still routes to the real destination', async ({ page }) => {
    await loginAs(page, 'Super Admin — Tadii', 1400);
    await page.getByTestId('dashboard-loaded').waitFor({ timeout: 12000 });
    await page.getByTestId('kpi-open-pending-pos').click();
    await page.waitForTimeout(900);
    await expect(
      page.locator('nav[aria-label="Breadcrumb"]').getByText('Purchase Orders')
    ).toBeVisible();
  });
});

test.describe('UI/UX Wave 2 — findability (command palette)', () => {
  test('5. ⌘K opens the real palette with real records and honest filtering', async ({ page }) => {
    await loginAs(page, 'Super Admin — Tadii', 1400);
    await page.getByTestId('dashboard-loaded').waitFor({ timeout: 12000 });

    await page.keyboard.press('Meta+k');
    await expect(page.getByTestId('command-palette')).toBeVisible({ timeout: 4000 });
    await page.screenshot({ path: `${SHOTS}/command-palette.png` });

    const countText = await page.getByTestId('command-palette-count').textContent();
    expect(Number((countText ?? '').match(/\d+/)?.[0] ?? 0)).toBeGreaterThan(0);

    await page.getByTestId('command-palette-input').fill('Brand CRM');
    await page.waitForTimeout(350);
    await expect(page.getByTestId('command-palette-item-nav-crm')).toBeVisible();

    // A query with no match says so honestly instead of faking results
    await page.getByTestId('command-palette-input').fill('zzzz-no-such-record');
    await page.waitForTimeout(300);
    await expect(page.getByTestId('command-palette-empty')).toBeVisible();

    await page.keyboard.press('Escape');
    await expect(page.getByTestId('command-palette')).toHaveCount(0);
  });

  test('6. palette destinations inherit RBAC (brand never sees admin views)', async ({ page }) => {
    await loginAs(page, 'Tapatío', 1400);
    await page.keyboard.press('Meta+k');
    await expect(page.getByTestId('command-palette')).toBeVisible({ timeout: 4000 });
    await expect(page.getByTestId('command-palette-item-nav-crm')).toHaveCount(0);
    await expect(page.getByTestId('command-palette-item-nav-super_admin')).toHaveCount(0);
    await expect(page.getByTestId('command-palette-item-nav-purchase_orders')).toBeVisible();
    await page.keyboard.press('Escape');
  });
});


test.describe('UI/UX Wave 2 — navigation & themes', () => {
  test('7. nav badges + compact rail work; active state is palette-driven', async ({ page }) => {
    await loginAs(page, 'Super Admin — Tadii', 1400);
    await page.getByTestId('dashboard-loaded').waitFor({ timeout: 12000 });

    // At least one real outstanding-work badge is rendered
    const badges = await page.locator('[data-testid^="nav-badge-"]').count();
    expect(badges).toBeGreaterThan(0);

    // Active nav item is tinted with the section palette, not brass
    const activeTint = await page.evaluate(() => {
      const el = document.querySelector('nav[aria-label="Primary"] [aria-current="page"]');
      return el ? getComputedStyle(el).backgroundColor : null;
    });
    expect(activeTint).toBeTruthy();
    expect(activeTint).not.toBe('rgba(0, 0, 0, 0)');

    // Compact rail is an explicit user preference: toggling hides the labels
    await page.getByTestId('nav-compact-toggle').click();
    await page.waitForTimeout(400);
    await expect(page.locator('#app-sidebar')).toHaveAttribute('data-nav-compact', 'true');
    await page.screenshot({ path: `${SHOTS}/nav-compact.png` });
    await page.getByTestId('nav-compact-toggle').click();
    await page.waitForTimeout(400);
    await expect(page.locator('#app-sidebar')).toHaveAttribute('data-nav-compact', 'false');
  });

  test('8. every theme applies ITS OWN declared palette, and one motion language', async ({ page }) => {
    await loginAs(page, 'Super Admin — Tadii', 1400);
    await page.locator('[data-testid="theme-selector"]').click();
    await page.waitForTimeout(400);
    const options = await page.evaluate(() =>
      Array.from(document.querySelectorAll('[data-theme-option]')).map(
        (e) => (e as HTMLElement).dataset.themeOption ?? ''
      )
    );
    expect(options).toEqual([
      'minimal-light', 'professional', 'bold', 'fun', 'serious',
    ]);

    /*
     * §REPOINTED 2026-10-13 (§PHASE C4) — the assertion that this test REPLACED.
     *
     * It required the five themes to render FIVE DIFFERENT palette signatures
     * (`new Set(values).size === 5`) and failed with "Expected: 5, Received: 2".
     * That expectation became false when the five themes were rebuilt in §PHASE C:
     * the canonical contract in `src/config/themes.ts` is ONE hue → domain mapping
     * (indigo=orders · cyan=intelligence · green=finance · amber=compliance ·
     * orange=logistics · pink=communications · violet=catalogue · red=risk) whose
     * EXPRESSION differs between a light theme (deeper fills, white on-palette
     * text) and a dark theme (bright fills, near-black on-palette text) — so the
     * palettes resolve to exactly two expressions, and the distinctness of the
     * five themes lives in their IDENTITY tokens (accent, surfaces, text), which
     * `scripts/validate-theme-distinctness.mjs` (33 arithmetic checks) and
     * `e2e/theme-visual.spec.ts` (the COMPUTED `--mr-accent` per theme) gate.
     *
     * The replacement is STRICTER, not weaker: it reads the declared palette from
     * the owner (`src/config/themes.ts`) and requires each theme's RENDERED
     * values to equal ITS OWN declared values. The old form could pass if two
     * themes silently swapped palettes (as long as five signatures existed); this
     * one cannot. Identity distinctness is asserted here too, on rendered values.
     */
    const HUES = ['indigo', 'cyan', 'green', 'amber', 'orange', 'pink', 'violet', 'red'] as const;
    const PROPS = [...HUES.map((h) => `--mr-palette-${h}`), '--mr-on-palette', '--mr-motion-base', '--mr-accent'];
    const norm = (v: string) => v.trim().toLowerCase();

    const rendered: Record<string, Record<string, string>> = {};
    for (const t of options as ThemeId[]) {
      await page.locator(`[data-theme-option="${t}"]`).click();
      await page.waitForTimeout(420);
      const vals = await page.evaluate((props) => {
        const s = getComputedStyle(document.documentElement);
        const out: Record<string, string> = {};
        for (const p of props) out[p] = s.getPropertyValue(p);
        return out;
      }, PROPS);
      rendered[t] = vals;

      const declared = THEMES[t].vars;
      for (const p of PROPS) {
        if (p === '--mr-motion-base') continue;
        expect(norm(vals[p]), `${t} renders its DECLARED ${p}`).toBe(norm(declared[p]));
      }
      /* Motion is theme-invariant BY CONTRACT (one motion language everywhere). */
      expect(norm(vals['--mr-motion-base']), `${t} motion`).toBe('240ms');

      await page.screenshot({ path: `${SHOTS}/theme-${t}.png` });
    }

    /* The two EXPRESSIONS (light / dark) each apply one palette, and differ. */
    const signature = (t: ThemeId) => HUES.map((h) => norm(rendered[t][`--mr-palette-${h}`])).join('|');
    const byMode: Record<ThemeMode, Set<string>> = { light: new Set(), dark: new Set() };
    for (const t of options as ThemeId[]) byMode[THEMES[t].mode].add(signature(t));
    for (const mode of ['light', 'dark'] as const) {
      expect(byMode[mode].size, `every ${mode} theme renders one ${mode} palette expression`).toBe(1);
    }
    expect(
      [...byMode.light][0],
      'the light and dark palette expressions must genuinely differ'
    ).not.toBe([...byMode.dark][0]);

    /* The five IDENTITIES stay distinct on the rendered page. */
    expect(
      new Set((options as ThemeId[]).map((t) => norm(rendered[t]['--mr-accent']))).size,
      'the five themes must render five distinct identity accents'
    ).toBe(5);

    await page.locator('[data-theme-option="minimal-light"]').click();
    await page.waitForTimeout(350);
    await page.keyboard.press('Escape');
  });
});


test.describe('UI/UX Wave 2 — responsive workspace', () => {
  const VIEWPORTS = [
    { name: '1440x900', w: 1440, h: 900 },
    { name: '1280x800', w: 1280, h: 800 },
    { name: '1024x768', w: 1024, h: 768 },
    { name: '390x844', w: 390, h: 844 },
  ];

  for (const vp of VIEWPORTS) {
    test(`9. workspace ${vp.name} — no horizontal overflow`, async ({ page }) => {
      await page.setViewportSize({ width: vp.w, height: vp.h });
      await loginAs(page, 'Super Admin — Tadii', 1400);
      await page.getByTestId('dashboard-loaded').waitFor({ timeout: 12000 });
      const overflow = await page.evaluate(
        () => document.documentElement.scrollWidth - document.documentElement.clientWidth
      );
      expect(overflow, `horizontal overflow at ${vp.name}`).toBeLessThanOrEqual(1);
      await page.screenshot({ path: `${SHOTS}/workspace-${vp.name}.png` });
    });
  }
});

test.describe('UI/UX Wave 2 — homepage redesign', () => {
  test('10. redesigned homepage: no TAM/SAM, tracker animation preserved, palette applied', async ({ page }) => {
    await page.goto('/');
    await page.waitForTimeout(1800);

    // TAM/SAM market-size section is GONE
    await expect(page.locator('text=The Size of the Opportunity')).toHaveCount(0);

    // Redesigned sections render from the content model
    for (const id of ['about', 'services', 'network', 'visibility', 'protection']) {
      await expect(page.locator(`section#${id}`)).toBeVisible();
    }

    // No Amazon-specific customer-facing framing, no guaranteed-outcome claims
    const body = (await page.locator('body').innerText()).toLowerCase();
    expect(body).not.toContain('amazon');
    expect(body).not.toContain('guaranteed');

    // The preserved top-right tracker animation still animates
    const anims = await page.evaluate(() => {
      const dot = document.querySelector('.animate-route-dot');
      const ping = document.querySelector('.animate-tracker-ping');
      return {
        dot: dot ? getComputedStyle(dot).animationName : 'MISSING',
        ping: ping ? getComputedStyle(ping).animationName : 'MISSING',
      };
    });
    expect(anims.dot).toBe('route-dot');
    expect(anims.ping).toBe('tracker-ping');

    // The tracker dot now carries a saturated palette colour
    const dotBg = await page.evaluate(() => {
      const el = document.querySelector('.animate-route-dot span') as HTMLElement | null;
      return el ? getComputedStyle(el).backgroundColor : null;
    });
    expect(dotBg).toBeTruthy();
    expect(dotBg).not.toBe('rgba(0, 0, 0, 0)');

    await page.screenshot({ path: `${SHOTS}/homepage-1440.png`, fullPage: true });
    await page.setViewportSize({ width: 390, height: 844 });
    await page.waitForTimeout(600);
    const overflow = await page.evaluate(
      () => document.documentElement.scrollWidth - document.documentElement.clientWidth
    );
    expect(overflow).toBeLessThanOrEqual(1);
    await page.screenshot({ path: `${SHOTS}/homepage-390.png` });
  });
});

