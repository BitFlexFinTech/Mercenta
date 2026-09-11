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
  intelligence, discovery, research, postiz, whatsapp, mail,
  messaging, monitoring, automation, events, simulation, verification, shipping.
- Canonical shared model in **`src/types.ts`** (single source of truth;
  `APPROVED_CATEGORIES`, `Lead`, `BrandProspect`, `Message`, `Ticket`, etc.).
- Providers behind registry + mock/real seams (`src/integrations/registry.ts`,
  18 registered providers — Rocket.Chat removed in Phase D1).

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

**Brand Intelligence (BI) is the authoritative real-data discovery and
intelligence engine for real prospective partner brands, and the canonical
source of truth for prospect discovery.** Current implementation is the
authoritative **seeded prospect universe** (12 prospects: 3 `brandProspectSeed` +
9 `brandExtraSeed`; 2 hard-disqualified → 10 active), scored by the deterministic
7-dimension scoring engine at store boot. Since Phase B the universe also has a
real lifecycle: discovery runs, change events, score snapshots, sticky operator
disqualify/requalify. The client factory still returns the MockClient (a
deterministic provider), which is why records carry `source: 'mock'` — that
means "no live provider produced this record", **not** "this brand is
fictional". BI does NOT fabricate real-world prospects.

## K. ICP Role

ICP is **downstream targeting/execution** that consumes canonical BI prospect
records. It must NOT own a parallel fictional universe. Since **Phase C
(2026-09-11)** the ICP acquisition universe IS the canonical BI prospect store
(`prospectStore.getAcquisitionLeads()`): every ICP row carries the canonical
`prospectId` and the deterministic lead id `lead-<prospectId>`. The seeded
`INITIAL_LEADS` (8 demo companies) are **retained ONLY as validation fixtures** —
they are no longer the active acquisition source and must not be re-activated.
Origin regions are derived from BI evidence (`deriveIcpOriginRegion` +
`ICP_REGION_BY_COUNTRY`); the region model includes `uk` because 7 of the 10
canonical brands are UK-origin, and an unmappable origin returns `null` (never
guessed). ICP-side fit scoring (`scoreLeadFit`, threshold 70) is a DOWNSTREAM
targeting score — it is not a second BI score and must not replace it.

## L. Partner Acquisition Pipeline

BI → canonical prospect → ICP/targeting → contact/targeting → outreach
preparation (BI evidence drives the copy) → human approval (MODIFY / APPROVE /
REJECT) → send (deterministic simulation, or a connected provider through the
same seam) → response (intent-classified by `classifyInboundReply`) →
Opportunity → CRM relationship context → application → onboarding. Identity and
evidence must survive every stage.

**Phase C (2026-09-11) implemented this end-to-end in the domain layer:**
`src/data/acquisitionStore.ts` (outreach revisions, responses, opportunities,
acquisition events — all keyed by the canonical prospect id; audit via
`demoAuditLog`) + `src/lib/acquisition/outreachLifecycle.ts` (the state machine,
with RBAC + tenant guards in the domain, not the UI) +
`src/lib/acquisition/outreachSender.ts` (transport seam: simulation by default).
Every downstream transition is written back to the canonical prospect through
`setProspectOutreachStatus()` and audited on the prospect timeline, so BI stays
the single source of truth. **Remaining (Phase D):** activate live providers,
persist acquisition artefacts beyond session memory, and wire
`Opportunity.brandId` into the real application/onboarding flow.

## M. CRM Model

CRM is the **relationship system of record** for onboarded brands: contact data,
tasks, internal notes, lifecycle stage, tags, account owner, and a unified
chronological timeline (messages, calls, notes, tasks, PO/contract/compliance/
deduction events — all derived from real entity state, never fabricated).
`src/lib/crm/crmStore.ts` + `BrandCrmDepth` UI.

**Phase C addition:** the CRM also carries the **pre-onboarding acquisition
relationships** (prospect-backed opportunities) via
`AcquisitionRelationships`, rendering the canonical relationship context
(`getRelationshipContext`) — BI record + outreach revisions + responses +
opportunity + timeline + the same canonical conversation. `Opportunity.brandId`
stays unset until the prospect actually onboards: the record never pretends a
prospect is already a tenant.

**Phase E1 addition:** the CRM also carries the ONBOARDING hand-off. When a
qualified/won opportunity is onboarded, the tenant id is DERIVED
(`brand-<normalizeBrandKey>`), the canonical `BrandOnboarding` record is created
(keyed by the SAME prospect id, carrying the opportunity id), and
`Opportunity.brandId` is set to that tenant. The record still never pretends a
prospect is a tenant — it makes it one, with the acquisition history retained.

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

## S. Rocket.Chat Decision — EXECUTED (Phase D1, 2026-09-11)

