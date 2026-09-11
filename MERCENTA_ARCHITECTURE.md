# MERCENTA_ARCHITECTURE.md

> **AI-VENDOR-NEUTRAL TECHNICAL ARCHITECTURE REFERENCE.**
>
> Portable technical reference for the MERCENTA platform, derived from direct
> repository inspection (last reconciled at Phase A — 2026-09-10). This file is
> the canonical technical reference; `docs/ARCHITECTURE.md` is retained as a
> historical document and its stale claims (e.g. the old 27-error typecheck
> note) are superseded by this file and by current source. Current source +
> Git + test evidence always win.
>
> Companion: **MERCENTA_MASTER_CONTEXT.md** (business/strategy constitution) and
> **PROJECT_STATUS.md** (operational handoff).

---

## 1. Stack (verified)

| Layer | Choice |
|---|---|
| Framework | React 18.3 |
| Language | TypeScript 5.5 (strict) |
| Build | Vite 5.4, manual chunks + code-split shells via `React.lazy()` |
| Styling | Tailwind CSS 3.4 (tokens in `tailwind.config.js`) |
| State | React Context (`GlobalStateContext`) + TanStack Query 5 |
| Charts | Recharts 3.10 (lazy vendor chunk) |
| Icons | Lucide 0.446 |
| Fonts | IBM Plex Sans, Fraunces (display), IBM Plex Mono |
| Validation | Zod 4.5 |
| Monitoring | Sentry (deferred / non-blocking) |
| Backend | Supabase 2.57 (partial; demoStore fallback) |
| Tests | Playwright 1.62 + `scripts/validate-*.mjs` validators (vite ssrLoadModule) |

## 2. Routing / Shells

No client-side URL router — navigation is state-driven (`environment` + `view`
in `GlobalStateContext`):

```
App.tsx
├── home/login → HomeShell   (marketing / auth / partner application)
├── brand     → BrandShell   (15 views; LiveChatWidget + TourLoader always mounted)
├── admin     → AdminShell   (sections incl. Super Admin sub-tabs)
└── carrier   → CarrierShell (3 views, IntegrationsProvider-wrapped)
```

## 3. Domain Boundaries

- `src/data/` — `api.ts` (contract layer), `demoStore.ts` (in-memory demo
  single source in demo mode), `bootstrap.ts` (seed), `queries.ts` (TanStack
  hooks + `useCanonicalStoreVersion()`), `prospectStore.ts` (canonical BI
  prospect universe + run/change/snapshot history + the canonical change
  signal), `acquisitionStore.ts` (§Phase C outreach revisions / responses /
  opportunities / acquisition events, keyed by the canonical prospect id, plus
  the §Phase E1 canonical onboarding records),
  `domainRepository.ts` (**§Phase D4 — the persistence port**: one interface,
  a memory adapter (deterministic, ZERO network, `durable:false`) and a Supabase
  adapter (idempotent upsert by canonical id, tenant-scoped, explicit failures),
  plus `createPersistenceMirror()` — the shared honest persistence status; §Phase
  E1 added the `brand_onboarding` artefact and `brand_onboarding` in hydrate),
  `demoData.ts` / `brandDossiers.ts` / `brandProspectSeed.ts` /
  `brandExtraSeed.ts` (canonical demo/prospect fixtures).
- `src/lib/` — domain libs: spapi, dhl, compliance, billing, crm, helpdesk,
  intelligence (incl. `prospectPipeline.ts` identity bridge + origin-region
  derivation, `prospectLifecycle.ts` lifecycle engine, and **
  `prospectIntelligence.ts` — the Phase D2 canonical BI-intelligence read layer
  used by acquisition**), **acquisition
  (`outreachLifecycle.ts` state machine + `outreachSender.ts` transport seam)**,
  **onboarding (`onboardingLifecycle.ts` — §Phase E1 opportunity → tenant
  hand-off)**,
  discovery, research, marketing, postiz, whatsapp, mail, messaging,
  monitoring, automation, events, simulation, verification, shipping, warehouse,
  esign, grants, notifications.
- `src/integrations/` — registry (18 providers — Rocket.Chat removed in Phase
  D1) + IntegrationsContext (connect
  state, sandbox flag, per-card simulation controls).
