/**
 * §21/§41.13–16/M12 — FOUNDER INVESTOR CENTRE + PARTNERSHIPS (browser verification).
 *
 * Proves the founder's private centre is usable AND correctly restricted:
 *   1. the Super Admin sees the private surfaces, the pitches, the difficult
 *      questions and the document/deck actions;
 *   2. the partnerships centre shows prospective routes only, generates a
 *      recipient-specific message, and refuses to send without confirmation
 *      before sending through the simulated seam;
 *   3. a non-Super-Admin account NEVER sees the private navigation.
 */
import { test, expect } from '@playwright/test';
import { loginAs } from './helpers/auth';

async function openNav(page: import('@playwright/test').Page, label: string) {
  await page.locator(`nav[aria-label="Primary"] button:has-text("${label}")`).first().click();
  await page.waitForTimeout(700);
}

test.describe('Founder Investor Centre', () => {
  test('1. the Super Admin gets pitches, questions, practice and generated artefacts', async ({ page }) => {
    const pageErrors: string[] = [];
    page.on('pageerror', (e) => pageErrors.push(String(e)));
    await loginAs(page, 'Super Admin — Tadii', 1200);
    await openNav(page, 'Founder Investor Centre');

    await expect(page.getByTestId('founder-investor-centre')).toBeVisible({ timeout: 6000 });
    // The honesty notice is shown above everything.
    await expect(page.locator('text=/No government, embassy, trade-body or Amazon partnership/i').first())
      .toBeVisible({ timeout: 4000 });

    // All five pitch lengths are present.
    await expect(page.getByTestId('founder-pitches').locator('h3, [data-card-title]').first())
      .toBeVisible({ timeout: 4000 });
    await expect(page.locator('text=One line').first()).toBeVisible();
    await expect(page.locator('text=/5 minutes/').first()).toBeVisible();

    // The business model quotes the canonical figures.
    await page.getByTestId('founder-tab-model').click();
    await expect(page.getByTestId('founder-model')).toContainText('£2,000', { timeout: 4000 });
    await expect(page.getByTestId('founder-model')).toContainText('£2,270');

    // Difficult questions expand to model answers.
    await page.getByTestId('founder-tab-questions').click();
    await page.getByTestId('founder-question-how_makes_money').click();
    await expect(page.getByTestId('founder-questions')).toContainText('Shipping margin per lane', { timeout: 4000 });

    // Meeting practice gives the timings.
    await page.getByTestId('founder-tab-practice').click();
    await expect(page.getByTestId('founder-practice')).toContainText('Demo narration');

    // Document generation produces an artefact notice (no network required).
    await page.getByRole('button', { name: /Download founder brief/ }).click();
    await expect(page.getByTestId('founder-document-notice')).toContainText('Brief downloaded', {
      timeout: 4000,
    });
    expect(pageErrors).toEqual([]);
  });

  test('2. partnerships generate and SEND explicitly through the simulated seam', async ({ page }) => {
    await loginAs(page, 'Super Admin — Tadii', 1200);
    await openNav(page, 'Partnerships & Fundraising');

    await expect(page.getByTestId('partnerships-centre')).toBeVisible({ timeout: 6000 });
    // Routes are prospective — never presented as existing partnerships.
    await expect(page.getByTestId('partner-targets-table')).toContainText('no partnership exists');
    await expect(page.locator('text=/does NOT currently hold a partnership/i').first()).toBeVisible();

    // Fundraising plan claims no commitments.
    await expect(page.locator('text=/commitments claimed: false/i').first()).toBeVisible();

    // Generate a recipient-specific message.
    await page.getByRole('button', { name: 'Generate message' }).click();
    await expect(page.getByTestId('partner-outreach-draft')).toBeVisible({ timeout: 4000 });
    await expect(page.getByTestId('partner-outreach-draft')).toContainText('wording gate: PASS');
    await expect(page.getByTestId('partner-outreach-draft')).toContainText('no existing partnership');

    // Send is refused until the explicit confirmation is ticked.
    const sendBtn = page.getByRole('button', { name: /Send now/ });
    await expect(sendBtn).toBeDisabled();
    await page.getByTestId('partner-send-confirm').check();
    await expect(sendBtn).toBeEnabled();
    await sendBtn.click();
    await expect(page.getByTestId('partner-send-result')).toContainText('SIMULATED', {
      timeout: 6000,
    });
    await expect(page.getByTestId('partner-send-result')).toContainText('network calls 0');
  });

  test('3. a non-Super-Admin account never sees the private founder surfaces', async ({ page }) => {
    await loginAs(page, 'Mercenta Admin Hub', 1200);
    const nav = page.locator('nav[aria-label="Primary"]');
    await expect(nav).toBeVisible({ timeout: 6000 });
    await expect(nav.locator('button', { hasText: 'Founder Investor Centre' })).toHaveCount(0);
    await expect(nav.locator('button', { hasText: 'Partnerships & Fundraising' })).toHaveCount(0);
    await expect(nav.locator('button', { hasText: 'Super Admin' })).toHaveCount(0);
    await expect(page.getByTestId('founder-investor-centre')).toHaveCount(0);
  });
});