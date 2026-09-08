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
        ink: {
          DEFAULT: '#0C1219',
          950: '#000000',
          900: '#0A0A0B',
          850: '#121214',
          800: '#161618',
          700: '#1C1C1E',
          600: '#222225',
          500: '#2A2A2E',
          2: '#131B24',
        },
        brass: {
          DEFAULT: '#C9A15A',
          300: '#E2C98F',
          400: '#D6B574',
          500: '#C9A15A',
          600: '#A98443',
          700: '#8A6C36',
        },
        stamp: '#B5493A',
        parchment: '#F1ECE1',
        steel: '#8B93A0',
        amber: {
          accent: '#F59E0B',
        },
        crimson: {
          accent: '#DC2626',
        },
        /**
         * §Phase 5 — semantic state colours (design-system foundation).
         * These are the ONLY semantic colours the canonical kit should use;
         * they map to machine-readable statuses, not decoration.
         */
        state: {
          success: '#2FBF71',
          warning: '#F2A93B',
          danger: '#E5533F',
          info: '#6AA6FF',
          muted: '#8A93A0',
        },
        /**
         * §Phase 5 — surface elevation scale (dark theme). Lower = further away.
         */
        surface: {
          DEFAULT: '#121214',
          raised: '#161618',
          overlay: '#1C1C1E',
          hover: '#222225',
        },
      },
      borderRadius: {
        /**
         * §Phase 5 — deliberate radius scale.
         */
        ds: {
          sm: '6px',
          md: '10px',
          lg: '14px',
          pill: '9999px',
        },
      },
      boxShadow: {
        /**
         * §Phase 5 — minimal intentional elevation system.
         */
        'ds-none': 'none',
        'ds-subtle': '0 1px 2px rgba(0,0,0,0.5)',
        'ds-raised': '0 4px 16px rgba(0,0,0,0.45)',
        'ds-overlay': '0 12px 40px rgba(0,0,0,0.6)',
        'ds-focus': '0 0 0 2px rgba(201,161,90,0.45)',
        'ds-focus-danger': '0 0 0 2px rgba(229,83,63,0.5)',
      },
      transitionProperty: {
        ds: 'background-color, border-color, color, box-shadow, opacity, transform',
      },
    },
  },
  plugins: [],
};
