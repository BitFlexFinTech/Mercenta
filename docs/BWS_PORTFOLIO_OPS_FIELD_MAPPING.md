# §BWS PORTFOLIO OPS — FIELD MAPPING (for approval, before any wiring)

**Screen:** `src/next/screens/bws/BwsPortfolioOpsScreen.tsx` → view `BwsPortfolioOpsView.tsx`
**Sections:** `brand-portfolio` · `partner-portal` · `import-excise` · `brand-growth` · `reports-analytics` · `settings`
**Source of the new data:** `src/data/bws/**` (Dash-1 @ `c40c541`), via `src/data/verticalData.ts`
**Today:** every prop below is built from **CORE** hooks (`useBrands`, `useProducts`, `usePurchaseOrders`, `useShipmentsAll`, `useComplianceDocuments`, `useCommissions`, `useAdSpendBudgets`). Those are removed from this screen when wired.
**Record volumes in the source:** BRANDS **88** · PRODUCTS **89** · UK_DISTRIBUTION_RECORDS **88** · AMAZON_UK_LISTINGS **88** · PORTFOLIO_BRANDS **4** · INITIAL_VENDOR_CENTRAL_POS **4** · WHOLESALE_ORDERS **4** · INVENTORY_ITEMS **4** · COMPLIANCE_RECORDS **4** · IMPORT_EXCISE_RECORDS **4** · PARTNER_ACCOUNTS **4** · GROWTH_SERIES **6** · COUNTRIES **12** · DISTILLER_DIRECTORY **12**.

---

## 1. BRAND ROWS (`brands: BwsBrandPortfolioRow[]`)

| View field | Today (CORE) | Proposed (BWS) | Note |
|---|---|---|---|
| `id` | brand id | `PORTFOLIO_BRANDS.brandId` | — |
| `businessName` | `brand.profile.businessName` | `PORTFOLIO_BRANDS.brandName` | — |
| `category` | `brand.category` | `PORTFOLIO_BRANDS.categories[0]` | source stores an array; the first is its `primaryCategory` |
| `nation` | `brand.nation` | `PORTFOLIO_BRANDS.countryName` | — |
| `trackLabel` | `fulfillmentTrackLabel(brand.track)` | **`portfolioStatus`** | **semantic change:** BWS has no CORE fulfilment track. The label becomes the source's own status text, e.g. "Active Wholesale & Vendor Central 1P". |
| `contractStatus` | `brand.contractStatus` | **`portfolioStatus`** (same value) | BWS has no contract model; one field fills both, shown as the source's status. |
| `skuCount` | count of CORE products | `PORTFOLIO_BRANDS.skuCount` | — |
| `poCount` | CORE POs for brand | count of `INITIAL_VENDOR_CENTRAL_POS` for that `brandId` | — |
| `poValueGbp` | sum of CORE `poValue` | sum of `INITIAL_VENDOR_CENTRAL_POS.totalCostGbp` for that `brandId` | — |
| `approvedDocsCount` | approved CORE docs | `COMPLIANCE_RECORDS` for that `brandName` with `documentationStatus === 'Complete'` | the source's own status |
| `totalDocsCount` | CORE docs count | `COMPLIANCE_RECORDS` for that `brandName` | — |

**D1:** the portfolio holds **4** records while the source holds **88** brands. Showing 4 is faithful to "active portfolio" but hides 84 — the table must say **"4 active portfolio brands (of 88 in the source)"**. Confirm the wording.

---

## 2. PARTNER POs (`partnerPos`)

| View field | Today | Proposed (BWS) |
|---|---|---|
| `id` | CORE PO id | `INITIAL_VENDOR_CENTRAL_POS.id` |
| `poNumber` | `poNumber` | `poNumber` (e.g. `PO-AMZ-UK-749102`) |
| `statusLabel` | `poStatusPresentation(status).label` | **`status` verbatim** (e.g. "WePrep 1P ASN Queued") |
| `statusTone` | derived from CORE status | explicit map: `Queued`→info · `Held`/`Blocked`→warning · `Complete`/`Dispatched`→success |
| `poValueGbp` | `poValue` | `totalCostGbp` |
| `orderDate` | `orderDate` | `poReceivedDate` |

---

## 3. PARTNER SHIPMENTS (`partnerShipments: BwsShipmentCustomsRow[]`)

| View field | Today | Proposed (BWS) |
|---|---|---|
| `id` | CORE shipment id | `WHOLESALE_ORDERS.id` |
| `reference` | shipment reference | `orderNumber` |
| `carrier` | CORE carrier | parsed from `deliveryTracking` (e.g. "… · Palletline") |
| `origin` | origin | `warehouse` |
| `destination` | destination | `counterparty` |
| `statusLabel` | shipment status label | `fulfilmentStatus` verbatim |
| `statusTone` | derived | explicit map: ASN Queued→info · Dispatched→success · Held→warning |

---

