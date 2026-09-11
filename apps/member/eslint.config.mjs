import baseConfig from '@iziwellpass/config/eslint/base';

// metro.config.js, babel.config.js, and tailwind.config.js must stay CommonJS:
// Metro, Babel, and Tailwind/NativeWind load them via `require()` before any
// transpilation runs.
export default [
  ...baseConfig,
  {
    files: ['metro.config.js', 'babel.config.js', 'tailwind.config.js'],
    rules: { '@typescript-eslint/no-require-imports': 'off' },
  },
];
