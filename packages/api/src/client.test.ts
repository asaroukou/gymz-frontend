import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  ApiError,
  configureApi,
  customFetch,
  unwrap,
  resolveBaseUrl,
  CONTROL_PLANE_PREFIXES,
  TOKEN_REJECTION_401_PATHS,
} from './client';

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

  it('does not run the refresh-and-retry flow on a pass check-in 401 (a rejected QR token, not an expired session)', async () => {
    const onUnauthorized = vi.fn().mockResolvedValue('tok-2');
    configureApi({ onUnauthorized });
    vi.mocked(fetch).mockResolvedValue(
      jsonResponse(401, {
        error: { code: 'UNAUTHORIZED', message: 'wrong-tenant token' },
        request_id: 'r1',
      }),
    );

    const err = await customFetch('/platform/v1/checkins/pass', { method: 'POST' }).catch(
      (e: unknown) => e,
    );

    expect(err).toBeInstanceOf(ApiError);
    expect((err as ApiError).status).toBe(401);
    expect(fetch).toHaveBeenCalledTimes(1);
    expect(onUnauthorized).not.toHaveBeenCalled();
  });

  it('still refreshes once and retries a 401 on a normal route (existing behaviour unaffected)', async () => {
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
  });
});

describe('unwrap', () => {
  it('returns the data field of an envelope', () => {
    expect(unwrap({ data: 42, request_id: 'r' })).toBe(42);
  });
});

describe('resolveBaseUrl', () => {
  const cfg = { baseUrl: 'https://app.test/v1', controlPlaneBaseUrl: 'https://ctrl.test/v1' };

  it('routes app-plane paths to baseUrl', () => {
    expect(resolveBaseUrl('/gms/v1/staff', cfg)).toBe('https://app.test/v1');
    expect(resolveBaseUrl('/platform/v1/pass/credits', cfg)).toBe('https://app.test/v1');
    expect(resolveBaseUrl('/platform/v1/marketplace/venues', cfg)).toBe('https://app.test/v1');
  });

  it('routes every control-plane prefix to controlPlaneBaseUrl', () => {
    expect(resolveBaseUrl('/platform/v1/auth/register-owner', cfg)).toBe('https://ctrl.test/v1');
    expect(resolveBaseUrl('/platform/v1/onboarding/venue', cfg)).toBe('https://ctrl.test/v1');
    expect(resolveBaseUrl('/platform/v1/admin/tenants', cfg)).toBe('https://ctrl.test/v1');
    expect(resolveBaseUrl('/platform/v1/billing/webhook', cfg)).toBe('https://ctrl.test/v1');
  });

  it('throws a descriptive error when a control-plane path has no configured base', () => {
    expect(() =>
      resolveBaseUrl('/platform/v1/onboarding/venue', { baseUrl: 'https://app.test/v1' }),
    ).toThrowError(/controlPlaneBaseUrl/);
  });

  it('covers exactly the five documented prefixes', () => {
    expect(CONTROL_PLANE_PREFIXES).toEqual([
      '/platform/v1/auth/',
      '/platform/v1/onboarding/',
      '/platform/v1/mfa/',
      '/platform/v1/admin/',
      '/platform/v1/billing/',
    ]);
  });

  it('covers exactly the pass check-in route as a token-rejection 401 path', () => {
    expect(TOKEN_REJECTION_401_PATHS).toEqual(['/platform/v1/checkins/pass']);
  });
});

