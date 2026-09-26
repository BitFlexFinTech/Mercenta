import { test, expect, type Page } from '@playwright/test';

/**
 * §CG — THE CONVERSION GATE (validation · spam protection · submission reliability).
 *
 * Recorded scope: `requirements-registry.json → phase15-conversion` — *"form
 * validation, spam protection, submission reliability"*, remainder *"spam
 * protection and submission reliability remain"*.
 *
 * What this spec proves IN A REAL BROWSER (the owner gate
 * `scripts/validate-conversion-gate.mjs` proves the domain side):
 *   1. a filled HONEYPOT is refused, the applicant is told nothing was recorded,
 *      and the form does NOT reach "Application Received";
 *   2. a submission FASTER than the declared minimum fill time is refused;
 *   3. invalid answers produce PER-FIELD messages that are announced
 *      (`role="alert"`) and marked (`aria-invalid`) — not one vague banner;
 *   4. the SAME application submitted twice is recorded ONCE and the second
 *      attempt is told it was not recorded twice;
 *   5. link verification can NEVER hold the submission open: with every
 *      third-party host deliberately HANGING, the applicant still reaches the
 *      confirmed state promptly and no page error is thrown.
 *
 * The minimum fill time is read from the SSOT
 * (`APPLICATION_SPAM_POLICY.minFillMs`); the `§CG minFillMs=` marker below is
 * asserted by the owner gate, so a spec that silently waits less than the policy
 * FAILS the gate instead of passing quietly.
 */
const MIN_FILL_MS = 2600; // §CG minFillMs=2600 (SSOT declares 2500)

/** The country control is a search-then-select list (same path as access-gate.spec.ts). */
async function fillCountry(page: Page, name: string) {
  const field = page.locator('input[placeholder*="Type your country name"]');
  await field.click();
  await field.fill(name);
  await page.locator('div.z-50 button', { hasText: name }).last().click();
  await page.waitForTimeout(300);
}

/** Open the public application form and wait out the declared minimum fill time. */
async function openApplicationForm(page: Page) {
  await page.goto('/');
  await page.locator('text=Partner Login').first().click();
  await page.waitForTimeout(500);
  await page.click('text=Request Partner Access');
  await expect(page.locator('text=Request Partner Access').first()).toBeVisible({ timeout: 5000 });
  await page.waitForTimeout(MIN_FILL_MS);
}

/** Fill the answers a real applicant would give (one valid link). */
async function fillRealApplication(page: Page, company: string) {
  await page.fill('input[placeholder*="registered business name"]', company);
  await fillCountry(page, 'United Kingdom');
  /* §PHONE — the phone is COMPULSORY (Founder decision, 2026-09-26), so every helper
   * that means "a complete application" must supply one. The country code is filled
   * by selecting the country; the applicant adds their national number. */
  await page.fill('#cg-phone', '2079460958');
  await page.fill('input[placeholder*="https://your-company.com"]', 'https://example.com');
}

/**
 * A form-filling bot completes EVERY field it finds, including the one no human
 * can see. `force`-style programmatic input is exactly that behaviour — React is
 * fed through the native value setter so the component state really changes.
 */
async function botFillsTheHoneypot(page: Page) {
  await page.locator('[data-cg-honeypot] input').evaluate((el) => {
    const input = el as HTMLInputElement;
    const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value')?.set;
    setter?.call(input, 'filled-by-a-bot');
    input.dispatchEvent(new Event('input', { bubbles: true }));
  });
}

function collectPageErrors(page: Page): string[] {
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(String(e)));
  return errors;
}

