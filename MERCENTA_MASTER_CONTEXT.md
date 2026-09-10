# MERCENTA_MASTER_CONTEXT.md

> **AI-VENDOR-NEUTRAL PROJECT CONTEXT.**
>
> This file is the portable long-term project constitution. It contains stable
> project facts and decisions written in objective project language. It does
> NOT depend on ChatGPT memory, Cline memory, DeepSeek memory, OpenRouter
> memory, or any previous conversation. A human developer or any AI — ChatGPT,
> Claude, Gemini, DeepSeek, another coding agent — must be able to open the
> MERCENTA project folder, read this file plus PROJECT_STATUS.md plus
> MERCENTA_ARCHITECTURE.md, and understand the product, its decisions, and its
> roadmap without access to any chat transcript.
>
> Current-status pointer: **PROJECT_STATUS.md** (operational handoff — where the
> project is right now). Technical reference: **MERCENTA_ARCHITECTURE.md**.

---

## A. Business Purpose

MERCENTA is a **self-service wholesale distribution platform for proven
consumer brands with demonstrated Amazon UK demand**. It manages the end-to-end
path from prospective-brand discovery and qualification, through compliance and
onboarding, to purchase orders, logistics, deductions, and partner
relationships — connected to an Amazon UK Vendor operating model.

The product models Amazon/vendor-native workflows **internally** for
architecture correctness. Customer-facing language must stay factual and
defensible (see section I — Amazon/Vendor business constraints).

## B. Business Model

- **Commission** on purchase orders + **platform/monthly fees**. Rate values are
  placeholder constants (`COMMISSION_RATE_PLACEHOLDER`, `MONTHLY_FEE_PLACEHOLDER_GBP`
  in `src/lib/crm` / agreement builder) pending commercial tuning.
- **Brands** (partners) pay for distribution, compliance handling, and Amazon
  Vendor operations; **Mercenta staff** run acquisition, account management,
  logistics, and support.
- Demo/placeholder financial values are always visually identified as
  placeholders; KPIs are only ever computed from trustworthy internal data.

## C. Customer / User Model

| Actor | Portal | What they do |
|---|---|---|
| Brand partner | Brand portal | Onboarding, products, POs, logistics, compliance, analytics, returns, support chat |
| Admin / Super Admin staff | Admin portal | Overview, CRM, POs, logistics, carrier ops, brand intelligence, marketing/ICP, helpdesk, audit, integrations, super-admin controls |
| Carrier operator | Carrier portal | Manifest management, hub logistics, API auditor |

Public: marketing site + Partner Login + brand application/access-gate.

## D. Product Vision

MERCENTA owns its core product end to end: **domain state, business rules,
architecture, data, documentation, roadmap, and test evidence**. Third-party
systems are optional layers: Postiz (mature external social platform to be
surfaced), Rakazo (future optional AI-workforce/orchestration layer, LAST).
MERCENTA must keep working when any third party is unavailable.

## E. Core Workflows

1. **Partner application → access gate → onboarding** → compliance gate → catalog sync.
2. **Brand Intelligence discovery** (BI) → canonical prospect → **ICP** targeting →
   (future) contact/enrichment → approval → outreach → response → opportunity → CRM.
3. **Onboarding** (wizard: profile → legal → banking → carriers) → agreement generation
   → compliance docs → gate clearance.
4. **Purchase orders** → fulfilment tracks → shipments/logistics → ASNs → deductions/returns.
5. **CRM relationship management** (+ tasks/notes/timeline) and **communications**
   (one canonical message store) and **helpdesk** (tickets group canonical messages).
6. **Notifications** (derived work-items; hot-lead human flag) and **audit log**.

## F. Domain Architecture

- No URL router: navigation is state-driven (`environment` + `view` in
  `GlobalStateContext`). Shells: `HomeShell` (marketing/auth), `BrandShell`,
  `AdminShell`, `CarrierShell`.
- Domain libs under `src/lib/`: spapi, dhl, compliance, billing, crm, helpdesk,
  intelligence, discovery, research, rocketchat, postiz, whatsapp, mail,
  messaging, monitoring, automation, events, simulation, verification, shipping.
- Canonical shared model in **`src/types.ts`** (single source of truth;
  `APPROVED_CATEGORIES`, `Lead`, `BrandProspect`, `Message`, `Ticket`, etc.).
