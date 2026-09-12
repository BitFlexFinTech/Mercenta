# PRODUCT CONSOLIDATION — PHASE E3: CATALOG / PRODUCT MANAGEMENT

> Date: 2026-09-12 · Branch: `redesign/foundation` · Pre-E3 HEAD: `b1f1ee4`
> (E2 documentation checkpoint). E2 implementation: `08a575c`.
> Protected baseline (never touched): `959b4d2` / tag
> `mercenta-baseline-before-redesign-20260907`.
> Session type: **IMPLEMENTATION** (Phase E, sub-phase E3). No new audit, no BI
> work, no UI redesign, no live integration, no mock brands.

---

## 1. PHASE / SUB-PHASE
**Phase E — Core Platform Completion · E3 — Catalog / Product Management.**
Built by EXTENDING the existing product/catalog architecture. No second product
store, no second brand identity, no second database, no new design language.

## 2. OBJECTIVE
Make the existing catalog/production capability actually complete the lifecycle:

```
BRAND/TENANT → PRODUCT INFORMATION → COMPLETENESS → COMPLIANCE/READINESS
→ READY FOR SUBMISSION → SUBMISSION → SIMULATED PROCESSING → SIMULATED RESULT
→ RESULTING PRODUCT STATE → ONGOING CATALOG MANAGEMENT
```

demonstrable end-to-end in simulation, with truthful completeness, enforced
compliance, tenant isolation in the domain, and zero external calls.

## 3. EXISTING E3 IMPLEMENTATION USED (the source of truth)

| Concern | Canonical existing artefact | E3 verdict |
|---|---|---|
| Product entity | `Product` (`src/types.ts`) + `DemoProduct` (`src/data/demoData.ts`) | **used & de-duplicated** (`DemoProduct extends Product`) |
| Product store | `DEMO_PRODUCTS` → `demoStore.demoProducts` → `api.fetchProducts()` | **used as the ONE catalog store** |
| Admin catalog | `CatalogManagerAdmin.tsx` (`useProducts()`) | **extended** (Submission column + readiness detail) |
| Brand catalog | `ProductCatalog.tsx` (`useApp().products`) | **extended** (readiness, submit, poll) |
| Submission seam | `api.submitCatalogItem` + `MockAmazonSPAPIClient` via `createSPApiClientForConnection` | **used** (mock-first, credentials-gated) |
| Poll seam | `api.pollSubmissionStatus` | **used unchanged** |
| Compliance gate | `evaluateComplianceGate`, `isComplianceGateCleared`, `evaluateBrandCatalogGate` | **used, NOT weakened**; gate-input resolution now has ONE location |
| Submission vocabulary | `submitted / under_amazon_review / live / rejected` (`lib/spapi/transform.ts`, seed rows) | **reused** as the canonical domain union |
| Persistence | D4 port `src/data/domainRepository.ts` + `supabase/migrations/` | **extended** with one artefact method + migration 022 |
| RBAC / tenant actors | `AcquisitionActor` / `OnboardingActor` tenant-pin pattern | **mirrored** as `CatalogActor` |
| Store-change signal | `notifyCanonicalStoreChange` (`prospectStore`) | **reused** so all catalog surfaces refresh |

Fields the existing seam already validated before E3 (and therefore the ONLY
completeness prerequisites — nothing was invented):
`commodityCode, vatStatus, hazmat, length, width, height, weight`.

## 4. WHAT WAS BUILT

**Canonical types (one declaration each)**
- `CatalogSubmissionStatus`, `CatalogClientMode`, `ProductSubmission`,
  `ProductCompleteness`, `CatalogReadiness` added to `src/types.ts`.
- `DemoProduct` now `extends Product` (the 20 re-declared fields removed).
- `SeedSubmission` is now an ALIAS of `ProductSubmission` (one shape).
- `spapi/transform.ts` `SubmissionStatus = 'pending' | CatalogSubmissionStatus`.

**Canonical prerequisite module (NEW)**
- `src/lib/catalog/productCompleteness.ts` — `REQUIRED_SUBMISSION_FIELDS`,
  labels, `missingSubmissionFields`, `evaluateProductCompleteness`. `api.ts` and
  the UI both read it, so validation and displayed completeness cannot disagree.

