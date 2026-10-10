# NEXT BUILD PLAN — 2026-10-10 · REMOVALS, RULES AND THE DEEP-LINK FIX

> **STATUS: BATCH 1 (Part 1), BATCH 2 (Parts 2.1 + 2.2), BATCH 3 (Parts 2.3 + 2.4) and BATCH 4 (Part 2.5, the
> Mercenta Brain) BUILT AND TESTED (session 125, 2026-10-10) — Parts 2.6 and 3–6 remain PLANNED, NOT STARTED.**
> This is the SINGLE PLAN OF RECORD. It supersedes `docs/NEXT_BUILD_PLAN_2026-09-27.md` as the plan to resume from.
> Resume by reading `PROJECT_STATUS.md → CURRENT RESUME STATE`, then **start at BATCH 5**.

## PART 0 — ALREADY DONE (recorded so it is not re-planned)

- **Bug-patrol is a machine-wide tool.** `~/.agents/skills/bug-patrol/` (SKILL.md + discovery helper) makes the
  phrase **`bug patrol`** work in ANY project: it discovers the project, its start command and its pinned dev
  port, writes a look-only config (repairer OFF, GitHub OFF, one cycle, spend cap), drives the app, reports,
  and then we fix at source.
- **Key stored once, machine-wide, outside every project:** `~/.cline/secrets/bug-patrol.env`
  (`BUGPATROL_OPENROUTER_KEY`, mode 600). Never printed, never in a project, never in a zip.
- **Two global rules installed** (both folders, byte-identical, in `RULES-MANIFEST.json`): `bug-patrol.md`
  and `no-manual-work-for-owner.md`.
- **Mercenta dev-port defect FIXED at source:** the project pinned NO port and sat on Vite's default 5173 —
  already owned by TSL-Zimbabwe — and a stale dev server had silently slid onto 5182. Now `vite.config.ts` =
  `server: { port: 5182, strictPort: true }`, with `playwright.config.ts`, `scripts/runtime-sweep.mjs`,
  `scripts/Caddyfile`, 18 e2e comment references, `docs/MERCENTA_BASELINE.md` and `~/.cline/DEV_PORTS.md` all
  updated. Checker: `5182 strictPort ~/Desktop/1. Mercenta`.
- **First look-only patrol run:** 41 steps · 10 screens · 2 major issues filed, 2 dismissed as noise, ~9p spent.

## PART 1 — GLOBAL RULES AND THE EDITOR ROOT FIX (Batch 1) — ✅ **DONE (session 125, 2026-10-10)**

> **Completed.** `08-removal-coherence.md` and `09-editor-and-cli-agree.md` are installed byte-identical in BOTH
> global rules folders, registered in `RULES-MANIFEST.json` (rules + `requiredMarkers`); `check-rules.mjs` reports
> **25 rules, 0 fail** (markers mutation-proved). The editor root is fixed and gated: the machine-wide VS Code
> `typescript.tsdk` pin (workspace-relative) + the committed project `.vscode/settings.json` (+ its `.gitignore`
> exception), with **3 new assertions** in `scripts/validate-typecheck-coverage.mjs`. Two pre-existing validator
> failures were fixed at source (the E6 `.vscode/` scope declaration; the resume block's standing credentials
> decision). `npm run validate:all` **189 PASS / 0 FAIL**. Work commit `10fa22b`.

- **1.1 — Global rule `08-removal-coherence.md`.** Removing something means updating EVERY dependent in the
  same change; a check that asserted the removed thing is REWRITTEN into an **ABSENCE GUARD** (never deleted,
  never weakened); the guard is wired into the project's standard validation command and proved able to fail.
- **1.2 — Global rule `09-editor-and-cli-agree.md`.** Every source file belongs to a declared project; the
  editor uses the project's toolchain version; a COVERAGE GATE proves it; the standard command DISCOVERS its
  gates; an editor-only count is a real finding — never dismiss a count as "just the editor".
