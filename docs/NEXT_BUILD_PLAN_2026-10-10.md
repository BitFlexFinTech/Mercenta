# NEXT BUILD PLAN — 2026-10-10 · REMOVALS, RULES AND THE DEEP-LINK FIX

> **STATUS: ✅ THE WHOLE PROGRAMME IS COMPLETE — NOTHING IN THIS PLAN IS LEFT PLANNED (closed out 2026-10-11,
> session 131).** BATCH 1 (Part 1, the two global rules + the editor root), BATCH 2 (Parts 2.1 + 2.2), BATCH 3
> (Parts 2.3 + 2.4), BATCH 4 (Part 2.5, the Mercenta Brain), BATCH 5 (Part 2.6, Mercenta Social), BATCH 6
> (Part 3.1, the catalogue product image) and BATCH 7 IN FULL — Part 4.1b + 4.2 + 4.3 (session 128: the
> work-drawer deep link, the dangling-brand seed fix, the three inert controls removed), Part 4.1a + Part 5.2
> (session 129, 2026-10-11: the notification bell's RECORD destinations — all fourteen item builders, routed
> through the ONE address layer — plus the DEEP-LINK GATE) and Part 5.1 + 5.3 (session 130, 2026-10-11) — **plus
> BATCH 8 = PART 6, THE CLOSE-OUT (session 131, 2026-10-11) — ARE ALL BUILT, TESTED AND CLOSED OUT.**
> **PARTS 1–6 ARE ALL DELIVERED.** Part 5: 5.1 added the four consolidated ABSENCE-GUARD groups (§2d–§2g) to the
> EXISTING `scripts/validate-retired-platforms.mjs` — 30 assertions, MUTATION-PROVED one per group — so that ONE
> file now guards every Part-2 removal; 5.3 added the rule-09 COVERAGE GATE (§6b of
> `scripts/validate-typecheck-coverage.mjs`), which DISCOVERS the covered roots from the four projects' own
> `include` arrays and fails if any `.ts`/`.tsx` belongs to no project (573 files discovered, 0 uncovered).
> **PART 6 (the close-out) IS DELIVERED — its evidence is in §PART 6 below. NOTHING IN THIS PLAN REMAINS.**
> This is the SINGLE PLAN OF RECORD. It supersedes `docs/NEXT_BUILD_PLAN_2026-09-27.md` as the plan to resume from.
> Its checklist is COMPLETE; the work that FOLLOWS this programme is named by `PROJECT_STATUS.md` →
> `CURRENT RESUME STATE` → `NEXT TASK`, and is deliberately NOT part of this plan.

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

> **ALL of Part 2 is ✅ DONE — 2.1 + 2.2 (Batch 2), 2.3 + 2.4 (Batch 3) and 2.5 (Batch 4) in session 125, and
> 2.6 (Mercenta Social) in Batch 5 (session 126) — and since session 130 EVERY one of them is guarded in ONE
> place: `scripts/validate-retired-platforms.mjs` §2b–§2g.**
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
- **2.6 — MERCENTA SOCIAL, COMPLETELY. ✅ DONE (Batch 5, 2026-10-10).** (owner directive: remove everything)
  DELETED (16 files): `src/config/mercentaSocial.ts`; `src/lib/social/` (workspace, engineAdapter, brandStatus,
  index); `src/lib/postiz/postizClient.ts`; `src/components/brand/MercentaSocial.tsx`;
  `src/components/brand/BrandSocialConnect.tsx`; `src/components/admin/PostizAdminPanel.tsx`;
  `supabase/functions/social-session/`; `scripts/social-sso/` (server + engine-patches);
  `scripts/validate-e7-embedded-social.mjs`; `scripts/validate-postiz.mjs`; `scripts/validate-social-simulation.mjs`;
  `e2e/embedded-social.spec.ts`. REPOINTED (every dependent): both shells (nav item, lazy import, breadcrumb,
  render branch); the integration registry + `types.ts` (provider entry, order, meta, initial state); data-processing
  (the `marketing-outreach` processor); operating costs (the `social` row); the theme accent token
  `--mr-feature-social`; `statusPresentation`'s social post-state helper; the investor-demo stage (24 stages now);
  the edge-function rate-limit table; `docker-compose.services.yml` (Postiz db/redis/engine + the `social-sso`
  service + volumes), `scripts/Caddyfile` (the engine snippet, vhost and sslip hostname), `deploy-docker.sh`,
  `vps-bootstrap.sh`, `forensic-screenshots.mjs`; the catalogue's 12 `social` rows (regenerated matrix);
  `reconcile-*` tools neutralised or repointed; and the docs. **ABSENCE GUARD (rule 08):**
  `scripts/validate-retired-platforms.mjs` §2c — 16 removed-file + 4 removed-directory + 21 live-marker assertions,
  mutation-proved; plus `validate-d4-persistence` O1/O2, `validate-admin-shell-bundle`, `validate-workspace-shell`,
  `validate-investor-demo`, `validate-operating-costs`, `validate-e6-brand-surfaces` F8 and the browser specs
  (`e2e/retired-platforms.spec.ts`, `app-shell`, `integration-hub`, `redesign-surfaces`, `investor-demo`).

