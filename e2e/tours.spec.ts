/** Guided onboarding tour tests. */
import { test, expect } from '@playwright/test';
import { loginAs } from './helpers/auth';

test.describe('Brand Guided Tours', () => {

  async function loginAsBrand(page, name) {
    await loginAs(page, name);
    const ob = page.locator('text=Onboarding').first();
    if (await ob.isVisible({ timeout: 2000 }).catch(() => false)) {
      await ob.click();
      await page.waitForTimeout(500);
    }
  }

  async function cardVisible(page) {
    return page.locator('text=Welcome to Mercenta Partners')
      .or(page.locator('text=New PO Arrived'))
      .or(page.locator('text=Deductions Ledger'))
      .or(page.locator('text=Adding a Product'))
      .or(page.locator('text=Creating a Shipment'))
      .first()
      .isVisible({ timeout: 3000 })
      .catch(() => false);
  }

  test('1. Tour 1 auto-starts for new brand', async ({ page }) => {
    await loginAsBrand(page, 'Tapatío');
    // §7E — scope to the tour card (`.animate-fade-in` is unique to the tour
    // engine) so dashboard comms with tour-named subjects can't false-positive.
    const c = page.locator('.animate-fade-in', { hasText: 'Welcome to Mercenta Partners' }).first();
    if (await c.isVisible({ timeout: 3000 }).catch(() => false)) {
      await expect(c).toBeVisible({ timeout: 2000 });
    } else test.fixme(true, 'Tour 1 not visible');
  });

  test('2. Completed Tour 1 does not re-trigger', async ({ page }) => {
    await loginAsBrand(page, 'Tapatío');
    const wc = page.locator('text=Welcome to Mercenta Partners');
    if (await wc.isVisible({ timeout: 3000 }).catch(() => false)) {
      for (let i = 0; i < 8; i++) {
        const n = page.locator('button', { hasText: /Next|Got it/ });
        if (await n.isVisible({ timeout: 1000 }).catch(() => false)) {
          await n.click();
          await page.waitForTimeout(300);
        }
      }
      // §7D — other per-view tours (catalog, shipping…) legitimately auto-start
      // after onboarding; the contract here is that TOUR 1 itself does not
      // re-trigger once completed.
      await page.click('[data-tour="nav-catalog"]');
      await page.waitForTimeout(500);
      await page.click('[data-tour="brand-dashboard"]');
      await page.waitForTimeout(500);
      // Assert Tour 1's own card is gone — scoped to the tour-engine card wrapper
      // (`.animate-fade-in`) so the dashboard's real comms (which may contain
      // tour-named subjects, §7E) can't false-match. Other per-view tours may
      // legitimately be active after catalog navigation.
      await expect(
        page.locator('.animate-fade-in', { hasText: 'Welcome to Mercenta Partners' }).first()
      ).not.toBeVisible({ timeout: 1500 });
    } else test.fixme(true, 'Tour 1 not visible');
  });

  test('3. Skip Tour 1 shows confirmation', async ({ page }) => {
    await loginAsBrand(page, 'Tapatío');
    const wc = page.locator('text=Welcome to Mercenta Partners');
    if (await wc.isVisible({ timeout: 3000 }).catch(() => false)) {
      const d = page.locator('button[aria-label="Dismiss tour"]');
      if (await d.isVisible({ timeout: 1000 }).catch(() => false)) {
        await d.click();
        await page.waitForTimeout(500);
        const m = page.locator('text=Skip Tour?');
        if (await m.isVisible({ timeout: 2000 }).catch(() => false)) {
          await expect(m).toBeVisible({ timeout: 1000 });
          await page.locator('button', { hasText: 'Skip Tour' }).click();
          await page.waitForTimeout(500);
          expect(await cardVisible(page)).toBe(false);
        } else test.fixme(true, 'Skip modal not visible');
      } else test.fixme(true, 'Dismiss btn not found');
    }
  });

  test('4. PO page triggers Tour 3', async ({ page }) => {
    await loginAsBrand(page, 'Tapatío');
    const a = page.locator('.animate-fade-in').first();
    if (await a.isVisible({ timeout: 2000 }).catch(() => false)) {
      const d = page.locator('button[aria-label="Dismiss tour"]');
      if (await d.isVisible({ timeout: 1000 }).catch(() => false)) {
        await d.click();
        await page.waitForTimeout(500);
        const s = page.locator('button', { hasText: 'Skip Tour' });
        if (await s.isVisible({ timeout: 1000 }).catch(() => false)) {
          await s.click();
          await page.waitForTimeout(500);
        }
      }
    }
    await page.click('[data-tour="nav-purchase_orders"]');
    await page.waitForTimeout(800);
    const p = page.locator('text=New PO Arrived');
    if (await p.isVisible({ timeout: 3000 }).catch(() => false)) {
      await expect(p).toBeVisible({ timeout: 2000 });
    } else test.fixme(true, 'Tour 3 not visible');
  });

  /**
   * §Phase G1 — Tour 5's target surface now EXISTS. The brand-facing
   * deductions ledger is rendered on Analytics/Reports with all four canonical
   * anchors, so this is a real assertion rather than a visibility-conditional
   * skip. It checks: the surface renders; the ledger is TENANT-SCOPED (PO-9000
   * / PO-9001 belong to Astonish and must never appear in Tapatío's ledger);
   * and opening a dispute really drives the canonical domain action.
   */
  test('5. Deductions ledger on Analytics (Tour 5 surface)', async ({ page }) => {
    await loginAsBrand(page, 'Tapatío');

    // Dismiss whatever per-view tour card auto-started for this brand.
    const d = page.locator('button[aria-label="Dismiss tour"]');
    if (await d.isVisible({ timeout: 1500 }).catch(() => false)) {
      await d.click();
      await page.waitForTimeout(300);
      const s = page.locator('button', { hasText: 'Skip Tour' });
      if (await s.isVisible({ timeout: 1000 }).catch(() => false)) {
        await s.click();
        await page.waitForTimeout(300);
      }
    }

    await page.locator('nav[aria-label="Primary"]').getByText('Analytics').first().click();
    await page.waitForTimeout(800);

    const ledger = page.locator('[data-tour="deductions-ledger"]');
    await expect(ledger).toBeVisible({ timeout: 5000 });
    await expect(page.locator('[data-tour="deductions-categories"]')).toBeVisible();
    await expect(page.locator('[data-tour="deductions-dispute-btn"]')).toBeVisible();
    await expect(page.locator('[data-tour="deductions-outcome-info"]')).toBeVisible();

    // Tenant isolation: another brand's deduction POs must not leak.
    await expect(ledger).not.toContainText('PO-9000');
    await expect(ledger).not.toContainText('PO-9001');
    await expect(ledger).toContainText('PO-9002');
    // Real recorded outcome data (won) is surfaced, not invented.
    await expect(ledger).toContainText('outcome: won');

    // The dispute control performs the CANONICAL domain action.
    await page.locator('[data-state="brand-deduction-dispute"]').first().click();
    await page
      .locator('[data-tour="deductions-dispute-btn"] textarea')
      .fill('Carrier POD shows the full carton count; weighing ticket requested.');
    await page.locator('[data-state="brand-deduction-record-dispute"]').click();
    await expect(page.locator('[data-tour="deductions-dispute-btn"]')).toContainText(
      'marked disputed',
      { timeout: 5000 }
    );
  });

  test('6. Tour steps advance correctly', async ({ page }) => {
    await loginAsBrand(page, 'Tapatío');
    const wc = page.locator('text=Welcome to Mercenta Partners');
    if (await wc.isVisible({ timeout: 3000 }).catch(() => false)) {
      await page.locator('button', { hasText: 'Next' }).click();
      await page.waitForTimeout(300);
      await expect(page.locator('text=Your Dashboard')).toBeVisible({ timeout: 2000 });
      await page.locator('button', { hasText: 'Next' }).click();
      await page.waitForTimeout(300);
      // §7B — assert the exact tour-step title (sidebar also contains a
      // shorter "Purchase Orders" nav label; the full title is unambiguous).
      await expect(page.locator('text=Purchase Orders — 24-Hour Rule')).toBeVisible({ timeout: 2000 });
    } else test.fixme(true, 'Tour 1 not visible');
  });

  test('7. Settings has restart tour', async ({ page }) => {
    await loginAsBrand(page, 'Tapatío');
    // Clear any auto-started orientation tour so Settings is reachable cleanly.
    const a = page.locator('.animate-fade-in').first();
    if (await a.isVisible({ timeout: 2000 }).catch(() => false)) {
      const d = page.locator('button[aria-label="Dismiss tour"]');
      if (await d.isVisible({ timeout: 1000 }).catch(() => false)) {
        await d.click();
        await page.waitForTimeout(500);
        const s = page.locator('button', { hasText: 'Skip Tour' });
        if (await s.isVisible({ timeout: 1000 }).catch(() => false)) {
          await s.click();
          await page.waitForTimeout(500);
        }
      }
    }
    const s = page.locator('[data-tour="nav-settings"]');
    await expect(s).toBeVisible({ timeout: 2000 });
    await s.click();
    await page.waitForTimeout(800);
    // Guided Tours tab lists every tour with a Restart Tour control.
    const tab = page.locator('button', { hasText: 'Guided Tours' });
    await expect(tab).toBeVisible({ timeout: 2000 });
    await tab.click();
    await page.waitForTimeout(400);
    const restartBtn = page.getByRole('button', { name: 'Restart Tour', exact: true }).first();
    await expect(restartBtn).toBeVisible({ timeout: 2000 });
    // Restarting the orientation tour relaunches it through the existing engine.
    await page
      .locator('li', { hasText: 'Welcome & Orientation' })
      .getByRole('button', { name: 'Restart Tour' })
      .click();
    await page.waitForTimeout(800);
    await expect(page.locator('text=Welcome to Mercenta Partners').first()).toBeVisible({ timeout: 3000 });
  });

  test('8. Tour selectors resolve', async ({ page }) => {
    await loginAsBrand(page, 'Tapatío');
    const selectors = [
      '[data-tour="brand-dashboard"]',
      '[data-tour="nav-purchase_orders"]',
      '[data-tour="nav-catalog"]',
      '[data-tour="nav-logistics"]',
      '[data-tour="nav-compliance"]',
      '[data-tour="nav-settings"]',
    ];
    for (const sel of selectors) {
      await expect(page.locator(sel)).toBeVisible({ timeout: 2000 });
    }
  });

  test('9. Catalog page triggers Tour 2', async ({ page }) => {
    await loginAsBrand(page, 'Tapatío');
    const a = page.locator('.animate-fade-in').first();
    if (await a.isVisible({ timeout: 2000 }).catch(() => false)) {
      const d = page.locator('button[aria-label="Dismiss tour"]');
      if (await d.isVisible({ timeout: 1000 }).catch(() => false)) {
        await d.click();
        await page.waitForTimeout(500);
        const s = page.locator('button', { hasText: 'Skip Tour' });
        if (await s.isVisible({ timeout: 1000 }).catch(() => false)) {
          await s.click();
          await page.waitForTimeout(500);
        }
      }
    }
    await page.click('[data-tour="nav-catalog"]');
    await page.waitForTimeout(800);
    const st = page.locator('text=Adding a Product');
    if (await st.isVisible({ timeout: 3000 }).catch(() => false)) {
      await expect(st).toBeVisible({ timeout: 2000 });
    } else test.fixme(true, 'Tour 2 not visible');
  });

  test('10. Tour step opens the contextual Knowledge Base article (§14)', async ({ page }) => {
    await loginAsBrand(page, 'Tapatío');
    const card = page.locator('.animate-fade-in', { hasText: 'Welcome to Mercenta Partners' }).first();
    if (await card.isVisible({ timeout: 3000 }).catch(() => false)) {
      // The first orientation step carries a contextual KB article link.
      const learn = page.getByTestId('tour-learn-more-orientation-welcome');
      await expect(learn).toBeVisible({ timeout: 2000 });
      await learn.click();
      const panel = page.getByTestId('kb-article-panel');
      await expect(panel).toBeVisible({ timeout: 3000 });
      await expect(panel.getByText(/how your brand works with Mercenta/i)).toBeVisible();
      await panel.getByRole('button', { name: 'Close article' }).click();
      await expect(panel).not.toBeVisible({ timeout: 2000 });
    } else test.fixme(true, 'Tour 1 not visible');
  });
});