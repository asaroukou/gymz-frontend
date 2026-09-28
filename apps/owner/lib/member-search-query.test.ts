import { describe, expect, it } from 'vitest';

import { buildSearchRequest } from './member-search-query';

describe('buildSearchRequest', () => {
  const base = { scope: 'venue' as const, venueId: 'v1', status: 'all' as const, q: '' };

  it('scopes to the selected venue', () => {
    expect(buildSearchRequest(base)).toEqual({ venue_id: 'v1', status: 'all', limit: 20 });
  });
  it('asks for every venue', () => {
    expect(buildSearchRequest({ ...base, scope: 'all' })).toEqual({ all_venues: true, status: 'all', limit: 20 });
  });
  it('is null without a selected venue in venue scope', () => {
    expect(buildSearchRequest({ ...base, venueId: null })).toBeNull();
  });
  it('trims q and omits it when blank', () => {
    expect(buildSearchRequest({ ...base, q: '  kofi ' })).toMatchObject({ q: 'kofi' });
    expect(buildSearchRequest({ ...base, q: '   ' })).not.toHaveProperty('q');
  });
  it('caps q at 100 characters', () => {
    expect(buildSearchRequest({ ...base, q: 'a'.repeat(120) })?.q).toHaveLength(100);
  });
  it('passes the exact status and the cursor', () => {
    expect(buildSearchRequest({ ...base, status: 'suspended', cursor: 'c2' })).toMatchObject({
      status: 'suspended',
      cursor: 'c2',
    });
  });
});
