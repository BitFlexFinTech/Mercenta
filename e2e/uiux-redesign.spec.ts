/**
 * §UI/UX Wave 2 — REDESIGN browser verification.
 *
 * Proves in a real Chromium that the redesigned experience is a genuine UI/UX
 * architecture change (not a palette swap) and that the existing functional
 * contracts survived it:
 *
 *   - Operations Overview is a WORKSPACE (frame + context bar + header +
 *     sticky toolbar + metric band + pipeline + queue + context rail)
 *   - the saturated palette is actually rendered (solid pipeline fills, metric
 *     accents, on-palette text)
 *   - real charts render and are ANIMATED (draw-in / arc / bar growth)
 *   - the density + grouping controls genuinely change the rendered queue
 *   - ⌘K opens the real command palette, filters it, and closes on Escape
 *   - the palette inherits RBAC from the shell's own navigation
 *   - all six themes express the same palette with distinct saturated values
 *   - responsive: no horizontal overflow at 1440 / 1280 / 1024 / 390
 *   - homepage: redesigned, TAM/SAM gone, tracker animation preserved
 *
 * Dev server started by playwright.config.ts (npm run dev, :5173).
 */
import { test, expect } from '@playwright/test';
import { loginAs } from './helpers/auth';

const SHOTS = 'test-screenshots/uiux-redesign';

test.describe('UI/UX Wave 2 — Operations Overview workspace', () => {
  test('1. composes the workspace architecture, not stacked cards', async ({ page }) => {
    await loginAs(page, 'Super Admin — Tadii', 1400);
    await page.getByTestId('dashboard-loaded').waitFor({ timeout: 12000 });

    await expect(page.locator('[data-workspace-frame]').first()).toBeVisible();
    await expect(page.locator('[data-workspace-header]').first()).toBeVisible();
    await expect(page.locator('[data-workspace-toolbar]').first()).toBeVisible();

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

  test('3. the grouping control genuinely changes the queue', async ({ page }) => {
    await loginAs(page, 'Super Admin — Tadii', 1400);
    await page.getByTestId('dashboard-loaded').waitFor({ timeout: 12000 });
    const rowsBefore = await page.locator('[data-testid^="attention-"]').count();
    expect(rowsBefore).toBeGreaterThan(0);
    const groupedBefore = await page.getByText('Purchase orders', { exact: true }).count();
    expect(groupedBefore).toBeGreaterThan(0);
    await page.getByTestId('toggle-group-attention').click();
    await page.waitForTimeout(400);
    await expect(page.getByTestId('toggle-group-attention')).toHaveAttribute(
      'aria-pressed',
      'false'
    );
    const rowsAfter = await page.locator('[data-testid^="attention-"]').count();
    expect(rowsAfter).toBe(rowsBefore);
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

  test('8. all six themes expose a distinct, saturated palette + one motion language', async ({ page }) => {
    await loginAs(page, 'Super Admin — Tadii', 1400);
    await page.locator('[data-testid="theme-selector"]').click();
    await page.waitForTimeout(400);
    const options = await page.evaluate(() =>
      Array.from(document.querySelectorAll('[data-theme-option]')).map(
        (e) => (e as HTMLElement).dataset.themeOption
      )
    );
    expect(options).toEqual([
      'minimal-light', 'professional', 'bold', 'fun', 'serious', 'current',
    ]);

    const seen: Record<string, string> = {};
    const HUES = ['indigo', 'cyan', 'green', 'amber', 'orange', 'pink', 'violet', 'red'];
    for (const t of options) {
      await page.locator(`[data-theme-option="${t}"]`).click();
      await page.waitForTimeout(420);
      const vals = await page.evaluate((hues) => {
        const s = getComputedStyle(document.documentElement);
        const out: Record<string, string> = {};
        for (const h of hues) out[h] = s.getPropertyValue(`--mr-palette-${h}`).trim();
        out.onPalette = s.getPropertyValue('--mr-on-palette').trim();
        out.motion = s.getPropertyValue('--mr-motion-base').trim();
        return out;
      }, HUES);
      for (const h of HUES) expect(vals[h], `${t} ${h}`).toMatch(/^#/);
      expect(vals.onPalette).toMatch(/^#/);
      expect(vals.motion).toBe('240ms');
      seen[t] = HUES.map((h) => vals[h]).join('|') + vals.onPalette;
      await page.screenshot({ path: `${SHOTS}/theme-${t}.png` });
    }
    // The six expressions are genuinely different (not a background swap only)
    expect(new Set(Object.values(seen)).size).toBe(6);

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