- Providers behind registry + mock/real seams (`src/integrations/registry.ts`,
  19 registered providers).

## G. Data Architecture

- **Demo/seed mode (default):** `src/data/demoStore.ts` is the in-memory single
  source of truth; `src/data/bootstrap.ts` seeds it. Mutations are in-memory by
  contract (reload resets; documented). Optional Supabase dual-write persists
  when configured.
- Messages are canonical via `logMessage` → `demoMessages` (one conversation
  store; no second message DB anywhere).
- Audit: `demoAuditLog` (platform-wide action registry).
- Data-classification rule: everything is either REAL internal data,
  DETERMINISTIC PROVIDER SIMULATION, SEEDED TEST FIXTURE, or UNKNOWN — and the
  four stay distinguishable (see Y/Z).

## H. Simulation / Live Provider Architecture

- Every external provider is behind a **swappable interface** with Mock*Client
  (deterministic, realistic, zero credentials) and Real*Client (activated by
  credentials only). Swapping requires ZERO code changes elsewhere.
- **Simulation is NOT a fake shortcut.** Simulation runs the same MERCENTA
  domain workflow with a simulated provider adapter. Only an explicitly
  identified provider mode of `simulation` may simulate.
- `unknown / unregistered / unconfigured / disabled / configuring / live /
  degraded / error` must **never** silently fall back to simulation.
- Scenario engine (`src/lib/simulation/scenarioEngine.ts`) runs deterministic
  provider workflows (SP-API polls, DHL milestones, Companies House, HMRC,
  compliance verification).

## I. Amazon / Vendor Business Constraints

- MERCENTA may internally model Amazon/vendor-native workflows (Amazon Retail
  signals, Vendor supply, ASN dispatch) as technical architecture.
- MERCENTA must NOT make unsupported customer-facing claims: no guaranteed
  Amazon POs, no unsupported Amazon partnerships, no unsupported direct
  wholesale claims, no wording creating unnecessary Amazon policy/TOS exposure.
- Wording safety lints enforce this on outward copy.

## J. Brand Intelligence Role

**Brand Intelligence (BI) is the intended authoritative real-data discovery and
intelligence engine for real prospective partner brands.** Current
implementation is a **seeded fixture universe** (12 prospects: 3
`brandProspectSeed` + 9 `brandExtraSeed`; 2 hard-disqualified → 10 shown),
re-scored at load by the deterministic 7-dimension scoring engine. The client
factory always returns the MockClient; there are no live clients, no
mutations, no persistence yet. BI does NOT fabricate real-world prospects.

## K. ICP Role

ICP is **downstream targeting/execution** that consumes canonical BI prospect
records. It must NOT own a parallel fictional universe. The seeded `INITIAL_LEADS`
(8 demo companies) are SEEDED TEST FIXTURES for the pipeline mechanics, not a
canonical prospect source. Since Phase A the identity bridge
(`src/lib/intelligence/prospectPipeline.ts`) links every ingested lead to its
canonical BI prospect (`Lead.prospectId`) so canonical identity survives
ingestion → targeting → (future) outreach → opportunity.

## L. Partner Acquisition Pipeline

BI → canonical prospect → ICP/targeting → contact/enrichment → approval →
outreach → response → opportunity → CRM → application → onboarding. Identity
and evidence must survive every stage. Phase A implemented the minimum
connective tissue: BI→ICP identity link + deterministic fit persistence. The
prospect→opportunity entity and the outreach sender remain future work (Phase D).

## M. CRM Model

CRM is the **relationship system of record** for onboarded brands: contact data,
tasks, internal notes, lifecycle stage, tags, account owner, and a unified
chronological timeline (messages, calls, notes, tasks, PO/contract/compliance/
deduction events — all derived from real entity state, never fabricated).
`src/lib/crm/crmStore.ts` + `BrandCrmDepth` UI.

## N. Communication Model

**ONE canonical conversation/message model.** Every message — staff, brand,
automation, call log — flows through `logMessage` into the single `messages`
store. Messages Hub, BrandComm, LiveChatWidget, BrandTeamMessages, helpdesk
tickets: all viewers of the same canonical store. A dedicated Inbox/Messages
view is allowed but is only a VIEW over canonical records. No second
conversation DB, no fragmented silos.

## O. Helpdesk Model

