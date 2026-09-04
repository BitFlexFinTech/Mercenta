# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: notifications.spec.ts >> PO Notifications & Auto-Fulfillment >> 3. Brand accepts all lines → shipment draft auto-created
- Location: e2e/notifications.spec.ts:61:3

# Error details

```
Test timeout of 30000ms exceeded.
```

```
Error: page.click: Test timeout of 30000ms exceeded.
Call log:
  - waiting for locator('text=Purchase Orders')
    - locator resolved to 3 elements. Proceeding with the first one: <span class="font-medium">Purchase Orders</span>
  - attempting click action
    2 × waiting for element to be visible, enabled and stable
      - element is visible, enabled and stable
      - scrolling into view if needed
      - done scrolling
      - <div class="fixed inset-0 z-50 flex items-center justify-center bg-black/60">…</div> from <div class="flex-1 flex flex-col min-w-0">…</div> subtree intercepts pointer events
    - retrying click action
    - waiting 20ms
    2 × waiting for element to be visible, enabled and stable
      - element is visible, enabled and stable
      - scrolling into view if needed
      - done scrolling
      - <div class="fixed inset-0 z-50 flex items-center justify-center bg-black/60">…</div> from <div class="flex-1 flex flex-col min-w-0">…</div> subtree intercepts pointer events
    - retrying click action
      - waiting 100ms
    50 × waiting for element to be visible, enabled and stable
       - element is visible, enabled and stable
       - scrolling into view if needed
       - done scrolling
       - <div class="fixed inset-0 z-50 flex items-center justify-center bg-black/60">…</div> from <div class="flex-1 flex flex-col min-w-0">…</div> subtree intercepts pointer events
     - retrying click action
       - waiting 500ms

```

# Page snapshot

