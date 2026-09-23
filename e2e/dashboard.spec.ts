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
    /**
     * §P5 copy pass — REPOINTED (old contract recorded inline): this asserted the
     * h1 text `'Operations Overview'`. The page IS the OVERVIEW (observe) and
     * Operations is a separate destination directly beneath it in the shell, so the
     * header now reads `'Overview'`. The assertion keeps exactly its strength: the
     * page's own h1 must be rendered (exact text, so it cannot pass on a section
     * heading that merely contains the word).
     */
    await expect(page.getByRole('heading', { name: 'Overview', exact: true })).toBeVisible();
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

  test('3b. §P2 — the business position, volume band and new sections are ADDITIVE and cross-consistent', async ({ page }) => {
    await openAdminDashboard(page);
    /**
     * §P2 (Overview = observe, ADDITIVE ONLY) — the Founder's decision was that
     * every existing card STAYS and the business picture is ADDED. This test
     * therefore asserts both halves: the pre-P2 tiles are all still rendered, and
     * the new money/volume content exists and agrees with the header summary and
     * the canonical cost model on the SAME render (no pinned values, so it cannot
     * rot when the demo data changes).
     */
    // (a) every pre-P2 KPI tile is still rendered (nothing was removed).
    for (const id of [
      'pending-pos',
      'in-fulfilment',
      'docs-pending',
      'gate',
      'renewals',
      'tickets',
      'payouts-pending',
      'revenue',
      'contribution',
      'margin',
    ]) {
      await expect(page.getByTestId(`kpi-value-${id}`)).toBeVisible();
    }

    // (b) the new money row.
    await expect(page.getByTestId('kpi-value-open-po-value')).toHaveText(/^£[\d,]+$/);
    await expect(page.getByTestId('kpi-value-receivables')).toHaveText(/^£[\d,]+\.\d{2}$/);

    // (c) the new business-volume band, with real (non-fabricated) shapes.
    for (const id of [
      'brands',
      'products',
      'pos-count',
      'order-lines',
      'shipments',
      'volume',
      'upcoming-payments',
      'exceptions',
    ]) {
      await expect(page.getByTestId(`kpi-value-${id}`)).toBeVisible();
    }
    await expect(page.getByTestId('kpi-value-upcoming-payments')).toHaveText(/^£[\d,]+\.\d{2}$/);
    await expect(page.getByTestId('kpi-value-order-lines')).toHaveText(/^\d+$/);

    // (d) cross-consistency #1 — the PO tile equals the header's PO count.
    const header = await page.getByTestId('dashboard-loaded').innerText();
    const headerPos = /(\d+)\s+purchase orders/.exec(header);
    expect(headerPos, 'header must state the purchase-order count').not.toBeNull();
    expect(Number((await page.getByTestId('kpi-value-pos-count').textContent())!.trim())).toBe(
      Number(headerPos![1])
    );

    // (e) cross-consistency #2 — the Financial performance total equals the
    // revenue tile (both come from `operatingCostSummary()`), so a second
    // calculation cannot drift from the canonical one.
    const revenueTile = Number(
      (await page.getByTestId('kpi-value-revenue').textContent())!.replace(/[^0-9.-]/g, '')
    );
    const financeSection = page.locator('section[aria-label="Financial performance"]');
    await expect(financeSection).toBeVisible();
    const totalRow = await financeSection.locator('tfoot tr').first().innerText();
    expect(totalRow).toContain(`£${revenueTile.toLocaleString('en-GB')}`);

    // (f) cross-consistency #3 — the Logistics status distribution counts the
    // same consignments the shipments tile counts.
    const logisticsSection = page.locator('section[aria-label="Logistics status"]');
    await expect(logisticsSection).toBeVisible();
    const shipmentsTile = Number(
      (await page.getByTestId('kpi-value-shipments').textContent())!.trim()
    );
    const ringLabel = await logisticsSection
      .locator('svg[data-chart="doughnut"]')
      .getAttribute('aria-label');
    const ringTotal = (ringLabel ?? '')
      .replace(/^Shipments by status:/, '')
      .split(',')
      .reduce((sum, part) => sum + Number(part.trim().split(' ').pop() ?? 0), 0);
    expect(ringTotal, 'the status ring must account for every consignment').toBe(shipmentsTile);
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

  test('8. the brand action list lives in OPERATIONS; the overview only observes', async ({ page }) => {
    await loginAs(page, 'Tapatío', 1500);
    await expect(page.getByTestId('brand-dashboard-loaded')).toHaveCount(1, { timeout: 10000 });

    /**
     * §P2 (2026-09-22) — REPOINTED, not weakened.
     *
     * OLD CONTRACT: `attention rows are real, actionable, and cross-consistent with
     * KPIs` — the brand OVERVIEW had to carry the attention queue, and its
     * `attention-unacked-*` rows had to equal the awaiting-ack KPI.
     *
     * WHY IT MOVED: Overview = OBSERVE, Operations = ACT (the Founder's governing
     * principle). The Overview's queue was a SECOND action list beside the brand's
     * work layer, so it was removed — exactly as the admin Overview's was. The new
     * contract asserts the stronger, cross-surface invariant: the Overview carries
     * no action rows, its awaiting-ack KPI still agrees with the PO summary, and
     * the CANONICAL work derivation (Operations → Tasks & Deadlines) contains
     * precisely the PO-acknowledgement items the rendered work list shows.
     */
    const awaitingKpi = Number((await page.getByTestId('kpi-value-awaiting-ack').textContent())!.trim());
    const poAwaiting = Number((await page.getByTestId('po-summary-awaiting').textContent())!.match(/\d+/)![0]);
    expect(poAwaiting, 'KPI and PO summary derive from the same source').toBe(awaitingKpi);
    expect(awaitingKpi, 'the seeded demo must carry POs awaiting acknowledgement').toBeGreaterThan(0);

    // The overview no longer carries a second action list (positive absence).
    await expect(page.locator('[data-testid^="attention-"]')).toHaveCount(0);
    await expect(page.locator('[data-testid^="action-"]')).toHaveCount(0);
    await expect(page.locator('section[aria-label="Needs your attention"]')).toHaveCount(0);
    await expect(page.locator('text=Next actions')).toHaveCount(0);

    // The canonical derivation for THIS tenant (computed in-page from the same
    // module the app uses) is the reference the rendered work list must match.
    const canonicalAckItems = await page.evaluate(async () => {
      const work = await import('/src/lib/work/workStore.ts');
      const store = await import('/src/data/demoStore.ts');
      const brand = store.demoBrands.find((b) =>
        String(b.profile?.businessName ?? '').includes('Tapatío')
      );
      const items = work.getWorkItems('brand', brand?.id ?? null);
      return items.filter((i) => i.source === 'po_acknowledgement').length;
    });
    expect(canonicalAckItems, 'the work layer derives the brand’s PO acknowledgements').toBeGreaterThan(0);

    // Operations → Tasks & Deadlines is where the brand works them.
    await page.locator('nav[aria-label="Primary"]').getByText('Tasks & Deadlines').first().click();
    await page.waitForTimeout(1200);
    const ackRows = page.locator('[data-testid^="work-row-work-po_acknowledgement-"]');
    await expect(ackRows.first()).toBeVisible({ timeout: 8000 });
    expect(await ackRows.count()).toBe(canonicalAckItems);
    // …and the item hands the operator to the real PO surface.
    await expect(ackRows.first()).toContainText(/Acknowledge PO-/);
  });

  test('9. the overview duplicates no Operations destination; the destinations still route', async ({ page }) => {
    await loginAs(page, 'Tapatío', 1500);
    await expect(page.getByTestId('brand-dashboard-loaded')).toHaveCount(1, { timeout: 10000 });

    /**
     * §P2 — REPOINTED. OLD CONTRACT: `quick actions route to existing brand
     * destinations` (the `action-*` rail rows). Those rows were a second copy of
     * the Operations nav group, so they were removed. The routing invariant is
     * asserted on the destinations themselves: the nav rail still reaches the
     * Product Catalog, and the overview's own KPI drill-downs still reach their
     * owners.
     */
    await expect(page.locator('[data-testid^="action-"]')).toHaveCount(0);

    await page.locator('nav[aria-label="Primary"]').getByText('Product Catalog').first().click();
    await page.waitForTimeout(900);
    await expect(page.getByRole('heading', { name: 'Master Product Catalog' })).toBeVisible({ timeout: 6000 });

    // Back on the overview, a KPI drill-down still opens the owning surface.
    await page.locator('nav[aria-label="Primary"]').getByText('Dashboard').first().click();
    await expect(page.getByTestId('brand-dashboard-loaded')).toHaveCount(1, { timeout: 10000 });
    await page.getByTestId('kpi-open-payouts-due').click();
    await page.waitForTimeout(600);
    await expect(page.locator('#brand-payouts')).toBeVisible();
  });

  test('11. §P2 — the brand overview observes its earnings, and charts them honestly', async ({ page }) => {
    await loginAs(page, 'Tapatío', 1500);
    await expect(page.getByTestId('brand-dashboard-loaded')).toHaveCount(1, { timeout: 10000 });

    /**
     * §P2 — the brand's own earnings are the money row, and the brand gets its
     * first chart. Both are asserted against the SAME records the payout tiles
     * show, so a second calculation cannot drift:
     *   total earnings == payouts due (£ net owed) + payouts settled (£ net paid).
     */
    const earningsTotal = Number(
      (await page.getByTestId('kpi-value-earnings-total').textContent())!.replace(/[^0-9.]/g, '')
    );
    const dueContext = (await page.getByTestId('kpi-payouts-due').innerText()).match(/£([\d.]+)/);
    const settledContext = (await page.getByTestId('kpi-payouts-settled').innerText()).match(/£([\d.]+)/);
    expect(dueContext, 'payouts due must state its net value').not.toBeNull();
    expect(settledContext, 'payouts settled must state its net value').not.toBeNull();
    expect(earningsTotal).toBeCloseTo(
      Number(dueContext![1]) + Number(settledContext![1]),
      2
    );

    // The money row reads first, and the account row keeps every pre-P2 tile.
    await expect(page.getByTestId('kpi-value-open-po-value')).toHaveText(/^£[\d,]+$/);
    for (const id of ['active-pos', 'awaiting-ack', 'in-fulfilment', 'products-listed', 'out-of-stock', 'contract-status']) {
      await expect(page.getByTestId(`kpi-value-${id}`)).toBeVisible();
    }
    // The counts the removed action groups carried are still observed here.
    for (const id of ['open-deductions', 'open-tickets', 'returns-recorded', 'invoices-outstanding']) {
      await expect(page.getByTestId(`kpi-value-${id}`)).toBeVisible();
    }

    // The chart is either a REAL series summing to the total, or an honest empty
    // state naming the reason — never a fabricated shape.
    const chartSection = page.locator('section[aria-label="Earnings by month"]');
    await expect(chartSection).toBeVisible();
    const bars = chartSection.locator('svg[data-chart="bars"]');
    if ((await bars.count()) > 0) {
      const seriesLabel = await bars.first().getAttribute('aria-label');
      const seriesTotal = ((seriesLabel ?? '').match(/£([\d.]+)/g) ?? []).reduce(
        (sum, m) => sum + Number(m.replace(/[^0-9.]/g, '')),
        0
      );
      expect(seriesTotal).toBeCloseTo(earningsTotal, 1);
    } else {
      await expect(chartSection).toContainText('Not enough history to chart yet');
    }
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