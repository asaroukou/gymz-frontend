const { colors, radius, fonts } = require('./lib/theme');

/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: 'class',
  content: ['./app/**/*.{ts,tsx}', './components/**/*.{ts,tsx}'],
  presets: [require('nativewind/preset')],
  theme: {
    extend: {
      colors: {
        ink: { DEFAULT: colors.ink, hover: colors.inkHover },
        background: colors.background,
        side: colors.side,
        secondary: colors.secondary,
        muted: colors.muted,
        'muted-strong': colors.mutedStrong,
        border: colors.border,
        danger: colors.danger,
        wash: colors.wash,
        success: colors.success,
        warning: colors.warning,
        destructive: colors.destructive,
        info: colors.info,
        tint: colors.tint,
      },
      borderRadius: {
        field: `${radius.field}px`,
        card: `${radius.card}px`,
        panel: `${radius.panel}px`,
        pill: `${radius.pill}px`,
      },
      // Each weight is its own loaded font file (RN does not synthesize weights),
      // so weights are addressed by family name, never by fontWeight.
      fontFamily: {
        sans: [fonts.regular],
        'sans-medium': [fonts.medium],
        'sans-semibold': [fonts.semibold],
      },
    },
  },
  plugins: [],
};
