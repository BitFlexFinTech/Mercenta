/**
 * §UI/UX REDESIGN (remaining surfaces) — ACCESSIBILITY AUDIT (actually run).
 *
 * The redesign's brief requires a REAL accessibility pass, not a claim. This
 * suite runs axe-core against the live application in Chromium and records the
 * full violation list in the run output, so the evidence is the command output
 * rather than a sentence in a report.
 *
 * GATING POLICY — deliberately two-tier, and stated here so it cannot be
 * mistaken for "accessibility considered":
 *
 *  - STRUCTURAL RULES ARE GATED (`GATED_RULES`). These are the defects a
 *    presentation-layer rewrite can genuinely introduce: a missing/duplicated
 *    main landmark, a page with no h1, an unlabelled control, a nameless
 *    button or link, a broken ARIA relationship, a malformed table header.
 *
 *  - COLOUR CONTRAST AND OTHER ADVISORY RULES ARE MEASURED AND REPORTED, NOT
 *    GATED. The platform ships six selectable themes through canonical CSS
 *    variables, and the palette values are a design decision owned by the
 *    Founder — a redesign pass must not silently "fix" them by changing brand
 *    colours. The measured result is printed on every run and recorded in the
 *    session report as a known, quantified gap.
 *
 * Dev server started by playwright.config.ts (npm run dev, :5182).
 */
import { test, expect, type Page } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { loginAs } from './helpers/auth';

const SHOTS = 'test-screenshots/accessibility';

/** Structural defects the redesign must not introduce. */
const GATED_RULES = new Set([
  'landmark-one-main',
  'page-has-heading-one',
  'html-has-lang',
  'document-title',
  'button-name',
  'link-name',
  'image-alt',
  'label',
  'select-name',
  'aria-required-children',
  'aria-required-parent',
  'aria-valid-attr',
  'aria-valid-attr-value',
  'duplicate-id-aria',
  'nested-interactive',
  'td-headers-attr',
  'th-has-data-cells',
  'empty-heading',
]);

/** Run a full axe scan, print every violation, gate the structural ones. */
async function auditSurface(page: Page, label: string) {
  const results = await new AxeBuilder({ page })
    .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'best-practice'])
    .analyze();

  console.log(`\n── AXE · ${label} ─────────────────────────────`);
  if (results.violations.length === 0) {
    console.log('  clean: 0 violations');
  }
  for (const v of results.violations) {
    console.log(`  ${v.impact ?? 'n/a'} · ${v.id} × ${v.nodes.length} — ${v.help}`);
  }
  console.log(`  pass rules: ${results.passes.length} · incomplete: ${results.incomplete.length}`);

  const gated = results.violations.filter((v) => GATED_RULES.has(v.id));
  expect(
    gated.map((v) => `${v.id} × ${v.nodes.length} (${v.nodes[0]?.target?.join(' ') ?? ''})`),
    `${label}: structurally gated axe violations`
  ).toEqual([]);

  return results;
}

/** Landmark + heading sanity that is independent of any axe rule version. */
async function assertSurfaceSkeleton(page: Page, label: string) {
  await expect(page.locator('main')).toHaveCount(1, { timeout: 10000 });
  const h1 = page.locator('h1');
  await expect(h1.first()).toBeVisible();
  expect(await h1.count(), `${label}: exactly one h1`).toBe(1);
  expect(await page.locator('nav[aria-label="Primary"]').count(), `${label}: one primary nav`).toBe(1);
  expect(await page.locator('aside').count(), `${label}: exactly one aside landmark`).toBe(1);
}
test.describe('Accessibility — admin / founder surfaces', () => {
  test('1. Operations Overview is structurally sound and scan-clean', async ({ page }) => {
    await loginAs(page, 'Super Admin — Tadii', 1400);
    await page.getByTestId('dashboard-loaded').waitFor({ timeout: 12000 });
    await assertSurfaceSkeleton(page, 'admin overview');
    await auditSurface(page, 'ADMIN · Operations Overview');
    await page.screenshot({ path: `${SHOTS}/admin-overview-1440.png`, fullPage: false });
  });

  test('2. the removed Mercenta Brain is gone from the Super-Admin nav', async ({ page }) => {
    /* §BATCH 4 (2026-10-10) — REPOINTED, not deleted (rule 08). This scan used to
       audit the Brain surface with axe. The Brain was removed by owner
       instruction, so there is nothing left to scan; the surface's ABSENCE is
       asserted instead and the remaining admin/founder surfaces (tests 3+) keep
       their full axe scans. */
    await loginAs(page, 'Super Admin — Tadii', 1400);
    await expect(
      page.locator('nav[aria-label="Primary"]').getByRole('button', { name: 'Mercenta Brain' })
    ).toHaveCount(0);
  });

  test('3. Integrations control centre is structurally sound and scan-clean', async ({ page }) => {
    await loginAs(page, 'Super Admin — Tadii', 1400);
    await page.locator('nav[aria-label="Primary"]').getByRole('button', { name: 'Integration Settings' }).first().click();
    await page.waitForTimeout(900);
    await assertSurfaceSkeleton(page, 'integrations');
    await auditSurface(page, 'ADMIN · Integration Settings');
    await page.screenshot({ path: `${SHOTS}/integrations-1440.png` });
  });

  test('4. Audit log is structurally sound and scan-clean', async ({ page }) => {
    await loginAs(page, 'Super Admin — Tadii', 1400);
    await page.locator('nav[aria-label="Primary"]').getByRole('button', { name: 'Audit Log' }).first().click();
    await page.waitForTimeout(900);
    await assertSurfaceSkeleton(page, 'audit log');
    await auditSurface(page, 'ADMIN · Audit Log');
    await page.screenshot({ path: `${SHOTS}/audit-1440.png` });
  });

  test('5. Helpdesk is structurally sound and scan-clean', async ({ page }) => {
    await loginAs(page, 'Super Admin — Tadii', 1400);
    await page.locator('nav[aria-label="Primary"]').getByRole('button', { name: 'Helpdesk' }).first().click();
    await page.waitForTimeout(900);
    await assertSurfaceSkeleton(page, 'helpdesk');
    await auditSurface(page, 'ADMIN · Helpdesk');
    await page.screenshot({ path: `${SHOTS}/helpdesk-1440.png` });
  });
});

