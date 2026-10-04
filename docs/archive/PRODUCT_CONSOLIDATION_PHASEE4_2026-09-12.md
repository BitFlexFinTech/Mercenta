# PHASE E4 — COMMERCE / AMAZON-STYLE OPERATIONAL SIMULATION
**Mercenta Partners Ltd — platform build phase report**
Date: 2026-09-12 · Branch: `redesign/foundation` · Author: Cline (implementation session)

---

## 0. WHAT THIS PHASE IS

E4 makes the platform's **operational commerce lifecycle genuinely functional in
SIMULATION mode** — end to end, with **zero live credentials and zero external
network calls**.

The brand can now drive, from the real UI, a complete operational cycle on a
product that has already completed the E3 catalog lifecycle:

```
E3-ready catalog product
  → OPERATIONAL ELIGIBILITY   (derived from E3 — never a second rule set)
  → SIMULATED PURCHASE ORDER
  → PO ACKNOWLEDGEMENT
  → FULFILMENT / SHIPMENT     (existing ASN seam; simulated carrier)
  → RECEIVING                 (existing delivery reconciliation)
  → SIMULATED INVOICE
  → SIMULATED PAYMENT
  → EXCEPTIONS / CHARGEBACKS  (existing Deduction ledger)
  → DISPUTE / RESOLUTION
  → resulting operational state
```

Every operational record carries **explicit, truthful simulation provenance**
(`mode: 'simulation'`, `simulated: true`) and says so in its own text
(“No live provider contacted”, “No email sent”, “No accounting provider
contacted”, “No payment provider contacted”).

**No fabricated Amazon activity.** No real PO, no real ASIN, no real shipment
booking, no real email, no real payment, no real accounting entry.

---

## 1. GIT STATE AT THIS CHECKPOINT

| Item | Value |
|---|---|
| Branch | `redesign/foundation` |
| **HEAD (pre-E4 checkpoint, generated/forensic artefacts preserved verbatim)** | **`657b6b2`** |
| Previous HEAD | `9b925cc` |
| E3 implementation commit | `f86d8c7` |
| E3 documentation checkpoints | `ed871a3` → `9b925cc` |
| Protected baseline | **`959b4d2`** |
| Baseline tag | `mercenta-baseline-before-redesign-20260907` |
| Baseline is an ancestor of HEAD | **YES** (`git merge-base --is-ancestor` → exit 0) |
| E4 implementation commit | recorded in the E4 docs checkpoint (see §11) |
| Rebase / amend / reset / force-push | **none** |

**Pre-E4 checkpoint commit `657b6b2`** was made FIRST, exactly as instructed: it
preserves the working-tree artefacts found at session start verbatim (the
generated review zip, `playwright-report/`, `test-results/`, the previous BI
forensic captures/docs and `design/`), without deleting, cleaning or
`.gitignore`-ing any of them. It also fixes the true pre-E4 comparison baseline
used in §6 for the validator byte-comparison.

---

## 2. THE E4 DISCOVERY RESULT (what already existed, and therefore was REUSED)

E4 did **not** invent parallel systems. The repository already contained a large
commerce vocabulary, and E4 extends it additively:

