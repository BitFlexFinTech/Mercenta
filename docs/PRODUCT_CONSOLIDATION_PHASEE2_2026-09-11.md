# PRODUCT CONSOLIDATION — PHASE E2: BRAND ONBOARDING WORKFLOW

> Date: 2026-09-11 · Branch: `redesign/foundation` · Pre-E2 HEAD: `d9bfc1c`
> (E1 documentation checkpoint). E1 implementation: `0568e2a`.
> Protected baseline (never touched): `959b4d2` / tag
> `mercenta-baseline-before-redesign-20260907`.
> Session type: **IMPLEMENTATION** (Phase E, sub-phase E2). No new audit.

---

## 1. PHASE / SUB-PHASE
**Phase E — Core Platform Completion · E2 — Brand onboarding.** Built on the E1
canonical `BrandOnboarding` record; no new identity system, no new store, no new
database, no UI redesign.

## 2. OBJECTIVE
Turn the E1 hand-off record into the REAL stateful onboarding workflow so a brand
can be taken from **qualified opportunity / approved application / operator
creation → acceptance → onboarding information → ordered requirements →
operational brand**, with Admin able to see and operate where each brand stands,
tenant isolation enforced in the domain, and the resulting brand tenant actually
reachable in the portal.

## 3. WHAT WAS BUILT

### 3.1 Two honest realisations of "onboarding" that were previously missing
- **Brand acceptance** (`acceptOnboarding`) — a DISTINCT, audited transition from
  Mercenta initiating the process. It is what the brand's own wizard submission
  triggers, and it is attributable (`acceptedAt` / `acceptedBy = brand:<tenantId>`
  vs a staff id).
- **Two further real entry points** into the SAME canonical record:
  `beginOnboardingFromApplication` (an approved partner application) and
  `beginOnboardingForManualBrand` (an operator-created brand). Both are idempotent
  and both derive a DETERMINISTIC tenant id.

### 3.2 Tenant-scoped RBAC in the domain (not just hidden buttons)
`OnboardingActor extends AcquisitionActor` with an optional `tenantId` pin. A brand
session (`{ staffId: 'brand:<id>', canMutate: true, tenantId }`) can act ONLY on its
own record: `acceptOnboarding`, `completeOnboardingStep` and
`finishBrandOnboarding` return `CROSS_TENANT` for any other tenant, and both
`begin*` entry points refuse a tenant-pinned actor outright (a brand cannot initiate
its own onboarding). Verified in the validator, not just by absent buttons.

### 3.3 Real defects fixed (found while wiring this phase)
1. **Application-approved brands could not enter the portal at all.** The login card
   was rendered (`Login.tsx` derives cards from `approvedApplicationBrands`) but
   `activateDemoBrand()` only knows the `ALL_DEMO_BRANDS` fixtures, so clicking it
   logged `[rbac] unknown demo brand — refused` and went nowhere. An approved brand
   was a dead end.
2. **The manual brand path used a non-deterministic identity** —
   `brand-manual-${Date.now()}-${Math.random()}` — which could not be replayed,
   reconciled, or referenced by any onboarding process.
3. **Application approval created an identity no onboarding process could see**
   (`addApprovedBrand` wrote an `ApprovedBrandEntry` and nothing else).

### 3.4 New / extended surfaces
- **NEW `src/components/admin/OnboardingPipeline.tsx`** — the Admin operating
  surface. Lists the canonical records with their REAL origin (Acquisition /
  Application / Manual), derives every count from live state (all 0 when nothing is
  onboarded), and genuinely OPERATES each record inline: record acceptance, complete
  the ordered steps, complete onboarding → operational. The stat chips are
  drill-down filters, and the persistence status is surfaced honestly.
- **Admin nav**: new "Onboarding" item under Brands (+ `onboarding_pipeline` added to
  the `admin_staff` view allowlist, so a Mercenta Admin — not only Super Admin — can
  operate onboarding).
- **Brand side (minimal, no wizard redesign)**: the portal can now be entered by a
  canonical tenant (`activateOnboardingBrand`) and the brand's EXISTING wizard
  submission drives real canonical state — `acceptOnboarding` + the `profile` step,
  attributed to the brand session. `Login.tsx` derives the tenant cards from the
  store, so a handed-off brand appears automatically and enters through the
  canonical path (demo fixtures keep the demo-dossier path unchanged).
