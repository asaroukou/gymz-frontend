import { z } from 'zod';

/**
 * Matches the Cognito user pool password policy exactly (see
 * `gymz/cdk/lib/constructs/cognito.ts`): minLength 12, requireLowercase,
 * requireUppercase, requireDigits, requireSymbols: false. Shared between
 * signup (new account) and login's new-password challenge form so both
 * reject a password before it round-trips to Cognito and comes back as a
 * generic `InvalidPasswordException`.
 */
export const passwordSchema = z
  .string()
  .min(12, 'At least 12 characters')
  .regex(/[a-z]/, 'At least one lowercase letter')
  .regex(/[A-Z]/, 'At least one uppercase letter')
  .regex(/\d/, 'At least one digit');

/** Helper text listing the requirements, for display under the password input. */
export const PASSWORD_REQUIREMENTS_TEXT =
  'At least 12 characters, with one lowercase letter, one uppercase letter, and one digit.';
