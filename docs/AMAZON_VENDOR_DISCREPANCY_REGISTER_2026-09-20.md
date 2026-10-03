# AMAZON VENDOR DISCREPANCY REGISTER — PHASE 0A AUDIT ARTIFACT

**Date:** 2026-09-20 · **Audit:** `docs/AMAZON_VENDOR_TRUTH_VALIDATION_2026-09-20.md`
**Repository:** `/Users/tadii/Desktop/1. Mercenta` · **Branch/HEAD at audit:** `redesign/foundation` /
`19be002c4b3d6a64020b4740879c56ef1550e628`
**Status:** AUDIT ARTIFACT ONLY — nothing in this register has been applied. The repository was not
modified by this audit.

**Evidence key** — S1…S16 refer to the source table in §4.1 of the main report (Amazon-owned
documentation on developer-docs.amazon.com updated 2026-09-09, plus Carrier Central and the Vendor
Central sign-in page).

**Classification key** — CONFIRMED · CONTRADICTED · UNSUPPORTED · INCOMPLETE · INFERENCE ·
MERCENTA RULE · UNKNOWN.

**Totals — 52 findings** (`AV-001`…`AV-048`, including the lettered sub-items `AV-010b`, `AV-014b`,
`AV-019b`, `AV-020b`)

| Classification | Count |
|---|---|
| CONFIRMED (Mercenta already matches Amazon evidence) | 7 |
| MERCENTA RULE (valid internal decision — leave alone) | 9 |
| CONTRADICTED | 3 |
| UNSUPPORTED | 6 |
| INCOMPLETE (a documented Amazon behaviour is not represented) | 16 |
| INFERENCE (reasonable, but must be labelled) | 5 |
| UNKNOWN (research insufficient) | 6 |
| **Total** | **52** |

Columns: ID · Domain · Existing Mercenta rule · Evidence/Source · Classification · Why it matters ·
Affected files · Affected requirements · Business impact · Recommended action · Priority · Confidence.

---

## PART A — PO / ACKNOWLEDGEMENT

