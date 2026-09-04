# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: batch-d-integrations.spec.ts >> Batch D — Integration panels >> Instantly.ai card renders in integration registry
- Location: e2e/batch-d-integrations.spec.ts:63:7

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
  1   | /**
  2   |  * §Batch-11 — Batch D integration panels E2E tests.
  3   |  *
  4   |  * Verifies the new Batch D components render in the admin panel:
  5   |  *   - WhatsApp escalation panel
  6   |  *   - Postiz social scheduling panel
  7   |  *   - Integration registry card updates
  8   |  */
  9   | import { test, expect, type Page } from '@playwright/test';
  10  | 
  11  | async function loginAsAdmin(page: Page) {
  12  |   await page.goto('/');
> 13  |   await page.getByRole('button', { name: /portal login/i }).first().click();
      |                                                                     ^ Error: locator.click: Test timeout of 30000ms exceeded.
  14  |   await page.waitForSelector('text=Investor Demo Access');
  15  |   await page.getByRole('button', { name: /Super Admin.*Tadii/i }).first().click();
  16  |   await page.waitForSelector("text=Super Admin Panel");
  17  |   // Navigate to Overview first
  18  |   await page.getByRole('button', { name: 'Overview' }).first().click();
  19  |   await page.waitForSelector("text=Admin Overview");
  20  | }
  21  | 
  22  | async function navigateToAdminView(page: Page, label: string) {
  23  |   const navBtn = page.locator(`button:has-text("${label}")`).first();
  24  |   if (await navBtn.isVisible()) {
  25  |     await navBtn.click();
  26  |   } else {
  27  |     // Scroll down if not visible
  28  |     await page.evaluate(() => window.dispatchEvent(new WheelEvent('wheel', { deltaY: 800 })));
  29  |     await page.waitForTimeout(400);
  30  |     const btn2 = page.locator(`button:has-text("${label}")`).first();
  31  |     if (await btn2.isVisible()) await btn2.click();
  32  |   }
  33  |   await page.waitForTimeout(500);
  34  | }
  35  | 
  36  | test.describe('Batch D — Integration panels', () => {
  37  |   test.beforeEach(async ({ page }) => {
  38  |     await loginAsAdmin(page);
  39  |   });
  40  | 
  41  |   test('WhatsApp escalation panel renders', async ({ page }) => {
  42  |     // Navigate to Integration Settings
  43  |     await navigateToAdminView(page, 'Integration Settings');
  44  |     // The WhatsApp card should be in the integration registry
  45  |     // Look for the Twilio WhatsApp card text
  46  |     await expect(page.locator('text=Twilio WhatsApp').first()).toBeVisible({ timeout: 5000 });
  47  |     await page.screenshot({ path: 'e2e/screenshots/batchD-whatsapp-card.png' });
  48  |   });
  49  | 
  50  |   test('OpenRouter card renders in integration registry', async ({ page }) => {
  51  |     // Navigate to Integration Settings
  52  |     await navigateToAdminView(page, 'Integration Settings');
  53  |     await expect(page.locator('text=OpenRouter').first()).toBeVisible({ timeout: 5000 });
  54  |     await page.screenshot({ path: 'e2e/screenshots/batchD-openrouter-card.png' });
  55  |   });
  56  | 
  57  |   test('Hunter.io card renders in integration registry', async ({ page }) => {
  58  |     await navigateToAdminView(page, 'Integration Settings');
  59  |     await expect(page.locator('text=Hunter.io').first()).toBeVisible({ timeout: 5000 });
  60  |     await page.screenshot({ path: 'e2e/screenshots/batchD-hunter-card.png' });
  61  |   });
  62  | 
  63  |   test('Instantly.ai card renders in integration registry', async ({ page }) => {
  64  |     await navigateToAdminView(page, 'Integration Settings');
  65  |     await expect(page.locator('text=Instantly.ai').first()).toBeVisible({ timeout: 5000 });
  66  |     await page.screenshot({ path: 'e2e/screenshots/batchD-instantly-card.png' });
  67  |   });
  68  | 
  69  |   test('Transactional Email card renders in integration registry', async ({ page }) => {
  70  |     await navigateToAdminView(page, 'Integration Settings');
  71  |     await expect(page.locator('text=Transactional Email').first()).toBeVisible({ timeout: 5000 });
  72  |     await page.screenshot({ path: 'e2e/screenshots/batchD-email-card.png' });
  73  |   });
  74  |   test('Postiz card renders in integration registry', async ({ page }) => {
  75  |     await navigateToAdminView(page, 'Integration Settings');
  76  |     await expect(page.locator('text=Postiz').first()).toBeVisible({ timeout: 5000 });
  77  |     await page.screenshot({ path: 'e2e/screenshots/batchD-postiz-card.png' });
  78  |   });
  79  | 
  80  |   test('Rocket.Chat panel still renders', async ({ page }) => {
  81  |     await navigateToAdminView(page, 'Rocket.Chat');
  82  |     await expect(page.locator('text=Rocket.Chat Support').first()).toBeVisible({ timeout: 5000 });
  83  |     await page.screenshot({ path: 'e2e/screenshots/batchD-rocketchat-panel.png' });
  84  |   });
  85  | 
  86  |   test('Usertour panel still renders', async ({ page }) => {
  87  |     await navigateToAdminView(page, 'Onboarding Tours');
  88  |     await expect(page.locator('text=Onboarding Tours').first()).toBeVisible({ timeout: 5000 });
  89  |     await page.screenshot({ path: 'e2e/screenshots/batchD-usertour-panel.png' });
  90  |   });
  91  | 
  92  |   test('Keepa API card renders in integration registry', async ({ page }) => {
  93  |     await navigateToAdminView(page, 'Integration Settings');
  94  |     await expect(page.locator('text=Keepa API').first()).toBeVisible({ timeout: 5000 });
  95  |     await page.screenshot({ path: 'e2e/screenshots/batchD-keepa-card.png' });
  96  |   });
  97  | 
  98  |   test('Firecrawl card renders in integration registry', async ({ page }) => {
  99  |     await navigateToAdminView(page, 'Integration Settings');
  100 |     await expect(page.locator('text=Firecrawl').first()).toBeVisible({ timeout: 5000 });
  101 |     await page.screenshot({ path: 'e2e/screenshots/batchD-firecrawl-card.png' });
  102 |   });
  103 | 
  104 |   test('Lead Sourcing card renders in integration registry', async ({ page }) => {
  105 |     await navigateToAdminView(page, 'Integration Settings');
  106 |     await expect(page.locator('text=Lead Sourcing').first()).toBeVisible({ timeout: 5000 });
  107 |     await page.screenshot({ path: 'e2e/screenshots/batchD-lead-sourcing-card.png' });
  108 |   });
  109 | 
  110 |   test('Amazon SP-API card renders in integration registry', async ({ page }) => {
  111 |     await navigateToAdminView(page, 'Integration Settings');
  112 |     await expect(page.locator('text=Amazon Selling Partner API').first()).toBeVisible({ timeout: 5000 });
  113 |     await page.screenshot({ path: 'e2e/screenshots/batchD-amazon-spapi-card.png' });
```