Helpdesk owns issues/cases. Tickets reference canonical `messageIds` and group
them into support threads. Status transitions are real store mutations and are
audited (`ticket_status_changed`). Live chat auto-creates/links tickets.

## P. Notification Model

Notifications are derived work-items computed from real domain state
(AttentionPanel / need-attention feeds), NOT a duplicate data store. The only
real-time human-flag trigger is the hot-lead reply classifier
(`classifyInboundReply` → `requiresHuman`). A daily digest exists
(borderline scores, renewals, overnight commissions) at the lib level.

## Q. Analytics Model

- **Overview = "How is the business performing?"** → analytics-first.
- **Operations = "What work is happening / needs attention?"** → workflow-first.
- Only trustworthy internal data: KPIs derive from real POs, shipments,
  contracts, compliance docs, messages. Seeded campaign/health stats are
  explicitly flagged as seeded, not presented as real.
- Future: KPI bands, trends, funnels, distributions, drill-downs, accessible
  equivalents, loading/empty/error states (not yet — UI phase comes later).

## R. Postiz Model

Postiz is an **external, already-deployed, mature social platform** — NOT
rebuilt inside MERCENTA. When the Postiz phase arrives, MERCENTA exposes the
existing full Postiz application from Admin and Brand contexts. No simplified
clone, no fake dashboard pretending to be Postiz. Core MERCENTA stays
independent of Postiz.

## S. Rocket.Chat Decision

Rocket.Chat is **NOT part of the final architecture** and is **marked for
removal**. Current code is mock-only and disconnected from the canonical
message store; nothing in any product workflow requires it. Its removal later
must cover routes, navigation, imports, factories, dead code and obsolete
references. It is NOT replaced with another oversized internal-chat product.

## T. Rakazo Strategy

Rakazo is a **deferred, optional final-layer AI workforce / orchestration
layer**. DEFERRED. FUTURE SEAM ONLY. NO CURRENT IMPLEMENTATION inside MERCENTA
(beyond a read-only iframe surface in Super Admin). MERCENTA must remain fully
operable without Rakazo. Future contract: Rakazo bot receives task → reads
MERCENTA state via an approved contract → performs only permitted actions →
requests human approval where required → MERCENTA performs the authoritative
domain mutation → records audit/event/result → Rakazo reports result. MERCENTA
remains authoritative.

## U. Human-in-the-Loop Strategy

Human-in-the-loop is a real product capability: a recommendation/task is
generated, and a human can approve / reject / modify / defer / assign. MERCENTA
owns the approval state and the resulting business mutation. Manual Admin
action must keep working with Rakazo offline. No Rakazo CTA is implemented yet;
future domain contracts must not prevent it.

## V. RBAC / Tenancy Principles

- Enforcement chain: `tierForRole` → `canAccessEnvironment` → `canAccessView`
  (VIEW_ALLOWLIST) → `filterNavForTier`; tenant pinning via `assertBrandScope`
  / `isCrossTenantAccess`; staff mutations gated by `staffCanMutate`.
- Shared components must be tenant-scoped by explicit brandId/tenantId filters.
- Cross-tenant access is denied; admin can be unpinned only through the
  sanctioned flow.

## W. Integration Principles

- Mock-first for EXTERNAL third parties (credentials absent): fully functional
  deterministic simulation behind the same interface as the real client.
- MERCENTA-controlled internal features are fully real, deterministic, working
  code — no placeholders/stubs (zero-placeholder rule for internal products).
- Provider mode is explicit and never silently flipped.
- Real live Edge Functions that are absent from the repo are NOT claimed to
  work; the simulation must not be broken by their absence.

## X. UI/UX Principles

The visual design is FROZEN and must match https://demo.mercenta.co.uk exactly
until an explicit UI/UX phase. When that phase arrives: premium B2B product,
clear hierarchy, analytics-first executive views, operational workspaces, high
density without clutter, excellent tables/forms, clear empty/loading/error
states, responsive, keyboard accessible, ARIA where necessary, high-quality
onboarding. **Not started yet.**

## Y. Data-Truth Principles

- Eliminate redundant mock data where canonical internal data exists. Never
  create a second business universe.
- Use REAL INTERNAL MERCENTA data when available; DETERMINISTIC PROVIDER
  SIMULATION when external behavior must be simulated; SEEDED TEST FIXTURES
  only where deterministic testing requires fixtures. Categories remain
  distinguishable.
