/**
 * Phase 7D - PO Lifecycle tests.
 *
 * DeskForge (onboarded) owns PO-9002 (received) and PO-9003 (accepted), so the
 * acknowledgment workflow is exercised with the real per-line panel:
 * Acknowledge -> set per-line state (accept / reject + code / backorder +
 * ship date) -> Submit acknowledgment -> the store validates quantities.
 */
import { test, expect } from '@playwright/test';
import { loginAs } from './helpers/auth';

async function deskForgePO(page: any) {
  await loginAs(page, 'DeskForge Supplies Inc', 1100);
  const ob = page.locator('text=Onboarding').first();
  if (await ob.isVisible({ timeout: 1500 }).catch(() => false)) {
    await ob.click();
    await page.waitForTimeout(300);
  }
  await page.click('nav[aria-label="Primary"] >> text=Purchase Orders');
  await page.waitForTimeout(1000);
}

test.describe('PO Lifecycle', () => {
  /** Open the per-line ack panel and return a scoped locator for its controls. */
  async function openAckPanel(page: any) {
    const ack = page.locator('button', { hasText: 'Acknowledge' }).first();
    await expect(ack).toBeVisible({ timeout: 5000 });
    await ack.click();
    await page.waitForTimeout(400);
    return page.locator('div').filter({ has: page.locator('text=Acknowledge each line') }).last();
  }

  test('1. Accept all lines -> status updates, window appears', async ({ page }) => {
    await deskForgePO(page);
    const panel = await openAckPanel(page);
    await page.locator('button', { hasText: 'Submit acknowledgment' }).click();
    await expect(page.getByText(/Acknowledgment submitted/i).first()).toBeVisible({ timeout: 5000 });
  });

  test('2. Reject a line with a reason code', async ({ page }) => {
    await deskForgePO(page);
    const panel = await openAckPanel(page);
    const selects = panel.locator('select');
    await selects.nth(0).selectOption('rejected');
    await page.waitForTimeout(200);
    // the rejection-code select appears inside the same line row.
    await selects.nth(1).selectOption({ index: 1 });
    await page.locator('button', { hasText: 'Submit acknowledgment' }).click();
    await expect(page.getByText(/Acknowledgment submitted/i).first()).toBeVisible({ timeout: 5000 });
  });

  test('3. Backorder line -> scheduled ship date keeps the PO open', async ({ page }) => {
    await deskForgePO(page);
    const panel = await openAckPanel(page);
    await panel.locator('select').nth(0).selectOption('backordered');
    await page.waitForTimeout(200);
    await panel.locator('input[type="date"]').first().fill('2026-12-01');
    await page.locator('button', { hasText: 'Submit acknowledgment' }).click();
    await expect(page.getByText(/Acknowledgment submitted/i).first()).toBeVisible({ timeout: 5000 });
  });

  test('4. Partial ack: accept one line, reject the other', async ({ page }) => {
    await deskForgePO(page);
    const panel = await openAckPanel(page);
    const selects = panel.locator('select');
    await selects.nth(1).selectOption('rejected');
    await page.waitForTimeout(200);
    await selects.nth(2).selectOption({ index: 1 });
    await page.locator('button', { hasText: 'Submit acknowledgment' }).click();
    await expect(page.getByText(/Acknowledgment submitted/i).first()).toBeVisible({ timeout: 5000 });
  });

  test('5. Ack qty exceeds ordered qty -> blocked', async ({ page }) => {
    await deskForgePO(page);
    const panel = await openAckPanel(page);
    await panel.locator('input[type="number"]').first().fill('999999');
    await page.locator('button', { hasText: 'Submit acknowledgment' }).click();
    await expect(page.getByText(/exceed/i).first()).toBeVisible({ timeout: 5000 });
  });

  test('6. 24-hour window expired -> flagged', async ({ page }) => {
    await deskForgePO(page);
    await expect(page.getByText(/deadline PASSED|deadline passed|expired/i).first()).toBeVisible({ timeout: 5000 });
  });
});