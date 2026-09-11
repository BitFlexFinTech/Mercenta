# PRODUCT CONSOLIDATION — PHASE D2: BI INTELLIGENCE PRESERVATION THROUGH ACQUISITION

> Date: 2026-09-11 · Branch: `redesign/foundation` · Pre-D2 HEAD: `4a3f761`
> (D1 gate). Protected baseline (never touched): `959b4d2` /
> tag `mercenta-baseline-before-redesign-20260907`.
> Session type: **IMPLEMENTATION**. No new audit was performed: the lossy
> mapping was already established by
> `docs/BI_FORENSIC_IMPLEMENTATION_AUDIT_2026-09-11.md`; D2 reads the existing
> implementation and fixes it.

---

## 1. The defect D2 fixes (as established, not re-audited)

Phase C preserved canonical **identity** end-to-end but the acquisition path
carried only:

1. a narrow `Lead` projection (`id, prospectId, persona, company, location,
   email, priority, outreachStatus, segment, fitScore, region`) built by
   `buildAcquisitionLead()`, and
2. a single **prose** `evidenceSummary` string written onto the outreach
   revision by `prepareOutreach()` (`generateOutreachSummary()`).

Everything else Brand Intelligence actually holds — ASIN-level metrics, the full
contact set with confidence/provenance, distributor / wholesale context,
restrictions, growth signals, the complete evidence trail, the seven score
factors, and the run/change/snapshot history — had **no acquisition-layer
contract**. It was technically still in `prospectStore`, but nothing in the
acquisition domain read it, and nothing proved it survived. The operator surface
showed only a score badge and two counts.

## 2. What was built

### 2.1 NEW — `src/lib/intelligence/prospectIntelligence.ts` (248 lines)

THE canonical BI-intelligence access layer. Every read resolves against
`prospectStore` and returns the record the BI layer holds — **nothing is copied
into a second store**.

| Export | Purpose |
|---|---|
| `getProspectIntelligence(prospectId)` | Canonical lookup → `ProspectIntelligence` \| `null` (unknown id is never fabricated) |
| `buildProspectIntelligence(prospect)` | Pure projection over an existing record (no lookup) |
| `getIntelligenceForLead / ForOutreach / ForResponse / ForOpportunity` | Any downstream artefact reaches its BI record by its own `prospectId` |
| `intelligenceDigest(prospect)` | Counts + the exact seven score factors + per-section populated state |
| `intelligenceProvenance(prospect)` | Run ids, timeline event ids, snapshot dates, grouped evidence sources, evidence + ASIN source URLs |
| `intelligenceSections(prospect)` | All **11** canonical sections with their real counts (empty reported as empty) |
| `collectEvidence(prospect)` | Every evidence item **including nested** ASIN / distributor / wholesale / restriction / growth / contact evidence |
| `buildIntelligenceRef(prospect, revision)` | The ids+counts reference stored on an outreach revision |

Documented snapshot semantics: `intelligence.prospect` is the **live canonical
object** (same reference the store holds); `digest`/`provenance`/`lifecycle` are
a **point-in-time projection** taken at read time — consumers hold the
`prospectId` and re-read.

### 2.2 `src/types.ts` (+129 lines)

`ProspectIntelligenceSectionKey`, `ProspectIntelligenceSection`,
`ProspectIntelligenceProvenance`, `ProspectIntelligenceDigest`,
`ProspectIntelligence`, `ProspectIntelligenceRef`; plus
`ProspectOutreachRecord.intelligenceRef?`. Schema stays in the single shared
types file — no component-local shape.

### 2.3 `src/lib/acquisition/outreachLifecycle.ts`

- `AcquisitionProspectRow` now carries `intelligence: ProspectIntelligence`
  (built by reference in `listAcquisitionProspects()`), so every acquisition read
  model exposes the canonical intelligence.
- `prepareOutreach()` stores `intelligenceRef` (ids + counts + score snapshot +
  populated sections) on the revision — traceability to what BI held at
  preparation time, **without** copying the intelligence.

### 2.4 REAL DEFECT FOUND AND FIXED — placeholder slug

