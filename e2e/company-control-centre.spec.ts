/**
 * §22–§25 / M13 Phase 9 — COMPANY / GOVERNMENT CONTROL CENTRE (browser
 * verification, Super Admin surface).
 *
 * Proves the founder's compliance surface is REAL in the UI:
 *   1. it renders with Mercenta's founder-supplied identity, admits that the
 *      register has not been read, states that Mercenta submits nothing, and
 *      shows HMRC as READY / NOT CONNECTED;
 *   2. [Read company record] performs a real registrar read through the
 *      simulation-first adapter and labels the result SIMULATED;
 *   3. the approval gate is real: with no registrar-read due date, approval is
 *      refused with a truthful message, and the "file via connected service"
 *      action refuses because no official filing channel exists;
 *   4. a government credential can be stored, and only a MASK is ever rendered —
 *      the value never appears in the DOM.
 */
import { test, expect } from '@playwright/test';
import { loginAs } from './helpers/auth';

async function openCompanyCentre(page: import('@playwright/test').Page) {
  await loginAs(page, 'Super Admin — Tadii', 1400);
  await page.locator('button:has-text("Super Admin")').first().click();
  await page.waitForTimeout(600);
  await page.locator('button:has-text("Company")').first().click();
  await page.waitForTimeout(600);
}

test.describe('Company / Government Control Centre', () => {
  test('1. it renders the company identity, the unread register and the honest notices', async ({ page }) => {
    const pageErrors: string[] = [];
    page.on('pageerror', (e) => pageErrors.push(String(e)));
    await openCompanyCentre(page);

    const centre = page.getByTestId('company-control-centre');
    await expect(centre).toBeVisible({ timeout: 8000 });
    await expect(centre).toContainText('Company Control Centre — Mercenta Partners Ltd');
    await expect(centre).toContainText('17457777');
    await expect(centre).toContainText('Mercenta holds no official electronic-filing channel');
    await expect(centre).toContainText('READY / NOT CONNECTED');
    // Nothing has been read, so no registrar fact is presented as known.
    await expect(page.getByTestId('company-record')).toContainText('not read from the register');
    await expect(page.getByTestId('company-workflow-stage')).toHaveValue('detect');
    expect(pageErrors).toEqual([]);
  });

  test('2. reading the register performs a real (simulated, labelled) registrar read', async ({ page }) => {
    await openCompanyCentre(page);
    await page.getByRole('button', { name: 'Read company record' }).click();
    await page.waitForTimeout(1500);

    await expect(page.getByTestId('company-read-message')).toContainText('Simulated registrar');
    await expect(page.getByTestId('company-record')).toContainText('SIMULATED REGISTRAR');
    await expect(page.getByTestId('company-officers-empty')).toContainText('Mercenta does not fill this in');
  });

  test('3. the approval gate and the no-filing-channel refusal are real', async ({ page }) => {
    await openCompanyCentre(page);
    await page.getByRole('button', { name: 'Read company record' }).click();
    await page.waitForTimeout(1500);

    // The simulated registrar returns no confirmation-statement date, so approval
    // must refuse rather than invent one.
    await page.getByRole('button', { name: 'Approve', exact: true }).click();
    await page.waitForTimeout(300);
    await expect(page.getByTestId('company-read-message')).toContainText('Read the register first');

    await page.getByRole('button', { name: 'File via connected service' }).click();
    await page.waitForTimeout(300);
    await expect(page.getByTestId('company-read-message')).toContainText('No official electronic-filing channel');
    await expect(page.getByTestId('company-workflow-stage')).toHaveValue('detect');
  });

  test('4. a government credential is stored as a mask and never rendered in full', async ({ page }) => {
    await openCompanyCentre(page);
    const secret = 'E2E-SECRET-9876';
    const row = page.getByTestId('gov-credential-ch_authentication_code');
    await row.locator('input[type="password"]').fill(secret);
    await row.getByRole('button', { name: 'Store as masked reference' }).click();
    await page.waitForTimeout(400);

    await expect(row).toContainText('stored');
    await expect(row).toContainText('9876');
    await expect(page.getByTestId('company-read-message')).toContainText('masked reference');
    const html = await page.content();
    expect(html).not.toContain(secret);
  });
});
