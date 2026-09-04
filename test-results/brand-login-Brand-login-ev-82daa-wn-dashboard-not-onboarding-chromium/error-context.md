# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: brand-login.spec.ts >> Brand login >> every brand lands on own dashboard, not onboarding
- Location: e2e/brand-login.spec.ts:19:7

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
  1  | /** §Batch-11 — Demo brand login verification E2E tests. */
  2  | import { test, expect, type Page } from '@playwright/test';
  3  | 
  4  | async function loginAsBrand(page: Page, brandName: string) {
  5  |   await page.goto('/');
> 6  |   await page.getByRole("button", { name: /portal login/i }).first().click();
     |                                                                     ^ Error: locator.click: Test timeout of 30000ms exceeded.
  7  |   await page.waitForSelector('text=Investor Demo Access');
  8  |   await page.getByRole('button', { name: new RegExp(brandName, 'i') }).first().click();
  9  |   await page.waitForSelector('text=Dashboard');
  10 | }
  11 | 
  12 | const BRANDS = [
  13 |   'Zambezi Organic Extracts', 'Nordhaus Living ApS', 'Little Kiwi Baby Co',
  14 |   'DeskForge Supplies', 'Munich Clean-Care', 'Culinary Forge',
  15 |   'Voltaic Audio', 'ApexDrive Auto Care', 'Harvest Lane Foods', 'Sahara Threads',
  16 | ];
  17 | 
  18 | test.describe('Brand login', () => {
  19 |   test('every brand lands on own dashboard, not onboarding', async ({ page }) => {
  20 |     for (const brand of BRANDS) {
  21 |       await loginAsBrand(page, brand);
  22 |       await expect(page.getByText('Dashboard').first()).toBeVisible();
  23 |       await expect(page.getByText('Brand Profile')).not.toBeVisible();
  24 |     }
  25 |   });
  26 | });
  27 | 
  28 | test('all 10 brand cards render on login page', async ({ page }) => {
  29 |   await page.goto('/');
  30 |   await page.getByRole("button", { name: /portal login/i }).first().click();
  31 |   await page.waitForSelector('text=Investor Demo Access');
  32 |   for (const brand of BRANDS) {
  33 |     await expect(page.getByText(brand).first()).toBeVisible();
  34 |   }
  35 | });
```