**Catalog store (extended, not duplicated)**
- `demoStore` now owns a MUTABLE submission store (`demoProductSubmissions`,
  `demoSubmissions` alias kept) with canonical ids `sub-<brandId>-<sku>`, plus
  `recordCatalogSubmission`, `updateCatalogSubmission`, `getCatalogSubmission`,
  `getSubmissionsForBrand`, `latestSubmissionForProduct`, `addCatalogProduct`
  (idempotent by tenant+SKU), `findCatalogProduct`,
  `productsForBrandFromStore`, `recordCatalogAudit`.
- The six previously read-only seed rows are preserved, now carrying explicit
  `simulated: true` / `mode: 'mock'` provenance.

**Domain lifecycle (NEW)**
- `src/lib/catalog/catalogLifecycle.ts` — `CatalogActor` (tenant-pinned RBAC),
  `evaluateCatalogReadiness`, `submitCatalogProduct`, `pollCatalogSubmission`,
  `listBrandCatalogSubmissions`, `catalogStatusForProduct`,
  `getCatalogPersistenceStatus`. Enforcement order: RBAC → tenant → completeness
  → compliance gate + provider seam → resulting state → D4 persistence → audit.

**Submission seam (extended, behaviour preserved)**
- `api.submitCatalogItem` now validates with the canonical prerequisite list,
  resolves the gate via ONE `evaluateBrandCatalogGate`, and RECORDS the
  resulting submission in the canonical store (`mode`, `simulated`,
  `submissionId`). The unrunnable ad-hoc Supabase insert was removed.

**Persistence (D4 port, one new artefact)**
- `DomainRepository.persistCatalogSubmission`, `DOMAIN_TABLES.catalogSubmissions`,
  `HydratedDomainState.catalogSubmissions` (additive) in the memory + Supabase
  adapters; migration `022_create_catalog_persistence.sql` (new table only,
  RLS + brand-isolation policy, non-destructive).

**UI (minimum useful additions, no redesign)**
- Brand `ProductCatalog`: a derived readiness banner (count + which products are
  incomplete and exactly which fields), a Submission column (derived, labelled
  `(sim)`), per-product **Submit** / **Check result** actions, an honest
  submit/poll notice, and the add-product panel now refuses to save an
  incomplete product instead of silently writing `0` for blank dimensions.
- Admin `CatalogManagerAdmin`: a Submission column and an inline
  "Catalog readiness & submission" block in the product detail modal.

**One write path for products**
- `GlobalStateContext.addProduct` writes to the canonical catalog store
  (tenant required) and re-reads the tenant projection; the onboarding entry
  point reads the same store. The session `products` array is a projection, not

## 5. EXACT FILES CHANGED

Modified (9 source + 4 docs):
- `src/types.ts` (+85) · `src/data/api.ts` (+114) · `src/data/demoData.ts` (+60)
- `src/data/demoStore.ts` (+172) · `src/data/domainRepository.ts` (+43)
- `src/lib/spapi/transform.ts` (+14)
- `src/components/brand/ProductCatalog.tsx` (+234)
- `src/components/admin/CatalogManagerAdmin.tsx` (+73)
- `src/context/GlobalStateContext.tsx` (+39)
- `PROJECT_STATUS.md`, `HANDOFF.md`, `PRODUCTION_READINESS.md`, `STATUS_CHECK.md`

Created:
- `src/lib/catalog/productCompleteness.ts`
- `src/lib/catalog/catalogLifecycle.ts`
- `supabase/migrations/022_create_catalog_persistence.sql`
- `scripts/validate-e3-catalog.mjs`
- `e2e/catalog-product-management.spec.ts`
- `docs/PRODUCT_CONSOLIDATION_PHASEE3_2026-09-12.md` (this file)

NOT changed: Brand Intelligence, BI scoring/discovery/seed, ICP, outreach, CRM,
Rocket.Chat, Rakazo, Postiz, executive dashboards, navigation/visual language,
`src/lib/compliance.ts` semantics, migrations 001–021, deploy scripts.
Generated/forensic artefacts (review zip, `playwright-report/`,
`test-results/`, `forensic-captures/`, untracked audit docs) were left
uncommitted and untouched.

## 6. EXISTING FUNCTIONALITY PRESERVED
- Both compliance-gate call sites still use the SAME `evaluateComplianceGate`
  signature/semantics; the previously-fixed argument-shift defect stays fixed
  (category is still deliberately `undefined`).
- `submitCatalogItem` / `pollSubmissionStatus` signatures unchanged; mock client
  selection still driven purely by credential presence.
