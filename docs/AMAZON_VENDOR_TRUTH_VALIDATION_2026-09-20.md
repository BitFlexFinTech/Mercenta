# AMAZON VENDOR TRUTH VALIDATION — PHASE 0A (RESEARCH / FORENSIC AUDIT ONLY)

**Date:** 2026-09-20
**Mode:** AUDIT ONLY — zero source changes, zero test changes, zero registry changes, zero documentation edits, zero git mutation
**Repository:** `/Users/tadii/Desktop/1. Mercenta`
**Branch:** `redesign/foundation` · **HEAD:** `19be002c4b3d6a64020b4740879c56ef1550e628`
**Companion artifact:** `docs/AMAZON_VENDOR_DISCREPANCY_REGISTER_2026-09-20.md`

---

## 1. EXECUTIVE SUMMARY

The audit set out to establish the **documented Amazon Vendor operating model** from authoritative
Amazon sources *before* deciding anything about the planned Phase 3 (Supply Route / Logistics
Intelligence), then to audit the entire Mercenta repository against that evidence.

**What the research established (authoritative, Amazon-owned documentation only):**

The Amazon **Vendor Retail Procurement** model is publicly documented in Amazon's Selling Partner
API developer documentation, and it confirms a substantial part of what Mercenta already models:
the **24-hour acknowledgement** obligation, the **exact rejection reason codes**, the
**line-item acknowledgement codes**, the **freight-term → window-type** relationship
(`Collect`/WePay → *ship window*; vendor-paid → *delivery window*), the **ASN-before-receipt**
requirement, the **receiving-status/received-quantity** concept, and the fact that
**awaiting-acknowledgement** POs are exposed as `purchaseOrderState = New`.

**What the research did NOT establish:**

- The **"Routing Request due by 10am Pacific the day before the ship window closes"** rule —
  encoded in the repository as if it were a Vendor Central rule — is **not established by any
  Amazon documentation reachable in this session**. It must be reclassified as unverified.
- A published **Amazon chargeback/deduction taxonomy** matching Mercenta's nine `DeductionType`
  values was not reachable (Vendor Central help is sign-in gated).
- A **Vendor performance scorecard formula** (fill rate / on-time / defects) is not publicly
  documented; the SP-API surface contains **no vendor-performance, deductions, chargebacks or
  retail-procurement payments API at all**.
- Several Amazon behaviours that Mercenta's PO model does **not** implement were found: the
  **48-hour update window**, the **"a rejected line can never become accepted/backordered"** rule,
  **`isBackOrderAllowed`** gating, the **cost-price-must-match-invoice** rule and the
  **order-change/cancellation ingestion** mechanism.

**Two genuine mis-attributions were found in Mercenta source:**

1. Compliance documentation is labelled in three places as *"Amazon UK requirements"* — the
   underlying obligations (UKCA, CPNP/SCNP, WEEE, EN 71/1888, food-contact, textile labelling) are
   **UK/EU regulatory** obligations, not Amazon rules.
2. `Routing Request due 10am Pacific` is presented in code comments and UI as a Vendor Central
   rule; it is **unverified**.

Neither was changed. Both are documented below and in the register.

**Bottom line:** the architecture is not fundamentally wrong. The Vendor *core* is largely
evidence-aligned, and the places that go beyond evidence are mostly labelled as Mercenta rules
(which is correct) — **except** for the mis-attributions above and a set of *missing* documented
Amazon behaviours that Phase 3 / the PO-vocabulary work will need to reconcile.

**Phase 3 status: READY WITH DOCUMENTED CONDITIONS** (see §32).

---

## 2. GIT / REPOSITORY STATE

| Item | Value |
|---|---|
| Branch at start | `redesign/foundation` |
| Branch at end | `redesign/foundation` (unchanged) |
| HEAD at start | `19be002c4b3d6a64020b4740879c56ef1550e628` |
| HEAD at end | `19be002c4b3d6a64020b4740879c56ef1550e628` (unchanged) |
| Staged files | 0 (before and after) |
| Deleted files | 0 |
| `git status --porcelain` entry count | **132 before → 132 after** (unchanged) |
| New tracked modifications created by this audit | **NONE** |
| New untracked files created by this audit | 2 report files in `docs/` |
| Protected design assets / Rakazo / `ave1-check.mjs` | untouched |
| `.env` / `.env.deploy` | **never read, never printed** |
| Deploy / commit / push / stash / reset / clean / checkout / amend | **none performed** |

**Pre-existing dirty working tree (NOT caused by this audit).** Before starting, the tree already
contained 24 modified tracked files (excluding generated screenshots) plus untracked sprint
artifacts. The non-generated tracked modifications present at audit start were:

```
M HANDOFF.md                    M PROJECT_STATUS.md             M package.json
M requirements-registry.json    M scripts/integrity-audit.mjs   M scripts/lint-wording.mjs
M scripts/validate-e6-brand-surfaces.mjs   M scripts/validate-e7-embedded-social.mjs
M scripts/validate-uiux-redesign.mjs       M src/components/layout/AdminShell.tsx
M src/components/layout/BrandShell.tsx     M src/components/marketing/Home.tsx
M src/components/marketing/PublicNav.tsx   M src/components/shared/WorkWorkspace.tsx
M src/config/homepageContent.ts            M src/data/domainRepository.ts
M src/data/prospectStore.ts     M src/lib/costs/modelPolicy.ts  M src/lib/events/types.ts
M src/lib/work/types.ts         M src/lib/work/useWork.ts       M src/lib/work/workStore.ts
M src/types.ts                  M "Review Zip/mercenta-review.zip"
+ modified `test-screenshots/**` and `e2e-report/**` generated artefacts
```

This is the **same dirty tree the Phase 2 checkpoint deliberately preserves**
(`PROJECT_STATUS.md`: *"The intentionally dirty working tree was preserved and extended, never
reset"*). Per the protection rules I did **not** commit, stash or clean it.

**The standing review-zip export was deliberately NOT executed.** `bash scripts/export-review-zip.sh`
rewrites the **tracked** artefact `Review Zip/mercenta-review.zip`, which would create a git-visible
content change and violate this task's `ZERO GIT MUTATION` / *"no new tracked modifications"*
requirement. It is flagged here instead of performed, and can be run on request.

### Audit-day state (end of task)

```
$ git rev-parse --abbrev-ref HEAD   → redesign/foundation
$ git rev-parse HEAD                → 19be002c4b3d6a64020b4740879c56ef1550e628
$ git status --porcelain | wc -l    → 132      (identical to audit start)
$ git diff --cached --name-only     → (empty)
```

---

## 3. RESEARCH METHOD

1. Establish the **common/global Vendor model first** from Amazon-owned documentation.
2. Record **marketplace-specific** differences only where Amazon documentation states them.
3. Separate **Vendor** evidence from **Seller Central / FBA / FBM / Direct Fulfillment** evidence at
   every step, flagging any finding that is FBA/Seller-shaped.
4. Audit the **entire Mercenta repository** (types, config, data, lib, components, integrations,
   simulation, validators, e2e, registry, docs) against that evidence.
5. Run **read-only** validation (typecheck + non-writing validators) to establish the current state.
6. Produce a **discrepancy register**, an **unsupported-assumption register**, an **unknown
   register** and a **"do not change" register**.
7. **STOP.** No implementation.

Search coverage: all of `src/**` (352 files), `docs/**`, root `.md` files, `scripts/**`,
`requirements-registry.json` (349 entries), `e2e/**` spec titles, plus git history/status.

Network activity during this audit was restricted to **read-only HTTP GETs to Amazon-owned
documentation**. **Zero Mercenta runtime calls** were made; the repository's own validator asserts
`networkCalls=0` (see §31).

---

## 4. SOURCES CONSULTED

### 4.1 Authoritative — Amazon-owned (primary evidence)

| # | Source | URL | Type | Updated | What it establishes | Limitations |
|---|---|---|---|---|---|---|
| S1 | Vendor Retail Procurement Orders API (overview) | developer-docs.amazon.com/sp-api/docs/vendor-retail-procurement-orders-api.md | Amazon developer docs | 2026-09-09 | "You can use the Vendor Orders API to receive purchase orders and to send order acknowledgments to accept or reject order fulfillment." Availability: **Vendors only**; sandbox **Static**; regions NA/EU/FE | API-shaped; does not describe the Vendor Central UI |
| S2 | Submit order acknowledgement | …/submit-order-acknowledgement.md | Amazon developer docs | 2026-09-09 | 24-hour acknowledgement; 48-hour update window; acknowledgement codes `Accepted`/`Backordered`/`Rejected`; the **exact** rejection reasons; complete-acknowledgement requirement; cost-price-must-match-invoice; no quantity above PO | Vendors-only program; some statements are business-rep dependent |
| S3 | Retrieve purchase order | …/retrieve-purchase-order.md | Amazon developer docs | 2026-09-09 | Vendor-paid freight ⇒ **delivery window**; Amazon-paid freight ⇒ **ship window**; `isBackOrderAllowed`; deal codes; the API cannot change an order (manual via Vendor Central); country-specific table (Europe: scheduled ship/delivery dates *optional*) | Field-level, not policy-level |
| S4 | Cancel and change orders | …/cancel-and-change-orders.md | Amazon developer docs | 2026-09-09 | Order changes/cancellations are *pulled* via `getPurchaseOrders`; `purchaseOrderChangedDate`, `changedAfter/Before`, `isPOChanged`, `poItemState=Canceled`; `purchaseOrderState=New` = not acknowledged/fulfilled; backorder policy set by Amazon business rep | No change-notification SLA stated |
| S5 | Get purchase order status | …/get-purchase-order-status.md | Amazon developer docs | 2026-09-09 | `purchaseOrderStatus` (e.g. `OPEN`), `itemConfirmationStatus` (e.g. `REJECTED`, `PARTIALLY_ACCEPTED`), `acknowledgementStatusDetails` history, **`receivingStatus` = "the Amazon fulfillment center received status and received quantity"**, `shipToPartyId` = **FC code** | Field-level |
| S6 | Vendor Retail Procurement Shipments API | …/vendor-retail-procurement-shipments-api.md | Amazon developer docs | 2026-09-09 | Shipment request / shipment details / labels / **ASN** operations; `GetShipmentLabels` NA only | — |
| S7 | Submit or update a shipment request | …/submit-or-update-a-shipment-request.md | Amazon developer docs | 2026-09-09 | `SubmitShipments` = **WePay (Collect)** vendors, **NA + EU**, standard pallets only; **PO must be confirmed first** ("Unconfirmed purchase orders cause the request to fail"); `requestedPickUp` **at least two business days after the current date**; after submission, routing instructions come from `GetShipmentDetails` | — |
| S8 | Retrieve shipment details | …/retrieve-shipment-details.md | Amazon developer docs | 2026-09-09 | `GetShipmentDetails` **only for WePay and collect orders, NA + EU**; **carrier assignment occurs the same day as pickup or one day prior**; does not return shipments submitted through Vendor Central | — |
| S9 | Submit shipment confirmation (ASN) | …/submit-shipment-confirmation.md | Amazon developer docs | 2026-09-09 | "**Amazon must receive the shipment confirmation prior to the product being received at the Amazon fulfillment center. Missing or delayed shipment confirmations result in chargebacks.**"; ASN carries PO number, ship date, EDD, lot, expiry, **SSCC**; carton + pallet structures; ≤100 confirmations per FTL/LTL | — |
| S10 | Vendor Retail Procurement Invoices API | …/vendor-retail-procurement-invoices-api.md | Amazon developer docs | 2026-09-09 | Invoice + credit-note submission; Vendors only | — |
| S11 | Submit invoices | …/submit-invoices.md | Amazon developer docs | 2026-09-09 | Invoice numbers unique/never reusable; `total amount = 0` fails; wrong invoice data ⇒ Amazon **cancels** the invoice and a **new Invoice ID** is required; an API correction mirroring a correct Vendor Central invoice uses the **same Invoice ID**; bill-to must match the Amazon Payee system; **parallel testing with Amazon AP** required; EU example shows remit-to entity `AMAZON EU SARL, UK BRANCH` (GB) with VAT tax details | Parallel testing is an onboarding process, not a general SLA |
| S12 | Vendor Retail Procurement Transaction Status API | …/vendor-retail-procurement-transaction-status-api.md | Amazon developer docs | 2026-09-09 | POST transactions can be status-checked; sandbox **Dynamic** | Covers POST transactions only |
| S13 | Vendor Central URLs | …/vendor-central-urls.md | Amazon developer docs | 2026-09-09 | Vendor Central exists per marketplace: UK `vendorcentral.amazon.co.uk`; EU/NA/FE lists. "For vendor applications only" | URL inventory only; **no country-specific rule differences stated** |
| S14 | SP-API API index (site navigation) | developer-docs.amazon.com/sp-api | Amazon developer docs | 2026-09 | The public API surface includes Vendor **Orders / Invoices / Shipments / Transaction Status** and the **Vendor Direct Fulfillment** suite. **There is no public Vendor Payments, Deductions, Chargebacks or Vendor-Performance API.** | Absence of an API ≠ absence of the concept |
| S15 | Carrier Central (public landing + client strings) | carriercentral.amazon.com | Amazon-operated web app | 2026-09 | Appointment-based inbound delivery; **Carrier Requested Delivery Date must be within the PO's Delivery Window**; delivery-window compliance affects *shipper and carrier* performance; **Carrier Controllable FPY** eligibility; Defect Rate = appointments that did not materialise due to changes within 24h of scheduled arrival; appointment states (Pending/Scheduled/Arrived/Deleted/Cancelled/Defect/Closed) | UI strings, not narrative documentation; some details are FC/vendor specific |
| S16 | Vendor Central sign-in page | vendorcentral.amazon.co.uk | Amazon-operated, public | 2026-09 | Existence of the UK Vendor Central portal and the "Amazon Vendor Central Site Terms" link | Content gated behind sign-in |

### 4.2 Authoritative — NOT reachable in this session (stated honestly)

| Attempted source | Result |
|---|---|
| `sell.amazon.com/programs/vendor-central` | **HTTP 404** — Amazon's public Vendor Central marketing page is not currently published at that path |
| `sell.amazon.co.uk/programs/vendor-central` | **HTTP 404** |
| `sell.amazon.com/vendor-central` | **HTTP 404** |
| Vendor Central **help hub** pages (PO help, chargeback help, performance scorecards) | **Sign-in gated** — not retrievable unauthenticated |
| Amazon **marketplace-ID** reference (`/docs/marketplace-ids`, `.md` variant) | **HTTP 404** on both attempts — `A1F83G8C2ARO7P` could **not** be confirmed from Amazon in this session |
| `vendor-retail-procurement-apis-v1-use-case-guide.md`, `vendor-direct-fulfillment-v1-use-case-guide.md` | **HTTP 404** (slugs no longer exist) |
| General web search (DuckDuckGo HTML) | Bot challenge — **no search-engine corroboration used** |

### 4.3 Secondary / non-authoritative

**None used as proof.** No Reddit, blog, agency, consultant, software-vendor, forum or SEO source was
used to establish any Amazon rule in this report. Where evidence is missing the finding is marked
`UNKNOWN` rather than filled from a secondary source.

### 4.4 Internal evidence base (repository)

`src/types.ts` · `src/config/commercial.ts` · `commercialModel.ts` · `commercialReadiness.ts` ·
`routing.ts` · `shipping.ts` · `ukMarketFit.ts` · `vat.ts` · `src/data/demoData.ts` ·
`src/data/api.ts` · `src/lib/compliance.ts` · `src/lib/amazon/*` · `src/lib/spapi/*` ·
`src/lib/simulation/scenarioEngine.ts` · `src/lib/statusPresentation.ts` ·
`src/lib/notifications/postmarkNotifier.ts` · `src/components/shared/RoutingRequest.tsx` ·
`src/components/brand/BrandPurchaseOrders.tsx` · `src/components/brand/BrandDashboard.tsx` ·
`src/integrations/*` · `src/lib/intelligence/amazonWording.ts` · `e2e/po-lifecycle.spec.ts` ·
`e2e/shipment-asn.spec.ts` · `requirements-registry.json` (349 entries) · `PROJECT_STATUS.md` ·
`HANDOFF.md` · `MASTER_CHATGPT_HANDOFF.md` §5–§7 · `docs/MERCENTA_PRODUCT_CONTRACT.md` ·
`docs/MERCENTA_BUSINESS_MODEL.md` · `docs/INTEGRATIONS.md`

---

## 5. THE COMMON (GLOBAL) AMAZON VENDOR MODEL — WHAT IS ACTUALLY DOCUMENTED

Established from Amazon's own developer documentation (S1–S14). Verbatim quotes appear in `"…"`.

**5.1 The relationship.** Amazon's Vendor Retail Procurement APIs are **"Vendors only"** and let a
vendor **"receive purchase orders and … send order acknowledgments to accept or reject order
fulfillment"** (S1). The vendor receives POs *from* Amazon, decides fulfilment per line, submits an
acknowledgement, and later ships against the named Amazon fulfilment centre. Nothing in the
documentation describes a vendor issuing POs to Amazon; the direction is always **Amazon → vendor**.
This is the **global/core** behaviour; no marketplace variation is stated.

**5.2 Purchase orders.** A PO carries: `purchaseOrderNumber`, `purchaseOrderState` (e.g. `New` = the
orders *"you have not acknowledged or fulfilled"*), `purchaseOrderStatus` (e.g. `OPEN`),
`orderDetails`, per-item `netCost`/`listPrice`, `orderedQuantity` (`unitOfMeasure` + `unitSize`),
`expectedShipDate`/`expectedDeliveryDate`, `isBackOrderAllowed`, `shipToParty.partyId` (**the FC
code**), plus `purchaseOrderChangedDate` / `poItemState=Canceled` on change (S3, S4, S5).

**5.3 Acknowledgement (the driver of the whole lifecycle).** Documented verbatim (S2):

- *"You must submit the acknowledgment within 24 hours, including backordered items."*
- *"You have 24 hours to accept a purchase order. Vendors must reject any purchase order that is on
  hold past the 24-hour time limit."*
- *"You must submit an updated acknowledgment within 48 hours for any changes to quantity, price,
  ship dates, or delivery dates… After 48 hours, we only expect to receive updates to ship dates or
  delivery dates."*
- *"You must provide a complete acknowledgement, including all purchase order line items… If you do
  not provide all line items…, Amazon implicitly rejects the missing line items. If the
  acknowledgment code is omitted, the acknowledgment is rejected."*
- *"The cost price in the acknowledgement must match the invoiced unit cost price… The price cannot
  be higher than the price submitted in the purchase order."*
- *"You cannot send a higher quantity in the order acknowledgment than what was submitted in the
  purchase order. However, you can confirm a smaller quantity…"*
- *"If the first acknowledgment code for a specific line item was `rejected`, you cannot change this
  with your update to either `accepted` or `backordered`."*

Acknowledgement codes (S2): **`Accepted`**, **`Backordered`** (*"provides a `scheduledShipDate` or
`scheduledDeliveryDate` that is different than the `expectedShipDate` or `expectedDeliveryDate`
provided in the purchase order"*), **`Rejected`** (*"A `rejectionReason` is required"*).

Rejection reasons (S2) — exactly three, verbatim:
**`TemporarilyUnavailable`**, **`InvalidProductIdentifier`**, **`ObsoleteProduct`**.

**5.4 Order changes are Amazon-driven.** Amazon may change a PO after creation (ship/delivery window,
quantity, item cancellation, item cost, new item, cancel/uncancel, PO type, destination FC, freight
terms) and the vendor *"must fulfil the updated purchase order"*. The vendor discovers changes by
polling `getPurchaseOrders`. **"Submitting a change to an order using the API is not possible. After
an order is placed, changing it is a manual process through Vendor Central."** (S3, S4)

**5.5 Freight terms → window type (documented).** For **vendor-paid** freight Amazon specifies a
**delivery window**: *"the earliest date that Amazon expects the freight to be delivered to the
Amazon fulfillment center listed on the purchase order"*. For **Amazon-paid** freight use the **ship
window**: *"the earliest date that Amazon expects to pick up the freight"* (S3). Amazon's own
shipment APIs use **`shipmentFreightTerm: "Collect"`**, and `SubmitShipments` / `GetShipmentDetails`
are explicitly **"for WePay (Collect) vendors"** (S7, S8). So *Collect = WePay = Amazon
pays/arranges* and *vendor-paid = Prepaid = "TheyPay"*.

**5.6 Routing and pickup (documented).** A collect vendor submits a **shipment request**
(`SubmitShipments`); the **PO must already be confirmed** — *"Unconfirmed purchase orders cause the
request to fail"*; **`requestedPickUp` must be "a date at least two business days after the current
date"**; then Amazon returns **routing instructions** via `GetShipmentDetails`, whose **carrier
assignment "occurs either on the same day as the scheduled pickup or one day prior to the pickup
date"** (S7, S8). **No "10am Pacific" deadline and no "day before the ship window closes" deadline is
documented anywhere in the sources reached.**

**5.7 ASN (documented).** The **Advance Shipment Notification** carries PO number(s), ship date,
estimated delivery date, lot number, expiry date and **SSCC** container identifiers, with
carton/pallet structure; maximum 100 confirmations per truckload/LTL. **"Amazon must receive the
shipment confirmation prior to the product being received at the Amazon fulfillment center. Missing
or delayed shipment confirmations result in chargebacks."** ASNs are documented to *"accelerate
invoice processing"* and to reduce chargebacks and freight refusals (S9).

**5.8 Receiving (documented).** `getPurchaseOrdersStatus` exposes **`receivingStatus`** = *"the
Amazon fulfillment center received status and received quantity"*, and can filter by FC code
(`shipToPartyId`) (S5). Delivery itself is **appointment-based**: Carrier Central documents that the
**Carrier Requested Delivery Date must fall inside the PO's Delivery Window**, and that
delivery-window compliance feeds *"shipper and carrier performance"* (S15).

**5.9 Invoicing (documented).** Invoices are matched against the PO/shipment: invoice numbers must be
unique and never reused; a zero-value invoice fails; a wrong invoice is **cancelled by Amazon** and
must be re-sent with a **new Invoice ID**; a correction mirroring a correct Vendor Central invoice
keeps the **same Invoice ID**; bill-to must match the Amazon Payee system; **API invoicing requires
"parallel testing with our payments system"**; credit notes handle returns / pricing corrections /
allowances (S10, S11).

**5.10 No public API for vendor payments, deductions, chargebacks or performance.** The complete
SP-API index lists Vendor Orders, Vendor Invoices, Vendor Shipments, Vendor Transaction Status and
the Vendor Direct Fulfillment suite — and **no** retail-procurement payments, remittance, deduction,
chargeback or vendor-performance endpoint (S14). Those concepts demonstrably exist in Vendor Central
(chargebacks are referenced in S9; performance in S15) but are **not publicly documented nor
API-exposed** in the sources reached.

**5.11 Two distinct vendor programs.** *Retail Procurement* (bulk POs shipped to Amazon FCs — what
Mercenta models) and *Vendor **Direct Fulfillment*** (the vendor ships individual customer orders,
with its own Orders/Inventory/Shipping/Payments/Transactions APIs and its own
`submitAcknowledgement`) are **separate programs** (S1, S6, S14). They must never be conflated by
name or by rule.

---

## 6. MARKETPLACE-SPECIFIC FINDINGS

Amazon's documentation states the region scope of the Vendor APIs (**NA, EU, FE**) and sandbox
availability, and — in one place only — a **country-specific table** (S2/S3):

| Functionality | India | **Europe** | North America |
|---|---|---|---|
| Scheduled Ship Date | Conditional (freight terms / business arrangement) | **Optional** | Optional |
| Scheduled Delivery Date | Conditional | **Optional** | Optional |
| List Price | Book vendors only | **Supported** | Book vendors only |
| Backorder | **Not applicable** | **Supported** | Supported |
| Buying / selling / ship-to / bill-to party | Address of entity | **Party ID** (buyer party, vendor code, ship-to party) | Not applicable |

The UK, as an **EU-region store**, therefore inherits: optional scheduled ship/delivery dates,
supported list price, **backorders supported**, party-ID-based buying/ship-to/bill-to. Vendor Central
URLs are published **per marketplace** (UK `vendorcentral.amazon.co.uk`) with **no marketplace-specific
rule differences stated** (S13).

**Legal-entity evidence (from Amazon's own invoice payload, S11):** the EU example uses
`remitToParty.partyId = "AMAZON"` with address **`AMAZON EU SARL, UK BRANCH`, countryCode GB** — i.e.
Amazon's UK branch is the EU/UK legal entity on the document. Mercenta models **no buying/remit
entity** anywhere.

**What is UK-specific is overwhelmingly UK LAW, not an Amazon rule:** UKCA marking, cosmetics
notification (SCNP/CPNP), WEEE, food-contact, EN 71 / EN 1888, textile labelling, VAT — see §11 and
register items `AV-031` / `AV-032`.

**Amazon UK destination data:** no authoritative public directory of UK fulfilment centres was found;
the destination is supplied **on each PO** (`shipToParty.partyId`, the FC code — S5) and a delivery
must be **appointed** (S15). Mercenta's static `DEFAULT_UK_FC_LIST` (22 seeded codes, `src/types.ts`)
is therefore a **Mercenta convenience list, not an Amazon-published directory** → `AV-017`.

**Not established:** any marketplace-specific acknowledgement deadline, any marketplace-specific
chargeback rule, any marketplace-specific Vendor Central UI rule.
`UNKNOWN — NOT ESTABLISHED BY THE RESEARCH.`

---

## 7. VENDOR vs SELLER / FBA SEPARATION

| Evidence | Applies to | Used correctly by Mercenta? |
|---|---|---|
| S1–S14 (Vendor Retail Procurement APIs) | **Vendor** | Yes — the PO/ack/ASN/invoice model is Vendor-shaped |
| S7/S8 (`WePay (Collect)`, shipment requests, routing instructions) | **Vendor** | Partly — see §9 |
| S9 (`SSCC`, cartons, pallets, lot/expiry, ≤100 per FTL/LTL) | **Vendor** | Partly — no SSCC/pallet model |
| S15 (Carrier Central appointments, PO delivery windows, FPY) | **Vendor/shipper** (Carrier Central serves inbound freight to Amazon FCs) | Not modelled at all |
| `Vendor Direct Fulfillment *` APIs (customer-order dropship) | **Vendor (different program)** | Mercenta never implements it — good — but **re-uses the words "Direct Fulfillment" for an internal concept** (`AV-025`) |
| FBA / FBM / Fulfillment Inbound / AWD / Multi-Channel Fulfillment / Seller Central listing requirements | **Seller** | **No Vendor rule in the repository was found to derive from these.** The one genuine risk found is the **"Brand Registry Confirmation"** base compliance document (`AV-032`), because *Amazon Brand Registry* is a **seller/brand-owner** programme |

**Explicitly flagged as FBA-shaped or Seller-shaped:**

1. `brand_registry_confirmation` in `src/lib/compliance.ts` `BASE_REQUIRED_DOCUMENTS` and in
   `src/data/demoData.ts` — Brand Registry is documented as an Amazon **seller** programme; treating
   it as a mandatory vendor compliance document is `UNSUPPORTED`.
2. `letter_of_authorization` as a *base* requirement for every brand: an internal Mercenta control
   (`MERCENTA RULE`), not an Amazon Vendor requirement.
3. `src/lib/amazon/productImageValidator.ts` implements Amazon **listing image** rules
   (white background, 85% frame fill, ≥1000px). Those belong to **product listing/catalogue**
   requirements that apply across Amazon programmes; they are **not** Vendor-PO rules. The exact
   numeric thresholds were **not verified against Amazon documentation in this session** →
   `AV-033` (verify before relying on them).
4. `src/lib/spapi/transform.ts` builds a *"Selling Partner vendor catalog model"* payload and states:
   *"Exact wire format must be verified against the live API docs when the connection goes live."*
   That hedge is **correct and should stay**. Note that the public SP-API surface for Vendors
   (S1, S6, S10, S12, S14) exposes **orders, invoices, shipments and transaction status** — there is
   **no Vendor *catalogue/item* API** in the public index, unlike Seller Central's Catalog Items API.
   Mercenta's catalogue submission seam therefore has **no documented Vendor endpoint to bind to** →
   `AV-035` (`UNKNOWN`/needs Amazon evidence).

**No finding in this audit indicates that an FBA rule has leaked into a Vendor rule**, with the two
naming/attribution exceptions above.

---

## 8. PO FINDINGS

| Amazon behaviour (evidence) | Mercenta today | Classification |
|---|---|---|
| 24-hour acknowledgement window (S2) | Implemented: `orderDate + 24h` countdown, `PO_AWAITING_ACK`, `ackDeadlinePresentation` | **CONFIRMED** (`AV-001`) |
| "Vendors must reject any purchase order that is on hold past the 24-hour time limit" (S2) | Not modelled (no `on_hold` PO concept) | **INCOMPLETE** (`AV-010b`) |
| 48-hour update window for quantity/price/ship/delivery changes; after 48h only dates (S2) | Not modelled | **INCOMPLETE** (`AV-006`) |
| Line-item acknowledgement with `accepted` / `backordered` / `rejected` (S2) | Implemented: `LineAckStatus` + `AckHistoryEntry` | **CONFIRMED** (`AV-005`) |
| Rejection reasons exactly `TemporarilyUnavailable` / `InvalidProductIdentifier` / `ObsoleteProduct` (S2) | Implemented verbatim as `PO_REJECTION_CODES` | **CONFIRMED** (`AV-004`) |
| Acknowledged quantity can be **less** than ordered but never **more** (S2) | Implemented (`acknowledgedQty` "NEVER greater than `quantity`"), and e2e spec 5 asserts the block | **CONFIRMED** |
| A line rejected first can never later become accepted/backordered (S2) | Not modelled | **INCOMPLETE** (`AV-007`) |
| Cost price in the acknowledgement must match the invoiced unit cost, and must not exceed PO price (S2) | `acknowledgedUnitPrice` exists but no match/limit rule | **INCOMPLETE** (`AV-008`, `AV-023`) |
| Omitted line items are implicitly rejected; omitted acknowledgement code ⇒ rejected (S2) | Not modelled (Mercenta allows per-line decisions without a completeness check) | **INCOMPLETE** (`AV-009`) |
| Backorders only allowed when `isBackOrderAllowed` is true; policy set by Amazon business rep (S3, S4) | Not modelled — backorder always offered | **UNSUPPORTED / INCOMPLETE** (`AV-010`) |
| Amazon's PO status vocabulary: `purchaseOrderState` (New/…), `purchaseOrderStatus` (OPEN/…), `itemConfirmationStatus` (ACCEPTED/REJECTED/PARTIALLY_ACCEPTED) (S4, S5) | Mercenta has its own lifecycle `received → under_review → accepted → rejected → ready_to_fulfil → shipped → delivered` with **no declared mapping** to Amazon's vocabulary | **INCOMPLETE** (`AV-043`) |
| POs change/cancel after creation and the vendor *"must fulfil the updated purchase order"*; changes are polled (S4) | No PO-change/revision ingestion; `under_review` is Mercenta-internal | **INCOMPLETE** (`AV-024`) |
| Receiving status + received quantity are documented per PO item (`receivingStatus`) (S5) | `receivedQty` exists; "the retail channel's receiving system actually logged" | **CONFIRMED concept** (`AV-018`); the automatic shortage-deduction arithmetic is a `MERCENTA RULE` |
| Acknowledgement submission can be verified via Vendor Central or the Transaction Status API; a 30-minute appearance expectation is stated (S2) | Not modelled | `INFORMATIONAL` (`AV-011`) |

---

## 9. LOGISTICS / SUPPLY FINDINGS

| Amazon behaviour (evidence) | Mercenta today | Classification |
|---|---|---|
| Freight term decides the window type — Collect/WePay ⇒ **ship window**; vendor-paid ⇒ **delivery window** (S3, S7) | Implemented exactly: `FreightTerm = 'collect' \| 'prepaid'`, `shipWindowStart/End`, `deliveryWindowStart/End` | **CONFIRMED** (`AV-012`) |
| `SubmitShipments` is for **WePay (Collect)** vendors, NA + EU, **standard pallets only** (S7) | Modelled as "collect ⇒ routing request required" | **CONFIRMED** direction; the "standard pallets only" constraint is not modelled |
| The **PO must be confirmed** before a shipment request — *"Unconfirmed purchase orders cause the request to fail"* (S7) | Shipment creation is PO-gated in Mercenta (PO must exist / be eligible) | **CONFIRMED** (`AV-014b`) — Mercenta's gate matches the documented dependency |
| `requestedPickUp` must be **≥ 2 business days after the current date** (S7) | Not modelled; Mercenta has a business-day helper used for a *different* (unverified) deadline | **INCOMPLETE** (`AV-014`) |
| Routing instructions are returned by `GetShipmentDetails`; **carrier assignment happens the same day as pickup or one day prior** (S8) | Not modelled | **INCOMPLETE** (`AV-014`) |
| **"Routing Request due by 10am Pacific the day before the ship window closes"** | Encoded in `src/types.ts` (comment), `src/components/shared/RoutingRequest.tsx` (`getRoutingRequestDeadline` → 17:00 UTC = 10:00 PST), `src/config/tours/tourDefinitions.ts`, e2e `shipment-asn.spec.ts` #3 | **UNKNOWN — NOT ESTABLISHED BY THE RESEARCH** (`AV-013`) |
| ASN must reach Amazon **before** the product is received at the FC; missing/delayed ASNs ⇒ **chargebacks** (S9) | ASN exists with cartons; lot + expiry required for regulated Grocery (e2e #6). The **"before receipt" ordering rule** is not enforced or labelled | **INCOMPLETE** (`AV-015`) |
| ASN content: PO number, ship date, EDD, lot, expiry, **SSCC**; carton + pallet structure; ≤100 confirmations per FTL/LTL (S9) | Cartons + lot/expiry modelled; **no SSCC, no pallet-level ASN structure, no count limit** | **INCOMPLETE** (`AV-016`) |
| Delivery to an FC is **appointment-based**; CRDD must fall in the PO's delivery window; delivery-window compliance affects shipper/carrier performance (S15) | No appointment concept; `deliveryWindowEnd` is displayed as "Deliver by" | **INCOMPLETE** (`AV-045`) — Phase 3 relevant |
| PO names its destination FC (`shipToParty.partyId`); FC filter on PO status (S5) | Destination modelled via a **static 22-entry** `DEFAULT_UK_FC_LIST` + `FcSelector` *(the unreachable `FcSelector` component was removed on 2026-09-21; the list itself remains canonical data — see the POST-REGISTER CHANGE note in `docs/AMAZON_VENDOR_DISCREPANCY_REGISTER_2026-09-20.md`)* | **INFERENCE** — the list is Mercenta convenience data; the authoritative source is the PO itself (`AV-017`) |
| Direct brand facility → Amazon FC as the shipment origin | Mercenta's default launch supply route is direct-to-destination; **no Amazon rule requires or forbids it** | **MERCENTA RULE** (`AV-026`) — correctly a design choice |
| A mandatory Mercenta UK hub stage (`mercenta_hub`, plus `bak_depot`, `uk_port_hmrc`) inside the shipment stage list | Exists as an internal milestone pipeline; **contradicts** the "direct where feasible" default | **MERCENTA RULE / internal inconsistency** (`AV-027`) — not an Amazon requirement |
| A `<14 days` end-to-end target | **Not found in source.** `ukMarketFit.ts` declares *supplied* lead-time bands (30/90 days) labelled as Mercenta bars | **MERCENTA RULE** (`AV-028`); the "<14 days" figure appears only in handoff narrative, not code |
| Backorder restock "visibility lost after 30 days" (`backorderRestockDeadline`, `src/types.ts` + `src/data/api.ts`) | Implemented as a 30-day countdown | **UNSUPPORTED / UNKNOWN** (`AV-020b`) — not established by any Amazon source reached |

---

## 10. SUPPLIER PERFORMANCE FINDINGS

| Concept | Evidence | Mercenta | Classification |
|---|---|---|---|
| Chargebacks exist for missing/delayed ASNs and freight refusals | **Documented** (S9) | Mercenta models a deduction ledger with 9 types | Concept **CONFIRMED**; taxonomy **UNSUPPORTED** |
| Deduction/chargeback taxonomy: `late_shipment`, `shortage_claim`, `mislabeled_carton`, `non_compliance_fine`, `co_op`, `return_charge`, `unfilled_by_cancel_date`, `po_on_time_accuracy`, `other` (`src/types.ts`) | **Not established** by any Amazon source reached (Vendor Central help gated; no public API) | Implemented as a canonical enum | **UNSUPPORTED as "Amazon codes"** → must be labelled a Mercenta working taxonomy (`AV-019`) |
| Delivery-window compliance tracked against shipper *and* carrier performance | **Documented** (Carrier Central strings, S15) | Not modelled | `INFORMATIONAL` / Phase 3 |
| Carrier Controllable FPY eligibility threshold | **Documented as existing** (Carrier Central strings, S15) | Not modelled | `INFORMATIONAL` |
| Vendor performance scorecard (fill rate / on-time / defects) and its consequences | **Not publicly documented**; no SP-API endpoint (S14) | `postmarkNotifier.ts` tells brands a missed ack *"could affect your vendor performance rating"* | **INFERENCE, must be labelled** (`AV-003`) |
| Deduction dispute window "typically 14 days" (`tourDefinitions.ts`, `DeductionsLedger.tsx`) | **Not established** (S2/S3/S9/S11 state no dispute window) | Presented as guidance | **UNSUPPORTED** (`AV-019b`) |
| Chargeback Indemnity agreement (§4.2) between brand and Mercenta | No Amazon source | Internal contract | **MERCENTA RULE** — legitimate |

---

## 11. CATALOGUE FINDINGS

| Requirement | True owner (evidence) | Mercenta attribution today | Classification |
|---|---|---|---|
| Product identifiers (UPC/EAN/GTIN) | Amazon catalogue requirement, programme-wide; **no Vendor catalogue API in the public index** (S14) | `Product.barcode` → `gtin` in `transform.ts` | **INFERENCE** — verify the Vendor submission route (`AV-035`) |
| Category-specific documents: UKCA (product safety), CPNP/SCNP (cosmetics), WEEE, food-contact, EN 71/EN 1888, food safety (HACCP/BRC), textile labelling, type approval | **UK/EU law and food-safety regulation**, not Amazon rules | `src/lib/compliance.ts` header: *"Amazon UK requires different compliance documents…"*; `src/data/demoData.ts`: *"per Amazon UK requirements"*; `CATEGORY_SPECIFIC_DOCUMENTS` header: *"based on Amazon UK marketplace rules"* | **CONTRADICTED (attribution)** (`AV-031`) — the mapping may be sound; the *attribution* is wrong |
| Brand Registry Confirmation as a required vendor document | Amazon Brand Registry is a **seller/brand-owner** programme | Base required document for every brand | **UNSUPPORTED / seller-shaped** (`AV-032`) |
| Letter of Authorization as a base document | No Amazon source | Base required document | **MERCENTA RULE** — keep |
| Amazon listing image specs (white background, 85% fill, ≥1000 px) | Amazon **listing**/product-side requirements — not verified this session | `src/lib/amazon/productImageValidator.ts` says *"Amazon's requirements"* | **INFERENCE, source not verified this session** (`AV-033`) |
| Case/unit vocabulary in ASN + invoice payloads (`Cases`, `Eaches`, `unitSize`) | **Documented** (S9, S11) | Mercenta separates case pack / master carton / PO qty / shipment qty | **CONFIRMED as a useful, Amazon-compatible distinction** (`AV-029`) |
| The ten approved Amazon UK categories (`APPROVED_CATEGORIES`) | Not an Amazon-published list; category eligibility is a Mercenta commercial-scope constraint | Declared once in `src/types.ts`, consumed via `isApprovedCategory` | **MERCENTA RULE** — correct, but must never be stated as an Amazon rule (`AV-036`) |
| Pack-math rule (`units_per_master_carton = case_pack × cases_per_carton`) via `PACK_MATHS_RULE` / `PackProfile` | No Amazon source; consistent with general logistics | Implemented + validated | **MERCENTA RULE / logistics concept** (`AV-029`) |

