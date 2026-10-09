/**
 * §Wave 3 Part 5 — THE BROWSER STATE GATE.
 *
 * WHY THIS EXISTS
 * ---------------
 * `scripts/validate-state-coverage.mjs` proves the CONTRACT from the first
 * render of every surface. This spec proves it in the way the defect was
 * actually found: in a real Chromium, against the application's own data path,
 * with the data made SLOW — because with instant local data the false state can
 * be resolved before it is painted, so only a slow source exposes it.
 *
 * The app's real repository module (`/src/data/api.ts`) is patched IN FLIGHT by
 * the dev server route — no application code changes — so every query takes
 * `DELAY_MS`. Each view is then loaded with a COLD query cache and the live DOM
 * is recorded:
 *
 *   · any leaf "No …" message shown WHILE LOADING that is GONE once the same
 *     view has loaded is a FALSE DENIAL — the surface told the operator it had
 *     no data when the data had simply not arrived (this is what 13 surfaces
 *     did before Wave 3 Part 5: "No purchase orders for this brand yet.",
 *     "No contracts yet — your distribution agreement is generated when you
 *     complete onboarding.", "Queue value £0", …);
 *   · the surface must meanwhile show a visible loading state.
 *
 * A surface whose data is genuinely empty keeps its "No …" message after
 * loading, so it is not flagged — the comparison is against its OWN loaded
 * state, never a hardcoded list of strings.
 */
import { test, expect, type Page } from '@playwright/test';
import { loginAs } from './helpers/auth';

/** Long enough that a pending render is certainly painted. */
const DELAY_MS = 3500;

async function delayDataSource(page: Page) {
  await page.route('**/src/data/api.ts*', async (route) => {
    const res = await route.fetch();
    const body = await res.text();
    const patched = body.replace(
      /if \(!supabase\) return \{ data: seedFallback\(seed\), source: ['"]seed['"] \};/,
      (m) => `await new Promise((r) => setTimeout(r, ${DELAY_MS}));\n  ${m}`
    );
    // If the seam this gate patches ever changes shape, fail LOUDLY rather than
    // silently testing nothing.
    if (patched === body) throw new Error('state gate: the api.ts delay seam was not found — the gate would test nothing');
    await route.fulfill({
      response: res,
      body: patched,
      headers: { ...res.headers(), 'content-type': 'application/javascript' },
    });
  });
}

/** Every leaf "No …" message currently on screen (the empty-state shape). */
const denialTexts = (page: Page) =>
  page.evaluate(() => {
    const out: string[] = [];
    document.querySelectorAll('main *').forEach((el) => {
      if (el.children.length) return;
      const t = (el.textContent || '').replace(/\s+/g, ' ').trim();
      if (/^No [a-z]/.test(t) && t.length < 130 && !out.includes(t)) out.push(t);
    });
    return out;
  });

/** The loading states a surface is allowed to show. */
const loadingCues = (page: Page) =>
  page.evaluate(() => {
    const main = document.querySelector('main');
    if (!main) return 0;
    return main.querySelectorAll('[data-testid="loading-state"], [aria-busy="true"], .animate-pulse').length;
  });

const BRAND_VIEWS = ['Purchase Orders', 'Contracts', 'Reports', 'UK Compliance', 'Analytics'];
const ADMIN_VIEWS = [
  'Global Catalog', 'Contract Cycle', 'Compliance Approvals',
  'Fulfillment Track', 'Messages', 'Logistics Hub', 'Brand CRM',
];

async function assertNoFalseDenial(page: Page, portal: string, view: string) {
  await page.reload();
  const link = page.locator('nav[aria-label="Primary"]').getByText(view, { exact: true }).first();
  await expect(link, `${portal} · ${view}: the nav entry must exist`).toBeVisible({ timeout: 8000 });
  await link.click();

  // WHILE LOADING — sample repeatedly across the pending window.
  let sawCue = false;
  const during = new Set<string>();
  for (let i = 0; i < 6; i++) {
    await page.waitForTimeout(350);
    if ((await loadingCues(page)) > 0) sawCue = true;
    (await denialTexts(page)).forEach((d) => during.add(d));
  }
  // AFTER LOADING — the same view, with its data.
  await page.waitForTimeout(DELAY_MS + 1200);
  const after = new Set(await denialTexts(page));
  const falseDenials = [...during].filter((d) => !after.has(d));

  expect(falseDenials, `${portal} · ${view}: these "no data" messages were shown while loading and vanished once loaded`).toEqual([]);
  expect(sawCue, `${portal} · ${view}: the surface must show a visible loading state while its data is still arriving`).toBe(true);
}

test.describe('State coverage — no surface denies data while it is still loading', () => {
  test('brand surfaces', async ({ page }) => {
    test.setTimeout(300000);
    await delayDataSource(page);
    await loginAs(page, 'Astonish', 1500);
    for (const view of BRAND_VIEWS) await assertNoFalseDenial(page, 'brand', view);
  });

  test('admin surfaces', async ({ page }) => {
    test.setTimeout(300000);
    await delayDataSource(page);
    await loginAs(page, 'Super Admin — Tadii', 1500);
    for (const view of ADMIN_VIEWS) await assertNoFalseDenial(page, 'admin', view);
  });
});
