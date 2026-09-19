/**
 * §UI/UX Wave 1 — Theme foundation & presentation seams browser verification.
 *
 * Verifies the six-theme architecture and the Wave 1 presentation seams in a
 * real Chromium against the actual dev server:
 *   - Minimal Light is the DEFAULT first-load theme
 *   - all six themes exist and apply (light themes → light surfaces; dark
 *     themes → genuinely near-black, never navy)
 *   - theme switching changes PRESENTATION ONLY (data + permissions unchanged)
 *   - homepage renders with the preserved shipment-tracker animation
 *   - "Unlock growth with data" element renders
 *   - notification severity presentation
 *   - avatar initials fallback and brand-logo identity seam
 *   - charts render with delicate thin strokes
 *   - responsive: no horizontal overflow on homepage (mobile)
 */
import { test, expect } from '@playwright/test';
import { loginAs } from './helpers/auth';

const SHOTS = 'test-screenshots/uiux-foundation';

async function openNav(page: import('@playwright/test').Page) {
  const vp = page.viewportSize();
  if (vp && vp.width < 1024) {
    await page.getByTestId('app-menu-toggle').click({ timeout: 4000 });
    await page.waitForTimeout(400);
  }
}

test.describe('UI/UX Wave 1 — theme foundation', () => {
  test('Minimal Light is the default first-load theme', async ({ page }) => {
    await page.goto('/');
    await page.waitForTimeout(1500);
    const rootTheme = await page.evaluate(() => document.documentElement.dataset.mercentaTheme);
    expect(rootTheme).toBe('minimal-light');
    const bodyBg = await page.evaluate(() => getComputedStyle(document.body).backgroundColor);
    const [r, g, b] = bodyBg.match(/\d+/g).map(Number);
    expect(r).toBeGreaterThan(230);
    expect(g).toBeGreaterThan(230);
    expect(b).toBeGreaterThan(230);
  });

  test('all six themes render with consistent semantic presence', async ({ page }) => {
    await loginAs(page, 'Super Admin — Tadii', 1400);
    await page.locator('[data-testid="theme-selector"]').click();
    await page.waitForTimeout(400);
    const options = await page.evaluate(() =>
      Array.from(document.querySelectorAll('[data-theme-option]')).map((e) => e.dataset.themeOption)
    );
    expect(options).toEqual([
      'minimal-light', 'professional', 'bold', 'fun', 'serious', 'current',
    ]);
    for (const t of options) {
      await page.locator(`[data-theme-option="${t}"]`).click();
      await page.waitForTimeout(500);
      const vars = await page.evaluate(() => {
        const s = getComputedStyle(document.documentElement);
        return {
          critical: s.getPropertyValue('--mr-state-critical'),
          warning: s.getPropertyValue('--mr-state-warning'),
          info: s.getPropertyValue('--mr-state-info'),
          success: s.getPropertyValue('--mr-state-success'),
          bg: s.getPropertyValue('--mr-bg'),
        };
      });
      expect(vars.critical).toMatch(/^#/);
      expect(vars.warning).toMatch(/^#/);
      expect(vars.info).toMatch(/^#/);
      expect(vars.success).toMatch(/^#/);
      const isDark = t === 'bold' || t === 'serious' || t === 'current';
      if (isDark) {
        const hex = vars.bg.replace('#', '');
        const [r, g, b] = [0, 2, 4].map((i) => parseInt(hex.slice(i, i + 2), 16));
        expect((r + g + b) / 3).toBeLessThan(40);
        expect(b > r + 18 && b > g + 18).toBe(false);
      } else {
        const [r, g, b] = vars.bg.replace('#', '').match(/../g).map((x) => parseInt(x, 16));
        expect(r).toBeGreaterThan(220);
        expect(g).toBeGreaterThan(220);
      }
    }
    await page.locator('[data-theme-option="minimal-light"]').click();
    await page.waitForTimeout(400);
    await page.keyboard.press('Escape');
  });

  test('theme switching does NOT change data (KPI values identical)', async ({ page }) => {
    await loginAs(page, 'Super Admin — Tadii', 1400);
    const kpiIds = ['kpi-value-pending-pos', 'kpi-value-docs-pending', 'kpi-value-renewals'];
    const baseline = await page.evaluate((ids) => {
      const out = {};
      for (const id of ids) {
        const el = document.querySelector(`[data-testid="kpi-value-${id}"]`);
        out[id] = el ? el.textContent.trim() : null;
      }
      return out;
    }, kpiIds);
    for (const t of ['professional', 'bold', 'fun', 'serious', 'current']) {
      await page.locator('[data-testid="theme-selector"]').click();
      await page.waitForTimeout(300);
      await page.locator(`[data-theme-option="${t}"]`).click();
      await page.waitForTimeout(350);
      await page.keyboard.press('Escape');
      await page.waitForTimeout(250);
      const now = await page.evaluate((ids) => {
        const out = {};
        for (const id of ids) {
          const el = document.querySelector(`[data-testid="kpi-value-${id}"]`);
          out[id] = el ? el.textContent.trim() : null;
        }
        return out;
      }, kpiIds);
      expect(now).toEqual(baseline);
    }
  });
test.describe('UI/UX Wave 1 — homepage & creative preservation', () => {
  test('homepage renders with the preserved tracker animation + Unlock growth', async ({ page }) => {
    await page.goto('/');
    await page.waitForTimeout(1600);
    await expect(page.locator('h1').first()).toBeVisible();
    const dotAnim = await page.evaluate(() => {
      const el = document.querySelector('.animate-route-dot');
      return el ? getComputedStyle(el).animationName : 'MISSING';
    });
    const pingAnim = await page.evaluate(() => {
      const el = document.querySelector('.animate-tracker-ping');
      return el ? getComputedStyle(el).animationName : 'MISSING';
    });
    expect(dotAnim).toBe('route-dot');
    expect(pingAnim).toBe('tracker-ping');
    await expect(page.locator('[data-testid="unlock-growth"]')).toBeVisible();
    await expect(
      page.locator('[data-testid="unlock-growth"] >> text=Unlock growth with data')
    ).toBeVisible();
  });

  test('homepage has no horizontal overflow on mobile', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto('/');
    await page.waitForTimeout(1600);
    const overflow = await page.evaluate(() =>
      document.documentElement.scrollWidth > document.documentElement.clientWidth + 1);
    expect(overflow).toBe(false);
    const trackerVisible = await page.evaluate(() =>
      !!document.querySelector('.animate-tracker-ping'));
    expect(trackerVisible).toBe(true);
    await page.screenshot({ path: `${SHOTS}/home-mobile-390.png` });
  });
});

test.describe('UI/UX Wave 1 — presentation seams', () => {
  test('notification centre surfaces severity semantics', async ({ page }) => {
    await loginAs(page, 'Super Admin — Tadii', 1400);
    await page.locator('[data-testid="notification-center"]').click();
    await page.waitForTimeout(600);
    const severities = await page.evaluate(() =>
      Array.from(document.querySelectorAll('[data-notification]')).map((e) => e.dataset.severity)
    );
    expect(severities.length).toBeGreaterThan(0);
    for (const s of severities) {
      expect(['critical', 'warning']).toContain(s);
    }
    await page.keyboard.press('Escape');
  });

  test('avatar initials fallback + brand logo identity seam render', async ({ page }) => {
    await loginAs(page, 'Super Admin — Tadii', 1400);
    await openNav(page);
    await page.click('nav >> text=Super Admin');
    await page.waitForTimeout(600);
    await page.click('text=Design System');
    await page.waitForTimeout(900);
    const initials = await page.evaluate(() => {
      const el = document.querySelector('[aria-label="Tadii Mercenta avatar"]');
      return el ? el.textContent.trim() : null;
    });
    expect(initials).toBe('TM');
    const logoFound = await page.evaluate(() =>
      Array.from(document.images).some((i) => (i.alt || '').includes('Manchester United')));
    expect(logoFound).toBe(true);
  });

  test('charts render delicate thin strokes', async ({ page }) => {
    await loginAs(page, 'Super Admin — Tadii', 1400);
    await openNav(page);
    await page.click('nav >> text=Super Admin');
    await page.waitForTimeout(600);
    await page.click('text=Design System');
    await page.waitForTimeout(900);
    const line = await page.evaluate(() => {
      const svg = document.querySelector('[data-chart="line"]');
      if (!svg) return null;
      const poly = svg.querySelector('polyline');
      return poly ? poly.getAttribute('stroke-width') : null;
    });
    expect(line).toBe('1.5');
    const ring = await page.evaluate(() => {
      const svg = document.querySelector('[data-chart="doughnut"]');
      return svg ? svg.dataset.chartRing : null;
    });
    expect(ring).toMatch(/^(11|12)px$/); // canonical thin ring values
  });
});

  test('theme switching does NOT change permissions (Super Admin nav stays hidden for brands)', async ({ page }) => {
    await loginAs(page, 'Tapatío', 1400);
    for (const t of ['bold', 'minimal-light', 'serious']) {
      await page.locator('[data-testid="theme-selector"]').click();
      await page.waitForTimeout(300);
      await page.locator(`[data-theme-option="${t}"]`).click();
      await page.waitForTimeout(350);
      await page.keyboard.press('Escape');
      await page.waitForTimeout(250);
    }
    const nav = page.locator('nav[aria-label="Primary"]');
    await expect(nav.locator('text=Super Admin').first()).toHaveCount(0);
    await expect(nav.locator('text=Brand Intelligence').first()).toHaveCount(0);
    await expect(nav.locator('text=Dashboard').first()).toBeVisible();
  });
});