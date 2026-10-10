/**
 * §LOGISTICS HUB — THE OPERATIONAL MAP'S ABSENCE GUARD (rule 08).
 *
 * §BATCH 3 (2026-10-10) — the owner instructed the interactive operational map's
 * removal from BOTH logistics surfaces. This spec used to prove the map RENDERED
 * and INTERACTED; rule 08 requires a check that asserted the removed thing to be
 * REWRITTEN as an ABSENCE guard rather than deleted. It now proves, in a real
 * browser, that:
 *
 *   · the map is GONE on the brand hub and on the admin control — no canvas, no
 *     graticule, no zoom controls, no markers/nodes/legs, no map legend, no map
 *     evidence filter, and none of the map's ambient-drift animation;
 *   · the surfaces the map was mounted on STILL WORK — the consignment list, its
 *     truth labelling, the inspector it opens, the freight-term disclosure, the
 *     artefacts, tenant isolation, and no horizontal overflow;
 *   · the §P5 destination-FC rule is unchanged at the DOMAIN level (a
 *     consignment's destination is the FC its OWN purchase order declares, never
 *     a Mercenta hub).
 *
 * The derivation `src/lib/logistics/operationsMap.ts` is deliberately KEPT — the
 * list and the inspector on both surfaces still read it (verified, not assumed) —
 * so this spec drives the LIST as the operational surface.
 *
 * Dev server started by playwright.config.ts (npm run dev, :5182).
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
 * a demo-affordance reset, not an application-state bypass.
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

/** Open the brand Logistics Hub and wait for the LIST (the surface that remains). */
async function openLogistics(page: Page, card = 'Astonish') {
  await loginAs(page, card, 1400);
  await dismissTour(page);
  await page.click('nav[aria-label="Primary"] >> text=Logistics Hub');
  await page.getByTestId('logistics-scope-count').waitFor({ timeout: 15000 });
  await dismissTour(page);
}

/**
 * Seed a REAL consignment through the canonical commerce lifecycle, BEFORE the
 * login card is clicked (React Query caches a copy of the seed with a 30s
 * staleTime, so records created after the shell's first fetch would not be
 * visible).
 *
 * The path is the genuine one a brand takes: raise a PO → acknowledge it →
 * file the ASN. Nothing is injected into the store directly.
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
  await page.click('nav[aria-label="Primary"] >> text=Logistics Hub');
  await page.getByTestId('logistics-scope-count').waitFor({ timeout: 15000 });
  await dismissTour(page);
  return seeded;
}

/** Every testid the removed map owned. All must be absent on every surface. */
const MAP_TESTIDS = [
  'logistics-map',
  'logistics-map-graticule',
  'logistics-map-legend',
  'logistics-map-zoom-in',
  'logistics-map-zoom-out',
  'logistics-map-zoom-level',
  'logistics-map-zoom-reset',
  'logistics-map-fit',
  'logistics-map-surface',
  'admin-logistics-map',
  'logistics-map-evidence-all',
];

/** The map is gone: no canvas testid, no drawn geometry, no drift animation. */
async function expectMapAbsent(page: Page) {
  for (const id of MAP_TESTIDS) {
    await expect(page.getByTestId(id), `map testid "${id}" must be gone`).toHaveCount(0);
  }
  await expect(page.locator('[data-testid^="logistics-marker-"]')).toHaveCount(0);
  await expect(page.locator('[data-testid^="logistics-node-"]')).toHaveCount(0);
  await expect(page.locator('[data-testid^="logistics-leg-path-"]')).toHaveCount(0);
  await expect(page.locator('[data-testid^="logistics-legend-"]')).toHaveCount(0);
  await expect(page.locator('.animate-ambient-drift, .animate-ambient-halo')).toHaveCount(0);
}