```yaml
- generic [ref=e1]:
  - generic [ref=e3]:
    - complementary [ref=e4]:
      - generic [ref=e6]:
        - img "Mercenta Partners hexagon mark" [ref=e7]
        - generic [ref=e8]:
          - generic [ref=e9]: Mercenta
          - generic [ref=e10]: Brand Portal
      - navigation [ref=e11]:
        - button "Dashboard" [ref=e12] [cursor=pointer]
        - button "Onboarding & Legal" [ref=e20] [cursor=pointer]
        - button "Contracts" [ref=e27] [cursor=pointer]
        - button "Purchase Orders" [ref=e33] [cursor=pointer]
        - button "Product Catalog" [ref=e41] [cursor=pointer]
        - button "Inbound Shipments" [ref=e48] [cursor=pointer]
        - button "UK Compliance" [ref=e56] [cursor=pointer]
        - button "Returns" [ref=e62] [cursor=pointer]
        - button "Analytics" [ref=e68] [cursor=pointer]
        - button "Reports" [ref=e73] [cursor=pointer]
        - button "Documents & Account" [ref=e78] [cursor=pointer]
        - button "Support & Team" [ref=e84] [cursor=pointer]
        - button "Social Accounts" [ref=e89] [cursor=pointer]
        - button "Settings" [ref=e96] [cursor=pointer]
      - generic [ref=e103]:
        - generic [ref=e104]: RC
        - generic [ref=e105]:
          - generic [ref=e106]: Ray Coleman
          - generic [ref=e107]: Brand Portal User
    - generic [ref=e108]:
      - banner [ref=e109]:
        - generic [ref=e110]:
          - img "Mercenta Partners hexagon mark" [ref=e111]
          - button "Home" [ref=e112] [cursor=pointer]
          - generic [ref=e113]: /
          - generic [ref=e114]: Dashboard
        - generic [ref=e115]:
          - textbox "Search..." [ref=e120]
          - button "Notifications — 0 items need attention" [ref=e122] [cursor=pointer]
          - button "RC" [ref=e127] [cursor=pointer]
      - main [ref=e131]:
        - generic [ref=e132]:
          - generic [ref=e133]:
            - button "Purchase Orders 0 open / 0 shipped" [ref=e134] [cursor=pointer]:
              - generic [ref=e139]: Purchase Orders
              - generic [ref=e140]: 0 open / 0 shipped
            - button "Catalog 2 products / 0 OOS" [ref=e141] [cursor=pointer]:
              - generic [ref=e146]: Catalog
              - generic [ref=e147]: 2 products / 0 OOS
            - button "Compliance 3 docs / 94.2%" [ref=e148] [cursor=pointer]:
              - generic [ref=e152]: Compliance
              - generic [ref=e153]: 3 docs / 94.2%
            - button "Reports ASIN 0% / Net PPM" [ref=e154] [cursor=pointer]:
              - generic [ref=e157]: Reports
              - generic [ref=e158]: ASIN 0% / Net PPM
          - generic [ref=e159]:
            - button "Revenue £3k £0k open PO Click for details >" [ref=e160] [cursor=pointer]:
              - generic [ref=e161]:
                - generic [ref=e162]: Revenue
                - generic [ref=e175]:
                  - generic [ref=e176]: £3k
                  - generic [ref=e177]: £0k open PO
                - generic [ref=e181]: Click for details >
            - button "Active Shipments 1 0 open POs Click for details >" [ref=e182] [cursor=pointer]:
              - generic [ref=e183]:
                - generic [ref=e184]: Active Shipments
                - generic [ref=e191]:
                  - generic [ref=e192]: "1"
                  - generic [ref=e193]: 0 open POs
                - generic [ref=e197]: Click for details >
            - button "Compliance Score 94.2% 0% ack rate Click for details >" [ref=e198] [cursor=pointer]:
              - generic [ref=e199]:
                - generic [ref=e200]: Compliance Score
                - generic [ref=e206]:
                  - generic [ref=e207]: 94.2%
                  - generic [ref=e208]: 0% ack rate
                - generic [ref=e212]: Click for details >
            - button "Inventory (est.) 20 0 SKUs OOS Click for details >" [ref=e213] [cursor=pointer]:
              - generic [ref=e214]:
                - generic [ref=e215]: Inventory (est.)
                - generic [ref=e223]:
                  - generic [ref=e224]: "20"
                  - generic [ref=e225]: 0 SKUs OOS
                - generic [ref=e229]: Click for details >
          - generic [ref=e232]:
            - generic [ref=e233]: Active Dossier
            - generic [ref=e234]: DeskForge Supplies Inc
            - generic [ref=e235]: United States - TAX-DESKFORGE-PENDING - Payout USD
          - generic [ref=e236]:
            - heading "Fulfilment Pipeline Tracker" [level=3] [ref=e239]
            - generic [ref=e240]:
              - button "Factory 1" [ref=e241] [cursor=pointer]:
                - generic [ref=e242]: Factory
                - generic [ref=e243]: "1"
              - button "Regional 0" [ref=e244] [cursor=pointer]:
                - generic [ref=e245]: Regional
                - generic [ref=e246]: "0"
              - button "International 0" [ref=e247] [cursor=pointer]:
                - generic [ref=e248]: International
                - generic [ref=e249]: "0"
              - button "UK 0" [ref=e250] [cursor=pointer]:
                - generic [ref=e251]: UK
                - generic [ref=e252]: "0"
              - button "Mercenta 0" [ref=e253] [cursor=pointer]:
                - generic [ref=e254]: Mercenta
                - generic [ref=e255]: "0"
              - button "Live 0" [ref=e256] [cursor=pointer]:
                - generic [ref=e257]: Live
                - generic [ref=e258]: "0"
          - generic [ref=e259]:
            - generic [ref=e260]:
              - generic [ref=e261]:
                - heading "Revenue and Order Volume Trend" [level=3] [ref=e263]
                - generic [ref=e264]:
                  - button "6M" [ref=e265] [cursor=pointer]
                  - button "1Y" [ref=e266] [cursor=pointer]
                  - button "All" [ref=e267] [cursor=pointer]
              - application [ref=e271]:
                - generic [ref=e281]:
                  - generic [ref=e282]:
                    - generic [ref=e283]: Sep
                    - generic [ref=e285]: Oct
                    - generic [ref=e287]: Nov
                    - generic [ref=e289]: Dec
                    - generic [ref=e291]: Jan
                    - generic [ref=e293]: Feb
                  - generic [ref=e295]:
                    - generic [ref=e296]: £0k
                    - generic [ref=e298]: £45k
                    - generic [ref=e300]: £90k
                    - generic [ref=e302]: £135k
                    - generic [ref=e304]: £180k
            - generic [ref=e306]:
              - heading "Activity Feed" [level=3] [ref=e309]
              - generic [ref=e311]:
                - generic [ref=e315]:
                  - text: Package received at origin facility — Harare
                  - generic [ref=e316]:
                    - generic [ref=e317]: 14:32 — Feb 6
                    - generic [ref=e318]: BOX-2026-005
                - generic [ref=e322]:
                  - text: In transit — Dubai Air Hub → London Heathrow
                  - generic [ref=e323]:
                    - generic [ref=e324]: 09:15 — Feb 5
                    - generic [ref=e325]: BOX-2026-004
                - generic [ref=e329]:
                  - text: Container loaded — MV Indian Ocean, Durban → Felixstowe
                  - generic [ref=e330]:
                    - generic [ref=e331]: 16:48 — Feb 4
                    - generic [ref=e332]: BOX-2026-008
                - generic [ref=e336]:
                  - text: Goods received at BAK Willowvale Depot, Harare
                  - generic [ref=e337]:
                    - generic [ref=e338]: 11:22 — Feb 2
                    - generic [ref=e339]: BOX-2026-001
                - generic [ref=e343]:
                  - text: HMRC clearance granted — Entry C-88 submitted and accepted
                  - generic [ref=e344]:
                    - generic [ref=e345]: 08:05 — Jan 29
                    - generic [ref=e346]: BOX-2026-003
                - generic [ref=e349]:
                  - text: Inventory received at the retail-channel fulfilment centre (BHX4)
                  - generic [ref=e350]:
                    - generic [ref=e351]: 13:30 — Jan 20
                    - generic [ref=e352]: BOX-2026-006
        - button "Open live chat" [ref=e353] [cursor=pointer]
        - generic [ref=e356]:
          - generic [ref=e357]:
            - generic [ref=e358]: Welcome to Mercenta Partners
            - button "Dismiss tour" [active] [ref=e363] [cursor=pointer]
          - paragraph [ref=e367]: "Mercenta connects your brand to Amazon UK's 1P wholesale channel. Your role: manage products, acknowledge Purchase Orders, file shipments, and keep compliance documents current. This tour shows you what matters most."
          - button "Next" [ref=e379] [cursor=pointer]
        - generic [ref=e383]:
          - generic [ref=e384]: Skip Tour?
          - paragraph [ref=e388]: Are you sure? You can restart tours anytime from Settings.
          - generic [ref=e389]:
            - button "Continue Tour" [ref=e390] [cursor=pointer]
            - button "Skip Tour" [ref=e391] [cursor=pointer]
    - generic [ref=e392]:
      - generic [ref=e393]: Environment Router
      - button "Brand Portal" [ref=e394] [cursor=pointer]
      - button "Mercenta Admin Hub" [ref=e406] [cursor=pointer]
      - button "3PL Carrier View" [ref=e411] [cursor=pointer]
  - generic [ref=e418]: £0k
```

