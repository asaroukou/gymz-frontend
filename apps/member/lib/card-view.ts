import type { BadgeVariant } from '@/components/ui/status-badge.logic';
import { membershipTypeLabelKey, subscriptionStatusLabelKey } from './card-status';

export type CardState = 'active' | 'pack' | 'expired' | 'none';

export interface PlanLine {
  typeKey: string | null;
  unlimited: boolean;
  renewalKey: string | null;
}

export interface CardView {
  state: CardState;
  badgeKey: string;
  badgeVariant: BadgeVariant;
  validUntil: string | null;
  entries: number | null;
  expiredOn: string | null;
  planLine: PlanLine | null;
}

interface ProfileLike {
  membership_type: string;
  membership_end?: string | null;
  membership_status: string;
}
interface SubscriptionLike {
  status: string;
  expires_on?: string | null;
  entries_remaining?: number | null;
}

const ENDED = new Set(['expired', 'exhausted', 'cancelled']);

function localKey(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

/**
 * Which pass state the Carte draws (spec §5.2). A subscription whose
 * `expires_on` is before today is expired even if its status still says
 * active (Review Focus 4).
 */
export function cardView(
  profile: ProfileLike,
  subscription: SubscriptionLike | undefined,
  now: Date = new Date(),
): CardView {
  if (!subscription) {
    return {
      state: 'none',
      badgeKey: 'card.badge.none',
      badgeVariant: 'neutral',
      validUntil: null,
      entries: null,
      expiredOn: null,
      planLine: null,
    };
  }
  const status = subscription.status.toLowerCase();
  const entries = typeof subscription.entries_remaining === 'number' ? subscription.entries_remaining : null;
  const pastDate = !!subscription.expires_on && subscription.expires_on.slice(0, 10) < localKey(now);
  const type = profile.membership_type.toLowerCase();
  const typeKey = membershipTypeLabelKey(type);

  if (ENDED.has(status) || pastDate) {
    return {
      state: 'expired',
      badgeKey: subscriptionStatusLabelKey(ENDED.has(status) ? status : 'expired'),
      badgeVariant: 'warning',
      validUntil: null,
      entries,
      expiredOn: subscription.expires_on ?? profile.membership_end ?? null,
      planLine: { typeKey, unlimited: entries === null, renewalKey: null },
    };
  }

  const renewalKey = type === 'monthly' ? 'card.renewal.monthly' : type === 'annual' ? 'card.renewal.annual' : null;
  return {
    state: entries !== null ? 'pack' : 'active',
    badgeKey: subscriptionStatusLabelKey(status),
    badgeVariant: 'success',
    validUntil: entries !== null ? null : (subscription.expires_on ?? profile.membership_end ?? null),
    entries,
    expiredOn: null,
    planLine: { typeKey, unlimited: entries === null, renewalKey },
  };
}

/** « Mensuel illimité · Renouvelé chaque mois »; null when the type is unknown. */
export function planLineText(line: PlanLine | null, translate: (key: string) => string): string | null {
  if (!line?.typeKey) return null;
  const head = line.unlimited ? `${translate(line.typeKey)} ${translate('card.unlimited')}` : translate(line.typeKey);
  return line.renewalKey ? `${head} · ${translate(line.renewalKey)}` : head;
}

/**
 * « Mensuel illimité » — type label plus « illimité » when unlimited, never the
 * renewal suffix. Used where the plan shares a line with the venue name (QR
 * strip): `planLineText` already ends in « · Renouvelé chaque mois », so
 * appending the venue after it truncates before the venue ever renders.
 * Null when the type is unknown (no plan line at all).
 */
export function planLabel(line: PlanLine | null, translate: (key: string) => string): string | null {
  if (!line?.typeKey) return null;
  return line.unlimited ? `${translate(line.typeKey)} ${translate('card.unlimited')}` : translate(line.typeKey);
}
