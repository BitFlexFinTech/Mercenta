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
    'Billing',
    'Brand CRM',
    'Contract Cycle',
    'Global Catalog',
    'Fulfillment Track',
    'Marketing',
    'Helpdesk',
    'Messages',
    'Monitoring',
    'Ads Manager',
  ]) {
    await navButton(label).click();
    await expect(
      page.getByText(/is not available yet/i),
      `${label} must render a real admin screen`
    ).toHaveCount(0);
  }

  /* A staff session must NOT be offered the super-admin audit trail. */
  await expect(
    navButton('Audit Log'),
    'admin_staff must never be offered the super-admin audit trail'
  ).toHaveCount(0);

  /* Land on the new portfolio overview and assert real content, so the gate
     cannot pass by rendering nothing. */
  await navButton('Overview').click();
  await expect(page.getByText('Portfolio PO value')).toBeVisible({ timeout: 20000 });

  /* Then Monitoring, whose whole point is that it does NOT fabricate health. */
  await navButton('Monitoring').click();
  await expect(page.getByText(/Client readiness/).first()).toBeVisible({ timeout: 20000 });

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

test('super-admin session: an approval is audited, and the audit trail shows it', async ({
  page,
}) => {
  const pageErrors = watchPageErrors(page);
  await loginAs(page, 'Super Admin — Tadii');
  await page.goto('/?console=next');

  const nav = page.getByRole('navigation', WORKSPACE_NAV);
  await expect(nav).toBeVisible({ timeout: 20000 });
  const navButton = (label: string) => nav.getByRole('button', { name: label, exact: true });

  /* `audit_log` is a SUPER-ADMIN view. This is the whole end-to-end proof: take a
     real DOMAIN ACTION (approve a brand document), then show the audit trail
     recorded it — no fixture, no stub. */
  await navButton('Compliance Approvals').click();
  await page.getByText('Awaiting review').click();
  await page.locator('tbody tr').first().click();

  /* A manual verification REFUSES a decision with no recorded reason, so the gate
     proves the reason is genuinely required by typing one and asserting the notice. */
  await page
    .getByLabel(/reason for the decision/i)
    .fill('Verified against the issuing body public register.');
  await page.getByRole('button', { name: 'Approve document' }).click();
  await expect(
    page.getByText('Document approved — verification recorded against the brand')
  ).toBeVisible({ timeout: 20000 });

  await navButton('Audit Log').click();
  await expect(page.getByText('Distinct actors')).toBeVisible({ timeout: 20000 });
  await expect(
    page.getByText('No audit entries match these filters'),
    'the approval must appear in the audit trail'
  ).toHaveCount(0);
  await expect(page.locator('tbody tr').first()).toBeVisible();

  await page.screenshot({ path: 'test-results/next-console-superadmin.png', fullPage: true });
  expect(pageErrors).toEqual([]);
});

test('the BWS and Talent Commerce surfaces render their own portfolio, honestly', async ({
  page,
}) => {
  const pageErrors = watchPageErrors(page);
  await loginAs(page, 'Super Admin — Tadii');
  await page.goto('/?console=next');

  const nav = page.getByRole('navigation', WORKSPACE_NAV);
  await expect(nav).toBeVisible({ timeout: 20000 });
  /* The surface switcher is a TABLIST of buttons, not a select. */
  const surfaceTab = (name: string) => page.getByRole('tab', { name, exact: true });

  /* BWS: the portfolio is scoped to the BWS vertical, and NOTHING is onboarded in it
     — so the screen must say that rather than show core brands under a BWS heading. */
  await surfaceTab('BWS Workspace').click();
  /* The BWS surface's declared default view is the Campaign Studio, so the test walks
     to the portfolio the way a user would. */
  await nav.getByRole('button', { name: 'Overview', exact: true }).click();
  await expect(page.getByText('Beers, Wines & Spirits portfolio')).toBeVisible({ timeout: 20000 });
  await expect(page.getByText('Nothing is onboarded in Beers, Wines & Spirits yet')).toBeVisible();

  /* Talent Commerce: the same contract, with its own wording. */
  await surfaceTab('Talent Commerce').click();
  await nav.getByRole('button', { name: 'Brands & Products', exact: true }).click();
  await expect(page.getByText('Talent Commerce portfolio')).toBeVisible({ timeout: 20000 });

  await page.screenshot({ path: 'test-results/next-console-vertical.png', fullPage: true });
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