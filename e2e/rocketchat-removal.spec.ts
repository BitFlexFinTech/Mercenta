/**
 * §Phase D1 — Rocket.Chat removal regression gate (browser).
 *
 * Rocket.Chat was removed from Mercenta in Phase D1: its nav entry, admin
 * panel, mock client/SSO factory, integration-registry card and self-hosted
 * service config are all gone. This spec proves, through the running app:
 *
 *   1. No Rocket.Chat entry in the Admin (Super Admin) navigation.
 *   2. No Rocket.Chat entry in the non-Super Admin navigation — and the other
 *      Integration-section entries are still present (only Rocket.Chat went).
 *   3. No Rocket.Chat card in Integration Settings; the remaining
 *      communications providers still render.
 *   4. Core communications still work with Rocket.Chat gone — Brand CRM,
 *      Messages and Helpdesk all render the same canonical conversation.
 *   5. The simulation CASE scenario needs no Rocket.Chat provider and runs.
 *
 * Static/domain-level absence (files gone, provider count 19 → 18,
 * IntegrationId has no 'rocketchat', the CASE scenario requires no provider)
 * is asserted by `scripts/validate-rocketchat-removal.mjs`.
 */
import { test, expect } from '@playwright/test';
import { loginAs } from './helpers/auth';

async function openNav(page: import('@playwright/test').Page, label: string) {
  // Target the nav item button — never a section heading with the same text.
  await page.locator(`nav[aria-label="Primary"] button:has-text("${label}")`).first().click();
  await page.waitForTimeout(700);
}

const REMOVED_LABEL = 'Rocket.Chat';

test.describe('Phase D1 — Rocket.Chat removal', () => {
  test('1. Super Admin navigation has no Rocket.Chat entry and no dangling route', async ({ page }) => {
    const pageErrors: string[] = [];
    page.on('pageerror', (e) => pageErrors.push(e.message));

    await loginAs(page, 'Super Admin — Tadii', 1200);
    const nav = page.locator('nav[aria-label="Primary"]');

    // Absent from the nav AND from the entire rendered shell.
    await expect(nav.locator(`text=${REMOVED_LABEL}`)).toHaveCount(0);
    await expect(page.locator(`text=${REMOVED_LABEL}`)).toHaveCount(0);

    // The Integration section survived the removal with its other entries.
    await expect(nav.locator('text=Integration Settings').first()).toBeVisible();
    await expect(nav.locator('text=Social Media').first()).toBeVisible();
    await expect(nav.locator('text=WhatsApp').first()).toBeVisible();

    // Admin still boots and renders the real dashboard.
    await expect(page.locator('text=POs awaiting action').first()).toBeVisible({ timeout: 6000 });
    expect(pageErrors).toEqual([]);
  });

  test('2. non-Super Admin navigation: Rocket.Chat gone, nothing else removed', async ({ page }) => {
    await loginAs(page, 'Mercenta Admin Hub', 1200);
    const nav = page.locator('nav[aria-label="Primary"]');

    await expect(nav.locator(`text=${REMOVED_LABEL}`)).toHaveCount(0);
    await expect(page.locator(`text=${REMOVED_LABEL}`)).toHaveCount(0);

    // Super-only entries stay hidden for a normal admin (RBAC untouched)…
    await expect(nav.locator('text=Integration Settings')).toHaveCount(0);
    // …while the non-super Integration-section entries remain reachable.
    await expect(nav.locator('text=Social Media').first()).toBeVisible();
    await expect(nav.locator('text=WhatsApp').first()).toBeVisible();
    await expect(nav.locator('text=Brand CRM').first()).toBeVisible();
  });
  test('3. Integration Settings registry has no Rocket.Chat card', async ({ page }) => {
    await loginAs(page, 'Super Admin — Tadii', 1200);
    await openNav(page, 'Integration Settings');

    await expect(page.locator('h3', { hasText: REMOVED_LABEL })).toHaveCount(0);
    await expect(page.locator(`text=${REMOVED_LABEL}`)).toHaveCount(0);

    // The remaining communications providers still render (removal was surgical).
    await expect(page.locator('h3', { hasText: 'Twilio WhatsApp' }).first()).toBeVisible({ timeout: 6000 });
    await expect(page.locator('h3', { hasText: 'Usertour' }).first()).toBeVisible({ timeout: 6000 });
    await expect(page.locator('h3', { hasText: 'Postiz' }).first()).toBeVisible({ timeout: 6000 });
  });

  test('4. core communications still work: CRM → Messages → Helpdesk (one canonical thread)', async ({ page }) => {
    const pageErrors: string[] = [];
    page.on('pageerror', (e) => pageErrors.push(e.message));

    await loginAs(page, 'Super Admin — Tadii', 1200);

    // CRM relationship context.
    await openNav(page, 'Brand CRM');
    await expect(page.locator('text=Astonish').first()).toBeVisible({ timeout: 6000 });

    // Messages inbox renders.
    await openNav(page, 'Messages');
    await expect(page.locator('h2', { hasText: 'Messages' }).first()).toBeVisible({ timeout: 6000 });

    // Helpdesk renders the same canonical conversation (tkt-001 →
    // msg-brand-astonish-1/-2 from DEMO_MESSAGES).
    await openNav(page, 'Helpdesk');
    await expect(page.locator('h2', { hasText: 'Helpdesk' }).first()).toBeVisible({ timeout: 6000 });
    await expect(page.locator('text=Astonish — PO dispatch query').first()).toBeVisible({ timeout: 6000 });
    await expect(page.locator('text=Thanks — can we talk about pricing and the first purchase order this week?').first()).toBeVisible({ timeout: 4000 });

    // No dangling Rocket.Chat import/call crashed any of these surfaces.
    await expect(page.locator(`text=${REMOVED_LABEL}`)).toHaveCount(0);
    expect(pageErrors).toEqual([]);
  });

  test('5. simulations still run: the CASE scenario needs no Rocket.Chat provider', async ({ page }) => {
    await loginAs(page, 'Super Admin — Tadii', 1200);
    await openNav(page, 'Super Admin');
    await page.locator('button:has-text("Simulation")').first().click();
    await page.waitForTimeout(800);

    const caseCard = page.locator('div.p-4', { hasText: 'Support Case' }).first();
    await expect(caseCard).toBeVisible({ timeout: 6000 });
    // Rocket.Chat is gone → the CASE scenario must be reported simulation-safe
    // (it exercises the internal helpdesk ticket store, no external provider).
    await expect(caseCard.locator('text=Simulation-safe').first()).toBeVisible({ timeout: 6000 });
    await expect(caseCard.locator('text=Refused — provider not simulation-safe')).toHaveCount(0);
    await caseCard.locator('text=Run').click();
    await expect(caseCard.locator('text=Succeeded').first()).toBeVisible({ timeout: 15000 });
  });
});
