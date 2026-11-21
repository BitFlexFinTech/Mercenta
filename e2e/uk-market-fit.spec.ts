/**
 * §Phase 1 — EXPLORE UK MARKET FIT / PRE-AUDIT browser verification.
 *
 * Proves in a real Chromium that the pre-audit is genuinely wired into the
 * product end to end:
 *
 *   1. the public homepage carries the primary CTA "Explore UK Market Fit", and
 *      Partner Login is a SEPARATE header utility action (never beside it)
 *   2. the CTA opens the assessment and the four progressive steps render
 *   3. required-field validation blocks an incomplete submission, naming the
 *      fields it needs
 *   4. a complete submission runs the research step, produces the UK Opportunity
 *      Snapshot with the EIGHT sections and the THREE separate indicators, and
 *      labels the research as SIMULATED (never presented as live)
 *   5. no prohibited promise appears in the rendered result, and the honest
 *      disclaimer is shown
 *   6. the result states what it could not establish
 *   7. a re-run is deterministic (reset/repeatability)
 *   8. the RENDERED result publishes no red-line claim (the patterns read from
 *      `src/config/positioning.ts` §11), takes the shell theme, and publishes
 *      neither the operator's readiness string nor the research vendors (B6)
 *   9. a Super Admin sees the assessment in the Control Centre and can feed a
 *      qualified one into the canonical acquisition pipeline — which creates a
 *      PROSPECT, never a brand tenant
 *  10. RBAC: a brand session never reaches the Control Centre
 *  11. the whole run makes ZERO external network calls, and no page errors occur
 *
 * Dev server started by playwright.config.ts (npm run dev, :5182).
 */
import { test, expect, type Page } from '@playwright/test';
import { loginAs } from './helpers/auth';
import { PUBLIC_CLAIM_RED_LINES } from '../src/config/positioning';

/**
 * §B6 (2026-09-29) — THE RED LINES, READ FROM THEIR OWNER.
 *
 * `src/config/positioning.ts` §11 is the single declaration of what a public
 * surface may never say. It is IMPORTED, never retyped here: a second copy of the
 * rule would keep passing while the owner changed.
 */
const RED_LINES = PUBLIC_CLAIM_RED_LINES.flatMap((family) =>
  family.patterns.map((source) => ({ family: family.id, re: new RegExp(source, 'i') }))
);

const SHOTS = 'test-screenshots/uk-market-fit';

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

/** Fill the minimum required identity and move to the products step. */
async function completeIdentity(page: Page, brand = 'Fixture Brand Beta') {
  await page.getByTestId('ukmf-brand-name').fill(brand);
  await page.getByTestId('ukmf-website').fill('https://fixture-brand.example.com');
  await page.getByTestId('ukmf-country').selectOption('Germany');
  await page.getByTestId('ukmf-category').selectOption('Home');
  await page.getByTestId('uk-market-fit-next').click();
  await expect(page.getByTestId('uk-market-fit-step-products')).toBeVisible();
}

/** Fill everything the research cannot establish, then run the assessment. */
async function supplyEverything(page: Page) {
  await page.getByTestId('ukmf-product-name').fill('Fixture Storage Basket');
  await page.getByTestId('ukmf-identifiers').fill('B0FIXTURE1, 5012345678900');
  await page.getByTestId('ukmf-origin').fill('Germany');
  await page.getByTestId('ukmf-lead-time').fill('21');
  await page.getByTestId('ukmf-moq').fill('300');
  await page.getByTestId('ukmf-case-pack').fill('6');
  await page.getByTestId('ukmf-wholesale-cost').fill('8');
  await page.getByTestId('ukmf-retail-price').fill('15');
  await page.getByTestId('ukmf-docs').fill('Declaration of conformity, Test report');
}

/** Run a complete assessment and wait for the result. */
async function runAssessment(page: Page, brand = 'Fixture Brand Beta') {
  await page.goto('/explore-uk-market-fit');
  await completeIdentity(page, brand);
  await supplyEverything(page);
  await page.getByTestId('uk-market-fit-submit').click();
  await expect(page.getByTestId('uk-market-fit-result')).toBeVisible({ timeout: 15000 });
}

