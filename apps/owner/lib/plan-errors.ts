import { ApiError } from '@iziwellpass/api/client';

/** 403 because the tenant's plan lacks the feature — offer an upgrade. */
export function isFeatureNotAvailable(err: unknown): boolean {
  return err instanceof ApiError && err.status === 403 && err.code === 'FEATURE_NOT_AVAILABLE';
}

/**
 * A plain permission 403 (« Accès refusé »). The plan gate and the MFA gate
 * are excluded: each has its own flow.
 */
export function isForbidden(err: unknown): boolean {
  return (
    err instanceof ApiError &&
    err.status === 403 &&
    err.code !== 'FEATURE_NOT_AVAILABLE' &&
    err.code !== 'MFA_ENROLLMENT_REQUIRED'
  );
}
