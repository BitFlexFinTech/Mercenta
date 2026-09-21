# SPRINT — PHASE 2 COMPLETE: COMMERCIAL READINESS + PRODUCT ECONOMICS

**Date:** 2026-09-20
**Branch:** `redesign/foundation`
**HEAD:** `19be002c4b3d6a64020b4740879c56ef1550e628` (`19be002`) — **no commit created** (no explicit
authorisation was given; `.clinerules/protection-rules.md` forbids committing without it)
**Protected baseline:** `959b4d2` (confirmed an ancestor)
**Git mutation:** NONE (no stage / stash / reset / clean / checkout / amend / branch-switch / force-push).
The intentionally dirty working tree was preserved and extended.
**Deploy:** none. **Credentials:** none added, read or activated. **Live provider calls:** 0 (asserted twice —
the validator's fetch trap and the e2e external-call watcher).

---

## 1. WHAT THIS SPRINT WAS FOR

The previous stage built the routing/gateway architecture and the Phase 2 **commercial-ready seam**, then
deliberately deferred the Phase 2 **delivery** for review. This sprint completes that delivery:
**commercial readiness + product economics as a real user journey**, using the canonical records, the existing
work layer, the existing automation registry and the existing UI system.

The governing question was: *can a real brand be told exactly what commercial information Mercenta needs,
understand why it is needed, supply it, and see the product move — while the Founder/Admin can see, explain and
act on the same record?* The answer is now **yes**, and it is proven in a browser.

---

## 2. BUILT

### 2.1 The canonical readiness record store
`src/data/commercialReadinessStore.ts`

- ONE store, mirroring the established domain-store contract (`preAuditStore`, `routingStore`, `acquisitionStore`).
- Persistence through the SAME domain port and a new additive table `commercial_readiness_records`
  (`src/data/domainRepository.ts` → `persistCommercialReadinessRecord`; memory + Supabase adapters; `hydrate`).
- Audit → the canonical `demoAuditLog`; events → the EXISTING canonical event feed (3 additive event types).
- **Structural idempotence:** the record id is `commercial-readiness-<assessmentId>`; the routing-decision id is a
  deterministic function of the gateway inputs. A repeat is SUPPRESSED and reported (`duplicateSuppressed`);
  a genuine reassessment REVISES the same row (`revision: true`, `previousRoute` retained on the event).
- Visibility reuses the ONE rule: `ownerMatchesReadinessScope === ownerMatchesRoutingScope` (asserted, so the two
  cannot drift apart). A brand scope sees only its own records; ops sees everything.
- Honest persistence status: with Supabase unconfigured the backend is `memory`, `durable: false`, and `hydrate`
  returns nothing durable — never a fabricated success.

---

## 2 (cont.)

### 2.2 The assessment workflow (one path for every caller)
`src/lib/commercial/commercialAssessment.ts`, `src/lib/commercial/commercialReadinessRecorder.ts`

- `runCommercialAssessment(input)` = the declared gate → the canonical routing decision. Dependency-free of any
  store, so the demo seed and every live caller use the SAME two steps.
- `assessCommercialReadiness` → also writes the readiness record.
- `reassessCommercialReadiness(recordId)` rebuilds the gate input **from the record itself** (its retained
  `assessmentInput` basis + terms + pack), so a reassessment is reproducible rather than invented. The declared
  pack arithmetic is applied to the record's own terms (`master_carton ÷ case_pack = casesPerCarton`, only when
  exact), which is what lets a brand's submitted pack terms actually take effect.
- `submitCommercialTermsAndReassess` = the brand action + the reassessment, and reports `unchanged` when nothing
  moved.

### 2.3 The declared commercial vocabulary, extended for delivery
`src/config/commercialReadiness.ts`

- `COMMERCIAL_WORK_BY_ROUTE` — the declared work source, SLA (days), priority and owner per route; `ready` raises
  NO work; `remediation` is the brand's action (14 days, high); `blocked` (critical) and `human_review` are
  Mercenta decisions (7 days).
