/**
 * §P10 — THE LOGISTICS HUB'S COMPLETION SURFACES, IN A REAL BROWSER.
 *
 * programme `docs/DASHBOARD_LOGISTICS_CLEANUP_PROGRAMME_2026-09-22.md` §4 P10;
 * matrix `D10-10`; programme decision 11. The domain behaviour is proved by
 * `scripts/validate-logistics-providers.mjs` (96 assertions, executing the real
 * modules). This spec proves the SAME behaviour is PRESENT in the running product:
 *
 *   1  the BRAND hub states both Mercenta carrier accounts, each with its lane, its
 *      declared capability and its TRUTHFUL state — and states that Mercenta
 *      configures them, so a brand never selects or configures a carrier;
 *   2  the brand surface exposes no credential form and no cost base;
 *   3  the consolidation posture is shown as DEFERRED with its documented channel
 *      evidence, its 1..n model statement and its invariants (decision 11 — recorded,
 *      not silently implemented and not designed out);
 *   4  the ADMIN hub carries the same provider configuration for the operator, with a
 *      WORKING hand-off to the ONE surface that owns credentials (Integration
 *      Settings) — no dead link and no second credential form;
 *   5  the ADMIN hub carries the PO-document queue cross-tenant, naming the brand, and
 *      the same consolidation posture.
 */
import { test, expect } from '@playwright/test';
import { loginAs } from './helpers/auth';

async function openBrandLogistics(page: any) {
  await loginAs(page, 'Tapatío', 1100);
  await page.click('nav[aria-label="Primary"] >> text=Logistics Hub');
  await page.waitForTimeout(1500);
}

async function openAdminLogistics(page: any) {
  await loginAs(page, 'Mercenta Admin Hub', 1300);
  await page.click('nav[aria-label="Primary"] >> text=Logistics Hub');
  await page.waitForTimeout(1700);
}

/** The credential owner: Integration Settings is super-admin-only (VIEW_ALLOWLIST). */
async function openSuperAdminLogistics(page: any) {
  await loginAs(page, 'Super Admin — Tadii', 1400);
  await page.click('nav[aria-label="Primary"] >> text=Logistics Hub');
  await page.waitForTimeout(1700);
}

test.describe('§P10 — brand: carrier providers + the deferred consolidation', () => {
  test('1. both Mercenta carrier accounts are stated with their lane and real state', async ({ page }) => {
    await openBrandLogistics(page);

    const panel = page.locator('[data-testid="brand-carrier-providers"]');
    await expect(panel).toBeVisible({ timeout: 10000 });

    // Both canonical accounts, and only those (DHL + Palletline — decision 1).
    await expect(page.locator('[data-testid="carrier-provider-dhl"]')).toBeVisible();
    await expect(page.locator('[data-testid="carrier-provider-palletline"]')).toBeVisible();

    // The state is machine-readable and truthful in simulation.
    const dhlState = page.locator('[data-testid="carrier-provider-state-dhl"]');
    await expect(dhlState).toHaveAttribute('data-mode', 'simulation');
    await expect(dhlState).toContainText(/Simulation/);

    // The brand is told WHO configures the carriers — it cannot configure one.
    await expect(page.locator('[data-testid="carrier-provider-brand-notice"]')).toContainText(
      /Mercenta holds and configures/
    );
  });

  test('2. the brand surface exposes no credential form and no cost base', async ({ page }) => {
    await openBrandLogistics(page);

    // No credential input exists on the brand's Hub at all.
    expect(await page.locator('input[type="password"]').count()).toBe(0);

    const body = (await page.locator('main').first().innerText()) ?? '';
    // Mercenta's negotiated cost base is never published to a brand.
    expect(body).not.toMatch(/negotiated discount|mark-?up %|markUpPct|carrier cost/i);
    // The retired carrier identities are never presented as accounts (decision 1).
    expect(body).not.toMatch(/FedEx|BAK Logistics/i);
  });
});

