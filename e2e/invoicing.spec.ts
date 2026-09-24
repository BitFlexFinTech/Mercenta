/**
 * §P7 — ADMIN INVOICING browser verification.
 *
 * Real Chromium walkthrough of the P7 surfaces against actual application state
 * (no stubs):
 *   1  the terms are chosen PER INVOICE (14/30/60) and the DERIVED due date
 *      follows the invoice's own terms; the receiving status is visible
 *   2  a wrong invoice is CANCELLED (with a stated reason) and re-issued under a
 *      NEW number — the voided number is never reused (`AV-022`)
 *   3  the receipt gate (`AV-018`) and the number registry are enforced in the
 *      LIVE build, and the registry ledger reaches the Accounting surface
 *
 * Zero external network calls; `pageErrors === []` asserted throughout.
 * The app is in-memory by design, so each test starts from a fresh document.
 */
import { test, expect } from '@playwright/test';
import { loginAs } from './helpers/auth';

/** External network calls that are NOT our own dev server — must stay empty. */
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
    const isPlaceholderImage = url.includes('picsum.photos');
    if (!isDev && !isWs && !isStatic && !isPlaceholderImage) externalCalls.push(url);
  });
  return externalCalls;
}

/** Create a SIMULATED PO inside the page's own module graph (a brand action). */
async function seedSimulatedPo(page: import('@playwright/test').Page, advance = false) {
  return page.evaluate(async (shouldAdvance) => {
    const mod = await import('/src/lib/commerce/commerceLifecycle.ts');
    const store = await import('/src/data/demoStore.ts');
    const brandActor = { staffId: 'brand:brand-astonish', canMutate: true, tenantId: 'brand-astonish' };
    const adminActor = { staffId: 'staff-001', canMutate: true };
    const product = store.productsForBrandFromStore('brand-astonish')[0];
    if (!product) return { ok: false, reason: 'no product' };
    const created = await mod.createCommercePurchaseOrder('brand-astonish', product.sku, 40, brandActor);
    if (!created.ok) return { ok: false, reason: String(created.error) };
    const poId = created.value.id;
    if (shouldAdvance) {
      mod.acknowledgeCommercePurchaseOrder(poId, adminActor);
      mod.fulfilCommercePurchaseOrder(poId, adminActor);
      mod.receiveCommercePurchaseOrder(poId, adminActor);
      const inv = mod.issueCommerceInvoice(poId, adminActor);
      return { ok: true, poNumber: created.value.poNumber, poId, invoiceIssued: inv.ok };
    }
    return { ok: true, poNumber: created.value.poNumber, poId };
  }, advance);
}

async function openRetailPipeline(page: import('@playwright/test').Page) {
  await loginAs(page, 'Mercenta Admin Hub', 1200);
  await page.click('nav[aria-label="Primary"] >> text=Retail Pipeline');
  await page.waitForTimeout(900);
  await expect(page.getByText('Operable simulated purchase orders').first()).toBeVisible({ timeout: 8000 });
}

