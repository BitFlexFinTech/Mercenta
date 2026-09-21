# MERCENTA — PHASE 1: EXPLORE UK MARKET FIT / PRE-AUDIT ENGINE + FULL ROADMAP RECONCILIATION (2026-09-19)

> Branch `redesign/foundation` · starting HEAD `19be002` (`19be002c4b3d6a64020b4740879c56ef1550e628`) ·
> ending HEAD **the same** (no commit was created; `.clinerules/protection-rules.md` requires an explicit
> instruction, and the prompt forbade one) · protected baseline `959b4d2` an ancestor.
> This document is the canonical historical record of the sprint and is the fourth source of the
> project-state contract (`.clinerules/project-state-contract.md`).

## 1. Executive summary

Two things were delivered, in this order:

| # | Deliverable | What it means | Status |
|---|---|---|---|
| **A** | **FULL ROADMAP RECONCILIATION** | The COMPLETE Mercenta roadmap (Phases 2–15) is now recorded in the Master Matrix at workstream level, with honest states. The Founder OS sprint completing its CURRENT SCOPE was explicitly NOT treated as "nothing remains". | DONE |
| **B** | **PHASE 1 — EXPLORE UK MARKET FIT / PRE-AUDIT ENGINE** | A public, progressive commercial assessment that decides whether there appears to be a credible UK opportunity — and feeds the EXISTING canonical acquisition pipeline. | DONE + VERIFIED |

**The single most important design decision:** the assessment produces **three separate indicators** —
CATALOGUE ELIGIBILITY, COMMERCIAL OPPORTUNITY and SUPPLY / REPLENISHMENT VIABILITY — and **no single
"success score"**. Collapsing them is how an assessment starts lying, so the separation is declared as a
constant (`NO_SINGLE_SUCCESS_SCORE`), forbidden by the snapshot type, and asserted by the validator.

**The second:** nothing was rebuilt. The pre-audit writes into the canonical BI prospect store, the canonical
acquisition lifecycle, the canonical event feed, the canonical audit registry and the canonical domain
persistence port. There is no second pipeline, no second prospect universe, no second event system and no
second store.

## 2. Starting checkpoint

- Repo `/Users/tadii/Desktop/1. Mercenta` (confirmed — NOT `/Users/tadii/Desktop/Mercenta`).
- Branch `redesign/foundation`, HEAD `19be002c4b3d6a64020b4740879c56ef1550e628`, protected baseline `959b4d2`
  an ancestor.
- Working tree intentionally dirty: the pre-existing doc/registry/generated-artefact edits from the Founder OS
  sprint (which was never committed), the four untracked protected `design/*.png`, and the 0-byte
  `ave1-check.mjs`.

## 3. What was built

### 3.1 The canonical pre-audit layer (new)

| File | What it is |
|---|---|
| `src/config/ukMarketFit.ts` (578) | The SINGLE SOURCE OF TRUTH: the CTA (`Explore UK Market Fit`), its route, the six UK presence classes A–F, the seven dimensions, the three indicators, the declared thresholds, the eight snapshot sections, the hedged vocabulary, the prohibited-promise list, the declared research sources, the educational-gap catalogue, the six event types and the test ids. |
| `src/types.ts` (Phase 1 section) | The canonical entities in the ONE types file: `PreAuditOwner`, `PreAuditEvidence`, `PreAuditRule`, `PreAuditIndicator`, `UkMarketFitDimensionResult`, `UkOpportunitySnapshot`, `PreAuditInput`, `ProductOpportunity`, `SupplyProfile`, `BrandOpportunity`, `PreAuditAssessment`, `PreAuditAcquisitionFeed`. |
| `src/lib/preaudit/fixtures.ts` | Six unmistakably-labelled deterministic simulation fixtures covering every presence class A–F, selected by a declared hash (no `Math.random`, no clock, no network). |
| `src/lib/preaudit/researchProvider.ts` | The mock-first / fail-closed research seam. Resolves its availability from the CANONICAL integration registry; the real provider REFUSES rather than fabricating; `networkCalls: 0` is declared and asserted. |
| `src/lib/preaudit/ukMarketFitEngine.ts` (1,300) | The deterministic engine: the presence ladder, the three indicators, the seven dimension findings, the eight-section snapshot, qualification, open questions, educational gaps, the one recommended next step, and the canonical record builders. |
| `src/data/preAuditStore.ts` | The canonical store: explicit per-record ownership, deterministic ids, canonical audit entries, canonical events, and persistence through the SAME domain port. |
| `src/lib/preaudit/preAuditAcquisitionBridge.ts` | The ONLY crossing from assessment into acquisition. Writes a canonical prospect (never a brand tenant) and refuses anything that is not qualified. |
| `src/components/marketing/ExploreUkMarketFit.tsx` (770) | The public progressive assessment surface — code-split, reusing the existing public visual language. |

