/**
 * §Workstream B (2026-09-17) — approved implementation coverage:
 *   · Decision 1 — brand-facing Market Intel exposes NO raw competitor scores /
 *     internal tier badges (qualitative positioning only, derived from the
 *     existing brandMaturity model; nothing invented);
 *   · Decision 2 — Brand Intelligence is SUPER ADMIN ONLY (non-Super staff and
 *     brands are denied the proprietary BI surface);
 *   · Step B — internal Product Discovery + Regional Priority panels derive
 *     from the canonical store (deterministic, simulated-evidence-labelled);
 *   · Step C — internal notes editor round-trips through updateProspect with an
 *     audited lifecycle event.
 */
import { test, expect } from '@playwright/test';
import { loginAs } from './helpers/auth';

async function openNav(page: import('@playwright/test').Page, label: string) {
  await page.locator(`nav[aria-label="Primary"] button:has-text("${label}")`).first().click();
  await page.waitForTimeout(700);
}

test.describe('Workstream B — Brand Intelligence boundaries & internal surfaces', () => {
  test('1. Super Admin sees the full proprietary BI surface incl. Product Discovery + Regional Priority', async ({ page }) => {
    await loginAs(page, 'Super Admin — Tadii', 1400);
    await openNav(page, 'Brand Intelligence');

    await expect(page.locator('text=Brand Intelligence').first()).toBeVisible({ timeout: 8000 });
    // Decision 2 — proprietary panels render for Super Admin.
    await expect(page.locator('table[data-table="product-discovery"]').first()).toBeVisible({ timeout: 7000 });
    await expect(page.getByText('Regional Priority (internal)').first()).toBeVisible({ timeout: 7000 });
    await expect(page.locator('[data-section="regional-priority"]').first()).toBeVisible();
    // The canonical BI prospect table is present too.
    await expect(page.locator('table[data-testid="bi-prospect-table"]').first()).toBeVisible({ timeout: 7000 });
  });

  test('2. Non-Super staff are denied the proprietary BI surface (nav hidden, not merely relabelled)', async ({ page }) => {
    await loginAs(page, 'Mercenta Admin Hub', 1400);
    // Defense in depth: the nav item is absent for staff.
    await expect(
      page.locator('nav[aria-label="Primary"] button:has-text("Brand Intelligence")')
    ).toHaveCount(0);
    // Staff surfaces remain intact (control).
    await expect(page.locator('nav[aria-label="Primary"] button:has-text("Brand CRM")').first()).toBeVisible();
  });

  test('3. Brand-facing Market Intel shows qualitative positioning only — no raw score, no tier badges', async ({ page }) => {
    await loginAs(page, 'Astonish', 1400);
    await openNav(page, 'Market Intel');

    await expect(page.getByRole('heading', { name: /Your UK Market/ }).first()).toBeVisible({ timeout: 7000 });
    // Decision 1 — no proprietary score/tier on any brand surface.
    await expect(page.getByText(/Score:\s*\d+\/100/)).toHaveCount(0);
    await expect(page.locator('text=tier_1').first()).toHaveCount(0);
    await expect(page.locator('text=tier_2').first()).toHaveCount(0);
    // Qualitative positioning derived from the existing data model is shown instead.
    await expect(
      page.getByText(/Growing challenger|Established brand|Niche brand|Leading brand|Comparable brand|Your brand/).first()
    ).toBeVisible({ timeout: 7000 });
  });

  test('4. Internal notes editor saves via the canonical store with an audited lifecycle event', async ({ page }) => {
    await loginAs(page, 'Super Admin — Tadii', 1400);
    await openNav(page, 'Brand Intelligence');

    const table = page.locator('table[data-testid="bi-prospect-table"]').first();
    await expect(table).toBeVisible({ timeout: 8000 });
    const row = table.locator('tr', { hasText: 'Tapatío' }).first();
    await expect(row).toBeVisible({ timeout: 7000 });
    await row.click();
    await page.waitForTimeout(400);

    await page.locator('button:has-text("Notes")').first().click();
    await page.waitForTimeout(300);
    const note = `WSB internal note E2E ${Date.now()}`;
    await page.getByLabel('Internal notes').fill(note);
    await page.locator('button:has-text("Save notes")').click();
    await expect(page.getByText('Internal notes saved')).toBeVisible({ timeout: 5000 });

    // Auditability — the change event appears on the prospect timeline.
    await page.locator('button:has-text("History")').first().click();
    await page.waitForTimeout(300);
    await expect(page.getByText('Internal notes updated by operator').first()).toBeVisible({ timeout: 5000 });

    // Round-trip — returning to Notes re-reads the LIVE canonical store.
    await page.locator('button:has-text("Notes")').first().click();
    await page.waitForTimeout(300);
    await expect(page.locator('textarea[aria-label="Internal notes"]').first()).toHaveValue(note, { timeout: 5000 });
  });
});