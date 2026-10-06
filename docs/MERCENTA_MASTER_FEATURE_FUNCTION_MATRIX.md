# MERCENTA — MASTER PLATFORM FEATURE / FUNCTION MATRIX

**Status:** living canonical document · **Created:** 2026-09-20 · **Increment:** S2a
**Repository:** `/Users/tadii/Desktop/1. Mercenta` · **Branch:** `redesign/foundation`
**HEAD at creation:** `19be002c4b3d6a64020b4740879c56ef1550e628`
**Protected baseline:** `959b4d2` (tag `mercenta-baseline-before-redesign-20260907`)

**Companion documents (must agree):**

| Level | Document | Role |
|---|---|---|
| 1 | **this file** | What Mercenta contains and what every feature/function is supposed to do |
| 2 | `PROJECT_STATUS.md` | Current platform state, decisions, checkpoints, active position |
| 3 | `docs/WHOLE_PLATFORM_E2E_COVERAGE_MATRIX.md` | What has actually been VERIFIED in a browser |
| 4 | `docs/AMAZON_RECONCILIATION_STATUS.md` | Amazon truth, disposition and evidence status |
| 5 | `docs/SPRINT_*.md`, `docs/PRODUCT_CONSOLIDATION_*.md`, `MERCENTA_ARCHITECTURE.md`, `docs/MERCENTA_BUSINESS_MODEL.md` | How individual systems work |
| 6 | `HANDOFF.md` | What the next session needs to know |
| 7 | Miro | Visual representation of the SAME truth (never a competing specification) |

> **This matrix is repository-derived.** Every count, id, path and status below was produced by reading the
> repository at the HEAD above (grep/read of `src/App.tsx`, `src/components/layout/*.tsx`, `src/types.ts`,
> `src/config/*.ts`, `src/integrations/registry.ts`, `src/lib/**`, `e2e/*.spec.ts`, `requirements-registry.json`).
> Where the repository does not support a claim, the row says **UNKNOWN** or **INFERENCE** rather than guessing.

---

## 1. AUTHORITY AND NON-NEGOTIABLE RULES THIS MATRIX ENCODES

This document is the **Level-1 canonical specification** of platform capability. It exists so that no
feature, function, role, surface or integration can be added, removed or silently reinterpreted without
being recorded here.

It encodes, and must never contradict:

- `docs/MERCENTA_BUSINESS_MODEL.md` — the two commercial models, the compliance hard gate, the money chain,
  the Amazon wording safeguards, the ten approved categories, the case-mediation rule.
- `.clinerules/project-state-contract.md` — the five synchronised project-state sources.
- `.clinerules/no-placeholders-vs-mock-first.md` — internal features must be fully real; genuinely external
  dependencies use the mock-first adapter seam.
- `.clinerules/mercenta-business-model.md` — the Founder-declared canonical business policy.

**A conflict found while building this matrix is NOT resolved here.** It is retained in §7 until the
Founder decides (see §7, which currently holds two open contradictions).

---

## 2. STATUS VOCABULARY (used in every table below)

| Status | Meaning |
|---|---|
| **VERIFIED** | Implementation exists AND a browser spec that was executed in a recorded session exercises the real behaviour (not merely the render). |
| **PARTIALLY VERIFIED** | Implementation exists; a material part of the capability is not exercised by any executed spec (render/navigation only, or one control of several). |
| **IMPLEMENTED — NOT VERIFIED** | Implementation exists in source; no executed browser evidence establishes that the feature works. |
| **NOT IMPLEMENTED** | The capability does not exist in source. |
| **NOT AUTOMATED** | The behaviour is known and deliberately exercised by hand; no automated assertion exists. |
| **BLOCKED** | Cannot be completed truthfully until a named external dependency or evidence item exists. |
| **EVIDENCE-BLOCKED** | Blocked specifically on Amazon-side or other third-party evidence (see `docs/AMAZON_RECONCILIATION_STATUS.md` §5). |
| **INTENTIONALLY EXCLUDED** | Deliberately out of scope, with the reason recorded (never silently omitted). |
| **SUPERSEDED** | A later canonical decision replaced this entry; the entry is retained for history with a pointer. |

**Truth-classification prefixes** (used inline in cells, per §20 discipline):

| Marker | Meaning |
|---|---|
| **CONFIRMED** | Backed by verified evidence cited in the Amazon reconciliation register. |
| **MERCENTA RULE** | Mercenta's own commercial/operational policy — never to be presented as Amazon's. |
| **INFERENCE** | A reading of evidence that is not itself stated by the source. |
| **UNKNOWN** | Not established. Must not be treated as a default. |

---

## 3. REPOSITORY-DERIVED INVENTORY (measured at the HEAD above)

| Dimension | Measured value | How it was measured |
|---|---|---|
| Shells | **4** — `HomeShell`, `BrandShell`, `AdminShell`, `CarrierShell`, all `React.lazy()` | `src/App.tsx` |
| Environments | **5** — `home`, `login`, `brand`, `admin`, `carrier` | `src/types.ts` |
| Canonical session roles | **4** — `Brand Partner`, `Mercenta Admin`, `Super Admin`, `3PL Carrier` | `src/types.ts` `SessionRole` |
| Admin nav views | **30** ids | `grep -o "id: '…'" src/components/layout/AdminShell.tsx` |
| Brand nav views | **19** ids (was 18 before S2a added `cases`) | same, `BrandShell.tsx` |
| Carrier nav views | **3** ids — `manifest`, `bak`, `auditor` | same, `CarrierShell.tsx` |
| Super Admin sub-tabs | **19** ids | `src/components/admin/SuperAdminPanel.tsx` |
| Integration registry entries | **22** top-level registered providers (`INTEGRATION_ORDER` = 24 incl. non-ordered finance/logistics providers); **28** distinct `id:` strings once `providerOptions` choices are counted | `src/integrations/registry.ts` |
| Source modules | **345** `.ts`/`.tsx` files under `src/` | `find src -name '*.ts' -o -name '*.tsx' \| wc -l` |
| Component counts | **56** admin · **24** brand components; **48** `src/lib/` sub-directories + 9 root modules; **25** `src/data/` stores; **20** `src/config/` modules | `ls` counts |
| Supabase | **9** Edge Functions · **27** SQL migrations | `ls supabase/functions`, `ls supabase/migrations` |
| Knowledge Base articles | **7** | `src/data/knowledgeBase.ts` |
| E2E specs | **66** files, **358** `test(` declarations, **4** `test.skip`/`test.fixme` | `ls e2e/*.spec.ts`, `grep -rho "test("` |
| Registry (Master Matrix JSON) | **359** entries — 192 `built_and_tested` · 116 `built` · 2 `regressed` · 41 `not_started` · 3 `in_progress` · 1 `deferred` · 4 `blocked` | `requirements-registry.json` |
| Amazon findings | **52** (`AV-001`…`AV-048` + 4 lettered sub-items) — KEEP 16 · RELABEL 9 · BUILD 17 · REMOVE/re-model 3 · EVIDENCE-BLOCKED 7 · **applied 0 of 52** | `docs/AMAZON_RECONCILIATION_STATUS.md` |
| Persistence seam | `src/data/domainRepository.ts` — backends `memory` \| `supabase`, tenant-scoped (`TenantScope = { kind:'ops' } \| { kind:'brand'; tenantId }`) | read of the module |

---

## 4. HOW A ROW IS READ (the mandated 26 dimensions)

The brief requires every feature/function to be capturable across 26 dimensions. A single 26-column table
is unreadable and would be maintained badly, so the dimensions are split:

- **Per-feature table** — ID · feature · function · role/surface · route/view · status · E2E evidence ·
  owning increment.
- **Per-domain contract block** — module · domain objects · inputs/outputs · state model · permissions ·
  tenant boundary · integrations · simulation behaviour · automation · Founder intervention · persistence ·
  audit · notifications · errors/refusals · negative cases · recovery path · Amazon truth disposition ·
  dependencies.

---

## 5. D01 — IDENTITY · SESSION · RBAC · TENANT ISOLATION

| ID | Feature / function | Function (what it does) | Role / surface | Route / view | Status | E2E evidence | Increment |
|---|---|---|---|---|---|---|---|
| `D01-01` | Demo one-click sign-in | Renders every seeded brand card from `ALL_DEMO_BRANDS` via `activateDemoBrand(brandId)` (derived, never hardcoded); ops cards for Admin Hub / Carrier Terminal / Super Admin | all 4 roles | `HomeShell` → `Login.tsx` | **VERIFIED** | `e2e/access-gate.spec.ts`, `e2e/app-shell.spec.ts` | Batch 0 / Phase |
| `D01-02` | Session + environment switch | Sets `environment` (`home`/`login`/`brand`/`admin`/`carrier`) and the RBAC `session` (`tier`, `tenantId`, `role`) | all | `GlobalStateContext` | **VERIFIED** | `e2e/app-shell.spec.ts` | Batch 0 |
| `D01-03` | Tenant pinning on writes | Refuses a catalogue/product write when no tenant session exists (`[rbac] product creation refused — no tenant session`) | brand | any write path | **VERIFIED** | `e2e/brand-operational-surfaces.spec.ts` #5 | Phase E6 |
| `D01-04` | Cross-tenant read refusal | A brand never sees another tenant's POs, shipments, commerce records, cases, compliance or payouts | brand | all brand views | **VERIFIED** | `e2e/multi-tenant.spec.ts`, `e2e/brand-operational-surfaces.spec.ts` #5, `e2e/brand-case-workflow.spec.ts` #3 (S2a) | Phase E6 / S2a |
| `D01-05` | Staff permission tiers | `StaffMember.permissionTier` — `full` may mutate admin state, `view_only` is read-only ops | Mercenta Admin | Super Admin `staff` tab | **PARTIALLY VERIFIED** | `e2e/admin-operational-surfaces.spec.ts` | Stage 25 |
| `D01-06` | RLS audit tooling | `scripts/rls-audit.mjs`, `scripts/rls-cross-brand-test.mjs` — server-side policy review | ops | repo script | **NOT AUTOMATED** | script output only; not a browser assertion | Phase 5 |
| `D01-07` | Carrier session | **REMOVED — VERIFIED (P9, 2026-09-23)** | — | T-2 + Founder decision (2026-09-22, programme decision 4): carriers are **DHL + Palletline by API only** — a carrier never logs into Mercenta. The `carrier` environment, the `'3PL Carrier'` role, its `'3pl'` tier, `CarrierShell` and its three views are **deleted**; the address `/carrier/…` is no longer a product address (fail-closed, asserted `noindex` + never resolved), and a stale persisted carrier session is refused on restore. Evidence: `scripts/validate-product-routes.mjs` (**81 PASS / 0 FAIL**, incl. 14 §P9 removal assertions), `e2e/app-shell.spec.ts` (the removal contract), `e2e/runtime-entry.spec.ts` #6 (the removed address fails closed), `scripts/integrity-audit.mjs` (63/0) | P9 |

**Domain contract — D01**
- **Module:** `src/context/GlobalStateContext.tsx`, `src/lib/auth/rbac.ts`, `src/types.ts` (`SessionRole`, `StaffRole`, `BrandPermissionRole`).
- **Domain objects:** `DemoSession`, `BrandProfile`, `StaffMember`.
- **Permissions:** sensitive operations restricted to `super_admin` / `admin_staff`; brand operations restricted to the session's own `tenantId`.
- **Tenant boundary:** enforced in the domain layer (store read models filter by `brandId`), not only in the UI.
- **Fail-closed:** no session → no write. Unknown tenant → refusal, never a guessed owner.
- **Recovery:** refuse → operator corrects the session/tenant → retry is safe (idempotent).
- **Amazon truth:** n/a (Mercenta rule).

---

## 6. D02 — PUBLIC MARKETING (HOME SHELL)

| ID | Feature / function | Function | Role / surface | View | Status | E2E evidence | Increment |
|---|---|---|---|---|---|---|---|
| `D02-01` | Public homepage + nav | Marketing narrative; `Partner Login` is a header utility (separate from the hero CTA) | visitor | `HomeShell` | **VERIFIED** | `e2e/app-shell.spec.ts`, `e2e/uiux-redesign.spec.ts` | Phase 1 |
| `D02-02` | **Explore UK Market Fit** | Public CTA → pre-audit engine (A–F opportunity states) | visitor | `ExploreUkMarketFit.tsx` | **VERIFIED** | `e2e/uk-market-fit.spec.ts` | Phase 1 / 10 |
| `D02-03` | Partner application | Public application form → `applicationStore` | visitor | `PartnerApplicationForm.tsx` | **VERIFIED** | `e2e/onboarding.spec.ts` | Batch |
| `D02-04` | Homepage editor | Super Admin edits homepage content | Super Admin | `homepage` tab | **VERIFIED** | `e2e/homepage-editor.spec.ts` | Batch |
| `D02-05` | Sales estimator | Deterministic public/BI sales estimation | visitor / ops | `SalesEstimatorCard` | **VERIFIED** | `e2e/sales-estimator.spec.ts` | BI |
| `D02-06` | Opportunity discovery | Ranked opportunity records (category-gated) | ops | `OpportunityDiscoveryPanel` | **VERIFIED** | `e2e/opportunity-discovery.spec.ts` | BI |
| `D02-07` | Launch centre | Launch platform planning | Super Admin | `launch` tab | **VERIFIED** | `e2e/launch-centre.spec.ts` | Batch |
| `D02-08` | Legal agreements | Published legal agreement surfaces | public / brand | `onboarding` view, legal docs | **VERIFIED** | `e2e/legal-agreements.spec.ts` | Batch |

