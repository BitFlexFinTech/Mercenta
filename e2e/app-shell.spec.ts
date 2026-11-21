/**
 * §Phase 6 — Application shell & navigation browser verification.
 *
 * Covers the redesigned shell/navigation: role-specific navigation
 * (Super Admin / Admin / Brand / Carrier), grouped IA with section headings,
 * active-item semantics (aria-current, data-state), canonical breadcrumbs,
 * mobile drawer mechanics (toggle + aria-expanded, backdrop, Escape, focus
 * return, single nav tree), keyboard accessibility, RBAC navigation hiding,
 * Super Admin Simulation + Design System reachability, and no horizontal
 * overflow at the seven target viewports (with screenshots).
 *
 * Dev server started by playwright.config.ts (npm run dev, :5182).
 */
import { test, expect } from '@playwright/test';
import { loginAs as loginAsPortal, openLogin } from './helpers/auth';

const SHOTS = 'test-screenshots/app-shell';

/** Login via the one-click demo card, handling the marketing mobile menu. */
async function loginAs(page: import('@playwright/test').Page, card: string) {
  await loginAsPortal(page, card, 1000);
}

test.describe('App Shell — role coverage & grouped IA', () => {
  test('Super Admin — all sections and items render', async ({ page }) => {
    await loginAs(page, 'Super Admin — Tadii');
    const nav = page.locator('nav[aria-label="Primary"]');
    for (const heading of [
      'Overview', 'Operations', 'Brands', 'Catalogue', 'Commerce', 'Finance',
      'Compliance', 'Communications', 'Support', 'Monitoring', 'Administration', 'Integrations',
    ]) {
      await expect(nav.locator(`text=${heading}`).first()).toBeVisible();
    }
    for (const item of ['Brand CRM', 'Marketing', 'Brand Intelligence', 'Global Catalog',
      'Fulfillment Track', 'Retail Pipeline', 'Purchase Orders', 'Returns Tracking',
      'Billing', 'Contract Cycle', 'Logistics Hub',
      'Compliance Approvals', 'Messages', 'Helpdesk', 'Monitoring',
      'Super Admin', 'Audit Log', 'Onboarding Tours',
      'Integration Settings']) {
      await expect(nav.locator(`text=${item}`).first()).toBeVisible();
    }
    /* §P9 (programme decision 4) — REPOINTED: 'Carrier Monitor' was in the list
       above and is now asserted ABSENT (the destination is removed). */
    await expect(nav.locator('text=Carrier Monitor')).toHaveCount(0);
  });

  test('Admin — grouped IA renders', async ({ page }) => {
    await loginAs(page, 'Mercenta Admin Hub');
    const nav = page.locator('nav[aria-label="Primary"]');
    for (const heading of ['Overview', 'Operations', 'Brands', 'Catalogue', 'Commerce', 'Finance', 'Compliance', 'Communications', 'Support', 'Monitoring', 'Administration']) {
      await expect(nav.locator(`text=${heading}`).first()).toBeVisible();
    }
    /* §2026-10-13 — REPOINTED (rule 07), not weakened. The 'Integrations' group used
       to hold TWO items: 'Integration Settings' (Super-Admin-only) and 'WhatsApp'
       (visible to every admin). The WhatsApp/Twilio feature was removed, so the
       group's only remaining item is Super-Admin-only, and the shell — which never
       renders an empty group — correctly drops the heading for a normal admin. The
       heading is asserted ABSENT here and VISIBLE for the Super Admin in the test
       above. */
    await expect(nav.locator('text=Integrations')).toHaveCount(0);
    await expect(nav.locator('text=Brand CRM').first()).toBeVisible();
    await expect(nav.locator('text=Billing').first()).toBeVisible();
  });

  test('Brand — grouped IA renders with brand sections', async ({ page }) => {
    await loginAs(page, 'Tapatío');
    const nav = page.locator('nav[aria-label="Primary"]');
    for (const heading of ['Overview', 'Operations', 'Catalogue', 'Compliance', 'Insights', 'Account']) {
      await expect(nav.locator(`text=${heading}`).first()).toBeVisible();
    }
    // §BATCH 5 (2026-10-10) — REPOINTED. The brand nav item 'Mercenta Social' was
    // asserted VISIBLE here; the owner removed the feature COMPLETELY, so the item
    // is now asserted ABSENT (the same strength, inverted — the source-level guard
    // lives in scripts/validate-retired-platforms.mjs).
    for (const item of ['Dashboard', 'Product Catalog', 'Purchase Orders', 'Returns',
      'Logistics Hub', 'Onboarding & Legal', 'UK Compliance', 'Contracts',
      'Analytics', 'Market Intel', 'Reports', 'Documents & Account',
      'Support & Team', 'Settings']) {
      await expect(nav.locator(`text=${item}`).first()).toBeVisible();
    }
    await expect(nav.locator('text=Mercenta Social')).toHaveCount(0);
    await expect(page.locator('text=Mercenta Social')).toHaveCount(0);
  });

  /**
   * §P9 (programme decision 4) — REPOINTED from 'Carrier — three items, no section
   * headings, correct default'. That test drove the carrier shell's three nav
   * items (Manifest Management / BAK Logistics Hub / API Request Auditor). The
   * whole surface is REMOVED — a carrier never logs into Mercenta — so the
   * assertion is now the REMOVAL contract: no carrier login card, no carrier nav
   * and no carrier address (fail-closed at the address layer).
   */
  test('§P9 the carrier surface is gone: no login card, no nav, no address', async ({ page }) => {
    await openLogin(page);
    await expect(page.locator('text=3PL Carrier Terminal')).toHaveCount(0);
    await expect(page.locator('text=Manifest Management')).toHaveCount(0);

    await page.goto('/carrier/manifest');
    /* A removed product address is NOT an address: it resolves to the public site
       (fail-closed), so the assertion is that the PUBLIC entry renders and no
       carrier surface exists — not a guessed shell. */
    await expect(page.getByRole('button', { name: 'Partner Login' }).first()).toBeVisible({
      timeout: 10000,
    });
    const nav = page.locator('nav[aria-label="Primary"]');
    await expect(nav).toHaveCount(0);
    await expect(page.locator('text=BAK Logistics Hub')).toHaveCount(0);
    await expect(page.locator('text=API Request Auditor')).toHaveCount(0);
    await expect(page.locator('text=Carrier Monitor')).toHaveCount(0);
  });
test.describe('App Shell — active state, breadcrumbs, grouping', () => {
  test('Super Admin — active item has aria-current + data-state; breadcrumb updates', async ({ page }) => {
    await loginAs(page, 'Super Admin — Tadii');
    const nav = page.locator('nav[aria-label="Primary"]');
    const active = nav.locator('[aria-current="page"]');
    await expect(active).toHaveCount(1);
    await expect(active.first()).toContainText('Overview');
    await expect(active.first()).toHaveAttribute('data-state', 'active');
    // Breadcrumb on overview collapses the section (no "Overview › Admin Overview").
    await expect(page.locator('nav[aria-label="Breadcrumb"]')).toContainText('Admin Overview');

    await nav.locator('text=Brand CRM').first().click();
    await page.waitForTimeout(800);
    const active2 = nav.locator('[aria-current="page"]');
    await expect(active2).toHaveCount(1);
    await expect(active2.first()).toContainText('Brand CRM');
    await expect(active2.first()).toHaveAttribute('data-state', 'active');
    const breadcrumb = page.locator('nav[aria-label="Breadcrumb"]');
    await expect(breadcrumb).toContainText('Brands');
    await expect(breadcrumb).toContainText('Brand CRM');
  });

  test('Admin — grouping is structural (Operations is the action centre)', async ({ page }) => {
    /**
     * §Dashboard-cleanup P1 — REPOINTED, not weakened.
     *
     * OLD CONTRACT: this test asserted that the COMMERCE group contained
     * "Purchase Orders" (and "Fulfillment Track" / "Returns Tracking") — the
     * pre-cleanup IA, where operational queues were scattered across Commerce and
     * Logistics.
     *
     * NEW CONTRACT: OPERATIONS is the single action centre, so the operational
     * queues must be grouped THERE, and Commerce must no longer carry them. The
     * assertion is stronger than before: it checks the new grouping AND the
     * absence of the old one.
     */
    await loginAs(page, 'Mercenta Admin Hub');
    const nav = page.locator('nav[aria-label="Primary"]');
    const operations = nav
      .locator('div', { hasText: 'Operations' })
      .filter({ has: page.locator('text=Purchase Orders') })
      .first();
    await expect(operations).toContainText('Work Management');
    await expect(operations).toContainText('Purchase Orders');
    await expect(operations).toContainText('Logistics Hub');
    await expect(operations).toContainText('Returns Tracking');
    /* §P9 — REPOINTED: 'Carrier Monitor' was asserted present here; the
       destination is removed, so it is asserted absent instead. */
    await expect(operations).not.toContainText('Carrier Monitor');
    await expect(operations).toContainText('Calendar');
    // The old home for these queues no longer holds them.
    const commerce = nav.locator('div', { hasText: 'Commerce' }).first();
    await expect(commerce).toContainText('Fulfillment Track');
    await expect(commerce).toContainText('Retail Pipeline');
    await expect(commerce).not.toContainText('Purchase Orders');
  });

  test('Brand — Dashboard active by default with Overview breadcrumb', async ({ page }) => {
    await loginAs(page, 'Tapatío');
    const nav = page.locator('nav[aria-label="Primary"]');
    const active = nav.locator('[aria-current="page"]');
    await expect(active).toHaveCount(1);
    await expect(active.first()).toContainText('Dashboard');
    await expect(page.locator('nav[aria-label="Breadcrumb"]')).toContainText('Dashboard');
  });
});

test.describe('App Shell — RBAC navigation', () => {
  test('Non-super Admin does not see super-only views in the nav', async ({ page }) => {
    await loginAs(page, 'Mercenta Admin Hub');
    const nav = page.locator('nav[aria-label="Primary"]');
    await expect(nav.locator('text=Super Admin')).toHaveCount(0);
    await expect(nav.locator('text=Audit Log')).toHaveCount(0);
    await expect(nav.locator('text=Integration Settings')).toHaveCount(0);
    // Admin-relevant items remain.
    await expect(nav.locator('text=Brand CRM').first()).toBeVisible();
    await expect(nav.locator('text=Billing').first()).toBeVisible();
  });

  test('Brand — admin-only views hidden; render-side auth intact', async ({ page }) => {
    await loginAs(page, 'Tapatío');
    const nav = page.locator('nav[aria-label="Primary"]');
    await expect(nav.locator('text=Audit Log')).toHaveCount(0);
    await expect(nav.locator('text=Super Admin')).toHaveCount(0);
    await expect(nav.locator('text=Integration Settings')).toHaveCount(0);
  });
});

test.describe('App Shell — Super Admin destinations preserved', () => {
  test('Simulation Control and Design System remain reachable', async ({ page }) => {
    await loginAs(page, 'Super Admin — Tadii');
    await page.click('nav >> text=Super Admin');
    await page.waitForTimeout(700);
    await page.click('text=Simulation');
    await expect(page.locator('text=Simulation Control Centre').first()).toBeVisible({ timeout: 8000 });
    await page.click('text=Design System');
    await expect(page.locator('text=MERCENTA Design System').first()).toBeVisible({ timeout: 8000 });
  });
});
test.describe('App Shell — mobile drawer', () => {
  test('single nav tree, closed by default, toggle opens with correct aria', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await loginAs(page, 'Super Admin — Tadii');
    const toggle = page.getByTestId('app-menu-toggle');
    await expect(toggle).toHaveAttribute('aria-expanded', 'false');
    // One DOM tree only — no duplicated desktop/mobile navigation.
    await expect(page.locator('aside')).toHaveCount(1);
    await expect(page.locator('nav[aria-label="Primary"]')).toHaveCount(1);
    // Closed drawer is fully off-canvas.
    const closed = await page.locator('nav[aria-label="Primary"]').boundingBox();
    expect(closed).not.toBeNull();
    expect(closed!.x + closed!.width).toBeLessThanOrEqual(1);

    await toggle.click();
    await expect(toggle).toHaveAttribute('aria-expanded', 'true');
    await expect(page.getByTestId('app-drawer-backdrop')).toBeVisible();
    // Let the transform transition finish before measuring position.
    await page.waitForTimeout(400);
    const open = await page.locator('nav[aria-label="Primary"]').boundingBox();
    expect(open!.x).toBeGreaterThanOrEqual(0);
    await page.screenshot({ path: `${SHOTS}/mobile-open-390.png` });
  });

  test('backdrop + Escape close the drawer; Escape returns focus to the toggle', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await loginAs(page, 'Super Admin — Tadii');
    const toggle = page.getByTestId('app-menu-toggle');

    // Backdrop click closes.
    await toggle.click();
    await expect(toggle).toHaveAttribute('aria-expanded', 'true');
    await page.getByTestId('app-drawer-backdrop').click({ position: { x: 350, y: 200 } });
    await expect(toggle).toHaveAttribute('aria-expanded', 'false');

    // Escape closes AND returns focus to the toggle.
    await toggle.click();
    await expect(toggle).toHaveAttribute('aria-expanded', 'true');
    await page.keyboard.press('Escape');
    await expect(toggle).toHaveAttribute('aria-expanded', 'false');
    const focused = await page.evaluate(() =>
      document.activeElement ? document.activeElement.getAttribute('data-testid') : null);
    expect(focused).toBe('app-menu-toggle');
    await page.screenshot({ path: `${SHOTS}/mobile-closed-390.png` });
  });

  test('selecting a nav item closes the drawer and navigates', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await loginAs(page, 'Super Admin — Tadii');
    const toggle = page.getByTestId('app-menu-toggle');
    await toggle.click();
    await page.locator('nav[aria-label="Primary"]').locator('text=Brand CRM').first().click();
    await page.waitForTimeout(900);
    await expect(toggle).toHaveAttribute('aria-expanded', 'false');
    const active = page.locator('nav[aria-label="Primary"] [aria-current="page"]');
    await expect(active).toHaveCount(1);
    await expect(active.first()).toContainText('Brand CRM');
  });
});

