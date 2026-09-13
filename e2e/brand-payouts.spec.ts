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
    const statuses = await table
      .locator('[data-status]')
      .evaluateAll((els) => els.map((e) => String(e.getAttribute('data-status'))));
    expect(statuses.length).toBeGreaterThan(0);
    for (const s of statuses) expect(['accrued', 'invoiced', 'paid']).toContain(s);

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

    const row = table.locator('tbody tr').first();
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
});
