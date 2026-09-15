/**
 * §10/§31 (M13 continuation) — FOUNDER FUNDING / ACCELERATOR PIPELINE
 * (browser verification, Super Admin surface).
 *
 * Proves the founder's own funding pipeline is REAL in the UI:
 *   1. the three §10 opportunities render with their REAL urls, their claim-classed
 *      researched terms, and "NOT STATED in the research" wherever the research
 *      stated nothing — no invented amount, term or deadline;
 *   2. generation produces a draft that says NOT SUBMITTED and passed the wording gate;
 *   3. the §31 gate is real end to end: a submission is REFUSED before the founder
 *      records an approval, and only a founder-supplied reference is recorded.
 */
import { test, expect } from '@playwright/test';
import { loginAs } from './helpers/auth';

const ID = 'fund-solo-founders';
const CARD = `funding-opportunity-${ID}`;

async function openFundingPipeline(page: import('@playwright/test').Page) {
  await loginAs(page, 'Super Admin — Tadii', 1400);
  await page.locator('button:has-text("Super Admin")').first().click();
  await page.waitForTimeout(600);
  await page.locator('button:has-text("Grants & Investors")').first().click();
  await page.waitForTimeout(600);
}

test.describe('Founder funding & accelerator pipeline', () => {
  test('1. the three REAL opportunities render with their real urls and honest labels', async ({ page }) => {
    const pageErrors: string[] = [];
    page.on('pageerror', (e) => pageErrors.push(String(e)));
    await openFundingPipeline(page);

    const pipeline = page.getByTestId('funding-pipeline');
    await expect(pipeline).toBeVisible({ timeout: 10000 });
    for (const id of ['fund-solo-founders', 'fund-the-bridge', 'fund-ignyte-difc']) {
      await expect(page.getByTestId(`funding-opportunity-${id}`)).toBeVisible();
    }
    await expect(pipeline).toContainText('https://solofounders.com/program');
    await expect(pipeline).toContainText('https://www.join-thebridge.com/');
    await expect(pipeline).toContainText('https://www.ignyte.ae/');

    // Terms the research never stated are labelled as unstated — never invented.
    await expect(page.getByTestId('funding-opportunity-fund-the-bridge')).toContainText(
      'NOT STATED in the research'
    );
    // Researched terms carry their claim class.
    await expect(page.getByTestId(CARD)).toContainText('Third-party research');
    // The honest disclaimer is always visible.
    await expect(pipeline).toContainText('Mercenta does not submit applications to third parties');
    await expect(pipeline).not.toContainText('Mercenta has submitted');
    expect(pageErrors).toEqual([]);
  });

  test('2. generation produces a NOT SUBMITTED draft that passed the wording gate', async ({ page }) => {
    await openFundingPipeline(page);
    const card = page.getByTestId(CARD);
    await card.getByRole('button', { name: 'Generate application' }).click();
    await page.waitForTimeout(400);

    const draft = page.getByTestId('funding-draft');
    await expect(draft).toContainText('NOT SUBMITTED');
    await expect(draft).toContainText('wording gate: PASS');
    await expect(page.getByTestId('funding-notice')).toContainText('NOTHING has been submitted');
  });

  test('3. the approval gate is real: no approval ⇒ no recorded submission', async ({ page }) => {
    await openFundingPipeline(page);
    const card = page.getByTestId(CARD);

    // Nothing recorded yet: the stage is Discovered.
    await expect(page.getByTestId(`funding-stage-${ID}`)).toContainText('Discovered');

    // A submission is refused outright before any approval.
    await card.getByRole('button', { name: 'Record my submission' }).click();
    await page.waitForTimeout(400);
    await expect(page.getByTestId('funding-notice')).toContainText('Refused');

    // A reference plus the explicit confirmation are still NOT enough without approval.
    await page.getByTestId(`funding-submission-ref-${ID}`).fill('SF-APP-2026-0001');
    await page.getByTestId(`funding-submission-confirm-${ID}`).check();
    await card.getByRole('button', { name: 'Record my submission' }).click();
    await page.waitForTimeout(400);
    await expect(page.getByTestId('funding-notice')).toContainText('approval');
    await expect(page.getByTestId(`funding-stage-${ID}`)).toContainText('Discovered');

    // Recording the founder's approval moves the stage and records NO submission.
    await card.getByRole('button', { name: 'Record founder approval' }).click();
    await page.waitForTimeout(400);
    await expect(page.getByTestId(`funding-stage-${ID}`)).toContainText('Founder approval');
    await expect(page.getByTestId('funding-notice')).toContainText('Approval recorded');

    // Only now is the founder's own submission recordable, and it records THEIR reference.
    await card.getByRole('button', { name: 'Record my submission' }).click();
    await page.waitForTimeout(400);
    await expect(page.getByTestId(`funding-stage-${ID}`)).toContainText(
      'Submitted (founder-recorded)'
    );
    await expect(page.getByTestId('funding-notice')).toContainText('SF-APP-2026-0001');
    await expect(card).toContainText('SF-APP-2026-0001');
  });
});
