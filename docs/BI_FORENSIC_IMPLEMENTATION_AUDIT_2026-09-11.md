# MERCENTA — BRAND INTELLIGENCE FORENSIC IMPLEMENTATION AUDIT

**Date:** 2026-09-11
**Repository:** `/Users/tadii/Desktop/Mercenta`
**Branch / HEAD at audit time:** `redesign/foundation` · `b7cd0d4` (`phaseC: BI → ICP → outreach → approval → send → response → Opportunity → CRM`)
**Nature:** forensic, read-only implementation audit. **This session changed NO product code, configuration, schema, test, prompt, provider, UI, navigation, lifecycle, ICP, acquisition, CRM or outreach behaviour.** The only file created is this report (plus a temporary diagnostic script that was deleted — §28).
**Evidence classes:** `CODE` (file:line read this session) · `RUNTIME` (commands executed this session, output pasted) · `VALIDATOR` (`scripts/validate-*.mjs`) · `E2E` (Playwright) · `DOC` (documentation text).

---

## 1. Executive summary

### 1.1 The single most important finding

**Mercenta's Brand Intelligence system, as implemented today, is a deterministic, in-memory, seeded prospect-universe scorer with a real lifecycle ledger — and it has no live data source of any kind.**

The only data that ever enters BI is 12 hand-written records in two TypeScript files. Nothing is fetched. Nothing is scraped. No Amazon ASIN data is retrieved. No ASIN is discovered. No sales figure is retrieved from a provider. No contact is discovered. No company is enriched. The words "discovery", "enrichment", "Amazon UK", "LinkedIn" and "MerchantWords estimate" exist as labels on hard-coded literals.

Runtime proof (executed this session, §28):

- `node scripts/validate-bi-lifecycle.mjs` → **BI_LIFECYCLE_VALIDATION_PASS** with the assertion *"ZERO external network calls across all lifecycle operations"* (`externalFetches === 0`, with `globalThis.fetch` instrumented to fail on any attempt).
- Temporary read-only diagnostic (§28.3) loading the real modules through Vite SSR → **`EXTERNAL FETCHES DURING DIAGNOSTIC: 0`**, plus a dump of every field of every record, all identical to the literals in `src/data/brandProspectSeed.ts` / `brandExtraSeed.ts`.

### 1.2 What BI actually does, in one paragraph

`src/data/prospectStore.ts` boots **once per browser session** from `SEED_PROSPECTS` (3, `brandProspectSeed.ts`) + `EXTRA_PROSPECTS` (9, `brandExtraSeed.ts`) = **12 records (10 active, 2 disqualified)**, and immediately **re-scores every one of them** through `createBrandIntelligenceClient().scoreProspect()` → `scoringEngine.calculateScore()`. It records a synthetic origin run (`run-seed-baseline`, trigger `seed`) and one `created` change event per prospect. An operator can press **"Run discovery"** (Admin → Brands → Brand Intelligence), which calls `runBrandIntelligence({trigger:'manual'})`: the universe is re-scored again, `lastChecked`/`nextCheck (+7d)` are stamped, one `IntelligenceRun` and one `IntelligenceSnapshot` per prospect are appended, and change events are emitted only for records whose total score, evidence count, ASIN count or distributor count changed. With no candidate input — the only state the product ever passes — the run is a **no-op re-check**: *"Scanned 12. New 0. Updated 0. Disqualified 0. Unchanged 12."* Operators can **Disqualify** (sticky, audited) and **Requalify** (audited). The universe is then **projected into ICP leads** (`lead-<prospectId>`), which enter the Phase C acquisition workflow (prepare → modify → approve/reject → simulated send → simulated response → Opportunity → CRM relationship + one canonical message thread), with every downstream transition written back onto the BI record via `setProspectOutreachStatus()`.

### 1.3 What BI does **not** do (all verified, none inferred)

| Claimed capability (by name, docs or product vision) | Reality today | Evidence |
|---|---|---|
| Prospect/brand **discovery** | No discovery. The 12 brands are literals. `newCount > 0` requires a caller to pass `candidates`; **no product code path ever does** | `prospectLifecycle.ts:106-160`; only caller is the UI button with `{trigger:'manual'}` (`BrandIntelligencePanel.tsx:33`) |
| **Amazon / ASIN** intelligence | 14 hand-written ASIN objects across 12 brands; identifiers are synthetic (`B0HOT01`, `B0CLN01`…), not real Amazon ASINs, though `amazonUrl` is shaped like a real product URL | `brandProspectSeed.ts:23-41,62-63,83-84,101`; `brandExtraSeed.ts`; runtime dump §28.3 |
| ASIN **discovery** | `MockAmazonDataClientImpl.searchCategory()` returns `[]` unconditionally; the whole module has **zero callers** | `discoveryClient.ts:98-100,118-124`; grep count 0 |
| **Estimated sales/revenue** | Hard-coded integers on the ASIN literals (`estimatedSales: 3200`), attributed in evidence to *"MerchantWords estimate"* — **no MerchantWords client exists anywhere in the repo** | `brandProspectSeed.ts:38,62`; `grep -r MerchantWords src/` → only that file |
| **Contact discovery** | A `Map` built from the seed array (`BRAND_INDEX`) inside a module with **zero callers**; the send destination falls back to a `.example` TLD placeholder | `discoveryClient.ts:14-22,47-59`; `outreachLifecycle.ts:114-119`; E2E asserts the placeholder destination |
| **Company enrichment / website research** | Firecrawl + OpenRouter real clients exist (`src/lib/discovery`), Keepa real client exists (`src/lib/research/keepaClient.ts`) — **none is imported by any BI module** | grep of BI imports; §3.4 |
| **Scoring weights 25/20/15/15/10/10/5** | The engine **never applies the weights** — it sums raw sub-scores. `INTELLIGENCE_SCORE_WEIGHTS` is a dead constant. Reachable maxima per dimension are 25/18/12/14/9/9/5 = **92, not 100** | `scoringEngine.ts:70-80`; `intelligenceTypes.ts:104-112`; runtime dump §28.3 |
| **Tier thresholds 90/80/70/60** | Applied to raw sums, so with the engine's real ceilings **8 of the 10 active brands score below 60 and are tier `unscored`** | runtime dump §28.3; `scoringEngine.ts:79` |
| **Weekly automation / scheduling** | **No scheduler exists.** `IntelligenceRunTrigger` declares `'scheduled'`; nothing ever produces it | grep `setInterval|cron|scheduled` in the BI modules → type strings only |
| **Persistence** | In-memory only. No BI table, no migration, no Supabase call, no localStorage. A page reload re-boots the seeds; run history, snapshots and all acquisition artefacts are lost | `supabase/migrations/*` contain no lead/prospect/intelligence table (grep returns nothing); `prospectStore.ts:11-14` |
| **Live provider path** | `createBrandIntelligenceClient(_forceMock?)` **ignores its argument** and always returns `MockClient`. No `Real*Client` class exists for BI | `brandIntelligenceClient.ts:90-92` |

### 1.4 Headline numbers (all derived in this report)

| Metric | Value |
|---|---|
| Canonical BI records | **12** (10 active, 2 hard-disqualified) |
| Distinct brands ever present in BI | **12** |
| ASIN objects in the entire BI dataset | **14** |
| Prospects with ≥1 contact | **5 of 12** |
| Contact records in total | **5** (0 with an email, 0 with a phone, 0 with a LinkedIn URL) |
| Distributor records in total | **1** (Cholula → Global Brands Ltd) |
| Growth-signal records in total | **1** (Tapatío → `retail_expansion`) |
| `ProspectEvidence` records | **17** (all `dateObserved:'2026-09-06'`, all `confidence:'medium'`) |
| Live external sources used by BI | **0** |
| Scores produced per session | 12 at boot + 12 per manual run |
| Change events produced at boot | 12 (one `created` each) |
| Snapshots produced at boot | **0** |
| BI scoring systems | **1** (`calculateScore` + `checkDisq`), plus 1 dead dashboard/summary path |
| BI contact discovery mechanisms | **0** (1 dead seed-lookup stub) |
| Lifecycle mechanisms | 4 writers (run, disqualify, requalify, set-outreach-status) + 3 read models |
| Documentation claims checked | 24 (§27): 11 VERIFIED, 4 PARTIAL, 5 STALE, 3 CONTRADICTED, 1 UNKNOWN |

---

## 2. Audit scope

**In scope.** Everything reachable from, or named as part of, "Brand Intelligence": the BI data model, seed datasets, scoring engine, client factory, discovery/Amazon client stubs, canonical prospect store, lifecycle engine, ICP identity bridge, outreach generator, every BI UI surface, the BI→ICP→acquisition→CRM wiring introduced in Phase C, the BI validators, the BI E2E specs, and the BI claims in the project's documentation.

**Method.** (1) Read every BI module end-to-end. (2) Follow every import edge in both directions (`grep` for each exported symbol across `src/`, `e2e/`, `scripts/`, `docs/`, `supabase/`) and classify each call site. (3) Execute the existing BI validators. (4) Execute the existing BI E2E specs. (5) Execute a temporary read-only diagnostic that loads the real modules through Vite SSR and dumps the real runtime dataset with `globalThis.fetch` instrumented. (6) Cross-check documentation against code. (7) Delete the temporary diagnostic.

**Explicitly not done.** No fixes, no refactors, no adapters, no new models, no live APIs, no schedulers, no UI/navigation/design changes, no Phase D work, no commits, no deployments, and no recommendation anywhere in this document about what BI *should* become.

**Pre-existing repository state (reported, not touched).** `git status` at start showed uncommitted **generated** artefacts (`Review Zip/mercenta-review.zip`, `playwright-report/`, `test-results/.last-run.json`) plus untracked files from earlier sessions (`MERCENTA_PRODUCT_ARCHITECTURE_AUDIT_2026-09-10.md`, `design/`, `forensic-captures/`, `nohup.out`, `scripts/forensic-diag.cjs`, `scripts/forensic-screenshots.mjs`, `scripts/test_write.txt`, `test-screenshots/`). No source file was dirty. Nothing was committed this session.

**Baseline gate re-run this session (product unchanged):**

```
$ npm run typecheck   → tsc --noEmit -p tsconfig.app.json     (no output = 0 errors)
$ npm run build       → ✓ built in 2.29s
```

---

## 3. Repository / source inventory

### 3.1 The BI implementation files (every file containing BI logic)

| # | File | Lines | Role | Classification |
|---|---|---|---|---|
| 1 | `src/types.ts` — §Brand Intelligence block, lines 1697–2281 | 585 | The BI data model: `BrandProspect`, `ProspectASIN`, `ProspectScore`, `ProspectEvidence`, `ProspectContact`, `ProspectDistributor`, `ProspectWholesale`, `ProspectRestriction`, `GrowthSignal`, `ProspectTier`, `BrandMaturity`, `DistributorStatus`, `AmazonOfferClassification`, `OutreachStatus`, plus lifecycle types (`IntelligenceRun`, `ProspectChangeEvent`, `IntelligenceSnapshot`, `IntelligencePipelineStatus`, `IntelligencePipelineConfig`, `IntelligenceDashboard`, `BrandMarketIntelligence`) | **ACTIVE** |
| 2 | `src/lib/intelligence/scoringEngine.ts` | 81 | The only scoring implementation: `checkDisq()` (l.7), `calculateScore()` (l.60), private sub-scorers `d/p/g/gd/ac/mf/l` (l.21–56) | **ACTIVE** (via the client) |
| 3 | `src/lib/intelligence/brandIntelligenceClient.ts` | 92 | `BrandIntelligenceClient` interface (l.9), `class MockClient` (l.21) with `scoreProspect` (l.24), `runPipeline` (l.50), `getDashboard` (l.64), `getBrandIntelligence` (l.78); factory (l.90) | `scoreProspect` + `getDashboard` + factory **ACTIVE**; `runPipeline` / `getBrandIntelligence` **DEAD/UNUSED** |
| 4 | `src/lib/intelligence/intelligenceTypes.ts` | 189 | Engine types (`IntelligenceEngineOptions` l.24, `IntelligencePipelineResult` l.36, `RawScoreFactors` l.59); dead constants (`INTELLIGENCE_SCORE_WEIGHTS` l.104, `TIER_THRESHOLDS` l.114, `GROWTH_SIGNAL_POINTS` l.121, `TIER_LABELS` l.138, `TIER_COLORS` l.146); declaration-only interfaces (`DiscoveryClient` l.157, `AmazonDataClient` l.176, `ScoringEngine` l.184) | types **ACTIVE**; constants **DEAD**; the 3 interfaces **DECLARATION ONLY** |
| 5 | `src/lib/intelligence/discoveryClient.ts` | 124 | `MockDiscoveryClientImpl` (l.26) — distributor/contact/restriction/growth lookups from a seed-index `Map`; `MockAmazonDataClientImpl` (l.95); factories (l.118, l.122) | **DEAD/UNUSED** (zero call sites) |
| 6 | `src/lib/intelligence/prospectLifecycle.ts` | 425 | Lifecycle engine: `NEXT_CHECK_DAYS=7` (l.32), `mergeScores` (l.86), `runBrandIntelligence` (l.106), `disqualifyProspect` (l.315), `requalifyProspect` (l.347), `setProspectOutreachStatus` (l.382), `getPipelineStatus` (l.410) | **ACTIVE** |
| 7 | `src/lib/intelligence/prospectPipeline.ts` | 203 | BI→ICP identity bridge: `normalizeBrandKey` (l.28), `matchLeadToProspect` (l.38), `matchLeadsToProspects` (l.52), `deriveLeadFromProspect` (l.76), `ICP_REGION_BY_COUNTRY` (l.114), `leadStageForOutreachStatus` (l.151), `outreachStatusForLeadStage` (l.156), `acquisitionLeadId` (l.167), `deriveIcpOriginRegion` (l.178), `buildAcquisitionLead` (l.193) | **ACTIVE** |
| 8 | `src/lib/intelligence/outreachGenerator.ts` | 128 | `generateEmail` (l.33), `generateLinkedInMessage` (l.60), `generateFollowUp` (l.82), `generateAllOutreach` (l.101), `generateOutreachSummary` (l.105), private `distributorNote` (l.123) | `generateEmail` / `generateLinkedInMessage` / `generateOutreachSummary` **ACTIVE**; `generateFollowUp` **DEAD**; `distributorNote` **DEAD**; `generateAllOutreach` **INDIRECT** (called only by the summary) |
| 9 | `src/data/prospectStore.ts` | 205 | THE canonical BI store: `boot` (l.47), `ensureProspectStore` (l.84), change signal (`getCanonicalStoreVersion` l.99, `subscribeCanonicalStore` l.103, `notifyCanonicalStoreChange` l.111), read models (`getProspects` l.117, `getProspect` l.122, `getRuns` l.128, `getChanges` l.134, `getProspectTimeline` l.140, `getSnapshots` l.146, `getAcquisitionLeads` l.159), mutators (`updateProspect` l.167, `applyRunResult` l.174, `recordLifecycleEvent` l.189, `resetProspectStore` l.199 TEST ONLY) | **ACTIVE** (reset = test helper only) |
| 10 | `src/data/acquisitionStore.ts` | 218 | Phase C acquisition store (outreach revisions, responses, opportunities, events, platform audit writes) | **ACTIVE** |
| 11 | `src/lib/acquisition/outreachLifecycle.ts` | 721 | Phase C lifecycle: `transitionProspect` (l.99), `outreachDestination` (l.114), `acquisitionStageLabel` (l.135), `listAcquisitionProspects` (l.163), `getRelationshipContext` (l.178), `getAcquisitionSummary` (l.182), `reconcileLeadWithProspect` (l.192, **0 callers**), `applyLeadStageToProspect` (l.207), `enrollProspect` (l.227), `prepareOutreach` (l.270), `modifyOutreach` (l.322), `approveOutreach` (l.359), `rejectOutreach` (l.386), `sendOutreach` (~l.433), `recordResponse` (l.509), `simulateResponse` (l.583), `createOpportunityFromResponse` (~l.630), `setOpportunityStage` (l.690) | **ACTIVE** (`reconcileLeadWithProspect` DEAD) |
| 12 | `src/lib/acquisition/outreachSender.ts` | 60 | Transport seam: `simulationOutreachTransport` (l.40), `transportFromEmailClient` (l.52) | **ACTIVE** |
| 13 | `src/data/brandProspectSeed.ts` | 110 | `SEED_PROSPECTS` — 3 brands (Tapatío, Cholula, Valentina) with the full evidence model | **ACTIVE (the dataset)** |
| 14 | `src/data/brandExtraSeed.ts` | 32 | `EXTRA_PROSPECTS = [...EXTRA, ...EXTRA2]` — 9 brands, condensed one-liners, `evidence: []` on 9/9 | **ACTIVE (the dataset)** |

### 3.2 BI UI + wiring files

| File | Line(s) | What it does | Classification |
|---|---|---|---|
| `src/components/layout/AdminShell.tsx` | 52, 134, 166 | Nav item `brand_intelligence` ("Brand Intelligence"), breadcrumb, renders `<BrandIntelligencePanel/>` with **no `isSuper` guard** | **ACTIVE** |
| `src/components/layout/BrandShell.tsx` | 68, 99, 128 | Brand nav item `market` ("Market Intel") → `<BrandIntelligence/>` | **ACTIVE** |
| `src/components/admin/BrandIntelligencePanel.tsx` | 109 | Admin surface: KPI cards, Pipeline Control ("Run discovery"), Run History (expandable per-run changes), Disqualified + Requalify, search/category/tier filters, sort, table, row → detail | **ACTIVE** |
| `src/components/admin/ProspectDetailPanel.tsx` | 79 | Detail container: header, provenance badges, tabs Overview/Amazon/Commercial/People/Mercenta Fit/**Outreach**/History, Disqualify | **ACTIVE** |
| `src/components/admin/ProspectDetailTabs.tsx` | 151 | Tab bodies incl. `HistoryTab` (`getProspectTimeline`) | **ACTIVE** |
| `src/components/admin/SuperAdminPanel.tsx` | 42, 499-501 | Super Admin tab `brandintelligence` → same `<BrandIntelligencePanel/>` | **ACTIVE** |
| `src/components/brand/BrandIntelligence.tsx` | 64 | Brand-mode "Your Amazon Market": store filtered to the session brand's category; `+12%` growth hardcoded in the JSX | **ACTIVE** |
| `src/components/admin/AcquisitionWorkflow.tsx` | 439 | Phase C operator surface (Outreach tab **and** CRM): BI evidence block, prepare/modify/approve/reject/send/simulate-response/create-opportunity/stage, relation timeline, canonical thread | **ACTIVE** |
| `src/components/admin/AcquisitionPipeline.tsx` | ~175 | Marketing view: canonical prospects, BI score, `lead-<id>`, derived region, stage, Prepare | **ACTIVE** |
| `src/components/admin/AcquisitionRelationships.tsx` | ~100 | CRM section "Acquisition Relationships (pre-onboarding)" | **ACTIVE** |
| `src/components/admin/BrandCRM.tsx` | 8, 84 | Renders `<AcquisitionRelationships/>` | **ACTIVE** |
| `src/components/admin/MarketingHub.tsx` | 19, 22, 37, 101-108, 243 | ICP builder + `matchLeadsToProspects(imported, getProspects())` CSV bridge + "Acquisition Pipeline (BI-derived)" section | **ACTIVE** (bridge); the ICP *discovery engine* it also hosts is a separate, non-BI system (§3.4) |
| `src/components/admin/MessagesHub.tsx` | 4, 109-120 | Resolves a thread keyed by a canonical prospect id to `"<Brand> (prospect)"` | **ACTIVE** |
| `src/context/GlobalStateContext.tsx` | 167-172, 321-384, 461-462, 479, 497-500 | Boots `leads` from `getAcquisitionLeads()`; `updateLeadStatus` projects a linked lead's stage onto the canonical prospect; subscribes to the canonical change signal; exposes `canCurrentUserMutate` | **ACTIVE** |
| `src/data/queries.ts` | 34-37, 171-175 | `useCanonicalStoreVersion()` — the React re-render signal for the BI stores | **ACTIVE** |

### 3.3 BI tests / validators (all executed this session — see §28)

| File | Scope | Result this session |
|---|---|---|
| `scripts/validate-bi-lifecycle.mjs` | 29 assertions: boot, run determinism/idempotence, candidate dedupe, sticky DQ, requalify, snapshots, status, single-source bridge, **0 external fetches** | **PASS 29/29** |
| `scripts/validate-prospect-pipeline.mjs` | 26 assertions: BI→ICP bridge, region derivation, identity, fit gating, no INITIAL_LEADS overlap | **PASS 26/26** |
| `scripts/validate-acquisition-pipeline.mjs` | Phase C chain: BI→ICP→approval→send→response→opportunity→CRM, RBAC, tenant isolation, persistence semantics | **PASS (all assertions)** |
| `e2e/brand-intelligence-lifecycle.spec.ts` | 2 browser tests: run discovery + history + next-check; provenance + History tab + disqualify/requalify | **PASS 2/2** (in the 6-test run below) |
| `e2e/acquisition-pipeline.spec.ts` | 4 browser tests: full workflow, CRM + canonical thread, reject path, tenant isolation | **PASS 4/4** |
| `e2e/domain-acceptance.spec.ts` | Test 3 asserts the BI-derived ICP universe (Tapatío CSV → `US · Grocery`) | not re-run individually this session (in the full suite per project docs) |

### 3.4 Adjacent systems that are NOT Brand Intelligence (verified, so they are not double-counted)