test.describe('App Shell — keyboard & skip link', () => {
  test('skip link is first in tab order and targets main content', async ({ page }) => {
    await loginAs(page, 'Super Admin — Tadii');
    for (let i = 0; i < 6; i++) {
      const t = await page.evaluate(() => document.activeElement?.textContent?.trim());
      if (t === 'Skip to content') break;
      await page.keyboard.press('Tab');
    }
    await expect
      .poll(() =>
        page.evaluate(() => document.activeElement?.textContent?.trim()))
      .toBe('Skip to content');
    await page.keyboard.press('Enter');
    await page.waitForTimeout(300);
    const focusedId = await page.evaluate(() => document.activeElement?.id);
    expect(focusedId).toBe('main-content');
  });

  test('primary nav reachable by keyboard with visible focus; active item stays identifiable', async ({ page }) => {
    await loginAs(page, 'Super Admin — Tadii');
    for (let i = 0; i < 30; i++) {
      const inNav = await page.evaluate(() => {
        const el = document.activeElement;
        return !!el && !!el.closest('nav[aria-label="Primary"]');
      });
      if (inNav) break;
      await page.keyboard.press('Tab');
    }
    const inNav = await page.evaluate(() => {
      const el = document.activeElement;
      return !!el && !!el.closest('nav[aria-label="Primary"]');
    });
    expect(inNav).toBe(true);
    // Visible keyboard focus-visible outline.
    const outline = await page.evaluate(() => {
      const el = document.activeElement as HTMLElement | null;
      if (!el) return false;
      const s = getComputedStyle(el);
      return s.outlineStyle !== 'none' && parseFloat(s.outlineWidth) > 0;
    });
    expect(outline).toBe(true);
    // The active (current) item is still identifiable via aria-current.
    await expect(page.locator('nav[aria-label="Primary"] [aria-current="page"]')).toHaveCount(1);
  });
});
test.describe('App Shell — responsive viewports', () => {
  const VIEWPORTS = [
    { name: '1440x900', w: 1440, h: 900 },
    { name: '1280x800', w: 1280, h: 800 },
    { name: '1024x768', w: 1024, h: 768 },
    { name: '768x1024', w: 768, h: 1024 },
    { name: '430x932', w: 430, h: 932 },
    { name: '390x844', w: 390, h: 844 },
    { name: '375x812', w: 375, h: 812 },
  ];

  for (const vp of VIEWPORTS) {
    test(`shell ${vp.name} — no horizontal overflow${vp.w < 1024 ? ', drawer present' : ''}`, async ({ page }) => {
      /*
       * §P3 — a REAL budget defect, not a weakened assertion (the same class of
       * fix the P2 pass applied to investor-demo 375x812). Each viewport variant
       * performs a full login, and a narrow-viewport run costs ~23-27s, which sits
       * within a hair of Playwright's 30s default and intermittently times out
       * under parallel load: 390x844 exceeded its budget at --workers=3 in the P3
       * full-suite run (the timeout landed inside `waitForTimeout` AFTER the drawer
       * opened, before any assertion), while the identical test passed at 22.8s in
       * isolation and its 430x932 / 375x812 siblings passed at 27.3s / 24.6s in the
       * same loaded run. `test.slow()` triples the ceiling only — every assertion
       * below, including the no-horizontal-overflow check, is unchanged.
       */
      test.slow();
      await page.setViewportSize({ width: vp.w, height: vp.h });
      await loginAs(page, 'Super Admin — Tadii');
      const toggle = page.getByTestId('app-menu-toggle');
      if (vp.w < 1024) {
        // Drawer toggle is the only navigation entry on narrow screens.
        await expect(toggle).toBeVisible();
        await toggle.click();
        await page.waitForTimeout(400);
      } else {
        // On desktop the drawer is always present and the toggle is hidden.
        await expect(toggle).not.toBeVisible();
      }
      await expect(page.locator('text=Admin Overview').first()).toBeVisible({ timeout: 8000 });
      const overflow = await page.evaluate(() =>
        document.documentElement.scrollWidth > document.documentElement.clientWidth + 1);
      expect(overflow).toBe(false);
      await page.screenshot({ path: `${SHOTS}/shell-${vp.name}.png` });
    });
  }

  test('desktop shell + active navigation screenshots (1440x900)', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await loginAs(page, 'Super Admin — Tadii');
    await expect(page.locator('text=Admin Overview').first()).toBeVisible({ timeout: 8000 });
    await page.screenshot({ path: `${SHOTS}/desktop-admin-overview.png` });
    await page.click('nav >> text=Brand CRM');
    await page.waitForTimeout(900);
    await expect(page.locator('nav[aria-label="Primary"] [aria-current="page"]').first())
      .toContainText('Brand CRM');
    await page.screenshot({ path: `${SHOTS}/desktop-admin-active-crm.png` });
  });
});

