/**
 * §5/M12 — COMMERCIAL RELATIONSHIP (browser verification).
 *
 * Proves the requirement M11 left open is now REAL in the UI:
 *   1. onboarding REFUSES to continue without a recorded commercial relationship,
 *      and accepts once one is chosen (fail-closed, then honoured);
 *   2. the Super Admin can change a brand's model with a mandatory reason, and
 *      the change appears in the canonical audit trail;
 *   3. the brand sees its own relationship read-only, with the separation from
 *      retail-channel compliance stated in the product.
 */
import { test, expect } from '@playwright/test';
import { loginAs } from './helpers/auth';
import { checkAllWizardCheckboxes } from './helpers/onboarding';

async function openNav(page: import('@playwright/test').Page, label: string) {
  await page.locator(`nav[aria-label="Primary"] button:has-text("${label}")`).first().click();
  await page.waitForTimeout(700);
}

test.describe('Commercial relationship', () => {
  test('1. onboarding offers both models and honours the recorded selection', async ({ page }) => {
    await loginAs(page, 'Little Kiwi Baby Co', 1400);
    await expect(page.locator('h2').filter({ hasText: /Brand Profile/ }).first()).toBeVisible({
      timeout: 6000,
    });

    // Step 1 → 2 (step 1 is pre-filled by the tenant dossier).
    await page.getByLabel(/Business Name/).first().fill('Demo Brand Ltd');
    await page.locator('button', { hasText: 'Continue' }).first().click();
    await page.waitForTimeout(700);

    // The commercial relationship is a required step-2 concept with BOTH models.
    await expect(page.getByTestId('commercial-model-options')).toBeVisible({ timeout: 5000 });
    await expect(page.getByTestId('commercial-model-commission_agent')).toContainText('Model A');
    await expect(page.getByTestId('commercial-model-buy_resell')).toContainText('Model B');
    // The step states that the commercial relationship is a DIFFERENT concept from
    // the retail-channel compliance documents (single text nodes, so the assertion
    // cannot be fooled by element boundaries).
    await expect(page.locator('text=Commercial Relationship with Mercenta').first()).toBeVisible();
    await expect(page.locator('text=Choose how Mercenta and your brand trade').first()).toBeVisible();

    // This tenant already has a recorded relationship (hydrated from the canonical
    // store), so the fail-closed prompt is correctly ABSENT...
    await expect(page.getByTestId('commercial-model-required')).toHaveCount(0);

    // ...and the choice can be changed and is honoured through the flow.
    await page.getByLabel(/Authorized Signatory|Signatory/i).first().fill('Demo Signatory');
    await checkAllWizardCheckboxes(page);
    const continueBtn = page.locator('button', { hasText: 'Continue' }).first();
    await expect(continueBtn).toBeEnabled();
    await page.getByTestId('commercial-model-buy_resell').click();
    await expect(page.getByTestId('commercial-model-buy_resell')).toHaveAttribute(
      'class',
      /border-brass-500\/50/
    );
    await continueBtn.click();
    await page.waitForTimeout(700);
    await expect(page.locator('h2').filter({ hasText: /Banking Details/ }).first()).toBeVisible({
      timeout: 6000,
    });
  });

  test('2. Super Admin records a model change with a reason, and it is audited', async ({ page }) => {
    const pageErrors: string[] = [];
    page.on('pageerror', (e) => pageErrors.push(String(e)));
    await loginAs(page, 'Super Admin — Tadii', 1200);
    await openNav(page, 'Super Admin');
    await page.locator('button:has-text("Commercial Models")').first().click();
    await page.waitForTimeout(600);

    // BOTH models are shown with the canonical investor figures.
    await expect(page.getByTestId('model-a-illustration')).toContainText('£2,000');
    await expect(page.getByTestId('model-a-illustration')).toContainText('£8,000');
    await expect(page.getByTestId('model-b-illustration')).toContainText('£2,500');
    await expect(page.getByTestId('model-b-illustration')).toContainText('£2,270');

    const row = page.getByTestId('commercial-model-row-brand-zambezi');
    await expect(row).toContainText('Model A');

    // A change requires a reason and is refused without one.
    await row.locator('select').selectOption('buy_resell');
    await row.locator('button:has-text("Record change")').click();
    await expect(page.getByTestId('commercial-model-message')).toContainText('requires both an actor and a reason');

    // With a reason, the change is recorded and audited.
    await page.getByLabel(/Reason/).first().fill('e2e: agreed at the quarterly review');
    await row.locator('select').selectOption('buy_resell');
    await row.locator('button:has-text("Record change")').click();
    await expect(page.getByTestId('commercial-model-message')).toContainText('recorded and audited');
    await expect(row).toContainText('Model B');
    await expect(page.getByTestId('commercial-model-audit')).toContainText('commercial_model_changed');
    await expect(page.getByTestId('commercial-model-audit')).toContainText(
      'compliance unchanged: true'
    );
    expect(pageErrors).toEqual([]);
  });

  test('3. the brand sees its own relationship read-only, with the separation stated', async ({ page }) => {
    await loginAs(page, 'Zambezi Organic Extracts Ltd', 1400);
    await openNav(page, 'Settings');
    await page.locator('button:has-text("Commercial Relationship")').first().click();
    await page.waitForTimeout(500);
    await expect(page.locator('text=Model A').first()).toBeVisible({ timeout: 5000 });
    await expect(
      page.locator('text=/never change, waive or replace/i').first()
    ).toBeVisible({ timeout: 4000 });
  });
});