- **1.3 — Install both** in `~/.cline/rules/` AND `~/Documents/Cline/Rules/` byte-identical, registered in
  `RULES-MANIFEST.json` `rules[]` **plus `requiredMarkers`**; prove with `check-rules.mjs` (expect 25 rules, 0 fail).
- **1.4 — Editor root fix for the "416 problems" count:** set the TypeScript copy the editor uses as a
  **workspace-relative** path in the machine-wide VS Code settings (so EVERY project uses its own toolchain),
  plus a committed `.vscode/settings.json` here. Half 1 of that defect is already fixed and gated:
  `validate-typecheck-coverage` passes (20 assertions, 127 files outside src now covered).

## PART 2 — REMOVALS (each with its absence guard)

> **2.1, 2.2 (Batch 2), 2.3, 2.4 (Batch 3) and 2.5 (Batch 4) are ✅ DONE (session 125, 2026-10-10); 2.6 remains.**
> Each removal was repointed into an ABSENCE GUARD (rule 08) and mutation-proved (re-introduce → FAIL →
> restore byte-identical).

- **2.1 — "How this works" card. ✅ DONE.** ONE deletion in `WorkWorkspace.tsx` (it sat outside the view
  switches, so it cleared BOTH Calendar and Tasks & Deadlines — `CommercialReadiness`'s own card was left alone).
  Guard: `scripts/validate-retired-platforms.mjs` §2b.
- **2.2 — Consolidation card, BOTH surfaces. ✅ DONE.** Removed from `LogisticsHub.tsx` and `LogisticsControl.tsx`.
  **The canonical owner `src/lib/shipping/consolidation.ts` STAYS** — programme decision 11 ("deferred, not
  designed out") is a recorded Founder decision; removing a card is not removing a decision (the now-unmounted
  `ConsolidationPosturePanel` stays too, declared in `validate-dead-code`'s unwired allowlist). Guards:
  `scripts/validate-logistics-providers.mjs` §9a, `e2e/logistics-providers.spec.ts` (tests 3 and 5 rewritten),
  and the `verify-demo-live.mjs` probes repointed to absence.
- **2.3 — Operational map, BOTH surfaces. ✅ DONE (Batch 3).** The `LogisticsMapCanvas` mount was removed
  from `LogisticsHub.tsx` and `LogisticsControl.tsx`, and the canvas component was DELETED. **VERIFIED, NOT
  ASSUMED:** `src/lib/logistics/operationsMap.ts` is STILL USED — the consignment list and the consignment
  inspector on BOTH surfaces read `buildOperationalMap` (truth classification, carrier validation, freight
  semantics, stage) — so the derivation was KEPT and only its map-only helpers (`truthPresentation`,
  `isLegInMotion`) were dropped. `validate-logistics-map.mjs` gained 6 §BATCH3 absence guards (74 → 80
  assertions) and `e2e/logistics-hub-map.spec.ts` was rewritten as the matching absence guard. The admin
  inspector would otherwise have become unreachable (the map was its only selector), so the per-brand
  `DataTable` now drives it via `onRowClick`.
- **2.4 — Logistics Hero (the "fixed camera · non-interactive map") and its whole pipeline. ✅ DONE (Batch 3).**
  DELETED: `shared/logistics/LogisticsHero.tsx`, `LogisticsHeroScene.tsx`, `src/lib/logistics/heroNetwork.ts`,
  `src/config/logisticsHero.ts`, `src/data/logisticsHeroGeo.ts`, `scripts/build-logistics-hero-geo.mjs`,
  `scripts/validate-logistics-hero.mjs`, `e2e/logistics-hero.spec.ts`, and the `.geo-cache/` it built (plus its
  `.gitignore` block and its two `package.json` scripts). The hero mount + `heroLegs` left `LogisticsHub.tsx`.
- **2.5 — MERCENTA BRAIN, COMPLETELY. ✅ DONE (Batch 4, session 125, 2026-10-10).**
  (owner directive: it serves no purpose) DELETED: `src/components/admin/MercentaBrain.tsx`;
  `src/components/shared/brain/` (BrainCanvas, BrainCanvas3D, BrainScene); `src/lib/intelligence/brain/`
  (buildGraph, layout, layout3d, project, types); `src/components/brand/BrandRelationshipMap.tsx` + its
  import/mount in `BrandIntelligence.tsx` (**this one component is BOTH of the owner's requests #1 and #7** —
  "Your records, connected" and the long entity list in Market Intel); `AdminShell.tsx` lazy import + nav item +
  Super-Admin allowlist + breadcrumb + route; `scripts/validate-mercenta-brain.mjs` + its `package.json` script
  entry; `e2e/mercenta-brain.spec.ts`; the scenario-catalogue rows + regenerated coverage matrix; registry rows;
  docs; and the SIX stale comments that still describe the Brain as a live projection (`App.tsx:28`,
  `demoStore.ts:234/468/510`, `prospectStore.ts:115`, `canonicalSignal.ts:6/16`).
  **Side effect: the filed patrol issue `iss_f301a06913ba` (Brain WebGL crash + stale error card) is resolved by
  removal — nothing to fix.**
  **DONE (Batch 4):** 13 files DELETED (the surface, 3 renderers, the 5 graph modules, the brand relationship
  graph, the 2 Brain-only hooks and the runtime harness); `AdminShell.tsx` lost the lazy import, nav item,
  Super-Admin allowlist entry, breadcrumb and render branch; `BrandIntelligence.tsx` lost the graph mount; the
  seven stale "Brain as a live projection" comments were repointed (`App.tsx`, `demoStore.ts` ×3,
  `prospectStore.ts`, `canonicalSignal.ts` ×2, `operationsMap.ts` — one MORE than the six this plan named);
  `validate-mercenta-brain.mjs` REWRITTEN as an 18-assertion ABSENCE guard; `e2e/mercenta-brain.spec.ts`
  rewritten as a 4-test browser absence guard; `validate-canonical-propagation` (S4/R2), `validate-product-routes`,
  `validate-functional-parity` (F4b), `validate-admin-shell-bundle`, `validate-typecheck-coverage`,
  `verify-live-demo` (L26) and the E6/E7 scope unions all repointed; the 11 `op-brain-*` scenario rows removed and
  the matrix regenerated; 9 registry rows marked `removed` + 7 citations repointed; 3 docs bannered SUPERSEDED; the
  two old reconcile tools neutralised. **Defect found and FIXED at source (rule 07):**
  `e2e/canonical-propagation.spec.ts` still drove the map testids DELETED in Batch 3 (`admin-logistics-map`,
  `logistics-map`, `data-visible-count`) — an inherited defect that would have failed — now repointed to the
  canonical consignment list. Guards mutation-proved (source guard: re-created module → FAIL 1/18 + propagation
  20/22 → removed → 18/18 + 22/22; browser guard: nav item re-added → 2 FAILED → removed → 4 passed).
- **2.6 — MERCENTA SOCIAL, COMPLETELY** (owner directive: remove everything): `src/config/mercentaSocial.ts`;
  `src/components/brand/MercentaSocial.tsx`; `BrandSocialConnect.tsx`; the `social` nav item + route + breadcrumb
  in `BrandShell.tsx`; `supabase/functions/social-session/`; `scripts/social-sso/server.mjs`; the service in
  `docker-compose.services.yml`; the SSO block in `scripts/Caddyfile`; `scripts/validate-e7-embedded-social.mjs`;
  `e2e/embedded-social.spec.ts` + its `e2e/app-shell.spec.ts` assertions; the scenario-catalogue rows; the
  registry rows; the `social` row in `src/config/operatingCosts.ts`; the investor-demo entries
  (`src/lib/simulation/investorDemo.ts`); docs.

## PART 3 — THE CHANGES

- **3.1 — Catalogue product image 32px → 64px.** `ProductCatalog.tsx` (~281) via the single owner
  `src/components/shared/ProductThumb.tsx`. Its placeholder glyph/icon must SCALE with the size (today the icon
  is hard-coded `h-5 w-5`, which would look broken at 64px), and the 390px width that Wave-3 Part 4 fixed must be
  RE-VERIFIED so enlarging the image cannot re-break the table.

## PART 4 — THE DEFECTS (fix, each with a gate)

- **4.1 — Click-through destinations (ONE shared fix).** The platform already owns the mechanism
  (`navigateProductView(environment, view, query)` + `currentQueryParam(key)` in `src/lib/runtime/productRoutes.ts`)
  and it is wired to exactly ONE button today. Apply it to: (a) the **notification bell** — 5 of its 14 item types
  currently do NOTHING when clicked (contract, score, submission, deduction, compliance) and the other 9 land on a
  SECTION, never the record; (b) the **work drawer's "Open record"** — filed by the patrol as `iss_a82e04e941f9`:
  it opens the PO LIST rather than PO-9200.
- **4.2 — `brand-regatta` dangling seed.** PROVEN: the demo universe holds only FOUR brands (Astonish, Tapatío,
  Le Creuset, Kit & Kin) and **no `brand-regatta` record exists**, yet `src/lib/warehouse/returnsTracking.ts`
  (`rt-003`) and `src/lib/helpdesk/ticketStore.ts` (`tkt-004`) reference it, so the lookup falls back to the raw id
  and the Returns queue shows `brand-regatta`. Fix at source (point the seeds at a real brand, or render an honest
  label) + a gate.
- **4.3 — Inert controls (REMOVE).** `AccountingPanel.tsx` "Sync Now" (~620) and "Sync Costs" (~916) have NO handler
  (verified: no `<form>`, `Button` defaults to `type='button'`), so they become enabled and do nothing; and
  `DesignSystemShowcase.tsx` "Manage" (~262). Wiring a Xero sync is a separate feature.

## PART 5 — THE GATES

- **5.1 — Absence guards** for every Part 2 removal, added as assertion groups to the EXISTING
  `scripts/validate-retired-platforms.mjs` (which already runs inside `validate:all` — that script globs every
  `scripts/validate-*.mjs`, so no hand-list needs editing).
- **5.2 — Deep-link gate:** fails if any clickable item has no destination, points at a view the shell cannot
  render, or forgets the record it names.
- **5.3 — Coverage parity:** keep `validate:typecheck-coverage` green and pin the editor (1.4) so the editor and
  the command line cannot disagree again.

## PART 6 — CLOSE-OUT (mandatory)

- **6.1** Keep `PROJECT_STATUS.md` updated after EVERY batch (this plan is the tracked checklist).
- **6.2** Update all five state sources (`PROJECT_STATUS.md`, `HANDOFF.md`, `STATUS_CHECK.md`,
  `requirements-registry.json`, sprint record).
- **6.3** `npm run typecheck` · `npm run lint` · `npm run build` · `npm run validate:all` — before/after counts.
- **6.4** Commit · push · deploy to the demo · open it · verify live · confirm local = GitHub = demo.
- **6.5** Export the review zip (ONE file, overwritten) · confirm `git status --porcelain` prints nothing.

## EXECUTION ORDER

**Batch 1** Part 1 (rules + editor) → **Batch 2** 2.1 + 2.2 → **Batch 3** 2.3 + 2.4 → **Batch 4** 2.5 (Brain)
→ **Batch 5** 2.6 (Social) → **Batch 6** 3.1 (image) → **Batch 7** Part 4 + the new gates → **Batch 8** Part 6.

Batches 1, 2, 3 and 4 are DONE (session 125, 2026-10-10). **Next: Batch 5 (2.6, Mercenta Social).**

Each batch ends with its own BUILT / TESTED / RESULT / NEXT and real command output, and updates
`PROJECT_STATUS.md`, so a session that stops mid-way resumes from the checklist and never from memory.
