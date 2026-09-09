/**
 * §Phase 7C — Dashboard / Overview redesign verification.
 *
 * Covers the redesigned Admin Operations Overview and the corrected Brand
 * dashboard: real-data KPI rendering, cross-consistency between independently
 * rendered surfaces (KPI band vs next-action counts), actionable attention
 * rows with real demo entities, drill-down routing to existing destinations,
 * RBAC preservation (admin ≠ super-admin nav), the removal of the fabricated
 * brand compliance score (94.2), responsive no-overflow checks at all seven
 * target viewports, mobile drawer behaviour, and keyboard focus visibility.
 *
 * Dev server started by playwright.config.ts (`npm run dev`, :5173).
 */
import { test, expect } from '@playwright/test';
import { loginAs } from './helpers/auth';

const SHOTS = 'test-screenshots/dashboard';

const VIEWPORTS = [
  { w: 1440, h: 900 },
  { w: 1280, h: 800 },
  { w: 1024, h: 768 },
  { w: 768, h: 1024 },
  { w: 430, h: 932 },
  { w: 390, h: 844 },
  { w: 375, h: 812 },
];

async function openAdminDashboard(page: import('@playwright/test').Page, card = 'Mercenta Admin Hub') {
  await loginAs(page, card, 1200);
  await page.getByTestId('dashboard-loaded').waitFor({ timeout: 10000 });
}

test.describe('Admin Operations Overview — redesigned dashboard', () => {
  test('1. loads with the new operational hierarchy', async ({ page }) => {
    await openAdminDashboard(page);
    // Page context — h1 + derived summary line.
    await expect(page.getByRole('heading', { name: 'Operations Overview' })).toBeVisible();
    // Section hierarchy (h3s).
    for (const section of [
      'Portfolio at a glance',
      'Needs your attention',
      'Next actions',
      'Fulfilment in motion',
      'Recent communications',
    ]) {
      await expect(page.locator(`section >> text=${section}`).first()).toBeVisible();
    }
    // KPI band rendered from real data (values are numeric strings).
    const pendingKpi = page.getByTestId('kpi-value-pending-pos');
    await expect(pendingKpi).toBeVisible();
    await expect(pendingKpi).toHaveText(/\d/);
    await expect(page.getByTestId('kpi-value-gate')).toBeVisible();
    // Next-action queue rendered.
    await expect(page.getByTestId('action-purchase_orders_admin')).toBeVisible();
    // Loading path completed (loaded container exists, loading container gone).
    await expect(page.getByTestId('dashboard-loading')).toHaveCount(0);
  });

  test('2. KPI band and next-action counts agree (same source, two surfaces)', async ({ page }) => {
    await openAdminDashboard(page);
    const kpiValue = await page.getByTestId('kpi-value-pending-pos').textContent();
    const actionText = await page.getByTestId('action-purchase_orders_admin').textContent();
    const kpiNumber = /(\d+)/.exec(kpiValue ?? '');
    const actionNumber = /(\d+)\s+awaiting action/.exec(actionText ?? '');
    expect(kpiNumber, 'KPI value must be an integer').not.toBeNull();
    expect(actionNumber, 'next action must show a count').not.toBeNull();
    expect(Number(kpiNumber![1])).toBe(Number(actionNumber![1]));
    // Compliance gate KPI is expressed against the full brand dataset (11 brands).
    const gateValue = await page.getByTestId('kpi-value-gate').textContent();
    expect(/^\s*\d+\s*\/\s*11\s*$/.test(gateValue ?? '')).toBe(true);
  });

  test('3. attention area surfaces real demo entities and remains actionable', async ({ page }) => {
    await openAdminDashboard(page);
    const panel = page.locator('[data-testid^="attention-"]');
    await expect(panel.first()).toBeVisible();
    // PO attention rows use real seed references.
    const poRows = page.locator('[data-testid^="attention-po-"]');
    const count = await poRows.count();
    if (count > 0) {
      await expect(poRows.first()).toContainText('PO-9');
    }
    // The panel only renders groups that have data; at minimum the section is present.
    await expect(page.locator('section >> text="Needs your attention"').first()).toBeVisible();
  });

  test('4. drill-down routes to existing destinations with RBAC intact', async ({ page }) => {
    await openAdminDashboard(page, 'Mercenta Admin Hub');
    // Non-super admin: super-only destinations stay hidden in the shell nav.
    const nav = page.locator('nav[aria-label="Primary"]');
    await expect(nav.locator('text=Super Admin')).toHaveCount(0);
    await expect(nav.locator('text=Audit Log')).toHaveCount(0);
    // Drill down through the next-action queue: Purchase Orders.
    await page.getByTestId('action-purchase_orders_admin').click();
    await page.waitForTimeout(900);
    await expect(
      page.locator('nav[aria-label="Breadcrumb"]').getByText('Purchase Orders')
    ).toBeVisible();
    // Real PO rows are visible in the destination list.
    await expect(page.getByText('PO-900', { exact: false }).first()).toBeVisible({ timeout: 6000 });
  });

  test('5. keyboard focus reaches KPI drill-down cells with a visible outline', async ({ page }) => {
    await openAdminDashboard(page);
    // Move keyboard focus: land on the body, then Tab to the first KPI cell button.
    await page.keyboard.press('Tab');
    let focused = false;
    for (let i = 0; i < 30; i++) {
      const id = await page.evaluate(() => {
        const el = document.activeElement;
        return el ? el.getAttribute('data-testid') : null;
      });
      if (id === 'kpi-open-pending-pos') {
        focused = true;
        break;
      }
      await page.keyboard.press('Tab');
    }
    expect(focused, 'Tab order must reach the pending-POs KPI drill-down').toBe(true);
    // Visible focus: :focus-visible outline must be applied (Phase 5 global rule).
    const outline = await page.evaluate(() => {
      const el = document.activeElement;
      if (!el) return 'none';
      const s = getComputedStyle(el);
      return `${s.outlineStyle} ${s.outlineWidth}`;
    });
    expect(outline).not.toMatch(/none\s+0px/i);
  });
});

