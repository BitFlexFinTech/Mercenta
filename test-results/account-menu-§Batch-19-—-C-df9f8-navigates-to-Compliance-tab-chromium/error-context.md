# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: account-menu.spec.ts >> §Batch-19 — Card clickability >> brand dashboard Compliance Score card navigates to Compliance tab
- Location: e2e/account-menu.spec.ts:100:7

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
  2   |  * §Batch-11 — Account menu navigation E2E tests.
  3   |  * §Batch-19 — Card clickability and click-to-navigate tests.
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
  13  | }
  14  | 
  15  | async function loginAsAdmin(page: Page) {
  16  |   await page.goto('/');
  17  |   await page.getByRole("button", { name: /portal login/i }).first().click();
  18  |   await page.waitForSelector('text=Investor Demo Access');
  19  |   await page.getByRole('button', { name: /Super Admin.*Tadii/i }).click();
  20  |   await page.waitForSelector("text=Super Admin Panel");
  21  | }
  22  | 
  23  | async function openProfileMenu(page: Page) {
  24  |   // The notification bell and profile avatar button both match this selector.
  25  |   // The profile avatar is the LAST header button (after the notification bell).
  26  |   await page.locator("header button").filter({ has: page.locator('[class*="rounded-full"]') }).last().click();
  27  |   await page.waitForTimeout(300);
  28  | }
  29  | 
  30  | test.describe('Account menu navigation', () => {
  31  |   test('admin: Account Settings navigates to Super Admin Panel', async ({ page }) => {
  32  |     await loginAsAdmin(page);
  33  |     await openProfileMenu(page);
  34  |     await page.getByRole('button', { name: /account settings/i }).click();
  35  |     await expect(page.locator('text=Super Admin Panel').first()).toBeVisible();
  36  |   });
  37  | 
  38  |   test('admin: Billing & Payouts navigates to Billing', async ({ page }) => {
  39  |     await loginAsAdmin(page);
  40  |     await openProfileMenu(page);
  41  |     await page.getByRole('button', { name: /billing.*payouts/i }).click();
  42  |     await expect(page.locator('text=Billing').first()).toBeVisible();
  43  |   });
  44  | 
  45  |   test('admin: API Keys navigates to Integration Settings', async ({ page }) => {
  46  |     await loginAsAdmin(page);
  47  |     await openProfileMenu(page);
  48  |     await page.getByRole('button', { name: /api keys/i }).click();
  49  |     await expect(page.locator('text=Integration Settings').first()).toBeVisible();
  50  |   });
  51  | 
  52  |   test('brand: Account Settings navigates to Settings', async ({ page }) => {
  53  |     await loginAsBrand(page, 'Nordhaus Living ApS');
  54  |     await openProfileMenu(page);
  55  |     await page.getByRole('button', { name: /account settings/i }).click();
  56  |     await expect(page.locator('text=Settings').first()).toBeVisible();
  57  |   });
  58  | 
  59  |   test('sign out returns to homepage', async ({ page }) => {
  60  |     await loginAsAdmin(page);
  61  |     await openProfileMenu(page);
  62  |     await page.getByRole('button', { name: /sign out/i }).click();
  63  |     await expect(page.locator('text=Wholesale Distribution').first()).toBeVisible();
  64  |   });
  65  | });
  66  | 
  67  | test.describe('§Batch-19 — Card clickability', () => {
  68  |   test('brand dashboard Revenue card navigates to Reports tab', async ({ page }) => {
  69  |     await loginAsBrand(page, 'Nordhaus Living ApS');
  70  |     // The dashboard should have metric cards — click the "Revenue" card
  71  |     await page.waitForSelector('text=Revenue');
  72  |     await page.getByText('Revenue').first().click();
  73  |     await page.waitForTimeout(500);
  74  |     // Should navigate to Reports tab — check for report content
  75  |     await expect(page.locator('text=Reports v2').or(page.locator('text=ASIN Confirmation Rate')).first()).toBeVisible({ timeout: 5000 });
  76  |   });
  77  | 
  78  |   test('admin overview Revenue card opens drill-down modal', async ({ page }) => {
  79  |     await loginAsAdmin(page);
  80  |     // Navigate to Overview first (Super Admin lands on Super Admin Panel)
  81  |     await page.getByRole('button', { name: 'Overview' }).first().click();
  82  |     await page.waitForSelector('text=Admin Overview');
  83  |     // Click the Revenue This Month card
  84  |     await page.getByText('Revenue This Month').first().click();
  85  |     await page.waitForTimeout(500);
  86  |     // Should open a drill-down modal
  87  |     await expect(page.locator('text=commission').first()).toBeVisible({ timeout: 5000 });
  88  |     // Close the modal
  89  |     const close = page.locator('button[aria-label="Close detail view"]').or(
  90  |       page.locator('button:has(svg.lucide-x)').first());
  91  |     if (await close.isVisible({ timeout: 2000 }).catch(() => false)) {
  92  |       await close.click();
  93  |       await page.waitForTimeout(300);
  94  |       // Check the modal is gone by looking for a modal-specific element
  95  |       await expect(page.locator('[class*="fixed"][class*="inset-0"]').or(
  96  |         page.locator('text=commission breakdown').first()).first()).not.toBeVisible({ timeout: 3000 });
  97  |     }
  98  |   });
  99  | 
  100 |   test('brand dashboard Compliance Score card navigates to Compliance tab', async ({ page }) => {
  101 |     await loginAsBrand(page, 'Nordhaus Living ApS');
  102 |     await page.waitForSelector('text=Compliance Score');
  103 |     await page.getByText('Compliance Score').first().click();
  104 |     await page.waitForTimeout(500);
  105 |     await expect(page.locator('text=UK Compliance').first()).toBeVisible({ timeout: 5000 });
  106 |   });
  107 | 
  108 |   test('brand dashboard Shipments card navigates to Logistics tab', async ({ page }) => {
  109 |     await loginAsBrand(page, 'Nordhaus Living ApS');
```