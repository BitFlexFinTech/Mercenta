/**
 * §Phase E4 — Commerce / Amazon-style operational-simulation browser verification.
 *
 * Real Chromium walkthrough against actual application state (no stubs):
 *   E3-ready product → simulated PO → acknowledgement → fulfilment/shipment
 *   → receiving → simulated invoice → simulated payment → exception → dispute,
 * plus tenant isolation, DOMAIN-level refusal of an unauthorised actor, and a
 * zero-external-network assertion across the whole simulated flow.
 *
 * The app is in-memory by design, so each test starts from a fresh document.
 *
 * Uses the canonical login helper (e2e/helpers/auth.ts).
 */
import { test, expect } from '@playwright/test';
import { loginAs } from './helpers/auth';

/** External network calls that are NOT our own dev server — must stay empty. */
function watchExternalCalls(page: import('@playwright/test').Page): string[] {
  const externalCalls: string[] = [];
  page.on('request', (req) => {
    const url = req.url();
    const isDev = url.startsWith('http://localhost') || url.startsWith('http://127.0.0.1');
    const isWs = url.startsWith('ws://') || url.startsWith('wss://');
    // Static asset/font fetches are not provider calls.
    const isStatic =
      /\.(woff2?|css|png|jpe?g|svg|ico)(\?|$)/.test(url) ||
      url.includes('gstatic.com') ||
      url.includes('fonts.g');
    // Deterministic placeholder product-image host used by the seeded fixtures
    // (a plain <img> src, not a provider call).
    const isPlaceholderImage = url.includes('picsum.photos');
    if (!isDev && !isWs && !isStatic && !isPlaceholderImage) externalCalls.push(url);
  });
  return externalCalls;
}

async function openBrandPurchaseOrders(page: import('@playwright/test').Page, brand: string) {
  await loginAs(page, brand, 1100);
  await page.locator('nav[aria-label="Primary"]').getByText('Purchase Orders').first().click();
  await page.waitForTimeout(900);
  await expect(page.getByText('Operational commerce simulation').first()).toBeVisible({ timeout: 8000 });
}

