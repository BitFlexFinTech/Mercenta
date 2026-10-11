/**
 * §BATCH 7 (Part 4.1a) — THE NOTIFICATION BELL'S RECORD DESTINATIONS.
 *
 * WHAT WAS WRONG
 * --------------
 * Five of the centre's fourteen item builders did NOTHING when clicked
 * (contract, score, submission, deduction, compliance) and the other nine landed
 * on a SECTION, never the record.
 *
 * WHAT THIS PROVES
 * ----------------
 * 1. every notice carries a real record destination (kind + view + id) — a notice
 *    that led nowhere would have no id to show;
 * 2. clicking one opens the RECORD it names, through the address;
 * 3. the deep link opens the record on a fresh load;
 * 4. THE DEFECT THIS BATCH FIXED — a deep link into the view you are ALREADY on
 *    still opens the record. The first reader captured the parameter ONCE at
 *    mount, so the panel did not remount and the click silently did nothing.
 *    Test 4 drives exactly that: it pushes the record onto the CURRENT view's
 *    address and dispatches the same `popstate` a product navigation dispatches.
 */
import { test, expect } from '@playwright/test';
import { loginAs } from './helpers/auth';

test.describe('Notification record destinations', () => {
  test('1. every notice carries a real record destination (no dead clicks)', async ({ page }) => {
    await loginAs(page, 'Super Admin — Tadii', 1400);
    await page.getByTestId('dashboard-loaded').waitFor({ timeout: 12000 });
    await page.locator('[data-testid="notification-center"]').click();
    const items = page.locator('[data-notification]');
    await expect(items.first()).toBeVisible({ timeout: 8000 });

    const count = await items.count();
    expect(count).toBeGreaterThan(0);
    for (let i = 0; i < count; i++) {
      const el = items.nth(i);
      const label = (await el.innerText()).slice(0, 60);
      expect(await el.getAttribute('data-record-kind'), `item "${label}" has no record kind`).toBeTruthy();
      expect(await el.getAttribute('data-record-view'), `item "${label}" has no destination view`).toBeTruthy();
      expect(await el.getAttribute('data-record-id'), `item "${label}" has no record id`).toBeTruthy();
    }
  });

  test('2. clicking a notice opens the RECORD it names, through the address', async ({ page }) => {
    await loginAs(page, 'Super Admin — Tadii', 1400);
    await page.getByTestId('dashboard-loaded').waitFor({ timeout: 12000 });
    await page.locator('[data-testid="notification-center"]').click();

    const first = page.locator('[data-notification]').first();
    await expect(first).toBeVisible({ timeout: 8000 });
    const view = await first.getAttribute('data-record-view');
    const id = await first.getAttribute('data-record-id');
    await first.click();
    await page.waitForTimeout(1500);

    /** The address names the owning view AND carries the record's own id. */
    expect(page.url()).toContain(`/admin/${view}`);
    expect(decodeURIComponent(new URL(page.url()).search)).toContain(id as string);
  });

  test('3. the deep link opens the record on a fresh load', async ({ page }) => {
    await loginAs(page, 'Super Admin — Tadii', 1200);
    await page.getByTestId('dashboard-loaded').waitFor({ timeout: 12000 });
    await page.goto('/admin/purchase_orders_admin?po=PO-9200');
    /** The record's OWN detail heading — present only when the record is open. */
    await expect(page.getByRole('heading', { name: 'PO-9200', exact: true })).toBeVisible({
      timeout: 8000,
    });
  });

  test('4. a deep link into the view you are ALREADY on still opens the record', async ({ page }) => {
    await loginAs(page, 'Super Admin — Tadii', 1200);
    await page.getByTestId('dashboard-loaded').waitFor({ timeout: 12000 });

    /** Land on the LIST (no record open). */
    await page.goto('/admin/purchase_orders_admin');
    const recordHeading = page.getByRole('heading', { name: 'PO-9200', exact: true });
    await expect(recordHeading).toHaveCount(0);

    /**
     * Now perform the SAME navigation a notice performs, from the view we are
     * already on: write the record into the address and dispatch the event every
     * product navigation dispatches. Before the fix the panel never remounted, so
     * the captured parameter stayed stale and nothing opened.
     */
    await page.evaluate(() => {
      const url = new URL(window.location.href);
      url.searchParams.set('po', 'PO-9200');
      window.history.pushState({}, '', url.toString());
      window.dispatchEvent(new PopStateEvent('popstate'));
    });

    await expect(recordHeading).toBeVisible({ timeout: 8000 });
  });
});