test.describe('Logistics Hub — the operational map is GONE (absence guard)', () => {
  test('1. the workspace renders, the map is gone and the list is the operational surface', async ({
    page,
  }) => {
    const pageErrors: string[] = [];
    const externalCalls = watchExternalCalls(page);
    page.on('pageerror', (e) => pageErrors.push(String(e)));

    const seed = await openSeededLogistics(page);
    expect(seed.ok, JSON.stringify(seed)).toBe(true);

    await expect(page.locator('[data-workspace-frame]').first()).toBeVisible();
    await expect(page.locator('[data-workspace-header]').first()).toBeVisible();
    await expect(page.locator('[data-workspace-toolbar]').first()).toBeVisible();

    await expectMapAbsent(page);

    const rows = await page.locator('[data-testid^="logistics-row-"]').count();
    expect(rows).toBeGreaterThan(0);
    await expect(page.getByTestId('logistics-scope-count')).toBeVisible();

    await page.screenshot({ path: `${SHOTS}/01-hub-1440.png`, fullPage: false });

    expect(pageErrors).toEqual([]);
    expect(externalCalls).toEqual([]);
  });

  test('2. every consignment row states its evidence state', async ({ page }) => {
    const seed = await openSeededLogistics(page);
    expect(seed.ok, JSON.stringify(seed)).toBe(true);
    const truths = await page
      .locator('[data-testid^="logistics-row-"]')
      .evaluateAll((els) => els.map((e) => e.getAttribute('data-truth')));
    expect(truths.length).toBeGreaterThan(0);
    expect(
      truths.every((t) => t === 'live_verified' || t === 'simulated' || t === 'ambient')
    ).toBe(true);
  });

  test('3. selecting a consignment in the list opens the inspector with its evidence', async ({
    page,
  }) => {
    const seed = await openSeededLogistics(page);
    expect(seed.ok, JSON.stringify(seed)).toBe(true);
    await expect(page.getByTestId('logistics-inspector-empty')).toBeVisible();

    await page.locator('[data-testid^="logistics-row-"]').first().click();

    await expect(page.getByTestId('logistics-inspector')).toBeVisible();
    const reason = await page.getByTestId('logistics-truth-reason').innerText();
    expect(reason.length).toBeGreaterThan(20);
    // The reason must name the evidence basis, not just assert a state.
    expect(reason.toLowerCase()).toMatch(/simulation|live|provider/);
    await page.screenshot({ path: `${SHOTS}/02-inspector-1440.png`, fullPage: false });
  });

  test('4. the evidence filter changes the list', async ({ page }) => {
    const seed = await openSeededLogistics(page);
    expect(seed.ok, JSON.stringify(seed)).toBe(true);
    const allRows = await page.locator('[data-testid^="logistics-row-"]').count();
    expect(allRows).toBeGreaterThan(0);

    await page.getByRole('tab', { name: /Ambient/i }).click();
    const ambientRows = await page.locator('[data-testid^="logistics-row-"]').count();
    if (ambientRows === 0) {
      await expect(page.getByTestId('logistics-list-empty')).toBeVisible();
    } else {
      expect(ambientRows).toBeLessThanOrEqual(allRows);
      const truths = await page
        .locator('[data-testid^="logistics-row-"]')
        .evaluateAll((els) => els.map((e) => e.getAttribute('data-truth')));
      expect(truths.every((t) => t === 'ambient')).toBe(true);
    }

    await page.locator('[aria-label="Travel evidence"]').getByRole('tab', { name: 'All' }).click();
    await expect.poll(async () => page.locator('[data-testid^="logistics-row-"]').count()).toBe(allRows);
  });

  test('5. nothing is falsely presented as live', async ({ page }) => {
    const seed = await openSeededLogistics(page);
    expect(seed.ok, JSON.stringify(seed)).toBe(true);
    const truths = await page
      .locator('[data-testid^="logistics-row-"]')
      .evaluateAll((els) => els.map((e) => e.getAttribute('data-truth')));
    // This environment holds simulation-only carrier credentials.
    expect(truths).not.toContain('live_verified');

    // The state is also rendered as text an assistive technology can read.
    const mentioned = await page
      .locator('[data-testid^="logistics-row-"]')
      .evaluateAll((els) =>
        els.map(
          (e) =>
            (e.textContent ?? '').toUpperCase().includes('SIM') ||
            (e.textContent ?? '').toUpperCase().includes('AMBIENT') ||
            (e.textContent ?? '').toUpperCase().includes('LIVE')
        )
      );
    expect(mentioned.every(Boolean)).toBe(true);
  });


  test('6. freight responsibility is stated truthfully', async ({ page }) => {
    const seed = await openSeededLogistics(page);
    expect(seed.ok, JSON.stringify(seed)).toBe(true);
    const body = await page.locator('[data-workspace-frame]').first().innerText();

    // The hub must state who arranges carriage for both terms.
    expect(body).toMatch(/CHANNEL-ARRANGED|Freight Collect/i);
    expect(body).toMatch(/MERCENTA-ARRANGED|Freight Prepaid/i);
    // Mercenta must never be described as owning the channel-arranged carrier.
    expect(body).not.toMatch(/Mercenta (selects|chooses|owns) Amazon/i);

    await page.locator('[data-testid^="logistics-row-"]').first().click();
    await expect(page.getByTestId('logistics-inspector')).toBeVisible();
  });

  test('7. no horizontal overflow at any required viewport', async ({ page }) => {
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
        await expect(page.getByTestId('logistics-scope-count')).toBeVisible();
        await page.screenshot({ path: `${SHOTS}/03-mobile-390.png`, fullPage: false });
      }
    }
  });

  test('8. tenant isolation — one brand never sees another brand’s consignments', async ({
    browser,
  }) => {
    const a = await browser.newContext();
    const pa = await a.newPage();
    expect((await openSeededLogistics(pa, 'Astonish', 'brand-astonish')).ok).toBe(true);
    const aIds = await pa
      .locator('[data-testid^="logistics-row-"]')
      .evaluateAll((els) => els.map((e) => e.getAttribute('data-testid')));
    const aText = await pa
      .locator('[data-testid^="logistics-row-"]')
      .evaluateAll((els) => els.map((e) => e.textContent ?? ''));
    await a.close();

    const b = await browser.newContext();
    const pb = await b.newPage();
    await openLogistics(pb, 'Tapatío');
    const bIds = await pb
      .locator('[data-testid^="logistics-row-"]')
      .evaluateAll((els) => els.map((e) => e.getAttribute('data-testid')));
    const bRows = await pb.locator('[data-testid^="logistics-row-"]').count();
    const bText = await pb
      .locator('[data-testid^="logistics-row-"]')
      .evaluateAll((els) => els.map((e) => e.textContent ?? ''));
    await b.close();

    expect(aIds.length).toBeGreaterThan(0);
    /**
     * §RUNTIME PARITY — REPOINTED (2026-09-21), UNCHANGED by §BATCH 3: the
     * assertion is made WITH data on both sides, so the isolation rule is proved
     * rather than a property of an empty seed.
     */
    expect(bRows).toBeGreaterThan(0);
    expect(aIds.filter((id) => bIds.includes(id))).toEqual([]);
    const bJoined = bText.join(' \n ');
    expect(bJoined).not.toMatch(/PO-9200|PO-9201|PO-9202/);
    expect(bJoined).toMatch(/PO-9210|PO-9211|PO-9212/);
    expect(aText.join(' \n ')).not.toMatch(/PO-9210|PO-9211|PO-9212/);
  });


  test('9. the Waybill / Labels / Track artefacts still open and close', async ({ page }) => {
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

  test('10. search narrows the list', async ({ page }) => {
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

    const after = await page.locator('[data-testid^="logistics-row-"]').count();
    expect(after).toBeLessThanOrEqual(before);

    await page.getByTestId('logistics-search').fill('');
    await expect.poll(async () => page.locator('[data-testid^="logistics-row-"]').count()).toBe(before);
    expect(pageErrors).toEqual([]);
  });

  /**
   * §P5 — THE ARRIVAL IS THE DESTINATION FC ON THE PURCHASE ORDER.
   *
   * The platform used to route every consignment to a Mercenta UK hub. §BATCH 3
   * removed the map that used to DRAW this, so the DOM assertions become an
   * absence guard (no hub node, and the map that drew FC nodes is gone), while
   * the DOMAIN assertion — every consignment's destination is the FC its OWN
   * purchase order declares — is unchanged and still proved from the canonical
   * store, not from a rendered label.
   */
  test('11. §P5 — no Mercenta-hub node, and every destination is its PO’s declared FC', async ({
    page,
  }) => {
    const seed = await openSeededLogistics(page);
    expect(seed.ok, JSON.stringify(seed)).toBe(true);

    expect(await page.locator('[data-kind="mercenta_hub"]').count()).toBe(0);
    // The map that used to draw FC nodes is gone with the map.
    expect(await page.locator('[data-kind="amazon_fc"]').count()).toBe(0);

    const body = await page.locator('[data-workspace-frame]').first().innerText();
    expect(body).not.toMatch(/Mercenta\s+(UK\s+)?(Distribution\s+)?Hub/i);

    const mismatches = await page.evaluate(async () => {
      const store = await import('/src/data/demoStore.ts');
      const dest = await import('/src/config/destinationFc.ts');
      const bad: string[] = [];
      for (const s of store.demoShipments) {
        const po = store.demoPurchaseOrders.find((p) => p.poNumber === s.poNumber);
        const declared = po ? dest.destinationLabelForPo(po) : null;
        if (!po || !declared) {
          bad.push(`${s.id}: no purchase order declares a destination`);
          continue;
        }
        if (declared !== s.destination) {
          bad.push(`${s.id}: destination "${s.destination}" != PO's "${declared}"`);
        }
        if (/mercenta/i.test(s.destination)) {
          bad.push(`${s.id}: Mercenta-owned destination "${s.destination}"`);
        }
      }
      return bad;
    });
    expect(mismatches).toEqual([]);
  });
});


