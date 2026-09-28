import { describe, expect, it } from 'vitest';
import { cardView, planLabel, planLineText } from './card-view';

const now = new Date(2026, 8, 20, 12);
const profile = { membership_type: 'monthly', membership_end: '2026-12-31', membership_status: 'active' };
const tr = (key: string) => ({
  'card.type.monthly': 'Mensuel',
  'card.type.annual': 'Annuel',
  'card.unlimited': 'illimité',
  'card.renewal.monthly': 'Renouvelé chaque mois',
  'card.renewal.annual': 'Renouvelé chaque année',
})[key] ?? key;

describe('cardView', () => {
  it('no subscription', () => {
    const v = cardView(profile, undefined, now);
    expect(v.state).toBe('none');
    expect(v.badgeKey).toBe('card.badge.none');
    expect(v.badgeVariant).toBe('neutral');
    expect(v.planLine).toBeNull();
  });

  it('active with an expiry date', () => {
    const v = cardView(profile, { status: 'active', expires_on: '2026-09-30', entries_remaining: null }, now);
    expect(v.state).toBe('active');
    expect(v.validUntil).toBe('2026-09-30');
    expect(v.badgeVariant).toBe('success');
    expect(planLineText(v.planLine, tr)).toBe('Mensuel illimité · Renouvelé chaque mois');
  });

  it('active falls back to membership_end', () => {
    const v = cardView(profile, { status: 'active', expires_on: null, entries_remaining: null }, now);
    expect(v.validUntil).toBe('2026-12-31');
  });

  it('entry pack', () => {
    const v = cardView(profile, { status: 'active', expires_on: '2026-10-30', entries_remaining: 3 }, now);
    expect(v.state).toBe('pack');
    expect(v.entries).toBe(3);
    expect(planLineText(v.planLine, tr)).toBe('Mensuel · Renouvelé chaque mois');
  });

  it('expired by status', () => {
    const v = cardView(profile, { status: 'expired', expires_on: '2026-08-31', entries_remaining: null }, now);
    expect(v.state).toBe('expired');
    expect(v.expiredOn).toBe('2026-08-31');
    expect(v.badgeKey).toBe('card.subscriptionStatus.expired');
    expect(v.badgeVariant).toBe('warning');
    expect(planLineText(v.planLine, tr)).toBe('Mensuel illimité');
  });

  it('expired by date even when the status still says active (Review Focus 4)', () => {
    const v = cardView(profile, { status: 'active', expires_on: '2026-09-19', entries_remaining: null }, now);
    expect(v.state).toBe('expired');
    expect(v.badgeKey).toBe('card.subscriptionStatus.expired');
  });

  it('exhausted pack is expired with its own label', () => {
    const v = cardView(profile, { status: 'exhausted', expires_on: '2026-10-30', entries_remaining: 0 }, now);
    expect(v.state).toBe('expired');
    expect(v.badgeKey).toBe('card.subscriptionStatus.exhausted');
  });

  it('annual renewal and unknown type', () => {
    const annual = cardView({ ...profile, membership_type: 'annual' }, { status: 'active', expires_on: '2027-01-01', entries_remaining: null }, now);
    expect(planLineText(annual.planLine, tr)).toBe('Annuel illimité · Renouvelé chaque année');
    const odd = cardView({ ...profile, membership_type: 'standard' }, { status: 'active', expires_on: '2027-01-01', entries_remaining: null }, now);
    expect(planLineText(odd.planLine, tr)).toBeNull();
  });
});

describe('planLabel', () => {
  it('active: type label + illimité, no renewal suffix', () => {
    const v = cardView(profile, { status: 'active', expires_on: '2026-09-30', entries_remaining: null }, now);
    expect(planLabel(v.planLine, tr)).toBe('Mensuel illimité');
  });

  it('entry pack: type label only, no illimité and no renewal suffix', () => {
    const v = cardView(profile, { status: 'active', expires_on: '2026-10-30', entries_remaining: 3 }, now);
    expect(planLabel(v.planLine, tr)).toBe('Mensuel');
  });

  it('expired: type label + illimité, no renewal suffix', () => {
    const v = cardView(profile, { status: 'expired', expires_on: '2026-08-31', entries_remaining: null }, now);
    expect(planLabel(v.planLine, tr)).toBe('Mensuel illimité');
  });

  it('annual renewal and unknown type', () => {
    const annual = cardView({ ...profile, membership_type: 'annual' }, { status: 'active', expires_on: '2027-01-01', entries_remaining: null }, now);
    expect(planLabel(annual.planLine, tr)).toBe('Annuel illimité');
    const odd = cardView({ ...profile, membership_type: 'standard' }, { status: 'active', expires_on: '2027-01-01', entries_remaining: null }, now);
    expect(planLabel(odd.planLine, tr)).toBeNull();
  });

  it('null typeKey (no plan line, e.g. no subscription) returns null', () => {
    const v = cardView(profile, undefined, now);
    expect(planLabel(v.planLine, tr)).toBeNull();
  });
});
