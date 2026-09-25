/**
 * §P13 / S8 — THE ONBOARDING SURFACES TEACH THE RULE FROM ITS ONE OWNER.
 *
 * S6 repointed the brand surfaces and S7 the admin surfaces. S8 repoints the
 * surfaces that TEACH the rule — the guided tours, the knowledge-base article those
 * tours link to, the wizard's operational-guidance step, the legacy tour blurb — and
 * removes the UNSUPPORTED consequence they asserted ("flagged", "vendor performance
 * deduction", "Below 80% triggers review … can delist ASINs"), which the platform's
 * own discrepancy register records as unsupported (AV-003).
 *
 * These tests drive the REAL surfaces, so they prove the rule reaches a brand from the
 * owner rather than from a copy:
 *   1. the brand's orientation tour step AND the knowledge-base article its
 *      "Learn more" link opens;
 *   2. the onboarding wizard's required operational-guidance step;
 *   3. the admin's tour-management preview of the PO acknowledgment tour;
 *   4. the admin onboarding pipeline's LINK state (the brand's acknowledgement).
 */
import { test, expect } from '@playwright/test';
import { loginAs } from './helpers/auth';
import { wizardToStep } from './helpers/onboarding';

/** The rule's own wording — asserted as text, never re-typed as a rule here. */
const RULE_START = 'The retail channel requires every purchase order to be acknowledged';
const PAST_LIMIT = 'Past the 24-hour limit the documented action is a rejection';
const INVENTED = /flagged|vendor performance|delist ASINs/i;

test.describe('PO-ACK S8 — the onboarding surfaces', () => {
  test('1. the brand tour step and the KB article it links to teach the OWNER’s rule', async ({ page }) => {
    await loginAs(page, 'Tapatío');

    const card = page.locator('.animate-fade-in').first();
    await expect(card).toBeVisible({ timeout: 12000 });

    /** Tour 1 auto-starts on the dashboard; its step 3 is the purchase-order rule. */
    for (let i = 0; i < 2; i++) {
      const next = page.locator('button', { hasText: /Next/ }).first();
      if (await next.isVisible({ timeout: 2500 }).catch(() => false)) {
        await next.click();
        await page.waitForTimeout(500);
      }
    }
    const tourText = await card.innerText();
    expect(tourText).toContain('Purchase Orders — 24-Hour Rule');
    expect(tourText).toContain(RULE_START);
    expect(tourText).toContain(PAST_LIMIT);
    expect(tourText).not.toMatch(INVENTED);

    /** The step's "Learn more" opens the canonical article — the SAME rule, one owner. */
    const learn = page.locator('button', { hasText: /Learn more/i }).first();
    await expect(learn).toBeVisible({ timeout: 4000 });
    await learn.click();
    await page.waitForTimeout(900);
    const articleText = await page.locator('body').innerText();
    expect(articleText).toContain(RULE_START);
    expect(articleText).toContain('TemporarilyUnavailable');
    expect(articleText).not.toMatch(INVENTED);
  });

  test('2. the wizard’s operational-guidance step states the OWNER’s rule', async ({ page }) => {
    await loginAs(page, 'Kit & Kin', 1400);
    await wizardToStep(page, 6);
    await expect(page.locator('h2').filter({ hasText: /Operational Guidance/ }).first()).toBeVisible({
      timeout: 8000,
    });

    /** The PO-rejection section is collapsed by default — open it like a brand would. */
    await page.locator('button', { hasText: /PO Rejection — Performance Impact/ }).first().click();
    await page.waitForTimeout(500);

    const body = await page.locator('body').innerText();
    expect(body).toContain(RULE_START);
    expect(body).toContain(PAST_LIMIT);
    expect(body).toContain('TemporarilyUnavailable');
    expect(body).toContain('InvalidProductIdentifier');
    expect(body).toContain('ObsoleteProduct');
    /** The unsupported consequence and the invented reason codes are GONE. */
    expect(body).not.toMatch(INVENTED);
    expect(body).not.toContain('Out of stock');
    expect(body).not.toContain('Price dispute');
  });

  test('3. the admin tour-management preview shows the OWNER’s rule (never a copy)', async ({ page }) => {
    await loginAs(page, 'Mercenta Admin Hub', 1100);
    await page.click('nav[aria-label="Primary"] >> text=Onboarding Tours');
    await page.waitForTimeout(1200);

    const card = page
      .locator('div')
      .filter({ hasText: 'PO Acknowledgment' })
      .filter({ has: page.getByRole('button', { name: /Preview/i }) })
      .last();
    await expect(card).toBeVisible({ timeout: 8000 });
    await card.getByRole('button', { name: /Preview/i }).click();
    await page.waitForTimeout(700);

    const modal = page.locator('div.fixed.inset-0').first();
    await expect(modal).toBeVisible({ timeout: 4000 });
    for (let i = 0; i < 2; i++) {
      const next = modal.locator('button', { hasText: /Next/ }).first();
      if (await next.isVisible({ timeout: 1500 }).catch(() => false)) {
        await next.click();
        await page.waitForTimeout(400);
      }
    }
    const modalText = await modal.innerText();
    expect(modalText).toContain(RULE_START);
    expect(modalText).toContain(PAST_LIMIT);
    expect(modalText).not.toMatch(INVENTED);
  });

  test('4. the admin onboarding pipeline states the LINK for every record it shows', async ({ page }) => {
    await loginAs(page, 'Mercenta Admin Hub', 1100);
    await page.click('nav[aria-label="Primary"] >> text=Onboarding');
    await page.waitForTimeout(1500);

    const pipeline = page.locator('[data-section="onboarding-pipeline"]').first();
    await expect(pipeline).toBeVisible({ timeout: 8000 });

    const rows = page.locator('[data-onboarding-row]');
    const count = await rows.count();
    if (count === 0) {
      /**
       * The demo holds no canonical onboarding record until one is created — the
       * surface must SAY so rather than implying the link exists.
       */
      await expect(pipeline).toContainText(/No onboarding records yet/i);
      return;
    }
    for (let i = 0; i < count; i++) {
      await rows.nth(i).click();
      await page.waitForTimeout(400);
      const linkStates = page.locator(
        '[data-onboarding-po-rules="acknowledged"], [data-onboarding-po-rules="outstanding"]'
      );
      expect(await linkStates.count()).toBeGreaterThan(0);
      const acknowledged = page.locator('[data-onboarding-po-rules="acknowledged"]').first();
      if (await acknowledged.isVisible({ timeout: 300 }).catch(() => false)) {
        expect(await acknowledged.getAttribute('data-po-rules-text')).toContain(RULE_START);
      }
    }
  });
});