`outreachDestination()` derived the unmistakably-fake placeholder address with a
local regex that **dropped** accented characters:
`'Tapatío'.toLowerCase().replace(/[^a-z0-9]/g,'')` → `tapato` →
`hello@tapato.example` (mangled). It now uses the canonical
`normalizeBrandKey()` (NFD-fold), yielding `hello@tapatio.example` — consistent
with the brand identity used everywhere else in BI/ICP. Found by the D2 gate's
own assertion, not by inspection. No test depended on the mangled string.

### 2.5 `src/components/admin/AcquisitionWorkflow.tsx` (+159 lines, additive)

Minimal UI change, required to expose (and browser-verify) the new capability —
no styling, layout, navigation or design-system change. A
`data-section="intelligence"` block renders, from the live canonical record:

- provenance header + `by reference · <prospectId>`;
- the seven score-factor chips (`data-score-factor`) + total/tier;
- the full ASIN table (`data-asin`: ASIN / title / BSR / sellers / est. revenue / evidence count);
- the full contact set with email + confidence;
- distributors (company / territory / exclusivity / suggested approach), restrictions, wholesale programme, growth signals, category/countries/incumbent;
- provenance line (runs / timeline events / snapshots / evidence sources) + BI lifecycle dates.

Reachable from **three** existing surfaces with no new navigation: Brand
Intelligence → prospect → **Outreach** tab (`ProspectDetailPanel`); Brand CRM →
**Acquisition Relationships** → relationship; Marketing → **Acquisition Pipeline**.

## 3. Verification evidence (this session, real output)

| Gate | Command | Result |
|---|---|---|
| Typecheck | `npm run typecheck` | **PASS** (0 errors; identical to the D1 baseline) |
| Lint | `npm run lint` | **PASS** (0 problems) |
| Build | `npm run build` | **PASS** — `✓ built in 3.26s` (AdminShell chunk 467.10 → 477.13 kB: the added intelligence surface) |
| **D2 validator** | `node scripts/validate-bi-intelligence-preservation.mjs` | **PASS** — `BI_INTELLIGENCE_PRESERVATION_VALIDATION_PASS` (**44 assertions**) |
| D2 E2E | `npx playwright test e2e/bi-intelligence-preservation.spec.ts` | **4 passed (8.5s)** |
| Relevant E2E | acquisition-pipeline · brand-intelligence-lifecycle · domain-acceptance · crm · dashboard · multi-tenant · rocketchat-removal | **41 passed (39.1s)** |
| Full E2E | `npx playwright test` | **169 passed / 4 skipped / 0 failed, EXIT=0 (2.4m)** — D1 baseline 165/4/0 → **+4 tests, 0 new failures, 0 new skips** |
| Existing validators | bi-lifecycle · acquisition-pipeline (64/64) · prospect-pipeline · demo-completeness (27/27) · mock-providers · provider-workflows · design-tokens · csv-import | **ALL PASS** |

### 3.1 What the D2 validator asserts (44)

- **A. Identity continuity (10)** — the view returns the store's current object;
  the ICP lead keeps `lead-<prospectId>`; outreach/response/opportunity/
  relationship all keep the same id; every downstream artefact can reach the BI
  record; an unknown id is `null`; repeated reads track post-transition state.
- **B. ASIN preservation (5)** — digest count === canonical count (2 for Tapatío);
  every ASIN keeps id/title/BSR/rating/reviews/price/sellers/URL/estimatedRevenue
  + nested evidence; per-ASIN aggregates recomputed downstream equal BI exactly
  (38 400 + 34 200); the revision recorded the ASIN count it was prepared against;
  counts + uniqueness hold across the whole active universe.
- **C. Contact preservation (5)** — the canonical contact (Sherry Zhang, VP
  International Sales) is reachable; confidence + source provenance retained
  (`unverified`/`LinkedIn`); counts match BI universe-wide; no email is invented
  (BI email or `.example` only); placeholder slugs use the canonical brand key.
- **D. Evidence + provenance (7)** — nested evidence included and reconciled with
  the digest (8 for Tapatío); every item fully sourced (field/value/source/
  sourceUrl/date/confidence/classification); source counts reconcile to the total;
  Amazon + LinkedIn source URLs survive; provenance traces to the canonical run
  history, snapshots and timeline; an unchanged re-check records the run but
  claims **no** change.
- **E. Scoring traceability (5)** — all seven factors match BI exactly;
  total/tier/`calculatedAt` are BI values; factors reconcile to the total; all 11
  sections are always reported with real counts; the revision's snapshot matches
  BI at preparation time.