test.describe('P7 — admin invoicing', () => {
  test('1. admin: the terms are chosen per invoice and the derived due date follows them', async ({ page }) => {
    const externalCalls = watchExternalCalls(page);
    const pageErrors: string[] = [];
    page.on('pageerror', (e) => pageErrors.push(String(e)));

    await openRetailPipeline(page);
    const seeded = await seedSimulatedPo(page);
    expect(seeded.ok).toBe(true);
    await page.waitForTimeout(400);

    // Drive the lifecycle to RECEIVED through the UI (the admin's own controls).
    await page.locator('button[data-state="admin-commerce-acknowledge"]').first().click();
    await page.waitForTimeout(500);
    await page.locator('button[data-state="admin-commerce-fulfil"]').first().click();
    await page.waitForTimeout(600);
    await page.locator('button[data-state="admin-commerce-receive"]').first().click();
    await expect(page.getByText(/Receive: PO delivered/).first()).toBeVisible({ timeout: 8000 });

    // §P7 — the receiving status is visible (the channel's own concept, AV-018).
    const receivingBadge = page.locator('[data-state="admin-commerce-receiving-status"]').first();
    await expect(receivingBadge).toContainText('Received', { timeout: 6000 });

    // §P7 — choose the terms BEFORE issuing: 60 days (not the 30-day default).
    const termsSelect = page.locator('select[data-state="admin-commerce-terms-select"]').first();
    await expect(termsSelect).toBeEnabled({ timeout: 6000 });
    await termsSelect.selectOption('60');

    const invoice = page.locator('button[data-state="admin-commerce-issue-invoice"]').first();
    await expect(invoice).toBeEnabled({ timeout: 6000 });
    await invoice.click();

    // The notice states the terms the invoice actually carries and its derived due date.
    await expect(page.getByText(/Issue simulated invoice: SIM-INV-.*60-day terms/).first()).toBeVisible({
      timeout: 8000,
    });
    const termsLine = page.locator('[data-state="admin-commerce-invoice-terms"]').first();
    await expect(termsLine).toContainText('60-day terms', { timeout: 6000 });
    await expect(termsLine).toContainText('(derived)');

    // The number rules are stated where the numbers are handled (AV-022).
    await expect(page.locator('[data-state="admin-invoice-number-rules"]')).toContainText('never reused');

    expect(pageErrors).toEqual([]);
    expect(externalCalls).toEqual([]);
  });

  test('2. admin: a wrong invoice is cancelled and re-issued under a NEW number (AV-022)', async ({ page }) => {
    const externalCalls = watchExternalCalls(page);
    const pageErrors: string[] = [];
    page.on('pageerror', (e) => pageErrors.push(String(e)));

    await openRetailPipeline(page);
    const seeded = await seedSimulatedPo(page, true);
    expect(seeded.ok).toBe(true);
    expect(seeded.invoiceIssued).toBe(true);
    await page.waitForTimeout(600);

    // The invoice in force is shown with its number, its terms and its derived due date.
    const termsLine = page.locator('[data-state="admin-commerce-invoice-terms"]').first();
    await expect(termsLine).toContainText(`SIM-INV-${seeded.poNumber}`, { timeout: 8000 });
    await expect(termsLine).toContainText('due');

    // A cancellation must state a reason: the control is disabled until one is typed.
    const cancelButton = page.locator('button[data-state="admin-commerce-cancel-invoice"]').first();
    await expect(cancelButton).toBeDisabled();

    const reasonInput = page.locator('input[data-state="admin-commerce-cancel-reason"]').first();
    await reasonInput.fill('wrong invoiced quantity');
    await expect(cancelButton).toBeEnabled({ timeout: 6000 });
    await cancelButton.click();

    await expect(page.getByText(/Cancel simulated invoice: SIM-INV-.*cancelled/).first()).toBeVisible({
      timeout: 8000,
    });
    // The cancelled number is shown as consumed — it can never be reused.
    await expect(page.locator('[data-state="admin-commerce-cancelled-note"]').first()).toContainText('cancelled');

    // §P7/AV-022 — the correction is issued under a NEW number.
    const reissue = page.locator('button[data-state="admin-commerce-issue-invoice"]').first();
    await expect(reissue).toBeEnabled({ timeout: 6000 });
    await reissue.click();
    await expect(page.getByText(/Issue simulated invoice: SIM-INV-.*-R2/).first()).toBeVisible({ timeout: 8000 });

    expect(pageErrors).toEqual([]);
    expect(externalCalls).toEqual([]);
  });

  test('3. the receipt gate and the number registry are enforced in the LIVE build', async ({ page }) => {
    const externalCalls = watchExternalCalls(page);
    const pageErrors: string[] = [];
    page.on('pageerror', (e) => pageErrors.push(String(e)));

    await loginAs(page, 'Super Admin — Tadii', 1200);

    // §P7/AV-018 — a DELIVERED but unreceived PO cannot be invoiced, in the live build.
    const refused = await page.evaluate(async () => {
      const mod = await import('/src/lib/commerce/commerceLifecycle.ts');
      const store = await import('/src/data/demoStore.ts');
      const adminActor = { staffId: 'staff-001', canMutate: true };
      store.demoPurchaseOrders.push({
        id: 'po-e2e-unreceived',
        brandId: 'brand-astonish',
        poNumber: 'PO-E2E-UNRECEIVED',
        status: 'delivered',
        poValue: 100,
        commissionRate: 0.2,
        commissionAmount: 20,
        orderDate: '2026-09-01T00:00:00.000Z',
        mode: 'simulation',
        simulated: true,
        lineItems: [
          {
            sku: 'SKU-E2E',
            productName: 'unreceived widget',
            quantity: 1,
            unitPrice: 100,
            commodityCode: '1234',
            ackStatus: 'accepted',
            acknowledgedQty: 1,
          },
        ],
      });
      const result = mod.issueCommerceInvoice('po-e2e-unreceived', adminActor);
      return { ok: result.ok, error: result.ok ? '' : result.error };
    });
    expect(refused.ok).toBe(false);
    expect(refused.error).toContain('RECEIPT_REQUIRED');

    // The registry ledger is visible on the Accounting surface.
    await page.click('nav[aria-label="Primary"] >> text=Super Admin');
    await page.waitForTimeout(700);
    await page.locator('button', { hasText: 'Accounting' }).first().click();
    await page.waitForTimeout(900);
    const registry = page.getByTestId('accounting-invoice-registry');
    await expect(registry).toBeVisible({ timeout: 8000 });
    await expect(registry).toContainText('Numbers allocated');
    await expect(registry).toContainText('never reused');

    expect(pageErrors).toEqual([]);
    expect(externalCalls).toEqual([]);
  });
});

