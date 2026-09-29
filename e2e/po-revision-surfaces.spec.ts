/**
 * §BATCH 2c (`AV-024`) — THE CHANNEL-ISSUED ORDER REVISION, IN A REAL BROWSER.
 *
 * The retail channel can change a purchase order AFTER it has been issued, and the
 * vendor must then fulfil the UPDATED one. The domain behaviour is proved by
 * `scripts/validate-po-revision-ingestion.mjs` (102 assertions, executing the real
 * modules); THIS spec proves the same capability is PRESENT AND REACHABLE in the
 * running product, through the real UI:
 *
 *   1  the console cannot issue a simulated channel change before it has read the
 *      channel (fail-closed: the control is refused until a SIMULATED read is active);
 *   2  after the read, the operator can issue the channel's change and the re-read
 *      records the revision — the console's "Channel revisions" card then shows EVERY
 *      recorded revision with its change list, the (sim) provenance and the rule;
 *   3  the BRAND — switched to without reloading the document, so the same canonical
 *      stores are carried across — is told on the order itself that the retail channel
 *      changed it, which version it is working from and what changed; and an order the
 *      channel has NOT changed shows no notice at all.
 *
 * The app is in-memory by design, so each test starts from a fresh document and the
 * cross-role step uses the established sign-out/switch pattern.
 */
import { test, expect } from '@playwright/test';
import { loginAs } from './helpers/auth';

const ADMIN = 'Mercenta Admin Hub';
const BRAND = 'Astonish';

/** Sign out and log in as another demo card WITHOUT reloading the document. */
async function switchTo(page: import('@playwright/test').Page, card: string): Promise<void> {
  await page.click('[aria-controls="profile-menu"]');
  await page.getByRole('menuitem', { name: 'Sign Out' }).click();
  await page.waitForTimeout(700);
  await page.getByRole('button', { name: 'Partner Login' }).first().click();
  await page.waitForTimeout(700);
  await page.click(`text=${card}`);
  await page.waitForTimeout(1400);
}

async function openAdminPurchaseOrders(page: import('@playwright/test').Page): Promise<void> {
  await loginAs(page, ADMIN, 1300);
  await page.click('nav[aria-label="Primary"] >> text=Purchase Orders');
  await page.waitForTimeout(1400);
  await expect(page.locator('[data-testid="channel-po-ingestion"]')).toBeVisible({ timeout: 8000 });
}

/** Read the retail channel (the mock seam) and wait for the stated simulated mode. */
async function readChannelPos(page: import('@playwright/test').Page): Promise<void> {
  await page.locator('[data-state="admin-po-ingest"]').click();
  await expect(page.locator('[data-state="channel-mode"]')).toHaveText(/Simulation \(mock\)/, {
    timeout: 12000,
  });
}

/** Issue the simulated channel change and return the order the channel changed. */
async function simulateChannelChange(page: import('@playwright/test').Page): Promise<string> {
  const control = page.locator('[data-state="admin-po-simulate-change"]');

  await expect(control).toBeEnabled();
  await control.click();
  const summary = page.locator('[data-state="po-revision-simulate-summary"]');
  await expect(summary).toContainText(/version 1/, { timeout: 15000 });
  const text = (await summary.textContent()) ?? '';
  const changed = text.match(/MOCK-PO-\d+/);
  expect(changed, `the summary must name the order the channel changed: ${text}`).toBeTruthy();
  return String(changed![0]);
}

test.describe('§BATCH 2c (AV-024) — the channel-issued order revision', () => {
  test('1. the simulated change is refused until the channel has been read', async ({ page }) => {
    await openAdminPurchaseOrders(page);
    const control = page.locator('[data-state="admin-po-simulate-change"]');
    // Fail-closed: no channel read yet, so no simulated change may be issued.
    await expect(control).toBeDisabled();
    await expect(control).toHaveAttribute('title', /Read the retail channel first/);
    // And nothing claims a revision happened.
    await expect(page.locator('[data-state="po-revision-simulate-summary"]')).toHaveCount(0);

    await readChannelPos(page);
    await expect(control).toBeEnabled();
  });

  test('2. the console shows every recorded revision with its change list', async ({ page }) => {
    await openAdminPurchaseOrders(page);
    await readChannelPos(page);
    const changedPo = await simulateChannelChange(page);

    // Open the CHANGED order's real record through the queue's own control.
    await page.getByLabel('Search purchase orders').fill(changedPo);
    await page.waitForTimeout(700);
    await page.locator('button[title="View detail"]').first().click();

    const card = page.locator(`[data-testid="admin-po-revisions-${changedPo}"]`);
    await expect(card).toBeVisible({ timeout: 8000 });
    // The rule is the OWNER's sentence, rendered from its one declaration.
    await expect(card).toContainText('The updated purchase order is the one that must be fulfilled');
    // The revision itself: its version, its SIMULATED provenance and a change row.
    const revision = page.locator(`[data-testid="admin-po-revision-${changedPo}-1"]`);
    await expect(revision).toBeVisible();
    await expect(revision).toContainText('Version 1');
    await expect(revision).toContainText('(sim)');
    await expect(revision).toContainText('ordered quantity');
    await expect(revision).toContainText('→');
  });

  test('3. the brand is told the channel changed its order, and what changed', async ({ page }) => {
    await openAdminPurchaseOrders(page);
    await readChannelPos(page);
    const changedPo = await simulateChannelChange(page);

    // Same document, same stores — the brand sees the revision the channel issued.
    await switchTo(page, BRAND);
    await page.click('nav[aria-label="Primary"] >> text=Purchase Orders');
    await page.waitForTimeout(1400);

    const notice = page.locator(`[data-testid="po-revision-notice-${changedPo}"]`);
    await expect(notice).toBeVisible({ timeout: 10000 });
    await expect(notice).toContainText('you are working from version 1');
    await expect(notice).toContainText('ordered quantity');
    await expect(page.locator(`[data-testid="po-revision-changes-${changedPo}"]`)).toBeVisible();
    await expect(page.locator(`[data-testid="po-revision-rule-${changedPo}"]`)).toContainText(
      'The updated purchase order is the one that must be fulfilled'
    );

    // NEGATIVE CONTROL — the notice is a statement about THIS order, not a banner:
    // this brand holds more than one order and exactly one of them was changed.
    expect(await page.locator('[data-testid^="po-revision-notice-"]').count()).toBe(1);
    expect(await page.locator('[data-testid^="po-revision-rule-"]').count()).toBe(1);
  });
});

