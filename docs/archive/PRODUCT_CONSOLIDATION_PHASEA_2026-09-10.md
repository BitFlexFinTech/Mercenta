# MERCENTA PRODUCT CONSOLIDATION — PHASE A: CORE DATA / DOMAIN / WORKFLOW CONSOLIDATION (2026-09-10)

> Phase A of the master product-consolidation pass — **CORE PRODUCT FIRST,
> RAKAZO LAST** (fresh-session continuation after Phase 1's domain-acceptance
> gate, HEAD `fe8c474`).
> Scope: bridge the Brand Intelligence → ICP identity gap, persist real fit
> scores, classify every data source, and create the portable project-memory
> files (MERCENTA_MASTER_CONTEXT.md, MERCENTA_ARCHITECTURE.md). NO UI redesign,
> NO Rakazo, NO Postiz exposure.
> Evidence classes: **CODE** (read source) · **E2E** (Playwright) · **VALIDATOR**
> (scripts/validate-*.mjs) · **GIT** · **DOC**. Every claim re-verified against
> the working tree at HEAD.

---

## 1. Repository state (re-verified at start)

| Item | Value | Evidence |
|---|---|---|
| Branch | `redesign/foundation` | `git branch --show-current` |
| HEAD | `fe8c474` (Phase 1 gate PASSED) | `git rev-parse HEAD` |
| Protected baseline | `959b4d2` (tag `mercenta-baseline-before-redesign-20260907`) intact | `git tag -l` |
| Working tree | Only generated artefacts modified (Review Zip, playwright-report, test-results/.last-run.json) + pre-existing untracked forensic/design artefacts. No source file dirty at start. | `git status` |
| Baseline gate | typecheck 0 · lint 0 · build ✓ 3.33s | executed |

## 2. What was verified by direct source reading (not assumed)

- **BI data sources** (`src/lib/intelligence/*`, `src/data/brand*Seed.ts`):
  - 12 seeded prospects (3 `brandProspectSeed`: Tapatío/Cholula/Valentina + 9
    `brandExtraSeed`: Astonish/Seep/Delphis/flyby/lockn/mikes/Kit&Kin/
    Truthbrush/UpCircle); 10 shown (Truthbrush + UpCircle hard-disqualified).
  - `createBrandIntelligenceClient()` **always returns MockClient** (`_forceMock`
    ignored — no live client class exists anywhere).
  - No persistence, no mutations, no pipeline-run UI, `outreachStatus` UI-inert.
  - Firecrawl/Keepa live clients exist but are consumed ONLY by discovery
    engine / product research — never by BI.
  - **Classification: SEEDED TEST FIXTURE (BI has NO real data source yet).**
- **ICP** (`src/lib/marketing.ts`, `src/data/bootstrap.ts` INITIAL_LEADS, UI
  `MarketingHub.tsx`):
  - Separate 8-lead seeded universe (`INITIAL_LEADS`), zero overlap with BI
    prospects (verified: none of the 8 normalize-key matches any of the 12 —
    Mara Naturals/Bella Pelle exist ONLY in ICP).
  - `scoreLeadFit` deterministic (+40 region / +30 category / +30 keywords),
    threshold 70, `shouldAutoEnroll` from Scraped/Enriched → Sequenced.
  - `Lead.fitScore` was NOT persisted (live-computed display only); discovery
    enrollment stored hardcoded `fitScore: 85` + `segment: 'Home'` regardless
    of the pipeline's real per-lead values.
  - **Classification: SEEDED TEST FIXTURE for the pipeline mechanics.**
- **BI → ICP → acquisition trace:** BI → anything = **DISCONNECTED** (no
  identity link, no hand-off). Acquisition pipeline ends at the ICP pipeline
  board (no opportunity entity, no outreach sender).
- **CRM ↔ conversations ↔ helpdesk:** ONE canonical message store
  (`logMessage` → `demoMessages`); tickets reference `messageIds`;
  `buildBrandTimeline` derives from real entity state. No duplicate message DB.
- **Analytics:** admin/brand dashboards + SalesAnalytics derive from real
  POs/shipments/compliance data; marketing Campaign Performance table reads
  seeded `INITIAL_CAMPAIGNS` (classified SEEDED — flagged, not fake-real).
- **Rocket.Chat:** `getRocketChatClient()` always returns MockClient; no real
  client; disconnected from canonical messages; marked for removal. **DOC.**
- **Postiz:** `PostizAdminPanel` always passes `apiKey: ''` → real client
  unreachable; schedule flow simulated; external out-link present. **DOC.**
- **Rakazo:** iframe surface only (`RakazoPanel`); not in provider registry;
  independence proven by domain-acceptance test 1. **DEFERRED / FUTURE SEAM
  ONLY / NO CURRENT IMPLEMENTATION.**

## 3. Defects found & fixed (Phase A scope)

