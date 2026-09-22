# UI/UX REDESIGN — WAVE 3: LOGISTICS HUB COMPLETION (2026-09-22, session 11)

**Increment:** complete the remaining **Wave 3** Logistics Hub functionality. The Wave 3 **Hero**
was already implemented and verified (`docs/UIUX_REDESIGN_WAVE3_LOGISTICS_HERO_2026-09-22.md`) and was
**not rebuilt**. The Hub was **not** replaced, split into a second page, or redesigned beyond what the
functional gaps required.

**Start:** branch `redesign/foundation`, HEAD `455d67923fed004e46bbef66cc63d0db8ce8251a`,
`git status --porcelain` **EMPTY** (verified before any edit).

**Stopping point:** `VERIFIED LOCAL/COMMITTED CHECKPOINT — NOT COMPLETE` — no deployment was performed.

---

## 1. What the authoritative sources actually required

| Source | What it said |
|---|---|
| `docs/MERCENTA_MASTER_FEATURE_FUNCTION_MATRIX.md` §D09-05 | `isBackOrderAllowed` fail-closed gate — **NOT IMPLEMENTED** (grep = 0 hits), backorder offered unconditionally (AV-010) |
| §D09-06 | Rejected-line re-acknowledgement guard — **NOT IMPLEMENTED** (AV-007) |
| §D09-12 | "10am Pacific day before" routing deadline — **OPEN — REMOVE** (AV-013) |
| §D10-06 | Hardcoded lane rule — **OPEN — MUST NOT BE HARDCODED** |
| §D10-10 | Logistics Hub — **NOT IMPLEMENTED** (incl. ETA, provider eligibility, delivery performance) |
| §32 gap register #2/#5/#6 | Logistics Hub partial · backorder gate NOT IMPLEMENTED · routing re-model OPEN |
| `requirements-registry.json` | `discovered-backorder-fail-closed-gate`, `discovered-routing-request-removal`, `discovered-logistics-hub` — all `not_started` |

Nothing in the matrix or the registry required a **new** wave; every gap below was already in the
project's own recorded Wave 3 roadmap.

---

## 2. What was built

### 2.1 Backorder must fail closed (AV-010) — domain boundary, not a UI hint

- `src/types.ts` — `PurchaseOrderLineItem.isBackOrderAllowed?: boolean` (the retail channel's own
  per-line field), documented as fail-closed.
- `src/lib/commerce/backorderGate.ts` — **ONE** implementation of the rule:
  `isBackOrderAllowedForLine` (strict `=== true`), `backOrderBlockedReason`,
  `canBackOrderLine`, `backOrderAvailabilityLabel`, and `ackStatusTransitionRefusal` (AV-007 —
  a rejected line can never later become accepted/backordered).
- `src/data/api.ts → acknowledgePurchaseOrder` — the **authoritative boundary** now:
  1. refuses a duplicate acknowledgement of an already-acknowledged PO;
  2. runs a **fail-closed pre-pass** (backorder permission + rejected-line permanence) **before any
     line is mutated**, so a refused submission leaves the PO byte-for-byte unchanged;
  3. still refuses a backorder without a scheduled ship date and an over-quantity acknowledgement.
- `src/components/brand/BrandPurchaseOrders.tsx` and
  `src/components/admin/AdminPurchaseOrderDetail.tsx` — the backorder option is rendered **only**
  where the channel allows it, with the reason stated when it is not. The UI is the visible half of
  the same gate, never the gate itself.
- `src/data/demoData.ts` — the fixture **declares** the channel field deterministically on
  acknowledgement-eligible POs: the second cleared tenant's open POs declare `true` (the ack
  workflow stays demonstrable), the first tenant's declare `false` (the fail-closed path is visible
  in the running product). POs past acknowledgement declare nothing — so `undefined` is exercised too.
- `src/lib/simulation/scenarioEngine.ts` — the PARTIAL_PO scenario declares the field on its own
  simulated PO, so the scenario's backorder step still runs (it would otherwise be correctly refused).

### 2.2 The unsupported "10am Pacific" claim (AV-013) — removed, not relabelled