- **F. By-reference proof (4)** — a canonical mutation is immediately visible
  downstream (probe ASIN added, then restored), and restoring the record restores
  the view (no divergent copy); the outreach record holds a reference only (no
  intelligence arrays, all ref values primitive); the acquisition store declares
  no second intelligence record.
- **G. Universe + RBAC (4)** — the active universe is exactly the ten real brands;
  outreach cannot be prepared for a non-canonical id; disqualified prospects stay
  resolvable but untargetable; a view-only actor is refused while reads succeed.
- **H. Safety (1)** — **ZERO** external network calls across every intelligence
  read and workflow step.

### 3.2 Browser gate

`e2e/bi-intelligence-preservation.spec.ts` (4 tests) verifies in the real app for
Tapatío: canonical counts render (2 ASINs / 1 contact / 8 evidence / 1 growth
signal / 0 distributors / 0 restrictions); the canonical score renders as
**68 / tier_4 — the engine's re-scored value (the raw seed literal 75 was
pre-scoring)**; ASIN rows equal the declared count; the seven factor chips sum to
the total; the BI panel header shows the same total; preparing a recommendation
embeds real BI ASIN intelligence in the copy (`2 ASINs`, `~£73k/mo`,
`Tapatío Hot Sauce 12oz (3-Pack)`, `BSR #1250`, `8 sellers`); the ASIN shown on
the BI **Amazon** tab is the same ASIN the acquisition view reads. Zero page errors.

## 4. Known limitations / honest caveats

- **No manual browser click-through** — verification is Playwright against the
  local dev server, not a human pass, and not against `demo.mercenta.co.uk`
  (no deploy in this phase).
- **Acquisition artefacts remain session-only in-memory** (unchanged; that is
  D4). The D2 reference therefore does not survive a reload — the *intelligence*
  does (it re-boots from the canonical BI seeds), which is precisely why storing a
  reference rather than a copy is the correct design.
- **A duplicate placeholder-slug derivation exists OUTSIDE D2's scope:**
  `src/components/shared/BrandComm.tsx:20` (`brandInboxAddress`) uses its own
  weaker regex (`replace(/[^a-z]/g,'')` — it strips digits *and* accents). This is
  a single-source-of-truth violation, but it serves onboarded brands' demo inbox
  addresses (ASCII demo names; no observed defect) and sits on the messaging
  surface. **Deliberately NOT changed in D2** (out of scope; needs its own
  verification) — recorded here as a tracked finding, not a silent one.
- **The generated copy quotes ASIN titles/BSR, not raw ASIN ids**, so the browser
  assertion checks `2 ASINs`, `~£73k/mo`, the top title, `BSR #1250`, `8 sellers`
  — every one of which is canonical BI ASIN data. No ASIN id appears in the prose
  by design.
- `verify-registry.mjs` reports the same pre-existing 104 issues (unchanged scope).
- The 4 skipped E2E tests are the pre-existing/intentional skips (access-gate
  t6/t8/t9 + tours t5) — unchanged by this phase.

## 5. Explicitly NOT done in this phase

- No BI engine change, no discovery change, no scoring change, no new scheduler.
- No new prospect/lead universe; no mock intelligence record; no second store.
- No Rakazo / Postiz work. No persistence work (D4). No UI redesign, no styling,
  no navigation change.
- No changes to CRM / Messages / Helpdesk logic.
- No deploy, no push, no generated artefacts committed.

## 6. Next phase

**D3 — outreach/provider hardening**: keep the transport seam the only path to a
live provider; prove simulation never calls the network and that a missing
credential can never be read as live; confirm human approval needs neither Rakazo
nor Postiz. D3 does not start until this gate is accepted.

---

## Commit record

- **D2 implementation commit: `fe0c893`** — `phaseD2: preserve canonical BI
  intelligence through acquisition (read by reference)` (12 files changed,
  1336 insertions, 19 deletions) on `redesign/foundation`. Verified in the same
  session (typecheck 0 · lint 0 · build PASS · D2 validator 44/44 · D2 E2E 4/4 ·
  full E2E 169/0/4).
- **Pre-D2 HEAD:** `4a3f761` (D1 gate). **D1 implementation:** `bf31151`.
- **Protected baseline (untouched):** `959b4d2` / tag `mercenta-baseline-before-redesign-20260907`.



