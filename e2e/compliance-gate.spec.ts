/**
 * Phase 7D - Compliance Gate tests.
 *
 * The blocked/partial-cleared states cannot be reached by any portal tenant
 * (Zambezi and DeskForge are fully cleared; other brands are still in the
 * onboarding wizard with no portal nav), so those scenarios stay conditional
 * skips. The enabled-catalog path and the admin approval surface are real and
 * asserted.
 */
import { test, expect } from '@playwright/test';
import { loginAs } from './helpers/auth';

test.describe('Compliance Gate', () => {
  test('1. 0/5 docs -> catalog blocked', async ({ page }) => {
    // Not representable: every portal tenant is fully cleared (see header).
    test.fixme(true, 'No portal tenant with 0 approved docs exists in the demo data set');
  });

  test('2. 4/5 docs -> still blocked', async ({ page }) => {
    test.fixme(true, 'No portal tenant with a partial doc set exists in the demo data set');
  });

  test('3. 5/5 docs -> catalog enabled', async ({ page }) => {
    await loginAs(page, 'DeskForge Supplies Inc', 1100);
    const nav = page.locator('nav[aria-label="Primary"]');
    await nav.getByText('Product Catalog').first().click();
    await page.waitForTimeout(900);
    const addBtn = page.locator('button', { hasText: 'Add New Product' }).first();
    await expect(addBtn).toBeVisible({ timeout: 6000 });
  });

  test('4. Admin Compliance Approvals renders doc rows', async ({ page }) => {
    await loginAs(page, 'Mercenta Admin Hub', 1100);
    await page.click('nav[aria-label="Primary"] >> text=Compliance Approvals');
    await page.waitForTimeout(1000);
    const statusCell = page.locator('text=approved').or(page.locator('text=missing'));
    await expect(statusCell.first()).toBeVisible({ timeout: 6000 });
  });
});