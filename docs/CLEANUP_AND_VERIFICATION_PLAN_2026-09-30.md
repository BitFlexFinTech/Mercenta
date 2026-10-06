# CLEAN-UP, VERIFICATION AND "ONE SWITCH" PLAN — 2026-09-30

**Status:** **THE SINGLE PLAN OF RECORD (2026-10-02).** This file is the ONE plan — the former
`docs/NEXT_BUILD_PLAN_2026-09-27.md` is **MERGED INTO IT here (§6)** and reduced to a pointer at this file, so there
is exactly ONE plan and it cannot drift (exactly the rule this file already carried).

- **P0 IS DONE (2026-10-01)** — the whole loop is traced and printed by a real gate
  (`npm run validate:commerce-loop`, 30/30) and the owner's four questions are answered with output.
- **P0a and P1a are DONE (2026-10-02)** — the owner's `Products/` folder is **BACKED UP** and the standing folder
  rule recorded; the **Amazon vendor-code → category registry** exists as `src/config/amazonVendorCodes.ts` with its
  gate (`validate:amazon-vendor-codes`, 20/20). Both change no application runtime.
- **P1 IS DONE (2026-10-02).** The ONE SWITCH now exists (`src/config/environment.ts`), the data layer's seed fallback
  is demo-only, the provider-mode machine reads the owner, and the switch is operable in one obvious place —
  `npm run validate:environment` **16/16** proves it (mutation-proved).
- **P1-fix IS DONE (2026-10-02).** The DOWNLOAD CONTROL now exists (owner decision **D3 = print AND download**): each
  pack document downloads as its own file, the WHOLE pack downloads as one file, and the carrier label / waybill
  download from the dialogue that renders them. Proved by an executed gate (`validate:po-documents` **57/57**), a
  REPOINTED commerce-loop §6, and a browser run of `e2e/po-documents.spec.ts` (**10 passed**).
- **P2, P3 and P4 product work is DONE (2026-10-02); P5 is DEFERRED (owner D2); P6 (close) is executed in the
  same session as P4.** No OTHER product runtime code has been changed beyond P1, P1-fix, P2, P3 and P4.
  Every finding below was read from the code, with the file named so it can be checked.

**Owner:** Founder/Super Admin. **Owner decisions:** D1, D3 and D4 ANSWERED; D2 DEFERRED (skip P5 for now) — see §5.

---

## 0. HOW TO RESUME (a brand-new chat needs nothing else)

Type **"continue where you left off"**. A new session must then, in this order:

1. Read `.clinerules/operating-model.md`, `protection-rules.md`, `project-state-contract.md`,
   `mercenta-business-model.md`, `plain-english-responses.md`.
2. Read `PROJECT_STATUS.md` → **`CURRENT RESUME STATE`** (first screen only) — it points here.
3. Read **this file** — it is the authoritative plan and the task list.
4. `git --no-pager log --oneline -5` and `git status --porcelain`.
5. Start at the phase whose `STATUS` is not `DONE`, in order. Never skip P0.

**The plan is owned here, and only here.** The former `docs/NEXT_BUILD_PLAN_2026-09-27.md` was MERGED into this file
(§6) on 2026-10-02 and is now a pointer — there is exactly ONE plan. When a phase finishes, update ITS row in this
file (status + the evidence produced), then update `PROJECT_STATUS.md` + `HANDOFF.md`. Do not create a second plan.

---

## 0b. THE AGREED ORDER (2026-10-04, Founder-approved) — THE SINGLE EXECUTION ORDER

**The Founder settled the execution order on 2026-10-04** after a real confusion: the E2E coverage programme had
jumped ahead of work that had been recorded as "next". This section is now THE order; a resuming session follows it.

**A name collision was the root cause and is now FIXED.** This project used the label "Batch N" for THREE different
sets of work (the 2026-09-27 build plan; the integration / PO / Phase-3 work; and the E2E programme), so the resume
note and the roadmap section contradicted each other. The E2E programme is therefore RENAMED to its OWN label —
**E2E Coverage Programme: E2E-0 … E2E-8** — and the live state files no longer use "Batch" for it. History in
`STATUS_CHECK.md` is preserved verbatim, with a note.

