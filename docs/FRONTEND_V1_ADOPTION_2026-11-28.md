# §FRONTEND V1 — THE OWNER'S EXACT FRONTEND, AND HOW IT REPLACES THE PORT (2026-11-28)

> **This document exists because the owner rejected the console that was built.** Their words:
> *"this is the frontend i asked for: https://github.com/BitFlexFinTech/mercenta-frontend-v1 … i did not
> ask you to just copy the design and layout i said use this exact code."* They were right, and the
> evidence is in this repository's own history (below). This file records the measured comparison, the
> adoption plan, the gate that makes "exact code" checkable, and the decisions the adoption still needs.

---

## 1. WHAT WENT WRONG — MEASURED, NOT ASSERTED

The product does **not** contain the owner's frontend. It contains a **re-implementation** of it:

| Evidence | Where |
|---|---|
| The console was introduced as a PORT | commit `de4e667` (2026-11-25): *"wip(next): port the AI Studio console behind an explicit switch"*, *"Phases 1-3 only: 42 files / 13,601 lines"*, *"83 type errors from the stale AI Studio snapshot"* |
| It uses none of the owner's component code | `src/next/**`: **0** files import Radix/shadcn; **66** import the hand-written `ConsolePrimitives` |
| The owner's repo is a different, complete application | `mercenta-frontend-v1`: `metadata.json` = *"Mercenta Partners operations console across wholesale retail, BWS, and talent commerce"*, an AI Studio export; 254 `.tsx` + 315 `.ts` = **192,469 lines** |
| Its records call it "the AI Studio port" | `docs/OPENSHIP_REFERENCE_SPEC.md:1045`, `STATUS_CHECK.md:788` |

A port is a rewrite. The instruction was *use the exact code*. Everything below follows from that.

---

## 2. PROVENANCE OF THE SOURCE OF TRUTH

| Fact | Value |
|---|---|
| Repository | `github.com/BitFlexFinTech/mercenta-frontend-v1` (private) |
| Branch / commit | `main` @ **`9f069f51f52a13ec61f348994a0a430c0b9cdf52`** |
| Last commit | 2026-11-26 — *"feat(next): implement lazy-loaded navigation and routing"* |
| Local clone (read-only reference) | `.reference/mercenta-frontend-v1/` — **gitignored**, never edited, never deployed from |
| Declared stack | Vite 8 · React 19 · Tailwind CSS v4 · `@tanstack/react-query` · Supabase JS · `@google/genai` · Express · lucide · motion · recharts |
| Scope of that repo | **Frontend only** — `src/`, `docs/`, `public/`; it has **no** `scripts/`, `e2e/`, `supabase/` |
| Its own design record | `src/next/FRONTEND_NOTES.md` — screen-by-screen capability parity tables (`OLD CAPABILITY → NEW LOCATION`) |

**Consequence:** this repository keeps ownership of the gates, the browser tests, the Supabase layer and the
deploy script. What changes is the **frontend source**.

---

## 3. THE MEASURED COMPARISON (`src/` against `src/`)

| Measure | Count |
|---|---|
| Files in this repo's `src/` | **610** |
| Files in the owner's `src/` | **580** |
| **Byte-identical** | **468** |
| **Different** | **98** |
| Only in this repo | **44** |
| Only in the owner's repo | **14** |

Where the difference sits:

| Area | Different | Only here | Only there |
|---|---|---|---|
| `src/next/**` (the console) | **69** | **23** | **14** |
| `src/components/**` | 14 | 17 | 0 |
| `src/` root (`App.tsx`, `main.tsx`, `types.ts`, `index.css`, …) | 5 | 0 | 0 |
| `src/config/**`, `src/data/**`, `src/context/**` | 10 | 3 | 0 |

**This is the crux:** the two consoles are *different implementations of the same screens, with renamed
files*. The owner's repo carries `AdminAuditLogScreen/View`, `BrandCrmScreen/View`, `ControlCentreScreen/View`,
`FounderInvestorScreen/View`, `FulfillmentTrackScreen/View`, `MarketingHubScreen/View`, `PartnershipsScreen/View`;
this repo carries differently-named equivalents (`AdminAuditScreen/View`, `AdminCrmScreen/View`,
`AdminControlCentreScreen/View`, …) plus screens the owner's repo does not have at all
(`BrandCalendarScreen/View`, `VerticalPortfolioScreen/View`, `AdminHomepageEditorScreen/View`,
`ConsolePanels.tsx`, `adminPortfolio.ts`, `controlCentrePanels.ts`).

