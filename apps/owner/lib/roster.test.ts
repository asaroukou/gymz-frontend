import { describe, expect, it } from 'vitest';
import type { SlotRosterEntry } from '@iziwellpass/api/schemas';
import { rosterInitials, rosterLabel, shortMemberId } from './roster';

const entry = (over: Partial<SlotRosterEntry>): SlotRosterEntry => ({
  id: 'b1',
  tenant_id: 't',
  slot_id: 's',
  source: 'direct',
  status: 'confirmed',
  booked_at: '2026-09-21T06:00:00Z',
  created_at: '2026-09-21T06:00:00Z',
  updated_at: '2026-09-21T06:00:00Z',
  kind: 'member',
  member_id: '3f9c1b2e-0000-4000-8000-00000000a821',
  first_name: 'Awa',
  last_name: 'Ndiaye',
  ...over,
});
const opts = {
  hideNames: false,
  passLabel: 'Visiteur pass',
  memberNumber: (id: string) => `Membre n° ${id}`,
};

describe('shortMemberId', () => {
  it('keeps the last four characters upper-cased', () => {
    expect(shortMemberId('3f9c1b2e-0000-4000-8000-00000000a821')).toBe('A821');
    expect(shortMemberId('ab')).toBe('AB');
  });
});

describe('rosterLabel', () => {
  it('names a member', () => {
    expect(rosterLabel(entry({}), opts)).toEqual({
      kind: 'member',
      name: 'Awa Ndiaye',
      anonymous: false,
    });
  });
  it('never names a pass holder', () => {
    expect(
      rosterLabel(
        entry({
          kind: 'pass_holder',
          member_id: null,
          pass_holder_id: 'p1',
          first_name: 'X',
          last_name: 'Y',
        }),
        opts,
      ),
    ).toEqual({ kind: 'pass', name: 'Visiteur pass', anonymous: true });
  });
  it('uses the member number in coach view or when names are missing', () => {
    expect(rosterLabel(entry({}), { ...opts, hideNames: true })).toEqual({
      kind: 'member',
      name: 'Membre n° A821',
      anonymous: true,
    });
    expect(rosterLabel(entry({ first_name: null, last_name: null }), opts)).toEqual({
      kind: 'member',
      name: 'Membre n° A821',
      anonymous: true,
    });
  });
});

describe('rosterInitials', () => {
  it('builds initials from the entry, ? when unnamed', () => {
    expect(rosterInitials(entry({}))).toBe('AN');
    expect(rosterInitials(entry({ first_name: null, last_name: null }))).toBe('?');
  });
});
