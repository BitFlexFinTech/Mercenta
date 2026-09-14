/**
 * §Phase D6 — brand payouts (FLOW 8: commission → settlement → audit).
 *
 * The Accounting tab's payout table used to be a hardcoded "No pending payouts"
 * row while the canonical payout seam (`createPayoutClient` → `settleCommission`)
 * had ZERO call sites, so a commission could never leave `accrued`/`invoiced`.
 * This spec proves the migrated, wired behaviour by CONSEQUENCE, not by layout:
 *
 *   1. the pending set is DERIVED from the canonical commission store;
 *   2. settling one commission reports its transfer mode truthfully (mock, no
 *      live Stripe call) and removes that commission from the pending set;
 *   3. the settlement writes the canonical audit row (`commission_payout_settled`)
 *      visible in the Admin Audit Log;
 *   4. no external network call is made at any point.
 */
import { test, expect } from '@playwright/test';
import { loginAs } from './helpers/auth';

/** External network calls that are NOT our own dev server — must stay empty. */
function watchExternalCalls(page: import('@playwright/test').Page): string[] {
  const externalCalls: string[] = [];
  page.on('request', (req) => {
    const url = req.url();
    const isDev = url.startsWith('http://localhost') || url.startsWith('http://127.0.0.1');
    const isWs = url.startsWith('ws://') || url.startsWith('wss://');
    const isStatic =
      /\.(woff2?|css|png|jpe?g|svg|ico)(\?|$)/.test(url) ||
      url.includes('gstatic.com') ||
      url.includes('fonts.g');
    const isPlaceholderImage = url.includes('picsum.photos');
    if (!isDev && !isWs && !isStatic && !isPlaceholderImage) externalCalls.push(url);
  });
  return externalCalls;
}

async function openAccounting(page: import('@playwright/test').Page) {
  await loginAs(page, 'Super Admin — Tadii', 1200);
  await page.click('nav[aria-label="Primary"] >> text=Super Admin');
  await page.waitForTimeout(700);
  await page.locator('button', { hasText: 'Accounting' }).first().click();
  await page.waitForTimeout(900);
}

const payoutsTable = (page: import('@playwright/test').Page) =>
  page.locator('table[data-table="brand-payouts"]');

const pendingCount = async (page: import('@playwright/test').Page): Promise<number> => {
  const badge = page.locator('text=/^\\d+ pending$/').first();
  const raw = (await badge.innerText()).trim();
  return Number.parseInt(raw, 10);
};