The owner's console is also **larger**: ~**48 screens** in Screen/View pairs (admin 48 files · brand 38 · BWS 4 ·
talent 4 · ads 2 · shared 2) with **95** navigation destinations declared in `src/next/navConfig.ts`.

---

## 4. WHICH SIDE IS NEWER, FILE BY FILE

For the **29** differing files **outside** `src/next`, the decision cannot be "the source always wins", because
this repo has done real work since the source's last commit (2026-11-26):

- **17 of 29 were changed here AFTER 26 Nov** — the public-page programme, the homepage contrast fixes, the
  menu/positioning work, the theme shim regeneration and §PHASE D's table migrations. These are **kept**, and the
  owner's UI changes are applied **to** them, never over them.
- **12 of 29 were last changed on or before 25 Nov** — for these the owner's repo is the newer code and is adopted.

The full per-file list and its date is produced by `node` over `git log` and recorded in the Phase 1 report; it is
not retyped here, because a retyped list is exactly what drifts (rule 10 §2).

---

## 5. WHAT MUST BE CARRIED OVER — THE 44 FILES THAT EXIST ONLY HERE

Adopting the owner's `src/` wholesale would **delete working capability**. These 44 are therefore classified
before anything is replaced:

| Group | Files | Why it exists | Planned disposition |
|---|---|---|---|
| Public-page imagery + content owners | `src/components/marketing/PublicImage.tsx` · `src/config/categoryGuides.ts` · `src/config/verticals.ts` · `src/content/mercenta.ts` | power the public pages built 27–28 Nov; the owner's repo predates them | **KEEP** (not console UI) |
| Lovable homepage components/assets | `src/components/lovable/**` (12 files incl. `ShipmentTracker`, `Wordmark`, image assets) | the homepage's tracker + imagery, taken from the Lovable design repo | **KEEP**, subject to decision D2 |
| Ads management surface | `src/components/ads/AdsManagement.tsx`, `src/components/ads/data.ts` | the admin ads surface; the owner's repo has its own `src/next/screens/ads` instead | **DECISION D2** |
| Port-only console screens | `src/next/**` — 23 files: `BrandCalendar*`, `VerticalPortfolio*`, `AdminHomepageEditor*`, `ConsolePanels.tsx`, `adminPortfolio.ts`, `controlCentrePanels.ts`, and the renamed `Admin*` screens | added by the port; **absent from the owner's frontend** | **DECISION D1** |
| Test harness | `src/testing/TestProviders.tsx` | used by the browser/unit tests | **KEEP** |

**The rule that governs every one of these:** capability must not be lost silently. Each is either kept, or its
loss is declared to the owner and recorded — never deleted as a side-effect of a swap.

---

## 6. THE ADOPTION PLAN — PHASES, EACH WITH A GATE

**Phase 0 — READ, COUNT, PIN (this session, done).** The owner's repo cloned read-only at `9f069f5`; the
comparison above measured; the source's dependency clash identified; this record written. Nothing in the product
changed. **Gate:** the counts in §3 are reproducible by a committed script.

**Phase 1 — DECIDE EVERY FILE, THEN BUILD THEIR APP.** A decision table for all 29 differing files outside
`src/next`, all 44 only-here files and the 14 only-there files (keep / adopt / declare-loss). Then prove the
owner's app **installs and builds** on this machine. **Gate:** the table exists and covers every file; their
build exits 0.

**Phase 2 — ADOPT `src/next/**` EXACTLY.** Replace this repo's console with the owner's console, file for file,
**unmodified**, plus the minimum wiring their `App.tsx` needs (`index.css`, `main.tsx`, the shell entries — each
edit on the declared list). **Gate:** the hash gate below.

**Phase 3 — THE HASH GATE (the proof that it is "exact code").** A manifest of every adopted file and its
SHA-256 is committed; a validator re-hashes the working tree and **fails** on any file that differs without being
on the declared edit list, and fails if an adopted file is missing. So "use the exact code" stops being a promise
and becomes a check that runs in the standard command. **Gate:** mutation-proven (edit an adopted file → FAIL →
restore byte-identical).

