# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: support-views.spec.ts >> Helpdesk / Support role interactions >> HelpdeskDashboard search or filter interaction works
- Location: e2e/support-views.spec.ts:32:7

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
  2  |  * §Support role coverage — Helpdesk/Support dashboard interaction tests.
  3  |  *
  4  |  * Verifies the HelpdeskDashboard renders with real ticket data and interactive
  5  |  * elements, not just static HTML. The helpdesk is accessed via the admin portal's
  6  |  * Helpdesk nav item (Mercenta Admin / Support Agent role).
  7  |  */
  8  | import { test, expect, type Page } from '@playwright/test';
  9  | 
  10 | async function loginAsAdmin(page: Page) {
  11 |   await page.goto('/');
> 12 |   await page.getByRole('button', { name: /portal login/i }).first().click();
     |                                                                     ^ Error: locator.click: Test timeout of 30000ms exceeded.
  13 |   await page.waitForSelector('text=Investor Demo Access');
  14 |   await page.getByRole('button', { name: /Super Admin.*Tadii/i }).click();
  15 |   await page.waitForSelector("text=Super Admin Panel");
  16 | }
  17 | 
  18 | test.describe('Helpdesk / Support role interactions', () => {
  19 |   test('HelpdeskDashboard renders with ticket data', async ({ page }) => {
  20 |     await loginAsAdmin(page);
  21 |     await page.getByRole('button', { name: 'Helpdesk' }).first().click();
  22 |     await page.waitForSelector("text=Helpdesk");
  23 |     await page.waitForTimeout(500);
  24 |     // Verify real content: ticket list, search or status filter
  25 |     await expect(page.locator('text=Helpdesk').first()).toBeVisible({ timeout: 5000 });
  26 |     // Check for interactive ticket elements (tickets, filters, or search)
  27 |     const hasTicketContent = await page.locator('text=/ticket|Ticket|Brand/').first().isVisible({ timeout: 3000 }).catch(() => false);
  28 |     const hasInteractive = await page.locator('button, input, select, a').first().isVisible({ timeout: 3000 }).catch(() => false);
  29 |     expect(hasTicketContent || hasInteractive).toBeTruthy();
  30 |   });
  31 | 
  32 |   test('HelpdeskDashboard search or filter interaction works', async ({ page }) => {
  33 |     await loginAsAdmin(page);
  34 |     await page.getByRole('button', { name: 'Helpdesk' }).first().click();
  35 |     await page.waitForTimeout(500);
  36 |     // Try to find an input or select element
  37 |     const searchInput = page.locator('input[type="text"], input[placeholder*="Search"], input[placeholder*="search"], input:not([type="hidden"])').first();
  38 |     if (await searchInput.isVisible({ timeout: 3000 }).catch(() => false)) {
  39 |       await searchInput.fill('test');
  40 |       await page.waitForTimeout(200);
  41 |       // Verify state changed (input has value)
  42 |       const val = await searchInput.inputValue();
  43 |       expect(val).toBe('test');
  44 |     }
  45 |   });
  46 | 
  47 |   test('Carrier dashboard shows interactive manifest data', async ({ page }) => {
  48 |     await page.goto('/');
  49 |     await page.getByRole('button', { name: /portal login/i }).first().click();
  50 |     await page.waitForSelector('text=Investor Demo Access');
  51 |     await page.getByRole('button', { name: /3PL Carrier Terminal/i }).first().click();
  52 |     await page.waitForSelector('text=Manifest Management');
  53 |     // Check for interactive elements beyond just rendering
  54 |     const hasButtons = await page.locator('button').first().isVisible({ timeout: 3000 }).catch(() => false);
  55 |     const hasTable = await page.locator('table').first().isVisible({ timeout: 3000 }).catch(() => false);
  56 |     expect(hasButtons || hasTable).toBeTruthy();
  57 |   });
  58 | });
```