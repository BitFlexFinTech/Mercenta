/**
 * §Phase 5 — Design System Showcase browser verification.
 *
 * Renders the canonical kit via Super Admin → Design System and verifies:
 *  - rendering (typography, buttons, statuses, alerts, forms, tabs, table)
 *  - focus-visible (keyboard) behaviour on a canonical Button
 *  - modal open/close
 *  - no horizontal overflow at the seven required viewports
 *  - screenshots at every viewport
 *
 * Dev server started by playwright.config.ts (`npm run dev`, :5173).
 */
import { test, expect } from '@playwright/test';

const SHOTS = 'test-screenshots/design-system';

/**
 * §Phase 6 — below lg (1024px) the primary nav is an off-canvas drawer.
 * Open it before clicking a nav item on narrow viewports.
 */
async function openPrimaryNav(page: import('@playwright/test').Page) {
  const vp = page.viewportSize();
  if (vp && vp.width < 1024) {
    const toggle = page.getByTestId('app-menu-toggle');
    await toggle.click({ timeout: 4000 });
    await page.waitForTimeout(400);
  }
  await page.click('nav >> text=Super Admin');
}

async function openShowcase(page: import('@playwright/test').Page) {
  await page.goto('/');
  // Prefer the hero's Partner Login; fall back to the mobile-nav entry.
  const heroLogin = page.locator('text=Partner Login').first();
  try {
    await heroLogin.click({ timeout: 4000 });
  } catch {
    await page.getByRole('button', { name: 'Open navigation' }).click();
    await page.waitForTimeout(400);
    await page.getByRole('button', { name: 'Partner Login' }).last().click();
  }
  await page.waitForTimeout(600);
  await page.click('text=Super Admin — Tadii');
  await page.waitForTimeout(900);
  await openPrimaryNav(page);
  await page.waitForTimeout(600);
  await page.click('text=Design System');
  await page.waitForTimeout(500);
}

test.describe('Design System Showcase — rendering', () => {
  test('canonical kit renders', async ({ page }) => {
    await openShowcase(page);
    await expect(page.locator('text=MERCENTA Design System').first()).toBeVisible({ timeout: 8000 });
    await expect(page.locator('text=Typography').first()).toBeVisible();
    await expect(page.locator('text=Buttons').first()).toBeVisible();
    await expect(page.locator('text=Semantic status').first()).toBeVisible();
    await expect(page.locator('text=Alerts').first()).toBeVisible();
    await expect(page.locator('text=Form foundation').first()).toBeVisible();
    // Buttons — all 8 variants
    await expect(page.locator('button:has-text("Primary")')).toBeVisible();
    await expect(page.locator('button:has-text("Secondary")')).toBeVisible();
    await expect(page.locator('button:has-text("Tertiary")')).toBeVisible();
    await expect(page.locator('button:has-text("Ghost")')).toBeVisible();
    await expect(page.locator('button:has-text("Destructive")')).toBeVisible();
    await expect(page.locator('button:has-text("Link")')).toBeVisible();
    await expect(page.locator('button:has-text("Loading")')).toBeVisible();
    await expect(page.locator('button:has-text("Disabled")')).toBeDisabled();
    // Statuses
    await expect(page.locator('text=On track').first()).toBeVisible();
    await expect(page.locator('text=Blocked').first()).toBeVisible();
    // Data table row (toggle skeleton off first — the showcase opens loading)
    await page.getByRole('button', { name: 'Skeleton on' }).click();
    await expect(page.locator('text=Zambezi Organics').first()).toBeVisible({ timeout: 8000 });
  });

  test('focus-visible outline is visible on keyboard focus of a Button', async ({ page }) => {
    await openShowcase(page);
    const primary = page.locator('button:has-text("Primary")').first();
    // Give the PageHeader button focus by click, then Tab forward with real
    // keyboard events until the Primary button is active. The last Tab makes
    // the focus keyboard-modality, so :focus-visible must apply.
    await page.getByRole('button', { name: 'Skeleton on' }).click();
    for (let i = 0; i < 12; i++) {
      const onPrimary = await page.evaluate(() => {
        const el = document.activeElement as HTMLElement | null;
        return !!el && (el.textContent ?? '').trim() === 'Primary';
      });
      if (onPrimary) break;
      await page.keyboard.press('Tab');
    }
    const focusedOnPrimary = await page.evaluate(() => {
      const el = document.activeElement as HTMLElement | null;
      return !!el && (el.textContent ?? '').trim() === 'Primary';
    });
    expect(focusedOnPrimary).toBe(true);
    const hasOutlineViaCss = await primary.evaluate((el) => {
      const s = getComputedStyle(el);
      return s.outlineStyle !== 'none' && Number.parseFloat(s.outlineWidth) > 0;
    });
    expect(hasOutlineViaCss).toBe(true);
  });

  test('modal opens and closes', async ({ page }) => {
    await openShowcase(page);
    await page.click('button:has-text("Open modal")');
    await expect(page.getByRole('dialog', { name: 'Example dialog' })).toBeVisible({ timeout: 5000 });
    await page.keyboard.press('Escape');
    await expect(page.getByRole('dialog', { name: 'Example dialog' })).toHaveCount(0, { timeout: 4000 });
  });

  test('tabs are selectable with aria-selected', async ({ page }) => {
    await openShowcase(page);
    const activity = page.locator('[data-testid="tab-activity"]');
    await activity.click();
    await expect(activity).toHaveAttribute('aria-selected', 'true');
    await expect(page.locator('text=Active tab: activity').first()).toBeVisible();
  });
});

test.describe('Design System Showcase — responsive screenshots', () => {
  const VIEWPORTS = [
    { name: '1920x1080', w: 1920, h: 1080 },
    { name: '1440x900', w: 1440, h: 900 },
    { name: '1280x800', w: 1280, h: 800 },
    { name: '1024x768', w: 1024, h: 768 },
    { name: '768x1024', w: 768, h: 1024 },
    { name: '390x844', w: 390, h: 844 },
    { name: '375x812', w: 375, h: 812 },
  ];

  for (const vp of VIEWPORTS) {
    test(`screenshot ${vp.name} (no horizontal overflow)`, async ({ page }) => {
      await page.setViewportSize({ width: vp.w, height: vp.h });
      await openShowcase(page);
      await expect(page.locator('text=MERCENTA Design System').first()).toBeVisible({ timeout: 8000 });
      // No horizontal overflow on the showcase document.
      const overflow = await page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth + 1);
      expect(overflow).toBe(false);
      await page.screenshot({ path: `${SHOTS}/design-system-${vp.name}.png` });
    });
  }
});