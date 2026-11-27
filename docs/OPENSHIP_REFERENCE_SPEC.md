# OPENSHIP REFERENCE SPECIFICATION

> **Purpose.** The verified visual reference for the Mercenta UI transformation.
> Mercenta keeps its pages, navigation, workflows, data and permissions; **only the
> interface is rebuilt on OpenShip's design system.**
>
> **Evidence tiers — every claim carries one. An untagged claim is UNVERIFIED.**
>
> | Tier | Meaning |
> |---|---|
> | **SOURCE** | Read directly from `oblien/openship` source this session, path named. |
> | **SCREENSHOT** | Observed in the one supplied OpenShip screenshot (empty-state home, dark theme). |
> | **DERIVED** | A reasoned Mercenta decision based on verified OpenShip evidence. Not a copy. |
> | **UNVERIFIED** | Not adequately confirmed — recorded so it is never mistaken for fact. |

---

## 1. THE REFERENCE

### 1.1 The repository

| Fact | Value | Tier |
|---|---|---|
| Repository | `github.com/oblien/openship` | SOURCE |
| Description | "Self-hosted deployment platform" | SOURCE |
| Stars | 14,753 | SOURCE |
| Default branch | `main` | SOURCE |
| Archived | `false` (last push 2026-10-14) | SOURCE |
| Licence | Apache-2.0 — **code only, not the font** | SOURCE |

Docs consulted: `openship.io/docs/dashboard`, `.../dashboard/projects`,
`.../architecture/overview`.

### 1.2 The same-name trap — READ BEFORE ANY FUTURE SESSION

`github.com/openshiporg/openship` is a **DIFFERENT PRODUCT** — an e-commerce order router
under AGPL-3.0. It is **not** the reference. The deployment platform is
**`oblien/openship`**, and nothing else.

### 1.3 Architecture — what can and cannot be reused

| | OpenShip | Mercenta |
|---|---|---|
| Framework | Next.js App Router (server components) | React 18.3.1 + Vite 5.4.2 (SPA) |
| React | 19 | 18.3.1 |
| Styling | Tailwind **v4** — CSS-first `@theme` | Tailwind **3.4.1** — JS config |
| API | Hono control plane | Supabase Edge Functions (16) |
| Data | Drizzle ORM / Postgres | Supabase (34 tables, RLS) |
| Components | `packages/ui` monorepo package | `src/components/ui.tsx` |

**THE SINGLE MOST IMPORTANT ENGINEERING FACT OF THIS PROJECT:** OpenShip's components
**cannot be copied into Mercenta.** Tailwind v4's `@theme` directive does not exist in
v3.4, and OpenShip's server components have no Mercenta equivalent. The replication
therefore reproduces OpenShip's **design language — its measured values, treatments and
proportions — expressed inside Mercenta's own architecture.** It is a reproduction of a
visual system, not a file copy.

---

## 2. THE THEME SYSTEM

### 2.1 Structure — SOURCE

`components/theme-provider.tsx` sets `data-theme` on `<html>`:

```
data-theme="light" | "dim" | "dark"          (light is the default)
```

Two opacity scales generate almost every colour:

| Scale | Purpose | Steps |
|---|---|---|
| `--th-on-{N}` | Foreground at N% opacity — text, icons, borders | 04, 05, 06, 08, 10, 12, 14, 15, 16, 20, 25, 30, 40, 50, 60, 70, 80, 90, 95 |
| `--th-sf-{N}` | Surface fill at N% opacity — backgrounds | 01, 02, 03, 04, 05, 06, 08 |

Semantic aliases sit on top: `--th-text-*` (9 steps), `--th-bg-*`, `--th-bd-*`,
`--th-card-*`, `--th-dropdown-*`, `--th-input-*`, `--th-btn-*`, `--th-divider`,
`--th-overlay`, `--th-spinner-*`, and five status families
`--st-{success,danger,warning,info,neutral}-{fg,bg,bd,solid}`. A shadcn bridge maps
`--th-*` onto standard shadcn names and declares `--radius: 0.75rem`.

**Theme cycling is three-way**, not two: `light -> dim -> dark -> light`. The desktop app
defaults a dark OS preference to `dim`; the web product uses `dark`.

### 2.2 Two radii coexist — a correction to earlier project notes

`.th-card` hardcodes **`border-radius: 1rem` = 16px**. `--radius: 0.75rem` = **12px** is
the **shadcn bridge** value used by shadcn-derived controls.

An earlier note in this project recorded "card radius is `--radius` 12px, not 16px".
**That conflated two different things.** The card in the screenshot is **16px**.

```
containers (cards, panels, modals, dropdowns)    16px   rounded-2xl / 1rem
controls   (buttons, inputs, selects, nav rows)  12px   rounded-xl
small controls (in-row chips, small buttons)       8px   rounded-lg
```

### 2.3 The `dark` theme — SOURCE, complete

The theme in the supplied screenshot.

| Token | Value |
|---|---|
| `--th-bg-page` | `#000000` |
| `--th-bg-card` | `#0a0a0a` |
| `--th-card-bg` | `rgba(255,255,255,.05)` |
| `--th-card-on-page` | `#0d0d0d` |
| `--th-card-bg-solid` | `#060606` |
| `--th-card-bd` | `transparent` |
| `--th-card-bd-hover` | `rgba(255,255,255,.12)` |
| `--th-card-shadow` | `none` |
| `--th-bg-subtle` | `rgba(255,255,255,.025)` |
| `--th-bg-hover` | `rgba(255,255,255,.04)` |
| `--th-bg-inset` | `rgba(255,255,255,.015)` |
| `--th-bd-default` | `rgba(255,255,255,.08)` |
| `--th-bd-subtle` | `rgba(255,255,255,.05)` |
| `--th-bd-strong` | `rgba(255,255,255,.14)` |
| `--th-bd-card` | `rgba(255,255,255,.07)` |
| `--th-divider` | `rgba(255,255,255,.06)` |
| `--th-input-bg` | `rgba(255,255,255,.03)` |
| `--th-input-bd` | `rgba(255,255,255,.08)` |
| `--th-input-text` | `rgba(255,255,255,.80)` |
| `--th-input-placeholder` | `rgba(255,255,255,.22)` |
| `--th-input-bg-focus` | `rgba(255,255,255,.05)` |
| `--th-input-bd-focus` | `rgba(255,255,255,.18)` |
| `--th-btn-bg` | `#ffffff` |
| `--th-btn-text` | `#000000` |
| `--th-btn-bg-hover` | `rgba(255,255,255,.90)` |
| `--th-btn-ghost-bd` | `rgba(255,255,255,.10)` |
| `--th-btn-ghost-text` | `rgba(255,255,255,.48)` |
| `--th-btn-ghost-bd-hover` | `rgba(255,255,255,.18)` |
| `--th-btn-ghost-text-hover` | `rgba(255,255,255,.72)` |
| `--th-btn-ghost-bg-hover` | `rgba(255,255,255,.04)` |
| `--th-dropdown-bg` | `#161616` |
| `--th-dropdown-bd` | `rgba(255,255,255,.08)` |
| `--th-dropdown-shadow` | `0 20px 48px rgba(0,0,0,.5), 0 4px 12px rgba(0,0,0,.32)` |
| `--th-overlay` | `rgb(20 20 20 / 60%)` |
| `--th-spinner-track` | `rgba(255,255,255,.06)` |
| `--th-spinner-fill` | `#ffffff` |

**Text hierarchy (dark)** — all `rgba(255,255,255,N)`:

| Step | N |
|---|---|
| heading | `#ffffff` |
| title | `.95` |
| strong | `.85` |
| body | `.66` |
| secondary | `.58` |
| muted | `.50` |
| label | `.50` |
| hint | `.36` |
| ghost | `.22` |

**Status (dark):** success `#34d399` · danger `#f04848` · warning `#fbbf24` ·
info `#60a5fa` · neutral `rgba(255,255,255,.50)`. Backgrounds `rgba(X,500,.10)`,
borders `rgba(X,500,.20)`. Solids desaturated: `hsl(154 44% 47%)` · `hsl(0 74% 60%)` ·
`hsl(38 66% 52%)` · `hsl(214 58% 56%)` · `#8b8f98`.

**The `--th-overlay` inversion — do not miss this.** On a pure-black page a black scrim
composites to black and is invisible, so in `dark` the scrim **lightens**
(`rgb(20 20 20 / 60%)`). In `dim` and `light` it darkens. Reproducing `dark` correctly
depends on this inversion.

### 2.4 The `dim` theme — SOURCE, complete

A neutral dark sitting between light and pure black.

| Token | Value |
|---|---|
| `--th-bg-page` | `#141414` |
| `--th-bg-card` | `#1e1e1e` |
| `--th-card-bg` | `rgba(255,255,255,.03)` |
| `--th-card-on-page` | `#1b1b1b` |
| `--th-card-bg-solid` | `#1e1e1e` |
| `--th-card-bd` | `transparent` |
| `--th-card-bd-hover` | `rgba(255,255,255,.14)` |
| `--th-card-shadow` | `none` |
| `--th-bg-subtle` | `rgba(255,255,255,.03)` |
| `--th-bg-hover` | `rgba(255,255,255,.05)` |
| `--th-bg-inset` | `rgba(255,255,255,.02)` |
| `--th-bd-default` | `rgba(255,255,255,.08)` |
| `--th-bd-subtle` | `rgba(255,255,255,.06)` |
| `--th-bd-strong` | `rgba(255,255,255,.14)` |
| `--th-bd-card` | `rgba(255,255,255,.08)` |
| `--th-input-bg` | `rgba(255,255,255,.04)` |
| `--th-input-bd` | `rgba(255,255,255,.10)` |
| `--th-input-text` | `rgba(255,255,255,.85)` |
| `--th-input-placeholder` | `rgba(255,255,255,.38)` |
| `--th-input-bg-focus` | `rgba(255,255,255,.06)` |
| `--th-input-bd-focus` | `rgba(255,255,255,.22)` |
| `--th-btn-bg` | `#ffffff` |
| `--th-btn-text` | `#000000` |
| `--th-btn-bg-hover` | `rgba(255,255,255,.90)` |
| `--th-divider` | `rgba(255,255,255,.07)` |
| `--th-overlay` | `rgba(0,0,0,.55)` — **darkens here** |
| `--th-dropdown-bg` | `#282828` |
| `--th-dropdown-bd` | `rgba(255,255,255,.10)` |
| `--th-dropdown-shadow` | `0 20px 48px rgba(0,0,0,.45), 0 4px 12px rgba(0,0,0,.28)` |

**Text hierarchy (dim):** heading `#ffffff` · title `.95` · strong `.86` · body `.72` ·
secondary `.66` · muted `.58` · label `.58` · hint `.46` · ghost `.30`.

**Status (dim)** is warm and softened, and **success is tied to the lime CTA gradient**:
success fg `hsl(86 82% 74%)` · danger `hsl(4 82% 67%)` · warning `hsl(40 78% 63%)` ·
info `hsl(214 72% 72%)`. Solids: `hsl(85 68% 62%)` · `hsl(4 72% 57%)` ·
`hsl(38 68% 53%)` · `hsl(214 60% 57%)` · `rgba(255,255,255,.42)`.

### 2.5 The `light` theme — SOURCE, complete

| Token | Value |
|---|---|
| `--th-bg-page` | `#f9f9f9` |
| `--th-bg-card` | `#fafafa` |
| `--th-card-bg` | `#ffffff` |
| `--th-card-on-page` | `#ffffff` |
| `--th-card-bg-solid` | `#ffffff` |
| `--th-card-bd` | `transparent` |
| `--th-card-bd-hover` | `#e0e0e0` |
| `--th-card-shadow` | `none` |
| `--th-bg-subtle` | `rgba(0,0,0,.02)` |
| `--th-bg-hover` | `rgba(0,0,0,.025)` |
| `--th-bg-inset` | `rgba(0,0,0,.015)` |
| `--th-bd-default` | `#e8e8e8` |
| `--th-bd-subtle` | `#f0f0f0` |
| `--th-bd-strong` | `#d0d0d0` |
| `--th-bd-card` | `#f0f0f0` |
| `--th-input-bg` | `#ffffff` |
| `--th-input-bd` | `#e0e0e0` |
| `--th-input-text` | `rgba(0,0,0,.80)` |
| `--th-input-placeholder` | `rgba(0,0,0,.28)` |
| `--th-input-bd-focus` | `#b0b0b0` |
| `--th-btn-bg` | `rgba(0,0,0,.92)` |
| `--th-btn-text` | `#ffffff` |
| `--th-btn-bg-hover` | `rgba(0,0,0,.80)` |
| `--th-btn-ghost-bd` | `#e0e0e0` |
| `--th-btn-ghost-text` | `rgba(0,0,0,.52)` |
| `--th-divider` | `#f0f0f0` |
| `--th-overlay` | `rgba(0,0,0,.45)` |
| `--th-dropdown-bg` | `#ffffff` |
| `--th-dropdown-shadow` | `0 16px 40px rgba(0,0,0,.10), 0 4px 8px rgba(0,0,0,.06)` |
| `--th-spinner-fill` | `rgba(0,0,0,.92)` |

**Text hierarchy (light):** heading `rgba(0,0,0,1)` · title `.92` · strong `.82` ·
body `.66` · secondary `.58` · muted `.52` · label `.52` · hint `.46` · ghost `.22`.

**Status (light):** success `#059669` · danger `#dc2626` · warning `#d97706` ·
info `#2563eb` · neutral `#52525b`. Solids: `#10b981` · `#ef4444` · `#f59e0b` ·
`#3b82f6` · `#9ca3af`.

### 2.6 The per-theme accent gradient — SOURCE

The accent CTA (`th-btn-accent`) is a three-stop gradient **that differs per theme**.
This is the orange-to-pink button in the screenshot.

| Theme | `--th-btn-accent-from` -> `via` -> `to` |
|---|---|
| light | `violet-500` -> `--th-btn-bg` -> `blue-500` (all at 90%) |
| dim | `hsl(86 84% 74%)` -> `hsl(82 80% 64%)` -> `hsl(74 74% 54%)` — **lime** |
| dark | `amber-400` -> `orange-500` -> `rose-500` (90%) — **orange to pink** |

