import { NextRequest } from 'next/server';
import { describe, expect, it } from 'vitest';

import { createAuthMiddleware } from './middleware';
import { SESSION_COOKIE } from './session-cookie';

const middleware = createAuthMiddleware({
  loginPath: '/login',
  publicPaths: ['/login', '/signup', '/confirm'],
});

function request(path: string, cookie?: string): NextRequest {
  return new NextRequest(`https://app.test${path}`, {
    headers: cookie ? { cookie } : {},
  });
}

describe('createAuthMiddleware', () => {
  it('redirects signed-out users to login with a next param', () => {
    const res = middleware(request('/members'));
    expect(res.status).toBe(307);
    const location = new URL(res.headers.get('location') ?? '');
    expect(location.pathname).toBe('/login');
    expect(location.searchParams.get('next')).toBe('/members');
  });

  it('passes through when the session cookie is present', () => {
    const res = middleware(request('/members', `${SESSION_COOKIE}=1`));
    expect(res.headers.get('location')).toBeNull();
  });

  it('passes through on public paths without a cookie', () => {
    const res = middleware(request('/login'));
    expect(res.headers.get('location')).toBeNull();
  });

  it('treats public paths as prefixes', () => {
    const res = middleware(request('/signup/confirm-step'));
    expect(res.headers.get('location')).toBeNull();
  });
});
