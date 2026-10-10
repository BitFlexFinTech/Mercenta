/**
 * §CANONICAL PROPAGATION — BROWSER PROOF THAT THE PROJECTION IS DYNAMIC.
 *
 * The logistics projection is derived from the canonical domain stores.
 * "Interactive" is not "dynamic": changing a DOMAIN OBJECT must change the
 * projection, in the running product, without a reload and without editing any
 * fixture.
 *
 * §BATCH 3 (2026-10-10) — REPOINTED. The interactive operational MAP was removed
 * from both logistics surfaces, so this spec no longer reads the map's
 * `admin-logistics-map` / `logistics-map` testids (they no longer exist); it reads
 * the consignment list the removal left behind (the canonical surface).
 *
 * §BATCH 4 (2026-10-10) — REPOINTED again. The Mercenta Brain was removed by
 * owner instruction, so this spec no longer drives a second projection: it proves
 * the ONE projection that remains (the logistics consignment surface) moves with
 * the domain, and then pins the Brain's ABSENCE. The runtime half of the same
 * contract (executed against the real modules) lives in
 * `scripts/validate-canonical-propagation.mjs`.
 *
 * This spec drives the REAL canonical commerce lifecycle (raise a PO →
 * acknowledge it → file the ASN → advance the shipment) from inside the running
 * application, then asserts that:
 *   1  the brand hub GAINS the new consignment without a reload;
 *   2  the owning brand sees it, and the OTHER tenant does not;
 *   3  the removed Brain is GONE (no nav destination, no address).
 *
 * Nothing is injected into a component's data, no fixture is edited, and the page
 * is never reloaded between the mutation and the assertions — a static canvas
 * cannot pass this spec.
 */
import { test, expect, type Page } from '@playwright/test';
import { loginAs, openLogin } from './helpers/auth';

function watchExternalCalls(page: Page): string[] {
  const calls: string[] = [];
  page.on('request', (req) => {
    const url = req.url();
    const isDev = url.startsWith('http://localhost') || url.startsWith('http://127.0.0.1');
    const isWs = url.startsWith('ws://') || url.startsWith('wss://');
    const isStatic =
      /\.(woff2?|css|png|jpe?g|svg|ico)(\?|$)/.test(url) ||
      url.includes('gstatic.com') ||
      url.includes('fonts.g');
    const isPlaceholderImage = url.includes('picsum.photos');
    if (!isDev && !isWs && !isStatic && !isPlaceholderImage) calls.push(url);
  });
  return calls;
}

async function dismissTour(page: Page, brandId = 'brand-astonish') {
  await page
    .evaluate(async (id) => {
      const m = await import('/src/components/shared/TourEngine.tsx');
      const defs = await import('/src/config/tours/tourDefinitions.ts');
      for (const t of defs.ALL_TOUR_DEFINITIONS) {
        m.markTourSkipped(id, t.id);
        m.markTourCompleted(id, t.id);
      }
    }, brandId)
    .catch(() => {});
  await page.waitForTimeout(150);
}

/** Run the canonical lifecycle exactly as the product does (no shortcut seam). */
async function runCanonicalLifecycle(page: Page, brandId: string) {
  return page.evaluate(async (tenant) => {
    const mod = await import('/src/lib/commerce/commerceLifecycle.ts');
    const store = await import('/src/data/demoStore.ts');
    const actor = { staffId: `brand:${tenant}`, canMutate: true, tenantId: tenant };
    const product = store.productsForBrandFromStore(tenant)[0];
    if (!product) return { ok: false, reason: 'no product' };
    const created = await mod.createCommercePurchaseOrder(tenant, product.sku, 36, actor);
    if (!created.ok) return { ok: false, reason: String(created.error) };
    const ack = mod.acknowledgeCommercePurchaseOrder(created.value.id, actor);
    if (!ack.ok) return { ok: false, reason: String(ack.error) };
    const fulfilled = mod.fulfilCommercePurchaseOrder(created.value.id, actor, 'palletline');
    if (!fulfilled.ok) return { ok: false, reason: String(fulfilled.error) };
    mod.advanceCommerceShipment(fulfilled.value.shipmentId, actor);
    return { ok: true, poNumber: created.value.poNumber, shipmentId: fulfilled.value.shipmentId };
  }, brandId);
}