**Domain contract — D02**
- **Module:** `src/components/marketing/**`, `src/config/homepageContent.ts`, `src/config/ukMarketFit.ts`, `src/data/launchStore.ts`.
- **Outward-facing wording:** every Amazon-adjacent claim passes `npm run validate:wording`; `AMAZON_PROGRAMME_STATUS = 'not_confirmed_with_amazon'` (`src/lib/intelligence/amazonWording.ts`).
- **Refusals:** out-of-category brands/products must be filtered or marked ineligible (`isApprovedCategory`, ten approved categories).
- **Persistence:** public content is config-driven; no tenant data is exposed on the public site. **MERCENTA RULE.**
---

## 7. D03 — BRAND PORTAL (19 nav views)

| ID | View id | Label | Status | E2E evidence | Notes |
|---|---|---|---|---|---|
| `D03-01` | `overview` | Dashboard | **VERIFIED** | `e2e/dashboard.spec.ts` #6–#10 | tenant-derived KPIs only; no fabricated metrics |
| `D03-02` | `catalog` | Product Catalog | **VERIFIED** | `e2e/catalog-product-management.spec.ts`, `e2e/brand-operational-surfaces.spec.ts` #4 | compliance-gated submission |
| `D03-03` | `commercial_readiness` | Commercial Readiness | **VERIFIED** | `e2e/commercial-readiness.spec.ts` | Phase 2 |
| `D03-04` | `purchase_orders` | Purchase Orders | **VERIFIED** | `e2e/po-lifecycle.spec.ts`, `e2e/notifications.spec.ts` #2–#4, `e2e/channel-po-ingestion.spec.ts`, `scripts/validate-channel-po-ingestion.mjs` (39 assertions) | acknowledge/reject/modify, line-level. **§P11 (2026-09-24) — the PO ENTRY POINT is CHANNEL INGESTION**: "Create PO" and its Postmark notification seam are REMOVED (programme decision 3), and a channel PO addressed to Mercenta is ROUTED to its brand from the PO's own lines (`src/lib/commerce/channelPurchaseOrderIngestion.ts`), filed idempotently, and REFUSED (fail-closed: no lines / a line outside the catalogue / lines spanning two brands) |
| `D03-05` | `returns` | Returns | **VERIFIED** | `e2e/deductions.spec.ts`, `e2e/disputes.spec.ts` | |
| `D03-06` | `logistics` | Inbound Shipments | **VERIFIED** | `e2e/shipment-asn.spec.ts`, `e2e/fulfillment-tracks.spec.ts` | PO-gated shipment creation |
| `D03-07` | `onboarding` | Onboarding & Legal | **VERIFIED** | `e2e/onboarding-workflow.spec.ts`, `e2e/onboarding-handoff.spec.ts` | fail-closed without a commercial model |
| `D03-08` | `compliance` | UK Compliance | **VERIFIED** | `e2e/compliance-gate.spec.ts`, `e2e/document-verification.spec.ts` | hard gate |
| `D03-09` | `contracts` | Contracts | **VERIFIED** | `e2e/legal-agreements.spec.ts` | |
| `D03-10` | `work` | Tasks & Deadlines | **VERIFIED** | `e2e/work-layer.spec.ts` | canonical work layer |
| `D03-11` | `calendar` | Calendar | **VERIFIED** | `e2e/work-layer.spec.ts` | derived calendar |
| `D03-12` | `analytics` | Analytics | **PARTIALLY VERIFIED** | `e2e/dashboard.spec.ts` | render + KPI agreement asserted; deeper analytics not |
| `D03-13` | `market` | Market Intel | **VERIFIED** | `e2e/brand-intelligence-lifecycle.spec.ts`, `e2e/brand-advertising.spec.ts`, `e2e/listing-analyzer.spec.ts` | brand-safe projection strips internal-only findings |
| `D03-14` | `reports` | Reports | **PARTIALLY VERIFIED** | `e2e/deterministic-journey.spec.ts` | partial assertions only |
| `D03-15` | `documents` | Documents & Account | **PARTIALLY VERIFIED** | — | no dedicated spec |
| `D03-16` | **`cases`** | **Support & Cases** | **VERIFIED (NEW — S2a)** | `e2e/brand-case-workflow.spec.ts` #1–#3 | brand opens/links/reads its own cases; tenant-scoped |
| `D03-17` | `team` | Support & Team | **PARTIALLY VERIFIED** | `e2e/crm.spec.ts` | messages/team surfaces |
| `D03-18` | `social` | Social (label from `MERCENTA_SOCIAL.navLabel`) | **VERIFIED** | `e2e/embedded-social.spec.ts` | |
| `D03-19` | `settings` | Settings | **VERIFIED** | `e2e/account-menu.spec.ts`, `e2e/commercial-model.spec.ts` | commercial relationship shown read-only |

**Domain contract — D03**
- **Module:** `src/components/layout/BrandShell.tsx` + `src/components/brand/**`; `src/components/shared/LiveChatWidget.tsx`; `src/components/shared/TourLoader.tsx`.
- **Tenant boundary:** every read model filters by `session.tenantId` (`listCasesForBrand`, `productsForBrandFromStore`, `getCommerceActivitiesForBrand`, nav badges via `assertBrandScope`).
- **Automation:** nav badges derive attention counts; reminders derive `invoice_due` / `onboarding_step`.
- **Founder intervention:** none inside the brand portal — it can only *request* (cases, reviews, approvals).
- **Refusals:** onboarding wizard (not onboarded), compliance gate (missing document), no-tenant write refusal.
- **Amazon truth:** brand-facing copy must never attribute a Mercenta rule to Amazon (`validate:wording`).
Read a row together with its domain contract block. Together they carry all 26 dimensions.
---

## 8. D04 — ADMIN HUB (30 nav views)

| ID | View id | Status | E2E evidence | Notes |
|---|---|---|---|---|
| `D04-01` | `overview` | **VERIFIED** | `e2e/dashboard.spec.ts`, `e2e/app-shell.spec.ts` | KPI band ↔ attention cross-consistency asserted |
| `D04-02` | `control_centre` | **VERIFIED** | `e2e/company-control-centre.spec.ts`, `e2e/command-centre.spec.ts` | founder command centre with a stated WHY |
| `D04-03` | `work` | **VERIFIED** | `e2e/work-layer.spec.ts` | |
| `D04-04` | `calendar` | **VERIFIED** | `e2e/work-layer.spec.ts` | |
| `D04-05` | `crm` | **VERIFIED** | `e2e/crm.spec.ts` | brand CRM depth |
| `D04-06` | `onboarding_pipeline` | **VERIFIED** | `e2e/onboarding.spec.ts`, `e2e/acquisition-pipeline.spec.ts` | prospect ≠ brand conversion guard |
| `D04-07` | `marketing` | **PARTIALLY VERIFIED** | `e2e/admin-operational-surfaces.spec.ts` | render + provenance |
| `D04-08` | `amazon_ads` | **VERIFIED** | `e2e/amazon-ads-dashboard.spec.ts` | FREE-only runtime AI |
| `D04-09` | `brand_intelligence` | **VERIFIED** | `e2e/workstream-b-intelligence.spec.ts`, `e2e/bi-intelligence-preservation.spec.ts` | 7 domains, declared evidence basis |
| `D04-10` | `catalog` | **VERIFIED** | `e2e/catalog-product-management.spec.ts`, `e2e/table-migrations.spec.ts` | |
| `D04-11` | `fulfillment_track` | **VERIFIED** | `e2e/fulfillment-tracks.spec.ts` | |
| `D04-12` | `retail_pipeline` | **PARTIALLY VERIFIED** | `e2e/admin-operational-surfaces.spec.ts` | |
| `D04-13` | `purchase_orders_admin` | **VERIFIED** | `e2e/po-lifecycle.spec.ts` | admin PO mapping/override |
| `D04-14` | `returns_tracking` | **VERIFIED** | `e2e/deductions.spec.ts`, `e2e/disputes.spec.ts` | |
| `D04-15` | `billing` | **VERIFIED** | `e2e/billing.spec.ts` | Stripe = subscription only |
| `D04-16` | `contracts_admin` | **PARTIALLY VERIFIED** | `e2e/legal-agreements.spec.ts` | |
| `D04-17` | `logistics` | **VERIFIED** | `e2e/shipment-asn.spec.ts`, `e2e/commerce-operational-simulation.spec.ts` | Logistics Hub target architecture (§10) |
| `D04-18` | `carriers` (admin nav destination) | **REMOVED — VERIFIED (P9, 2026-09-23)** | — | Founder decision 2026-09-22 (programme decision 4): DHL + Palletline by API only, so there are no carrier users. The admin **`Carrier Monitor`** component, its nav item and its `'carriers'` RBAC view are **deleted** (it carried a hand-written per-carrier health feed including retired carriers). Provider connection state is owned by the Integrations surface. Evidence: `scripts/validate-stage26.mjs` (render matrix without it), `scripts/validate-review-s6.mjs` (removal + the canonical owner), `e2e/app-shell.spec.ts` (asserted ABSENT from the Operations group) | P9 |
| `D04-19` | `compliance` | **VERIFIED** | `e2e/compliance-gate.spec.ts`, `e2e/compliance-sim.spec.ts`, `e2e/document-verification.spec.ts` | manual approval never bypasses a required document |
| `D04-20` | `messages` | **PARTIALLY VERIFIED** | `e2e/crm.spec.ts`, `e2e/admin-operational-surfaces.spec.ts` | |
| `D04-21` | `helpdesk` | **VERIFIED (extended S2a)** | `e2e/brand-case-workflow.spec.ts` #2, `e2e/admin-operational-surfaces.spec.ts` | review queue + KB sufficiency + record response + resolve |
| `D04-22` | `monitoring` | **PARTIALLY VERIFIED** | — | render-only today (gap R3) |
| `D04-23` | `super_admin` | **VERIFIED** | `e2e/admin-operational-surfaces.spec.ts`, `e2e/record-drawer.spec.ts` | 19 sub-tabs |
| `D04-24` | `audit_log` | **PARTIALLY VERIFIED** | `e2e/status-semantics.spec.ts` | history is never destroyed |
| `D04-25` | `usertour` | **VERIFIED** | `e2e/tours.spec.ts` | KB ↔ UserTour link |
| `D04-26` | `integrations` | **VERIFIED** | `e2e/integration-hub.spec.ts`, `e2e/google-setup.spec.ts`, `e2e/xero.spec.ts` | credential control centre |
| `D04-27` | `postiz` | **VERIFIED** | `e2e/embedded-social.spec.ts` | |
| `D04-28` | `whatsapp` | **PARTIALLY VERIFIED** | — | render-only today (gap R4) |
| `D04-29` | `founder_centre` | **VERIFIED** | `e2e/founder-operating-system.spec.ts`, `e2e/founder-investor-centre.spec.ts` | 9 operating views |
| `D04-30` | `partnerships` | **IMPLEMENTED — NOT VERIFIED** | `e2e/admin-operational-surfaces.spec.ts` (partial) | no dedicated spec |

**Domain contract — D04**
- **Module:** `src/components/layout/AdminShell.tsx` + `src/components/admin/**`.
- **Permissions:** sensitive views (`super_admin`, `integrations`, `audit_log`, payouts, case escalation, compliance approval) are role-restricted and additionally guarded at render.
- **Founder intervention:** every override is attributed and audited; history is never destroyed.
---

## 9. D05 — SUPER ADMIN PANEL (19 sub-tabs)