## 4. EXCISE ROWS (`exciseRows: BwsExciseCustomsRow[]`) — THE ONE REAL GAP

The source's 89 products carry **no** `commodityCode`, `vatStatus`, `hazmat` or `exWorksGbp` — **measured: 0/89 for each**.

| View field | In BWS? | Proposal |
|---|---|---|
| `productId` | ✅ | `PRODUCTS.id` |
| `brandName` | ✅ | `PRODUCTS.brandName` |
| `sku` | ✅ (as `id`) | `PRODUCTS.id` |
| `productName` | ✅ | `PRODUCTS.name` |
| `commodityCode` | ❌ | render **"—"** + section note "not provided by Dash-1" |
| `vatStatus` | ❌ | render **"—"**, same note |
| `hazmat` | ❌ | render **"—"**, same note |
| `exWorksGbp` | ⚠️ nearest is `illustrativeWholesaleGbp` | **D2:** show `illustrativeWholesaleGbp` **labelled "illustrative wholesale"**, or render "—". I will not present a wholesale price as an ex-Works cost. |

---

## 5. CUSTOMS SHIPMENTS (`customsShipments`)

Proposed: `IMPORT_EXCISE_RECORDS` → `shipmentRef` / `supplier` / `countryOfOrigin` as reference / origin, `customsStatus` + `exciseDutyStatus` as the status label, tone from `importReadiness` (`In Wet-Bond Storage`→info · `Held`→warning).

---

## 6. GROWTH (`growthSkus`, `poTrendSeries`, `carrierSeries`)

| View field | In BWS? | Proposal |
|---|---|---|
| `growthSkus[].sku` | ✅ | `PRODUCTS.id` |
| `growthSkus[].productName` / `brandName` | ✅ | `PRODUCTS.name` / `brandName` |
| `growthSkus[].score` | ⚠️ | `AMAZON_UK_LISTINGS.rangeCoveragePct` (a real source figure) — **D3:** acceptable, or blank? |
| `growthSkus[].issuesCount` / `recommendationCount` | ❌ | **—** (no source) |
| `poTrendSeries` | ✅ | `GROWTH_SERIES` → `month` / `amazonUkGbp` |
| `carrierSeries` | ⚠️ | count of `WHOLESALE_ORDERS` by the carrier parsed from `deliveryTracking` (only 4 records) |

---

## 7. REPORTS (`reportRows`)

| View field | In BWS? | Proposal |
|---|---|---|
| `poNumber`, `brandName`, `orderDate` | ✅ | `INITIAL_VENDOR_CENTRAL_POS` |
| `statusLabel` | ✅ | `status` verbatim |
| `poValueGbp` | ✅ | `totalCostGbp` |
| `commissionGbp` | ❌ | **—**, with the column stating "not provided by Dash-1" (BWS is not a commission model) |

---

## 8. FIELDS THAT STAY AS THEY ARE (not vertical data)

`integrationStatuses` (provider modes) · `actingStaffName` · `canMutate` · `onExportCsv` · `onNavigateView` · `section` · `loading` · `error` · `onRetry` — session / integration state, unchanged.

---

## 9. TWO BANNERS THAT BECOME FALSE AND MUST CHANGE WITH THE WIRING

- `brand-portfolio` banner today: *"Vertical isolation pending backend schema — displaying all canonical Mercenta brands because DemoBrandRow / BrandProfile does not yet define a vertical discriminator."* → **false now** (the discriminator exists and the data is Dash-1's). Replaced by a statement naming Dash-1 and the record counts.
- `import-excise` banner today: *"Alcohol excise & AWRS fields omitted (not modelled) … from Dash-1"* → **false now**. The source DOES carry AWRS/EORI at partner level (`PARTNER_ACCOUNTS.mercentaAwrsUrn`, `mercentaEori`) and duty/bond status at shipment level, but **not** per-SKU commodity / VAT / hazmat.

---

## 10. DECISIONS I NEED BEFORE WRITING CODE

- **D1** — portfolio wording: "4 active portfolio brands (of 88 in the source)".
- **D2** — `exWorksGbp`: show `illustrativeWholesaleGbp` labelled "illustrative wholesale", or render "—"?
- **D3** — growth `score`: use `AMAZON_UK_LISTINGS.rangeCoveragePct`, or leave blank?
- **D4** — confirm the three **"not provided by Dash-1"** columns (commodity code, VAT status, hazmat) stay visible as "—" rather than being hidden.

**No wiring code has been written.** On approval of these four points I wire this screen, prove it by rendering (it is currently showing CORE data), and move to `BwsIntelligenceScreen` with its own mapping table.
**What the source DOES provide for this section:** `IMPORT_EXCISE_RECORDS` (4) supplies shipment-level `customsStatus`, `exciseDutyStatus`, `bondFacility`, `importReadiness`, `outstandingItems`. Proposal: a second, clearly separated list headed **"Import & bond status (shipment level)"**, because those are not per-SKU.