# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: popup-interactivity.spec.ts >> Admin drill-down modal interactivity >> PO Awaiting Action drill-down opens and shows PO details
- Location: e2e/popup-interactivity.spec.ts:47:7

# Error details

```
Test timeout of 30000ms exceeded.
```

```
Error: locator.click: Test timeout of 30000ms exceeded.
Call log:
  - waiting for getByRole('button', { name: /portal login/i }).first()

```

# Page snapshot

```yaml
- generic [ref=e3]:
  - navigation [ref=e4]:
    - generic [ref=e5]:
      - generic [ref=e6]:
        - generic [ref=e7]: B
        - generic [ref=e8]: Boxbee Commerce
      - generic [ref=e9]:
        - button "Home" [ref=e10] [cursor=pointer]
        - button "About Us" [ref=e11] [cursor=pointer]
        - button "Services" [ref=e12] [cursor=pointer]
        - button "Global Network" [ref=e13] [cursor=pointer]
      - button "Get Started" [ref=e14] [cursor=pointer]
  - generic [ref=e18]:
    - generic [ref=e19]: Global 1P Wholesale Trade Platform
    - heading "Scale your brand into the UK market" [level=1] [ref=e26]
    - paragraph [ref=e27]: Boxbee Commerce is the exclusive UK Importer of Record for American, European, and African brands. We buy your inventory wholesale, clear customs, and route it straight to Amazon 1P channels.
    - generic [ref=e28]:
      - button "Client Portal" [ref=e29] [cursor=pointer]
      - button "Get Started" [ref=e32] [cursor=pointer]
  - generic [ref=e34]:
    - heading "Global Network" [level=2] [ref=e35]
    - paragraph [ref=e36]: Three regional pathways, one UK distribution hub
    - generic [ref=e37]:
      - generic [ref=e38]:
        - generic [ref=e39]:
          - generic [ref=e40]: 🇺🇸
          - heading "North America" [level=3] [ref=e43]
        - paragraph [ref=e44]: US Brands → DHL/FedEx Air Courier → UK Amazon 1P
      - generic [ref=e45]:
        - generic [ref=e46]:
          - generic [ref=e47]: 🇪🇺
          - heading "Europe" [level=3] [ref=e53]
        - paragraph [ref=e54]: EU Brands → Trucking Network → UK Amazon 1P
      - generic [ref=e55]:
        - generic [ref=e56]:
          - generic [ref=e57]: 🌍
          - heading "Africa" [level=3] [ref=e62]
        - paragraph [ref=e63]: African Brands → BAK Logistics → UK Amazon 1P
  - generic [ref=e65]:
    - heading "What We Do" [level=2] [ref=e66]
    - paragraph [ref=e67]: End-to-end wholesale distribution infrastructure
    - generic [ref=e68]:
      - generic [ref=e69]:
        - heading "1P Wholesale Distribution" [level=3] [ref=e75]
        - paragraph [ref=e76]: We purchase your inventory at Ex-Works pricing and route it directly to Amazon Vendor Central UK.
      - generic [ref=e77]:
        - heading "Importer of Record" [level=3] [ref=e82]
        - paragraph [ref=e83]: Boxbee holds UK EORI numbers, manages HMRC customs declarations, and ensures full UKCA compliance.
      - generic [ref=e84]:
        - heading "Global Logistics Network" [level=3] [ref=e91]
        - paragraph [ref=e92]: DHL and FedEx for air courier parcels worldwide. BAK Logistics for heavy freight from African origins.
      - generic [ref=e93]:
        - heading "Revenue Acceleration" [level=3] [ref=e98]
        - paragraph [ref=e99]: Bi-weekly payouts in USD, EUR, or GBP. We handle the complexity so you can focus on production.
  - generic [ref=e101]:
    - heading "Ready to enter the UK market?" [level=2] [ref=e106]
    - paragraph [ref=e107]: Join brands from the US, Europe, and Africa already scaling through Boxbee Commerce.
    - button "Get Started" [ref=e108] [cursor=pointer]
  - contentinfo [ref=e111]:
    - generic [ref=e112]:
      - generic [ref=e113]:
        - generic [ref=e114]: B
        - generic [ref=e115]: Boxbee Commerce Ltd
      - generic [ref=e116]: UK Importer of Record — EORI Registered
```

