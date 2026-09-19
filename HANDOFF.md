---
**Last updated: September 19, 2026 — ✅ FINAL DETERMINISTIC COMPLETION SPRINT — SPRINT 2 — CURRENT CHECKPOINT.**

**Repository state:** repo `/Users/tadii/Desktop/1. Mercenta`, branch `redesign/foundation`, starting HEAD
`7983a88` (sprint 1's checkpoint). Protected baseline `959b4d2` confirmed an **ancestor**. No
reset/stash/clean/amend/branch-switch/force-push/rewrite. No deploy, no credential added or activated,
**zero live provider calls**, no protected design asset modified, renamed or added to git. One
checkpoint commit created at the end of this sprint (exact hash in the closing session report).

**Canonical report: `docs/SPRINT_DETERMINISTIC_COMPLETION_2026-09-19.md`.** This sprint finishes the
scope sprint 1 explicitly left PARTIAL. The sprint-1 handoff block below is retained as history.

- **BUILT — the deterministic PROACTIVE REMINDER RUNNER (§16)** that sprint 1 left missing:
  `src/lib/work/reminderRunner.ts` — an explicitly-invoked, idempotent sweep over the canonical work
  items. **No `setInterval`/`setTimeout` anywhere**, no `Math.random()`, no `Date.now()` ids;
  `sweptAt` is the pinned demo clock; boundary keys are `"<workItemId>|<bucket>"` so a repeat sweep
  raises **0** and reports the boundaries as suppressed. Resolving the underlying work item removes
  its reminder in the same tick (reopening restores it); dismissal is audited and cannot re-raise.
  Emits canonical `reminder_raised` events + audit rows, and declares a scheduler seam
  (`describeReminderSweep()` — cadence, entry point, idempotency key, networkCalls 0).
  Surfaced in `WorkWorkspace`: a **REMINDERS** view, a **Run reminder sweep** control
  (`work-run-reminders`) with a live sweep report (`work-sweep-report`), a "Reminders active" metric
  tile and a context panel.
- **BUILT — the two missing derivations.** `invoice_due` (§17): an issued invoice with no settled
  payment → exactly one `work-invoice_due-<invoiceId>` item with the declared 30-day deadline; the
  canonical payment resolves it. `onboarding_step` (§18): the FIRST incomplete step of a real
  onboarding record → `work-onboarding_step-<onboardingId>-<stepId>` with the declared per-step SLA
  deadline; completing the step advances it, completing the onboarding removes it.
- **BUILT — ALL remaining core surfaces migrated (§6–§15).** `uiux-wave2-core-surfaces-remaining` is
  now **`built_and_tested`**: admin Brand Intelligence, brand Market Intelligence, Ad Spend,
  Accounting, Super Admin, Integrations, Onboarding Tours, and the admin CRM / Catalogue / Logistics
  / Communications panels. Each composes `WorkspaceFrame` · `WorkspaceHeader` (sticky toolbar) ·
  `MetricBand` with real drill-downs · `WorkspaceSection` · `ContextPanel`/rail, with real filtering
  and honest empty states; **no bespoke `max-w-[1400px] mx-auto` composition remains** (asserted).
  Logistics / Accounting / Communications / Super Admin consume the SAME work layer — no second task
  system.
- **BROWSER VERIFIED — the thing sprint 1 could NOT claim.** NEW `e2e/deterministic-journey.spec.ts`,
  **5/5 passing in real Chromium**: the 13-step investor journey end to end (the `invoice_due` item
  appears on invoice issue and disappears on payment; the reminder sweep raises then raises 0 on
  repeat); the exception journey (occur → work item → notification → drawer → brand cannot resolve →
  operator resolves → item gone → audit row); reset + repeatability (identical counts); tenant/RBAC
  isolation (Brand B sees none of Brand A); and the `onboarding_step` derivation live. Every test
  asserts **zero page errors and zero external calls**. Screenshots in
  `test-screenshots/deterministic-journey/`.
- **REAL DEFECTS FIXED:** metric-band raggedness (5 tiles in a 4-column band → composed 4 + 2); FOUR
  text collisions the migrations introduced, caught by the FULL suite and fixed in the **product**
  (Super Admin's description contained "simulation" and made `click('text=Simulation')` ambiguous —
  **34 specs** broke → reworded to "provider state"; "Connecting Amazon Ads" created a second
  matching heading; the Ads basis panel duplicated `7/20`; BI tier `<option>`s rendered `T1`…`T4`
  ahead of the tiles); plus `layout-audit` empty-state coverage for `AdminAuditLog` and
  `CatalogManagerAdmin`.
- **TESTS REPOINTED, NOT WEAKENED:** `e2e/integration-hub.spec.ts` (tiles are now the canonical
  MetricBand tiles — same read-back-and-compare invariant, `aria-pressed` preserved) and 6 specs whose
  page identity moved from a bespoke `<h2>` to the canonical `WorkspaceHeader` `<h1>`
  (`locator('h2', …)` → `getByRole('heading', …)`). All carry inline `§Sprint 2 REPOINT` comments.
- **GATES:** tsc **0** · eslint **0** · build **PASS** · wording **PASS (242 files)** ·
  `validate-work-layer` **PASS (108 assertions; was 49)** · `validate-uiux-redesign` **344/0** (was
  306) · integrity-audit **61/0** · `validate-e7` **PASS (121)** · validator sweep **79 PASS / 1
  FAIL** · registry **243 → 250 entries**, `verify-registry` **exit 0**, **issues 124 → 124 and
  reachability flags 15 → 15 (ZERO new flagged entries)** · **FULL Playwright: 351 passed / 0 failed
  / 2 skipped (13.8m; 353 collected — sprint 1 was 346/0/2)** · NEW journey spec **5/5**.
- **Only failing gate:** `validate-e6-brand-surfaces` **F6**, failing ONLY on the **5 pre-existing
  offenders** (`ave1-check.mjs` + the 4 protected `design/*.png`) — unchanged; this sprint's files are
  declared via the new `SPRINT_DETERMINISTIC_COMPLETION_SCOPE` set (same guard mechanism, a file
  outside every declared set is still refused). `validate-stage26.mjs` prints ✗ but exits 0, proven
  pre-existing at `ea700a1`. `layout-audit.mjs`'s remaining failure is the pre-existing undefined
  `text-brass-200` class in `AcquisitionWorkflow.tsx` (out of scope — fixing it would change styling).
- **NOT done:** no deploy (not requested); Rakazo untouched; no Supabase/D1 migration; no Jev/Monid
  work; Social Media workstream unchanged. Every external provider remains deterministic simulation —
  activating one is a documented credential step, not missing functionality.

---

**Last updated: September 19, 2026 — ✅ DETERMINISTIC PLATFORM COMPLETION SPRINT (sprint 1, work/task + calendar operating layer) — SUPERSEDED, RETAINED AS HISTORY.** *(This block reported PARTIAL. Sprint 2 above closes the scope it left open: the reminder runner, `invoice_due`, `onboarding_step`, all remaining surfaces, and the browser-re-driven journey.)*

**Repository state:** repo `/Users/tadii/Desktop/1. Mercenta`, branch `redesign/foundation`, starting HEAD
`ea700a1`, protected baseline `959b4d2` confirmed an **ancestor**. No reset/stash/clean/amend/
branch-switch/force-push. No deploy, no credentials, no live provider call, no protected design asset
modified or added to git. One checkpoint commit created at the end of this sprint (hash recorded below
and in `PROJECT_STATUS.md`).

**Checkpoint commit:** `7983a88fce3e5d0425b4ac258e1532d485da2b17` (`7983a88`) — created at the end of this
sprint on `redesign/foundation`. Parent: `ea700a1`. Protected baseline `959b4d2` verified still an
ancestor. 252 files, +18694/−1585. Deliberately NOT committed: the four untracked protected
`design/*.png` assets and the stray 0-byte `ave1-check.mjs` (so the e6 F6 offender set is unchanged).
No `.env`, no generated `dist/`, no credential of any kind.

**Canonical report: `docs/SPRINT_WORK_LAYER_2026-09-19.md`.** Headlines:

- **BUILT — the canonical operating layer that was missing** (`§5`/`§6`/`§14`/`§22`):
  `src/lib/work/{types,workStore,calendar,useWork}.ts` + `src/components/shared/WorkWorkspace.tsx`
  (LIST · KANBAN · CALENDAR, metric band, record drawer, context rail, real task creation) +
  `src/components/admin/WorkManagement.tsx` + `src/components/brand/WorkManagement.tsx`, wired into
  both shells (new **Operations** nav section), RBAC-allowlisted, with nav attention/overdue badges, a
  notification-centre work projection and two new canonical event types
  (`work_item_raised`, `work_item_resolved`). Work is **derived from real canonical records** with
  deterministic ids and declared deadlines; **resolving an item stops its reminders** (proven in the
  validator and in Chromium).
- **BUILT (PARTIAL) — remaining-surface migration:** Billing and Admin Audit Log migrated to the
  workspace architecture. Eight surfaces remain (Brand Intelligence ×2, Ad Spend, Accounting, Super
  Admin, Integrations, Onboarding Tours, admin CRM/Catalogue/Logistics/Communications) — tracked by
  `uiux-wave2-core-surfaces-remaining`, **still `not_started`**, partial progress recorded.
- **REAL DEFECTS FIXED:** the `RecordDrawer` z-index collision with the demo environment switcher
  (footer actions were unclickable on all five drawer surfaces); `Button` silently dropping
  `data-testid`; Resolve leaving the drawer open; and one regression I introduced and caught
  in-session (the `Brand Subscriptions` label three validators assert).
- **GATES:** tsc 0 · eslint 0 · build PASS · `validate-work-layer.mjs` **NEW PASS (49 assertions)** ·
  `validate-uiux-redesign.mjs` **306 PASS/0 FAIL** · integrity-audit 61/0 · **FULL Playwright
  **346 passed / 0 failed / 2 skipped** · registry **243 entries**, `verify-registry` exit 0.
- **Only failing gates are pre-existing and classified:** `validate-e6` F6 (the 5 known offenders —
  stray `ave1-check.mjs` + 4 protected `design/*.png`; unchanged, assets untouched) and
  `validate-stage26.mjs` (prints ✗, exits 0, proven pre-existing at `ea700a1`). `validate-e7` was
  repointed for this sprint's declared surface and now PASSES.
- **NOT done (explicit):** the 8 remaining surfaces above; a scheduled reminder *runner* (the reminder
  state is deterministic and testable but no cron executes it); `invoice_due`/`onboarding_step` work
  sources have no live derivation path yet.

---

**Last updated: September 18, 2026 — ✅ UI/UX REDESIGN WAVE 2 COMPLETION (FINISH-AND-FIX) PASS (uncommitted) — CURRENT CHECKPOINT.**

**Repository state:** repo `/Users/tadii/Desktop/1. Mercenta`, branch `redesign/foundation`, HEAD
`ea700a1`, protected baseline `959b4d2` confirmed an **ancestor**. **ZERO git mutation** (no
commit/stage/stash/reset/checkout/clean/amend/branch-switch/merge/rebase/cherry-pick). Working tree
intentionally dirty. No deploy, no credentials, no live provider call, no protected design asset touched.

**What this pass did.** Reconciled the CURRENT code against the Wave-2 report FIRST, then finished only
what was genuinely open and fixed what was genuinely broken.

- **Already complete — NOT redone:** saturated 8-hue palette + `--mr-on-palette` in all six themes;
  one motion + density language; the workspace primitive system; Operations Overview as the
  gold-standard workspace; shell / nav rail / utility header / ⌘K palette / nav badges; animated
  charts + single recharts language; homepage redesign with TAM/SAM removed and the tracker animation
  preserved; the tour coach-mark fix.
- **Genuinely outstanding — now DONE:**
  1. **RecordDrawer wired into 4 real record queues** (QUEUE → PREVIEW → RECORD/ACT over REAL data):
     Admin Purchase Orders → the EXISTING `AdminPurchaseOrderDetail` full record page; Compliance
     Approvals → the EXISTING full document preview; Returns Warehouse Tracking → the REAL
     stage-advance action; brand Purchase Orders → the EXISTING inline acknowledgment/ASN workflow.
     Only sections each record type actually supports; no fabricated records/fields; no fake backend.
  2. **Record-queue workspace migration** for those four surfaces: frame → header → sticky toolbar →
     interactive metric band → record queue → context rail. Density is a REAL control; filters and
     metric drill-downs are real state changes; the canonical status vocabulary is preserved.
  3. **Homepage Editor completed** for `visibility`/`protection` (headings, subheadings, every point)
     through the same draft → publish pipeline + wording gate, with an explicit Revert control.
- **REAL defects fixed:** (1) **HIGH — public homepage crash**: `fetchHomepageContent()` returned the
  raw `homepage_content` row, migration 001 seeds it `'{}'::jsonb`, and `Home` reads the model
  unguarded → a Supabase deployment rendered the homepage from an empty object and threw; fixed with
  one canonical `normaliseHomepageContent()` at the API seam (no migration added; E5/E6 assert newest
  = 027). (2) non-deterministic returns forward tracking number (`Math.random`) → deterministic.
  (3) dead returns row click (`selectedId` written, never read) → drives the drawer. (4) stale derived
  figures after a returns mutation → `mutationStamp` pattern. (5) a regression I introduced and caught
  in-session: the compliance metric text contained "rejected", and Playwright's case-insensitive
  `hasText: 'Reject'` matched the metric tile instead of the row control → label changed to
  "Expired or missing".

**Gates (real output this session):** tsc **0** · eslint **0** · build **PASS (4.04s)** · wording
**PASS 235 files / 0** · integrity-audit **61/0 PASS** · `validate-uiux-redesign.mjs` **289 PASS / 0
FAIL** (was 253) · theme foundation 50 PASS · design tokens PASS · homepage editor 8/8 · validators
**75 PASS / 1 FAIL** — the ONLY failure is the **PRE-EXISTING** `validate-e6` F6 (4 protected
`design/*.png` + stray `ave1-check.mjs`; offender set unchanged at 5) · e7 **121/0** ·
verify-registry exit 0 (**233 entries**, +5 rows) · **FULL Playwright 336 passed / 0 failed / 2
skipped (338)** (was 323/0/2 = 325; +13 new tests) · `e2e/record-drawer.spec.ts` 13/13 ·
`e2e/document-verification.spec.ts` 6/6. Responsive verification of the migrated surfaces at
**1440×900, 1280×800, 1024×768, 390×844** — no horizontal overflow; the drawer fits 390px.

**Docs:** `docs/UIUX_REDESIGN_WAVE2_COMPLETION_2026-09-18.md`.

**What's next:** (1) the remaining **non-record** operational surfaces — Marketplace Intelligence
(Brand Intelligence / Ad Spend), Finance (Billing / Accounting), Super Admin & governance, and the
admin CRM / catalogue / logistics / communications panels — still on their previous page composition,
tracked as `uiux-wave2-core-surfaces-remaining` (`not_started`, narrowed). (2) API/credential
activation, Rakazo, Monid/Jev, Cloudflare/Supabase migration, new providers, new AI systems, new
backend search: parked as instructed. No API activation, no credentials, no Rakazo, no deploy, no git
mutation performed.

---
**Last updated: September 18, 2026 — ✅ UI/UX REDESIGN WAVE 2 (IMPLEMENTATION) PASS (uncommitted).**
**Headline: Wave 2 changed the UI/UX ARCHITECTURE, not just the palette.** Evidence at HEAD
`ea700a1` (baseline `959b4d2` still ancestor; **zero git mutation** in this session):
- **Saturated palette** — 8 `--mr-palette-*` hues + `--mr-on-palette` in all six themes with one
  canonical hue→domain mapping (`src/config/themes.ts`); validator-enforced saturation ≥55%;
  **brass demoted to identity accent only**.
- **One motion + density language** — tokens declared identically in all six themes + 7 purposeful
  keyframes (`mr-rise`, `mr-draw`, `mr-arc`, `mr-value-pop`, `mr-pipeline-grow`, …), all
  reduced-motion safe.
- **Workspace system** — `src/components/shared/workspace.tsx` (frame/header/grid/section, metric
  band, pipeline, queue, context panel, activity feed, record drawer, segmented control, chips).
- **Operations Overview = gold-standard workspace** — entity bar, sticky toolbar (density +
  grouping), metric band, order pipeline, attention queue, next actions, **real animated charts**
  (order value by month, value by brand, compliance doughnut), fulfilment + comms, context rail.
- **Shell** — palette-driven nav rail with attention badges, pinning, collapsible sections, opt-in
  compact mode; header search trigger; **real ⌘K command palette** over RBAC-scoped destinations +
  real records; brand badge counts tenant-scoped via `assertBrandScope`.
- **Charts** — animated line/doughnut/bars/sparkline with hover guide + SVG tooltip (strokes
  1–1.5px, rings 11–12px); legacy recharts surfaces consolidated onto `rechartsTokens.ts`.
- **Homepage** — completely redesigned from the content model; **TAM/SAM removed**; **top-right
  shipment-tracker animation preserved** (`route-dot` / `tracker-ping`) with palette colours;
  channel-neutral, claim-free copy (no Amazon framing, no guaranteed outcomes).
- **Regression found + fixed in-session** — the tour coach-mark could cover and absorb clicks on
  real UI (nav items, Settings tabs); it now docks below `lg`, clamps clear of the rail at `lg+`,
  and is non-blocking while its own buttons stay interactive.
- **Gates:** tsc 0 · eslint `src/` 0 · build PASS · wording PASS (235 files) · integrity-audit 61/0 ·
  `validate-uiux-redesign.mjs` **253 PASS/0 FAIL** · `validate-theme-foundation.mjs` 50 PASS ·
  `validate-homepage-editor.mjs` 8/8 (was failing pre-existing; harness repointed) · validators
  75/76 · verify-registry **228 entries / 123 flags = baseline** · **FULL Playwright
  323 passed / 0 failed / 2 skipped (325)** · `e2e/uiux-redesign.spec.ts` 13/13.
- **Only failing gate is PRE-EXISTING:** `validate-e6-brand-surfaces.mjs` F6 (change-set scope
  guard) fails only on earlier-session entries — 4 protected `design/*.png` (mtime 2026-09-16) and
  the stray `ave1-check.mjs` (mtime 2026-09-18 01:38). Not introduced by this wave; the wave's own
  files are declared.
- Docs: `docs/UIUX_REDESIGN_WAVE2_2026-09-18.md`; screenshots `test-screenshots/uiux-redesign/`.

**What's next:** (1) the remaining page-by-page surface migration
(`uiux-wave2-core-surfaces-remaining`, `not_started`); (2) wire `RecordDrawer` into the record
surfaces; (3) optional: extend the Homepage Editor's form to the new `visibility`/`protection`
sections (its blocking lint already covers them). No API activation, no credentials, no Rakazo,
no deploy, no git mutation performed.

---

**Scope approved as TWO-WAVE.** Wave 1 (theme/token architecture, presentation seams, app
shell, homepage) shipped; **Wave 2 (page-by-page surfaces — Brand Overview / Brand
Operational / Marketplace Intelligence / Orders & Distribution / Finance / Super Admin) is
explicitly NOT STARTED — STOP here and wait for explicit approval after inspecting Wave 1.**
Evidence at HEAD `ea700a1` (baseline `959b4d2` still ancestor; zero git mutation):
- **Six themes** (`src/config/themes.ts` = canonical single source of truth; applied by
  `src/context/ThemeContext.tsx` → `data-mercenta-theme` + CSS variables; persisted).
  **Minimal Light is the DEFAULT first-load experience** (verified
  `data-mercenta-theme=minimal-light`, body `rgb(246,247,249)`).
- **Current Mercenta retained as a theme** (ink `#000000` foundation + brass + parchment)
  through the NEW system — no legacy component set.
- **Dark = true near-black** (Bold `rgb(11,12,15)`, Serious `rgb(14,15,17)`, Current
  `rgb(0,0,0)`); validator-enforced — **no navy**.
- **Entire Tailwind palette routed through `var(--mr-*)`**; Tailwind 3.4 silently drops
  `/opacity` utilities on var colours → regenerated `src/theme-alpha-shims.css` (406 rules,
  `scripts/gen-theme-alpha-shims.mjs`); light-shell remap layer in `src/index.css`.
- **Shell**: `AppShell`/`Sidebar`/`Header` redesigned on tokens (feature-identity active nav
  rail, Avatar footer, theme selector, severity-aware notification bell, Escape close).
- **Seams**: `Avatar` (mock-first profile-image seam `src/lib/profile/profileImage.ts`),
  deterministic brand-logo identity seam (`src/lib/brandIdentity/logoResolver.ts`,
  `src/data/brandLogos.ts` — Manchester United → monogram demo logo, tenant-scoped override,
  ZERO network calls), delicate chart system (`src/components/shared/charts/MercentaCharts.tsx`,
  1–1.5px lines / 11–12px rings, showcased on Design System).
- **Homepage**: redesigned hero composition; **existing animated shipment tracker preserved
  verbatim** (`route-dot`/`tracker-ping` keyframes, verified light + dark); **"Unlock growth
  with data"** element (`src/components/shared/UnlockGrowth.tsx`, truthful copy).
- **Matrix**: `requirements-registry.json` **198 → 214** (16 `uiux-*` rows; wave-2 deferral
  row `uiux-wave2-screens-deferred` = `not_started`); `verify-registry` back at the **123**
  informational baseline.
- **Gates**: tsc 0 · build PASS · eslint 0 · wording PASS (231 files) · integrity-audit 61/0 ·
  `validate-theme-foundation.mjs` **50 PASS** · `e2e/uiux-foundation.spec.ts` **9/9 PASS** ·
  **FULL Playwright suite 310 passed / 2 skipped / 0 failed** (312 tests — the 2 skips are the
  documented pre-existing tour fixme guards; includes the 9 new Wave-1 tests).
- Browser screenshots at `test-screenshots/wave1/` (six themes, notifications panel, theme
  selector, charts, brand overview, mobile homepage).

**What's next:** open the demo and play with Wave 1 → return Wave 2 approval → Wave 2 applies
the design system page-by-page (Brand Overview/Operational, Marketplace Intelligence, Orders &
Distribution, Finance, Super Admin). No API activation, no credentials, no Rakazo, no deploy,
no git mutation performed in this session.

---
**Full current-state evidence at HEAD `ea700a1` (baseline `959b4d2` still ancestor):** tsc 0 · build PASS ·
eslint 0 · wording PASS (222 files) · integrity-audit 61/0 · verify-registry exit 0 (**198 entries**,
123 informational flags — the documented baseline; zero issues on any functional-completion row) ·
**FULL Playwright suite 301 passed / 2 skipped / 0 failed** (303 tests; 2 skips = pre-existing tour
fixme guards; baseline was 283/0/2) · every applicable validator PASS incl. E7-embedded-social 121/0,
e6-brand-surfaces except the known F6. **Two genuine issues fixed:** (1) requirements-registry.json
was 204 entries — 6 functional-completion rows had been appended twice (5 identical-id pairs + the KB
row re-issued under a renamed id); deduplicated to ONE canonical row per capability, merged
typo-free description + missing e2e evidence into kept rows, `_audit_note` recorded → **204 → 198**
(11 functional-completion rows, no capability lost); (2) the E7 scope guard failed (2/121) because
the functional-completion src surface was undeclared — repointed via the documented `§Phase …
REPOINTED` pattern (`FUNCTIONAL_COMPLETION_DECLARED`, 9 exact files incl. protected-prefix
`src/lib/intelligence/listingAnalyzer.ts`) → E7 121/0 PASS, invariant preserved (unexplained changes
still fail). E6-F6 = only the known sacred `design/*.png` scope guard (offenders re-derived: exactly
those 4 files; F5/F5b/F8/F9 pass). No git mutation (HEAD unchanged, zero commits); no credentials
touched; zero live calls; FREE-only AI unchanged; simulation arc intact; review zip refreshed.

---
**Last updated: September 17, 2026 — 🏗️ FUNCTIONAL-COMPLETION WORKSTREAM (Clusters A/B/C) BUILT (uncommitted).**
**Directive: STEP 1 Complete Functional Platform (NOT UI/UX, NOT API activation, NOT deployment).** Closed all
three genuine functional gaps from the 187-entry matrix: **A) Amazon Ads depth** (§9) — campaigns + drill-down,
manual monthly budget input, deterministic recommended-spend with one-shot brand Approve/Amend/Reject (audited),
brand-facing "Your advertising performance" inside Market Intel (brand nav untouched — e6 F8-stable 15 items);
**B) Marketplace Intelligence product depth + automated Listing Analyzer** (§8) — new deterministic engine
reusing the canonical salesEstimator/productCompleteness (no duplicate engine), 8-dimension listing health,
est. units/revenue/price/BSR-band/velocity/demand, Mercenta-prepared suggestions with brand Approve/Edit/Reject
(one-shot, audited), per-SKU product performance; **C) Knowledge Base ↔ UserTour** (§14) — canonical KB article
store + TourStep.learnMore + inline Learn-more link + KB panel (link relocated into the dots row after the first
layout caused a real tour-card-nav-overlap regression — notifications.spec tests 2 & 4 green again). **Gates:**
tsc 0 · build PASS · lint 0/0 · wording PASS (222 files) · verify-registry exit 0 (198 entries, +11
`functional-completion-*` rows) · integrity-audit 61/0 · all targeted validators PASS · validate-e6 only known
pre-existing F6 (declared FUNCTIONAL_COMPLETION_SCOPE, F5/F5b/F8 pass) · e2e: ads 8/8, listing 5/5, tours 10/10,
notifications 4/4 → combined **27/27**. `mutationStamp` pattern fixes a TanStack structural-sharing staleness
class; ui.tsx Input gained min/step/aria/testid passthrough. Full suite not re-run (baseline 283/0/2 HEAD).
No git mutation (HEAD `ea700a1`, branch `redesign/foundation`); no credentials touched; zero live calls; review
zip exported per policy. NEXT: full-suite regression (Step 2), then UI/UX (Step 3).