---

## 12. COMMERCIAL FINDINGS

| Mercenta concept | Amazon concept? | Classification |
|---|---|---|
| **Model A — commission/agent** and **Model B — buy/resell/distribution** (`src/config/commercialModel.ts`) | **No Amazon concept exists for either**; Amazon buys from the vendor at the PO's `netCost`/`listPrice`. Amazon neither endorses nor constrains Mercenta's internal commercial model. | **MERCENTA RULE** (`AV-037`) — correct as internal architecture; must never be described as Amazon-blessed |
| Wholesale cost / expected UK retail / unit economics (`COMMERCIAL_TERM_FIELDS`) | Amazon publishes `netCost`/`listPrice` per PO line but **no pricing formula** | **MERCENTA RULE** — no fictional Amazon pricing formula was found in the repository ✅ |
| Six commercial thresholds all `value: null, configured: false` → fail-closed to `human_review` | No Amazon equivalent | **MERCENTA RULE** — exemplary fail-closed design |
| `PO_QUANTITY_IS_NOT_DERIVED_FROM_MOQ`, `CHANNEL_WILL_HONOUR_MOQ_IS_UNSUPPORTED`, `MOQ_HONOUR_DISCLAIMER` | Amazon publishes no MOQ concept at all | **MERCENTA RULE** — correctly prevents an invented Amazon MOQ rule |
| Value basis (`actual/observed/calculated/estimated/assumed/unknown`) with `supportsReady: false` for assumed/unknown | No Amazon equivalent | **MERCENTA RULE** — strong evidence discipline |
| VAT: `VAT_TREATMENT_CONFIGURED = false`, `DEMO_VAT_ILLUSTRATION` (20%, labelled) | Amazon **does** require tax details on invoices (S11: `taxDetails`; bill-to must match the Amazon Payee system). The *production* treatment is a UK tax/accounting decision, not an Amazon rule. | **MERCENTA RULE + UK LAW** (`AV-038`) — correctly fail-closed and labelled |
| Shipping commercial terms (`SHIPPING_COMMERCIAL_TERMS`, `placeholder: true`) | No Amazon source. Note: the **collect** lane is Amazon-paid freight, so Mercenta's carrier-cost/margin model applies to **prepaid** lanes | **MERCENTA RULE** — one nuance: on a *collect* PO the carrier is Amazon's (`AMAZON_PARTNERED_CARRIER` exists in `shipping.ts`), so no shipping margin is earned there (`AV-039`) |
| Mercenta carrier rule (international → DHL; UK domestic → Palletline) | No Amazon rule requires a specific carrier; Amazon's collect lanes use Amazon's own carriers | **MERCENTA RULE** — correct; must not be presented as an Amazon requirement |
| PO → invoice → payment → reconciliation → Xero → payout proposal → human approval → Wise | Amazon documents invoice submission/matching, and that API invoicing requires **parallel testing with Amazon AP** (S11); it documents **no** remittance/payout rail and exposes **no** vendor payments API (S14) | The chain is **MERCENTA's internal finance architecture** (`AV-021`) — correctly Mercenta's own |

