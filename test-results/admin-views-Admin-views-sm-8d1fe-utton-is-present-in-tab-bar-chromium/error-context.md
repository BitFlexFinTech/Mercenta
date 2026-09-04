# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: admin-views.spec.ts >> Admin views smoke-render >> Fulfillment Track sub-tab navigation >> Bulk Recalculate button is present in tab bar
- Location: e2e/admin-views.spec.ts:86:7

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
  2  |  * §Batch-11 — Admin views smoke-render E2E tests.
  3  |  *
  4  |  * Visits every admin view and confirms the expected breadcrumb/heading renders
  5  |  * without error. Uses the existing demo login flow.
  6  |  */
  7  | import { test, expect, type Page } from '@playwright/test';
  8  | 
  9  | async function loginAsAdmin(page: Page) {
  10 |   await page.goto('/');
> 11 |   await page.getByRole('button', { name: /portal login/i }).first().click();
     |                                                                     ^ Error: locator.click: Test timeout of 30000ms exceeded.
  12 |   await page.waitForSelector('text=Investor Demo Access');
  13 |   await page.getByRole('button', { name: /Super Admin.*Tadii/i }).click();
  14 |   await page.waitForSelector("text=Super Admin Panel");
  15 |   // Navigate to Overview (Super Admin lands on Super Admin Panel by default)
  16 |   await page.getByRole('button', { name: 'Overview' }).first().click();
  17 |   await page.waitForSelector("text=Admin Overview");
  18 | }
  19 | 
  20 | interface AdminView {
  21 |   navLabel: string;
  22 |   headingText: string;
  23 |   superAdminOnly?: boolean;
  24 | }
  25 | 
  26 | const ADMIN_VIEWS: AdminView[] = [
  27 |   { navLabel: 'Overview', headingText: 'Admin Overview' },
  28 |   { navLabel: 'Brand CRM', headingText: 'Brand CRM' },
  29 |   { navLabel: 'Fulfillment Track', headingText: 'Fulfillment Track' },
  30 |   { navLabel: 'Retail Pipeline', headingText: 'Retail Pipeline' },
  31 |   { navLabel: 'Purchase Orders', headingText: 'Purchase Orders' },
  32 |   { navLabel: 'Logistics Control', headingText: 'Logistics Control' },
  33 |   { navLabel: 'Carrier Integration Monitor', headingText: 'Carrier Integration' },
  34 |   { navLabel: 'Global Catalog Manager', headingText: 'Global Catalog' },
  35 |   { navLabel: 'Compliance Approvals', headingText: 'Compliance Approvals' },
  36 |   { navLabel: 'Billing', headingText: 'Billing' },
  37 |   { navLabel: 'Contract Cycle', headingText: 'Contract Cycle' },
  38 |   { navLabel: 'Communications', headingText: 'Communications' },
  39 |   { navLabel: 'Helpdesk', headingText: 'Helpdesk' },
  40 |   { navLabel: 'Returns Tracking', headingText: 'Returns Tracking' },
  41 |   { navLabel: 'Monitoring', headingText: 'Monitoring' },
  42 |   { navLabel: 'Marketing', headingText: 'Marketing' },
  43 |   { navLabel: 'Super Admin Panel', headingText: 'Super Admin Panel', superAdminOnly: true },
  44 |   { navLabel: 'Audit Log', headingText: 'Audit Log', superAdminOnly: true },
  45 |   { navLabel: 'Integration Settings', headingText: 'Integration Settings', superAdminOnly: true },
  46 |   { navLabel: 'Onboarding Tours', headingText: 'Onboarding Tours' },
  47 |   { navLabel: 'Rocket.Chat', headingText: 'Rocket.Chat' },
  48 |   { navLabel: 'Social Media Manager', headingText: 'Social Media Scheduler' },
  49 |   { navLabel: 'WhatsApp Escalation', headingText: 'WhatsApp Escalation' },
  50 | ];
  51 | 
  52 | test.describe('Admin views smoke-render', () => {
  53 |   test.beforeEach(async ({ page }) => {
  54 |     await loginAsAdmin(page);
  55 |   });
  56 | 
  57 |   test('all admin views render correctly', async ({ page }) => {
  58 |     for (const view of ADMIN_VIEWS) {
  59 |       const navBtn = page.locator(`button:has-text("${view.navLabel}")`).first();
  60 |       await navBtn.click();
  61 |       await page.waitForTimeout(500);
  62 |       await expect(page.locator(`text=${view.headingText}`).first()).toBeVisible({ timeout: 5000 });
  63 |       await page.screenshot({ path: `e2e/screenshots/admin-${view.navLabel.toLowerCase().replace(/\s+/g, '-')}.png` });
  64 |     }
  65 |   });
  66 | test.describe('Fulfillment Track sub-tab navigation', () => {
  67 |   test.beforeEach(async ({ page }) => {
  68 |     await loginAsAdmin(page);
  69 |     // Navigate to Fulfillment Track
  70 |     await page.locator('button:has-text("Fulfillment Track")').first().click();
  71 |     await page.waitForSelector('text=Fulfillment Track');
  72 |   });
  73 | 
  74 |   test('Simulator tab shows What-If Scoring Simulator', async ({ page }) => {
  75 |     await page.locator('button:has-text("Simulator")').first().click();
  76 |     await page.waitForTimeout(500);
  77 |     await expect(page.locator('text=What-If Scoring Simulator').first()).toBeVisible({ timeout: 5000 });
  78 |   });
  79 | 
  80 |   test('History tab shows Score History section', async ({ page }) => {
  81 |     await page.locator('button:has-text("History")').first().click();
  82 |     await page.waitForTimeout(500);
  83 |     await expect(page.locator('text=Score History').first()).toBeVisible({ timeout: 5000 });
  84 |   });
  85 | 
  86 |   test('Bulk Recalculate button is present in tab bar', async ({ page }) => {
  87 |     await expect(page.locator('button:has-text("Bulk Recalculate")').first()).toBeVisible({ timeout: 5000 });
  88 |   });
  89 | });
  90 | });
```