/**
 * §Wave-3 Part 4 gate — the app bar FITS a 390px viewport.
 *
 * The context zone was unshrinkable (`flex-shrink-0` around a long breadcrumb), so
 * the header's content measured 580px inside a 390px viewport; because the shell
 * root clips its overflow, the notification and profile controls were pushed off
 * screen and were UNREACHABLE at every mobile width — no spec noticed, because the
 * document itself never overflowed.
 *
 * MUTATION PROOF: restoring `flex-shrink-0` on the context zone fails the
 * `widestRight` assertion (580 > 390).
 */
test('app bar fits a mobile viewport: no header control is pushed off screen', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await loginAs(page, 'Super Admin — Tadii');

  const header = page.locator('header').first();
  await expect(header).toBeVisible({ timeout: 8000 });

  const fit = await header.evaluate((el) => {
    const box = el.getBoundingClientRect();
    const widestRight = Array.from(el.querySelectorAll<HTMLElement>('button, a, img, nav, span, div'))
      .map((child) => child.getBoundingClientRect().right)
      .reduce((a, b) => Math.max(a, b), box.left);
    return {
      scrollWidth: el.scrollWidth,
      clientWidth: el.clientWidth,
      widestRight: Math.round(widestRight),
      viewport: window.innerWidth,
    };
  });

  expect(fit.scrollWidth, 'the app bar does not overflow its own box').toBeLessThanOrEqual(
    fit.clientWidth + 1
  );
  expect(
    fit.widestRight,
    'no app-bar control (notifications, profile, exit) is pushed outside the viewport'
  ).toBeLessThanOrEqual(fit.viewport + 1);
});