---

## 13. INVOICE / PAYMENT FINDINGS

| Documented Amazon rule (S11) | Mercenta today | Classification |
|---|---|---|
| Invoice numbers must be unique and **never reused** | Not modelled (no invoice-number registry in the PO/invoice types) | **INCOMPLETE** (`AV-022`) |
| A zero-value invoice **fails** | Not modelled | `INFORMATIONAL` |
| Wrong invoice data ⇒ Amazon **cancels** the invoice; re-send with a **new Invoice ID** | Not modelled | **INCOMPLETE** (`AV-022`) |
| API invoice correction mirroring a correct Vendor Central invoice must reuse the **same Invoice ID** | Not modelled | `INFORMATIONAL` |
| `billToParty` address must match the Amazon **Payee system** exactly | Not modelled (no bill-to / remit-to entity concept exists) | **INCOMPLETE** (`AV-022`, `AV-035`) |
| API invoicing requires **parallel testing with Amazon AP** before payments process | Not modelled; absent from the activation checklist | **INCOMPLETE — activation-relevant** (`AV-022`) |
| Credit notes handle returns / pricing corrections / allowances | `Deduction` + dispute flow exist conceptually; no credit-note document | `INFORMATIONAL` |
| Acknowledgement cost price must equal the invoiced unit cost (S2) | No enforced link between `acknowledgedUnitPrice` and any invoice | **INCOMPLETE** (`AV-008`, `AV-023`) |
| No public vendor payments/remittance API (S14) | Mercenta's Xero→Wise payout chain is internal — correct | **CONFIRMED design choice** (`AV-021`) |

---

## 14. CASE / DISPUTE FINDINGS

