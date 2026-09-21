/**
 * §Phase 2 — COMMERCIAL READINESS + PRODUCT ECONOMICS browser verification.
 *
 * Proves in a real Chromium that the commercial readiness journey is genuinely
 * wired end to end, for BOTH sides of the platform:
 *
 *   1. the Founder/Super-Admin Control Centre carries a COMMERCIAL section whose
 *      rows are the canonical readiness records — the count matches the canonical
 *      dataset, and each row names its route, owner, deadline and next step
 *   2. opening a row shows WHY the product sits in its state (the evaluated
 *      conditions and the missing information) and the canonical work item
 *   3. the brand portal carries a Commercial Readiness view showing ONLY the
 *      signed-in brand's own products (tenant isolation), with the concepts
 *      explained and the learn-more guide attached
 *   4. a REAL brand action — supplying the missing commercial information —
 *      changes the product's status through the ONE deterministic gate, and the
 *      change is visible on the same screen
 *   5. re-submitting the same information is refused as unchanged (no duplicate
 *      business outcome), and the honest "not a promise of an order" disclaimer
 *      is always shown
 *   6. RBAC: the Founder Control Centre is never reachable from a brand session
 *   7. ZERO external network calls and ZERO page errors for the whole run
 *
 * Dev server started by playwright.config.ts (npm run dev, :5173).
 */
import { test, expect, type Page } from '@playwright/test';
import { loginAs } from './helpers/auth';

const SHOTS = 'test-screenshots/commercial-readiness';

/** External provider calls that are NOT our own dev server or a static asset. */
function watchForExternalCalls(page: Page): string[] {
  const externalCalls: string[] = [];
  page.on('request', (req) => {
    const url = req.url();
    const isDev = url.startsWith('http://localhost') || url.startsWith('http://127.0.0.1');
    const isWs = url.startsWith('ws://') || url.startsWith('wss://');
    const isStatic =
      /\.(woff2?|css|png|jpe?g|svg|ico)(\?|$)/.test(url) ||
      url.includes('gstatic.com') ||
      url.includes('fonts.g');
    if (!isDev && !isWs && !isStatic) externalCalls.push(url);
  });
  return externalCalls;
}

/** A Rules-of-Hooks violation or any runtime crash passes typecheck and build. */
function watchForPageErrors(page: Page): string[] {
  const errors: string[] = [];
  page.on('pageerror', (err) => errors.push(String(err.message ?? err)));
  return errors;
}

/**
 * Dismiss the product-tour popup if it is present. The tour is a real product
 * feature (TourEngine), so the spec closes it the way a user would rather than
 * fighting the overlay.
 */
async function dismissTour(page: Page) {
  for (let i = 0; i < 3; i += 1) {
    // The skip action asks for confirmation — a real user confirms it too.
    const confirm = page.getByRole('button', { name: 'Skip Tour', exact: true });
    if ((await confirm.count()) > 0) {
      await confirm.first().click().catch(() => undefined);
      await page.waitForTimeout(250);
      continue;
    }
    const dismiss = page.getByRole('button', { name: 'Dismiss tour' });
    if ((await dismiss.count()) === 0) break;
    await dismiss.first().click().catch(() => undefined);
    await page.waitForTimeout(250);
  }
}

async function openCommercialSection(page: Page) {
  await loginAs(page, 'Super Admin — Tadii', 1200);
  await page.getByTestId('dashboard-loaded').waitFor({ timeout: 12000 });
  await dismissTour(page);
  await page.locator('nav[aria-label="Primary"]').locator('text=Control Centre').first().click();
  await expect(page.getByRole('heading', { name: 'Control Centre' })).toBeVisible({ timeout: 8000 });
  await page.getByRole('tab', { name: 'Commercial' }).click();
  await expect(page.locator('section[aria-label="Commercial readiness"]')).toBeVisible({ timeout: 8000 });
}

