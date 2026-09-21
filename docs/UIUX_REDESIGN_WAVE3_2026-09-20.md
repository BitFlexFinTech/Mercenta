# UI/UX REDESIGN WAVE 3 — ENTERPRISE SHELL, HIERARCHY AND THE OPERATIONAL TYPE SCALE

> Date: 2026-09-20 · Branch: `redesign/foundation` · Session increment: **Wave 3 — Part 1**
> Status: **IMPLEMENTED + VERIFIED (static + browser)**. Not the whole platform redesign —
> see §9 "What is NOT done in this increment".

## 1. Why this increment exists

The Founder's correction was explicit: the previous workstream produced foundation
work, audits and a palette — **not the requested redesign**. The product UI/UX was
substantially unchanged, and the Founder supplied visual evidence: the current
dashboard is oversized, portal-like, a collection of equally-weighted cards, with an
intrusive floating environment switcher.

Wave 3 therefore starts with the parts that are *structurally* wrong and that
propagate platform-wide, rather than restyling 60 pages one at a time.

## 2. What was actually wrong — measured, not asserted

Read directly from the current source and a real browser render
(`test-screenshots/dashboard/admin-1440x900.png`):

| # | Defect | Evidence | Class |
|---|---|---|---|
| W3-1 | The demo **environment switcher floated over page content** (`fixed bottom-0`, centred), covering the last rows of every workspace. The app compensated with a blanket `pb-16` on `<main>`, reserving empty space *under* content the pill then covered anyway. | `EnvironmentRouter.tsx` (pre-change), `AppShell.tsx` `className="flex-1 overflow-y-auto pb-16"` | FUNCTIONAL/DEFECT |
| W3-2 | A control rendered as the word **"Home"** called `signOut()` (`title="Back to homepage"`). Clicking an innocent-looking navigation label silently destroyed the session. | `Header.tsx` pre-change, lines 133–139 | FUNCTIONAL/DEFECT |
| W3-3 | The workspace **sticky toolbar offset was `top-[52px]`** but the app bar is `h-14` (56px) and `<main>` is its own scroll container — so content visibly scrolled through the 52px band above the sticky toolbar. | `workspace.tsx` `WorkspaceHeader` pre-change | FUNCTIONAL/DEFECT |
| W3-4 | **Metric values were 20px (`text-xl`) — exactly the page-title size** — so a KPI number and the `h1` competed at the same visual weight. Hero values were arbitrary `text-[26px] sm:text-[30px]`. | `workspace.tsx` `MetricBody`, `dashboard.tsx` `KpiCellBody` | HIERARCHY |
| W3-5 | **1,202 arbitrary sub-12px sizes** across 113 files (`text-[8px]` 47 · `text-[9px]` 206 · `text-[10px]` 949) plus 644 `text-[11px]` — while `docs/DESIGN_SYSTEM.md` said to avoid them. There was **no named operational size to use instead**. | grep counts, recorded as finding D-2 | DESIGN SYSTEM |
| W3-6 | The Super Admin rail is **30+ destinations across 8 sections with no way to find one** except scrolling the whole rail. | `AdminShell.tsx` `ADMIN_SECTIONS`; screenshot | IA / FINDABILITY |
| W3-7 | Collapsed nav sections produced **inconsistent vertical rhythm** (double `mt-1 mb-1` margins on headers and badges, plus `mb-0.5` on the wrapper) and section headers were visually weaker than the items they labelled. | `Sidebar.tsx` pre-change | DENSITY |

## 3. What was built

### 3.1 The canonical operational type scale (fixes W3-5 at the root)

The debt was **not** 1,202 individual mistakes — it was a design-system failure: no
named operational size existed below `text-xs`, so every author invented one. The fix
is therefore token-first, then a mechanical migration (exactly what the earlier
analysis demanded: *"a partial pass makes the inconsistency worse"*).

Declared in `tailwind.config.js` → `theme.extend.fontSize`:

| Token | Size | Role |
|---|---|---|
| `text-ds-micro` | **11px (floor)** | eyebrows, nav section labels, dense meta, badges |
| `text-ds-label` | 12px | control labels, table headers, form helpers (= `text-xs`) |
| `text-ds-body` | 13px | table cells, dense body copy |
| `text-ds-title` | 15px | section / card titles |
| `text-ds-page` | 20px | workspace page title (`h1`) |

- **Migration:** `scripts/migrate-micro-typography.mjs` → **1,845 replacements across
  116 files**. Idempotent (re-run = 0 changes, proven).
- **Gate:** `scripts/validate-typography-scale.mjs` → 17 assertions.
- **The gate was proven to fail:** injecting `text-[10px]` into a probe file produced
  `TYPOGRAPHY_SCALE_VALIDATION_FAIL … src/__typography_probe.tsx (1)` and exit 1.
