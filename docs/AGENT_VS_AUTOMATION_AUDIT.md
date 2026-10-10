# AGENT vs AUTOMATION ARCHITECTURE AUDIT

> Repository-derived audit performed 2026-09-21 (redesign workstream, session 3).
> Method: read the actual automation/AI modules and their validators; every
> classification below names the file it is based on. Nothing here is inferred
> from a product description.

## The canonical principle (already implemented in the codebase)

```
CODE FIRST.
AUTOMATION SECOND.
AGENT ONLY WHEN REASONING IS REQUIRED.
HUMAN AUTHORITY WHEN ACTION EXCEEDS DEFINED SYSTEM AUTHORITY.
```

`src/lib/automation/registry.ts` declares this explicitly in its header, and the
implementation honours it: every automation is a **deterministic** function with
a declared cadence, a declared single callable entry point, a declared cost note,
and an optional AI seam that is never required.

## Classification

| Capability | Module | Mechanism | Classification |
|---|---|---|---|
| Work projection (PO ack windows, gates, invoice terms, deduction windows, carrier exceptions, returns, follow-ups, onboarding steps, renewals) | `src/lib/automation/registry.ts` → `work_projection` (`deterministic: true`, `requiresAi: false`) | Pure in-process projection over already-loaded stores | **CODE CORRECT** |
| Reminder sweep | same file → `reminder_sweep` | Deterministic derivation + canonical reminder runner | **AUTOMATION CORRECT** |
| Overdue escalation | `overdue_escalation` | Deterministic thresholds; writes canonical audit | **AUTOMATION CORRECT** |
| Compliance gate monitor | `compliance_gate_monitor` | Reads the canonical `getComplianceRequirements` gate | **AUTOMATION CORRECT** |
| Finance overdue monitor | `finance_overdue_monitor` | Deterministic terms/aging maths | **AUTOMATION CORRECT** |
| Acquisition follow-up monitor | `acquisition_followup_monitor` | Deterministic cadence over canonical prospects | **AUTOMATION CORRECT** |
| Commission review | `commission_review` | Canonical fee maths; stops at a proposal | **AUTOMATION CORRECT** (human approval downstream) |
| Commercial readiness monitor | `commercial_readiness_monitor` | Deterministic readiness rules | **AUTOMATION CORRECT** |
| Founder brief | `founder_brief` | Deterministic fact assembly (`src/lib/founder/briefFacts.ts`), AI narrative OPTIONAL | **MIXED — correct shape**: facts are code, the narrative is the only model-shaped part, and the deterministic client is the fallback |
| Founder ops narrative | `src/lib/ai/founderAiClient.ts`, `founderOpsAi.ts` | `DeterministicFounderAiClient` + `RealOpenRouterFounderAiClient` behind one interface | **AGENT JUSTIFIED** (narrative synthesis is genuinely reasoning) **with the boundary correct**: `createFounderAiClient` falls back deterministically when no credential resolves |
| Runtime model selection | `src/lib/costs/modelPolicy.ts` | Explicit ladder: deterministic → cache → local → approved FREE model → **REFUSED** | **CODE CORRECT** (no paid fallback; `paidFallbackAllowed: false`) |
| Alert triage | `src/lib/monitoring/alertTriage.ts` | Rules first; model only for narrative | **AUTOMATION CORRECT** |
| Acquisition scoring | `src/lib/acquisition/acquisitionEngine.ts` + `scoringBridge.ts` | Deterministic scoring over declared factors | **CODE CORRECT** |
| Auto-approve | `src/lib/automation/autoApprove.ts` | Declared policy, not a model | **CODE CORRECT** |
| Brain graph projection | ~~`src/lib/intelligence/brain/buildGraph.ts`~~ | §BATCH 4 (2026-10-10) — the Mercenta Brain projection was REMOVED by owner instruction; the file no longer exists. Its absence is guarded by `scripts/validate-mercenta-brain.mjs` (an absence guard, rule 08). Historical classification: pure projection of canonical records, declared `AMAZON_PROGRAMME_STATUS`. | **REMOVED** |
| Intelligence layer | `src/lib/intelligence/intelligenceLayer.ts` | Derived, evidence-carrying projections | **CODE CORRECT** |

## Findings

1. **No agent bypasses a domain service.** Every automation in the registry calls
   the canonical domain functions; none writes authoritative state directly.
   `externalProviders: []` on **all nine** automations means no automation reaches
   a live provider in this environment — consistent with the simulation-first rule.
2. **AI is optional everywhere it appears.** `requiresAi` is declared per
   automation, and the registry header states an AI-assisted automation must
   degrade to its deterministic path. Verified by reading the registry, not
   assumed.
3. **The one genuine agent-shaped capability is narrative synthesis** (Founder
   brief, ops narrative, alert triage wording). That is the correct use: the
   facts are computed in code, the model only renders them, and failure falls
   back to the deterministic client.
4. **No capability classified `AGENT UNNECESSARY SHOULD BE CODE`.** Nothing in
   the repository replaces deterministic logic with a model call.
5. **No capability classified `CONTRADICTS`.**
6. **Missing/unknown:** there is no scheduler process in this environment, so the
   automations are invoked on demand / by the demo runner rather than by a real
   cron. That is a deployment item, not an architecture defect — the declared
   cadence and the single callable entry point are the seam a scheduler needs.

## Enforcement

- `scripts/validate-automation.mjs` and `scripts/validate-bounded-ai.mjs` gate
  the registry shape and the bounded-AI rules.
- The Control Centre exposes run / retry / disable / failure-simulation and the
  human-approval surface over the same registry, so the audit trail and the UI
  cannot drift apart.

## Honest limits of this audit

It is a **static, repository-derived** audit. It does not measure model output
quality, and it cannot prove the absence of a provider call at runtime beyond
what `externalProviders: []`, the validator assertions and the absence of
`fetch`/URL literals in the client modules demonstrate.