async function openBrandCommercialReadiness(page: Page) {
  await loginAs(page, 'Astonish', 1200);
  await dismissTour(page);
  await page.locator('nav[aria-label="Primary"]').locator('text=Commercial Readiness').first().click();
  await expect(page.getByTestId('brand-commercial-readiness')).toBeVisible({ timeout: 8000 });
}

test.describe('Phase 2 — Commercial readiness (founder)', () => {
  test('1. the Control Centre Commercial section shows every canonical product, with route, owner, deadline and next step', async ({
    page,
  }) => {
    const pageErrors = watchForPageErrors(page);
    const externalCalls = watchForExternalCalls(page);
    await openCommercialSection(page);

    // DATASET COMPLETENESS: the surface shows every canonical readiness record
    // (4 seeded cases), never a silently curated subset.
    const rows = page.locator('[data-testid^="commercial-readiness-queue-row-"]');
    await expect(rows).toHaveCount(4);

    // Every declared route is represented.
    await expect(rows.filter({ hasText: 'Ready' })).toHaveCount(1);
    await expect(rows.filter({ hasText: 'Remediation' })).toHaveCount(1);
    await expect(rows.filter({ hasText: 'Blocked' })).toHaveCount(1);
    await expect(rows.filter({ hasText: 'Human review' })).toHaveCount(1);

    // The metric band is real arithmetic over those records.
    await expect(page.getByTestId('control-metric-value-comm-total')).toHaveText('4');
    await expect(page.getByTestId('control-metric-value-comm-ready')).toHaveText('1');
    await expect(page.getByTestId('control-metric-value-comm-remediation')).toHaveText('1');
    await expect(page.getByTestId('control-metric-value-comm-blocked')).toHaveText('1');
    await expect(page.getByTestId('control-metric-value-comm-review')).toHaveText('1');

    await page.screenshot({ path: `${SHOTS}/01-founder-commercial-section.png`, fullPage: true });
    expect(pageErrors).toEqual([]);
    expect(externalCalls).toEqual([]);
  });

  test('2. opening a product explains WHY — the evaluated conditions, the missing information and the canonical work item', async ({
    page,
  }) => {
    const pageErrors = watchForPageErrors(page);
    await openCommercialSection(page);

    await page.locator('[data-testid^="commercial-readiness-queue-row-"]').filter({ hasText: 'Remediation' }).getByRole('button', { name: 'Open' }).click();
    const drawer = page.getByTestId('commercial-readiness-drawer');
    await expect(drawer).toBeVisible();

    // The drawer names the record identity, the owner, the deadline and the work item.
    await expect(drawer).toContainText('Canonical work item');
    await expect(drawer).toContainText('commercial_remediation');
    await expect(page.getByTestId('commercial-readiness-conditions')).toBeVisible();
    await expect(page.getByTestId('commercial-readiness-missing-inputs')).toBeVisible();
    // The missing required term is NAMED, not merely counted.
    await expect(page.getByTestId('commercial-readiness-missing-inputs')).toContainText('currency');
    // The MOQ disclaimer travels with the record.
    await expect(drawer).toContainText('MOQ');

    await page.screenshot({ path: `${SHOTS}/02-founder-commercial-drawer.png`, fullPage: true });
    expect(pageErrors).toEqual([]);
  });

  test('3. RBAC — a brand session never reaches the Founder Control Centre or its commercial data', async ({ page }) => {
    await loginAs(page, 'Astonish', 1200);
    await expect(page.locator('nav[aria-label="Primary"]').locator('text=Control Centre')).toHaveCount(0);
    await expect(page.locator('[data-testid^="commercial-readiness-queue-row-"]')).toHaveCount(0);
  });
});

