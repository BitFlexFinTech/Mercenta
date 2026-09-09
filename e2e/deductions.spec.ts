/**
 * Phase 7D - Deductions Ledger tests.
 *
 * The canonical deduction ledger is the admin Retail Pipeline (the Billing view
 * only shows invoice/remittance summaries). The ledger's data contract: the
 * demoDeductions seed covers the seven types below; each row renders the type,
 * a status badge, and an amount cell.
 */
import { test, expect } from '@playwright/test';
import { loginAs } from './helpers/auth';

const DEDUCTION_TYPES = [
  'Late Shipment',
  'Mislabeled Carton',
  'Non Compliance Fine',
  'Co Op',
  'Unfilled By Cancel Date',
  'Po On Time Accuracy',
];

async function openLedger(page: any) {
  await loginAs(page, 'Mercenta Admin Hub', 1100);
  await page.click('nav[aria-label="Primary"] >> text=Retail Pipeline');
  await page.waitForTimeout(1100);
}

test.describe('Deductions Ledger', () => {
  for (const dtype of DEDUCTION_TYPES) {
    test(`Deduction category: ${dtype} appears in ledger with amount/status`, async ({ page }) => {
      await openLedger(page);
      const typeCell = page.locator('td', { hasText: dtype }).first();
      await expect(typeCell).toBeVisible({ timeout: 5000 });
      const row = typeCell.locator('..');
      // Amount column (6) and Status column (5) carry the ledger data.
      await expect(row.locator('td').nth(6)).toContainText('£');
      await expect(row.locator('td').nth(5)).toContainText(/open|accepted|resolved|disputed/i);
    });
  }
});