### 3.2 Extended (never duplicated)

| File | Change |
|---|---|
| `src/data/domainRepository.ts` | ONE new additive table (`preaudit_assessments`), the port method, both adapters and the hydrate select. Still ONE database, ONE port. |
| `src/data/prospectStore.ts` | `addProspect()` — additive; NOT called at boot, so the seeded universe is unchanged unless a founder explicitly feeds a qualified assessment. |
| `src/lib/events/types.ts` | Six canonical event types + severities. No second event system. |
| `src/lib/commandCentre/controlCentre.ts` | A `preAudit` queue model + one metric + a data-source entry. No new command centre. |
| `src/components/admin/FounderControlCentre.tsx` | The pre-audit queue inside the EXISTING Acquisition section, with a record drawer and a founder-only "Feed to acquisition" action. |
| `src/components/marketing/Home.tsx` | The hero primary CTA opens the assessment; the duplicate hero Partner Login was REMOVED; the final CTA opens the assessment; the `/explore-uk-market-fit` route is detected. |
| `src/components/marketing/PublicNav.tsx` | `explore-uk-market-fit` added to `PublicPage` and to the Solutions dropdown; Partner Login carries a declared test id. |
| `src/config/homepageContent.ts` | `hero.primaryCta` and `finalCta.buttonLabel` → `Explore UK Market Fit`; `hero.secondaryCta` retained as the header utility label with an explanatory comment. |

### 3.3 The public CTA hierarchy (explicitly required)

```
HEADER:  Partner Login            <- separate secondary utility action
HERO:    Explore UK Market Fit    <- the primary prospect CTA
```

The hero's second "Partner Login" button was removed rather than restyled, because the requirement is that the
two actions serve different audiences with **distinct visual hierarchy**. The nav dropdown also carries
`Explore UK Market Fit` so the CTA is discoverable from every public page.

- **Reconciled first (nothing rebuilt):** `.clinerules/*`, `git status`/`git log`, `PROJECT_STATUS.md`,
  `HANDOFF.md`, `requirements-registry.json`, the Founder OS sprint report, and the actual modules — the
  acquisition engine, the BI findings layer, the event feed, the work layer, the command centre, the domain
  persistence port, the prospect store, the acquisition store, the public marketing pages, the homepage
  content model, the integration registry and every validator that could be affected.

## 4. The assessment itself

### 4.1 User journey (implemented)

```
PUBLIC WEBSITE  →  Explore UK Market Fit  →  identity  →  products  →  RESEARCH  →  UK Opportunity Snapshot
                                                                            ↑                  ↓
                                                             supply ONLY the missing information
```

- **Research first.** The identity step asks for the MINIMUM needed to start research (brand name, website,
  country, category). The website is the primary research anchor.
- **Ask only for what cannot be researched.** Everything else — product name, identifiers, origin, lead time,
  MOQ, case pack, cost, price, documentation, contact — is optional, and the result sends the visitor back to
  supply ONLY what is still open.
- **Progressive, not a giant form.** Four declared steps, with the current one highlighted in the step rail.

### 4.2 The UK presence ladder (A → B → C → D → F → E)

