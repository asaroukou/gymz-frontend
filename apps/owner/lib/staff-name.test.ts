import { describe, expect, it } from 'vitest';
import { staffInitials, staffName } from './staff-name';

describe('staff-name', () => {
  it('joins and trims the name', () => {
    expect(staffName({ first_name: 'Moussa', last_name: 'Diallo' })).toBe('Moussa Diallo');
    expect(staffName({ first_name: 'Moussa', last_name: '' })).toBe('Moussa');
  });
  it('builds upper-case initials with a fallback', () => {
    expect(staffInitials({ first_name: 'moussa', last_name: 'diallo' })).toBe('MD');
    expect(staffInitials({ first_name: '', last_name: '' })).toBe('?');
  });
});
