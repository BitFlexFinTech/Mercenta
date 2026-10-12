# UNIFIED PLATFORM GAP ANALYSIS + FOUNDATION WORKSTREAM — 2026-09-20

> Repository-grounded discovery report for the approved six-investigation
> workstream (A prospective-brand/outbound · B agent/automation · C evaluation/
> regression/production-trace · D visual redesign · E SEO/AI-search ·
> F intelligent-decision seam) plus the two reconciliation investigations
> (G Brand Support / retail-channel proxy · H LOA / onboarding authority).
>
> **Method.** Every finding below was produced by reading the actual repository at
> the stated HEAD, never inferred from the brief. Classification uses the required
> vocabulary. Where the repository does not support a claim the row says
> **UNKNOWN** rather than guessing.
>
> **Repository state at inspection.** Branch `redesign/foundation`; HEAD
> `19be002c4b3d6a64020b4740879c56ef1550e628`; protected baseline `959b4d2`
> confirmed an ancestor. The working tree was intentionally dirty from earlier
> sessions and was preserved, never reset/cleaned/discarded. **No commit was
> created in this increment** (the working tree carries the earlier uncommitted
> Founder work, which must not be swept into an unauthorised commit).
> **No `.env` was read, no credential added/activated, no live provider call, no
> deploy, no destructive git operation.**

## 0. What the platform ALREADY is (the canonical map)

| Layer | Canonical location | What it is |
|---|---|---|
| Business model | `docs/MERCENTA_BUSINESS_MODEL.md`, `.clinerules/mercenta-business-model.md` | Mercenta operates the retail-channel (Vendor Central) account; brands work through Mercenta |
| Domain types | `src/types.ts` (3,809 lines) | ONE types file: entities, enums, `APPROVED_CATEGORIES` |
| Demo/canonical stores | `src/data/*` (25 modules) | `demoStore`, `prospectStore`, `acquisitionStore`, `routingStore`, `commercialReadinessStore`, `companyStore`, `launchStore`, `preAuditStore`, `applicationStore`, `knowledgeBase` |
| Domain port | `src/data/domainRepository.ts` | Persistence seam over the canonical stores |
| Integration seams | `src/integrations/*` + 18 registered providers | mock/real adapters; fail-closed provider modes |
| Automation | `src/lib/automation/registry.ts` (9 automations) | the ONE declaration of what is automated |
| Work layer | `src/lib/work/*` | work items + derived calendar + deterministic reminder runner |
| Routing | `src/config/routing.ts` + `src/lib/routing/gateways.ts` | exclusive/parallel/inclusive gateways, fail-closed refusals |
| Money | `src/lib/finance/*`, `src/config/{commercialModel,payouts,vat,shipping}.ts` | two commercial models, payout gates, VAT separation |
| Support/cases | `src/lib/helpdesk/*` + `src/components/brand/BrandSupport.tsx` | Brand Support → Mercenta review → retail-channel escalation seam |
| Events + audit | `src/lib/events/eventFeed.ts`, `demoAuditLog` | ONE event feed, ONE audit log |
| Public web | `src/components/marketing/*` (8 public pages) | marketing pages + the Explore UK Market Fit assessment |
| Verification | 121 `scripts/validate-*.mjs` + 66 Playwright specs | the evidence system |

**This report adds no new system.** Every change it proposes reuses one of the
rows above.

## 1. Investigation A — THE EXISTING PROSPECTIVE-BRAND / OUTBOUND SYSTEM

### A.1 Identification (the brief's explicit requirement)

The canonical Mercenta prospective-brand acquisition system is **not** called
"Acquisition Engine" in the UI and it is **not** a single module. It is a
**four-part canonical chain**, each part already existing:

| Part | Canonical name (repository) | Location |
|---|---|---|
| Discovery + intelligence | **Brand Intelligence (BI)** — "the authoritative real-data discovery and intelligence engine for real prospective partner brands" | `src/lib/intelligence/*` (`brandIntelligenceClient`, `scoringEngine`, `prospectPipeline`, `prospectIntelligence`, `prospectLifecycle`, `discoveryClient`, `opportunityDiscovery`, `acquisitionStrategy`, `outreachGenerator`), `src/data/prospectStore.ts`, `src/data/{brandProspectSeed,brandExtraSeed}.ts` |
| Lifecycle projection | **Brand Acquisition / Outreach Engine** | `src/lib/acquisition/acquisitionEngine.ts` (11 declared stages), `outreachLifecycle.ts`, `outreachSender.ts` |
| ICP / leads pipeline | **Marketing Hub** + the ICP layer | `src/components/admin/MarketingHub.tsx`, `src/lib/marketing.ts`, `src/integrations/leadSourcing.ts` |
| Public entry | **Explore UK Market Fit** (pre-audit) | `src/components/marketing/ExploreUkMarketFit.tsx`, `src/lib/preaudit/*` |

**Surfaces that already render it:** `BrandIntelligencePanel`,
`BrandIntelligenceStrategyPanel`, `AcquisitionPipeline`, `AcquisitionWorkflow`,
`AcquisitionRelationships`, `ProspectDetailPanel`, `ProspectDetailTabs`,
`RetailPipeline`, `MarketingHub`, plus the Control Centre's acquisition view.


### A.2 Six-layer gap analysis against the external research

The external research is reference material for identifying capability gaps, NOT
authority to invent product behaviour. None of its numerical claims, vendor
tactics (aged accounts, mailbox farms, warm-up, IP tactics, volume targets) or
tooling are adopted.