## PART 3 — THE CHANGES

- **3.1 — Catalogue product image 32px → 64px.** ✅ **DONE (BATCH 6, session 127, 2026-10-10).** Delivered
  through the single owner `src/components/shared/ProductThumb.tsx`, which `ProductCatalog.tsx` (~281) renders at
  `size={64}`. Its placeholder glyph/icon WAS hard-coded (`text-lg` / `h-5 w-5`) and now SCALES with the size
  (`Math.round(size * 0.5625)` / `Math.round(size * 0.625)`), and the 390px width that Wave-3 Part 4 fixed is
  RE-VERIFIED — as a STANDING gate in `e2e/redesign-surfaces.spec.ts`, not a one-off. Gates:
  `scripts/validate-uiux-redesign.mjs` §WAVE 3 PART 3.1 (5 assertions, mutation-proved four ways) and the new
  live probe `scripts/verify-live-demo.mjs` **L32** (measured 64×64 on the deployed site).

## PART 4 — THE DEFECTS (fix, each with a gate)

- **4.1 — Click-through destinations (ONE shared fix).** The platform already owns the mechanism
  (`navigateProductView(environment, view, query)` + `currentQueryParam(key)` in `src/lib/runtime/productRoutes.ts`)
  and it is wired to exactly ONE button today. Apply it to: (a) the **notification bell** — 5 of its 14 item types
  currently do NOTHING when clicked (contract, score, submission, deduction, compliance) and the other 9 land on a
  SECTION, never the record; (b) the **work drawer's "Open record"** — filed by the patrol as `iss_a82e04e941f9`:
  it opens the PO LIST rather than PO-9200.
  **✅ DONE.** (4.1b) session 128. **(4.1a) session 129 (2026-10-11)** — every one of the fourteen item builders now
  carries a REQUIRED typed destination `{ kind, view, id }`; the record-link query keys are declared ONCE
  (`productRoutes.ts → RECORD_LINK_PARAMS`) and read by ONE reader (`recordDeepLink.ts → useRecordDeepLink`, which
  re-reads the address on `popstate` — fixing the mount-only capture the first version shipped with). Gate:
  `scripts/validate-batch7-deeplinks.mjs` (36 assertions, mutation-proved four ways). Browser:
  `e2e/notification-deeplinks.spec.ts` (4 tests). The five **inert** types now go somewhere real; the score notice is
  ADMIN-ONLY because no brand surface owns a score; the brand's invoice notice opens the PO the invoice was raised
  against because the brand portal has no per-invoice surface (both recorded, not hidden).
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
  **✅ DONE (session 130, 2026-10-11)** — four new groups beside the existing §2b/§2c: **§2d** the Consolidation card
  on BOTH logistics surfaces (owner lib + unmounted panel KEPT), **§2e** the interactive operational map on BOTH
  surfaces (derivation KEPT), **§2f** the Logistics Hero and its whole pipeline (8 files + `.geo-cache` + the two
  npm scripts + the `.gitignore` block + a comment-stripped whole-`src` scan), **§2g** the Mercenta Brain (5 files
  + 2 directories + the shell + Brand Intelligence): **30 assertions**, MUTATION-PROVED **one mutation per group**
  (mount the panel ⇒ §2d FAIL · re-mount the canvas ⇒ §2e FAIL · re-create `logisticsHeroGeo.ts` ⇒ §2f FAIL ·
  re-add a `brain` nav id ⇒ §2g FAIL), every file restored byte-identical. The file's header now declares the
  consolidated §2b–§2g record and cross-references the heavier specialist guards.
