/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        sans: ['"IBM Plex Sans"', 'system-ui', 'sans-serif'],
        display: ['Fraunces', 'Georgia', 'serif'],
        plex: ['"IBM Plex Sans"', 'system-ui', 'sans-serif'],
        mono: ['"IBM Plex Mono"', 'ui-monospace', 'monospace'],
      },
      /**
       * §UI/UX Wave 3 — CANONICAL OPERATIONAL TYPE SCALE.
       *
       * The measured taste debt was 1,202 arbitrary sub-12px sizes
       * (`text-[8px]` 47 · `text-[9px]` 206 · `text-[10px]` 949) plus 644
       * `text-[11px]` occurrences. Those sizes bypassed the hierarchy
       * documented in docs/DESIGN_SYSTEM.md ("avoid text-[8px]/text-[10px]
       * micro-sizes"), which is why dense operational surfaces read as an
       * admin template rather than enterprise software: there was no NAMED
       * operational size to reach for, so every author invented one.
       *
       * This scale names them, so the hierarchy is enforceable:
       *
       *   ds-micro  11px  readable FLOOR — eyebrows, nav section labels, dense meta
       *   ds-label  12px  control labels, table headers, badges (= text-xs)
       *   ds-body   14px  body copy, table cells (= text-sm)
       *   ds-title  16px  section / card titles
       *   ds-page   20px  workspace page title (h1)
       *
       * §PHASE C4 (2026-10-13) — THE BODY STEP MOVED 13px → 14px, and the title
       * step 15px → 16px. Measured reason: the canonical body step was SMALLER
       * than the application's real body text. `text-sm` (Tailwind's own 14px)
       * is used 258 times across 75 files, while `text-ds-body` was consumed in
       * only 15 places in 5 files — so the design system declared a body size the
       * app did not use, and a "body" token that rendered two steps BELOW the
       * default read as a way to make text smaller, not as the body size. The
       * Owner approved 14px body (D-2, docs/PHASE_C_TO_G_PLAN_2026-10-13.md).
       * The title step moved with it: at 14px body a 15px title is a 1px step,
       * which is not a hierarchy. The floor (11px), the label step (12px) and
       * the page step (20px) are deliberately UNCHANGED — the instruction was a
       * readable body, not a uniformly larger interface.
       *
       * Line-heights are unchanged (body 1.45, title 1.35): this is a dense
       * professional tool, where 1.45 keeps operational rows scannable at the
       * new size rather than spending vertical space.
       *
       * Nothing below 11px may be introduced, and no arbitrary px size inside the
       * 11–20px range may bypass these names. `npm run validate:typography`
       * fails on a micro size, on a missing/mis-sized token, on a floor below
       * 11px, and on a document that states a stale token size.
       */
      fontSize: {
        'ds-micro': ['11px', { lineHeight: '1.3' }],
        'ds-label': ['12px', { lineHeight: '1.4' }],
        'ds-body': ['14px', { lineHeight: '1.45' }],
        'ds-title': ['16px', { lineHeight: '1.35' }],
        'ds-page': ['20px', { lineHeight: '1.25' }],
      },
      colors: {
        /**
         * §UI/UX Wave 1 — the ENTIRE palette is routed through the canonical
         * theme CSS variables (src/config/themes.ts → ThemeContext). No page
         * may define its own theme colour. `white`/`black` stay literal so
         * the many `*-white/[.x]` hairline classes keep compiling; light
         * themes remap the text/hairline classes in src/index.css.
         */
        white: '#FFFFFF',
        black: '#000000',
        ink: {
          DEFAULT: 'var(--mr-surface)',
          950: 'var(--mr-bg-deep)',
          900: 'var(--mr-surface)',
          850: 'var(--mr-surface-raised)',
          800: 'var(--mr-surface-overlay)',
          700: 'var(--mr-surface-hover)',
          600: 'var(--mr-surface-hover)',
          500: 'var(--mr-surface-hover)',
          2: 'var(--mr-surface-raised)',
        },
        brass: {
          DEFAULT: 'var(--mr-accent)',
          300: 'var(--mr-accent-300)',
          400: 'var(--mr-accent-400)',
          500: 'var(--mr-accent)',
          600: 'var(--mr-accent-600)',
          700: 'var(--mr-accent-700)',
        },
        zinc: {
          100: 'var(--mr-text-200)',
          200: 'var(--mr-text-200)',
          300: 'var(--mr-text-active)',
          400: 'var(--mr-text-muted)',
          500: 'var(--mr-text-muted)',
          600: 'var(--mr-text-faint)',
        },
        stamp: '#B5493A',
        parchment: 'var(--mr-text-soft)',
        steel: 'var(--mr-text-muted)',
        amber: {
          accent: 'var(--mr-state-warning)',
        },
        crimson: {
          accent: 'var(--mr-state-critical)',
        },
        /** §Phase 5 §UI/UX — semantic state colours (maps 1:1 to themes). */
        state: {
          success: 'var(--mr-state-success)',
          warning: 'var(--mr-state-warning)',
          danger: 'var(--mr-state-critical)',
          info: 'var(--mr-state-info)',
          muted: 'var(--mr-state-muted)',
        },
        /** §Phase 5 §UI/UX — surface elevation scale (theme-driven). */
        surface: {
          DEFAULT: 'var(--mr-surface)',
          raised: 'var(--mr-surface-raised)',
          overlay: 'var(--mr-surface-overlay)',
          hover: 'var(--mr-surface-hover)',
        },
        /**
         * §UI/UX Wave 2 — the SATURATED feature palette. Hue → domain mapping is
         * canonical (src/config/themes.ts doc header): indigo=orders ·
         * cyan=intelligence · green=finance · amber=compliance · orange=logistics
         * · pink=communications · violet=catalogue · red=risk. These are SOLID,
         * confident fills; pair them with `text-on-palette` (never assume white).
         */
        palette: {
          indigo: 'var(--mr-palette-indigo)',
          cyan: 'var(--mr-palette-cyan)',
          green: 'var(--mr-palette-green)',
          amber: 'var(--mr-palette-amber)',
          orange: 'var(--mr-palette-orange)',
          pink: 'var(--mr-palette-pink)',
          violet: 'var(--mr-palette-violet)',
          red: 'var(--mr-palette-red)',
        },
        /** §UI/UX Wave 2 — canonical text/icon colour ON a solid palette fill. */
        on: {
          palette: 'var(--mr-on-palette)',
        },
        /** §UI/UX Wave 2 — per-domain identity colours (icons, nav, tints). */
        feature: {
          intel: 'var(--mr-feature-intel)',
          orders: 'var(--mr-feature-orders)',
          finance: 'var(--mr-feature-finance)',
          social: 'var(--mr-feature-social)',
          compliance: 'var(--mr-feature-compliance)',
          ops: 'var(--mr-feature-ops)',
        },
      },
      /**
       * §PHASE C4 (2026-10-13) — THE ONE RADIUS SCALE (inline · control · container · pill).
       *
       * WHY THIS BLOCK WAS REPOINTED
       * ----------------------------
       * The scale declared FOUR named steps and the product rendered FIVE unnamed
       * ones. Measured in `src/` before this change:
       *
       *     rounded-lg    387   (8px,  unnamed)   |  rounded-ds-md   41  (10px)
       *     rounded-md     97   (6px,  unnamed)   |  rounded-ds-lg   26  (14px)
       *     rounded       85    (4px,  unnamed)   |  rounded-ds-sm   22  (6px)
       *     rounded-xl     58   (12px, unnamed)   |  rounded-2xl      4  (16px)
       *     rounded-full   76   (pill, Tailwind's own step)
       *
       * So 630 class sites had no place in the named scale, and the two steps that
       * DID carry names (10px, 14px) were rendered almost nowhere. That is the same
       * defect class the type scale had: a design system declaring values the
       * product does not use, which is how every author invents their own.
       *
       * WHAT CHANGED — and what deliberately did NOT
       * -------------------------------------------
       * REPOINTED — the two moving steps are `ds-md` (10px → 8px) and `ds-lg` (14px → 12px).
       * They moved ONTO the geometry the application already renders for its
       * dominant controls (`rounded-lg` = 8px, 387 sites) and containers
       * (`rounded-xl` = 12px, 58 sites), which is what makes the migration a
       * RENAME rather than a redesign: binding `rounded-lg` → `ds-md` and
       * `rounded-xl` → `ds-lg` moves no pixels for 542 sites. Measured cost of the
       * repoint: 41 + 26 occurrences move by 2px each, in 20 shell/shared files.
       * `ds-sm` (6px) and `ds-pill` are unchanged.
       *
       * The DENSE, professional tool rule: 4px (bare `rounded`) is folded into
       * 6px, because a 2px difference between two small steps is not a step — it
       * is noise, and it was being used inconsistently on chips and `<code>`.
       *
       * Two values are deliberately OUTSIDE this ramp, each with a stated reason:
       *   · `rounded-2xl` (16px) — permitted ONLY on LARGE MARKETING / hero blocks
       *     (`src/components/marketing/**`), the same way the type scale permits
       *     Tailwind's larger sizes above the 20px page step.
       *   · `rounded-full` — Tailwind's own step and the SAME VALUE as `ds-pill`
       *     (9999px), so it is an accepted alias for the pill role, not a
       *     second scale.
       *
       * This block is the SINGLE OWNER of the radii. `npm run validate:radius`
       * (`scripts/validate-radius-elevation-scale.mjs`) READS THIS BLOCK, then
       * fails if an unnamed radius or an unnamed shadow reappears anywhere in
       * `src/`, if `rounded-2xl` escapes the marketing folder, or if a live
       * describer of the scale states a value this block does not declare.
       * The migration onto it is mechanical and idempotent:
       * `npm run migrate:radius` (re-running is a no-op).
       */
      borderRadius: {
        ds: {
          sm: '6px',      // inline — chips, tags, kbd/<code>, thumbnails, micro icon buttons
          md: '8px',      // controls — buttons, inputs, selects, textareas, tabs, nav items
          lg: '12px',     // containers — cards, panels, modals, popovers, tables
          pill: '9999px', // pills · avatars · dots · status badges (`rounded-full` is the same value)
        },
      },
      /**
       * §PHASE C4 (2026-10-13) — THE ELEVATION SCALE, and ONE REMOVAL.
       *
       * Four roles, each a THEME-DRIVEN token (`--mr-shadow-*` in
       * `src/config/themes.ts`, so a light theme gets a soft grey lift and a dark
       * theme a deeper one):
       *   `ds-none`    no lift        — a control that must sit flat (link button)
       *   `ds-subtle`  resting        — cards, panels, active segmented pills
       *   `ds-raised`  interactive    — a primary control, a hover lift
       *   `ds-overlay` floating       — modals, popovers, dropdowns, floating cards
       *
       * REMOVED: `ds-focus` and `ds-focus-danger` (they were
       * `0 0 0 2px var(--mr-focus)` / `0 0 0 2px rgba(229,83,63,0.5)`). Both were
       * declared here and consumed NOWHERE in `src/`, while the focus mechanism the
       * product actually uses is the canonical `:focus-visible` OUTLINE in
       * `src/index.css`, which every interactive element receives. A
       * declared-but-unconsumed token is the exact defect this scale exists to end
       * (the same reason the type scale has a "declared but never consumed" check),
       * so it was removed rather than kept "for later".
       * `npm run validate:radius-elevation` carries the ABSENCE GUARD: a focus
       * shadow token that is declared WITHOUT a consumer fails the gate.
       */
      boxShadow: {
        'ds-none': 'none',
        'ds-subtle': 'var(--mr-shadow-subtle)',
        'ds-raised': 'var(--mr-shadow-raised)',
        'ds-overlay': 'var(--mr-shadow-overlay)',
      },
      transitionProperty: {
        ds: 'background-color, border-color, color, box-shadow, opacity, transform',
      },
      /** §UI/UX Wave 2 — one motion language, driven by the canonical tokens. */
      transitionDuration: {
        'ds-fast': 'var(--mr-motion-fast)',
        ds: 'var(--mr-motion-base)',
        'ds-slow': 'var(--mr-motion-slow)',
      },
      transitionTimingFunction: {
        'ds-standard': 'var(--mr-ease-standard)',
        'ds-emphasized': 'var(--mr-ease-emphasized)',
      },
      /** §UI/UX Wave 2 — controlled density scale for operational rows. */
      height: {
        'row-compact': 'var(--mr-density-row)',
      },
      spacing: {
        'density-gap': 'var(--mr-density-gap)',
        'density-pad': 'var(--mr-density-pad)',
      },
    },
  },
  plugins: [],
};