| Already existed | Where | E4 reuse |
|---|---|---|
| `PurchaseOrder`, `PurchaseOrderStatus` (`received · under_review · accepted · rejected · ready_to_fulfil · shipped · delivered`), `PurchaseOrderLineItem` (per-line ack, `acknowledgedQty`, `receivedQty`, `ackHistory`) | `src/types.ts` | **The canonical PO lifecycle** — extended with OPTIONAL `mode`/`simulated`/`originProductId` |
| `Shipment`, `ShipmentStage`, `ShipmentStatus` (6-stage freight track) | `src/types.ts` | **Fulfilment vocabulary** — no new shipment states were invented |
| `Deduction`, `DeductionType` (9 chargeback types), `DeductionStatus`, `DisputeOutcome` | `src/types.ts` | **Exceptions / chargebacks / disputes** |
| `createShipmentForPO(poId, asn, staffId?)` (ASN seam, shortfall → auto-deduction) | `src/data/api.ts` | **Fulfilment** |
| `acknowledgePurchaseOrder(poId, lineAcks, staffId?)` | `src/data/api.ts` | **Acknowledgement** |
| `reconcileDelivery(poId, receivedBySku, actorId)` | `src/data/demoStore.ts` | **Receiving** |
| `createDeductionInStore`, `disputeDeduction`, `recordDisputeOutcome` | `src/data/demoStore.ts` | **Exception + dispute** |
| `ticketStore` (helpdesk case model) | `src/lib/helpdesk/ticketStore.ts` | **Cases** (no parallel case system) |
| `demoAuditLog` (platform-wide audit registry) | `src/data/demoStore.ts` | **Audit** (no second audit system) |
| `evaluateBrandCatalogGate` → compliance gate; `evaluateCatalogReadiness`; `ProductSubmission` | E3 | **Eligibility, derived** |
| D4 persistence port (`src/data/domainRepository.ts`) | D4 | **Persistence** |
| `src/lib/simulation/scenarioEngine.ts`, mock SP-API / DHL / Xero seams, `isProviderSimulationSafe` | D3 / earlier | **Provider safety** (unchanged, fail-closed) |

### The genuine E4 gap that was closed

1. **No tenant-pinned `CommerceActor`** and no RBAC/audit **in the domain** for commerce operations.
2. **No eligibility derivation** from the E3 catalog lifecycle.
3. **No explicit simulation provenance** on PO / shipment / deduction.
4. `createPurchaseOrder` **sends a real Postmark email** → unusable in simulation; there was no simulation-safe PO creation path.
5. **No canonical invoice/payment** operational entity (the only invoice in the codebase is the Mercenta→brand commission generator in `src/lib/billing/invoice.ts`; there is no payment concept at all in `src/types.ts`).
6. **No persistence** for commerce entities; no migration after 022.
7. No E4 validator / E4 Playwright coverage.

---

## 3. EXACT FILES CHANGED (16 files: 6 new, 10 modified)

### NEW (6)

| File | Lines | Purpose |
|---|---|---|
| `src/lib/commerce/commerceLifecycle.ts` | 886 | **The E4 domain lifecycle.** `CommerceActor extends AcquisitionActor { tenantId? }`; tenant guard + RBAC in the domain; `evaluateCommerceEligibility` (derived from E3); `createCommercePurchaseOrder`; `acknowledgeCommercePurchaseOrder`; `fulfilCommercePurchaseOrder`; `advanceCommerceShipment`; `receiveCommercePurchaseOrder`; `issueCommerceInvoice`; `recordCommercePayment`; `raiseCommerceException`; `openCommerceDispute`; `resolveCommerceDispute`; `openCommerceCase`; tenant-scoped read models; persistence mirror; audit on every step |
| `src/components/shared/CommerceSimulationPanel.tsx` | 434 | Brand-facing simulation console (the minimum UI making the lifecycle operable) |
| `src/components/admin/CommerceOperationsPanel.tsx` | 180 | Admin read-only operational overview (which brand / PO / shipment / receiving / invoice / payment / exception / simulation status) |
| `scripts/validate-e4-commerce.mjs` | 553 | **E4 validator, 108 assertions** (A–T) |
| `e2e/commerce-operational-simulation.spec.ts` | 224 | **E4 Playwright, 4 tests** |
| `supabase/migrations/023_create_commerce_persistence.sql` | 170 | Additive persistence for the 4 operational tables + RLS + brand-isolation policies. **NOT executed** |

### MODIFIED (additive only — 10)

