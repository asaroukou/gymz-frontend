// DESIGN.md tokens ported OKLCH -> hex for React Native (RN OKLCH is unreliable).
// Single source of truth: tailwind.config.js consumes this object.
export const colors = {
  background: '#fffefd',
  foreground: '#1c1917',
  border: '#e7e5e4',
  neutral: {
    50: '#fafaf9',
    100: '#f5f5f4',
    200: '#e7e5e4',
    300: '#d6d3d1',
    400: '#a8a29e',
    500: '#78716c',
    600: '#57534e',
    700: '#44403c',
    800: '#292524',
    900: '#1c1917',
    950: '#0c0a09',
  },
  primary: { DEFAULT: '#0c3d22', hover: '#19482c', foreground: '#fafaf9' },
  destructive: { DEFAULT: '#dc2626', foreground: '#166534' },
  success: { DEFAULT: '#16a34a', foreground: '#166534' },
  warning: { DEFAULT: '#f59e0b', foreground: '#92400e' },
  info: { DEFAULT: '#2563eb', foreground: '#1d4ed8' },
} as const;

export const radius = { DEFAULT: 10, xl: 16, pill: 9999 } as const;

export type Theme = typeof colors;
