const { colors, radius } = require('./lib/theme');

/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./app/**/*.{ts,tsx}', './components/**/*.{ts,tsx}'],
  presets: [require('nativewind/preset')],
  theme: {
    extend: {
      colors: {
        background: colors.background,
        foreground: colors.foreground,
        border: colors.border,
        neutral: colors.neutral,
        primary: colors.primary,
        destructive: colors.destructive,
        success: colors.success,
        warning: colors.warning,
        info: colors.info,
      },
      borderRadius: { DEFAULT: `${radius.DEFAULT}px`, xl: `${radius.xl}px`, pill: '9999px' },
    },
  },
  plugins: [],
};