```css
.th-btn-accent {
  color: var(--th-btn-accent-text);
  background-image:
    radial-gradient(circle at 30% 50%, var(--th-btn-accent-highlight), transparent 70%),
    linear-gradient(to right in oklab,
      var(--th-btn-accent-from),
      var(--th-btn-accent-via),
      var(--th-btn-accent-to));
  box-shadow: 0 1px 3px 0 var(--th-btn-accent-shadow),
              0 1px 2px -1px var(--th-btn-accent-shadow);
}
.th-btn-accent:hover {
  box-shadow: 0 4px 6px -1px var(--th-btn-accent-shadow-hover),
              0 2px 4px -2px var(--th-btn-accent-shadow-hover);
}
```

**A flat single-colour accent button is NOT the reference.** The gradient, the radial
highlight and the themed shadow together are the treatment.

### 2.7 The utility classes — SOURCE

| Class | Definition |
|---|---|
| `.th-card` | `background: var(--th-card-bg)`; `border: 1px solid var(--th-card-bd)`; `border-radius: 1rem`; `box-shadow: var(--th-card-shadow)`; `transition: border-color .2s` |
| `.th-card:has(a:hover)` | `border-color: var(--th-card-bd-hover)` |
| `.th-page` | `background: var(--th-bg-page)`; `min-height: 100dvh` |
| `.th-bg-card` | `background: var(--th-bg-card)` |
| `.th-bg-subtle` | `background: var(--th-bg-subtle)` |
| `.th-nav-item` | `color: var(--th-text-muted)` |
| `.th-nav-item:hover` | `color: var(--th-text-title)`; `background: color-mix(in oklab, var(--th-text-title) 4%, transparent)` |
| `.th-nav-item[aria-current="page"]` | `color: var(--th-text-title)`; `background: color-mix(in oklab, var(--th-text-title) 7%, transparent)` |
| `.th-input` | `background: var(--th-input-bg)`; `border: 1px solid var(--th-input-bd)`; `color: var(--th-input-text)`; `outline: none` |
| `.th-input:focus` | `border-color: var(--th-input-bd-focus)`; `background: var(--th-input-bg-focus)` |
| `.th-btn` | `background: var(--th-btn-bg)`; `color: var(--th-btn-text)`; `:disabled { opacity: .42; cursor: not-allowed }` |
| `.th-btn-ghost` | `border: 1px solid var(--th-btn-ghost-bd)`; `color: var(--th-btn-ghost-text)`; `background: transparent` |
| `.th-dropdown` | `background: var(--th-dropdown-bg)`; `border: 1px solid var(--th-dropdown-bd)`; `box-shadow: var(--th-dropdown-shadow)` |
| `.th-text-*` | nine colour utilities, one per hierarchy step |

**The borderless-card rule is the heart of the look** (`app/globals.css`):

```css
.bg-card.border-border\/50,
.bg-card.border-border\/60 { border-color: transparent; }
```

The source comment records why: on dark the hairline computed *brighter* than the fill it
enclosed — "an outline around a hollow middle". Exceptions that keep a border:
`input.bg-card`, `select.bg-card`, `textarea.bg-card`, and directional borders
(`border-b/t/s/e`, `border-2`).

A card nested **inside** a card is recessed to `--th-sf-03` in every theme, because
otherwise the inner card is the same colour as the outer and vanishes once the border is
gone.

---

## 3. THE SHELL

### 3.1 There is no desktop top bar — SOURCE

`components/dashboard-shell.tsx` renders exactly three things:

1. a **mobile-only** header — `flex h-14 shrink-0 items-center justify-between border-b border-border/40 px-4 md:hidden`
2. the **Sidebar**
3. `<main className="relative min-h-0 min-w-0 flex-1 overflow-y-auto overscroll-y-contain">`

The wrapper is `relative flex min-h-0 flex-1 flex-col md:flex-row`.

The official docs confirm it in words (SOURCE): *"There's no top navbar to hunt through —
if you want to go somewhere, it's in the sidebar."*

**Consequence for Mercenta.** Because OpenShip has no desktop top bar, **the supplied
screenshot provides no evidence of what an OpenShip desktop top bar looks like.**
Restyling Mercenta's top bar is therefore **DERIVED** from OpenShip's verified surface and
typography language. It must never be described as a copy of an OpenShip component.

### 3.2 The sidebar is a floating card — SOURCE

`components/sidebar.tsx:307`:

```
my-3 ms-3                    -> 12px top margin, 12px start margin
rounded-2xl                  -> 16px radius
border border-border/50
bg-card
w-[72px] collapsed / w-[260px] expanded
transition-[width] duration-200
overflow-hidden
flex shrink-0 flex-col
```

It is **not** a full-height rail and has **no right border**. It floats inside the page
with a margin on two sides, and its rounded corners are visible.

### 3.3 Sidebar internals — SOURCE, complete

| Part | Classes | Effect |
|---|---|---|
| Header | `app-sidebar-header flex items-center px-5 py-6` (`flex-col gap-3 pb-3` when collapsed) | 20px / 24px |
| Logo | `size={26}` | 26px |
| Brand text | `text-base font-semibold tracking-tight text-foreground truncate` | 16px semibold |
| Theme toggle | `flex size-8 items-center justify-center rounded-xl text-muted-foreground hover:bg-foreground/[0.06] hover:text-foreground` | 32px, 12px radius |
| Collapse button | same classes; icons `sidebar-open` / `sidebar-close` | |
| Header divider | `mx-3 h-px bg-border/60` | |
| Nav scroll region | `h-full overflow-y-auto px-3 pt-3 pb-12` | 12px sides, 48px bottom |
| Section wrapper | `mt-5` for every section after the first | **20px** between groups |
| Section heading | `mb-2 px-2 text-[11px] font-semibold uppercase tracking-widest text-muted-foreground/60` | 11px uppercase, wide tracking |
| Item list | `space-y-1` | 4px |
| **Nav row** | `th-nav-item flex items-center rounded-xl px-3 py-2.5 text-[15px] font-medium transition-colors` + `gap-3` | **15px w500, 12px radius, 12/10px padding, 12px gap** |
| Nav icon | `size-5 shrink-0` | 20px |
| Count badge | `shrink-0 text-[13px] tabular-nums` | 13px |
| Scroll fade | `pointer-events-none absolute inset-x-0 bottom-0 h-14 bg-gradient-to-t from-[var(--th-card-on-page)] to-transparent` | 56px fade |
| CTA wrapper | `px-3 pb-2` | |
| **CTA button** | `th-btn-accent flex items-center justify-center gap-2.5 rounded-xl px-3 py-2.5 text-sm font-semibold transition-all overflow-hidden hover:brightness-110` | gradient, 12px radius |
| Account area | `px-3 pb-4 pt-1`; divider `mx-2 mb-3 h-px bg-border/60` | |
| Account row | `group flex w-full items-center rounded-xl px-2 py-2 text-start transition-colors hover:bg-foreground/[0.06]` + `gap-3` | |
| Avatar | `flex size-9 shrink-0 items-center justify-center rounded-xl bg-foreground/[0.08] text-sm font-semibold uppercase text-foreground` | **36px square, 12px radius** |
| Account name | `truncate text-[14px] font-semibold leading-tight text-foreground` | 14px |
| Account email | `truncate text-[12px] leading-tight text-muted-foreground` | 12px |
| Chevrons | `size-4 shrink-0 text-muted-foreground group-hover:text-foreground` | |
| Org popover | `absolute z-50 overflow-hidden rounded-2xl border border-border/50 bg-popover shadow-[var(--th-dropdown-shadow)]`; `w-72` collapsed, `start-0 end-0 bottom-full mb-2` expanded | |
| Popover header | `px-3 pt-3 pb-2`; heading `text-[11px] font-semibold uppercase tracking-widest text-muted-foreground/70` | |
| Popover list | `max-h-64 overflow-y-auto pb-1` | |
| Popover row | `flex w-full items-center gap-2.5 px-3 py-2 text-start hover:bg-foreground/[0.05]` | |
| Org avatar in row | `flex size-7 shrink-0 items-center justify-center rounded-lg bg-foreground/[0.08] text-[12px] font-semibold uppercase` | 28px, **8px** radius |
| "Current" marker | `rounded-md bg-foreground/[0.06] px-1.5 py-0.5 font-medium uppercase tracking-wide text-[10px] text-muted-foreground` | 10px pill |
| Log out | `mt-1 flex w-full items-center gap-2 rounded-xl px-2 py-2 text-[13px] font-medium text-muted-foreground hover:bg-foreground/[0.06] hover:text-foreground` | |

### 3.4 The navigation model — SOURCE

`lib/sidebar-nav.ts` composes four sections, conditionally:

| Section | Items | Condition |
|---|---|---|
| **MAIN** | home `/` · projects `/projects` · apps `/apps` · actions `/actions` · issues `/monitoring` | always |
| **SETTINGS** | backups `/backups` · settings `/settings` · billing `/billing` · audit `/audit` | billing only when `isSaaS` |
| **INFRASTRUCTURE** | servers `/servers` · jobs `/jobs` | only when `selfHosted` |
| **HELP** | support `/support` | only when `supportAvailable` |

Empty sections are filtered out. A second, unrelated model (`getMailNavSections`) drives
the separate "OpenShip Mail" product view — **out of scope, do not replicate.**

**Mercenta does not adopt this model.** Mercenta keeps its own 13 admin / 7 brand groups
and its 27 / 20 destinations. Only the **appearance** is borrowed.

### 3.5 The workspace switcher — SOURCE (docs) and SOURCE (code)

Docs: *"At the bottom sits the Account area... Click it to open a popover titled **Switch
organization**, pick another org, and the dashboard reloads scoped to it. The current org
is marked **Current** with your role beside it. That same popover holds your signed-in
identity and the **Log out** button."*

---

## 4. PAGE COMPOSITION

### 4.1 The page container — SOURCE

`components/ui/PageContainer.tsx`:

```
inner : max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8 py-6
outer : min-h-screen bg-background
```

| Property | Value |
|---|---|
| Maximum content width | **1600px** |
| Horizontal padding | **16px** small · **24px** medium · **32px** large |
| Vertical padding | **24px** |

### 4.2 Page headers — SOURCE

| Header | Classes | Size |
|---|---|---|
| **Home** (`DashboardHomeClient`) | `mb-6`; `<h1 className="text-2xl font-medium text-foreground/80" style={{letterSpacing:"-0.2px"}}>`; subtitle `text-sm text-muted-foreground/70 mt-1` | **24px, weight 500, 80% opacity, -0.2px tracking** |
| **Other pages** (`page-header.tsx`) | `mb-8`; `text-xl font-semibold tracking-tight text-foreground`; description `mt-1.5 text-sm text-muted-foreground` | **20px semibold** |

### 4.3 The sticky right column — SOURCE (docs)

The docs describe it as deliberate, on two screens:

- **Home:** *"The right-hand column is sticky (it follows you as the left side scrolls)."*
- **Project detail:** *"...a sticky right column with the project card and tab navigation."*

Implementation (`overview/HomeSidebar.tsx`): `<aside className="min-w-0">` wrapping
`<div className="relative lg:sticky lg:top-6">` and `<div className="space-y-4">`. A
trailing "Quick Tip" renders **only if it fits the viewport**, measured with a
`ResizeObserver`; otherwise it is `invisible absolute` and `inert`. This is real behaviour,
not decoration.

Grid: `grid grid-cols-1 lg:grid-cols-[1fr_340px] gap-6`. The rail is **340px**, the gap
**24px**.

**It is a per-screen pattern, not a global shell.** Mercenta adopts it only where a surface
already has a two-column composition — never forced onto a screen that does not.

---

## 5. THE HOME PAGE

### 5.1 The header — SOURCE + SCREENSHOT

`DashboardHomeClient.tsx`:

```
<div className="mb-6">
  <h1 className="text-2xl font-medium text-foreground/80" style={{ letterSpacing: "-0.2px" }}>
    {greeting}, {firstName}
  </h1>
  <p className="text-sm text-muted-foreground/70 mt-1">{subtitle}</p>
</div>
```

Greeting is time-of-day based (`< 12` morning, `< 18` afternoon, else evening) with the
user's **first name only**. Subtitle: *"Here's what's happening across your projects."*
Both confirmed in the screenshot.

### 5.2 The grid — SOURCE

```
grid grid-cols-1 lg:grid-cols-[1fr_340px] gap-6
```

### 5.3 The "Your Projects" panel — SOURCE + SCREENSHOT

Header row: a 40px icon tile, a `text-[15px] font-semibold text-foreground` title, a
`text-xs text-muted-foreground` count, and a "View all" link at
`text-sm font-medium text-muted-foreground hover:text-foreground` with a `size-3.5`
arrow icon.

Three states:

| State | Treatment |
|---|---|
| **Loading** | `divide-y divide-border/50`; 4 skeleton rows at `px-5 py-4` with a `w-10 h-10 bg-muted rounded-xl` tile |
| **Empty** | `<HomeWelcome />` — the illustration + "Launch your first project" + two buttons |
| **Populated** | `divide-y divide-border/50`; up to **5** `ProjectCard` rows (`.slice(0, 5)`) |

### 5.4 The empty state (the supplied screenshot) — SOURCE + SCREENSHOT

`HomeWelcome.tsx` renders inside the projects panel:

- An SVG graph, `h-36 w-72 max-w-full`: a centre node wired to four labelled tiles —
  **Repo · Domain · Deploy · Data** — joined by `strokeDasharray="4 4"` dashed paths at
  `var(--th-on-20)`, packets at `var(--th-on-40)`, node tiles `fill: var(--th-card-bg)` with
  `stroke: var(--th-bd-default)` `strokeWidth: 1.5`, labels `fontSize: 7` at
  `var(--th-on-30)`.
  **SOURCE comment worth preserving:** *"only steps that EXIST in styles/theme.css. The
  `--th-on-*` scale is 05/08/10/12/16/20/30/40/50+ — an in-between step like `--th-on-35`
  resolves to nothing, the stroke never paints, and the tile renders EMPTY."*
- Title "Launch your first project" at `text-2xl font-medium text-foreground/80` with
  `letterSpacing: -0.2px`
- Description `text-sm text-muted-foreground/70 max-w-sm mx-auto`
- Two buttons: **Create project** (primary, `px-6 py-3 rounded-xl`, plus icon) and
  **Import from GitHub** (secondary, `bg-muted/50`, git-branch icon)
- `⌘K` hint: `text-xs text-muted-foreground/60` + `<kbd className="px-1.5 py-0.5 bg-muted rounded text-[10px] font-mono">⌘ K</kbd>`

### 5.5 The shortcut tiles — SOURCE + SCREENSHOT

