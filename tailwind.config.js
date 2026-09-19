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
      borderRadius: {
        ds: {
          sm: '6px',
          md: '10px',
          lg: '14px',
          pill: '9999px',
        },
      },
      boxShadow: {
        'ds-none': 'none',
        'ds-subtle': 'var(--mr-shadow-subtle)',
        'ds-raised': 'var(--mr-shadow-raised)',
        'ds-overlay': 'var(--mr-shadow-overlay)',
        'ds-focus': '0 0 0 2px var(--mr-focus)',
        'ds-focus-danger': '0 0 0 2px rgba(229,83,63,0.5)',
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
