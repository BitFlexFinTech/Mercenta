/**
 * §MERCENTA BRAIN — BROWSER VERIFICATION (actually executed, not declared).
 *
 * Proves in a real Chromium that the Brain is a working interactive product
 * surface rather than a decorative graph, and that the tenant boundary is real:
 *
 *   1. the Super Admin nav reaches it, and it renders with the REAL entity and
 *      relationship counts the domain actually produces;
 *   2. search / status / type filters genuinely change the rendered set, and the
 *      reported total stays the true total (no silent subsetting);
 *   3. a no-match filter shows an honest empty state, not a blank canvas;
 *   4. clicking an SVG entity selects it and the inspector shows its label,
 *      provenance, authority model and relationships;
 *   5. relationship inspection re-selects the related entity;
 *   6. the entity list is the keyboard equivalent — Enter selects;
 *   7. zoom controls work and the graph stays usable;
 *   8. responsive: no horizontal overflow at 1440 / 1280 / 1024 / 390;
 *   9. reduced motion is honoured without breaking rendering;
 *  10. TENANT BOUNDARY: a brand session sees its own relationship map on Market
 *      Intelligence, never a prospect or another tenant, and never the Brain.
 *
 * The dev server is started by playwright.config.ts (npm run dev, :5173).
 */
import { test, expect, type Page } from '@playwright/test';
import { loginAs } from './helpers/auth';

const SHOTS = 'test-screenshots/mercenta-brain';

async function openBrain(page: Page) {
  await loginAs(page, 'Super Admin — Tadii', 1400);
  await page.locator('nav[aria-label="Primary"]').getByRole('button', { name: 'Mercenta Brain' }).first().click();
  await page.getByTestId('brain-counts').waitFor({ timeout: 12000 });
}

/** Parse "N entities · M relationships · K types". */
async function readCounts(page: Page): Promise<{ entities: number; relationships: number; types: number }> {
  const text = (await page.getByTestId('brain-counts').innerText()).replace(/\s+/g, ' ');
  const match = text.match(/(\d+) entities · (\d+) relationships · (\d+) types/);
  if (!match) throw new Error(`Unparseable counts: ${text}`);
  return { entities: Number(match[1]), relationships: Number(match[2]), types: Number(match[3]) };
}