- `src/services/xero/` — real OAuth v2 client + sync engine (demo mode).
- `src/context/GlobalStateContext.tsx` — session, role, tenant pin, domain arrays.

## 4. Core Data Flow

```
USER ACTION
→ MERCENTA DOMAIN WORKFLOW
→ PROVIDER CONTRACT
→ SIMULATION ADAPTER OR LIVE ADAPTER
→ PROVIDER RESPONSE / EVENT
→ MERCENTA DOMAIN PROCESSING
→ STATE TRANSITION
→ AUDIT / EVENT
→ NOTIFICATION
→ RECONCILIATION / FOLLOW-UP
→ UI
```

Simulation executes the same MERCENTA domain workflow as live operation; only
the provider adapter/mode changes.

## 5. Provider Boundaries + Mode Model

- Registry (`src/integrations/registry.ts`) — 18 providers: `amazon_sp_api`,
  `amazon_ads`, `stripe`, `esignature`, `email`, `lead_sourcing`, `openrouter`,
  `hunter`, `instantly`, `keepa`, `firecrawl`, `usertour`,
  `twilio_whatsapp`, `postiz`, `dhl`, `xero`, `companies_house`, `hmrc`.
  (`rocketchat` was removed in Phase D1 — 19 → 18.)
- Default modes: `simulation` (amazon_sp_api, stripe, usertour,
  dhl, xero, companies_house, hmrc) · `available` (amazon_ads, esignature,
  email, lead_sourcing, openrouter, hunter, instantly, keepa, firecrawl,
  twilio_whatsapp, postiz). Rakazo is NOT in the registry.
- Each provider behind Mock*/Real* seam with identical signatures. `UNKNOWN ≠
  SIMULATION`: only an explicit `simulation` mode may simulate; every other
  state (unknown/unregistered/unconfigured/disabled/configuring/live/degraded/
  error) must never silently fall back to simulation.
- Provider trios verified: SP-API, DHL logistics, Companies House, HMRC (mock
  adapters + real seam); scenario engine (`src/lib/simulation/scenarioEngine.ts`)
  with `networkCalls===0` proofs.
- Caveat: live Edge Functions (SP-API `/functions/v1/spapi/*`, DHL/CH/HMRC,
  send-email/esign) are absent from the repo — deploy-time infra. The live
  switch 404s until deployed; simulation is unaffected.

## 6. Persistence Model

- **Demo/seed (default):** in-memory `demoStore` is the single source; reload
  resets by documented contract.
- **Optional live:** Supabase dual-write on key entities (messages, homepage
  content, POs via api layer). No component depends on which mode is active.
- `logMessage` is the single message write path → `demoMessages` (canonical).
- `demoAuditLog` is the platform-wide audit action registry.

## 7. Integrations

- `IntegrationsContext` — `startConnect / failConnect / completeSandboxConnect /
  completeApiKeyConnect / oauthCodeReceived / disconnect`; `sandbox` flag;
  `isConnected()` = non-sandbox only.
- Mock-first policy: missing real credentials never blocks building; Real*Client
  activates by entering credentials with ZERO code changes elsewhere.
- Mock values are unmistakable (fake tokens, "(Mock)" labels).

## 8. Security

- Supabase RLS; brand identity derived from verified JWT, never from request
  body alone (cross-tenant write vectors rejected with 403).
- Edge functions return 401 before any DB access on missing/expired tokens.
- Secrets in `.env` (gitignored) / secret-store refs — never committed.

## 9. RBAC / Tenant Model

- Enforcement chain: `tierForRole` → `canAccessEnvironment` →
  `canAccessView` (VIEW_ALLOWLIST) → `filterNavForTier`.
- Tenant pinning: `assertBrandScope` / `isCrossTenantAccess`; staff mutation
  gating via `staffCanMutate`; acting-staff identity drives RBAC tier.
- Shared components must be tenant-scoped by explicit brandId/tenantId filters.

## 10. Canonical Entities (single source: `src/types.ts`)

- `Lead` (ICP pipeline) — carries optional `prospectId` (canonical BI link);
  `region` is `LeadRegion` = `us|eu|uk|africa|canada` (`uk` added in Phase C).
