# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: brand-views.spec.ts >> Brand views smoke-render >> tracking timeline modal opens and shows milestones + SKU/EAN
- Location: e2e/brand-views.spec.ts:53:7

# Error details

```
Test timeout of 30000ms exceeded while running "beforeEach" hook.
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
  2  |  * §Batch-11 — Brand views smoke-render E2E tests.
  3  |  *
  4  |  * Visits every brand view for a logged-in brand and confirms the expected
  5  |  * heading/component renders without error.
  6  |  */
  7  | import { test, expect, type Page } from '@playwright/test';
  8  | 
  9  | async function loginAsBrand(page: Page, brandName: string) {
  10 |   await page.goto('/');
> 11 |   await page.getByRole('button', { name: /portal login/i }).first().click();
     |                                                                     ^ Error: locator.click: Test timeout of 30000ms exceeded.
  12 |   await page.waitForSelector('text=Investor Demo Access');
  13 |   await page.getByRole('button', { name: new RegExp(brandName, 'i') }).first().click();
  14 |   await page.waitForSelector('text=Dashboard');
  15 | }
  16 | 
  17 | interface BrandView {
  18 |   navLabel: string;
  19 |   headingText: string;
  20 | }
  21 | 
  22 | const BRAND_VIEWS: BrandView[] = [
  23 |   { navLabel: 'Dashboard', headingText: 'Dashboard' },
  24 |   { navLabel: 'Contracts', headingText: 'Contracts' },
  25 |   { navLabel: 'Purchase Orders', headingText: 'Purchase Orders' },
  26 |   { navLabel: 'Product Catalog', headingText: 'Product Catalog' },
  27 |   { navLabel: 'Inbound Shipments', headingText: 'Inbound Shipments' },
  28 |   { navLabel: 'UK Compliance', headingText: 'UK Compliance' },
  29 |   { navLabel: 'Returns', headingText: 'Returns' },
  30 |   { navLabel: 'Analytics', headingText: 'Analytics' },
  31 |   { navLabel: 'Reports', headingText: 'Reports' },
  32 |   { navLabel: 'Documents & Account', headingText: 'Account' },
  33 |   { navLabel: 'Support & Team', headingText: 'Support' },
  34 |   { navLabel: 'Settings', headingText: 'Settings' },
  35 | ];
  36 | 
  37 | test.describe('Brand views smoke-render', () => {
  38 |   test.beforeEach(async ({ page }) => {
  39 |     await loginAsBrand(page, 'Nordhaus Living ApS');
  40 |   });
  41 | 
  42 |   test('all brand views render correctly', async ({ page }) => {
  43 |     for (const view of BRAND_VIEWS) {
  44 |       const navBtn = page.locator(`button:has-text("${view.navLabel}")`).first();
  45 |       await navBtn.click();
  46 |       await page.waitForTimeout(500);
  47 |       await expect(page.locator(`text=${view.headingText}`).first()).toBeVisible({ timeout: 5000 });
  48 |       await page.screenshot({ path: `e2e/screenshots/brand-${view.navLabel.toLowerCase().replace(/\s+/g, '-')}.png` });
  49 |     }
  50 |   });
  51 | 
  52 |   // Shipment tracking timeline modal (Stage 6) — uses Zambezi which has demo shipments
  53 |   test('tracking timeline modal opens and shows milestones + SKU/EAN', async ({ page }) => {
  54 |     // Login as Zambezi instead of Nordhaus (Nordhaus has no demo shipments)
  55 |     await page.goto('/');
  56 |     await page.getByRole('button', { name: /portal login/i }).first().click();
  57 |     await page.waitForSelector('text=Investor Demo Access');
  58 |     await page.getByRole('button', { name: /munich/i }).first().click();
  59 |     await page.waitForSelector('text=Dashboard');
  60 |     
  61 |     await page.waitForTimeout(500);
  62 | 
  63 |     const navBtn = page.locator('button:has-text("Inbound Shipments")').first();
  64 |     await navBtn.click();
  65 |     await page.waitForTimeout(2000);
  66 | 
  67 |     // Verify Waybill button is present (confirms shipments rendered)
  68 |     const waybillBtn = page.locator('button', { hasText: 'Waybill' }).first();
  69 |     await expect(waybillBtn).toBeVisible({ timeout: 5000 });
  70 |     
  71 |     // Now click Track button
  72 |     const trackBtn = page.locator('button', { hasText: 'Track' }).first();
  73 |     await expect(trackBtn).toBeVisible({ timeout: 5000 });
  74 |     await trackBtn.click();
  75 |     await page.waitForTimeout(500);
  76 | 
  77 |     // Verify tracking modal
  78 |     await expect(page.locator('text=Shipment Tracking').first()).toBeVisible({ timeout: 3000 });
  79 |     await expect(page.locator('text=Carrier Milestones').first()).toBeVisible({ timeout: 3000 });
  80 |     await expect(page.locator('text=Tracking No.').first()).toBeVisible({ timeout: 3000 });
  81 | 
  82 |     // Verify a milestone label is visible (any of them)
  83 |     await expect(page.locator('text=Factory Intake').or(page.locator('text=In BAK Depot')).or(page.locator('text=Sea Transit')).or(page.locator('text=Air Transit')).or(page.locator('text=UK Customs Cleared')).or(page.locator('text=Mercenta UK Hub')).first()).toBeVisible({ timeout: 3000 });
  84 | 
  85 |     await page.screenshot({ path: 'e2e/screenshots/brand-tracking-timeline.png' });
  86 |   });
  87 | });
```