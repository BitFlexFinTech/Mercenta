# Mercenta Partners — Redesign Notes & Phase 1–3 Parity Audit

Scope of this handoff: **Phases 1, 2, and 3 only**. Phases 4–6 are intentionally not yet implemented pending review of this shell, the first three rebuilt workflows, and the capability parity tables below.

---

## 1. Architecture & File Separation (`src/next/`)

Every screen in `src/next/` strictly separates pure presentation (`*View.tsx`) from domain hooks and commands (`*Screen.tsx` + `*Actions.ts`), uses plain function declarations (zero `React.FC`, zero `forwardRef`), and introduces zero new business rules:

- `src/next/next.css`: Tailwind CSS v4 tokens (`11 / 12 / 14 / 16 / 20 / 24 px` type scale, `#FAFAFA` canvas, `#FFFFFF` cards, `#E4E4E7` 1 px hairlines, `#09090B` ink, `#C2410C` single AA 5.18:1 accent, `.tabular-nums`) plus `.mercenta-next` semantic token compatibility aliases so canonical Mercenta child panels (`PoDocumentQueuePanel`, `PoDocumentPackPanel`, `BrandCommPanel`, `CarrierProviderConfigurationPanel`, `CommerceSimulationPanel`) render inside the new shell without modifying `src/index.css` or `src/components/**`.
- `src/next/navConfig.ts`: Canonical nav definitions + RBAC filtering (`visibleNavItemsForSurface`) covering all 4 operating surfaces (`core_brand`, `core_admin`, `bws`, `talent_commerce`).
- `src/next/shell/NextShell.tsx`: Responsive shell (fixed 256 px sidebar on desktop `lg:`, slide-over drawer `<1024px`, 3-zone top bar, Super-Admin portfolio filter strip, Phase 4–6 placeholder fallback, and switch to Legacy UI / Preview Harness).
- `src/next/components/ConsolePrimitives.tsx`: Shared `PageHeader`, `LoadingRows`, `ErrorStateBlock`, `EmptyStateBlock`, `MetricStrip`, `InlineStatus`, `ConsoleTable` (desktop table + `<768px` responsive cards + 25-row pagination), and `SlideOverDrawer` (`Escape` close, backdrop dismiss).
- `src/next/adsConfig.ts`: Policy + vertical terminology registry (`resolveAdsSurfacePolicy`).
- `src/next/__preview__/PreviewHarness.tsx`: Offline pure-View preview harness with Populated / Loading / Error / Empty states and round fixture numbers (`£10,000`, `£2,500`, `500` units).

---

## 2. Capability Parity Tables (`OLD CAPABILITY → NEW LOCATION`)

### 2a. `brand → purchase_orders` (`src/components/brand/BrandPurchaseOrders.tsx` → `src/next/screens/brand/BrandPurchaseOrdersView.tsx` & `BrandPurchaseOrdersScreen.tsx`)

