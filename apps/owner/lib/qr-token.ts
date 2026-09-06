/**
 * Reads the *kind* out of a check-in QR token so the front desk can route one
 * scan to the right endpoint.
 *
 * Token format (see the API repo's `checkin/qr.rs`):
 *   iwp1.<base64url(json payload)>.<base64url(hmac)>
 *
 * The payload is not secret — only the MAC is — so a client can read it with
 * no key. THIS IS NOT A SECURITY CHECK: the signing key is derived from the
 * tenant AND the kind, and the server verifies the MAC on every call. Decoding
 * here only picks which endpoint to POST to; a forged or mislabelled token is
 * rejected server-side exactly as before.
 */

export type QrTokenKind = 'booking' | 'walkin' | 'pass_booking';

export interface DecodedQrToken {
  kind: QrTokenKind;
  /** Venue the token was minted for, when the payload names one. */
  venueId: string | null;
  /** Expiry in Unix seconds, when the payload carries one. */
  expiresAt: number | null;
}

const TOKEN_PREFIX = 'iwp1';
const KINDS: readonly string[] = ['booking', 'walkin', 'pass_booking'];

function decodeBase64Url(segment: string): string | null {
  try {
    const base64 = segment.replace(/-/g, '+').replace(/_/g, '/');
    const padded = base64.padEnd(Math.ceil(base64.length / 4) * 4, '=');
    // atob exists in browsers and in Node's global scope (>= 16).
    const binary = atob(padded);
    const bytes = Uint8Array.from(binary, (c) => c.charCodeAt(0));
    return new TextDecoder().decode(bytes);
  } catch {
    return null;
  }
}

/**
 * Returns null for anything not confidently decodable — callers must fall back
 * to the booking endpoint so an unknown future format still scans.
 */
export function decodeQrToken(raw: string): DecodedQrToken | null {
  const parts = raw.split('.');
  if (parts.length !== 3 || parts[0] !== TOKEN_PREFIX) {
    return null;
  }
  const payloadSegment = parts[1];
  if (!payloadSegment) {
    return null;
  }
  const json = decodeBase64Url(payloadSegment);
  if (json === null) {
    return null;
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(json);
  } catch {
    return null;
  }
  if (typeof parsed !== 'object' || parsed === null) {
    return null;
  }

  const payload = parsed as Record<string, unknown>;
  const kind = payload.kind;
  if (typeof kind !== 'string' || !KINDS.includes(kind)) {
    return null;
  }

  return {
    kind: kind as QrTokenKind,
    venueId: typeof payload.venue_id === 'string' ? payload.venue_id : null,
    expiresAt: typeof payload.exp === 'number' ? payload.exp : null,
  };
}
