# PHASE E5 — ADMIN OPERATIONAL SURFACES
**Mercenta Partners Ltd — platform build phase report**
Date: 2026-09-12 · Branch: `redesign/foundation` · Implementation session

---

## 0. WHAT THIS PHASE IS

E1–E4 built canonical domain state (onboarding, catalog, commerce). **E5 turns
that state into coherent, ADMIN-FACING operational surfaces** — it is operational
completion, **not** a UI redesign and **not** a new admin application.

**E5 added no new application surface.** Every gap was closed by extending a
surface that already existed:

| Gap | Existing surface extended |
|---|---|
| G1 admin operability | `CommerceOperationsPanel` (E4, hosted in Retail Pipeline) |
| G2 simulation provenance | `RetailPipeline`, `AdminPurchaseOrderList`, `CommerceOperationsPanel`, `LogisticsControl` |
| G3 RBAC on PO create | `AdminPurchaseOrderList` |
| G4 RBAC on catalog edits | `CatalogManagerAdmin` |
| G5 dashboard measures + drill-down | `AdminDashboard` |
| G6 shipment→PO linkage (**real defect**) | `LogisticsControl` |
| G7 commerce notifications | `NotificationCenter` |
| G8 operational case | `CommerceOperationsPanel` → existing helpdesk |
| G9 duplicated derivation | `CatalogManagerAdmin` + `RetailPipeline` → canonical helper |

**No new store, dashboard, CRM, PO system, catalogue, ticketing system or billing
system. No migration. No new provider call. No live integration.**

---

## 1. GIT STATE AT THIS CHECKPOINT

| Item | Value |
|---|---|
| Branch | `redesign/foundation` |
| **Pre-E5 checkpoint (revert point)** | **`981332f`** — tag `mercenta-pre-e5-20260912` |
| **E5 implementation commit** | recorded at the E5 docs checkpoint (§11) |
| **E5 documentation checkpoint** | recorded at the E5 docs checkpoint (§11) |
| E4 implementation / docs | `bf1ab15` / `981332f` |
| Earlier E4 checkpoint | `657b6b2` |
| Protected baseline | **`959b4d2`** |
| Baseline tag | `mercenta-baseline-before-redesign-20260907` |
| Baseline is ancestor of HEAD | **YES** (`git merge-base --is-ancestor` → exit 0) |
| Rebase / amend / reset / force-push | **NONE** |
| Review Zip | regenerated at the end of the phase with the canonical script, **left unstaged** (project convention) |

**Working-tree state at E5 start:** clean except the pre-existing
`M "Review Zip/mercenta-review.zip"` (35,896,941 bytes) — **preserved exactly as
found; never staged, overwritten by source changes, or cleaned.**

---

## 2. WHAT WAS ACTUALLY IMPLEMENTED (G1–G9)

### G1 — admin operability through the EXISTING domain
`CommerceOperationsPanel` was read-only. It now renders every **simulated PO**
with its legitimate next actions, each calling the CANONICAL domain function with
the admin `CommerceActor`: `acknowledgeCommercePurchaseOrder` →
`fulfilCommercePurchaseOrder` → `receiveCommercePurchaseOrder` →
`issueCommerceInvoice` → `recordCommercePayment` (+ `openCommerceCase`, G8).
RBAC and tenant scope are enforced **in the domain**; a disabled button is an
affordance only. Refusals surface verbatim (`FORBIDDEN` / `CROSS_TENANT` /
`ILLEGAL_TRANSITION`).

### G2 — truthful provenance on the admin operational surfaces
`(sim)` markers derived from the CANONICAL flags, never guessed:
- `AdminPurchaseOrderList` → `po.simulated === true`
- `RetailPipeline` → `sub.simulated`, `po.simulated === true`, `d.simulated`
- `LogisticsControl` → joined from the canonical PO (`poFor(s.poNumber)?.simulated`)
- `CommerceOperationsPanel` → per-record + per-activity `(sim)`

Deduction markers are **in-cell only**, so the existing dispute column indices
(`td.nth(5)` / `td.nth(6)`) are unchanged.

### G3 — RBAC on the admin PO-create action (email path UNTOUCHED)
The surface had **no mutation guard** and called `createPurchaseOrder`, which
sends a real Postmark email. It now requires `canCurrentUserMutate` (button
disabled + `handleCreate` early-return + a view-only hint).
**`createPurchaseOrder`'s implementation was not modified in any way.**

### G4 — RBAC on catalog mutations
`CatalogManagerAdmin`'s `updateProductAvailability` / `updateProductCost` had no
guard. `ProductDetailModal` now receives `canMutate`, both mutators early-return,
and both buttons are disabled with an explanatory title.

