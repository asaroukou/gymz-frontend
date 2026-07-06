// Parses UI-relevant claims from a Cognito ID token payload.
// Client-side only and NEVER trusted for authorization — the API authorizer
// re-validates everything; this exists purely for UI gating (nav, buttons).

export type Role = 'platform_admin' | 'owner' | 'admin' | 'trainer' | 'receptionist' | 'consumer';

export interface SessionClaims {
  sub: string;
  email: string | null;
  orgId: string | null;
  role: Role | null;
  permissions: string[];
  /** Unix seconds. */
  expiresAt: number;
}

function parsePermissions(raw: unknown): string[] {
  if (Array.isArray(raw)) {
    return raw.map(String);
  }
  if (typeof raw === 'string' && raw.length > 0) {
    try {
      const parsed: unknown = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        return parsed.map(String);
      }
    } catch {
      // not JSON — fall through to comma-split
    }
    return raw.split(',').map((p) => p.trim());
  }
  return [];
}

export function parseClaims(idToken: string): SessionClaims {
  const parts = idToken.split('.');
  const payloadPart = parts[1];
  if (parts.length !== 3 || !payloadPart) {
    throw new Error('parseClaims: malformed JWT');
  }
  const payload = JSON.parse(
    typeof atob === 'function'
      ? atob(payloadPart.replace(/-/g, '+').replace(/_/g, '/'))
      : Buffer.from(payloadPart, 'base64url').toString('utf8'),
  ) as Record<string, unknown>;

  return {
    sub: String(payload.sub ?? ''),
    email: typeof payload.email === 'string' ? payload.email : null,
    orgId: typeof payload.org_id === 'string' ? payload.org_id : null,
    role: typeof payload.role === 'string' ? (payload.role as Role) : null,
    permissions: parsePermissions(payload.permissions),
    expiresAt: typeof payload.exp === 'number' ? payload.exp : 0,
  };
}
