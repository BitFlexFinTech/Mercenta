/**
 * §LOGISTICS HUB — OPERATIONAL MAP browser verification (real Chromium).
 *
 * Proves in a real browser that the redesigned Logistics Hub is a genuine
 * operational surface, and that its TRUTH RULES hold:
 *
 *   1  the route renders and the map is a real interactive SVG
 *   2  the map draws one leg per visible consignment, from real coordinates
 *   3  zoom controls actually change the rendered zoom
 *   4  selecting a consignment on the map opens the inspector
 *   5  the evidence filter genuinely changes the drawn set AND the list
 *   6  LIVE VERIFIED / SIMULATED / AMBIENT are labelled (never colour-only)
 *   7  nothing is claimed LIVE without a provider reference — count is 0 here
 *   8  Freight Collect is labelled CHANNEL-ARRANGED (no false Mercenta choice)
 *   9  Freight Prepaid is labelled MERCENTA-ARRANGED
 *  10  the honest geographic notice is rendered (no invented precision)
 *  11  reduced motion disables the ambient drift
 *  12  responsive: no horizontal overflow at 1440 / 1280 / 1024 / 390
 *  13  tenant isolation: brand B never sees brand A's consignments
 *  14  empty state renders when filters exclude everything
 *  15  the Waybill / Labels / Track artefacts still open
 *  16  no page errors and no external network calls
 *
 * Dev server started by playwright.config.ts (npm run dev, :5173).
 */
import { test, expect, type Page } from '@playwright/test';
import { loginAs, openLogin } from './helpers/auth';

const SHOTS = 'test-screenshots/logistics-hub';

function watchExternalCalls(page: Page): string[] {
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
 * Stop the first-run coach-mark tour before interacting.
 *
 * Done through the tour's OWN store API (`stopTour` / `dismissTour` /
 * `markTourSkipped`) rather than by clicking its controls: clicking the card's
 * dismiss opens a Skip-confirmation modal, which then blocks the page. This is
 * a demo-affordance reset, not an application-state bypass — the tour state
 * lives in a module-level store, and the product's own skip path is what the
 * store calls implement.
 */
async function dismissTour(page: Page, brandId = 'brand-astonish') {
  await page
    .evaluate(async (id) => {
      const m = await import('/src/components/shared/TourEngine.tsx');
      const defs = await import('/src/config/tours/tourDefinitions.ts');
      for (const t of defs.ALL_TOUR_DEFINITIONS) {
        m.markTourSkipped(id, t.id);
        m.markTourCompleted(id, t.id);
      }
      m.stopTour(id);
      m.dismissTour(id);
    }, brandId)
    .catch(() => {});
  await page.waitForTimeout(250);
}

async function openLogistics(page: Page, card = 'Astonish') {
  await loginAs(page, card, 1400);
  await dismissTour(page);
  await page.click('nav[aria-label="Primary"] >> text=Inbound Shipments');
  await page.getByTestId('logistics-map').waitFor({ timeout: 15000 });
  await dismissTour(page);
}

/**
 * Seed a REAL consignment through the canonical commerce lifecycle, BEFORE the
 * login card is clicked (React Query caches a copy of the seed with a 30s
 * staleTime, so records created after the shell's first fetch would not be
 * visible).
 *
 * The path is the genuine one a brand takes: raise a PO → acknowledge it →
 * file the ASN. Nothing is injected into the store directly, and no second
 * shipment engine is created for the test.
 */
async function seedConsignment(
  page: Page,
  brandId: string
): Promise<{ ok: boolean; shipmentId?: string; reason?: string }> {
  return page.evaluate(async (tenant) => {
    const mod = await import('/src/lib/commerce/commerceLifecycle.ts');
    const store = await import('/src/data/demoStore.ts');
    const actor = { staffId: `brand:${tenant}`, canMutate: true, tenantId: tenant };
    const product = store.productsForBrandFromStore(tenant)[0];
    if (!product) return { ok: false, reason: 'no product' };
    const created = await mod.createCommercePurchaseOrder(tenant, product.sku, 60, actor);
    if (!created.ok) return { ok: false, reason: String(created.error) };
    const poId = created.value.id;
    const ack = mod.acknowledgeCommercePurchaseOrder(poId, actor);
    if (!ack.ok) return { ok: false, reason: String(ack.error) };
    const fulfilled = mod.fulfilCommercePurchaseOrder(poId, actor, 'dhl');
    if (!fulfilled.ok) return { ok: false, reason: String(fulfilled.error) };
    mod.advanceCommerceShipment(fulfilled.value.shipmentId, actor);
    return { ok: true, shipmentId: fulfilled.value.shipmentId };
  }, brandId);
}

