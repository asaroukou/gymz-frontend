import { describe, expect, it } from 'vitest';
import { pickMembership } from './venue';

const a = { venue_id: 'v-a', gym_name: 'A' };
const b = { venue_id: 'v-b', gym_name: 'B' };

describe('pickMembership (Review Focus 1)', () => {
  it('prefers the membership of the first entitled venue', () => {
    expect(pickMembership([a, b], ['v-b'])).toBe(b);
  });
  it('falls back to the first membership', () => {
    expect(pickMembership([a, b], ['v-z'])).toBe(a);
    expect(pickMembership([a, b], undefined)).toBe(a);
    expect(pickMembership([a, b], [])).toBe(a);
  });
  it('is null without memberships', () => {
    expect(pickMembership([], ['v-a'])).toBeNull();
    expect(pickMembership(undefined, ['v-a'])).toBeNull();
  });
});
