# MERCENTA PRODUCT CONSOLIDATION — PHASE B: BRAND INTELLIGENCE REAL-DATA LIFECYCLE (2026-09-10)

> Phase B of the master product-consolidation pass — **CORE PRODUCT FIRST,
> RAKAZO LAST** (fresh-session continuation after Phase A, HEAD `dbbf567`).
> Scope: give Brand Intelligence a real, persistent, auditable lifecycle behind
> the existing `BrandIntelligenceClient` seam — canonical prospect store, manual
> Admin discovery runs, candidate intake with canonical dedupe, sticky operator
> disqualification/re-qualification, per-prospect change history, run history,
> weekly score snapshots, and single-source wiring (MarketingHub identity
> bridge + Brand "Market Intel" now read the SAME canonical store). NO UI
> redesign, NO Rakazo, NO Postiz exposure.
> Evidence classes: **CODE** · **E2E** (Playwright) · **VALIDATOR**
> (scripts/validate-*.mjs) · **GIT** · **DOC**. Every claim verified against the
> working tree at HEAD.

---

## 1. Repository state (re-verified at start)

| Item | Value | Evidence |
|---|---|---|
| Branch | `redesign/foundation` | `git branch --show-current` |
| HEAD | `dbbf567` (Phase A gate PASSED) | `git rev-parse HEAD` |
| Protected baseline | `959b4d2` (tag `mercenta-baseline-before-redesign-20260907`) intact | `git tag -l` |
| Working tree | Only generated artefacts (Review Zip, playwright-report, test-results) + untracked forensic/design — no source file dirty at start | `git status` |
| Baseline gate (re-run before Phase B work) | typecheck 0 · lint 0 · build ✓ 3.83s | executed |

## 2. As-built BI architecture (before this phase) — verified by source reading

- BI had **no lifecycle**: `createBrandIntelligenceClient()` always returned
  MockClient; the panel imported seed arrays directly and re-scored at every
  load; no persistence, no run mechanism, no history, no mutation path.
- MarketingHub maintained a **second, disconnected** literal of the BI universe
  (`CANONICAL_BI_UNIVERSE`); Brand "Market Intel" imported the seeds again.

## 3. What was built (Phase B)

### 3.1 Canonical prospect store — `src/data/prospectStore.ts` (NEW)
- In-memory single runtime source of truth for the BI universe + lifecycle
  history. Boots ONCE per session from the authoritative seed modules, scores
  every seed through the real engine, preserves seed disqualifications, and
  records the origin (`run-seed-baseline`, trigger `seed`, one `created` change
  event per prospect). Reload re-boots deterministically (documented demo
  persistence contract, same as `demoStore`).
- Keepers: `getProspects / getProspect / getRuns / getChanges /
  getProspectTimeline / getSnapshots / updateProspect / applyRunResult /
  recordLifecycleEvent / resetProspectStore` (reset = validator determinism
  helper only, never called by product code).

### 3.2 Lifecycle engine — `src/lib/intelligence/prospectLifecycle.ts` (NEW)
- `runBrandIntelligence(opts)` — the discovery-run contract:
  - re-scores the whole universe through the existing client seam
    (deterministic; MockClient — live seam unchanged);
  - candidate intake (future real data-source seam) with **canonical dedupe**
    by normalized brand key: re-discovery of an existing brand refreshes the
    SAME record (never a second record); genuinely new brands become `created`;
  - change classification: `created / updated / disqualified / requalified /
    unchanged`, recorded as `ProspectChangeEvent`s (field, before/after,
    summary, runId);
  - **sticky operator disqualification** — a re-scan can never silently
    re-activate a prospect a human disqualified; re-qualification is an
    explicit operator action;
  - rounds every prospect' `lastChecked` + `nextCheck` (now + 7d) and appends
    one `IntelligenceSnapshot` per prospect per run (score-over-time history);
  - **zero fabrication**: with no candidate input, a run is an honest
    re-check ("Scanned 12. New 0. … Unchanged 12.").
- `disqualifyProspect(id, reason, by?)` / `requalifyProspect(id, by?)` —
  audited operator lifecycle mutations.
- `getPipelineStatus()` — derived pipeline state for the UI and validators.

### 3.3 Types — `src/types.ts`
Added `IntelligenceRun` (+ `IntelligenceRunStatus` / `IntelligenceRunTrigger`),
`ProspectChangeEvent` (+ `ProspectChangeType`), `IntelligencePipelineStatus`,
and `BrandProspect.lastChecked? / nextCheck?`. Single source of truth.

### 3.4 UI (minimal, within the no-redesign freeze)
- **Admin Brand Intelligence panel** (`BrandIntelligencePanel.tsx`): now
  store-backed; adds Pipeline Control ("Run discovery" manual trigger +
  next-check stamp), Run History (every run: scan/new/updated/dq/unchanged
  counts + expandable per-prospect change list), and a **Disqualified** section
  with per-prospect re-qualification. All prior contracts preserved exactly
  (12 tracked / 10 rows / search / drill-down).
- **Prospect detail** (`ProspectDetailPanel.tsx` + `ProspectDetailTabs.tsx`):
  provenance badges (last checked / next check), a new **History** tab
  (auditable change timeline), and the **Disqualify** operator action
  (reason prompt → audited).
- **Brand "Market Intel"** (`brand/BrandIntelligence.tsx`) now reads the
  canonical store instead of importing seeds.
- **MarketingHub** identity bridge now consumes `getProspects()` — the
  duplicate `CANONICAL_BI_UNIVERSE` literal is deleted (single source).