- **`ApplicationsPanel`**: approval and manual creation now route through the
  canonical lifecycle, so the login card id and the onboarding record id are the
  same value by construction.

### 3.5 What was deliberately NOT done
- No fabricated operational data for a new brand: `activateOnboardingBrand` sets an
  EMPTY products/POs/shipments/financials/compliance state (the brand has supplied
  nothing) and derives the region only from the canonical prospect's own declared
  countries via the EXISTING `deriveIcpOriginRegion` — otherwise the brand picks it
  in the wizard. Demo-brand dossiers are untouched.
- No new onboarding wizard, no second onboarding store, no new table, no second
  database, no BI-status invention.

## 4. FILES CHANGED

```
src/components/admin/OnboardingPipeline.tsx        (NEW, 328 lines)
scripts/validate-onboarding-workflow.mjs           (NEW, 45 assertions)
e2e/onboarding-workflow.spec.ts                    (NEW, 3 tests)
docs/PRODUCT_CONSOLIDATION_PHASEE2_2026-09-11.md   (NEW, this report)
src/lib/onboarding/onboardingLifecycle.ts          (+~330 lines)
src/types.ts                                       (BrandOnboarding + status/origin unions)
src/data/acquisitionStore.ts                       (onboarding audit + tenant/pipeline reads)
src/data/applicationStore.ts                       (addApprovedBrand returns the entry)
src/lib/auth/rbac.ts                               (allowlist: onboarding_pipeline)
src/components/layout/AdminShell.tsx               (nav + route)
src/components/admin/ApplicationsPanel.tsx         (both entry points → canonical record)
src/context/GlobalStateContext.tsx                 (activateOnboardingBrand + brand submission)
src/components/auth/Login.tsx                      (derived canonical tenant cards)
```

No unrelated file was touched; no forensic/generated artefact was staged or deleted.

## 5. EXISTING FUNCTIONALITY PRESERVED
- **Demo-brand behaviour is unchanged**: the demo fixtures keep the dossier
  activation path (`activateDemoBrand`), the wizard gate
  (`BrandShell:86 — !brandProfile.onboarded → wizard`), and the existing
  `OnboardingWizard` / `OnboardingSummary` are NOT modified. `completeOnboarding()`
  only writes canonical state when a canonical record exists for the tenant (a
  no-op for demo tenants), so `e2e/onboarding.spec.ts` behaviour is untouched.
- **E1 remains intact**: the acquisition hand-off, its ordered steps, its RBAC and
  its audit trail are unchanged (regression-covered by section H of the new
  validator and by the E1 spec, both still green).
- No provider safety change (`UNKNOWN ≠ LIVE`, fail-closed live gate untouched), no
  Rocket.Chat/Rakazo/Postiz change, no styling change beyond the minimal additions
  (existing palette/primitives only — design-token validator PASS).

## 6. DATA / DOMAIN CHANGES
| Change | Nature |
|---|---|
| `OnboardingStatus` += `accepted` | Additive union member; the brand-acceptance state. |
| `BrandOnboarding.origin` += `partner_application` / `manual_creation` | One canonical record, three REAL entry points. |
| `prospectId` / `opportunityId` / `biScore` / `biTier` now optional | Correct for the non-acquisition origins (an application has no prospect). NO new field was invented to fill them. |
| `acceptedAt` / `acceptedBy` | Additive: attributable brand acceptance. |
| `AcquisitionEventType` += `onboarding_accepted` | Additive timeline member (acquisition origin only). |
| `recordOnboardingAudit()` | Onboarding audit rows in the SAME `demoAuditLog` with `entityType:'onboarding'` and the REAL `brandId`. |

**No second onboarding store, no new table, no new database, no migration change
(migration 021 still matches the record shape via `payload jsonb` + key columns).**

## 7. TESTS RUN
`npm run typecheck` · `npm run lint` · `npm run build` ·
`node scripts/validate-onboarding-workflow.mjs` (NEW) ·
`node scripts/validate-onboarding-handoff.mjs` (E1 regression) ·
`validate-d4-persistence` · `validate-acquisition-pipeline` · `validate-bi-lifecycle`
· `validate-bi-intelligence-preservation` · `validate-outreach-provider-hardening` ·
`validate-prospect-pipeline` · `validate-mock-providers` · `validate-mock-seam` ·
`validate-provider-workflows` · `validate-discovery` · `validate-postiz` ·
`validate-automation` · `validate-csv-import` · `validate-demo-completeness` ·
`validate-design-tokens` · `validate-rocketchat-removal` ·
`npx playwright test e2e/onboarding-workflow.spec.ts` · `npx playwright test` (FULL).

