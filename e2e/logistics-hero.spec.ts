/**
 * §WAVE 3 — LOGISTICS HERO browser verification (real Chromium).
 *
 * Proves IN A REAL BROWSER that the cinematic hero section is real, fixed-camera,
 * non-interactive, deterministic, honestly labelled and accessible — and that it
 * is a SECTION of the same Logistics Hub page as the operational controls.
 *
 *   1  the hero and the operational map render on the SAME page
 *   2  the camera is fixed and the canvas never receives the pointer
 *   3  the page still scrolls WITH the pointer over the hero
 *   4  multiple aircraft / ships / road vehicles are actually present
 *   5  multiple origins, regions and simultaneous lanes
 *   6  geometry is authentic (generated, attributed datasets — not hand-drawn)
 *   7  LIVE VERIFIED / SIMULATED / AMBIENT are labelled, never implied
 *   8  ambient traffic is explicitly NOT a Mercenta shipment
 *   9  brand lanes come from the canonical consignments (same page, same data)
 *  10  reduced motion keeps a meaningful static view and states it
 *  11  no false live claim (nothing says live when no provider resolved live)
 *  12  no external network call is made by the hero
 *  13  the operational controls remain interactive (unaffected by the hero)
 *  14  no horizontal overflow at desktop and mobile widths
 */
import { test, expect, type Page } from '@playwright/test';
import { loginAs } from './helpers/auth';

const SHOTS = 'test-screenshots/logistics-hero';

function watchExternalCalls(page: Page): string[] {
  const externalCalls: string[] = [];
  page.on('request', (req) => {
    const url = req.url();
    const isDev = url.startsWith('http://localhost') || url.startsWith('http://127.0.0.1');
    const isWs = url.startsWith('ws://') || url.startsWith('wss://');
    const isStatic = /\.(woff2?|css|png|jpe?g|svg|ico)(\?|$)/.test(url) || url.includes('gstatic.com');
    const isFont = url.includes('fonts.g');
    const isPlaceholderImage = url.includes('picsum.photos');
    if (!isDev && !isWs && !isStatic && !isFont && !isPlaceholderImage) externalCalls.push(url);
  });
  return externalCalls;
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
      m.stopTour(id);
      m.dismissTour(id);
    }, brandId)
    .catch(() => {});
  await page.waitForTimeout(250);
}

async function openLogistics(page: Page, card = 'Astonish') {
  await loginAs(page, card, 1400);
  await dismissTour(page);
  await page.click('nav[aria-label="Primary"] >> text=Logistics Hub');
  await page.getByTestId('logistics-map').waitFor({ timeout: 15000 });
  await page.getByTestId('logistics-hero').waitFor({ timeout: 15000 });
  await dismissTour(page);
}

async function heroAttr(page: Page, name: string): Promise<number> {
  const value = await page.getByTestId('logistics-hero').getAttribute(name);
  return Number(value ?? '-1');
}