| Old Capability (`BrandPurchaseOrders.tsx`) | New Location (`src/next/`) | Status / Notes |
|---|---|---|
| Tenant-scoped PO list (`usePurchaseOrders`, filtered to `session.tenantId`) | `BrandPurchaseOrdersScreen.tsx` → `ConsoleTable` in `BrandPurchaseOrdersView.tsx` | Complete parity |
| Deep-link PO selection via `?po=` (`useRecordDeepLink('po')`) | `BrandPurchaseOrdersScreen.tsx` (`deepLinkPoNumber` prop) expands matching PO row | Complete parity |
| 4 clickable KPI drill-down cards (Total POs, Received / actionable, Under Review, Queue Value GBP) | `MetricStrip` (`metrics`) toggling `statusFilter` | Complete parity |
| Search by PO number + status filter (`PO_STATUS_ORDER`) | Filter toolbar (`search`, `statusFilter`) | Complete parity |
| Density toggle (`compact` / `comfortable`) | Density segmented control (`density` state) passed to expanded PO workspace | Complete parity |
| CSV export (`downloadCsv`) | `PageHeader` `Export CSV` button | Complete parity |
| Slide-over Preview Drawer (`data-state="brand-po-preview-*"`) | `SlideOverDrawer` (`BrandPoPreviewBody` + drawer `Acknowledge` & `Open full record` triggers) | Complete parity |
| Channel revision notice + stale ack warning (`poRevisionState`, `PO_REVISION_RULE_TEXT`, `PO_CHANNEL_CHANGE_KIND_LABELS`) | `ChannelRevisionNotice` inside row expansion & preview drawer | Complete parity |
| Acknowledged price discrepancy notice (`ackPriceDivergences`, `ACK_INVOICE_PRICE_RULE_TEXT`) | `AckPriceNotice` inside row expansion & preview drawer | Complete parity |
| Retail channel hold / lifted duty notice (`poChannelHoldDuty`) | `ChannelHoldNotice` & `HoldDutyLine` | Complete parity |
| Implicit rejection omission notice (`implicitlyRejectedLines`, `PO_ACK_COMPLETENESS_RULE_TEXT`) | `ImplicitRejectionNotice` | Complete parity |
| Brand-granted on-behalf decision authorisation (`poOnBehalfAuthority`, grant + withdraw with note) | `OnBehalfAuthorisationBlock` (`authoriseOnBehalfDecisions`, `withdrawOnBehalfAuthorisation`) | Complete parity |
| Line-item acknowledgement + amendment window (`poAcknowledgementWindow`, `poAmendmentWindow`, `canBackOrderLine`, accepted/backordered/rejected, qty, unit £, scheduledShipDate, `PO_REJECTION_CODES`, `poAcknowledgementCompleteness`) | Inline acknowledgement panel (`ackingPoId`) + `runPoAcknowledgement` (`acknowledgePurchaseOrder` + `processPendingChannelInstructions`) | Complete parity |
| On-behalf rejection draft card + 1-click brand approval (`poOnBehalfRejectionDraft`, `approveOnBehalfRejection`) | `onBehalfDraft` alert block + `runApproveOnBehalf` | Complete parity |
| Mercenta channel instruction outcome status (`listChannelInstructions` via `useCanonicalStoreVersion`) | `primaryInst` & `correctionInst` outcome block (`channelAcknowledgement`, `routingRequest`, `asn`) | Complete parity |
| Post-acceptance `Packing differs` physical carton correction (`issueChannelInstruction('packing_correction')`, `RoutingRequestStatus`, `ShippingCostEstimate`) | Inline `correctionPoId` block + `runPackingCorrection` (suppressed when `isFinancedBrand`) | Complete parity |
| Inline Freight Collect `RoutingRequestIndicator` badge per row | Rendered in `PO Reference` cell when `po.freightTerm === 'collect'` | Complete parity |
| Backorder 7-day restock countdown (`BACKORDER_RESTOCK_TARGET`) & line `ackHistory` audit table | Rendered inside expanded PO panel | Complete parity |
| Financed vs Direct track guidance callout (`fulfillmentTrackLabel`) | Rendered at footer of expanded PO panel | Complete parity |
| Inline message & call logging (`BrandCommPanel`) | Rendered via `renderCommPanel` slot when row Message / Call icon clicked | Complete parity |
| Accepted PO handoff to Logistics (`Docs` / `navigateProductView('brand', 'logistics', recordLinkQuery('po', ...))`) | `Docs` action button (`po-open-documents-*`) → opens `core_brand → logistics?po=...` | Complete parity |
| Simulation ledger footer (`CommerceSimulationPanel`) | Rendered via `simulationFooter` slot | Complete parity |
| Loading, Error + Retry, Empty states | `LoadingRows`, `ErrorStateBlock`, `EmptyStateBlock` | Enhanced parity |

---

### 2b. `brand → logistics` (`src/components/brand/LogisticsHub.tsx` → `src/next/screens/brand/BrandLogisticsView.tsx` & `BrandLogisticsScreen.tsx`)

