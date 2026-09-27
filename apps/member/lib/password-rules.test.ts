import { describe, expect, it } from 'vitest';
import { meetsPasswordPolicy, passwordChecks } from './password-rules';

describe('password policy (Cognito: 12+, upper, lower, digit)', () => {
  it('reports each rule in display order', () => {
    expect(passwordChecks('abc')).toEqual([
      { key: 'length', met: false },
      { key: 'uppercase', met: false },
      { key: 'lowercase', met: true },
      { key: 'digit', met: false },
    ]);
  });
  it('accepts only a password meeting all four rules', () => {
    expect(meetsPasswordPolicy('Motdepasse12')).toBe(true);
    expect(meetsPasswordPolicy('motdepasse12')).toBe(false);
    expect(meetsPasswordPolicy('MOTDEPASSE12')).toBe(false);
    expect(meetsPasswordPolicy('Motdepasseee')).toBe(false);
    expect(meetsPasswordPolicy('Motdepas12')).toBe(false);
  });
});