- `COMMERCIAL_BRAND_TERM_GUIDANCE` / `COMMERCIAL_BRAND_CONDITION_GUIDANCE` / `COMMERCIAL_BRAND_ROUTE_GUIDANCE` —
  brand-facing `what` / `why` / `action` for EVERY declared term and condition, each naming a REAL Knowledge Base
  article and a real Phase 4 `academyStage`.
- `COMMERCIAL_BRAND_OUTCOME_DISCLAIMER` — the §16 wording rule ("not a promise … does not guarantee an order").
- Surface test ids + the declared destinations (`control_centre` / `commercial_readiness`).
- The SIX thresholds still ship UNSET (`configured: false`), and an unset threshold still routes to
  `human_review` — no commercial rule was invented to make anything pass.

### 2.4 The founder surface (extends the EXISTING Control Centre)
`src/lib/commandCentre/controlCentre.ts`, `src/components/admin/FounderControlCentre.tsx`

- A new **Commercial** section of the Super-Admin Control Centre (not a second dashboard): six real metrics
  (assessed / ready / information needed / blocked / human review / guidance topics).
- A queue of EVERY canonical readiness record with brand, owner, SLA deadline, missing-input count and the
  declared next step.
- A "Commercial work raised" queue over the SAME work layer.
- A record drawer that shows **why**: the unmet conditions (with the observed value) and the unevaluable
  conditions (with the fail-closed reason), the missing information, the owner, the deadline, the canonical work
  item id, the routing-decision id, the MOQ disclaimer and the honest outcome note.
- Blocked / under-review products are raised as founder attention items.
- Re-derives on `useCommercialReadinessVersion()`, so a brand action anywhere updates the founder view.

### 2.5 The brand surface
`src/components/brand/CommercialReadiness.tsx`, `src/lib/commercial/brandGuidance.ts`,
`src/lib/commercial/useCommercialReadiness.ts`

- Tenant-scoped by construction (`{ kind: 'brand', tenantId }`).
- Per product: the customer-facing headline and explanation, progress (satisfied/total), what Mercenta needs and
  why, the exact action, a real Knowledge Base guide link, and the fields to supply or CONFIRM (a value recorded
  on an assumption is flagged as needing confirmation).
- The brand supplies a value with its basis (`actual` / `observed` / `estimated`), validated by the store
  (undeclared fields, empty values and `assumed`/`unknown` bases are refused) and reassessed through the ONE gate.
- Wired into the brand shell's Catalogue group with a breadcrumb and a route.
- Never exposes internal scores, founder intelligence, risk notes or another tenant.

### 2.6 Work + automation integration (both EXISTING systems)

- `src/lib/work/workStore.ts` §10 derives work from the readiness records; `WorkSource` gains
  `commercial_remediation` / `commercial_review`; `WorkEntityRef` gains `commercial_readiness`.
  Because the items are DERIVED, a repeat assessment cannot duplicate them and the item disappears from the
  attention set the moment the record moves on.
- `src/lib/automation/registry.ts` gains `commercial_readiness_monitor`: a **drift check** (re-computes the gate
  and compares decision ids) that reports the route mix, escalates the critical items through the existing path,
  changes no route, requires no AI and is idempotent (a second identical run is `duplicate_suppressed`).

### 2.7 The demo cases (real records, not an isolated demo)
`src/data/commercialReadinessSeed.ts`, `src/lib/preaudit/researchProvider.ts`

- Four cases, one per declared route, built from the canonical brands (`DEMO_MODEL_A_BRAND_ID`,
  `DEMO_MODEL_B_BRAND_ID`), the canonical products (`DEMO_PRODUCTS`) and a REAL Phase 1 assessment created through
  the real pre-audit store + the real deterministic research seam, so each readiness record references an
  assessment and supply profile that genuinely exist.