- **5.2 — Deep-link gate:** fails if any clickable item has no destination, points at a view the shell cannot
  render, or forgets the record it names.
  **✅ DONE (session 129, 2026-10-11)** — `scripts/validate-batch7-deeplinks.mjs` (36 assertions). It reads the
  comment-stripped source, the ONE registry, the ONE reader, and BOTH shells' render branches (so "a view the shell
  cannot render" is checked against the shell's real renderable set, never a hand-written list). Mutation-proved FOUR
  ways: a builder with no destination ⇒ FAIL; an unrenderable destination view ⇒ FAIL; a click that forgets the
  record id ⇒ FAIL; a surface re-owning the reader ⇒ the repointed `validate-batch7-cleanup` FAIL. Every mutation
  restored byte-identical.
- **5.3 — Coverage parity:** keep `validate:typecheck-coverage` green and pin the editor (1.4) so the editor and
  the command line cannot disagree again.
  **✅ DONE (session 130, 2026-10-11)** — `scripts/validate-typecheck-coverage.mjs` gained **§6b, the rule-09
  COVERAGE GATE**: it DISCOVERS the covered roots from the four projects' own `include` arrays (app · node · e2e ·
  functions) and FAILS if any `.ts`/`.tsx` in the tree belongs to no project — **573 files discovered, 0 uncovered**,
  MUTATION-PROVED by creating `scripts/coverage-probe.ts` (1 FAIL) then deleting it. The gate now runs 25 assertions;
  the committed editor pin (`.vscode/settings.json`, workspace-relative `typescript.tsdk`) was already green and
  stays pinned by three assertions. **The registry note that claimed the gate ran "20 assertions" was corrected at
  source (rule 07).**

## PART 6 — CLOSE-OUT (mandatory) — ✅ **DONE (BATCH 8, session 131, 2026-10-11)**

- ✅ **6.1** Keep `PROJECT_STATUS.md` updated after EVERY batch (this plan is the tracked checklist).
  **DONE** — each of Batches 1–8 carries its own `## CURRENT PLATFORM POSITION` section, and this close-out adds
  the Batches 1–8 ROLL-UP as ONE programme-complete section on top of them.