Exactly **four** (`grid grid-cols-2 sm:grid-cols-4 gap-3`), each:
`bg-card border border-border/50 rounded-xl p-4 hover:bg-muted/40 hover:border-border transition-all group`
with a `w-9 h-9 rounded-lg bg-muted` icon tile (icon `size-[18px]`,
`group-hover:scale-105 transition-transform`), a `text-sm font-medium text-foreground`
title and a `text-xs text-muted-foreground mt-0.5` description.

| Title | Description | Destination |
|---|---|---|
| Import Git | From repository | `/library` |
| MCP Deploy | Connect an AI agent | `/settings?tab=mcp` |
| Settings | Account & team | `/settings` |
| Docs | Learn more | external |

All four are confirmed in the screenshot.

### 5.6 The right column — SOURCE (docs)

Sticky, `space-y-4`. Cards:

- **Cloud plan card** (`CloudHomePlanCard`) — only on a hosted cloud instance.
- **Apps** (`HomeAppsCard`): `<section className="rounded-2xl bg-card p-5">` — **borderless**;
  heading `text-sm font-semibold text-foreground` with a count; a ghost `size-7 rounded-lg`
  add button; empty state = illustration + `text-sm font-medium` title + `text-xs` body; a
  secondary `size="sm"` full-width button at the bottom.
- **Quick Tip** (`HomeTipCard`):
  `bg-gradient-to-br from-primary/5 via-primary/3 to-transparent rounded-2xl border border-primary/10 p-5`;
  heading row `bolt` icon + `text-sm font-semibold`; body `text-sm text-muted-foreground leading-relaxed`;
  action `text-sm font-medium text-primary hover:text-primary/80` with a `size-3.5` arrow.
  Its content is **contextual**: connect GitHub → else create the first project → else a
  rotating product tip.
- **Activity scoreboard** — total **Projects**, total **Deployments**, build **Success rate**
  (green healthy / amber or red when it needs attention).
- **Recent** — latest projects, each with a coloured status dot, its status label, and
  time-ago.
- **"All systems operational"** (`SystemStatusRow`) — reads the same issues feed; tone is
  `text-success` when clear, `text-danger` for an outage, `text-warning` otherwise;
  advisories deliberately do **not** count; the row is a link only when there is something
  to look at.

---

## 6. THE PROJECTS SCREEN — SOURCE (docs)

### 6.1 The list

*"a single scannable list of every project in your workspace — **one row per project**."*
Each row, left to right:

app icon (favicon or framework logo) · name + live version badge · **primary domain** ·
detected framework · where it is hosted (Cloud / a named Server / Local) · source
(GitHub repo or local folder) · build shape (Services / Static / Standalone) ·
**changed-ago** · **status pill** (Live, Building, Failed, Draft…).

Clicking anywhere on a row opens the project.

### 6.2 Controls

| Control | Behaviour |
|---|---|
| **Create Project** | top-right; goes to the Library |
| **Search** | appears **only once there are more than three projects**; filters by name, slug and framework as you type |
| **Filter by target** | a card in the right column; groups by All projects / Cloud / each connected server (by name) / Local, each with a count |

### 6.3 The detail screen

*"The layout is the same on every tab: a **breadcrumb** (Dashboard / project name / tab)
and the tab title at the top, the tab's content in the main column, and a **sticky right
column** with the project card and tab navigation."*

The right-column project card shows current status, the Production URL with a link out, and
the Last Deploy time. The **environment switcher** is a page-level pill showing the current
environment and its git branch, with a `+` button beside it. The three-dot menu beside it is
a help menu (Support, Report Issue, Feedback, Documentation, Community).

**DERIVED note:** Mercenta borrows the *visual* treatment of these patterns (status pill,
breadcrumb, sticky column, search threshold) — not the screens, the routes or the content.

---

## 7. CONTROLS

### 7.1 Button — SOURCE (`components/ui/button.tsx`)

Base:
`inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-xl text-sm font-medium cursor-pointer transition-all duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/40 focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0`

| Variant | Classes |
|---|---|
| `default` | `bg-primary text-primary-foreground hover:bg-primary/80` |
| `destructive` | `bg-destructive text-destructive-foreground hover:bg-destructive/90` |
| `outline` | `bg-background text-foreground/60 hover:bg-accent hover:text-accent-foreground` |
| `secondary` | `bg-secondary text-secondary-foreground hover:bg-secondary/80` |
| `ghost` | `text-foreground/60 hover:bg-accent hover:text-accent-foreground` |
| `link` | `text-foreground underline-offset-4 hover:underline` |

| Size | Classes | Height |
|---|---|---|
| `default` | `h-10 px-4 py-2` | **40px** |
| `sm` | `h-8 rounded-lg px-3 text-xs` | 32px, **8px radius** |
| `lg` | `h-12 rounded-xl px-8 text-[15px]` | 48px |
| `icon` | `h-9 w-9 rounded-xl` | 36px square |

**Control radius is 12px** (`rounded-xl`); the small size drops to **8px** (`rounded-lg`).

### 7.2 Card — SOURCE (`components/ui/card.tsx`)

```
Card          rounded-2xl border border-border bg-card text-card-foreground shadow-sm
CardHeader    flex flex-col space-y-1.5 p-6
CardTitle     font-semibold leading-none tracking-tight
CardDescription  text-sm text-muted-foreground
CardContent   p-6 pt-0
CardFooter    flex items-center p-6 pt-0
```

**Container radius is 16px** (`rounded-2xl`); card padding is **24px**.

### 7.3 Input — SOURCE (`components/ui/input.tsx`)

```
flex h-11 w-full rounded-xl px-3.5 py-2 text-sm text-foreground transition-all duration-150
placeholder:text-muted-foreground
focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/40
focus-visible:ring-offset-2 focus-visible:ring-offset-background
disabled:cursor-not-allowed disabled:opacity-50

variant default : border border-input bg-background focus-visible:border-ring
variant filled  : border-0 bg-background
```

**Height 44px (`h-11`), radius 12px, padding 14px / 8px.**

### 7.4 Label · Select · Textarea — SOURCE

- **Label**: `text-sm font-medium leading-none text-foreground peer-disabled:cursor-not-allowed peer-disabled:opacity-70` — **14px**.
- **Select**: `w-full px-3 py-2 bg-background border border-border rounded-md text-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:border-transparent` — **8px radius** here, unlike Input.
- **Textarea**: the input family; `filled` adds `h-auto min-h-11 resize-y`; the default is `w-full px-3 py-2 bg-background border border-border rounded-md ... resize-none`.

### 7.5 Modal — SOURCE (`components/ui/Modal.tsx`)

React portal. Defaults: `maxWidth 80vw`, `maxHeight 90vh`, `zIndex 10000`, `overflow auto`,
`surface default`.

**Backdrop** — the theme's own scrim token, which is already tuned per theme
(light 45% black, dark 60%, dim 55%):

```jsx
<div className="absolute inset-0 backdrop-blur-lg dark:backdrop-blur-xl dim:backdrop-blur-xl transition-opacity duration-300"
     style={{ background: "var(--th-overlay)", opacity: isVisible ? 1 : 0 }} />
```

The source comment records the defect this fixed: it used to be `bg-background/70` — *"70%
WHITE in light mode — a white veil over a white page, so nothing dimmed and a white panel
had nothing to separate from."*

**Panel**:

```jsx
className="relative w-full rounded-2xl shadow-2xl flex flex-col transition-all duration-300 !overflow-x-hidden backdrop-blur-2xl"
style={{ background: `color-mix(in oklab, var(--th-card-bg-solid) 96%, transparent)`,
         opacity: isVisible ? 1 : 0,
         transform: isVisible ? "scale(1) translateY(0)" : "scale(0.95) translateY(10px)" }}
```

- **Radius 16px**, animation `scale(0.95) translateY(10px)` -> `scale(1) translateY(0)` over **300ms**
- Fill is a **96% colour-mix** of the modal surface; the `frosted` variant uses **65%** and `backdrop-blur-3xl`
- The scrim has a **backdrop blur** — this is a defining OpenShip trait
- Close button: `absolute top-4 end-4 z-10 p-1.5 rounded-lg bg-card hover:bg-muted transition-colors text-muted-foreground hover:text-foreground shadow-sm`

### 7.6 Dropdown — SOURCE (`components/ui/DropdownMenu.tsx`)

```
absolute z-50 mt-2 min-w-[220px] rounded-2xl border border-border/60 bg-popover/70
backdrop-blur-xl shadow-xl shadow-black/[0.08]
animate-in fade-in slide-in-from-top-2 duration-200
```

- **Minimum width 220px**, **radius 16px**
- **Translucent** `bg-popover/70` with `backdrop-blur-xl` — a **distinctive OpenShip trait**
  and the single largest visual difference from Mercenta's current opaque menus
- Shadow carries **8% black**
- Items: `w-full hover:bg-foreground/[0.06] active:bg-foreground/[0.1] px-3 py-2.5 text-start flex items-center gap-3 transition-all duration-200 rounded-xl`; label `text-sm font-medium truncate`
- Divider: `my-2 mx-3 border-t border-border/50`

### 7.7 Popover · Tabs · Badge · StatusDot — SOURCE

- **Popover** (`ui/Popover.tsx`) — `DismissiblePopover`, a ~50-line controlled wrapper that
  closes on an outside `pointerdown` (capture phase), an outside `focusin`, and `Escape`.
- **Tabs** (`ui/Tabs.tsx`) — one component, three shapes: **underline strip**,
  **filled list** (used when vertical or two-column), and a **two-column grid**. Props:
  `size 'sm' | 'md'`, `fullWidth`, `orientation 'horizontal' | 'vertical'`, `columns 1 | 2`,
  `idPrefix`. It auto-scrolls the active tab into view without moving the page, and tabs can
  carry a `count` badge, a `leading` node, or an `href` for deep-linking (rendered as `<a>`,
  plain click intercepted for an instant switch).
- **Badge** (`packages/ui/src/components/badge.tsx`) — `inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium`; variants `default bg-primary/10 text-primary` · `success bg-green-100 text-green-800` · `warning bg-yellow-100 text-yellow-800` · `error bg-red-100 text-red-800` · `muted bg-muted text-muted-foreground`.
- **StatusDot** (`packages/ui/src/components/status-dot.tsx`) — `inline-block h-2.5 w-2.5 rounded-full` (**10px**), coloured by status: queued `bg-gray-400` · building `bg-yellow-400 animate-pulse` · deploying `bg-blue-400 animate-pulse` · ready `bg-green-500` · failed `bg-red-500` · cancelled `bg-gray-400`; carries `title={status}`.

### 7.8 Tables — UNVERIFIED

**There is no canonical table primitive** in `apps/dashboard/src/components/ui/` (the folder
holds ChannelLogo, Checkbox, Choice, CustomCursor, CustomSelect, DropdownMenu, FileIcon,
IconPickerModal, InfoBanner, Logo, Modal, PageContainer, PillSwitcher, Popover,
SlidingToggle, Switch, Tabs, TagListInput, button, card, input, label, select, textarea).
Tables live inside feature folders and were not extracted.

**The Mercenta table treatment is therefore DERIVED** from the verified card, border,
dropdown and typography tokens — and **this document must never claim otherwise.**

---

## 8. TYPOGRAPHY AND FONT LICENSING

### 8.1 The reference font — SOURCE + licensing verified

`styles/fonts.css` declares **Gellix**, weights **100-900**, self-hosted from
`cdn.oblien.com`, plus **SF Arabic** for right-to-left text.

| Fact | Value | Tier |
|---|---|---|
| Foundry | **Displaay Type Foundry** | SOURCE |
| Designer | Martin Vácha | SOURCE |
| Free-version licence | **"Personal Use Only"** | SOURCE |
| Commercial rights | *"The full version includes a commercial license"* — **must be purchased** | SOURCE |
| Weights / glyphs | 8 weights + italics · 759 glyphs | SOURCE |
| Covered by the repo's Apache-2.0? | **No.** Repository licences do not grant rights to third-party font assets. | DERIVED |

### 8.2 DECISION — the substitute

**Gellix is NOT shipped.** The replacement is **Plus Jakarta Sans**.

| | Value |
|---|---|
| Licence | **SIL Open Font License 1.1** — free for commercial use, embeddable |
| Author | Tokotype |
| Axis | Variable `wght` |
| Licence verified | `ofl/plusjakartasans/OFL.txt` and `METADATA.pb` read from the Google Fonts repository |

**Why:** Gellix is geometric — circular forms joined to vertical stems. Plus Jakarta Sans is
geometric-humanist, so it carries that character, **and** it has a generous x-height, which
matters because Mercenta's operational text runs at **11-14px**. A pure geometric would match
Gellix's shapes more literally but reads worse at 11px in dense tables.

**Alternatives, both OFL 1.1 verified:** **Outfit** (Smartsheet Inc / Rodrigo Fuenzalida,
variable 100-900) — the closest pure-geometry match; **DM Sans** (variable).

### 8.3 Type scale — SOURCE (reference sizes)

| Role | OpenShip | Tier |
|---|---|---|
| Home page title | `text-2xl` **24px**, weight **500**, `foreground/80`, `-0.2px` | SOURCE |
| Page title | `text-xl` **20px** semibold, `tracking-tight` | SOURCE |
| Card title | `font-semibold leading-none tracking-tight` | SOURCE |
| Section title | `text-[15px] font-semibold` | SOURCE |
| Body / description | `text-sm` **14px** | SOURCE |
| Small meta | `text-xs` **12px** | SOURCE |
| Nav label | `text-[15px]` | SOURCE |
| Nav section heading | `text-[11px]` uppercase, `tracking-widest`, `font-semibold` | SOURCE |
| Account name / email | `text-[14px]` / `text-[12px]` | SOURCE |
| Count badge | `text-[13px] tabular-nums` | SOURCE |
| `kbd` | `text-[10px] font-mono` | SOURCE |
| Button | `text-sm font-medium` (lg `text-[15px]`) | SOURCE |

**Text hierarchy** is expressed as the nine-step opacity scale in §2.3-2.5, not as nine
different font sizes.

---

## 9. STATES

### 9.1 Empty — SOURCE

