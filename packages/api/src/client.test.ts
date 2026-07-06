import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ApiError, configureApi, customFetch, unwrap } from './client';

const jsonResponse = (status: number, body: unknown) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json' },
  });

describe('customFetch', () => {
  beforeEach(() => {
    configureApi({ baseUrl: 'https://api.test/v1', getToken: () => Promise.resolve(null) });
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

describe('unwrap', () => {
  it('returns the data field of an envelope', () => {
    expect(unwrap({ data: 42, request_id: 'r' })).toBe(42);
  });
});
