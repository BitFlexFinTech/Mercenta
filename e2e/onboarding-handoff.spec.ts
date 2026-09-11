/**
 * §Phase E1 — Opportunity → brand onboarding hand-off (browser verification).
 *
 * Proves the missing link in the platform funnel, driven through the REAL UI
 * with no live credentials and no external network:
 *
 *   BI prospect (Tapatío) → outreach → approved → simulated send → response
 *     → Opportunity (qualified) → BEGIN onboarding → brand TENANT identity
 *     → 5 ordered onboarding steps → COMPLETE → operational brand
 *
 * Plus: the hand-off is visible in the Brand CRM relationship record, an
 * out-of-order completion / early finish is REFUSED with a real error (not a
 * toast), and a brand tenant session has no acquisition/onboarding surface.
 */
import { test, expect } from '@playwright/test';
import { loginAs } from './helpers/auth';

async function openNav(page: any, label: string) {
  await page.locator(`nav[aria-label="Primary"] button:has-text("${label}")`).first().click();
  await page.waitForTimeout(700);
}

/** Open a canonical prospect's detail panel and switch to the Outreach tab. */
async function openOutreachTab(page: any, brand: string) {
  await page.locator('table tbody tr', { hasText: brand }).first().click();
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

/** §Phase E1 — complete every onboarding step in order, then finish. */
async function completeOnboarding(page: any) {
  for (const step of ['profile', 'legal_agreements', 'banking', 'carriers', 'compliance']) {
    await page.locator(`[data-onboarding-step="${step}"] [data-state="complete-step"]`).first().click();
    await expect(page.locator(`[data-onboarding-step="${step}"]`)).toContainText('done', { timeout: 6000 });
  }
  await page.locator('button[data-state="finish-onboarding"]').first().click();
  await expect(page.locator('[data-section="onboarding"]')).toContainText('Operational brand', { timeout: 6000 });
}

test.describe('Opportunity → brand onboarding hand-off (Phase E1)', () => {
  test('1. Qualified opportunity → tenant identity → ordered steps → operational brand', async ({ page }) => {
    const pageErrors: string[] = [];
    page.on('pageerror', (e) => pageErrors.push(String(e)));

    await loginAs(page, 'Super Admin — Tadii', 1200);
    await toQualifiedOpportunity(page, 'Tapatío');

    // ── BEGIN: the hand-off creates the brand tenant identity ──
    const onboarding = page.locator('[data-section="onboarding"]');
    await expect(onboarding).toBeVisible({ timeout: 5000 });
    const start = page.locator('button[data-state="start-onboarding"]').first();
    await expect(start).toBeEnabled();
    await start.click();
    await expect(page.locator('[data-notice="ok"]').first()).toContainText('Onboarding started', { timeout: 6000 });

    await expect(onboarding.locator('[data-onboarding-status]').first())
      .toHaveAttribute('data-onboarding-status', 'initiated');
    // The tenant id is DERIVED from the canonical brand key (diacritics folded).
    await expect(onboarding.locator('[data-onboarding-tenant]').first()).toHaveText('brand-tapatio');
    // The relationship is retained: the record names the prospect AND opportunity.
    await expect(onboarding).toContainText('opp-prospect-tapatio');
    await expect(onboarding).toContainText('prospect-tapatio');
    await expect(onboarding).toContainText('onb-prospect-tapatio');

    // ── Refusals are REAL domain errors, not silent no-ops ──
    await page.locator('button[data-state="finish-onboarding"]').first().click();
    await expect(page.locator('[data-notice="error"]').first()).toContainText('INCOMPLETE_STEPS', { timeout: 6000 });
    // Steps are strictly ordered: a later step cannot jump the queue.
    await page.locator('[data-onboarding-step="banking"] [data-state="complete-step"]').first().click();
    await expect(page.locator('[data-notice="error"]').first()).toContainText('ILLEGAL_TRANSITION', { timeout: 6000 });

    // ── Ordered completion ──
    await completeOnboarding(page);
    await expect(onboarding.locator('[data-onboarding-status]').first())
      .toHaveAttribute('data-onboarding-status', 'completed');

    // ── The hand-off is on the canonical relationship timeline ──
    const relationship = page.locator('[data-section="relationship"]');
    await expect(relationship).toContainText('onboarding_started', { timeout: 6000 });
    await expect(relationship).toContainText('onboarding_step_completed');
    await expect(relationship).toContainText('onboarding_completed');
    expect(pageErrors).toEqual([]);
  });

  test('2. The hand-off is visible in the Brand CRM relationship record', async ({ page }) => {
    const pageErrors: string[] = [];
    page.on('pageerror', (e) => pageErrors.push(String(e)));

    await loginAs(page, 'Super Admin — Tadii', 1200);
    await toQualifiedOpportunity(page, 'Tapatío');
    await page.locator('button[data-state="start-onboarding"]').first().click();
    await expect(page.locator('[data-notice="ok"]').first()).toContainText('Onboarding started', { timeout: 6000 });
    await completeOnboarding(page);

    // ── Brand CRM: the pre-onboarding relationship now carries the hand-off ──
    await openNav(page, 'Brand CRM');
    await expect(page.locator('text=Acquisition Relationships (pre-onboarding)').first()).toBeVisible({ timeout: 6000 });
    const row = page.locator('[data-onboarding-row]').first();
    await expect(row).toHaveAttribute('data-onboarding-row', 'completed', { timeout: 6000 });
    await expect(row).toContainText('tenant brand-tapatio');
    await expect(page.locator('text=/In onboarding: 1/').first()).toBeVisible();
    await expect(page.locator('text=/Operational: 1/').first()).toBeVisible();

    // Opening the row shows the SAME canonical onboarding record (one source).
    await page.locator('button:has-text("Tapatío")').first().click();
    await page.waitForTimeout(500);
    await expect(page.locator('[data-section="crm-acquisition-relationship"] [data-section="onboarding"]'))
      .toContainText('Operational brand', { timeout: 6000 });
    expect(pageErrors).toEqual([]);
  });

  test('3. A brand tenant session has no acquisition/onboarding surface', async ({ page }) => {
    await loginAs(page, 'Little Kiwi Baby Co', 1400);
    const nav = page.locator('nav[aria-label="Primary"]');
    await expect(nav.locator('button:has-text("Brand Intelligence")')).toHaveCount(0);
    await expect(page.locator('[data-section="onboarding"]')).toHaveCount(0);
  });
});

