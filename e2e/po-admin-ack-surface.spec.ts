/**
 * §P13 / S7 — THE ADMIN ACKNOWLEDGEMENT SURFACES (functional).
 *
 * S6 made the BRAND surfaces present the 24-hour rule from its ONE owner. S7 does
 * the same for the ADMIN side, so this spec exercises the REAL admin surfaces,
 * because the capability must be reachable in the running product — not merely
 * proven by a script:
 *
 *   1. the admin PO list presents the owner-derived window and NO state the rule has
 *      not produced (never overdue, never `NaN`), and its record PREVIEW shows the
 *      same owner-derived window instead of its own copy;
 *   2. the admin PO DETAIL derives the window, its urgency classification and the
 *      ACCEPTANCE control from the owner — the seeded closing-window purchase order
 *      (PO-9001, Astonish) reads urgent, calls the closing window out, states the
 *      owner's classification in the deadline tile (never the old `EXPIRED` wording)
 *      and still offers the acceptance the owner permits;
 *   3. a DECIDED order (PO-9003, `accepted`) states the owner's own reason and offers
 *      NO acceptance — the dead control the domain writer would refuse is gone.
 *
 * The seeded states are declared in `src/data/demoData.ts` (`PO-${9000 + bi * 2 + pi}`)
 * and asserted by `scripts/validate-po-acknowledgement-admin-surfaces.mjs`.
 */
import { test, expect } from '@playwright/test';
import { loginAs } from './helpers/auth';

async function adminPurchaseOrders(page: any) {
  await loginAs(page, 'Mercenta Admin Hub', 1100);
  await page.click('nav[aria-label="Primary"] >> text=Purchase Orders');
  await page.waitForTimeout(1000);
}

async function adminPoDetail(page: any, poNumber: string) {
  const row = page
    .locator('div.flex.items-center.justify-between', { hasText: poNumber })
    .filter({ has: page.locator('button[title="View detail"]') })
    .first();
  await expect(row).toBeVisible({ timeout: 6000 });
  await row.locator('button[title="View detail"]').click();
  await expect(page.getByRole('heading', { name: poNumber }).first()).toBeVisible({ timeout: 5000 });
}

/**
 * §Batch 3c part 2 (REPOINT — the old contract is recorded, not weakened): the
 * on-behalf ACCEPTANCE control is offered only when the brand authorised Mercenta
 * for that order (`src/lib/commerce/poOnBehalfAuthority.ts`), enforced in the
 * writer `src/data/api.ts`. This records the brand's authorisation through the ONE
 * canonical writer so the surface reflects the AUTHORISED case.
 */
async function authoriseOnBehalfForPo(page: any, poNumber: string) {
  await page.evaluate(async (n: string) => {
    const store = await import('/src/data/demoStore.ts');
    const api = await import('/src/data/api.ts');
    const po = store.demoPurchaseOrders.find((p: { poNumber: string }) => p.poNumber === n);
    if (po) {
      api.authoriseOnBehalfDecisions(po.id, {
        recordedBy: `brand:${po.brandId}`,
        note: 'Brand authorises Mercenta to decide this order (browser-spec seed).',
      });
    }
  }, poNumber);
}

test.describe('Admin acknowledgement surfaces (§P13 / S7)', () => {
  test('1. the list and its record preview present the window from its owner', async ({ page }) => {
    await adminPurchaseOrders(page);

    /** No open PO is presented as overdue (a state the enforced rule has not produced). */
    expect(await page.locator('[data-status="ack_overdue"]').count()).toBe(0);
    /** The old hand-rolled arithmetic rendered `NaN` for an unreadable window — never again.
     *  (A REGEX locator is used deliberately: a string match here is case-insensitive and
     *  would match the word "Fi-NaN-ce" on this surface.) */
    expect(await page.getByText(/NaN/).count()).toBe(0);

    /** The record PREVIEW derives the window from the owner (PO-9001 is in its closing window). */
    await page.locator('[data-testid="po-preview-po-brand-astonish-2"]').click();
    const drawer = page.getByTestId('po-record-drawer');
    await expect(drawer).toBeVisible({ timeout: 6000 });
    await expect(
      drawer.locator('[data-status="ack_due"], [data-status="ack_urgent"]').first()
    ).toBeVisible({ timeout: 6000 });
    await expect(drawer.getByText(/Ack window unreadable/)).toHaveCount(0);
    await page.keyboard.press('Escape');
  });

  test('2. the detail is the owner’s window, its classification, and the acceptance it permits', async ({
    page,
  }) => {
    await adminPurchaseOrders(page);
    await authoriseOnBehalfForPo(page, 'PO-9001');
    await adminPoDetail(page, 'PO-9001');

    /** The owner's urgency, with the closing window called out (Mercenta may act for the brand). */
    await expect(
      page.locator('[data-status="ack_due"], [data-status="ack_urgent"]').first()
    ).toBeVisible({ timeout: 6000 });
    await expect(page.getByText(/closing window/i).first()).toBeVisible({ timeout: 6000 });

    /** The deadline tile states the owner's classification — never the old `EXPIRED` wording. */
    const tile = page.locator('[data-testid="admin-po-ack-window-PO-9001"]');
    await expect(tile).toContainText(/Ack within/);
    await expect(tile).not.toContainText('EXPIRED');

    /** The brand has AUTHORISED Mercenta for this order, so the owner permits an
     *  ACCEPTANCE and the on-behalf control IS offered. (Without that authorisation
     *  the owner permits ONLY the channel-required rejection — see
     *  `src/lib/commerce/poOnBehalfAuthority.ts`, enforced in the writer.) */
    await expect(page.locator('button', { hasText: 'Acknowledge on behalf of' })).toBeVisible({
      timeout: 6000,
    });
  });

  test('3. a decided order states the owner’s reason and offers no dead acceptance', async ({
    page,
  }) => {
    await adminPurchaseOrders(page);
    await adminPoDetail(page, 'PO-9003');

    /** The owner's channel state decides the badge… */
    await expect(page.locator('[data-status="acknowledged"]').first()).toBeVisible({
      timeout: 6000,
    });
    /** …and the surface states WHY, in the owner's own words. */
    const state = page.locator('[data-testid="admin-po-ack-state-PO-9003"]');
    await expect(state).toBeVisible({ timeout: 6000 });
    await expect(state).toContainText(/past the acknowledgement decision|in the fulfilment track/);
    /** No acceptance is offered where the domain writer would refuse one. */
    await expect(page.locator('button', { hasText: 'Acknowledge on behalf of' })).toHaveCount(0);
  });
});