| ID | Domain | Existing Mercenta rule | Evidence / Source | Classification | Why it matters | Affected files | Affected requirements | Business impact | Recommended action | Priority | Confidence |
|---|---|---|---|---|---|---|---|---|---|---|---|
| AV-001 | PO ack | Unacknowledged after 24h = at risk; deadline `orderDate + 24h` | *"You must submit the acknowledgment within 24 hours, including backordered items."* / *"You have 24 hours to accept a purchase order."* — S2 | **CONFIRMED** | Core deadline rule is correct | `src/types.ts:1116-1118`; `BrandPurchaseOrders.tsx:220-231`; `BrandDashboard.tsx:77,126-130`; `statusPresentation.ts:573-590` | PO rows; `po-lifecycle` e2e | None — rule is right | Keep; add the "on hold" nuance (`AV-010b`) | INFORMATIONAL | HIGH |
| AV-002 | PO ack | Notification: a missed ack is *"subject to forced cancellation"* | S2 states the 24h limit and the on-hold reject duty; S9 notes *"Amazon's policies allow cancellation of outstanding shipments"*. No source states "unacknowledged ⇒ forced cancellation" | **INFERENCE** | Implies a consequence Amazon does not state in that form | `postmarkNotifier.ts:140-141,161`; `statusPresentation.ts:581` | notification rows | Brand copy could overstate | Soften to "at risk", label as risk not certainty | MEDIUM | HIGH |
| AV-003 | Supplier performance | *"…could affect your vendor performance rating"* | No Amazon source reached documents a vendor performance rating or its triggers; no SP-API endpoint (S14) | **UNSUPPORTED** | Claims an unverified Amazon consequence | `postmarkNotifier.ts:141,161` (gone — the file no longer exists) → the LAST carriers were the ONBOARDING surfaces: the guided tours, the legacy tour path, the `kb-purchase-orders` article, the wizard's guidance step, the wizard/Add-Product intros | notification rows + onboarding surfaces | Brand-facing claim without evidence | Re-label as a possibility or remove | MEDIUM | MEDIUM | **APPLIED 2026-09-25 (S8)** — removed from every onboarding carrier; each renders the rule's ONE owner. See `docs/AMAZON_RECONCILIATION_STATUS.md → AV-003`. |
| AV-004 | Rejection codes | `TemporarilyUnavailable`, `InvalidProductIdentifier`, `ObsoleteProduct` | Verbatim, exactly three — S2 | **CONFIRMED** | Enum matches Amazon exactly | `src/types.ts:1149-1155` | PO rows | None | Keep | INFORMATIONAL | HIGH |
| AV-005 | Ack model | Line-level `unacknowledged/accepted/rejected/backordered` + `AckHistoryEntry` + qty never > ordered | Ack code table; *"You cannot send a higher quantity…you can confirm a smaller quantity"*; `acknowledgementStatusDetails` — S2, S5 | **CONFIRMED** | Matches Amazon's line-level semantics | `src/types.ts:1147-1205`; `src/data/api.ts` | PO rows; `po-lifecycle` e2e | None | Keep | INFORMATIONAL | HIGH |
| AV-006 | Ack update | No amendment window modelled | *"You must submit an updated acknowledgment within 48 hours for any changes to quantity, price, ship dates, or delivery dates… After 48 hours, we only expect to receive updates to ship dates or delivery dates."* — S2 | **INCOMPLETE** | Documented obligation + deadline absent | `src/types.ts`; `src/data/api.ts`; `BrandPurchaseOrders.tsx` | PO rows | Mercenta cannot tell a brand its amendment window | Add a declared 48h amendment window (additive) | HIGH | HIGH | **APPLIED 2026-09-28 (Batch 2b)** — the window, the four documented change groups and the after-window set are declared in `src/config/purchaseOrders.ts`, derived fail-closed in `src/lib/commerce/poAcknowledgementWindow.ts`, enforced at the domain boundary (a second acknowledgement is an AMENDMENT, not a duplicate), rendered on the brand surface and in Operational Guidance, and gated by `npm run validate:po-amendment-window`. |
| AV-007 | Ack rules | A rejected line can later be re-acknowledged | *"If the first acknowledgment code for a specific line item was `rejected`, you cannot change this with your update to either `accepted` or `backordered`."* — S2 | **INCOMPLETE** | Mercenta could accept an impossible state change | `src/data/api.ts`; `BrandPurchaseOrders.tsx` | PO rows; `po-lifecycle` e2e | Brand could be offered an option Amazon refuses | Block re-ack of a rejected line + test | MEDIUM | HIGH |
| AV-008 | Ack ↔ invoice | `acknowledgedUnitPrice` recorded, not matched | *"The cost price in the acknowledgement must match the invoiced unit cost price… The price cannot be higher than the price submitted in the purchase order."* — S2 | **INCOMPLETE** | Documented cause of payment delay | `src/types.ts:1189-1193`; `src/data/api.ts` | PO + finance rows | Payment-delay risk on price divergence | Add the match rule + warning (additive) | HIGH | HIGH |
| AV-009 | Ack completeness | Per-line decisions, no completeness rule | *"…Amazon implicitly rejects the missing line items. If the acknowledgment code is omitted, the acknowledgment is rejected."* — S2 | **INCOMPLETE** | Defined consequence not modelled | `src/data/api.ts`; `BrandPurchaseOrders.tsx` | PO rows | Silent implicit rejections | Enforce/surface completeness at submission | MEDIUM | HIGH |
| AV-010 | Backorders | Backorder always available | *"The backorder policy is determined by your Amazon business representative. Read the value in the `isBackOrderAllowed` field…"* — S3, S4 | **UNSUPPORTED** | Mercenta offers an option Amazon may refuse | `src/types.ts`; `BrandPurchaseOrders.tsx`; `src/data/api.ts` | PO rows; `po-lifecycle` e2e | Brand could backorder where forbidden | Add an `isBackOrderAllowed` gate (fail-closed) | HIGH | HIGH |
| AV-010b | PO on hold | Not modelled | *"Vendors must reject any purchase order that is on hold past the 24-hour time limit."* — S2 | **INCOMPLETE** | Mandatory documented action absent | `src/types.ts`; `src/data/api.ts` | PO rows | Non-compliance with a documented instruction | Add `on_hold` state + reject-by-24h rule | MEDIUM | MEDIUM |
| AV-011 | Ack verification | Not modelled | Ack status verifiable in Vendor Central / Transaction Status API; *"If the original or updated version doesn't appear after 30 minutes…"* — S2, S12 | **INCOMPLETE** | No confirmation step | `src/lib/spapi/*` | activation rows | An ack could silently fail | Add status verification when live | LOW | MEDIUM | **APPLIED 2026-10-02 (Batch 2k)** — the confirmation step now has ONE owner, `src/lib/commerce/poAcknowledgementVerification.ts`: after transmitting an acknowledgement Mercenta reads the channel's OWN order state back (`getPurchaseOrdersStatus`) and reports whether the version APPEARED against the documented 30-minute window (`not_submitted` · `awaiting_visibility` · `confirmed` · `not_confirmed` · `unreadable`), failing closed; the transmission instant is recorded and the console shows the verdict, reusing the one receiving read. Gated by `npm run validate:ack-verification` (33 assertions, mutation-proved twice) |
| AV-012 | Freight ↔ window | `collect` ⇒ ship window; `prepaid` ⇒ delivery window | Vendor-paid freight ⇒ delivery window; Amazon-paid ⇒ ship window; `shipmentFreightTerm: "Collect"`; *"WePay (Collect) vendors"* — S3, S7, S8 | **CONFIRMED** | Exactly matches Amazon's documented pair | `src/types.ts:1086-1134`; `RoutingRequest.tsx`; `shipment-asn.spec.ts` #4 | PO/shipment rows | None | Keep | INFORMATIONAL | HIGH |
| AV-013 | Routing request | *"Routing Request due by 10am Pacific the day before the ship window closes"* | **No Amazon source reached states this.** S7 documents a `requestedPickUp` *"at least two business days after the current date"*; S8 documents carrier assignment *"same day as the scheduled pickup or one day prior"* | **CONTRADICTED** | A rule presented as fact that the research cannot substantiate | `src/types.ts:1089-1090,1129`; `RoutingRequest.tsx:2-6,31-36,70-72,124-142`; `tourDefinitions.ts`; `e2e/shipment-asn.spec.ts` #3 | shipment rows; tour rows | Phase 3 timing could be built on an invented deadline | Reclassify as a Mercenta operational target or remove; repoint the e2e to surviving behaviour | **CRITICAL** | HIGH | **APPLIED (Batch 2o, 2026-10-03)** — reconciled at source, not relabelled to a different channel rule. The unsupported claim is REMOVED: it now survives only as explanatory comments recording why it was removed (`src/types.ts`, `src/components/shared/RoutingRequest.tsx`, `src/lib/shipping/collectChain.ts`, `src/lib/shipping/routingReadiness.ts`). The deadline is re-declared ONCE as **Mercenta's OWN operational readiness target** (`src/lib/shipping/routingReadiness.ts`, owner `Mercenta`, `Europe/London`); no replacement channel deadline was invented. The brand-facing mechanic was reconciled in §P4 (the `RoutingRequestForm` placeholder → read-only `RoutingRequestStatus`). Gates: `npm run validate:wave3-logistics` (§8 sweeps every `src/` file — comment-stripped, whitespace-normalised — and refuses any code occurrence of the token that is NOT a documented removal reference, plus the inline-record and owner-consumption assertions; mutation-proved twice), `e2e/logistics-wave3.spec.ts` #6 + `e2e/shipment-asn.spec.ts` #3 (the claim is asserted ABSENT in the rendered copy), `npm run validate:proxy-model` (the brand-side form is gone). The remaining EVALUATION half — whether a Vendor Central routing-request UI deadline exists at all — stays EVIDENCE-BLOCKED under `AV-048`. |
| AV-014 | Routing lead time | No pickup lead-time rule modelled | *"`requestedPickUp` — A date at least two business days after the current date"*; *"carrier assignment occurs either on the same day as the scheduled pickup or one day prior"* — S7, S8 | **APPLIED (Batch 2m, 2026-10-03)** — `src/lib/shipping/collectChain.ts` owns the 2-business-day lead time and now ENFORCES it (`validateRequestedPickUp`); `channelShipmentOperations.raiseChannelShipmentRequest` refuses a collect request with a too-early/missing/unreadable date before any channel call | The documented, verifiable replacement for `AV-013` is built, surfaced AND enforced | `src/lib/shipping/collectChain.ts`; `src/lib/shipping/channelShipmentOperations.ts`; `src/data/api.ts`; shipment types | shipment rows | Without it, collect-lane scheduling is unconstrained | DONE — `npm run validate:pickup-lead-time` (24), `validate:p12-spapi-seam` (67), live `L21` | HIGH | HIGH |
| AV-014b | Shipment gating | Shipment creation requires a valid brand PO | *"Unconfirmed purchase orders cause the request to fail."* — S7 | **CONFIRMED** | Mercenta's gate mirrors Amazon's precondition | `src/data/api.ts`; shipment creation flow | shipment rows; `shipment-asn` e2e | None | Keep | INFORMATIONAL | HIGH |
| AV-015 | ASN timing | ASN can be filed after the goods are in transit / at the FC | *"Amazon must receive the shipment confirmation prior to the product being received at the Amazon fulfillment center. Missing or delayed shipment confirmations result in chargebacks."* — S9 | **INCOMPLETE** | Documented chargeback trigger not enforced or surfaced | shipment flow; `src/data/api.ts`; `BrandPurchaseOrders.tsx` | shipment rows; `shipment-asn` e2e | Real chargeback exposure | Enforce/surface "ASN before receipt" | HIGH | HIGH | **APPLIED 2026-10-02 (Batch 2l)** — the ordering now has ONE owner, `src/lib/shipping/asnBeforeReceipt.ts`: the ASN filing instant is compared with the channel's OWN logged receipt, yielding `compliant` · `pending` · `exposed` (the chargeback trigger) · `unknown` (fail closed), shown per reading and reusing the one receiving read. Gated by `npm run validate:asn-before-receipt` (28 assertions, mutation-proved twice) |
| AV-016 | ASN content | Cartons + lot/expiry (Grocery) | ASN carries PO no., ship date, EDD, lot, expiry, **SSCC**; carton + pallet structures; *"a limit of 100 shipment confirmations for every truckload shipment"* — S9 | **APPLIED (SSCC + count limit at P6/P8; the PALLET structure in Batch 2n, 2026-10-03)** | Missing SSCC/pallet structure and the count limit | shipment types; ASN UI; `src/lib/shipping/asnPallets.ts` | shipment rows | A live ASN could be rejected or need manual handling | Add SSCC/pallet fields + the ≤100 rule when live | MEDIUM | HIGH | **APPLIED** — the **SSCC** container identifiers and the **≤100 truckload limit** were built at P6/P8 (`src/lib/documents/sscc.ts`; `src/lib/shipping/consolidation.ts → TRUCKLOAD_CONFIRMATION_LIMIT = 100`). The remaining **PALLET-LEVEL ASN STRUCTURE** is now built (Batch 2n, 2026-10-03): ONE owner `src/lib/shipping/asnPallets.ts` derives the carton→pallet grouping from ONE declared capacity (`ASN_PALLET_PROFILE` in `src/config/shipping.ts` — Mercenta's OWN model, **not** a channel rule: no channel source states a cartons-per-pallet figure), each pallet carries its OWN SSCC-18 (`ssccForPallet`), the structure is carried on the ASN record (`AsnDetail.pallets`), travels with the channel confirmation (`ShipmentConfirmationPayload.pallets` + a per-carton `palletId`), is REFUSED when inconsistent (the ASN-record partition invariant in `src/data/api.ts` and the mock seam's `SHIPMENT_CONFIRMATION_PALLET_*` refusals), and is printed on the consignment's documents (one pallet label per pallet, with the declared basis). Gated by `npm run validate:asn-pallets` (40 assertions, mutation-proved twice). |
| AV-017 | Destinations | Static 22-entry `DEFAULT_UK_FC_LIST` described as *"Amazon UK FCs"* | The destination is carried on the PO as `shipToParty.partyId` (an FC code), filterable by `shipToPartyId`; no Amazon-published UK FC directory was found — S5 | **INFERENCE** | The list is Mercenta convenience data, not an Amazon directory | `src/types.ts:1232-1257`; `FcSelector` (removed 2026-09-21 — see note below); shipment UI | `batch14-fc-selector` | Users may treat the list as authoritative | Re-label as a Mercenta-maintained list; treat the PO as authoritative | MEDIUM | HIGH |
| AV-018 | Receiving → deductions | `receivedQty` vs `acknowledgedQty` auto-raises a shortage deduction | `receivingStatus` = *"the Amazon fulfillment center received status and received quantity"* — S5 (concept confirmed); the automatic deduction arithmetic is Mercenta's own | **MERCENTA RULE** | The receiving concept is real; the automated deduction is a Mercenta decision. **P7 (2026-09-23) modelled the status itself**: `src/lib/commerce/receivingStatus.ts` derives `not_received` / `partially_received` / `received` from the received quantities and gates invoicing (fail closed). Reading the **channel's** own status is still P12 (`getPurchaseOrdersStatus`). | `src/lib/commerce/receivingStatus.ts`; `src/types.ts` (`RECEIVING_STATUSES`); `src/data/api.ts`; `DeductionsLedger.tsx` | PO + deductions rows | Legitimate internal control | Keep; label the deduction as Mercenta-raised | LOW | HIGH |
| AV-019 | Deduction taxonomy | 9 `DeductionType` values treated as real chargeback codes | **No Amazon source reached publishes this taxonomy** (Vendor Central help gated; no public API — S14). Amazon documents only that missing/delayed ASNs and freight refusals cause chargebacks (S9) | **UNSUPPORTED** | Presents a Mercenta taxonomy as Amazon's | `src/types.ts:1045-1054`; `DeductionsLedger.tsx`; `demoData.ts` | deductions rows; `deductions` e2e | A brand may believe these are Amazon's codes | Label as a Mercenta working taxonomy; source real codes from Vendor Central reports | HIGH | HIGH |
| AV-019b | Dispute window | *"typically 14 days from the deduction date"* | No Amazon source reached states a deduction-dispute window — S2, S3, S9, S11 | **UNSUPPORTED** | An invented deadline could cost a real dispute | `tourDefinitions.ts:306`; `DeductionsLedger.tsx:252` | deductions rows; `disputes` e2e | A brand could miss a real window, or rush unnecessarily | Re-label as Mercenta's own service standard until evidenced | MEDIUM | HIGH |
| AV-020 | Supplier performance | Assumption that Amazon performance metrics exist and are known | No public documentation of vendor scorecard definitions; no SP-API endpoint (S14) | **UNKNOWN** | Cannot be modelled from evidence | `postmarkNotifier.ts`; dashboards | performance rows | Risk of inventing metrics | Do not model Amazon performance metrics until evidenced; model only Mercenta's own | MEDIUM | HIGH |
| AV-020b | Backorder restock | *"backordered items lose visibility on the retail channel after 30 days without restock"*; `backorderRestockDeadline = scheduledShipDate + 30d` | **Not established** by any Amazon source reached | **UNSUPPORTED** | An invented 30-day rule drives a user-facing countdown | `src/types.ts:1170-1174`; `src/data/api.ts:881-885`; `BrandPurchaseOrders.tsx:721-735` | PO rows | A brand may act on a fabricated deadline | Re-label as unverified, or remove the countdown until evidenced | HIGH | MEDIUM |
| AV-021 | Payments architecture | PO → invoice → payment → reconciliation → Xero → payout proposal → human approval → Wise | Amazon documents invoice submission/matching (S10, S11) but **no vendor payments/remittance API** exists in the public surface (S14) | **CONFIRMED** | The internal chain is correctly internal and cannot be automated from Amazon APIs | `src/config/payouts.ts`; `src/services/xero/*`; `src/lib/finance/*` | finance/payout rows | None — the design is right | Keep; never present it as an Amazon process | INFORMATIONAL | HIGH |
| AV-022 | Invoice rules | No invoice-ID / matching rules modelled (**before P7**) | Unique never-reused invoice numbers; zero-value fails; wrong data ⇒ Amazon cancels + new Invoice ID; bill-to must match the Amazon Payee system; **API invoicing requires parallel testing with Amazon AP**; credit notes for returns/corrections/allowances — S11 | **MODELLED IN PART (P7, 2026-09-23)** | **Uniqueness/never-reuse, the zero-value refusal and cancel ⇒ NEW Invoice ID are now implemented** (`src/lib/commerce/invoiceRegistry.ts`, an append-only registry with voided numbers staying consumed; `cancelCommerceInvoice` in `src/lib/commerce/commerceLifecycle.ts`); the **parallel-testing precondition is now stated on the admin surface** (`INVOICE_NUMBER_RULES`) and in `PRODUCTION_READINESS.md`. **Still missing:** `billToParty` / Payee-system matching (needs `AV-035`), credit notes, and the `submitInvoices` API submission itself (**P12**, `AV-040`) | `src/lib/commerce/invoiceRegistry.ts`; `src/lib/commerce/invoiceTerms.ts`; `src/lib/commerce/commerceLifecycle.ts`; `src/lib/spapi/*`; `PRODUCTION_READINESS.md` | finance rows; `phase14-live-integrations-activation` | Live invoicing would fail or be delayed | Rules added + parallel testing listed as an activation precondition (**done in part**); bill-to matching, credit notes and the API submission remain | HIGH | HIGH |
| AV-023 | Ack price ↔ invoice price | No enforced link | *"Ensure the cost price matches the unit cost price that is invoiced. Amazon payment systems compares the two and might delay payment if they do not match."* — S2 | **INCOMPLETE** | Same root cause as `AV-008`, on the invoice side | `src/types.ts`; `src/data/api.ts`; finance surfaces | PO + finance rows | Payment delay | Enforce the match at acknowledgement/invoice time | HIGH | HIGH |
| AV-024 | PO changes | No PO revision/change ingestion; `under_review` is Mercenta-internal | Amazon may change a PO (window, quantity, item cancellation, cost, new item, cancel/uncancel, type, destination FC, freight) and the vendor *"must fulfil the updated purchase order"*; discovered by polling `getPurchaseOrders`; **changing an order via the API is impossible** — manual via Vendor Central — S3, S4 | **INCOMPLETE** | Mercenta has no concept of an Amazon-issued revision | `src/types.ts` (PO type); `src/data/api.ts`; PO surfaces | PO rows | A brand could ship a superseded PO | Add a PO-revision concept + change ingestion when live | HIGH | HIGH |
| AV-025 | Naming | *"Direct Fulfillment"* used for an internal shipping concept | Amazon **Vendor Direct Fulfillment** is a distinct vendor programme (customer-order dropship) with its own APIs — S1, S6, S14 | **INFERENCE** | Name collision with a real Amazon programme | `OnboardingWizard.tsx:568-578`; `BrandPurchaseOrders.tsx:802`; `FulfillmentTrack.tsx`; `agreement.ts:45-48` | onboarding rows | Confusion for brands and future engineers | Rename the internal concept (e.g. "brand-direct supply") | MEDIUM | HIGH |