/**
 * §OPENSHIP BATCH 5 — THE RAIL IS A FLOATING CARD, verified where it RENDERS.
 *
 * `scripts/validate-shared-surfaces.mjs` proves the rail's class strings. Only a
 * browser can prove the RESULT — that the rail really is inset, rounded, 260px
 * wide, that nothing paints a full-height column behind it, and that its rows
 * carry the reference's geometry. Every value below is read from
 * `getComputedStyle`/`getBoundingClientRect`, so a class that resolves to nothing
 * (the silent-no-op failure mode this project has recorded before) fails HERE.
 */
test.describe('§OPENSHIP BATCH 5 — the navigation rail is a floating card', () => {
  test('the rail floats, is 260px wide, and its rows carry the reference geometry', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await loginAs(page, 'Super Admin — Tadii');
    await expect(page.locator('text=Admin Overview').first()).toBeVisible({ timeout: 8000 });

    const rail = page.locator('#app-sidebar');
    const box = await rail.boundingBox();
    expect(box, 'the rail renders').not.toBeNull();

    const style = await rail.evaluate((el) => {
      const s = getComputedStyle(el);
      return {
        radius: s.borderTopLeftRadius,
        marginLeft: s.marginLeft,
        marginTop: s.marginTop,
        borderTopWidth: s.borderTopWidth,
        borderTopColor: s.borderTopColor,
      };
    });
    expect(style.radius, "the rail takes the reference's 16px container radius").toBe('16px');
    expect(style.marginLeft, "the rail floats with the reference's 12px start inset").toBe('12px');
    expect(style.marginTop, "the rail floats with the reference's 12px top inset").toBe('12px');
    expect(style.borderTopWidth, 'the rail draws its own 1px edge').toBe('1px');
    expect(
      style.borderTopColor,
      'the edge resolves to a REAL theme colour (derived, not transparent)'
    ).not.toBe('rgba(0, 0, 0, 0)');
    expect(Math.round(box!.width), "the card is the reference's 260px").toBe(260);

    const parent = await rail.evaluate((el) => {
      const p = getComputedStyle(el.parentElement as HTMLElement);
      return { bg: p.backgroundColor, borderRight: p.borderRightWidth };
    });
    expect(parent.bg, 'no full-height column is painted behind the card').toBe('rgba(0, 0, 0, 0)');
    expect(parent.borderRight, 'the full-height edge border is gone').toBe('0px');

    const row = page.locator('nav[aria-label="Primary"] button[data-state]').first();
    const rowStyle = await row.evaluate((el) => {
      const s = getComputedStyle(el);
      return { radius: s.borderTopLeftRadius, size: s.fontSize };
    });
    expect(rowStyle.radius, "the nav row takes the reference's 12px radius").toBe('12px');
    expect(
      rowStyle.size,
      'the nav row takes the canonical 14px body step (the type scale is the single owner)'
    ).toBe('14px');
    expect(
      (await row.boundingBox())!.height,
      'the row is a full-height target (the reference raises the rail rows by ~12px)'
    ).toBeGreaterThanOrEqual(40);

    await expect(page.getByTestId('nav-scroll-fade')).toHaveCount(1);

    /*
     * §OPENSHIP BATCH 5 — ACCESSIBILITY (better-accessibility, "one landmark, one name").
     * Read from the ACCESSIBILITY TREE, not the source: the rail's navigation landmark must
     * be reachable by exactly ONE name, and the complementary wrapper must not repeat it.
     */
    await expect(page.getByRole('navigation', { name: 'Primary' })).toHaveCount(1);
    await expect(page.getByRole('complementary', { name: 'Primary' })).toHaveCount(0);

    await page.screenshot({ path: `${SHOTS}/openship-batch5-rail-floating.png` });

    /* Collapsed: the reference's 72px card (and the inset still applies). */
    await page.getByTestId('nav-compact-toggle').click();
    await expect(rail).toHaveAttribute('data-nav-compact', 'true');
    await expect.poll(async () => Math.round((await rail.boundingBox())!.width)).toBe(72);
    await page.screenshot({ path: `${SHOTS}/openship-batch5-rail-collapsed.png` });
  });
});

