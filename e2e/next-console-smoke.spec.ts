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

  await expect(page.getByRole('navigation', WORKSPACE_NAV)).toBeVisible({ timeout: 20000 });
  await expect(page.getByLabel('Operating model surface')).toBeVisible();
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