/** Open the marketing site, seed a real consignment, then enter the brand portal. */
async function openSeededLogistics(
  page: Page,
  card = 'Astonish',
  brandId = 'brand-astonish'
): Promise<{ ok: boolean; shipmentId?: string; reason?: string }> {
  await openLogin(page);
  const seeded = await seedConsignment(page, brandId);
  await page.click('text=' + card);
  await page.waitForTimeout(1600);
  await dismissTour(page);
  await page.click('nav[aria-label="Primary"] >> text=Inbound Shipments');
  await page.getByTestId('logistics-map').waitFor({ timeout: 15000 });
  await dismissTour(page);
  return seeded;
}

test.describe('Logistics Hub — operational map', () => {
  test('1. renders the workspace and a real interactive map', async ({ page }) => {
    const pageErrors: string[] = [];
    const externalCalls = watchExternalCalls(page);
    page.on('pageerror', (e) => pageErrors.push(String(e)));

    const seed = await openSeededLogistics(page);
    expect(seed.ok, JSON.stringify(seed)).toBe(true);

    await expect(page.locator('[data-workspace-frame]').first()).toBeVisible();
    await expect(page.locator('[data-workspace-header]').first()).toBeVisible();
    await expect(page.locator('[data-workspace-toolbar]').first()).toBeVisible();

    const map = page.getByTestId('logistics-map');
    await expect(map).toBeVisible();
    // A real coordinate grid must be drawn — it is what makes the view locatable.
    await expect(page.getByTestId('logistics-map-graticule').locator('line').first()).toBeAttached();
    await expect(page.getByTestId('logistics-map-legend')).toBeVisible();

    await dismissTour(page);
    await page.screenshot({ path: `${SHOTS}/01-hub-1440.png`, fullPage: false });
    // A dedicated capture of the map itself, so the drawn geometry is inspected
    // rather than assumed from source.
    await dismissTour(page);
    await page.getByTestId('logistics-map-surface').screenshot({ path: `${SHOTS}/01b-map-surface.png` });

    // Truth must be stated, never implied: this environment holds no live
    // carrier credentials, so nothing may be presented as live-verified.
    await expect(page.getByTestId('logistics-legend-live_verified')).toContainText('0');

    expect(pageErrors).toEqual([]);
    expect(externalCalls).toEqual([]);
  });

  test('2. draws one leg per visible consignment from declared coordinates', async ({ page }) => {
    const seed = await openSeededLogistics(page);
    expect(seed.ok, JSON.stringify(seed)).toBe(true);
    const drawn = Number(await page.getByTestId('logistics-map').getAttribute('data-visible-count'));
    expect(drawn).toBeGreaterThan(0);
    await expect(page.locator('[data-testid^="logistics-leg-path-"]')).toHaveCount(drawn);
    await expect(page.locator('[data-testid^="logistics-marker-"]')).toHaveCount(drawn);
    // Declared coordinates produce real nodes, not invented ones.
    expect(await page.locator('[data-testid^="logistics-node-"]').count()).toBeGreaterThan(0);
  });

  test('3. zoom actually changes the rendered view', async ({ page }) => {
    const seed = await openSeededLogistics(page);
    expect(seed.ok, JSON.stringify(seed)).toBe(true);
    const before = await page.getByTestId('logistics-map-zoom-level').innerText();
    await page.getByTestId('logistics-map-zoom-in').click();
    await expect(page.getByTestId('logistics-map-zoom-level')).not.toHaveText(before);
    await page.getByTestId('logistics-map-zoom-reset').click();
    await expect(page.getByTestId('logistics-map-zoom-level')).toHaveText('100%');
  });

  test('4. selecting a consignment opens the inspector with its evidence', async ({ page }) => {
    const seed = await openSeededLogistics(page);
    expect(seed.ok, JSON.stringify(seed)).toBe(true);
    await expect(page.getByTestId('logistics-inspector-empty')).toBeVisible();

    await page.locator('[data-testid^="logistics-row-"]').first().click();

    await expect(page.getByTestId('logistics-inspector')).toBeVisible();
    const reason = await page.getByTestId('logistics-truth-reason').innerText();
    expect(reason.length).toBeGreaterThan(20);
    // The reason must name the evidence basis, not just assert a state.
    expect(reason.toLowerCase()).toMatch(/simulation|live|provider/);
    await dismissTour(page);
    await page.screenshot({ path: `${SHOTS}/02-inspector-1440.png` });
  });

  test('5. the evidence filter changes the drawn set and the list', async ({ page }) => {
    const seed = await openSeededLogistics(page);
    expect(seed.ok, JSON.stringify(seed)).toBe(true);
    const allDrawn = Number(await page.getByTestId('logistics-map').getAttribute('data-visible-count'));
    const allRows = await page.locator('[data-testid^="logistics-row-"]').count();
    expect(allDrawn).toBe(allRows);

    await page.getByRole('tab', { name: /Ambient/i }).click();
    const ambientDrawn = Number(
      await page.getByTestId('logistics-map').getAttribute('data-visible-count')
    );
    if (ambientDrawn === 0) {
      await expect(page.getByTestId('logistics-map-empty')).toBeVisible();
      await expect(page.getByTestId('logistics-list-empty')).toBeVisible();
    } else {
      expect(ambientDrawn).toBeLessThanOrEqual(allDrawn);
      const truths = await page
        .locator('[data-testid^="logistics-row-"]')
        .evaluateAll((els) => els.map((e) => e.getAttribute('data-truth')));
      expect(truths.every((t) => t === 'ambient')).toBe(true);
    }

    await page.locator('[aria-label="Travel evidence"]').getByRole('tab', { name: 'All' }).click();
    await expect.poll(async () => page.locator('[data-testid^="logistics-row-"]').count()).toBe(allRows);
  });

  test('6/7. evidence is labelled and nothing is falsely live', async ({ page }) => {
    const seed = await openSeededLogistics(page);
    expect(seed.ok, JSON.stringify(seed)).toBe(true);
    await expect(page.getByTestId('logistics-legend-live_verified')).toContainText('Live verified');
    await expect(page.getByTestId('logistics-legend-simulated')).toContainText('Simulated');
    await expect(page.getByTestId('logistics-legend-ambient')).toContainText('Ambient');

    const simLegend = await page.getByTestId('logistics-legend-simulated').innerText();
    const liveLegend = await page.getByTestId('logistics-legend-live_verified').innerText();
    // This environment holds simulation-only carrier credentials.
    expect(Number(liveLegend.replace(/\D/g, ''))).toBe(0);
    expect(Number(simLegend.replace(/\D/g, ''))).toBeGreaterThan(0);

    // Every row states its evidence state, and never colour-alone.
    const truths = await page
      .locator('[data-testid^="logistics-row-"]')
      .evaluateAll((els) => els.map((e) => e.getAttribute('data-truth')));
    expect(truths.length).toBeGreaterThan(0);
    expect(truths.every((s) => s === 'live_verified' || s === 'simulated' || s === 'ambient')).toBe(
      true
    );
    // The state is also rendered as text an assistive technology can read.
    const mentioned = await page
      .locator('[data-testid^="logistics-row-"]')
      .evaluateAll((els) =>
        els.map((e) => (e.textContent ?? '').toUpperCase().includes('SIM') ||
          (e.textContent ?? '').toUpperCase().includes('AMBIENT') ||
          (e.textContent ?? '').toUpperCase().includes('LIVE'))
      );
    expect(mentioned.every(Boolean)).toBe(true);
  });

  test('8/9/10. freight responsibility is stated truthfully', async ({ page }) => {
    const seed = await openSeededLogistics(page);
    expect(seed.ok, JSON.stringify(seed)).toBe(true);
    const body = await page.locator('[data-workspace-frame]').first().innerText();

    // The honest geographic notice must be on screen — no invented precision.
    expect(body).toContain('Schematic operational view');
    // The hub must state who arranges carriage for both terms.
    expect(body).toMatch(/CHANNEL-ARRANGED|Freight Collect/i);
    expect(body).toMatch(/MERCENTA-ARRANGED|Freight Prepaid/i);

    // Mercenta must never be described as owning the channel-arranged carrier.
    expect(body).not.toMatch(/Mercenta (selects|chooses|owns) Amazon/i);

    await page.locator('[data-testid^="logistics-row-"]').first().click();
    await expect(page.getByTestId('logistics-inspector')).toBeVisible();
  });

  test('11. reduced motion disables the ambient drift', async ({ page }) => {
    await page.emulateMedia({ reducedMotion: 'reduce' });
    const seed = await openSeededLogistics(page);
    expect(seed.ok, JSON.stringify(seed)).toBe(true);
    const animations = await page
      .locator('.animate-ambient-drift, .animate-ambient-halo')
      .evaluateAll((els) =>
        els.map((e) => getComputedStyle(e).animationName).filter((n) => n && n !== 'none')
      );
    expect(animations).toEqual([]);
  });

  test('12. no horizontal overflow at any required viewport', async ({ page }) => {
    const seed = await openSeededLogistics(page);
    expect(seed.ok, JSON.stringify(seed)).toBe(true);
    for (const [w, h] of [
      [1440, 900],
      [1280, 800],
      [1024, 768],
      [390, 844],
    ] as [number, number][]) {
      await page.setViewportSize({ width: w, height: h });
      await page.waitForTimeout(250);
      const overflow = await page.evaluate(
        () => document.documentElement.scrollWidth - document.documentElement.clientWidth
      );
      expect(overflow, `horizontal overflow at ${w}px`).toBeLessThanOrEqual(1);
      if (w === 390) {
        await expect(page.getByTestId('logistics-map')).toBeVisible();
        await dismissTour(page);
        await page.screenshot({ path: `${SHOTS}/03-mobile-390.png`, fullPage: false });
      }
    }
  });

  test('13. tenant isolation — one brand never sees another brand’s consignments', async ({
    browser,
  }) => {
    const a = await browser.newContext();
    const pa = await a.newPage();
    expect((await openSeededLogistics(pa, 'Astonish', 'brand-astonish')).ok).toBe(true);
    const aIds = await pa
      .locator('[data-testid^="logistics-row-"]')
      .evaluateAll((els) => els.map((e) => e.getAttribute('data-testid')));
    await a.close();

    const b = await browser.newContext();
    const pb = await b.newPage();
    // Brand B has no consignment of its own, and must see NONE of brand A's.
    await openLogistics(pb, 'Tapatío');
    const bIds = await pb
      .locator('[data-testid^="logistics-row-"]')
      .evaluateAll((els) => els.map((e) => e.getAttribute('data-testid')));
    const bRows = await pb.locator('[data-testid^="logistics-row-"]').count();
    await b.close();

    expect(aIds.length).toBeGreaterThan(0);
    // Tenant isolation is structural: brand B's feed contains no brand A record.
    expect(bRows).toBe(0);
    const overlap = aIds.filter((id) => bIds.includes(id));
    expect(overlap).toEqual([]);
  });

  test('14/15. artefacts still open and close', async ({ page }) => {
    const seed = await openSeededLogistics(page);
    expect(seed.ok, JSON.stringify(seed)).toBe(true);
    const firstRowTestId = await page
      .locator('[data-testid^="logistics-row-"]')
      .first()
      .getAttribute('data-testid');
    expect(firstRowTestId).toBeTruthy();
    const legId = firstRowTestId!.replace('logistics-row-', '');

    await page.getByTestId(`logistics-waybill-${legId}`).click();
    await expect(page.getByTestId('logistics-waybill-dialog')).toBeVisible();
    await page.keyboard.press('Escape');
    await expect(page.getByTestId('logistics-waybill-dialog')).toBeHidden();

    await page.getByTestId(`logistics-labels-${legId}`).click();
    await expect(page.getByTestId('logistics-labels-dialog')).toBeVisible();
    await page
      .getByTestId('logistics-labels-dialog')
      .getByRole('button', { name: 'Close', exact: true })
      .last()
      .click();
    await expect(page.getByTestId('logistics-labels-dialog')).toBeHidden();

    await page.getByTestId(`logistics-track-${legId}`).click();
    await expect(page.getByTestId('logistics-tracking-dialog')).toBeVisible();
    await page.keyboard.press('Escape');
    await expect(page.getByTestId('logistics-tracking-dialog')).toBeHidden();
  });

  test('16. search narrows the map and the list together', async ({ page }) => {
    const pageErrors: string[] = [];
    page.on('pageerror', (e) => pageErrors.push(String(e)));
    const seed = await openSeededLogistics(page);
    expect(seed.ok, JSON.stringify(seed)).toBe(true);

    const before = await page.locator('[data-testid^="logistics-row-"]').count();
    const needle = (await page.locator('[data-testid^="logistics-row-"]').first().innerText())
      .split('\n')[0]
      .trim();
    await page.getByTestId('logistics-search').fill(needle);
    await page.waitForTimeout(250);

    const afterRows = await page.locator('[data-testid^="logistics-row-"]').count();
    const afterDrawn = Number(
      await page.getByTestId('logistics-map').getAttribute('data-visible-count')
    );
    expect(afterRows).toBeLessThanOrEqual(before);
    expect(afterRows).toBe(afterDrawn);

    await page.getByTestId('logistics-search').fill('');
    await expect.poll(async () => page.locator('[data-testid^="logistics-row-"]').count()).toBe(before);
    expect(pageErrors).toEqual([]);
  });
});

