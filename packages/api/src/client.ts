// HTTP core for the generated client: base URL, auth injection, error mapping.
// packages/auth wires the real token getter at app startup (SP4); this package
// stays auth-agnostic via configureApi().

export interface ErrorBody {
  code: string;
  message: string;
  details?: unknown;
}

export class ApiError extends Error {
  readonly status: number;
  readonly code: string;
  readonly details?: unknown;
  readonly requestId?: string;

  constructor(status: number, body: ErrorBody, requestId?: string) {
    super(body.message);
    this.name = 'ApiError';
    this.status = status;
    this.code = body.code;
    this.details = body.details;
    this.requestId = requestId;
  }
}

export type TokenGetter = () => Promise<string | null>;

/**
 * Called on a 401 response (once per original request). Should attempt a
 * session refresh and return the new token to retry with, or null/undefined
 * to give up (the caller then sees the original 401 ApiError). Implementations
 * typically also handle redirecting to sign-in when the refresh itself fails.
 */
export type UnauthorizedHandler = () => Promise<string | null | undefined>;

interface ApiConfig {
  baseUrl: string;
  /** Base URL for control-plane routes (onboarding, register-owner, admin, billing). */
  controlPlaneBaseUrl?: string;
  getToken: TokenGetter;
  onUnauthorized?: UnauthorizedHandler;
}

// Process-wide mutable state: call configureApi() from CLIENT code only.
// Never import/call this from Server Components, Route Handlers, or Server Actions —
// during SSR the module is shared across requests and the token getter would be wrong/empty.
let config: ApiConfig = {
  baseUrl: process.env.NEXT_PUBLIC_API_BASE_URL ?? '',
  getToken: () => Promise.resolve(null),
};

/** Configure base URL and auth-token source. Call once at app startup. */
export function configureApi(next: Partial<ApiConfig>): void {
  config = { ...config, ...next };
}

/**
 * Route prefixes served by the control-plane gateway (ControlPlaneApiUrl)
 * rather than the app plane (ApiUrl). Mirrors the route table in
 * iziwellpass/docs/client-integration.md; a drift from the backend's split
 * fails loudly (403 from the wrong gateway), never silently.
 */
export const CONTROL_PLANE_PREFIXES = [
  '/platform/v1/auth/',
  '/platform/v1/onboarding/',
  '/platform/v1/admin/',
  '/platform/v1/billing/',
] as const;

/**
 * Check-in routes where a 401 means "the scanned QR token failed its check",
 * not "the caller's session expired". `pass_checkin`'s 401 (see openapi.json)
 * explicitly covers "a wrong-tenant/forged QR token" — a marketplace visitor
 * can trigger it just by presenting a pass minted for a different tenant.
 * Running the normal refresh-and-retry flow here would force a Cognito token
 * refresh (and, if that refresh fails, sign the operator out) in response to
 * someone else's bad QR code, throwing the front desk to /login mid-rush for
 * a problem that has nothing to do with the operator's own session. These
 * routes must surface the 401 to the caller as a plain ApiError instead.
 */
export const TOKEN_REJECTION_401_PATHS: readonly string[] = ['/platform/v1/checkins/pass'];

/** Pick the base URL for a generated-client path. Pure; unit-tested. */
export function resolveBaseUrl(
  url: string,
  cfg: { baseUrl: string; controlPlaneBaseUrl?: string },
): string {
  if (!CONTROL_PLANE_PREFIXES.some((p) => url.startsWith(p))) {
    return cfg.baseUrl;
  }
  if (!cfg.controlPlaneBaseUrl) {
    throw new Error(
      `[api] ${url} is a control-plane route but controlPlaneBaseUrl is not configured — ` +
        'set NEXT_PUBLIC_CONTROL_PLANE_BASE_URL and pass it to configureApi()',
    );
  }
  return cfg.controlPlaneBaseUrl;
}

async function parseErrorResponse(response: Response): Promise<ApiError> {
  let body: ErrorBody = { code: 'UNKNOWN', message: `HTTP ${response.status}` };
  let requestId: string | undefined;
  try {
    const parsed = (await response.json()) as {
      error?: ErrorBody;
      request_id?: string;
    };
    if (parsed.error) {
      body = parsed.error;
    }
    requestId = parsed.request_id;
  } catch {
    // non-JSON error body (gateway timeouts etc.) — keep the UNKNOWN default
  }
  return new ApiError(response.status, body, requestId);
}

/** Performs the actual request with a given bearer token (or none). */
async function doFetch(url: string, options: RequestInit, token: string | null): Promise<Response> {
  const headers = new Headers(options.headers);
  if (token) {
    headers.set('authorization', `Bearer ${token}`);
  }
  if (options.body && !headers.has('content-type')) {
    headers.set('content-type', 'application/json');
  }

  // Network-level failures (offline/DNS) intentionally pass through as raw TypeError —
  // callers distinguish transport errors (not ApiError) from API errors (ApiError).
  return fetch(`${resolveBaseUrl(url, config)}${url}`, { ...options, headers });
}

/** Orval mutator: every generated operation funnels through here. */
export async function customFetch<T>(url: string, options: RequestInit): Promise<T> {
  const token = await config.getToken();
  let response = await doFetch(url, options, token);

  if (
    response.status === 401 &&
    config.onUnauthorized &&
    !TOKEN_REJECTION_401_PATHS.includes(url)
  ) {
    const freshToken = await config.onUnauthorized();
    if (freshToken) {
      response = await doFetch(url, options, freshToken);
    } else {
      throw await parseErrorResponse(response);
    }
  }

  if (!response.ok) {
    throw await parseErrorResponse(response);
  }

  if (response.status === 204) {
    return undefined as T;
  }
  const text = await response.text();
  return (text ? JSON.parse(text) : undefined) as T;
}

/** Convenience for React Query `select`: `select: unwrap`. */
export function unwrap<E extends { data: unknown }>(envelope: E): E['data'] {
  return envelope.data;
}

export default customFetch;