describe('customFetch plane routing and empty bodies', () => {
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

  it('sends control-plane requests to the control-plane base', async () => {
    configureApi({
      baseUrl: 'https://app.test/v1',
      controlPlaneBaseUrl: 'https://ctrl.test/v1',
      getToken: () => Promise.resolve(null),
    });
    vi.mocked(fetch).mockResolvedValue(new Response(null, { status: 202 }));
    await customFetch('/platform/v1/auth/register-owner', { method: 'POST', body: '{}' });
    expect(vi.mocked(fetch).mock.calls[0]?.[0]).toBe(
      'https://ctrl.test/v1/platform/v1/auth/register-owner',
    );
  });

  it('resolves undefined for a success response with no body (202)', async () => {
    vi.mocked(fetch).mockResolvedValue(new Response(null, { status: 202 }));
    const res = await customFetch('/gms/v1/whatever', { method: 'POST', body: '{}' });
    expect(res).toBeUndefined();
  });

  it('retries a control-plane 401 against the control-plane base, not the app base', async () => {
    configureApi({
      baseUrl: 'https://app.test/v1',
      controlPlaneBaseUrl: 'https://ctrl.test/v1',
      getToken: () => Promise.resolve('stale-token'),
      onUnauthorized: () => Promise.resolve('fresh-token'),
    });
    vi.mocked(fetch)
      .mockResolvedValueOnce(
        jsonResponse(401, { error: { code: 'UNAUTHORIZED', message: 'expired' }, request_id: 'r' }),
      )
      .mockResolvedValueOnce(new Response(null, { status: 202 }));

    await customFetch('/platform/v1/onboarding/venue', { method: 'POST', body: '{}' });

    expect(fetch).toHaveBeenCalledTimes(2);
    expect(vi.mocked(fetch).mock.calls[0]?.[0]).toBe(
      'https://ctrl.test/v1/platform/v1/onboarding/venue',
    );
    expect(vi.mocked(fetch).mock.calls[1]?.[0]).toBe(
      'https://ctrl.test/v1/platform/v1/onboarding/venue',
    );
    const secondCallHeaders = new Headers(vi.mocked(fetch).mock.calls[1]?.[1]?.headers);
    expect(secondCallHeaders.get('authorization')).toBe('Bearer fresh-token');
  });

  it('forwards a fresh Idempotency-Key header on each call', async () => {
    configureApi({
      baseUrl: 'https://app.test/v1',
      controlPlaneBaseUrl: 'https://ctrl.test/v1',
      getToken: () => Promise.resolve(null),
    });
    vi.mocked(fetch).mockResolvedValue(new Response(null, { status: 202 }));

    await customFetch('/platform/v1/onboarding/venue', {
      method: 'POST',
      body: '{}',
      headers: { 'Idempotency-Key': 'key-one' },
    });
    await customFetch('/platform/v1/onboarding/venue', {
      method: 'POST',
      body: '{}',
      headers: { 'Idempotency-Key': 'key-two' },
    });

    const firstCallHeaders = new Headers(vi.mocked(fetch).mock.calls[0]?.[1]?.headers);
    const secondCallHeaders = new Headers(vi.mocked(fetch).mock.calls[1]?.[1]?.headers);
    expect(firstCallHeaders.get('idempotency-key')).toBe('key-one');
    expect(secondCallHeaders.get('idempotency-key')).toBe('key-two');
  });

  it('rejects with an error mentioning controlPlaneBaseUrl when the control plane is unconfigured', async () => {
    configureApi({
      baseUrl: 'https://app.test/v1',
      controlPlaneBaseUrl: undefined,
      getToken: () => Promise.resolve(null),
    });

    await expect(
      customFetch('/platform/v1/onboarding/venue', { method: 'POST', body: '{}' }),
    ).rejects.toThrow(/controlPlaneBaseUrl/);
    expect(fetch).not.toHaveBeenCalled();
  });
});

describe('MFA routing and gate', () => {
  beforeEach(() => {
    configureApi({
      baseUrl: 'https://api.test/v1',
      controlPlaneBaseUrl: 'https://control.test',
      getToken: () => Promise.resolve('tok'),
      onUnauthorized: undefined,
      onMfaRequired: undefined,
    });
    vi.stubGlobal('fetch', vi.fn());
  });
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  const error403 = (code: string) =>
    jsonResponse(403, { error: { code, message: 'nope' }, request_id: 'r' });

  it('routes /platform/v1/mfa/finalize to the control plane', () => {
    expect(CONTROL_PLANE_PREFIXES).toContain('/platform/v1/mfa/');
    expect(
      resolveBaseUrl('/platform/v1/mfa/finalize', {
        baseUrl: 'https://api.test',
        controlPlaneBaseUrl: 'https://control.test',
      }),
    ).toBe('https://control.test');
  });

  it('calls onMfaRequired once on 403 MFA_ENROLLMENT_REQUIRED and still throws', async () => {
    const onMfaRequired = vi.fn();
    configureApi({ onMfaRequired });
    vi.mocked(fetch).mockResolvedValue(error403('MFA_ENROLLMENT_REQUIRED'));
    await expect(customFetch('/gms/v1/venues', { method: 'GET' })).rejects.toMatchObject({
      status: 403,
      code: 'MFA_ENROLLMENT_REQUIRED',
    });
    expect(onMfaRequired).toHaveBeenCalledTimes(1);
  });

  it.each(['FEATURE_NOT_AVAILABLE', 'FORBIDDEN'])('ignores a 403 %s', async (code) => {
    const onMfaRequired = vi.fn();
    configureApi({ onMfaRequired });
    vi.mocked(fetch).mockResolvedValue(error403(code));
    await expect(customFetch('/gms/v1/venues', { method: 'GET' })).rejects.toBeInstanceOf(
      ApiError,
    );
    expect(onMfaRequired).not.toHaveBeenCalled();
  });

  it('ignores a 401 carrying the MFA code', async () => {
    const onMfaRequired = vi.fn();
    configureApi({ onMfaRequired });
    vi.mocked(fetch).mockResolvedValue(
      jsonResponse(401, { error: { code: 'MFA_ENROLLMENT_REQUIRED', message: 'x' } }),
    );
    await expect(customFetch('/gms/v1/venues', { method: 'GET' })).rejects.toBeInstanceOf(
      ApiError,
    );
    expect(onMfaRequired).not.toHaveBeenCalled();
  });

  it('throws normally when no onMfaRequired is configured', async () => {
    vi.mocked(fetch).mockResolvedValue(error403('MFA_ENROLLMENT_REQUIRED'));
    await expect(customFetch('/gms/v1/venues', { method: 'GET' })).rejects.toMatchObject({
      code: 'MFA_ENROLLMENT_REQUIRED',
    });
  });
});