- `MockPreAuditResearchProvider` gained a synchronous `researchSync` primitive that the async `fetchBrandResearch`
  now delegates to — additive, ONE implementation, zero network.
- Asserted: the four cases produce exactly ready / remediation / blocked / human_review.

---

## 3. TESTED (evidence, produced this session)

| Check | Result |
|---|---|
| `npx tsc --noEmit -p tsconfig.app.json` | **0 errors** |
| `npm run build` | compiles — `✓ built in 3.33s` |
| `node scripts/validate-commercial-readiness.mjs` | **78 assertions, 0 failures** |
| `npx playwright test e2e/commercial-readiness.spec.ts` | **6 passed** |
| `node scripts/reconcile-phase2-commercial-readiness-registry.cjs` | idempotent — `entries 349 → 349 (added 0, replaced 10, historical rows deleted 0)`; immediate re-run identical |
| `node scripts/verify-registry.mjs` | 174 pre-existing findings elsewhere; a targeted grep for the ten Phase 2 rows returns **nothing** |

### 3.1 What the validator actually proves (78 assertions)

- **A (declarations):** the two work sources and their SLAs; ready raises no work; every declared term AND
  condition has brand guidance naming a REAL KB article; every route has brand guidance; NO threshold is invented;
  the outcome never promises an order; the lifecycle events are in the EXISTING union.
- **B (the seed):** 4 records, one per route; each case produces the route it declares; every record references a
  REAL assessment + supply profile + canonical product; the MOQ disclaimer and an evaluation trace are carried.
- **C (happy path):** ready has no unmet and no unevaluable condition, zero missing inputs and the declared next
  step; re-running unchanged is SUPPRESSED.
- **D/E (missing info → brand action → progress → ready):** the missing required field is NAMED; the submission is
  accepted and REASSESSED; the route transition is recorded (remediation → human review → **ready**); the same
  record is reused; the missing list shrinks; events are emitted.
- **F (blocked):** blocked by the OBSERVED economics; supplying unrelated information does NOT make it ready.
- **G (human review):** an unevaluable condition exists; an unchanged reassessment does not drift to ready.
- **H (duplicate):** an identical submission is refused as `Nothing changed` with no second record, event or audit.
- **I (failure):** an undeclared field, an assumed basis and an empty value are all refused AND no reassessment
  runs; an unknown record id fails explicitly.
- **J (retry):** no new decision, record or work item.
- **K (tenant isolation + RBAC):** brand A sees 2, brand B sees 2, ops sees 4; no cross-tenant leak; the
  visibility function IS the routing store's; a public session sees nothing; brand work is tenant-scoped.
- **L (persistence):** honest `memory` / not durable / writes mirrored to the canonical table; hydrate fabricates
  nothing.
- **M (downstream):** the ready record carries the declared next stage and keeps its Phase 1 + supply references.
- **N (audit):** assessment, reassessment and submission are all audited with an actor and the route transition.
- **O (work):** real derived work for remediation (brand-owned) and blocked/review (Mercenta-owned); a ready
  product raises none; items are derived, deterministic and removable.
- **P (automation):** registered in the existing registry; runs deterministically; changes no route; a second run
  is duplicate-suppressed.
- **Q (zero network):** `networkCalls === 0`.
- **R (surfaces):** the Control Centre carries the Commercial section; the founder queue shows EVERY canonical
  record (dataset completeness); every founder row explains why and carries owner/deadline/work item; the ready
  product raises no work; blocked/review raise attention items; the brand view derives what-to-do and why from the
  record alone; no internal score leaks; progress is real arithmetic.

### 3.2 The six browser journeys (`e2e/commercial-readiness.spec.ts`, all passing)

1. The founder Commercial section shows **every** canonical product (4 rows — the real canonical count), each
   route represented once, with the metric band as real arithmetic.
2. Opening a product explains WHY: the condition trace, the named missing term (`currency`), the canonical work
   item, the MOQ disclaimer.
