# MERCENTA DESIGN SYSTEM

> Canonical visual system for the premium B2B distribution operations platform.
> Phase 5 establishes the FOUNDATION. Later phases (6–9) apply it screen-by-screen.
> This document is the practical reference for tokens and component APIs.

## Principles

- Premium wholesale-operations platform, NOT a generic dark SaaS template.
- Dark theme + brass/gold accent identity; serious B2B tone; IBM Plex Sans + Fraunces.
- Meaningful hierarchy, whitespace, purposeful density, operational clarity.
- Semantic states are machine + human readable — never colour-only.
- Restrained motion: motion communicates state/transition/feedback, not decoration.

## Tokens (source: `tailwind.config.js`)

### Colour
| Token | Value | Purpose |
|---|---|---|
| `ink-950` | `#000000` | application background |
| `ink-900/850` | `#0A0A0B` / `#121214` | base surfaces |
| `surface.raised` | `#161618` | elevated surface |
| `surface.overlay` | `#1C1C1E` | overlay/elevated |
| `brass-500` | `#C9A15A` | brand accent (primary CTA) |
| `state.success` | `#2FBF71` | success |
| `state.warning` | `#F2A93B` | warning |
| `state.danger` | `#E5533F` | danger/error |
| `state.info` | `#6AA6FF` | information |
| `state.muted` | `#8A93A0` | muted text |

Legacy tokens retained for backward compatibility (`amber.accent`, `crimson.accent`, etc.).
The canonical kit SHOULD use `state.*` for semantics.

### Typography
- `font-display` (Fraunces) — display / entity titles.
- `font-sans` (IBM Plex Sans) — body, subtitle.
- `font-mono` (IBM Plex Mono) — numeric / KPI / ids.
- Hierarchy: Display (3xl) → Page title (2xl) → Section (lg) → Body (sm) → Label/caption (xs).

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
| `text-ds-body` | 13px | table cells, dense body copy |
| `text-ds-title` | 15px | section / card titles |
| `text-ds-page` | 20px | workspace page title (`h1`) |

Rules:
- **11px is the floor.** Nothing below it may be introduced in `src/`.
- `text-xs` (12px) and `text-sm` (14px) remain canonical for label/body and are
  unchanged — the scale names the sizes *below* them, which previously had no name.
- Migration is mechanical and idempotent:
  `npm run migrate:typography` (re-running is a no-op).
- The gate is `npm run validate:typography` — it fails if an arbitrary
  `text-[8px]`/`[9px]`/`[10px]`/`[11px]` reappears, if a token is missing, if the
  floor drops below 11px, or if the tokens are declared but never consumed.

### Spacing / Radius / Elevation
- Spacing: default Tailwind scale is used intentionally (4/8/12/16/24/32).
- Radius: `rounded-ds-sm` (6) / `rounded-ds-md` (10) / `rounded-ds-lg` (14) / `rounded-ds-pill`.
- Elevation: `shadow-ds-subtle` / `shadow-ds-raised` / `shadow-ds-overlay`; focus rings `shadow-ds-focus`.
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
- Section headings are static text (`<p>`), never interactive, never
  `aria-expanded` — no collapsible sections in this phase.
- A single unlabelled section (`label: ''`) renders **no heading** (used by the
  three-item Carrier nav).

### Active-state semantics
- The active item is `aria-current="page"`, `data-state="active"`, brass-accented
  icon + `bg-white/[0.08]` fill — never colour-only.
- Inactive items are `data-state="idle"`.
- The primary nav is a single `<nav aria-label="Primary">` landmark; the header
  breadcrumb uses a separate `<nav aria-label="Breadcrumb">` (canonical
  `Breadcrumb` component, `aria-current` on the last item).

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