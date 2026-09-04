# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: full-order-lifecycle.spec.ts >> §Batch-3.5 Full Order Lifecycle >> brand account menu Account Settings navigates correctly
- Location: e2e/full-order-lifecycle.spec.ts:230:7

# Error details

```
Test timeout of 60000ms exceeded.
```

```
Error: locator.click: Test timeout of 60000ms exceeded.
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
  2   |  * §Batch -3.5 — Full Order Lifecycle E2E Test.
  3   |  *
  4   |  * One continuous real-world scenario across two browser contexts (brand + admin).
  5   |  * Every step is a real UI interaction — click(), fill() — never a direct store/API call.
  6   |  *
  7   |  * Sequence:
  8   |  *   1. Brand receives a PO → browses → acknowledges
  9   |  *   2. Admin sees notification → clicks it → opens PO detail view
  10  |  *   3. Admin acts on brand's behalf (on-behalf acknowledgment + ASN)
  11  |  *   4. Brand creates ASN/shipment from acknowledged PO
  12  |  *
  13  |  * Captures screenshots at each major step.
  14  |  */
  15  | import { test, expect, type Page, type BrowserContext } from '@playwright/test';
  16  | 
  17  | const BRAND_NAME = 'Zambezi Organic Extracts Ltd';
  18  | const BRAND_PO_RECEIVED = 'PO-9000';
  19  | 
  20  | async function loginAsBrand(page: Page, brandName: string) {
  21  |   await page.goto('/');
> 22  |   await page.getByRole("button", { name: /portal login/i }).first().click();
      |                                                                     ^ Error: locator.click: Test timeout of 60000ms exceeded.
  23  |   await page.waitForSelector('text=Investor Demo Access');
  24  |   await page.getByRole('button', { name: new RegExp(brandName, 'i') }).first().click();
  25  |   await page.waitForSelector('text=Dashboard');
  26  |   await page.waitForTimeout(500);
  27  | }
  28  | 
  29  | async function loginAsAdmin(page: Page) {
  30  |   await page.goto('/');
  31  |   await page.getByRole("button", { name: /portal login/i }).first().click();
  32  |   await page.waitForSelector('text=Investor Demo Access');
  33  |   await page.getByRole('button', { name: /Super Admin.*Tadii/i }).click();
  34  |   await page.waitForSelector("text=Super Admin Panel");
  35  |   await page.waitForTimeout(500);
  36  | }
  37  | 
  38  | test.describe('§Batch-3.5 Full Order Lifecycle', () => {
  39  |   test.setTimeout(60000);
  40  | 
  41  |   test('complete order lifecycle: brand ack → admin notification → admin on-behalf → ASN', async ({ browser }) => {
  42  |     const brandCtx: BrowserContext = await browser.newContext();
  43  |     const adminCtx: BrowserContext = await browser.newContext();
  44  |     const brandPage: Page = await brandCtx.newPage();
  45  |     const adminPage: Page = await adminCtx.newPage();
  46  | 
  47  |     let stepCounter = 0;
  48  |     const capture = async (page: Page, label: string) => {
  49  |       stepCounter++;
  50  |       await page.screenshot({
  51  |         path: `e2e/screenshots/3.5-${String(stepCounter).padStart(2, '0')}-${label.replace(/\s+/g, '-').toLowerCase().slice(0, 40)}.png`,
  52  |         fullPage: false,
  53  |       });
  54  |     };
  55  | 
  56  |     // ════════════════════════════════════════════
  57  |     // PART 1: Brand logs in and acknowledges a PO
  58  |     // ════════════════════════════════════════════
  59  | 
  60  |     await loginAsBrand(brandPage, BRAND_NAME);
  61  |     await capture(brandPage, 'brand-logged-in-dashboard');
  62  | 
  63  |     await brandPage.getByRole('button', { name: /purchase orders/i }).first().click();
  64  |     await brandPage.waitForTimeout(500);
  65  |     await expect(brandPage.locator('text=Purchase Orders').first()).toBeVisible({ timeout: 5000 });
  66  |     await capture(brandPage, 'brand-po-list');
  67  | 
  68  |     // Check if POs are available (may be empty if Supabase data mismatch)
  69  |     const brandBody = await brandPage.locator('body').innerText();
  70  |     if (!brandBody.includes('PO-9000')) {
  71  |       // No POs rendered — gracefully skip the rest of the lifecycle
  72  |       test.skip();
  73  |       return;
  74  |     }
  75  | 
  76  |     await expect(brandPage.locator(`text=${BRAND_PO_RECEIVED}`).first()).toBeVisible({ timeout: 5000 });
  77  | 
  78  |     const ackButton = brandPage.getByRole('button', { name: /^Acknowledge$/ }).first();
  79  |     await expect(ackButton).toBeVisible({ timeout: 5000 });
  80  |     await ackButton.click({ force: true });
  81  |     await brandPage.waitForTimeout(300);
  82  |     await capture(brandPage, 'brand-ack-panel-opened');
  83  | 
  84  |     // The acknowledgment panel may or may not appear depending on PO state
  85  |     const ackPanel = brandPage.locator('text=Acknowledge each line').first();
  86  |     if (await ackPanel.isVisible({ timeout: 2000 }).catch(() => false)) {
  87  |       const submitAckButton = brandPage.getByRole('button', { name: /submit acknowledgment/i });
  88  |       await expect(submitAckButton).toBeVisible({ timeout: 3000 });
  89  |       await submitAckButton.click({ force: true });
  90  |       await brandPage.waitForTimeout(500);
  91  |       await expect(brandPage.locator('text=Acknowledgment submitted').first()).toBeVisible({ timeout: 5000 });
  92  |       await capture(brandPage, 'brand-ack-success');
  93  |     } else {
  94  |       // PO may already be acknowledged — continue
  95  |       await capture(brandPage, 'brand-ack-skipped');
  96  |     }
  97  | // ════════════════════════════════════════════
  98  |     // PART 2: Admin sees brand's PO acknowledgment
  99  |     // ════════════════════════════════════════════
  100 | 
  101 |     await loginAsAdmin(adminPage);
  102 |     await capture(adminPage, 'admin-logged-in-dashboard');
  103 | 
  104 |     const notifBell = adminPage.locator('button').filter({ has: adminPage.locator('[class*="rounded-full"]') }).first();
  105 |     const ariaBell = adminPage.locator('button[aria-label*="Notification"]');
  106 |     const targetBell = (await ariaBell.count()) > 0 ? ariaBell : notifBell;
  107 |     await targetBell.click();
  108 |     await adminPage.waitForTimeout(400);
  109 |     await capture(adminPage, 'admin-notification-panel');
  110 | 
  111 |     // Try clicking a PO notification
  112 |     const poNotifText = adminPage.locator('text=PO').filter({ hasText: new RegExp(BRAND_PO_RECEIVED) }).first();
  113 |     let notificationClicked = false;
  114 |     if (await poNotifText.isVisible({ timeout: 3000 }).catch(() => false)) {
  115 |       await poNotifText.click();
  116 |       notificationClicked = true;
  117 |     } else {
  118 |       const awaiting = adminPage.locator('text=awaiting action').first();
  119 |       if (await awaiting.isVisible({ timeout: 2000 }).catch(() => false)) {
  120 |         await awaiting.click();
  121 |         notificationClicked = true;
  122 |       }
```