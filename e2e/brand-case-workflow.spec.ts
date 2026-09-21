/**
 * §Brief §6 — CANONICAL BRAND CASE WORKFLOW — REAL BROWSER VERIFICATION (S2a).
 *
 * The canonical model under test, driven through the real UI in Chromium:
 *
 *   BRAND opens a Mercenta case
 *     → Mercenta checks the Knowledge Base · verified platform data · the
 *       relevant domain object  (the KB sufficiency evaluator)
 *     → sufficiently supported ⇒ internal resolution
 *     → otherwise              ⇒ Mercenta/Founder review
 *     → review → approval → escalation to the retail channel (SIMULATED here,
 *       and labelled as such) with a real provider case reference
 *     → the channel's response returned to the SAME case and tenant
 *     → Mercenta resolves → the brand sees the resolution
 *
 * It also proves the refusal paths, which a render-only test cannot:
 *   · a category that requires an anchor, with no anchor, is NOT internally
 *     resolvable (fail-closed, visible in the brand surface);
 *   · supplying the brand's OWN record flips it to internally resolvable;
 *   · another tenant's case is never visible to this brand.
 *
 * The app is in-memory by design, so each test starts from a fresh document.
 * Cross-role steps use the established sign-out/switch pattern so the SAME
 * document (and therefore the SAME canonical stores) carries the case across
 * the brand → admin → brand chain.
 */
import { test, expect } from '@playwright/test';
import { loginAs } from './helpers/auth';

const BRAND = 'Astonish';
const OTHER_BRAND = 'Tapatío';
const ADMIN = 'Mercenta Admin Hub';

/** External provider calls that are NOT our own dev server — must stay empty. */
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

