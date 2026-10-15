# MERCENTA DESIGN SYSTEM

> Canonical visual system for the premium B2B distribution operations platform.
> Phase 5 establishes the FOUNDATION. Later phases (6–9) apply it screen-by-screen.
> This document is the practical reference for tokens and component APIs.

## Principles

- Premium wholesale-operations platform, NOT a generic dark SaaS template.
- Surfaces built on OpenShip's design language (one light design for the three light slots,
  its dark design for `serious`) with a PER-THEME accent — violet · blue · lime · orange;
  `bold` keeps its own violet-black identity and is deliberately unchanged.
  Serious B2B tone; Plus Jakarta Sans + Fraunces.
- Meaningful hierarchy, whitespace, purposeful density, operational clarity.
- Semantic states are machine + human readable — never colour-only.
- Restrained motion: motion communicates state/transition/feedback, not decoration.

## Tokens (source: `tailwind.config.js`)

### Colour
Every colour token maps to a **theme CSS variable** (`--mr-*`, declared once in
`src/config/themes.ts` and applied by `ThemeContext`), never to a literal hex — so one
class renders differently in each of the five themes, and no page may hardcode a colour.

| Token | Maps to | Purpose |
|---|---|---|
| `ink-950` / `ink-900` | `var(--mr-bg-deep)` / `var(--mr-surface)` | deepest background · cards and panels |
| `ink-850` / `ink-800` | `var(--mr-surface-raised)` / `var(--mr-surface-overlay)` | raised surface · overlays and dropdowns |
| `ink-700` / `ink-600` / `ink-500` | `var(--mr-surface-hover)` | hover fills |
| `surface.raised` / `surface.overlay` | `var(--mr-surface-raised)` / `var(--mr-surface-overlay)` | elevated surfaces |
| `brass-500` (`brass.DEFAULT`) | `var(--mr-accent)` | **the per-theme accent** — the primary CTA |
| `brass-300` / `400` / `600` / `700` | `var(--mr-accent-300…700)` | accent tints (300/400) and shades (600/700) |
| `zinc-100…600` | `var(--mr-text-200…faint)` | the text hierarchy |
| `state.success` … `state.muted` | `var(--mr-state-*)` | semantics |

Legacy tokens retained for backward compatibility (`amber.accent`, `crimson.accent`, etc.).
The canonical kit SHOULD use `state.*` for semantics.

> **§OPENSHIP BATCH 3 (2026-10-14) — THE ACCENT IS PER THEME, NOT ONE GOLD.**
> The four non-Bold themes now carry OpenShip's own accent hues
> (`docs/OPENSHIP_REFERENCE_SPEC.md` §13): `minimal-light` violet `#7E22CE` ·
> `professional` blue `#2563EB` · `fun` lime `#A9F04D` (which takes DARK text on it) ·
> `serious` orange `#F97316`. `bold` keeps its violet `#7C3AED` and is unchanged.
> The token NAME `brass` is retained as the accent's class alias — thousands of call
> sites use `bg-brass-500` and none had to change — so **a class called `brass` can now
> render violet: it means "the accent", not "gold".** The brass/gold identity survives
> only where it is brand rather than theme: the logo marks in `src/assets/`.

### Typography
- `font-display` (Fraunces) — display / entity titles.
- `font-sans` (Plus Jakarta Sans, OFL 1.1) — body, subtitle. §OPENSHIP BATCH 3 (2026-10-14):
  the reference's Gellix is "Personal Use Only" and is not shipped.
- `font-mono` (IBM Plex Mono) — numeric / KPI / ids.
- Hierarchy: Display (2xl/3xl, display face) → Page title (`ds-page`) → Section
  (`ds-title`) → Body (`ds-body`) → Label/caption (`ds-label`) → Micro
  (`ds-micro`, the floor).

#### §UI/UX Wave 3 — the canonical operational type scale

The scale below is declared in `tailwind.config.js` → `theme.extend.fontSize`.
**It exists because there was no named operational size to reach for**, so
authors invented one: the measured debt was 1,202 arbitrary sub-12px sizes
(`text-[8px]` 47 · `text-[9px]` 206 · `text-[10px]` 949) across 113 component
files, plus 644 `text-[11px]`. That is a design-system failure, not 1,202
individual mistakes.