### G5 — dashboard measures + drill-down (**real defect**)
- **Defect:** the "POs in fulfilment" KPI and every "Fulfilment in motion" row
  drilled to `fulfillment_track` — which is the brand **score/track-placement**
  surface, not shipments. Both now route to `logistics` (Logistics Control).
- **Added** two canonical-derived attention groups: **Catalogue** (rejected
  submissions, from the canonical E3 submission store) and **Commerce**
  (issued-unpaid simulated invoices). Strictly additive: existing row id prefixes
  (`po-`, `ded-`, `ticket-`, `renewal-`, `docs-`) are untouched, and the KPI
  ids/headings the browser suite pins are unchanged.

### G6 — Logistics Control PO linkage (**real defect**)
**Root cause:** the PO column did `pos.find(p => p.id === s.id)` — comparing a
SHIPMENT id (`shipment-<poId>`) against PO ids — so it rendered `—` for **every**
row. It now renders the canonical `DemoShipment.poNumber`; the same canonical join
supplies G2's provenance.

### G7 — canonical commerce notifications
`NotificationCenter` gained ONE new kind, `commerce`, derived from the SAME
canonical stores the E4 lifecycle writes (`demoCommerceInvoices`,
`demoCommercePayments`, `demoPurchaseOrders`). **No second notification store.**
Only states NOT already covered by the `po`/`deduction` kinds are surfaced, so
nothing is double-counted. Copy states provenance truthfully
("(sim) — no live payment provider contacted").

### G8 — operational case surfaced
`openCommerceCase` (E4) was called by nothing. It is now reachable from the admin
surface ("Open case") and opens on the EXISTING helpdesk ticket model — **no
parallel case system**.

### G9 — one latest-submission derivation
`CatalogManagerAdmin` re-implemented "latest per (brand, sku)" as a local `Map`.
Both it and `RetailPipeline` now use the canonical
`demoStore.latestSubmissionForProduct` (the same function the E3 domain owns);
Retail Pipeline additionally marks **superseded** records so a stale submission
can never be mistaken for current state.

---

## 3. EXACT FILES CHANGED (15 files: 3 new, 12 modified — NO migration)

### NEW (3)
| File | Purpose |
|---|---|
| `scripts/validate-e5-admin-surfaces.mjs` | E5 validator — 48 assertions (A–J) |
| `e2e/admin-operational-surfaces.spec.ts` | E5 browser coverage — 4 tests |
| `docs/PRODUCT_CONSOLIDATION_PHASEE5_2026-09-12.md` | this report |

### MODIFIED (7 source)
| File | Change |
|---|---|
| `src/components/admin/CommerceOperationsPanel.tsx` | G1 operable lifecycle + G8 case + G2 provenance |
| `src/components/admin/RetailPipeline.tsx` | G2 provenance (`sub`/`po`/`d`) + G9 canonical derivation + superseded marker |
| `src/components/admin/AdminDashboard.tsx` | G5 fulfilment drill-down fix + canonical Catalogue/Commerce attention rows |
| `src/components/shared/NotificationCenter.tsx` | G7 canonical `commerce` kind + icon |
| `src/components/admin/LogisticsControl.tsx` | **G6 defect fix** (canonical `poNumber` join) + G2 provenance + stable query identity |
| `src/components/admin/AdminPurchaseOrderList.tsx` | G3 RBAC guard + G2 provenance (email path untouched) |
| `src/components/admin/CatalogManagerAdmin.tsx` | G4 RBAC guard + G9 canonical derivation |

### MODIFIED (5 docs)
`PROJECT_STATUS.md` · `HANDOFF.md` · `STATUS_CHECK.md` ·
`MERCENTA_MASTER_CONTEXT.md` · `MERCENTA_ARCHITECTURE.md` — whole-project E5
checkpoint blocks.

**NOT touched:** BI (`src/lib/intelligence/**`), Postiz, Rocket.Chat, Rakazo,
**all migrations (no 024)**, `createPurchaseOrder`'s email implementation, real
provider clients (`spapi/client`, `dhl/client`, `services/xero`), the design
system, deploy scripts, `commerceLifecycle.ts`, `domainRepository.ts`,
`src/types.ts`, `src/data/api.ts`.

---

## 4. TESTING — EXACT RESULTS