3. RBAC: a brand session has no Control Centre nav and no commercial readiness rows.
4. The brand sees ONLY its own 2 products, never the other demo brand's, explained in plain language with a real
   guide and the honest disclaimer.
5. A REAL brand action moves the status (remediation → human review), repeating the SAME value is refused as
   `Nothing changed`, and completing the carton arithmetic takes the product to **ready**.
6. A product with no outstanding action says so, and its next step is the declared next readiness stage.

Screenshots: `test-screenshots/commercial-readiness/`.

### 3.3 Full Playwright regression

Run in this session over the whole `e2e/` directory (373 tests collected). The FIRST full run produced
**370 passed / 1 failed / 2 skipped**, and the single failure was a genuine regression THIS stage introduced:

- `e2e/founder-operating-system.spec.ts` → "the automation catalogue is real…" asserted **8** declared automations
  (`Expected: 8, Received: 9`) because `commercial_readiness_monitor` was registered in the SAME registry.

**Fixed by reptoining the assertion, not by weakening or removing it**: the spec now declares the CURRENT
canonical counts once (`TEN_OPERATING_VIEWS = 10`, `DECLARED_AUTOMATIONS = 9`), records the old contracts in an
inline `§Phase 2 … REPOINTED` comment, and additionally asserts the canonical ten-view list now includes
`Commercial`. Nothing was deleted from the registry to make the old number pass.

The FINAL full-run result after the repoint is:

```
Running 373 tests using 8 workers
...
  2 skipped
  371 passed (4.5m)
```

**371 passed · 0 failed · 2 skipped** (373 collected). The 2 skips are PRE-EXISTING conditional `test.fixme`
guards elsewhere in the suite (e.g. `e2e/access-gate.spec.ts`); **no skip or fixme was added or modified this
session**, and no failing test was converted into a skip. **The old 365/0/2 figure is NOT claimed as current
evidence.**

---

## 4. PRESERVED (nothing rebuilt)

- The routing/gateway architecture and its 101-assertion validator — **unchanged**; the commercial gate continues
  to use it.
- The pre-audit store, the Phase 1 engine, the research seam's mock-first contract, the work layer, the reminder
  runner, the automation registry, the audit registry, the event feed, the domain persistence port, the Control
  Centre model, the shared workspace components, the brand shell and the Wave-2 visual system.
- The commercial calculator, gate, vocabulary and economics from the previous stage: **extended and surfaced, not
  rewritten**. The record type gained fields (product ref/label, missing term ids, retained assessment basis) —
  additive and necessary for the journey.
- No styling, layout, font or colour change. No demo data or demo account was removed or altered; the seed only
  ADDS four canonical cases.

---

## 5. DEFECTS FOUND AND FIXED

| # | Defect | Root cause | Fix | Regression cover |
|---|---|---|---|---|
| 1 | A reassessment could produce a route the founder surface could not explain | the record carried only prose `missingInputs` | added `missingTermFieldIds` to the record and to the surfaced rows | validator B7 / D1 / D5; e2e 2 |
| 2 | A brand supplying `case_pack` / `master_carton` had NO effect on the gate | the reassessment rebuilt the pack from `record.pack` only, ignoring the declared terms | the declared pack arithmetic is applied to the record's own terms (`master_carton ÷ case_pack`, exact division only) | validator E1; e2e 5 |
| 3 | Submitting the SAME value twice produced a second event and audit entry | the store accepted identical values | identical (value + basis) submissions are IGNORED and reported as `Nothing changed`; no write, event, audit or reassessment | validator H1–H3; e2e 5 |
| 4 | The demo seed bypassed the routing store, so a seeded record had no auditable routing decision | the seed called the gate + store directly | the seed uses the SAME `runCommercialAssessment` step the recorder uses | validator C4 / N3 |
| 5 | `MockPreAuditResearchProvider` was async-only, so the deterministic in-process seed could not use it | async-only API | added the synchronous `researchSync` primitive the async method delegates to (ONE implementation) | validator B4 |
| 6 | The brand e2e journeys were blocked by the product tour's skip-confirmation modal | the tour is a real feature; the spec dismissed the card but not the confirmation | the spec confirms the skip the way a user does | e2e 4–6 |
| 7 | **Regression this stage introduced:** `e2e/founder-operating-system.spec.ts` asserted 8 automations, but the registry now declares 9 | the spec hard-coded a count that legitimately changed | repointed to the declared canonical counts + recorded the old contract in a `REPOINTED` comment; also asserts the ten-view list includes `Commercial` | that spec (11/11 with the new spec) |

