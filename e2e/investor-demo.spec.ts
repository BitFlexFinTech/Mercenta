/**
 * §Phase E2E — INVESTOR DEMO browser verification.
 *
 * Drives the deterministic investor-demo lifecycle through the REAL application
 * (Super Admin → Simulation Control Centre → Investor demo) and asserts, by
 * consequence rather than by layout:
 *
 *   1. the full 24-stage lifecycle runs in the browser and every stage reports OK;
 *   2. ZERO external network calls are made while it runs;
 *   3. reset → replay reproduces the SAME digest (deterministic, no duplicates);
 *   4. tenant isolation + RBAC hold in the DOMAIN (not merely hidden buttons);
 *   5. the deterministic error/recovery drills all pass;
 *   6. the surface is responsive (no horizontal overflow at 375/768/1440) and
 *      its controls have accessible names with status never colour-only.
 */
import { test, expect } from '@playwright/test';
import { loginAs } from './helpers/auth';

/** External provider calls only (dev server, websockets, static assets excluded). */
function watchExternalCalls(page: import('@playwright/test').Page): string[] {
  const externalCalls: string[] = [];
  page.on('request', (req) => {
    const url = req.url();
    const isDev = url.startsWith('http://localhost') || url.startsWith('http://127.0.0.1');
    const isWs = url.startsWith('ws://') || url.startsWith('wss://');
    const isStatic =
      /\.(woff2?|css|png|jpe?g|svg|ico)(\?|$)/.test(url) ||
      url.includes('gstatic.com') ||
      url.includes('fonts.g');
    const isPlaceholderImage = url.includes('picsum.photos');
    if (!isDev && !isWs && !isStatic && !isPlaceholderImage) externalCalls.push(url);
  });
  return externalCalls;
}

/** Open the Simulation Control Centre (handles the <1024px off-canvas nav). */
async function openSimulationTab(page: import('@playwright/test').Page) {
  const vp = page.viewportSize();
  if (vp && vp.width < 1024) {
    await page.getByTestId('app-menu-toggle').click({ timeout: 4000 });
    await page.waitForTimeout(400);
  }
  await page.click('nav[aria-label="Primary"] >> text=Super Admin');
  await page.waitForTimeout(600);
  await page.click('text=Simulation');
  await page.waitForTimeout(500);
}

async function loginAsSuperAdmin(page: import('@playwright/test').Page) {
  await loginAs(page, 'Super Admin — Tadii', 1000);
}

const runButton = (page: import('@playwright/test').Page) =>
  page.locator('button[data-state="investor-demo-run"]');
const resetButton = (page: import('@playwright/test').Page) =>
  page.locator('button[data-state="investor-demo-reset"]');
const stageRows = (page: import('@playwright/test').Page) =>
  page.locator('li[data-state^="investor-demo-stage-"]');

async function runDemoAndWait(page: import('@playwright/test').Page) {
  await runButton(page).click();
  await expect(page.locator('[data-state="investor-demo-summary"]')).toBeVisible({ timeout: 30000 });
  await expect(page.locator('[data-state="investor-demo-summary"]')).toHaveText(
    '24/24 stages OK',
    { timeout: 30000 }
  );
}

async function digestOf(page: import('@playwright/test').Page): Promise<string> {
  const el = page.locator('[data-state="investor-demo-digest"]');
  await expect(el).toBeVisible({ timeout: 15000 });
  return (await el.innerText()).trim();
}

