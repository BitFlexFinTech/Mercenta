/**
 * §UI/UX Wave 2 COMPLETION (2026-09-18) — RecordDrawer + migrated-surface suite.
 *
 * Browser verification of the finish-and-fix pass:
 *   - the admin PO queue, the compliance queue, the returns queue and the brand
 *     PO queue all implement the established QUEUE → PREVIEW (RecordDrawer) →
 *     RECORD/ACT step over REAL existing record data;
 *   - the drawer's keyboard/escape contract holds;
 *   - the density control really changes rendering;
 *   - the Homepage Editor's new visibility/protection form persists through the
 *     draft → publish pipeline and renders on the public homepage.
 *
 * Zero external network calls are asserted, mirroring the other admin suites.
 */
import { test, expect } from '@playwright/test';
import { loginAs } from './helpers/auth';

function watchExternalCalls(page: import('@playwright/test').Page): string[] {
  const externalCalls: string[] = [];
  page.on('request', (req) => {
    const url = req.url();
    const isDev = url.startsWith('http://localhost') || url.startsWith('http://127.0.0.1');
    const isWs = url.startsWith('ws://') || url.startsWith('wss://');
    const isStatic =
      /\.(woff2?|css|png|jpe?g|svg|ico)(\?|$)/.test(url) ||
      url.includes('gstatic.com') ||
      url.includes('fonts.g');
    if (!isDev && !isWs && !isStatic) externalCalls.push(url);
  });
  return externalCalls;
}

test.describe('RecordDrawer — admin purchase-order queue', () => {
  test('1. queue → preview drawer → full record → close, over real PO data', async ({ page }) => {
    const externalCalls = watchExternalCalls(page);
    const pageErrors: string[] = [];
    page.on('pageerror', (e) => pageErrors.push(String(e)));

    await loginAs(page, 'Mercenta Admin Hub', 1100);
    await page.click('nav[aria-label="Primary"] >> text=Purchase Orders');
    await page.waitForTimeout(900);

    const previewBtn = page.locator('[data-testid^="po-preview-"]').first();
    await expect(previewBtn).toBeVisible({ timeout: 8000 });
    const poId = (await previewBtn.getAttribute('data-testid'))!.replace('po-preview-', '');
    await previewBtn.click();

    const drawer = page.getByTestId('po-record-drawer');
    await expect(drawer).toBeVisible({ timeout: 6000 });
    // The drawer carries the REAL record identity (the PO number of the row).
    const rowText = await page
      .locator(`[data-testid="po-preview-${poId}"]`)
      .evaluate((el) => (el.closest('div[data-density]') as HTMLElement | null)?.textContent ?? '');
    const poNumber = (rowText.match(/PO-\d+/) ?? [''])[0];
    expect(poNumber).not.toBe('');
    await expect(drawer).toContainText(poNumber);

    // Escape closes the drawer.
    await page.keyboard.press('Escape');
    await expect(page.getByTestId('po-record-drawer')).toHaveCount(0);

    // Re-open and hand off to the EXISTING full record page.
    await previewBtn.click();
    await expect(page.getByTestId('po-record-drawer')).toBeVisible({ timeout: 6000 });
    await page.locator('[data-state="po-drawer-open-record"]').click();
    await expect(page.getByRole('heading', { name: poNumber }).first()).toBeVisible({ timeout: 6000 });

    expect(pageErrors).toEqual([]);
    expect(externalCalls).toEqual([]);
  });

  test('2. the density control changes the real rendered row padding', async ({ page }) => {
    await loginAs(page, 'Mercenta Admin Hub', 1100);
    await page.click('nav[aria-label="Primary"] >> text=Purchase Orders');
    await page.waitForTimeout(900);

    const row = page.locator('div[data-density]').first();
    await expect(row).toBeVisible({ timeout: 8000 });
    await expect(row).toHaveAttribute('data-density', 'compact');
    const compactPad = await row.evaluate((el) => getComputedStyle(el).paddingTop);

    await page.getByRole('tab', { name: 'Comfortable' }).first().click();
    await page.waitForTimeout(300);
    await expect(row).toHaveAttribute('data-density', 'comfortable');
    const comfortablePad = await row.evaluate((el) => getComputedStyle(el).paddingTop);
    expect(comfortablePad).not.toBe(compactPad);
  });

  test('3. the simulated-only filter really filters', async ({ page }) => {
    await loginAs(page, 'Mercenta Admin Hub', 1100);
    await page.click('nav[aria-label="Primary"] >> text=Purchase Orders');
    await page.waitForTimeout(900);

    const filter = page.getByTestId('po-sim-filter');
    await expect(filter).toHaveAttribute('aria-pressed', 'false');
    await filter.click();
    await page.waitForTimeout(300);
    await expect(filter).toHaveAttribute('aria-pressed', 'true');
    // Every remaining row is a simulated record (the canonical flag is the only
    // thing that can put "(sim)" on a row).
    const rows = page.locator('div[data-density]');
    const n = await rows.count();
    for (let i = 0; i < n; i++) {
      await expect(rows.nth(i)).toContainText('(sim)');
    }
  });
});

