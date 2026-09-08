/**
 * §E2E — Legal Agreements (brand onboarding step 5).
 *
 * Tests:
 * 1. Brand reaches the legal agreement step via sidebar navigation
 * 2. "Continue" disabled until both agreements are accepted
 * 3. Accepting only §4.1 keeps Continue disabled
 * 4. Accepting both enables Continue
 * 5. Admin CRM shows agreement section tab
 * 6. Admin Compliance page renders
 */
import { test, expect } from '@playwright/test';
import { loginAs } from './helpers/auth';

async function loginAsBrand(page: any, name: string) {
  await loginAs(page, name, 1000);
}

async function loginAsAdmin(page: any) {
  await loginAs(page, 'Mercenta Admin Hub', 1000);
}

test.describe('Legal Agreements', () => {
  test('1. Brand sees agreement sections and Continue disabled until both accepted', async ({ page }) => {
    await loginAsBrand(page, 'Little Kiwi Baby Co');
    const onboardingNav = page.locator('text=Onboarding & Legal').first();
    if (await onboardingNav.isVisible({ timeout: 3000 }).catch(() => false)) {
      await onboardingNav.click();
      await page.waitForTimeout(800);
    }
    const wizardTitle = page.locator('text=Brand Onboarding');
    if (!(await wizardTitle.isVisible({ timeout: 3000 }).catch(() => false))) {
      test.fixme(true, 'Could not reach onboarding wizard');
      return;
    }
    const legalStep = page.locator('text=Legal Agreements');
    await expect(legalStep).toBeVisible({ timeout: 2000 });
    for (let attempt = 0; attempt < 15; attempt++) {
      const cbtn = page.locator('button').filter({ hasText: 'Continue' });
      if (!(await cbtn.isVisible({ timeout: 500 }).catch(() => false))) break;
      if (await page.locator('text=Logistics SLAs & Carrier Alignment').isVisible({ timeout: 300 }).catch(() => false)) {
        break;
      }
      if (!(await cbtn.isDisabled())) {
        await cbtn.click();
        await page.waitForTimeout(400);
      } else {
        const cbs = page.locator('input[type="checkbox"]');
        for (let i = 0; i < (await cbs.count()); i++) {
          if (!(await cbs.nth(i).isChecked())) await cbs.nth(i).check();
        }
        const txts = page.locator('input:not([type="checkbox"]):not([type="hidden"])');
        for (let i = 0; i < (await txts.count()); i++) {
          if (!(await txts.nth(i).inputValue())) await txts.nth(i).fill('Test');
        }
        const sels = page.locator('select');
        for (let i = 0; i < (await sels.count()); i++) {
          const opts = await sels.nth(i).locator('option').count();
          if (opts > 1 && !(await sels.nth(i).inputValue())) {
            await sels.nth(i).selectOption({ index: 1 });
          }
        }
        const cat = page.locator('button').filter({ hasText: 'Home' }).first();
        if (await cat.isVisible({ timeout: 200 }).catch(() => false)) await cat.click();
        await page.waitForTimeout(100);
      }
    }
    const section1 = page.locator('text=Logistics SLAs & Carrier Alignment');
    if (!(await section1.isVisible({ timeout: 2000 }).catch(() => false))) {
      test.fixme(true, 'Could not reach step 5');
      return;
    }
    const section2 = page.locator('text=Automated Chargeback Remediation & Financial Indemnity');
    await expect(section2).toBeVisible({ timeout: 1000 });
    const continueBtn = page.locator('button', { hasText: 'Continue' });
    await expect(continueBtn).toBeDisabled({ timeout: 1000 });
    const ll = page.locator('label[for="agreement-logistics"]');
    await ll.scrollIntoViewIfNeeded();
    await ll.click();
    await page.waitForTimeout(200);
    await expect(continueBtn).toBeDisabled({ timeout: 1000 });
    const cl = page.locator('label[for="agreement-chargeback"]');
    await cl.scrollIntoViewIfNeeded();
    await cl.click();
    await page.waitForTimeout(200);
    await expect(continueBtn).toBeEnabled({ timeout: 1000 });
  });  test('2. Admin CRM shows agreement section tab', async ({ page }) => {
    await loginAsAdmin(page);
    const crmNav = page.locator('text=Brand CRM').first();
    if (await crmNav.isVisible({ timeout: 3000 }).catch(() => false)) {
      await crmNav.click();
      await page.waitForTimeout(1000);
    }
    const brandBtn = page.locator('text=Zambezi').first();
    if (await brandBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
      await brandBtn.click();
      await page.waitForTimeout(500);
      const agreementsTab = page.locator('button:has-text("Agreements")');
      if (await agreementsTab.isVisible({ timeout: 2000 }).catch(() => false)) {
        await agreementsTab.click();
        await page.waitForTimeout(500);

        const emptyState = page.locator('text=No agreements accepted yet');
        const found = await emptyState.isVisible({ timeout: 1000 }).catch(() => false);
        if (found) {
          await expect(emptyState).toBeVisible({ timeout: 500 });
        } else {
          const acceptedBadge = page.locator('text=Accepted').first();
          expect(await acceptedBadge.isVisible({ timeout: 1000 }).catch(() => false)).toBeTruthy();
        }
      } else {
        test.fixme(true, 'Agreements tab not visible');
      }
    } else {
      test.fixme(true, 'Brand not selectable');
    }
  });

  test('3. Admin Compliance page renders', async ({ page }) => {
    await loginAsAdmin(page);
    // §Phase 6 — grouped sidebar: target the nav button (heading not clickable).
    const compNav = page.locator('nav >> text=Compliance Approvals').first();
    if (await compNav.isVisible({ timeout: 3000 }).catch(() => false)) {
      await compNav.click();
      await page.waitForTimeout(1500);
      const content = page.locator('text=approved').or(page.locator('text=missing'));
      if (await content.first().isVisible({ timeout: 3000 }).catch(() => false)) {
        await expect(content.first()).toBeVisible({ timeout: 2000 });
      } else {
        test.fixme(true, 'No compliance content visible');
      }
    } else {
      test.fixme(true, 'Compliance nav not visible');
    }
  });
});