/**
 * §LOGISTICS HUB — ADMIN CONTROL, THE SAME ABSENCE GUARD.
 *
 * The Mercenta-side counterpart used the SAME canvas. §BATCH 3 removed it there
 * too; selection now comes from the consignment TABLE (the inspector would
 * otherwise have become unreachable). These tests prove the admin map is gone
 * and that the table still drives the inspector.
 */
test.describe('Admin Logistics Hub — the operational map is GONE', () => {
  async function openAdminLogistics(page: Page) {
    await loginAs(page, 'Mercenta Admin Hub', 1400);
    await dismissTour(page);
    await page.click('nav[aria-label="Primary"] >> text=Logistics Hub');
    await page.getByTestId('logistics-focus-all').waitFor({ timeout: 15000 });
    await dismissTour(page);
  }

  test('A. the admin surface renders and its map is gone', async ({ page }) => {
    const pageErrors: string[] = [];
    const externalCalls = watchExternalCalls(page);
    page.on('pageerror', (e) => pageErrors.push(String(e)));

    await openAdminLogistics(page);
    await expect(page.getByTestId('logistics-focus-all')).toBeVisible();
    await expectMapAbsent(page);
    await page.screenshot({ path: `${SHOTS}/04-admin-1440.png`, fullPage: false });

    expect(pageErrors).toEqual([]);
    expect(externalCalls).toEqual([]);
  });

  test('B. a consignment created through the real PO lifecycle appears in the admin table and opens the inspector', async ({
    page,
  }) => {
    await openLogin(page);
    const seeded = await seedConsignment(page, 'brand-astonish');
    expect(seeded.ok, JSON.stringify(seeded)).toBe(true);
    await page.click('text=Mercenta Admin Hub');
    await page.waitForTimeout(1600);
    await dismissTour(page);
    await page.click('nav[aria-label="Primary"] >> text=Logistics Hub');
    await page.getByTestId('logistics-focus-all').waitFor({ timeout: 15000 });
    await dismissTour(page);

    const table = page.locator('[data-table^="logistics-"]').first();
    await expect(table.locator('tbody tr').first()).toBeVisible();
    expect(await table.locator('tbody tr').count()).toBeGreaterThan(0);

    // §BATCH 3 — selection now comes from the TABLE (the map that used to drive it is gone).
    await table.locator('tbody tr').first().click();
    await expect(page.getByTestId('admin-logistics-inspector')).toBeVisible();
    await expect(page.getByTestId('admin-logistics-truth-reason')).toContainText(
      /simulation|provider|ambient|live/i
    );
  });
});