| Gate | Command | Result |
|---|---|---|
| Typecheck | `npx tsc --noEmit -p tsconfig.app.json` | **PASS — 0 errors** |
| Lint | `npm run lint` (rules-of-hooks + exhaustive-deps as **error**) | **PASS — 0 problems** |
| Build | `npm run build` | **PASS** |
| **E5 validator** | `node scripts/validate-e5-admin-surfaces.mjs` | **48/48 PASS** → `E5_ADMIN_SURFACES_VALIDATION_PASS`, exit 0 |
| **E5 Playwright** | `npx playwright test e2e/admin-operational-surfaces.spec.ts` | **4/4 PASS** |
| **Full Playwright** | `npx playwright test` | **193 passed / 4 skipped / 0 failed** (E4 baseline 189/0/4 → **+4, 0 regressions**) |
| Validator sweep | all 50 `scripts/validate-*.mjs` | **35 PASS / 15 FAIL — the SAME 15 pre-existing failures** |
| Pre-E5 vs post-E5 | byte comparison via a clean `git worktree` at `981332f` | **all 49 legacy validators byte-identical** after normalising the Node PID, the absolute root path and the post-verdict esbuild teardown line; the only semantic difference is the new `validate-e5-admin-surfaces.mjs` |

### 4.1 E5 validator coverage (48 assertions)

| Section | Coverage |
|---|---|
| A | one canonical surface per concept; no second store/dashboard/CRM/PO/catalogue/ticketing; existing primitives only |
| B (G1) | an ADMIN actor (global scope) drives acknowledge → fulfil → receive → invoice → payment through the EXISTING domain; attributed on the ONE audit log; the whole run stays simulated |
| C (G3/G4) | VIEW-ONLY refused `FORBIDDEN` on mutation/create/invoice/case; FOREIGN tenant refused `CROSS_TENANT`; **refusals mutate nothing** (activity count + PO status unchanged) |
| D (G2) | provenance markers exist on every admin surface, derived from canonical flags; no admin surface claims a live provider acted |
| E (G5) | fulfilment drill-down targets the shipment surface; dashboard reads the canonical submission store; pre-existing attention ids unchanged; KPI contract preserved |
| F (G6) | shipment linked by canonical `poNumber`; real join, not an id-vs-id lookup |
| G (G7) | canonical `commerce` kind; derives from the canonical E4 stores only; no second notification store; truthful copy |
| H (G8) | case opening surfaced, on the EXISTING helpdesk model; recorded on the canonical trail |
| I (G9) | no local latest-submission map; both surfaces share the canonical helper; the helper is declared exactly once |
| J | no migration added (023 newest, 23 total); `createPurchaseOrder` email path untouched; guards live on the surface; UNKNOWN stays unsafe; **zero external network calls** |

### 4.2 E5 browser coverage (4 tests, real Chromium)

1. **G1 + G8** — an authorised admin operates the whole simulated lifecycle from
   the UI (acknowledge → fulfil → receive → issue invoice → record payment →
   open case), with `pageErrors === []` and `externalCalls === []`.
2. **G5 + G7** — the canonical rejected-submission attention row renders with
   `REJECTED` + `(sim)`; existing PO attention rows are unregressed; an
   issued-unpaid simulated invoice appears in the bell with truthful copy.
3. **G6** — Logistics Control renders the shipment's **real PO number** and
   contains no `—` cell.
4. **G3/G4** — the real domain refuses a VIEW-ONLY actor (`FORBIDDEN`) and a
   FOREIGN tenant (`CROSS_TENANT`), and the refusals change neither the activity
   trail nor the PO status.

### 4.3 Zero-network / zero-error evidence

Every E5 test asserts `externalCalls === []` and `pageErrors === []`. The E5
validator runs with `globalThis.fetch` stubbed and records **0** attempts across
all 48 assertions. No provider call, no email, no live integration.

---

## 5. DEFECTS FOUND AND FIXED (root cause, not suppression)

| # | Defect | Root cause | Fix |
|---|---|---|---|
| 1 | **Logistics Control PO column always rendered `—`** (G6) | `pos.find(p => p.id === s.id)` compared a shipment id (`shipment-<poId>`) against PO ids — it could never match | render the canonical `DemoShipment.poNumber`; keep the join as a map for provenance |
| 2 | **"POs in fulfilment" + "Fulfilment in motion" drilled to the brand SCORING surface** (G5) | `onOpen: go('fulfillment_track')` while `FulfillmentTrackPanel` implements brand track placement, not shipments | route both to `go('logistics')` (Logistics Control) |
| 3 | **View-only staff could create a PO — which sends a real email** (G3) | `AdminPurchaseOrderList` never consulted the permission tier | `canCurrentUserMutate` guard + disabled affordance; **email implementation untouched** |
| 4 | **Catalog mutations had no permission guard** (G4) | availability/price mutators had no RBAC check | `canMutate` prop + early returns + disabled buttons |
| 5 | **Two independent "latest submission" derivations** (G9) | a local `Map` re-implemented what the E3 domain already exposed | both surfaces use `demoStore.latestSubmissionForProduct` |

