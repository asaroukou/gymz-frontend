import { ApiError } from '@iziwellpass/api/client';

/** A venue a down-scope would remove while the member still has bookings there. */
export interface AffectedVenue {
  venueId: string;
  futureBookings: number;
}

/**
 * What a member write's failure means for the screen. The backend's Phase 5A
 * conflicts carry structured `details`; anything missing or malformed degrades
 * to the kind without details, never to a crash.
 */
export type MemberError =
  | { kind: 'versionMismatch' }
  | { kind: 'invalidLifecycle'; currentStatus?: string }
  | { kind: 'downscopeBlocked'; affected: AffectedVenue[] }
  | { kind: 'loginEmailLocked' }
  | { kind: 'duplicate' }
  | { kind: 'other' };

function asRecord(value: unknown): Record<string, unknown> | null {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
}

function parseAffected(value: unknown): AffectedVenue[] {
  if (!Array.isArray(value)) return [];
  const out: AffectedVenue[] = [];
  for (const entry of value) {
    const e = asRecord(entry);
    if (e && typeof e.venue_id === 'string' && typeof e.future_bookings === 'number') {
      out.push({ venueId: e.venue_id, futureBookings: e.future_bookings });
    }
  }
  return out;
}

export function classifyMemberError(err: unknown): MemberError {
  if (!(err instanceof ApiError)) return { kind: 'other' };
  const details = asRecord(err.details);
  switch (err.code) {
    case 'VERSION_MISMATCH':
      return { kind: 'versionMismatch' };
    case 'INVALID_LIFECYCLE_TRANSITION':
      return typeof details?.current_status === 'string'
        ? { kind: 'invalidLifecycle', currentStatus: details.current_status }
        : { kind: 'invalidLifecycle' };
    case 'ACCESS_DOWNSCOPE_BLOCKED':
      return { kind: 'downscopeBlocked', affected: parseAffected(details?.affected_venues) };
    case 'LOGIN_EMAIL_REQUIRES_SECURE_CHANGE':
      return { kind: 'loginEmailLocked' };
    case 'CONFLICT':
      return err.status === 409 ? { kind: 'duplicate' } : { kind: 'other' };
    default:
      return { kind: 'other' };
  }
}

export interface DownscopeLine {
  venueId: string;
  name: string;
  count: number;
}

/** One line per blocked venue, in the backend's order, named from the tenant's venues. */
export function downscopeLines(
  affected: AffectedVenue[],
  venues: readonly { id: string; name: string }[],
  unknownLabel: string,
): DownscopeLine[] {
  const names = new Map(venues.map((v) => [v.id, v.name]));
  return affected.map((a) => ({
    venueId: a.venueId,
    name: names.get(a.venueId) ?? unknownLabel,
    count: a.futureBookings,
  }));
}
