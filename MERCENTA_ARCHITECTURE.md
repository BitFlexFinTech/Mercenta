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
  discovery, research, marketing, whatsapp, mail, messaging,
  monitoring, automation, events, simulation, verification, shipping, warehouse,
  esign, grants, notifications.
- `src/integrations/` — registry (22 providers — Rocket.Chat removed in Phase
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

- Registry (`src/integrations/registry.ts`) — 22 providers: `amazon_sp_api`,
  `amazon_ads`, `stripe`, `esignature`, `email`, `lead_sourcing`, `openrouter`,
  `hunter`, `instantly`, `keepa`, `firecrawl`, `usertour`,
  `twilio_whatsapp`, `dhl`, `palletline`, `xero`,
  `companies_house`, `hmrc`, `wise`, `payoneer`, `google`. This list mirrors
  `INTEGRATION_ORDER` (single source of truth). Rocket.Chat was removed in
  Phase D1 (19 → 18); Phase 1 (2026-09-16) reconciled this doc to the actual
  `INTEGRATION_ORDER` (22) and added the Amazon Ads dashboard (§12).
  **§BATCH 5 (2026-10-10) — `postiz` was REMOVED with the Mercenta Social feature
  (owner directive: remove it completely), so the registry is now 21 providers.**
- Default modes: `simulation` (amazon_sp_api, stripe, usertour,
  dhl, xero, companies_house, hmrc) · `available` (amazon_ads, esignature,
  email, lead_sourcing, openrouter, hunter, instantly, keepa, firecrawl,
  twilio_whatsapp). Rakazo is NOT in the registry.
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
  migration `021_create_brand_onboarding.sql`). **Phase E2 adds** the two other
  real entry points (`beginOnboardingFromApplication`,
  `beginOnboardingForManualBrand`), brand acceptance (`acceptOnboarding`), the
  tenant-pinned actor guard (`OnboardingActor.tenantId` → `CROSS_TENANT`), the
  tenant lookup (`getOnboardingForTenant`) and the admin read model
  (`listOnboardingPipeline`). UI: **`OnboardingPipeline.tsx`** (Admin → Brands →
  Onboarding) operates it inline; the brand portal reaches a canonical tenant through
  `GlobalStateContext.activateOnboardingBrand`.

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
- **Phase E1 + E2 — onboarding (2026-09-11; E1 `0568e2a`, E2 `08a575c`):** ✅ E1 the opportunity → brand
  onboarding hand-off — canonical `BrandOnboarding` (keyed by the canonical
  prospect id), DERIVED tenant id, `Opportunity.brandId` set, strictly ordered
  steps with explicit completion, RBAC + audit in the domain, the EXISTING
  persistence port extended with `brand_onboarding` and migration
  `021_create_brand_onboarding.sql` (RLS + brand isolation) · ✅ E2 the onboarding
  WORKFLOW — three real entry points (opportunity / approved application / manual
  creation), brand acceptance, tenant-pinned actor guard, the Admin Onboarding
  Pipeline (`OnboardingPipeline.tsx`) and portal reachability for a canonical
  tenant (`activateOnboardingBrand`). **Still remaining:** E3–E7 (catalog,
  commerce simulation, admin/brand operational surfaces — §BATCH 5 (2026-10-10)
  later REMOVED the fourth item, the embedded Postiz engine), and
  resolving the deliberate `brandProfile.onboarded` vs canonical-status seam.
  Also still remaining from D4: run the migrations + exercise the durable path
  against a credentialed Supabase project (never executed here).
- **Phase E3 — catalog / product management (2026-09-12; commit `f86d8c7`):** ✅ the
  canonical product lifecycle — `Product` is the ONE declaration, `ProductSubmission`
  the ONE submission shape, `src/lib/catalog/productCompleteness.ts` the ONE
  prerequisite list, `src/lib/catalog/catalogLifecycle.ts` the tenant-pinned
  `CatalogActor` domain (RBAC + tenant isolation in the domain); the EXISTING
  `api.submitCatalogItem` seam records the resulting submission with truthful
  `mode`/`simulated` provenance; readiness derives from completeness + the EXISTING
  compliance gate; D4 port extended with `catalog_submissions` and migration
  `022_create_catalog_persistence.sql` (RLS + brand isolation).
