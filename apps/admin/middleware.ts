import { createAuthMiddleware } from '@iziwellpass/auth/middleware';

export const middleware = createAuthMiddleware({
  loginPath: '/login',
  publicPaths: ['/login'],
});

export const config = {
  // Excludes the /api/control proxy: those are fetch() calls carrying a
  // Bearer token — a 307-to-login redirect there would hand HTML to the
  // API client.
  matcher: ['/((?!_next/static|_next/image|favicon.ico|api/control).*)'],
};