- The six seed submissions, the admin Retail Pipeline, `NotificationCenter`, the
  compliance-scenario tenants and all demo dossiers behave as before.
- All 47 pre-existing validators produce BYTE-IDENTICAL results before and after
  E3 (see §13) — 13 legacy failures are pre-existing, not regressions.

## 7. PRODUCT DATA / DOMAIN CHANGES
- ONE product declaration: `Product`. `DemoProduct extends Product { brandId }`.
- ONE submission shape: `ProductSubmission` (aliased as `SeedSubmission`).
- ONE prerequisite list: `REQUIRED_SUBMISSION_FIELDS`.
- ONE submission vocabulary: `CatalogSubmissionStatus`.
- Product catalog state is DERIVED from the submission store
  (`latestSubmissionForProduct`) — no duplicated status field on the product, so
  the two cannot drift.
- No new demo/mock brand and no fabricated products were created; the canonical
  real brands and the 6 derived submission fixtures are preserved.

## 8. PRODUCT LIFECYCLE
`READY` (product complete + gate cleared) → `SUBMIT` (`submitted`) →
`SIMULATED PROCESSING` (`under_amazon_review`) → `SIMULATED RESULT`
(`live` | `rejected` + reason) → the resulting state is read back by the brand
row, the readiness banner, the admin catalogue and the audit log.
Rejections are terminal in the UI (no auto-resubmit); an explicit **Resubmit**
action is available after a terminal result.

## 9. COMPLIANCE / READINESS
`evaluateCatalogReadiness` = product completeness AND `evaluateBrandCatalogGate`.
A product that is incomplete is refused with `INCOMPLETE_PRODUCT`; a tenant whose
gate is not cleared is refused with `COMPLIANCE_GATE_BLOCKED`; neither path
writes a submission. The gate itself is untouched (validator checks the
`cleared: missing.length === 0 && blocking.length === 0` rule and that all 10
category requirement sets still exist).

## 10. SUBMISSION / SIMULATION
- Submissions go through the EXISTING seam: `api.submitCatalogItem` →
  `createSPApiClientForConnection` → `MockAmazonSPAPIClient` (no live credential
  exists in this environment, so `mode: 'mock'`), and `pollSubmissionStatus`
  advances `submitted → under_amazon_review → live` (every 4th mock submission
  rejects with a realistic reason).
- `simulated: true` is REQUIRED on the record (and `simulated boolean NOT NULL`
  in migration 022), the UI labels it `(sim)` / “SIMULATED — no live retail
  call”, and the audit line says SIMULATED. No ASIN is invented for a mock
  result. No Amazon PO is generated. No live provider is contacted.

## 11. PERSISTENCE
- Writes mirror through the EXISTING D4 port (`persistCatalogSubmission`) —
  memory adapter by default, Supabase when credentials exist.
- `getCatalogPersistenceStatus()` reports `memory-only / durable:false` honestly;
  a failed write reports `failed` and is never claimed durable.
- Migration 022 is additive, RLS-enabled with a brand-isolation policy; it has
  NOT been executed (no browser Supabase credentials in this environment).
- Deliberate scope note: the legacy `products` table (003) uses a `uuid` primary
  key, incompatible with the canonical text ids the port uses. Forcing a product
  row through the port would have required either a destructive migration or a
  second product table — both prohibited — so persistence is scoped to the
  submission record, which is the artefact that owns the E3 lifecycle state.

## 12. RBAC / TENANT ISOLATION
Enforced IN THE DOMAIN by `CatalogActor` (optional tenant pin + `canMutate`):
- same tenant may read/submit/poll its own products and submissions;
- a foreign tenant is refused `CROSS_TENANT` on read, submit and poll;
- a view-only account (`canMutate:false`) is refused `FORBIDDEN` on submit/poll
  but may still read its own tenant (reads are not mutations);
- refused attempts mutate nothing (asserted);
- the brand UI additionally constructs its actor with `tenantId = session.tenantId`,
  and the admin scope (no pin) reads all tenants — the correct admin capability.
Evidence: validator J1–J5, K1–K4; browser test 3.

## 13. TESTS RUN (all executed this session)