- **Phase E4 — commerce / Amazon-style operational simulation (2026-09-12):** ✅ the
  OPERATIONAL commerce lifecycle —
  `src/lib/commerce/commerceLifecycle.ts` is the ONE new domain module
  (tenant-pinned `CommerceActor`, RBAC + tenant isolation in the domain,
  deterministic idempotent ids, persistence mirror, audit on the existing log).
  It REUSES the existing operational vocabulary: `PurchaseOrder`
  (+`PurchaseOrderStatus`), `PurchaseOrderLineItem`, `Shipment` (existing 6-stage
  freight track), `Deduction` (chargebacks/disputes), the ASN seam
  (`createShipmentForPO`), delivery reconciliation (`reconcileDelivery`), the
  helpdesk case model and the platform audit log. New canonical types
  (`CommerceActivity`, `CommerceEligibility`, `CommerceInvoice`, `CommercePayment`,
  `CommerceMode`, `CommerceActivityType`) are declared ONCE; PO/Deduction gain only
  OPTIONAL provenance. **Eligibility is DERIVED from E3** (readiness + latest
  submission) — no second compliance system. **Simulation-safe PO creation**
  (`createSimulatedPurchaseOrder`) is a SEPARATE, email-free/provider-free path;
  `createPurchaseOrder`'s real Postmark behaviour is untouched. Persistence: D4
  port extended + `supabase/migrations/023_create_commerce_persistence.sql`
  (additive, 4 tables, RLS + brand isolation, **NOT executed**). Every record is
  explicitly `mode:'simulation'`/`simulated:true`; UNKNOWN is never simulation-safe;
  zero external network calls. Validator 108/108 · E2E spec 4/4 · full E2E 189/0/4.
- **Phase E7 — embedded Mercenta Social / full Postiz application (2026-09-12):**
  **§BATCH 5 (2026-10-10) — ⛔ SUPERSEDED: MERCENTA SOCIAL WAS REMOVED COMPLETELY.**
  Every artefact this entry describes (`src/config/mercentaSocial.ts`,
  `src/lib/social/**`, `src/components/brand/MercentaSocial.tsx`, the admin control
  centre in `PostizAdminPanel.tsx`, the engine client `src/lib/postiz/**`, the
  `social-session` Edge Function, `scripts/social-sso/`, `docker-compose.services.yml`'s
  Postiz services and the Caddy engine vhost) was DELETED, and the feature's ABSENCE is
  asserted by `scripts/validate-retired-platforms.mjs` §2c, `scripts/validate-d4-persistence.mjs`
  (O1/O2) and `e2e/retired-platforms.spec.ts`. The text below is the HISTORICAL record.
  ✅ (as built then):
  the COMPLETE deployed engine (Postiz **v1.47.0**, container `root-postiz-1` on
  `mercenta-services`) is exposed to every approved brand as **MERCENTA SOCIAL**.
  New: `src/config/mercentaSocial.ts` (identity SSOT: 8 brand modules, 35 verified
  providers, blocked commercial paths, verified engine facts, 6 findings),
  `src/lib/social/workspace.ts` (deterministic `msoc-<fnv1a32(tenant)>` identity,
  idempotent provisioning, fail-closed access gate, domain-enforced tenant
  isolation), `src/lib/social/brandStatus.ts` (canonical status mapping),
  `src/components/brand/MercentaSocial.tsx` (the brand surface), and the admin
  integration control centre inside the EXISTING `PostizAdminPanel`. The brand nav
  label comes from the SSOT. **No migration, no second social platform, no new store
  duplicating an engine entity, no deployment.** HONEST: the engine's API is down
  (502 — Temporal missing) so the engine link is NOT established
  (`engineLinked:false`, simulated) and connecting/publishing remain blocked by the
  deployment; workspace records are in-memory (`durable:false`). Validator 96/96 ·
  E7 spec 9/9 · full E2E 207/0/4 · validators 37 PASS/15 FAIL vs pre-E7 36/15
  (0 regressions). **NEXT: Final UI/UX redesign.**
