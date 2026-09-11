const MEMBERSHIP = new Set(['active', 'expired', 'suspended', 'cancelled']);
const SUBSCRIPTION = new Set(['active', 'expired', 'exhausted', 'cancelled']);
const TYPE = new Set(['monthly', 'annual', 'drop_in', 'trial']);

/** Membership type (monthly/annual/drop_in/trial) -> i18n key; null when unknown
 *  so the caller can omit the chip rather than show a raw enum. */
export function membershipTypeLabelKey(type: string): string | null {
  const t = type.toLowerCase();
  return TYPE.has(t) ? `card.type.${t}` : null;
}

export function membershipStatusLabelKey(status: string): string {
  const s = status.toLowerCase();
  return MEMBERSHIP.has(s) ? `card.membershipStatus.${s}` : 'card.membershipStatus.unknown';
}

export function subscriptionStatusLabelKey(status: string): string {
  const s = status.toLowerCase();
  return SUBSCRIPTION.has(s) ? `card.subscriptionStatus.${s}` : 'card.subscriptionStatus.unknown';
}
