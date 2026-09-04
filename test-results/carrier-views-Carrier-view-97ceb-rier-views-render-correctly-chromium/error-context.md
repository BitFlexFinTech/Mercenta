# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: carrier-views.spec.ts >> Carrier views smoke-render >> all carrier views render correctly
- Location: e2e/carrier-views.spec.ts:25:7

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
  2  |  * §Batch-11 — Carrier views smoke-render E2E tests.
  3  |  */
  4  | import { test, expect, type Page } from '@playwright/test';
  5  | 
  6  | async function loginAsCarrier(page: Page) {
  7  |   await page.goto('/');
> 8  |   await page.getByRole('button', { name: /portal login/i }).first().click();
     |                                                                     ^ Error: locator.click: Test timeout of 30000ms exceeded.
  9  |   await page.waitForSelector('text=Investor Demo Access');
  10 |   await page.getByRole('button', { name: /3PL Carrier Terminal/i }).first().click();
  11 |   await page.waitForSelector('text=Manifest Management');
  12 | }
  13 | 
  14 | const CARRIER_VIEWS = [
  15 |   { navLabel: 'Manifest Management', headingText: 'Manifest' },
  16 |   { navLabel: 'BAK Logistics Hub', headingText: 'BAK Logistics' },
  17 |   { navLabel: 'API Request Auditor', headingText: 'API Request Auditor' },
  18 | ];
  19 | 
  20 | test.describe('Carrier views smoke-render', () => {
  21 |   test.beforeEach(async ({ page }) => {
  22 |     await loginAsCarrier(page);
  23 |   });
  24 | 
  25 |   test('all carrier views render correctly', async ({ page }) => {
  26 |     for (const view of CARRIER_VIEWS) {
  27 |       const navBtn = page.locator(`button:has-text("${view.navLabel}")`).first();
  28 |       await navBtn.click();
  29 |       await page.waitForTimeout(500);
  30 |       await expect(page.locator(`text=${view.headingText}`).first()).toBeVisible({ timeout: 5000 });
  31 |       await page.screenshot({ path: `e2e/screenshots/carrier-${view.navLabel.toLowerCase().replace(/\s+/g, '-')}.png` });
  32 |     }
  33 |   });
  34 | });
```