test.describe('Investor demo — lifecycle', () => {
  test('1. the full 24-stage lifecycle runs in the browser and every stage reports OK', async ({
    page,
  }) => {
    const externalCalls = watchExternalCalls(page);
    const pageErrors: string[] = [];
    page.on('pageerror', (e) => pageErrors.push(String(e)));

    await loginAsSuperAdmin(page);
    await openSimulationTab(page);

    // The panel states what it is before anything runs.
    await expect(page.getByText('Investor demo — deterministic').first()).toBeVisible({
      timeout: 8000,
    });
    await expect(page.getByText('No live integration').first()).toBeVisible();
    await expect(page.getByText('Demo / test data').first()).toBeVisible();

    await runDemoAndWait(page);

    // Every stage is present, individually, with an explicit status word.
    await expect(stageRows(page)).toHaveCount(24);
    for (const id of [
      'application',
      'approval',
      'onboarding',
      'compliance',
      'catalogue',
      'purchase_order',
      'acknowledgement',
      'fulfilment',
      'shipment',
      'delivery',
      'returns',
      'deductions',
      'dispute',
      'commission',
      'payout',
      'crm',
      'marketing',
      'integrations',
      'social',
      'rbac',
      'audit',
      'error_recovery',
    ]) {
      const row = page.locator(`li[data-state="investor-demo-stage-${id}"]`);
      await expect(row).toBeVisible();
      await expect(row).toContainText('OK');
    }

    // Real consequences, visible in the panel's own evidence lines.
    await expect(page.locator('li[data-state="investor-demo-stage-purchase_order"]')).toContainText(
      '£504.00'
    );
    await expect(page.locator('li[data-state="investor-demo-stage-payout"]')).toContainText(
      'mock_tr_'
    );
    await expect(page.locator('li[data-state="investor-demo-stage-compliance"]')).toContainText(
      'gate BLOCKED'
    );
    await expect(page.locator('li[data-state="investor-demo-stage-dispute"]')).toContainText(
      'operator resolved as'
    );
    await expect(page.locator('li[data-state="investor-demo-stage-social"]')).toContainText(
      'sim-rel-'
    );
    await expect(page.locator('li[data-state="investor-demo-stage-error_recovery"]')).toContainText(
      'Error & recovery'
    );

    // Zero network calls, reported by the run itself and observed by the browser.
    await expect(page.getByText('network calls: 0').first()).toBeVisible();
    expect(externalCalls).toEqual([]);
    expect(pageErrors).toEqual([]);
  });

  test('2. a completed run makes no external provider call', async ({ page }) => {
    const externalCalls = watchExternalCalls(page);
    await loginAsSuperAdmin(page);
    await openSimulationTab(page);
    const baseline = externalCalls.length;
    await runDemoAndWait(page);
    await page.waitForTimeout(500);
    expect(externalCalls.slice(baseline)).toEqual([]);
  });

  test('3. reset → replay reproduces the same digest (deterministic)', async ({ page }) => {
    await loginAsSuperAdmin(page);
    await openSimulationTab(page);

    await runDemoAndWait(page);
    const first = await digestOf(page);
    expect(first.length).toBeGreaterThan(6);

    await resetButton(page).click();
    await expect(page.locator('[data-state="investor-demo-digest"]')).toHaveCount(0);

    await runDemoAndWait(page);
    const second = await digestOf(page);
    expect(second).toBe(first);
    await expect(
      page.getByText('identical to the previous run — deterministic replay confirmed').first()
    ).toBeVisible();
  });
});


test.describe('Investor demo — tenant isolation & RBAC', () => {
  test('4. brand-pinned actors are refused cross-tenant and operator-only actions IN THE DOMAIN', async ({
    page,
  }) => {
    const externalCalls = watchExternalCalls(page);
    await loginAsSuperAdmin(page);
    await openSimulationTab(page);

    // Run the demo in the browser, then prove the refusals against the state
    // that run actually created (not against a hand-built fixture).
    await runDemoAndWait(page);

    // The UI run above proves the browser path works. The authorisation proofs
    // must be made against CANONICAL state: in dev a page-level dynamic import
    // can be a separate module instance from the HMR-updated app, so the proof
    // run (and every read it depends on) happens wholly inside the page, and the
    // lifecycle evidence comes from the run's OWN canonical stage facts.
    const proof = await page.evaluate(async () => {
      const mod = await import('/src/lib/simulation/investorDemo.ts');
      const commerce = await import('/src/lib/commerce/commerceLifecycle.ts');
      const onboarding = await import('/src/lib/onboarding/onboardingLifecycle.ts');

      mod.resetInvestorDemo();
      const run = await mod.runInvestorDemo({ seed: 1 });
      const facts = Object.fromEntries(run.stages.map((s) => [s.id, s.facts]));

      const tenantId = run.tenantId;
      const poId = run.stages.find((s) => s.id === 'purchase_order')?.entityIds[0] ?? 'missing';

      const brandActor = { staffId: `brand:${tenantId}`, canMutate: true, tenantId };
      const foreignActor = {
        staffId: 'brand:brand-deskforge',
        canMutate: true,
        tenantId: 'brand-deskforge',
      };
      const viewOnlyActor = { staffId: 'staff-view-only', canMutate: false };

      const foreignActivity = commerce.listBrandCommerceActivity(tenantId, foreignActor);
      const foreignExceptions = commerce.listBrandCommerceExceptions(tenantId, foreignActor);
      const brandInitiatesOnboarding = onboarding.beginOnboardingFromApplication(
        mod.INVESTOR_DEMO_APPLICATION_ID,
        brandActor
      );
      const viewOnlyAck = commerce.acknowledgeCommercePurchaseOrder(poId, viewOnlyActor);
      const operatorRead = commerce.listBrandCommerceActivity(tenantId, {
        staffId: 'staff-001',
        canMutate: true,
      });

      return {
        allStagesOk: run.summary.ok === 24 && run.summary.error === 0 && run.summary.blocked === 0,
        networkCalls: run.networkCalls,
        // Canonical lifecycle evidence from the run's own facts.
        poDelivered: facts.delivery?.poStatus === 'delivered',
        poSimulated: facts.purchase_order?.simulated === true,
        deductionResolved: facts.dispute?.status === 'resolved' && facts.dispute?.outcome === 'partial',
        payoutAudited: facts.payout?.auditRecorded === true,
        noForeignLedgerLeak: facts.returns?.foreignLedgerLeak === false,
        // Authorisation.
        foreignActivityRefused: !foreignActivity.ok,
        foreignExceptionsRefused: !foreignExceptions.ok,
        brandOnboardingInitiationRefused: !brandInitiatesOnboarding.ok,
        viewOnlyAckRefused: !viewOnlyAck.ok,
        operatorReadAllowed: operatorRead.ok,
      };
    });

    expect(proof.allStagesOk).toBe(true);
    expect(proof.networkCalls).toBe(0);
    expect(proof.poDelivered).toBe(true);
    expect(proof.poSimulated).toBe(true);
    expect(proof.deductionResolved).toBe(true);
    expect(proof.payoutAudited).toBe(true);
    expect(proof.noForeignLedgerLeak).toBe(true);
    expect(proof.foreignActivityRefused).toBe(true);
    expect(proof.foreignExceptionsRefused).toBe(true);
    expect(proof.brandOnboardingInitiationRefused).toBe(true);
    expect(proof.viewOnlyAckRefused).toBe(true);
    expect(proof.operatorReadAllowed).toBe(true);
    expect(externalCalls).toEqual([]);
  });

  test('5. a non-Super-Admin session cannot reach the investor demo controls', async ({ page }) => {
    await loginAs(page, 'Mercenta Admin Hub', 1100);
    // The Super Admin nav item (and therefore the Simulation tab) is filtered.
    await expect(page.locator('nav[aria-label="Primary"] >> text=Super Admin')).toHaveCount(0, {
      timeout: 6000,
    });
    await expect(page.locator('button[data-state="investor-demo-run"]')).toHaveCount(0);
    await expect(page.locator('button[data-state="investor-demo-reset"]')).toHaveCount(0);
  });
});

