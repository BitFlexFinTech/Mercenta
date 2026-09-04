# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: notification-nav.spec.ts >> Batch-19 Notification navigation >> brand: notification click navigates to Purchase Orders
- Location: e2e/notification-nav.spec.ts:25:7

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
  1   | /**
  2   |  * §Batch-19 — Click-to-navigate E2E tests.
  3   |  * Covers notification clicks, dashboard card clicks, Reports drill-down modals.
  4   |  */
  5   | import { test, expect, type Page } from '@playwright/test';
  6   | 
  7   | async function loginAsBrand(page: Page, brandName: string) {
  8   |   await page.goto('/');
> 9   |   await page.getByRole("button", { name: /portal login/i }).first().click();
      |                                                                     ^ Error: locator.click: Test timeout of 30000ms exceeded.
  10  |   await page.waitForSelector('text=Investor Demo Access');
  11  |   await page.getByRole('button', { name: new RegExp(brandName, 'i') }).first().click();
  12  |   await page.waitForSelector('text=Dashboard');
  13  |   await page.waitForTimeout(500);
  14  | }
  15  | 
  16  | async function loginAsAdmin(page: Page) {
  17  |   await page.goto('/');
  18  |   await page.getByRole("button", { name: /portal login/i }).first().click();
  19  |   await page.waitForSelector('text=Investor Demo Access');
  20  |   await page.getByRole('button', { name: /Super Admin.*Tadii/i }).click();
  21  |   await page.waitForSelector("text=Super Admin Panel");
  22  |   await page.waitForTimeout(500);
  23  | }
  24  | test.describe('Batch-19 Notification navigation', () => {
  25  |   test('brand: notification click navigates to Purchase Orders', async ({ page }) => {
  26  |     await loginAsBrand(page, 'DeskForge Supplies');
  27  |     const bell = page.locator('button[aria-label*="Notification"]').or(
  28  |       page.locator('button').filter({ has: page.locator('svg[class*="lucide-bell"]') }).first());
  29  |     if (await bell.isVisible({ timeout: 3000 }).catch(() => false)) {
  30  |       await bell.click();
  31  |       await page.waitForTimeout(400);
  32  |       const notif = page.locator('[class*="text-zinc-300"]').filter({ hasText: /PO-/ }).first();
  33  |       if (await notif.isVisible({ timeout: 2000 }).catch(() => false)) {
  34  |         await notif.click();
  35  |         await page.waitForTimeout(500);
  36  |         await expect(page.locator('text=Review, accept or reject').first()).toBeVisible({ timeout: 5000 });
  37  |       }
  38  |     }
  39  |   });
  40  | 
  41  |   test('admin: notification click navigates to Purchase Orders', async ({ page }) => {
  42  |     await loginAsAdmin(page);
  43  |     const bell = page.locator('button[aria-label*="Notification"]').or(
  44  |       page.locator('button').filter({ has: page.locator('svg[class*="lucide-bell"]') }).first());
  45  |     if (await bell.isVisible({ timeout: 3000 }).catch(() => false)) {
  46  |       await bell.click();
  47  |       await page.waitForTimeout(400);
  48  |       const notif = page.locator('[class*="text-zinc-300"]').filter({ hasText: /PO-|awaiting|rejected/ }).first();
  49  |       if (await notif.isVisible({ timeout: 2000 }).catch(() => false)) {
  50  |         await notif.click();
  51  |         await page.waitForTimeout(500);
  52  |         await expect(page.locator('text=POs across').or(page.locator('text=Purchase Orders').first())).toBeVisible({ timeout: 5000 });
  53  |       }
  54  |     }
  55  |   });
  56  | });
  57  | test.describe('Batch-19 Dashboard card clickability', () => {
  58  |   test('brand: Revenue card -> Reports', async ({ page }) => {
  59  |     await loginAsBrand(page, 'Nordhaus Living ApS');
  60  |     await page.waitForSelector('text=Revenue');
  61  |     await page.getByText('Revenue').first().click();
  62  |     await page.waitForTimeout(500);
  63  |     await expect(page.locator('text=Reports v2').or(page.locator('text=ASIN Confirmation Rate')).first()).toBeVisible({ timeout: 5000 });
  64  |   });
  65  | 
  66  |   test('brand: Compliance Score -> Compliance', async ({ page }) => {
  67  |     await loginAsBrand(page, 'Nordhaus Living ApS');
  68  |     await page.waitForSelector('text=Compliance Score');
  69  |     await page.getByText('Compliance Score').first().click();
  70  |     await page.waitForTimeout(500);
  71  |     await expect(page.locator('text=UK Compliance').first()).toBeVisible({ timeout: 5000 });
  72  |   });
  73  | 
  74  |   test('brand: Shipments -> Logistics', async ({ page }) => {
  75  |     await loginAsBrand(page, 'Nordhaus Living ApS');
  76  |     await page.waitForSelector('text=Active Shipments');
  77  |     await page.getByText('Active Shipments').first().click();
  78  |     await page.waitForTimeout(500);
  79  |     await expect(page.locator('text=Inbound Shipments').first()).toBeVisible({ timeout: 5000 });
  80  |   });
  81  | 
  82  |   test('admin: Revenue card opens drill-down', async ({ page }) => {
  83  |     await loginAsAdmin(page);
  84  |     // Navigate to Overview first
  85  |     await page.getByRole('button', { name: 'Overview' }).first().click();
  86  |     await page.waitForSelector('text=Admin Overview');
  87  |     await page.getByText('Revenue This Month').first().click();
  88  |     await page.waitForTimeout(500);
  89  |     await expect(page.locator('text=commission').first()).toBeVisible({ timeout: 5000 });
  90  |     const close = page.locator('button[aria-label="Close detail view"]').or(
  91  |       page.locator('button:has(svg.lucide-x)').first());
  92  |     if (await close.isVisible({ timeout: 2000 }).catch(() => false)) {
  93  |       await close.click();
  94  |       await page.waitForTimeout(300);
  95  |       await expect(page.locator('[class*="fixed"][class*="inset-0"]').or(
  96  |         page.locator('text=commission breakdown').first()).first()).not.toBeVisible({ timeout: 3000 });
  97  |     }
  98  |   });
  99  | });
  100 | 
  101 | test.describe('Batch-19 Reports drill-down', () => {
  102 |   test('brand: Reports metric opens and dismisses modal', async ({ page }) => {
  103 |     await loginAsBrand(page, 'Nordhaus Living ApS');
  104 |     await page.getByRole('button', { name: /reports/i }).first().click();
  105 |     await page.waitForTimeout(500);
  106 |     await expect(page.locator('text=Reports v2').or(page.locator('text=ASIN Confirmation Rate')).first()).toBeVisible({ timeout: 5000 });
  107 |     const asin = page.getByText(/ASIN Confirmation Rate/).first();
  108 |     if (await asin.isVisible({ timeout: 3000 }).catch(() => false)) {
  109 |       await asin.click();
```