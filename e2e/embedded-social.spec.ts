/**
 * §Phase E7 — MERCENTA SOCIAL browser verification (real Chromium).
 *
 * Proves through the application (not by reading code):
 *   - an approved brand reaches Mercenta Social and is provisioned automatically;
 *   - the customer-facing identity is Mercenta Social with no separate sign-up;
 *   - the FULL module surface is present and interactive;
 *   - refresh and re-login do NOT create a second workspace;
 *   - a second brand receives a separate workspace and cannot see the first's;
 *   - an unapproved brand cannot reach Mercenta Social at all;
 *   - simulation stays simulation: zero calls to any social provider or the
 *     engine host, and pageErrors === [] throughout;
 *   - the admin control centre reports the verified engine and its findings.
 *
 * The dev server is started by playwright.config.ts (npm run dev, :5173).
 */
import { test, expect, type Page } from '@playwright/test';
import { loginAs } from './helpers/auth';

const SOCIAL_NAV = 'nav[aria-label="Primary"] >> text=Mercenta Social';

/** Social-provider and engine hosts that must never be contacted in simulation. */
const FORBIDDEN_HOST_PATTERNS = [
  'graph.facebook.com',
  'api.instagram.com',
  'api.x.com',
  'api.twitter.com',
  'api.linkedin.com',
  'open.tiktokapis.com',
  'www.googleapis.com',
  'api.pinterest.com',
  'slack.com',
  'discord.com',
  'api.telegram.org',
  '46.101.75.185',
];

function trackPageErrors(page: Page): string[] {
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(String(e.message ?? e)));
  return errors;
}

function trackExternalCalls(page: Page): string[] {
  const hits: string[] = [];
  page.on('request', (req) => {
    const url = req.url();
    if (FORBIDDEN_HOST_PATTERNS.some((h) => url.includes(h))) hits.push(url);
  });
  return hits;
}

/** Log in as a brand and open Mercenta Social through the brand navigation. */
async function openSocial(page: Page, brand: string) {
  await loginAs(page, brand, 1000);
  await page.locator(SOCIAL_NAV).first().click();
  await expect(page.locator('[data-testid="mercenta-social"]').first()).toBeVisible({ timeout: 8000 });
  await page.waitForTimeout(400);
}

async function workspaceId(page: Page): Promise<string> {
  return (await page.locator('[data-testid="ms-workspace-id"]').first().innerText()).trim();
}

test.describe('Mercenta Social — brand access & automatic provisioning', () => {
  test('1. approved brand reaches Mercenta Social and is provisioned automatically', async ({ page }) => {
    const errors = trackPageErrors(page);
    await openSocial(page, 'Astonish');

    await expect(page.locator('text=Mercenta Social').first()).toBeVisible();
    const id = await workspaceId(page);
    expect(id).toMatch(/^msoc-[0-9a-f]{8}$/);
    await expect(page.locator('[data-testid="ms-provision-state"]').first()).toContainText(
      /Provisioned automatically|Reused/
    );
    await expect(page.locator('[data-testid="ms-engine-state"]').first()).toContainText(/Connected|Simulation/);
    // The application frame only appears once a real handoff URL was obtained.
    expect(await page.locator('[data-testid="ms-engine-frame"]').count()).toBe(0);
    expect(errors).toEqual([]);
  });

  test('2. customer-facing identity is Mercenta Social — no engine name, no sign-up', async ({ page }) => {
    const errors = trackPageErrors(page);
    await openSocial(page, 'Astonish');

    const surface = page.locator('[data-testid="mercenta-social"]').first();
    const body = await surface.innerText();
    expect(body).toContain('Mercenta Social');
    expect(body).toContain('included with your Mercenta partnership');
    expect(body).not.toMatch(/Postiz/);
    expect(body).not.toMatch(/\b(Sign up|Subscribe|Upgrade|Checkout)\b/i);
    expect(body).not.toContain('affiliate.postiz.com');
    expect(errors).toEqual([]);
  });

  test('3. the FULL module surface is present and each module drills down', async ({ page }) => {
    const errors = trackPageErrors(page);
    await openSocial(page, 'Astonish');

    const modules = ['calendar', 'agents', 'analytics', 'media', 'plugs', 'third-party', 'settings', 'launches'];
    // The module cards are the interactive <button> elements (the summary and the
    // detail panel are not buttons).
    expect(await page.locator('button[data-testid^="ms-module-"]').count()).toBe(modules.length);
    for (const id of modules) {
      const card = page.locator(`[data-testid="ms-module-${id}"]`).first();
      await expect(card).toBeVisible();
      await card.click();
      const detail = page.locator('[data-testid="ms-module-detail"]').first();
      await expect(detail).toBeVisible();
      expect((await detail.innerText()).trim().length).toBeGreaterThan(40);
      expect(await card.getAttribute('aria-expanded')).toBe('true');
    }
    // Channels are listed as available, never as connected.
    await expect(page.locator('text=No channel is shown as connected')).toBeVisible();
    expect(errors).toEqual([]);
  });

  test('4. a browser reload cannot duplicate the workspace (identity is derived, not stored)', async ({ page }) => {
    const errors = trackPageErrors(page);
    await openSocial(page, 'Astonish');
    const before = await workspaceId(page);

    // A hard reload drops the in-page session (pre-existing SPA behaviour) and
    // returns to the marketing site: no workspace is rendered.
    await page.reload();
    await page.waitForTimeout(1200);
    expect(await page.locator('[data-testid="ms-workspace-id"]').count()).toBe(0);

    // Re-entering resolves the SAME workspace id even though the in-memory store
    // was wiped — because the id is derived deterministically from the tenant.
    await openSocial(page, 'Astonish');
    expect(await workspaceId(page)).toBe(before);
    expect(errors).toEqual([]);
  });

  test('5. logout + re-login does NOT provision a second workspace', async ({ page }) => {
    const errors = trackPageErrors(page);
    await openSocial(page, 'Astonish');
    const before = await workspaceId(page);

    await openSocial(page, 'Tapatío');
    await openSocial(page, 'Astonish');
    expect(await workspaceId(page)).toBe(before);
    expect(errors).toEqual([]);
  });
});

