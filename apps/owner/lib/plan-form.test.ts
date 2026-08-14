import { describe, expect, it } from 'vitest';

import type { PlanFormMessages, PlanFormValues } from './plan-form';
import {
  buildPlanSchema,
  planToFormValues,
  toCreatePlanRequest,
  toUpdatePlanRequest,
} from './plan-form';

const messages: PlanFormMessages = {
  nameRequired: 'name required',
  priceInvalid: 'price invalid',
  durationRequired: 'duration required',
  entriesRequired: 'entries required',
  activitiesRequired: 'activities required',
};

const base: PlanFormValues = {
  name: 'Mensuel illimité',
  kind: 'subscription',
  price_major: '25000',
  price_currency: 'XOF',
  duration_days: '30',
  entry_count: '',
  all_activities: true,
  activities: [],
};

const schema = buildPlanSchema(messages);

describe('buildPlanSchema', () => {
  it('accepts a valid subscription', () => {
    expect(schema.safeParse(base).success).toBe(true);
  });

  it('rejects a subscription with no duration', () => {
    const result = schema.safeParse({ ...base, duration_days: '' });
    expect(result.success).toBe(false);
    expect(result.error?.issues[0]?.path).toEqual(['duration_days']);
  });

  it('accepts an entry pack with a count and no duration', () => {
    const result = schema.safeParse({
      ...base,
      kind: 'entry_pack',
      duration_days: '',
      entry_count: '10',
    });
    expect(result.success).toBe(true);
  });

  it('rejects an entry pack with a zero count', () => {
    const result = schema.safeParse({
      ...base,
      kind: 'entry_pack',
      duration_days: '',
      entry_count: '0',
    });
    expect(result.success).toBe(false);
    expect(result.error?.issues[0]?.path).toEqual(['entry_count']);
  });

  it('rejects a restricted plan with no activities', () => {
    const result = schema.safeParse({ ...base, all_activities: false, activities: [] });
    expect(result.success).toBe(false);
    expect(result.error?.issues[0]?.path).toEqual(['activities']);
  });

  it('rejects a non-numeric price', () => {
    expect(schema.safeParse({ ...base, price_major: 'gratuit' }).success).toBe(false);
  });
});

describe('toCreatePlanRequest', () => {
  it('scales the price to minor units and omits the irrelevant term', () => {
    expect(toCreatePlanRequest(base)).toEqual({
      name: 'Mensuel illimité',
      kind: 'subscription',
      price_amount_minor: 25000,
      price_currency: 'XOF',
      all_activities: true,
      duration_days: 30,
    });
  });

  it('sends entry_count and no duration for a bare entry pack', () => {
    const request = toCreatePlanRequest({
      ...base,
      kind: 'entry_pack',
      duration_days: '',
      entry_count: '10',
    });
    expect(request.entry_count).toBe(10);
    expect('duration_days' in request).toBe(false);
  });

  it('sends the activity subset when all_activities is off', () => {
    const request = toCreatePlanRequest({
      ...base,
      all_activities: false,
      activities: ['yoga', 'pilates'],
    });
    expect(request.all_activities).toBe(false);
    expect(request.activities).toEqual(['yoga', 'pilates']);
  });
});

describe('toUpdatePlanRequest', () => {
  it('omits kind, which the API treats as immutable', () => {
    expect('kind' in toUpdatePlanRequest(base)).toBe(false);
  });
});

describe('planToFormValues', () => {
  it('round-trips a plan back into major units', () => {
    const values = planToFormValues({
      activities: [],
      all_activities: true,
      created_at: '2026-08-14T00:00:00Z',
      duration_days: 30,
      entry_count: null,
      id: 'plan-1',
      is_active: true,
      kind: 'subscription',
      name: 'Mensuel illimité',
      price_amount_minor: 25000,
      price_currency: 'XOF',
      tenant_id: 'tenant-1',
      updated_at: '2026-08-14T00:00:00Z',
      venue_id: 'venue-1',
    });
    expect(values.price_major).toBe('25000');
    expect(values.duration_days).toBe('30');
    expect(values.entry_count).toBe('');
  });
});
