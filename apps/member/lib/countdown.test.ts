import { describe, expect, it } from 'vitest';
import { secondsUntil } from './countdown';

describe('secondsUntil', () => {
  it('computes whole seconds remaining, floored', () => {
    expect(secondsUntil(1000, 990_500)).toBe(9); // (1000_000 - 990_500)/1000 = 9.5 -> 9
  });
  it('never returns negative', () => {
    expect(secondsUntil(1000, 2_000_000)).toBe(0);
  });
});
