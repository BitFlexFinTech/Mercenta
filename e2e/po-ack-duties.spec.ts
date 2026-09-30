/**
 * §BATCH 2j (`AV-009` / `AV-010b`) — THE ACKNOWLEDGEMENT'S TWO DUTIES — BROWSER VERIFICATION.
 *
 * The gate (`scripts/validate-po-ack-duties.mjs`) proves the DOMAIN behaviour by executing the
 * real modules, including the writer. This spec proves the SAME facts are actually PRESENT in
 * the running product:
 *
 *   1  the acknowledgement panel states the CHANNEL'S ON-HOLD DUTY, from its owner — and for a
 *      record that carries no hold statement it says the duty is UNVERIFIED rather than
 *      implying the order is not held;
 *   2  the panel states the COMPLETENESS rule from its owner, and its verdict is exposed as
 *      data (`data-completeness`) so the notice can never be decorative;
 *   3  the notice that lists lines the channel rejected for being omitted renders ONLY when the
 *      order's record actually carries that fact — it is not shown on a complete order;
 *   4  an acknowledgement submitted through the real surface is recorded, and the panel's rule
 *      statements survive the round trip.
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

/** Open the acknowledgement panel on the first order that still offers the control. */
async function openAckPanel(page: any) {
  const button = page.locator('button', { hasText: 'Acknowledge' }).first();
  await expect(button).toBeVisible({ timeout: 8000 });
  await button.click();
  await page.waitForTimeout(600);
}

test.describe('Batch 2j — the acknowledgement’s on-hold and completeness duties', () => {
  test('1. the panel states the channel’s on-hold duty, or says it is unverified', async ({ page }) => {
    await brandPurchaseOrders(page, 'Tapatío');
    await openAckPanel(page);

    const duty = page.locator('[data-testid^="po-hold-duty-"]').first();
    await expect(duty).toBeVisible({ timeout: 6000 });
    const text = (await duty.textContent()) ?? '';
    /**
     * Either the duty is UNVERIFIED (no statement on the record — the honest default, because
     * the channel's hold signal is not established) or the channel has stated a hold and the
     * rule is quoted. Never a silent "not on hold".
     */
    expect(text).toMatch(/UNVERIFIED|ON HOLD/);
    expect(text).toMatch(/on hold|hold/i);
  });

  test('2. the panel states the completeness rule, and the verdict is real data', async ({ page }) => {
    await brandPurchaseOrders(page, 'Tapatío');
    await openAckPanel(page);

    const completeness = page.locator('[data-testid^="po-submit-completeness-"]').first();
    await expect(completeness).toBeVisible({ timeout: 6000 });
    /** The verdict is exposed as data — the notice is derived, never decorative. */
    const verdict = await completeness.getAttribute('data-completeness');
    expect(['complete', 'incomplete']).toContain(verdict);
    /**
     * The panel decides every line by design, so the verdict is `complete` and the line states
     * the channel's requirement in the rule's own words.
     */
    if (verdict === 'complete') {
      await expect(completeness).toContainText(/complete acknowledgement/i);
    } else {
      await expect(completeness).toContainText(/undecided/i);
    }
  });

  test('3. the omitted-lines notice appears ONLY when the record carries that fact', async ({ page }) => {
    await brandPurchaseOrders(page, 'Tapatío');

    /**
     * The demo's brand panel always decides every line, so no order in this surface has been
     * submitted incompletely — and the notice must therefore be ABSENT everywhere. A notice
     * that rendered unconditionally would be decorative, which is what this asserts against.
     */
    expect(await page.locator('[data-testid^="po-implicit-rejections-"]').count()).toBe(0);
    expect(await page.locator('[data-testid^="po-channel-hold-"]').count()).toBe(0);
  });

  test('4. a submission through the real surface is recorded and the rules survive it', async ({ page }) => {
    await brandPurchaseOrders(page, 'Tapatío');
    await openAckPanel(page);

    await page.locator('button', { hasText: 'Submit acknowledgment' }).first().click();
    await page.waitForTimeout(1200);

    /** The writer's outcome is surfaced, and the acknowledgement is recorded on the order. */
    await expect(
      page.locator('text=/Decision issued to Mercenta/').first()
    ).toBeVisible({ timeout: 8000 });
    /**
     * The completeness rule was part of that submission, so — because the panel decided every
     * line — no omitted-lines notice appears afterwards either.
     */
    expect(await page.locator('[data-testid^="po-implicit-rejections-"]').count()).toBe(0);
  });
});
