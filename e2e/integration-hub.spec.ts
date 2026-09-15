/**
 * §Phase B — Integration Hub breadth.
 *
 * Verifies the provider control centre against the REAL mode model: the
 * overview tiles must be DERIVED from the same states the cards render (the
 * test reads a tile's number and compares it with the rendered cards, so a
 * hardcoded or drifting count fails), filtering must show only matching
 * providers, and the search must report the real visible/total count.
 *
 * The Hub never fabricates a status: a tile number is only ever the count of
 * providers whose mode/state actually is that value.
 */
import { test, expect } from '@playwright/test';
import { loginAs } from './helpers/auth';

async function openHub(page: import('@playwright/test').Page) {
  await loginAs(page, 'Super Admin — Tadii', 1200);
  await page.locator('nav[aria-label="Primary"] button:has-text("Integration Settings")').first().click();
  await page.waitForTimeout(700);
  const hub = page.getByTestId('integration-hub');
  await expect(hub).toBeVisible({ timeout: 8000 });
  return hub;
}

/** Read a summary tile's number by its canonical hint (the tile's title). */
async function tileCount(hub: import('@playwright/test').Locator, hint: string): Promise<number> {
  const tile = hub.locator(`button[title="${hint}"]`).first();
  await expect(tile).toBeVisible({ timeout: 4000 });
  const raw = await tile.locator('div').first().innerText();
  return Number(raw.trim());
}

const HINT_ALL = 'Every registered provider';
const HINT_LIVE = 'Verified non-sandbox connection';
const HINT_SIM = 'Executable with mock adapters';
const HINT_AVAILABLE = 'Registered, not configured yet';
const HINT_CONFIGURING = 'Connect flow in progress';
const HINT_ATTENTION = 'Error, degraded or failing health';
const HINT_DISABLED = 'Operator-disabled — no workflow uses it';