| File | Diff | Change |
|---|---|---|
| `src/types.ts` | +118 | `CommerceMode`, `CommerceActivityType`, `CommerceActivity`, `CommerceEligibility`, `CommerceInvoice`, `CommercePayment`; OPTIONAL `mode`/`simulated`/`originProductId` on `PurchaseOrder`; OPTIONAL `mode`/`simulated` on `Deduction`. **ONE declaration each.** |
| `src/data/demoStore.ts` | +143 | `demoCommerceActivities` / `demoCommerceInvoices` / `demoCommercePayments` + idempotent record/update/getters + `recordCommerceAudit` (on the EXISTING `demoAuditLog`) + `COMMERCE_SIMULATION_MODE` |
| `src/data/domainRepository.ts` | +116 | 4 new `DOMAIN_TABLES`; `persistCommercePurchaseOrder/Invoice/Payment/Activity`; `HydratedDomainState` + `emptyHydratedState` + both adapters + `hydrate` |
| `src/data/api.ts` | +72 | **`createSimulatedPurchaseOrder`** — the simulation-safe creation path. `createPurchaseOrder`'s real Postmark behaviour is **untouched**. |
| `src/components/brand/BrandPurchaseOrders.tsx` | +7 | Renders `<CommerceSimulationPanel />` **after** the PO list (ordering discipline — see §8) |
| `src/components/admin/RetailPipeline.tsx` | +7 | Renders `<CommerceOperationsPanel />` **after** the existing pipeline sections (same reason) |
| `PROJECT_STATUS.md` · `HANDOFF.md` · `STATUS_CHECK.md` · `MERCENTA_MASTER_CONTEXT.md` · `MERCENTA_ARCHITECTURE.md` | — | Synchronised E4 whole-project checkpoint blocks |

**NOT touched (deliberately):** Brand Intelligence (any file), Rocket.Chat, Postiz,
Rakazo, migrations 001–022, `createPurchaseOrder`'s email path, the design
system / fonts / colours / navigation, any real provider client
(SP-API / DHL / Xero), any deploy script.

---

## 4. DESIGN DECISIONS (and why they are the minimal correct ones)

1. **Eligibility is DERIVED, never re-declared.** `evaluateCommerceEligibility`
   calls the E3 `evaluateCatalogReadiness` (product completeness + the EXISTING
   compliance gate) and reads the latest `ProductSubmission`. A product with no
   submission, an incomplete product, a compliance-blocked tenant, and a product
   whose latest submission was **rejected** are all refused *with reasons*. There
   is no second compliance system and no duplicated prerequisite list — the
   validator asserts the lifecycle contains neither `REQUIRED_SUBMISSION_FIELDS`
   nor `evaluateComplianceGate` (assertion **S3**).
2. **The simulation-safe PO path is a SEPARATE function.**
   `createSimulatedPurchaseOrder` mirrors `createPurchaseOrder`'s shape and audit
   but contains **no email and no provider call** (assertion **S2**), and
   `createPurchaseOrder` itself is provably unchanged (assertion **S1**). This is
   what makes the simulation genuinely side-effect-free.
3. **Provenance lives on the record.** `mode`/`simulated` are written explicitly
   at creation and re-stamped on every transition; the canonical `CommerceActivity`
   carries it for every step. `UNKNOWN` is never upgraded to LIVE; the only mode
   produced in this environment is the positively-identified `simulation`.
4. **One canonical activity trail** means operational status is **not** duplicated
   onto unrelated objects: the PO owns its `PurchaseOrderStatus`, the shipment
   owns its freight `status`, the deduction owns its `DeductionStatus`, and the
   trail records what happened, to whom, and under which mode.
5. **Idempotency by canonical deterministic id.** `po-sim-<tenant>-<productId>`,
   `cinv-<tenant>-<poNumber>`, `cpay-<tenant>-<invoiceId>`,
   `com-<tenant>-<type>-<n>`. Replaying any step returns the existing record
   (assertions **E1**, **E2**, **I5**, **J4**, **Q3**).
