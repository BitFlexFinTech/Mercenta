# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: homepage-footer.spec.ts >> Homepage footer legal pages >> homepage footer renders Privacy Policy and Terms of Service buttons
- Location: e2e/homepage-footer.spec.ts:10:7

# Error details

```
Error: expect(locator).toBeVisible() failed

Locator: locator('button:has-text("Privacy Policy")').first()
Expected: visible
Timeout: 3000ms
Error: element(s) not found

Call log:
  - Expect "toBeVisible" with timeout 3000ms
  - waiting for locator('button:has-text("Privacy Policy")').first()

```

```yaml
- navigation:
  - text: B Boxbee Commerce
  - button "Home"
  - button "About Us"
  - button "Services"
  - button "Global Network"
  - button "Get Started":
    - text: Get Started
    - img
- img
- text: Global 1P Wholesale Trade Platform
- heading "Scale your brand into the UK market" [level=1]
- paragraph: Boxbee Commerce is the exclusive UK Importer of Record for American, European, and African brands. We buy your inventory wholesale, clear customs, and route it straight to Amazon 1P channels.
- button "Client Portal":
  - text: Client Portal
  - img
- button "Get Started"
- heading "Global Network" [level=2]
- paragraph: Three regional pathways, one UK distribution hub
- text: 🇺🇸
- img
- heading "North America" [level=3]
- paragraph: US Brands → DHL/FedEx Air Courier → UK Amazon 1P
- text: 🇪🇺
- img
- heading "Europe" [level=3]
- paragraph: EU Brands → Trucking Network → UK Amazon 1P
- text: 🌍
- img
- heading "Africa" [level=3]
- paragraph: African Brands → BAK Logistics → UK Amazon 1P
- heading "What We Do" [level=2]
- paragraph: End-to-end wholesale distribution infrastructure
- img
- heading "1P Wholesale Distribution" [level=3]
- paragraph: We purchase your inventory at Ex-Works pricing and route it directly to Amazon Vendor Central UK.
- img
- heading "Importer of Record" [level=3]
- paragraph: Boxbee holds UK EORI numbers, manages HMRC customs declarations, and ensures full UKCA compliance.
- img
- heading "Global Logistics Network" [level=3]
- paragraph: DHL and FedEx for air courier parcels worldwide. BAK Logistics for heavy freight from African origins.
- img
- heading "Revenue Acceleration" [level=3]
- paragraph: Bi-weekly payouts in USD, EUR, or GBP. We handle the complexity so you can focus on production.
- img
- heading "Ready to enter the UK market?" [level=2]
- paragraph: Join brands from the US, Europe, and Africa already scaling through Boxbee Commerce.
- button "Get Started":
  - text: Get Started
  - img
- contentinfo:
  - text: B Boxbee Commerce Ltd
  - img
  - text: UK Importer of Record — EORI Registered
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
> 21 |     await expect(privacyBtn).toBeVisible({ timeout: 3000 });
     |                              ^ Error: expect(locator).toBeVisible() failed
  22 |     await expect(termsBtn).toBeVisible({ timeout: 3000 });
  23 |   });
  24 | 
  25 |   test('Privacy Policy page renders with back button when clicked', async ({ page }) => {
  26 |     await page.goto('/');
  27 |     await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
  28 |     await page.waitForTimeout(300);
  29 | 
  30 |     // Click Privacy Policy button
  31 |     await page.locator('button').filter({ hasText: 'Privacy Policy' }).first().click();
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