The home empty state is documented in §5.4. The projects empty state
(`overview/EmptyState.tsx`) is `py-16 text-center`: an illustration `h-44 w-64`, a title at
`text-2xl font-medium text-foreground/80` with `-0.2px` tracking, a description at
`text-sm text-muted-foreground/70 max-w-sm mx-auto leading-relaxed`, two buttons at
`px-6 py-3 text-sm font-medium rounded-xl`, then a **four-tile feature row**
(`grid grid-cols-2 sm:grid-cols-4 gap-3`, each `bg-card border border-border/50 rounded-xl p-4`
with a `w-8 h-8 rounded-lg bg-muted` icon tile), then the `⌘K` hint.

**Note the regularity:** the same `bg-card border border-border/50 rounded-xl p-4` tile with a
small `bg-muted` icon square appears in the empty state, the shortcut grid and elsewhere. It
is a reusable OpenShip composition.

### 9.2 Loading — SOURCE

- **Skeleton rows**: `divide-y divide-border/50` with `px-5 py-4` rows containing a
  `w-10 h-10 bg-muted rounded-xl` tile and `h-4`/`h-3` `bg-muted rounded` bars.
- **Card skeleton**: the same shape as the real card, `animate-pulse`.
- **Per-tile action**: e.g. `Progress` uses `animate-progress-sweep`, disabled under
  `prefers-reduced-motion`.
- **Unread-feed honesty**: `SystemStatusRow` renders `–` and stays neutral until the feed has
  answered — *"an unread feed must not claim 'Operational'"*.
- **Card `aria-busy`**: `<section aria-busy={loading}>`.

### 9.3 Error — SOURCE

The reference's error surfaces (`error-view.tsx`, `resource-not-found.tsx`,
`api-unavailable.tsx`, `not-found-view.tsx`) were not extracted in detail. **UNVERIFIED** —
Mercenta's existing error treatment is retained and restyled with the verified tokens.

### 9.4 Interaction states — SOURCE

| State | Treatment |
|---|---|
| Card hover (has a link) | `border-color: var(--th-card-bd-hover)` |
| Nav item hover | `--th-text-title` text; 4% title-colour fill |
| Nav item current | `--th-text-title` text; 7% title-colour fill |
| List row hover | `hover:bg-muted/50` or `hover:bg-foreground/[0.06]` |
| Disabled | `opacity-50` (`pointer-events-none` on buttons); `.th-btn:disabled` uses `opacity .42` |
| Focus | `focus-visible:ring-2 ring-ring/40` + `ring-offset-2` on controls |
| Transitions | `transition-all duration-150` (controls) · `duration-200` (menus) · `duration-300` (modal) |

### 9.5 No-permission — UNVERIFIED

Not confirmed in the reference. Mercenta's existing RBAC-hidden behaviour is retained.

---

## 10. REFERENCE DEFECTS — DO NOT MIRROR THESE

OpenShip's own codebase is **internally inconsistent**. Recording this is essential: copying
these files would break Mercenta's theming.

| File | Defect |
|---|---|
| `packages/ui/src/components/card.tsx` | **Hardcoded `bg-white`** — a leftover shadcn default. Not themed. |
| `overview/OverviewHeader.tsx` | **`text-black`, `bg-white`, `border-black/5`, `rounded-[20px]`** — hardcoded light |
| `overview/StatsGrid.tsx` | Same — `bg-white rounded-[20px] border border-black/5 p-5`, `text-black`, `text-black/50` |
| `overview/ProjectsCard.tsx` | Same, plus pink-tinted gradients (`from-pink-50/80`) |
| `overview/QuickLinks.tsx` | Same |
| `overview/LoadingSkeleton.tsx` | Same |

**Consequence:** OpenShip contains **two card systems** (`.th-card` / themed `card.tsx` **and**
the hardcoded `packages/ui` card) and **two container radii (16px and 20px)**. Its legacy
overview components would render **white-on-black** if shown in its own dark theme.

**The screenshot shows the THEMED path** (`DashboardHomeClient`, `HomeSidebar`, `HomeAppsCard`,
`HomeTipCard`, `HomeWelcome`, `EmptyState`, `SystemStatusRow`) — **not** the hardcoded legacy
components.

**Therefore: the themed path is the reference. The hardcoded files are defects and are not
copied.**

---

## 11. DOCS-VS-SOURCE DISCREPANCIES

The official documentation and the source code **disagree in four places**. Following this
project's own rule (*answer from the higher-authority source*), **the source wins**, and each
discrepancy is recorded so it can never silently resurface.

| The docs say | The source says | Authority |
|---|---|---|
| 3 nav sections: Main / Settings / Infrastructure | **4** — Main / Settings / Infrastructure / **Help** | Source |
| Main = Home, Projects, **Deployments, Backups** | Main = home, projects, **apps, actions, issues -> /monitoring** | Source |
| Home lists "up to **six**" projects | `.slice(0, 5)` — **five** | Source |
| The theme toggle "flips between light and dark" | Cycles **light -> dim -> dark** | Source |

**Why this matters:** building from the docs alone would have specified the wrong navigation
and the wrong list length. The docs are a simplified description; the code is the truth.

---

## 12. THE MEASURED GAP — MERCENTA TODAY vs THE REFERENCE

Every row below was measured in this repository this session.

> **§MEASURED-BATCH10: method=scripts/measure-legacy-classes.mjs date=2026-11-27 grey=6/1 ink=459/46 literal=0/0** — §REPOINTED 2026-11-27: the ink family rose from 127/29 to 458/45 because the BWS and Talent screens imported from Dash-1 and CAA-TalAg use the DECLARED ink and surface ladder (bg-ink-950, text-ink-900 and so on), which this metric counts as ink-family sites. Grey (6/1) and literal (0/0) are unchanged at their ceilings. **§UPDATED 2026-11-27 (§PHASE C BATCH C1, the console Homepage Editor):** the ink figure moved by **ONE site in ONE file** — 458/45 → **459/46** — because `AdminHomepageEditorView.tsx` uses the console's OWN DECLARED token `border-ink` (rule `.mercenta-next .border-ink` in `src/next/next.css`) to mark the selected homepage-design option, which is the same class `MetricStrip` and `ConsoleTabs` already use for their active state. The CEILING IS UNTOUCHED (ink 468), so this is the record being brought up to the measurement, never the metric being relaxed; grey (6/1) and literal (0/0) did not move.
>
> **§REPOINTED 2026-11-25 — THE `ink` FAMILY NOW COUNTS THE TRUE ALIASES, BY OWNER DECISION.** The `ink`
> family was defined as `ink-N | surface-* | brass-N`, and `surface-*` is the migration's DESTINATION:
> `tailwind.config.js` maps `ink` onto `var(--mr-surface)`, so `--mr-surface*` is the canonical name and `ink`
> is the alias. Counting the destination made the arm GROW as the migration succeeded — 483 → 912 against a
> ceiling of 468 — so it could never be satisfied. This repository recorded that as a decision rather than
> redefining the metric quietly (§FINDING below, 2026-11-21), and the decision has now been taken: the family
> is `ink-N | brass-N`, so it measures what it claims. **The OLD figures were `grey=6/1 ink=912/136
> literal=0/0`** — they are superseded by the line above, not deleted, so the change is reviewable.
>
> **Per-surface split, re-measured in the SAME run as the line above, with the repointed family:** the
> APPLICATION (`src/**` excluding `src/next/**`) holds **grey 6/1 · ink 14/2 · literal 0/0** — grey 6 and
> literal 0 are AT their ceilings, and 14 sites across 2 files still use the alias name; the CONSOLE
> (`src/next/**`) holds **grey 0/0 · ink 113/27 · literal 0/0** — **zero** legacy grey and **zero** literal
> sites, because WAVE 3m repointed all 1,746 grey and 279 literal sites onto the console's OWN declared
> classes in `src/next/next.css` at EXACTLY the values they already compiled to (so no pixel moved). Its 113
> remaining `ink-*` sites are the console naming its surfaces by the ALIAS rather than by `surface-*`; they
> stay counted, and they are what the ratchet still constrains.
>
> **§RESOLVED 2026-11-25 — THE CAVEAT THAT STOOD HERE IS CLEARED, AND ITS HISTORY IS KEPT.** The block that
> was here recorded two things that are no longer true and would have become false claims about the product
> had they been left standing:
>   · it described the four-path subject exclusion in `scripts/measure-legacy-classes.mjs` as an
>     **uncommitted** 12-line change to the Owner's work — that change is now COMMITTED, and
>     `src/assets/images/` is no longer in the list at all because that folder was a byte-identical
>     duplicate and was removed;
>   · it described the ink metric as an **OPEN OWNER DECISION** — it has been decided and applied (above).
> Its measured observation is preserved because it was true when written: with those four paths held OUT of
> the subject the recorded figures were `grey=6/1 ink=970/139 literal=0/0`, and the grey and literal arms
> were identical either way. The rule it taught stands: a record that silently depends on an uncommitted
> change is a record nobody else can reproduce.

>
> **Re-measured 2026-11-20** during the brand redesign (the four supplied homepage
> directions replaced the previous marketing composition, so the legacy-class count
 * moved; ink dropped 937 → 934 sites when the dead hero constants were removed from
 * `homepageDesign.ts`). The validator refuses a figure that drifts from the
 * measurement, so this line is updated in the SAME change as the code that changed it.
