/**
 * §PHASE D — THE CANONICAL TABLE CONTRACT, VERIFIED BY RENDERING.
 *
 * WHY THIS SPEC EXISTS
 * --------------------
 * `scripts/validate-canonical-tables.mjs` proves, from the source, which tables carry the
 * canonical contract. A source check cannot prove the contract REACHES THE SCREEN: Tailwind
 * could drop the class, a wrapper could override the size, or the primitive could render its
 * card list instead of a table at the viewport in use. Registry row
 * `discovered-hand-rolled-tables-outside-the-canonical-primitive` exists because the product
 * rendered the same data at two different sizes on one screen — a defect no static check saw.
 *
 * So this spec drives a real browser to a migrated surface and asserts what a reader sees:
 *   · the table IS the canonical primitive (`scope="col"` on every header, a real caption);
 *   · cells render at the declared body step (14px) and headers at the label step (12px);
 *   · the row count equals the count the SCREEN ITSELF declares, so the migration lost no data.
 *
 * One test per migrated surface, added in the same change as the migration. TamSamDisplay is
 * the first (2026-11-28); the remaining slices of the row add theirs.
 */
import { test, expect } from '@playwright/test';

test.describe('§PHASE D — canonical table contract', () => {
  test('the TAM/SAM category breakdown renders through the canonical DataTable', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    /* §REPOINTED — WHERE THIS SURFACE ACTUALLY LIVES. Since the owner's 2026-11-27 decision a
       session sees the NEW console by default (`src/App.tsx`, `readConsoleMode`), and the console
       has no TAM/SAM screen. `InvestorPitchSection` — the only caller of `TamSamBreakdown` — is
       rendered by the LEGACY admin shell (`AdminShell` -> `SuperAdminPanel`, tab `pitch`), which
       is still shipped behind `?console=legacy`. The shell choice must survive the login, and
       `openLogin()` starts by navigating to `/` (which drops the query), so this test performs
       the same real entry steps itself against the legacy address. */
    await page.goto('/?console=legacy');
    const partnerLogin = page.getByRole('button', { name: 'Partner Login' }).first();
    await expect(partnerLogin).toBeVisible({ timeout: 15000 });
    await partnerLogin.click();
    await page.waitForTimeout(600);
    await page.click('text=Super Admin — Tadii');
    await page.waitForTimeout(1200);

    const legacyNav = page.getByRole('navigation', { name: 'Primary' });
    /* The legacy sidebar groups its items under collapsible headings, so "Super Admin" is not
       necessarily visible — the sidebar's OWN "Filter navigation" control is the real affordance
       a user has, and using it keeps this test independent of which group is expanded. */
    await page.getByRole('searchbox', { name: 'Filter navigation' }).fill('Super Admin');
    await page.waitForTimeout(300);
    await legacyNav.getByRole('button', { name: /Super Admin/ }).first().click({ timeout: 15000 });
    await page.waitForTimeout(600);
    await page.getByRole('button', { name: 'Investor Pitch', exact: true }).click();
    await page.waitForTimeout(500);

    /* The expander is addressed by its ACCESSIBLE NAME. It had none before this session — an
       unlabelled control a keyboard or screen-reader user could not identify. */
    const toggle = page.getByRole('button', { name: 'Expand category breakdown' });
    await expect(toggle).toBeVisible({ timeout: 8000 });
    await expect(toggle).toHaveAttribute('aria-expanded', 'false');
    await toggle.click();
    await expect(page.getByRole('button', { name: 'Collapse category breakdown' })).toHaveAttribute(
      'aria-expanded',
      'true'
    );

    const table = page.locator('table[data-table="tam-sam-categories"]');
    await expect(table).toBeVisible();

    // A REAL caption: present in the DOM and naming the table for assistive technology.
    await expect(table.locator('caption')).toHaveText('Category TAM and SAM breakdown');

    // Every header is scoped, so a screen reader can associate a cell with its column.
    const headers = table.locator('thead th');
    await expect(headers).toHaveCount(5);
    for (let i = 0; i < 5; i += 1) {
      await expect(headers.nth(i)).toHaveAttribute('scope', 'col');
    }

    /* The rendered sizes — the whole point of the row. Measured from the browser, not read
       from a class name: 14px is the declared `ds-body` step, 12px the `ds-label` step. */
    const sizes = await table.evaluate((el) => {
      const cell = el.querySelector('tbody td');
      const head = el.querySelector('thead th');
      return {
        cell: cell ? Number.parseFloat(getComputedStyle(cell).fontSize) : -1,
        head: head ? Number.parseFloat(getComputedStyle(head).fontSize) : -1,
      };
    });
    expect(sizes.cell).toBe(14);
    expect(sizes.head).toBe(12);

    /* DATASET COMPLETENESS: the row count equals the count the screen itself declares above
       the table ("N Categories"), so the migration is proved not to have dropped a row. */
    const declared = await page
      .locator('text=/^\\d+ Categories$/')
      .first()
      .innerText();
    const declaredCount = Number.parseInt(declared, 10);
    expect(declaredCount).toBeGreaterThan(0);
    await expect(table.locator('tbody tr')).toHaveCount(declaredCount);
  });
});