| Layer | What the research requires | What Mercenta ALREADY has (evidence) | Classification | Treatment |
|---|---|---|---|---|
| **BOUNDARY** | revenue floor, exact function, trigger, disqualifiers, TAM sufficiency, ICP variations, proof point, segment/message fit | Declared ICP with approved-category gate + regions (`src/lib/marketing.ts` `ICP`, `isValidICP`); deterministic 7-dimension scoring + hard disqualification (`src/lib/intelligence/scoringEngine.ts`; the seed carries 2 hard-disqualified prospects); declared source markets + Strategy A/B (`acquisitionStrategy.ts`, `RegionalPriorityPanel`); proof-point/evidence layer with basis labels and citations (`intelligenceLayer.ts`, `collectEvidence`) | **ALREADY CORRECT** for disqualifiers, category gate, ICP regions, evidence basis | None. Do not rebuild |
| | an explicit **revenue floor** | No revenue floor is declared anywhere in the acquisition path | **MISSING — IMPLEMENT LATER** | It disqualifies real brands, so the value is a Founder commercial decision and must live in ONE config as a declared rule. Not invented here |
| | **TAM sufficiency** | Present as an internal assessment dimension (`ukMarketFitEngine.ts`); the outward TAM/SAM block was deliberately removed by UI/UX Wave 2 and its absence is asserted by `scripts/validate-uiux-redesign.mjs` | **ALREADY PARTIAL** | Keep the internal dimension; do NOT reintroduce an outward TAM claim (that removal was an approved correction) |
| **LIST / SOURCING** | broad source discovery | `discoveryClient` + `supabase/functions/discovery-directory` (deterministic mock pool; live only when `DIRECTORY_FETCH=enabled`), `opportunityDiscovery.ts` (8 verticals, category-mapped), `OpportunityDiscoveryPanel` | **ALREADY CORRECT** | None |
| | qualification **before** enrichment | ICP fit scoring gates outreach (`FIT_THRESHOLD_PLACEHOLDER`, `scoreLeadFit`); BI scoring is deterministic and local | **ALREADY CORRECT** | None |
| | buying signals + **trigger/date provenance** | Prospect evidence/provenance exists (`intelligenceProvenance`, evidence sources/URLs, snapshot dates); lifecycle events are timestamped | **ALREADY PARTIAL** | There is no single "buying signal" entity with an observed-at date; adding one without a real signal source would invent product behaviour. Deferred |
| | **50-record qualification/testing methodology** + sample records | Not present. The canonical universe is 12 seeded prospects (10 active) — a demo universe, not a qualification sample | **DO NOT IMPLEMENT** as stated | The sample methodology presupposes live data volume. Manufacturing 50 fake qualification records would be fabricated evidence |
| | decision-maker discovery | `BrandProspect.contacts` (name, job title) rendered in `ProspectDetailTabs`; the outreach generator selects the contact | **ALREADY PARTIAL** | No verified-email/waterfall provider is connected (`Hunter.io` = not connected, `PRODUCTION_READINESS.md`). Activation is credential work, not code |
| | waterfall enrichment + verification + dedup | Dedup IS canonical (`normalizeBrandKey` + a conversion guard: "a prospect is NOT a brand"); enrichment is provider-gated and SKIPPED (never faked) when unavailable (`automationDependencies` declares Firecrawl/Companies House optional, not required) | **ALREADY PARTIAL** | A multi-provider waterfall is **MISSING — ARCHITECTURE NOW / ACTIVATION LATER**; the existing integration registry is the seam and needs no second one |
| **MESSAGE** | trigger, customer-language problem, comparable proof, small ask, variations, follow-up structure, version tracking | `outreachGenerator.ts` composes "why we noticed you" + market evidence + the small ask ("testing a small number of proven ASINs"); `generateFollowUp(p, day)` declares follow-up days 3/7/14/30; outreach records carry `status`/`sequenceDay` and revisions are retained on the prospect timeline (`outreachLifecycle.ts`) | **ALREADY CORRECT** for structure, follow-up cadence and revision tracking | None |
| | **message variations** (A/B copy per prospect) | One canonical copy per channel per prospect (email + LinkedIn + follow-ups). No declared variant set | **MISSING — IMPLEMENT LATER** | Variants are only meaningful with measurement (A.3). Implementing them without a measurement substrate produces untracked copy drift |
| **ROUTING** | reply routing, response SLA, named owner, qualification before meeting, human handling of interested responses, signal/message/reply handoff | The single response path is `outreachLifecycle.ts → routeInboundReply` + `classifyInboundReply` (`src/lib/marketing.ts`): a hot reply is flagged `requiresHuman`, persisted, linked to the canonical conversation and raised as the ONLY real-time notification; the acquisition engine derives owner + next action + follow-up state per prospect; the handoff is to Brand CRM (`AcquisitionRelationships`, `getRelationshipContext`) | **ALREADY CORRECT** for routing, human handoff, named owner, qualification-before-meeting | None — this is the strongest layer |
| | **declared response SLA** | No SLA constant exists in the acquisition path (the SLA-shaped constants that do exist are operational: `OUTREACH_FOLLOW_UP_DAYS`, `INVOICE_TERM_DAYS`, the deduction dispute window) | **MISSING — IMPLEMENT LATER** | A response target is an unowned commitment until the Founder sets it. Recorded as a Founder decision, not built |
| **MEASUREMENT** | reply rate, positive reply, meeting, show, close, segment-level reporting, placement/list/copy diagnosis, experiment/version tracking, one-variable-at-a-time testing | `acquisitionEngine` derives per-prospect stage, response count and pipeline totals (`AcquisitionPipelineSummary`: total · active · activatedBrands · followUpsOverdue · awaitingApproval · duplicates); `prospectLifecycle` records lifecycle events; the Control Centre derives acquisition figures | **ALREADY PARTIAL** | Conversion **rates** and segment-level reporting are genuinely absent. See A.3 |

### A.3 The one justified gap in the outbound system

**Finding A-1 — no conversion measurement, so no placement/list/copy diagnosis.**
`acquisitionPipeline()` reports COUNTS (totals, per-stage, follow-ups overdue),
but nothing in the repository derives a **rate** (reply rate, positive-reply rate,
meeting rate, close rate) and nothing aggregates by segment (category, region,
source, owner, message version). Without rates, the research's "diagnose the
placement, the list or the copy" step is impossible and every outreach decision
stays anecdotal.

- **Classification:** MISSING — IMPLEMENT LATER (recorded here; not built because
  the definitions of "reply", "positive" and "meeting" must be agreed AND
  `classifyInboundReply` already distinguishes intent, so the substrate exists —
  the correct implementation reuses it and adds NO new state).
- **Risk of building it now:** a second, parallel definition of "positive reply"
  would contradict the canonical classifier.
- **Verification requirement:** a validator deriving the rates from the seeded
  outreach/responses whose denominator is the canonical sent count.

