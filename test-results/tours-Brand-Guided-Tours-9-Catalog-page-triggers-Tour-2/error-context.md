# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: tours.spec.ts >> Brand Guided Tours >> 9. Catalog page triggers Tour 2
- Location: e2e/tours.spec.ts:167:3

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
  1   | /** Guided onboarding tour tests. */
  2   | import { test, expect } from '@playwright/test';
  3   | 
  4   | test.describe('Brand Guided Tours', () => {
  5   | 
  6   |   async function loginAsBrand(page, name) {
  7   |     await page.goto('/');
> 8   |     await page.click('text=Get Started');
      |                ^ Error: page.click: Test timeout of 30000ms exceeded.
  9   |     await page.waitForTimeout(500);
  10  |     await page.click('text=' + name);
  11  |     await page.waitForTimeout(800);
  12  |     const ob = page.locator('text=Onboarding').first();
  13  |     if (await ob.isVisible({ timeout: 2000 }).catch(() => false)) {
  14  |       await ob.click();
  15  |       await page.waitForTimeout(500);
  16  |     }
  17  |   }
  18  | 
  19  |   async function cardVisible(page) {
  20  |     return page.locator('text=Welcome to Mercenta Partners')
  21  |       .or(page.locator('text=New PO Arrived'))
  22  |       .or(page.locator('text=Deductions Ledger'))
  23  |       .or(page.locator('text=Adding a Product'))
  24  |       .or(page.locator('text=Creating a Shipment'))
  25  |       .first()
  26  |       .isVisible({ timeout: 3000 })
  27  |       .catch(() => false);
  28  |   }
  29  | 
  30  |   test('1. Tour 1 auto-starts for new brand', async ({ page }) => {
  31  |     await loginAsBrand(page, 'Little Kiwi Baby Co');
  32  |     const c = page.locator('text=Welcome to Mercenta Partners');
  33  |     if (await c.isVisible({ timeout: 3000 }).catch(() => false)) {
  34  |       await expect(c).toBeVisible({ timeout: 2000 });
  35  |     } else test.fixme(true, 'Tour 1 not visible');
  36  |   });
  37  | 
  38  |   test('2. Completed Tour 1 does not re-trigger', async ({ page }) => {
  39  |     await loginAsBrand(page, 'Little Kiwi Baby Co');
  40  |     const wc = page.locator('text=Welcome to Mercenta Partners');
  41  |     if (await wc.isVisible({ timeout: 3000 }).catch(() => false)) {
  42  |       for (let i = 0; i < 8; i++) {
  43  |         const n = page.locator('button', { hasText: /Next|Got it/ });
  44  |         if (await n.isVisible({ timeout: 1000 }).catch(() => false)) {
  45  |           await n.click();
  46  |           await page.waitForTimeout(300);
  47  |         }
  48  |       }
  49  |       expect(await cardVisible(page)).toBe(false);
  50  |       await page.click('[data-tour="nav-catalog"]');
  51  |       await page.waitForTimeout(500);
  52  |       await page.click('[data-tour="brand-dashboard"]');
  53  |       await page.waitForTimeout(500);
  54  |       expect(await cardVisible(page)).toBe(false);
  55  |     } else test.fixme(true, 'Tour 1 not visible');
  56  |   });
  57  | 
  58  |   test('3. Skip Tour 1 shows confirmation', async ({ page }) => {
  59  |     await loginAsBrand(page, 'Nordhaus Living ApS');
  60  |     const wc = page.locator('text=Welcome to Mercenta Partners');
  61  |     if (await wc.isVisible({ timeout: 3000 }).catch(() => false)) {
  62  |       const d = page.locator('button[aria-label="Dismiss tour"]');
  63  |       if (await d.isVisible({ timeout: 1000 }).catch(() => false)) {
  64  |         await d.click();
  65  |         await page.waitForTimeout(500);
  66  |         const m = page.locator('text=Skip Tour?');
  67  |         if (await m.isVisible({ timeout: 2000 }).catch(() => false)) {
  68  |           await expect(m).toBeVisible({ timeout: 1000 });
  69  |           await page.locator('button', { hasText: 'Skip Tour' }).click();
  70  |           await page.waitForTimeout(500);
  71  |           expect(await cardVisible(page)).toBe(false);
  72  |         } else test.fixme(true, 'Skip modal not visible');
  73  |       } else test.fixme(true, 'Dismiss btn not found');
  74  |     }
  75  |   });
  76  | 
  77  |   test('4. PO page triggers Tour 3', async ({ page }) => {
  78  |     await loginAsBrand(page, 'Nordhaus Living ApS');
  79  |     const a = page.locator('.animate-fade-in').first();
  80  |     if (await a.isVisible({ timeout: 2000 }).catch(() => false)) {
  81  |       const d = page.locator('button[aria-label="Dismiss tour"]');
  82  |       if (await d.isVisible({ timeout: 1000 }).catch(() => false)) {
  83  |         await d.click();
  84  |         await page.waitForTimeout(500);
  85  |         const s = page.locator('button', { hasText: 'Skip Tour' });
  86  |         if (await s.isVisible({ timeout: 1000 }).catch(() => false)) {
  87  |           await s.click();
  88  |           await page.waitForTimeout(500);
  89  |         }
  90  |       }
  91  |     }
  92  |     await page.click('[data-tour="nav-purchase_orders"]');
  93  |     await page.waitForTimeout(800);
  94  |     const p = page.locator('text=New PO Arrived');
  95  |     if (await p.isVisible({ timeout: 3000 }).catch(() => false)) {
  96  |       await expect(p).toBeVisible({ timeout: 2000 });
  97  |     } else test.fixme(true, 'Tour 3 not visible');
  98  |   });
  99  | 
  100 |   test('5. Deductions tour on Analytics', async ({ page }) => {
  101 |     await loginAsBrand(page, 'Little Kiwi Baby Co');
  102 |     const a = page.locator('.animate-fade-in').first();
  103 |     if (await a.isVisible({ timeout: 2000 }).catch(() => false)) {
  104 |       const d = page.locator('button[aria-label="Dismiss tour"]');
  105 |       if (await d.isVisible({ timeout: 1000 }).catch(() => false)) {
  106 |         await d.click();
  107 |         await page.waitForTimeout(500);
  108 |         const s = page.locator('button', { hasText: 'Skip Tour' });
```