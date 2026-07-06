import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ApiError, configureApi, customFetch, unwrap } from './client';

const jsonResponse = (status: number, body: unknown) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json' },
  });

describe('customFetch', () => {
  beforeEach(() => {
    configureApi({
      baseUrl: 'https://api.test/v1',
      getToken: () => Promise.resolve(null),
      onUnauthorized: undefined,
    });
    vi.stubGlobal('fetch', vi.fn());
  });
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('prefixes the base url and returns the parsed envelope', async () => {
    vi.mocked(fetch).mockResolvedValue(jsonResponse(200, { data: { id: 'v1' }, request_id: 'r1' }));
    const res = await customFetch<{ data: { id: string }; request_id: string }>(
      '/gms/v1/venues/v1',
      { method: 'GET' },
    );
    expect(vi.mocked(fetch).mock.calls[0]?.[0]).toBe('https://api.test/v1/gms/v1/venues/v1');
    expect(res.data.id).toBe('v1');
  });

  it('sends the bearer token when the getter returns one', async () => {
    configureApi({ baseUrl: 'https://api.test/v1', getToken: () => Promise.resolve('tok-123') });
    vi.mocked(fetch).mockResolvedValue(jsonResponse(200, { data: [], request_id: 'r' }));
    await customFetch('/gms/v1/staff', { method: 'GET' });
    const headers = new Headers(vi.mocked(fetch).mock.calls[0]?.[1]?.headers);
    expect(headers.get('authorization')).toBe('Bearer tok-123');
  });

  it('sends no auth header when the getter returns null', async () => {
    vi.mocked(fetch).mockResolvedValue(jsonResponse(200, { data: [], request_id: 'r' }));
    await customFetch('/health', { method: 'GET' });
    const headers = new Headers(vi.mocked(fetch).mock.calls[0]?.[1]?.headers);
    expect(headers.get('authorization')).toBeNull();
  });

  it('throws a typed ApiError on an error envelope', async () => {
    vi.mocked(fetch).mockResolvedValue(
      jsonResponse(403, {
        error: { code: 'FORBIDDEN', message: 'Role lacks permission' },
        request_id: 'req-9',
      }),
    );
    const err = await customFetch('/gms/v1/staff', { method: 'GET' }).catch((e: unknown) => e);
    expect(err).toBeInstanceOf(ApiError);
    const apiErr = err as ApiError;
    expect(apiErr.status).toBe(403);
    expect(apiErr.code).toBe('FORBIDDEN');
    expect(apiErr.requestId).toBe('req-9');
  });

  it('throws ApiError with UNKNOWN code on a non-JSON error body', async () => {
    vi.mocked(fetch).mockResolvedValue(new Response('gateway timeout', { status: 504 }));
    const err = await customFetch('/health', { method: 'GET' }).catch((e: unknown) => e);
    expect(err).toBeInstanceOf(ApiError);
    expect((err as ApiError).code).toBe('UNKNOWN');
    expect((err as ApiError).status).toBe(504);
  });

  it('sends no content-type header for a bodyless GET', async () => {
    vi.mocked(fetch).mockResolvedValue(jsonResponse(200, { data: [], request_id: 'r' }));
    await customFetch('/gms/v1/venues', { method: 'GET' });
    const headers = new Headers(vi.mocked(fetch).mock.calls[0]?.[1]?.headers);
    expect(headers.get('content-type')).toBeNull();
  });

  it('merges configureApi partially, preserving prior fields not passed again', async () => {
    configureApi({ baseUrl: 'https://api.test/v1', getToken: () => Promise.resolve('tok-A') });
    configureApi({ baseUrl: 'https://other.test' });
    vi.mocked(fetch).mockResolvedValue(jsonResponse(200, { data: [], request_id: 'r' }));
    await customFetch('/gms/v1/staff', { method: 'GET' });
    expect(vi.mocked(fetch).mock.calls[0]?.[0]).toBe('https://other.test/gms/v1/staff');
    const headers = new Headers(vi.mocked(fetch).mock.calls[0]?.[1]?.headers);
    expect(headers.get('authorization')).toBe('Bearer tok-A');
  });

  it('preserves an explicit content-type header instead of overwriting it', async () => {
    vi.mocked(fetch).mockResolvedValue(jsonResponse(200, { data: null, request_id: 'r' }));
    await customFetch('/x', {
      method: 'POST',
      body: 'raw',
      headers: { 'content-type': 'text/plain' },
    });
    const headers = new Headers(vi.mocked(fetch).mock.calls[0]?.[1]?.headers);
    expect(headers.get('content-type')).toBe('text/plain');
  });

  it('resolves undefined on a 204 No Content response', async () => {
    vi.mocked(fetch).mockResolvedValue(new Response(null, { status: 204 }));
    const res = await customFetch('/gms/v1/staff/1', { method: 'DELETE' });
    expect(res).toBeUndefined();
  });
});

