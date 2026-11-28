#!/usr/bin/env node
/**
 * §PHASE D — THE CANONICAL TABLE CONTRACT, VERIFIED ON THE DEPLOYED SITE.
 *
 * WHY THIS EXISTS
 * ---------------
 * `scripts/validate-canonical-tables.mjs` proves from the SOURCE which tables carry the
 * canonical contract, and `e2e/canonical-tables.spec.ts` proves it renders LOCALLY. Neither
 * says anything about what the demo host actually serves — a build can be stale, a stylesheet
 * can be dropped, and the canonical step can fail to apply, all while source and local runs are
 * green. The owner asked for the work to be published and verified up to date, so the deployed
 * bundle is checked here, at the size the canonical step declares.
 *
 * It is a SEPARATE script because `verify-live-demo.mjs` already drives 30+ live flows; this one
 * answers one question and runs in about a minute, so it can be re-run after every publish.
 * `npm run verify:live` runs both in order.
 *
 * WHAT IT ASSERTS, on `demo.mercenta.co.uk`:
 *   L33  the TAM/SAM breakdown renders the canonical table (5 scoped headers, caption, 14px cells)
 *   L33b the brand guidance benchmark renders it (3 scoped headers, 14px cells, real rows) and
 *        the CSV import panel still opens from its real control.
 *
 * Run: node scripts/verify-live-canonical-tables.mjs   (or: npm run verify:live:tables)
 * Override the host: SITE_URL=https://… node scripts/verify-live-canonical-tables.mjs
 */
import { chromium } from 'playwright';

const SITE = process.env.SITE_URL || 'https://demo.mercenta.co.uk';

let pass = 0;
let fail = 0;
const failures = [];
function check(name, ok, detail = '') {
  if (ok) {
    pass++;
    console.log(`  PASS  ${name}`);
  } else {
    fail++;
    failures.push(name);
    console.log(`  FAIL  ${name}${detail ? ` — ${detail}` : ''}`);
  }
}

/** The deployed host can be slow to answer the first request (the same reason the main
 *  verifier retries). A document that genuinely cannot be fetched still fails. */
async function gotoLive(page, url) {
  let lastError = null;
  for (let attempt = 1; attempt <= 2; attempt += 1) {
    try {
      await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 90000 });
      await page.waitForLoadState('networkidle', { timeout: 15000 }).catch(() => {});
      await page.waitForTimeout(600);
      return;
    } catch (error) {
      lastError = error;
      await page.waitForTimeout(4000);
    }
  }
  throw lastError;
}

/** Enter the login portal and take a demo card — the real entry, never a bypass. */
async function signIn(page, card) {
  await gotoLive(page, `${SITE}/?console=legacy`);
  const login = page.getByRole('button', { name: 'Partner Login' }).first();
  await login.waitFor({ state: 'visible', timeout: 90000 });
  await login.click({ timeout: 30000 });
  await page.waitForTimeout(1500);
  const demoCard = page.locator(`text=${card}`).first();
  await demoCard.waitFor({ state: 'visible', timeout: 90000 });
  await demoCard.click({ timeout: 30000 });
  await page.waitForTimeout(2500);
}

/** Navigate the REAL sidebar: its own "Filter navigation" control, then the destination. */
async function goTo(page, destination) {
  await page.getByRole('searchbox', { name: 'Filter navigation' }).fill(destination);
  await page.waitForTimeout(400);
  await page
    .locator('nav[aria-label="Primary"]')
    .getByRole('button', { name: new RegExp(destination) })
    .first()
    .click({ timeout: 60000 });
  await page.waitForTimeout(1500);
}

const scopesOf = (table) =>
  table.locator('thead th').evaluateAll((els) => els.map((e) => e.getAttribute('scope')));
const cellSizeOf = (table) =>
  table.evaluate((el) => {
    const cell = el.querySelector('tbody td');
    return cell ? Number.parseFloat(getComputedStyle(cell).fontSize) : -1;
  });

