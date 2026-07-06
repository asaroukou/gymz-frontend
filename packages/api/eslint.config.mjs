import base from '@iziwellpass/config/eslint/base';

export default [
  ...base,
  {
    // Generated code: keep lint honest but allow generator idioms.
    files: ['src/generated/**'],
    // orval emits eslint-disable-next-line @typescript-eslint/no-redeclare above every
    // const-enum pair (type + const of the same name); whether that rule actually fires
    // depends on plugin/config versions, so treat the directive as generator noise rather
    // than flag it as unused. Narrowest possible scope: this override block only.
    linterOptions: { reportUnusedDisableDirectives: false },
    rules: {
      '@typescript-eslint/no-explicit-any': 'off',
    },
  },
];