> **Re-measured 2026-11-20** during the footer restructuring (added Explore group to
> footer, updated BrandLockup variant prop); ink rose 934 → 935 sites.
>
> **Re-measured again 2026-11-20**: grey moved 2833 → 2832 sites (files unchanged at
> 123) because ONE site, the barcode drop-zone frame in `LogisticsHub.tsx`, was
> repointed from `border-zinc-300` to the `border-hairline-strong` role token — a
> text-brightness token that was being borrowed for a structural border (near-white in
> the dark appearance). Ink is unchanged at 934/115. No other figure moved.
>
> **Re-measured again 2026-11-21 (§BATCH 4b — the advertising screens):** grey moved
> 2832 → **2785** sites across **121** files (−47) and ink 934 → **929** (−5), because the
> two advertising surfaces — `src/components/brand/BrandAdvertising.tsx` (brand) and
> `src/components/admin/AmazonAdsDashboard.tsx` (admin) — were migrated off the legacy
> `zinc`/`ink`/`brass` aliases and the legacy Tailwind palette onto the declared theme
> ladder (`text-strong` · `text-muted` · `text-faint` · `bg-surface-raised` · `bg-tint` ·
> `border-hairline` · `bg-[var(--mr-accent)]`) and the canonical state tones
> (`state-success` · `state-warning` · `state-danger` · `state-info` · `state-muted`).
> The ratchet ceiling in `scripts/validate-legacy-styling-migration.mjs` was lowered to
> these figures in the SAME change, as this document's own note requires.
>
> **Re-measured again 2026-11-21 (§BATCH 5a — the shared primitives):** grey moved
> 2785 → **2675** sites across **112** files (−110) and ink 929 → **907** (−22), because
> the shared primitives were migrated onto the canonical ladder — `src/components/ui.tsx`
> (the UI kit), `src/components/shared/workspace.tsx`, `DataTable`, `dashboard`, the chart
> system, `ThemeSelector` and the six `src/components/layout/` files. `zinc-*` became the
> declared text ladder; `brass-*` became **`accent-*`**, the canonical name for
> `--mr-accent` (declared in `tailwind.config.js` as an exact mirror of `brass`, so the
> rename moves no pixel); `bg-ink-*` became `bg-surface-*`.
>
> **§FINDING (2026-11-21) — THIS FAMILY COUNTS `surface-*`, WHICH IS NOT AN ALIAS.** The
> `ink` → `surface` half of that rename moved sites between two members of this family's
> own definition (`INK = ink-N | surface-* | brass-N`), so it barely moved the count.
> `--mr-surface*` is the CANONICAL token name and `ink` is the alias, so `surface-*` is
> not legacy and this family cannot reach zero by migration. The definition is NOT
> redefined here — changing what a metric counts must not be done quietly — it is recorded
> as a decision in `PROJECT_STATUS.md` §BATCH 5a.
>
> **§DECIDED AND APPLIED 2026-11-25 — see the §REPOINTED note at the top of this section.** The decision this
> §FINDING asked for has been taken and applied: the family is now `ink-N | brass-N`, the subject measures
> `ink=127/29`, and T3 passes. The paragraph above is kept as the FINDING that led to it, not as the current
> definition.
>
> **Re-measured again 2026-11-21 (§BATCH 5b — the remaining shared components):** grey moved
> 2675 → **2401** sites across **92** files (−274) and ink 907 → **848** (−59), because the
> rest of `src/components/shared/**` was migrated onto the canonical ladder — `BrandGuidance`,
> `WorkWorkspace`, `TamSamDisplay`, `CommerceSimulationPanel`, `TourEngine`, `LiveChatWidget`,
> `ImageUploader`, `CsvCatalogImport`, `ShippingCostEstimate`, `BrandComm`, `RoutingRequest`,
> `CommandPalette`, `NotificationCenter`, `ProductThumb`, `ErrorBoundary`, `UnlockGrowth` and
> the five `shared/logistics/` panels. `zinc-*` became the declared text ladder; `parchment`
> became `soft` (the declared `--mr-text-soft` step); `brass-*` became `accent-*`. One
> validator assertion was repointed (`validate-shared-surfaces` — the live-chat trigger's
> text class), never weakened.
>
> **Re-measured again 2026-11-21 (§BATCH 6 — the signed-in brand portal):** grey moved
> 2401 → **1832** sites across **69** files (−569) and ink 848 → **759** (−89), because all
> 23 files in `src/components/brand/` were migrated onto the canonical ladder — **zero
> legacy sites remain in that folder.** `zinc-*` became the declared text ladder;
> `border-zinc-300` became `border-hairline-strong`; `bg-zinc-500/10` became `bg-tint`;
> `brass-*` became `accent-*`; `bg-ink-*` became `bg-surface-*`. The shim generator's
> resolver gained the rest of the text ladder (`strong` · `faint` · `soft` · `active`) —
> without them an alpha utility such as `text-strong/90` would have gone dark, which the
> generator REFUSES to allow. One stale e2e assertion was repointed: `uiux-redesign`
> asserted five `homepage-*` test ids that are rendered NOWHERE in `src/`, while its own
> comment claimed the list had already been updated (rule 10 — verified false, not
> assumed); it now asserts the default design's real `<section aria-label="…">` anchors.
>
> **Re-measured again 2026-11-21 (§BATCH 7 — the admin area, and the finish of the sweep):**
> grey moved 1832 → **6** sites in **1** file and ink 848 → **468**, because the signed-in
> ADMIN area (all 56 files in `src/components/admin/`) was migrated AND the sweep was then
> finished across every remaining `.tsx`/`.ts` source — `src/components/auth/`,
> `src/components/marketing/`, `src/components/design/`, `src/App.tsx`,
> `src/components/ui.tsx`. `steel` became `muted`; `parchment` became `soft`; the four
> `accent-brass-500` accent-colour utilities became `accent-[var(--mr-accent)]`; and a
> **REAL CONTRAST DEFECT** was fixed: a SOLID accent fill paired with `text-strong` (which
> is WHITE in the dark appearance — 2.34:1 on the orange) was repointed to
> `text-on-accent` in **11 sites across 7 files**, per quoted class string so a ternary's
> tint branch was never touched.
>
> **THE LAST 6 GREY SITES ARE `BLOCKED`, NOT DONE.** They live in
> `src/lib/intelligence/intelligenceTypes.ts` — the `TIER_COLORS` map — and `src/lib` is a
> **declared PROTECTED path** (business logic) in `scripts/validate-data-preservation.mjs`
> and the E6 guard. The change was made, the guards REFUSED it, and it was **REVERTED**.
> The file's `bg-zinc-500/10|5` tints are also not a pure rename (they resolve to
> `--mr-text-muted`, not to the `bg-tint` token used elsewhere), so the change needs a
> review rather than a blanket substitution. **Next action:** the owner authorises the
> two `TIER_COLORS` lines, or they stay as they are.
>
> **THE REMAINING 468 INK SITES ARE `surface-*`, WHICH IS NOT LEGACY** — see the §FINDING
> above: `--mr-surface*` is the canonical token name, so this family cannot reach zero by
> migration.
>
> **T1 REPOINTED, AND MADE STRONGER.** `validate-legacy-styling-migration` T1 required BOTH
> families to be non-empty; that would FORCE A FALSE STATE once a family is legitimately
> exhausted (a finished migration failing its own gate, which invites keeping legacy
> classes just to keep the number non-zero). It now requires a non-vacuous walk, at least
> one family with subjects, AND a **positive control** (`bg-surface` must be found), which
> proves the reader is parsing real class strings.
>
> **Re-measured 2026-11-21** during the Concept 3 header restyle: the public
> header's dropdown panel was the last site in that component still painted with the
> legacy `bg-ink-800/70` alias. It now reads the theme's raised-surface token, so ink
> moved 935/116 → 934/115 sites and files. Grey is unchanged at 2832/123. This is a
> REDUCTION, never an increase — the ratchet ceiling (grey 2866 / ink 974) is untouched.
>
> **§MEASURED-BATCH10-FINAL: method=scripts/measure-legacy-classes.mjs date=2026-10-19 grey=2866/126 ink=974/117 literal=0/0**
>
> **§DECISION-BATCH10-2: method=scripts/measure-legacy-classes.mjs date=2026-11-25 literal=0/0 border=0 text=0 bg=0 divide=0 ring=0 solid=0 tint=0 uncovered=0**
>
> **§DECISION-BATCH10-2-FINAL: method=scripts/measure-legacy-classes.mjs date=2026-10-19 literal=0/0 border=0 text=0 bg=0 divide=0 ring=0 solid=0 tint=0 uncovered=0**
>
> **§MIGRATION COMPLETE (2026-10-19) — All 1,663 literal white/black class sites migrated to theme tokens. The force-patch block (§UI/UX WAVE 1 — LIGHT-SHELL TOKEN REMAP LAYER) has been DELETED from src/index.css as no literal sites remain. Ratchet ceilings updated to final measured figures (grey 2866/126, ink 974/117, literal 0/0).**
>
> **§CORRECTED 2026-11-25 (WAVE 3l) — THAT CLAIM WAS TRUE OF THE APPLICATION AND IS NOT TRUE OF THE WHOLE SUBJECT.** The
> console (`src/next/**`, the AI Studio port, built in WAVES 2–3k during November 2026) declares its OWN design-token set
> in `src/next/next.css` (`--color-next-canvas` · `--color-next-surface` · `--color-next-border` · `--color-next-ink` …)
> and **uses none of it**: measured this session with the project's own method
> (`node scripts/measure-legacy-classes.mjs`), the console authors **1,746 grey-family sites across 44 files** and
> **279 literal `white`/`black` sites across 38 files** (`bg-white` 226 · `text-white` 53), while its ink-family usage is
> **zero**. The application surface, measured the same way, holds **6 grey sites in 1 file** and **0 literal sites** — so
> the application is inside its recorded ceiling and the console is what stands outside it. The force-patch block remains
> deleted; **the console's own sites are the reason that is no longer safe to assume**, and the fix is named work:
> migrate `src/next/**` onto its own declared `--color-next-*` tokens. **The migration is NOT complete for the whole
> subject, and this document must not be read as saying it is.**
>
> **§UPDATED 2026-11-25 (WAVE 3m) — THE CONSOLE IS NOW MIGRATED, AND THE SENTENCE ABOVE IS ANSWERED.** Wave 3m
> repointed **all 1,746 grey and 279 literal sites** in `src/next/**` onto the console's own classes, completing the
> token set in `src/next/next.css` first with the missing ladder steps at EXACTLY the values they already compiled to
> (`text-secondary` #3f3f46 · `text-ink-900` #18181b · `text-ink-800` #27272a · `text-quiet` #a1a1aa · `text-quieter`
> #d4d4d8 · `text-on-dark` #ffffff · `bg-tint-strong` #e4e4e7 · `bg-ink-800/900/950` · `bg-scrim-30` ·
> `bg-canvas-40…80` · `bg-tint-70/80` · `border-hairline-soft/bold` · `border-ink` · `border-ink-strong`), so **no
> pixel moved**: proved by the measurement (grey 1746 → **0**, literal 279 → **0**), by `e2e/next-console-smoke.spec.ts`
> (**6 passed**, every console screen rendering), and by a NEW gate `scripts/validate-next-console-tokens.mjs` that
> makes the state permanent in both directions — **A**: the console's code authors zero grey-family and zero literal
> sites (the project's OWN family regexes, imported, so no second definition); **C**: every console token the code
> uses is DECLARED (the dead-class defect this project has already paid for once, when `text-strong` emitted no rule
> in 97 files). **The whole subject now measures `grey=6/1 ink=912/136 literal=0/0`: grey and literal are AT their
> ceilings, and the ONLY assertion still red is the ink arm — which WAVE 3m's own numbers show can never be reached
> by migration, because the ink family counts `surface-*`, the destination of the migration it is supposed to
> measure.** That is the open Owner decision below, now with its full evidence.
>
> **§SUB-BATCH 2 — THE COUNT WAS COUNTING PROSE, AND THAT IS FIXED AT SOURCE (2026-10-16).** The
> first reader matched the **raw file text**, so a class NAMED IN A COMMENT counted as a call site.
> Measured both ways in one run: **13** of the grey family's sites and **13** of the literal family's
> were prose (every one of those 13), and `classSites()` — the number the gate's "is this shim rule
> still used?" verdict is built on — held **100** prose mentions (`bg-card`, `bg-tint`, `bg-ink-900`,
> `border-white/[0.06]`, …). So a comment could certify a **DEAD** force-patch rule as live, which is
> exactly how dead weight survives a gate. One of the "classes" measured was `bg-white/[0.0x]`, which
> exists **only** inside a comment in `ThemeSelector.tsx`.
> **The reader now takes the strings the TypeScript parser sees**, so prose is excluded BY
> CONSTRUCTION rather than by a regex that guesses where a comment ends (a path glob such as
> `src/**` + slash-star + `.tsx`, or a `//` inside `https://…`, both occur in this codebase and both
> break naive stripping). The figures above are the TRUE counts, **lowered** accordingly; the old
> 4,508 / 132 · 960 / 118 · 1,676 / 123 figures are retained **only as history**. The gate proves the
> exclusion (T7) on a sample whose answer is known by construction, and the ratchet (T3) was lowered to
> the true counts — and the ceiling only ever moves DOWN, so nothing was made easier to pass.
>
> **§METHOD NOW RECORDED (added 2026-10-15, §OPENSHIP BATCH 10 step 1) — REPOINTED, not weakened.**
> The row below used to read **2,812** / **857** and named **no method anywhere in the repository**:
> no script, no regex, no definition of "grey family" and no statement of which files were walked, so
> the migration's own first step — a re-measurement — **could not reproduce them**. Two counts from
> two different methods sitting side by side is precisely the drift rule 10 §2 forbids. The method now
> EXISTS as `scripts/measure-legacy-classes.mjs` (subject `src/**/*.{ts,tsx}` · a "site" = one
> occurrence of a class token matching the family **inside an authored string** · generated CSS
> deliberately excluded) and the figures above are **produced by it**, machine-read back out of this
> document by `scripts/validate-legacy-styling-migration.mjs` (T2), which FAILS if the numbers here and
> the numbers measured ever disagree. The old 2,812 / 857 pair is retained **only as history**.
>
> **WHAT STEP 1 ESTABLISHED — AND IT RESHAPES THIS BATCH.** The two families are NOT mostly
> "hardcoded" values. `tailwind.config.js` already routes `zinc-*`, `ink-*`, `brass-*`, `steel` and
> `parchment` through the canonical theme variables (`zinc-400` → `var(--mr-text-muted)`,
> `bg-ink-850` → `var(--mr-surface-raised)`, …), so those class sites are legacy **NAMES** whose
> values already come from the theme — renaming them would move no pixel. The genuinely LITERAL
> family is `white`/`black` (**1,663** sites, above), and those are exactly what the light-shell
> force-patch block exists to remap. Batch 10's real target is therefore the literal family and the
> block, not 3,700 renames.

>
> **AND IT FOUND REAL DEAD WEIGHT IN THE BLOCK, FIXED AT SOURCE (rule 07).** Seven rules declared
> **exactly** what Tailwind already resolves their class to, and six selectors could never match
> because their class has **zero** sites in `src` (measured, and confirmed by an independent grep
> with word boundaries). All thirteen were DELETED in the same change, recorded inline in
> `src/index.css`, and pinned by that gate (T4/T5), which derives the verdict from the two owners —
> the Tailwind palette and the block itself — rather than trusting a figure typed into a document.

| Element | Mercenta today | OpenShip | Delta |
|---|---|---|---|
| **Sidebar container** | `border-r border-white/[0.06] bg-ink-900 shadow-ds-raised`, full height | floating card `my-3 ms-3 rounded-2xl border-border/50 bg-card`, no border | **the biggest single visual change** — **CLOSED by BATCH 5 (2026-10-15)**: the rail is now that floating card (`.ds-rail`), and the wrapper paints nothing |
| **Sidebar width** | `w-72 lg:w-60` = **240px**; compact `lg:w-16` = **64px** | **260px** expanded / **72px** collapsed | +20px / +8px — **CLOSED by BATCH 5**: the card is 260 / 72 inside a 272 / 84 wrapper (the 12px inset is the card's own margin) |
| **Nav row** | `rounded-ds-md` **8px**, `gap-2.5` (10px), `text-sm` **14px**, `px-2.5 py-1.5` | `rounded-xl` **12px**, `gap-3` (12px), `text-[15px]` **15px**, `px-3 py-2.5` | radius +4px, font +1px |
| **Nav section gap** | `mb-0.5 mt-2` (8px) | `mt-5` (**20px**) | +12px |
| **Card radius** | `rounded-ds-lg` **12px** | **16px** | +4px |
| **Card border** | `border-white/[0.06]` always | **transparent** in dark and dim | make theme-driven |
| **Card shadow** | `shadow-ds-subtle` always | **`none`** in dark and dim | make theme-driven |
| **Card header padding** | `px-5 py-4` | `p-6` | 20/16 -> 24px |
| **Button radius** | `rounded-ds-md` **8px** | `rounded-xl` **12px** | +4px |
| **Button height** | `min-h-[36px]` | `h-10` (**40px**) | +4px |
| **Input height** | no fixed height (~36px) | `h-11` (**44px**) | +8px |
| **Input radius** | `rounded-ds-md` **8px** | `rounded-xl` **12px** | +4px |
| **Input label** | `text-xs` **12px** | `text-sm` **14px** | +2px |
| **Modal panel** | `rounded-ds-lg` **12px**, **opaque** `bg-ink-850`, backdrop `bg-black/70` **no blur** | `rounded-2xl` **16px**, `color-mix(… 96%)`, `var(--th-overlay)` + **`backdrop-blur-lg/xl`** | radius +4px, **add blur** |
| **Dropdown** | `rounded-ds-lg` 12px, **opaque** `bg-ink-850` | `rounded-2xl` **16px**, `bg-popover/70` **translucent** + `backdrop-blur-xl`, `min-w-[220px]` | radius + translucency + blur |
| **Text hierarchy** | `--mr-text-strong` / `--mr-text` / `--mr-text-muted` / `--mr-text-faint` (4 steps) | **9 named steps** | add the missing steps |
| **Accent CTA** | flat `bg-brass-500` | **per-theme gradient + radial highlight + themed shadow** | add the gradient |
| **Status colours** | Mercenta `--mr-state-*` | OpenShip `--st-*` five families | align values |
| **Page container** | none shared; legacy `max-w-[1400px] mx-auto` | `max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8 py-6` | add shared container |
| **Hardcoded classes** | **4,495** grey-family sites across **129** files and **944** `ink`/`surface`/`brass` sites across **117** files — MEASURED 2026-10-16 by `scripts/measure-legacy-classes.mjs` (the §MEASURED-BATCH10 line above; the 2026-10-15 figures were 4,508 / 960 because the reader then counted class names mentioned in COMMENTS — see the §SUB-BATCH 2 note); of these, the genuinely LITERAL ones are **1,663** `white`/`black` sites across **120** files, because the rest are legacy NAMES that `tailwind.config.js` already resolves to theme variables | theme tokens throughout | migrate (Batch 10) — retargeted by the measurement: the literal family and the light-shell force-patch block, not a mass rename |

---

## 13. THE THEME REPLACEMENT PLAN

**Mercenta's five theme options are preserved. Their four non-Bold designs are REPLACED with
OpenShip's designs. `bold` is untouched. `minimal-light` remains the default.**

> **§REPOINTED 2026-10-15 (§OPENSHIP MAPPING BATCHES 1–2) — THE TABLE BELOW IS SUPERSEDED HISTORY.**
> It records BATCH 3's assignment (three light slots + one dark slot). **The Owner's 2026-10-15
> instruction replaced the assignment:** `minimal-light` and `serious` implement the reference's
> **LIGHT** design, `professional` its **DIM** design and `fun` its **DARK** design — so
> `professional` and `fun` are now `mode: 'dark'` and `serious` is `mode: 'light'`, and the accents
> are violet `#7C3AED` (light), lime `#B7ED5A` (dim) and orange `#F97316` (dark). `bold` stays
> unchanged. The current assignment is stated in §EXECUTED below and PINNED by
> `scripts/validate-theme-distinctness.mjs` and `e2e/theme-visual.spec.ts`, which read the real
> values rather than a list typed into a document (rule 10 §2).

| Mercenta option | Mode (measured) | OpenShip design applied | Accent |
|---|---|---|---|
| `minimal-light` | **light** | **OpenShip `light`** — page `#f9f9f9`, card `#ffffff`, border `#e8e8e8`, `--th-overlay rgba(0,0,0,.45)` | `violet-500 -> --th-btn-bg -> blue-500` |
| `professional` | **light** | **OpenShip `light`**, exactly — **no Mercenta accent retained** | same as `minimal-light` |
| `fun` | **light** | **OpenShip `light`**, exactly — **no Mercenta accent retained** | same as `minimal-light` |
| `serious` | **dark** | **OpenShip `dark`** — page `#000000`, card fill `rgba(255,255,255,.05)`, transparent border, **no shadow**, white primary button, overlay `rgb(20 20 20 / 60%)` | `amber-400 -> orange-500 -> rose-500` |
| **`bold`** | **dark** | **UNCHANGED — exactly as it is today** | unchanged |

**`DEFAULT_THEME` stays `minimal-light`.** (`src/config/themes.ts:104`)

**Mode values were measured this session** — `minimal-light` light (line 125), `professional`
light (line 214), `bold` **dark** (line 299), `fun` **light** (line 385), `serious` **dark**
(line 471). An earlier draft of this plan guessed `fun` was dark. **It is light.** The guess
was corrected rather than left standing.

**On the 4-slots-to-3-designs arithmetic, recorded honestly.** OpenShip has three designs
(light / dim / dark) and Mercenta has four non-Bold slots, three of which are light. So
OpenShip's single `light` design covers all three light slots and its `dark` covers the one
dark slot.

**§EXECUTED 2026-10-14 (§OPENSHIP BATCH 3) — WHAT WAS ACTUALLY BUILT, AND THE THREE PLACES IT
DIVERGES FROM THE PLAN ABOVE. Recorded here because this section is a LIVE describer, and a
plan that survives its implementation as though it were still the plan is a false statement
about the product (rule 10).** The four non-Bold themes now carry OpenShip's SURFACES
exactly as tabled above — one light design across `minimal-light`, `professional` and `fun`
(page `#F9F9F9`, card `#FFFFFF`, border `#E8E8E8`, scrim `rgba(0,0,0,.45)`, cards
shadowless) and OpenShip's dark design for `serious` (page `#000000`, card fill
`rgba(255,255,255,.05)` rendered as its opaque composite `#0D0D0D`, dropdown `#161616`, the
INVERTED scrim `rgb(20 20 20 / 60%)`, cards shadowless). `bold` is unchanged. Divergences:

