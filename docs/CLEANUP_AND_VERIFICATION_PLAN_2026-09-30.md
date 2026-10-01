# CLEAN-UP, VERIFICATION AND "ONE SWITCH" PLAN — 2026-09-30

**Status:** PLAN ONLY — **no product code has been changed.** Every finding below was read from the code in
this session, with the file named so it can be checked.

**Owner:** Founder/Super Admin. **Agreed by:** not yet — the owner asked for the plan *before* any change, so
each phase waits for a go-ahead where a decision is flagged.

---

## 0. HOW TO RESUME (a brand-new chat needs nothing else)

Type **"continue where you left off"**. A new session must then, in this order:

1. Read `.clinerules/operating-model.md`, `protection-rules.md`, `project-state-contract.md`,
   `mercenta-business-model.md`, `plain-english-responses.md`.
2. Read `PROJECT_STATUS.md` → **`CURRENT RESUME STATE`** (first screen only) — it points here.
3. Read **this file** — it is the authoritative plan and the task list.
4. `git --no-pager log --oneline -5` and `git status --porcelain`.
5. Start at the phase whose `STATUS` is not `DONE`, in order. Never skip P0.

**The plan is owned here, and only here.** When a phase finishes, update ITS row in this file (status + the
evidence produced), then update `PROJECT_STATUS.md` + `HANDOFF.md`. Do not create a second plan document.

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
2. **In `demo`:** seeded data (one demo brand, see P2) + every provider simulated + every surface labelled
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
| **P0** | PROVE THE LOOP END TO END — one order, every step, with output | a new validator that DRIVES one seeded order through arrive → route → decide → channel ack → ASN → confirmation → invoice → payout and PRINTS each step; plus a browser run of the same order on the brand screen | NOT STARTED |
| **P1** | ONE SWITCH (the environment owner) | `npm run validate:environment` (new) proves: demo needs no credential; live never falls back to seed; an unconfigured provider is UNAVAILABLE, never simulated; every seam reads the owner, not its own flag | NOT STARTED |
| **P2** | ONE DEMO BRAND | `validate:demo-completeness` + browser suites green after the seed and the login list are reduced and the checks REPOINTED (never weakened); tenant isolation still proves one brand cannot see another's data | NOT STARTED |
| **P3** | EVERY BUTTON IS WIRED (UI audit) | `npm run validate:ui-wiring` (new) walks every button/control in `src/components/**` and fails on: no handler, a handler that only changes local state, a control whose label promises an action it does not perform | NOT STARTED |
| **P4** | DEAD CODE + DUPLICATE OWNERS | a dead-code gate (the scan used in §1.5, as a script) returns 0 candidates; the four candidates are deleted with the reason recorded; duplicate owners consolidated to one each | NOT STARTED |
| **P5** | SIMPLIFICATION (owner's list only) | only the feature areas the owner names as out of scope are removed; the FULL sweep + browser suites green; nothing working is removed silently | NOT STARTED — waiting on decision D2 |
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
**Gate:** the validator output plus a browser screenshot/spec run. **Status: NOT STARTED.**

### P1 — THE ONE SWITCH
**In scope:** the environment owner (`src/config/environment.ts`), every seam repointed to it, the data layer's
seed fallback made conditional on `demo`, honest UNAVAILABLE states, the toggle UI in one obvious place.
**Out of scope:** adding new providers; changing the existing fail-closed `isProviderSimulationSafe` rule.
**Depends on:** P0 (so we change a loop we can prove). **Gate:** `validate:environment`.
**Regression hotspots:** every seam that currently reads `mode === 'live'` (≈10 files found in §1.4), the
integrations registry, and the surfaces that show "simulated" badges.

### P2 — ONE DEMO BRAND
**In scope:** the seed (`src/data/demoData.ts` → `DEMO_BRANDS`, `ALL_DEMO_BRANDS`), the per-brand dossiers and
readiness seeds, the per-brand demo logins, and the checks/tests that assert "11 brands" or sign in as other
brands — each REPOINTED, not weakened. **Out of scope:** tenant-isolation logic and RBAC (they must stay and
keep proving isolation). **Depends on:** P1. **Gate:** `validate:demo-completeness`, the repointed specs, and a
tenant-isolation proof.
**Note:** a one-brand demo must still be able to CREATE a second brand (so isolation remains demonstrable).

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

## 5. OPEN DECISIONS (owner)

| D# | Decision needed | Blocks | Consequence of deciding | Consequence of NOT deciding |
|---|---|---|---|---|
| **D1** | One demo brand: which brand, and should the extra one-click demo logins be removed or kept? | P2 | one clean test brand; less noise (cost: one phase) | testing stays noisy; brand-to-brand differences keep hiding bugs |
| **D2** | Which feature areas are OUT of scope for `Amazon ↔ Mercenta ↔ Brand`? | P5 | a genuinely simpler platform (cost: deletes working code) | platform stays larger than the business needs; no breakage |
| **D3** | Should the brand download a CARRIER label (DHL/Palletline) per consignment, or only the document pack? | P0→P1 | P0 knows what "labels" must mean (cost: none) | P0 reports it as unverified |
| **D4** | Live Amazon credentials: prepare the go-live steps now, or wait for the keys? | P6/live leg | the switch is provable end to end | the live leg stays blocked |

## 6. DEFINITION OF DONE FOR THIS PLAN

`demo` runs the whole `Amazon → Mercenta → brand → Mercenta → Amazon` loop with one seeded brand and one
switch; `live` shows real (or honestly empty) data and never a fake row; every button is wired to a real writer
or says plainly why it cannot act; the dead-code gate and the full sweep are green; and every change is verified
on `https://demo.mercenta.co.uk`.