**Phase 4 — REPAIR THE TEST AND GATE LAYER.** 213 validators and the browser specs reference the port's file
names, ids and copy. Every one is repointed to the owner's code, or converted into an **absence guard** for the
retired names. **Gate:** `validate:all` green, and the port's names provably gone.

**Phase 5 — RENDER, COMPARE, THEN SWITCH.** Every adopted screen rendered at 1440, 768 and 390, captured and
compared with the owner's own screens; the owner reviews before the switch. The live site **stays as it is**
during this (owner's decision, 2026-11-28). **Gate:** rendered checks per screen; no uncaught errors.

**Phase 6 — PUBLISH AND RETIRE THE PORT.** Publish the verified build; then delete the port's leftovers with
absence guards, update the menu, the registry rows and the five project-state sources. **Gate:** the three-way
completion contract.

---

## 7. RISKS, STATED BEFORE ANY WORK STARTS

1. **Their repo needs one dependency fix — and it then builds.** `npm install` fails with `ERESOLVE`: their
   declared `esbuild ^0.25.0` conflicts with `vite 8.4`'s peer requirement `^0.27 || ^0.28`. With
   `--legacy-peer-deps` the install completes (**EXIT=0**) and **`npm run build` succeeds — `✓ built in 346ms`,
   `BUILD_EXIT=0`** (see §11). That is a declared, minimal change to *their* build config — not a UI change — and
   it is recorded as edit #1 on the declared list.
2. **Their repo has no tests, gates or backend.** Those stay ours, which means Phase 4 is genuinely large: every
   test that names the port must be repointed or retired with an absence guard.
3. **The domain layer is not identical.** `src/types.ts`, `src/data/*` (4 files), `src/context/GlobalStateContext.tsx`
   and `src/config/themes.ts` differ. Each carries either newer owner-side or newer local work and **must** be
   decided individually — a wrong choice here changes behaviour, not just appearance.
4. **Capability that exists only in the port** (Calendar, Vertical Portfolio, Homepage Editor, the control-centre
   panels) is absent from the owner's frontend. Dropping it loses working screens; re-implementing it is new work
   in the owner's code. That is decision **D1**.
5. **The owner's console is bigger than the port** (~48 screens vs the port's set), so the adoption adds surfaces
   that have never been verified in this product — each needs its own rendered check.

---

## 8. DECISIONS THE ADOPTION STILL NEEDS

- **D1 — the port-only screens** (`BrandCalendar`, `VerticalPortfolio`, `AdminHomepageEditor`, the control-centre
  panels): re-implement them inside the owner's console as later work, or withdraw them?
- **D2 — the ads surface and the Lovable homepage components**: keep them (they are not console UI), or replace
  them with the owner's equivalents?
- **D3 — the default**: the owner's `App.tsx` already defaults to the new console, so adopting it also settles the
  default. Confirm that is the intended shipping posture.

---

## 9. IMMEDIATE POSTURE (OWNER'S DECISION, 2026-11-28)

> *"Keep it live until the new frontend is wired, then switch."*

The live site therefore **stays exactly as deployed** (`4b20307`) while Phases 1–5 run. No further publish happens
until the owner's frontend is wired and rendered checks pass. That decision is recorded so no session reverses it
by accident.

---

## 10. WHAT THIS DOCUMENT DOES NOT CLAIM

- It does **not** claim the owner's frontend is bug-free or that it will build unmodified — the build proof is
  Phase 1's gate, not a conclusion drawn here.
- It does **not** claim the comparison is complete beyond `src/**`: `docs/`, `public/` and the build configs still
  need their own comparison in Phase 1.
- It does **not** claim any screen has been adopted yet. **Nothing in the product has been replaced.**

---

## 11. THE BUILD PROOF (2026-11-28, this machine)

Run in the reference clone only — never in the product:

```
npm install --legacy-peer-deps --no-audit --no-fund   →  EXIT=0
npm run build                                         →  ✓ built in 346ms · BUILD_EXIT=0
```

The only change required was the documented peer-dependency override; **no source file was edited**. The build
emitted only `INEFFECTIVE_DYNAMIC_IMPORT` notes (a bundling hint, not an error). This is the Phase 1 gate's
"their build exits 0" half, proven early — the decision table is still owed before adoption starts.