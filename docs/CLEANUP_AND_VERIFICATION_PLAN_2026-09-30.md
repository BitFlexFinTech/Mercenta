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
- **P2 – P6 product work is still PLANNED: no OTHER product runtime code has been changed** beyond P1 and P1-fix.
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

* **7 of 411 files under `src/` are never referenced by name; 2 of those are legitimate ambient/test files.**
  Candidate removals: `src/lib/discovery/firecrawlResearch.ts`, `src/lib/research/dailyReport.ts`,
  `src/lib/research/resellerTracker.ts`, `src/lib/whatsapp/whatsAppEscalation.ts`; plus
  `src/testing/TestProviders.tsx` (check the test config first). Keep `src/vite-env.d.ts`,
  `src/lib/discovery/banned-patterns.d.ts`.
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
| **P2** | TWO DEMO BRANDS (was "one") | `validate:demo-completeness` + browser suites green after the seed and the login list are reduced to the two demo brands and the checks REPOINTED (never weakened); tenant isolation still proves one brand cannot see another's data | NOT STARTED — owner **D1** = **two** demo brands |
| **P3** | EVERY BUTTON IS WIRED (UI audit) | `npm run validate:ui-wiring` (new) walks every button/control in `src/components/**` and fails on: no handler, a handler that only changes local state, a control whose label promises an action it does not perform | NOT STARTED |
| **P4** | DEAD CODE + DUPLICATE OWNERS | a dead-code gate (the scan used in §1.5, as a script) returns 0 candidates; the four candidates are deleted with the reason recorded; duplicate owners consolidated to one each | NOT STARTED |
| **P5** | SIMPLIFICATION (owner's list only) | only the feature areas the owner names as out of scope are removed; the FULL sweep + browser suites green; nothing working is removed silently | **DEFERRED — owner D2** (skip P5 for now; decide later). Nothing is deleted. |
| **P6** | CLOSE | full sweep, browser suites, deploy to `demo.mercenta.co.uk`, LIVE verification of each change, then the three-way status recorded | NOT STARTED |

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
**Note:** even with two demo brands, a demo must still be able to CREATE another brand (so isolation remains demonstrable).

### P3 — EVERY BUTTON IS WIRED
**In scope:** an audit of every interactive control against its handler and its label, and fixes for anything
that is decorative, or that promises more than it does (the recent "Start"/"Block" and "on-behalf" defects were
exactly this class). **Out of scope:** restyling. **Depends on:** P0. **Gate:** `validate:ui-wiring` + browser
suites. **Method:** for every `<Button`/`role="button"`/control: does a handler exist; does it reach a domain
WRITER (a real state change) or only local state; if it only annotates, does the UI SAY so; if it is
unavailable, does it say why instead of silently doing nothing.

### P4 — DEAD CODE AND DUPLICATE OWNERS
**In scope:** the ≈4 unreferenced files (§1.5) deleted with the reason recorded; the one remaining `TODO` stub
resolved or recorded as BLOCKED; duplicate owners of the same value consolidated to ONE each (repoint readers,
record the old contract inline). **Out of scope:** removing working features (that is P5). **Gate:** a
`validate:dead-code` script (0 candidates) + the full sweep.
**Known duplicate-owner candidates to sweep:** PO status labels, "Received"-class wording, simulated badges,
per-seam mode reads.

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
- `AV-011`, `AV-015` (still INCOMPLETE) · `AV-013` (CONTRADICTED) · `AV-014` and `AV-016` (MODELLED IN PART — their
  remaining halves are named in their own rows) · the four **INFERENCE relabels** (`AV-002/017/025/033/044`).
- **EVIDENCE-BLOCKED** (do NOT model from guesswork): `AV-010b`'s read half (the channel's hold signal is
  undocumented) and `AV-040`'s last operation (`getTransaction`). The six UNKNOWNs
  (`AV-020/034/035/046/047/048`) need a **signed-in Vendor Central session** (a founder action).

**Batch 3 — prove what we claim, and close the declared gaps.**
- The ~126 "built but never independently re-verified" registry rows (run the page-by-page functional parity audit).
- **S7 — the contract closing path**: build the canonical `renewContract` / `terminateContract` writer so
  `demoContracts` stops having no writer.
- The declared gaps (`contract_renewal` + the `founder_*` rows): give each a closing path, or record why it has none.

---

## 7. DEFINITION OF DONE FOR THIS PLAN

`demo` runs the whole `Amazon → Mercenta → brand → Mercenta → Amazon` loop with one seeded brand and one
switch; `live` shows real (or honestly empty) data and never a fake row; every button is wired to a real writer
or says plainly why it cannot act; the dead-code gate and the full sweep are green; and every change is verified
on `https://demo.mercenta.co.uk`.