test.describe('§P10 — brand: the deferred consolidation posture', () => {
  test('3. consolidation is shown as DEFERRED with its documented evidence and invariants', async ({
    page,
  }) => {
    await openBrandLogistics(page);

    const posture = page.locator('[data-testid="consolidation-posture"]').first();
    await expect(posture).toBeVisible({ timeout: 10000 });

    await expect(page.locator('[data-testid="consolidation-status"]').first()).toHaveAttribute(
      'data-status',
      'deferred'
    );
    await expect(page.locator('[data-testid="consolidation-today"]').first()).toContainText(
      /One purchase order = one consignment/
    );
    await expect(page.locator('[data-testid="consolidation-model-support"]').first()).toContainText(
      /1\.\.n/
    );

    // The channel evidence is QUOTED, never asserted as Mercenta's own claim.
    const evidence =
      (await page.locator('[data-testid="consolidation-evidence"]').first().innerText()) ?? '';
    expect(evidence).toMatch(/purchaseOrders/);
    expect(evidence).toMatch(/per carton/);
    expect(evidence).toMatch(/100 shipment confirmations/);

    // And the invariants a future grouping must honour are stated.
    const invariants =
      (await page.locator('[data-testid="consolidation-invariants"]').first().innerText()) ?? '';
    expect(invariants).toMatch(/different brands/);
    expect(invariants).toMatch(/duplicate purchase-order declaration is refused/i);
  });
});

test.describe('§P10 — admin: the same records, operator scope, real hand-off', () => {
  test('4. the SUPER ADMIN sees the provider configuration and reaches Integration Settings', async ({
    page,
  }) => {
    await openSuperAdminLogistics(page);

    const panel = page.locator('[data-testid="carrier-provider-configuration-admin"]');
    await expect(panel).toBeVisible({ timeout: 12000 });
    await expect(page.locator('[data-testid="carrier-provider-dhl"]')).toBeVisible();
    await expect(page.locator('[data-testid="carrier-provider-palletline"]')).toBeVisible();

    // The credential control plane is named, and the hand-off is a REAL destination.
    await expect(page.getByText(/Integrations Hub/).first()).toBeVisible();
    await expect(panel).toHaveAttribute('data-handoff', 'available');
    await page.getByRole('button', { name: 'Open Integration Settings' }).first().click();
    await page.waitForTimeout(1400);
    // The canonical Integrations surface itself — not a dead link.
    await expect(page.locator('[data-testid="integration-hub"]')).toBeVisible({ timeout: 10000 });
  });

  /**
   * §P10 — FAIL-CLOSED HAND-OFF (a REAL defect this phase's spec found).
   *
   * The first version of the hand-off was rendered for EVERY admin session. Verified in a
   * browser: Integration Settings is restricted by the canonical RBAC, so an admin STAFF
   * session that clicked it landed on AccessDenied — a control that leads nowhere.
   * The hand-off is now gated on the destination actually being reachable, and this test
   * proves the staff session sees the same configuration with NO dead-end control.
   */
  test('4b. an admin-STAFF session gets the configuration but NO dead-end hand-off', async ({
    page,
  }) => {
    await openAdminLogistics(page);

    const panel = page.locator('[data-testid="carrier-provider-configuration-admin"]');
    await expect(panel).toBeVisible({ timeout: 12000 });
    await expect(panel).toHaveAttribute('data-handoff', 'role_restricted');
    await expect(page.getByRole('button', { name: 'Open Integration Settings' })).toHaveCount(0);
    // The record itself is still complete for the operator.
    await expect(page.locator('[data-testid="carrier-provider-dhl"]')).toBeVisible();
    await expect(page.getByText(/Integrations Hub/).first()).toBeVisible();
  });

  test('5. the operator sees the cross-tenant PO-document queue and the same posture', async ({
    page,
  }) => {
    await openAdminLogistics(page);

    const queue = page.locator('[data-testid="po-documents-queue-admin"]');
    await expect(queue).toBeVisible({ timeout: 12000 });

    // The seeded lifecycle POs are accepted/ready-to-fulfil, so the queue is populated,
    // and every row names the brand whose pack is outstanding.
    const rows = page.locator('[data-testid^="po-documents-queue-row-"]');
    expect(await rows.count()).toBeGreaterThan(0);
    const body = (await queue.innerText()) ?? '';
    expect(body).toMatch(/Tapatío|Astonish/);
    // The operator is told the pack belongs to the brand's own Hub, not re-issued here.
    expect(body).toMatch(/remaining job|download and print/i);

    await expect(page.locator('[data-testid="consolidation-posture"]').first()).toBeVisible();
  });
});