- **Blind spot found and closed:** the first run missed
  `src/components/marketing/PublicFooterTmp1.jsx` (the repo's only `.jsx`) *and so did
  the validator* — the gate reported PASS while a micro size survived. Both scripts now
  scan `.ts/.tsx/.jsx/.js/.css`.

### 3.2 The environment switcher is no longer product chrome (fixes W3-1)

`EnvironmentRouter.tsx` was rebuilt as an **inline** control in the navigation footer,
explicitly labelled **"Environment · Demo"**, with `role="group"`, `aria-pressed` per
option and a compact (icon-only) variant for the collapsed rail. It can no longer
overlap content, and it can no longer be mistaken for production UI. The blanket
`pb-16` hack was removed because its cause was removed.

The one-click switch is **retained deliberately** (§22 — do not blindly delete): it is
how a reviewer moves between the four role shells. No browser spec depended on the old
floating form (verified by grep before changing it).

### 3.3 The app bar (fixes W3-2, improves findability)

- The mislabelled **"Home" → `signOut()`** control was removed. No capability was
  lost: the profile menu carries a correctly-labelled **Sign Out**.
- The search affordance is now a **command bar occupying the centre of the app bar**
  (the enterprise pattern) instead of a small pill at the right edge. Same ⌘K binding,
  same palette, same RBAC-scoped groups — only prominence changed.
  `data-testid="app-search-trigger"` is preserved verbatim.

### 3.4 The navigation rail (fixes W3-6, W3-7)

- **New navigation filter** (`data-testid="nav-filter"`): 30+ destinations are now
  findable by typing. It filters what is *rendered* and derives from the sections the
  shell already scoped — **RBAC is untouched**, so no destination can be revealed by
  searching for it (§18). While a filter is active, matches are shown expanded, because
  a collapsed section would hide the result the user just searched for. A real empty
  state (`data-testid="nav-filter-empty"`) is rendered when nothing matches.
- Section rhythm fixed: `mt-2 first:mt-0` on the section wrapper, single `mb-1` on the
  header, and the header promoted to `font-semibold tracking-[0.14em]` so a section
  label reads as a label rather than as another item.

Every existing navigation contract is preserved: `DOMAIN_COLOURS` (no `bg-brass`),
one `<aside>` landmark, `aria-current`, `data-state="active|idle"`, `badge?: number`,
`nav-badge-*`, pinning (`togglePin` / `nav-pin-*`), collapsible sections
(`toggleSection`), and the opt-in compact rail (`onToggleCompact`).

### 3.5 Workspace hierarchy and density (fixes W3-3, W3-4)

`WorkspaceHeader` is composed by every migrated surface, so it is the single
highest-leverage place to fix "every block competes at the same weight":

- Title `sm:text-2xl` (24px) → **`text-ds-page` (20px)** — a 24px serif `h1` reads as a
  marketing headline; 20px reads as an enterprise entity title.
- Description `text-sm` (14px) → **`text-ds-body` (13px)** so the title clearly wins the
  first glance.
- Rhythm tightened (`mb-4`→`mb-3`, entity `mb-3`→`mb-2`, `mt-1.5`→`mt-1`).
- **Sticky toolbar `top-[52px]` → `top-0`** (correct: `<main>` already begins below the
  56px app bar, so `top-0` is flush under it).
- Metric values: hero `text-[26px] sm:text-[30px]` → **`text-2xl`** (24px); default
  `text-xl` (20px) → **`text-lg`** (18px). Metrics now sit *below* the 20px page title
  in the hierarchy while still dominating their row (mono + semibold + white).

## 4. Contracts preserved (nothing was weakened)

| Contract | Status |
|---|---|
| `app-search-trigger`, `app-menu-toggle` in Header | preserved verbatim |
| `title="Back to homepage"` (exit-to-public-site path) | **restored after a caught regression — see §7** |
| Single nav landmark (`one <aside>`), `aria-current`, `data-state` | preserved |
| `nav-badge-*`, `nav-pin-*`, `togglePin`, `toggleSection`, `onToggleCompact` | preserved |
| `<CommandPalette>`, ⌘K binding, `navSections.flatMap` (RBAC inheritance) | preserved |
| `data-workspace-frame` / `-header` / `-toolbar` | preserved |
| `AppShell` forwards `onNavSettings` / `onNavBilling` / `onNavApiKeys` | preserved |
| All 15 `workspace.tsx` exports | preserved |

**One validator contract was REPOINTED, never weakened:** `validate-uiux-redesign.mjs`
asserted the Explore-UK-Market-Fit eyebrow used the literal `text-[10px]`. The intent
(mono eyebrow treatment) is unchanged; the assertion now names the current canonical
source of truth, with an inline `§UI/UX Wave 3 — REPOINTED` comment recording the old
contract.

## 5. Open-source evaluation (done before writing code)

| Capability | Candidate | Licence | Decision | Reason |
|---|---|---|---|---|
| Command bar / palette | **cmdk** | MIT | **REJECT** | A real, RBAC-scoped `CommandPalette` already exists and is asserted by 369 validator checks. Adding cmdk would create a second findability system (forbidden) for no gain. |
| Nav filter | — | — | **BUILD CUSTOM** | ~15 lines filtering an already-scoped array. A dependency here is pure novelty. |
| Type scale | Tailwind's own `fontSize` extension | MIT (already a dependency) | **ADOPT** | The mechanism already existed; only the *names* were missing. |
| Data tables | TanStack Table / AG Grid | MIT / MIT+ | **REFERENCED, NOT ADOPTED** | The repo has a canonical `DataTable` + `workspace.tsx` `Queue` with Playwright contracts on both. Replacing them is a separate, larger decision with real regression risk. **Recorded as a candidate for a later wave.** |
| Timelines / activity | — | — | **REJECT (for now)** | `ActivityFeed` already exists and is composed by `AdminDashboard`. |
| Visual regression | Playwright `toHaveScreenshot` | Apache-2.0 (already a dependency) | **ADOPT (planned)** | No pixel-diff gate exists (finding D-4). The baseline PNGs are already committed, so the gate is cheap — but it needs a baseline policy. **Deferred, owner recorded.** |

**No open-source dependency was added in this increment.** Every change above reuses
existing Mercenta capability or Tailwind itself. This is deliberate: the standing rule is
to prefer existing Mercenta capability, then mature open source, then custom — and here
the existing capability already covered every case.

## 6. Findings raised but NOT actioned (Founder decision required)

1. **`src/components/marketing/PublicFooterTmp1.jsx` is an unreferenced orphan** — the
   repo's only `.jsx` file, dated 2026-09-06, imported by nothing (grep across `src/`,
   `e2e/`, `scripts/`: zero hits), and a near-duplicate of `PublicFooter.tsx`. It was
   **migrated, not deleted** (deleting files requires explicit instruction). Recommend
   Founder confirmation to delete.
   > **RESOLVED 2026-09-21 — DELETED.** The clean-slate reconciliation directive
   > authorised ordinary removal of obsolete material, so the file was `git rm`-ed.
   > Zero references remained anywhere in `src/`, `e2e/` or `scripts/`; the canonical
   > footer is `src/components/marketing/PublicFooter.tsx`. The typography gate's
   > `.jsx` coverage is retained (it must cover every renderable extension), and its
   > comment now records the removal instead of naming a file that no longer exists.
   > See `.clinerules/operating-model.md` §6 and the report in `PROJECT_STATUS.md`.
