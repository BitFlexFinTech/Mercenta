/**
 * §Sprint 2 — DETERMINISTIC PLATFORM COMPLETION — END-TO-END BROWSER JOURNEY.
 *
 * This spec exists because a passing unit validator is NOT a substitute for
 * actually driving the platform. It walks the real application in Chromium:
 *
 *   A. THE INVESTOR JOURNEY (13 steps, one continuous session):
 *      1 brand onboarding · 2 catalogue/product · 3 compliance · 4 product ready
 *      · 5 operational ready · 6 Amazon-style PO · 7 acknowledgement
 *      · 8 fulfilment · 9 shipment/delivery · 10 finance/invoice
 *      · 11 payment/reconciliation · 12 Brand Success (own attention set)
 *      · 13 Super Admin platform oversight
 *      with the CANONICAL WORK LAYER asserted at the finance boundary: issuing an
 *      invoice RAISES an `invoice_due` work item; settling the payment RESOLVES it.
 *
 *   B. THE EXCEPTION JOURNEY: exception occurs → work item appears → notification
 *      appears → action performed by the operator → state changes → the work item
 *      (and its reminder) is gone → the resolution is in the audit log.
 *
 *   C. RESET + REPEATABILITY: the deterministic baseline is restored and a
 *      re-run of the same journey produces the same starting state.
 *
 *   D. TENANT / RBAC: a brand never sees another tenant's records, and no
 *      external provider is contacted anywhere in the whole journey.
 *
 * The app is in-memory by design, so each test starts from a fresh document.
 */
import { test, expect } from '@playwright/test';
import { loginAs } from './helpers/auth';

const SHOTS = 'test-screenshots/deterministic-journey';

/** External provider calls that are NOT our own dev server — must stay empty. */
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

