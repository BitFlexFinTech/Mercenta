/**
 * §BATCH 2d (`AV-008` / `AV-023`) — THE ACKNOWLEDGEMENT ↔ INVOICE PRICE RULE, IN A
 * REAL BROWSER.
 *
 * The retail channel documented that the cost price in the acknowledgement must match
 * the invoiced unit cost, that the acknowledged price can never be HIGHER than the
 * price submitted on the purchase order, and that its payment systems compare the two
 * and may delay payment when they differ. The domain behaviour is proved by
 * `scripts/validate-ack-invoice-price.mjs` (38 assertions, executing the real modules);
 * THIS spec proves the same capability is PRESENT AND REACHABLE through the real brand
 * UI:
 *
 *   1  an acknowledged price ABOVE the order price is REFUSED, and the brand is told
 *      with the channel's own rule (naming the register);
 *   2  an acknowledged price BELOW the order price is ACCEPTED, the brand is WARNED
 *      with the channel's own rule, and the order itself then carries the
 *      acknowledged-price notice stating that the invoice bills the acknowledged price.
 */
import { test, expect } from '@playwright/test';
import { loginAs } from './helpers/auth';

const BRAND = 'Astonish';

async function openBrandPurchaseOrders(page: import('@playwright/test').Page): Promise<void> {
  await loginAs(page, BRAND, 1300);
  await page.click('nav[aria-label="Primary"] >> text=Purchase Orders');
  await page.waitForTimeout(1400);
}

/** Open the first actionable order's acknowledgement panel and return its price input. */
async function openAckPanel(page: import('@playwright/test').Page) {
  const ack = page.getByRole('button', { name: 'Acknowledge', exact: true }).first();
  await expect(ack).toBeVisible({ timeout: 12000 });
  await ack.click();
  const price = page.getByLabel(/Unit price/).first();
  await expect(price).toBeVisible({ timeout: 8000 });
  return price;
}

test.describe('§BATCH 2d (AV-008 / AV-023) — the acknowledged price', () => {
  test('1. a price ABOVE the order price is refused with the channel rule', async ({ page }) => {
    await openBrandPurchaseOrders(page);
    const price = await openAckPanel(page);
    const orderPrice = Number(await price.inputValue());
    expect(orderPrice).toBeGreaterThan(0);

    await price.fill(String(orderPrice + 10));
    await page.getByRole('button', { name: 'Submit acknowledgment' }).click();

    const status = page.locator('div[role="status"]');
    await expect(status).toContainText('cannot be higher', { timeout: 10000 });
    await expect(status).toContainText('AV-008');
  });

  test('2. a LOWER acknowledged price is accepted, warned, and shown on the order', async ({ page }) => {
    await openBrandPurchaseOrders(page);
    const price = await openAckPanel(page);
    const orderPrice = Number(await price.inputValue());

    await price.fill(String(Math.max(0.01, orderPrice - 10)));
    await page.getByRole('button', { name: 'Submit acknowledgment' }).click();

    // The submission notice carries the owner's warning, worded with the channel's rule.
    await expect(page.locator('div[role="status"]')).toContainText('may delay payment', { timeout: 12000 });

    // The order itself now states the divergence and that the invoice bills the
    // acknowledged price — rendered from the rule's ONE owner.
    const notice = page.locator('[data-testid^="ack-price-notice-"]').first();
    await expect(notice).toBeVisible({ timeout: 10000 });
    await expect(notice).toContainText('Acknowledged price differs from the order price');
    await expect(notice).toContainText('your invoice bills the acknowledged price');
    await expect(notice).toContainText('may delay payment');
  });
});
