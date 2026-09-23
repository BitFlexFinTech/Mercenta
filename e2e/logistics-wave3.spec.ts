/**
 * §WAVE 3 — LOGISTICS HUB COMPLETION — BROWSER VERIFICATION.
 *
 * The validator proves the DOMAIN behaviour by executing the real modules. This
 * spec proves the SAME behaviour is actually PRESENT in the running product:
 *   1  the backorder option is offered ONLY where the retail channel allows it,
 *      and the blocked line says why (fail-closed, visible);
 *   2  the Logistics Hub shows an ETA with its basis, never a bare date;
 *   3  the Hub's carrier eligibility is DERIVED and states the provider state;
 *   4  delivery performance surfaces with a real drill-down, and a rate with no
 *      sample is never shown as a percentage;
 *   5  no "10am Pacific" channel-deadline claim is presented anywhere.
 *
 * §P4 — the acknowledgement success assertion is REPOINTED (old contract
 * recorded): "Acknowledgment submitted." → "Decision issued to Mercenta." The
 * brand's decision is an instruction to Mercenta, which performs the channel
 * action; the backorder gate and quantity validation under test are unchanged.
 */
import { test, expect } from '@playwright/test';
import { loginAs } from './helpers/auth';

async function openPurchaseOrders(page: any, brand: 'Tapatío' | 'Astonish' = 'Tapatío') {
  await loginAs(page, brand, 1100);
  await page.click('nav[aria-label="Primary"] >> text=Purchase Orders');
  await page.waitForTimeout(900);
}

async function openLogisticsHub(page: any) {
  await loginAs(page, 'Tapatío', 1100);
  await page.click('nav[aria-label="Primary"] >> text=Logistics Hub');
  await page.waitForTimeout(1200);
}

test.describe('Wave 3 — backorder fail-closed', () => {
  test('1. a line the channel allows still offers Backordered, and the ack succeeds', async ({ page }) => {
    await openPurchaseOrders(page, 'Tapatío');
    await page.locator('button', { hasText: 'Acknowledge' }).first().click();
    await page.waitForTimeout(400);

    const allowed = page.locator('[data-backorder-allowed="true"]').first();
    await expect(allowed).toBeVisible({ timeout: 6000 });
    await expect(allowed.locator('option[value="backordered"]')).toHaveCount(1);

    await allowed.selectOption('backordered');
    await page.waitForTimeout(200);
    await page.locator('input[type="date"]').first().fill('2026-12-01');
    await page.locator('button', { hasText: 'Submit acknowledgment' }).click();
    await expect(page.getByText(/Decision issued to Mercenta/i).first()).toBeVisible({ timeout: 5000 });
  });

  test('2. a line the channel does NOT allow offers no Backordered option and explains why', async ({ page }) => {
    // The first cleared tenant's acknowledgement-eligible POs declare
    // isBackOrderAllowed: false, so the fail-closed path is visible here.
    await openPurchaseOrders(page, 'Astonish');
    const ack = page.locator('button', { hasText: 'Acknowledge' }).first();
    await expect(ack).toBeVisible({ timeout: 6000 });
    await ack.click();
    await page.waitForTimeout(400);

    const denied = page.locator('[data-backorder-allowed="false"]').first();
    await expect(denied).toBeVisible({ timeout: 6000 });
    await expect(denied.locator('option[value="backordered"]')).toHaveCount(0);
    await expect(
      page.getByText(/not allowed by the retail channel|treated as not allowed \(fail closed\)/i).first()
    ).toBeVisible({ timeout: 5000 });
  });
});

test.describe('Wave 3 — Logistics Hub surfaces', () => {
  test('3. the Hub shows an ETA with an explicit basis, never a bare date', async ({ page }) => {
    await openLogisticsHub(page);
    // select the first consignment on the list to open the inspector
    const row = page.locator('[data-testid^="logistics-row-"]').first();
    await expect(row).toBeVisible({ timeout: 8000 });
    await row.click();
    await page.waitForTimeout(600);

    const eta = page.getByTestId('logistics-eta-value');
    await expect(eta).toBeVisible({ timeout: 6000 });
    const basis = await eta.getAttribute('data-eta-basis');
    expect(['channel_window', 'simulated_transit', 'delivered', 'unavailable']).toContain(basis);
    await expect(page.getByTestId('logistics-eta-basis')).toBeVisible();
  });

  test('4. carrier eligibility is derived and names the provider state', async ({ page }) => {
    await openLogisticsHub(page);
    const panel = page.getByTestId('carrier-eligibility');
    await expect(panel).toBeVisible({ timeout: 8000 });
    await expect(page.getByTestId('carrier-eligibility-lane')).toContainText(/Lane:/);
    // Either a permitted account is named with its mode, or the honest
    // "no account operational" refusal is shown — never a silent fallback.
    const permitted = page.getByTestId('carrier-eligibility-permitted');
    const none = page.getByTestId('carrier-eligibility-none');
    expect((await permitted.count()) + (await none.count())).toBeGreaterThan(0);
  });

  test('5. delivery performance opens a real drill-down and never invents a rate', async ({ page }) => {
    await openLogisticsHub(page);
    const tile = page.getByTestId('kpi-delivery-performance');
    await expect(tile).toBeVisible({ timeout: 8000 });
    const value = await page.getByTestId('kpi-delivery-performance-value').innerText();
    // Either a real percentage, or the explicit no-sample statement.
    expect(value === 'No sample yet' || /^\d+%$/.test(value.trim())).toBe(true);

    await tile.click();
    await expect(page.getByTestId('delivery-performance-detail')).toBeVisible({ timeout: 5000 });
  });

  test('6. no unsupported "10am Pacific" channel deadline is presented', async ({ page }) => {
    await openPurchaseOrders(page, 'Tapatío');
    const body = await page.locator('body').innerText();
    expect(body).not.toMatch(/10am PT|10am Pacific|10 am Pacific/i);
    expect(body).not.toMatch(/Carrier Central/i);
  });

test.describe('Wave 3 — acceptance leads to the shipping documents (P0)', () => {
  test('7. after accepting a PO the brand is taken to that PO in the Logistics Hub', async ({ page }) => {
    /**
     * §Dashboard-cleanup P0 — the brand's job after accepting is to PRINT the
     * shipping documents. The old experience ended on a deadline note; now the
     * accepted PO offers "Open shipping documents", which lands on the Logistics
     * Hub with that PO's consignment selected.
     */
    await loginAs(page, 'Tapatío', 1100);
    await page.click('nav[aria-label="Primary"] >> text=Purchase Orders');
    await page.waitForTimeout(900);

    // Accept every line on the first acknowledgement-eligible PO.
    await page.locator('button', { hasText: 'Acknowledge' }).first().click();
    await page.waitForTimeout(400);
    await page.locator('button', { hasText: 'Submit acknowledgment' }).click();
    await expect(page.getByText(/Decision issued to Mercenta/i).first()).toBeVisible({ timeout: 6000 });
    await page.waitForTimeout(600);

    const cta = page.locator('[data-testid^="po-open-documents-"]').first();
    await expect(cta).toBeVisible({ timeout: 8000 });
    const poNumber = (await cta.getAttribute('data-testid'))!.replace('po-open-documents-', '');
    await cta.click();
    await page.waitForTimeout(1400);

    // The Logistics Hub is the destination, and that PO is the selected consignment.
    await expect(page.getByRole('heading', { name: 'Logistics Hub' }).first()).toBeVisible({ timeout: 8000 });
    await expect(page.getByTestId('logistics-inspector')).toContainText(poNumber, { timeout: 8000 });
  });
});

});