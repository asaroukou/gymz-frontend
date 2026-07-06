import { createAuthMiddleware } from '@iziwellpass/auth/middleware';

export const middleware = createAuthMiddleware({
  loginPath: '/login',
  publicPaths: ['/login', '/signup', '/confirm'],
});

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
};