**Explicitly NOT implemented from the research (with reasons):** aged LinkedIn
accounts, mailbox farms, warm-up/IP tactics, mass outbound infrastructure, volume
targets and any author-specific vendor tactic — external operating tactics with
legal/deliverability consequences, not Mercenta product requirements. Also not
implemented: a second acquisition engine. The canonical chain already exists and
is pinned by `scripts/validate-acquisition-pipeline.mjs`,
`validate-prospect-pipeline.mjs`, `validate-outreach-provider-hardening.mjs`,
`e2e/acquisition-pipeline.spec.ts` and `e2e/workstream-b-intelligence.spec.ts`.


## 2. Investigation B — AGENT / AUTOMATION INVENTORY (required subtask)

**The system exists and is canonical:** `src/lib/automation/registry.ts` — "the ONE
place that declares what automation exists, what it does, when it last ran, whether
it succeeded, what it affected, whether it is disabled and why, and how it can be
safely retried". **No new agent system was designed or added.**

### B.1 The nine declared automations (verified by reading the registry)

| # | Canonical name | Purpose | Trigger | Inputs | Outputs | External actions possible | Human gate | Status |
|---|---|---|---|---|---|---|---|---|
| 1 | `work_projection` | Projects every open unit of work out of canonical records with deterministic ids + declared deadlines | explicit invocation / state change | work store, all canonical stores | work items (read model) | none | no | ALREADY CORRECT |
| 2 | `reminder_sweep` | Escalates an item past a declared deadline boundary into a reminder; stops the moment the item resolves | explicit invocation (daily by convention) | work store (`reminderRunner`) | reminder events | none | no | ALREADY CORRECT |
| 3 | `overdue_escalation` | Escalates critical/high work past deadline to the founder — once per item per day | explicit invocation | work store | event + audit row | none | no | ALREADY CORRECT |
| 4 | `compliance_gate_monitor` | Reports every blocking/expiring compliance state; NEVER bypasses the gate | explicit invocation | compliance docs | findings + events | none | no | ALREADY CORRECT |
| 5 | `finance_overdue_monitor` | Reports genuinely overdue invoices/deductions against declared terms/windows | explicit invocation | invoices, payments, deductions | findings + events | none | no | ALREADY CORRECT |
| 6 | `acquisition_followup_monitor` | Reports contacted prospects whose follow-up cadence elapsed; never converts a prospect into a brand | explicit invocation | prospect store | findings + owner/next action | none | no | ALREADY CORRECT |
| 7 | `commission_review` | Evaluates accrued commission vs the auto-approve threshold; above it STOPS at a founder approval gate | explicit invocation | POs, `autoApprove` | `blocked_approval` + pending approval | **money-adjacent, but never releases money** | **YES — approvalRequired: true** | ALREADY CORRECT |
| 8 | `commercial_readiness_monitor` | Re-evaluates the declared commercial conditions over the readiness records | explicit invocation | commercialReadinessStore | findings + events | none | no | ALREADY CORRECT |
| 9 | `founder_brief` | Composes the founder briefing from canonical state (facts local; AI may add narrative) | explicit invocation | all of the above | brief | none | no | ALREADY CORRECT |

### B.2 Safety controls — implemented vs the required principles

| Principle | Reality in the repository | Classification |
|---|---|---|
| deny-by-default for irreversible actions | No automation performs an irreversible action; `commission_review` is the only consequential one and it stops at `blocked_approval` | **ALREADY CORRECT** |
| explicit tool-risk classification | Every automation declares `deterministic`, `requiresAi`, `externalProviders`, `approvalRequired`, `tenantScoped`, `costNote` | **ALREADY CORRECT** |
| human gates for spend/deploy/delete/outbound communication | approval gate + payout approval gate (`src/lib/finance`, §7) + outreach send approval (`outreachLifecycle`) | **ALREADY CORRECT** |
| server-side enforcement rather than UI-only | the gate lives in `runAutomation` (domain), and the DB mirrors the compliance gate (trigger) | **ALREADY CORRECT** |
| **kill switch that actually prevents tool execution** | per-automation disable existed and was enforced (`skipped_disabled`, zero side effects). A **single global halt did not exist** | **MISSING — IMPLEMENTED NOW** (see §9) |
| capability/disable mechanism | `setAutomationEnabled(id, enabled, actor, reason)` — reason REQUIRED, audited | **ALREADY CORRECT** |
| timeout / retry / iteration limits | retry is explicit and refuses a non-failed run; implementations are pure in-process functions with no loops over external resources, so there is no unbounded iteration to bound. No wall-clock timeout is declared | **ALREADY CORRECT** for retry; **N/A** for timeout (documented, not invented) |
| cost/token/request budgets | `src/lib/costs/modelPolicy.ts` + `usageLog` (free-only runtime policy; a task needing more is REFUSED) | **ALREADY CORRECT** |
| safe stop states | `failed` / `degraded` / `blocked_approval` / `skipped_disabled` / `duplicate_suppressed` (+ new `skipped_halted`) with truthful notes | **ALREADY CORRECT** |
| audit trail + provenance | every run, approval, disable and failure is audited with actor + reason; failures emit a canonical event | **ALREADY CORRECT** |
| production trace capture + regression conversion | see §3 — the ledger exists; the trace→fixture pipeline does not | **MISSING — IMPLEMENT LATER** |
| synthetic edge-case fixtures | `src/lib/simulation/scenarioEngine.ts` (deterministic scenarios over the REAL stores), `investorDemo.ts` (25-stage lifecycle), `src/lib/preaudit/fixtures.ts` (6 labelled fixtures, presence classes A–F) | **ALREADY PARTIAL** (see §3) |
| tenant boundary / role boundary | `getWorkItems(scope, tenantId)`; the Control Centre is Super-Admin only (asserted by `e2e/founder-operating-system.spec.ts` test 5) | **ALREADY CORRECT** |
| simulation/mock behaviour | `simulateAutomationFailure` is explicitly labelled + audited and clearable; zero live provider calls in every gate and browser test | **ALREADY CORRECT** |
| tests | `scripts/validate-founder-operating-system.mjs` + `e2e/founder-operating-system.spec.ts` | **ALREADY CORRECT** (extended this increment) |

### B.3 Other automation paths in the repository (the full inventory)