- ✅ **6.2** Update all five state sources (`PROJECT_STATUS.md`, `HANDOFF.md`, `STATUS_CHECK.md`,
  `requirements-registry.json`, sprint record).
  **DONE** — `PROJECT_STATUS.md` (resume block + headings 1–9) · `HANDOFF.md` (mirror of the resume block) ·
  `STATUS_CHECK.md` (a new §BATCH 8 section; the previous sections marked SUPERSEDED) · `requirements-registry.json`
  (`_meta.last_updated` → 2026-10-11, the recomputed `status_counts` note, the new
  `_meta.programme_2026_10_10_closeout` programme record · and EVERY stale statement the close-out exposed
  corrected at source — rule 07: the TWO citations that still said "only BATCH 8 = Part 6 remains", ONE
  `PROJECT_STATUS.md` heading that had lost its SUPERSEDED marker, and the picture-comparison row's claim that the
  screenshots are committed (with the generator script that produces that row and the gap analysis's D-4 row it
  cites), and the FIVE carrier-as-a-live-branch claims the owner's own challenge exposed (ARCHITECTURE.md · the
  gap analysis's D-8 · RUNTIME_PARITY_PLAN · MERCENTA_MASTER_CONTEXT · one stale PROJECT_STATUS bullet) · **the
  sprint record**. A SIXTH defect found while checking — `scripts/verify-registry.mjs` reading nav arrays that exist
  nowhere, making its reachability check vacuous — is repointed to discover the shells that exist (40 nav ids) with a
  self-check that fails if the discovery returns nothing.
  **NOTE, stated plainly rather than papered over:** this programme has NO separate `docs/SPRINT_*.md` file. The
  repository's record of it is **THIS plan document plus the `STATUS_CHECK.md` `§BATCH 1 … §BATCH 8` sections** —
  the convention every programme has followed since 2026-10-04 (the last `docs/SPRINT_*` records are in
  `docs/archive/`). A sixth, parallel sprint document was deliberately NOT created, because a second record of the
  same work is a second source of truth that drifts; both of the real records ARE updated.
- ✅ **6.3** `npm run typecheck` · `npm run lint` · `npm run build` · `npm run validate:all` — before/after counts.
  **DONE** — BEFORE (tree at `e581d05`) → AFTER (this close-out): `typecheck` **0 → 0** · `lint` **0 → 0** ·
  `build` **ok → ok** · `validate:all` **187 PASS / 0 FAIL → 187 PASS / 0 FAIL**. Identical BY CONSTRUCTION,
  because this batch changes no application file at all — nothing under `src/`, `e2e/` or the built app. The ONE
  executable file it touches is an EXISTING gate script, `scripts/validate-no-stale-blockers.mjs`, which was
  EXTENDED with this close-out's own assertions (tooling, not application runtime) — and the AFTER figures are a
  real re-run of both commands, not a copy of the BEFORE ones.
- ✅ **6.4** Commit · push · deploy to the demo · open it · verify live · confirm local = GitHub = demo.
  **DONE, with the deploy leg NOT APPLICABLE** (`operating-model.md` §10.4): committed and pushed to
  `origin/redesign/foundation` (the exact hashes are in `PROJECT_STATUS.md` → `CURRENT RESUME STATE`), and because
  NO file the demo serves changed in this batch there was nothing to deploy — the demo still carries the last
  verified product commit **`c026524`**, whose live verification was **276 PASS / 0 FAIL**. **THREE-WAY STATUS:
  NOT APPLICABLE (no application runtime change)** — recorded here so no reader mistakes this close-out for a
  deployment, and so no later session invents one.
- ✅ **6.5** Export the review zip (ONE file, overwritten) · confirm `git status --porcelain` prints nothing.
  **DONE** — the ONE `Review Zip/mercenta-review.zip` was re-exported (the script's credential guard PASSes: no
  `.env` and no gitignored private/generated tree inside), and `git status --porcelain` prints NOTHING at the
  recorded checkpoint.

## EXECUTION ORDER

**Batch 1** Part 1 (rules + editor) → **Batch 2** 2.1 + 2.2 → **Batch 3** 2.3 + 2.4 → **Batch 4** 2.5 (Brain)
→ **Batch 5** 2.6 (Social) → **Batch 6** 3.1 (image) → **Batch 7** Part 4 + the new gates → **Batch 8** Part 6.

Batches 1–6 are DONE (2026-10-10); Batch 7 is DONE IN FULL — Parts 4.1b/4.2/4.3 (session 128, 2026-10-10, gated by
`scripts/validate-batch7-cleanup.mjs` + `e2e/work-layer.spec.ts` test 11), Part 4.1a + Part 5.2 (session 129,
2026-10-11, gated by `scripts/validate-batch7-deeplinks.mjs` + `e2e/notification-deeplinks.spec.ts`) and Part 5.1 +
5.3 (session 130, 2026-10-11: the consolidated absence guards §2d–§2g of `scripts/validate-retired-platforms.mjs`
and the §6b coverage gate of `scripts/validate-typecheck-coverage.mjs`). **Batch 8 = Part 6 (the close-out) is DONE
TOO (session 131, 2026-10-11): the five state sources were reconciled onto this plan and `PART 6` above carries its
before/after evidence. THE WHOLE EXECUTION ORDER IS THEREFORE COMPLETE AND NOTHING HERE REMAINS.** The work that
follows this programme is NOT in this plan — it is named by `PROJECT_STATUS.md` → `CURRENT RESUME STATE` →
`NEXT TASK` in the resume block. **§CORRECTED 2026-10-12:** this sentence used to name `WAVE 3 PART 6`, the visual-regression gate, as the work that follows AND as waiting on ONE Founder decision — **the OWNER CLOSED IT that day**: "i still have no idea what this picture thing is man, its really annoying and seems to be going off the actual build. you are making things complicated for nothing. i told you im not technical and i just want you to complete the build." It is **NOT part of the build**, its baseline-policy question is **WITHDRAWN**, its row is `deferred`, and no session may raise it with him again.

Each batch ends with its own BUILT / TESTED / RESULT / NEXT and real command output, and updates
`PROJECT_STATUS.md`, so a session that stops mid-way resumes from the checklist and never from memory.
