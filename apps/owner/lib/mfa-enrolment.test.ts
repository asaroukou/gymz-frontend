import { describe, expect, it, vi } from 'vitest';

import {
  enrolmentReducer,
  finalizeAndSignOut,
  INITIAL_ENROLMENT,
  startEnrolment,
  verifyAndFinalize,
  type EnrolmentDeps,
  type EnrolmentEvent,
  type EnrolmentState,
} from './mfa-enrolment';

const setup = { secret: 'S', otpauthUri: 'otpauth://totp/x' };
const run = (events: EnrolmentEvent[], from: EnrolmentState = INITIAL_ENROLMENT) =>
  events.reduce(enrolmentReducer, from);
const named = (name: string, message = '') => Object.assign(new Error(message), { name });

describe('enrolmentReducer', () => {
  it('walks the happy path', () => {
    const s = run([
      { type: 'setupLoaded', setup },
      { type: 'continue' },
      { type: 'submit' },
      { type: 'done' },
    ]);
    expect(s.step).toBe('done');
    expect(s.setup).toBe(setup);
  });

  it('goes back to the QR with the same secret', () => {
    const s = run([{ type: 'setupLoaded', setup }, { type: 'continue' }, { type: 'back' }]);
    expect(s.step).toBe('setup');
    expect(s.setup).toBe(setup);
  });

  it('returns to verify with the reason and a fresh attempt on a rejected code', () => {
    const s = run([
      { type: 'setupLoaded', setup },
      { type: 'continue' },
      { type: 'submit' },
      { type: 'codeRejected', reason: 'invalid' },
    ]);
    expect(s).toMatchObject({ step: 'verify', codeError: 'invalid', attempt: 1 });
  });

  it('clears the code error on the next submit', () => {
    const s = run([
      { type: 'setupLoaded', setup },
      { type: 'continue' },
      { type: 'submit' },
      { type: 'codeRejected', reason: 'invalid' },
      { type: 'submit' },
    ]);
    expect(s).toMatchObject({ step: 'finalizing', codeError: null });
  });

  it('retries finalize from its own error state', () => {
    const s = run([
      { type: 'setupLoaded', setup },
      { type: 'continue' },
      { type: 'submit' },
      { type: 'finalizeFailed' },
    ]);
    expect(s.step).toBe('finalizeError');
    expect(enrolmentReducer(s, { type: 'retryFinalize' }).step).toBe('finalizing');
  });

  it('retries a failed setup', () => {
    const s = run([{ type: 'setupFailed' }]);
    expect(s.step).toBe('setupError');
    expect(run([{ type: 'retrySetup' }], s).step).toBe('loading');
  });

  it('goes straight to finalizing when TOTP is already enabled', () => {
    const s = run([{ type: 'alreadyEnabled' }]);
    expect(s).toMatchObject({ step: 'finalizing', setup: null });
    expect(
      run([{ type: 'finalizeFailed' }, { type: 'retryFinalize' }, { type: 'done' }], s).step,
    ).toBe('done');
  });

  it('ignores alreadyEnabled outside loading', () => {
    const setupStep = run([{ type: 'setupLoaded', setup }]);
    const verifyStep = run([{ type: 'continue' }], setupStep);
    const errorStep = run([{ type: 'setupFailed' }]);
    const doneStep = run([{ type: 'alreadyEnabled' }, { type: 'done' }]);
    for (const s of [setupStep, verifyStep, errorStep, doneStep]) {
      expect(enrolmentReducer(s, { type: 'alreadyEnabled' })).toBe(s);
    }
  });

  it('ignores events that do not apply to the current step', () => {
    const s = run([{ type: 'setupLoaded', setup }]);
    expect(run([{ type: 'done' }, { type: 'retryFinalize' }, { type: 'back' }], s)).toEqual(s);
  });
});

const deps = (overrides: Partial<EnrolmentDeps> = {}): EnrolmentDeps => ({
  confirmTotpSetup: vi.fn().mockResolvedValue(undefined),
  finalize: vi.fn().mockResolvedValue(undefined),
  signOut: vi.fn(),
  ...overrides,
});