test.describe('RecordDrawer — compliance + returns queues', () => {
  test('4. compliance document preview drawer shows the real record', async ({ page }) => {
    const externalCalls = watchExternalCalls(page);
    await loginAs(page, 'Mercenta Admin Hub', 1100);
    await page.click('nav[aria-label="Primary"] >> text=Compliance Approvals');
    await page.waitForTimeout(1000);

    await page.locator('[data-testid="compliance-brand-card"] button').first().click();
    await page.waitForTimeout(400);

    const preview = page.locator('[data-state^="doc-preview-"]').first();
    await expect(preview).toBeVisible({ timeout: 6000 });
    await preview.click();

    const drawer = page.getByTestId('doc-record-drawer');
    await expect(drawer).toBeVisible({ timeout: 6000 });
    await expect(drawer).toContainText('Version');
    await page.keyboard.press('Escape');
    await expect(page.getByTestId('doc-record-drawer')).toHaveCount(0);

    expect(externalCalls).toEqual([]);
  });

  test('5. returns row click opens the preview drawer and Advance is real', async ({ page }) => {
    const pageErrors: string[] = [];
    page.on('pageerror', (e) => pageErrors.push(String(e)));

    await loginAs(page, 'Mercenta Admin Hub', 1100);
    await page.click('nav[aria-label="Primary"] >> text=Returns Tracking');
    await page.waitForTimeout(900);

    const firstRow = page.locator('table tbody tr').first();
    await expect(firstRow).toBeVisible({ timeout: 8000 });
    await firstRow.click();

    const drawer = page.getByTestId('return-record-drawer');
    await expect(drawer).toBeVisible({ timeout: 6000 });
    await expect(drawer).toContainText('Stage timeline');

    const advance = page.locator('[data-state="return-drawer-advance"]');
    if (await advance.isVisible()) {
      const before = await drawer.textContent();
      await advance.click();
      await page.waitForTimeout(600);
      const after = await drawer.textContent();
      // A real stage transition changed the record the drawer is reading.
      expect(after).not.toBe(before);
    }
    expect(pageErrors).toEqual([]);
  });
});

test.describe('RecordDrawer — brand purchase-order queue', () => {
  test('6. brand sees its OWN PO record in the drawer (tenant-scoped)', async ({ page }) => {
    const externalCalls = watchExternalCalls(page);
    const pageErrors: string[] = [];
    page.on('pageerror', (e) => pageErrors.push(String(e)));

    await loginAs(page, 'Astonish', 1100);
    await page.click('nav[aria-label="Primary"] >> text=Purchase Orders');
    await page.waitForTimeout(900);

    const preview = page.locator('[data-state^="brand-po-preview-"]').first();
    await expect(preview).toBeVisible({ timeout: 8000 });
    await preview.click();

    const drawer = page.getByTestId('brand-po-record-drawer');
    await expect(drawer).toBeVisible({ timeout: 6000 });
    // Astonish's seed POs are PO-9000 / PO-9001; a cross-tenant PO number must
    // never appear in a brand-owned record drawer.
    await expect(drawer).toContainText(/PO-9000|PO-9001/);
    await expect(drawer).not.toContainText(/PO-9002|PO-9003/);

    await page.keyboard.press('Escape');
    await expect(page.getByTestId('brand-po-record-drawer')).toHaveCount(0);

    expect(pageErrors).toEqual([]);
    expect(externalCalls).toEqual([]);
  });
});

test.describe('Homepage Editor — visibility & protection', () => {
  test('7. edits the new sections, publishes, and the public homepage reflects it', async ({ page }) => {
    const pageErrors: string[] = [];
    page.on('pageerror', (e) => pageErrors.push(String(e)));

    await loginAs(page, 'Super Admin — Tadii', 1000);
    await page.click('nav[aria-label="Primary"] >> text=Super Admin');
    await page.waitForTimeout(700);
    await page.click('text=Homepage Editor');
    await page.waitForTimeout(900);

    await expect(page.locator('text=Every section of the public homepage').first()).toBeVisible({ timeout: 6000 });

    const marker = 'Visibility marker — finish pass';
    await page.getByLabel('Section heading').first().fill(marker);
    await page.waitForTimeout(200);

    // Revert discards the in-form edit and re-reads the persisted copy.
    await page.locator('[data-state="homepage-editor-revert"]').click();
    await page.waitForTimeout(700);
    await expect(page.getByLabel('Section heading').first()).not.toHaveValue(marker);

    // Edit again and publish.
    await page.getByLabel('Section heading').first().fill(marker);
    await page.waitForTimeout(200);
    await page.getByRole('button', { name: /^Publish/ }).click();
    await expect(page.locator('text=Published to live homepage')).toBeVisible({ timeout: 8000 });

    // The already-mounted public homepage reflects the published copy.
    await page.getByTitle('Back to homepage').click();
    await page.waitForTimeout(1200);
    await expect(page.getByText(marker).first()).toBeVisible({ timeout: 6000 });

    expect(pageErrors).toEqual([]);
  });

  test('8. banned wording in the new sections blocks publishing', async ({ page }) => {
    await loginAs(page, 'Super Admin — Tadii', 1000);
    await page.click('nav[aria-label="Primary"] >> text=Super Admin');
    await page.waitForTimeout(700);
    await page.click('text=Homepage Editor');
    await page.waitForTimeout(900);
    await expect(page.locator('text=Every section of the public homepage').first()).toBeVisible({ timeout: 6000 });

    await page.getByLabel('Section heading').first().fill('Sell on Amazon today');
    await page.waitForTimeout(400);
    await expect(page.locator('text=Unsafe wording blocks saving').first()).toBeVisible({ timeout: 5000 });
    await expect(page.getByRole('button', { name: /^Publish/ })).toBeDisabled();
  });
});



