/**
 * §P8 — INVENTORY + CHANNEL IDENTIFIER browser verification.
 *
 * Real Chromium walkthrough of the P8 surfaces against actual application state
 * (no stubs):
 *   1  the brand's Inventory surface is LINKED TO THE CATALOGUE and shows the
 *      decision-5 set (SKU · ASIN · UoM · on-hand · committed · inbound ·
 *      available · safety stock) with the rule stated
 *   2  recording a movement in the surface CHANGES the derived figures — the
 *      ledger is the only source, so on-hand moves by exactly what was recorded
 *   3  decision 10 behaves: a declaration without the existing-listing
 *      confirmation is refused, a simulated placeholder is refused, and a valid
 *      declaration is recorded with its source
 *   4  the admin catalogue carries the derived position and the attributed
 *      override (which requires a reason)
 *
 * Zero external network calls; `pageErrors === []` asserted throughout.
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

/** The brand tenant the demo login resolves to. */
const BRAND = 'brand-astonish';

/** Open the brand's Inventory destination. */
async function openInventory(page: import('@playwright/test').Page) {
  await loginAs(page, 'Astonish', 1500);
  await page.click('nav[aria-label="Primary"] >> text=Inventory');
  await page.waitForTimeout(900);
  await expect(page.getByTestId('inventory-summary')).toBeVisible({ timeout: 10000 });
}

/** The first catalogue SKU of the brand, read from the live build. */
async function firstSku(page: import('@playwright/test').Page): Promise<string> {
  return page.evaluate(async (brandId) => {
    const store = await import('/src/data/demoStore.ts');
    return store.productsForBrandFromStore(brandId)[0]?.sku ?? '';
  }, BRAND);
}

/**
 * A SKU with NO identifier yet (the only legitimate target for a BRAND
 * declaration, since a channel-assigned identifier outranks it) …
 */
async function skuWithoutIdentifier(page: import('@playwright/test').Page): Promise<string> {
  return page.evaluate(async (brandId) => {
    const store = await import('/src/data/demoStore.ts');
    const products = store.productsForBrandFromStore(brandId);
    const free = products.find((p) => !store.getProductIdentifier(brandId, p.sku));
    return free?.sku ?? '';
  }, BRAND);
}

/** … and one that already has a channel-assigned identifier. */
async function skuWithChannelIdentifier(page: import('@playwright/test').Page): Promise<string> {
  return page.evaluate(async (brandId) => {
    const store = await import('/src/data/demoStore.ts');
    const products = store.productsForBrandFromStore(brandId);
    const taken = products.find((p) => {
      const i = store.getProductIdentifier(brandId, p.sku);
      return i && i.source === 'channel_assigned';
    });
    return taken?.sku ?? '';
  }, BRAND);
}

/** The derived on-hand the CANONICAL owner reports, read from the live build. */
async function onHandOf(page: import('@playwright/test').Page, sku: string): Promise<number | null> {
  return page.evaluate(
    async (input) => {
      const mod = await import('/src/lib/inventory/inventoryLifecycle.ts');
      const res = mod.inventoryForProduct(input.brandId, input.sku, {
        staffId: `brand:${input.brandId}`,
        canMutate: false,
        tenantId: input.brandId,
      });
      return res.ok ? res.value.onHand : null;
    },
    { brandId: BRAND, sku }
  );
}

/** Open the Manage panel for one SKU. */
async function manage(page: import('@playwright/test').Page, sku: string) {
  await page.locator('tr', { hasText: sku }).first().getByRole('button', { name: /Manage/ }).click();
  await expect(page.getByTestId('inventory-movement-form')).toBeVisible({ timeout: 8000 });
}