## 4. Data classification (updated)

| Data | Classification |
|---|---|
| BI canonical prospect universe (12, 10 active) | **CANONICAL AUTHORITATIVE SEED** — provenance tracked by run/change/snapshot history; `source:'mock'` records only that no live provider produced it (governing decision, 2026-09-10) |
| Discovery runs / candidate intake | Deterministic engine output over the store — **no external fetch (proven)** |
| ICP `INITIAL_LEADS` (8) | Unchanged SEEDED TEST FIXTURES (un-linked by design — the bridge proves zero collision) |
| Firecrawl / Keepa / live EFs | Real seams only — UNKNOWN live behaviour (no credentials); documented, never claimed |

## 5. Files changed

| File | Change |
|---|---|
| `src/data/prospectStore.ts` | **NEW** — canonical store + history |
| `src/lib/intelligence/prospectLifecycle.ts` | **NEW** — lifecycle engine |
| `scripts/validate-bi-lifecycle.mjs` | **NEW** — 29-test validator |
| `e2e/brand-intelligence-lifecycle.spec.ts` | **NEW** — 2-test browser suite |
| `src/types.ts` | run/change/status types + prospect lifecycle stamps |
| `src/components/admin/BrandIntelligencePanel.tsx` | store-backed + Pipeline Control + Run History + Disqualified section |
| `src/components/admin/ProspectDetailPanel.tsx` | provenance, History tab, Disqualify action |
| `src/components/admin/ProspectDetailTabs.tsx` | + HistoryTab + provenance rows |
| `src/components/brand/BrandIntelligence.tsx` | store-backed (single source) |
| `src/components/admin/MarketingHub.tsx` | identity bridge reads the store; duplicate universe literal removed |
| `docs/PRODUCT_CONSOLIDATION_PHASEB_2026-09-10.md` | this report |
| `PROJECT_STATUS.md` / `STATUS_CHECK.md` / `HANDOFF.md` / `MERCENTA_ARCHITECTURE.md` / `MERCENTA_MASTER_CONTEXT.md` | canonical context updates |

## 6. Gates (all executed this session)

- `npm run typecheck` → **0 errors**
- `npm run lint` → **0 errors**
- `npm run build` → **✓ built in 3.70s**
- `node scripts/validate-bi-lifecycle.mjs` → **BI_LIFECYCLE_VALIDATION_PASS**
  (29 tests: universe boot · origin events · run determinism + idempotence ·
  candidate dedupe (Tapatío, Kit&Kin) · genuine new discovery · sticky
  disqualify · re-qualify · snapshots · pipeline status · single-source bridge ·
  **0 external fetches**)
- Existing validators (10 re-run) → **ALL PASS** (prospect-pipeline, mock-
  providers, mock-seam, provider-workflows, discovery, postiz, automation,
  csv-import, demo-completeness, design-tokens)
- **Full Playwright regression** → **156 passed / 4 skipped / 0 failed** (2.3m).
  Baseline was 154/0/4; +2 new lifecycle tests, 0 regressions. The 4 skips are
  the same documented pre-existing ones (access-gate t6/t8/t9 + tours t5
  deductions-surface product gap).
- Browser verification (real Chromium): run-discovery → summary `Scanned 12 …
  New 0 … Unchanged 12`, run history rows, expandable seed-baseline changes,
  next-check stamp, 10-row table, detail provenance + History tab, operator
  Disqualify (row joins Disqualified section with audited reason), Requalify
  (row restored deterministically), **0 page errors** in both specs.

## 7. Decision log (Phase B)

1. **BI lifecycle is a real store + engine layer** on the existing client seam
   — the MockClient remains the deterministic scoring engine; the lifecycle
   owns persistence/history. Adding a live provider later requires only a
   RealClient behind the same seam (zero workflow changes).
2. **Canonical prospect universe = authoritative seed** (governing prompt):
   the 10 active brands (Tapatío, Seep, Astonish, Fly By Jing, LocknLock,
   Mike's Hot Honey, Cholula, Valentina, Delphis Eco, Kit & Kin) remain exactly
   as-is; provenance/change history now makes them genuinely tracked records,
   not disposable fixtures.
3. **No fabricated discoveries**: candidate intake is the ONLY source of
   `newCount > 0`. An empty-candidate run honestly reports 0 new.
4. **Operator disqualification is sticky** until an explicit re-qualification
   — the engine's re-scan may add disqualifications (hard restrictions) but can
   never silently re-activate a human decision.
5. **One universe at runtime**: MarketingHub + Brand Market Intel + Admin
   panel all read the store; the duplicate `CANONICAL_BI_UNIVERSE` literal is
   removed (single source of truth).

## 8. Next (exact next phase)

**Phase C — ICP consumption of canonical BI data** (governing Phase 3
BI→ICP→outreach pipeline): replace the seeded `INITIAL_LEADS` mock acquisition
universe with BI-derived real prospects (the `deriveLeadFromProspect` /
`matchLeadsToProspects` bridge + store already provide the identity seam),
then contact selection → outreach preparation → human approval → send tracking
→ response → opportunity → CRM. Do NOT begin UI redesign; do NOT begin
Rakazo/Postiz.

## 9. Memory integrity

The canonical memory files (MERCENTA_MASTER_CONTEXT.md, MERCENTA_ARCHITECTURE.md,
PROJECT_STATUS.md, STATUS_CHECK.md, HANDOFF.md) were updated in the same phase
as the implementation (Rule 9). A fresh session can resume at Phase C from
PROJECT_STATUS.md's Phase B entry without this chat.