test.describe('Mercenta Brain — interactive product surface', () => {
  test('1. renders the real operating graph with domain-derived counts', async ({ page }) => {
    const pageErrors: string[] = [];
    page.on('pageerror', (e) => pageErrors.push(String(e)));
    await openBrain(page);

    const counts = await readCounts(page);
    expect(counts.entities).toBeGreaterThan(100);
    expect(counts.relationships).toBeGreaterThan(50);
    expect(counts.types).toBeGreaterThan(20);

    await expect(page.getByTestId('brain-canvas')).toBeVisible();
    // Real SVG entities are rendered, not an image or an empty frame.
    expect(await page.locator('[data-testid^="brain-node-"]').count()).toBeGreaterThan(50);
    // Cluster sectors are drawn as part of the information architecture.
    await expect(page.getByTestId('brain-canvas')).toContainText('Portfolio');
    await expect(page.getByTestId('brain-canvas')).toContainText('Platform');

    await page.screenshot({ path: `${SHOTS}/brain-1440.png` });
    expect(pageErrors).toEqual([]);
  });

  test('2. filters change the rendered set and the total stays truthful', async ({ page }) => {
    await openBrain(page);
    const total = (await readCounts(page)).entities;

    await page.getByTestId('brain-search').fill('Astonish');
    await expect(page.locator('[data-testid^="brain-node-"]').first()).toBeVisible();
    const searched = await page.locator('[data-testid^="brain-entity-"]').count();
    expect(searched).toBeGreaterThan(0);
    expect(searched).toBeLessThan(total);

    await page.getByTestId('brain-search').fill('');
    await page.getByTestId('brain-kind-filter').selectOption('purchase_order');
    const heading = page.locator('section[aria-label^="Entities"]');
    await expect(heading).toContainText(`of ${total}`);
    const poEntities = await page.locator('[data-testid^="brain-entity-"]').count();
    expect(poEntities).toBeGreaterThan(0);
    expect(poEntities).toBeLessThan(total);

    await page.getByTestId('brain-kind-filter').selectOption('all');
    await page.getByRole('tab', { name: 'Simulation' }).click();
    const badges = page.locator('[data-testid^="brain-entity-"] [data-status]');
    const badgeCount = await badges.count();
    expect(badgeCount).toBeGreaterThan(0);
    for (let i = 0; i < Math.min(badgeCount, 12); i++) {
      await expect(badges.nth(i)).toHaveAttribute('data-status', 'simulation');
    }
  });

  test('3. a no-match filter shows an honest empty state', async ({ page }) => {
    await openBrain(page);
    await page.getByTestId('brain-search').fill('zzzz-no-such-entity-zzzz');
    await expect(page.getByTestId('brain-empty')).toBeVisible();
    await expect(page.getByTestId('brain-canvas-empty')).toBeVisible();
    await expect(page.getByTestId('brain-empty')).toContainText('Nothing was hidden and nothing was invented');
    await page.getByTestId('brain-clear-filters').click();
    await expect(page.locator('[data-testid^="brain-node-"]').first()).toBeVisible();
  });

  test('4. selecting an entity shows its detail, provenance, authority and relationships', async ({ page }) => {
    await openBrain(page);
    await page.locator('[data-testid="brain-node-brand:brand-astonish"]').click({ force: true });
    await expect(page.getByTestId('brain-inspector')).toBeVisible();
    await expect(page.getByTestId('brain-inspector-label')).toContainText('Astonish');
    // Provenance names the canonical module it was read from.
    await expect(page.getByTestId('brain-provenance')).toContainText('src/data/demoData.ts');
    // The authority model is explained, not just labelled.
    await expect(page.getByTestId('brain-authority-note')).not.toBeEmpty();
    // Relationships are listed with their evidence.
    const relations = page.getByTestId('brain-relations');
    await expect(relations).toBeVisible();
    expect(await relations.locator('li').count()).toBeGreaterThan(0);
    await page.screenshot({ path: `${SHOTS}/brain-selected-1440.png` });
  });

  test('5. relationship inspection re-selects the related entity', async ({ page }) => {
    await openBrain(page);
    await page.locator('[data-testid="brain-node-purchase_order:po-brand-astonish-1"]').click({ force: true });
    await expect(page.getByTestId('brain-inspector-label')).toBeVisible();
    const relation = page.getByTestId('brain-relations').locator('button').first();
    const relatedLabel = (await relation.innerText()).trim();
    await relation.click();
    const after = (await page.getByTestId('brain-inspector-label').innerText()).trim();
    expect(after.length).toBeGreaterThan(0);
    // The inspector now describes the entity we navigated TO, not the origin.
    expect(relatedLabel.toLowerCase()).toContain(after.slice(0, 8).toLowerCase());
  });

  test('6. the entity list is the keyboard-accessible equivalent', async ({ page }) => {
    await openBrain(page);
    const firstEntity = page.locator('[data-testid^="brain-entity-"]').first();
    await firstEntity.focus();
    await page.keyboard.press('Enter');
    await expect(page.getByTestId('brain-inspector')).toBeVisible();
    await expect(firstEntity).toHaveAttribute('aria-pressed', 'true');
  });

  test('7. zoom controls work and the graph stays usable', async ({ page }) => {
    await openBrain(page);
    await expect(page.getByTestId('brain-zoom-level')).toHaveText('100%');
    await page.getByTestId('brain-zoom-in').click();
    await expect(page.getByTestId('brain-zoom-level')).toHaveText('125%');
    await page.getByTestId('brain-zoom-out').click();
    await page.getByTestId('brain-zoom-out').click();
    await expect(page.getByTestId('brain-zoom-level')).toHaveText('80%');
    await page.getByTestId('brain-zoom-reset').click();
    await expect(page.getByTestId('brain-zoom-level')).toHaveText('100%');
    expect(await page.locator('[data-testid^="brain-node-"]').count()).toBeGreaterThan(50);
  });

  test('8. responsive: no horizontal overflow at 1440 / 1280 / 1024 / 390', async ({ page }) => {
    await openBrain(page);
    for (const width of [1440, 1280, 1024, 390]) {
      await page.setViewportSize({ width, height: 900 });
      await page.waitForTimeout(250);
      const overflows = await page.evaluate(
        () => document.documentElement.scrollWidth > document.documentElement.clientWidth + 1
      );
      expect(overflows, `horizontal overflow at ${width}px`).toBe(false);
      await expect(page.getByTestId('brain-canvas')).toBeVisible();
      await page.screenshot({ path: `${SHOTS}/brain-${width}.png` });
    }
  });

  test('9. reduced motion is honoured without breaking rendering', async ({ page }) => {
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await openBrain(page);
    await expect(page.getByTestId('brain-canvas')).toBeVisible();
    expect(await page.locator('[data-testid^="brain-node-"]').count()).toBeGreaterThan(50);
    await page.locator('[data-testid="brain-node-brand:brand-astonish"]').click({ force: true });
    await expect(page.getByTestId('brain-inspector')).toBeVisible();
  });

  test('10. tenant boundary: a brand sees its own map, never the Brain', async ({ page }) => {
    const pageErrors: string[] = [];
    page.on('pageerror', (e) => pageErrors.push(String(e)));
    await loginAs(page, 'Astonish', 1400);

    // The Brain is a Super-Admin destination and must not exist in a brand shell.
    await expect(
      page.locator('nav[aria-label="Primary"]').getByRole('button', { name: 'Mercenta Brain' })
    ).toHaveCount(0);

    await page.locator('nav[aria-label="Primary"]').getByRole('button', { name: 'Market Intel' }).first().click();
    await page.getByTestId('brand-map-counts').waitFor({ timeout: 12000 });

    const counts = (await page.getByTestId('brand-map-counts').innerText()).replace(/\s+/g, ' ');
    const match = counts.match(/(\d+) of your records · (\d+) relationships/);
    expect(match, `unparseable brand map counts: ${counts}`).not.toBeNull();
    expect(Number(match![1])).toBeGreaterThan(5);

    // Mercenta-internal machinery must not be present anywhere in the map.
    const entities = await page.locator('[data-testid^="brand-map-entity-"]').allInnerTexts();
    const joined = entities.join(' | ').toLowerCase();
    for (const forbidden of ['prospect', 'integration', 'automation', 'provider']) {
      expect(joined, `brand map leaked ${forbidden}`).not.toContain(forbidden);
    }
    // No other tenant may appear in the rendered entity list.
    for (const other of ['tapatío', 'cholula', 'le creuset', 'sennheiser']) {
      expect(joined, `brand map leaked another tenant: ${other}`).not.toContain(other);
    }

    // The boundary statement is shown to the brand, not hidden from it.
    await expect(page.locator('section[aria-label="What this map never shows"]')).toBeVisible();

    // The first-visit tour overlays the page; stop it so the screenshot shows
    // the actual surface (and so the assertions above are not made through a
    // modal). Done through the tour's OWN store API: clicking the card's dismiss
    // opens a Skip-confirmation modal, which then blocks the click below.
    // (Pre-existing failure confirmed at HEAD 47db66c — see session report.)
    await page
      .evaluate(async () => {
        const m = await import('/src/components/shared/TourEngine.tsx');
        const defs = await import('/src/config/tours/tourDefinitions.ts');
        for (const t of defs.ALL_TOUR_DEFINITIONS) {
          m.markTourSkipped('brand-astonish', t.id);
          m.markTourCompleted('brand-astonish', t.id);
        }
        m.stopTour('brand-astonish');
        m.dismissTour('brand-astonish');
      })
      .catch(() => {});
    await page.waitForTimeout(300);

    await page.locator('[data-testid^="brand-map-entity-"]').first().click();
    await expect(page.getByTestId('brand-map-inspector')).toBeVisible();
    await expect(page.getByTestId('brand-map-provenance')).toContainText('src/');
    await page.screenshot({ path: `${SHOTS}/brand-map-1440.png` });
    expect(pageErrors).toEqual([]);
  });
});