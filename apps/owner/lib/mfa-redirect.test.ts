import { describe, expect, it, vi } from 'vitest';

import { createMfaRedirect } from './mfa-redirect';

const at = (pathname: string, search = '') => () => ({ pathname, search });

describe('createMfaRedirect', () => {
  it('sends the user to /mfa with the current path and query as next', () => {
    const assign = vi.fn();
    createMfaRedirect({ getLocation: at('/members', '?q=awa'), assign })();
    expect(assign).toHaveBeenCalledWith('/mfa?next=%2Fmembers%3Fq%3Dawa');
  });

  it('redirects once for a burst of refusals', () => {
    const assign = vi.fn();
    const redirect = createMfaRedirect({ getLocation: at('/'), assign });
    for (let i = 0; i < 6; i += 1) redirect();
    expect(assign).toHaveBeenCalledTimes(1);
  });

  it('does nothing while already on the enrolment page', () => {
    const assign = vi.fn();
    const redirect = createMfaRedirect({ getLocation: at('/mfa', '?next=%2F'), assign });
    redirect();
    expect(assign).not.toHaveBeenCalled();
  });
});
