/**
 * §M2 — Document verification browser coverage.
 *
 * Drives the REAL surfaces (no test-only hooks):
 *   - Mercenta Admin → Compliance Approvals: the automated verification verdict,
 *     the manual approve/reject path and the honest refusal note;
 *   - Brand → UK Compliance: submission → pending verification, the rejected
 *     document with its failure reason, and the Replace action.
 *
 * The deep domain drills (superseding, version increment, gate-blocked-until-
 * verified, fail-closed provider modes, tenant isolation) are pinned by
 * scripts/validate-document-verification.mjs, which runs the real modules.
 */
import { test, expect } from '@playwright/test';
import { loginAs } from './helpers/auth';

test.describe('Document verification — Mercenta Admin review', () => {
  test('1. automated verification records a real verdict (simulated provider)', async ({ page }) => {
    await loginAs(page, 'Mercenta Admin Hub', 1100);
    await page.click('nav[aria-label="Primary"] >> text=Compliance Approvals');
    await page.waitForTimeout(1000);

    // Expand the first brand card, then run automated verification on a row.
    // §UI/UX Wave 2 completion — REPOINTED. The previous selector
    // (`div.grid button`) was an implicit "the first grid on the page happens to
    // be the brand-card grid" assumption. The surface now composes a workspace
    // metric band (also a `div.grid`, with genuinely clickable drill-down tiles)
    // above the queue, so the selector is repointed to the EXPLICIT brand-card
    // contract instead of depending on document order. The invariant asserted is
    // unchanged and now stronger.
    await page.locator('[data-testid="compliance-brand-card"] button').first().click();
    await page.waitForTimeout(400);
    const verify = page.locator('button', { hasText: 'Verify (automated)' }).first();
    await expect(verify).toBeVisible({ timeout: 6000 });
    await verify.click();

    // The verdict line is written from the RECORDED verification result — it can
    // only appear if the seam actually produced one.
    const note = page.getByTestId('compliance-verification-note');
    await expect(note).toBeVisible({ timeout: 8000 });
    await expect(note).toContainText(/Automated verification/);
    await expect(note).toContainText(/simulated_document_verification|verification failed/);
  });

  test('2. manual rejection is recorded with the operator as the verifier', async ({ page }) => {
    await loginAs(page, 'Mercenta Admin Hub', 1100);
    await page.click('nav[aria-label="Primary"] >> text=Compliance Approvals');
    await page.waitForTimeout(1000);
    await page.locator('[data-testid="compliance-brand-card"] button').first().click();
    await page.waitForTimeout(400);

    const reject = page.locator('button', { hasText: 'Reject' }).first();
    await expect(reject).toBeVisible({ timeout: 6000 });
    await reject.click();

    const note = page.getByTestId('compliance-verification-note');
    await expect(note).toBeVisible({ timeout: 8000 });
    await expect(note).toContainText(/Manual verification/);
    await expect(note).toContainText(/Tadii/);
    await expect(note).toContainText(/failed/);
  });

  test('3. a manual approval still names the operator and the manual method', async ({ page }) => {
    await loginAs(page, 'Mercenta Admin Hub', 1100);
    await page.click('nav[aria-label="Primary"] >> text=Compliance Approvals');
    await page.waitForTimeout(1000);

    // Expand the Le Creuset card (all of its documents are non-approved, so the
    // manual approval action is present).
    // §UI/UX Wave 2 completion — REPOINTED to the explicit brand-card contract
    // (see test 1). The card is still resolved by its real brand name.
    const card = page.locator('[data-testid="compliance-brand-card"]').filter({ hasText: 'Le Creuset' }).first();
    await card.locator('button').first().click();
    await page.waitForTimeout(400);

    const approve = card.locator('button', { hasText: 'Approve (manual)' }).first();
    await expect(approve).toBeVisible({ timeout: 6000 });
    await approve.click();

    const note = page.getByTestId('compliance-verification-note');
    await expect(note).toBeVisible({ timeout: 8000 });
    await expect(note).toContainText(/Manual verification/);
    await expect(note).toContainText(/Tadii/);
  });
});

test.describe('Document verification — brand surface', () => {
  test('4. a submission becomes "under review" and is never auto-approved', async ({ page }) => {
    // §P2 REPOINTED (2026-10-02) — Le Creuset's insurance_certificate document is
    // `missing` with NO artefact.
    await loginAs(page, 'Le Creuset', 1100);
    const nav = page.locator('nav[aria-label="Primary"]');
    await nav.getByText('UK Compliance').first().click();
    await page.waitForTimeout(900);

    const row = page
      .getByText('insurance certificate', { exact: true })
      .first()
      .locator('..')
      .locator('..')
      .locator('..');
    await row.getByRole('button', { name: 'Upload' }).first().click();

    // Submission ≠ approval: the requirement stays blocked.
    await expect(page.locator('text=Compliance gate not yet cleared').first()).toBeVisible({ timeout: 6000 });
    await expect(row.getByText('under review', { exact: true }).first()).toBeVisible({ timeout: 6000 });
  });

  test('5. a rejected document shows its failure reason and a Replace action', async ({ page }) => {
    // Le Creuset's food_contact_material is the seeded REJECTED document.
    await loginAs(page, 'Le Creuset', 1100);
    const nav = page.locator('nav[aria-label="Primary"]');
    await nav.getByText('UK Compliance').first().click();
    await page.waitForTimeout(900);

    const row = page
      .getByText('food contact material', { exact: true })
      .first()
      .locator('..')
      .locator('..')
      .locator('..');
    await expect(row.getByText('rejected', { exact: true }).first()).toBeVisible({ timeout: 6000 });
    await expect(row.getByText(/replacement required/).first()).toBeVisible({ timeout: 4000 });
    const replace = row.getByRole('button', { name: 'Replace' });
    await expect(replace).toBeVisible({ timeout: 4000 });

    // Replacing supersedes the rejected version and re-submits (still blocked).
    await replace.click();
    await expect(row.getByText('uploaded', { exact: true }).first()).toBeVisible({ timeout: 6000 });
    await expect(page.locator('text=Compliance gate not yet cleared').first()).toBeVisible({ timeout: 4000 });
  });

  test('6. the conditional category requirement is labelled as conditional', async ({ page }) => {
    await loginAs(page, 'Le Creuset', 1100);
    const nav = page.locator('nav[aria-label="Primary"]');
    await nav.getByText('UK Compliance').first().click();
    await page.waitForTimeout(900);
    await expect(page.locator('text=conditional').first()).toBeVisible({ timeout: 6000 });
  });
});