| Path | Location | What it does | Automation status |
|---|---|---|---|
| Deterministic reminder runner | `src/lib/work/reminderRunner.ts` | the deadline-boundary sweep used by `reminder_sweep` | invoked by the registry, never a timer |
| Daily digest builder | `src/lib/automation/digest.ts` | batches non-urgent items (leads, replies, borderline scores, renewal window, overnight commissions, rejected submissions) | pure function; **no scheduler calls it in this build** (a cron migration exists: `supabase/migrations/025_cron_daily_digest.sql`) |
| Auto-approval thresholds | `src/lib/automation/autoApprove.ts` | commission auto-send below threshold; fulfilment-track auto-assignment outside the 55–74 band | pure rules, used by the registry |
| Fulfilment scoring bridge | `src/lib/automation/scoringBridge.ts` | borderline detection + track assignment | pure |
| Alert triage | `src/lib/monitoring/alertTriage.ts` | monitoring alert triage | pure; no autonomous external action |
| AI narrative layer | `src/lib/ai/founderAiClient.ts`, `founderOpsAi.ts` | OPTIONAL narrative over deterministic facts; single authorised egress; free-only; refuses without a credential | optional, never canonical |
| Event feed | `src/lib/events/eventFeed.ts` | the ONE canonical event stream consumed by digest + the external assistant | not an agent |
| Scenario engine | `src/lib/simulation/scenarioEngine.ts` | deterministic scenarios exercising the REAL stores | simulation-only, refuses a live provider |
| Edge functions | `supabase/functions/*` | deploy-time functions (`discovery-directory`, digest, webhooks) | none callable from the browser build; live only when explicitly enabled |
| **Rakazo** | `src/components/admin/RakazoPanel.tsx` (iframe) | external self-hosted surface; **no bots, prompts, tools or approvals exist in this repository** | **NOT part of the platform** (documented in `MERCENTA_PRODUCT_ARCHITECTURE_AUDIT_2026-09-10.md`); untouched, and **out of scope by instruction** |

**There is no autonomous outbound, no self-scheduled worker, no self-modifying
agent and no unbounded loop anywhere in the platform.** That is the correct
position and this increment did not change it.

## 3. Investigation C — EVALUATION / REGRESSION / PRODUCTION-TRACE ARCHITECTURE

### C.1 What already exists

| Capability | Where | Classification |
|---|---|---|
| canonical event trace | `src/lib/events/eventFeed.ts` + `src/lib/events/types.ts` (declared event union) | **ALREADY CORRECT** |
| audit trail | `demoAuditLog` (`AuditLogEntry`: actor, action, entityType, entityId, reason, metadata, createdAt) + DB `audit_log` with RLS hardening (`027_harden_audit_log_rls.sql`) | **ALREADY CORRECT** |
| run ledger | `AutomationRun` (id, status, actor, inputDigest, attempt, retryOf, evaluated/raised/escalated, affected ids, notes, error) | **ALREADY CORRECT** |
| decision provenance | `WorkflowRoutingDecision` + `RouteConditionEvaluation` (declared rule, observed value, expected, met, refusal reason) and `DocumentVerificationRecord` (document version, method, provider id, providerMode, verifier identity, evidence reference, simulated flag) | **ALREADY CORRECT** |
| model/version tracking | `src/lib/costs/usageLog.ts` + `modelPolicy` (task id, tier, model id, cost, outcome); AI output is labelled `ai_interpretation` | **ALREADY CORRECT** |
| human override records | `decideAutomationApproval` (decidedBy, decidedAt, decisionReason), `recordProviderCaseResponse`, admin override actions across PO/routing/compliance/shipment | **ALREADY CORRECT** |
| synthetic scenarios | `scenarioEngine.ts`, `investorDemo.ts`, `src/lib/preaudit/fixtures.ts`, `src/lib/preaudit/researchProvider.ts` (refuses rather than fabricating) | **ALREADY PARTIAL** |
| regression fixtures | 121 `scripts/validate-*.mjs` validators with in-script fixtures; 66 Playwright specs; tracked screenshots | **ALREADY CORRECT** |
| error traces | `src/lib/monitoring/sentry.ts` (initialised only when `VITE_SENTRY_DSN` is set) | **ALREADY PARTIAL** (credential-gated) |

### C.2 The genuine gap

**Finding C-1 — there is no trace → sanitise → candidate-regression → review →
canonical-fixture pipeline.** Production evidence can be *observed* (events,
audit, run ledger, traces) but there is no declared path that turns an observed
production case into a permanent automated regression. Today a bug is converted
into a fixture by a human hand-writing a validator assertion (which is what the
121 validators are).

- **Classification:** MISSING — ARCHITECTURE NOW / ACTIVATION LATER.
- **Why not built now:** the sanitise step must be able to PROVE it removed
  personal data and credentials; a half-built capture path that could leak
  production content into a tracked fixture file is a worse risk than no path.
  The repository also has no production data to capture (demo/simulation only), so
  building the pipeline now would produce an untestable component.
- **The seam it must reuse (and must NOT duplicate):** canonical events + audit
  entries + `AutomationRun` records as the trace source; the existing validator
  files as the fixture format; the existing `scripts/verify-registry.mjs` as the
  registration point. No second logging system is required or permitted.
- **Activation prerequisites (recorded, not implemented):** a redaction function
  with its own validator; a review/approval record (an audit entry); a
  "candidate regression" store; and a rule that a captured fixture can never
  contain a credential (asserted by a validator).


## 4. Investigation D — VISUAL / DESIGN AUDIT

**This is the area where the brief explicitly says the current redesign must NOT
be treated as accepted.** The honest position this increment reached:

- The Founder has not been able to review the redesign first-hand (login/access),
  so **acceptance is still OPEN** — it is recorded as a Founder verification
  dependency, not as done.
- **A full visual redesign was NOT performed in this increment.** What WAS done is
  the audit-first half of the methodology, with real evidence: the design system
  was read, the redesign's own contract was re-run in a real browser, and concrete
  taste risks were measured. Inventing a new visual language in the same session as
  a security/SEO/automation increment would have produced an unreviewable diff, and
  the standing rule forbids restyling without an explicit instruction — the
  instruction here is "if it is not premium, redesign", which requires the audit
  evidence below first.

### D.1 Evidence gathered this session

