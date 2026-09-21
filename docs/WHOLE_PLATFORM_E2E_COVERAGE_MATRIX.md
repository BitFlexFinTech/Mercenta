# MERCENTA — WHOLE-PLATFORM E2E COVERAGE MATRIX

**Status:** living document · **Created:** 2026-09-20 (increment S0) · **Updated:** 2026-09-20 (increment S2a)
**Repository:** `/Users/tadii/Desktop/1. Mercenta` · **Branch:** `redesign/foundation` · **HEAD at creation:** `19be002c4b3d6a64020b4740879c56ef1550e628`
**Companion documents:** `docs/MERCENTA_MASTER_FEATURE_FUNCTION_MATRIX.md` (Level-1 canonical) · `docs/AMAZON_RECONCILIATION_STATUS.md` · `PROJECT_STATUS.md` · `requirements-registry.json` (Master Matrix) · `HANDOFF.md`

> **This matrix is repository-derived.** Every count, id and spec name below was produced by reading the
> repository in the S0 session (grep/read of `src/components/layout/*.tsx`, `e2e/*.spec.ts`,
> `src/lib/auth/rbac.ts`, `src/types.ts`). Nothing here is estimated, remembered from a previous session, or
> copied from a template. Where evidence does not exist, the row says so.

---

## 1. WHY THIS DOCUMENT EXISTS

The authoritative build brief (§3) requires that coverage distinguish a screen **rendering** from a feature
**working**, and that the platform is never declared "working" merely because individual screens render.

**"Route renders" ≠ "feature works".** Wherever possible a row below records the chain actually exercised:

```
UI action → domain operation → state transition → persistence → audit/event → downstream effect → resulting UI state
```

Rows also distinguish **positive**, **negative/refusal** and **recovery** paths, because a suite that only
proves the happy path cannot detect a regression in the refusal logic the platform depends on.

---

## 2. COVERAGE STATES (definitions used in every table)

| State | Meaning |
|---|---|
| **VERIFIED** | A browser spec exercises the real surface and asserts a real domain effect (state change, refusal, audit, downstream record) — not merely that the page rendered. |
| **PARTIALLY VERIFIED** | Some real behaviour is asserted, but a material part of the surface's own capability is **not** exercised (e.g. render/navigation only, or one control of several). |
| **NOT VERIFIED** | The surface exists in source; no browser evidence establishes that its feature works. |
| **NOT AUTOMATED** | The behaviour is known and deliberately exercised by hand today; no automated assertion exists. |
| **BLOCKED** | Cannot be verified until an external dependency exists (a credential, an Amazon-side fact, or a piece of code that does not yet exist). |
| **INTENTIONALLY EXCLUDED** | Deliberately out of scope, with the reason recorded (never silently omitted). |

---

## 3. REPOSITORY-DERIVED INVENTORY (S0 evidence)

| Dimension | Measured value | How it was measured |
|---|---|---|
| Shells | **4** — `HomeShell`, `BrandShell`, `AdminShell`, `CarrierShell` (all `React.lazy()`) | `src/App.tsx` |
| Environments | **5** — `home`, `login`, `brand`, `admin`, `carrier` | `src/types.ts:8` |
| Canonical session roles | **4** — `Super Admin`, `Mercenta Admin`, `3PL Carrier`, brand signatory | `src/components/auth/Login.tsx` `OPS_LOGINS` + brand cards |
| Admin nav views | **30** ids | `grep -o "id: '[a-z_0-9]*'" src/components/layout/AdminShell.tsx` |
| Brand nav views | **19** ids (was 18; S2a added `cases` → "Support & Cases") | same, `BrandShell.tsx` |
| Carrier nav views | **3** ids | same, `CarrierShell.tsx` |
| Super Admin sub-tabs | **19** | `src/components/admin/SuperAdminPanel.tsx` tab array |
| E2E specs | **66** files, **358** `test(` declarations, **4** `test.skip`/`test.fixme` (recounted in S2a; the S0 figure of 68 files / 354 declarations was stale) | `ls e2e/*.spec.ts`, `grep -rho "test("` |
| Last recorded FULL run | **371 passed / 0 failed / 2 skipped** (Phase 2 checkpoint, 2026-09-20) | `PROJECT_STATUS.md` §8 — **not re-run in S0 or S2a** |
| `data-testid` attributes | **248** unique | grep sweep over `src/**/*.tsx` |
| `<input>` elements | **100** | grep sweep |
| `<table>` elements | **24** | grep sweep |
| `<form>` elements | **1** (most surfaces use controlled inputs + buttons) | grep sweep |
| `role="dialog"` sites | **4** | grep sweep |
| Drawer-bearing components | **8** files | grep sweep |
| `ErrorBoundary` usage sites | **6** files | grep sweep |
| Pagination-bearing modules | **6** files | `usePaginatedList` / `Pagination` |
| Components with sorting logic | **28** files | grep sweep |
| Search-input surfaces | **17** files | grep sweep |
| Domain lib modules | **47** (`src/lib/*`) | `ls src/lib` |
| Registered providers | **22** | `INTEGRATION_ORDER` |
| Edge Functions | **9** | `ls supabase/functions` |
| SQL migrations | **27** | `ls supabase/migrations` |

---

## 4. SECTION A — SHELLS & ENTRY POINTS

| Shell | Entry | Default view | Evidence | State |
|---|---|---|---|---|
| `HomeShell` | `environment === 'home'` / `'login'` | marketing homepage | `uiux-foundation.spec.ts` (9), `uiux-redesign.spec.ts` #10, `uk-market-fit.spec.ts` #1–#2 | **VERIFIED** |
| `BrandShell` | `environment === 'brand'` | `overview` | `app-shell.spec.ts` "Brand — grouped IA renders", "Brand — Dashboard active by default" | **VERIFIED** |
| `AdminShell` | `environment === 'admin'` | `overview` | `app-shell.spec.ts` "Super Admin — all sections and items render" (22 nav labels + 12 headings asserted visible) | **VERIFIED** |
| `CarrierShell` | `environment === 'carrier'` | `manifest` | `app-shell.spec.ts` "Carrier — three items, no section headings, correct default" | **VERIFIED (render only)** — see §8 and decision T-2 |

---

## 5. SECTION B — CANONICAL ROLES

| Role | Tier (`src/lib/auth/rbac.ts`) | Environments | Views | Browser evidence | State |
|---|---|---|---|---|---|
| Super Admin (Founder) | `super_admin` | home, login, brand, admin, carrier | `*` (all) | `app-shell.spec.ts` (full nav), `founder-operating-system.spec.ts`, `investor-demo.spec.ts`, `commercial-readiness.spec.ts` #1–#2 | **VERIFIED** |
| Mercenta Admin | `admin_staff` | home, login, admin | 18 allowlisted views | `app-shell.spec.ts` "Non-super Admin does not see super-only views", `admin-operational-surfaces.spec.ts` | **VERIFIED** |
| Brand signatory | `brand` | home, login, brand | 13 + `work`/`calendar` | `brand-operational-surfaces.spec.ts`, `multi-tenant.spec.ts` (7), `dashboard.spec.ts` #6–#10 | **VERIFIED** |
| 3PL Carrier | `3pl` | home, login, carrier | `manifest`, `bak`, `auditor` | `app-shell.spec.ts` (nav render), `multi-tenant.spec.ts` #6, `status-semantics.spec.ts` #6, `table-migrations.spec.ts` #2 | **PARTIALLY VERIFIED** |

