/**
 * §Phase 2 runtime stability sweep — real-browser probe.
 * Logs in as every role, clicks every Primary-nav destination in the shell,
 * and records pageerror events, console errors and ErrorBoundary crashes.
 * NOT a Playwright spec (no *.spec.ts suffix).
 */
import { chromium } from '@playwright/test';

const BASE = process.env.BASE_URL || 'http://localhost:5173';
const ROLES = [
  { card: 'Super Admin — Tadii', view: 'super admin' },
  { card: 'Mercenta Admin Hub', view: 'admin' },
  { card: 'Zambezi Organic Extracts Ltd', view: 'brand' },
  { card: 'DeskForge Supplies Inc', view: 'brand' },
  { card: '3PL Carrier Terminal', view: 'carrier' },
];

function labelOf(role) {
  const brand = role.view === 'brand' ? ' ✓brand' : '';
  const tab = { 'super admin': 'SuperAdmin / Admin', admin: 'Admin', brand: 'Brand' + brand, carrier: 'Carrier' }[role.view];
  return tab || role.view;
}

async function openLogin(page) {
  await page.goto(BASE + '/', { waitUntil: 'domcontentloaded', timeout: 120000 });
  await page.waitForTimeout(2500);
  const heroLogin = page.getByRole('button', { name: 'Partner Login' }).first();
  try {
    await heroLogin.click({ timeout: 4000 });
  } catch {
    await page.getByRole('button', { name: 'Open navigation' }).click();
    await page.waitForTimeout(400);
    await page.getByRole('button', { name: 'Partner Login' }).last().click();
  }
  await page.waitForTimeout(600);
}

async function dismissTours(page) {
  for (let i = 0; i < 4; i++) {
    const skip = page.locator('text=Skip Tour').last();
    if (await skip.count()) {
      try { await skip.click({ timeout: 1500 }); } catch { /* already gone */ }
      const confirm = page.locator('text=Skip').last();
      if (await confirm.count()) {
        try { await confirm.click({ timeout: 1200 }); } catch { /* no modal */ }
      }
      await page.waitForTimeout(400);
    } else break;
  }
}

async function main() {
  const browser = await chromium.launch({ headless: true });
  const results = [];
  for (const role of ROLES) {
    const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
    const page = await ctx.newPage();
    const pageErrors = [];
    const consoleErrors = [];
    page.on('pageerror', (e) => pageErrors.push(String(e)));
    page.on('console', (m) => { if (m.type === 'error') consoleErrors.push(m.text); });
    try {
      await openLogin(page);
      await page.locator('text=' + role.card).first().click();
      await page.waitForTimeout(1400);
      if (role.view === 'brand') await dismissTours(page);
      await page.waitForTimeout(500);

      // Landing screen crash check
      const crash = async () => (await page.locator('body').innerText()).includes('something went wrong');

      const destinations = await page.locator('nav[aria-label="Primary"] a, nav[aria-label="Primary"] button').allInnerTexts().catch(() => []);
      const crashedScreens = [];
      if (await crash()) crashedScreens.push('(landing)');
      for (const dest of destinations) {
        const label = dest.replace(/\s+/g, ' ').trim();
        if (!label) continue;
        if (label.includes('Log out') || label.includes('Sign out') || label === 'Home') continue;
        const el = page.locator('nav[aria-label="Primary"] a, nav[aria-label="Primary"] button').filter({ hasText: label }).first();
        try {
          await el.click({ timeout: 3000 });
          await page.waitForTimeout(700);
          if (await crash()) crashedScreens.push(label);
        } catch { /* nav click failed — record crash state anyway */ }
      }
      results.push({
        role: labelOf(role) + ' :: ' + role.card,
        destinations: destinations.length,
        pageErrors: pageErrors.length,
        consoleErrors: consoleErrors.length,
        crashedScreens,
      });
    } catch (err) {
      results.push({ role: labelOf(role) + ' :: ' + role.card, fatal: String(err).slice(0, 160) });
    }
    await ctx.close();
  }
  console.log('=== PHASE 2 RUNTIME SWEEP ===');
  let failed = false;
  for (const r of results) {
    const ok = !r.fatal && r.pageErrors === 0 && r.crashedScreens.length === 0;
    if (!ok) failed = true;
    console.log(`[${ok ? 'PASS' : 'FAIL'}] ${r.role} | nav=${r.destinations ?? 'n/a'} | pageErrors=${r.pageErrors ?? 'n/a'} | console=${r.consoleErrors ?? 'n/a'}${r.fatal ? ' | fatal: ' + r.fatal : ''}${r.crashedScreens?.length ? ' | crashed: ' + r.crashedScreens.join(' ⏐ ') : ''}`);
  }
  console.log(failed ? 'RESULT: FAILURES FOUND' : 'RESULT: ALL CLEAN');
  await browser.close();
  process.exit(failed ? 1 : 0);
}

await main();