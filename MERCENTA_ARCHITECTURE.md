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
  hooks), `prospectStore.ts` (canonical BI prospect universe + run/change/
  snapshot history), `demoData.ts` / `brandDossiers.ts` / `brandProspectSeed.ts` /
  `brandExtraSeed.ts` (canonical demo/prospect fixtures).
- `src/lib/` — domain libs: spapi, dhl, compliance, billing, crm, helpdesk,
  intelligence (incl. `prospectPipeline.ts` identity bridge +
  `prospectLifecycle.ts` lifecycle engine), discovery, research, marketing,
  rocketchat, postiz, whatsapp, mail, messaging, monitoring, automation,
  events, simulation, verification, shipping, warehouse, esign, grants,
  notifications.
- `src/integrations/` — registry (19 providers) + IntegrationsContext (connect
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

- Registry (`src/integrations/registry.ts`) — 19 providers: `amazon_sp_api`,
  `amazon_ads`, `stripe`, `esignature`, `email`, `lead_sourcing`, `openrouter`,
  `hunter`, `instantly`, `keepa`, `firecrawl`, `usertour`, `rocketchat`,
  `twilio_whatsapp`, `postiz`, `dhl`, `xero`, `companies_house`, `hmrc`.
- Default modes: `simulation` (amazon_sp_api, stripe, usertour, rocketchat,
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

- `Lead` (ICP pipeline) — now carries optional `prospectId` (canonical BI link).
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
- `APPROVED_CATEGORIES` — single shared constant (mirrored as a DB CHECK).
- Demo fixtures (`demoData.ts`, `brandProspectSeed.ts`, `brandExtraSeed.ts`,
  `bootstrap.ts` INITIAL_LEADS) derive from the same schema so they cannot drift.

## 11. BI → ICP Pipeline (Phase A/B)

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
   │    · deriveLeadFromProspect(prospect, region) — never invents an origin
   ▼
ICP lead (Lead.prospectId = prospect.id)   →   scoreLeadFit → threshold-70
   →  shouldAutoEnroll → 'Sequenced' (fitScore persisted at transition)
   →  (future) outreach → opportunity → CRM
```

Wiring: MarketingHub CSV import + discovery enrollment link leads to the
canonical BI universe via the store (single source — no second literal);
the seeded `INITIAL_LEADS` (8) stay unlinked demo fixtures (verified no
false-positive collisions). Phase C replaces the mock acquisition universe
with BI-derived real prospects.

## 12. Major Contracts

- `logMessage(msg): Promise<Message>` — THE message write path.
- `runDiscoveryPipeline(...)` — discovery→research→enrich→email→lint→enrol.
- `scoreLeadFit(lead, icp)` / `shouldAutoEnroll(fit, stage)` — deterministic ICP.
- `demoStore` arrays + `GlobalStateContext` `updateLeadStatus(id, status, fit?)`.
- Provider factory seams (SP-API/DHL/CH/HMRC trio) — mock & real, same signatures.
- BI bridge (`matchLeadsToProspects`, `deriveLeadFromProspect`) — identity+fit truth.
- BI lifecycle (`runBrandIntelligence`, `disqualifyProspect`,
  `requalifyProspect`, `getPipelineStatus` over `prospectStore`) — canonical
  universe + run/change/snapshot history. All three consumers (Admin panel,
  Brand Market Intel, MarketingHub bridge) read ONE store.

## 13. Future Extension Points

- **Live BI provider seam:** the lifecycle runs through
  `createBrandIntelligenceClient()` — same signatures, mock today; a RealClient
  behind the seam activates live scoring without workflow changes. Candidate
  intake (`runBrandIntelligence({ candidates })`) is the wire for real
  discovery sources (firecrawl/keepa) once wired to BI.
- **ICP → acquisition (Phase C/D):** replace the seeded `INITIAL_LEADS`
  acquisition universe with BI-derived real prospects (store + bridge provide
  the identity seam); add contact/enrichment, approval, outreach sender,
  opportunity entity.
- **Postiz (Phase H):** expose the existing deployed app from Admin + Brand.
- **Rakazo (Phase M, LAST):** approved-contract read of MERCENTA state, permitted
  actions, human approval CTA, MERCENTA-authoritative mutation + audit. Keep
  independence; direct Admin controls retained.
- **Rocket.Chat:** remove (no expansion).