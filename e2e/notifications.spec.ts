/**
 * Phase 7D - PO Notification & Auto-Fulfilment automations.
 *
 * Exercises the real automation contracts: the admin PO-creation entry point,
 * the acknowledgement flow that AUTO-creates the consignment (surfaced in the
 * brand's Logistics Hub feed), Mercenta's channel action, and the Labels modal.
 * Email sending itself goes through the Postmark (Mock) adapter and is not
 * observable in the demo browser, so it is not asserted.
 *
 * §P4 — REPOINTED (old contract recorded). The acknowledgement previously
 * auto-created a "shipment DRAFT" whose audit reason read "Brand must add carton
 * details", and ASN filing was a BRAND action. Under the proxy model the brand's
 * decision is an INSTRUCTION to Mercenta, which transmits the acknowledgement,
 * raises the routing request and files the ASN; the consignment that appears is
 * the real one, not a draft.
 */
import { test, expect } from '@playwright/test';
import { loginAs } from './helpers/auth';

async function deskForgePO(page: any) {
  await loginAs(page, 'Tapatío', 1100);
  const ob = page.locator('text=Onboarding').first();
  if (await ob.isVisible({ timeout: 1500 }).catch(() => false)) {
    await ob.click();
    await page.waitForTimeout(300);
  }
  await page.click('nav[aria-label="Primary"] >> text=Purchase Orders');
  await page.waitForTimeout(1000);
}

test.describe('PO Notifications & Auto-Fulfilment', () => {
  test('1. Admin PO-creation entry exists (new PO flow reachable)', async ({ page }) => {
    await loginAs(page, 'Mercenta Admin Hub', 1100);
    await page.click('nav[aria-label="Primary"] >> text=Purchase Orders');
    await page.waitForTimeout(900);
    await expect(page.locator('button', { hasText: 'Create PO' }).first()).toBeVisible({ timeout: 5000 });
  });

  test('2. Brand accepts all lines -> Mercenta acts and the consignment appears in logistics', async ({ page }) => {
    await deskForgePO(page);
    const ackBtn = page.locator('button', { hasText: 'Acknowledge' }).first();
    await expect(ackBtn).toBeVisible({ timeout: 5000 });
    await ackBtn.click();
    await page.waitForTimeout(400);
    await page.locator('button', { hasText: 'Submit acknowledgment' }).click();
    // §P4 — the brand ISSUES the decision; MERCENTA performs the channel action.
    await expect(page.getByText(/Decision issued to Mercenta/i).first()).toBeVisible({ timeout: 8000 });
    await page.click('nav[aria-label="Primary"] >> text=Logistics Hub');
    await page.waitForTimeout(1000);
    // Mercenta's filed ASN created the real consignment (its card title carries
    // the PO number) — no brand-supplied carton detail was required.
    await expect(page.getByText(/Tapatío — PO-9002/).first()).toBeVisible({ timeout: 7000 });
  });

  test('3. Mercenta transmits the acknowledgement to the retail channel (simulated)', async ({ page }) => {
    await deskForgePO(page);
    await page.locator('button', { hasText: 'Acknowledge' }).first().click();
    await page.waitForTimeout(400);
    await page.locator('button', { hasText: 'Submit acknowledgment' }).click();
    /**
     * §P4 — the channel acknowledgement is MERCENTA's step and it is recorded
     * with its simulated provenance, so the surface never presents a mock
     * submission as a live channel transaction.
     */
    await expect(page.getByText(/Acknowledgement transmitted by Mercenta/i).first()).toBeVisible({ timeout: 8000 });
    await expect(page.getByText(/simulated \(no live channel call\)/i).first()).toBeVisible({ timeout: 5000 });
  });

  test('4. Labels modal opens for the consignment Mercenta filed', async ({ page }) => {
    // The demo dataset has no ready/shipped seed POs for the cleared tenants, so
    // the label surface only exists after Mercenta files a real ASN — which it
    // does automatically when the brand accepts the PO.
    await deskForgePO(page);
    await page.locator('button', { hasText: 'Acknowledge' }).first().click();
    await page.waitForTimeout(400);
    await page.locator('button', { hasText: 'Submit acknowledgment' }).click();
    await page.waitForTimeout(1400);
    await page.click('nav[aria-label="Primary"] >> text=Logistics Hub');
    await page.waitForTimeout(1000);
    const labelsBtn = page.locator('button', { hasText: 'Labels' }).first();
    await expect(labelsBtn).toBeVisible({ timeout: 7000 });
    await labelsBtn.click();
    await expect(page.getByText('Shipping Label').first()).toBeVisible({ timeout: 4000 });
  });
});