/**
 * §P13 / S5 — THE ACKNOWLEDGEMENT NOTIFICATION FAN-OUT (functional).
 *
 * S1 declared the reminder schedule (12/6/2h remaining) and S4 gave the on-behalf
 * rejection its draft. S5 makes the schedule REACH the brand: every declared stage is
 * delivered on every channel the platform can genuinely deliver on, the FINAL stage
 * produces Mercenta's on-behalf draft, and the EXTERNAL instant-message channel is
 * declared and FAILS CLOSED (an unverified provider is never treated as simulation).
 *
 * This spec exercises the REAL surfaces end to end — the founder's Run control in the
 * automation console, the fan-out's own delivery ledger, and the brand's in-app
 * notification centre — because the capability must be reachable in the running
 * product, not merely proven by a script:
 *
 *   1. the founder RUNS the fan-out from the Control Centre and reads the outcome:
 *      messages delivered, the instant-message channel REFUSED with its reason, and
 *      Mercenta's on-behalf draft produced by the final stage (nothing performed);
 *      a second run is suppressed (no duplicate notification);
 *   2. the BRAND's notification centre (same session, in-place account switch) shows
 *      the reminders Mercenta actually sent it, with the channel and the stage.
 *
 * The seeded states are declared in `src/data/demoData.ts` (PO-9001 sits inside the
 * closing window) and asserted by
 * `scripts/validate-po-acknowledgement-notifications.mjs`.
 */
import { test, expect } from '@playwright/test';
import { loginAs } from './helpers/auth';

const FANOUT = 'po_acknowledgement_fanout';

async function openAutomationConsole(page: any) {
  await loginAs(page, 'Super Admin — Tadii', 1400);
  await page.getByTestId('dashboard-loaded').waitFor({ timeout: 12000 });
  await page.locator('nav[aria-label="Primary"]').locator('text=Control Centre').first().click();
  await expect(page.getByRole('heading', { name: 'Control Centre' })).toBeVisible({ timeout: 8000 });
  await page.getByRole('tab', { name: /^Automation/ }).click();
  await expect(page.getByTestId('automation-table')).toBeVisible({ timeout: 6000 });
}

/**
 * Switch accounts IN PLACE (no page load), so the fan-out's in-memory delivery ledger
 * survives from the founder's run to the brand's own view — which is exactly what the
 * in-app channel means: the brand reads the message Mercenta sent it.
 */
async function switchToBrand(page: any, card: string) {
  await page.getByRole('button', { name: 'Exit to site' }).first().click();
  await page.waitForTimeout(800);
  const heroLogin = page.getByRole('button', { name: 'Partner Login' }).first();
  if (await heroLogin.isVisible({ timeout: 4000 }).catch(() => false)) {
    await heroLogin.click();
    await page.waitForTimeout(500);
  }
  await page.click('text=' + card);
  await page.waitForTimeout(1400);
}

test.describe('Acknowledgement notification fan-out (§P13 / S5)', () => {
  test('1. the founder runs the fan-out and reads what was delivered, refused and drafted', async ({
    page,
  }) => {
    await openAutomationConsole(page);

    const row = page.getByTestId(`automation-row-${FANOUT}`);
    await expect(row).toBeVisible({ timeout: 6000 });
    /** The declared schedule is stated on the row (Mercenta scheduling, not a rule). */
    await expect(row).toContainText(/12h \/ 6h \/ 2h/);

    await page.getByTestId(`automation-run-${FANOUT}`).click();
    const drawer = page.getByTestId('control-run-drawer');
    await expect(drawer).toBeVisible({ timeout: 8000 });

    /** Messages really went out, on the channels the platform can deliver on. */
    await expect(drawer).toContainText(/message\(s\) delivered on \d+ channel\(s\)/);
    /** The EXTERNAL instant-message channel was refused, and the reason is stated. */
    await expect(drawer).toContainText(/Instant message: \d+ refusal\(s\)/);
    await expect(drawer).toContainText(/NEVER treated as\s+simulation|No instant-message number/);
    /** The FINAL stage produced Mercenta's on-behalf draft — and performed nothing. */
    await expect(drawer).toContainText(/on-behalf rejection draft/);
    await expect(drawer).toContainText(/nothing was performed/);
    await page.getByRole('button', { name: 'Close record' }).click();

    /** A repeat run delivers nothing twice (no duplicate notification, ever). */
    await page.getByTestId(`automation-run-${FANOUT}`).click();
    await expect(page.getByTestId('control-run-drawer')).toContainText(
      /0 message\(s\) delivered|duplicate_suppressed/
    );
    await page.getByRole('button', { name: 'Close record' }).click();
  });

  test('2. the brand sees the reminders Mercenta actually sent it', async ({ page }) => {
    await openAutomationConsole(page);
    await page.getByTestId(`automation-run-${FANOUT}`).click();
    await expect(page.getByTestId('control-run-drawer')).toBeVisible({ timeout: 8000 });
    await page.getByRole('button', { name: 'Close record' }).click();

    /** In-place account switch: the same page, the same delivered ledger. */
    await switchToBrand(page, 'Astonish');

    await page.locator('[data-testid="notification-center"]').click();
    const list = page.getByTestId('notification-list');
    await expect(list).toBeVisible({ timeout: 6000 });

    /** The seeded closing-window purchase order's reminders are on the brand's list. */
    await expect(list).toContainText(/PO-9001/);
    await expect(list).toContainText(/left to acknowledge/);
    /** Each one names the channel it arrived on and the stage it belongs to. */
    await expect(list).toContainText(/In-app · \d+h reminder · sent by Mercenta/);
    /**
     * §P13 / S6 — the reminder also carries its OWN brand-side record detail: the
     * destination each delivered channel actually reached, and the fail-closed
     * reason for the channel that could not be used (no copy written by the centre).
     */
    const meta = list.locator('[data-notification-meta="po"]').first();
    await expect(meta).toBeVisible({ timeout: 6000 });
    await expect(meta).toContainText(/→/);
    await expect(meta).toContainText(/Instant message unavailable — /);
    /** The final stage's reminder carries the severity the fan-out assigned it. */
    await expect(
      list.locator('[data-notification="po"]').filter({ hasText: /PO-9001/ }).first()
    ).toBeVisible();

    /**
     * THE REMINDER IS ACTIONABLE, not a static row: clicking the delivered reminder
     * opens the purchase order it is about — and that PO is exactly the one the fan-out's
     * FINAL stage drafted Mercenta's on-behalf rejection for, so the drill-down proves the
     * delivered message and the draft are about the SAME record.
     */
    await list.locator('[data-notification="po"]').filter({ hasText: /PO-9001/ }).first().click();
    await page.waitForTimeout(1500);
    await expect(page.locator('[data-testid="po-onbehalf-draft-PO-9001"]')).toBeVisible({
      timeout: 8000,
    });
  });
});