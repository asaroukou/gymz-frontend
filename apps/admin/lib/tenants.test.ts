import { describe, expect, it } from 'vitest';

import {
  isForbidden,
  STATUS_FILTERS,
  statusBadgeVariant,
  statusParam,
  TENANTS_PAGE_SIZE,
} from './tenants';

describe('statusParam', () => {
  it("maps 'all' to undefined (no query param)", () => {
    expect(statusParam('all')).toBeUndefined();
  });
  it('passes concrete statuses through', () => {
    expect(statusParam('active')).toBe('active');
    expect(statusParam('suspended')).toBe('suspended');
    expect(statusParam('offboarding')).toBe('offboarding');
  });
});

describe('statusBadgeVariant', () => {
  it('covers every TenantStatus', () => {
    expect(statusBadgeVariant('active')).toBe('success');
    expect(statusBadgeVariant('suspended')).toBe('warning');
    expect(statusBadgeVariant('offboarding')).toBe('destructive');
  });
});

describe('isForbidden', () => {
  it('detects a 403 ApiError-shaped object', () => {
    expect(isForbidden({ status: 403 })).toBe(true);
  });
  it('rejects other statuses and non-objects', () => {
    expect(isForbidden({ status: 401 })).toBe(false);
    expect(isForbidden(new Error('x'))).toBe(false);
    expect(isForbidden(null)).toBe(false);
  });
});

describe('constants', () => {
  it('page size matches the API default ceiling we page by', () => {
    expect(TENANTS_PAGE_SIZE).toBe(50);
  });
  it("filters start with 'all'", () => {
    expect(STATUS_FILTERS[0]).toBe('all');
  });
});