| Evidence | Mercenta | Classification |
|---|---|---|
| Amazon documents **Vendor Central support cases** (e.g. *"submit a support case in Vendor Central… Select Support, then Contact Us, and then API Integration"*, S2/S7) | `CaseEscalationState` implements `brand_submitted → under_mercenta_review → awaiting_brand_info → approved_for_escalation → escalated_to_provider → provider_responded` | The **mercenta-first review gate is a MERCENTA RULE**; the existence of a vendor support channel is **CONFIRMED** (`AV-041`) |
| No public documentation found for a **deduction/chargeback dispute** process or its window | Dispute flow with a "typically 14 days" window and `won/lost/partial` outcomes | **UNSUPPORTED as Amazon policy** (`AV-019b`) — keep as Mercenta process, relabel the window |
| Idempotent escalation + duplicate-case prevention | Implemented (canonical model §Cases) | **MERCENTA RULE** — good practice; not an Amazon requirement |

---

## 15. API / SP-API FINDINGS

| Finding | Evidence | Implication for Mercenta |
|---|---|---|
| Vendor APIs are **"Vendors only"**, with **Static** sandbox for orders/invoices/shipments and **Dynamic** for transaction status | S1, S6, S10, S12 | Live activation is a credential + registration step; the mock-first seam is the right design |
| Public Vendor endpoints: `getPurchaseOrders`, `getPurchaseOrder`, `submitAcknowledgement`, `getPurchaseOrdersStatus`, `submitInvoices`, `SubmitShipments`, `GetShipmentDetails`, `GetShipmentLabels` (NA), `SubmitShipmentConfirmations`, `getTransaction` | S1–S12 | Mercenta's SP-API seam currently exposes only four methods — `submitCatalogItem`, `getSubmissionStatus`, `fetchPurchaseOrders`, `confirmShipment` (`src/lib/spapi/client.ts`, `mockClient.ts`). The **acknowledgement, invoice, shipment-request/ASN and transaction-status** operations are **not** modelled (`AV-040`) |
| **No** public Vendor catalogue/item API; **no** vendor payments/deductions/chargebacks/performance API | S14 | `transformProductForCatalog` has **no documented Vendor target** (`AV-035`); the deduction/chargeback ledger can never be reconciled from an Amazon API — it must be **human/statement-driven** (`AV-021`) |
| Regions for the Vendor APIs are **NA, EU, FE**; UK = EU store | S1, S6, S13 | A single UK/EU integration is the right scope; no multi-marketplace architecture is justified |
| Amazon requires the PO to be confirmed first: *"Unconfirmed purchase orders cause the request to fail"* (S7) | S7 | Confirms the correctness of Mercenta's PO-gated shipment creation |
| `marketplaceId` used in `transform.ts` (`A1F83G8C2ARO7P`) | Not verifiable this session (Amazon page 404) | `AV-034` — verify before live activation |

---

## 16. SIMULATION FINDINGS

`src/lib/simulation/scenarioEngine.ts` declares nine scenarios: `NORMAL_PO`, `PARTIAL_PO`,
`DELAYED_DELIVERY`, `FINANCIAL_EXCEPTION`, `CASE`, `PRODUCT_FAILURE`, `INTEGRATION_FAILURE`,
`SHIPMENT_PROGRESSION`, `COMPLIANCE_VERIFICATION`.

| Aspect | Assessment |
|---|---|
| Labelling | The engine requires `getMode` and defaults to `'unknown'`; `assertSimulationOnly` refuses unless every required provider is **positively** simulation-safe, with the comment *"§Phase 4 — UNKNOWN ≠ SIMULATION."* → **CONFIRMED, exemplary** |
| Determinism | `deriveId(runId, …)` — deterministic, no randomness → **CONFIRMED** |
| Zero live calls | The commercial-readiness validator asserts `networkCalls=0` → **CONFIRMED for that validator**; the scenario engine's refusal gate is the equivalent control |
| Scenario realism vs Amazon facts | `NORMAL_PO`/`PARTIAL_PO` reproduce the ack/partial-ack lifecycle, which is **evidence-aligned**; but the scenarios **inherit** the unverified `AV-013` routing deadline and the unlabelled `AV-003` performance-rating consequence. **Scenario semantics therefore propagate unsupported assumptions** → `AV-044` |
| `PARTIAL_PO` naming | Amazon's vocabulary is `PARTIALLY_ACCEPTED` (`itemConfirmationStatus`) with per-line acknowledgements — the concept aligns, the *label* differs (`AV-043`) |
| Integration-mode vocabulary | Mercenta: `simulation / configured / live / degraded / error / unknown-or-not_registered` with `isProviderSimulationSafe`. Amazon uses `Availability: Vendors only` and `Sandbox: Static/Dynamic` — **different vocabularies for different things**; no conflict, and Mercenta's fail-closed rule is the safer one → **CONFIRMED** |

---

## 17. PHASE 1 IMPACT

Phase 1 artifacts audited: `src/config/ukMarketFit.ts` (three indicators, declared thresholds,
pre-audit fields), `PreAuditAssessment`/`SupplyProfile` types, `src/lib/preaudit/*`,
`src/components/marketing/ExploreUkMarketFit.tsx`, `e2e/uk-market-fit.spec.ts`.

**Findings:** Phase 1 encodes **no claim about Amazon rules**. Its indicators are explicitly
qualitative and its thresholds are declared as *Mercenta bars* (`reviewTractionFloor`,
`lowFrictionMoq`, `shortLeadTimeDays: 30`, `longLeadTimeDays: 90`, `workableMarginPct`). The
`supply_replenishment_viability` indicator *"must not claim … a universal maximum lead time, or any
lead time that was not supplied"*; `commercial_opportunity` *"must not claim … a margin, a landed
cost or a profit figure that has not been supplied or derived from a real number."*

**Result: NO contradiction with the Amazon evidence found. No Phase 1 assumption is invalidated.**
The only Phase-1-adjacent items needing a label are the shared compliance attributions (`AV-031`,
`AV-032`), which live in `src/lib/compliance.ts` / `demoData.ts` and feed the compliance gate rather
than Phase 1's assessment engine.

## 18. PHASE 2 IMPACT

Phase 2 artifacts audited: `src/config/commercialReadiness.ts`, `src/lib/commercial/*`
(`commercialGate.ts`, `economics.ts`, `commercialReadinessRecorder.ts`, `brandGuidance.ts`),
`src/data/commercialReadinessStore.ts`, `src/components/brand/CommercialReadiness.tsx`,
`src/components/admin/FounderControlCentre.tsx`, the Phase 2 registry rows and
`docs/SPRINT_PHASE2_COMMERCIAL_READINESS_2026-09-20.md`.

**Findings:**

- The seven pack concepts, the pack-maths rule, the value-basis model, the UNSET thresholds and the
  fail-closed routing are **all Mercenta rules or logistics concepts** — **no Amazon-rule claim is
  made anywhere in Phase 2**, so no Phase 2 assumption is contradicted.
- Two items are **shared** with the Vendor domain and need reconciliation *before* Phase 3 consumes
  them: the compliance attribution (`AV-031`/`AV-032`) and the freight/window model Phase 3 will
  build on (`AV-012` confirmed, `AV-013` unverified).
- `maximum_planning_lead_time_days` is deliberately unset with the note *"a universal lead-time rule
  must not be invented (Phase 3 owns this)"* — **exactly right**, and still correct after the
  research: Amazon documents **no** universal lead time.

**Result: no Phase 2 work is invalidated. Phase 2 correctly hands Phase 3 an evidence-honest basis.**

---

## 19. EXISTING MERCENTA AUDIT — INVENTORY OF VENDOR-BEARING CODE

| Area | Files inspected | Vendor-rule claims found |
|---|---|---|
| Canonical types | `src/types.ts` — `FreightTerm`, `PurchaseOrderStatus`, `LineAckStatus`, `PO_REJECTION_CODES`, `AckHistoryEntry`, `Deduction*`, `APPROVED_CATEGORIES`, `DEFAULT_UK_FC_LIST`, `ShipmentStage`, `CaseEscalationState` | "Real Vendor Central rejection reason codes"; "a real Vendor Central rule" (§Stage-24); the `shipWindowEnd` comment = the unverified 10am rule; the 30-day backorder rule |
| Config | `commercial.ts`, `commercialModel.ts`, `commercialReadiness.ts`, `routing.ts`, `shipping.ts`, `ukMarketFit.ts`, `vat.ts` | None claim an Amazon rule; Model A/B, pack concepts, thresholds, carriers are explicitly Mercenta's |
| Data | `demoData.ts`, `api.ts`, `domainRepository.ts` | `demoData.ts`: *"Category-specific extra compliance docs per Amazon UK requirements"* (mis-attribution) |
| Domain libs | `src/lib/compliance.ts` | Header + `CATEGORY_SPECIFIC_DOCUMENTS` attribute UK law to Amazon |
| Amazon libs | `src/lib/amazon/productImageValidator.ts` | *"Amazon's requirements"* (listing rules; source unverified this session) |
| SP-API seam | `src/lib/spapi/{client,mockClient,index,transform}.ts` | Correctly hedged; four methods only |
| Simulation | `src/lib/simulation/scenarioEngine.ts`, `investorDemo.ts` | Inherit the ack/routing assumptions |
| Presentation | `src/lib/statusPresentation.ts` | *"The 24-hour acknowledgement window is a REAL Vendor Central rule"* — **true** |
| Notifications | `src/lib/notifications/postmarkNotifier.ts` | *"forced cancellation … could affect your vendor performance rating"* — unlabelled inference |
| Components | `RoutingRequest.tsx` (10am Pacific), `BrandPurchaseOrders.tsx` (24h + routing + 30-day restock), `BrandDashboard.tsx`, `DeductionsLedger.tsx` (14-day window), `OnboardingWizard.tsx` ("Direct Fulfillment" wording), 3 marketing components + `TermsOfService.tsx` (24h) | Two attributions to review (`AV-013`, `AV-025`); one unsupported window (`AV-019b`) |
| Integrations | `src/integrations/registry.ts`, `types.ts` (`isProviderSimulationSafe`) | Fail-closed, correct |
| Tests | `e2e/po-lifecycle.spec.ts` (6 cases), `e2e/shipment-asn.spec.ts` (7 cases incl. routing-request and collect/prepaid), `e2e/deductions.spec.ts`, `e2e/disputes.spec.ts`, `e2e/compliance-gate.spec.ts`, `e2e/uk-market-fit.spec.ts`, `e2e/commercial-readiness.spec.ts` | Tests assert Mercenta behaviour; `shipment-asn` #3 asserts the **unverified** routing-request indicator |
| Validators | `scripts/validate-commercial-readiness.mjs` (78 assertions), `scripts/lint-wording.mjs`, `scripts/verify-registry.mjs`, `scripts/validate-uk-market-fit.mjs`, `scripts/validate-routing-gateways.mjs` | No validator asserts an Amazon rule as fact |
| Registry | `requirements-registry.json` — 27 entries matching `amazon\|vendor` | See §26 |
| Docs | `MERCENTA_PRODUCT_CONTRACT.md` §3.1, `MASTER_CHATGPT_HANDOFF.md` §5–§7 & §29.3, `PROJECT_STATUS.md`, `HANDOFF.md` | The prior handoff **correctly anticipated this audit** |