**Founder decision T-2 (recorded, authoritative):** no external carrier users/logins; the Logistics Hub is
Brand/Admin-facing; existing carrier code is **not** deleted in this increment and is reconciled/retired in the
later Logistics Hub increment after dependency analysis.

**Founder decision T-5 (recorded, authoritative):** existing Staff/RBAC functionality is retained; the canonical
human control role is **Founder / Super Admin** (T-3 — "Mercenta Operator" is not the canonical role; relabelling
happens in a later increment, without deleting Staff/RBAC).

---

## 6. SECTION C — ADMIN VIEWS (30)

| # | View id | Evidence spec(s) | State |
|---|---|---|---|
| 1 | `overview` | `dashboard.spec.ts` #1–#5 (hierarchy, KPI↔attention agreement, drill-down, keyboard focus) | **VERIFIED** |
| 2 | `control_centre` | `founder-operating-system.spec.ts` #1–#5, `commercial-readiness.spec.ts` #1–#3 | **VERIFIED** |
| 3 | `work` | `work-layer.spec.ts` #1–#10 | **VERIFIED** |
| 4 | `calendar` | `work-layer.spec.ts` #6 (real derived month grid) | **VERIFIED** |
| 5 | `crm` | `crm.spec.ts` #1–#6 (timeline, tasks, profile review, on-behalf attribution) | **VERIFIED** |
| 6 | `onboarding_pipeline` | `onboarding-workflow.spec.ts` #1–#3, `onboarding-handoff.spec.ts` #2 | **VERIFIED** |
| 7 | `marketing` | `acquisition-pipeline.spec.ts` #1–#3, `outreach-provider-hardening.spec.ts` #1–#3 | **VERIFIED** |
| 8 | `amazon_ads` | `amazon-ads-dashboard.spec.ts` #1–#4 (drill-down + attributed one-shot approval) | **VERIFIED** |
| 9 | `brand_intelligence` | `brand-intelligence-lifecycle.spec.ts`, `workstream-b-intelligence.spec.ts` #1–#4, `opportunity-discovery.spec.ts` #1–#3, `bi-intelligence-preservation.spec.ts` #1–#4 | **VERIFIED** |
| 10 | `catalog` | `catalog-product-management.spec.ts` #4, `compliance-gate.spec.ts` #1–#3, `table-migrations.spec.ts` #1 | **VERIFIED** |
| 11 | `fulfillment_track` | `fulfillment-tracks.spec.ts` #1–#4 | **VERIFIED** |
| 12 | `retail_pipeline` | `commerce-operational-simulation.spec.ts` #4 (admin sees operational commerce state; foreign/view-only refused) | **PARTIALLY VERIFIED** |
| 13 | `purchase_orders_admin` | `admin-operational-surfaces.spec.ts` #1, `record-drawer.spec.ts` #1 (queue → preview → full record) | **VERIFIED** |
| 14 | `returns_tracking` | `record-drawer.spec.ts` #5 (row → drawer, Advance is real) | **VERIFIED** |
| 15 | `billing` | `billing.spec.ts` #1–#4 (invoice, remittance, Mock-Stripe honesty, shipping margin) | **VERIFIED** |
| 16 | `contracts_admin` | `legal-agreements.spec.ts` #2–#3, `commercial-model.spec.ts` #2 | **PARTIALLY VERIFIED** |
| 17 | `logistics` (Logistics Control) | `admin-operational-surfaces.spec.ts` #3 (each shipment → its real PO), `status-semantics.spec.ts` #6 | **VERIFIED** |
| 18 | `carriers` (Carrier Monitor) | `table-migrations.spec.ts` #2 (interactive milestone select), `status-semantics.spec.ts` #6 | **PARTIALLY VERIFIED** — carrier surfaces are subject to T-2 |
| 19 | `compliance` | `compliance-gate.spec.ts` #4–#5, `document-verification.spec.ts` #1–#6, `status-semantics.spec.ts` #2–#3 | **VERIFIED** |
| 20 | `messages` | `rocketchat-removal.spec.ts` #4, `domain-acceptance.spec.ts` #4 (ONE canonical thread) | **VERIFIED** |
| 21 | `helpdesk` | `domain-acceptance.spec.ts` #4–#5 (real status transition is audited), `rocketchat-removal.spec.ts` #4 | **VERIFIED** |
| 22 | `monitoring` | nav render asserted in `app-shell.spec.ts`; **no feature assertion found** | **PARTIALLY VERIFIED** (render only) |
| 23 | `super_admin` | `simulation-control.spec.ts` (11), `rocketchat-removal.spec.ts` #1, `rakazo.spec.ts`, `homepage-editor.spec.ts` #1–#2, `google-setup.spec.ts` #1–#3, `operating-costs.spec.ts` #1–#3, `company-control-centre.spec.ts` #1–#4, `launch-centre.spec.ts` #1–#3 | **VERIFIED** |
| 24 | `audit_log` | `crm.spec.ts` #5–#6, `disputes.spec.ts` #5 | **VERIFIED** |
| 25 | `usertour` | `tours.spec.ts` #1–#10 | **VERIFIED** |
| 26 | `integrations` | `integration-hub.spec.ts` #1–#5 (tiles derived, filter, search counts, grouping, no page errors) | **VERIFIED** |
| 27 | `postiz` (Social Media) | `embedded-social.spec.ts` #9 (admin control centre reports engine/mode/findings) | **PARTIALLY VERIFIED** |
| 28 | `whatsapp` | nav render asserted in `app-shell.spec.ts`; **no feature assertion found** | **PARTIALLY VERIFIED** (render only) |
| 29 | `founder_centre` | `founder-investor-centre.spec.ts` #1–#3 | **VERIFIED** |
| 30 | `partnerships` | `funding-pipeline.spec.ts` #1–#3, `founder-investor-centre.spec.ts` #2 | **VERIFIED** |

**Not a claim:** "Super Admin — all sections and items render" asserts *navigation presence* for 22 of these
labels. It does **not** assert that each view's own feature works; the per-view evidence column above is what
carries that claim.

---

## 7. SECTION D — BRAND VIEWS (19)

