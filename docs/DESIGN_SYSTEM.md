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
- Hierarchy: Display (3xl) → Page title (2xl) → Section (lg) → Body (sm) → Label/caption (xs). Avoid `text-[8px]`/`text-[10px]` micro-sizes.

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