# Test source

```ts
  1  | /**
  2  |  * §Batch-19 — Popup/modal internal interactivity E2E tests.
  3  |  * When a dashboard card opens a detail popup, PO numbers, brand names, etc.
  4  |  * inside that popup must be clickable and navigate to the corresponding view,
  5  |  * closing the popup first.
  6  |  */
  7  | import { test, expect, type Page } from '@playwright/test';
  8  | 
  9  | async function loginAsAdmin(page: Page) {
  10 |   await page.goto('/');
> 11 |   await page.getByRole("button", { name: /portal login/i }).first().click();
     |                                                                     ^ Error: locator.click: Test timeout of 30000ms exceeded.
  12 |   await page.waitForSelector('text=Investor Demo Access');
  13 |   await page.getByRole('button', { name: /Super Admin.*Tadii/i }).click();
  14 |   await page.waitForSelector("text=Super Admin Panel");
  15 |   await page.getByRole('button', { name: 'Overview' }).first().click();
  16 |   await page.waitForSelector("text=Admin Overview");
  17 | }
  18 | 
  19 | async function loginAsBrand(page: Page, brandName: string) {
  20 |   await page.goto('/');
  21 |   await page.getByRole("button", { name: /portal login/i }).first().click();
  22 |   await page.waitForSelector('text=Investor Demo Access');
  23 |   await page.getByRole('button', { name: new RegExp(brandName, 'i') }).first().click();
  24 |   await page.waitForSelector('text=Dashboard');
  25 |   await page.waitForTimeout(500);
  26 | }
  27 | 
  28 | test.describe('Admin drill-down modal interactivity', () => {
  29 |   test('PO link in drill-down modal navigates to Purchase Orders and closes modal', async ({ page }) => {
  30 |     await loginAsAdmin(page);
  31 |     // Click a card that opens a drill-down with PO numbers
  32 |     await page.getByText('Revenue This Month').first().click();
  33 |     await page.waitForTimeout(500);
  34 |     // Expect the modal to be visible
  35 |     const modal = page.locator('.fixed.inset-0.z-50').first();
  36 |     await expect(modal).toBeVisible({ timeout: 3000 });
  37 |     // Click a PO number link inside the modal
  38 |     const poLink = modal.locator('button').filter({ hasText: /PO-\d+/ }).first();
  39 |     if (await poLink.isVisible({ timeout: 2000 }).catch(() => false)) {
  40 |       await poLink.click();
  41 |       await page.waitForTimeout(500);
  42 |       // Expect modal closed and navigated to purchase orders
  43 |       await expect(page.locator('text=Purchase Orders').first()).toBeVisible({ timeout: 5000 });
  44 |     }
  45 |   });
  46 | 
  47 |   test('PO Awaiting Action drill-down opens and shows PO details', async ({ page }) => {
  48 |     await loginAsAdmin(page);
  49 |     await page.getByText('POs Awaiting').filter({ hasText: /PO/i }).first().click();
  50 |     await page.waitForTimeout(500);
  51 |     const modal = page.locator('.fixed.inset-0.z-50').first();
  52 |     await expect(modal).toBeVisible({ timeout: 3000 });
  53 |     // Verify it shows a table with columns
  54 |     await expect(page.locator('text=PO').first()).toBeVisible({ timeout: 3000 });
  55 |     // Close via X button
  56 |     const closeBtn = page.locator('button[aria-label="Close detail view"]').first();
  57 |     if (await closeBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
  58 |       await closeBtn.click();
  59 |       await page.waitForTimeout(300);
  60 |       await expect(modal).not.toBeVisible({ timeout: 3000 });
  61 |     }
  62 |   });
  63 | });
  64 | 
  65 | test.describe('Brand drill-down modal interactivity', () => {
  66 |   test('Reports page renders with metric summary', async ({ page }) => {
  67 |     await loginAsBrand(page, 'Nordhaus Living ApS');
  68 |     await page.getByRole('button', { name: /reports/i }).first().click();
  69 |     await page.waitForTimeout(500);
  70 |     await expect(page.locator('text=Reports v2').first()).toBeVisible({ timeout: 5000 });
  71 |   });
  72 | });
```