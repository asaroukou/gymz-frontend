import { describe, expect, it } from 'vitest';

import { createAccessPayload, createdToastKey } from './create-member';

describe('createAccessPayload', () => {
  it('forces the selected venue for a receptionist', () => {
    expect(
      createAccessPayload({ canChooseScope: false, selectedVenueId: 'v1', access_scope: 'chain_wide', venue_ids: [] }),
    ).toEqual({ access_scope: 'venue_scoped', venue_ids: ['v1'] });
  });
  it('keeps an owner chain-wide choice without venue ids', () => {
    expect(
      createAccessPayload({ canChooseScope: true, selectedVenueId: 'v1', access_scope: 'chain_wide', venue_ids: ['v2'] }),
    ).toEqual({ access_scope: 'chain_wide' });
  });
  it('keeps an owner venue list', () => {
    expect(
      createAccessPayload({ canChooseScope: true, selectedVenueId: 'v1', access_scope: 'venue_scoped', venue_ids: ['v2'] }),
    ).toEqual({ access_scope: 'venue_scoped', venue_ids: ['v2'] });
  });
});

describe('createdToastKey', () => {
  it('announces the invitation for login members', () => {
    expect(createdToastKey('login')).toBe('addDialog.successLogin');
  });
  it('stays plain for roster or unknown', () => {
    expect(createdToastKey('roster')).toBe('addDialog.success');
    expect(createdToastKey(undefined)).toBe('addDialog.success');
  });
});