test.describe('Investor demo — error & recovery', () => {
  test('6. the deterministic failure drills are executed and recovered', async ({ page }) => {
    await loginAsSuperAdmin(page);
    await openSimulationTab(page);
    await runDemoAndWait(page);

    const recovery = page.locator('li[data-state="investor-demo-stage-error_recovery"]');
    await expect(recovery).toContainText('compliance blocked→corrected');
    await expect(recovery).toContainText('invalid submission rejected→corrected');
    await expect(recovery).toContainText('shipment delayed→recovered');
    await expect(recovery).toContainText('payout declined→retried→settled');
    await expect(recovery).toContainText('integration outage→recovered');
    await expect(recovery).toContainText('unauthorised action and tenant mismatch refused');

    // The acknowledgement window and the blocked-then-cleared gate are visible.
    await expect(
      page.locator('li[data-state="investor-demo-stage-acknowledgement"]')
    ).toContainText('duplicate acknowledgement refused');
    // §M2 — the compliance stage now narrates the verification lifecycle
    // (submission → pending verification → failure → replacement → verified).
    await expect(page.locator('li[data-state="investor-demo-stage-compliance"]')).toContainText(
      'pending verification'
    );
    await expect(page.locator('li[data-state="investor-demo-stage-compliance"]')).toContainText(
      'gate BLOCKED'
    );
    await expect(page.locator('li[data-state="investor-demo-stage-compliance"]')).toContainText(
      'gate CLEARED'
    );
  });
});


test.describe('Investor demo — responsive & accessible', () => {
  test('7. accessibility: real accessible names, and status is never colour-only', async ({
    page,
  }) => {
    await loginAsSuperAdmin(page);
    await openSimulationTab(page);

    // Controls are addressed by their accessible name, not by a styling hook.
    const runControl = page.getByRole('button', { name: 'Run investor demo' });
    await expect(runControl).toBeVisible({ timeout: 8000 });
    await expect(page.getByRole('button', { name: 'Reset demo environment' })).toBeVisible();

    await runControl.click();
    await expect(page.locator('[data-state="investor-demo-summary"]')).toHaveText(
      '24/24 stages OK',
      { timeout: 30000 }
    );

    // The lifecycle is a labelled list, and every entry states its status in text.
    const list = page.getByRole('list', { name: 'Investor demo lifecycle stages' });
    await expect(list).toBeVisible();
    const rows = list.getByRole('listitem');
    await expect(rows).toHaveCount(24);
    for (let i = 0; i < 24; i += 1) {
      await expect(rows.nth(i)).toContainText(/(OK|BLOCKED|ERROR)/);
    }
  });

  for (const vp of [
    { name: '375x812', w: 375, h: 812 },
    { name: '768x1024', w: 768, h: 1024 },
    { name: '1440x900', w: 1440, h: 900 },
  ]) {
    test(`8.${vp.name} — the investor demo surface runs with no horizontal overflow`, async ({
      page,
    }) => {
      await page.setViewportSize({ width: vp.w, height: vp.h });
      await loginAsSuperAdmin(page);
      await openSimulationTab(page);
      await runDemoAndWait(page);

      // No horizontal page overflow at any of the three critical widths.
      const overflow = await page.evaluate(() => {
        const doc = document.documentElement;
        return {
          scrollWidth: doc.scrollWidth,
          clientWidth: doc.clientWidth,
        };
      });
      expect(overflow.scrollWidth).toBeLessThanOrEqual(overflow.clientWidth + 1);

      // The controls remain reachable, and the final stage is present at width.
      await expect(resetButton(page)).toBeVisible();
      await expect(page.locator('li[data-state="investor-demo-stage-error_recovery"]')).toBeVisible();
    });
  }
});