---

## PART B — SUPPLY ROUTE / LOGISTICS / CATALOGUE / COMMERCIAL

| ID | Domain | Existing Mercenta rule | Evidence / Source | Classification | Why it matters | Affected files | Affected requirements | Business impact | Recommended action | Priority | Confidence |
|---|---|---|---|---|---|---|---|---|---|---|---|
| AV-026 | Supply route | Direct brand facility → required Amazon destination is the default launch route | Amazon documents **no** requirement to route through a UK facility; the destination is the PO's `shipToParty` and deliveries are appointed — S5, S15 | **MERCENTA RULE** | Correctly a design choice, not an Amazon rule | `ukMarketFit.ts`; supply/route docs | Phase 3 rows | None | Keep; keep the wording honest | INFORMATIONAL | HIGH |
| AV-027 | Shipment stages | `factory_intake → bak_depot → international_forwarding → uk_port_hmrc → mercenta_hub → live_amazon` presented as the fulfilment pipeline | No Amazon source requires a UK hub; the same repository declares direct-to-destination the default — S5, S15 vs internal doctrine | **CONTRADICTED** | The canonical stage enum reads as a mandatory hub mandate | `src/types.ts:60-110`; `src/context/GlobalStateContext.tsx:653-659`; `MERCENTA_PRODUCT_CONTRACT.md` §3.3 | shipment rows; Phase 3 rows | Phase 3 could be built around an unnecessary hub | Re-model as **route profiles** with `mercenta_hub` optional (Phase 3) | **CRITICAL** | HIGH |
| AV-028 | Lead time target | `<14 days` end-to-end (narrative target; not found in source) | Amazon documents **no** universal lead time; `ukMarketFit.ts` uses supplied lead-time bands (30/90 days) as declared Mercenta bars | **MERCENTA RULE** | A target is fine — only mis-labelling it as Amazon's would be wrong | `ukMarketFit.ts:262-268`; handoff narrative | Phase 1/3 rows | None if labelled | Keep as a Mercenta target; never present as an Amazon requirement | INFORMATIONAL | HIGH |
| AV-029 | Pack concepts | Seven pack concepts + pack-maths rule | Amazon's own payloads use `Cases`, `Eaches`, `unitSize`, carton and pallet structures — S9, S11. No Amazon MOQ concept exists | **CONFIRMED** | Useful, Amazon-compatible distinctions | `src/config/commercialReadiness.ts:278-384`; `src/types.ts:3716-3745` | Phase 2 rows | None | Keep | INFORMATIONAL | HIGH |
| AV-030 | MOQ honesty | `MOQ_HONOUR_DISCLAIMER`, `CHANNEL_WILL_HONOUR_MOQ_IS_UNSUPPORTED`, `PO_QUANTITY_IS_NOT_DERIVED_FROM_MOQ` | No Amazon source implies a channel honours a brand MOQ | **MERCENTA RULE** | Prevents an invented channel rule | `src/config/commercialReadiness.ts:378-384` | Phase 2 rows | None | Keep | INFORMATIONAL | HIGH |
| AV-031 | Compliance attribution | Compliance docs described as *"Amazon UK requirements"* / *"Amazon UK marketplace rules"* | The named obligations (UKCA, CPNP/SCNP, WEEE, food-contact, EN 71/1888, HACCP/BRC, textile labelling, type approval) are **UK/EU law**, not Amazon rules | **CONTRADICTED** | Mis-attributes regulatory duty to Amazon | `src/lib/compliance.ts:1-40`; `src/data/demoData.ts:491` | compliance rows; onboarding rows | A brand could believe Amazon mandates a legal duty | Re-attribute to UK/EU regulation + Mercenta onboarding controls (keep the mapping) | **CRITICAL** | HIGH |
| AV-032 | Compliance set | `brand_registry_confirmation` is a base required document for every brand | Amazon **Brand Registry** is a seller/brand-owner programme; no Vendor source requires it as a vendor document | **UNSUPPORTED** | A seller-programme concept inside the Vendor compliance gate | `src/lib/compliance.ts:19-24`; `src/data/demoData.ts:484-489` | compliance rows; `compliance-gate` e2e | Brands may be blocked on a non-required document | Remove or reclassify as an optional Mercenta control | HIGH | HIGH |
| AV-033 | Catalogue images | Image validator claims *"Amazon's requirements"* (white background, 85% fill, ≥1000 px) | Amazon listing-image requirements are product/listing-side and were **not verified in this session** | **INFERENCE** | Rules may be correct but unattributed to a verified source | `src/lib/amazon/productImageValidator.ts:1-60` | catalogue rows | Possible wrong thresholds presented as Amazon's | Verify against Amazon documentation, then cite it | MEDIUM | MEDIUM |
| AV-034 | Marketplace ID | `UK_MARKETPLACE_ID = 'A1F83G8C2ARO7P'` | Could **not** be confirmed from Amazon this session (marketplace-ID page 404) | **UNKNOWN** | A wrong marketplace ID breaks live calls | `src/lib/spapi/transform.ts:37` | activation rows | Live catalogue calls could target the wrong marketplace | Verify before live activation | MEDIUM | MEDIUM |
| AV-035 | Catalogue submission | `transformProductForCatalog` builds a *"vendor catalog model"* payload | The public SP-API surface exposes **no Vendor catalogue/item API** (S14); no such route was found in Amazon's docs | **UNKNOWN** | There may be no Vendor submission endpoint to bind to | `src/lib/spapi/transform.ts`; `client.ts` | activation rows; `docs/INTEGRATIONS.md:18` | Live catalogue automation may not be possible via API | Verify the Vendor catalogue route (Vendor Central / Amazon representative) before Phase 14 | HIGH | HIGH |
| AV-036 | Categories | Ten approved Amazon UK categories | Not an Amazon-published list; a Mercenta commercial-scope constraint | **MERCENTA RULE** | Correct as a Mercenta rule; must not be stated as Amazon's | `src/types.ts` (`APPROVED_CATEGORIES`) | category rows | None if labelled | Keep; never describe as an Amazon rule | LOW | HIGH |
| AV-037 | Commercial model | Model A (commission/agent) and Model B (buy/resell) | Amazon has no such concept; it buys at the PO's `netCost`/`listPrice` — S3, S5 | **MERCENTA RULE** | Correct internal architecture | `src/config/commercialModel.ts`; `src/lib/finance/commercialModel.ts` | commercial rows; `commercial-model` e2e | None if never presented as Amazon's | Keep; never imply Amazon endorses either model | LOW | HIGH |
| AV-038 | VAT | `VAT_TREATMENT_CONFIGURED = false`; demo 20% labelled as illustration | Amazon requires invoice tax details and a bill-to matching the Payee system (S11); the production treatment is a UK tax/accounting decision | **MERCENTA RULE** | Correct fail-closed posture | `src/config/commercial.ts`; `src/config/vat.ts` | VAT rows | None | Keep | LOW | HIGH |
| AV-039 | Freight economics | Shipping margin modelled on Mercenta's DHL/Palletline accounts | On a **collect** PO the carrier is Amazon's (`WePay`) — S7, S8; Mercenta's carrier economics apply to prepaid lanes | **MERCENTA RULE** | A shipping margin must not be claimed on an Amazon-paid lane | `src/config/shipping.ts:26,44-84` | shipping rows | Mis-stated margin | Keep; exclude the collect lane from Mercenta shipping margin | MEDIUM | HIGH |
| AV-040 | SP-API coverage | Four SP-API methods modelled (`submitCatalogItem`, `getSubmissionStatus`, `fetchPurchaseOrders`, `confirmShipment`) | Documented Vendor operations include `submitAcknowledgement`, `getPurchaseOrdersStatus`, `submitInvoices`, `SubmitShipments`, `GetShipmentDetails`, `SubmitShipmentConfirmations`, `getTransaction` — S1–S12 | **INCOMPLETE** | A live integration would not cover the core vendor workflow | `src/lib/spapi/client.ts`; `mockClient.ts`; `index.ts` | activation rows | Acknowledgement/invoicing/ASN could not be automated | Extend the seam (mock first) to the documented operations | HIGH | HIGH |
| AV-041 | Cases | Brand case → Mercenta review → escalation | Amazon documents vendor support cases (S2, S7); the mercenta-first gate is Mercenta's own | **MERCENTA RULE** | Legitimate internal control | `src/types.ts` (`CaseEscalationState`); helpdesk seam | case rows; `disputes` e2e | None | Keep | INFORMATIONAL | HIGH |
| AV-042 | Wording safeguards | Banned-claim list covers approvals/partnerships/guarantees of sales, revenue, acceptance, approval, launch, placement, listing | The canonical business rules also ban *"guaranteed purchase orders"* / *"Amazon guaranteed POs"*; the regex set does **not** include PO/purchase-order guarantee phrasings | **INCOMPLETE** | A banned claim could pass the gate | `src/lib/intelligence/amazonWording.ts:28-42`; `scripts/lint-wording.mjs` | wording rows | Compliance-rule gap | Extend the pattern list to cover PO/purchase-order guarantees | MEDIUM | HIGH |
| AV-043 | PO vocabulary | Mercenta lifecycle `received/under_review/accepted/rejected/ready_to_fulfil/shipped/delivered`; line `unacknowledged/accepted/rejected/backordered` | Amazon: `purchaseOrderState` (e.g. `New`), `purchaseOrderStatus` (e.g. `OPEN`), `itemConfirmationStatus` (`ACCEPTED`/`REJECTED`/`PARTIALLY_ACCEPTED`), `poItemState=Canceled` — S4, S5 | **INCOMPLETE** | Two vocabularies with no declared mapping | `src/types.ts:1095-1147`; `statusPresentation.ts`; PO surfaces | PO rows | Mapping bugs at live integration; ambiguous status reporting | Declare an explicit bidirectional mapping | HIGH | HIGH |
| AV-044 | Simulation | Nine scenarios run the real domain seams deterministically | Scenario semantics inherit the `AV-013` deadline and the `AV-003` consequence; the safety gate itself is exemplary (main report §16) | **INFERENCE** | Unverified assumptions propagate through "demonstrations" | `src/lib/simulation/scenarioEngine.ts` | simulation rows; `simulation-control` e2e | A demo could present an invented rule as Amazon's | Correct the underlying claims; scenarios then inherit correctness | MEDIUM | HIGH |
| AV-045 | Delivery appointments | No delivery-appointment concept; `deliveryWindowEnd` shown as "Deliver by" | Carrier Central documents appointment-based delivery: the **Carrier Requested Delivery Date must fall within the PO's Delivery Window**; delivery-window compliance affects shipper/carrier performance — S15 | **INCOMPLETE** | A real operational step is missing from the shipment model | shipment types; shipment UI; `src/lib/dhl` / `palletline` seams | shipment rows; Phase 3 rows | Deliveries could be refused without an appointment | Add the appointment concept (Phase 3) | MEDIUM | HIGH |
| AV-046 | Marketplace rules | Assumption that no marketplace variation exists | Amazon states **no** UK-specific Vendor rule difference beyond the documented country table (S2, S3, S13) | **UNKNOWN** | Cannot assert either way beyond the table | docs; `ukMarketFit.ts` | market-fit rows | Low | State "no documented UK-specific difference found"; re-check in Phase 13 | LOW | MEDIUM |
| AV-047 | Receiving tolerances | No tolerance model | Not publicly documented in any source reached | **UNKNOWN** | Over/under-shipment allowances cannot be modelled | shipment/receiving types | shipment rows | Could mis-model shortage deductions | Source from Vendor Central reporting before modelling | MEDIUM | HIGH |
| AV-048 | Routing UI deadline | The 10am rule may exist in Vendor Central even though it is absent from the developer docs | Vendor Central help is sign-in gated; the API docs describe a 2-business-day pickup rule instead (S7, S8) | **UNKNOWN** | Determines whether `AV-013` is deleted or merely relabelled | `RoutingRequest.tsx` | shipment rows | Phase 3 timing | Verify in a signed-in Vendor Central session during Phase 13 | HIGH | MEDIUM |

