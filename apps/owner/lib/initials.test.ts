import { describe, expect, it } from 'vitest';

import { initials } from './initials';

describe('initials', () => {
  it('takes two letters from a dotted e-mail local part', () => {
    expect(initials('moussa.diop@studioplateau.sn')).toBe('MD');
  });

  it('takes one letter from a single-word local part', () => {
    expect(initials('moussa@studioplateau.sn')).toBe('M');
  });

  it('splits names on spaces', () => {
    expect(initials('Awa Ndiaye')).toBe('AN');
  });

  it('returns ? for an empty value', () => {
    expect(initials('')).toBe('?');
  });
});
