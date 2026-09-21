import { describe, expect, it } from 'vitest';

import type { Member } from '@iziwellpass/api/schemas';

import { memberInitials, memberLabel, memberName, searchMembers } from './member-search';

function member(first: string, last: string, id = `${first}-${last}`): Member {
  return {
    id,
    first_name: first,
    last_name: last,
    tenant_id: 't',
    access_scope: 'venue',
    created_at: '',
    updated_at: '',
    is_active: true,
    membership_start: '2026-01-01',
    membership_status: 'active',
    membership_type: 'monthly',
  } as unknown as Member;
}

const MEMBERS = [
  member('Aïssatou', 'Ba'),
  member('Awa', 'Ndiaye'),
  member('Moussa', 'Ndour'),
  member('Fatou', 'Ndao'),
];

describe('searchMembers', () => {
  it('returns nothing for an empty query', () => {
    expect(searchMembers(MEMBERS, '')).toEqual([]);
    expect(searchMembers(MEMBERS, '   ')).toEqual([]);
  });
  it('matches the start of any name word, ignoring case and diacritics', () => {
    expect(searchMembers(MEMBERS, 'ai').map((m) => m.first_name)).toEqual(['Aïssatou']);
    expect(searchMembers(MEMBERS, 'ND').map((m) => m.last_name)).toEqual([
      'Ndiaye',
      'Ndour',
      'Ndao',
    ]);
  });
  it('matches a full-name prefix across the space', () => {
    expect(searchMembers(MEMBERS, 'awa n').map((m) => m.last_name)).toEqual(['Ndiaye']);
  });
  it('respects the limit and keeps input order', () => {
    expect(searchMembers(MEMBERS, 'nd', 2).map((m) => m.last_name)).toEqual(['Ndiaye', 'Ndour']);
  });
  it('strips a trailing « · status » suffix so typing after a selection keeps matching the name', () => {
    expect(searchMembers(MEMBERS, 'Awa Ndiaye · Actif').map((m) => m.last_name)).toEqual([
      'Ndiaye',
    ]);
    expect(searchMembers(MEMBERS, 'Awa N · Actif').map((m) => m.last_name)).toEqual(['Ndiaye']);
  });
});

describe('labels', () => {
  it('memberName trims, memberLabel appends the status', () => {
    expect(memberName(member('Awa', 'Ndiaye'))).toBe('Awa Ndiaye');
    expect(memberLabel(member('Awa', 'Ndiaye'), 'Actif')).toBe('Awa Ndiaye · Actif');
  });
  it('memberInitials upper-cases two letters and falls back to ?', () => {
    expect(memberInitials(member('awa', 'ndiaye'))).toBe('AN');
    expect(memberInitials(undefined)).toBe('?');
    expect(memberInitials(member('', ''))).toBe('?');
  });
});