6. **Receiving reuses the existing reconciliation seam** rather than adding a
   second receiving model, so a shortfall automatically raises the EXISTING
   `shortage_claim` Deduction (assertion **K2**).
7. **Regulated-category ASN data.** Zambezi is *Health & Personal Care*, whose ASN
   the existing seam requires to carry a lot number and expiry. The lifecycle
   therefore supplies clearly-labelled **simulated** values
   (`SIM-LOT-<poNumber>`, expiry +548 days) instead of bypassing the established
   rule. The rule is respected, not weakened.
8. **No new shipment vocabulary.** The shipment advances along the EXISTING
   `factory_intake → bak_depot → sea_transit → uk_customs_cleared → mercenta_hub →
   live_amazon` track (assertions **G3**, **M10**).
9. **Commission figures come from the canonical PO's own computed fields**
   (`commissionRate`, `commissionAmount`) — no duplicated commission maths, and no
   Xero/Wise/Stripe call (assertion **I6**).
10. **UI ordering discipline (a defect found and fixed during E4).** Both new
    panels render **after** the pre-existing content in their host surfaces. This
    is not cosmetic: rendering the brand panel *above* the PO list introduced an
    “Acknowledge” button and a `type="number"` input that hijacked 7 pre-existing
    browser specs' `.first()` locators (root cause + evidence in §8). Rendering
    last preserves the original DOM/control order exactly, so **no pre-existing
    test was weakened**.

---

## 5. TESTING — EXACT RESULTS

| Gate | Command | Result |
|---|---|---|
| Typecheck | `npx tsc --noEmit -p tsconfig.app.json` | **PASS — 0 errors** |
| Lint | `npm run lint` (eslint, with `react-hooks/rules-of-hooks` + `exhaustive-deps` as **error**) | **PASS — 0 problems** |
| Build | `npm run build` | **PASS** (built in ~3.4 s) |
| **E4 validator** | `node scripts/validate-e4-commerce.mjs` | **108/108 PASS** → `E4_COMMERCE_VALIDATION_PASS`, exit 0 |
| **E4 Playwright** | `npx playwright test e2e/commerce-operational-simulation.spec.ts` | **4/4 PASS** |
| **Full Playwright** | `npx playwright test` | **189 passed / 4 skipped / 0 failed** (E3 baseline 185/0/4 → **+4 tests, 0 regressions**) |
| Validator sweep | all 49 `scripts/validate-*.mjs` | **34 PASS / 15 FAIL — all 15 proven PRE-EXISTING** (see §6) |

### 5.1 E4 validator coverage (108 assertions)

| Section | Coverage |
|---|---|
| A | One canonical declaration per entity; optional provenance on PO; no second store/db; reuse of existing seams |
| B | **Eligibility** derived from E3 — no submission / incomplete / compliance-blocked / rejected / eligible |
| C | Refusing an ineligible product mutates **nothing** (no PO, no activity) |
| D | Simulated PO created; deterministic id; linked to canonical brand **and** product; auditable |
| E | Idempotency; deterministic activity ids; truthful provenance on every activity; no fabricated real outcome |
| F | Acknowledgement — transition, per-line quantities, duplicate refused, auditable |
| G | Fulfilment + shipment on the EXISTING freight track |
| H | Clean receiving (no shortfall, no deduction; `receivedQty` recorded) |
| I | Invoice — linkage, provenance, GBP, deterministic id, idempotent, no Xero |
| J | Payment — settled, `simulated_bank_transfer`, invoice → paid, idempotent |
| K | Receiving shortfall auto-raises an `exception_raised` + `shortage_claim` on the EXISTING ledger |
| L | Manual exception → dispute → resolution; resolving an already-resolved dispute refused |
| M | **10 illegal transitions refused** (invoice before delivery, receive before ship, fulfil before ack, duplicate fulfil/receive/ack, unknown invoice, end-of-track) with **no state mutation** |
| N | **Tenant isolation** for mutations **and** reads; ops actor may read all; foreign attempts write nothing |
| O | **RBAC** — view-only refused on create/ack/exception, may still read, refusals mutate nothing |
| P | Audit on the ONE existing platform log, identifying actor / tenant / entity / action / simulation mode |
| Q | Persistence contract — honest memory adapter; injected durable conformance double (writes received, honest `durable:true`, idempotent upsert, scoped `hydrate`, explicit failure, clean reset) |
| R | Provider safety (`UNKNOWN` never simulation-safe) + **zero external network calls** |
| S | Architecture invariants — real email path untouched; sim path email-free; E3-derived eligibility; migration 023 additive with RLS + isolation; 001–022 untouched; no second DB/ORM |
| T | Still zero external fetches after every assertion |

