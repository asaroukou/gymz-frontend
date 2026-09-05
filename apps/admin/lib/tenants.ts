import type { Plan, TenantStatus } from '@iziwellpass/api/schemas';

export const TENANTS_PAGE_SIZE = 50;

export type StatusFilter = 'all' | 'active' | 'suspended' | 'offboarding';

export const STATUS_FILTERS: readonly StatusFilter[] = [
  'all',
  'active',
  'suspended',
  'offboarding',
];

/** 'all' means no ?status= param. */
export function statusParam(filter: StatusFilter): Exclude<StatusFilter, 'all'> | undefined {
  return filter === 'all' ? undefined : filter;
}

/**
 * True when the API rejected the caller outright (main-pool token on the
 * operator-only admin routes). The spec maps this to a dedicated
 * «Accès réservé aux opérateurs de la plateforme» message, not a generic error.
 * `ApiError` (packages/api/src/client.ts) carries a numeric `status` field.
 */
export function isForbidden(err: unknown): boolean {
  return (
    typeof err === 'object' &&
    err !== null &&
    'status' in err &&
    (err as { status: unknown }).status === 403
  );
}

type BadgeVariant = 'default' | 'secondary' | 'success' | 'warning' | 'destructive' | 'outline';

/**
 * `TenantStatus` (packages/api/src/generated/endpoints.schemas.ts) only ever
 * carries 'active' | 'suspended' | 'offboarding' — there is no 'purged' value
 * on the wire, so this switch is exhaustive without one.
 */
export function statusBadgeVariant(status: TenantStatus): BadgeVariant {
  switch (status) {
    case 'active':
      return 'success';
    case 'suspended':
      return 'warning';
    case 'offboarding':
      return 'destructive';
  }
}

export function planBadgeVariant(plan: Plan): BadgeVariant {
  return plan === 'free' ? 'secondary' : 'default';
}
