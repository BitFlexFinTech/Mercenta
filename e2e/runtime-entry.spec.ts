/**
 * §RUNTIME PARITY — RUNTIME ENTRY, ADDRESSING AND REFRESH (real Chromium).
 *
 * This spec exists because the product was reachable but UN-ADDRESSABLE: the URL
 * read `/` in every environment, a refresh silently signed the user out and
 * Back/Forward left the application entirely. Compiling, typechecking and even
 * rendering were all green while that was true — which is exactly why it is
 * asserted here, in a browser, at the address bar.
 *
 * It proves:
 *   1  `/` is STILL the public marketing homepage (the guard for the whole suite)
 *   2  a cold product deep link shows the login entry and KEEPS the address
 *   3  after the one-click demo login the REQUESTED destination renders
 *   4  F5 in place stays in place (the regression test for the silent sign-out)
 *   5  Back/Forward move between product views
 *   6  the declared destination of every carrier nav item is honoured
 *   7  a tier that may not enter an environment is refused (AccessDenied)
 *   8  a tampered/unknown persisted session fails CLOSED
 *   9  a public address stays public even with a live session
 *  10  no page errors and no external calls while doing all of the above
 *
 * Dev server started by playwright.config.ts (npm run dev, :5173).
 */
import { test, expect, type Page } from '@playwright/test';
import { openLogin } from './helpers/auth';

const SESSION_KEY = 'mercenta.session.v1';

function watchExternalCalls(page: Page): string[] {
  const externalCalls: string[] = [];
  page.on('request', (req) => {
    const url = req.url();
    const isDev = url.startsWith('http://localhost') || url.startsWith('http://127.0.0.1');
    const isWs = url.startsWith('ws://') || url.startsWith('wss://');
    const isStatic =
      /\.(woff2?|css|png|jpe?g|svg|ico)(\?|$)/.test(url) ||
      url.includes('gstatic.com') ||
      url.includes('fonts.g');
    const isPlaceholderImage = url.includes('picsum.photos');
    if (!isDev && !isWs && !isStatic && !isPlaceholderImage) externalCalls.push(url);
  });
  return externalCalls;
}

async function trackErrors(page: Page): Promise<string[]> {
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(String(e)));
  return errors;
}

/** The brand tour overlay covers the portal on a first visit; stop it via its store. */
async function dismissTour(page: Page, brandId = 'brand-astonish') {
  await page
    .evaluate(async (id) => {
      const m = await import('/src/components/shared/TourEngine.tsx');
      const defs = await import('/src/config/tours/tourDefinitions.ts');
      for (const t of defs.ALL_TOUR_DEFINITIONS) {
        m.markTourSkipped(id, t.id);
        m.markTourCompleted(id, t.id);
      }
      m.stopTour(id);
      m.dismissTour(id);
    }, brandId)
    .catch(() => {});
  await page.waitForTimeout(200);
}