describe('customFetch 401 refresh-once interceptor', () => {
  beforeEach(() => {
    configureApi({
      baseUrl: 'https://api.test/v1',
      getToken: () => Promise.resolve('tok-old'),
      onUnauthorized: undefined,
    });
    vi.stubGlobal('fetch', vi.fn());
  });
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('retries once with the refreshed token when onUnauthorized resolves a token', async () => {
    const onUnauthorized = vi.fn().mockResolvedValue('tok-2');
    configureApi({ onUnauthorized });
    vi.mocked(fetch)
      .mockResolvedValueOnce(
        jsonResponse(401, {
          error: { code: 'UNAUTHORIZED', message: 'Expired' },
          request_id: 'r1',
        }),
      )
      .mockResolvedValueOnce(jsonResponse(200, { data: { ok: true }, request_id: 'r2' }));

    const res = await customFetch<{ data: { ok: boolean } }>('/gms/v1/staff', { method: 'GET' });

    expect(res.data.ok).toBe(true);
    expect(fetch).toHaveBeenCalledTimes(2);
    expect(onUnauthorized).toHaveBeenCalledTimes(1);
    const secondCallHeaders = new Headers(vi.mocked(fetch).mock.calls[1]?.[1]?.headers);
    expect(secondCallHeaders.get('authorization')).toBe('Bearer tok-2');
  });

  it('throws the original ApiError(401) after one call when onUnauthorized resolves null', async () => {
    const onUnauthorized = vi.fn().mockResolvedValue(null);
    configureApi({ onUnauthorized });
    vi.mocked(fetch).mockResolvedValue(
      jsonResponse(401, { error: { code: 'UNAUTHORIZED', message: 'Expired' }, request_id: 'r1' }),
    );

    const err = await customFetch('/gms/v1/staff', { method: 'GET' }).catch((e: unknown) => e);

    expect(err).toBeInstanceOf(ApiError);
    expect((err as ApiError).status).toBe(401);
    expect(fetch).toHaveBeenCalledTimes(1);
    expect(onUnauthorized).toHaveBeenCalledTimes(1);
  });

  it('throws when the retried request also 401s, without calling onUnauthorized again', async () => {
    const onUnauthorized = vi.fn().mockResolvedValue('tok-2');
    configureApi({ onUnauthorized });
    vi.mocked(fetch).mockResolvedValue(
      jsonResponse(401, {
        error: { code: 'UNAUTHORIZED', message: 'Still expired' },
        request_id: 'r1',
      }),
    );

    const err = await customFetch('/gms/v1/staff', { method: 'GET' }).catch((e: unknown) => e);

    expect(err).toBeInstanceOf(ApiError);
    expect((err as ApiError).status).toBe(401);
    expect(fetch).toHaveBeenCalledTimes(2);
    expect(onUnauthorized).toHaveBeenCalledTimes(1);
  });

  it('throws the ApiError on the first 401 without retrying when no onUnauthorized is configured', async () => {
    vi.mocked(fetch).mockResolvedValue(
      jsonResponse(401, { error: { code: 'UNAUTHORIZED', message: 'Expired' }, request_id: 'r1' }),
    );

    const err = await customFetch('/gms/v1/staff', { method: 'GET' }).catch((e: unknown) => e);

    expect(err).toBeInstanceOf(ApiError);
    expect((err as ApiError).status).toBe(401);
    expect(fetch).toHaveBeenCalledTimes(1);
  });
});

describe('unwrap', () => {
  it('returns the data field of an envelope', () => {
    expect(unwrap({ data: 42, request_id: 'r' })).toBe(42);
  });
});
