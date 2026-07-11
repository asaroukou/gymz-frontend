import type { MembershipStatus } from '@iziwellpass/api/schemas';

/**
 * Badge variant for a membership status, shared by the members list and detail
 * so the two can't drift. Active reads as success, suspended as destructive,
 * expired/cancelled as muted (secondary). Color always pairs with a text label
 * at the call site (Meaning-Only Color rule).
 */
export function memberStatusBadgeVariant(
  status: MembershipStatus,
): 'success' | 'destructive' | 'secondary' {
  if (status === 'active') return 'success';
  if (status === 'suspended') return 'destructive';
  return 'secondary';
}
