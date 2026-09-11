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
      // Each weight is a distinct loaded font file (RN does not synthesize
      // weights from a single family), so weights are addressed by family name,
      // not the fontWeight utility. Keys avoid the `font-medium`/`font-semibold`
      // fontWeight collisions by prefixing with the family.
      fontFamily: {
        sans: ['HankenGrotesk_400Regular'],
        'sans-medium': ['HankenGrotesk_500Medium'],
        'sans-semibold': ['HankenGrotesk_600SemiBold'],
        'sans-bold': ['HankenGrotesk_700Bold'],
        mono: ['GeistMono_400Regular'],
        'mono-medium': ['GeistMono_500Medium'],
      },
    },
  },
  plugins: [],
};