function escapeRegex(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/** Open a shell nav view by its own label span (the established pattern). */
async function openView(page: import('@playwright/test').Page, label: string): Promise<void> {
  const nav = page.locator('nav[aria-label="Primary"]:visible').first();
  const labelEl = nav.locator('span').filter({ hasText: new RegExp(`^${escapeRegex(label)}$`) }).first();
  await labelEl.click();
  await expect(labelEl.locator('xpath=ancestor::button[1]')).toHaveAttribute('data-state', 'active', {
    timeout: 6000,
  });
  await page.waitForTimeout(450);
}

/** Sign out and log in as another demo card WITHOUT reloading the document. */
async function switchTo(page: import('@playwright/test').Page, card: string): Promise<void> {
  await page.click('[aria-controls="profile-menu"]');
  await page.getByRole('menuitem', { name: 'Sign Out' }).click();
  await page.waitForTimeout(700);
  await page.getByRole('button', { name: 'Partner Login' }).first().click();
  await page.waitForTimeout(700);
  await page.click(`text=${card}`);
  await page.waitForTimeout(1200);
}

/** A purchase order that genuinely belongs to the given tenant. */
async function ownPoNumber(page: import('@playwright/test').Page, brandId: string): Promise<string> {
  const po = await page.evaluate(async (id) => {
    const store = await import('/src/data/demoStore.ts');
    const row = store.demoPurchaseOrders.find((p: { brandId: string }) => p.brandId === id);
    return row ? row.poNumber : null;
  }, brandId);
  expect(po, `a canonical purchase order must exist for ${brandId}`).toBeTruthy();
  return String(po);
}

test.describe('S2a — canonical brand case workflow', () => {
  test('1. the brand-visible sufficiency gate fails closed, then opens on its own record', async ({ page }) => {
    const externalCalls = watchExternalCalls(page);
    const pageErrors: string[] = [];
    page.on('pageerror', (e) => pageErrors.push(String(e)));

    await loginAs(page, BRAND);
    await openView(page, 'Support & Cases');

    await expect(page.locator('[data-state="brand-case-form"]')).toBeVisible({ timeout: 8000 });

    // REFUSAL — a category that requires an anchor, with no anchor supplied.
    const verdict = page.locator('[data-state="brand-case-verdict"]');
    await expect(verdict).toContainText('Mercenta will review this personally', { timeout: 6000 });

    // SUPPORTED — supply the brand's OWN purchase order: the SAME gate resolves.
    const poNumber = await ownPoNumber(page, 'brand-astonish');
    const selects = page.locator('[data-state="brand-case-form"] select');
    await selects.nth(1).selectOption({ label: poNumber });
    await page.waitForTimeout(400);
    await expect(verdict).toContainText('Mercenta can normally resolve this from your own data', {
      timeout: 6000,
    });

    expect(pageErrors).toEqual([]);
    expect(externalCalls).toEqual([]);
  });

  test('2. brand → Mercenta review → escalation (simulated) → response → resolution → brand', async ({ page }) => {
    const externalCalls = watchExternalCalls(page);
    const pageErrors: string[] = [];
    page.on('pageerror', (e) => pageErrors.push(String(e)));

    /* ── 1. The BRAND opens a case through the real form ─────────────────── */
    await loginAs(page, BRAND);
    const poNumber = await ownPoNumber(page, 'brand-astonish');
    const subject = 'E2E-S2A case: dispatch timing for ' + poNumber;
    await openView(page, 'Support & Cases');
    const selects = page.locator('[data-state="brand-case-form"] select');
    await selects.nth(1).selectOption({ label: poNumber });
    await page.getByPlaceholder('Short summary of the issue').fill(subject);
    await page.getByPlaceholder(/Describe the issue/).fill('Browser verification of the canonical case chain.');
    const submit = page.locator('[data-testid="brand-case-submit"]');
    await expect(submit).toBeEnabled({ timeout: 6000 });
    await submit.click();

    const brandRow = page.locator('[data-state="brand-case-row"]').filter({ hasText: subject });
    await expect(brandRow).toBeVisible({ timeout: 8000 });
    await expect(brandRow).toContainText('Awaiting Mercenta review');
    const caseRef = (await brandRow.locator('span.font-mono').first().innerText()).trim();
    expect(caseRef).toMatch(/^MC-\d{4}$/);

    /* ── 2. MERCENTA review queue shows the checks step, then reviews ────── */
    await switchTo(page, ADMIN);
    await openView(page, 'Helpdesk');

    const reviewRow = page.locator('[data-state="case-review-row"]').filter({ hasText: subject });
    await expect(reviewRow).toBeVisible({ timeout: 8000 });
    await expect(reviewRow.locator('[data-state="case-sufficiency"]')).toContainText(
      'Sufficiently supported',
      { timeout: 6000 }
    );
    await expect(reviewRow.locator('[data-state="case-kb"]')).toContainText('Knowledge Base');
    await expect(reviewRow.locator('[data-state="case-context"]')).toContainText('Verified');

    await reviewRow.getByRole('button', { name: 'Approve escalation' }).click();
    await page.waitForTimeout(500);
    // Reviewed cases leave the review queue and may now be escalated.
    await expect(page.locator('[data-state="case-review-row"]').filter({ hasText: subject })).toHaveCount(0);

    /* ── 3. Escalation is SIMULATED and labelled as such ─────────────────── */
    await page.getByRole('button', { name: /Escalate to Amazon/ }).first().click();
    await page.waitForTimeout(700);
    await expect(page.getByText('AMZ-CASE-MOCK-').first()).toBeVisible({ timeout: 8000 });
    await expect(page.getByText('Simulation — no live Amazon case').first()).toBeVisible({ timeout: 6000 });

    /* ── 4. The channel's answer is recorded against the SAME case ───────── */
    const responsePanel = page.locator('[data-state="case-response-panel"]');
    await expect(responsePanel).toBeVisible({ timeout: 6000 });
    await responsePanel.getByPlaceholder('What the retail channel said').fill('Confirmed — the order ships as scheduled.');
    await responsePanel.locator('[data-state="case-record-response"]').first().click();
    await page.waitForTimeout(500);

    /* ── 5. Mercenta resolves it with a note the brand will read ─────────── */
    const resolutionNote = 'Confirmed with the retail channel — shipping as scheduled.';
    const resolvePanel = page.locator('[data-state="case-resolve-panel"]');
    await expect(resolvePanel).toBeVisible({ timeout: 6000 });
    await resolvePanel.getByPlaceholder(/What Mercenta has concluded/).fill(resolutionNote);
    await resolvePanel.locator('[data-state="case-resolve"]').first().click();
    await page.waitForTimeout(600);
    await expect(page.locator('[data-state="case-review-row"]').filter({ hasText: subject })).toHaveCount(0);

    /* ── 6. The BRAND sees the resolution returned to the correct case ───── */
    await switchTo(page, BRAND);
    await openView(page, 'Support & Cases');
    const resolvedRow = page.locator('[data-state="brand-case-row"]').filter({ hasText: subject });
    await expect(resolvedRow).toBeVisible({ timeout: 8000 });
    await expect(resolvedRow).toContainText('Resolved by Mercenta');
    await expect(resolvedRow.locator('[data-state="brand-case-resolution"]')).toContainText(resolutionNote);
    await expect(resolvedRow.locator('[data-state="brand-case-provider-response"]')).toContainText(
      'Retail channel (simulated)'
    );

    expect(pageErrors).toEqual([]);
    expect(externalCalls).toEqual([]);
  });

  test('3. tenant isolation — another brand never sees this brand’s case', async ({ page }) => {
    const externalCalls = watchExternalCalls(page);
    const pageErrors: string[] = [];
    page.on('pageerror', (e) => pageErrors.push(String(e)));

    // A case genuinely belonging to brand-astonish, created in the FIRST tenant.
    const subject = 'E2E-S2A isolation case (Astonish only)';
    await loginAs(page, BRAND);
    await openView(page, 'Support & Cases');
    await page.getByPlaceholder('Short summary of the issue').fill(subject);
    await page.getByPlaceholder(/Describe the issue/).fill('Tenant isolation verification.');
    await page.locator('[data-testid="brand-case-submit"]').click();
    await expect(page.locator('[data-state="brand-case-row"]').filter({ hasText: subject })).toBeVisible({
      timeout: 8000,
    });

    // The other tenant's portal must not contain it, anywhere.
    await switchTo(page, OTHER_BRAND);
    await openView(page, 'Support & Cases');
    await page.waitForTimeout(600);
    await expect(page.getByText(subject)).toHaveCount(0);
    expect(await page.locator('[data-state="brand-case-row"]').count()).toBe(0);

    expect(pageErrors).toEqual([]);
    expect(externalCalls).toEqual([]);
  });
});