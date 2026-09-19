/**
 * §Phase E6 — Brand operational surfaces browser verification (real Chromium).
 *
 *   A  brand PO list shows "(sim)" for a simulated PO
 *   B  existing PO controls still work and their DOM order is NOT broken
 *   C  brand dashboard shows the canonical commerce attention state
 *   D  simulated deduction attention shows "(sim)"
 *   E  a simulated deduction notification shows "(sim)"
 *   F  the E3 catalog behaviour is intact
 *   G  a resubmission resolves to the canonically latest submission
 *   H  tenant isolation (another brand sees none of it)
 *   I  domain-level refusal for a foreign tenant / unauthorised actor
 *   J  refusal immutability (nothing mutates)
 *   K  pageErrors === []
 *   L  externalCalls === []
 *
 * The app is in-memory, so each test starts from a fresh document. Domain state
 * is seeded through the REAL lifecycle inside the page's module graph (no stubs).
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

/**
 * Seed canonical brand commerce state through the REAL lifecycle, BEFORE the
 * shell mounts: React Query caches a COPY of the seed (`queryOrSeed` →
 * `seed.slice()`) with a 30s staleTime, so records created after the shell's
 * first fetch would not be visible.
 */
async function seedBrandCommerce(
  page: import('@playwright/test').Page,
  opts: { advance?: boolean; raiseException?: boolean } = {}
) {
  return page.evaluate(async (o) => {
    const mod = await import('/src/lib/commerce/commerceLifecycle.ts');
    const store = await import('/src/data/demoStore.ts');
    const brandActor = { staffId: 'brand:brand-astonish', canMutate: true, tenantId: 'brand-astonish' };
    const product = store.productsForBrandFromStore('brand-astonish')[0];
    if (!product) return { ok: false, reason: 'no product' };
    const created = await mod.createCommercePurchaseOrder('brand-astonish', product.sku, 40, brandActor);
    if (!created.ok) return { ok: false, reason: String(created.error) };
    const poId = created.value.id;
    if (o.advance) {
      mod.acknowledgeCommercePurchaseOrder(poId, brandActor);
      mod.fulfilCommercePurchaseOrder(poId, brandActor);
      mod.receiveCommercePurchaseOrder(poId, brandActor);
      mod.issueCommerceInvoice(poId, brandActor);
    }
    if (o.raiseException) {
      mod.raiseCommerceException(poId, 'shortage_claim', 12.5, 'E6 browser simulated exception', brandActor);
    }
    return { ok: true, poNumber: created.value.poNumber, poId };
  }, opts);
}

const ZAMBEZI = 'Astonish';

