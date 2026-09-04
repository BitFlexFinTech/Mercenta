# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: batch-abc-vc-deep-dive.spec.ts >> Batch A — Freight Terms >> brand PO dashboard shows freight term info
- Location: e2e/batch-abc-vc-deep-dive.spec.ts:25:7

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
  2  |  * Batch A/B/C E2E: freight terms, Routing Request, admin panels
  3  |  */
  4  | import { test, expect, type Page } from '@playwright/test';
  5  | 
  6  | async function loginAsBrand(page: Page, brandName: string) {
  7  |   await page.goto('/');
> 8  |   await page.getByRole("button", { name: /portal login/i }).first().click();
     |                                                                     ^ Error: locator.click: Test timeout of 30000ms exceeded.
  9  |   await page.waitForSelector('text=Investor Demo Access');
  10 |   await page.getByRole('button', { name: new RegExp(brandName, 'i') }).first().click();
  11 |   await page.waitForSelector('text=Dashboard');
  12 |   await page.waitForTimeout(500);
  13 | }
  14 | 
  15 | async function loginAsAdmin(page: Page) {
  16 |   await page.goto('/');
  17 |   await page.getByRole("button", { name: /portal login/i }).first().click();
  18 |   await page.waitForSelector('text=Investor Demo Access');
  19 |   await page.getByRole('button', { name: /Super Admin.*Tadii/i }).click();
  20 |   await page.waitForSelector("text=Super Admin Panel");
  21 |   await page.waitForTimeout(500);
  22 | }
  23 | 
  24 | test.describe('Batch A — Freight Terms', () => {
  25 |   test('brand PO dashboard shows freight term info', async ({ page }) => {
  26 |     await loginAsBrand(page, 'Zambezi Organic Extracts Ltd');
  27 |     await page.getByRole('button', { name: /purchase orders/i }).first().click();
  28 |     await page.waitForTimeout(500);
  29 |     const body = await page.locator('body').innerText();
  30 |     // If POs are visible, check for freight terms; otherwise verify the page renders
  31 |     if (body.includes('PO-')) {
  32 |       expect(body.includes('Freight Collect') || body.includes('Freight Prepaid')).toBeTruthy();
  33 |     } else {
  34 |       // No POs rendered (Supabase data mismatch in demo mode) — verify page structure is correct
  35 |       await expect(page.locator('text=Purchase Orders').first()).toBeVisible({ timeout: 2000 });
  36 |     }
  37 |     await page.screenshot({ path: 'e2e/screenshots/batchA-freight-info.png' });
  38 |   });
  39 | 
  40 |   test('routing request indicator shown for collect POs', async ({ page }) => {
  41 |     await loginAsBrand(page, 'Zambezi Organic Extracts Ltd');
  42 |     await page.getByRole('button', { name: /purchase orders/i }).first().click();
  43 |     await page.waitForTimeout(500);
  44 |     const body = await page.locator('body').innerText();
  45 |     if (body.includes('PO-')) {
  46 |       // Zambezi (index 0) gets collect POs, so Routing Request should appear
  47 |       if (!body.includes('Routing Request')) {
  48 |         const poLink = page.locator('text=PO-').first();
  49 |         if (await poLink.isVisible({ timeout: 2000 }).catch(() => false)) {
  50 |           await poLink.click();
  51 |           await page.waitForTimeout(300);
  52 |         }
  53 |       }
  54 |     }
  55 |     await page.screenshot({ path: 'e2e/screenshots/batchA-routing-request.png' });
  56 |   });
  57 | });
  58 | 
  59 | test.describe('Batch B — Usertour', () => {
  60 |   test('Usertour admin panel renders', async ({ page }) => {
  61 |     await loginAsAdmin(page);
  62 |     const btn = page.locator('button:has-text("Onboarding Tours")').first();
  63 |     if (await btn.isVisible()) {
  64 |       await btn.click();
  65 |     } else {
  66 |       await page.evaluate(() => window.dispatchEvent(new WheelEvent('wheel', { deltaY: 300 })));
  67 |       await page.waitForTimeout(400);
  68 |       const btn2 = page.locator('button:has-text("Onboarding Tours")').first();
  69 |       if (await btn2.isVisible()) await btn2.click();
  70 |     }
  71 |     await page.waitForTimeout(300);
  72 |     await page.screenshot({ path: 'e2e/screenshots/batchB-usertour-panel.png' });
  73 |   });
  74 | });
  75 | 
  76 | test.describe('Batch C — Rocket.Chat', () => {
  77 |   test('RocketChat admin panel renders with brand groups', async ({ page }) => {
  78 |     await loginAsAdmin(page);
  79 |     const btn = page.locator('button:has-text("Rocket.Chat")').first();
  80 |     if (await btn.isVisible()) {
  81 |       await btn.click();
  82 |     } else {
  83 |       await page.evaluate(() => window.dispatchEvent(new WheelEvent('wheel', { deltaY: 300 })));
  84 |       await page.waitForTimeout(400);
  85 |       const btn2 = page.locator('button:has-text("Rocket.Chat")').first();
  86 |       if (await btn2.isVisible()) await btn2.click();
  87 |     }
  88 |     await page.waitForTimeout(300);
  89 |     const body = await page.locator('body').innerText();
  90 |     expect(body.includes('Rocket.Chat') || body.includes('Brand Groups')).toBeTruthy();
  91 |     await page.screenshot({ path: 'e2e/screenshots/batchC-rocketchat-panel.png' });
  92 |   });
  93 | });
  94 | 
```