| Old Capability (`LogisticsHub.tsx`) | New Location (`src/next/`) | Status / Notes |
|---|---|---|
| Tenant-scoped shipment feed (`useShipmentsAll`) joined with `usePurchaseOrders` for `freightTerm` | `BrandLogisticsScreen.tsx` (`rows` + `buildOperationalMap`) | Complete parity |
| Deep-link PO selection via `?po=` (`useRecordDeepLink('po')`) | `deepLinkPoNumber` auto-selects matching consignment & opens Inspector drawer | Complete parity |
| 8 KPI metrics across consignment volume, transit, exceptions, evidence truth, On-time delivery, ETA coverage | 2 × 4-column `MetricStrip` (`topMetrics` + `evidenceMetrics`) | Complete parity |
| Clickable Delivery Performance & ETA Basis / Appointment drill-downs (`buildDeliveryPerformance`, `etaPresentation`, `isEtaAtRisk`, `appointmentPresentation`) | Interactive `insight` panel toggled by `On-time delivery` & `ETA coverage` metric tiles | Complete parity |
| Shipping documents download queue (`PoDocumentQueuePanel` at `scope="brand"`) | `renderDocumentQueueSlot` (connected to `WaybillDialog` & `LabelsDialog`) | Complete parity |
| Search + Evidence Truth filter (`live_verified`, `simulated`, `ambient`) + Lane filter (`international`, `uk`, `exceptions`) + Status filter + Clear filters | Filter bar above `ConsoleTable` | Complete parity |
| Consignment list with route, operational truth classification, status, exception warning, value & CBM | `ConsoleTable` (desktop hairline rows, `<768px` responsive cards, 25/page pagination) | Complete parity |
| Consignment Inspector (status, truth & `truthReason`, origin/dest resolution, `etaPresentation`, `appointmentPresentation`, `freightSemantics`, `expectedCarrier`, `carrierValidationError`) | `SlideOverDrawer` (`data-testid="logistics-inspector"`) | Complete parity |
| Per-PO Document Pack (`PoDocumentPackPanel` showing Commercial Invoice, Packing List, Labels, Waybill & Collect Chain) | `renderDocumentPackSlot` inside Consignment Inspector drawer | Complete parity |
| Freight Collect vs Prepaid rule card + derived `deriveCarrierEligibility` breakdown + `CarrierProviderConfigurationPanel` (`scope="brand"`) | Persistent right-hand context rail (`How carriage is arranged` + `Carrier providers`) | Complete parity |
| Freight Waybill artefact dialog (inline barcode + standalone HTML download via `downloadHtml` + print) | `WaybillDialog` (`SlideOverDrawer`) | Complete parity |
| Carrier Shipping Labels artefact dialog (HTML download + print) | `LabelsDialog` (`SlideOverDrawer`) | Complete parity |
| 7-milestone Tracking Timeline + joined PO products (`ProductThumb`) | `TrackingDialog` (`renderTrackingProducts`, improved to match by `p.sku` as well as `p.id`) | Complete parity |
| PO-driven ASN consignment creation (`createShipmentForPO` in `src/data/api.ts`) | Added optional `Create ASN consignment` drawer in `BrandLogisticsView` whenever `acceptedUnshippedPos.length > 0`, validating regulated category lot/expiry & `selectCarrierForShipment` | Added explicit Parity+ wiring |
| Loading, Error + Retry, Empty states | `LoadingRows`, `ErrorStateBlock`, `EmptyStateBlock` | Complete parity |

---

### 2c. Unified Ads Manager (5 entry points → `src/next/adsConfig.ts` + `src/next/screens/ads/AdsManagerView.tsx` & `AdsManagerScreen.tsx`)

Routes served by the single unified implementation:
1. `core_brand → ads_management` (`BrandAdvertising.tsx` replacement, `vertical="core"`, `scope="brand"`)
2. `core_admin → ads_management` (`Admin` Unified Ads Manager, `vertical="core"`, `scope="admin"`)
3. `core_admin → amazon_ads` (`AmazonAdsDashboard.tsx` replacement, `vertical="core"`, `scope="admin"`)
4. `bws → campaign-studio` (BWS operating model from `Dash-1`, `vertical="bws"`, `scope="admin"`)
5. `talent_commerce → campaigns` (Talent Commerce model from `CAA-TalAg`, `vertical="talent_commerce"`, `scope="admin"`)

