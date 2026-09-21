import type { SubscriptionStatus } from '@iziwellpass/api/schemas';

/**
 * Tile tone for a member subscription (canvas `L6sMyP`): live subscriptions
 * rotate through the pastels by index; expired, exhausted and cancelled ones
 * take the grey pill tone (`bg-secondary`, spec D10).
 */
export function subscriptionTone(status: SubscriptionStatus, index: number): 'side' | number {
  return status === 'active' ? index : 'side';
}
