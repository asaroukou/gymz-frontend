import { z } from 'zod';

/**
 * Matches the Cognito user pool password policy exactly (see
 * `gymz/cdk/lib/constructs/cognito.ts`): minLength 12, requireLowercase,
 * requireUppercase, requireDigits, requireSymbols: false. Shared between
 * signup (new account) and login's new-password challenge form so both
 * reject a password before it round-trips to Cognito and comes back as a
 * generic `InvalidPasswordException`.
 */

/** Localized validation messages for {@link makePasswordSchema}. */
export type PasswordMessages = {
  min: string;
  lowercase: string;
  uppercase: string;
  digit: string;
};

/**
 * Builds the password zod schema with caller-supplied (translated) messages.
 * The rules themselves are fixed to the Cognito policy above; only the copy is
 * injected so it can flow through next-intl.
 */
export function makePasswordSchema(messages: PasswordMessages) {
  return z
    .string()
    .min(12, messages.min)
    .regex(/[a-z]/, messages.lowercase)
    .regex(/[A-Z]/, messages.uppercase)
    .regex(/\d/, messages.digit);
}

/**
 * Ordered rules for the live password checklist. Each carries a stable i18n
 * key (resolved under `auth.passwordChecklist`) and the same predicate the
 * schema enforces, so the checklist and validation never drift.
 */
export const PASSWORD_RULES = [
  { key: 'length', test: (value: string) => value.length >= 12 },
  { key: 'uppercase', test: (value: string) => /[A-Z]/.test(value) },
  { key: 'lowercase', test: (value: string) => /[a-z]/.test(value) },
  { key: 'digit', test: (value: string) => /\d/.test(value) },
] as const;