| Old Capability (`BrandAdvertising.tsx` & `AmazonAdsDashboard.tsx`) | New Location (`src/next/screens/ads/`) | Status / Notes |
|---|---|---|
| Tenant-scoped Brand Advertising budget KPIs (`monthlyBudgetGbp`, `spendToDateGbp`, utilisation, ACOS, TACOS, budget status) | `AdsManagerView` (`policy.scope === 'brand'`) `MetricStrip` + `BudgetAllocationPanel` | Complete parity |
| Simulation vs live Amazon Ads integration status notice (`modes.amazon_ads`) | Page header meta + explicit simulation basis callout | Complete parity |
| Brand recommended budget review queue (`proposed`, `approved`, `amended`, `rejected`) with Approve / Amend (amount + note) / Decline (`reviewAdSpendRecommendation`) | `RecommendationReviewList` in Brand view (`actorId: tenantId`) | Complete parity |
| Brand campaign table + campaign drill-down (impressions, clicks, attributed sales, ACOS, placement, sourceLabel) | `ConsoleTable` of `brandCampaigns` + campaign detail `SlideOverDrawer` | Complete parity |
| Admin / Portfolio 6-KPI summary (Managed Brands, Monthly Budget, Spend to Date, Remaining, Avg ACOS, Avg TACOS) | `MetricStrip` (`columns={6}`) in `policy.scope === 'admin'` | Complete parity |
| Portfolio search + focus filters (`All`, `Active only`, `Not configured`, `Over budget`) + Utilisation % sort | Filter toolbar in Portfolio view | Complete parity |
| Portfolio brand budget inline editor (`setAdSpendBudget` gated by `canCurrentUserMutate`) | Inline input + `Save` button per row (read-only notice when `canCurrentUserMutate === false`) | Complete parity |
| Admin on-behalf recommendation review inside Brand Inspector (`reviewAdSpendRecommendation` with `actorId: actingStaffId`) | Brand detail `SlideOverDrawer` (shows campaigns + pending proposals + on-behalf decision controls when `canCurrentUserMutate`) | Complete parity |
| BWS & Talent Commerce policy differentiation (`verticalLabel`, `campaignNoun`, `terminologyNote`, explicit backend gap disclosure) | `src/next/adsConfig.ts` (`resolveAdsSurfacePolicy`) + scope notice in header/callout | Complete parity without invented fields |

---

## 3. Exact Data Layer Contracts Used (Phases 1–2)

### Query Hooks (`src/data/queries.ts`)
- `useBrands()` → React Query result wrapping `fetchBrands(): Promise<{ data: DemoBrandRow[]; source: DataSource }>` (`queryKey: ['brands']`)
- `usePurchaseOrders()` → React Query result wrapping `fetchPurchaseOrders(): Promise<{ data: PurchaseOrder[]; source: DataSource }>` (`queryKey: ['purchase-orders']`)
- `useShipmentsAll()` → React Query result wrapping `fetchShipmentsAll(): Promise<{ data: (Shipment & { eta?: ShipmentEta; appointment?: DeliveryAppointment })[]; source: DataSource }>` (`queryKey: ['shipments']`)
- `useAdSpendBudgets()` → React Query result wrapping `fetchAdSpendBudgets(): Promise<{ data: AdSpendBudget[]; source: DataSource }>` (`queryKey: ['ad-spend']`)
- `useAdCampaigns()` → React Query result wrapping `fetchAdCampaigns(): Promise<{ data: AdCampaign[]; source: DataSource }>` (`queryKey: ['ad-campaigns']`)
- `useAdSpendRecommendations()` → React Query result wrapping `fetchAdSpendRecommendations(): Promise<{ data: AdSpendRecommendation[]; source: DataSource }>` (`queryKey: ['ad-recommendations']`)
- `useCanonicalStoreVersion()` → returns `number` incrementing on canonical instruction/shipment store writes.
- *Context hooks (`useApp`, `useIntegrations`)* provide `session`, `role`, `staff`, `actingStaffId`, `canCurrentUserMutate`, `products`, `modes`, `integrations`.

