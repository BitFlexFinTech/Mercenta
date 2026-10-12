/**
 * §BATCH 10 — ERROR-BOUNDARY CONTAINMENT COVERAGE.
 *
 * Registry row `s0-discovered-pagination-and-error-boundary-coverage-gap`.
 *
 * WHY THIS EXISTS
 * ---------------
 * The platform mounts six `ErrorBoundary` sites — the app root and the admin and
 * brand portals among them — whose whole job is to CONTAIN a render fault: show a
 * graceful fallback for the crashed section while the rest of the shell keeps
 * working (`src/components/shared/ErrorBoundary.tsx`). No browser spec proved
 * that. A boundary that silently stopped catching, or that blanked the whole app
 * instead of the section, would have shipped unseen.
 *
 * This spec injects a REAL render fault into the admin overview IN FLIGHT (the
 * dev-server route patches `src/components/admin/AdminDashboard.tsx` to throw
 * during render — the SAME no-application-change technique `state-coverage.spec.ts`
 * uses) and asserts the contract the boundary exists for:
 *   · the fault is CONTAINED — the fallback renders, naming the crashed section;
 *   · the shell SURVIVES — the primary navigation is still mounted and usable;
 *   · the fallback offers its recovery control ("Try again").
 * A control test proves the fallback does NOT appear without the fault.
 *
 * If the injection seam disappears the spec FAILS LOUDLY — a gate that tests
 * nothing must never pass (rule 07).
 */
import { test, expect, type Page } from '@playwright/test';
import { loginAs } from './helpers/auth';

/** Make the admin overview throw on render, WITHOUT touching app code. */
async function injectOverviewFault(page: Page) {
  await page.route('**/src/components/admin/AdminDashboard.tsx*', async (route) => {
    const res = await route.fetch();
    const body = await res.text();
    // Inject a throw as the FIRST statement of the component body. The dev server
    // serves this module TRANSFORMED (esbuild drops the original `void department`
    // marker), so the anchor is the function signature — identical in the source
    // and in the served output.
    const patched = body.replace(
      /export function AdminDashboard\(\{[\s\S]*?\}\) \{/,
      (m) => `${m}\n  throw new Error('E2E injected render fault (ErrorBoundary containment check)');`
    );
    if (patched === body) {
      throw new Error(
        'error-boundary gate: the AdminDashboard render seam was not found — the gate would test nothing'
      );
    }
    await route.fulfill({
      response: res,
      body: patched,
      headers: { ...res.headers(), 'content-type': 'application/javascript' },
    });
  });
}

test.describe('§BATCH 10 — the portal ErrorBoundary contains a real render fault', () => {
  test('1. without a fault the admin overview renders normally (the fallback is absent)', async ({ page }) => {
    await loginAs(page, 'Super Admin — Tadii', 1500);
    // No boundary fallback on a healthy render.
    await expect(page.getByRole('heading', { name: /something went wrong/ })).toHaveCount(0);
    await expect(page.getByRole('button', { name: 'Try again' })).toHaveCount(0);
    await expect(page.locator('nav[aria-label="Primary"]')).toBeVisible();
  });

  test('2. a render fault in the admin overview is contained and the shell survives', async ({ page }) => {
    await injectOverviewFault(page);
    await loginAs(page, 'Super Admin — Tadii', 1800);

    // CONTAINED — the boundary's fallback is shown, naming the crashed section.
    await expect(page.getByRole('heading', { name: /Admin portal.*something went wrong/ })).toBeVisible({ timeout: 10000 });
    await expect(page.getByText(/rest of the platform is unaffected/)).toBeVisible();
    // RECOVERABLE — the fallback offers its reset control.
    await expect(page.getByRole('button', { name: 'Try again' })).toBeVisible();
    // THE SHELL SURVIVES — the primary navigation is still mounted and usable.
    const nav = page.locator('nav[aria-label="Primary"]');
    await expect(nav).toBeVisible();
    await expect(nav.getByText('Global Catalog', { exact: true }).first()).toBeVisible();
  });
});