| # | View id | Nav label | Evidence spec(s) | State |
|---|---|---|---|---|
| 1 | `overview` | Dashboard | `dashboard.spec.ts` #6–#10, `brand-operational-surfaces.spec.ts` #2 | **VERIFIED** |
| 2 | `catalog` | Product Catalog | `catalog-product-management.spec.ts` #1–#3, `compliance-gate.spec.ts` #5, `brand-operational-surfaces.spec.ts` #4 | **VERIFIED** |
| 3 | `commercial_readiness` | Commercial Readiness | `commercial-readiness.spec.ts` #4–#6 | **VERIFIED** |
| 4 | `purchase_orders` | Purchase Orders | `po-lifecycle.spec.ts` #1–#6, `brand-operational-surfaces.spec.ts` #1, `record-drawer.spec.ts` #6 | **VERIFIED** |
| 5 | `returns` | Returns | `record-drawer.spec.ts` #5, `brand-operational-surfaces.spec.ts` #5, `deductions.spec.ts`, `disputes.spec.ts` #1–#5 | **VERIFIED** |
| 6 | `logistics` | Inbound Shipments | `shipment-asn.spec.ts` #1–#7, `notifications.spec.ts` #2–#4, `status-semantics.spec.ts` #6 | **VERIFIED** |
| 7 | `onboarding` | Onboarding & Legal | `onboarding.spec.ts` #1–#6, `legal-agreements.spec.ts` #1 | **VERIFIED** |
| 8 | `compliance` | UK Compliance | `compliance-gate.spec.ts` #5, `status-semantics.spec.ts` #3, `document-verification.spec.ts` #2–#6 | **VERIFIED** |
| 9 | `contracts` | Contracts | `legal-agreements.spec.ts` #1, `commercial-model.spec.ts` #3 | **VERIFIED** |
| 10 | `work` | Tasks & Deadlines | `work-layer.spec.ts` #8–#10 (brand sees its OWN work only; brand can create a task) | **VERIFIED** |
| 11 | `calendar` | Calendar | `work-layer.spec.ts` #6 (derived month grid — asserted on the shared surface) | **PARTIALLY VERIFIED** |
| 12 | `analytics` | Analytics | `tours.spec.ts` #5 (deductions ledger), `deductions.spec.ts`, `disputes.spec.ts` #1–#5, `billing.spec.ts` #1–#4 | **VERIFIED** |
| 13 | `market` | Market Intel | `workstream-b-intelligence.spec.ts` #3 (qualitative positioning only, no raw score/tier) | **VERIFIED** |
| 14 | `reports` | Reports | `sales-estimator.spec.ts` #1–#2, `listing-analyzer.spec.ts` #1–#5, `brand-advertising.spec.ts` #1–#4, `brand-payouts.spec.ts` #1–#4 | **PARTIALLY VERIFIED** |
| 15 | `documents` | Documents & Account | nav render asserted; **no feature assertion found** (`BrandSelfService` has no dedicated spec) | **PARTIALLY VERIFIED** (render only) |
| 16 | `team` | Support & Team | `domain-acceptance.spec.ts` #4 (ONE canonical conversation), `rocketchat-removal.spec.ts` #4 | **PARTIALLY VERIFIED** |
| 17 | `cases` | Support & Cases | `brand-case-workflow.spec.ts` #1–#3 (S2a): fail-closed sufficiency gate, own-record resolution, full case chain, cross-tenant refusal | **VERIFIED** |
| 18 | `social` | Mercenta Social | `embedded-social.spec.ts` #1–#11 | **VERIFIED** |
| 19 | `settings` | Settings | `commercial-model.spec.ts` #3 (own relationship read-only), `tours.spec.ts` #7 (restart tour), `uiux-foundation.spec.ts` #1–#3 | **VERIFIED** |

---

## 8. SECTION E — CARRIER VIEWS (3)

**Founder decision T-2 is authoritative:** no external carrier users/logins; no new carrier-login workflow may be
created. These rows record the *existing* state only, so the later Logistics Hub increment can retire/reconcile
the surfaces with full dependency knowledge. They are **not** in scope for new work.

| # | View id | Evidence | State |
|---|---|---|---|
| 1 | `manifest` | `multi-tenant.spec.ts` #6 (3PL sees own shipments), `status-semantics.spec.ts` #6, `table-migrations.spec.ts` #2 | **VERIFIED** (existing surface) |
| 2 | `bak` | `app-shell.spec.ts` "Carrier — three items…" (nav render) | **PARTIALLY VERIFIED** (render only) |
| 3 | `auditor` | no assertion found | **NOT VERIFIED** |

**INTENTIONALLY EXCLUDED from new E2E work:** no spec may be written that establishes a *carrier login* as a
supported product capability (brief §10/§25). This is a scope decision, not an omission.

---

## 9. SECTION F — SUPER ADMIN SUB-TABS (19)

| # | Tab | Evidence | State |
|---|---|---|---|
| 1 | `staff` | `app-shell.spec.ts` RBAC visibility tests | **PARTIALLY VERIFIED** |
| 2 | `applications` | `access-gate.spec.ts` #4–#8, `status-semantics.spec.ts` #1 | **VERIFIED** |
| 3 | `accounting` | `xero.spec.ts` #3–#5, `billing.spec.ts` #1–#4, `company-control-centre.spec.ts` | **VERIFIED** |
| 4 | `rakazo` | `rakazo.spec.ts` #1, `domain-acceptance.spec.ts` #1 (unreachable engine ⇒ core domain still operates) | **VERIFIED** |
| 5 | `homepage` | `homepage-editor.spec.ts` #1–#2 | **VERIFIED** |
| 6 | `research` | no direct feature assertion found | **NOT VERIFIED** |
| 7 | `manufacturer` | no direct feature assertion found | **NOT VERIFIED** |
| 8 | `grants` | `funding-pipeline.spec.ts` #1–#3 | **PARTIALLY VERIFIED** |
| 9 | `pitch` | `founder-investor-centre.spec.ts` #1 | **VERIFIED** |
| 10 | `commercial` | `commercial-model.spec.ts` #1–#3 | **VERIFIED** |
| 11 | `launch` | `launch-centre.spec.ts` #1–#3 | **VERIFIED** |
| 12 | `company` | `company-control-centre.spec.ts` #1–#4 | **VERIFIED** |
| 13 | `google` | `google-setup.spec.ts` #1–#3 | **VERIFIED** |
| 14 | `costs` | `operating-costs.spec.ts` #1–#3 | **VERIFIED** |
| 15 | `financing` | no direct feature assertion found | **NOT VERIFIED** |
| 16 | `brandintelligence` | `workstream-b-intelligence.spec.ts` #1–#4, `opportunity-discovery.spec.ts` | **VERIFIED** |
| 17 | `simulation` | `simulation-control.spec.ts` #1–#11 | **VERIFIED** |
| 18 | `compliance` | `document-verification.spec.ts` #1–#6, `compliance-gate.spec.ts` | **VERIFIED** |
| 19 | `designsystem` | `design-system.spec.ts` #1–#5 | **VERIFIED** |

---

## 10. SECTION G — INTERACTIVE CONTROL CLASSES

