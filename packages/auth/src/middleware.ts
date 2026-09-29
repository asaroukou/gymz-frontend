// Next.js proxy (formerly middleware) factory: server-side redirect for signed-out users based
// on the marker cookie. UX-only guard — API authorization is the real boundary.

import { NextResponse, type NextRequest } from 'next/server';

import { SESSION_COOKIE } from './session-cookie';

export interface AuthMiddlewareOptions {
  /** Where to send signed-out users (receives ?next=<original path>). */
  loginPath: string;
  /** Path prefixes reachable without a session (login/signup/confirm/etc.). */
  publicPaths: string[];
}

export function createAuthMiddleware(options: AuthMiddlewareOptions) {
  return function authMiddleware(request: NextRequest): NextResponse {
    const { pathname } = request.nextUrl;

    const isPublic = options.publicPaths.some(
      (p) => pathname === p || pathname.startsWith(`${p}/`),
    );
    if (isPublic) {
      return NextResponse.next();
    }

    if (request.cookies.get(SESSION_COOKIE)?.value === '1') {
      return NextResponse.next();
    }

    const loginUrl = new URL(options.loginPath, request.url);
    loginUrl.searchParams.set('next', pathname);
    return NextResponse.redirect(loginUrl);
  };
}