1. **The three light slots carry DIFFERENT accents, not one.** The plan said
   `professional` and `fun` would be "OpenShip light, exactly". Making all three identical
   would have re-created the exact defect the Owner reported in §PHASE C1 — a theme switch
   that changes nothing — and would have failed `scripts/validate-theme-distinctness.mjs`,
   whose purpose is that a user switching themes sees a measurable change. So each light
   slot takes a **different accent from OpenShip's OWN palette**, and no Mercenta accent hue
   is retained: `minimal-light` violet `#7E22CE` (the light design's violet→blue gradient),
   `professional` blue `#2563EB`, `fun` lime `#A9F04D` (the `dim` design's hero hue, which
   takes dark text on it). `serious` takes the dark design's amber→orange→rose, i.e. orange
   `#F97316`. Every accent pair is ≥ 39 in straight-RGB distance and every contrast floor is
   measured, not estimated, by the theme gate.
2. **OpenShip's `dim` design is NOT implemented as a sixth theme.** The plan above said it
   would be "implemented in the theme contract"; in the event it cannot be, because
   `scripts/validate-theme-foundation.mjs` pins the selectable set to EXACTLY five
   (`minimal-light · professional · bold · fun · serious`, with the retired `current` theme
   forbidden by an absence guard), and with `bold` exempt there is no slot for a fourth dark
   design. Its one distinctive feature that CAN be honoured is: the lime accent, which is
   where `fun`'s accent comes from. Recorded as a deliberate divergence rather than a
   silent one.
3. **The card's BORDER was still drawn — CLOSED by BATCH 4 (2026-10-15).** This item is
   kept because it recorded a real, open gap; it is now a record of what was outstanding,
   not a claim about the product. The border half was the component change BATCH 4 owns,
   and it is DONE: the four non-Bold themes declare `--mr-card-border: transparent` and
   the `Card` primitive carries `.ds-card` (`src/index.css`), so a card is borderless as
   well as shadowless — the reference's own rule (`--th-card-bd: transparent`, §2.3–§2.5,
   and §2.7, "the borderless-card rule is the heart of the look"). BATCH 4's own record,
   including five divergences, is the block below.

**§EXECUTED 2026-10-15 (§OPENSHIP BATCH 4) — THE SHARED SURFACES AND CONTROLS, AND WHERE IT
DIVERGES FROM THE REFERENCE.** Built: the card (borderless in the four non-Bold themes, plus
the reference's NESTED-CARD rule, without which an inner card is the same fill as its outer and
VANISHES once the border is transparent), the input and the label (44px control, 14px padding,
the reference's 14px label — and the `Select` takes the same height so a form row cannot mix
38px and 44px), the modal (the scrim is the THEME's own token — the reference's own mechanism —
with its defining backdrop blur, replacing a hardcoded `bg-black/70` that ignored the theme
entirely, which matters most in `serious` where the reference INVERTS the veil), and the
dropdown (translucent at 70% of the theme's flyout surface with a backdrop blur, on all three
dropdown surfaces). `bold` is preserved BY MECHANISM: all three new tokens reproduce what that
theme renders today. What BATCH 5–8 and the legacy migration still own is listed with each
divergence below. Divergences, stated rather than left silent:

1. **The card's HOVER-BORDER trait (`.th-card:has(a:hover)` → `--th-card-bd-hover`) is NOT
   implemented.** The reference lightens a card's edge when a link inside it is hovered. In
   Mercenta a `:has()` rule would win over the border that 26 call sites deliberately supply
   (dialog shells built from `Card`), silently discarding a screen's explicit intent. A
   clickable-card affordance belongs with the per-screen pass that decides which cards are
   links — not with the primitive.
2. **Cards that supply their OWN border keep it.** 26 `<Card>` call sites pass
   `border-white/[0.06]` or `[0.08]`; `.ds-card` is deliberately declared in the `components`
   layer so those still win, rather than being silently overridden. Repointing hardcoded
   `white`/`ink` class sites is the LEGACY-STYLING MIGRATION's work (§12, the programme's
   "Batch 10"), which is where they are scheduled and recorded.
3. **The modal panel keeps its opaque fill and its 1px edge.** The reference's panel is a 96%
   `color-mix` of its surface with `backdrop-blur-2xl`. The named trait this batch was scoped
   to (the blurred THEME-TOKEN scrim, and the 16px radius BATCH 3 already applied) IS built;
   the 4%-translucent fill is not, because a 96%-opaque panel behind a blur buys a
   near-invisible effect at a real compositing cost in a dense operational tool.
4. **The floating PANELS are not menus.** `NotificationCenter` and `LiveChatWidget` keep their
   opaque surface: the reference's translucency trait is evidenced for its DROPDOWN only
   (§7.6), and its popover styling is not evidenced at all (§15.1/§15.3) — so copying the
   dropdown treatment onto panels would be invention, not replication. They are the shared
   surface BATCH 8 (component states) and the migration pass will reach.
5. **`Select` keeps the canonical 12px control radius, not the reference's 8px.** The
   reference's own select contradicts its own input (8px against 12px, §7.4); Mercenta's ramp
   is the single owner of radii, so the control step wins and the inconsistency is not copied.

**§EXECUTED 2026-10-15 (§OPENSHIP BATCH 5) — THE NAVIGATION RAIL, THE RADIUS SCALE THAT WAS
NEVER EMITTED, AND WHERE IT DIVERGES FROM THE REFERENCE.** Built: the rail is a FLOATING CARD
(`my-3 ms-3`, `rounded-ds-lg` 16px, its own derived hairline, `overflow-hidden`, no full-height
edge border and no full-height fill behind it), its width moves to the reference's **260px
expanded / 72px collapsed** (the wrapper is 260+12 and 72+12, because the 12px inset belongs to
the card's margin), its nav rows take the reference's geometry (12px radius, 12px gap, `px-3
py-2.5`, a 20px icon, one 4px list rhythm), its section gap becomes 20px, its header becomes
`px-5 pt-6` with a 26px mark and the 16px wordmark, its scroll region becomes `px-3 pt-3 pb-12`
and gains the reference's 56px scroll fade, and the account area becomes the reference's
`px-3 pb-4 pt-2` block with a 14px name over a 12px second line. Mercenta's feature-identity
accents, pinning, section collapsing, the nav filter, the compact rail and every destination are
PRESERVED (each is pinned by the gate, and the navigation inventory by
`validate-nav-destinations.mjs`). `bold` is preserved BY MECHANISM for its fill and its row
hover: the fill stays the theme's surface role (which is exactly what `bold` draws today) and
the hover moves to the ONE floating-surface tint (`--mr-hover-tint`, whose `bold` value IS the
value the rail hovered with). Divergences, stated rather than left silent:

1. **THE RADIUS RAMP HAD NEVER BEEN ON SCREEN — FOUND BY THIS BATCH'S OWN RENDERED CHECK AND
   FIXED AT SOURCE.** `tailwind.config.js` declared the ramp as a NESTED object
   (`borderRadius: { ds: { sm, md, lg, pill } }`). Tailwind 3.4 SILENTLY emits no utility for a
   nested scale object, so `rounded-ds-sm` (**195** sites), `rounded-ds-md` (**431**) and
   `rounded-ds-lg` (**88**) — **714 class sites** — rendered `border-radius: 0px`, from §PHASE C4
   through BATCH 3 and BATCH 4. Every check read the config BLOCK or the SOURCE; none read the
   generated CSS, which is why "declared · consumed · gated" and "rendered" disagreed for weeks.
   Reproduced in isolation this session (a minimal config with the same nested shape emitted NO
   `rounded-ds-*` rule; the same config with FLAT `'ds-*'` keys emitted `border-radius: 16px`),
   and measured in the built stylesheet (zero occurrences of `rounded-ds`). The keys are now flat
   — the class names are unchanged, so no call site moved — and
   `scripts/validate-radius-elevation-scale.mjs` **COMPILES the config in memory and fails if the
   three used steps do not really emit their declared value**. This is not a divergence from the
   reference: it is the difference between what the project BELIEVED it rendered and what it did.
   Consequence for the record: every earlier batch's pixel comparison was measured on a product
   whose named radius ramp was inert; BATCH 5's own measurement (median **13.5%** of pixels moved
   across the 30 baselines) is the first that contains real corners.
2. **The nav row keeps the canonical 14px body step, not the reference's 15px.** The project's
   type scale has five named steps and no 15px step, and its own written rule is that a 1px
   difference between two steps is not a hierarchy (`tailwind.config.js`, §PHASE C4). The
   reference's 15px is therefore NOT adopted, and the rail is pinned as introducing no unnamed
   size.
3. **The account avatar keeps the design system's own step and form** (32px, circular) rather
   than the reference's 36px square: the avatar is a SHARED primitive, so its geometry belongs to
   the design system, not to one rail. Its type pair does follow the reference (14px over 12px).
4. **The section heading keeps the project's `tracking-[0.14em]`** (its convention at 52 sites)
   rather than the reference's `tracking-widest`; the 11px size and uppercase treatment are the
   reference's and are unchanged.
5. **The rail's own navigation filter keeps its compact metrics.** The reference measures 44px on
   form controls (§7.3), which BATCH 4 applied to `Input`/`Select`/`Textarea`; this filter is the
   rail's own toolbar affordance (and has no counterpart in the reference), so it is aligned to
   the card instead of promoted to a 44px form row.
6. **A defect in the rail's own footer, fixed at source (rule 07).** The demo environment
   switcher's grid declared THREE columns while its list holds TWO entries — a leftover of §P9,
   which removed the carrier entry and left the grid behind, so a third of the card rendered
   empty. It is now two columns, its rows take the theme's hover tint (the legacy near-white
   hover is invisible on the light shells' card), and the gate DERIVES the column count from the
   entries so the two cannot drift apart again.

**§EXECUTED 2026-10-15 (§OPENSHIP BATCH 6) — THE TOP BAR: SURFACE AND TYPE, AND WHERE IT DERIVES RATHER
THAN COPIES.** Built: the bar keeps every control it had and changes only its surface and type (the
batch's own scope, §16). **Surface:** it no longer paints a fill of its own — the reference's only
header carries no background class, so it sits on the page — and its single separation is a DERIVED
bottom edge (`.ds-bar`: 40% of the theme's border token, the reference's own
`border-b border-border/40`, with the full-strength hairline declared first as the fallback).
**Type:** the command bar takes the reference's default button height and type (40px, 14px) in place
of a ~34px pill at 12px; the account menu's exit label moves from 11px to the 12px small-meta step;
the `kbd` hint moves from 11px to 12px. **Controls:** every chrome control is now the reference's own
control — a 36px square icon control at the 12px control radius (the drawer toggle, the notification
bell, the theme trigger) or a 36px-high control (the account button) — and every hover in chrome
comes from the ONE floating-surface tint (`--mr-hover-tint`) instead of a legacy near-white, which is
invisible on the light designs. Every control, test id, aria wiring and behaviour is preserved (the
gate lists all fifteen of them). Divergences, stated rather than left silent:

1. **The bar keeps its 56px height (`h-14`) — the reference's own mobile-header value.** There is no
   other measurement to copy: OpenShip's desktop shell has no top bar at all (§3.1), so every value
   here is DERIVED from that one header plus its control primitives, and this record says so rather
   than implying a source it does not have.
2. **It stays a full-bleed band, not a floating card.** The reference's own header IS a full-bleed
   band separated by a bottom border — the only header evidence that exists — so floating the
   desktop bar would have invented something the reference does not show. The rail floats; the bar
   does not; both are stated rather than left to inference.
3. **The `lg:px-8` step of the reference's container ladder (`px-4 sm:px-6 lg:px-8`) is NOT applied
   to the bar.** The bar takes the first two steps; the third belongs with the shared page container
   in BATCH 7, where the header and the content below it can be aligned to each other in ONE change
   rather than by halves.
4. **The `kbd` hint is 12px, not the reference's 10px.** The project's type scale declares an 11px
   floor and no 10px step, and a keyboard hint is not worth a scale bypass — so the floor wins, the
   same reasoning BATCH 5 recorded for the reference's 15px nav label.
5. **TWO LIVE CLAIMS THAT WERE ALREADY FALSE WERE REPOINTED IN THE SAME CHANGE**
   (`docs/DESIGN_SYSTEM.md`, "Shell & Navigation"): it still described the active nav item as a
   "brass-accented icon + `bg-white/[0.08]` fill" and sections as "never `aria-expanded` — no
   collapsible sections". Both had been false since §UI/UX Wave 2 (the feature-identity accent and
   collapsible sections), and BATCH 5 then replaced the rail's hover mechanism as well. They are
   corrected at source with a `§REPOINTED` note and a new "Chrome surfaces" sub-section, because a
   live describer must not outlive the thing it describes.