- Never fabricate external data, prospects, or KPIs.

## Z. Mock / Simulation Rules

- Mock connections/values must be unmistakable: clearly fake tokens/IDs,
  "(Mock)" visible where relevant, placeholder values (e.g. `XX-PENDING-...`)
  rather than plausible real numbers.
- Simulated flows exercise realistic success AND failure paths.
- A missing credential is never a reason to stop building.

## AA. Security Principles

- Supabase RLS enforced; brand identity derived from verified JWT, never
  blindly trusted from request bodies (cross-tenant write vectors rejected).
- Secrets live in `.env` (gitignored) / secret stores referenced by registry —
  never committed.
- Fail closed on unsigned/invalid tokens; edge functions return 401 before any
  DB access when auth is missing.

## AB. Current Roadmap (final order — Rakazo LAST)

| Phase | Title |
|---|---|
| A | Core data / domain / workflow consolidation **(current)** |
| B | Brand Intelligence real-data lifecycle |
| C | ICP consumption of canonical BI data |
| D | Partner acquisition / outreach connectivity |
| E | CRM + communication + helpdesk consolidation |
| F | Executive analytics + operations separation |
| G | Screen-level UI/UX redesign |
| H | Postiz exposure using the existing full app |
| I | Mock / seed / placeholder data rationalization |
| J | Full end-to-end business acceptance |
| K | Accessibility / responsive / security / regression |
| L | Public deployment + live demo verification |
| M | Rakazo final integration layer **(LAST)** |

## AC. Permanent Do-Not-Change Decisions

1. Rakazo is LAST and optional. Never make Rakazo a dependency of core MERCENTA.
2. Postiz is never rebuilt; expose the existing mature app.
3. Rocket.Chat is removed (mock-only today; no expansion).
4. Brand Intelligence is the intended authoritative discovery source.
5. ICP consumes canonical BI records; no independent fictional universe.
6. ONE canonical conversation/message model. No second message DB.
7. CRM owns relationships; helpdesk owns issues; notifications own system events.
8. Overview = analytics-first; Operations = workflow-first.
9. Simulation is real MERCENTA workflow execution with a simulated adapter;
   UNKNOWN is never simulation.
10. No unsupported Amazon policy/TOS-exposure customer-facing claims.
11. Visual design freeze until the explicit UI/UX phase.
12. Generated/forensic artifacts are never committed simply to clean Git.
13. AI tools are interchangeable; project knowledge lives in these files.

## AD. Major Architectural Decisions

1. State-driven navigation (no client-side URL router).
2. Provider registry (19) with per-card simulation controls + mock/real seams.
3. Mock-first external adapters; real adapters activated by credentials only.
4. Canonical `messages` store behind `logMessage`; helpdesk tickets reference
   message IDs.
5. `src/types.ts` is the single shared schema; `APPROVED_CATEGORIES` single
   constant; demo data and schema both derived from it.
6. BI→ICP canonical identity bridge (`prospectPipeline.ts`) — identity survives
   ingestion; fit scores persisted at transitions.
7. In-memory demo store as the default single source with optional Supabase
   dual-write.
8. Deterministic scenario engine for provider-workflow simulation with
   networkCalls===0 proofs.

## AE. Known Limitations / Caveats

- Demo persistence is in-memory (reload resets) unless Supabase is configured;
  the domain tests document this contract.
- Live Edge Functions for SP-API/DHL/Companies House/HMRC/email are absent from
  the repo (deploy-time infra) — the live switch would 404 until deployed;
  nothing claims otherwise.
- `outreachGenerator.ts` and `XeroConnection.tsx` are dead code (unimported,
  typecheck-clean); candidates for later rationalisation.
- BI prospect `outreachStatus` ladder is UI-inert (no mutation path); no
  Opportunity entity yet; campaign performance stats and monitoring health are
  seeded (flagged).
- `validate-edge-functions.mjs` is stale (crashes: expects absent functions) —
  needs repair-or-retire evaluation.
- No live credentials configured for real providers; demo/sandbox paths used.

## AF. Current Project Status Pointer

→ **PROJECT_STATUS.md** — the operational cross-chat handoff. It contains the
current state checklist, decision log, phase checkpoints, known issues and
deferred work. Read it first in any fresh session, then verify against source
(current source + Git + test evidence win over any document).