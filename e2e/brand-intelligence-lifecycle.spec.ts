/**
 * §Phase B — Brand Intelligence lifecycle (browser verification).
 *
 * Proves the canonical store-backed universe + lifecycle UI end-to-end:
 *   1. Run discovery — manual Admin trigger over the canonical universe,
 *      deterministic result (12 scanned · 12 unchanged — no fabricated
 *      discoveries), run history + next-check status, no page errors.
 *   2. Provenance + disqualify/requalify loop — prospect detail shows
 *      last-checked/next-check + History timeline; operator disqualification
 *      moves the brand to the Disqualified section; re-qualification restores
 *      the row deterministically.
 */
import { test, expect } from '@playwright/test';
import { loginAs } from './helpers/auth';

async function openNav(page: any, label: string) {
  await page.locator(`nav[aria-label="Primary"] button:has-text("${label}")`).first().click();
  await page.waitForTimeout(700);
}

test.describe('Brand Intelligence lifecycle', () => {
  test('1. Admin can run a discovery — canonical run, history, next-check, no page errors', async ({ page }) => {
    const pageErrors: string[] = [];
    page.on('pageerror', (e) => pageErrors.push(String(e)));
    await loginAs(page, 'Super Admin — Tadii', 1200);
    await openNav(page, 'Brand Intelligence');

    // Canonical store-backed universe (dataset completeness preserved).
    await expect(page.locator('h2', { hasText: 'Brand Intelligence' }).first()).toBeVisible({ timeout: 6000 });
    await expect(page.locator('text=12 tracked.').first()).toBeVisible({ timeout: 5000 });
    await expect(page.locator('[data-testid="bi-prospect-table"] tbody tr')).toHaveCount(10, { timeout: 5000 });

    // Pipeline control with an explicit manual run trigger.
    await expect(page.locator('text=Pipeline Control').first()).toBeVisible({ timeout: 4000 });
    await expect(page.locator('text=Run History').first()).toBeVisible({ timeout: 4000 });
    await expect(page.locator('text=run-seed-baseline').first()).toBeVisible({ timeout: 4000 });

    // Manual discovery run → deterministic summary (12 scanned, 12 unchanged).
    await page.locator('button:has-text("Run discovery")').first().click();
    await expect(page.locator('[data-run-status="1"]')).toBeVisible({ timeout: 6000 });
    await expect(page.locator('[data-run-status="1"]')).toContainText('Scanned 12');
    await expect(page.locator('[data-run-status="1"]')).toContainText('New 0');
    // Run history gains the manual run row + its count breakdown.
    await expect(page.locator('text=scan 12').first()).toBeVisible({ timeout: 4000 });
    await expect(page.locator('text=12 same').first()).toBeVisible({ timeout: 4000 });
    await expect(page.locator('button:has-text("run-seed-baseline")').first()).toBeVisible({ timeout: 3000 });
    // Next-check stamp is surfaced in Pipeline Control.
    await expect(page.locator('text=Next check').first()).toBeVisible({ timeout: 4000 });
    // Seed baseline run expands with the full provenance origin.
    await page.locator('button:has-text("run-seed-baseline")').first().click();
    await expect(page.locator('text=Canonical prospect "Tapatío" loaded').first()).toBeVisible({ timeout: 4000 });
    expect(pageErrors).toEqual([]);
  });

  test('2. Prospect provenance + History tab + disqualify/requalify loop', async ({ page }) => {
    const pageErrors: string[] = [];
    page.on('pageerror', (e) => pageErrors.push(String(e)));
    await loginAs(page, 'Super Admin — Tadii', 1200);
    await openNav(page, 'Brand Intelligence');
    await expect(page.locator('h2', { hasText: 'Brand Intelligence' }).first()).toBeVisible({ timeout: 6000 });

    // Run first so lifecycle stamps exist.
    await page.locator('button:has-text("Run discovery")').first().click();
    await expect(page.locator('[data-run-status="1"]')).toBeVisible({ timeout: 6000 });

    // Detail: provenance badges (checked/next) + History timeline tab.
    await page.locator('[data-testid="bi-prospect-table"] tbody tr', { hasText: 'Tapatío' }).first().click();
    await page.waitForTimeout(400);
    await expect(page.locator('text=/^checked \\d{4}-/').first()).toBeVisible({ timeout: 4000 });
    await expect(page.locator('text=/^next \\d{4}-/').first()).toBeVisible({ timeout: 3000 });
    await page.locator('button:has-text("History")').first().click();
    await page.waitForTimeout(300);
    await expect(page.locator('text=Canonical prospect "Tapatío" loaded').first()).toBeVisible({ timeout: 4000 });

    // Disqualify via the operator action (dialog reason → audited).
    page.on('dialog', (d) => d.accept('E2E lifecycle probe'));
    await page.locator('button:has-text("Disqualify")').first().click();
    await page.waitForTimeout(600);
    // Row leaves the active table; the Disqualified section lists brand + reason.
    await expect(page.locator('[data-testid="bi-prospect-table"] tbody tr')).toHaveCount(9, { timeout: 5000 });
    await expect(page.locator('text=E2E lifecycle probe').first()).toBeVisible({ timeout: 5000 });

    // Re-qualification restores the canonical row deterministically.
    const reason = page.getByText('E2E lifecycle probe', { exact: true }).first();
    // <p> sits inside an inner text column; its row parent is two levels up.
    await reason.locator('..').locator('..').getByRole('button', { name: 'Requalify' }).click();
    await page.waitForTimeout(500);
    await expect(page.locator('[data-testid="bi-prospect-table"] tbody tr')).toHaveCount(10, { timeout: 5000 });
    await expect(page.locator('[data-testid="bi-prospect-table"] tbody tr', { hasText: 'Tapatío' }).first()).toBeVisible({ timeout: 4000 });
    expect(pageErrors).toEqual([]);
  });
});