**Fixed during E5 (self-inflicted, fixed before commit):** one
`react-hooks/exhaustive-deps` **error** introduced by the new `useMemo` in
`LogisticsControl` (an unstable `pos` dep) — corrected at the root cause by giving
the PO query a stable memoised identity (the same pattern already used for
shipments in that file), so **lint returns 0 problems**.

### Pre-existing observations (reported, deliberately NOT changed — out of scope)
- **`demoShipments` is empty in the demo seed** because `SHIPMENT_STATUS_BY_PO`
  only maps `ready_to_fulfil | shipped | delivered` and no seeded PO carries those
  statuses, so Logistics Control has no rows until a shipment is created at
  runtime. (This is why the G6 browser test drives the lifecycle first.)
- `src/components/admin/XeroConnection.tsx` is **orphaned** (0 importers).
- The nav label **"Fulfillment Track"** implements brand score/track placement,
  not shipments (name-implies-capability mismatch) — a naming/UX matter belonging
  to a later phase.

---

## 6. KNOWN LIMITATIONS (honest)

1. **Simulation only.** E5 introduced no live integration and makes no provider
   call. All operational records remain `mode: 'simulation'`.
2. **Memory persistence unchanged.** No migration was added or executed; the
   memory adapter is active (`durable: false`, reported honestly in the UI).
3. **Admin commerce operability covers the lifecycle of EXISTING simulated POs.**
   Raising a new PO stays a brand action (it requires product eligibility), which
   keeps the eligibility rule in ONE place.
4. **Disputes remain in Retail Pipeline**, not duplicated into the commerce panel,
   to avoid a second dispute surface (`disputes.spec.ts` remains authoritative).
5. **React Query cache is copy-based** (`queryOrSeed` → `seed.slice()`, 30s
   `staleTime`), so domain writes performed outside React Query do not
   auto-invalidate other cached queries. E5 did not change this architecture
   (out of scope); the browser test accounts for it honestly by seeding before the
   first fetch.
6. **G5 adds attention rows only** — no new KPI cells, deliberately, to preserve
   the dashboard KPI/tab-order contract the existing suite pins.
7. **No visual redesign**: existing tokens, primitives, layout and navigation.
8. **No deployment** and no manual click-through beyond the automated Chromium run.

---

## 7. COMPLETE PROGRAMME STATE

### Completed
`A` · `B` · `C` · `D1` · `D2` · `D3` · `D4` · `E1` · `E2` · `E3` · `E4` ·
**`E5` ✅ COMPLETE (this phase)**

### Remaining
| Order | Item |
|---|---|
| next | **E6 — Brand Operational Surfaces** |
| then | E7 — Embedded Postiz |
| then | Final UI/UX redesign |
| then | Final full-platform integration / regression |
| then | Production deployment preparation |
| LAST | **Rakazo** |

### Standing statements
- **Brand Intelligence is COMPLETE and must NOT be revisited.** E5 touched no BI
  file.
- **E6 has NOT been started.** E5 stopped at the phase boundary.
- Rakazo remains LAST. No live integrations. No deployment.

---

## 8. E5 CHECKPOINT VERIFICATION

```bash
cd /Users/tadii/Desktop/Mercenta

# git state
git rev-parse mercenta-pre-e5-20260912   # → 981332f  (revert checkpoint)
git merge-base --is-ancestor 959b4d2 HEAD # → exit 0  (baseline IS an ancestor)
git tag -l 'mercenta-baseline*'           # → mercenta-baseline-before-redesign-20260907

# gates
npx tsc --noEmit -p tsconfig.app.json     # → 0 errors
npm run lint                              # → 0 problems
npm run build                             # → ✓ built

# E5 gates
node scripts/validate-e5-admin-surfaces.mjs                        # → E5_ADMIN_SURFACES_VALIDATION_PASS (48/48)
npx playwright test e2e/admin-operational-surfaces.spec.ts         # → 4 passed
npx playwright test                                               # → 193 passed / 4 skipped / 0 failed

# validator sweep + pre/post proof
for f in scripts/validate-*.mjs; do node "$f" >/dev/null 2>&1 && echo "PASS $f" || echo "FAIL $f"; done
# → 35 PASS / 15 FAIL (the same 15 pre-existing; proven identical in a worktree at 981332f)

# canonical review zip (the ONLY authorised zip path/script)
bash ~/Desktop/Mercenta/scripts/export-review-zip.sh
```

**SIMULATION / LIVE STATUS:** SIMULATION ONLY. Zero external network calls across
the validator and all four E5 browser tests. `UNKNOWN` remains unsafe; the
fail-closed provider gate is untouched.

**PERSISTENCE STATUS:** memory adapter active (`durable: false`). **No migration
added or executed** (023 remains the newest).