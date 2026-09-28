import { describe, expect, it } from 'vitest';

import { buildMemberUpdate, type MemberFormValues } from './member-update';

const values: MemberFormValues = {
  first_name: 'Awa',
  last_name: 'Ndiaye',
  email: 'awa@example.sn',
  phone: '',
  membership_type: 'monthly',
  membership_end: '',
  notes: '',
};

describe('buildMemberUpdate', () => {
  it('sends the given version as expected_version', () => {
    expect(buildMemberUpdate(values, { mode: 'roster', version: 'v-7' }).params).toEqual({
      expected_version: 'v-7',
    });
  });

  it('never sends is_active', () => {
    const { data } = buildMemberUpdate(values, { mode: 'roster', version: 'v' });
    expect(Object.keys(data)).not.toContain('is_active');
  });

  it('omits email entirely for a login member', () => {
    const { data } = buildMemberUpdate(values, { mode: 'login', version: 'v' });
    expect('email' in data).toBe(false);
  });

  it('sends the e-mail (or null) for a roster member', () => {
    expect(buildMemberUpdate(values, { mode: 'roster', version: 'v' }).data.email).toBe(
      'awa@example.sn',
    );
    expect(
      buildMemberUpdate({ ...values, email: '' }, { mode: 'roster', version: 'v' }).data.email,
    ).toBeNull();
  });

  it('turns empty optional fields into null', () => {
    const { data } = buildMemberUpdate(values, { mode: 'roster', version: 'v' });
    expect(data).toMatchObject({
      first_name: 'Awa',
      last_name: 'Ndiaye',
      phone: null,
      membership_type: 'monthly',
      membership_end: null,
      notes: null,
    });
  });
});
