/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        navy: {
          50: '#f3f6fa',
          100: '#e3e9f1',
          200: '#c3cfdf',
          300: '#94a8c2',
          400: '#5f7a9e',
          500: '#3d5a80',
          600: '#2a4161',
          700: '#1b2f49',
          800: '#12233a',
          900: '#0b1b2e',
        },
        gold: {
          50: '#fdf8ea',
          100: '#fbefc7',
          200: '#f8e08f',
          300: '#f0cb5f',
          400: '#d9ae45',
          500: '#c9a24b',
          600: '#9a7410',
          700: '#7a5c00',
          800: '#5e4600',
          900: '#3f2f00',
        },
        surface: '#f7f9fb',
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        serif: ['"Playfair Display"', 'Georgia', 'serif'],
      },
      boxShadow: {
        card: '0 1px 2px rgba(11,27,46,0.04), 0 4px 16px rgba(11,27,46,0.06)',
        lift: '0 8px 30px rgba(11,27,46,0.12)',
      },
    },
  },
  plugins: [],
};
