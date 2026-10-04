# MERCENTA — FOUNDER OPERATING SYSTEM + FREE-FIRST AUTONOMOUS OPERATIONS (2026-09-19)

> Branch `redesign/foundation` · starting HEAD `19be002` (`19be002c4b3d6a64020b4740879c56ef1550e628`) ·
> protected baseline `959b4d2` (still an ancestor). This document is the canonical record of what this
> sprint actually did and verified. It is the fifth source of the project-state contract (see
> `.clinerules/project-state-contract.md`).

## 1. Executive summary

This sprint built the **Founder Operating System** as ONE integrated capability layer, not five
disconnected products, on top of the canonical state, business rules and work/event architecture that
already existed:

| Capability | What now exists | Status |
|---|---|---|
| **A. Autonomous / scheduled operations** | `src/lib/automation/registry.ts` — a declared catalogue of **8 deterministic automations** with a real run ledger (idempotency, observable failure, safe retry, attributed disable, human approval gate, declared next-run dates, optional-dependency degradation) and a **recorded free-first scheduler decision** ($0, no timer, no new dependency) | BUILT + VERIFIED |
| **B. Founder / Super Admin Control Centre** | `src/lib/commandCentre/controlCentre.ts` + `src/components/admin/FounderControlCentre.tsx` — nine derived operating views over canonical records, composing the existing workspace architecture, Super-Admin only | BUILT + VERIFIED |
| **C. Brand acquisition / outreach engine** | `src/lib/acquisition/acquisitionEngine.ts` — the canonical **eleven-stage** lifecycle derived from existing records, with dedup, owner, next action, follow-up dates and a **conversion guard (a prospect is NOT a brand)** | BUILT + VERIFIED |
| **D. Brand Intelligence expansion** | `src/lib/intelligence/intelligenceLayer.ts` — findings across seven intelligence domains with a declared **evidence basis**, citations, thresholds and a brand-safe projection | BUILT + VERIFIED |
| **E. Founder Ops AI** | `src/lib/ai/founderAiClient.ts` + `src/lib/ai/founderOpsAi.ts` + `src/lib/founder/briefFacts.ts` — a deterministic daily brief and Ask Mercenta, with AI as an **optional, labelled** narrative on top | BUILT + VERIFIED |

**The permanent project-state contract is now in force** (`.clinerules/project-state-contract.md`),
`PROJECT_STATUS.md` carries the mandatory **CURRENT PLATFORM POSITION** block and a **numbered CURRENT
REMAINING ROADMAP**, and a real five-source disagreement was found and fixed: sprint 2's registry
reconciliation script had been committed but **never executed**, so the registry was still at **243**
entries while the docs claimed **250**. Running it and adding this sprint's rows brings the registry to
**257** and the five sources into agreement.

## 2. Starting checkpoint

- Branch `redesign/foundation`, HEAD `19be002c4b3d6a64020b4740879c56ef1550e628`, protected baseline
  `959b4d2` an ancestor. Working tree intentionally dirty (pre-existing modifications to
  `HANDOFF.md`, `PROJECT_STATUS.md`, `Review Zip/mercenta-review.zip`; the four untracked protected
  `design/*.png`; the stray 0-byte `ave1-check.mjs`).
- **Reconciled first (nothing rebuilt):** `PROJECT_STATUS.md`, `HANDOFF.md`,
  `requirements-registry.json` (the Master Matrix — 243 entries), the latest sprint report
  (`docs/SPRINT_DETERMINISTIC_COMPLETION_2026-09-19.md`), `.clinerules/*`, `git status`, `git log`,
  and the actual modules (work layer, reminder runner, commandCentre, automation, acquisition,
  intelligence, cost/model policy, integration simulation-safety, workspace primitives, AdminShell).
- **Confirmed present and left untouched:** the work/task/calendar operating layer, the reminder
  runner, the canonical 20-brand universe, RBAC + tenant isolation, the Amazon operational simulation,
  the compliance gate, the PO workflow, fulfilment/returns, finance, the integration registry and
  simulation safety, the UI/UX Wave 1/2 architecture, the validator suite, the homepage.

## 3. Scope

In scope: the five Founder Operating System capabilities; the automation architecture; the free-first
rule as implemented engineering; AI optionality and degradation; the Control Centre; the acquisition
lifecycle; the BI findings layer; tests, validators and browser verification; the Master Matrix; and
the permanent project-state contract.

