import baseConfig from '@iziwellpass/config/eslint/base';

// metro.config.js and babel.config.js must stay CommonJS: Metro and Babel
// load them via `require()` before any transpilation runs.
export default [
  ...baseConfig,
  {
    files: ['metro.config.js', 'babel.config.js'],
    rules: { '@typescript-eslint/no-require-imports': 'off' },
  },
];
