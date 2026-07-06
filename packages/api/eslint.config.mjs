import base from '@iziwellpass/config/eslint/base';

export default [
  ...base,
  {
    // Generated code: keep lint honest but allow generator idioms.
    files: ['src/generated/**'],
    rules: {
      '@typescript-eslint/no-explicit-any': 'off',
    },
  },
];