describe('verifyAndFinalize', () => {
  it('confirms, finalizes, then signs out', async () => {
    const d = deps();
    await expect(verifyAndFinalize(d, '123456')).resolves.toEqual({ ok: true });
    expect(d.confirmTotpSetup).toHaveBeenCalledWith('123456');
    const order = [
      vi.mocked(d.confirmTotpSetup).mock.invocationCallOrder[0]!,
      vi.mocked(d.finalize).mock.invocationCallOrder[0]!,
      vi.mocked(d.signOut).mock.invocationCallOrder[0]!,
    ];
    expect([...order].sort((a, b) => a - b)).toEqual(order);
  });

  it('stops at the code on a mismatch, without finalizing', async () => {
    const d = deps({
      confirmTotpSetup: vi.fn().mockRejectedValue(named('EnableSoftwareTokenMFAException')),
    });
    await expect(verifyAndFinalize(d, '999999')).resolves.toEqual({
      ok: false,
      stage: 'code',
      reason: 'invalid',
    });
    expect(d.finalize).not.toHaveBeenCalled();
    expect(d.signOut).not.toHaveBeenCalled();
  });

  it('reports an expired session at the code stage', async () => {
    const d = deps({ confirmTotpSetup: vi.fn().mockRejectedValue(named('NotSignedInError')) });
    await expect(verifyAndFinalize(d, '123456')).resolves.toEqual({
      ok: false,
      stage: 'code',
      reason: 'expired',
    });
  });

  it('reports a finalize failure without signing out', async () => {
    const d = deps({ finalize: vi.fn().mockRejectedValue(new Error('500')) });
    await expect(verifyAndFinalize(d, '123456')).resolves.toEqual({
      ok: false,
      stage: 'finalize',
    });
    expect(d.signOut).not.toHaveBeenCalled();
  });
});

describe('finalizeAndSignOut', () => {
  it('retries finalize alone', async () => {
    const d = deps();
    await expect(finalizeAndSignOut(d)).resolves.toEqual({ ok: true });
    expect(d.confirmTotpSetup).not.toHaveBeenCalled();
    expect(d.finalize).toHaveBeenCalledTimes(1);
    expect(d.signOut).toHaveBeenCalledTimes(1);
  });
});

describe('startEnrolment', () => {
  const client = (overrides: { isTotpEnabled?: () => Promise<boolean> } = {}) => ({
    isTotpEnabled: vi.fn(overrides.isTotpEnabled ?? (() => Promise.resolve(false))),
    startTotpSetup: vi.fn().mockResolvedValue(setup),
  });

  it('issues a secret when TOTP is not enabled yet', async () => {
    const c = client();
    await expect(startEnrolment(c)).resolves.toEqual({ kind: 'setup', setup });
    expect(c.isTotpEnabled.mock.invocationCallOrder[0]).toBeLessThan(
      c.startTotpSetup.mock.invocationCallOrder[0]!,
    );
  });

  it('never issues a new secret when TOTP is already enabled', async () => {
    const c = client({ isTotpEnabled: () => Promise.resolve(true) });
    await expect(startEnrolment(c)).resolves.toEqual({ kind: 'enabled' });
    expect(c.startTotpSetup).not.toHaveBeenCalled();
  });

  it('rejects without issuing a secret when the status check fails', async () => {
    const c = client({ isTotpEnabled: () => Promise.reject(new Error('network')) });
    await expect(startEnrolment(c)).rejects.toThrow('network');
    expect(c.startTotpSetup).not.toHaveBeenCalled();
  });

  it('passes an expired session through for the caller to send to sign-in', async () => {
    const c = client({ isTotpEnabled: () => Promise.reject(named('NotSignedInError')) });
    await expect(startEnrolment(c)).rejects.toMatchObject({ name: 'NotSignedInError' });
  });
});
