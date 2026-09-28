import { describe, expect, it, vi } from 'vitest';

import { onceAsync, singleFlight } from './async-guards';

const deferred = <T>() => {
  let resolve!: (v: T) => void;
  let reject!: (e: unknown) => void;
  const promise = new Promise<T>((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
};

describe('singleFlight', () => {
  it('shares one call while it is in flight', async () => {
    const d = deferred<string>();
    const fn = vi.fn<(code: string) => Promise<string>>(() => d.promise);
    const run = singleFlight(fn);
    const a = run('123456');
    const b = run('123456');
    d.resolve('ok');
    await expect(a).resolves.toBe('ok');
    await expect(b).resolves.toBe('ok');
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it('allows a new call once the previous one settled, even after a failure', async () => {
    const fn = vi.fn().mockRejectedValueOnce(new Error('x')).mockResolvedValueOnce('ok');
    const run = singleFlight(fn);
    await expect(run()).rejects.toThrow('x');
    await expect(run()).resolves.toBe('ok');
    expect(fn).toHaveBeenCalledTimes(2);
  });
});

describe('onceAsync', () => {
  it('returns the same promise to every caller after success', async () => {
    const fn = vi.fn().mockResolvedValue({ secret: 'S' });
    const load = onceAsync(fn);
    const a = load();
    const b = load();
    expect(a).toBe(b);
    await a;
    await load();
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it('forgets a rejection so the next call retries', async () => {
    const fn = vi.fn().mockRejectedValueOnce(new Error('down')).mockResolvedValueOnce('ok');
    const load = onceAsync(fn);
    await expect(load()).rejects.toThrow('down');
    await expect(load()).resolves.toBe('ok');
    expect(fn).toHaveBeenCalledTimes(2);
  });
});