| Control class | Count (source) | Evidence | State |
|---|---|---|---|
| Tables (semantic) | 24 `<table>` sites | `table-responsive.spec.ts` #1–#3, `table-migrations.spec.ts` #1–#2 | **VERIFIED** |
| Mobile card migration | — | `table-migrations.spec.ts` #1 (15-column catalogue → labelled cards, every field + action) | **VERIFIED** |
| Drawers | 8 components | `record-drawer.spec.ts` #1–#10, `work-layer.spec.ts` #3 | **VERIFIED** |
| Modals / dialogs | 4 `role="dialog"` | `design-system.spec.ts` "modal opens and closes", `notifications.spec.ts` #4 (labels modal) | **VERIFIED** |
| Tabs | 19 Super Admin + module tabs | `design-system.spec.ts` "tabs are selectable with aria-selected", `record-drawer.spec.ts` #1 | **VERIFIED** |
| Filters | 17 search surfaces + queue filters | `work-layer.spec.ts` #2, `integration-hub.spec.ts` #2, `opportunity-discovery.spec.ts` #2, `record-drawer.spec.ts` #3 | **VERIFIED** |
| Search | 17 surfaces | `integration-hub.spec.ts` #3 (true visible/total count), `uiux-redesign.spec.ts` #5 (⌘K honest filtering), `work-layer.spec.ts` #2 | **VERIFIED** |
| Sorting | 28 files with sort logic | `work-layer.spec.ts` #2 (real state change), `record-drawer.spec.ts` #2 (density control changes real padding) | **PARTIALLY VERIFIED** |
| Pagination | 6 modules (`usePaginatedList`) | **no spec asserts page switching / page-size change** | **NOT AUTOMATED** |
| Forms & validation | 100 inputs, 1 `<form>` | `uk-market-fit.spec.ts` #3 (blocks + names fields), `po-lifecycle.spec.ts` #5, `shipment-asn.spec.ts` #2, `google-setup.spec.ts` #3 (refused before opening a window) | **VERIFIED** |
| Charts | 1 canonical system (`MercentaCharts.tsx`) | `uiux-foundation.spec.ts` "charts render delicate thin strokes", `uiux-redesign.spec.ts` #2 | **VERIFIED** — invalid-SVG-unit defect fixed in S1-a |
| Notifications / event feed | 1 centre + 1 feed | `notifications.spec.ts` #1–#4, `uiux-foundation.spec.ts` "notification centre surfaces severity semantics" | **VERIFIED** |
| Command palette | 1 | `uiux-redesign.spec.ts` #5–#6 (real records, RBAC inherited) | **VERIFIED** |
| Theme switching | 6 themes | `uiux-foundation.spec.ts` #1–#3 (theme ≠ data, theme ≠ permissions) | **VERIFIED** |
| Accessibility / keyboard | — | `app-shell.spec.ts` (skip link first in tab order, keyboard nav, focus return), `design-system.spec.ts` (focus-visible), `dashboard.spec.ts` #5, `investor-demo.spec.ts` #7 | **VERIFIED** |
| Responsive / viewports | 7 viewports | `app-shell.spec.ts`, `dashboard.spec.ts` #7/#10, `work-layer.spec.ts` #7, `record-drawer.spec.ts` #9–#10, `uiux-redesign.spec.ts` #9, `status-semantics.spec.ts` #4 | **VERIFIED** |
| Empty states | — | `brand-advertising.spec.ts` #4 (honest empty state, never another tenant), `commercial-readiness.spec.ts` #6 | **VERIFIED** |
| Error boundaries | 6 `ErrorBoundary` sites | **no spec asserts an error boundary catches a real render fault** | **NOT AUTOMATED** |

---

## 11. SECTION H — DOMAIN OPERATIONS & STATE TRANSITIONS

| # | Operation | Positive | Negative / refusal | Recovery | Evidence | State |
|---|---|---|---|---|---|---|
| 1 | PO acknowledgement (accept / reject / backorder / partial) | ✔ | ✔ qty > ordered blocked; 24h window flagged | — | `po-lifecycle.spec.ts` #1–#6 | **VERIFIED** |
| 2 | `isBackOrderAllowed` fail-closed gate | — | — | — | **does not exist in source** (repo-wide grep: 0 hits) | **BLOCKED** — S5 |
| 3 | PO → shipment draft auto-creation | ✔ | — | — | `notifications.spec.ts` #2 | **VERIFIED** |
| 4 | ASN filing → shipment progression | ✔ | — | — | `notifications.spec.ts` #3, `shipment-asn.spec.ts` #1–#7 | **VERIFIED** |
| 5 | Carton shortfall → deduction | ✔ | ✔ mismatch logged | — | `shipment-asn.spec.ts` #2 | **VERIFIED** |
| 6 | Delivery → retail "live" | ✔ | — | — | `shipment-asn.spec.ts` #5 | **VERIFIED** |
| 7 | Deduction dispute (won / partial / lost) | ✔ | ✔ | ✔ | `disputes.spec.ts` #1–#5, `commerce-operational-simulation.spec.ts` #2–#2b | **VERIFIED** |
| 8 | Invoice → payment → reconciliation | ✔ | ✔ refusal with recorded reason | — | `commerce-operational-simulation.spec.ts` #1, `billing.spec.ts` #1–#2, `brand-payouts.spec.ts` #1–#4 | **VERIFIED** |
| 9 | Payout approval (human gate) | ✔ | ✔ condition failure refused | ✔ mock mode reported | `brand-payouts.spec.ts` #2–#4 | **VERIFIED** |
| 10 | Catalogue submission lifecycle | ✔ | ✔ non-compliant tenant cannot submit | ✔ resubmission resolves to canonical latest | `catalog-product-management.spec.ts` #1–#3, `brand-operational-surfaces.spec.ts` #4 | **VERIFIED** |
| 11 | Catalogue Amazon-contract fidelity | — | — | — | `transform.ts` unverified; **no Vendor catalogue API found** (AV-035) | **BLOCKED** — S8 |
| 12 | Compliance gate 0/5 → 5/5 | ✔ | ✔ blocked below 5/5 | — | `compliance-gate.spec.ts` #1–#3 | **VERIFIED** |
| 13 | Document verification (automated / manual / reject / replace) | ✔ | ✔ | ✔ replacement supersedes | `document-verification.spec.ts` #1–#6 | **VERIFIED** |
| 14 | Case lifecycle (open → status → audit) | ✔ | ✔ brand cannot open an external case | — | `domain-acceptance.spec.ts` #4–#5 | **VERIFIED** |
| 15 | KB sufficiency evaluation + Founder case queue | ✔ | ✔ unresolvable / cross-tenant reference refused | ✔ S2a: brand opens → review → escalate (simulated) → response → resolve → brand | `brand-case-workflow.spec.ts` #1–#3 (S2a, run 3/3), `validate-kb-sufficiency.mjs` (37/37) | **VERIFIED (S2a)** |
| 16 | Work item create / resolve / reminder stops | ✔ | — | ✔ reset restores baseline | `work-layer.spec.ts` #1–#10, `deterministic-journey.spec.ts` #2 | **VERIFIED** |
| 17 | Onboarding steps + track override + handoff | ✔ | ✔ brand sessions cannot reach the pipeline | — | `onboarding.spec.ts` #1–#6, `onboarding-workflow.spec.ts` #1–#3, `onboarding-handoff.spec.ts` #1–#3 | **VERIFIED** |
| 18 | Simulation scenarios (9) | ✔ | ✔ live/unknown refused | ✔ reset | `simulation-control.spec.ts` #1–#11, `investor-demo.spec.ts` #1–#8 | **VERIFIED** |
| 19 | Amazon Vendor surface (ack / invoice / ASN / transaction) | — | — | — | **not modelled**; 3 real transport routes have **no Edge Function** | **BLOCKED** — S7 |
| 20 | Amazon → Mercenta → Brand object resolution | — | — | — | **no resolver module**; unresolved-ownership Founder queue absent (brief §5) | **BLOCKED** — S2a (roadmap) |

