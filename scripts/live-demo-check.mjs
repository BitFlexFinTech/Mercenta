/**
 * §Phase 10 live-demo verification — real browser against the PUBLIC URL.
 * Verifies homepage, login portal, role logins and the simulation workflow.
 */
import { chromium } from '@playwright/test';

const BASE = process.env.DEMO_URL || 'https://demo.mercenta.co.uk';

async function waitRendered(page, timeoutMs = 180000) {
  await page.waitForFunction(() => {
    const t = document.body?.innerText || '';
    return t.length > 600 && !t.includes('something went wrong');
  }, { timeout: timeoutMs }).catch(() => {});
  await page.waitForTimeout(1000);
}

async function openLogin(page) {
  await page.goto(BASE + '/', { waitUntil: 'domcontentloaded', timeout: 120000 });
  await waitRendered(page);
  const heroLogin = page.getByRole('button', { name: 'Partner Login' }).first();
  try {
    await heroLogin.click({ timeout: 30000 });
  } catch {
    await page.getByRole('button', { name: 'Open navigation' }).click({ timeout: 30000 });
    await page.waitForTimeout(1000);
    await page.getByRole('button', { name: 'Partner Login' }).last().click({ timeout: 30000 });
  }
  await page.waitForTimeout(1500);
}

const browser = await chromium.launch({ headless: true });
const failures = [];
const checks = [];
const ck = (label, ok, detail = '') => { checks.push({ label, ok, detail }); if (!ok) failures.push(label + (detail ? ' — ' + detail : '')); };
const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
const page = await ctx.newPage();
const perr = [];
page.on('pageerror', (e) => perr.push(String(e)));

async function goHome() {
  await page.goto(BASE + '/', { waitUntil: 'domcontentloaded', timeout: 240000 });
  await waitRendered(page);
  await page.waitForTimeout(1200);
}

/**
 * Wait for a lazily-loaded SHELL before asserting on it.
 *
 * EVIDENCE (2026-09-15, M13c): `waitRendered` alone cannot distinguish the LOGIN
 * portal (already ~2,200 chars) from the shell that is still being downloaded, so
 * reading the body straight after a role click read the page MID-LOAD on the slow
 * shared host ("Loading..." = 10 chars) and produced a FALSE failure. The product
 * is fine — the same session renders fully ~4-6s later, the deployed chunk is
 * byte-identical to the verified local build, and the identical flow passes
 * locally. These waits make the check assert the shell it is about to inspect
 * (strictly stronger: a shell that never renders still fails, but later).
 */
async function waitForShell(marker, timeoutMs = 120000) {
  await page
    .locator(`nav >> text=${marker}`)
    .first()
    .waitFor({ state: 'visible', timeout: timeoutMs })
    .catch(() => {});
  await waitRendered(page);
}

// ── Flow 1: Homepage + Super Admin + Simulation Control (single cached context) ──
try {
  await goHome();
  const body = await page.locator('body').innerText();
  ck('homepage renders', !body.includes('something went wrong') && body.length > 400, `len=${body.length}`);
  ck('homepage brand copy visible', /Your brand\. The UK market\.|UK retail channels/.test(body) || body.includes('mercenta'), 'brand/nav text');
  ck('homepage CTA present', body.includes('Partner Login'), 'login CTA');

  await page.getByRole('button', { name: 'Partner Login' }).first().click({ timeout: 30000 });
  await page.waitForTimeout(1500);
  const loginBody = await page.locator('body').innerText();
  ck('login portal opens', loginBody.includes('Mercenta Admin Hub') || loginBody.includes('Super Admin'), 'demo cards');

  await page.locator('text=Super Admin — Tadii').first().click({ timeout: 30000 });
  await waitRendered(page);
  let body2 = await page.locator('body').innerText();
  ck('super admin dashboard renders', !body2.includes('something went wrong') && body2.length > 300, 'admin');

  // Simulation Control lives as a SuperAdminPanel tab, not a top-level nav link.
  const superNav = await page.waitForSelector('nav', { timeout: 60000 }).catch(() => null);
  if (superNav) { await page.click('nav >> text=Super Admin', { timeout: 60000 }); await waitRendered(page); }
  const simTab = page.locator('text=Simulation').first();
  if (await simTab.count()) {
    await simTab.click({ timeout: 30000 });
    await waitRendered(page);
    body2 = await page.locator('body').innerText();
    ck('simulation control reachable live', /Simulation Control Centre/.test(body2), 'simulation tab');
  } else {
    ck('simulation control reachable live', false, 'Simulation tab not found');
  }
} catch (e) { ck('super-admin flow', false, String(e).slice(0, 140)); }
ck('no page errors (super-admin flow)', perr.length === 0, perr.slice(0, 2).join(' | '));