| System | Files | Why it is not BI | Consumer |
|---|---|---|---|
| ICP **discovery engine** (directories → OpenRouter research → Companies House → email verification → Instantly enrolment) | `src/lib/discovery/engine.ts` (350), `firecrawlClient.ts`, `firecrawlResearch.ts`, `budget.ts`, `wordingSafety.ts` | Operates on `RawDiscoveryLead` (company/country/segment) with its own fit-score contract and **imports nothing from `lib/intelligence` or the BI store** | `MarketingHub.tsx:19` (ICP "Run discovery") |
| **Product Research** (Keepa) | `src/lib/research/keepaClient.ts`, `productResearchEngine.ts`, `resellerTracker.ts`, `dailyReport.ts`, `manufacturerSourcingEngine.ts`, `alibabaClient.ts` | Separate `KeepaProduct`/report models and a separate Super Admin surface | `ProductResearchSection.tsx`, `ManufacturerSourcingSection.tsx` |
| **TAM/SAM market data** | `src/lib/market-data/tamSamPipeline.ts` | Static category-level market sizing; no prospect identity | `TamSamDisplay`, `InvestorPitchSection`, `BankFinancingSection` |
| **Fulfillment score** | `src/lib/scoring.ts` | Scores *brand tenants* for a fulfillment track | Onboarding / Fulfillment Track |
| **Brand-tenant dossiers** | `src/data/brandDossiers.ts`, `regionalDossiers.ts` | Enrich **demo brand tenants** (`buildBrandDossier`) for the Brand portal and logistics modals; **no relationship to BI prospects** | `GlobalStateContext.tsx:206-213`, `LogisticsHub.tsx` |

---

## 4. BI implementation map

### 4.1 Call graph (as implemented — every edge verified by grep + read)

```
                ┌──────────────────────────────────────────────┐
                │ SEED DATA (literals, no I/O)                 │
                │ brandProspectSeed.ts  SEED_PROSPECTS  (3)    │
                │ brandExtraSeed.ts     EXTRA_PROSPECTS (9)    │
                └───────┬───────────────────────┬──────────────┘
                        │ read by               │ read by (DEAD path)
                        ▼                       ▼
   ┌────────────────────────────────┐   ┌─────────────────────────────┐
   │ data/prospectStore.ts          │   │ intelligence/discoveryClient│
   │ boot()  ← ONCE per session     │   │ BRAND_INDEX Map  → NO CALLER│
   │  = [S,E].map(scoreProspect)    │   │ createDiscoveryClient() etc │
   └───────┬────────────────────────┘   └─────────────────────────────┘
           │ calls
           ▼
  ┌──────────────────────────────────────────────┐
  │ intelligence/brandIntelligenceClient.ts       │
  │ createBrandIntelligenceClient() → MockClient  │  ← only implementation
  │  · scoreProspect(p)  → scoringEngine          │  ACTIVE
  │  · getDashboard(ps)  → KPI counts             │  ACTIVE
  │  · runPipeline()     → UNUSED                 │
  │  · getBrandIntelligence() → UNUSED            │
  └───────┬──────────────────────────────────────┘
          ▼
  ┌──────────────────────────────────────────────┐
  │ intelligence/scoringEngine.ts                 │
  │ checkDisq(asins, restrictions)                │
  │ calculateScore(asins, signals, distributors,  │
  │                restrictions, contacts, cat)   │
  └──────────────────────────────────────────────┘

  READERS OF THE CANONICAL STORE (getProspects / getProspect)
   ├── Admin BrandIntelligencePanel      (KPIs, table, run, DQ/RQ)
   ├── ProspectDetailPanel/Tabs          (reads the object handed over by the panel)
   ├── Brand BrandIntelligence.tsx       (store filtered by session brand category)
   ├── MarketingHub.importCsv            (matchLeadsToProspects(imported, getProspects()))
   ├── MessagesHub                       (resolves a prospect-keyed thread name)
   ├── prospectStore.getAcquisitionLeads → GlobalStateContext.leads
   └── lib/acquisition/outreachLifecycle (every Phase C mutator + read model)

  WRITERS OF THE CANONICAL STORE
   ├── prospectStore.boot()                      (scoreProspect × 12)
   ├── prospectLifecycle.runBrandIntelligence    → applyRunResult
   ├── prospectLifecycle.disqualifyProspect /
   │   requalifyProspect                         → updateProspect + recordLifecycleEvent
   └── prospectLifecycle.setProspectOutreachStatus → updateProspect + recordLifecycleEvent
        (called by outreachLifecycle.transitionProspect ← enrol/prepare/send/respond/opportunity
         AND by GlobalStateContext.updateLeadStatus)
```

### 4.2 Exhaustive inventory table

| Area | File | Function/Class | What it actually does | Called by | Calls | Class |
|---|---|---|---|---|---|---|
| Dataset | `data/brandProspectSeed.ts` | `SEED_PROSPECTS` (l.50) + private `ev/evEst/asin/score` helpers | 3 fully-evidenced brand literals (Tapatío, Cholula, Valentina); `NOW='2026-09-06'` | `prospectStore.boot` l.52; `discoveryClient` (dead) | — | ACTIVE |
| Dataset | `data/brandExtraSeed.ts` | `EXTRA_PROSPECTS` (l.32) | 9 condensed brand literals; `evidence: []` on 9/9; includes the 2 hard-disqualified exclusions | `prospectStore.boot` l.52; `discoveryClient` (dead) | — | ACTIVE |
| Scoring | `intelligence/scoringEngine.ts` | `checkDisq(asins, restrictions)` (l.7) | DQ if 0 ASINs → `'No ASINs'`; if max `reviewCount` < 10 → `'Low demand'`; if any hard restriction whose text/description contains "amazon" or "marketplace" → that description | `MockClient.scoreProspect`, `prospectLifecycle.mergeScores` | — | ACTIVE |
| Scoring | same | `calculateScore(...)` (l.60) | Sums 7 raw sub-scores, caps at 100, assigns tier; **weights never applied** | `MockClient.scoreProspect` | `d/p/g/gd/ac/mf/l` | ACTIVE |
| Scoring | same | `d/p/g/gd/ac/mf/l` (l.21–56) | The 7 sub-scorers (exact formulas §5.3) | `calculateScore` | — | ACTIVE |
| Client | `intelligence/brandIntelligenceClient.ts` | `MockClient.scoreProspect(p)` (l.24) | Spreads the caller record, then overwrites defaults (`id/brand/category/brandMaturity/wholesale`), `score`, `outreachStatus`, `lastResearched`, `disqualified`, `source:'mock'` | `prospectStore.boot`; `prospectLifecycle` (4 sites) | `checkDisq`, `calculateScore` | ACTIVE |
| Client | same | `MockClient.getDashboard(ps)` (l.64) | Tier counts, `totalBrandsTracked`, `distributorGaps`, `highPriorityCount`, `categoryBreakdown`, `topProspect = s[0]`, `newThisWeek: 0` | `BrandIntelligencePanel.tsx:29` | — | ACTIVE |
| Client | same | `MockClient.runPipeline(ps, opts)` (l.50) | Scores + sorts + slices to `maxBrands`, synthesises a run result | — (0 callers) | `scoreProspect` | DEAD |
| Client | same | `MockClient.getBrandIntelligence(p)` (l.78) | Brand name/category + summed sales/revenue; `categoryAverageSales`/`categoryMarketSize` = 0; `topCompetitors`/`salesTrend`/`priceDistribution`/`reviewDistribution` = `[]`; `categoryGrowth: 12`; `source:'mock'` | — (0 callers) | — | DEAD |
| Client | same | `createBrandIntelligenceClient(_forceMock?)` (l.90) | Always `new MockClient()`; the parameter is ignored | store, lifecycle, panel | — | ACTIVE |
| Engine config | `intelligence/intelligenceTypes.ts` | `INTELLIGENCE_SCORE_WEIGHTS`, `TIER_THRESHOLDS`, `GROWTH_SIGNAL_POINTS`, `TIER_LABELS`, `TIER_COLORS` | Weight / tier / label tables | nothing | — | DEAD (the panel defines its own label maps inline, `BrandIntelligencePanel.tsx:14-15`) |
| Discovery stub | `intelligence/discoveryClient.ts` | `MockDiscoveryClientImpl.searchForDistributors/searchForContacts/checkAmazonRestrictions/detectGrowthSignals` (l.26–91) | Look up `BRAND_INDEX.get(brand.toLowerCase())` and map seed fields; unknown brand → empty | nothing | — | DEAD |
| Discovery stub | same | `MockAmazonDataClientImpl.searchCategory/searchBrand/getAsinDetail` (l.95–114) | `searchCategory` → always `[]`; `searchBrand` → seed ASINs; `getAsinDetail` → linear scan of both seed arrays | nothing | — | DEAD |
| Discovery stub | same | `createDiscoveryClient` (l.118), `createAmazonDataClient` (l.122) | Factories | nothing | — | DEAD |

| Lifecycle | `intelligence/prospectLifecycle.ts` | `runBrandIntelligence(opts)` (l.106) | Baseline index → candidate intake/dedupe by `normalizeBrandKey` → re-score ALL → classify created/disqualified/requalified/updated/unchanged → stamp `lastChecked`+`nextCheck` → build snapshots → `applyRunResult` | `BrandIntelligencePanel.tsx:33` (`{trigger:'manual'}`); validators | client, store, `checkDisq`, `normalizeBrandKey` | ACTIVE |
| Lifecycle | same | `mergeScores(prev, scored)` (l.86) | Sticky DQ: `effectiveDisq = engineDQ \|\| prev.disqualified`; keeps `prev.outreachStatus` for a previously DQ'd record | `runBrandIntelligence` | `checkDisq` | ACTIVE |
| Lifecycle | same | `disqualifyProspect(id, reason, by?)` (l.315) | Sets `disqualified:true` + reason; emits a `disqualified` event | `ProspectDetailPanel.handleDisqualify` (window.prompt) | store | ACTIVE |
| Lifecycle | same | `requalifyProspect(id, by?)` (l.347) | Restores `disqualified:false`, clears the reason, resets `outreachStatus` DQ→`uncontacted`; emits `requalified` | `BrandIntelligencePanel.handleRequalify` (l.35) | store | ACTIVE |
| Lifecycle | same | `setProspectOutreachStatus(id, next, note, by?)` (l.382) | The only downstream write path; emits an `updated` event on field `outreachStatus` with before/after | `outreachLifecycle.transitionProspect`; `GlobalStateContext.updateLeadStatus` | store | ACTIVE |
| Lifecycle | same | `getPipelineStatus()` (l.410) | Counts + last run + latest `lastChecked` + earliest `nextCheck` | panel; validators | store | ACTIVE |
| Bridge | `intelligence/prospectPipeline.ts` | `normalizeBrandKey` (l.28) | NFD-normalise → strip diacritics → lowercase → keep `[a-z0-9]` (`Tapatío`→`tapatio`, `Kit & Kin`→`kitkin`) | lifecycle dedupe, matching, store event ids | — | ACTIVE |
| Bridge | same | `matchLeadToProspect` (l.38) / `matchLeadsToProspects` (l.52) | Exact normalized **company-name** match; fills `prospectId` and (only if blank/`Uncategorized`) `segment` from the prospect category | `MarketingHub.importCsv`; validators | `normalizeBrandKey` | ACTIVE |
| Bridge | same | `deriveLeadFromProspect(p, region)` (l.76) | Projects to a `Lead`: persona from `contacts[0]`, `email = contact?.email ?? ''`, priority from tier (T1/T2→High else Medium), `outreachStatus:'Scraped'`, `segment: category`, `fitScore: 0` | `buildAcquisitionLead`; validator | — | ACTIVE |
| Bridge | same | `deriveIcpOriginRegion(p)` (l.178) | First declared `countries` entry present in `ICP_REGION_BY_COUNTRY` (61 keys); else `ukPresence===true → 'uk'`; else `null` | `buildAcquisitionLead`; `outreachLifecycle` (enrol/prepare/list/reconcile) | — | ACTIVE |
| Bridge | same | `buildAcquisitionLead(p)` (l.193) | Region underivable ⇒ `null`; else derived lead with id `lead-<prospectId>` and stage mapped from BI `outreachStatus` | `prospectStore.getAcquisitionLeads`; `outreachLifecycle` | above | ACTIVE |
| Bridge | same | `leadStageForOutreachStatus` (l.151) / `outreachStatusForLeadStage` (l.156) | Documented 2-way ladder mapping (§21.3) | store; `GlobalStateContext` | — | ACTIVE |
| Outreach copy | `intelligence/outreachGenerator.ts` | `generateEmail` (l.33) | Subject + body from brand name, ASIN count, summed `estimatedRevenue`, summed reviews, avg rating, top-ASIN BSR/sellers, contact first name | `outreachLifecycle.prepareOutreach` | — | ACTIVE |
| Outreach copy | same | `generateLinkedInMessage` (l.60) | Same inputs, LinkedIn-shaped copy | reachable only via `prepareOutreach(channel:'linkedin')`; the UI always passes `'email'` | — | INDIRECTLY ACTIVE |
| Outreach copy | same | `generateOutreachSummary` (l.105) | Markdown "why we are contacting this brand": contact, score/tier, suggested approach, email subject, acceptance %, exclusive-distributor warning | `prepareOutreach`; `createOpportunityFromResponse` (as `evidenceSummary`) | `generateAllOutreach` | ACTIVE |
| Outreach copy | same | `generateAllOutreach` (l.101) / `generateFollowUp` (l.82) | Day 0/3/7/14/30 pack | only the summary calls the pack (for its email subject); `generateFollowUp` itself unreachable from product code | — | INDIRECT (pack) / DEAD (follow-ups) |
| Outreach copy | same | `distributorNote(p)` (l.123) | Distributor-specific copy | nothing | — | DEAD |

| Store | `data/prospectStore.ts` | `boot()` (l.47) | Idempotent one-time session boot: score 12 seeds, 12 `created` events, 1 seed run, `snapshots = []` | every read model | client, `normalizeBrandKey` | ACTIVE |
| Store | same | `getProspects/getProspect/getRuns/getChanges/getProspectTimeline/getSnapshots` (l.117-149) | Read models over module arrays (they return the live arrays, not copies) | UI; lifecycle; acquisition | — | ACTIVE |
| Store | same | `getAcquisitionLeads()` (l.159) | Active prospects → `buildAcquisitionLead` → non-null only | `GlobalStateContext` l.171, 365 | bridge | ACTIVE |
| Store | same | `updateProspect` (l.167) / `applyRunResult` (l.174) / `recordLifecycleEvent` (l.189) | Mutate + `notifyCanonicalStoreChange()` | lifecycle | change signal | ACTIVE |
| Store | same | `resetProspectStore()` (l.199) | Wipes all four arrays and `initialized=false` | validators only | — | TEST ONLY |
| Store | same | `getCanonicalStoreVersion` (l.99) / `subscribeCanonicalStore` (l.103) / `notifyCanonicalStoreChange` (l.111) | Module-level tick counter + listener set | `queries.ts:171`; panels; stores | — | ACTIVE |
| Phase C store | `data/acquisitionStore.ts` | all exports (l.44-218) | Outreach revisions, responses, opportunities, events; writes `demoAuditLog`; composes `getRelationship` | `outreachLifecycle`; CRM UI | `demoMessages`; audit log | ACTIVE |
| Phase C engine | `lib/acquisition/outreachLifecycle.ts` | enrol → prepare → modify/approve/reject → send → respond → opportunity → stage | Enforces RBAC (`actor.canMutate`), state machines, double audit | `AcquisitionWorkflow`; `AcquisitionPipeline`; validators | BI store; acquisition store; `outreachGenerator`; `classifyInboundReply`; `logMessage` | ACTIVE |
| Phase C engine | same | `outreachDestination(p)` (l.114) | `contacts[0].email` if present, else `hello@<brand-slug>.example` | `sendOutreach`; `simulateResponse` | — | ACTIVE |
| Phase C engine | same | `reconcileLeadWithProspect(lead)` (l.192) | Re-projects a lead from its prospect | nothing | `deriveIcpOriginRegion`; `leadStageForOutreachStatus` | DEAD |
| Phase C transport | `lib/acquisition/outreachSender.ts` | `simulationOutreachTransport` (l.40) | `{ok:true, sandbox:true}` — **no network call** | `AcquisitionWorkflow` default | — | ACTIVE |
| Phase C transport | same | `transportFromEmailClient(client, live)` (l.52) | Wraps the existing email provider client when `comms.emailLive \|\| emailSandbox` | `AcquisitionWorkflow` | email provider seam | INDIRECTLY ACTIVE |
| UI | `components/admin/BrandIntelligencePanel.tsx` | `BrandIntelligencePanel` | Universe KPIs, Pipeline Control/Run discovery, Run History, Disqualified+Requalify, filters, table, detail | `AdminShell:166`; `SuperAdminPanel:500` | store; lifecycle; client | ACTIVE |
| UI | `components/admin/ProspectDetailPanel.tsx` | `ProspectDetailPanel` | 7 tabs incl. Outreach; Disqualify action | panel | `AcquisitionWorkflow`; lifecycle | ACTIVE |
| UI | `components/admin/ProspectDetailTabs.tsx` | `OverviewTab/AmazonTab/CommercialTab/PeopleTab/MercentaFitTab/HistoryTab` | Renders the record fields | panel | store (`getProspectTimeline`) | ACTIVE |
| UI | `components/brand/BrandIntelligence.tsx` | `BrandIntelligence` | Category-filtered competitor view for the session brand | `BrandShell:128` | store | ACTIVE |
| UI | `components/admin/AcquisitionWorkflow.tsx` | `AcquisitionWorkflow` | Prepare/Modify/Approve/Reject/Send/Simulate response/Create opportunity/Stage; BI evidence block; canonical thread | Outreach tab; CRM | Phase C engine | ACTIVE |
| UI | `components/admin/AcquisitionPipeline.tsx` | `AcquisitionPipeline` | Canonical prospects + ICP identity + stage + Prepare | `MarketingHub:243` | Phase C read models | ACTIVE |
| UI | `components/admin/AcquisitionRelationships.tsx` | `AcquisitionRelationships` | CRM list of prospects with an opportunity → embedded workflow | `BrandCRM:84` | Phase C read models | ACTIVE |
| Wiring | `context/GlobalStateContext.tsx` | bootstrap (l.167-172); `updateLeadStatus` (l.321-356); `refreshLeadsFromProspects` (l.363-374); subscription (l.378-384) | Projects the canonical universe into `leads` and writes stage changes back | app root | store; lifecycle; bridge | ACTIVE |
| Wiring | `data/queries.ts` | `useCanonicalStoreVersion` (l.171) | Re-render signal | panels | store | ACTIVE |
| RBAC | `lib/auth/rbac.ts` | `VIEW_ALLOWLIST` (l.46-60), `canAccessView` (l.65), `filterNavForTier` (l.70) | Nav allowlists — **never called anywhere** | nothing | — | DEAD (§12.5) |
| RBAC | same | `staffCanMutate(member)` (l.82) | `active && permissionTier==='full'` | `GlobalStateContext:462` → `AcquisitionWorkflow` actor | — | ACTIVE |

### 4.3 Areas the brief asked about that returned **no BI implementation at all**

Verified by repository-wide grep (the only hits are the unrelated ICP discovery engine, Product Research, or documentation prose):

| Requested area | Result |
|---|---|
| ASIN research / ASIN provider | **NOT FOUND in BI** |
| Product research for BI | **NOT FOUND in BI** (Product Research is a separate Super Admin feature on a separate model) |
| Sales-estimation engine | **NOT FOUND** — literal integers only |
| Market-intelligence computation | **NOT FOUND** — category roll-ups are `sum(estimatedRevenue)` only; `categoryMarketSize`/`categoryAverageSales` are hardcoded `0` |
| Contact-discovery provider | **NOT FOUND** |
| Company enrichment for BI | **NOT FOUND** |
| Website research for BI | **NOT FOUND** |
| BI scheduler | **NOT FOUND** |
| BI caching | **NOT FOUND** |
| BI Supabase persistence | **NOT FOUND** (no table, no query, no migration) |
| BI value-level change detection | **PARTIAL** — compares collection lengths and total score only |

---

## 5. Actual execution / data flow

### 5.1 Session boot — the only automatic BI execution

```
Browser loads app
  └─ AdminShell renders BrandIntelligencePanel (or BrandShell renders BrandIntelligence)
      └─ BrandIntelligencePanel.tsx:24 effect → ensureProspectStore()
          └─ prospectStore.boot():   if (initialized) return;
              stamp = now;   runId = 'run-seed-baseline'
              prospects = [...SEED_PROSPECTS, ...EXTRA_PROSPECTS]            (12)
                            .map(p => createBrandIntelligenceClient()
                                        .scoreProspect(p))                   ← 12 synchronous re-scores
              changes   = 12 × { changeType:'created', runId:'run-seed-baseline' }
              runs      = [ seed run: scanned 12 · new 12 · dq 2 ]
              snapshots = []                                                 ← EMPTY at boot
```

Runtime proof (diagnostic §28.3): boot produced exactly one run (`run-seed-baseline`), 12 `created` events, `snapshots after boot: 0`, `EXTERNAL FETCHES: 0`.

**Consequence that matters:** the `score:` literal written into every seed file is **discarded at boot** — `MockClient.scoreProspect()` recomputes it, and the engine's output differs from every seed value (§28.3). The seed scores are dead data that no runtime consumer ever sees.

### 5.2 Manual run ("Run discovery")

```
BrandIntelligencePanel.tsx:33  runDiscovery()
  └─ runBrandIntelligence({ trigger: 'manual' })          ← candidates are NEVER supplied
      ├─ baseline index: byId / byKey(normalizeBrandKey)
      ├─ candidate intake: opts.candidates ?? []          ⇒ loop body never executes
      ├─ for each of the 12:
      │     mergeScores(prev, scoreProspect(src))
      │     stamped = { ...scored, lastChecked: now, nextCheck: now + 7d }
      │     classify: !prev → created | dq flipped → disqualified/requalified
      │               | dataChanged → updated | else unchanged
      │        where dataChanged = (total ≠) || (evidence.length ≠)
      │                           || (asins.length ≠) || (distributors.length ≠)
      ├─ snapshots = 12 rows (one per prospect; snapshotDate = today)
      └─ store.applyRunResult(finalUniverse, run, events, snapshots) → notifyCanonicalStoreChange()
```