### Commands Wired
- Purchase Orders (`src/next/screens/brand/poActions.ts`):
  - `acknowledgePurchaseOrder(poId, lineAcks)` (`@/data/api`) followed by `processPendingChannelInstructions()` (`@/lib/commerce/proxyProcessor`)
  - `issueChannelInstruction({ type: 'packing_correction', ... })` (`@/lib/commerce/channelInstructions`) + `processPendingChannelInstructions()`
  - `approveOnBehalfRejection(poId, { actorBrandId, actorLabel, draftId })` (`@/data/api`) + `processPendingChannelInstructions()`
  - `authoriseOnBehalfDecisions(poId, { recordedBy, note })` (`@/data/api`)
  - `withdrawOnBehalfAuthorisation(poId, { withdrawnBy, reason })` (`@/data/api`)
  - *Note on `updatePurchaseOrderStatus`*: Admin-level status override lives in admin PO pipelines; brand decisions strictly flow through `acknowledgePurchaseOrder` + `approveOnBehalfRejection` per canonical contract.
- Logistics (`src/next/screens/brand/logisticsActions.ts`):
  - `createShipmentForPO(poId, asn, actorStaffId, actingBrandId)` (`@/data/api`) for accepted unshipped POs, enforcing carrier lane rules, lot/expiry requirements on Grocery & Health & Personal Care categories, and acknowledged qty ceiling validation.
  - Channel-instruction auto-creation via `processPendingChannelInstructions()` remains preserved for newly accepted POs.
- Ads Manager (`src/next/screens/ads/AdsManagerScreen.tsx`):
  - `setAdSpendBudget(brandId, monthlyBudgetGbp, actingStaffId)` (`@/data/api`)
  - `reviewAdSpendRecommendation(recId, decision, { amendedBudgetGbp, note, actorId })` (`@/data/api`)

---

## 4. Documented Gaps, Omitted Controls & Needed Backend Records

In strict accordance with the truth & zero-fabrication rules, the following features inspired by `Dash-1` (BWS) and `CAA-TalAg` (Talent Commerce) are **omitted or explicitly disclosed** in `AdsManagerView` and `NextShell`:

1. **Super-Admin Vertical Filter (`Brand.vertical` Blocker)**:
   - `DemoBrandRow` (`src/data/demoData.ts`) and `BrandProfile` (`src/types.ts`) currently expose `id`, `category`, `track`, `contractStatus`, `profile`, and `nation`, **not `vertical`**.
   - Choosing `Core`, `BWS`, or `Talent Commerce` in `NextShell`'s Super-Admin filter bar intentionally yields 0 records with an explicit warning notice rather than inferring `vertical` from product category strings.
   - **Needed backend record**: Add `vertical?: 'core' | 'bws' | 'talent_commerce'` on the `brands` table, `DemoBrandRow`, and `fetchBrands()` mapper.
2. **Campaign Creation / Pause / Resume / Targeting Edits**:
   - `src/data/api.ts` only exposes `setAdSpendBudget` and `reviewAdSpendRecommendation`. No campaign mutation endpoint (`createAdCampaign`, `updateAdCampaignStatus`, `updateCampaignTargetAcos`) exists yet, so campaign create/pause/resume buttons are **omitted** rather than faked with local React state.
   - **Needed backend endpoints**: `createAdCampaign(brandId, payload)` and `updateAdCampaignStatus(campaignId, status, actorId)` persisted via `ad_campaigns` + audit log.
