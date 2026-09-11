import { describe, expect, it } from 'vitest';
import { credentialsSchema, newPasswordSchema } from './login-schema';

describe('credentialsSchema', () => {
  it('rejects an invalid email', () => {
    expect(credentialsSchema.safeParse({ email: 'nope', password: 'x' }).success).toBe(false);
  });
  it('accepts a valid pair', () => {
    expect(credentialsSchema.safeParse({ email: 'a@b.co', password: 'secret' }).success).toBe(
      true,
    );
  });
});

describe('newPasswordSchema', () => {
  it('requires 8+ chars and matching confirmation', () => {
    expect(
      newPasswordSchema.safeParse({ newPassword: 'short', confirmPassword: 'short' }).success,
    ).toBe(false);
    expect(
      newPasswordSchema.safeParse({ newPassword: 'longenough', confirmPassword: 'different' })
        .success,
    ).toBe(false);
    expect(
      newPasswordSchema.safeParse({ newPassword: 'longenough', confirmPassword: 'longenough' })
        .success,
    ).toBe(true);
  });
});