test.describe('Phase B — Integration Hub control centre', () => {
  test('1. overview tiles are derived from the rendered provider modes', async ({ page }) => {
    const hub = await openHub(page);

    const cards = hub.locator('div[data-mode]');
    const total = await tileCount(hub, HINT_ALL);
    await expect(cards).toHaveCount(total);

    // The mode model partitions every provider exactly once: the seven modes
    // (live / simulation / available / configuring / degraded / error /
    // disabled), with "needs attention" covering degraded + error.
    const live = await tileCount(hub, HINT_LIVE);
    const sim = await tileCount(hub, HINT_SIM);
    const available = await tileCount(hub, HINT_AVAILABLE);
    const configuring = await tileCount(hub, HINT_CONFIGURING);
    const attention = await tileCount(hub, HINT_ATTENTION);
    const disabled = await tileCount(hub, HINT_DISABLED);
    expect(live + sim + available + configuring + attention + disabled).toBe(total);

    // The rendered cards agree mode-by-mode (a tile can never lie about a card).
    expect(await hub.locator('div[data-mode="live"]').count()).toBe(live);
    expect(await hub.locator('div[data-mode="simulation"]').count()).toBe(sim);
    expect(await hub.locator('div[data-mode="available"]').count()).toBe(available);
    expect(await hub.locator('div[data-mode="configuring"]').count()).toBe(configuring);
    expect(await hub.locator('div[data-mode="disabled"]').count()).toBe(disabled);
  });

  test('2. filtering by a tile shows only matching providers, count for count', async ({ page }) => {
    const hub = await openHub(page);

    const sim = await tileCount(hub, HINT_SIM);
    await hub.locator(`button[title="${HINT_SIM}"]`).first().click();
    await page.waitForTimeout(300);

    if (sim === 0) {
      await expect(hub.getByText('No integrations match this view').first()).toBeVisible();
    } else {
      // Every rendered card is a simulation-mode card, and exactly `sim` of them.
      expect(await hub.locator('div[data-mode]:not([data-mode="simulation"])').count()).toBe(0);
      await expect(hub.locator('div[data-mode="simulation"]')).toHaveCount(sim);
      await expect(hub.getByText('Simulation mode.').first()).toBeVisible();
    }
    await expect(hub.locator(`button[title="${HINT_SIM}"]`)).toHaveAttribute('aria-pressed', 'true');

    // Clearing restores the full list.
    await hub.getByRole('button', { name: 'Clear filters' }).first().click();
    await page.waitForTimeout(300);
    await expect(hub.locator('div[data-mode]')).toHaveCount(await tileCount(hub, HINT_ALL));
  });

  test('3. search filters providers and reports the true visible/total count', async ({ page }) => {
    const hub = await openHub(page);
    const total = await tileCount(hub, HINT_ALL);

    await hub.getByLabel('Search integrations').fill('Amazon');
    await page.waitForTimeout(300);

    const shown = await hub.locator('div[data-mode]').count();
    expect(shown).toBeGreaterThan(0);
    expect(shown).toBeLessThan(total);
    await expect(hub.getByText(`${shown} of ${total} providers shown`).first()).toBeVisible();
    // Both registered Amazon providers are visible under this query.
    await expect(hub.locator('h3', { hasText: 'Amazon Selling Partner API' }).first()).toBeVisible();
    await expect(hub.locator('h3', { hasText: 'Amazon Ads API' }).first()).toBeVisible();

    // A name-specific query narrows to exactly that provider.
    await hub.getByLabel('Search integrations').fill('Amazon Selling');
    await page.waitForTimeout(300);
    await expect(hub.locator('div[data-mode]')).toHaveCount(1);
    await expect(hub.getByText(`1 of ${total} providers shown`).first()).toBeVisible();
    await expect(hub.locator('h3', { hasText: 'Amazon Selling Partner API' }).first()).toBeVisible();

    // A query with no match produces the honest empty state, not a blank screen.
    await hub.getByLabel('Search integrations').fill('zzz-not-a-provider');
    await page.waitForTimeout(300);
    await expect(hub.getByText('No integrations match this view').first()).toBeVisible();
    await expect(hub.locator('div[data-mode]')).toHaveCount(0);
    await expect(hub.getByText(`0 of ${total} providers shown`).first()).toBeVisible();
  });

  test('4. providers are grouped under their canonical category headings', async ({ page }) => {
    const hub = await openHub(page);

    // Category names come from INTEGRATION_CATEGORY_LABELS (single source of truth).
    for (const category of ['Commerce', 'Finance', 'Logistics', 'Compliance', 'Communications', 'Marketing', 'AI & Research', 'Data']) {
      await expect(hub.locator('h2', { hasText: category }).first()).toBeVisible({ timeout: 4000 });
    }
    // Google is the ONE Infrastructure provider (M13 Phase 8) — the heading exists
    // because the registry genuinely uses the category, not because it was invented.
    await expect(hub.locator('h2', { hasText: 'Infrastructure' }).first()).toBeVisible({ timeout: 4000 });
    await expect(hub.locator('h3', { hasText: 'Google' }).first()).toBeVisible({ timeout: 4000 });
    // Provider cards remain h3 (the registry-removal contract depends on it).
    await expect(hub.locator('h3', { hasText: 'Twilio WhatsApp' }).first()).toBeVisible();
    await expect(hub.locator('h3', { hasText: 'Postiz' }).first()).toBeVisible();
  });

  test('5. no page errors while operating the Hub', async ({ page }) => {
    const pageErrors: string[] = [];
    page.on('pageerror', (e) => pageErrors.push(e.message));
    const hub = await openHub(page);

    await hub.locator(`button[title="${HINT_ATTENTION}"]`).first().click();
    await page.waitForTimeout(300);
    await hub.getByRole('button', { name: 'Clear filters' }).first().click();
    await page.waitForTimeout(300);
    await hub.getByLabel('Search integrations').fill('stripe');
    await page.waitForTimeout(300);
    await expect(hub.locator('h3', { hasText: 'Stripe' }).first()).toBeVisible();
    expect(pageErrors).toEqual([]);
  });
});