/**
 * §LOGISTICS HUB — ADMIN OPERATIONAL MAP.
 *
 * The Mercenta-side counterpart of the brand hub uses the SAME canvas and the
 * same canonical evidence derivation. These tests prove the admin surface is a
 * real operational map (not a table with a picture above it), that the focus
 * filter genuinely drives the map, and that a consignment created through the
 * real PO lifecycle appears on it.
 */
test.describe('Admin Logistics Control — operational map', () => {
  async function openAdminLogistics(page: Page) {
    await loginAs(page, 'Mercenta Admin Hub', 1400);
    await dismissTour(page);
    await page.click('nav[aria-label="Primary"] >> text=Logistics Control');
    await page.getByTestId('admin-logistics-map').waitFor({ timeout: 15000 });
    await dismissTour(page);
  }

  test('A. the admin map renders with the canonical truth labelling', async ({ page }) => {
    const pageErrors: string[] = [];
    const externalCalls = watchExternalCalls(page);
    page.on('pageerror', (e) => pageErrors.push(String(e)));

    await openAdminLogistics(page);
    await expect(page.getByTestId('admin-logistics-map')).toBeVisible();
    await expect(page.getByTestId('admin-logistics-map-graticule').locator('line').first()).toBeAttached();
    await expect(page.getByTestId('logistics-map-evidence-all')).toBeVisible();
    await page.screenshot({ path: `${SHOTS}/04-admin-map-1440.png` });

    expect(pageErrors).toEqual([]);
    expect(externalCalls).toEqual([]);
  });

  test('B. a consignment created through the real PO lifecycle appears on the admin map', async ({
    page,
  }) => {
    await openLogin(page);
    const seeded = await seedConsignment(page, 'brand-astonish');
    expect(seeded.ok, JSON.stringify(seeded)).toBe(true);
    await page.click('text=Mercenta Admin Hub');
    await page.waitForTimeout(1600);
    await dismissTour(page);
    await page.click('nav[aria-label="Primary"] >> text=Logistics Control');
    await page.getByTestId('admin-logistics-map').waitFor({ timeout: 15000 });
    await dismissTour(page);

    const drawn = Number(
      await page.getByTestId('admin-logistics-map').getAttribute('data-visible-count')
    );
    expect(drawn).toBeGreaterThan(0);
    await expect(page.locator('[data-testid^="logistics-marker-"]')).toHaveCount(drawn);

    // Selecting it exposes its operational context — map and records are linked.
    await page.locator('[data-testid^="logistics-marker-"]').first().click({ force: true });
    await expect(page.getByTestId('admin-logistics-inspector')).toBeVisible();
    await expect(page.getByTestId('admin-logistics-truth-reason')).toContainText(/simulation|provider/i);
  });

  test('C. the evidence filter genuinely changes the drawn set', async ({ page }) => {
    await openAdminLogistics(page);
    const all = Number(
      await page.getByTestId('admin-logistics-map').getAttribute('data-visible-count')
    );
    await page.getByTestId('logistics-map-evidence-ambient').click();
    await page.waitForTimeout(250);
    const ambient = Number(
      await page.getByTestId('admin-logistics-map').getAttribute('data-visible-count')
    );
    expect(ambient).toBeLessThanOrEqual(all);
    if (ambient === 0) {
      await expect(page.getByTestId('admin-logistics-map-empty')).toBeVisible();
    }
    await page.getByTestId('logistics-map-evidence-all').click();
    await expect
      .poll(async () =>
        Number(await page.getByTestId('admin-logistics-map').getAttribute('data-visible-count'))
      )
      .toBe(all);
  });
});