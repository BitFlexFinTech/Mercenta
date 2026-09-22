# DASHBOARD + LOGISTICS CLEANUP PROGRAMME (2026-09-22) — AGREED PLAN, DECISIONS AND RESUME POINT

**Status: IN PROGRESS — P0 and P1 are DONE and committed; P2–P12 remain.**
**Checkpoint: branch `redesign/foundation`, HEAD `92dd06b`, `git status --porcelain` EMPTY.**
**Not pushed to GitHub; `demo.mercenta.co.uk` NOT deployed (deployment is the final step of the programme).**

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
| 8 | **Overview cards: ADDITIVE ONLY** | **Every existing Overview card stays.** The discussed cards are ADDED. (The brand's *action sections* "Needs your attention" + "Next actions" still MOVE to Operations, as decided.) |
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
| **P2** | NEXT | **Overview = Observe (ADDITIVE ONLY)**: hero row (open PO value · revenue · gross profit · margin % · receivables) + business row (brands · products · POs · orders · shipments · operational volume · upcoming payments · fulfilment status) + financial performance + logistics status + trends; brand: its own earnings + first chart; brand action sections move to Operations | the business-picture gaps |
| **P3** | | **Operations = Act** wiring: brand attention/next-actions land in Operations; badges; **Control Centre loses its duplicated work/attention lists** (founder-only controls) | 3 action lists → 1 |
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

- **Done:** P0, P1 (committed; full suite **459 passed / 0 failed / 2 skipped** at P0).
- **Next:** **P2 — Overview = Observe, ADDITIVE ONLY** (keep every existing card).
- **Then:** P3 → P12 in order.
- **Deployment:** only at the end, once the programme is verified: `bash scripts/deploy-demo.sh`, then
  **open** `https://demo.mercenta.co.uk`, verify the changed behaviour live, and confirm the live build
  matches the recorded verified commit. Until then the status is
  **VERIFIED LOCAL/COMMITTED CHECKPOINT — NOT COMPLETE**.