---

## PART C — "DO NOT CHANGE" REGISTER

Behaviours that look unusual but are **deliberate Mercenta decisions**. These must **not** be
"corrected" merely because they are not Amazon rules.

| Existing behaviour | Why it exists | Evidence | Classification | Should remain? | Reason |
|---|---|---|---|---|---|
| Six commercial thresholds ship **UNSET** and route to `human_review` | Fail-closed: no invented commercial bar | `commercialReadiness.ts:391-430` | MERCENTA RULE | **YES** | Amazon publishes no such thresholds; inventing them would be the error |
| `MOQ_HONOUR_DISCLAIMER`, `CHANNEL_WILL_HONOUR_MOQ_IS_UNSUPPORTED`, `PO_QUANTITY_IS_NOT_DERIVED_FROM_MOQ` | Prevents implying a channel commitment that does not exist | `commercialReadiness.ts:378-384` | MERCENTA RULE | **YES** | Amazon has no MOQ concept at all |
| `PACK_MATHS_RULE` + the seven pack concepts | Real logistics arithmetic, separate from PO quantity | `commercialReadiness.ts:278-384`; `types.ts:3716-3745` | MERCENTA RULE (Amazon-compatible) | **YES** | Amazon's payloads use the same case/unit vocabulary |
| Direct brand facility → Amazon destination as the default launch route | Brands refuse to pre-position stock without PO evidence | `ukMarketFit.ts`; handoff §28.1#16 | MERCENTA RULE | **YES** | No Amazon rule requires a UK facility; the PO names the destination |
| Mercenta carrier rule (international → DHL; UK domestic → Palletline); brands cannot pick a carrier | Mercenta is the account holder; single-source commercial control | `shipping.ts:22-52` | MERCENTA RULE | **YES** | Amazon requires no specific carrier on prepaid lanes |
| PO → invoice → reconciliation → Xero → **human approval** → Wise payout; Stripe refused as a payout rail | No payout without human approval; Xero is accounting, not a bank | `payouts.ts`; canonical business model §7 | MERCENTA RULE | **YES** | No Amazon vendor payments API exists (S14) |
| `isProviderSimulationSafe` — unknown/not-registered is **never** simulation | Fail closed on integration state | `src/integrations/types.ts` | MERCENTA RULE | **YES** | Amazon's APIs are "Vendors only" and sandbox-gated; fail-closed is safer |
| The compliance gate blocks catalogue sync until documents are approved; manual admin approval cannot bypass documents | Regulatory risk control | `src/lib/compliance.ts`; canonical model | MERCENTA RULE | **YES** | Re-label the *attribution* (`AV-031`) but keep the gate |
| Brand case → Mercenta review → escalation (a brand can never open an external case directly) | One controlled voice to the channel | `CaseEscalationState`; canonical model §Cases | MERCENTA RULE | **YES** | Amazon documents vendor support cases but imposes no such mediation |
| Admin override of PO mapping/routing/compliance/shipment/payouts, always attributed and audited | Data-entry correction with a non-destructive audit trail | `AuditLogEntry`; canonical model §Admin override | MERCENTA RULE | **YES** | Amazon's own docs say order changes are manual via Vendor Central — Mercenta's overrides are **internal**, the correct boundary |
| Ten approved Amazon UK categories enforced via `isApprovedCategory` | Mercenta's own commercial scope | `src/types.ts` | MERCENTA RULE | **YES** | Not an Amazon-published list; keep it Mercenta's |
| Amazon wording safeguards (`AMAZON_PROGRAMME_STATUS = 'not_confirmed_with_amazon'`, banned-claim list, verification note) | Compliance: never claim an Amazon relationship/approval/guarantee | `src/lib/intelligence/amazonWording.ts`; `scripts/lint-wording.mjs` | MERCENTA RULE | **YES** (extend per `AV-042`) | Correct posture; the PO-guarantee phrasing gap should be closed |
| VAT production treatment unset; demo 20% labelled an illustration | Production tax treatment is a business decision, not an invention | `src/config/commercial.ts`; `src/config/vat.ts` | MERCENTA RULE | **YES** | Amazon requires tax details on invoices but does not set UK VAT treatment |
| The 24h countdown is **presentation only**; the PO's own status stays the domain status | Avoids coupling urgency display to domain state | `statusPresentation.ts:573-590` | MERCENTA RULE | **YES** | Correct separation; the rule itself is Amazon's (`AV-001`) |