---

## 12. SECTION I — CROSS-MODULE CHAINS

| # | Chain | Evidence | State |
|---|---|---|---|
| 1 | BI → ICP → approval → simulated send → response → opportunity → CRM | `acquisition-pipeline.spec.ts` #1–#3, `bi-intelligence-preservation.spec.ts` #1–#4 | **VERIFIED** |
| 2 | Qualified opportunity → tenant identity → ordered steps → operational brand | `onboarding-handoff.spec.ts` #1–#3, `onboarding-workflow.spec.ts` #1–#3 | **VERIFIED** |
| 3 | PO → ack → fulfil → receive → invoice → payment | `commerce-operational-simulation.spec.ts` #1 | **VERIFIED** |
| 4 | Compliance → catalogue eligibility → submission | `compliance-gate.spec.ts` #1–#5, `catalog-product-management.spec.ts` #2 | **VERIFIED** |
| 5 | Case → messages → helpdesk (ONE canonical thread) | `domain-acceptance.spec.ts` #4–#5, `rocketchat-removal.spec.ts` #4 | **VERIFIED** |
| 6 | Product economics → commercial readiness → work item → brand action → ready | `commercial-readiness.spec.ts` #1–#6 | **VERIFIED** |
| 7 | Exception → actionable work → resolution stops the reminder | `deterministic-journey.spec.ts` #2 | **VERIFIED** |
| 8 | Deduction → dispute → audit log | `disputes.spec.ts` #1–#5 | **VERIFIED** |
| 9 | Brand → Mercenta → Amazon (full PO chain with real object resolution) | — | **BLOCKED** — S2a/S5/S7 |
| 10 | Brand opens case → Mercenta checks KB + verified data + relevant object → review → escalation (simulated) → response returned → resolved → brand sees it | `brand-case-workflow.spec.ts` #2 (S2a — one continuous document, brand → admin → brand) | **VERIFIED** |
| 11 | Cross-tenant refusal inside a chain (a brand never sees another tenant's case) | `brand-case-workflow.spec.ts` #3 (S2a) | **VERIFIED** |

---

## 13. SECTION J — PERMISSIONS, TENANT ISOLATION, AUDIT, PERSISTENCE

| Concern | Evidence | State |
|---|---|---|
| Role → environment → view allowlist | `app-shell.spec.ts` (nav RBAC), `access-gate.spec.ts` #9, `uiux-redesign.spec.ts` #6, `workstream-b-intelligence.spec.ts` #2, `investor-demo.spec.ts` #5, `commercial-readiness.spec.ts` #3, `uk-market-fit.spec.ts` #9 | **VERIFIED** |
| Tenant isolation (brand sees only its own) | `multi-tenant.spec.ts` #1–#7, `catalog-product-management.spec.ts` #3, `work-layer.spec.ts` #8, `embedded-social.spec.ts` #6–#7, `brand-advertising.spec.ts` #4, `listing-analyzer.spec.ts` #5, `acquisition-pipeline.spec.ts` #3 | **VERIFIED** |
| Domain-level refusal without mutation | `admin-operational-surfaces.spec.ts` #4, `brand-operational-surfaces.spec.ts` #5, `commerce-operational-simulation.spec.ts` #4, `investor-demo.spec.ts` #4 | **VERIFIED** |
| Audit trail on business events | `crm.spec.ts` #5–#6, `disputes.spec.ts` #5, `domain-acceptance.spec.ts` #5, `brand-payouts.spec.ts` #2, `onboarding.spec.ts` #6, `workstream-b-intelligence.spec.ts` #4 | **VERIFIED** |
| Admin override is attributed | `crm.spec.ts` #4 (admin-on-behalf reason), `shipment-asn.spec.ts` #6–#7, `onboarding.spec.ts` #6 | **VERIFIED** |
| Persistence honesty (no Supabase configured) | `domain-persistence.spec.ts` #1–#3 (reports memory-only; a reload is never claimed as persisted) | **VERIFIED** (honest-partial by design) |
| Server-side enforcement (RLS / Edge Functions) | `scripts/rls-audit.mjs`, `rls-cross-brand-test.mjs`, `validate-rls-hardening.mjs`, `validate-db-hardening.mjs` — **no live project contacted** | **BLOCKED** — S13 (go-live gate) |

---

## 14. SECTION K — INTEGRATIONS & SIMULATION

| Concern | Evidence | State |
|---|---|---|
| Provider mode model (22 providers, 7 modes) | `integration-hub.spec.ts` #1–#5 (tiles derived from rendered modes; search reports true counts) | **VERIFIED** |
| Fail-closed: UNKNOWN / not_registered ≠ simulation | `simulation-control.spec.ts` #7–#8, **new** `scripts/validate-provider-mode-safety.mjs` (**52 assertions / 0 failures**, S1-a) | **VERIFIED** |
| Scenario refusal for every unsafe mode + missing lookup | `validate-provider-mode-safety.mjs` §E (behavioural, via `runScenario`) | **VERIFIED** |
| Zero live network calls in simulated flows | `investor-demo.spec.ts` #2, `outreach-provider-hardening.spec.ts` #2, `embedded-social.spec.ts` #8, `simulation-control.spec.ts` #9, `compliance-sim.spec.ts`; validator fetch traps (`validate-uk-market-fit.mjs`, `validate-commercial-readiness.mjs`) | **VERIFIED** |
| Credential entry → validation → enable/disable | `integration-hub.spec.ts` #1–#5; `company-control-centre.spec.ts` #4 (mask stored, never rendered in full) | **PARTIALLY VERIFIED** — no durable vault yet; S2c |
| Live provider activation | — | **BLOCKED** — no credentials, and the SP-API live transport targets Edge Functions that do not exist (S7) |

---

## 15. SECTION L — NOTIFICATIONS & ERROR STATES

| Concern | Evidence | State |
|---|---|---|
| Notification centre semantics (severity, never colour-only) | `uiux-foundation.spec.ts`, `investor-demo.spec.ts` #7 | **VERIFIED** |
| Commerce notifications carry honest provenance | `brand-operational-surfaces.spec.ts` #3, `admin-operational-surfaces.spec.ts` #2 | **VERIFIED** |
| Honest unavailable / not-configured states | `company-control-centre.spec.ts` #3, `outreach-provider-hardening.spec.ts` #1, `google-setup.spec.ts` #1, `xero.spec.ts` #4, `integration-hub.spec.ts` #1 | **VERIFIED** |
| No page errors while operating a surface | `integration-hub.spec.ts` #5, `brand-intelligence-lifecycle.spec.ts` #1, `commercial-readiness.spec.ts` | **PARTIALLY VERIFIED** (asserted on some surfaces only) |
| Error-boundary containment | — | **NOT AUTOMATED** |

---

## 16. SECTION M — HONEST GAP REGISTER (what this matrix does NOT yet prove)

| # | Gap | State | Owning increment |
|---|---|---|---|
| 1 | Pagination behaviour (page switching, page size, total counts) | **NOT AUTOMATED** | S12 |
| 2 | Error-boundary containment under a real render fault | **NOT AUTOMATED** | S12 |
| 3 | `monitoring` view — feature assertions (render-only today) | **PARTIALLY VERIFIED** | S12 |
| 4 | `whatsapp` view — feature assertions (render-only today) | **PARTIALLY VERIFIED** | S12 |
| 5 | Brand `documents` view — no dedicated spec (no print/label workspace exists) | **PARTIALLY VERIFIED** | S6 |
| 6 | Brand `reports`, `calendar`, `team` — partial assertions only | **PARTIALLY VERIFIED** | S12 |
| 7 | Super Admin `research`, `manufacturer`, `financing` tabs — no feature assertions | **NOT VERIFIED** | S12 |
| 8 | Carrier `auditor` — no assertion; carrier surfaces pending T-2 | **NOT VERIFIED** | Logistics Hub increment |
| 9 | `isBackOrderAllowed` fail-closed gate | **BLOCKED** | S5 |
| 10 | Amazon → Mercenta object resolution + unresolved-ownership Founder queue | **BLOCKED** | S2a (roadmap) |
| 11 | Amazon Vendor surface (ack/invoice/ASN/transaction) + the 3 missing Edge Functions | **BLOCKED** | S7 |
| 12 | Catalogue Amazon-contract fidelity (payload, images, submission record completeness) | **BLOCKED** on verified Amazon evidence | S8 |
| 13 | KB sufficiency evaluator + Founder case queue | **VERIFIED (S2a)** — `validate-kb-sufficiency.mjs` 37/37 + `brand-case-workflow.spec.ts` 3/3 | S2a — CLOSED |
| 14 | Logistics Map Engine (live / simulated / ambient) | **NOT AUTOMATED** (feature does not exist) | S10 |
| 15 | Durable credential vault + masked readback + replacement | **PARTIALLY VERIFIED** | S2c |
| 16 | Payoneer-primary payout reconciliation (T-1 decided; not yet applied) | **NOT AUTOMATED** | S11 |
| 17 | Security/go-live verification (headers, CORS, rate limiting, server-side validation, secret-history scan) | **BLOCKED** | S13 |
| 18 | Full-suite regression re-run | **PARTIAL** — S2a ran 50 tests across 6 affected suites (50 passed / 0 failed); the full 358-declaration suite was last fully executed at the Phase 2 checkpoint | S12 |

---

---

## 18. INCREMENT FOUNDATION-GAP — COVERAGE ADDED (2026-09-20)

**New spec:** `e2e/seo-foundation.spec.ts` — **6 tests, 6 passed** (Chromium, this session).

| # | Chain exercised | State | Owner |
|---|---|---|---|
| 1 | Direct URL `/faq` → FAQ renders with its OWN title, `link[rel=canonical]=https://mercenta.co.uk/faq`, `robots=index, follow` (and NOT the homepage canonical) | **VERIFIED** | foundation |
| 2 | In-app CTA → address becomes `/explore-uk-market-fit`, title + canonical re-applied, assessment surface renders | **VERIFIED** | foundation |
| 3 | Unknown path `/definitely-not-a-declared-page` → `noindex, nofollow` and **no canonical element** | **VERIFIED** | foundation |
| 4 | Private path `/admin` → `noindex, nofollow` and no canonical | **VERIFIED** | foundation |
| 5 | Authenticated session (Super Admin) at `/` → `noindex, nofollow`, no canonical | **VERIFIED** | foundation |
| 6 | All 7 non-assessment public routes still render with `index, follow` (no functional regression) | **VERIFIED** | foundation |

**Extended spec:** `e2e/founder-operating-system.spec.ts` — now **6 tests, 6 passed** (was 5). The new test 6
exercises the **global automation halt** end-to-end in the browser: engage → the halted run reports
`skipped_halted` with "no side effect" → clear → the same automation runs again.

**New validators (not browser suites):** `scripts/validate-seo-foundation.mjs` (33 assertions, 0 network) ·
`scripts/validate-bounded-ai.mjs` (31 assertions, 0 network) · `scripts/validate-founder-operating-system.mjs`
gained 11 halt assertions and was REPOINTED on three stale contracts.

**Coverage row 18 updated:** the full-suite row now records that this increment ran
`seo-foundation` 6/6 + `founder-operating-system` 6/6 + `uiux-redesign` 13/13 plus the broader regression set;
the full 358-declaration suite was still **NOT** re-run (owner S12).

---

## 19. INCREMENT MERCENTA BRAIN — COVERAGE ADDED (2026-09-21)

**Surfaces added:** 1 Super Admin view (`brain`) + 1 Brand Intelligence section (the tenant-scoped relationship
map). **No existing surface was removed, renamed or restyled.** `Overview`, the Operational Dashboard, Brand
Intelligence and Control Centre all remain distinct destinations.

| # | Surface / route | Role | Tenant scope | Spec | Executed this session | Result |
|---|---|---|---|---|---|---|
| 19.1 | `AdminShell` view `brain` → `MercentaBrain` (graph render + real counts) | Super Admin only | Mercenta-wide | `e2e/mercenta-brain.spec.ts` test 1 | **YES** | **PASS** (299 entities / 401 relationships / 27 types rendered) |
| 19.2 | Brain filters (search · cluster · status · entity type) + truthful totals | Super Admin only | Mercenta-wide | `mercenta-brain.spec.ts` test 2 | **YES** | **PASS** (subset < total; `of TOTAL` asserted; only SIMULATION badges under the simulation filter) |
| 19.3 | Brain empty state (no-match filter) | Super Admin only | Mercenta-wide | `mercenta-brain.spec.ts` test 3 | **YES** | **PASS** (stated empty state + canvas overlay + Clear restores) |
| 19.4 | Entity selection → inspector (properties, authority, provenance, relationships) | Super Admin only | Mercenta-wide | `mercenta-brain.spec.ts` test 4 | **YES** | **PASS** (provenance = `src/data/demoData.ts`; relationships non-empty) |
| 19.5 | Relationship inspection re-selects the related entity | Super Admin only | Mercenta-wide | `mercenta-brain.spec.ts` test 5 | **YES** | **PASS** |
| 19.6 | Keyboard path (entity list = accessible equivalent of the graph) | Super Admin only | Mercenta-wide | `mercenta-brain.spec.ts` test 6 | **YES** | **PASS** (focus + Enter selects; `aria-pressed=true`) |
| 19.7 | Zoom controls + graph still rendered after the view transform | Super Admin only | Mercenta-wide | `mercenta-brain.spec.ts` test 7 | **YES** | **PASS** (100 % → 125 % → 80 % → 100 %) |
| 19.8 | Responsive 1440 / 1280 / 1024 / 390, no horizontal overflow | Super Admin only | Mercenta-wide | `mercenta-brain.spec.ts` test 8 | **YES** | **PASS** (4 viewports) |
| 19.9 | Reduced motion honoured without breaking rendering | Super Admin only | Mercenta-wide | `mercenta-brain.spec.ts` test 9 | **YES** | **PASS** |
| 19.10 | **Tenant boundary:** brand shell has no Brain nav item; brand map contains no prospect/integration/automation/provider and no other tenant; boundary statement visible | Brand | `brand-astonish` | `mercenta-brain.spec.ts` test 10 | **YES** | **PASS** (39 records / 42 relationships) |

**Validators added:** `scripts/validate-mercenta-brain.mjs` — **30 source assertions** plus a **runtime phase**
that bundles `scripts/brain-runtime-check.ts` with esbuild and executes it under Node against the canonical stores
(`BRAIN_RUNTIME_STATUS: PASS`, `ASSERTIONS_FAILED: 0`, 0 network calls). Registered as `npm run validate:brain`.

**Cross-module chains exercised this increment:** the tenancy chain (Super Admin sees the Brain / brand sees only
its own map), the provenance chain (entity → canonical module → evidence), and the drill-down chain
(entity → related entity → destination view). The **full 300+ declaration suite was NOT re-run** — gap row 12
remains open (owner S12).

**Honest limitation of this increment's evidence:** no automated accessibility-tree audit (e.g. axe) was run.
Accessibility was verified through roles, accessible names, `aria-pressed` state, real keyboard execution and
reduced-motion emulation — which is weaker than a full audit and is recorded as such.

---

## 16A. SECTION M — LOGISTICS HUB + OPERATIONAL MAP (2026-09-21, session 2)

Added by the Logistics Hub + operational map increment. Every row below was **executed** in this session against
the final code (real Chromium via `npx playwright test`, dev server on :5173). No row is aspirational.

| # | Surface | Spec / test | What is actually asserted in the browser | Status |
|---|---|---|---|---|
| M1 | Brand Inbound Shipments — workspace composition | `logistics-hub-map.spec.ts` 1 | workspace frame + header + sticky toolbar render; the map is a real SVG with an attached graticule and a legend | **VERIFIED** |
| M2 | Map geometry is data-derived | 2 | drawn leg paths and markers **equal** the `data-visible-count`; node elements exist from declared coordinates | **VERIFIED** |
| M3 | Zoom is real | 3 | the zoom-in control changes the rendered zoom level; reset returns it to 100% | **VERIFIED** |
| M4 | Map ↔ record linkage | 4 | the inspector is empty until a consignment is selected; selecting one shows a stated evidence reason | **VERIFIED** |
| M5 | Filters change the map AND the list | 5, 16 | the evidence filter restricts every rendered row to that state (or shows the honest empty state); search narrows rows and drawn legs to the same count | **VERIFIED** |
| M6 | Truth labelling | 6/7 | all three legend states render with labels; the live count is **0**; every row carries `data-truth` and the state word is readable text | **VERIFIED** |
| M7 | Freight responsibility | 8/9/10 | both freight terms are stated on screen; no false "Mercenta selects/chooses/owns Amazon" wording; the geographic-precision notice is rendered | **VERIFIED** |
| M8 | Reduced motion | 11 | under `prefers-reduced-motion: reduce`, no ambient animation is running (computed `animation-name` is `none`) | **VERIFIED** |
| M9 | Responsive | 12 | no horizontal overflow at 1440 / 1280 / 1024 / 390; the map remains visible at 390 | **VERIFIED** |
| M10 | Tenant isolation | 13 | brand A sees its own consignments; brand B sees **none** of them (0 rows) | **VERIFIED** |
| M11 | Artefacts + keyboard | 14/15 | Waybill / Labels / Track dialogs open and close (Escape and the Close control) | **VERIFIED** |
| M12 | Admin Logistics Control map | admin A/B/C | the map renders with the evidence filter; a consignment created through the real PO lifecycle appears on it and is selectable; the evidence filter changes the drawn set | **VERIFIED** |
| M13 | No page errors / no external calls | 1, admin A | `pageerror` list is empty and no non-dev-server network request is made | **VERIFIED** |
| M14 | Map contract gate (module-level, executed) | `scripts/validate-logistics-map.mjs` | 60 assertions on the REAL modules executed through esbuild→node: resolution, fail-closed geography, projection bounds/direction, the fail-closed truth table, the canonical carrier rules, geometry/schematic split, stage progress | **VERIFIED** |

**Not executed (disclosed):** no axe/accessibility-tree audit was run (no such tooling exists in the repo);
no visual-regression snapshot system exists or was created; the international-origin leg is covered at module
level only, because no non-UK brand can currently complete the demo catalog lifecycle needed to raise a
consignment end-to-end.

---


## 19. SECTION P — CANONICAL PROPAGATION (DYNAMIC PROJECTIONS) (2026-09-21, session 6)

**Why this section exists:** "interactive" is not "dynamic". Both headline surfaces were projections of canonical data,
but a change to a domain object was invisible to them until a reload: the mutations did not announce themselves and the
projections never subscribed. Everything below is asserted in the SAME session it was built, at the level where it can
actually fail — a Node runtime gate over the real modules, and a Chromium spec over the running product.

| # | Capability | Evidence (gate/spec + assertion) | What is actually proven | State |
|---|---|---|---|---|
| P1 | The change signal has ONE owner | `validate-canonical-propagation.mjs` S1 | one counter, one listener list, one notifier; `prospectStore` re-exports it (no second implementation) | **VERIFIED** |
| P2 | Every canonical mutation signals | `validate-canonical-propagation.mjs` S2 | exhaustive repo scan: 0 mutating functions without a signal (39 array-write sites + 30 in-place record mutations closed) | **VERIFIED** |
| P3 | One subscriber keeps canonical reads fresh | `validate-canonical-propagation.mjs` S3 + `App.tsx` | `useCanonicalQuerySync()` mounted once; invalidates the query cache on each signal | **VERIFIED** |
| P4 | The Brain re-projects on change | gate R2 + `canonical-propagation.spec.ts` 1 | a real domain mutation increases the graph's **nodes AND edges** with no remount; the new PO is a findable entity | **VERIFIED** |
| P5 | The Brain carries provenance, not decoration | `canonical-propagation.spec.ts` 3 | selecting an entity shows its canonical provenance + authority note | **VERIFIED** |
| P6 | The Logistics map re-projects on change | gate R3 + `canonical-propagation.spec.ts` 1 | admin map legs grow **3 → 5** after the canonical PO→ack→ASN lifecycle, no reload | **VERIFIED** |
| P7 | The map names the canonical object and its truth | gate R3 | the new leg names its canonical PO and carries a truth state; nothing is fabricated as LIVE VERIFIED | **VERIFIED** |
| P8 | Propagation is tenant-scoped | gate R4 + `canonical-propagation.spec.ts` 2 | owning brand grows, the other brand's projection does not, its feed contains none of the new POs | **VERIFIED** |
| P9 | Unknown tenant still fails closed | gate R4 | an unknown tenant builds **0** nodes (no guessing) | **VERIFIED** |
| P10 | No mutation ⇒ no change | gate R5 | the projection is byte-identical across builds (deterministic, not volatile) | **VERIFIED** |
| P11 | The logistics surfaces read canonical accessors only | gate S5 | both hubs feed the projection from `useShipmentsAll()`/`usePurchaseOrders()` | **VERIFIED** |

**Not covered by this section (stated plainly):** the domain data layer remains the deterministic demo/simulation
dataset until Supabase credentials exist, so these projections are dynamic **within that domain** — they are not live
channel data. A hard reload re-bootstraps the memory-only stores (documented persistence contract), which is why the
browser proofs drive the change inside one page realm. Nothing here was deployed.

---


## 17. SECTION N — MAINTENANCE RULE

1. **This matrix must be updated in the same session as any increment that adds, removes or changes a surface.**
   It is one of the five synchronised project-state sources (`.clinerules/project-state-contract.md`).
2. A row may only be promoted to **VERIFIED** when the evidence column names a spec that **exists and was run**
   in that session; `built_and_tested` in `requirements-registry.json` requires the same.
3. When a surface is removed, its row is **not deleted** — it is moved to a "retired" note with the reason and the
   commit/increment that retired it, so the history is never destroyed.
4. Adding a view to a shell's nav array **without** adding a matrix row is a matrix defect, and the next
   reconciliation pass must flag it.

---

## 18. SECTION O — RUNTIME ENTRY, ADDRESSING & REFRESH (2026-09-21, session 5)

**Why this section exists:** until this increment the platform had **no product address at all**. Every row below
could render perfectly while the URL read `/` in the Admin Hub, the Brand Portal and the carrier terminal; a refresh
silently signed the user out; Back/Forward left the application. None of that is visible to typecheck, build or a
component test, so it is asserted in a browser at the address bar.

| # | Capability | Evidence (spec + test) | What is actually proven | State |
|---|---|---|---|---|
| O1 | `/` remains the public marketing homepage | `runtime-entry.spec.ts` 1 | the hero CTA is present and `pathname === '/'` — **with and without** a live session | **VERIFIED** |
| O2 | A cold product deep link keeps its address | `runtime-entry.spec.ts` 2/3 | `/admin/brain` shows the login entry and the address is untouched | **VERIFIED** |
| O3 | The one-click demo login lands on the REQUESTED destination | `runtime-entry.spec.ts` 2/3 | after the Super Admin card, `pathname === '/admin/brain'` and the Brain canvas renders | **VERIFIED** |
| O4 | F5 in place stays in place | `runtime-entry.spec.ts` 4 | `/admin/logistics` survives a reload, same heading, no `Partner Login` | **VERIFIED** |
| O5 | Back/Forward move between product views | `runtime-entry.spec.ts` 5 | `/admin/logistics` ⇄ `/admin/brain` with the correct surface each time | **VERIFIED** |
| O6 | Every declared nav destination is honoured | `runtime-entry.spec.ts` 6 | each carrier destination reaches its own address; the auditor opens AT the auditor (`data-focus`) | **VERIFIED** |
| O7 | A tier that may not enter an environment is refused | `runtime-entry.spec.ts` 7 | Mercenta Admin at `/admin/super_admin` → `AccessDenied`; private nav items absent; an unrenderable segment falls back to the default view | **VERIFIED** |
| O8 | Tampered / unknown / malformed sessions fail closed | `runtime-entry.spec.ts` 8 | brand-tier session claiming `admin` refused; unknown tenant dropped (storage cleared) with no portal; malformed JSON refused | **VERIFIED** |
| O9 | Session persistence is tab-scoped and re-validated | `validate-product-routes.mjs` + O8 | `sessionStorage` (never `localStorage`); `canAccessEnvironment` gates the restore; sign-out clears it | **VERIFIED** |
| O10 | Address ↔ environment/view round-trip, fail-closed | `validate-product-routes.mjs` (68 assertions) | parse/round-trip for all three environments; unknown segments → `null`; SEO private-prefix parity | **VERIFIED** |
| O11 | No nav id can lead to a blank view | `validate-product-routes.mjs` | every declared nav id in all three shells has a render branch (this caught the carrier auditor) | **VERIFIED** |
| O12 | One writer of the address bar / one writer of `environment` | `validate-product-routes.mjs` | exactly three declared `pushState` modules; `setEnvironmentState` only in `GlobalStateContext` | **VERIFIED** |
| O13 | The Logistics Hub is inspectable with deterministic SIMULATED consignments | `logistics-hub-map.spec.ts` (15) + runtime probe | 3 rows / 3 legs / 2 nodes per cleared tenant; truth filters 3 → 2 → 1 → 0 with a real empty state; search narrows then clears; tenant isolation asserted with data on both sides | **VERIFIED** |
| O14 | Payout rail T-1 (Payoneer default / Wise secondary) | `validate-edge-functions.mjs` (46) + `validate-payouts.mjs` + `brand-payouts.spec.ts` (4) | the reconciled order is pinned in the config SSOT, the edge function and the registry; refusals and the human-approval gate unchanged | **VERIFIED** |
| O15 | Tenant isolation on the consignment feed | `logistics-hub-map.spec.ts` 13 (REPOINTED) | brand B sees its OWN consignments and not one of brand A's ids/PO numbers, and vice versa | **VERIFIED** |

**Not covered by this section (and stated plainly):** no browser test asserts the *visual* quality of any surface —
that remains the Founder's own inspection (heading 3 of the session report). No live provider was contacted anywhere
in this section; every consignment is SIMULATED and the empty/refusal states are the honest ones.

---

*Created in increment S0 (master build reconciliation). S1-a fixed the MercentaCharts invalid-SVG-unit defect and
added `scripts/validate-provider-mode-safety.mjs`. S2a added the brand `cases` view (19 brand views), the
`brand-case-workflow.spec.ts` chain (3/3) and the `kb-sufficiency` validator (37/37), and closed gap row 13.
The foundation-gap increment added §18 above: `seo-foundation.spec.ts` (6/6), the global-halt test in
`founder-operating-system.spec.ts` (now 6/6), `validate-seo-foundation.mjs` and `validate-bounded-ai.mjs`.
No surface was deleted, renamed or restyled by any of these increments.*