/**
 * §OPENSHIP BATCH 6 — THE TOP BAR, verified where it RENDERS.
 *
 * The source gate proves the class strings; only a browser can prove the RESULT — that
 * the bar really is 56px, that it paints NO fill of its own, that its only separation is
 * the DERIVED edge at 40% of the theme's border, that its padding is the reference's
 * container ladder, and that every control is the reference's 36px (or 40px) control.
 * NOTE ON PROVENANCE: OpenShip has no desktop top bar (spec §3.1), so these values are
 * DERIVED from its mobile header and its control primitives — this test asserts the
 * DECISION, not a copied component.
 */
test.describe('§OPENSHIP BATCH 6 — the top bar is surface and type only', () => {
  test('the bar sits on the page, keeps its derived edge, and its controls are 36/40px', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await loginAs(page, 'Super Admin — Tadii');
    await expect(page.locator('text=Admin Overview').first()).toBeVisible({ timeout: 8000 });

    const bar = page.locator('header').first();
    const box = await bar.boundingBox();
    expect(box, 'the top bar renders').not.toBeNull();

    const style = await bar.evaluate((el) => {
      const s = getComputedStyle(el);
      return {
        height: s.height,
        padLeft: s.paddingLeft,
        bg: s.backgroundColor,
        borderBottomWidth: s.borderBottomWidth,
        borderBottomColor: s.borderBottomColor,
      };
    });
    expect(style.height, "the bar keeps the reference's 56px band height").toBe('56px');
    /*
     * §OPENSHIP BATCH 7 — REPOINTED, not weakened. The padding moved from the bar element onto
     * its INNER ROW so the bar and the page content share one leading edge; the measured
     * requirement is unchanged (24px at `sm`) and the bar element itself now carries none.
     */
    const rowPadLeft = await page
      .locator('header > div')
      .first()
      .evaluate((el) => getComputedStyle(el).paddingLeft);
    expect(rowPadLeft, "the bar's inner row takes the reference's LARGE padding step at `lg`").toBe('32px');
    expect(style.padLeft, 'the bar element itself carries no padding — its inner row owns it').toBe('0px');
    expect(style.bg, 'the bar paints NO fill of its own — it sits on the page').toBe('rgba(0, 0, 0, 0)');
    expect(style.borderBottomWidth, 'the derivative edge is a real 1px hairline').toBe('1px');

    /*
     * The edge is DERIVED: 40% of the theme's own border. Chrome
     * resolves `color-mix()` into `color(srgb … / a)`, other engines may emit `rgba(…)`, so
     * BOTH notations are read — the assertion is on the composed VALUE, not on a spelling.
     */
    const edge = style.borderBottomColor;
    const srgb = edge.match(/color\(srgb\s+([\d.]+)\s+([\d.]+)\s+([\d.]+)\s*\/\s*([\d.]+)\)/);
    const rgba = edge.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)(?:,\s*([\d.]+))?\)/);
    const redChannel = srgb ? Math.round(Number(srgb[1]) * 255) : rgba ? Number(rgba[1]) : NaN;
    const alpha = srgb ? Number(srgb[4]) : rgba?.[4] !== undefined ? Number(rgba[4]) : NaN;
    /* §BRAND REDESIGN (2026-11-19) — REPOINTED, NOT WEAKENED. This used to hardcode
       the retired light theme's border (#E8E8E8 → red 232). The approved default is
       now `brand-dark` (#2B2B2B → red 43), so a hardcoded channel would be measuring
       a theme that no longer loads. The intent is unchanged and is now theme-agnostic:
       the derived edge must keep the APPLIED theme's own border colour, read from the
       theme's token in the same document. */
    const expectedRed = await page.evaluate(() => {
      const hex = getComputedStyle(document.documentElement).getPropertyValue('--mr-hairline').trim();
      const m = hex.replace('#', '').match(/^([0-9a-f]{2})/i);
      return m ? parseInt(m[1], 16) : NaN;
    });
    expect(Number.isNaN(expectedRed), 'the applied theme declares a readable --mr-hairline').toBe(false);
    expect(redChannel, `the derived edge keeps the theme border's own colour (${edge})`).toBe(expectedRed);
    expect(alpha, "the edge is the reference's 40% of that border").toBeCloseTo(0.4, 2);

    /* The controls: the reference's 36px icon control and its 40px default button. */
    const search = page.getByTestId('app-search-trigger');
    expect((await search.boundingBox())!.height, "the command bar is the reference's 40px button").toBe(40);
    const searchFont = await search.evaluate((el) => getComputedStyle(el).fontSize);
    expect(searchFont, "the command bar takes the reference's 14px control type").toBe('14px');

    for (const [label, locator] of [
      ['the account control', page.locator('button[aria-controls="profile-menu"]')],
      ['the theme trigger', page.locator('[data-testid="theme-selector"] button').first()],
    ] as const) {
      expect((await locator.boundingBox())!.height, `${label} is the reference's 36px control`).toBe(36);
    }
    const bell = page.locator('[data-testid="notification-center"] button').first();
    const bellBox = await bell.boundingBox();
    expect(Math.round(bellBox!.width), 'the notification trigger is 36px SQUARE').toBe(36);
    expect(Math.round(bellBox!.height), 'the notification trigger is 36px SQUARE').toBe(36);

    await page.screenshot({ path: `${SHOTS}/openship-batch6-top-bar.png` });

    /* Below `lg` the drawer toggle appears and is the same 36px control. */
    await page.setViewportSize({ width: 900, height: 800 });
    const toggle = page.getByTestId('app-menu-toggle');
    await expect(toggle).toBeVisible();
    const toggleBox = await toggle.boundingBox();
    expect(Math.round(toggleBox!.width), 'the drawer toggle is the 36px icon control').toBe(36);
    expect(Math.round(toggleBox!.height), 'the drawer toggle is the 36px icon control').toBe(36);
    /* §BATCH 7 — and the bar's inner row steps DOWN one rung of the reference's ladder here. */
    expect(
      await page.locator('header > div').first().evaluate((el) => getComputedStyle(el).paddingLeft),
      "below `lg` the bar's inner row takes the reference's MEDIUM padding step"
    ).toBe('24px');
  });
});

