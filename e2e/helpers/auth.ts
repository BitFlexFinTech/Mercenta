/**
 * §Phase 7A — Canonical E2E login entry.
 *
 * The product renamed the public CTA from the obsolete "Get Started" to
 * "Partner Login" (single source of truth: src/config/homepageContent.ts →
 * hero.secondaryCta). These helpers centralise the login-ENTRY steps so every
 * spec follows the real application path, mirroring the pattern that Phase 5/6
 * already validated in simulation-control / app-shell / design-system (26/26).
 *
 * They only OPEN the login portal — they never authenticate, bypass auth, or
 * mutate application state. Callers click the one-click demo card afterwards.
 *
 * Test-only helper; not a Playwright spec (no *.spec.ts suffix → not collected).
 */
import type { Page } from '@playwright/test';

/**
 * Open the marketing homepage and enter the login portal.
 *
 * Desktop: clicks the canonical "Partner Login" accessible button (hero/nav).
 * Mobile (hero CTA hidden): opens the nav drawer and clicks its full-width
 * "Partner Login" button last in DOM order — the same fallback the Phase 5/6
 * reference suites use.
 */
export async function openLogin(page: Page): Promise<void> {
  await page.goto('/');
  const heroLogin = page.getByRole('button', { name: 'Partner Login' }).first();
  try {
    await heroLogin.click({ timeout: 4000 });
  } catch {
    await page.getByRole('button', { name: 'Open navigation' }).click();
    await page.waitForTimeout(400);
    await page.getByRole('button', { name: 'Partner Login' }).last().click();
  }
  await page.waitForTimeout(600);
}

/**
 * Open the login portal and select a one-click demo card by its visible label
 * (e.g. "Mercenta Admin Hub", "Super Admin — Tadii", a brand name).
 * `waitMs` mirrors each caller's existing post-card wait.
 */
export async function loginAs(page: Page, card: string, waitMs = 800): Promise<void> {
  await openLogin(page);
  await page.click('text=' + card);
  await page.waitForTimeout(waitMs);
}