- `src/lib/shipping/routingReadiness.ts` (**new**) — the deadline is declared **once**, as
  **Mercenta's OWN operational readiness target** (`owner: 'Mercenta'`, Europe/London cut-off, with
  the AV-013 basis stated). No channel deadline is asserted and no replacement was invented.
- `src/components/shared/RoutingRequest.tsx` — the "10am PT / Carrier Central" copy is gone; the
  indicator and the form now state the Mercenta-owned target and that it is **not** a
  retail-channel deadline. `getRoutingRequestDeadline` is retained as a thin delegate so existing
  callers keep working.
- `src/types.ts` — the freight-term documentation now separates **what is confirmed** (collect →
  Ship Window, prepaid → Delivery Window) from **what is not** (the removed deadline).
- `src/config/tours/tourDefinitions.ts` — the backorder tour states the channel-permission rule.
- `src/config/logisticsGeo.ts` — the collect `detail` text no longer claims a Mercenta account is
  "refused by `validateCarrierForShipment`" (it is an attributed override — see 2.3).

### 2.3 Carrier eligibility — a DERIVATION (D10-06)

- `src/config/shipping.ts` — `MERCENTA_CARRIER_LANE_CAPABILITY` declares, once, which lane and
  service each Mercenta account declares. The values restate the canonical business model and the
  existing account labels; nothing new is claimed.
- `src/lib/shipping/carrierEligibility.ts` (**new**) — `deriveCarrierEligibility` /
  `isCarrierSelectable` over: freight term → lane (brand nation → consignment origin →
  destination) → declared capability → **authoritative provider state**
  (`resolveProviderMode`). A carrier is eligible **only** when its mode positively resolves to
  `simulation` or `live`; `disabled`, `error`, `degraded`, `configuring`, `available`,
  `not_registered` and `unknown` are **refused with the state named**. The lane's declared account is
  *permitted*; the other Mercenta account is *override-only* (attributed, audited) — the pre-existing
  canonical contract, **preserved**; Freight Collect permits only the partnered-carrier value.
- `src/lib/shipping/carrierRouting.ts` — `validateCarrierForShipment` now **consults** the derivation
  (optional `providerModes`; registry defaults on the non-React path). Every previously asserted
  behaviour is unchanged (verified: `validate:logistics-map` 60/0).
- `src/components/brand/LogisticsHub.tsx` — the "How carriage is arranged" panel renders the
  derivation trail: lane, permitted account **with its provider mode**, override-only account,
  refusals with reasons, and the honest "no account operational" refusal.

### 2.4 ETA — a real domain capability

- `src/types.ts` — `ShipmentEta` + `ShipmentEtaBasis` (`channel_window` · `simulated_transit` ·
  `delivered` · `unavailable`), attached to `Shipment`.
- `src/lib/logistics/shipmentEta.ts` (**new**) — `deriveShipmentEta` (deterministic; the applicable
  PO window + the recorded delay/exception state; +5-day deterministic slip), `etaPresentation`
  (labels `(derived)` / `(simulated)` / `Delivered` / `ETA unavailable`), `isEtaAtRisk`.
  **No date is ever invented**: no declared window ⇒ `unavailable`.
- `src/data/api.ts → attachShipmentEta` — **one** derivation point, applied to every consignment
  read (`fetchShipmentsAll`, `fetchShipmentsForBrand`), so the ETA can never drift from the PO.
- `src/components/brand/LogisticsHub.tsx` — ETA in the inspector with its basis rendered, plus an
  ETA-basis drill-down.

### 2.5 Delivery performance — aggregated from canonical data only

- `src/lib/logistics/deliveryPerformance.ts` (**new**) — `buildDeliveryPerformance` over the SAME
  tenant-scoped legs the map plots. A rate is `null` → "No sample yet" when no sample exists;
  provider-verified deliveries are counted **separately** from simulated ones; the provenance is
  returned and rendered. No analytics subsystem, no fabricated history.
- `src/components/brand/LogisticsHub.tsx` — KPI tiles **On-time delivery** and **ETA coverage**,
  each opening a real drill-down (per the interactivity requirement).

### 2.6 Gate

