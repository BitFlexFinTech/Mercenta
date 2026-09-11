# PRODUCT CONSOLIDATION — PHASE E1: OPPORTUNITY → BRAND ONBOARDING HAND-OFF

> Date: 2026-09-11 · Branch: `redesign/foundation` · Pre-E1 HEAD:
> `f36884a` (D4 documentation checkpoint). Protected baseline (never touched):
> `959b4d2` / tag `mercenta-baseline-before-redesign-20260907`.
> Session type: **IMPLEMENTATION** (Phase E, sub-phase E1). No new audit was
> performed — the gap was already the tracked, documented D4 follow-up
> ("`Opportunity.brandId` still needs to be correctly wired through the
> application → onboarding hand-off"). E1 closes exactly that and nothing else.

---

## 1. PHASE / SUB-PHASE

**Phase E — Core Platform Completion · E1 — Core Platform Gap Closure**
(the opportunity → brand-onboarding hand-off, the first dependency of E2–E7).

## 2. OBJECTIVE

Close the canonical hand-off between an accepted/qualified acquisition
**Opportunity** and the resulting **brand tenant + onboarding** identity, using
the EXISTING architecture: one identity system, no duplicate brand store, no
second database, acquisition history preserved, RBAC and tenant isolation
enforced in the domain, and the complete flow demonstrable without any live
third-party credentials.

## 3. WHAT WAS BUILT

### 3.1 The gap, verified in source before any change

| Fact | Evidence at `f36884a` |
|---|---|
| `Opportunity.brandId?` exists, documented "set once the prospect onboards" | `src/types.ts:2213` |
| Nothing ever set it | `createOpportunityFromResponse()` builds the record with no `brandId` (`src/lib/acquisition/outreachLifecycle.ts` ~L731-749); no setter anywhere in `src/` |
| Onboarding existed only as client-side React state | `GlobalStateContext.completeOnboarding()` (L386) flips `brandProfile.onboarded`; no canonical persisted onboarding entity, no admin onboarding pipeline, portal access is the hardcoded `PORTAL_BRAND_IDS` fixture |
| The persistence row's brand scope depended on `brandId` | `updateOpportunity` persists with `opportunities[idx].brandId` as the brand scope (`src/data/acquisitionStore.ts` L209-215) — so the missing link also kept handed-off brands invisible to their own tenant scope |

### 3.2 The canonical onboarding record (one identity, derived tenant id)

NEW `src/lib/onboarding/onboardingLifecycle.ts` — the domain lifecycle, mirroring
the existing `outreachLifecycle.ts` contract (`AcquisitionActor`, `{ok,error}`
results, audit on both the relationship timeline and the platform audit log):

- `beginBrandOnboarding(opportunityId, actor)` — `qualified`/`won` only; creates
  the onboarding record keyed by the CANONICAL prospect (`onb-<prospectId>`),
  derives the tenant id from the SAME canonical `normalizeBrandKey` used
  everywhere else (`Tapatío` → `brand-tapatio`), refuses a tenant-id collision,
  **sets `Opportunity.brandId`** (the D4 gap), and audits (`onboarding_started`).
- `completeOnboardingStep(onboardingId, stepId, actor, note?)` — strictly
  ordered (`profile → legal_agreements → banking → carriers → compliance`); a
  later step cannot jump the queue; attributed to the acting staff account.
- `finishBrandOnboarding(onboardingId, actor)` — refused while any step is
  outstanding (`INCOMPLETE_STEPS`); completion is a DISTINCT explicit act (a
  completed step never auto-completes onboarding).
- Idempotent by canonical id: replaying the hand-off returns the existing record
  (no duplicate identity); re-completing a done step changes nothing.
- The fulfillment `track` starts `unassigned` — deliberately NOT invented at
  hand-off (the brand decides it during onboarding).

### 3.3 Types (additive only)

`src/types.ts`: `OnboardingStatus`, `OnboardingStepId`, `OnboardingStepStatus`,
`OnboardingStep`, `BrandOnboarding` (carries `prospectId`, `opportunityId`,
`brandId`, the BI score/tier snapshot, provenance `origin`);
`AcquisitionEventType` extended with `onboarding_started`,
`onboarding_step_completed`, `onboarding_completed`. **No existing type was
changed, removed or repurposed.**

### 3.4 Persistence (same port, same database)

- `src/data/domainRepository.ts` — the EXISTING domain persistence port gained
  ONE artefact: `DOMAIN_TABLES.brandOnboarding`, `persistBrandOnboarding()` on
  the interface + BOTH adapters (memory: non-durable acknowledgement; Supabase:
  idempotent upsert by canonical id with typed key columns), and
  `brandOnboarding` in `HydratedDomainState`/`hydrate()`.
- Brand-scope reads now include ops-owned rows that NAME the brand as their
  tenant for the onboarding table (exactly as opportunities already did), so the
  read path matches the brand-isolation RLS policy.
- NEW `supabase/migrations/021_create_brand_onboarding.sql` — 1 table, indexes,
  RLS enabled, an admin policy and a brand-isolation policy
  (`brand_id = (auth.jwt() ->> 'tenant_id')`); no blanket permissive policy.
  Same database as 020 — **no second database**.

### 3.5 Store (no second store)

`src/data/acquisitionStore.ts` — the EXISTING canonical acquisition store gained
the onboarding working set (`onboardings`, `getOnboardings`,
`getOnboardingForProspect` / `ForOpportunity` / `ById`, `isTenantIdClaimed`,
`saveOnboarding`, `updateOnboarding`), the hydrate + reset wiring, and every
mutation mirrors through the persistence port.

### 3.6 Operator UI (minimal, additive — no redesign, no new design system)

- `src/components/admin/AcquisitionWorkflow.tsx` — a new
  `data-section="onboarding"` block inside the existing Opportunity panel:
  start / per-step complete / complete-onboarding actions, step statuses, the
  derived tenant id, and the retained prospect + opportunity ids. Uses the
  existing `Button`/`Badge` primitives and existing palette only; the RBAC gate
  is the same `canCurrentUserMutate` binding the rest of the component uses.
- `src/components/admin/AcquisitionRelationships.tsx` — the pre-onboarding
  relationship row now shows the hand-off status + tenant, and the card summary
  gained real "In onboarding" / "Operational" counts derived from store state.

## 4. FILES CHANGED

```
src/lib/onboarding/onboardingLifecycle.ts                       (NEW)
supabase/migrations/021_create_brand_onboarding.sql             (NEW)
scripts/validate-onboarding-handoff.mjs                         (NEW, 46 assertions)
e2e/onboarding-handoff.spec.ts                                  (NEW, 3 tests)
src/types.ts                                                    (+63/−1)
src/data/domainRepository.ts                                    (+39/−2)
src/data/acquisitionStore.ts                                    (+60/−1)
src/components/admin/AcquisitionWorkflow.tsx                    (+144/−1)
src/components/admin/AcquisitionRelationships.tsx               (+15/−2)
docs/PRODUCT_CONSOLIDATION_PHASEE1_2026-09-11.md                (NEW, this report)
```

`git diff --stat` (tracked source only): **5 files changed, 314 insertions(+),
7 deletions(-)**. No unrelated file was touched; no forensic/generated artefact
was staged, modified or deleted.

## 5. EXISTING FUNCTIONALITY PRESERVED

- **No behaviour removed or weakened.** Every change is additive: new module, new
  migration, new types, new store functions, new UI block, new tests.
- Acquisition (Phase C) and its D2/D3/D4 hardening are untouched: the same
  outbound workflow, the same `resolveOutreachTransport` fail-closed live gate,
  the same `UNKNOWN ≠ LIVE` rule, the same canonical message thread keyed by
  `relationshipIdFor(prospectId)` — **message keys were NOT re-keyed**, so no
  conversation history moved or split when a prospect became a tenant.
- Brand Intelligence lifecycle (Phase B) is untouched; the hand-off does not
  rewrite BI outreach status (there is no canonical `OutreachStatus` for
  "onboarding", so nothing was invented to fill the gap — the acquisition
  timeline records the transition instead).
- Rocket.Chat remains removed; Rakazo is still not introduced; Postiz is
  untouched; the UI/visual design is unchanged (design-token validator PASS).

## 6. DATA / DOMAIN CHANGES

| Change | Nature |
|---|---|
| `BrandOnboarding` entity | NEW canonical entity. Keyed by the CANONICAL prospect id (`onb-<prospectId>`) — it is the same identity that already flows BI → ICP → outreach → response → opportunity → CRM. No second brand identity. |
| Tenant id convention `brand-<normalizeBrandKey>` | NEW, DERIVED from the existing canonical normaliser; a collision with an already-claimed tenant id is refused rather than silently merged. |
| `Opportunity.brandId` now set | The D4 gap. Set by `beginBrandOnboarding` (and re-affirmed on completion), so the opportunity is also readable by the brand tenant scope (and matches migration 020's `brand_own_acquisition_opportunity` policy). |
| `AcquisitionEventType` +3 members | `onboarding_started`, `onboarding_step_completed`, `onboarding_completed` — the relationship timeline now carries the hand-off. |
| Platform audit actions +3 | `acquisition_onboarding_started`, `acquisition_onboarding_step_completed`, `acquisition_onboarding_completed` (the ONE `demoAuditLog`). |
| `brand_onboarding` table (migration 021) | 1 new table in the SAME Supabase database, RLS + admin policy + brand-isolation policy. |
| `DOMAIN_TABLES.brandOnboarding` | 1 new entry in the EXISTING persistence port. |

**No duplicate store, no duplicate database, no changed/removed existing entity
shape.** `src/data/acquisitionStore.ts` remains the ONE canonical acquisition
store (validators assert exactly one such module).

## 7. TESTS RUN

```bash
npm run typecheck
npm run lint
npm run build
node scripts/validate-onboarding-handoff.mjs          # NEW this phase
node scripts/validate-d4-persistence.mjs
node scripts/validate-acquisition-pipeline.mjs
node scripts/validate-bi-lifecycle.mjs
node scripts/validate-bi-intelligence-preservation.mjs
node scripts/validate-outreach-provider-hardening.mjs
node scripts/validate-prospect-pipeline.mjs
node scripts/validate-mock-providers.mjs
node scripts/validate-mock-seam.mjs
node scripts/validate-provider-workflows.mjs
node scripts/validate-discovery.mjs
node scripts/validate-postiz.mjs
node scripts/validate-automation.mjs
node scripts/validate-csv-import.mjs
node scripts/validate-demo-completeness.mjs
node scripts/validate-design-tokens.mjs
node scripts/validate-rocketchat-removal.mjs
npx playwright test e2e/onboarding-handoff.spec.ts --workers=2
npx playwright test --workers=4                        # FULL suite
```

## 8. EXACT TEST RESULTS (real output, this session)

| Gate | Result |
|---|---|
| `npm run typecheck` | **PASS** — 0 errors |
| `npm run lint` | **PASS** — 0 problems |
| `npm run build` | **PASS** — `✓ built in 3.31s` |
| `validate-onboarding-handoff.mjs` (NEW) | **ONBOARDING_HANDOFF_VALIDATION_PASS — 46/46** |
| `validate-d4-persistence.mjs` | **D4_PERSISTENCE_VALIDATION_PASS** (port change did not regress it) |
| `validate-acquisition-pipeline.mjs` | **ACQUISITION_PIPELINE_VALIDATION_PASS** |
| `validate-bi-lifecycle.mjs` | **BI_LIFECYCLE_VALIDATION_PASS** |
| `validate-bi-intelligence-preservation.mjs` | **BI_INTELLIGENCE_PRESERVATION_VALIDATION_PASS** |
| `validate-outreach-provider-hardening.mjs` | **OUTREACH_PROVIDER_HARDENING_VALIDATION_PASS** |
| `validate-prospect-pipeline.mjs` | **PROSPECT_PIPELINE_VALIDATION_PASS** |
| `validate-mock-providers` / `mock-seam` / `provider-workflows` / `discovery` / `postiz` / `automation` / `csv-import` / `design-tokens` / `rocketchat-removal` | **ALL PASS** |
| `validate-demo-completeness.mjs` | **✅ All 27 checks passed** |
| `npx playwright test e2e/onboarding-handoff.spec.ts` | **3 passed (12.9s)** |
| `npx playwright test` (FULL, 4 workers, 30 spec files) | **178 passed / 4 skipped / 0 failed** (4.7m) — pre-E1 baseline was 175/4/0, so **+3 tests, 0 new failures, 0 new skips** |
| `git diff --stat` (tracked source) | **5 files changed, 314 insertions(+), 7 deletions(-)** |

The 4 skips are the pre-existing/intentional ones (access-gate t6/t8/t9 + tours
t5). **One honest note on process:** the new validator initially FAILED (1 of 46,
H4) because its forbidden-code regex matched the *comment* in migration 021 that
documents the rule. It was fixed by stripping SQL comments before scanning for
code (the same technique the D4 validator uses) — the check was not weakened, and
the failure/resolution is reported rather than hidden.

## 9. BROWSER VERIFICATION

Real Playwright runs against the real UI (`e2e/onboarding-handoff.spec.ts`):

1. **Full hand-off** — Super Admin → Brand Intelligence → Tapatío → Outreach →
   prepare → approve → simulated send → simulated response → Create opportunity
   → the Opportunity panel reports `qualified` → **Start onboarding** →
   `data-onboarding-status="initiated"`, the tenant text is exactly
   `brand-tapatio`, and the record shows `onb-prospect-tapatio`,
   `opp-prospect-tapatio` and `prospect-tapatio` → an early **Complete
   onboarding** is REFUSED with a real `INCOMPLETE_STEPS` error → completing
   `banking` out of order is REFUSED with `ILLEGAL_TRANSITION` → the five steps
   complete in order → **Complete onboarding** → status `completed` and
   "Operational brand" is rendered → the relationship timeline contains
   `onboarding_started`, `onboarding_step_completed` and `onboarding_completed`.
   **0 page errors.**
2. **CRM visibility** — after the hand-off, the pre-onboarding relationship row
   carries `data-onboarding-row="completed"`, shows `tenant brand-tapatio`, the
   card counts read `In onboarding: 1` / `Operational: 1`, and opening the row
   renders the SAME canonical onboarding record. **0 page errors.**
3. **Tenant isolation in the browser** — a brand session (Little Kiwi Baby Co)
   has no Brand Intelligence nav entry and no onboarding surface at all.

Honest scope note: this is automated browser verification only — no manual human
click-through was performed.

## 10. RBAC / TENANT ISOLATION RESULT

- **RBAC is enforced in the DOMAIN, not by hiding UI.** The validator proves a
  view-only actor (`canMutate:false`) is refused by `beginBrandOnboarding`,
  `completeOnboardingStep` and `finishBrandOnboarding`, and that the refusals
  changed no state (B1–B4). The UI additionally binds every onboarding action to
  the existing `canCurrentUserMutate` gate. **Honest limitation:** the browser
  spec does not switch the acting staff account to the seeded view-only account
  (`staff-005`); the domain refusal is proven by the validator, and the UI binding
  is verified at source level rather than by a browser click.
- **Tenant isolation:** a brand scope can read ONLY its own onboarding row
  (G1/G3 prove it is readable by that tenant; G2 proves another tenant sees none),
  and the migration carries a brand-isolation RLS policy rather than a blanket
  one. `validate-d4-persistence` and `validate-acquisition-pipeline` (which
  include the multi-tenant assertions) still PASS, and a brand session is
  verified in-browser to have no acquisition or onboarding surface.
- **Honest caveat:** an onboarding row is created by Mercenta operations and is
  therefore stored with the ops `tenant_id` plus the brand's `brand_id`; the brand
  read path was extended to the same ops-owned/brand-named rule the opportunity
  table already used. This is verified against the port contract with an injected
  conformance repository — **not** against a live Supabase project (see §11).

## 11. SIMULATION / LIVE STATUS

- **Simulation only.** No live provider was contacted; the whole hand-off ran with
  `externalFetches === 0` (validator H6) plus the existing zero-network proofs in
  the mock/provider validators.
- **Nothing is claimed to be live or durable.** Browser Supabase credentials
  (`VITE_SUPABASE_URL` / `VITE_SUPABASE_ANON_KEY`) are NOT configured in this
  environment: the persistence port's **memory adapter** is active, the status
  reports `memory-only` / `durable:false`, and **migration 021 has NOT been
  executed** against any project (exactly as recorded for 020 in D4). The durable
  path was exercised with an injected conformance repository, not a live project.
- `UNKNOWN ≠ LIVE` and the fail-closed live gate are untouched; the onboarding
  flow needs no provider at all.

## 12. KNOWN LIMITATIONS

- **Live Supabase persistence is still unverified** (no credentials here);
  migration 021 ships unexecuted, like 020.
- Onboarding steps are recorded, audited, tenant-scoped transitions — they do not
  yet drive the brand-side wizard's own step state (`OnboardingWizard` /
  `completeOnboarding` still manage the brand portal view). Linking those is E2.
- The onboarding `track` stays `unassigned` until the brand decides (deliberate).
- The marketing **application → onboarding** path (`ApplicationsPanel` approve →
  `addApprovedBrand`) still creates only an `ApprovedBrandEntry`; it does **not**
  yet create a canonical onboarding record. E1 scoped the opportunity hand-off
  (the documented D4 follow-up); routing the application entry point through the
  same canonical record is E2 work and is honestly reported as not done.
- No manual browser click-through; Playwright + validators only. No deploy, no push.
- E3–E7 (catalog, commerce simulation, admin/brand operational surfaces, embedded
  Postiz) are untouched by this sub-phase.

## 13. WHAT REMAINS

**E2 — Brand onboarding** (next): make the canonical onboarding record drive the
real stateful workflow — link the brand-side wizard steps, route the application
approval path through the same record, and give Admin an onboarding pipeline view.
Then **E3** catalog/product lifecycle, **E4** commerce/Amazon-style operational
simulation, **E5** admin operational surfaces, **E6** brand operational surfaces,
**E7** embedded Postiz. Separately outstanding (environment-dependent): execute
migrations 020 + 021 and verify the durable path against a credentialed Supabase
project.

## 14. GIT COMMIT HASHES

- Pre-E1 HEAD: `f36884a` (D4 documentation checkpoint).
- **E1 implementation commit:** `phaseE1: wire the opportunity → brand onboarding
  hand-off (canonical tenant identity, ordered steps, RBAC in the domain, same
  persistence port)`. The hash is recorded in the follow-up documentation
  checkpoint commit (the established D1–D4 pattern, since this report ships inside
  the implementation commit itself).
- E1 documentation checkpoint: created in the same session immediately after.

## 15. REVIEW ZIP STATUS

Exported at the end of this session via the mandatory script
`bash ~/Desktop/Mercenta/scripts/export-review-zip.sh` to
`~/Desktop/Mercenta/Review Zip/mercenta-review.zip` (the literal `ls -la` output is
in the session report). **No numbered zips were created and no zip was placed at
the `~/Desktop/` root** (project protection rule).

## 16. EXACT NEXT SUB-PHASE

**E2 — Brand onboarding**, starting from the E1 canonical `BrandOnboarding`
record (no new identity, no new store): brand-facing step state, the
application-approval entry point, admin onboarding pipeline visibility, and
completion → operational brand.



