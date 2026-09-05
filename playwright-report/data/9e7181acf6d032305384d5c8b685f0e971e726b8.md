# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: xero.spec.ts >> Xero Accounting >> 3. Reset tracker shows "Not connected" state
- Location: e2e/xero.spec.ts:34:3

# Error details

```
Test timeout of 30000ms exceeded.
```

```
Error: page.click: Test timeout of 30000ms exceeded.
Call log:
  - waiting for locator('text=Get Started')

```

# Page snapshot

```yaml
- generic [ref=e3]:
  - navigation [ref=e4]:
    - generic [ref=e5]:
      - button "Mercenta Partners home" [ref=e6] [cursor=pointer]:
        - generic [ref=e7]: MercentaPartners
      - generic [ref=e8]:
        - button "About Us" [ref=e9] [cursor=pointer]
        - button "Services" [ref=e10] [cursor=pointer]
        - button "UK Network" [ref=e11] [cursor=pointer]
      - button "Partner Login" [ref=e12] [cursor=pointer]
  - generic [ref=e14]:
    - generic [ref=e15]:
      - paragraph [ref=e16]: Wholesale Distribution — United Kingdom
      - heading "Your brand. The UK market. No infrastructure required." [level=1] [ref=e17]
      - paragraph [ref=e18]: Mercenta Partners is a self-service platform that gets independent brands into the UK market. You onboard yourself, manage your catalogue, and track every order in real-time. We handle distribution.
      - generic [ref=e19]:
        - button "See if your brand qualifies" [ref=e20] [cursor=pointer]
        - button "Partner Login" [ref=e23] [cursor=pointer]
      - generic [ref=e24]:
        - generic [ref=e25]: EORI REGISTERED
        - generic [ref=e29]: UKCA COMPLIANT
        - generic [ref=e33]: HMRC DIRECT
    - generic [ref=e38]:
      - generic [ref=e39]:
        - generic [ref=e40]: Shipment Tracker
        - generic [ref=e41]: LIVE
      - generic [ref=e52]:
        - generic [ref=e53]: Origin
        - generic [ref=e54]: In Transit
        - generic [ref=e55]: UK Arrival
      - generic [ref=e56]:
        - generic [ref=e57]:
          - generic [ref=e58]: BXB-2847 · Mixed Consumer Goods
          - generic [ref=e59]: SEA FREIGHT
        - generic [ref=e60]: Factory Intake
        - generic [ref=e65]: In Transit
        - generic [ref=e70]: UK Customs Cleared
        - generic [ref=e75]:
          - generic [ref=e76]: UK Retail Live
          - generic [ref=e77]: IN PROGRESS
  - generic [ref=e79]:
    - heading "How it works" [level=2] [ref=e80]
    - paragraph [ref=e81]: Onboard, distribute, manage — all from your portal.
    - generic [ref=e82]:
      - generic [ref=e83]:
        - heading "Onboard your brand" [level=3] [ref=e88]
        - paragraph [ref=e89]: Submit your products and compliance documents. Self-service, no waiting.
      - generic [ref=e90]:
        - heading "We distribute" [level=3] [ref=e97]
        - paragraph [ref=e98]: Your products go live across major UK retail channels with full logistics handled.
      - generic [ref=e99]:
        - heading "You manage from your portal" [level=3] [ref=e105]
        - paragraph [ref=e106]: Acknowledge orders, track shipments, monitor performance. All in real-time.
  - generic [ref=e108]:
    - heading "Full visibility. No black box." [level=2] [ref=e109]
    - paragraph [ref=e110]: You see what we see. Every order, every shipment, every metric — in your portal, in real-time. No monthly reports. No chasing anyone for updates.
    - generic [ref=e111]:
      - generic [ref=e112]:
        - heading "Every Order in Real-Time" [level=3] [ref=e118]
        - paragraph [ref=e119]: See every order in your portal the moment it's placed. No monthly reports. No chasing.
      - generic [ref=e120]:
        - heading "Live Shipment Tracking" [level=3] [ref=e127]
        - paragraph [ref=e128]: Track every shipment from origin to delivery. You see what we see, always.
      - generic [ref=e129]:
        - heading "UK-Based Distribution" [level=3] [ref=e134]
        - paragraph [ref=e135]: Mercenta Partners is a UK-based distribution company working with a curated portfolio of independent brands across health, home, kitchen, and consumer categories.
      - generic [ref=e136]:
        - heading "Automated Order-to-Fulfilment" [level=3] [ref=e141]
        - paragraph [ref=e142]: Our platform automates the full order-to-fulfilment cycle, giving brands UK market access without the infrastructure.
  - generic [ref=e144]:
    - heading "Three origins, one UK destination" [level=2] [ref=e145]
    - paragraph [ref=e146]: We source from independent brands worldwide — every route ends at the UK market.
    - generic [ref=e147]:
      - generic [ref=e148]:
        - generic [ref=e149]:
          - generic [ref=e150]: 🇺🇸
          - heading [level=3]
        - paragraph [ref=e153]: US Brands → UK Market
        - paragraph [ref=e154]: American brands enter through our established trade corridors into major UK retail channels.
      - generic [ref=e155]:
        - generic [ref=e156]:
          - generic [ref=e157]: 🇪🇺
          - heading [level=3]
        - paragraph [ref=e163]: EU Brands → UK Market
        - paragraph [ref=e164]: European brands move by road freight into UK distribution with full compliance handled.
      - generic [ref=e165]:
        - generic [ref=e166]:
          - generic [ref=e167]: 🌍
          - heading [level=3]
        - paragraph [ref=e172]: African Brands → UK Market
        - paragraph [ref=e173]: African brands ship through our depot network into UK retail channels.
  - generic [ref=e175]:
    - heading "The Size of the Opportunity" [level=2] [ref=e176]
    - paragraph [ref=e177]: We aren't a needle in a haystack — we are the haystack. Here is the size of it.
    - generic [ref=e179]:
      - generic [ref=e180]:
        - generic [ref=e183]: UK Import Market — TAM / SAM
        - generic [ref=e184]: 2024 Data
      - generic [ref=e185]:
        - generic [ref=e186]:
          - paragraph [ref=e187]: Total Addressable Market
          - paragraph [ref=e188]: GBP 45B
          - paragraph [ref=e189]: All UK import value across 10 categories
        - generic [ref=e190]:
          - paragraph [ref=e191]: Serviceable Addressable Market
          - paragraph [ref=e192]: GBP 6.5B
          - paragraph [ref=e193]: Realistic reach given wholesale model and sourcing regions
      - paragraph [ref=e194]: "Source: ONS UK Trade in Goods (SITC), 2024 data - illustrative demo figures. SAM is directional — see full report for methodology."
  - generic [ref=e198]:
    - generic: UK CustomsCleared for Retail
    - heading "Ready to enter the UK market?" [level=2] [ref=e199]
    - paragraph [ref=e200]: Join independent brands already scaling through Mercenta Partners.
    - button "See if your brand qualifies" [ref=e201] [cursor=pointer]
  - contentinfo [ref=e204]:
    - generic [ref=e205]:
      - img "Mercenta Partners Ltd" [ref=e206]
      - generic [ref=e207]:
        - button "Privacy Policy" [ref=e208] [cursor=pointer]
        - button "Terms of Service" [ref=e209] [cursor=pointer]
      - generic [ref=e210]: Mercenta Partners Ltd · UK Importer of Record — EORI Registered
```