### 5.2 E4 Playwright coverage (4 tests, real Chromium)

1. **Complete normal lifecycle from the actual UI** — brand → Purchase Orders →
   console → eligibility → Raise simulated PO → Acknowledge → Fulfil → Receive →
   Issue invoice → Record payment. Asserts `pageErrors === []` and
   `externalCalls === []`.
2. **Exception path** — lifecycle driven to DELIVERED, then Raise exception →
   Open dispute → Resolve; the exception is visible on the existing ledger.
3. **Tenant isolation** — another (non-cleared) tenant sees no PO number and no
   activity trail, and cannot enter the simulation.
4. **Admin visibility + DOMAIN-level refusal** — the admin Retail Pipeline shows
   the operational commerce state; the real domain API (invoked inside the page's
   module graph) refuses a **foreign** tenant actor (`CROSS_TENANT`), refuses a
   **view-only** actor (`FORBIDDEN`), refuses a foreign **read**, and leaves the PO
   status unchanged.

### 5.3 Provider-safety evidence

`isProviderSimulationSafe('unknown' | undefined | 'not_registered') === false`;
`=== 'simulation'` only for `'simulation'`. The commerce lifecycle contains **no**
`fetch(`, no `XMLHttpRequest`, and imports no live provider client. The whole E4
validator ran with `globalThis.fetch` stubbed and recorded **0** attempts; the
browser suite asserts `externalCalls === []` in all four tests.

---

## 6. PRE-EXISTING vs NEW FAILURES (exact evidence)

### 6.1 Browser suite

**0 new failures.** E3 baseline: `185 passed / 4 skipped / 0 failed`. After E4:
`189 passed / 4 skipped / 0 failed` (+4 = the new E4 spec). No pre-existing spec
was skipped, deleted, `fixme`d or weakened.

*During* the build, an intermediate state produced 7 failures
(`po-lifecycle` ×5, `shipment-asn` ×1, `notifications` ×1). They were **caused by
E4** and were fixed at the root cause, not suppressed — see §8.

### 6.2 Validator sweep — 34 PASS / 15 FAIL

The 15 failures are **all pre-existing**. Proof method (the same one E3 used):
a clean `git worktree` at the **pre-E4 commit `657b6b2`** with the project's
`node_modules` symlinked, running the 15 failing validators:

```
FAIL validate-edge-functions   FAIL validate-homepage-editor  FAIL validate-review-s1
FAIL validate-review-s3        FAIL validate-review-s4        FAIL validate-review-s5
FAIL validate-review-s6        FAIL validate-stage15          FAIL validate-stage16
FAIL validate-stage19          FAIL validate-stage24          FAIL validate-stage26
FAIL validate-stage6           FAIL validate-stage7           FAIL validate-stage8
```

**All 15 fail identically before E4** → pre-existing, 0 E4 regressions.

Their shared root cause is pre-existing and unrelated to E4: they `readFileSync`
files that **do not exist in the repository at all**, e.g.
`supabase/migrations/0013_deductions.sql`,
`supabase/migrations/0014_vc_ack_asn_fields.sql`,
`supabase/functions/payouts-transfer/index.ts` (only migrations `001`–`023`
exist), and one throws inside `src/components/marketing/Home.tsx`.