F is checked BEFORE E on purpose: "evidence of demand without availability" is strictly more informative than
"nothing found", and collapsing the two would hide the strongest apparent opening. With no research at all the
ladder FAILS CLOSED to `unknown`.

### 4.3 The three indicators — each exposes everything

Every indicator renders its **basis**, its **evidence** (with source, observation date, confidence and
classification), its **observed values**, its **declared rules WITH the value each rule actually observed**,
its **confidence**, and its **unknowns**. An indicator that hides any of these is not allowed to render.

### 4.4 Numbers are never invented

- A gross spread is computed ONLY when BOTH a wholesale/cost price AND an intended retail price were supplied.
  Even then the indicator declares that carrier cost, payment fees, other agreed fees, VAT and deductions have
  **NOT been applied** — a spread is not a margin.
- A lead-time verdict is reached ONLY from a supplied lead time, and the indicator states that the 90-day bar
  is **Mercenta's declared planning threshold, not a rule imposed by any carrier or retail channel**. No
  universal maximum lead time is invented anywhere.
- With nothing supplied, the indicator says plainly that **no figure has been invented**.

### 4.5 Qualification is conservative and fail-closed

| State | When | Feeds acquisition? |
|---|---|---|
| `ineligible` | the category is outside the ten Mercenta can evaluate | NO |
| `unqualified` | no assessment could be formed | NO |
| `needs_information` | a constrained indicator, or any of the three indicators is still `unknown` | NO |
| `qualified` | the regulatory AND supply indicators are workable-or-better and nothing is unknown | **YES** |

Only `qualified` may enter the acquisition pipeline, and the list is DERIVED from the qualification
definitions rather than re-stated, so it cannot drift.

## 5. Pre-audit → acquisition (no second pipeline)

`feedAssessmentToAcquisition(assessmentId, actor)`:

1. REFUSES a missing assessment, an assessment with no result, and anything not `qualified` — writing NOTHING.
2. Deduplicates on the SAME canonical identity key the BI → ICP handoff uses (`normalizeBrandKey`).
3. Creates a canonical `BrandProspect` (scored by the ONE canonical scoring client) or enriches the existing
   one — merging only what the assessment established.
4. Records a canonical `AcquisitionEvent` and a canonical audit entry, and marks the assessment as fed.
5. Returns `createdBrandTenant: false` — **typed as the literal `false`**, so converting a prospect into a
   tenant remains the exclusive job of the canonical onboarding lifecycle.

## 6. Security / RBAC / tenant isolation

- **Ownership is explicit** on every record: `public_session` / `ops` / `brand`.
- `assessmentsForScope()` is the ONE place visibility is decided: a public session sees ONLY its own
  assessment, a brand tenant sees ONLY records it owns, ops sees the platform research.
- The founder queue lives ONLY inside the existing Super-Admin Control Centre (guarded at render).
- No brand-facing component imports the pre-audit store; the public surface leaks no internal BI score or tier.
- Every mutation is attributed and written to the canonical audit registry.

## 7. External providers, credentials and AI

- **Zero live provider calls.** The seam performs no network I/O, declares `networkCalls: 0`, and the
  validator asserts the WHOLE run made ZERO external calls.
- **An unknown provider is never simulation.** Availability resolves through the canonical
  `defaultIntegrationMode` + `isProviderSimulationSafe` helpers.
- **The real provider refuses rather than fabricates**, and its credential comes from a server-side seam that
  reads no `VITE_*` variable.
- **AI is not required.** No AI module is imported by the pre-audit layer, and the assessment works with
  OpenRouter unavailable.
- **No credential or `.env` change** was made, and no `.env` file entered the review ZIP (the credential guard
  passed).


## 8. Files added / modified