function escapeRegex(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

async function openView(page: import('@playwright/test').Page, label: string): Promise<void> {
  /* Target the item's own LABEL span (an item may also render a badge, so the
     button's accessible name is not guaranteed to be exactly the label), then
     assert the nav contract marked it active — proof the navigation happened,
     rather than guessing at page copy that legitimately differs per surface. */
  const nav = page.locator('nav[aria-label="Primary"]:visible').first();
  const labelEl = nav
    .locator('span')
    .filter({ hasText: new RegExp(`^${escapeRegex(label)}$`) })
    .first();
  await labelEl.click();
  await expect(labelEl.locator('xpath=ancestor::button[1]')).toHaveAttribute('data-state', 'active', {
    timeout: 6000,
  });
  await page.waitForTimeout(450);
}

async function openBrandView(page: import('@playwright/test').Page, label: string): Promise<void> {
  await openView(page, label);
}

async function openAdminView(page: import('@playwright/test').Page, label: string): Promise<void> {
  await openView(page, label);
}

/** Sign out and log in as another demo card WITHOUT reloading the document. */
async function switchTo(page: import('@playwright/test').Page, card: string): Promise<void> {
  await page.click('[aria-controls="profile-menu"]');
  await page.getByRole('menuitem', { name: 'Sign Out' }).click();
  await page.waitForTimeout(700);
  await page.getByRole('button', { name: 'Partner Login' }).first().click();
  await page.waitForTimeout(700);
  await page.click(`text=${card}`);
  await page.waitForTimeout(1200);
}

/** Drive the simulated operational lifecycle up to (but not including) invoice. */
async function driveToDelivered(page: import('@playwright/test').Page): Promise<void> {
  await page.locator('button[data-state="commerce-raise-po"]').first().click();
  await expect(page.getByText(/Raise simulated PO: PO-SIM-BRAND-ASTONISH/).first()).toBeVisible({ timeout: 8000 });
  await page.locator('button[data-state="commerce-acknowledge"]').first().click();
  await expect(page.getByText(/Acknowledge: PO-SIM-BRAND-ASTONISH/).first()).toBeVisible({ timeout: 8000 });
  await page.locator('button[data-state="commerce-fulfil"]').first().click();
  await expect(page.getByText(/Fulfil: shipment-/).first()).toBeVisible({ timeout: 8000 });
  await page.locator('button[data-state="commerce-receive"]').first().click();
  /* §S9 — REPOINTED (the old contract recorded): the receipt now RAISES the
     invoice, so arriving at "delivered" is also the arrival of the invoice. */
  await expect(page.getByText(/Receive: PO delivered.*SIM-INV-/).first()).toBeVisible({ timeout: 8000 });
}

/* ══════════════════════════════════════════════════════════════════════════
   A. THE INVESTOR JOURNEY
   ══════════════════════════════════════════════════════════════════════════ */

test.describe('A. Deterministic investor journey — brand → channel → finance → oversight', () => {
  // The full 13-step journey is one continuous session — allow it real time.
  test.describe.configure({ timeout: 120_000 });
  test('1. the complete 13-step journey is re-driven in Chromium', async ({ page }) => {
    const externalCalls = watchExternalCalls(page);
    const pageErrors: string[] = [];
    page.on('pageerror', (e) => pageErrors.push(String(e)));

    /* ── 1. Brand onboarding ────────────────────────────────────────────── */
    await loginAs(page, 'Astonish', 1200);
    await page.getByTestId('brand-dashboard-loaded').waitFor({ state: 'attached', timeout: 12000 });
    await openBrandView(page, 'Onboarding & Legal');
    await page.screenshot({ path: `${SHOTS}/01-onboarding.png`, fullPage: false });

    /* ── 2. Catalogue / product ─────────────────────────────────────────── */
    await openBrandView(page, 'Product Catalog');

    /* ── 3. Compliance ──────────────────────────────────────────────────── */
    await openBrandView(page, 'UK Compliance');

    /* ── 4 + 5. Product ready → operational ready (PO eligibility) ──────── */
    await openBrandView(page, 'Purchase Orders');
    await expect(page.getByText('Eligible for the commerce simulation').first()).toBeVisible({ timeout: 8000 });

    /* ── 6. Amazon-style PO ─────────────────────────────────────────────── */
    await page.locator('button[data-state="commerce-raise-po"]').first().click();
    await expect(page.getByText(/Raise simulated PO: PO-SIM-BRAND-ASTONISH/).first()).toBeVisible({ timeout: 8000 });

    /* ── 7. PO acknowledgement ──────────────────────────────────────────── */
    await page.locator('button[data-state="commerce-acknowledge"]').first().click();
    await expect(page.getByText(/Acknowledge: PO-SIM-BRAND-ASTONISH/).first()).toBeVisible({ timeout: 8000 });

    /* ── 8. Fulfilment ──────────────────────────────────────────────────── */
    await page.locator('button[data-state="commerce-fulfil"]').first().click();
    await expect(page.getByText(/Fulfil: shipment-/).first()).toBeVisible({ timeout: 8000 });

    /* ── 9. Shipment / delivery — and the invoice the receipt raises (§S9) ── */
    await page.locator('button[data-state="commerce-receive"]').first().click();
    /* §S9 — REPOINTED (the old contract recorded): the invoice used to need a
       separate "Issue invoice" click after receipt; the RECEIPT now raises it. */
    await expect(page.getByText(/Receive: PO delivered.*SIM-INV-/).first()).toBeVisible({ timeout: 8000 });
    await page.screenshot({ path: `${SHOTS}/09-delivered.png`, fullPage: false });

    /* ── 10. Finance / invoice ──────────────────────────────────────────── */

    /* The canonical operating layer must now hold an INVOICE DUE work item for
       this brand — derived from the real invoice, not invented. */
    await openBrandView(page, 'Tasks & Deadlines');
    await expect(page.getByTestId('work-metric-open-value')).toBeVisible({ timeout: 8000 });
    await expect(page.getByTestId('work-primary')).toContainText('Invoice due', { timeout: 8000 });
    await expect(page.getByTestId('work-primary')).toContainText('SIM-INV-PO-SIM-BRAND-ASTONISH');

    /* The deterministic reminder runner is explicitly invokable and idempotent:
       the first sweep raises, the second raises nothing. */
    await page.getByTestId('work-run-reminders').click();
    await expect(page.getByTestId('work-sweep-report')).toBeVisible({ timeout: 6000 });
    const firstRaised = Number(await page.getByTestId('work-sweep-report').getAttribute('data-sweep-raised'));
    await page.getByTestId('work-run-reminders').click();
    await expect(page.getByTestId('work-sweep-report')).toHaveAttribute('data-sweep-raised', '0');
    expect(firstRaised).toBeGreaterThan(0);
    await page.screenshot({ path: `${SHOTS}/10-invoice-due-work.png`, fullPage: false });


    /* ── 11. Payment / reconciliation ───────────────────────────────────── */
    await openBrandView(page, 'Purchase Orders');
    await page.locator('button[data-state="commerce-record-payment"]').first().click();
    await expect(page.getByText(/Record simulated payment: £/).first()).toBeVisible({ timeout: 8000 });

    /* Settling the payment RESOLVES the derived work item — the reminder stops. */
    await openBrandView(page, 'Tasks & Deadlines');
    await expect(page.getByTestId('work-primary')).not.toContainText('Invoice due', { timeout: 8000 });

    /* ── 12. Brand Success — the brand's OWN attention set ──────────────── */
    await expect(page.getByTestId('work-metric-attention-value')).toBeVisible();
    await expect(page.getByTestId('work-metric-reminders')).toBeVisible();
    /* Tenant isolation of the attention set: no other tenant's PO appears. */
    await expect(page.getByTestId('work-primary')).not.toContainText('PO-SIM-BRAND-TAPATIO');

    /* ── 13. Super Admin platform oversight ─────────────────────────────── */
    await switchTo(page, 'Super Admin — Tadii');
    await page.getByTestId('dashboard-loaded').waitFor({ timeout: 12000 });

    await openAdminView(page, 'Work Management');
    await expect(page.getByTestId('work-metric-open-value')).toBeVisible({ timeout: 8000 });
    /* Platform oversight: the admin queue carries EVERY tenant's work, including
       the seeded POs of two different brands. */
    await expect(page.getByTestId('work-primary')).toContainText('PO-9001');
    /**
     * §P13 / S3 — REPOINTED. OLD CONTRACT: this asserted `PO-9003`, which the work
     * layer used to present as acknowledgement work. PO-9003's status is
     * `accepted` — PAST the acknowledgement decision — so it owes no
     * acknowledgement: presenting it as acknowledgement work was the
     * founder-reported defect class (PO-9201 / PO-9211 arrived as "Acknowledge
     * PO-…" 41 days past their deadline), and S3 removed it at source by making
     * `deriveWorkItems` ask the window owner. The cross-tenant claim is therefore
     * asserted on `PO-9002` — Tapatío's seeded OPEN PO, which the owner genuinely
     * has in its queue — so this still proves the admin queue spans two tenants'
     * real work, in both directions.
     */
    await expect(page.getByTestId('work-primary')).toContainText('PO-9002');
    await expect(page.getByTestId('work-primary')).not.toContainText('Acknowledge PO-9003');

    await openAdminView(page, 'Logistics Hub');
    await expect(page.getByTestId('logistics-metric-in-transit')).toBeVisible({ timeout: 8000 });
    /* The logistics surface is wired to the SAME operating layer (its context
       rail lists the acknowledgement / window / exception items), and its empty
       state is honest when no shipment is in a transit state. */
    await expect(page.locator('main')).toContainText('Operational work');
    await expect(page.locator('main')).toContainText('PO acknowledgement');

    await openAdminView(page, 'Super Admin');
    await expect(page.getByTestId('sa-metric-work')).toBeVisible({ timeout: 8000 });
    await page.getByTestId('super-admin-tab-accounting').click();
    await page.waitForTimeout(700);
    await expect(page.getByTestId('accounting-metric-work')).toBeVisible({ timeout: 8000 });
    await expect(page.locator('main')).toContainText('Finance work items');
    await page.screenshot({ path: `${SHOTS}/13-super-admin-oversight.png`, fullPage: false });

    /* Nothing leaked, nothing external, no crash anywhere in the journey. */
    expect(pageErrors).toEqual([]);
    expect(externalCalls).toEqual([]);
  });
});


/* ══════════════════════════════════════════════════════════════════════════
   B. THE EXCEPTION JOURNEY
   ══════════════════════════════════════════════════════════════════════════ */

test.describe('B. Deterministic exception journey — occur → work → act → resolve → audit', () => {
  test.describe.configure({ timeout: 120_000 });
  test('2. an exception becomes actionable work and its resolution stops the reminder', async ({ page }) => {
    const externalCalls = watchExternalCalls(page);
    const pageErrors: string[] = [];
    page.on('pageerror', (e) => pageErrors.push(String(e)));

    /* 1. The exception occurs (the brand drives the lifecycle and raises it). */
    await loginAs(page, 'Astonish', 1200);
    await openBrandView(page, 'Purchase Orders');
    await driveToDelivered(page);
    await page.locator('button[data-state="commerce-raise-exception"]').first().click();
    const raised = page.getByText(/Raise exception: ded-/).first();
    await expect(raised).toBeVisible({ timeout: 8000 });
    const deductionId = ((await raised.innerText()).match(/ded-[a-z0-9-]+/i) ?? [])[0];
    expect(deductionId).toBeTruthy();

    /* The brand evidences the dispute — a brand may open and evidence one, but
       never declare its own outcome (resolution is a Mercenta decision). */
    await page.locator('button[data-state="commerce-open-dispute"]').first().click();
    await expect(page.getByText(/Open dispute: ded-/).first()).toBeVisible({ timeout: 8000 });
    await expect(page.locator('button[data-state="commerce-resolve-dispute"]')).toHaveCount(0);
    await expect(page.locator('[data-state="commerce-dispute-awaiting-operations"]').first()).toBeVisible();

    /* 2 + 3. The work item appears in the canonical operating layer. */
    await openBrandView(page, 'Tasks & Deadlines');
    await expect(page.getByTestId('work-primary')).toContainText('Deduction dispute', { timeout: 8000 });

    /* 4. The notification projection carries it too. */
    await page.locator('[data-testid="notification-center"]').click();
    await expect(page.getByTestId('notification-list')).toBeVisible({ timeout: 6000 });
    await expect(page.getByTestId('notification-list')).toContainText('Deduction');
    await page.keyboard.press('Escape');
    await page.waitForTimeout(300);

    /* 5. The action exists: the row opens the shared record drawer. */
    const disputeRow = page.locator('[data-testid^="work-row-work-deduction_dispute-"]').first();
    await expect(disputeRow).toBeVisible({ timeout: 6000 });
    await disputeRow.locator('button').first().click();
    await expect(page.getByTestId('work-record-drawer')).toBeVisible({ timeout: 6000 });
    await page.screenshot({ path: `${SHOTS}/B-exception-work-drawer.png`, fullPage: false });
    await page.keyboard.press('Escape');
    await page.waitForTimeout(300);

    /* 6. The operator performs the real action in the canonical destination. */
    await switchTo(page, 'Super Admin — Tadii');
    await page.getByTestId('dashboard-loaded').waitFor({ timeout: 12000 });
    await openAdminView(page, 'Retail Pipeline');

    const disputeScope = page.locator(`[data-deduction="${deductionId}"]`);
    await expect(disputeScope).toBeVisible({ timeout: 8000 });
    await disputeScope.locator('button[data-state="commerce-operator-resolve-won"]').click();
    await expect(
      page.getByText(new RegExp(`Resolve dispute \\(won\\): ${deductionId} — resolved · outcome won`)).first()
    ).toBeVisible({ timeout: 8000 });

    /* 7 + 8. State changed and the reminder STOPPED: the derived work item is
       gone from the platform's work queue. */
    await openAdminView(page, 'Work Management');
    await expect(page.getByTestId('work-metric-open-value')).toBeVisible({ timeout: 8000 });
    await expect(
      page.locator(`[data-testid="work-row-work-deduction_dispute-${deductionId}"]`)
    ).toHaveCount(0, { timeout: 8000 });

    /* 9 + 10. The resolution is recorded in the audit trail. */
    await openAdminView(page, 'Audit Log');
    await expect(page.locator('main')).toContainText(deductionId, { timeout: 8000 });

    expect(pageErrors).toEqual([]);
    expect(externalCalls).toEqual([]);
  });
});


/* ══════════════════════════════════════════════════════════════════════════
   C. RESET + DETERMINISTIC REPEATABILITY
   ══════════════════════════════════════════════════════════════════════════ */

test.describe('C. Deterministic reset and repeatability', () => {
  test.describe.configure({ timeout: 90_000 });
  test('3. reset restores the baseline and a re-run reproduces it exactly', async ({ page }) => {
    await loginAs(page, 'Super Admin — Tadii', 1200);
    await page.getByTestId('dashboard-loaded').waitFor({ timeout: 12000 });
    await openAdminView(page, 'Work Management');
    await expect(page.getByTestId('work-metric-open-value')).toBeVisible({ timeout: 8000 });

    const baselineOpen = Number(await page.getByTestId('work-metric-open-value').innerText());
    const baselineAttention = Number(await page.getByTestId('work-metric-attention-value').innerText());
    expect(baselineOpen).toBeGreaterThan(0);

    /* Run the reminder sweep, then reset — the ledger and the work overrides clear. */
    await page.getByTestId('work-run-reminders').click();
    await expect(page.getByTestId('work-sweep-report')).toBeVisible({ timeout: 6000 });
    await page.getByTestId('work-reset').click();
    await page.waitForTimeout(400);

    /* The reset also clears the reminder ledger: a fresh sweep raises again. */
    await page.getByTestId('work-run-reminders').click();
    await expect(page.getByTestId('work-sweep-report')).toBeVisible({ timeout: 6000 });
    const afterResetRaised = Number(
      await page.getByTestId('work-sweep-report').getAttribute('data-sweep-raised')
    );
    expect(afterResetRaised).toBeGreaterThan(0);

    /* Re-drive the same journey in the same session: identical starting state. */
    await switchTo(page, 'Super Admin — Tadii');
    await page.getByTestId('dashboard-loaded').waitFor({ timeout: 12000 });
    await openAdminView(page, 'Work Management');
    await expect(page.getByTestId('work-metric-open-value')).toBeVisible({ timeout: 8000 });

    expect(Number(await page.getByTestId('work-metric-open-value').innerText())).toBe(baselineOpen);
    expect(Number(await page.getByTestId('work-metric-attention-value').innerText())).toBe(baselineAttention);
  });
});

/* ══════════════════════════════════════════════════════════════════════════
   D. TENANT ISOLATION + RBAC
   ══════════════════════════════════════════════════════════════════════════ */

test.describe('D. Tenant isolation and RBAC', () => {
  test.describe.configure({ timeout: 90_000 });
  test('4. Brand A sees only Brand A; Brand B sees none of it; Super Admin sees the platform', async ({ page }) => {
    const externalCalls = watchExternalCalls(page);

    /* Brand A creates real operational state. */
    await loginAs(page, 'Astonish', 1200);
    await openBrandView(page, 'Purchase Orders');
    await driveToDelivered(page);
    /* §S9 — REPOINTED (the old contract recorded): the receipt inside
       `driveToDelivered` already raised the invoice, so the separate
       "Issue invoice" click is gone and the work item below is derived from the
       invoice the automation produced. */
    await expect(page.getByText(/Receive: PO delivered.*SIM-INV-/).first()).toBeVisible({ timeout: 8000 });

    await openBrandView(page, 'Tasks & Deadlines');
    await expect(page.getByTestId('work-primary')).toContainText('Invoice due', { timeout: 8000 });

    /* Brand B (Tapatío) must see NONE of Brand A's records or work. */
    await switchTo(page, 'Tapatío');
    await openBrandView(page, 'Tasks & Deadlines');
    await expect(page.getByTestId('work-metric-open-value')).toBeVisible({ timeout: 8000 });
    await expect(page.getByTestId('work-primary')).not.toContainText('PO-SIM-BRAND-ASTONISH');
    await expect(page.getByTestId('work-primary')).not.toContainText('SIM-INV-PO-SIM-BRAND-ASTONISH');
    await expect(page.getByTestId('work-primary')).not.toContainText('Invoice due');

    /* Super Admin sees the platform-wide set (which DOES include Brand A's item). */
    await switchTo(page, 'Super Admin — Tadii');
    await page.getByTestId('dashboard-loaded').waitFor({ timeout: 12000 });
    await openAdminView(page, 'Work Management');
    await expect(page.getByTestId('work-primary')).toContainText('SIM-INV-PO-SIM-BRAND-ASTONISH', { timeout: 8000 });

    /* RBAC: a brand session never reaches the platform-only workspaces. */
    await switchTo(page, 'Astonish');
    await expect(page.locator('nav[aria-label="Primary"]').getByText('Integration Settings')).toHaveCount(0);
    await expect(page.locator('nav[aria-label="Primary"]').getByText('Brand CRM')).toHaveCount(0);
    await expect(page.locator('nav[aria-label="Primary"]').getByText('Super Admin')).toHaveCount(0);

    expect(externalCalls).toEqual([]);
  });
});

/* ══════════════════════════════════════════════════════════════════════════
   E. THE onboarding_step DERIVATION, LIVE IN THE BROWSER
   ══════════════════════════════════════════════════════════════════════════ */

test.describe('E. onboarding_step derivation is live in the operating layer', () => {
  test.describe.configure({ timeout: 120_000 });

  test('5. beginning an onboarding raises its work item; completing the step advances it', async ({ page }) => {
    const externalCalls = watchExternalCalls(page);
    const pageErrors: string[] = [];
    page.on('pageerror', (e) => pageErrors.push(String(e)));

    await loginAs(page, 'Super Admin — Tadii', 1200);
    await page.getByTestId('dashboard-loaded').waitFor({ timeout: 12000 });

    /* Drive the canonical acquisition workflow to a QUALIFIED opportunity. */
    await openAdminView(page, 'Brand Intelligence');
    await page.locator('[data-testid="bi-prospect-table"] tbody tr', { hasText: 'Tapatío' }).first().click();
    await page.waitForTimeout(400);
    await page.locator('button:has-text("Outreach")').first().click();
    await page.waitForTimeout(400);
    await expect(page.locator('[data-section="acquisition-workflow"]')).toBeVisible({ timeout: 6000 });
    await page.locator('button[data-state="prepare"]').first().click();
    await expect(page.locator('[data-revision]').first()).toContainText('pending_approval', { timeout: 8000 });
    await page.locator('button[data-state="approve"]').first().click();
    await expect(page.locator('[data-revision]').first()).toContainText('approved', { timeout: 8000 });
    await page.locator('button[data-state="send"]').first().click();
    await expect(page.locator('[data-revision]').first()).toContainText('sent', { timeout: 8000 });
    await page.locator('button[data-state="simulate-response"]').first().click();
    await expect(page.locator('[data-section="responses"]')).toContainText('[SIMULATED REPLY', { timeout: 8000 });
    await page.locator('button[data-state="create-opportunity"]').first().click();
    await expect(page.locator('[data-section="opportunity"]')).toContainText('opp-prospect-tapatio', { timeout: 8000 });

    /* BEGIN the onboarding — the real canonical hand-off. */
    const start = page.locator('button[data-state="start-onboarding"]').first();
    await expect(start).toBeEnabled({ timeout: 8000 });
    await start.click();
    await expect(page.locator('[data-notice="ok"]').first()).toContainText('Onboarding started', { timeout: 8000 });
    await page.keyboard.press('Escape');
    await page.waitForTimeout(300);

    /* The derived work item now exists — pointing at the FIRST incomplete step. */
    await openAdminView(page, 'Work Management');
    await expect(page.getByTestId('work-metric-open-value')).toBeVisible({ timeout: 8000 });
    await expect(page.getByTestId('work-primary')).toContainText('Onboarding step', { timeout: 8000 });
    await expect(page.getByTestId('work-primary')).toContainText('Onboarding — Brand profile');
    await page.screenshot({ path: `${SHOTS}/E-onboarding-step-work.png`, fullPage: false });

    /* Completing the step ADVANCES the derivation to the next canonical step. */
    await openAdminView(page, 'Brand Intelligence');
    await page.locator('[data-testid="bi-prospect-table"] tbody tr', { hasText: 'Tapatío' }).first().click();
    await page.waitForTimeout(400);
    await page.locator('button:has-text("Outreach")').first().click();
    await page.waitForTimeout(400);
    await page.locator('[data-onboarding-step="profile"] [data-state="complete-step"]').first().click();
    await expect(page.locator('[data-onboarding-step="profile"]')).toContainText('done', { timeout: 8000 });
    await page.keyboard.press('Escape');
    await page.waitForTimeout(300);

    await openAdminView(page, 'Work Management');
    await expect(page.getByTestId('work-primary')).toContainText('Onboarding — Legal agreements', { timeout: 8000 });
    await expect(page.getByTestId('work-primary')).not.toContainText('Onboarding — Brand profile');

    expect(pageErrors).toEqual([]);
    expect(externalCalls).toEqual([]);
  });
});