Rocket.Chat is **NOT part of the architecture and has been REMOVED** (Phase D1).
The mock-only adapter (`getRocketChatClient()` always returned
`MockRocketChatClient`, accepting credentials it never read), the SSO bridge
(`rocketChatSSO.ts`), the admin panel (`RocketChatAdminPanel.tsx`), the registry
card, the `IntegrationId` member + `INITIAL_INTEGRATIONS` state, the
docker-compose service + Mongo volume, the Caddy vhost and the deploy-script
references were all deleted. Nothing in any product workflow required it — the
canonical message store is `logMessage` → `demoMessages`, surfaced by CRM /
Messages / Helpdesk from ONE underlying conversation. It was NOT replaced with
another internal-chat product. Reintroduction requires a new architectural
decision; it is regression-guarded by `e2e/rocketchat-removal.spec.ts` and
`scripts/validate-rocketchat-removal.mjs`.

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

| Phase | Title | State (2026-09-11) |
|---|---|---|
| A | Core data / domain / workflow consolidation | ✅ DONE (`dbbf567`) |
| B | Brand Intelligence real-data lifecycle | ✅ DONE (`9f935f4`) |
| C | ICP consumption of canonical BI data | ✅ DONE (`b7cd0d4`; BI→ICP→outreach→approve/reject→send→response→Opportunity→CRM) |
| D | Partner acquisition / production hardening | ✅ **DONE** — D1 Rocket.Chat removal · D2 BI-intelligence preservation · D3 outreach/provider hardening · **D4 persistence/domain hardening (`eb1e5e8`)** |
| E | CRM + communication + helpdesk consolidation | |
| F | Executive analytics + operations separation | |
| G | Screen-level UI/UX redesign | |
| H | Postiz exposure using the existing full app | |
| I | Mock / seed / placeholder data rationalization | |
| J | Full end-to-end business acceptance | |
| K | Accessibility / responsive / security / regression | |
| L | Public deployment + live demo verification | |
| M | Rakazo final integration layer **(LAST)** | |

> **Note on phase lettering (2026-09-11).** The rows above are the ORIGINAL A–M
> roadmap. The governing build instruction for the current programme uses
> **"Phase E — Core Platform Completion"** with sub-phases **E1 core-platform gap
> closure · E2 brand onboarding · E3 catalog/products · E4 commerce/Amazon-style
> operational simulation · E5 admin operational surfaces · E6 brand operational
> surfaces · E7 embedded Postiz**. That programme absorbs what this table called
> D5/D6 (and overlaps row H for Postiz). Rows E–H above are therefore **NOT** the
> same thing as Phase E1/E2/…/E7 — do not conflate them. Phase E1 is DONE
> (2026-09-11); its state lives in **PROJECT_STATUS.md**.

## AC. Permanent Do-Not-Change Decisions

1. Rakazo is LAST and optional. Never make Rakazo a dependency of core MERCENTA.
2. Postiz is never rebuilt; expose the existing mature app.
3. Rocket.Chat is REMOVED (Phase D1, 2026-09-11) — never reintroduce it; ONE canonical communication model only.
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
14. Brand onboarding identity is DERIVED, never invented (Phase E1): the
    opportunity → onboarding hand-off derives the brand tenant id from the
    canonical brand key (`brand-<normalizeBrandKey>`), keys the canonical
    `BrandOnboarding` record by the canonical prospect id (`onb-<prospectId>`),
    sets `Opportunity.brandId`, and REFUSES a tenant-id collision. No second
    brand identity, no second onboarding store, no second database, and the
    acquisition history is retained (never copied or re-keyed).

## AD. Major Architectural Decisions

1. State-driven navigation (no client-side URL router).
2. Provider registry (18 — Rocket.Chat removed in Phase D1) with per-card
   simulation controls + mock/real seams.
3. Mock-first external adapters; real adapters activated by credentials only.
4. Canonical `messages` store behind `logMessage`; helpdesk tickets reference
   message IDs.
5. `src/types.ts` is the single shared schema; `APPROVED_CATEGORIES` single
   constant; demo data and schema both derived from it.
6. BI→ICP canonical identity bridge (`prospectPipeline.ts`) — identity survives
   ingestion; fit scores persisted at transitions. BI itself is a canonical
   prospect STORE + lifecycle engine (`prospectStore.ts` +
   `prospectLifecycle.ts`): deterministic discovery runs, candidate dedupe by
   normalized brand key, sticky operator disqualification, run/change/snapshot
   history, `lastChecked`/`nextCheck` (+7d).
7. In-memory demo store as the default single source with optional Supabase
   dual-write.
8. Deterministic scenario engine for provider-workflow simulation with
   networkCalls===0 proofs.
9. ONE runtime BI universe: Admin panel, Brand "Market Intel", and the
   MarketingHub identity bridge all read `getProspects()` — no second literal.
10. Rocket.Chat removed end-to-end (Phase D1, 2026-09-11): 3 files deleted, the
    registry card / `IntegrationId` member / nav entry / admin panel / breadcrumb
    / docker-compose service + volume / Caddy vhost removed. The simulation CASE
    scenario now requires NO external provider (it drives the internal helpdesk
    ticket store), and the provider safety gate was NOT weakened — proven by
    `scripts/validate-rocketchat-removal.mjs` (NORMAL_PO still refuses when its
    providers are not positively `simulation`).