> **Documentation discrepancy (reported honestly).** The E3 report recorded
> *“13 legacy failures”*. The measured figure at E3's own HEAD (`657b6b2` is E3's
> HEAD plus only the preserved generated artefacts) is **15**. The likely
> explanation is that E3 counted only the `validate-stage*` (8) + `validate-review-s*`
> (5) families = 13 and excluded `validate-edge-functions` and
> `validate-homepage-editor`. **This is not a regression**: all 15 fail
> identically at the pre-E4 commit. E4 introduces **zero** new validator failures.

### 6.3 Byte-identical output proof (E3's standard)

Both trees were swept, and every validator's output was compared after
normalising only the volatile `node:PID` in a Node experimental warning and the
absolute working-directory path:

```
of 49 validators → remaining differences = 2
  validate-e4-commerce  (NEW file — expected)
  validate-stage9       (both print STAGE9_VALIDATION_PASS; the PRE run carried one
                         extra post-PASS esbuild cleanup line "✘ [ERROR] The build
                         was canceled" — an environment flake after the verdict line)
```

**All 48 legacy validators are otherwise byte-identical pre-E4 vs post-E4.**

---

## 7. PERSISTENCE STATUS (honest)

| Aspect | Status |
|---|---|
| Browser Supabase credentials | **NOT configured** → `isSupabaseConfigured === false` |
| Active adapter | **memory** (`MemoryDomainRepository`) |
| `durable` | **`false`** — reported honestly everywhere (including in both UI panels) |
| Migration `023_create_commerce_persistence.sql` | **Created, NOT executed** |
| Migrations `020` / `021` / `022` | Still **NOT executed** (unchanged from E3) |
| Live persistence claimed? | **NO** |
| Durable path proven how? | An **injected conformance repository** implementing the extended `DomainRepository` contract, proving: writes received, `durable:true` reported, idempotent upsert by canonical id (no duplicate rows), tenant-scoped `hydrate` (a brand scope sees only its own rows), explicit failure (never a silent success), and a clean reset back to the factory-selected repo (assertions **Q0–Q6**) |

Migration 023 adds `commerce_purchase_orders`, `commerce_invoices`,
`commerce_payments`, `commerce_activities` — each `id text PRIMARY KEY`,
`tenant_id`, `brand_id`, `payload jsonb`, `simulated boolean NOT NULL DEFAULT true`,
RLS enabled, with `admin_*` + `brand_own_*` policies and **no blanket
`using(true)`**. It alters/drops **nothing** from migrations 001–022 (assertions
**S5–S8**).

**Why new tables rather than the legacy `purchase_orders` table:** that table's
primary key is a `uuid`, while the canonical operational ids are deterministic
TEXT ids (`po-sim-<tenant>-<productId>`). Migration 022 already documented and
handled exactly this incompatibility for catalog submissions; 023 follows that
established pattern. Still **one database, one persistence port.**

---

## 8. DEFECTS FOUND AND FIXED DURING E4 (root cause, evidence, fix)

### 8.1 Controlled-category ASN data was required but not supplied (real defect, fixed)

**Symptom (would have been):** the first fulfilment attempt for Zambezi
(`Health & Personal Care`) was rejected by the EXISTING seam:
*“Lot number and expiry date are required on the ASN for perishable/regulated
categories”* — `src/data/api.ts` → `LOT_REQUIRED_CATEGORIES`.

**Root cause:** `fulfilCommercePurchaseOrder` built an ASN without the
regulated-category fields the established rule requires.

**Fix (smallest correct):** supply clearly-labelled **simulated** lot/expiry
values (`SIM-LOT-<poNumber>`, expiry = +548 days) so the existing rule is
satisfied rather than bypassed. No rule was weakened.

### 8.2 A duplicate dispute resolution was not refused (real defect, fixed)

**Symptom:** `resolveCommerceDispute` could be applied twice, flipping the outcome
of an already-resolved dispute.