(async () => {
  const browser = await chromium.launch();
  const pageErrors = [];
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  page.on('pageerror', (e) => pageErrors.push(String(e)));

  try {
    /* ── L33 — the TAM/SAM breakdown, on the deployed site ─────────────────── */
    console.log(`\n--- L33 the canonical table contract, on ${SITE} ---`);
    await signIn(page, 'Super Admin — Tadii');
    check('L33 the deployed site opened and the super admin signed in', true);
    await goTo(page, 'Super Admin');
    await page.getByRole('button', { name: 'Investor Pitch', exact: true }).click({ timeout: 60000 });
    await page.waitForTimeout(1200);
    await page.getByRole('button', { name: 'Expand category breakdown' }).click({ timeout: 60000 });

    const tam = page.locator('table[data-table="tam-sam-categories"]').first();
    await tam.waitFor({ state: 'visible', timeout: 60000 });
    check('L33 the DEPLOYED TAM/SAM breakdown renders the canonical table', true);

    const tamScopes = await scopesOf(tam);
    check(
      'L33 every deployed TAM/SAM header is scoped',
      tamScopes.length === 5 && tamScopes.every((s) => s === 'col'),
      tamScopes.join(',')
    );
    const tamCaption = (await tam.locator('caption').first().innerText().catch(() => '')).trim();
    check('L33 the deployed TAM/SAM table carries its caption', tamCaption.length > 0, tamCaption);
    const tamCell = await cellSizeOf(tam);
    check(`L33 the deployed TAM/SAM cells render at the canonical body step (${tamCell}px)`, tamCell === 14);

    /* ── L33b — the brand guidance benchmark + the CSV panel, on the deployed site ── */
    console.log('\n--- L33b the brand guidance tables, on the deployed site ---');
    await page.close();
    const brandPage = await browser.newPage({ viewport: { width: 1440, height: 900 } });
    brandPage.on('pageerror', (e) => pageErrors.push(String(e)));
    await signIn(brandPage, 'Astonish');
    check('L33b the deployed site opened and the brand signed in', true);
    await goTo(brandPage, 'Product Catalog');

    await brandPage.getByRole('button', { name: /CSV Import/ }).click({ timeout: 60000 });
    await brandPage.getByText('Bulk CSV Import').waitFor({ state: 'visible', timeout: 60000 });
    check('L33b the deployed CSV import panel opens from its real control', true);
    await brandPage.getByRole('button', { name: /CSV Import/ }).click({ timeout: 60000 });
    await brandPage.waitForTimeout(400);

    await brandPage.locator('button', { hasText: 'Add New Product' }).first().click({ timeout: 60000 });
    await brandPage.waitForTimeout(600);
    await brandPage.getByRole('button', { name: 'Net PPM & Wholesale Pricing' }).click({ timeout: 60000 });
    await brandPage.waitForTimeout(500);

    const ppm = brandPage.locator('table[data-table="net-ppm-benchmarks"]').first();
    await ppm.waitFor({ state: 'visible', timeout: 60000 });
    check('L33b the DEPLOYED guidance benchmark renders the canonical table', true);

    const ppmScopes = await scopesOf(ppm);
    check(
      'L33b every deployed guidance header is scoped',
      ppmScopes.length === 3 && ppmScopes.every((s) => s === 'col'),
      ppmScopes.join(',')
    );
    const ppmCell = await cellSizeOf(ppm);
    check(`L33b the deployed guidance cells render at the canonical body step (${ppmCell}px)`, ppmCell === 14);
    const ppmRows = await ppm.locator('tbody tr').count();
    check(`L33b the deployed guidance table renders its benchmark rows (${ppmRows})`, ppmRows > 0);
    check(
      `L33b the deployments threw no uncaught page error (errors: ${pageErrors.join(' | ') || 'none'})`,
      pageErrors.length === 0
    );
  } catch (error) {
    check(
      `L33 the canonical tables could NOT be driven live (${String(error).split('\n')[0].slice(0, 160)})`,
      false
    );
  }

  await browser.close();
  console.log(`\nLIVE CANONICAL TABLES: ${pass} PASS / ${fail} FAIL`);
  if (fail > 0) console.log(failures.map((f) => `  x ${f}`).join('\n'));
  process.exit(fail === 0 ? 0 : 1);
})();
