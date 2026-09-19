/**
 * §Phase D4 — Domain persistence (browser verification).
 *
 * Proves, in a real browser, the D4 persistence contract that typecheck/build
 * cannot:
 *
 *  1. The acquisition surface reports its HONEST persistence status — with no
 *     Supabase connection in this environment it must say `memory-only` and
 *     must never claim the state is durable — and the full workflow still
 *     completes with no credentials.
 *  2. A browser reload is honest: session-only acquisition state is NOT restored
 *     and NOT claimed as persisted (no fake hydration). This is the documented
 *     reload semantic of the demo environment, now explicitly visible.
 *  3. Tenant isolation: a brand session has no persistence/acquisition surface
 *     at all (the port's ops artefacts are never exposed to a brand tenant).
 */
import { test, expect } from '@playwright/test';
import { loginAs } from './helpers/auth';

async function openNav(page: any, label: string) {
  await page.locator(`nav[aria-label="Primary"] button:has-text("${label}")`).first().click();
  await page.waitForTimeout(700);
}

/** Open a canonical prospect's detail panel and switch to the Outreach tab. */
async function openOutreachTab(page: any, brand: string) {
  await page.locator('[data-testid="bi-prospect-table"] tbody tr', { hasText: brand }).first().click();
  await page.waitForTimeout(400);
  await page.locator('button:has-text("Outreach")').first().click();
  await page.waitForTimeout(400);
  await expect(page.locator('[data-section="acquisition-workflow"]')).toBeVisible({ timeout: 5000 });
}

/** Run the full prepare → approve → send → response → opportunity workflow. */
async function runAcquisitionFlow(page: any, brand: string) {
  await openNav(page, 'Brand Intelligence');
  await expect(page.locator('h2', { hasText: 'Brand Intelligence' }).first()).toBeVisible({ timeout: 6000 });
  await openOutreachTab(page, brand);
  await page.locator('button[data-state="prepare"]').first().click();
  await expect(page.locator('[data-revision]').first()).toContainText('pending_approval', { timeout: 6000 });
  await page.locator('button[data-state="approve"]').first().click();
  await page.locator('button[data-state="send"]').first().click();
  await expect(page.locator('[data-revision]').first()).toContainText('sent', { timeout: 6000 });
  await page.locator('button[data-state="simulate-response"]').first().click();
  await expect(page.locator('[data-section="responses"]')).toContainText('[SIMULATED REPLY', { timeout: 6000 });
  await page.locator('button[data-state="create-opportunity"]').first().click();
  await expect(page.locator('[data-section="opportunity"]')).toContainText('opp-prospect-tapatio', { timeout: 6000 });
}

test.describe('Domain persistence (Phase D4)', () => {
  test('1. The acquisition surface reports its honest persistence status and the flow still completes', async ({ page }) => {
    const pageErrors: string[] = [];
    page.on('pageerror', (e) => pageErrors.push(String(e)));

    await loginAs(page, 'Super Admin — Tadii', 1200);
    await runAcquisitionFlow(page, 'Tapatío');

    // CRM: the persistence status is surfaced and is HONEST — no Supabase
    // connection here, so it must be memory-only, never "durable".
    await openNav(page, 'Brand CRM');
    const status = page.locator('[data-section="persistence-status"]').first();
    await expect(status).toBeVisible({ timeout: 6000 });
    await expect(status).toContainText('Persistence:');
    await expect(status).toContainText('memory-only');
    await expect(status).toContainText('session-only');
    await expect(status).toContainText('not durable');
    await expect(status).not.toContainText('Persistence: durable');
    expect(pageErrors).toEqual([]);
  });

  test('2. A browser reload is honest — session state is not restored and never claimed as persisted', async ({ page }) => {
    const pageErrors: string[] = [];
    page.on('pageerror', (e) => pageErrors.push(String(e)));

    await loginAs(page, 'Super Admin — Tadii', 1200);
    await runAcquisitionFlow(page, 'Tapatío');

    await openNav(page, 'Brand CRM');
    await expect(page.locator('text=opp-prospect-tapatio').first()).toBeVisible({ timeout: 6000 });

    // RELOAD — the in-memory working set is gone. Because nothing is durable in
    // this environment, nothing must be fabricated back on re-entry.
    await page.reload();
    await loginAs(page, 'Super Admin — Tadii', 1200);
    await openNav(page, 'Brand CRM');
    await expect(page.locator('[data-section="persistence-status"]')).toContainText('memory-only');
    await expect(page.locator('text=opp-prospect-tapatio')).toHaveCount(0);
    expect(pageErrors).toEqual([]);
  });

  test('3. Tenant isolation — a brand session has no persistence or acquisition surface', async ({ page }) => {
    const pageErrors: string[] = [];
    page.on('pageerror', (e) => pageErrors.push(String(e)));

    await loginAs(page, 'Astonish', 1200);
    await expect(page.locator('text=Brand Overview').first()).toBeVisible({ timeout: 6000 });
    // The ops-owned acquisition persistence surface is never exposed to a brand.
    await expect(page.locator('[data-section="persistence-status"]')).toHaveCount(0);
    await expect(page.locator('nav[aria-label="Primary"] button:has-text("Brand CRM")')).toHaveCount(0);
    expect(pageErrors).toEqual([]);
  });
});
