/**
 * Phase 7F - Compliance Gate tests.
 *
 * Phase 7F added deterministic compliance-scenario PORTAL tenants to the
 * canonical demo dataset (src/data/demoData.ts → DEMO_COMPLIANCE_SCENARIOS):
 *   - "Le Creuset"      — 0/4 required docs approved (Kitchen → 4
 *     required; uploaded/under_review/missing/rejected). Contract active + both
 *     §4.1/§4.2 agreements accepted → gate blocked by the DOCUMENT state alone.
 *   - "Autoglym" — 3/4 approved (type_approval missing) →
 *     gate still blocked by the single remaining document.
 *
 * The fully-cleared path is covered by the existing cleared tenants:
 *   - "Astonish" — exactly 4/4 (Health & Personal Care).
 *   - "Tapatío"       — 4/4 (Grocery, category document approved).
 *
 * §AV-032 — the required set is THREE universal documents. `brand_registry_
 * confirmation` is no longer required, and is never blocking, anywhere in this spec.
 *
 * The tests assert user-visible behavior (catalog CTA + gate banner + the
 * compliance page gate card) — never the data store alone.
 */
import { test, expect } from '@playwright/test';
import { loginAs } from './helpers/auth';

test.describe('Compliance Gate', () => {
  test('1. 0/4 docs -> catalog blocked', async ({ page }) => {
    await loginAs(page, 'Le Creuset', 1100);
    const nav = page.locator('nav[aria-label="Primary"]');
    await nav.getByText('Product Catalog').first().click();
    await page.waitForTimeout(900);

    // User-visible gate: the catalog CTA is replaced by a locked, disabled state.
    const locked = page.locator('button', { hasText: 'Catalog Locked' }).first();
    await expect(locked).toBeVisible({ timeout: 6000 });
    await expect(locked).toBeDisabled();
    // The gate banner is honest about the blocking document state.
    await expect(page.getByText('Catalog Sync Disabled').first()).toBeVisible({ timeout: 4000 });
    await expect(page.locator('text=Pending review: letter of authorization').first()).toBeVisible({ timeout: 3000 });
    await expect(page.locator('text=Pending review: insurance certificate').first()).toBeVisible({ timeout: 3000 });
    // No cleared-tenant leakage: the enabled CTA must not exist for this tenant.
    await expect(page.locator('button', { hasText: 'Add New Product' })).not.toBeVisible({ timeout: 2000 });

    // The compliance page's gate card (canonical rule) reports the same state.
    await nav.getByText('UK Compliance').first().click();
    await page.waitForTimeout(900);
    const gateCard = page.locator('text=Compliance gate not yet cleared').first();
    await expect(gateCard).toBeVisible({ timeout: 6000 });
    await expect(page.locator('text=4 item(s) remain.').first()).toBeVisible({ timeout: 3000 });
  });

  test('2. 3/4 docs -> still blocked', async ({ page }) => {
    await loginAs(page, 'Autoglym', 1100);
    const nav = page.locator('nav[aria-label="Primary"]');
    await nav.getByText('Product Catalog').first().click();
    await page.waitForTimeout(900);

    // Only ONE document is missing (type_approval) yet the gate still blocks.
    const locked = page.locator('button', { hasText: 'Catalog Locked' }).first();
    await expect(locked).toBeVisible({ timeout: 6000 });
    await expect(locked).toBeDisabled();
    await expect(page.getByText('Catalog Sync Disabled').first()).toBeVisible({ timeout: 4000 });
    await expect(page.locator('text=Pending review: type approval').first()).toBeVisible({ timeout: 3000 });
    // The three approved base documents do NOT unlock the gate on their own.
    await expect(page.locator('button', { hasText: 'Add New Product' })).not.toBeVisible({ timeout: 2000 });
  });

  test('3. 4/4 docs + signed/active contract -> catalog enabled', async ({ page }) => {
    // Astonish — Health & Personal Care: exactly 4/4 required docs approved.
    await loginAs(page, 'Astonish', 1100);
    const nav = page.locator('nav[aria-label="Primary"]');
    await nav.getByText('Product Catalog').first().click();
    await page.waitForTimeout(900);
    const addBtn = page.locator('button', { hasText: 'Add New Product' }).first();
    await expect(addBtn).toBeVisible({ timeout: 6000 });
    await expect(addBtn).toBeEnabled();
    await expect(page.locator('button', { hasText: 'Catalog Locked' })).not.toBeVisible({ timeout: 2000 });

    // Tapatío — Grocery: 4/4 required docs approved (cleared).
    await loginAs(page, 'Tapatío', 1100);
    const nav2 = page.locator('nav[aria-label="Primary"]');
    await nav2.getByText('Product Catalog').first().click();
    await page.waitForTimeout(900);
    const addBtn2 = page.locator('button', { hasText: 'Add New Product' }).first();
    await expect(addBtn2).toBeVisible({ timeout: 6000 });
    await expect(addBtn2).toBeEnabled();
  });

  test('4. Admin Compliance Approvals renders doc rows', async ({ page }) => {
    await loginAs(page, 'Mercenta Admin Hub', 1100);
    await page.click('nav[aria-label="Primary"] >> text=Compliance Approvals');
    await page.waitForTimeout(1000);
    const statusCell = page.locator('text=approved').or(page.locator('text=missing'));
    await expect(statusCell.first()).toBeVisible({ timeout: 6000 });
  });

  /**
   * §Phase A — ComplianceUploadCard completion. The card's Upload action is a
   * canonical write (demoStore + optional Supabase row). Before the fix the
   * component bumped a dead `docVersion` counter and never re-read the docs, so
   * the row's own status badge stayed on its pre-upload value (the user saw
   * "Document uploaded and marked for review." next to a stale badge).
   *
   * Le Creuset (brand-lecreuset) is the 0/4 scenario tenant; its
   * insurance_certificate document is present with status `missing`.
   */
  test('5. brand document Upload reflects immediately (no reload, no approval)', async ({ page }) => {
    await loginAs(page, 'Le Creuset', 1100);
    const nav = page.locator('nav[aria-label="Primary"]');
    await nav.getByText('UK Compliance').first().click();
    await page.waitForTimeout(900);

    // Row = the span holding the doc label → its wrappers → the row container.
    // (§M2 added one wrapper level inside the row for the requirement rationale
    // and verification verdict, so the traversal depth grew by one.)
    const row = page
      .getByText('insurance certificate', { exact: true })
      .first()
      .locator('..')
      .locator('..')
      .locator('..');
    await expect(row.getByText('missing', { exact: true }).first()).toBeVisible({ timeout: 6000 });

    await row.getByRole('button', { name: 'Upload' }).first().click();

    // 1. The row's OWN badge must move to under_review without a reload.
    await expect(row.getByText('under review', { exact: true }).first()).toBeVisible({ timeout: 6000 });
    await expect(row.getByText('missing', { exact: true })).not.toBeVisible({ timeout: 2000 });
    // 2. The confirmation is shown.
    await expect(page.locator('text=Document uploaded and marked for review.').first()).toBeVisible({ timeout: 3000 });
    // 3. Honest state: an upload is NOT an approval — the gate still blocks with
    //    the same number of non-approved documents (missing → under_review).
    await expect(page.locator('text=Compliance gate not yet cleared').first()).toBeVisible({ timeout: 3000 });
    await expect(page.locator('text=4 item(s) remain.').first()).toBeVisible({ timeout: 3000 });
  });
});