- **Phase E6 — brand operational surfaces (2026-09-12):** ✅ the BRAND side reached
  parity with the canonical domain, by EXTENDING existing files only (no new
  store/dashboard/CRM/catalog/PO/ticketing/billing system, no new lifecycle
  function, no navigation change, no migration). **G1** the brand PO list marks
  simulated POs `(sim)` from the canonical `po.simulated` flag (Badge only; the E4
  console stays last in `BrandPurchaseOrders`). **G2** the brand dashboard appended
  two canonically-derived attention groups — issued-unpaid simulated invoices
  (`commerce-inv-*`, from `demoCommerceInvoices` minus `demoCommercePayments`) and
  simulated delivered-awaiting-invoice POs (`commerce-po-inv-*`) — plus canonical
  `(sim)` on simulated deduction rows; existing row order, the pinned first
  `unacked-*` row, the six KPI ids and `po-summary-*` are unchanged. **G3** the
  brand catalog's duplicate last-wins submission map was replaced by the canonical
  `demoStore.latestSubmissionForProduct` (the same helper both admin surfaces use
  after E5 G9). **G4** the `deduction` notification kind appends `· (sim)` from
  `Deduction.simulated`. The E6 validator additionally proves SOURCE scope — no
  protected path (BI, Postiz, Rocket.Chat, Rakazo, real provider clients,
  `createPurchaseOrder`'s email path, migrations) is in the change set. Validator
  41/41 · E2E spec 5/5 · full E2E 198/0/4 · all 50 legacy validators byte-identical.
- **Phase E5 — admin operational surfaces (2026-09-12):** ✅ the canonical E1–E4
  domain state is now coherently ADMIN-facing, by EXTENDING existing surfaces only
  (no new store/dashboard/CRM/PO/catalogue/ticketing/billing system, no migration).
  `CommerceOperationsPanel` is OPERABLE through the EXISTING `commerceLifecycle` +
  `CommerceActor` (RBAC/tenant in the domain); truthful `(sim)` provenance on the
  admin PO list, Retail Pipeline, Logistics Control and the commerce panel; the
  admin PO-create action (real email) and catalog availability/price mutations now
  honour the staff permission tier (`createPurchaseOrder`'s email implementation
  untouched); `NotificationCenter` gained ONE canonical `commerce` kind; the
  previously unreachable `openCommerceCase` is surfaced on the existing helpdesk
  model; the duplicated latest-submission derivation now uses the canonical
  `demoStore.latestSubmissionForProduct`. TWO REAL DEFECTS FIXED: Logistics
  Control's PO column always rendered `—` (shipment id compared against PO ids →
  now the canonical `poNumber`), and the "POs in fulfilment"/"Fulfilment in motion"
  drill-downs pointed at the brand SCORING surface (Fulfillment Track) instead of
  shipments (now Logistics Control). Validator 48/48 · E2E spec 4/4 · full E2E
  193/0/4 · all 49 legacy validators byte-identical.
- **Postiz / Mercenta Social (E7 — DONE 2026-09-12):** the existing deployed app IS
  exposed, from Brand (`MercentaSocial`, the existing BrandShell 'social' entry) and
  from Admin (the existing `PostizAdminPanel`). Postiz is the engine; **Mercenta
  Social** is the customer-facing product. Mercenta owns identity, entitlement,
  tenancy, provisioning, the commercial boundary and the integration layer; the
  engine owns the application. Engine version **v1.47.0**; automatic deterministic
  and idempotent Brand → workspace provisioning; tenant isolation enforced in the
  domain. The engine's own API is currently down (502 — Temporal missing) so the
  engine link is not yet established and channel connect / publishing remain blocked
  by the deployment — reported, never faked.
- **Rakazo (Phase M, LAST):** approved-contract read of MERCENTA state, permitted
  actions, human approval CTA, MERCENTA-authoritative mutation + audit. Keep
  independence; direct Admin controls retained.