test.describe('Accessibility — brand workspace', () => {
  test('6. Brand dashboard is structurally sound and scan-clean', async ({ page }) => {
    await loginAs(page, 'Tapatío', 1500);
    await expect(page.getByTestId('brand-dashboard-loaded')).toHaveCount(1, { timeout: 12000 });
    await assertSurfaceSkeleton(page, 'brand dashboard');
    await auditSurface(page, 'BRAND · Dashboard');
    await page.screenshot({ path: `${SHOTS}/brand-dashboard-1440.png` });
  });

  /** The migrated surfaces, each gated on its own scan. */
  for (const [label, navName] of [
    ['BRAND · Purchase Orders', 'Purchase Orders'],
    ['BRAND · Product Catalog', 'Product Catalog'],
    ['BRAND · UK Compliance', 'UK Compliance'],
    ['BRAND · Reports', 'Reports'],
    ['BRAND · Analytics', 'Analytics'],
    ['BRAND · Settings', 'Settings'],
    ['BRAND · Logistics Hub', 'Logistics Hub'],
  ] as const) {
    test(`7. ${label} is structurally sound and scan-clean`, async ({ page }) => {
      await loginAs(page, 'Tapatío', 1500);
      await page.getByTestId('brand-dashboard-loaded').waitFor({ state: 'attached', timeout: 12000 });
      await page.locator('nav[aria-label="Primary"]').getByRole('button', { name: navName }).first().click();
      await page.waitForTimeout(1000);
      await assertSurfaceSkeleton(page, label);
      await auditSurface(page, label);
      await page.screenshot({
        path: `${SHOTS}/${label.replace(/[^a-z0-9]+/gi, '-').toLowerCase()}-1440.png`,
      });
    });
  }
});

test.describe('Accessibility — interaction mechanics', () => {
  test('8. skip link is the first tab stop', async ({ page }) => {
    await loginAs(page, 'Super Admin — Tadii', 1400);
    await page.keyboard.press('Tab');
    const first = await page.evaluate(() => {
      const el = document.activeElement as HTMLElement | null;
      return { tag: el?.tagName, text: el?.textContent?.trim() ?? '' };
    });
    expect(first.tag).toBe('A');
    expect(first.text.toLowerCase()).toContain('skip');
  });

  test('9. the command palette opens on keyboard and Escape closes it', async ({ page }) => {
    await loginAs(page, 'Super Admin — Tadii', 1400);
    await page.keyboard.press('Meta+k');
    await page.waitForTimeout(500);
    await expect(page.locator('[role="dialog"]').first()).toBeVisible({ timeout: 5000 });
    await page.keyboard.press('Escape');
    await page.waitForTimeout(400);
    await expect(page.locator('[role="dialog"]')).toHaveCount(0);
  });

  test('10. reduced motion is honoured (shell transitions collapse to ~0s)', async ({ page }) => {
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await loginAs(page, 'Super Admin — Tadii', 1400);
    const duration = await page.evaluate(() => {
      const el = document.querySelector('[data-workspace-frame]');
      return el ? getComputedStyle(el).transitionDuration : null;
    });
    expect(duration).toBeTruthy();
    expect(Number.parseFloat(duration!)).toBeLessThanOrEqual(0.001);
  });
});