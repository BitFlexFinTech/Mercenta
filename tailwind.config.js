/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
      colors: {
        ink: {
          950: '#000000',
          900: '#0A0A0B',
          850: '#121214',
          800: '#161618',
          700: '#1C1C1E',
          600: '#222225',
          500: '#2A2A2E',
        },
        neon: {
          DEFAULT: '#A855F7',
          400: '#C084FC',
          500: '#A855F7',
          600: '#9333EA',
          700: '#7E22CE',
        },
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
