/**
 * §PHASE 3 STAGE 3 — THE SUPPLY ROUTE & 3PL ESCALATION SURFACE, IN A REAL BROWSER.
 *
 * The domain behaviour is proved by `scripts/validate-supply-route-logistics.mjs`
 * (executing the real modules). This spec proves the SAME behaviour is PRESENT in
 * the running product, on the Mercenta Admin Logistics Hub:
 *
 *   1  the section renders with the operator's own heading;
 *   2  the DECLARED 3PL partner is named (Delta Fulfillment) and is stated to be a
 *      3PL — it fulfils, it does not carry;
 *   3  the partner's provider mode is stated truthfully (Simulation — never Live);
 *   4  the escalation thresholds are shown as NOT AGREED;
 *   5  the result FAILS CLOSED: the decision is human review and no 3PL is
 *      recommended, with the reasons rendered;
 *   6  every field the records do not hold is NAMED as unknown (never estimated),
 *      and the derived route states what it came from;
 *   7  the panel makes no false live claim;
 *   8  no horizontal overflow at desktop and mobile widths.
 */
import { test, expect, type Page } from '@playwright/test';
import { loginAs } from './helpers/auth';

async function openAdminLogistics(page: Page) {
  await loginAs(page, 'Mercenta Admin Hub', 1300);
  await page.click('nav[aria-label="Primary"] >> text=Logistics Hub');
  await page.waitForTimeout(1700);
}

const PANEL = '[data-testid="supply-route-escalation"]';

test.describe('§PHASE 3 Stage 3 — the supply route & 3PL escalation surface', () => {
  test('1. the section renders on the admin Logistics Hub', async ({ page }) => {
    await openAdminLogistics(page);
    await expect(
      page.locator('section[aria-label="Supply route & 3PL escalation"]')
    ).toBeVisible({ timeout: 12000 });
    await expect(page.locator(PANEL)).toBeVisible({ timeout: 8000 });
  });

  test('2. the declared 3PL partner is named and stated as a 3PL (fulfils, does not carry)', async ({
    page,
  }) => {
    await openAdminLogistics(page);
    const partner = page.locator('[data-testid="supply-route-partner"]');
    await expect(partner).toBeVisible({ timeout: 12000 });
    await expect(partner).toContainText('Delta Fulfillment');
    await expect(page.locator(PANEL)).toContainText('3PL — fulfils, does not carry');
  });

  test('3. the partner mode is stated truthfully (Simulation, never Live)', async ({ page }) => {
    await openAdminLogistics(page);
    const mode = page.locator('[data-testid="supply-route-partner-mode"]');
    await expect(mode).toBeVisible({ timeout: 12000 });
    await expect(mode).toContainText('Simulation');
    await expect(mode).not.toContainText('Live');
  });

  test('4. the escalation thresholds are shown as not agreed', async ({ page }) => {
    await openAdminLogistics(page);
    const thresholds = page.locator('[data-testid="supply-route-thresholds"]');
    await expect(thresholds).toBeVisible({ timeout: 12000 });
    await expect(thresholds).toContainText('Not agreed');
  });

  test('5. the decision FAILS CLOSED — human review, no 3PL recommended', async ({ page }) => {
    await openAdminLogistics(page);
    const decision = page.locator('[data-testid="supply-route-decision"]');
    await expect(decision).toBeVisible({ timeout: 12000 });
    expect(await decision.getAttribute('data-decision')).toBe('review');
    await expect(decision).toContainText('Human review required');

    const reasons = page.locator('[data-testid="supply-route-reasons"]');
    await expect(reasons).toBeVisible();
    const reasonText = (await reasons.innerText()) ?? '';
    /**
     * The engine fails closed on the FIRST failing condition, so for a route whose
     * fields are not recorded the reason states that no escalation is recommended
     * "fail closed" and names the unknowns; once a route IS recorded the reason
     * becomes the "thresholds are NOT AGREED" one. Either is a fail-closed review.
     */
    expect(reasonText).toMatch(/fail closed|not agreed|human review/i);
  });

  test('6. the unrecorded fields are NAMED as unknown, with the derivation stated', async ({
    page,
  }) => {
    await openAdminLogistics(page);
    const unknowns = page.locator('[data-testid="supply-route-unknowns"]');
    await expect(unknowns).toBeVisible({ timeout: 12000 });
    const unknownText = (await unknowns.innerText()) ?? '';
    expect(unknownText).toMatch(/not recorded/i);
    expect(unknownText).toMatch(/transit|lead time|buffer/i);

    await expect(page.locator('[data-testid="supply-route-basis"]')).toContainText(
      /derived from the platform/i
    );
  });

  test('7. the panel makes no false live claim', async ({ page }) => {
    await openAdminLogistics(page);
    const text = (await page.locator(PANEL).innerText()) ?? '';
    expect(text).not.toMatch(/\blive provider\b|\blive connection\b|confirmed live/i);
  });

  test('8. no horizontal overflow at desktop and mobile widths', async ({ page }) => {
    await openAdminLogistics(page);
    await expect(page.locator(PANEL)).toBeVisible({ timeout: 12000 });
    for (const width of [1440, 390]) {
      await page.setViewportSize({ width, height: 900 });
      await page.waitForTimeout(400);
      const overflow = await page.evaluate(
        () => document.documentElement.scrollWidth - document.documentElement.clientWidth
      );
      expect(overflow, `horizontal overflow at ${width}px`).toBeLessThanOrEqual(1);
    }
  });
});