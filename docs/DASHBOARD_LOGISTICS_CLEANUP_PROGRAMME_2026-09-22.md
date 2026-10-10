# DASHBOARD + LOGISTICS CLEANUP PROGRAMME (2026-09-22) — AGREED PLAN, DECISIONS AND RESUME POINT


> **§BATCH 5 (2026-10-10) — HISTORICAL: MERCENTA SOCIAL WAS REMOVED.** This dated record names the Mercenta
> Social feature (the Postiz engine and its admin control centre, the brand surface, the `social-session` Edge
> Function, `scripts/social-sso/`, and the `e2e/embedded-social.spec.ts` /
> `scripts/validate-e7-embedded-social.mjs` guards). All of it was DELETED on the owner's instruction, and
> `scripts/validate-retired-platforms.mjs` §2c now asserts its ABSENCE. The record is preserved as history;
> any Social-specific statement in it no longer describes the current product.

**Status: COMPLETE — P0, P0.4, P1, **P2**, **P3**, **P4**, **P5**, **P6**, **P7**, **P8**, **P9**, **P10**, **P11** and **P12** are ALL DONE and committed. The programme has no remaining phase.**
**Checkpoint: branch `redesign/foundation`; P2's checkpoint commit is recorded in
`PROJECT_STATUS.md` heading 7 and `HANDOFF.md`; P3's and P4's are recorded in the `CURRENT RESUME STATE` block.
`git status --porcelain` EMPTY.**
**Pushed to GitHub (`redesign/foundation` exists on `origin`; the first push of this repository completed after
~2h13m). `demo.mercenta.co.uk` is deployed + live-verified for P3; P4's deployment is recorded in the resume block.**

This document exists so a future session — with **no memory of the conversation** — can resume
without the plan being re-explained. It records the Founder's decisions verbatim in effect, the
research evidence behind them, and the phase order.

---

## 1. THE TWO GOVERNING PRINCIPLES

1. **Overview = OBSERVE. Operations = ACT.** Overview answers *"what is happening?"* (business
   picture, no action queues, no CTAs). Operations answers *"what must be executed?"* (queues,
   exceptions, CTAs) and sits **directly under Overview** in both shells. The same split applies to
   the **brand** shell, scoped to that brand's own data.