---

**§EXECUTED 2026-10-15 (§OPENSHIP BATCH 7) — PAGE LAYOUTS: THE SHARED CONTAINER, THE ALIGNED APP
BAR AND THE 340px RAIL.** Built: **the page container** is now the reference's own
(`WorkspaceFrame`, spec §4.1): `max-w-[1600px] mx-auto px-4 py-6 sm:px-6 lg:px-8` — capped and
centred, with the reference's padding ladder and its 24px vertical step, replacing the retired
`px-4 py-4 sm:px-5 sm:py-5 lg:px-6`. **The app bar carries the SAME container on an inner row**
(`mx-auto max-w-[1600px] px-4 sm:px-6 lg:px-8`), so the first control in the bar sits on the same
leading edge as the page title below it at EVERY width — which is exactly why BATCH 6 deferred its
`lg:px-8` step to this batch. **The page description** takes the reference's 6px gap (`mt-1.5`).
**The context rail** takes the reference's measurements (§4.3): **340px** with a **24px** gap
(was 320px / 16px), still rendered as a `role="complementary"` region rather than a second
`<aside>` (the shell asserts exactly one). Divergences, stated rather than left silent:

1. **The rail KEEPS the project's `xl` switch (1280px), not the reference's `lg`.** At 1024px a
   340px rail would leave ~350px for a dense operational table; the reference's own two-column
   screens are project lists, so its breakpoint is not transferable and `better-layout`'s rule is
   that breakpoints come from the content. The MEASUREMENTS are adopted; the breakpoint is not.
2. **The page header keeps the project's `mb-3` rhythm, not the reference's `mb-8`.** The
   primitive records a deliberate tightening (a 900px viewport reaches its first actionable row
   sooner), and an operational tool outranks a project-list page here. The reference's own type
   metrics for that header (20px, semibold, `tracking-tight`) were ALREADY matched.
3. **The page title keeps the Mercenta display face.** The reference's page title is the sans at
   the same size, weight and tracking; the face is a stated identity decision in the primitive,
   not an oversight.
4. **The frame keeps its `reading` width (`max-w-3xl`) and `compact` density steps.** Both are
   project affordances for surfaces that genuinely need them; the reference has no equivalent, so
   nothing was invented to match it.
5. **ONE DEFECT INTRODUCED AND FIXED INSIDE THIS SESSION, recorded rather than hidden:** an edit
   of the browser spec deleted the file's top-level `describe` closing brace (it looked like a
   stray after a previous edit). The suite's own typecheck caught it immediately and it was
   restored; the three OPENSHIP rendered tests then passed.

---

## 14. VISUAL IMPLEMENTATION DECISIONS

| # | Decision | Tier | Reason |
|---|---|---|---|
| 1 | **Plus Jakarta Sans** replaces Gellix | DERIVED | Gellix is paid; this is OFL 1.1, geometric, readable at 11-14px |
| 2 | **Container radius 16px, control radius 12px, small control 8px** | SOURCE | Measured in `.th-card`, `button.tsx`, `input.tsx` |
| 3 | **Cards borderless + shadowless in dark themes; theme-driven everywhere** | SOURCE | `--th-card-bd: transparent`, `--th-card-shadow: none` |
| 4 | **The 9-step text hierarchy is added to all five themes** | SOURCE | `--th-text-*` in theme.css |
| 5 | **The accent CTA becomes a per-theme gradient** | SOURCE | `.th-btn-accent` |
| 6 | **Dropdowns become translucent with a backdrop blur** | SOURCE | `bg-popover/70 backdrop-blur-xl` |
| 7 | **Modals gain a blurred, theme-token scrim and a 16px radius** | SOURCE | `Modal.tsx` |
| 8 | **The sidebar becomes a floating card** | SOURCE | `sidebar.tsx:307` |
| 9 | **The top bar keeps every control; only its surface and type change** | DERIVED | No OpenShip desktop top bar exists to copy |
| 10 | **The 340px right rail is adopted only per screen, never forced** | SOURCE + DERIVED | Docs describe it as a per-screen pattern |
| 11 | **Tables are restyled from verified tokens, not copied** | DERIVED | No canonical table primitive exists |
| 12 | **Mercenta's navigation, routes, RBAC and workflows are untouched** | — | The project's own requirement |

---

## 15. EVIDENCE REGISTER — WHAT IS AND IS NOT PROVEN

### 15.1 SOURCE-VERIFIED

Repository identity and licence · three-theme structure and the two opacity scales · the
complete `dark`, `dim` and `light` token sets · the per-theme accent gradients · every `.th-*`
utility class · the borderless-card rule and the nested-card rule · the absence of a desktop
top bar · the mobile-only `h-14` header · the floating sidebar and its complete internal
geometry · the nav model and its conditional composition · `PageContainer` · page-header
typography · the home composition and its grid · the empty state and the four shortcut tiles ·
`Button` · `Card` · `Input` · `Label` · `Select` · `Textarea` · `Modal` · `DropdownMenu` ·
`Popover` · `Tabs` · `Badge` · `StatusDot` · the font declaration and its licence position ·
the existence of the hardcoded-light reference defects · the docs-vs-source discrepancies.

### 15.2 SCREENSHOT-OBSERVED

One screenshot only: the **empty-state home page in the dark theme**. It confirms the dark
palette, the floating rounded sidebar, the 11px uppercase section headings, the orange-to-pink
accent button, the four shortcut tiles, the "Your Projects" empty card, the right rail, and the
account footer. **It shows no populated state, no other screen, and no other theme.**

### 15.3 DERIVED — stated as derived, never as copied

The top-bar treatment (**no OpenShip desktop top bar exists**) · the table treatment (**no
canonical table primitive exists**) · the Mercenta mappings of every measured value · the three
light themes sharing OpenShip's single light design · the error and no-permission state styling
(**not confirmed in the reference**).

### 15.4 UNVERIFIED — the honest gaps

1. **No rendered OpenShip instance was opened.** Every geometry claim derives from reading
   class strings, not from a rendered page. **Pixel-exact fidelity is therefore not claimed.**
2. **Populated home states are only partially evidenced** — the source of the themed components
   was read, but no populated screenshot exists.
3. **No second screenshot.** OpenShip's appearance outside the one supplied image is unverified.
4. **Error, not-found and no-permission surfaces in OpenShip were not extracted.**
5. **Gellix's own licence page** could not be fetched directly; the licence position was
   established from a distributor listing of the Displaay trial. The decision (do not ship)
   holds either way, and the substitute's licence **was** verified at source.

**A claim outside §15.1 and §15.2 must be treated as §15.3 or §15.4 — never as verified.**

---

## 16. THE IMPLEMENTATION BATCH PLAN — OWNER-APPROVED 2026-10-14

> **Why this section exists.** The batch sequence was agreed in conversation and, for one
> session, lived ONLY there. `.clinerules/operating-model.md` §12 (CHAT IS NOT PROJECT
> MEMORY) makes that a defect: a session that opens the repository alone could not tell
> what "the next batch" was, and the only batch number anywhere in the project was the
> "(Batch 10)" note in §12 above. The plan is therefore recorded HERE, in the repository,
> with its sequence and its scope guardrails.

**The reference is a BENCHMARK, not a source.** Mercenta keeps its pages, navigation,
routes, workflows, data, permissions, authentication, integrations and security. Only the
interface is rebuilt on OpenShip's design language (§1.3).

### The sequence, in the Owner's own order

