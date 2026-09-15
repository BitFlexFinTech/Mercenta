/**
 * §Phase E2 — onboarding workflow (browser verification).
 *
 * Proves the stateful onboarding workflow through the REAL UI:
 *
 *   qualified opportunity OR approved application OR manual creation
 *     → canonical onboarding record (one identity, derived tenant id)
 *     → Admin Onboarding Pipeline: acceptance → ordered steps → OPERATIONAL
 *     → the brand tenant can actually enter its portal
 *
 * Also proves the pipeline is DERIVED (empty until something is onboarded, and it
 * reports 0 — never a seeded number), and that a brand session has no access to it.
 */
import { test, expect } from '@playwright/test';
import { loginAs } from './helpers/auth';

async function openNav(page: any, label: string) {
  await page.locator(`nav[aria-label="Primary"] button:has-text("${label}")`).first().click();
  await page.waitForTimeout(700);
}

/** Exact-label nav click (…"Onboarding" must not match "Onboarding Tours"). */
async function openAdminNavExact(page: any, label: string) {
  await page
    .locator('nav[aria-label="Primary"] button')
    .filter({ hasText: new RegExp(`^${label}$`) })
    .first()
    .click();
  await page.waitForTimeout(700);
}

/** The nav buttons whose label is EXACTLY `label` (for presence assertions). */
function navButtonExact(page: any, label: string) {
  return page.locator('nav[aria-label="Primary"] button').filter({ hasText: new RegExp(`^${label}$`) });
}

async function openOutreachTab(page: any, brand: string) {
  await page.locator('[data-testid="bi-prospect-table"] tbody tr', { hasText: brand }).first().click();
  await page.waitForTimeout(400);
  await page.locator('button:has-text("Outreach")').first().click();
  await page.waitForTimeout(400);
  await expect(page.locator('[data-section="acquisition-workflow"]')).toBeVisible({ timeout: 5000 });
}

/** Drive the canonical acquisition workflow to a QUALIFIED opportunity. */
async function toQualifiedOpportunity(page: any, brand: string) {
  await openNav(page, 'Brand Intelligence');
  await openOutreachTab(page, brand);
  await page.locator('button[data-state="prepare"]').first().click();
  await expect(page.locator('[data-revision]').first()).toContainText('pending_approval', { timeout: 6000 });
  await page.locator('button[data-state="approve"]').first().click();
  await expect(page.locator('[data-revision]').first()).toContainText('approved', { timeout: 6000 });
  await page.locator('button[data-state="send"]').first().click();
  await expect(page.locator('[data-revision]').first()).toContainText('sent', { timeout: 6000 });
  await page.locator('button[data-state="simulate-response"]').first().click();
  await expect(page.locator('[data-section="responses"]')).toContainText('[SIMULATED REPLY', { timeout: 6000 });
  await page.locator('button[data-state="create-opportunity"]').first().click();
  await expect(page.locator('[data-section="opportunity"]')).toContainText('opp-prospect-tapatio', { timeout: 6000 });
  await expect(page.locator('[data-section="opportunity"] [data-opportunity-stage]').first())
    .toHaveAttribute('data-opportunity-stage', /qualified|won/, { timeout: 6000 });
}

/**
 * Leave the admin shell and open the login portal WITHOUT a page reload, so the
 * in-memory canonical store (and therefore the new brand tenant) is preserved.
 */
async function backHomeAndOpenLogin(page: any) {
  await page.locator('header button[title="Back to homepage"]').first().click();
  await page.waitForTimeout(700);
  await page.getByRole('button', { name: 'Partner Login' }).first().click();
  await page.waitForTimeout(700);
}

const STEPS = ['profile', 'legal_agreements', 'banking', 'carriers', 'compliance'];