test.describe('§CG — conversion gate', () => {
  test('1. a filled honeypot is refused and NOTHING is recorded', async ({ page }) => {
    const errors = collectPageErrors(page);
    await openApplicationForm(page);
    await fillRealApplication(page, 'Bot Completer Ltd');
    await botFillsTheHoneypot(page);
    await page.click('text=Submit Application');

    const notice = page.locator('[data-cg-notice]');
    await expect(notice).toBeVisible({ timeout: 5000 });
    await expect(notice).toContainText('flagged as automated');
    await expect(notice).toContainText('NOT recorded');
    await expect(page.locator('text=Application Received')).toHaveCount(0);
    expect(errors).toEqual([]);
  });

  test('2. a submission faster than the declared minimum is refused', async ({ page }) => {
    // Open the form and submit IMMEDIATELY — no minimum-fill wait.
    await page.goto('/');
    await page.locator('text=Partner Login').first().click();
    await page.waitForTimeout(500);
    await page.click('text=Request Partner Access');
    await page.fill('input[placeholder*="registered business name"]', 'Too Fast Ltd');
    await fillCountry(page, 'United Kingdom');
    /* §PHONE — the phone is COMPULSORY and VALIDATION is evaluated BEFORE the spam
     * signals, so this leg must submit a VALID payload: without a phone it would be
     * refused for the missing phone (a field refusal, no form-level notice at all)
     * instead of for being too fast, and the timing signal would never be tested. */
    await page.fill('#cg-phone', '2079460958');
    await page.fill('input[placeholder*="https://your-company.com"]', 'https://example.com');
    await page.click('text=Submit Application');

    const notice = page.locator('[data-cg-notice]');
    await expect(notice).toBeVisible({ timeout: 5000 });
    await expect(notice).toContainText('faster than a person can read it');
    await expect(page.locator('text=Application Received')).toHaveCount(0);
  });

  test('3. invalid answers produce per-field, announced refusals', async ({ page }) => {
    await openApplicationForm(page);
    await page.fill('input[placeholder*="registered business name"]', 'X');
    await fillCountry(page, 'United Kingdom');
    await page.fill('input[placeholder*="https://your-company.com"]', 'not a url');
    await page.fill('input[placeholder*="Approximate number of products"]', '-3');
    await page.click('text=Submit Application');

    const companyError = page.locator('[data-cg-error="companyName"]');
    await expect(companyError).toBeVisible({ timeout: 5000 });
    await expect(companyError).toHaveAttribute('role', 'alert');
    await expect(page.locator('[data-cg-error="websiteUrl"]')).toBeVisible();
    await expect(page.locator('[data-cg-error="skuCount"]')).toBeVisible();
    await expect(page.locator('[data-cg-field="websiteUrl"]')).toHaveAttribute('aria-invalid', 'true');
    // The FIRST invalid field receives focus, so a keyboard or screen-reader user
    // lands on the field that needs fixing instead of hunting for it.
    await expect(page.locator('#cg-companyName')).toBeFocused();
    await expect(page.locator('text=Application Received')).toHaveCount(0);
  });

  test('3b. a MISSING phone number is refused under the phone control (it is compulsory)', async ({ page }) => {
    /* §PHONE — the Founder made the phone COMPULSORY on 2026-09-26. This is the
     * applicant-visible half of that contract: the refusal appears UNDER the phone
     * control (not only in a banner), the control is marked invalid, the applicant
     * is focused on it, and the form never reaches the confirmed state. */
    await openApplicationForm(page);
    await fillRealApplication(page, 'No Phone Ltd');
    await page.fill('#cg-phone', '');
    await page.click('text=Submit Application');

    const phoneError = page.locator('[data-cg-error="phone"]');
    await expect(phoneError).toBeVisible({ timeout: 5000 });
    await expect(phoneError).toHaveAttribute('role', 'alert');
    await expect(phoneError).toContainText('phone number');
    await expect(page.locator('[data-cg-field="phone"]')).toHaveAttribute('aria-invalid', 'true');
    await expect(page.locator('#cg-phone')).toBeFocused();
    await expect(page.locator('text=Application Received')).toHaveCount(0);
  });

  test('4. the same application is recorded ONCE, and the second attempt is told so', async ({ page }) => {
    await openApplicationForm(page);
    await fillRealApplication(page, 'Duplicate Check Ltd');
    await page.click('text=Submit Application');
    await expect(page.locator('text=Application Received')).toBeVisible({ timeout: 15000 });

    // Re-open the form and submit the SAME answers inside the duplicate window.
    await page.click('text=Back to Login');
    await page.waitForTimeout(500);
    await page.click('text=Request Partner Access');
    await page.waitForTimeout(MIN_FILL_MS);
    await fillRealApplication(page, 'Duplicate Check Ltd');
    await page.click('text=Submit Application');

    const notice = page.locator('[data-cg-notice]');
    await expect(notice).toBeVisible({ timeout: 5000 });
    await expect(notice).toContainText('already received');
    await expect(notice).toContainText('NOT recorded twice');
    await expect(page.locator('text=Application Received')).toHaveCount(0);
  });

  test('5. submission never waits for the third-party link check (the hosts hang)', async ({ page }) => {
    const errors = collectPageErrors(page);
    /* Every link the applicant offers is left PENDING on purpose: a real check
     * allows up to 10s per link (and never settles at all for many hosts, because
     * the browser blocks the cross-origin read). The applicant must still finish
     * immediately — that is the "submission reliability" half of the recorded scope. */
    await page.route(/https?:\/\/(www\.)?(example\.com|instagram\.com|facebook\.com)\/.*/, () => {
      /* deliberately never continued, fulfilled or aborted */
    });

    await openApplicationForm(page);
    await fillRealApplication(page, 'Never Blocked Ltd');
    const started = Date.now();
    await page.click('text=Submit Application');
    await expect(page.locator('text=Application Received')).toBeVisible({ timeout: 6000 });
    const elapsed = Date.now() - started;
    expect(elapsed).toBeLessThan(6000);
    expect(errors).toEqual([]);
  });
});