test.describe('Migrated surfaces — responsive + no horizontal overflow', () => {
  const VIEWPORTS = [
    { w: 1440, h: 900 },
    { w: 1280, h: 800 },
    { w: 1024, h: 768 },
    { w: 390, h: 844 },
  ];
  const ADMIN_SURFACES = ['Purchase Orders', 'Compliance Approvals', 'Returns Tracking'];

  for (const vp of VIEWPORTS) {
    test(`9. admin record queues at ${vp.w}x${vp.h} — no horizontal overflow`, async ({ page }) => {
      /**
       * §E2E-4 — MEASURED BUDGET FIX (a defect found by this session's E2E-4 browser
       * leg, fixed at source). This test walks THREE admin surfaces, and at 390x844
       * each one first needs the off-canvas nav opened. MEASURED 2026-10-08: in
       * isolation it consumes ~28s of Playwright's 30s default, so under the suite's
       * normal parallel load it timed out at the mobile viewport while the other
       * three viewports passed in the SAME run — i.e. it was flaky by construction.
       * The budget is raised for THIS test only. NOT ONE ASSERTION IS CHANGED: the
       * same three surfaces are walked at the same four viewports and the same
       * `scrollWidth - clientWidth <= 1` rule is applied to each.
       */
      test.setTimeout(90_000);
      await page.setViewportSize({ width: vp.w, height: vp.h });
      await loginAs(page, 'Mercenta Admin Hub', 1100);

      // Below `lg` the SAME single nav tree is an off-canvas drawer — open it with
      // the canonical toggle, navigate, then assert the composed layout.
      async function openNav(label: string) {
        const toggle = page.getByTestId('app-menu-toggle');
        if (await toggle.isVisible().catch(() => false)) {
          await toggle.click();
          await page.waitForTimeout(400);
        }
        await page.locator(`nav[aria-label="Primary"] button:has-text("${label}")`).first().click();
        await page.waitForTimeout(900);
      }

      for (const surface of ADMIN_SURFACES) {
        await openNav(surface);
        // The workspace composed without pushing the document wider than the viewport.
        const overflow = await page.evaluate(
          () => document.documentElement.scrollWidth - document.documentElement.clientWidth
        );
        expect(overflow, `${surface} @ ${vp.w}px`).toBeLessThanOrEqual(1);
      }
    });
  }

  test('10. brand PO queue + drawer at 390x844 (single-column, no overflow)', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await loginAs(page, 'Astonish', 1100);
    const toggle = page.getByTestId('app-menu-toggle');
    if (await toggle.isVisible().catch(() => false)) {
      await toggle.click();
      await page.waitForTimeout(400);
    }
    await page.locator('nav[aria-label="Primary"] button:has-text("Purchase Orders")').first().click();
    await page.waitForTimeout(900);

    const overflow = await page.evaluate(
      () => document.documentElement.scrollWidth - document.documentElement.clientWidth
    );
    expect(overflow).toBeLessThanOrEqual(1);

    const preview = page.locator('[data-state^="brand-po-preview-"]').first();
    await expect(preview).toBeVisible({ timeout: 8000 });
    await preview.click();
    const drawer = page.getByTestId('brand-po-record-drawer');
    await expect(drawer).toBeVisible({ timeout: 6000 });
    // The drawer itself never exceeds the viewport at mobile width. The repo's
    // established tolerance for pixel comparisons is 1px (see the
    // `overflow <= 1` convention the other responsive specs use) — a
    // sub-pixel layout value must not read as a real overflow.
    const box = await drawer.boundingBox();
    expect(box!.width).toBeLessThanOrEqual(390 + 1);
    await page.keyboard.press('Escape');
    await expect(page.getByTestId('brand-po-record-drawer')).toHaveCount(0);
  });
});