test.describe('Onboarding workflow (Phase E2)', () => {
  test('1. Admin operates an acquisition-origin onboarding to OPERATIONAL in the pipeline', async ({ page }) => {
    const pageErrors: string[] = [];
    page.on('pageerror', (e) => pageErrors.push(String(e)));

    await loginAs(page, 'Super Admin — Tadii', 1200);
    await toQualifiedOpportunity(page, 'Tapatío');
    await page.locator('button[data-state="start-onboarding"]').first().click();
    await expect(page.locator('[data-notice="ok"]').first()).toContainText('Onboarding started', { timeout: 6000 });

    // ── The pipeline lists the REAL record with its real origin ──
    await openAdminNavExact(page, 'Onboarding');
    const pipeline = page.locator('[data-section="onboarding-pipeline"]');
    await expect(pipeline).toBeVisible({ timeout: 6000 });
    const row = pipeline.locator('[data-onboarding-row]').first();
    await expect(row).toHaveAttribute('data-onboarding-row', 'initiated');
    await expect(row).toContainText('Tapatío');
    await expect(row).toContainText('Acquisition');
    await expect(row).toContainText('prospect prospect-tapatio');
    await expect(page.locator('[data-pipeline-filter="all"]')).toContainText('1');

    // ── Acceptance is a real, audited transition ──
    await row.click();
    const detail = page.locator('[data-section="onboarding-detail"]');
    await expect(detail).toContainText('Originating opportunity');
    await expect(detail).toContainText('opp-prospect-tapatio');
    // Steps cannot be finished out of order, even from the pipeline.
    await detail.locator('[data-step="banking"] [data-state="pipeline-complete-step"]').first().click();
    await expect(page.locator('[data-notice="error"]').first()).toContainText('ILLEGAL_TRANSITION', { timeout: 6000 });
    await detail.locator('[data-state="pipeline-accept"]').first().click();
    await expect(page.locator('[data-notice="ok"]').first()).toContainText('acceptance recorded', { timeout: 6000 });
    await expect(pipeline.locator('[data-onboarding-row]').first()).toHaveAttribute('data-onboarding-row', 'accepted');

    // ── Ordered completion, then operational ──
    for (const step of STEPS) {
      await detail.locator(`[data-step="${step}"] [data-state="pipeline-complete-step"]`).first().click();
      await expect(detail.locator(`[data-onboarding-step="${step}"]`)).toContainText('done', { timeout: 6000 });
    }
    await detail.locator('[data-state="pipeline-finish"]').first().click();
    await expect(detail).toContainText('Operational brand', { timeout: 6000 });
    await expect(detail).toContainText('tenant brand-tapatio');
    await expect(pipeline.locator('[data-onboarding-row]').first()).toHaveAttribute('data-onboarding-row', 'completed');

    // ── The counts are derived from the record, and filter the list ──
    await page.locator('[data-pipeline-filter="completed"]').first().click();
    await expect(pipeline.locator('[data-onboarding-row]')).toHaveCount(1);
    await expect(page.locator('[data-pipeline-filter="completed"]')).toContainText('1');
    expect(pageErrors).toEqual([]);
  });

  test('2. The pipeline is derived (0 when empty) and brand sessions cannot reach it', async ({ page }) => {
    const pageErrors: string[] = [];
    page.on('pageerror', (e) => pageErrors.push(String(e)));

    await loginAs(page, 'Super Admin — Tadii', 1200);
    await openAdminNavExact(page, 'Onboarding');
    const pipeline = page.locator('[data-section="onboarding-pipeline"]');
    await expect(pipeline).toBeVisible({ timeout: 6000 });
    // Nothing has been onboarded in this session → the screen must say so, and
    // every count must be 0 (no seeded/aspirational numbers).
    await expect(pipeline).toContainText('No onboarding records yet');
    await expect(page.locator('[data-pipeline-filter="all"]')).toContainText('0');
    await expect(page.locator('[data-pipeline-filter="completed"]')).toContainText('0');
    await expect(page.locator('[data-onboarding-row]')).toHaveCount(0);
    expect(pageErrors).toEqual([]);

    // A brand session has no onboarding-pipeline surface at all.
    await backHomeAndOpenLogin(page);
    await page.click('text=Little Kiwi Baby Co');
    await page.waitForTimeout(1200);
    await expect(navButtonExact(page, 'Onboarding')).toHaveCount(0);
    await expect(page.locator('[data-section="onboarding-pipeline"]')).toHaveCount(0);
  });

  test('3. Manual creation → canonical record → the brand tenant can enter its portal', async ({ page }) => {
    const pageErrors: string[] = [];
    page.on('pageerror', (e) => pageErrors.push(String(e)));

    await loginAs(page, 'Super Admin — Tadii', 1200);

    // ── Operator creates the brand (Super Admin → Applications → manual) ──
    await openNav(page, 'Super Admin');
    await page.locator('text=Applications').first().click();
    await page.waitForTimeout(600);
    await page.getByRole('button', { name: '+ Add Brand Manually' }).first().click();
    await page.waitForTimeout(500);
    await page.locator('input[placeholder="Brand legal name"]').fill('Harbour & Fen Trading Co');
    await page.locator('input[placeholder="Primary contact"]').fill('Rowan Pike');
    await page.locator('input[placeholder="brand@example.com"]').fill('trade@harbourfen.example');
    await page.locator('input[placeholder="e.g. Zimbabwe"]').fill('United Kingdom');
    await page.getByRole('button', { name: 'Create Brand Account' }).first().click();
    await page.waitForTimeout(900);

    // ── The canonical record exists with the DERIVED deterministic tenant id ──
    await openAdminNavExact(page, 'Onboarding');
    const pipeline = page.locator('[data-section="onboarding-pipeline"]');
    await expect(pipeline).toBeVisible({ timeout: 6000 });
    const row = pipeline.locator('[data-onboarding-row]').first();
    await expect(row).toContainText('Harbour & Fen Trading Co', { timeout: 6000 });
    await expect(row).toContainText('Manual');
    await expect(row).toContainText('brand-harbourfentradingco');

    // ── The brand tenant can actually reach its portal (the hand-off is not a dead end) ──
    await backHomeAndOpenLogin(page);
    const card = page.locator('button', { hasText: 'Harbour & Fen Trading Co' }).first();
    await expect(card).toBeVisible({ timeout: 6000 });
    await expect(card).toContainText('Onboarding');
    await card.click();
    await page.waitForTimeout(1200);
    // A brand that has not submitted its onboarding lands in the wizard — the
    // honest next step. It has no products/POs because it has supplied none.
    await expect(page.locator('h2').filter({ hasText: /Brand Profile/ }).first()).toBeVisible({ timeout: 8000 });
    expect(pageErrors).toEqual([]);
  });
});