| Evidence | Result |
|---|---|
| `docs/DESIGN_SYSTEM.md` | canonical tokens (ink/brass/state), typography ramp (Fraunces/IBM Plex Sans/Mono), radius/shadow/motion tokens, focus rules, component inventory |
| `e2e/uiux-redesign.spec.ts` re-run in Chromium **this session** | **13 / 13 passed** — workspace architecture (frame/header/toolbar/metrics/pipeline/queue/context), saturated palette actually rendered, charts animated, density/grouping controls change the queue, ⌘K palette with RBAC, six themes, no horizontal overflow at 1440/1280/1024/390, homepage redesigned with TAM/SAM absent and tracker animation preserved |
| `scripts/validate-uiux-redesign.mjs` | the 10-point redesign contract (palette saturation, one motion/density language, brass not dominant, workspace primitives, animated charts, colour SSOT, homepage, findability, navigation, reduced motion) |
| `src/index.css` (372 lines) + `src/theme-alpha-shims.css` (691 lines) + `tailwind.config.js` | token foundation + legacy shim layer |
| `e2e/{app-shell,design-system,table-responsive,uiux-foundation,status-semantics}.spec.ts` | shell/IA/RBAC/aria/table/status coverage exists |

### D.2 Taste Skill findings (using the supplied principles as the framework)

| # | Finding | Evidence | Classification | Treatment |
|---|---|---|---|---|
| D-1 | The redesign is real (workspace composition, saturated palette, animated charts) and passes its own contract in a browser | 13/13 above | **ALREADY CORRECT** | Preserve. Do not re-skin what is verified |
| D-2 | **Micro-typography discipline is broken at scale**: the design system says "Avoid `text-[8px]`/`text-[10px]` micro-sizes", but the component tree contains **949** `text-[10px]` and **253** `text-[8px]`/`text-[9px]` occurrences across 134 component files | counted this session (grep) | **ALREADY PARTIAL → genuine premium-standard gap** | The highest-value taste work remaining. It must be done as a SYSTEMATIC pass (a type-scale token, then a mechanical migration), not as ad-hoc edits — a partial pass makes the inconsistency worse |
| D-3 | Legacy shim layer still ships: `theme-alpha-shims.css` (691 lines) duplicates theme-alpha rules alongside the token system | file sizes above | **ALREADY PARTIAL** | Removing it requires the per-screen token migration (D-2). Deferred with the dependency recorded — deleting it now would break un-migrated screens |
| D-4 | No visual-regression/taste gate: screenshots are captured and committed, but nothing diffs them, so a taste regression is invisible to CI | no pixel-diff step exists in `scripts/` or the Playwright config | **MISSING — IMPLEMENT LATER** | Requires a baseline policy + storage decision (the repo already tracks PNGs, so the baseline exists; the diff gate does not) |
| D-5 | **Rare UI is not present in the repository** (no `rare ui`/`taste skill` artefacts exist — grep, zero hits) | grep, zero hits | **DO NOT IMPLEMENT** | Rare UI is a COMPONENT SOURCE, not a design direction. Adding animated components purely for novelty is forbidden by the brief and by the platform's restrained-motion principle. If assets are supplied later, they are used only where they materially improve a verified screen |
| D-6 | Loading / empty / error states | implemented per-surface (`dashboard-loading`, per-section `EmptyState`, `Alert` error branches) and asserted in the dashboard/app-shell specs | **ALREADY CORRECT** | None |
| D-7 | Accessibility foundation | global `:focus-visible`, `aria-current`/`aria-selected`/`aria-busy`, skip link, semantic `StatusBadge` (never colour-only), `prefers-reduced-motion` global disable | **ALREADY CORRECT** | None |
| D-8 | Role-specific experience | 4 shells (`HomeShell`/`BrandShell`/`AdminShell`/`CarrierShell`) + RBAC-scoped nav (asserted in `app-shell.spec.ts`) | **ALREADY CORRECT** | None |

**Founder verification dependency (recorded, not resolved):** the acceptance
criterion is "PREMIUM B2B PLATFORM". D-2/D-3/D-4 are the concrete, measurable
remaining work; the Founder's own first-hand review remains the acceptance act.

**§REPOINTED (2026-10-11, rule 07) — the D-4 row above is STALE in ONE respect and is left as written history.** It says the screenshots are captured AND COMMITTED and that the repository already tracks PNGs, so "the baseline exists". That was true when it was written: on 2026-09-21 the clean-slate reconciliation put `test-screenshots/` on the NEVER-TRACKED list (`.gitignore` line 46), because 117 picture files made the saved state permanently messy. Measured today: **224** pictures exist on disk and **0** are kept in the project (`git ls-files test-screenshots` = 0). So **no baseline set lives in the repository**, and the missing work is BOTH (a) capture-and-keep a baseline set of the app's screens and (b) the baseline-policy decision. The pixel-diff step itself is still missing, exactly as the row says. **§CLOSED 2026-10-12 (owner):** D-4's remaining work is now CLOSED — the visual-regression/taste gate is **NOT part of the build**, the baseline-policy question is **WITHDRAWN** rather than answered, and no session may raise it with the owner again. The row stays here as history; its registry row is `deferred`.

**§REPOINTED (2026-10-11, rule 07) — the D-8 row above is ALSO STALE, and it is the row that made the owner ask "why are you talking about a carrier?".** It says the role-specific experience is "4 shells (`HomeShell`/`BrandShell`/`AdminShell`/`CarrierShell`)". **There is no carrier shell and no carrier user**: the 3PL carrier surface was REMOVED on 2026-09-23 (§P9, programme decision 4 — Founder decision **T-2**: *no external carrier users/logins*), the files `src/components/layout/CarrierShell.tsx` and `src/components/carrier/` do not exist, and **a carrier never logs into Mercenta** — DHL and Palletline are operated **by API** from the Brand/Admin-facing Logistics Hub. Measured today, the shells that exist are exactly `HomeShell`, `BrandShell`, `AdminShell` (plus the `AppShell` wrapper), and `scripts/validate-conversion-gate.mjs` asserts the carrier surface's absence. The rest of the row (RBAC-scoped navigation, asserted in `app-shell.spec.ts`) remains correct.

## 5. Investigation E — PUBLIC WEB / SEO / AI-SEARCH FOUNDATION

### E.1 What the previous audit reported vs the CURRENT repository (re-verified)

