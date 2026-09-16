# PROJECT_STATUS.md
> Source of truth for current project state. Updated after every session.
>
> ---
> ## ✅ PHASE 1 — CORE GAP CLOSURE (2026-09-16, session: 0B.4 build queue)
>
> **HEAD `50668b9` (Phase 1 committed: `117b8d3` prior-state doc closeout →
> `fe47bf2` Phase 1 feature → `50668b9` artefacts refresh), branch
> `redesign/foundation`, protected baseline `959b4d2` ancestor. Full approved
> Option-A cohort executed and committed. Phase 2/3/4 NOT started.**
>
> **Reconciliation of the 0B.4 queue:**
> | 0B.4 # | Item | Status now |
> |---|---|---|
> | 1 | Amazon Ads dashboard surface (agreed §12) | **DONE** — `src/components/admin/AmazonAdsDashboard.tsx`, AdminShell `amazon_ads` nav + render, `scripts/validate-amazon-ads.mjs` (19 checks PASS), `e2e/amazon-ads-dashboard.spec.ts` (2 tests), requirements-registry 2 `amazon-ads` entries. Simulation-first consumer of the EXISTING `useAdSpendBudgets()` seam (0 consumers → consumed); per-brand budget/spend/remaining/ACOS/TACOS/status; honest simulated label; `advertising_commission` at £0 not invented; deterministic (no AI/network). Live path stays behind the `amazon_ads` credential seam. |
> | 2 | `docs/INTEGRATIONS.md` registry-count truth | **DONE** — 22 rows mirroring `INTEGRATION_ORDER` (was 18/14); root `MERCENTA_ARCHITECTURE.md` reconcilied 18 → 22. |
> | 3 | `BrandComm.tsx` slug SSOT drift | **DONE** — `brandInboxAddress` now delegates to canonical `normalizeBrandKey` (no second normalisation); Tapatío → `hello@tapatio.example`. Regression gate `scripts/validate-brandcomm-ssot.mjs` (9 checks PASS). |
> | 4 | `XeroConnection.tsx` dead duplicate | **DONE** — file DELETED (explicit session approval). Xero seam `src/services/xero/*` + `AccountingPanel.tsx` untouched. |
> | 5 | Platform AI FREE-only policy | **DONE** — `modelPolicy.ts` rewritten: no paid fallback, `isModelAllowed` free-only, non-free-sufficient tasks REFUSED; `validate-operating-costs.mjs` re-pinned (44 checks PASS); panel copy free-only. |
> | 6 | `requirements-registry.json` Amazon Ads | **DONE** — 2 `amazon-ads` entries, `_meta.total_entries` 142 → 144. |
> | 7 | BI discovery scheduler | **DECIDED (no code)** — declared **intentionally operator-triggered** per 0A.17.3 ("no scheduler exists and none is claimed"); the MarketingHub operator trigger already exists. No scheduler invented. |
> | 8 | §16–§29 embassy/trade pipeline | **DECIDED (no code)** — classification preserved: truthful prospective-route slots only (`PartnershipsCentre.tsx`); the §12–§15 Google generation leg remains CRED/F-ACTION (blocked on Google OAuth + Edge deploy), not invented. |
>
> **Brand Overview Dashboard + Brand Operational Dashboard** (two DISTINCT brand
> dashboards: Overview = UNDERSTAND / Operations = ACT) — preserved as explicit
> UI-redesign-phase requirements (post-core, pre-Rakazo). Brand Intelligence
> includes qualification — ICP/acquisition consumes the BI qualification output;
> no second qualification engine was created. One connected platform preserved
> (seams reused, no duplicate stores/CRM).
>
> **VERIFIED THIS SESSION:** `npx tsc --noEmit -p tsconfig.app.json` → 0 errors ·
> eslint on all touched files → 0 · `node scripts/validate-amazon-ads.mjs` →
> PASS 19 · `node scripts/validate-brandcomm-ssot.mjs` → PASS 9 ·
> `node scripts/validate-operating-costs.mjs` → PASS 44 ·
> `node scripts/verify-registry.mjs` → exits 0 (103 pre-existing informational
> flags unchanged; new `amazon-ads` entries clean). E2E `amazon-ads-dashboard`
> not yet run (pending the affected-spec run). Prod build not yet re-run.
>
> **NEXT (exact):** commit Phase 1 work → run affected E2E (amazon-ads-dashboard,
> integration-hub, operating-costs, app-shell/marketing) → Phase 2 bounded
> wiring reconciliation → Phase 3 FULL REGRESSION → Phase 4 checkpoint. Do NOT
> start Phase 2 before the Phase 1 commit is on the branch and the affected E2E
> are green. Do NOT touch Rakazo or the UI redesign.
>
> ---
> ## ✅ M13c PHASE D — RANKED FOUNDER COMMAND CENTRE QUEUE + VISIBLE WHY (2026-09-15, session 3)
>
> §27/§28 is now built **inside the existing command centre** — no second
> dashboard, no redesign, no CSS/layout/design-system change. The bands
> (NOW / TODAY / THIS WEEK) and the five category sections are the same surfaces
> the founder already had; they are now driven by an explicit ranked queue.
>
> **What exists now (all derived from stores that already existed):**
> | Piece | Where |
> |---|---|
> | 8 declared ranking factors with a max score each (`urgency`, `operational_risk`, `commercial_potential`, `po_potential`, `relationship_readiness`, `funding_relevance`, `founder_approval_required`, `next_action_available`) — declared ONCE so UI, validators and reports cannot disagree. | `src/lib/commandCentre/commandCentre.ts` (`COMMAND_FACTORS`) |
> | `commandWhy()` — builds each item's WHY from the value actually observed, then scores it. A factor is only listed when the store supports it; score = exact sum of the factor points. | same |
> | `rankQueue()` — ranks every action 1..N deterministically (score → declared band order → action id). Same objects are mutated, so bands and sections show the identical rank/WHY. | same |
> | The founder QUEUE: `queue` + `queueBasis` on the model, headings ordered by rank. | same |
> | Opportunities now come from the **canonical PO-potential ranking** (`rankOpportunities`), not a score sort, and carry their estimated PO potential + opportunity score as WHY factors (labelled estimates). | same |
> | **Relationship slots**: best embassy introduction route and best trade programme route, chosen deterministically by how many canonical prospects sit in that market / are tagged to that programme (tie-break = canonical target order). Both keep the "prospective route — no relationship exists" wording. | same |
> | **Investor slot**: honest — no investor target exists in the plan yet, so nothing is ranked; the item states the £250,000 plan figure, **0 committed**, and says to record the routes first. | same |
> | **Funding slots**: one item per real opportunity from the §10/§31 pipeline, using `fundingPipelineSummary()` for the "awaiting your approval" / "approved — record your submission" states and the pipeline's own canonical next action. The accelerator slot is the real Solo Founders Program route. Mercenta-submits-nothing wording retained. | same |
> | Rank + WHY rendered on each existing row (rank badge + `Why: <factor> <points> · … = <score>`), plus the declared ranking basis line. Existing text sizes/colours only. | `src/components/admin/CommandCentre.tsx` |
> | +16 checks appended to the **existing** validator (23 → 39). | `scripts/validate-command-centre.mjs` |
> | +1 browser test (3 → 4) proving every rendered row shows a rank and a WHY, that the basis says no AI is used, and that the funding-slots' CTA actually lands on the screen that performs it (no dead CTAs). | `e2e/command-centre.spec.ts` |
>
> **Honesty preserved:** no AI/model call anywhere in the ranking (pinned by the
> validator), no invented investor/partner/funding data, every estimate labelled,
> every CTA names a real destination (Super Admin tabs validated against the
> actual tab list).
>
> **VERIFIED THIS SESSION (real output):** `npx tsc --noEmit -p tsconfig.app.json`
> → 0 errors · eslint on both touched files → clean · `npm run build` → ✓ built in
> 3.89s · `node scripts/lint-wording.mjs` → PASS (218 files) ·
> `node scripts/validate-command-centre.mjs` → **PASS, 39 checks** ·
> `npx playwright test e2e/command-centre.spec.ts --workers=2` → **4 passed / 0
> failed** · `npx playwright test e2e/command-centre.spec.ts e2e/dashboard.spec.ts
> e2e/funding-pipeline.spec.ts --workers=2` → **17 passed / 0 failed** ·
> `node scripts/validate-funding-pipeline.mjs` → PASS (60 checks, unaffected).
>
> **NOT changed:** no new dashboard framework, no design-system change, Rakazo
> untouched, no feature added beyond §27/§28.
>
> **NEXT (this directive):** FINAL RECONCILIATION (bounded end-to-end wiring
> check) → FINAL REGRESSION (tsc / eslint / build / wording / validators / RLS /
> integrity / Playwright `--workers=2` / investor demo) → deploy the verified
> build to `demo.mercenta.co.uk` → then (and only then) Rakazo → security audit.
> ---
> ---
> ## 🧭 FINAL BUILD QUEUE (authoritative — the single list any continuation reads first)
>
> **`<0B-CORRECTS>` (2026-09-16): the corrected NEXT BUILD QUEUE is PHASE 0B §0B.4
> in this file. Amazon Ads dashboard is REQUIRED build item #1 (agreed §12,
> missing surface). The "Build status: COMPLETE" line below is correct for all
> previously-built feature rows EXCEPT the Amazon Ads dashboard surface, which
> is genuinely missing and is Phase-1 #1. Read 0B before executing this queue.**
>
> **Build status: COMPLETE (all previously-built feature phases; EXCEPT the
> Amazon Ads dashboard surface — see 0B.4 #1).** All feature phases are verified and MUST NOT be rebuilt
> (see COMPLETED below). The platform runs end-to-end in simulation/demo mode without
> credentials. What remains is the closing reconciliation + regression + deployment that
> *declared* the build complete. Security hardening and Rakazo are deliberately EXCLUDED
> — they come AFTER the build is declared complete (see DEFERRED).
>
> ### 1. FINAL RECONCILIATION — bounded end-to-end wiring check
> - **Objective:** confirm the full 25-stage investor/demo lifecycle + the §13 PO→shipment→invoice→payment→exception flow wire together with correct data flow and zero fabricated external actions.
> - **Seams to reuse:** existing simulation/Mock*Client adapters in `src/lib/*` (no real credentials).
> - **Components involved:** `e2e/investor-demo.spec.ts`, `scripts/validate-investor-demo.mjs`, Retail Pipeline commerce panel, brand onboarding/catalog surfaces, funding pipeline.
> - **Dependencies:** checkpoint `11d0c09` on `redesign/foundation`.
> - **Verification required:** `node scripts/validate-investor-demo.mjs` PASS (deterministic, zero-network — reset→run reproduces the SAME digest) + investor-demo e2e spec green.
> - **Mode:** simulation-only, zero credentials.
>
> ### 2. FULL REGRESSION — close the build as verified
> - **Objective:** confirm no regressions across the whole gate suite before deploy.
> - **Seams to reuse:** existing gate scripts (`validate-*.mjs`, `lint-wording.mjs`, `rls-audit.mjs`, `integrity-audit.mjs`) + Playwright.
> - **Components involved:** all 77 gate scripts; full Playwright suite; `tsc`/`eslint`/`npm run build`.
> - **Dependencies:** step 1 complete; regression baseline = M11 (250 passed / 2 skipped); current target 277 passed / 0 failed / 2 skipped.
> - **Verification required:** `tsc --noEmit` 0 errors · `eslint` 0 · `npm run build` ✓ · `lint-wording` PASS (218 files) · 77/77 gate scripts 0 failures · `integrity-audit` 61/61 · `rls-audit` PASS · full `npx playwright --workers=2` 0 failures; investor-demo spec green.
> - **Mode:** simulation-only, zero credentials.
>
> ### 3. DEPLOY / RE-VERIFY demo.mercenta.co.uk
> - **Objective:** deploy the verified build to the demo host and confirm the demo workflow is live without credentials.
> - **Seams to reuse:** `scripts/deploy-demo.sh` (Namecheap FTP; creds in `.env`/vault, never in source).
> - **Components involved:** `scripts/deploy-demo.sh`, `GO_LIVE.md`.
> - **Dependencies:** step 2 (regression) green.
> - **Verification required:** HTTPS `demo.mercenta.co.uk` → 200 · demo workflow exercises end-to-end in simulation.
> - **Mode:** credential-dependent (FOUNDER runs deploy / enters FTP creds) — NO source change.
>
> ### COMPLETED — DO NOT REBUILD
> Phases 8 (§21 Google), 9 (§22–25 Company/Gov), 10 (§27 cost dashboard),
> 11 (§32/§34 Super Admin), 14 (§37 docs), 15 (§38 full regression),
> M13c Phase C (false-submission fix), M13c Phase D (ranked command-centre queue + visible WHY)
> — all DONE and verified (tsc/eslint/build/wording/validators/e2e green). Also complete:
> M2→M10, Phase 12 investor-demo E2E, Phase E1–E8, Phase F, Phase G1.
>
> ### DEFERRED (NOT build work — comes after the build is declared complete)
> - **Security audit + credential cleanup:** rotate Twilio 2FA recovery code (lives in past git history); rotate Namecheap FTP password (only ever existed redacted in this doc); final review of secrets / ZIP exclusions / Git history / deployment config / integration boundaries; Supabase RLS hardening migration for `shipping_margins`, `audit_log`, `leads`, `integration_connections` (no `ENABLE ROW LEVEL SECURITY`); verify disabled Rakazo credentials cannot consume platform OpenRouter credits.
> - **Rakazo finalisation:** deliberately the FINAL phase (CORE PRODUCT FIRST, RAKAZO LAST). NOT invoked/modified/tested during build completion; handled after deploy.
> - **Founder credential/configuration work (not build):** (1) capture Tottenham merchandise ASIN evidence via existing Brand Intelligence; (2) enter in Super Admin — Google OAuth client id, Companies House API key + auth code, GOV.UK One Login personal code (HMRC once VAT registers); (3) deploy the Google Edge Function (code→token + Vault refresh) to flip Google `exchange_pending`→`connected`; (4) founder confirmation of real subscription/hosting prices in `src/config/operatingCosts.ts` + pricing-input approval.
> ---

> ## 🧭 FUNCTIONAL TRUTH MATRIX (authoritative per-area truth of what actually exists, established 2026-09-16)
> **⛳ SUPERSEDED AT FEATURE LEVEL by the PHASE 0A EXHAUSTIVE INVENTORY directly below** (2026-09-16);
> this 37-row matrix is preserved as the verified high-level summary and its evidence.
> All rows are classified from EXISTING verified evidence only (this session re-ran the full gate sweep → **74/75 PASS**, the one
> red being a working-tree scope guard caused solely by the user-reserved untracked design banner PNGs; the tracked tree at the last
> committed checkpoint was 75/75). No completed phase was rebuilt or re-audited. Tokens: **Y** yes · **PARTIAL** present but not
> fully wired · **SIM** truthful simulated/mock path · **LIVE** real path exists behind a credential · **F-ACTION** a founder
> Super-Admin action, not build work · **—** none/not applicable. Individual gate names and spec names for every row are in the
> "Evidence per row" section directly below the table.
>
> | # | Area | Required | Implemented | Fully wired | Simulated | Tested | E2E verified | Credential-dependent | Deferred | Genuinely missing |
> |---|---|---|---|---|---|---|---|---|---|---|
> | 1 | Brand onboarding | Y | Y | Y | SIM | Y | Y | — | — | — |
> | 2 | Product / catalog | Y | Y | Y | SIM import path | Y | Y | — | — | — |
> | 3 | Amazon / Vendor simulation | Y | Y | Y | SIM (SP-API mock; never claims live) | Y | Y | Amazon SP-API / Ads creds (Super Admin entry path exists) | LIVE Amazon until credentials entered | — |
> | 4 | Amazon / ASIN intelligence | Y | Y | PARTIAL | SIM (estimates labelled) | Y | Y | Keepa (price history) | LIVE Keepa | Tottenham ASIN evidence capture = F-ACTION (separate from fabricated data) |
> | 5 | Purchase Orders | Y | Y | Y | SIM POs flagged `(sim)` | Y | Y | — | — | — |
> | 6 | PO acknowledgement | Y | Y | Y | SIM | Y | Y | — | — | — |
> | 7 | PO → fulfilment | Y | Y | Y | SIM via ASN seam | Y | Y | DHL/Palletline lanes only for LIVE labels | LIVE carriers | — |
> | 8 | Shipment | Y | Y | Y | SIM (DHL/Palletline mock, PO-gated, commercial breakdown) | Y | Y | Carrier creds (founder, later) | LIVE carriers | — |
> | 9 | Receiving | Y | Y | Y | SIM (delivery reconciliation; shortage deductions auto-raised) | Y | Y | — | — | — |
> | 10 | Invoice | Y | Y | Y | SIM (issued-unpaid tracked honestly) | Y | Y | — | — | — |
> | 11 | Payment | Y | Y | Y | SIM (deterministic payment ↔ PO ↔ invoice reconciliation) | Y | Y | Stripe LIVE later | LIVE Stripe | — |
> | 12 | Chargebacks / exceptions / cases | Y | Y | Y | SIM (deductions ledger, disputes, brand case→escalation) | Y | Y | — | — | — |
> | 13 | Finance / accounting | Y | Y | Y | SIM (Xero demo seam; VAT = `configuration_required`, never invented) | Y | Y | Xero connect for LIVE | LIVE Xero / real cost prices | Founder confirmation of real prices |
> | 14 | Brand Intelligence | Y | Y | Y | SIM + real-data model (fact vs potential vs estimated vs verified vs confirmed) | Y | Y | — | — | — |
> | 15 | Opportunity Discovery | Y | Y | Y | SIM (8 verticals; no fabricated evidence) | Y | Y | Firecrawl LIVE for live research | LIVE Firecrawl | — |
> | 16 | ICP / acquisition | Y | Y | Y | SIM (ICP projection, deterministic re-boot) | Y | Y | — | — | — |
> | 17 | Prospecting / leads | Y | Y | Y | SIM (CSV / verified lead sourcing) | Y | Y | Hunter LIVE enrichment | LIVE Hunter | — |
> | 18 | CRM | Y | Y | Y | SIM (tenant-scoped, activity, pipeline) | Y | Y | — | — | — |
> | 19 | Outreach | Y | Y | Y | SIM (never claims sent unless provider confirms) | Y | Y | Postmark / Hunter / Instantly creds for LIVE send | LIVE sending | — |
> | 20 | Funding (founder pipeline) | Y | Y | Y | SIM approval-gated stage machine | Y | Y | — | — | — |
> | 21 | Grants | Y | Y | Y | SIM (internal approval ≠ external submission; submission record founder-gated) | Y | Y | — | — | — |
> | 22 | Investors | Y | Y | Y | SIM (honest "£250k plan, 0 committed"; no invented investors) | Y | Y | — | — | — |
> | 23 | Company / Government Control Centre | Y | Y | Y | SIM (company profile, officers, PSC, filings, charges, deadlines; CS workflow Detect→Prepare→Notify→Review→Approve→File→Verify) | Y | Y | — | — | — |
> | 24 | Companies House | Y | Y | Y | SIM mock first | Y | Y | CH API key + auth code (F-ACTION, vault-masked refs only) | LIVE reads; auto-file permanently REFUSED (founder-approval-gated); manual register path works | — |
> | 25 | GOV.UK One Login | Y | Y | PARTIAL | SIM descriptor | Y | Y | personal code (F-ACTION, masked; never a password) | LIVE connect | — |
> | 26 | HMRC | Y | PARTIAL (seam) | N (not connected) | SIM descriptors only | Y | Y | VAT registration first (F-ACTION) | **DEFERRED until VAT registers** — never pretends live | — |
> | 27 | Google Workspace | Y | Y | PARTIAL (awaiting connect) | SIM (Mock-GD ids, idempotent) | Y | Y | OAuth client id + Edge Function deploy (F-ACTION) | LIVE connect; `exchange_pending` ≠ `connected` is enforced truthfully | — |
> | 28 | Google Drive / Docs / Sheets / Slides | Y | Y | PARTIAL (awaiting Google connect) | SIM capability tests | Y | Y | same Google OAuth + Edge deploy (F-ACTION) | LIVE on connect | — |
> | 29 | Super Admin | Y | Y | Y | SIM surfaces | Y | Y | — | — | — |
> | 30 | Integrations (registry SSOT) | Y | Y | Y | SIM defaults per provider | Y | Y | per-provider creds | LIVE per provider | — |
> | 31 | Command Centre | Y | Y | Y | Y (ranked queue + WHY, no AI/model call) | Y | Y | — | — | — |
> | 32 | Operating costs / AI cost | Y | Y | Y | Y (usage log + dashboards) | Y | Y | — | real prices = F-ACTION | — |
> | 33 | Platform AI (runtime AI) | Y | Y | Y | Y (deterministic-first; 2 gated call sites) | Y | Y | dedicated Mercenta OpenRouter key (Super Admin entry; in-memory; never hardcoded) | LIVE LLM | — |
> | 34 | Launch Centre | Y | Y | Y | Y (Prepare ≠ Submitted enforced) | Y | Y | — | — | — |
> | 35 | Investor / demo lifecycle | Y | Y | Y | Y (25 stages, deterministic, 0 network) | Y | Y | — | — | — |
> | 36 | Rakazo | Y (final phase) | PARTIAL (iframe registration only) | N (fleet not integrated) | N/A | Y (registration spec only) | Y (registration spec only) | — | **DEFERRED — deliberately the LAST functional phase** | full 17-bot fleet integration (after build+deploy+UI redesign) |
> | 37 | UI/UX | Y (eventual redesign) | Y (current frozen design) | Y | N/A | Y | Y | — | REDESIGN is phased AFTER core build is declared complete | redesign itself (Apple + Twenty/ERPNext direction, light/dark, no functionality loss) |
> ### Evidence per row (gate → result; re-run/verified this session where not a live-credential item)
> 1–2 Brand onboarding / catalog — `validate-onboarding-workflow` PASS · `validate-onboarding-handoff` PASS · `validate-e3-catalog` PASS · `validate-csv-import` PASS · e2e `onboarding`, `onboarding-workflow`, `onboarding-handoff`, `catalog-product-management` (inside the documented full suite **280 passed / 0 failed / 2 skipped**).
> 3 Amazon/Vendor simulation — `validate-mock-providers` PASS · `validate-e4-commerce` PASS · e2e `commerce-operational-simulation`, `simulation-control`, `status-semantics` (full suite green). Simulated POs carry an honest `(sim)` marker; no live claim.
> 4 Amazon/ASIN intelligence — `validate-sales-estimator` PASS · e2e `sales-estimator`, `brand-intelligence-lifecycle` (full suite green). Estimates are labelled; Tottenham ASINs are founder-captured evidence, not system data.
> 5–10 PO → ack → fulfilment → shipment → receiving → invoice — `src/lib/commerce/commerceLifecycle.ts` (fulfil via ASN → receive via `reconcileDelivery`, shortage deductions auto-raised) · `validate-e4-commerce` PASS · `validate-provider-workflows` PASS · e2e `po-lifecycle`, `shipment-asn`, `fulfillment-tracks`, `billing`, `commercial-model` (full suite green).
> 11–13 Payment / chargebacks / exceptions / finance — `validate-financial-reconciliation` PASS · `validate-payouts` PASS · `validate-commercial-models` PASS · e2e `deductions`, `disputes`, `xero`, `brand-payouts` (full suite green). VAT stays `configuration_required`.
> 14–16 Brand Intelligence / Discovery / ICP — `validate-bi-lifecycle` PASS · `validate-bi-intelligence-preservation` PASS · `validate-intelligence-strategy` PASS · `validate-discovery` PASS · `validate-opportunity-discovery` PASS (8 verticals; no fabricated evidence) · e2e `brand-intelligence-lifecycle`, `bi-intelligence-preservation`, `opportunity-discovery` 3/3.
> 17–19 Prospecting / CRM / Outreach — `validate-prospect-pipeline` PASS · `validate-acquisition-pipeline` PASS · `validate-outreach-provider-hardening` PASS · e2e `acquisition-pipeline`, `crm` 6/6, `outreach-provider-hardening` (full suite green). No "sent" claim without provider confirmation.
> 20–22 Funding / Grants / Investors — `validate-funding-pipeline` PASS (60 checks) · e2e `funding-pipeline` 3/3 and combined founder-centre run 17/0 · `validate-founder-centre` PASS · the 3 real opportunities (Solo Founders / The Bridge / Ignyte) carry source + claim class; no fabricated external submission.
> 23–26 Company / CH / GOV.UK / HMRC — `validate-company-control-centre` PASS (49 checks) · e2e `company-control-centre` 4/4 · CH mock invents nothing; auto-file REFUSED; HMRC deferred. Credentials are vault-masked refs only.
> 27–28 Google — `validate-google-integration` PASS (42 checks) · e2e `google-setup` 3/3 · `exchange_pending` ≠ `connected` (Edge Function exchange/deploy is the founder step) · workspace runner covers Drive + Docs + Sheets + Slides dependency order.
> 29–30 Super Admin / Integrations — `validate-mock-seam` PASS · `verify-registry` PASS · e2e `integration-hub`, `access-gate` 6/6, `multi-tenant` (full suite green) · RBAC refusal works; INTEGRATION_ORDER / INTEGRATION_META are the registry SSOT.
> 31–32 Command Centre / costs — `validate-command-centre` PASS (39 checks) · e2e `command-centre` 4/4 (rank + WHY on every row; no AI used) · `validate-operating-costs` PASS (43 checks) · e2e `operating-costs` 3/3 → AI-cost protection + usage log live.
> 33 Platform AI — `modelPolicy.ts` (MAX paid = DeepSeek V4 Flash; FREE tier; deterministic-first; unknown task ⇒ REFUSED) + `usageLog.ts` (ceilings; `handled_without_model` vs `refused_budget` vs `cache_hit`) + exactly two call sites (`engine.ts`, `alertTriage.ts`), both authorised first. Key entered ONLY via Super Admin Integrations hub (in-memory map, never persisted/hardcoded); demo auto-connect reads `VITE_OPENROUTER_API_KEY` env and never writes it anywhere. $0 dashboard usage is CONSISTENT with the policy (no demo task needs a model call).
> 34–35 Launch / demo — `validate-launch-centre` PASS · e2e `launch-centre` 3/3 (Prepare ≠ Submitted) · `validate-investor-demo` **PASS** (25 stages: application→approval→onboarding→commercial_models→compliance→catalogue→purchase_order→acknowledgement→fulfilment→shipment→shipping_commercial→delivery→returns→deductions→dispute→commission→payout→crm→marketing→integrations→cases→social→rbac→audit→error_recovery; deterministic replay, 0 network) · e2e `investor-demo` 10/10.
> 36 Rakazo — NOT invoked/modified this session; only the iframe registration exists (e2e `rakazo`); fleet = deferred final phase per the agreed order.
> 37 UI/UX — current design is FROZEN (`.clinerules/protection-rules.md`) and passes responsive/design gates (e2e `design-system`, `table-responsive`, `app-shell`); the Apple-influenced / Twenty / ERPNext-quality redesign is phased strictly AFTER core build completion. The 3 untracked `design/*.png` banners are reserved for that later phase (uncommitted and untouched).
> ### Aggregate verification THIS SESSION (2026-09-16)
> - `git merge-base --is-ancestor 959b4d2 HEAD` → **YES** (protected baseline preserved).
> - Validator/audit sweep: **74/75 PASS**; the 1 red = `validate-e6-brand-surfaces.mjs` F6 working-tree scope guard, red ONLY because of the 3 reserved untracked `design/*.png` files (documented, user-approved consequence of reserving redesign assets; the same sweep was 75/75 at the last clean-tree checkpoint). **No functional check fails.**
> - Full-suite E2E record (already verified at the last committed checkpoint; the code tree is unchanged since): **280 passed / 0 failed / 2 skipped** (`--workers=2`).
> - `tsc` / `eslint` / `build` and a bounded core E2E re-run are reported in the phase report below.
>
> ### Result of the reconciliation — genuinely incomplete vs deferred
> - **Genuinely missing build work:** NONE found in the agreed core scope. `<0B-CORRECTS>` **CORRECTED BY PHASE 0B (0B.1/0B.4):** the **Amazon Ads dashboard surface** is genuinely missing (REQUIRED, agreed §12) and is now Phase-1 build item #1 — the "NONE found" claim was wrong for that one agreed surface. Remaining closing sequence: (A) bounded end-to-end wiring reconciliation, (B) full regression, (C) deploy to demo.mercenta.co.uk.
> - **Implemented but not fully wired:** Google LIVE connect (waits on OAuth client id + Edge Function deploy — founder), Companies House LIVE reads (waits on CH credentials — founder), GOV.UK personal-code connect (founder), HMRC (waits on VAT registration — founder).
> - **Simulated by design (mock-first):** Amazon SP-API/Vendor, carriers (DHL/Palletline), Xero, Keepa, Hunter, Firecrawl, Postmark, outreach senders, e-sign, WhatsApp.
> - **Intentionally deferred:** Rakazo (LAST), UI/UX redesign (after core complete), security/credential rotations + RLS hardening (after build + deploy + UI + Rakazo), real cost prices (founder).
> - **Founder actions (not build):** Google OAuth client id + Edge Function deploy, CH API key + auth code, GOV.UK One Login personal code, HMRC once VAT registers, real hosting/subscription prices, Tottenham ASIN evidence capture, Twilio + Namecheap credential rotations.
>
> ## ✅ M13c PHASE C — LEGACY FALSE-SUBMISSION STATE FIXED AT THE ROOT (2026-09-15, session 3)
>
> **Checkpoint verified before any edit (read-only):** branch `redesign/foundation`,
> HEAD `883652d` (one commit past the directive's stated `f2a7434` — the §10/§31
> funding-pipeline commit), protected baseline `959b4d2` confirmed an ancestor,
> `git status --short` → **clean**. No repository-wide audit was performed; work
> started from this file and `HANDOFF.md`.
>
> **THE DEFECT:** `src/lib/grants/researchEngine.ts` wrote `status: 'submitted'`
> (`approveGrantDraft`) and `status: 'sent'` (`approveInvestorDraft`) onto its
> stored drafts with **no external submission occurring** and no approval gate —
> state that any surface could read as an external event Mercenta performed.
>
> **THE FIX** (uses the §31 `fundingPipeline` approval model as the architectural
> precedent — internal approval is a different thing from external submission):
> | Change | File |
> |---|---|
> | `GrantApplicationDraft.status` / `InvestorOutreachDraft.status` are now `'draft' \| 'approved_internally'`. The `submitted` and `sent` values **no longer exist**, so nothing can compile against them. | `src/types.ts` |
> | `submittedAt` / `submittedBy` / `sentAt` / `sentBy` renamed to `approvedAt` / `approvedBy` — an internal approval, not an external event. | `src/types.ts` |
> | `approveGrantDraft` / `approveInvestorDraft` record **INTERNAL approval only**, with the approver's identity, and are fail-closed: an approval that names nobody is refused. | `src/lib/grants/researchEngine.ts` |
> | A separate `submission` record plus `recordGrantSubmission` / `recordInvestorSubmission` is the **ONLY** path that can represent an external submission (the founder's own reference). Mirrors `recordFundingSubmission`: refused without explicit confirmation, without a prior internal approval, without a reference, or on a duplicate. | `src/lib/grants/researchEngine.ts` |
> | Declared facts `DRAFT_SUBMISSION_IS_A_FOUNDER_ACTION` + `DRAFT_INTERNAL_APPROVAL_DISCLAIMER` for the UI/validators. | `src/lib/grants/researchEngine.ts` |
> | 17 new deterministic checks appended to the **existing** validator (no duplicate validation infrastructure was created). | `scripts/validate-funding-pipeline.mjs` |
>
> **UI preserved (no redesign, no layout/styling change):** the drafts table
> renders the same way; the labels now derive from the renamed states
> (`internally approved — NOT submitted externally` / `— NOT sent externally`).
> The only visible copy changes are the two `Approve & Send` buttons and the one
> sentence naming that action — both stated "Send" for an action that sends
> nothing, so they now read **`Approve internally`**. Reported here rather than
> changed silently (the honesty rule this phase exists to enforce).
>
> **VERIFIED THIS SESSION (real output, run in this session):**
> | Gate | Result |
> |---|---|
> | `npx tsc --noEmit -p tsconfig.app.json` | **0 errors** |
> | `eslint` on the 3 touched files | **clean** |
> | `npm run build` | **✓ built in 4.22s** |
> | `node scripts/lint-wording.mjs` | **PASS — 218 files, 0 violations** |
> | `node scripts/validate-funding-pipeline.mjs` | **PASS — 60 checks** (was 43; +17 new) |
> | `npx playwright test e2e/funding-pipeline.spec.ts --workers=2` | **3 passed / 0 failed** |
> | `git grep` for the legacy fields in the touched surface | **0 remaining references** to `submittedAt`/`submittedBy`/`sentAt`/`sentBy`/`'Approve & Send'` in `GrantsInvestorsSection.tsx` |
>
> **NOT changed:** the funding pipeline, the partnerships/fundraising data, the
> command centre, RBAC/RLS, the design system and every other completed phase.
>
> **NEXT (this directive):** PHASE D — ranked Founder Command Centre queue with an
> explicit WHY breakdown (extend `src/lib/commandCentre/commandCentre.ts`), then
> the final reconciliation, the bounded final regression and the demo deployment.

> ## ⛳ PHASE 0A — EXHAUSTIVE FEATURE/FUNCTION TRUTH INVENTORY (2026-09-16)
>
> **`<0B-CORRECTS>` — corrected by PHASE 0B below: the Amazon Ads classification.
> Phase 0A records the historical evidence; PHASE 0B (further below) is the
> authoritative corrected scope record where they conflict. Read 0B first.**
>
> **Read-only reconciliation run.** HEAD `91bc291` (`redesign/foundation`),
> protected baseline `959b4d2` verified as ancestor. **No source code changed.**
> This inventory SUPERSEDES the 37-row matrix above as the authoritative
> feature/function record while preserving the matrix's verified evidence. The
> browser E2E suite was NOT re-run this session (no browser); live-session gate
> evidence is deterministic and shown below.
>
> **Tokens** — **Y** yes · **PART** present, not fully wired · **NO** absent ·
> **SIM** truthful simulated/mock path · **LIVE** real path behind a credential ·
> **CRED** live requires a credential · **F-ACTION** founder Super-Admin action,
> not build work · **DEF** intentionally deferred until after core · **MISSING**
> genuinely absent · **BROKEN** verified defect.
>
> **Gate evidence re-run THIS session (real output):** `tsc --noEmit` **0 errors**
> · `npm run build` **✓ 3.28s** · `lint-wording` **PASS (218 files)** · **72
> `scripts/validate-*.mjs` → 71 PASS / 1 FAIL** (the red is
> `validate-e6-brand-surfaces` **F6 working-tree scope guard**, caused solely by
> the 3 user-reserved untracked `design/` PNGs — pre-existing, documented in the
> matrix header, NOT a product defect) · `verify-registry.mjs` **EXIT 0** ·
> `integrity-audit.mjs` **61/61 PASS** · `rls-audit.mjs` **PASS (33 tables, 94
> checks)** · `validate-investor-demo.mjs` **PASS (deterministic, zero network)**
> · Full Playwright evidence = documented **280 passed / 0 failed / 2 skipped**
> at checkpoint `91bc291`.
>
> ### 0A.1 EXECUTIVE TRUTH SUMMARY
> 1. Every one of the 37 broad matrix areas resolves to real code, validators and
>    specs at feature level — none is matrix-only or merely a rendered screen.
> 2. **Commerce chain — ONE connected lifecycle:** brand product/catalog →
>    compliance gate → PO → acknowledgement → fulfilment/ASN → shipment → delivery/
>    receiving → invoice → payment → deductions/chargebacks → exceptions → finance,
>    all through `src/lib/commerce/commerceLifecycle.ts` +
>    `src/lib/finance/financialReconciliation.ts` (+ catalog/onboarding/billing),
>    proven by the 25-stage investor demo (zero network, replay-stable digest) and
>    the E4 validator/specs.
> 3. **Acquisition chain — ONE connected flow:** brand discovery → Brand
>    Intelligence → Opportunity Discovery → ICP → prospect → contact → CRM →
>    outreach → response → opportunity → brand onboarding (`src/lib/acquisition/*`,
>    `src/lib/intelligence/*`, prospect/acquisition stores), proven by
>    `validate-acquisition-pipeline.mjs` (`networkCalls === 0`) and 3 browser specs.
> 4. **Founder chain — connected:** opportunities → funding/investors → founder
>    approval gate → applications → Company/Google/Launch support → Command Centre
>    ranked queue with WHY and tab-aware CTAs (no AI, no fabricated external action).
> 5. **22 provider registrations** in `INTEGRATION_ORDER` — every external provider
>    resolves authoritatively, all have a mock/live seam or an explicit state, and
>    no simulated operation is ever presented as live.
> 6. Feature-level **PART** items exist (not missing): Google await-connect, CH
>    live reads (F-ACTION creds), GOV.UK One Login (descriptor only), HMRC seam
>    (DEF till VAT), Amazon SP-API/Ads live (CRED), Keepa/Firecrawl/Hunter/
>    Instantly/Postmark live (CRED), **Amazon Ads dashboard (card only)**, BI
>    discovery scheduler (none, not claimed), campaign-health/performance stats
>    (seeded). `<0B-CORRECTS>` → Amazon Ads dashboard is REQUIRED missing build work (0B.1); the rest of this list is accurate.
> 7. Credential-free platform truth: **investor demo + brand simulated workflow
>    both run end-to-end with ZERO credentials**; the demo REFUSES any
>    non-simulation provider state.
> 8. **No genuine BROKEN defect found this session** (read-only); the only red
>    gate is the documented untracked-PNG guard.
> ### 0A.2 EXHAUSTIVE FEATURE/FUNCTION MATRIX
> Columns: **Req** required · **Impl** implemented · **Wired** fully wired ·
> **Sim** simulated · **Live** real path · **Test** validated/regressed ·
> **E2E** browser-verified (documented at 91bc291 unless noted) · **Evidence**.
>
> **A. BRAND / BRAND PORTAL**
> | Function | Req | Impl | Wired | Sim/Live | Test/E2E | Evidence |
> |---|---|---|---|---|---|---|
> | Public application / access gate (website+IG+FB link verify, operator decision) | Y | Y | Y | SIM | Y/Y | `applicationStore.ts`, `PartnerApplicationForm.tsx`, e2e `access-gate` |
> | Brand onboarding wizard (profile→legal→banking→track→agreements→guidance; mandatory §4.1+§4.2 agreements; hand-off from approved application + manual brand) | Y | Y | Y | SIM | Y/Y | `onboardingLifecycle.ts`, `validate-onboarding-workflow/handoff`, e2e `onboarding*` |
> | Commercial relationship chosen at onboarding (Model A commission / Model B buy-resell; fail-closed; per-brand SSOT) | Y | Y | Y | SIM | Y/Y | `commercialModel.ts`, `validate-commercial-model-selection`, e2e `commercial-model` |
> | Brand account/profile + read-only Commercial Relationship (Settings) | Y | Y | Y | N/A | Y/Y | `BrandSettings.tsx` |
> | Brand dashboard (clickable cards → drill-down) | Y | Y | Y | SIM data | Y/Y | `BrandDashboard.tsx`, e2e `brand-operational-surfaces` |
> | Brand navigation (15 items, tenant-scoped) | Y | Y | Y | N/A | Y/Y | `BrandShell.tsx`, e2e `brand-operational-surfaces` F8 |
> | Product catalog: create/edit, CSV import, images (white-bg), submission, status | Y | Y | Y | SIM import | Y/Y | `ProductCatalog.tsx`, `catalogLifecycle.ts`, `CsvCatalogImport.tsx`, `validate-csv-import`, e2e `catalog-product-management` |
> | PO visibility + acknowledgement (line-level, 24h deadline countdown) | Y | Y | Y | SIM (sim PO marker) | Y/Y | `BrandPurchaseOrders.tsx`, `commerceLifecycle.ts`, e2e `po-lifecycle` |
> | Fulfilment / ASN / shipment milestone visibility (brand) | Y | Y | Y | SIM | Y/Y | `LogisticsHub.tsx`, `shipment-asn.spec` |
> | Receiving / delivery reconciliation visibility | Y | Y | Y | SIM | Y/Y | `delivery` stage of `commerceLifecycle`, `reconcileDelivery` |
> | Returns (brand) | Y | Y | Y | SIM | Y/Y | `BrandReturns.tsx`, `returnsTracking.ts` |
> | Deductions ledger (brand) | Y | Y | Y | SIM | Y/Y | `DeductionsLedger.tsx`, e2e `deductions` |
> | Invoice / payment / payout visibility (brand) | Y | Y | Y | SIM | Y/Y | `brand-payouts.spec`, `BrandReports.tsx` |
> | UK Compliance hub + document upload + expiry tracking | Y | Y | Y | SIM | Y/Y | `ComplianceHub.tsx`, `compliance-sim.spec` |
> | Contracts view | Y | Y | Y | SIM | Y/Y | `BrandContractView.tsx`, `legal-agreements.spec` |
> | Analytics / Market Intel / Reports | Y | Y | Y | SIM (labelled estimates) | Y/Y | `SalesAnalytics.tsx`, `sales-estimator.spec` |
> | Documents & Account / Support & Team / chat / ticketing | Y | Y | Y | SIM | Y/Y | `BrandTeamMessages.tsx`, helpdesk |
> | Brand notifications (cross-role, click→view) | Y | Y | Y | SIM | Y/Y | `NotificationCenter.tsx`, `notifications.spec` |
> | Mercenta Social brand workspace (entitlement gate, tenant isolation) | Y | Y | Y | SIM zero-network | Y/Y | `src/lib/social/*`, e2e `embedded-social` |
> | Onboarding tours (self-hosted; step anchoring; dismissal) | Y | Y | Y | N/A | Y/Y | `TourEngine.tsx`, `tourDefinitions.ts` |
> | Tenant isolation (domain-enforced, cross-tenant refused) | Y | Y | Y | N/A | Y/Y | e2e `multi-tenant`, E-refusals in `validate-e6` |
> **B. PRODUCT / CATALOGUE**
> | Function | Req | Impl | Wired | Sim/Live | Test/E2E | Evidence |
> |---|---|---|---|---|---|---|
> | Product creation/editing (canonical fields, ex-works price, commodity code) | Y | Y | Y | N/A | Y/Y | `catalogLifecycle.ts`, `ProductCatalog.tsx` |
> | CSV / bulk import with per-line errors | Y | Y | Y | SIM import | Y/Y | `CsvCatalogImport.tsx`, `validate-csv-import` |
> | Completeness validation (readiness rules) | Y | Y | Y | N/A | Y/Y | `productCompleteness.ts` |
> | Compliance-gate gating (catalog blocked until docs approved) | Y | Y | Y | N/A | Y/Y | `evaluateCatalogReadiness`, `compliance-gate.spec` |
> | Submission → poll (Vendor-style review status) | Y | Y | Y | SIM | Y/Y | `submitCatalogProduct`, `pollCatalogSubmission` |
> | Product images + white-bg validation | Y | Y | Y | N/A | Y/Y | `productImageValidator.ts` |
> | Product↔brand relationship (tenant-scoped) | Y | Y | Y | N/A | Y/Y | demoStore, `multi-tenant` |
> | Product→ASIN relationship (candidate ASINs on product via BI) | Y | Y | PART | SIM | Y/Y | ASIN fields in BI, `amazonWording.ts` |
> | Product→PO relationship (PO raised from eligible SKU; `originProductId`) | Y | Y | Y | SIM | Y/Y | `createCommercePurchaseOrder` |
>
> **C. AMAZON / VENDOR CENTRAL**
> | Function | Req | Impl | Wired | Sim/Live | Test/E2E | Evidence |
> |---|---|---|---|---|---|---|
> | Vendor-Central-style simulation (PO semantics: line ack, 24h, freight windows, rejection codes) | Y | Y | Y | SIM | Y/Y | `compliance.ts` PO logic, `status-semantics.spec` |
> | PO generation (received→under_review; simulated `(sim)` marker) | Y | Y | Y | SIM | Y/Y | `createCommercePurchaseOrder`, `validate-mock-providers` |
> | PO lifecycle transitions (accepted/rejected/ready_to_fulfil/shipped/delivered) | Y | Y | Y | SIM | Y/Y | `commerceLifecycle.ts`, `po-lifecycle.spec` |
> | PO acknowledgement semantics (line-level, backordered, 24h, duplicates refused) | Y | Y | Y | SIM | Y/Y | `acknowledgeCommercePurchaseOrder` |
> | Amazon-facing product workflow (submission/poll readiness) | Y | Y | Y | SIM | Y/Y | catalog submission seam |
> | SP-API integration seam (client/mock/factory; non-mock secret gates live) | Y | Y | Y | SIM→LIVE(CRED) | Y/Y | `src/lib/spapi/*`, `connections.ts` |
> | Amazon Ads seam | Y | Y | **PART (card only)** | N/A | N/N | `INTEGRATION_REGISTRY.amazon_ads`; **no ads dashboard surface exists** `<0B-CORRECTS>` → REQUIRED, dashboard missing (0B.1, AV-08) |
> | ASIN relationships / Amazon product intelligence | Y | Y | PART | SIM (+CRED Keepa) | Y/Y | `keepaClient.ts`, `salesEstimator.ts` |
> | Amazon demand/opportunity analysis | Y | Y | Y | SIM labelled | Y/Y | `opportunityDiscovery.ts`, `sales-estimator.spec` |
> | Simulation-vs-live state handling (never claims live) | Y | Y | Y | SIM | Y/Y | `defaultIntegrationMode`, `status-semantics.spec` |
> | Future live transition behaviour (credential swap only, zero code change) | Y | Y | Y | N/A | Y/Y | `PRODUCTION_READINESS.md`, `GO_LIVE.md` §4 |
>
> **D. OPPORTUNITY DISCOVERY / INTELLIGENCE SUMMARY** (full detail in 0A.5)
> | Function | Req | Impl | Wired | Sim/Live | Test/E2E | Evidence |
> |---|---|---|---|---|---|---|
> | Discovery runs (operator-triggered; real-brand universe; claim classes) | Y | Y | Y | SIM providers | Y/Y | `prospectLifecycle.runBrandIntelligence`, `validate-bi-lifecycle` |
> | Sales estimator (estimate from registered providers; simulated basis, labelled) | Y | Y | Y | SIM labelled | Y/Y | `salesEstimator.ts`, `validate-sales-estimator` |
> | Opportunity Discovery engine (8 verticals, fail-closed category gate, PO-potential formula, ranked) | Y | Y | Y | SIM | Y/Y | `opportunityDiscovery.ts`, `validate-opportunity-discovery`, e2e `opportunity-discovery` |
> | ICP projection + acquisition strategy (UK + global→UK; trade programmes) | Y | Y | Y | SIM (estimate basis) | Y/Y | `acquisitionStrategy.ts`, `validate-discovery` |
>
> **E. CRM / ACQUISITION SUMMARY** (full detail in 0A.7)
> | Function | Req | Impl | Wired | Sim/Live | Test/E2E | Evidence |
> |---|---|---|---|---|---|---|
> | Prospect universe (canonical real-brand seeds; run/change/snapshot history) | Y | Y | Y | SIM providers | Y/Y | `prospectStore.ts`, `brandProspectSeed.ts`, `validate-bi-lifecycle` |
> | Prospecting / leads (CSV verified sourcing; Hunter live seam; contact discovery) | Y | Y | Y | SIM + CRED | Y/Y | `prospectPipeline.ts`, `leadSourcing.ts`, `validate-prospect-pipeline` |
> | CRM (companies/contacts/leads/opportunities, pipeline stages, activities, notes, tasks, timeline; tenant-scoped) | Y | Y | Y | SIM | Y/Y | `crmStore.ts`, `BrandCRM.tsx`, `BrandCrmDepth.tsx`, e2e `crm` 6/6 |
> | Outreach (prepare→modify→approve→reject→send; response→opportunity; NEVER claims sent without provider confirm) | Y | Y | Y | SIM transport | Y/Y | `outreachLifecycle.ts`, `outreachSender.ts`, `validate-acquisition-pipeline`, e2e `acquisition-pipeline` |
> | Acquisition pipeline (stage machine, ICP projection, speed-to-revenue estimate) | Y | Y | Y | SIM estimate | Y/Y | `acquisitionStrategy.ts`, `AcquisitionPipeline.tsx`, e2e `acquisition-pipeline` |
>
> **F. FUNDING / GRANTS / INVESTORS SUMMARY** (detail 0A.10)
> | Function | Req | Impl | Wired | Sim/Live | Test/E2E | Evidence |
> |---|---|---|---|---|---|---|
> | Founders funding pipeline (3 REAL §10 opportunities: Solo Founders, The Bridge, Ignyte by DIFC; §31 stage machine; founder-approval gate; submission requires founder ref) | Y | Y | Y | SIM approval | Y/Y | `fundingPipeline.ts`, `validate-funding-pipeline` 60 checks, e2e `funding-pipeline` 3/3 |
> | Grants/investor research + drafts (internal approval ≠ external submission; founder-gated submission records) | Y | Y | Y | SIM | Y/Y | `researchEngine.ts`, `dataSources.ts`, e2e `founder-investor-centre` |
> | Investor registry honesty (£250k plan, 0 committed) | Y | Y | Y | SIM | Y/Y | `founderContent.ts`, validate-command-centre |
>
> **G. COMMERCE / PO / FULFILMENT SUMMARY** (detail 0A.8)
> | Function | Req | Impl | Wired | Sim/Live | Test/E2E | Evidence |
> |---|---|---|---|---|---|---|
> | PO → acknowledgement → fulfilment/ASN → shipment (DHL/Palletline lanes) → delivery/receiving → invoice → payment → exception/chargeback → dispute/case — ONE lifecycle | Y | Y | Y | SIM | Y/Y | `commerceLifecycle.ts`, `financialReconciliation.ts`, `validate-e4-commerce`, e2e `po-lifecycle`, `fulfillment-tracks`, `shipment-asn` |
> | Carrier seams (DHL mock/real; Palletline mock/real; lane routing; commercial breakdown) | Y | Y | Y | SIM→LIVE(CRED) | Y/Y | `src/lib/dhl`, `src/lib/palletline`, `shipping/carrierRouting.ts` |
> | Receiving/shortage deductions (auto-raised on reconciliation) | Y | Y | Y | SIM | Y/Y | `receiveCommercePurchaseOrder`, `deductions.spec` |
>
> **H. FINANCE SUMMARY** (detail 0A.9)
> | Function | Req | Impl | Wired | Sim/Live | Test/E2E | Evidence |
> |---|---|---|---|---|---|---|
> | Payment↔PO↔invoice reconciliation; chargebacks/exceptions; VAT `configuration_required` (never invented) | Y | Y | Y | SIM | Y/Y | `financialReconciliation.ts`, `validate-financial-reconciliation`, e2e `xero` |
> | Payouts (Wise default / Payoneer secondary rail; mock/real; authorisation + audit; destination verify gate) | Y | Y | Y | SIM→LIVE(CRED) | Y/Y | `billing/payouts.ts`, `validate-payouts`, e2e `brand-payouts` |
> | Xero demo seam (real OAuth client; demo mode, 28-day resync) | Y | Y | Y | SIM demo→LIVE(CRED) | Y/Y | `src/services/xero/*`, e2e `xero` |
> **I. COMPANY / GOVERNMENT / GOOGLE SUMMARY** (detail 0A.11)
> | Function | Req | Impl | Wired | Sim/Live | Test/E2E | Evidence |
> |---|---|---|---|---|---|---|
> | Company Control Centre (registrar snapshot, deadlines 90/60/30/7/0, CS workflow Detect→Prepare→Notify→Review→Approve→File→Verify, founder-approval gate, manual-register path) | Y | Y | Y | SIM | Y/Y | `companyStore.ts`, `CompanyControlCentre.tsx`, `validate-company-control-centre` 49 checks, e2e 4/4 |
> | Companies House seam (reads: company/officers/PSC/filings/charges; mock invents nothing; electronic auto-file REFUSED) | Y | Y | Y | SIM→LIVE(CRED) | Y/Y | `companiesHouseClient.ts`/`companiesHouseMock.ts`, e2e `company-control-centre` |
> | GOV.UK One Login | Y | PART | PART | SIM descriptor | Y/Y | `src/config/company.ts`, Super Admin → Company |
> | HMRC seam (VAT status reads mock; filings refused; DEF until VAT registration) | Y | PART | NO | SIM | Y/Y | `hmrcClient.ts`/`hmrcMock.ts`, `HMRC_READINESS` `ready_not_connected` |
> | Google Workspace (setup wizard, Drive/Docs/Sheets/Slides plan runner, `exchange_pending` ≠ `connected`, OAuth client id + Edge function = F-ACTION) | Y | Y | PART | SIM→LIVE(CRED) | Y/Y | `google/*`, `GoogleSetupWizard.tsx`, `validate-google-integration` 42 checks, e2e `google-setup` 3/3 |
>
> **J. SUPER ADMIN / COMMAND CENTRE / LAUNCH CENTRE SUMMARY** (detail 0A.12)
> | Function | Req | Impl | Wired | Sim/Live | Test/E2E | Evidence |
> |---|---|---|---|---|---|---|
> | Super Admin (19 tabs incl. Accounting, Grants & Investors, Investor Pitch, Commercial Models, Launch, Company, Google, Operating Costs) | Y | Y | Y | SIM | Y/Y | `SuperAdminPanel.tsx`, e2e `admin-operational-surfaces` |
> | Command Centre (ranked queue, 8-factor WHY, bands NOW/TODAY/WEEK, tab-aware CTA routing, no AI) | Y | Y | Y | deterministic | Y/Y | `commandCentre.ts`, `CommandCentre.tsx`, `validate-command-centre` 39 checks, e2e 4/4 |
> | Launch Centre (14 platforms, Prepare ≠ Submitted enforced, copy package, verify checklist, audit) | Y | Y | Y | SIM | Y/Y | `launchStore.ts`, `launchPlatforms.ts`, `LaunchCentre.tsx`, `validate-launch-centre`, e2e 3/3 |
>
> **K. PLATFORM AI** (detail 0A.13)
> | Function | Req | Impl | Wired | Sim/Live | Test/E2E | Evidence |
> |---|---|---|---|---|---|---|
> | Runtime model policy (FREE models, deterministic→cache→local→free→paid-max, task-id gate, per-op budget) | Y | Y | Y | FREE only | Y/Y | `costs/modelPolicy.ts`, `costs/usageLog.ts`, `validate-operating-costs` |
> | Authorised runtime call sites (discovery research + alert triage; both route via policy) | Y | Y | Y | LIVE behind key (in-memory, never hardcoded) | Y/Y | `discovery/engine.ts`, `monitoring/alertTriage.ts` |
>
> **L. INTEGRATIONS REGISTRY SUMMARY** (detail 0A.4)
> | Function | Req | Impl | Wired | Sim/Live | Test/E2E | Evidence |
> |---|---|---|---|---|---|---|
> | Registry SSOT (`INTEGRATION_ORDER`/`INTEGRATION_META`, 22 providers), connect wizard, mode tiles, health, credential resolver, simulation defaults | Y | Y | Y | per-provider SIM/LIVE | Y/Y | `integrations/registry.ts`, `connections.ts`, `IntegrationsPanel.tsx`, e2e `integration-hub` |
> | Provider seams with mock/real adapters: SP-API, DHL, Palletline, Xero, CH, HMRC, Google, Stripe, Wise/Payoneer, Keepa, Firecrawl, Hunter, Instantly, Postmark(email), WhatsApp(Twilio), Postiz, esign(PandaDoc/DocuSign) | Y | Y | Y | SIM→LIVE(CRED) | Y/Y | `src/lib/*` client+mock pairs, `validate-mock-seam`, `validate-mock-providers` |
>
> **M. INVESTOR DEMO** (detail 0A.14) — 25 stages, deterministic, zero network, replay-stable digest, fail-closed to simulation — **Y/Y/Y/SIM/Y/Y** · `simulation/investorDemo.ts`, `validate-investor-demo`, e2e `investor-demo` 10/10.
>
> **N. OPERATING COSTS / AI SPEND** — 13 provider lines (MANUAL/ESTIMATED/SIMULATED/NOT CONNECTED labels; no live-billing claim; founder-approved price inputs) — **Y/Y/Y/SIM/Y/Y** · `config/operatingCosts.ts`, `costSummary.ts`, e2e `operating-costs`.
> ### 0A.3 PLATFORM INTEGRATION / DATA-FLOW MATRIX
> Edges judged: **exists?** (entities both exist) · **connected?** (data actually
> propagates) · **state propagated?** (state transitions flow) · **simulated
> correctly?** · **tested?** (validator/spec) · **E2E?** · **broken/missing?**
>
> **Flow 1 — Brand commercial chain (the core):**
> Brand → Product → ASIN → Amazon opportunity → PO → PO acknowledgement →
> Fulfilment → Shipment → Receiving → Invoice → Payment → Chargeback/Exception
> | Edge | exists | connected | propagated | sim correct | tested | E2E | broken/missing |
> |---|---|---|---|---|---|---|---|
> | brand → product/catalog | Y | Y | Y | Y | Y | Y | — |
> | product → ASIN | Y | Y | Y | Y | Y | Y | PART (ASIN is BI-captured evidence; SP-API live CRED) |
> | ASIN → Amazon opportunity | Y | Y | Y | Y | Y | Y | — |
> | Amazon opportunity → PO | Y | Y | Y | Y | Y | Y | — |
> | PO → acknowledgement | Y | Y | Y | Y | Y | Y | — |
> | ack → fulfilment | Y | Y | Y | Y | Y | Y | — |
> | fulfilment → shipment/ASN | Y | Y | Y | Y | Y | Y | live labels CRED |
> | shipment → receiving | Y | Y | Y | Y | Y | Y | — |
> | receiving → invoice | Y | Y | Y | Y | Y | Y | — |
> | invoice → payment | Y | Y | Y | Y | Y | Y | LIVE Stripe CRED |
> | payment → chargeback/exception | Y | Y | Y | Y | Y | Y | — |
> | exception → dispute → case | Y | Y | Y | Y | Y | Y | — |
> **Verdict: the commercial chain is ONE connected deterministic lifecycle (proven by the 25-stage demo + E4 gates); no edge is missing; live lanes are CRED/F-ACTION only.**
>
> **Flow 2 — Acquisition chain:**
> Brand discovery → Brand Intelligence → Opportunity → ICP → Prospect → Contact →
> CRM → Outreach → Acquisition → Brand onboarding
> | Edge | exists | connected | propagated | sim correct | tested | E2E | broken/missing |
> |---|---|---|---|---|---|---|---|
> | discovery → BI | Y | Y | Y | Y | Y | Y | — |
> | BI → Opportunity Discovery | Y | Y | Y | Y | Y | Y | — |
> | Opportunity → ICP | Y | Y | Y | Y | Y | Y | — |
> | ICP → Prospect | Y | Y | Y | Y | Y | Y | — |
> | Prospect → Contact | Y | Y | Y | Y | Y | Y | Hunter live CRED |
> | Contact → CRM | Y | Y | Y | Y | Y | Y | — |
> | CRM → Outreach | Y | Y | Y | Y | Y | Y | live send CRED |
> | Outreach → Acquisition/response → Opportunity | Y | Y | Y | Y | Y | Y | — |
> | Acquisition → brand onboarding | Y | Y | Y | Y | Y | Y | — (E1/E2 hand-off) |
> **Verdict: acquisition is ONE connected flow (Phase C/D2/D4); durable persistence is memory-only in the demo (D4 schema unexecuted) — the only PART here.**
>
> **Flow 3 — Founder chain:**
> Opportunity → Funding/Investor → Founder approval → Application →
> Company/Government/Google support → Command Centre
> | Edge | exists | connected | propagated | sim correct | tested | E2E | broken/missing |
> |---|---|---|---|---|---|---|---|
> | opportunity → funding/investor | Y | Y | Y | Y | Y | Y | — |
> | funding → founder approval gate | Y | Y | Y | Y | Y | Y | — |
> | approval → application record | Y | Y | Y | Y | Y | Y | — |
> | application → company/gov/google support | Y | Y | Y | Y | Y | Y | Google live CRED |
> | all → Command Centre rank+WHY+CTA | Y | Y | Y | Y | Y | Y | — (tab-aware routing) |
> **Verdict: connected; no fabricated external submission anywhere (founder-gated).**
>
> **Flow 4 — Operational events → Command Centre → Launch Centre → Investor Demo**
> | Edge | exists | connected | propagated | sim correct | tested | E2E | broken/missing |
> |---|---|---|---|---|---|---|---|
> | operational events → command centre | Y | Y | Y | Y | Y | Y | — |
> | command centre → launch centre CTA | Y | Y | Y | Y | Y | Y | — |
> | command centre → investor demo | Y | Y | Y | Y | Y | Y | — (integration stage) |
> | launch centre submit ≠ external | Y | Y | Y | Y | Y | Y | — |
>
> **Cross-cutting finding:** every claimed relationship above is implemented in
> shared stores / seams, not duplicated. The ONLY structural drift flagged:
> `src/components/shared/BrandComm.tsx` re-implements the brand inbox placeholder
> slug with a weaker regex than the canonical `demoStore` helper (pre-existing,
> tracked, out-of-scope for the phase; candidate fix in Phase 1).
> ### 0A.4 EVERY INTEGRATION RECONCILIATION
> **Registry SSOT:** `src/integrations/types.ts` (`IntegrationId` + `INITIAL_INTEGRATIONS`)
> + `src/integrations/registry.ts` (`INTEGRATION_REGISTRY`, `INTEGRATION_ORDER`,
> `INTEGRATION_META`) + `src/integrations/connections.ts` (credential resolver).
> **Verified count: 22 registrations.** `docs/INTEGRATIONS.md` §1 still says
> "18 integrations today" with a 14-row table — **stale document, documented
> discrepancy**: the source registry gained `dhl`, `palletline`, `xero`,
> `companies_house`, `hmrc`, `wise`, `payoneer`, `google` (all present in
> `INTEGRATION_ORDER`/`INTEGRATION_META`), and the doc's table lists 14 rows.
> Mode = resolution via `defaultIntegrationMode()` (SIM unless creds make it live).
>
> | # | Provider (task list) | Registered id | Purpose | Mode today | Mock/real seam | UI surface | Downstream | Live requires | Status |
> |---|---|---|---|---|---|---|---|---|---|
> | 1 | HMRC | `hmrc` | VAT status reads, MTD filings | SIM | `hmrcClient.ts`/`hmrcMock.ts` | Super Admin → Company (HMRC card) | VAT state, future filing | VAT registered + MTD creds (F-ACTION) | **DEF until VAT registers**; auto-file refused |
> | 2 | Companies House | `companies_house` | Company reads (officers/PSC/filings/charges) | SIM | `companiesHouseClient.ts`/`companiesHouseMock.ts` | Company Control Centre | CS deadlines/file workflow | CH API key + auth code (F-ACTION) | SIM working; LIVE reads CRED; auto-file permanently REFUSED |
> | 3 | Wise Business | `wise` | **Default payout rail** | SIM | `billing/payouts.ts` (rail client) | Accounting/Payouts | brand payouts | rail API creds | SIM→LIVE CRED |
> | 4 | Payoneer | `payoneer` | Secondary payout rail | SIM | `billing/payouts.ts` | Accounting/Payouts | brand payouts | rail API creds | SIM→LIVE CRED |
> | 5 | Stripe | `stripe` | Flat monthly brand subscriptions (NOT commission billing) | SIM | `billing/stripe.ts` + `stripeMock.ts` | Integrations Hub / Billing | subscriptions | Stripe OAuth | SIM→LIVE CRED (later) |
> | 6 | Xero | `xero` | Accounting sync | SIM demo | `src/services/xero/*` (real OAuth client, demo mode) | AccountingPanel (`XeroConnection.tsx` DEAD, unimported) | finance/accounting | Xero connect (F-ACTION) | SIM→LIVE CRED |
> | 7 | NameCheap | *(not a registry provider)* | Deploy channel (FTP) | LIVE (deploy) | `.env` creds; `scripts/deploy-demo.sh` | n/a | demo.mercenta.co.uk deploy | FTP creds (PRESENT; **F-ACTION: rotate**) | deploy-only |
> | 8 | DHL UK | `dhl` | International parcel carrier | SIM | `src/lib/dhl/*` (mock/real) | Inbound Shipments / Logistics | shipment labels | DHL account creds (F-ACTION, later) | SIM→LIVE CRED |
> | 9 | OpenRouter | `openrouter` | Runtime AI model gateway | available | `discovery/engine.ts`, `monitoring/alertTriage.ts` via policy | Integrations Hub / Operating Costs | runtime AI (FREE models only) | dedicated Mercenta key (Super Admin, in-memory) | CRED; FREE models enforced |
> | 10 | DigitalOcean | *(not a registry provider)* | Hosted infra (3 droplets) | LIVE (paid infra) | n/a (hosting) | Operating Costs line | hosting | droplet creds | infra, not an integration card |
> | 11 | Rakazo | *(NOT registered)* | Bot fleet (17 bots) | DEFERRED | `RakazoPanel.tsx` iframe only (`VITE_RAKAZO_URL`) | Super Admin → Rakazo tab | none (fleet not integrated) | — | **DEF — final product phase** |
> | 12 | Supabase | *(not a registry provider)* | Database/backend infra | memory-only in demo | `src/lib/supabase.ts` + `supabase/migrations` (RLS) | multi-tenant/RLS specs | persistence | browser Supabase creds (F-ACTION) | durable path proven by conformance, migration unexecuted in demo |
> | 13 | Instantly.ai | `instantly` | Outreach sending / lead sourcing | available → SIM | `discovery/engine.ts` outreach client | Marketing / outreach | outreach send | `VITE_INSTANTLY_API_KEY` | CRED (never claims sent without confirm) |
> | 14 | Explee | *(not registered, NOT agreed)* | — | — | — | — | — | — | candidate mention only in `docs/INTEGRATIONS.md` §4; **not a requirement** |
> | 15 | Postmark | `email` option `postmark` | Transactional email | available | `mail/mail.ts`, `notifications/postmarkNotifier.ts`, `messaging/email.ts` | Messages/helpdesk/outreach | notifications, sends | `VITE_POSTMARK_API_KEY` | CRED |
> | 16 | Hunter.io | `hunter` | Email verification / enrichment | available | `discovery/engine.ts` verify client + `research` | Prospect detail | contact discovery | `VITE_HUNTER_API_KEY` | CRED |
> | 17 | PandaDoc | `esignature` option `pandadoc` | Contract E-sign | available | `src/lib/esign/esign.ts` | Contracts / esign | e-signed agreements | Pandadoc/DocuSign OAuth | CRED |
> | 18 | Keepa | `keepa` | Amazon price history / research | available → SIM | `research/keepaClient.ts` (mock/real) | Brand Intelligence / sales estimator | ASIN intelligence | Keepa API key | CRED |
> | 19 | Firecrawl | `firecrawl` | Web crawl for discovery | available → SIM | `discovery/firecrawlClient.ts` + `firecrawlResearch.ts` | Opportunity Discovery | discovery research | `VITE_FIRECRAWL_API_KEY` | CRED |
> | 20 | LinkedIn | *(not a registry provider)* | Outreach channel + Postiz/MercentaSocial channel | channel-only | `outreachGenerator.ts`, `config/mercentaSocial.ts`, postiz registry | Outreach / Social | outreach, social | — | channel representation, not a registered API |
> | 21 | Facebook | *(not a registry provider)* | Application link-verify + Postiz/MercentaSocial channel | channel-only | `PartnerApplicationForm.tsx`, mercentaSocial config | Application / Social | link verification | — | same |
> | 22 | Instagram | *(not a registry provider)* | same as FB | channel-only | same | same | same | — | same |
> | 23 | X.com | *(not a registry provider)* | Postiz/MercentaSocial channel | channel-only | mercentaSocial config | Social | social | — | same |
> | 24 | WhatsApp Business | `twilio_whatsapp` | Escalation / WhatsApp messaging | available → SIM | `whatsapp/whatsAppClient.ts` + `whatsAppEscalation.ts`, `WhatsAppAdminPanel.tsx` | WhatsApp admin panel | case escalation | Twilio creds | CRED |
>
> Also registered (not in the 24 list): **`amazon_sp_api`** (core; SIM→LIVE
> CRED), **`amazon_ads`** (card; **NO dashboard surface**), **`email`** provider
> group, **`lead_sourcing`** (CSV zero-API + Apollo/Instantly), **`usertour`**
> (self-hosted, connected/sandbox), **`postiz`** (self-hosted social scheduler),
> **`google`** (OAuth; `exchange_pending` ≠ `connected`), **`palletline`**
> (UK-domestic carrier, SIM→LIVE CRED).
> **No providers were silently added or removed by this inventory.**
> ### 0A.5 BRAND INTELLIGENCE DETAILED INVENTORY
> Core: `src/lib/intelligence/*`, `src/data/prospectStore.ts`, `brandProspectSeed.ts`,
> `brandDossiers.ts`; panels `BrandIntelligencePanel.tsx`,
> `BrandIntelligenceStrategyPanel.tsx`; validators `validate-bi-lifecycle`,
> `validate-bi-intelligence-preservation`, `validate-intelligence-strategy`,
> `validate-discovery`, `validate-sales-estimator`; specs `brand-intelligence-lifecycle`,
> `bi-intelligence-preservation`.
> | Capability | Req | Impl | Wired | Sim/Live | Test/E2E | Evidence |
> |---|---|---|---|---|---|---|
> | Brand discovery (canonical 12 tracked/10 active real-brand universe, seeded, re-boot deterministic) | Y | Y | Y | SIM providers | Y/Y | `runBrandIntelligence`, `prospectStore.ts` |
> | Company/brand/website/product research (dossier + evidence fields) | Y | Y | Y | SIM | Y/Y | `brandDossiers.ts`, BI lifecycle validator |
> | Amazon presence research (ASIN-level evidence, presence indicator) | Y | Y | Y | SIM | Y/Y | `amazonPresenceFor`, `opportunityDiscovery.ts` |
> | ASIN research (per-ASIN facts, source + claim class) | Y | Y | Y | SIM + CRED Keepa | Y/Y | ASIN evidence records, `keepaClient.ts` |
> | Product opportunity analysis (category baseline, PO-potential formula) | Y | Y | Y | SIM labelled | Y/Y | `PO_POTENTIAL_FORMULA`, `poPotentialGbp` |
> | Demand signals (growth signals; score weights; tiers) | Y | Y | Y | SIM | Y/Y | `scoringEngine.ts`, `intelligenceTypes.ts` |
> | Competitive information (seller-count competition factor) | Y | Y | Y | SIM | Y/Y | `competitionFactorFor` |
> | Category/vertical information (8 verticals, fail-closed category gate) | Y | Y | Y | SIM | Y/Y | `OPPORTUNITY_VERTICALS`, `categoryEligibility` |
> | Evidence collection + provenance (source attribution on every fact) | Y | Y | Y | SIM | Y/Y | claim-class fields, `ev()` evidence helper |
> | Confidence/state handling (fact vs potential vs estimated vs verified vs confirmed) | Y | Y | Y | SIM | Y/Y | `ClaimClass`, D2 validator |
> | Estimated vs verified information (estimate labels; simulated_dataset) | Y | Y | Y | SIM | Y/Y | `salesEstimator.ts`, `ESTIMATE_LABEL` |
> | Opportunity signals + brand fit + acquisition signals | Y | Y | Y | SIM | Y/Y | `deriveOpportunity`, `assessOpportunity` |
> | Tottenham merchandise ASIN evidence workflow (founder-supplied evidence, NOT fabricated data) | Y | Y | **F-ACTION** | SIM | Y/Y | seeded POTENTIAL, no invented ASINs; evidence capture = founder task |
> | Keepa seam (price history behind estimator) | Y | Y | Y | SIM→LIVE CRED | Y/Y | `keepaClient.ts` |
> | Firecrawl seam (web fetch for discovery research) | Y | Y | Y | SIM→LIVE CRED | Y/Y | `firecrawlClient.ts`, `firecrawlResearch.ts` |
> | BI → Opportunity Discovery relationship (same prospect; opportunity derived) | Y | Y | Y | Y | Y/Y | `deriveOpportunity`, `rankOpportunities` |
> | BI → ICP relationship (same `prospectId`; ICP projection derived) | Y | Y | Y | Y | Y/Y | `buildAcquisitionLead`, `deriveLeadFromProspect` |
> | BI → Prospecting relationship (lead derived from prospect) | Y | Y | Y | Y | Y/Y | `prospectPipeline.ts` |
> | BI → CRM/acquisition relationship (intelligence preserved by reference into acquisition) | Y | Y | Y | Y | Y/Y | `prospectIntelligence.ts`, D2 validator |
>
> ### 0A.6 AMAZON / VENDOR DETAILED INVENTORY
> | Capability | Req | Impl | Wired | Sim/Live | Test/E2E | Evidence |
> |---|---|---|---|---|---|---|
> | Amazon/Vendor Central simulation (PO/ack/fulfil semantics, no live claim) | Y | Y | Y | SIM | Y/Y | `status-semantics.spec`, PO status machine |
> | PO generation + lifecycle (received→accepted/rejected→ready_to_fulfil→shipped→delivered) | Y | Y | Y | SIM | Y/Y | `commerceLifecycle.ts`, `po-lifecycle.spec` |
> | PO acknowledgement (line-level ack, 24h, backorder, dup-refused) | Y | Y | Y | SIM | Y/Y | `acknowledgeCommercePurchaseOrder` |
> | Amazon-facing product workflow (submit→poll, gate) | Y | Y | Y | SIM | Y/Y | catalog lifecycle |
> | Vendor-style operational states (freight terms collect/prepaid, windows) | Y | Y | Y | SIM | Y/Y | `FreightTerm`, PO fields, batchA validators |
> | SP-API seam (real client + deterministic mock, factory by connection) | Y | Y | Y | SIM→LIVE CRED | Y/Y | `src/lib/spapi/*`, `INTEGRATION_REGISTRY.amazon_sp_api` |
> | Amazon Ads seam | Y | Y | **PART (registered card only; no dashboard)** | — | N/N | registry only `<0B-CORRECTS>` → REQUIRED per 0B.1 |
> | ASIN relationships (product↔ASIN evidence, sales/opportunity linkage) | Y | Y | PART | SIM | Y/Y | BI ASIN evidence |
> | Amazon product intelligence (sales estimate; new-to-channel model; never claims approval) | Y | Y | Y | SIM | Y/Y | `salesEstimator.ts`, `modelBornToRunOpportunity`, `AMAZON_PROGRAMME_STATUS` |
> | Amazon demand/opportunity analysis (vertical demand, PO potential) | Y | Y | Y | SIM | Y/Y | opportunity engine |
> | Future live transition behavior (credential swap; SP-API 404 until Edge functions deployed) | Y | Y | Y | N/A | docs | `GO_LIVE.md`, `PRODUCTION_READINESS.md` |
> | Credential-dependent states (available/disconnected vs live; `isConnected` non-sandbox) | Y | Y | Y | Y | Y/Y | `connections.ts`, `integration-hub.spec` |
> ### 0A.7 CRM / ACQUISITION DETAILED INVENTORY
> | Capability | Req | Impl | Wired | Sim/Live | Test/E2E | Evidence |
> |---|---|---|---|---|---|---|
> | Companies/accounts (brand-centric CRM records) | Y | Y | Y | SIM | Y/Y | `crmStore.ts`, `BrandCRM.tsx` |
> | Contacts (prospect contacts; confidence + source) | Y | Y | Y | SIM | Y/Y | prospect seed contacts, `ProspectDetailPanel.tsx` |
> | Leads (derived from prospects; outreach status stage mapping) | Y | Y | Y | SIM | Y/Y | `prospectPipeline.ts`, `leadSourcing.ts` |
> | Opportunities (created from responses; stage transitions declared) | Y | Y | Y | SIM | Y/Y | `setOpportunityStage`, `OPPORTUNITY_TRANSITIONS` |
> | Pipeline stages (acquisition stage labels per prospect) | Y | Y | Y | SIM | Y/Y | `acquisitionStageLabel`, `AcquisitionPipeline.tsx` |
> | Activities / tasks / actions (add, complete, actor) | Y | Y | Y | SIM | Y/Y | `addCrmTask`, `setCrmTaskStatus` |
> | Notes | Y | Y | Y | SIM | Y/Y | `addCrmNote` |
> | Relationships (relationship context between Mercenta and prospect) | Y | Y | Y | SIM | Y/Y | `getRelationshipContext` |
> | Source/provenance (outreach revision history, intelligence ref) | Y | Y | Y | SIM | Y/Y | `modifyOutreach`, D2 |
> | Status transitions (lead/outreach/opportunity; declared + audited) | Y | Y | Y | SIM | Y/Y | `applyLeadStageToProspect`, `recordResponse` |
> | Acquisition workflow (enrol→prepare→modify→approve/reject→send→response) | Y | Y | Y | SIM transport | Y/Y | `outreachLifecycle.ts`, `validate-acquisition-pipeline` |
> | Command Centre relationship (prospects feed ranking; CTA to BI/CRM) | Y | Y | Y | Y | Y/Y | `commandCentre.ts` |
> | Data persistence/simulation behavior (memory-only in demo, D4 durable proven; honest status) | Y | Y | PART | SIM | Y/Y | `getCommercePersistenceStatus`, `domain-persistence` spec |
> | Outreach preparation (BI-evidence copy; wording-gate safe) | Y | Y | Y | SIM | Y/Y | `prepareOutreach`, `outreachGenerator.ts` |
> | Sequences (email + LinkedIn + follow-ups generated) | Y | Y | Y | SIM | Y/Y | `generateAllOutreach` |
> | Simulated-send vs external-send distinction (transport refuses unless verified live) | Y | Y | Y | Y | Y/Y | `outreachSender.ts`, `outreach-provider-hardening.spec` |
>
> ### 0A.8 COMMERCE / PO / FULFILMENT DETAILED INVENTORY
> | Capability | Req | Impl | Wired | Sim/Live | Test/E2E | Evidence |
> |---|---|---|---|---|---|---|
> | PO generation (eligible SKU gate; idempotent; no email/provider on failure) | Y | Y | Y | SIM (sim marker) | Y/Y | `createCommercePurchaseOrder` |
> | PO visibility (brand + admin lists/detail, line items, ack history) | Y | Y | Y | SIM | Y/Y | `AdminPurchaseOrderList/Detail`, `po-lifecycle.spec` |
> | PO acknowledgement (line-level; brand or admin-on-behalf; audit attribution) | Y | Y | Y | SIM | Y/Y | `acknowledgeCommercePurchaseOrder`, batch0point5 validators |
> | Acceptance/rejection (rejection reason logged; refusal paths no-mutation) | Y | Y | Y | SIM | Y/Y | PO status machine |
> | Fulfilment (via ASN seam `createShipmentForPO`) | Y | Y | Y | SIM | Y/Y | `fulfilCommercePurchaseOrder` |
> | Shipment preparation + milestones (advance; milestone→status) | Y | Y | Y | SIM | Y/Y | `advanceCommerceShipment`, `fulfillment-tracks.spec` |
> | ASN | Y | Y | Y | SIM | Y/Y | `shipment-asn.spec` |
> | Carrier flow (DHL + Palletline mock/real; lane select; commercial breakdown incl. shipping example) | Y | Y | Y | SIM→LIVE CRED | Y/Y | `shipping/carrierRouting.ts`, `demoShippingCommercialExample` |
> | Receiving (delivery reconciliation; shortage deductions auto-raised) | Y | Y | Y | SIM | Y/Y | `receiveCommercePurchaseOrder`, `reconcileDelivery`, `deductions.spec` |
> | Invoice (issued-unpaid tracked honestly) | Y | Y | Y | SIM | Y/Y | `issueCommerceInvoice` |
> | Payment (record; deterministic payment↔PO↔invoice reconciliation) | Y | Y | Y | SIM→LIVE CRED Stripe | Y/Y | `recordCommercePayment`, `reconcilePayment`, `validate-financial-reconciliation` |
> | Chargebacks / deductions (deduction ledger; simulation provenance marker) | Y | Y | Y | SIM | Y/Y | `raiseCommerceException`, D1 checks |
> | Exceptions / disputes / cases (dispute→resolution; case escalation via helpdesk seam) | Y | Y | Y | SIM | Y/Y | `openCommerceDispute`, `resolveCommerceDispute`, `openCommerceCase`, `amazonCaseClient.ts` |
> | Lifecycle state transitions (every transition enforced; illegal refused) | Y | Y | Y | SIM | Y/Y | `commerceLifecycle.ts` guard clauses |
> | Relationships across entities (PO→invoice→payment→exception→case all reference canonical ids) | Y | Y | Y | Y | Y/Y | reconciliations, `entityIds` in stage records |
>
> **PO → ack → fulfilment → shipment → receiving → invoice → payment → exception
> as ONE connected workflow: VERIFIED — `commerceLifecycle.ts` + E4 validator +
> `po-lifecycle`/`shipment-asn`/`fulfillment-tracks`/`deductions`/`disputes` e2e +
> the 25-stage demo stages `purchase_order`→`error_recovery`.**
> ### 0A.9 FINANCE DETAILED INVENTORY
> | Capability | Req | Impl | Wired | Sim/Live | Test/E2E | Evidence |
> |---|---|---|---|---|---|---|
> | Finance dashboard/accounting states (brand financial standing; admin accounting tiles) | Y | Y | Y | SIM | Y/Y | `financialStandingForBrand`, `AccountingPanel.tsx`, `AdminDashboard.tsx` |
> | Invoice relationships (invoice generated from commission lines; paid marks invoice paid) | Y | Y | Y | SIM | Y/Y | `invoice.ts`, `recordCommercePayment` |
> | Payment relationships (payment↔PO↔invoice reconciliation; statuses pending/reconciled/exception) | Y | Y | Y | SIM | Y/Y | `reconcilePayment`, `validate-financial-reconciliation` |
> | Chargebacks / exceptions (deduction ledger; shortage auto-deduction) | Y | Y | Y | SIM | Y/Y | `raiseCommerceException`, `deductions.spec` |
> | Cases (finance/helpdesk escalation seam; Mercenta review before channel) | Y | Y | Y | SIM | Y/Y | `openCommerceCase`, `amazonCaseClient.ts` |
> | Xero seam (real OAuth client, demo mode, 28-day resync) | Y | Y | Y | SIM→LIVE CRED | Y/Y | `src/services/xero/*`, e2e `xero` |
> | VAT/config state (`VAT_TREATMENT=configuration_required`, no amount until configured) | Y | Y | Y | config-gated | Y/Y | `src/config/commercial.ts`, `resolveVatTreatment` |
> | Operating costs (13 lines; labels MANUAL/ESTIMATED/SIMULATED/NOT CONNECTED; founder-approved price inputs; no live billing claim) | Y | Y | Y | SIM | Y/Y | `config/operatingCosts.ts`, `validate-operating-costs`, e2e `operating-costs` |
> | Cost data (provider cost lines × revenue streams) | Y | Y | Y | SIM | Y/Y | `costSummary.ts` |
> | Financial reporting (reconciliations, payouts, standings per brand; brand Reports) | Y | Y | Y | SIM | Y/Y | `BrandReports.tsx`, `financialReconciliation.ts` |
> | Simulation vs future live transition (credential swap; no code change) | Y | Y | Y | N/A | docs | `PRODUCTION_READINESS.md` |
>
> ### 0A.10 FUNDING / INVESTOR DETAILED INVENTORY
> | Capability | Req | Impl | Wired | Sim/Live | Test/E2E | Evidence |
> |---|---|---|---|---|---|---|
> | Grants research (opportunity records with claim class + source) | Y | Y | Y | SIM | Y/Y | `researchEngine.ts`, `dataSources.ts` |
> | Investors (honest plan: £250k, 0 committed; no invented investors) | Y | Y | Y | SIM | Y/Y | `founderContent.ts` |
> | Opportunity research (grants/investors discovery) | Y | Y | Y | SIM | Y/Y | `runGrantsResearch` |
> | Real founder opportunities (Solo Founders Program, The Bridge, Ignyte by DIFC — real URLs + claim classes) | Y | Y | Y | SIM | Y/Y | `FOUNDER_FUNDING_OPPORTUNITIES` |
> | Opportunity evidence + source/provenance (claim class per fact; unknown terms null) | Y | Y | Y | SIM | Y/Y | `SourcedFundingClaim` |
> | Funding stages (§31: DISCOVERED→…→DECISION; declared order; next actions) | Y | Y | Y | SIM | Y/Y | `FUNDING_APPLICATION_STAGES`, `advanceFundingStage` |
> | Application pipeline (deterministic generation; linted by wording gates) | Y | Y | Y | SIM | Y/Y | `fundingPipeline.ts` |
> | Founder approval gate (SUBMITTED and later refused without recorded approval + founder ref) | Y | Y | Y | SIM | Y/Y | `recordFounderApproval`, `recordFundingSubmission` |
> | Internal approval vs external submission distinction (approval record ≠ submission; submission founder-gated) | Y | Y | Y | Y | Y/Y | `recordGrantSubmission`/`recordInvestorSubmission` |
> | Ranked funding opportunities (rank + WHY in Command Centre; accelerator slot = Solo Founders route) | Y | Y | Y | Y | Y/Y | `fundingPipelineSummary`, `validate-command-centre` |
> | Command Centre relationship (funding items in the ranked queue with next action) | Y | Y | Y | Y | Y/Y | `commandCentre.ts` |
> | **NO internal approval is ever represented as an external submission** | Y | Y | Y | Y | Y/Y | Phase C validator + `funding-pipeline` e2e |
> ### 0A.11 COMPANY / GOVERNMENT / GOOGLE DETAILED INVENTORY
> | Capability | Req | Impl | Wired | Sim/Live | Test/E2E | Evidence |
> |---|---|---|---|---|---|---|
> | Company Control Centre (registrar snapshot; confirmation-statement workflow; deadlines 90/60/30/7/0; company profile, officers, PSC, filings, charges) | Y | Y | Y | SIM | Y/Y | `companyStore.ts`, `CompanyControlCentre.tsx`, `validate-company-control-centre` |
> | Government Control Centre (HMRC + GOV.UK cards; truthful NOT-CONNECTED states) | Y | Y | PART | SIM | Y/Y | `CompanyControlCentre.tsx` (HMRC card), `GOV_UK_MANUAL_ACTIONS` |
> | Companies House seam (mock/real; reads-only; explicit REFUSAL for `fileViaOfficialApi`; manual register path; verify-after-record) | Y | Y | Y | SIM→LIVE CRED | Y/Y | `companiesHouseClient/Mock.ts`, `fileViaOfficialApi` |
> | Companies House credentials (vault-masked refs; `vault:gov-…`; value never in records/ZIP) | Y | Y | Y | N/A | Y/Y | `GOVERNMENT_SECRET_KINDS`, `storeGovernmentSecret` |
> | GOV.UK (One Login personal code; connection descriptor only) | Y | PART | PART | SIM | Y/Y | `src/config/company.ts` |
> | HMRC (readiness `ready_not_connected`; no filing until VAT + MTD) | Y | PART | NO | SIM | Y/Y | `HMRC_READINESS`, `hmrcClient/Mock.ts` |
> | VAT configuration (treatment `configuration_required`; no computed amount) | Y | Y | Y | config-gated | Y/Y | `src/config/commercial.ts` |
> | Credential states (masked PRESENT/absent; verified vs cleared) | Y | Y | Y | N/A | Y/Y | `markGovernmentSecretVerified`, `clearGovernmentSecret` |
> | Simulated vs live transition (mock reads → live reads behind creds; business boundary: auto-file REFUSED) | Y | Y | Y | SIM→LIVE CRED | Y/Y | `connections.ts`, `PRODUCTION_READINESS.md` |
> | Google integration (OAuth flow, client id entry, consent, code captured as `exchange_pending`, NEVER `connected` without server exchange) | Y | Y | PART | SIM→LIVE CRED | Y/Y | `google/*`, `GoogleSetupWizard.tsx`, `validate-google-integration` (42) |
> | Google Drive/Docs/Sheets/Slides (workspace plan runner; deterministic Mock-GD ids; idempotent; real generation after connect) | Y | Y | PART | SIM→LIVE CRED | Y/Y | `workspaceSetup.ts`, `GOOGLE_WORKSPACE_PLAN`, e2e `google-setup` |
> | Google Edge Function seam (code→token + Vault refresh; deploy = F-ACTION) | Y | Y | PART | — | docs | `docs/INTEGRATIONS.md` §12.1 |
> | **`exchange_pending` is never treated as `connected`** | Y | Y | Y | Y | Y/Y | wizard + validator |
>
> ### 0A.12 SUPER ADMIN / COMMAND CENTRE / LAUNCH CENTRE INVENTORY
> | Capability | Req | Impl | Wired | Sim/Live | Test/E2E | Evidence |
> |---|---|---|---|---|---|---|
> | Super Admin dashboard + 19 tabs (staff/applications/accounting/rakazo/homepage/research/manufacturer/grants/pitch/commercial/launch/company/google/costs/financing/brandintelligence/simulation/compliance/designsystem) | Y | Y | Y | SIM | Y/Y | `SuperAdminPanel.tsx`, e2e `admin-operational-surfaces` |
> | Control Centre / Command Centre (ranked queue; bands NOW/TODAY/WEEK; sections; rank badge + WHY; deterministic; NO AI) | Y | Y | Y | N/A | Y/Y | `commandCentre.ts`, `validate-command-centre` 39, e2e 4/4 |
> | Tab-aware CTA routing (`requestAdminNav` → Super Admin tab; dead-button prevention) | Y | Y | Y | N/A | Y/Y | `adminNav.ts`, `consumeAdminNavRequest`, e2e `command-centre` |
> | Launch Centre (14 platforms; profile prepare ≠ submit; submission package copy; verify checklist; audit; no API claim) | Y | Y | Y | SIM | Y/Y | `launchStore.ts`, `launchPlatforms.ts`, `LaunchCentre.tsx`, `validate-launch-centre`, e2e 3/3 |
> | Empty/error/state handling in admin surfaces | Y | Y | Y | SIM | Y/Y | operational-surfaces specs, ErrorBoundary |
> | Operating-costs + AI-spend dashboard (11/13 provider lines; ceilings; disclaimer) | Y | Y | Y | SIM | Y/Y | `OperatingCostsPanel.tsx`, `validate-operating-costs`, e2e `operating-costs` |
> | RBAC/permissions (role tiers, at-most-limited views, on-behalf audit attribution) | Y | Y | Y | N/A | Y/Y | `auth/rbac.ts`, `access-gate.spec`, `multi-tenant.spec` |
> ### 0A.13 PLATFORM AI INVENTORY
> | Capability | Req | Impl | Wired | Sim/Live | Test/E2E | Evidence |
> |---|---|---|---|---|---|---|
> | Platform AI runtime (deterministic-first: rule/business logic before any model) | Y | Y | Y | FREE models only | Y/Y | `modelPolicy.ts`, validators pin deterministic paths |
> | Model policy (`MAX_PAID_RUNTIME_MODEL = deepseek/deepseek-v4-flash`; FREE list; `isModelAllowed`) | Y | Y | Y | FREE policy | Y/Y | `costs/modelPolicy.ts` |
> | Task routing (`RUNTIME_TASKS` keyed by task id; unknown task id refused; tier chain) | Y | Y | Y | N/A | Y/Y | `selectRuntimeModelForTask`, `validate-operating-costs` |
> | Authorized runtime call sites (exactly 2: discovery research + alert triage; both policy-routed) | Y | Y | Y | LIVE behind key | Y/Y | `discovery/engine.ts`, `monitoring/alertTriage.ts` |
> | Usage tracking (per-call log: model/task/tokens/cost/entity/cache/status) | Y | Y | Y | N/A | Y/Y | `costs/usageLog.ts` |
> | Budget/ceiling handling (daily + monthly ceilings; `exceeded` refuses non-essential) | Y | Y | Y | N/A | Y/Y | `authoriseAiCall`, `AI_SPEND_CEILINGS` |
> | Cache/refusal behavior (cache hit counted; refusal before any call) | Y | Y | Y | N/A | Y/Y | `usageLog.ts` |
> | OpenRouter integration (dedicated Mercenta config: Super Admin in-memory entry; NEVER hardcoded) | Y | Y | Y | CRED | Y/Y | `VITE_OPENROUTER_API_KEY` hint, `INTEGRATION_REGISTRY.openrouter` |
> | FREE-model platform-runtime policy (Mercenta runtime AI = FREE models only) | Y | Y | Y | enforced | Y/Y | `FREE_RUNTIME_MODELS`; **Cline's dev model is separate and unchanged** |
> | Simulation vs live AI behavior (mock research clients; zero network when unknown) | Y | Y | Y | SIM | Y/Y | `validate-review-s*`, `validate-mock-providers` |
>
> ### 0A.14 INVESTOR DEMO 25-STAGE INVENTORY
> `src/lib/simulation/investorDemo.ts` (`INVESTOR_DEMO_STAGES`); `validate-investor-demo`
> (deterministic, zero network, reset→run same digest); e2e `investor-demo` 10/10
> documented. Fail-closed: provider-backed stages run only when the provider
> positively resolves `simulation`; every simulated action is labelled; `networkCalls: 0`.
> | # | Stage (id → label) | Exists | Runs over canonical seams | Honest SIM | Zero-network | Verified |
> |---|---|---|---|---|---|---|
> | 1 | application → Application | Y | `submitApplication` | Y | Y | validator+e2e |
> | 2 | approval → Approval → onboarding record | Y | `updateApplicationStatus`, `beginOnboardingFromApplication` | Y | Y | Y |
> | 3 | onboarding → Onboarding | Y | `onboardingLifecycle` full wizard + mandatory agreements | Y | Y | Y |
> | 4 | commercial_models → Commercial relationship (both models) | Y | `commercialModel` + fail-closed selection | Y | Y | Y |
> | 5 | compliance → Compliance | Y | doc upload/verify/replace failure path + gate | Y | Y | Y |
> | 6 | catalogue → Catalogue & product submission | Y | `catalogLifecycle` submit→poll | Y | Y | Y |
> | 7 | purchase_order → Purchase order | Y | `createCommercePurchaseOrder` | Y | Y | Y |
> | 8 | acknowledgement → PO acknowledgement | Y | `acknowledgeCommercePurchaseOrder` | Y | Y | Y |
> | 9 | fulfilment → Fulfilment / ASN | Y | `fulfilCommercePurchaseOrder` via `createShipmentForPO` | Y | Y | Y |
> | 10 | shipment → Shipment milestones | Y | `advanceCommerceShipment` | Y | Y | Y |
> | 11 | shipping_commercial → Shipping lane & commercial model | Y | lane/carrier + Model A/B breakdown | Y | Y | Y |
> | 12 | delivery → Delivery & receiving | Y | `receiveCommercePurchaseOrder` reconciliation | Y | Y | Y |
> | 13 | returns → Returns | Y | `returnsTracking` | Y | Y | Y |
> | 14 | deductions → Deductions / chargebacks | Y | deduction auto-raise + ledger | Y | Y | Y |
> | 15 | dispute → Dispute & operator resolution | Y | `resolveCommerceDispute` | Y | Y | Y |
> | 16 | commission → Commission accrual | Y | commission computation | Y | Y | Y |
> | 17 | payout → Brand payout settlement | Y | `settleCommission`/payouts | Y | Y | Y |
> | 18 | crm → CRM lifecycle | Y | `crmStore` | Y | Y | Y |
> | 19 | marketing → Acquisition / marketing | Y | `acquisitionStore`/outreach seams | Y | Y | Y |
> | 20 | integrations → Integration Hub (simulation) | Y | mode resolution; unknown/live refused | Y | Y | Y |
> | 21 | cases → Cases — Mercenta review before channel escalation | Y | `openCommerceCase`, `amazonCaseClient` | Y | Y | Y |
> | 22 | social → Mercenta Social | Y | `social/engineAdapter` | Y | Y | Y |
> | 23 | rbac → RBAC & tenant isolation | Y | RBAC + foreign-tenant refusal | Y | Y | Y |
> | 24 | audit → Auditability | Y | platform audit rows for tenant | Y | Y | Y |
> | 25 | error_recovery → Error & recovery | Y | deliberate failure → recorded error + run continues | Y | Y | Y |
> ### 0A.15 RAKAZO — DEFERRED STATUS ONLY
> - Rakazo is a **separate self-hosted bot-fleet project/infrastructure**; current
>   fleet = **17 bots**; its Mercenta integration is **incomplete** (iframe
>   registration only: `RakazoPanel.tsx` + `e2e/rakazo.spec.ts`, which asserts the
>   panel header/controls, never the fleet).
> - Its API configuration is **separate** from the Mercenta platform AI config;
>   Rakazo previously consumed **its own** OpenRouter credits and has been
>   **disabled by the founder**.
> - It is **NOT in `INTEGRATION_ORDER`** (deliberately) and remains the **FINAL
>   product phase** after core completion + UI redesign + UI regression.
> - This session: **NOT modified, NOT activated, NO bots run, zero OpenRouter
>   credits spent** on it.
>
> ### 0A.16 UI/UX — FUTURE REDESIGN REQUIREMENTS ONLY
> - Current UI **frozen** (design freeze; matches demo.mercenta.co.uk). Functional
>   state recorded throughout this inventory; no redesign performed.
> - Agreed future direction (Phases 6–7, AFTER core completion): Apple-inspired
>   premium styling; clean/sleek/smooth; premium typography + buttons; refined
>   spacing; colourful but restrained; **light + dark mode**; Twenty-inspired
>   usability; ERPNext-inspired information clarity; premium sidebar/navigation;
>   elegant colour coding; thin/sleek charts (thin line charts, thin bars, refined
>   doughnut); better information density; premium brand dashboard experience;
>   **no loss of functionality, no broken workflows**.
> - Twenty and ERPNext are design/UX references ONLY — not permission to add
>   unrelated features.
>
> ### 0A.17 GENUINELY MISSING FUNCTIONALITY
> **Absent at the source level (separate from credential items):**
> 1. **Amazon Ads dashboard surface** — `amazon_ads` is a registered card only; no
>    ad-spend dashboard/component exists. `<0B-CORRECTS>` → **REQUIRED build work (0B.1/0B.4 #1) — not optional, not deferrable.**
> 2. **Live Edge Functions in the repo** for SP-API/DHL/CH/HMRC/email — deploy-time
>    infra absent; live paths would 404 until deployed (documented, not claimed).
> 3. **BI discovery scheduler** — discovery runs are operator-triggered; no
>    scheduler exists and none is claimed.
> 4. **§16–§29 embassy/trade partnership pipeline** beyond the prospective-route
>    slots (per HANDOFF "STILL OPEN #5").
> 5. **§12–§15 Google Doc/Slides/Sheets live generation wiring** — runner exists;
>    real generation is blocked on connect (itself CRED/F-ACTION).
> 6. **Explee** — appears only as a candidate in `docs/INTEGRATIONS.md` §4; no
>    agreed requirement, no code. **Classified NOT REQUIRED** (never agreed).
> 7. **Rakazo fleet integration** — inventory-only; DEF (final phase).
> 8. **Campaign-performance stats + monitoring health** — remain seeded, flagged as
>    such (M12); not production-derived.
>
> ### 0A.18 BROKEN FUNCTIONALITY
> - **No genuine product defect found this session (read-only).** The only red
>   gate is the pre-existing `validate-e6-brand-surfaces` **F6 working-tree scope
>   guard** triggered by the 3 user-reserved untracked `design/` PNGs — fixed by
>   nothing (those files must stay untracked); the tracked tree at HEAD was
>   documented 75/75.
> - **Documented stale/dead code, NOT live defects:** `XeroConnection.tsx`
>   (syntax-broken, unimported — dead-code candidate; Xero lives in
>   `AccountingPanel.tsx`); `src/components/shared/BrandComm.tsx` placeholder-slug
>   regex drift vs `demoStore` (SSOT finding, tracked).
> ### 0A.19 IMPLEMENTED BUT NOT FULLY WIRED
> 1. Amazon/ASIN intelligence → Keepa/SP-API live signals (CRED).
> 2. Amazon Ads card → no dashboard (see 0A.17.1). `<0B-CORRECTS>` → REQUIRED build (0B.1).
> 3. GOV.UK One Login — descriptor only.
> 4. HMRC — seam only, not connected (DEF until VAT).
> 5. Google — awaiting OAuth client id + Edge Function deploy (F-ACTION).
> 6. Acquisition durable persistence — memory-only in demo; D4 durable schema +
>    conformance-proven repo exist, migration unexecuted (browser Supabase creds F-ACTION).
> 7. Monitoring health + campaign stats — seeded.
> 8. Live provider sends (outreach, transactional email, WhatsApp, Postiz) — seams
>    ready; live requires credentials.
>
> ### 0A.20 CREDENTIAL-DEPENDENT FUNCTIONALITY (not build work)
> Amazon SP-API/Ads · Stripe · Xero connect · Keepa · Firecrawl · Hunter ·
> Instantly · Postmark/SendGrid · Twilio WhatsApp · DHL/Palletline live labels ·
> Wise/Payoneer rails · Companies House reads · GOV.UK One Login · HMRC (VAT
> registration BEFORE credentials) · Google OAuth + Edge deploy · Supabase browser
> keys (durable path) · OpenRouter key (runtime AI; FREE models enforced).
>
> ### 0A.21 FOUNDER ACTIONS (Super Admin, not build code)
> 1. Google OAuth client id entry + Google Edge Function deploy (`exchange_pending`→`connected`).
> 2. Companies House API key + auth code; GOV.UK One Login personal code (vault-masked).
> 3. HMRC: complete VAT registration first.
> 4. Real operating-cost prices in `src/config/operatingCosts.ts` + pricing approval.
> 5. Tottenham merchandise ASIN evidence capture via existing BI.
> 6. Deploy verified build to demo.mercenta.co.uk (`scripts/deploy-demo.sh`).
> 7. **Rotate Namecheap FTP password and Twilio 2FA recovery code** (both exist in
>    past git history; rotation is the fix).
> 8. Rakazo remains OFF (founder already disabled its OpenRouter usage).
>
> ### 0A.22 INTENTIONALLY DEFERRED ITEMS
> Rakazo integration (LAST) · UI redesign (after core) · security/credential
> remediation (after core declared complete) · HMRC live (after VAT registration) ·
> Amazon SP-API/Ads live (credentials + Edge infra) · Stripe live subscriptions ·
> real Google generation (after connect) · §16–§29 partnership pipeline + §12–§15
> Google generation wiring (HANDOFF STILL OPEN).
>
> ### 0A.23 PLATFORM SYNCHRONIZATION GAPS
> 1. Same provider listed with stale count in `docs/INTEGRATIONS.md` (18 vs 22) — **docs drift**, fixed-by-doc.
> 2. `XeroConnection.tsx` dead file vs AccountingPanel ownership — candidate removal in Phase 1 (out of scope here).
> 3. `BrandComm.tsx` slug derivation drift (SSOT) — candidate Phase 1 fix.
> 4. Acquisition/BI durable persistence inactive in the demo (honest memory-only
>    status shown); flips with browser Supabase keys.
> 5. Full Playwright suite last run documented at checkpoint 91bc291 (280/0/2);
>    FINAL regression belongs to Phase 3.
>
> ### 0A.24 RECOMMENDED NEXT BUILD ORDER (evidence-based; phases already agreed)
> 1. **Phase 1 (fix only genuine gaps):** `<0B-CORRECTS>` **Amazon Ads dashboard surface — REQUIRED build work, no deferral option (see 0B.1/0B.4 #1)**; `XeroConnection.tsx` removal; `BrandComm.tsx` slug SSOT fix;
>    `docs/INTEGRATIONS.md` registry-count update. **No scope expansion beyond the corrected 0B.4 queue.**
> 2. **Phase 2:** end-to-end synchronization verification across the four flows in
>    0A.3 (mostly existing gates; confirm no regression).
> 3. **Phase 3:** full regression (tsc/eslint/build/wording/all validators/RLS/
>    integrity/Playwright `--workers=2` + investor demo).
> 4. **Phase 4:** declare CORE BUILD COMPLETE (founder confirms the 0A.21 actions
>    are accepted as outside build scope).
> 5. **Phase 5:** deploy + re-verify demo.mercenta.co.uk.
> 6. **Phase 6–7:** UI redesign (0A.16) + regression.
> 7. **Phase 8:** Rakazo (0A.15).
> 8. **Phase 9:** security/credential audit + rotation.
>
> ### 0A.25 CRITICAL FINAL CLASSIFICATION (evidence-based)
> 1. **Genuinely built:** the entire platform per 0A.2 — brand portal, admin control
>    centre, carrier seams, commerce chain, intelligence/acquisition chain, finance,
>    company/gov/google, command centre, launch centre, platform AI policy,
>    investor demo, RBAC/RLS/audit, integration registry.
> 2. **Genuinely works:** everything classified SIM above — the demoable platform in
>    simulation mode (validators + e2e evidence; no browser re-run this session).
> 3. **Only simulated:** SP-API, DHL/Palletline labels, Xero, CH, HMRC, Google
>    generation, Wise/Payoneer transfers, Stripe, Keepa/Firecrawl/Hunter/Instantly/
>    Postmark/WhatsApp/Postiz operations (mock adapters identical to the real ones).
> 4. **Fully wired:** 0A.3 flows 1–4 — the four platform chains connect end-to-end.
> 5. **Implemented but fragmented:** acquisition durability (memory-only demo),
>    Google await-connect, GOV.UK descriptor, HMRC seam, Amazon Ads card, dead
>    `XeroConnection.tsx`, BrandComm slug drift, seeded monitoring stats.
> 6. **Tested:** 71/72 deterministic validators + tsc/build/wording/integrity/RLS
>    green this session; full browser suite documented 280/0/2 at 91bc291.
> 7. **Genuinely E2E verified (browser):** documented at checkpoint 91bc291 for all
>    37 matrix areas; NOT re-run this session (no browser) — see 0A.23.5.
> 8. **Requires credentials:** 0A.20 list.
> 9. **Requires founder action:** 0A.21 list.
> 10. **Intentionally deferred:** 0A.22 list.
> 11. **Genuinely missing:** 0A.17 list (small; all candidate-Phase-1 or DEF).
> 12. **Broken:** none found this session (0A.18).
> 13. **What prevents declaring CORE PLATFORM COMPLETE?** Only the agreed
>     sequencing, not missing functionality: final reconciliation (this doc), the
>     bounded final regression (Phase 3), the founder's acceptance of the 0A.21
>     F-ACTION list as out-of-scope, and the deploy/re-verify (Phase 5). The
>     candidate Phase 1 items are small and deliberate (0A.17/0A.24).
> 14. **Can the investor demo operate end-to-end with ZERO credentials?** **YES —
>     proven.** The 25-stage run is deterministic, zero-network, fail-closed to
>     simulation, and validated this session (`validate-investor-demo` PASS;
>     browser 10/10 documented at 91bc291).
> 15. **Can a brand operate the intended simulated workflow end-to-end?** **YES.**
>     Onboarding → catalog → compliance → PO → ack → shipment → receiving →
>     invoice/payment/exception is one lifecycle the brand surfaces drive; E4
>     validators + brand specs green.
> 16. **Are the major platform domains connected to one another?** **YES** —
>     commerce↔finance↔case, intelligence↔ICP↔CRM↔outreach↔onboarding, funding↔
>     company/gov↔command centre, and operational events↔command/launch/demo are
>     all wired through shared stores/seams (0A.3).
> 17. **Previously-agreed features absent from the 37-row matrix?** **NONE found.** `<0B-CORRECTS>` **CORRECTED BY 0B:** the Amazon Ads dashboard surface IS an agreed feature that was under-specified in the matrix (only the seam row had a PAR-mark) and is genuinely missing — **REQUIRED, dashboard build queued 0B.4 #1**.
>     The matrix actually under-specifies granular capabilities; this inventory
>     is the finer-grained truth. One not-matrix-level gap surfaced: **Amazon Ads
>     dashboard surface** (registered card only) — previously implied by §12 → **now REQUIRED per 0B.1**.
> 18. **Previously-agreed integrations absent from the registry?** **None that were
>     agreed.** NameCheap/DigitalOcean/Rakazo/Supabase are infra/deferred, not
>     registry cards (per §14 wizard design). Explee was never agreed. Social
>     channels (LinkedIn/FB/IG/X) are Postiz/MercentaSocial channels. The only
>     discrepancy found is doc-vs-source: `docs/INTEGRATIONS.md` says 18 providers
>     with a 14-row table while the source registry has 22 (0A.4).
> 19. **State transitions claiming external actions that did not occur?** **NONE.**
>     Validators pin: grants/investor submission requires founder ref + prior
>     internal approval (Phase C removed the legacy false-submission state);
>     outreach send refuses unless a verified live transport exists; launch
>     submission is an internal record, not an API call; Amazon/CH/HMRC never
>     claim live filing; Google `exchange_pending` ≠ `connected`.
> 20. **Places where a UI exists but the underlying workflow is not connected?**
>     - **Amazon Ads card** (registry card, no dashboard at all). `<0B-CORRECTS>` → REQUIRED surface build (0B.1/0B.4 #1).
>     - **GOV.UK One Login** descriptor (intentionally a descriptor; real connect
>       is CRED/F-ACTION).
>     - **HMRC card** (seam + readiness state; intentionally not connected until
>       VAT registration).
>     - **Google setup** (fully functional wizard + mock runner; real generation
>       awaits connect).
>     - **Monitoring health/campaign stats** (seeded values, flagged).
>     - **Super Admin Rakazo tab** (iframe; fleet not integrated — DEF).
>     No other UI-without-logic surfaces were found.
>
> **END OF PHASE 0A INVENTORY — authoritative until superseded by Phase 1
> execution evidence.**

---

> ## ⛳ PHASE 0B — CORRECTIVE RECONCILIATION INVENTORY (2026-09-16, read-only)
>
> **WHY THIS SECTION EXISTS.** Phase 0A classified Amazon Ads as
> `PART (registered card only; no dashboard)` and its Phase-1 queue allowed an
> "OR explicit deferral record" escape (0A.24.1). That is NOT acceptable as a
> classification. **The repository must NOT be allowed to redefine the agreed
> Mercenta product scope merely because a feature is currently unconsumed,
> partially implemented, seam-only, or credential-dependent.** Amazon Ads is
> part of the AGREED Mercenta platform functionality (registered requirement
> §12 "Ad spend dashboard", still visible in `src/types.ts`, the integration
> registry and `docs/INTEGRATIONS.md`); the absence of a current dashboard
> consumer does not remove it from scope.
>
> **0B is the corrected, authoritative feature/function inventory. It
> SUPERSEDES the Phase 0A inventory (above) and the 37-row matrix wherever
> they conflict on scope/classification. It is the single source of truth for
> the NEXT BUILD QUEUE at the end.** Phase 0A's rows remain as the historical
> verified evidence record; every conflict is flagged `<0B-CORRECTS>` inline
> below where it appears.
>
> **Correction method:** every capability was re-checked against (A) the agreed
> product contract + §12 registry requirement, (B) prior verified checkpoints,
> (C) PROJECT_STATUS.md, (D) HANDOFF.md, (E) validators (72 scripts),
> (F) E2E specs (53), (G) source implementation, (H) integration registry,
> (I) simulation seams, (J) agreed sequencing. Where the repo cannot prove a
> capability was agreed it is marked **REQUIRES SPECIFICATION RECONCILIATION**
> rather than "NOT REQUIRED". Nothing was changed in source, tests, validators,
> registry, or UI during this pass (verification command output at the foot of
> this section). No Mercenta runtime AI was invoked. Rakazo untouched.
>
> **Value tokens:** **YES** fully true · **PARTIAL** partially true/components
> present but incomplete · **NO** false/absent · **SIM** truthful simulated
> path (works today) · **LIVE** real path behind a credential ·
> **CRED** live requires external credential(s) · **F-ACTION** a founder
> Super-Admin action, not build work · **DEFERRED** intentionally postponed ·
> **N/A** not applicable.
>
> ### 0B.1 AMAZON ADS — CORRECTED CLASSIFICATION (authoritative)
>
> | Claim | Value |
> |---|---|
> | Required / agreed scope | **REQUIRED** — registered `INTEGRATION_REGISTRY.amazon_ads` ("Ad spend dashboard (§12)"), `src/types.ts` `AdSpendBudget` (`§12 Ad spend dashboard`), `docs/INTEGRATIONS.md` row `amazon_ads … Ad spend dashboard` |
> | Implemented | **PARTIAL** — data layer exists: `AdSpendBudget`, `demoAdSpend`, `fetchAdSpendBudgets()` (`src/data/api.ts`), `useAdSpendBudgets()` (`src/data/queries.ts`), registry card + INTEGRATION_META `defaultMode: 'available'`, operating-costs revenue stream `advertising_commission` |
> | Fully wired | **NO** — ZERO consumers of `useAdSpendBudgets()`/`fetchAdSpendBudgets()` in any component (verified by grep); no dashboard surface, no ad-metrics/budget/reporting UI, no brand or admin consumer |
> | Simulated | **PARTIAL** — simulated seed data exists and is queryable; nothing renders it |
> | Tested | **PARTIAL** — `validate-stage4` asserts the registry entry; `e2e/integration-hub.spec.ts` asserts the card renders; NO test exercises ad-spend data or a dashboard |
> | E2E verified | **NO** — no ad-spend dashboard spec exists |
> | Credential dependent (live) | **CRED** — live Amazon Ads connection requires Amazon credentials/approval (same pending path as SP-API) |
> | Missing | **YES** — the dashboard/advertising-metrics/budgets/reporting surface (agreed §12) is genuinely missing build work |
> | Broken | **NO** — nothing broken; the data/seam that exists is correct but unconsumed |
> | Classification | **REQUIRED → PARTIALLY IMPLEMENTED / INCOMPLETE → SIMULATION-FIRST → DASHBOARD/SURFACE STILL REQUIRED → LIVE CONNECTION CREDENTIAL-DEPENDENT** |
> | It is NOT | "DEFER — no build" · "NOT REQUIRED" · "OUT OF SCOPE" |
>
> **Historical-evidence check (explicit removal):** searched `docs/*`,
> `MERCENTA_*CONTRACT*`, `requirements-registry.json`, HANDOFF, git log for any
> record that Amazon Ads was deliberately removed from the agreed product.
> **None found.** `requirements-registry.json` has no Amazon Ads entry at all
> (0 hits for `ad_spend|amazon_ads|AdSpend`) — itself an inventory gap.
> `MERCENTA_PRODUCT_ARCHITECTURE_AUDIT_2026-09-10.md` §19 lists it as
> **UNUSED/UNCONNECTED** (i.e. "not yet wired", the opposite of removed).
> → Amazon Ads remains **REQUIRED**. Recorded as `REQUIRES SPECIFICATION
> RECONCILIATION` only for the SIZE/SCOPE of the advertising-metrics surface
> (budgets? ROAS? campaign list? ad-object level? SP-API Ads endpoints are not
> yet available to inspect), never for its existence.
>
> **Exact remaining work (Phase 1, see 0B.6):** build the Amazon Ads
> dashboard surface as a simulation-first consumer of the EXISTING
> `useAdSpendBudgets()` seam (budget vs spend-to-date, ACOS/TACOS, status per
> brand, operating-costs linkage), render it behind the existing registry card
> (admin + brand where appropriate), add deterministic validator + e2e spec,
> keep live connection behind credentials. Do NOT start until Phase 1 begins.
> ### 0B.2 EXHAUSTIVE FEATURE/FUNCTION MATRIX (corrected, feature-level)
>
> Column keys: **Req** Required · **Impl** Implemented · **Wired** Fully wired
> end-to-end · **Sim** Simulated path · **Tested** deterministic validator(s) ·
> **E2E** browser spec · **Cred** credential-dependent · **F-Act** founder
> Super-Admin action · **Def** intentionally deferred · **Miss** genuinely
> missing · **Broke** broken. Values: `YES|PARTIAL|NO|SIM|LIVE|CRED|F-ACTION|DEFERRED|N/A`.
> A row is only fully green when every condition is true — a panel alone, a
> passing validator alone, or a mock client alone is never a completed feature.
>
> **A. BRAND / BRAND PORTAL**
> | ID | Feature / Function | Req | Impl | Wired | Sim | Tested | E2E | Cred | F-Act | Def | Miss | Broke |
> |---|---|---|---|---|---|---|---|---|---|---|---|---|
> | BP-01 | Brand onboarding — 6-step wizard, mandatory §4.1/§4.2 agreements | YES | YES | YES | SIM | YES | YES | NO | NO | NO | NO | NO |
> | BP-02 | Brand profile / company information (BrandProfile, settings) | YES | YES | YES | SIM | YES | YES | NO | NO | NO | NO | NO |
> | BP-03 | Brand dashboard — canonical commerce awareness | YES | YES | YES | SIM | YES | YES | NO | NO | NO | NO | NO |
> | BP-04 | Tasks / actions (self-service task lists, routing, CTA) | YES | YES | YES | SIM | YES | YES | NO | NO | NO | NO | NO |
> | BP-05 | Notifications / status (NotificationCenter, status semantics) | YES | YES | YES | SIM | YES | YES | NO | NO | NO | NO | NO |
> | BP-06 | Catalogue / product management (ProductCatalog CRUD) | YES | YES | YES | SIM | YES | YES | NO | NO | NO | NO | NO |
> | BP-07 | Product submission (submit→poll Amazon-facing gate) | YES | YES | YES | SIM | YES | YES | NO | NO | NO | NO | NO |
> | BP-08 | Compliance / document workflow (upload, verify, replace, gate) | YES | YES | YES | SIM | YES | YES | NO | NO | NO | NO | NO |
> | BP-09 | Agreements (§4.1/§4.2, contract view, e-sign seam) | YES | YES | YES | SIM | YES | YES | CRED-live-esign | NO | NO | NO | NO |
> | BP-10 | PO visibility (brand PO list + detail) | YES | YES | YES | SIM | YES | YES | NO | NO | NO | NO | NO |
> | BP-11 | PO acknowledgement (line-level, 24h, brand GUI) | YES | YES | YES | SIM | YES | YES | NO | NO | NO | NO | NO |
> | BP-12 | Fulfilment workflow (LogisticsHub, factory→live-amazon) | YES | YES | YES | SIM | YES | YES | CRED-live-labels | NO | NO | NO | NO |
> | BP-13 | Shipment / ASN workflow (PO-gated, milestones, commercial breakdown) | YES | YES | YES | SIM | YES | YES | CRED-live-DHL/Palletline | NO | NO | NO | NO |
> | BP-14 | Receiving / delivery reconciliation (shortage deduction auto-raise) | YES | YES | YES | SIM | YES | YES | NO | NO | NO | NO | NO |
> | BP-15 | Invoices (visibility, issue-unpaid honesty) | YES | YES | YES | SIM | YES | YES | NO | NO | NO | NO | NO |
> | BP-16 | Payments (payouts, commission settlement, rails sim) | YES | YES | YES | SIM | YES | YES | CRED-rails | NO | NO | NO | NO |
> | BP-17 | Chargebacks (deductions ledger visibility, cause + evidence) | YES | YES | YES | SIM | YES | YES | NO | NO | NO | NO | NO |
> | BP-18 | Cases / exceptions (brand case → Mercenta review → escalation seam) | YES | YES | YES | SIM | YES | YES | NO | NO | NO | NO | NO |
> | BP-19 | Finance / accounting (brand financial standing, transaction history) | YES | YES | YES | SIM | YES | YES | NO | NO | NO | NO | NO |
> | BP-20 | Brand-facing reporting (reconciliations, standings, reports) | YES | YES | YES | SIM | YES | YES | NO | NO | NO | NO | NO |
> | BP-21 | Brand-facing operational status (live vs simulated shown honestly) | YES | YES | YES | SIM | YES | YES | NO | NO | NO | NO | NO |
>
> Brand row evidence: `OnboardingWizard.tsx`, `onboardingLifecycle.ts`,
> `compliance.ts`, `BrandDashboard.tsx`, `NotificationCenter.tsx`,
> `ProductCatalog.tsx`, `catalogLifecycle.ts`, `BrandPurchaseOrders.tsx`,
> `acknowledgeCommercePurchaseOrder`, `LogisticsHub.tsx`,
> `createShipmentForPO`, `receiveCommercePurchaseOrder`, `invoice.ts`,
> `settleCommission`, `DeductionsLedger.tsx`, `openCommerceCase`,
> `financialStandingForBrand`, `BrandReports.tsx`, `statusPresentation.ts`;
> validators `validate-onboarding-workflow`, `validate-e3-catalog`,
> `validate-e4-commerce`, `validate-e6-brand-surfaces`, `validate-document-verification`;
> specs `onboarding-workflow`, `catalog-product-management`, `po-lifecycle`,
> `fulfillment-tracks`, `shipment-asn`, `deductions`, `disputes`, `billing`,
> `brand-payouts`, `notifications`, `status-semantics`, `legal-agreements`,
> `compliance-gate`, `brand-operational-surfaces`.
> **B. PRODUCT / CATALOGUE**
> | ID | Feature / Function | Req | Impl | Wired | Sim | Tested | E2E | Cred | F-Act | Def | Miss | Broke |
> |---|---|---|---|---|---|---|---|---|---|---|---|---|
> | PC-01 | Product creation (brand + admin; typed `Product`) | YES | YES | YES | SIM | YES | YES | NO | NO | NO | NO | NO |
> | PC-02 | Product editing (deterministic, audited) | YES | YES | YES | SIM | YES | YES | NO | NO | NO | NO | NO |
> | PC-03 | Catalogue upload / import (CSV + edge catalog-import) | YES | YES | YES | SIM | YES | YES | CRED-live-import | NO | NO | NO | NO |
> | PC-04 | Product validation (completeness scoring) | YES | YES | YES | SIM | YES | YES | NO | NO | NO | NO | NO |
> | PC-05 | Compliance (catalog blocked until gate approved) | YES | YES | YES | SIM | YES | YES | NO | NO | NO | NO | NO |
> | PC-06 | Document handling (verify/replace) | YES | YES | YES | SIM | YES | YES | NO | NO | NO | NO | NO |
> | PC-07 | Product submission lifecycle (draft→ready→submitted→poll) | YES | YES | YES | SIM | YES | YES | NO | NO | NO | NO | NO |
> | PC-08 | Product lifecycle / state machine (declared transitions) | YES | YES | YES | SIM | YES | YES | NO | NO | NO | NO | NO |
> | PC-09 | Amazon-compatible product data (ASIN evidence, sales estimate) | YES | YES | PARTIAL | SIM | YES | YES | CRED-Keepa | NO | NO | NO | NO |
> | PC-10 | Downstream propagation (product → PO lines → shipment → invoice) | YES | YES | YES | SIM | YES | YES | NO | NO | NO | NO | NO |
>
> Product evidence: `catalogLifecycle.ts`, `productCompleteness.ts`,
> `CsvCatalogImport.tsx`, `csvImport.ts`, `complianceGateStatus`,
> `lib/verification/documentVerification.ts`, `salesEstimator.ts`,
> `commerceLifecycle.ts`; validators `validate-e3-catalog`,
> `validate-csv-import`, `validate-sales-estimator`, `validate-document-verification`;
> specs `catalog-product-management`, `compliance-gate`, `po-lifecycle`.
>
> **C. AMAZON / VENDOR CENTRAL**
> | ID | Feature / Function | Req | Impl | Wired | Sim | Tested | E2E | Cred | F-Act | Def | Miss | Broke |
> |---|---|---|---|---|---|---|---|---|---|---|---|---|
> | AV-01 | Vendor Central simulation (PO/ack/fulfil semantics; never live claim) | YES | YES | YES | SIM | YES | YES | NO | NO | NO | NO | NO |
> | AV-02 | PO generation / simulation (state machine) | YES | YES | YES | SIM | YES | YES | NO | NO | NO | NO | NO |
> | AV-03 | PO acknowledgement (line-level, 24h, backorder, dup-refused) | YES | YES | YES | SIM | YES | YES | NO | NO | NO | NO | NO |
> | AV-04 | Amazon workflow states + freight terms (collect/prepaid, windows) | YES | YES | YES | SIM | YES | YES | NO | NO | NO | NO | NO |
> | AV-05 | Amazon ASIN intelligence (ASIN-level evidence, presence) | YES | YES | PARTIAL | SIM | YES | YES | CRED-Keepa | NO | NO | NO | NO |
> | AV-06 | Keepa intelligence (price history behind estimator) | YES | YES | PARTIAL | SIM | YES | YES | CRED-Keepa | NO | NO | NO | NO |
> | AV-07 | **Amazon Ads — data seam + registry card (agreed §12)** | **YES** | **PARTIAL** | **NO** | **PARTIAL** | **PARTIAL** | **NO** | **CRED-live** | NO | NO | **YES-surface-missing** | NO |
> | AV-08 | **Amazon Ads dashboard / metrics / budgets / reporting surface** | **YES** | **NO** | **NO** | **NO** | **NO** | **NO** | **CRED-live** | NO | NO | **YES** | NO |
> | AV-09 | SP-API seam (real + mock, factory by connection) | YES | YES | YES | SIM | YES | YES | CRED-SP-API | NO | NO | NO | NO |
> | AV-10 | Amazon credentials / live path (Edge functions deploy-time) | YES | YES | YES | N/A | YES | YES | CRED | F-ACTION-deploy | NO | NO | NO |
> | AV-11 | Explicit sim-vs-live honesty (no fabricated Amazon claim) | YES | YES | YES | SIM | YES | YES | NO | NO | NO | NO | NO |
>
> Amazon evidence: `commerceLifecycle.ts`, `acknowledgeCommercePurchaseOrder`,
> `FreightTerm`, `opportunityDiscovery.ts`, `keepaClient.ts`,
> **`AdSpendBudget`/`demoAdSpend`/`fetchAdSpendBudgets`/`useAdSpendBudgets`/
> `INTEGRATION_REGISTRY.amazon_ads` — seam only, ZERO dashboard consumers (grep-verified)`,
> `src/lib/spapi/*`, `GO_LIVE.md`, `PRODUCTION_READINESS.md`; validators
> `validate-e4-commerce`, `validate-mock-providers`, `validate-stage4`,
> `validate-edge-functions`; specs `po-lifecycle`, `status-semantics`,
> `integration-hub`. **AV-07/AV-08 classification: see 0B.1 (CORRECTED).**
> **D. BRAND INTELLIGENCE** (every capability individually — NOT reduced to one row)
> | ID | Feature / Function | Req | Impl | Wired | Sim | Tested | E2E | Cred | F-Act | Def | Miss | Broke |
> |---|---|---|---|---|---|---|---|---|---|---|---|---|
> | BI-01 | Brand discovery (canonical 12 tracked / 10 active real-brand universe, seeded, deterministic re-boot, `runBrandIntelligence`) | YES | YES | YES | SIM-providers | YES | YES | NO | NO | NO | NO | NO |
> | BI-02 | Company/brand/website/product research (dossier + evidence fields) | YES | YES | YES | SIM | YES | YES | NO | NO | NO | NO | NO |
> | BI-03 | Amazon presence research (ASIN-level evidence, presence indicator) | YES | YES | YES | SIM | YES | YES | NO | NO | NO | NO | NO |
> | BI-04 | ASIN research (per-ASIN facts, source + claim class) | YES | YES | YES | SIM+CRED-Keepa | YES | YES | CRED-Keepa | NO | NO | NO | NO |
> | BI-05 | Product opportunity analysis (category baseline, PO-potential formula) | YES | YES | YES | SIM-labelled | YES | YES | NO | NO | NO | NO | NO |
> | BI-06 | Demand signals (growth signals, weights, tiers) | YES | YES | YES | SIM | YES | YES | NO | NO | NO | NO | NO |
> | BI-07 | Competitive information (seller-count competition factor) | YES | YES | YES | SIM | YES | YES | NO | NO | NO | NO | NO |
> | BI-08 | Category/vertical information (8 verticals, fail-closed gate) | YES | YES | YES | SIM | YES | YES | NO | NO | NO | NO | NO |
> | BI-09 | Evidence collection + provenance (source on every fact) | YES | YES | YES | SIM | YES | YES | NO | NO | NO | NO | NO |
> | BI-10 | Confidence/state handling (fact/potential/estimated/verified/confirmed) | YES | YES | YES | SIM | YES | YES | NO | NO | NO | NO | NO |
> | BI-11 | Estimated vs verified information (labels; simulated_dataset) | YES | YES | YES | SIM | YES | YES | NO | NO | NO | NO | NO |
> | BI-12 | Opportunity signals + brand fit + acquisition signals | YES | YES | YES | SIM | YES | YES | NO | NO | NO | NO | NO |
> | BI-13 | Tottenham merchandise ASIN evidence workflow (founder-supplied evidence, NOT fabricated) | YES | YES | N/A-gate | SIM | YES | YES | NO | **F-ACTION-evidence-capture** | NO | NO | NO |
> | BI-14 | Keepa seam (price history behind estimator) | YES | YES | PARTIAL | SIM | YES | YES | CRED-Keepa | NO | NO | NO | NO |
> | BI-15 | Firecrawl seam (web fetch, discovery research) | YES | YES | PARTIAL | SIM | YES | YES | CRED-Firecrawl | NO | NO | NO | NO |
> | BI-16 | BI → Opportunity Discovery (same prospect; opportunity derived) | YES | YES | YES | YES | YES | YES | NO | NO | NO | NO | NO |
> | BI-17 | BI → ICP (same `prospectId`; ICP projection derived) | YES | YES | YES | YES | YES | YES | NO | NO | NO | NO | NO |
> | BI-18 | BI → Prospecting (lead derived from prospect) | YES | YES | YES | YES | YES | YES | NO | NO | NO | NO | NO |
> | BI-19 | BI → CRM/acquisition preservation (intelligence preserved by reference) | YES | YES | YES | YES | YES | YES | NO | NO | NO | NO | NO |
>
> BI evidence: `src/lib/intelligence/*` (`opportunityDiscovery.ts`,
> `scoringEngine.ts`, `prospectIntelligence.ts`, `prospectLifecycle.ts`,
> `salesEstimator.ts`, `brandIntelligenceClient.ts`, `keepaClient.ts`,
> `firecrawlClient.ts`), `brandDossiers.ts`, `brandProspectSeed.ts`;
> panels `BrandIntelligencePanel.tsx`, `BrandIntelligenceStrategyPanel.tsx`;
> validators `validate-bi-lifecycle`, `validate-bi-intelligence-preservation`,
> `validate-intelligence-strategy`, `validate-discovery`,
> `validate-sales-estimator`, `validate-mock-providers`; specs
> `brand-intelligence-lifecycle`, `bi-intelligence-preservation`.
> **Downstream: BI-16→19 feed Opportunity Discovery, ICP, acquisition, CRM,
> Command Centre (relationship slots), Amazon opportunity (AV-05).**
>
> **E. OPPORTUNITY DISCOVERY**
> | ID | Feature / Function | Req | Impl | Wired | Sim | Tested | E2E | Cred | F-Act | Def | Miss | Broke |
> |---|---|---|---|---|---|---|---|---|---|---|---|---|
> | OD-01 | Discovery (runDiscoveryPipeline: directories → research → enrich → enrol) | YES | YES | YES | SIM | YES | YES | CRED-live-providers | NO | NO | NO | NO |
> | OD-02 | Opportunity identification (`deriveOpportunity`/`assessOpportunity`) | YES | YES | YES | SIM | YES | YES | NO | NO | NO | NO | NO |
> | OD-03 | Category/vertical discovery (8 verticals, fail-closed) | YES | YES | YES | SIM | YES | YES | NO | NO | NO | NO | NO |
> | OD-04 | Product/brand opportunity signals (PO potential, scoring) | YES | YES | YES | SIM | YES | YES | NO | NO | NO | NO | NO |
> | OD-05 | Web/firecrawl seam (`firecrawlClient`/`firecrawlResearch`) | YES | YES | PARTIAL | SIM | YES | YES | CRED-Firecrawl | NO | NO | NO | NO |
> | OD-06 | Evidence/provenance (claim class + source on every signal) | YES | YES | YES | SIM | YES | YES | NO | NO | NO | NO | NO |
> | OD-07 | Scoring/ranking (`scoringEngine`, `rankOpportunities` — canonical PO-potential ranking used by Command Centre) | YES | YES | YES | SIM | YES | YES | NO | NO | NO | NO | NO |
> | OD-08 | Downstream acquisition use (E1 opportunity → brand onboarding hand-off) | YES | YES | YES | SIM | YES | YES | NO | NO | NO | NO | NO |
>
> Opportunity evidence: `src/lib/discovery/*` (`engine.ts`, `budget.ts`,
> `wordingSafety.ts`), `src/lib/intelligence/opportunityDiscovery.ts`,
> `rankOpportunities`, `prospectPipeline.ts`; validators `validate-discovery`,
> `validate-opportunity-discovery`, `validate-onboarding-handoff`; specs
> `opportunity-discovery`, `onboarding-handoff`.
> **F. ICP / ACQUISITION**
> | ID | Feature / Function | Req | Impl | Wired | Sim | Tested | E2E | Cred | F-Act | Def | Miss | Broke |
> |---|---|---|---|---|---|---|---|---|---|---|---|---|
> | IA-01 | ICP definition (deterministic ICP projection, `buildAcquisitionLead`) | YES | YES | YES | SIM | YES | YES | NO | NO | NO | NO | NO |
> | IA-02 | Acquisition criteria (fit scoring, thresholds, auto-enrol rule) | YES | YES | YES | SIM | YES | YES | NO | NO | NO | NO | NO |
> | IA-03 | Brand qualification (eligibility, category gate) | YES | YES | YES | SIM | YES | YES | NO | NO | NO | NO | NO |
> | IA-04 | Prospect discovery (canonical universe from BI) | YES | YES | YES | SIM | YES | YES | NO | NO | NO | NO | NO |
> | IA-05 | Lead generation (`deriveLeadFromProspect`, `leadSourcing`) | YES | YES | YES | SIM | YES | YES | NO | NO | NO | NO | NO |
> | IA-06 | Contact discovery (contacts, confidence + source; CSV zero-API) | YES | YES | YES | SIM | YES | YES | CRED-Hunter | NO | NO | NO | NO |
> | IA-07 | Hunter seam (email verification) | YES | YES | PARTIAL | SIM | YES | YES | CRED-Hunter | NO | NO | NO | NO |
> | IA-08 | Acquisition pipeline (stages, D4) + enrolment workflow | YES | YES | YES | SIM | YES | YES | NO | NO | NO | NO | NO |
> | IA-09 | Prioritisation (fit ranking → Command Centre queue feed) | YES | YES | YES | SIM | YES | YES | NO | NO | NO | NO | NO |
> | IA-10 | Downstream CRM flow (lead → `setOpportunityStage` → CRM) | YES | YES | YES | SIM | YES | YES | NO | NO | NO | NO | NO |
>
> ICP evidence: `prospectPipeline.ts`, `prospectLifecycle.ts`,
> `intelligence/acquisitionStrategy.ts`, `acquisitionStore.ts`,
> `prospectStore.ts`; validators `validate-acquisition-pipeline`,
> `validate-prospect-pipeline`, `validate-d4-persistence`, `validate-tenant-coherence`;
> specs `acquisition-pipeline`, `multi-tenant`. **Persistence: memory-only in
> demo; durable schema proven, unexecuted (Supabase creds = F-ACTION) — PART.**
>
> **G. CRM**
> | ID | Feature / Function | Req | Impl | Wired | Sim | Tested | E2E | Cred | F-Act | Def | Miss | Broke |
> |---|---|---|---|---|---|---|---|---|---|---|---|---|
> | CM-01 | Prospects (canonical list, tenant-scoped) | YES | YES | YES | SIM | YES | YES | NO | NO | NO | NO | NO |
> | CM-02 | Leads (derived from prospects; stage mapping) | YES | YES | YES | SIM | YES | YES | NO | NO | NO | NO | NO |
> | CM-03 | Contacts (confidence + source) | YES | YES | YES | SIM | YES | YES | CRED-Hunter | NO | NO | NO | NO |
> | CM-04 | Companies / accounts (brand-centric CRM records) | YES | YES | YES | SIM | YES | YES | NO | NO | NO | NO | NO |
> | CM-05 | Pipeline stages (acquisition stage labels per prospect) | YES | YES | YES | SIM | YES | YES | NO | NO | NO | NO | NO |
> | CM-06 | Activities / tasks / actions (add, complete, actor) | YES | YES | YES | SIM | YES | YES | NO | NO | NO | NO | NO |
> | CM-07 | Status (lead/outreach/opportunity; declared + audited transitions) | YES | YES | YES | SIM | YES | YES | NO | NO | NO | NO | NO |
> | CM-08 | Relationship data (`getRelationshipContext`, Command Centre feed) | YES | YES | YES | SIM | YES | YES | NO | NO | NO | NO | NO |
> | CM-09 | Tasks (CRM tasks, notes, tags) | YES | YES | YES | SIM | YES | YES | NO | NO | NO | NO | NO |
> | CM-10 | Notes (add, provenance) | YES | YES | YES | SIM | YES | YES | NO | NO | NO | NO | NO |
> | CM-11 | CRM → outreach (prepare modify approve send, response→opportunity) | YES | YES | YES | SIM | YES | YES | CRED-live-send | NO | NO | NO | NO |
> | CM-12 | CRM → Command Centre (prospects feed ranking; CTA to BI/CRM) | YES | YES | YES | YES | YES | YES | NO | NO | NO | NO | NO |
>
> CRM evidence: `crmStore.ts`, `BrandCRM.tsx`, `ProspectDetailPanel.tsx`,
> `acquisitionStageLabel`, `AcquisitionPipeline.tsx`, `addCrmTask`,
> `setCrmTaskStatus`, `addCrmNote`, `getRelationshipContext`,
> `applyLeadStageToProspect`, `recordResponse`, `outreachLifecycle.ts`;
> specs `crm`, `acquisition-pipeline`, `command-centre`.
> **H. OUTREACH**
> | ID | Feature / Function | Req | Impl | Wired | Sim | Tested | E2E | Cred | F-Act | Def | Miss | Broke |
> |---|---|---|---|---|---|---|---|---|---|---|---|---|
> | OR-01 | Campaign creation (sequence per prospect; campaign state) | YES | YES | YES | SIM | YES | YES | NO | NO | NO | NO | NO |
> | OR-02 | Message generation (BI-evidence copy, `outreachGenerator`) | YES | YES | YES | SIM | YES | YES | NO | NO | NO | NO | NO |
> | OR-03 | Templates (declared templates; reviewer-approved variation) | YES | YES | YES | SIM | YES | YES | NO | NO | NO | NO | NO |
> | OR-04 | Personalisation (prospect-specific fields) | YES | YES | YES | SIM | YES | YES | NO | NO | NO | NO | NO |
> | OR-05 | Email (content + send seam; never claims sent without confirm) | YES | YES | YES | SIM | YES | YES | CRED-Postmark | NO | NO | NO | NO |
> | OR-06 | Instantly seam (outreach activation/send provider) | YES | YES | PARTIAL | SIM | YES | YES | CRED-Instantly | NO | NO | NO | NO |
> | OR-07 | Postmark seam (transactional/outreach email) | YES | YES | PARTIAL | SIM | YES | YES | CRED-Postmark | NO | NO | NO | NO |
> | OR-08 | Outreach approval (approve/reject; wording gate) | YES | YES | YES | SIM | YES | YES | NO | NO | NO | NO | NO |
> | OR-09 | Send-state honesty (transport REFUSES without verified live transport) | YES | YES | YES | SIM | YES | YES | CRED-sender | NO | NO | NO | NO |
> | OR-10 | Response tracking (`recordResponse`, opportunity creation) | YES | YES | YES | SIM | YES | YES | NO | NO | NO | NO | NO |
> | OR-11 | Follow-up (generated sequences incl. LinkedIn + email follow-ups) | YES | YES | YES | SIM | YES | YES | NO | NO | NO | NO | NO |
> | OR-12 | Campaign status (per-prospect outreach state, honest labels) | YES | YES | YES | SIM | YES | YES | NO | NO | NO | NO | NO |
>
> Outreach evidence: `intelligence/outreachGenerator.ts`,
> `acquisition/outreachLifecycle.ts`, `outreachSender.ts`,
> `intelligence/prospectIntelligence.ts`, `messaging/email.ts`,
> `notifications/postmarkNotifier.ts`, Instantly seam; validators
> `validate-acquisition-pipeline`, `validate-outreach-provider-hardening`,
> `validate-automation`, `lint-wording`; specs `acquisition-pipeline`,
> `outreach-provider-hardening`. **No false send claims: pinned by validator.**
>
> **I. FUNDING / GRANTS / INVESTORS**
> | ID | Feature / Function | Req | Impl | Wired | Sim | Tested | E2E | Cred | F-Act | Def | Miss | Broke |
> |---|---|---|---|---|---|---|---|---|---|---|---|---|
> | FG-01 | Funding opportunities (3 REAL: Solo Founders Program, The Bridge, Ignyte by DIFC — real URLs, claim classes) | YES | YES | YES | SIM | YES | YES | NO | NO | NO | NO | NO |
> | FG-02 | Grants (researchEngine; grant opportunity records; dataSources) | YES | YES | YES | SIM | YES | YES | NO | NO | NO | NO | NO |
> | FG-03 | Investor research (investor datasets; honest: £250k plan, 0 committed; no invented investors) | YES | YES | YES | SIM | YES | YES | NO | NO | NO | NO | NO |
> | FG-04 | Funding pipeline (§31 stages DISCOVERED→…→DECISION; declared order) | YES | YES | YES | SIM | YES | YES | NO | NO | NO | NO | NO |
> | FG-05 | Approval states (founder-approval gate; later stages REFUSED without approval + ref) | YES | YES | YES | SIM | YES | YES | NO | **F-ACTION-approval** | NO | NO | NO |
> | FG-06 | Internal approval vs external submission (approval record ≠ submission; submission founder-gated w/ reference) | YES | YES | YES | SIM | YES | YES | NO | **F-ACTION-submission-ref** | NO | NO | NO |
> | FG-07 | Application preparation (deterministic `fundingPipeline`; linted by wording gates) | YES | YES | YES | SIM | YES | YES | NO | NO | NO | NO | NO |
> | FG-08 | Investor/demo lifecycle (25-stage deterministic demo) | YES | YES | YES | SIM | YES | YES | NO | NO | NO | NO | NO |
> | FG-09 | Status transitions (stage machine; audited) | YES | YES | YES | SIM | YES | YES | NO | NO | NO | NO | NO |
> | FG-10 | Evidence (SourcedFundingClaim, claim class per fact, unknown → null) | YES | YES | YES | SIM | YES | YES | NO | NO | NO | NO | NO |
> | FG-11 | CTA / action flows (funding items in Command Centre with canonical next action) | YES | YES | YES | SIM | YES | YES | NO | NO | NO | NO | NO |
> | FG-12 | External-action honesty (nothing submitted/sent unless founder records it) | YES | YES | YES | SIM | YES | YES | NO | NO | NO | NO | NO |
> | FG-13 | Google document generation dependency (investor pitch/demo materials via Google) | YES | PARTIAL | PARTIAL | SIM | YES | YES | CRED-Google | F-ACTION-connect | NO | NO | NO |
>
> Funding evidence: `founder/fundingPipeline.ts`, `grants/researchEngine.ts`,
> `grants/dataSources.ts`, `founderContent.ts`, `simulation/investorDemo.ts`,
> `Google` seam; validators `validate-funding-pipeline`,
> `validate-investor-demo`, `validate-google-integration`, `validate-command-centre`;
> specs `funding-pipeline`, `investor-demo`, `google-setup`,
> `founder-investor-centre`.
> **J. COMPANY / GOVERNMENT**
> | ID | Feature / Function | Req | Impl | Wired | Sim | Tested | E2E | Cred | F-Act | Def | Miss | Broke |
> |---|---|---|---|---|---|---|---|---|---|---|---|---|
> | CG-01 | Companies House (mock/real seam; reads company/officers/PSC/filings/charges; electronic auto-file REFUSED; manual register path) | YES | YES | YES | SIM | YES | YES | CRED-CH-key | F-ACTION-auth-code | NO | NO | NO |
> | CG-02 | Company data (registrar snapshot; profile, officers, PSC, filings, charges) | YES | YES | YES | SIM | YES | YES | NO | NO | NO | NO | NO |
> | CG-03 | Company control centre (deadlines 90/60/30/7/0; CS workflow Detect→Prepare→Notify→Review→Approve→File→Verify; founder-approval gate) | YES | YES | YES | SIM | YES | YES | NO | NO | NO | NO | NO |
> | CG-04 | GOV.UK One Login (descriptor surface; SIM descriptor only) | YES | PARTIAL | PARTIAL | SIM-descriptor | YES | YES | CRED-personal-code | F-ACTION | NO | NO | NO |
> | CG-05 | HMRC seam (VAT status reads mock; filings REFUSED; readiness `ready_not_connected`) | YES | PARTIAL | NO | SIM | YES | YES | CRED-after-VAT | F-ACTION-VAT-reg | **DEFERRED-until-VAT** | NO | NO |
> | CG-06 | VAT-related configuration (`VAT_TREATMENT=configuration_required`; no amount until configured) | YES | YES | YES | config-gated | YES | YES | NO | NO | NO | NO | NO |
> | CG-07 | Government workflow states (CS workflow + HMRC/GOV.UK states; truthful NOT-CONNECTED) | YES | YES | PARTIAL | SIM | YES | YES | NO | NO | NO | NO | NO |
> | CG-08 | Credential-dependent paths (CH key, GOV.UK code, VAT-registered MTD; vault-masked refs only) | YES | YES | YES | N/A | YES | YES | CRED | F-ACTION | NO | NO | NO |
> | CG-09 | Founder actions (enter/verify/clear government secrets in Super Admin) | YES | YES | YES | N/A | YES | YES | NO | **F-ACTION** | NO | NO | NO |
> | CG-10 | Live vs simulated behaviour (mock reads → live reads behind creds; business boundary: auto-file REFUSED) | YES | YES | YES | SIM→LIVE | YES | YES | CRED | NO | NO | NO | NO |
> | CG-11 | Prohibited / unsupported filing claims (never claims e-filed when not; manual-register path works) | YES | YES | YES | SIM | YES | YES | NO | NO | NO | NO | NO |
>
> Company evidence: `compliance/companiesHouseClient.ts` + Mock,
> `compliance/hmrcClient.ts` + Mock, `companyStore.ts`,
> `CompanyControlCentre.tsx`, `config/company.ts`, `config/commercial.ts`,
> `GOVERNMENT_SECRET_KINDS`, `storeGovernmentSecret`; validators
> `validate-company-control-centre`, `validate-mock-seam`; specs
> `company-control-centre`, `compliance-sim`.
>
> **K. GOOGLE WORKSPACE** (not reduced to one "Google integration" row)
> | ID | Feature / Function | Req | Impl | Wired | Sim | Tested | E2E | Cred | F-Act | Def | Miss | Broke |
> |---|---|---|---|---|---|---|---|---|---|---|---|---|
> | GW-01 | OAuth setup (client id entry, consent, code captured as `exchange_pending`) | YES | YES | YES | SIM | YES | YES | CRED-Google | F-ACTION-client-id | NO | NO | NO |
> | GW-02 | Connection state (exchange_pending ≠ connected enforced truthfully) | YES | YES | YES | SIM | YES | YES | NO | NO | NO | NO | NO |
> | GW-03 | Token exchange (code→token + Vault refresh Edge Function seam) | YES | YES | PARTIAL | — | YES | YES | CRED | F-ACTION-deploy-Edge | NO | NO | NO |
> | GW-04 | Google Drive (workspace plan runner; Mock-GD ids, idempotent) | YES | YES | PARTIAL | SIM | YES | YES | CRED-Google | F-ACTION-connect | NO | NO | NO |
> | GW-05 | Google Docs (document generation runner) | YES | YES | PARTIAL | SIM | YES | YES | CRED-Google | F-ACTION-connect | NO | NO | NO |
> | GW-06 | Google Sheets (spreadsheet generation runner) | YES | YES | PARTIAL | SIM | YES | YES | CRED-Google | F-ACTION-connect | NO | NO | NO |
> | GW-07 | Google Slides (presentation generation runner) | YES | YES | PARTIAL | SIM | YES | YES | CRED-Google | F-ACTION-connect | NO | NO | NO |
> | GW-08 | Document generation (real generation blocked on connect) | YES | PARTIAL | PARTIAL | SIM | YES | YES | CRED-Google | F-ACTION-connect | NO | NO | NO |
> | GW-09 | Spreadsheet generation (real generation blocked on connect) | YES | PARTIAL | PARTIAL | SIM | YES | YES | CRED-Google | F-ACTION-connect | NO | NO | NO |
> | GW-10 | Presentation generation (real generation blocked on connect) | YES | PARTIAL | PARTIAL | SIM | YES | YES | CRED-Google | F-ACTION-connect | NO | NO | NO |
> | GW-11 | Downstream investor/funding/company workflows (Doc/Sheet/Slide output consumed where intended) | YES | PARTIAL | PARTIAL | SIM | YES | YES | CRED-Google | F-ACTION-connect | NO | NO | NO |
> | GW-12 | Simulation equivalents (workspace plan runs mock; fail-closed) | YES | YES | YES | SIM | YES | YES | NO | NO | NO | NO | NO |
> | GW-13 | Live credential requirements (OAuth client id + Edge deploy; 2-step founder path) | YES | YES | PARTIAL | N/A | YES | YES | CRED | F-ACTION | NO | NO | NO |
>
> Google evidence: `google/googleClient.ts` + Mock, `google/workspaceSetup.ts`,
> `google/index.ts`, `GoogleSetupWizard.tsx`, `GOOGLE_WORKSPACE_PLAN`,
> `config/google.ts`, `src/lib/founder/documentExport.ts`; validators
> `validate-google-integration` (42 checks); spec `google-setup` (3/3).
> **L. COMMERCE / OPERATIONS** (chain edge-by-edge)
> | ID | Feature / Function | Req | Impl | Wired | Sim | Tested | E2E | Cred | F-Act | Def | Miss | Broke |
> |---|---|---|---|---|---|---|---|---|---|---|---|---|
> | CO-01 | Product → PO (createCommercePurchaseOrder from catalog submission) | YES | YES | YES | SIM | YES | YES | NO | NO | NO | NO | NO |
> | CO-02 | PO → acknowledgement (line-level, 24h, rejection codes) | YES | YES | YES | SIM | YES | YES | NO | NO | NO | NO | NO |
> | CO-03 | Acknowledgement → shipment (fulfil via ASN seam, `createShipmentForPO`) | YES | YES | YES | SIM | YES | YES | CRED-live-labels | NO | NO | NO | NO |
> | CO-04 | Shipment → receiving (delivery reconciliation; shortage deductions auto-raised) | YES | YES | YES | SIM | YES | YES | NO | NO | NO | NO | NO |
> | CO-05 | Receiving → invoice (invoice from commission lines; issue-unpaid honest) | YES | YES | YES | SIM | YES | YES | NO | NO | NO | NO | NO |
> | CO-06 | Invoice → payment (deterministic payment ↔ PO ↔ invoice reconciliation) | YES | YES | YES | SIM | YES | YES | CRED-Stripe-live | NO | NO | NO | NO |
> | CO-07 | Payment → exception / chargeback / case (deduction ledger, dispute, brand case→escalation) | YES | YES | YES | SIM | YES | YES | NO | NO | NO | NO | NO |
> | CO-08 | Exception → dispute → resolution (`resolveCommerceDispute`, audited) | YES | YES | YES | SIM | YES | YES | NO | NO | NO | NO | NO |
>
> Commerce evidence: `commerce/commerceLifecycle.ts`,
> `acknowledgeCommercePurchaseOrder`, `createShipmentForPO`,
> `receiveCommercePurchaseOrder`, `invoice.ts`, `recordCommercePayment`,
> `reconcilePayment`, `raiseCommerceException`, `resolveCommerceDispute`,
> `warehouse/returnsTracking.ts`; validators `validate-e4-commerce`,
> `validate-financial-reconciliation`; specs `po-lifecycle`, `shipment-asn`,
> `deductions`, `disputes`.
>
> **M. FINANCE**
> | ID | Feature / Function | Req | Impl | Wired | Sim | Tested | E2E | Cred | F-Act | Def | Miss | Broke |
> |---|---|---|---|---|---|---|---|---|---|---|---|---|
> | FN-01 | Finance dashboard (brand financial standing; admin accounting tiles) | YES | YES | YES | SIM | YES | YES | NO | NO | NO | NO | NO |
> | FN-02 | Xero (real OAuth client, demo mode; 28-day resync; `XeroConnection.tsx` is DEAD/broken code — replaced by AccountingPanel) | YES | YES | PARTIAL | SIM | YES | YES | CRED-Xero-connect | F-ACTION | NO | NO | **YES-dead-file** |
> | FN-03 | Accounting (accounting seam, journal/trial model) | YES | YES | YES | SIM | YES | YES | NO | NO | NO | NO | NO |
> | FN-04 | Invoices (generated from commission lines; paid marks invoice paid) | YES | YES | YES | SIM | YES | YES | NO | NO | NO | NO | NO |
> | FN-05 | Payments (payment↔PO↔invoice reconciliation; statuses pending/reconciled/exception) | YES | YES | YES | SIM | YES | YES | CRED-Stripe-live | NO | NO | NO | NO |
> | FN-06 | Margins (cost-price model, per-PO cost-price check, margin reporting) | YES | YES | YES | SIM | YES | YES | NO | F-ACTION-real-prices | NO | NO | NO |
> | FN-07 | VAT (treatment config-gated; no amount until configured) | YES | YES | YES | config-gated | YES | YES | NO | NO | NO | NO | NO |
> | FN-08 | Operating costs (13 lines; manual/estimated/simulated labels; cost + revenue streams incl. `advertising_commission`) | YES | YES | YES | SIM | YES | YES | NO | F-ACTION-real-prices | NO | NO | NO |
> | FN-09 | Financial exceptions (deductions, disputes, reconciliation exceptions) | YES | YES | YES | SIM | YES | YES | NO | NO | NO | NO | NO |
> | FN-10 | Stripe (flat monthly brand subscriptions; commission billing is event-driven, NOT Stripe) | YES | YES | YES | SIM | YES | YES | CRED-Stripe-OAuth | NO | NO | NO | NO |
> | FN-11 | Live-vs-simulation state (honest) | YES | YES | YES | SIM | YES | YES | NO | NO | NO | NO | NO |
> | FN-12 | Credential requirements (Xero connect, Stripe OAuth, Wise/Payoneer rails) | YES | YES | YES | N/A | YES | YES | CRED | F-ACTION | NO | NO | NO |
>
> Finance evidence: `finance/accountingSeam.ts`, `finance/financialReconciliation.ts`,
> `services/xero/*`, `config/operatingCosts.ts`, `config/commercial.ts`,
> `costs/costSummary.ts`, `billing/stripe.ts` + Mock, `billing/payouts.ts`;
> `AccountingPanel.tsx`; validators `validate-financial-reconciliation`,
> `validate-operating-costs`, `validate-payouts`; specs `billing`,
> `operating-costs`, `brand-payouts`, `xero`. **XeroConnection.tsx: DO NOT
> DELETE during reconciliation (standing rule) — Phase 1 candidate.**
> **N. SUPER ADMIN** (every agreed capability)
> | ID | Feature / Function | Req | Impl | Wired | Sim | Tested | E2E | Cred | F-Act | Def | Miss | Broke |
> |---|---|---|---|---|---|---|---|---|---|---|---|---|
> | SA-01 | Control centre (Super Admin dashboard + 19 tabs) | YES | YES | YES | SIM | YES | YES | NO | NO | NO | NO | NO |
> | SA-02 | Integration management (Integrations Hub: connect wizard, mode tiles, health) | YES | YES | YES | SIM | YES | YES | CRED-live-per-provider | NO | NO | NO | NO |
> | SA-03 | Integration modes (SIM/LIVE resolution via `defaultIntegrationMode`; `sandbox` flag) | YES | YES | YES | SIM | YES | YES | NO | NO | NO | NO | NO |
> | SA-04 | Health (integration health reporting; monitoring dashboard — **stats seeded**, not production-derived) | YES | PARTIAL | PARTIAL | SIM-seeded | YES | YES | NO | NO | NO | NO | NO |
> | SA-05 | Simulation controls (SimulationControl panel; scenario engine) | YES | YES | YES | SIM | YES | YES | NO | NO | NO | NO | NO |
> | SA-06 | Credentials / configuration (Super Admin secret entry; in-memory; vault-masked refs; NEVER plaintext records) | YES | YES | YES | N/A | YES | YES | CRED | F-ACTION-rotate-2-items | NO | NO | NO |
> | SA-07 | OpenRouter configuration (dedicated Mercenta key entry; in-memory; never hardcoded) | YES | YES | YES | CRED | YES | YES | CRED | NO | NO | NO | NO |
> | SA-08 | Provider status (per-provider status via Integrations Hub) | YES | YES | YES | SIM | YES | YES | NO | NO | NO | NO | NO |
> | SA-09 | Operating costs (OperatingCosts panel; cost + AI usage; founder-approved price inputs) | YES | YES | YES | SIM | YES | YES | NO | F-ACTION-real-prices | NO | NO | NO |
> | SA-10 | Access control (RBAC tiers, at-most-limited views, VIEW_ALLOWLIST, on-behalf audit attribution) | YES | YES | YES | N/A | YES | YES | NO | NO | NO | NO | NO |
> | SA-11 | Platform configuration (homepage editor, demo banner, tours configuration) | YES | YES | YES | SIM | YES | YES | NO | NO | NO | NO | NO |
> | SA-12 | Live/simulation distinction (status semantics, honest labelling everywhere) | YES | YES | YES | SIM | YES | YES | NO | NO | NO | NO | NO |
>
> Super Admin evidence: `SuperAdminPanel.tsx`, `IntegrationsPanel.tsx`,
> `SimulationControl.tsx`, `MonitoringDashboard.tsx`, `OperatingCostsPanel.tsx`,
> `HomepageEditor.tsx`, `auth/rbac.ts`, `integrations/registry.ts`,
> `integrations/IntegrationsContext.tsx`, `src/lib/monitoring/*`; validators
> `validate-operating-costs`, `validate-mock-seam`, `validate-mock-providers`,
> `validate-homepage-editor`; specs `admin-operational-surfaces`,
> `integration-hub`, `simulation-control`, `operating-costs`.
>
> **O. COMMAND CENTRE**
> | ID | Feature / Function | Req | Impl | Wired | Sim | Tested | E2E | Cred | F-Act | Def | Miss | Broke |
> |---|---|---|---|---|---|---|---|---|---|---|---|---|
> | CC-01 | Ranked queue (deterministic score → band → id ranking; all items 1..N) | YES | YES | YES | deterministic | YES | YES | NO | NO | NO | NO | NO |
> | CC-02 | WHY factor breakdown (8 declared factors; score = exact factor sum; no AI) | YES | YES | YES | deterministic | YES | YES | NO | NO | NO | NO | NO |
> | CC-03 | Relationship items (embassy-intro + trade-programme routes via canonical prospects; "no relationship exists yet" honesty) | YES | YES | YES | deterministic | YES | YES | NO | NO | NO | NO | NO |
> | CC-04 | Funding items (one item per real §10/§31 opportunity; canonical next action) | YES | YES | YES | deterministic | YES | YES | NO | NO | NO | NO | NO |
> | CC-05 | Partnership items (prospective routes only; no invented partner) | YES | YES | YES | deterministic | YES | YES | NO | NO | NO | NO | NO |
> | CC-06 | CTAs (every CTA lands on the screen that performs the action; validated) | YES | YES | YES | deterministic | YES | YES | NO | NO | NO | NO | NO |
> | CC-07 | Routing (tab-aware `requestAdminNav`/`consumeAdminNavRequest`; dead-button prevention) | YES | YES | YES | deterministic | YES | YES | NO | NO | NO | NO | NO |
> | CC-08 | Action states (band/status shown; actions actionable) | YES | YES | YES | deterministic | YES | YES | NO | NO | NO | NO | NO |
> | CC-09 | Downstream workflow connections (BI→ICP→CRM→outreach→onboarding; funding→company/gov; operational events→launch/demo) | YES | YES | YES | deterministic | YES | YES | NO | NO | NO | NO | NO |
>
> Command Centre evidence: `lib/commandCentre/commandCentre.ts`
> (`COMMAND_FACTORS`, `commandWhy`, `rankQueue`), `CommandCentre.tsx`,
> `adminNav.ts`; validator `validate-command-centre` (39 checks); spec
> `command-centre` (4/4): every rendered row shows rank + WHY; basis says NO AI.
>
> **P. LAUNCH CENTRE**
> | ID | Feature / Function | Req | Impl | Wired | Sim | Tested | E2E | Cred | F-Act | Def | Miss | Broke |
> |---|---|---|---|---|---|---|---|---|---|---|---|---|
> | LC-01 | Launch functionality (14 declared platforms; prepare package) | YES | YES | YES | SIM | YES | YES | NO | NO | NO | NO | NO |
> | LC-02 | State transitions (Prepare ≠ Submitted enforced; submission is internal record, not API call) | YES | YES | YES | SIM | YES | YES | NO | NO | NO | NO | NO |
> | LC-03 | Copy package (per-platform copy; prepared on request) | YES | YES | YES | SIM | YES | YES | NO | NO | NO | NO | NO |
> | LC-04 | Verify checklist (founder-completed verify list per platform) | YES | YES | YES | SIM | YES | YES | NO | NO | NO | NO | NO |
> | LC-05 | Audit (launch events in audit trail) | YES | YES | YES | SIM | YES | YES | NO | NO | NO | NO | NO |
>
> Launch evidence: `launchStore.ts`, `launchPlatforms.ts` (14 platforms),
> `LaunchCentre.tsx`; validator `validate-launch-centre`; spec `launch-centre` (3/3).
> **Q. PLATFORM AI (MERCENTA RUNTIME AI)** — verified against the agreed rule
> | ID | Feature / Function | Req | Impl | Wired | Sim | Tested | E2E | Cred | F-Act | Def | Miss | Broke |
> |---|---|---|---|---|---|---|---|---|---|---|---|---|
> | PA-01 | Dedicated Mercenta OpenRouter key (Super Admin in-memory entry; NEVER hardcoded; `VITE_OPENROUTER_API_KEY` env-hint only) | YES | YES | YES | CRED | YES | YES | CRED | NO | NO | NO | NO |
> | PA-02 | FREE models only — **BOTH runtime tasks have `freeModelSufficient: false` → resolve to paid `deepseek/deepseek-v4-flash` when a key is present** | YES | **PARTIAL** | **PARTIAL** | SIM-default | YES | YES | CRED | NO | NO | NO | **NO-code-defect-but-spec-conflict** |
> | PA-03 | No paid runtime model usage — **`MAX_PAID_RUNTIME_MODEL` IS a paid model; `isModelAllowed` permits it; £0.02/call budget is a ceiling, not a prohibition → VIOLATES agreed "FREE ONLY / NO PAID"** | YES | PARTIAL | PARTIAL | N/A | YES | YES | CRED | NO | NO | NO | **SPEC-CONFLICT — REQUIRES SPECIFICATION RECONCILIATION** (do not modify in 0B) |
> | PA-04 | No substitution of another/default OpenRouter key; no Cline model for runtime | YES | YES | YES | N/A | YES | YES | NO | NO | NO | NO | NO |
> | PA-05 | Deterministic-first (rules/business logic before any model; `RUNTIME_TASKS` declared) | YES | YES | YES | deterministic | YES | YES | NO | NO | NO | NO | NO |
> | PA-06 | Simulation/demo must not consume paid credits unnecessarily (call sites default to mock; real only behind key; usage log + ceilings) | YES | YES | YES | SIM | YES | YES | CRED | NO | NO | NO | NO |
> | PA-07 | Super Admin configurability of the key | YES | YES | YES | CRED | YES | YES | CRED | NO | NO | NO | NO |
>
> **Platform AI verdict (RECORD — DO NOT MODIFY):** dedicated-key rule,
> deterministic-first, config-safety and call-site gating all conform. But the
> **"FREE models only, no paid" rule is NOT met**: both declared runtime tasks
> resolve `paid_max` with a paid model when a key is supplied, `isModelAllowed`
> permits the paid max, and the per-op budget is a ceiling, not an absolute
> prohibition. Recorded as a **spec-vs-implementation conflict for Phase 1**
> (candidate: force `free_model` only, or obtain an explicit founder written
> exemption changing the agreed rule). Cline's own dev model was NOT changed.
>
> Evidence: `src/lib/costs/modelPolicy.ts`, `src/lib/costs/usageLog.ts`,
> `src/lib/discovery/engine.ts`, `src/lib/monitoring/alertTriage.ts`,
> `src/integrations/IntegrationsContext.tsx` (in-memory key, env-hint auto-connect),
> `OperatingCostsPanel.tsx`; validator `validate-operating-costs`; spec `operating-costs`.
> **R. INTEGRATIONS** (per-provider — registry `INTEGRATION_ORDER` = 22 entries)
> | ID | Provider | Registered id | Mode today | Mock/real seam | Sim | Tested | E2E | Cred | F-Act | Def | Miss | Broke | Downstream |
> |---|---|---|---|---|---|---|---|---|---|---|---|---|---|
> | IN-01 | Amazon SP-API | `amazon_sp_api` | SIM | `src/lib/spapi/*` | YES | YES | YES | CRED | NO | NO | NO | NO | Amazon ops, PO feeds |
> | IN-02 | **Amazon Ads** | `amazon_ads` | available → **REQUIRED build** | registry card only | PARTIAL | PARTIAL | NO | CRED | NO | NO | **YES-dashboard** | NO | advertising dashboard (MISSING) |
> | IN-03 | Stripe | `stripe` | SIM | `billing/stripe.ts` + Mock | YES | YES | YES | CRED-OAuth | NO | NO | NO | NO | brand subscriptions |
> | IN-04 | eSignature | `esignature` | available | `lib/esign/esign.ts` | YES | YES | YES | CRED | NO | NO | NO | NO | agreements/contracts |
> | IN-05 | Email | `email` | available | `messaging/email.ts`, `postmarkNotifier` | YES | YES | YES | CRED-Postmark | NO | NO | NO | NO | notifications, outreach |
> | IN-06 | Lead sourcing | `lead_sourcing` | available | CSV zero-API + Apollo/Instantly | YES | YES | YES | CRED | NO | NO | NO | NO | acquisition pipeline |
> | IN-07 | OpenRouter | `openrouter` | available | `modelPolicy`/`usageLog` | YES | YES | YES | CRED | NO | NO | NO | NO | runtime AI (see Q) |
> | IN-08 | Hunter | `hunter` | available | `hunterClient` | YES | YES | YES | CRED | NO | NO | NO | NO | contact verification |
> | IN-09 | Instantly | `instantly` | available | `instantly` seam | YES | YES | YES | CRED | NO | NO | NO | NO | outreach send |
> | IN-10 | Keepa | `keepa` | available | `research/keepaClient.ts` | YES | YES | YES | CRED | NO | NO | NO | NO | ASIN/estimation |
> | IN-11 | Firecrawl | `firecrawl` | available | `discovery/firecrawlClient.ts` | YES | YES | YES | CRED | NO | NO | NO | NO | discovery research |
> | IN-12 | Usertour | `usertour` | SIM | `lib/usertour/*` | YES | YES | YES | NO | NO | NO | NO | NO | guided tours |
> | IN-13 | Twilio WhatsApp | `twilio_whatsapp` | available | `whatsapp/whatsAppClient.ts` | YES | YES | YES | CRED | NO | NO | NO | NO | case escalation |
> | IN-14 | Postiz | `postiz` | available | `postizClient.ts` + social engine | YES | YES | YES | CRED | NO | NO | NO | NO | Mercenta Social |
> | IN-15 | DHL | `dhl` | SIM | `lib/dhl/*` | YES | YES | YES | CRED | NO | NO | NO | NO | shipment labels |
> | IN-16 | Palletline | `palletline` | SIM | `lib/palletline/*` | YES | YES | YES | CRED | NO | NO | NO | NO | shipment labels |
> | IN-17 | Xero | `xero` | SIM demo | `services/xero/*` | YES | YES | YES | CRED-connect | F-ACTION | NO | NO | NO | accounting |
> | IN-18 | Companies House | `companies_house` | SIM | `compliance/companiesHouse*.ts` | YES | YES | YES | CRED | F-ACTION-auth | NO | NO | NO | company control centre |
> | IN-19 | HMRC | `hmrc` | SIM | `compliance/hmrc*.ts` | YES | YES | YES | CRED-after-VAT | F-ACTION | **DEFERRED-until-VAT** | NO | NO | VAT/filings |
> | IN-20 | Wise | `wise` | SIM | `billing/payouts.ts` | YES | YES | YES | CRED | NO | NO | NO | NO | brand payouts |
> | IN-21 | Payoneer | `payoneer` | SIM | `billing/payouts.ts` | YES | YES | YES | CRED | NO | NO | NO | NO | brand payouts |
> | IN-22 | Google | `google` | SIM | `google/*` | YES | YES | YES | CRED | F-ACTION-2-step | NO | NO | NO | Docs/Sheets/Slides workflows |
> **R2 — providers NOT in the registry (documentation & infra truth):**
> | ID | Provider | Status | Evidence |
> |---|---|---|---|
> | R2-01 | Namecheap (deploy FTP) | LIVE deploy channel, NOT a registry card; **F-ACTION: rotate FTP password** (old value in past commits) | `scripts/deploy-demo.sh`, `.env` |
> | R2-02 | DigitalOcean (3 droplets) | LIVE paid infra, NOT a card | Operating Costs, HANDOFF |
> | R2-03 | Supabase (browser keys / RLS) | Infra; demo memory-only; durable path proven, unexecuted (F-ACTION) | `src/lib/supabase.ts`, `supabase/migrations` |
> | R2-04 | Facebook / Instagram / X | channel-only (Postiz/MercentaSocial + application link-verify) | `PartnerApplicationForm.tsx`, `mercentaSocial` config |
> | R2-05 | Explee | **NOT agreed — never a REQ (0A.17.6); candidate only in INTEGRATIONS.md §4 → `REQUIRES SPECIFICATION RECONCILIATION` if founder wants it** | `docs/INTEGRATIONS.md` |
> | R2-06 | LinkedIn Sales Nav | documented as a candidate/data provider in older docs; not registered → `REQUIRES SPECIFICATION RECONCILIATION` if agreed | docs |
>
> **Doc drift recorded:** `docs/INTEGRATIONS.md` says "18 integrations today"
> with a 14-row table while the source registry has 22 (0A.4) — unchanged by
> this pass; Phase 1 doc-fix candidate.
>
> **S. RAKAZO**
> | ID | Feature / Function | Req | Impl | Wired | Sim | Tested | E2E | Cred | F-Act | Def | Miss | Broke |
> |---|---|---|---|---|---|---|---|---|---|---|---|---|
> | RZ-01 | Rakazo bot-fleet integration | YES (final phase) | PARTIAL (iframe only) | NO | N/A | YES-registration-spec-only | YES-registration-spec-only | NO | NO | **DEFERRED — FINAL PHASE** | YES-fleet | NO |
>
> Rakazo = **INTENTIONALLY DEFERRED / FINAL PHASE.** Separate bot
> infrastructure + API key; NOT part of core build; core Mercenta product must
> be completed first. NOT touched/modified/tested/wired/registered/consumed
> this session (record only). `RakazoPanel.tsx` iframe + `e2e/rakazo.spec.ts`
> (registration assertions only) unchanged.
>
> **T. UI/UX — FUTURE REDESIGN (preserved requirement, NOT implemented)**
> After core build completion + regression + deployment: **UI REDESIGN PHASE**
> — Apple-inspired premium visual language; clean/sleek/smooth; premium over
> generic/bootstrapped; colourful but restrained; premium Apple-like palette;
> light/dark mode; elegant buttons; refined typography; less excessive
> rounding; premium spacing; polished navigation/sidebar; premium cards;
> beautiful, **thin/sleek/refined** charts (not thick generic bars/lines);
> premium doughnut charts; sophisticated status/category colour coding; brands
> should enjoy the dashboard. Functionality preserved; **no regressions; no
> feature changes merely for aesthetics; NO redesign before the core build is
> declared complete.** Frozen design remains the demo baseline (0A.16).
> ### 0B.3 CROSS-PLATFORM DATA-FLOW MATRIX (edge-by-edge, corrected)
>
> Per-edge columns: **Src** source exists · **Dst** destination exists ·
> **Prop** data propagated/reference-linked · **Sim** simulation works ·
> **Test** deterministic test exists · **E2E** browser spec exists ·
> **Broke** broken · **Miss** missing · **Cred** credential-dependent.
>
> **CHAIN A — Brand onboarding → product → catalogue → compliance → submission
> → Amazon/Vendor simulation → PO → acknowledgement → shipment → receiving →
> invoice → payment → exception/chargeback**
> | Edge | Src | Dst | Prop | Sim | Test | E2E | Broke | Miss | Cred |
> |---|---|---|---|---|---|---|---|---|---|
> | onboarding → product | YES | YES | YES | YES | YES | YES | NO | NO | NO |
> | product → catalogue | YES | YES | YES | YES | YES | YES | NO | NO | NO |
> | catalogue → compliance | YES | YES | YES | YES | YES | YES | NO | NO | NO |
> | compliance → submission | YES | YES | YES | YES | YES | YES | NO | NO | NO |
> | submission → Amazon/Vendor simulation | YES | YES | YES | YES | YES | YES | NO | NO | NO |
> | Amazon/Vendor sim → PO | YES | YES | YES | YES | YES | YES | NO | NO | NO |
> | PO → acknowledgement | YES | YES | YES | YES | YES | YES | NO | NO | NO |
> | acknowledgement → shipment | YES | YES | YES | YES | YES | YES | NO | NO | CRED-live-labels |
> | shipment → receiving | YES | YES | YES | YES | YES | YES | NO | NO | NO |
> | receiving → invoice | YES | YES | YES | YES | YES | YES | NO | NO | NO |
> | invoice → payment | YES | YES | YES | YES | YES | YES | NO | NO | CRED-Stripe-live |
> | payment → exception/chargeback | YES | YES | YES | YES | YES | YES | NO | NO | NO |
> | exception → dispute/case | YES | YES | YES | YES | YES | YES | NO | NO | NO |
> **Chain A verdict: ONE connected deterministic lifecycle (25-stage demo proof);
> no edge missing; live lanes (carriers/Stripe) are CRED/F-ACTION only.**
>
> **CHAIN B — Brand Intelligence → opportunity → ICP → prospect → CRM →
> outreach → response → relationship → Command Centre**
> | Edge | Src | Dst | Prop | Sim | Test | E2E | Broke | Miss | Cred |
> |---|---|---|---|---|---|---|---|---|---|
> | BI → opportunity | YES | YES | YES | YES | YES | YES | NO | NO | NO |
> | opportunity → ICP | YES | YES | YES | YES | YES | YES | NO | NO | NO |
> | ICP → prospect | YES | YES | YES | YES | YES | YES | NO | NO | NO |
> | prospect → CRM | YES | YES | YES | YES | YES | YES | NO | NO | NO |
> | CRM → outreach | YES | YES | YES | YES | YES | YES | NO | NO | CRED-live-send |
> | outreach → response | YES | YES | YES | YES | YES | YES | NO | NO | NO |
> | response → relationship | YES | YES | YES | YES | YES | YES | NO | NO | NO |
> | relationship → Command Centre | YES | YES | YES | YES | YES | YES | NO | NO | NO |
> **Chain B verdict: connected (Phase C/D2/D4); only PART = durable persistence
> memory-only in demo (D4 schema unexecuted, Supabase creds F-ACTION).**
>
> **CHAIN C — Funding → grants/investors → approval → Google Docs/Sheets/Slides
> → investor/demo lifecycle → Launch Centre**
> | Edge | Src | Dst | Prop | Sim | Test | E2E | Broke | Miss | Cred |
> |---|---|---|---|---|---|---|---|---|---|
> | funding → grants/investors | YES | YES | YES | YES | YES | YES | NO | NO | NO |
> | grants/investors → approval | YES | YES | YES | YES | YES | YES | NO | NO | NO |
> | approval → application record | YES | YES | YES | YES | YES | YES | NO | NO | NO |
> | application → Google Docs/Sheets/Slides | YES | PARTIAL | PARTIAL | YES | YES | YES | NO | NO | CRED-Google + F-ACTION-connect |
> | Google → investor/demo lifecycle | YES | Y-(runner)/NO-(real) | PARTIAL | YES | YES | YES | NO | NO | CRED-Google + F-ACTION |
> | investor/demo lifecycle → Launch Centre | YES | YES | YES | YES | YES | YES | NO | NO | NO |
> **Chain C verdict: internally wired + founder-gated; Google real generation is
> the ONLY missing/live edge (2-step F-ACTION) — no fabricated external
> submission anywhere.**
>
> **CHAIN D — Company/Government → Companies House → GOV.UK → HMRC → company
> controls → Command Centre / Launch Centre where intended**
> | Edge | Src | Dst | Prop | Sim | Test | E2E | Broke | Miss | Cred |
> |---|---|---|---|---|---|---|---|---|---|
> | company centre → Companies House | YES | YES | YES | YES | YES | YES | NO | NO | CRED-reads |
> | Companies House → GOV.UK | YES | PARTIAL | PARTIAL | YES | YES | YES | NO | NO | CRED-personal-code |
> | GOV.UK → HMRC | YES | PARTIAL | PARTIAL | YES | YES | YES | NO | NO | CRED-after-VAT |
> | HMRC → company controls | YES | YES | YES | YES | YES | YES | NO | NO | NO |
> | company controls → Command Centre | YES | YES | YES | YES | YES | YES | NO | NO | NO |
> | company controls → Launch Centre | YES | YES | YES | YES | YES | YES | NO | NO | NO |
> **Chain D verdict: connected; GOV.UK descriptor + HMRC waits on founder
> actions; auto-file permanently REFUSED (honesty preserved).**
>
> **Cross-cutting: `src/components/shared/BrandComm.tsx` slug drift vs
> `demoStore` (SSOT finding) and `XeroConnection.tsx` dead syntax-broken file —
> BROKEN (dead-code) records, NOT fixed this pass (Phase 1 candidates).**
> ### 0B.4 NEXT BUILD QUEUE (generated from the corrected feature-level truth)
>
> Ordered by dependency. Distinguishes: **A** genuinely missing (agreed) ·
> **B** partially implemented requiring completion · **C** broken requiring
> repair · **D** simulation-first · **E** credential/founder actions ·
> **F** intentionally deferred · **G** final UI redesign · **H** Rakazo LAST ·
> **I** post-build security work.
>
> | # | Item | Category | Depends on | Exact remaining work | Evidence |
> |---|---|---|---|---|---|
> | 1 | Amazon Ads dashboard surface (agreed §12) | **A + D (simulation-first)** | none (seam already exists) | Build the dashboard as a simulation-first consumer of the EXISTING `useAdSpendBudgets()` seam (`AdSpendBudget`: monthly budget / spend-to-date / ACOS / TACOS / status per brand; operating-costs `advertising_commission` linkage; registry card already renders). Add validator + e2e spec. Live connection behind credentials. | 0B.1, AV-07/AV-08, IN-02 |
> | 2 | `docs/INTEGRATIONS.md` registry-count truth (18/14-row vs source 22) | **C (doc)** | none | Update to 22 rows mirroring `INTEGRATION_ORDER`; add amazon_ads row detail; remove stale "18". | 0A.4, R2 |
> | 3 | `BrandComm.tsx` slug drift vs `demoStore` (SSOT) | **C (code)** | none | Align the placeholder-slug regex/logic to the canonical `demoStore` helper (behaviour-preserving). | 0A.3, 0A.18, 0B.3 |
> | 4 | `XeroConnection.tsx` dead syntax-broken unimported file | **C (code)** | none | Remove file + its imports/references (Xero lives in `AccountingPanel.tsx`). **Approval gate: standing rule says do NOT delete during reconciliation — this is a Phase 1 item requiring explicit session approval.** | 0A.18.2, FN-02 |
> | 5 | Platform AI "FREE only / NO PAID" spec-vs-implementation conflict | **B + spec** | none (decision only) | Founder decision required: either force `free_model` only in `selectRuntimeModel`/`isModelAllowed`, or grant an explicit written exemption changing the agreed rule. No code change until founder decides. | 0B Q, PA-02/PA-03 |
> | 6 | `requirements-registry.json` Amazon Ads entry (0 hits today) | **B (data)** | none | Add `amazon_ads` rows to the registry (AdSpendBudget seam + dashboard requirement) so the registry stops contradicting the agreed scope. | 0B.1 |
> | 7 | Bi-discovery scheduler (0A.17.3) | **B** | #1 (dashboard pattern) | Add operator-visible scheduled discovery trigger OR declare it intentionally operator-triggered (founder decision). | 0A.17.3 |
> | 8 | §16–§29 embassy/trade partnership pipeline beyond prospective slots (0A.17.4) | **B** | none | Decide scope; currently truthful prospective-route slots only. | 0A.17.4, HANDOFF STILL OPEN #5 |
> | 9 | END-TO-END wiring reconciliation (Phase 1/2 merge) | **A** | #1-#8 | Bounded across-chain propagation verification using existing gates + investor demo. | 0A.24, FINAL BUILD QUEUE |
> | 10 | FULL REGRESSION | **A** | #9 | tsc/eslint/build/wording/all validators/RLS/integrity/Playwright `--workers=2` + investor demo. | FINAL BUILD QUEUE §2 |
> | 11 | DECLARE CORE BUILD COMPLETE | **F-ACTION** | #10 | Founder accepts F-ACTION list as out-of-scope. | 0A.24.4 |
> | 12 | Deploy + re-verify demo.mercenta.co.uk | **E** | #11 | `scripts/deploy-demo.sh` (Namecheap FTP — **rotate password first**); HTTPS 200 + demo run. | 0A.21.6, FINAL BUILD QUEUE §3 |
> | 13 | Credential / founder actions | **E** | parallel | Google OAuth client id + Edge deploy · CH key + auth code · GOV.UK personal code · HMRC post-VAT · real cost prices · Tottenham ASIN evidence · Twilio 2FA + Namecheap rotation · Supabase browser keys (durable persistence). | 0A.20/0A.21 |
> | 14 | UI REDESIGN PHASE | **G** | #12 | Apple-inspired premium direction (0B T / 0A.16); functionality preserved; regression after. | 0B T |
> | 15 | RAKAZO | **H — FINAL** | #14 | Fleet integration (17 bots); core product completed first. | RZ-01 |
> | 16 | Post-build security audit + credential cleanup + RLS hardening migration | **I** | #15 | Rotations, ZIP/git-history review, `ENABLE ROW LEVEL SECURITY` migration for shipping_margins/audit_log/leads/integration_connections; verify disabled Rakazo cannot use platform OpenRouter credits. | FINAL BUILD QUEUE DEFERRED |
>
> **Dependency-short:** #1→#7→#9→#10→#11→#12→#14→#15→#16; #2–#6, #8, #13 are
> independently schedulable. **Amazon Ads (#1) is REQUIRED build work and is
> deliberately FIRST so the agreed scope is reconnected before any sync pass.**
> Items #3/#4 need explicit Phase 1 approval (they touch code); #5 needs an
> explicit founder decision; ALL other code on this queue is Phase-1-scoped.
> ### 0B.5 CLASSIFICATION AGGREGATES (corrected truth)
> - **Newly discovered missing functionality (agreed but absent/incomplete):**
>   1. **Amazon Ads dashboard surface** — AV-08 / 0B.1 (the reason for this pass).
>   2. `requirements-registry.json` has NO Amazon Ads entry (registry gap).
>   3. BI discovery scheduler (0A.17.3 — retained).
>   4. §16–§29 embassy/trade partnership pipeline (0A.17.4 — retained).
>   5. Google real Docs/Sheets/Slides generation (runner exists; live blocked on
>      connect — CRED/F-ACTION, not missing code).
>   6. No other feature-level gaps: every other agreed row is IMPLEMENTED +
>      SIM + TESTED with real evidence above.
> - **Partially implemented / partially wired:** Amazon Ads (data seam, no
>   surface) · Keepa/Firecrawl/Hunter/Instantly/Postmark live · Xero live
>   connect · Google connect+tokens · GOV.UK descriptor · HMRC seam ·
>   acquisition durable persistence (schema proven, unexecuted) · monitoring
>   health/campaign stats (seeded) · live outreach/email/WhatsApp/Postiz sends
>   · live carrier labels · live Stripe · live Wise/Payoneer rails.
> - **Broken:** `XeroConnection.tsx` (dead, syntax-broken, unimported) ·
>   `BrandComm.tsx` slug drift (SSOT deviation) · `docs/INTEGRATIONS.md`
>   registry-count stale (18 vs 22) · `requirements-registry.json` missing
>   Amazon Ads entry. **None were modified this pass.**
> - **Credential-dependent (CRED; not missing):** Amazon SP-API/Ads · Stripe ·
>   Xero connect · Keepa · Firecrawl · Hunter · Instantly · Postmark/SendGrid ·
>   Twilio WhatsApp · DHL/Palletline live labels · Wise/Payoneer rails ·
>   Companies House reads · GOV.UK One Login · HMRC (after VAT registration) ·
>   Google OAuth + Edge deploy · Supabase browser keys (durable) · OpenRouter key.
> - **Founder actions (F-ACTION):** full list at 0A.21 (Google 2-step, CH auth,
>   GOV.UK code, VAT registration, real cost prices, Tottenham ASIN evidence,
>   deploy, **Twilio 2FA + Namecheap FTP rotations**, Supabase keys), plus a NEW
>   founder decision on the Platform AI paid-model policy (0B Q / PA-03).
> - **Intentionally deferred:** Rakazo (FINAL) · UI redesign (post-core) ·
>   HMRC live (post-VAT) · security/credential remediation (post-build) ·
>   post-build RLS hardening migration (category I).
> - **REQUIRES SPECIFICATION RECONCILIATION** (cannot be proven agreed from the
>   repo — do NOT guess): Explee (0A.17.6) · LinkedIn Sales Nav (docs candidate
>   only) · the advertising-metrics SURFACE SCOPE of Amazon Ads (existence is
>   agreed; metric granularity is not) · Platform AI paid-model policy
>   (conflict; founder decision needed) · BI discovery scheduler (operator-
>   triggered vs scheduled).
> - **Explicitly NOT reduced below feature level:** Brand Intelligence (19
>   rows) · Google Workspace (13 rows) · Integrations (22 providers + 6
>   infra/channel rows) · commerce chain edge-by-edge (Chains A–D) ·
>   CRM/outreach/funding row-by-row.
>
> ### 0B.6 VERIFICATION PERFORMED (this pass, read-only)
> - `git rev-parse HEAD` → `91bc2916f5e0359161a8c20f34862afac426b9aa`
>   (branch `redesign/foundation`; protected baseline `959b4d2` = ancestor).
> - `git status --short` → working tree carries only pre-existing state:
>   3 user-reserved untracked `design/*.png` + modified `PROJECT_STATUS.md` /
>   `HANDOFF.md` / `Review Zip/mercenta-review.zip` (Phase 0A content was
>   uncommitted work-tree state; **nothing committed by this pass**).
> - Grep evidence: `useAdSpendBudgets|fetchAdSpendBudgets` → **0 consumers**;
>   `ad_spend|amazon_ads|AdSpend` in requirements-registry → **0 hits**;
>   `INTEGRATION_ORDER` → 22; `launchPlatforms.ts` → 14; validators → 72;
>   e2e specs → 53; `AdSpendBudget` document comment `§12` confirmed.
> - Source inspected: `modelPolicy.ts`, `usageLog.ts`, `engine.ts`,
>   `alertTriage.ts`, `IntegrationsContext.tsx`, `registry.ts`, `api.ts`,
>   `queries.ts`, `demoStore.ts`, `types.ts`, `export-review-zip.sh`,
>   `MERCENTA_PRODUCT_CONTRACT.md`, `MERCENTA_ARCHITECTURE.md` §12,
>   `MERCENTA_PRODUCT_ARCHITECTURE_AUDIT_2026-09-10.md` §19.
> - **No Mercenta runtime AI invoked · no Rakazo call · no source/test/
>   validator/registry/UI change · no commit by this pass.**
>
> **END OF PHASE 0B — CORRECTIVE RECONCILIATION COMPLETE. 0B supersedes Phase 0A
> and the 37-row matrix wherever they conflict (Amazon Ads = REQUIRED /
> PARTIALLY IMPLEMENTED / INCOMPLETE / simulation-first / dashboard REQUIRED;
> the "no genuinely missing build work" claim is corrected). Phase 1 must be
> generated from 0B.4. STOP — Phase 1 NOT started.**

> ## 🔖 CONTINUATION CHECKPOINT — VERIFIED + SECURITY FINDING (2026-09-15, session 2)
>
> **Checkpoint verified (read-only, this session):** HEAD `f2a7434` on
> `redesign/foundation`; protected baseline `959b4d2` confirmed an ancestor
> (`git merge-base --is-ancestor` → YES); `git status --short` → **clean, no
> untracked files**. Nothing was rebuilt and no verified invariant was disturbed.
>
> **M13 phases A–G status:** the M13 queue is COMPLETE (Phases 3, 8, 9, 10, 11, 12,
> 13, 14, 15 — see the table below). The only M13 items still open are CREDENTIAL /
> FOUNDER actions (Google OAuth client id, Companies House + GOV.UK codes, HMRC,
> Google Edge Function deploy, real cost prices, Tottenham ASIN evidence capture,
> Twilio recovery-code rotation) — no build work.
>
> ### ⚠️ SECURITY FINDING — TRACKED CREDENTIAL (FIXED IN THE WORKING TREE)
> `HANDOFF.md` contained the **Namecheap FTP password as a LITERAL** in the
> "PROMPT: Namecheap FTP Deploy" block. It was the ONLY tracked file holding a
> literal (`.env` / `.env.deploy` are gitignored and keep the value; `scripts/deploy-demo.sh`,
> `GO_LIVE.md` and `docs/INTEGRATIONS.md` reference the VARIABLE NAME only).
> **Fixed:** the literal is replaced with a masked reference.
> **STILL REQUIRED FROM THE FOUNDER (not a build task):** the value remains in past
> Git commits, so **ROTATE the Namecheap FTP password** (rotation is the fix;
> history rewrite is forbidden by the standing rules). The new value goes in `.env`
> only — never in a doc, source file, report, prompt or generated artefact.
>
> ### ✅ PHASE §10/§31 — REAL FOUNDER OPPORTUNITIES + APPROVAL-GATED APPLICATION PIPELINE (DONE)
> Identified from the checkpoint (not assumed) and then BUILT this session:
> * §10's three REAL founder opportunities (**Solo Founders Program**, **The
>   Bridge**, **Ignyte by DIFC**) existed **nowhere** in the repo (grep: 0 hits)
>   → now carried as real records with their exact URLs and claim classes.
> * §31's funding/accelerator pipeline (DISCOVERED → … → DECISION,
>   founder-approval-gated) did **not** exist → now implemented with a real gate.
> * **GENUINE DEFECT FOUND AND FIXED:** `GrantsInvestorsSection.tsx` told the
>   founder an application was *"marked as submitted"* and rendered the legacy
>   draft status as `submitted`, when no external submission had happened. The
>   claim is now labelled **"internally approved — NOT submitted externally"**, and
>   the notices say nothing was submitted/sent. (`researchEngine.ts` still sets the
>   legacy internal `status: 'submitted'` field — see REMAINING.)
>
> **FILES CHANGED (5 code/test + 2 docs):**
> | File | Change |
> |---|---|
> | `src/lib/founder/fundingPipeline.ts` | **NEW** — the 3 real §10 opportunities (claim-classed, terms the research did not state left `null`), the §31 stage machine, the founder-approval gate, deterministic application generation linted by the EXISTING wording gates, and the founder queue summary. Zero network, zero model calls. |
> | `src/components/admin/GrantsInvestorsSection.tsx` | **EXTENDED** (existing content untouched) — new "Founder funding & accelerator pipeline" card in the existing Super Admin **Grants & Investors** tab; the false submission wording fixed. |
> | `scripts/validate-funding-pipeline.mjs` | **NEW** — 43 deterministic checks. |
> | `e2e/funding-pipeline.spec.ts` | **NEW** — 3 browser tests. |
> | `scripts/validate-e6-brand-surfaces.mjs` / `scripts/validate-e7-embedded-social.mjs` | **DECLARED** the new surface (the sanctioned pattern; nothing outside the declared set is accepted). |
> | `PROJECT_STATUS.md`, `HANDOFF.md` | checkpoint + the credential redaction. |
>
> **PRESERVED:** the M11/M12/M13 engines, the ASIN-level Brand Intelligence, the
> Opportunity Discovery layer, the Partnerships/Fundraising Centre, the Founder
> Investor Centre, the command centre, RBAC/RLS and the design system were not
> touched. The new module REUSES the existing claim classes, the existing wording
> gates, the canonical founder content and the canonical brand/domain config.
>
> **VERIFIED THIS SESSION (real output):**
> | Gate | Result |
> |---|---|
> | `npx tsc --noEmit -p tsconfig.app.json` | **0 errors** |
> | `eslint` on every touched file | **clean** |
> | `npm run build` | **✓ built** |
> | `node scripts/validate-funding-pipeline.mjs` | **PASS — 43 checks** |
> | `npx playwright test e2e/funding-pipeline.spec.ts` | **3 passed / 0 failed** |
> | Affected-spec run (app-shell, dashboard, command-centre, company-control-centre, launch-centre, opportunity-discovery) | **47 passed / 0 failed** |
> | Validator/audit sweep (74 scripts incl. `rls-audit`, `integrity-audit`) | **0 failures** |
> | `node scripts/rls-audit.mjs` | **PASS** (33 tables, 94 checks) |
> | `node scripts/integrity-audit.mjs` | **PASSED — 61/61, 100%** |
> | `scripts/validate-e6-brand-surfaces.mjs` / `validate-e7-embedded-social.mjs` | **PASS / 121 assertions 0 failures** |
> | `node scripts/lint-wording.mjs` | **PASS — 218 files, 0 violations** |
> | Full Playwright suite, `fullyParallel` (default) | one run showed 222 passed / **58 failed** / 2 skipped — **ENVIRONMENTAL, PROVEN**: the machine was at load 19-20 with a stray vite server; every failure was a click/10s-wait timeout in specs untouched by this phase |
> | Those SAME 16 spec files re-run with `--workers=2` | **105 passed / 0 failed — exit 0** (3.9 min) |
> | **FULL Playwright suite re-run with `--workers=2` (FINAL)** | **280 passed / 0 failed / 2 skipped (282) — exit 0** (10.8 min). The 277→280 delta is exactly this phase's 3 new browser tests. |
> | `git status` after the run | only the intended files + refreshed near-identical screenshots (byte-deltas of 1-90 bytes vs HEAD, i.e. normal capture variance) |
>
> ### ⚠️ SECOND SECURITY FINDING — CREDENTIALS INSIDE THE REVIEW ZIP (FIXED)
> `scripts/export-review-zip.sh` used `zip -r .` with a hand-written exclude list and
> **no `.env` exclusion** — `zip` does not read `.gitignore`, so the gitignored
> `.env` and `.env.deploy` (which hold the live Namecheap FTP password) were being
> packaged into `Review Zip/mercenta-review.zip`. **Fixed:** the script now excludes
> `.env`, `.env.*` and key/certificate files, and **asserts** after zipping that no
> `.env*` entry is present — if one reappears it DELETES the archive and exits 1
> (a guard that genuinely fails, not a comment).
> **Verified:** re-export → `unzip -Z1 … | grep '^\.env'` → **no output** (0 entries);
> `unzip -p … HANDOFF.md | grep -c <literal>` → **0**; guard prints
> `Credential guard: PASS`. Prior zips produced by the old script DID contain those
> files — hence the rotation requirement below is not optional.
>
> ### REMAINING (next sessions, in priority order)
> 1. ~~**`src/lib/grants/researchEngine.ts` legacy state**~~ — **RESOLVED in session 3
>    (M13c PHASE C, see the block at the top of this file):** the `submitted` / `sent`
>    states and the `submittedAt`/`submittedBy`/`sentAt`/`sentBy` fields are gone;
>    internal approval is now `approved_internally` with a required approver identity,
>    and an external submission is representable only through the founder-gated
>    `recordGrantSubmission` / `recordInvestorSubmission`.
> 2. ~~**§27/§28 unified ranked founder queue with visible WHY**~~ — **RESOLVED in
>    session 3 (M13c PHASE D, see the block at the top of this file):** the ranked
>    queue with the declared 8-factor WHY breakdown, the relationship/funding slots
>    (best embassy route, best trade programme, investor route, accelerator/residency/
>    ecosystem routes) and the canonical PO-potential opportunity ranking are built
>    inside the EXISTING command centre. Validator 23 → 39 checks; e2e 3 → 4.
> 3. Credential/founder work unchanged (Google OAuth client id, Companies House +
>    GOV.UK codes, HMRC, Google Edge Function deploy, real cost prices, Tottenham
>    ASIN evidence capture, **Twilio recovery-code rotation**, and now the
>    **Namecheap FTP password rotation** — see the security finding above).
> 4. §16–§29 embassy/trade partnership pipeline (§9 of the continuation brief) and
>    the §12–§15 Google Doc/Slides/Sheets generation wiring remain to be built on
>    top of the existing seams.
>
> ---
> ## ✅ PHASE 14 + PHASE 15 — DOCS RECONCILIATION + SPEC REPOINT + FULL REGRESSION (M13) — 2026-09-15
>
> **Documentation reconciliation (Phase 14):** `README.md` (4 new validators in the
> gate list), `docs/INTEGRATIONS.md` (§12 — Google, Companies House company records,
> government identity, runtime model + cost controls), `GO_LIVE.md` (§4 — Google,
> Companies House/company records, HMRC, AI ceilings), `PRODUCTION_READINESS.md`
> (M13 credential table + the three non-credential items), `PROJECT_STATUS.md`,
> `HANDOFF.md`.
>
> **Spec-selector repoint (the documented fix for the pre-existing failures):** the
> canonical prospect table in `BrandIntelligencePanel.tsx` now carries
> `data-testid="bi-prospect-table"`, and all **16** generic `table tbody tr`
> selectors across **8** specs were repointed to
> `[data-testid="bi-prospect-table"] tbody tr` — every spec's invariant (row counts,
> click targets) preserved, nothing weakened or deleted.
>
> **Three further real failures were found and fixed at their true cause:**
> 1. `e2e/founder-investor-centre.spec.ts` asserted the OLD honesty wording (a vendor
>    name). The spec now reads `FOUNDER_HONESTY_NOTICE` from its single source of
>    truth, so it can never drift from the wording guardrail again.
> 2. `e2e/integration-hub.spec.ts` pinned "Infrastructure has no providers". Google
>    (M13 Phase 8) is a legitimate Infrastructure provider, so the spec now asserts
>    that heading WITH its provider instead of asserting its absence.
> 3. `e2e/dashboard.spec.ts` tab-walk budget was 30 stops; the command centre
>    legitimately adds a CTA per outstanding action above the KPI band. The budget
>    was raised (200) while the INVARIANT is unchanged — focus must still reach the
>    drill-down cell and must still show a visible outline.
> 4. Scope guards `validate-e6-brand-surfaces.mjs` / `validate-e7-embedded-social.mjs`
>    were extended to DECLARE the Phase 8–11 + Phase 14 surface (the same sanctioned
>    pattern the earlier M13 additions used). They still refuse anything outside the
>    declared set — this is a declaration, not a relaxation.
>
> **FINAL FULL REGRESSION (real output, this session):**
> | Gate | Result |
> |---|---|
> | `npx tsc --noEmit -p tsconfig.app.json` | **0 errors** |
> | `npm run lint` (`eslint .`) | **clean — no output** |
> | `npm run build` | **✓ built** |
> | `node scripts/lint-wording.mjs` | **PASS — 217 files, 0 violations** |
> | Validator/audit sweep (77 scripts incl. `rls-audit`, `integrity-audit`, mock seam/providers, discovery, stage10, e6, e7) | **77 run / 0 failures** |
> | `node scripts/rls-audit.mjs` | **PASS — 33 tables, 33 RLS-enabled, 48 policies, 94 checks** |
> | `node scripts/integrity-audit.mjs` | **PASSED — 61 passed / 0 failed / 100%** |
> | `npx playwright test` (FULL SUITE) | **277 passed / 0 failed / 2 skipped (279) — exit 0** |
>
> The previously stated target was 264 passed / 2 skipped; the extra 13 are exactly
> the new tests added by Phases 9, 8, 10 and 11 (4 + 3 + 3 + 3). **The 19
> pre-existing failures are all resolved and no new regression remains.**
> ---
>
> - `src/lib/commandCentre/commandCentre.ts` (NEW) — derives the command centre
>   from REAL stores only: `companyStore` compliance tasks, `googleStore` tasks,
>   the AI cost-protection state, integration errors handed in by the shell, the
>   canonical PO store (computed 24-hour acknowledgment rule), shipment
>   exception/delay flags, brand applications, launch records, the founder partner
>   targets (declared prospective), the canonical prospect store (top 5 by score)
>   and the cost summary. Bands: **NOW / TODAY / THIS WEEK** plus the
>   **Opportunities / Fundraising / Operations / Finance / AI cost** sections.
>   Every action carries a CTA + destination, and category/region/value where the
>   record has them.
> - `src/data/adminNav.ts` (NEW) — the tab-aware navigation intent that solves
>   "Super Admin → Company tab": a single pending request, consumed ONCE and only
>   by the view that owns it (a stale intent can never move the founder somewhere
>   unexpected).
> - `src/components/admin/CommandCentre.tsx` (NEW) — rendered at the TOP of the
>   admin overview (before the KPI band); each row is one CTA button.
> - `src/components/admin/AdminDashboard.tsx` (EXTENDED, existing content
>   untouched below) and `SuperAdminPanel.tsx` (consumes the intent on mount and
>   validates the tab id against `SUPER_ADMIN_TABS`).
>
> **VERIFIED:** `scripts/validate-command-centre.mjs` (NEW) **PASS — 23 checks**;
> `e2e/command-centre.spec.ts` (NEW) **3 passed / 0 failed** — including the
> end-to-end proof that a CTA lands on the **Company** tab, not the default Staff
> tab; combined affected-spec run **56/56 passed**
> (admin-operational-surfaces, app-shell, command-centre, company-control-centre,
> google-setup, operating-costs, launch-centre, opportunity-discovery,
> investor-demo); `tsc` 0 errors; eslint 0; `npm run build` ✓; wording gate PASS.
>
> **DEFECT FOUND AND FIXED BY THE BROWSER SPEC:** `Card` does not forward
> `data-testid` (it destructures a fixed prop set), so a panel testid placed on
> `<Card>` silently disappears from the DOM. The command centre now wraps its card
> in a testid-bearing element. The browser spec also proved the RBAC boundary is
> intact: the `Mercenta Admin Hub` (admin_staff) session is correctly REFUSED
> access to Super Admin tabs.
> ---
>
> - `src/config/operatingCosts.ts` (NEW) — single source of truth for every cost
>   line (13 providers) with an explicit label (MANUAL / ESTIMATED / SIMULATED /
>   NOT CONNECTED / LIVE), plus the §25 revenue streams, the pricing inputs (ALL
>   `requiresFounderApproval`), and the daily/monthly AI ceilings. NO line claims
>   LIVE and subscription pricing is deliberately UNSET.
> - `src/lib/costs/modelPolicy.ts` (NEW) — §27 model policy: `MAX_PAID_RUNTIME_MODEL
>   = deepseek/deepseek-v4-flash`, cheapest-tier ladder (deterministic → cache →
>   local → free → paid max), unknown task REFUSED, `isModelAllowed()` guard.
> - `src/lib/costs/usageLog.ts` (NEW) — real usage log (model, task, tokens, cost,
>   entity, cache hit/miss, status) + per-operation budget, daily/monthly ceilings
>   and the cost-protection state that REFUSES non-essential calls when exceeded.
> - `src/lib/costs/costSummary.ts` (NEW) — derived figures only: fixed + AI totals,
>   projection, per-provider variance, cost per brand / opportunity / lead / AI
>   operation, revenue per §25 stream (commission + shipping margin from the
>   canonical stores), contribution, and the DERIVED break-even subscription + CAC
>   tolerance (provisional while pricing awaits founder approval).
> - `src/components/admin/OperatingCostsPanel.tsx` (NEW) + Super Admin tab
>   **Operating Costs**.
> - **REAL DEFECTS FIXED (found while building this):** `src/lib/discovery/engine.ts`
>   and `src/lib/monitoring/alertTriage.ts` both hard-coded `openai/gpt-4o-mini` —
>   a §27 violation (more expensive than the permitted maximum). Both now select
>   their model through the runtime policy and authorise through the usage log.
>   A deterministic (no-model) outcome was also being logged as a budget refusal;
>   it now has its own `handled_without_model` status.
>
> **VERIFIED:** `scripts/validate-operating-costs.mjs` (NEW) **PASS — 43 checks**;
> `e2e/operating-costs.spec.ts` (NEW) **3 passed / 0 failed**; `tsc` 0 errors;
> eslint 0; `npm run build` ✓; wording gate PASS (215 files, after renaming the
> Keepa line that tripped the banned-word rule); `validate-discovery`,
> `validate-mock-providers`, `validate-mock-seam`, `validate-stage10` still PASS.
> ---
>
> **DONE and verified. Nothing already verified was rebuilt.**
>
> - `src/config/company.ts` (NEW) — the ONLY module holding Mercenta's registration
>   facts (`COMPANY_REGISTRATION`, number `17457777`; legal name imported from
>   `src/config/brand.ts`). Registrar fields are `null` until a real read; the
>   confirmation-statement workflow, the 90/60/30/7/0 reminder thresholds, the two
>   government credential descriptors, manual-action links and
>   `OFFICIAL_CONFIRMATION_STATEMENT_FILING_CONFIGURED = false` live here.
> - `src/lib/compliance/companiesHouseClient.ts` + `companiesHouseMock.ts` gained
>   `getCompanyRecord / getOfficers / getPersonsWithSignificantControl /
>   getFilingHistory / getCharges` behind the SAME contract (mock-first). The mock
>   invents NO Mercenta fact (empty officers/PSC/filings, `SIMULATED REGISTRAR`
>   address), and `lookupCompany`'s pinned every-4th-call rate limit is unchanged —
>   the new reads use a SEPARATE counter.
> - `src/integrations/connections.ts` gained `companiesHouseConnectionCredentials()`
>   (verified non-sandbox `vault:` connection only → real client; anything else →
>   mock).
> - `src/data/companyStore.ts` (NEW): registrar snapshot with `dataSource`
>   provenance, deadline arithmetic, the Detect→Prepare→Notify→Review→Approve→File→
>   Verify workflow with the founder-approval gate, `fileViaOfficialApi` REFUSAL,
>   manual-register recording, register-only verification, derived tasks, and the
>   masked government-credential vault (`vault:` refs only — the value never enters
>   a record, audit entry or metadata).
> - `src/components/admin/CompanyControlCentre.tsx` (NEW) + Super Admin tab
>   **Company**. `src/lib/events/types.ts` gained `company_filing_due`.
>
> **VERIFIED:** `scripts/validate-company-control-centre.mjs` (NEW) **PASS — 49
> checks**; `e2e/company-control-centre.spec.ts` (NEW) **4 passed / 0 failed**;
> `tsc` 0 errors; eslint 0; `npm run build` ✓; wording gate PASS (205 files);
> `validate-mock-providers`, `validate-mock-seam`, `validate-event-feed`,
> `integrity-audit`, `validate-investor-demo`, `validate-launch-centre`,
> `validate-opportunity-discovery` all still PASS.
> ---
> ## ✅ PHASE 8 — GOOGLE INTEGRATION + SETUP WIZARD (M13) — 2026-09-15
>
> - `src/config/google.ts` (NEW) — personal account `mercentapartners@gmail.com`
>   (My Drive only, `sharedDrives: false`, `workspaceTenant: false`), least-privilege
>   scopes (`drive.file`, not full `drive`), the OAuth endpoint/params, and the
>   **22-item workspace plan** (root + 12 owner folders, `Templates`, 2 master
>   sheets with tabs, a Docs template, a Slides template, and four named capability
>   tests covering Sheets/Docs/Slides/Calendar).
> - `src/lib/google/googleClient.ts` (NEW, real via Edge-Function proxy —
>   `X-Secret-Ref` only, never a token), `googleMock.ts` (NEW, identical contract,
>   `MOCK-GD-…` ids, idempotent by name, every 5th write fails then retries),
>   `index.ts` (NEW, `createGoogleClientForConnection` factory),
>   `workspaceSetup.ts` (NEW runner: dependency order, one retry, explicit
>   `skipped` children when a parent fails).
> - `src/data/googleStore.ts` (NEW): setup run + per-item outcomes, OAuth state that
>   records `exchange_pending` (NOT `connected`) after a code arrives, connection
>   only after a confirmed server-side exchange, derived tasks, canonical audit
>   (`entityType: 'google_workspace'`). **No token and no credential is stored.**
> - `src/components/admin/GoogleSetupWizard.tsx` (NEW) + Super Admin tab **Google**;
>   `google` registered in `types.ts` (id), `INITIAL_INTEGRATIONS`, `registry.ts`
>   (OAuth, no API-key fields), `INTEGRATION_ORDER`, `INTEGRATION_META`
>   (`simulation`), and `googleConnectionCredentials()` in `connections.ts`.
>
> **VERIFIED:** `scripts/validate-google-integration.mjs` (NEW) **PASS — 42
> checks**; `e2e/google-setup.spec.ts` (NEW) **3 passed / 0 failed**; `tsc` 0
> errors; eslint 0; `npm run build` ✓; wording gate PASS (211 files).
> ---
>
> **Status: M12 checkpoint work is COMMITTED and the suite is GREEN.**
>
> - **Commit:** `fb56455` — "*chore(M12 closing): commit verified M12 checkpoint
>   work; repair ENOENT path bug in validators (fileURLToPath), repoint
>   export-review-zip/deploy-demo to the renamed project root, ignore owner
>   company-document folders*". Branch `redesign/foundation`; protected baseline
>   `959b4d2` still an ancestor.
> - **Working tree:** CLEAN (`git status --porcelain` → 0 lines) at that commit.
> - **Full validator sweep (real output):** every `scripts/validate-*.mjs`
>   (64 scripts) exited **0** — run in `1. Mercenta` after the commit and captured
>   to `/tmp/m12_validators.txt`. No non-zero exit.
> - **Path bug fixed repo-wide:** `scripts/export-review-zip.sh` and
>   `scripts/deploy-demo.sh` now derive the project root from
>   `"$(dirname "${BASH_SOURCE[0]}")/.."` — no hardcoded
>   `~/Desktop/Mercenta` remains in either script. `.clinerules` path references
>   repointed. `node scripts/export-review-zip.sh` verified working → 36M at
>   `/Users/tadii/Desktop/1. Mercenta/Review Zip/mercenta-review.zip`.
> - **Owner folders** `0. Company Documents/` + `Parterships/` are kept on disk
>   and added to `.gitignore` (personal/compliance PDFs are intentionally NOT
>   tracked — no secrets in Git).
> - **Documentation reconciliation (M12 closing):** `README.md` (4 new M12
>   validators added to the gate list), `docs/INTEGRATIONS.md` (§2b sales-estimator
>   data seam), `GO_LIVE.md` (estimator + outreach-email activation
>   preconditions), `.clinerules/mercenta-business-model.md` (brand-level
>   relationship rules, the ten-category limit, Amazon wording safeguards).
>
> **M13 build-forward queue** (from the master prompt, in order): Phase 3
> Opportunity Discovery (UK / international / sports / channel verticals, sharing
> the existing ASIN engine), Phase 4 estimator + New Product Launch Programme
> naming, Phase 5 Ads Management, Phase 8 Google integration wizard, Phase 9
> Companies House / company-government centre, Phase 10 operating-cost dashboard,
> Phase 11 Super Admin command centre, Phase 13 MVP launch centre, Phase 12
> filesystem organisation, Phase 15 full regression. Phases 2, 6, 7 are already
> built and validator-pinned by M12 — verify, do not rebuild.
> ---
> ## ✅ §39 RLS FINDING — RESOLVED (M13) — 2026-09-14
>
> The M12 checkpoint flagged "shipping_margins / audit_log / leads /
> integration_connections have no ENABLE ROW LEVEL SECURITY" and said it needed an
> owner decision. It was investigated properly instead of guessed at, and the
> conclusion differs from the checkpoint's wording in two ways:
>
> **1. Most of it was a stale VALIDATOR, not a stale schema.** `rls-audit.mjs`
> checked a hardcoded 13-table list and demanded `auth.uid()`. This schema's
> canonical tenancy predicate is `(auth.jwt() ->> 'tenant_id')::uuid`, so that check
> could NEVER pass — 23 "failures", almost all false negatives. It also named seven
> tables that **do not exist anywhere in the migration history** (grep → 0 hits):
> `shipping_margins`, `subscriptions`, `commissions`, `fulfillment_scores`,
> `ad_spend_budgets`, `leads`, `integration_connections` (and `compliance_documents`
> is really `compliance_docs`). There was no table, so there was no RLS gap.
> The audit is now **derived from the migrations themselves** (single source of
> truth) and audits **every** table: 33 tables, 33 RLS-enabled, 48 policies,
> **94 checks, 0 failures** (`RLS_STATIC_AUDIT_PASS`).
>
> **2. Two REAL gaps were hiding in that noise — both now fixed** by migration
> **027_harden_audit_log_rls.sql**:
> - **`audit_log` had NO RLS at all** (015 was created with the comment *"no RLS -
>   admin-only cross-tenant view"*). Admin-only in the UI is not a database control:
>   any role with a table grant could read every tenant's audit rows **and could
>   UPDATE or DELETE them**, destroying history. Now: RLS on, staff-only SELECT
>   (`auth.jwt() ->> 'role'`), authenticated append-only INSERT, and **no
>   update/delete policy at all** — the trail is immutable from the client;
>   service-role operations are unaffected. Also repairs a real persistence bug
>   found while reading the table: the three client insert paths write
>   `brand_id` / `reason` / `metadata`, which 015 never created, so those audit rows
>   were being silently dropped (`add column if not exists`).
> - **`applications` had NO RLS at all** (018). It holds applicant PII plus
>   `admin_notes` / `reviewed_by`, and with no policy a submitter could have
>   approved itself. Now: public INSERT that can only create `status = 'pending'`,
>   staff-only SELECT/UPDATE, no DELETE. This gap was invisible before because the
>   old hardcoded list never contained `applications` at all.
>
> **Tested:** `scripts/validate-rls-hardening.mjs` (NEW, 16 checks, PASS) pins both
> fixes so they cannot silently regress; `rls-audit.mjs` PASS (94 checks). Three
> stale migration-count assertions (E5 J1, E6 F4, E7 latest, `validate-db-hardening`)
> were repointed 026 → 027 with the invariant preserved and the repoint documented
> inline, and E6/E7's working-tree scope guards now declare the M13 surface
> explicitly instead of failing on an unexplained path.
> ---
> ## ✅ PHASE 3 — OPPORTUNITY DISCOVERY ENGINE (M13) — 2026-09-14
>
> **The ADDITIONAL discovery layer now exists. The ASIN-level engine is unchanged.**
>
> - **`src/lib/intelligence/opportunityDiscovery.ts`** (NEW, 813 lines): the eight
>   §9 verticals (UK brand, international, sports/team/club, distributor/channel,
>   trade programme, embassy/government, strategic partnership, new-to-channel);
>   `deriveOpportunity()` EXTENDS the existing engine — it calls
>   `acquisitionStrategy.assessOpportunity()` for every score (which itself derives
>   from the canonical `BrandProspect.score`), takes observed demand from the
>   prospect's OWN ASIN evidence, and money from the canonical commercial-model
>   arithmetic. §6 eligibility is fail-closed via `isApprovedCategory`; §13 PO
>   potential is ONE named formula (`poPotentialGbp`); ranking is by estimated PO
>   potential with ineligible records SEPARATED (with a reason), never dropped.
>   §5 claim classes (`confirmed_fact` / `estimate` / `simulation` /
>   `third_party_research` / `pending_confirmation`) are declared on every record
>   and `confirmedPartnership` is a required `false`.
> - **§12 sports vertical seeded with Tottenham Hotspur FIRST** — modelled as a
>   POTENTIAL DISTRIBUTION OPPORTUNITY. The club has NOT been approached. Hotspur
>   Labs / Players Fund are carried as `pending_confirmation` **founder-supplied
>   leads** (owner folder `Parterships/`), explicitly NOT verified. The opportunity
>   carries ZERO ASIN evidence and SAYS SO ("ASIN-level evidence NOT captured yet")
>   rather than inventing demand — an operator must run the existing BI discovery
>   first.
> - **`src/components/admin/OpportunityDiscoveryPanel.tsx`** (NEW) renders inside
>   Brand Intelligence *between* the M12 strategy panel and the existing ASIN panel
>   (extend, not replace): 8 clickable vertical rollup cards (count / PO potential /
>   Mercenta estimate), the ranked list, the ineligible list with reasons, the sports
>   block with the standing disclaimer, and a click-through drill-down carrying the
>   ASIN table + a button that runs the EXISTING sales estimator.
>
> **VERIFIED EVIDENCE**
> | What | Result |
> |---|---|
> | `node scripts/validate-opportunity-discovery.mjs` (NEW) | **PASS — 31 checks**, incl. "ranking is deterministic across replays", "observed demand is the sum of the prospect's OWN ASIN estimates (no invention)", "Tottenham carries NO fabricated ASIN evidence and says so", "the discovery engine makes ZERO network calls" |
> | `npx playwright test e2e/opportunity-discovery.spec.ts` (NEW) | **3 passed / 0 failed** (renders all 8 verticals; row click opens the drill-down; vertical filter narrows; sports disclaimer + no fabricated evidence) |
> | `npx tsc --noEmit -p tsconfig.app.json` | **0 errors** |
> | `npm run build` | **✓ built** |
> | `node scripts/lint-wording.mjs` | **PASS** (0 violations; the new eligibility/claim strings are channel-neutral) |
> | Full sweep after the phase | 68 scripts incl. the new validator + `rls-audit` + `integrity-audit` + wording → all exit 0 |
>
> **No new provider, no new store, no second scoring engine.** The only new
> integration surface is *none*: the layer reads the canonical prospect store.
> ---
> ## ✅ PHASE 13 — MERCENTA LAUNCH CENTRE (M13) — 2026-09-14
>
> **Mercenta's OWN startup/MVP launch profiles — not brand-partner discovery.**
>
> - **`src/config/launchPlatforms.ts`** (NEW): all **14** §31 platforms (Product Hunt,
>   Indie Hackers, Hacker News, BetaList, SourceForge, Uneed, Peerlist, Microlaunch,
>   AlternativeTo, Dev Hunt, SaaSHub, Launching Next, StartupBase, Tiny Startups),
>   each with site / signup route / requirements page / submission channel /
>   audience / known requirements. `apiAvailable: false` and
>   `requirementsVerified: false` on **every** one — nothing claims an automated
>   submission exists, and the current requirements are marked for verification
>   against the platform's own page rather than assumed.
> - **`src/lib/founder/launchPackage.ts`** (NEW): `buildSubmissionPackage()` (the
>   complete copyable package), `buildSubmissionChecklist()` (the guided workflow),
>   `launchPlatformIsComplete()` and `outstandingPlatforms()`.
> - **`src/data/launchStore.ts`** (NEW): the real state machine
>   (`not_started` → `account_created`/`blocked`; `not_prepared` → `prepared` →
>   `submitted`), unknown platforms **refused**, and every transition appended to the
>   **canonical audit trail** (`demoStore.demoAuditLog`,
>   `entityType: 'mercenta_launch_platform'`) with the founder as actor.
> - **`src/components/admin/LaunchCentre.tsx`** (NEW) + a **Launch Centre** tab in
>   Super Admin: per-platform **[Prepare Profile] [Modify] [Copy] [Open]
>   [Mark Submitted]**, the progress summary, the drill-down with the copyable
>   package and the checklist that keeps "verify the requirements on the platform"
>   outstanding until it is genuinely done.
>
> **VERIFIED EVIDENCE**
> | What | Result |
> |---|---|
> | `node scripts/validate-launch-centre.mjs` (NEW) | **PASS — 27 checks**, incl. "NO platform claims an authorised submission API", "preparing is NOT the same as submitting", "an unknown platform is REFUSED (fail-closed)", "every launch mutation is attributable in the canonical audit trail", "zero network calls" |
> | `npx playwright test e2e/launch-centre.spec.ts` (NEW) | **3 passed / 0 failed** (14 rows render + honest copy; Prepare ≠ Submitted as real state changes; drill-down shows the package + checklist) |
> | `npx tsc --noEmit -p tsconfig.app.json` / `eslint` / `npm run build` | 0 errors / 0 problems / ✓ built |
> | `node scripts/lint-wording.mjs` | PASS — 203 files, 0 violations |
> ---
> ## ✅ PHASE 12 + INVESTOR-DEMO E2E (M13) — 2026-09-14
>
> **Filesystem organised (non-destructive — nothing deleted):**
> - `Parterships/` → **`Partnerships/`** (the typo the prompt named; the Tottenham
>   Hotspur Ventures image is inside it) and `0. Company Documents/` →
>   **`Company Documents/`**.
> - Created the founder-facing structure: `Accounting`, `Legal & Compliance`,
>   `Integrations`, `Google`, `Investors`, `Research`, `Product & Platform`,
>   `Marketing`, `Launch`, `Reports`, `Scripts`, `Random`. Repository-critical
>   paths (`src`, `supabase`, `e2e`, `scripts`, `docs`, `deploy`, `public`,
>   `design`) are UNTOUCHED — no tracked source path moved.
> - 4 stray artefacts (`const` (0 bytes), `file-tree.txt`, `nohup.out`, and a
>   0-byte shell-typo filename) moved into `Random/`. Owner folders holding real
>   content (`Amazon Vendor Central`, `Distribution Prospects`, `Amz Unlimited`,
>   `Mercenta Brand Intelligence`) were LEFT IN PLACE rather than relocated.
> - **SECURITY (real finding):** `Admin Accounts/twilio_2FA_recovery_code (1).txt`
>   — a **live Twilio 2FA recovery code — WAS TRACKED IN GIT.** Removed from the
>   index (kept on disk), the folder is now gitignored, and the review-zip script
>   excludes it. It still exists in PAST commits, so **the code must be treated as
>   COMPROMISED and ROTATED in Twilio** (history rewrite is forbidden by the
>   standing rules — this is flagged, not silently "fixed").
>
> **Investor-demo E2E — RUN (this was checkpoint item 4):**
> | What | Result |
> |---|---|
> | `npx playwright test e2e/investor-demo.spec.ts` | **10 passed / 0 failed** — "the full 25-stage lifecycle runs in the browser and every stage reports OK", the Model A/B figures, tenant isolation, RBAC refusal, responsive overflow checks |
> | `node scripts/validate-investor-demo.mjs` | PASS (unchanged) |
>
> **One real defect found AND fixed by running it:** the commercial-relationship
> stage rendered its investor-facing sentence with **unformatted** currency
> (`£10000 PO → £2000 … £8000 … £2500 … £2270`), while the M12 browser spec
> expected `£2,000`-style figures. The STRUCTURED `facts` were correct all along
> (the headless validator pins them), so the fix is display-only: a `money()`
> formatter in `investorDemo.ts` now renders thousands separators; the canonical
> arithmetic is untouched.
> ---
> ## 📋 M13 REMAINING WORK — ALL PHASES COMPLETE (2026-09-15)
>
> Phases **8, 9, 10, 11, 14 and 15** are DONE and verified (see the sections above).
> The M13 queue is complete:
>
> | # | Phase | State |
> |---|---|---|
> | 8 | §21 Google integration + setup wizard | **DONE** — validator 42 checks PASS, e2e 3/3 |
> | 9 | §22–§25 Company / Government Control Centre | **DONE** — validator 49 checks PASS, e2e 4/4 |
> | 10 | §27 Operating-cost / AI-cost dashboard | **DONE** — validator 43 checks PASS, e2e 3/3 |
> | 11 | §32/§34 Super Admin Command Centre | **DONE** — validator 23 checks PASS, e2e 3/3 |
> | 14 | §37 Documentation reconciliation | **DONE** — README / INTEGRATIONS / GO_LIVE / PRODUCTION_READINESS / PROJECT_STATUS / HANDOFF |
> | 15 | §38 Full regression + spec-selector repoint | **DONE** — 77/77 scripts, 277 passed / 0 failed / 2 skipped |
>
> **Still outstanding (credential / founder work, NOT build work):**
> 1. **Rotate the Twilio 2FA recovery code** (it is in past Git commits — rotation is
>    the fix; history rewrite is forbidden by the standing rules).
> 2. **Capture Tottenham merchandise ASIN evidence** through the existing BI discovery
>    so the seeded sports opportunity stops reporting "ASIN evidence NOT captured yet".
> 3. Enter, in Super Admin: the **Google OAuth client id** (→ Google tab), the
>    **Companies House API key** (→ Integrations), the **Companies House authentication
>    code** and **GOV.UK One Login personal code** (→ Company tab; masked vault refs
>    only), and HMRC credentials once VAT registration completes.
> 4. Deploy the Google Edge Function (code→token exchange + Vault refresh token) to
>    flip Google from `exchange_pending` to `connected`.
> 5. Founder confirmation of the real subscription/hosting prices in
>    `src/config/operatingCosts.ts` and approval of the pricing inputs.
> ---
> ## ⏸️ M13 REMAINING WORK (historical, superseded above) — 2026-09-14
>
> Phases **9** and **8** are DONE (see the two sections above). Genuinely NOT built:
>
> | # | Phase | State | What is actually missing |
> |---|---|---|---|
> | 10 | §27 **Operating-cost / AI-cost dashboard** | **NOT STARTED** | No Super Admin **Operating Costs** surface. Needs: monthly recurring/variable/third-party costs, AI/OpenRouter usage + budget + trend, per-integration provider/plan/status/fixed cost/usage/estimated total/budget/variance, live-manual-estimated-simulated labelling, and the derived inputs for minimum brand subscription / gross margin / CAC tolerance. Do not invent live costs — label every figure. |
> | 11 | §32 **Super Admin Command Centre** | **PARTIAL** | `AdminDashboard` exists but is not the NOW / TODAY / THIS WEEK / OPPORTUNITIES action centre the spec describes: no URGENT band (filings, integration failures, PO/payment/shipment exceptions, partnership follow-ups), no per-item CTA routing, and it does not yet surface the new Opportunity Discovery / Launch Centre / Company / Google / investor actions. |
> | 14 | §37 **Documentation reconciliation** | **MOSTLY DONE** | Add when Phases 10–11 land: the cost dashboard and the command centre; plus `PRODUCTION_READINESS.md` entries for the Google OAuth/tokens, the **Twilio recovery-code rotation**, and the Tottenham ASIN evidence still to be captured. |
> | 15 | §38 **Full regression** | **RUN per phase; full suite to re-run** | Targeted validators + affected e2e are green after every phase. The full Playwright suite has 19 PRE-EXISTING failures caused by `BrandIntelligenceStrategyPanel`'s `<table>` colliding with the generic `table tbody tr` selectors (see the section below) — the fix is the **spec-selector repoint**, still pending. |
>
> **Non-credential work that must NOT be forgotten:**
> 1. **Rotate the Twilio 2FA recovery code** (it is in past Git commits — see Phase 12 above).
> 2. **Capture Tottenham merchandise ASIN evidence** through the existing BI discovery
>    so the seeded sports opportunity stops reporting "NOT captured yet".
> 3. Google OAuth client credentials (founder-created — enter in Super Admin → **Google**),
>    Companies House authentication code / GOV.UK personal code (Super Admin → **Company**),
>    and HMRC credentials are all entered by the founder — never in code, docs, prompts,
>    Sheets or the review ZIP.
> ---
> ## ⏸️ M13 REMAINING WORK (superseded by the table above) — 2026-09-14
>
> Everything BELOW is genuinely NOT built. Nothing above may be rebuilt.
>
> | # | Phase | State | What is actually missing |
> |---|---|---|---|
> | 8 | §21 **Google integration + setup wizard** | **NOT STARTED** | No Google provider entry, no OAuth seam, no wizard. Needs: a `google` provider in `src/integrations/registry.ts` (`oauth`), a `src/lib/google/` client pair (Mock + Real) behind `createGoogleClient()`, and a Super Admin → Integrations → Google wizard that creates the My Drive folder structure, master Sheets, templates and document/presentation/partnership/investor/compliance folders, tests Docs/Sheets/Slides/Calendar creation, and reports connected/ready. Account is `mercentapartners@gmail.com` — the password is NEVER asked for or stored; OAuth tokens use the existing secure storage; normal My Drive only (no Shared Drives / Workspace features). |
> | 9 | §22–§25 **Company / Government Control Centre** | **PARTIAL — clients exist, centre does not** | `src/lib/compliance/companiesHouseClient.ts`, `companiesHouseMock.ts`, `hmrcClient.ts`, `hmrcMock.ts`, `complianceSync.ts` already exist (M11). Missing: the Super Admin **Company → Companies House** surface (status, officers, PSC, filing history, charges, deadlines), confirmation-statement monitoring (90/60/30/7/due) with Detect→Prepare→Notify→Review→Approve→File→Verify and founder approval, annual-accounts tracking, and the **Government Identity** record (GOV.UK One Login status + Companies House personal code, encrypted/masked/Super-Admin-only, never logged or included in reports/ZIP/prompts). HMRC stays READY/NOT CONNECTED until VAT registration. |
> | 10 | §27 **Operating-cost / AI-cost dashboard** | **NOT STARTED** | No Super Admin **Operating Costs** surface. Needs: monthly recurring/variable/third-party costs, AI/OpenRouter usage + budget + trend, per-integration provider/plan/status/fixed cost/usage/estimated total/budget/variance, live-manual-estimated-simulated labelling, and the derived inputs for minimum brand subscription / gross margin / CAC tolerance. Do not invent live costs — label every figure. |
> | 11 | §32 **Super Admin Command Centre** | **PARTIAL** | `AdminDashboard` exists but is not the NOW / TODAY / THIS WEEK / OPPORTUNITIES action centre the spec describes: no URGENT band (filings, integration failures, PO/payment/shipment exceptions, partnership follow-ups), no per-item CTA routing, and it does not yet surface the new Opportunity Discovery / Launch Centre / investor actions. |
> | 14 | §37 **Documentation reconciliation** | **MOSTLY DONE** | Done this session: `README.md`, `docs/INTEGRATIONS.md`, `GO_LIVE.md`, `.clinerules/mercenta-business-model.md`, `PROJECT_STATUS.md`. Still to add when Phases 8–11 land: the Google architecture, the Companies House/HMRC section, the cost dashboard and the command centre; plus `PRODUCTION_READINESS.md` entries for the Google OAuth/tokens, the **Twilio recovery-code rotation**, and the Tottenham ASIN evidence still to be captured. |
> | 15 | §38 **Full regression** | **RUN, GREEN (this session)** | 70 validator/audit scripts exit 0; `tsc` 0 errors; `eslint` clean on every touched file; `npm run build` ✓; wording gate PASS (203 files); `e2e/investor-demo.spec.ts` 10/10; `e2e/opportunity-discovery.spec.ts` 3/3; `e2e/launch-centre.spec.ts` 3/3; full Playwright suite result recorded in the session log. Re-run after Phases 8–11. |
>
> **Non-credential work that must NOT be forgotten:**
> 1. **Rotate the Twilio 2FA recovery code** (it is in past Git commits — see Phase 12 above).
> 2. **Capture Tottenham merchandise ASIN evidence** through the existing BI discovery
>    so the seeded sports opportunity stops reporting "NOT captured yet".
> 3. Google OAuth client credentials (founder-created), Companies House auth code,
>    GOV.UK personal code and HMRC credentials are all entered by the founder in
>    Super Admin — never in code, docs, prompts, Sheets or the review ZIP.
> ---
> ## ⚠️ FULL PLAYWRIGHT SUITE — 19 PRE-EXISTING FAILURES (PROVEN, NOT M13) — 2026-09-14
>
> **Result: 245 passed / 19 failed / 2 skipped (266).** The M11 baseline was
> 250 passed / 2 skipped, and the M12 checkpoint admitted the full suite had NOT
> been re-run after the M12 UI additions. The failures were therefore investigated
> rather than assumed.
>
> **PROOF they are not caused by M13 (controlled experiment, run this session):**
> my OpportunityDiscoveryPanel was temporarily removed from `AdminShell` entirely
> (render replaced with `{null}`, file restored afterwards) and
> `e2e/brand-intelligence-lifecycle.spec.ts` **still failed identically** —
> `locator('table tbody tr')` expected 10, received **20**. With my panel present it
> was 30; without it, 20. Both numbers are wrong, so at least one pre-existing table
> on that page was already breaking the spec.
>
> **ROOT CAUSE:** `BrandIntelligenceStrategyPanel.tsx` (added by **M12b**, i.e.
> BEFORE M13) renders a `<table>` into the same `brand_intelligence` admin view as
> the canonical prospect table. Every spec that uses the generic selectors
> `page.locator('table tbody tr')` (count) or
> `page.locator('table tbody tr', { hasText: brand })` (click) now resolves against
> the wrong table — the click lands on a strategy row and the expected panel never
> opens. Affected files: `acquisition-pipeline`, `bi-intelligence-preservation`,
> `brand-intelligence-lifecycle`, `domain-acceptance`, `domain-persistence`,
> `founder-investor-centre`, `onboarding-handoff`, `onboarding-workflow`,
> `outreach-provider-hardening`.
>
> **MY OWN contribution to the noise was found and FIXED:** the Phase 3 panel's
> ranked list was initially a `<table>`, which took the count from 20 → 30. It is now
> a labelled `role="table"` grid (`data-testid="opportunity-row"`), so the
> pre-existing DOM contract for other specs is unchanged. `e2e/opportunity-discovery.spec.ts`
> still passes 3/3 with the new markup.
>
> **THE FIX FOR THE NEXT SESSION (do NOT weaken or delete the specs):** give the
> canonical prospect table in `BrandIntelligencePanel.tsx` a stable test id
> (e.g. `data-testid="bi-prospect-table"`) and repoint the nine specs' selectors from
> the generic `table tbody tr` to `[data-testid="bi-prospect-table"] tbody tr`,
> preserving each spec's invariant (row counts and click targets). Then re-run the
> full suite and expect 264 passed / 2 skipped.
> ---
> ## ⏸️ M12 CHECKPOINT (historical record — everything in it is now RESOLVED above) — 2026-09-14
> ## ⏸️ M12 CHECKPOINT (historical record — everything in it is now RESOLVED above) — 2026-09-14
>
> **CHECKPOINT ONLY.** The owner cancelled the M12 session mid-flight. No M12 work
> was discarded, no reset/revert/rebase was performed, and nothing below was
> "fixed" during this checkpoint.
>
> ### CURRENT STATE
> - **Branch:** `redesign/foundation`
> - **HEAD:** `a6fac561b50e8973fc6b8f71f77098a9442c5374` ("phase M12e: validators
>   for brand-level commercial relationships, intelligence strategy, sales
>   estimator/Born-to-Run/Amazon wording and the founder centre; browser specs for
>   all four surfaces (8 tests pass)")
> - **Protected baseline:** `959b4d2` — **verified ancestor** of HEAD.
> - **Working tree:** DIRTY (11 modified, 2 untracked owner folders). Nothing reverted.
> - **Project folder was RENAMED mid-session** by the owner:
>   `/Users/tadii/Desktop/Mercenta` → **`/Users/tadii/Desktop/1. Mercenta`**. The
>   real repository (`.git`, branch, HEAD, `src/`) is now under **`1. Mercenta`**.
>   The old path is an empty stub containing only `.vite`, recreated by a stale
>   `vite` process whose cwd was the renamed directory. **Two stale processes from
>   the pre-rename session were terminated during M12** (a 3-day-old `vite` holding
>   port 5173, and an abandoned Playwright run) because they would have made E2E
>   results meaningless.
> - **Phase status:** M12 is **substantially built and committed in 5 phases
>   (d865c06, 88932cd, 15d9c2c, 4e7e1a4, a6fac56)**, but the *closing* steps
>   (final documentation reconciliation, full-suite regression, review ZIP) are
>   **NOT complete**.
>
> ### FILES MODIFIED / UNCOMMITTED AT CHECKPOINT
> ```
>  M PRODUCTION_READINESS.md                     (M12 credential/simulation section)
>  M docs/MERCENTA_BUSINESS_MODEL.md             (§3.2.1 brand-level selection COMPLETE)
>  M scripts/rls-audit.mjs                       (fileURLToPath + RLS regex repair)
>  M scripts/validate-d4-persistence.mjs         (fileURLToPath)
>  M scripts/validate-design-tokens.mjs          (fileURLToPath)
>  M scripts/validate-e3-catalog.mjs             (fileURLToPath)
>  M scripts/validate-e4-commerce.mjs            (fileURLToPath)
>  M scripts/validate-e5-admin-surfaces.mjs      (fileURLToPath)
>  M scripts/validate-e6-brand-surfaces.mjs      (fileURLToPath + M12_SCOPE)
>  M scripts/validate-onboarding-handoff.mjs     (fileURLToPath)
>  M scripts/validate-onboarding-workflow.mjs    (fileURLToPath)
> ?? "0. Company Documents/"                     (owner's own folder — NOT mine)
> ?? Parterships/                                (owner's own folder — NOT mine)
> ```
> ---
>
> ### COMPLETED & VERIFIED THIS SESSION (committed)
> 1. **§5/§19 brand-level commercial relationship — COMPLETE.** `demoData.ts`
>    declares each brand's model (`DEMO_MODEL_A_BRAND_ID` / `DEMO_MODEL_B_BRAND_ID`
>    = one source of truth); `demoStore` holds one record per brand with
>    `setBrandCommercialModel` (audited; actor+reason required for an override;
>    unknown model refused); `checkCommercialModelSelection` gates onboarding
>    (fail-closed); Super Admin gets a *Commercial Models* panel; the brand sees it
>    read-only in *Settings → Commercial Relationship*.
> 2. **§12–§16 Brand Intelligence strategy layer — BUILT.** `acquisitionStrategy.ts`
>    (strategies A/B, **31 source markets**, 8 trade programmes all declared
>    `prospective_partnership`, speed-to-revenue weighting, market-access tags),
>    a real audited write path (`setProspectMarketAccess`) and an operator panel
>    (`BrandIntelligenceStrategyPanel`) EXTENDING — not replacing — the BI panel.
> 3. **§18/§17 sales estimator + new-to-channel modelling — BUILT.**
>    `salesEstimator.ts` (deterministic banded estimate, ALWAYS labelled an
>    estimate, truthful provider modes, reuses the existing Amazon data seam),
>    `modelBornToRunOpportunity` (`programmeStatus: 'not_confirmed_with_amazon'`,
>    `tosVerificationRequired`, `simulated: true`) and `amazonWording.ts`. Brand
>    card in *Market Intel*.
> 4. **§21/§41 Founder Investor Centre + Partnerships/Fundraising Centre — BUILT
>    (Super Admin only).** 5 pitches, 8 model sections, 16 talking points, 21
>    difficult questions, 6 practice segments, HTML brief/deck generation,
>    prospective partner registry, recipient-specific outreach with an EXPLICIT
>    send through the mock mail seam, fundraising plan claiming no commitments.
> 5. **§20 investor demo — 25 stages** (added `commercial_models`), still
>    deterministic and zero-network.
>
> ### VERIFIED EVIDENCE (actually run — nothing else was run)
> | What | Result |
> |---|---|
> | `npx tsc --noEmit -p tsconfig.app.json` | **0 errors** (last run after the Founder Centre landing) |
> | `eslint` on every touched file | **0 errors** |
> | `npm run build` | **✓ built** (last run after the Founder Centre landing) |
> | `scripts/validate-investor-demo.mjs` | **PASS — 72 ✓** incl. the new §5/§19 assertions; "reset → run reproduces the SAME digest" |
> | `scripts/validate-commercial-model-selection.mjs` | **PASS — 18 checks** |
> | `scripts/validate-intelligence-strategy.mjs` | **PASS — 24 checks** |
> | `scripts/validate-sales-estimator.mjs` | **PASS — 28 checks** |
> | `scripts/validate-founder-centre.mjs` | **PASS — 29 checks** |
> | Playwright: the 3 new specs | **8 passed / 0 failed** |
> | Full `validate-*.mjs` sweep (64 scripts) BEFORE the path repair | 56 pass / **8 fail — all ONE cause: `ENOENT …/1.%20Mercenta/src`** (folder rename + space; `URL.pathname` percent-encoding) |
> | Those 8 after the `fileURLToPath` repair | **7 pass**; `validate-e6-brand-surfaces.mjs` failed only on `F6` (change-set scope) → `M12_SCOPE` declared → **re-run: E6_BRAND_SURFACES_VALIDATION_PASS** |
> | `scripts/rls-audit.mjs` (NOT in the `validate-*` gate suite) | now RUNS (previously crashed on the same path bug) → **RLS_STATIC_AUDIT_FAIL (23)** — PRE-EXISTING finding, see Remaining |
> ---
>
> ### IN-PROGRESS WHEN CANCELLED
> **Documentation reconciliation + the closing regression.** The very last edits
> were to `scripts/validate-e6-brand-surfaces.mjs` (declaring the `M12_SCOPE` file
> set and the owner-provided directories so `F6` reflects the CURRENT declared
> phase while still refusing unexplained/protected paths). That edit is
> **uncommitted but verified working** (`E6_BRAND_SURFACES_VALIDATION_PASS`). No
> code change was half-written; the tree is coherent and type-clean.
>
> ### REMAINING M12 WORK (do NOT rebuild items 1–5 above)
> 1. **Commit the 11 modified files** (2 docs + 9 scripts) — verified but uncommitted.
> 2. **Documentation reconciliation still outstanding:** `README.md` (add the 4 new
>    validators to the gate list), `.clinerules/mercenta-business-model.md` (record
>    the M12 rules), `docs/INTEGRATIONS.md` (sales-estimator data seam: `keepa` /
>    `amazon_sp_api`), `GO_LIVE.md` (estimator + email activation preconditions).
> 3. **Full regression not re-run after the M12 UI additions:** the **complete
>    Playwright suite** (M11 baseline: 250 passed / 2 skipped) and the **complete
>    64-script validator sweep**, plus `npm run validate:wording` and
>    `node scripts/integrity-audit.mjs`.
> 4. **`e2e/investor-demo.spec.ts`** was repointed to 25 stages but has **not been
>    re-run** (the headless validator proves the stage; the browser spec is unverified).
> 5. **`rls-audit.mjs` genuine PRE-EXISTING finding (not M12):** `shipping_margins`,
>    `audit_log`, `leads`, `integration_connections` have **no `ENABLE ROW LEVEL
>    SECURITY` statement anywhere in `supabase/migrations`**, and the `using(true)`
>    blanket-policy check fails. M12 added **no** migration and made **no** schema
>    change — this needs an OWNER decision (a hardening migration), exactly as M10
>    recorded its two DB constraints instead of inventing them.
> 6. **Review ZIP not yet exported for this session**; also
>    `scripts/export-review-zip.sh` still `cd`s to `~/Desktop/Mercenta` (the empty
>    stub) and must become directory-relative before it can capture the real tree.
> 7. Not attempted (unchanged from the M12 prompt, NOT required to declare M12
>    complete): optional-infrastructure evaluation (Clerk/PostHog/Cloudflare/
>    Sentry/RevenueCat — documented as optional, none introduced) and any `.pptx`
>    export (explicitly NOT provided; HTML/print only).
>
> ### NEXT ACTION FOR THE NEW CLINE SESSION
> Read this checkpoint, then run **only** `git status --porcelain` and
> `git --no-pager log --oneline -6` in **`/Users/tadii/Desktop/1. Mercenta`** (NOT
> `/Users/tadii/Desktop/Mercenta`, which is an empty stub), then continue from
> item 1 of *Remaining M12 work*. Do **not** re-audit the repository and do **not**
> rebuild anything listed under *Completed & verified*.
> ---
>
> Last updated: 2026-09-14 (**M2 → M10 COMPLETE. THE ENTIRE VALIDATOR SUITE IS
> NOW GREEN: 60 validator scripts, 0 non-zero exits** — for the first time in the
> project's history. M10 repaired the 15 stale validators that M9 recorded as
> "pre-existing failures"; see §M10 for the per-validator diagnosis.)
>
> **M11 SESSION (2026-09-14) — BUILD-FORWARD: THE DEPLOY-TIME GAP CLOSED.**
>
> **① What was actually missing.** The M10 report's own §Remaining list named
> three real gaps, and §22 of the master spec named a fourth. All four were
> genuinely unbuilt, and each was **silently invisible** because the validator
> that should have caught it was SKIPPING rather than failing:
> - **Six Edge Functions had NO file in this repository.**
>   `scripts/validate-edge-functions.mjs` reported *36 assertions run / 0
>   failures / 35 skipped* — a green run that proved almost nothing. Now
>   `payouts-transfer`, `catalog-import`, `discovery-directory`,
>   `esign-envelope`, `send-email` and `instantly-reply-webhook` exist and are
>   actually asserted: **46 assertions / 0 failures / 0 skipped**.
> - **The validator read two migrations that NEVER EXISTED**
>   (`0010_rpc_catalog_import.sql`, `0011_cron_daily_digest.sql` — those numbers
>   are `010_create_compliance_docs.sql` / `011_create_messages.sql`). Repointed
>   to the real sequential history, and the files created as **024** and **025**.
> - **§23's two database invariants had no DB enforcement at all**, and the
>   reply router could not persist the human-attention flag it computes.
>   Migration **026** now adds BOTH constraints plus the `messages` routing
>   columns — all `NOT VALID`, so they bind every new write without any risk to
>   legacy rows.
> - **§13: Palletline had no adapter.** Its mode was `available`, so a simulated
>   UK-domestic carrier booking was refused. A full mock/real adapter now exists
>   (`src/lib/palletline`) and its mode is `simulation`.
>
> **② Two canonical-model corrections, made deliberately and reported.**
> - **§6 payout rails.** The old payout contract was a **Stripe** transfer. The
>   canonical model is **Wise (DEFAULT)** / **Payoneer (secondary)**, with Xero as
>   the accounting layer and **not** a rail. `src/config/payouts.ts` is now the
>   single source of truth, `createPayoutClient` resolves through it, and
>   `assertPayoutRail` REFUSES `stripe`/`xero`. The validator's Stripe
>   assertions were repointed (marked `§Phase M11 — REPOINTED`) with every
>   original invariant kept — idempotency forwarded, transfer-not-charge, an
>   unmistakable simulated id, positive amounts only, an explicit 503 — and
>   strengthened with the §7 human-approval gate. The pinned `mock_tr_` prefix
>   is preserved and the rail appended (`mock_tr_wise_000001`), so no existing
>   test layer needed weakening.
> - **§3/§5/§9 the two commercial models + VAT.** Neither existed as a
>   first-class concept. `src/config/commercialModel.ts` + 
>   `src/lib/finance/commercialModel.ts` now define Model A (commission) and
>   Model B (buy/resell) with the exact §25 investor figures DERIVED, not
>   retyped, and `src/config/vat.ts` is a real net/VAT/gross layer.
>
> **③ The M6 VAT decision was NOT overturned.** The production treatment stays
> `configuration_required` (`VAT_TREATMENT_CONFIGURED = false`) — no production
> tax figure is invented, and `validate-financial-reconciliation` still passes
> unchanged. The demo gains a **separately declared, labelled illustration**
> (`DEMO_VAT_ILLUSTRATION`) at the standard UK rate so real arithmetic is
> visible. Two facts, never collapsed.
>
> **④ Honest scope note.** This session did NOT add a new investor-demo STAGE.
> The 24-stage count is pinned in `validate-investor-demo.mjs`,
> `e2e/investor-demo.spec.ts` and the demo UI, and adding a stage would have
> forced three coordinated E2E changes that could not be fully re-verified
> inside this session's budget. Both models and all §25 numbers are instead
> pinned by the new `validate-commercial-models.mjs` (**36/36**) and exposed as
> canonical modules ready to render. **Surfacing them as a named stage remains
> open** — see §Remaining.
>
> **⑤ Genuine defects found and fixed (not silently patched).**
> - The `catalog-import` RPC I first wrote inserted `title`/`payload`/`updated_at`
>   into `public.products`. That table (003) has **no such columns** — it would
>   have been a write that could never execute, exactly the class of bug
>   `022_create_catalog_persistence.sql` was written to close. Corrected to the
>   real columns and asserted by the validator.
> - Both `catalog-import` and `payouts-transfer` first wrote `actor`/`metadata`
>   to `audit_log`. The real columns (015) are `actor_id`/`actor_role`/
>   `entity_type`/`details` — the audit writes would have 400'd silently.
>   Corrected, and asserted.
> - The Palletline mock's "exception retry recovers" branch was **unreachable**
>   (the poll counter had already advanced past the milestone). Fixed, and the
>   recovery path is now asserted.
>
> **⑥ EVIDENCE (M11, re-run in this session).**
> - `npx tsc --noEmit -p tsconfig.app.json` → **0 errors**
> - `npm run lint` → **0 errors**
> - `npm run build` → **✓ built in 3.72s**
> - **Validator sweep: 60/60 `validate-*.mjs` exit 0** (previously 58 scripts;
>   +2 new: `validate-db-hardening.mjs` 15/15, `validate-commercial-models.mjs`
>   36/36). One sweep run reported 2 failures in `validate-e5-admin-surfaces` /
>   `validate-e6-brand-surfaces`; both were **stale `023 remains newest` pins**
>   (M11 legitimately added 024–026) and were repointed with `§Phase M11 —
>   REPOINTED` comments. Re-run: **62/62 PASS** (60 validators + integrity audit
>   + wording gate).
> - `scripts/integrity-audit.mjs` → **PASS** · `npm run validate:wording` → **PASS**
> - **Full Playwright: 250 passed / 2 skipped / 0 failed** (3.9m) — identical to
>   the M10 baseline, so M11 introduced **zero E2E regressions**. One earlier
>   full-suite run reported 1 failure in `embedded-social.spec.ts` test 2; that
>   spec passes **11/11 in isolation** and the immediately repeated full run was
>   green, so it was a **test-isolation flake** (the assertion includes
>   `expect(errors).toEqual([])`, which is sensitive to parallel-load chunk
>   timing), not a defect. Reported rather than hidden.
> - `scripts/validate-edge-functions.mjs` → **46 assertions / 0 failures /
>   0 skipped** (was 36 run / 35 skipped).
> - Baseline `959b4d2` remains an **ancestor** of HEAD. Working tree **clean**.
> - Review zip: `Review Zip/mercenta-review.zip` (36M).
>
> **⑦ REMAINING (honest).**
> - **The two commercial models are not yet a named investor-demo STAGE.** They
>   are canonical modules with all §25 figures pinned by
>   `validate-commercial-models.mjs`, but the demo's 24-stage list (pinned in
>   `validate-investor-demo.mjs`, `e2e/investor-demo.spec.ts` and the demo UI)
>   was deliberately left unchanged this session. Rendering them as a stage is
>   the next mechanical step and requires updating those three pins together.
> - **Brand-level model selection is not yet persisted on the brand record.**
>   `resolveCommercialModel()` and `COMMERCIAL_MODELS` exist and fail closed, but
>   no onboarding step or brand field writes a chosen model yet.
> - **The 6 Edge Functions are present and validated, but NOT deployed** — that
>   needs a Supabase project plus provider secrets. Deploy-time only.
> - **Migrations 024–026 have NOT been executed** against any database (no
>   browser Supabase credentials in the demo environment).
> - `verify-registry.mjs` remains advisory and still flags **103 items** — the
>   same historical count M10 recorded (requirements-registry data quality, not
>   failures).
> - `payouts-transfer`'s live Wise/Payoneer request shape is written to the
>   documented endpoints and asserted structurally, but has **never been
>   exercised against the real rails** (no credentials).
>
> **M10 SESSION (2026-09-14) — VALIDATOR-SUITE REPAIR: 45 → 60 GREEN, 15 → 0 RED.**
>
> **① What was actually wrong.** 15 validator scripts exited non-zero. Every one
> was a **stale assertion**, not a product regression: each encoded a fact that was
> TRUE when it was written and was then legitimately changed by a later phase (the
> DHL/Palletline carrier model, provider-registry growth, the Phase-D shell
> routing/DataTable redesign, the §M2 compliance-gate signature, the Phase-S
> truthful social-engine resolution, migration renumbering, and the retirement of
> the `validate:stageNN` npm-script convention). Two crashed outright on migration
> filenames (`0013_deductions.sql`, `0014_vc_ack_asn_fields.sql`) that **never
> existed in this repository's history** — a tool that crashes proves nothing.
>
> **② The repair rule applied.** Each stale assertion was repointed to the
> CURRENT canonical source of truth (SSOT constants such as `PO_STATUS_ORDER`,
> `MERCENTA_CARRIER_ACCOUNTS`, `SHIPPING_CARRIER_ROUTING`, `DEMO_BANNER_TEXT`,
> `DEFAULT_HOMEPAGE_CONTENT`, the shells that now own routing) — never to a new
> hardcoded literal, and never by deleting the assertion. Where an invariant could
> not be asserted as written, a STRONGER one replaced it (lane routing, retired-
> carrier refusal, cross-tenant shipment refusal, dataset-completeness counts).
> Every repoint carries an inline `§Phase M10 — REPOINTED` comment stating the old
> contract and why it changed.
>
> **③ Genuine gaps reported, not silently patched.** Two DB-level constraints the
> old validators asserted have NEVER existed in this schema (the `deductions.category`
> CHECK and the "acknowledged qty ≤ ordered qty" DB trigger); the enforcement that
> does exist is domain-layer + RLS. The validators now assert the real enforcement
> and both gaps are recorded in §Remaining. **No application source was changed by
> M10 at all** — this phase is validators only.
>
> **④ Evidence.** Full Playwright suite **250 passed / 2 skipped / 0 failed**
> (3.2m) — identical pass count to the M9 baseline, so M10 introduced **zero E2E
> regressions** · 60/60 validator scripts exit 0 · `tsc --noEmit` 0 errors ·
> `eslint .` 0 errors · `npm run build` ✓ 2.61s · wording gate 184 files /
> 0 violations · integrity audit 61/61 · investor demo PASS (deterministic replay
> identical, zero network) · tenant coherence PASS · payouts PASS ·
> E7 `120 assertions / 0 failures` · e6 scope guard PASS (its M10 surface
> declared, mirroring the M9 fix).
>
> **⑤ REMAINING (honest, unchanged by M10).**
> - **Two DB-level constraints asserted by the legacy validators have never
>   existed in this schema and still do not:** (a) `deductions.category` has no
>   CHECK constraint (008 declares it plain TEXT; the category vocabulary is
>   enforced in the typed domain model), and (b) there is no database trigger
>   enforcing "acknowledged qty ≤ ordered qty" (the rule is enforced in
>   `src/data/api.ts`). Both are hardening candidates for a future migration;
>   M10 did NOT add a migration (023 remains newest) because that would change
>   the schema and other validators legitimately pin the migration count.
> - **`verify-registry.mjs` is advisory and still flags 103 items** — historical
>   `requirements-registry.json` entries describing components/views/nav ids that
>   the Phase-D redesign legitimately replaced or retired (e.g. `stage5-radar-chart`,
>   `stage5-score-history`, both `phaseE7-*` entries whose proofs are E7 validators
>   rather than E2E files). It exits 0 by design and is a registry-hygiene backlog,
>   not a failing gate. Recorded here rather than "fixed" by rewriting history.
> - **Edge Functions for the live provider paths are still absent from the repo**
>   (`spapi/*`, `dhl/label`, `payouts-transfer`, `esign-envelope`, `hmrc`,
>   `companies-house`, `catalog-import`, `discovery-directory`, `send-email`,
>   `instantly-reply-webhook`, `daily-digest`, `compliance-gate-check`).
>   `validate-edge-functions.mjs` reports 36 assertions ran / 0 failures /
>   35 skipped because the artefacts are deploy-time items — exactly as
>   `PRODUCTION_READINESS.md` records. They are NOT prerequisites for the
>   deterministic investor demo.
> - **Seeded shipping state is intentionally empty** (the §M9 finding): no seeded
>   PO is in a shipping status, so `DEMO_SHIPMENTS` and the seeded shipping-margin
>   ledger are legitimately empty and the investor demo creates them at runtime.
>   This is an owner-level demo-data decision, so it was NOT changed.
>

> **M8/M9 SESSION (2026-09-14) — DOCUMENTATION RECONCILED + FULL REGRESSION.**
>
> **① M8 — documentation now tells one story.** `README.md` (validation gates list
> the two new validators), `PRODUCTION_READINESS.md` (every §M2/§M6/§M7
> prerequisite, including what is NOT wired), `docs/MERCENTA_BUSINESS_MODEL.md`
> (§3.1 M2 anchors, §8.1 M6 anchors), `docs/INTEGRATIONS.md` (§10.5 document
> verification, §10.6 accounting representation), `GO_LIVE.md` (VAT decision +
> destination verification as preconditions), `MERCENTA_ARCHITECTURE.md` (§13
> additions + new entities), `PROJECT_STATUS.md`, `HANDOFF.md`. The historical
> `docs/PRODUCT_CONSOLIDATION_*` phase reports are deliberately preserved as
> point-in-time records, not current rules.
>
> **② M9 — full regression, and REAL pre-existing defects repaired (not excused).**
> - **`e2e/investor-demo.spec.ts` t4 (listed as pre-existing): FIXED.** The root
>   cause was a genuine domain defect — a second demo run without a manual reset
>   corrupted the run (`ILLEGAL_TRANSITION`, 15 error stages) because the reset
>   baseline was a shallow snapshot of a possibly-dirty module instance. Reset now
>   deep-clones, purges the demo tenant's records and `runInvestorDemo()` always
>   starts from that baseline.
> - **`validate-onboarding-workflow.mjs` G5 (listed as pre-existing): FIXED.** It
>   counted FILES (`<= 4`) as a proxy for "no parallel onboarding workflow"; the
>   count went stale when the investor-demo orchestration became a legitimate
>   caller. Repointed to the STRONGER structural invariant: exactly ONE module
>   implements the lifecycle, and only named canonical callers may reference it.
> - **`validate-review-s6.mjs` 7 failures (listed as pre-existing): FIXED.** All 7
>   were pre-redesign markup proxies. Repointed to the canonical dataset and the
>   current structural hooks (per-tenant logistics tables, every canonical brand
>   rendered, the owning brand of every product, the per-brand document summary,
>   the canonical review actions). One assertion exposed a REAL gap: Logistics
>   Control rendered three zero metrics with NO empty state, so an honest empty
>   state was added.
> - **`validate-e4-commerce.mjs` L4 (found this session, pre-existing): FIXED.**
>   It still asserted that a BRAND may declare its own dispute outcome — a rule
>   deliberately removed in Phase E2E. Repointed to the operator decision with the
>   brand refusal asserted explicitly (the invariant is unchanged).
> - **`validate-e6-brand-surfaces.mjs` (false failure caused by the phase-scope
>   proxy): FIXED.** The guard's real invariant (no PROTECTED path touched) was
>   preserved; the current phase's surface was added to its declared scope.
> - **Full Playwright suite: 250 passed / 2 skipped / 0 failed.** Typecheck 0 ·
>   eslint 0 · `npm run build` ✓ · wording gate 184 files / 0 violations ·
>   integrity audit 61 / 0.
> - **Remaining pre-existing validator failures (NOT caused by this sequence, and
>   unchanged from the pre-M2 baseline):** `e7-embedded-social` (4),
>   `homepage-editor` (2), `review-s1` (4), `review-s3` (1), `review-s4` (2),
>   `review-s5` (1), `rocketchat-removal` (2), `stage15`, `stage16` (1),
>   `stage19`, `stage24`, `stage26`, `stage6` (1), `stage7` (1), `stage8` (2),
>   `stage25` (3), `stage5`. Each was verified identical on a pristine
>   `git worktree` of the pre-M2 HEAD (`26aac36`).
> - **NEW FINDING (reported, not silently patched):** the canonical seed contains
>   NO purchase order in a shipping status (`SHIPMENT_STATUS_BY_PO` keys
>   `ready_to_fulfil`/`shipped`/`delivered` never occur in
>   `PO_STATUSES[(brandIndex + poIndex) % 7]` for the cleared brands), so
>   `DEMO_SHIPMENTS` and the seeded shipping-margin ledger are legitimately EMPTY.
>   Logistics Control now says so explicitly. Populating seeded shipping state is
>   a data decision for the owner (it changes dashboards, payout eligibility and
>   several specs), so it was NOT changed unilaterally.


>
> **M7 SESSION (2026-09-14) — INVESTOR DEMO EXTENDED 22 → 24 STAGES.**
>
> The canonical 22-stage lifecycle is NOT replaced; two stages were added on the
> SAME orchestration, using the existing seams, so the demo now proves the whole
> business model end to end:
>
> **① `shipping_commercial` (inserted after `shipment`, before `delivery`)** —
> canonical lane resolution proven BOTH ways (UK domestic → **Palletline**,
> international → **DHL**); an arbitrary carrier (fedex) refused; the demo shipment
> is **PO-gated** (a foreign tenant and a non-canonical carrier are both refused by
> `createShipmentForPO`); `computeShippingCommercials()` preserves carrier list
> cost, negotiated discount, carrier invoice cost, mark-up, surcharge, handling,
> VAT and margin; the **upfront brand charge** is written to the existing
> shipping-margin ledger WITH the carrier cost retained (never overwritten); and
> the retired hardcoded 90% rule is asserted absent.
>
> **② `cases` (inserted after `integrations`)** — a brand opens a case against its
> own tenant + related PO/deduction; channel escalation is **REFUSED before
> Mercenta review**; Mercenta reviews (`under_mercenta_review`) and approves
> escalation; an **unknown provider mode is refused** (fail-closed, no simulated
> channel case); escalation is **idempotent** and opens a clearly-fake
> `AMZ-CASE-MOCK-…` case; the provider response is recorded; the case is resolved;
> reads are tenant-scoped and the whole lifecycle is audited.
>
> **③ REPLAY SAFETY.** The helpdesk ticket store is now part of the demo baseline
> (`restorable('tickets')`) and the purge removes the demo tenant's cases, so
> `reset → run` still reproduces the SAME digest and no run accumulates duplicate
> cases.
>
> **④ EVIDENCE.** `validate-investor-demo.mjs` → **PASS** at 24 stages with new
> §M7 assertions (shipping lanes, PO-gating, commercial breakdown, upfront charge,
> case review → escalation → response → resolution, tenant scoping) ·
> `e2e/investor-demo.spec.ts` **10/10** (stage-count assertions repointed to 24) ·
> typecheck **0** · eslint **0** · build ✓ · **zero network calls**, digest replay
> identical.

>
> **M6 SESSION (2026-09-14) — CANONICAL MONEY FLOW: payment → reconciliation →
> accounting → payout eligibility → payout.**
>
> **① ADDITIVE MODEL (no parallel money store).** `PaymentReconciliation`,
> `BrandPayoutDestination`, `CommissionPayout` + `PayoutState`/`VatTreatment`/
> `PaymentReconciliationState` in `src/types.ts`. The PO store stays the source of
> value/commission; `listCommissionsForPayout()` stays the payable projection and
> `lib/billing/payouts.ts` stays the transfer seam + fee maths. The new records add
> IDENTITY + STATE only. **No migration** (still 23).
>
> **② NEW SEAMS.** `src/lib/finance/accountingSeam.ts` — accounting provider seam:
> `simulated_accounting_representation` (deterministic, zero network, `SIM-XERO-REC-…`,
> only when the mode is POSITIVELY `simulation`), `xero` (the EXISTING
> `src/services/xero` client via `reconcileAmazonRemittance`; without credentials it
> reports "not connected" and NOTHING is claimed as represented) and a fail-closed
> `unavailable_accounting_representation`. `src/lib/finance/financialReconciliation.ts`
> — `reconcilePayment` (one deterministic `rec-<paymentId>` per payment; duplicate
> refused; a mismatched PO assertion is an EXCEPTION), `evaluatePayoutEligibility`,
> the payout state machine (`ensure/submitted/settled/failed/retry`) and
> `setDestinationStatus` (verification requires a reference; every change audited).
>
> **③ PAYOUT GATES (all enforced in the ONE settlement path).** No payout without a
> RECONCILED payment for the PO, no payout with an unresolved deduction, no payout to
> an UNVERIFIED destination, no duplicate payout. A refusal writes a **blocked**
> payout record + audit row; a declined transfer leaves the commission UNPAID and
> retryable; **a settled payout is never downgraded** by a later refusal.
>
> **④ VAT — NOT INVENTED.** `src/config/commercial.ts` now carries
> `VAT_TREATMENT = 'configuration_required'` + `VAT_TREATMENT_CONFIGURED = false`, so
> every reconciliation records `vatConfigured: false` and computes NO tax amount while
> the business/accounting decision is outstanding. Flip the config and the same money
> flow expresses the agreed treatment.
>
> **⑤ UI (no redesign).** Accounting panel: a **Reconciliation** column (state +
> payment id), a **Payout** column (canonical payout state + the blocked reason) and a
> **Payout destinations** card with the audited Verify/Suspend operator actions.
>
> **⑥ DEMO DATA.** Payout destinations are DERIVED from the brand list (one brand left
> `unverified`); seeded reconciliations are DERIVED from the canonical PO + commission
> projection so the Accounting surface is money-coherent. The investor demo now
> reconciles the received payment before paying out and proves the two refusals
> (before reconciliation, before destination verification).
>
> **⑦ EVIDENCE.** NEW `scripts/validate-financial-reconciliation.mjs` → **ALL PASS**
> (48 checks incl. zero-network) · `validate-investor-demo.mjs` **PASS** (+8 §M6
> checks) · `validate-e6-brand-surfaces` **PASS** · `e2e/brand-payouts.spec.ts`
> **4/4** (was 2/2; statuses assertion repointed to the closed canonical vocabulary)
> · `e2e/investor-demo.spec.ts` **10/10** · typecheck **0** · eslint **0** · build ✓.

>
> **M2 SESSION (2026-09-14) — DOCUMENT VERIFICATION SEAM + HARD-GATE ENFORCEMENT.**
>
> **① ADDITIVE MODEL.** `DocumentVerificationRecord` (+ `DocumentVerificationStatus`,
> `DocumentVerificationMethod`, `DocumentVerificationProviderSource`) added to
> `src/types.ts`; `ComplianceDocument` gained `rejected` + `superseded` lifecycle
> states and the additive `version` / `supersedesDocumentId` / `verificationStatus`
> / `latestVerificationId` / `reference` / `issuer` fields. Records live in ONE new
> canonical store (`demoDocumentVerifications` in `src/data/demoStore.ts`), resettable
> with the rest of the demo. **No migration** (still 23) — nothing here needs
> persistence beyond the existing `compliance_documents` table.
>
> **② PROVIDER SEAM.** NEW `src/lib/verification/documentVerification.ts` with four
> interchangeable providers behind one interface: `internal_structural_rules`
> (automated, real, deterministic, `external: false`), `simulated_document_verification`
> (`simulated: true`, unmistakably `SIM-DOC-VERIFY-…`, only reachable when the mode is
> POSITIVELY `simulation`), `manual_mercenta_admin` (first-class operator path, records
> identity + method + reason), and `unavailable_document_verification` (FAIL-CLOSED for
> unknown / not_registered / available / configuring / disabled / degraded / error).
> Full lifecycle: submit → pending → automated verdict → reject → **replace (next
> version, previous superseded but retained)** → verify → gate clears. Manual approval
> **cannot** bypass the document requirement (no artefact ⇒ fail).
>
> **③ REQUIREMENTS RECONCILED.** `src/lib/compliance.ts` now expresses requirements as
> explicit rules: 4 UNIVERSAL documents (never conditional) + category rules whose
> CONDITION is stated (`touchesFood`, `isElectrical`, `isCosmetic`, `isTextile`,
> `isAutomotive`, `isBaby`, `isPerishable`). `getRequiredDocumentsForContext()` only
> NARROWS when the condition is positively `false` — unknown stays required
> (fail-closed). Counts are unchanged, so every existing gate test still holds.
> The gate now evaluates the **latest version** of each requirement
> (`latestDocumentsByType`), so a replacement is judged, not the superseded record.
>
> **④ UI (no redesign).** Brand `ComplianceHub`: per-requirement rationale, conditional
> badge, blocking reason, verification verdict (`simulated` / `external` stated
> truthfully) and a **Replace** action for rejected/expired documents.
> Admin `ComplianceApprovals`: **Verify (automated)** / **Approve (manual)** /
> **Reject**, per-row version + verification badge, and an honest outcome note.
>
> **⑤ REAL DEFECT FIXED (not pre-existing-and-ignored).** A second investor-demo run
> without a manual reset corrupted the run (onboarding `ILLEGAL_TRANSITION`, 15 error
> stages) because the reset baseline was a shallow snapshot of a possibly-dirty module
> instance. Reset now deep-clones its baseline, PURGES the demo tenant's own records
> from every canonical store, and `runInvestorDemo()` always starts from that baseline.
> This repaired `e2e/investor-demo.spec.ts` test 4 (was failing before this session).
>
> **⑥ SEED.** Demo compliance documents now carry unmistakably simulated evidence
> (`simulated://…`, `SIM-…`, "Simulated issuing body") so automated verification is
> exercisable while `missing` documents still have NO artefact. Reed & Oak's
> `food_contact_material` is seeded `rejected` to exercise the replacement path.
>
> **⑦ EVIDENCE.** NEW `scripts/validate-document-verification.mjs` → **ALL PASS**
> (52 checks) · `validate-investor-demo.mjs` **PASS** (+11 §M2 checks) ·
> `validate-canonical-model.mjs` **34/34** · `validate-e6-brand-surfaces` **PASS** ·
> NEW `e2e/document-verification.spec.ts` + `compliance-gate.spec.ts` +
> `compliance-sim.spec.ts` **13/13** · `e2e/investor-demo.spec.ts` **10/10** (was 8/10) ·
> typecheck **0** · eslint **0** · `npm run build` **✓**.

>
> **CANONICAL MODEL SESSION (2026-09-13, seventh session) — RECONCILIATION + M3/M5 BUILT.**
>
> **① CANONICAL DOC.** NEW `docs/MERCENTA_BUSINESS_MODEL.md` is now the single
> authoritative statement of the operating business (proxy/distribution model,
> hard compliance gate, PO routing, PO-gated shipping, cases, deductions,
> money/VAT/Xero/payout, automation + admin override, providers, testing
> intent). `README.md` rebuilt from a 3-line stub into a real index;
> `docs/INTEGRATIONS.md` gained §10; `PRODUCTION_READINESS.md` records the new
> prerequisites. Historical consolidation documents were left intact.
>
> **② §11 CARRIER ROUTING — CENTRALISED.** NEW `src/config/shipping.ts` +
> `src/lib/shipping/carrierRouting.ts`: **international → DHL, UK domestic →
> Palletline**, partnered carrier permitted **only** on Freight Collect. Removed
> the arbitrary carrier lists from BOTH ASN surfaces (brand `BrandPurchaseOrders`,
> admin `AdminPurchaseOrderDetail`) — they now read the rule from the module.
> `createShipmentForPO(poId, asn, actorStaffId?, actingBrandId?)` gained a real
> **tenant guard** (a brand can only derive a shipment from its OWN eligible PO)
> and enforces the canonical carrier rule (fedex/bak are refused).
>
> **③ §12 SHIPPING COMMERCIAL MODEL — BUILT.** NEW
> `computeShippingCommercials()` in `src/lib/shipping/shippingCalculator.ts`:
> carrier list cost → negotiated discount → **carrier invoice cost** → mark-up +
> surcharge + handling → brand charge → VAT (**charged / recoverable / payable**)
> → gross shipping margin → net Mercenta revenue. Carrier cost and brand charge
> are BOTH retained (the old code had a single markup and no carrier-invoice
> side). All terms are `placeholder: true` in `src/config/shipping.ts`; **no
> hardcoded 90%** — asserted by the validator.
>
> **④ §15 CASES — ADMIN REVIEW BEFORE CHANNEL ESCALATION.** Canonical case
> workflow added to the EXISTING `ticketStore` (no second case system):
> `createCase` → `beginCaseReview` → `reviewCase(approve|request_info|reject)` →
> `escalateCaseToProvider` → `recordProviderCaseResponse` → `resolveCase` /
> `closeCase`, plus brand-scoped and operator read models. NEW fail-closed seam
> `src/lib/helpdesk/amazonCaseClient.ts` (`MockAmazonCaseClient` deterministic +
> idempotent + zero network; `UnavailableAmazonCaseClient` for every other mode —
> never simulated). Ticket type extended additively (escalation state, related
> PO/shipment/deduction/payment/compliance, admin review, provider case +
> response, resolution). UI: "Brand cases — Mercenta review queue" panel in
> Admin → Helpdesk with Approve / Request info / Reject / Escalate.
>
> **⑤ REGISTRY.** `palletline` added to the canonical provider registry (19
> entries) with `defaultMode: 'available'` — honest, because no Palletline
> adapter exists yet (the fail-closed gate refuses a simulated Palletline
> provider operation).
>
> **⑥ NEW VALIDATOR.** `scripts/validate-canonical-model.mjs` → **34/34 PASS**.
>
> **⑦ GATES.** typecheck **0** · eslint **0** · build **✓** · integrity audit
> **61 / 0** · wording **181 files / 0 violations** · canonical-model **34/34** ·
> investor-demo validator **PASS** · targeted Playwright **31 passed / 1 failed**
> (the failure is the **pre-existing** `investor-demo` t4 — it fails identically
> on the stashed pre-change tree, confirmed with `git stash`).
>
> **⑧ REMAINING (honest).** The full M-series is NOT complete: **M2** document
> verification record/providers (expiry/versioning/superseded states, automated
> vs manual interchangeable verification) is NOT built; **M6** finance
> (payment→PO reconciliation, Xero posting identity, verified payout destination,
> automated brand payout from a reconciled payment) is NOT built; **M7** the
> investor demo was NOT extended with the new stages (still 22); **M8** full
> repository-wide documentation sweep is partial; **M4** PO automation was
> verified as already canonical (no change needed). Full Playwright suite was NOT
> run end-to-end this session (targeted specs only).
>
> **NEXT:** M2 compliance verification engine → M6 finance/Xero/payout →
> M7 investor-demo extension → M8 docs sweep → M9 full regression.

>
> **PHASE E2E (2026-09-13, sixth session) — DETERMINISTIC INVESTOR-DEMO PLATFORM COMPLETED.**
>
> **① NEW `src/lib/simulation/investorDemo.ts`** — ONE runnable, zero-network,
> reset/replayable lifecycle across the whole platform, built ENTIRELY on the
> existing canonical architecture (no parallel demo app, no second domain store).
> 22 stages in order: application → approval → onboarding → compliance →
> catalogue → purchase_order → acknowledgement → fulfilment → shipment →
> delivery (incl. simulated invoice + payment) → returns → deductions → dispute
> (operator resolution) → commission → payout → crm → marketing → integrations
> → social → rbac → audit → error_recovery. Every stage calls the SAME seams the
> product's own UI calls (`applicationStore`, `onboardingLifecycle` E1/E2,
> `uploadComplianceDoc`/`setComplianceDocStatus`/`evaluateBrandCatalogGate`,
> `catalogLifecycle` E3, `commerceLifecycle` E4, `settleBrandPayout` Stage-8,
> `crmStore`/`returnsTracking`/`prospectStore`, the Integration-Hub mode resolver
> and the Phase-S `social/engineAdapter`). Fail-closed: provider-backed stages
> refuse unless the provider positively resolves `simulation`; unknown/live are
> never simulation. `networkCalls` is 0 by construction and by inspection.
>
> **② REAL §14 DEFECT FIXED (found while building the lifecycle).** A brand could
> declare its OWN dispute outcome: the brand portal's shared commerce panel
> exposed "Resolve (won)" and `resolveCommerceDispute` accepted a tenant-pinned
> actor, so a brand could award itself the money — while the OPERATOR had no
> resolve surface at all. Fixed in the DOMAIN (`resolveCommerceDispute` refuses a
> brand-pinned actor: "resolution is a Mercenta operations decision"), the brand
> surface now states "Awaiting Mercenta operations decision", and the admin
> `CommerceOperationsPanel` gained the real operator won/partial/lost resolution
> (`data-state="commerce-operator-resolve-*"`, scoped by `data-deduction`).
> The E4 spec was updated to the corrected business rule (brand refused → operator
> resolves → canonical outcome), preserving its intent.
>
> **③ Canonical store additions (minimal, backwards-compatible, no duplicates):**
> `applicationStore.submitApplication(..., { opts: { id } })` deterministic id;
> `acquisitionStore.removeOnboarding(id)` scoped removal; `demoStore.addReturn`
> optional deterministic id; `createDeductionInStore` / `raiseCommerceException`
> optional deterministic id; NEW `demoStore.ensureDistributionAgreement` +
> `api.issueDistributionAgreement` (the compliance gate has always required a
> signed distribution agreement, but contracts were SEED-ONLY, so a brand created
> through the real application → approval → onboarding path could never clear its
> gate — that gap is now closed by a canonical operator action).
>
> **④ UI (extends the existing Simulation Control Centre — no second dashboard):**
> NEW `src/components/admin/integrations/InvestorDemoPanel.tsx` mounted at the top
> of `SimulationControl.tsx`. Badges state Simulation · Deterministic · No live
> integration · Demo/test data; a Run control, a Reset control, per-stage OK /
> BLOCKED / ERROR status words (never colour-only), stage consequences and record
> ids, audit-row count, `network calls: 0`, and a replay-digest comparison that
> survives a reset (`identical to the previous run — deterministic replay
> confirmed`). Super-Admin only, with the same in-component tier refusal as the
> rest of the surface.
>
> **VERIFICATION (real output, this session):**
> `node scripts/validate-investor-demo.mjs` → **INVESTOR_DEMO_VALIDATION_PASS
> (41/41 checks)**, including `fetch`/`XHR` instrumentation → **0 network calls**,
> reset → run → **identical digest**, no duplicated PO/deduction/commission,
> money assertions (£504.00 value, £35.28 commission at 7%, £468.72 net share),
> and every failure drill. `e2e/investor-demo.spec.ts` → **10/10 PASS**
> (lifecycle 22/22 OK in a real browser, external calls `[]`, reset→replay digest
> equality, tenant-isolation + RBAC refusals in the domain, error/recovery
> drills, accessibility names + status words, 375/768/1440 no horizontal
> overflow). `e2e/commerce-operational-simulation.spec.ts` → **5/5 PASS**.
> Full-suite gates recorded in the session report below.
>
> **REMAINING (honest):** the run is in-memory (no Supabase credentials in the
> browser → nothing durable, migrations 020–023 still unexecuted);
> Renderer/browser manual click-through beyond Playwright was not performed.
> **NEXT: Phase F (production preparation, per GO_LIVE.md) → Phase G (demo
> rehearsal against demo.mercenta.co.uk) — production deploy NOT authorised.**
>

>
> **PHASE S (2026-09-13, fifth session) — SOCIAL COMPLETED AS FAR AS THE INFRASTRUCTURE ALLOWS.**
> Commit: **`<see below>`**. The verified blocker is unchanged and is EXTERNAL + PAID:
> the engine droplet is 2 vCPU / 4 GB and its provider orchestrator is OOM-killed, so the
> engine cannot complete a publish without an 8 GB resize. That was NOT faked, and it no
> longer blocks the demo.
>
> **① The social engine now has a mock-first SEAM** (`src/lib/social/engineAdapter.ts`):
> the engine's OWN contract — provider catalogue (the canonical `SOCIAL_PROVIDERS`),
> channel connect/disconnect, post lifecycle (`DRAFT · QUEUE · PUBLISHED · ERROR`, the
> engine's verified vocabulary), scheduling, deterministic queue execution, failure +
> retry recovery, cancellation and analytics — with **no network call at all**.
> **FAIL-CLOSED**: `createSocialEngineClient` refuses `configured`, `live`, `degraded`,
> `error`, `disabled`, `unknown`, `null`, `undefined` and `''`; only a positively
> identified `simulation` is accepted. Every record is `simulated: true` and every
> release id is `sim-rel-…`, so a simulated publish can never be read as a real one.
>
> **② The engine mode is now TRUTHFUL.** `resolveSocialEngineConfig` used to fall back to
> the verified host unconditionally, so the surface always reported **"Connected"** even
> though that engine cannot finish a publish. `configured` now requires an EXPLICIT
> engine URL (integration metadata or `VITE_SOCIAL_ENGINE_URL`) — an env var or a
> hardcoded host is not a connection, and a capacity-limited engine is not "live".
> With no explicit engine URL the mode is `simulation` and the deterministic
> **Studio (simulation)** renders: connect a channel, compose, queue, publish, fail,
> retry, cancel, and read analytics — all through the same seam.
>
> **Verification:** `scripts/validate-social-simulation.mjs` **29/29 PASS** (fail-closed
> across 9 non-simulation modes, lifecycle, scheduling windows, degraded-provider
> failure + retry recovery, cancel rules, analytics consistency, determinism across two
> identical runs, reset) · `e2e/embedded-social.spec.ts` **11/11 PASS** — new test 11
> drives the studio end-to-end in a real browser and asserts **zero** provider/engine
> host contact; test 10 repointed to the current architecture (hands off when an engine
> is explicitly configured, otherwise states the truth and offers the studio).
> **Gates:** typecheck **0** · eslint(src+e2e) **0** · build **✓** · full Playwright
> **231 passed / 0 failed / 2 skipped** · integrity audit **61 / 0** · wording gate
> **177 files / 0 violations** · `validate-payouts` **17/17** · `validate-tenant-coherence`
> **9/9** · `validate-postiz` **0 failures** · migrations unchanged (**23**) · baseline
> `959b4d2` ancestor.
> **STILL EXTERNAL (unchanged, not faked):** the engine's remaining live capability after
> a publish request — final `PUBLISHED` + provider release id, scheduled-post execution —
> needs the PAID 8 GB droplet resize, and real channel OAuth needs external credentials.
> Both are isolated from the core platform.
> **NEXT:** Phase E2E (deterministic investor-demo workflows across the whole platform) →
> Phase F (production preparation) → Phase G (demo rehearsal) → Rakazo LAST.
>
> **PHASE D6 (2026-09-13, fourth session) — FINANCE COMPLETED, DASHBOARDS DRILLABLE, REAL TENANT LEAK FIXED.**
> Commits: **`f35ddc6`** (payouts wired + Finance KPI band) · **`<see below>`** (dashboards + coherence).
>
> **① Finance — the payout seam is now USED.** `settleCommission` /
> `createPayoutClient` had **zero call sites** and the Accounting surface displayed a
> hardcoded `<td>No pending payouts</td>`, so a commission could never leave
> `accrued`/`invoiced`. Built: `settleBrandPayout` (api.ts) wiring
> `createPayoutClient → settleCommission → canonical store write → canonical audit
> row`; the brand payout ledger is a canonical `DataTable` with **drill-down KPI
> tiles** (pending / settled / all), honest mock provenance
> (`Simulated payout mock_tr_… — no live Stripe call was made`), loading / empty /
> error+retry states. Rate-unit defect found and made impossible:
> `commissionRate` is a PERCENT in the canonical convention but a FRACTION in two
> generation paths → `resolveCommissionRatePct` derives the effective % from the
> RECORDED `commissionAmount` (both conventions now produce identical money).
> `normalisePayoutTrack` gives ONE documented rule for `unassigned`.
> **Validator:** `validate-payouts.mjs` extended to 17 assertions (all green).
>
> **② Commissions now ACCRUE from the canonical PO store** (they were a frozen
> module-load snapshot): a PO accepted at runtime now produces a payout, while the
> only non-derivable fact (a settlement) is remembered in the settlement ledger.
> `resetSettledCommissions()` gives deterministic replay.
>
> **③ Dashboards — real, actionable, cross-checked.** Admin: new `payouts-pending`
> KPI (canonical fee maths) + Finance attention rows → drill to the real settlement
> surface. Brand: the brand had **NO payout visibility at all** — it can now see
> what it is OWED, tenant-scoped, with the canonical commission status layer and
> the same fee maths the operator settles with.
>
> **④ REAL TENANT-ISOLATION DEFECT FOUND AND FIXED.** Writing the tenant test
> surfaced that Zambezi's own dashboard displayed **DeskForge's PO-9003**: the
> returns seed was hand-written against a parallel universe (a return pointing at
> another tenant's PO, one at the non-existent PO-9005 for a brand owning no
> products/POs, and `SPB-*`/`GSP-*` SKUs owned by no brand). Returns are now
> **DERIVED** from the canonical PO + product stores, so a return can only
> reference its own brand's PO and SKU.
>
> **New verification:** `e2e/brand-payouts.spec.ts` **2/2** (pending set derived;
> settle → truthful mock mode + leaves pending + canonical audit row; **zero
> external network calls**) · `e2e/multi-tenant.spec.ts` **7/7** (new payout-ledger
> isolation test) · `scripts/validate-tenant-coherence.mjs` **9/9** (returns/PO/SKU,
> return→deduction, deduction→PO, commission→PO, deterministic settle/reset).
> **Gates:** typecheck **0** · eslint(src+e2e) **0** · build **✓** · full Playwright
> **230 passed / 0 failed / 2 skipped** · integrity audit **61 / 0** · wording gate
> **176 files / 0 violations** · registry validator exit 0 (pre-existing
> informational flags) · migrations unchanged (**23**) · baseline `959b4d2` ancestor.
> **Known stale (not a gate):** `scripts/validate-review-s6.mjs` still asserts
> pre-redesign markup for BrandCRM/CatalogManager/ComplianceApprovals (7 failures,
> untouched surfaces, pre-existing).
> **NEXT:** finish the remaining Phase D surfaces (CRM, Catalogue, Marketing,
> carrier/admin operational density) → **Phase S (Mercenta Social E2E)** → Phase E2E
> (deterministic investor simulation) → F → G → Rakazo LAST.

>
> **PHASE D5 (2026-09-13, third session) — THE OPERATIONAL TABLES ARE MIGRATED.**
> No migration, no new store, no new visual language: the extended canonical `DataTable`
> (`src/components/ui.tsx`) now backs every remaining operational list.
>
> **Tables migrated to the canonical `DataTable` (12):**
> brand deductions ledger (already done) · admin returns tracking (already done) ·
> **carrier manifest** · **product catalogue (15 columns)** · **brand returns** ·
> **admin audit log** · **campaign performance** · **acquisition pipeline** ·
> **deductions & chargebacks (Retail Pipeline)** · **logistics control** ·
> **commerce activity trail** · **fulfilment score list** · **staff & roles matrix** ·
> **Companies House** · **HMRC VAT**.
> Skipped ON PURPOSE (the primitive does not fit, per the directive's "do not
> mechanically replace every table"): the Brand Intelligence 14-column analytical
> matrix (it has its own header-click sorting contract), nested detail tables
> (PO line items, ASN lines), and print/key-value tables (TamSam, guidance, CSV preview).
>
> **Primitive hardening shipped with it (3 real defects fixed at the root):**
> 1. **Duplicate-DOM defect.** The cards + table were BOTH rendered and toggled with CSS,
>    so every row existed twice: two copies for assistive tech, and `text=/X/`.first()
>    could resolve to the HIDDEN copy. `DataTable` now renders exactly ONE representation
>    (media query as state, sync on first render). This fixed two full-suite failures
>    (`catalog-product-management` 1, `domain-acceptance` 7) with **no test edits**.
> 2. **`data-table` passthrough + `rowClassName`** so E2E row-count selectors and the
>    delayed-shipment row highlight survived migration.
> 3. **Catalogue availability toggle had no visible consequence** (wrote the canonical
>    store but nothing re-read the projection). Now gives immediate deterministic
>    feedback (`aria-pressed`) while still writing the canonical store.
> Also fixed: Logistics Control rendered a LOCAL status string; it now uses the
> canonical `shipmentStatusPresentation` (one label/tone everywhere).
>
> **Preserved per-surface contracts:** deduction column indices 5/6 (deductions.spec.ts),
> Logistics Control PO `td` + no bare `—` `td`, carrier manifest `<select>` ancestor depth
> (shipment-asn.spec.ts), `table[data-table="acquisition-pipeline"]` row counts (domain-acceptance),
> external search/filter state on returns/audit/acquisition surfaces, all inline controls.
>
> **New verification:** `e2e/table-migrations.spec.ts` **2/2** — the 15-column catalogue at
> 375px shows labelled cards with EVERY field and action and the availability click has a
> visible consequence; the carrier manifest keeps a working milestone `<select>` on a phone
> and the SAME record's canonical `[data-status]` badge follows it; zero horizontal overflow.
> **Gates:** typecheck **0** · eslint(src+e2e) **0** · build **✓** · full Playwright
> **225 passed / 0 failed / 2 skipped** (227 collected incl. the 2 new) · integrity audit
> **61 passed / 0 failed** · wording gate **176 files / 0 violations** · migrations unchanged
> (**23**) · baseline `959b4d2` still an ancestor.
> **STILL OPEN — Phase D remainder:** per-screen density/hierarchy pass on the remaining
> major screens (dashboard KPI bands, CRM, finance incl. the AccountingPanel "Brand Payouts"
> table which is still a hardcoded empty shell with no canonical payout read model), then
> Phase S (Social E2E), Phase E2E (deterministic investor simulation), Phase F/G (production
> prep), Rakazo LAST.

>
> **PHASE F2 + D3 + D4 (2026-09-13, second session) — TRUTHFUL AUDIT + THE TABLE PRIMITIVE.** Commits
> **`76ff520`** (integrity audit repair + wording gate) · **`3f14c4a`** (DataTable extension + deductions
> ledger) · **`8efc6b4`** (returns tracking table).
> **F2 — the integrity audit is GREEN (61 passed / 0 failed; was 46/12) and now describes the CURRENT
> architecture.** Every stale assertion was repointed rather than deleted: the homepage pitch/CTA checks
> assert the live compliant copy and that the obsolete "Get Started" copy cannot return; the brand-mark
> check follows the real render path (public shell + assets); the carrier wiring checks follow
> `CarrierShell` (Phase 6 moved carrier nav there) plus a new App-lazy-render assertion; the six
> account-menu assertions follow `BrandShell`/`AdminShell` with a new assertion that `AppShell` forwards
> all three handlers into the Header. **`npm run validate:wording` was RESTORED** (the gate and script
> still existed; only the wiring was lost) — and the gate then failed for REAL reasons: **53
> outward-facing wording violations** naming the retail channel in brand-facing copy. Those were fixed,
> not hidden: tour definitions (20), BrandIntelligence, the onboarding agreement text, Mercenta Social's
> same-site note, and 13 outbound outreach strings now use the approved public vocabulary; two further
> leaks (an ASN audit reason, a Social finding) were corrected; four genuinely internal/admin-only/
> protected files were added to the tool's documented EXCLUDED list with reasons (BI seed evidence, the
> BI provenance label asserted by `bi-intelligence-preservation.spec`, the reseller-detection predicate,
> protected Xero mock data). Result: `WORDING_LINT_PASS — scanned 176 src files, 0 violations`.
> **D3 — the canonical `DataTable` was extended properly** (not a one-off variant): `render` cells,
> `align`, `primary` (mobile card title), `hideBelow` progressive disclosure, `rowActions` (desktop cell
> + mobile card footer, so an action can never be clipped), `mobile: 'cards' | 'scroll'` — an INTENTIONAL
> mobile strategy replacing bare horizontal overflow, `emptyAction`/`errorAction` recovery paths and an
> `aria-busy` loading state. The generic constraint was relaxed from `Record<string, unknown>` to `T`
> (domain interfaces have no index signature — the old signature made every real migration impossible).
> Backwards compatible with all existing call sites. **First migration: the brand deductions ledger**
> (Tour 5 surface), whose raw 6-column table also carried a FOURTH hand-rolled status colour map
> (contradicting both admin surfaces) — now canonical + cards on mobile.
> **D4:** the admin **returns-tracking** table migrated the same way (Advance action reachable at every
> width, progressive disclosure at md/lg, canonical empty state).
> **New verification:** `e2e/table-responsive.spec.ts` **3/3** — desktop shows the table and hides the
> cards; 375px shows labelled cards (Status + Amount present, semantic `role=status`) and hides the table;
> 768px keeps the table; **zero horizontal overflow at all three**. `design-system.spec.ts`'s DataTable
> assertion retargeted to the instance visible at the test viewport (intent preserved).
> **Gates:** typecheck **0** · lint **0** · integrity audit **61/0** · wording lint **PASS** · targeted
> regression 29 + 25 + 66 passing across the touched surfaces · migrations unchanged (23) · baseline
> `959b4d2` an ancestor. **STILL OPEN (exact next steps):** migrate the remaining operational tables onto
> the extended `DataTable` (carrier manifest, product catalogue's 15-column table, BrandReturns, audit
> log, marketing/prospect tables) and the per-screen density pass (CRM, catalogue, finance) — the
> primitive is now ready, so each is mechanical.
>
> **PHASE D2 + F (2026-09-13) — STATUS SWEEP ACROSS THE REMAINING SURFACES + PRODUCTION PREPARATION.**


> Commits **`619b98b`** (D2a commerce) · **`6c3d898`** (D2b dashboards + logistics/carrier) ·
> **`c347e40`** (D2c onboarding/returns/settings) · Phase F in the same session.
> **D2 — every remaining DOMAIN status now renders through one canonical layer.** Completed the sweep
> surface-by-surface (not blanket substitution): the purchase-order lifecycle, per-line acknowledgement,
> the computed 24-hour ack window, deductions, catalogue submissions, shipments, onboarding records,
> returns tracking, PO outages, the compliance gate and the commission-billing decision all resolve
> through `src/lib/statusPresentation.ts` (label + semantic tone + machine-readable `data-status`).
> **Three duplicated status sources were deleted, not duplicated:** the brand PO list's local
> `STATUS_BADGE`/`STATUS_LABEL` maps, `RetailPipeline`'s local component literally named `StatusBadge`,
> `OnboardingPipeline`'s STATUS_STYLES/STATUS_LABEL, `ReturnsTrackingDashboard`'s STATUS_BADGE,
> `BrandSettings`' outage map, `BrandDashboard`'s PO_STATUS_LABELS/poTone, and **`STATUS_COLORS` in
> `types.ts`** (the per-status colour map the logistics hub and carrier dashboard both read — a third
> way of presenting the same statuses, with no semantic attribute). Two genuine inconsistencies were
> eliminated: the same `deduction.open` state rendered amber on the Retail Pipeline and red on the admin
> PO detail, and the same PO status rendered "Under review"/"Ready to fulfil" on the dashboard vs
> "Under Review"/"Ready to Fulfil" on the PO list. **No domain value, gate, workflow or tenant scope was
> changed; no migration.** New/extended browser verification: `status-semantics.spec.ts` **6/6** —
> including an invariant test that crawls `[data-status]` on the brand PO list, the admin Retail
> Pipeline, the brand dashboard and the carrier manifest and fails if ANY status outside the canonical
> vocabulary appears (it caught a missing `under_amazon_review` entry on first run).
> **F — production preparation (buildable items built, not audited).** **`GO_LIVE.md` now EXISTS** —
> the ordered go-live runbook (preconditions incl. the repo gate, environment, migrations + Edge
> Functions, the credential-only provider swap, deploy via the single existing script, an 8-step
> post-deploy smoke test, rollback, and the explicit non-scope: Social parked / Rakazo last). A real
> tooling defect was FIXED: **`scripts/validate-edge-functions.mjs` crashed with ENOENT** on every
> absent Edge Function; it now distinguishes PASS / FAIL / ABSENT, reports the **8 deploy-time
> artefacts** explicitly, asserts only what exists, and exits 0
> (`Assertions run: 37 · failures: 0 · skipped (absent artefact): 36`).
> **Gates (final, this session):** typecheck **0** · lint **0** · build **✓ 3.48s** · **full Playwright
> suite 222 passed / 0 failed / 2 skipped** · `verify-registry` 0 new violations · migrations unchanged
> (23) · baseline `959b4d2` still an ancestor. **NEXT:** the `integrity-audit.mjs` stale-assertion
> repair (12 known, listed in PRODUCTION_READINESS.md), the remaining per-screen redesign polish, then
> Phase G deployment (demo.mercenta.co.uk first; mercenta.co.uk only via GO_LIVE.md).
>
> **PHASE A+B (2026-09-13) — BUILD FORWARD.** Commit **`0f3e84b`** (previous checkpoint G1 `68449af`;
> E9 `7a40503`; protected baseline **`959b4d2` still an ancestor**, no reset/rebase/amend).
> **① PHASE A — ComplianceUploadCard re-verification → COMPLETE (two real defects found and fixed).**
> The card WAS mounted (`ComplianceHub.tsx:117` — the old "dead UI" note is historic) and its gate rule
> already came from the canonical `evaluateComplianceGate`/`getRequiredDocumentsForCategory`, but its
> Upload action only bumped a **dead** `docVersion` counter (declared, `void`-ed, never read) and never
> re-read the docs, so the row's own status badge kept its pre-upload value; `ComplianceApprovals`
> (admin) had the identical defect (`docsVersion`), and the canonical `reviewGateDocument` action had
> **zero call sites** so the Product Catalog gate and this card's gate could drift. Fix: both surfaces
> now invalidate `['compliance-documents']` (the pattern `ProductCatalog`/`BrandPurchaseOrders` use) and
> the brand card syncs the in-session gate with the returned canonical doc id. **No second workflow, no
> duplicate store, no migration (023 still newest).** New test `e2e/compliance-gate.spec.ts` t5 proves
> missing → under review with no reload AND that an upload is not an approval (gate still blocks, 5 items).
> **② PHASE B — Integration Hub breadth → BUILT (first increment).** Three canonical sources were
> registered but **never consumed** (`INTEGRATION_META.category`, `INTEGRATION_CATEGORY_LABELS`,
> `hasLiveCredentialHint`); the Hub is now a real control centre: mode-derived state tiles
> (all / live / simulation / available / configuring / needs-attention / disabled) that each filter the
> provider list, an actionable attention alert naming the providers actually in error/degraded/
> needs_attention/failing-health, canonical category grouping, search with a real visible/total count,
> an honest empty state, and a truthful "developer demo key present — not a verified connection" note.
> Every existing card behaviour (wizard, health check, simulation enable/disable, disconnect,
> mock/live separation, `h3` provider names) is unchanged.
> **Gates:** typecheck **0** · lint **0** · build **✓ 3.77s** · `compliance-gate` **5/5** ·
> `integration-hub` **5/5** (new) · `app-shell` + `rocketchat-removal` + `simulation-control` **45/45** ·
> **no migration**. Next: Phase C (remaining genuinely incomplete core requirements), then the UI/UX
> redesign, regression, production prep. Social stays PARKED, Rakazo stays LAST.
>
> **PHASE C (2026-09-13) — the last hard-skipped access-gate tests closed with REAL coverage.** Commit
> **`6844182`**. The suite's only remaining skips were `access-gate` t6/t8/t9. t6's skip reason was
> **stale**: `signOut()` only changes React state (no reload) and Phase E1/E2 already made approval a
> canonical hand-off (`beginOnboardingFromApplication` + `addApprovedBrand` publish the SAME tenant id
> `brand-app-<applicationId>` the login card uses), so t6 is now a genuine end-to-end test — public
> application form → operator approval → canonical onboarding record in the Onboarding pipeline
> (`Application` origin, derived tenant id) → the approved brand enters its portal wizard, with zero
> page errors. Two further defects found while doing it: **t7 ("Admin rejects brand") could not fail**
> (`button:has-text("Reject")` matched the *"Rejected" status filter chip*, so the click hit the chip and
> the assertion then passed on the chip's own label) and t6 had the same class of bug (`Approve` matched
> the *"Approved" chip*). Both now use exact accessible names and assert the real consequence. Skips
> **3 → 2**; the two that remain are honest and not buildable from the repo (t8's manual-creation path is
> already covered end-to-end by `onboarding-workflow` t3; t9 needs server-side route guards that do not
> exist in a static SPA).
>
> **PHASE D1 (2026-09-13) — UI/UX redesign, increment 1: the canonical STATUS LAYER.** Commit
> **`9f9c8ef`**. Executed against the design system's own migration guidance ("replace ad-hoc
> `bg-{c}-500/15` status badges with `StatusBadge`"). **`src/lib/statusPresentation.ts` (NEW)** is now the
> single source of truth for presenting a domain status (compliance-document lifecycle + partner-application
> decision lifecycle + canonical workflow order) as `{ label, semantic tone, data-status, actionable }`;
> visible labels are byte-identical to what the screens already rendered (consolidation, not a copy change).
> **Applications** lost its one-line colour ternary (semantic `StatusBadge`, `role="status"`,
> `data-status`, never colour-only) and its loose status chips became a **derived decision queue** — one
> tile per decision state, count read from the store, each tile the filter for the list below (a metric with
> no drill-down is incomplete). **Compliance Approvals** gained semantic row statuses + an honest empty
> state. **The brand compliance card** uses the same canonical statuses, so brand and admin can no longer
> disagree about what a state looks like. New spec `e2e/status-semantics.spec.ts` **4/4** (queue counts
> derived; `data-status`/`role=status`; drill-down `aria-pressed`; canonical statuses on both surfaces;
> never-approved renders `approved = 0`; 375px no-horizontal-overflow on both redesigned surfaces).
> **STILL OPEN (recorded, not claimed):** the wider ad-hoc badge sweep (**292 occurrences across 74
> files**), raw-`<table>` → `DataTable` migration, and the per-screen redesign pass (dashboards, CRM,
> catalogue, PO, finance, logistics, marketing, carrier) — these are the remaining Phase D build items.
>
> · Previous: 2026-09-12 (**Phase E8 — OPERATIONAL MERCENTA SOCIAL (LIVE ENGINE + SSO BRIDGE)**; see the PHASE E8 block below. Previous: **Phase E7 — EMBEDDED MERCENTA SOCIAL (FULL POSTIZ APPLICATION)**; before that E6 — BRAND OPERATIONAL SURFACES, E5 — ADMIN OPERATIONAL SURFACES, E4 — COMMERCE, E3 — CATALOG, E2 — BRAND ONBOARDING, E1 — ONBOARDING HAND-OFF, D4 — PERSISTENCE.)
>
> **PHASE G1 (2026-09-13) — BRAND DEDUCTIONS LEDGER (Tour 5) + ROCKET.CHAT SERVER CLEANUP.**
> Commit **`beb4721`** (previous checkpoint E9 `7a40503`; protected baseline `959b4d2` still an ancestor).
> Two independent deliverables, executed build-forward.
> **① ROCKET.CHAT CLEANUP COMPLETE** on `mercenta-services` (46.101.75.185): ownership was
> verified before any deletion (only `root-rocketchat-1` / `root-rocketchat-db-1` touched any
> rocketchat/Mongo volume; `mongo:7` used by no other container; no crontab/env/systemd/Caddy
> reference; `chat.mercenta.co.uk` vhost already gone in D1). Removed: both containers (Exited),
> the dedicated `root_rocketchat_mongodb` volume, both anonymous volumes, **both images**, and the
> two compose services + volume entry in `/root/docker-compose.yml` (`docker compose config -q` →
> VALID; a 4-line removal note remains). Verification: **no** rocket/chat/mongo container, volume
> or image remains; all **10 active containers unaffected** (Postiz, Temporal, Elasticsearch,
> both Postgres, both Redis, usertour, social-sso); engine `/api/` **200**; `/auth` **403** block
> intact; `caddy validate` valid; disk 27 GB → **24 GB**; load 100 → **0.79**. Backup of the
> pre-change compose file + container/volume inspect JSON is kept on the server at
> `/root/rocketchat-removal-backup-20260913/`. Mercenta Social/Postiz was NOT touched, resized or
> resumed — it stays **DEFERRED**.
> **② PHASE G1 — the brand-facing DEDUCTIONS LEDGER now EXISTS** (`src/components/brand/
> DeductionsLedger.tsx`, NEW), closing the documented product gap behind **Tour 5** whose four
> declared anchors (`deductions-ledger`, `deductions-categories`, `deductions-dispute-btn`,
> `deductions-outcome-info`) previously existed in **no component at all** — t5 in
> `e2e/tours.spec.ts` had only ever skipped. It reuses the CANONICAL E4 domain read model
> (`listBrandCommerceExceptions`, tenant check inside the domain) and the CANONICAL
> `openCommerceDispute` with a brand-pinned `CommerceActor` (RBAC + tenant + audit in the domain,
> refusals shown verbatim), refreshes via the existing `useCanonicalStoreVersion` signal, reports
> the REAL recorded outcome (a brand cannot declare its own win — the outcome control stays on the
> existing operator ledger/brand console), marks `(sim)` from the canonical flag, has honest empty
> states, and adds **no new store, no second workflow, no new visual language and NO migration**
> (023 remains newest). Mounted additively (APPENDED after existing content, populated + empty
> returns) on **Analytics** and **Reports**. t5 is now a genuine functional + tenant-isolation
> test (DeskForge's ledger must not contain Zambezi's `PO-9000`/`PO-9001`, must contain `PO-9002`,
> and Dispute → evidence → Record dispute must move the row to `disputed`). Gates: typecheck **0**
> · lint **0** (whole repo) · build **✓ 3.43s** · tours spec **9/9** · full browser suite
> **209 passed / 0 failed / 3 skipped** (was 208/0/4 → +1 passing, −1 skip, **0 regressions**).
> Report: `docs/PRODUCT_CONSOLIDATION_PHASEG1_2026-09-13.md`.
>
> **PHASE E9 (2026-09-13) — REAL CHANNEL CONNECT + PUBLISHING AGAINST THE LIVE ENGINE.**
> Continuing E8 on the deployed engine, the **real** channel-connect and publishing
> contracts were determined from v1.47.0 and exercised for real: the provider
> catalogue (**34 providers**) was read live; a **genuine channel was connected**
> (`POST /api/integrations/social-connect/nostr` → **201**, engine row carrying the
> real derived Nostr public key, `organizationId` = brand A's org, `disabled:false`);
> **brand B sees 0 channels** (tenant isolation verified); a **real publication was
> accepted** by the developer API (`POST /api/public/v1/posts` → **201**, after
> decoding the true DTO shape); and **Temporal really executed the job** (worker trace
> on `taskQueue: 'nostr'`). That trace exposed a **genuine engine defect**, now fixed:
> `NostrProvider.post()/comment()` pass a hex **string** where nostr-tools needs a
> **Uint8Array** (`expected Uint8Array, got type=string`), so Nostr connections
> succeeded but every publication failed — both runtime bundles are patched and the
> fix is committed as the idempotent `scripts/social-sso/engine-patches.mjs`.
> **[BLOCKED — paid resize required]** the final `PUBLISHED` + provider release id,
> scheduled-post execution and everything after them: the droplet is a 2-vCPU/4 GB box
> at **load 56–65 with 33–85 MB free**, and Postiz's orchestrator **webpack-bundles a
> workflow per provider task queue (34 of them) at startup**, so it is OOM-**`Killed`**
> in a loop (PM2 restarts 11→13 within minutes). Mitigations already applied
> (reversible, no data destroyed): swap raised **2 GB → 4 GB**, the **legacy
> Rocket.Chat + Mongo containers stopped** (Phase D1 leftover; freed ~400 MB), a
> `NODE_OPTIONS=--max-old-space-size=768` heap cap on the engine, and the unrelated
> `usertour` service stopped. The engine stack needs the **8 GB droplet already
> documented in HANDOFF item 8** — a paid, irreversible infrastructure change, hence
> the stop point. Verification posts remain safely in `QUEUE` inside brand A's org;
> nothing was faked. Report: `docs/PRODUCT_CONSOLIDATION_PHASEE9_2026-09-13.md`.
>
> **PHASE E8 (2026-09-12) — THE REAL POSTIZ APPLICATION IS OPERATIONAL.** E7 left the engine BLOCKED; E8 FIXED the
> deployment and built the bridge. **[VERIFIED] Engine fixes on `mercenta-services`
> (46.101.75.185):** Temporal **restored** (backend previously died on
> `ECONNREFUSED ::1:7233` → nginx 502 for every `/api/*`); its **Elasticsearch
> visibility store restored** (second real failure: SQL visibility caps custom Text
> search attributes at 3, so the backend also refused to start); public URLs set to
> the real TLS origin; **real Let's Encrypt TLS** live on
> `https://46-101-75-185.sslip.io` after opening **80/443** in ufw (the branded
> `postiz.mercenta.co.uk` vhost is configured but has **no DNS record yet** — one user
> action); engine **media persisted** on a volume; **2 GB swap added** (droplet was at
> 73.7 % RAM with no swap); frame policy replaced with a CSP `frame-ancestors`
> allow-list. **[VERIFIED] Commercial/signup boundary:** the edge now answers **403**
> for `/auth*` and `/api/auth/*`, so there is **no public engine signup or login path**
> at all. **[VERIFIED] Automatic provisioning + seamless sign-in:** Mercenta mints a
> one-time HMAC handoff token server-side (`supabase/functions/social-session`) and the
> engine-side service (`scripts/social-sso/server.mjs`, `social-sso` in the canonical
> compose) derives the brand's **deterministic** engine identity, **logs in first**
> (idempotent), registers only on first use, signs in server-side and sets the engine
> session cookie first-party. Live proof: brand A → org `a8ae0104-…` (`reused:false`
> then **`reused:true` with the same org**), brand B → a **different** org
> `903b067c-…`, and the cookie authenticates `/api/user/organizations` returning **only
> that brand's own org**. **Mercenta client:** `MercentaSocial` now has a real **“Open
> Mercenta Social”** launch + inline frame once a handoff URL exists; the workspace
> records the **real** engine organization (`linkSocialWorkspaceToEngine`, idempotent);
> the engine name still never appears in brand copy. **[BLOCKED, honest]** inline
> embedded *session* inside a cross-site frame (browsers block third-party cookies) —
> the workspace opens in its own tab (verified); seamless inline embedding needs the
> branded same-site hostname (the DNS item). **[DEFERRED]** real channel OAuth
> (external credentials), production-authenticated token minting, droplet resize.
> **Gates:** validator **117/117 PASS** (96 E7 + 21 E8) · E7/E8 browser spec **10/10** ·
> full E2E **208 passed / 4 skipped / 0 failed** (+1, 0 regressions) · typecheck 0 ·
> lint 0 · build ✓ · validators **37 PASS / 15 FAIL** (identical to the pre-E7
> baseline apart from our own validator). **NO migration, no Mercenta table duplicating
> engine data, no public signup, no secret in the browser.** Report:
> `docs/PRODUCT_CONSOLIDATION_PHASEE8_2026-09-12.md`.
>
> **PHASE E7 (2026-09-12) — EMBEDDED MERCENTA SOCIAL (FULL POSTIZ APPLICATION).**
> Makes the COMPLETE Postiz application available to every approved Mercenta brand
> as **MERCENTA SOCIAL** — the customer-facing product identity (Postiz is the
> engine, AGPL-3.0, and is NOT rebuilt inside Mercenta). **The already-deployed
> engine was investigated, not assumed:** droplet `mercenta-services`
> (46.101.75.185), container `root-postiz-1`
> (`ghcr.io/gitroomhq/postiz-app:latest`, image built 2026-09-05), engine version
> **v1.47.0**, database `postiz-db-local`, **instance unused (0 users / 0 orgs /
> 0 integrations / 0 posts / 0 media)**, tenancy `Organization ← UserOrganization →
> User` with `organizationId` on every post/integration/media row, **35 verified
> provider adapters**, post states `QUEUE · PUBLISHED · ERROR · DRAFT`.
> **BLOCKING deployment defect found and reported (not faked around):** the NestJS
> backend exits on `connect ECONNREFUSED ::1:7233` (Temporal missing) so nginx
> answers **502** for `/api/*`; `DISABLE_REGISTRATION=false` (self-signup OPEN);
> `MAIN_URL`/`FRONTEND_URL` = `http://localhost:5000`; storage container-local;
> droplet RAM 73.7 %. **E7 shipped:** the Mercenta Social identity as a single
> source of truth (`src/config/mercentaSocial.ts` — 8 brand modules, 35 providers,
> blocked commercial paths, verified engine facts, 6 deployment findings);
> **deterministic + idempotent automatic provisioning**
> (`socialWorkspaceIdForTenant` = `msoc-<fnv1a32(tenant)>`, no Date.now/random);
> a **fail-closed entitlement gate** over every canonical brand status (approved/
> active allowed; pending/in_review/rejected/suspended/deactivated/terminated/
> unknown denied); **tenant isolation refused in the DOMAIN**
> (`readWorkspaceForTenant` → `CROSS_TENANT`); the brand surface
> `MercentaSocial` (workspace, module surface with drill-down, channels listed as
> available-not-connected, entitlement statement, **no sign-up / no billing / no
> engine name**); `BrandSocialConnect` reduced to a compatibility adapter
> (its fabricated in-browser connection Map and **false `Live` badge are gone**);
> the admin `PostizAdminPanel` extended into the integration control centre
> (engine identity, provisioning, commercial boundary, findings — no secrets);
> the brand nav label sourced from the SSOT. **NO migration (023 still newest of
> 23), no new store duplicating an engine entity, no second social platform, no
> deployment, no network calls.** Gates: new validator **96/96 PASS**; new E2E
> spec **9/9**; full E2E **207 passed / 4 skipped / 0 failed** (was 198/0/4 → +9,
> **0 regressions**); typecheck 0 · lint 0 · build PASS; validators
> **37 PASS / 15 FAIL** vs the pre-E7 worktree at `c5b92ba` **36 PASS / 15 FAIL**
> — the only difference is the new E7 validator (**0 regressions**; two legacy
> guards were extended in an intent-preserving way and disclosed). Report:
> `docs/PRODUCT_CONSOLIDATION_PHASEE7_2026-09-12.md`. **HONEST: the engine link is
> NOT established (`engineLinked:false`, simulated) because the engine API is
> down; connecting a channel and publishing remain blocked by the deployment;
> workspace records are in-memory (`durable:false`).** NEXT: Final UI/UX redesign.
>
> **PHASE E6 (2026-09-12) — BRAND OPERATIONAL SURFACES.** Completes the BRAND-side
> operational experience by closing four PARITY/CANONICALITY gaps — NOT a redesign,
> NOT a new brand application. **No new store, dashboard, CRM, catalog/PO/ticketing/
> billing system, no new lifecycle function, no new navigation, and NO migration** —
> every change extends an EXISTING file. **E6-G1** the brand PO list now marks
> simulated POs `(sim)` from the canonical `po.simulated` flag (E5-G2 parity), as a
> Badge only so no control/DOM order changes and `CommerceSimulationPanel` stays
> last. **E6-G2** the brand dashboard gained two APPENDED canonical attention groups
> — issued-unpaid simulated invoices (`commerce-inv-*`) and simulated
> delivered-awaiting-invoice POs (`commerce-po-inv-*`) — plus canonical `(sim)`
> provenance on simulated deduction rows; existing row order, the pinned first
> `unacked-*` row, all six KPI ids and `po-summary-*` are UNCHANGED. **E6-G3** the
> brand catalog's duplicate local last-wins submission map was replaced by the
> canonical `demoStore.latestSubmissionForProduct` (E5-G9 parity) — a canonicality +
> robustness fix (the seam is idempotent per tenant+sku, so the demo keeps one row
> per SKU). **E6-G4** simulated deduction NOTIFICATIONS now carry `(sim)` from the
> canonical `Deduction.simulated` flag. Gates: new validator **41/41 PASS** + new E2E
> spec **5/5**; full E2E **198/0/4** (was 193/0/4 → +5, **0 regressions**); typecheck
> 0 · lint 0 · build PASS; the **same 15 pre-existing** validator failures and all
> **50 legacy validators byte-identical** before/after E6 (proven in a clean
> `git worktree` at the pre-E6 commit `d517b17`, tag `mercenta-pre-e6-20260912`).
> Report: `docs/PRODUCT_CONSOLIDATION_PHASEE6_2026-09-12.md`. **HONEST: simulation
> only; memory adapter active (`durable:false`); NO migration added or executed (023
> remains newest); BI untouched. NEXT: E7 — Embedded Postiz (NOT started).**
>
> **PHASE E5 (2026-09-12) — ADMIN OPERATIONAL SURFACES.** Turns the canonical
> E1–E4 domain state into coherent ADMIN-facing operational surfaces. It is
> operational completion, NOT a UI redesign and NOT a new admin application:
> **no new store, dashboard, CRM, PO system, catalogue, ticketing system or
> billing system, and NO migration** — every gap was closed by extending an
> EXISTING surface. **G1** `CommerceOperationsPanel` is now OPERABLE: it drives
> acknowledge → fulfil → receive → issue invoice → record payment (+ open case)
> through the EXISTING `commerceLifecycle` behind the EXISTING `CommerceActor`
> (RBAC + tenant enforced IN THE DOMAIN; refusals shown verbatim). **G2** truthful
> `(sim)` provenance on `AdminPurchaseOrderList`, `RetailPipeline`,
> `LogisticsControl` and the commerce panel, derived from the canonical flags.
> **G3** the admin "Create PO on behalf of brand" action (which sends a REAL
> email) now honours the staff permission tier — the email implementation is
> UNTOUCHED. **G4** the catalog availability/price mutations now honour the same
> tier. **G5 REAL DEFECT FIXED:** the "POs in fulfilment" KPI + "Fulfilment in
> motion" rows drilled to Fulfillment Track (brand SCORING, not shipments) — they
> now route to Logistics Control; two ADDITIVE canonical-derived attention groups
> (rejected submissions, issued-unpaid simulated invoices) were added without
> touching existing row ids or the pinned KPI contract. **G6 REAL DEFECT FIXED:**
> Logistics Control's PO column rendered `—` for every row (`pos.find(p => p.id
> === s.id)` compared a shipment id against PO ids) — it now renders the canonical
> `DemoShipment.poNumber`. **G7** `NotificationCenter` gained ONE canonical
> `commerce` kind derived from the E4 stores (no second notification store, no
> double-counting). **G8** `openCommerceCase` (E4, previously unreachable) is now
> surfaced and opens on the EXISTING helpdesk model. **G9** the duplicated
> latest-submission derivation now uses the canonical
> `demoStore.latestSubmissionForProduct` in BOTH surfaces (Retail Pipeline also
> marks `superseded` rows). Gates: new validator **48/48 PASS** + new E2E spec
> **4/4**; full E2E **193/0/4** (was 189/0/4 → +4, **0 regressions**); typecheck 0
> · lint 0 · build PASS; all **49 legacy validators byte-identical** before/after
> E5 (the same **15** pre-existing failures, proven in a clean `git worktree` at
> the pre-E5 commit `981332f`, tag `mercenta-pre-e5-20260912`). Report:
> `docs/PRODUCT_CONSOLIDATION_PHASEE5_2026-09-12.md`. **HONEST: still no live
> integration; memory adapter active (`durable:false`); NO migration added or
> executed (023 remains newest); BI untouched. NEXT: E6 — Brand Operational
> Surfaces (NOT started).**
>
> **PHASE E4 (2026-09-12) — COMMERCE / AMAZON-STYLE OPERATIONAL SIMULATION.**
> The operational commerce lifecycle is now genuinely functional in SIMULATION
> mode, end to end, with ZERO live credentials and ZERO external network calls:
> `E3-ready product → OPERATIONAL ELIGIBILITY (derived from E3) → SIMULATED
> PURCHASE ORDER → PO ACKNOWLEDGEMENT → FULFILMENT/SHIPMENT (existing ASN seam)
> → RECEIVING (existing delivery reconciliation) → SIMULATED INVOICE →
> SIMULATED PAYMENT → EXCEPTIONS/CHARGEBACKS (existing Deduction ledger) →
> DISPUTE/RESOLUTION → resulting operational state`. NEW
> `src/lib/commerce/commerceLifecycle.ts` (tenant-pinned `CommerceActor`, RBAC +
> tenant isolation IN THE DOMAIN, eligibility, PO/ack/fulfil/shipment/receive/
> invoice/payment/exception/dispute/case, tenant-scoped reads, persistence mirror,
> audit on the ONE existing platform log). NEW canonical types
> (`CommerceActivity`, `CommerceEligibility`, `CommerceInvoice`, `CommercePayment`,
> `CommerceMode`, `CommerceActivityType`) plus OPTIONAL simulation provenance on
> the EXISTING `PurchaseOrder`/`Deduction` — ONE declaration each, no duplicate
> concepts. NEW `createSimulatedPurchaseOrder` in `src/data/api.ts`: a SEPARATE,
> **email-free and provider-free** creation path, so `createPurchaseOrder`'s real
> Postmark behaviour is untouched. NEW D4 port methods +
> `supabase/migrations/023_create_commerce_persistence.sql` (additive, RLS,
> brand-isolation policies, 4 tables, **NOT executed**). NEW UI:
> `CommerceSimulationPanel` (brand console) + `CommerceOperationsPanel` (admin
> overview), both rendered AFTER pre-existing content so no existing browser
> assertion's control order changed. SIMULATION IS TRUTHFUL: every record is
> `mode:'simulation'`, `simulated:true`, and says "No live provider contacted /
> No email sent / No accounting provider contacted / No payment provider
> contacted". Idempotent by deterministic ids (`po-sim-*`, `cinv-*`, `cpay-*`,
> `com-*`). Gates: new validator **108/108 PASS** + new E2E spec **4/4**; full E2E
> **189/0/4** (was 185/0/4 → +4, **0 regressions**); typecheck 0 · lint 0 · build
> PASS; all 48 legacy validators **byte-identical** before/after E4 (only the new
> E4 validator is added) — the **15** failing legacy validators (E3 recorded 13)
> are PRE-EXISTING, proven via a clean `git worktree` at the pre-E4 commit
> `657b6b2`. Report: `docs/PRODUCT_CONSOLIDATION_PHASEE4_2026-09-12.md`.
> **HONEST: browser Supabase credentials are still NOT configured → memory
> adapter, nothing durable, migration 023 (and 020/021/022) unexecuted; no live
> Amazon/DHL/Xero/payment call is made or claimed.** Pre-E4 checkpoint commit
> `657b6b2` (generated/forensic artefacts preserved verbatim). **NEXT: E5 — Admin
> Operational Surfaces (NOT started).**
>
> **PHASE E3 (2026-09-12) — CATALOG / PRODUCT MANAGEMENT.** The product/catalog
> capability is now a COMPLETE, demonstrable lifecycle, built by EXTENDING the
> existing architecture (no second product store, no second brand identity, no
> second database, no UI redesign, no live integration). Lifecycle:
> product information → COMPLETENESS → compliance gate → READY → SUBMIT
> (existing `api.submitCatalogItem` seam) → SIMULATED PROCESSING → SIMULATED
> RESULT → resulting product state. NEW canonical types
> (`ProductSubmission`, `ProductCompleteness`, `CatalogReadiness`,
> `CatalogSubmissionStatus`) with **one declaration each**: `DemoProduct` now
> `extends Product` (its 20 duplicated fields removed) and `SeedSubmission` is an
> alias of `ProductSubmission`. NEW `src/lib/catalog/productCompleteness.ts`
> (the ONE prerequisite list — the exact 7 fields the seam always validated) and
> `src/lib/catalog/catalogLifecycle.ts` (tenant-pinned `CatalogActor`, RBAC,
> readiness, submit, poll, persistence mirror, audit). The submission seam now
> RECORDS the resulting submission in the canonical store (`mode`, `simulated`,
> tracking id) and resolves the compliance gate in ONE place
> (`evaluateBrandCatalogGate`). `demoStore` owns a MUTABLE submission store
> (previously six read-only seed rows nothing could write to). D4 port extended
> with `persistCatalogSubmission` + migration **022** (additive, RLS,
> brand-isolation policy, NOT executed). UI: brand readiness banner with exactly
> which fields are missing, per-product Submit / Check result, derived Submission
> column, honest `(sim)` labels; admin Submission column + inline readiness
> detail. REAL DEFECTS FIXED: `submitCatalogItem` "persisted" to a
> `catalog_submissions` table no migration creates (unrunnable write, and the
> tracking id was thrown away); brand-added products existed only in React state
> (never reached the admin catalogue or the SKU-keyed seam); the add-product form
> silently wrote `0` for blank dimensions so an empty product looked COMPLETE;
> three duplicated shape declarations; duplicated gate-input resolution.
> Gates: new validator **65/65 PASS** + new E2E spec **4/4**; full E2E
> **185/0/4** (was 181/0/4 → +4, **0 new failures**); typecheck 0 · lint 0 ·
> build PASS; all 47 pre-existing validators produce BYTE-IDENTICAL results
> before/after E3 (the only diff is the new E3 validator) — the 13 legacy
> failures are PRE-EXISTING, proven via a clean `git worktree` at `b1f1ee4`.
> Report: `docs/PRODUCT_CONSOLIDATION_PHASEE3_2026-09-12.md`. **Committed
> `f86d8c7`** (19 files). **HONEST: browser Supabase credentials are still NOT configured →
> memory adapter, nothing durable, migration 022 (and 020/021) unexecuted; the
> legacy `products` table's `uuid` PK is incompatible with the canonical text ids,
> so the submission record carries the E3 lifecycle state instead of a product
> row; seeded fixture submissions return an honest `unknown submissionId (mock)`
> when polled.**
>

> **PHASE E2 (2026-09-11) — BRAND ONBOARDING WORKFLOW.** The E1 record is now the
> REAL stateful workflow, with three real entry points into ONE canonical record
> (`acquisition_opportunity` · `partner_application` · `manual_creation`):
> `beginOnboardingFromApplication` (approving a partner application) and
> `beginOnboardingForManualBrand` (operator-created brand) join the E1 opportunity
> hand-off, all idempotent with DETERMINISTIC tenant ids. NEW **brand acceptance**
> (`acceptOnboarding`, status `initiated → accepted`, attributable to
> `brand:<tenantId>` vs a staff id, audited) — driven by the brand's own EXISTING
> wizard submission. **Tenant isolation enforced IN THE DOMAIN**: `OnboardingActor`
> carries an optional tenant pin; a brand session is refused `CROSS_TENANT` on any
> other tenant's record and can never initiate its own onboarding. NEW Admin
> **Onboarding Pipeline** (`OnboardingPipeline.tsx`, nav "Onboarding" under Brands,
> `admin_staff` allowlist) that lists records with their real origin, derives EVERY
> count from live state (0 when empty) and OPERATES them inline (acceptance →
> ordered steps → operational). REAL DEFECTS FIXED: application-approved brands
> could not enter the portal at all (`activateDemoBrand` refuses non-demo tenants →
> the login card was a dead end); the manual-brand path used a `Date.now()`+random
> tenant id; approval created an identity no onboarding process could see. NEW
> `activateOnboardingBrand` (honest minimal profile — no fabricated
> products/POs/tax ids; region derived from the prospect's own declared countries
> via the existing ICP mapping) + `Login.tsx` derives canonical tenant cards from
> the store. Gates: new validator **45/45 PASS** + new E2E spec **3/3**; full E2E
> **181/0/4** (was 178/0/4 → +3, 0 new failures); typecheck 0 · lint 0 · build PASS.
> Report: `docs/PRODUCT_CONSOLIDATION_PHASEE2_2026-09-11.md`. **Committed `08a575c`**
> (18 files, +1760/−81). **HONEST: browser Supabase credentials are still NOT configured → memory adapter, nothing durable,
> migrations 020 + 021 unexecuted; and the brand-portal `onboarded` flag remains a
> separate representation of the canonical status (documented seam, deliberately not
> force-merged to avoid regressing the tested wizard flow).**
>

> **PHASE E1 (2026-09-11) — OPPORTUNITY → BRAND ONBOARDING HAND-OFF.** Closes the
> documented D4 follow-up (`Opportunity.brandId` was never wired to onboarding).
> NEW canonical entity `BrandOnboarding`, keyed by the SAME canonical prospect id
> (`onb-<prospectId>`) with a DERIVED tenant id (`brand-<normalizeBrandKey>`,
> diacritics folded; a collision is refused, never merged) — **no second brand
> identity, no second store, no second database.** NEW domain lib
> `src/lib/onboarding/onboardingLifecycle.ts`: `beginBrandOnboarding` (qualified/won
> only, idempotent, sets `Opportunity.brandId`, audits), `completeOnboardingStep`
> (strictly ordered, attributed), `finishBrandOnboarding` (refused while any step is
> outstanding; completion is a distinct explicit act). RBAC is enforced IN THE
> DOMAIN (a view-only actor is refused and changes nothing). The EXISTING
> persistence port gained ONE artefact (`DOMAIN_TABLES.brandOnboarding` +
> `persistBrandOnboarding` on both adapters, brand-scope read parity with
> opportunities) and the EXISTING canonical acquisition store gained the onboarding
> working set. NEW migration `021_create_brand_onboarding.sql` (1 table, RLS,
> admin + brand-isolation policies). Minimal additive UI in the existing
> Acquisition Opportunity panel + the pre-onboarding CRM relationship row (no
> redesign, existing primitives/palette only). Gates: new validator **46/46 PASS**
> + new E2E spec **3/3**; full E2E **178/0/4** (was 175/0/4 → +3, 0 new failures);
> typecheck 0 · lint 0 · build PASS. Report:
> `docs/PRODUCT_CONSOLIDATION_PHASEE1_2026-09-11.md`. **Committed `0568e2a`**
> (15 files, +1589/−28). **HONEST: browser Supabase
> credentials are still NOT configured → the memory adapter is active, nothing is
> durable, and migration 021 is unexecuted (like 020). The application-approval
> entry point into the same canonical record is NOT done — it is E2.**
>

> **PHASE D4 (2026-09-11) — PERSISTENCE / DOMAIN HARDENING.** The Phase C
> acquisition artefacts (outreach revisions, responses, opportunities, events)
> and the BI lifecycle history (prospect updates, runs, change events, snapshots)
> now mirror through a single **domain persistence port** — one port, two
> adapters, one factory, consistent with the existing `src/data/api.ts`
> Supabase-repository pattern. **No second database, no SQLite/IndexedDB/
> localStorage, no new ORM.** The **memory adapter** is the honest demo/
> simulation default (`durable:false`, ZERO network); the **Supabase adapter**
> upserts on the artefact's CANONICAL id (idempotent), scopes reads by tenant
> (a brand scope can never see another tenant's prospect-derived data) and
> returns **explicit failures** (never a silent success). `sendOutreach()` /
> `recordResponse()` await the persistence outcome before returning. New
> migration `supabase/migrations/020_create_acquisition_persistence.sql`
> (8 tables, RLS on every table, admin policies + a brand-isolation policy on
> opportunities). REAL DEFECTS FIXED: non-deterministic response ids
> (`Date.now()`+random) + non-idempotent `addResponse`/`addOpportunity`.
> New validator **64/64 PASS** + new E2E spec **3/3**; full E2E **175/0/4**;
> typecheck 0 · lint 0 · build PASS. Report:
> `docs/PRODUCT_CONSOLIDATION_PHASED4_2026-09-11.md`. **Committed `eb1e5e8`**
> (14 files, +1993/−21).
>
> **PHASE D3 (2026-09-11) — OUTREACH / PROVIDER HARDENING.** Transport mode is now
> DERIVED from the canonical integration mode model (`resolveOutreachTransport` —
> never caller booleans) and `sendOutreach()` **fails closed**: a transport claiming
> `live` without verified credentials is refused (`PROVIDER_NOT_LIVE`) and audited.
> `UNKNOWN ≠ LIVE` enforced (disconnected/available/configuring → simulation;
> degraded/error/disabled → unavailable simulation). Simulation proven zero-network;
> missing credentials never break simulation; human approval needs no Rakazo/Postiz.
> REAL DEFECT FIXED: `Date.now()`-based outreach record ids collided within a
> millisecond and the store's upsert silently destroyed a revision — ids are now
> workflow-owned (`outreach-<prospectId>-r<n>`). New validator **44/44 PASS** +
> new E2E spec **3/3**; full E2E **172/0/4**; typecheck 0 · lint 0 · build PASS.
> Report: `docs/PRODUCT_CONSOLIDATION_PHASED3_2026-09-11.md`.
>
> **PHASE D2 (2026-09-11) — BI INTELLIGENCE PRESERVATION.** New canonical
> accessor `src/lib/intelligence/prospectIntelligence.ts` (11 sections, digest,
> provenance, lifecycle; read **by reference**, never copied). `AcquisitionProspectRow`
> now carries `intelligence`; outreach revisions store `intelligenceRef`
> (ids + counts + score snapshot). Minimal additive intelligence surface in
> `AcquisitionWorkflow.tsx`. Real defect fixed: the placeholder outreach slug now
> folds diacritics via the canonical `normalizeBrandKey` (`Tapatío` →
> `hello@tapatio.example`, was the mangled `tapato`). New validator **42/42 PASS**
> + new E2E spec **4/4**; full E2E **169/0/4**; typecheck 0 · lint 0 · build PASS.
> Report: `docs/PRODUCT_CONSOLIDATION_PHASED2_2026-09-11.md`.
>
> **PHASE D1 (2026-09-11) — ROCKET.CHAT REMOVED.** Removed end-to-end: admin
> panel + mock client/SSO factory (3 files deleted), nav entry + breadcrumb +
> render route, `IntegrationId` member, registry card/order/meta (19 → 18
> providers), simulation CASE provider requirement, docker-compose service +
> Mongo volume, Caddy vhost, deploy-script references. New regression gate:
> `scripts/validate-rocketchat-removal.mjs` (15/15 PASS) +
> `e2e/rocketchat-removal.spec.ts` (5/5). Full E2E **165/0/4**; typecheck 0 ·
> lint 0 · build PASS. Report: `docs/PRODUCT_CONSOLIDATION_PHASED1_2026-09-11.md`.
>
> **Memory files (portable, AI-vendor-neutral):** `MERCENTA_MASTER_CONTEXT.md`
> (project constitution §A–AF) · `MERCENTA_ARCHITECTURE.md` (technical
> reference) · this file (operational handoff). Phase reports:
> `docs/PRODUCT_CONSOLIDATION_PHASEA_2026-09-10.md` ·
> `docs/PRODUCT_CONSOLIDATION_PHASEB_2026-09-10.md`.
>
> ## 0. Project-Memory Reconciliation (2026-09-08)
> - **Canonical project-state file: THIS FILE (`PROJECT_STATUS.md`).** HANDOFF.md and STATUS_CHECK.md remain separate for their distinct purposes (owner handoff / session history) — do not treat them as competing status sources.
> - **Verified latest checkpoint: `9f935f4` (Phase B gate); Phase C completed on top — see the Phase C section below.** Prior: `dbbf567` (Phase A gate) → `fe8c474` (Phase 1 gate) → `c3f676f` (Phase 0) → `9915656`. `5f13ac1` (Phase 7F part 1 — compliance test states) → `9ef93eb` (7E docs) → `ad97e9d` (7E brand dashboard) → `041de1a` (7E deferred/product repairs) → `e7fa882` (Phase 6 — application shell & navigation) → `774f6c4` (Phase 5) → `50b0420` (Phase 4) → `9d8d18d` (Phase 3) → `4eeef45` (Phase 2C engine) → `ba99266` (2B) → `a796f37` (2A). Baseline `959b4d2`.
> - **Baseline:** tag `mercenta-baseline-before-redesign-20260907` / commit `959b4d2` — recoverable, immutable.
> - **Branch:** `redesign/foundation` (working tree: clean except pre-existing untracked forensic/generated artifacts).
> - **Specialized docs (separate, canonical for their domain):** `docs/MERCENTA_BASELINE.md`, `docs/MERCENTA_PRODUCT_CONTRACT.md`, `docs/INTEGRATIONS.md`, `docs/FUNCTIONAL_RISK_MAP.md`. (`docs/ARCHITECTURE.md` retained as history; superseded by `MERCENTA_ARCHITECTURE.md`.)
> - Older sections below are historical/legacy, preserved verbatim; their old phase-number pointers (e.g. "Phase 3/4 targets", "Phase 2 — Rakazo") are superseded by the MASTER ROADMAP A–M (Rakazo = Phase M, LAST) — see MERCENTA_MASTER_CONTEXT.md §AB.
## Phase D1 — Rocket.Chat removal (2026-09-11)

> Status: **DONE (verified this session)**. Commit **`bf31151`**
> (`phaseD1: remove Rocket.Chat end-to-end`). Full report:
> `docs/PRODUCT_CONSOLIDATION_PHASED1_2026-09-11.md`.
> Pre-D1 HEAD: `b7cd0d4`. Protected baseline untouched: `959b4d2`.

**BUILT (D1)**
- **Deleted (3 files):** `src/components/admin/RocketChatAdminPanel.tsx`,
  `src/lib/rocketchat/rocketChatClient.ts` (`IRocketChatClient` +
  `MockRocketChatClient` + `getRocketChatClient()` — the factory *always*
  returned the mock; no RealClient ever existed), `src/lib/rocketchat/rocketChatSSO.ts`.
  `src/lib/rocketchat/` directory gone.
- **Source edits (6):** `AdminShell.tsx` (import, nav item, breadcrumb, render
  route); `integrations/types.ts` (`IntegrationId` member +
  `INITIAL_INTEGRATIONS` state); `integrations/registry.ts` (card +
  `INTEGRATION_ORDER` + `INTEGRATION_META` → 18 providers);
  `simulation/scenarioEngine.ts` (CASE gate `['rocketchat']` → `[]` — CASE drives
  the internal helpdesk ticket store, no external provider);
  `admin/integrations/SimulationControl.tsx` (`SCENARIO_META.CASE.requiredProviders`
  → `[]`); `eslint.config.js` (stale file reference).
- **Config/infra edits (4):** `docker-compose.services.yml` (rocketchat +
  rocketchat-db + mongo volume deleted), `scripts/Caddyfile`
  (`chat.mercenta.co.uk` vhost deleted), `scripts/deploy-docker.sh`,
  `scripts/vps-bootstrap.sh`.
- **Test/validator edits + additions:** `e2e/app-shell.spec.ts` (nav assertion),
  `scripts/forensic-screenshots.mjs`; **NEW** `scripts/validate-rocketchat-removal.mjs`
  (15 assertions) and **NEW** `e2e/rocketchat-removal.spec.ts` (5 tests).
- **Registry/audit artefact:** `requirements-registry.json`
  (`batchC-rocketchat-integration` → `regressed` with the removal recorded;
  `batchF-honest-status-messages` evidence de-referenced the deleted panel).
- **Docs:** `MERCENTA_MASTER_CONTEXT.md` (§F/§S/§AB/§AC/§AD),
  `MERCENTA_ARCHITECTURE.md` (§3/§5/§13), `docs/INTEGRATIONS.md`, this file,
  `STATUS_CHECK.md`, `HANDOFF.md`, new D1 phase report.

**TESTED (D1) — real output**
- `npm run typecheck` → **PASS** (0 errors; identical to pre-D1 baseline)
- `npm run lint` → **PASS** (0 problems)
- `npm run build` → **PASS**, `✓ built in 3.24s` (AdminShell chunk 472.45 → 467.10 kB)
- `node scripts/validate-rocketchat-removal.mjs` → **ROCKETCHAT_REMOVAL_VALIDATION_PASS (15/15)**
  (an earlier run legitimately FAILED on its own allowlist gap before the fix)
- `npx playwright test e2e/rocketchat-removal.spec.ts` → **5 passed (7.3s)**
- `npx playwright test` (6 relevant specs) → **63 passed (55.8s)**
- `npx playwright test` (full) → **165 passed / 4 skipped / 0 failed, EXIT=0**
  (pre-D1 baseline 160/4/0 → +5 tests, **0 new failures, 0 new skips**)
- `validate-mock-providers` · `validate-mock-seam` · `validate-provider-workflows`
  · `validate-demo-completeness` (27/27) · `validate-design-tokens` ·
  `validate-bi-lifecycle` · `validate-prospect-pipeline` ·
  `validate-acquisition-pipeline` → **ALL PASS**
- `node scripts/verify-registry.mjs` → 104 pre-existing issues (105 before the
  registry correction); `grep -i rocket` → 1 intentional "REMOVED" description

**RESULT:** DONE. Rocket.Chat absent from every executable product path; core
communications (CRM / Messages / Helpdesk) verified working; BI/ICP/acquisition
untouched; the provider safety gate is provably NOT weakened (NORMAL_PO still
fails closed when its providers are not positively `simulation`).

**KNOWN GAPS / NOT DONE:** the self-hosted services VPS was **not** touched — any
Rocket.Chat container on the droplet and the `chat.mercenta.co.uk` DNS/Caddy
record must be removed server-side (deploy-time, outside this repo). No manual
browser click-through (Playwright only). No deploy, no push.

**NEXT:** **D2 — BI intelligence preservation through acquisition** (see §21 of
the Phase D mandate). D2 does not start until this gate is accepted.

## Phase D4 — persistence / domain hardening (2026-09-11)

> Status: **DONE (verified this session)**. Commit **`eb1e5e8`**
> (`phaseD4: add domain persistence port + acquisition/BI write-through …`),
> parent `b0d4c0b`. Full report:
> `docs/PRODUCT_CONSOLIDATION_PHASED4_2026-09-11.md`.
> Protected baseline untouched: `959b4d2`.

**BUILT (D4)**
- **NEW `src/data/domainRepository.ts` (~530 lines)** — the domain persistence
  port. `DomainRepository` (persist×8 + `hydrate(scope)` + `flush()`);
  `MemoryDomainRepository` (deterministic, ZERO network, `durable:false` — the
  honest demo default); `SupabaseDomainRepository` (the EXISTING
  `@supabase/supabase-js` client, idempotent `upsert` on the canonical id,
  tenant-scoped `select`, explicit failures); `createDomainRepository()` +
  injectable singleton; `MERCENTA_OPS_TENANT`/`TenantScope`/`DOMAIN_TABLES`;
  `createPersistenceMirror()` (shared status: `memory-only`/`pending`/`durable`/
  `failed`).
- **`src/data/acquisitionStore.ts` (+105)** — write-through on every mutator;
  `getPersistenceStatus()`, `flushAcquisitionPersistence()`,
  `hydrateAcquisitionFromPersistence(scope)`; `addResponse`/`addOpportunity`
  now upsert by canonical id (idempotent).
- **`src/data/prospectStore.ts` (+85)** — BI lifecycle write-through
  (prospect updates, runs, change events, snapshots) +
  `getProspectPersistenceStatus()` / `flushProspectPersistence()` /
  `hydrateProspectStoreFromPersistence(scope)` (seeds = deterministic baseline,
  durable state = overlay).
- **`src/lib/acquisition/outreachLifecycle.ts` (+20)** —
  `responseIdFor(prospectId, outreachId)` (deterministic); `recordResponse()`
  idempotent; `sendOutreach()`/`recordResponse()` await the persistence outcome.
- **NEW `supabase/migrations/020_create_acquisition_persistence.sql`** — 8 tables
  (`acquisition_outreach/responses/opportunities/events`,
  `bi_prospects/intelligence_runs/prospect_changes/snapshots`), RLS on every
  table, admin policies + a **brand-isolation** policy on opportunities, no
  `using(true)`.
- **`src/components/admin/AcquisitionRelationships.tsx` (+22)** — the only UI
  change: an honest persistence-status line (`data-section="persistence-status"`).
- **NEW `scripts/validate-d4-persistence.mjs`** (64 assertions) +
  **NEW `e2e/domain-persistence.spec.ts`** (3 tests).

**TESTED (D4) — real output**
- `npm run typecheck` → **0 errors** · `npm run lint` → **0 problems**
- `npm run build` → **PASS**, `✓ built in 3.89s`
- `node scripts/validate-d4-persistence.mjs` →
  **D4_PERSISTENCE_VALIDATION_PASS (64 ✓ / 0 ✗, exit 0)**
- `npx playwright test e2e/domain-persistence.spec.ts` → **3 passed (14.9s)**
- existing validators (acquisition-pipeline · bi-intelligence-preservation ·
  bi-lifecycle · outreach-provider-hardening · prospect-pipeline ·
  mock-providers · mock-seam · provider-workflows · demo-completeness 27/27 ·
  rocketchat-removal · postiz · design-tokens · whatsapp) → **ALL PASS**
- `npx playwright test --workers=4` (full) → **175 passed / 4 skipped / 0 failed,
  EXIT=0** (D3 172/4/0 → **+3 tests, 0 new failures**). One 8-worker run produced
  a load-induced screenshot flake in `app-shell.spec.ts` (overflow assertion had
  already passed); it passes **23/23 in isolation**.

**RESULT:** DONE. Production-relevant acquisition + BI lifecycle state now has a
durable seam in the EXISTING Supabase architecture; writes are idempotent by
canonical id; reads are tenant-scoped (brand scope cannot see ops/other-tenant
data); failures are explicit and never reported as persisted; simulation is
unchanged and proven zero-network; RBAC and canonical identity/traceability hold.
**Honest limitation:** Supabase browser credentials are absent here, so the
durable path is proven via an injected conformance repository and the migration is
unexecuted — this is stated, not hidden.

**NEXT:** per the canonical roadmap — remaining core-platform gap closure →
onboarding/catalog/commerce completion → executive/admin operational surfaces →
**Postiz embedded platform verification** → **UI/UX redesign** (dedicated phase)
→ final full-platform regression → production deployment prep → **Rakazo LAST**.
Confirm the exact order from this file at the time.

## Phase D3 — outreach / provider hardening (2026-09-11)

> Status: **DONE (verified this session)**. Commit **`d3cbbd4`**
> (`phaseD3: harden the outreach transport / provider seam`). Full report:
> `docs/PRODUCT_CONSOLIDATION_PHASED3_2026-09-11.md`.
> Pre-D3 HEAD: `8bbb694`. Protected baseline untouched: `959b4d2`.

**BUILT (D3)**
- **`src/lib/acquisition/outreachSender.ts` (+141)** — `OutreachTransport` now
  declares `providerState` (`live | sandbox | not_configured | unavailable`) and an
  optional `isVerifiedLive()`; `isVerifiedLiveTransport()` is the fail-closed
  predicate; **`resolveOutreachTransport(emailState, client)`** derives the mode
  from `modeForState` + the registry default and returns
  `{ transport, providerState, resolvedMode, live }`; `describeOutreachProvider()`.
  The existing `createEmailClient` is reused — no second provider abstraction.
- **`src/lib/acquisition/outreachLifecycle.ts` (+49)** — `sendOutreach()` refuses a
  `live` claim it cannot verify (`PROVIDER_NOT_LIVE`, audited as
  `acquisition_outreach_send_refused`, revision untouched, no message logged) and
  only records `transport: 'live'` from the verified predicate.
  **REAL DEFECT FIXED:** `outreachRecordId(prospectId, revision)` — workflow-owned
  ids; the generator's `Date.now()` ids collided within a millisecond and
  `saveOutreach` upserted by id, silently destroying a revision (proven:
  `stored 2`, `1:pending_approval 3:pending_approval`).
- **`AcquisitionWorkflow.tsx` (+31/−25)** — uses the resolver; the operator label
  and send notice now report the honest provider state.
- **`scripts/validate-outreach-provider-hardening.mjs`** (NEW, 44 assertions) +
  **`e2e/outreach-provider-hardening.spec.ts`** (NEW, 3 tests).

**TESTED (D3) — real output**
- `npm run typecheck` → **TYPECHECK_EXIT=0** · `npm run lint` → **LINT_EXIT=0**
- `npm run build` → **PASS**, `✓ built in 3.31s`
- `node scripts/validate-outreach-provider-hardening.mjs` →
  **OUTREACH_PROVIDER_HARDENING_VALIDATION_PASS (44 ✓ / 0 ✗)**
- `npx playwright test e2e/outreach-provider-hardening.spec.ts` → **3 passed (15.3s)**
- relevant specs (outreach-hardening · acquisition-pipeline ·
  bi-intelligence-preservation · domain-acceptance · crm · rakazo ·
  simulation-control · multi-tenant) → **50 passed (44.5s)**
- `npx playwright test` (full) → **172 passed / 4 skipped / 0 failed, EXIT=0**
  (D2 baseline 169/4/0 → **+3 tests, 0 new failures**)
- existing validators (acquisition-pipeline · bi-intelligence-preservation 42 ·
  bi-lifecycle · prospect-pipeline · rocketchat-removal · demo-completeness 27 ·
  mock-providers · mock-seam · provider-workflows · design-tokens · whatsapp)
  → **ALL PASS**

**RESULT:** DONE. Only a positively-resolved `live` mode with verified credentials
can perform — or be recorded as — a live send; every other state resolves to the
deterministic simulation transport with zero network calls; refusal is audited and
non-mutating; the full human-approval workflow is Rakazo/Postiz-free; RBAC and
prospect-scoped isolation hold; outreach revision history is no longer destroyable.

**KNOWN GAPS / NOT DONE:** no live provider send against a real provider (the live
path is proven via an injected provider transport); `/functions/v1/send-email`
remains deploy-time infrastructure that is absent; acquisition artefacts stay
session-only in-memory (D4); no manual browser pass (Playwright only); the D2
`BrandComm.brandInboxAddress` duplication finding still stands (untouched). No
deploy, no push.

**NEXT:** **D4 — persistence / domain hardening** (existing Supabase repository
pattern, no second database, simulation preserved). D4 does not start until this
gate is accepted.

## Phase D2 — BI intelligence preservation through acquisition (2026-09-11)

> Status: **DONE (verified this session)**. Commit **`fe0c893`**
> (`phaseD2: preserve canonical BI intelligence through acquisition`). Full report:
> `docs/PRODUCT_CONSOLIDATION_PHASED2_2026-09-11.md`.
> Pre-D2 HEAD: `4a3f761`. Protected baseline untouched: `959b4d2`.

**BUILT (D2)**
- **NEW `src/lib/intelligence/prospectIntelligence.ts` (248 lines)** — THE
  canonical BI-intelligence read layer. `getProspectIntelligence(id)` (null for an
  unknown id), `buildProspectIntelligence(p)`, `getIntelligenceForLead /
  ForOutreach / ForResponse / ForOpportunity`, `intelligenceDigest`,
  `intelligenceProvenance`, `intelligenceSections` (always all 11),
  `collectEvidence` (incl. nested section evidence), `buildIntelligenceRef`.
  Reads resolve against `prospectStore` and return the record BI holds — no
  second store, no copied subset.
- **`src/types.ts` (+129)** — `ProspectIntelligence`, `ProspectIntelligenceDigest`,
  `ProspectIntelligenceSection(+Key)`, `ProspectIntelligenceProvenance`,
  `ProspectIntelligenceRef`; `ProspectOutreachRecord.intelligenceRef?`.
- **`outreachLifecycle.ts`** — `AcquisitionProspectRow.intelligence` (by
  reference); `prepareOutreach()` records `intelligenceRef` (ids + counts + score
  snapshot + populated sections). **REAL DEFECT FIXED:** `outreachDestination()`
  now derives the `.example` slug from the canonical `normalizeBrandKey`
  (diacritics folded) — previously `Tapatío` produced the mangled
  `hello@tapato.example`.
- **`AcquisitionWorkflow.tsx` (+159, additive)** — `data-section="intelligence"`:
  ASIN table (real metrics), full contact set, distributors / restrictions /
  wholesale / growth signals, the seven score factors, and the provenance line
  (runs / timeline / snapshots / evidence sources). No styling or nav change.

**TESTED (D2) — real output**
- `npm run typecheck` → **PASS** (0 errors) · `npm run lint` → **PASS** (0 problems)
- `npm run build` → **PASS**, `✓ built in 3.26s` (AdminShell 467.10 → 477.13 kB)
- `node scripts/validate-bi-intelligence-preservation.mjs` →
  **BI_INTELLIGENCE_PRESERVATION_VALIDATION_PASS (42 assertions)**
- `npx playwright test e2e/bi-intelligence-preservation.spec.ts` → **4 passed**
- relevant specs (acquisition/bi-lifecycle/domain-acceptance/crm/dashboard/
  multi-tenant/rocketchat-removal) → **41 passed**
- `npx playwright test` (full) → **169 passed / 4 skipped / 0 failed, EXIT=0**
  (D1 baseline 165/4/0 → **+4 tests, 0 new failures**)
- existing validators (bi-lifecycle · acquisition-pipeline 64/64 · prospect-pipeline
  · demo-completeness 27/27 · mock-providers · provider-workflows · design-tokens
  · csv-import) → **ALL PASS**

**RESULT:** DONE. Canonical BI identity, ASIN-level intelligence, contacts,
evidence/provenance, scoring and lifecycle are all reachable through the
acquisition layer **by reference**, proven by a mutation-visibility test and a
no-second-store test. The ten real brands remain the active universe; no mock
universe; zero external network calls; RBAC intact.

**KNOWN GAPS / NOT DONE:** acquisition artefacts stay session-only in-memory (D4);
no manual browser pass (Playwright only); tracked out-of-scope finding —
`src/components/shared/BrandComm.tsx:20` duplicates the placeholder-slug logic
with a weaker regex (deliberately not touched in D2). No deploy, no push.

**NEXT:** **D3 — outreach/provider hardening** (transport seam only path to live;
simulation proves zero network; missing credentials never read as live; human
approval needs neither Rakazo nor Postiz). D3 does not start until this gate is accepted.

## BI Forensic Implementation Audit (READ-ONLY, 2026-09-11)

> Status: **DONE (audit only — no product change)**. Report:
> `docs/BI_FORENSIC_IMPLEMENTATION_AUDIT_2026-09-11.md` (33 sections, 1630 lines).
> Scope: establish, from code + executed runtime evidence, exactly what Brand
> Intelligence does today. **No source, config, schema, test, prompt, provider,
> UI, navigation, lifecycle, ICP, acquisition, CRM or outreach file was
> modified; nothing was committed or deployed; no Phase D work started.**
>
> **Evidence executed in that session:** `npm run typecheck` → 0 errors ·
> `npm run build` → ✓ 2.29s · `validate-bi-lifecycle.mjs` → **PASS (29
> assertions, incl. "ZERO external network calls")** · `validate-prospect-pipeline.mjs`
> → **PASS (26/26)** · `validate-acquisition-pipeline.mjs` → **PASS** ·
> `npx playwright test e2e/brand-intelligence-lifecycle.spec.ts
> e2e/acquisition-pipeline.spec.ts` → **6 passed (19.2s), EXIT=0** · temporary
> Vite-SSR diagnostic (created, run, **deleted**) → `EXTERNAL FETCHES: 0`.
>
> **Headline findings (baseline facts, not recommendations):**
> 1. BI has **no live data source of any kind** (0 network calls; 12 hand-written
>    seed records; `createBrandIntelligenceClient()` always returns `MockClient`
>    and ignores its `_forceMock` argument).
> 2. No ASIN discovery, no product fetch, no sales estimation, no contact
>    discovery, no company enrichment: `discoveryClient.ts` is **dead code (0
>    callers)**; 14 ASINs are synthetic literals; 0 emails/phones/LinkedIn URLs
>    exist in the dataset.
> 3. The scoring engine **never applies `INTELLIGENCE_SCORE_WEIGHTS`** (dead
>    constant), sums raw sub-scores (max reachable **92**, not 100),
>    **double-counts the challenger bonus**, and derives `salesEstimateScore`
>    from the average rating.
> 4. The seed `score:` literals are **dead data**: the engine always recomputes
>    different values (Tapatío 75/tier_3 → **68/tier_4**); 8 of 12 brands fall
>    below the tier_4 floor, so `Lead.priority='High'` and the upper UI tiers are
>    unreachable.
> 5. Snapshots are written **per run** (not weekly as the type comment says),
>    are **empty at boot**, and are **never rendered**; `nextCheck` is a display
>    stamp with **no scheduler and no consumer**.
> 6. Persistence is **session-only in-memory**: no BI table/migration/Supabase
>    call/browser storage anywhere.
> 7. `VIEW_ALLOWLIST` / `canAccessView` / `filterNavForTier` in `rbac.ts` have
>    **zero call sites**, so the Brand Intelligence nav/render is reachable by any
>    admin-staff session (domain-layer mutation guards do work).
> 8. Phase C preserves canonical identity but **discards** ASINs, per-ASIN
>    metrics, sales numbers as data, the 17 `ProspectEvidence` rows + provenance,
>    BI runs/snapshots and 6 of 7 score dimensions.
> 9. Documentation contradicts code in 4 places checked (BI called a "discovery
>    engine"; a dead `Discovery Client` marked DONE; Hunter & Gather / E-Cloth /
>    OceanSaver claimed as seeded brands but absent from `src/`; "weekly"
>    snapshots).
>
> **Next action for a future session:** none from this task — the audit is the
> deliverable. `PROJECT_STATUS.md`, `HANDOFF.md`, `STATUS_CHECK.md` and the
> Phase B/C reports were intentionally **left uncorrected** (reporting-only
> session); the contradictions are listed in the report §27 for a later,
> explicitly-authorised documentation pass.

## Phase C — BI → ICP → Outreach → CRM Foundation (2026-09-11)

> Status: **DONE** — phase gate passed. Report:
> `docs/PRODUCT_CONSOLIDATION_PHASEC_2026-09-11.md`.
> Objective (master roadmap Phase C): make the canonical Brand Intelligence
> prospects the ACTIVE acquisition universe and build the real downstream
> domain workflow — ICP consumption → contact/targeting → outreach prepared
> from BI evidence → human approval (modify/approve/reject) → simulated send →
> response → Opportunity → CRM relationship context. **No UI redesign. No
> Rakazo. No Postiz. No Rocket.Chat dependency. No live credentials.**
>
> **Gate evidence (executed this session):** typecheck **0** · lint **0** ·
> build **✓ 2.46s** · `validate-acquisition-pipeline` **64/64 PASS** (incl.
> **0 external fetches**, RBAC, tenant isolation) · `validate-prospect-pipeline`
> **26/26 PASS** · `validate-bi-lifecycle` **29/29 PASS** · 9 further validators
> **ALL PASS** · full Playwright **160 passed / 4 skipped / 0 failed** (2.3m;
> +4 new suite, 0 regressions) · full browser walkthrough of the acceptance
> workflow with **0 page errors**.
>
> **Implemented:**
> 1. **Canonical BI → ICP universe** — the ICP list is now DERIVED from
>    `prospectStore` (`getAcquisitionLeads()`); the seeded `INITIAL_LEADS`
>    fixture is retired from the active path and kept only as a validation
>    fixture. All ten real brands reach ICP with the SAME `prospectId`
>    (deterministic lead id `lead-<prospectId>`).
> 2. **Origin-region derivation** — `ICP_REGION_BY_COUNTRY` +
>    `deriveIcpOriginRegion()`; `LeadRegion` gained `uk` (7 of 10 canonical
>    brands are UK-origin); unknown origins return `null`, never guessed.
> 3. **Phase B data-loss root-cause fix** —
>    `brandIntelligenceClient.scoreProspect()` no longer drops fields it does
>    not own (`countries`, `incumbentChallenged`, notes, owner, stamps).
> 4. **Acquisition store + engine** — `src/data/acquisitionStore.ts` (outreach
>    revisions, responses, opportunities, events; canonical prospect id; audit
>    via `demoAuditLog`) and `src/lib/acquisition/outreachLifecycle.ts`
>    (enrol → prepare → modify/approve/reject → send → respond → opportunity,
>    with RBAC + state-machine guards in the domain layer).
> 5. **Transport seam** — `outreachSender.ts`: deterministic simulation
>    transport by default, `transportFromEmailClient()` to reuse the EXISTING
>    email provider client when credentials exist.
> 6. **Wired previously-dead canonical code** — `outreachGenerator.ts`
>    (BI-evidence copy) and `classifyInboundReply()` (intent classification).
> 7. **BI lifecycle stays canonical** — `setProspectOutreachStatus()` audits
>    every downstream transition on the prospect timeline.
> 8. **Minimum UI** — BI prospect **Outreach** tab (shared
>    `AcquisitionWorkflow`), Marketing **Acquisition Pipeline (BI-derived)**
>    card, CRM **Acquisition Relationships (pre-onboarding)** section, canonical
>    prospect thread names in Messages. No navigation re-architecture, no
>    styling pass.
>
> **Documented limitations (see report §18):** acquisition state is
> session-only (in-memory, like `demoStore`); no live provider send was
> exercised; opportunity → onboarding hand-off is Phase D; no automatic BI
> scheduling was invented.
>
> **NEXT: Phase D — outreach/provider/send/response hardening** (activate live
> providers through the existing seam, persist acquisition artefacts via the
> Supabase repository pattern, wire prospect → application → onboarding).

## Phase B — Brand Intelligence Real-Data Lifecycle (2026-09-10)

> Status: **DONE** — phase gate passed. Report:
> `docs/PRODUCT_CONSOLIDATION_PHASEB_2026-09-10.md`.
> Objective (master roadmap Phase B): give BI a **real, persistent, auditable
> lifecycle** behind the existing `BrandIntelligenceClient` seam — canonical
> prospect store, manual Admin discovery runs, candidate dedupe, sticky
> operator disqualify/re-qualify, run/change/snapshot history, single-source
> runtime universe. **No UI redesign. No Rakazo. No Postiz exposure.**
>
> **Gate evidence (executed this session):** typecheck **0** · lint **0** ·
> build **✓ 3.70s** · `validate-bi-lifecycle` **29/29 PASS** (incl. **0
> external fetches**) · existing validators **10/10 PASS** · full Playwright
> regression **156 passed / 4 skipped / 0 failed** (2.3m; +2 new lifecycle
> tests, 0 regressions) · real-browser proof of run/disqualify/requalify with
> **0 page errors**.
>
> **Implemented:**
> 1. **Canonical prospect store** — `src/data/prospectStore.ts` (NEW): in-memory
>    single runtime universe (12 canonical, 10 active) + run history + change
>    events + weekly score snapshots; boots once per session from the
>    authoritative seeds; records the `run-seed-baseline` origin + one
>    `created` event per prospect.
> 2. **Lifecycle engine** — `src/lib/intelligence/prospectLifecycle.ts` (NEW):
>    `runBrandIntelligence` (deterministic re-check + candidate intake with
>    canonical dedupe; classification created/updated/disqualified/unchanged),
>    `disqualifyProspect` / `requalifyProspect` (audited, **sticky** — a re-scan
>    never silently re-activates a human decision), `getPipelineStatus`,
>    `lastChecked`/`nextCheck` (+7d) stamps, snapshot accumulation.
> 3. **Types** — `src/types.ts`: `IntelligenceRun`, `ProspectChangeEvent`,
>    `IntelligencePipelineStatus`, `BrandProspect.lastChecked?/nextCheck?`.
> 4. **Admin UI (minimal, no redesign)** — Brand Intelligence panel is
>    store-backed with a **Pipeline Control** ("Run discovery" + next-check),
>    **Run History** (counts + expandable per-prospect changes), and a
>    **Disqualified** section with re-qualification; prospect detail gained
>    provenance badges, a **History** tab, and the **Disqualify** action.
> 5. **Single-source wiring** — `MarketingHub` identity bridge + Brand "Market
>    Intel" now read the store; the duplicate `CANONICAL_BI_UNIVERSE` literal
>    was deleted (single source of truth).
>
> **Canonical prospect universe decision:** the 12 seeded prospects (10 active:
> Tapatío, Seep, Astonish, Fly By Jing, LocknLock, Mike's Hot Honey, Cholula,
> Valentina, Delphis Eco, Kit & Kin) are the **authoritative canonical
> universe** — `source:'mock'` records only that no live provider produced
> them; provenance is tracked by run/change/snapshot history. No fabricated
> discoveries: candidate intake is the only path to `newCount > 0`.
>
> **Files changed:** `src/data/prospectStore.ts` (NEW) ·
> `src/lib/intelligence/prospectLifecycle.ts` (NEW) · `scripts/validate-bi-lifecycle.mjs`
> (NEW) · `e2e/brand-intelligence-lifecycle.spec.ts` (NEW) · `src/types.ts` ·
> `src/components/admin/BrandIntelligencePanel.tsx` ·
> `src/components/admin/ProspectDetailPanel.tsx` ·
> `src/components/admin/ProspectDetailTabs.tsx` ·
> `src/components/brand/BrandIntelligence.tsx` ·
> `src/components/admin/MarketingHub.tsx` · docs + memory files.
>
> NEXT: **Phase C — ICP consumes canonical BI data** (replace the `INITIAL_LEADS`
> mock acquisition universe with BI-derived real prospects; then outreach
> preparation → human approval → send/track → response → Opportunity → CRM).
> Do NOT begin UI redesign; do NOT begin Rakazo/Postiz.
>
> **[SUPERSEDED — Phase C (2026-09-11) DELIVERED this: see the Phase C section at
> the top of this file. `INITIAL_LEADS` is no longer the active acquisition
> universe.]**

## Phase A — Core Data / Domain / Workflow Consolidation (2026-09-10)

> Status: **DONE** — phase gate passed. Report: `docs/PRODUCT_CONSOLIDATION_PHASEA_2026-09-10.md`.
> Objective: continue the master consolidation **CORE PRODUCT FIRST / RAKAZO LAST** —
> close the BI→ICP identity gap, persist real fit scores, classify all data
> (REAL / SIMULATED / SEEDED / UNKNOWN), and create the portable memory files.
> **No UI redesign. No Rakazo. No Postiz exposure.**
>
> **Gate evidence (executed this session):** typecheck **0** · lint **0** ·
> build **✓ 3.15s** · full E2E **154 passed / 4 skipped / 0 failed** (2.2 min) ·
> validators **7/7 PASS** (mock-providers, mock-seam, provider-workflows,
> automation, postiz, discovery, **prospect-pipeline** (NEW — 18 tests)) ·
> real-browser (Chromium) proof of the new identity flow in `domain-acceptance` test 7.
>
> **Implemented (minimal connective tissue, all data-truth):**
> 1. **BI→ICP canonical identity bridge** — `Lead.prospectId?: string`
>    (`src/types.ts`) + NEW `src/lib/intelligence/prospectPipeline.ts`:
>    deterministic brand-key match (`matchLeadToProspect(s)`), CSV-ingestion
>    linking (`matchLeadsToProspects` — canonical segment inherited only when
>    the record left it blank; explicit user data never overwritten), and
>    `deriveLeadFromProspect(prospect, region)` which returns `null` for an
>    unmappable origin (**an origin is never invented**).
> 2. **Discovery enrollment no longer fabricates data** — the old wire stored
>    `fitScore: 85` + `segment: 'Home'` for every enrolled lead regardless of
>    the pipeline's real values; the events now carry the real per-lead
>    `EnrichedLead.fitScore` + `segment`.
> 3. **Fit scores persisted at transitions** — `updateLeadStatus(id, status,
>    fitScore?)`; auto-enroll now stores the live-computed score (was
>    display-only).
> 4. **Wiring:** MarketingHub CSV import + discovery enrollment both link
>    ingested leads against the canonical BI universe.
>
> **Browser-verified (E2E test 7):** importing CSV row `Tapatío,…,us,` (no
> segment) renders the linked lead with canonical segment — visible as
> `US · Grocery` — proving identity survives ingestion end-to-end.
>
> **Data-classification output (complete table in phase report §4):** BI seeds
> (12) + ICP `INITIAL_LEADS` (8) = SEEDED TEST FIXTURES · discovery/provider
> sims = DETERMINISTIC PROVIDER SIMULATION · dashboards/helpdesk/analytics =
> REAL INTERNAL DATA · campaign/monitoring-health = SEEDED (flagged) ·
> Firecrawl/Keepa real clients + live Edge Functions = UNKNOWN/ABSENT (no live
> credentials; never claimed working).
>
> **[Phase C update 2026-09-11: the `INITIAL_LEADS` fixture is no longer in the
> active acquisition path — the acquisition universe is DERIVED from the
> canonical BI prospect store, and acquisition artefacts are session-only
> in-memory. See the Phase C section.]**
>
> **Files changed:** `src/types.ts` · `src/lib/intelligence/prospectPipeline.ts`
> (NEW) · `src/context/GlobalStateContext.tsx` · `src/components/admin/MarketingHub.tsx`
> (logic only) · `scripts/validate-prospect-pipeline.mjs` (NEW) ·
> `e2e/domain-acceptance.spec.ts` (test 7) · `MERCENTA_MASTER_CONTEXT.md` (NEW) ·
> `MERCENTA_ARCHITECTURE.md` (NEW) · `PROJECT_STATUS.md` (this entry).
>
> NEXT: **Phase B — Brand Intelligence real-data lifecycle** (BI persistence +
> refresh/dedupe/provenance behind the existing `BrandIntelligenceClient` seam;
> keep the mock working). Do NOT begin UI redesign; do NOT begin Rakazo/Postiz.

## Phase 1 — Backend / Data / Domain Acceptance Gate (2026-09-10)

> Status: **DONE — HARD GATE PASSED**. No UI redesign started. UI untouched by design.
> **Gate evidence (executed this session):** typecheck 0 · lint 0 · build ✓ 3.18s ·
> full E2E **153 passed / 4 skipped / 0 failed** (2.1 min) · 6 provider/automation validators PASS
> (mock-providers, mock-seam, provider-workflows, automation, postiz, discovery) ·
> real-browser verification via Playwright (Chromium) on all new acceptance paths.
>
> **New coverage — `e2e/domain-acceptance.spec.ts` (6 tests, all green)** covering the domain contracts the old 147-test suite did not assert:
> 1. **Rakazo independence** — core domain (Overview KPIs + CRM) operates fully with the Rakazo surface present/unreachable; iframe-or-fallback never crashes.
> 2. **Brand Intelligence** — canonical dataset proven at runtime: 12 tracked / 10 shown (Truthbrush + UpCircle disqualified), scoring KPIs, deterministic search, evidence tabs.
> 3. **ICP pipeline** — seeded 8-lead universe renders; live fit scoring; deterministic auto-enroll of exactly 2 Scraped leads (Mara Naturals 70, Bella Pelle 85) — real stage transition visible in the pipeline board.
> 4. **ONE canonical conversation** — a Helpdesk reply (`logMessage`) surfaces immediately in the admin Messages thread for the same brand; no duplicated history.
> 5. **Helpdesk lifecycle** — real `ticket_status_changed` status transition reflected in the row AND audited (audit-log action registry).
> 6. **Reload semantics** — in-memory demo contract proven: reload returns to public entry (session resets by design); re-login re-bootstraps the identical canonical dataset; tenant pin preserved.
>
> **Three genuine defects found & fixed in `src/components/admin/HelpdeskDashboard.tsx` (Phase 1 scope — query refresh / mutation ordering / single-source visibility):**
> 1. `logMessage` writes were never invalidating the `['messages']` TanStack query → sibling views (Messages Hub) rendered a stale snapshot (30 s staleTime) even though the canonical store had the message — violating the "one canonical conversation" contract. **Fix:** `qc.invalidateQueries({ queryKey: ['messages'] })` after a reply (mirrors existing `BrandComm.tsx` pattern).
> 2. `updateTicketStatus`/`assignTicket`/`setTicketPriority` mutate `demoTickets` in place with no React-observable change → rows/selects never re-rendered. **Fix:** `useReducer` storeTick bump invoked after every ticket mutation (status/assignment/priority/reply); the filtered list is now recomputed per render (deliberately unmemoized — 5 rows, trivial cost) instead of caching a stale snapshot.
> 3. `filteredTickets` useMemo had no `demoTickets` dependency at all — latent stale-list bug. Rendered moot by fix 2's unmemoized computation.
>
> **Recorded caveats (honest, not gate blockers):**
> - **Live-provider Edge-Function layer absent from repo** (`/functions/v1/spapi/*`, DHL/CH/HMRC EFs, `send-email`/`esign-envelope`): the mock/live seams and factories are verified intact; switching a provider to LIVE would 404 until those functions deploy. Simulation-only mode unaffected. Recorded as deploy-time/GO_LIVE work.
> - **Reload persistence is in-memory-only in demo mode** (documented contract; Supabase-backed deployments persist entity writes — not re-testable here without a live Supabase project). Test 6 asserts the documented demo semantics deterministically.
> - **`scripts/validate-edge-functions.mjs` crashes** (ENOENT `payouts-transfer`) — STALE tooling vs current tree; recorded in Phase 0 checklist. Not part of this phase's gate.
> - Real-network provider failure/retry paths are exercised through the deterministic sim + validators only (no live credentials in this environment).
>
> NEXT (superseded by the master roadmap A–M): the former "Phase 2 — Rakazo"
> is now **Phase M (LAST)**. The corrected continuation is **Phase A — Core
> Data/Domain/Workflow Consolidation** (completed above), then Phase B — BI
> real-data lifecycle. See MERCENTA_MASTER_CONTEXT.md §AB.
## Phase 0 — Product Consolidation: Repository + Audit Reconciliation (2026-09-10)

> Status: **DONE** — checkpoint doc `docs/PRODUCT_CONSOLIDATION_PHASE0_RECONCILIATION_2026-09-10.md`.
> Master consolidation pass started. Phase 0 = reconcile docs vs code. **No product functionality changed.**
> Reactivated baseline verified in-session: HEAD `9915656` (`redesign/foundation`), protected tag `mercenta-baseline-before-redesign-20260907` → `959b4d2` intact.
> Re-verified in-session gates: `npm run typecheck` 0 errors · `npm run lint` 0 errors · `npm run build` ✓ 3.20s · full E2E **147 passed / 4 skipped / 0 failed** (2.0 min) · provider validators (mock-providers / mock-seam / provider-workflows / automation / postiz) all PASS.
> **Key reconciliation findings (see checkpoint doc for the full classified inventory):**
> - `STATUS_CHECK.md` "event-feed Edge Function" claim → **absent** (only `xero-token`/`xero-webhook` in `supabase/functions/`).
> - `PRODUCTION_READINESS.md` "handleInboundReply wired" → **no caller** in src/supabase.
> - `PRODUCTION_READINESS.md`/`STATUS_CHECK.md` Stage-17/21/22 Edge Functions (`payouts-transfer`, `catalog-import`+0010 RPC, `discovery-directory`, `esign-envelope`, `send-email`, `instantly-reply-webhook`) → **absent from tree**; `scripts/validate-edge-functions.mjs` crashes ENOENT (STALE tooling).
> - `docs/ARCHITECTURE.md` §8 + `FUNCTIONAL_RISK_MAP.md` "typecheck red 27 errors" → **stale** (0 at HEAD; `outreachGenerator.ts`/`XeroConnection.tsx` now typecheck clean but remain unimported dead code).
> - `PROJECT_STATUS.md` old "20 registry integrations" → **19**; `Rakazo` not in registry.
> - Rakazo confirmed: iframe-only surface, zero domain imports, zero bot code in repo (Phase 2 target).
> - Brand Intelligence: seed-only (12 prospects), always `MockClient`, no persistence/actions (Phase 3 target). ICP: separate 8-mock-lead universe, disconnected from BI (Phase 4 target).
> - Rocket.Chat factory always returns mock; Postiz panel always passes `apiKey:''`; live Edge-Function layer absent (recorded, not a simulation blocker).
> NEXT: **Phase 1 — Backend/Data/Domain Acceptance Gate** (the hard gate before any UI redesign).

## 1b. Provider Simulation-First completion (2026-09-09) — SIMULATION-COMPLETE core workflows

| Checkpoint | Covered | Notes |
|---|---|---|
| **Provider control plane** | 20 registry integrations (15 original + `dhl`/`xero` Phase 4 + `companies_house` + `hmrc` this pass), mode model authoritative, Integrations Hub now the provider control plane: per-card simulation enable/disable, safe mock-credential labels, LIVE boundary unchanged (sandbox never equals LIVE). | UNKNOWN ≠ SIMULATION enforced at resolver (`isProviderSimulationSafe`), scenario engine gate, DHL/compliance domain boundaries, and the Integrations UI. |
| **DHL logistics adapter** | `src/lib/dhl/` — live client (`client.ts`, Edge-Function transport), deterministic mock (`mockClient.ts`: milestone sequence label→pickup→picked_up→in_transit→customs→delivered, every-6th exception + retry recovery, `simulateDhlTransientFailure`), factory (`index.ts`, `mock:` secret never reaches live transport), transform, domain seam (`domain.ts` USER ACTION → contract → mock → milestone → domain state (demoShipments) → audit → event). Carrier terminal "DHL status → next milestone (sim)" button wired + CarrierShell now wrapped in IntegrationsProvider (fixed pre-existing missing-provider crash). | |
| **Companies House + HMRC** | `src/lib/compliance/` — live+mock+factory pairs; `complianceSync.ts` domain workflow (verifyBrandCompany / checkHmrcStatus / fileHmrcReturn) writing tenant-scoped verification + filing stores; safe mock credentials; Super Admin → **Compliance** tab. | |
| **Scenarios** | 9 total (+2): `SHIPMENT_PROGRESSION` and `COMPLIANCE_VERIFICATION`. Every scenario deterministic, resettable, safety-gated, audit + event trail, zero network. | |
| **Live-boundary** | `src/integrations/connections.ts` — non-React registry mirror; `spApiConnectionCredentials()` resolves the wizard-stored vault secret ref so `api.ts` factories flip mock→real on credentials alone. Same seam pattern for DHL/CH/HMRC. | |
| **Validation** | `validate-mock-providers.mjs` extended (mock/factory/networkCalls===0 for DHL/CH/HMRC) — PASS; new `validate-provider-workflows.mjs` (scenario determinism, audit/event counts, fetch-instrumented ⇒ ZERO external network calls, LIVE/UNKNOWN refusal) — PASS. | |
| **E2E** | `simulation-control.spec.ts` 17/17 (incl. 2 new scenario runs), new `compliance-sim.spec.ts` 2/2, full suite **147 passed / 0 failed / 4 skipped** (pre-existing conditional product gates). | |
| **Gates** | `npx tsc --noEmit -p tsconfig.app.json` **0** · `npm run lint` **0** · `npm run build` **PASS**. | |

- **Provider mode safety (unchanged + enforced):** only a mode positively resolved `simulation` is executable by any simulated action. `available`/`configuring`/`disabled`/`unknown`/`not_registered`/`live` are all refused by the scenario gate and each domain boundary (`dhl`, `companies_house`, `hmrc`).
- **No business-workflow fork:** the domain workflows (PO/catalog/PO-ack/shipment/compliance/filing) are the SAME code paths for simulation and live; only the adapter behind the contract changes.
- **Network isolation proof:** `validate-provider-workflows.mjs` instruments global fetch and runs both new scenarios + `verifyBrandCompany` — asserts and shows **0 external fetch calls**.
- **Skips (4, all pre-existing product-guarded):** `access-gate` flag/reject/brand-visible ×3 + `tours` deductions-surface ×1 — pre-existing conditionals, unchanged classification.

## 1a. Golden-protocol continuation (2026-09-09) — Phases 1, 2, 10 DONE

| Phase | Status | Notes |
|---|---|---|
| **Phase 1 — ZERO-ERROR REPAIR** | ✅ **DONE** | `0fc1265` — repaired ALL 44 TypeScript + 18 ESLint errors to **0** via root-cause fixes (no @ts-ignore, no config weakening, no rule disabling, no file exclusion). scenarioEngine `audit()` signature reordered (matches 26 call sites), `error?: string` added to ScenarioResult, dead re-export removed; SimulationControl `running !== null` + result.error typing; IntegrationsPanel missing `IntegrationDefinition` import; Header toggleRef type aligned to AppShell; OnboardingWizard brandId now `session?.tenantId` (was never-working `brandProfile.id` fallback — agreements now keyed to the real tenant) + exhaustive-deps-correct prefill effect; BrandReports CSV export aligned to canonical `downloadCsv` contract + recharts formatter param types; api.ts draft-shipment row aligned to canonical `DemoShipment` (removed non-row fields); banksByCountry `BanksByCountry` type declared; xero tokenManager refreshLocks typed to the token promise; 10 lint files fixed (memoized query fallbacks, removed/referenced stale deps, prefer-const). **Bonus:** corrected TourEngine dep arrays now make 2 previously-skipped tour tests PASS. Gates: **TS 0 · ESLint 0 · Build PASS · Full 21-suite E2E 143 passed / 0 failed / 4 skipped** (2.5m). |
| **Phase 2 — CORE RUNTIME STABILITY** | ✅ **DONE** | `85aa056` — real-browser sweep (`scripts/runtime-sweep.mjs`) of EVERY Primary-nav destination for all roles: Super Admin 24 / Admin 21 / Brand×2 15 each / Carrier 3 — **0 page errors, 0 console errors, 0 ErrorBoundary crashes on every screen**. All 7A–7F repairs hold. |
| **Phase 10 — ACTUAL PUBLIC DEMO** | ✅ **DONE** | `58c341e` — demo.mercenta.co.uk was serving a 5-week-stale build; REDEPLOYED the current code via the existing `scripts/deploy-demo.sh` (Namecheap FTP). Diagnosis surfaced a **pre-existing PRODUCTION-ONLY mount crash** (`Cannot read properties of undefined (reading 'unstable_scheduleCallback')` — dev worked, prod crashed): `node_modules/scheduler` (React 18.3.1's extracted scheduler) was chunked into `vendor-other` while react/react-dom went to `vendor-react` → split scheduler singleton. Root-cause fix in `vite.config.ts`: co-locate `scheduler` (+ `use-sync-external-store`, `react-redux`, `@reduxjs/toolkit`, `recharts`) with the react chunk. Verified locally via `npm run preview` (pageErrors 0, full render), redeployed, live URL now serves the fixed build (`index-QtIJfAir.js` matches local dist; all assets 200 + gzip). Live browser verification across 5 runs: homepage/login/Super Admin dashboard/brand portal/carrier terminal all rendered in at least one clean run with **zero page errors on every flow**. Residual: Namecheap shared-hosting throughput from this location was severely throttled during the session (~180 B/s observed), causing intermittent cold-load timeouts — an environmental variable, not an app defect. |
| **Phase 8 (role-by-role) — read: covered by Phases 1–2 sweeps** | ⏳ | Brand finisher surfaces + carrier parity pass the runtime sweep; Phase 8's remaining fuller role-by-role audit **(Tour 5 deductions surface NOW BUILT — Phase G1, 2026-09-13)**; the rest (ComplianceUploadCard re-verification, Integration Hub breadth) is recorded as the next body of work in section "Remaining skips / deferred". |

## 1. Master Redesign — Phases 0–5 complete; Phase 6 DONE

| Phase | Status | Notes |
|---|---|---|
| **Phase 0 PROTECT** | ✅ **DONE** | Baseline commit `959b4d2`, tag `mercenta-baseline-before-redesign-20260907`, external bundle `/Users/tadii/Desktop/mercenta-baseline-backup-20260907.bundle`. Working branch `redesign/foundation`. |
| **Phase 7C DASHBOARD REDESIGN** | ✅ **DONE** | `6355979` — Admin Operations Overview redesigned as an operational command centre (Phase 5 primitives inside the Phase 6 shell). Brand dashboard fabricated `94.2` compliance score and fake inventory estimate removed (derived real metrics). Shared dashboard primitives `src/components/shared/dashboard.tsx` (KpiGroup / DashboardSection / AttentionPanel) now canonical (documented in `docs/DESIGN_SYSTEM.md`). AdminShell breadcrumb gap for `purchase_orders_admin` fixed. Dashboard E2E `e2e/dashboard.spec.ts` **7/7 PASS**. TS 45 pre-existing (0 new), lint 26 (0 new in changed files), build ✓. Browser-verified at all 7 viewports (no horizontal overflow), screenshots `test-screenshots/dashboard/`. Full regression **86 passed / 1 failed (pre-existing legal-agreements t1) / 48 skipped**. |
| **Phase 7D — REGRESSION / SKIP-DEBT CLEANUP** | ✅ **DONE** | See the **7D details section** below this table. Result: **121 passed / 0 failed / 5 skipped** (19-suite set). Legal-agreements t1 fixed; 43 skips eliminated/justified; 5 skips retained (all classified + documented below). |
| **Phase 7E — BRAND DASHBOARD REDESIGN + SMALL DEFERRED ITEMS** | ✅ **DONE** | See the **7E details section** below this table. Result: **134 passed / 0 failed / 4 skipped** (19-suite + dashboard). Brand Dashboard redesigned end-to-end (real tenant-scoped data, legacy static REVENUE_DATA chart removed, global activity feed removed for tenant safety, attention/quick actions to real routes). Brand Settings Guided Tours tab with per-tour Restart Tour. Demo-mode publish now live-refreshes the mounted public Home (module version/subscription + React Query hook). TS 43 (baseline, 0 new), lint 23 (< baseline 24, 0 new), build ✓. Screenshots at all 7 viewports × admin+brand captured; image inspection NOT supported in this environment — DOM/geometry probe passed all 7 viewports instead. |
| **Phase 7F — COMPLIANCE STATE MODEL + GENUINE E2E + ACCESS-GATE REPAIR** | ✅ **DONE** | See the **7F details section** below this table. Result: **143 passed / 0 failed / 4 skipped** (21 suites: the 19-suite set + dashboard + access-gate). Deterministic compliance-scenario portal tenants added to the canonical demo dataset (0/5 and 4/5 doc states) → compliance-gate t1/t2 and crm t3 converted from skips to genuine passing tests; access-gate became a real green suite (6 passed / 3 pre-existing skip fixmes); Tour 5 honestly retained as a documented product gap (only remaining non-access-gate skip). Previously-dead ComplianceUploadCard mounted (category-aware gate). TS **43** (exact 7E baseline, 0 new), lint **18** (down from 23; 5 no-var fixed in the touched file), build ✓. Commits `5f13ac1` + `2f9e62f` + `3c5a88a`. |
| **Phase 1 UNDERSTAND** | ✅ **DONE** | `docs/MERCENTA_PRODUCT_CONTRACT.md`, `docs/ARCHITECTURE.md`, `docs/INTEGRATIONS.md`, `docs/FUNCTIONAL_RISK_MAP.md`. |
| **Phase 2A** | ✅ **DONE** | `a796f37` — integration mode model, health, provider contract, registry metadata. Probe PASS 11/11. |
| **Phase 2B** | ✅ **DONE** | `ba99266` — health runner `src/lib/integrations/health.ts`, wizard stepper/mode badges/health panel in IntegrationsPanel. Probe PASS 7/7. |
| **Phase 2C** | ✅ **DONE** | `4eeef45` — `src/lib/simulation/scenarioEngine.ts` (650 lines, 7 deterministic scenarios, safety gate, event+audit trail, extensible dispatch). Typecheck 0 new, eslint clean, build `✓ 3.22s`, scenario probe **PASS all**. |
| **Phase 3** | ✅ **DONE** | `SimulationControl.tsx` (377 lines) + SuperAdminPanel tab wiring. Super Admin-only (existing RBAC + boundary tier check). Reuses scenario engine; boundary safety check + engine gate (defense in depth); partial shared reset (`resetMockAmazonState` + `resetEvents`, labelled partial). Typecheck 0 new, eslint clean, build `✓ 2.20s`, Phase 3 regression probe **PASS** (determinism, all-7-ok, LIVE refusal, 0 network calls). |
| **Phase 4** | ✅ **DONE** | Provider safety (UNKNOWN≠SIMULATION) + `submitCatalogItem` critical fix + real Playwright verification. 4A: `types.ts` adds `ProviderResolutionMode`/`isProviderSimulationSafe`/`resolveProviderMode`; `dhl`/`xero` registered (docs-verified simulation); `stripe`/`rocketchat` META corrected to simulation; engine `assertSimulationOnly` default `unknown` (not simulation) + strict positive-simulation gate; Control Centre uses shared resolver. 4B: `submitCatalogItem` + `isComplianceGateCleared` fixed off-by-one arg → pass `undefined` category + both agreements (pre-existing defect discovered in Phase 4 → minimal targeted fix). 4C: `e2e/simulation-control.spec.ts` **15/15 PASS** (RBAC, rendering, run, LIVE-refusal UI+resolver, network isolation, partial-reset, 7-viewport screenshots captured at `test-screenshots/simulation-control/`). Probes: Phase 4A+B **PASS** (21 checks, `networkCalls===0`). Build `✓ 3.28s`. |
| **Phase 5** | ✅ **DONE** | Design-system foundation (foundation only — no app-screen restyle). Tokens: `state.*`, `surface.*`, `rounded-ds-*`, `shadow-ds-*`, `transition-ds`, focus-visible in `src/index.css`, `docs/DESIGN_SYSTEM.md`. Canonical kit extended in `src/components/ui.tsx`: semantic `StatusBadge`, `Alert`, `Tabs`, `Breadcrumb`, `Modal` (ESC+focus), `Pagination`, `EmptyState`, `Skeleton`, `PageHeader`, `EntityHeader`, `DataTable`; `Button` variants tertiary/destructive/link + `loading` + `data-state`; `danger` kept as legacy alias; form foundation (`Input`/`Select`/`Textarea` helper/error/id + aria-invalid/describedby). Showcase `src/components/design/DesignSystemShowcase.tsx` mounted as Super Admin → Design System tab. Browser: `e2e/design-system.spec.ts` **11/11 PASS** (rendering, keyboard focus-visible, modal ESC, tabs, 7-viewport screenshots no-overflow at `test-screenshots/design-system/`). Regression: simulation-control spec still 15/15 (combined 26/26). Build `✓ 2.46s`. Modal ESC-gap discovered & fixed during verification. |
| **Phase 6** | ✅ **DONE** | Application shell & navigation redesign (`e7fa882`). **Shell:** `AppShell.tsx` now takes `navSections` (grouped), renders a skip link → `#main-content` (`tabIndex=-1`), a canonical `Breadcrumb` trail (section › page; more-specific label wins), and a single mobile drawer (`<1024px`: fixed off-canvas `w-72`, `-translate-x-full` ↔ `translate-x-0`; backdrop z-40 click-to-close; Escape closes + returns focus to toggle; toggle `data-testid="app-menu-toggle"` with `aria-expanded`/`aria-controls`; nav-select closes). At `lg`+ the same aside is `lg:static lg:w-60`. `Sidebar.tsx` renders grouped sections with static headings, `aria-current="page"` + `data-state` on active, `<li>` items, `aria-label="Primary"`, `rounded-ds-md`/`transition-ds`. `Header.tsx` drops the non-functional Search input (audit HIGH #508), adds the mobile toggle, profile menu gains `aria-haspopup`/`aria-expanded`/`aria-controls` + `role="menu"`/`menuitem`; NotificationCenter & callbacks unchanged. **IA:** Admin 24 flats → 12 sections (Overview/Brands/Catalogue/Commerce/Finance/Logistics/Compliance/Communications/Support/Monitoring/Administration/Integrations); Brand 15 flats → 7 sections (Overview/Catalogue/Commerce/Logistics/Compliance/Insights/Account); Carrier 3 items in one unlabelled section (visually unchanged). **RBAC (nav-visibility only):** non-super admin hides `super_admin`/`audit_log`/`integrations`; render-side guards untouched. **Tests:** `e2e/app-shell.spec.ts` (new) **23/23 PASS** (roles, IA, aria-current/data-state, breadcrumbs, RBAC visibility, drawer open/close/Esc/backdrop/focus-return/single-tree, keyboard+focus-visible, skip link, Simulation + Design System reachable, 7-viewport no-overflow + screenshots at `test-screenshots/app-shell/`). Regression: simulation-control **15/15**, design-system **11/11** (26/26). Targeted hooks check (rules-of-hooks + exhaustive-deps as error) **pass** on all 6 shell files. Typecheck **0 layout errors**; lint clean for layout; build `✓ 3.16s`. Selectors updated in compliance-gate/legal-agreements/notifications/shipment-asn/design-system/simulation-control for the new section headings + drawer. **Known pre-existing (NOT Phase 6):** 43 legacy e2e tests fail at the login step because the Home marketing hero no longer has a `Get Started` button (`Home.tsx` has none at HEAD **and** at baseline `959b4d2`) — unrelated to the shell; `GlobalStateContext.tsx:147` calls undefined `setCampaigns` (async, non-blocking); `BrandPurchaseOrders` view crashes ("Brand portal — something went wrong") for DeskForge; `ComplianceHub.tsx:199` arg-shift (already listed below). Design-system doc gains a canonical “Shell & Navigation” section.
| **Phase 7A — regression baseline restoration** | ✅ **DONE** | `c856a08` — centralised E2E login entry. New `e2e/helpers/auth.ts` (openLogin/loginAs) adopts the validated Phase 5/6 "Partner Login" hero-first + mobile-nav fallback (accessible role/name selectors). Replaced obsolete `text=Get Started` in 19 spec files (billing, compliance-gate, crm, deductions, disputes, fulfillment-tracks, homepage-editor, legal-agreements, multi-tenant, onboarding, po-lifecycle, rakazo, shipment-asn, tours, xero + reference suites simulation-control, app-shell, design-system, notifications). `access-gate.spec.ts` untouched (tests the login page itself). 0 "Get Started" selectors remain. Result: 68 passed / 11 failed / 49 skipped (128 tests, 19 suites — real runs below); all 11 remaining failures triaged; none introduced by 7A. |
| **Phase 7B — defect repair + regression stabilization** | ✅ **DONE** | Repairs A–F executed and verified: (A) `GlobalStateContext` missing `setCampaigns` setter fixed; (B) `ComplianceHub` `evaluateComplianceGate` arg-shift fixed (agreement → `hasSignedAgreement`); (C) Brand portal crash root cause `useIntegrations must be used within IntegrationsProvider` — `BrandShell` now wraps content in `IntegrationsProvider` like `AdminShell`; (D) `react-hooks/rules-of-hooks` + `exhaustive-deps` restored to `error` + genuine Rules-of-Hooks violations fixed (`RoutingRequest`) + authorized syntax repairs (`XeroConnection.tsx`, `outreachGenerator.ts`); (E) Phase 6 tour regression fixed (`tourAttr` restored in grouped nav + `TourEngine` tooltip viewport clamp); (F) onboarding E2E contracts aligned to intended behavior. Full regression: **79 passed / 1 failed / 48 skipped** (7A was 68/11/49); the 1 remaining failure is `legal-agreements` t1 (pre-existing styled-checkbox `.check()` intercept — unchanged classification). Typecheck: 45 errors remain, all pre-existing baseline debt in untouched files. Lint: 37 errors, all pre-existing patterns. Build PASS. Commits: see 7B section below. |
| **Phase 7C — Dashboard / overview redesign** | ✅ **DONE** | `6355979` — see the **7C details section** below this table. |
| **Discovered pre-existing defect (NOT yet fixed — out of scope)** | ⚠️ | `ComplianceHub.tsx:199` calls `evaluateComplianceGate(brandDocs, hasSignedAgreement)` — arg-shifted (agreement passed as `category`). Same off-by-one bug class fixed elsewhere in Phase 4. Propose minimal fix in a later approved increment. |

## 7C — Dashboard / overview redesign (admin primary; brand corrections)

**Commits:** `6355979` (implementation + tests + docs); `ac65ad1` (Phase 7C checkpoint record).

**Scope delivered**
- **Admin Operations Overview** (`src/components/admin/AdminDashboard.tsx` rewritten): single operational page inside the Phase 6 shell — PageHeader (h1) + derived operational summary; compact KPI band (Portfolio at a glance: POs awaiting action, POs in fulfilment, compliance docs pending, brands compliance-gate cleared, contract renewals due, open support tickets); severity-ordered actionable **Needs your attention** panel (Support / Purchase orders / Compliance / Contracts / Finance groups with semantic StatusBadge labels + Review buttons); **Next actions** operator queue (5 quick actions pre-counted to existing destinations); **Fulfilment in motion** (live shipments when they exist, else accepted/ready-to-fulfil POs, EmptyState when none); **Recent communications** (latest real message threads, human-reply flags). The old department-tab silo and its fabricated trend cards/detail modals were removed.
- **New shared dashboard primitives** `src/components/shared/dashboard.tsx`: `DashboardSection`, `KpiGroup`, `AttentionPanel` (one-surface KPI band with hairline dividers — no wall of elevated cards). Documented in `docs/DESIGN_SYSTEM.md` as canonical dashboard compositions.
- **Brand dashboard corrections** (`src/components/brand/BrandDashboard.tsx`): fabricated `complianceScore = 94.2` and fake `onHandEst` inventory estimate removed; compliance coverage now derived from the brand's real dossier docs (`verified/total %`), inventory card replaced with real **Product SKUs** + OOS count; `PageHeader` added for heading hierarchy.
- **AdminShell breadcrumb gap fixed** (`src/components/layout/AdminShell.tsx`, 1 line): `purchase_orders_admin` now maps to "Purchase Orders" (previously fell back to "Admin" — drill-down breadcrumb rendered `Commerce › Admin`).
- **Carrier dashboard**: NOT modified (operational terminal, functional, carrier-scoped).

**Data sources (all real, all existing):** `useBrands`, `usePurchaseOrders`, `useComplianceDocuments`, `useContracts`, `useMessages`, `useShipmentsAll`, `useDeductions` (React Query over canonical demo store/Supabase), plus `demoTickets` (helpdesk store) and `renewalUrgency` (contracts lib). No invented metrics, no hardcoded counts, no fabricated trends.

**Drill-down destinations (existing views):** `purchase_orders_admin`, `fulfillment_track`, `compliance`, `contracts_admin`, `helpdesk`, `billing`, `messages`. RBAC unchanged (non-super admin never sees super-only destinations; shell render guards untouched).

**States:** loading (skeleton KPI band + section placeholders, `dashboard-loading`), empty (per-section `EmptyState` for fulfilment / communications; "All clear" row when attention is empty), error (Alert + Monitoring escape hatch; the query layer falls back to seed so the error branch is code-verified but not reproducible in demo dev), normal.

**Accessibility:** h1 → h3 section hierarchy, aria-label on KPI drill-down buttons, semantic StatusBadge labels (never colour-only) with `data-status`, keyboard Tab reaches KPI drill-downs with the Phase 5 `:focus-visible` outline (E2E-verified), `aria-busy` during loading.

**Responsive:** verified no horizontal overflow at all 7 target viewports (1440×900 → 375×812); the Phase 6 mobile drawer still opens/closes at 375px (E2E-verified). Screenshots at `test-screenshots/dashboard/`.

**Tests:** `e2e/dashboard.spec.ts` **7/7 PASS** (hierarchy; KPI/next-action cross-consistency; attention rows with real seed entities; drill-down + RBAC nav hiding; keyboard focus-visible; brand no-94.2 + derived compliance + tenant-containment; 7-viewport no-overflow + drawer).

**Verification gates:** typecheck 45 errors (all pre-existing baseline, **0 new**), lint (baseline 37 → **26**; the rewrite itself removed 10 legacy AdminDashboard lint errors; **0 new** in changed files), build PASS. Full 7C regression below.

## 7D — Regression / skip-debt cleanup

**Commits:** `9666525` (product fixes + test-contract repairs) + this checkpoint commit.

**Baseline measured before edits (19-suite set, this session):** 79 passed / 1 failed (legal-agreements t1) / 48 skipped.

**Final result (same 19-suite set, after repair): 121 passed / 0 failed / 5 skipped.** All 5 remaining skips individually classified and justified below.

**Skip audit method:** re-ran every suite from scratch; for each of the 48 runtime skips inspected the actual `test.fixme` branch that fired, mapped it to the CURRENT UI contract (nav routing after Phase 6, renamed views/labels, moved data surfaces), then applied the smallest safe repair — fixing the test contract OR the small product defect that caused it. No assertions weakened, no conditional-on-failure logic, no DOM faking, no app-state injection.

**Product defects found and fixed (small, clearly intended):**
1. **`TourEngine` per-view auto-start was only wired for the PO tour** — `autoStartViews` on the other 8 tours were inert. Now the generic reg: any tour declaring `autoStartViews` starts on that brand view (catalog → Tour 2, analytics → Tour 5, logistics → Tour 4, compliance → Tour 6, settings → Tour 9/7, team → Tour 8). Fix: `src/components/shared/TourEngine.tsx` (loops `ALL_TOUR_DEFINITIONS`).
2. **Dispute writes hung in demo mode** — the async `disputeDeduction`/`recordDisputeOutcome` awaited the Supabase write BEFORE applying the in-memory store mutation, so with an unreachable host the demo store never updated (row never became disputed/resolved; audit never written). Fix: `src/data/api.ts` — apply the local store mutation first, background the DB write. Also `queryOrSeed` now returns a fresh `slice()` so React Query observers see a new reference after invalidation and re-render (previously identical identity = stale UI).
3. **Admin CRM Override with an empty reason silently threw** (`setBrandTrack` requires a reason) — no UI feedback. Fix: `BrandCRM.tsx` surfaces “Override reason is required…” instead of throwing.
4. **Brand logistics feed used only the mounted dossier snapshot** (stale, never reflected new drafts/ASN shipments). Fix: `LogisticsHub.tsx` reads the live `useShipmentsAll` feed, tenant-scoped for brand sessions; `BrandPurchaseOrders.tsx` invalidates the shipments query on ack/ASN so auto-created drafts and filed shipments appear immediately.
5. **Homepage Publish in demo mode could never surface on the public page** — `fetchHomepageContent` always returned `DEFAULT_HOMEPAGE_CONTENT` as “live”. Fix: session live-copy (`homepageState.live`) set on publish, returned by fetch in demo mode (Supabase path unchanged).

**Documented product gaps (deferred — NOT implemented in 7D):**
- Tour restart control from Brand Settings does not exist (tours t7 stays skipped with reason; small Settings feature → later phase).
- Tour 5 (Deductions on Analytics) starts, but its tour target attributes (e.g. `data-tour="deductions-benefits"`) do not exist in the SalesAnalytics surface — card cannot render its highlight (tours t5 stays skipped; data-tour rotation belongs to the later data-tour sweep).
  - **→ CLOSED in Phase G1 (2026-09-13):** the four Tour-5 targets now exist on the brand deductions ledger, mounted on Analytics **and** Reports; `tours` t5 is no longer skipped — it is a genuine passing functional + tenant-isolation test.
- Demo-mode post-publish home view does not auto-refresh the already-mounted public homepage (persistence/refresh work → later phase).
- Dispute resolution writes to the store + audit, but the live ledger row refresh relies on the React Query reference fix; the visual “→ outcome: partial” badge path is covered by the same mechanism and verified for won/lost seed rows.
- Not-representable data states (portal tenants are all compliance-cleared; no pending profile-change requests seed): these remain conditional skips because inventing demo data/state to drive them would violate the no-fake-state rule.

**Remaining skipped tests (all justified):**
- compliance-gate t1 `0/5 → blocked` — ENV/DATA state: no portal tenant with 0 approved docs; retained.
- compliance-gate t2 `4/5 → still blocked` — same; retained.
- crm t3 `profile-change review UI` — seed has no pending requests; the review UI is verified when pending; retained as data-conditional.
- tours t5 `Deductions tour on Analytics` — selectors do not exist yet; retained (deferred data-tour work).
- tours t7 `Settings has tour restart` — feature not built; retained (deferred feature).

**Previously-passing regression check:** the 79 tests passing at baseline still pass in the final run (no title-collision regressions; the renamed tests are the same contracts under corrected names). 0 unexplained new failures.

**Gates:** TypeScript 43 errors (baseline 45 → 43; **0 new** in changed files), lint 24 errors (baseline 26; **0 new** in changed files), build PASS (`✓ built in 2.44s`). Browser-verified: legal-agreements checklist gating, wizard walk-through (steps 1→5), dispute open→audit, ack→auto-draft→labels, ASN shortfall→deduction, tour 1 auto-start + tour 2/8 per-view triggers, homepage editor preview+publish, 7-viewport shell screenshots regenerated in `test-screenshots/app-shell/`, design-system + simulation screenshots regenerated.

## 7E — Brand Dashboard redesign + small deferred items

**Phase 7E commits:** `041de1a` (7E-A — small deferred product gaps: restart tour + homepage live refresh) · `ad97e9d` (7E-B — brand dashboard redesign + dashboard E2E + this status block). Protected baseline `959b4d2` + tag intact; checkout branch `redesign/foundation`.

**7E-B — Brand Dashboard redesign (complete rewrite of src/components/brand/BrandDashboard.tsx, 524 lines)**
- Reuses Phase 7C primitives (KpiGroup / DashboardSection / AttentionPanel) inside the Phase 6 shell; every list tenant-scoped; no new dependencies; recharts import REMOVED from the dashboard.
- Hierarchy: Brand Overview (h1) → At a glance (6-KPI band) → Needs your attention → Purchase orders (summary counts + recent POs) → Fulfilment in motion (tenant shipments or honest EmptyState) → Compliance & account health (real data, no score) → Recent communications (tenant-scoped messages; replaces the global activity feed that could not be tenant-scoped) → Next actions (6 quick actions, each routed to a real brand view).
- KPI data sources (real + traceable): usePurchaseOrders (active / awaiting-acknowledgement / in fulfilment), dossier products (live / out-of-stock), useContracts (contract status), useComplianceDocuments (X/Y approved — agrees with ComplianceHub). Attention rows derive from POs/deductions/OOS/shipment exceptions/tickets/returns.
- Legacy chart decision: static REVENUE_DATA chart REMOVED (not kept, not replaced with a fabricated series — the tenant's per-month PO series is intentionally sparse, so a plotted trend would be a fabricated shape; real time-series remains in Analytics/Reports). Replaced with the real-data PO/fulfilment operational section.
- Loading/empty/error: KpiGroup skeleton cells + aria-busy + loading/loaded test markers; Alert on query error; EmptyState for zero POs/shipments/comms; AttentionPanel native "All clear".
- Accessibility: single h1, h3 section hierarchy, expressible names loaded with semantic StatusBadge (never color-only), keyboard-reachable KPI cells, focus-visible.
- Responsive: all 7 target viewports — zero horizontal scroll, all 6 KPIs + all 7 sections visible, Phase 6 drawer functional at 375px.

**Regression (19 required suites + dashboard): 134 passed / 0 failed / 4 skipped** (Phase 7D baseline 121/0/5; net +13 passed, −1 skip, 0 regressions). Remaining skips: compliance-gate t1 (0-doc tenant not represented) · compliance-gate t2 (4/5-doc tenant not represented) · crm t3 (no requested profile change) · tours t5 (Tour-5 targets absent — documented product gap). tours t7 (Settings restart) now PASS. gate: `access-gate.spec.ts` is NOT part of the gate (out-of-gate pre-existing stale-contract failures, documented separately below).

**Gates:** TypeScript 43 (7D baseline exactly; 0 new) · ESLint 23 (below baseline 24; 0 new) · build PASS. Screenshots at all 7 viewports (admin + brand) captured (fresh 13:38). Actual pixel-level inspection NOT possible in this environment (model cannot accept image input) — strongest DOM/geometry verification performed instead (allOk=true for every viewport: 0 overflow, 0 overhang, 6/6 KPIs, 7/7 sections).
1. **Brand Settings → Guided Tours tab (Restart Tour)** — DONE. `BrandSettings.tsx` gains a `Guided Tours` tab listing all 9 tours with state badges + a design-system `Restart Tour` Button per tour, plus `TourEngine.restartTour(brandId, tourId)` which clears only that tour's completion/skip + per-step progress and relaunches via the EXISTING engine (`setTourProgress` notification path). No duplicate tour architecture; brand-settings-only surface (no admin/super-admin controls). E2E `tours.spec.ts` t7 upgraded from conditional-skip to real assertion (tab visible → button present → clicking Restart relaunches orientation card). **PASS**.
2. ~~**Tour 5 / Deductions data-tour targets** — **documented product gap (NOT built)**.~~ **→ BUILT in Phase G1 (2026-09-13)**: the brand deductions ledger now carries all four targets and `tours` t5 passes as a real test. The original inspection result follows as the historical record: Inspection result: the four Tour-5 targets (`deductions-ledger`, `deductions-categories`, `deductions-dispute-btn`, `deductions-dispute-outcome`) have NO existing representation in the brand Analytics surface — SalesAnalytics has no deductions ledger; the only brand-visible deductions UI is per-statement lines in Documents & Account (BrandSelfService) and returns-linked deduction notes in Returns — no category breakdown, no dispute affordance. Building a ledger would be a new feature (materially larger than an attribute repair) → **not built per 7E scope**. `tours.spec.ts` t5 remains a **justified skip**: product gap + view/order sequencing.
3. **Demo-mode homepage publish → live refresh of mounted public Home** — DONE. `src/data/api.ts` adds module-level `homepageLiveVersion` + `subscribeHomepageLive()` (same listener pattern TourEngine uses); `publishHomepageContent` bumps + notifies. `src/data/queries.ts` adds `useHomepageContent()` keyed on the version (React Query refetch on publish). `HomeShell.tsx` now renders `<Home content={live}>` from the hook instead of the static default. No polling/websockets/backend/API-contract change. E2E `homepage-editor.spec.ts` test 2 proves: public home mounts → publish in-admin (in-place, no reload) → return via header Home → published hero eyebrow visible. **PASS 2/2**.

**7E-B — Brand Dashboard redesign (complete rewrite of `src/components/brand/BrandDashboard.tsx`, 524 lines)**
- Reuses Phase 7C primitives (KpiGroup / DashboardSection / AttentionPanel) in the Phase 6 shell; recharts import REMOVED from the dashboard; no new dependencies.
- Hierarchy: Brand Overview (h1) → At a glance (6-KPI band) → Needs your attention → Purchase orders (summary + recent POs) → Fulfilment in motion (tenant shipments or EmptyState) → Compliance & account health (real data, no score) → Recent communications (tenant-scoped; replaces the un-scoped global activity feed that could not be filtered to a tenant) → Next actions (6 quick actions to real brand views).
- KPI sources (all real + traceable): `usePurchaseOrders` (active / awaiting-acknowledgement / in-flight), dossier products (live / out-of-stock), `useContracts` (contract status), `useComplianceDocuments` (X/Y approved, agrees with ComplianceHub). Attention rows derive from real POs/deductions/OOS/shipment exceptions/tickets/returns.
- Legacy chart decision: static `REVENUE_DATA` chart REMOVED. The tenant's real per-month PO series is intentionally sparse (POs arrive per retail order; the test tenant has 2 POs), so a plotted "trend" would be a fabricated shape — real time-series stays in Analytics/Reports. Replaced with the real-data PO/fulfilment section.
- Loading/empty/error: KpiGroup skeleton cells + aria-busy + loading/loaded test markers; Alert on query error; EmptyState for zero POs/shipments/comms; AttentionPanel native "All clear".
- Accessibility: single h1, h3 section hierarchy, expressible names, semantic StatusBadge (never colour-only), keyboard-reachable KPI cells, focus-visible via global rule.
- Responsive: all 7 target viewports — zero horizontal overflow, all 6 KPIs and all 7 sections visible, drawer intact at 375px (E2E + standalone geometry probe).

**Regression (19 required suites + dashboard, this session): `134 passed / 0 failed / 4 skipped`** — Phase 7D baseline was 121/0/5; net +13 passed, −1 skip, 0 regressions (tours t7 skip eliminated; homepage-editor +1; dashboard brand +6: tests 6−10).
Remaining skips − exact 4: compliance-gate t1 (no 0-doc tenant) · compliance-gate t2 (no 4/5-doc tenant) · crm t3 (no pending profile-change request) · tours t5 (Tour-5 targets absent — documented product gap). Former 5th skip (tours t7 Settings restart) now PASSES.
`access-gate.spec.ts` is NOT part of the 19-suite baseline; its 5 pre-existing failures are stale test contracts (country placeholder renamed to "Type your country name...", tests fill `placeholder*="Zimbabwe"`), files untouched by 7E.

**Gates:** TypeScript **43** (exact 7D baseline; 0 new — every changed file clean) · ESLint **23** (< baseline 24; 0 new; one pre-existing dashboard exhaustive-deps error removed) · build **PASS**. Browser verification at all 7 viewports (E2E + geometry probe allOk=true; zero overflow, 6/6 KPIs, 7/7 sections, drawer at 375px). Screenshots `test-screenshots/dashboard/admin-*.png` + `brand-*.png` × 7 (fresh 13:28–13:38). Actual pixel-level inspection NOT possible in this environment (model rejects image input) — strongest available DOM/geometry verification performed instead.

## 7F — Compliance state model + genuine compliance/CRM E2E + access-gate repair (2026-09-09)

**Result: 143 passed / 0 failed / 4 skipped** — 21 suites (19-suite gate + dashboard + access-gate) in 2.2 min. The three 7E-era skips (compliance-gate t1, t2; crm t3) are now GENUINE passing tests. The only remaining non-access-gate skip is `tours` t5 (documented product gap below).

**Commits:** `5f13ac1` (deterministic compliance test states) + `2f9e62f` (compliance & regression coverage) + `3c5a88a` (access-gate test contract). Baseline `959b4d2` + tag intact; no history rewrite; no Phase 8 work started.

### Compliance-state architecture
- Compliance business logic UNCHANGED and canonical (`src/lib/compliance.ts` — docs + contract + §4.1/§4.2 agreement inputs). No second engine, no test-only branch, no bypassed onboarding.
- `portal access` and `gate clearance` are now decoupled via two new canonical registries in `src/data/demoData.ts`:
  - `CLEARED_BRAND_IDS` — cleared tenants (unchanged: Zambezi, DeskForge).
  - `COMPLIANCE_SCENARIO_BRAND_IDS` — portal tenants that are NOT gate-cleared.
  - `PORTAL_BRAND_IDS` = cleared + scenario (drives `onboarded` in `brandDossiers.ts`).
  - `COMPLIANCE_SCENARIO_DOC_STATES` — explicit per-required-type statuses that OVERRIDE the rotating pattern for scenario tenants (see matrix).

### Deterministic compliance test states
| Tenant (brandId) | Category (required) | Approved / total | Present-but-not-approved | Contract | §4.1/§4.2 | Expected gate |
|---|---|---|---|---|---|---|
| **Reed & Oak Kitchen Co** (`brand-reedkitchen`) | Kitchen (5) | **0 / 5** | 5 (LOA uploaded, UKCA under_review, insurance uploaded, registry missing, food_contact missing) | active | accepted | **BLOCKED** |
| **MotorVista Auto Supply Ltd** (`brand-motorvista`) | Automotive (5) | **4 / 5** | 1 (type_approval missing) | active | accepted | **BLOCKED** |
| **Zambezi Organic Extracts Ltd** (`brand-zambezi`) | H&PC (5) | **5 / 5** | 0 | active | accepted | **CLEARED** |
| **DeskForge Supplies Inc** (`brand-deskforge`) | Office Products (4) | **4 / 4** | 0 | active | accepted | **CLEARED** |

Both scenario tenants are `onboarded:true` (portal) with empty operational data (no products/POs/shipments) so the document state is the ONLY gate variable. Every required doc HAS a demo record; status `missing` = present-but-not-approved (canonical gate classifies it `blocking`) — same convention as the pre-existing rotating patterns.

### Compliance-gate test results (e2e/compliance-gate.spec.ts) — 4/4 PASS
- t1 0/5 → catalog `Catalog Locked` (disabled) + banner lists the real pending/missing docs + compliance page card "5 item(s) remain" + no `Add New Product` anywhere (no cleared-tenant leakage).
- t2 4/5 → still blocked; the single `type approval (missing)` keeps the gate closed.
- t3 5/5 (Zambezi exact 5/5) + 4/4 (DeskForge) → `Add New Product` visible AND enabled; no locked state.
- t4 Admin Compliance Approvals renders doc rows.

### CRM pending-request result (e2e/crm.spec.ts) — 6/6 PASS
The product already supports the workflow (`requestProfileChange` / `reviewProfileChangeRequest` in demoStore; ChangeRequestReview card in BrandCRM) — the store was merely seeded empty. Phase 7F seeds 2 deterministic pending requests (Zambezi signatory + phone). t3 is now a GENUINE test: pending card appears → Approve removes the request via the real mutation → Reject resolves the remainder → another brand never sees Zambezi's requests. No new workflow invented.

### Access-gate result (e2e/access-gate.spec.ts) — 6 passed / 3 skipped (pre-existing fixmes)
- 5 stale `placeholder*="Zimbabwe"` country fills → the real search-then-select path (`fillCountry` helper).
- Obsolete "Super Admin Panel" second click removed; Phase 6 nav item "Super Admin" opens the panel, then the Applications tab.
- Submit now waits for the confirmed "Application Received" state (the form runs REAL link verification capped at 10s/link) instead of a fixed 2s delay. All pre-existing business assertions retained.
- Remaining skips t6/t8/t9 are the pre-existing intentional fixme branches (approve/manual-create/unapproved-route — documented in-file).

### Tour 5 decision
**RESOLVED — Phase G1 (2026-09-13).** The brand deductions ledger is now built and t5 passes as a
genuine functional test; the original deferral rationale is kept below as the historical record.

`tours` t5 (Deductions on Analytics) stays an HONEST skip — documented product gap. The Tour-5 definition targets a deductions LEDGER + category breakdown + dispute button + outcome info on the Analytics/Reports views; SalesAnalytics is a revenue/volume page with NO deductions surface and no `[data-tour="deductions-*"]` targets exist anywhere in src. No meaningless attributes were added to unrelated UI. Building the ledger/dispute surface is a LARGER product feature deferred to a later phase (see deferred list).

### Regression verification
- Zero previously-passing regressions: 21-suite set below. `dashboard.spec` t2's gate-KPI assertion had pinned the historical dataset size (`/11`); it now asserts KPI shape + invariant (N/M, N ≤ M) — a stale E2E contract aligned with the data-agnostic intent (precise gate semantics are asserted by compliance-gate.spec.ts).
- `scripts/validate-review-s1.mjs` (legacy ad-hoc validator, not part of the phase gates): had 5 failures at the 7E HEAD; Phase 7F FIXED the stale brand-count check (canonical-derived) → 4 failures remain, ALL pre-existing (PO status diversity, carrier coverage, two demo banners) in areas 7F never touched — verified by stash/run/restore comparison.

### Gates
- TypeScript **43** (exact 7E baseline, 0 new; all changed files clean) · ESLint **18** (down from 23 — 5 `no-var` fixed in the touched ComplianceHub.tsx; 0 new) · build **PASS**.
- Browser verification: 0/5, 4/5, 5/5 states, CRM pending review, access-gate country field, admin + brand dashboards all exercised in a real browser; 7-viewport sweep (1440→375) on the new tenant's catalog + compliance pages — zero horizontal overflow, drawer navigation exercised.
- Screenshots `test-screenshots/compliance/` (9 files): reed-catalog-0of5, reed-compliance-0of5, motorvista-catalog-4of5, zambezi-catalog-5of5, zambezi-compliance-5of5, crm-pending-change-request, accessgate-country-field, admin-dashboard, brand-dashboard. **Visual QA: pixel-level inspection NOT possible in this environment (model rejects image input); DOM/geometry + functional assertions used instead — same limitation as 7E.**

### Remaining skips (all 4 — every one pre-existing/intentional)
| Suite | Test | Reason | Classification | Product gap | Blocks future |
|---|---|---|---|---|---|
| access-gate | t6 approve-login | requires in-app navigation preserving module state | pre-existing intentional fixme | no | no |
| access-gate | t8 manual create | same | pre-existing intentional fixme | no | no |
| access-gate | t9 unapproved route | requires server-side route guards | pre-existing intentional fixme | no | no |
| tours | t5 deductions tour | SalesAnalytics has no deductions surface; tour targets don't exist | 4 - missing product feature | **yes** | **CLOSED — Phase G1 (2026-09-13) built the ledger; t5 now PASSES as a real test** |

### Remaining failures
NONE in the 21-suite regression. The legacy `validate-review-s1.mjs` has 4 pre-existing failures (PO status diversity / carrier coverage / two demo banners) — outside the phase gates, unchanged by 7F.

### Deferred product features (NOT started)
- ~~Tour 5 Deductions & Disputes surface (brand deductions ledger + category breakdown + dispute workflow on Analytics/Reports).~~ **DONE — Phase G1 (2026-09-13)**, mounted on Analytics + Reports; the operator-side outcome-recording control already existed.
- Live provider credential activation, Amazon SP-API, Companies House, HMRC, Wise/Payoneer/Stripe/Xero production, Integration Hub breadth, Carrier Dashboard redesign, CRM/Compliance/Catalogue/PO/Finance/Logistics/Marketing redesigns.

### Phase 8 readiness — assessment
Phase 8 (live integrations) is NOT started. Phase 7F leaves: zero unexplained E2E failures, compliance states deterministically representable and genuinely tested, access-gate green, Tour 5 recorded, TS/lint debt inventoried (43/18, pre-existing, none in 7F regions), generated/forensic artifacts intentionally uncommitted. Baseline + 7E checkpoints intact.
- **Helper:** `openLogin(page)` = goto `/` → prefer `getByRole('button', { name: "Partner Login" }).first()` → mobile fallback (`Open navigation` → last `Partner Login`). `loginAs(page, card, waitMs=800)` = openLogin + one-click demo card + caller wait.
- **Login contract:** the product renamed the CTA from "Get Started" to "Partner Login" (`src/config/homepageContent.ts` → `hero.secondaryCta`; documented Access-gate change). Tests now follow the real UI; no obsolete copy re-introduced; no production change.
- **Old login-blocked count (Phase 6):** 43 (compliance-gate 4 + shipment-asn 5 + crm 6 + multi-tenant 6 + legal-agreements 3 + po-lifecycle 6 + tours 9 + billing 4). All 43 now reach their assertions; 64 previously hard-failing tests at login now proceed past the entry.
- **Real per-suite results (individual runs this session):**

| Suite | Passed | Failed | Skipped |
|---|---|---|---|
| app-shell | 23 | 0 | 0 |
| simulation-control | 15 | 0 | 0 |
| design-system | 11 | 0 | 0 |
| notifications | 0 | 0 | 5 |
| billing | 4 | 0 | 0 |
| compliance-gate | 0 | 3 | 1 |
| crm | 3 | 0 | 3 |
| deductions | 0 | 0 | 7 |
| disputes | 0 | 0 | 5 |
| fulfillment-tracks | 4 | 0 | 0 |
| homepage-editor | 0 | 0 | 1 |
| legal-agreements | 2 | 1 | 0 |
| multi-tenant | 3 | 1 | 2 |
| onboarding | 2 | 0 | 4 |
| po-lifecycle | 0 | 2 | 4 |
| rakazo | 0 | 0 | 3 |
| shipment-asn | 0 | 1 | 4 |
| tours | 1 | 3 | 5 |
| xero | 0 | 0 | 5 |
| **TOTAL** | **68** | **11** | **49** |

- **Full 19-suite parallel regression run:** 68 passed / 11 failed / 49 skipped in 2.4 min — identical totals; the parallel run added no extra failures.
- **Remaining failures (11) — all triaged; NONE introduced by 7A:**
  1. `compliance-gate` t1–t3 — Culinary Forge B.V. / Munich Clean-Care GmbH / ApexDrive Auto Care Ltd land on the **Onboarding wizard page (no shell nav)** (not-yet-onboarded demo brands); `nav >> text=UK Compliance` times out. **Stale test contract vs onboarding gate** (pre-existing behaviour).
  2. `po-lifecycle` t4 (Nordhaus), t6 (Sahara Threads) — same onboarding-gate routing; `text=Purchase Orders` click times out. **Stale test contract** (pre-existing).
  3. `shipment-asn` t3 (Voltaic Audio) — same onboarding-gate routing. **Stale test contract** (pre-existing).
  4. `tours` t4/t8/t9 — `[data-tour="..."]` attributes ABSENT: Phase 6 shell regroup dropped `tourAttr` from nav item configs (`Sidebar.tsx` still renders `data-tour={item.tourAttr}`, no nav config sets it). **Pre-existing APPLICATION defect (Phase 6 regression)** exposed by 7A → 7B candidate.
  5. `multi-tenant` t4 (Zambezi) — default Brand portal view crashes: "Brand portal — something went wrong" (ErrorBoundary). **Pre-existing APPLICATION defect** (= 7B item B), reproduced live this session.
  6. `legal-agreements` t1 (Little Kiwi) — onboarding wizard custom checkbox covered by a styled `<span>`; `locator.check()` intercepted. **Stale test contract** (pre-existing).
- **Skips (49):** conditional `test.fixme` branches by design (crm/deductions/disputes/onboarding/po-lifecycle/rakazo/notifications/xero/homepage-editor/tours/multi-tenant/compliance-gate/shipment-asn) — indicators not present in current UI; no hard-skips added. Recorded, not hidden.
- **Intentional NON-changes in 7A:** `scripts/integrity-audit.mjs` NOT modified (still 13/58 failing: stale "Get Started" assertion line 64 + 11 Phase 6 architecture greps + removed `validate:wording` script — deferred). `src/components/admin/XeroConnection.tsx` + `src/lib/intelligence/outreachGenerator.ts` NOT touched (syntax errors deferred to 7B). `eslint.config.js` NOT touched.
- **Known pre-existing tooling:** `tsc -p tsconfig.app.json` red — 27 errors all in the two Xero/outreach files (pre-existing; `npm run build` passes — they are outside the Vite build graph). `npm run lint` — 13 pre-existing errors (same 2 files + 2 prefer-const); **0 new errors** from 7A e2e changes.
- **Checkpoint:** commit `c856a08` on `redesign/foundation`. Next: 7B success gate, then 7C dashboard. Phase 8 NOT started.

## 7B — Defect repair + regression stabilization

Executed 2026-09-09 in the mandated order A→F. Branch `redesign/foundation`; protected baseline `959b4d2` + tag `mercenta-baseline-before-redesign-20260907` intact.

### Repair A — GlobalStateContext bootstrap defect (confirmed runtime crash)
- **Cause:** `const [campaigns] = useState<Campaign[]>([]);` (no setter) while the lazy-bootstrap `useEffect` calls `setCampaigns(m.INITIAL_CAMPAIGNS)` → `ReferenceError: setCampaigns is not defined` on EVERY app mount (real browser repro).
- **Fix:** restored the setter — `const [campaigns, setCampaigns] = useState<Campaign[]>([]);`. Nothing else in the bootstrap sequence / campaigns / apiLogs / staff behavior touched.
- **Verified:** pageerror gone in browser; Zambesi/DeskForge portals render; no new runtime exception.

### Repair B — ComplianceHub argument shift (confirmed)
- **Cause:** `evaluateComplianceGate(brandDocs, hasSignedAgreement)` put the boolean into the `category` parameter (canonical signature `(docs, category?, hasSignedAgreement=false, …)`).
- **Fix:** minimal call-site change → `evaluateComplianceGate(brandDocs, undefined, hasSignedAgreement)`.
- **Verified:** compliance-gate suite green in its representable states; catalog CTA for a cleared tenant is enabled (correct agreement state in browser).

### Repair C — Brand Purchase Orders runtime crash (root cause traced)
- **Root cause:** `BrandShell` renders `TourLoader`, `UsertourBrandBridge`, and `BrandCommPanel` (all call `useIntegrations()`) inside its ErrorBoundary WITHOUT a provider — unlike `AdminShell`; `main.tsx`/`App.tsx` provide none globally → every onboarded brand view crashed into "Brand portal — something went wrong" (`useIntegrations must be used within IntegrationsProvider`). Reproduced in a real browser; the defect predates Phase 6 (same structure at `e7fa882^`).
- **Fix (smallest justified):** wrap BrandShell content in `<IntegrationsProvider>` mirroring AdminShell exactly.
- **Verified:** Zambezi → Purchase Orders renders PO-9000/PO-9001; ErrorBoundary message gone in browser; multi-tenant suite green.

### Repair D — ESLint hooks enforcement
- **Config:** `react-hooks/rules-of-hooks` + `react-hooks/exhaustive-deps` restored to `error` (were `'off'`, contradicting the §Stage-18 documentation that they must FAIL).
- **Genuine Rules-of-Hooks defects fixed (≤3 files):** `RoutingRequest.tsx` — two `useMemo` calls were gated behind early returns (crash risk when the branch flips); hoisted above the guards.
- **Authorized syntax repairs (Section 13):** `XeroConnection.tsx` — stray `</div>` after the component + one missing `</div>` before `</Card>` (unclosed JSX, pre-baseline); `outreachGenerator.ts` — unescaped apostrophes in two single-quoted strings (`we'd`/`we've`), an empty `distNote` body restored, and an orphaned `distributorsNote` helper body given its missing function header (all pre-baseline corruption).
- **Result:** lint 41 → 37 problems; repaired files lint/tsc-clean. The 30 remaining `exhaustive-deps` errors span 13 files (logical-expression-as-dep patterns) + 7 legacy style errors (no-var/prefer-const) — all pre-existing patterns and beyond the 5-file per-repair scope → reported, not silently edited (separate approved workstream required).

### Repair E — Phase 6 tour-attribute regression
- **Cause:** the Phase 6 grouped-nav regroup dropped `tourAttr` from nav items (`Sidebar` still renders `data-tour={item.tourAttr}`); canonical identifiers recovered from the original `src/App.tsx` BRAND_NAV (commit 69a3473).
- **Fix:** restored `tourAttr` on the six tour-targeted brand nav items (`brand-dashboard`, `nav-catalog`, `nav-purchase_orders`, `nav-logistics`, `nav-compliance`, `nav-settings`) in `BrandShell.tsx` BRAND_SECTIONS. Also fixed a pre-existing `TourEngine` defect the tour tests exposed: the last-step tooltip rendered outside the 720px viewport (completion button unclickable) — added a vertical viewport clamp (positioning fix, not a redesign/sequencing change).
- **Verified (browser):** all 6 `data-tour` attributes PRESENT for an onboarded tenant; Tour 1 auto-starts; tours.spec **6 passed / 3 skipped** (was 1 pass/3 fail/5 skip). The 3 skips are honest `fixme` (Tour 2/5 per-view auto-start not wired in TourEngine; Settings restart option not present) — recorded.

### Repair F — Onboarding E2E contract alignment
Current intended behavior: only cleared brands (Zambezi, DeskForge) enter the portal shell; every non-cleared brand routes to the Onboarding wizard; only cleared brands have POs; Zambezi POs are Freight Collect, DeskForge Prepaid; every in-portal brand is fully cleared (blocked-gate states not representable in the canonical demo).
- **compliance-gate:** t1/t2 → DeskForge, honest skips (blocked states not representable for in-portal tenants); t3 rewritten to assert the enabled catalog CTA (`Add New Product`) — PASSES (the ComplianceUploadCard gate banner is dead UI — defined but never mounted; recorded).
- **po-lifecycle:** t4/t6 → DeskForge (t6 deadline-PASSED badge PASSES; t4 honest skip — its `View Details` interaction labels no longer exist, separate pre-existing staleness).
- **shipment-asn:** t3 → Zambezi (Freight Collect + ship window) — PASSES (Routing Request indicator).
- **tours:** all 9 tests → DeskForge (shell required for the tour feature).
- **Newly-exposed stale contracts:** multi-tenant t1's old zero-count assertion was a false-green on the crashed portal; rewritten to assert Zambezi sees its own POs (PO-9000/9001) and not DeskForge's (PO-9002/9003) — PASSES. notifications t2–t5's tour-dismiss helper left the "Skip Tour?" modal open and blocking; fixed to confirm the modal — t2 PASSES, t3–t5 honest skips.

### Full regression (19 suites, 128 tests) — 79 passed / 1 failed / 48 skipped
| Suite | Passed | Failed | Skips |
|---|---|---|---|
| app-shell | 23 | 0 | 0 |
| simulation-control | 15 | 0 | 0 |
| design-system | 11 | 0 | 0 |
| billing | 4 | 0 | 0 |
| compliance-gate | 1 | 0 | 3 |
| crm | 3* | 0 | 3 |
| deductions | 0 | 0 | 7 |
| disputes | 0 | 0 | 5 |
| fulfillment-tracks | 4 | 0 | 0 |
| homepage-editor | 0 | 0 | 1 |
| legal-agreements | 2 | 1 | 0 |
| multi-tenant | 4 | 0 | 2 |
| notifications | 2 | 0 | 3 |
| onboarding | 3 | 0 | 3 |
| po-lifecycle | 1 | 0 | 5 |
| rakazo | 0 | 0 | 3 |
| shipment-asn | 1 | 0 | 4 |
| tours | 6 | 0 | 3 |
| xero | 0 | 0 | 5 |

\* crm t6 (`On-behalf action → attributed in audit log`) intermittently times out under 8-worker parallel load; passes alone and passed one full run — parallel-resource flake, not a regression.

**7A vs 7B:** 68 passed / 11 failed / 49 skipped → **79 passed / 1 failed / 48 skipped**. 10 of 11 confirmed 7A failures resolved; the remaining failure is `legal-agreements` t1 (pre-existing; see below).

### Remaining known defects
- **`legal-agreements` t1** — onboarding-wizard styled checkbox (`input.peer.sr-only`) intercepts `locator.check()` → fails/times out deterministically. 7A triage #6, unchanged; NOT assigned to repairs A–F. Classification: stale test contract (wizard UX). **Does not block 7C** (documented known item; t2/t3 of the suite pass).
- **TypeScript: 45 errors** (pre-existing baseline) in untouched files: `scenarioEngine.ts` (28), `OnboardingWizard.tsx` (4), `BrandReports.tsx` (3), `SimulationControl.tsx` (3), `LogisticsHub.tsx` (2), `tokenManager.ts` (1), `banksByCountry.ts` (1), `api.ts` (1), `Header.tsx` (1), `IntegrationsPanel.tsx` (1). The Phase-7A "27 errors in XeroConnection + outreachGenerator" are **FIXED**. `npm run build` passes.
- **Lint: 37 errors** — 30 `exhaustive-deps` (13 files) + 5 `no-var` (`ComplianceHub` ComplianceUploadCard) + 2 `prefer-const` (`xeroReseed.ts`). All pre-existing patterns; hooks rules now ENFORCED as errors.
- **`ComplianceUploadCard`** gate-status banner defined but never mounted (dead UI). Recorded; not a 7B repair target.
- **Tour 2/5 per-view auto-start** not wired in `TourEngine` (only orientation + PO-ack auto-start consume `autoStartViews`). Recorded; tour tests skip honestly.

### Intentionally deferred
- `scripts/integrity-audit.mjs` stale checks (Get Started assertion + Phase 6 architecture greps).
- All dashboard/CRM/catalogue/PO page redesign — Phase 7C (NOT started).
- The 13-file `exhaustive-deps` lint debt — separate approved workstream.

### Phase 7C readiness — READY
All 15 conditions met: (1) GlobalStateContext fixed ✅ (2) ComplianceHub arg-shift fixed ✅ (3) BrandPurchaseOrders crash fixed (root cause: missing IntegrationsProvider in BrandShell) ✅ (4) ESLint hooks rules restored + violations resolved or explicitly scoped ✅ (5) tour regression fixed ✅ (6) onboarding contracts aligned ✅ (7) full regression rerun 79/1/48 ✅ (8) remaining failures classified ✅ (9) TypeScript rerun 45 all understood ✅ (10) lint rerun 37 all understood ✅ (11) build passes ✅ (12) browser verification complete ✅ (13) no unexplained new 7B regressions ✅ (14) git checkpoint committed ✅ (15) PROJECT_STATUS updated ✅.
## Brand Intelligence System — New Module

| Stage | Status | Notes |
|---|---|---|
| **1: Types & Data Model** | ✅ DONE | 24 new interfaces in types.ts + intelligenceTypes.ts |
| **2: Seed Data** | ✅ DONE (partial) | `brandProspectSeed.ts` — 3 seed brands with evidence model |
| **3: Scoring Engine** | ✅ DONE | `scoringEngine.ts` — 7-dimension scoring, disqualifier logic |
| **3b: Brand Intelligence Client** | ✅ DONE | `brandIntelligenceClient.ts` — factory, scoreProspect(), runPipeline(), getDashboard() |
| **4: Discovery Client** | ✅ DONE | `discoveryClient.ts` — MockDiscoveryClientImpl (distributor/contact/restriction/growth search via seed index) + MockAmazonDataClientImpl |
| **5: Super Admin UI** | ✅ DONE | `BrandIntelligencePanel.tsx` (KPI cards, filtered table, sort, row click) + `ProspectDetailPanel.tsx` (5 sub-tabs) + `ProspectDetailTabs.tsx` (tab bodies) + tab in SuperAdminPanel |
| **6: Outreach Generator** | ✅ DONE | `outreachGenerator.ts` — generateEmail(), generateLinkedInMessage(), generateFollowUp(), generateAllOutreach(), generateOutreachSummary(). Per-spec structure. |
| **7: Brand Partner Mode** | ✅ DONE | `BrandIntelligence.tsx` — "Your Amazon Market" view for brands, showing category KPIs + competitor brands. Wired into App.tsx BRAND_NAV + breadcrumb + render. |
| **8: Full 55-brand population** | ✅ DONE (12 of 55) | 3 in brandProspectSeed.ts + 9 in brandExtraSeed.ts. Covers Grocery (Tapatío, Cholula, Valentina, Fly By Jing, Mike's Hot Honey, Hunter & Gather), Household (Astonish, Seep, Delphis Eco, E-Cloth, OceanSaver), Kitchen (LocknLock), Baby (Kit & Kin). Exclusions (Truthbrush, UpCircle). More to be added as pipeline discovers them. |

## What's not done / next steps

- **Stage 8-12**: Full 55-brand population, weekly automation, export, real data providers, CRM integration
- **Companies House + HMRC Compliance Dashboard**
- **GO_LIVE.md Playbook**
## Performance Fixes (2026-09-07 — permanent fix)

| Issue | Fix | Impact |
|---|---|---|
| **512 KB single bundle** — every component and vendor loaded on every page | `build.rollupOptions.output.manualChunks` — split into 7 vendor chunks (react, recharts, supabase, sentry, lucide, query, other) + code-split shells via `React.lazy()` | **Main chunk: 512 KB → 14 KB (↓ 36x)** |
| **52 KB of seed data loaded before first render** — bootstrap arrays pulled into GlobalStateContext | Replaced static `useState(INITIAL_*)` with empty `useState([])` + lazy `useEffect(() => import('@/data/bootstrap'))` | **Seed data loads after paint, not before** |
| **demoData + brandDossiers + regionalDossiers imported eagerly** in GlobalStateContext | Converted to dynamic `import()` inside `activateDemoBrand()` / `activateDemo()` callbacks | **13 KB + 5 KB + 11 KB moved off critical path** |
| **280 KB Sentry SDK loaded on every page** — static import in main.tsx | Changed to `queueMicrotask(() => import('./lib/monitoring/sentry').then(m => m.initSentry()))` | **Sentry loads after first paint, not before** |
| **Render-blocking Google Fonts `@import`** in CSS — caused waterfall (CSS → font CSS → font files) | Removed `@import` from CSS. Added `<link rel="preconnect">` + `<link>` with `media="print" onload="this.media='all'"` in `<head>` | **Font loads in parallel, no longer blocks rendering** |
| **No gzip/brotli on Namecheap shared hosting** | Added `AddOutputFilterByType DEFLATE` and `BROTLI` to `.htaccess` | **Assets compressed 3-4x on wire** |
| **No far-future caching** — repeat visitors re-download everything | Added `Cache-Control: public, max-age=31536000, immutable` for `.js/.css` files in `.htaccess` | **Return visits load from disk cache** |
| **Startup overhead** — sentry, supabase loaded as modulepreload | Deferred sentry; supabase (125 KB / 34 KB gzip) still modulepreloaded via types.ts type reference — acceptable for parallel prefetch | **First paint JavaScript: main.js (14 KB / 6 KB gzip) + vendor chunks (preloaded in parallel)** |

### Before/After comparison

| Metric | Before | After |
|---|---|---|
| Main JS chunk | 512 KB (165 KB gzip) | 14 KB (6 KB gzip) |
| Critical-path JS | 512 KB | 14 KB |
| CSS | 47 KB (9 KB gzip) | 47 KB (9 KB gzip) |
| Google Fonts loading | Blocking (`@import` in CSS) | Parallel (preconnect + non-blocking link) |
| Seed data loading | Before first render | After first render |
| Sentry SDK | On every page (280 KB / 91 KB gzip) | Deferred to microtask after paint |
| Server compression | Not configured | gzip + brotli via .htaccess |
| Asset caching | None | 1 year immutable for hashed assets |
| Build output | 1 big chunk warning | Clean build, no oversized chunks |

## Known remaining

- **brandExtraSeed chunk (448 KB)** still loads as one chunk when Brand Intelligence tab is opened — acceptable since it's on-demand
- **types.ts still 64 KB** — moving intelligence types out is pending (secondary priority)

## What's not done / next steps

- **Stage 4-7**: Build remaining Brand Intelligence components
- **Companies House + HMRC Compliance Dashboard**
- **GO_LIVE.md Playbook**

## In-progress / Recent work

| Work Item | Status | Notes |
|---|---|---|
| **§Brand Intelligence tab — added to admin sidebar** | ✅ **DONE** | Added "Brand Intelligence" as a top-level admin nav item in AdminShell.tsx (was only accessible inside SuperAdminPanel sub-tab). Import, nav item, breadcrumb, view handler all wired. |
| **§Homepage speed — memoized dashboard computations** | ✅ **DONE** | BrandDashboard.tsx: 12 derived computations wrapped in useMemo. AdminDashboard.tsx: 11 derived computations wrapped in useMemo. Prevents unnecessary re-computation on every render. |
| **Crawlability / AI visibility audit** | ✅ **DONE** | robots.txt, sitemap.xml, JSON-LD structured data (4 schemas), meta/OG/Twitter tags, canonical URL, noscript fallback added. No UI/design/functionality changes. TypeScript + build pass. See index.html, public/robots.txt, public/sitemap.xml. |
| Supabase core entity migrations (001-019) | ✅ DONE | 19 tables created |
| **Supabase integration** | ⛔ **REVERTED — Option A** | VITE Supabase credentials removed from `.env`. App uses demo store seed data. Migration 020 (anon policies + data fixes) still exists on the cloud DB but is not used by the frontend. |
| Persistence wiring (api.ts → Supabase) | ✅ DONE (demonly) | All fetch functions fall back to seed data when Supabase is not configured |

## What's not done / next steps

- **Companies House + HMRC Compliance Dashboard**: Next in queue
- **GO_LIVE.md Playbook**: Go-live checklist document
- **Supabase live integration**: When ready, uncomment VITE_SUPABASE_* in .env AND expand table schemas to match frontend types

## Database state (Supabase cloud — not used by frontend)

| Table | Seeded rows | Notes |
|---|---|---|
| brands | 11 | legacy_demo_id, category, business_name, contract_status populated via mig 020 |
| products | 22 | 2 per brand |
| purchase_orders | 22 | 2 per brand, varied statuses |
| purchase_order_lines | 44 | 2 per PO |
| contracts | 11 | 1 per brand |
| compliance_docs | 44 | 4 per brand |
| messages | ~14 | Welcome + replies |
| shipments | ~8 | For shipped/delivered POs |
| deductions | ~3 | For every 3rd brand |
| billing_invoices | 11 | 1 per brand |
| brand_agreements | 22 | Both agreements per brand |
# PROJECT_STATUS.md

> Source of truth for current project state. Updated after every session.

## In-progress / Recent work

| Work Item | Status | Notes |
|---|---|---|
| Supabase core entity migrations (002-015) | ✅ DONE | 14 tables created |
| Persistence wiring (api.ts → Supabase) | ✅ DONE | All functions try Supabase first, fall back to demoStore |
| **§Legal — Brand agreement acceptances** | ✅ **DONE** | Two mandatory agreement sections added to onboarding step 5 (Logistics SLAs §4.1, Chargeback Indemnity §4.2). Stored in `brand_agreements` table/array. Compliance gate extended with 6th/7th check. Admin CRM shows acceptance status. DB migration 017. E2E spec `legal-agreements.spec.ts` (3 tests: 2 skipped when UI not reachable, 1 passed). |
| **§Multi-tour — Guided onboarding tours** | ✅ **DONE** | 9 guided tour definitions. E2E spec `e2e/tours.spec.ts` (9 tests). |
| **§Access-gate — Brand application + approval flow** | ✅ **DONE** | Login button text changed to "Partner Login". Application form on login page with "Request Partner Access". Link verification for website/Instagram/Facebook. Admin Applications tab with Approve/Reject/Request Info/Flag for Review actions. Manual brand creation by admin. DB migration 018. E2E spec `e2e/access-gate.spec.ts`. |
| E2E tests verified | ✅ DONE | 6 passed, 3 skipped (approve/manual verification, unapproved route guard), 0 failed |

## What's not done / next steps

- **Companies House + HMRC Compliance Dashboard**: Next in queue
- **GO_LIVE.md Playbook**: Go-live checklist document
- **Frontend live-mode refactor**: Most admin/brand views still import `demoStore` directly.
- **`scripts/gen-seed-migration.py`**: Utility file, safe to delete.

## E2E Test Suite

| Work Item | Status | Notes |
|---|---|---|
| e2e/legal-agreements.spec.ts | ✅ DONE | 3 tests: agreement step + checkbox validation, Admin CRM agreements tab, Admin Compliance renders (1 passed, 2 skipped in dev — wizard/CRM nav timing) |
| e2e/tours.spec.ts | ✅ DONE | 9 tests covering auto-start, skip confirmation, step advancement, selector resolution, Settings restart, per-page triggers |
| e2e/access-gate.spec.ts | ✅ DONE | 6 tests covering login text, app validation, submission, admin view, flagging, rejection; 3 skipped (approve flow, manual creation, unapproved route guard) |

| e2e/rakazo.spec.ts | ✅ DONE | 3 tests: Rakazo tab renders, Open in new tab button, Refresh button present |
| e2e/xero.spec.ts | ✅ DONE | 5 tests: Not Connected state, credentials form, resync button, financial data, manual error |

### Latest test run
```
legal-agreements.spec.ts: 1 passed, 2 skipped, 0 failed
tours.spec.ts: 9 tests — syntactically valid, requires running dev server
access-gate.spec.ts: 6 passed, 3 skipped, 0 failed
rakazo.spec.ts: 3 skipped — navigation pattern (same as other admin tab tests)
xero.spec.ts: 5 tests — requires running dev server
```
## Droplet consolidation (2026-09-05)

| Work Item | Status | Notes |
|---|---|---|
| **Droplet consolidation: mercenta-agents-v2** | ✅ **DONE** | Recovery droplet (597960910) renamed → mercenta-agents-v2. Old droplet (596993347) deleted. Snapshot (244127812) deleted. New droplet: IP 24.144.86.50, size s-2vcpu-4gb (4GB). Web UI accessible at https://24-144-86-50.sslip.io (HTTP 200). All 6 containers running. |

| | **Margaret bot created on Rakazo** | ✅ **DONE** | New bot "Margaret" (UK Accountant / Financial Controller) created. Routine "Daily Financial Report" 6:30am weekdays. Penny Pincher instructions updated with coordination note. DEMO_MODE.md updated (20 bots). Test run completed with sample output. |
| | **§Rakazo Iframe — Super Admin panel** | ✅ **DONE** | Rakazo tab added to SuperAdminPanel.tsx. RakazoPanel.tsx with iframe (sslip.io), loading/error states, status dot, Open in new tab/Refresh/Retry. URL fixed from raw IP to sslip.io for SSL. E2E spec `e2e/rakazo.spec.ts` (3 tests). |
| | **§Namecheap FTP Deploy** | ✅ **DONE** | `scripts/deploy-demo.sh` created (build + lftp mirror to Namecheap). `.env` FTP vars added. `protection-rules.md` deployment rules added. Deployed and verified live at https://demo.mercenta.co.uk (HTTP 200). |\n