/**
 * §OPENSHIP BATCH 7 — THE SHARED PAGE CONTAINER, THE ALIGNED BAR AND THE 340px RAIL,
 * verified where it RENDERS.
 *
 * The source gate proves both class strings and that they share one cap and one ladder;
 * only a browser can prove the RESULT — that the page content is really capped at 1600px and
 * centred in its column, that the app bar's first control sits on the SAME left edge as the
 * page title above it, and that a screen with a context column really renders a 340px rail.
 */
test.describe('§OPENSHIP BATCH 7 — the shared page container, the aligned bar and the 340px rail', () => {
  test('the content is capped and centred, the bar shares its edge, and the rail is 340px', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await loginAs(page, 'Super Admin — Tadii');
    const frame = page.locator('[data-workspace-frame]').first();
    await expect(frame).toBeVisible({ timeout: 8000 });
    const row = page.locator('header > div').first();

    const read = async () => ({
      frame: await frame.boundingBox(),
      row: await row.boundingBox(),
      main: await page.locator('#main-content').boundingBox(),
      padLeft: await frame.evaluate((el) => getComputedStyle(el).paddingLeft),
      padTop: await frame.evaluate((el) => getComputedStyle(el).paddingTop),
    });

    const narrow = await read();
    expect(narrow.padLeft, "the container takes the reference's large padding step").toBe('32px');
    expect(narrow.padTop, "the container takes the reference's 24px vertical step").toBe('24px');
    expect(
      Math.round(narrow.row!.x),
      "the app bar's first control sits on the page container's own leading edge"
    ).toBe(Math.round(narrow.frame!.x));

    /* Above 1600px the content is CAPPED and centred IN ITS COLUMN, and the bar follows it. */
    await page.setViewportSize({ width: 1920, height: 900 });
    await expect.poll(async () => Math.round((await frame.boundingBox())!.width)).toBe(1600);
    const wide = await read();
    expect(Math.round(wide.frame!.width), "the page content is capped at the reference's 1600px").toBe(1600);
    const leftGap = Math.round(wide.frame!.x - wide.main!.x);
    const rightGap = Math.round(wide.main!.x + wide.main!.width - (wide.frame!.x + wide.frame!.width));
    expect(Math.abs(leftGap - rightGap), `the capped content is CENTRED in its column (gaps ${leftGap}/${rightGap})`)
      .toBeLessThanOrEqual(1);
    expect(
      Math.round(wide.row!.x),
      'the bar is contained with it rather than stretched across the window'
    ).toBe(Math.round(wide.frame!.x));

    /* The context rail (spec §4.3) on a screen that genuinely has one. */
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.click('nav >> text=Super Admin');
    const rail = page.locator('[role="complementary"][aria-label="Context"]').first();
    await expect(rail).toBeVisible({ timeout: 8000 });
    expect(Math.round((await rail.boundingBox())!.width), "the context rail is the reference's 340px").toBe(340);
    await page.screenshot({ path: `${SHOTS}/openship-batch7-page-container.png` });
  });
});
});
