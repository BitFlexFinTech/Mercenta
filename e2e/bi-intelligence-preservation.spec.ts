/**
 * §Phase D2 — BI intelligence preservation through acquisition (browser gate).
 *
 * Proves through the running application that a canonical Brand Intelligence
 * prospect's FULL intelligence survives into the acquisition layer and is
 * readable there by reference — not reduced to a generic lead:
 *
 *   1. Brand Intelligence → Tapatío → Outreach renders the canonical ASIN table
 *      (real ASINs/metrics), the canonical contact, the evidence count and all
 *      seven BI score factors.
 *   2. The rendered intelligence is internally consistent: the ASIN row count
 *      equals the declared count, and the seven factors reconcile to the BI total.
 *   3. Preparing a recommendation USES the real BI ASIN intelligence in the
 *      generated copy (real ASIN IDs + the real ASIN count), i.e. preparation
 *      consumes BI, it does not substitute generic lead fields.
 *   4. The SAME canonical record backs both surfaces: the ASIN shown by the BI
 *      prospect's own Amazon tab also appears in the acquisition intelligence
 *      view, which names the canonical `prospectId`. No page errors.
 *
 * The domain-level proof (identity continuity, ASIN/contact/evidence integrity,
 * provenance, by-reference mutation visibility, no second intelligence store,
 * RBAC, zero network) lives in
 * `scripts/validate-bi-intelligence-preservation.mjs`.
 */
import { test, expect } from '@playwright/test';
import { loginAs } from './helpers/auth';

const SCRATCH = 'test-screenshots/bi-intelligence';

async function openOutreach(page: import('@playwright/test').Page, brand: string) {
  await loginAs(page, 'Super Admin — Tadii', 1200);
  await page.locator('nav[aria-label="Primary"] button:has-text("Brand Intelligence")').first().click();
  await page.waitForTimeout(800);
  await page.fill('input[placeholder="Search..."]', brand);
  await page.waitForTimeout(400);
  await page.locator('table tbody tr').first().click();
  await page.waitForTimeout(600);
  await page.locator('button:has-text("Outreach")').first().click();
  await page.waitForTimeout(600);
  await expect(page.locator('[data-section="intelligence"]').first()).toBeVisible({ timeout: 6000 });
}

