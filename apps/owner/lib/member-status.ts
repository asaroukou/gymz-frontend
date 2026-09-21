import type { Member, MembershipStatus } from '@iziwellpass/api/schemas';

import { daysUntilCalendarDate } from './datetime';

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

/** Number of days before the membership end date we flag it « Expire bientôt ». */
export const EXPIRING_SOON_DAYS = 7;

/** Active membership whose end date is within the next `EXPIRING_SOON_DAYS`. */
export function isExpiringSoon(member: Member): boolean {
  if (member.membership_status !== 'active') return false;
  const days = daysUntilCalendarDate(member.membership_end);
  return days !== null && days >= 0 && days <= EXPIRING_SOON_DAYS;
}
