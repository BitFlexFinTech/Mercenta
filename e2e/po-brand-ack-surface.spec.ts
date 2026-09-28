/**
 * §P13 / S6 — THE BRAND ACKNOWLEDGEMENT SURFACES (functional).
 *
 * S5 delivered the declared reminder schedule to the brand; S6 makes the BRAND'S
 * OWN SURFACES present the rule from its ONE owner
 * (`src/lib/commerce/poAcknowledgementWindow.ts`) instead of re-deriving it. This
 * spec exercises the REAL brand surfaces, because the capability must be reachable
 * in the running product — not merely proven by a script:
 *
 *   1. the purchase-order row's window badge is the OWNER's derivation (an in-window
 *      PO reads as due/urgent — never overdue, never `NaN`), and the record preview
 *      shows the same owner-derived window instead of its own copy;
 *   2. opening the acknowledgement panel states the WINDOW the decision is being made
 *      inside, in the owner's own words;
 *   3. the seeded CLOSING-window purchase order (PO-9001, inside the 24-hour limit)
 *      still offers the brand its own decision AND shows the closing window — exactly
 *      the state the declared schedule produces.
 *
 * The seeded states are declared in `src/data/demoData.ts` and asserted by
 * `scripts/validate-po-acknowledgement-brand-surfaces.mjs`.
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

test.describe('Brand acknowledgement surfaces (§P13 / S6)', () => {
  test('1. the window is presented from its owner — due/urgent, never overdue or NaN', async ({
    page,
  }) => {
    await brandPurchaseOrders(page, 'Tapatío');

    /** The row's countdown really is rendered for a PO inside its window. */
    await expect(
      page.locator('[data-status="ack_due"], [data-status="ack_urgent"]').first()
    ).toBeVisible({ timeout: 6000 });
    /** No open PO is presented as overdue (a state the enforced rule has not produced). */
    expect(await page.locator('[data-status="ack_overdue"]').count()).toBe(0);
    /** The old hand-rolled arithmetic rendered `NaN` for an unreadable window — never again. */
    expect(await page.getByText('NaN', { exact: false }).count()).toBe(0);

    /** The record PREVIEW shows the same owner-derived window (not its own copy). */
    await page.locator('[data-state^="brand-po-preview-"]').first().click();
    const drawer = page.getByTestId('brand-po-record-drawer');
    await expect(drawer).toBeVisible({ timeout: 6000 });
    await expect(
      drawer.locator('[data-status="ack_due"], [data-status="ack_urgent"]').first()
    ).toBeVisible({ timeout: 6000 });
    await expect(drawer.getByText(/Acknowledge within/)).toHaveCount(0);
    await page.getByRole('button', { name: 'Close record' }).click();
  });

  test('2. the acknowledgement panel states the window the decision is made inside', async ({
    page,
  }) => {
    await brandPurchaseOrders(page, 'Tapatío');
    await page.locator('button', { hasText: 'Acknowledge' }).first().click();

    const windowState = page.locator('[data-testid^="po-ack-window-state-"]').first();
    await expect(windowState).toBeVisible({ timeout: 6000 });
    /** The owner's own wording: the 24-hour window and what is left of it. */
    await expect(windowState).toContainText(/24-hour window/);
    await expect(windowState).toContainText(/left of the 24-hour window|closed/);
  });

  test('3. the closing window offers BOTH the brand’s own decision and Mercenta’s draft', async ({
    page,
  }) => {
    await brandPurchaseOrders(page, 'Astonish');

    /** PO-9001 sits inside the closing window: the branded state says so. */
    await expect(page.locator('[data-status="ack_urgent"]').first()).toBeVisible({ timeout: 7000 });
    await expect(page.getByText(/closing window/i).first()).toBeVisible({ timeout: 6000 });

    /** The brand may STILL decide for itself (the rule is not replaced by automation)… */
    await expect(page.locator('button', { hasText: 'Acknowledge' }).first()).toBeVisible();
    /** …and Mercenta's channel-required rejection is drafted for its approval. */
    await expect(page.locator('[data-testid="po-onbehalf-draft-PO-9001"]')).toBeVisible({
      timeout: 7000,
    });
  });

  /**
   * §BATCH 2b (`AV-006`) — THE AMENDMENT PATH IS REACHABLE IN THE RUNNING PRODUCT.
   *
   * The documented rule is that a change to an acknowledgement is accepted within
   * 48 hours; before this phase the writer refused ANY second acknowledgement, so
   * no surface could offer one. This test exercises the real brand surface: accept
   * an order, then amend it inside the update window, and confirm the amendment is
   * ACCEPTED (the pre-fix behaviour would have refused it as a duplicate) and that
   * the rule shown to the brand is the config owner's own sentence.
   */
  test('4. an acknowledged order can be AMENDED inside the update window', async ({ page }) => {
    await brandPurchaseOrders(page, 'Tapatío');

    /** First decision: accept the order. */
    await page.locator('button', { hasText: 'Acknowledge' }).first().click();
    await page.locator('button', { hasText: 'Submit acknowledgment' }).first().click();
    await expect(page.getByText(/Decision issued to Mercenta/).first()).toBeVisible({ timeout: 7000 });

    /** The amendment control is offered (the 48-hour update window is open)… */
    const amend = page.locator('button', { hasText: 'Amend acknowledgement' }).first();
    await expect(amend).toBeVisible({ timeout: 7000 });
    await amend.click();

    /** …and the rule it states is the ONE owner's sentence, never a re-typed copy. */
    const windowState = page.locator('[data-testid^="po-amend-window-state-"]').first();
    await expect(windowState).toBeVisible({ timeout: 6000 });
    await expect(windowState).toContainText(/48 hours/);
    await expect(windowState).toContainText(/ship dates or delivery dates/);

    /** Change the first line's acknowledged quantity, then submit the amendment. */
    const qty = page.locator('label', { hasText: 'Qty' }).first().locator('input');
    const current = Number(await qty.inputValue());
    await qty.fill(String(Math.max(1, current - 1)));
    await page.locator('button', { hasText: 'Submit amendment' }).first().click();

    /** ACCEPTED (not refused as a duplicate) — the pre-fix behaviour is gone. */
    await expect(page.getByText(/Decision issued to Mercenta/).first()).toBeVisible({ timeout: 7000 });
    await expect(
      page.getByText(/this submission changes nothing|already been acknowledged/i)
    ).toHaveCount(0);
  });
});
