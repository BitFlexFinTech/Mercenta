/**
 * Phase 7D - shared onboarding-wizard navigation helper.
 *
 * The Brand Onboarding wizard is a real 6-step form:
 *   1 Brand Profile -> 2 UK Master Wholesale Agreement -> 3 Banking Details
 *   -> 4 Fulfillment Track -> 5 Mandatory Legal Agreements
 *   -> 6 Operational Guidance.
 *
 * This helper walks the wizard exactly like a user would: fills only the
 * inputs each step gates on, clicks the canonical accessible controls, and
 * tolerates state that is already filled. It never injects application state.
 *
 * Test-only: never collected by Playwright (no .spec.ts suffix).
 */
import type { Page } from '@playwright/test';

export type TrackSteer = 'direct' | 'financed' | 'default';

/**
 * §5/M12 — the wizard's step 2 requires the brand to CHOOSE its commercial
 * relationship with Mercenta before Continue enables (fail-closed). The helper
 * therefore selects one exactly as a user would, via the canonical test id.
 */
export async function selectWizardCommercialModel(
  page: Page,
  model: 'commission_agent' | 'buy_resell' = 'commission_agent'
): Promise<void> {
  const option = page.locator(`[data-testid="commercial-model-${model}"]`).first();
  await option.scrollIntoViewIfNeeded().catch(() => {});
  await option.click({ timeout: 4000 }).catch(() => {});
  await page.waitForTimeout(120);
}

/** Select a plain <select> that follows a label WITHOUT htmlFor (wizard Select primitive). */
async function selectByLabel(page: Page, labelText: string, value: string): Promise<boolean> {
  try {
    const label = page.locator('label').filter({ hasText: labelText }).first();
    await label.scrollIntoViewIfNeeded();
    await label.locator('..').locator('select').first().selectOption(value);
    return true;
  } catch {
    return false;
  }
}

/** Fill an Input primitive (label has htmlFor -> getByLabel resolves). */
async function fillInput(page: Page, pattern: RegExp, value: string): Promise<boolean> {
  try {
    await page.getByLabel(pattern).first().fill(value);
    return true;
  } catch {
    return false;
  }
}

/** The canonical styled Checkbox is a label-wrapped sr-only input; click its visible label. */
export async function checkAllWizardCheckboxes(page: Page): Promise<void> {
  const boxes = page.locator('label:has(input[type="checkbox"])');
  const n = await boxes.count();
  for (let i = 0; i < n; i++) {
    const box = boxes.nth(i);
    const checked = await box.locator('input[type="checkbox"]').isChecked().catch(() => false);
    if (!checked) {
      await box.scrollIntoViewIfNeeded();
      await box.click().catch(() => {});
    }
  }
  /**
   * §P13 / S8 — DEFECT FOUND AND FIXED (test-only helper). The step-5 mandatory legal
   * agreements are NOT label-wrapped: each is `<input id="agreement-…">` followed by a
   * SIBLING `<label htmlFor="agreement-…">`, so the loop above never reached them and
   * this helper could not walk the wizard past step 5 (no spec had ever asked it to —
   * `finishWizard` had no caller). The two agreements are ticked here through the same
   * visible labels a brand clicks, so step 5 → 6 is a real UI transition.
   */
  for (const id of ['agreement-logistics', 'agreement-chargeback']) {
    const input = page.locator(`#${id}`);
    if ((await input.count().catch(() => 0)) === 0) continue;
    const checked = await input.isChecked().catch(() => true);
    if (!checked) {
      await page.locator(`label[for="${id}"]`).first().scrollIntoViewIfNeeded().catch(() => {});
      await page.locator(`label[for="${id}"]`).first().click().catch(() => {});
      await page.waitForTimeout(150);
    }
  }
}

/** Identify which wizard step is visible (by its <h2>). */
export async function wizardStepHeading(page: Page): Promise<string> {
  const map: Array<[RegExp, string]> = [
    [/Brand Profile/, 'profile'],
    [/Master Wholesale & Distribution Agreement/, 'master'],
    [/Banking Details/, 'banking'],
    [/Fulfillment Track/, 'fulfillment'],
    [/Mandatory Legal Agreements/, 'legal'],
    [/Operational Guidance/, 'guidance'],
  ];
  for (const [re, id] of map) {
    if (await page.locator('h2').filter({ hasText: re }).first().isVisible({ timeout: 350 }).catch(() => false)) return id;
  }
  return '';
}

