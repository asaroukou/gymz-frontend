import { describe, expect, it } from 'vitest';
import { roleBadgeVariant } from './role-badge';

describe('roleBadgeVariant', () => {
  it('reads owner and admin as info, the rest as neutral', () => {
    expect(roleBadgeVariant('owner')).toBe('info');
    expect(roleBadgeVariant('admin')).toBe('info');
    expect(roleBadgeVariant('trainer')).toBe('default');
    expect(roleBadgeVariant('receptionist')).toBe('default');
  });
});