- `BrandProspect` (BI) + `ProspectASIN/Contact/Distributor/Restriction/Evidence/
  Score` + `IntelligenceDashboard/PipelineConfig`.
- `Message` (canonical conversation), `Ticket` (helpdesk, references messageIds),
  `BrandCrmMeta/CrmTask/CrmNote` (CRM), `Campaign`, `StaffMember`, `Product`,
  `PurchaseOrder`, `Shipment`, `ComplianceDocument`, `Contract`,
  `BrandProfile`, `FinancialRecord`, `ActivityLog`, `ApiLogEntry`.
- BI lifecycle (`src/data/prospectStore.ts` + `src/lib/intelligence/prospectLifecycle.ts`):
  `IntelligenceRun` (discovery-run history), `ProspectChangeEvent` (audited
  per-prospect changes), `IntelligenceSnapshot` (score-over-time),
  `IntelligencePipelineStatus`, `BrandProspect.lastChecked/nextCheck`.
- **§Phase C acquisition** (`src/data/acquisitionStore.ts` +
  `src/lib/acquisition/*`): `ProspectOutreachRecord` (approval + revision state,
  `OutreachApprovalStatus`, `evidenceSummary`, `transport`), `OutreachResponse`,
  `Opportunity` (`OpportunityStage`, BI score/tier snapshot), `AcquisitionEvent`,
  `AcquisitionRelationship`, `AcquisitionPipelineSummary`.
- `APPROVED_CATEGORIES` — single shared constant (mirrored as a DB CHECK).
- Demo fixtures (`demoData.ts`, `brandProspectSeed.ts`, `brandExtraSeed.ts`,
  `bootstrap.ts` INITIAL_LEADS) derive from the same schema so they cannot
  drift. **`INITIAL_LEADS` is a validation fixture only — the ACTIVE ICP
  acquisition universe is derived from the BI store (Phase C).**

## 11. BI → ICP → Acquisition Pipeline (Phase A/B/C)

```
Brand Intelligence — canonical prospect store (12 prospects, 10 active;
   seeded authoritative universe, booted once per session)
   │  runBrandIntelligence()  ← lifecycle engine (discovery runs, candidate
   │    intake + canonical dedupe, sticky operator disqualify/requalify,
   │    lastChecked/nextCheck +7d, run/change/snapshot history)
   ▼
canonical prospect (BrandProspect)   provenance: IntelligenceRun /
   │    ProspectChangeEvent / IntelligenceSnapshot — "previous searches never disappear"
   │  src/lib/intelligence/prospectPipeline.ts  ← canonical identity bridge
   │    · matchLeadToProspect / matchLeadsToProspects (deterministic brand key)
   │    · buildAcquisitionLead + deriveIcpOriginRegion (ICP_REGION_BY_COUNTRY)
   ▼
ICP lead (Lead.id = lead-<prospect.id>, Lead.prospectId = prospect.id)
   →  scoreLeadFit → threshold-70 → shouldAutoEnroll → 'Sequenced'
   ▼
§Phase C acquisition (src/lib/acquisition/outreachLifecycle.ts + acquisitionStore.ts)
   §Phase D2 intelligence access — src/lib/intelligence/prospectIntelligence.ts
     · reads the canonical prospect BY REFERENCE (ASINs + per-ASIN metrics,
       contacts, distributors, wholesale, restrictions, growth signals, full
       evidence/provenance, the 7 score factors, lifecycle/history)
     · NEVER copies the intelligence into a second record (a mutation in BI is
       immediately visible downstream — proven by the D2 gate)
   prepareOutreach (BI evidence via outreachGenerator, stored on the record)
     →  revision stores `intelligenceRef` (ids + counts + BI score snapshot)
   →  modify / approve / reject  (human approval, audited)
   →  sendOutreach(transport)    (simulation default; connected provider via the same seam)
   →  recordResponse             (classifyInboundReply → wantsHuman)
   →  Opportunity (opp-<prospect.id>, BI score/tier snapshot)
   →  CRM relationship context   (BrandCRM → Acquisition Relationships)
   →  (Phase D5) application → onboarding → Opportunity.brandId set
```