**Notable:** `MASTER_CHATGPT_HANDOFF.md` §5.1 already says the 24-hour rule and rejection-code list
*"must not be upgraded to \"Amazon publishes exactly this\""* and records the routing-request note as
a *"§Vendor-Central deep-dive"* interpretation — while the source code comments label the 24h rule
*"a real Vendor Central rule"*. **The research resolves this:** the 24h rule and the rejection codes
are **genuinely Amazon-documented** (so the code comment is correct), whereas the routing-request
deadline remains **unverified** (so the handoff's caution was right about that one).

---

## 20. DISCREPANCY REGISTER

The full register (Affected Files, Affected Requirements, Business Impact, Recommended Action,
Priority and Confidence per item) is in the companion artifact:

➡ **`docs/AMAZON_VENDOR_DISCREPANCY_REGISTER_2026-09-20.md`** — items `AV-001` … `AV-048`.

**Summary counts (52 findings — `AV-001`…`AV-048` including the lettered sub-items `AV-010b`,
`AV-014b`, `AV-019b`, `AV-020b`; each finding carries exactly ONE classification)**

| Classification | Count | Items |
|---|---|---|
| CONFIRMED | 7 | AV-001, AV-004, AV-005, AV-012, AV-014b, AV-021, AV-029 |
| MERCENTA RULE | 9 | AV-018, AV-026, AV-028, AV-030, AV-036, AV-037, AV-038, AV-039, AV-041 |
| CONTRADICTED | 3 | AV-013, AV-027, AV-031 |
| UNSUPPORTED | 6 | AV-003, AV-010, AV-019, AV-019b, AV-020b, AV-032 |
| INCOMPLETE | 16 | AV-006, AV-007, AV-008, AV-009, AV-010b, AV-011, AV-014, AV-015, AV-016, AV-022, AV-023, AV-024, AV-040, AV-042, AV-043, AV-045 |
| INFERENCE | 5 | AV-002, AV-017, AV-025, AV-033, AV-044 |
| UNKNOWN | 6 | AV-020, AV-034, AV-035, AV-046, AV-047, AV-048 |
| **Total** | **52** | |

---

## 21. UNSUPPORTED-ASSUMPTION REGISTER

Assumptions currently treated as, or stated like, Amazon rules **without** supporting evidence:

| ID | Assumption | Where | Correct classification |
|---|---|---|---|
| AV-013 | Routing Request due 10am Pacific the day before the ship window closes | `src/types.ts:1089-1090,1129`; `RoutingRequest.tsx:2-6,70-72,135-142`; `tourDefinitions.ts`; `e2e/shipment-asn.spec.ts` #3 | `UNKNOWN` — reclassify to a Mercenta operational target, or remove until Amazon confirms |
| AV-019 | The nine `DeductionType` values are Amazon chargeback codes | `src/types.ts:1045-1054` | Mercenta working taxonomy pending Vendor Central report evidence |
| AV-019b | A deduction dispute window of "typically 14 days" | `tourDefinitions.ts:306`; `DeductionsLedger.tsx:252` | Mercenta service standard, not an Amazon window |
| AV-020b | Backordered items lose visibility after 30 days without restock | `src/types.ts:1170-1174`; `src/data/api.ts:881-885` | `UNKNOWN` — needs Amazon evidence |
| AV-003 | A missed acknowledgement "could affect your vendor performance rating" | `postmarkNotifier.ts:141,161` | Reasonable inference; label as a possibility, not a stated Amazon consequence |
| AV-032 | Brand Registry Confirmation is required for Vendor onboarding | `src/lib/compliance.ts` `BASE_REQUIRED_DOCUMENTS`; `demoData.ts` | Seller-programme concept — remove or reclassify as a Mercenta control |
| AV-010 | Backorder accepted unconditionally | PO acknowledgement flow | Amazon gates this behind `isBackOrderAllowed` (documented) |

---

## 22. UNKNOWN REGISTER

| ID | Question | Status |
|---|---|---|
| AV-020 | Amazon's Vendor **performance scorecard** definitions (fill rate, on-time, defect rates) and their consequences | `UNKNOWN — NOT ESTABLISHED BY THE RESEARCH` (Vendor Central help gated; no API) |
| AV-034 | The Amazon **UK marketplace ID** used in `transform.ts` (`A1F83G8C2ARO7P`) | `UNKNOWN` in this session (Amazon's marketplace-ID page 404'd) |
| AV-035 | Whether Amazon exposes any **Vendor catalogue/product submission** route at all (no Vendor catalogue API in the public index) | `UNKNOWN` — needs Amazon evidence or the live Vendor Central UI |
| AV-046 | Any **marketplace-specific** Vendor rule difference beyond the documented table (§6) | `UNKNOWN` — none stated for the UK |
| AV-047 | Amazon's **receiving tolerances** (over/under-shipment allowances at an FC) | `UNKNOWN` — never invent; must come from Vendor Central reporting if needed |
| AV-048 | Whether a Vendor Central **routing-request UI deadline** exists at all (distinct from the API's 2-business-day pickup rule) | `UNKNOWN` — Vendor Central help is sign-in gated |

---

## 23. "WHAT WE GOT WRONG"

**A. Definitely wrong (a Mercenta statement contradicts the evidence or mis-attributes a rule)**

1. **Compliance documents attributed to Amazon.** `src/lib/compliance.ts` (module header +
   `CATEGORY_SPECIFIC_DOCUMENTS` header) and `src/data/demoData.ts` (`CATEGORY_EXTRA_DOCS` comment)
   present UK/EU **legal/regulatory** obligations (UKCA, CPNP/SCNP, WEEE, food-contact, EN 71/1888,
   HACCP/BRC, textile labelling, type approval) as *"Amazon UK requirements"* / *"Amazon UK
   marketplace rules"*. They are not Amazon rules. (`AV-031`)
2. **The 10am Pacific routing-request rule** is asserted as a Vendor Central behaviour in
   `RoutingRequest.tsx` (*"the vendor must submit a Routing Request by 10am Pacific time the day
   before the ship window closes"*), in `src/types.ts` (*"Routing Request due by 10am Pacific day
   before this closes"*) and in a user-facing tour. No Amazon source in this research states it.
   (`AV-013`)
3. **A mandatory `mercenta_hub` (plus `bak_depot` / `uk_port_hmrc`) stage** in the canonical
   `ShipmentStage` pipeline directly contradicts Mercenta's own declared default launch route
   (*direct facility → Amazon destination where feasible*). It is an internal milestone model that
   reads as if UK hub-routing were required. (`AV-027`)

**B. Unsupported by evidence (not necessarily wrong — but not evidenced)**

4. The nine-value `DeductionType` taxonomy presented as real chargeback codes (`AV-019`).
5. The "typically 14 days" deduction-dispute window (`AV-019b`).
6. The 30-day backorder visibility rule (`AV-020b`).
7. `brand_registry_confirmation` as a mandatory vendor document (`AV-032`).
8. Unconditional backorder support, ignoring `isBackOrderAllowed` (`AV-010`).

**C. Reasonable inference that should be labelled**

9. *"…may be subject to forced cancellation and could affect your vendor performance rating"*
   (`postmarkNotifier.ts`) — the 24h limit is documented; the specific consequences are not stated
   in that form. (`AV-002`, `AV-003`)
10. *"Direct Fulfillment"* used in Mercenta UI/agreements for an internal concept while **Vendor
    Direct Fulfillment** is a distinct Amazon programme (`AV-025`).
11. The marketplace-ID constant and the Amazon listing-image numeric thresholds (`AV-034`,
    `AV-033`).

**D. Correct and supported** — see §24.

**E. Valid Mercenta business rule** — Model A/B, pack concepts, thresholds, carriers, the compliance
gate itself, the case-review gate, admin override + audit, tenant isolation, the ten approved
categories, `<14 days` (a Mercenta target), MOQ disclaimers, fail-closed integration modes.

**F. Still unknown** — vendor performance scorecards, receiving tolerances, dispute windows, any
UK-specific Vendor rule beyond the documented table, whether a Vendor catalogue API exists.

**Where nothing was found wrong:** Phase 1 (`ukMarketFit`) and Phase 2 (`commercialReadiness`) encode
**no Amazon rule claims** and are **not invalidated** by this research (§17, §18). The 24-hour
acknowledgement rule, the rejection codes, the freight-term/window mapping and the PO-gated shipment
rule were all **confirmed correct**.

---

## 24. "WHAT WE GOT RIGHT"

1. **The 24-hour acknowledgement rule is real and correctly implemented** (`AV-001`), including
   line-level acknowledgement (`AV-005`) and the verbatim rejection codes (`AV-004`).
2. **The freight-term → window-type model is correct** — `collect` ⇒ ship window; `prepaid` ⇒
   delivery window (`AV-012`), matching Amazon's own `Collect`/WePay wording.
3. **Shipment creation is PO-gated**, mirroring Amazon's documented precondition (*"Unconfirmed
   purchase orders cause the request to fail"*) (`AV-014b`).
4. **Mock-first with a fail-closed provider gate** — `isProviderSimulationSafe`, *"UNKNOWN ≠
   SIMULATION"* — is the right architecture for Amazon's *"Vendors only"*, sandbox-gated APIs.
5. **The internal money chain is correctly internal** — Xero is reconciliation, **Payoneer is the default
   rail (Founder decision T-1; Wise secondary)**, human approval is mandatory. No public Amazon API exists for vendor payments/remittance, so
   it cannot and should not be represented as an Amazon process (`AV-021`).
6. **The commercial architecture (Model A/B) is correctly Mercenta's own** and never claimed as an
   Amazon concept; likewise the carrier rule, the pack concepts and the MOQ disclaimers
   (`AV-026`, `AV-037`, `AV-039`).
7. **The direct-supply concept is presented as a Mercenta design choice**, not as Amazon policy
   (`AV-026`) — which is exactly right: Amazon documents no such requirement.
8. **Evidence discipline already exists in the code**: `CommercialValueBasis`, `supportsReady:
   false` for assumed/unknown, "never judged against an invented limit", and
   `CHANNEL_WILL_HONOUR_MOQ_IS_UNSUPPORTED`.
9. **The Amazon wording safeguards** (`AMAZON_PROGRAMME_STATUS = 'not_confirmed_with_amazon'`,
   `AMAZON_TOS_VERIFICATION_REQUIRED = true`, the banned-claim list) are a genuine compliance control
   consistent with the project's M12 policy — with one coverage gap noted in `AV-042`.
10. **Vendor/Seller separation is respected in substance**: no FBA replenishment, no Seller Central
    inventory model, no PO-splitting assumption. Only the naming/attribution items in §7 need work.

---

## 25. DOCUMENTATION CONTRADICTIONS

| # | Contradiction | Documents involved | Evidence-based resolution (proposed, NOT applied) |
|---|---|---|---|
| D1 | The 24h rule is called *"a real Vendor Central rule"* in code but the prior handoff says it *"must not be upgraded to 'Amazon publishes exactly this'"* | `src/types.ts:1117`, `BrandPurchaseOrders.tsx:220`, `statusPresentation.ts:574` vs `MASTER_CHATGPT_HANDOFF.md` §5.1 | **The code is right.** Amazon's own docs state the 24-hour requirement verbatim (S2). The handoff's caution is now resolved in favour of the code. |
| D2 | The routing-request 10am rule is stated as fact in code/UI/tour but the handoff records it as an unverified *"deep-dive"* interpretation | `types.ts:1089`, `RoutingRequest.tsx:2-6`, `tourDefinitions.ts` vs `MASTER_CHATGPT_HANDOFF.md` §5.1 | **The handoff is right.** Reclassify as unverified (`AV-013`). |
| D3 | Compliance docs described as *"Amazon UK requirements"* in code/comments, while `MERCENTA_PRODUCT_CONTRACT.md` §13/§14 and `MERCENTA_BUSINESS_MODEL.md` correctly treat them as regulatory/contractual | `src/lib/compliance.ts`, `demoData.ts` vs `docs/*` | **The docs are right.** Re-attribute to UK/EU law (`AV-031`, `AV-032`). |
| D4 | `MERCENTA_PRODUCT_CONTRACT.md` §3.3 lists the shipment stages as `factory_intake → bak_depot → international_forwarding → uk_port_hmrc → mercenta_hub → live_amazon` while the same contract's supply doctrine and `MASTER_CHATGPT_HANDOFF.md` §28.1#16 make **direct origin → destination** the default | `docs/MERCENTA_PRODUCT_CONTRACT.md` §3.3 vs §1 + handoff §28.1/§30 | **Internal conflict** (`AV-027`) — already listed as unresolved question #2 in `MASTER_CHATGPT_HANDOFF.md` §29.3. |
| D5 | `PROJECT_STATUS.md` roadmap item 1 says Phase 3 *"hands it a READY product"* while §29.3 of the handoff lists 8 unresolved open questions | `PROJECT_STATUS.md` vs `MASTER_CHATGPT_HANDOFF.md` §29.3 | Both can be true; this audit reduces the open set (see §27) and should be recorded as the reconciliation of that list. |
| D6 | `DeductionType` values are labelled *"Real Vendor Central rejection reason codes"*-adjacent (presented next to real codes) with no evidence of the deduction names | `src/types.ts` §19.1 vs §Stage-24 | Label the deduction list as a Mercenta taxonomy (`AV-019`). |
| D7 | `docs/INTEGRATIONS.md` says SP-API is *"Core PO/catalog/invoicing"* — accurate for PO, but there is **no Vendor catalogue API** and no vendor-payments API in the public surface | `docs/INTEGRATIONS.md:18` vs S14 | Tighten the wording when the docs are next edited (`AV-035`). |
| D8 | The public marketing copy says *"Acknowledge POs within 24 hours per retail network requirements"* | `HowItWorks.tsx:27`, `FAQ.tsx:10`, `TermsOfService.tsx:36` | **Supported** — no contradiction; it is the correct documented rule stated neutrally. |

---

## 26. MASTER MATRIX IMPACT (proposed reconciliation ONLY — registry untouched)

27 of the 349 registry entries match `amazon|vendor`. Impact assessment:

| Requirement id | Status today | Vendor-assumption impact | Proposed action (NOT applied) |
|---|---|---|---|
| `batch14-fc-selector` | built | Description says *"Pre-saved Amazon UK FCs"* — the 22-entry list is **Mercenta convenience data**, not an Amazon-published directory | Reword to "Mercenta-maintained UK destination list; the authoritative destination is the PO's `shipToParty`" (`AV-017`) |
| `stage1-oauth-*` (3 rows) | built / built_and_tested | Amazon OAuth/SP-API activation; unaffected by this research except the "Vendors only / sandbox" facts | Add the documented availability note (`AV-040`) |
| `amazon-ads-*` (2) | built_and_tested | Amazon **Ads** is a separate Amazon API surface; not part of Vendor Retail Procurement | Leave; note Ads is not a Vendor procurement capability |
| `workstreamB*` / `workstreamBD-marketplace-fit` (3) | built / built_and_tested | Marketplace/BI intelligence via `keepa`/`amazon_sp_api` seams — **read** intelligence, not a Vendor rule | Leave; the wording safeguards already govern claims |
| `integration-audit-amazon-provenance` | built_and_tested | States SP-API is mock-first and no credential exists — **accurate and matches this audit** | Leave; extend with the Vendor-endpoint gap (`AV-040`) |
| `integration-audit-next-activation-candidates` | built_and_tested | Unaffected | Leave |
| `functional-completion-ads-*` (3) | built_and_tested | Unaffected | Leave |
| `uiux-wave2-*` (3) | built_and_tested | Channel-neutral wording — **supports** the Amazon wording policy | Leave |
| `sprint-surface-marketplace-intelligence-workspace` | built_and_tested | Unaffected | Leave |
| `phase13-amazon-relationship-governance` | not_started | Directly the right home for: the current Vendor terms/account agreement, Amazon policy verification, and the `AV-013` routing-request verification | Keep `not_started`; add the specific verification tasks from §29 |
| `phase14-live-integrations-activation` | blocked | Correctly blocked; should explicitly list **Amazon AP parallel testing** as an activation precondition (`AV-022`) | Keep blocked; enrich scope |
| *(not currently a row)* | — | The 24h rule, the rejection codes and the freight-window model are **confirmed Amazon rules** but are not individually registered | **Propose** new rows: `amazon-vendor-ack-rules` (built_and_tested), `amazon-vendor-freight-windows` (built_and_tested) |
| *(not currently a row)* | — | `AV-031`/`AV-032` compliance attribution + Brand Registry | **Propose** new row `vendor-vs-regulatory-compliance-attribution` (in_progress) |
| *(not currently a row)* | — | `AV-013` unverified routing deadline | **Propose** new row `vendor-routing-request-deadline-unverified` (not_started, blocked on Amazon evidence) |

**No registry row was modified.** `PROJECT_STATUS.md`, `HANDOFF.md` and
`requirements-registry.json` remain exactly as found.

---

## 27. PHASE 3 IMPACT ASSESSMENT (Supply Route / Logistics Intelligence)

| Phase 3 area | Status | Basis |
|---|---|---|
| Route model (direct vs buffered) | **REQUIRES BUSINESS DECISION** | No Amazon rule requires a UK hub; Mercenta's default is direct. The `mercenta_hub` stage must be reclassified (`AV-026`, `AV-027`) |
| Supply profile (origin, lead time, transit, customs) | **SAFE TO IMPLEMENT** | Phase 1/2 already declare these as supplied/unknown; Amazon publishes no lead-time rule (§17, §18) |
| Lead times | **NEEDS RECONCILIATION FIRST** | `maximum_planning_lead_time_days` is unset and must stay a business decision; the `<14 days` narrative target must be labelled Mercenta's (`AV-028`) |
| Transit / customs / UK port | **SAFE TO IMPLEMENT as Mercenta logistics** | No Amazon rule found; must be modelled from real data, never invented |
| Amazon destinations | **REQUIRES AMAZON EVIDENCE / OPERATIONAL DATA** | The authoritative destination is the PO's `shipToParty` (S5); the static 22-FC list is convenience data (`AV-017`) |
| Receiving | **REQUIRES AMAZON EVIDENCE** | `receivingStatus` / received qty are documented at field level (S5); tolerances are `UNKNOWN` (`AV-047`) |
| Freight terms / windows | **SAFE TO IMPLEMENT** | Freight-term → window type is **CONFIRMED** (`AV-012`); the routing-request deadline is **not** (`AV-013`) → treat as a Mercenta target |
| Shipment milestones | **NEEDS RECONCILIATION FIRST** | Replace the implied mandatory hub pipeline with **route profiles**, keeping `bak_depot`/`mercenta_hub` as *optional* profiles (`AV-027`) |
| PO quantities / pack profiles | **SAFE TO IMPLEMENT** | Pack concepts are Mercenta/logistics and align with Amazon's `Cases`/`Eaches`/`unitSize` vocabulary (`AV-029`) |
| Inventory assumptions | **REQUIRES BUSINESS DECISION** | No Vendor inventory-availability API exists; any inventory model is Mercenta's |
| UK 3PL / cross-dock | **REQUIRES BUSINESS DECISION** | Purely a Mercenta operational choice; must not be presented as an Amazon requirement |
| Delivery windows | **SAFE TO IMPLEMENT** | Documented semantics (S3, S15) — plus the **appointment** concept (Carrier Central), currently absent (`AV-045`) |
| Supplier performance | **REQUIRES AMAZON EVIDENCE** | Scorecard definitions and dispute windows are not public (`AV-019`, `AV-020`) — model only what Mercenta itself measures |
| Exception handling | **SAFE TO IMPLEMENT** | Existing routing gateways + work layer already carry exceptions deterministically |
| Acknowledgement → shipment sequencing | **SAFE TO IMPLEMENT** | The PO must be confirmed before a shipment request (S7) — already true in Mercenta; add the 2-business-day pickup rule (`AV-014`) |

**Phase 3 conclusion: READY WITH DOCUMENTED CONDITIONS.** Nothing found requires an architectural
rebuild. Four items (route model, lead-time target, hub stages, inventory/3PL assumptions) require a
**human business decision**; three (destination-directory semantics, receiving tolerances, vendor
performance/dispute windows) require **Amazon evidence or live operational data**.

---

## 28. ARCHITECTURAL IMPACT MAP (no changes made)

```
AMAZON EVIDENCE (S1–S16)
        │
        ├── AV-013 routing-request deadline (UNKNOWN)
        │      → src/types.ts (FreightTerm comment, shipWindowEnd comment)
        │      → src/components/shared/RoutingRequest.tsx (getRoutingRequestDeadline, UI copy)
        │      → src/config/tours/tourDefinitions.ts
        │      → e2e/shipment-asn.spec.ts #3
        │      → blast radius: PO UX, tours, one e2e; no domain arithmetic
        │
        ├── AV-031 / AV-032 compliance attribution
        │      → src/lib/compliance.ts (BASE_REQUIRED_DOCUMENTS, CATEGORY_SPECIFIC_DOCUMENTS)
        │      → src/data/demoData.ts (CATEGORY_EXTRA_DOCS)
        │      → compliance gate → onboarding wizard copy → e2e/compliance-gate.spec.ts
        │      → blast radius: brand onboarding copy + demo data + one e2e; NO gate logic
        │
        ├── AV-027 hub stage vs direct route
        │      → src/types.ts (ShipmentStage, SHIPMENT_STAGE_ORDER, labels)
        │      → src/context/GlobalStateContext.tsx (legacy→canonical stage mapping)
        │      → shipment surfaces, tours, funnel/analytics labels
        │      → blast radius: HIGH — a canonical contract; Phase 3 owns it
        │
        ├── AV-006/007/008/009/010/010b/023 acknowledgement-rules gap
        │      → src/types.ts (PurchaseOrderLineItem, AckHistoryEntry)
        │      → src/data/api.ts (acknowledgement service)
        │      → src/components/brand/BrandPurchaseOrders.tsx, BrandDashboard.tsx
        │      → e2e/po-lifecycle.spec.ts
        │      → blast radius: MEDIUM — additive fields/rules; existing tests keep passing
        │
        ├── AV-022 invoice rules + AV-040 SP-API endpoint gap
        │      → src/lib/spapi/{client,mockClient,transform}.ts
        │      → activation docs / Phase 14 scope, PRODUCTION_READINESS.md
        │      → blast radius: MEDIUM — activation-time only
        │
        ├── AV-024 / AV-043 PO vocabulary mapping
        │      → src/types.ts (PurchaseOrderStatus, LineAckStatus)
        │      → src/lib/statusPresentation.ts, BrandPurchaseOrders, admin surfaces
        │      → requirements-registry rows
        │      → blast radius: MEDIUM–HIGH — must be additive
        │
        └── AV-017 destinations + AV-045 appointments
               → src/types.ts (DEFAULT_UK_FC_LIST), FcSelector, shipment creation UI
               → Phase 3 destination/appointment design
               → blast radius: Phase 3 scope
```

---

## 29. PROPOSED CORRECTIONS (NOT IMPLEMENTED)

Ordered by risk. **None of these were performed.**

1. **Reclassify the routing-request deadline** (`AV-013`): keep the business-day calculation only if
   re-labelled as a Mercenta operational target, or remove the "10am Pacific / day before" claim from
   `types.ts`, `RoutingRequest.tsx` and the tour, and repoint the e2e assertion to the behaviour that
   survives. Confidence in the finding: **high**.
2. **Re-attribute compliance documents** (`AV-031`): change *"Amazon UK requires…"* to *"UK/EU
   regulatory requirements, applied as Mercenta's onboarding controls"* in `src/lib/compliance.ts`
   and `demoData.ts`. Do **not** change the requirement mapping itself.
3. **Resolve `brand_registry_confirmation`** (`AV-032`): either remove it from the vendor base set or
   reclassify it as an optional Mercenta control.
4. **Label the deduction taxonomy and the 14-day dispute window** as Mercenta's own (`AV-019`,
   `AV-019b`), and label the 30-day backorder rule as unverified (`AV-020b`).
5. **Add the documented acknowledgement rules** additively: the 48-hour update window, the
   2-business-day pickup rule, `isBackOrderAllowed` gating, the cost-price/invoice match, implicit
   rejection of omitted lines, and "rejected can never become accepted" (`AV-006`–`AV-010`, `AV-023`).
6. **Declare a mapping** between Mercenta's PO vocabulary and Amazon's `purchaseOrderState` /
   `purchaseOrderStatus` / `itemConfirmationStatus` (`AV-043`), and add PO-change ingestion
   (`AV-024`).
7. **Reclassify the shipment stage pipeline as route profiles** so `mercenta_hub` is one optional
   profile rather than an implied mandate (`AV-027`) — a Phase 3 design task.
8. **Tighten the `AV-003` notification copy** to a labelled possibility.
9. **Verify or remove** `AV-034` (marketplace ID) and `AV-033` (image thresholds) before live use.
10. **Add the activation prerequisites** from S11/S7 to the activation checklist: Amazon AP parallel
    testing, PO-confirmed-before-shipment-request, and the Vendor-only endpoint set (`AV-022`,
    `AV-040`).
11. **Phase 13** is the correct home for the Amazon terms/policy verification this audit could not
    complete unaided (sign-in-gated Vendor Central help).

---

## 30. PROPOSED IMPLEMENTATION SEQUENCE (PROPOSED ONLY — NOT EXECUTED)

1. Human review of this report + the discrepancy register; decide the four **business decisions**
   (route model / hub profiles, lead-time target, inventory & 3PL assumptions, deduction-taxonomy
   ownership).
2. Resolve the three **CONTRADICTED** items (routing deadline, compliance attribution, hub-stage
   implication) — smallest possible edits, tests repointed not weakened.
3. Re-label the **UNSUPPORTED** items (deduction taxonomy, 14-day window, 30-day backorder,
   Brand Registry, unconditional backorder).
4. Add the missing **documented** Amazon behaviours additively (acknowledgement update window, pickup
   lead time, cost-price/invoice match, `isBackOrderAllowed`, implicit line rejection).
5. Declare the PO vocabulary mapping and PO-change ingestion.
6. Update simulation semantics so no scenario asserts an unverified rule.
7. Update/repair tests to point at the corrected contracts (never at an unverified claim).
8. Reconcile `requirements-registry.json` (add the four proposed rows; reword `batch14-fc-selector`);
   then `PROJECT_STATUS.md` + `HANDOFF.md` per the project-state contract.
9. Re-run full verification (typecheck, build, validators, Playwright) and record evidence.
10. Scope Phase 3 using the §27 statuses.
11. Implement Phase 3.

**STOP — this sequence is not authorised by this task.**

---

## 31. VALIDATION / TEST EVIDENCE

Read-only commands only. **No command was run that writes to the repository.** Playwright was
**deliberately not run** because it writes `test-results/`, `playwright-report/`, `test-screenshots/`
and `e2e-report/` — i.e. it mutates project state.

| # | Command | Result | Wrote anything? | Failure relevant to this audit? | Pre-existing? |
|---|---|---|---|---|---|
| 1 | `npx tsc --noEmit -p tsconfig.app.json` | **exit 0**, no output (0 errors) | No | — | n/a |
| 2 | `npm run --silent validate:wording` | `WORDING_LINT_PASS — scanned 268 src files, 0 outward-facing violations` | No (script contains no `fs` writes — verified by grep) | No | n/a |
| 3 | `node scripts/validate-commercial-readiness.mjs` | `78 assertions, 0 failure(s)`; includes `✓ Q1 the whole validation performed ZERO live network calls — networkCalls=0`; `✓ R2 … EVERY canonical record … — 4/4` | No (verified by grep) | No | n/a |
| 4 | `git status --porcelain \| wc -l` (before / after) | **132 / 132** | No | — | Pre-existing dirty tree |
| 5 | `git diff --cached --name-only \| wc -l` | **0** | No | — | n/a |
| 6 | `git rev-parse HEAD` / `--abbrev-ref HEAD` (before / after) | identical: `19be002…` / `redesign/foundation` | No | — | n/a |
| — | `npm run build` | **NOT RUN** — it writes `dist/**` (project state) | would have written | — | n/a |
| — | `npx playwright test …` | **NOT RUN** — writes reports/screenshots | would have written | — | n/a |
| — | `bash scripts/export-review-zip.sh` | **NOT RUN** — it rewrites the **tracked** `Review Zip/mercenta-review.zip` | would have written | — | n/a |

**Pre-existing test-state context (reported, not re-run):** `PROJECT_STATUS.md` §8 records the last
full verification as **371 Playwright tests passed / 0 failed / 2 skipped**, `tsc` 0 errors, build
compiling, and 78/78 commercial-readiness assertions. **This audit did not re-run Playwright, so the
Playwright figure is reported as *previously recorded*, not re-verified today.**

**Known pre-existing validator defects** (recorded in `PROJECT_STATUS.md`, untouched here):
`validate-stage26.mjs` prints ✗ but exits 0; `layout-audit.mjs` has an undefined-class failure;
`verify-registry.mjs` reports 174 pre-existing findings, none in the Phase 2 rows.

---

## 32. FINAL PHASE 3 READINESS STATUS

### AMAZON VENDOR TRUTH VALIDATION STATUS

| Dimension | Status |
|---|---|
| **Research completeness** | **SUBSTANTIAL BUT NOT EXHAUSTIVE.** All reachable Amazon-owned Vendor documentation on the Retail Procurement APIs, shipment/ASN, invoicing and transaction status was read (S1–S16). **Vendor Central help-hub content could not be read** (sign-in gated), and Amazon's public Vendor Central marketing page returns 404. |
| **Evidence quality** | **HIGH for what is claimed.** Every substantive external claim cites an Amazon-owned source with a URL, update date and quoted wording. No secondary source was used as proof. Where evidence is absent the finding is `UNKNOWN`. |
| **Confirmed areas** | The 24-hour acknowledgement window; the three rejection reasons; line-level `Accepted`/`Backordered`/`Rejected` acknowledgement with partial quantities and a never-exceed-PO rule; the freight-term → window-type mapping (`Collect`/WePay ⇒ ship window; vendor-paid ⇒ delivery window); PO-must-be-confirmed-before-shipment-request; ASN-before-receipt + chargeback consequence; ASN content incl. SSCC/lot/expiry; `receivingStatus`/received quantity; the documented PO change/cancellation mechanism; invoice uniqueness/matching rules; no public vendor payments/deductions/performance API. |
| **Contradicted areas** | 3 — `AV-013` (routing-request 10am rule asserted as fact), `AV-031` (compliance mis-attributed to Amazon), `AV-027` (mandatory hub stage vs Mercenta's own direct-route default). |
| **Unsupported areas** | 6 — `AV-003`, `AV-010`, `AV-019`, `AV-019b`, `AV-020b`, `AV-032`. |
| **Unknown areas** | 6 — `AV-020`, `AV-034`, `AV-035`, `AV-046`, `AV-047`, `AV-048`. |
| **Incomplete areas** | 14 — mostly *missing documented Amazon behaviours* (48h update, rejected-line permanence, cost-price/invoice match, `isBackOrderAllowed`, PO-change ingestion, PO-vocabulary mapping, invoice-ID rules, ASN ordering/SSCC, appointments, 2-business-day pickup). |
| **Required reconciliation areas** | Compliance attribution; routing-request deadline; shipment-stage/route-profile model; deduction taxonomy + dispute window; PO vocabulary mapping; SP-API endpoint coverage; registry rows. |

### PHASE 3 STATUS

# **READY WITH DOCUMENTED CONDITIONS**

Conditions (all business/evidence, none architectural):
1. Decide the route model (direct vs optional hub profiles) and reclassify the `mercenta_hub` stage.
2. Keep lead times as a business decision; label `<14 days` as Mercenta's target.
3. Label or drop the unverified routing-request deadline before it drives Phase 3 timing.
4. Treat the FC list as convenience data; take destinations from the PO (`shipToParty`).
5. Do not build supplier-performance or dispute-window features on unverified Amazon figures.

---

## PHASE 0A COMPLETE — AMAZON VENDOR TRUTH VALIDATION FINISHED.
## NO IMPLEMENTATION CHANGES WERE AUTHORIZED OR PERFORMED.
## REVIEW REQUIRED BEFORE PHASE 0B IMPLEMENTATION.

| Item | Value |
|---|---|
| Current HEAD | `19be002c4b3d6a64020b4740879c56ef1550e628` (unchanged) |
| Current branch | `redesign/foundation` (unchanged) |
| Git cleanliness | **Identical to audit start** — 132 status entries, 0 staged, 0 deleted, no new tracked modifications; the 2 new files are **untracked report artifacts** in `docs/` |
| Report paths | `docs/AMAZON_VENDOR_TRUTH_VALIDATION_2026-09-20.md` (this file), `docs/AMAZON_VENDOR_DISCREPANCY_REGISTER_2026-09-20.md` |
| Number of findings | **52** (`AV-001`…`AV-048`, including the lettered sub-items `AV-010b`, `AV-014b`, `AV-019b`, `AV-020b`) |
| Number of contradictions | **3** (`AV-013`, `AV-027`, `AV-031`) |
| Number of unsupported assumptions | **6** (`AV-003`, `AV-010`, `AV-019`, `AV-019b`, `AV-020b`, `AV-032`) |
| Number of unknowns | **6** (`AV-020`, `AV-034`, `AV-035`, `AV-046`, `AV-047`, `AV-048`) |
| Number of incomplete (documented Amazon behaviour not represented) | **16** |
| Number of confirmed findings | **7 findings covering 14 distinct Amazon rules verified as already correct** |
| Number of valid Mercenta rules that must NOT be changed | **9 findings** (plus the 14-row "do not change" register in the companion artifact) |
| Number of proposed changes | **11** (§29) — proposed, none applied |
| Phase 3 readiness status | **READY WITH DOCUMENTED CONDITIONS** |

**STOP. No implementation was started, no fix was applied, no test/registry/doc was modified, and no
commit, push, deploy, stash, reset, clean, checkout or branch switch was performed.**