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

interface ApiConfig {
  baseUrl: string;
  getToken: TokenGetter;
}

let config: ApiConfig = {
  baseUrl: process.env.NEXT_PUBLIC_API_BASE_URL ?? '',
  getToken: () => Promise.resolve(null),
};

/** Configure base URL and auth-token source. Call once at app startup. */
export function configureApi(next: Partial<ApiConfig>): void {
  config = { ...config, ...next };
}

/** Orval mutator: every generated operation funnels through here. */
export async function customFetch<T>(url: string, options: RequestInit): Promise<T> {
  const headers = new Headers(options.headers);
  const token = await config.getToken();
  if (token) {
    headers.set('authorization', `Bearer ${token}`);
  }
  if (options.body && !headers.has('content-type')) {
    headers.set('content-type', 'application/json');
  }

  const response = await fetch(`${config.baseUrl}${url}`, { ...options, headers });

  if (!response.ok) {
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
    throw new ApiError(response.status, body, requestId);
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