Wiring: the ACTIVE acquisition universe is `prospectStore.getAcquisitionLeads()`
(Phase C); the seeded `INITIAL_LEADS` (8) fixture stays for validation only
(verified: no company overlap, no false-positive links). Every acquisition
artefact is keyed by the canonical prospect id, and every downstream transition
is written back to the canonical prospect through `setProspectOutreachStatus()`,
so BI remains the single source of truth. Acquisition communication uses the ONE
canonical message store (`logMessage` → `demoMessages`), never a second one.
Intelligence is never re-stored downstream: `prospectIntelligence.ts` (Phase D2)
resolves it from the canonical record on every read, from any artefact that
carries a `prospectId`.

## 12. Major Contracts

- `logMessage(msg): Promise<Message>` — THE message write path.
- `runDiscoveryPipeline(...)` — discovery→research→enrich→email→lint→enrol.
- `scoreLeadFit(lead, icp)` / `shouldAutoEnroll(fit, stage)` — deterministic ICP.
- `demoStore` arrays + `GlobalStateContext` `updateLeadStatus(id, status, fit?)`
  (BI-linked leads project the stage onto the canonical prospect) and
  `refreshLeadsFromProspects()`.
- Provider factory seams (SP-API/DHL/CH/HMRC trio) — mock & real, same signatures.
- **Domain persistence port (§Phase D4 — `src/data/domainRepository.ts`)** —
  `DomainRepository` (`persistOutreach/Response/Opportunity/Event/Prospect/Run/`
  `Change/Snapshot`, `hydrate(scope)`, `flush()`, `backend`, `durable`);
  `createDomainRepository()` selects Supabase when `isSupabaseConfigured` else
  the memory adapter; `getDomainRepository()`/`setDomainRepository()`.
  `TenantScope = {kind:'ops'} | {kind:'brand', tenantId}` — a brand scope can
  never see ops/another tenant's rows. `createPersistenceMirror()` gives the
  honest status (`memory-only`/`pending`/`durable`/`failed`) shared by
  `acquisitionStore` and `prospectStore`; `sendOutreach()`/`recordResponse()`
  await the persistence outcome before returning. Reload =
  `hydrateAcquisitionFromPersistence()` / `hydrateProspectStoreFromPersistence()`.
- BI bridge (`matchLeadsToProspects`, `deriveLeadFromProspect`,
  `buildAcquisitionLead`, `deriveIcpOriginRegion`) — identity + region truth.
- BI lifecycle (`runBrandIntelligence`, `disqualifyProspect`,
  `requalifyProspect`, `setProspectOutreachStatus`, `getPipelineStatus` over
  `prospectStore`) — canonical universe + run/change/snapshot history. All
  consumers (Admin panel, Brand Market Intel, MarketingHub bridge, acquisition
  pipeline, CRM) read ONE store.
- **BI intelligence access (Phase D2 — `src/lib/intelligence/prospectIntelligence.ts`)** —
  `getProspectIntelligence(prospectId)` → the canonical view (`null` when unknown),
  `getIntelligenceForLead/ForOutreach/ForResponse/ForOpportunity`,
  `intelligenceDigest` (counts + 7 score factors + 11 section states),
  `intelligenceProvenance` (run ids, timeline event ids, snapshot dates, evidence
  sources/URLs), `collectEvidence` (incl. nested section evidence),
  `buildIntelligenceRef(prospect, revision)`. `intelligence.prospect` is the LIVE
  canonical object; digest/provenance/lifecycle are point-in-time projections —
  hold the id and re-read.
- **Acquisition (`src/lib/acquisition/outreachLifecycle.ts`)** —
  `enrollProspect`, `prepareOutreach`, `modifyOutreach`, `approveOutreach`,
  `rejectOutreach`, `sendOutreach`, `recordResponse`, `simulateResponse`,
  `createOpportunityFromResponse`, `setOpportunityStage`,
  `getRelationshipContext`. Every mutator takes
  `AcquisitionActor { staffId, canMutate }` (RBAC in the domain) and returns
  `{ ok: true, value } | { ok: false, error }`.