## 8. EXACT TEST RESULTS (real output, this session)
| Gate | Result |
|---|---|
| `npm run typecheck` | **PASS — 0 errors** |
| `npm run lint` | **PASS — 0 problems** |
| `npm run build` | **PASS — `✓ built in 3.42s`** (AdminShell chunk 487.90 → 490.47 kB, +2.57 kB for the new admin surface) |
| `validate-onboarding-workflow.mjs` (NEW) | **ONBOARDING_WORKFLOW_VALIDATION_PASS — 45/45** |
| `validate-onboarding-handoff.mjs` (E1, must not regress) | **ONBOARDING_HANDOFF_VALIDATION_PASS — 46/46** |
| d4-persistence · acquisition-pipeline · bi-lifecycle · bi-intelligence-preservation · outreach-provider-hardening · prospect-pipeline | **ALL PASS** |
| mock-providers · mock-seam · provider-workflows · discovery · postiz · automation · csv-import · design-tokens · rocketchat-removal | **ALL PASS** |
| `validate-demo-completeness` | **All 27 checks passed** |
| `npx playwright test e2e/onboarding-workflow.spec.ts` | **3 passed (26.0s)** |
| `npx playwright test` (FULL, 4 workers, 31 spec files) | **181 passed / 4 skipped / 0 failed** (5.2m) — E1 baseline 178/4/0 → **+3 tests, 0 new failures, 0 new skips** |
| `git diff --stat` (tracked source) | **9 files changed, 534 insertions(+), 58 deletions(-)** |

**Three real failures occurred during this phase and were fixed — reported, not
hidden:**
1. the E2 validator crashed once (`onbSrc is not defined` — a declaration lost while
   splitting an oversized edit); fixed and re-run to 45/45;
2. the E2 browser suite initially failed all 3 tests on a `:text-is("Onboarding")`
   nav selector — the nav item rendered correctly (`button "Onboarding"` in the
   recorded snapshot) but that pseudo-class did not match, so it was replaced with
   the proven `filter({ hasText: /^Onboarding$/ })` pattern (which also keeps
   "Onboarding Tours" from matching);
3. test 1 then failed on `[data-state="pipeline-complete-step"][data-step="…"]`
   because the shared `Button` primitive only forwards `data-state` — `data-step`
   was silently dropped. The step identity was moved onto the wrapper element and
   the spec updated; root cause recorded in a code comment so the next component
   does not repeat it.

## 9. BROWSER VERIFICATION
Real Playwright runs against the real UI (`e2e/onboarding-workflow.spec.ts`):
1. **Admin pipeline operates an acquisition-origin onboarding to operational** —
   Tapatío → outreach → approved → simulated send → response → opportunity →
   Start onboarding → Admin → Onboarding: the row shows `initiated`, `Acquisition`,
   `prospect prospect-tapatio`, `0/5 steps` and the `All: 1` count; opening it shows
   `Originating opportunity opp-prospect-tapatio`; an out-of-order step is REFUSED
   (`ILLEGAL_TRANSITION`); **Record acceptance** → `accepted`; the 5 ordered steps
   complete; **Complete onboarding** → `Operational brand — tenant brand-tapatio`,
   row `completed`; the `Operational: 1` chip filters to exactly that row.
   **0 page errors.**
2. **The pipeline is derived, and brand sessions cannot reach it** — on a fresh
   session the screen says "No onboarding records yet" and every count reads 0 (no
   seeded numbers); after switching to a brand session in-app there is no Onboarding
   nav entry and no pipeline surface.
3. **Manual creation → canonical record → the brand tenant enters its portal** —
   Super Admin → Applications → manual creation → the pipeline shows the record with
   origin `Manual` and the DERIVED tenant id `brand-harbourfentradingco`; navigating
   back to the login portal **in-app** (so in-memory state survives, which is
   precisely what the pre-existing access-gate t8 skip noted as hard) shows the new
   brand card marked "Onboarding", and clicking it renders the brand portal
   (the wizard, because the brand has not submitted yet) with **0 page errors**.

Honest scope note: automated browser verification only — no manual human
click-through.