- **Rocket.Chat:** ✅ **REMOVED in Phase D1 (2026-09-11)** — files, registry
  card, `IntegrationId` member, nav entry/breadcrumb, admin panel, docker-compose
  service + Mongo volume and Caddy vhost deleted. Regression-guarded by
  `e2e/rocketchat-removal.spec.ts` + `scripts/validate-rocketchat-removal.mjs`.

## 13. M2 / M6 / M7 additions (14 Sep 2026)

| Area | Module | What it adds | Seam discipline |
|---|---|---|---|
| Compliance document verification (M2) | `src/lib/verification/documentVerification.ts` | `DocumentVerificationRecord` ledger, `rejected`/`superseded` states, versioning + replacement, submission → pending → verdict → gate | four interchangeable providers; `external: false` unless a third party actually answered; fail-closed for every other mode |
| Requirement rules (M2) | `src/lib/compliance.ts` | universal + conditional requirement RULES with stated conditions; `latestDocumentsByType` so the gate judges the latest version | one canonical rule set; existing counts unchanged |
| Money flow (M6) | `src/lib/finance/financialReconciliation.ts` | one deterministic reconciliation per payment, `evaluatePayoutEligibility`, payout state machine, audited destination review | PO store = value source; `listCommissionsForPayout` = payable projection; `lib/billing/payouts.ts` = transfer seam |
| Accounting (M6) | `src/lib/finance/accountingSeam.ts` | reconciliation → accounting representation | simulation (zero network) / existing `src/services/xero` / fail-closed |
| VAT (M6) | `src/config/commercial.ts` | `configuration_required` until the business decision is entered | one config source; no invented tax result |
| Investor demo (M7) | `src/lib/simulation/investorDemo.ts` | 24 stages: the 22 canonical stages + `shipping_commercial` + `cases` | same orchestration; zero network; reset/replay digest identical |

New canonical entities (all additive in `src/types.ts`):
`DocumentVerificationRecord`, `PaymentReconciliation`, `BrandPayoutDestination`,
`CommissionPayout`, plus the `VatTreatment` / `PayoutState` /
`PaymentReconciliationState` / `DocumentVerificationStatus` unions and the
`rejected` + `superseded` document lifecycle states. **No new migration**: the
existing schema is unchanged (23 migrations).

  Not to be reintroduced.

---

## §P11 SUPERSESSION NOTE (2026-09-24) — the purchase-order ENTRY POINT

The phase records above (E4, E5) mention `createPurchaseOrder` and its Postmark
PO-notification behaviour. Those sentences are **historical records of what was
true then**; they are NOT the current architecture.

Programme **decision 3** (`docs/DASHBOARD_LOGISTICS_CLEANUP_PROGRAMME_2026-09-22.md`)
removed "Create PO" entirely — **one PO record = the PO from Amazon** — and P11
implemented it on 2026-09-24:

- **`src/lib/commerce/channelPurchaseOrderIngestion.ts` is the ONE PO entry point.**
  A channel PO is addressed to Mercenta; Mercenta routes it to the brand from the
  PO's **own lines** (vendor SKU, or ASIN once the product is accepted on the
  channel) and files it in that brand's workspace. It **fails closed**
  (`CHANNEL_PO_EMPTY`, `CHANNEL_PO_LINE_NOT_IN_CATALOGUE`,
  `CHANNEL_PO_CROSSES_TENANTS`) and is **idempotent** by channel PO number.
- **`createPurchaseOrder` and `src/lib/notifications/postmarkNotifier.ts` are
  DELETED.** The Postmark PO-notification seam existed only to announce an
  ADMIN-created PO; the canonical mock-first transactional-email seam is
  `src/lib/mail/**` (matrix `D14-04`).
- The **SP-API read** (`fetchPurchaseOrders`) returns the channel's own PO payload
  (identity, lines, declared FC, windows, `simulated`) in BOTH the real client and
  the mock; `createSimulatedPurchaseOrder` remains the scenario engine's
  simulation-only path.
- Evidence: `scripts/validate-channel-po-ingestion.mjs` (39 assertions, executes
  the real modules, zero network calls, proved able to fail),
  `e2e/channel-po-ingestion.spec.ts`, and the repointed gates
  `validate-e4` S1 / `validate-e5` J2 / `validate-e6` F2 / `validate-mock-seam`.