**New (10):** `src/config/ukMarketFit.ts` · `src/lib/preaudit/fixtures.ts` ·
`src/lib/preaudit/researchProvider.ts` · `src/lib/preaudit/ukMarketFitEngine.ts` ·
`src/lib/preaudit/preAuditAcquisitionBridge.ts` · `src/data/preAuditStore.ts` ·
`src/components/marketing/ExploreUkMarketFit.tsx` · `scripts/validate-uk-market-fit.mjs` ·
`scripts/reconcile-roadmap-phase1-registry.cjs` · `e2e/uk-market-fit.spec.ts`
(+ this report and the new `test-screenshots/uk-market-fit/`).

**Modified (16):** `src/types.ts` · `src/data/domainRepository.ts` · `src/data/prospectStore.ts` ·
`src/lib/events/types.ts` · `src/lib/commandCentre/controlCentre.ts` ·
`src/components/admin/FounderControlCentre.tsx` · `src/components/marketing/Home.tsx` ·
`src/components/marketing/PublicNav.tsx` · `src/config/homepageContent.ts` ·
`scripts/integrity-audit.mjs` (REPOINTED) · `scripts/validate-uiux-redesign.mjs` (+12 assertions) ·
`scripts/validate-e6-brand-surfaces.mjs` (scope + F5/F5b REPOINTED) ·
`scripts/validate-e7-embedded-social.mjs` (scope) · `requirements-registry.json` ·
`PROJECT_STATUS.md` · `HANDOFF.md`.

**NOT touched:** every protected `design/*.png`, `ave1-check.mjs`, `src/data/demoData.ts`, the work layer's
derivations, the brand shells, `src/lib/intelligence/intelligenceLayer.ts` (its working-tree entry is a
pre-existing stat change with no content difference), Rakazo, and every `.env*` file.

## 9. Validation and verification (real output)

### 9.1 Static gates

| Gate | Result |
|---|---|
| `npx tsc --noEmit -p tsconfig.app.json` | **0 errors** |
| `npm run lint` (`eslint .`) | **0 problems** |
| `npm run build` | **PASS** (4.33s) — `ExploreUkMarketFit-Bx6g9CjI.js` 47.23 kB / 13.52 kB gzip |
| `npm run validate:wording` | **WORDING_LINT_PASS — scanned 255 src files, 0 outward-facing violations** |
| `scripts/integrity-audit.mjs` | **PASSED: 62 FAILED: 0** (was 61/0; +1 new CTA-hierarchy check) |
| `scripts/validate-uiux-redesign.mjs` | **369 PASS / 0 FAIL** (was 357; +12 pre-audit design assertions) |
| `scripts/validate-e7-embedded-social.mjs` | **121 assertions · failures: 0** |
| `scripts/validate-e6-brand-surfaces.mjs` | F1–F5b, F7, F8, F9 **PASS**; F6 = the known pre-existing offender set only |
| `scripts/verify-registry.mjs` | **exit 0** |
| `scripts/validate-uk-market-fit.mjs` | **169 assertions / 0 failures** |
| **Validator sweep (all 79 `scripts/validate-*.mjs`)** | **78 PASS / 1 FAIL** — the single FAIL is the known pre-existing E6 F6 |

### 9.2 Browser verification

- `npx playwright test e2e/uk-market-fit.spec.ts` → **9 passed / 0 failed**.
- **FULL Playwright regression** (`npx playwright test --workers=2`) → **365 passed / 0 failed / 2 skipped
  (15.0m)**, exit 0. The baseline at this HEAD was **356 passed / 0 failed / 2 skipped**; the +9 are exactly
  the new Phase 1 spec. **NO existing verified journey regressed.**
- The spec asserts the CTA hierarchy, that the assessment opens (including by direct URL), that required
  validation names all four fields, that the result renders the THREE indicators and all EIGHT snapshot
  sections, that the research is labelled SIMULATED, that no prohibited promise appears, that the disclaimer
  and the explicit unknowns are shown, that a review request is recorded, that a re-run is deterministic, that
  a Super Admin sees the assessment and can feed a qualified one into acquisition, and that a brand session
  never reaches the Control Centre — with **zero page errors and zero external network calls**.

### 9.3 The one gate that is not green, stated plainly