| Token | Size | Used for |
|---|---|---|
| `text-ds-micro` | **11px** (floor) | eyebrows, nav section labels, dense meta, badges |
| `text-ds-label` | 12px | control labels, table headers, form helpers (= `text-xs`) |
| `text-ds-body` | 14px | body copy, table cells (= `text-sm`) |
| `text-ds-title` | 16px | section / card titles |
| `text-ds-page` | 20px | workspace page title (`h1`) |

**§PHASE C4 (2026-10-13) — the body step is 14px, and the title step 16px.**
Before this, the body step was one size *below* the application's own default:
`text-sm` (14px) is used 258 times across 75 files while the token was consumed in
15 places in 5 files, so the design system declared a body size the product did not
use. The Owner approved 14px body (`docs/PHASE_C_TO_G_PLAN_2026-10-13.md`, D-2).
The title step moved with it, because a 14px body under a 15px title is a 1px step
— which is not a hierarchy. The floor (11px), the label step (12px) and the page
step (20px) are deliberately unchanged: the decision was a readable body, not a
uniformly larger interface.

Rules:
- **11px is the floor.** Nothing below it may be introduced in `src/`.
- `text-xs` (12px) is the same size as `text-ds-label`, and `text-sm` (14px) is the
  same size as `text-ds-body` — the tokens NAME those sizes so the hierarchy is
  explicit rather than implied by Tailwind's defaults.
- **No arbitrary px size inside the 11–20px range.** Every step there has a name.
  Sizes ABOVE 20px are display/metric figures, not operational text, and are still
  expressed with Tailwind's own larger steps.
- Migration is mechanical and idempotent:
  `npm run migrate:typography` (re-running is a no-op).
- The gate is `npm run validate:typography` — it fails if an arbitrary
  `text-[8px]`/`[9px]`/`[10px]`/`[11px]` reappears, if any arbitrary size inside the
  11–20px range reappears, if a token is missing or mis-sized, if the floor drops
  below 11px, if the body step drops below 14px, if the title step comes within
  1px of the body step, if the tokens are declared but never consumed, **or if a
  live describer of this scale states a size the scale does not declare** (this
  document, the phase plan, the registry row and the `tailwind.config.js` comment
  block are all compared against the declared scale).

### Spacing / Radius / Elevation
- Spacing: default Tailwind scale is used intentionally (4/8/12/16/24/32).

#### §PHASE C4 — the canonical radius + elevation scale

Declared ONCE in `tailwind.config.js` (`theme.extend.borderRadius` — the FLAT `'ds-sm'…'ds-pill'`
keys, and `theme.extend.boxShadow`), which `npm run validate:radius-elevation` reads as the OWNER.
**§OPENSHIP BATCH 5 (2026-10-15) — REPOINTED, and a real defect closed.** This line used to read
`theme.extend.borderRadius.ds`, i.e. the NESTED object `{ ds: { sm, md, lg, pill } }` — a shape
Tailwind 3.4 SILENTLY EMITS NO UTILITY FOR. The ramp was therefore declared, documented, consumed
by **714 class sites** (195 + 431 + 88) and rendered `border-radius: 0px` on every one of them,
from §PHASE C4 through BATCH 3 and BATCH 4. Nothing caught it because every check read THIS BLOCK
or the source, and none read the generated CSS. The keys are now flat (same class names, so no
call site moved), and the gate **COMPILES the config in memory and fails if `rounded-ds-sm|md|lg`
do not really emit their declared value** — a declared-but-inert scale can no longer pass. The
scale exists because
the design system declared four steps while the product rendered five UNNAMED ones —
**630 class sites had no place in the ramp** (`rounded-lg` 387 · `rounded-md` 97 ·
bare `rounded` 85 · `rounded-xl` 58 · `rounded-full` 76 · `rounded-2xl` 4 · `rounded-sm` 3)
while the named steps that existed were consumed almost nowhere — 41, 26 and 22 uses for
the control, container and inline steps respectively, across the whole product. Same defect
class as the type scale: a scale the product does not render is a scale every author
invents their own version of.

