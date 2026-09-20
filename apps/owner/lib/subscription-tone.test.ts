import { describe, expect, it } from 'vitest';
import { subscriptionTone } from './subscription-tone';

describe('subscriptionTone', () => {
  it('tints live subscriptions by index and greys every other status', () => {
    expect(subscriptionTone('active', 0)).toBe(0);
    expect(subscriptionTone('active', 3)).toBe(3);
    expect(subscriptionTone('expired', 1)).toBe('side');
    expect(subscriptionTone('exhausted', 1)).toBe('side');
    expect(subscriptionTone('cancelled', 1)).toBe('side');
  });
});
