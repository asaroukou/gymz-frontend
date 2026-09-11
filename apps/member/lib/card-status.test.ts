import { describe, expect, it } from 'vitest';
import {
  membershipStatusLabelKey,
  membershipTypeLabelKey,
  subscriptionStatusLabelKey,
} from './card-status';

describe('membershipStatusLabelKey', () => {
  it('maps known statuses to i18n keys', () => {
    expect(membershipStatusLabelKey('active')).toBe('card.membershipStatus.active');
    expect(membershipStatusLabelKey('expired')).toBe('card.membershipStatus.expired');
    expect(membershipStatusLabelKey('suspended')).toBe('card.membershipStatus.suspended');
    expect(membershipStatusLabelKey('cancelled')).toBe('card.membershipStatus.cancelled');
  });
  it('falls back to unknown for unrecognized statuses', () => {
    expect(membershipStatusLabelKey('mystery')).toBe('card.membershipStatus.unknown');
  });
});

describe('subscriptionStatusLabelKey', () => {
  it('maps known statuses to i18n keys', () => {
    expect(subscriptionStatusLabelKey('active')).toBe('card.subscriptionStatus.active');
    expect(subscriptionStatusLabelKey('expired')).toBe('card.subscriptionStatus.expired');
    expect(subscriptionStatusLabelKey('exhausted')).toBe('card.subscriptionStatus.exhausted');
    expect(subscriptionStatusLabelKey('cancelled')).toBe('card.subscriptionStatus.cancelled');
  });
  it('falls back to unknown for unrecognized statuses', () => {
    expect(subscriptionStatusLabelKey('mystery')).toBe('card.subscriptionStatus.unknown');
  });
});

describe('membershipTypeLabelKey', () => {
  it('maps known types to i18n keys', () => {
    expect(membershipTypeLabelKey('monthly')).toBe('card.type.monthly');
    expect(membershipTypeLabelKey('annual')).toBe('card.type.annual');
    expect(membershipTypeLabelKey('drop_in')).toBe('card.type.drop_in');
    expect(membershipTypeLabelKey('trial')).toBe('card.type.trial');
  });
  it('returns null for an unknown type so the chip is omitted', () => {
    expect(membershipTypeLabelKey('mystery')).toBeNull();
  });
});
