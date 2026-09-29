import { createAuthMiddleware } from '@iziwellpass/auth/middleware';

export const proxy = createAuthMiddleware({
  loginPath: '/login',
  // '/design' is the design-system preview: components only, never data, and
  // marked noindex. Prefix match, so this covers the whole group.
  publicPaths: ['/login', '/design'],
});

export const config = {
  // Excludes the /api/control proxy: those are fetch() calls carrying a
  // Bearer token — a 307-to-login redirect there would hand HTML to the
  // API client.
  matcher: ['/((?!_next/static|_next/image|favicon.ico|api/control).*)'],
};