Runtime proof: `Scanned 12. New 0. Updated 0. Disqualified 0. Unchanged 12.` with `events: 0`, `snapshots after run: 12`. Repeating it is idempotent (validator: *"manual run #2 is idempotent (unchanged 12, no new events)"*).

### 5.3 What a run can and cannot change

| Can change | Cannot change | Evidence |
|---|---|---|
| `score` (in principle — but in practice the recomputation is deterministic on unchanged inputs, so it never moves) | Any ASIN metric, contact, distributor, restriction, growth signal or evidence entry — **nothing writes those collections after boot** | only `updateProspect`-based mutators exist; none touches `asins/contacts/distributors/restrictions/growthSignals/evidence` |
| `disqualified` via engine DQ | A *manual* disqualification back to active via a run (sticky by design) | `mergeScores` l.86-100 |
| `lastChecked`, `nextCheck` | `id`, `brand`, `createdAt` | `stamped` spread |
| `outreachStatus` — **only downstream**, never by a run | `evidence` (never appended post-boot) | `mockClient` preserves `p.evidence ?? []` |

### 5.4 Full runtime session flow (BI → downstream)

```
boot 12 records ──► Admin Brand Intelligence panel (10 active rows)
                     ├─ "Run discovery"  → 1 run + 12 snapshots (no new data)
                     ├─ row → detail     → 7 tabs read the record
                     ├─ Disqualify       → sticky + audited → row leaves the table
                     └─ Requalify        → restored + audited
                     │
prospectStore.getAcquisitionLeads()   (10 leads · fitScore 0 · email '')
                     │
GlobalStateContext.leads ──► MarketingHub ICP (scoreLeadFit at render) + AcquisitionPipeline
                     │
AcquisitionWorkflow: prepareOutreach → modify → approve/reject → sendOutreach(simulation)
                     → recordResponse/simulateResponse → createOpportunityFromResponse → setOpportunityStage
                     │
   each transition ──► setProspectOutreachStatus() → BI prospect timeline event
   each send/reply ──► logMessage() → demoMessages → MessagesHub + CRM + workflow (one thread)
```

---

## 6. Complete data dictionary

Method: every field is taken from the **type declarations** in `src/types.ts` and then marked with what the **runtime actually contains** (diagnostic §28.3 for the entire universe; source read for the rest). "Persisted?" means *survives within the session* — there is no cross-session BI persistence anywhere.

### 6.1 `BrandProspect` — the canonical object (31 fields)

| # | Field (exact code name) | Type | Source | Raw/Derived | Persisted? | Score input? | Displayed? | Downstream? | Evidence |
|---|---|---|---|---|---|---|---|---|---|
| 1 | `id` | string | seed literal / `p-${normalizedKey}` for candidates | Raw | Yes (memory) | No | No (key only) | Yes (`lead-<id>`, `opp-<id>`) | `brandExtraSeed`; `mockClient:39` |
| 2 | `brand` | string | seed literal | Raw | Yes | No (used in copy) | Yes | Yes (CRM, messages) | runtime |
| 3 | `category` | string | seed literal (or `'Home'` default) | Raw | Yes | **Yes** (`mf()` repeat-purchase list) | Yes | Yes (`Lead.segment`) | `mockClient:39`; `scoringEngine:49` |
| 4 | `website` | string? | seed literal | Raw | Yes | No | Yes (link) | Yes → `Lead.location` fallback | Tapatío runtime |
| 5 | `countries` | string[]? | seed literal (3 records) | Raw | Yes | No | No | **Yes** (origin region) | `deriveIcpOriginRegion` |
| 6 | `ukPresence` | boolean? | seed literal (10 records) | Raw | Yes | No | Yes ("UK Presence") | **Yes** (region fallback) | runtime; `deriveIcpOriginRegion:183` |
| 7 | `brandMaturity` | `BrandMaturity` | seed literal / default `'challenger'` | Raw | Yes | No | Yes (Overview) | No | runtime |
| 8 | `incumbentChallenged` | string[]? | seed literal (Tapatío, Cholula only) | Raw | Yes | No | Yes ("Challenging") | No | runtime (Phase C fix preserved it) |
| 9 | `whyInteresting` | string? | seed literal | Raw | Yes | No | Yes (panel banner) | No | runtime |
| 10 | `asins` | `ProspectASIN[]` | seed literal | Raw | Yes | **Yes** (heavily) | Yes (Amazon tab) | Count only (copy) | §6.3 |
| 11 | `distributors` | `ProspectDistributor[]` | seed literal | Raw | Yes | **Yes** (`gd()`) | Yes (Commercial) | Yes (summary warning) | §6.4 |
| 12 | `wholesale` | `ProspectWholesale` | seed literal / default empty object | Raw | Yes | No | Yes (Commercial, Mercenta Fit) | No | `mockClient:42` |
| 13 | `restrictions` | `ProspectRestriction[]` | seed literal (2 records) | Raw | Yes | **Yes** (`checkDisq`, `ac()`) | Only as DQ reason | No | §6.5 |
| 14 | `growthSignals` | `GrowthSignal[]` | seed literal (1 record) | Raw | Yes | **Yes** (`g()`) | Count only | No (not in copy) | runtime |
| 15 | `contacts` | `ProspectContact[]` | seed literal (5 records) | Raw | Yes | **Yes** (`ac()` founder access) | Yes (People) | **Yes** (persona, destination, opportunity) | §6.6 |
| 16 | `score` | `ProspectScore` | **derived** — recomputed at boot and every run | Derived | Yes | n/a | Yes (everywhere) | **Yes** (`Opportunity.biScore/biTier`) | §5.1, §11 |

| 17 | `outreachStatus` | `OutreachStatus` | seed literal, then mutated by the lifecycle | Raw → Derived | Yes | only via `checkDisq` → `disqualified` | Yes ("Status") | **Yes** (`Lead.outreachStatus`) | `mockClient:44`; `setProspectOutreachStatus` |
| 18 | `outreach` | `ProspectOutreachRecord[]`? | — | — | **Never written** | No | No | No (Phase C uses its own store) | grep: no writer |
| 19 | `createdAt` | string | seed literal `'2026-09-06'` | Raw | Yes | No | No | No | runtime |
| 20 | `lastResearched` | string | seed `'2026-09-06'`, overwritten with `now` at boot and on every mutation | Mixed | Yes | No | No | No | `mockClient:45` |
| 21 | `lastAmazonCheck` | string? | — | — | **Never written** | No | No | No | grep: 0 refs outside types |
| 22 | `lastDistributorCheck` | string? | — | — | **Never written** | No | No | No | grep: 0 refs |
| 23 | `lastContactCheck` | string? | — | — | **Never written** | No | No | No | grep: 0 refs |
| 24 | `lastChecked` | string? | **derived** — stamped by a run only (absent at boot) | Derived | Session | No | Yes (badge, InfoRow) | No | `prospectLifecycle:175`; runtime |
| 25 | `nextCheck` | string? | **derived** — `now + 7d` at run only | Derived | Session | No | Yes (badge, InfoRow, Pipeline Control) | No | `prospectLifecycle:135,175` |
| 26 | `evidence` | `ProspectEvidence[]` | seed literal (17 records total) | Raw | Yes | No (only its **length** is compared during runs) | **Not rendered by any component** | No (the "evidence" shown in Outreach is a generated markdown string, a different object) | §6.7; grep: no UI reference |
| 27 | `disqualified` | boolean | **derived** (`checkDisq` at boot/run) + operator override | Derived | Yes | n/a | Yes | Yes (excluded from ICP + acquisition) | validator + runtime |
| 28 | `disqualificationReason` | string? | `checkDisq` reason or operator reason | Derived | Yes | n/a | Yes | No | runtime |
| 29 | `source` | `'mock' \| 'live'` | **hardcoded `'mock'`** by `scoreProspect` | Derived | Yes | No | No (not shown in UI) | No | `mockClient:46` |
| 30 | `owner` | string? | — | — | **Never written** | No | No | No | grep: type only |
| 31 | `notes` | string? | — | — | **Never written on prospects** | No | No | No | grep: other models only |

**Runtime key set (union across all 12 records — diagnostic §28.3), exactly 23 keys:**
`asins, brand, brandMaturity, category, contacts, countries, createdAt, disqualificationReason, disqualified, distributors, evidence, growthSignals, id, incumbentChallenged, lastResearched, outreachStatus, restrictions, score, source, ukPresence, website, wholesale, whyInteresting`
→ 8 declared fields (`outreach, lastAmazonCheck, lastDistributorCheck, lastContactCheck, lastChecked, nextCheck, owner, notes`) are **absent at boot**; `lastChecked`/`nextCheck` appear only after a run.

### 6.2 Brand / company intelligence — FOUND / NOT FOUND

| Field | Verdict | Evidence |
|---|---|---|
| brand name | **FOUND** | `BrandProspect.brand` |
| legal / company name | **NOT FOUND** — no company number, registration or legal-entity field in BI (`companiesHouseNumber` exists only on the ICP discovery `EnrichedLead`) | `types.ts` BI block |
| website | **FOUND** (10 of 12 populate it) | runtime |
| country / countries | **FOUND** (`countries` on 3 records; `ukPresence` on 10) | runtime |
| market | **NOT FOUND** (no market/territory field; only `countries` + `ukPresence`) | types |
| category | **FOUND** | runtime |
| subcategory (brand level) | **NOT FOUND** (subcategory exists only on ASINs, and only on 3 ASINs) | seed read |
| company size / employees | **NOT FOUND in BI** — the only "employee" strings in the repo are mock website copy in `firecrawlClient.ts:24-28`, which BI never calls | grep |
| brand description | **NOT FOUND as a field**; prose lives in `whyInteresting` (free text) | types + runtime |
| ownership | **NOT FOUND** | types |
| incumbent relationships | **FOUND** as a free-text array `incumbentChallenged` (Tapatío `['Tabasco']`, Cholula `['Tabasco']`) — no incumbent record, no share data | runtime |
| competitors | **NOT FOUND** on the prospect; `BrandMarketIntelligence.topCompetitors` is declared, always `[]`, and has no caller | `brandIntelligenceClient:83` |
| distribution information | **PARTIAL** — 1 distributor record in the whole universe plus `ProspectWholesale` flags on 12 records | §6.4 |
| existing Amazon presence | **PARTIAL** — per-ASIN `amazonRetailSeller`, `sellerCount`, `amazonOfferClass/Confidence`; no brand-level presence field | §6.3 |
| other marketplace presence | **NOT FOUND** | types |

### 6.3 Amazon / product intelligence — `ProspectASIN` (24 declared fields)

| # | Field | Populated in the dataset? | Used in score? | Displayed? | Downstream? | Evidence |
|---|---|---|---|---|---|---|
| 1 | `asin` | Yes — **synthetic**: `B0HOT01`, `B0HOT02`, `B0HOT10`, `B0HOT11`, `B0HOT20`, `B0CLN01`, `B0SEP01`, `B0DEC01`, `B0JNG01`, `B0LCK01`, `B0HON01`, `B0BAB01`, `B0TRU01`, `B0UPC01` (14 ASINs, all hand-written) | No | indirect (link) | No | runtime dump |
| 2 | `title` | Yes (all 14) | No | Yes | Yes (email copy) | runtime |
| 3 | `category` | Yes (all 14) | No | No | No | runtime |
| 4 | `subcategory` | **3 of 14** (`'Hot Sauce'` on Tapatío ×2 + Cholula ×1) | No | No | No | seeds |
| 5 | `price` | Yes (all 14) | **Yes** — `l()` margin suitability, avg-price band 5–150 | Yes | No | `scoringEngine:53-56` |
| 6 | `packSize` | **Never populated** (0 occurrences) | No | No | No | grep |
| 7 | `rating` | Yes | **Yes** — `d()` → `salesEstimateScore` | Yes (★) | No | `scoringEngine:26` |
| 8 | `reviewCount` | Yes | **Yes** — `d()` reviewScore + `checkDisq` threshold (<10 ⇒ DQ) | Yes | Yes (copy) | `scoringEngine:9,22` |
| 9 | `bsr` | Yes | **Yes** — `d()` bsrScore | Yes ("BSR #") | Yes (copy) | `scoringEngine:23` |
| 10 | `subcategoryRank` | **Never populated** | No | No | No | grep |
| 11 | `amazonUrl` | Yes — built as `https://amazon.co.uk/dp/<synthetic asin>` | No | Yes (external link) | No | `brandProspectSeed.ts:31` |
| 12 | `featuredOffer` | **Never populated** | No | No | No | grep |
| 13 | `sellerCount` | Yes | **Yes** — `p()` supply fragmentation | Yes | Yes (copy) | `scoringEngine:31` |
| 14 | `amazonRetailSeller` | Yes — `true` on exactly 1 ASIN (Seep) | **Yes** — `p()` ro, `ac()` sophistication risk | No (absent from the Amazon tab) | No | runtime |
| 15 | `marketplaceSellers` | **Never populated** | No | No | No | grep |
| 16 | `prime` | Yes (all `true`) | No | Yes (Prime badge) | No | runtime |
| 17 | `searchTerms` | **Never populated** | No | No | No | grep |
| 18 | `estimatedSales` | Yes (13 of 14 ASINs) — **literal integers**, e.g. Tapatío `3200`/`1800` | **Yes** — `d()` searchDemandScore | Yes ("~N/mo", Overview sum) | No | `scoringEngine:24` |
| 19 | `estimatedRevenue` | Yes (same 13) — literal integers, e.g. `38400`/`34200` | **Yes** — `p()` brand growth | Yes | **Yes** (email copy, LinkedIn copy, snapshot, brand view) | `scoringEngine:32` |
| 20 | `amazonOfferClass` | Yes — `MARKETPLACE_HEAVY` (12), `AMAZON_PRESENT_BUT_UNCLEAR` (1), `MARKETPLACE_ONLY_OBSERVED` (2) | **Yes** — `p()` ro | Yes (badge; the panel column shows the "worst" class by index order) | No | `scoringEngine:33`; `BrandIntelligencePanel:17` |
| 21 | `amazonOfferConfidence` | Yes — always `'medium'` | No | No | No | runtime |
| 22 | `lastObserved` | Yes — always `'2026-09-06'` | No | No | No | runtime |
| 23 | `evidence` | 3 main-brand ASINs: 2 entries each; **all 11 extra-seed ASINs: `[]`** | No | No | No | runtime |
| 24 | `sourceLabel` | Yes — always the string `'Amazon UK'` | No | No | No | runtime |

**ASIN distribution (runtime):** 14 ASINs / 12 brands — Tapatío 2, Cholula 2, Valentina 1, Astonish 1, Seep 1, Delphis Eco 1, Fly By Jing 1, LocknLock 1, Mike's Hot Honey 1, Kit & Kin 1, Truthbrush 1, UpCircle 1.

**Notable:** `sourceLabel: 'Amazon UK'` and the evidence entry `source: 'MerchantWords estimate'` are **strings only** — there is no Amazon client, no Keepa call, no MerchantWords client anywhere in the BI path. The `amazonUrl` values (`https://amazon.co.uk/dp/B0HOT01`) are syntactically plausible but resolve to nothing, because `B0HOT01` is not a real ASIN.

### 6.4 Distributor intelligence — `ProspectDistributor` (12 fields)

| Field | Status |
|---|---|
| `company`, `website`, `territory`, `exclusive`, `source`, `sourceUrl`, `confidence`, `evidence`, `suggestedApproach` | Populated — **for Cholula only** (`Global Brands Ltd`, `https://globalbrands.co.uk`, `UK & Ireland`, `exclusive:false`, source `Brand website`, `https://cholula.com/uk-stockists`, `confidence:'medium'`, 1 evidence entry, `suggestedApproach:'approach_both'`) |
| `contact`, `email`, `phone` | **Never populated** (0 occurrences in either seed file) |

11 of the 12 brands have `distributors: []`. Because `gd()` scores "no distributor" as the maximum openness (10/10), the single missing intelligence dimension accidentally awards every brand the top distribution score.

### 6.5 Restriction intelligence — `ProspectRestriction` (7 fields)

Two records only, both on hard-disqualified brands:

- **Truthbrush** — `description:'Amazon prohibited'`, `severity:'hard'`, `restrictionText:'Not authorised for Amazon'`, `source:'Brand'`, `sourceUrl:'https://truthbrush.com/stockists'`, `dateObserved:'2026-09-06'`, `evidence: []`
- **UpCircle** — `description:'Platform restriction'`, `severity:'hard'`, `restrictionText:'No third-party marketplaces'`, `source:'Brand'`, `sourceUrl:'https://upcirclebeauty.com/wholesale-terms'`, `dateObserved:'2026-09-06'`, `evidence: []`

Both are caught by `checkDisq`'s substring test on `'amazon'` / `'marketplace'`. `severity:'conditional'` is declared, scored by `ac()` (`rr: 0` when a conditional or hard restriction exists) and used by **no record**.

### 6.6 Contact intelligence — `ProspectContact` (12 fields)

