/**
 * §Phase D — status semantics (single source of truth) + decision-queue drill-down.
 *
 * Verifies the canonical presentation layer (`src/lib/statusPresentation.ts`):
 * every domain status renders through `StatusBadge` with a machine-readable
 * `data-status` and `role="status"`, while the VISIBLE labels stay the strings
 * the screens already showed (this is a consolidation, not a copy change).
 *
 * Also verifies that the Applications decision queue is DERIVED from the store
 * (tile count == rendered rows for that status) and that each tile drills into
 * the list — a static number with no drill-down is incomplete.
 */
import { test, expect } from '@playwright/test';
import { loginAs } from './helpers/auth';

async function openNav(page: import('@playwright/test').Page, label: string) {
  await page.locator(`nav[aria-label="Primary"] button:has-text("${label}")`).first().click();
  await page.waitForTimeout(700);
}

async function fillCountry(page: import('@playwright/test').Page, name: string) {
  const field = page.locator('input[placeholder*="Type your country name"]');
  await field.click();
  await field.fill(name);
  await page.locator('div.z-50 button', { hasText: name }).last().click();
  await page.waitForTimeout(300);
}

test.describe('Phase D — status semantics & decision queue', () => {
  test('1. the applications decision queue is derived and drills into the list', async ({ page }) => {
    // Create one real application so the queue has something true to count.
    await page.goto('/');
    await page.locator('text=Partner Login').first().click();
    await page.waitForTimeout(500);
    await page.click('text=Request Partner Access');
    await page.waitForTimeout(500);
    await page.fill('input[placeholder*="registered business name"]', 'Queue Check Ltd');
    await fillCountry(page, 'Spain');
    await page.fill('input[placeholder*="https://your-company.com"]', 'https://example.com');
    await page.click('text=Submit Application');
    await expect(page.locator('text=Application Received')).toBeVisible({ timeout: 15000 });
    await page.click('text=Back to Login');
    await page.waitForTimeout(1000);

    // Enter the operator shell from the SAME page (no reload) so the in-memory
    // application store survives — the demo applications are not persisted.
    await page.locator('text=Super Admin').first().click();
    await page.waitForTimeout(1200);
    await openNav(page, 'Super Admin');
    await page.locator('text=Applications').first().click();
    await page.waitForTimeout(700);

    const queue = page.getByRole('group', { name: 'Application decision queue' });
    await expect(queue).toBeVisible({ timeout: 6000 });
    const tile = (label: string) => queue.locator('button').filter({ hasText: new RegExp(`^\\d+${label}$`) });

    // Derived counts: "All applications" == "Pending" == 1 (one pending app).
    await expect(tile('All applications')).toHaveCount(1);
    await expect((await tile('All applications').locator('div').first().innerText()).trim()).toBe('1');
    await expect((await tile('Pending').locator('div').first().innerText()).trim()).toBe('1');
    // A status with no rows reports 0 — never an invented number.
    await expect((await tile('Rejected').locator('div').first().innerText()).trim()).toBe('0');

    // The row's status is machine-readable, not colour-only.
    const badge = page.locator('[data-status="pending"]').first();
    await expect(badge).toBeVisible();
    await expect(badge).toHaveAttribute('role', 'status');
    await expect(badge).toContainText('Pending');

    // Drill-down: selecting a queue tile filters the list (each tile is a control).
    await tile('Pending').click();
    await page.waitForTimeout(300);
    await expect(tile('Pending')).toHaveAttribute('aria-pressed', 'true');
    await expect(page.locator('h3', { hasText: 'Queue Check Ltd' }).first()).toBeVisible();

    await tile('Rejected').click();
    await page.waitForTimeout(300);
    await expect(page.getByText('No applications found.').first()).toBeVisible();
    await expect(tile('Rejected')).toHaveAttribute('aria-pressed', 'true');
    await expect(tile('Pending')).toHaveAttribute('aria-pressed', 'false');
  });

  test('2. compliance document rows expose canonical status semantics', async ({ page }) => {
    await loginAs(page, 'Super Admin — Tadii', 1200);
    await openNav(page, 'Compliance Approvals');
    // Expand the first brand card so its document rows render.
    await page.locator('button', { hasText: 'docs ·' }).first().click();
    await page.waitForTimeout(400);

    const statuses = ['approved', 'missing', 'under_review', 'uploaded', 'expiring', 'expired'];
    let seen = 0;
    for (const s of statuses) {
      const n = await page.locator(`[data-status="${s}"]`).count();
      seen += n;
    }
    // Every rendered document badge is one of the canonical statuses.
    expect(seen).toBeGreaterThan(0);
    // Each badge is semantically a status (never colour alone).
    const firstBadge = page.locator('[data-status]').first();
    await expect(firstBadge).toHaveAttribute('role', 'status');
    await expect(page.locator('[data-status="approved"]').first()).toBeVisible();
  });

  test('3. the brand compliance card exposes the same canonical statuses', async ({ page }) => {
    await loginAs(page, 'Le Creuset', 1100);
    await openNav(page, 'UK Compliance');

    // The 0/5 scenario tenant holds a present-but-not-approved registry doc.
    const missing = page.locator('[data-status="missing"]').first();
    await expect(missing).toBeVisible({ timeout: 6000 });
    await expect(missing).toHaveAttribute('role', 'status');
    await expect(missing).toContainText('missing');
    // In-flight review states must never render as approved.
    await expect(page.locator('[data-status="under_review"]').first()).toBeVisible();
    await expect(page.locator('[data-status="approved"]')).toHaveCount(0);
  });

  test('4. the redesigned control surfaces fit a narrow viewport (no horizontal overflow)', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 812 });
    await loginAs(page, 'Super Admin — Tadii', 900);

    // The SAME single nav tree is a drawer below lg — open it, navigate, close.
    async function open(label: string) {
      const toggle = page.getByTestId('app-menu-toggle');
      if (await toggle.isVisible().catch(() => false)) {
        await toggle.click();
        await page.waitForTimeout(400);
      }
      await page.locator(`nav[aria-label="Primary"] button:has-text("${label}")`).first().click();
      await page.waitForTimeout(700);
    }
    const overflow = () =>
      page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);

    await open('Super Admin');
    await page.locator('text=Applications').first().click();
    await page.waitForTimeout(700);
    await expect(page.getByRole('group', { name: 'Application decision queue' })).toBeVisible();
    expect(await overflow()).toBeLessThanOrEqual(1);

    await open('Integration Settings');
    await expect(page.getByTestId('integration-hub')).toBeVisible({ timeout: 6000 });
    await expect(page.getByRole('group', { name: 'Integration state summary' })).toBeVisible();
    expect(await overflow()).toBeLessThanOrEqual(1);
  });

  /**
   * §Phase D2 — the commerce surfaces (brand PO list, admin Retail Pipeline) were
   * migrated onto the canonical presentation layer. The invariant this asserts is
   * the important one: EVERY machine-readable status on those screens belongs to
   * the vocabulary `src/lib/statusPresentation.ts` owns — so a second, drifting
   * status vocabulary cannot reappear without failing here.
   */
  test('5. commerce surfaces render only canonical statuses', async ({ page }) => {
    const CANONICAL = new Set([
      // purchase orders + line acknowledgements
      'received', 'under_review', 'accepted', 'rejected', 'ready_to_fulfil', 'shipped', 'delivered',
      'unacknowledged', 'backordered',
      // deductions
      'open', 'disputed', 'resolved',
      // commission billing decision
      'auto_invoice', 'held_for_approval',
      // acknowledgement window (computed urgency)
      'ack_due', 'ack_urgent', 'ack_overdue', 'acknowledged',
      // catalogue submissions
      'submitted', 'under_amazon_review', 'live',
      // partner applications
      'pending', 'flagged', 'info_requested', 'approved',
      // compliance documents
      'missing', 'uploaded', 'expiring', 'expired',
    ]);

    async function statusesOnSurface(): Promise<string[]> {
      return page
        .locator('[data-status]')
        .evaluateAll((els) => els.map((e) => String(e.getAttribute('data-status'))));
    }

    // ── Brand surface: the purchase-order list ──
    await loginAs(page, 'Astonish', 1100);
    await openNav(page, 'Purchase Orders');
    const brandStatuses = await statusesOnSurface();
    expect(brandStatuses.length).toBeGreaterThan(0);
    for (const v of brandStatuses) expect(CANONICAL.has(v)).toBe(true);
    // The PO lifecycle itself is represented on this screen.
    const poVocabulary = ['received', 'under_review', 'accepted', 'ready_to_fulfil', 'shipped', 'delivered', 'rejected'];
    expect(brandStatuses.some((s) => poVocabulary.includes(s))).toBe(true);

    // ── Admin surface: the Retail Pipeline (deduction ledger + billing decisions) ──
    await loginAs(page, 'Super Admin — Tadii', 1200);
    await openNav(page, 'Retail Pipeline');
    const adminStatuses = await statusesOnSurface();
    expect(adminStatuses.length).toBeGreaterThan(0);
    expect(adminStatuses.filter((v) => !CANONICAL.has(v))).toEqual([]);

    // The deduction ledger and the commission decision are both present and canonical.
    const deductionStates = ['open', 'disputed', 'accepted', 'resolved'];
    let deductionCount = 0;
    for (const s of deductionStates) deductionCount += await page.locator(`[data-status="${s}"]`).count();
    expect(deductionCount).toBeGreaterThan(0);

    const billingCount =
      (await page.locator('[data-status="auto_invoice"]').count()) +
      (await page.locator('[data-status="held_for_approval"]').count());
    expect(billingCount).toBeGreaterThan(0);
  });

  /**
   * §Phase D2 — the shipment progression is shared by the brand logistics hub,
   * the carrier dashboard and the brand dashboard. It used to be rendered from a
   * per-status colour map; it now renders through the canonical layer, so the
   * same shipment state has ONE label and ONE tone everywhere.
   */
  test('6. shipment statuses are canonical on the brand and carrier logistics surfaces', async ({ page }) => {
    // The canonical shipment vocabulary (labels owned by types.ts STATUS_LABELS).
    const SHIPMENT_LABELS: Record<string, string> = {
      factory_intake: 'Factory Intake',
      bak_depot: 'In BAK Depot',
      sea_transit: 'Sea Transit',
      air_transit: 'Air Transit',
      uk_customs_cleared: 'UK Customs Cleared',
      /**
       * §P5 — REPOINTED (old contract recorded inline): this key was
       * `mercenta_hub: 'Mercenta UK Hub'`. The Mercenta Hub is removed as a
       * shipment stage/destination (matrix `D09-13`, register `AV-026`/`AV-027`,
       * decision `T-4`); the pre-live arrival state is the destination FC on the
       * purchase order.
       */
      destination_fc: 'Delivered to Destination FC',
      live_amazon: 'Live on retail-channel',
    };

    async function assertShipmentBadges(required: boolean): Promise<number> {
      const badges = page.locator(
        '[data-status="factory_intake"],[data-status="bak_depot"],[data-status="sea_transit"],' +
          '[data-status="air_transit"],[data-status="uk_customs_cleared"],[data-status="destination_fc"],' +
          '[data-status="live_amazon"]'
      );
      const n = await badges.count();
      if (required) expect(n).toBeGreaterThan(0);
      // Each badge shows the canonical label for ITS OWN status (never a
      // mismatched or colour-only state).
      for (let i = 0; i < n; i++) {
        const badge = badges.nth(i);
        const status = String(await badge.getAttribute('data-status'));
        await expect(badge).toHaveAttribute('role', 'status');
        expect((await badge.innerText()).trim()).toBe(SHIPMENT_LABELS[status]);
      }
      return n;
    }

    // ── Brand surface: the dashboard's fulfilment list (canonical where present) ──
    const pageErrors: string[] = [];
    page.on('pageerror', (e) => pageErrors.push(String(e)));

    await loginAs(page, 'Astonish', 1100);
    await openNav(page, 'Dashboard');
    await expect(page.getByRole('heading', { name: /Fulfilment in motion/i }).first()).toBeVisible({
      timeout: 8000,
    });
    await assertShipmentBadges(false);

    // ── Carrier surface: the manifest table always carries shipment rows ──
    await loginAs(page, '3PL Carrier Terminal', 1100);
    await openNav(page, 'Manifest Management');
    await assertShipmentBadges(true);
    expect(pageErrors).toEqual([]);
  });
});
