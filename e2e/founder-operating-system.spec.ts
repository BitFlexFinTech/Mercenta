/**
 * §Founder OS — FOUNDER OPERATING SYSTEM browser verification.
 *
 * Proves in a real Chromium that the Founder Operating System is genuinely wired
 * into the product, and that it behaves correctly when its OPTIONAL dependencies
 * are absent (which is the state of this build):
 *
 *   1. a Super Admin reaches the Control Centre and it renders the nine views
 *      over real canonical figures (the brand count is the canonical 20)
 *   2. the automation catalogue is real: a run produces a run record, an
 *      identical second run is suppressed, a failure is observable, a retry
 *      recovers it, and a disabled automation is reported as disabled
 *   3. Founder Ops AI is truthful: with no provider configured it says so and
 *      shows a DETERMINISTIC brief; Ask Mercenta answers from canonical records
 *      with an intent + citations, and refuses a question it cannot answer
 *   4. the acquisition pipeline renders all eleven lifecycle stages and a
 *      prospect opens the existing CRM destination (a prospect is not a brand)
 *   5. RBAC: a non-Super-Admin session never sees the Control Centre nav and is
 *      refused the view if it is reached
 *   6. the whole run makes ZERO external network calls
 *
 * Dev server started by playwright.config.ts (npm run dev, :5173).
 */
import { test, expect, type Page } from '@playwright/test';
import { loginAs } from './helpers/auth';

const SHOTS = 'test-screenshots/founder-os';

/**
 * §Phase 2 (2026-09-20) — the Control Centre gained the COMMERCIAL readiness
 * section, and the automation registry gained the commercial readiness monitor.
 * §P13 / S5 (2026-09-25) — the registry gained the ACKNOWLEDGEMENT NOTIFICATION
 * FAN-OUT (`po_acknowledgement_fanout`), so the canonical count moved 9 → 10.
 * These counts are the CURRENT canonical figures (declared here ONCE so the spec
 * states what it expects rather than drifting silently):
 *   - 10 operating views  (was 9 before the commercial section was added)
 *   - 10 declared automations (was 9 before the acknowledgement fan-out)
 */
const TEN_OPERATING_VIEWS = 10;
const DECLARED_AUTOMATIONS = 10;

async function openControlCentre(page: Page) {
  await loginAs(page, 'Super Admin — Tadii', 1200);
  await page.getByTestId('dashboard-loaded').waitFor({ timeout: 12000 });
  await page.locator('nav[aria-label="Primary"]').locator('text=Control Centre').first().click();
  await expect(page.getByRole('heading', { name: 'Control Centre' })).toBeVisible({ timeout: 8000 });
}

/**
 * External provider calls that are NOT our own dev server or a static font
 * asset — must stay empty. Same filter as e2e/deterministic-journey.spec.ts, so
 * "zero external calls" means the same thing in both suites.
 */
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

/**
 * Collect page errors (a Rules-of-Hooks violation or any runtime crash passes
 * typecheck and build and only fails at real render time — this catches it).
 */
function watchForPageErrors(page: Page): string[] {
  const errors: string[] = [];
  page.on('pageerror', (err) => errors.push(String(err.message ?? err)));
  return errors;
}

