/**
 * §P13 / S4 — THE ON-BEHALF REJECTION DRAFT + THE BRAND'S APPROVAL (functional).
 *
 * S4 gives the S2 writer its PRODUCER: Mercenta drafts the rejection the retail
 * channel requires for a purchase order that reaches its final notification stage,
 * and the brand approves that exact draft before anything is performed. This spec
 * exercises the REAL surfaces end to end (the store, the owner's derivation and
 * the ONE writer), because the capability must be reachable in the running product
 * — not merely proven by a script:
 *
 *   1. the BRAND sees Mercenta's draft for the seeded on-behalf PO (PO-9001,
 *      Astonish) with its rule, its reason code, its content address, the lines it
 *      rejects and the truthful window state — and approving it performs the
 *      channel rejection and says so;
 *   2. the draft is NOT offered for a PO in the middle of its window (PO-9002): the
 *      offer comes from the rule's owner, never from a blanket control;
 *   3. MERCENTA's ADMIN CONSOLE sees the SAME draft and can record the approval as
 *      an attributed override.
 *
 * The seeded states are declared in `src/data/demoData.ts` (the second open PO of
 * the first cleared tenant sits inside its closing window while remaining inside
 * the 24-hour limit) and asserted by
 * `scripts/validate-po-acknowledgement-on-behalf.mjs` §9.
 */
import { test, expect } from '@playwright/test';
import { loginAs } from './helpers/auth';

async function brandPurchaseOrders(page: any, brand: string) {
  await loginAs(page, brand, 1100);
  const ob = page.locator('text=Onboarding').first();
  if (await ob.isVisible({ timeout: 1500 }).catch(() => false)) {
    await ob.click();
    await page.waitForTimeout(300);
  }
  await page.click('nav[aria-label="Primary"] >> text=Purchase Orders');
  await page.waitForTimeout(1000);
}

async function adminPoDetail(page: any, poNumber: string) {
  await loginAs(page, 'Mercenta Admin Hub', 1100);
  await page.click('nav[aria-label="Primary"] >> text=Purchase Orders');
  await page.waitForTimeout(1000);
  const row = page
    .locator('div.flex.items-center.justify-between', { hasText: poNumber })
    .filter({ has: page.locator('button[title="View detail"]') })
    .first();
  await expect(row).toBeVisible({ timeout: 6000 });
  await row.locator('button[title="View detail"]').click();
  await expect(page.getByRole('heading', { name: poNumber }).first()).toBeVisible({ timeout: 5000 });
}

test.describe('On-behalf rejection draft + approval (§P13 / S4)', () => {
  test('1. the brand reads Mercenta’s draft for the on-behalf PO and approves it', async ({ page }) => {
    await brandPurchaseOrders(page, 'Astonish');

    const panel = page.locator('[data-testid="po-onbehalf-draft-PO-9001"]');
    await expect(panel).toBeVisible({ timeout: 7000 });
    /** The draft states the RULE, the channel's own reason code and its identity. */
    await expect(panel).toContainText(/24 hours/);
    await expect(panel).toContainText('TemporarilyUnavailable');
    await expect(page.locator('[data-testid="po-onbehalf-draft-id-PO-9001"]')).toContainText(/draft-po-brand-astonish-2-/);
    /** The window state is the owner’s: the brand may still decide for itself. */
    await expect(page.locator('[data-testid="po-onbehalf-state-PO-9001"]')).toContainText(
      /may still decide for yourself/i
    );

    /** Nothing is performed until the brand approves: PO-9001 is still open. */
    await expect(page.locator('[data-testid="po-onbehalf-approved-PO-9001"]')).toHaveCount(0);

    await page.locator('[data-testid="po-onbehalf-approve-PO-9001"]').click();

    /** Mercenta performed the channel rejection on the brand's behalf. */
    await expect(page.getByText(/Mercenta performed the retail channel's required rejection on your behalf/i).first()).toBeVisible(
      { timeout: 8000 }
    );
    /** The record shows WHO approved, and the draft is no longer on offer. */
    await expect(page.locator('[data-testid="po-onbehalf-approved-PO-9001"]')).toBeVisible({ timeout: 8000 });
    await expect(page.locator('[data-testid="po-onbehalf-approved-PO-9001"]')).toContainText('brand-astonish');
    await expect(page.locator('[data-testid="po-onbehalf-draft-PO-9001"]')).toHaveCount(0);
  });

  test('2. the draft is NOT offered for a purchase order still in the middle of its window', async ({ page }) => {
    await brandPurchaseOrders(page, 'Tapatío');
    /** PO-9002 is inside the 24-hour window but nowhere near the on-behalf stage. */
    await expect(page.locator('[data-testid="po-onbehalf-draft-PO-9002"]')).toHaveCount(0);
    await expect(page.locator('[data-testid^="po-onbehalf-approve-"]')).toHaveCount(0);
  });

  test('3. Mercenta’s console sees the SAME draft and records an attributed override', async ({ page }) => {
    await adminPoDetail(page, 'PO-9001');

    const panel = page.locator('[data-testid="admin-po-onbehalf-draft-PO-9001"]');
    await expect(panel).toBeVisible({ timeout: 7000 });
    await expect(panel).toContainText('TemporarilyUnavailable');
    await expect(panel).toContainText(/awaiting Astonish's approval/i);
    /** The draft record names its producer — Mercenta's declared automatic identity. */
    await expect(panel).toContainText('mercenta-system:po-acknowledgement');

    await page.locator('[data-testid="admin-po-onbehalf-approve-PO-9001"]').click();
    await expect(page.locator('[data-testid="admin-po-onbehalf-notice-PO-9001"]')).toContainText(
      /On-behalf rejection performed for Astonish/i,
      { timeout: 8000 }
    );
    /** The approval is attributed to the acting staff member as an override. */
    await expect(page.locator('[data-testid="admin-po-onbehalf-approved-PO-9001"]')).toBeVisible({ timeout: 8000 });
    await expect(page.locator('[data-testid="admin-po-onbehalf-approved-PO-9001"]')).toContainText(
      /Mercenta admin override/i
    );
  });
});
