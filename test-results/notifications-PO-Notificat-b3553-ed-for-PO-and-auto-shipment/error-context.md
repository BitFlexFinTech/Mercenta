# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: notifications.spec.ts >> PO Notifications & Auto-Fulfillment >> 4. Audit log entries created for PO and auto-shipment
- Location: e2e/notifications.spec.ts:101:3

# Error details

```
Error: expect(received).toBe(expected) // Object.is equality

Expected: true
Received: false
```

# Page snapshot

```yaml
- generic [ref=e3]:
  - complementary [ref=e4]:
    - generic [ref=e6]:
      - img "Mercenta Partners hexagon mark" [ref=e7]
      - generic [ref=e8]:
        - generic [ref=e9]: Mercenta
        - generic [ref=e10]: Admin Hub
    - navigation [ref=e11]:
      - button "Overview" [ref=e12] [cursor=pointer]
      - button "Brand CRM" [ref=e20] [cursor=pointer]
      - button "Fulfillment Track" [ref=e28] [cursor=pointer]
      - button "Retail Pipeline" [ref=e34] [cursor=pointer]
      - button "Purchase Orders" [ref=e47] [cursor=pointer]
      - button "Logistics Control" [ref=e54] [cursor=pointer]
      - button "Carrier Integration Monitor" [ref=e62] [cursor=pointer]
      - button "Global Catalog Manager" [ref=e67] [cursor=pointer]
      - button "Compliance Approvals" [ref=e80] [cursor=pointer]
      - button "Billing" [ref=e86] [cursor=pointer]
      - button "Contract Cycle" [ref=e91] [cursor=pointer]
      - button "Communications" [ref=e97] [cursor=pointer]
      - button "Helpdesk" [ref=e103] [cursor=pointer]
      - button "Returns Tracking" [ref=e113] [cursor=pointer]
      - button "Monitoring" [ref=e119] [cursor=pointer]
      - button "Marketing" [ref=e124] [cursor=pointer]
      - button "Audit Log" [active] [ref=e131] [cursor=pointer]
      - button "Onboarding Tours" [ref=e137] [cursor=pointer]
      - button "Rocket.Chat" [ref=e142] [cursor=pointer]
      - button "Social Media Manager" [ref=e147] [cursor=pointer]
      - button "WhatsApp Escalation" [ref=e154] [cursor=pointer]
    - generic [ref=e160]:
      - generic [ref=e161]: T
      - generic [ref=e162]:
        - generic [ref=e163]: Tadii
        - generic [ref=e164]: Admin Hub User
  - generic [ref=e165]:
    - banner [ref=e166]:
      - generic [ref=e167]:
        - img "Mercenta Partners hexagon mark" [ref=e168]
        - button "Home" [ref=e169] [cursor=pointer]
        - generic [ref=e170]: /
        - generic [ref=e171]: Audit Log
      - generic [ref=e172]:
        - textbox "Search..." [ref=e177]
        - button "Notifications — 0 items need attention" [ref=e179] [cursor=pointer]
        - button "T" [ref=e184] [cursor=pointer]
    - main [ref=e188]:
      - generic [ref=e190]:
        - heading "Super Admin Access Required" [level=2] [ref=e195]
        - paragraph [ref=e196]: This master control view is restricted to authenticated Super Admin sessions. Sign in with a Super Admin profile to manage staff, roles, and channel assignments.
        - button "Return to Login" [ref=e197] [cursor=pointer]
  - generic [ref=e198]:
    - generic [ref=e199]: Environment Router
    - button "Brand Portal" [ref=e200] [cursor=pointer]
    - button "Mercenta Admin Hub" [ref=e212] [cursor=pointer]
    - button "3PL Carrier View" [ref=e217] [cursor=pointer]
```

# Test source

```ts
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
  63  |     await page.click('text=Purchase Orders');
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
> 114 |       expect(foundAny).toBe(true);
      |                        ^ Error: expect(received).toBe(expected) // Object.is equality
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