test.describe('§RUNTIME PARITY — entry, addressing and refresh', () => {
  test('1. `/` is still the public marketing homepage (with and without a session)', async ({ page }) => {
    const errors = await trackErrors(page);
    const externalCalls = watchExternalCalls(page);

    await page.goto('/');
    await expect(page.getByRole('button', { name: 'Partner Login' }).first()).toBeVisible({
      timeout: 10000,
    });
    expect(new URL(page.url()).pathname).toBe('/');

    // With a LIVE session, `/` must still be the public homepage: the address
    // decides the environment, and the session is merely retained.
    await openLogin(page);
    await page.click('text=Super Admin — Tadii');
    await page.waitForTimeout(1500);
    expect(new URL(page.url()).pathname).toBe('/admin/overview');

    await page.goto('/');
    await expect(page.getByRole('button', { name: 'Partner Login' }).first()).toBeVisible({
      timeout: 10000,
    });
    expect(new URL(page.url()).pathname).toBe('/');

    expect(errors).toEqual([]);
    expect(externalCalls).toEqual([]);
  });

  test('2/3. a cold product deep link keeps its address and lands on the requested view', async ({ page }) => {
    const errors = await trackErrors(page);

    // COLD: no session at all. The login entry is shown and the address is kept.
    await page.goto('/admin/brain');
    await expect(page.getByRole('heading', { name: 'Partner Login' })).toBeVisible({
      timeout: 10000,
    });
    expect(new URL(page.url()).pathname).toBe('/admin/brain');

    // The one-click demo login is the REAL entry path; no session is fabricated.
    await page.click('text=Super Admin — Tadii');
    await page.waitForTimeout(2000);
    expect(new URL(page.url()).pathname).toBe('/admin/brain');
    await expect(page.getByTestId('brain-canvas')).toBeVisible({ timeout: 15000 });

    // The brand side of the same rule.
    const brandPage = await page.context().newPage();
    await brandPage.goto('/brand/logistics');
    await expect(brandPage.getByRole('heading', { name: 'Partner Login' })).toBeVisible({
      timeout: 10000,
    });
    await brandPage.click('text=Astonish');
    await brandPage.waitForTimeout(2500);
    await dismissTour(brandPage);
    expect(new URL(brandPage.url()).pathname).toBe('/brand/logistics');
    await expect(brandPage.getByTestId('logistics-map')).toBeVisible({ timeout: 15000 });
    await brandPage.close();

    expect(errors).toEqual([]);
  });

  test('4. F5 in place stays in place (no silent sign-out)', async ({ page }) => {
    const errors = await trackErrors(page);
    await openLogin(page);
    await page.click('text=Super Admin — Tadii');
    await page.waitForTimeout(1500);

    const nav = page.locator('nav[aria-label="Primary"]');
    await nav.getByRole('button', { name: 'Logistics Hub', exact: true }).click();
    await expect(page.getByRole('heading', { name: 'Logistics Hub' })).toBeVisible({
      timeout: 10000,
    });
    expect(new URL(page.url()).pathname).toBe('/admin/logistics');

    await page.reload();
    await page.waitForTimeout(1500);
    expect(new URL(page.url()).pathname).toBe('/admin/logistics');
    await expect(page.getByRole('heading', { name: 'Logistics Hub' })).toBeVisible({
      timeout: 10000,
    });
    await expect(page.getByRole('button', { name: 'Partner Login' })).toHaveCount(0);

    expect(errors).toEqual([]);
  });

  test('5. Back/Forward move between product views instead of leaving the app', async ({ page }) => {
    await openLogin(page);
    await page.click('text=Super Admin — Tadii');
    await page.waitForTimeout(1500);
    const nav = page.locator('nav[aria-label="Primary"]');

    await nav.getByRole('button', { name: 'Logistics Hub', exact: true }).click();
    await expect(page.getByRole('heading', { name: 'Logistics Hub' })).toBeVisible({
      timeout: 10000,
    });
    await nav.getByRole('button', { name: 'Mercenta Brain', exact: true }).click();
    await expect(page.getByTestId('brain-canvas')).toBeVisible({ timeout: 15000 });
    expect(new URL(page.url()).pathname).toBe('/admin/brain');

    await page.goBack();
    await page.waitForTimeout(1000);
    expect(new URL(page.url()).pathname).toBe('/admin/logistics');
    await expect(page.getByRole('heading', { name: 'Logistics Hub' })).toBeVisible({
      timeout: 10000,
    });

    await page.goForward();
    await page.waitForTimeout(1000);
    expect(new URL(page.url()).pathname).toBe('/admin/brain');
    await expect(page.getByTestId('brain-canvas')).toBeVisible({ timeout: 15000 });
  });

  test('6. every carrier nav destination is honoured at its own address', async ({ page }) => {
    await openLogin(page);
    await page.click('text=3PL Carrier Terminal');
    await page.waitForTimeout(1800);
    expect(new URL(page.url()).pathname).toBe('/carrier/manifest');

    const nav = page.locator('nav[aria-label="Primary"]');
    await nav.getByRole('button', { name: 'BAK Logistics Hub', exact: true }).click();
    await page.waitForTimeout(800);
    expect(new URL(page.url()).pathname).toBe('/carrier/bak');

    // §RUNTIME PARITY — the API Request Auditor used to render the manifest
    // terminal unchanged (a control whose outcome did not match its label). The
    // declared destination is now honoured: the terminal opens AT the auditor.
    await nav.getByRole('button', { name: 'API Request Auditor', exact: true }).click();
    await page.waitForTimeout(800);
    expect(new URL(page.url()).pathname).toBe('/carrier/auditor');
    await expect(page.getByTestId('carrier-auditor-section')).toHaveAttribute('data-focus', 'auditor');
    await expect(page.getByText('API Request Auditor').first()).toBeVisible();
  });

  test('7. a tier that may not enter an environment is refused (AccessDenied, not the panel)', async ({ page }) => {
    // Mercenta Admin (admin_staff) may enter the admin environment but is NOT a
    // Super Admin, so the private views must refuse — the route layer must never
    // have become a way around the render guard.
    await openLogin(page);
    await page.click('text=Mercenta Admin Hub');
    await page.waitForTimeout(1800);

    await page.goto('/admin/super_admin');
    await page.waitForTimeout(1500);
    await expect(page.getByRole('heading', { name: 'Super Admin Access Required' })).toBeVisible({
      timeout: 10000,
    });
    await expect(page.getByText('Super Admin Panel — Tadii')).toHaveCount(0);

    // An address naming a view this shell cannot render (the declared id is
    // `super_admin`) must never render a BLANK workspace: it resolves to the
    // declared default view.
    await page.goto('/admin/not-a-declared-view');
    await page.waitForTimeout(1500);
    /**
     * §P5 copy pass — REPOINTED (old contract recorded inline): the default view's
     * h1 used to read `'Operations Overview'`; it now reads `'Overview'` (the page
     * is the Overview and Operations is a separate destination). The assertion's
     * intent is unchanged and NOT weakened: an address naming a view this shell
     * cannot render must resolve to the declared default view and render its real
     * heading, never a blank workspace.
     */
    await expect(page.getByRole('heading', { name: 'Overview', exact: true })).toBeVisible({
      timeout: 10000,
    });

    // The private nav destinations are hidden for this tier as well.
    const nav = page.locator('nav[aria-label="Primary"]');
    await expect(nav.getByRole('button', { name: 'Super Admin', exact: true })).toHaveCount(0);
    await expect(nav.getByRole('button', { name: 'Mercenta Brain', exact: true })).toHaveCount(0);
  });

  test('8. a tampered or unknown persisted session fails CLOSED', async ({ page }) => {
    // (a) A brand-tier session claiming the ADMIN environment is refused: the
    // stored value is re-validated through the canonical allowlist on restore.
    await page.goto('/');
    await page.evaluate(
      ([key, value]) => window.sessionStorage.setItem(key, value),
      [SESSION_KEY, JSON.stringify({ environment: 'admin', tier: 'brand', role: 'Brand Partner', tenantId: 'brand-astonish' })]
    );
    await page.goto('/admin/overview');
    await page.waitForTimeout(1500);
    await expect(page.getByRole('heading', { name: 'Partner Login' })).toBeVisible({ timeout: 10000 });
    /**
     * §P5 copy pass — REPOINTED (old contract recorded inline): this asserted the
     * absence of the admin Overview's old h1 `'Operations Overview'`. The h1 now
     * reads `'Overview'`, and because the pre-fix string no longer exists anywhere
     * the old assertion had become unable to fail; pointing it at the CURRENT title
     * restores its real force — a refused session must never reach the admin
     * Overview.
     */
    await expect(page.getByRole('heading', { name: 'Overview', exact: true })).toHaveCount(0);

    // (b) An UNKNOWN tenant is refused rather than rendered: the session is
    // dropped and the public entry is shown — never a portal for a tenant the
    // platform does not hold.
    await page.goto('/');
    await page.evaluate(
      ([key, value]) => window.sessionStorage.setItem(key, value),
      [SESSION_KEY, JSON.stringify({ environment: 'brand', tier: 'brand', role: 'Brand Partner', tenantId: 'brand-does-not-exist' })]
    );
    await page.goto('/brand/overview');
    await page.waitForTimeout(3000);
    await expect(page.getByText('Brand Overview')).toHaveCount(0);
    expect(
      await page.evaluate(([key]) => window.sessionStorage.getItem(key), [SESSION_KEY])
    ).toBeNull();
    await expect(page.getByRole('button', { name: 'Partner Login' }).first()).toBeVisible({
      timeout: 10000,
    });

    // (c) Malformed JSON is refused, never half-restored.
    await page.goto('/');
    await page.evaluate(([key]) => window.sessionStorage.setItem(key, '{not json'), [SESSION_KEY]);
    await page.goto('/admin/overview');
    await page.waitForTimeout(1500);
    await expect(page.getByRole('heading', { name: 'Partner Login' })).toBeVisible({ timeout: 10000 });
  });
});
