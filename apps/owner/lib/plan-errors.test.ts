import { describe, expect, it } from 'vitest';

import { ApiError } from '@iziwellpass/api/client';

import { isFeatureNotAvailable, isForbidden } from './plan-errors';

const err = (status: number, code: string) => new ApiError(status, { code, message: code });

describe('plan errors', () => {
  it('recognises the plan gate', () => {
    expect(isFeatureNotAvailable(err(403, 'FEATURE_NOT_AVAILABLE'))).toBe(true);
    expect(isForbidden(err(403, 'FEATURE_NOT_AVAILABLE'))).toBe(false);
  });

  it('treats any other 403 as access denied', () => {
    expect(isForbidden(err(403, 'FORBIDDEN'))).toBe(true);
    expect(isFeatureNotAvailable(err(403, 'FORBIDDEN'))).toBe(false);
  });

  it('leaves the MFA gate to its own flow', () => {
    expect(isForbidden(err(403, 'MFA_ENROLLMENT_REQUIRED'))).toBe(false);
    expect(isFeatureNotAvailable(err(403, 'MFA_ENROLLMENT_REQUIRED'))).toBe(false);
  });

  it('ignores non-403 and non-ApiError values', () => {
    expect(isForbidden(err(401, 'UNAUTHORIZED'))).toBe(false);
    expect(isForbidden(new Error('x'))).toBe(false);
    expect(isFeatureNotAvailable(undefined)).toBe(false);
  });
});