| Gate | Command | Result |
|---|---|---|
| Typecheck | `npm run typecheck` | **0 errors** |
| Lint (incl. `rules-of-hooks` + `exhaustive-deps` = error) | `npm run lint` | **0 problems** |
| Build | `npm run build` | **PASS** (✓ built in 3.52s) |
| E3 validator | `node scripts/validate-e3-catalog.mjs` | **65/65 PASS** (`E3_CATALOG_VALIDATION_PASS`) |
| E3 browser spec | `npx playwright test e2e/catalog-product-management.spec.ts` | **4/4 PASS** |
| Full E2E | `npx playwright test` | **185 passed / 4 skipped / 0 failed** (2.7m) |
| Pre-existing validators (47) | `node scripts/validate-*.mjs` | **identical to baseline: DIFF COUNT 1 / 48**, the only difference being the new E3 validator |

Pre-existing baseline comparison used a clean `git worktree` at `b1f1ee4`
(`git worktree add /tmp/mercenta-e3-baseline HEAD`), removed afterwards. The 13
legacy failing validators (homepage-editor, review-s1/s3/s4/s5/s6, stage5/6/7/8/
15/16/25 and stage19/24/26 which throw) pre-date E3 and are unchanged.

## 14. EXACT TEST RESULTS
- E3 validator: 65 assertions — A0, A1–A5, B1–B4, C1–C5, D1–D2, E1–E2, F1–F5,
  G1–G5, H1–H4, I1, J1–J5, K1–K4, L1–L5, M1–M4, N1–N11, I2. All ✓, final line
  `E3_CATALOG_VALIDATION_PASS`.