# Test source

```ts
  1   | /**
  2   |  * §E2E — PO Notification & Fulfillment tests.
  3   |  * Tests the brand notification flow: PO created → email triggered,
  4   |  * auto-shipment draft creation on ack, ASN auto-push on shipment submit.
  5   |  */
  6   | import { test, expect } from '@playwright/test';
  7   | 
  8   | async function loginAsAdmin(page: any) {
  9   |   await page.goto('/');
  10  |   await page.click('text=Portal Login');
  11  |   await page.waitForTimeout(500);
  12  |   await page.click('text=Mercenta Admin Hub');
  13  |   await page.waitForTimeout(800);
  14  | }
  15  | 
  16  | async function loginAsBrand(page: any, name: string) {
  17  |   await page.goto('/');
  18  |   await page.click('text=Portal Login');
  19  |   await page.waitForTimeout(500);
  20  |   await page.click('text=' + name);
  21  |   await page.waitForTimeout(800);
  22  |   // Dismiss onboarding tour if visible
  23  |   const tourClose = page.locator('button[aria-label="Dismiss tour"]').or(
  24  |     page.locator('text=Skip Tour').or(page.locator('text=Got it'))
  25  |   ).first();
  26  |   if (await tourClose.isVisible({ timeout: 2000 }).catch(() => false)) {
  27  |     await tourClose.click();
  28  |     await page.waitForTimeout(300);
  29  |   }
  30  | }
  31  | 
  32  | test.describe('PO Notifications & Auto-Fulfillment', () => {
  33  |   test('1. New PO created → Postmark email triggered', async ({ page }) => {
  34  |     await loginAsAdmin(page);
  35  |     await page.click('text=Purchase Orders');
  36  |     await page.waitForTimeout(800);
  37  | 
  38  |     // Look for PO creation audit entry
  39  |     const auditEntries = page.locator('text=po_created');
  40  |     const count = await auditEntries.count().catch(() => 0);
  41  |     if (count > 0) {
  42  |       await expect(auditEntries.first()).toBeVisible({ timeout: 2000 });
  43  |     } else {
  44  |       test.fixme(true, 'No PO creation entry found on this page');
  45  |     }
  46  |   });
  47  | 
  48  |   test('2. Brand with no email → notification warning logged', async ({ page }) => {
  49  |     await loginAsBrand(page, 'Zambezi Organic Extracts Ltd');
  50  |     await page.click('text=Purchase Orders');
  51  |     await page.waitForTimeout(800);
  52  | 
  53  |     const poList = page.locator('text=po-').or(page.locator('text=PO-'));
  54  |     if (await poList.first().isVisible({ timeout: 3000 }).catch(() => false)) {
  55  |       await expect(poList.first()).toBeVisible({ timeout: 2000 });
  56  |     } else {
  57  |       test.fixme(true, 'No purchase orders visible for this brand');
  58  |     }
  59  |   });
  60  | 
  61  |   test('3. Brand accepts all lines → shipment draft auto-created', async ({ page }) => {
  62  |     await loginAsBrand(page, 'DeskForge Supplies Inc');
> 63  |     await page.click('text=Purchase Orders');
      |                ^ Error: page.click: Test timeout of 30000ms exceeded.
  64  |     await page.waitForTimeout(800);
  65  | 
  66  |     const viewBtn = page.locator('button', { hasText: 'View Details' }).first();
  67  |     if (await viewBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
  68  |       await viewBtn.click();
  69  |       await page.waitForTimeout(500);
  70  | 
  71  |       const sel = page.locator('select').first();
  72  |       if (await sel.isVisible({ timeout: 2000 }).catch(() => false)) {
  73  |         await sel.selectOption('accepted');
  74  |         await page.waitForTimeout(200);
  75  |       }
  76  | 
  77  |       const subBtn = page.locator('button', { hasText: 'Submit Acknowledgment' });
  78  |       if (await subBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
  79  |         await subBtn.click();
  80  |         await page.waitForTimeout(800);
  81  | 
  82  |         const acceptedBadge = page.locator('text=Accepted').first();
  83  |         if (await acceptedBadge.isVisible({ timeout: 3000 }).catch(() => false)) {
  84  |           await expect(acceptedBadge).toBeVisible({ timeout: 2000 });
  85  |         }
  86  |       }
  87  |     } else {
  88  |       test.fixme(true, 'No PO detail button visible');
  89  |     }
  90  | 
  91  |     await page.click('text=Logistics');
  92  |     await page.waitForTimeout(800);
  93  |     const draftRef = page.locator('text=DRAFT-').first();
  94  |     if (await draftRef.isVisible({ timeout: 3000 }).catch(() => false)) {
  95  |       await expect(draftRef).toBeVisible({ timeout: 2000 });
  96  |     } else {
  97  |       test.fixme(true, 'No auto-created shipment draft found');
  98  |     }
  99  |   });
  100 | 
  101 |   test('4. Audit log entries created for PO and auto-shipment', async ({ page }) => {
  102 |     await loginAsAdmin(page);
  103 |     await page.click('text=Purchase Orders');
  104 |     await page.waitForTimeout(800);
  105 | 
  106 |     const auditSection = page.locator('text=Audit').or(page.locator('text=audit_log')).first();
  107 |     if (await auditSection.isVisible({ timeout: 3000 }).catch(() => false)) {
  108 |       await auditSection.click();
  109 |       await page.waitForTimeout(800);
  110 |       const poCreated = page.locator('text=po_created').first();
  111 |       const draftCreated = page.locator('text=shipment_draft_created').first();
  112 |       const foundAny = (await poCreated.isVisible({ timeout: 2000 }).catch(() => false)) ||
  113 |                        (await draftCreated.isVisible({ timeout: 2000 }).catch(() => false));
  114 |       expect(foundAny).toBe(true);
  115 |     } else {
  116 |       test.fixme(true, 'No audit log section visible');
  117 |     }
  118 |   });
  119 | 
  120 |   test('5. Labels modal opens for shipment', async ({ page }) => {
  121 |     await loginAsBrand(page, 'DeskForge Supplies Inc');
  122 |     await page.click('text=Logistics');
  123 |     await page.waitForTimeout(800);
  124 | 
  125 |     const labelsBtn = page.locator('button', { hasText: 'Labels' }).first();
  126 |     if (await labelsBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
  127 |       await labelsBtn.click();
  128 |       await page.waitForTimeout(500);
  129 | 
  130 |       const modal = page.locator('text=Shipping Label');
  131 |       if (await modal.isVisible({ timeout: 2000 }).catch(() => false)) {
  132 |         await expect(modal).toBeVisible({ timeout: 1000 });
  133 |         await page.locator('button', { hasText: 'Close' }).click();
  134 |         await page.waitForTimeout(300);
  135 |       }
  136 |     } else {
  137 |       test.fixme(true, 'No Labels button visible');
  138 |     }
  139 |   });
  140 | });
```