test.describe('E6 — brand operational surfaces', () => {
  test('1. A+B — the brand PO list shows canonical (sim) provenance without breaking existing controls', async ({ page }) => {
    const externalCalls = watchExternalCalls(page);
    const pageErrors: string[] = [];
    page.on('pageerror', (e) => pageErrors.push(String(e)));

    await openLogin(page);
    const seeded = await seedBrandCommerce(page);
    expect(seeded.ok).toBe(true);
    await page.click(`text=${ZAMBEZI}`);
    await page.waitForTimeout(1200);

    await page.locator('nav[aria-label="Primary"]').getByText('Purchase Orders').first().click();
    await page.waitForTimeout(900);

    // A — the simulated PO is present and visibly simulated.
    await expect(page.getByText(String(seeded.poNumber)).first()).toBeVisible({ timeout: 8000 });
    await expect(page.getByText('(sim)').first()).toBeVisible({ timeout: 6000 });

    // B — the FIRST "Acknowledge" control is still the existing PO control (not the
    // E4 console's), so the established per-line ack flow still opens.
    const ack = page.locator('button', { hasText: 'Acknowledge' }).first();
    await expect(ack).toBeEnabled({ timeout: 6000 });
    await ack.click();
    await expect(page.getByText('Submit acknowledgment').first()).toBeVisible({ timeout: 6000 });

    expect(pageErrors).toEqual([]);
    expect(externalCalls).toEqual([]);
  });

  test('2. C+D — the brand dashboard surfaces canonical commerce attention with (sim) provenance', async ({ page }) => {
    const externalCalls = watchExternalCalls(page);
    const pageErrors: string[] = [];
    page.on('pageerror', (e) => pageErrors.push(String(e)));

    await openLogin(page);
    const seeded = await seedBrandCommerce(page, { advance: true, raiseException: true });
    expect(seeded.ok).toBe(true);
    await page.click(`text=${ZAMBEZI}`);
    await expect(page.getByTestId('brand-dashboard-loaded')).toHaveCount(1, { timeout: 10000 });

    // C — the issued-unpaid simulated invoice is surfaced, canonically derived.
    const invoiceRow = page.locator('[data-testid^="attention-commerce-inv-"]').first();
    await expect(invoiceRow).toBeVisible({ timeout: 8000 });
    await expect(invoiceRow).toContainText('SIM INVOICE DUE');
    await expect(invoiceRow).toContainText('(sim)');
    await expect(invoiceRow).toContainText('no live payment provider contacted');

    // D — the simulated deduction attention row carries canonical provenance.
    const dedRow = page.locator('[data-testid^="attention-deduction-"]').first();
    await expect(dedRow).toBeVisible({ timeout: 6000 });
    await expect(dedRow).toContainText('(sim)');

    // Regression guard: the existing attention ordering (and its pinned FIRST
    // row) is unchanged — the new groups were appended.
    const firstId = await page.locator('[data-testid^="attention-"]').first().getAttribute('data-testid');
    expect(firstId).toMatch(/^attention-unacked-/);

    expect(pageErrors).toEqual([]);
    expect(externalCalls).toEqual([]);
  });

  test('3. E — a simulated deduction notification carries (sim)', async ({ page }) => {
    const externalCalls = watchExternalCalls(page);
    const pageErrors: string[] = [];
    page.on('pageerror', (e) => pageErrors.push(String(e)));

    await openLogin(page);
    const seeded = await seedBrandCommerce(page, { raiseException: true });
    expect(seeded.ok).toBe(true);
    await page.click(`text=${ZAMBEZI}`);
    await page.waitForTimeout(1200);

    await page.locator('button[aria-label^="Notifications"]').first().click();
    await page.waitForTimeout(500);

    const dedNotif = page
      .locator('button')
      .filter({ hasText: 'Deduction' })
      .filter({ hasText: '(sim)' })
      .first();
    await expect(dedNotif).toBeVisible({ timeout: 8000 });

    expect(pageErrors).toEqual([]);
    expect(externalCalls).toEqual([]);
  });

  test('4. F+G — the E3 catalog surface is intact and a resubmission resolves to the canonical latest', async ({ page }) => {
    const externalCalls = watchExternalCalls(page);
    const pageErrors: string[] = [];
    page.on('pageerror', (e) => pageErrors.push(String(e)));

    await loginAs(page, ZAMBEZI, 1200);
    await page.locator('nav[aria-label="Primary"]').getByText('Product Catalog').first().click();
    await page.waitForTimeout(900);

    // F — the existing E3 readiness surface is intact.
    await expect(page.getByText('Catalog readiness').first()).toBeVisible({ timeout: 8000 });
    await expect(page.getByText('all product information complete').first()).toBeVisible({ timeout: 6000 });

    // G — resubmit the seeded, already-submitted product through the REAL seam.
    // §Phase 4 — the canonical seed SKU for Astonish is ASTO-001 (skuFor()).
    const row = page.locator('tr', { hasText: 'ASTO-001' }).first();
    await expect(row).toBeVisible({ timeout: 6000 });
    await expect(row.getByText('Live (sim)').first()).toBeVisible({ timeout: 6000 });

    await row.locator('button', { hasText: 'Resubmit' }).first().click();
    await expect(page.getByText(/SIMULATED — no live retail call/).first()).toBeVisible({ timeout: 10000 });

    // The canonical-latest derivation must now show the JUST-SUBMITTED record.
    await expect(row.getByText('Submitted (sim)').first()).toBeVisible({ timeout: 8000 });
    // …and the simulated-processing control is still offered (E3 behaviour intact).
    await expect(row.locator('button', { hasText: 'Check result' }).first()).toBeVisible({ timeout: 6000 });

    expect(pageErrors).toEqual([]);
    expect(externalCalls).toEqual([]);
  });

  test('5. H+I+J — tenant isolation and domain-level refusal with no mutation', async ({ page }) => {
    const externalCalls = watchExternalCalls(page);
    const pageErrors: string[] = [];
    page.on('pageerror', (e) => pageErrors.push(String(e)));

    // H — another tenant's brand session sees no commerce attention state at all.
    await loginAs(page, 'Tapatío', 1200);
    await expect(page.getByTestId('brand-dashboard-loaded')).toHaveCount(1, { timeout: 10000 });
    await expect(page.locator('[data-testid^="attention-commerce-inv-"]')).toHaveCount(0);
    await expect(page.getByText('PO-SIM-BRAND-ASTONISH')).toHaveCount(0);

    // I+J — the REAL domain refuses foreign/unauthorised actors without mutating.
    const proof = await page.evaluate(async () => {
      const mod = await import('/src/lib/commerce/commerceLifecycle.ts');
      const store = await import('/src/data/demoStore.ts');
      const api = await import('/src/data/api.ts');

      const brandActor = { staffId: 'brand:brand-astonish', canMutate: true, tenantId: 'brand-astonish' };
      const product = store.productsForBrandFromStore('brand-astonish')[0];
      if (!product) return { skipped: true };
      const created = await mod.createCommercePurchaseOrder('brand-astonish', product.sku, 5, brandActor);
      if (!created.ok) return { skipped: true };
      const poId = created.value.id;

      const foreign = { staffId: 'brand:brand-tapatio', canMutate: true, tenantId: 'brand-tapatio' };
      const viewOnly = { staffId: 'staff-005', canMutate: false, tenantId: 'brand-astonish' };
      const actsBefore = store.getCommerceActivitiesForBrand('brand-astonish').length;
      const statusBefore = api.fetchPurchaseOrder(poId).status;

      const foreignAck = mod.acknowledgeCommercePurchaseOrder(poId, foreign);
      const viewOnlyAck = mod.acknowledgeCommercePurchaseOrder(poId, viewOnly);
      const foreignRead = mod.listBrandCommerceActivity('brand-astonish', foreign);

      return {
        skipped: false,
        foreignAckOk: foreignAck.ok,
        foreignAckError: String(foreignAck.error ?? ''),
        viewOnlyAckOk: viewOnlyAck.ok,
        viewOnlyAckError: String(viewOnlyAck.error ?? ''),
        foreignReadOk: foreignRead.ok,
        actsUnchanged: store.getCommerceActivitiesForBrand('brand-astonish').length === actsBefore,
        statusUnchanged: api.fetchPurchaseOrder(poId).status === statusBefore,
      };
    });

    expect(proof.skipped).toBe(false);
    expect(proof.foreignAckOk).toBe(false);
    expect(proof.foreignAckError).toContain('CROSS_TENANT');
    expect(proof.viewOnlyAckOk).toBe(false);
    expect(proof.viewOnlyAckError).toContain('FORBIDDEN');
    expect(proof.foreignReadOk).toBe(false);
    // A refusal MUST NOT mutate state.
    expect(proof.actsUnchanged).toBe(true);
    expect(proof.statusUnchanged).toBe(true);

    expect(pageErrors).toEqual([]);
    expect(externalCalls).toEqual([]);
  });
});