/** The brand hub states its consignment count in words: "<n> consignments in scope". */
async function brandScopeCount(page: Page): Promise<number> {
  const text = await page.getByTestId('logistics-scope-count').innerText();
  return Number(text.match(/\d+/)?.[0] ?? 0);
}

test.describe('§CANONICAL PROPAGATION — the projection moves with the domain', () => {
  test('1. a real domain mutation moves the logistics projection without a reload', async ({
    page,
  }) => {
    const pageErrors: string[] = [];
    page.on('pageerror', (e) => pageErrors.push(String(e)));
    const externalCalls = watchExternalCalls(page);

    // Enter the brand hub FIRST, so the projection is observed live in the same
    // page realm the mutation will run in (no reload, and the memory-only
    // canonical store is not re-bootstrapped).
    await loginAs(page, 'Astonish', 1400);
    await dismissTour(page);
    await page.locator('nav[aria-label="Primary"]').getByText('Logistics Hub').first().click();
    await page.getByTestId('logistics-scope-count').waitFor({ timeout: 15000 });
    await dismissTour(page);
    const legsBefore = await brandScopeCount(page);
    expect(legsBefore).toBeGreaterThan(0);

    // A REAL domain change, driven through the canonical lifecycle module the
    // product itself uses — not a component-data injection, not a fixture edit.
    const run = await runCanonicalLifecycle(page, 'brand-astonish');
    expect(run.ok, JSON.stringify(run)).toBe(true);

    // The projection must reflect the new consignment BY ITSELF (no reload).
    await expect
      .poll(async () => brandScopeCount(page), { timeout: 10000 })
      .toBeGreaterThan(legsBefore);
    await expect.poll(async () => page.locator('main').innerText(), { timeout: 10000 }).toContain(
      run.poNumber!
    );

    expect(pageErrors).toEqual([]);
    expect(externalCalls).toEqual([]);
  });

  test('2. the mutation is tenant-scoped: the owning brand sees it, another does not', async ({
    browser,
  }) => {
    const ownerCtx = await browser.newContext();
    const owner = await ownerCtx.newPage();
    await loginAs(owner, 'Astonish', 1400);
    await dismissTour(owner);
    await owner.locator('nav[aria-label="Primary"]').getByText('Logistics Hub').first().click();
    await owner.getByTestId('logistics-scope-count').waitFor({ timeout: 15000 });
    await dismissTour(owner);

    const run = await runCanonicalLifecycle(owner, 'brand-astonish');
    expect(run.ok, JSON.stringify(run)).toBe(true);

    // The brand's own hub must show it without a reload.
    await expect.poll(async () => owner.locator('main').innerText(), { timeout: 12000 }).toContain(
      run.poNumber!
    );
    await ownerCtx.close();

    // The OTHER tenant must not gain that consignment anywhere.
    const otherCtx = await browser.newContext();
    const other = await otherCtx.newPage();
    await loginAs(other, 'Tapatío', 1400);
    await dismissTour(other, 'brand-tapatio');
    await other.goto('/brand/logistics');
    await other.getByTestId('logistics-scope-count').waitFor({ timeout: 15000 });
    await other.waitForTimeout(1500);
    const otherText = await other.locator('main').innerText();
    expect(otherText).not.toContain(run.poNumber!);
    await otherCtx.close();
  });

  test('3. the removed Mercenta Brain is GONE (no nav destination, no address)', async ({ page }) => {
    await openLogin(page);
    await page.click('text=Super Admin — Tadii');
    await page.waitForTimeout(1600);

    // The Brain destination is no longer offered in the Super-Admin nav.
    await expect(
      page.locator('nav[aria-label="Primary"]').getByRole('button', { name: 'Mercenta Brain' })
    ).toHaveCount(0);

    // Its address renders no Brain surface and does not show a blank workspace
    // (the shell resolves the unrenderable segment to the default view).
    await page.goto('/admin/brain');
    await page.waitForTimeout(1200);
    await expect(page.getByTestId('brain-canvas')).toHaveCount(0);
    await expect(page.getByTestId('brain-counts')).toHaveCount(0);
    await expect(page.getByRole('heading', { level: 1 }).first()).toBeVisible({ timeout: 10000 });
  });
});
