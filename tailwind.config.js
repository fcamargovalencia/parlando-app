/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './app/**/*.{ts,tsx}',
    './src/**/*.{ts,tsx}',
  ],
  presets: [require('nativewind/preset')],
  theme: {
    extend: {
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
        dark: {
          DEFAULT: '#1a1a2e',
          100: '#16213e',
          200: '#0f3460',
        },
        surface: {
          DEFAULT: '#FFFFFF',
          muted: '#F5F5F5',
          elevated: '#FAFAFA',
        },
      },
      fontFamily: {
        sans: ['System'],
      },
      borderRadius: {
        '2xl': '16px',
        '3xl': '24px',
      },
    },
  },
  plugins: [],
};
