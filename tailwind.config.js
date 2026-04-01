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
          50: '#E0F2F3',
          100: '#B3E0E3',
          200: '#80CCD2',
          300: '#4DB8C1',
          400: '#26A9B4',
          500: '#007380',
          600: '#006670',
          700: '#005660',
          800: '#004650',
          900: '#003040',
        },
        accent: {
          50: '#FFF0EC',
          100: '#FFD9CF',
          200: '#FFBFAF',
          300: '#FFA58F',
          400: '#FF9277',
          500: '#FF7F60',
          600: '#E86E52',
          700: '#D15D44',
          800: '#BA4C36',
          900: '#A33B28',
        },
        surface: {
          muted: '#FAFAFA',
        },
      },
    },
  },
  plugins: [],
};