test.describe('Brand payouts (Phase D6)', () => {
  test('1. pending payouts are derived from the canonical commission store', async ({ page }) => {
    const externalCalls = watchExternalCalls(page);
    const pageErrors: string[] = [];
    page.on('pageerror', (e) => pageErrors.push(String(e)));

    await openAccounting(page);

    const table = payoutsTable(page);
    await expect(table).toBeVisible({ timeout: 8000 });
    // Real rows exist (the hardcoded single "No pending payouts" row is gone).
    await expect(table.locator('tbody tr').first()).toBeVisible();
    expect(await table.locator('tbody tr').count()).toBeGreaterThan(0);
    expect(await pendingCount(page)).toBeGreaterThan(0);

    // The money columns are present and the statuses are the canonical vocabulary.
    await expect(table.locator('th', { hasText: 'Net payout' })).toBeVisible();
    // §M6 — the table now carries THREE canonical vocabularies: the accounting
    // status, the reconciliation state and the operational payout state. The
    // assertion is still closed (no free-form status may appear).
    const CANONICAL_STATUSES = [
      'accrued', 'invoiced', 'paid',
      'pending', 'reconciled', 'exception',
      'payout_pending', 'payout_eligible', 'payout_submitted', 'payout_settled', 'payout_failed',
    ];
    const statuses = await table
      .locator('[data-status]')
      .evaluateAll((els) => els.map((e) => String(e.getAttribute('data-status'))));
    expect(statuses.length).toBeGreaterThan(0);
    for (const s of statuses) expect(CANONICAL_STATUSES).toContain(s);

    expect(pageErrors).toEqual([]);
    expect(externalCalls).toEqual([]);
  });

  test('2. settling a payout reports mock mode, clears it from pending and audits it', async ({
    page,
  }) => {
    const externalCalls = watchExternalCalls(page);
    const pageErrors: string[] = [];
    page.on('pageerror', (e) => pageErrors.push(String(e)));

    await openAccounting(page);

    const table = payoutsTable(page);
    await expect(table).toBeVisible({ timeout: 8000 });
    const before = await pendingCount(page);
    expect(before).toBeGreaterThan(0);

    // §M6 — a payout is only settleable when its payment has been reconciled, no
    // deduction is unresolved and the destination is VERIFIED. Pick such a row.
    const eligibleRow = table
      .locator('tbody tr')
      .filter({ has: page.locator('[data-status="payout_eligible"]') })
      .first();
    await expect(eligibleRow).toBeVisible({ timeout: 8000 });
    const row = eligibleRow;
    const cellText = await row.locator('td').first().innerText();
    const commissionId = (cellText.match(/comm-[^\s]+/) ?? [])[0];
    expect(commissionId).toBeTruthy();

    await row.locator('button', { hasText: 'Settle (simulated)' }).click();

    // Truthful provenance: a simulated transfer, explicitly not a live call.
    await expect(page.getByText(/Simulated payout mock_tr_/).first()).toBeVisible({ timeout: 8000 });
    await expect(page.getByText(/no live Stripe call was made/).first()).toBeVisible();

    // Consequence: that commission left the pending set and the counter moved.
    await expect(payoutsTable(page).getByText(commissionId!, { exact: false })).toHaveCount(0, {
      timeout: 8000,
    });
    expect(await pendingCount(page)).toBe(before - 1);

    // The settlement wrote the canonical audit row (Super Admin-only Audit Log).
    await page.click('nav[aria-label="Primary"] >> text=Audit Log');
    await page.waitForTimeout(1000);
    await expect(page.locator('option', { hasText: 'commission_payout_settled' })).toHaveCount(1, {
      timeout: 6000,
    });

    expect(pageErrors).toEqual([]);
    expect(externalCalls).toEqual([]);
  });

  /**
   * §M6 — the money flow is now gated. These two tests pin the consequences of
   * that gate on the real surface: a reconciled payment identity is visible per
   * PO, and a payout that does not meet EVERY condition is refused with its
   * recorded reason instead of transferring money.
   */
  test('3. a reconciled PO shows the payment identity that reconciled it', async ({ page }) => {
    const externalCalls = watchExternalCalls(page);
    await openAccounting(page);
    const table = payoutsTable(page);
    await expect(table).toBeVisible({ timeout: 8000 });

    // The Reconciliation column renders the canonical state + the payment id.
    await expect(table.locator('[data-status="reconciled"]').first()).toBeVisible({ timeout: 8000 });
    await expect(table.locator('text=/cpay-/').first()).toBeVisible({ timeout: 6000 });
    // The operational payout state is rendered from the canonical vocabulary.
    await expect(
      table.locator('[data-status="payout_eligible"], [data-status="payout_pending"]').first()
    ).toBeVisible({ timeout: 8000 });
    expect(externalCalls).toEqual([]);
  });

  test('4. a payout that fails a condition is refused with its recorded reason', async ({ page }) => {
    const externalCalls = watchExternalCalls(page);
    await openAccounting(page);
    const table = payoutsTable(page);
    await expect(table).toBeVisible({ timeout: 8000 });

    // The seeded demo dataset contains exactly one payable PO, and it satisfies
    // every condition. To prove the GATE on the real surface we take the
    // canonical OPERATOR ACTION that invalidates one condition — suspending the
    // brand's payout destination in the Payout destinations card — and then try
    // to pay.
    //
    // (The domain-level proof of every individual blocker — no reconciliation,
    // unresolved deduction, unverified destination, already paid — is pinned by
    // scripts/validate-financial-reconciliation.mjs D1–D7.)
    const payoutRow = table.locator('tbody tr').first();
    const brandName = (await payoutRow.locator('td').first().innerText())
      .split('\n')[0]
      .trim();
    expect(brandName.length).toBeGreaterThan(0);

    const destinationRow = page.locator(`[data-testid="payout-destination"][data-account="${brandName}"]`);
    await expect(destinationRow).toBeVisible({ timeout: 8000 });
    await destinationRow.getByRole('button', { name: 'Suspend' }).click();
    await expect(page.getByTestId('destination-notice')).toBeVisible({ timeout: 8000 });
    await expect(page.getByTestId('destination-notice')).toContainText(/suspended/);

    const blockedRow = table
      .locator('tbody tr')
      .filter({ has: page.locator('[data-status="payout_pending"]') })
      .first();
    await expect(blockedRow).toBeVisible({ timeout: 8000 });
    const commissionId = ((await blockedRow.locator('td').first().innerText()).match(/comm-[^\s]+/) ??
      [])[0];
    expect(commissionId).toBeTruthy();

    await blockedRow.locator('button', { hasText: 'Settle (simulated)' }).click();

    // The refusal is reported with the real blockers and NO transfer is claimed.
    const error = page.locator('text=/PAYOUT_BLOCKED/').first();
    await expect(error).toBeVisible({ timeout: 8000 });
    await expect(error).toContainText(/must be verified/);
    await expect(page.getByText(/Simulated payout mock_tr_/)).toHaveCount(0);
    // The commission is still in the payable set (nothing was transferred).
    await expect(
      payoutsTable(page).getByText(commissionId!, { exact: false }).first()
    ).toBeVisible();
    expect(externalCalls).toEqual([]);
  });
});