| Field | Populated? |
|---|---|
| `name` | Yes — 5 records: Sherry Zhang (Tapatío, VP International Sales), Laura Harnett (Seep, Founder/CEO), Jing Gao (Fly By Jing, Founder/CEO), Mike Kurtz (Mike's Hot Honey, Founder/CEO), Emma Bunton (Kit & Kin, Co-Founder) |
| `jobTitle` | Yes (all 5) |
| `company` | Yes (all 5) |
| `country` | **Never populated** |
| `email` | **Never populated — 0 email addresses in the entire BI dataset** |
| `emailConfidence` | Yes — hardcoded strings `'pattern_derived'` (Seep, Fly By Jing) and `'unverified'` (Tapatío, Mike's, Kit & Kin). No verification mechanism exists anywhere; the value is a literal |
| `phone` | **Never populated** |
| `phoneConfidence` | Yes — always `'unverified'` |
| `linkedInUrl` | **Never populated (0 occurrences)** → the People tab's LinkedIn link never renders |
| `source` | Yes — `'LinkedIn'` (Tapatío), `'Brand'` (Seep, Fly By Jing, Mike's), `'Press'` (Kit & Kin) |
| `lastVerified` | Yes — always the literal `'2026-09-06'` |
| `evidence` | Tapatío: 1 entry pointing at `https://linkedin.com/company/tapatio-foods`; the other 4: `[]` |

7 of 12 brands have **no contact at all**. `ac()` rewards a brand merely for `contacts.length > 0` (founder accessibility `fa: 2` vs `1`), so the presence of any (name-only) contact changes the score even though no contact data can be used to reach anyone.

### 6.7 Evidence / provenance — `ProspectEvidence` (8 fields)

| Field | Populated? | Values observed |
|---|---|---|
| `field` | Yes | `'asin'`, `'estimatedSales'`, `'wholesale'`, `'growth'`, `'contact'`, `'brand'` |
| `value` | Yes | Free text or the numeric value as a string |
| `source` | Yes | `'Amazon UK'`, `'MerchantWords estimate'`, `'Brand website'`, `'Tesco.com'`, `'LinkedIn'` |
| `sourceUrl` | Yes | e.g. `https://amazon.co.uk/dp/B0HOT01`, `https://tesco.com`, `https://linkedin.com/company/tapatio-foods` |
| `dateObserved` | Yes | always `'2026-09-06'` |
| `confidence` | Yes | always `'medium'` |
| `classification` | Yes | `'FACT'` (13) or `'ESTIMATE'` (4 — all the `estimatedSales` entries) |
| `notes` | **Never populated** | — |

**Total evidence records: 17.** Distribution: Tapatío 7 (1 brand + 2 × 2 ASIN + 1 wholesale + 1 growth + 1 contact), Cholula 1, Valentina 1, the 9 extra-seed brands 0.

**Notable:** `ProspectEvidence` is **never rendered by any component** (no UI file references `p.evidence`). The evidence/provenance model the codebase advertises is collected and persisted in memory but never presented. What the Phase C Outreach surface labels "evidence" is `generateOutreachSummary()` markdown stored on `ProspectOutreachRecord.evidenceSummary`.

### 6.8 Scoring fields — `ProspectScore` (10 fields)

`amazonDemand, poPotential, growth, distributionOpenness, acceptanceProbability, mercentaFit, logisticsSuitability, total, tier, calculatedAt` — all populated (derived). Exact maths in §11.

### 6.9 Wholesale fields — `ProspectWholesale` (11)

Populated on all 12 records: `wholesaleAvailable` (all `true`), `distributorProgramme`, `retailerProgramme`, `source`, `sourceUrl`, `confidence`, `evidence` (the 9 extra-seed records carry `evidence: []`).
**Never populated:** `minimumOrderQuantity`, `tradePricingAvailable`, `tradeUrl`, `retailerApplicationUrl` (0 occurrences each).

### 6.10 Lifecycle enumerations

- `OutreachStatus` — 14 values declared (`uncontacted, researching, ready_to_contact, contacted, opened, replied, interested, meeting_scheduled, negotiating, pilot, won, lost, nurture, disqualified`). In the dataset only `uncontacted` (10) and `disqualified` (2) exist; the rest are reachable only through Phase C transitions (`setProspectOutreachStatus`).
- `ProspectTier` — 5 values; **at runtime all 12 records land in `unscored` (8) or `tier_4` (2)** (§28.3).
- `BrandMaturity` — 6 declared; only `challenger` (10) and `niche` (2) used.
- `AmazonOfferClassification` — 6 declared; data uses `MARKETPLACE_HEAVY` (12 ASINs), `AMAZON_PRESENT_BUT_UNCLEAR` (1), `MARKETPLACE_ONLY_OBSERVED` (2). `DIRECT_AMAZON_RETAIL`, `NO_CURRENT_OFFER` unused in data; `UNKNOWN` used only as a UI fallback.
- `ConfidenceLevel` — `high`/`medium`/`low` declared; in BI **everything is `'medium'`** (evidence, distributor, wholesale, ASIN offer confidence).

### 6.11 Recorded history + status objects

| Object | Fields | Produced by | What it actually contains |
|---|---|---|---|
| `IntelligenceRun` | 15 (`runId, startedAt, completedAt, status, trigger, mode, scannedCount, newCount, updatedCount, disqualifiedCount, unchangedCount, changedProspectIds, candidatesCount, errorCount, summary`) | boot (1) + every manual run | `mode` always `'mock'`; `trigger` only `'seed'` or `'manual'` (`'scheduled'` never produced); the boot run has `newCount: 12` and `changedProspectIds` = all 12 ids |
| `ProspectChangeEvent` | 10 (`id, runId, prospectId, brand, changeType, timestamp, field, before, after, summary`) | boot (12 `created`), runs, DQ/RQ, and **every downstream outreach transition** | `runId` values: `'run-seed-baseline'`, `'run-<epoch>'`, `'manual'` (DQ/RQ), `'acquisition'` (outreach status). `field` ∈ {`undefined`, `'discovery'`, `'score'`, `'disqualified'`, `'outreachStatus'`} |
| `IntelligenceSnapshot` | 9 (`snapshotDate, brandId, brand, category, score, totalAsins, estimatedMonthlyRevenue, distributorStatus, outreachStatus`) | one row per prospect per run | 0 at boot; 12 after one run. Doc-comment says "Weekly"; the row is written **per run**, so two runs on one day produce two rows sharing a `snapshotDate`. `score` is an embedded copy of the whole `ProspectScore` |
| `IntelligencePipelineStatus` | 7 (`totalTracked, activeCount, disqualifiedCount, runCount, lastRun, lastCheckedAt, nextScheduledCheck`) | derived on demand | `nextScheduledCheck` = earliest `nextCheck` (display only) |
| `IntelligenceDashboard` | 11 | derived on demand | `newThisWeek` hardcoded `0`; `topProspect = s[0]` (array order — **not** the highest-scoring prospect); `categoryBreakdown` counts **active** prospects only |
| `IntelligencePipelineConfig` | 8 (`categories, minMonthlyUnits, minMonthlyRevenue, minRating, minReviews, maxProductsPerCategory, maxBrands, autoDisqualify`) | **never constructed by product code** | `maxBrands` is read only by the dead `runPipeline`; the other 7 fields are used nowhere |
| `IntelligencePipelineResult` | 10 | returned only by the dead `runPipeline` | — |
| `BrandMarketIntelligence` | 14 | dead `getBrandIntelligence` | `topCompetitors`/`salesTrend`/`priceDistribution`/`reviewDistribution` always `[]`; `categoryAverageSales`/`categoryMarketSize` always `0`; `categoryGrowth` always `12` |
| `RawScoreFactors` | 26 leaf slots in 7 groups (`amazonDemand` 4, `poPotential` 5, `growth` 3, `distribution` 2, `acceptance` 4, `mercentaFit` 5, `logistics` 3) | only the **type** is referenced (`scoringEngine.ts:5`); no function returns it | `growth.retailExpansion` is **never produced** — the engine's `g()` returns only `{ss, cb}` |

**Declared-but-unimplemented scoring API:** `intelligenceTypes.ts:184-189` declares
`ScoringEngine { calculate(asins, signals, status); calculateRaw(asins, signals, status); assignTier(total); checkDisqualifiers(asins, restrictions) }`.
**No class or object in the repository implements this interface** (grep: 0 implementations). The real engine exposes free functions `calculateScore(asins, signals, distributors, restrictions, contacts, category)` and `checkDisq(asins, restrictions)` with **different signatures**. `calculateRaw`, `assignTier` and `checkDisqualifiers` **do not exist as code anywhere**.

**Declared-but-unused engine options:** `IntelligenceEngineOptions` (l.24) declares `config` (required), `forceMock`, `seedBrands`, `knownExclusions`. `runBrandIntelligence` accepts only `RunDiscoveryOptions = {trigger, candidates, maxBrands}`. `seedBrands` and `knownExclusions` (the "skip known disqualifications" seam) are **not implemented anywhere**.

### 6.12 Phase C downstream objects (BI-fed fields marked ★)

| Object | Fields | BI-fed fields |
|---|---|---|
| `Lead` (ICP projection) | 11 | ★`id` (`lead-<prospectId>`), ★`prospectId`, ★`persona` (contact name + title, or `'Brand contact'`), ★`company` (brand), ★`location` (joined `countries`, else website), `email` (from contact — **always `''` today**), ★`priority` (tier T1/T2 → `'High'`, else `'Medium'`), ★`outreachStatus` (mapped from BI status), ★`segment` (category), `fitScore` (ICP-computed; starts 0), ★`region` (derived from `countries`/`ukPresence`) |
| `ProspectOutreachRecord` | 20 | `evidenceSummary` (BI outreach summary markdown), `leadId` (`lead-<prospectId>`), `contactId` (set to the contact **name**, not an id) |
| `OutreachResponse` | 11 | `prospectId` (identity only) |
| `Opportunity` | 17 | ★`prospectId`, ★`brand`, ★`category`, ★`biScore`, ★`biTier`, ★`evidenceSummary`, `contactName`, `contactEmail` (from the BI contact), `leadId`, `outreachId`, `responseId` |
| `AcquisitionEvent` | 8 | `prospectId`, `brand` |
| `AcquisitionRelationship` | 7 | ★`prospect` — the **entire `BrandProspect` object** |
| `AcquisitionPipelineSummary` | 7 | counts only |

### 6.13 Dictionary size

115 BI-core record fields (31 + 24 + 10 + 8 + 12 + 12 + 11 + 7) · 110 lifecycle/history/config fields (15 + 10 + 9 + 7 + 11 + 8 + 10 + 14 + 26) · 81 Phase C fields (20 + 11 + 17 + 8 + 7 + 7 + 11) · 95 mapping/constant entries (7 score weights + 4 tier thresholds + 12 growth-signal points + 5 tier labels + 5 tier colours + 1 `NEXT_CHECK_DAYS` + 61 `ICP_REGION_BY_COUNTRY` keys).

**Audited total: 401 declared BI field/constant entries**, of which **115 are BI-core record fields**, **~23 are populated but never read by any consumer**, and **~25 are declared but never populated at all** (§29 enumerates both sets).

---

## 7. Complete source / provenance map

| Data | Where it actually comes from | Network? | Provider/client | Endpoint | Auth | Transformation | Storage | Consumer |
|---|---|---|---|---|---|---|---|---|
| All 12 prospects, 14 ASINs, 5 contacts, 1 distributor, 2 restrictions, 1 growth signal, 17 evidence rows, all wholesale flags | **Hand-written TypeScript literals** in `src/data/brandProspectSeed.ts` + `src/data/brandExtraSeed.ts` | **NONE** | none | — | — | `.map(scoreProspect)` at boot | module arrays in `prospectStore` | UI, ICP projection, Phase C |
| `score`, `disqualified`, `disqualificationReason` | **Computed** by `scoringEngine.calculateScore/checkDisq` from those literals | NONE | none | — | — | pure functions | in the record | UI, `Lead.priority`, `Opportunity.biScore` |
| `lastChecked`, `nextCheck` | Computed at run time (`now + 7d`) | NONE | none | — | — | `isoDaysFromNow(7)` | in the record | UI display only |
| Runs / change events / snapshots | Generated by `runBrandIntelligence` | NONE | none | — | — | classification logic | `runs`/`changes`/`snapshots` arrays | Run History, History tab |
| ICP origin region | Derived from `countries`/`ukPresence` via `ICP_REGION_BY_COUNTRY` | NONE | none | — | — | 61-key lookup | `Lead.region` | ICP, acquisition |
| `Lead.fitScore` | Computed by `scoreLeadFit` (**ICP, not BI**) from company/persona/segment/location text vs the ICP config | NONE | none | — | — | keyword/region scoring | React state + persisted at transitions | MarketingHub |
| Outreach copy (`subject`, `body`, `evidenceSummary`) | Generated from the BI record by `outreachGenerator` | NONE | none | — | — | template strings | `acquisitionStore.outreach` | Workflow, CRM |
| Send transport | `simulationOutreachTransport` (`{ok:true, sandbox:true}`) unless an email provider is connected | **NONE in the default path** | `transportFromEmailClient` wraps the existing email client **only if** `comms.emailLive \|\| emailSandbox` | provider-defined | provider-defined | request `{to, subject, body}` → `{ok, sandbox?, error?}` | `demoMessages` via `logMessage` | Messages, CRM |
| Messages | `logMessage()` → `demoMessages` array | NONE | none | — | — | prepends a `Message` | `demoMessages` | MessagesHub, CRM, workflow |

**Explicit statement required by the brief: no BI code path makes a network request.** Every external-looking element is a string literal, a label, or a dead module:

- `'Amazon UK'` (ASIN `sourceLabel`, evidence `source`), `'MerchantWords estimate'` (evidence `source`), `'LinkedIn'`/`'Brand'`/`'Press'` (contact `source`) — **labels only**.
- `amazonUrl` values — constructed locally from synthetic ASINs.
- `firecrawlClient.ts`, `firecrawlResearch.ts`, `engine.ts` (OpenRouter / directory / Companies House / Hunter / Instantly), `keepaClient.ts` — real clients that **do** make real HTTP calls, but which **no BI module imports or calls**.

**Real external clients that exist but are unreachable from BI** (for completeness):

| Client | File | Real class | Endpoint | Activation gate |
|---|---|---|---|---|
| Firecrawl | `src/lib/discovery/firecrawlClient.ts:47` | `RealFirecrawlClient` | `https://api.firecrawl.dev/v1/crawl` | `createFirecrawlClient(apiKey)` with a non-`mock:` key |
| OpenRouter research | `src/lib/discovery/engine.ts` | `RealOpenRouterResearchClient` | `https://openrouter.ai/api/v1/chat/completions` | API key + budget cap |
| Keepa | `src/lib/research/keepaClient.ts:53` | `RealKeepaClient` | `https://api.keepa.com/…` | `createKeepaClient(apiKey)` |
| SP-API / DHL / Companies House / HMRC | `src/lib/spapi/*`, `src/lib/dhl/*`, `src/lib/compliance*` | real + mock trios | — | integration connection state |

---

## 8. Amazon / product / ASIN intelligence — as implemented

| Question from the brief | Answer | Evidence |
|---|---|---|
| How are ASINs discovered? | **They are not discovered.** 14 ASIN identifiers are typed by hand into the two seed files. `createAmazonDataClient()` — the only thing that could ever return ASINs — is never called | `brandProspectSeed.ts:62-63,83-84,101`; `brandExtraSeed.ts`; grep `createAmazonDataClient` → 0 call sites |
| Are ASINs actually fetched? | **No.** No ASIN-related network request exists in the BI path (validated: 0 external fetches — §28.2/§28.3) | `validate-bi-lifecycle.mjs` final assertion |
| Which provider supplies them? | **None.** `MockAmazonDataClientImpl.searchBrand()` would read the seed arrays if it were ever called; `searchCategory()` returns `[]`; `getAsinDetail()` scans the seed arrays | `discoveryClient.ts:98-113` |
| Are product details fetched? | **No.** `title`, `category`, `price`, `rating` etc. are literals on the same object | seeds |
| Are estimated sales fetched or calculated? | **Neither.** `estimatedSales` is a literal integer; no formula anywhere derives sales from BSR, reviews, price or anything else | `brandProspectSeed.ts:26,33,38` |
| How are estimated sales calculated? | **Not calculated.** The only *use* is hidden inside `d()`'s `searchDemandScore` (a total compared against 2000), plus UI sums and one `generateEmail` variable that is computed and never printed | `scoringEngine.ts:24`; `outreachGenerator.ts:17` |
| Is price captured? | **Yes, as a literal** (4.99–41.99); used only for the average-price margin band | `scoringEngine:53-56` |
| Is BSR/rank captured? | **Yes, as a literal**; `subcategoryRank` is never populated | §6.3 |
| Are reviews captured? | **Yes**, `reviewCount` literal; used in the score and the DQ threshold and the copy | §6.3 |
| Is rating captured? | **Yes**, literal; used as `salesEstimateScore` (mislabelled) | `scoringEngine:26` |
| Is revenue estimated? | **No** — `estimatedRevenue` is a literal per ASIN | seeds |
| Is demand calculated? | **Only** as `searchDemandScore = min(5, round(totalEstimatedSales / 2000))` | `scoringEngine:24` |
| Do product-level scores exist? | **No.** Scoring is brand-level only — no per-ASIN score, tier or ranking. The panel's "Amz" column is the *worst* `amazonOfferClass` string, not a score | `BrandIntelligencePanel.tsx:17,100` |
| Does the brand score use product data? | **Yes** — heavily (reviews, BSR, sales, rating, price, seller count, Amazon-retail flag, offer class) | §11 |
| Is product evidence retained? | **Only on 3 ASINs** (Tapatío ×2, Cholula ×1 → 2 evidence rows each). All 11 extra-seed ASINs carry `evidence: []` | §28.3 |
| Is product data persisted? | In memory only, inside the prospect record, for the session | §16 |
| Is product data displayed? | Yes — the detail **Amazon** tab (title, offer class, price, rating, reviews, BSR, estimated sales/revenue, seller count, Prime) plus the Overview sums | `ProspectDetailTabs.tsx:46-65` |
| Is product data passed downstream? | **Only as copy and counts**: ASIN count + summed revenue/reviews/rating/BSR/sellers inside the outreach text; `totalAsins` + `estimatedMonthlyRevenue` in snapshots; ASIN count in the workflow header. **No ASIN identifier, price, BSR, rating or per-ASIN record crosses into ICP, outreach records, Opportunity or CRM** | `outreachGenerator.ts`; `prospectLifecycle.ts:56-68`; `AcquisitionWorkflow.tsx:223` |

**Summary:** the implemented Amazon intelligence is a **14-row, brand-associated, hand-written fixture plus a deterministic brand-level scorer**. There is no ASIN discovery, no product fetch, no sales model, no per-product scoring, and no product-level provenance for 11 of the 14 ASINs.

---

## 9. Sales / demand intelligence — as implemented

| Aspect | Implementation |
|---|---|
| Sales figures | `ProspectASIN.estimatedSales` (units/month) and `estimatedRevenue` (GBP/month) — literal integers on 13 of 14 ASINs |
| Provenance claimed | `evidence: [{ field:'estimatedSales', source:'MerchantWords estimate', classification:'ESTIMATE' }]` — but **no MerchantWords client exists**; the string is authored inside the seed helper (`brandProspectSeed.ts:38`) |
| Brand-level roll-up | Plain `reduce(… + estimatedRevenue)` / `reduce(… + estimatedSales)` in `getBrandIntelligence` (dead), `toSnapshot`, `amazonEvidence`, `generateEmail`, `generateLinkedInMessage`, `ProspectDetailTabs` (Overview) and `brand/BrandIntelligence.tsx` ("Category Size", labelled `£Xk/mo`) |
| Demand model | `searchDemandScore = Math.min(5, Math.round(totalEstimatedSales / 2000))` — 0–5 raw points inside `amazonDemand` |
| Market-size model | **None.** `categoryMarketSize` and `categoryAverageSales` are hardcoded `0`; the brand view's "Category Size" is the sum of `estimatedRevenue` across prospects in the same category (1–5 synthetic records) |
| Growth model | The brand view displays a **hardcoded `+12%`**; `BrandMarketIntelligence.categoryGrowth` is likewise hardcoded `12` |
| Trend data | `salesTrend`, `priceDistribution`, `reviewDistribution`, `topCompetitors` are declared and always `[]` |
| Historical demand | **None.** No time series exists in BI (a snapshot stores one scalar per run, and only for runs in the current session) |

**Conclusion:** BI contains **no sales-estimation or demand-calculation system** — literal numbers, three summation expressions and two hard-coded growth constants.

---

## 10. Contact / person discovery — as implemented

| Question | Answer | Evidence |
|---|---|---|
| Where do contacts come from? | A literal array on each prospect in the seed files (5 contacts total) | §6.6 |
| How are they discovered? | **They are not.** `MockDiscoveryClientImpl.searchForContacts()` would look them up in a `Map` built from the seeds, but the module has zero callers | `discoveryClient.ts:14-22,47-59` |
| Which providers are involved? | **None.** No Hunter/Clay/Apollo/LinkedIn client is imported by BI (`Hunter` and `Instantly` appear only inside `lib/discovery/engine.ts`, the separate ICP engine) | grep |
| What fields are returned? | `name`, `jobTitle`, `company`, `emailConfidence`, `phoneConfidence`, `source`, `lastVerified`, `evidence` | §6.6 |
| Is email actually retrieved? | **No.** 0 emails exist in the dataset, so `deriveLeadFromProspect` sets `email: ''` for all 10 acquisition leads (runtime) | §28.3 |
| Is LinkedIn actually retrieved? | **No.** `linkedInUrl` is never populated, so the People tab's LinkedIn link never renders. "LinkedIn" appears only as a `source` label and inside one `sourceUrl` | §6.6 |
| Is role/title retrieved? | **Yes**, as a literal `jobTitle`; used in the persona string and the copy greeting | runtime |
| Is contact relevance scored? | **Only binary**: `ac()` gives founder-accessibility `2` when `contacts.length > 0`, else `1`. No seniority weighting or ranking | `scoringEngine:40-45` |
| Does contact verification exist? | **No.** `emailConfidence`/`phoneConfidence` are hardcoded literals; nothing verifies anything | §6.6 |
| Can multiple contacts exist per brand? | The type allows it; the dataset has at most one per brand | runtime |
| How is the preferred contact selected? | **Always `contacts[0]`** — first array element, in 6 places (`deriveLeadFromProspect`, `outreachGenerator.pickContact`, `generateEmail`, `generateLinkedInMessage`, `generateFollowUp`, `createOpportunityFromResponse`) | `prospectPipeline:81`; `outreachGenerator:10-12`; `outreachLifecycle:633` |
| Where is contact data stored? | Inside the prospect record (in memory), copied into `Lead.persona` and `Opportunity.contactName/contactEmail` | §6.12 |
| Does contact data reach ICP? | **Partially** — the persona string (name + title) and `email` (empty) | §21 |
| Does contact data reach outreach? | **Yes** — the greeting first name and the destination address (fallback placeholder) | §23 |
| Does contact data reach CRM? | **Yes** — `Opportunity.contactName` / `contactEmail` (`undefined` today) | §24 |

**Explicitly absent:** contact discovery, contact enrichment, email-pattern inference (despite the `'pattern_derived'` confidence value), email/phone verification, LinkedIn retrieval, contact-level scoring, multi-contact ranking, and any preferred-contact selector.

---

## 11. Scoring implementation — exact code trace

### 11.1 The only implemented scoring system

```
Score name: ProspectScore (7 dimensions + total + tier)
File:       src/lib/intelligence/scoringEngine.ts
Functions:  checkDisq(asins, restrictions)                l.7
            calculateScore(asins, signals, distributors,
                           restrictions, contacts, cat)  l.60
Helpers:    d(asins) l.21 · p(asins) l.29 · g(signals) l.36 · gd(distributors) l.38
            ac(restrictions, contacts, asins) l.40 · mf(asins, cat) l.47 · l(asins) l.53

Inputs (all taken from the prospect record):
  1. asins[]          → reviewCount, bsr, rating, estimatedSales, price,
                        sellerCount, amazonRetailSeller, amazonOfferClass
  2. growthSignals[]  → scoreContribution
  3. distributors[]   → length, .exclusive
  4. restrictions[]   → severity
  5. contacts[]       → length only
  6. category         → string membership test

Weights: NONE APPLIED. INTELLIGENCE_SCORE_WEIGHTS (25/20/15/15/10/10/5) is a
         dead constant (intelligenceTypes.ts:104). The engine sums raw points.

Formula (verbatim behaviour of d/p/g/gd/ac/mf/l):
  d  = { reviewScore:        min(8, round(avg reviewCount / 1000)),
         bsrScore:           bsr<=500 ?7 : <=1500 ?5 : <=3000 ?3 : <=5000 ?2 : 1,
         searchDemandScore:  min(5, round(sum(estimatedSales) / 2000)),
         salesEstimateScore: avgRating>=4.5 ?5 : >=4 ?4 : >=3.5 ?3 : 1 }
  p  = { ro: any amazonRetailSeller ? (any AMAZON_PRESENT_BUT_UNCLEAR ? 6 : 4) : 3,
         sd: min(4, round(asins.length / 2)),
         rp: 2                                            ← CONSTANT
         fr: avgSellerCount>=5 ?3 : >=3 ?2 : 1,
         br: min(3, round(sum(estimatedRevenue) / 50000)) }
  g  = { ss: min(8, sum(scoreContribution)), cb: signals.length>0 ?2 :0 }
  gd = { gs: anyExclusive ?2 : distributors.length>0 ?6 :10,
         oe: distributors.length>0 ?3 :4 }
  ac = { wo: 2                                            ← CONSTANT
         fa: contacts.length>0 ?2 :1,
         sr: amazonRetailSellerCount > asins.length/2 ?1 :2,
         rr: any conditional/hard restriction ?0 :3 }
  mf = { sb: min(3, round(asins.length / 2)),
         rp: ['Grocery','Home','Baby','Health & Personal Care','Kitchen'].includes(cat) ?2 :1,
         cb: 1, oc: 2, ss: 1                              ← ALL THREE CONSTANTS }
  l  = { wc: 2, hz: 1                                     ← BOTH CONSTANTS
         ms: avgPrice>=5 && avgPrice<=150 ?2 :1 }

  dScore  = reviewScore + bsrScore + searchDemandScore + salesEstimateScore   (max 25)
  pScore  = ro + sd + rp + fr + br                                            (max 18)
  gScore  = ss + cb + cb     ← the challenger bonus is added TWICE             (max 12)
  gdScore = gs + oe                                                            (max 14)
  aScore  = wo + fa + sr + rr                                                  (max  9)
  mScore  = sb + rp + cb + oc + ss                                             (max  9)
  lScore  = wc + hz + ms                                                       (max  5)
  total   = min(100, dScore+pScore+gScore+gdScore+aScore+mScore+lScore)
  tier    = total>=90 ? 'tier_1' : >=80 ? 'tier_2' : >=70 ? 'tier_3'
            : >=60 ? 'tier_4' : 'unscored'
  calculatedAt = new Date().toISOString().slice(0,10)   (date only, no time)

Reachable maximum: 25+18+12+14+9+9+5 = 92 → tier_1 is reachable only in the
  absolute best case; the declared 100 and the 20/15/10/10/15 maxima are not.

Missing-data behaviour: the only guard is checkDisq, which zeroes the entire
  score when asins.length === 0 or max(reviewCount) < 10. With ≥1 ASIN and
  ≥10 reviews every helper divides by Math.max(length,1) or reduces over a
  non-empty array, so a seed-shaped record cannot produce NaN. A missing
  reviewCount (undefined) would produce NaN with no guard.

Output:    ProspectScore { amazonDemand, poPotential, growth, distributionOpenness,
                           acceptanceProbability, mercentaFit, logisticsSuitability,
                           total, tier, calculatedAt }
Consumers: written onto the record at boot and at every run; read by the panel
           table + 7 ScoreBars, the Mercenta-Fit tab, the ICP `priority` mapping,
           the outreach summary, the run's change detection, `IntelligenceSnapshot`,
           and snapshotted into `Opportunity.biScore`/`biTier`.
```

### 11.2 `checkDisq` — the disqualification rule (l.7-17)

```
If asins.length === 0      → { dq:true, reason:'No ASINs' }
If max(reviewCount) < 10   → { dq:true, reason:'Low demand' }
For each restriction with severity === 'hard':
    if (restrictionText + ' ' + description).toLowerCase()
         contains 'amazon' || 'marketplace' → { dq:true, reason: description }
Otherwise                  → { dq:false }
```

Runtime: Truthbrush (`'Not authorised for Amazon'`) and UpCircle (`'No third-party marketplaces'`) are the only two DQ results the dataset produces. `'Low demand'` and `'No ASINs'` are unreachable with seeds whose ASINs carry 890–5,670 reviews.

### 11.3 Scores named in the brief that do **not** exist

| Named | Implemented? |
|---|---|
| opportunity score | **NO** — `Opportunity` carries no score; it snapshots the BI score |
| brand score / product score / demand score / market score / Amazon score | **NO** — only sub-dimension names inside `ProspectScore` |
| fit score (BI) | **NO** — `Lead.fitScore` is a **separate ICP** score (`scoreLeadFit`, `lib/marketing.ts:60`); Tapatío = 85 under the default ICP vs BI 68 |
| estimated opportunity (currency value) | **NO** |
| geographic fit (BI) | **NO** — region derivation is a lookup, not part of any score |
| incumbent/challenger indicator in the score | **Indirect only** — `g()` grants a flat `+2` challenger bonus for having any growth signal; `incumbentChallenged` itself is never read by the engine |
| contact relevance score | **NO** — only the binary `contacts.length > 0` term |

### 11.4 Scoring defects observed (reported, not fixed)

| # | Observation | Evidence |
|---|---|---|
| S1 | Declared dimension weights are never applied; the achievable maximum is 92, so tier ceiling behaviour differs from the documented 0–100 model | `scoringEngine:70-80`; `intelligenceTypes:104-112`; runtime |
| S2 | The challenger bonus is double-counted (`ss + cb + cb`) | `scoringEngine:72` |
| S3 | `salesEstimateScore` is derived from average **rating**, while the demand-from-sales term is named `searchDemandScore` — the names and the maths are swapped | `scoringEngine:26` |
| S4 | `rp` (poPotential), `wo` (acceptance), `cb/oc/ss` (mercentaFit), `wc/hz` (logistics) are constants, so three dimensions are partly fixed regardless of the brand | `scoringEngine:33,44,50,55` |
| S5 | The engine's practical outcome is that **8 of 10 active brands score < 60** (`unscored`) and none reaches `tier_1`/`tier_2`, making the `Lead.priority = 'High'` branch unreachable and the "High Prob"/"Attack" UI tiers unreachable | runtime §28.3 |
| S6 | `IntelligenceDashboard.topProspect = s[0]` is array order, not the highest score | `brandIntelligenceClient:74` |
| S7 | `getDashboard().newThisWeek` is hardcoded `0` | `brandIntelligenceClient:70` |
| S8 | Seed `score:` literals are discarded at boot (they never match the engine output) — the seeds' own numbers are dead data | §28.3 comparison table |
| S9 | `RawScoreFactors.growth.retailExpansion` is declared but no implementation produces it | `intelligenceTypes:76`; `scoringEngine:36` |

---

## 12. Qualification / disqualification

### 12.1 How a prospect becomes "qualified" today

There is **no explicit qualification step**. A prospect is implicitly targetable when `disqualified === false`. Nothing scores a threshold for qualification, nothing promotes a prospect into a "qualified" state, and `OutreachStatus` has no `qualified` member. The nearest notions are:

- `checkDisq` at boot/run → `disqualified` boolean + reason.
- The tier shown in the UI (`tier_1`…`unscored`) — none of the 12 seeds reaches `tier_1`/`tier_2` at runtime.
- The ICP's **separate** `shouldAutoEnroll(fit, stage)` (threshold 70) and `Lead.outreachStatus === 'Sequenced'` — an ICP concept, not BI.

### 12.2 Disqualification — implemented paths

| Path | Trigger | Effect | Audit | Evidence |
|---|---|---|---|---|
| Engine DQ at boot | `checkDisq` on the seed record | `disqualified:true` + reason, `outreachStatus:'disqualified'`, `score` zeroed (all dimensions 0, tier `unscored`) | The 12 boot `created` events mention the reason in the summary text | `mockClient:28-29,44,46`; runtime (Truthbrush, UpCircle) |
| Engine DQ during a run | `mergeScores` when the fresh `checkDisq` result is `dq` | same as above, plus a `disqualified` change event and `disqualifiedCount +1` | `ProspectChangeEvent{changeType:'disqualified', field:'disqualified'}` | `prospectLifecycle:194-208` |
| Operator DQ (UI) | Detail panel → Disqualify → `window.prompt` for a reason | `disqualified:true`, reason stored (or `'Disqualified by operator'`), record leaves the active table but stays in the store | `ProspectChangeEvent{changeType:'disqualified', runId:'manual'}` | `ProspectDetailPanel:28-34`; `prospectLifecycle:315-344` |
| Sticky rule | `mergeScores`: `effectiveDisq = engineDQ || prev.disqualified` | a re-scan can **never** re-activate a human DQ | — | `prospectLifecycle:86-100`; validator *"manual disqualification is STICKY"* |
| Requalification | Disqualified section → Requalify (or `requalifyProspect`) | `disqualified:false`, reason cleared, `outreachStatus` DQ→`uncontacted` | `ProspectChangeEvent{changeType:'requalified', runId:'manual'}` | `BrandIntelligencePanel:35`; `prospectLifecycle:347-373` |
| Requalification by a run | A run finds `prev.disqualified !== stamped.disqualified` with `stamped.disqualified === false` | emits `requalified` and increments `reqlCount` | Only reachable if a caller supplies a candidate that removes the disqualifier — **no product code path does**; and `reqlCount` is then `void`-ed (line 286), so it is never reported in the run summary | `prospectLifecycle:209-222,286` |

### 12.3 Downstream effects of disqualification

- Excluded from `getAcquisitionLeads()` → never enters ICP, never appears in `AcquisitionPipeline`, never enrols.
- `enrollProspect` and `prepareOutreach` both refuse with `'DISQUALIFIED — not targetable.'`.
- The record stays in the store, in the Disqualified section, and in its own timeline (history preserved).

### 12.4 Qualification defects / gaps observed

| # | Observation | Evidence |
|---|---|---|
| Q1 | No qualification threshold, state or score exists in BI; "qualified" only exists as an `OpportunityStage` in Phase C | grep: no BI `qualified` state |
| Q2 | Engine DQ on `'Low demand'` and `'No ASINs'` is unreachable with the current dataset, so only the two restriction-based DQs ever fire | §11.2 |
| Q3 | `reqlCount` is computed and then discarded (`void reqlCount`), so a run summary can never report requalifications | `prospectLifecycle:286` |
| Q4 | A run can re-qualify a record *without* notifying the operator in the summary line (the summary only prints new/updated/dq/unchanged) | `prospectLifecycle:283` |
| Q5 | `disqualifiedCount` in a manual run is always `0` because the dataset's DQs are already applied at boot | runtime §28.3 |

---

## 13. Evidence / provenance

| Aspect | Implementation |
|---|---|
| Model | `ProspectEvidence { field, value, source, sourceUrl, dateObserved, confidence, classification, notes? }` (`types.ts:1719`) |
| Where evidence lives | `BrandProspect.evidence[]` (top-level), `ProspectASIN.evidence[]`, `ProspectDistributor.evidence[]`, `ProspectWholesale.evidence[]`, `GrowthSignal.evidence[]`, `ProspectContact.evidence[]`, `ProspectRestriction.evidence[]` |
| Producer | Only the seed files (`ev()` / `evEst()` helpers in `brandProspectSeed.ts:15-21`). **Nothing generates evidence at runtime** — no run, no DQ, no outreach action appends evidence |
| Total records | **17** (§6.7): Tapatío 7, Cholula 1, Valentina 1, the other 9 brands 0 |
| Uniformity | every record has `dateObserved:'2026-09-06'` and `confidence:'medium'`; classification is `FACT` (13) or `ESTIMATE` (4) |
| Snapshot of provenance at downstream boundaries | `IntelligenceSnapshot` (score + counts) and `Opportunity.evidenceSummary`/`biScore`/`biTier` are the only provenance artefacts that cross a boundary. Neither carries `sourceUrl`/`dateObserved`/`classification` |
| Display | **No component renders `ProspectEvidence`.** There is no evidence tab, list, panel or per-claim provenance badge anywhere. The Outreach surface's "evidence" is a generated markdown summary (`generateOutreachSummary`) |
| Freshness | no freshness computation exists; `dateObserved` is a constant string, `lastChecked`/`nextCheck` are stamps, and nothing computes staleness |
| Change tracking of evidence | only the **count** is compared between runs (`stamped.evidence.length !== prev.evidence.length`) |

**Conclusion:** evidence and provenance are modelled carefully and populated only for one brand's full record plus two others' partial records; they are never generated, never displayed, and only their count participates in change detection.

---

## 14. Lifecycle

### 14.1 The BI lifecycle states actually implemented

```
(seed literals) ──boot──► ACTIVE ──────────── engine DQ ──► DISQUALIFIED ──requalify──► ACTIVE
                              │                                  ▲
                              │ operator DQ                      │ (sticky: runs cannot revert)
                              ▼                                  │
                          DISQUALIFIED ──────────────────────────┘

ACTIVE.outreachStatus ladder (mutated ONLY by Phase C / ICP, never by a BI run):
  uncontacted → ready_to_contact → contacted → replied → interested → meeting_scheduled
                (enrol)            (send)      (reply)   (hot reply)  (opportunity qualified)
  → negotiating / pilot / won / lost / nurture — declared, unreachable from the current UI
```

| Transition | Writer | Audited? | Notes |
|---|---|---|---|
| seed → active | `boot()` | yes (`created` ×12) | synthetic origin run `run-seed-baseline` |
| active → disqualified (engine) | `checkDisq` via `mergeScores` | yes | reason stored |
| active → disqualified (operator) | `disqualifyProspect` | yes | `runId:'manual'` |
| disqualified → active | `requalifyProspect` | yes | operator-only in practice |
| `outreachStatus` moves | `setProspectOutreachStatus` | yes (`field:'outreachStatus'`, before → after) | called by every Phase C mutator and by `GlobalStateContext.updateLeadStatus` |
| `lastChecked`/`nextCheck` set | `runBrandIntelligence` | no event | stamps only |
| `notes` / `owner` / any enrichment edit | **none** | — | fields exist with no writer and no UI |

### 14.2 What "history" means in BI

Three parallel, append-only ledgers in `prospectStore` module state:

1. `runs: IntelligenceRun[]` — one row per boot + one per manual run.
2. `changes: ProspectChangeEvent[]` — boot `created` ×12, run classification events, DQ/RQ events, **and every downstream outreach-status transition** (the BI timeline therefore also records acquisition activity).
3. `snapshots: IntelligenceSnapshot[]` — one row per prospect per run (empty at boot).

All three are **in-memory only** and lost on reload; the seed baseline (1 run + 12 `created` events) is re-created on every boot, so it is always present again.

---

## 15. Run mechanism — exact answers

| Question | Answer | Evidence |
|---|---|---|
| Is BI automatic? | **PARTIALLY — boot only.** `prospectStore.boot()` runs automatically the first time any store getter is touched in a session (12 re-scores, 1 seed run, 12 `created` events). No further automatic execution exists | `prospectStore:47-81`; `BrandIntelligencePanel:24`; runtime |
| Is BI manually triggered? | **YES.** One button: "Run discovery" → `runBrandIntelligence({trigger:'manual'})` | `BrandIntelligencePanel:33,48` |
| Is there a "Run Discovery" button? | **YES** — Admin → Brands → Brand Intelligence → *Pipeline Control* card; the same panel also renders in Super Admin → Brand Intelligence | `BrandIntelligencePanel:46-48`; `SuperAdminPanel:499` |
| Is there a scheduler? | **NO.** No `setInterval`/`setTimeout`/cron/scheduled job exists in any BI module; nothing calls `runBrandIntelligence` except the button and the validators | grep in `lib/intelligence`, `prospectStore`, BI components |
| What triggers a run? | (a) store boot (internal, `trigger:'seed'`); (b) an operator click (`trigger:'manual'`); (c) validators calling the function directly. **Nothing else** | `prospectLifecycle:106-111` |
| How often does it run? | Boot: once per session/reload. Manual: as often as a human clicks. No periodic behaviour | runtime |
| What does "next check" mean? | `nextCheck = runCompletedAt + 7 days`, stamped on every prospect at every run; surfaced as a badge, an InfoRow, and `IntelligencePipelineStatus.nextScheduledCheck` (earliest). **Nothing acts on it** — no poll, reminder, notification or clock comparison exists | `prospectLifecycle:32,135,175,415-423`; grep: no other consumer |
| What happens to previous results? | Replaced in place (`prospects = nextUniverse`), while run/change/snapshot rows are appended. Previous score *values* survive only inside earlier snapshot rows; there is no record versioning or diff | `prospectStore:174-186` |
| Are previous runs retained? | **YES** — within the session, in `runs[]` (Run History renders the last 10, expandable with their change events) | runtime |
| Are snapshots retained? | **YES** — within the session, appended per run per prospect. **Zero exist at boot**, so the first run produces the first snapshot | runtime §28.3 |
| Are changes tracked? | **YES**, using the coarse rule in §5.2 (`total` score, `evidence.length`, `asins.length`, `distributors.length`) | `prospectLifecycle:228-232` |
| Are new brands deduplicated? | **YES** — by normalized brand key on intake; the store also asserts unique keys | `prospectLifecycle:121-160`; validators *"no duplicate normalized brand keys in the universe"*, *"`Kit&Kin` dedupes onto canonical `Kit & Kin` record"* |
| What identifies the same brand across runs? | Primarily `id`; `normalizeBrandKey(brand)` is the cross-id dedupe key for candidate intake | `prospectLifecycle:113-119` |
| What happens to a previously discovered brand when it is found again? | The **same record** is refreshed (never a second record): fields merged via `stripUndefined`, record re-scored, `updated` event with `field:'discovery'` | `prospectLifecycle:139-147,234-256`; validator *"re-discovered Tapatío candidate merges — still exactly one Tapatío record"* |
| What happens when a brand changes? | If the coarse `dataChanged` rule trips → `updatedCount + 1`, `changedProspectIds.push`, one `updated` event (`field:'score'`, `before → after`). Otherwise the record is silently stamped `lastChecked`/`nextCheck` and counted `unchanged` | `prospectLifecycle:228-259` |
| What happens when a brand is disqualified? | See §12.2 — flag + reason, score zeroed, `outreachStatus:'disqualified'`, excluded from ICP/acquisition, kept in the store and the Disqualified list, audited | `prospectLifecycle:194-208,315-344` |
| What happens when it is requalified? | See §12.2 — flag cleared, reason cleared, status reset to `uncontacted` if it was `disqualified`, audited, re-enters the active universe | `prospectLifecycle:347-373` |
| Is a run a real "discovery"? | **No.** With `candidates` always empty, a run is a deterministic re-check of the same 12 records; `newCount > 0` is impossible from any product code path | `prospectLifecycle:121-160`; runtime summary |

---

## 16. Persistence

| Layer | Present? | Detail | Evidence |
|---|---|---|---|
| In-memory module state | **YES** | `prospectStore` holds four module arrays (`prospects`, `runs`, `changes`, `snapshots`) plus `initialized` and the tick counter; `acquisitionStore` holds `outreach`, `responses`, `opportunities`, `events` | `prospectStore:35-39`; `acquisitionStore:36-39` |
| Survives view navigation | **YES** | module singletons live for the page's lifetime | runtime + E2E |
| Survives full page reload | **NO** | boot re-runs: 12 records re-derived from the seeds, 1 seed run, 12 `created` events, snapshots empty. **All manual runs, all session DQ/RQ and every acquisition artefact are lost** | `prospectStore:48-49`; validator *"store reset re-boots deterministically (12/10/2)"*; `validate-acquisition-pipeline` O1/O2 |
| Supabase persistence | **NO** | `supabase/migrations/*` contain **no** lead/prospect/intelligence table (grep for `lead|prospect|intelligence` across the whole `supabase/` tree returns **no matches**); no BI function calls the Supabase client | grep; §28 |
| Browser persistence (localStorage/sessionStorage/IndexedDB) | **NO** | no BI module references any web-storage API | grep |
| Server / Edge function | **NO** | `supabase/functions/` contains only `xero-token` and `xero-webhook` | directory listing |
| Cache | **NO** | no cache layer, TTL or memoisation — the store *is* the state | grep |
| Dual-write seam | **DOCUMENTED ONLY** | `prospectStore:11-14` and the Phase B/C reports describe "Supabase dual-write remains the future live-persistence seam"; no code exists for it | `prospectStore:11-14` (comment) |

**Persistence contract as implemented:** a session-scoped in-memory universe that deterministically re-derives itself from TypeScript literals on every reload.

---

## 17. History / snapshots

| Question | Answer |
|---|---|
| Are previous runs recorded? | Yes — `IntelligenceRun` rows (in-memory), rendered in Run History (last 10) with per-run change expansion |
| Are previous scores recorded? | Only as `IntelligenceSnapshot` rows, and only for runs performed in the current session (boot creates none) |
| One snapshot per brand or per run? | **Per prospect per run** — `snapshotDate` = run date, so every row from one run shares that date |
| Is the snapshot "weekly"? | **No.** The type's doc-comment says "Weekly snapshot of brand intelligence scores", but the writer fires on every run; two runs in one day produce two rows per prospect with the same `snapshotDate` |
| What does a snapshot contain? | `snapshotDate`, `brandId`, `brand`, `category`, the whole `ProspectScore` (copy), `totalAsins`, `estimatedMonthlyRevenue`, `distributorStatus` (computed from `distributors`), `outreachStatus` |
| Is snapshot data displayed anywhere? | **No.** `getSnapshots()` is called only by the validator — no component renders snapshots or any score trend; there is no score-over-time chart |
| One change event per field? | No — one event per prospect per classification, with `field` naming the class of change (`discovery`/`score`/`disqualified`/`outreachStatus`) and free-text `before`/`after` |
| Are changes pruned? | No pruning exists; the arrays only grow within the session |
| Do changes survive reload? | No |

---

## 18. Deduplication

| Mechanism | Implementation |
|---|---|
| Brand key | `normalizeBrandKey(name)` — NFD normalise, strip diacritics, lowercase, keep `[a-z0-9]` only (`Tapatío` → `tapatio`; `Kit & Kin` → `kitkin`) |
| Universe uniqueness | Seeds are asserted unique by validator (*"no duplicate normalized brand keys in the universe"* — 12 keys) |
| Candidate dedupe within a run | `candidateByKey` Map — the same candidate twice in one `candidates` array is merged (`{...prior, ...c}`) before processing |
| Candidate dedupe against the universe | `byKey` index of existing prospects; a matching key refreshes the **same** `id` (no new record) |
| Genuine new candidate | `id: cand.id ?? 'p-' + key`, pushed with a `created` event and `newCount + 1` (validator: 12 → 13 with a synthetic Tabasco candidate) |
| Event-id collisions | Boot ids embed index + key (`evt-seed-<i>-<key>`); run/DQ/RQ ids use `Date.now()` + array length or a fixed suffix; downstream ids use `Date.now()` + a random suffix — two events in the same millisecond can share a prefix but not the full id in the current code paths |
| Cross-run identity | `id` first, then `normalizeBrandKey` |
| Known gap | Candidates carry no provenance — `runBrandIntelligence` never records where a candidate came from (the source seam is documented as future work, not implemented) |

---

## 19. Tapatío — end-to-end trace (real canonical record)

Every value below is the **runtime** value dumped from the real modules this session (§28.3), not the seed literals.

```
Tapatío
│
├─ HOW IT ENTERED BI
│    Hard-coded literal SEED_PROSPECTS[0] in src/data/brandProspectSeed.ts:56-74
│    id 'prospect-tapatio' · category 'Grocery' · website https://tapatiohotsauce.com
│    countries ['US','UK','Canada'] · ukPresence true · brandMaturity 'challenger'
│    incumbentChallenged ['Tabasco'] · whyInteresting "Strong US hot sauce brand taking
│    share from Tabasco. Growing UK Amazon demand with fragmented marketplace supply.
│    No exclusive UK distributor identified."
│
├─ DISCOVERY / SOURCE
│    NONE. No discovery step, no provider, no network call. `source: 'mock'`
│
├─ COMPANY DATA (runtime)
│    id · brand · category · website · countries · ukPresence · brandMaturity ·
│    incumbentChallenged · whyInteresting · createdAt '2026-09-06' ·
│    lastResearched (set to now at boot) · disqualified false · source 'mock'
│    NOT PRESENT at boot: notes, owner, lastAmazonCheck, lastDistributorCheck,
│    lastContactCheck, lastChecked, nextCheck, outreach[] — the last two appear only
│    after the first manual run
│
├─ PRODUCT DATA (runtime)
│    B0HOT01 "Tapatío Hot Sauce 12oz (3-Pack)" £14.99 · ★4.7 · 2,840 reviews · BSR 1,250 ·
│      8 sellers · amazonRetailSeller false · Prime true · MARKETPLACE_HEAVY ·
│      estimatedSales 3,200/mo · estimatedRevenue £38,400/mo · subcategory 'Hot Sauce' ·
│      evidence ×2
│    B0HOT02 "Tapatío Hot Sauce 5oz (6-Pack)" £18.99 · ★4.6 · 1,890 reviews · BSR 2,100 ·
│      6 sellers · estimatedSales 1,800/mo · £34,200/mo · subcategory 'Hot Sauce' ·
│      evidence ×2
│
├─ ASIN DATA
│    As above. Both identifiers are synthetic (not real Amazon ASINs); their amazonUrl
│    strings are constructed locally, so neither link resolves.
│
├─ SALES DATA
│    Literals: 3,200 + 1,800 units/mo · £38,400 + £34,200 = £72,600/mo.
│    The evidence rows for both claim source 'MerchantWords estimate' — no such client
│    exists anywhere in the repo.
│
├─ MARKET DATA
│    NONE for Tapatío. No market size, share, competitor list or trend. The brand-mode
│    "Market Intel" view aggregates it under Grocery with a hardcoded +12% growth.
│
├─ CONTACT DATA
│    Sherry Zhang · 'VP International Sales' · company 'Tapatío Foods' ·
│    email ABSENT · phone ABSENT · linkedInUrl ABSENT ·
│    emailConfidence 'unverified' · phoneConfidence 'unverified' · source 'LinkedIn' ·
│    lastVerified '2026-09-06' · 1 evidence row → sourceUrl
│    https://linkedin.com/company/tapatio-foods
│
├─ EVIDENCE (7 rows)
│    brand: 'Tapatío identified as challenger to Tabasco' (Amazon UK) — FACT
│    asin ×2 (Amazon UK) — FACT
│    estimatedSales ×2 ('MerchantWords estimate') — ESTIMATE
│    wholesale: 'Wholesale programme available' (Brand website) — FACT
│    growth: 'New UK retail listings' (Tesco.com) — FACT
│    contact: 'Sherry Zhang, VP International Sales' (LinkedIn) — FACT
│    all dateObserved '2026-09-06' · all confidence 'medium'
│
├─ SCORES (runtime, recomputed at boot)
│    amazonDemand 15/25 · poPotential 10/20 · growth 8/15 · distributionOpenness 14/15 ·
│    acceptanceProbability 9/10 · mercentaFit 7/10 · logisticsSuitability 5/5
│    total 68 → tier_4 ("Reserve") · calculatedAt '2026-09-11'
│    (the seed literal said 18/14/12/12/7/8/4 = 75 → tier_3 — DISCARDED at boot)
│    checkDisq → dq false
│
├─ QUALIFICATION
│    Implicit only: not disqualified ⇒ targetable. No qualification event or state.
│
├─ STORAGE
│    prospectStore.prospects[0] (in-memory) + one `created` event on the timeline
│    (evt-seed-0-tapatio, runId 'run-seed-baseline')
│
├─ HISTORY (runtime)
│    after boot: 1 event ("Canonical prospect \"Tapatío\" loaded into the authoritative
│      universe (category Grocery).") · 0 snapshots
│    after one manual run: unchanged (no event; counted in the 12 unchanged) ·
│      1 snapshot { snapshotDate '2026-09-11', totalAsins 2,
│      estimatedMonthlyRevenue 72600, distributorStatus 'NONE_FOUND',
│      outreachStatus 'uncontacted' }
│    after a Phase C transition: an `outreachStatus` event with runId 'acquisition'
```

```
├─ CURRENT UI
│    Admin table row: score 68 · tier badge "Reserve" · D 15 · PO 10 · G 8 · Dist 14 ·
│      Acc 9 · Fit 7 · Amz "marketplace" · Distrib "—" · Ctc "Sherry"
│    Detail Overview: 7 ScoreBars · ASINs 2 · Est. Sales/mo 5000 · Est. Revenue/mo 72600 ·
│      Maturity challenger · UK Presence Yes · Distributors 0 · Contacts 1 ·
│      Growth Signals 1 · Status uncontacted · Challenging Tabasco
│    Amazon tab: 2 ASIN blocks
│    Commercial: wholesale yes/yes/yes · "None identified" distributors
│    People: Sherry Zhang (no email, no LinkedIn link rendered)
│    Mercenta Fit: 2 ASINs · Repeat Purchase Yes · PO Suitability Good ·
│      Self-Service High · score 68/100 · contact line
│    Outreach: the Phase C workflow · History: the event timeline
│    Brand "Market Intel": appears as a Grocery competitor for a Grocery brand session
│
└─ DOWNSTREAM CONSUMERS (runtime)
     prospectStore.getAcquisitionLeads() →
       Lead { id 'lead-prospect-tapatio', prospectId 'prospect-tapatio',
              persona 'Sherry Zhang, VP International Sales', company 'Tapatío',
              location 'US, UK, Canada', email '', priority 'Medium',
              outreachStatus 'Scraped', segment 'Grocery', fitScore 0, region 'us' }
       → GlobalStateContext.leads → MarketingHub ICP (scoreLeadFit = 85 under the default
         ICP) + AcquisitionPipeline row
       → AcquisitionWorkflow: prepareOutreach → generateEmail (subject
         "Tapatío × Mercenta: Amazon UK Distribution Opportunity"; body built from
         2 ASINs / £72.6k / 4,730 reviews / BSR 1250 / 8 sellers / "Hi Sherry,") +
         generateOutreachSummary stored as evidenceSummary
       → approve → sendOutreach (simulation; destination hello@tapatio.example because
         no email exists) → logMessage (brandId 'prospect-tapatio') →
         simulateResponse → classifyInboundReply → Opportunity
         { id 'opp-prospect-tapatio', biScore 68, biTier 'tier_4', evidenceSummary,
           contactName 'Sherry Zhang, VP International Sales', contactEmail undefined }
       → CRM "Acquisition Relationships" + Messages thread "Tapatío (prospect)"
```

**Confirmed by E2E this session** (`e2e/acquisition-pipeline.spec.ts` — 4 tests PASS): the Tapatío row exposes `prospect-tapatio` and `lead-prospect-tapatio`, produces a pending recommendation, a revision-2 edit, an approval, a simulated send (`[SIMULATED SEND` visible in the canonical thread), a simulated reply (`[SIMULATED REPLY`, classified "hot lead"), and `opp-prospect-tapatio` with a BI snapshot — visible afterwards in Brand CRM and in Messages as `Tapatío (prospect)`.

**Fields Tapatío does NOT have at runtime:** email, phone, LinkedIn URL, notes, owner, lastAmazonCheck, lastDistributorCheck, lastContactCheck; any market/competitor/trend data; any qualification record; any ASIN that is a real Amazon identifier.

**Contradiction worth recording:** the seeded catalogue value for Tapatío (`score(18,14,12,12,7,8,4)` = 75, `tier_3`) is not what the system shows (68, `tier_4`). Any documentation or conversation quoting "75" or "tier_3" for Tapatío describes a value the running code never produces.

---

## 20. All BI UI consumers

| Surface | Component | Dataset consumed | Fields displayed | Filters | Actions | Tenant scope |
|---|---|---|---|---|---|---|
| Admin → Brands → Brand Intelligence | `BrandIntelligencePanel.tsx` | `prospectStore.getProspects()` (canonical), `getRuns()`, `getChanges()`, `getPipelineStatus()`, `client.getDashboard()` | KPI cards (Tracked, T1, T2, Gaps, Pri); Pipeline Control text + next-check; Run History (run id, trigger, timestamp, scanned/new/updated/dq/unchanged, expandable change summaries); Disqualified list (brand + reason); table (#, Brand, Cat, Score, Tier, D/PO/G/Dist/Acc/Fit/Amz/Distrib/Ctc) | search (brand/category), category, tier; sort by score/brand | **Run discovery**; **Requalify**; row click → detail | Global (no tenant filter); nav visible to any admin tier (§20.1) |
| Admin prospect detail | `ProspectDetailPanel.tsx` + `ProspectDetailTabs.tsx` (via the panel) | the selected `BrandProspect` object + `getProspectTimeline(id)` | header: brand, tier badge, score/100, checked/next badges, Disqualify/badge, category, website, whyInteresting; **Overview** 7 ScoreBars + ASIN count, est. sales/mo, est. revenue/mo, maturity, UK presence, distributors, contacts, growth-signal count, last checked, next check, status, challenging; **Amazon** per-ASIN title/offer class/price/rating/reviews/BSR/est. sales/est. revenue/sellers/Prime + url; **Commercial** wholesale flags + distributors (territory/exclusive/approach); **People** contact name/title/company/(email if present)/(LinkedIn if present); **Mercenta Fit** SKU breadth/repeat purchase/PO suitability/self-service + score + disqualification reason + preferred contact; **Outreach** (Phase C workflow); **History** last 10 events | none | **Disqualify** (prompt); everything inside Outreach tab | Global |
| Brand portal → "Market Intel" | `components/brand/BrandIntelligence.tsx` | `getProspects()` filtered to `p.category === brandProfile?.category` and not disqualified | Category Size (`£k/mo` = summed `estimatedRevenue` of same-category prospects), Category Growth (**hardcoded +12%**), Brands Tracked, Competitors (both = same-category count), up to 9 competitor cards (brand + score + tier), three prose lines | session brand's category only | none | Filtered by category, **not** by tenant — it reads all prospects in the category (by design: "Amazon Market" competitor view) |
| Admin → Marketing (ICP) | `MarketingHub.tsx` | `leads` from `GlobalStateContext` (BI-derived) + `getProspects()` for the CSV bridge + `AcquisitionPipeline` | ICP editor, fit scores, stages, the canonical `BI prospect-<id>` identity per scored row, "Acquisition Pipeline (BI-derived)" table | ICP config | Run ICP discovery (separate engine), CSV import (bridged), Auto-enroll | Global |
| Admin → Marketing → Acquisition Pipeline card | `AcquisitionPipeline.tsx` | `listAcquisitionProspects()` + `getAcquisitionSummary()` | prospect, category, BI score+tier, `lead-<id>`, derived region, acquisition stage, pipeline KPIs | stage filter chips | **Prepare recommendation** | Global |
| Admin → Brand CRM | `BrandCRM.tsx` → `AcquisitionRelationships.tsx` | `listAcquisitionProspects().filter(r => r.opportunity)` | "Acquisition Relationships (pre-onboarding)" list: brand, stage, BI snapshot, opportunity id; expanded → the shared `AcquisitionWorkflow` | only rows with an opportunity | the whole Phase C workflow | Global |
| Admin → Messages | `MessagesHub.tsx` | `demoMessages` + `getProspect(brandId)` for naming | thread label `"<Brand> (prospect)"`, the canonical conversation | thread list | message reading (send paths unchanged) | Thread-keyed; brand sessions cannot see prospect threads (E2E test 3) |
| BI prospect → Outreach tab | `AcquisitionWorkflow.tsx` | BI record + `acquisitionStore` + canonical messages | "Why we are contacting this brand" (BI evidence summary), identity (`prospect-<id>`, `lead-<id>`), contact/channel, recommendation (revision, status, subject, body), actions, responses + classification, opportunity + stage, acquisition timeline, canonical thread | none | Prepare / Modify / Approve / Reject / Send / Simulate response / Create opportunity / Stage | Global (admin); mutators gated by `canCurrentUserMutate` |

### 20.1 Tenant-scoping and RBAC notes (checked explicitly)

| Check | Result | Evidence |
|---|---|---|
| Does any BI surface filter prospects by tenant? | **No.** The store is global; there is no `tenantId`/`brandId` filter anywhere in the BI read path | `getProspects()` has no parameter; grep for `tenantId` in BI files → none |
| Does the brand-mode surface leak other brands' data? | **By design it exposes** every active prospect in the session brand's category (name + score + tier) — a competitor view. It does not expose emails/contacts (there are none) | `brand/BrandIntelligence.tsx:18-24,44-49` |
| Is the admin nav allowlist enforced? | **NO.** `VIEW_ALLOWLIST.admin_staff` omits `brand_intelligence`, but `canAccessView`/`filterNavForTier` are **never called** (0 call sites). `AdminShell` only filters `super_admin`, `audit_log`, `integrations`, and the `brand_intelligence` render has **no `isSuper` guard** → an ordinary admin-staff session can open and use the panel and the Phase C workflow | `rbac.ts:46-74`; `AdminShell.tsx:120-166`; grep `filterNavForTier|canAccessView` → 2 hits, both declarations |
| Are Phase C mutations protected? | **YES** — the domain layer refuses any actor with `canMutate === false` (`staffCanMutate` = active + full permission tier) | `outreachLifecycle:57-76`; `rbac.ts:82-86`; validator N1/N2 |
| Can a brand session reach BI/acquisition data? | No acquisition surface renders in BrandShell; prospect-keyed message threads are not shown to brand sessions | E2E `acquisition-pipeline.spec.ts` test 3 PASS; validator M2/L4 |

---

## 21. BI → ICP mapping

### 21.1 The boundary object

`Lead` (`src/types.ts`), produced by `prospectPipeline.deriveLeadFromProspect` (l.76), wrapped by `buildAcquisitionLead` (l.193), exposed via `prospectStore.getAcquisitionLeads()` (l.159) → `GlobalStateContext` bootstrap (l.167-172) → `MarketingHub` / `AcquisitionPipeline`.

### 21.2 Field-by-field crossing

| BI field | Crosses as | Transformation | Evidence |
|---|---|---|---|
| `id` | `Lead.prospectId` + `Lead.id = 'lead-' + prospectId` | deterministic projection (identity preserved) | `prospectPipeline:86,200` |
| `brand` | `Lead.company` | 1:1 | `prospectPipeline:90` |
| `category` | `Lead.segment` | 1:1 | `prospectPipeline:98` |
| `contacts[0].name` + `.jobTitle` | `Lead.persona` (`"Name, Title"`, else `'Brand contact'`) | concatenation | `prospectPipeline:87-89` |
| `contacts[0].email` | `Lead.email` | 1:1 — **undefined today ⇒ `''`** | `prospectPipeline:92` |
| `countries` (joined) or `website` | `Lead.location` | `countries.join(', ')` else website | `prospectPipeline:91` |
| `countries` / `ukPresence` | `Lead.region` | `ICP_REGION_BY_COUNTRY` lookup, else `ukPresence → 'uk'`, else **no lead at all** | `prospectPipeline:178-185,193-197` |
| `score.tier` | `Lead.priority` | `tier_1\|tier_2 → 'High'`, else `'Medium'` (**always 'Medium' today**) | `prospectPipeline:93-96`; runtime |
| `outreachStatus` | `Lead.outreachStatus` | `leadStageForOutreachStatus` table | `prospectPipeline:131-153` |
| — | `Lead.fitScore` | **not from BI** — starts `0`; scored live by `scoreLeadFit` against the ICP config (85 for Tapatío) | `prospectPipeline:99-101`; `marketing.ts:60` |
| — | initial `Lead.outreachStatus` | forced to `leadStageForOutreachStatus(prospect.outreachStatus)` = `'Scraped'` for all 10 | `prospectPipeline:201` |

### 21.3 The two-way status ladder

```
BI OutreachStatus                →  Lead.outreachStatus   →  BI OutreachStatus
uncontacted / researching        →  'Scraped'             →  'uncontacted'
ready_to_contact                 →  'Sequenced'           →  'ready_to_contact'
contacted / opened               →  'Email Sent'          →  'contacted'
replied/interested/negotiating/pilot  →  'Replied'          →  'replied'
meeting_scheduled / won          →  'Meeting Booked'      →  'meeting_scheduled'
lost / nurture                   →  'Replied'  (documented approximation) → 'replied'
disqualified                     →  'Scraped'
```

The reverse mapping (`outreachStatusForLeadStage`, l.156) is lossy: five BI states collapse into `'replied'`, and `lost`/`nurture` are documented as approximated because `Lead` has no terminal-lost stage.

### 21.4 What ICP loses at this boundary

| Lost | Detail |
|---|---|
| ASIN identity and every per-ASIN metric (price, BSR, rating, reviewCount, estimatedSales/Revenue, sellerCount, offerClass, prime, url) | only the *count* survives, indirectly, inside the outreach copy |
| `evidence[]` (17 rows) incl. every `sourceUrl`/`dateObserved`/`classification` | nothing crosses |
| `contacts[0].email` (absent anyway), `phone`, `linkedInUrl` | nothing |
| `wholesale` flags, `restrictions` (other than as a DQ), `growthSignals` | nothing |
| full `score` object (7 dimensions) | only `tier` → priority |
| `whyInteresting`, `brandMaturity`, `incumbentChallenged`, `countries` as a list | `countries` survives only as a display string inside `location` |
| disqualification reason | nothing — DQ records never become leads at all |

**Preserved:** canonical identity (`prospectId` + deterministic lead id), brand, category, region, stage and the persona string.

---

## 22. BI → acquisition mapping

| Arrow | Object crossing | Fields crossing | Function | Lost / transformed |
|---|---|---|---|---|
| read model | `AcquisitionProspectRow` | `prospect` (whole record), `lead` (projection or null), `region`, `current`, `opportunity`, `responseCount`, `stage` | `listAcquisitionProspects` (l.163) | — |
| lead → enrolment | canonical `outreachStatus` change + `AcquisitionEvent` | `prospectId`, brand, derived region, `lead.id` | `enrollProspect` (l.227) | BI `score`/`evidence` stay in the store; not copied |
| canonical record + BI evidence → recommendation | `ProspectOutreachRecord` | `subject`, `body` (generated), `status:'pending_approval'`, `revision`, `leadId`, `evidenceSummary` (= BI summary markdown) | `prepareOutreach` (l.270) | the record itself is not embedded — only the derived copy + summary text |
| approval actions | status + `approvedBy/At`, `rejectedBy/At`, `modifiedBy/At`, `approvalNote`, `revision` | | `modifyOutreach` / `approveOutreach` / `rejectOutreach` | — |
| send | `Message` in `demoMessages` + `transport` + `sentAt` | destination, subject, body, `brandId = prospectId`, `leadId` | `sendOutreach` → `logMessage` | ASIN/evidence detail never crosses beyond what the copy already contained |
| response | `OutreachResponse` + `Message` | body, from, channel, `wantsHuman`, `classificationReason`, `simulated` | `recordResponse` (l.509) via `classifyInboundReply` | — |
| qualified response → opportunity | `Opportunity` | ★`prospectId`, ★`brand`, ★`category`, ★`biScore`, ★`biTier`, ★`evidenceSummary`, `contactName`, `contactEmail`, `leadId`, `outreachId`, `responseId`, `ownerStaffId` | `createOpportunityFromResponse` | the full `BrandProspect`, ASINs, evidence rows and per-dimension scores are **not** copied — only the scalar score/tier + summary |
| every mutation | `AcquisitionEvent` + `demoAuditLog` entry | prospectId, brand, type, actor, summary, detail | `pushEvent`, `recordAcquisitionAudit` | — |

**Duplication observed:** brand name, category and score/tier exist in the BI record, the `Lead`, the `Opportunity`, and (score only) the snapshot. Each copy is written once at its boundary and never re-derived; there is no reconciliation path — after requalification or a score change an existing `Opportunity` keeps its original `biScore`/`biTier` ("never re-derived downstream", `types.ts:2194`).

---

## 23. BI → outreach mapping

| Aspect | Detail |
|---|---|
| Generator | `src/lib/intelligence/outreachGenerator.ts` — `generateEmail` (l.33), `generateLinkedInMessage` (l.60), `generateOutreachSummary` (l.105) |
| Inputs actually read from BI | `brand`; `contacts[0].name`/`jobTitle`; `asins.length`; `sum(estimatedRevenue)`; `sum(reviewCount)`; `sum(estimatedSales)` (computed, unused in the body); `avg(rating)`; the top ASIN's `title`/`bsr`/`sellerCount`; `score.total`; `score.tier`; `score.acceptanceProbability`; `distributors[0].company`/`exclusive`/`suggestedApproach` |
| What is generated | subject `"<Brand> × Mercenta: Amazon UK Distribution Opportunity"`; a body with the Amazon-demand paragraph, the distribution paragraph, the proposition and a call to action; a markdown summary ("Outreach: <Brand>" with contact, score, approach, subject, sequence, acceptance %, exclusive-distributor warning) |
| What the copy asserts | "~£Xk/mo estimated revenue", "N reviews (M★ avg)", "BSR #N has strong ranking", "N sellers, suggesting supply fragmentation" — all derived from the literals |
| Source of the send address | `outreachDestination` (l.114): `contacts[0].email` if present, else `hello@<brand-slug>.example` — **today always the `.example` placeholder** |
| Transport | `simulationOutreachTransport` (no network) unless `comms.emailLive \|\| emailSandbox`, in which case `transportFromEmailClient` wraps the existing email client |
| What is stored | the whole `ProspectOutreachRecord` (revisions preserved) + the body in `demoMessages`, prefixed `[SIMULATED SEND — no live provider connected]` |
| ASIN/sales/product intelligence beyond the copy | **does not survive** — no ASIN id, price, BSR, offer class or per-ASIN evidence reaches the outreach record |
| Scoring beyond score/tier | only `acceptanceProbability` appears (in the summary's percentage line) |
| Contact beyond name/title | nothing (no email, no phone, no LinkedIn) |
| LinkedIn message | generated only when `prepareOutreach(…,'linkedin')` is called; **all UI call sites pass `'email'`** (`AcquisitionWorkflow:129`), so the LinkedIn copy path is unreachable from the UI |
| Follow-up sequence (day 3/7/14/30) | generated by `generateFollowUp` but **never called by product code** |

---

## 24. BI → CRM mapping

| Aspect | Detail |
|---|---|
| Surface | `BrandCRM.tsx` renders `AcquisitionRelationships` (l.84) — "Acquisition Relationships (pre-onboarding)" |
| Read model | `listAcquisitionProspects().filter(r => r.opportunity)` + `getAcquisitionSummary()`; an expanded row renders the shared `AcquisitionWorkflow` |
| BI fields visible in CRM | brand (from BI); BI score + tier (the `Opportunity` snapshot); the category; the BI evidence summary text inside the workflow's evidence block |
| BI fields available but not displayed | the full `BrandProspect` is fetched by `getRelationship` (`acquisitionStore:169-182`), so ASINs, evidence rows, restrictions, wholesale and contacts are in memory on that screen — only the ASIN count, contact name and score are rendered |
| CRM → BI | every stage/outreach action in the embedded workflow writes back through `setProspectOutreachStatus`, i.e. the CRM updates the BI timeline |
| Canonical conversation | `getRelationship().messages` = `demoMessages.filter(m => m.brandId === prospectId)` — the same thread as MessagesHub, no second store |
| Onboarding hand-off | **not implemented** — `Opportunity.brandId` exists but nothing sets it; no CRM path turns a won opportunity into a brand application/tenant |
| Traditional CRM objects (`crmStore`, tasks, notes) | unchanged and unrelated to BI prospects; `BrandCrmDepth`/`crmStore` contain **no** prospect references (grep empty) |

---

## 25. Phase C field-retention audit (factual)

Phase C is already implemented and was **not modified**. This section records exactly what it consumes from BI.

| BI data | Into ICP? | Into outreach? | Available in acquisition/CRM? | Verdict |
|---|---|---|---|---|
| canonical `prospectId` | **YES** (`Lead.prospectId`, `Lead.id = lead-<id>`) | YES (`leadId`, `ProspectOutreachRecord.prospectId`) | YES (`Opportunity.prospectId`, every `AcquisitionEvent`, message `brandId`) | **Full identity survives** |
| brand name | YES (`company`) | YES (copy + subject) | YES (event brand, CRM label) | Survives |
| category | YES (`segment`) | as the "Repeat Purchase" line in the summary | YES (`Opportunity.category`) | Survives |
| website | as `location` fallback | no | indirectly (the whole record is in memory) | Partially |
| `countries` | mapped to `region`; also joined into `location` | no | region only | Transformed |
| `ukPresence` | YES (region fallback) | no | region only | Transformed |
| `brandMaturity` | **NO** | no | in memory only | **Lost at the boundary** |
| `incumbentChallenged` | **NO** | no | in memory only | **Lost at the boundary** |
| `whyInteresting` | **NO** | no | in memory only | **Lost at the boundary** |
| `asins[]` (14 objects) | **NO** — count only, indirect | **count + 4 aggregate scalars only** (revenue, reviews, rating, top-ASIN bsr/sellers/title) | in memory only (count rendered) | **Product/ASIN intelligence does NOT survive as data** |
| ASIN identifiers | **NO** | **NO** | **NO** | **Lost** |
| price / BSR / rating / reviewCount | **NO** | rating + reviewCount as aggregates only | **NO** | **Lost as fields** |
| `estimatedSales` / `estimatedRevenue` | **NO** | `estimatedRevenue` aggregate in the copy | **NO** | **Sales estimates survive only as prose** |
| `amazonOfferClass` / `amazonRetailSeller` / `sellerCount` / `prime` | **NO** | sellerCount of the top ASIN in the copy | **NO** | **Lost** |
| `distributors[]` | **NO** | `distributors[0].company`/`exclusive`/`suggestedApproach` in the summary | **NO** | Partially, as text |
| `wholesale` | **NO** | **NO** | in memory only | **Lost at the boundary** |
| `restrictions[]` | only as a DQ exclusion | **NO** | in memory only | **Lost** |
| `growthSignals[]` | **NO** | **NO** | **NO** | **Lost** (only its count feeds the score) |
| `contacts[]` | `contacts[0].name`+`jobTitle` as `persona`; `email` (empty) | first name in the greeting; destination address | `Opportunity.contactName` / `contactEmail` (undefined) | **Partially — name/title only; no reachable contact data** |
| contact `email`/`phone`/`linkedInUrl` | **NO** (empty) | **NO** (placeholder `.example`) | **NO** | **Absent everywhere** |
| `score.total` / `score.tier` | tier → `priority` (always `Medium`) | `total`, `tier`, `acceptanceProbability` in the summary | `Opportunity.biScore` / `biTier` (frozen snapshot value) | **Partially — total + tier only; the 7 dimensions are lost** |
| `disqualified` / reason | **NO** (DQ records never become leads) | **NO** | **NO** | **Lost** (by design) |
| `evidence[]` (17 rows: source, sourceUrl, dateObserved, confidence, classification) | **NO** | **NO** — the `evidenceSummary` is generated copy, not the evidence records | **NO** | **Evidence does NOT survive** |
| provenance (`source:'mock'`, `sourceUrl`s, `dateObserved`) | **NO** | **NO** | **NO** | **Provenance does NOT survive** |
| `lastChecked` / `nextCheck` | **NO** | **NO** | **NO** | **Lost** |
| `IntelligenceRun` / `ProspectChangeEvent` history | **NO** | **NO** | **NO** (the acquisition timeline is a separate ledger) | **BI history does NOT survive** |
| `IntelligenceSnapshot` | **NO** | **NO** | **NO** (the Opportunity keeps its own score snapshot) | **Snapshots do NOT survive** |
| outreach status | maps to `Lead.outreachStatus` and back (lossy) | the record's own status | YES (canonical, written back) | Survives both ways, lossily |

### 25.1 Summary of the Phase C retention answer

- **Survives in full:** canonical identity, brand name, category, region (transformed), outreach status ladder.
- **Survives partially:** score total + tier (frozen), contact name/title, contact email (empty), website, aggregate revenue/review/rating/seller figures inside copy only.
- **Does NOT survive:** ASIN identity and all per-ASIN metrics, sales estimates as data, distributor/wholesale/restriction/growth-signal records, the `ProspectEvidence` rows and their provenance, BI run/change/snapshot history, `lastChecked`/`nextCheck`, `whyInteresting`/`brandMaturity`/`incumbentChallenged`, the seven score dimensions, and any reachable contact channel.
- **Not lost but unused:** the full `BrandProspect` object is available in memory in the acquisition/CRM read model (`getRelationship`), yet only a handful of its fields are rendered or copied onward.

---

## 26. Real vs mock classification (per dataset)

The categories are kept separate exactly as the brief requires.

| Dataset / field group | Category | Detail |
|---|---|---|
| Brand identity (name, website, category, countries, ukPresence, maturity, incumbents, whyInteresting) | **D. Hard-coded real-world example data** | 12 real brands with real websites typed into two TS files |
| ASIN identifiers (`B0HOT01` …) | **E. Generated/synthetic identifiers** | ASIN-shaped strings, not real Amazon identifiers |
| ASIN metrics (price, rating, reviewCount, bsr, sellerCount, prime, offerClass) | **D. Hard-coded real-world example data** | plausible-looking values with no source system |
| `estimatedSales`, `estimatedRevenue` | **D. Hard-coded example data with a misleading provenance label** | attributed to "MerchantWords estimate"; no such client exists |
| Contacts (5 names/titles) | **D. Hard-coded real-world example data** | real people/roles, no contact channel |
| `emailConfidence`/`phoneConfidence` values | **F. Mock data** | literal enum strings with no verification process behind them |
| Distributor record (Cholula → Global Brands Ltd) | **D. Hard-coded real-world example data** | 1 record |
| Restrictions (Truthbrush, UpCircle) | **D. Hard-coded real-world example data** | 2 records |
| Growth signal (Tapatío → `retail_expansion`) | **D. Hard-coded real-world example data** | 1 record |
| `ProspectEvidence` (17 rows) | **D. Hard-coded example data** | all dated `2026-09-06`, all `confidence:'medium'` |
| `score`, `disqualified`, `disqualificationReason` | **E. Generated deterministically** | recomputed at boot from the literals by `calculateScore`/`checkDisq` |
| `lastChecked`, `nextCheck` | **E. Generated deterministically** | stamped at run time |
| `IntelligenceRun`, `ProspectChangeEvent`, `IntelligenceSnapshot` | **E. Generated deterministically** | produced by boot, runs and operator actions |
| `Lead` projection | **E. Generated deterministically** | projection of the BI record |
| Outreach copy (`subject`, `body`, `evidenceSummary`) | **E. Generated deterministically** | template strings over BI fields |
| Send/response simulation | **F. Mock/simulated** | `simulationOutreachTransport` + `simulateResponse`, unmistakably labelled `[SIMULATED …]` |
| `source: 'mock'` on every prospect | **F. Mock marker** | correctly signals "not from a live provider" |
| Live-fetched BI data | **A. — DOES NOT EXIST** | 0 |
| Previously fetched and persisted BI data | **B. — DOES NOT EXIST** | 0 |

**Per-field provenance verdict:** every BI field is either "hard-coded example", "deterministically generated from hard-coded examples", or "simulated". **No field is live-fetched (A) or previously-persisted (B).** Real brand names do not imply live metrics — the metrics are as static as the names.

---

## 27. Documentation reconciliation

| # | Claim in documentation | Actual code | Status |
|---|---|---|---|
| 1 | `MERCENTA_MASTER_CONTEXT.md` §J: BI is "the authoritative real-data discovery and intelligence engine … canonical source of truth for prospect discovery" | BI contains no discovery mechanism; the universe is 12 literals | **CONTRADICTED** ("discovery engine" is a name without implementation) |
| 2 | §J: "12 prospects (3 + 9; 2 hard-disqualified → 10 active), scored by the deterministic 7-dimension scoring engine at store boot" | Verified exactly (12/10/2, re-scored at boot) | **VERIFIED** |
| 3 | §J: "the client factory still returns the MockClient … that means 'no live provider produced this record', not 'this brand is fictional'" | Verified — the factory ignores its argument and returns `MockClient` | **VERIFIED** |
| 4 | §J: "Since Phase B the universe also has a real lifecycle: discovery runs, change events, score snapshots, sticky operator disqualify/requalify" | Verified — all four exist | **VERIFIED** |
| 5 | `MERCENTA_ARCHITECTURE.md` §11: `runBrandIntelligence()` performs "candidate intake + canonical dedupe" | True as code, but **no caller ever supplies candidates**, so the intake path is unreachable in the product | **PARTIAL** |
| 6 | `MERCENTA_ARCHITECTURE.md` / `types.ts:2045`: "weekly score snapshots" | Snapshots are written **per run**, not weekly; none exist at boot; nothing renders them | **PARTIAL / STALE** |
| 7 | `MERCENTA_ARCHITECTURE.md`: "All consumers (Admin panel, Brand Market Intel, MarketingHub bridge, acquisition pipeline, CRM) read ONE store" | Verified | **VERIFIED** |
| 8 | `MERCENTA_ARCHITECTURE.md` §10 lists `IntelligenceDashboard/PipelineConfig` as model types | They exist, but `IntelligencePipelineConfig` is never constructed and several dashboard fields are hardcoded | **PARTIAL** |
| 9 | `PROJECT_STATUS.md` Phase B entry: pre-Phase-B "no persistence, no mutations, no pipeline-run UI" | Historical description that the same file's later entries supersede | **STALE (self-inconsistent)** |
| 10 | `PROJECT_STATUS.md` "Brand Intelligence System — New Module": "Stage 4: Discovery Client — ✅ DONE (`MockDiscoveryClientImpl` + `MockAmazonDataClientImpl`)" | The module exists but has **zero callers** — dead code, not a delivered capability | **CONTRADICTED** |
| 11 | Same table: "Stage 8: Full 55-brand population — ✅ DONE (12 of 55) … Grocery (… **Hunter & Gather**), Household (… **E-Cloth, OceanSaver**) …" | Those three brands **do not exist** in either seed file (0 matches in `src/`); the seeds hold the 12 brands listed in §3.1 | **CONTRADICTED** |
| 12 | Same table: "Stage 6: Outreach Generator — ✅ DONE … `generateFollowUp()`, `generateAllOutreach()`" | They exist, but `generateFollowUp` has no caller and the pack is used only for one subject line | **PARTIAL** |
| 13 | `PROJECT_STATUS.md` Phase C: "the ICP list is now DERIVED from `prospectStore.getAcquisitionLeads()`" | Verified (`GlobalStateContext:167-172`) | **VERIFIED** |
| 14 | `PROJECT_STATUS.md` Phase C: "All ten real brands reach ICP with the SAME `prospectId`" | Verified — runtime: 10/10 leads carry `prospectId` | **VERIFIED** |
| 15 | `PROJECT_STATUS.md` Phase C validator claims (`validate-bi-lifecycle` 29/29, `validate-acquisition-pipeline` 64/64) | Re-run this session: both print PASS; the scripts do not print per-assertion totals for the acquisition script, so the exact counts could not be confirmed | **VERIFIED (result) / UNKNOWN (assertion counts)** |
| 16 | `docs/PRODUCT_CONSOLIDATION_PHASEC`: "Tapatío 68/100" | Verified at runtime (68, `tier_4`) | **VERIFIED** |
| 17 | `docs/PRODUCT_CONSOLIDATION_PHASEC` §18: "No automatic BI scheduling… runs remain operator-triggered" | Verified | **VERIFIED** |
| 18 | `docs/PRODUCT_CONSOLIDATION_PHASEC` §18: "Acquisition state is session-only" | Verified (validators O1-O4) | **VERIFIED** |
| 19 | `docs/PRODUCT_CONSOLIDATION_PHASEB` §2 describes the pre-Phase-B state ("no persistence, no run mechanism, no history, no mutation path") | Correct as history; no longer true | **STALE (correctly framed as historical)** |
| 20 | `docs/PRODUCT_CONSOLIDATION_PHASEA`: "Classification: SEEDED TEST FIXTURE (BI has NO real data source yet)" | Still accurate today | **VERIFIED (still accurate)** |
| 21 | `STATUS_CHECK.md`: "MarketingHub + Brand 'Market Intel' read the store (duplicate universe literal removed)" | Verified — the validator asserts MarketingHub no longer contains `CANONICAL_BI_UNIVERSE` | **VERIFIED** |
| 22 | `HANDOFF.md`: "Brand Intelligence REAL-DATA LIFECYCLE … candidate de-duplication, disqualify/re-qualify with audit history, per-prospect History timeline" | Verified as mechanisms; "REAL-DATA" is not supported by any live source (0) | **PARTIAL** |
| 23 | `MERCENTA_PRODUCT_ARCHITECTURE_AUDIT_2026-09-10` §6: "Data sources: Seed only … `createBrandIntelligenceClient()` **always returns MockClient** … None [Firecrawl/Keepa] are used by Brand Intelligence. No Amazon live data path." | Still exactly true | **VERIFIED** |
| 24 | Same audit §6: "Actions available in UI: **None that mutate state** … Persistence: **None**" | Superseded by Phase B/C (Disqualify/Requalify/Run now mutate session state); persistence remains session-only | **STALE (superseded, not annotated)** |

**Most material contradictions:** #1 (BI named a discovery engine while containing no discovery), #10 (a dead client module marked DONE), #11 (three brands claimed as populated that do not exist in the repository), #6 ("weekly" snapshots), #24 (superseded without annotation). **Documentation was not corrected in this session** — the contradictions are reported only.

---

## 28. Runtime verification

### 28.1 Static gate (product unchanged)

```
$ npm run typecheck        → tsc --noEmit -p tsconfig.app.json     (no output = 0 errors)
$ npm run build            → ✓ built in 2.29s
```

### 28.2 Existing BI validators + E2E — executed this session

```
$ node scripts/validate-bi-lifecycle.mjs
✓ store boots a canonical universe of exactly 12 prospects
✓ exactly 10 active after the documented disqualifications (Truthbrush, UpCircle)
✓ disqualified seeds stay tracked in the store (2)
✓ stable canonical ids survive boot (prospect-tapatio unique)
✓ no duplicate normalized brand keys in the universe
✓ seed baseline recorded as origin run
✓ one "created" change event per canonical prospect (history origin)
✓ Tapatío timeline starts with its created event
✓ manual run #1: new 0 / updated 0 / disq 0 / unchanged 12
✓ manual run #1 recorded with trigger manual and mode mock
✓ manual run #2 is idempotent (unchanged 12, no new events)
✓ run history retains every run (1 seed + 2 manual = 3)
✓ every prospect stamped lastChecked + nextCheck (+7d) after a run
✓ nextCheck is ~7 days after lastChecked
✓ re-discovered Tapatío candidate merges — still exactly one Tapatío record
✓ re-discovery records an "updated" event with field discovery
✓ universe size unchanged by re-discovery (12)
✓ 'Kit&Kin' (no space/&) dedupes onto canonical 'Kit & Kin' record
✓ genuine new discovery recorded as created (universe 12 → 13)
✓ store reset re-boots deterministically (12/10/2)
✓ disqualifyProspect mutates the canonical record + audits the event
✓ manual disqualification is STICKY — re-scan does not reactivate it
✓ requalifyProspect restores active + audits the event
✓ after requalify a re-scan keeps it active
✓ snapshots accumulate per run (12 prospects × 2 runs on the reset store = 24)
✓ Tapatío has a score snapshot per run (2)
✓ pipeline status reflects store truth (12 tracked / 10 active / 2 dq / 3 runs logged)
✓ MarketingHub identity bridge consumes the SAME canonical store (CSV Tapatío → prospect-tapatio, segment Grocery)
✓ seed modules are ONLY read through the store (MarketingHub no longer imports seeds)
✓ ZERO external network calls across all lifecycle operations
BI_LIFECYCLE_VALIDATION_PASS

$ node scripts/validate-prospect-pipeline.mjs      → PROSPECT_PIPELINE_VALIDATION_PASS (26 assertions, all ✓)
$ node scripts/validate-acquisition-pipeline.mjs   → ACQUISITION_PIPELINE_VALIDATION_PASS (all ✓, incl.
     "H1 ZERO external network calls across the whole acquisition workflow" and
     "O4 no Supabase/network persistence is claimed or attempted for acquisition state")

$ npx playwright test e2e/brand-intelligence-lifecycle.spec.ts e2e/acquisition-pipeline.spec.ts --reporter=list
  ✓  2 acquisition-pipeline.spec.ts:146 › 3. Tenant isolation — a brand session has no acquisition surface
  ✓  6 acquisition-pipeline.spec.ts:125 › 2. REJECT is a real, distinct approval outcome on a second real brand
  ✓  3 brand-intelligence-lifecycle.spec.ts:55 › 2. Prospect provenance + History tab + disqualify/requalify loop
  ✓  4 acquisition-pipeline.spec.ts:90 › 1b. The relationship is visible in the CRM and in the ONE canonical Messages thread
  ✓  5 brand-intelligence-lifecycle.spec.ts:22 › 1. Admin can run a discovery — canonical run, history, next-check
  ✓  1 acquisition-pipeline.spec.ts:33 › 1. Real BI brand → ICP → approval → simulated send → response → opportunity → CRM
  6 passed (19.2s)   EXIT=0
```

### 28.3 Temporary read-only diagnostic (created, run, then deleted)

A temporary script (`scripts/tmp-bi-audit-diag.mjs`) loaded the real modules through `vite.ssrLoadModule` with `globalThis.fetch` instrumented, dumped the whole universe, ran one manual run, and printed the derived acquisition leads. **It was deleted immediately after its output was captured and never formed part of the product.** Key output:

```
=== CANONICAL UNIVERSE ===
count 12 | active 10
  prospect-tapatio   | Tapatío          | Grocery | tier_4   | 68 | dq=false | asins=2 | contacts=1 | dist=0 | signals=1 | restr=0 | evidence=1
  prospect-cholula   | Cholula          | Grocery | unscored | 56 | dq=false | asins=2 | contacts=0 | dist=1 | signals=0 | restr=0 | evidence=1
  prospect-valentina | Valentina        | Grocery | unscored | 52 | dq=false | asins=1 | contacts=0 | dist=0 | signals=0 | restr=0 | evidence=1
  p-astonish         | Astonish         | Home    | unscored | 59 | dq=false | asins=1 | contacts=0 | dist=0 | signals=0 | restr=0 | evidence=0
  p-seep             | Seep             | Home    | tier_4   | 61 | dq=false | asins=1 | contacts=1 | dist=0 | signals=0 | restr=0 | evidence=0
  p-delphi           | Delphis Eco      | Home    | unscored | 51 | dq=false | asins=1 | contacts=0 | dist=0 | signals=0 | restr=0 | evidence=0
  p-flyby            | Fly By Jing      | Grocery | unscored | 59 | dq=false | asins=1 | contacts=1 | dist=0 | signals=0 | restr=0 | evidence=0
  p-lockn            | LocknLock        | Kitchen | unscored | 58 | dq=false | asins=1 | contacts=0 | dist=0 | signals=0 | restr=0 | evidence=0
  p-mikes            | Mike's Hot Honey | Grocery | unscored | 57 | dq=false | asins=1 | contacts=1 | dist=0 | signals=0 | restr=0 | evidence=0
  p-kitkin           | Kit & Kin        | Baby    | unscored | 51 | dq=false | asins=1 | contacts=1 | dist=0 | signals=0 | restr=0 | evidence=0
  p-truthbrush       | Truthbrush       | Home    | unscored |  0 | dq=true (Amazon prohibited)    | asins=1 | restr=1
  p-upcircle         | UpCircle         | H&PC    | unscored |  0 | dq=true (Platform restriction)  | asins=1 | restr=1
  (every record: source=mock)

Runtime key set on a record (23 keys): asins, brand, brandMaturity, category, contacts, countries,
createdAt, disqualificationReason, disqualified, distributors, evidence, growthSignals, id,
incumbentChallenged, lastResearched, outreachStatus, restrictions, score, source, ukPresence,
website, wholesale, whyInteresting

=== MANUAL RUN (no candidates) ===
{"runId":"run-1789110988467","trigger":"manual","mode":"mock","scannedCount":12,"newCount":0,
 "updatedCount":0,"disqualifiedCount":0,"unchangedCount":12,"changedProspectIds":[],
 "candidatesCount":0,"errorCount":0,
 "summary":"Scanned 12. New 0. Updated 0. Disqualified 0. Unchanged 12."}
events: 0        snapshots after boot: 0        snapshots after run: 12
Tapatío snapshot: {"snapshotDate":"2026-09-11","brandId":"prospect-tapatio","totalAsins":2,
 "estimatedMonthlyRevenue":72600,"distributorStatus":"NONE_FOUND","outreachStatus":"uncontacted",
 score 68 tier_4}

=== ACQUISITION PROJECTION (BI → ICP) ===   10 rows, all carrying prospectId · fit=0 · stage=Scraped · email=""
  lead-prospect-tapatio   | Tapatío          | persona="Sherry Zhang, VP International Sales" | region=us | segment=Grocery | priority=Medium | location="US, UK, Canada"
  lead-prospect-cholula   | Cholula          | persona="Brand contact"                        | region=us | segment=Grocery | location="US, UK, Mexico"
  lead-prospect-valentina | Valentina        | persona="Brand contact"                        | region=us | segment=Grocery | location="Mexico, US, UK"
  lead-p-astonish         | Astonish         | persona="Brand contact"                        | region=uk | segment=Home
  lead-p-seep             | Seep             | persona="Laura Harnett, Founder/CEO"           | region=uk | segment=Home
  lead-p-delphi           | Delphis Eco      | persona="Brand contact"                        | region=uk | segment=Home
  lead-p-flyby            | Fly By Jing      | persona="Jing Gao, Founder/CEO"                | region=uk | segment=Grocery
  lead-p-lockn            | LocknLock        | persona="Brand contact"                        | region=uk | segment=Kitchen
  lead-p-mikes            | Mike's Hot Honey | persona="Mike Kurtz, Founder/CEO"              | region=uk | segment=Grocery
  lead-p-kitkin           | Kit & Kin        | persona="Emma Bunton, Co-Founder"              | region=uk | segment=Baby
dropped (no derivable region): []
EXTERNAL FETCHES DURING DIAGNOSTIC: 0

=== PIPELINE STATUS ===
totalTracked 12 · activeCount 10 · disqualifiedCount 2 · runCount 2 · lastCheckedAt <now> ·
nextScheduledCheck <now + 7d>
```

### 28.4 Seed-literal score vs runtime score (empirical)

| Brand | Seed literal `score(...)` | Seed total / tier as written | Runtime total / tier (recomputed at boot) | Delta |
|---|---|---|---|---|
| Tapatío | 18,14,12,12,7,8,4 | 75 / tier_3 | **68 / tier_4** | −7 |
| Cholula | 20,12,10,6,5,7,4 | 64 / tier_4 | **56 / unscored** | −8 |
| Valentina | 14,11,7,13,8,7,4 | 64 / tier_4 | **52 / unscored** | −12 |
| Astonish | 22,17,12,13,8,9,5 | 86 / tier_2 | **59 / unscored** | −27 |
| Seep | 24,18,14,14,8,9,5 | 92 / tier_1 | **61 / tier_4** | −31 |
| Delphis Eco | 18,15,14,14,8,9,5 | 83 / tier_2 | **51 / unscored** | −32 |
| Fly By Jing | 21,17,12,14,8,8,4 | 84 / tier_2 | **59 / unscored** | −25 |
| LocknLock | 20,16,10,13,7,8,4 | 78 / tier_3 | **58 / unscored** | −20 |
| Mike's Hot Honey | 19,16,13,14,8,8,4 | 82 / tier_2 | **57 / unscored** | −25 |
| Kit & Kin | 15,14,10,12,7,8,3 | 69 / tier_4 | **51 / unscored** | −18 |
| Truthbrush | 14,6,3,5,1,5,3 | 37 / unscored (dq) | **0 / unscored (dq)** | −37 |
| UpCircle | 12,5,4,3,0,6,3 | 33 / unscored (dq) | **0 / unscored (dq)** | −33 |

**Empirical conclusion:** the seed `score:` literals are never observable at runtime. The engine's recomputation always differs, and in 8 of 12 cases it drops the brand below the `tier_4` threshold — including the single seed written as `tier_1`.

---

## 29. Dead / unused BI code (reported, not removed)

### 29.1 Whole modules with zero call sites

| Module | Symbols | Evidence |
|---|---|---|
| `src/lib/intelligence/discoveryClient.ts` (all 124 lines) | `MockDiscoveryClientImpl`, `MockAmazonDataClientImpl`, `createDiscoveryClient`, `createAmazonDataClient`, `BRAND_INDEX` | grep for both factories across `src/`, `e2e/`, `scripts/` → **0 call sites** |
| `intelligenceTypes.ts` constants | `INTELLIGENCE_SCORE_WEIGHTS`, `TIER_THRESHOLDS`, `GROWTH_SIGNAL_POINTS`, `TIER_LABELS`, `TIER_COLORS` | 0 references outside the file |
| `intelligenceTypes.ts` interfaces | `DiscoveryClient`, `AmazonDataClient`, `ScoringEngine` | Implemented by nothing and called by nothing (`ScoringEngine` has **no implementation at all**) |

### 29.2 Individual functions never called by product code

| Function | File | Status |
|---|---|---|
| `MockClient.runPipeline` | `brandIntelligenceClient.ts:50` | DEAD (2 refs = declaration + interface) |
| `MockClient.getBrandIntelligence` | `brandIntelligenceClient.ts:78` | DEAD |
| `generateFollowUp` | `outreachGenerator.ts:82` | DEAD (0 callers) |
| `distributorNote` | `outreachGenerator.ts:123` | DEAD (declared, never called) |
| `reconcileLeadWithProspect` | `outreachLifecycle.ts:192` | DEAD (0 callers) |
| `applyLeadStageToProspect` | `outreachLifecycle.ts:207` | DEAD as a product path — `GlobalStateContext` re-implements the same transition inline instead of calling it |
| `matchLeadToProspect` | `prospectPipeline.ts:38` | called only by `matchLeadsToProspects` + one validator |
| `calculateRaw`, `assignTier`, `checkDisqualifiers` | declared in `intelligenceTypes.ts:184-189` | **do not exist as code** |
| `VIEW_ALLOWLIST` / `canAccessView` / `filterNavForTier` | `lib/auth/rbac.ts:46-74` | DEAD for admin navigation (0 call sites) — reported because it directly affects BI access |

### 29.3 Fields populated in the dataset but never read by any consumer

| Field | Why unused |
|---|---|
| `ASIN.subcategory` (3 ASINs) | no component reads it |
| `ASIN.amazonOfferConfidence`, `.lastObserved`, `.sourceLabel`, `.category` | never rendered |
| `ASIN.estimatedSales` | used only inside the score; the Overview *sums* it, and `generateEmail` computes it then discards it |
| `wholesale.source/sourceUrl/confidence/evidence` | only the three boolean flags are rendered |
| `distributor.confidence`, `.sourceUrl`, `.evidence` | only company/territory/exclusive/approach rendered |
| `restriction.source/sourceUrl/dateObserved/evidence` | only the description surfaces (as the DQ reason) |
| `contact.company`, `.source`, `.lastVerified`, `.evidence` | only name/title/(email)/(LinkedIn) rendered |
| `prospect.evidence[]` (all 17 rows) | **no component renders evidence at all** |
| `prospect.notes`, `.owner`, `.lastAmazonCheck`, `.lastDistributorCheck`, `.lastContactCheck`, `.outreach[]` | never written, therefore never read |
| `IntelligenceSnapshot` (all rows) | `getSnapshots()` is called only by the validator |
| `IntelligenceDashboard.newThisWeek`, `.topProspect` | returned but never rendered by the panel |
| `IntelligencePipelineConfig` (8 fields) | never constructed |
| `BrandMarketIntelligence` (14 fields) | unreachable (dead producer) |

### 29.4 Never-populated fields (0 occurrences in the dataset)

`ProspectASIN.packSize`, `.subcategoryRank`, `.featuredOffer`, `.marketplaceSellers`, `.searchTerms`; `ProspectContact.linkedInUrl`, `.country`, `.email`, `.phone`; `ProspectDistributor.contact`, `.email`, `.phone`; `ProspectWholesale.minimumOrderQuantity`, `.tradePricingAvailable`, `.tradeUrl`, `.retailerApplicationUrl`; `ProspectEvidence.notes`; `BrandProspect.lastAmazonCheck`, `.lastDistributorCheck`, `.lastContactCheck`, `.owner`, `.notes`, `.outreach`.

---

## 30. Missing / unknown implementation

### 30.1 Confirmed absent (NOT FOUND)

Brand/company enrichment · legal entity / company number · employees / company size · ownership · market/territory model · competitor records · incumbent records (free text only) · non-Amazon marketplace presence · ASIN discovery · product fetch · sales estimation · demand model beyond a 5-point bucket · BSR history · review history · price history · seller history · Buy Box / featured-offer capture · per-product scores · market sizing · growth-rate modelling · trend series · contact discovery · contact enrichment · email retrieval · phone retrieval · LinkedIn retrieval · contact verification · contact relevance ranking · preferred-contact selection · runtime evidence generation · evidence display · provenance display · freshness/staleness computation · qualification threshold or state · BI scheduler · any `nextCheck` reminder · BI persistence (DB or browser) · BI cache · live BI provider · value-level change detection · snapshot display/trend · candidate source provenance · opportunity→onboarding hand-off.

### 30.2 UNKNOWN (cannot be established from this repository)

| # | Unknown | Why it cannot be established |
|---|---|---|
| U1 | Whether the seed values (prices, review counts, BSRs, sales/revenue, contacts) were copied from real Amazon/company sources at authoring time | The repo contains no provenance for the literals beyond self-authored `ProspectEvidence` strings — no source data, no import script, no commit evidence |
| U2 | Whether "MerchantWords" was ever intended as an integration | No client, no registry entry, no config, no doc reference other than the evidence string |
| U3 | Whether `createBrandIntelligenceClient`'s `_forceMock` parameter was ever honoured | No history of a live implementation in this tree; it is ignored today |
| U4 | The intended semantics of `RawScoreFactors.growth.retailExpansion` | Declared only as a 0-3 comment; no producer, no consumer, no doc |
| U5 | Whether `IntelligencePipelineConfig` fields were ever wired to a UI | No UI reads or writes any config field |
| U6 | The intended tier ceiling given the 92-point maximum (i.e. whether `tier_1` was expected to be reachable) | Only inferable; the dead weights constant suggests an intended 0–100 |
| U7 | Whether the two disqualified brands were checked against real Amazon prohibition terms | The restriction text is a literal with a brand-site `sourceUrl`, not a policy document |
| U8 | Whether `B0HOT01`-class identifiers were placeholders intended to be replaced by real ASINs | No comment, no mapping table, no TODO (and none is asserted here) |

### 30.3 Out of scope

The behaviour of systems BI does **not** use — the ICP discovery engine's real clients, Keepa-based Product Research, and the provider seams — was not audited beyond confirming that no BI module imports them.

---

## 31. Exact conclusions supported by evidence

1. **BI is a seeded, deterministic, in-memory system.** 12 hand-written records, re-scored at boot and per manual run, with run/change/snapshot ledgers that live only for the session. (Runtime + validators + store code.)
2. **BI has no live data source.** 0 network calls; the only "provider" is `MockClient`; `createBrandIntelligenceClient` ignores its argument. (Validator `externalFetches === 0`; diagnostic `EXTERNAL FETCHES: 0`; client code.)
3. **BI contains no discovery, no ASIN retrieval, no sales model, no contact discovery, no enrichment.** Each named capability either does not exist or exists as a dead module (`discoveryClient.ts`, 0 call sites). (grep + read.)
4. **The scoring engine does not use its declared weights, cannot reach 100, double-counts the challenger bonus, and labels a rating-derived term as a sales estimate.** (Scoring source + runtime.)
5. **The seed `score:` literals are dead data** — the engine always recomputes different values; 8 of 12 brands end up below the `tier_4` floor. (Runtime comparison table §28.4.)
6. **Every tier above `tier_4` is unreachable with the current dataset**, which makes the `Lead.priority = 'High'` branch and the "Attack/High Prob" UI tiers dead paths. (Runtime.)
7. **Evidence and provenance are modelled but never rendered**, and only Tapatío's record is substantively evidenced (7 of 17 rows); 9 of 12 brands have no evidence at all. (Runtime + grep.)
8. **Contacts are names and titles only.** 0 emails, 0 phones, 0 LinkedIn URLs in the entire dataset; the send destination is a `.example` placeholder by construction. (Runtime + `outreachDestination`.)
9. **BI is manually triggered and never scheduled.** `nextCheck` is a display stamp with no consumer. (Code + grep.)
10. **BI state is not persisted** in any form; reload re-derives from literals and discards all session history and acquisition artefacts. (Store contract + validator O-series.)
11. **Deduplication is real and tested** (normalized brand key, single-record merge, sticky DQ). (Validators.)
12. **Phase C preserves identity but discards most BI intelligence**: ASINs, per-ASIN metrics, sales numbers as data, evidence rows, provenance, runs/snapshots and six of seven score dimensions do not cross any boundary in a consumable form. (§25.)
13. **The BI → ICP priority mapping and both status ladders are lossy** (`High` unreachable; five BI statuses collapse to one ICP stage; `lost`/`nurture` approximated). (§21.3.)
14. **The admin nav RBAC allowlist is not enforced**, so the BI panel and the Phase C workflow are reachable by any admin-staff session, while domain-layer mutation guards do work. (§20.1.)
15. **Documentation overstates BI** in specific, checkable ways: a "discovery engine", a delivered "Discovery Client", three brands that do not exist, and "weekly" snapshots. (§27.)

No conclusion in this document relies on inference from names, documentation, or intent: every claim cites code read this session, a command executed this session, or both.

---

## 32. Required final table

| Question | Answer | Evidence | Confidence |
|---|---|---|---|
| What starts BI discovery? | Store boot (`prospectStore.boot()` on first store access) and the single admin button **Run discovery** (`runBrandIntelligence({trigger:'manual'})`). Nothing else | `prospectStore:47,84`; `BrandIntelligencePanel:24,33`; runtime | High |
| Is discovery live? | **No.** Zero network calls; the universe is 12 TypeScript literals; `createBrandIntelligenceClient` always returns `MockClient` | validator *"ZERO external network calls"*; diagnostic `EXTERNAL FETCHES: 0`; `brandIntelligenceClient:90` | High |
| What data sources are used? | Two local seed files (`brandProspectSeed.ts`, `brandExtraSeed.ts`) plus the in-repo `ICP_REGION_BY_COUNTRY` / `APPROVED_CATEGORIES` constants. No external source of any kind | §3.1, §7, §26 | High |
| What company data is collected? | 12 real brand names + website, category, countries/ukPresence, maturity, incumbent (2 records), whyInteresting; contact name/title for 5 | runtime §28.3; §6.1, §6.2 | High |
| What product data is collected? | 14 hand-written ASIN objects: title, category, (subcategory ×3), price, rating, reviews, BSR, url, sellerCount, amazonRetailSeller, prime, estimatedSales/Revenue, offerClass/Confidence, lastObserved, sourceLabel | §6.3; runtime | High |
| Are ASINs collected? | **No** — 14 ASIN-shaped literals are typed in; no ASIN is ever fetched or discovered; identifiers are synthetic | §6.3, §8 | High |
| Are estimated sales collected? | **No** — `estimatedSales`/`estimatedRevenue` are literal integers; the only "calculation" is a 5-point bucket from their sum | §9 | High |
| How are sales estimated? | **They are not.** No model, provider or formula exists; the evidence rows claim "MerchantWords estimate" but no such client exists | `brandProspectSeed:38`; grep MerchantWords | High |
| What Amazon metrics are collected? | reviews, rating, BSR, price, seller count, Amazon-retail flag, offer class, Prime flag, category — all literals | §6.3 | High |
| What contact data is collected? | 5 records: name, jobTitle, company, source, confidence labels, lastVerified. **0 emails, 0 phones, 0 LinkedIn URLs** | §6.6; runtime | High |
| How are contacts discovered? | **They are not.** A dead seed-lookup stub (`discoveryClient.ts`, 0 callers) is the only contact mechanism in the codebase | §10, §29.1 | High |
| What scores exist? | One: `ProspectScore` (7 raw-summed dimensions + total + tier). No opportunity/product/market/contact scores; `Lead.fitScore` is a separate ICP score | §11 | High |
| How are scores calculated? | `scoringEngine.calculateScore` sums the 7 sub-scores (the weights constant is unused), caps at 100 (max reachable 92), assigns tier at 90/80/70/60; `checkDisq` zeroes it on a hard DQ | §11.1, §11.2; runtime | High |
| What evidence is stored? | 17 `ProspectEvidence` rows (all `2026-09-06`, `medium` confidence): source, sourceUrl, classification FACT/ESTIMATE; Tapatío 7, Cholula 1, Valentina 1, the other 9 brands 0 | §6.7, §13 | High |
| How is provenance stored? | Inline on each record (`evidence[]` arrays, `source:'mock'`, `sourceUrl` fields). It is **never displayed and never crosses a boundary**; the only provenance artefact downstream is the BI score/tier snapshot on an `Opportunity` | §13, §25 | High |
| How often does BI run? | Automatically once per session boot; otherwise only on an operator click. **No scheduler, no periodic behaviour** | §15 | High |

| What triggers BI? | (a) boot, (b) the "Run discovery" button, (c) validators. `trigger:'scheduled'` is declared but never produced | §15; grep | High |
| What happens to previous runs? | Run/change/snapshot rows are appended and retained in memory; the prospect record itself is replaced in place. Everything is lost on reload | §15, §16, §17 | High |
| What happens when a brand changes? | A run detects change only via total score, evidence count, ASIN count or distributor count; it then emits one `updated` event with before/after free text | §5.3, §15 | High |
| What happens when a brand is disqualified? | Written and sticky: score zeroed, excluded from ICP/acquisition, kept in the store + Disqualified list, audited | §12.2, §12.3 | High |
| Where is BI data stored? | In-memory module arrays in `prospectStore.ts` only — no Supabase, no migration, no browser storage, no cache | §16; grep of `supabase/` | High |
| What is the canonical BI object? | `BrandProspect` (12 records: `prospect-tapatio`, `prospect-cholula`, `prospect-valentina`, `p-astonish`, `p-seep`, `p-delphi`, `p-flyby`, `p-lockn`, `p-mikes`, `p-kitkin`, `p-truthbrush`, `p-upcircle`) | §6.1; runtime | High |
| What does ICP receive? | An 11-field `Lead` per active prospect: canonical `prospectId` + `lead-<id>`, persona (name+title), company, location string, email (empty), priority (always Medium), stage (Scraped), segment, fitScore 0, region | §21.2; runtime | High |
| What does ICP currently lose? | ASIN identity and all per-ASIN metrics, sales/revenue as data, distributor/wholesale/restriction/growth records, all evidence and provenance, 6 of 7 score dimensions, maturity/incumbents/whyInteresting, DQ reason | §21.4, §25 | High |
| What does outreach receive? | Generated copy only: subject, body, evidenceSummary markdown, leadId, prospectId, revision/status; plus the send destination (`.example` placeholder) | §23, §25 | High |
| What does CRM receive? | The `Opportunity` snapshot (prospectId, brand, category, biScore, biTier, evidenceSummary, contactName, contactEmail undefined, leadId/outreachId/responseId) + the whole `BrandProspect` in memory + the canonical message thread | §24, §25 | High |
| Which BI data is real/live? | **None.** 0 live-fetched fields, 0 previously-persisted provider fields | §26; validator + diagnostic | High |
| Which BI data is seeded? | All 12 brand records, 14 ASINs, 5 contacts, 1 distributor, 2 restrictions, 1 growth signal, 17 evidence rows, all wholesale flags | §26 | High |
| Which BI data is mock? | The `MockClient` scoring/dashboard path, the dead mock discovery/Amazon clients, the `emailConfidence`/`phoneConfidence` labels, `source:'mock'` on every record, and the simulated send/response path in Phase C | §26 | High |

---

## 33. Hard stop

This audit is complete. **No Phase D work was started, Phase C was not modified, no discovered issue was fixed, nothing was refactored or redesigned, no data was replaced, no API / job / scheduler was added, and nothing was committed or deployed.**

**No recommendations are made in this document.** Every item is either implemented reality (with code or command evidence), or explicitly marked **NOT FOUND** / **UNKNOWN**.





































