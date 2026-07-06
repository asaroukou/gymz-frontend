import { describe, expect, it } from 'vitest';
import { ApiError } from './client';
import { createQueryClient } from './provider';

describe('createQueryClient', () => {
  it('does not retry 4xx ApiErrors', () => {
    const client = createQueryClient();
    const retry = client.getDefaultOptions().queries?.retry;
    expect(typeof retry).toBe('function');
    const retryFn = retry as (failureCount: number, error: unknown) => boolean;
    const forbidden = new ApiError(403, { code: 'FORBIDDEN', message: 'no' });
    expect(retryFn(0, forbidden)).toBe(false);
  });

  it('retries 5xx/network errors up to 2 times', () => {
    const client = createQueryClient();
    const retryFn = client.getDefaultOptions().queries?.retry as (
      failureCount: number,
      error: unknown,
    ) => boolean;
    const flaky = new ApiError(502, { code: 'UNKNOWN', message: 'bad gateway' });
    expect(retryFn(0, flaky)).toBe(true);
    expect(retryFn(1, flaky)).toBe(true);
    expect(retryFn(2, flaky)).toBe(false);
  });

  it('sets a 30s default staleTime', () => {
    const client = createQueryClient();
    expect(client.getDefaultOptions().queries?.staleTime).toBe(30_000);
  });
});