11. BI intelligence is read BY REFERENCE (`prospectIntelligence.ts`, Phase D2).
    The acquisition layer holds only the canonical `prospectId`; ASINs, contacts,
    distributors, wholesale, restrictions, growth signals, evidence/provenance,
    the seven score factors and lifecycle/history are resolved live from the
    canonical BI record. Nothing copies them into a second store, so nothing can
    drift. An unknown id returns `null` — never a fabricated prospect.
12. Outreach transport mode is RESOLVED, never caller-supplied (Phase D3):
    `resolveOutreachTransport()` derives it from the canonical integration mode
    model, and `sendOutreach()` fails closed — a `live` claim without verified
    credentials is refused and audited. Simulation is the deterministic default
    (zero network) for every non-live state; `UNKNOWN ≠ LIVE`; a live send is
    never fabricated, and the record id is workflow-owned so no revision can be
    silently overwritten.
13. The opportunity → brand onboarding hand-off (Phase E1) is owned by
    `src/lib/onboarding/onboardingLifecycle.ts`: `qualified`/`won` only, one
    canonical onboarding record per opportunity (idempotent by canonical id),
    strictly ordered steps, completion as a distinct explicit act, RBAC and audit
    in the domain, and persistence through the SAME domain port
    (`DOMAIN_TABLES.brandOnboarding`) — with a brand-isolation RLS policy in
    `supabase/migrations/021_create_brand_onboarding.sql`.

## AE. Known Limitations / Caveats

- **Persistence (Phase D4, 2026-09-11).** Domain state now mirrors through ONE
  persistence port (`src/data/domainRepository.ts`): a **memory adapter**
  (deterministic, ZERO network, honest `durable:false`) and a **Supabase
  adapter** (the existing client; idempotent upsert on the artefact's canonical
  id; tenant-scoped reads; explicit failures). It covers the Phase C acquisition
  artefacts (outreach revisions, responses, opportunities, acquisition events)
  and the BI lifecycle history (prospect updates, runs, change events,
  snapshots), and the durable schema is
  `supabase/migrations/020_create_acquisition_persistence.sql` (8 tables, RLS +
  a brand-isolation policy). **Honest state in the demo/demo-deploy environment:
  browser Supabase credentials are NOT configured, so the memory adapter is
  active and NOTHING is durable there** — the store reports `memory-only` and the
  Brand CRM surfaces that honestly; it never claims persistence it lacks. A full
  browser reload therefore still resets acquisition state (the BI universe
  re-boots from its deterministic real-brand seeds). The durable path is proven
  with an injected conformance repository, not against a live project; the
  migration is unexecuted.
- Live Edge Functions for SP-API/DHL/Companies House/HMRC/email are absent from
  the repo (deploy-time infra) — the live switch would 404 until deployed;
  nothing claims otherwise.
- `outreachGenerator.ts` is **no longer dead code** — Phase C wired it into
  `prepareOutreach` (it is the canonical BI-evidence outreach copy source).
  `XeroConnection.tsx` remains a dead-code candidate.
- BI canonical universe is the authoritative seeded prospect set (12 tracked /
  10 active) with full run/change/snapshot history; `source:'mock'` only means
  "no live provider produced this" — real providers behind the same client seam
  are a live-seam concern, not a data-classification blocker. **The ten brands
  are REAL BUSINESS ENTITIES: never reinterpret them as fake brands because the
  provider is deterministic.**
- Acquisition (Phase C) is real and operable: BI → ICP (same `prospectId`) →
  outreach prepared from BI evidence → MODIFY/APPROVE/REJECT → simulated send →
  response → Opportunity → CRM relationship context, with RBAC + audit +
  `networkCalls === 0` proven by `validate-acquisition-pipeline.mjs`.
- **Known gaps after Phase C:** no live provider send was exercised; acquisition
  state is session-only (partially addressed by D4); `Opportunity.brandId` is now
  wired through the **opportunity → brand-onboarding hand-off (Phase E1)** — the
  still-missing entry point is the marketing application-approval path (E2); BI
  discovery runs remain operator-triggered (no scheduler exists and none is
  claimed); campaign performance stats and monitoring health remain seeded
  (flagged).
- **Phase D2 (2026-09-11) closed the BI-information-loss gap**: acquisition now
  reads the canonical BI intelligence by reference (`prospectIntelligence.ts`) and
  the operator surface shows it. Still true: acquisition artefacts (outreach
  revisions, the `intelligenceRef`, responses, opportunities) are session-only —
  D4. A tracked out-of-scope single-source-of-truth finding remains:
  `src/components/shared/BrandComm.tsx` (`brandInboxAddress`) re-implements the
  placeholder-slug derivation with a weaker regex; deliberately not changed in D2.
- `validate-edge-functions.mjs` is stale (crashes: expects absent functions) —
  needs repair-or-retire evaluation.
- No live credentials configured for real providers; demo/sandbox paths used.
  Simulation never requires credentials and never calls the network.

## AF. Current Project Status Pointer

→ **PROJECT_STATUS.md** — the operational cross-chat handoff. It contains the
current state checklist, decision log, phase checkpoints, known issues and
deferred work. Read it first in any fresh session, then verify against source
(current source + Git + test evidence win over any document).