test.describe('E4 — operational commerce simulation', () => {
  test('1. brand: the complete simulated commerce lifecycle (PO → ack → fulfil → receive → invoice → payment)', async ({ page }) => {
    const externalCalls = watchExternalCalls(page);
    const pageErrors: string[] = [];
    page.on('pageerror', (e) => pageErrors.push(String(e)));

    // Astonish is CLEARED and already owns E3-completed catalog products.
    await openBrandPurchaseOrders(page, 'Astonish');

    // Eligibility is DERIVED from the E3 catalog lifecycle, not assumed.
    await expect(page.getByText('Eligible for the commerce simulation').first()).toBeVisible({ timeout: 8000 });
    expect(externalCalls).toEqual([]);

    const raise = page.locator('button[data-state="commerce-raise-po"]').first();
    await expect(raise).toBeEnabled({ timeout: 6000 });
    await raise.click();
    await expect(page.getByText(/Raise simulated PO: PO-SIM-BRAND-ASTONISH/).first()).toBeVisible({ timeout: 8000 });

    const ack = page.locator('button[data-state="commerce-acknowledge"]').first();
    await expect(ack).toBeEnabled({ timeout: 6000 });
    await ack.click();
    await expect(page.getByText(/Acknowledge: PO-SIM-BRAND-ASTONISH/).first()).toBeVisible({ timeout: 8000 });

    const fulfil = page.locator('button[data-state="commerce-fulfil"]').first();
    await expect(fulfil).toBeEnabled({ timeout: 6000 });
    await fulfil.click();
    await expect(page.getByText(/Fulfil: shipment-/).first()).toBeVisible({ timeout: 8000 });

    const receive = page.locator('button[data-state="commerce-receive"]').first();
    await expect(receive).toBeEnabled({ timeout: 6000 });
    await receive.click();
    // §S9 — REPOINTED (the old contract recorded): the invoice used to require a
    // separate "Issue invoice" click after receipt; the RECEIPT now raises it.
    await expect(page.getByText(/Receive: PO delivered.*SIM-INV-/).first()).toBeVisible({ timeout: 8000 });

    const pay = page.locator('button[data-state="commerce-record-payment"]').first();
    await expect(pay).toBeEnabled({ timeout: 6000 });
    await pay.click();
    await expect(page.getByText(/Record simulated payment: £/).first()).toBeVisible({ timeout: 8000 });

    // The operational trail is visible and labelled as simulation.
    await expect(page.getByText('Operational activity trail').first()).toBeVisible({ timeout: 6000 });
    await expect(page.getByText('SIM-INV-PO-SIM-BRAND-ASTONISH').first()).toBeVisible({ timeout: 6000 });

    // No page error and no external provider was contacted at any point.
    expect(pageErrors).toEqual([]);
    expect(externalCalls).toEqual([]);
  });

  test('2. brand: an operational exception can be raised, disputed and resolved', async ({ page }) => {
    const externalCalls = watchExternalCalls(page);
    const pageErrors: string[] = [];
    page.on('pageerror', (e) => pageErrors.push(String(e)));

    await openBrandPurchaseOrders(page, 'Astonish');

    // Drive the simulated lifecycle to DELIVERED so the exception control unlocks.
    await page.locator('button[data-state="commerce-raise-po"]').first().click();
    await page.waitForTimeout(500);
    await page.locator('button[data-state="commerce-acknowledge"]').first().click();
    await page.waitForTimeout(500);
    await page.locator('button[data-state="commerce-fulfil"]').first().click();
    await page.waitForTimeout(600);
    await page.locator('button[data-state="commerce-receive"]').first().click();
    await page.waitForTimeout(700);

    const raiseException = page.locator('button[data-state="commerce-raise-exception"]').first();
    await expect(raiseException).toBeEnabled({ timeout: 8000 });
    await raiseException.click();
    await expect(page.getByText(/Raise exception: ded-/).first()).toBeVisible({ timeout: 8000 });

    // The exception is on the EXISTING deductions ledger, visible to the brand.
    await expect(page.getByText('Exceptions (chargebacks)').first()).toBeVisible({ timeout: 6000 });

    const dispute = page.locator('button[data-state="commerce-open-dispute"]').first();
    await expect(dispute).toBeVisible({ timeout: 6000 });
    await dispute.click();
    await expect(page.getByText(/Open dispute: ded-/).first()).toBeVisible({ timeout: 8000 });

    // §Phase E2E — the brand may OPEN and evidence a dispute, but it must never
    // declare its own outcome ("brand cannot falsely declare itself the winner").
    // Resolution is a Mercenta operations decision, enforced IN THE DOMAIN.
    await expect(page.locator('button[data-state="commerce-resolve-dispute"]')).toHaveCount(0);
    await expect(
      page.locator('[data-state="commerce-dispute-awaiting-operations"]').first()
    ).toBeVisible();

    const brandRefusal = await page.evaluate(async () => {
      const mod = await import('/src/lib/commerce/commerceLifecycle.ts');
      const store = await import('/src/data/demoStore.ts');
      const d = store.demoDeductions.find(
        (x) => x.brandId === 'brand-astonish' && x.status === 'disputed'
      );
      if (!d) return { skipped: true } as const;
      const brandActor = {
        staffId: 'brand:brand-astonish',
        canMutate: true,
        tenantId: 'brand-astonish',
      };
      const res = mod.resolveCommerceDispute(d.id, 'won', brandActor);
      const after = store.demoDeductions.find((x) => x.id === d.id);
      return {
        skipped: false as const,
        ok: res.ok,
        error: String(res.error ?? ''),
        status: after?.status,
        outcome: after?.dispute?.outcome ?? null,
      };
    });
    expect(brandRefusal.skipped).toBe(false);
    if (!brandRefusal.skipped) {
      expect(brandRefusal.ok).toBe(false);
      expect(brandRefusal.error).toContain('FORBIDDEN');
      // A refusal MUST NOT mutate the recorded outcome.
      expect(brandRefusal.status).toBe('disputed');
      expect(brandRefusal.outcome).toBeNull();
    }

    expect(pageErrors).toEqual([]);
    expect(externalCalls).toEqual([]);
  });

  test('2b. brand opens a dispute; the OPERATOR resolves it — the canonical outcome changes', async ({
    page,
  }) => {
    const externalCalls = watchExternalCalls(page);
    const pageErrors: string[] = [];
    page.on('pageerror', (e) => pageErrors.push(String(e)));

    // 1. The BRAND drives the operational lifecycle and disputes the exception.
    await openBrandPurchaseOrders(page, 'Astonish');
    await page.locator('button[data-state="commerce-raise-po"]').first().click();
    await page.waitForTimeout(400);
    await page.locator('button[data-state="commerce-acknowledge"]').first().click();
    await page.waitForTimeout(400);
    await page.locator('button[data-state="commerce-fulfil"]').first().click();
    await page.waitForTimeout(500);
    await page.locator('button[data-state="commerce-receive"]').first().click();
    await page.waitForTimeout(600);
    await page.locator('button[data-state="commerce-raise-exception"]').first().click();

    const raised = page.getByText(/Raise exception: ded-/).first();
    await expect(raised).toBeVisible({ timeout: 8000 });
    const deductionId = ((await raised.innerText()).match(/ded-[a-z0-9-]+/i) ?? [])[0];
    expect(deductionId).toBeTruthy();

    await page.locator('button[data-state="commerce-open-dispute"]').first().click();
    await expect(page.getByText(/Open dispute: ded-/).first()).toBeVisible({ timeout: 8000 });
    // The brand may evidence the dispute but never resolve it.
    await expect(page.locator('button[data-state="commerce-resolve-dispute"]')).toHaveCount(0);
    await expect(
      page.locator('[data-state="commerce-dispute-awaiting-operations"]').first()
    ).toBeVisible();

    // 2. Switch to the operator WITHOUT reloading the document — the in-memory
    //    demo state must persist across the role change.
    await page.click('[aria-controls="profile-menu"]');
    await page.getByRole('menuitem', { name: 'Sign Out' }).click();
    await page.waitForTimeout(700);
    await page.getByRole('button', { name: 'Partner Login' }).first().click();
    await page.waitForTimeout(700);
    await page.click('text=Mercenta Admin Hub');
    await page.waitForTimeout(1100);
    await page.click('nav[aria-label="Primary"] >> text=Retail Pipeline');
    await page.waitForTimeout(900);
    await expect(page.getByRole('heading', { name: 'Retail Pipeline' })).toBeVisible({ timeout: 8000 });

    // 3. The operator resolves THAT deduction (scoped to its own id).
    const disputeScope = page.locator(`[data-deduction="${deductionId}"]`);
    const resolveWon = disputeScope.locator('button[data-state="commerce-operator-resolve-won"]');
    await expect(disputeScope).toBeVisible({ timeout: 8000 });
    await expect(resolveWon).toBeEnabled();
    await resolveWon.click();

    // The operator decision is the recorded canonical outcome, and the surface
    // reports it from the domain's own returned record (the panel's notice is
    // built from the domain result: `<id> — <status> · outcome <outcome>`).
    await expect(
      page
        .getByText(
          new RegExp(`Resolve dispute \\(won\\): ${deductionId} — resolved · outcome won`)
        )
        .first()
    ).toBeVisible({ timeout: 8000 });
    // THAT deduction no longer offers an operator resolution control.
    await expect(disputeScope).toHaveCount(0);

    expect(pageErrors).toEqual([]);
    expect(externalCalls).toEqual([]);
  });

  test('3. tenant isolation — another tenant sees none of the operational records', async ({ page }) => {
    const externalCalls = watchExternalCalls(page);
    const pageErrors: string[] = [];
    page.on('pageerror', (e) => pageErrors.push(String(e)));

    // Le Creuset is NOT cleared and owns no operational data.
    await openBrandPurchaseOrders(page, 'Le Creuset');

    // No other tenant's PO, shipment, invoice, payment or exception leaks in.
    await expect(page.getByText('PO-SIM-BRAND-ASTONISH').first()).toHaveCount(0);
    await expect(page.getByText('Operational activity trail')).toHaveCount(0);
    await expect(page.getByText('No catalog products')).toHaveCount(1);
    // …and it cannot enter the simulation (no eligible product ⇒ control disabled).
    await expect(page.locator('button[data-state="commerce-raise-po"]').first()).toBeDisabled();

    expect(pageErrors).toEqual([]);
    expect(externalCalls).toEqual([]);
  });

  test('4. admin sees the operational commerce state; foreign + view-only actors are refused IN THE DOMAIN', async ({ page }) => {
    const externalCalls = watchExternalCalls(page);
    const pageErrors: string[] = [];
    page.on('pageerror', (e) => pageErrors.push(String(e)));

    await loginAs(page, 'Mercenta Admin Hub', 1100);
    await page.click('nav[aria-label="Primary"] >> text=Retail Pipeline');
    await page.waitForTimeout(900);
    await expect(page.getByRole('heading', { name: 'Retail Pipeline' })).toBeVisible({ timeout: 8000 });

    // The admin operational commerce surface is present and labelled as simulation.
    await expect(page.getByText('Operational commerce').first()).toBeVisible({ timeout: 6000 });
    await expect(page.getByText('Simulated invoices').first()).toBeVisible({ timeout: 6000 });
    await expect(page.getByText('Simulated payments').first()).toBeVisible({ timeout: 6000 });
    await expect(page.getByText('Exceptions / chargebacks').first()).toBeVisible({ timeout: 6000 });

    /**
     * DOMAIN-level proof (not merely hidden UI): call the real domain API with a
     * FOREIGN tenant actor and with a VIEW-ONLY actor, against an operational PO
     * this application graph actually owns. Both must be refused, and a refusal
     * must not mutate the PO's status.
     */
    const proof = await page.evaluate(async () => {
      const mod = await import('/src/lib/commerce/commerceLifecycle.ts');
      const store = await import('/src/data/demoStore.ts');
      const api = await import('/src/data/api.ts');

      const zambeziActor = { staffId: 'brand:brand-astonish', canMutate: true, tenantId: 'brand-astonish' };
      let po = store.demoPurchaseOrders.find((p) => p.brandId === 'brand-astonish' && p.simulated === true);
      if (!po) {
        const seed = store.productsForBrandFromStore('brand-astonish')[0];
        if (!seed) return { skipped: true };
        const created = await mod.createCommercePurchaseOrder('brand-astonish', seed.sku, 5, zambeziActor);
        po = created.ok ? created.value : undefined;
      }
      if (!po) return { skipped: true };

      const foreignActor = { staffId: 'brand:brand-tapatio', canMutate: true, tenantId: 'brand-tapatio' };
      const viewOnlyActor = { staffId: 'staff-005', canMutate: false, tenantId: 'brand-astonish' };

      const statusBefore = api.fetchPurchaseOrder(po.id).status;
      const foreignAck = mod.acknowledgeCommercePurchaseOrder(po.id, foreignActor);
      const viewOnlyAck = mod.acknowledgeCommercePurchaseOrder(po.id, viewOnlyActor);
      const foreignRead = mod.listBrandCommerceActivity('brand-astonish', foreignActor);
      const statusAfter = api.fetchPurchaseOrder(po.id).status;

      return {
        skipped: false,
        foreignAckOk: foreignAck.ok,
        foreignAckError: String(foreignAck.error ?? ''),
        viewOnlyAckOk: viewOnlyAck.ok,
        viewOnlyAckError: String(viewOnlyAck.error ?? ''),
        foreignReadOk: foreignRead.ok,
        statusBefore,
        statusAfter,
      };
    });

    expect(proof.skipped).toBe(false);
    expect(proof.foreignAckOk).toBe(false);
    expect(proof.foreignAckError).toContain('CROSS_TENANT');
    expect(proof.viewOnlyAckOk).toBe(false);
    expect(proof.viewOnlyAckError).toContain('FORBIDDEN');
    expect(proof.foreignReadOk).toBe(false);
    // A refusal MUST NOT mutate state.
    expect(proof.statusAfter).toBe(proof.statusBefore);

    expect(pageErrors).toEqual([]);
    expect(externalCalls).toEqual([]);
  });
});