3. **Creative Assets Library (`CreativeAsset`, `useCreativeAssets`, CRUD)**:
   - Referenced in `CAA-TalAg` (`assets` view and campaign creative briefs), **absent** from `src/types.ts`, `src/data/queries.ts`, and `src/data/api.ts`. Omitted from `AdsManagerView` with a factual unavailable callout.
   - **Needed backend schema & hooks**: `CreativeAsset` type, `useCreativeAssets()` hook, and `createCreativeAssetAPI` / `updateCreativeAssetAPI` / `deleteCreativeAssetAPI` / `submitCreativeAssetAPI`.
4. **Domain-Specific Fields Not Present in Mercenta Types**:
   - **Dash-1 (BWS)**: Duty-suspended bond status, AWRS number, ABV / duty-band / case-size economics, bottle-vs-case channel splits, and channel/retailer ad placements (`Amazon Sponsored`, `Tesco/Sainsbury Retail Media`).
   - **CAA-TalAg (Talent Commerce)**: `talentId` / talent roster join, royalty split & minimum guarantee terms on PO/ad attribution, IP approval sign-off gate before campaign activation, and collection/capsule grouping.

---

## 5. Repository Findings & Entry Files Modified

### Mercenta `redesign/foundation` vs `main` Findings
- Mercenta's `redesign/foundation` branch was cloned into the workspace and already includes all 12 Section 5 foundation files under `src/lib/**` and `src/config/**` (including `src/lib/auth/rbac.ts`, `src/lib/statusPresentation.ts`, `src/lib/commerce/poAcknowledgementWindow.ts`, `src/lib/logistics/operationsMap.ts`, `src/lib/documents/poDocumentPack.ts`).
- `BrandShell.tsx` previously rendered `BrandAdvertising` inside `market` and `VIEW_ALLOWLIST.brand` in `src/lib/auth/rbac.ts` omitted `ads_management` (plus `inventory`, `commercial_readiness`, `lift_off`, `market`, `cases`, `team`). `src/next/navConfig.ts` keeps all 20 `BrandShell` views plus `ads_management` reachable for partner sessions without modifying `src/lib/auth/rbac.ts`.
- On `CORE_ADMIN_ITEMS`, `ads_management` and `amazon_ads` share `rbacViewId: 'marketing'` so `admin_staff` retain access under the unmodified `VIEW_ALLOWLIST`, while Super-Admin-only views (`control_centre`, `brand_intelligence`, `super_admin`, `audit_log`, `integrations`, `founder_centre`, `partnerships`) remain strictly hidden from `admin_staff`.

### Files Created / Modified Outside `src/next/`
Only required project build/entry configuration files outside `src/next/` were updated to bootstrap the codebase in this environment:
- `metadata.json` & `index.html`: Set app name, description, and OpenGraph tags for Mercenta Partners.
- `package.json`: Added `@tanstack/react-query`, `@supabase/supabase-js`, `@sentry/react`, `recharts` dependencies.
- `tsconfig.json` & `vite.config.ts`: Configured Vite React + Tailwind CSS v4 + `@/*` alias matching Mercenta.
- `src/main.tsx`: Wrapped root `<App />` in `QueryClientProvider`, `ThemeProvider`, `src/index.css`, and `src/theme-alpha-shims.css`.
- `src/App.tsx`: Mounted `AppProvider`, `IntegrationsProvider`, `RouteMetadata`, `useCanonicalQuerySync()`, `NextShell`, `PreviewHarness`, and a clean toggle back to the unmodified Legacy Shells (`HomeShell` / `BrandShell` / `AdminShell`).

No existing file under `src/data/**`, `src/types.ts`, `src/config/**`, `src/lib/**`, `src/integrations/**`, `src/services/**`, `src/components/**`, or `src/index.css` was modified.

### Verification Status (`npm run build` & `npx tsc --noEmit`)
- `npm run build` (`vite build`): **Pass**.
- `npx tsc --noEmit`: **0 errors** across all files in `src/next/**`, `src/main.tsx`, and `src/App.tsx`. One pre-existing React 18 → React 19 `@types/react` `RefObject<HTMLButtonElement | null>` variance mismatch exists in unmodified `src/components/layout/AppShell.tsx:225`.