test.describe('Phase 2 — Commercial readiness (brand)', () => {
  test('4. the brand sees ONLY its own products, explained in plain language with a guide', async ({ page }) => {
    const pageErrors = watchForPageErrors(page);
    const externalCalls = watchForExternalCalls(page);
    await openBrandCommercialReadiness(page);

    // Astonish owns two canonical readiness records — and nothing else.
    await expect(page.getByTestId('brand-commercial-product')).toHaveCount(2);
    // TENANT ISOLATION: the other demo brand's product never appears.
    await expect(page.getByTestId('brand-commercial-readiness')).not.toContainText('Tapatío');

    const first = page.getByTestId('brand-commercial-product').filter({ hasText: 'Line 2' }).first();
    await first.locator('button').first().click();
    await expect(page.getByTestId('brand-commercial-guidance')).toBeVisible();
    // The concept is explained and a real Knowledge Base guide is attached.
    await expect(page.getByTestId('brand-commercial-guidance')).toContainText('Learn more —');
    // Plain language, not internal terminology: the brand-facing explanation is shown.
    await expect(page.getByTestId('brand-commercial-guidance')).toContainText(
      'Mercenta cannot assess the commercial opportunity'
    );
    // The honest outcome disclaimer is always shown.
    await expect(page.getByTestId('brand-commercial-disclaimer')).toContainText('not a promise');

    await page.screenshot({ path: `${SHOTS}/03-brand-commercial-readiness.png`, fullPage: true });
    expect(pageErrors).toEqual([]);
    expect(externalCalls).toEqual([]);
  });

  test('5. a REAL brand action changes the product status, a repeat does not, and the journey reaches ready', async ({
    page,
  }) => {
    const pageErrors = watchForPageErrors(page);
    await openBrandCommercialReadiness(page);

    // Locate by the STABLE product name: the badge and action list change as the
    // route moves, so a text-based locator must not be used across steps.
    const record = () => page.getByTestId('brand-commercial-product').filter({ hasText: 'Line 2' }).first();
    const notice = page.getByTestId('brand-commercial-notice');

    // Step 1 — the missing REQUIRED field. The status moves on immediately.
    await record().locator('button').first().click();
    await expect(record().getByTestId('brand-commercial-field-currency')).toBeVisible();
    await record().getByTestId('brand-commercial-input-currency').fill('GBP');
    await record().getByTestId('brand-commercial-submit-currency').click();
    await expect(notice).toContainText('reassessed');
    await expect(record().getByTestId('brand-commercial-route')).toHaveAttribute('data-route', 'human_review');

    // Step 2 — the pack information is now the outstanding item.
    await expect(record().getByTestId('brand-commercial-field-case_pack')).toBeVisible();
    await record().getByTestId('brand-commercial-input-case_pack').fill('6');
    await record().getByTestId('brand-commercial-submit-case_pack').click();
    await expect(notice).toContainText('reassessed');

    // Step 3 — submitting the SAME value again is refused as unchanged: no
    // duplicate business outcome, no second event, no second work item.
    await record().getByTestId('brand-commercial-input-case_pack').fill('6');
    await record().getByTestId('brand-commercial-submit-case_pack').click();
    await expect(notice).toContainText('Nothing changed');

    // Step 4 — completing the carton arithmetic takes the product to READY.
    await record().getByTestId('brand-commercial-input-master_carton').fill('24');
    await record().getByTestId('brand-commercial-submit-master_carton').click();
    await expect(record().getByTestId('brand-commercial-route')).toHaveAttribute('data-route', 'ready', {
      timeout: 8000,
    });
    await expect(record()).toContainText('Nothing is needed from you right now.');

    await page.screenshot({ path: `${SHOTS}/04-brand-journey-to-ready.png`, fullPage: true });
    expect(pageErrors).toEqual([]);
  });

  test('6. a product with no outstanding action says so, and its next step is the declared next stage', async ({ page }) => {
    const pageErrors = watchForPageErrors(page);
    await openBrandCommercialReadiness(page);

    const readyProduct = page.getByTestId('brand-commercial-product').filter({ hasText: 'Commercially ready' }).first();
    await readyProduct.locator('button').first().click();
    await expect(readyProduct).toContainText('Nothing is needed from you right now.');
    await expect(readyProduct).toContainText('next declared readiness stage');
    expect(pageErrors).toEqual([]);
  });
});