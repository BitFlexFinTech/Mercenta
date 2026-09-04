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
      },
    },
  },
  plugins: [],
};
