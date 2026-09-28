import { describe, expect, it } from 'vitest';

import { ApiError } from '@iziwellpass/api/client';

import { classifyMemberError, downscopeLines } from './member-errors';

const api = (status: number, code: string, details?: unknown) =>
  new ApiError(status, { code, message: 'x', details });

describe('classifyMemberError', () => {
  it('maps a stale version', () => {
    expect(classifyMemberError(api(409, 'VERSION_MISMATCH'))).toEqual({ kind: 'versionMismatch' });
  });

  it('maps a lifecycle refusal with its current status', () => {
    expect(
      classifyMemberError(
        api(409, 'INVALID_LIFECYCLE_TRANSITION', {
          operation: 'suspend',
          current_status: 'suspended',
          required_status: 'active',
        }),
      ),
    ).toEqual({ kind: 'invalidLifecycle', currentStatus: 'suspended' });
  });

  it('keeps the lifecycle kind when details are missing or garbled', () => {
    expect(classifyMemberError(api(409, 'INVALID_LIFECYCLE_TRANSITION'))).toEqual({
      kind: 'invalidLifecycle',
    });
    expect(classifyMemberError(api(409, 'INVALID_LIFECYCLE_TRANSITION', 'oops'))).toEqual({
      kind: 'invalidLifecycle',
    });
  });

  it('maps a blocked down-scope with its affected venues', () => {
    expect(
      classifyMemberError(
        api(409, 'ACCESS_DOWNSCOPE_BLOCKED', {
          affected_venues: [
            { venue_id: 'v2', future_bookings: 2 },
            { venue_id: 'v3', future_bookings: 1 },
          ],
        }),
      ),
    ).toEqual({
      kind: 'downscopeBlocked',
      affected: [
        { venueId: 'v2', futureBookings: 2 },
        { venueId: 'v3', futureBookings: 1 },
      ],
    });
  });

  it('drops malformed affected entries and survives missing details', () => {
    expect(
      classifyMemberError(
        api(409, 'ACCESS_DOWNSCOPE_BLOCKED', {
          affected_venues: [{ venue_id: 'v2' }, { venue_id: 4, future_bookings: 1 }, null, { venue_id: 'v5', future_bookings: 3 }],
        }),
      ),
    ).toEqual({ kind: 'downscopeBlocked', affected: [{ venueId: 'v5', futureBookings: 3 }] });
    expect(classifyMemberError(api(409, 'ACCESS_DOWNSCOPE_BLOCKED'))).toEqual({
      kind: 'downscopeBlocked',
      affected: [],
    });
  });

  it('maps the login e-mail lock and duplicates', () => {
    expect(classifyMemberError(api(409, 'LOGIN_EMAIL_REQUIRES_SECURE_CHANGE'))).toEqual({
      kind: 'loginEmailLocked',
    });
    expect(classifyMemberError(api(409, 'CONFLICT'))).toEqual({ kind: 'duplicate' });
  });

  it('falls back to other', () => {
    expect(classifyMemberError(api(400, 'VALIDATION_ERROR'))).toEqual({ kind: 'other' });
    expect(classifyMemberError(api(500, 'CONFLICT'))).toEqual({ kind: 'other' });
    expect(classifyMemberError(new Error('network'))).toEqual({ kind: 'other' });
    expect(classifyMemberError(undefined)).toEqual({ kind: 'other' });
  });
});

describe('downscopeLines', () => {
  const venues = [
    { id: 'v1', name: 'Studio Téranga' },
    { id: 'v2', name: 'Espace Wellness Plateau' },
  ];

  it('names each venue and keeps the backend order', () => {
    expect(
      downscopeLines(
        [
          { venueId: 'v2', futureBookings: 2 },
          { venueId: 'v1', futureBookings: 1 },
        ],
        venues,
        'Salle inconnue',
      ),
    ).toEqual([
      { venueId: 'v2', name: 'Espace Wellness Plateau', count: 2 },
      { venueId: 'v1', name: 'Studio Téranga', count: 1 },
    ]);
  });

  it('labels an unknown venue', () => {
    expect(downscopeLines([{ venueId: 'v9', futureBookings: 4 }], venues, 'Salle inconnue')).toEqual([
      { venueId: 'v9', name: 'Salle inconnue', count: 4 },
    ]);
  });
});