| # | Order | Work | Status |
|---|---|---|---|
| 0 | **FIRST** | **Save the plan + fix the records** (this section; the E2E rename; ONE next task in the resume block) | DONE (2026-10-04) |
| 1 | **IN PROGRESS** | **PHASE 15 GO-LIVE CHECKLIST** — the launch gate (the Phase 15 rows in `requirements-registry.json`; `PRODUCTION_READINESS.md`). Gates blocked on an infrastructure / domain / Founder decision are marked BLOCKED with the exact missing input; the rest proceed. **§PHASE 15 (2026-10-05): the whole gate is now EXECUTABLE** — `scripts/validate-phase15-launch.mjs` (`npm run validate:phase15-launch`), one assertion group per gate, each PASS or BLOCKED-with-exact-input, repo-side **60/60**. 7/15 gates cleared; 8/15 BLOCKED on external input (named in `PRODUCTION_READINESS.md` §PHASE 15). Also done: a real custom 404, `.htaccess` security headers, `npm audit fix` 33 → 12. **§PHASE 15 (2026-10-05, follow-up): the third-party data inventory is now CODE** — `src/config/dataProcessing.ts` (the single owner) + `scripts/validate-data-inventory.mjs` (`validate:data-inventory`, 15 assertions) force every registered provider to be declared or excluded; the privacy policy's "who we share it with" now READS the owner. Still BLOCKED on legal sign-off. **§PHASE 15 (2026-10-05, 2nd follow-up): the `maplibre-gl` audit critical is RESOLVED** — the gate's "breaking upgrade + regression pass" description was FALSE (the package is declared-but-unused); it was moved onto a patched line (`5.24.0 → 6.12.0`, `npm audit` **0 critical**) and the gate now ASSERTS the patched line. Repo-side assertions **64/64**. **§PHASE 15 (2026-10-05, 3rd follow-up): the gate's OWN declared scope is now BUILT** — an API-exposure audit, health monitoring (an HONEST owner replacing a FABRICATED check), a no-debug-content / dev-endpoint audit, production email templates and a release procedure; 4 new gates, 4 real defects fixed at source, repo-side **68/68**. Phase 15's no-credential items are now genuinely exhausted → the next work is item 2. | IN PROGRESS |
| 2 | **IN PROGRESS** | **The remaining BUILD BACKLOG.** §6's leftovers are exhausted repo-side: **Batch 1** built and gated its server helpers (1b/1c DONE; only the *delivery* leg needs a Supabase credential/CLI — an activation step, never a build blocker), **Batch 2** is CLOSED except its evidence-blocked items, and **Batch 3** (3a/3b/3c) + **§OPTION-A** are DONE. The older phrase "**the two regressed rows**" was **STALE** — the registry holds **0** `regressed` rows (the two were removed on 2026-10-04); "**the tooling items**" named no list anywhere and is now dropped. **First concrete item BUILT (2026-10-05): the PUBLIC-ENDPOINT RATE LIMITER** — `supabase/functions/_shared/rateLimit.ts` (ONE owner, fixed-window + swappable store seam) is wired into ALL 14 Edge Functions after each CORS preflight branch and gated by `npm run validate:rate-limiting` (66 assertions, mutation-proved twice). Registry row `batch-4-rate-limiting` raised `not_started` → `built`; matrix item 16 corrected at source. **Second concrete item BUILT (2026-10-05): the HEALTH-CHECK + DAILY-DIGEST PAIR** — ONE shared readiness owner (`supabase/functions/_shared/readiness.ts`: pure `evaluateReadiness` + injected-transport `collectServerChecks`) is served by `health-check` and CALLED BY `daily-digest`, whose output INCLUDES the health result and a TRIAGE SUMMARY; both wired into the rate limiter (now **16** functions / **72** assertions) and gated by `npm run validate:health-digest` (**39 assertions**, mutation-proved twice). Registry row `batch10-health-check-digest` raised `not_started` → `built` (old value inline); the stale "(existing)" description corrected at source. `batch-4-zod-validation` was audited and found a **FALSE gap** (forms already validate through the canonical `REQUIRED_SUBMISSION_FIELDS` owner; adding zod would create a duplicate owner), so it is NOT the next build. **Third concrete item BUILT (2026-10-05): §OPERATOR-RELABEL** — the non-canonical role name "Mercenta operator" (T-3: the canonical human control role is **Founder / Super Admin**) was relabelled across 16 `src/` occurrences + 1 Edge Function (10 files) and gated by `npm run validate:operator-terminology` (10 assertions, mutation-proved twice); matrix D13-14 and the T-3 register row corrected at source. **Fourth concrete item BUILT (2026-10-05): §ADMIN-SHELL-CHUNK — THE ADMIN-SHELL BUNDLE FIXED AT THE ROOT** — the registry row `discovered-adminshell-chunk-size` recorded a REAL build-output defect (the single `AdminShell-*.js` chunk was **909 kB** because the shell eagerly imported all ~34 admin view panels, so every operator downloaded every panel to open any one of them). Every panel is now a `React.lazy(() => import(…))` dynamic import inside a `<Suspense>`, so the shell chunk is **16.92 kB** and a panel's chunk loads only when its view opens (`node_modules` stays in the ONE `vendor` chunk — the §P3 invariant); the SAME defect was found in `BrandShell` (~637 kB, 24 eager brand panels) and fixed in the same increment (**28.57 kB**). Gated by `npm run validate:admin-shell-bundle` (**17 assertions, covering BOTH portal shells**; proved able to fail on the pre-fix bundle AND mutation-proved). **Two STALE rows were reconciled at source in the same increment** — `cleanup-p8-inventory-asin` + `cleanup-p10-logistics-hub-completion` claimed the work had not begun and that no code existed, while the programme document §12/§14 and the code + gates record P8/P10 DONE. **Fifth concrete item BUILT (2026-10-05): §PHASE 13 — THE CLAIMS REGISTRY.** The roadmap row `phase13-claims-registry` recorded that Mercenta needed ONE GREEN / AMBER / RED governance index over every claim its outward-facing content may make; FOUR canonical claim-rule owners already existed (banned-patterns, amazonWording, positioning's public red lines, ukMarketFit's prohibited promises), each already gated, but nothing declared them together or classified them. `src/lib/compliance/claimsRegistry.ts` (**NEW**, the ONE owner — **12 classes: 8 RED / 3 AMBER / 1 GREEN**) re-implements NO rule: every class POINTS AT its canonical owner (module + symbol), so no second source of truth was created. It is USED in the product — `src/lib/discovery/engine.ts` now lints the acquisition outreach copy via `lintClaims(subject, 'acquisition')`, a strict superset of the old `lintOutwardWording` — and gated by NEW `npm run validate:claims-registry` (**22 assertions**; every class resolves to a real owner export, every RED example is caught by that owner, every AMBER qualifier is real and used by a surface, no canonical owner is left un-registered, the lint executes, and the gate is proved able to fail). Registry row `phase13-claims-registry` raised `not_started` → `built` (old value in `_audit_note`; `status_counts` built 145→146, not_started 37→36). `scripts/lint-wording.mjs` excludes the registry as a DEFINITIONS file (same class as `amazonWording.ts` — its examples must contain the channel name to TEST the owners), guarded by the new gate's section I (no component imports it). Surface declared in BOTH scope guards (`CLAIMS_REGISTRY_SCOPE` in E6; entries in E7). **Sixth concrete item BUILT (2026-10-05): §ACQ-CONVERSION — THE ACQUISITION CONVERSION MEASUREMENT.** The row `discovered-acquisition-conversion-measurement` recorded that the outbound system reported COUNTS but derived NO conversion rates, so the placement/list/copy diagnosis was impossible. `src/lib/acquisition/conversionMetrics.ts` (**NEW**, the ONE owner) derives the funnel ENTIRELY from the canonical stage machine — CONTACTED = stage ≥ follow_up (a SENT outreach; a DRAFT does not count), REPLIED = stage ≥ response, ENGAGED = stage ≥ meeting, CONVERTED = active_brand — so it adds NO new state and cannot contradict the canonical classifier; it reports reply / engagement / conversion / reply-to-engagement rates (a zero denominator yields `null`, never a misleading 0) plus segment breakdowns by category, source and owner. It is USED: `src/lib/commandCentre/controlCentre.ts` computes it, exposes `acquisitionConversion` and adds four rate metric cards, and `src/components/admin/FounderControlCentre.tsx` renders a Conversion section. Gated by NEW `npm run validate:acquisition-conversion` (**22 assertions**), mutation-proved (changing the contacted threshold follow_up → outreach fails 6 assertions; `conversionMetrics.ts` restored byte-identical, sha256 `f688f5524b0241ba6d79aa908d2412ed3bd92f079595ba9e543118be2d993839`). Registry row `discovered-acquisition-conversion-measurement` raised `not_started` → `built` (`status_counts` built 146→147, not_started 36→35). Surface declared in BOTH scope guards (`ACQ_CONVERSION_SCOPE` in E6; entries in E7). **Seventh concrete item BUILT (2026-10-05): §PHASE 6 — THE INTERNAL CAPITAL MODEL BEHIND MODEL B.** The row `phase6-capital-requirement-model` named an internal working-capital model that did not exist. `src/lib/finance/capitalRequirement.ts` (**NEW**, the ONE owner) is the single deterministic implementation — per purchase `advance = supplierCost × advanceRate`, `fee = advance × feePctPerTerm`, `repayment = advance + fee`, `grossSpread = receivable − supplierCost`, `netMargin = grossSpread − fee`, plus portfolio totals, facility utilisation, available-after (may be NEGATIVE — STATED, never clamped) and concentration-by-brand. It invents no figure: the facility terms come from the ONE config (`src/config/financing.ts`, `CAPITAL_FACILITY_CONFIGURED = false` + a LABELLED `DEMO_CAPITAL_FACILITY`, the same discipline as `src/config/vat.ts`) and the Model B acquisition economics are DERIVED from the canonical commercial-model owner. USED: `controlCentre.ts` derives it from the canonical Model B brand's purchase orders and exposes `capitalRequirement` (+ two finance metric cards); `FounderControlCentre.tsx` renders a **Capital requirement (Model B)** section (Super-Admin only — financing is internal; the gate asserts NO brand component imports the owner). Gated by NEW `npm run validate:capital-requirement` (mutation-proved), surface declared in BOTH scope guards (`CAPITAL_REQUIREMENT_SCOPE` in E6; entries in E7), registry row `not_started` → `built` (`status_counts` built 147→148, not_started 35→34). **Eighth concrete item BUILT (2026-10-05): §D21 — WHOLE-PLATFORM OBJECT RESOLUTION.** The master-matrix row D21 (§25 / §32 row 1) recorded the platform's largest open architectural gap: no single mechanism resolved an inbound channel object (Amazon PO number, invoice id, tracking number) to its Mercenta record, brand and tenant (grep for `resolveObject` / `externalObjectId` / `exceptionQueue` = 0 hits). `src/lib/resolution/objectResolution.ts` (**NEW**, the ONE resolver) is pure and deterministic over a caller-supplied index: a match on exactly one tenant resolves to the full chain `Amazon object → Mercenta object → brand → tenant`; NO match is the declared `unknown` outcome (never guessed); one channel id matching MORE THAN ONE tenant FAILS CLOSED to `cross_tenant` (never picks one — zero cross-tenant leakage). A `ResolutionLedger` gives platform-level REPLAY awareness (a re-delivered object returns the SAME chain, flagged `replay: true`) and `buildUnresolvedQueue` is the founder review queue the matrix recorded as non-existent. USED: `controlCentre.ts` builds the index from the canonical PO + consignment records and exposes `objectResolution` (+ two operations metric cards); `FounderControlCentre.tsx` renders an **Object resolution** section + review queue on the Operations view (Super-Admin only — the gate asserts NO brand component imports the resolver). Gated by NEW `npm run validate:object-resolution` (**32 assertions**), mutation-proved, surface declared in BOTH scope guards (`OBJECT_RESOLUTION_SCOPE` in E6; entries in E7), registry row `discovered-whole-platform-object-resolution` `not_started` → `built` (`status_counts` built 148→149, not_started 34→33); matrix D21-01…06 + §32 row 1 reconciled at source. HONEST LIMIT: the resolver and its Control Centre use are BUILT; reconciling EVERY existing module's own read model to the shared contract is the recorded follow-on. **Ninth concrete item BUILT (2026-10-05): §PHASE 6 — THE DETERMINISTIC FINANCING ROUTER (Phase 6's SECOND row; Phase 6 is now COMPLETE).** The row `phase6-financing-router-deterministic` recorded that financing eligibility + routing must be deterministic (no AI) and INTERNAL, and grep for `financingRouter` / `routeFinancing` / `financingEligib` found 0 hits. `src/lib/finance/financingRouter.ts` (**NEW**, the ONE owner) routes each Model B purchase to exactly ONE financing route (`self_funded` / `facility_draw` / `external_referral`) by **REUSING the canonical exclusive-gateway evaluator** (`src/lib/routing/gateways.ts → evaluateExclusiveGateway`) — no second engine, no AI, no clock — with a **fail-closed** refusal on a malformed configuration; `src/config/financingRouter.ts` (**NEW**, the ONE config) ships `FINANCING_ROUTING_CONFIGURED = false` + a LABELLED `DEMO_FINANCING_ROUTING`. USED: `controlCentre.ts` routes the canonical Model B purchase orders and exposes `financingRouting` (+ two finance metric cards); `FounderControlCentre.tsx` renders a **Financing routes (Model B)** section (Super-Admin only — the gate asserts NO brand component imports the router). Gated by NEW `npm run validate:financing-router` (**29 assertions**, mutation-proved TWICE), browser spec test 9, surface declared in BOTH scope guards (`FINANCING_ROUTER_SCOPE` in E6; entries in E7), registry row `not_started` → `built` (`status_counts` built 149→150, not_started 33→32); the row's STALE `docs — roadmap §PHASE 6` citation fixed at source. | IN PROGRESS (2026-10-05) |
| 3 | after 2 | **The E2E COVERAGE PROGRAMME (E2E-2 onward)** — PAUSED, not deleted. Resume at the next domain (onboarding+acquisition · PO+documents · shipment+logistics+Delta+returns · finance · compliance · operations · integrations · founder). | PAUSED (E2E-0, E2E-1 done) |
| 4 | last | **The legacy UI-redesign backlog** — cosmetic / consistency only | NOT STARTED |

**Why this order.** Phase 15 is the gate that must pass before real public launch — the highest business value and
the smallest, bounded job — and it is what was recorded as "next" before the E2E programme jumped ahead. The E2E
coverage programme is large and open-ended, and is best finished on a settled product; it then strengthens the launch
evidence rather than delaying it. **Nothing is deleted:** the E2E catalogue, generator and gate already built remain
in place.

---
## 1. WHAT THE SYSTEM ACTUALLY DOES TODAY (verified this session)

### 1.1 CONFIRMED CORRECT — the routing you described is already implemented

`src/lib/commerce/channelPurchaseOrderIngestion.ts → routeChannelPurchaseOrder` matches each line's **vendor
SKU** (the brand's own product code the channel ordered) against Mercenta's catalogue, takes the brand **from
the matched product**, and **refuses the whole order** (held for Mercenta review) when: the order has no lines;
a line matches no catalogue product; or the lines point at **more than one brand**. The brand is DERIVED, never
supplied by a caller, so a mis-routed order is impossible by construction. This is exactly
`Amazon → Mercenta → the correct brand`.

### 1.2 CONFIRMED CORRECT IN STRUCTURE — the brand's decision goes to the channel as Mercenta

`src/lib/commerce/proxyProcessor.ts`: the brand's decision → recorded as an INSTRUCTION to Mercenta →
`client.submitAcknowledgement(...)` through the SP-API seam → the channel's acknowledgement id, status and mode
recorded back on the order. The brand never contacts the channel. **It currently runs on the simulated client
(MockAmazon)** because no live Amazon credentials exist — labelled as simulated everywhere.

### 1.3 CONFIRMED PARTIAL — the ASN and the labels

* **ASN (advance shipping notice): automatic on acceptance** — `proxyProcessor.ts` step 3 builds it from the
  ACKNOWLEDGED quantities, creates the consignment, and sends the confirmation to the channel.
* **Amazon shipping labels: they DO NOT EXIST for the UK, by rule.** `src/lib/spapi/client.ts →
  getShipmentLabels` is REFUSED BY RULE for a UK/EU marketplace because the channel generates those labels in
  North America only. UK labels are the **carrier's** (Mercenta's DHL/Palletline): the client books the
  shipment and returns `labelState: 'created'`. A brand-facing document pack exists
  (`src/components/shared/logistics/PoDocumentPackPanel.tsx`, rendered in the brand Logistics Hub).
* **NOT VERIFIED, and not claimed:** whether the brand can actually **download a label file** for a given
  consignment. This is the first thing P0 must prove or break.

### 1.4 THE FINDING THAT ANSWERS YOUR QUESTION — **there is no single demo/live switch today**

You are right that it should be one switch. It is not. Today the "live vs simulated" decision is made in
**three unrelated places**:

| Where | What decides it | File |
|---|---|---|
| **Data** | whether a Supabase client was created from environment variables — `if (!supabase) return seed` | `src/lib/supabase.ts`, `src/data/api.ts` |
| **Each external provider** | a per-provider `IntegrationMode` (`simulation`/`configured`/`live`/`disabled`/`configuring`/`unknown`/`not_registered`) read by EACH seam separately (`mode === 'live'` → Real client, else Mock) | `src/integrations/types.ts` (`isProviderSimulationSafe`, `resolveProviderMode`) |
| **Surfaces** | several screens show their own "simulated" badges/labels | e.g. `ChannelOperationsPanel`, `InvestorDemoPanel` |

So: there is a per-provider mode machine (which is genuinely useful — Amazon live while Xero is not), **and**
a data-source decision driven by credentials, **but no single, obvious control that means "the whole platform
is running in demo" or "the whole platform is running live"**. That is the gap. It is an architecture gap, not
a bug, and it is why the mock/real split feels scattered rather than intentional.

**Also confirmed:** in `live` with no real data the platform does NOT show an empty screen — the data layer
falls back to the seed whenever Supabase is unconfigured. Your stated expectation ("live mode has real data;
if there is no real user it stays empty") is **not** today's behaviour, and this is the second real gap.

### 1.5 Dead code and complexity — measured, not guessed

* **7 of 411 files under `src/` are never referenced BY NAME; 2 of those are legitimate ambient/test files.**
  Candidate removals: `src/lib/discovery/firecrawlResearch.ts`, `src/lib/research/dailyReport.ts`,
  `src/lib/research/resellerTracker.ts`, `src/lib/whatsapp/whatsAppEscalation.ts`; plus
  `src/testing/TestProviders.tsx` (check the test config first). Keep `src/vite-env.d.ts`,
  `src/lib/discovery/banned-patterns.d.ts`.
  **CORRECTED BY P4 (2026-10-02) — this list was a src-ONLY guess; the measured truth differs.** P4's
  import-aware gate (`validate-dead-code`) found that only **TWO** files are genuinely unreferenced —
  `src/lib/research/dailyReport.ts` and `src/lib/discovery/firecrawlResearch.ts` — and DELETED both.
  `resellerTracker.ts` and `whatsAppEscalation.ts` ARE imported by corpus validators
  (`validate-reseller-tracker.mjs`, `validate-whatsapp.mjs`) and `TestProviders.tsx` by
  `validate-stage15/16/26.mjs`, so risk **R3** ("the dead-code gate must include tests/tooling") KEPT all
  three. `src/lib/discovery/firecrawlClient.ts` is kept as a DECLARED-UNWIRED SEAM (a registry-documented
  controlled-live candidate; removing a seam is a feature decision deferred to P5/D2) and the gate names
  it explicitly.
* **Exactly ONE `TODO` remains in all of `src/`** — `src/data/api.ts` (the ASN auto-push stub: *"Replace with
  real SP-API PUT /vendor/shipping call when Amazon account is approved"*). It is a known, labelled stub.
* **Buttons:** a scan for dead controls found **zero** empty click handlers and **one** intentional placeholder
  (the design-system style guide). So there is no obvious dead-button litter — **but this does NOT prove every
  button does what its label says**, which is what P3 audits properly.
* **The real complexity is FEATURE COUNT, not litter:** 411 source files, and whole areas (founder console,
  investor/funding, opportunities/acquisition, social, advertising/listing tools, knowledge base) that are
  wired in and working but are not part of `Amazon ↔ Mercenta ↔ Brand`. Whether to keep them is your decision
  (P4), not mine to delete.

---

## 2. THE TARGET MODEL (what "one switch" should mean)

1. **ONE owner of the platform's environment**, e.g. `src/config/environment.ts`:
   `EnvironmentMode = 'demo' | 'live'`, read by every seam and every surface. Nothing else decides "am I
   simulated?" for itself.
2. **In `demo`:** seeded data (**two** demo brands — one per commercial model, see P2 and D1) + every provider simulated + every surface labelled
   SIMULATED. Running it must not require a single credential.
3. **In `live`:** real data only. **No seed fallback.** A provider with no credentials resolves to
   `configured`/`not_registered` and its features are visibly UNAVAILABLE — never silently simulated. An empty
   platform with no real users is the CORRECT live state, and must render honest empty states, not fake rows.
4. **Per-provider overrides are an EXCEPTION, not the rule:** the environment decides the default; a provider
   may be individually forced (e.g. Amazon live while Xero stays simulated), and every override is labelled
   where it is set and shown as an override.
5. **The existing fail-closed rule stays:** `isProviderSimulationSafe` — an unknown/unregistered/disabled
   provider is NEVER treated as simulation. That rule is correct and must not be weakened by the new switch.

---

## 3. THE PHASES (execution order is fixed)

| P# | Goal | Acceptance gate (a real command / observable) | Status |
|---|---|---|---|
| **P0** | PROVE THE LOOP END TO END — one order, every step, with output | a new validator that DRIVES one seeded order through arrive → route → decide → channel ack → ASN → confirmation → invoice → payout and PRINTS each step; plus a browser run of the same order on the brand screen | **DONE (2026-10-01)** — `npm run validate:commerce-loop` **30/30 PASS** (mutation-proved ×2: the fail-closed routing refusal removed ⇒ 3 failures; the automatic ASN filing removed ⇒ 6 failures; both restored byte-identical). Browser leg: `e2e/channel-po-ingestion.spec.ts` + `e2e/po-ack-duties.spec.ts` **9 passed**. One finding recorded for **P1-fix** (see below). |
| **P0a** | HOUSEKEEPING — BACK UP THE OWNER'S FOLDERS | the owner's `Products/` folder is saved into the project (its macOS `​.DS_Store` junk skipped), the working tree is clean, and the standing rule is recorded: *"when the owner adds a folder, back it up"* | **DONE (2026-10-02)** — `Products/` backed up; rule recorded in `PROJECT_STATUS.md`/`HANDOFF.md`/`.clinerules`. No application runtime change. |
| **P1** | ONE SWITCH (the environment owner) | `npm run validate:environment` (new) proves: demo needs no credential; live never falls back to seed; an unconfigured provider is UNAVAILABLE, never simulated; every seam reads the owner, not its own flag | **DONE (2026-10-02)** — `src/config/environment.ts` (NEW) is the ONE owner; `src/data/api.ts` routes EVERY seed fallback through `seedFallback` (demo-only); `modeForState` reads `environmentDefaultMode`; the switch is operable in the Simulation Control Centre; `npm run validate:environment` **16/16** — mutation-proved ×2 (`seedFallback` broken ⇒ 1 failure; the provider-default mapping broken ⇒ 2 failures; both restored byte-identical); the fail-closed `isProviderSimulationSafe` rule is UNCHANGED; browser `e2e/simulation-control.spec.ts` ONE-SWITCH test **1 passed**. |
| **P1-fix** | DOWNLOAD CONTROL (was "P0-fix") — a Download button beside Open/Print for a consignment's documents | the logistics surface offers **Download** for the chosen artefacts (owner **D3** = print **and** download), asserted by a browser check; the capability may be called a "download" only once this exists | **DONE (2026-10-02)** — `PoDocumentPackPanel.tsx` gains a per-document **Download** beside Open/Print and a **Download pack** (all ready documents in one file); `poDocumentPack.ts` owns the file (`renderPoDocumentPackHtml` + safe filenames); `LogisticsHub.tsx` label/waybill dialogues gain Download (owner D3's carrier label). Gates: `validate:po-documents` **57/57** (executed), commerce-loop §6 **REPOINTED**, e2e `po-documents.spec.ts` **10 passed**. |
| **P1a** | AMAZON VENDOR-CODE → CATEGORY REGISTRY | `src/config/amazonVendorCodes.ts` holds the owner's vendor codes with each category stored VERBATIM as Amazon Vendor Central shows it; two codes are marked "To Be Confirmed" and linking a category to them is BLOCKED until the owner confirms with Amazon; gated by `validate:amazon-vendor-codes` | **DONE (2026-10-02)** — registry + gate **20/20**; no guessed mapping; no application runtime change. |
| **P2** | TWO DEMO BRANDS | **DONE (2026-10-02).** The demo universe is reduced from 20 businesses to **FOUR**: Astonish + Tapatío (Model A/B, both CLEARED and trading), Le Creuset (the BLOCKED compliance-scenario tenant = the gate demo), and Kit & Kin (STILL IN ONBOARDING = the wizard + the unapproved-brand Social demo). The ten approved categories stay KNOWN to the system via the vendor-code registry (`src/config/amazonVendorCodes.ts`) — no longer one business per category. `npm run validate:all` **135/0**; typecheck 0 · lint 0 · build ✓; the checks/browser specs that named a removed business were REPOINTED (never weakened, each recording its old contract inline); tenant isolation is still proven with the two trading tenants. A REAL DEFECT was fixed at source (the Companies House registrar re-seeded on every call, so at 3 brands EVERY lookup was rate-limited). See §3 P2. |
| **P3** | EVERY BUTTON IS WIRED (UI audit) | `npm run validate:ui-wiring` (new) walks every button/control in `src/components/**` and fails on: no handler, a handler that only changes local state, a control whose label promises an action it does not perform | **DONE (2026-10-02)** — `scripts/validate-ui-wiring.mjs` (NEW) scans all 143 component files and fails on W1 no wiring, W2 empty handler, W3 an action-labelled control that only changes local state, W4 a lost domain writer (14 audited controls), W5 the fixed defect returning, W6 the style-guide exception drifting. The audit FIXED three real defects at source: `BrandSettings.tsx` "Change Password" / "Enable 2FA" (no handler, no password/2FA system — removed, the panel now states the fact); `ComplianceHub.tsx` "Review & Confirm" (only CLOSED a modal while promising to lock values — now RECORDS a real, audited confirmation via the new ONE writer `demoStore.confirmCustomsDocument`, and the tile shows "Confirmed"); and the chart hit target `role="button"` (made genuinely activatable by click/Enter/Space). **Mutation-proved ×3** (W1, W3, W5 each fail when mutated, each file restored byte-identical). See §3 P3. |
| **P4** | DEAD CODE + DUPLICATE OWNERS | a dead-code gate (the scan used in §1.5, as a script) returns 0 candidates; the unreferenced files are deleted with the reason recorded; duplicate owners consolidated to one each | **DONE (2026-10-02)** — `npm run validate:dead-code` (NEW; IMPORT-aware; 0 undeclared candidates + no `TODO`/`FIXME` stub) and `npm run validate:duplicate-owners` (NEW; one-owner checks). MEASURED, correcting §1.5's src-only guess: only TWO files were truly unreferenced and both were DELETED (`src/lib/research/dailyReport.ts`, `src/lib/discovery/firecrawlResearch.ts`); validator-imported modules were KEPT (R3); `firecrawlClient.ts` kept as a declared-unwired seam; the `src/data/api.ts` ASN auto-push stub RESOLVED at source; the `ApplicationsPanel.tsx` duplicate status-label map consolidated. See §3 P4. |
| **P5** | SIMPLIFICATION (owner's list only) | only the feature areas the owner names as out of scope are removed; the FULL sweep + browser suites green; nothing working is removed silently | **DEFERRED — owner D2** (skip P5 for now; decide later). Nothing is deleted. |
| **P6** | CLOSE | full sweep, browser suites, deploy to `demo.mercenta.co.uk`, LIVE verification of each change, then the three-way status recorded | **DONE (2026-10-02, with P4)** — `validate:all` **138/0**; both scope guards PASS; typecheck 0 · lint 0 · build ✓; affected browser specs GREEN (26 passed, 2 skipped); committed **`f06dc8d`**, pushed, deployed (`scripts/deploy-demo.sh`, exit 0); `verify:live` **209 PASS / 0 FAIL**; three-way status recorded in `PROJECT_STATUS.md` + `HANDOFF.md`. |

### P0 — PROVE THE LOOP (do this first, change nothing)
**In scope:** one written, EXECUTED trace of a single order. **Out of scope:** any fix.
Every step must print its real outcome: who acted, what writer ran, what was recorded, what the channel returned
(and whether it was simulated). It must include the four questions the owner asked, answered with output:
1. does the order land ONLY with the brand whose SKUs match? (include a deliberately unmatched SKU and show the
   refusal);
2. does the brand's decision reach the channel as Mercenta? (show the acknowledgement id/status/mode returned);
3. on acceptance, is the ASN created automatically and the confirmation sent? (show the consignment id);
4. can the brand DOWNLOAD a label/document for that consignment? (this is the unverified item from §1.3 — if it
   cannot, P0 records it as a defect for P0-fix, not as a plan).
**Gate:** the validator output plus a browser screenshot/spec run. **Status: DONE (2026-10-01).**

#### P0 — THE EXECUTED TRACE, AND THE FOUR ANSWERS

`npm run validate:commerce-loop` (`scripts/validate-commerce-loop.mjs`, NEW) bundles the SHIPPED modules with the
project's own esbuild through its own `@` alias, SABOTAGES `fetch` so any live call fails the run, drives ONE seeded
order the whole way and PRINTS every step. Measured output on 2026-10-01 (brand-astonish, `MOCK-PO-8841`):

| Step | Who acted | What was recorded (real values) |
|---|---|---|
| arrive | the channel seam (mode `mock` — no live call) | 4 orders read: 3 routed, 1 refused |
| route by SKU | `routeChannelPurchaseOrder` (derives the brand) | each order landed with the brand owning its SKUs |
| refuse | same owner, fail-closed | `MOCK-PO-8844` refused: SKU `MOCK-UNKNOWN-0001` matches no product — whole order held |
| decide | brand → `acknowledgePurchaseOrder` | ACCEPTED, timeliness `on_time`, PO → `accepted`, instruction `instr-ack-po-channel-MOCK-PO-8841` |
| channel ack | MERCENTA (`mercenta-proxy-automation`) | `MOCK-ACK-00001`, status `accepted`, mode `mock` |
| routing request | MERCENTA | `MOCK-SHP-REQ-00001`, carrier `palletline`, mode `mock` |
| ASN + confirmation | MERCENTA, AUTOMATIC on acceptance | consignment `shipment-po-channel-MOCK-PO-8841`; channel confirmation `MOCK-ASN-00001` (mock); 1 consignment, a replay adds none |
| document pack | MERCENTA, automatic | 5 applicable, 4 ready |
| receive → invoice | `staff-001` → the S9 automation (`mercenta-system:receipt-invoice`) | PO `delivered`, no shortfalls; invoice `SIM-INV-MOCK-PO-8841` £3,852.80, terms 30d, due 2026-10-31, status `issued` |
| payment → reconcile | `staff-001` | £3,852.80 `simulated_bank_transfer` (simulated); reconciliation `reconciled`, net to brand £3,027.20, accounting `simulation` |
| payout | `staff-001` (human approval) | SETTLED £3,027.20 via `mock_tr_payoneer_000001` (Payoneer, mode `mock`); a SECOND attempt REFUSED — one payout row |
| audit | the canonical log | every step attributed: `asn_filed`, `channel_instruction_actioned`, `commerce_invoice_issued`, `commerce_payment_recorded`, `payment_reconciled`, `commission_payout_settled` |

**The answers, with output:**
1. **Yes** — routing is derived from the PO's own lines, so a mis-routed order is impossible by construction; the
   deliberately unmatched SKU is refused WHOLE (brandId `null`, reason printed).
2. **Yes** — the brand's decision becomes an INSTRUCTION, and MERCENTA (never the brand) performs the channel action;
   the acknowledgement id/status/mode is printed above.
3. **Yes** — the ASN is filed automatically on acceptance, the consignment is created, and the CHANNEL's own
   confirmation id is recorded (never conflated with a local filing).
4. **ANSWER AT P0 — NO FILE DOWNLOAD EXISTED.** The brand can OPEN every applicable document and PRINT the carrier
   label/waybill through the carrier's own dialogue (which calls the browser print dialog — "Save as PDF" is the
   browser's). At P0 there was no download control anywhere in the logistics surface (asserted against the source,
   with the negative pinned). **This answer is HISTORICAL: it was resolved by P1-fix on 2026-10-02 — see the
   "P0-fix — RESOLVED" section below.**

#### P0-fix — THE RECORDED FINDING (RESOLVED by P1-fix, 2026-10-02)

Programme decision 6 states the Logistics Hub is *"where brands download shipping labels + ALL PO documents"*. At P0,
only OPEN + PRINT was implemented, not DOWNLOAD — recorded here as **P0-fix**, deliberately NOT fixed inside P0 (P0's
scope is "change nothing"). The owner then decided **D3 = BOTH** (print AND download), which unblocked the fix.

**RESOLVED (2026-10-02), in P1-fix.** The download now exists and is honest:
- each applicable, READY pack document downloads as its own file (the pack owns its HTML);
- the WHOLE pack downloads as ONE file — decision 6's literal *"ALL PO documents"* — and a document that is not
  ready/not applicable is listed **with its reason**, never faked;
- the carrier label and the freight waybill download **from the dialogue that renders them** (one renderer per
  artefact preserved), which is owner D3's carrier-label half;
- filenames are sanitised (no path separator, no traversal dots) and the file-export seam is the platform's existing
  helper (`src/lib/founder/documentExport.ts → downloadHtml`), not a new duplicate.

**Gates:** `npm run validate:po-documents` **57 assertions** (EXECUTING the pack owner: the whole-pack file is
deterministic, contains every ready document's own HTML, states every excluded document with its reason, and is
safely named) · `validate-commerce-loop` §6 **REPOINTED** (records the old "no download" contract inline and now
asserts the download exists) · browser `e2e/po-documents.spec.ts` **10 passed** (two new tests capture a real
download event for a single document, the whole pack, and the carrier label).

#### P0 also fixed a defect at its source (a gate, not a feature)

`scripts/validate-operating-costs.mjs` recorded its usage entries on the REAL clock but summarised them on a PINNED
instant (`2026-09-15T10:00:00.000Z`), so *"the summary counts calls, cache hits, refusals and an estimated
projection"* passed only while the machine's date sat inside that one month and FAILED on 2026-10-01 with no product
change. A check that depends on the calendar is a defect, not a gate; it now takes ONE clock. Proof: 44/44 PASS, and
the mutation that reintroduces a MISMATCHED clock fails it (2 failures); restored byte-identical.


### P1 — THE ONE SWITCH — **DONE (2026-10-02)**
**In scope:** the environment owner (`src/config/environment.ts`), every seam repointed to it, the data layer's
seed fallback made conditional on `demo`, honest UNAVAILABLE states, the toggle UI in one obvious place.
**Out of scope:** adding new providers; changing the existing fail-closed `isProviderSimulationSafe` rule.
**Depends on:** P0 (so we change a loop we can prove). **Gate:** `validate:environment`.
**Regression hotspots:** every seam that currently reads `mode === 'live'` (≈10 files found in §1.4), the
integrations registry, and the surfaces that show "simulated" badges.
**DONE — built:** `src/config/environment.ts` (NEW — the ONE owner: `EnvironmentMode`, the build default from
`VITE_ENVIRONMENT`, the runtime switch in localStorage, `seedFallback`, `environmentDefaultMode`); `src/data/api.ts`
(every seed fallback routed through `seedFallback`, so `live` returns NOTHING); `src/integrations/types.ts`
(`modeForState` reads `environmentDefaultMode`, so an unconfigured provider in `live` is `available`/UNAVAILABLE, not
simulation); `SimulationControl.tsx` (the switch, in one obvious place).
**DONE — proved:** `npm run validate:environment` **16/16** (mutation-proved ×2, both restored byte-identical);
`validate:all` **135 PASS / 0 FAIL**; typecheck 0; lint 0; build ✓; browser `e2e/simulation-control.spec.ts`
ONE-SWITCH test **1 passed**. Scope declared in BOTH guards (E6 + E7). The fail-closed `isProviderSimulationSafe`
rule is UNCHANGED.

### P2 — TWO DEMO BRANDS
**In scope:** the seed (`src/data/demoData.ts` → `DEMO_BRANDS`, `ALL_DEMO_BRANDS`), the per-brand dossiers and
readiness seeds, the per-brand demo logins, and the checks/tests that assert "11 brands" or sign in as other
brands — each REPOINTED, not weakened. **Out of scope:** tenant-isolation logic and RBAC (they must stay and
keep proving isolation). **Depends on:** P1. **Gate:** `validate:demo-completeness`, the repointed specs, and a
tenant-isolation proof.
**Note:** even with the reduced seed, a demo must still be able to CREATE another brand (so isolation remains demonstrable).

**DONE (2026-10-02).** The demo seed now holds **FOUR** businesses instead of twenty: Astonish (Model A,
CLEARED/trading), Tapatío (Model B, CLEARED/trading), Le Creuset (BLOCKED — the compliance-gate demo) and
Kit & Kin (STILL IN ONBOARDING — the wizard demo and an UNAPPROVED brand the Social gate refuses). The
one-click login shows one card per business. `CLEARED_BRAND_IDS` = [Astonish, Tapatío];
`COMPLIANCE_SCENARIO_BRAND_IDS` = [Le Creuset]; `DEMO_COMPLIANCE_BASELINE` = 15 documents / 4 blocking. The
ten approved categories stay KNOWN via `src/config/amazonVendorCodes.ts`. Why four and not two: the demo must
still demonstrate the gate BLOCKING a brand, the onboarding wizard (a not-yet-onboarded tenant) and the
unapproved-brand Social refusal, while keeping two TRADING tenants for the isolation proof — two all-cleared
brands cannot show any of those. **A real defect was FIXED at source**: `companiesHouseMock`'s seed and lookup
shared one counter and `primeCompaniesHouseRegistrar` re-seeded on every call, so at a brand count ≡ 3 (mod 4)
EVERY Companies House lookup was rate-limited and verification could never succeed; the registrar now seeds
ONCE. **Gates repointed, not weakened** (each records its old contract inline): `validate-demo-completeness`,
`validate-commercial-model-selection`, `validate-amazon-ads`, `validate-review-s1` (categories → approved +
declared + vendor-code registry; contracts ≥4→≥2 states), `validate-review-s6`, `validate-stage16`,
`validate-work-layer`, `validate-compliance-attribution`; browser specs `compliance-gate`,
`catalog-product-management`, `document-verification`, `embedded-social`, `amazon-ads-dashboard`,
`founder-operating-system`. **Evidence:** `validate:all` 135/0 · typecheck 0 · lint 0 · build ✓ · affected
browser specs green; the 11 unrelated browser failures were PROVEN pre-existing (they fail identically with
this change stashed).

### P3 — EVERY BUTTON IS WIRED
**In scope:** an audit of every interactive control against its handler and its label, and fixes for anything
that is decorative, or that promises more than it does (the recent "Start"/"Block" and "on-behalf" defects were
exactly this class). **Out of scope:** restyling. **Depends on:** P0. **Gate:** `validate:ui-wiring` + browser
suites. **Method:** for every `<Button`/`role="button"`/control: does a handler exist; does it reach a domain
WRITER (a real state change) or only local state; if it only annotates, does the UI SAY so; if it is
unavailable, does it say why instead of silently doing nothing.

**DONE (2026-10-02).** `scripts/validate-ui-wiring.mjs` (`npm run validate:ui-wiring`) walks all 143
`.tsx` files under `src/components/**` (comments stripped, so commented-out JSX is never counted) and
asserts six things: **W1** every `<button>`/`<Button>`/`role="button"` is wired (the design-system style
guide, `DesignSystemShowcase.tsx`, is the one declared specimen exception); **W2** no empty handler; **W3**
every action-labelled control reaches a real writer (not only a React setter — a bare function reference
counts, and the one legitimate "reveal the form" control is allow-listed with its reason); **W4** a curated
manifest of **14 domain-critical controls** still reaches its writer symbol; **W5** the fixed defect cannot
return; **W6** the style-guide exception is still the style guide.

**Defects FIXED at source (the audit found exactly three):**
1. `src/components/brand/BrandSettings.tsx` — **"Change Password" and "Enable 2FA" had NO handler.** They
   rendered the look of a security action and did nothing; Mercenta holds no password/2FA (sign-in is
   role-based; external services use OAuth). The two false controls were removed and the panel now states the
   fact (W5 fails if either returns).
2. `src/components/brand/ComplianceHub.tsx` — **"Review & Confirm" only CLOSED the modal** while its own copy
   said "Confirming locks these values." It now RECORDS a real, audited confirmation through the new ONE
   writer `src/data/demoStore.ts → confirmCustomsDocument` (on the same canonical `recordComplianceAudit` log,
   no second audit system), and the tile shows a **Confirmed** badge.
3. `src/components/shared/charts/MercentaCharts.tsx` — the chart hit target declared `role="button"` but had
   no activation; a click and Enter/Space now genuinely reveal the point's value.

**Evidence.** `validate:ui-wiring` **6/6 PASS** (mutation-proved ×3: W1/W3/W5 each fail when mutated, each
file restored byte-identical); the whole corpus `validate:all` **136/0**; `typecheck` 0 · `lint` 0 · `build` ✓;
E6 + E7 PASS (P3 surface declared in both); browser `compliance-sim` + `compliance-gate` **7 passed**,
`brand-operational-surfaces` + `uiux-foundation` + `dashboard` **27 passed**.

### P4 — DEAD CODE AND DUPLICATE OWNERS
**In scope:** the ≈4 unreferenced files (§1.5) deleted with the reason recorded; the one remaining `TODO` stub
resolved or recorded as BLOCKED; duplicate owners of the same value consolidated to ONE each (repoint readers,
record the old contract inline). **Out of scope:** removing working features (that is P5). **Gate:** a
`validate:dead-code` script (0 candidates) + the full sweep.
**Known duplicate-owner candidates to sweep:** PO status labels, "Received"-class wording, simulated badges,
per-seam mode reads.

**DONE (2026-10-02).** `scripts/validate-dead-code.mjs` (`npm run validate:dead-code`) is an IMPORT-aware scan of every
`.ts/.tsx` under `src/` (excluding `.d.ts`) against every quoted module specifier in `src/`, `scripts/`, `e2e/`,
`supabase/` and the repo root — so a reference from a validator (tests/tooling, plan risk R3) COUNTS, while a mention
inside prose or a registry evidence string does NOT. It passes only with **0 undeclared candidates**, pins the two
deleted files (DC2), proves it reads `index.html` by detecting `src/main.tsx` (DC3), FAILS on any `TODO`/`FIXME` stub in
`src/` (DC4), and keeps the ONE declared-unwired exception honest (DC5 — it must still exist AND still be unreferenced).
`scripts/validate-duplicate-owners.mjs` (`npm run validate:duplicate-owners`) pins the ONE owner of the
application-status and PO-status vocabularies and the "Received"-class disambiguation.

**Defects FIXED at source (measured, not guessed):**
1. **Dead code — TWO files DELETED:** `src/lib/research/dailyReport.ts` (no consumer, no documentation) and
   `src/lib/discovery/firecrawlResearch.ts` (the unreached glue of the firecrawl seam). The §1.5 four-file list was a
   src-only guess; the import-aware gate measured the truth and KEPT `resellerTracker.ts`, `whatsAppEscalation.ts` and
   `TestProviders.tsx` (validator-imported) plus `firecrawlClient.ts` (a documented seam).
2. **The ONE stub RESOLVED:** `src/data/api.ts` wrote an `asn_auto_generated` entry claiming the channel confirmation
   "would be pushed … once the integration is connected" — FALSE, and a duplicate of the real owner
   `fileChannelShipmentConfirmation` (`src/lib/shipping/channelShipmentOperations.ts`, the SP-API
   `submitShipmentConfirmations` seam, `AV-015`). The aspirational entry is gone.
3. **Duplicate owner FIXED:** `src/components/admin/ApplicationsPanel.tsx` kept a local `STATUS_LABELS` map with the
   same labels the canonical `applicationStatusPresentation` owns, used side-by-side in ONE screen; it now reads the ONE
   owner.

**Named candidates VERIFIED already consolidated (no change needed):** PO status labels
(`statusPresentation.poStatusPresentation`); the "Received"-class wording (the §DEFECT FIXED disambiguation, "Received
from channel" vs "Goods received at the FC"); the simulated badges (each is a context-specific statement about a
specific provider — `DEMO_OPERATIONAL_STATE_LABEL` for the work workspace — not a duplicated single value); per-seam
mode reads (the mode DECISION is owned by `src/config/environment.ts` from P1; the remaining `mode === 'mock'` reads are
DISPLAY, not decisions).

**Evidence.** `validate:dead-code` **9/9 PASS** (mutation-proved: a synthetic orphan failed DC1; a re-added `TODO`
failed DC4; both mutants removed). `validate:duplicate-owners` **7/7 PASS** (mutation-proved: a second
`info_requested → "Info Requested"` map failed DO2; removed). `validate:all` **138/0**; typecheck 0 · lint 0 · build ✓;
E6 + E7 PASS (P4 surface declared in both).

### P5 — SIMPLIFICATION (owner's decision required)
**In scope:** only the areas the owner names. **Gate:** full sweep + browser suites green.
**Explicitly NOT done on my own judgement:** deleting founder/investor/opportunity/social/advertising/knowledge-base
surfaces. They work; removing them is a business decision.

### P6 — CLOSE
Full sweep → browser suites → deploy via `scripts/deploy-demo.sh` → OPEN `https://demo.mercenta.co.uk` →
verify each change LIVE → record the three-way status in `PROJECT_STATUS.md` → update this file's table.

---

## 4. RISKS

| R# | Risk | Hotspot | Mitigation |
|---|---|---|---|
| R1 | Reducing the seed breaks ~140 checks and the browser suites | `src/data/demoData.ts`, `validate-demo-completeness.mjs`, e2e specs | repoint each to the new truth; never weaken |
| R2 | The new environment switch could let an unconfigured provider look simulated | `src/integrations/types.ts` | keep `isProviderSimulationSafe`; assert it in `validate:environment` |
| R3 | Deleting "dead" files that are referenced only by tests/tooling | the 4 candidates | check the test config first; the dead-code gate must include tests/tooling |
| R4 | Live mode showing a fake seed | `src/data/api.ts` seed fallback | P1's gate asserts live NEVER falls back to the seed |
| R5 | The live Amazon leg is BLOCKED on credentials + the server-side helper | `src/lib/spapi`, `supabase/functions` | keep it labelled simulated; do not fake it |

## 5. OWNER DECISIONS — ALL TAKEN (2026-10-02)

| D# | Decision needed | Owner's answer (2026-10-02) | Effect |
|---|---|---|---|
| **D1** | How many demo brands, and what happens to the extra one-click demo logins? | **TWO demo brands** — one per commercial model (Brand A = Model A commission; Brand B = Model B resell). The extra demo logins reduce to one per demo brand. | P2 becomes **two** demo brands, not one. |
| **D2** | Which feature areas are OUT of scope for `Amazon ↔ Mercenta ↔ Brand`? | **DEFERRED — skip P5 for now, decide later.** | P5 is skipped; **nothing is deleted**; the platform stays as it is. |
| **D3** | Should a brand DOWNLOAD a carrier label (DHL/Palletline) per consignment, or only open/print the document pack? | **BOTH — print AND download.** | **P1-fix is unblocked**: add a Download control beside Open/Print. |
| **D4** | Live Amazon credentials: prepare the go-live steps now, or wait for the keys? | **WAIT for the real keys.** | The live Amazon leg stays off and labelled simulated; no go-live prep now. |

**Vendor-code categories** (not a D-number; owner instruction 2026-10-02): the two codes without a category
(`SV5QE`, `SV76D`) stay **"To Be Confirmed"**; linking a category to them is **BLOCKED** until the owner confirms
with Amazon. All other category strings are stored **verbatim** as Amazon Vendor Central shows them.

---

## 6. THE MERGED PLAN — the batch backlog folded in from `NEXT_BUILD_PLAN_2026-09-27.md`

The former `docs/NEXT_BUILD_PLAN_2026-09-27.md` is MERGED here (2026-10-02) and is now a pointer. Its remaining work
is owned by THIS file. It was **PAUSED — not abandoned** while the P0–P6 phases above run; the leftovers are:

**Batch 1 — make the key handover real (no credentials needed).**
- 1b (connect-wizard backend) — **DONE (2026-09-28)**; 1c (CI wiring) — **DONE (2026-09-28)**.
- 1a (the 12 SP-API / 3 DHL / 5 Palletline server helpers) — built and gated (`validate:integration-proxy`).
- **Delivery leg still OPEN**: the two Edge Functions + the migration are server-side and need a Supabase credential
  + CLI the environment does not hold. Reported, never faked.

**Batch 2 — Amazon accuracy** (register: `docs/AMAZON_VENDOR_DISCREPANCY_REGISTER_2026-09-20.md`). Leftovers:
- `AV-011`, `AV-015`, `AV-014`, `AV-016` and `AV-013` — **APPLIED (Batch 2k + 2l + 2m + 2n + 2o, 2026-10-02/03)**.
- The four **INFERENCE relabels** (`AV-002/017/025/044`) — **APPLIED (Batch 2p, 2026-10-03)**; `AV-033` is EVIDENCE-BLOCKED.
  **`BATCH 2` (Amazon accuracy) is now CLOSED** on everything the platform can do without a signed-in Vendor Central session.
- **EVIDENCE-BLOCKED** (do NOT model from guesswork): `AV-010b`'s read half (the channel's hold signal is
  undocumented) and `AV-040`'s last operation (`getTransaction`). The six UNKNOWNs
  (`AV-020/034/035/046/047/048`) need a **signed-in Vendor Central session** (a founder action).

**Batch 3 — prove what we claim, and close the declared gaps.** (Split into 3a / 3b / 3c, 2026-10-03.)
- **3a — S7, the contract closing path — DONE (2026-10-03).** `demoContracts` now HAS writers
  (`renewContract` / `terminateContract` in `src/data/demoStore.ts`, plus `saveContractDraft`), the admin
  `ContractsAdminPanel` writes drafts to the canonical store instead of local state, and
  `WORK_SOURCE_CLOSING.contract_renewal.writer` is no longer null. Gate `validate:contract-closing` (20
  assertions, mutation-proved); live check `L24`. This closed the `contract_renewal` declared gap.
- **3b — the remaining declared gaps** (the six `founder_*` rows) — **DONE (2026-10-03).** `founder_setup` and
  `founder_integration` were FALSE gaps and are CLOSED; `founder_compliance`/`founder_funding` (PARTIAL) and
  `founder_finance`/`founder_ai_cost` (NONE) each carry a machine-readable `reason`. Gate `validate:founder-closing`
  (25 assertions, mutation-proved); live check `L25`.
- **3c — the ~126 "built but never independently re-verified" registry rows** (the page-by-page functional parity
  audit). **Part 1 — DONE (2026-10-03): the evidence-integrity half.** A NEW gate `scripts/validate-built-rows.mjs`
  (`npm run validate:built-rows`) asserts every file / e2e-spec / npm-script reference inside every EVIDENCE-BEARING
  row (`built` AND `built_and_tested`) RESOLVES to something that exists; it found 69 dead references in the `built`
  rows and more in the `built_and_tested` rows, all repaired at source by `scripts/reconcile-batch3c-built-rows.cjs`
  (10 consolidated Playwright suite names repointed, 5 moved/removed files fixed, 3 unregistered npm-script names
  corrected, an empty-evidence row filled, and 4 rows citing a file that NEVER existed across the full git history
  corrected — 2 reclassified `built` → `not_started`, 2 repointed). **Part 2a — DONE (2026-10-03): the browser
  evidence made honest.** The whole PRE-EXISTING browser-failure class (11 specs — `admin-operational-surfaces` ×3,
  `invoicing` ×3, `proxy-model`, `po-admin-ack-surface`, `shipment-asn` ×2) shared ONE root cause: they predated the
  2026-09-30 on-behalf authority fix (`src/lib/commerce/poOnBehalfAuthority.ts`), so each drove an on-behalf ACCEPTANCE
  with no brand authorisation on record and was legitimately refused by the writer. Each was repointed at source (the
  brand's authorisation now recorded through the ONE canonical writer `authoriseOnBehalfDecisions`; the `invoicing`
  receipt-gate test builds its order through canonical writers instead of a phantom store instance). NEW gate
  `scripts/validate-onbehalf-spec-authorisation.mjs` (`npm run validate:onbehalf-spec-authorisation`, mutation-proved).
  The FULL browser suite is now **561 passed / 2 skipped / 0 failed** (was 11 failures). **Part 2b — DONE (2026-10-03):**
  the remaining page-by-page parity dimensions (dataset completeness / name-implies-capability / interactivity), made
  mechanical by `scripts/validate-functional-parity.mjs` (`npm run validate:functional-parity`), which also found and
  fixed the Brain's dead-end KPI band. `§2026-10-04 — REPOINTED`: this line previously read *"Part 2b — REMAINING"* and
  was one session stale; the fix is guarded by `scripts/validate-no-stale-blockers.mjs`.

**Batch 10 — the health-check + daily-digest pair — DONE (2026-10-05).**
- The registry row `batch10-health-check-digest` recorded that a "health-check function" was meant to exist and that a
  `daily-digest` Edge Function was meant to call it and include its results with a triage summary — and that NEITHER file
  had EVER existed across the full git history. Meanwhile `supabase/migrations/025_cron_daily_digest.sql` (job
  `daily-digest-0700-uk`) has always posted every morning to `/functions/v1/daily-digest`, an endpoint that answered
  nothing.
- **BUILT:** `supabase/functions/_shared/readiness.ts` (**NEW**, the ONE owner), `supabase/functions/health-check/index.ts`
  (**NEW**), `supabase/functions/daily-digest/index.ts` (**NEW**), two buckets in `supabase/functions/_shared/rateLimit.ts`,
  and the gate `scripts/validate-health-digest.mjs` (**39 assertions**, `npm run validate:health-digest`), mutation-proved
  twice. Registry row raised `not_started` → `built`.
- **Honest limit:** there is no hosted Supabase project, so the Edge-Function runtime cannot be exercised — the same limit
  the §RATE-LIMIT row records. Hosting it is ACTIVATION work, never a build blocker.

**DONE (2026-10-04) — §OPTION-A: the editor / type-check gap ("Option A").**
121 TypeScript files outside `src` (96 in `e2e/`, 23 in `supabase/functions/`, plus `playwright.config.ts`
and `scripts/brain-runtime-check.ts`) belonged to NO TypeScript project, so the editor checked them with wrong
defaults and showed ~178 invented problems, and the project never type-checked them at all. **FIXED:** new
`tsconfig.e2e.json` (the Playwright project) and `tsconfig.functions.json` (the Edge Function project), the
tooling project (`tsconfig.node.json`) extended to cover `scripts/brain-runtime-check.ts`, all four referenced
from the root `tsconfig.json`, and `npm run typecheck` now runs ALL FOUR. Registry row
`editor-typecheck-gap-e2e-and-functions` → `built_and_tested`. NEW gate `scripts/validate-typecheck-coverage.mjs`
(mutation-proved). The new coverage found and fixed real latent defects (a wrong Playwright `exact` option, a
double-prefixed KPI selector that made a test unable to fail, and a Brain leak-scan that read properties which
do not exist). `validate:all` 151/0 · typecheck 0 · lint 0 · build ✓ · the 9 affected browser specs 65 passed.
No application-runtime change.


---

## 7. DEFINITION OF DONE FOR THIS PLAN

`demo` runs the whole `Amazon → Mercenta → brand → Mercenta → Amazon` loop with one seeded brand and one
switch; `live` shows real (or honestly empty) data and never a fake row; every button is wired to a real writer
or says plainly why it cannot act; the dead-code gate and the full sweep are green; and every change is verified
on `https://demo.mercenta.co.uk`.