test.describe('P8 — inventory + the channel identifier', () => {
  test('1. brand: the Inventory surface is linked to the catalogue and states the rule', async ({ page }) => {
    const externalCalls = watchExternalCalls(page);
    const pageErrors: string[] = [];
    page.on('pageerror', (e) => pageErrors.push(String(e)));

    await openInventory(page);

    // Decision 5 — the set of fields is present in the live surface.
    await expect(page.getByText('On hand', { exact: false }).first()).toBeVisible();
    await expect(page.getByText('Committed', { exact: false }).first()).toBeVisible();
    await expect(page.getByText('Safety stock', { exact: false }).first()).toBeVisible();
    await expect(page.getByText('ASIN', { exact: false }).first()).toBeVisible();

    // The rule is stated where the figures are handled, and so is the basis.
    const rules = page.getByTestId('inventory-rules');
    await expect(rules).toBeVisible();
    await expect(rules).toContainText('append-only movement ledger');
    await expect(page.getByTestId('inventory-asin-rules')).toContainText(
      'already exists on the channel'
    );

    // The identifier column exists for every catalogue product.
    await expect(page.locator('[data-testid^="inventory-asin-"]').first()).toBeVisible();

    expect(pageErrors).toEqual([]);
    expect(externalCalls).toEqual([]);
  });

  test('2. brand: a recorded movement changes the DERIVED on-hand figure', async ({ page }) => {
    const externalCalls = watchExternalCalls(page);
    const pageErrors: string[] = [];
    page.on('pageerror', (e) => pageErrors.push(String(e)));

    await openInventory(page);
    const sku = await firstSku(page);
    expect(sku).not.toBe('');

    const before = await onHandOf(page, sku);
    expect(before).not.toBeNull();

    // Manage that product, then record a receipt of 5 eaches through the surface.
    await manage(page, sku);
    await page
      .locator('[data-testid="inventory-movement-form"] input[type="number"]')
      .first()
      .fill('5');
    await page.getByRole('button', { name: 'Record movement' }).click();

    await expect(page.getByTestId('inventory-notice')).toContainText('Stock received', {
      timeout: 8000,
    });

    const after = await onHandOf(page, sku);
    expect(after).toBe((before as number) + 5);

    // The ledger (the provenance) now shows the movement.
    await expect(page.getByTestId('inventory-ledger')).toContainText('Stock received');

    expect(pageErrors).toEqual([]);
    expect(externalCalls).toEqual([]);
  });

  test('3. brand: decision 10 — the confirmation, the placeholder refusal and a valid declaration', async ({ page }) => {
    const externalCalls = watchExternalCalls(page);
    const pageErrors: string[] = [];
    page.on('pageerror', (e) => pageErrors.push(String(e)));

    await openInventory(page);
    const sku = await skuWithoutIdentifier(page);
    expect(sku).not.toBe('');
    await manage(page, sku);

    const asinForm = page.getByTestId('inventory-asin-form');
    await expect(asinForm).toBeVisible({ timeout: 8000 });
    const asinInput = asinForm.locator('input:not([type="checkbox"])').first();

    // (a) without the confirmation the declaration is refused
    await asinInput.fill('B0ABCDEFGH');
    await asinForm.getByRole('button', { name: 'Add ASIN' }).click();
    await expect(page.getByTestId('inventory-error')).toContainText(
      'ASIN_REQUIRES_EXISTING_LISTING',
      { timeout: 8000 }
    );

    // (b) the simulated placeholder may never be supplied as a real identifier.
    // The canonical `Checkbox` primitive keeps its input `sr-only` behind the
    // styled label, so the USER path (clicking the label) is what the spec
    // exercises here — clicking the hidden input directly is not a user action.
    await asinForm.getByText('This product already exists on the channel').click();
    await asinInput.fill('SIM-ASIN-NOPE');
    await asinForm.getByRole('button', { name: 'Add ASIN' }).click();
    await expect(page.getByTestId('inventory-error')).toContainText('ASIN_PLACEHOLDER', {
      timeout: 8000,
    });

    // (c) a valid declaration for an existing listing is recorded
    await asinInput.fill('b0abcdefgh');
    await asinForm.getByRole('button', { name: 'Add ASIN' }).click();
    await expect(page.getByTestId('inventory-notice')).toContainText('identifier recorded', {
      timeout: 8000,
    });
    await expect(page.getByTestId(`inventory-asin-${sku}`)).toContainText('B0ABCDEFGH');

    // (d) a channel-assigned identifier OUTRANKS a brand declaration: the brand
    // cannot quietly downgrade the identity the channel assigned.
    const taken = await skuWithChannelIdentifier(page);
    expect(taken).not.toBe('');
    await manage(page, taken);
    const takenForm = page.getByTestId('inventory-asin-form');
    await takenForm.getByText('This product already exists on the channel').click();
    await takenForm.locator('input:not([type="checkbox"])').first().fill('B0BRANDXXX');
    await takenForm.getByRole('button', { name: 'Add ASIN' }).click();
    await expect(page.getByTestId('inventory-error')).toContainText('ASIN_AUTHORITY_ORDER', {
      timeout: 8000,
    });

    expect(pageErrors).toEqual([]);
    expect(externalCalls).toEqual([]);
  });

  test('4. admin: the catalogue carries the derived position and the attributed override', async ({ page }) => {
    const externalCalls = watchExternalCalls(page);
    const pageErrors: string[] = [];
    page.on('pageerror', (e) => pageErrors.push(String(e)));

    await loginAs(page, 'Mercenta Admin Hub', 1400);
    await page.click('nav[aria-label="Primary"] >> text=Global Catalog');
    await page.waitForTimeout(900);

    // Open the first product's detail and switch to the §P8 Inventory tab.
    await page.locator('table tbody tr').first().click();
    await page.waitForTimeout(600);
    await page.getByRole('button', { name: 'Inventory', exact: true }).click();
    const tab = page.getByTestId('catalog-inventory-tab');
    await expect(tab).toBeVisible({ timeout: 8000 });
    await expect(tab).toContainText('derived from the ledger');
    await expect(tab).toContainText('never a channel reading');

    // The override requires a stated reason (refused by the domain, stated on screen).
    const overrideButton = page.locator('button[data-state="catalog-override-identifier"]').first();
    await overrideButton.click();
    await expect(page.getByTestId('catalog-inventory-notice')).toContainText(
      'ASIN_REASON_REQUIRED',
      { timeout: 8000 }
    );

    // With a reason it is recorded and audited.
    const overrideInputs = tab.locator('input');
    await overrideInputs.nth(0).fill('B0ADMINOVR');
    await overrideInputs.nth(1).fill('correcting a mis-keyed identifier');
    await overrideButton.click();
    await expect(page.getByTestId('catalog-inventory-notice')).toContainText('Identifier recorded', {
      timeout: 8000,
    });

    expect(pageErrors).toEqual([]);
    expect(externalCalls).toEqual([]);
  });

/**
 * §Wave-3 Part 4 gate — the inventory list shows a product's PICTURE, never the raw
 * image value as text. The product cell painted `product.image` — for a seeded demo
 * product that is a `https://picsum.photos/…` URL — as literal text inside a 32px
 * box, which overflowed 147px at 390px as garbled overlapping text. It renders
 * through the ONE owner (`ProductThumb`) now, as the catalogue already does.
 *
 * MUTATION PROOF: reverting the cell to `{p?.image ?? '📦'}` fails the text
 * assertion on both viewports.
 */
test('5. the inventory list renders thumbnails, never a raw image URL as text', async ({ page }) => {
  await loginAs(page, 'Astonish', 1500);
  await openInventory(page);

  // Desktop — the semantic table carries no URL as text.
  const table = page.locator('table[data-table="brand-inventory"]');
  await expect(table).toBeVisible({ timeout: 8000 });
  expect(await table.locator('tbody').innerText(), 'no table cell paints a URL').not.toMatch(
    /https?:\/\//i
  );

  // Mobile — the canonical card list is where the defect was visible.
  await page.setViewportSize({ width: 390, height: 844 });
  await page.waitForTimeout(800);
  await expect(page.locator('main ul li').first()).toBeVisible();
  expect(await page.locator('main').innerText(), 'no card paints a URL').not.toMatch(/https?:\/\//i);

  const thumbSrcs = await page
    .locator('main ul li img')
    .evaluateAll((els) => els.map((e) => (e as HTMLImageElement).getAttribute('src') ?? ''));
  expect(thumbSrcs.length, 'the card list renders product thumbnails').toBeGreaterThan(0);
  for (const src of thumbSrcs) {
    expect(src, 'a thumbnail src is a real URL/data-URI').toMatch(/^(https?:\/\/|data:image\/)/i);
  }
});

});
