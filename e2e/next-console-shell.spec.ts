import { test, expect } from '@playwright/test';
import { loginAs } from './helpers/auth';

/* §FRONTEND-REDESIGN BATCH A — the console SHELL itself. */ 
/* Two Owner-reported faults are pinned here, plus the workspace menus. */
test('the rail is fixed, branded, and each workspace shows its OWN menu', async ({ page }) => {
  await loginAs(page, 'Super Admin — Tadii');
  await page.goto('/?console=next');

  const nav = page.getByRole('navigation', { name: 'Workspace navigation' });
  await expect(nav).toBeVisible({ timeout: 20000 });

  /* 1. THE APPROVED LOCKUP. The rail used to print the brand as plain text, so the
        console carried no brand asset at all. */
  await expect(page.locator('aside img[alt*="Mercenta"]').first()).toBeVisible();

  /* 2. THE RAIL MUST NOT SCROLL WITH THE PAGE (Owner: "it should not scroll with
        the page"). Scroll the content area AND the window, then prove the rail has
        not moved a pixel and the window itself never scrolled. */
  const rail = page.locator('aside').first();
  const before = await rail.boundingBox();
  await page.locator('main').evaluate((el) => el.scrollTo(0, el.scrollHeight));
  await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
  const after = await rail.boundingBox();
  expect(after && before && after.y).toBe(before && before.y);
  expect(await page.evaluate(() => window.scrollY)).toBe(0);

  /* 3. EACH WORKSPACE HAS ITS OWN MENU (Owner: the menus "seem to stay the same").
        Only two of BWS's 22 labels exist in the admin menu, so this pins the
        DIFFERENCE: a workspace's own item must be present and another workspace's
        must be absent. */
  const surfaceTab = (name: string) => page.getByRole('tab', { name, exact: true });
  const navButton = (label: string) => nav.getByRole('button', { name: label, exact: true });

  await surfaceTab('BWS Workspace').click();
  await expect(navButton('Country Discovery')).toBeVisible({ timeout: 20000 });
  await expect(navButton('Control Centre')).toHaveCount(0);

  await surfaceTab('Talent Commerce').click();
  await expect(navButton('Royalties')).toBeVisible({ timeout: 20000 });
  await expect(navButton('Country Discovery')).toHaveCount(0);

  await surfaceTab('Operations Console').click();
  await expect(navButton('Control Centre')).toBeVisible({ timeout: 20000 });
  await expect(navButton('Royalties')).toHaveCount(0);
});