test.describe('Mercenta Social — tenant isolation, entitlement & safety', () => {
  test('6. two brands receive SEPARATE workspaces and cannot see each other', async ({ page }) => {
    const errors = trackPageErrors(page);
    await openSocial(page, 'Astonish');
    const zambezi = await workspaceId(page);

    await openSocial(page, 'Tapatío');
    const deskforge = await workspaceId(page);

    expect(zambezi).not.toBe(deskforge);
    // Brand B's surface must not leak Brand A's workspace identity.
    const deskSurface = await page.locator('[data-testid="mercenta-social"]').first().innerText();
    expect(deskSurface).not.toContain(zambezi);

    await openSocial(page, 'Astonish');
    expect(await workspaceId(page)).toBe(zambezi);
    const zamSurface = await page.locator('[data-testid="mercenta-social"]').first().innerText();
    expect(zamSurface).not.toContain(deskforge);
    expect(errors).toEqual([]);
  });

  test('7. an unapproved brand cannot reach Mercenta Social', async ({ page }) => {
    const errors = trackPageErrors(page);
    // Bulldog Skincare-Care's canonical contract is 'draft' — not an approved
    // partnership — so the brand never receives the portal Social surface.
    await loginAs(page, 'Bulldog Skincare', 1000);
    await page.waitForTimeout(600);

    expect(await page.locator(SOCIAL_NAV).count()).toBe(0);
    expect(await page.locator('[data-testid="mercenta-social"]').count()).toBe(0);
    expect(await page.locator('[data-testid="ms-workspace-id"]').count()).toBe(0);
    expect(errors).toEqual([]);
  });

  test('8. simulation stays simulation — zero external provider/engine calls', async ({ page }) => {
    const errors = trackPageErrors(page);
    const external = trackExternalCalls(page);
    await openSocial(page, 'Astonish');
    await page.locator('[data-testid="ms-module-calendar"]').first().click();
    await page.waitForTimeout(800);

    expect(external).toEqual([]);
    await expect(page.locator('[data-testid="ms-engine-state"]').first()).toContainText(/Connected|Simulation/);
    expect(errors).toEqual([]);
  });

  test('10. opening the workspace either hands off to the real engine or reports the truth', async ({ page }) => {
    const errors = trackPageErrors(page);
    const launchUrl = process.env.SOCIAL_SSO_LAUNCH_URL || '';
    // The brand surface asks the SERVER for a handoff URL (the browser never sees
    // the engine secret). A run with an EXPLICITLY configured engine URL must hand
    // off; a run without one must say so and offer the deterministic studio —
    // never claim a live engine.
    const engineConfigured = Boolean(process.env.VITE_SOCIAL_ENGINE_URL);
    await page.route('**/functions/v1/social-session', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(
          launchUrl
            ? {
                ok: true,
                url: launchUrl,
                email: 'brand-astonish-9c8c82e3@social.mercenta.co.uk',
                organizationId: 'a8ae0104-4447-4a13-afab-be0100f15f64',
                reused: true,
              }
            : { ok: false, error: 'simulation deployment: no handoff URL configured for this run' }
        ),
      });
    });

    await openSocial(page, 'Astonish');
    const launch = page.locator('[data-testid="ms-launch"]').first();
    await expect(launch).toBeVisible();

    if (engineConfigured && launchUrl) {
      // A real handoff URL was returned: the application frame is rendered and the
      // workspace is recorded as linked to the real engine organization.
      await launch.getByRole('button').first().click();
      await page.waitForTimeout(4000);
      await expect(page.locator('[data-testid="ms-engine-frame"]').first()).toBeVisible();
      await expect(page.locator('[data-testid="ms-engine-link"]').first()).toContainText('Linked');
    } else {
      // No engine URL configured for this run: the surface must NOT claim a live
      // engine, the launch control stays disabled with the reason stated, and the
      // deterministic simulation studio is offered instead.
      await expect(page.locator('[data-testid="ms-engine-state"]').first()).toContainText('Simulation');
      await expect(launch.getByRole('button').first()).toBeDisabled();
      await expect(
        page.getByText(/No engine URL is configured in this environment/).first()
      ).toBeVisible();
      await expect(page.locator('[data-testid="ms-simulation-studio"]').first()).toBeVisible();
      await expect(page.locator('[data-testid="ms-engine-link"]').first()).toContainText('Not linked');
    }
    expect(errors).toEqual([]);
  });

  test('11. the simulation studio runs the engine workflow deterministically, with no live call', async ({
    page,
  }) => {
    const errors = trackPageErrors(page);
    const external = trackExternalCalls(page);
    await openSocial(page, 'Astonish');

    const studio = page.locator('[data-testid="ms-simulation-studio"]').first();
    await expect(studio).toBeVisible({ timeout: 8000 });

    // Connect a channel (simulated) — the real provider catalogue, no OAuth.
    await studio.getByRole('button', { name: 'Connect (simulated)' }).click();
    await expect(page.locator('[data-testid="ms-sim-channels"]').first()).toContainText('X');

    // Compose and queue a post.
    await page.locator('[data-testid="ms-sim-body"]').fill('Autumn range launch');
    await studio.getByRole('button', { name: 'Queue post' }).click();
    await expect(page.locator('[data-testid="ms-sim-notice"]').first()).toContainText('queued');

    // Run the queue: QUEUE → PUBLISHED, with an unmistakably simulated release id.
    await studio.getByRole('button', { name: 'Run queue (publish now)' }).click();
    const post = page.locator('[data-testid^="ms-sim-post-"]').first();
    await expect(post).toContainText('Published');
    await expect(post).toContainText('sim-rel-');

    // Analytics agree with the queue (one source, two surfaces).
    await expect(page.locator('[data-testid="ms-sim-analytics"]').first()).toContainText('1 published');

    // Simulation stays simulation: no provider or engine host was contacted.
    expect(external).toEqual([]);
    expect(errors).toEqual([]);
  });

  test('9. admin control centre reports the verified engine, mode and findings', async ({ page }) => {
    const errors = trackPageErrors(page);
    await loginAs(page, 'Super Admin — Tadii', 1000);
    await page.locator('nav[aria-label="Primary"] >> text=Social Media').first().click();
    await page.waitForTimeout(900);

    await expect(page.locator('[data-testid="admin-engine-identity"]').first()).toContainText('v1.47.0');
    await expect(page.locator('[data-testid="admin-engine-mode"]').first()).toContainText(/Simulation|Connected/);
    await expect(page.locator('[data-testid="admin-workspace-count"]').first()).toBeVisible();
    await expect(page.locator('[data-testid="admin-finding-engine-operational"]').first()).toBeVisible();
    await expect(page.locator('[data-testid="admin-finding-branded-hostname-no-dns"]').first()).toBeVisible();
    expect(errors).toEqual([]);
  });
});
