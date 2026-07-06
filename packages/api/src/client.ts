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
  return fetch(`${config.baseUrl}${url}`, { ...options, headers });
}

/** Orval mutator: every generated operation funnels through here. */
export async function customFetch<T>(url: string, options: RequestInit): Promise<T> {
  const token = await config.getToken();
  let response = await doFetch(url, options, token);

  if (response.status === 401 && config.onUnauthorized) {
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
  return (await response.json()) as T;
}

/** Convenience for React Query `select`: `select: unwrap`. */
export function unwrap<E extends { data: unknown }>(envelope: E): E['data'] {
  return envelope.data;
}

export default customFetch;