## 10. RBAC / TENANT ISOLATION RESULT
- **Tenant isolation is enforced in the DOMAIN**, not by hidden UI: the validator
  proves a tenant-pinned brand actor can act on its own record (A2) and is refused
  with `CROSS_TENANT` on another tenant's record for both step completion and
  finishing (A3/A4), that a brand cannot initiate onboarding (A5), that a view-only
  account is refused (A6), and that none of those refusals changed the record (A7).
  Browser-side, the brand session has no onboarding nav entry and no pipeline
  surface (E2 spec test 2).
- **Admin access is role-aware**: `onboarding_pipeline` was added to the
  `admin_staff` view allowlist and `super_admin` keeps `'*'`; the read-only staff
  tier still gets disabled controls AND a domain refusal.
- **Honest limitation (unchanged from E1):** the browser suite does not switch the
  acting staff account to the seeded view-only staff user; that refusal is proven at
  domain level (validator) plus a source-level binding check, not by a browser click
  on that account.
- **Shared-component scoping check:** `OnboardingPipeline` is admin-only and reads
  the ops-side canonical store; it is NOT rendered in the brand shell (asserted in
  the browser), so there is no cross-tenant leak through a shared surface. The
  brand-side path reads only `getOnboardingForBrand(session.tenantId)`.

## 11. SIMULATION / LIVE STATUS
- **Simulation only, zero network**: `externalFetches === 0` for the whole E2
  suite; no provider was contacted and no live claim is made anywhere.
- **Nothing is durable here**: browser Supabase credentials are still not
  configured, so the memory adapter is active, the pipeline prints
  `Persistence: memory-only — … not durable`, and migration 021 remains unexecuted.
- No change to provider safety: `UNKNOWN ≠ LIVE`, the fail-closed live gate, and the
  onboarding flow's independence from any provider all hold.

## 12. KNOWN LIMITATIONS
- **Two representations of "onboarded" remain, deliberately**: the brand portal's
  `brandProfile.onboarded` (set by the brand's own wizard submission — pre-existing
  behaviour, unchanged, and the gate at `BrandShell:86`) and the canonical
  `BrandOnboarding.status` (set by the platform process). They are related but not
  yet a single derived value, because forcing the portal gate to follow the
  canonical status would lock a brand in the wizard until an operator completes the
  platform-side steps — a behavioural regression against the existing tested flow.
  Recorded here as a real, known seam for the UI/UX phase (or a later sub-phase) to
  resolve, not silently merged.
- Onboarding step completion is operator-driven or brand-submission-driven; the
  step *evidence* (specific agreement ids, document ids) is captured as a note, not
  yet as foreign keys to the agreement/compliance records.
- The `track` stays `unassigned` until the brand decides in the wizard.
- Live Supabase persistence is still unverified (no credentials here); migrations
  020 + 021 ship unexecuted.
- No manual browser click-through; no deploy, no push.
- E3–E7 untouched.

## 13. WHAT REMAINS
**E3 — Catalog / product management** (next), then E4 commerce/Amazon-style
operational simulation, E5 admin operational surfaces, E6 brand operational
surfaces, E7 embedded Postiz. Environment-dependent: execute migrations 020 + 021
and verify durable persistence against a credentialed Supabase project.

## 14. GIT COMMIT HASHES
- Pre-E2 HEAD: `d9bfc1c` (E1 documentation checkpoint); E1 implementation `0568e2a`.
- **E2 implementation commit:** `phaseE2: build the brand onboarding workflow
  (acceptance, ordered steps, application/manual entry points, admin pipeline,
  tenant-scoped RBAC)` — hash recorded in the follow-up documentation checkpoint.
- E2 documentation checkpoint: created in the same session immediately after.

## 15. REVIEW ZIP STATUS
Exported at the end of this session via the mandatory script
`bash ~/Desktop/Mercenta/scripts/export-review-zip.sh` to
`~/Desktop/Mercenta/Review Zip/mercenta-review.zip` (literal `ls -la` output in the
session report). No numbered zips were created and nothing was written to the
`~/Desktop/` root.

## 16. EXACT NEXT SUB-PHASE
**E3 — Catalog / product management**, following the existing repository
architecture: the brand → product → information → compliance/readiness →
submission → resulting-state lifecycle, using the existing product store, SP-API
seam and compliance gate, explicitly in simulation mode.



