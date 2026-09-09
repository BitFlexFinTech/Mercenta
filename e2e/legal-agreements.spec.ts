/**
 * Phase 7D - legal agreements (brand onboarding step 5).
 *
 * The wizard steps are a real user flow. Step 5 renders two native checkboxes
 * (id=agreement-logistics / agreement-chargeback) whose visible, action-able
 * controls are their <label>s. The previous contract used a generic
 * `input[type=checkbox].check()` listing that Playwright could not action
 * against the wizard's custom styled checkboxes on earlier steps.
 */
import { test, expect } from '@playwright/test';
import { loginAs } from './helpers/auth';
import { wizardToStep } from './helpers/onboarding';

test.describe('Legal Agreements', () => {
  test('1. Brand sees agreement sections and Continue disabled until both accepted', async ({ page }) => {
    await loginAs(page, 'Little Kiwi Baby Co', 1400);
    // Walk the wizard to step 5 (fills only the gated inputs).
    await wizardToStep(page, 5);

    const logistics = page.locator('h2, h3').filter({ hasText: /Logistics SLAs/i }).first();
    const chargeback = page.locator('h2, h3').filter({ hasText: /Chargeback Remediation/i }).first();
    await expect(logistics).toBeVisible({ timeout: 6000 });
    await expect(chargeback).toBeVisible({ timeout: 3000 });

    const continueBtn = page.locator('button', { hasText: 'Continue' }).first();
    await expect(continueBtn).toBeDisabled({ timeout: 1500 });

    // Accept only 4.1: Continue stays disabled.
    const logisticsLabel = page.locator('label[for="agreement-logistics"]');
    await logisticsLabel.scrollIntoViewIfNeeded();
    await logisticsLabel.click();
    await expect(continueBtn).toBeDisabled({ timeout: 1500 });

    // Accept 4.2 too: Continue becomes enabled.
    const chargebackLabel = page.locator('label[for="agreement-chargeback"]');
    await chargebackLabel.scrollIntoViewIfNeeded();
    await chargebackLabel.click();
    await expect(continueBtn).toBeEnabled({ timeout: 1500 });
  });

  test('2. Admin CRM shows agreement section tab', async ({ page }) => {
    await loginAs(page, 'Mercenta Admin Hub', 1100);
    await page.click('nav[aria-label="Primary"] >> text=Brand CRM');
    await page.waitForTimeout(900);
    await page.locator('text=Zambezi').first().click();
    await page.waitForTimeout(500);
    const agreementsTab = page.locator('button:has-text("Agreements")').first();
    await expect(agreementsTab).toBeVisible({ timeout: 5000 });
    await agreementsTab.click();
    await page.waitForTimeout(600);
    // Zambezi's seed agreements are accepted; the tab renders both sections.
    await expect(page.locator('text=Logistics SLAs').first()).toBeVisible({ timeout: 4000 });
    await expect(page.locator('text=Chargeback Indemnity').first()).toBeVisible({ timeout: 3000 });
  });

  test('3. Admin Compliance page renders', async ({ page }) => {
    await loginAs(page, 'Mercenta Admin Hub', 1100);
    await page.click('nav[aria-label="Primary"] >> text=Compliance Approvals');
    await page.waitForTimeout(1100);
    const statusCell = page.locator('text=approved').or(page.locator('text=missing'));
    await expect(statusCell.first()).toBeVisible({ timeout: 6000 });
  });
});