No critical or high business blocker was waived.

---

## 6. MASTER MATRIX — BEFORE / AFTER

- **Before:** 349 entries; the Phase 2 delivery rows were `not_started` (store, surface, work integration,
  automation, e2e) and the seam rows `built` / `in_progress`.
- **After:** 349 entries (**no row added or deleted**); **10 rows replaced** in place with `built_and_tested`,
  each naming the browser spec and the validator: `phase2-commercial-readiness-config`,
  `phase2-commercial-calculator`, `phase2-commercial-viability-gate`, `phase2-commercial-terms-model`,
  `phase2-product-economics`, `phase2-commercial-readiness-store`, `phase2-commercial-readiness-surface`,
  `phase2-commercial-work-integration`, `phase2-commercial-automation`, `phase2-routing-gateways-e2e`.
- By status after: `built_and_tested 190 · built 113 · not_started 38 · in_progress 3 · regressed 2 · deferred 1 ·
  blocked 2`.
- The reconciler REFUSES to write duplicate ids, unknown statuses, or a `built_and_tested` row whose e2e spec does
  not exist on disk. Historical rows deleted: **0**. Re-running it is byte-identical (idempotent).

---

## 7. FIVE-SOURCE RECONCILIATION

| Source | State |
|---|---|
| `requirements-registry.json` (Master Matrix) | 349 entries; 10 Phase 2 rows now `built_and_tested` with this session's evidence |
| `PROJECT_STATUS.md` | new **CURRENT PLATFORM POSITION** block (headings 1–9) at the top; the 2026-09-19 block retained and demoted to *previous checkpoint* |
| `HANDOFF.md` | updated with the Phase 2 completion, the current API-key/credential status and the next prompt |
| `docs/SPRINT_PHASE2_COMMERCIAL_READINESS_2026-09-20.md` | this document |
| Session report | the same state, with the verbatim command output |

All five agree on: what is complete · what is incomplete · what is deferred · what is blocked · what is next · the
current checkpoint · verification status · known exceptions.

---

## 8. NOT DONE (explicit — no silent deferral)

- No commit, no push, no deploy (none authorised).
- **No Supabase migration was applied.** The additive table is written through the port; creating the migration is
  a separate, deliberate step. The demo is identical on the memory adapter and the status is reported honestly as
  `memory-only`.
- No external provider was activated. Every one remains deterministic simulation; the run made **zero** provider
  calls (asserted twice).
- The 15 remaining roadmap phases (Phase 3 onwards) are untouched.
- `uiux-wave2-core-surfaces-remaining` migrations remain outstanding (unchanged).
- Miro was not touched; it remains a downstream representation of the one canonical state.
- The 174 pre-existing `verify-registry.mjs` findings were **not** fixed (out of scope) — but none of them is in
  the ten Phase 2 rows, which is reported with evidence (a targeted grep returns nothing).
- Financial/capital functionality was NOT built (Phase 6/7 territory). The commercial record was simply kept
  compatible: it retains the terms, the pack profile, the economics basis and the supply references a future
  financing assessment will need, without exposing any financing-provider detail to brands.

---

## 9. NEXT

**Phase 3 — Supply Route / Logistics Intelligence**, consuming the READY commercial record (validated pack
profile, supply basis, declared next stage) as its input. Review this Phase 2 delivery first.