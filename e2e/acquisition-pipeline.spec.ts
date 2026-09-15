/**
 * §Phase C — Acquisition pipeline (browser verification).
 *
 * Proves the complete acceptance workflow on a REAL canonical Brand
 * Intelligence prospect, with no live credentials and no external network:
 *
 *   BI prospect (Tapatío) → ICP identity → outreach prepared from BI evidence
 *     → MODIFY → APPROVE → simulated SEND → deterministic simulated RESPONSE
 *     → OPPORTUNITY → CRM relationship context → the SAME canonical Messages
 *     thread (one conversation, not two).
 *
 * Plus: the REJECT path on a second real prospect, and brand-tenant isolation
 * (a brand session has no acquisition surface and cannot see the thread).
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

test.describe('Acquisition pipeline (Phase C)', () => {
  test('1. Real BI brand → ICP → approval → simulated send → response → opportunity → CRM', async ({ page }) => {
    const pageErrors: string[] = [];
    page.on('pageerror', (e) => pageErrors.push(String(e)));

    await loginAs(page, 'Super Admin — Tadii', 1200);
    await openNav(page, 'Brand Intelligence');
    await expect(page.locator('h2', { hasText: 'Brand Intelligence' }).first()).toBeVisible({ timeout: 6000 });

    // ── BI prospect → ICP identity → BI evidence ──
    await openOutreachTab(page, 'Tapatío');
    await expect(page.locator('[data-section="evidence"]')).toContainText('Why we are contacting this brand');
    // The acquisition record IS the canonical prospect (same id → same ICP lead).
    await expect(page.locator('text=prospect-tapatio').first()).toBeVisible();
    await expect(page.locator('text=lead-prospect-tapatio').first()).toBeVisible();

    // ── Prepare the recommendation from the real BI record ──
    await page.locator('button[data-state="prepare"]').first().click();
    await expect(page.locator('[data-notice="ok"]').first()).toContainText('Recommendation prepared', { timeout: 6000 });
    await expect(page.locator('[data-revision]').first()).toContainText('pending_approval');
    await expect(page.locator('[data-revision]').first()).toContainText('revision 1');
    // BI evidence is now attached to the recommendation (why-contact answerable).
    await expect(page.locator('[data-section="evidence"]')).toContainText('Outreach: Tapatío');
    await expect(page.locator('[data-section="evidence"]')).toContainText('Score:');

    // ── MODIFY (human edit before approval) ──
    await page.locator('[data-section="recommendation"] input').first().fill('Tapatío × Mercenta — UK wholesale (edited)');
    await page.locator('button[data-state="modify"]').first().click();
    await expect(page.locator('[data-notice="ok"]').first()).toContainText('modified', { timeout: 6000 });
    await expect(page.locator('[data-revision]').first()).toContainText('revision 2');

    // ── APPROVE ──
    await page.locator('button[data-state="approve"]').first().click();
    await expect(page.locator('[data-notice="ok"]').first()).toContainText('Approved', { timeout: 6000 });
    await expect(page.locator('[data-revision]').first()).toContainText('approved');

    // ── Simulated SEND (no credentials, no external network) ──
    await page.locator('button[data-state="send"]').first().click();
    await expect(page.locator('[data-notice="ok"]').first()).toContainText('simulation path', { timeout: 6000 });
    await expect(page.locator('[data-revision]').first()).toContainText('sent');
    await expect(page.locator('[data-section="relationship"]')).toContainText('[SIMULATED SEND', { timeout: 5000 });

    // ── Deterministic simulated RESPONSE ──
    await page.locator('button[data-state="simulate-response"]').first().click();
    await expect(page.locator('[data-section="responses"]')).toContainText('[SIMULATED REPLY', { timeout: 6000 });
    await expect(page.locator('[data-section="responses"]')).toContainText('hot lead');
    // The response is associated with THIS prospect + audited on the timeline.
    await expect(page.locator('[data-section="relationship"]')).toContainText('response_received');

    // ── OPPORTUNITY ──
    await page.locator('button[data-state="create-opportunity"]').first().click();
    const oppSection = page.locator('[data-section="opportunity"]');
    await expect(oppSection).toContainText('qualified', { timeout: 6000 });
    await expect(oppSection).toContainText('opp-prospect-tapatio');
    await expect(oppSection).toContainText('BI snapshot');
    expect(pageErrors).toEqual([]);
  });

  test('1b. The relationship is visible in the CRM and in the ONE canonical Messages thread', async ({ page }) => {
    const pageErrors: string[] = [];
    page.on('pageerror', (e) => pageErrors.push(String(e)));
    await loginAs(page, 'Super Admin — Tadii', 1200);
    await openNav(page, 'Brand Intelligence');
    await openOutreachTab(page, 'Tapatío');
    await page.locator('button[data-state="prepare"]').first().click();
    await expect(page.locator('[data-revision]').first()).toContainText('pending_approval', { timeout: 6000 });
    await page.locator('button[data-state="approve"]').first().click();
    await page.locator('button[data-state="send"]').first().click();
    await expect(page.locator('[data-revision]').first()).toContainText('sent', { timeout: 6000 });
    await page.locator('button[data-state="simulate-response"]').first().click();
    await expect(page.locator('[data-section="responses"]')).toContainText('[SIMULATED REPLY', { timeout: 6000 });
    await page.locator('button[data-state="create-opportunity"]').first().click();
    await expect(page.locator('[data-section="opportunity"]')).toContainText('opp-prospect-tapatio', { timeout: 6000 });

    // CRM: the pre-onboarding relationship record (same canonical context).
    await openNav(page, 'Brand CRM');
    await expect(page.locator('text=Acquisition Relationships (pre-onboarding)').first()).toBeVisible({ timeout: 6000 });
    await page.locator('button:has-text("Tapatío")').first().click();
    await page.waitForTimeout(500);
    const crmRel = page.locator('[data-section="crm-acquisition-relationship"]');
    await expect(crmRel).toBeVisible({ timeout: 5000 });
    await expect(crmRel).toContainText('opp-prospect-tapatio');
    await expect(crmRel).toContainText('Canonical conversation');
    await expect(crmRel).toContainText('[SIMULATED SEND');

    // Messages: the SAME conversation — one canonical store, not a duplicate.
    await openNav(page, 'Messages');
    await page.locator('button:has-text("Tapatío (prospect)")').first().click();
    await page.waitForTimeout(500);
    await expect(page.locator('text=/\\[SIMULATED REPLY/').first()).toBeVisible({ timeout: 6000 });
    expect(pageErrors).toEqual([]);
  });

  test('2. REJECT is a real, distinct approval outcome on a second real brand', async ({ page }) => {
    const pageErrors: string[] = [];
    page.on('pageerror', (e) => pageErrors.push(String(e)));
    await loginAs(page, 'Super Admin — Tadii', 1200);
    await openNav(page, 'Brand Intelligence');
    await openOutreachTab(page, 'Seep');

    await page.locator('button[data-state="prepare"]').first().click();
    await expect(page.locator('[data-revision]').first()).toContainText('pending_approval', { timeout: 6000 });
    await page.locator('[data-section="recommendation"] input[placeholder="Rejection reason"]').first().fill('Q4 range fit — revisit in Q1');
    await page.locator('button[data-state="reject"]').first().click();
    await expect(page.locator('[data-notice="ok"]').first()).toContainText('rejected', { timeout: 6000 });
    await expect(page.locator('[data-revision]').first()).toContainText('rejected');
    // Rejected is terminal for that revision: no send/approve actions remain.
    await expect(page.locator('button[data-state="send"]')).toHaveCount(0);
    await expect(page.locator('button[data-state="approve"]')).toHaveCount(0);
    // The rejection is audited on the relationship timeline.
    await expect(page.locator('[data-section="relationship"]')).toContainText('outreach_rejected');
    expect(pageErrors).toEqual([]);
  });

  test('3. Tenant isolation — a brand session has no acquisition surface and no prospect thread', async ({ page }) => {
    const pageErrors: string[] = [];
    page.on('pageerror', (e) => pageErrors.push(String(e)));
    await loginAs(page, 'Zambezi Organic Extracts Ltd', 1200);
    await expect(page.locator('text=Brand Overview').first()).toBeVisible({ timeout: 6000 });
    // No acquisition/ICP surface exists inside the brand environment.
    await expect(page.locator('text=Acquisition Pipeline')).toHaveCount(0);
    await expect(page.locator('text=Acquisition Relationships')).toHaveCount(0);
    await expect(page.locator('nav[aria-label="Primary"] button:has-text("Brand CRM")')).toHaveCount(0);
    await expect(page.locator('nav[aria-label="Primary"] button:has-text("Marketing")')).toHaveCount(0);
    // The brand's own support/team messaging never shows another party's
    // acquisition thread (brand sessions are pinned to their own tenant).
    await page.locator('nav[aria-label="Primary"] button:has-text("Support & Team")').first().click();
    await page.waitForTimeout(600);
    await expect(page.locator('text=Tapatío')).toHaveCount(0);
    expect(pageErrors).toEqual([]);
  });
});