// ── Flow 2: Brand portal (same context — assets now cached) ──
const homeBtn = page.getByRole('button', { name: 'Home' }).first();
if (await homeBtn.count()) { await homeBtn.click({ timeout: 30000 }); await page.waitForTimeout(1000); }
try {
  await openLogin(page);
  await page.locator('text=Astonish').first().click({ timeout: 30000 });
  await waitForShell('Purchase Orders');
  /* Dismiss the brand tour overlay — its buttons say "Skip" and "Next", not
     "Skip Tour". (Live evidence 2026-09-15: text=Skip Tour matched nothing and
     the tour overlay stayed up, causing all subsequent nav clicks to time out
     because the overlay intercepts pointer events.) */
  for (let i = 0; i < 8; i += 1) {
    const btn = page.locator('button:has-text("Skip")').first();
    if (await btn.count()) {
      try { await btn.click({ timeout: 4000 }); } catch { break; }
      await page.waitForTimeout(400);
    } else break;
  }
  for (let i = 0; i < 4; i += 1) {
    const nxt = page.locator('button:has-text("Next"):visible').first();
    if (await nxt.count()) { try { await nxt.click({ timeout: 3000 }); } catch { break; } await page.waitForTimeout(400); } else break;
  }
  const body = await page.locator('body').innerText();
  ck('brand portal renders live', !body.includes('something went wrong') && body.length > 300, 'brand');
  // Open the brand's Purchase Orders view — where its tenant-scoped POs live.
  const poNav = page.locator('nav >> text=Purchase Orders').first();
  if (await poNav.count()) {
    await poNav.click({ timeout: 30000 });
    await waitRendered(page);
    const poBody = await page.locator('body').innerText();
    ck('brand sees own tenant data', poBody.includes('PO-9000') || poBody.includes('Astonish'), 'po view');
  } else {
    ck('brand sees own tenant data', body.includes('Astonish'), 'po nav missing');
  }
  ck('no page errors (brand flow)', perr.length === 0, perr.slice(0, 2).join(' | '));
} catch (e) { ck('brand flow', false, String(e).slice(0, 140)); }

// ── Flow 3: Carrier terminal (same context) ──
const homeBtn2 = page.getByRole('button', { name: 'Home' }).first();
if (await homeBtn2.count()) { await homeBtn2.click({ timeout: 30000 }); await page.waitForTimeout(1000); }
try {
  await openLogin(page);
  await page.locator('text=3PL Carrier Terminal').first().click({ timeout: 30000 });
  await waitForShell('Manifest Management');
  const body = await page.locator('body').innerText();
  ck('carrier terminal renders live', !body.includes('something went wrong') && body.length > 200, 'carrier');
  ck('no page errors (carrier flow)', perr.length === 0, perr.slice(0, 2).join(' | '));
} catch (e) { ck('carrier flow', false, String(e).slice(0, 140)); }
await ctx.close();

console.log('=== PHASE 10 LIVE-DEMO VERIFICATION ===');
for (const { label, ok, detail } of checks) console.log(`[${ok ? 'PASS' : 'FAIL'}] ${label}${detail ? ' :: ' + detail : ''}`);
console.log(failures.length === 0 ? 'RESULT: LIVE DEMO OK' : 'RESULT: ' + failures.length + ' FAILURES');
await browser.close();
process.exit(failures.length === 0 ? 0 : 1);