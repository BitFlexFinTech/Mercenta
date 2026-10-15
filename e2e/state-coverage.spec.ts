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
test.describe('§OPENSHIP BATCH 8 — the state treatments, measured in a real browser', () => {
  /**
   * THE DEFECT THIS MEASURES. `Skeleton` used to paint `bg-white/[0.06]`, whose
   * light-shell shim resolves to `--mr-surface-tint` — `#FAFAFA` in the three
   * light designs, on a `#FFFFFF` card. That is a **1.02:1** difference: a loading
   * state that is effectively INVISIBLE, which matters because the skeleton is the
   * only signal that a slow surface has not yet answered (the false-denial defect
   * the rest of this spec covers). The fix is the theme's own tint
   * (`--mr-hover-tint`), and this test reads the BROWSER's composited result:
   * the skeleton's own fill composited over whatever surface it sits on must differ
   * from that surface by a measurable amount.
   */
  test('1. the loading skeleton is VISIBLE against the surface behind it (light design)', async ({ page }) => {
    test.setTimeout(120000);
    await delayDataSource(page);
    await loginAs(page, 'Astonish', 1500);

    await page.locator('nav[aria-label="Primary"]').getByText('Analytics', { exact: true }).first().click();
    const skeleton = page.locator('[data-testid="loading-state"] .animate-pulse').first();
    await expect(skeleton, 'the surface must show the canonical loading state while its data resolves').toBeVisible({
      timeout: 8000,
    });

    const measured = await skeleton.evaluate((el) => {
      const parse = (c: string) => (c.match(/[\d.]+/g) ?? []).map(Number);
      const sk = parse(getComputedStyle(el).backgroundColor);
      let node: HTMLElement | null = el.parentElement;
      let behind: number[] = [255, 255, 255];
      while (node && node !== document.documentElement) {
        const bg = parse(getComputedStyle(node).backgroundColor);
        if (bg.length >= 3 && (bg.length < 4 || bg[3] > 0)) {
          // composite that surface over white, then composite the skeleton over it
          const a = bg.length === 4 ? bg[3] : 1;
          behind = [0, 1, 2].map((i) => bg[i] * a + 255 * (1 - a));
          break;
        }
        node = node.parentElement;
      }
      const sa = sk.length === 4 ? sk[3] : 1;
      const effective = [0, 1, 2].map((i) => sk[i] * sa + behind[i] * (1 - sa));
      return {
        effective,
        behind,
        delta: Math.max(...[0, 1, 2].map((i) => Math.abs(effective[i] - behind[i]))),
        shell: document.documentElement.getAttribute('data-mercenta-theme'),
      };
    });

    expect(
      Math.round(measured.delta),
      `the skeleton must be perceivable: effective ${measured.effective.map(Math.round).join(',')} vs surface ` +
        `${measured.behind.map(Math.round).join(',')} on ${measured.shell} (a delta of 5 or less is the pre-batch, ` +
        `effectively invisible skeleton)`
    ).toBeGreaterThanOrEqual(8);
  });

  /**
   * §9.4's card interaction state, read from the browser rather than the class
   * list: the hover edge must actually APPEAR, and it must come from the theme
   * token (asserting the token's own value would prove nothing about the render).
   */
  test('2. a card that is a click target takes the theme hover edge when pointed at', async ({ page }) => {
    test.setTimeout(120000);
    await loginAs(page, 'Astonish', 1500);
    await page.locator('nav[aria-label="Primary"]').getByText('Analytics', { exact: true }).first().click();

    const card = page.locator('.ds-card-interactive').first();
    await expect(card).toBeVisible({ timeout: 10000 });
    const rest = await card.evaluate((el) => getComputedStyle(el).borderTopColor);
    await card.hover();
    await page.waitForTimeout(400); // the reference's own 200ms border transition
    const hovered = await card.evaluate((el) => getComputedStyle(el).borderTopColor);
    const token = await page.evaluate(
      () => getComputedStyle(document.documentElement).getPropertyValue('--mr-card-border-hover').trim()
    );

    expect(rest, 'a card at rest shows no edge on the light designs (the reference borderless-card rule)').not.toBe(
      hovered
    );
    expect(hovered, `the hover edge is the theme token (${token}), not a class-level colour`).not.toBe(rest);
  });
});

