// Parses UI-relevant claims from a Cognito ID token payload.
// Client-side only and NEVER trusted for authorization — the API authorizer
// re-validates everything; this exists purely for UI gating (nav, buttons).

const ROLES = ['platform_admin', 'owner', 'admin', 'trainer', 'receptionist', 'consumer'] as const;

export type Role = (typeof ROLES)[number];

function isRole(value: unknown): value is Role {
  return typeof value === 'string' && (ROLES as readonly string[]).includes(value);
}

export interface SessionClaims {
  sub: string;
  email: string | null;
  /**
   * The signed-in person's given name for greetings, from the Cognito
   * `given_name` claim (or the first word of `name`). Null when the token
   * carries neither — callers greet without a name rather than falling back to
   * the email local-part, which reads as a machine id.
   */
  name: string | null;
  orgId: string | null;
  role: Role | null;
  permissions: string[];
  /** Unix seconds. */
  expiresAt: number;
}

function pickDisplayName(payload: Record<string, unknown>): string | null {
  if (typeof payload.given_name === 'string' && payload.given_name.trim()) {
    return payload.given_name.trim();
  }
  if (typeof payload.name === 'string' && payload.name.trim()) {
    // A full name in the `name` claim: greet with just the first word.
    return payload.name.trim().split(/\s+/)[0] ?? null;
  }
  return null;
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
    sub: typeof payload.sub === 'string' ? payload.sub : '',
    email: typeof payload.email === 'string' ? payload.email : null,
    name: pickDisplayName(payload),
    orgId: typeof payload.org_id === 'string' ? payload.org_id : null,
    role: isRole(payload.role) ? payload.role : null,
    permissions: parsePermissions(payload.permissions),
    // 0 = treat-as-expired sentinel (fails closed)
    expiresAt: typeof payload.exp === 'number' ? payload.exp : 0,
  };
}