2. **`src/theme-alpha-shims.css` (691 lines)** still ships a legacy shim layer alongside
   the token system (finding D-3). Removing it needs a per-screen token migration.
   Not attempted here — it is a separate, larger pass.
3. **No visual-regression gate** (finding D-4). Playwright can do it and baselines are
   already committed; the missing piece is a baseline policy decision.
4. **`AdminShell` chunk is 1,010 kB** (263 kB gzip) — the build warns about it. A real
   performance finding surfaced by this session's own build output, owned separately.

## 7. Browser verification — including a regression that was caught and fixed

The browser suite is the reason this session did **not** ship a broken contract.

**Run 1 — shell / UIUX / design-system / uiux-foundation:**
`56 passed (49.5s)` — 0 failed. Includes every responsive no-horizontal-overflow check at
1440 / 1280 / 1024 / 768 / 390 / 375, which is what proves the 1,846-place typography
migration (+1px in most places) caused no layout overflow.

**Run 2 — dashboard / table-responsive / record-drawer:**
`1 failed · 26 passed`. The failure was **caused by this session's own change**:

```
Error: locator.click: Test timeout of 30000ms exceeded.
  waiting for getByTitle('Back to homepage')
  at e2e/record-drawer.spec.ts:219
```

**Root cause:** an earlier step in this same session removed the header control whose
visible label read "Home" but which called `signOut()`. The diagnosis was correct (a
navigation-looking label that silently destroys the session is a genuine defect), but
removing it was the **wrong remedy** — four specs drive the exit-to-public-site path
through that control's `title`, and it is the only in-shell route back to the public site:

| Spec | Line |
|---|---|
| `e2e/access-gate.spec.ts` | 175 |
| `e2e/homepage-editor.spec.ts` | 77 |
| `e2e/onboarding-workflow.spec.ts` | 68 |
| `e2e/record-drawer.spec.ts` | 219 |