| ID | Tab id | Status | Evidence | Notes |
|---|---|---|---|---|
| `D05-01` | `staff` | **PARTIALLY VERIFIED** | `e2e/admin-operational-surfaces.spec.ts` | T-5: retained; Founder/Super Admin is the canonical human role |
| `D05-02` | `company` | **VERIFIED** | `e2e/company-control-centre.spec.ts` | |
| `D05-03` | `commercial` | **VERIFIED** | `e2e/commercial-model.spec.ts` | Model A/B; Super-Admin-only change with a reason → audit |
| `D05-04` | `compliance` | **VERIFIED** | `e2e/compliance-gate.spec.ts` | |
| `D05-05` | `accounting` | **VERIFIED** | `e2e/xero.spec.ts` | Xero is not a bank |
| `D05-06` | `costs` | **VERIFIED** | `e2e/operating-costs.spec.ts` | |
| `D05-07` | `grants` | **VERIFIED** | `e2e/funding-pipeline.spec.ts` | finance router is deterministic (no AI maths) |
| `D05-08` | `financing` | **NOT VERIFIED** | — | gap R7 |
| `D05-09` | `applications` | **PARTIALLY VERIFIED** | `e2e/onboarding.spec.ts` | |
| `D05-10` | `brandintelligence` | **VERIFIED** | `e2e/workstream-b-intelligence.spec.ts` | |
| `D05-11` | `research` | **NOT VERIFIED** | — | gap R7 |
| `D05-12` | `manufacturer` | **NOT VERIFIED** | — | gap R7 |
| `D05-13` | `pitch` | **VERIFIED** | `e2e/investor-demo.spec.ts` | |
| `D05-14` | `homepage` | **VERIFIED** | `e2e/homepage-editor.spec.ts` | |
| `D05-15` | `launch` | **VERIFIED** | `e2e/launch-centre.spec.ts` | |
| `D05-16` | `google` | **VERIFIED** | `e2e/google-setup.spec.ts` | |
| `D05-17` | `simulation` | **VERIFIED** | `e2e/simulation-control.spec.ts` | fail-closed provider safety |
| `D05-18` | `designsystem` | **VERIFIED** | `e2e/design-system.spec.ts` | |
| `D05-19` | `rakazo` | **INTENTIONALLY EXCLUDED** | `e2e/rakazo.spec.ts` | **protected — must not be modified or removed in this workstream** |

**Domain contract — D05**
- **Module:** `src/components/admin/SuperAdminPanel.tsx`.
- **Permissions:** Super Admin only; the panel is the exceptional-control surface.
- **Founder intervention:** the canonical human control authority. Commercial-model change, payout approval, credential entry, compliance approval and case escalation are all here.
- **Audit:** every sensitive action records actor, role, tenant, action, object, timestamp, result.

---

## 10. D06 — ACQUISITION · BRAND INTELLIGENCE · DISCOVERY

| ID | Feature / function | Function | Surface | Status | E2E evidence |
|---|---|---|---|---|---|
| `D06-01` | Acquisition engine | 11-stage pipeline `DISCOVERY → … → ACTIVE (BRAND)`, dedup on `normalizeBrandKey`, **prospect ≠ brand** conversion guard | `onboarding_pipeline` | **VERIFIED** | `e2e/acquisition-pipeline.spec.ts`, `e2e/onboarding.spec.ts` |
| `D06-02` | BI findings layer | Findings across 7 domains, each with a declared evidence basis (`canonical` · `simulated` · `external_research` · `ai_interpretation`), citations, thresholds + observed value | `brand_intelligence` | **VERIFIED** | `e2e/workstream-b-intelligence.spec.ts`, `e2e/bi-intelligence-preservation.spec.ts` |
| `D06-03` | Brand-safe projection | Strips internal-only findings before a brand sees BI | brand `market` | **VERIFIED** | `e2e/brand-intelligence-lifecycle.spec.ts` |
| `D06-04` | Category gate | Any prospect/product outside the **ten approved Amazon UK categories** is filtered or marked ineligible (`APPROVED_CATEGORIES`, `isApprovedCategory`) | all BI surfaces | **VERIFIED** | `e2e/opportunity-discovery.spec.ts`, `e2e/sales-estimator.spec.ts` |
| `D06-05` | Funding pipeline | 3 real opportunities, approval-gated stage machine | `founder_centre` | **VERIFIED** | `e2e/funding-pipeline.spec.ts` |
| `D06-06` | Pre-audit / UK market fit | Deterministic A–F opportunity states | public + ops | **VERIFIED** | `e2e/uk-market-fit.spec.ts` |
| `D06-07` | Listing analyzer | Deterministic marketplace/listing analysis; every figure labelled estimated/simulated | brand `market` | **VERIFIED** | `e2e/listing-analyzer.spec.ts` |

**Domain contract — D06**
- **Module:** `src/lib/acquisition/acquisitionEngine.ts`, `src/lib/intelligence/intelligenceLayer.ts`, `src/lib/founder/briefFacts.ts`, `src/lib/ai/**`, `src/data/preAuditStore.ts`.
- **Automation:** deterministic valuation/scoring; **no AI for financial maths**.
- **Founder intervention:** opportunity approval is Founder-gated.
- **Amazon truth:** `AMAZON_PROGRAMME_STATUS = 'not_confirmed_with_amazon'`; never claim partnership, endorsement or guaranteed POs; PO language is "PO potential / estimated PO opportunity / demand potential".
---

## 11. D07 — CATALOGUE & PRODUCTS (release-critical)

| ID | Feature / function | Function | Surface | Status | E2E evidence |
|---|---|---|---|---|---|
| `D07-01` | Product catalogue CRUD | Add/edit products per tenant; idempotent by SKU (`addCatalogProduct`) | brand `catalog`, admin `catalog` | **VERIFIED** | `e2e/catalog-product-management.spec.ts` |
| `D07-02` | CSV catalogue import | Bulk import via `csvImport.ts` / `CsvCatalogImport.tsx` | brand `catalog` | **VERIFIED** | `e2e/catalog-product-management.spec.ts` |
| `D07-03` | Completeness gate | `evaluateProductCompleteness` + `REQUIRED_SUBMISSION_FIELDS` — missing prerequisites BLOCK the submission (a gate, not a warning) | brand `catalog` | **VERIFIED** | `e2e/catalog-product-management.spec.ts` |
| `D07-04` | Compliance gate before submission | One resolver `evaluateBrandCatalogGate(brandId)` feeds every submission call site | brand `catalog` | **VERIFIED** | `e2e/compliance-gate.spec.ts` |
| `D07-05` | Submission record | `recordCatalogSubmission` / `updateCatalogSubmission` / `latestSubmissionForProduct` — brand, tenant, product, SKU, status, response, retry state | brand `catalog` | **VERIFIED** | `e2e/catalog-product-management.spec.ts`, `e2e/brand-operational-surfaces.spec.ts` #4 |
| `D07-06` | Image slots + validator | `ProductImage` slots; `src/lib/amazon/productImageValidator.ts` | brand `catalog` | **PARTIALLY VERIFIED** | `e2e/catalog-product-management.spec.ts` |
| `D07-07` | Amazon submission representation | `src/lib/spapi/transform.ts` — `transformProductForCatalog`, `UK_MARKETPLACE_ID`, `SUBMISSION_STATUS_LABELS`, `REJECTION_REQUIRES_HUMAN` | seam | **PARTIALLY VERIFIED** | `e2e/catalog-product-management.spec.ts` |
| `D07-08` | Amazon catalogue submission contract | The Vendor catalogue submission route / payload contract | seam | **EVIDENCE-BLOCKED** | AV-035: no public Vendor catalogue/item API was found |
| `D07-09` | Amazon listing-image requirements | Image specification fidelity | seam | **EVIDENCE-BLOCKED** | AV-033 |
| `D07-10` | UK marketplace ID | `UK_MARKETPLACE_ID = 'A1F83G8C2ARO7P'` is present in code | seam | **UNKNOWN** | AV-034: the UK marketplace ID is outstanding evidence; the constant must not be presented as Amazon-confirmed until verified |
| `D07-11` | Submission versioning | Version tracking on a submission record | — | **PARTIALLY VERIFIED** | `ProductSubmission` version field; no dedicated spec |