---
**Last updated: September 17, 2026 — 🛡️ INTEGRATION ENTITLEMENT / CREDENTIAL PROVENANCE / COST-CONTROL AUDIT — AUDIT DONE (UNCOMMITTED).**
**REPORT-ONLY AUDIT — no activation, no credential change, no runtime-behaviour change, no code change.**
Key outcome: **Mercenta runtime has NEVER called OpenRouter or any provider live** — FREE-only AI policy
(`deepseek/deepseek-v4-flash:free` only), the two real-AI call sites are unreachable (research client never
instantiated; triage called with no key), **no OpenRouter credential exists in any env file** (`sk-or-` literal
count in repo = 0), and the dashboard key "Mercenta Platform" **cannot be proven to correspond to any runtime
secret** (there is none) — exact sentence recorded per instruction: "Repository cannot prove that the configured
secret corresponds to the OpenRouter dashboard key named Mercenta Platform." Cline dev-AI credential is separate,
untouched, never exposed. Master Matrix: **172 → 187 entries** (15 `integration-audit-*` rows); verify-registry
**exit 0** (123 informational flags vs 103 baseline, all pre-existing classes). Hunter: `.env` key is NON-VITE
(dev-only, unexposed), runtime client never instantiated — Free ~50 credits/mo untapped; CONTROLLED LIVE CANDIDATE
only after a credit-aware cap + cache + auto-stop + Super Admin visibility (NOT activated). Full Sections A–K,
provider-by-provider provenance/entitlement/live-simulation table, cost-control gaps, Super Admin Control Centre
requirements, and next-candidates are in the `🛡️ PHASE 4 — INTEGRATION … AUDIT` block at the top of PROJECT_STATUS.md.

