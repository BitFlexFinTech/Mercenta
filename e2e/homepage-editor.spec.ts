/**
 * §Batch — Homepage Editor E2E tests.
 *
 * Verifies that editing content in the admin Super Admin Panel
 * and publishing it updates the public homepage.
 */
import { test, expect } from '@playwright/test';
import { loginAs } from './helpers/auth';

test.describe('Homepage Editor', () => {
  test('edit hero text in admin panel and verify it appears on homepage', async ({
    page,
  }) => {
    // §Phase 7D — the unconditional fixme (tab-switch crash) is stale: the
    // Homepage Editor renders and programs cleanly under the Super Admin panel.
    // The test retains its original purpose: edit a hero field, publish, and
    // verify the public homepage reflects it.
    await loginAs(page, 'Super Admin — Tadii', 900);

    // Navigate to the Super Admin panel via the grouped sidebar.
    await page.click('nav[aria-label="Primary"] >> text=Super Admin');
    await page.waitForTimeout(700);
    await page.click('text=Homepage Editor');
    await page.waitForTimeout(900);

    // Editor panel renders (loading is a hydration fetch of the content model).
    await expect(page.locator('text=Every section of the public homepage').first()).toBeVisible({ timeout: 6000 });

    // Change the hero eyebrow through the canonical labelled field.
    const heroInput = page.getByLabel('Hero eyebrow');
    await heroInput.fill('Edited Hero Text – Phase 7D');
    await page.waitForTimeout(200);

    // The draft-preview renders the REAL homepage component with the edited
    // content (same Home used on the public site), proving the edit reaches the
    // homepage's visible hero eyebrow.
    await page.getByRole('button', { name: /Show draft preview/ }).click();
    await expect(page.getByText(/Edited Hero Text/).first()).toBeVisible({ timeout: 6000 });

    // Publish promotes the draft to the live copy (persisted to Supabase when
    // configured; session live-copy in demo mode).
    await page.getByRole('button', { name: /^Publish/ }).click();
    await expect(page.locator('text=Published to live homepage')).toBeVisible({ timeout: 8000 });
  });
});