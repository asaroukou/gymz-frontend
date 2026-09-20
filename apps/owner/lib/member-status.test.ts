import { describe, expect, it } from 'vitest';
import type { Member } from '@iziwellpass/api/schemas';
import { isExpiringSoon, memberStatusBadgeVariant } from './member-status';

function member(overrides: Partial<Member>): Member {
  return {
    id: 'm1',
    tenant_id: 't1',
    first_name: 'Awa',
    last_name: 'Ndiaye',
    email: null,
    phone: null,
    membership_type: 'monthly',
    membership_status: 'active',
    membership_start: '2026-09-01',
    membership_end: null,
    access_scope: 'chain_wide',
    is_active: true,
    notes: null,
    created_at: '2026-03-03T00:00:00Z',
    updated_at: '2026-03-03T00:00:00Z',
    ...overrides,
  } as Member;
}

function daysFromNow(days: number): string {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

describe('memberStatusBadgeVariant', () => {
  it('maps active → success, suspended → destructive, others → secondary', () => {
    expect(memberStatusBadgeVariant('active')).toBe('success');
    expect(memberStatusBadgeVariant('suspended')).toBe('destructive');
    expect(memberStatusBadgeVariant('expired')).toBe('secondary');
  });
});

describe('isExpiringSoon', () => {
  it('flags an active membership ending within 7 days', () => {
    expect(isExpiringSoon(member({ membership_end: daysFromNow(3) }))).toBe(true);
    expect(isExpiringSoon(member({ membership_end: daysFromNow(7) }))).toBe(true);
  });
  it('ignores far-off, past, missing, or non-active memberships', () => {
    expect(isExpiringSoon(member({ membership_end: daysFromNow(8) }))).toBe(false);
    expect(isExpiringSoon(member({ membership_end: daysFromNow(-1) }))).toBe(false);
    expect(isExpiringSoon(member({ membership_end: null }))).toBe(false);
    expect(
      isExpiringSoon(member({ membership_status: 'expired', membership_end: daysFromNow(2) })),
    ).toBe(false);
  });
});