**Root cause:** the guard only checked `!existing.dispute`; after resolution the
`dispute` object legitimately remains (carrying its outcome), so the terminal
state was not detected.

**Fix:** refuse when `existing.status === 'resolved'` (assertion **L5**).

### 8.3 E4 UI shifted pre-existing control order → 7 pre-existing specs broke (real defect, fixed)

**Symptom:** after adding the brand console **above** the PO list, 7 pre-existing
specs failed: `po-lifecycle` (tests 1–5), `shipment-asn` (test 2),
`notifications` (test 2).

**Root cause (read from the actual failures, not guessed):**
`po-lifecycle.spec.ts` opens its per-line ack panel with
`page.locator('button', { hasText: 'Acknowledge' }).first()`. The E4 console
introduced its own **“Acknowledge”** button, which now appeared *first* in the DOM
and was disabled (no PO yet) → `locator.click: Test timeout of 30000ms exceeded`.
Likewise `shipment-asn.spec.ts` fills
`page.locator('input[type="number"]').first()` — which became the E4 **Units**
field instead of the carton quantity, so the intended shortfall was never produced
(`getByText(/Shortfall logged as deduction/)` not found).

**Fix (smallest correct, no test weakened):** render `<CommerceSimulationPanel />`
**after** the PO list, and `<CommerceOperationsPanel />` **after** the existing
pipeline sections, so every pre-existing `.first()` locator resolves to the same
control as before E4. The admin panel was moved too because it renders deduction
status badges; above the deductions table it could have made `disputes.spec.ts`'s
`text=disputed` assertion pass for the wrong reason.

**Evidence of the fix:** full suite re-run → **189 passed / 4 skipped / 0 failed**;
the four E4 tests still pass.

---

## 9. KNOWN LIMITATIONS (honest)

1. **Simulation only.** There is no live Amazon/DHL/Xero/payment integration in E4
   and none was attempted. Every operational record is `mode: 'simulation'`.
2. **Memory persistence.** Browser Supabase credentials are absent, so the memory
   adapter is active and `durable` is `false`. Migration 023 is **not executed**.
   No live persistence is claimed.
3. **No real fulfilment/warehouse data.** The ASN lot/expiry values are simulated;
   no warehouse confirmation is invented.
4. **Invoice semantics.** The simulated invoice is a **goods + commission**
   document derived from the canonical PO; it does not replace the separate
   Mercenta→brand commission generator (`src/lib/billing/invoice.ts`), which is
   unchanged. No Xero/Wise/Stripe call occurs.
5. **One simulated PO per (tenant, product).** Idempotency is keyed by
   (tenant, product); a brand cannot raise a second simulated PO for the same
   product. This is the deliberate idempotency rule, not an accident.
6. **Pricing.** The simulated PO unit price comes from the canonical product's
   `exWorksPrice`; there is no live price feed.
7. **UI is deliberately minimal.** Two panels using existing primitives only. No
   redesign, no new visual language, no new navigation, no decorative dashboards.
8. **No manual human click-through** beyond the automated real-Chromium run.
9. **No deployment** was performed (and none is authorised outside the
   `deploy-demo.sh` + `GO_LIVE.md` playbook).
10. **Case opening** reuses the existing helpdesk ticket model; because
    `findOrCreateTicketForBrand` returns an existing open ticket for the tenant, a
    brand may already have a ticket — intentional (one canonical case model, never
    a parallel one).

### Source files intentionally left untouched

`src/lib/intelligence/**` (Brand Intelligence — COMPLETE, out of scope),
`src/lib/postiz/**`, all Rakazo assets, `src/lib/spapi/client.ts` and
`src/lib/dhl/client.ts` (real provider clients), `src/services/xero/**`,
`src/lib/billing/invoice.ts`, all files under `src/lib/catalog/**` (E3),
`supabase/migrations/001`–`022`, the design system (`tailwind.config.js`,
`src/components/design/**`), and all deploy scripts.

