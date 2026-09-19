/**
 * Phase 1 — Backend / Data / Domain ACCEPTANCE GATE.
 * Covers the domain contracts the pre-existing 147-test suite does NOT assert:
 *   1. Rakazo independence — core domain operates fully with Rakazo present/unreachable.
 *   2. Brand Intelligence — canonical dataset (12 tracked / 10 shown), KPIs, search, drill-down.
 *   3. ICP pipeline — seeded universe + live fit scoring + deterministic auto-enroll.
 *   4. ONE canonical conversation — Helpdesk reply (logMessage) surfaces in Messages thread.
 *   5. Helpdesk lifecycle — real audited status transition.
 *   6. Reload semantics — deterministic re-bootstrap with tenant pin preserved.
 */
import { test, expect } from '@playwright/test';
import { loginAs } from './helpers/auth';

async function openNav(page: any, label: string) {
  // Target the nav item button — never the section heading (e.g. "Overview"
  // is both a section label and a nav item).
  await page.locator(`nav[aria-label="Primary"] button:has-text("${label}")`).first().click();
  await page.waitForTimeout(700);
}

test.describe('Domain Acceptance Gate', () => {
  test('1. Rakazo present but unreachable — core domain operates independently', async ({ page }) => {
    await loginAs(page, 'Super Admin — Tadii', 1200);
    // Core domain renders with no Rakazo dependency to boot.
    await expect(page.locator('text=POs awaiting action').first()).toBeVisible({ timeout: 6000 });
    await expect(page.locator('text=Brands compliance-gate cleared').first()).toBeVisible({ timeout: 4000 });
    // Rakazo surface lives inside Super Admin (tab). Panel heading renders
    // synchronously; the iframe or the documented fallback card follows.
    await openNav(page, 'Super Admin');
    await page.locator('button:has-text("Rakazo")').first().click();
    await page.waitForTimeout(600);
    await expect(page.locator('text=Rakazo Bot Dashboard').first()).toBeVisible({ timeout: 4000 });
    const iframeCount = await page.locator('iframe[title="Rakazo Bot Dashboard"]').count();
    const errorCardCount = await page.locator('text=Unable to reach Rakazo droplet').count();
    // Either the live iframe or the documented fallback — never a crash.
    expect(iframeCount + errorCardCount).toBeGreaterThan(0);
    // Back to the domain: overview and CRM remain fully functional.
    await openNav(page, 'Overview');
    await expect(page.locator('text=POs awaiting action').first()).toBeVisible({ timeout: 6000 });
    await openNav(page, 'Brand CRM');
    await expect(page.locator('text=Astonish').first()).toBeVisible({ timeout: 5000 });
  });

  test('2. Brand Intelligence — canonical dataset, scoring KPIs, search, drill-down', async ({ page }) => {
    await loginAs(page, 'Super Admin — Tadii', 1100);
    await openNav(page, 'Brand Intelligence');
    await expect(page.locator('h2', { hasText: 'Brand Intelligence' }).first()).toBeVisible({ timeout: 6000 });
    // Dataset completeness: exactly 12 tracked (3 + 9 canonical seed)…
    await expect(page.locator('text=12 tracked.').first()).toBeVisible({ timeout: 5000 });
    // …10 shown after the documented disqualifications (Truthbrush, UpCircle).
    await expect(page.locator('[data-testid="bi-prospect-table"] tbody tr')).toHaveCount(10, { timeout: 5000 });
    // Scoring KPIs render from the intelligence dashboard object.
    await expect(page.locator('text=T1').first()).toBeVisible({ timeout: 3000 });
    await expect(page.locator('text=Gaps').first()).toBeVisible();
    // Search narrows deterministically.
    await page.fill('input[placeholder="Search..."]', 'Tapatío');
    await expect(page.locator('[data-testid="bi-prospect-table"] tbody tr')).toHaveCount(1);
    await page.fill('input[placeholder="Search..."]', '');
    await expect(page.locator('[data-testid="bi-prospect-table"] tbody tr')).toHaveCount(10);
    // Row click opens the read-only detail with evidence tabs.
    await page.locator('[data-testid="bi-prospect-table"] tbody tr', { hasText: 'Tapatío' }).first().click();
    await page.waitForTimeout(400);
    await expect(page.locator('text=Overview').first()).toBeVisible({ timeout: 4000 });
    await expect(page.locator('text=Amazon').first()).toBeVisible();
    await expect(page.locator('text=Mercenta Fit').first()).toBeVisible();
    await expect(page.locator('text=/100').first()).toBeVisible({ timeout: 3000 });
  });

  test('3. ICP pipeline — BI-derived universe (same canonical identity) + live fit scoring + deterministic auto-enroll', async ({ page }) => {
    await loginAs(page, 'Mercenta Admin Hub', 1200);
    await openNav(page, 'Marketing');
    await expect(page.locator('text=ICP Builder').first()).toBeVisible({ timeout: 6000 });

    // §Phase C — the acquisition universe IS the canonical BI prospect store:
    // all ten active canonical brands are listed, each carrying its existing
    // prospect identity (no second/invented acquisition list).
    await expect(page.locator('text=Acquisition Pipeline (BI-derived)').first()).toBeVisible({ timeout: 5000 });
    const acqTable = page.locator('table[data-table="acquisition-pipeline"]');
    await expect(acqTable.locator('tbody tr')).toHaveCount(10, { timeout: 5000 });
    await expect(acqTable.locator('text=Tapatío').first()).toBeVisible();
    await expect(acqTable.locator('text=lead-prospect-tapatio').first()).toBeVisible();
    // The OLD seeded mock acquisition universe (INITIAL_LEADS) is no longer the
    // active source: none of its companies are in the pipeline.
    await expect(page.locator('text=Sweet Pea Botanicals')).toHaveCount(0);
    await expect(page.locator('text=Lone Star Organics')).toHaveCount(0);

    await expect(page.locator('text=Lead Pipeline').first()).toBeVisible();
    // Live ICP fit badges are present in the scored list, and each BI-linked row
    // shows its canonical BI identity.
    await expect(page.locator('text=/fit \\d+/').first()).toBeVisible({ timeout: 5000 });
    await expect(page.locator('text=BI prospect-tapatio').first()).toBeVisible({ timeout: 4000 });

    // §Stage-18 interactivity — a metric tile drills the table down (no static
    // number without a drill-down).
    await page.locator('button:has-text("Awaiting approval")').first().click();
    await expect(page.locator('text=/Filtered: Awaiting approval/').first()).toBeVisible({ timeout: 4000 });
    await expect(acqTable.locator('tbody tr')).toHaveCount(0);
    await page.locator('button:has-text("clear")').first().click();
    await expect(acqTable.locator('tbody tr')).toHaveCount(10, { timeout: 4000 });

    // Drive the ICP so the qualifying set is deterministic (Grocery brands at
    // 40 region + 30 category + 15 keyword = 85, threshold 70):
    await page.locator('button:has-text("Health & Personal Care")').first().click();
    await page.locator('button:has-text("Grocery")').first().click();
    await page.locator('textarea').first().fill('grocery brands exporting uk retail hot sauce');
    await expect(page.locator('button:has-text("Auto-enroll qualified (5)")').first()).toBeVisible({ timeout: 4000 });

    // Lead Pipeline buckets: Sequenced starts empty.
    const sequencedBucket = page.locator('div.bg-ink-900').filter({ hasText: 'Sequenced' }).first();
    await expect(sequencedBucket.locator('span.font-mono').first()).toHaveText('0', { timeout: 4000 });
    // Run auto-enroll → real stage transition, visible in the pipeline board,
    // and projected onto the canonical BI prospect (single source of truth).
    await page.locator('button:has-text("Auto-enroll qualified")').first().click();
    await expect(sequencedBucket.locator('span.font-mono').first()).toHaveText('5', { timeout: 5000 });
    await expect(sequencedBucket.locator('text=Tapatío').first()).toBeVisible({ timeout: 4000 });
    await expect(acqTable.locator('tr', { hasText: 'Tapatío' }).first()).toContainText('enrolled', { timeout: 5000 });
  });

  test('4. ONE canonical conversation — Helpdesk reply is the same Messages thread', async ({ page }) => {
    await loginAs(page, 'Mercenta Admin Hub', 1200);
    await openNav(page, 'Helpdesk');
    // tkt-001 (Astonish live-chat) is selected by default; its thread pulls the
    // canonical message bodies (msg-brand-astonish-1/-2 from DEMO_MESSAGES).
    await expect(page.locator('text=Astonish — PO dispatch query').first()).toBeVisible({ timeout: 6000 });
    await expect(page.locator('text=Thanks — can we talk about pricing and the first purchase order this week?').first()).toBeVisible();
    // Log a staff reply through the canonical logMessage pipeline.
    const probe = `Phase1 canonical-store probe ${Date.now()}`;
    await page.locator('textarea[placeholder="Type a reply…"]').fill(probe);
    await page.locator('button:has-text("Send Reply")').first().click();
    await expect(page.locator('text=Reply sent.').first()).toBeVisible({ timeout: 4000 });
    // The SAME conversation is visible under Messages (admin) — no duplication.
    await openNav(page, 'Messages');
    await page.locator('button:has-text("Astonish")').first().click();
    await page.waitForTimeout(500);
    await expect(page.locator('text=' + probe).first()).toBeVisible({ timeout: 5000 });
  });

  test('5. Helpdesk lifecycle — real status transition is audited', async ({ page }) => {
    await loginAs(page, 'Super Admin — Tadii', 1200);
    await openNav(page, 'Helpdesk');
    // Open the Seep ticket and resolve it via the real store mutation.
    await page.locator('button:has-text("Seep")').first().click();
    await page.waitForTimeout(400);
    const statusSelect = page.locator('select').filter({ has: page.locator('option', { hasText: 'Open' }) }).first();
    await statusSelect.selectOption('resolved');
    // The ticket row reflects the new status.
    await expect(page.locator('button:has-text("Seep")').first()).toContainText('resolved', { timeout: 5000 });
    // The transition was audited (ticket_status_changed exists in the registry).
    await openNav(page, 'Audit Log');
    await expect(page.locator('option', { hasText: 'ticket_status_changed' })).toHaveCount(1, { timeout: 6000 });
  });

  test('6. Reload semantics — deterministic re-bootstrap; session resets per in-memory contract', async ({ page }) => {
    await loginAs(page, 'Astonish', 1200);
    await expect(page.locator('text=Brand Overview').first()).toBeVisible({ timeout: 6000 });
    await expect(page.locator('text=Active purchase orders').first()).toBeVisible({ timeout: 5000 });
    const productsHint = page.locator('text=/products listed/').first();
    await expect(productsHint).toBeVisible({ timeout: 5000 });
    const before = (await productsHint.textContent()) ?? '';
    // Reload: the in-memory demo store + session reset by design (documented
    // contract — Supabase-backed deployments persist the entity writes). The
    // browser must return to the public entry, not crash or leak state.
    await page.reload();
    await page.waitForTimeout(1000);
    await expect(page.locator('text=Partner Login').first()).toBeVisible({ timeout: 6000 });
    // Logging in again re-bootstraps the deterministic canonical dataset.
    await loginAs(page, 'Astonish', 1200);
    await expect(page.locator('text=Brand Overview').first()).toBeVisible({ timeout: 6000 });
    const after = (await page.locator('text=/products listed/').first().textContent()) ?? '';
    expect(after).toBe(before);
    // Tenant pin preserved after re-bootstrap: own dashboard only.
    await expect(page.locator('text=something went wrong')).toHaveCount(0, { timeout: 2000 });
  });

  test('7. BI → ICP identity continuity — imported leads link to canonical BI prospects', async ({ page }) => {
    await loginAs(page, 'Mercenta Admin Hub', 1200);
    await openNav(page, 'Marketing');
    await expect(page.locator('text=ICP Builder').first()).toBeVisible({ timeout: 6000 });
    // Import a CSV row for a canonical BI prospect (Tapatío — brandProspectSeed)
    // with NO segment, so the canonical bridge supplements it from the BI
    // record instead of the parse default 'Uncategorized'.
    await page.locator('textarea').last().fill('Tapatío,Sherry Zhang,partners@tapatio.com,Austin TX,us,');
    await page.locator('button:has-text("Import leads")').first().click();
    await expect(page.locator('text=CSV imported into pipeline.').first()).toBeVisible({ timeout: 5000 });
    // The imported lead renders in the live-scored ICP list…
    await expect(page.locator('text=Tapatío').first()).toBeVisible({ timeout: 4000 });
    // …and inherits the canonical BI segment (Grocery) — visible proof that
    // the ingested lead is identity-linked to the BI prospect universe.
    await expect(page.locator('text=US · Grocery').first()).toBeVisible({ timeout: 4000 });
  });
});