| Batch | Scope |
|---|---|
| **1** | **The verified reference specification** — this document. **DONE** (`ec0c991`). |
| **2** | **The protection gates** — `validate-nav-destinations.mjs` (nothing may be lost from the navigation inventory) + `validate-data-preservation.mjs` (no data/domain file may change). **DONE** (`ec0c991`). |
| **3** | **Design foundations** — OpenShip's colours, theme surfaces, corners, shadows, typography and primary-action styling across the **four non-Bold themes**. `bold` is preserved exactly; `minimal-light` stays the default. No Mercenta accent hue may be retained where it conflicts with the reference. |
| **4** | **Shared surfaces and controls** — the card/input/modal/dropdown treatments and their props-preserving migration. |
| **5** | **The sidebar** (the reference's biggest single visual change). |
| **6** | **The top bar** — every control kept; only its surface and type change (there is no OpenShip desktop top bar to copy — §1/decision 9). |
| **7** | **Page layouts** — the shared page container, page headers and the per-screen 340px right rail. |
| **8** | **Component states** — empty, loading, error, interaction, no-permission. |
| **then** | **The legacy-styling migration** — the hardcoded grey/`ink`/`surface`/`brass` class sites (§12), after which the `src/index.css` light-shell force-patch block is deleted and an absence guard proved able to fail. The spec's own §12 table labels this **Batch 10**. **§STEP 1 — THE MEASUREMENT — IS DONE (2026-10-15):** the method exists and the batch is RETARGETED by what it measured (the literal `white`/`black` family and the block, not a mass rename) — see the note under this table. |
| **last** | **Full acceptance testing** — the rendered, page-by-page pass. |

**The intervening numbers (9, 11 …) are NOT evidenced in this repository** — only the
migration's "Batch 10" label is. The ORDER above is what was approved and what must be
followed; no number is invented to fill a gap.

> **§STEP 1 OF THE MIGRATION IS DONE (2026-10-15) — and it RETARGETED the batch rather than
> merely renumbering it.** The migration's own first step was a RE-MEASUREMENT, because §12's
> 2,812 / 857 figures named no method (see §12's note). It is now measured, recorded and gated:
>
> - **THE METHOD EXISTS:** `scripts/measure-legacy-classes.mjs` — subject `src/**/*.{ts,tsx}`,
>   the two family regexes, and `classSites()` as the one owner of "how many sites does this class
>   have". `npm run measure:legacy` prints the table; §12's row is written FROM it and the new gate
>   machine-reads §12 back and fails on any disagreement.
> - **THE FINDING THAT CHANGES THE WORK:** the two families are mostly legacy NAMES whose VALUES
>   already come from the theme (`tailwind.config.js` routes `zinc-*`, `ink-*`, `brass-*`, `steel`,
>   `parchment` to the canonical variables), so renaming them would move no pixel. The genuinely
>   LITERAL family is `white`/`black` — **1,663 sites across 120 files** (re-measured 2026-10-16; the
>   1,676 recorded on 2026-10-15 counted 13 class names that appear only in comments) — and those are
>   exactly what the light-shell force-patch block exists to remap. **The remaining migration work is
>   therefore: the literal family, then the block's deletion with its absence guard (gate T6).**
> - **IT ALSO FOUND DEAD WEIGHT IN THE BLOCK, FIXED AT SOURCE (rule 07):** seven rules declared
>   exactly what Tailwind already resolves (so they could not change a pixel) and six selectors had
>   ZERO sites in `src` (so they could never match). All thirteen were DELETED, recorded inline in
>   `src/index.css`, and pinned by `scripts/validate-legacy-styling-migration.mjs`, which derives
>   both verdicts from the two owners rather than trusting a figure in a document.
> - **A REMAINING DESIGN QUESTION, NAMED SO IT IS NOT DISCOVERED LATE:** `--mr-hairline` is
>   `#E8E8E8` on the two light designs but `rgba(255,255,255,0.08)` on dim/dark, so
>   `border-white/[0.06]` (375 sites) cannot simply become `border-hairline` without changing the
>   dark appearance by 2%; and a `text-white` site that sits ON a saturated fill must take an
>   on-fill token rather than the strong text token, or the fill's label would invert on light
>   shells. Both are decisions for the next sub-batch, with the numbers attached.

### SUB-BATCH 2 — THE CLASSIFICATION, AND THE THREE DECISIONS IT PUTS ON THE TABLE (2026-10-16)

> **§SUB-BATCH 2 IS THE NUMBERS, NOT THE MIGRATION.** The two decisions above had to be taken WITH the
> numbers, so this step made the numbers **reproducible and gated** before any component changed. What
> was built: the reader now counts AUTHORED STRINGS (a comment is never a call site — the defect and
> its fix are recorded in §12), and `classifyLiteralFamily()` produces the classification from that one
> owner. `npm run measure:legacy` prints it; §12's `§DECISION-BATCH10-2` line is written FROM it and
> the gate machine-reads it back (T8). **No component, no token and no CSS rule changed in this step,
> so nothing rendered changed** — which is why the 30 baselines are byte-identical rather than "close".
>
> **THE CLASSIFICATION — 1,663 literal sites, by the property they are used on:**
> **border 757 · text 601 · bg 268 · divide 35 · ring 2** (by variant: none 1,506 · hover 152 ·
> focus 2 · group-hover 2 · focus-visible 1).
>
> **DECISION 1 — THE HAIRLINE BORDERS (757 sites; the block already remaps 20 of their base classes).**
> Two of the five themes are LIGHT (`minimal-light`, `serious`: `--mr-hairline` `#E8E8E8`) and three are
> DARK (`professional`, `fun`: `rgba(255,255,255,0.08)`; `bold`: `rgba(245,246,248,0.09)`, preserved
> exactly by Batch 3). Today `border-white/[0.06]` renders `#E8E8E8` on light (the block) and **6%**
> white on dark (no remap), so:
>
> | Option | What it does | What it changes on screen |
> |---|---|---|
> | **1A — add ONE new role token** (`--mr-hairline-soft`: `#E8E8E8` on the two light designs, `rgba(255,255,255,0.06)` on the three dark ones) | reproduces today EXACTLY, on all five themes | **nothing** — the migration becomes provably pixel-neutral |
> | **1B — repoint onto the theme's own `--mr-hairline`** | one token for one role; the legacy 6% is deleted | dark-theme borders move **6% → 8%**, and `[0.04]` 49 · `[0.05]` 18 · `[0.07]` 1 · `[0.1]` 4 · `[0.12]` 18 sites all collapse onto the theme's value, so those move further |
>
> **DECISION 2 — WHITE TEXT ON A SATURATED FILL (601 text sites; 21 share their string with a SOLID
> fill, 4 with only a TINT).** Today the block RESTORES white text on three fills only
> (`.bg-state-danger`, `.bg-crimson-accent`, `.bg-red-500`), while the measured SOLID fills are
> **`bg-brass-500` 18 · `bg-brass-400` 4 · `bg-brass-600` 2 · `hover:bg-red-700` 2 ·
> `bg-state-warning` 1 · `bg-crimson-accent` 1 · `bg-state-danger` 1** — so **24 brass sites have NO
> restore rule**, and on a light shell their text is remapped to `--mr-text-strong` (#000000) over a
> solid gold fill. Options: **2A** give every solid fill an explicit ON-FILL token per theme (no
> appearance change; one more token), or **2B** keep the three restore rules and add the brass pair
> (smaller, but the rule list grows with every new fill). The 4 TINT sites (`bg-brass-500/10`) must
> take the ORDINARY text token — the classifier keeps tint and solid apart so a correct remap is never
> "fixed" into white-on-white.
>
> **DECISION 3 — THE 57 LITERAL SITES NO SHIM RULE COVERS (a new ratchet, gate T9).** 18 classes:
> `bg-black/60` 11 · `bg-black/70` 10 · `border-white/20` 8 · `bg-white` 5 · `bg-black` 5 ·
> `bg-white/10` 2 · `text-black` 2 · `border-black` 2 · `bg-black/20` 2 · `border-white/5` 2 ·
> `border-white/10` 1 · `ring-white/20` 1 · `ring-white/[0.06]` 1 · `border-white/25` 1 ·
> `bg-black/40` 1 · `bg-white/[0.01]` 1 · `border-white/[0.10]` 1 · `bg-black/30` 1.
> Most are CORRECT as they stand (a `bg-black/70` modal scrim is meant to be dark on every theme, and
> the printable waybill's `bg-white text-black` is a document). But **15 are INTERACTION STATES that
> are INVISIBLE on the two light designs**: `hover:border-white/20` 8 · `border-white/5` 2 ·
> `hover:border-white/25` 1 · `border-white/10` 1 · `border-white/[0.10]` 1 (a `[0.1]` written with a
> trailing zero, so the block's own `[0.1]` selector cannot match it) · `ring-white/20` 1 ·
> `ring-white/[0.06]` 1. A hover or selected state painting 20% white on a #FAFAFA surface reads as
> nothing. Fixing them CHANGES what the light themes show, so it is the Owner's call; until then the
> count is a frozen CEILING (57) so it cannot grow unnoticed.


### Guardrails, unchanged and binding

- **Incremental and reversible.** Preserve Mercenta's existing UX, functionality, data,
  authentication, permissions, integrations and security. No page, route, prop, workflow
  or data contract may change because of a styling batch.
- **Never weaken a gate to make a batch pass.** Repoint it to the current source of truth
  and record the old contract inline as `§… — REPOINTED` (`.clinerules/mercenta-business-model.md`).
- **Do not claim visual fidelity without comparing rendered screens** with the reference.
  §15.4 stands: no rendered OpenShip instance has been opened, so pixel-exact fidelity is
  NOT claimed anywhere in this project.
- **Baselines stay reusable, not recreated:** `test-screenshots/themes/<theme>/<screen>.png`
  (30 = 5 themes × 6 screens, gitignored), regenerated by `npx playwright test e2e/theme-visual.spec.ts`.
- **Every batch closes with its own evidence:** the validators run, before/after screenshots,
  and an honest `BUILT / TESTED / RESULT / NEXT` report.

---

---

**§EXECUTED 2026-10-15 (§OPENSHIP BATCH 8) — COMPONENT STATES: ONE OWNER PER STATE, THE CARD'S HOVER
EDGE, AND THE TWO PANELS BATCH 4 AND 6 LEFT OPEN.** Built: **the five named states of §9 now each have
ONE owner** in `src/components/ui.tsx`, so a surface renders a state instead of hand-rolling its own
markup.

- **EMPTY (§9.1).** `EmptyState` takes the reference's block (`py-16 text-center`, a `max-w-sm`
  description under a title, then the actions) and gains an optional `icon`.
- **LOADING (§9.2).** `LoadingState` takes the reference's ROW ANATOMY — a leading square tile plus a
  wide bar and a short bar — inside the project's own 36px row box, so the skeleton has the shape of the
  row that is coming without breaking the documented `rows` height contract (19 call sites depend on it).
- **ERROR (§9.3 — DERIVED, and stated as derived).** A NEW `ErrorState` owner: `role="alert"`,
  `data-testid="error-state"`, the theme's card edge (`ds-card` → `--mr-card-border`) instead of the
  hardcoded `border-white/[0.06]` it used to declare, and the CANONICAL recovery control (so the retry
  carries the reference's per-theme CTA gradient BATCH 3 built). `ErrorBoundary` now renders THROUGH it;
  its copy is unchanged, which is why `e2e/error-boundary.spec.ts` still passes untouched.
- **NO-PERMISSION (§9.5 — DERIVED, and UNVERIFIED in the reference).** A NEW `NoPermissionState` owner,
  `variant="inline"` for a panel and `variant="page"` for a shell, replacing **SEVEN** hand-rolled copies
  of the same refusal (`AdminShell`'s whole-view refusal plus six panels: SimulationControl,
  InvestorDemoPanel, OperatingCostsPanel, CompliancePanel, CompanyControlCentre, GoogleSetupWizard).
  **NO permission, role, gate or visible result was added, removed or widened** — this is presentation
  only, and the danger token still arrives with an always-readable text label.
- **INTERACTION (§9.4).** The one missing trait — the card's hover edge — is now real:
  `--mr-card-border-hover` in all five themes, applied by the reference's own
  `.ds-card:has(a:hover)` (`spec §2.7`) plus `.ds-card-interactive:hover` for a click target written
  without an anchor (this project's idiom), over the reference's own `transition: border-color .2s`. An
  actionable queue row now takes the list-row hover from the ONE theme tint.

**TWO REAL DEFECTS FIXED AT SOURCE (rule 07), both caught by this batch's own evidence:**
1. **The loading skeleton was INVISIBLE on all three light designs.** `Skeleton` painted
   `bg-white/[0.06]`, whose light-shell shim resolves to `--mr-surface-tint` — `#FAFAFA` on a `#FFFFFF`
   card, a **1.02:1** difference. The skeleton is the only signal that a slow surface has not yet
   answered, so an invisible one is the visual half of the false-denial defect the rest of §9 warns
   about. It is now the theme's own tint (`bg-tint` → `--mr-hover-tint`, the value BATCH 5 established
   as the visible one on light surfaces), and the browser test MEASURES the composited result rather
   than the class name.
2. **The live-chat trigger was a 32px control standing beside three 36px ones** in the same header
   (bell, theme, account). It is now the same 36px/12px-radius control as its neighbours.

**THE TWO FLOATING PANELS** BATCH 4 and BATCH 6 deliberately left (`NotificationCenter`,
`LiveChatWidget`) now take the theme's container edge (`.ds-card`) instead of a hardcoded near-white
border, keep the container radius and the theme's overlay elevation, use the ONE hover tint on their
rows, and render their empty states through the empty-state owner. **Their translucency is deliberately
NOT adopted**: the reference evidences that trait for its DROPDOWN only (§7.6), so copying it onto a
panel would be invention rather than replication — the same reasoning BATCH 4 recorded.

**DIVERGENCES, stated rather than left silent:**
1. **The empty-state title stays on the project's named 16px step.** The reference's is 24px, which is
   above this project's PAGE title (20px) — an empty REGION would out-rank the page it sits on, and the
   named scale is the single owner of type sizes.
2. **The reference's four-tile feature row and its `⌘K` hint are NOT adopted into the empty state.**
   They are OpenShip's HOME-PAGE composition (§5.4/§5.5), not part of a general empty state; Mercenta's
   empty states are per-region inside dense operational surfaces, where a 2×4 feature grid would be
   wrong at that scale. Nothing was invented to match it.
3. **The row skeleton keeps the project's measured 36px row box** rather than the reference's ~72px row
   with its 40px tile: a skeleton taller than the row it replaces is a layout shift, not fidelity.
4. **Error and no-permission keep Mercenta's copy, semantics and RBAC behaviour**, restyled with the
   verified tokens — both traits are recorded as DERIVED in the spec (§9.3/§9.5, §15.3), and neither is
   described as a copy of a reference component.
5. **The focus ring, the disabled step and the control durations keep the project's token-driven
   values.** The reference uses `ring-2 + ring-offset-2`, `opacity-50` and 150/200/300ms; this project
   uses a token-driven `outline` that follows the element's own radius (a §PHASE C4 decision),
   `opacity-60` on the canonical control, and the theme's motion tokens. Each is within a few
   pixels/milliseconds of the reference and the token remains the single owner.
6. **The three inline "Researching …" pulse texts** (`GrantsInvestorsSection`,
   `ManufacturerSourcingSection`, `ProductResearchSection`) are NOT migrated to `LoadingState`: they are
   in-flight PROGRESS MESSAGES for a long AI call, not a region's loading state, and a skeleton bar
   cannot carry their sentence. Recorded so the omission is a decision rather than an oversight.

**§EXECUTED 2026-10-15 (§OPENSHIP MAPPING BATCHES 1–2) — THE FOUR NON-BOLD THEMES IMPLEMENT THE
DESIGN EACH WAS ASSIGNED.** Built in `src/config/themes.ts` (169 values), with `bold` left
byte-identical: `minimal-light` and `serious` → the reference's **LIGHT** design (page `#F9F9F9` ·
card `#FFFFFF` · tint `#F4F4F4` · hairline `#E8E8E8` · accent violet `#7C3AED`), `professional` →
**DIM** (page `#141414` · card `#1B1B1B` · tint `#222222` · accent lime `#B7ED5A`), `fun` →
**DARK** (page `#000000` · card `#0D0D0D` · tint `#141414` · accent orange `#F97316`). **The theme
`mode` moved with the design** (`professional`/`fun` dark, `serious` light) because the design IS
dark and §2's own mode/luminance agreement would otherwise fail. **Two real appearance faults were
fixed at source:** the collapsed inner fill had become `#FAFAFA` on a `#FFFFFF` card (**1.02:1**,
invisible across 289 class sites) and the dark design's tint **recessed below its own card**
(`#080808` under a `#0D0D0D` card). **Typography:** the reference declares one family and no serif, so
the display role now resolves to the interface face and Fraunces plus the unused Inter download were
removed from `index.html`.

**§EXECUTED 2026-10-15 (§OPENSHIP MAPPING BATCH 3) — THE SOLID PRIMARY ACTION, AND THE ACCENT
RESERVED FOR CREATION.** §2.7's `.th-btn` (a SOLID fill from `--th-btn-bg` with `--th-btn-text`) and
§2.6's `.th-btn-accent` (the per-theme GRADIENT) are two different buttons, and Mercenta had wired
only the gradient — to `primary`, i.e. to **274 call sites**. Now the page primary action carries the
design's own solid button through a new `.ds-btn` utility plus `--mr-btn-bg` / `--mr-btn-bg-hover` /
`--mr-btn-text` in all five themes (near-black `rgba(0,0,0,.92)` + white on LIGHT, white + black on
DIM and DARK — §2.5/§2.4/§2.3), and the gradient moved onto a new `accent` variant applied to the
**18** buttons whose own label begins with a creation verb. `bold`'s three tokens reproduce exactly
what its button computed before, so that theme is unchanged **by value**, and the browser spec
measures it: `rgb(124,58,237)` fill with `rgb(18,19,24)` label, and 0.000% of its pixels moved on 5
of its 6 rendered baselines. **Divergences and a held decision, stated rather than left silent:**
(1) the Button's HEIGHT stays `min-h-[36px]` against the reference's 40px (§12's own row) — the
recorded task was the treatment, and a height change moves 371 call sites' layout; (2) `bold`'s
preserved button pair measures **3.26:1 on its fill and 2.59:1 on hover, below the 4.5:1 AA floor**;
it is pre-existing and protected by the instruction that `bold` is preserved exactly, so it is
MEASURED, REPORTED and HELD for the Owner rather than repainted; (3) which buttons count as
create-style is a REVIEWED SET, not a guess — the rule is "the label's first word is create · new ·
add · invite · import", it is discovered from the source by `validate-theme-distinctness.mjs` §8, and
the sites it excludes (Start onboarding, Generate application, Send reply, Send Invite, Request
change, Send packing correction) are flow-and-communication actions rather than record creation.

**AN INSTRUMENT DEFECT, FOUND AND FIXED IN THE SAME BATCH (2026-10-15).** §16's guardrails call for
before/after screenshots as each batch's evidence, and that instrument was not reproducible: running
`e2e/theme-visual.spec.ts` TWICE on identical code produced frames differing by up to **2.396% of
their pixels on 6 of the 30 screens**, which is larger than several of the deltas earlier batches
reported as their effect. The cause was found by cropping the frames and looking: the app smoothly
scrolls a tour target into view, so the captured scroll offset depends on elapsed time.
`selectTheme()` now sets `prefers-reduced-motion: reduce`, under which the browser scrolls instantly;
the re-measured noise floor is **min 0.000% · median 0.000% · max 0.002%**, with 26 of 30 screens
byte-identical across two runs. **Every figure in this section was therefore read with the noise
floor stated**: on the 24 screens that were stable under the old capture the deltas are real
(`bold` 0.000% on 5 of 6; the four mapped designs 0.303%–1.850%), and on the six that were not, the
deltas are NOT cited as this batch's effect. A residual limit: the live countdown text still ticks
between runs, so its 6×10px region can differ by ~0.005% and is excluded from every claim.

---
*End of specification.*