| Previous audit claim | Current reality (verified this session) |
|---|---|
| "no robots.txt" | **`public/robots.txt` EXISTS** (allow-list + private disallows + sitemap pointer) |
| "no sitemap" | **`public/sitemap.xml` EXISTS** (7 URLs) |
| "no obvious noindex/nofollow" | **TRUE and still true** — zero `noindex` anywhere in `src/` (grep) |
| "SPA routes returning index.html/200" | **TRUE** — `public/.htaccess` rewrites every unknown path to `index.html`; environments are state-driven, not path-driven |

### E.2 Findings

| # | Finding | Evidence | Classification | Treatment |
|---|---|---|---|---|
| E-1 | robots.txt + sitemap + canonical + OG/Twitter + JSON-LD already exist | `public/*`, `index.html` | **ALREADY CORRECT** | Preserve |
| E-2 | **Every route was served with the homepage title and canonicalised to `/`**: `document.title` was set once in `main.tsx`, and `index.html` carried ONE unconditional `<link rel="canonical" href="https://mercenta.co.uk/">` | `src/main.tsx`, `index.html`, zero per-route metadata anywhere | **MISSING — IMPLEMENTED NOW** | New SSOT + runtime layer (below) |
| E-3 | **No `noindex` on private/unknown surfaces**: `/admin`, `/login` and any unknown path were indexable and canonicalised to the homepage | zero `noindex` in `src/` | **MISSING — IMPLEMENTED NOW** | Fail-closed route classification (below) |
| E-4 | **The sitemap had drifted from the routes**: `/explore-uk-market-fit` (a real public page, the primary CTA target) was missing; nothing enforced agreement between robots.txt, sitemap.xml and the app's path→view map | sitemap had 7 URLs, the app had 8 public pages | **MISSING — IMPLEMENTED NOW** | SSOT + validator that pins all three (below) |
| E-5 | In-app navigation did not update the address (no history), so the browsed URL never matched the rendered page and no public page was shareable/deep-linkable beyond a hard refresh | `Home.tsx` used a local state setter only | **MISSING — IMPLEMENTED NOW** | `navigate()` pushes the canonical path + applies metadata; `popstate` handled |
| E-6 | Crawlable internal links | `PublicNav`/`PublicFooter` already render real `<a href>` anchors for every public page | **ALREADY CORRECT** | Preserve (no change needed) |
| E-7 | Structured data | JSON-LD (`SoftwareApplication`, `Organization`, `WebSite`, `WebPage` + breadcrumb) + OG/Twitter + theme-color + `<noscript>` content exist in `index.html` | **ALREADY CORRECT** | Preserve |
| E-8 | A content model for future commercial-intent content (topic, intent, audience, commercial relationship, evidence/source, owner, last-verified date, related entities, internal links, structured metadata) | **does not exist** | **MISSING — ARCHITECTURE NOW / ACTIVATION LATER** | Deliberately NOT built as an empty schema: the route SSOT is the prerequisite foundation (it now declares title/description/indexability per route), and the content model is only justified once real content is authored. **Mass-generating pages is forbidden** |
| E-9 | DEJAN / AI-Mode specific tag system | the referenced article was not sufficiently accessible/verified | **DO NOT IMPLEMENT** | No Google-specific tag system was invented; only verifiable technical facts were implemented |
| E-10 | Crawler-visible rendering of public pages without JavaScript | `index.html` ships a full `<noscript>` fallback describing the platform, and JS-capable crawlers render the real page | **ALREADY PARTIAL** | Pre-rendering/SSR is a build-architecture change (a second renderer) and is **not** justified while the public surface is 8 pages; recorded, not built |

## 6. Investigation F — INTELLIGENT DECISION SEAM (Nimble)

**Nimble is NOT a production dependency and was not made one. No model was
introduced into any decision path.** The question asked was whether a bounded
decision seam is genuinely absent — it is not:

| Seam component | Where it ALREADY exists | Classification |
|---|---|---|
| deterministic hard constraints | `src/config/routing.ts` + `src/lib/routing/gateways.ts` (exclusive gateway REFUSES when no/several conditions hold; `refusesDefaultSuccess: true`) | **ALREADY CORRECT** |
| deterministic business gate → route/refusal | `src/lib/commercial/commercialGate.ts` (`refused: decision.refused`, route ladder, `human_review` fallback) | **ALREADY CORRECT** |
| optional model decision, strictly bounded | `src/lib/costs/modelPolicy.ts` (deterministic → cache → local → approved FREE model → **REFUSE**; no paid fallback) | **ALREADY CORRECT** |
| AUTO / REVIEW / REFUSE outcomes | AUTO: deterministic automation implementations; REVIEW: `blocked_approval` (automation) and `human_review` (commercial route); REFUSE: gateway refusal + `selectRuntimeModelForTask().refused` + `isValidICP`/category-gate refusals | **ALREADY CORRECT** |
| probability/threshold | **not present as a generic mechanism** — decisions are rule-based, not probabilistic | **MISSING — ARCHITECTURE NOW / ACTIVATION LATER** |
| cost/usage provenance for a model call | `src/lib/costs/usageLog.ts` (`authoriseAiCall` / `recordAiCallOutcome`) | **ALREADY CORRECT** |
| a model inside the forbidden domains | **none** — asserted by the new gate below | **ALREADY CORRECT** |

**Why a probability/threshold layer was NOT built:** it requires a calibrated
model, a Mercenta-specific benchmark, threshold validation, failure analysis,
licensing verification, latency/cost validation and a deterministic fallback — the
prerequisites the brief itself lists. Building the mechanism before those exist
would produce exactly the "Nimble as a production dependency" outcome the brief
forbids. The seam that must exist first already exists.

**What WAS implemented (cheap, safe, foundational, and missing until now):**
`scripts/validate-bounded-ai.mjs` — a gate that PROVES the boundary rather than
describing it: free-only model selection, single authorised egress, no client-side
secret, no AI import in any forbidden domain (compliance, finance, payouts,
verification, retail-channel client, integration registry, routing), fail-closed
provider modes, zero network. **All assertions passing (see §11).**

## 7. Investigations G + H — BRAND SUPPORT / PROXY MODEL + LOA AUTHORITY

### G. Brand Support / retail-channel proxy verification (S2a re-verified)

