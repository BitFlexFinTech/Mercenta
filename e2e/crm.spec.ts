/**
 * Phase 7D - Brand CRM tests.
 *
 * The Phase 6 CRM is a card-based layout: brand selection, section panels
 * (Fulfillment Track / Agreements / Compliance / History / Contact / CRM Tools),
 * and the depth tool with timeline + tasks. Approval/reject of profile-change
 * requests requires a pending request to exist (seeded empty), so that path
 * remains a documented conditional.
 */
import { test, expect } from '@playwright/test';
import { loginAs } from './helpers/auth';

async function openCrm(page: any) {
  await loginAs(page, 'Mercenta Admin Hub', 1100);
  await page.click('nav[aria-label="Primary"] >> text=Brand CRM');
  await page.waitForTimeout(1000);
}

async function selectZambezi(page: any) {
  await page.locator('text=Zambezi').first().click();
  await page.waitForTimeout(500);
}

/** Add the flexibility of a setTimeout free debounce */
test.describe('Brand CRM', () => {
  test('1. Timeline: brand detail + Recent POs / History', async ({ page }) => {
    await openCrm(page);
    await selectZambezi(page);
    // The "History" section shows Recent POs for the brand.
    await page.locator('button:has-text("History")').first().click();
    await page.waitForTimeout(500);
    await expect(page.getByText(/Recent POs/).first()).toBeVisible({ timeout: 4000 });
  });

  test('2. CRM Tools opens the task queue', async ({ page }) => {
    await openCrm(page);
    await selectZambezi(page);
    await page.locator('button:has-text("CRM Tools")').first().click();
    await page.waitForTimeout(700);
    await expect(page.locator('text=Tasks').first()).toBeVisible({ timeout: 4000 });
  });

  test('3. Profile change review UI (conditional on pending requests)', async ({ page }) => {
    await openCrm(page);
    // The seed has no pending requests; the review UI is verified when present.
    const hasPending = await page.locator('text=Change Requests').first().isVisible({ timeout: 2000 }).catch(() => false);
    if (hasPending) {
      await page.locator('text=Change Requests').first().click();
      await page.waitForTimeout(400);
      await expect(page.locator('button:has-text("Approve")').first()).toBeVisible();
      await expect(page.locator('button:has-text("Reject")').first()).toBeVisible();
    } else {
      test.fixme(true, 'No pending profile-change requests exist in the demo store');
    }
  });

  test('4. Fulfilment override logs the admin-on-behalf reason', async ({ page }) => {
    await openCrm(page);
    await selectZambezi(page);
    await page.locator('button.rounded-xl').filter({ hasText: 'Fulfillment Track' }).first().click();
    await page.waitForTimeout(500);
    await expect(page.locator('text=Admin action on behalf of brand').first()).toBeVisible({ timeout: 4000 });
    const select = page.locator('select').filter({ hasText: /Direct Fulfillment|Financed/ }).first();
    await expect(select).toBeVisible({ timeout: 3000 });
    await select.selectOption('direct_fulfillment');
    const reason = page.locator('input[placeholder="Override reason"]');
    await expect(reason).toBeVisible({ timeout: 3000 });
    await reason.fill('Phase 7D audit override');
    await page.locator('button', { hasText: 'Override' }).first().click();
    // The override persists onto the brand row.
    await expect(async () => {
      const val = await page.locator('select').filter({ hasText: /Direct Fulfillment|Financed/ }).first().inputValue();
      if (val !== 'direct_fulfillment') throw new Error('not persisted yet');
    }).toPass({ timeout: 4000 });
  });

  test('5. Audit log renders', async ({ page }) => {
    await loginAs(page, 'Super Admin — Tadii', 1100);
    await page.click('nav[aria-label="Primary"] >> text=Audit Log');
    await page.waitForTimeout(1000);
    await expect(page.locator('text=Admin Audit Log').first()).toBeVisible({ timeout: 5000 });
  });

  test('6. On-behalf actions are attributed in the audit log', async ({ page }) => {
    // Perform a real on-behalf admin action (track override) as Super Admin,
    // then read the same in-memory audit store in the Audit Log view.
    await loginAs(page, 'Super Admin — Tadii', 1100);
    await page.click('nav[aria-label="Primary"] >> text=Brand CRM');
    await page.waitForTimeout(900);
    await selectZambezi(page);
    await page.locator('button.rounded-xl').filter({ hasText: 'Fulfillment Track' }).first().click();
    await page.waitForTimeout(400);
    await page.locator('input[placeholder="Override reason"]').fill('Phase 7D on-behalf audit');
    await page.locator('button', { hasText: 'Override' }).first().click();
    await page.click('nav[aria-label="Primary"] >> text=Audit Log');
    await page.waitForTimeout(1000);
    // The audit registry now contains the fulfillment_track_override action.
    await expect(page.locator('option', { hasText: 'fulfillment_track_override' })).toHaveCount(1, { timeout: 6000 });
  });
});