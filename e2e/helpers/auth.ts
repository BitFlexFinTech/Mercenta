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
 * §RUNTIME PARITY — the runtime now RESTORES a demo session on load
 * (`src/lib/runtime/sessionPersistence.ts`), which is what makes a refresh stay
 * in the product. A spec that wants the login ENTRY therefore has to start from
 * a clean tab; this clears the demo session ONLY when the entry is not already
 * on screen, so specs that exercise the restored-session behaviour are
 * unaffected (they never call this helper).
 */
async function ensureLoginEntry(page: Page): Promise<void> {
  const heroLogin = page.getByRole('button', { name: 'Partner Login' }).first();
  if (await heroLogin.isVisible({ timeout: 8000 }).catch(() => false)) return;
  await page
    .evaluate(() => {
      try {
        window.sessionStorage.clear();
      } catch {
        /* storage unavailable — nothing to clear */
      }
    })
    .catch(() => {});
  await page.goto('/');
  await heroLogin.waitFor({ state: 'visible', timeout: 15000 }).catch(() => {});
}

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
  await ensureLoginEntry(page);
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