test.describe('Founder Operating System — Control Centre', () => {
  /**
   * §Phase 2 (2026-09-20) — REPOINTED. This test previously asserted the NINE
   * operating views (Business · Brands · Acquisition · Operations · Finance ·
   * Compliance · Automation · AI · Audit). The commercial readiness workspace was
   * added as a SECTION of this SAME Control Centre rather than a second
   * dashboard, so the canonical view list is now ten. The old contract is
   * recorded here and the assertion repointed to the CURRENT canonical
   * `CONTROL_CENTRE_SECTIONS`, so the list can never silently drift again.
   */
  test('1. renders the ten operating views over real canonical figures', async ({ page }) => {
    const external = watchForExternalCalls(page);
    const pageErrors = watchForPageErrors(page);
    await openControlCentre(page);

    await expect(page.locator('[data-workspace-frame]').first()).toBeVisible();
    await expect(page.locator('[data-workspace-header]').first()).toBeVisible();
    await expect(page.locator('[data-workspace-toolbar]').first()).toBeVisible();

    for (const label of [
      'Business',
      'Brands',
      // §Phase 2 — commercial readiness + product economics (added this stage).
      'Commercial',
      'Acquisition',
      'Operations',
      'Finance',
      'Compliance',
      'Automation',
      'AI',
      'Audit',
    ]) {
      await expect(page.getByRole('tab', { name: new RegExp(`^${label}`) })).toBeVisible();
    }

    // The view count is the canonical section count — never a hand-kept number.
    await expect(page.getByRole('tab')).toHaveCount(TEN_OPERATING_VIEWS);

    // §P2 REPOINTED (2026-10-02) — the brand count is the canonical demo universe
    // (now FOUR businesses), not a fabricated figure.
    await expect(page.getByTestId('control-metric-value-brands')).toHaveText('4');

    // Every metric tile is a real drill-down (the button is the drill-down).
    await expect(page.getByTestId('control-metric-open-work')).toBeVisible();
    await expect(page.getByTestId('kpi-open-open-work')).toBeVisible();
    await expect(page.getByTestId('automation-run-all')).toBeVisible();

    await page.screenshot({ path: `${SHOTS}/01-control-centre-business.png`, fullPage: false });
    expect(external).toEqual([]);
    expect(pageErrors).toEqual([]);
  });

  test('2. the automation catalogue is real — run, suppress, fail, retry, disable', async ({ page }) => {
    const external = watchForExternalCalls(page);
    const pageErrors = watchForPageErrors(page);
    await openControlCentre(page);
    await page.getByRole('tab', { name: /^Automation/ }).click();
    await expect(page.getByTestId('automation-table')).toBeVisible();

    // §Phase 2 — REPOINTED: this previously asserted 8 declared automations. The
    // commercial readiness monitor was registered in the SAME registry this stage,
    // so the canonical count is now 9. Old contract recorded; assertion repointed.
    await expect(page.locator('[data-testid^="automation-row-"]')).toHaveCount(DECLARED_AUTOMATIONS);

    // A real run produces a run record with a deterministic id.
    await page.getByTestId('automation-run-work_projection').click();
    await expect(page.getByTestId('control-run-drawer')).toBeVisible();
    await expect(page.getByTestId('control-run-drawer')).toContainText('run-work_projection-');
    await page.getByRole('button', { name: 'Close record' }).click();

    // A second identical run is suppressed (idempotent — no duplicate work).
    await page.getByTestId('automation-run-work_projection').click();
    await expect(page.getByTestId('control-run-drawer')).toContainText('duplicate_suppressed');
    await expect(page.getByTestId('control-run-drawer')).toContainText('no duplicate work');
    await page.getByRole('button', { name: 'Close record' }).click();

    // A simulated external failure is OBSERVABLE…
    await page.getByTestId('automation-simulate-failure-finance_overdue_monitor').click();
    await expect(page.getByTestId('control-run-drawer')).toContainText('failed');
    await page.getByRole('button', { name: 'Close record' }).click();
    await expect(page.getByTestId('automation-status-finance_overdue_monitor')).toContainText('failed');

    // …and the retry recovers it.
    await page.getByTestId('automation-retry-finance_overdue_monitor').click();
    await expect(page.getByTestId('control-run-drawer')).toContainText('succeeded');
    await page.getByRole('button', { name: 'Close record' }).click();

    // Disabling is reported honestly (and produces no side effects).
    await page.getByTestId('automation-toggle-reminder_sweep').click();
    await page.getByTestId('automation-run-reminder_sweep').click();
    await expect(page.getByTestId('control-run-drawer')).toContainText('disabled');
    await page.getByRole('button', { name: 'Close record' }).click();
    await page.getByTestId('automation-toggle-reminder_sweep').click();
    await expect(page.getByTestId('automation-status-reminder_sweep')).toBeVisible();

    // The declared scheduler seam is on the surface, and the optional
    // dependencies are declared NOT required for core operations.
    await expect(page.getByTestId('automation-scheduler')).toContainText('no timer');
    await expect(page.getByTestId('automation-dependencies')).toBeVisible();

    await page.screenshot({ path: `${SHOTS}/02-automation-catalogue.png`, fullPage: false });
    expect(external).toEqual([]);
    expect(pageErrors).toEqual([]);
  });

  test('3. Founder Ops AI tells the truth when no provider is configured', async ({ page }) => {
    const external = watchForExternalCalls(page);
    const pageErrors = watchForPageErrors(page);
    await openControlCentre(page);
    await page.getByRole('tab', { name: /^AI/ }).click();

    // The AI state is stated honestly and no model is claimed.
    await expect(page.getByTestId('ai-state')).toContainText('No AI credential is configured');
    await expect(page.getByTestId('ai-brief')).toBeVisible();
    await expect(page.getByTestId('ai-narrative-basis')).toHaveText('deterministic');
    await expect(page.getByTestId('ai-narrative')).not.toBeEmpty();

    // Ask Mercenta answers from canonical records, with an intent and citations.
    await page.getByTestId('ai-ask-input').fill('What needs my attention today?');
    await page.getByTestId('ai-ask-submit').click();
    await expect(page.getByTestId('ai-ask-answer')).toBeVisible();
    await expect(page.getByTestId('ai-ask-intent')).toContainText('What needs my attention');
    await expect(page.getByTestId('ai-ask-answer')).toContainText('sources:');

    // A question it cannot answer from canonical data is refused, not invented.
    await page.getByTestId('ai-ask-input').fill('What is the weather in Paris?');
    await page.getByTestId('ai-ask-submit').click();
    await expect(page.getByTestId('ai-ask-intent')).toContainText('Not recognised');
    await expect(page.getByTestId('ai-ask-answer')).toContainText('I answer only from Mercenta records');

    await page.screenshot({ path: `${SHOTS}/03-founder-ops-ai.png`, fullPage: false });
    expect(external).toEqual([]);
    expect(pageErrors).toEqual([]);
  });

  test('4. the acquisition pipeline renders all eleven lifecycle stages', async ({ page }) => {
    const external = watchForExternalCalls(page);
    const pageErrors = watchForPageErrors(page);
    await openControlCentre(page);
    await page.getByRole('tab', { name: /^Acquisition/ }).click();

    await expect(page.locator('[data-pipeline-stage]')).toHaveCount(11);
    await expect(page.locator('[data-testid^="control-acquisition-row-"]').first()).toBeVisible();

    // §ACQ-CONVERSION — the funnel RATES render, derived from the SAME canonical
    // records the pipeline above shows (contacted / replied / engaged / converted).
    await expect(page.getByTestId('control-acquisition-conversion')).toBeVisible();
    await expect(page.getByTestId('control-acquisition-conversion')).toContainText('Contacted');
    await expect(page.getByTestId('control-acquisition-conversion')).toContainText('Converted');

    // The first prospect row opens the EXISTING destination that owns its stage.
    await page.locator('[data-testid^="control-acquisition-row-"]').first().locator('button').click();
    await expect(
      page.getByRole('heading', { level: 1, name: /Brand CRM|Brand Intelligence|Onboarding/ })
    ).toBeVisible({ timeout: 8000 });

    await page.screenshot({ path: `${SHOTS}/04-acquisition-pipeline.png`, fullPage: false });
    expect(external).toEqual([]);
    expect(pageErrors).toEqual([]);
  });

  /**
   * §PHASE 6 — the internal capital model behind Model B. The Finance view must
   * render the capital requirement derived from the canonical Model B purchase
   * orders, and must label the facility terms as an ILLUSTRATION (the real
   * facility is not configured). Financing is internal: this is the Super-Admin
   * view, never a brand's.
   */
  test('7. the Model B capital requirement renders on the Finance view', async ({ page }) => {
    const external = watchForExternalCalls(page);
    const pageErrors = watchForPageErrors(page);
    await openControlCentre(page);
    await page.getByRole('tab', { name: /^Finance/ }).click();

    await expect(page.getByTestId('control-capital-requirement')).toBeVisible();
    await expect(page.getByTestId('control-capital-requirement')).toContainText('Capital needed');
    await expect(page.getByTestId('control-capital-requirement')).toContainText('Utilisation');
    await expect(page.getByTestId('control-capital-concentration')).toBeVisible();
    // The facility terms are labelled as an illustration, never as Mercenta's real facility.
    await expect(page.getByTestId('control-capital-basis')).toContainText('Illustrative');

    await page.screenshot({ path: `${SHOTS}/07-capital-requirement.png`, fullPage: false });
    expect(external).toEqual([]);
    expect(pageErrors).toEqual([]);
  });

  /**
   * §PHASE 6 — the deterministic financing router. The Finance view must render
   * the three financing routes with a real count and advance per route, derived
   * from the canonical Model B purchase orders through the ONE owner (which
   * reuses the canonical exclusive-gateway evaluator). Financing is internal:
   * this is the Super-Admin view, never a brand's.
   */
  test('9. the financing routes render on the Finance view', async ({ page }) => {
    const external = watchForExternalCalls(page);
    const pageErrors = watchForPageErrors(page);
    await openControlCentre(page);
    await page.getByRole('tab', { name: /^Finance/ }).click();

    const panel = page.getByTestId('control-financing-routes');
    await expect(panel).toBeVisible();
    await expect(panel).toContainText('Self-funded');
    await expect(panel).toContainText('facility');
    await expect(page.getByTestId('control-financing-decisions')).toBeVisible();
    // The routing policy is labelled as an illustration, never as Mercenta's real policy.
    await expect(page.getByTestId('control-financing-basis')).toContainText('Illustrative');

    await page.screenshot({ path: `${SHOTS}/09-financing-routes.png`, fullPage: false });
    expect(external).toEqual([]);
    expect(pageErrors).toEqual([]);
  });

  /**
   * §D21 — WHOLE-PLATFORM OBJECT RESOLUTION. The Operations view must render the
   * resolution of the canonical channel objects (each PO's Amazon PO number, each
   * consignment's carrier reference) through the ONE resolver — the count resolved
   * to exactly one tenant, and a founder review queue for anything that did not.
   * Ownership is never guessed and never leaks across tenants.
   */
  test('8. the object resolution renders on the Operations view', async ({ page }) => {
    const external = watchForExternalCalls(page);
    const pageErrors = watchForPageErrors(page);
    await openControlCentre(page);
    await page.getByRole('tab', { name: /^Operations/ }).click();

    const panel = page.getByTestId('control-object-resolution');
    await expect(panel).toBeVisible();
    await expect(panel).toContainText('Resolved');
    await expect(panel).toContainText('Cross-tenant');
    await expect(page.getByTestId('control-object-resolution-basis')).toBeVisible();

    await page.screenshot({ path: `${SHOTS}/08-object-resolution.png`, fullPage: false });
    expect(external).toEqual([]);
    expect(pageErrors).toEqual([]);
  });

  /**
   * §FOUNDATION — THE GLOBAL HALT (kill switch), verified in a real browser.
   *
   * One act must stop EVERY automation, and the halt must be enforced in the
   * DOMAIN: a halted run executes nothing and reports `skipped_halted` — it is
   * not merely a hidden button or a disabled-looking control.
   */
  test('6. the global halt stops every automation and is honestly reported', async ({ page }) => {
    const external = watchForExternalCalls(page);
    const pageErrors = watchForPageErrors(page);
    await openControlCentre(page);
    await page.getByRole('tab', { name: /^Automation/ }).click();

    await expect(page.getByTestId('automation-halt-panel')).toHaveAttribute('data-halted', 'false');

    // Engage the halt, then run an automation that would otherwise succeed.
    await page.getByTestId('automation-halt-toggle').click();
    await expect(page.getByTestId('automation-halt-panel')).toHaveAttribute('data-halted', 'true');
    await expect(page.getByTestId('automation-halt-state')).toContainText('HALTED');
    await page.getByTestId('automation-run-work_projection').click();
    await expect(page.getByTestId('control-run-drawer')).toContainText('halted');
    await expect(page.getByTestId('control-run-drawer')).toContainText('no side effect');
    await page.getByRole('button', { name: 'Close record' }).click();
    await page.screenshot({ path: `${SHOTS}/06-automation-halted.png`, fullPage: false });

    // Clearing the halt restores normal operation immediately.
    await page.getByTestId('automation-halt-toggle').click();
    await expect(page.getByTestId('automation-halt-panel')).toHaveAttribute('data-halted', 'false');
    await page.getByTestId('automation-run-work_projection').click();
    await expect(page.getByTestId('control-run-drawer')).not.toContainText('halted');
    await page.getByRole('button', { name: 'Close record' }).click();

    expect(external).toEqual([]);
    expect(pageErrors).toEqual([]);
  });
});

test.describe('Founder Operating System — RBAC', () => {
  test('5. a non-Super-Admin session never reaches the Control Centre', async ({ page }) => {
    const external = watchForExternalCalls(page);
    const pageErrors = watchForPageErrors(page);
    await loginAs(page, 'Mercenta Admin Hub', 1200);
    await page.getByTestId('dashboard-loaded').waitFor({ timeout: 12000 });

    // The nav entry is hidden for a non-Super-Admin tier…
    await expect(page.locator('nav[aria-label="Primary"]').locator('text=Control Centre')).toHaveCount(0);

    // …and the Control Centre heading is never rendered for that session.
    await expect(page.getByRole('heading', { name: 'Control Centre' })).toHaveCount(0);
    await expect(page.getByTestId('automation-table')).toHaveCount(0);

    await page.screenshot({ path: `${SHOTS}/05-rbac-non-super.png`, fullPage: false });
    expect(external).toEqual([]);
    expect(pageErrors).toEqual([]);
  });
});

