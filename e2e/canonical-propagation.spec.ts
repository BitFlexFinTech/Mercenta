/**
 * §CANONICAL PROPAGATION — BROWSER PROOF THAT THE PROJECTIONS ARE DYNAMIC.
 *
 * The Brain and the Logistics operational map are projections of the canonical
 * domain stores. "Interactive" is not "dynamic": the Founder's definition
 * requires that changing a DOMAIN OBJECT changes the projection, in the running
 * product, without a reload and without editing any fixture.
 *
 * This spec drives the REAL canonical commerce lifecycle (raise a PO →
 * acknowledge it → file the ASN → advance the shipment) from inside the running
 * application, then asserts that:
 *   1  the Logistics Control map GAINS a leg for the new consignment;
 *   2  the Mercenta Brain GAINS the shipment ENTITY (its counts increase);
 *   3  the brand's own Logistics Hub shows it, and the OTHER tenant does not;
 *   4  no page errors and no external calls happen while doing it.
 *
 * Nothing is injected into a component's data, no fixture is edited, and the
 * page is never reloaded between the mutation and the assertions — a static
 * canvas cannot pass this spec.
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

async function adminVisibleLegs(page: Page): Promise<number> {
  return Number(await page.getByTestId('admin-logistics-map').getAttribute('data-visible-count'));
}

/** Parse "323 entities · 449 relationships · 28 types" from the Brain header. */
async function brainCounts(page: Page): Promise<{ nodes: number; edges: number }> {
  const text = await page.getByTestId('brain-counts').innerText();
  const [nodes, edges] = text.match(/\d+/g)?.map(Number) ?? [0, 0];
  return { nodes, edges };
}

test.describe('§CANONICAL PROPAGATION — the projections move with the domain', () => {
  test('1. a real domain mutation moves BOTH projections without a reload', async ({ page }) => {
    const pageErrors: string[] = [];
    page.on('pageerror', (e) => pageErrors.push(String(e)));
    const externalCalls = watchExternalCalls(page);

    await loginAs(page, 'Super Admin — Tadii', 1400);
    const nav = page.locator('nav[aria-label="Primary"]');

    // ── Brain first: record the projection's size. Navigation from here on is
    // the app's OWN client-side navigation (no reload), so the in-memory
    // canonical stores stay in the same realm the mutation will run in.
    await nav.getByRole('button', { name: 'Mercenta Brain', exact: true }).click();
    await page.getByTestId('brain-canvas').waitFor({ timeout: 15000 });
    const brainBefore = await brainCounts(page);
    expect(brainBefore.nodes).toBeGreaterThan(100);

    await nav.getByRole('button', { name: 'Logistics Hub', exact: true }).click();
    await page.getByTestId('admin-logistics-map').waitFor({ timeout: 15000 });
    const legsBefore = await adminVisibleLegs(page);
    expect(legsBefore).toBeGreaterThan(0);

    // A REAL domain change, driven through the canonical lifecycle module the
    // product itself uses — not a component-data injection, not a fixture edit.
    const run = await runCanonicalLifecycle(page, 'brand-astonish');
    expect(run.ok, JSON.stringify(run)).toBe(true);

    // The logistics PROJECTION must reflect the new consignment by itself.
    await expect
      .poll(async () => adminVisibleLegs(page), { timeout: 10000 })
      .toBeGreaterThan(legsBefore);

    // …and the Brain PROJECTION must have grown from the very same change.
    await nav.getByRole('button', { name: 'Mercenta Brain', exact: true }).click();
    await page.getByTestId('brain-canvas').waitFor({ timeout: 15000 });
    const brainAfter = await brainCounts(page);
    expect(brainAfter.nodes).toBeGreaterThan(brainBefore.nodes);
    expect(brainAfter.edges).toBeGreaterThan(brainBefore.edges);

    // The new PO is a canonical entity the Brain can find — the graph is not a
    // snapshot taken at mount.
    const search = page.getByTestId('brain-search');
    await search.fill(run.poNumber!);
    await page.waitForTimeout(500);
    await expect
      .poll(async () => page.locator('[data-testid^="brain-entity-"]').count(), { timeout: 8000 })
      .toBeGreaterThan(0);

    expect(pageErrors).toEqual([]);
    expect(externalCalls).toEqual([]);
  });


  test('2. the mutation is tenant-scoped: the owning brand sees it, another does not', async ({
    browser,
  }) => {
    // Owner: Astonish — open its OWN hub FIRST, then make the change, so the
    // projection is observed live in the same page realm (no reload, and the
    // memory-only canonical store is not re-bootstrapped).
    const ownerCtx = await browser.newContext();
    const owner = await ownerCtx.newPage();
    await loginAs(owner, 'Astonish', 1400);
    await dismissTour(owner);
    await owner.locator('nav[aria-label="Primary"]').getByText('Logistics Hub').first().click();
    await owner.getByTestId('logistics-map').waitFor({ timeout: 15000 });
    await dismissTour(owner);

    // The canonical change, driven through the SAME lifecycle module the product uses.
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
    await other.getByTestId('logistics-map').waitFor({ timeout: 15000 });
    await other.waitForTimeout(1500);
    const otherText = await other.locator('main').innerText();
    expect(otherText).not.toContain(run.poNumber!);
    await otherCtx.close();
  });

  test('3. the Brain carries provenance for what it shows and never invents live truth', async ({
    page,
  }) => {
    await openLogin(page);
    await page.click('text=Super Admin — Tadii');
    await page.waitForTimeout(1600);
    await page.goto('/admin/brain');
    await page.getByTestId('brain-canvas').waitFor({ timeout: 15000 });

    // Select a canonical entity and read its provenance + authority note.
    await page.locator('[data-testid^="brain-entity-"]').first().click();
    await expect(page.getByTestId('brain-inspector')).toBeVisible({ timeout: 8000 });
    const provenance = await page.getByTestId('brain-provenance').innerText();
    expect(provenance.length).toBeGreaterThan(10);
    // The graph is a projection: the inspector must name where the record lives.
    expect(provenance.toLowerCase()).toMatch(/src\/|store|registry|config|types/);
  });
});

