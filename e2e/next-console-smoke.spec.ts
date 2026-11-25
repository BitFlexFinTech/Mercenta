/**
 * §NEW CONSOLE SMOKE (2026-11-25) — the gate for the ported AI Studio console.
 *
 * Proves three things in a real Chromium browser:
 *   1. a BRAND session reaches `src/next/` and the shell + brand navigation render;
 *   2. an ADMIN session reaches the same shell on its admin surface;
 *   3. the DEFAULT console is still the existing application — the new console is
 *      reachable only through the explicit switch, so the port cannot silently
 *      replace working screens with Phase 4–6 placeholders.
 *
 * Compiling is not rendering: a Rules-of-Hooks violation or a bad context read
 * passes typecheck and build and only fails at mount, which is what this catches.
 */
import { test, expect, type Page } from '@playwright/test';
import { loginAs } from './helpers/auth';

function watchPageErrors(page: Page): string[] {
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(String(error)));
  return errors;
}

const WORKSPACE_NAV = { name: 'Workspace navigation' } as const;

test('brand session: the new console renders its shell and navigation', async ({ page }) => {
  const pageErrors = watchPageErrors(page);
  await loginAs(page, 'Le Creuset');
  await page.goto('/?console=next');

  await expect(page.getByRole('navigation', WORKSPACE_NAV)).toBeVisible({ timeout: 20000 });
  await expect(page.getByLabel('Operating model surface')).toBeVisible();
  await expect(page.getByRole('heading', { name: /purchase order/i }).first()).toBeVisible({
    timeout: 20000,
  });
  expect(pageErrors).toEqual([]);
});

test('admin session: the new console renders its admin surface', async ({ page }) => {
  const pageErrors = watchPageErrors(page);
  await loginAs(page, 'Mercenta Admin Hub');
  await page.goto('/?console=next');

  const nav = page.getByRole('navigation', WORKSPACE_NAV);
  await expect(nav).toBeVisible({ timeout: 20000 });
  await expect(page.getByLabel('Operating model surface')).toBeVisible();

  /* §WAVE 3 — select by ROLE. The sidebar's group heading is also the text
     "Overview" (uppercased by CSS), so a text selector clicks the heading and the
     view never changes — which is exactly what this gate caught. */
  const navButton = (label: string) => nav.getByRole('button', { name: label, exact: true });

  /* The admin views that are now real. The rest keep the honest "not available
     yet" state, which this list deliberately does not include. */
  for (const label of [
    'Overview',
    'Purchase Orders',
    'Logistics Hub',
    'Returns Tracking',
    'Work Management',
    'Compliance Approvals',
    'Ads Manager',
  ]) {
    await navButton(label).click();
    await expect(
      page.getByText(/is not available yet/i),
      `${label} must render a real admin screen`
    ).toHaveCount(0);
  }

  /* Land on the new portfolio overview and assert real content, so the gate
     cannot pass by rendering nothing. */
  await navButton('Overview').click();
  await expect(page.getByText('Portfolio PO value')).toBeVisible({ timeout: 20000 });

  /* Then the compliance screen, whose whole point is a decision, so the captured
     artefact shows the action and not just a list. */
  await navButton('Compliance Approvals').click();
  await expect(page.getByText('Awaiting review')).toBeVisible({ timeout: 20000 });

  await page.screenshot({ path: 'test-results/next-console-admin.png', fullPage: true });
  expect(pageErrors).toEqual([]);
});

test('every mounted brand view renders and none falls back to the Phase 4-6 placeholder', async ({
  page,
}) => {
  const pageErrors = watchPageErrors(page);
  await loginAs(page, 'Le Creuset');
  await page.goto('/?console=next');

  const nav = page.getByRole('navigation', { name: 'Workspace navigation' });
  await expect(nav).toBeVisible({ timeout: 20000 });

  /* The sixteen brand views the shell now mounts. `calendar`, `market`, `cases`,
     `team` and `settings` are deliberately absent: those screens were never built
     in the AI Studio pass, so they keep the honest placeholder. */
  const mountedViews = [
    'Dashboard',
    'Purchase Orders',
    'Logistics Hub',
    'Returns',
    'Tasks & Deadlines',
    'Product Catalog',
    'Inventory',
    'Commercial Readiness',
    'Lift Off',
    'Onboarding & Legal',
    'UK Compliance',
    'Contracts',
    'Analytics',
    'Advertising',
    'Reports',
    'Documents & Account',
  ];

  for (const label of mountedViews) {
    await nav.getByText(label, { exact: true }).first().click();
    await expect(
      page.getByText(/is not available yet/i),
      `${label} must render a real screen, not the placeholder`
    ).toHaveCount(0);
  }

  await page.screenshot({ path: 'test-results/next-console-brand.png', fullPage: true });
  expect(pageErrors).toEqual([]);
});

test('default: the existing application still renders, not the new console', async ({ page }) => {
  const pageErrors = watchPageErrors(page);
  await page.goto('/');

  await expect(page.getByRole('button', { name: 'Open new console' })).toBeVisible({
    timeout: 20000,
  });
  await expect(page.getByRole('navigation', WORKSPACE_NAV)).toHaveCount(0);
  expect(pageErrors).toEqual([]);
});