Explicitly **out of scope** (unchanged, no silent deferral): deploy; Rakazo; Supabase/D1/Cloudflare
migration; n8n or any external workflow platform; any live provider activation or credential; any
protected design asset; any styling/visual change; any rewrite of the existing work layer.

## 4. Architecture decisions

1. **One automation substrate, not five.** The registry, run ledger, idempotency keys, failure/retry
   state, approval gate and scheduler seam live in ONE module that every capability consumes.
2. **No timer is the source of truth.** Automation is explicitly invoked (operator control today, the
   declared seam later). A `setInterval` in the SPA was evaluated and REJECTED: business state must
   not depend on a tab being open, and it is neither testable nor auditable.
3. **The work layer is the only task system.** Automation RAISES work through the canonical
   derivations; the Control Centre READS them; no second task store was created.
4. **Facts are deterministic; AI is a narrative layer.** `src/lib/founder/briefFacts.ts` computes every
   fact locally (it takes automation health as an injected argument so the registry and the brief
   cannot form an import cycle). The AI layer may only rephrase those same facts.
5. **Ask Mercenta is a deterministic intent router first.** Seven declared intents answered from
   canonical records with citations; anything else is refused with a list of what CAN be answered.
6. **A prospect is never silently a brand.** The acquisition engine derives a `brandId` only from a
   COMPLETED canonical onboarding record.
7. **Internal intelligence is labelled and strippable.** Every BI finding declares its basis and
   `internalOnly`; `brandSafeFindings()` is the single strip point.
8. **Checkpoint commit deliberately NOT created** — the project's `protection-rules.md` forbids
   committing without an explicit instruction, and the task allowed but did not require one. The
   working tree is the deliverable; the exact file list is in §8.

## 5. Automation decisions (Capability A)

The catalogue is declared ONCE (`AUTOMATION_REGISTRY`) with cadence, entry point, scope,
deterministic/AI/provider flags, the idempotency-key shape and a **free-first cost note** per row:

| # | Automation | Cadence | Domain | Notes |
|---|---|---|---|---|
| 1 | `work_projection` | every invocation / on canonical change | operations | projects the open work set out of canonical records |
| 2 | `reminder_sweep` | daily + on demand | operations | delegates to the canonical reminder runner |
| 3 | `overdue_escalation` | daily | operations | escalates critical/high overdue work once per item per day |
| 4 | `compliance_gate_monitor` | daily | compliance | blocking + expiring documents; the gate is never bypassed |
| 5 | `finance_overdue_monitor` | daily | finance | invoices past declared terms; deductions past the dispute window |
| 6 | `acquisition_followup_monitor` | daily | acquisition | follow-up cadence; prospects are never converted to brands |
| 7 | `commission_review` | daily | finance | **approval gate** — above the declared threshold it STOPS for a human |
| 8 | `founder_brief` | daily (morning) | intelligence | composes the deterministic brief |

Run-ledger semantics (all asserted by the validator and re-driven in Chromium):

- **Deterministic ids**: `run-<automationId>-<sequence>`; run date = the pinned demo clock.
- **Idempotent**: key `<automationId>|<date>|<inputDigest>` where the digest is a pure hash of the
  canonical records the automation reads. An identical re-run does not execute the implementation and
  is reported `duplicate_suppressed` — no duplicate work, event or notification.
- **Failure is honest and observable**: a failed run carries the real error, emits a canonical
  `automation_run_failed` event and is retryable. `simulateAutomationFailure()` makes failure and
  recovery deterministically demonstrable (labelled simulation, audited).
- **Disable is attributed and audited**, requires a reason, and produces ZERO side effects.
- **Approval gate**: a consequential decision stops at `blocked_approval`, records a pending approval
  (emitting `automation_approval_required`) and never executes the irreversible action. Only an
  attributed human decision clears it.
- **Declared next-run** = last run + the declared cadence.

## 6. Free-first cost decisions

`describeAutomationScheduler()` records the decision, the cost and the rejected alternatives so a
future session cannot quietly introduce a paid workflow platform:

