/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './app/**/*.{js,ts,jsx,tsx}',
    './src/**/*.{js,ts,jsx,tsx}',
  ],
  presets: [require('nativewind/preset')],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Roboto', 'ui-sans-serif', 'system-ui'],
      },
      fontSize: {
        xs: '0.875rem', // 14px + 3px
        sm: '1rem',     // 16px + 3px
        base: '1.125rem', // 18px + 3px
        lg: '1.25rem',  // 20px + 3px
        xl: '1.5rem',   // 24px + 3px
        '2xl': '1.875rem', // 30px + 3px
        '3xl': '2.25rem',  // 36px + 3px
        '4xl': '3rem',     // 48px + 3px
      },
      colors: {
        primary: {
          50: '#E6F6F8',
          100: '#B3E0E3',
          200: '#80C9CE',
          300: '#4DB3B9',
          400: '#269CA3',
          500: '#00738A',
          600: '#005660',
          700: '#003040',
        },
        accent: {
          50: '#FFF7E6',
          100: '#FFE0B3',
          200: '#FFD180',
          300: '#FFC24D',
          400: '#FFB300',
          500: '#FF9800',
          600: '#FF6F00',
        },
      },
    },
  },
  plugins: [],
};
