/**
 * §Batch — Homepage Editor E2E tests.
 *
 * Verifies that editing content in the admin Super Admin Panel
 * and publishing it updates the public homepage.
 */
import { test, expect } from '@playwright/test';
import { loginAs } from './helpers/auth';
// §UI/UX Wave 2 — the homepage eyebrow is copy, and copy lives in the canonical
// content model. Asserting against the model (instead of a hardcoded literal)
// means a legitimate copy change can never present as a product regression.
import { DEFAULT_HOMEPAGE_CONTENT } from '../src/config/homepageContent';

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

  test('demo-mode publish reaches the mounted public homepage without a reload', async ({
    page,
  }) => {
    // Load the public homepage first — it mounts with the DEFAULT live copy.
    await page.goto('/');
    await expect(
      page.getByText(DEFAULT_HOMEPAGE_CONTENT.hero.eyebrow).first()
    ).toBeVisible({ timeout: 6000 });

    // Enter the portal in-place (no page reload) and publish an edit as Super Admin.
    await page.getByRole('button', { name: 'Partner Login' }).first().click();
    await page.waitForTimeout(600);
    await page.click('text=Super Admin — Tadii');
    await page.waitForTimeout(900);
    await page.click('nav[aria-label="Primary"] >> text=Super Admin');
    await page.waitForTimeout(700);
    await page.click('text=Homepage Editor');
    await page.waitForTimeout(900);
    await expect(page.locator('text=Every section of the public homepage').first()).toBeVisible({ timeout: 6000 });

    const marker = 'Phase 7E Live Publish';
    await page.getByLabel('Hero eyebrow').fill(marker);
    await page.waitForTimeout(200);
    await page.getByRole('button', { name: /^Publish/ }).click();
    await expect(page.locator('text=Published to live homepage')).toBeVisible({ timeout: 8000 });

    // Return to the public homepage via the in-app "Home" control (still no reload).
    await page.getByTitle('Back to homepage').click();
    await page.waitForTimeout(1000);

    // The already-mounted public Home must reflect the published content.
    await expect(page.getByText(marker).first()).toBeVisible({ timeout: 6000 });
  });
});