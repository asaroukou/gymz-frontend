import { SESSION_COOKIE, clearSessionCookie, setSessionCookie } from './session-cookie';

describe('session cookie', () => {
  afterEach(() => {
    clearSessionCookie();
  });

  it('sets the marker cookie', () => {
    setSessionCookie();
    expect(document.cookie).toContain(`${SESSION_COOKIE}=1`);
  });

  it('clears the marker cookie', () => {
    setSessionCookie();
    clearSessionCookie();
    expect(document.cookie).not.toContain(`${SESSION_COOKIE}=1`);
  });
});