---

## 10. COMPLETE PROGRAMME STATE (not merely E4)

### Completed phases

| Phase | Scope | Status |
|---|---|---|
| **A** | Foundation / provider safety | ✅ COMPLETE |
| **B** | Brand Intelligence real-data lifecycle | ✅ COMPLETE |
| **C** | BI → ICP → outreach → approval → send → response → Opportunity → CRM | ✅ COMPLETE |
| **D1** | Rocket.Chat removal | ✅ COMPLETE |
| **D2** | BI preservation | ✅ COMPLETE |
| **D3** | Outreach / provider hardening | ✅ COMPLETE |
| **D4** | Domain persistence + platform hardening | ✅ COMPLETE |
| **E1** | Opportunity → canonical BrandOnboarding hand-off | ✅ COMPLETE |
| **E2** | Stateful brand onboarding workflow | ✅ COMPLETE |
| **E3** | Catalog / product management | ✅ COMPLETE |
| **E4** | **Commerce / Amazon-style operational simulation** | ✅ **COMPLETE (this phase)** |

### Still remaining in the platform roadmap

| Order | Item |
|---|---|
| next | **E5 — Admin Operational Surfaces** |
| then | E6 — Brand Operational Surfaces |
| then | E7 — Embedded Postiz |
| then | Final UI/UX redesign |
| then | Final full-platform integration / regression |
| then | Production deployment preparation |
| LAST | **Rakazo** |

### Standing statements for the next session

- **Brand Intelligence is COMPLETE and is NOT to be revisited.** It is not the
  current project. Do not audit, redesign, re-score, re-seed or re-report it. E4
  consumed E3 catalog readiness only and did not touch BI at all.
- **No E5 work has started.** E4 stopped at the phase boundary exactly as
  instructed; E5 requires a separate, explicit instruction.
- The target remains **a real end-to-end simulated platform**, not a collection of
  audited screens.

---

## 11. NEXT PHASE

```
NEXT: E5 — Admin Operational Surfaces
```

E5 was **not** started. E4 stopped exactly at the phase boundary.

---

## 12. E4 CHECKPOINT VERIFICATION (commands + observed results)

```bash
cd /Users/tadii/Desktop/Mercenta

# git state
git rev-parse HEAD                        # → 657b6b2 (pre-E4) then the E4 commits
git merge-base --is-ancestor 959b4d2 HEAD # → exit 0  (baseline IS an ancestor)
git tag -l 'mercenta-baseline*'           # → mercenta-baseline-before-redesign-20260907

# gates
npx tsc --noEmit -p tsconfig.app.json     # → 0 errors
npm run lint                              # → 0 problems
npm run build                             # → ✓ built

# E4 gates
node scripts/validate-e4-commerce.mjs     # → E4_COMMERCE_VALIDATION_PASS (108/108), exit 0
npx playwright test e2e/commerce-operational-simulation.spec.ts   # → 4 passed
npx playwright test                       # → 189 passed / 4 skipped / 0 failed

# validator sweep + pre-existing failure proof
for f in scripts/validate-*.mjs; do node "$f" >/dev/null 2>&1 && echo "PASS $f" || echo "FAIL $f"; done
# → 34 PASS / 15 FAIL (all 15 identical in a worktree at the pre-E4 commit 657b6b2)

# canonical review zip (the ONLY authorised zip path/script)
bash ~/Desktop/Mercenta/scripts/export-review-zip.sh
# → Review Zip/mercenta-review.zip
```

**SIMULATION / LIVE STATUS:** SIMULATION ONLY. No live provider credentials are
configured or required. `UNKNOWN` is never treated as simulation-safe. Zero
external network calls across the E4 validator and all four browser tests.

**PERSISTENCE STATUS:** memory adapter active (`durable: false`, honestly
reported). Migration 023 created but **NOT executed**. No live persistence
claimed.