| # | Symptom | Root cause | Fix | Verification |
|---|---|---|---|---|
| A1 | ICP lead has no canonical BI identity — identity cannot survive any stage | `Lead` type had no link field; no bridge existed | Added `Lead.prospectId?: string` + new `src/lib/intelligence/prospectPipeline.ts` (deterministic brand-key matching + BI→ICP derivation that never invents an origin) | Validator 18/18 PASS; E2E test 7 passes |
| A2 | CSV-ingested leads from known BI prospects were stored unlinked with `Uncategorized` segment | MarketingHub `importCsv` never consulted the BI universe | Wired `matchLeadsToProspects(imported, CANONICAL_BI_UNIVERSE)` into CSV import (fills segment only when blank; never overwrites explicit data) | E2E test 7: imported Tapatío shows `US · Grocery` in the browser |
| A3 | Discovery-enrolled leads stored fabricated `fitScore: 85` + `Home` segment | MarketingHub discarded the pipeline's real `EnrichedLead.fitScore/segment`, hardcoding both | Events now carry real fit+segment; enrollment stores them | Validator + `validate-discovery.mjs` still PASS |
| A4 | Auto-enrolled leads: computed fit was display-only, never persisted | `updateLeadStatus` only touched `outreachStatus` | Extended to `(id, status, fitScore?)`; auto-enroll persists the live score | Typecheck 0; E2E suite 154/0/4 green |

## 4. Data classification (all four categories stay distinguishable)

| Source | Classification |
|---|---|
| `brandProspectSeed` + `brandExtraSeed` (BI) | SEEDED TEST FIXTURE |
| `INITIAL_LEADS` (ICP) | SEEDED TEST FIXTURE |
| Discovery/pipeline mock directory + research/enrichment/outreach | DETERMINISTIC PROVIDER SIMULATION (mock seam) |
| DHL/CH/HMRC/SP-API provider sims | DETERMINISTIC PROVIDER SIMULATION |
| Dashboards KPIs / SalesAnalytics / helpdesk metrics | REAL INTERNAL MERCENTA DATA |
| Campaign performance / monitoring health | SEEDED (flagged) |
| Firecrawl/Keepa real clients | REAL seam EXISTS, NOT wired to BI, no live credentials — UNKNOWN live behavior |
| Live Edge Functions (SP-API/DHL/CH/HMRC/email/esign) | UNKNOWN / ABSENT from repo (deploy-time) |

## 5. Files changed (Phase A)

| File | Change |
|---|---|
| `src/types.ts` | `Lead.prospectId?: string` |
| `src/lib/intelligence/prospectPipeline.ts` | **NEW** — canonical identity bridge |
| `src/context/GlobalStateContext.tsx` | `updateLeadStatus(id, status, fitScore?)` persists fit |
| `src/components/admin/MarketingHub.tsx` | CSV link + discovery real fit/segment + auto-enroll fit persistence (logic only — no visual change) |
| `scripts/validate-prospect-pipeline.mjs` | **NEW** — 18-test validator |
| `e2e/domain-acceptance.spec.ts` | test 7 — BI→ICP identity continuity (browser) |
| `MERCENTA_MASTER_CONTEXT.md` | **NEW** — portable project constitution (§A–AF) |
| `MERCENTA_ARCHITECTURE.md` | **NEW** — technical architecture reference |
| `PROJECT_STATUS.md` | Updated — Phase A entry |

## 6. Gates (all executed this session)

- `npm run typecheck` → **0 errors**
- `npm run lint` → **0 errors**
- `npm run build` → **✓ built in 3.15s**
- Validators → **7/7 PASS**: mock-providers · mock-seam · provider-workflows ·
  automation · postiz · discovery · **prospect-pipeline (new, 18 tests)**
- Full Playwright → **154 passed / 4 skipped / 0 failed** (2.2 min; +1 new
  test; the 4 skips are the same documented pre-existing ones: access-gate
  t6/t8/t9 + tours t5)
- Browser verification (real Chromium via Playwright): domain-acceptance 7/7 —
  includes the new CSV-import link visible as `US · Grocery` for imported
  Tapatío, plus all Phase-1 contracts (Rakazo independence, BI dataset, ICP
  auto-enroll, canonical conversation, helpdesk audit, reload semantics).

## 7. Decision log (Phase A)

1. **BI→ICP identity continuity is a real first-class link** (`prospectId`)
   wired into the two live lead-ingestion paths (CSV import, discovery).
2. **BI derivation requires an explicit ICP origin region** — an unknown
   origin returns `null`; UK-only origin brands are not derivable under the
   current 4-region ICP model (documented, not fabricated).
3. **`INITIAL_LEADS` stays** as SEEDED TEST FIXTURES (protection rules: no demo
   data changes; E2E contracts depend on them); the bridge prevents them from
   ever being treated as canonical BI records (no false-positive links).
4. **Fit scores are persisted at the state-transition boundary** (auto-enroll),
   not re-derived — downstream stages see the true score.

## 8. Next (exact next phase)

**Phase B — Brand Intelligence real-data lifecycle** (per master roadmap):
design/ship the BI persistence + refresh/dedupe/provenance layer behind the
existing `BrandIntelligenceClient` seam; swap `createBrandIntelligenceClient`
to a real-data-backed implementation without breaking the mock. Exact next
action: read PROJECT_STATUS.md Phase B entry for the scoped checklist.

## 9. Memory integrity

Asked: "If a completely new Cline chat opened this repository and read the
project memory files plus the relevant code, would it know exactly what
MERCENTA is, where the project is, what has been completed, what is in
progress/deferred/blocked, what must not change, and what it should do next?"
→ **YES**: MERCENTA_MASTER_CONTEXT.md (§A–AF), MERCENTA_ARCHITECTURE.md
(verified technical map), PROJECT_STATUS.md (operational handoff with decision
log and next-action). Both new files explicitly AI-vendor-neutral.