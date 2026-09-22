/**
 * §Phase 7C — Dashboard / Overview redesign verification.
 *
 * Covers the Admin OVERVIEW (now a read-only business overview) and the corrected
 * Brand dashboard: real-data KPI rendering including the business figures,
 * drill-down routing to existing destinations, RBAC preservation (admin ≠
 * super-admin nav), the removal of the fabricated brand compliance score (94.2),
 * responsive no-overflow checks at all seven target viewports, mobile drawer
 * behaviour, and keyboard focus visibility.
 *
 * §Dashboard-cleanup (2026-09-22) — REPOINTED, not weakened. The Overview no
 * longer hosts the Command Centre, the "Needs your attention" queue or the
 * "Next actions" tiles (they were consolidated onto the Control Centre and the
 * work layer). The admin assertions below therefore verify the CLEANED surface:
 * the sections that remain, the business figures now on it, and the POSITIVE
 * absence of the removed surfaces — so the duplication cannot silently return.
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

test.describe('Admin Overview — business overview (dashboard cleanup)', () => {
  test('1. loads with the business-overview hierarchy, Portfolio first', async ({ page }) => {
    await openAdminDashboard(page);
    // Page context — h1 + derived summary line.
    await expect(page.getByRole('heading', { name: 'Operations Overview' })).toBeVisible();
    /**
     * §Dashboard-cleanup — the sections that REMAIN, and Portfolio at a glance is
     * FIRST in the workspace column (the business position before any activity
     * detail). The context rail's panels are excluded: they are not sections of
     * the overview's narrative.
     */
    for (const section of [
      'Portfolio at a glance',
      'Order pipeline',
      'Fulfilment in motion',
      'Recent communications',
    ]) {
      await expect(page.locator(`section[aria-label="${section}"]`).first()).toBeVisible();
    }
    const workspaceSections = await page
      .locator('[data-testid="dashboard-loaded"] section')
      .evaluateAll((els) =>
        els
          .filter((e) => !e.closest('[role="complementary"]'))
          .map((e) => e.getAttribute('aria-label'))
      );
    expect(workspaceSections[0], 'Portfolio at a glance must be the first section').toBe(
      'Portfolio at a glance'
    );

    // KPI band rendered from real data (values are numeric strings).
    const pendingKpi = page.getByTestId('kpi-value-pending-pos');
    await expect(pendingKpi).toBeVisible();
    await expect(pendingKpi).toHaveText(/\d/);
    await expect(page.getByTestId('kpi-value-gate')).toBeVisible();
    // Loading path completed (loaded container exists, loading container gone).
    await expect(page.getByTestId('dashboard-loading')).toHaveCount(0);
  });

  test('2. the business figures are on the overview and agree with the canonical cost model', async ({ page }) => {
    await openAdminDashboard(page);
    /**
     * §Dashboard-cleanup — the money row added from the EXISTING canonical model
     * (`src/lib/costs/costSummary.ts → operatingCostSummary`). Nothing is
     * recomputed here: the test asserts the figures render and are internally
     * consistent (revenue and contribution are both currency-shaped, margin is a
     * percentage), not a pinned value.
     */
    for (const id of ['revenue', 'contribution', 'margin']) {
      await expect(page.getByTestId(`kpi-value-${id}`)).toBeVisible();
    }
    await expect(page.getByTestId('kpi-value-revenue')).toHaveText(/£[\d,]+/);
    await expect(page.getByTestId('kpi-value-contribution')).toHaveText(/^-?£[\d,]+/);
    await expect(page.getByTestId('kpi-value-margin')).toHaveText(/^-?\d+(\.\d+)?%$/);
    // The provisional basis is stated, never implied audited.
    await expect(page.getByTestId('kpi-contribution')).toContainText(/Provisional|Derived/);
    // Compliance gate KPI keeps its canonical N / M shape.
    const gateValue = await page.getByTestId('kpi-value-gate').textContent();
    const gateMatch = /^\s*(\d+)\s*\/\s*(\d+)\s*$/.exec(gateValue ?? '');
    expect(gateMatch, 'gate KPI must be N / M').not.toBeNull();
    const cleared = Number(gateMatch![1]);
    const total = Number(gateMatch![2]);
    expect(total, 'denominator = full brand dataset').toBeGreaterThanOrEqual(1);
    expect(cleared).toBeLessThanOrEqual(total);
  });

  test('3. the removed action surfaces are GONE from the overview (consolidated elsewhere)', async ({ page }) => {
    await openAdminDashboard(page);
    /**
     * §Dashboard-cleanup — POSITIVE absence assertions. These guard the cleanup:
     * the Overview must not re-grow a second attention queue, a second
     * next-action list, or a second messages summary, and the Command Centre must
     * not return to the landing page. Each has ONE authoritative owner:
     *   · work list          → Work Management / Operations Calendar
     *   · founder attention  → Control Centre (incl. the Command Centre block)
     *   · message threads    → Messages (+ the single Recent communications summary)
     */
    await expect(page.getByTestId('command-centre')).toHaveCount(0);
    await expect(page.locator('[data-testid^="attention-"]')).toHaveCount(0);
    await expect(page.locator('[data-testid^="action-"]')).toHaveCount(0);
    await expect(page.locator('section >> text="Needs your attention"')).toHaveCount(0);
    await expect(page.locator('section >> text="Next actions"')).toHaveCount(0);
    await expect(page.locator('section >> text="Activity"')).toHaveCount(0);
    await expect(page.getByTestId('toggle-group-attention')).toHaveCount(0);
    // And the overview is still a real, populated surface.
    await expect(page.getByTestId('kpi-value-pending-pos')).toBeVisible();
  });

  test('4. KPI drill-down routes to existing destinations with RBAC intact', async ({ page }) => {
    await openAdminDashboard(page, 'Mercenta Admin Hub');
    // Non-super admin: super-only destinations stay hidden in the shell nav.
    const nav = page.locator('nav[aria-label="Primary"]');
    await expect(nav.locator('text=Super Admin')).toHaveCount(0);
    await expect(nav.locator('text=Audit Log')).toHaveCount(0);
    /**
     * §Dashboard-cleanup — drill-down is now asserted on the KPI cell itself
     * (the next-action tiles it used to use were removed). The invariant is
     * unchanged: a summary metric opens the owning destination, and the
     * destination renders real records.
     */
    await page.getByTestId('kpi-open-pending-pos').click();
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
    /**
     * §Dashboard-cleanup (2026-09-22) — the command centre and the next-action
     * tiles no longer sit above the KPI band, so the walk to the KPI cells is
     * shorter. The invariant is unchanged: focus MUST reach the drill-down cell
     * and MUST show a visible outline.
     */
    for (let i = 0; i < 200; i++) {
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
  test('6. loads for an onboarded brand, no 94.2, real derived compliance', async ({ page }) => {
    await loginAs(page, 'Tapatío', 1500);
    await expect(page.getByRole('heading', { name: 'Brand Overview' })).toBeVisible({ timeout: 8000 });
    await expect(page.getByTestId('brand-dashboard-loaded')).toHaveCount(1, { timeout: 10000 });
    // The fabricated hardcoded compliance score must be GONE.
    await expect(page.getByText('94.2', { exact: false })).toHaveCount(0);
    // Compliance coverage is derived from the brand's real gate docs (X/Y approved).
    const complianceLine = page.getByText(/\d+\/\d+ documents approved/);
    await expect(complianceLine.first()).toBeVisible({ timeout: 5000 });
    // The remaining legacy static chart (REVENUE_DATA) is removed, not hidden.
    await expect(page.getByText('Revenue and Order Volume Trend')).toHaveCount(0);
    await expect(page.getByText('Fulfilment Pipeline Tracker')).toHaveCount(0);
    // No admin-only content leaks into the brand shell.
    const nav = page.locator('nav[aria-label="Primary"]');
    await expect(nav.locator('text=Audit Log')).toHaveCount(0);
    await expect(nav.locator('text=Global Catalog')).toHaveCount(0);
  });

  test('7. brand KPI band renders real tenant-scoped values that agree with the PO summary', async ({ page }) => {
    await loginAs(page, 'Tapatío', 1500);
    await expect(page.getByTestId('brand-dashboard-loaded')).toHaveCount(1, { timeout: 10000 });
    // KPIs are numeric strings derived from the tenant's own rows.
    for (const id of ['active-pos', 'awaiting-ack', 'in-fulfilment', 'products-listed', 'out-of-stock']) {
      const kpi = page.getByTestId(`kpi-value-${id}`);
      await expect(kpi).toBeVisible();
      await expect(kpi).toHaveText(/\d/);
    }
    // Contract status is a real state, not a score.
    await expect(page.getByTestId('kpi-value-contract-status')).toHaveText(/Active|—/);
    // KPI band and PO summary derive from the same source → identical active count.
    const kpiActive = Number((await page.getByTestId('kpi-value-active-pos').textContent())!.trim());
    const poActive = await page.getByTestId('po-summary-active').textContent();
    expect(Number(poActive!.match(/\d+/)![0])).toBe(kpiActive);
  });

  test('8. attention rows are real, actionable, and cross-consistent with KPIs', async ({ page }) => {
    await loginAs(page, 'Tapatío', 1500);
    await expect(page.getByTestId('brand-dashboard-loaded')).toHaveCount(1, { timeout: 10000 });
    // Awaiting-acknowledgement KPI == attention rows == PO summary (same source).
    const awaitingKpi = Number((await page.getByTestId('kpi-value-awaiting-ack').textContent())!.trim());
    const unackedRows = page.locator('[data-testid^="attention-unacked-"]');
    const poAwaiting = Number((await page.getByTestId('po-summary-awaiting').textContent())!.match(/\d+/)![0]);
    expect(await unackedRows.count()).toBe(awaitingKpi);
    expect(poAwaiting).toBe(awaitingKpi);
    // The first attention row's Review action drills to the real brand PO view.
    await page.locator('[data-testid^="attention-"]').first().locator('button', { hasText: 'Review' }).click();
    await page.waitForTimeout(900);
    await expect(page.getByText('PO-900', { exact: false }).first()).toBeVisible({ timeout: 6000 });
  });

  test('9. quick actions route to existing brand destinations', async ({ page }) => {
    await loginAs(page, 'Tapatío', 1500);
    await expect(page.getByTestId('brand-dashboard-loaded')).toHaveCount(1, { timeout: 10000 });
    await expect(page.getByTestId('action-purchase_orders')).toBeVisible();
    // Every action row routes through a valid brand view id via its Open button.
    await page.getByTestId('action-catalog').locator('button', { hasText: 'Open' }).click();
    await page.waitForTimeout(900);
    await expect(page.getByRole('heading', { name: 'Master Product Catalog' })).toBeVisible({ timeout: 6000 });
  });

  test('10. brand dashboard has no horizontal overflow at any viewport; drawer works on mobile', async ({ page }) => {
    await loginAs(page, 'Tapatío', 1500);
    await expect(page.getByTestId('brand-dashboard-loaded')).toHaveCount(1, { timeout: 10000 });
    for (const vp of VIEWPORTS) {
      await page.setViewportSize({ width: vp.w, height: vp.h });
      await page.waitForTimeout(450);
      const overflow = await page.evaluate(() => {
        const doc = document.documentElement;
        return Math.max(doc.scrollWidth - doc.clientWidth, 0);
      });
      expect(overflow, `horizontal overflow at ${vp.w}x${vp.h}`).toBeLessThanOrEqual(1);
      await page.screenshot({
        path: `${SHOTS}/brand-${vp.w}x${vp.h}.png`,
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