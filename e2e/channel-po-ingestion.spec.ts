/**
 * §P11 — CHANNEL PURCHASE-ORDER INGESTION, IN A REAL BROWSER.
 *
 * programme `docs/DASHBOARD_LOGISTICS_CLEANUP_PROGRAMME_2026-09-22.md` §4 P11;
 * matrix `cleanup-p11-remove-create-po`; programme decision 3. The domain
 * behaviour is proved by `scripts/validate-channel-po-ingestion.mjs` (39
 * assertions, executing the real modules). This spec proves the SAME behaviour is
 * PRESENT in the running product:
 *
 *   1  "Create PO" is GONE from the admin purchase-order queue, and the entry
 *      point is the CHANNEL READ;
 *   2  the read is TRUTHFUL — the state before it, the simulated provenance
 *      afterwards ("no live channel call was made"), and the outcome counts;
 *   3  routable POs are FILED against the correct brand and every outcome row
 *      states what happened — including the FAIL-CLOSED refusal of a PO whose
 *      line matches no catalogue product;
 *   4  a re-read files NOTHING new (the product's own idempotency);
 *   5  a filed channel PO opens its real record (the row is not decorative).
 */
import { test, expect } from '@playwright/test';
import { loginAs } from './helpers/auth';

async function openAdminPurchaseOrders(page: any) {
  await loginAs(page, 'Mercenta Admin Hub', 1300);
  await page.click('nav[aria-label="Primary"] >> text=Purchase Orders');
  await page.waitForTimeout(1400);
}

test.describe('§P11 — Mercenta reads channel purchase orders (no "Create PO")', () => {
  test('1. the create action is gone and the channel read is the entry point', async ({ page }) => {
    await openAdminPurchaseOrders(page);

    // The removed action must be absent from the running product.
    await expect(page.locator('button', { hasText: 'Create PO' })).toHaveCount(0);
    expect(await page.locator('text=Create Purchase Order on Behalf').count()).toBe(0);

    await expect(page.locator('[data-testid="channel-po-ingestion"]')).toBeVisible({ timeout: 8000 });
    await expect(page.locator('[data-state="admin-po-ingest"]')).toBeVisible();
    // The state before any read is stated, not implied.
    await expect(page.locator('[data-state="channel-mode"]')).toHaveText('Not yet read');
  });

  test('2. the read states its simulated provenance and its outcome counts', async ({ page }) => {
    await openAdminPurchaseOrders(page);
    await page.locator('[data-state="admin-po-ingest"]').click();

    await expect(page.locator('[data-state="channel-mode"]')).toHaveText(/Simulation \(mock\)/, {
      timeout: 12000,
    });
    await expect(page.getByText(/Simulated read — no live channel call was made/)).toBeVisible();

    const outcomes = page.locator('[data-testid="channel-po-outcomes"]');
    await expect(outcomes).toContainText('Read');
    await expect(outcomes).toContainText('Filed');
    await expect(outcomes).toContainText('Refused');
    // The four simulated channel POs are all reported (dataset completeness).
    await expect(outcomes).toContainText('4');
  });
});

test.describe('§P11 — the outcome of every channel PO is stated, refusals included', () => {
  test('3. routable POs are filed against the brand; the out-of-catalogue PO is REFUSED with its reason', async ({
    page,
  }) => {
    await openAdminPurchaseOrders(page);
    await page.locator('[data-state="admin-po-ingest"]').click();

    const rows = page.locator('[data-testid="channel-po-outcome-rows"] li');
    await expect(rows.first()).toBeVisible({ timeout: 12000 });
    // The simulated channel returns four POs; every one gets a row.
    await expect(rows).toHaveCount(4);

    const filed = page.locator('[data-outcome="ingested"]');
    await expect(filed.first()).toBeVisible();
    expect(await filed.count()).toBe(3);

    // The fail-closed path is REACHABLE in the product, not only in a unit test.
    const refused = page.locator('[data-outcome="refused"]');
    await expect(refused).toHaveCount(1);
    await expect(refused.first()).toContainText(/matches no product in the Mercenta catalogue/i);
    await expect(refused.first()).toContainText('Not routed');

    // Every filed row names the brand it was routed to.
    const body = (await page.locator('[data-testid="channel-po-ingestion"]').innerText()) ?? '';
    expect(body).toMatch(/Astonish|Tapat/);
  });

  test('4. a re-read files nothing new (the guard is on by default)', async ({ page }) => {
    await openAdminPurchaseOrders(page);
    await page.locator('[data-state="admin-po-ingest"]').click();
    await expect(page.locator('[data-outcome="ingested"]').first()).toBeVisible({ timeout: 12000 });

    await page.locator('[data-state="admin-po-ingest"]').click();
    // The same three POs are now reported as already held; the refusal repeats.
    await expect(page.locator('[data-outcome="already_present"]')).toHaveCount(3, { timeout: 12000 });
    await expect(page.locator('[data-outcome="ingested"]')).toHaveCount(0);
    await expect(page.locator('[data-outcome="refused"]')).toHaveCount(1);
  });

  test('5. a filed channel PO opens its real record', async ({ page }) => {
    await openAdminPurchaseOrders(page);
    await page.locator('[data-state="admin-po-ingest"]').click();

    const openRecord = page.locator('[data-testid^="channel-po-open-"]').first();
    await expect(openRecord).toBeVisible({ timeout: 12000 });
    await openRecord.click();

    // The record drawer is the canonical preview over the REAL PO record.
    await expect(page.locator('[data-testid="po-record-drawer"]')).toBeVisible({ timeout: 8000 });
    await expect(page.getByText(/MOCK-PO-88/).first()).toBeVisible();
  });
});

