# UI/UX REDESIGN — WAVE 2 (IMPLEMENTATION) — 2026-09-18

> Branch `redesign/foundation`, HEAD `ea700a1` (protected baseline `959b4d2` still an
> ancestor). **No git mutation of any kind was performed in this session** (no commit,
> stage, stash, reset, checkout, clean, amend). The working tree remains intentionally
> dirty.
>
> This is the **implementation** wave that the previous session's Wave 1 explicitly
> stopped short of. Wave 1 was a token/theme foundation; **Wave 2 is a genuine UI/UX
> architecture change**: information architecture, workspace composition, interaction
> model, navigation model, record/queue model, density, charts, motion and the public
> homepage. It is explicitly **not** a theme refresh.

## 1. What was built (by phase)

### Phase A — Foundation

| Area | What exists now |
|---|---|
| Saturated palette | `src/config/themes.ts` declares **eight `--mr-palette-*` hues + `--mr-on-palette` in all six themes**, with the canonical hue → domain mapping (`DOMAIN_COLOURS`, `SECTION_PALETTE`): indigo=orders · cyan=intelligence · green=finance · amber=compliance · orange=logistics · pink=communications · violet=catalogue · red=risk. Validation enforces **HSL saturation ≥ 55%** in every theme. |
| Brass discipline | Brass (`--mr-accent*`) is now an identity accent only. Homepage primary CTAs and the active-nav treatment use the saturated palette. |
| Motion language | `--mr-motion-{fast,base,slow}`, `--mr-ease-{standard,emphasized}` + keyframes in `src/index.css`: `mr-rise`, `mr-slide-in-right`, `mr-draw` (line draw-in), `mr-arc`, `mr-value-pop`, `mr-pipeline-grow`, `mr-work-pulse` — all disabled under `prefers-reduced-motion`. |
| Density scale | `--mr-density-{row,gap,pad}` + Tailwind `h-row-compact`, `gap-density-gap`, `p-density-pad`. |
| Workspace primitives | NEW `src/components/shared/workspace.tsx`: `WorkspaceFrame`, `WorkspaceHeader`, `WorkspaceGrid`, `WorkspaceSection`, `MetricBand`, `MetricTile`, `PipelineTrack`, `Queue`, `ContextPanel`, `ActivityFeed`, `RecordDrawer`, `RecordFieldList`, `SegmentedControl`, `DomainChip`, `SeverityMarker`. |
| Charts | `MercentaCharts.tsx` extended with **animated** line draw-in (`pathLength`-normalised), doughnut arc + hover thickening, a hover/focus guide and SVG tooltip, plus new `MercentaSparkline` and `MercentaBars`. Strokes stay 1–1.5px, rings 11–12px. |

### Phase B — Application shell

| Area | What exists now |
|---|---|
| Navigation rail | Section identity uses the saturated palette (one source: `sectionDomain`); per-item **attention counts**, **pinning** (pins sort to the top of their own section — a destination is never duplicated), **collapsible sections**, and an **opt-in compact rail**. |
| Utility header | Real **search trigger** (`data-testid="app-search-trigger"`) showing ⌘K, alongside notifications, theme selector and the avatar menu. |
| Findability | NEW `src/components/shared/CommandPalette.tsx` — ⌘K/Ctrl-K toggles, Escape closes, ↑/↓ + Enter, `aria-activedescendant`, honest empty state. Destinations come from the shell's **own RBAC-filtered `navSections`**; records are supplied by the shell and already tenant-scoped there. |
| Attention counts | NEW `src/lib/nav/navBadges.ts` — counts derived from the canonical `poStatusPresentation` / `complianceDocStatusPresentation` (`actionable`). Brand counts are narrowed by `assertBrandScope` + the session's own `tenantId`. |

### Phase C — Operations Overview (gold standard)

