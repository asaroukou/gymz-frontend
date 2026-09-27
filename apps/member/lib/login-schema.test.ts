import { describe, expect, it } from 'vitest';
import { credentialsSchema, newPasswordSchema } from './login-schema';

describe('credentialsSchema', () => {
  it('rejects an invalid email', () => {
    expect(credentialsSchema.safeParse({ email: 'nope', password: 'x' }).success).toBe(false);
  });
  it('accepts a valid pair', () => {
    expect(credentialsSchema.safeParse({ email: 'a@b.co', password: 'secret' }).success).toBe(true);
  });
});

describe('newPasswordSchema', () => {
  it('enforces the password policy', () => {
    const r = newPasswordSchema.safeParse({ newPassword: 'longenough', confirmPassword: 'longenough' });
    expect(r.success).toBe(false);
    expect(r.error?.issues[0]?.message).toBe('policy');
  });
  it('requires a matching confirmation', () => {
    const r = newPasswordSchema.safeParse({ newPassword: 'Motdepasse12', confirmPassword: 'Motdepasse13' });
    expect(r.success).toBe(false);
    expect(r.error?.issues[0]?.message).toBe('mismatch');
  });
  it('accepts a valid pair', () => {
    expect(
      newPasswordSchema.safeParse({ newPassword: 'Motdepasse12', confirmPassword: 'Motdepasse12' }).success,
    ).toBe(true);
  });
});