**Process failure acknowledged:** the pre-change grep searched for `text=Home` /
`'Home'` / `name: 'Home'` but not for `getByTitle('Back to homepage')`, so the dependency
was missed. Typecheck and build cannot catch this — only the browser suite did.

**Fix:** the control is **restored** with an honest visible label ("Exit to site") plus a
`LogOut` icon, so it reads as "leave the portal" rather than as navigation. The `title`
is retained because it accurately describes the action and is the specs' contract. No
`aria-label` was set, so the accessible name remains identical to the visible text
(WCAG 2.5.3 "Label in Name"). This fixes the UX defect **without** removing capability or
breaking the suite.

**Run 3 — the four affected specs:** `25 passed · 2 skipped · 0 failed (33.5s)` — the
regression is closed. The previously failing `record-drawer.spec.ts:191` now passes.

**Screenshots:** before/after pairs are preserved in `test-screenshots/wave3-before/`
(the pre-change renders) against the regenerated `test-screenshots/dashboard/`. The
difference is structural and obvious: the floating environment pill is gone (replaced by
an inline, Demo-labelled control in the nav footer), the app bar carries a real command
bar instead of a small pill, the rail gains a navigation filter, and the page header is
compact with metric values no longer competing with the `h1`.

## 8. What is NOT done in this increment (honest scope statement)

This is **Wave 3 Part 1**. It is **not** the complete platform redesign the Founder
commissioned, and it must not be reported as such.

Done: the shared shell, the navigation rail, the app bar, the demo environment
mechanism, the workspace header primitive, the metric primitives, and the typography
system (with a proven gate).

**Not yet done** — each of these is a real, remaining body of work:
- Page-by-page redesign of the individual surfaces. The `AdminDashboard` (Operations
  Overview) *composition* was **not** restructured; only its header, metric hierarchy
  and the shell around it changed.
- The Brand surface redesign.
- Table / form / filter / drawer redesign at page level.
- Empty / loading / error state redesign beyond what already existed.
- Removal of `theme-alpha-shims.css`.
- The visual-regression gate.
- The remaining `text-xs` / `text-sm` → full-scale migration (deliberately **not**
  attempted: those sizes are already canonical per `docs/DESIGN_SYSTEM.md`).
- `Overview` / `Operational Dashboard` / `Mercenta Brain` remain three separate
  destinations as required (§12) — none was merged or replaced.

## 9. Files changed in this increment

**New**
- `scripts/migrate-micro-typography.mjs`
- `scripts/validate-typography-scale.mjs`
- `docs/UIUX_REDESIGN_WAVE3_2026-09-20.md` (this file)
- `test-screenshots/wave3-before/*.png` (pre-change evidence)

**Modified (source)**
- `tailwind.config.js` — the operational type scale
- `src/components/layout/EnvironmentRouter.tsx` — inline demo switcher
- `src/components/layout/AppShell.tsx` — switcher into the nav footer, `pb-16` removed
- `src/components/layout/Sidebar.tsx` — nav filter, section rhythm
- `src/components/layout/Header.tsx` — command bar; exit-to-site control relabelled
- `src/components/shared/workspace.tsx` — `WorkspaceHeader`, metric hierarchy
- `src/components/shared/dashboard.tsx` — `KpiCellBody` value size
- `package.json` — `validate:typography`, `migrate:typography`
- `docs/DESIGN_SYSTEM.md` — the scale documented

**Modified (mechanical, 116 files)** — the `text-[8px]/[9px]/[10px]` → `text-ds-micro`
and `text-[11px]` → `text-ds-label` migration. Presentation-only: no colour, spacing,
layout or behaviour class was touched.

**Modified (validator)**
- `scripts/validate-uiux-redesign.mjs` — one assertion REPOINTED with an inline comment

## 10. Environment / authority confirmations

- **No `.env` file was read or modified.** No credential was read, added, activated or
  rotated. No production infrastructure or deploy configuration was touched.
- **No production/live provider activation occurred.** No live network call was made by
  any change; every simulated provider remains simulated.
- **Rakazo and Postiz were not touched.** No file matching either was opened or edited.
- **No Git history mutation:** no reset, clean, checkout, stash, rebase, force-push or
  history rewrite. The intentionally dirty working tree was extended, never discarded.
- **No commit was created.** The working tree already carried uncommitted Founder work
  before this session (`98 tracked files changed / 4,677 insertions / 168 deletions` at
  session start, plus untracked work). Committing would sweep that unknown work into an
  unauthorised commit, which is a hard-stop condition (overwriting unknown Founder work).
  **A verified checkpoint commit therefore requires explicit Founder instruction.**

