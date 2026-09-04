# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: cross-role-po.spec.ts >> Cross-role PO workflow >> admin sees cross-role PO acknowledgment notifications
- Location: e2e/cross-role-po.spec.ts:117:7

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
  2   |  * §Batch-0.5 item 4 + Batch-11 — Cross-role PO E2E tests.
  3   |  *
  4   |  * Tests the full admin-assist PO workflow:
  5   |  * - Brand logs in, views/accepts/rejects a PO
  6   |  * - Admin sees the corresponding notification
  7   |  * - Admin can open full PO detail
  8   |  * - Admin can act on brand's behalf (acknowledge, file ASN)
  9   |  * - On-behalf actions are correctly attributed in the audit log
  10  |  */
  11  | import { test, expect, type Page } from '@playwright/test';
  12  | 
  13  | async function loginAsBrand(page: Page, brandName: string) {
  14  |   await page.goto('/');
  15  |   await page.getByRole("button", { name: /portal login/i }).first().click();
  16  |   await page.waitForSelector('text=Investor Demo Access');
  17  |   await page.getByRole('button', { name: new RegExp(brandName, 'i') }).first().click();
  18  |   await page.waitForSelector('text=Dashboard');
  19  | }
  20  | 
  21  | async function loginAsAdmin(page: Page) {
  22  |   await page.goto('/');
> 23  |   await page.getByRole("button", { name: /portal login/i }).first().click();
      |                                                                     ^ Error: locator.click: Test timeout of 30000ms exceeded.
  24  |   await page.waitForSelector('text=Investor Demo Access');
  25  |   await page.getByRole('button', { name: /Super Admin.*Tadii/i }).click();
  26  |   await page.waitForSelector("text=Super Admin Panel");
  27  | }
  28  | 
  29  | async function openProfileMenu(page: Page) {
  30  |   await page.locator('header button').filter({ has: page.locator('[class*="rounded-full"]') }).last().click();
  31  |   await page.waitForTimeout(300);
  32  | }
  33  | 
  34  | test.describe('Cross-role PO workflow', () => {
  35  |   test('brand acts on PO → admin sees notification → admin opens detail', async ({ browser }) => {
  36  |     const brandCtx = await browser.newContext();
  37  |     const adminCtx = await browser.newContext();
  38  |     const brandPage = await brandCtx.newPage();
  39  |     const adminPage = await adminCtx.newPage();
  40  | 
  41  |     // Both log in
  42  |     await loginAsBrand(brandPage, 'Zambezi Organic Extracts Ltd');
  43  |     await loginAsAdmin(adminPage);
  44  | 
  45  |     // Brand navigates to Purchase Orders
  46  |     await brandPage.getByRole('button', { name: /purchase orders/i }).first().click();
  47  |     await brandPage.waitForTimeout(500);
  48  | 
  49  |     // Brand page should render — PO list may be empty if Supabase data doesn't match
  50  |     await expect(brandPage.locator('text=Purchase Orders').first()).toBeVisible({ timeout: 5000 });
  51  | 
  52  |     // Admin navigates to their Purchase Orders view
  53  |     await adminPage.getByRole('button', { name: /purchase orders/i }).first().click();
  54  |     await adminPage.waitForTimeout(500);
  55  | 
  56  |     // Admin should see PO list with brand name visible (or at least the page renders)
  57  |     const adminBody = await adminPage.locator('body').innerText();
  58  |     if (adminBody.includes('Zambezi')) {
  59  |       await expect(adminPage.locator('text=Zambezi').first()).toBeVisible({ timeout: 5000 });
  60  | 
  61  |       // Admin clicks bell/notification to check for PO notifications
  62  |       await adminPage.locator('button[aria-label*="Notification"]').click();
  63  |       await adminPage.waitForTimeout(300);
  64  | 
  65  |       // Check for notification items
  66  |       const poNotification = adminPage.locator('text=awaiting action').first();
  67  |       if (await poNotification.isVisible({ timeout: 2000 }).catch(() => false)) {
  68  |         await poNotification.click();
  69  |         await adminPage.waitForTimeout(500);
  70  |         await expect(adminPage.locator('text=Purchase Orders').first()).toBeVisible();
  71  |       }
  72  |     } else {
  73  |       // Without matching PO data, just verify admin page structure
  74  |       await expect(adminPage.locator('text=Purchase Orders').first()).toBeVisible({ timeout: 5000 });
  75  |     }
  76  |   });
  77  | 
  78  |   test('brand identity shown in header, not hardcoded admin name', async ({ browser }) => {
  79  |     const brandCtx = await browser.newContext();
  80  |     const adminCtx = await browser.newContext();
  81  |     const brandPage = await brandCtx.newPage();
  82  |     const adminPage = await adminCtx.newPage();
  83  | 
  84  |     await loginAsBrand(brandPage, 'Nordhaus Living ApS');
  85  |     await loginAsAdmin(adminPage);
  86  | 
  87  |     // Brand sees own name in header profile
  88  |     await openProfileMenu(brandPage);
  89  |     await expect(brandPage.getByText('Nordhaus Living ApS').first()).toBeVisible();
  90  | 
  91  |     // Admin sees Super Admin in header profile
  92  |     await openProfileMenu(adminPage);
  93  |     await expect(adminPage.getByText('Super Admin').first()).toBeVisible();
  94  |   });
  95  | 
  96  |   test('brand notification bell shows items and clicking navigates', async ({ page }) => {
  97  |     await loginAsBrand(page, 'DeskForge Supplies Inc');
  98  | 
  99  |     // Open notification center
  100 |     await page.locator('button[aria-label*="Notification"]').click();
  101 |     await page.waitForTimeout(300);
  102 | 
  103 |     // It should not crash — either shows items or "Nothing needs attention"
  104 |     const panel = page.locator('text=needs attention').or(page.locator('text=Nothing needs attention'));
  105 |     await expect(panel.first()).toBeVisible({ timeout: 5000 });
  106 | 
  107 |     // Try clicking a notification item if one exists
  108 |     const notifItem = page.locator('button').filter({ hasText: /awaiting action|PO-/ }).first();
  109 |     if (await notifItem.isVisible()) {
  110 |       await notifItem.click();
  111 |       await page.waitForTimeout(500);
  112 |       // Should have navigated to a valid view (either stays same or changes)
  113 |       await expect(page.locator('text=Dashboard').or(page.locator('text=Purchase Orders')).first()).toBeVisible();
  114 |     }
  115 |   });
  116 | 
  117 |   test('admin sees cross-role PO acknowledgment notifications', async ({ page }) => {
  118 |     await loginAsAdmin(page);
  119 | 
  120 |     // Open notification center
  121 |     await page.locator('button[aria-label*="Notification"]').click();
  122 |     await page.waitForTimeout(300);
  123 | 
```