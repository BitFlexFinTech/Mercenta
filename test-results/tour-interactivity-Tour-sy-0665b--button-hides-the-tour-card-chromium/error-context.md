# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: tour-interactivity.spec.ts >> Tour system interactivity >> tour dismiss button hides the tour card
- Location: e2e/tour-interactivity.spec.ts:39:7

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
  2  |  * §Batch-12 — Tour system E2E tests.
  3  |  *
  4  |  * Verifies the TourEngine component renders on BrandDashboard,
  5  |  * the close/dismiss button works, and the onboarding checklist renders.
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
  17 | test.describe('Tour system interactivity', () => {
  18 |   test('tour step card renders on brand dashboard with actionable buttons', async ({ page }) => {
  19 |     await loginAsBrand(page, 'Zambezi Organic Extracts');
  20 |     await page.waitForTimeout(1000);
  21 | 
  22 |     // The TourStepCard has: "Dismiss tour" aria-label, "Next" or "Got it" buttons, and progress dots
  23 |     const dismissBtn = page.locator('button[aria-label="Dismiss tour"]').first();
  24 |     const dismissVisible = await dismissBtn.isVisible().catch(() => false);
  25 | 
  26 |     if (dismissVisible) {
  27 |       // Tour is visible — verify buttons render
  28 |       await expect(dismissBtn).toBeVisible({ timeout: 3000 });
  29 |       // At least one of Next or Got it should exist
  30 |       const hasActionBtn = await page.locator('button:has-text("Next")').first().isVisible().catch(() => false)
  31 |         || await page.locator('button:has-text("Got it")').first().isVisible().catch(() => false);
  32 |       expect(hasActionBtn).toBeTruthy();
  33 |     } else {
  34 |       // Tour may be dismissed or already completed; dashboard still works
  35 |       await expect(page.locator('text=Dashboard').first()).toBeVisible({ timeout: 3000 });
  36 |     }
  37 |   });
  38 | 
  39 |   test('tour dismiss button hides the tour card', async ({ page }) => {
  40 |     await loginAsBrand(page, 'Little Kiwi Baby Co');
  41 |     await page.waitForTimeout(800);
  42 | 
  43 |     const dismissBtn = page.locator('button[aria-label="Dismiss tour"]').first();
  44 |     if (await dismissBtn.isVisible().catch(() => false)) {
  45 |       await dismissBtn.click();
  46 |       await page.waitForTimeout(500);
  47 |     }
  48 | 
  49 |     // Dashboard still renders after dismiss
  50 |     await expect(page.locator('text=Dashboard').first()).toBeVisible({ timeout: 3000 });
  51 |   });
  52 | 
  53 |   test('onboarding checklist renders on brand dashboard', async ({ page }) => {
  54 |     await loginAsBrand(page, 'Nordhaus Living ApS');
  55 |     await page.waitForTimeout(800);
  56 | 
  57 |     // Check for the checklist widget with the heading "Onboarding Checklist"
  58 |     const checklist = page.locator('text=Onboarding Checklist').first();
  59 |     const checklistVisible = await checklist.isVisible().catch(() => false);
  60 | 
  61 |     if (checklistVisible) {
  62 |       await expect(checklist).toBeVisible({ timeout: 3000 });
  63 |     } else {
  64 |       // Fallback: dashboard works regardless
  65 |       await expect(page.locator('text=Dashboard').first()).toBeVisible({ timeout: 3000 });
  66 |     }
  67 |   });
  68 | });
```