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

test('the console follows BOTH appearances, and offers the switcher', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(String(e)));
  await loginAs(page, 'Super Admin — Tadii');

  const consoleBg = async () => {
    await expect(page.getByRole('navigation', { name: 'Workspace navigation' })).toBeVisible({ timeout: 20000 });
    return page.locator('.mercenta-next').first().evaluate((el) => getComputedStyle(el).backgroundColor);
  };
  const luminance = (rgb: string) => {
    const parts = (rgb.match(/[0-9]+/g) ?? ['0', '0', '0']).slice(0, 3).map(Number);
    return 0.2126 * parts[0] + 0.7152 * parts[1] + 0.0722 * parts[2];
  };

  await page.goto('/?console=next');
  await page.evaluate(() => window.localStorage.setItem('mercenta.theme', 'brand-dark'));
  await page.reload();
  const dark = await consoleBg();

  await page.evaluate(() => window.localStorage.setItem('mercenta.theme', 'brand-light'));
  await page.reload();
  const light = await consoleBg();

  /* §PHASE B — the console must FOLLOW the appearance, not ignore it. Before this
     phase its palette was hardcoded light, so both readings were identical. */
  expect(dark === light, 'the console painted the SAME background in both appearances: ' + dark).toBe(false);
  expect(luminance(dark), 'brand-dark must paint a DARK console canvas, got ' + dark).toBeLessThan(128);
  expect(luminance(light), 'brand-light must paint a LIGHT console canvas, got ' + light).toBeGreaterThan(128);

  /* And the switcher must be reachable INSIDE the console (it was legacy-only). */
  await expect(page.locator('header button[aria-haspopup="menu"]').first()).toBeVisible();
  expect(errors).toEqual([]);
});