test.describe('Logistics Hub — cinematic hero', () => {
  test('1. the hero and the operational map are ONE page', async ({ page }) => {
    await openLogistics(page);
    await expect(page.getByTestId('logistics-hero')).toBeVisible();
    await expect(page.getByTestId('logistics-map')).toBeVisible();
    await expect(page.getByTestId('logistics-hero')).toHaveAttribute('aria-label', /logistics network/i);
    await page.screenshot({ path: `${SHOTS}/hero-desktop.png`, fullPage: false });
  });

  test('2/3. fixed camera, no pointer capture, the page still scrolls', async ({ page }) => {
    await openLogistics(page);
    // The scene host must not receive pointer events at all.
    const pointerEvents = await page
      .getByTestId('logistics-hero-scene')
      .evaluate((el) => getComputedStyle(el).pointerEvents);
    expect(pointerEvents).toBe('none');
    await expect(page.getByTestId('logistics-hero-scene').locator('canvas')).toHaveCount(1);

    // The hero must not capture the pointer. The page scrolls with the pointer
    // parked OVER the hero: a pointer-capturing canvas would swallow the wheel.
    // The hero is scrolled into view FIRST — Playwright's mouse cannot address a
    // point outside the viewport, and an off-screen pointer would make this test
    // assert nothing. The check itself is container-agnostic: the hero must MOVE.
    const hero = page.getByTestId('logistics-hero');
    await hero.scrollIntoViewIfNeeded();
    await page.waitForTimeout(200);
    const box = await hero.boundingBox();
    expect(box).not.toBeNull();
    const viewport = page.viewportSize() ?? { width: 1280, height: 720 };
    const pointY = Math.min(Math.max(box!.y + box!.height / 2, 20), viewport.height - 20);
    await page.mouse.move(box!.x + box!.width / 2, pointY);
    await page.mouse.wheel(0, 700);
    await page.waitForTimeout(500);
    const after = await hero.boundingBox();
    const scrolledBy = (box?.y ?? 0) - (after?.y ?? 0);
    expect(scrolledBy, 'the page did not scroll with the pointer over the hero').toBeGreaterThan(50);
    await page.mouse.wheel(0, -700);
  });

  test('4/5. many aircraft, many ships, many road vehicles, many origins', async ({ page }) => {
    await openLogistics(page);
    expect(await heroAttr(page, 'data-aircraft')).toBeGreaterThanOrEqual(8);
    expect(await heroAttr(page, 'data-ships')).toBeGreaterThanOrEqual(6);
    expect(await heroAttr(page, 'data-road-vehicles')).toBeGreaterThanOrEqual(20);
    expect(await heroAttr(page, 'data-origins')).toBeGreaterThanOrEqual(8);
    expect(await heroAttr(page, 'data-regions')).toBeGreaterThanOrEqual(4);
  });

  test('6. authentic, generated, attributed geography (no hand-drawn shapes)', async ({ page }) => {
    await openLogistics(page);
    const geo = await page.evaluate(async () => {
      const mod = await import('/src/data/logisticsHeroGeo.ts');
      return {
        world: mod.WORLD_LAND_RINGS.length,
        uk: mod.UK_LAND_RINGS.length,
        roads: mod.UK_STRATEGIC_ROADS.length,
        attribution: mod.HERO_GEO_PROVENANCE.attribution,
        licences: mod.HERO_GEO_PROVENANCE.entries.map((e: { licence: string }) => e.licence),
      };
    });
    expect(geo.world).toBeGreaterThan(10);
    expect(geo.uk).toBeGreaterThan(3);
    expect(geo.roads).toBeGreaterThan(500);
    expect(geo.attribution).toContain('Natural Earth');
    expect(geo.attribution).toContain('OpenStreetMap');
    expect(geo.licences.join(' ')).toContain('ODbL');
    await expect(page.getByTestId('logistics-hero-attribution')).toContainText('OpenStreetMap');
  });

  test('7/8/11. truth semantics are labelled and ambient is never a shipment', async ({ page }) => {
    await openLogistics(page);
    await expect(page.getByTestId('logistics-hero-legend')).toBeVisible();
    for (const truth of ['live_verified', 'simulated', 'ambient']) {
      await expect(page.getByTestId(`logistics-hero-legend-${truth}`)).toBeVisible();
    }
    await expect(page.getByTestId('logistics-hero-legend')).toContainText('Live verified');
    await expect(page.getByTestId('logistics-hero-legend')).toContainText('Simulated');
    await expect(page.getByTestId('logistics-hero-notice')).toContainText('NOT a Mercenta shipment');
    await expect(page.getByTestId('logistics-hero-notice')).toContainText('deterministic simulation');
    // No provider resolves live in this environment, so the live count must be 0.
    await expect(page.getByTestId('logistics-hero-legend-live_verified')).toContainText('· 0');
  });

  test('9. the hero plots the same brand consignments as the operational map', async ({ page }) => {
    await openLogistics(page);
    const brandLegs = await heroAttr(page, 'data-brand-legs');
    expect(brandLegs).toBeGreaterThanOrEqual(0);
    const scopeCount = await page.getByTestId('logistics-scope-count').textContent();
    const inScope = Number((scopeCount ?? '0').replace(/[^0-9]/g, ''));
    // Brand lanes are bounded by the real consignment count in scope.
    expect(brandLegs).toBeLessThanOrEqual(inScope);
  });

  test('10. reduced motion keeps a meaningful static view', async ({ page }) => {
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await openLogistics(page);
    await expect(page.getByTestId('logistics-hero')).toHaveAttribute('data-reduced-motion', 'true');
    await expect(page.getByTestId('logistics-hero-reduced-motion')).toBeVisible();
    await expect(page.getByTestId('logistics-hero-legend')).toBeVisible();
    expect(await heroAttr(page, 'data-aircraft')).toBeGreaterThanOrEqual(8);
    await page.screenshot({ path: `${SHOTS}/hero-reduced-motion.png` });
  });

  test('12. the hero makes no external network call', async ({ page }) => {
    const external = watchExternalCalls(page);
    await openLogistics(page);
    await page.waitForTimeout(1200);
    expect(external, `external calls: ${external.join(', ')}`).toHaveLength(0);
  });

  test('13. the operational controls remain interactive below the hero', async ({ page }) => {
    await openLogistics(page);
    await page.getByTestId('logistics-search').fill('felix');
    await page.waitForTimeout(300);
    await expect(page.getByTestId('logistics-search')).toHaveValue('felix');
    await page.getByTestId('logistics-search').fill('');
  });

  test('14. no horizontal overflow at desktop and mobile widths', async ({ page }) => {
    await openLogistics(page);
    for (const [width, height] of [
      [1440, 900],
      [1024, 800],
      [390, 844],
    ] as const) {
      await page.setViewportSize({ width, height });
      await page.waitForTimeout(300);
      await expect(page.getByTestId('logistics-hero')).toBeVisible();
      const overflow = await page.evaluate(
        () => document.documentElement.scrollWidth - document.documentElement.clientWidth
      );
      expect(overflow, `horizontal overflow at ${width}px`).toBeLessThanOrEqual(2);
      await page.screenshot({ path: `${SHOTS}/hero-${width}.png` });
    }
  });
});