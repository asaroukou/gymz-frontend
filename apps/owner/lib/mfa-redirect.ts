import { isMfaPath } from './next-path';

/**
 * The owner app's `onMfaRequired` hook: the backend refused an owner/admin
 * whose token lacks the MFA claim, so send them to the enrolment page. A
 * dashboard fires several queries at once and every one gets the 403, so only
 * the first call redirects; nothing happens on the enrolment page itself.
 */
export function createMfaRedirect(deps: {
  getLocation: () => { pathname: string; search: string };
  assign: (url: string) => void;
}): () => void {
  let fired = false;
  return () => {
    const { pathname, search } = deps.getLocation();
    if (fired || isMfaPath(pathname)) return;
    fired = true;
    deps.assign(`/mfa?next=${encodeURIComponent(pathname + search)}`);
  };
}