---
Repository `/Users/tadii/Desktop/1. Mercenta`, branch `redesign/foundation`, HEAD `ea700a1` (UNCHANGED —
**zero commits this run**), protected baseline `959b4d2` confirmed ancestor. Stopped by owner for a
handoff checkpoint after implementing **Workstream A — the canonical 20 REAL brands** (10 UK + 10
international), replacing the invented demo tenant set. The working tree is DIRTY with Phase-4 changes
(88 source/e2e/script/supabase files, ~95 total incl. generated artefacts; the 3 sacred design PNGs
untouched; one new user-dropped `design/ChatGPT Image Sep 17, 2026, 03_46_58 AM.png` untracked).

**PASSED this run:** tsc **0 errors** · build **PASS (~4.1s)** · ESLint **0/0** · wording **PASS
(218 files)** · integrity-audit **61/61** · validator sweep **73 PASS / 1 FAIL** (sole red =
`validate-e6-brand-surfaces` F6 — the known pre-existing working-tree scope guard from untracked
`design/*.png`, NOT a product defect, same as Phase 2/3) · targeted Playwright: 33 (multi-tenant/
commercial-model/app-shell) + 6 (crm) + 9 (brand+admin operational after ASTO-001 fix) + 29 passed /
**2 failed in `e2e/shipment-asn.spec.ts`** (see below) + 18 passed/1 failed batch (the crm#3 fail was
fixed, rerun green).

**REMAINING FAILURES (must fix next):** (1) `e2e/shipment-asn.spec.ts` tests 1&2 — Tapatío is now
Grocery (regulated) so the ASN must supply `lotNumber`+`expiryDate`; old DeskForge/Office was not
regulated. (2) `validate-stage26.mjs` prints 5 ✗ but exits 0 — **proven pre-existing at HEAD**
(compliance-gate-check/catalog-import Edge-Function contract drift), unrelated to Phase 4.
(3) full Playwright suite not rerun. **Full checkpoint details, all files, and next steps are in the
`⛔ PHASE 4 — WORKSTREAM A … CHECKPOINT` block at the top of PROJECT_STATUS.md.** Next window: read
PROJECT_STATUS.md Phase-4 block FIRST, fix shipment-asn, run full regression, then continue Workstream
B (BI/UK sports), C (Super Admin), D (demo integrity), E (matrix). No commit / no redesign / no deploy.

**2026-09-17 (later window) — WORKSTREAM A.1 DONE (uncommitted).** Executed the mandated plan: fixed `e2e/shipment-asn`
tests 1&2 (brand ASN form now exposes Lot number + Expiry date inputs wired to the existing state; specs supply
simulated `SIM-LOT-PO-9002`/`2027-10-01`), ran the **full** Playwright suite for the first time this phase →
**283 passed / 0 failed / 2 skipped (10.5m)** (matches the Phase-3 green baseline), and the 74-validator sweep →
**73 PASS / 1 FAIL** (sole red = pre-existing `validate-e6-brand-surfaces` F6 design-PNG scope guard; `validate-e7`
PASS again after its Phase-4 scope list + e6's PHASE4_SCOPE were extended with `BrandPurchaseOrders.tsx` —
established consumer-declaration pattern, guard not weakened). The full run surfaced 3 genuine Workstream-A
regressions, all now fixed: `amazon-ads-dashboard.spec` constants (13→20 / 5→7 canonical universe), and all FIVE
`ticketStore.ts` seed tickets pointed at dead fake-brand message ids (helpdesk threads rendered "No messages yet.")
→ repointed to canonical `msg-<brandId>-N` (tkt-001 → `msg-brand-astonish-1/-2`); the specs asserting the old
fake-brand "Marula Oil" body now assert the canonical Astonish thread body. Gates: tsc 0 · build PASS · eslint 0/0 ·
wording PASS (218 files). No commit/staging/reset/stash/clean; HEAD still `ea700a1`. Next: Workstreams B/C/D/E per
the roadmap — still NOT started. Full details in the ✅ PHASE 4 — WORKSTREAM A.1 checkpoint block at the top of
PROJECT_STATUS.md.

---
---
**2026-09-17 (third window) — WORKSTREAM A.2 DONE (uncommitted).** Small targeted additive fix completing the
regulated-brand ASN story on the ADMIN side: `AdminPurchaseOrderDetail.tsx` on-behalf ASN form now exposes **Lot
number** + **Expiry date** inputs (aria-labelled) and passes them through the EXISTING `handleOnBehalfAsnSubmit` →
`createShipmentForPO` flow, with the same regulated-category UX pre-check the brand form uses (seam re-enforces).
Two additive E2E tests in `e2e/shipment-asn.spec.ts`: #6 Tapatío (Grocery) refusal-without- lot/expiry →
simulated `SIM-LOT-ADMIN-PO-9002`/`2027-10-01` → submits; #7 Astonish (Home) submits without lot/expiry.
Verified: **shipment-asn 7/7 · notifications 4/4** (brand ASN intact) · tsc 0 · build PASS · 74-validator sweep
**73 PASS / 1 FAIL** (sole red = pre-existing e6-F6 design-PNG scope guard; PNGs untouched) · e7 PASS (121/0).
Scope guards repointed via the established pattern (`AdminPurchaseOrderDetail.tsx` → e6 PHASE4_SCOPE + e7
PHASE4_DECLARED, §Phase-4.2 comments; guards not weakened). Latent findings recorded, NOT changed: admin ack/ASN
panels close before their success notices render (pre-existing quirk); cosmetic mis-indent at
`const [onBehalfAsn, …] = useState(false)`. No commit/stage/reset/stash/clean; HEAD still `ea700a1`. Next: still
Workstream B — NOT started.

---

**2026-09-17 (fourth window) — WORKSTREAM B RECONCILIATION + MASTER MATRIX UPDATE (implementation STOPPED for approval; no code changed).**
Completed the mandated reconciliation-first pass. Verdict: the cumulative Brand Intelligence mandate is **already overwhelmingly built** (canonical
12-prospect BI universe · lifecycle engine · weighted ICP scoring · discovery pipeline · 8 opportunity verticals with sports as a
category-mapped channel (Tottenham → Apparel) · Strategy A/B · ≥25 source markets · outreach/CRM pipeline · zero-network deterministic runs);
category-first/market-first and "no separate sports vertical" are satisfied in code. No duplicate engines found (one identity bridge, one
`listAcquisitionProspects`). **Master Matrix updated: `requirements-registry.json` 144 → 171 entries** (27 new `workstreamB-*` rows with
build-state/access/priority/dependencies/risks fields), meta synced, `last_updated` 2026-09-17, verify-registry exit 0 at the documented
103-flag baseline (ZERO new flags). Two access-boundary findings recorded (decision gates): ① brand-facing Market Intel renders competitor raw
score/tier — owner decides keep vs qualitative labels; ② BI admin surface is staff-level (not Super-only). Genuine gaps (all PARTIAL, none
critical): product-discovery surface, contact-sourcing run surface, regional-priority ranking view, notes editor, seed category coverage
(5/10). Proposed minimum implementation (only after owner approval; touches >5 files ⇒ stopping for approval per protection rules):
A) resolve z-boundary-exposure with qualitative labels; B) optional product-discovery + regional-rank surfaces; C) notes editor. No commit /
no staging / reset / stash / clean; HEAD `ea700a1`; A.1 + A.2 intact. Next: owner decision on the two boundary gates → THEN implementation.

---

**2026-09-17 (fifth window) — WORKSTREAM B APPROVED IMPLEMENTATION DONE (uncommitted).** Decisions 1+2 and Steps B+C
implemented additively:
- **D1** — brand-facing Market Intel competitor cards now show qualitative positioning (growing challenger / established /
  niche / leading / comparable), derived only from the existing `brandMaturity` model; raw `Score: x/100` and tier badges
  removed from brand surfaces (internal scores untouched for Super-Admin use).
- **D2** — Brand Intelligence is Super-Admin-only: `brand_intelligence` hidden from non-Super nav + render-guarded
  (`AccessDenied`); `opportunity-discovery.spec` staff logins repointed to Super; downstream staff execution surfaces
  (Marketing Hub, Brand CRM) preserved as the established explicit exception.
- **Step B** — new internal Super-only `ProductDiscoveryPanel` (canonical ASIN/opportunity derivation, no new engine,
  simulated-evidence-labelled) and `RegionalPriorityPanel` (SOURCE_MARKETS + assessOpportunity + strategy + ICP region;
  UK + international both first-class).
- **Step C** — internal Notes editor on prospect detail (live-store draft, saves via `updateProspect`, audited
  `updated→notes` lifecycle event, never shown to brands).
- **Step D** — recorded DEFERRED (matrix row `workstreamBD-seed-expansion-deferred`); no implementation.
Gates: tsc 0 · build PASS · lint 0/0 · wording PASS · new WSB e2e 4/4 · BI batch 18/18 · A.1+A.2 regression 11/11 intact ·
BI validators 7/7 · e7 121/0 · full sweep 73/1 (sole pre-existing e6-F6) · **Master Matrix `requirements-registry.json`
144 → 172 entries**, verify-registry exit 0 (baseline 103 informational flags). No git mutation, no credentials, no live
calls; HEAD still `ea700a1`. Next: owner decision on post-WSB follow-ups (deferred seed expansion when real data ready;
later UI/UX redesign; then Workstream C, D, E).

---

# HANDOFF DOCUMENT — Mercenta Partners Platform Build
# HANDOFF DOCUMENT — Mercenta Partners Platform Build
# HANDOFF DOCUMENT — Mercenta Partners Platform Build
# HANDOFF DOCUMENT — Mercenta Partners Platform Build
**Last updated: September 16, 2026 — ✅ PHASE 3 (FULL AUTHORITATIVE REGRESSION) EXECUTED — GREEN.
Repository `/Users/tadii/Desktop/1. Mercenta`, branch `redesign/foundation`, HEAD `ea700a1`
(unchanged), protected baseline `959b4d2` confirmed ancestor, working shell confirmed. ZERO
source changes — regression-only. Actual Phase-3 gates executed this session: tsc **0 errors** ·
build **PASS (2.89s)** · ESLint **PASS** · wording **PASS (218 files)** · **74 validators →
73 PASS / 1 FAIL** (the sole red = known `validate-e6-brand-surfaces` F6 working-tree scope guard
from the 3 user-reserved untracked `design/` PNGs; all 40 other E6 checks PASS incl. F9 zero
network; NOT a product defect) · verify-registry **exit 0** · integrity **61/61** · RLS **33
tables / 94 checks PASS** · investor demo **PASS** (25 stages, deterministic, ZERO network,
replay-stable digest) · **full Playwright --workers=2 → 283 passed / 0 failed / 2 skipped
(11.2m)** — identical to the historical Phase-2 counts · STEP 11 platform contracts A–H all
verified (Brand Intelligence owns qualification; ICP consumes canonical BI prospects; Amazon
Ads chain `useAdSpendBudgets`→`fetchAdSpendBudgets`→`AmazonAdsDashboard` + 19-check validator
PASS; runtime AI FREE-ONLY with fail-closed refusal and no OpenRouter call made by the regression;
deterministic-first operations; Brand Overview + Brand Operational dashboards remain DISTINCT;
Rakazo LAST; security/credential later) · review ZIP exported **37M** with **credential guard
PASS**. **VERDICT: GREEN** — no product regression. The prior BLOCKED Phase-3 header below is
retained as history and superseded. NEXT: **Phase 4 — CORE-COMPLETE DECLARATION** (gated;
requires a separate instruction; NOT started).**
**Last updated: September 16, 2026 — ⛔ PHASE 3 (FULL REGRESSION) STARTED BUT
BLOCKED AT EXECUTION — NOT GREEN. The environment's terminal/shell backend failed
on every command, so none of the Phase 3 gates (tsc, build, eslint, wording,
validator sweep, registry, integrity, RLS, investor demo, full Playwright) or the
review-ZIP export could be run this session. Read-only state confirmed: branch
`redesign/foundation`, HEAD `ea700a1` unchanged, protected baseline `959b4d2`
ancestor, and NO source file modified — only the Phase-2 doc updates + the 3
reserved untracked `design/` PNGs (known F6 scope guard, NOT a defect). Phase 3
must be re-run in a working shell before any green/core-complete declaration.**

