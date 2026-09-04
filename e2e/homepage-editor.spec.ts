/**
 * §Batch — Homepage Editor E2E tests.
 *
 * Verifies that editing content in the admin Super Admin Panel
 * and publishing it updates the public homepage.
 */
import { test, expect } from '@playwright/test';

test.describe('Homepage Editor', () => {
  test('edit hero text in admin panel and verify it appears on homepage', async ({
    page,
  }) => {
    // Navigate to the admin Super Admin Panel
    // First go to the login page and select admin login
    await page.goto('/');
    await page.waitForTimeout(500);

    // Navigate to login
    await page.click('text=Get Started');
    await page.waitForTimeout(500);

    // Click the Admin Portal button (demo login)
    await page.click('text=Admin Portal');
    await page.waitForTimeout(500);

    // Navigate to Super Admin Panel via sidebar
    await page.click('text=Super Admin Panel');
    await page.waitForTimeout(1000);

    // Find the Homepage Editor section
    await expect(page.locator('text=Homepage Editor').first()).toBeVisible({
      timeout: 5000,
    });

    // Change the hero text
    const heroInput = page.locator('input').locator('..').filter({ hasText: 'Hero Badge Text' }).locator('input');
    await heroInput.fill('');
    await heroInput.fill('Edited Hero Text - E2E Test');

    // Click Publish
    await page.click('text=Publish');

    // Wait for "Saved" confirmation
    await expect(page.locator('text=Saved')).toBeVisible({ timeout: 10000 });

    // Now navigate back to the public homepage
    await page.goto('/');
    await page.waitForTimeout(1000);

    // Verify the edited text is visible on the homepage
    await expect(
      page.locator('text=Edited Hero Text - E2E Test')
    ).toBeVisible({ timeout: 5000 });
  });
});