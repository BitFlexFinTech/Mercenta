/**
 * §Priority-1 — Compliance + Carrier simulation browser verification.
 *
 *  - Super Admin Compliance tab: Companies House verify + HMRC sync/file
 *    run through the simulation adapters and produce visible domain state;
 *    the run makes ZERO external network calls;
 *  - Carrier console DHL control (on the MERCENTA admin Logistics Hub): requesting
 *    a DHL status update advances the milestone through the simulation and
 *    reflects in the console DOM. §P9 (programme decision 4) — REPOINTED from the
 *    removed 3PL carrier terminal: a carrier never logs into Mercenta, so the
 *    control now belongs to the surface that operates the carrier account.
 *
 * Uses the canonical login helper (e2e/helpers/auth.ts).
 */
import { test, expect } from '@playwright/test';
import { loginAs } from './helpers/auth';

async function openSuperAdminTab(page: import('@playwright/test').Page, tabLabel: string) {
  const vp = page.viewportSize();
  if (vp && vp.width < 1024) {
    await page.getByTestId('app-menu-toggle').click({ timeout: 4000 });
    await page.waitForTimeout(400);
  }
  await page.click('nav >> text=Super Admin');
  await page.waitForTimeout(600);
  await page.getByRole('button', { name: tabLabel, exact: true }).click();
  await page.waitForTimeout(500);
}

test.describe('Compliance simulation — Super Admin panel', () => {
  test('Companies House verify + HMRC sync/file run with zero network calls', async ({ page }) => {
    const externalCalls: string[] = [];
    page.on('request', (req) => {
      const url = req.url();
      const isDev = url.startsWith('http://localhost') || url.startsWith('http://127.0.0.1');
      const isWs = url.startsWith('ws://') || url.startsWith('wss://');
      // Ignore static asset/font fetches — they are not provider calls.
      const isStatic = /\.(woff2?|css|png|jpe?g|svg|ico)(\?|$)/.test(url) || url.includes('gstatic.com') || url.includes('fonts.g');
      if (!isDev && !isWs && !isStatic) externalCalls.push(url);
    });
    await loginAs(page, 'Super Admin — Tadii');
    await page.click('nav >> text=Super Admin');
    await page.waitForTimeout(600);
    await page.getByRole('button', { name: 'Compliance', exact: true }).click();
    await page.waitForTimeout(500);

    await expect(page.locator('text=Compliance — Companies House & HMRC').first()).toBeVisible({ timeout: 8000 });
    await expect(page.locator('text=Companies House: simulation').first()).toBeVisible();
    await expect(page.locator('text=HMRC: simulation').first()).toBeVisible();

    const baseline = externalCalls.length;
    const verifyBtn = page.locator('button:has-text("Verify (simulated)")').first();
    await verifyBtn.click();
    await expect(page.locator('button:has-text("Verify (simulated)")').first()).toBeEnabled({ timeout: 10000 });
    // A verification record row must exist (unverified → verified badge path).
    await expect(page.locator('text=verified').first()).toBeVisible({ timeout: 8000 });

    const fileBtn = page.locator('button:has-text("Sync + File VAT (simulated)")').first();
    await fileBtn.click();
    await expect(fileBtn).toBeEnabled({ timeout: 10000 });
    await expect(page.locator('text=filing history').first()).toBeVisible({ timeout: 8000 });

    // No new external provider calls after the pre-run baseline.
    expect(externalCalls.slice(baseline)).toEqual([]);
  });
});

test.describe('Carrier console — DHL simulated milestone (admin logistics)', () => {
  test('DHL status button advances the shipment milestone (simulated)', async ({ page }) => {
    /* §P9 (programme decision 4) — REPOINTED from the 3PL carrier terminal: log in
       as the MERCENTA admin and open the Logistics Hub, where the rehomed carrier
       console lives. The behaviour under test is unchanged. */
    await loginAs(page, 'Mercenta Admin Hub');
    await page.click('nav >> text=Logistics Hub');
    await page.waitForTimeout(1200);
    await expect(page.locator('text=Carrier API console').first()).toBeVisible({ timeout: 8000 });
    const btn = page.locator('button:has-text("DHL status → next milestone (sim)")').first();
    await expect(btn).toBeVisible({ timeout: 8000 });
    await btn.click();
    // The console result line (mono font) shows the milestone transition.
    await expect(page.locator('div.font-mono', { hasText: '→' }).first()).toBeVisible({ timeout: 12000 });
  });
});