| Option | Cost | Verdict |
|---|---|---|
| `setInterval` in the SPA | $0 | **REJECTED** — state would depend on an open tab; not testable or auditable |
| **Explicit invocation + declared cadence (chosen)** | **$0** | **CHOSEN** — no new dependency, no timer, deterministic, auditable |
| n8n (self-hosted or cloud) | service to run / paid tier | **REJECTED as a global dependency** — would make an optional platform the single point of failure |
| Cloudflare Workers cron | $0 (free tier) | **DEFERRED** — legitimate, but an infrastructure migration that is parked |
| GitHub Actions schedule | $0 (free tier) | **DEFERRED** — viable future trigger, same entry points |
| Supabase `pg_cron` | $0 (existing infrastructure) | **PREFERRED FUTURE TRIGGER** — a wiring change only, because the seam is declared |

**New external dependencies introduced by this sprint: ZERO.** AI uses the existing free-only runtime
policy (`src/lib/costs/modelPolicy.ts`) with two new declared tasks, both `freeModelSufficient: true`.


## 7. Capabilities implemented

### A. Autonomous / scheduled operations
`src/lib/automation/registry.ts` (1,219 lines) — the declared catalogue, the deterministic
implementations, the run ledger, enable/disable, failure simulation, approvals, health/summary read
models, the scheduler seam and the optional-dependency degradation table. Three canonical event types
were added (`automation_run_failed`, `automation_approval_required`, `work_escalated`).

### B. Founder / Super Admin Control Centre
`src/lib/commandCentre/controlCentre.ts` (358) derives the nine-view model from canonical records;
`src/components/admin/FounderControlCentre.tsx` (751) renders it as an operating workspace with a
sticky toolbar (nine tabs + "Run all automations"), a metric band whose every tile drills into an
EXISTING destination, the acquisition pipeline, queues, the automation catalogue (run / retry /
disable / simulate failure / clear / last-run drawer), approvals, the optional-dependency panel, the
founder brief, Ask Mercenta, the audit feed and a context rail carrying data provenance.

### C. Brand acquisition / outreach engine
`src/lib/acquisition/acquisitionEngine.ts` (417) — the eleven stages, deterministic derivation from
canonical records, dedup on `normalizeBrandKey`, owner/next-action/follow-up state, stage counts,
attention list and the conversion guard.

### D. Brand Intelligence expansion
`src/lib/intelligence/intelligenceLayer.ts` (473) — seven domains, four bases, citations, declared
thresholds with the observed value, the approved-category gate finding, and the brand-safe strip.

### E. Founder Ops AI
`src/lib/founder/briefFacts.ts` (328) computes the deterministic brief; `src/lib/ai/founderAiClient.ts`
(265) is the mock-first/real seam with a server-side credential seam and free-only authorisation;
`src/lib/ai/founderOpsAi.ts` (312) composes the brief and routes Ask Mercenta.

## 8. Files / components changed