test.describe('Phase D2 — BI intelligence preservation through acquisition', () => {
  test('1. canonical BI intelligence is rendered in the acquisition workflow', async ({ page }) => {
    await openOutreach(page, 'Tapatío');
    const intel = page.locator('[data-section="intelligence"]').first();

    // Real canonical counts + the canonical (re-scored) BI score. The BI store
    // scores every seed through the real engine at boot, so the canonical total
    // is 68/tier_4 (the raw seed literal was pre-scoring) — asserted as observed.
    await expect(intel).toHaveAttribute('data-asin-count', '2');
    await expect(intel).toHaveAttribute('data-contact-count', '1');
    await expect(intel).toHaveAttribute('data-score-total', '68');
    await expect(intel).toHaveAttribute('data-score-tier', 'tier_4');
    await expect(intel).toHaveAttribute('data-growth-signal-count', '1');
    await expect(intel).toHaveAttribute('data-distributor-count', '0');
    await expect(intel).toHaveAttribute('data-restriction-count', '0');
    // Evidence is held and reported (prospect + nested ASIN/wholesale/contact evidence).
    const evidenceCount = Number(await intel.getAttribute('data-evidence-count'));
    expect(evidenceCount).toBe(8);

    // The canonical ASINs, with their metrics — not a generic lead field.
    await expect(intel.locator('[data-asin="B0HOT01"]')).toBeVisible();
    await expect(intel.locator('[data-asin="B0HOT02"]')).toBeVisible();
    await expect(intel.locator('[data-asin="B0HOT01"]')).toContainText('#1250');

    // The canonical contact (name + title) — never fabricated.
    await expect(intel.locator('[data-section="intelligence-contacts"]')).toContainText('Sherry Zhang');
    await expect(intel.locator('[data-section="intelligence-contacts"]')).toContainText('VP International Sales');
    await expect(intel.locator('[data-section="intelligence-contacts"]')).toContainText('unverified');

    // Provenance: canonical surfaces + evidence sources.
    await expect(intel.locator('[data-section="intelligence-provenance"]')).toContainText('runs 1');
    await expect(intel.locator('[data-section="intelligence-provenance"]')).toContainText('Amazon UK');

    // The view names the canonical record it read from.
    await expect(intel).toContainText('by reference · prospect-tapatio');
    await page.screenshot({ path: `${SCRATCH}/intelligence-tapatio.png`, fullPage: true });
  });
  test('2. rendered intelligence is internally consistent with the canonical record', async ({ page }) => {
    await openOutreach(page, 'Tapatío');
    const intel = page.locator('[data-section="intelligence"]').first();

    // ASIN rows rendered === declared ASIN count.
    const declared = Number(await intel.getAttribute('data-asin-count'));
    await expect(intel.locator('[data-section="intelligence-asins"] tbody tr')).toHaveCount(declared);

    // All seven BI score factors are present and reconcile to the BI total.
    const factors = intel.locator('[data-score-factor]');
    await expect(factors).toHaveCount(7);
    const factorValues = (await factors.allInnerTexts()).map((t) => Number(t.replace(/[^0-9]/g, '')));
    const total = Number(await intel.getAttribute('data-score-total'));
    expect(factorValues.reduce((a, b) => a + b, 0)).toBe(total);

    // The BI panel header shows the SAME total as the intelligence view.
    await expect(page.locator('span', { hasText: `${total}/100` }).first()).toBeVisible();
  });

  test('3. outreach preparation consumes the real BI ASIN intelligence', async ({ page }) => {
    await openOutreach(page, 'Tapatío');
    await page.locator('button[data-state="prepare"]').first().click();
    await expect(page.locator('[data-notice="ok"]').first()).toBeVisible({ timeout: 6000 });

    // The generated recommendation embeds the canonical ASIN intelligence: the
    // real ASIN count, the aggregated estimated revenue, the top ASIN's title,
    // BSR and seller count — proof that preparation reads BI, not a mock lead.
    const body = page.locator('textarea').first();
    await expect(body).toHaveValue(/2 ASINs/);
    await expect(body).toHaveValue(/~£73k\/mo/);
    await expect(body).toHaveValue(/Tapatío Hot Sauce 12oz \(3-Pack\)/);
    await expect(body).toHaveValue(/BSR #1250/);
    await expect(body).toHaveValue(/8 sellers/);

    // The stored revision is traceable to the BI intelligence it was prepared against.
    await expect(page.locator('[data-section="recommendation"]')).toContainText('revision 1');
    await expect(page.locator('[data-section="intelligence"]').first())
      .toContainText('by reference · prospect-tapatio');
  });

  test('4. one canonical record backs both the BI panel and the acquisition view', async ({ page }) => {
    const pageErrors: string[] = [];
    page.on('pageerror', (e) => pageErrors.push(e.message));

    await loginAs(page, 'Super Admin — Tadii', 1200);
    await page.locator('nav[aria-label="Primary"] button:has-text("Brand Intelligence")').first().click();
    await page.waitForTimeout(800);
    await page.fill('input[placeholder="Search..."]', 'Tapatío');
    await page.waitForTimeout(400);
    await page.locator('table tbody tr').first().click();
    await page.waitForTimeout(600);

    // BI's own Amazon tab shows the canonical ASIN data (title + metrics; the
    // tab renders titles rather than raw ASIN ids)…
    await page.locator('button:has-text("Amazon")').first().click();
    await page.waitForTimeout(500);
    await expect(page.locator('text=Tapatío Hot Sauce 12oz (3-Pack)').first()).toBeVisible({ timeout: 6000 });
    await expect(page.locator('text=BSR #1250').first()).toBeVisible({ timeout: 6000 });

    // …and the acquisition view reads the SAME canonical ASINs + identity.
    await page.locator('button:has-text("Outreach")').first().click();
    await page.waitForTimeout(600);
    const intel = page.locator('[data-section="intelligence"]').first();
    await expect(intel.locator('[data-asin="B0HOT01"]')).toBeVisible({ timeout: 6000 });
    await expect(intel.locator('[data-asin="B0HOT01"]')).toContainText('Tapatío Hot Sauce 12oz (3-Pack)');
    await expect(intel.locator('[data-asin="B0HOT01"]')).toContainText('#1250');
    await expect(intel).toContainText('Nothing is copied into a second intelligence store');

    expect(pageErrors).toEqual([]);
  });
});