2. **Mercenta is the Amazon Vendor account holder and the proxy.** A brand **never** communicates
   with Amazon (it would breach Amazon's terms). A brand's decision is an **INSTRUCTION to
   Mercenta**, and Mercenta performs the channel action. **Carriers never log into Mercenta either** —
   Mercenta connects DHL/Palletline **by API** (booking, labels, tracking, invoices).

**The brand's ONLY jobs:** accept / reject / backorder a PO → download & print its shipping
documents → ship on time. Everything else is Mercenta's.

---

## 2. THE FOUNDER'S DECISIONS (BINDING)

| # | Decision | Effect |
|---|---|---|
| 1 | **Carriers: DHL + Palletline ONLY** | Remove `fedex` and `bak` everywhere (type, labels, capability table, `BakLogistics`, demo data, validators, docs) |
| 2 | **Payment terms: 14 / 30 / 60 days** | Configured list, selected **per invoice**, available **only after the PO is received**; labelled Mercenta's configuration mirroring Vendor Central (**no Vendor Payments API exists** — register S14) |
| 3 | **PO identity: the SIMPLE model** | **One PO record = the PO from Amazon.** The Mercenta→brand commercial position is **derived from the brand's Model A/B**. **No second PO document. No "Create PO" anywhere.** |
| 4 | **Remove the 3PL carrier surface COMPLETELY — including the demo environment** | Environment, role, shell + its 3 views, `CarrierDashboard`, `BakLogistics`, demo environment switcher entry, "3PL Carrier Terminal" login card, admin "Carrier Monitor", public FAQ claim, and the affected documents |
| 5 | **Inventory, LINKED TO THE BRAND'S CATALOGUE** | Per catalogue product: image · SKU · **ASIN** · available · UoM (Eaches/Cases) · on-hand · committed · inbound · safety stock. Brand-entered **inside Mercenta** (never an Amazon login) |
| 6 | **The Logistics Hub = where brands download shipping labels + ALL PO documents** | The document pack is the Hub's core deliverable, offered **at acceptance** |
| 7 | **Control Centre = ONE action list, founder-only controls** | The work/attention lists leave it; **Work Management is the single action list**; it moves **under Operations** |
| 8 | **Overview cards: ADDITIVE ONLY** | **Every existing Overview card stays.** The discussed cards are ADDED. (The brand's *action sections* "Needs your attention" + "Next actions" MOVED to Operations, as decided — **done in P2**.) |
| 9 | **On PO acceptance, the ASN/shipment/documents are AUTOMATIC** | No brand input by default; the brand corrects only if their packing differs |
| 10 | **ASIN rule** | Brand may add it if the product already exists on Amazon; otherwise Mercenta populates it **when Amazon accepts the product in the catalogue** (in simulation: a clearly-simulated placeholder — the code never invents a real-looking ASIN) |
| 11 | **Consolidation: DEFERRED, but not designed out** | Amazon DOES document multi-PO grouping (`purchaseOrders[]` in the shipment request; per-carton `purchaseOrderNumber` in the ASN; the FTL/LTL ≤100 rule). POs arrive separately today, so: **one PO = one shipment now**, model supports **1..n POs** |

---

## 3. RESEARCH EVIDENCE BEHIND THE DECISIONS (Amazon developer docs + the repo's truth register)

| Fact | Source (verbatim where quoted) |
|---|---|
| **The destination is the FC on the PO** | Ship-to party (EU) = *"The assigned party ID for the ship-to party"*; `shipToPartyId` = FC code (register **S5**) |
| Collect ⇒ Amazon **picks up**; prepaid ⇒ deliver **to the FC on the PO** | Ship window = *"the earliest date that Amazon expects to pick up the freight"*; delivery window = *"delivered to the Amazon fulfillment center listed on the purchase order"* |
| A shipment request needs a **confirmed PO** | *"Check that the purchase order is confirmed"*; *"Unconfirmed purchase orders cause the request to fail"* |
| Pickup lead time | `requestedPickUp` = *"A date at least two business days after the current date"* (the documented replacement for the deleted "10am Pacific" claim — **AV-014**) |
| Amazon assigns the carrier AFTER the request | *"You can only modify requestedPickUp after a carrier is assigned"*; routing instructions come from `GetShipmentDetails`, which returns the **ARN** and pickup/carrier details, and *"only returns a response after carrier assignment, which occurs either on the same day as the scheduled pickup or one day prior"* |
| **Amazon-generated labels are NA-only** | `GetShipmentLabels` = *"Generate shipping labels from Amazon"*, **Regions: NA** (only). **Never claim downloadable Amazon labels for UK/EU.** |
| **SSCC carton labels are vendor-generated** | ASN payload: `cartons[].cartonIdentifiers[{containerIdentificationType: "SSCC", …}]`, `itemDetails.purchaseOrderNumber`, `lotNumber`, `countryOfOrigin` |
| **ASN must beat the goods to the FC** | *"Amazon must receive the shipment confirmation prior to the product being received at the Amazon fulfillment center. Missing or delayed shipment confirmations result in chargebacks."* (**AV-015**) |
| Invoicing rules | Invoice numbers **unique and never reused**; zero-value fails; a wrong invoice is **cancelled** and needs a new Invoice ID; bill-to must match the Amazon **Payee** system; **API invoicing requires parallel testing with Amazon AP** (register **S11**); the unique-number rule is **not modelled** (**AV-022**) |
| **No Vendor Payments API exists** | Register **S14**: *"There is no public Vendor Payments, Deductions, Chargebacks or Vendor-Performance API."* → a payment date can only be **derived** (invoice date + configured terms) |
| Multi-PO grouping IS documented | `SubmitShipments` payload carries `"purchaseOrders": [ {…}, {…} ]`; the ASN references the PO **per carton**; *"a limit of 100 shipment confirmations for every truckload shipment"* |
| The only public **vendor inventory** API is Direct Fulfillment | *"You use the Vendor Direct Fulfillment Inventory API to exchange inventory stock levels with Amazon"*; use case *"Submit an inventory update: Submit partial or full feeds"*; Vendors only; NA/EU/FE. Retail-procurement inventory is Vendor Central/EDI → **Mercenta's inventory model is Mercenta's own, Amazon-shaped** |


---

## 4. THE PROGRAMME (phase order; each phase is verified and committed separately)

| # | Phase | Content | Closes |
|---|---|---|---|
| **P0** | ✅ **DONE** (`ee6d5eb`, `b6bd046`) | payout tiles → the payout ledger · AV-002/003 brand claims corrected · "Logistics Hub" naming · accepted PO → **"Open shipping documents"** deep link with the PO selected | dead-end routing; unsupported Amazon claims; naming vs documentation |
| **P1** | ✅ **DONE** (`92dd06b`) | **Operations = the action centre, directly under Overview** in both shells; admin Operations = Work Management · Purchase Orders · Logistics Hub · Returns Tracking · Carrier Monitor · Calendar; brand Operations = Purchase Orders · Logistics Hub · Returns · Tasks & Deadlines · Calendar | Observe/Act |
| **P2** | ✅ **DONE** (checkpoint recorded in `PROJECT_STATUS.md` §7) | **Overview = Observe, ADDITIVE ONLY, both shells.** Admin: money band (**open PO value** · revenue · gross profit · margin % · **receivables**) + the **unchanged** operational band + **Portfolio volume** (brands · products · POs · order lines · shipments · operational volume · upcoming payments · fulfilment exceptions) + **Financial performance** + **Logistics status**. Brand: **Your earnings** hero band (total earnings · open PO value · payouts due · payouts settled) + **Earnings by month** (its first chart) + observe tiles for the counts the removed queue carried (open deductions · open tickets · returns · invoices outstanding). **Brand action sections moved to Operations** (the work layer is the single action list) — this also completes P3's brand clause. 4 gates repointed with the old contract recorded inline; **`validate-stage19` (an inherited FAIL) genuinely repaired**. | the business-picture gaps |
| **P3** | ✅ **DONE** (commit `21c6869`, plus the §P3 `validate-stage26` repair; checkpoint in the `CURRENT RESUME STATE` block) | **Operations = Act** wiring: **three action lists → ONE.** The Control Centre loses its duplicated work/attention lists (the retired `CommandCentre.tsx` panel **deleted**, its own "Attention" queue removed) and becomes founder-only **CONTROLS** (automation catalogue + approvals + halt, AI, audit, data provenance, the commercial-readiness/pre-audit decision surfaces, a new *Integrations & systems* status panel and a pointer to the single list); the founder console is **projected into the single action list** (Work Management) as Super-Admin-scoped work items carrying the same rank + auditable WHY, with the tab-aware hand-off and a declared cross-scope action-view translation (**no dead hand-off destination in either shell**); badges count the same item set the list renders; fail-closed RBAC. *(Brand attention/next-actions already landed in Operations in P2.)* **An inherited unhealthy gate was genuinely repaired on the way: `validate-stage26` (ThemeProvider harness + a gating bug + stale catalog-import assertions) now PASSES with an honest exit code.** | 3 action lists → 1 |
| **P4** | ✅ **DONE** (2026-09-23, session 16 — see §8) | **Proxy-model corrections**: the brand does its 3 jobs only; **MERCENTA** raises the routing/shipment request and files the ASN (the brand sees status); ack writes an **instruction-to-Mercenta** record; `submitAcknowledgement` behind the SP-API seam (mock-first, Mercenta-side) | **AV-040** (partially), wrong direction, truthfulness |
| **P5** | ✅ **DONE** (2026-09-23, session 17 — see §9) | **Remove the Mercenta Hub completely** → the destination is **the FC declared on each PO** (`PurchaseOrder.shipToParty`, the channel's `shipToPartyId`, resolved once by `src/config/destinationFc.ts`); the `mercenta_hub` stage/status, the hub coordinate, the hub node kind and the Hero's hub node are **deleted**; the Hero/map arrival node **is** that FC; copy, validators and specs repointed with the old contract recorded inline | **D09-13 / AV-026 / AV-027** |
| **P6** | ✅ **DONE** (2026-09-23, session 19 — see §10) | **PO document pack** (auto on acceptance): **SSCC carton labels · carrier label + waybill · packing list/delivery note · ASN sheet · customs documents for international lanes**; notification + nav badge; Hub "Documents for this PO"; collect lane shows the documented status chain (request → carrier assigned → ARN → pickup) | decisions 6/9; `D10-10` |
| **P7** | ✅ **DONE** (2026-09-23, session 20 — see §11) | **Admin invoicing**: an invoice per PO **after receipt** (the receipt gate, `AV-018`); the **invoice-number registry** (unique, never reused, zero-value fails, cancel + re-issue under a NEW Invoice ID — **`AV-022`**); **14/30/60 terms chosen PER INVOICE** with the due date DERIVED from them; **upcoming payments**; receivables = **issued-and-unpaid** | decision 2; **AV-022** |
| **P8** | ✅ **DONE** (2026-09-23, session 21 — see §12) | **Inventory** linked to the catalogue + the **ASIN** field (rule = decision 10): the append-only movement ledger (every figure DERIVED), the Eaches/Cases unit with the product's own case pack (fail-closed), the brand's declaration path (existing listing required) and the channel-assignment path (MERCENTA populates it on acceptance — `SIM-ASIN-…` while simulated), plus the admin override | decision 5; decision 10; **AV-029**, **AV-035** |
| **P9** | ✅ **DONE** (2026-09-23, session 22 — see §13) | **The 3PL carrier surface is REMOVED COMPLETELY** (decision 4): the `carrier` environment, the `'3PL Carrier'` role and its `'3pl'` tier, `CarrierShell`, `CarrierDashboard`, `BakLogistics`, the admin `Carrier Monitor` (component + nav + `'carriers'` view), the demo environment-switcher entry, the "3PL Carrier Terminal" login card, the `/carrier` address and its SEO posture, and the public FAQ claim. Decision 1's carrier identity (`fedex`/`bak`) is removed from the type, the labels, the lane-capability table and the demo data, with the REFUSAL preserved by name (`RETIRED_CARRIER_IDS`). The capability the portal carried — a carrier event that advances a consignment, and its request log — is **REHOMED** on the Mercenta admin Logistics Hub (the operator of those accounts), attributed to the Mercenta operator rather than a carrier login. | decision 4; decision 1; matrix `D01-07`/`D04-18`/`D10-13` |
| **P10** | ✅ **DONE** (2026-09-24, session 23 — see §14) | **Logistics Hub completion**: the carrier **PROVIDER CONFIGURATION** (`D10-10`) rendered by both workspaces from ONE owner, the **PO-document DOWNLOAD QUEUE** (the destination the nav badge already counted), and **consolidation recorded as DEFERRED, not designed out** (decision 11: the 1..n model is functional; the grouping input is P12's scope) | decision 11; `D10-10` |
| **P11** | ✅ **DONE** (2026-09-24, session 24 — see §15) | **"Create PO" is REMOVED** (decision 3) and replaced by **CHANNEL PURCHASE-ORDER INGESTION (mock-first)**: the PO is addressed to Mercenta, routed to the brand from the PO's OWN lines, filed idempotently, and **refused** when it cannot be routed. `createPurchaseOrder` and its duplicate Postmark PO-notification seam are gone; the three gates that pinned that path (E4 S1, E5 J2, E6 F2) are repointed to the new canonical truth | decision 3; matrix `cleanup-p11-remove-create-po` |
| **P12** | ✅ **DONE** (2026-09-24, session 25 — see §16) | **SP-API seam extension (mock-first)**: `getPurchaseOrdersStatus` (receiving sync), `submitShipmentRequest`, `getShipmentDetails`, `getShipmentLabels` (honest UK/EU refusal), `submitShipmentConfirmations`, `submitInvoices`, `submitInventoryUpdate` — the remaining documented Vendor operations, each landing in ONE owner, with the in-code P12 declarations delivered (the receiving sync, the ARN, the deferred consolidation grouping's shipment request, the stock push) | **AV-040** |

**Verification protocol for EVERY phase (no exceptions):** `tsc` (app + root) · eslint · `npm run build` ·
every affected validator · every affected browser spec · **full Playwright suite** · committed-state
re-verification · clean tree. Repointed gates carry an inline `§… — REPOINTED` comment recording the old
contract; **no validator or test is ever weakened or deleted**.

**Won't touch:** Model A/B maths · compliance gate · VAT posture · payout rails · the backorder gate,
carrier-eligibility derivation, ETA and delivery-performance work · tenant isolation/RBAC · audit model ·
admin-only credentials · the existing waybill/label dialogs · the Wave 3 Hero **except** the Mercenta-Hub
node (P5).

---

## 5. RESUME POINT

Read `PROJECT_STATUS.md` (current platform position), this document, then `git log`.

- **Done:** P0, P0.4, P1, **P2**, **P3**, **P4**, **P5**, **P6**, **P7**, **P8**, **P9**, **P10**, **P11**, **P12** (committed; the P2 checkpoint
  hash is recorded in `PROJECT_STATUS.md` §7, and P3–P12's in the `CURRENT RESUME STATE` block).
- **Next:** **NONE — the programme is COMPLETE.** P12 delivered the last documented Vendor operations
  (`AV-040`), so no phase of this programme remains. The full three-way confirmation was re-run at the
  close of P12.
- **Deployment:** executed at the close of each product phase. P3–P12 were deployed and live-verified.

## 6. P2 — WHAT WAS BUILT (so P3+ does not have to re-derive it)

- **Admin Overview** (`src/components/admin/AdminDashboard.tsx`): the first section *Portfolio at a glance* now
  renders **three bands** — *Business position* (hero, `moneyTiles`), *Operations* (the pre-P2 `kpiTiles`,
  unchanged) and *Portfolio volume* (`businessTiles`) — plus two new sections, **Financial performance**
  (canonical revenue streams with their own source labels + cost base + derived gross profit/margin) and
  **Logistics status** (status ring + carrier split + exception/delay/value summary). Receivables and
  upcoming payments are derived from `demoCommerceInvoices` + the declared `INVOICE_TERM_DAYS` (P7's definition
  on the current ledger); every drill-down uses a REAL admin shell view id.
- **Brand Overview** (`src/components/brand/BrandDashboard.tsx`): new `earningsCells` hero band
  (`earnings-total`, `open-po-value`, `payouts-due`, `payouts-settled`) and the *Earnings by month* section
  (`MercentaBars` over the canonical commission records, honest empty state below two months of accrual).
  New observe tiles `open-deductions`, `open-tickets`, `returns-recorded`, `invoices-outstanding`.
  **Removed** (moved, not lost): the "Needs your attention" section, the rail "Next actions" panel, the
  `attentionItems`/`attentionRows`/`quickActions`/`actionRows` derivations and their dead imports/helpers.
- **Work layer** (`src/lib/work/workStore.ts`): the deduction item now carries the canonical `(sim)` marker.
- **Gates**: `scripts/validate-workspace-shell.mjs`, `scripts/validate-e6-brand-surfaces.mjs` (B1–B8),
  `scripts/validate-stage19.mjs`, `e2e/dashboard.spec.ts` (tests 8/9 + new 3b/11),
  `e2e/brand-operational-surfaces.spec.ts` (tests 2/5), `e2e/domain-acceptance.spec.ts` (test 6).

---

## 7. P3 — WHAT WAS BUILT, VERIFIED AND HOW (so P4+ does not have to re-derive it)

### What was built (three action lists → one)

- **`src/components/admin/FounderControlCentre.tsx`** — the Command Centre panel and this screen's own "Attention"
  queue LEFT. What remains is exactly what the Founder decision says: founder-only **CONTROLS** (automation catalogue +
  approvals + halt banner, AI, audit, data provenance), **observe metrics with real drill-downs** (every tile's
  `onOpen` → the existing destination that owns the record), the founder **decision** surfaces (commercial readiness
  with its evidence, pre-audit → acquisition), a NEW **"Integrations & systems"** status panel that keeps the retired
  panel's provider-failure signal, and an explicit **"The action list lives in Operations"** section whose
  `control-open-work` button opens the single list and states the live counts (open · critical · overdue · approvals).
- **`src/components/admin/CommandCentre.tsx` — DELETED** (the third list's UI).
- **`src/lib/work/workStore.ts`** — the founder console is **projected** into the work layer
  (`buildCommandCentre().queue` → `founder_*` sources) carrying the SAME rank and the SAME auditable WHY.
  `FOUNDER_SOURCE_BY_ACTION_ID` is **total** over the console's own queue (an unmapped action would vanish, so the
  mapping is asserted). Items are `superAdminOnly` + `tenantId: null`, and `getWorkItems` **FAILS CLOSED**
  (`opts?.superAdmin ? scoped : scoped.filter(r => r.superAdminOnly !== true)`). Integration health is derived from the
  canonical connection mirror. NEW **declared cross-scope action-view translation** (`WORK_ACTION_VIEWS` /
  `resolveWorkActionView`, 12 neutral ids) so a hand-off can never target a view id that does not exist in the shell
  doing the reading.
- **`src/lib/commandCentre/commandCentre.ts`** — the console no longer derives PO/shipment actions: the work layer is
  their single owner (behaviour otherwise unchanged).
- **`src/components/shared/WorkWorkspace.tsx` / `WorkManagement.tsx` (admin + brand) / `AdminShell.tsx` /
  `src/lib/nav/navBadges.ts`** — rank + WHY rendered on the row and in the record drawer (`work-drawer-why`), the
  tab-aware hand-off preserved (`requestAdminNav({ view, tab: item.navTab })`), founder source filters offered ONLY to
  a session that may see them, and the Work Management badge counts **the same item set the list renders**.

### Gates — repointed, never weakened (old contract recorded inline)

| Gate | Result |
|---|---|
| `scripts/validate-command-centre.mjs` | **40 → 49 checks PASS** (single action list, fail-closed gate, tab-aware hand-off, no dead hand-off destination for ANY work item in EITHER shell, total projection mapping) |
| `scripts/validate-uiux-redesign.mjs` | **347 PASS / 0 FAIL** (its Super-Admin-gate assertion follows the current canonical local) |
| `scripts/validate-workspace-shell.mjs` | **94 PASS / 0 FAIL** |
| `e2e/command-centre.spec.ts` | repointed to Work Management — **4 pass** |
| `e2e/work-layer.spec.ts` | gained the RBAC gate tests — **12 pass** |
| `validate-e5` / `validate-e6` / `validate-e7` / `validate-work-layer` / `validate-founder-operating-system` | **PASS** |
| `scripts/validate-stage26.mjs` | **inherited FAIL genuinely repaired** → see below |

### The `validate-stage26` repair (an inherited unhealthy gate, not P3-caused)

Registry row `discovered-validator-stage26-exit-code` recorded that it printed `STAGE26_VALIDATION_FAIL` while
**ALWAYS exiting 0**, so its failures were invisible. Three genuine defects were fixed with **no assertion removed**:
(1) a **gating bug** — one module-level `gated` flag was mutated by every `readOptional()` call, so reading the present
`catalog-import` artefact cleared the flag set by the absent `compliance-gate-check` one, reporting a SKIP as a FAIL;
each block now carries its own presence flag and an absent artefact (a deploy-time item) is skipped per the
`validate-edge-functions.mjs` convention; (2) `catalog-import`'s assertions were **repointed to the current canonical
source** (tenant derived from the VERIFIED token — `app_metadata.tenant_id ?? user_metadata.tenant_id` — passed as
`p_brand_id: brandId`; a disagreeing body `brandId` refused 403; the 401 worded *"Invalid or expired session — import
refused"*), the invariant (target brand from the verified JWT, never the body) unchanged; (3) Part C now supplies the
real app's provider composition (`QueryClientProvider → ThemeProvider → App`), so `AdminDashboard`, `LogisticsHub` and
`SalesAnalytics` render (the identical repair `validate-homepage-editor.mjs` documents). It now also exits **1 on
failure**. **Result: `STAGE26_VALIDATION_PASS` — 32 ✓ · 3 skipped (absent artefact) · 0 failures · exit 0.**

### Verification performed for P3 (this session)

- `npx tsc --noEmit -p tsconfig.app.json` → **0 errors** · `-p tsconfig.node.json` → **0 errors**.
- `npx eslint .` → **0 problems** (with `react-hooks/rules-of-hooks` + `exhaustive-deps` as **error**, per §Stage-18).
- `npm run build` → **✓ built**.
- **FULL Playwright suite** (`npx playwright test --workers=3`) → **463 passed · 1 failed · 2 skipped (19.0m)**. The one
  failure is `app-shell.spec.ts` test 298 **390x844** — a **30 s TEST timeout** reached during `loginAs` + drawer toggle
  *before any assertion ran* (the 430x932 and 375x812 variants of the same test passed at 27.3 s / 24.6 s under the same
  load). Re-run **in isolation**: **23/23 pass, 390x844 green at 22.8 s with no horizontal overflow** — i.e. the
  contract holds and the full-suite failure is load/budget contention, not an application defect (recorded as
  `discovered-playwright-app-shell-390x844-timeout-under-load`).

### The LIVE leg found and fixed a production-only mount crash (the step that justified the three-way contract)

Deploying and opening `https://demo.mercenta.co.uk` showed the app **never mounted**: `#root` was EMPTY with
`TypeError: E is not a function`. **Nothing local could have caught it** — tsc, eslint, the build and the entire
browser suite were green, because the Playwright suite runs against the **Vite dev server (unbundled)**.

- **Diagnosis:** reproduced locally by serving the built `dist` (`vite preview`) — same empty root, same error. An
  unminified + sourcemapped build named it: `TypeError: createSelector is not a function` in `vendor-react`. The
  `manualChunks` split had made `vendor-react` (recharts) and `vendor-other` (lodash/reselect) **import each other**,
  so recharts' MODULE-LEVEL calls ran before their imports had initialised. Moving the recharts family into
  `vendor-react` surfaced the same class again (`ReferenceError: Cannot access 'gO' before initialization`): the cycle
  is inherent to splitting a cyclic graph.
- **Fix (`vite.config.ts`, post-mortem inline):** **one `vendor` chunk for ALL of `node_modules`** — a single instance
  of React, scheduler and every helper, and a cycle cannot span one module. App code still splits normally.
- **New permanent gate:** `scripts/validate-production-boot.mjs` (`npm run validate:production-boot`) builds, serves
  `dist` from a built-in static server, loads it in Chromium and asserts the app **actually mounts** (`#root`
  non-empty, no page/console error, the Partner Login entry renders) — **exit 1** when it does not. Proven both ways:
  against the pre-fix bundle → `PRODUCTION_BOOT_VALIDATION_FAIL (3)`, exit 1; against the fixed bundle →
  `PRODUCTION_BOOT_VALIDATION_PASS`, exit 0.
- **Result:** rebuilt, redeployed, and **live-verified on `https://demo.mercenta.co.uk`** — the Super Admin demo login
  succeeds, the Control Centre renders **no second action list** and points at the single one, the Integrations &
  systems panel and the drill-down metrics are present, Work Management carries the founder console rows with their
  rank and their WHY (12 funding rows, each `RANK` + `WHY | score N`) and the drawer renders the full WHY breakdown —
  **13/13 checks PASS, zero page errors**.



---

## 8. P4 — WHAT WAS BUILT, VERIFIED AND HOW (so P5+ does not have to re-derive it)

### The direction that was corrected

Before P4 the DIRECTION was wrong in three places: the acknowledgement created a shipment **draft** whose audit reason
read *"Brand must add carton details"* and which hardcoded `carrier: 'dhl'` / `destination: 'Mercenta UK Hub'`; the
brand chose its own carrier and filed the ASN (`Create Shipment` → `File ASN`); and the routing step was a brand-side
control (`RoutingRequestForm`, which set local component state and wrote **nothing** to the domain — a placeholder).
Under the proxy model a brand never communicates with the channel — its decision is an **instruction to Mercenta**.

### What was built

- **`src/lib/commerce/channelInstructions.ts` (NEW) — the instruction store.** `ChannelInstruction` records the brand's
  decision **verbatim**, with deterministic, idempotent ids (`instr-ack-<poId>` / `instr-pack-<poId>`), simulation
  provenance, and states `pending_mercenta_action → actioned | refused`. Every state change writes a canonical audit
  entry and fires the canonical change signal (in ONE place, so `validate-canonical-propagation` S2 holds). A refused
  instruction is never silently retried: `requeueChannelInstruction` is an attributed, audited admin action.
  It also owns **`instructionLineFor(po, line)`** — the ONE derivation of an instruction line from a PO. An absent
  per-line `ackStatus` (seeded/legacy acceptances) derives **accepted**, never rejected; only a PO whose status is
  `rejected` derives rejected lines. (A real defect found by the browser run — registry row
  `discovered-absent-ackstatus-treated-as-rejection`.)
- **`src/lib/commerce/proxyProcessor.ts` (NEW) — MERCENTA'S channel action.** Processing an instruction performs, in
  order: (1) `submitAcknowledgement` through the SP-API seam, Mercenta-side, recording the seam's honest mode;
  (2) the routing / shipment request (channel-arranged carrier on a Freight Collect PO, Mercenta's own account on
  prepaid, resolved by the canonical routing rule — never chosen by a component); (3) the ASN filing, **automatic on
  acceptance** (decision 9), with clearly-simulated lot/expiry where the category requires them. A **channel refusal
  stops the chain** — nothing is filed, the reason is recorded, and the retry is deliberate. An **all-rejected**
  decision is `actioned` with the routing/ASN recorded as **NOT APPLICABLE**, never falsely reported as filed. The
  ASN actor is `mercenta-proxy-automation`, so the audit shows WHO acted.
- **The SP-API seam: `submitAcknowledgement`** added to `src/lib/spapi/client.ts` (real, `POST /acknowledgements`) and
  `src/lib/spapi/mockClient.ts` (deterministic `MOCK-ACK-00001`-style references, exercising success **and** its own
  refusal paths: over-ordered quantity, backorder without a date). *AV-040 is partially closed — the other seven
  documented operations are P12.*
- **`src/data/api.ts → acknowledgePurchaseOrder`** now writes the instruction instead of the brand-side draft, and its
  audit wording states the corrected direction. `commerceLifecycle.acknowledgeCommercePurchaseOrder` stays synchronous
  (the browser specs and the lifecycle call it synchronously) and then begins Mercenta's processing;
  `fulfilCommercePurchaseOrder` is documented as **Mercenta's** channel action and records its result on the instruction.
- **Surfaces.** `BrandPurchaseOrders.tsx`: no filing control of any kind (`Create Shipment` / `File ASN` / the routing
  filing form are gone), the brand sees Mercenta's channel status (`po-mercenta-status-*`, acknowledgement reference,
  routing reference, ASN + consignment), its only packing action is the **packing correction** instruction, and its
  three jobs are stated. `RoutingRequest.tsx`: `RoutingRequestForm` → **`RoutingRequestStatus`** (read-only, canonical
  outcome). `AdminPurchaseOrderDetail.tsx`: the instruction + Mercenta's outcome are shown with an attributed retry.
- **Copy repointed:** tours (`orientation-logistics`, `po-asn-accuracy`, `shipping-create-shipment`,
  `shipping-ship-window-vs-delivery`), `knowledgeBase.ts`, the `first_shipment` checklist hint, and the carrier-routing
  refusal message.

### Gates — repointed, never weakened (old contract recorded inline in every case)

| Gate | Result |
|---|---|
| `scripts/validate-proxy-model.mjs` (**NEW**) | **PASS (38 checks)** — the seam (both clients + refusal paths), the instruction (verbatim + idempotent), Mercenta's action, the all-rejected case, the refusal + retry, the audit attribution, and the direction asserted in SOURCE |
| `e2e/proxy-model.spec.ts` (**NEW**) | **4 pass** — browser proof of the corrected direction (including "no filing control exists") |
| `e2e/shipment-asn.spec.ts` | repointed: the packing correction reaches Mercenta and Mercenta files the ASN; the shortfall rule still raises a deduction; the routing copy is Mercenta's; the admin on-behalf path unchanged — **7 pass** |
| `e2e/notifications.spec.ts` | repointed: the acceptance produces Mercenta's channel acknowledgement + the real consignment — **4 pass** |
| `e2e/po-lifecycle.spec.ts` / `e2e/logistics-wave3.spec.ts` | success notice repointed `Acknowledgment submitted.` → `Decision issued to Mercenta.` (behaviour unchanged) |
| `scripts/validate-e6-brand-surfaces.mjs` · `scripts/validate-e7-embedded-social.mjs` | the P4 declared scope added; both guards' contracts UNCHANGED (an unexplained/protected change still fails) |
| `validate-canonical-propagation` · `validate-command-centre` · `validate-workspace-shell` · `validate-uiux-redesign` · `validate-e4-commerce` · `validate-e5-admin-surfaces` · `validate-stage15/16/19/26` · `validate:wording` | all **PASS** (see `PROJECT_STATUS.md` heading 8) |

### Verification performed for P4 (this session)

- `npx tsc --noEmit` (app + node projects) → **0 errors** · `npx eslint .` → **0 problems** · `npm run build` → **✓ built**.
- **Honest note:** the first implementation mapped an absent `ackStatus` to `rejected`. Every domain-level gate passed;
  only the BROWSER run against seeded data showed the consequence (Mercenta filed nothing for a genuinely accepted PO).
  Fixed at the cause with `instructionLineFor`, asserted at both levels, recorded in the registry.
- Every affected validator listed above was executed this session with its PASS/FAIL output shown.
- **FULL Playwright suite** and the **demo deployment + live verification**: see `PROJECT_STATUS.md` heading 8 and the
  `CURRENT RESUME STATE` block.

---

## 9. P5 — WHAT WAS BUILT, VERIFIED AND HOW (so P6+ does not have to re-derive it)

### What was wrong

Three things asserted a **Mercenta-owned destination** that no channel source requires and the repository's own truth
register contradicts:

1. **The domain hardcoded it.** `src/data/api.ts → createShipmentForPO` and `src/data/demoData.ts` wrote the literal
   `destination: 'Mercenta UK Hub'`, so every consignment Mercenta created arrived at Northampton — a Mercenta site.
2. **The stage enum made it mandatory.** `ShipmentStage`/`ShipmentStatus`/`STAGE_ORDER` carried `mercenta_hub`
   ('Mercenta UK Hub') as the step before "live on channel", and the carrier transforms advanced a `delivered`
   milestone into it. Matrix `D09-13`, register `AV-027` (CONTRADICTED, HIGH/HIGH).
3. **The geography declared it.** `MERCENTA_UK_HUB` (a coordinate), the `mercenta_hub` node kind, the Hero's hub
   marker and the hub's UK-tile handling all plotted a Mercenta site as the arrival node.

Meanwhile the same repository declares the direct route (brand facility → the channel's destination) the default, and
the register records the authoritative destination as **the PO's `shipToParty`** (`shipToPartyId` = the FC code,
`S5`; `AV-026`; `AV-017`) — Founder decision **`T-4`**: the Mercenta Hub is never a mandatory route.

### What was built

- **`src/config/destinationFc.ts` (NEW) — the ONE owner of "what is this PO's destination".**
  `resolveDestinationFc(shipToParty)` resolves the channel's declared party (the PO's own declaration WINS over the
  directory, because the channel is authoritative), `fcByCode()` looks a code up in the canonical
  `DEFAULT_UK_FC_LIST`, `destinationLabelForPo(po)` is the ONE string the domain records, and
  `declaredShipToParty(index)` / `declaredDestinationLabel(index)` let seeds and simulations declare a destination
  deterministically without a second dataset.
- **The PO carries its destination.** `src/types.ts` gains `ShipToParty` and `PurchaseOrder.shipToParty` — the
  channel's ship-to party, optional on purpose so an undeclared PO fails closed rather than defaulting.
- **Every PO creator declares one**: both seeded sets (`demoData.ts` workflow + lifecycle, deterministic indices, so
  the demo genuinely spans several FCs), `createPurchaseOrder`, `createSimulatedPurchaseOrder` and the scenario
  engine's `buildScenarioPo`.

### The hub is deleted, not hidden

- `src/types.ts`: `mercenta_hub` removed from `ShipmentStage`, `ShipmentStatus`, `STAGE_LABELS`, `STATUS_LABELS` and
  `STAGE_ORDER`; `destination_fc` added (`STAGE_LABELS` = 'Destination Fulfilment Centre', `STATUS_LABELS` =
  'Delivered to Destination FC').
- `src/config/logisticsGeo.ts`: `MERCENTA_UK_HUB` and the `'northampton, uk'` city point deleted, `mercenta_hub`
  removed from `GeoNodeKind`, the hub branch removed from `resolveGeoPlace` (a record still naming a hub now returns
  `null` → a schematic leg), and `DESTINATION_NOT_DECLARED` added to the unlocatable place strings.
- `src/config/logisticsHero.ts` / `LogisticsHeroScene.tsx`: `MERCENTA_HUB_PLACE` deleted together with the hub marker
  and its colour prop — **the Hero's UK arrival nodes ARE the destination FCs**.
- `src/lib/logistics/heroNetwork.ts`: `UK_KINDS` no longer contains `mercenta_hub`, so a place of that kind can no
  longer be drawn on the UK tile.
- `LogisticsMapCanvas.tsx`: the hub node branch removed. `LogisticsHub.tsx`: the retired hub status milestone and the
  "Hub: Mercenta UK Distribution Hub (Northampton, UK)" header entity removed.
- **Every status/stage map re-pointed**: `GlobalStateContext.statusToStage`, `brandDossiers.STAGE_BY_STATUS`,
  `commerceLifecycle.FREIGHT_TRACK`, `operationsMap.STAGE_PROGRESS`, `statusPresentation.SHIPMENT_TONES`,
  `dhl/transform.ts` + `palletline/transform.ts` (`delivered` → `destination_fc`), `bootstrap.ts`'s legacy row,
  `investorDemo.ts`, `BakLogistics.tsx`, `CarrierDashboard.tsx`.
- **Copy**: the public shipment lifecycle (FAQ + How It Works) now ends at the **Destination Fulfilment Centre**; the
  grants data source says "Northampton premises" (the registered address in `src/config/customs.ts` is untouched — it
  is the company's address on customs documents, not a shipment route); and the **admin Overview header** (carried
  over from P4 as P5's copy pass) now reads **"Overview"** instead of the stale "Operations Overview", which had been
  ambiguous since Operations became a separate destination.

### Gates — repointed, never weakened (old contract recorded inline in every case)

| Gate | Result |
|---|---|
| `scripts/validate-logistics-map.mjs` | **PASS — 60 → 74 assertions**: the retired hub destination and the hub's own city must now FAIL CLOSED, no `mercenta_hub` node kind can be produced, and the new §P5 checks execute the REAL resolver (the PO's declaration wins; an unknown code is named but never plotted; an undeclared PO yields the explicit not-declared string; every seeded PO resolves to a real FC city; every seeded consignment carries its PO's destination; **no seeded consignment is destined for a Mercenta site**). |
| `scripts/validate-logistics-hero.mjs` | **PASS (54 assertions)** — the hub check became: every Hero UK destination is an FC node, and a place of the RETIRED hub kind is no longer drawn on the UK tile (the same coordinate resolves differently under the FC kind). |
| `scripts/validate-mock-providers.mjs` | palletline `delivered` → `destination_fc` (was `mercenta_hub`). **PASS** |
| `scripts/validate-investor-demo.mjs` | the delay-drill recovery status → `destination_fc`. **PASS** |
| `e2e/logistics-hub-map.spec.ts` | **NEW test 17 — browser proof**: no `[data-kind="mercenta_hub"]` node exists, destination-FC nodes do, no surface text claims a Mercenta hub, and every consignment's destination equals its own PO's declared destination (read from the canonical store via `destinationFc`). |
| `e2e/status-semantics.spec.ts` · `e2e/table-migrations.spec.ts` | the canonical label map and the carrier milestone target re-pointed to `destination_fc`. |
| `scripts/validate-e6-brand-surfaces.mjs` · `scripts/validate-e7-embedded-social.mjs` | the P5 declared scope added (`P5_DESTINATION_FC_SCOPE` / `P5_DESTINATION_FC_DECLARED`); **both guards' contracts UNCHANGED — an unexplained or protected change still fails.** |
| `validate-canonical-propagation` · `validate-command-centre` · `validate-workspace-shell` · `validate-uiux-redesign` · `validate-e4`/`e5` · `validate-stage15/16/19/26` · `validate-wave3-logistics` · `validate-proxy-model` · `validate:routing` · `validate:product-routes` · `validate:wording` · `validate:production-boot` | all **PASS** (see `PROJECT_STATUS.md` heading 8). |

### Verification performed for P5 (this session)

- `npx tsc --noEmit -p tsconfig.app.json` → **0 errors** · `tsconfig.node.json` → **0 errors** · `npx eslint .` →
  **0 problems** · `npm run build` → **✓ built**.
- **Focused browser run** (`logistics-hub-map` + `status-semantics` + `table-migrations` + `logistics-hero` +
  `logistics-wave3`, `--workers=3`) → **41 passed / 0 failed**.
- Every validator in the table above was executed this session with its PASS output shown.
- **FULL Playwright suite** + the **demo deployment and live verification**: see `PROJECT_STATUS.md` heading 8 and the
  `CURRENT RESUME STATE` block.
- **Honest note:** the source-consistency grep is part of the evidence — every remaining `mercenta_hub` /
  "Mercenta Hub" hit in `src/` is an explicitly historical "was X" comment, or a fixture that is deliberately NOT a
  destination (the demo returns address in `demoStore.ts` and `src/config/customs.ts`'s registered address, both left
  untouched as demo/legal data).

---

## 10. P6 — WHAT WAS BUILT, VERIFIED AND HOW (so P7+ does not have to re-derive it)

### What was missing

Three things were asserted about the brand's own job — "**download & print its shipping documents**" — without the
platform being able to produce a single one of them:

1. **The pack did not exist.** `src/lib/customsDocs.ts` generated three customs documents for every accepted PO
   (regardless of lane), and the Hub offered a waybill and a carrier label as two loose buttons. There was no notion
   of "the documents for this PO", no readiness, and no lane scoping.
2. **SSCC was a bullet in guidance copy.** The ASN the channel receives carries a container identifier per carton
   (`cartons[].cartonIdentifiers[{ containerIdentificationType: "SSCC" }]` — programme §3; truth-validation §5.7),
   and Mercenta is the vendor that must generate them. `SSCC` appeared exactly once in `src/` — in a help list — and
   no identifier was ever produced.
3. **The collect lane had no chain.** The documented sequence (shipment request → carrier assignment → routing
   instructions/ARN → pickup) existed only as prose in the research table; the platform showed a single
   "routing request raised" line and nothing about what the channel does next.

### What was built

- **`src/lib/documents/sscc.ts` (NEW) — the ONE owner of the carton identifier.** The published GS1 mod-10 check
  digit, a deterministic 9-digit serial derived from `PO number + carton index` (no clock, no randomness — a reprint
  is byte-identical), and an explicitly **UNASSIGNED placeholder GS1 prefix** (`0000000`, status
  `placeholder_unassigned`, the words `XX-PENDING-GS1-LICENCE` on every label). Activating Mercenta's real GS1 prefix
  is a CREDENTIAL step: replace one value, nothing else changes (`PRODUCTION_READINESS.md` records it).
- **`src/lib/documents/poDocumentPack.ts` (NEW) — the ONE owner of "what documents a PO has".** It assembles eight
  documents (SSCC labels · carrier label · freight waybill · packing list/delivery note · ASN sheet · the three
  customs documents), each with `applicable` + a stated reason when it is not, `ready` + a stated reason when its
  source is not on the record yet, the renderer that presents it, and its fields. It **delegates** customs documents
  to the existing owner and **never re-derives the destination** (`src/config/destinationFc.ts`, P5). It also owns
  the single rule `documentsAwaitingDownload` — the accepted→pre-ship window — so the nav badge and the notification
  centre cannot disagree with the pack.
- **`src/lib/shipping/collectChain.ts` (NEW) — the documented collect chain.** `PICKUP_LEAD_TIME` (the channel's
  **two BUSINESS days**, register `AV-014`), `earliestRequestedPickUp` (weekend-skipping), and `buildCollectChain`
  over the four documented steps, each carrying its own basis. **Steps 2–4 are read from the channel record**
  (`ChannelInstructionOutcome.routingInstructions`) and report `awaiting_channel` until it genuinely carries them:
  **an ARN that is not on the record cannot be produced by the module.**
- **The acceptance path generates the pack** (`src/lib/commerce/proxyProcessor.ts`): in the same action that files
  the ASN, it records `documentsGeneratedAt` / `documentCount` / `documentsReady` on the outcome (evidence only — the
  pack is DERIVED on read, so there is no second copy to drift), computes and records the collect
  `requestedPickUp`, and emits the canonical **`po_documents_ready`** event (added to the existing event union).
- **The Logistics Hub surface** (`src/components/shared/logistics/PoDocumentPackPanel.tsx`, mounted in the
  consignment inspector as **"Documents for this PO"**): every document with its readiness and reason, a printable
  preview (the established `iframe srcDoc` pattern), the SSCC placeholder notice, the destination/lane notices, and
  the collect chain on a Freight Collect lane. The two artefacts that already had renderers — the carrier label and
  the waybill — are opened through the **EXISTING dialogues** (one renderer per artefact).
- **Notification + nav badge**: the brand and admin Logistics Hub badges are the document-download queue, and the
  notification centre carries a `documents` item — both from the same ONE rule.



### Gates — added and repointed, never weakened

| Gate | Result |
|---|---|
| `scripts/validate-po-documents.mjs` (**NEW**, `npm run validate:po-documents`) | **PASS — 50 assertions, 0 network calls.** It EXECUTES the real modules: the check digit is proved against the known EAN-13 anchor (`400638133393 → 1`) AND against an independent weighted-sum recomputation; determinism; collision-freedom; the placeholder prefix; all eight documents; the lane rule with its stated reason; destination = the PO's declared FC (and an undeclared PO failing closed); honest readiness (no ASN → no SSCC labels; no filed ASN → no ASN sheet; no waybill → no waybill); byte-identical determinism; the shared download rule; the documented chain order; the weekend-skipping lead time; and **no fabricated ARN**. |
| `scripts/validate-e6-brand-surfaces.mjs` · `scripts/validate-e7-embedded-social.mjs` | the P6 declared scope added (`P6_PO_DOCUMENT_PACK_SCOPE` / `P6_PO_DOCUMENT_PACK_DECLARED`); **both guards' contracts UNCHANGED — an unexplained or protected change still fails.** |
| `e2e/po-documents.spec.ts` (**NEW**, 6 tests) | **6 passed** — the pack on the Hub after acceptance (all eight rows, the PO's FC named, no Mercenta site); honest readiness (SSCC ready / waybill NOT ready with its reason and a disabled control); the SSCC labels opening with complete 18-digit identifiers under the placeholder prefix; the badge + notification queue; the collect chain in documented order with `awaiting_channel` on the channel steps and no ARN pattern anywhere; and the pack opening the EXISTING label dialogue. |
| every other validator in `scripts/validate-*.mjs` | all **exit 0** (the whole set was executed this session). |
| `validate-stage14` · `validate-review-s3` | still pass: P6 widened `DocContext.products` from the demo-only `DemoProduct` to the base `Product` (no behaviour change), so no customs output moved. |
| `validate:wording` | **PASS — 303 src files, 0 outward-facing violations.** |

### Verification performed for P6 (this session)

- `npx tsc --noEmit -p tsconfig.app.json` → **0 errors** · `tsconfig.node.json` → **0 errors** · `npx eslint .` →
  **0 problems** · `npm run build` → **✓ built**.
- The new gate was **proved able to fail**: a deliberate break of the check-digit arithmetic (mod 10 → mod 9) made it
  report **FAIL (2 of 50)**; restored byte-identical → **PASS (50)**.
- **Focused browser run** (`po-documents` + `logistics-hub-map` + `notifications` + `shipment-asn` + `proxy-model` +
  `compliance-gate`, `--workers=3`) → **42 passed / 0 failed**.
- **FULL Playwright suite** + the demo deployment and live verification: see `PROJECT_STATUS.md` heading 8 and the
  `CURRENT RESUME STATE` block.

### Honest limits recorded (not hidden)

- **The channel steps of the collect chain cannot advance in this environment**: no live Amazon connection exists, so
  no carrier is assigned and no ARN is returned. The chain says exactly that (`awaiting_channel`) and the platform
  refuses to invent one. Wiring `getShipmentDetails` to populate `outcome.routingInstructions` is **P12's** declared
  scope (`SP-API seam extension (mock-first)`) — the contract, the derivation and the surface are in place now.
- **The SSCC identifiers are placeholders** by definition (no GS1 licence): all-zero prefix, stated on every label and
  in `PRODUCTION_READINESS.md`.
- **The carrier label and waybill stay the existing printable templates** until a carrier account is live; the pack
  reports them as not ready until the carrier booking exists rather than printing a fake.

---

## 11. P7 — WHAT WAS BUILT, VERIFIED AND HOW (so P8+ does not have to re-derive it)

### What was missing

The platform could issue a "simulated invoice" — one row, keyed by the PO, with a number literally built as
`SIM-INV-<poNumber>` — and four separate screens each re-derived a due date as `invoice date + INVOICE_TERM_DAYS`, a
single global constant. The channel's documented invoicing rules were therefore **not modelled at all**:

1. **Numbers were not unique-by-rule and could be reused.** There was no registry, so `AV-022`'s first rule
   (*invoice numbers unique and never reused*) had no representation. The reason the rule exists — *a wrong invoice is
   cancelled and re-sent under a NEW Invoice ID* — also had no path: an issued invoice could not be cancelled, and
   re-issuing returned the same row.
2. **A zero-value invoice was issued silently.** `AV-022` says it fails.
3. **Terms were global, not per invoice.** Programme decision 2 fixes **14 / 30 / 60 chosen per invoice**; the code had
   one `INVOICE_TERM_DAYS = 30` in the work layer, imported by the admin Overview, the founder console, the automation
   registry and the founder AI context — four independent copies of the same arithmetic (a §03 violation).
4. **The receiving status was not a modelled concept.** `AV-018` / `S5` document the channel's `receivingStatus` (the
   FC's received status **and** received quantity); the platform had per-line `receivedQty` and a PO status, but no
   single owner and no gate tying "invoice" to "received".

### What was built

- **`src/lib/commerce/invoiceTerms.ts` (NEW) — the ONE owner of the terms and of every figure derived from them.**
  `INVOICE_TERM_CHOICES = [14, 30, 60]` (declared once in `src/types.ts`, like `PO_REJECTION_CODES`),
  `INVOICE_TERM_DAYS = 30` (the declared default), `isInvoiceTermDays` (fail closed), `invoiceTermDays(invoice)` (the
  invoice's OWN terms, falling back to the declared default for a legacy row), `invoiceDueDate`,
  `invoiceIsOutstanding` (**receivables = issued-and-unpaid**), `invoiceIsOverdue`, `invoiceIsUpcoming` and
  `summariseInvoiceLedger` (receivables / overdue / upcoming in ONE implementation). `PAYMENT_DERIVATION_BASIS` states
  the honest basis (register **S14**: no Vendor Payments API exists, so a payment date is *derived* and labelled).
- **`src/lib/commerce/invoiceRegistry.ts` (NEW) — the ONE owner of invoice numbers (`AV-022`).** A number is derived
  from the PO number plus the allocation ordinal recorded in the canonical ledger — the first is `SIM-INV-<poNumber>`
  (the established shape, so nothing downstream changed), a re-issue after a cancellation is `SIM-INV-<poNumber>-R2`.
  `nextInvoiceNumber` never returns a consumed number; `invoiceNumberIsConsumed` reports a **voided** number as still
  consumed; `invoiceAmountIsValid` implements the zero-value refusal; `INVOICE_NUMBER_RULES` states the four documented
  rules where the numbers are handled.
- **`src/lib/commerce/receivingStatus.ts` (NEW) — the ONE owner of the receiving status and the receipt gate
  (`AV-018`).** The status is **DERIVED** from the per-line quantities the receiving step logs (never stored — a stored
  copy could drift from the quantities it describes, the §P6 rule), with `summariseReceiving` giving
  ordered/confirmed/received/shortfall units. `invoiceReceiptGate` is the single "invoice only AFTER receipt" rule and
  it **fails closed**, naming the register it rests on. A partial receipt may be invoiced (the invoice bills the
  quantity that arrived); an unreceived PO may not.
- **`src/data/demoStore.ts`** — `demoInvoiceNumberRegistry`, the **append-only** ledger
  (`recordInvoiceNumberAllocation` is idempotent on the number; `voidInvoiceNumberAllocation` writes void evidence and
  never frees the number), `setPurchaseOrderReceivedAt`, `getAllCommerceInvoices` / `getAllCommercePayments`, and
  `getCommerceInvoiceForPo` **repointed** to return the invoice still IN FORCE (a cancelled row no longer blocks a
  correction).
- **`src/lib/commerce/commerceLifecycle.ts`** — `issueCommerceInvoice(poId, actor, { termDays })` now enforces, in
  order: the delivered-PO check (unchanged), the **receipt gate**, the **term declaration**, and the **zero-value
  refusal**; it takes its number from the registry, records the allocation in the SAME step, carries `termDays`, and
  links the `AV-022` re-issue chain both ways (`replacesInvoiceId` / `replacedByInvoiceId`). NEW
  **`cancelCommerceInvoice(invoiceId, actor, reason)`**: the reason is REQUIRED, the action is attributed and audited,
  the number is voided for ever, and a **settled** invoice is refused (money has moved — the ledger corrects it).
  `receiveCommercePurchaseOrder` now records the receipt timestamp and reports the derived receiving status.
- **`src/lib/dates.ts` (NEW)** — `addDays` / `daysBetween` moved out of `workStore` (the invoice-terms owner needs them
  and importing the work layer back would be a cycle). The work layer **re-exports the same names**, so every consumer
  is unchanged and there is still exactly ONE implementation.
- **Five readers repointed** to the ONE owner, each with the old contract recorded in an inline `§P7 — REPOINTED`
  comment: `workStore` (the `invoice_due` deadline is now the invoice's own derived due date, and a cancelled invoice
  is never receivable), `AdminDashboard` (receivables + upcoming payments from `summariseInvoiceLedger`),
  `controlCentre`, `founderOpsAi` and `automation/registry` (`invoiceIsOverdue`).
- **The admin surfaces.** `CommerceOperationsPanel` gains a **per-PO 14/30/60 selector** (disabled once a number is
  allocated), the **receiving status** badge, the invoice's **own terms + derived due date**, the `AV-022` rule list,
  and the **cancel + reason** path; `AccountingPanel` gains the **invoice-number registry ledger** (allocated / void /
  receivables / upcoming) with the derivation basis stated.


### What is verified (session 20)

- **`scripts/validate-p7-invoicing.mjs` (NEW)** → **PASS (115 assertions, 0 network calls)**, executing the REAL modules
  through the project's own module graph. It proves the terms and their refusal, the per-invoice due date, the
  receivable predicate, the registry's uniqueness / never-reuse / append-only / idempotence, the zero-value refusal, the
  derived receiving status and the fail-closed gate, and then drives the real DOMAIN: an unreceived PO refused with
  `RECEIPT_REQUIRED` (recording nothing, consuming no number), a 60-day invoice issued and idempotent, an undeclared
  term refused, a zero-value invoice refused, cancel-without-reason refused, cancellation voiding the number, the
  correction issued as `…-R2` with the chain linked both ways, a settled invoice refused cancellation, RBAC and tenant
  isolation refused, and the receiving path driving a full and a partial receipt. It also asserts ONE owner per value
  across 14 source files and that **no consumer re-derives a due date from the global constant**.
- **Proved able to fail:** mutating the registry's ordinal arithmetic to a constant → **FAIL (5 failures)**; restored →
  PASS.
- **`e2e/invoicing.spec.ts` (NEW)** → **3 passed** in real Chromium (terms chosen per invoice + derived due date +
  receiving status; cancel-with-reason then re-issue as `…-R2`; the receipt gate and the registry ledger in the live
  build on the Accounting surface). **This spec found and fixed a real defect in the new code:** `Badge` does not
  forward `data-*` props, so the test hook had to sit on a native element — the validator now guards that class.
- **`scripts/validate-work-layer.mjs`** → **PASS**, with its due-date assertion **repointed** to the canonical owner
  (plus a new assertion that a 14-day invoice is due earlier than a 30-day one) — the old guarantee is kept, not
  weakened.
- The **E6/E7 change-scope guards** gained the declared P7 scope with their contracts unchanged.

### Honest limits

- **The receiving status is established by Mercenta's OWN receiving step** in this environment (the channel's receiving
  system is simulated). Reading the channel's `receivingStatus` directly — `getPurchaseOrdersStatus` — is **P12's**
  declared scope; the platform never claims a live channel reading.
- **No part of this is a live submission.** Issuing or cancelling an invoice contacts no accounting provider; the
  invoice-number rules are modelled and enforced, and `INVOICE_NUMBER_RULES` states the documented activation
  precondition that **API invoicing requires parallel testing with the channel's accounts-payable team** before
  payments process (register **S11**) — a business/activation step, not a code change, recorded in
  `PRODUCTION_READINESS.md`.
- **The invoice ledger is in-memory in this environment** (the D4 persistence port is honest about it: memory by
  default, Supabase when credentials exist). Nothing is claimed as durable here.

---

## 12. P8 — WHAT WAS BUILT, VERIFIED AND HOW (so P9+ does not have to re-derive it)

### What was missing

1. **There was no inventory model at all.** Decision 5 asks for a per-catalogue-product record — image · SKU ·
   ASIN · available · UoM (Eaches/Cases) · on-hand · committed · inbound · safety stock. Nothing held any of it,
   and nothing linked a stock position to the catalogue product it describes.
2. **The ASIN was FABRICATED.** The seed built one as `` `B0${sku}` `` — a plausible-looking identifier the
   platform had no basis for. Decision 10 forbids exactly that ("the code never invents a real-looking ASIN").
3. **Reported inventory was INVENTED.** The brand Reports surface showed an "On-Hand Inventory (est.)" computed as
   `unitsPerCase × 10` per SKU — a fabricated number presented as an estimate, with no ledger behind it.
4. **A brand's identifier had no model, source or authority.** `ProductSubmission.asin` existed but there was no
   per-PRODUCT identity, no way for a brand to supply one, and no channel path to populate it on acceptance.

### What was built

- **`src/lib/catalog/asin.ts` (NEW) — the ONE owner of the channel identifier (decision 10).** The identifier is
  10 alphanumeric characters (`ASIN_LENGTH`, `ASIN_PATTERN`); the GENERATED placeholder is the deliberately
  unmistakable `SIM-ASIN-…` (`simulatedAsinFor`, deterministic from the SKU, and **never a valid shape**, so it can
  never be misread as real). `validateBrandAsin` **fails closed** without the brand's existing-listing
  confirmation (`ASIN_REQUIRES_EXISTING_LISTING`) and **refuses a placeholder** (`ASIN_PLACEHOLDER`);
  `validateChannelAsin` accepts only a real shape or the seam's own placeholder; `canReplaceIdentifier` implements
  the authority order (**a channel-assigned identifier is never downgraded by a brand declaration**);
  `deriveAsinState` gives none / pending the channel / assigned; `ASIN_RULES` states the rule and
  `ASIN_RULE_SOURCE` records where it comes from (decision 10 · **`AV-035`**, the register's finding that **no
  public Vendor catalogue/item API exists**, so there is no API an ASIN could be fetched from).
- **`src/lib/inventory/inventoryRecord.ts` (NEW) — the ONE owner of the stock figures (decision 5).** Every figure
  is **DERIVED from an append-only movement ledger**: `bucketTotals` sums on-hand / committed / inbound and
  `available = on-hand − committed` (it may be NEGATIVE — an oversold position is stated, never clamped);
  `inventoryStatusOf` gives out of stock / below safety stock / in stock; `summariseInventory` is the ONE roll-up.
  The unit vocabulary is the channel's own (`Eaches`/`Cases`, register **`AV-029` CONFIRMED**) and a CASE entry
  converts through the product's OWN case pack — **refused when no case pack is declared**
  (`INVENTORY_CASE_PACK_UNKNOWN`), so a case is never silently read as one each. `validateMovement` is the single
  acceptance point: an undeclared unit, a zero/NaN quantity, an undeclared movement type, a counted correction
  with no reason, and any movement that would take a bucket negative are all refused. `INVENTORY_DERIVATION_BASIS`
  states the honest basis: **Mercenta's own model — no Vendor inventory-availability API exists** (truth validation
  §769, "REQUIRES BUSINESS DECISION"), these figures are entered inside Mercenta and are **never a channel
  reading**; pushing stock to the channel is `submitInventoryUpdate` (**P12**).

- **`src/lib/inventory/inventoryLifecycle.ts` (NEW) — the domain write path.** RBAC (`canMutate`) and TENANT
  ISOLATION are enforced in the DOMAIN, every write is attributed and audited, and the write paths are
  `recordStockMovement`, `setInventorySettings`, `declareBrandAsin` (the brand half of decision 10) and
  `populateAsinFromChannel` (the channel half). A separate, attributed `adminOverrideAsin` requires a **stated
  reason** and is **refused for a brand-pinned actor** — a brand may never rewrite the channel's identity.
- **`src/data/demoStore.ts`** gains the three canonical collections (`demoInventoryMovements` — the append-only
  ledger, `demoInventorySettings`, `demoProductIdentifiers`) plus the accessors, and the **invented ASIN is
  removed from the seed**: every identifier the fixture creates is the unmistakable `SIM-ASIN-…` placeholder
  (recorded as an `§P8 — REPOINTED` comment). `recordCatalogAudit` gained an `entityType` parameter (defaulting to
  the original `catalog_submission`) so inventory + identifier writes are audited on the SAME canonical log.
- **The decision-10 channel path is real, through the existing mock-first seam.** `getSubmissionStatus` now returns
  the channel's `asin` (real client: straight from the channel's response; mock: the unmistakable
  `SIM-ASIN-…` placeholder), and `pollCatalogSubmission` **populates the canonical identifier when the channel
  ACCEPTS the product** — so the platform records the channel's own value rather than making one up. The
  submission's own `asin` and the canonical identifier both come from that ONE response, so they cannot drift.
- **`src/components/brand/BrandInventory.tsx` (NEW) — the brand surface**, a new **Inventory destination in the
  Catalogue section** (it describes the catalogue's products; it does not process a PO). It shows the decision-5
  set per product with the derived position, the status, the identifier + its SOURCE, a Manage panel (movement /
  safety stock + unit / the brand's ASIN declaration), the movement ledger as the provenance, and the rules +
  the honest basis stated on the surface.
- **`src/components/brand/ProductCatalog.tsx`** gains the per-catalogue-product **ASIN column** (value + source, or
  the derived state); **`CatalogManagerAdmin`** gains an **Inventory tab** with the derived position, the
  identifier and the attributed override; **`BrandReports.tsx`** has its fabricated on-hand estimate
  **repointed** to the canonical owner (and no longer says "estimated").
- **`src/lib/simulation/investorDemo.ts`** — the three new canonical stores participate in the deterministic reset
  (purge + restore), so `reset → run` stays byte-stable.

### What is verified (session 21)

- **`scripts/validate-p8-inventory.mjs` (NEW)** → **PASS (79 assertions, 0 network calls)**, executing the REAL
  modules through the project's own module graph. It covers the unit + conversion refusals (including the case
  pack), the ledger derivation (on-hand/committed/inbound = the ledger's sums, `available`, append-only,
  negative-bucket refusal, oversold allowed and stated), the derived status, every identifier rule (shape,
  placeholder, existing-listing confirmation, authority order), **that the platform never invents a real-looking
  identifier** (asserted on the fixture, on the generator and across `src/`), the FULL channel path (the seam
  returns the identifier on acceptance; driving the real lifecycle records it, marked simulated; re-polling does
  not re-audit), RBAC + tenant isolation + audit, ONE owner per value across `src/`, and zero network.
- **Proved able to fail:** replacing the case-pack conversion with `1` (a plausible defect — a case silently read
  as one each) → **FAIL (7 of 79)**; restored → **PASS**.
- **`e2e/inventory.spec.ts` (NEW)** → **4 passed** in real Chromium: the surface + the stated rule; a movement
  recorded through the UI moving the DERIVED on-hand by exactly what was recorded; decision 10 end-to-end
  (refused without the confirmation, refused as a placeholder, recorded when valid, and the authority order
  refusing a brand downgrade of a channel identifier); and the admin inventory tab + the attributed override
  (refused without a reason). **This spec found two real things:** the canonical `Checkbox` keeps its input
  `sr-only` behind its label (so the spec now exercises the user path), and a brand declaration against a product
  that ALREADY has a channel identifier is refused by the authority order — the spec now asserts that rule
  explicitly instead of assuming a free slot.

### Honest limits

- **The inventory model is MERCENTA'S OWN.** No Vendor inventory-availability API exists (truth validation §769 ·
  `AV-035`), so these figures are entered inside Mercenta by the brand and are **never a channel reading**. The
  push direction — `submitInventoryUpdate` — is **P12's** declared scope.
- **The identifier is validated by SHAPE only.** The platform cannot verify that an ASIN exists, so it records the
  SOURCE (`brand_declared` / `channel_assigned`) and whether the value is simulated — and never presents a brand
  declaration as channel-confirmed.
- **Nothing here contacts a channel.** The acceptance path runs through the existing mock-first SP-API seam; with
  no credentials the identifier is the simulated placeholder, labelled as such everywhere it appears.
- **The ledger is in-memory in this environment** (the D4 persistence port has no inventory table; the P7 invoice
  ledger reports the same limit). Nothing is claimed as durable.

---

## 13. P9 — WHAT WAS BUILT, VERIFIED AND HOW (so P10+ does not have to re-derive it)

**Increment identity:** P9 of this programme (application work), decisions **4** and **1**, matrix
`D01-07` / `D04-18` / `D10-13`. Branch `redesign/foundation`.

### What was removed (decision 4 — COMPLETE)

| Removed | Detail |
|---|---|
| The `carrier` **environment** | `src/types.ts → Environment` is exactly `'home' \| 'login' \| 'brand' \| 'admin'`; the `/carrier` prefix is gone from `productRoutes`, so `/carrier/…` is not a product address and fails closed (public site, `noindex`). |
| The `'3PL Carrier'` **role** + the `'3pl'` **tier** | `SessionRole` / `SessionTier` no longer carry them; `TIER_ENVIRONMENTS` and `VIEW_ALLOWLIST` lose their entries; a STALE persisted carrier session is refused on restore. |
| **`CarrierShell`** and its three views | `layout/CarrierShell.tsx`, `carrier/CarrierDashboard.tsx`, `carrier/BakLogistics.tsx` — **deleted**; `App.tsx` no longer imports or renders a carrier shell (its branches are exhaustive). |
| The admin **`Carrier Monitor`** | `admin/CarrierMonitor.tsx` — **deleted**, with its nav item, its `'carriers'` RBAC view, its department mapping, its breadcrumb and its render branch. It carried a hand-written per-carrier health feed (including FedEx/BAK, which are not Mercenta accounts); provider connection state is owned by the Integrations surface. |
| The **demo environment** entry + the **login card** | `EnvironmentRouter` offers brand + admin only; `Login.tsx` has no "3PL Carrier Terminal" card. |
| The **public FAQ claim** | FAQ no longer says "four roles … and 3PL Carriers": it states three roles and that carriers do not log in (Mercenta operates DHL/Palletline by API). `HowItWorks` and `UKMarketAccess` are repointed the same way. |
| The carrier **identity** (decision 1) | `CarrierId` is `'dhl' \| 'palletline'`; the labels and the lane-capability table no longer list `fedex`/`bak`; the seed's `fedex`/`bak` shipments, tracking numbers, markup rows, rate-card functions, `CarrierTokens.fedex/bak` and the `fedexConnected/bakConnected` flags are gone; the retired staff vocabularies are repointed. The REFUSAL is preserved by name (`RETIRED_CARRIER_IDS`), so a retired carrier is still refused *and the reason says why*. |

### What was REHOMED (the capability, not the portal)

The removed window carried two real things: the ability to request a consignment's next **carrier
milestone**, and the **request log** behind it. Deleting them would have removed working
functionality (and four specs). They now live where the business model says they belong — the
**Mercenta admin Logistics Hub**, the operator of those accounts:

- a new *Carrier API console* section on `src/components/admin/LogisticsControl.tsx`, with the SAME
  structural hooks the specs assert (`dataTable="carrier-manifest"`, caption "Carrier manifest", a
  per-row `Update milestone for <reference>` select, the `DHL status → next milestone (sim)` button
  and the mono result line) plus the request log;
- the advance is attributed to **`mercenta-admin-logistics`** (the old terminal attributed it to a
  fictional `carrier-terminal` and hardcoded `brand-astonish` for every row — both fixed);
- the retired `fedex`/`bak` carrier contexts are gone (decision 1).
### A REAL DEFECT THE REPOINT EXPOSED (and how it was fixed)

The removed terminal applied a milestone with a **context** setter (`updateShipmentStatus`) while
every query-backed surface reads the **canonical store** (`demoStore → demoShipments`). Moving the
console onto the admin page therefore produced a control whose own value and row badge never
changed — caught by `e2e/table-migrations.spec.ts` #2 and `e2e/shipment-asn.spec.ts` #5, not by
typecheck or build. Fix: **one canonical writer**, `setShipmentMilestone` in
`src/data/demoStore.ts` (writes the store; refuses an unknown consignment or an unrecognised status;
notifies the canonical signal); the context's setter delegates to it; and the status→stage mapping
moved to ONE owner (`src/types.ts → STATUS_TO_STAGE`). A second real defect was exposed by
`status-semantics`: the admin page also renders the operational MAP, whose markers carry
`data-status`, so the badge assertion is now scoped to the canonical badge (`role="status"`) —
precision, not a weakening.

### Verification (all evidence produced in the same session)

- `scripts/validate-product-routes.mjs` → **81 PASS / 0 FAIL**, including 14 §P9 removal assertions
  (`/carrier` and all three sub-addresses refused as product addresses; no carrier environment; no
  carrier default view; the RBAC maps asserted PROGRAMMATICALLY — the 3pl tier gone, the `'carriers'`
  view refused for admin staff, `tierForRole` mapping only the three real roles; and a STALE carrier
  persisted session refused through the real `isPersistedSession` gate);
- **every validator**: **99 of 99 exit 0** (two — `validate-e6-brand-surfaces`,
  `validate-e7-embedded-social` — required the same **declared-phase scope** repoint P4–P8 used, and
  now carry the §P9 lists);
- `scripts/integrity-audit.mjs` → **63 PASSED / 0 FAILED**; `scripts/validate-workspace-shell.mjs` →
  **92 / 0**; `scripts/validate-stage26.mjs` → **PASS** (render matrix without the removed view);
  `scripts/validate-review-s6.mjs` → **PASS**; `scripts/validate-stage16.mjs` →
  **STAGE16_E2E_PASS**, with a real removal assertion where a `test(…, true)` placeholder used to sit;
- `npm run typecheck` → **0 errors**; `npx tsc --noEmit` (root — covers `e2e/` and `scripts/`) → **0**;
  `npx eslint src scripts e2e` → **0**; `npm run build` → **✓**; `npm run validate:wording` →
  **PASS (310 src files, 0 violations** — one file fewer because `CarrierMonitor.tsx` is gone**)**;
- the **seven affected Playwright specs** re-run: **54 passed / 0 failed** (the first run found the
  two real defects above plus two of this phase's own new assertions being written against the wrong
  fail-closed outcome; all five were fixed and the spec set is green);
- then the **FULL Playwright suite** and the live demo leg (counts in the session report).

### Honest limits

- **`bak_depot` remains a STAGE id.** It is the canonical mid-transit stage ("In the carrier
  network"; Palletline maps its network states to it), not a carrier identity. Renaming the stage id
  is a status/stage-map migration across `types.ts`, `commerceLifecycle`, the DHL/Palletline
  transforms and the brand hub — **out of P9's scope**, recorded here rather than done silently.
- **The onboarding step `'carriers'` ("Carrier connections") remains** in the canonical onboarding
  order. Decision 4's list does not include it, and changing the step count has its own knock-on
  (validators + e2e + stored records); it is recorded as remaining decision-1/4 vocabulary, not
  dropped.
- **The milestone control is a simulation surface.** It drives the DHL mock adapter (zero live
  calls). The production direction — Mercenta polling the carrier by API — is **P12's** declared
  scope (`getShipmentDetails`).
- **`amendShipment` (a pre-existing store helper) still writes `status` without `stage`.** No P9
  surface calls it; the canonical writer introduced here is the one the console uses. Left as-is to
  keep this phase's change set honest and reviewable.

---

## 14. P10 — WHAT WAS BUILT, VERIFIED AND HOW (so P11+ does not have to re-derive it)

**Increment identity:** P10 of this programme (application work), matrix `D10-10`, programme decision 11.
Branch `redesign/foundation`.

### What was missing

Three things the matrix row (`D10-10`) and decision 11 named, and the repository confirmed:

1. **Provider configuration did not exist.** `src/config/shipping.ts` already declared the accounts, the lane
   rule, the labels, the declared capability and the commercial terms; the Integrations registry already owned
   each provider's mode; the Integrations Hub already owned the connection state and the credentials. **No
   surface projected those into the logistics workspace**, so a brand could not see which Mercenta account
   serves its lane or what state it is in, and an operator had no per-account configuration view at all.
2. **The document download queue had no destination.** P6 built the pack and its ONE rule
   (`documentsAwaitingDownload`), and the nav badge and the notification centre both counted it — but the pack
   was only reachable by selecting a *consignment* in the inspector. The count was therefore a dead end: the
   brand had to hunt for the PO's consignment to act on it.
3. **Consolidation was deferred in a document only.** Decision 11 says deferred **but not designed out**, and
   the model was not designed out either: the consignment record carries one PO (`poNumber`), and nothing
   declared the 1..n shape, the documented channel evidence or the invariants a future grouping must honour.

### What was built

- **`src/lib/shipping/providerConfiguration.ts` (NEW) — the ONE projection of the canonical owners.** It
  derives, per Mercenta account: the account label, the declared capability, the lanes, the lane(s) the routing
  rule selects, the service, the **authoritative** mode, whether it is OPERATIONAL, a truthful state label, the
  BASIS the mode came from (connection state, including a sandbox connection and a quoted error), the control
  plane that owns the credential, and the credentials-only activation statement. **Fail closed:** only
  `simulation` and `live` are operational; `available`, `configuring`, `disabled`, `degraded`, `error`,
  `unknown` and `not_registered` are not, and each is named. A **retired** carrier (decision 1) is refused **by
  name** and has no configuration. **No cost leak:** the module does not import `SHIPPING_COMMERCIAL_TERMS`, so
  a brand never sees Mercenta's negotiated discount, mark-up, fees or VAT.
- **`src/lib/shipping/consolidation.ts` (NEW) — decision 11 recorded in code.** The posture is
  `status: 'deferred'`, with the **documented channel evidence** (the shipment request's
  `"purchaseOrders": [ {…}, {…} ]`, the **per-carton** PO reference, and *"a limit of 100 shipment
  confirmations for every truckload shipment"*), the 1..n model statement, the declared activation (the channel
  shipment request = **P12**), and the invariants a future grouping must honour. The **1..n shape is
  FUNCTIONAL**: `consignmentPurchaseOrders` normalises and validates a declaration, refusing an empty one and a
  duplicate; `checkConsolidatable` refuses **cross-tenant** grouping, duplicates and anything above the
  channel's 100-confirmation truckload limit. Only the grouping INPUT is deferred.
- **`src/components/shared/logistics/PoDocumentQueuePanel.tsx` (NEW)** — the download queue, derived from the
  **SAME ONE rule** the badge and the notification use (so the count and the rows cannot disagree), rendering
  the **SAME** `PoDocumentPackPanel` and the **SAME** existing waybill/label dialogues. `scope="brand"` is fed
  the tenant-scoped PO list; `scope="admin"` is the cross-tenant operator view that names the brand.
- **`src/components/shared/logistics/CarrierProviderConfigurationPanel.tsx` (NEW)** — the ONE presentation of
  the provider record, used by both shells. The brand scope is read-only (no credential, no cost); the admin
  scope adds the control plane, the activation and a **REAL, RBAC-GATED** hand-off to the Integrations view.
- **`src/components/shared/logistics/ConsolidationPosturePanel.tsx` (NEW)** — renders the posture, the
  consignment's declared PO set (executed by the owner, not merely described) and the invariants.
- **The brand Logistics Hub** gains (a) a *Shipping documents* section — the queue, the destination the nav
  badge counts — and (b) two rail panels: *Carrier providers* (read-only provider configuration) and
  *Consolidation*.
- **The admin Logistics Hub** gains *Carrier provider configuration* and *PO documents awaiting the brand*
  (the same queue, cross-tenant, plus the posture) — so the operator reads the same derived records, hands off
  to the credential owner, and can see whose download is outstanding.

### A REAL DEFECT THIS PHASE'S OWN SPEC FOUND (and how it was fixed)

The first version of the credential hand-off was rendered for **every** admin session. Verified in a browser:
Integration Settings is restricted by the canonical RBAC (`src/lib/auth/rbac.ts → VIEW_ALLOWLIST`, plus the
shell's own render guard), so an **admin-staff** click landed on `AccessDenied` — a control that leads nowhere,
exactly the class of defect this programme keeps repairing. The hand-off is now **gated on the destination
being reachable** (`onOpenIntegrations` is passed only for a session that may open it) and the panel carries
`data-handoff="available" | "role_restricted"`. Spec test 4 proves the super-admin path reaches the canonical
Integrations surface; test **4b** proves the staff session sees the same record with **no** dead-end control.

### Gates — added and repointed, never weakened

| Gate | Result |
|---|---|
| `scripts/validate-logistics-providers.mjs` (**NEW**, `npm run validate:logistics-providers`) | **PASS — 96 assertions, 0 network calls.** It EXECUTES both owners: the projection (both accounts, their lanes, services, capability, routing lanes, owner, control plane, activation, no commercial key); every provider mode (operational only for simulation/live; never presented as simulation or live); the truthful BASIS (sandbox, verified, quoted error, operator-disabled, none); the retired-carrier refusals BY NAME; the consolidation posture and its evidence; the 1..n declaration (empty/duplicate refused); the pre-conditions (cross-tenant, duplicate, empty, 100-limit); the SURFACE WIRING (the queue uses the same ONE rule as the badge/notification, the brand queue is tenant-scoped, the admin hand-off is RBAC-gated, no panel re-derives a mode); and no-placeholder/no-network source checks. |
| `scripts/validate-po-documents.mjs` (the P6 gate) | **PASS — 53 assertions** (was 50): three §P10 assertions added, proving the queue still derives from the ONE rule, renders the SAME component, and that the brand Hub mounts it with tenant-scoped POs. |
| `scripts/validate-e6-brand-surfaces.mjs` · `scripts/validate-e7-embedded-social.mjs` | **PASS** with `P10_LOGISTICS_COMPLETION_SCOPE` / `P10_LOGISTICS_COMPLETION_DECLARED` added. **Both guards FIRST FAILED, naming the two new owners as offenders** — the change-scope mechanism working exactly as designed; the guards' contracts are UNCHANGED. |
| `e2e/logistics-providers.spec.ts` (**NEW**, 6 tests) + `e2e/po-documents.spec.ts` (+2 tests) | **14 passed / 0 failed.** |
| `scripts/verify-demo-live.mjs` | the **§P10 live checks** were added (brand + admin surfaces, the RBAC-gated hand-off, and the deployed-bundle content probe). |
| every other validator in `scripts/validate-*.mjs` | all **exit 0** (the whole set was executed this session). |

### Honest limits

- **The grouping INPUT stays deferred** (decision 11). The model, its validation and its invariants are real and
  executed; nothing writes more than one PO to a consignment until the channel's shipment request exists (P12's
  declared scope). The surfaces say exactly that.
- **The milestone/carrier console remains a simulation surface** (P9's limit, unchanged): it drives the mock
  adapter and makes zero live calls.
- **`bak_depot` remains a STAGE id** and the onboarding step `'carriers'` remains (P9's two vocabulary limits,
  unchanged — they are not in P10's scope).
- **The admin document queue is a follow-up view, not a document store.** Mercenta does not re-issue a brand's
  pack from the admin surface: the pack belongs to the brand's own Hub, and the operator view derives from the
  same rule. The brand's print dialogues live in the brand shell, so the admin queue's artefact callback
  performs no action, and the pack reports those artefacts not-ready until a booking exists.


---

## 15. P11 — WHAT WAS BUILT, VERIFIED AND HOW (so P12+ does not have to re-derive it)

**Increment identity:** P11 of this programme (application work), matrix `cleanup-p11-remove-create-po`, programme
decision 3. Branch `redesign/foundation`.

### What was wrong

Two things decision 3 named, and the repository confirmed both:

1. **"Create PO" existed and contradicted the PO identity.** `src/components/admin/AdminPurchaseOrderList.tsx`
   offered a *"Create Purchase Order on Behalf of Brand"* dialogue calling `api.createPurchaseOrder`, which minted a
   PO (`PO-ADM-…`), invented a 7% commission, fired a **REAL Postmark email** to the brand and audited `po_created`.
   Decision 3: **one PO record = the PO from Amazon. No second PO document. No "Create PO" anywhere.**
2. **No way for a channel PO to enter the platform.** The SP-API read (`fetchPurchaseOrders`) returned only
   `{ purchaseOrderId, poValue }` — nothing a PO could be **routed** by — and nothing turned a channel PO into a
   canonical record. The mock's "PO pool" was four bare ids, so the data to route with did not exist either.

### What was built

- **`src/lib/commerce/channelPurchaseOrderIngestion.ts` (NEW) — the ONE PO entry point.** The PO is addressed to
  Mercenta; Mercenta identifies the brand from the PO's **own lines** (`vendorSku`, or `asin` once the product is
  accepted on the channel) and files it in that brand's workspace. It is:
  · **fail-closed** — `CHANNEL_PO_EMPTY`, `CHANNEL_PO_LINE_NOT_IN_CATALOGUE` (out of scope, held for review),
    `CHANNEL_PO_CROSSES_TENANTS` (one PO is one brand's order). An unmatched line refuses the WHOLE PO; nothing is
    guessed and no partial PO is filed;
  · **tenant-safe** — the brand is DERIVED from the PO, never supplied by a caller, so a PO can never be filed
    against a tenant whose catalogue does not contain the ordered products;
  · **idempotent** — the channel PO number IS the record's `poNumber` (decision 3) and the id is deterministic
    (`po-channel-…`), so a re-read can never duplicate or reset a record;
  · **truthful** — the record's value is recomputed from the channel's OWN lines, the destination is the FC the
    CHANNEL declared (an unknown code keeps the channel's `partyId`; no site is invented), the channel's windows are
    carried, and `mode: 'simulation'`/`simulated: true` is set **only** when the seam says the read was simulated;
  · **attributed and audited** — each filing writes a canonical `po_ingested` audit record (actor, tenant, entity,
    `channelSource`, the channel's declared total) and announces the canonical-store change.
- **The SP-API read, extended in BOTH clients** (`src/lib/spapi/client.ts`, `src/lib/spapi/mockClient.ts`): the read
  now returns the channel's own PO payload (identity, `poLines`, declared `shipToPartyId`, `freightTerm`, windows,
  `simulated`). A live response is explicitly `simulated: false`; the mock's pool is **derived from the canonical
  catalogue** (`DEMO_PRODUCTS`) so a simulated PO is genuinely routable, and it deliberately contains ONE
  out-of-catalogue PO so the fail-closed refusal is reachable **from the product**, not only from a test.
- **`src/components/admin/AdminPurchaseOrderList.tsx`** — the create dialogue is gone; the header action is
  **"Read channel POs"** (`data-state="admin-po-ingest"`), behind the **same RBAC guard** the removed create action
  had, and a "Channel purchase orders" section states the seam's mode before and after the read ("Simulated read — no
  live channel call was made"), the outcome counts, and **every** outcome row — each filed row is clickable and opens
  the SAME record drawer the queue uses, and each refusal states its reason.
- **REMOVED (decision 3):** `createPurchaseOrder`, the admin create dialogue, and
  `src/lib/notifications/postmarkNotifier.ts` — whose ONLY caller was `createPurchaseOrder`. The canonical
  mock-first transactional-email seam is `src/lib/mail/**` (matrix `D14-04`); the retired one was a duplicate, and a
  brand's new-PO signal is in-app (`NotificationCenter`, derived from the canonical store). `createSimulatedPurchaseOrder`
  remains the scenario engine's simulation-only path (E4).


### TWO REAL DEFECTS THIS PHASE'S OWN GATES FOUND (and how they were fixed)

The first FULL validator run after the increment failed **exactly two gates**, neither of which typecheck, eslint or
the build can see. Both were real, and both were fixed at the source rather than by relaxing the gate:

1. **`validate-canonical-propagation` S2** — "every function that mutates canonical state signals the change". The
   ingestion owner signalled conditionally (`if (outcomes.some(...)) notifyCanonicalStoreChange();`), which the gate's
   contract (a signal must be a statement of its own) cannot express. **Fixed properly:** the signal is now emitted
   immediately after the record is filed, so it is a standalone statement AND only fires when a PO actually entered
   the store — the stronger of the two behaviours. (25 PASS / 0 FAIL after.)
2. **`validate-mock-seam`** — its "PO poll returns simulated POs" assertion pinned the read's OLD contract
   (`length === 2` and a rotating first id). P11 legitimately changed the read's contract: ingestion needs the PO's
   own LINES and a STABLE window, or the idempotency guard is untestable and the same channel PO would reappear
   forever. **Repointed, not weakened:** the gate now asserts MORE — the lines/FC fields ingestion routes by, the
   seam-declared `simulated: true`, the same set on a re-read, and that an out-of-catalogue PO exists. (PASS after.)

### Gates — added and repointed, never weakened

| Gate | Result |
|---|---|
| `scripts/validate-channel-po-ingestion.mjs` (**NEW**, `npm run validate:channel-po-ingestion`) | **PASS — 39 assertions, 0 network calls.** It EXECUTES the real owner AND the real mock client: routing by SKU and by ASIN; all three fail-closed refusals; the canonical record (channel PO number as `poNumber`, deterministic id, the channel's declared FC, its windows, the value recomputed from its own lines); simulated provenance; the injected-clock timestamp; the declared commercial placeholder; a failed read ingesting nothing; idempotency; attribution + audit; the simulated pool's routability and its out-of-catalogue refusal; the seam's credential-only mock/real selection; the ABSENCE of the removed create-PO path and the Postmark seam; the surface wiring (channel read + RBAC guard); no placeholder and no network call. **PROVED ABLE TO FAIL:** breaking the cross-tenant refusal → **37 passed / 1 failed**, naming it; restored byte-identical (`shasum` unchanged) → **39 / 0**. |
| `scripts/validate-e4-commerce.mjs` (S1, S2) | **PASS.** S1 **REPOINTED** (old contract recorded inline) — `createPurchaseOrder` + `sendPostmarkEmail` are now required to be **ABSENT** from the comment-stripped source, and the ONE entry point is the ingestion owner (+ new S1b pinning the three refusal codes). S2 gained the positive provenance assertions so it can still fail. |
| `scripts/validate-e5-admin-surfaces.mjs` (J2, J3) | **PASS.** J2 **REPOINTED** — the admin list's entry point is the channel read through the canonical owner, and no create control is rendered. J3's guard is UNCHANGED in contract and now guards the ingestion action (it never stopped being necessary). |
| `scripts/validate-e6-brand-surfaces.mjs` (F2, F5/F5b/F6) | **PASS.** F2 **REPOINTED** (comment-stripped). `P11_CHANNEL_PO_INGESTION_SCOPE` declares the phase's surface; **F6 first FAILED naming `src/lib/notifications/postmarkNotifier.ts` as an offender** — the change-scope mechanism working exactly as designed — and then accepted the declared §P11 surface. |
| `scripts/validate-e7-embedded-social.mjs` | **PASS** with `P11_CHANNEL_PO_INGESTION_DECLARED` added to the protected-path check and the approved-scope list. |
| `scripts/validate-mock-seam.mjs` | **PASS.** REPOINTED as described above (asserts MORE than it did). |
| `scripts/verify-demo-live.mjs` | the **§P11 live checks** were added: the deployed bundle's own content (the routing code, the channel-read control, the simulated-provenance notice, and the ABSENCE of the create dialogue and the Postmark seam), plus a live channel read driven on the deployed admin surface. |
| every other validator in `scripts/validate-*.mjs` | all **exit 0** (the whole set was executed this session: **101 of 101** — the new gate is the 101st). |



### Verification performed for P11 (session 24) — all evidence produced in the same session

| Check | Result |
|---|---|
| `npm run typecheck` (app) | **0 errors** |
| `npx tsc --noEmit` (root, incl. `e2e/` + `scripts/`) | **0 errors** |
| `npx eslint src scripts e2e` | **0 errors** |
| `npm run build` | **✓ built in 7.70s** |
| `npm run validate:wording` | **PASS — 315 src files, 0 outward-facing violations** |
| every validator in `scripts/validate-*.mjs` | **101 of 101 exit 0** (the whole set was executed; the new gate is the 101st) |
| the 2 affected/added browser specs (`e2e/channel-po-ingestion.spec.ts` 5 tests + `e2e/notifications.spec.ts` 4 tests) | **9 passed / 0 failed** |
| **FULL Playwright suite** (`npx playwright test --workers=3`) | **495 passed / 0 failed / 2 skipped (16.5m)**. Reported honestly: the FIRST full run had **one non-reproducing failure** — `e2e/design-system.spec.ts` 390x844 timed out for 30s inside its own `openShowcase` helper (a parallel-load timeout, in a spec that renders the design-system showcase, which P11 does not touch; the test never reached its assertion). That spec re-ran **11/11 in isolation** and the full suite re-ran **clean**, so it is recorded as a flake, not a P11 regression. |
| committed-state re-verification + demo deployment + live verification | recorded in the `CURRENT RESUME STATE` block of `PROJECT_STATUS.md` (the three-way gate) |

### Honest limits

- **The channel is SIMULATED until real LWA credentials exist** (mock-first, standing policy). The read goes through
  the ONE SP-API seam, the seam declares `simulated`, and the record carries `mode: 'simulation'`/`simulated: true`;
  a simulated read is never presented as a live channel transaction. Swapping to real is a credentials change only.
- **The channel's own PO STATUS is still P12's work.** Nothing here reads `getPurchaseOrdersStatus` (the receiving
  sync — `AV-040`), so a PO's *status* still originates from Mercenta's own workflow, exactly as P7 documented.
- **Routing keys are the PO's own identifiers.** A `vendorSku` match always works (the brand's catalogue SKU); an
  `asin` match works only once the product has been accepted on the channel (P8's identifier). A channel PO whose
  line is outside the Mercenta catalogue is **refused by design** (decision 3 + the approved-category limit).
- **A refusal is stated, not stored.** There is no "held channel POs" queue yet, so a re-read re-reports the same
  refusal with its reason (truthful, but not a workflow). A review queue for out-of-scope channel POs is a future
  increment and is NOT silently implied here.
- **The admin channel read is an operator action and is cross-tenant by design** (Mercenta routes; a brand never
  calls it). A brand sees only the POs routed to it, through the existing tenant-scoped stores.
- **There is deliberately no replacement for "produce a PO from nothing".** If Mercenta ever needs to raise its OWN
  commercial order to a brand (Model A/B `issuesMercentaBrandOrder`), that is a separate, documented capability and
  is NOT reintroduced by this phase.

---

## 16. P12 — WHAT WAS BUILT, VERIFIED AND HOW (the last phase: `AV-040` closed)

**Increment identity:** P12 of this programme (application work), matrix `cleanup-p12-spapi-seam`,
register **`AV-040`**. Branch `redesign/foundation`.

### What was missing

Three things the register and the repository agreed on:

1. **The channel's documented vendor surface was 2 of 8 operations.** `submitAcknowledgement` (§P4) and
   the purchase-order read (§P11) existed; `getPurchaseOrdersStatus`, `submitShipmentRequest`,
   `getShipmentDetails`, `getShipmentLabels`, `submitShipmentConfirmations`, `submitInvoices` and
   `submitInventoryUpdate` existed in NEITHER client.
2. **Four in-code declarations named P12 as their activation** — and were TRUE while it was absent:
   `receivingStatus.ts` ("reading the channel's status directly … is P12's seam work"),
   `channelPurchaseOrderIngestion.ts` (same), `consolidation.ts` ("the grouping arrives with the channel's
   shipment request, which is P12's declared scope"), `inventoryRecord.ts` / `inventoryLifecycle.ts`
   ("pushing stock to the channel is submitInventoryUpdate (P12)"), plus §P6's and §P9's honest limits
   (`getShipmentDetails` populating `outcome.routingInstructions`; the carrier poll).
3. **The label region rule was not modelled at all.** `GetShipmentLabels` is offered in **NA only**, so a
   UK/EU vendor must never claim a channel-generated label — nothing in the platform stated that.

### What was built

- **The seam, extended in BOTH clients** (`src/lib/spapi/client.ts` + `mockClient.ts`): the seven
  operations with identical signatures and shapes, each result carrying the seam's own provenance
  (`simulated`) and each failure a STATED code. The mock keeps ONE coherent simulated world — a shipment
  request must exist before routing instructions can be returned, and a confirmed ASN is what makes the
  channel's receiving sync report a receipt — with unmistakable identifiers (`MOCK-SHP-REQ-…`, `MOCK-ARN-…`,
  `MOCK-ASN-…`, `MOCK-INV-ACK-…`, `MOCK-INV-UPD-…`).
- **`src/config/shipping.ts` — the label REGION rule, declared once.**
  `channelShipmentLabelsAvailability(marketplaceId)` fails closed: only a positively-declared NA marketplace
  is available; a UK/EU marketplace and any UNKNOWN marketplace are refused, naming the rule. Both clients
  read it, so `getShipmentLabels` is refused BEFORE any credential or network work — a rule-driven refusal,
  not a provider error, and never a fabricated label.
- **`src/lib/commerce/channelReceivingSync.ts` (NEW) — the receiving sync.** The channel's own PO state and
  per-line received quantities (source `S5` / `AV-018`) mapped against the canonical purchase order, with
  unknown ids reported SEPARATELY (so "absent" can never be read as "not received"). The read is PURE; the
  write path `applyChannelReceivingReading` injects the canonical writer and **fails closed on provenance —
  a SIMULATED reading is never written as a canonical receipt.**
- **`src/lib/shipping/channelShipmentOperations.ts` (NEW) — the shipment operations.**
  `raiseChannelShipmentRequest` validates the consignment's DECLARED 1..n set through the consolidation
  owner (cross-tenant, duplicate and over-limit refusals happen BEFORE any channel call) and submits it;
  `readChannelRoutingInstructions` maps the channel's response onto the canonical `routingInstructions` and
  reports `pending` — with NO instruction object — until a genuine ARN comes back;
  `fileChannelShipmentConfirmation` files the ASN with the per-carton purchase-order reference.
- **`src/lib/commerce/channelInvoiceSubmission.ts` (NEW) — invoice submission (`submitInvoices`).** The
  invoice goes AS THE REGISTRY ISSUED IT, is idempotent, and refuses a cancelled invoice, a zero-value
  invoice and a reused number (`AV-022`).
- **`src/lib/inventory/channelInventoryPush.ts` (NEW) — the stock push (`submitInventoryUpdate`).** The
  quantity is DERIVED from the canonical movement ledger (`bucketTotals`) — never passed in — and a
  `Cases` push converts through the product's OWN case pack, refusing a lossy conversion, an undeclared unit
  and a negative position.
- **The chain now uses the seam** (`src/lib/commerce/proxyProcessor.ts`): the routing request is SUBMITTED
  (`SubmitShipments`, carrying the declared set), the routing instructions are read, and the ASN is filed
  through `submitShipmentConfirmations`. A channel refusal stops the chain and is never reported as a
  successful filing; `refreshChannelRoutingInstructions` is the attributed later read that advances the
  collect chain (the ARN arrives only after carrier assignment).
- **`src/components/admin/ChannelOperationsPanel.tsx` (NEW) + `src/components/admin/CatalogManagerAdmin.tsx`.**
  The admin channel-operations console renders all four Mercenta-side operations with their real actions
  (receiving read, routing refresh, invoice submission, the label rule) and states every seam mode
  truthfully; the admin inventory tab gains the attributed stock push. The document pack states the label
  rule where a brand might expect a channel label.

### Verification performed for P12 — all evidence produced in the same session

| Check | Result |
|---|---|
| `node scripts/validate-p12-spapi-seam.mjs` (NEW, the 102nd gate) | **P12_SPAPI_SEAM_VALIDATION_PASS (59 assertions, 0 network calls, executing the real modules AND both clients)**, **proved able to fail twice**: (a) making an unknown/UK marketplace "available" → **52 passed / 5 failed**; (b) removing the simulated-reading guard → **56 / 1**. Both restored **byte-identical** (`shasum` unchanged) → PASS again. |
| every validator in `scripts/validate-*.mjs` | **102 of 102 exit 0** (the whole set was executed this session; the new gate is the 102nd) |
| repointed gates | `validate-proxy-model` (the routing request is now the CHANNEL's own reference — the old `RR-` contract recorded inline, and MORE asserted), `validate-logistics-providers` (the consolidation activation is recorded as DELIVERED while the posture stays `deferred`), E6 F5/F5b/F6 + E7 (`P12_SPAPI_SEAM_SCOPE` / `P12_SPAPI_SEAM_DECLARED`, with the protected `src/lib/spapi/**` prefix declared, not widened) |
| `npm run typecheck` / `npx tsc --noEmit` (app + root, incl. `e2e/` + `scripts/`) | **0 errors** |
| `npx eslint src scripts e2e` | **0 problems** |
| `npm run build` | **✓ built in 7.65s** |
| `npm run validate:wording` | **PASS — 319 src files, 0 outward-facing violations** (the rule statement was reworded so no channel brand name appears in outward copy) |
| `e2e/p12-channel-operations.spec.ts` (NEW) | **4 passed** in real Chromium (the console renders all four operations; the label rule is stated as refused; the receiving sync reads the channel's own state for the POs the §P11 entry point just filed, with the simulated provenance; the read is not a dead end) |
| **FULL Playwright suite** (`npx playwright test --workers=3`) | recorded in the `CURRENT RESUME STATE` block of `PROJECT_STATUS.md` |
| committed-state re-verification + demo deployment + live verification | recorded in the `CURRENT RESUME STATE` block (the three-way gate) |

### A REAL DEFECT the live leg found — and the fix (so P13+ does not repeat it)

**The live bundle probe failed on the FIRST deployment** — `§P12 the deployed bundle carries the simulated-reading
refusal in the receiving sync` — because `CHANNEL_READ_SIMULATED` was **absent from the shipped bundle**. The
cause was not the probe: `applyChannelReceivingReading` (the canonical write path) was implemented and
gate-proven, but **no surface called it**, so the bundler tree-shook it away. The consequence would have been
real: even with live credentials, a channel reading could never have been applied.

**The fix:** the admin console now WIRES the write path — a LIVE reading offers *"Apply as canonical receipt"*
(through `applyChannelReceivingReadingToStore`, i.e. the canonical receiving step), while a SIMULATED reading
**offers no control at all** and states why it is not applied. There is therefore no control that can only ever
fail, the string ships (verified in `dist/assets/index-*.js`), and the gate now asserts the wiring so the
regression cannot recur (`the console WIRES the canonical receiving write path` +
`a SIMULATED reading offers no apply control`). The lesson is recorded here deliberately: **an exported,
gate-proven domain function is not a delivered feature until a surface calls it — and only a bundle-level live
check catches the difference.**

### Honest limits

- **The channel is still SIMULATED until real LWA credentials exist** (standing mock-first policy). Every
  operation declares its provenance from the seam; a simulated response is never presented as a live channel
  transaction, and swapping to real is a credentials change only.
- **The receiving sync READS but does not apply in this environment.** Because every reading here is
  simulated, the canonical write path refuses it by design (`CHANNEL_READ_SIMULATED`). That is the honest
  behaviour, not a gap: with live credentials the same reading applies through the existing receiving step.
- **The consolidation grouping INPUT remains a product decision.** P12 delivered the shipment request (the
  declared activation) and the request carries the declared 1..n set; nothing yet writes more than one
  purchase order per consignment, because purchase orders still arrive separately (decision 11).
- **Invoice submission does not make payment happen.** The register's `S11` precondition — parallel testing
  with the channel's accounts-payable team — is a business activation step, not a code change, and is
  recorded in `PRODUCTION_READINESS.md`.
- **The invoice-submission ledger is in memory** in this environment, exactly like the invoice ledger itself.
- **The channel's PO-status vocabulary is MAPPED, not invented.** The mapping onto Mercenta's
  `not_received / partially_received / received` is declared in the seam; a real integration must confirm
  the channel's own field values when credentials are configured.