`scripts/validate-e6-brand-surfaces.mjs` F6 reports five offenders, and they are the **pre-existing,
user-reserved** ones: the 0-byte `ave1-check.mjs` and the four protected untracked `design/*.png`. Nothing
Phase 1 touched is in that list. **F5, F5b and F8 PASS** — F5/F5b were REPOINTED to read the same declared
scope as F6, which fixed a real pre-existing disagreement between the three guards.

`scripts/validate-stage26.mjs` prints `STAGE26_VALIDATION_FAIL (8)` but **always exits 0**, so its 8
pre-existing failures (5 edge-function assertions + 3 render failures caused by the harness omitting
`ThemeProvider`) are invisible to the gate. **No Phase 1 file is involved.** It is recorded in the Master
Matrix as discovered work, deliberately NOT fixed because it is outside this sprint's authorised scope.


## 10. Master Matrix changes

`requirements-registry.json`: **257 → 331 entries** (74 added, **0 historical rows deleted**).

| Group | Rows | Status |
|---|---|---|
| Phase 1 — Explore UK Market Fit / pre-audit | 29 | `built_and_tested` |
| Phase 0 remaining extensions | 2 | `not_started` / `deferred` |
| Phases 2–15 future roadmap | 43 | `not_started` (40) · `in_progress` (2) · `blocked` (1) |
| Phase 1 blocked follow-on + discovered work | 2 | `blocked` / `in_progress` |

Registry-wide status totals after the reconciliation: `built_and_tested` **180** · `built` **103** ·
`regressed` **2** · `not_started` **40** · `in_progress` **3** · `deferred` **1** · `blocked` **2**.
The Phase 15 launch gate contributes **15** of the `not_started` rows (14 `not_started` + 1 `in_progress`).

`_meta.status_enum` was **EXTENDED** (never narrowed) with `in_progress`, `deferred` and `blocked`, because the
project-state contract names those states and a real state must not be mislabelled. The reconciliation script
refuses to write a registry containing a duplicate id or an unknown status, and reports the before/after
counts.

## 11. Five-source reconciliation

| Source | State |
|---|---|
| `requirements-registry.json` (Master Matrix) | 331 entries; Phase 1 `built_and_tested`; Phases 2–15 recorded honestly |
| `PROJECT_STATUS.md` | The mandatory CURRENT PLATFORM POSITION block with all nine numbered headings + the numbered CURRENT REMAINING ROADMAP |
| `HANDOFF.md` | Updated with the ending checkpoint, what is built, what is left and the next prompt |
| `docs/SPRINT_UK_MARKET_FIT_PHASE1_2026-09-19.md` | This document |
| The final session report | Agrees with all of the above |

All five agree on what is complete, in progress, deferred, blocked, next, the current checkpoint, the
verification status and the known exceptions.

## 12. Deferred / blocked / known exceptions

- **Deferred:** the external automation consumer (n8n is explicitly NOT a foundational dependency); live
  research is an activation step, not a build task.
- **Blocked:** Phase 14 live integrations (credentials + Amazon approval) and the Phase 1 live-research
  activation (the declared providers resolve to available/simulation, so the seam correctly refuses).
- **Known exceptions:** E6 F6 (pre-existing reserved offenders) and the stage26 exit-code defect (recorded,
  not fixed).

## 13. NEXT EXECUTION SCOPE

**Phase 2 — Commercial readiness + product economics** (RRP, wholesale/cost price, commercial margin, MOQ,
production MOQ, case-pack, master-carton, pallet profile, packaging and logistics economics, catalogue
readiness, replenishment viability) — building on the Phase 1 canonical entities (`ProductOpportunity`,
`SupplyProfile`, `BrandOpportunity`) rather than creating parallel ones.

Alternative if the founder prioritises launch: **Phase 15 — production readiness / launch gate**, which is
MANDATORY before any public production launch and is now fully enumerated in the Matrix (15 rows).

**Do NOT re-open Phase 1 unless a regression is found.** Phase 14 and the Phase 1 live-research activation stay
BLOCKED on real credentials.

