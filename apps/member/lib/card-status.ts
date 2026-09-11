const MEMBERSHIP = new Set(['active', 'expired', 'suspended', 'cancelled']);
const SUBSCRIPTION = new Set(['active', 'expired', 'exhausted', 'cancelled']);

export function membershipStatusLabelKey(status: string): string {
  const s = status.toLowerCase();
  return MEMBERSHIP.has(s) ? `card.membershipStatus.${s}` : 'card.membershipStatus.unknown';
}

export function subscriptionStatusLabelKey(status: string): string {
  const s = status.toLowerCase();
  return SUBSCRIPTION.has(s) ? `card.subscriptionStatus.${s}` : 'card.subscriptionStatus.unknown';
}