| Required property | Evidence | Verdict |
|---|---|---|
| Brand → Mercenta → retail channel only; the brand never contacts the channel | `src/components/brand/BrandSupport.tsx` (brand opens a case, links one of its OWN records, reads KB guidance, sees the same sufficiency verdict); escalation is reachable ONLY from `src/components/admin/HelpdeskDashboard.tsx` (Super-Admin) and the deterministic simulation | **VERIFIED** |
| Mercenta review before any escalation | `ticketStore.reviewCase` → `escalationState: approved_for_escalation`; `escalateCaseToProvider` REFUSES a case that is not approved | **VERIFIED** |
| external escalation is fail-closed | `src/lib/helpdesk/amazonCaseClient.ts`: only a positively-resolved `simulation` mode yields a simulated case; unknown/not_registered/disabled/configuring/live-without-credentials/degraded/error → an UNAVAILABLE client returning a truthful error | **VERIFIED** |
| response recorded as RECEIVED, never generated | `recordProviderCaseResponse` (human-entered) surfaced on the Mercenta review queue | **VERIFIED** |
| tenant isolation / cross-tenant refusal | the case's related object is resolved inside the case's OWN tenant; a foreign reference is refused and leaks no other-tenant identifier (asserted by `scripts/validate-kb-sufficiency.mjs` + `e2e/brand-case-workflow.spec.ts` test 3) | **VERIFIED** |
| auditability | every case action is audited with an actor | **VERIFIED** |
| KB sufficiency automation vs human | `src/lib/helpdesk/kbSufficiency.ts` — deterministic, fail-closed verdict `internally_resolvable` / `requires_founder_review` / `not_applicable` (37 assertions, 0 failures, 0 network) | **VERIFIED** |
| no second case system | ONE ticket/case store (`ticketStore.ts`) and ONE conversation store (`messages`) | **VERIFIED** |






### E.3 What was implemented (SEO)

`src/lib/seo/publicRoutes.ts` (route SSOT) → `src/lib/seo/routeMetadata.ts` (pure
builder + the ONE DOM applier) → `src/components/shared/RouteMetadata.tsx`
(mounted once by `App.tsx`) → `Home.tsx` (path resolution + URL push) →
`index.html` (bootstrap canonical marked and rewritable), `public/robots.txt`,
`public/sitemap.xml` → pinned by `scripts/validate-seo-foundation.mjs` and
verified in a browser by `e2e/seo-foundation.spec.ts`.

### H. LOA / onboarding authority verification

| Required property | Evidence | Verdict |
|---|---|---|
| represented | `letter_of_authorization` is a canonical `ComplianceDocument['type']` (`src/types.ts`), labelled "Letter of Authorization" (`src/lib/compliance.ts` line 54) | **VERIFIED** |
| used as an operational gate | it is in `BASE_REQUIRED_DOCUMENTS` — the UNIVERSAL, non-conditional requirement — and `evaluateComplianceGate` blocks catalogue/PO progression until it is `approved` (mirrored server-side by the DB trigger) | **VERIFIED** |
| tenant-scoped + persisted | `compliance_docs` table (`010_create_compliance_docs.sql`) with `brand_id`, `doc_type`, `status` and RLS by tenant JWT; the demo seed creates the four base documents per brand (`016_seed_demo_data.sql`) | **VERIFIED** |
| status-aware | `pending / uploaded / under_review / approved / rejected / superseded` + `verificationStatus` + `version` | **VERIFIED** |
| auditable + attributed | `persistDocumentVerdict` records a versioned `DocumentVerificationRecord` (document version, method manual/automatic, provider id, providerMode, verifier identity, evidence reference, simulated flag) and sets `reviewedBy`; admin approvals are audited | **VERIFIED** |
| associated with brand authority | the LOA is the brand's authorisation for Mercenta to act on its behalf and is a universal gate — but there is no separate "authority" object recording WHO signed it, WHEN and against WHICH scope | **ALREADY PARTIAL** |
| not inventing legal wording | no legal text was invented — the platform stores the document and its verification and does not author a legal instrument | **ALREADY CORRECT (constraint honoured)** |

**Finding H-1 — no explicit representation-authority record.** The LOA exists as a
*gated document*, but the platform does not record the authorisation itself
(signatory identity, effective date, scope, withdrawal), so "Mercenta may act for
this brand" is inferred from a document status rather than declared.

- **Classification:** MISSING — IMPLEMENT LATER (needs Founder-agreed fields and
  wording; inventing legal semantics is forbidden by the brief).
- **Correct treatment when it is built:** reuse `ComplianceDocument` +
  `DocumentVerificationRecord` (no second document system) and extend
  `evaluateComplianceGate` with the authority state — never a parallel gate.

## 8. CLASSIFICATION SUMMARY (every material finding)

| Classification | Findings |
|---|---|
| **ALREADY CORRECT** | A: ICP/disqualifiers/category gate, qualification-before-enrichment, discovery, message structure + follow-up + revision tracking, reply routing/human handoff. B: the whole automation registry, approval gate, per-automation disable, idempotency, retry, audit, tenant/role boundaries, simulation labelling. C: events, audit, run ledger, decision provenance, model/usage tracking, human overrides, regression validators. D: design system, workspace redesign (13/13), accessibility, role shells, states. E: robots/sitemap/canonical/JSON-LD/crawlable links. F: deterministic gateways, commercial gate, free-only model policy, AUTO/REVIEW/REFUSE. G: the entire Brand Support model. H: LOA representation, gate, persistence, status, verification |
| **ALREADY PARTIAL** | A: buying-signal provenance, decision-maker discovery, waterfall enrichment, conversion measurement (counts only). B: synthetic fixtures. C: synthetic scenarios, error traces (credential-gated). D: micro-typography discipline (949 + 253 occurrences), legacy shim layer. E: no-JS rendering. H: representation-authority record |
| **MISSING — IMPLEMENTED NOW** | B: the global automation halt (kill switch). E: per-route metadata + fail-closed noindex + sitemap/robots reconciliation + URL-pushing navigation. F: the bounded-AI safety gate |
| **MISSING — ARCHITECTURE NOW / ACTIVATION LATER** | A: multi-provider enrichment waterfall. C: production-trace → regression pipeline. E: commercial-intent content model. F: probability/threshold decision layer |
| **MISSING — IMPLEMENT LATER** | A: revenue floor, response SLA, message variants, conversion-rate measurement + segment reporting. D: visual-regression/taste gate. H: representation-authority record |
| **EVIDENCE BLOCKED** | the Amazon-side items already recorded in `docs/AMAZON_RECONCILIATION_STATUS.md` §5 (performance, receiving tolerances, deduction codes/window, catalogue route, marketplace ID, routing deadline, image requirements, marketplace differences) — **unchanged, none invented** |
| **CONTRADICTS CANONICAL MODEL** | none found in this increment. The known payout-rail contradiction (T-1 decided, `DEFAULT_PAYOUT_RAIL = 'wise'` not yet changed) is pre-existing and owned by S11; it was NOT touched |
| **DUPLICATES EXISTING CAPABILITY** | none implemented. Explicitly refused: a second acquisition/outbound engine, a second case system, a second event/audit/logging system, a second enrichment seam, a second agent system |
| **DO NOT IMPLEMENT** | the research's 50-record sample methodology, aged accounts/mailbox farms/warm-up/IP tactics/volume targets, a Google-specific AI-Mode tag system, Rare UI novelty components, mass-generated SEO pages, pre-rendering/SSR, any model in a forbidden domain |