test.describe('Brand dashboard — tenant-correct, no fabricated metrics', () => {
  test('6. loads for an onboarded brand, no 94.2, derived compliance coverage', async ({ page }) => {
    await loginAs(page, 'DeskForge Supplies Inc', 1500);
    await expect(page.getByRole('heading', { name: 'Dashboard' })).toBeVisible({ timeout: 8000 });
    // The fabricated hardcoded compliance score must be GONE.
    await expect(page.getByText('94.2', { exact: false })).toHaveCount(0);
    // Compliance coverage is derived from the brand's real docs "X/Y verified".
    const complianceLine = page.getByText(/\d+\/\d+ verified/);
    await expect(complianceLine.first()).toBeVisible({ timeout: 5000 });
    // No admin-only content leaks into the brand shell.
    const nav = page.locator('nav[aria-label="Primary"]');
    await expect(nav.locator('text=Audit Log')).toHaveCount(0);
    await expect(nav.locator('text=Global Catalog')).toHaveCount(0);
  });
});

test.describe('Dashboard — responsive & shell integrity', () => {
  test('7. no horizontal overflow at any target viewport; drawer works on mobile', async ({ page }) => {
    await openAdminDashboard(page);
    for (const vp of VIEWPORTS) {
      await page.setViewportSize({ width: vp.w, height: vp.h });
      await page.waitForTimeout(450);
      const overflow = await page.evaluate(() => {
        const doc = document.documentElement;
        return Math.max(doc.scrollWidth - doc.clientWidth, 0);
      });
      expect(overflow, `horizontal overflow at ${vp.w}x${vp.h}`).toBeLessThanOrEqual(1);
      await page.screenshot({
        path: `${SHOTS}/admin-${vp.w}x${vp.h}.png`,
        fullPage: true,
      });
    }
    // Mobile drawer still works at the smallest viewport.
    await page.setViewportSize({ width: 375, height: 812 });
    await page.waitForTimeout(400);
    const toggle = page.getByTestId('app-menu-toggle');
    await expect(toggle).toBeVisible();
    await toggle.click();
    await page.waitForTimeout(350);
    await expect(page.locator('#app-sidebar')).toBeVisible();
    await page.keyboard.press('Escape');
    await page.waitForTimeout(350);
  });
});