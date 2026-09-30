/**
 * §BATCH 2i (`AV-045`) — THE DELIVERY APPOINTMENT — BROWSER VERIFICATION.
 *
 * The gate (`scripts/validate-delivery-appointment.mjs`) proves the DOMAIN
 * behaviour by executing the real modules. This spec proves the SAME behaviour is
 * actually PRESENT in the running product:
 *   1  the consignment inspector shows the appointment, with its state and the
 *      window rule's verdict exposed as data (never a bare label);
 *   2  the ETA-coverage tile opens the per-consignment detail, and every
 *      consignment there carries an appointment whose state and window code are
 *      from the channel's documented vocabulary — never an invented one;
 *   3  the window rule's own words are always rendered (inside the window, or a
 *      stated refusal) — compliance is never silently assumed.
 */
import { test, expect } from '@playwright/test';
import { loginAs } from './helpers/auth';

const APPOINTMENT_STATES = [
  'Pending',
  'Scheduled',
  'Arrived',
  'Deleted',
  'Cancelled',
  'Defect',
  'Closed',
  'unknown',
];
const WINDOW_CODES = ['within-window', 'before-window', 'after-window', 'no-delivery-window', 'undocumented-date'];

async function openLogisticsHub(page: any) {
  await loginAs(page, 'Tapatío', 1100);
  await page.click('nav[aria-label="Primary"] >> text=Logistics Hub');
  await page.waitForTimeout(1200);
}

test.describe('Batch 2i — the delivery appointment is a real, honest surface', () => {
  test('1. the consignment inspector shows the appointment and the window verdict', async ({ page }) => {
    await openLogisticsHub(page);
    const row = page.locator('[data-testid^="logistics-row-"]').first();
    await expect(row).toBeVisible({ timeout: 8000 });
    await row.click();
    await page.waitForTimeout(600);

    const appointment = page.getByTestId('logistics-appointment');
    await expect(appointment).toBeVisible({ timeout: 6000 });
    expect(APPOINTMENT_STATES).toContain(await appointment.getAttribute('data-appointment-state'));
    expect(WINDOW_CODES).toContain(await appointment.getAttribute('data-appointment-window'));
    await expect(appointment).toContainText(/Delivery appointment:/);
    await expect(page.getByTestId('logistics-appointment-basis')).toBeVisible();
  });

  test('2. the ETA-coverage tile opens the detail, and every consignment names a documented state', async ({ page }) => {
    await openLogisticsHub(page);
    await page.getByTestId('kpi-eta-coverage').click();
    await page.waitForTimeout(600);

    const detail = page.getByTestId('eta-basis-detail');
    await expect(detail).toBeVisible({ timeout: 6000 });

    const lines = page.locator('[data-testid^="appointment-"]');
    const count = await lines.count();
    expect(count).toBeGreaterThan(0);
    for (let i = 0; i < count; i++) {
      expect(APPOINTMENT_STATES).toContain(await lines.nth(i).getAttribute('data-appointment-state'));
      expect(WINDOW_CODES).toContain(await lines.nth(i).getAttribute('data-appointment-window'));
    }
  });

  test('3. the window rule is always stated — inside the window, or a refusal with a reason', async ({ page }) => {
    await openLogisticsHub(page);
    await page.getByTestId('kpi-eta-coverage').click();
    await page.waitForTimeout(600);

    const lines = page.locator('[data-testid^="appointment-"]');
    const count = await lines.count();
    expect(count).toBeGreaterThan(0);
    for (let i = 0; i < count; i++) {
      const line = lines.nth(i);
      const text = (await line.textContent()) ?? '';
      const code = await line.getAttribute('data-appointment-window');
      if (code === 'within-window') {
        expect(text).toMatch(/falls within the purchase order/i);
      } else {
        expect(text).toMatch(/no delivery window|cannot be established|is before|is after/i);
      }
    }
  });
});
