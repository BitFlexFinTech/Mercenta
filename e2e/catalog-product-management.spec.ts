/**
 * §Phase E3 — Catalog / product-management browser verification.
 *
 * Real Chromium walkthrough against actual application state (no stubs):
 *   brand → product information → readiness → submit → SIMULATED processing
 *   → SIMULATED result → resulting product state,
 * plus compliance blocking, tenant isolation, the admin catalog surface, and a
 * zero-external-network assertion across the whole simulated flow.
 *
 * The app is in-memory by design, so each test starts from a fresh document and
 * the mock provider world is deterministic per page load.
 *
 * Uses the canonical login helper (e2e/helpers/auth.ts).
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
    // Static asset/font fetches are not provider calls.
    const isStatic =
      /\.(woff2?|css|png|jpe?g|svg|ico)(\?|$)/.test(url) ||
      url.includes('gstatic.com') ||
      url.includes('fonts.g');
    // Deterministic placeholder product-image host used by the catalog fixtures
    // (a plain <img> src, not a provider call).
    const isPlaceholderImage = url.includes('picsum.photos');
    if (!isDev && !isWs && !isStatic && !isPlaceholderImage) externalCalls.push(url);
  });
  return externalCalls;
}

test.describe('E3 — catalog submission lifecycle (simulated)', () => {
  test('1. brand: incomplete info → complete → ready → simulated submit → simulated result', async ({ page }) => {
    const externalCalls = watchExternalCalls(page);
    const pageErrors: string[] = [];
    page.on('pageerror', (e) => pageErrors.push(String(e)));

    // Astonish has a CLEARED compliance gate (the real gate, not a bypass).
    await loginAs(page, 'Astonish', 1100);
    const nav = page.locator('nav[aria-label="Primary"]');
    await nav.getByText('Product Catalog').first().click();
    await page.waitForTimeout(900);

    // Readiness is stated honestly and derived.
    await expect(page.getByText('Catalog readiness').first()).toBeVisible({ timeout: 8000 });
    await expect(page.getByText('all product information complete').first()).toBeVisible({ timeout: 4000 });
    // Seeded simulated outcomes are labelled simulated, never implied live.
    await expect(page.getByText('Live (sim)').first()).toBeVisible({ timeout: 4000 });

    // ── INCOMPLETE state ────────────────────────────────────────────────
    await page.locator('button', { hasText: 'Add New Product' }).first().click();
    await page.waitForTimeout(400);
    await page.locator('button', { hasText: 'I Understand — Continue to Add Product' }).first().click();
    await page.waitForTimeout(300);
    await expect(page.getByText('Missing required information').first()).toBeVisible({ timeout: 4000 });
    await expect(page.getByText('UK Trade Tariff / Commodity Code').first()).toBeVisible();
    const blockedSave = page.locator('button', { hasText: /Complete 5 required field\(s\)/ }).first();
    await expect(blockedSave).toBeVisible({ timeout: 4000 });
    await expect(blockedSave).toBeDisabled();

    // ── COMPLETE the required information ───────────────────────────────
    const panel = page.locator('div.max-w-md').first();
    await panel.locator('input[placeholder="e.g. Marula Facial Oil"]').fill('E3 Demo Serum');
    await panel.locator('input[placeholder="SPB-MAR-050"]').fill('E3-E2E-001');
    await panel.locator('input[placeholder="3304990000"]').fill('3304990090');
    const nums = panel.locator('input[type="number"]');
    await nums.nth(2).fill('12');
    await nums.nth(3).fill('10');
    await nums.nth(4).fill('18');
    await nums.nth(5).fill('0.5');
    await expect(page.getByText('Missing required information')).toHaveCount(0);
    await panel.locator('button', { hasText: 'Save Product' }).click();
    await page.waitForTimeout(900);

    // ── READY ───────────────────────────────────────────────────────────
    const row = page.locator('tr', { hasText: 'E3-E2E-001' }).first();
    await expect(row).toBeVisible({ timeout: 6000 });
    await expect(row.getByText('Ready to submit').first()).toBeVisible({ timeout: 4000 });

    // ── SUBMIT through the existing seam, explicitly simulated ───────────
    await row.locator('button', { hasText: 'Submit' }).first().click();
    await expect(page.getByText(/SIMULATED — no live retail call/).first()).toBeVisible({ timeout: 10000 });
    await expect(row.getByText('Submitted (sim)').first()).toBeVisible({ timeout: 6000 });

    // ── SIMULATED PROCESSING → SIMULATED RESULT ─────────────────────────
    await row.locator('button', { hasText: 'Check result' }).first().click();
    await page.waitForTimeout(700);
    await row.locator('button', { hasText: 'Check result' }).first().click();
    await expect(row.getByText('Under Retail Review (sim)').first()).toBeVisible({ timeout: 8000 });
    await row.locator('button', { hasText: 'Check result' }).first().click();
    await expect(row.getByText('Live (sim)').first()).toBeVisible({ timeout: 8000 });

    // The resulting state is the product's own catalog state — no page error,
    // and no external provider was contacted at any point.
    expect(pageErrors).toEqual([]);
    expect(externalCalls).toEqual([]);
  });

  test('2. a non-compliant tenant cannot submit from the catalog at all', async ({ page }) => {
    // §P2 REPOINTED (2026-10-02) — Le Creuset is the blocked tenant; the gate
    // still blocks its catalog entirely.
    await loginAs(page, 'Le Creuset', 1100);
    const nav = page.locator('nav[aria-label="Primary"]');
    await nav.getByText('Product Catalog').first().click();
    await page.waitForTimeout(900);

    const locked = page.locator('button', { hasText: 'Catalog Locked' }).first();
    await expect(locked).toBeVisible({ timeout: 8000 });
    await expect(locked).toBeDisabled();
    await expect(page.getByText('Catalog Sync Disabled').first()).toBeVisible({ timeout: 4000 });
    // No submission control exists for a tenant that has not cleared the gate.
    await expect(page.locator('button', { hasText: 'Submit' })).toHaveCount(0);
    await expect(page.getByText('Catalog readiness')).toHaveCount(0);
  });

  test('3. tenant isolation — a brand sees only its own catalog and submissions', async ({ page }) => {
    // Le Creuset is a different onboarded tenant that owns no catalog rows and
    // has not cleared the gate. It must see NONE of another tenant's state.
    await loginAs(page, 'Le Creuset', 1100);
    const nav = page.locator('nav[aria-label="Primary"]');
    await nav.getByText('Product Catalog').first().click();
    await page.waitForTimeout(900);

    // No other tenant's product or submission state leaks into this session.
    await expect(page.getByText('Astonish').first()).toHaveCount(0);
    await expect(page.getByText('Live (sim)')).toHaveCount(0);
    await expect(page.getByText('Under Retail Review')).toHaveCount(0);
    await expect(page.locator('tbody tr')).toHaveCount(0);
  });

  test('4. admin sees the catalog submission state and the readiness detail inline', async ({ page }) => {
    await loginAs(page, 'Mercenta Admin Hub', 1100);
    await page.click('nav[aria-label="Primary"] >> text=Global Catalog');
    await page.waitForTimeout(900);

    await expect(page.getByRole('heading', { name: 'Global Catalog Manager' })).toBeVisible({ timeout: 8000 });
    // The Submission column is present and states simulated provenance.
    await expect(page.getByText('Submission').first()).toBeVisible({ timeout: 4000 });
    await expect(page.getByText('Live (sim)').first()).toBeVisible({ timeout: 4000 });

    // Drill-down is INLINE (the modal implements the capability, no redirect).
    await page.locator('tbody tr').first().click();
    await page.waitForTimeout(700);
    await expect(page.getByText('Catalog readiness & submission').first()).toBeVisible({ timeout: 6000 });
    await expect(page.getByText('Product information').first()).toBeVisible({ timeout: 4000 });
    await expect(page.getByText(/simulated/).first()).toBeVisible({ timeout: 4000 });
  });
});