- E3 browser spec: 4/4 ✓ — (1) incomplete → complete → ready → simulated submit
  → simulated processing → `Live (sim)`, with `pageErrors === []` and
  `externalCalls === []`; (2) a 4/5-document tenant is locked with no submit
  control; (3) tenant isolation (a different onboarded tenant sees 0 rows and
  none of the other tenant's state); (4) the admin catalogue shows the
  submission column and the inline readiness/submission detail.
- Full E2E delta: 181 → 185 passed (+4 new), 4 skipped unchanged, 0 failed.

## 15. BROWSER VERIFICATION
Real Chromium via Playwright against the running dev server — see §14 for the
four scenarios. This is **Playwright-driven verification, not a manual human
click-through.** No page errors were observed in the E3 flow.

## 16. NETWORK / LIVE-INTEGRATION STATUS
- The E3 validator and browser test both assert **zero external network calls**
  (the app's `fetch` is instrumented; the browser test filters only localhost,
  ws, static assets/fonts and the `picsum.photos` placeholder image host used by
  the fixtures).

## 17. REAL DEFECTS FOUND AND FIXED
1. **`submitCatalogItem` "persisted" to a table that does not exist.** It
   inserted `{brand_id, product_payload}` into `catalog_submissions`, but no
   migration (001–021) creates that table or that column — the write could never
   have run in any environment, and the returned tracking id was discarded, so
   no submission state was ever recorded. **Fixed**: persistence now goes through
   the D4 port and migration 022 defines the table.
2. **Brand-created products were invisible outside one tab.** `addProduct` pushed
   into React state only, so the admin catalogue never saw the product and the
   SKU-keyed submission seam could never be reached. **Fixed**: one write path to
   the canonical catalog store, with the session list re-read from it.
3. **The add-product form fabricated `0` for blank dimensions**
   (`parseFloat(x) || 0`), which made an empty product look COMPLETE to the
   submission prerequisites. **Fixed**: completeness is evaluated on the raw form
   values; save is disabled and the missing fields are listed.
4. **Three duplicate declarations of shared shapes.** `DemoProduct` re-declared
   all 20 `Product` fields; `SeedSubmission` was a narrower duplicate of the
   submission shape; the prerequisite field list was hardcoded inside `api.ts`.
   **Fixed**: `DemoProduct extends Product`, `SeedSubmission` aliases
   `ProductSubmission`, and `REQUIRED_SUBMISSION_FIELDS` has one definition.
5. **Compliance-gate input resolution was duplicated** in `isComplianceGateCleared`
   and `submitCatalogItem` (the same duplication that produced the historical
   argument-shift defect). **Fixed**: one `evaluateBrandCatalogGate`.
6. **A React `exhaustive-deps` error I introduced** in the admin catalogue was
   caught by the lint gate (rules enforced as errors) and fixed correctly by
   memoizing the query data rather than disabling the rule.

## 18. KNOWN LIMITATIONS
- **Nothing is durable in this environment.** Browser Supabase credentials are
  not configured, so the memory adapter is active, `durable:false` is reported,
  migration 022 is unexecuted, and a reload resets state (the existing demo
  contract).
- **Product-row persistence is intentionally not implemented** via the D4 port:
  the legacy `products` table uses a `uuid` primary key, incompatible with the
  canonical text ids; the alternative would have been a destructive migration or
  a second product table (both prohibited). The submission record carries the E3
  lifecycle state instead.
- **Seeded fixture submissions cannot be polled** — their `SEED-SIM-*` tracking
  ids do not exist in the mock provider world, so "Check result" on a fixture row
  returns an honest `unknown submissionId (mock)` error. Newly submitted products
  poll correctly. This is a truthful error, not a hidden failure.
- **Completeness prerequisites are exactly the 7 fields the seam always
  validated.** `name`/`sku`/price validity are deliberately NOT added to the
  readiness rule (no invention); the form supplies them.
- **Demo-brand activation still renders the tested dossier projection first**
  (reference-implementation parity preserved); the canonical store is the single
  WRITE path and the source for the projection after any mutation.
- **No manual human click-through** — browser verification is Playwright only.
- 13 legacy validators remain failing; they are pre-existing and unchanged.

## 19. WHAT REMAINS AFTER E3
E4 commerce / Amazon-style operational simulation · E5 admin operational surfaces
· E6 brand operational surfaces · E7 embedded Postiz · final UI/UX · final
regression · production preparation · **Rakazo LAST (Phase M)**.
Environment-dependent: real Supabase credentials + executing migration 022,
Edge Function deployment, Amazon SP-API credentials.

## 20. GIT COMMIT HASHES
- Pre-E3 HEAD (parent): `b1f1ee4`
- E3 implementation commit: recorded by the follow-up documentation commit
  (project convention: the phase commit lands first, then its verified hash is
  written into the docs — see PROJECT_STATUS.md).
- Protected baseline `959b4d2` verified still an ancestor of HEAD
  (`git merge-base --is-ancestor 959b4d2 HEAD` → OK).

## 21. REVIEW ZIP STATUS
Exported via the project's canonical script only:
`bash ~/Desktop/Mercenta/scripts/export-review-zip.sh` →
`~/Desktop/Mercenta/Review Zip/mercenta-review.zip`. No numbered zip files were
created anywhere.

## 22. FULL PROJECT STATUS / ROADMAP POSITION
**Completed phases:** A (foundation, integration-mode/provider safety) · B (Brand
Intelligence real-data lifecycle) · C (BI → ICP → outreach → approval → send →
response → Opportunity → CRM) · D1 (Rocket.Chat removed) · D2 (BI intelligence
preservation) · D3 (outreach/provider hardening) · D4 (domain persistence
architecture) · E1 (Opportunity → canonical BrandOnboarding hand-off) · E2
(stateful Brand Onboarding) · **E3 (Catalog / Product Management) — THIS PHASE**.
**Current phase:** E3 — complete and verified at this checkpoint.
**Next phase:** **E4 — commerce / Amazon-style operational simulation** (do NOT
start in this session).
**Remaining platform work:** E4 · E5 admin operational surfaces · E6 brand
operational surfaces · E7 embedded Postiz · final UI/UX · final regression ·
production preparation · Rakazo (Phase M, LAST).
**Environment-dependent work:** browser Supabase credentials (durable
persistence, migration 022 + 020/021 execution, RLS runtime proof) · Edge
Function deployment · Amazon SP-API credentials (flips the catalog submission
seam from mock to live with zero code changes).
**Deliberately deferred work:** Rakazo · live Amazon/SP-API calls · public
marketplace wording · deploy to mercenta.co.uk (GO_LIVE.md playbook) · product-row
persistence via the legacy `uuid` table.

## 23. HARD STOP — E3 COMPLETE, NO E4 STARTED
E3 is built, verified, documented and committed. No E4, E5, E6, E7 or Rakazo work
was started. No live integration was introduced. No BI work, no UI redesign, no
mock brand, no duplicate store, no second database.

- `spApiConnectionCredentials()` returns `null` (no verified non-sandbox vault
  connection exists), so the factory selects the mock client — UNKNOWN never
  becomes LIVE, and a missing credential can never produce a fake success
  (submissions are labelled `simulated`).


  a second store.

