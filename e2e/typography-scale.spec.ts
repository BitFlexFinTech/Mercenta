/**
 * §PHASE C4 (2026-10-13) — THE OPERATIONAL TYPE SCALE, VERIFIED BY RENDERING.
 *
 * WHY THIS SPEC EXISTS
 * --------------------
 * `scripts/validate-typography-scale.mjs` proves the scale is *declared* correctly
 * and that no source file bypasses the names. A declaration is not a screen: the
 * Tailwind `fontSize` keys could be mis-built, or a component could override a
 * token with an arbitrary class or an inline style — and every static check would
 * still be green while the product rendered the wrong sizes. This was not
 * hypothetical: the canonical `ds-body` token was 13px while the application's
 * real body text was `text-sm` (14px) in 258 places, and nothing compared them.
 *
 * So this spec drives a real browser and asserts the COMPUTED font size:
 *   · the workspace page title renders at the `ds-page` step (20px);
 *   · table cells render at `ds-body` (14px) and headers at `ds-label` (12px);
 *   · every canonical step that appears on a screen renders at its declared size;
 *   · NO rendered text anywhere in `<main>` falls below the 11px floor.
 *
 * The last check is the one static analysis cannot do: it catches a size that
 * reaches the DOM from a source this repository does not own (an inline style, a
 * third-party class, a `style={{ fontSize }}`).
 */
import { test, expect } from '@playwright/test';
import { loginAs } from './helpers/auth';

/** The declared scale (tailwind.config.js) — read by the validator, asserted here. */
const SCALE = { micro: 11, label: 12, body: 14, title: 16, page: 20 } as const;

/** Every element inside `<main>` whose own text renders below the 11px floor. */
const BELOW_FLOOR = `(() => {
  const out = [];
  for (const el of document.querySelectorAll('main *')) {
    if (!(el instanceof HTMLElement)) continue;
    const cls = (el.className || '').toString();
    if (cls.includes('sr-only')) continue;
    if (el.closest('[aria-hidden="true"]')) continue;
    const style = getComputedStyle(el);
    if (style.display === 'none' || style.visibility === 'hidden') continue;
    const ownText = Array.from(el.childNodes).some(
      (n) => n.nodeType === 3 && (n.textContent || '').trim().length > 0
    );
    if (!ownText) continue;
    const px = parseFloat(style.fontSize);
    if (!Number.isFinite(px) || px >= ${SCALE.micro}) continue;
    out.push({ tag: el.tagName, cls: cls.slice(0, 90), px, text: (el.textContent || '').trim().slice(0, 50) });
  }
  return out;
})()`;

/** Computed font-size of the first element matching a selector (null when absent). */
async function renderedPx(page: import('@playwright/test').Page, selector: string) {
  if ((await page.locator(selector).count()) === 0) return null;
  return page.evaluate((sel) => {
    const el = document.querySelector(sel);
    if (!el) return null;
    return parseFloat(getComputedStyle(el).fontSize);
  }, selector);
}

test.describe('§PHASE C4 — the operational type scale as RENDERED', () => {
  test.describe.configure({ mode: 'serial' });

  test('the workspace page title renders on the ds-page step', async ({ page }) => {
    await loginAs(page, 'Super Admin — Tadii', 1400);
    const px = await renderedPx(page, 'main h1');
    expect(px, 'the workspace page title (main h1) must render at the ds-page step').toBe(SCALE.page);
  });

  test('the canonical DataTable renders cells on ds-body and headers on ds-label', async ({ page }) => {
    await loginAs(page, 'Super Admin — Tadii', 1400);
    await page.locator('nav[aria-label="Primary"] button', { hasText: 'Audit Log' }).first().click();
    await page.waitForTimeout(800);

    /*
     * `data-table="…"` is the canonical DataTable's documented hook, so this
     * asserts the SHARED primitive — not one of the 24 hand-rolled `<table>`
     * elements still in the application (measured 2026-10-13: 8 at text-xs, 6 at
     * ds-micro, 4 at ds-label, 3 at text-sm). Migrating those is the
     * application-wide pass (Phase D), recorded as its own registry row.
     */
    const table = page.locator('main table[data-table="admin-audit-log"]').first();
    expect(await table.count(), 'the canonical DataTable must render on the Audit Log screen').toBeGreaterThan(0);

    expect(await renderedPx(page, 'main table[data-table]'), 'the table renders on the ds-body step').toBe(
      SCALE.body
    );
    expect(await renderedPx(page, 'main table[data-table] th'), 'the table header renders on ds-label').toBe(
      SCALE.label
    );
    expect(await renderedPx(page, 'main table[data-table] td'), 'a table cell renders on ds-body').toBe(SCALE.body);
  });

  test('every canonical step that a screen uses renders at its declared size', async ({ page }) => {
    await loginAs(page, 'Super Admin — Tadii', 1400);
    await page.locator('nav[aria-label="Primary"] button', { hasText: 'Audit Log' }).first().click();
    await page.waitForTimeout(800);

    const steps = ['micro', 'label', 'body', 'title', 'page'] as const;
    let seen = 0;
    for (const step of steps) {
      const px = await renderedPx(page, `main .text-ds-${step}`);
      if (px === null) continue;
      seen += 1;
      expect(px, `text-ds-${step} must render at its declared size`).toBe(SCALE[step]);
    }
    expect(seen, 'at least three canonical steps must actually appear on this screen').toBeGreaterThanOrEqual(3);
  });

  test('NO rendered text in main falls below the 11px floor (admin screens)', async ({ page }) => {
    await loginAs(page, 'Super Admin — Tadii', 1400);
    for (const screen of ADMIN_SCREENS) {
      if (screen !== 'Overview') {
        await page.locator('nav[aria-label="Primary"] button', { hasText: screen }).first().click();
        await page.waitForTimeout(800);
      }
      const offenders = await page.evaluate(BELOW_FLOOR);
      expect(offenders, `text below the ${SCALE.micro}px floor on the admin '${screen}' screen`).toEqual([]);
    }
  });

  test('NO rendered text in main falls below the 11px floor (brand screens)', async ({ page }) => {
    await loginAs(page, 'Astonish', 1400);
    await page.locator('nav[aria-label="Primary"] button', { hasText: 'Purchase Orders' }).first().click();
    await page.waitForTimeout(800);
    const offenders = await page.evaluate(BELOW_FLOOR);
    expect(offenders, `text below the ${SCALE.micro}px floor on the brand Purchase Orders screen`).toEqual([]);
  });
});

const ADMIN_SCREENS = ['Overview', 'Purchase Orders', 'Audit Log'] as const;
