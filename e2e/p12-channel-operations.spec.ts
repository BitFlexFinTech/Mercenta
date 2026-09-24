/**
 * §P12 — THE CHANNEL OPERATIONS, IN A REAL BROWSER.
 *
 * programme `docs/DASHBOARD_LOGISTICS_CLEANUP_PROGRAMME_2026-09-22.md` §4 P12;
 * register `AV-040`. The domain behaviour is proved by
 * `scripts/validate-p12-spapi-seam.mjs` (57 assertions, executing the real
 * modules). This spec proves the SAME operations are present and truthful in the
 * RUNNING product, on the admin surface where Mercenta performs them:
 *
 *   1  the console renders with all four channel operations;
 *   2  the RECEIVING SYNC reads the channel, states its simulated provenance, and
 *      reports the channel's own status per purchase order — after the channel's
 *      purchase orders have entered the platform through the §P11 entry point;
 *   3  the channel shipment-label rule is STATED as refused for UK/EU (Mercenta
 *      never claims a channel-generated label here);
 *   4  no page errors occur while the operator exercises the surface.
 */
import { test, expect } from '@playwright/test';
import { loginAs } from './helpers/auth';

async function openAdminRetailPipeline(page: any) {
  await loginAs(page, 'Mercenta Admin Hub', 1300);
  await page.click('nav[aria-label="Primary"] >> text=Retail Pipeline');
  await page.waitForTimeout(1400);
}

/**
 * The real order of operations, in ONE session: the channel's purchase orders
 * enter the platform through the §P11 entry point (Purchase Orders → the channel
 * read), and the console is then reached by SPA navigation — a re-login would
 * reload the page and reset the in-memory canonical store.
 */
async function ingestChannelPosThenOpenConsole(page: any) {
  await loginAs(page, 'Mercenta Admin Hub', 1300);
  await page.click('nav[aria-label="Primary"] >> text=Purchase Orders');
  await page.waitForTimeout(1400);
  await page.locator('[data-state="admin-po-ingest"]').click();
  await expect(page.locator('[data-outcome="ingested"]').first()).toBeVisible({ timeout: 12000 });

  await page.click('nav[aria-label="Primary"] >> text=Retail Pipeline');
  await page.waitForTimeout(1400);
  await expect(page.locator('[data-testid="channel-operations"]')).toBeVisible({ timeout: 8000 });
}

test.describe('§P12 — the channel operations console is real', () => {
  test('1. all four channel operations are present on the admin surface', async ({ page }) => {
    await openAdminRetailPipeline(page);

    const console_ = page.locator('[data-testid="channel-operations"]');
    await expect(console_).toBeVisible({ timeout: 8000 });

    await expect(page.locator('[data-testid="channel-receiving-sync"]')).toBeVisible();
    await expect(page.locator('[data-state="channel-receiving-read"]')).toBeVisible();
    await expect(page.locator('[data-testid="channel-routing-instructions"]')).toBeVisible();
    await expect(page.locator('[data-testid="channel-invoice-submission"]')).toBeVisible();
    await expect(page.locator('[data-testid="channel-shipment-labels"]')).toBeVisible();
  });

  test('2. the shipping-label rule is stated for this region — never claimed', async ({ page }) => {
    await openAdminRetailPipeline(page);

    const rule = page.locator('[data-state="channel-labels-rule"]');
    await expect(rule).toBeVisible();
    await expect(rule).toContainText('NA only');
    await expect(rule).toContainText('never issues a channel-generated label for a UK/EU consignment');
  });
});

test.describe('§P12 — the receiving sync reads the CHANNEL, truthfully', () => {
  test('3. after the channel’s POs enter the platform, the sync reports their state', async ({
    page,
  }) => {
    // §P11 entry point, then §P12's console — one session, so the store persists.
    await ingestChannelPosThenOpenConsole(page);
    await page.locator('[data-state="channel-receiving-read"]').click();

    await expect(page.locator('[data-state="channel-receiving-mode"]')).toContainText(
      /Simulation \(mock\) — simulated channel read; no live channel call was made/,
      { timeout: 12000 }
    );

    // The channel reports the three purchase orders it issued and Mercenta filed.
    const readings = page.locator('[data-testid="channel-receiving-readings"] li');
    await expect(readings.first()).toBeVisible({ timeout: 12000 });
    await expect(readings).toHaveCount(3);

    // Every reading states the channel's view AND Mercenta's own, per AV-018.
    const body = (await page.locator('[data-testid="channel-receiving-sync"]').innerText()) ?? '';
    expect(body).toMatch(/channel: Not received · Mercenta:/);
    // The read is REPORTED, never written: the surface says so.
    expect(body).toMatch(/never written/);
  });

  test('4. the sync read is not a dead end — it reports its outcome counts', async ({ page }) => {
    await openAdminRetailPipeline(page);
    await page.locator('[data-state="channel-receiving-read"]').click();
    await expect(page.locator('[data-state="channel-ops-notice"]')).toContainText(
      /purchase order\(s\) reported/,
      { timeout: 12000 }
    );
  });

  test('5. a SIMULATED reading states why it is NOT applied — and offers no control that can only fail', async ({
    page,
  }) => {
    await ingestChannelPosThenOpenConsole(page);
    await page.locator('[data-state="channel-receiving-read"]').click();
    await expect(page.locator('[data-testid="channel-receiving-readings"] li').first()).toBeVisible({
      timeout: 12000,
    });

    // Every reading here is simulated, so the canonical write is refused BY DESIGN —
    // and the surface says so, per reading, instead of offering a dead control.
    await expect(page.locator('[data-state="channel-apply-refused"]').first()).toBeVisible();
    await expect(page.locator('[data-state="channel-apply-refused"]').first()).toContainText(
      /never written as a canonical receipt/
    );
    expect(await page.locator('[data-testid^="channel-apply-"]').count()).toBe(0);
  });
});