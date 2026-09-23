# DASHBOARD + LOGISTICS CLEANUP PROGRAMME (2026-09-22) — AGREED PLAN, DECISIONS AND RESUME POINT

**Status: IN PROGRESS — P0, P0.4, P1, **P2** and **P3** are DONE and committed; P4–P12 remain.**
**Checkpoint: branch `redesign/foundation`; P2's checkpoint commit is recorded in
`PROJECT_STATUS.md` heading 7 and `HANDOFF.md`; P3's is recorded in the `CURRENT RESUME STATE` block.
`git status --porcelain` EMPTY.**
**Not pushed to GitHub at the time of writing (the first push of this 928 MB repository is transport-bound);
`demo.mercenta.co.uk` NOT deployed (deployment is the final step of the programme).**

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
| **P4** | | **Proxy-model corrections**: brand does its 3 jobs only; **Mercenta** raises the routing/shipment request and files the ASN (brand sees status); ack writes an **instruction-to-Mercenta** record; `submitAcknowledgement` behind the SP-API seam (mock-first, Mercenta-side) | **AV-040**, wrong direction, truthfulness |
| **P5** | | **Remove the Mercenta Hub completely** → destination = **the FC on the PO**; Hero/map arrival node = that FC; copy; validators/specs/docs | **D09-13 / AV-026/027** |
| **P6** | | **PO document pack** (auto on acceptance): **SSCC carton labels · carrier label + waybill · packing list/delivery note · ASN sheet · customs documents for international lanes**; notification + nav badge; Hub "Documents for this PO"; collect lane shows the documented status chain (request → carrier assigned → ARN → pickup) | decisions 6/9; `D10-10` |
| **P7** | | **Admin invoicing**: invoice per PO **after receipt**; **`receivingStatus` sync**; invoice-number registry; **14/30/60** terms per invoice; derived **upcoming payments**; receivables = issued-and-unpaid | decision 2; **AV-022** |
| **P8** | | **Inventory** linked to the catalogue + **ASIN** field (rule = decision 10) | decision 5 |
| **P9** | | **Remove the 3PL carrier surface** (decision 4) incl. the demo environment; repoint the affected specs/scripts | decision 4; matrix `D01-07`/`D04-18`/`D10-13` |
| **P10** | | **Logistics Hub completion**: provider configuration + the PO documents; **consolidation recorded as documented-but-deferred** (model supports 1..n POs) | decision 11; `D10-10` |
| **P11** | | **Remove "Create PO"** + channel PO ingestion (mock-first); repoint the three validators that assert its notification path | decision 3 |
| **P12** | | **SP-API seam extension (mock-first)**: `submitAcknowledgement`, `getPurchaseOrdersStatus` (receiving sync), `submitShipmentRequest`, `getShipmentDetails`, `getShipmentLabels` (honest UK/EU refusal), `submitShipmentConfirmations`, `submitInvoices`, `submitInventoryUpdate` | **AV-040** |

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

- **Done:** P0, P0.4, P1, **P2**, **P3** (committed; the P2 checkpoint hash is recorded in `PROJECT_STATUS.md` §7, P3's in
  the `CURRENT RESUME STATE` block).
- **Next:** **P4 — Proxy-model corrections** (brand does its 3 jobs only; Mercenta raises the routing/shipment request
  and files the ASN; the acknowledgement writes an instruction-to-Mercenta record; `submitAcknowledgement` behind the
  SP-API seam, mock-first).
- **Then:** P5 → P12 in order.
- **Deployment:** only at the end, once the programme is verified: `bash scripts/deploy-demo.sh`, then
  **open** `https://demo.mercenta.co.uk`, verify the changed behaviour live, and confirm the live build
  matches the recorded verified commit. Until then the status is
  **VERIFIED LOCAL/COMMITTED CHECKPOINT — NOT COMPLETE**.

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



