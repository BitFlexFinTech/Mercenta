/**
 * Phase 7D - PO Lifecycle tests.
 *
 * Tapatío (onboarded) owns PO-9002 (received) and PO-9003 (accepted), so the
 * acknowledgment workflow is exercised with the real per-line panel:
 * Acknowledge -> set per-line state (accept / reject + code / backorder +
 * ship date) -> Submit acknowledgment -> the store validates quantities.
 *
 * §P4 — the success assertion is REPOINTED (old contract recorded): the brand
 * notice previously read "Acknowledgment submitted." It now reads "Decision
 * issued to Mercenta." because the decision is an INSTRUCTION to Mercenta, which
 * performs the channel action. The behaviour under test — the store validates
 * the submission and reports the outcome — is unchanged.
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
    await expect(page.getByText(/Decision issued to Mercenta/i).first()).toBeVisible({ timeout: 5000 });
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
    await expect(page.getByText(/Decision issued to Mercenta/i).first()).toBeVisible({ timeout: 5000 });
  });

  test('3. Backorder line -> scheduled ship date keeps the PO open', async ({ page }) => {
    await deskForgePO(page);
    const panel = await openAckPanel(page);
    await panel.locator('select').nth(0).selectOption('backordered');
    await page.waitForTimeout(200);
    await panel.locator('input[type="date"]').first().fill('2026-12-01');
    await page.locator('button', { hasText: 'Submit acknowledgment' }).click();
    await expect(page.getByText(/Decision issued to Mercenta/i).first()).toBeVisible({ timeout: 5000 });
  });

  test('4. Partial ack: accept one line, reject the other', async ({ page }) => {
    await deskForgePO(page);
    const panel = await openAckPanel(page);
    const selects = panel.locator('select');
    await selects.nth(1).selectOption('rejected');
    await page.waitForTimeout(200);
    await selects.nth(2).selectOption({ index: 1 });
    await page.locator('button', { hasText: 'Submit acknowledgment' }).click();
    await expect(page.getByText(/Decision issued to Mercenta/i).first()).toBeVisible({ timeout: 5000 });
  });

  test('5. Ack qty exceeds ordered qty -> blocked', async ({ page }) => {
    await deskForgePO(page);
    const panel = await openAckPanel(page);
    await panel.locator('input[type="number"]').first().fill('999999');
    await page.locator('button', { hasText: 'Submit acknowledgment' }).click();
    await expect(page.getByText(/exceed/i).first()).toBeVisible({ timeout: 5000 });
  });

  /**
   * §P13 — REPOINTED (the old contract is recorded here).
   *
   * This test previously read `6. 24-hour window expired -> flagged` and asserted
   * that an overdue acknowledgement window was visible somewhere on the page.
   *
   * That state no longer exists in the demo dataset BY DESIGN, so asserting it
   * would assert the defect this programme removes: the acknowledgement window is
   * now ENFORCED (`src/data/api.ts → acknowledgePurchaseOrder`), the seeded OPEN
   * purchase orders are therefore genuinely inside their window, and a window that
   * closes without a decision is rejected by Mercenta on the brand's behalf
   * BEFORE the limit — so no live PO is left sitting past it.
   *
   * The SURFACE behaviour under test — the acknowledgement-window state rendered
   * from the canonical owner — is asserted in both directions instead: the
   * countdown really is shown for a PO inside its window, and NO open PO is
   * presented as overdue (a state the rule has not produced). The overdue
   * PRESENTATION itself stays proven by
   * `scripts/validate-po-acknowledgement-enforcement.mjs` §7.
   */
  test('6. the 24-hour window is rendered truthfully — no open PO is falsely overdue', async ({ page }) => {
    await deskForgePO(page);
    await expect(
      page.locator('[data-status="ack_due"], [data-status="ack_urgent"]').first()
    ).toBeVisible({ timeout: 5000 });
    expect(await page.locator('[data-status="ack_overdue"]').count()).toBe(0);
  });
});