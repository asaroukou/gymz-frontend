// « Le comptoir clair » tokens for React Native (hex; RN OKLCH is unreliable).
// Pinned to packages/ui/src/styles/globals.css by theme.test.ts.
// Single source of truth: tailwind.config.js consumes these objects.
const ink = '#1f1f1f';

export const colors = {
  ink,
  inkHover: '#333333',
  background: '#ffffff',
  side: '#fafafa',
  secondary: '#eceef2',
  muted: '#5f6368',
  mutedStrong: '#4d5156',
  border: '#dcdcdc',
  danger: '#b23a2a',
  wash: '#dfe8fa',
  white: '#ffffff',
  success: { DEFAULT: '#e9f3ee', foreground: '#1d5c3c' },
  warning: { DEFAULT: '#fbf1dc', foreground: '#7a5c10' },
  destructive: { DEFAULT: '#fbe9e7', foreground: '#8f2f22' },
  info: { DEFAULT: '#e8eefb', foreground: '#2c4f8a' },
  tint: {
    bleu: '#e8eefb',
    vert: '#e9f3ee',
    sable: '#fbf1dc',
    rose: '#f6ecf2',
    lavande: '#eee9f8',
  },
} as const;

export const radius = { field: 12, card: 16, panel: 24, pill: 999 } as const;

export const fonts = {
  regular: 'Inter_400Regular',
  medium: 'Inter_500Medium',
  semibold: 'Inter_600SemiBold',
} as const;

export type Theme = typeof colors;