**Domain contract — D07**
- **Module:** `src/lib/catalog/catalogLifecycle.ts`, `catalog/csvImport.ts`, `catalog/productCompleteness.ts`, `src/lib/spapi/**`, `src/lib/amazon/**`, `src/components/brand/ProductCatalog.tsx`, `src/components/admin/CatalogManagerAdmin.tsx`.
- **State model:** product → completeness → compliance gate → submission representation → submission record (`ProductSubmission`) → status/result/error/retry.
- **Tenant boundary:** a submission always carries the brand's own tenant; `latestSubmissionForProduct(brandId, sku)` is tenant-scoped.
- **Refusals:** missing prerequisite field; missing/invalid compliance document; unknown brand.
- **Recovery:** resubmission resolves to the canonically latest submission (asserted in E6 #4).
- **Amazon truth:** **DO NOT INVENT AMAZON CATALOGUE REQUIREMENTS.** The seam exists; the contract does not. Rows `D07-08`…`D07-10` are the honest position. **EVIDENCE-BLOCKED.**
---

## 12. D08 — COMPLIANCE & DOCUMENTS (a HARD GATE)

| ID | Feature / function | Function | Surface | Status | E2E evidence |
|---|---|---|---|---|---|
| `D08-01` | Category-aware requirements | `getComplianceRequirements(category)`, `getApplicableRequirements`, `getRequiredDocumentsForContext` — rule-driven, unknown stays required (fail-closed) | brand `compliance`, admin `compliance` | **VERIFIED** | `e2e/compliance-gate.spec.ts`, `e2e/compliance-sim.spec.ts` |
| `D08-02` | Gate evaluation | `evaluateComplianceGate` — nothing enters catalogue → PO until every applicable document is present AND approved | both | **VERIFIED** | `e2e/compliance-gate.spec.ts` |
| `D08-03` | Document versioning + verification | Version + verification record: `pending` / `under_review` / `approved` / `rejected` / `superseded`; distinguishes automatically vs manually verified | both | **VERIFIED** | `e2e/document-verification.spec.ts` |
| `D08-04` | Manual approval ≠ bypass | An admin approval can override workflow state, **never** a mandatory regulatory requirement | admin `compliance` | **VERIFIED** | `e2e/compliance-gate.spec.ts` |
| `D08-05` | Companies House / HMRC sync | `companiesHouseClient|Mock`, `hmrcClient|Mock`, `complianceSync.ts`, `mockCredentials.ts` | admin `compliance` | **VERIFIED** | `e2e/compliance-sim.spec.ts` |
| `D08-06` | Agreement requirements | `REQUIRED_BRAND_AGREEMENTS`, `AGREEMENT_LABELS` | both | **VERIFIED** | `e2e/legal-agreements.spec.ts` |
| `D08-07` | "Amazon UK requirements" attribution | `src/lib/compliance.ts:28` and `src/data/demoData.ts:491` label requirements in a way AV-031 classifies as mis-attribution | copy | **OPEN — RELABEL** | AV-031: behaviour may stay; attribution must not claim Amazon |

**Domain contract — D08**
- **Module:** `src/lib/compliance.ts`, `src/lib/compliance/**`, `src/data/demoData.ts` (seeded documents).
- **State model:** document (`missing` → `pending`/`under_review` → `approved` | `rejected` → `superseded`), versioned.
- **Fail-closed:** unknown category → all base documents required. A missing document disables catalogue entry.
- **Recovery:** upload/replace a document → re-verification → gate re-evaluates.
- **Amazon truth:** the compliance gate is a **MERCENTA RULE** plus UK regulatory fact — it must not be presented as an Amazon requirement. Changing Model A ↔ Model B must never change or bypass required documentation (`RETAIL_CHANNEL_COMPLIANCE_IS_MODEL_INDEPENDENT = true`).
---

## 13. D09 — PO LIFECYCLE · ACKNOWLEDGEMENT · BACKORDER · ROUTING

| ID | Feature / function | Function | Surface | Status | Evidence |
|---|---|---|---|---|---|
| `D09-01` | Retail-channel PO ingestion (simulated) | PO addressed to Mercenta → brand resolution → routed into the brand's workspace | both | **VERIFIED** | `e2e/po-lifecycle.spec.ts`, `e2e/deterministic-journey.spec.ts` |
| `D09-02` | Two linked PO identities | External retail-channel PO **and** the Mercenta → brand commercial PO, never collapsed | both | **VERIFIED** | `e2e/commercial-model.spec.ts` |
| `D09-03` | Line-level acknowledgement | Accept full qty / reject / (claimed) backorder; cannot acknowledge above the ordered qty | brand `purchase_orders` | **VERIFIED** | `e2e/po-lifecycle.spec.ts`, `e2e/notifications.spec.ts` #2 |
| `D09-04` | 24-hour acknowledgement duty | Unacknowledged after 24h is flagged (`orderDate + 24h`), surfaced as a countdown | brand | **VERIFIED** | `e2e/po-lifecycle.spec.ts`; AV-001 **CONFIRMED** (KEEP; add the on-hold nuance via AV-010b) |
| `D09-05` | `isBackOrderAllowed` fail-closed gate | `true` = may offer; `false`/missing/unknown = do not offer | domain | **IMPLEMENTED & TESTED (2026-09-22)** | AV-010 CLOSED. `PurchaseOrderLineItem.isBackOrderAllowed` now exists; the gate is `src/lib/commerce/backorderGate.ts`, enforced at the domain boundary (`src/data/api.ts → acknowledgePurchaseOrder`) so UI/admin/simulation paths cannot bypass it; a refused submission mutates nothing. Evidence: `scripts/validate-wave3-logistics.mjs` (13 assertions, real modules) + `e2e/logistics-wave3.spec.ts` #1/#2 |
| `D09-06` | Rejected-line re-acknowledgement guard | A rejected line must not later be accepted/backordered | domain | **IMPLEMENTED & TESTED (2026-09-22)** | AV-007 CLOSED. `ackStatusTransitionRefusal` refuses the transition out of `rejected`, and a duplicate acknowledgement of an already-acknowledged PO is refused at the same boundary. Evidence: `scripts/validate-wave3-logistics.mjs` |
| `D09-07` | Ack completeness at submission | Enforce/surface completeness when acknowledging | brand | **NOT IMPLEMENTED** | AV-009. Owner **S5** |
| `D09-08` | Ack ↔ invoice match rule | Warning when ack and invoice disagree | domain | **NOT IMPLEMENTED** | AV-008. Owner **S5** |
| `D09-09` | `on_hold` PO state | `on_hold` state + reject-by-24h duty | domain | **NOT IMPLEMENTED** | AV-010b. Owner **S5** |
| `D09-10` | PO-gated shipment creation | A shipment can only be created against a valid, eligible PO belonging to the brand | both | **VERIFIED** | `e2e/shipment-asn.spec.ts`, `e2e/notifications.spec.ts` #2 |
| `D09-11` | Brand Routing Request mechanic | "Submit Routing Request" task + `RoutingRequest.tsx` | brand | **SUPERSEDED — RECONCILED (§P4, 2026-09-23); AV-013 recorded APPLIED (Batch 2o, 2026-10-03)** | T-6/AV-013: the desired model is **not** a brand routing request. The brand-side placeholder `RoutingRequestForm` is REMOVED and replaced by the read-only, Mercenta-raised `RoutingRequestStatus` (§P4) — reconciled, not relabelled. Gate: `npm run validate:proxy-model`; the repo-wide claim-absence sweep is `npm run validate:wave3-logistics` §8 |
| `D09-12` | "10am Pacific day before" routing deadline | Unsupported Amazon timing claim in copy/types | copy | **REMOVED (2026-09-22)** | AV-013 CLOSED — reconciled, not relabelled. No channel deadline is asserted anywhere (`e2e/logistics-wave3.spec.ts` #6 and `e2e/shipment-asn.spec.ts` #3 assert the claim ABSENT). The deadline is re-declared ONCE as Mercenta's OWN operational readiness target (`src/lib/shipping/routingReadiness.ts`, owner `Mercenta`, Europe/London). No replacement channel deadline was invented |
| `D09-13` | Mandatory `mercenta_hub` stage chain | `STAGE_ORDER` forces the Mercenta hub; hardcoded `destination: 'Mercenta UK Hub'` | domain | **DONE — P5 (2026-09-23)** | T-4/AV-027 + Founder decision (2026-09-22): the Mercenta Hub is **REMOVED** as a destination; the destination is **the FC on the PO** (`shipToPartyId`, modelled as `PurchaseOrder.shipToParty` and resolved by `src/config/destinationFc.ts`). The `mercenta_hub` stage/status is gone from `ShipmentStage`/`ShipmentStatus`/`STAGE_ORDER` (replaced by `destination_fc`), the hub coordinate and node kind are deleted, the Hero's arrival nodes are the destination FCs, and no seeded PO/shipment is routed to a Mercenta site. Direct brand facility → applicable destination is the only model; a PO that declares no destination fails closed to an explicit not-declared schematic leg |
| `D09-14` | PO revision ingestion | Eventual PO-revision ingestion | domain | **NOT IMPLEMENTED** | architecture only — do not invent behaviour |
| `D09-15` | Admin PO override | Correct a PO mapping/routing error, attributed + audited | admin | **VERIFIED** | `e2e/po-lifecycle.spec.ts` |

**Domain contract — D09**
- **Module:** `src/data/api.ts` (`acknowledgePurchaseOrder`), `src/lib/commerce/commerceLifecycle.ts`, `src/components/brand/BrandPurchaseOrders.tsx`, `src/components/admin/AdminPurchaseOrderList.tsx`, `src/components/shared/RoutingRequest.tsx`.
- **State model:** received → acknowledged (per line) → fulfilled → delivered → invoiced → paid; rejected / cancelled as terminal branches.
- **Hard rule (canonical):** the brand must ACCEPT/ACKNOWLEDGE before shipment creation; an unaccepted PO may never create a shipment — enforced in the domain, not the UI.
- **Amazon truth:** 24h is supported; **"at risk"** is the correct wording, never "subject to forced cancellation" (AV-002 RELABEL). No unsupported missed-ack consequence, no universal backorder availability, no invented receiving tolerances.
---

## 14. D10 — SHIPMENTS · ASN · LOGISTICS HUB · CARRIERS

| ID | Feature / function | Function | Surface | Status | Evidence |
|---|---|---|---|---|---|
| `D10-01` | Shipment creation (PO-gated) | Create a shipment against an eligible PO of the same tenant | brand `logistics`, admin `logistics` | **VERIFIED** | `e2e/shipment-asn.spec.ts`, `e2e/notifications.spec.ts` #2 |
| `D10-02` | ASN filing | File exact shipment information; an ASN inaccuracy is surfaced | brand | **VERIFIED** | `e2e/shipment-asn.spec.ts` |
| `D10-03` | Shipment stage track | `ShipmentStage` progression incl. `factory_intake` → `bak_depot` → … → delivered | both | **VERIFIED** | `e2e/fulfillment-tracks.spec.ts`, `e2e/commerce-operational-simulation.spec.ts` |
| `D10-04` | DHL seam (international) | `createDhlClientForConnection` + deterministic mock: booking, label, tracking, pickup, transit, delivery, failed delivery, exception, retry, cancellation, carrier invoice | both | **VERIFIED** | `e2e/shipment-asn.spec.ts` |
| `D10-05` | Palletline seam (UK domestic) | `createPalletlineClientForConnection` + deterministic mock, same capability set | both | **VERIFIED** | `e2e/shipment-asn.spec.ts` |
| `D10-06` | **Hardcoded lane rule** | Eligibility must derive from origin/destination/route/PO context/freight terms/declared capability/provider state — not a universal hardcoded mapping | domain | **DERIVED (2026-09-22) — lane rule retained as DECLARED config** | `src/lib/shipping/carrierEligibility.ts` derives eligibility over freight term + lane + `MERCENTA_CARRIER_LANE_CAPABILITY` + the AUTHORITATIVE provider mode: only `simulation`/`live` are operational, and disabled/error/degraded/configuring/available/unregistered/unknown are REFUSED with the state named. The `international → DHL` / `uk_domestic → Palletline` mapping remains as the business model's DECLARED preference (config), no longer as the sole determinant. Evidence: `scripts/validate-wave3-logistics.mjs` (18 assertions) + `npm run validate:logistics-map` 60/0 |
| `D10-07` | Carrier override refusal | A carrier that is not a Mercenta carrier account is refused with an explicit error | domain | **VERIFIED** | `carrierRouting.ts` refusal path; `e2e/shipment-asn.spec.ts` |
| `D10-08` | Freight responsibility | Collect/WE-PAY vs prepaid determines whether a carrier may be chosen at all | domain | **PARTIALLY VERIFIED** | `carrierRouting.ts`; the rule that a brand must NOT choose the carrier on Amazon-controlled collect freight is present in the copy — needs a dedicated assertion |
| `D10-09` | Shipping economics | `SHIPPING_COMMERCIAL_TERMS` (`src/config/shipping.ts:72`) — carrier list → negotiated discount → carrier cost → brand charge → gross shipping margin; **no universal 90% mark-up rule** | admin | **VERIFIED** | `e2e/commerce-operational-simulation.spec.ts`, `e2e/operating-costs.spec.ts` |
| `D10-10` | Logistics Hub | The target Brand/Admin logistics workspace (shipments, labels, tracking, routes, costs, customs documents, ETA/status, exceptions, freight responsibility, provider eligibility, provider configuration, consolidation, delivery performance, map) | both | **COMPLETE (2026-09-24) — ETA + provider eligibility + delivery performance (2026-09-22), the PO document pack (P6), provider configuration + the download queue (P10) and consolidation RECORDED AS DEFERRED (P10, decision 11)** | Present: workspace, map, list, inspector, labels/tracking/waybill artefacts, freight responsibility, ETA (derived, labelled, `unavailable` when undeclared), provider-eligibility DERIVATION, delivery performance (no fabricated rates), the **PO document pack** (`src/lib/documents/poDocumentPack.ts` — SSCC carton labels, carrier label + waybill, packing list/delivery note, ASN sheet, customs documents on international lanes, produced automatically on acceptance), the **document download QUEUE** (the Hub destination the nav badge counts, the same ONE rule), **provider configuration** (P10 — `src/lib/shipping/providerConfiguration.ts`, rendered read-only to a brand and with an RBAC-gated credential hand-off to an operator, fail-closed on every non-operational provider state, no cost base exposed) and **consolidation DEFERRED but not designed out** (P10 — `src/lib/shipping/consolidation.ts` holds decision 11, the documented channel evidence, the invulnerable 1..n declaration/invariants; nothing writes more than one PO per consignment until the channel's shipment request lands, which is P12's declared scope). Founder decision: the Logistics Hub is where a brand **downloads its shipping labels and ALL PO documents**. Evidence: `e2e/logistics-wave3.spec.ts`, `e2e/logistics-hub-map.spec.ts`, `e2e/logistics-hero.spec.ts`, `e2e/po-documents.spec.ts`, `e2e/logistics-providers.spec.ts`, `scripts/validate-po-documents.mjs` (53 assertions), `scripts/validate-logistics-providers.mjs` (96 assertions) |
| `D10-11` | Logistics Map Engine (LIVE VERIFIED / SIMULATED / AMBIENT) | Distinguish real Mercenta shipments from ambient transport activity; clickable markers | both | **NOT IMPLEMENTED** | Brief §11. No external data provider is licensed or activated — **do not claim availability** |
| `D10-12` | Customs documents | `src/lib/customsDocs.ts`, `src/config/customs.ts` | both | **PARTIALLY VERIFIED** | `e2e/shipment-asn.spec.ts` |
| `D10-13` | Carrier Portal (existing) | `CarrierShell` (3 views) + `CarrierMonitor` | — | **REMOVED — VERIFIED (P9, 2026-09-23)** | Founder decision 2026-09-22 (programme decision 4): carriers are **DHL + Palletline by API only**, so there are no carrier users. The shell, its 3 views (`CarrierDashboard`, `BakLogistics`), `CarrierMonitor`, the demo environment entry, the login card and the public FAQ claim are **removed**; decision 1's carrier identity (`fedex`/`bak`) is removed from the type, the labels and the lane-capability table, with the REFUSAL preserved by name (`RETIRED_CARRIER_IDS`). **The capability was REHOMED, not deleted:** the carrier-event console (milestone advance + request log) now lives on the Mercenta admin Logistics Hub, written through the ONE canonical store writer (`setShipmentMilestone`), attributed to the Mercenta operator. Evidence: `e2e/compliance-sim.spec.ts` (DHL advance), `e2e/table-migrations.spec.ts` #2, `e2e/shipment-asn.spec.ts` #5, `e2e/status-semantics.spec.ts` #6, `scripts/validate-workspace-shell.mjs` (92/0), `scripts/validate-stage16.mjs` | P9 |

**Domain contract — D10**
- **Module:** `src/lib/dhl/**`, `src/lib/palletline/**`, `src/lib/shipping/**`, `src/lib/warehouse/**`, `src/lib/customsDocs.ts`, `src/components/brand/LogisticsHub.tsx`, `src/components/admin/LogisticsControl.tsx`, `src/components/admin/CarrierMonitor.tsx`.
- **Tenant boundary:** a brand can never ship against another tenant's PO (refused at the domain layer).
- **Simulation:** both carriers are deterministic and make zero live network calls; the live client is chosen only from a positively-resolved connection.
- **Automation:** stage progression + exception/retry are deterministic.
- **Founder intervention:** a single shipment may be overridden by an admin, audited.
- **Amazon truth:** Collect/WE-PAY means the retail channel controls carrier assignment — a brand must not select the carrier there. Do not invent Amazon FC directory truth (AV-017 labelled "Amazon UK FCs": RELABEL).
---

## 15. D11 — FINANCE: PO → INVOICE → PAYMENT → RECONCILIATION → XERO → PAYOUT

| ID | Feature / function | Function | Surface | Status | Evidence |
|---|---|---|---|---|---|
| `D11-01` | Invoice issuance | Issue an invoice against a fulfilled PO; raising it creates an `invoice_due` work item. **§P7 (2026-09-23): gated on RECEIPT (`AV-018`), refused when zero-value, and the terms are chosen PER INVOICE (`14/30/60`)** | brand / admin | **VERIFIED** | `e2e/deterministic-journey.spec.ts`, `e2e/commerce-operational-simulation.spec.ts`, **`e2e/invoicing.spec.ts`**, `scripts/validate-p7-invoicing.mjs` |
| `D11-02` | Payment settlement (simulated) | `recordCommercePayment` → `CommercePayment` (`settled`, `simulated_bank_transfer`) | domain | **VERIFIED** | `e2e/commerce-operational-simulation.spec.ts` |
| `D11-03` | Reconciliation | `financialReconciliation.ts` — per-payment / per-PO reconciliation, unresolved deductions | admin `accounting` | **VERIFIED** | `e2e/xero.spec.ts`, `e2e/deductions.spec.ts` |
| `D11-04` | Xero accounting seam | `selectAccountingClient` + `src/services/xero/**` — Xero is the accounting/reconciliation layer, **NOT the bank** | admin `accounting` | **VERIFIED** | `e2e/xero.spec.ts` |
| `D11-05` | Payout proposal → HUMAN APPROVAL → rail | `PAYOUT_REQUIRES_HUMAN_APPROVAL = true`; the automated chain stops at a proposal | admin | **VERIFIED** | `e2e/brand-payouts.spec.ts`, `e2e/xero.spec.ts` |
| `D11-06` | Payout idempotency / no double payout | A settled payout is never downgraded; a doubtful payout is BLOCKED as `requires_review` | domain | **VERIFIED** | `e2e/brand-payouts.spec.ts` |
| `D11-07` | Payout rails declared once | `src/config/payouts.ts` — `PAYOUT_RAILS`, `NON_PAYOUT_RAIL_PROVIDERS = ['xero','stripe']`, `assertPayoutRail` refuses `stripe`/`xero` | domain | **VERIFIED** | `e2e/brand-payouts.spec.ts` |
| `D11-08` | **Rail DEFAULT (was a contradiction)** | `DEFAULT_PAYOUT_RAIL = 'payoneer'`, `SECONDARY_PAYOUT_RAIL = 'wise'` (`src/config/payouts.ts`) — **Founder decision T-1 APPLIED** 2026-09-21 across all five sources | domain | **VERIFIED** | `scripts/validate-edge-functions.mjs` (46/0) · `scripts/validate-payouts.mjs` · `e2e/brand-payouts.spec.ts` |
| `D11-09` | VAT treatment | `VAT_TREATMENT_CONFIGURED = false` (`src/config/commercial.ts:40`); the demo uses a **labelled** UK 20% illustration (`DEMO_VAT_ILLUSTRATION`, `src/config/vat.ts:135`); `resolveVatTreatment()`, `vatAmountFor()` return net/VAT/gross together | domain | **VERIFIED** | `e2e/commerce-operational-simulation.spec.ts` |
| `D11-10` | Stripe | Subscription billing only — explicitly refused as a payout rail | admin `billing` | **VERIFIED** | `e2e/billing.spec.ts` |
| `D11-11` | Commercial-model arithmetic | `computeCommissionModel` (Model A) and `computeBuyResellModel` (Model B) in `src/lib/finance/commercialModel.ts`; Model B's gross spread is never called the net margin | both | **VERIFIED** | `e2e/commercial-model.spec.ts` |
| `D11-12` | Amazon remittance/payment APIs | Payment/remittance API modelling | seam | **EVIDENCE-BLOCKED** | No verified Amazon payment/remittance API evidence — do not claim one |
| `D11-13` | **Invoice-number registry + terms + receipt gate (§P7, 2026-09-23)** | `invoiceRegistry.ts` — numbers UNIQUE and NEVER reused, a voided number stays consumed, **zero-value FAILS**, cancel + re-issue under a NEW Invoice ID (`AV-022`); `invoiceTerms.ts` — `14/30/60` **per invoice** with the due date DERIVED from them, receivables = issued-and-unpaid (`S14`: no Vendor Payments API exists, so a payment date is derived and labelled); `receivingStatus.ts` — the receiving status DERIVED from the received quantities + the fail-closed receipt gate (`AV-018`). Issuing/cancelling contacts **no** provider; `submitInvoices` remains **P12**. | admin / domain | **VERIFIED** | `scripts/validate-p7-invoicing.mjs` (115 assertions PASS, proved able to fail), `e2e/invoicing.spec.ts` (3 passed) |

**Domain contract — D11**
- **Module:** `src/config/payouts.ts`, `src/config/vat.ts`, `src/config/commercial.ts`, `src/lib/finance/**`, `src/services/xero/**`, `src/data/demoStore.ts` (commerce records). **§P7 adds the invoice owners:** `src/lib/commerce/invoiceTerms.ts` (terms + the ONE due-date / receivables derivation), `src/lib/commerce/invoiceRegistry.ts` (the number registry, `AV-022`) and `src/lib/commerce/receivingStatus.ts` (the receipt status + gate, `AV-018`).
- **Money chain (canonical):** PO → invoice → payment → reconciliation → Xero → payout proposal → **HUMAN APPROVAL** → rail.
- **Tenant boundary:** `listReconciliationsForBrand`, `listPayoutsForBrand`, `getDestinationForBrand` are tenant-scoped; operator read models are RBAC-gated at the caller.
- **Founder intervention:** payout approval is a mandatory human gate; an account change must be authorised and audited.
- **Refusals:** unknown rail → throw; `stripe`/`xero` → throw; unknown commercial model → human review (fail-closed).
- **Amazon truth:** the demo 20% VAT is an **illustration**, not a production tax determination. Amazon payments route per Founder policy (see §7.1) — the platform must not silently substitute one rail for another.
---

## 16. D12 — DEDUCTIONS · RETURNS · DISPUTES · CHARGEBACKS

| ID | Feature / function | Function | Surface | Status | Evidence |
|---|---|---|---|---|---|
| `D12-01` | Deduction ledger | Seeded deductions with type/amount/reason/status/evidence notes; `setDeductionStatus` | both (`returns_tracking`, `returns`) | **VERIFIED** | `e2e/deductions.spec.ts` |
| `D12-02` | Dispute workflow | Open a dispute with notes; outcome `won`/`lost` recorded | both | **VERIFIED** | `e2e/disputes.spec.ts` |
| `D12-03` | Unresolved-deduction linkage | `unresolvedDeductionsForPo(poNumber)` ties deductions to their PO | domain | **VERIFIED** | `e2e/deductions.spec.ts` |
| `D12-04` | Deduction taxonomy fidelity | The full deduction/chargeback window + code + dispute taxonomy | domain | **EVIDENCE-BLOCKED** | AV-019 / AV-019b: no verified taxonomy — **do not invent deduction windows, codes or classes** |

**Domain contract — D12**
- **Module:** `src/data/demoStore.ts` (`demoDeductions`), `src/lib/finance/financialReconciliation.ts`, `src/components/brand/DeductionsLedger.tsx`, `src/components/admin/ReturnsTrackingDashboard.tsx`.
- **State model:** `open` → `disputed` → `accepted` | `resolved`; a dispute carries `openedAt`, notes, optional outcome.
- **Recovery:** dispute → evidence → outcome; history is retained.
- **Amazon truth:** the seeded reasons quote retail-channel vendor-manual language; the **taxonomy** is not verified. AV-019/AV-019b remain EVIDENCE-BLOCKED.
---

## 17. D13 — CASES · HELPDESK · KNOWLEDGE BASE (canonical model §15 / brief §6)

| ID | Feature / function | Function | Surface | Status | Evidence |
|---|---|---|---|---|---|
| `D13-01` | **Brand case surface** | Brand opens a case, links one of its OWN records, reads its own cases + status + resolution + channel response | brand `cases` (**new S2a**) | **VERIFIED** | `e2e/brand-case-workflow.spec.ts` #1–#3 |
| `D13-02` | **KB sufficiency evaluator** | `src/lib/helpdesk/kbSufficiency.ts` — deterministic, fail-closed verdict `internally_resolvable` / `requires_founder_review` / `not_applicable` | domain (**new S2a**) | **VERIFIED** | `scripts/validate-kb-sufficiency.mjs` (37/37) + `e2e/brand-case-workflow.spec.ts` #1 |
| `D13-03` | **Relevant-data / context lookup** | Resolves the case's related object inside the case's OWN tenant; a cross-tenant reference is refused and reported, never resolved | domain (**new S2a**) | **VERIFIED** | `scripts/validate-kb-sufficiency.mjs` (cross-tenant assertions) |
| `D13-04` | Case state machine | `brand_submitted` → `under_mercenta_review` → `awaiting_brand_info` / `approved_for_escalation` → `escalated_to_provider` → `provider_responded` → `resolved` / `closed` | domain + admin `helpdesk` | **VERIFIED** | `e2e/brand-case-workflow.spec.ts` #2 |
| `D13-05` | Founder / Super Admin review queue | `listCasesAwaitingReview()` rendered with the sufficiency verdict, matched KB articles and verified/unverified context | admin `helpdesk` | **VERIFIED** | `e2e/brand-case-workflow.spec.ts` #2 |
| `D13-06` | External escalation (fail-closed) | `escalateCaseToProvider` — requires `approved_for_escalation`; only a positively-resolved `simulation` mode yields the mock; otherwise an UNAVAILABLE client returns a truthful error; idempotent by `requestKey` | domain | **VERIFIED** | `e2e/brand-case-workflow.spec.ts` #2 (`AMZ-CASE-MOCK-…`, labelled "Simulation — no live Amazon case") |
| `D13-07` | External reference / status linkage | Provider reference + mode + `simulated` flag stored on the case and shown truthfully | admin | **VERIFIED** | `e2e/brand-case-workflow.spec.ts` #2 |
| `D13-08` | Response return routing | `recordProviderCaseResponse` records the response **as received (human-entered)** against the same case and tenant; idempotent | admin | **VERIFIED** | `e2e/brand-case-workflow.spec.ts` #2 |
| `D13-09` | Resolution return to the brand | `resolveCase` requires a note the brand can read; the brand sees it on its own case | both | **VERIFIED** | `e2e/brand-case-workflow.spec.ts` #2 |
| `D13-10` | Case audit trail | Every transition writes a ticket audit record (created / reviewed / escalated / failed / responded / resolved / closed) | domain | **VERIFIED** | state transitions in #2; writer is `writeTicketAudit` |
| `D13-11` | Duplicate / replay handling | Provider escalation is idempotent (`t.amazonCase` short-circuit); response recording is idempotent | domain | **VERIFIED** | `ticketStore.ts` idempotency branches + #2 |
| `D13-12` | Knowledge Base content | 7 canonical articles (`kb-welcome`, `kb-dashboard`, `kb-purchase-orders`, `kb-catalog`, `kb-shipments`, `kb-compliance`, `kb-guidance`) | brand + admin | **VERIFIED** | `scripts/validate-kb-sufficiency.mjs` (every mapped id resolves) |
| `D13-13` | Support-chat ticket path | `LiveChatWidget` → `findOrCreateTicketForBrand` (legacy ticket path, distinct from canonical cases) | brand | **PARTIALLY VERIFIED** | `e2e/crm.spec.ts` |
| `D13-14` | "Mercenta Operator" wording | 16 `src/` occurrences + 1 Edge Function of a non-canonical role name (the recorded "9" was a 2026-09-20 snapshot) | copy | **DONE — RELABELLED (2026-10-05)** | T-3: Founder/Super Admin is the canonical human control role. Relabelled to **"Founder / Super Admin"** across 10 files (`src/integrations/registry.ts`, `src/components/admin/{LogisticsControl,AccountingPanel,ComplianceApprovals}.tsx`, `src/lib/commerce/channelPurchaseOrderIngestion.ts`, `src/lib/simulation/investorDemo.ts`, `src/lib/verification/documentVerification.ts`, `src/lib/finance/financialReconciliation.ts`, `src/data/api.ts`, `supabase/functions/payouts-transfer/index.ts`); Staff/RBAC functionality is **not** deleted. Gate: `npm run validate:operator-terminology` (mutation-proved) |

**Domain contract — D13**
- **Module:** `src/lib/helpdesk/kbSufficiency.ts` (new), `ticketStore.ts`, `amazonCaseClient.ts`, `src/data/knowledgeBase.ts`, `src/components/brand/BrandSupport.tsx` (new), `src/components/admin/HelpdeskDashboard.tsx`.
- **Domain objects:** `Ticket` canonical case fields — `caseRef`, `caseCategory`, `escalationState`, related object ids, `adminReview`, `amazonCase`, `providerResponse`, `resolution`.
- **Permissions:** review, escalation, response recording and resolution are Mercenta-operator actions; a brand may only create and read its OWN cases.
- **Tenant boundary:** `listCasesForBrand(brandId)` filters by `brandId`; `listAllCases()` is operator-only. A cross-tenant reference fails closed (verified).
- **Fail-closed:** unknown category, unresolvable/cross-tenant reference, retail-channel topic, or no matching KB article ⇒ `requires_founder_review`. **Never** "internally resolvable".
- **Automation:** the sufficiency check is deterministic; **the channel response is never generated** — it is entered by the operator.
- **Founder intervention:** the review queue is the human gate; a brand can never create an external case directly.
- **Persistence:** in-memory canonical store today (the same seam as every other domain store).
- **Amazon truth:** no Amazon case API is claimed; simulation is labelled; `AMZ-CASE-MOCK-…` is unmistakably simulated.
---

## 18. D14 — CRM · MESSAGING · NOTIFICATIONS · SOCIAL · WHATSAPP · USERTOUR

| ID | Feature / function | Surface | Status | Evidence |
|---|---|---|---|---|
| `D14-01` | Brand CRM (depth + comms) | admin `crm` | **VERIFIED** | `e2e/crm.spec.ts` |
| `D14-02` | Messages hub / log | admin `messages`, brand `team` | **VERIFIED** | `e2e/crm.spec.ts`, `e2e/admin-operational-surfaces.spec.ts` |
| `D14-03` | Notification centre + derivation | all shells | **VERIFIED** | `e2e/notifications.spec.ts`, `e2e/dashboard.spec.ts` |
| `D14-04` | Transactional email seam | `src/lib/mail/**` (the ONE seam) | **PARTIALLY VERIFIED** | `e2e/outreach-provider-hardening.spec.ts` |
| `D14-05` | Social / Postiz / embedded social | brand `social`, admin `postiz` | **VERIFIED** | `e2e/embedded-social.spec.ts` |
| `D14-06` | WhatsApp (Twilio) | admin `whatsapp` | **PARTIALLY VERIFIED** | render-only today (gap R4) |
| `D14-07` | UserTour in-app tours + KB link | `usertour` + `TourEngine` | **VERIFIED** | `e2e/tours.spec.ts` |
| `D14-08` | Rocket.Chat removal | historical removal retained as a regression guard | **VERIFIED** | `e2e/retired-platforms.spec.ts` |

**Domain contract — D14:** module `src/lib/crm/crmStore.ts`, `src/lib/messaging/**`, `src/lib/notifications/**`, `src/lib/social/**`, `src/lib/postiz/**`, `src/lib/whatsapp/**`, `src/lib/usertour/**`, `src/data/api.ts` (`logMessage`). Every outbound message is logged in the single canonical messages store; no surface keeps its own copy.

---

## 19. D15 — WORK · CALENDAR · AUTOMATION · FOUNDER OPERATING SYSTEM

| ID | Feature / function | Function | Surface | Status | Evidence |
|---|---|---|---|---|---|
| `D15-01` | Canonical work/task layer | Work items with source, SLA, resolution; `useWork`, `workStore` | brand `work`, admin `work` | **VERIFIED** | `e2e/work-layer.spec.ts` |
| `D15-02` | Derived calendar | Calendar derived from work items, not maintained separately | brand `calendar` | **VERIFIED** | `e2e/work-layer.spec.ts` |
| `D15-03` | Proactive reminder runner | Deterministic reminder runner incl. `invoice_due` and `onboarding_step` derivations | domain | **VERIFIED** | `e2e/deterministic-journey.spec.ts` |
| `D15-04` | Automation registry + run ledger | 8 automations, idempotency, observable failure, safe retry, disable, human-approval gate, declared next-run dates, optional-dependency degradation, recorded $0 free-first scheduler decision | admin `control_centre` | **VERIFIED** | `scripts/validate-automation.mjs`, `e2e/founder-operating-system.spec.ts` |
| `D15-05` | Founder/Super Admin Control Centre | 9 operating views | admin `control_centre`, `founder_centre` | **VERIFIED** | `e2e/founder-operating-system.spec.ts` |
| `D15-06` | Founder Ops AI | Deterministic daily brief + Ask Mercenta (7 declared intents, citations, explicit refusal); AI is optional, labelled, **free-only**, with a server-side credential seam and **no model call at all** without a credential | admin | **VERIFIED** | `e2e/founder-operating-system.spec.ts` |
| `D15-07` | Scheduler TRIGGER | The seam is declared, documented and tested — but no scheduler trigger is wired | domain | **NOT IMPLEMENTED** | recorded explicitly in PROJECT_STATUS; not a silent deferral |

**Domain contract — D15:** module `src/lib/work/**`, `src/lib/automation/registry.ts`, `src/lib/founder/briefFacts.ts`, `src/lib/ai/**`, `src/lib/commandCentre/controlCentre.ts`. Automation never changes a commercial route; every automated decision is auditable; human gates remain where declared.

---

## 20. D16 — INTEGRATIONS & CREDENTIAL CONTROL CENTRE

| ID | Feature / function | Surface | Status | Evidence |
|---|---|---|---|---|
| `D16-01` | Integration registry (28 ids) | `src/integrations/registry.ts` — provider, purpose, mode, environment, dependencies, functional areas | admin `integrations` | **VERIFIED** | `e2e/integration-hub.spec.ts` |
| `D16-02` | Honest unavailable / not-configured states | A provider that is not configured says so; nothing is presented as live | admin | **VERIFIED** | `e2e/integration-hub.spec.ts` #1, `e2e/company-control-centre.spec.ts` #3, `e2e/xero.spec.ts` #4, `e2e/google-setup.spec.ts` #1 |
| `D16-03` | Provider-specific credential fields | The wizard must not render an API-key form for an OAuth/enterprise provider | admin | **VERIFIED** | `e2e/integration-hub.spec.ts` |
| `D16-04` | "Create New API Key" honesty | Offered only where meaningful; Mercenta must never imply it can generate a third party's credential | admin | **VERIFIED** | `e2e/integration-hub.spec.ts` |
| `D16-05` | Durable credential vault | Entry, replacement, secure persistence, masked readback, validation, enable/disable | admin | **NOT IMPLEMENTED** | T-7. **`src/integrations/connections.ts` + `src/integrations/types.ts` hold credentials in an in-memory `Map`** — not sufficient for production. Owner **S2c** |
| `D16-06` | Secret handling rules | Never in a client bundle, log, screenshot, audit body or commit; server-side only | — | **MERCENTA RULE (enforced by review + the review-zip credential guard)** | `.clinerules`, `scripts/export-review-zip.sh` guard |
| `D16-07` | Credential activation | Live activation is an explicit step | — | **INTENTIONALLY EXCLUDED from this workstream** | No production credential activation; no live provider call |

**Domain contract — D16:** module `src/integrations/registry.ts`, `connections.ts`, `types.ts`, `IntegrationsContext.tsx`, `src/components/admin/integrations/**`. **Simulation must work with no credentials at all** — credentials only turn on already-built functionality.
---

## 21. D17 — SIMULATION ARCHITECTURE & PROVIDER SAFETY (a protected invariant)

| ID | Feature / function | Function | Status | Evidence |
|---|---|---|---|---|
| `D17-01` | `isProviderSimulationSafe` | `src/integrations/types.ts:290` — **strictly** `mode === 'simulation'` | **VERIFIED** | `scripts/validate-provider-mode-safety.mjs` (52 assertions, 0 failures) |
| `D17-02` | Unknown provider resolution | An unknown/unregistered provider resolves to `not_registered` — **never** simulation | **VERIFIED** | same validator |
| `D17-03` | Mode derivation | A sandbox connection is never live; operator `disabled` always wins; `needs_attention` distinguishes error from degraded | **VERIFIED** | same validator |
| `D17-04` | Registry invariants | No provider defaults to live; nothing claims a live connection at boot | **VERIFIED** | same validator |
| `D17-05` | Behavioural refusal | A scenario is refused for every unsafe mode **and** when no mode lookup is supplied (the gate defaults to `unknown`) | **VERIFIED** | `src/lib/simulation/scenarioEngine.ts` + validator + `e2e/simulation-control.spec.ts` |
| `D17-06` | Deterministic scenario engine | 9 declared scenarios; simulated runs record steps and audit ids | **VERIFIED** | `e2e/simulation-control.spec.ts` |
| `D17-07` | Simulation labelling | Every simulated action is truthfully labelled and makes **zero live network calls** | **VERIFIED** | e2e external-call watchers assert `[]` across specs |
| `D17-08` | Deterministic investor demo | `src/lib/simulation/investorDemo.ts` | **VERIFIED** | `e2e/investor-demo.spec.ts` |

**Domain contract — D17:** the mode vocabulary is `simulation` · `configured` · `live` · `degraded`/`error` · `unknown`/`not_registered`. **UNKNOWN ≠ SIMULATION.** This is a MERCENTA RULE and a protected invariant — a change here is a security change.

---

## 22. D18 — ONBOARDING · CONTRACTS · E-SIGNATURE

| ID | Feature / function | Function | Surface | Status | Evidence |
|---|---|---|---|---|---|
| `D18-01` | Brand onboarding wizard | Multi-step; onboarding **fails closed** without a selected commercial model (`checkCommercialModelSelection`) | brand `onboarding` | **VERIFIED** | `e2e/onboarding-workflow.spec.ts`, `e2e/commercial-model.spec.ts` |
| `D18-02` | Onboarding → platform handoff | Canonical onboarding record → a brand that can actually reach its portal | brand | **VERIFIED** | `e2e/onboarding-handoff.spec.ts` |
| `D18-03` | Distribution agreement | `ensureDistributionAgreement`, agreement states | brand `contracts` | **VERIFIED** | `e2e/legal-agreements.spec.ts` |
| `D18-04` | E-signature seam | `esignature` provider with `providerOptions` (DocuSign / PandaDoc); the provider must be confirmed before wiring | admin | **PARTIALLY VERIFIED** | `e2e/legal-agreements.spec.ts`, `e2e/integration-hub.spec.ts` |
| `D18-05` | Commercial model A/B assignment | Per brand; Super-Admin-only change with actor **and reason** → audit (`setBrandCommercialModel`); an unknown model is REFUSED, never defaulted | admin `commercial` | **VERIFIED** | `e2e/commercial-model.spec.ts` |
| `D18-06` | Demo assignment | `DEMO_MODEL_A_BRAND_ID = 'brand-astonish'`, `DEMO_MODEL_B_BRAND_ID = 'brand-tapatio'` | demo | **VERIFIED** | `src/data/demoData.ts:94-95` |

**Domain contract — D18:** module `src/config/commercialModel.ts`, `src/lib/finance/commercialModel.ts`, `src/lib/onboarding/onboardingLifecycle.ts`, `src/lib/agreement.ts`, `src/lib/esign/**`. Commercial documents are INTERNAL between Mercenta and the brand and are **completely separate** from retail-channel compliance documents.
---

## 23. D19 — INVESTORS · FUNDING · GRANTS · PARTNERSHIPS · COSTS · BILLING

| ID | Feature / function | Surface | Status | Evidence |
|---|---|---|---|---|
| `D19-01` | Investor pitch / demo centre | admin `pitch`, `founder_centre` | **VERIFIED** | `e2e/investor-demo.spec.ts`, `e2e/founder-investor-centre.spec.ts` |
| `D19-02` | Funding pipeline (approval-gated) | admin `grants` | **VERIFIED** | `e2e/funding-pipeline.spec.ts` |
| `D19-03` | Bank financing / manufacturer sourcing / research | Super Admin tabs | **NOT VERIFIED** | gap R7 |
| `D19-04` | Partnerships centre | admin `partnerships` | **IMPLEMENTED — NOT VERIFIED** | no dedicated spec |
| `D19-05` | Operating costs | admin `costs` | **VERIFIED** | `e2e/operating-costs.spec.ts` |
| `D19-06` | Brand subscription billing | admin `billing` | **VERIFIED** | `e2e/billing.spec.ts` |
| `D19-07` | AI cost model policy | domain (`src/lib/costs/modelPolicy.ts`) | **VERIFIED** | `scripts/validate-founder-operating-system.mjs` — FREE-only runtime AI, no paid fallback |

---

## 24. D20 — PERSISTENCE · AUDIT · EVENT FEED

| ID | Feature / function | Function | Status | Evidence |
|---|---|---|---|---|
| `D20-01` | Domain repository seam | `src/data/domainRepository.ts` — `memory` \| `supabase`, tenant scope `{kind:'ops'} \| {kind:'brand',tenantId}`, hydration, persistence mirror with an honest status (`memory-only`/`pending`/`durable`/`failed`) | **VERIFIED** | `e2e/domain-persistence.spec.ts`, `e2e/domain-acceptance.spec.ts` |
| `D20-02` | No fabricated hydration | A hydrate that finds nothing never invents records | **VERIFIED** | `e2e/domain-persistence.spec.ts` |
| `D20-03` | Canonical audit log | `demoAuditLog` + per-domain audit writers (`writeTicketAudit`, `recordComplianceAudit`, `recordCatalogAudit`, `recordCommerceAudit`) | **VERIFIED** | `e2e/deterministic-journey.spec.ts` |
| `D20-04` | Event feed | `src/lib/events/**` — canonical event stream consumed by work/notification derivations | **VERIFIED** | `e2e/work-layer.spec.ts` |
| `D20-05` | Supabase / RLS server-side enforcement | The persistence backend exists; server-side policy is audited by script, not asserted in a browser | **NOT AUTOMATED** | `scripts/rls-audit.mjs`, `scripts/rls-cross-brand-test.mjs` |
| `D20-06` | Status semantics | Every state renders a text label; colour is never the only signal | **VERIFIED** | `e2e/status-semantics.spec.ts` |

**Domain contract — D20:** one canonical store per domain; no component keeps a private copy. Audit records carry actor, role, tenant, action, object, timestamp and result; history is never destroyed.

---

## 25. D21 — WHOLE-PLATFORM OBJECT RESOLUTION (brief §5) — **the largest open architectural gap**

**Required canonical chain (brief §5):**

```
Amazon event / data → Amazon object → Mercenta object → Brand → Tenant
```

| ID | Requirement | Status | Evidence |
|---|---|---|---|
| `D21-01` | ONE reusable resolution mechanism (no per-module ad-hoc ownership logic) | **BUILT (2026-10-05)** | `src/lib/resolution/objectResolution.ts` — the ONE resolver. `npm run validate:object-resolution` (32 assertions, mutation-proved) proves one mechanism; the Control Centre resolves through it |
| `D21-02` | Deterministic, tenant-safe, auditable resolution | **BUILT (2026-10-05)** | `resolveObject` returns the same chain for the same input (gate §B); every chain names the Mercenta object, brand and tenant |
| `D21-03` | Duplicate / replay awareness | **BUILT (2026-10-05)** | the platform-level `ResolutionLedger` returns the FIRST chain on a replay, flagged `replay: true` — a duplicate cannot mint a second owner (gate §E) |
| `D21-04` | No guessing; unknown ownership fails safely | **BUILT (2026-10-05)** | `unknown` (no match) and `cross_tenant` (>1 tenant) are declared fail-closed outcomes; the cross-tenant case is never picked (gate §C/§D) |
| `D21-05` | Unresolved objects → Founder exception / review | **BUILT (2026-10-05)** | `buildUnresolvedQueue` collects every fail-closed outcome; `FounderControlCentre.tsx` renders the review queue on the Operations view (gate §F) |
| `D21-06` | Cross-module reference consistency | **BUILT (2026-10-05)** | one shared contract (`ExternalObjectRef` / `ResolvableObject` / `ResolutionChain`) every module can be reconciled to. **HONEST LIMIT:** the resolver + its Control Centre use are BUILT; reconciling EVERY existing module's own read model to this contract is the recorded follow-on |

**Assessment (evidence-based, not aspirational):** the platform has **strong per-domain tenant scoping** but **no platform-level resolver**. Building one is a genuine architecture increment, not a refactor of something that exists. It is therefore recorded as the **top remaining architectural item (owner S2a of the pre-existing roadmap)** with the contract above — and **no partial resolver has been invented in this workstream**, because a half-built resolver that some modules use and others ignore would be worse than the honest gap.

**A reusable resolver must provide, when built:** deterministic resolution · tenant-safe failure · audit record · duplicate/replay awareness · a declared `UNKNOWN` outcome that routes to a Founder review queue · and zero cross-tenant leakage.
---

## 26. D22 — AMAZON RECONCILIATION SURFACE

| ID | Requirement | Status | Evidence |
|---|---|---|---|
| `D22-01` | 52 findings carry an explicit disposition | **DONE (documented)** | `docs/AMAZON_RECONCILIATION_STATUS.md` — KEEP 16 · RELABEL 9 · BUILD 17 · REMOVE/re-model 3 · EVIDENCE-BLOCKED 7 |
| `D22-02` | Findings actually applied in code | **0 of 52 applied** | the register is a plan, not a record of work |
| `D22-03` | Evidence preserved, unmodified | **DONE** | `docs/AMAZON_VENDOR_TRUTH_VALIDATION_2026-09-20.md`, `docs/AMAZON_VENDOR_DISCREPANCY_REGISTER_2026-09-20.md` |
| `D22-04` | No inference promoted to fact | **DONE** | the register states UNKNOWN / EVIDENCE-BLOCKED explicitly |
| `D22-05` | SP-API modelled operations | **PARTIAL** | `src/lib/spapi/**` models a subset; `submitAcknowledgement` was **implemented by P4 (2026-09-23)** on the real and mock clients, Mercenta-side (`scripts/validate-proxy-model.mjs`); `getPurchaseOrdersStatus`, `getShipmentDetails`, `getShipmentLabels` (honest UK/EU refusal — NA-only), `SubmitShipments`, `SubmitShipmentConfirmations`, `submitInvoices`, `submitInventoryUpdate` remain **desired but not implemented** (AV-040, P12) — simulation-first only, never claimed live |
| `D22-06` | Wording safeguards | **VERIFIED** | `npm run validate:wording` — 270 src files scanned, 0 outward-facing violations |

---

## 27. D23 — RAKAZO (PROTECTED)

| ID | Requirement | Status | Evidence |
|---|---|---|---|
| `D23-01` | Rakazo remains present and unmodified | **PROTECTED — UNTOUCHED** | `src/components/admin/RakazoPanel.tsx`, Super Admin `rakazo` tab, `e2e/rakazo.spec.ts`. Hard stop: this workstream must not modify or remove it |

---

## 28. D24 — MIRO

| ID | Requirement | Status | Evidence |
|---|---|---|---|
| `D24-01` | Miro integration present and technically valid | **BLOCKED** | No Miro OAuth/callback architecture was found in the repository during this increment (no Miro provider in `src/integrations/registry.ts`). **A callback URL was therefore NOT guessed and no OAuth endpoint was invented** |
| `D24-02` | Miro mirrors the Master Matrix, never competes with it | **MERCENTA RULE** | applies if and when Miro is connected |
| `D24-03` | What is missing | **documented** | a registered Miro provider + a real redirect/callback endpoint + a sync path from this document. Owner: **S13** (documented, not activated) |

---

## 29. D25 — TEST & VALIDATION INFRASTRUCTURE

| ID | Requirement | Status | Evidence |
|---|---|---|---|
| `D25-01` | TypeScript | **PASSING** | `npx tsc --noEmit -p tsconfig.app.json` → exit 0 |
| `D25-02` | ESLint incl. `react-hooks` rules-of-hooks + exhaustive-deps as errors | **PASSING** | `npm run lint` → exit 0 (S2a fixed one real `exhaustive-deps` error) |
| `D25-03` | Production build | **PASSING** | `npm run build` → built in ~4.5s |
| `D25-04` | Wording gate | **PASSING** | `npm run validate:wording` |
| `D25-05` | Provider-mode safety validator | **PASSING** | `scripts/validate-provider-mode-safety.mjs` |
| `D25-06` | Case/KB sufficiency validator | **PASSING (new S2a)** | `scripts/validate-kb-sufficiency.mjs` — 37/37, exit 0 |
| `D25-07` | Browser E2E | **PASSING (subset re-run in S2a)** | `e2e/brand-case-workflow.spec.ts` 3/3 + 47 existing tests across 5 affected suites = **50 passed / 0 failed** |
| `D25-08` | Full 358-declaration suite re-run | **NOT RUN in S2a** | explicitly recorded — not claimed as passing |
| `D25-09` | Registry reconciliation is idempotent | **ENFORCED** | every `scripts/reconcile-*.cjs` refuses to write on a duplicate id or an unknown status and never deletes a historical row |

---

## 30. §7 — CONTRADICTION REGISTER (retained until the Founder decides)

These are **not** resolved here. They are recorded with both sides and an owner.

### 7.1 Payout rail default — Wise vs Payoneer — ✅ RECONCILED 2026-09-21

| Side | Statement | Source |
|---|---|---|
| **A (code + rule file) — RESOLVED** | `DEFAULT_PAYOUT_RAIL = 'payoneer'`, `SECONDARY_PAYOUT_RAIL = 'wise'`; `.clinerules/mercenta-business-model.md`, `docs/MERCENTA_BUSINESS_MODEL.md` and `docs/INTEGRATIONS.md` now declare the same order; `supabase/functions/payouts-transfer/index.ts` reads `DEFAULT_RAIL = 'payoneer'` | `src/config/payouts.ts`, the four documents above, the edge function |
| **B (Founder decision T-1, 2026-09-20)** | **Payoneer is the canonical PRIMARY/default Mercenta business account and Amazon payment account. Wise is SECONDARY.** Wise must never be silently substituted when Payoneer is unavailable | `docs/AMAZON_RECONCILIATION_STATUS.md` §4 T-1; `PROJECT_STATUS.md` T-1 |

**Recorded state: APPLIED (2026-09-21, runtime parity session 5).** The previously recorded contradiction is closed: the
five sources agree on the T-1 order. Payout **arithmetic**, the §7 human-approval gate and the explicit Stripe/Xero
refusals were NOT changed, and no live external account was touched — rail activation remains credential-only and both
rails still run their deterministic simulation. Evidence: `scripts/validate-edge-functions.mjs` (46 assertions, 0
failures, repointed default-rail assertions), `scripts/validate-payouts.mjs` (`PAYOUT_VALIDATION_PASS`),
`e2e/brand-payouts.spec.ts` (4 passed), and the registry row `runtime-payout-rail-t1-reconciled` (which supersedes the
old contradiction row).

### 7.2 Amazon "guaranteed PO" / partnership language vs platform reality

No live contradiction found in code (the wording gate passes), but the register retains the standing prohibition: **never claim Amazon partnership, endorsement, guaranteed POs, guaranteed sales, guaranteed acceptance or guaranteed Vendor status.** `AMAZON_PROGRAMME_STATUS = 'not_confirmed_with_amazon'` is canonical.

---

## 31. §8 — EVIDENCE-BLOCKED REGISTER (mirrors `AMAZON_RECONCILIATION_STATUS.md` §5)

Nothing below may be modelled until the evidence is obtained and cited:

1. Vendor **performance scorecards** (AV-020, AV-003)
2. **Receiving tolerances** (AV-047)
3. **Deduction / chargeback windows, codes and dispute taxonomy** (AV-019, AV-019b)
4. The **Vendor catalogue submission route** (AV-035)
5. The **UK marketplace ID** (AV-034)
6. Whether a **Vendor Central routing-request UI deadline** exists (AV-013, AV-048)
7. **Amazon listing-image requirements** (AV-033)
8. UK-specific **marketplace rule differences** (AV-046)
---

## 32. §9 — HONEST GAP REGISTER (numbered, with an owning increment)

| # | Gap | State | Owner |
|---|---|---|---|
| 1 | **Whole-platform object resolution** (Amazon object → Mercenta object → brand → tenant), incl. an unresolved-ownership Founder queue | **BUILT (2026-10-05)** — see D21. The ONE resolver `src/lib/resolution/objectResolution.ts` (deterministic · fail-closed `unknown`/`cross_tenant` · replay ledger · founder review queue), USED by the Control Centre and gated by `npm run validate:object-resolution`. Reconciling every existing module's own read model to the shared contract is the recorded follow-on | **S2a (roadmap)** |
| 2 | **Logistics Hub** (provider eligibility by route/freight terms/configured capability; collect/WE-PAY; prepaid; consolidation; performance) | **PARTIAL — provider eligibility DERIVED, ETA + delivery performance ADDED (2026-09-22)**; consolidation outstanding | Logistics Hub increment |
| 3 | **Logistics Map Engine** (LIVE VERIFIED / SIMULATED / AMBIENT, clickable markers) | **CLOSED IN PART (2026-09-21)** — implemented and browser-verified; no provider licensed or activated | **S10** |
| 4 | **Durable credential vault** (entry, replacement, masked readback, validation, enable/disable) — today an in-memory `Map` | **NOT IMPLEMENTED** | **S2c** |
| 5 | **`isBackOrderAllowed` fail-closed gate** + `on_hold` state + ack completeness + ack↔invoice match + rejected-line guard | **CLOSED IN PART (2026-09-22)** — the fail-closed gate and the rejected-line guard are implemented and tested at the domain boundary; `on_hold`, ack completeness and ack↔invoice match remain | **S5** |
| 6 | **Routing re-model** — remove the brand Routing Request mechanic, drop the unsupported 10am-Pacific claim, make `mercenta_hub` optional | **CLOSED IN PART (2026-09-22)** — the unsupported 10am-Pacific claim is REMOVED and the deadline is Mercenta-owned; the routing mechanic and the optional-`mercenta_hub` re-model remain | **S4** |
| 7 | **Catalogue Amazon contract fidelity** (submission route, image requirements, marketplace ID) | **EVIDENCE-BLOCKED** | **S8** |
| 8 | **Deduction/chargeback taxonomy fidelity** | **EVIDENCE-BLOCKED** | later |
| 9 | **Amazon Vendor SP-API surface** (`submitAcknowledgement`, `getPurchaseOrdersStatus`, `submitInvoices`, `SubmitShipments`, `GetShipmentDetails`, `SubmitShipmentConfirmations`, `getTransaction`) | **MODELLED IN PART (2026-09-29)** — eight operations are implemented on both clients of the seam and gated (`npm run validate:p12-spapi-seam`, 59 assertions); only **`getTransaction`** remains, and it is **EVIDENCE-BLOCKED** (no documented request/response shape or status vocabulary, so modelling it would be invention) | **S7** |
| 10 | **Payoneer-primary payout rework** across all five sources (T-1) | **DECIDED, NOT APPLIED** — see §7.1 | **S11** |
| 11 | **Full 358-declaration E2E suite re-run** | **NOT RUN in S2a** (subset of 50 run) | **S12** |
| 12 | `monitoring`, `whatsapp` views — feature assertions (render-only today) | **PARTIALLY VERIFIED** | **S12** |
| 13 | Super Admin `research`, `manufacturer`, `financing` tabs — no feature assertions | **NOT VERIFIED** | **S12** |
| 14 | `partnerships`, brand `documents`/`reports` — no dedicated spec | **PARTIALLY VERIFIED** | **S12** |
| 15 | Pagination behaviour + error-boundary containment under a real render fault | **NOT AUTOMATED** | **S12** |
| 16 | Server-side security verification (headers, CORS, rate limiting, secret-history scan) | **PARTIAL (2026-10-05) — RATE LIMITING now BUILT**: the ONE owner `supabase/functions/_shared/rateLimit.ts` guards ALL 14 Edge Functions (after the CORS preflight branch) and is gated by `npm run validate:rate-limiting` (66 assertions). Response headers + browser secret-exposure are covered by the Phase 15 repo-side audits (`npm run validate:api-exposure`, `public/.htaccess`). The limiter is per-isolate/best-effort (honest limit — see PRODUCTION_READINESS.md) | **S13** |
| 17 | **Miro** connection (provider + real callback endpoint + sync path) | **BLOCKED — documented, not activated** | **S13** |
| 18 | `carriers` admin view + `CarrierShell` reconciliation toward the Logistics Hub | **INTENTIONALLY EXCLUDED** (T-2) | Logistics Hub increment |
| 19 | "Mercenta Operator" wording | **DONE — RELABELLED (2026-10-05)** (T-3) — relabelled to "Founder / Super Admin"; gate `npm run validate:operator-terminology` | done |
| 20 | Amazon mis-attribution copy (AV-031) | **OPEN — RELABEL** | S5/S7 |
| 21 | Scheduler TRIGGER wiring (seam declared + tested, trigger not wired) | **NOT IMPLEMENTED** | later |

**Nothing in this register is silently dropped.** Each row also exists (or is added by the S2a reconcile script) in
`requirements-registry.json` with a status and an owner.

---

## 33. §10 — REGISTRY RECONCILIATION MAP

`requirements-registry.json` is the **granular** Master Matrix (per-capability status + evidence). This document
is the **feature/function** projection of it. They must agree.

| This document | Registry |
|---|---|
| Every `D**-**` row | at least one `entries[]` row with the same capability description |
| A row promoted to **VERIFIED** | the registry row must be `built_and_tested` **and** name a spec that exists |
| A row that is **NOT IMPLEMENTED** | registry `not_started` |
| A row that is **EVIDENCE-BLOCKED** | registry `blocked` |
| A row that is **INTENTIONALLY EXCLUDED** | registry `deferred` |
| S2a's new capability | added by `scripts/reconcile-s2a-case-workflow-registry.cjs` (idempotent) |

`built_and_tested` is **only** used where the evidence names a real `e2e/*.spec.ts` that exists — the reconcile
script refuses to write otherwise.

---

## 26. D26 — MERCENTA BRAIN (added 2026-09-21)

**What it is:** the platform's third information-architecture destination — "how is everything connected, what do
we know, and why?" — implemented as a first-class interactive product surface. It is a **projection** of the
canonical domain: it owns no business state and mutates nothing.

| Dimension | Value |
|---|---|
| Role | Super Admin / Founder only (hidden from the nav for every other tier AND guarded at render) |
| Tenant scope | Mercenta-wide (its Brand counterpart is tenant-scoped — see the row below) |
| Surface | `src/components/admin/MercentaBrain.tsx` + `src/components/shared/brain/BrainCanvas.tsx` |
| Domain service | `src/lib/intelligence/brain/{types,buildGraph,layout}.ts` |
| Entities | 28 declared kinds; 27 instantiated at runtime (Mercenta scope) |
| Relationships | 20 declared kinds; 11 instantiated at runtime; 8 declared with **no instance** in the current canonical data (printed by the harness, never faked) |
| Epistemic model | VERIFIED · SIMULATION · INFERENCE · UNKNOWN — never collapsed; measured 206 / 25 / 0 / 68 |
| Authority model | CODE · AUTOMATION · AGENT · MIXED · HUMAN — measured 193 / 9 / 1 / 30 / 66 |
| Provenance | Mandatory on every node (`origin` + `ref`); measured `unprovenanced = 0` |
| Permissions | Super Admin; the brand branch of the builder cannot reach the Mercenta-only layers |
| Simulation | Reads `isProviderSimulationSafe`; a non-simulation default resolves UNKNOWN, never simulation; simulated edges render dashed |
| Audit | Read-only surface — it produces no mutation and therefore no audit record; it *displays* recorded decisions and approvals |
| Evidence | `e2e/mercenta-brain.spec.ts` (10 passed / 0 failed, executed) · `scripts/validate-mercenta-brain.mjs` (30 assertions + runtime, PASS) |
| Status | **VERIFIED** (browser-executed this session) |

**Brand counterpart — tenant-scoped relationship map.** `src/components/brand/BrandRelationshipMap.tsx`, a section
of Brand Intelligence, built by the SAME builder with `scope: { kind: 'brand', tenantId }`. The brand branch never
runs the platform/policy/decision/automation/agent/acquisition layers; an unknown tenant fails closed. Verified
tenant-scoped (39 records / 42 relationships for `brand-astonish`; no leaked kind, no leaked tenant) by
`e2e/mercenta-brain.spec.ts` test 10 — **executed**.

**Deliberately NOT done by this increment:** the Amazon-truth semantics remain unchanged
(`docs/AMAZON_RECONCILIATION_STATUS.md`: 52 findings, APPLIED = 0). `src/config/payouts.ts`
declared Wise as the default payout rail at the time of this increment; Founder decision **T-1**
(Payoneer default, Wise secondary) was reconciled in code and across the five sources on
2026-09-21, so the Brain now renders Payoneer as the default rail. Both are recorded in
`PROJECT_STATUS.md` heading 3.

---

## 33A. §LOGISTICS OPERATIONAL MAP — INCREMENT (2026-09-21, session 2)

Added by the **Logistics Hub + operational map** increment (branch `redesign/foundation`, start HEAD `47db66c`).
Rows are additive; no existing row was deleted, renamed or restyled.

| # | Capability | Role / surface | Status | Evidence (run in this session) |
|---|---|---|---|---|
| L1 | Interactive operational map (pan / wheel-zoom / zoom controls / **Fit** / click-select / click-empty-clear / auto-fit-once) | Brand Inbound Shipments + Admin Logistics Control | **VERIFIED** | `e2e/logistics-hub-map.spec.ts` tests 1–3, 12 (executed) |
| L2 | Declared lat/lon **graticule** + nodes (origin / UK gateway / Mercenta hub / Amazon FC city) + one arc and one progress marker per consignment | both logistics surfaces | **VERIFIED** | tests 1–2 (graticule attached; leg/marker/node counts equal the visible set) |
| L3 | Map ↔ records linkage: one shared selection state between map markers and list rows; inspector exposes stage, route, evidence reason, freight term and carrier position | both logistics surfaces | **VERIFIED** | tests 4, 13 + admin tests B |
| L4 | Filters genuinely drive the map **and** the list (search / evidence / lane / status / admin focus) | both logistics surfaces | **VERIFIED** | tests 5, 16 + admin test C |
| L5 | **LIVE VERIFIED / SIMULATED / AMBIENT**, fail-closed, with a stated reason per leg and a legend that states the claim | both logistics surfaces | **VERIFIED** | `scripts/validate-logistics-map.mjs` (executed module assertions) + tests 6/7 |
| L6 | **Freight Collect = CHANNEL-ARRANGED** (no false Mercenta carrier choice) / **Freight Prepaid = MERCENTA-ARRANGED** (lane rule, no universal carrier) | both logistics surfaces | **VERIFIED** | `validate-logistics-map.mjs` (carrier rules executed) + tests 8/9/10 |
| L7 | Canonical geography in ONE module; unresolvable places fail closed to **schematic**, never invented; precision stated on screen | map | **VERIFIED** | `validate-logistics-map.mjs` + tests 1/2/4 |
| L8 | Ambient drift is meaningful (in-transit only) and disabled under `prefers-reduced-motion` | map | **VERIFIED** | test 11 (computed animation-name is `none` under reduced motion) |
| L9 | Shipment-origin **placeholder defect fixed** (`Brand warehouse` / `Origin depot` → the brand's declared nation, or an explicit "not declared") | domain (`src/data/api.ts`) | **VERIFIED** | `validate-logistics-map.mjs` + tests 2/4 + admin test B |
| L10 | Retired **mandatory linear logistics chain NOT reintroduced**; stage progress from the canonical `STAGE_BY_STATUS` | domain | **VERIFIED** | `validate-logistics-map.mjs` (asserted) |
| L11 | Contract gate that EXECUTES the real modules (esbuild → node) rather than grepping source | `npm run validate:logistics-map` | **VERIFIED** | `LOGISTICS_MAP_VALIDATION_PASS (60 assertions, 0 network calls)` |
| L12 | Workspace redesign of the brand Logistics Hub on the canonical primitives; the non-functional "New Booking" form **removed** (real booking is the ASN flow) | brand | **VERIFIED** | tests 1, 14/15 (artefacts open/close, Escape dismissal), 12 (responsive) |
| L13 | Reduced-motion hook consolidated to ONE implementation shared by the Brain and the map | platform | **VERIFIED** | `e2e/mercenta-brain.spec.ts` 10/10 still pass |

**Known exception recorded here (not papered over):** the demo has **zero seed consignments** — `DEMO_SHIPMENTS`
only keeps POs in `ready_to_fulfil` / `shipped` / `delivered`, and the deterministic status spread never reaches
those for either cleared brand. The richer `INITIAL_SHIPMENTS` (10 rows with real cities) is **orphaned** from the
feed the logistics surfaces read. The map is proven working against consignments created through the real
PO → acknowledge → ASN lifecycle; populating the demo is a business-data decision and is listed as a Founder
decision in `PROJECT_STATUS.md` heading 9.

**Also recorded:** the pre-existing failing `e2e/mercenta-brain.spec.ts` test 10 was reproduced against a
read-only export of HEAD `47db66c` (so it is demonstrably NOT caused by this increment) and fixed at the source of
the fragility — the spec's own tour dismissal.

---


## 34. §11 — MAINTENANCE RULE

1. **This matrix must be updated in the same session as any increment that adds, removes or changes a
   feature, function, role, surface, integration or status.** It is the Level-1 source of the five synchronised
   project-state sources.
2. A row may only be promoted to **VERIFIED** when its evidence cell names a spec that **exists and was run**
   in that session.
3. When a capability is removed, its row is **not deleted** — it is marked **SUPERSEDED** with the reason, the
   increment and the commit/checkpoint that superseded it.
4. Adding a nav view, route, integration or domain operation **without** adding a row here is a matrix defect,
   and the next reconciliation pass must flag it.
5. A new contradiction must be added to §7 — never resolved silently.
6. Never inflate a count, and never delete a legitimate existing entry to make reconciliation look clean.

---

*Created in increment S2a (2026-09-20) as the Level-1 canonical document required by the brief §2/§3, which
was **missing** from the repository before this session. Derived from the repository at
`19be002c4b3d6a64020b4740879c56ef1550e628`. Nothing was deleted, renamed or restyled to produce it; the two
contradictions it records are retained unresolved, and the largest architectural gap (D21) is stated as a gap
rather than papered over.*
- **Persistence:** admin mutations flow through the same canonical stores as the brand surfaces (single source of truth), not through admin-only copies.
- **Refusals:** RBAC denial; unknown record → refusal; cross-tenant object → refusal.