**PRIOR VERIFIED STATE (Phase 2 — read-only, ZERO source changes, NO genuine wiring defect
found):** Verified edge-by-edge via existing seams/validators/E2E: Chain A
(Brand→product→catalogue→compliance→submission→Amazon/Vendor SIM→PO→ack→
shipment→receiving→invoice→payment→exception→dispute/case), Chain B
(PO→fulfilment→ASN→receiving→invoice→payment→chargeback→case + finance
reconciliation + payout eligibility), Chain C (Brand Intelligence INCLUDES
qualification → ICP/acquisition → CRM → outreach; canonical `normalizeBrandKey`
identity; fail-closed simulated outreach), Chain D (operations → Command Centre
ranked queue + WHY → Launch Centre → 25-stage deterministic investor demo),
Google/Company/Government/HMRC surfacing (`exchange_pending` never "connected";
HMRC blocked until VAT; no invented live connectivity), Amazon Ads dashboard
(REQUIRED, seam consumed, 19 validator checks + 2 E2E green), Platform AI
runtime FREE-ONLY (no paid fallback; no hardcoded key; deterministic-first).
Gates: tsc 0 · build ✓ 3.80s · lint-wording PASS · 73/74 validators PASS (only
F6 red = pre-existing working-tree scope guard from the 3 reserved untracked
design PNGs) · verify-registry exit 0 · integrity 61/61 · RLS 94 checks PASS ·
**full Playwright --workers=2 → 283 passed / 0 failed / 2 skipped (11.0m)**.
NEXT: **Phase 3 FULL REGRESSION** (no features, no redesign, no Rakazo) →
Phase 4 core-complete checkpoint → Phase 5 deploy/re-verify
demo.mercenta.co.uk → Phase 6 UI redesign (Apple/Twenty/ERPNext-inspired;
Brand Overview + Brand Operational dashboards kept as distinct concepts; light/
dark; thin/sleek charts) → Phase 7 UI regression → Phase 8 Rakazo LAST →
Phase 9 security/credential rotation.**
Branch `redesign/foundation`, HEAD `ea700a1` (unchanged by Phase 2; only
PROJECT_STATUS.md + HANDOFF.md updated, uncommitted), protected baseline
`959b4d2` (verified ancestor). Repository: `/Users/tadii/Desktop/1. Mercenta`.
Remember: the authoritative feature/function truth is the PHASE 0A/0B inventory
in PROJECT_STATUS.md; the Phase 2 record sits above the Phase 1 record there.