## 9. IMPLEMENTED THIS INCREMENT (P0/P1/P4/P5 — all verified, see §11)

| # | Change | Files | Why it is safe | Verification |
|---|---|---|---|---|
| 1 | **Global automation halt (kill switch)** — one act stops every declared automation; enforced in the domain BEFORE any read; reason required; attributed + audited; cleared deterministically; surfaced in the Control Centre | `src/lib/automation/registry.ts` (halt state, `automationHalt`/`isAutomationHalted`/`setAutomationHalt`, `skipped_halted` status, reset clears it, halt check moved ahead of the fingerprint), `src/components/admin/FounderControlCentre.tsx` (Emergency halt panel + `data-halted`) | additive; no existing status changed; no automation added or removed; the halt is OFF by default | 11 new assertions in `scripts/validate-founder-operating-system.mjs`; new browser test 6 in `e2e/founder-operating-system.spec.ts` |
| 2 | **SEO route SSOT + runtime metadata + fail-closed noindex** | NEW `src/lib/seo/publicRoutes.ts`, `src/lib/seo/routeMetadata.ts`, `src/components/shared/RouteMetadata.tsx`; edited `src/App.tsx`, `src/components/marketing/Home.tsx`, `src/main.tsx`, `index.html`, `public/robots.txt`, `public/sitemap.xml` | metadata only; no business logic, no data, no styling changed; the homepage title and rendered pages are unchanged | NEW `scripts/validate-seo-foundation.mjs` (33 assertions, 0 network) + NEW `e2e/seo-foundation.spec.ts` (6/6 in Chromium) |
| 3 | **Bounded intelligent-decision safety gate** | NEW `scripts/validate-bounded-ai.mjs` | a test only — it changes no product code | all assertions pass, 0 network calls |
| 4 | **Repointed stale validator contracts (not weakened)** | `scripts/validate-founder-operating-system.mjs` (8→9 automations, 9→10 Control Centre views, attention sources now include `commercial_readiness`), `scripts/integrity-audit.mjs` (CTA now asserts the canonical `navigate(...)` call) | each carries an inline `§… — REPOINTED` comment naming the OLD contract; the INTENT of each check is unchanged | validator + integrity audit both green after the repoint (they were RED before it, pre-existing) |
| 5 | **Documentation** | NEW `docs/UNIFIED_PLATFORM_GAP_ANALYSIS_2026-09-20.md`; `PROJECT_STATUS.md`, `HANDOFF.md`, `docs/WHOLE_PLATFORM_E2E_COVERAGE_MATRIX.md`, `requirements-registry.json` (+ a new idempotent reconcile script), `README.md` | documentation only | `scripts/verify-registry.mjs` re-run; five-source reconciliation recorded |

**Deliberately NOT modified:** `.env` (never read), any credential/secret, any
deploy script, `src/config/payouts.ts` (T-1 is a separate decided-not-applied
item), `src/components/admin/RakazoPanel.tsx`, the Amazon reconciliation
dispositions, any demo data or demo account, the S2a case workflow, the design
tokens or any styling, and every existing validator's INTENT.

## 10. REMAINING GAPS (grouped as required)

**Implement now:** nothing outstanding from this increment's scope — items 1–5
above are complete and verified.

**Architecture now / activation later:** multi-provider enrichment waterfall (A) ·
production-trace → regression pipeline (C) · commercial-intent content model (E) ·
probability/threshold decision layer (F) · SP-API Vendor surface (pre-existing S7,
credential-blocked).

**Later:** revenue floor (A) · response SLA (A) · message variants (A) ·
conversion-rate + segment measurement (A) · visual-regression/taste gate (D) ·
micro-typography system pass + shim removal (D) · representation-authority record
(H) · full-platform Playwright suite re-run (pre-existing S12).

**Evidence blocked:** the eight Amazon-side items in
`docs/AMAZON_RECONCILIATION_STATUS.md` §5 — untouched, APPLIED 0 OF 52 confirmed
below.

**Founder decisions required (nothing built that depends on them):**
1. the revenue floor value (A) · 2. the response SLA target (A) · 3. approval of the
micro-typography/type-scale pass (D, visual) · 4. whether S11 should apply T-1 as
written (pre-existing) · 5. confirmation of the LOA authority fields (H).

## 11. AMAZON RECONCILIATION — NO DISPOSITION APPLIED

`docs/AMAZON_RECONCILIATION_STATUS.md` still records **52 findings · APPLIED 0**.
**This increment applied ZERO dispositions** and invented no retail-channel
behaviour. The eight evidence-blocked items remain evidence-blocked.

## 12. SAFETY COMPLIANCE STATEMENT

No `.env` was read; no credential was added, read, rotated or activated; no secret
was hardcoded; no production integration was activated; no live retail-channel
call was made; no live outbound message was sent; no paid service was activated;
Rakazo was not modified; nothing was reset/cleaned/discarded; no destructive git
operation was performed; no second acquisition/case/logging/agent system was
created; no deterministic safety gate was replaced with AI; Nimble was not made a
dependency; no SEO content was mass-generated; no UI component was added for
novelty; and no production-readiness claim is made — only simulation was tested.

