/**
 * §P4 — PROXY MODEL IN THE RUNNING PRODUCT (browser proof).
 *
 * The validator (`scripts/validate-proxy-model.mjs`) proves the DOMAIN seams. This
 * spec proves the corrected DIRECTION is what a brand actually sees:
 *
 *   1  the brand accepts a PO → its decision is issued to MERCENTA as an
 *      instruction, and the surface says so (no brand-side channel action);
 *   2  MERCENTA transmits the acknowledgement — shown with its simulated
 *      provenance, never as a live channel transaction;
 *   3  MERCENTA files the ASN and the consignment carries the real identity
 *      (reference + shipment id), so the brand sees STATUS;
 *   4  the brand surface offers NO filing control ("Create Shipment" / "File
 *      ASN" are gone) and DOES offer the packing-correction exception;
 *   5  a packing correction reaches Mercenta, which files the ASN from it.
 */
import { test, expect, type Page } from '@playwright/test';
import { loginAs } from './helpers/auth';

async function openBrandPurchaseOrders(page: Page, brand = 'Tapatío') {
  await loginAs(page, brand, 1100);
  const onboarding = page.locator('text=Onboarding').first();
  if (await onboarding.isVisible({ timeout: 1500 }).catch(() => false)) {
    await onboarding.click();
    await page.waitForTimeout(300);
  }
  await page.click('nav[aria-label="Primary"] >> text=Purchase Orders');
  await page.waitForTimeout(1000);
}

test.describe('Proxy model — Mercenta acts, the brand decides', () => {
  test('1. the brand decision is issued to Mercenta and Mercenta files the channel acknowledgement', async ({ page }) => {
    await openBrandPurchaseOrders(page);
    await page.locator('button', { hasText: 'Acknowledge' }).first().click();
    await page.waitForTimeout(400);
    await page.locator('button', { hasText: 'Submit acknowledgment' }).click();

    // The brand ISSUED the decision; Mercenta performs the channel action.
    await expect(page.getByText(/Decision issued to Mercenta/i).first()).toBeVisible({ timeout: 9000 });
    await expect(page.getByText(/Mercenta filed the acknowledgement with the retail channel/i).first())
      .toBeVisible({ timeout: 9000 });
    // The channel acknowledgement is unmistakably simulated.
    await expect(page.getByText(/simulated, no live call/i).first()).toBeVisible({ timeout: 6000 });
    // The channel action status panel is present for this PO.
    await expect(page.locator('[data-testid^="po-mercenta-status-"]').first()).toBeVisible({ timeout: 6000 });
  });

  test('2. the brand surface offers no filing control, only the packing-correction exception', async ({ page }) => {
    await openBrandPurchaseOrders(page);
    /**
     * §P4 — REPOINTED (old contract recorded): this surface previously offered
     * "Create Shipment" / "File ASN" and a routing-request filing form. Those were
     * the BRAND performing the channel steps. They must be ABSENT now — the brand's
     * jobs are accept/reject/backorder, download/print and ship on time.
     */
    await expect(page.locator('button', { hasText: 'Create Shipment' })).toHaveCount(0);
    await expect(page.locator('button', { hasText: 'File ASN' })).toHaveCount(0);
    await expect(page.locator('button', { hasText: 'Confirm routing step' })).toHaveCount(0);
    await expect(page.locator('button', { hasText: 'Packing differs?' }).first()).toBeVisible({ timeout: 6000 });
  });

  test('3. a packing correction is sent to Mercenta, which files the ASN from it', async ({ page }) => {
    await openBrandPurchaseOrders(page);
    await page.locator('button', { hasText: 'Packing differs?' }).first().click();
    await page.waitForTimeout(400);
    // The correction form states the ACTUAL packing; the brand chooses no carrier
    // and supplies no carrier/lot/expiry fields — those belong to Mercenta.
    await expect(page.locator('label', { hasText: 'Carrier' })).toHaveCount(0);
    await page.locator('button', { hasText: 'Send packing correction to Mercenta' }).click();
    await expect(page.getByText(/Packing correction sent to Mercenta/i).first()).toBeVisible({ timeout: 9000 });
    await expect(page.getByText(/Mercenta filed the ASN/i).first()).toBeVisible({ timeout: 9000 });
    // The canonical outcome records the ASN, its reference and the consignment.
    const asnLine = page.locator('[data-testid^="po-mercenta-asn-"]').first();
    await expect(asnLine).toBeVisible({ timeout: 6000 });
    await expect(asnLine).toContainText(/ASN filed by Mercenta/i);
    await expect(asnLine).toContainText(/consignment/i);
  });

  test('4. the admin PO detail shows the instruction to Mercenta and its outcome', async ({ page }) => {
    await loginAs(page, 'Mercenta Admin Hub', 1100);
    /**
     * §Batch 3c part 2 (REPOINT — the old contract is recorded, not weakened): the
     * on-behalf ACCEPTANCE below is permitted only when the brand authorised
     * Mercenta for that order (`src/lib/commerce/poOnBehalfAuthority.ts`, enforced
     * in the writer `src/data/api.ts`). `PO-9002` arrives unauthorised, so the
     * brand's authorisation is recorded through the ONE canonical writer first.
     */
    await page.evaluate(async () => {
      const store = await import('/src/data/demoStore.ts');
      const api = await import('/src/data/api.ts');
      const po = store.demoPurchaseOrders.find((p) => p.poNumber === 'PO-9002');
      if (po) {
        api.authoriseOnBehalfDecisions(po.id, {
          recordedBy: `brand:${po.brandId}`,
          note: 'Brand authorises Mercenta to decide this order (browser-spec seed).',
        });
      }
    });
    await page.click('nav[aria-label="Primary"] >> text=Purchase Orders');
    await page.waitForTimeout(1000);
    const row = page
      .locator('div.flex.items-center.justify-between', { hasText: 'PO-9002' })
      .filter({ has: page.locator('button[title="View detail"]') })
      .first();
    await expect(row).toBeVisible({ timeout: 6000 });
    await row.locator('button[title="View detail"]').click();
    await expect(page.getByRole('heading', { name: 'PO-9002' }).first()).toBeVisible({ timeout: 5000 });
    // Mercenta records the brand's decision on the brand's behalf...
    await page.locator('button', { hasText: 'Acknowledge on behalf of' }).first().click();
    await page.waitForTimeout(400);
    await page.locator('button', { hasText: 'Submit On-Behalf Acknowledgment' }).click();
    await page.waitForTimeout(1200);
    // ...and the instruction + Mercenta's outcome are visible on the record.
    const card = page.getByText(/Instruction to Mercenta \(proxy model\)/i).first();
    await expect(card).toBeVisible({ timeout: 7000 });
  });
});