test.describe('Explore UK Market Fit — public assessment', () => {
  test('1. the homepage carries the primary CTA and Partner Login stays a header utility action', async ({ page }) => {
    const pageErrors = watchForPageErrors(page);
    await page.goto('/');
    /**
     * §BRAND REDESIGN (2026-11-19) — the approved designs render the SAME CTA in
     * two places by design: once in the hero and once in the closing section. That
     * is the approved composition, so the assertion is scoped to the HERO rather
     * than pretending only one exists. A duplicate test id is not a defect here;
     * the defect would be the hero losing its CTA, which this still catches.
     */
    const heroCta = page.getByTestId('home-hero').getByTestId('explore-uk-market-fit-cta');
    await expect(heroCta).toBeVisible({ timeout: 10000 });
    await expect(heroCta).toHaveText(/Explore UK Market Fit/);
    /**
     * The header utility action exists and is the ONLY Partner Login IN THE HEADER.
     *
     * §BRAND REDESIGN (2026-11-19) — the approved designs also render a secondary
     * "Partner Login" action inside the hero (`homepage-partner-login`), which is
     * part of the approved composition, not a competing sibling. The original
     * assertion counted every button on the page and so failed as soon as the
     * hero's secondary action was added. The invariant that matters — the header
     * carries exactly one utility action — is asserted by scoping to the header.
     */
    await expect(page.getByTestId('public-header-partner-login')).toBeVisible();
    await expect(
      page.getByRole('navigation', { name: 'Main' }).getByRole('button', { name: 'Partner Login' })
    ).toHaveCount(1);
    // The two are not competing siblings inside the hero CTA row.
    await expect(heroCta).not.toHaveText(/Partner Login/);
    await page.screenshot({ path: `${SHOTS}/01-homepage-cta.png`, fullPage: false });
    expect(pageErrors, pageErrors.join(' | ')).toEqual([]);
  });

  test('2. the CTA opens the assessment and the four progressive steps render', async ({ page }) => {
    const pageErrors = watchForPageErrors(page);
    await page.goto('/');
    /* §BRAND REDESIGN (2026-11-19) — the CTA renders in the hero AND the closing
       section by design; the hero's is the first in document order. */
    await page.getByTestId('explore-uk-market-fit-cta').first().click();
    await expect(page.getByTestId('uk-market-fit-surface')).toBeVisible({ timeout: 10000 });
    await expect(page.getByTestId('uk-market-fit-step-identity')).toBeVisible();
    await expect(page.getByTestId('uk-market-fit-steps').locator('li')).toHaveCount(4);
    // Direct URL access resolves to the same page.
    await page.goto('/explore-uk-market-fit');
    await expect(page.getByTestId('uk-market-fit-step-identity')).toBeVisible({ timeout: 10000 });
    await page.screenshot({ path: `${SHOTS}/02-identity-step.png`, fullPage: false });
    expect(pageErrors, pageErrors.join(' | ')).toEqual([]);
  });

  test('3. required validation blocks an incomplete submission and names the fields', async ({ page }) => {
    const pageErrors = watchForPageErrors(page);
    await page.goto('/explore-uk-market-fit');
    await page.getByTestId('uk-market-fit-next').click();
    await expect(page.getByTestId('uk-market-fit-step-identity')).toBeVisible();
    await expect(page.getByText('A brand name is required to start research.')).toBeVisible();
    await expect(page.getByText(/website address is required/)).toBeVisible();
    await expect(page.getByText('The country you trade from is required.')).toBeVisible();
    await expect(page.getByText('A product category is required.')).toBeVisible();
    expect(pageErrors, pageErrors.join(' | ')).toEqual([]);
  });

  test('4. progressive collection reaches the result with 8 sections, 3 indicators and a simulation label', async ({ page }) => {
    const external = watchForExternalCalls(page);
    const pageErrors = watchForPageErrors(page);
    await runAssessment(page);

    for (const id of ['catalogue_eligibility', 'commercial_opportunity', 'supply_viability']) {
      await expect(page.getByTestId(`uk-indicator-${id}`)).toBeVisible();
    }
    for (const id of [
      'uk_market_presence', 'product_opportunity', 'market_evidence', 'commercial_considerations',
      'supply_considerations', 'product_readiness', 'open_questions', 'recommended_next_step',
    ]) {
      await expect(page.getByTestId(`uk-snapshot-${id}`)).toBeVisible();
    }
    await expect(page.getByTestId('uk-market-fit-simulation-badge')).toHaveText(/Simulated research/i);
    await expect(page.getByTestId('uk-market-fit-qualification')).toBeVisible();
    await page.screenshot({ path: `${SHOTS}/03-result.png`, fullPage: true });
    expect(pageErrors, pageErrors.join(' | ')).toEqual([]);
    expect(external, external.join(' | ')).toEqual([]);
  });

  test('5. the result carries no prohibited promise and shows the honest disclaimer', async ({ page }) => {
    const pageErrors = watchForPageErrors(page);
    await runAssessment(page);
    const body = (await page.getByTestId('uk-market-fit-step-result').innerText()).toLowerCase();
    for (const banned of ['guaranteed purchase order', 'guaranteed sales', 'guaranteed demand', 'approved by']) {
      expect(body, `result must not contain "${banned}"`).not.toContain(banned);
    }
    expect(body).toContain('not a promise of');
    /**
     * §B6 (2026-09-29) — REPOINTED, not weakened. The disclaimer's denial used to
     * read "nothing here is an endorsement, a partnership or an approval", and
     * `partnership` is a red-line pattern (family 7) — a mechanical scan of the
     * RENDERED page cannot tell a denial from a claim, so the sentence cannot use
     * a banned term even to refuse it. The denial is preserved: nothing here
     * CREATES A RELATIONSHIP, an endorsement or an approval.
     */
    expect(body).toContain('nothing here creates a relationship');
    /**
     * The result must STATE what it does not know rather than hide it. Which
     * unknown appears depends on what was supplied, so the assertion is that at
     * least one explicit unknown statement is rendered.
     */
    expect(body).toMatch(/has not been reviewed or verified|have not been applied|could not be established/);
    expect(pageErrors, pageErrors.join(' | ')).toEqual([]);
  });

  test('6. the result offers ONE next step and an audited review request', async ({ page }) => {
    const pageErrors = watchForPageErrors(page);
    await runAssessment(page);
    await page.getByTestId('ukmf-review-email').fill('buyer@fixture-brand.example.com');
    await page.getByTestId('uk-market-fit-request-review').click();
    await expect(page.getByText(/Review requested/)).toBeVisible();
    await expect(page.getByText(/still a prospect/)).toBeVisible();
    await page.screenshot({ path: `${SHOTS}/04-review-requested.png`, fullPage: false });
    expect(pageErrors, pageErrors.join(' | ')).toEqual([]);
  });

  test('7. a re-run produces the same deterministic result (reset/repeatability)', async ({ page }) => {
    const pageErrors = watchForPageErrors(page);
    await runAssessment(page);
    const first = await page.getByTestId('uk-market-fit-qualification').innerText();
    await page.getByTestId('uk-market-fit-restart').click();
    await expect(page.getByTestId('uk-market-fit-step-identity')).toBeVisible();
    await completeIdentity(page);
    await supplyEverything(page);
    await page.getByTestId('uk-market-fit-submit').click();
    await expect(page.getByTestId('uk-market-fit-result')).toBeVisible({ timeout: 15000 });
    const second = await page.getByTestId('uk-market-fit-qualification').innerText();
    expect(second).toBe(first);
    expect(pageErrors, pageErrors.join(' | ')).toEqual([]);
  });

  test('8. the rendered result publishes no red-line claim (read from its owner) and no internal plumbing', async ({ page }) => {
    const pageErrors = watchForPageErrors(page);
    /**
     * §B6 (2026-09-29) — THE RESULT'S PUBLIC COPY IS COMPOSED BY THE ENGINE, so a
     * red-line claim can reach the page without any component changing. Measured
     * before this gate existed, on the rendered result: SIX hits —
     * `customs clearance`, `gross spread`, `net margin`, `Marketplace API`,
     * `acknowledgement` and `partnership`. All six were fixed at source.
     *
     * The patterns are READ from `src/config/positioning.ts` §11 (never retyped),
     * and the visitor supplies the figures that reach the COST and LEAD-TIME
     * branches — the branches that published two of the six — because a branch that
     * is not exercised is a branch that is not gated.
     *
     * It also asserts the leak that was NOT a red-line pattern: the operator's
     * readiness string and the research vendors (`firecrawl`, `keepa`,
     * `amazon_sp_api`, `companies_house`), which the page rendered verbatim.
     */
    await page.addInitScript(() => {
      try {
        /* §BRAND REDESIGN (2026-11-19) — the approved LIGHT appearance. The retired
           `minimal-light` id is rejected by `isThemeId()`, so setting it would have
           silently fallen back to the default and the light-shell assertion would
           have been measuring the dark shell. */
        window.localStorage.setItem('mercenta.theme', 'brand-light');
      } catch {
        /* private mode — the default shell applies and the assertion below says so. */
      }
    });
    await page.setViewportSize({ width: 390, height: 844 });
    await runAssessment(page);

    /** The PAGE takes the light shell (it hardcoded the dark palette until B6). */
    const shell = await page.evaluate(() => {
      let n: HTMLElement | null = document.querySelector('main');
      while (n && !n.hasAttribute('data-shell-theme')) n = n.parentElement;
      return n ? n.getAttribute('data-shell-theme') : null;
    });
    expect(shell, 'the assessment page must take the shell it was given').toBe('light');

    const body = await page.locator('body').innerText();
    const hits = RED_LINES.filter((r) => r.re.test(body)).map(
      (r) => `${r.family}:${r.re.source} :: ${r.re.exec(body)?.[0]}`
    );
    expect(hits, `red-line claims rendered on the assessment result:\n${hits.join('\n')}`).toEqual([]);

    expect(body, 'the operator readiness string and the research vendors must not be published')
      .not.toMatch(/firecrawl|keepa|amazon_sp_api|companies_house/i);
    expect(body, 'the internal research provider id must not be published').not.toContain('preaudit-mock-research');
    await page.screenshot({ path: `${SHOTS}/06-result-light-shell.png`, fullPage: true });
    expect(pageErrors, pageErrors.join(' | ')).toEqual([]);
  });
});

