/**
 * §Phase E5 — Admin operational surfaces browser verification.
 *
 * Real Chromium walkthrough of the NEW/CHANGED admin surfaces:
 *   G1  an authorised ADMIN operates the E1–E4 lifecycle from the UI
 *   G5  the dashboard shows canonical-derived attention rows
 *   G6  Logistics Control links a shipment to its real PO (defect fixed)
 *   G7  commerce notifications are surfaced with truthful provenance
 *   G3/G4 RBAC + tenant isolation are enforced IN THE DOMAIN, and a refusal
 *       mutates nothing
 *
 * Zero external network calls; `pageErrors === []` asserted throughout.
 * The app is in-memory by design, so each test starts from a fresh document.
 */
import { test, expect } from '@playwright/test';
import { loginAs, openLogin } from './helpers/auth';

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

test.describe('E5 — admin operational surfaces', () => {
  test('1. G1 — an authorised admin operates the simulated lifecycle from the UI', async ({ page }) => {
    const externalCalls = watchExternalCalls(page);
    const pageErrors: string[] = [];
    page.on('pageerror', (e) => pageErrors.push(String(e)));

    await loginAs(page, 'Mercenta Admin Hub', 1200);

    const seeded = await seedSimulatedPo(page);
    expect(seeded.ok).toBe(true);

    await page.click('nav[aria-label="Primary"] >> text=Retail Pipeline');
    await page.waitForTimeout(900);
    await expect(page.getByRole('heading', { name: 'Retail Pipeline' })).toBeVisible({ timeout: 8000 });

    // The operable row is present and visibly simulated.
    await expect(page.getByText('Operable simulated purchase orders').first()).toBeVisible({ timeout: 6000 });

    const ack = page.locator('button[data-state="admin-commerce-acknowledge"]').first();
    await expect(ack).toBeEnabled({ timeout: 6000 });
    await ack.click();
    await expect(page.getByText(/Acknowledge: PO-SIM-BRAND-ASTONISH/).first()).toBeVisible({ timeout: 8000 });

    const fulfil = page.locator('button[data-state="admin-commerce-fulfil"]').first();
    await expect(fulfil).toBeEnabled({ timeout: 6000 });
    await fulfil.click();
    await expect(page.getByText(/Fulfil: shipment-/).first()).toBeVisible({ timeout: 8000 });

    const receive = page.locator('button[data-state="admin-commerce-receive"]').first();
    await expect(receive).toBeEnabled({ timeout: 6000 });
    await receive.click();
    await expect(page.getByText(/Receive: PO delivered/).first()).toBeVisible({ timeout: 8000 });

    const invoice = page.locator('button[data-state="admin-commerce-issue-invoice"]').first();
    await expect(invoice).toBeEnabled({ timeout: 6000 });
    await invoice.click();
    await expect(page.getByText(/Issue simulated invoice: SIM-INV-/).first()).toBeVisible({ timeout: 8000 });

    const pay = page.locator('button[data-state="admin-commerce-record-payment"]').first();
    await expect(pay).toBeEnabled({ timeout: 6000 });
    await pay.click();
    await expect(page.getByText(/Record simulated payment: £/).first()).toBeVisible({ timeout: 8000 });

    // G8 — the operational case opens on the existing helpdesk model.
    const openCase = page.locator('button[data-state="admin-commerce-open-case"]').first();
    await expect(openCase).toBeEnabled({ timeout: 6000 });
    await openCase.click();
    await expect(page.getByText(/Open case: case tkt-/).first()).toBeVisible({ timeout: 8000 });

    // The canonical activity trail is rendered by the SAME admin surface.
    await expect(page.getByText(/Simulated invoices \(/).first()).toBeVisible({ timeout: 6000 });
    await expect(page.getByText(/SIMULATED/).first()).toBeVisible({ timeout: 6000 });

    expect(pageErrors).toEqual([]);
    expect(externalCalls).toEqual([]);
  });

  test('2. G5 + G7 — canonical dashboard attention rows and a commerce notification', async ({ page }) => {
    const externalCalls = watchExternalCalls(page);
    const pageErrors: string[] = [];
    page.on('pageerror', (e) => pageErrors.push(String(e)));

    await loginAs(page, 'Mercenta Admin Hub', 1200);
    await expect(page.getByTestId('dashboard-loaded')).toBeVisible({ timeout: 10000 });

    // G5 — the rejected catalog submission (canonical E3 state) surfaces as an
    // ADDITIVE attention row: REJECTED, with truthful (sim) provenance.
    const subRow = page.locator('[data-testid^="attention-sub-"]').first();
    await expect(subRow).toBeVisible({ timeout: 8000 });
    await expect(subRow).toContainText('REJECTED');
    await expect(subRow).toContainText('(sim)');

    // Existing PO attention rows keep their ids (no regression).
    await expect(page.locator('[data-testid^="attention-po-"]').first()).toBeVisible({ timeout: 6000 });

    // G7 — an issued, unpaid SIMULATED invoice must appear in the bell.
    const seeded = await seedSimulatedPo(page, true);
    expect(seeded.ok).toBe(true);

    await page.locator('button[aria-label^="Notifications"]').first().click();
    await page.waitForTimeout(500);
    await expect(page.getByText(/Simulated invoice SIM-INV-.*awaiting payment/).first()).toBeVisible({ timeout: 8000 });
    await expect(page.getByText(/no live payment provider contacted/).first()).toBeVisible({ timeout: 6000 });

    expect(pageErrors).toEqual([]);
    expect(externalCalls).toEqual([]);
  });

  test('3. G6 — Logistics Control links each shipment to its real PO', async ({ page }) => {
    const externalCalls = watchExternalCalls(page);
    const pageErrors: string[] = [];
    page.on('pageerror', (e) => pageErrors.push(String(e)));

    /**
     * NOTE (pre-existing demo-data condition, NOT an E5 defect): the SEEDED
     * `demoShipments` array is empty because `SHIPMENT_STATUS_BY_PO` only maps
     * `ready_to_fulfil | shipped | delivered` and no seeded PO carries those
     * statuses, so Logistics Control has no rows until a shipment is created at
     * runtime.
     *
     * The shipments query caches a COPY (`queryOrSeed` → `seed.slice()`) with a
     * 30s `staleTime`, so the shipment must exist BEFORE the admin shell's first
     * fetch. We therefore load the app, drive the canonical lifecycle
     * (acknowledge → fulfil) while still OUTSIDE the admin shell, and only then
     * enter it.
     */
    await openLogin(page);
    const seeded = await seedSimulatedPo(page, true);
    expect(seeded.ok).toBe(true);
    await page.click('text=Mercenta Admin Hub');
    await page.waitForTimeout(1200);

    await page.click('nav[aria-label="Primary"] >> text=Logistics Control');
    await page.waitForTimeout(900);
    await expect(page.getByRole('heading', { name: 'Logistics Control' })).toBeVisible({ timeout: 8000 });

    // REAL DEFECT FIXED: the PO column used to render “—” for every row because a
    // shipment id was looked up against PO ids. It now shows the canonical
    // `poNumber` of the shipment.
    await expect(page.locator('td').filter({ hasText: /PO-SIM-BRAND-ASTONISH/ }).first()).toBeVisible({ timeout: 8000 });
    await expect(page.locator('td').filter({ hasText: /^—$/ })).toHaveCount(0);

    expect(pageErrors).toEqual([]);
    expect(externalCalls).toEqual([]);
  });

  test('4. G3/G4 — RBAC + tenant isolation are enforced IN THE DOMAIN and refuse without mutating', async ({ page }) => {
    const externalCalls = watchExternalCalls(page);
    const pageErrors: string[] = [];
    page.on('pageerror', (e) => pageErrors.push(String(e)));

    await loginAs(page, 'Mercenta Admin Hub', 1200);
    await page.click('nav[aria-label="Primary"] >> text=Retail Pipeline');
    await page.waitForTimeout(900);

    /**
     * Call the REAL domain with a VIEW-ONLY actor and with a FOREIGN tenant
     * actor, against an operational PO this application graph owns. Both must be
     * refused, and a refusal must not change the PO status or the trail.
     */
    const proof = await page.evaluate(async () => {
      const mod = await import('/src/lib/commerce/commerceLifecycle.ts');
      const store = await import('/src/data/demoStore.ts');
      const api = await import('/src/data/api.ts');

      const brandActor = { staffId: 'brand:brand-astonish', canMutate: true, tenantId: 'brand-astonish' };
      let po = store.demoPurchaseOrders.find((p) => p.brandId === 'brand-astonish' && p.simulated === true);
      if (!po) {
        const seed = store.productsForBrandFromStore('brand-astonish')[0];
        if (!seed) return { skipped: true };
        const created = await mod.createCommercePurchaseOrder('brand-astonish', seed.sku, 5, brandActor);
        po = created.ok ? created.value : undefined;
      }
      if (!po) return { skipped: true };

      const viewOnlyActor = { staffId: 'staff-005', canMutate: false, tenantId: 'brand-astonish' };
      const foreignActor = { staffId: 'brand:brand-tapatio', canMutate: true, tenantId: 'brand-tapatio' };

      const actsBefore = store.getCommerceActivitiesForBrand('brand-astonish').length;
      const statusBefore = api.fetchPurchaseOrder(po.id).status;

      const viewOnlyRes = mod.acknowledgeCommercePurchaseOrder(po.id, viewOnlyActor);
      const foreignRes = mod.acknowledgeCommercePurchaseOrder(po.id, foreignActor);

      return {
        skipped: false,
        viewOnlyOk: viewOnlyRes.ok,
        viewOnlyError: String(viewOnlyRes.error ?? ''),
        foreignOk: foreignRes.ok,
        foreignError: String(foreignRes.error ?? ''),
        actsUnchanged: store.getCommerceActivitiesForBrand('brand-astonish').length === actsBefore,
        statusUnchanged: api.fetchPurchaseOrder(po.id).status === statusBefore,
      };
    });

    expect(proof.skipped).toBe(false);
    expect(proof.viewOnlyOk).toBe(false);
    expect(proof.viewOnlyError).toContain('FORBIDDEN');
    expect(proof.foreignOk).toBe(false);
    expect(proof.foreignError).toContain('CROSS_TENANT');
    // A refusal MUST NOT mutate state.
    expect(proof.actsUnchanged).toBe(true);
    expect(proof.statusUnchanged).toBe(true);

    expect(pageErrors).toEqual([]);
    expect(externalCalls).toEqual([]);
  });
});