/** Fill the currently-visible step's gated inputs so Continue becomes enabled. */
async function satisfyCurrentStep(page: Page, steer: TrackSteer): Promise<void> {
  const step = await wizardStepHeading(page);
  if (step === 'profile') {
    console.log('S1a');
    await fillInput(page, /Business Name/, 'Demo Brand Ltd');
    console.log('S1b');
    await page.locator('button').filter({ hasText: /^home$/i }).first().click().catch(() => {});
    console.log('S1c');
    await selectByLabel(page, 'Region', 'Africa');
    console.log('S1d');
    await page.waitForTimeout(150);
    await selectByLabel(page, 'Country / Nation', 'Zimbabwe');
    console.log('S1e');
    await page.waitForTimeout(150);
    await fillInput(page, /VAT Number|EIN/i, '0000000000');
    console.log('S1f');
    await fillInput(page, /Primary Contact Email|Email/i, 'demo@brand.test');
    console.log('S1g');
  } else if (step === 'master') {
    await fillInput(page, /Authorized Signatory|Signatory/i, 'Demo Signatory');
    await checkAllWizardCheckboxes(page);
    await page.waitForTimeout(200);
  } else if (step === 'banking') {
    const bankSel = page.locator('label').filter({ hasText: 'Select Your Bank' }).first()
      .locator('..').locator('select').first();
    await bankSel.scrollIntoViewIfNeeded();
    const optionCount = await bankSel.locator('option').count();
    if (optionCount > 1) await bankSel.selectOption({ index: 1 });
    await fillInput(page, /IBAN|Account Number/i, 'GB00BANK00000000123456');
    await selectByLabel(page, 'Payout Currency', 'GBP');
    const pill = steer === 'direct' ? 'Yes' : steer === 'financed' ? 'No' : 'Partially';
    await page.locator('button').filter({ hasText: new RegExp('^' + pill + '$', 'i') }).first().click().catch(() => {});
    await page.waitForTimeout(150);
  } else if (step === 'legal') {
    await checkAllWizardCheckboxes(page);
    await page.waitForTimeout(150);
  }
}

function stepOrdinal(id: string): number {
  const ord: Record<string, number> = { profile: 1, master: 2, banking: 3, fulfillment: 4, legal: 5, guidance: 6 };
  return ord[id] ?? 1;
}

/**
 * Advance the wizard toward `targetStep` (1..6). Fills each step's minimum
 * required inputs and waits for the Continue transition to land before moving
 * to the next iteration. Use `track: 'direct' | 'financed'` to steer the
 * working-capital pill on the banking step toward the corresponding
 * fulfillment recommendation.
 */
export async function wizardToStep(page: Page, targetStep: number, opts: { track?: 'direct' | 'financed'; model?: 'commission_agent' | 'buy_resell' } = {}): Promise<void> {
  const steer: TrackSteer = opts.track ?? 'default';
  const continueBtn = page.locator('button', { hasText: 'Continue' }).first();
  const settle = () => page.waitForTimeout(680);

  // Step 1 header is visible before we start clicking.
  await page.locator('h2').filter({ hasText: /Brand Profile/ }).first().waitFor({ timeout: 10000 });

  // Step 1 -> Step 2 (profile is prefilled by the seeded dossier).
  await fillInput(page, /Business Name/, 'Demo Brand Ltd');
  await continueBtn.click({ timeout: 10000 });
  await settle();
  if (targetStep <= 2) return;

  // Step 2 -> Step 3: signatory + the three master-agreement checkboxes +
  // the mandatory commercial relationship (§5/M12).
  await fillInput(page, /Authorized Signatory|Signatory/i, 'Demo Signatory');
  await checkAllWizardCheckboxes(page);
  await selectWizardCommercialModel(page, opts.model ?? 'commission_agent');
  await continueBtn.click({ timeout: 10000 });
  await settle();
  if (targetStep <= 3) return;

  // Step 3 -> Step 4: bank, IBAN, payout currency, working-capital pill.
  const bankSel = page.locator('label').filter({ hasText: 'Select Your Bank' }).first()
    .locator('..').locator('select').first();
  await bankSel.selectOption({ index: 1 });
  await fillInput(page, /IBAN|Account Number/i, 'GB00BANK00000000123456');
  const curSel = page.locator('label').filter({ hasText: 'Payout Currency' }).first()
    .locator('..').locator('select').first();
  await curSel.selectOption('GBP');
  const pill = steer === 'direct' ? 'Yes' : steer === 'financed' ? 'No' : 'Partially';
  await page.locator('button').filter({ hasText: new RegExp('^' + pill + '$', 'i') }).first().click();
  await continueBtn.click({ timeout: 10000 });
  await settle();
  if (targetStep <= 4) return;

  // Step 4 -> Step 5: the track recommendation is pre-filled; just continue.
  await continueBtn.click({ timeout: 10000 });
  await settle();
  if (targetStep <= 5) return;

  // Step 5 -> Step 6: accept both mandatory legal agreements, then continue.
  await checkAllWizardCheckboxes(page);
  await continueBtn.click({ timeout: 10000 });
  await settle();
}

/**
 * Best-effort complete-fill walking toward the very end for suites that need
 * the wizard finished (e.g. onboard a fresh brand). Uses the same mechanics as
 * `wizardToStep` but does not stop early.
 */
export async function finishWizard(page: Page, opts: { track?: 'direct' | 'financed'; model?: 'commission_agent' | 'buy_resell' } = {}): Promise<void> {
  await wizardToStep(page, 6, opts);
}