`src/components/admin/AdminDashboard.tsx` rebuilt as a workspace:
entity/context bar → page header (purpose, status, meta, primary action) → **sticky
toolbar** (row density + grouping) → metric band → **order pipeline** (solid saturated
stage headers) → **needs-attention queue** → next actions → **real charts** (order value
by month from PO `orderDate`; value by brand) → fulfilment queue → communications, with a
**context rail** holding compliance posture (doughnut) and an activity feed.

Every figure is still derived from the existing canonical stores. Every test contract was
preserved (`dashboard-loaded|loading|error`, `kpi-value-*`, `kpi-open-*`, `attention-*`,
`action-*`, the five section titles).

### Phase D — Core work surfaces (partial, honest)

- Operations Overview (above) is fully migrated.
- The brand KPI band (`src/components/shared/dashboard.tsx`) gained the domain accent +
  animated metric value (used by the brand dashboard).
- **Chart consolidation**: the three recharts surfaces (`BrandReports`, `SalesAnalytics`,
  `FulfillmentTrack`) now consume ONE canonical token hook
  (`src/components/shared/charts/rechartsTokens.ts`) instead of local hex literals and a
  2.5px stroke. No chart data or business logic changed.
- **REMAINING (not started)**: the other page-by-page surfaces still use their previous
  composition — tracked as `uiux-wave2-core-surfaces-remaining`.

### Phase E — Homepage (complete redesign)

`src/config/homepageContent.ts` + `src/components/marketing/Home.tsx`:

- Copy completely reassessed: operating model, connected capability grid, the
  brand → products → commercial operations → orders → fulfilment → logistics → finance →
  compliance → visibility → growth chain, visibility & control, and proactive brand
  success protection.
- **TAM/SAM market-size section REMOVED** from the public homepage. `TamSamDisplay` is
  retained for the internal fundraising surfaces (the component was not deleted).
- **The top-right shipment-tracker animation is PRESERVED verbatim** — `animate-route-dot`
  (6s loop) and `animate-tracker-ping` (2s loop), the same markup and content model; only
  its colours moved into the saturated palette (`--mr-palette-cyan` route dot,
  `--mr-palette-green` live indicator).
- Customer-facing wording is channel-neutral and claim-free (no Amazon framing, no
  partnership/endorsement implication, no guaranteed POs or sales). The Homepage Editor's
  blocking lint now also covers the new `visibility` / `protection` sections.

## 2. Regression found and fixed in-session

The product-tour coach-mark could **cover real UI** (nav items, Settings tabs) and swallow
clicks — 5 existing tests failed as a result (nav-click timeouts, a Settings-tab timeout,
and a homepage assertion that had pinned old hero copy).

- `src/components/shared/TourEngine.tsx`: the card now docks to the viewport bottom below
  `lg`, is clamped to clear the static rail at `lg+`, and is **non-blocking**
  (`pointer-events: none`, with its own buttons re-enabled) so a coach-mark can never
  swallow an interaction with the product it describes.
- `e2e/homepage-editor.spec.ts`: the hero-eyebrow assertion was **repointed to the
  canonical content model** (`DEFAULT_HOMEPAGE_CONTENT.hero.eyebrow`) instead of a
  hardcoded literal, so a legitimate copy change can never read as a product regression.
- `scripts/validate-homepage-editor.mjs`: **REPOINTED** — the SSR harness supplied only
  `AppProvider`, but `Home` has consumed `useTheme()` since Wave 1, so the validator failed
  for a reason unrelated to its contract. It now renders through the same provider
  composition the real app uses (`QueryClientProvider → ThemeProvider → AppProvider`).
  No assertion was weakened; the validator went from FAIL to 8/8 PASS.

## 3. Not implemented (explicit)

- Page-by-page migration of the remaining operational surfaces (Phase D rest).
- `RecordDrawer` is BUILT and exported but not yet wired into any remaining surface — no
  page claims it yet.
- Live provider credentials, API activation, Rakazo, Monid/Jev, Cloudflare/Supabase
  migration, social functionality: untouched / parked, as instructed.