# Test source

```ts
  1  | /**
  2  |  * §E2E — Xero Accounting tab tests.
  3  |  * Tests the Super Admin Accounting panel states.
  4  |  */
  5  | import { test, expect } from '@playwright/test';
  6  | 
  7  | test.describe('Xero Accounting', () => {
  8  |   test('1. Accounting tab shows "Not Connected" state', async ({ page }) => {
  9  |     await page.goto('/');
  10 |     await page.click('text=Get Started');
  11 |     await page.waitForTimeout(500);
  12 |     await page.click('text=Mercenta Admin Hub');
  13 |     await page.waitForTimeout(800);
  14 |     await page.click('text=Accounting');
  15 |     await page.waitForTimeout(1000);
  16 |     await expect(page.locator('text=Xero Not Connected')).toBeVisible({ timeout: 3000 });
  17 |   });
  18 | 
  19 |   test('2. "Enter Xero Credentials" form appears', async ({ page }) => {
  20 |     await page.goto('/');
  21 |     await page.click('text=Get Started');
  22 |     await page.waitForTimeout(500);
  23 |     await page.click('text=Mercenta Admin Hub');
  24 |     await page.waitForTimeout(800);
  25 |     await page.click('text=Accounting');
  26 |     await page.waitForTimeout(1000);
  27 |     await page.click('text=Enter Xero Credentials');
  28 |     await page.waitForTimeout(300);
  29 |     await expect(page.locator('text=Xero API Credentials')).toBeVisible({ timeout: 2000 });
  30 |     await expect(page.locator('input[placeholder="xero-client-id"]')).toBeVisible();
  31 |     await expect(page.locator('input[placeholder="xero-access-token"]')).toBeVisible();
  32 |   });
  33 | 
  34 |   test('3. Reset tracker shows "Not connected" state', async ({ page }) => {
  35 |     await page.goto('/');
> 36 |     await page.click('text=Get Started');
     |                ^ Error: page.click: Test timeout of 30000ms exceeded.
  37 |     await page.waitForTimeout(500);
  38 |     await page.click('text=Mercenta Admin Hub');
  39 |     await page.waitForTimeout(800);
  40 |     await page.click('text=Accounting');
  41 |     await page.waitForTimeout(1000);
  42 |     // Reset tracker is demo-mode only; when not connected, no reset data shown
  43 |     await expect(page.locator('text=Financial Summary')).toBeVisible({ timeout: 3000 });
  44 |   });
  45 | 
  46 |   test('4. Financial summary shows placeholders when not connected', async ({ page }) => {
  47 |     await page.goto('/');
  48 |     await page.click('text=Get Started');
  49 |     await page.waitForTimeout(500);
  50 |     await page.click('text=Mercenta Admin Hub');
  51 |     await page.waitForTimeout(800);
  52 |     await page.click('text=Accounting');
  53 |     await page.waitForTimeout(1000);
  54 |     await expect(page.locator('text=Connect Xero to see financial summary')).toBeVisible({ timeout: 3000 });
  55 |   });
  56 | 
  57 |   test('5. "Manual Reseed" button exists, shows graceful error when not connected', async ({ page }) => {
  58 |     await page.goto('/');
  59 |     await page.click('text=Get Started');
  60 |     await page.waitForTimeout(500);
  61 |     await page.click('text=Mercenta Admin Hub');
  62 |     await page.waitForTimeout(800);
  63 |     await page.click('text=Accounting');
  64 |     await page.waitForTimeout(1000);
  65 |     // When not connected, the button should be "Enter Xero Credentials" instead of "Manual Reseed"
  66 |     const notConnected = page.locator('text=Xero Not Connected');
  67 |     if (await notConnected.isVisible({ timeout: 2000 }).catch(() => false)) {
  68 |       expect(true).toBeTruthy();
  69 |     }
  70 |     // "Manual Reseed" should appear only when connected — verify the button exists conditionally
  71 |     const manualReseedBtn = page.locator('button:has-text("Manual Reseed")').or(page.locator('text=Enter Xero Credentials'));
  72 |     await expect(manualReseedBtn.first()).toBeVisible({ timeout: 2000 });
  73 |   });
  74 | });
```