- **Transport seam (`outreachSender.ts`)** — `OutreachTransport` (`mode`,
  `providerState`, `isVerifiedLive?()`) with `simulationOutreachTransport` (zero
  network), `transportFromEmailClient()` (reuses the existing email provider
  client) and **`resolveOutreachTransport(emailState, client)`** (Phase D3) — THE
  canonical resolution: mode derived from `modeForState` + the registry default,
  fail-closed (a `live` claim without verified credentials is downgraded), honest
  `providerState`. `sendOutreach()` refuses an unverifiable live claim.
- **Onboarding hand-off (`src/lib/onboarding/onboardingLifecycle.ts`, Phase E1)** —
  `beginBrandOnboarding(opportunityId, actor)` (qualified/won only; idempotent by
  canonical id `onb-<prospectId>`; derives the tenant id
  `brand-<normalizeBrandKey>`; refuses a tenant collision; SETS
  `Opportunity.brandId`), `completeOnboardingStep(onboardingId, stepId, actor, note?)`
  (strictly ordered `profile → legal_agreements → banking → carriers → compliance`),
  `finishBrandOnboarding(onboardingId, actor)` (refused while any step is
  outstanding), plus `onboardingIdFor`, `tenantIdForBrand`,
  `isOnboardingEligible`, `getOnboardingForProspect`. Same
  `AcquisitionActor`/`{ok,error}` contract as acquisition; RBAC and audit in the
  domain; persistence through the SAME port (`DOMAIN_TABLES.brandOnboarding`,
  migration `021_create_brand_onboarding.sql`).

## 13. Future Extension Points

- **Live BI provider seam:** the lifecycle runs through
  `createBrandIntelligenceClient()` — same signatures, mock today; a RealClient
  behind the seam activates live scoring without workflow changes. Candidate
  intake (`runBrandIntelligence({ candidates })`) is the wire for real
  discovery sources (firecrawl/keepa) once wired to BI.
- **Phase D — acquisition hardening:** ✅ D1 Rocket.Chat removal (2026-09-11) ·
  ✅ D2 BI intelligence preserved through acquisition by reference (2026-09-11) ·
  ✅ D3 outreach/provider hardening — resolved transport, fail-closed live gate,
  zero-network simulation (2026-09-11) · ✅ **D4 persistence / domain hardening**
  (2026-09-11) — a domain persistence port (`src/data/domainRepository.ts`) with an
  honest memory adapter and a Supabase adapter (idempotent by canonical id,
  tenant-scoped, explicit failures); acquisition + BI lifecycle write-through;
  `supabase/migrations/020_create_acquisition_persistence.sql` (8 tables, RLS).
- **Phase E1 — core-platform gap closure (2026-09-11, commit `0568e2a`):** ✅ the opportunity →
  brand onboarding hand-off — canonical `BrandOnboarding` (keyed by the canonical
  prospect id), DERIVED tenant id, `Opportunity.brandId` set, strictly ordered
  steps with explicit completion, RBAC + audit in the domain, the EXISTING
  persistence port extended with `brand_onboarding` and migration
  `021_create_brand_onboarding.sql` (RLS + brand isolation). **Still remaining:**
  link the brand-side wizard step state and route the marketing
  application-approval entry point through the SAME canonical record (E2), then
  E3–E7 (catalog, commerce simulation, admin/brand operational surfaces, embedded
  Postiz).
  Also still remaining from D4: run the migrations + exercise the durable path
  against a credentialed Supabase project (never executed here).
- **Postiz (Phase H):** expose the existing deployed app from Admin + Brand.
- **Rakazo (Phase M, LAST):** approved-contract read of MERCENTA state, permitted
  actions, human approval CTA, MERCENTA-authoritative mutation + audit. Keep
  independence; direct Admin controls retained.
- **Rocket.Chat:** ✅ **REMOVED in Phase D1 (2026-09-11)** — files, registry
  card, `IntegrationId` member, nav entry/breadcrumb, admin panel, docker-compose
  service + Mongo volume and Caddy vhost deleted. Regression-guarded by
  `e2e/rocketchat-removal.spec.ts` + `scripts/validate-rocketchat-removal.mjs`.
  Not to be reintroduced.