---

## PART D — SUMMARY FOR HUMAN REVIEW

**Nothing in this register has been applied. No source file, test, registry or existing document was
modified. The repository is unchanged apart from the two new report files in `docs/`.**

- **Act first (CRITICAL, high confidence):** `AV-013` (unverified routing-request deadline presented
  as an Amazon rule), `AV-031` (UK/EU law mis-attributed to Amazon), `AV-027` (mandatory hub stage vs
  the direct-route default).
- **Then (HIGH):** `AV-006`, `AV-008`, `AV-010`, `AV-015`, `AV-019`, `AV-019b`, `AV-020b`, `AV-022`,
  `AV-023`, `AV-024`, `AV-032`, `AV-035`, `AV-040`, `AV-043`, `AV-048`.
- **Business decisions required (not corrections):** the route model / hub profiles, the lead-time
  target, inventory & 3PL assumptions, and ownership of the deduction taxonomy.
- **Evidence still to obtain (sign-in gated or Amazon-side):** vendor performance scorecards,
  receiving tolerances, deduction/dispute windows and codes, the Vendor catalogue submission route,
  the marketplace ID, and whether a Vendor Central routing-request UI deadline exists.

---

## POST-REGISTER CHANGE — 2026-09-21 clean-slate reconciliation

This register is a **record of the repository as audited on 2026-09-20**; its findings are unchanged.
One component it references was subsequently removed, so that finding's evidence pointer is annotated:

- **`AV-017` — `FcSelector` was REMOVED.** It was an unreachable orphan (zero importers across
  `src/`, `e2e/`, `scripts/`), and the FC list it rendered is canonical DATA
  (`src/types.ts → DEFAULT_UK_FC_LIST`) that the logistics map still plots while the PO's
  `shipToParty.partyId` remains the authoritative destination. **The AV-017 finding itself is
  unaffected** — the risk it records is that the 22-entry list may be mistaken for an Amazon-published
  directory, and that risk remains OPEN exactly as stated (recommended remediation: re-label as a
  Mercenta-maintained list; treat the PO as authoritative). Removing the component neither applied nor
  dismissed the finding; it removed a second, unreachable rendering of the same data.
- No other row in this register is affected. No source file was modified by the audit itself, and the
  audit's APPLIED count remains **0**.

---

## POST-REGISTER CHANGE — 2026-09-23 (P4, proxy-model corrections)

This register is a **record of the repository as audited on 2026-09-20**; its findings are unchanged. One
finding was **partially applied** in code by P4, so its evidence pointer is annotated:

- **`AV-040` — PARTIALLY APPLIED (one of the eight documented operations).** The register records four
  modelled SP-API methods and seven missing Vendor operations. P4 implemented the one the proxy model
  requires — **`submitAcknowledgement`** — on BOTH sides of the seam (`src/lib/spapi/client.ts` for the real
  Edge-Function transport, `src/lib/spapi/mockClient.ts` for the deterministic simulation), Mercenta-side
  only, with the mock exercising success **and** its refusal paths and the real client still refusing without
  a verified connection. The finding is **NOT dismissed**: `getPurchaseOrdersStatus` (receiving sync),
  `submitShipmentRequest`, `getShipmentDetails`, `getShipmentLabels` (honest UK/EU refusal), `submitShipmentConfirmations`,
  `submitInvoices` and `submitInventoryUpdate` remain **NOT IMPLEMENTED** and stay assigned to P12. The
  remediation recommendation ("extend the seam, mock first, to the documented operations") is therefore
  **in progress, not complete**, and the register's HIGH/HIGH risk rating is unchanged.
