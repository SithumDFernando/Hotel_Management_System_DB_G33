/** @type {import('tailwindcss').Config} */
// Tokens from docs/specs/11_design_system.md §2–§4. `colors`, `fontFamily` and `borderRadius`
// REPLACE the Tailwind defaults so off-palette classes (emerald-*, rounded-2xl…) produce no CSS.
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    colors: {
      transparent: 'transparent',
      current: 'currentColor',
      white: '#FFFFFF',
      black: '#000000',
      ink: { 900: '#17201B', 600: '#4A554F', 300: '#A9B2AC', 100: '#E4E7E3' },
      paper: { 50: '#FFFFFF', 100: '#F7F5EF', 200: '#EEEBE3' },
      // tea-300 is only for a third chart series (spec 11 §6).
      tea: { 900: '#173A2B', 700: '#24513D', 500: '#3D7A5C', 300: '#9CC2AD', 100: '#E3EEE7' },
      signal: { 700: '#B3261E', 100: '#FBE9E7' },
    },
    fontFamily: {
      sans: ['Inter', 'system-ui', 'sans-serif'],
      display: ['"Source Serif 4"', 'Georgia', 'serif'],
    },
    borderRadius: {
      none: '0',
      sm: '4px',
      DEFAULT: '6px',
      md: '6px',
      lg: '10px',
      full: '9999px',
    },
    extend: {
      // A bare `border` (or one whose old navy-* colour no longer exists) is a hairline, not currentColor.
      borderColor: { DEFAULT: '#E4E7E3' },
      boxShadow: { overlay: '0 8px 24px rgba(23,32,27,.12)' },
      fontSize: { '2xs': ['12px', '16px'] },
      // Feedback motion only, 150ms (spec 11 §4); index.css switches it off under reduced motion.
      keyframes: {
        'toast-in': { from: { opacity: '0', transform: 'translateY(4px)' }, to: { opacity: '1', transform: 'none' } },
      },
      animation: { 'toast-in': 'toast-in 150ms ease-out' },
    },
  },
  plugins: [],
};