> **§OPENSHIP BATCH 3 (2026-10-14) — THE SIZES MOVED ONTO THE REFERENCE'S RADII.**
> The three named steps now carry OpenShip's measured geometry
> (`docs/OPENSHIP_REFERENCE_SPEC.md` §2.2 — container 16px · control 12px · small
> control 8px), because the four non-Bold themes are built on that design. This was
> a deliberate **+4px on every control and container** (the reference's own "radius
> +4px" rows in its §12 table) — the opposite of the §PHASE C4 repoint below, which
> moved the NAMES onto geometry the app already drew. `ds-pill` did not move.

| Token | Size | Role |
|---|---|---|
| `rounded-ds-sm` | **8px** | small controls — in-row chips, tags, `kbd`/`<code>`, thumbnails, micro icon buttons |
| `rounded-ds-md` | 12px | controls — buttons, inputs, selects, textareas, tabs, nav items |
| `rounded-ds-lg` | 16px | containers — cards, panels, modals, popovers, dropdowns, tables |
| `rounded-ds-pill` | 9999px | pills · avatars · dots · status badges |
| `rounded-2xl` | 16px | the SAME value as the container step; it remains gated to `src/components/marketing/` as a display-only alias |

- `rounded-full` is Tailwind's own step and the **same value** as `rounded-ds-pill`, so it
  is an accepted alias for the pill role — a documented alias, not a second scale.
- 4px (bare `rounded`) is folded into the small step: a 2px difference between two small
  steps is not a step, it is noise — and it was being used inconsistently on chips and
  `<code>`.
- §REPOINTED (historical, kept for the record): under §PHASE C4 the control step was 8px
  and the container step was 12px, i.e. **the geometry the app already rendered** — which
  is what made THAT migration a RENAME rather than a redesign (binding `rounded-lg` →
  `ds-md` and `rounded-xl` → `ds-lg` moved no pixels for 542 sites, and 41 + 26
  occurrences moved by 2px in 20 shell/shared files). §OPENSHIP BATCH 3 then moved both
  steps onto the reference's values; the gate still refuses a silent move of either one.
- The gate fails on an unnamed radius reappearing (including **per-side** forms such as
  `rounded-t-lg` and arbitrary `rounded-[…]`), on `rounded-2xl` escaping the marketing
  folder, and on a `border-radius` literal in CSS that the ramp does not declare.
- §OPENSHIP BATCH 5 — it also **compiles the config** and asserts the three used steps really
  emit their declared value: a scale that is declared but never generated is the defect that
  shipped for weeks (see the note above), so "an empty compile" is a FAILURE, not a pass.
- Migration is mechanical and idempotent: `npm run migrate:radius-elevation`
  (re-running is a no-op).

| Elevation role | Token (theme-driven) | Used for |
|---|---|---|
| none | `shadow-ds-none` | a control that must sit flat (the link-variant button) |
| resting | `shadow-ds-subtle` | cards, panels, active segmented pills |
| raised | `shadow-ds-raised` | primary controls, hover lifts |
| overlay | `shadow-ds-overlay` | modals, popovers, dropdowns, floating cards |

> **§OPENSHIP BATCH 3 (2026-10-14) — THE `resting` ROLE IS NOW LITERALLY `none` IN FOUR THEMES.**
> The reference's cards carry **no shadow in any of its designs** (`--th-card-shadow: none`), so
> `minimal-light`, `professional`, `fun` and `serious` now declare `--mr-shadow-subtle: none` and a
> card is defined by its border and its fill instead of a lift. The role itself is unchanged, and
> `bold` keeps the soft shadow it always had. The reference also makes cards **borderless**; that
> half is the component change scheduled for BATCH 4 (`docs/OPENSHIP_REFERENCE_SPEC.md` §13).

- Every role reads `--mr-shadow-subtle` / `--mr-shadow-raised` / `--mr-shadow-overlay` from
  `src/config/themes.ts`, so all five themes carry their own lighting — and the gate fails
  if a theme is missing one. 19 unnamed shadows used to sit beside these roles (15 of them
  `shadow-2xl` on exactly the surfaces OVERLAY exists for); they are all migrated onto the
  role that matches what they are.
- **Focus is the `:focus-visible` OUTLINE** in `src/index.css` (brass, 2px, offset 2px) —
  the mechanism every interactive element receives, and an outline follows the element's
  OWN radius. Two rules used to override geometry on focus (`:focus-visible` forcing
  `border-radius: 4px`, and `[data-record-focused]` forcing `6px`), snapping a focused
  control's corners to a radius the ramp does not declare; both overrides are removed.
- **§REPOINTED — the focus-shadow tokens were REMOVED: `shadow-ds-focus` and `shadow-ds-focus-danger` were declared in `tailwind.config.js` and consumed NOWHERE, while this document used to claim "focus rings `shadow-ds-focus`" — a live claim that was false. A declared-but-unconsumed token is the defect this whole scale exists to end, so the tokens went and the claim is corrected here. The gate carries an absence guard: a focus-shadow token declared without a consumer fails it.**

### Motion
- `transition-ds` property set; restrained durations (150–200ms).
- `prefers-reduced-motion` globally disables transitions/animations.

## Focus (accessibility foundation)
- Global `:focus-visible` outline (brass) in `src/index.css`.
- Native controls get `outline:none` for mouse, visible `focus-visible` ring for keyboard.

## Canonical components (`src/components/ui.tsx`)
| Component | Variants | Notes |
|---|---|---|
| `Button` | primary / secondary / tertiary / ghost / danger(legacy) / destructive / link; sizes sm/md/lg; `loading` + `disabled` | min touch height 36px; `data-state`; `aria-busy` |
| `Input` / `Select` / `Textarea` | label, helper, error, required, id | `aria-invalid`, `aria-describedby` |
| `Checkbox` | label, checked | custom svg check |
| `StatusBadge` | success / warning / danger / info / neutral / brass | dot + text; `role="status"`, `data-status` |
| `Alert` | success / warning / error / info | `role="alert"` |
| `Tabs` | REST list | `role="tablist"`, `aria-selected`, `data-state` |
| `Breadcrumb` | items | `aria-current` on last |
| `Modal` | open / onClose / title / footer | labelled, backdrop + ESC |
| `Pagination` | page / pageCount | prev/next |
| `EmptyState` | title / description / action | |
| `Skeleton` | className | shimmer |
| `PageHeader` / `EntityHeader` | title, description, actions, status | |
| `DataTable` | columns / rows / loading / empty / error | semantic `<table>`, sr-only caption, loading skeleton, empty & error states |

## Semantics / AX
- `data-status` on statuses/buttons where meaningful.
- Stable test ids where justified (e.g. `tab-overview`, `pagination-page`).
- Native `role`/`aria` in each primitive.

## Migration guidance (later phases)
- Legacy `Button` variants used directly in screens — map `danger` → `destructive` progressively.
- Replace ad-hoc `bg-{c}-500/15` status badges with `StatusBadge`.
- Replace raw `<table>` with `DataTable` where tables are rebuilt.
- Extend tokens before adding one-off colours.

## Showcase
- `src/components/design/DesignSystemShowcase.tsx` mounts under Super Admin → **Design System**.
- Playwright: `e2e/design-system.spec.ts`.

## Shell & Navigation (§Phase 6)

The application shell (`src/components/layout/AppShell.tsx` + role shells) is the
canonical way to mount navigation around an environment. Conventions:

### Grouped navigation
- Nav is defined as **sections** of items: `{ label, items: [{ id, label, icon }] }`
  (`NavSection` in `Sidebar.tsx`). Item `id` values are the SAME view ids the
  shells already switched on — grouping is presentation only.
- §REPOINTED 2026-10-15 (BATCH 6 — the claim it replaces was false): the section
  heading is a static `<p>` (never itself interactive), but since §UI/UX Wave 2 a
  SIBLING collapse control (`data-testid="nav-collapse-<section>"`) carries
  `aria-expanded` and the sections ARE collapsible. A user's collapsed set is a
  stored preference, and a live navigation filter forces every matching section
  open so a search result can never be hidden inside a collapsed group.
- A single unlabelled section (`label: ''`) renders **no heading** (used by the
  three-item Carrier nav).

### Active-state semantics
- §REPOINTED 2026-10-15 (BATCH 6 — the claim it replaces was false): the active
  item is `aria-current="page"` and `data-state="active"`, with the
  **feature-identity accent** — the section's own palette colour
  (`DOMAIN_COLOURS` in `src/config/themes.ts`, resolved through `sectionDomain`)
  as a tinted row fill, an accent-coloured icon and a 3px accent rail at the row's
  trailing edge. It is never colour-only: the ARIA state is the authority and the
  accent is decoration on top of it. (`bg-white/[0.08]` and a brass icon were the
  pre-Wave-2 treatment.)
- Inactive items are `data-state="idle"` and take their hover from the theme's
  floating-surface tint (`bg-tint`).
- The primary nav is a single `<nav aria-label="Primary">` landmark; the header
  breadcrumb uses a separate `<nav aria-label="Breadcrumb">` (canonical
  `Breadcrumb` component, `aria-current` on the last item).

### Chrome surfaces (BATCH 5 + BATCH 6, 2026-10-15)
- The rail is a **floating card** (`.ds-rail`): `my-3 ms-3`, the 16px container
  radius, its own derived edge (50% of the theme's border token) and 260px /
  72px widths.
- The **top bar** is a `h-14` band that paints **no fill of its own** — it sits on
  the page — separated only by its derived bottom edge (`.ds-bar`, 40% of the
  theme's border token). Both are DERIVED from the reference's own evidence (the
  rail's `border-border/50`, the mobile header's `border-b border-border/40`);
  neither is a copy of a reference component, because OpenShip has no desktop top
  bar (`docs/OPENSHIP_REFERENCE_SPEC.md` §3.1).

### Breadcrumb usage
- `AppShell` derives the trail from the active section + the shell's existing
  `breadcrumb` string: `Section › Current-label`. When one contains the other
  (e.g. "Admin Overview" ⊇ "Overview") the more specific label wins, so the
  trail never reads redundantly. Overview surfaces collapse to a single crumb.

### Mobile drawer
- Below `lg` (1024px) the SAME `<aside>` becomes a fixed off-canvas drawer
  (`-translate-x-full` ↔ `translate-x-0`, `transition-ds`); at `lg`+ it is
  `lg:static`. There is **one** nav DOM tree — never duplicated markup.
- Header toggle (`data-testid="app-menu-toggle"`, `lg:hidden`) exposes
  `aria-expanded` + `aria-controls="app-sidebar"`.
- While open: a `z-40` backdrop closes on click; `Escape` closes and returns
  focus to the toggle; selecting a nav item closes the drawer (focus unchanged).

### Page container + context rail (BATCH 7, 2026-10-15)
- Every workspace surface composes `WorkspaceFrame`, which IS the page container:
  `max-w-[1600px] mx-auto px-4 py-6 sm:px-6 lg:px-8` — capped at 1600px, centred, with the
  reference's padding ladder and 24px vertical step (`docs/OPENSHIP_REFERENCE_SPEC.md` §4.1).
- The **app bar carries the same cap and ladder on its inner row**, so the first control in the
  bar shares one leading edge with the page title at every width. A change to one without the
  other is caught by `scripts/validate-shared-surfaces.mjs`, which compares the two class strings.
- A surface that genuinely needs a second column composes `WorkspaceGrid` with a **340px** rail
  and a **24px** gap (§4.3), and that rail is a `role="complementary"` region — never a second
  `<aside>`, because the navigation rail is the shell's single one.

### Accessibility conventions
- Skip link is the first tab stop → `#main-content` (`<main tabIndex={-1}>`).
- Global Phase 5 `:focus-visible` outline provides keyboard focus on all nav
  buttons (visible, brass, never colour-only).
- Profile menu: `aria-haspopup="menu"`, `aria-expanded`, `aria-controls` on the
  trigger; `role="menu"` / `role="menuitem"` on the panel and entries.

### RBAC in the shell
- Navigation hides super-only views for non-super admin
  (`super_admin`, `audit_log`, `integrations`) directly in the shell's section
  filter. Render-side guards in the shells are unchanged and still enforce
  actual authorization (defense in depth). No third RBAC system was added.
## Dashboard primitives (§Phase 7C)

Reusable dashboard compositions living in `src/components/shared/dashboard.tsx`.
They are **pure presentation** — callers pass fully-resolved, already-scoped
data (no fetching, no tenant logic inside). Used by the Admin Operations
Overview and the Brand dashboard. All cells/rows build on the canonical kit
(`StatusBadge`, `Button`, `Skeleton`).

| Component | Purpose | Conventions |
|---|---|---|
| `DashboardSection` | Self-labelled section: `h3` heading + optional description/action + body | `aria-label`; keeps heading hierarchy h1 → h3 without card chrome |
| `KpiGroup` | Compact KPI band (cells: value, label, optional context + semantic status) | ONE bordered surface with hairline dividers (`gap-px bg-white/[0.06]`) — never a wall of elevated cards; drill-down cells render as accessible `<button>` with `aria-label` + `min-h-[36px]`; `loading` variant shows `Skeleton` cells |
| `AttentionPanel` | Scannable exceptions list | Severity-group headings (`<li>` group rows); each item = semantic `StatusBadge` (never colour-only, `data-status`) + title + meta + optional `Review` `Button`; empty list renders an "All clear" success row instead of a blank panel |

Guidance:
- KPI values use `font-mono` (numeric/data) with the label in muted `text-[11px]`.
- Do not add icons to every cell; keep the band dense and scannable.
- Dashboard sections are `<section aria-label>` elements — do not wrap every
  section in an elevated `Card`.
- New dashboards (Admin/Brand/Carrier overviews) should compose these
  primitives instead of inventing per-screen stat-card layouts.