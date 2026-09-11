export type AuthStatus = 'loading' | 'signed-in' | 'signed-out';

/**
 * Where to redirect given auth status and whether the current route is inside
 * the (auth) group. Returns null when no navigation is needed.
 */
export function redirectTarget(status: AuthStatus, inAuthGroup: boolean): '/login' | '/' | null {
  if (status === 'loading') return null;
  if (status === 'signed-out' && !inAuthGroup) return '/login';
  if (status === 'signed-in' && inAuthGroup) return '/';
  return null;
}
