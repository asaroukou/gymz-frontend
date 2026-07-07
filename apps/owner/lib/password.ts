import { z } from 'zod';

/**
 * Matches the Cognito user pool password policy exactly (see
 * `gymz/cdk/lib/constructs/cognito.ts`): minLength 12, requireLowercase,
 * requireUppercase, requireDigits, requireSymbols: false. Shared between
 * signup (new account) and login's new-password challenge form so both
 * reject a password before it round-trips to Cognito and comes back as a
 * generic `InvalidPasswordException`.
 */

/**
 * The single source of truth for the password policy. Both the live checklist
 * (see `components/password-checklist.tsx`) and the zod schema below iterate
 * this same list, so the two can never drift: editing a rule here changes
 * validation and the checklist together. Order is display order
 * (length → uppercase → lowercase → digit) and drives which message surfaces
 * first on submit. Each `key` also resolves to an i18n label under
 * `auth.passwordChecklist`.
 */
export const PASSWORD_RULES = [
  { key: 'length', test: (value: string) => value.length >= 12 },
  { key: 'uppercase', test: (value: string) => /[A-Z]/.test(value) },
  { key: 'lowercase', test: (value: string) => /[a-z]/.test(value) },
  { key: 'digit', test: (value: string) => /\d/.test(value) },
] as const;

export type PasswordRuleKey = (typeof PASSWORD_RULES)[number]['key'];

/** Localized validation messages, one per {@link PASSWORD_RULES} entry. */
export type PasswordMessages = Record<PasswordRuleKey, string>;

/**
 * Builds the password zod schema by iterating {@link PASSWORD_RULES} in a single
 * `superRefine` — each failing rule adds its (translated) message as an issue,
 * in list order, so the first unmet rule surfaces first. Reusing the same
 * predicates the checklist renders means the schema and checklist can't drift.
 * `superRefine` keeps the base `z.string()` type, so callers infer `string`.
 */
export function makePasswordSchema(messages: PasswordMessages) {
  return z.string().superRefine((value, ctx) => {
    for (const rule of PASSWORD_RULES) {
      if (!rule.test(value)) {
        ctx.addIssue(messages[rule.key]);
      }
    }
  });
}