- No other row in this register is affected by P4. The wording safeguards (`AV-042`) are unchanged and
  `npm run validate:wording` still reports zero outward-facing violations.

---

## POST-REGISTER CHANGE — 2026-09-23 (P5, the Mercenta Hub removed as a destination)

This register is a **record of the repository as audited on 2026-09-20**; its findings are unchanged. **Two findings
were APPLIED in code by P5**, so their evidence pointers are annotated:

- **`AV-026` — APPLIED, and the finding was already INFORMATIONAL.** The register records that a direct brand facility →
  the required destination is the default launch route, that Amazon documents no requirement to route through a UK
  facility, and that "the destination is the PO's `shipToParty`". The platform previously contradicted that in code by
  hardcoding `destination: 'Mercenta UK Hub'`. P5 removed the hub: the destination is now **the FC declared on the
  purchase order**, modelled as `PurchaseOrder.shipToParty` (the channel's `shipToPartyId`, register `S5`) and resolved
  by the ONE owner `src/config/destinationFc.ts`. The wording is now as honest as the model: no Mercenta intermediate
  hub is asserted anywhere.
- **`AV-027` — APPLIED (the finding's own remediation, in the form the Founder decision specified).** The register
  recorded the linear stage chain as **CONTRADICTED** — "the canonical stage enum reads as a mandatory hub mandate",
  HIGH/HIGH — and recommended re-modelling it so a UK hub is not universal. P5 removed `mercenta_hub` from
  `ShipmentStage`, `ShipmentStatus`, `STAGE_LABELS`, `STATUS_LABELS` and `STAGE_ORDER` (`src/types.ts`), replaced by
  `destination_fc` — *arrival at the FC on the PO* — and removed the hub coordinate (`MERCENTA_UK_HUB`), the hub node
  kind (`GeoNodeKind`), the Hero's hub node (`MERCENTA_HUB_PLACE`) and the hub's UK-tile handling
  (`src/lib/logistics/heroNetwork.ts`). The carrier transforms that advanced a domain shipment to the hub
  (`src/lib/dhl/transform.ts`, `src/lib/palletline/transform.ts` — `delivered`) now advance it to `destination_fc`,
  which is what a carrier `delivered` milestone actually means.
- **Fail-closed, not silently re-pointed.** A record that still names a Mercenta hub (or any undeclared place) now
  returns `null` from `resolveGeoPlace` and is drawn as a schematic leg — it is never plotted at the hub's old
  coordinate. A PO that declares no ship-to party records the explicit `DESTINATION_NOT_DECLARED` string
  (`src/config/logisticsGeo.ts`) rather than any Mercenta-chosen site.
- **The register's other 50 findings are untouched**, including `AV-017` (the FC directory is still Mercenta convenience
  data, and the PO remains the authoritative destination — P5 makes the PO authoritative **in code** as well as in
  wording) and `AV-040` (unchanged: one of eight operations implemented by P4; the rest stay with P12). The audit's
  APPLIED count was 0 at audit time; two findings have since been applied by later, separately verified increments.

---

## POST-REGISTER CHANGE — 2026-09-24 (§P12) and 2026-09-29 (Batches 2f / 2g)

This register remains the **record of the repository as audited on 2026-09-20**; its findings are unchanged. Later,
separately verified increments have since applied some of them, so their evidence pointers are annotated:

- **`AV-040` — PARTIALLY APPLIED (six of the seven named operations).** §P12 (2026-09-24) implemented the rest of
  the documented Vendor surface on BOTH clients of the seam — `getPurchaseOrdersStatus`, `submitShipmentRequest`
  (= `SubmitShipments`), `getShipmentDetails`, `getShipmentLabels` (refused BY RULE outside NA),
  `submitShipmentConfirmations`, `submitInvoices` and `submitInventoryUpdate`. Together with `submitAcknowledgement`
  (§P4) that is **eight seam operations**, gated by `npm run validate:p12-spapi-seam` (**59 assertions**, executing
  the real modules). The finding is **NOT dismissed**: **`getTransaction` (the Vendor Retail Procurement Transaction
  Status API, source `S12`) remains NOT implemented**, and it is **BLOCKED ON EVIDENCE** — the project's research
  records no request/response shape and no status vocabulary for it, so modelling it would be invention. **Batch 2g
  (2026-09-29)** corrected the disposition record, which had still read "OPEN — not applied" and therefore
  under-reported the eight operations that actually exist; that stale claim is now pinned against by the gate.
- **`AV-042` — APPLIED (Batch 2f, 2026-09-29).** The programme-claim rule set in
  `src/lib/intelligence/amazonWording.ts` now catches purchase-order guarantee phrasing in **both** word orders,
  plus the four phrasings `.clinerules/mercenta-business-model.md` bans by name that the set previously let
  through. Gated by `npm run validate:wording-guard`. `scripts/lint-wording.mjs` enforces a **different**
  (channel-naming) rule set and is unchanged.


---

## POST-REGISTER CHANGE — 2026-10-03 (Batch 2p, the four INFERENCE relabels)

This register remains the **record of the repository as audited on 2026-09-20**; its findings are unchanged. Batch 2p
applied the four remaining **INFERENCE** rows, so their evidence pointers are annotated:

- **`AV-002` — APPLIED.** The acknowledgement consequence is stated as a **risk**, never an unstated certainty: the
  ack-overdue label reads *"at risk of cancellation"*, the notification copy asserts no cancellation, and the stale
  `PurchaseOrder` comment that still read *"at risk of forced cancellation"* is corrected at source. (The register's
  original carrier `postmarkNotifier.ts` no longer exists; the surviving carriers are `statusPresentation.ts` and the
  notification module.) Gated by `npm run validate:inference-relabels` (repo-wide, comment-stripped sweep: no `src/`
  CODE asserts "forced cancellation").
- **`AV-017` — APPLIED.** `src/types.ts → DEFAULT_UK_FC_LIST` is re-declared as a **MERCENTA-MAINTAINED convenience
  list**, never an Amazon-published directory (no channel source publishes one, `S5`), and the PO's `shipToParty`
  remains the authoritative destination (`src/config/destinationFc.ts`). Gated by `npm run validate:inference-relabels`.
- **`AV-025` — APPLIED.** The internal fulfilment track is labelled from its ONE owner **"Brand-direct supply"**
  (`src/config/fulfillmentTrack.ts`), never the channel's **Vendor Direct Fulfillment** programme name; every surface
  and the agreement clause header read the owner. Gated by `npm run validate:inference-relabels`; the three browser
  specs that asserted the old label were repointed (16 passed).
- **`AV-044` — APPLIED.** The deterministic simulation carries no unverified channel claim (it inherits the corrected
  `AV-013` / `AV-003` claims) and keeps its safety gate that refuses a non-simulation provider. Gated by
  `npm run validate:inference-relabels`.
- No other row is affected. **`AV-033`** (the fifth INFERENCE) stays **EVIDENCE-BLOCKED**. The audit's APPLIED count was
  0 at audit time; the four rows above are the last INFERENCE findings to leave the open set.

- The register's other findings are untouched. The audit's APPLIED count was 0 at audit time.