## ⛳ AUTHORITATIVE SCOPE TRUTH (READ FIRST IN ANY SESSION)
**PHASE 0B — CORRECTIVE RECONCILIATION INVENTORY** inside `PROJECT_STATUS.md`
(section `## ⛳ PHASE 0B …`) is the **authoritative corrected scope record** and
SUPERSEDES Phase 0A + the 37-row matrix wherever they conflict. Key correction:
**Amazon Ads is REQUIRED (agreed §12), PARTIALLY IMPLEMENTED (data seam exists
in `useAdSpendBudgets()`/`AdSpendBudget`), INCOMPLETE — dashboard surface is
missing build work (NEXT BUILD QUEUE 0B.4 item #1).** Also recorded there: the
Platform AI "FREE models only / NO PAID" spec-vs-implementation conflict
(0B Q, PA-02/PA-03 — founder decision required, no code change until decided),
`requirements-registry.json` missing an Amazon Ads entry, and the corrected
Chain A–D data-flow matrix. The **PHASE 0A EXHAUSTIVE FEATURE/FUNCTION TRUTH
INVENTORY** (section `## ⛳ PHASE 0A …`) remains the verified historical evidence
record. It contains: 0A.1 executive truth · 0A.2
feature-level matrix across all domains · 0A.3 platform data-flow matrix (4 flows)
· 0A.4 per-provider integration reconciliation (24 named providers vs the 22-entry
source registry — incl. the `docs/INTEGRATIONS.md` 18-vs-22 doc drift) · 0A.5–0A.14
domain inventories (BI, Amazon/Vendor, CRM/acquisition, commerce/PO/fulfilment,
finance, funding, company/gov/google, super-admin/command/launch, platform AI,
25-stage investor demo) · 0A.15 Rakazo (deferred) · 0A.16 UI future · 0A.17–0A.24
classification sections · 0A.25 the 20 critical answers.
No source code was changed by Phase 0A or Phase 0B.

## ⚠️ SECURITY — READ FIRST
`HANDOFF.md` itself contained the **Namecheap FTP password as a literal** in the
"PROMPT: Namecheap FTP Deploy" block. It was the ONLY tracked file holding a value
(`.env`/`.env.deploy` are gitignored; `scripts/deploy-demo.sh`, `GO_LIVE.md` and
`docs/INTEGRATIONS.md` reference the variable NAME only). The literal is now
**REDACTED — never put it back**. **ACTION REQUIRED FROM THE FOUNDER: ROTATE that FTP
password**, because the old value is still in past Git commits (history rewrite is
forbidden by the standing rules; rotation is the fix). Same standing item as the
**Twilio 2FA recovery-code rotation**.

## THIS SESSION (PHASE 0B — CORRECTIVE RECONCILIATION, read-only · 2026-09-16)
- **Purpose:** correct the authoritative functional inventory BEFORE any Phase 1
  source-code work. The Phase 0A Amazon Ads classification
  (`PART (registered card only)`, Phase-1 "OR explicit deferral record" escape)
  was itself the reported defect: Amazon Ads is AGREED §12 functionality and
  must not be dropped because the current dashboard consumer is absent.
- **Produced (documentation only):** PROJECT_STATUS.md PHASE 0B §0B.1–§0B.6 —
  corrected Amazon Ads classification (REQUIRED → PARTIALLY IMPLEMENTED /
  INCOMPLETE → simulation-first → dashboard REQUIRED → live CRED-DEPENDENT) ·
  exhaustive **216-row** feature/function matrix across 19 domains ·
  corrected Chain A–D edge data-flow matrix (33 edges) · fresh NEXT BUILD
  QUEUE (0B.4, 16 items, Amazon Ads dashboard = #1) · classification
  aggregates (missing/partial/broken/cred/f-actions/deferred/
  REQUIRES-SPEC-RECONCILIATION).
- **New findings recorded:** ① Platform AI "FREE models only / NO PAID" rule is
  NOT met by `modelPolicy.ts` (`paid_max` reachable for both runtime tasks when
  a key is present) — founder decision required, NO code change yet. ②
  `requirements-registry.json` has ZERO Amazon Ads entries (inventory gap). ③
  `XeroConnection.tsx` (dead, syntax-broken) + `BrandComm.tsx` slug drift +
  `docs/INTEGRATIONS.md` 18-vs-22 — all Phase-1 candidates, none touched now.
- **NOT touched:** source, tests, validators, registry code, UI, Rakazo,
  credentials, deploy. No Mercenta runtime AI invoked. No commit made.

## THIS SESSION (M13 continuation, session 2) — §10/§31 BUILT
- **`src/lib/founder/fundingPipeline.ts` (NEW)** — the founder's own funding pipeline:
  the three REAL §10 opportunities (**Solo Founders Program**, **The Bridge**,
  **Ignyte by DIFC**) with their exact URLs, every researched fact carrying a claim
  class + source, and any term the research did not state left `null` (never
  invented); the exact §31 stage order (DISCOVERED → … → DECISION); the
  **founder-approval gate** (SUBMITTED and every later stage are REFUSED without a
  recorded approval AND a founder-supplied submission reference — no implicit or
  fabricated submission, ever); deterministic application generation (no model call)
  linted by the EXISTING wording gates and reusing the canonical founder statement;
  `fundingPipelineSummary()` for the queue. Zero network calls.
- **`GrantsInvestorsSection.tsx` (EXTENDED)** — a "Founder funding & accelerator
  pipeline" card in the EXISTING Super Admin **Grants & Investors** tab, plus the
  **honesty defect fixed**: it used to say an application was "marked as submitted"
  and showed a bare `submitted` badge; it now reads "internally approved — NOT
  submitted externally" and says nothing was submitted/sent.
- **`scripts/validate-funding-pipeline.mjs` (NEW)** — 43 checks PASS.
  **`e2e/funding-pipeline.spec.ts` (NEW)** — 3/3 PASS. Both scope guards declared the
  new surface.
- VERIFIED: tsc 0 · eslint clean · build ✓ · wording gate PASS (218 files) · 74
  validator/audit scripts 0 failures · rls-audit PASS · integrity-audit 61/61 ·
  affected-spec run 47/47.

## THIS SESSION (M13c — PHASE C: legacy false-submission state) — DONE
- **Checkpoint verified first (read-only):** branch `redesign/foundation`, HEAD
  `883652d` (one commit past the directive's `f2a7434`), baseline `959b4d2`
  ancestor-confirmed, tree clean. **No repository-wide audit was run** and no
  completed phase was rebuilt.
- **DEFECT FIXED AT THE ROOT:** `src/lib/grants/researchEngine.ts` used to write
  `status: 'submitted'` / `'sent'` onto stored drafts with no external submission
  and no approval gate.
- **THE FIX (fundingPipeline approval model as precedent):** the legacy states are
  gone from `src/types.ts` (`'draft' | 'approved_internally'`), `submittedAt` /
  `submittedBy` / `sentAt` / `sentBy` became `approvedAt` / `approvedBy`,
  `approveGrantDraft` / `approveInvestorDraft` now record an INTERNAL approval
  with a **required approver identity** (fail-closed), and a new separate
  `submission` record with `recordGrantSubmission` / `recordInvestorSubmission`
  is the ONLY path that can represent an external submission — refused without an
  explicit founder confirmation, a prior internal approval, the founder's own
  reference, or on a duplicate.
- UI preserved (no redesign). The only visible copy changed: the two
  `Approve & Send` buttons + the sentence naming that action, which said "Send"
  for an action that sends nothing — now `Approve internally`.
- 17 new checks appended to the **existing** `scripts/validate-funding-pipeline.mjs`
  (43 → **60 checks PASS**); `e2e/funding-pipeline.spec.ts` 3/3; tsc 0 errors;
  eslint clean; build ✓; wording gate PASS (218 files).

## THIS SESSION (M13c — PHASE D: §27/§28 ranked queue + WHY) — DONE
- Built INSIDE the existing command centre (`src/lib/commandCentre/commandCentre.ts`
  + `src/components/admin/CommandCentre.tsx`). **No new dashboard framework, no
  redesign, no CSS/layout/design-system change, no new feature beyond §27/§28.**
- 8 declared ranking factors (`COMMAND_FACTORS`) with a max each; `commandWhy()`
  records the value actually observed per factor and scores it; score = exact sum.
- `rankQueue()` assigns 1..N deterministically (score → declared band order →
  action id) and mutates the SAME objects, so bands and sections share rank/WHY.
- Opportunities now use the canonical PO-potential ranking (`rankOpportunities`)
  and carry estimated PO potential + opportunity score as labelled WHY factors.
- New slots, all from existing stores: best embassy introduction route, best trade
  programme route (deterministic best-of by canonical prospect coverage, tie-break
  = canonical target order), the investor route (honest gap: no investor target
  recorded yet, £250,000 plan, 0 committed), and one funding item per §10/§31
  opportunity using `fundingPipelineSummary()` with the pipeline's own next action.
- UI: rank badge + `Why: <factor> <points> · … = <score>` on each existing row and
  the declared ranking basis line. Existing text sizes/colours only.
- Validator 23 → **39 checks PASS**; e2e 3 → **4/4 PASS**; affected run 17/17;
  tsc 0 errors; eslint clean; build ✓; wording gate PASS (218 files).

## STILL OPEN (next session, priority order)
1. **FINAL RECONCILIATION** (bounded, no new audit): confirm the existing major
   workflows connect — brand PO → accept → shipment → pay → labels; admin PO and
   shipment exceptions; opportunity → outreach; funding pipeline; company/Google
   setup; cost protection; launch; command-centre CTAs. Then the **FINAL
   REGRESSION**: tsc, eslint, build, wording, all validators, RLS audit, integrity
   audit, `npx playwright test --workers=2`, investor demo.
2. **DEPLOY** the verified build to `demo.mercenta.co.uk` (`scripts/deploy-demo.sh`
   only; never the live domain) and verify the deployed site. **STOP AND REPORT.**
3. **RAKAZO — LAST, only after the deploy is verified**: register the integration,
   add `IntegrationId` + `INTEGRATION_META`, fail-closed mode resolution, URL-only
   config, reconcile docs, validator + integration-hub test + scope guards, then
   regression again. Do NOT do this before the deployment.
4. **SECURITY AUDIT after build completion**: rotate the Namecheap FTP password
   and the Twilio recovery code (values still exist in past commits; rotation is
   the fix — history rewrite is forbidden), review secrets/history, harden.
2. **§27/§28 unified ranked founder queue with visible WHY** — extend
   `src/lib/commandCentre/commandCentre.ts`; `fundingPipelineSummary()` is the
   ready-made input for the funding slots.
3. **The 58 failures in the unbounded full-suite run are ENVIRONMENTAL, PROVEN:** the
   machine was at load ~19 with a stray vite dev server (port 5174, no port clash);
   every failure was a click/10s wait timeout in specs this phase never touched, and
   the SAME 16 spec files re-ran **105 passed / 0 failed** with `--workers=2`. Run the
   suite with bounded workers on a quiet machine.
4. Credential/founder work unchanged (Google OAuth client id, Companies House + GOV.UK
   codes, HMRC, Google Edge Function deploy, real cost prices, Tottenham ASIN evidence
   capture, Twilio rotation, **+ the Namecheap FTP rotation above**).
5. §16–§29 embassy/trade partnership pipeline and the §12–§15 Google Doc/Slides/Sheets
   generation wiring — still to build on the existing seams.

---
## HISTORICAL — M13 session 1 (Phases 9 + 8)

**Built + verified THIS session (nothing already verified was rebuilt):**
- **Phase 9 — Company / Government Control Centre**: `src/config/company.ts` (single
  source of truth for Mercenta's registration facts, number 17457777), extended
  Companies House client pair (`getCompanyRecord/getOfficers/PSC/filingHistory/charges`,
  mock-first, mock invents no Mercenta fact), `src/data/companyStore.ts` (registrar
  snapshot with provenance, deadlines, confirmation-statement workflow with the
  founder-approval gate, `fileViaOfficialApi` REFUSAL, register-only verification,
  masked government-credential vault), `CompanyControlCentre.tsx` + Super Admin tab
  **Company**. Validator 49 checks PASS; e2e 4/4.
- **Phase 8 — Google integration + setup wizard**: `src/config/google.ts` (personal
  `mercentapartners@gmail.com`, My Drive only, least-privilege scopes, 22-item
  workspace plan), `src/lib/google/` client pair + factory + runner (dependency order,
  retry, explicit skipped children), `src/data/googleStore.ts` (records
  `exchange_pending`, NOT connected; no token stored), `GoogleSetupWizard.tsx` + Super
  Admin tab **Google**, `google` registered in the integrations registry/order/meta.
  Validator 42 checks PASS; e2e 3/3.

**NEXT SESSION:** read the UPDATED "M13 REMAINING WORK" table in `PROJECT_STATUS.md`
(Phase 10 operating-cost dashboard → Phase 11 command centre → Phase 14 docs →
spec-selector repoint → full regression). Do NOT rebuild Phases 3, 8, 9, 12, 13.
**Credentials the founder enters in Super Admin (never in code/docs/prompts/ZIP):**
Google OAuth client id (Super Admin → Google), Companies House authentication code and
GOV.UK One Login personal code (Super Admin → Company), HMRC when VAT setup completes.
The M12 session was **cancelled mid-flight by the owner** and is checkpointed in
`PROJECT_STATUS.md` (top block "M12 CHECKPOINT"). **Branch `redesign/foundation`,
HEAD `a6fac56`, protected baseline `959b4d2` (verified ancestor).**
**THE PROJECT FOLDER WAS RENAMED: the real repository is now
`/Users/tadii/Desktop/1. Mercenta` (NOT `/Users/tadii/Desktop/Mercenta`, which is an
empty stub containing only `.vite`).**
Working tree is DIRTY: 11 modified files (2 docs + 9 scripts) + 2 owner folders.
**M12 BUILT & COMMITTED:** brand-level commercial relationship (§5/§19, both
models, fail-closed, audited, Super-Admin-only change), Brand Intelligence strategy
layer (§12–§16: strategies A/B, 31 source markets, trade programmes declared
prospective, speed-to-revenue, market-access tagging), sales estimator +
new-to-channel modelling + Amazon wording safeguards (§17/§18), Founder Investor
Centre + Partnerships/Fundraising Centre (§21/§41, super-admin-only),
investor demo extended to 25 stages. **M12 NOT finished:** README/.clinerules/
INTEGRATIONS/GO_LIVE docs, the full Playwright + 64-validator regression, and the
review ZIP export. **NEXT CHAT: read the PROJECT_STATUS M12 checkpoint first, then
`git status` + `git log --oneline -6` in `1. Mercenta`, then continue from
"Remaining M12 work" item 1 — do NOT rebuild what is already committed.**
(Previous line preserved for history:)
Last updated: September 14, 2026 (**M11 — BUILD-FORWARD: the six deploy-time Edge Functions now EXIST and are actually validated (46 assertions / 0 failures / 0 skipped, previously 35 skipped); migrations 024–026 close the §22 and §23 gaps; Palletline gains a full mock/real simulation adapter (§13); the two commercial models (§3/§5) and the VAT calculation layer (§9) are built as canonical modules. Two canonical-model corrections were made deliberately and reported: the §6 payout rails are now Wise (default) / Payoneer (secondary) — NOT Stripe — and the production VAT treatment remains deliberately un-invented while the demo gains a labelled 20% illustration. Full validator sweep 59/60 → the 3 remaining stale migration-count pins were repointed with `§Phase M11 — REPOINTED` comments.**)

## WHO I AM:
I'm Tadii. NOT technical. I use Cline to build Mercenta Partners Ltd
(a UK B2B distribution platform). The AI assistant gives me ONE short
prompt at a time. I paste it into Cline (new chat, Act mode). I paste
Cline's output back. AI confirms, gives next prompt.

## CRITICAL WORKFLOW RULES:
1. ONE TASK PER CLINE CHAT. Never combine tasks.
2. ACT MODE only.
3. Prompts must be SHORT and FOCUSED. Never a 200-line mega-prompt.
4. Every prompt ends with: no styling changes, no demo data deletion,
   no commit unless I say so, show git diff --stat, run build, run
   e2e tests, run zip script.
5. If Cline asks a question, I paste it to AI. AI tells me what to answer.
6. If Cline tries to do extra, I say "Stop."
7. Commit before starting new work.
8. If AI makes a mega-prompt, I say: "No. One task. Short prompt."

## WHAT'S BUILT:
### ⏸️ M12 session (14 Sep 2026) — CHECKPOINTED, NOT FINISHED (see PROJECT_STATUS top block)
- **Committed (5 phases):** `d865c06` brand-level commercial relationship (§5/§19);
  `88932cd` Brand Intelligence strategy layer (§12–§16) + sales estimator +
  Born-to-Run + Amazon wording (§17/§18); `15d9c2c` Founder Investor Centre +
  Partnerships/Fundraising Centre + docs/deck generation (§21/§41);
  `4e7e1a4` investor demo extended to **25 stages** (new `commercial_models` stage
  asserting the exact §19 figures, a fail-closed probe and compliance
  independence); `a6fac56` four new validators + three browser specs (8 tests pass).
- **Verified:** tsc 0 · eslint 0 · build ✓ · `validate-investor-demo` 72 ✓ (digest
  replay identical) · new validators 18 + 24 + 28 + 29 checks PASS · Playwright
  new specs 8 passed/0 failed · `validate-e6-brand-surfaces` PASS after its scope
  guard was repointed to M12.
- **Uncommitted at checkpoint:** `PRODUCTION_READINESS.md`,
  `docs/MERCENTA_BUSINESS_MODEL.md` (§3.2.1), `scripts/rls-audit.mjs` and 8
  validators (all `fileURLToPath` path repairs — the folder rename introduced a
  space and `URL.pathname` percent-encoded it, which had made 8 validators CRASH
  with `ENOENT …/1.%20Mercenta/src`; 7 pass, e6 passes after the M12_SCOPE repoint).
- **Still outstanding:** README gate list, `.clinerules/mercenta-business-model.md`,
  `docs/INTEGRATIONS.md`, `GO_LIVE.md`; the FULL Playwright suite + the full
  64-validator sweep after the UI additions; re-run of `e2e/investor-demo.spec.ts`
  (repointed to 25 stages, not yet re-run); review ZIP export (the export script
  must first stop `cd`-ing to the old stub path); a PRE-EXISTING `rls-audit`
  finding (4 tables with no RLS statement in the migrations) which needs an owner
  decision, NOT a silent schema change.

### M10 session (14 Sep 2026) — validator suite repaired to 60/60 green (was 45 green / 15 red)
- **All 15 red validators diagnosed and repaired. Every failure was a STALE
  ASSERTION, not a product regression** — each encoded a fact that was true when
  written and then legitimately changed by a later phase. Repairs repoint to the
  current canonical SSOT (`PO_STATUS_ORDER`, `MERCENTA_CARRIER_ACCOUNTS`,
  `SHIPPING_CARRIER_ROUTING`, `DEMO_BANNER_TEXT`, `DEFAULT_HOMEPAGE_CONTENT`,
  `PO_STATUS_ORDER`, the shells that now own view routing), never to new
  hardcoded literals, and never by deleting an assertion. Each carries an inline
  `§Phase M10 — REPOINTED` comment naming the old contract and why it changed.
- **Two validators no longer crash.** `validate-stage19` / `validate-stage24`
  read migration files that never existed in this repo (`0013_deductions.sql`,
  `0014_vc_ack_asn_fields.sql`); repointed to `008_create_deductions.sql` /
  `005_create_purchase_order_lines.sql`. `validate-stage26` no longer crashes
  when a brand owns no PO, and its Edge-Function block now SKIPS (the convention
  `validate-edge-functions.mjs` established) instead of aborting on absent
  deploy-time artefacts.
- **Stronger invariants replaced weaker ones**: lane routing resolves
  international→DHL / UK-domestic→Palletline; retired carriers (fedex/bak) are
  REFUSED; a brand cannot create a shipment from another tenant's PO; the
  compliance gate is exercised through its real `(docs, category, agreement, SLA,
  indemnity)` signature; the compliance-approvals and contracts tables are
  asserted against their FULL canonical datasets (paginated DataTables) rather
  than a subset; the E7 social engine asserts the truthful Phase-S resolution
  (no URL ⇒ simulation, explicit URL ⇒ configured) and the live path is proven
  reachable by configuration alone.
- **Evidence:** 60/60 validators exit 0 · tsc 0 · eslint 0 · build ✓ · wording
  184 files / 0 violations · integrity 61/61 · Playwright **250 passed / 2
  skipped / 0 failed**.
- **Reported, not hidden:** two DB constraints the legacy validators asserted
  (`deductions.category` CHECK, an ack-qty DB trigger) have never existed; the
  real enforcement is domain-layer + RLS and the gaps are recorded in
  PROJECT_STATUS §M10⑤. No migration was added (023 remains newest). No
  application source was touched.

### Canonical-model session (13 Sep 2026) — business model reconciled + 2 gaps built
- **`docs/MERCENTA_BUSINESS_MODEL.md` is now CANONICAL** — the single authoritative
  statement of the proxy/distribution model (retail channel → Mercenta → brand and
  back), the hard compliance gate, PO routing, PO-gated shipping, cases, deductions,
  money/VAT/Xero/payout, automation + admin override, providers and testing intent.
  `README.md` rebuilt into a real index; `docs/INTEGRATIONS.md` §10 and
  `PRODUCTION_READINESS.md` updated for the new/changed provider facts.
- **§11 carrier routing, centralised** — NEW `src/config/shipping.ts` +
  `src/lib/shipping/carrierRouting.ts`: international → **DHL**, UK domestic →
  **Palletline**, partnered carrier **only** on Freight Collect. The brand ASN form
  and the admin on-behalf ASN form now BOTH read the rule from this module (their
  local carrier lists are gone). `createShipmentForPO` now enforces the rule AND a
  tenant guard (a brand can only derive a shipment from its OWN eligible PO).
- **§12 shipping commercial model** — NEW `computeShippingCommercials()` in
  `src/lib/shipping/shippingCalculator.ts`: carrier list cost → negotiated discount →
  actual carrier invoice cost → mark-up + surcharge + handling → brand charge →
  VAT (charged / recoverable / payable) → shipping margin → net Mercenta revenue.
  Both sides of the transaction are preserved; all terms are clearly-marked
  placeholders in `src/config/shipping.ts`; nothing hardcodes a 90% mark-up.
- **§15 case review before escalation** — canonical case workflow in
  `src/lib/helpdesk/ticketStore.ts` (`createCase` → `beginCaseReview` → `reviewCase`
  → `escalateCaseToProvider` → `recordProviderCaseResponse` → `resolveCase`/`closeCase`)
  with tenant-scoped read models. A brand case can NEVER reach the retail channel
  without an explicit Mercenta review decision. NEW fail-closed seam
  `src/lib/helpdesk/amazonCaseClient.ts` (Mock = deterministic, no network,
  idempotent; Unknown/other = truthful refusal, never simulated). Exposed in Admin →
  Helpdesk as a "Brand cases — Mercenta review queue" panel.
- **Registry:** `palletline` added to the canonical provider registry
  (`defaultMode: 'available'` — no adapter yet, so it is honestly NOT simulation).
- **NEW validator:** `scripts/validate-canonical-model.mjs` → **34/34 PASS**
  (routing, commercial maths, PO-gated/tenant-scoped shipment, case review gate,
  idempotency, fail-closed provider, failure/recovery, tenant scoping, audit).
- **Gates (this session):** typecheck 0 · eslint 0 · build ✓ · integrity **61/0** ·
  wording **181 files / 0 violations** · canonical-model **34/34** · investor-demo
  validator PASS · targeted Playwright **31 passed / 1 failed** where the single
  failure (`investor-demo` t4) is **PRE-EXISTING** — it fails identically on the
  stashed pre-change tree (verified with `git stash`).

- React/TS/Vite frontend (161 files)
- Supabase (142.93.46.155) — 14 tables + RLS
- 20 Rakazo bots (24.144.86.50) — all demo mode
- Services (46.101.75.185) — Usertour, Postiz. Rocket.Chat was removed from the
  platform in Phase D1 (2026-09-11: panel, mock client/SSO, registry card, nav
  entry, docker-compose service and Caddy vhost deleted). **Phase G1
  (2026-09-13) COMPLETED the server-side cleanup: the retired `rocketchat` +
  `rocketchat-db` (Mongo) containers, their dedicated Mongo volume, their two
  anonymous volumes and both images were removed from `mercenta-services`, the
  two services + volume entry were deleted from `/root/docker-compose.yml`, and
  the stack was re-validated. No rocket/chat/mongo container, volume or image
  remains; all 10 active services were verified unaffected (engine `/api/` 200).
  Backup of the pre-change compose file + inspect JSON:
  `/root/rocketchat-removal-backup-20260913/`. **Never reintroduce Rocket.Chat.**
- Playwright suite (185 passing tests, 30 spec files)
- **Phase E2E — DETERMINISTIC INVESTOR DEMO (2026-09-13, extended M7 2026-09-14)**:
  ONE runnable, zero-network, reset/replayable lifecycle across the whole platform
  (`src/lib/simulation/investorDemo.ts`, **24 stages**: application → … →
  shipment → shipping lane & commercial model → delivery → … → integrations →
  cases → social → RBAC → audit → error/recovery), driven from the existing
  Simulation Control Centre by a new "Investor demo" panel (Run / Reset /
  per-stage OK-BLOCKED-ERROR / digest comparison / `network calls: 0`). Verified by
  `node scripts/validate-investor-demo.mjs` (0 network calls, identical
  digest on reset→replay) and `e2e/investor-demo.spec.ts` (10/10). A REAL defect
  was fixed: a brand could resolve its OWN dispute outcome ("won") — resolution
  is now an operator-only decision in the domain, the brand sees
  "Awaiting Mercenta operations decision", and the admin console has the real
  won/partial/lost resolution.
- Homepage: "Your brand. The UK market." (NO Amazon mention)
- Partner Login + application gate + link verification
- Legal agreements 4.1 + 4.2 in onboarding
- 9 Usertours
- PO email + auto-shipment + label/ASN stubs
- Penny Pincher (7am, real API data, USD)
- Margaret (6:30am, UK accountant)
- Xero integration (28-day reset, auto-reseed)
- Brand Intelligence REAL-DATA LIFECYCLE (Phase B, 2026-09-10): canonical
  prospect store (12 tracked / 10 active), Admin "Run discovery" + run history,
  candidate de-duplication, disqualify/re-qualify with audit history,
  per-prospect History timeline. Tapatío, Seep, Astonish, Fly By Jing,
  LocknLock, Mike's Hot Honey, Cholula, Valentina, Delphis Eco, Kit & Kin.
- Acquisition pipeline (Phase C, 2026-09-11): the ten REAL Brand Intelligence
  brands are now the active ICP acquisition universe (same prospect identity
  end-to-end, no mock lead list). Admin can: select a real prospect → see the BI
  evidence → prepare an outreach recommendation → MODIFY / APPROVE / REJECT it →
  run a deterministic simulated SEND → get a deterministic simulated RESPONSE →
  create an Opportunity → open the relationship in Brand CRM, where the same
  conversation also appears in Messages (one canonical thread). No live
  credentials needed, no Rakazo, no Postiz, no Rocket.Chat, no external network
  calls in simulation.
- Outreach/provider hardened (Phase D3, 2026-09-11; commit `d3cbbd4`): the transport mode is now
  derived from the canonical integration mode model (`resolveOutreachTransport`)
  instead of UI booleans, and the domain FAILS CLOSED — a transport claiming `live`
  without verified credentials is refused (`PROVIDER_NOT_LIVE`) and audited, so an
  unavailable provider can never be silently treated as live. `UNKNOWN ≠ LIVE`;
  simulation is proven zero-network; missing credentials never break it; human
  approval needs neither Rakazo nor Postiz. Also fixed a real defect: `Date.now()`
  outreach record ids collided within a millisecond and destroyed a revision — ids
  are now workflow-owned. Gates: validator 44/44 + E2E 3/3; full E2E 172/0/4.
  Report: docs/PRODUCT_CONSOLIDATION_PHASED3_2026-09-11.md.
- Brand onboarding workflow (Phase E2, 2026-09-11; commit `08a575c`): the onboarding record is now a
  real stateful workflow with THREE entry points into ONE canonical record —
  acquisition opportunity, approved partner application, and operator-created brand
  (all idempotent, deterministic tenant ids). The brand ACCEPTS its onboarding
  through the existing portal wizard (a distinct, attributed, audited transition),
  and Admin has a new **Onboarding** screen that lists every brand in onboarding with
  its real origin, derives all counts from live state (0 when empty) and operates it
  inline: record acceptance → complete the 5 ordered steps → complete onboarding →
  the brand is operational. Tenant isolation is enforced in the domain (a brand
  session is refused any other tenant's record). FIXED: application-approved brands
  could not enter the portal at all, and manually created brands used a random
  tenant id. Gates: validator 45/45 + E2E 3/3; full E2E 181/0/4. Report:
  docs/PRODUCT_CONSOLIDATION_PHASEE2_2026-09-11.md.
- Opportunity → brand onboarding hand-off (Phase E1, 2026-09-11; commit `0568e2a`): the missing link
  after an acquisition Opportunity. A qualified/won Opportunity can now BEGIN
  onboarding, which creates the canonical `BrandOnboarding` record keyed by the
  SAME prospect id (`onb-<prospectId>`), derives the brand TENANT id
  (`brand-tapatio` for Tapatío), sets `Opportunity.brandId` (the D4 gap) and
  audits the hand-off. Five strictly-ordered steps
  (profile → legal agreements → banking → carriers → compliance) complete one at a
  time and the brand then becomes OPERATIONAL. Admin sees the status in the
  Acquisition Opportunity panel and in the Brand CRM pre-onboarding relationship
  row. No second brand identity, no second store, no second database, no new
  credentials needed; RBAC is enforced in the domain. Gates: validator 46/46 +
  E2E 3/3; full E2E 178/0/4. Report:
  docs/PRODUCT_CONSOLIDATION_PHASEE1_2026-09-11.md.
- Persistence / domain hardening (Phase D4, 2026-09-11; commit `eb1e5e8`):
  Phase C/D3 acquisition artefacts (outreach revisions,
  responses, opportunities, events) and the BI lifecycle history (prospect
  updates, runs, change events, snapshots) now mirror through ONE domain
  persistence port (`src/data/domainRepository.ts`) built on the EXISTING Supabase
  repository pattern — no second database. It has a memory adapter (deterministic,
  ZERO network, honest `durable:false`) and a Supabase adapter (idempotent upsert
  on the canonical id, tenant-scoped reads, explicit failures). New migration
  `020_create_acquisition_persistence.sql` (8 tables, RLS + brand-isolation).
  Deterministic, idempotent response ids. Brand CRM now shows an honest
  persistence status. Gates: validator 64/64 + E2E 3/3; full E2E 175/0/4;
  typecheck/lint/build clean. Report:
  docs/PRODUCT_CONSOLIDATION_PHASED4_2026-09-11.md.
  HONEST: Supabase browser credentials are NOT configured in the demo env, so
  nothing is durable there — the UI says `memory-only / not durable` and no
  persistence is claimed.
- BI intelligence preserved through acquisition (Phase D2, 2026-09-11; commit
  `fe0c893`): the acquisition layer now reads a prospect's FULL Brand Intelligence
  by REFERENCE
  (`src/lib/intelligence/prospectIntelligence.ts` — ASINs with per-ASIN metrics,
  contacts, distributors, wholesale, restrictions, growth signals, evidence +
  provenance, the 7 score factors, lifecycle/history) instead of only a narrow
  lead + a prose summary. Outreach revisions store an ids+counts
  `intelligenceRef`; the operator surface shows the canonical intelligence. Also
  fixed a real defect: placeholder outreach addresses now fold diacritics via the
  canonical brand key (`Tapatío` → `hello@tapatio.example`). Gates: validator
  42/42 + E2E 4/4; full E2E 169/0/4. Report:
  docs/PRODUCT_CONSOLIDATION_PHASED2_2026-09-11.md.
- Rocket.Chat REMOVED (Phase D1, 2026-09-11; commit `bf31151`): 3 files deleted, registry 19 → 18
  providers, nav/breadcrumb/route gone, docker-compose service + Caddy vhost
  gone, simulation CASE scenario now provider-free. Regression gates:
  `scripts/validate-rocketchat-removal.mjs` (15/15) + `e2e/rocketchat-removal.spec.ts`
  (5/5). Full E2E 165/0/4 · typecheck 0 · lint 0 · build PASS. Report:
  docs/PRODUCT_CONSOLIDATION_PHASED1_2026-09-11.md.
- Catalog / product management (Phase E3, 2026-09-12; commit `f86d8c7`): the
  product lifecycle is now complete and demonstrable end-to-end in SIMULATION —
  product information → COMPLETENESS → compliance gate → READY → SUBMIT (existing
  `api.submitCatalogItem` seam) → SIMULATED PROCESSING → SIMULATED RESULT →
  resulting product state. Built by EXTENDING the existing product/catalog
  architecture: ONE product store, ONE product/submission shape each, ONE
  prerequisite list, ONE submission vocabulary. Brand portal gets a derived
  readiness banner (exactly which fields are missing), per-product
  Submit / Check result, and a Submission column labelled `(sim)`; the admin
  Global Catalog gets a Submission column and an inline readiness/submission
  detail. Tenant isolation + RBAC are enforced IN THE DOMAIN (a foreign tenant is
  refused CROSS_TENANT; a view-only account is refused FORBIDDEN), the compliance
  gate is NOT weakened, and the whole simulated flow makes ZERO external network
  calls (asserted in both the validator and the browser test). Real defects
  fixed: the submission seam "persisted" to a `catalog_submissions` table that no
  migration creates (an unrunnable write, with the tracking id thrown away);
  brand-added products existed only in React state; the add-product form wrote
  `0` for blank dimensions so an empty product looked complete. Gates: new
  validator 65/65 + new E2E spec 4/4; full E2E 185/0/4 (was 181/0/4, 0 new
  failures); typecheck 0 · lint 0 · build PASS; all 47 pre-existing validators
  byte-identical before/after (13 legacy failures are PRE-EXISTING). Report:
  docs/PRODUCT_CONSOLIDATION_PHASEE3_2026-09-12.md. HONEST: Supabase browser
  credentials are NOT configured → memory adapter only, migration 022 (and
  020/021) unexecuted, so nothing is durable in the demo env and no persistence is
  claimed.
- Commerce / Amazon-style operational simulation (Phase E4, 2026-09-12): the
  operational commerce lifecycle is now genuinely functional end-to-end in
  SIMULATION — E3-ready product → OPERATIONAL ELIGIBILITY (DERIVED from the E3
  readiness + latest submission, never a second rule set) → SIMULATED PURCHASE
  ORDER → ACKNOWLEDGEMENT → FULFILMENT/SHIPMENT (existing ASN seam, simulated
  carrier) → RECEIVING (existing delivery reconciliation) → SIMULATED INVOICE →
  SIMULATED PAYMENT → EXCEPTIONS/CHARGEBACKS (existing Deduction ledger) →
  DISPUTE/RESOLUTION. ONE new domain module
  (`src/lib/commerce/commerceLifecycle.ts`) with a tenant-pinned `CommerceActor`,
  RBAC + tenant isolation IN THE DOMAIN (foreign tenant → CROSS_TENANT, view-only →
  FORBIDDEN, refusal mutates nothing), deterministic idempotent ids, audit on the
  ONE existing `demoAuditLog`, and the D4 persistence port extended (migration
  `023_create_commerce_persistence.sql`, additive, RLS, brand-isolation, NOT
  executed). A SEPARATE email-free `createSimulatedPurchaseOrder` path was added so
  `createPurchaseOrder`'s real Postmark behaviour is untouched. Every record is
  EXPLICITLY simulated (`mode:'simulation'`, `simulated:true`) and says so
  ("No live provider contacted / No email sent"). Minimal UI: brand console on
  Purchase Orders + admin overview on Retail Pipeline, both `(sim)`-labelled and
  rendered AFTER existing content so no existing browser assertion changed. Gates:
  new validator **108/108** + new E2E spec **4/4**; full E2E **189/0/4** (was
  185/0/4 → 0 new failures); typecheck 0 · lint 0 · build PASS; all 48 legacy
  validators byte-identical (15 legacy failures are PRE-EXISTING, proven in a
  worktree at the pre-E4 commit `657b6b2`). Report:
  docs/PRODUCT_CONSOLIDATION_PHASEE4_2026-09-12.md.
- Admin operational surfaces (Phase E5, 2026-09-12): the canonical E1–E4 state is
  now coherently ADMIN-facing. NO new surface, store, dashboard, CRM, PO system,
  catalogue, ticketing or billing system was created, and **no migration** was
  added — every gap extended an EXISTING surface. The admin commerce panel
  (`CommerceOperationsPanel`, hosted in Retail Pipeline) is now OPERABLE: it drives
  acknowledge → fulfil → receive → issue simulated invoice → record simulated
  payment and opens an operational case, all through the EXISTING
  `commerceLifecycle` behind the EXISTING `CommerceActor` (RBAC + tenant isolation
  enforced IN THE DOMAIN, refusals surfaced verbatim). Truthful `(sim)` provenance
  added to the admin PO list, Retail Pipeline, Logistics Control and the commerce
  panel (derived from the canonical flags). The admin PO-create action (which
  sends a REAL email) and the catalog availability/price mutations now honour the
  existing staff permission tier — `createPurchaseOrder`'s email implementation is
  UNTOUCHED. TWO REAL DEFECTS FIXED: Logistics Control's PO column always rendered
  `—` (a shipment id was compared against PO ids — now uses the canonical
  `poNumber`); and the "POs in fulfilment" KPI + "Fulfilment in motion" rows
  drilled to Fulfillment Track, which is the brand SCORING surface — they now route
  to Logistics Control. Two ADDITIVE canonical attention groups (rejected catalog
  submissions; issued-unpaid simulated invoices) were added to the dashboard
  without changing existing row ids, KPI ids or section headings. NotificationCenter
  gained ONE canonical `commerce` kind (no second notification store). The
  duplicated latest-submission derivation now uses the canonical
  `demoStore.latestSubmissionForProduct`. Gates: new validator 48/48 + new E2E spec
  4/4; full E2E 193/0/4 (was 189/0/4 → 0 new failures); typecheck 0 · lint 0 ·
  build PASS; all 49 legacy validators byte-identical (15 pre-existing failures
  proven in a worktree at the pre-E5 commit `981332f`). Report:
  docs/PRODUCT_CONSOLIDATION_PHASEE5_2026-09-12.md.
- Brand operational surfaces (Phase E6, 2026-09-12): parity/canonicality completion
  of the brand side — NOT a redesign and NOT a new brand app. NO new surface, store,
  dashboard, CRM, catalog/PO/ticketing/billing system, lifecycle function or
  navigation, and **no migration**: every change extends an existing file.
  (G1) the brand PO list marks simulated POs `(sim)` from the canonical
  `po.simulated` flag — a Badge only, so no control/DOM order changes and
  `CommerceSimulationPanel` stays last. (G2) the brand dashboard gained two
  APPENDED canonical attention groups — issued-unpaid simulated invoices and
  simulated delivered-awaiting-invoice POs — plus `(sim)` on simulated deduction
  rows; the existing row order, the pinned first `unacked-*` row, all six KPI ids
  and `po-summary-*` are unchanged. (G3) the brand catalog's duplicate last-wins
  submission map was replaced by the canonical
  `demoStore.latestSubmissionForProduct` (canonicality + robustness; the seam is
  idempotent per tenant+sku). (G4) simulated deduction notifications carry `(sim)`
  from the canonical `Deduction.simulated` flag. Gates: new validator 41/41 + new
  E2E spec 5/5; full E2E 198/0/4 (was 193/0/4 → 0 new failures); typecheck 0 ·
  lint 0 · build PASS; the same 15 pre-existing validator failures and all 50
  legacy validators byte-identical (proven in a worktree at the pre-E6 commit
  `d517b17`, tag `mercenta-pre-e6-20260912`). Report:
  docs/PRODUCT_CONSOLIDATION_PHASEE6_2026-09-12.md.
- Review zip script + protection rules + handoff rule
- **Mercenta Social (E7–E9, 2026-09-12/13):** the deployed Postiz engine (v1.47.0) is integrated
  as Mercenta Social with deterministic idempotent per-brand organizations, a fail-closed
  entitlement gate, domain-enforced tenant isolation, a server-side SSO handoff, real TLS, real
  channel connect + a real publication accepted, and a genuine engine defect fixed (Nostr
  `finalizeEvent` Uint8Array). **PARKED/DEFERRED** — the droplet is not resized and the Postiz
  roadmap is not continued. Full record: `PROJECT_STATUS.md` + `docs/PRODUCT_CONSOLIDATION_PHASEE7/E8/E9_*`.
- **Brand deductions ledger (Phase G1, 2026-09-13):** the brand-facing **Deductions Ledger** now
  exists on **Analytics** and **Reports** (`src/components/brand/DeductionsLedger.tsx`), closing
  the documented Tour 5 product gap whose four anchors previously existed in no component at all.
  It reuses the canonical E4 tenant-scoped domain read model + canonical dispute action (brand
  cannot see or mutate another tenant's deductions; refusals shown verbatim), refreshes via the
  canonical store signal, reports real recorded outcomes (no self-declared wins), marks `(sim)`
  honestly, and adds **no new store, workflow, styling or migration**. `tours` t5 is now a genuine
  passing functional + tenant-isolation test. Gates: typecheck 0 · lint 0 · build ✓ · tours 9/9 ·
  **full browser suite 209 passed / 0 failed / 3 skipped** (was 208/0/4).

## WHAT'S LEFT (IN ORDER):
### Canonical-model session (13 Sep) — WHAT REMAINS (honest)
The M-series is NOT complete. Done: **M1** (business-model reconciliation — the
canonical doc + the code/doc contradictions in scope were fixed), **M3** (case
review before channel escalation), **M5** (PO-gated shipping, centralised carrier
routing, shipping commercial model). Verified-as-already-canonical: **M4** (PO
routing/ack/idempotency needed no change).
- ~~**M2 — compliance verification engine (NOT built).**~~ **BUILT (2026-09-14).**
  `src/lib/verification/documentVerification.ts` + `DocumentVerificationRecord`
  (status/source/method/verifier/result/evidence/failure reason/version/
  supersede), the `rejected` + `superseded` document states, document versioning
  with replacement, and an interchangeable automated (structural rules) /
  simulation / manual Mercenta Admin provider seam with fail-closed selection.
  Manual approval cannot bypass the document requirement.
- ~~**M6 — finance / Xero / payout (NOT built).**~~ **BUILT (2026-09-14).**
  `src/lib/finance/financialReconciliation.ts` + `src/lib/finance/accountingSeam.ts`:
  deterministic payment → PO/invoice reconciliation (duplicate refused), the
  canonical payout-eligibility rule (reconciled payment + resolved deductions +
  VERIFIED destination + no duplicate), the payout state machine
  (pending/eligible/submitted/settled/failed/retry) and the audited destination
  review. VAT stays `configuration_required` — never invented.
- ~~**M7 — investor demo NOT extended.**~~ **DONE (2026-09-14).** The demo is now
  **24 stages**: `shipping_commercial` (lane resolution, DHL/Palletline, PO-gated
  shipment creation, full commercial breakdown, upfront brand charge) and `cases`
  (brand case → Mercenta review → idempotent channel escalation → provider
  response → resolution). Zero network, identical replay digest.
- **M8 — documentation sweep: DONE for the canonical set (2026-09-14).**
  `README.md` (validation gates), `PRODUCTION_READINESS.md` (§M2/§M6/§M7
  prerequisites + the 24-stage lifecycle), `docs/MERCENTA_BUSINESS_MODEL.md`
  (§3/§8 implementation anchors), `docs/INTEGRATIONS.md` (new seams),
  `PROJECT_STATUS.md` and `HANDOFF.md` are reconciled. The historical
  `docs/PRODUCT_CONSOLIDATION_*` phase reports are deliberately left as
  point-in-time records (they describe past sessions, not current rules).
- **M9 — full Playwright suite:** run this session; see PROJECT_STATUS.md for the
  result and any remaining pre-existing failures.
- ~~**Pre-existing failure:** `e2e/investor-demo.spec.ts` t4~~ **FIXED
  (2026-09-14).** Root cause was a REAL defect, not a test artefact: a second demo
  run without a manual reset corrupted the run (onboarding
  `ILLEGAL_TRANSITION`, 15 error stages) because the reset baseline was a shallow
  snapshot of a possibly-dirty module instance. Reset now deep-clones its baseline,
  purges the demo tenant's own records from every canonical store, and
  `runInvestorDemo()` always starts from that baseline. The spec is 10/10.
  session's changes, so it is not a regression; it needs its own debugging pass.


NOTE: Development follows the MASTER CONSOLIDATION ROADMAP in
PROJECT_STATUS.md — CORE PRODUCT FIRST, RAKAZO LAST. Rakazo is deliberately
the FINAL phase. The older list below is superseded by that roadmap.
1. [DONE in roadmap] Rakazo iframe in Super Admin — exists; Rakazo bots + real
   workforce integration = FINAL phase (M), NOT current.
2. Namecheap FTP deploy script — DONE (scripts/deploy-demo.sh; demo live).
3. Companies House + HMRC compliance dashboard — DONE (simulation-complete).
4. GO_LIVE.md playbook — pending (production go-live after roadmap).
NEXT in roadmap: PHASE D COMPLETE (D1–D4, 2026-09-11). **PHASE E — CORE PLATFORM
COMPLETION is IN PROGRESS: E1 (opportunity → brand onboarding hand-off) DONE
2026-09-11**, **E2 (brand onboarding workflow) DONE 2026-09-11**,
**E3 (catalog / product management) DONE 2026-09-12** and
**E4 (commerce / Amazon-style operational simulation) DONE 2026-09-12** and
**E5 (admin operational surfaces) DONE 2026-09-12** — a brand can now take a
product from information → completeness → compliance → ready → simulated
submission → simulated result → simulated purchase order → acknowledgement →
fulfilment → receiving → simulated invoice → simulated payment → exception →
dispute, AND an authorised admin can operate that lifecycle from the existing
admin surfaces (Retail Pipeline commerce panel), with tenant isolation, RBAC and
audit enforced in the domain and truthful simulation provenance everywhere, AND
**E6 (brand operational surfaces) DONE 2026-09-12** brings the brand side to parity
(simulated-PO provenance, canonical commerce awareness on the brand dashboard,
canonical latest-submission derivation, deduction notification provenance). Next:
**E7 — embedded Mercenta Social (FULL Postiz application) DONE 2026-09-12** — the
deployed engine (v1.47.0 on the `mercenta-services` droplet) is exposed to every
approved brand as Mercenta Social, with automatic deterministic + idempotent
workspace provisioning, a fail-closed entitlement gate, domain-enforced tenant
isolation, the full 8-module / 35-provider surface, truthful simulation (engine
link NOT established — its API is down), no migration and no second social
platform. Next: **E8 — Mercenta Social is OPERATIONAL (2026-09-12)**: engine Temporal +
its Elasticsearch visibility store + public TLS restored so /api serves instead of 502,
the engine's own signup/login is 403 publicly, and Mercenta's server-side handoff
provisions the brand's deterministic organization and signs it in (idempotent, isolated —
verified live against the engine). Remaining user action: DNS
`postiz.mercenta.co.uk → 46.101.75.185`. Then: **Final UI/UX redesign** — Phase G1 (2026-09-13)
delivered the remaining HONEST product gap inside that phase (the brand deductions ledger behind
Tour 5; full suite 209/0/3).
**PHASE A+B+C+D1 (2026-09-13) — BUILD FORWARD, DONE.** A: ComplianceUploadCard re-verified and
FIXED (both the brand card and the admin Compliance Approvals bumped a dead version counter and
never re-read the docs, so the row badge stayed stale after Upload; the canonical
`reviewGateDocument` gate sync was activated). B: Integration Hub breadth — the canonical
`INTEGRATION_META.category` / `INTEGRATION_CATEGORY_LABELS` / `hasLiveCredentialHint` sources are now
consumed: mode-derived state tiles that filter the list, an actionable attention alert, category
grouping, search + real visible/total count, honest empty state, truthful demo-key note. C: the
hard-skipped access-gate tests closed with real end-to-end coverage (approval → canonical onboarding
record → the brand enters its portal), skips 3 → 2, and two tests that COULD NOT FAIL (`Approve`/
`Reject` matching the status filter chips) repaired. D1: `src/lib/statusPresentation.ts` (single
source of truth for domain status → label + semantic tone + `data-status`), the Applications
decision queue (derived counts, each tile a filter), semantic statuses + honest empty state on
Compliance Approvals, and the brand compliance card on the same statuses.
**PHASE F2 + D3 + D4 (2026-09-13, second session) — DONE.** Commits `76ff520` · `3f14c4a` · `8efc6b4`.
F2: the **integrity audit is GREEN — 61 passed / 0 failed** (was 46/12). Every stale assertion was
repointed at the current architecture (homepage compliant copy + canonical CTA with a no-return guard;
brand-mark check follows the public shell; carrier wiring follows `CarrierShell`; the six account-menu
checks follow `BrandShell`/`AdminShell` plus a new AppShell forwarding assertion) — none were deleted to
make it pass. **`npm run validate:wording` was restored**, and it then failed for real reasons: **53
outward-facing violations** (brand tour copy, BrandIntelligence, the onboarding agreement, outreach
emails) were FIXED to the approved public vocabulary, two further leaks corrected, and four genuinely
internal/admin-only/protected files added to the tool's documented exclusion list with reasons →
`WORDING_LINT_PASS — 176 src files, 0 violations`.
D3/D4: the canonical **`DataTable` was extended properly** (render cells, align, `primary` mobile title,
`hideBelow` progressive disclosure, `rowActions` reachable on desktop AND mobile cards,
`mobile: 'cards' | 'scroll'` intentional mobile strategy, empty/error recovery actions, aria-busy
loading; generic relaxed to `T` so domain types migrate). **Migrated: the brand deductions ledger**
(also removed its fourth hand-rolled status colour map) **and the admin returns-tracking table**.
New `e2e/table-responsive.spec.ts` (3/3) proves table-vs-cards behaviour and zero overflow at
1440/768/375.
Final gates: **full Playwright suite 225 passed / 0 failed / 2 skipped** · typecheck 0 · lint 0 ·
integrity audit 61/0 · wording lint PASS · integrations 37 assertions / 0 failures · migrations
unchanged (23) · baseline `959b4d2` an ancestor.
**NEXT (mechanical now that the primitive exists):** migrate the remaining operational tables
(carrier manifest, product catalogue's 15-column table, BrandReturns, admin audit log, marketing and
prospect tables) onto the extended `DataTable`, then the per-screen density pass (CRM, catalogue,
finance), then Phase G deployment rehearsal on demo.mercenta.co.uk (mercenta.co.uk only via
`GO_LIVE.md`, and only when you say DEPLOY). Social stays PARKED; Rocket.Chat stays retired; Rakazo
stays LAST.

**PHASE D2 + F (2026-09-13) — DONE.** D2: the remaining domain statuses (PO lifecycle, line
acknowledgements, the computed 24-hour ack window, deductions, catalogue submissions, shipments,
onboarding records, returns tracking, PO outages, compliance gate, commission-billing decision) all
render through `src/lib/statusPresentation.ts`; the duplicated sources were DELETED — the brand PO
list's local badge/label maps, RetailPipeline's local `StatusBadge`, OnboardingPipeline's maps,
ReturnsTrackingDashboard's map, BrandSettings' outage map, BrandDashboard's PO maps and
**`STATUS_COLORS` in types.ts**. Two real inconsistencies were eliminated (a deduction `open` rendered
amber on one admin screen and red on another; the same PO status rendered two different label casings),
and three dead status helpers were removed. `status-semantics.spec.ts` is now 6/6 including an
invariant that fails if any `[data-status]` outside the canonical vocabulary appears anywhere on the
brand PO list, the admin Retail Pipeline, the brand dashboard or the carrier manifest.
F: **`GO_LIVE.md` now EXISTS** (the ordered runbook: repo gate → env → migrations/Edge Functions →
credential-only provider swap → deploy → 8-step smoke test → rollback → non-scope), and
`scripts/validate-edge-functions.mjs` **no longer crashes** — it reports absent artefacts as explicit
deploy-time items (8 today) and exits 0 with 37 assertions / 0 failures.
Final gates: typecheck 0 · lint 0 · build OK · **full suite 222 passed / 0 failed / 2 skipped** ·
migrations unchanged (23) · baseline intact.
**NEXT (in order):** repair the 12 stale assertions in `scripts/integrity-audit.mjs` (it still expects
pre-Phase-6 shell routing, the "Get Started" CTA and the removed `validate:wording` script — the exact
list is in PRODUCTION_READINESS.md) → finish the per-screen redesign polish (dashboards/CRM/catalogue/
finance densification, mobile table strategies) → Phase G deployment (demo.mercenta.co.uk rehearsal
first; mercenta.co.uk only through GO_LIVE.md). Social stays PARKED; Rocket.Chat stays removed; Rakazo
stays LAST.

## API KEYS (AUDITED 2026-09-17 — names only, values never logged):
IN .env (DEV-SIDE ONLY — NON-VITE: NOT exposed to the browser build; runtime cannot read them):
  DO, Postmark, Hunter, Firecrawl, PandaDoc, Instantly, DigitalOcean, Xero (id/secret/tenant/access), Supabase (server), Namecheap FTP
IN .env: VITE_XERO_CLIENT_ID, VITE_RAKAZO_URL (= browser-exposed).
IN .env.deploy: SFTP/FTP demo-deploy creds (Namecheap), DEPLOY_DOMAIN.
NOT PRESENT ANYWHERE (audit-confirmed): OPENROUTER_API_KEY, VITE_OPENROUTER_API_KEY, VITE_HUNTER_API_KEY,
  VITE_INSTANTLY_API_KEY, VITE_POSTMARK_API_KEY, VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY,
  WISE_API_TOKEN, WISE_PROFILE_ID, PAYONEER_*, KEEPA, STRIPE, DHL, PALLETLINE, TWILIO, AMAZON/SP-API, HMRC, Companies House, GOOGLE OAuth.
RUNTIME LIVE CALLS EVER MADE: NONE (0 OpenRouter, 0 Hunter, 0 Firecrawl, 0 Keepa, 0 Amazon, 0 Xero-live, 0 rails, 0 email).
CONTROLLED LIVE CANDIDATES (NOT ACTIVATED — await credit-cap + cache + auto-stop + Super Admin visibility):
  Companies House free READS; Hunter Free ~50 credits/mo; optional zero-cost auth pings. See requirements-registry `integration-audit-*` rows.

WAITING: Amazon SP-API, DHL, Stripe, Xero (sign up now),
Companies House (sign up now), HMRC (few days), Keepa (paid)

## DROPLETS (3, $60/mo):
- mercenta-supabase-demo (142.93.46.155, 2GB, London)
- mercenta-services (46.101.75.185, 4GB, London)
- mercenta-agents-v2 (24.144.86.50, 4GB, SF)
SSH: ~/.ssh/id_ed25519 (Rakazo), ~/.ssh/mercenta_do_id_rsa (Services)

## BOTS (20, demo mode):
Adam, Jess, Marcus, Priya, Kwame (African/Asian, free tools),
Sofia, Elena, Diego (PAUSED), Noor, Leo, Wei, Ava, Ravi, Freya,
Omar, Ingrid, Zara (draft only), Penny Pincher (7am), Margaret (6:30am)

## BUSINESS RULES:
- Public: "UK market" / "UK retail channels" ONLY
- NEVER public: Amazon, Vendor Central, 1P, VaaS
- Internal: "UK Market-as-a-Service"
- 10 categories, African/Asian focus, embassy angle
- Direct + Financed fulfillment

## COMPANY:
- Mercenta Partners Ltd — 1st Formations, waiting on ID verification
- Sole director/shareholder/PSC
- SIC: 46900, 46190, 62012, 52290
- Registered office: London. Residential: Harare, Zimbabwe

## CURRENT STATE:
- demo.mercenta.co.uk = FROZEN (Aug 31)
- Local code = current
- npm run preview = correct version
- Deploy script = NOT YET CREATED

## HOW TO USE THIS DOC:
1. Paste into new AI chat as first message
2. Say: "Continue. I'm on [task]. Give me next prompt."
3. AI gives ONE short prompt. Paste into Cline. Paste output back.
4. NEVER combine prompts. NEVER mega-prompts.
5. Say "Provide Handoff" to Cline to auto-update this file.

---

## EXACT PROMPTS BELOW — Do NOT reword, do NOT combine.

### PROMPT: Rakazo Iframe
This is a Super Admin panel integration task.
Goal: Add a "Bot Workforce" tab that embeds the Rakazo web UI.
1. In SuperAdminPanel.tsx, add tab "Bot Workforce" (after "Accounting").
2. Full-height iframe: src https://24-144-86-50.sslip.io, width 100%,
   height calc(100vh - 120px), border none,
   sandbox "allow-scripts allow-same-origin allow-forms allow-popups"
3. Toolbar: "Open in new tab", "Refresh", green/red status dot.
4. Constant: export const RAKAZO_URL = 'https://24-144-86-50.sslip.io';
5. Do NOT change other tabs.
Rules: No styling changes. No demo data deletion. No commit unless
I say so. Show git diff --stat. Run npm run build. Run relevant e2e.
Run zip script.
### PROMPT: Namecheap FTP Deploy
This is a deploy-to-Namecheap automation task.
Part 1: Add to .env: NAMECHEAP_FTP_HOST: ftp.demo.mercenta.co.uk,
NAMECHEAP_FTP_USER: demo@demo.mercenta.co.uk,
NAMECHEAP_FTP_PASS: <REDACTED — value lives in .env only (gitignored) and is entered by the FOUNDER in Super Admin; never written into this doc, source, reports, prompts, generated files or the review ZIP>, NAMECHEAP_FTP_PORT: 21
Part 2: Create scripts/deploy-demo.sh:
#!/bin/bash
set -e
echo "Building..."
cd ~/Desktop/Mercenta
npm run build
echo "Deploying..."
source .env
lftp -u "$NAMECHEAP_FTP_USER,$NAMECHEAP_FTP_PASS" -p
"$NAMECHEAP_FTP_PORT" "$NAMECHEAP_FTP_HOST" <<EOF
cd /
mirror -R --delete dist/ .
EOF
echo "Done. Check: https://demo.mercenta.co.uk"
chmod +x scripts/deploy-demo.sh
Part 3: Test it. Confirm live.
Part 4: Add to protection-rules.md: "Do NOT deploy unless I say
'deploy'. Only demo.mercenta.co.uk."
Rules: No source file changes. No commit unless I say so. Show
deploy output. Run zip script.

### PROMPT: CH + HMRC Compliance
This is a compliance dashboard task.
Goal: Add "Compliance" tab to Super Admin (after "Accounting").
Part 1: Create src/lib/compliance/companiesHouseClient.ts
  (Real: api.company-information.service.gov.uk, Basic Auth.
   Mock: "CH not connected")
Part 2: Create src/lib/compliance/hmrcClient.ts
  (Real: api.service.hmrc.gov.uk, OAuth Bearer + fraud headers.
   Mock: "HMRC not connected")
Part 3: Create src/lib/compliance/complianceSync.ts
  (getComplianceDashboard, fileNow)
Part 4: Add to .env: CH_API_KEY, CH_COMPANY_NUMBER, CH_AUTH_CODE,
  HMRC_CLIENT_ID, HMRC_CLIENT_SECRET, HMRC_MODE: demo
Part 5: Super Admin tab: CH status + CS deadline + filing history.
  HMRC VAT status + next deadline + CT deadline. Deadline tracker
  (90 days, amber <14). "Sync Now" + "File" buttons (disabled demo).
Part 6: Update Margaret + Adam instructions on droplet.
Part 7: e2e/compliance.spec.ts (5 tests: not connected, placeholders,
  sync error, file disabled, history empty)
Rules: No styling. No demo data. Demo mode graceful. No commit
unless I say so. Show diff. Build. E2E. Zip.

### PROMPT: GO_LIVE.md Playbook
This is a go-live playbook creation task.
Create ~/Desktop/Mercenta/GO_LIVE.md with:

# GO LIVE PLAYBOOK
Trigger: Adam receives "Let's go live" → reads this → instructs
Ravi (items 1-8), Ava (item 11), Adam handles 9-12, item 13 verify.

PREREQUISITES (if ANY missing, STOP and report which):
Amazon SP-API (LWA ID + Secret)
DHL Enterprise (API Key + Account)
Stripe (Publishable + Secret)
Xero (Client ID + Secret + Tenant ID)
Keepa (API Key)
Companies House (API Key + Company Number + Auth Code)
HMRC (Client ID + Secret + GG creds)
All brands approved. All tests passing. RLS verified.

ITEMS:
1. SP-API: replace mock, create Edge Functions (auth, poll 15min, ship)
2. DHL: replace label stub, create dhlClient.ts, POST /shipments/v4
3. Stripe: replace mock, wire subscriptions + payouts
4. PandaDoc: replace signing stub, POST /v1/envelopes, webhook
5. Xero: connect, XERO_MODE=production, full reseed
6. Keepa: replace mock research
7. PO cron: */15 * * * *
8. Postiz: re-add Temporal, resize 8GB, Zara DRAFT→SCHEDULED
9. Diego: unpause outreach
10. Remove demo mode from all 20 bots
11. CTA: "See if your brand qualifies" → "Start your onboarding"
12. Deploy to mercenta.co.uk
13. Verify: all tests, build, all flows, Penny/Margaret/Adam live

EXECUTION: 1-8 Ravi, 11 Ava, 9-10 Adam, 12 Adam, 13 All. 4-6 hrs.

Then: Update Adam + Ravi instructions on droplet with GO LIVE
trigger/execution sections. Copy GO_LIVE.md to /srv/rakazo/.
Verify all files exist.
Rules: Do NOT implement go-live items. Only create file. No commit.
Run zip script.
---