- `scripts/validate-wave3-logistics.mjs` (**new**, `npm run validate:wave3-logistics`) — bundles and
  **executes the real modules** (project esbuild, project `@` alias, CJS so the real `@/data/api`
  graph runs) and asserts 56 behaviours; `fetch` is sabotaged before the first derivation to prove
  **zero network calls**. It does not grep source text.
- `e2e/logistics-wave3.spec.ts` (**new**) — 6 browser tests: the allowed backorder still works, the
  disallowed line offers no option and explains why, ETA carries a basis, eligibility is derived,
  delivery performance drills down, and no "10am Pacific"/"Carrier Central" claim is presented.
- `e2e/shipment-asn.spec.ts` test 3 — **REPOINTED** (inline `§WAVE 3 — REPOINTED` comment) to the
  current copy, and strengthened to assert the unsupported claim is **absent**.


---

## 3. Verification (all executed in this session)

| Gate | Result |
|---|---|
| `npx tsc --noEmit -p tsconfig.app.json` | **0 errors** |
| `npx tsc --noEmit -p tsconfig.json` | **0 errors** |
| `npx eslint` (15 changed source files) | **0 problems** |
| `npm run build` | **✓ built** (5.94s) |
| `npm run validate:wave3-logistics` | **WAVE3_LOGISTICS_VALIDATION_PASS (56 passed, 0 failed)** |
| `npm run validate:logistics-map` | **LOGISTICS_MAP_VALIDATION_PASS (60 assertions, 0 network calls)** |
| `npm run validate:logistics-hero` | **LOGISTICS_HERO_VALIDATION_PASS (53 assertions)** |
| `npm run validate:provider-safety` | **PROVIDER_MODE_SAFETY_VALIDATION_PASS** |
| `npm run validate:wording` | **WORDING_LINT_PASS** — 296 files, 0 outward-facing violations |
| `npm run validate:typography` | **TYPOGRAPHY_SCALE_VALIDATION_PASS (17 assertions)** |
| `npm run validate:workspace-shell` | **92 PASS / 0 FAIL** |
| `npm run validate:canonical-propagation` | **25 PASS / 0 FAIL** |
| `npm run validate:routing` | **PASS — 101 assertions, 0 failures** |
| Playwright `logistics-wave3` + `logistics-hero` + `logistics-hub-map` + `po-lifecycle` | **37 passed** |
| Playwright `brand-operational-surfaces` + `admin-operational-surfaces` + `multi-tenant` + `shipment-asn` | **23 passed** |
| Playwright `shipment-asn` + `commerce-operational-simulation` + `notifications` + `canonical-propagation` | **19 passed** |
| Playwright FULL suite | **453 passed / 6 failed / 2 skipped** — all 6 failures were `page.goto` **30s timeouts under load**; the 6 specs re-run **in isolation: 69/69 passed** |

## 4. Deliberately NOT done

- **No deployment**, no live verification, no claim of completion (`operating-model.md` §10/§11).
- **The Hero was not rebuilt**; the Hub was not replaced or split.
- **`on_hold`, ack completeness, ack↔invoice match** (§D09-07/08/09), **consolidation**, **customs
  documents** and the **optional-`mercenta_hub` re-model** (§D09-13) remain open and are recorded as
  such in the matrix — they were not in this increment's scope and were not silently claimed.
- **Wave 5 / Wave 6 were not started.**

## 5. Known follow-ups discovered in this increment (not silently expanded into)

1. `src/lib/simulation/scenarioEngine.ts` created its PARTIAL_PO shipment with the **retired** carrier
   `fedex`, which `validateCarrierForShipment` refuses — so that scenario silently produced **no
   shipment and no shortage deduction**. Fixed inside this increment by deriving the carrier from the
   canonical lane rule (the same rule the domain uses). Reported rather than quietly patched.
2. The `collect` freight `detail` copy in `src/config/logisticsGeo.ts` contradicted the canonical
   contract asserted by `validate-logistics-map.mjs` (it claimed a Mercenta account is refused on a
   collect PO; the contract permits it as an audited override). The copy was corrected to the real
   contract.
3. The admin Logistics Control surface does **not** show the ETA / eligibility / performance panels
   (they were added to the Brand Hub). Not a regression; recorded as remaining work.

