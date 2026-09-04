# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: homepage-footer.spec.ts >> Homepage footer legal pages >> Privacy Policy page renders with back button when clicked
- Location: e2e/homepage-footer.spec.ts:25:7

# Error details

```
Test timeout of 30000ms exceeded.
```

```
Error: locator.click: Test timeout of 30000ms exceeded.
Call log:
  - waiting for locator('button').filter({ hasText: 'Privacy Policy' }).first()

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
  2  |  * §Batch -4 — Homepage footer legal pages E2E tests.
  3  |  *
  4  |  * Verifies the Privacy Policy and Terms of Service links in the
  5  |  * homepage footer render and toggle legal page content.
  6  |  */
  7  | import { test, expect, type Page } from '@playwright/test';
  8  | 
  9  | test.describe('Homepage footer legal pages', () => {
  10 |   test('homepage footer renders Privacy Policy and Terms of Service buttons', async ({ page }) => {
  11 |     await page.goto('/');
  12 |     await page.waitForTimeout(500);
  13 | 
  14 |     // Scroll to footer
  15 |     await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
  16 |     await page.waitForTimeout(300);
  17 | 
  18 |     // Both buttons should be in the footer
  19 |     const privacyBtn = page.locator('button:has-text("Privacy Policy")').first();
  20 |     const termsBtn = page.locator('button:has-text("Terms of Service")').first();
  21 |     await expect(privacyBtn).toBeVisible({ timeout: 3000 });
  22 |     await expect(termsBtn).toBeVisible({ timeout: 3000 });
  23 |   });
  24 | 
  25 |   test('Privacy Policy page renders with back button when clicked', async ({ page }) => {
  26 |     await page.goto('/');
  27 |     await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
  28 |     await page.waitForTimeout(300);
  29 | 
  30 |     // Click Privacy Policy button
> 31 |     await page.locator('button').filter({ hasText: 'Privacy Policy' }).first().click();
     |                                                                                ^ Error: locator.click: Test timeout of 30000ms exceeded.
  32 |     await page.waitForTimeout(500);
  33 | 
  34 |     // Privacy Policy content should render
  35 |     const heading = page.locator('h1:has-text("Privacy Policy")').first();
  36 |     await expect(heading).toBeVisible({ timeout: 3000 });
  37 | 
  38 |     // Back to homepage button should be present
  39 |     const backBtn = page.locator('button').filter({ hasText: 'Back to homepage' }).first();
  40 |     await expect(backBtn).toBeVisible({ timeout: 3000 });
  41 |   });
  42 | 
  43 |   test('Terms of Service page renders with back button when clicked', async ({ page }) => {
  44 |     await page.goto('/');
  45 |     await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
  46 |     await page.waitForTimeout(300);
  47 | 
  48 |     // Click Terms of Service button
  49 |     await page.locator('button').filter({ hasText: 'Terms of Service' }).first().click();
  50 |     await page.waitForTimeout(500);
  51 | 
  52 |     // Terms of Service content should render
  53 |     const heading = page.locator('h1:has-text("Terms of Service")').first();
  54 |     await expect(heading).toBeVisible({ timeout: 3000 });
  55 | 
  56 |     // Back to homepage button should be present
  57 |     const backBtn = page.locator('button').filter({ hasText: 'Back to homepage' }).first();
  58 |     await expect(backBtn).toBeVisible({ timeout: 3000 });
  59 |   });
  60 | });
```