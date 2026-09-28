/**
 * The Cognito pool password policy (members and staff share the pool; see
 * apps/owner/lib/password.ts): 12+ characters, an uppercase, a lowercase, a
 * digit. Display order = list order (spec M1).
 */
export const PASSWORD_RULES = [
  { key: 'length', test: (v: string) => v.length >= 12 },
  { key: 'uppercase', test: (v: string) => /[A-Z]/.test(v) },
  { key: 'lowercase', test: (v: string) => /[a-z]/.test(v) },
  { key: 'digit', test: (v: string) => /\d/.test(v) },
] as const;

export type PasswordRuleKey = (typeof PASSWORD_RULES)[number]['key'];

export function passwordChecks(value: string): { key: PasswordRuleKey; met: boolean }[] {
  return PASSWORD_RULES.map((r) => ({ key: r.key, met: r.test(value) }));
}

export function meetsPasswordPolicy(value: string): boolean {
  return PASSWORD_RULES.every((r) => r.test(value));
}