test.describe('Explore UK Market Fit — founder visibility, acquisition feed and RBAC', () => {
  test('9. a Super Admin sees the assessment and can feed a qualified one into acquisition', async ({ page }) => {
    const pageErrors = watchForPageErrors(page);
    // 1. Run the public assessment.
    await runAssessment(page, 'Fixture Brand Delta');
    const qualification = await page.getByTestId('uk-market-fit-qualification').innerText();
    expect(qualification).toMatch(/Qualified/i);

    /*
     * 2. Enter as Super Admin WITHOUT a page reload.
     *
     * This is deliberate, not a shortcut: the pre-audit store is an in-memory
     * domain store and its documented behaviour is that a full page reload
     * re-boots deterministically (nothing is claimed to be persisted in the demo
     * environment). Reloading here would therefore destroy the very record under
     * test. The in-app environment switch (the header Partner Login → demo card)
     * is the real user path and keeps the canonical state intact.
     */
    await page.getByTestId('public-header-partner-login').click();
    await page.click('text=Super Admin — Tadii');
    await page.getByTestId('dashboard-loaded').waitFor({ timeout: 12000 });
    await page.locator('nav[aria-label="Primary"]').locator('text=Control Centre').first().click();
    await expect(page.getByRole('heading', { name: 'Control Centre' })).toBeVisible({ timeout: 8000 });
    await page.getByRole('tab', { name: 'Acquisition' }).click();
    await expect(page.getByText('Explore UK Market Fit', { exact: false }).first()).toBeVisible();

    // 3. Feed the qualified assessment into the canonical acquisition pipeline.
    const row = page.locator('[data-testid^="control-preaudit-row-"]').first();
    await expect(row).toBeVisible();
    await row.getByRole('button', { name: 'Feed to acquisition' }).click();
    await expect(page.getByTestId('control-preaudit-notice')).toBeVisible({ timeout: 8000 });
    const notice = await page.getByTestId('control-preaudit-notice').innerText();
    expect(notice).toMatch(/not a brand tenant/i);
    await page.screenshot({ path: `${SHOTS}/05-control-centre-preaudit.png`, fullPage: false });
    expect(pageErrors, pageErrors.join(' | ')).toEqual([]);
  });

  test('10. RBAC: a brand session never reaches the Control Centre', async ({ page }) => {
    const pageErrors = watchForPageErrors(page);
    await loginAs(page, 'Tapatío', 1500);
    await page.waitForTimeout(800);
    const nav = page.locator('nav[aria-label="Primary"]');
    await expect(nav.locator('text=Control Centre')).toHaveCount(0);
    await expect(page.locator('body')).not.toContainText('Explore UK Market Fit —');
    expect(pageErrors, pageErrors.join(' | ')).toEqual([]);
  });
});