**New (12):** `src/lib/automation/registry.ts` · `src/lib/ai/founderAiClient.ts` ·
`src/lib/ai/founderOpsAi.ts` · `src/lib/acquisition/acquisitionEngine.ts` ·
`src/lib/intelligence/intelligenceLayer.ts` · `src/lib/commandCentre/controlCentre.ts` ·
`src/lib/founder/briefFacts.ts` · `src/components/admin/FounderControlCentre.tsx` ·
`scripts/validate-founder-operating-system.mjs` · `scripts/reconcile-founder-os-registry.cjs` ·
`e2e/founder-operating-system.spec.ts` · `.clinerules/project-state-contract.md`
(4,877 lines including the sprint report's siblings).

**Modified (10):** `src/lib/events/types.ts` (three event types) · `src/lib/costs/modelPolicy.ts` (two
runtime tasks) · `src/lib/work/useWork.ts` (`useWorkVersion`) ·
`src/components/layout/AdminShell.tsx` (nav item, RBAC hide, render guard, breadcrumb) ·
`scripts/validate-uiux-redesign.mjs` (Founder OS workspace assertions) ·
`scripts/validate-e6-brand-surfaces.mjs` (`SPRINT_FOUNDER_OS_SCOPE`) ·
`scripts/validate-e7-embedded-social.mjs` (`SPRINT_FOUNDER_OS_DECLARED`) ·
`scripts/lint-wording.mjs` (one internal-only exclusion, justified in-file) ·
`requirements-registry.json` (243 → 257) · `PROJECT_STATUS.md` + `HANDOFF.md` (project state).

**Not touched:** every protected `design/*.png`, `ave1-check.mjs`, `src/data/demoData.ts`, the work
layer's derivations, the brand shells, `src/lib/work/workStore.ts`'s behaviour, and all styling.

## 9. Data / model changes

- Three canonical event types added to `EventType` + `EVENT_SEVERITY_MAP` (all `important`).
- Two runtime AI tasks declared in the free-only model policy.
- New read models: automation health/summary/runs/approvals/dependencies/scheduler; the Control Centre
  model; the acquisition record/stage model; the intelligence finding model; the brief facts model.
- **No database migration, no schema change, no seed change, no new store of record.**

## 10. UI/UX changes

- ONE new surface (`FounderControlCentre`) composed entirely from the existing workspace primitives
  (WorkspaceFrame · WorkspaceHeader · sticky toolbar · MetricBand · PipelineTrack · Queue ·
  RecordDrawer · ContextPanel · ActivityFeed · SegmentedControl). No new visual language, no new
  colour, no bespoke page composition, no change to any existing surface's styling.
- ONE nav item ("Control Centre") in the existing Overview section, hidden for non-Super-Admin tiers.
- Asserted by `validate-uiux-redesign.mjs` (13 new assertions; 357 PASS / 0 FAIL, was 344).


## 11. Security / RBAC changes

- The Control Centre is **Super-Admin only**: removed from the nav for every other tier
  (`HIDDEN_FOR_NON_SUPER`) AND guarded again at render (`isSuper ? … : <AccessDenied />`).
- No brand session can reach the acquisition pipeline, the automation administration, the internal
  scoring/tiering or the AI governance view.
- **No secret is ever read from a `VITE_*` variable.** The real AI client takes its credential from
  `serverCredentialSeam()`, which resolves to `null` in this build — so no model call is possible here
  and the deterministic client is used. No credential was added, read, activated or committed.
- The automation layer cannot bypass tenant isolation: implementations read through
  `getWorkItems(scope, tenantId)`, the ONE tenant filter.
- The BI layer's `brandSafeFindings()` is the single strip point for internal-only findings.

## 12. Tests and verification (real output, this session)

| Gate | Result |
|---|---|
| `npx tsc --noEmit -p tsconfig.app.json` | **0 errors** (exit 0) |
| `npx eslint .` | **0 problems** |
| `npm run build` | **PASS — built in 4.33s** |
| `npm run validate:wording` | **PASS — 248 src files, 0 outward-facing violations** |
| `node scripts/integrity-audit.mjs` | **61 PASSED / 0 FAILED — 100%** |
| `node scripts/validate-founder-operating-system.mjs` | **90 assertions, 0 failures, 0 network calls** |
| `node scripts/validate-uiux-redesign.mjs` | **357 PASS / 0 FAIL** (was 344) |
| `node scripts/validate-e7-embedded-social.mjs` | **121 assertions, 0 failures** |
| Validator sweep (78 validators) | **77 PASS / 1 FAIL** — the only failure is the pre-existing `validate-e6-brand-surfaces` F5/F5b/F6 on the **unchanged 5 offenders** (`ave1-check.mjs` + the four protected `design/*.png`) |
| `node scripts/verify-registry.mjs` | **exit 0** · 257 entries · **issues 124 (baseline) · reachability 15 (baseline) — ZERO new** |
| Targeted Playwright (`founder-operating-system` + `work-layer` + `command-centre` + `multi-tenant`) | **26 passed / 0 failed** |
| **FULL Playwright suite** (`npx playwright test --workers=2`) | **356 passed / 0 failed / 2 skipped (358 collected, 14.9m)** — sprint 2 was 351/0/2 |
| NEW `e2e/founder-operating-system.spec.ts` | **5/5 PASS in real Chromium** (re-run after adding the page-error guard: still 5/5) |

`validate-founder-operating-system.mjs` covers, at runtime (SSR-loaded modules, `fetch` patched to
fail any network call):

- catalogue completeness · no timer · no `Math.random` · no `Date.now`-derived ids (comment-stripped
  source check);
- deterministic run ids; a second identical run is `duplicate_suppressed` with **no extra audit row**;
- repeated reminder sweep and overdue escalation cannot double-raise;
- injected failure → `failed` with the real error + simulated flag + no fake success → **retry
  recovers it**; `retryAutomation` refuses a run that did not fail;
- disable → `skipped_disabled` with zero side effects, audited; re-enable restores; a state change
  without a reason is refused;
- approval gate (or an honest "no commission exceeds the threshold" when none does);
- AI: truthful `deterministic_only` state, no paid fallback, server-side seam, deterministic brief,
  intent routing, citations, refusal for an unanswerable question, **AI cannot create work or audit
  rows**, **0 network calls**;
- acquisition: eleven stages, exactly one stage per record, owner/next-action/destination present,
  prospect ≠ brand, conversion guard explains itself, dedup key normalised, determinism;
- BI: basis + label on every finding, citations, threshold + observed value, the approved-category gate
  finding appears exactly when an unapproved category exists, brand-safe strip;
- Control Centre: nine views, every metric has a drill-down, real brand/work/automation figures,
  truthful AI state, declared scheduler seam, no optional dependency required for core operations,
  unsafe provider never reported simulation-safe;
- tenant isolation (brand scope filtered, Brand B sees none of Brand A) and the shell guard;
- **reset → re-run produces an identical result** (deterministic repeatability).

## 13. Failure / degradation testing (explicit results)

| Scenario | Result |
|---|---|
| **AI unavailable** | PASS — brief and Ask Mercenta still answer from canonical records; narrative labelled `deterministic`, model `null`, no network call; the surface states "No AI credential is configured" |
| **External automation provider unavailable** | PASS — the run fails honestly with the real error, emits `automation_run_failed`, is visible in the Control Centre and is safely retryable |
| **Optional provider unknown/unregistered** | PASS — `isProviderSimulationSafe` only accepts a POSITIVE `simulation`; every other mode is reported as-is and never as simulation |
| **Retry** | PASS — a failed run retried succeeds, is attributed (`retryOf`, `attempt: 2`), and a non-failed run cannot be "retried" |
| **Idempotency** | PASS — identical input is suppressed with zero side effects and no duplicate audit row |
| **Disabled automation** | PASS — `skipped_disabled`, zero side effects, audited with a reason |
| **Approval gate** | PASS — `blocked_approval` until an attributed human decision; no irreversible action is taken |
| **Simulation** | PASS — deterministic, resettable, repeatable; `simulateAutomationFailure` is labelled and audited; zero live provider calls in every gate and every browser test |
| **Tenant isolation** | PASS — brand work filtered to its tenant; Brand B sees none of Brand A; the Control Centre is Super-Admin only |


## 14. External dependency audit

| Dependency | Introduced here? | Cost | Self-hosted | Could an existing mechanism replace it? | Failure mode | Fallback | Lock-in |
|---|---|---|---|---|---|---|---|
| None | — | $0 | — | — | — | — | — |

**Zero new dependencies.** The automation layer is in-process TypeScript; the AI layer uses the
existing free-only runtime policy and the existing OpenRouter integration card (mode `available`,
i.e. NOT simulation-safe and NOT live → the deterministic client is used). The scheduler seam
deliberately prefers an already-provisioned mechanism (Supabase `pg_cron`) when a trigger is wired.

## 15. Master Matrix changes

`requirements-registry.json` — **243 → 257 entries** (`_meta.total_entries` synced, `last_updated`
2026-09-19):

- **Sprint 2's committed-but-never-executed reconciliation was run** (`scripts/reconcile-sprint2-registry.cjs`):
  243 → 250, including `uiux-wave2-core-surfaces-remaining` → `built_and_tested` with its evidence
  trail and `_audit_note`. This is the fix for the five-source disagreement.
- **7 new rows** (`scripts/reconcile-founder-os-registry.cjs`):
  `founder-os-automation-registry` · `founder-os-control-centre` · `founder-os-acquisition-engine` ·
  `founder-os-bi-findings-layer` · `founder-os-founder-ops-ai` ·
  `founder-os-failure-degradation-verification` (all `built_and_tested`) ·
  `founder-os-project-state-contract` (`built` — documentation/rule infrastructure, verified by the
  registry validator rather than a browser journey; recorded honestly rather than overstated).
- No historical entry was deleted, renamed or duplicated; no completed row was marked incomplete.
- `_meta.founder_os_sprint` records what was added and why.

## 16. Documentation changes

- **NEW** `.clinerules/project-state-contract.md` — the permanent contract (five synchronised sources,
  the mandatory CURRENT PLATFORM POSITION block, the mandatory numbered roadmap, reconciliation before
  completion).
- **NEW** this sprint report.
- `PROJECT_STATUS.md` — new top block + the mandatory **CURRENT PLATFORM POSITION** (nine numbered
  sections) and the **numbered CURRENT REMAINING ROADMAP**.
- `HANDOFF.md` — new top block (state, what was built, what is left, the next prompt).
- No historical report was rewritten; `docs/SPRINT_DETERMINISTIC_COMPLETION_2026-09-19.md` and
  `docs/SPRINT_WORK_LAYER_2026-09-19.md` are retained verbatim.

## 17. Known exceptions

1. **`validate-e6-brand-surfaces` F5/F5b/F6** fail on the **unchanged 5 pre-existing offenders**
   (`ave1-check.mjs` + the four protected `design/*.png`). Not a product defect; the protected assets
   were not modified, renamed or added to git, and this sprint's files are declared in
   `SPRINT_FOUNDER_OS_SCOPE` (the guard's mechanism is unchanged — a file outside EVERY declared set is
   still refused).
2. **`layout-audit.mjs`** — the pre-existing undefined `text-brass-200` class in
   `AcquisitionWorkflow.tsx` remains (fixing it would change styling, which is forbidden).
3. **`scripts/lint-wording.mjs`** now excludes ONE internal-only file
   (`src/lib/intelligence/intelligenceLayer.ts`) with an in-file justification, following the existing
   `prospectIntelligence.ts` precedent. The gate itself is unchanged and still scans 248 files with 0
   violations; every outward-facing surface remains fully linted.

## 18. Deferred work (explicitly parked)

1. Wiring a real scheduled trigger to the declared seam (preferred: Supabase `pg_cron`; Cloudflare
   cron / GitHub Actions also evaluated) — parked with the infrastructure migration.
2. Activating any live provider (AI/OpenRouter, email, outreach, register, carriers, payouts, Xero,
   Amazon SP-API/Ads) — documented credential steps, not missing functionality.
3. Brand-facing use of the BI findings layer (the brand-safe projection exists and is tested; no brand
   surface consumes it yet).
4. Extending `retryAutomation` into a bulk "retry all failed" control.
5. **`workstreamBD-seed-expansion-deferred`** — the Master Matrix's only `not_started` row: seed
   expansion (Step D) was **deferred by owner decision (2026-09-17)** so that no brand or product is
   invented to pad category coverage. Correctly parked, not current-scope work.
6. **`batchC-rocketchat-integration` and `batchD-model-router`** — the Matrix's two `regressed` rows:
   both are **historical removals** (Rocket.Chat in Phase D1 2026-09-11; the model-routing proxy on
   2026-08-31 at the owner's request), retained as history rather than deleted.

## 19. Blocked work

1. Nothing in this sprint was blocked. Every capability was built against canonical/simulated state
   with no external dependency.


## 20. CURRENT REMAINING ROADMAP

1. **Founder Operating System — automation scheduling trigger** (deferred; the seam is declared and
   tested, only the trigger is unwired).
2. **Founder Operating System — brand-facing BI consumption** (the brand-safe projection exists; no
   brand surface consumes it yet).
3. **Automation bulk retry control** (single-run retry is built and tested).
4. **Live provider activation** (AI/OpenRouter, email, outreach, Companies House, carriers, payouts,
   Xero, Amazon SP-API/Ads) — credential steps only.
5. **Rakazo** — unchanged, out of scope.
6. **Supabase / Cloudflare / D1 migration** — parked.
7. **Deploy to demo.mercenta.co.uk** — only on an explicit instruction.
8. **Google / HMRC / social OAuth live flows** — credential steps only.
9. **Social Media workstream** — unchanged.
10. **Jev / Monid work** — unchanged.

## 21. Exact next execution scope

The next session should either (a) wire the declared scheduler trigger (item 1 above) — a wiring change
only, since `describeAutomationScheduler()` and the idempotent run ledger already exist — or (b) begin
the live provider activation playbook from `PRODUCTION_READINESS.md`/`GO_LIVE.md`. Both are documented
credential/infrastructure steps, not missing functionality. No Founder Operating System capability is
incomplete.

## 22. Ending checkpoint

- Branch `redesign/foundation`, **HEAD still `19be002c4b3d6a64020b4740879c56ef1550e628`**.
- **No git mutation of any kind** this sprint: no commit, no stage, no stash, no reset, no clean, no
  checkout, no amend, no branch switch, no force-push, no history rewrite.
- The sprint's work is present in the working tree (12 new files, 10 modified — §8) alongside the
  pre-existing dirty state from earlier sessions.
- Protected baseline `959b4d2` still an ancestor. No deploy. No credential. No live provider call. No
  protected design asset touched, renamed or added to git.

