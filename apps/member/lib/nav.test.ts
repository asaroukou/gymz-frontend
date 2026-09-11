import { describe, expect, it } from 'vitest';
import { redirectTarget } from './nav';

describe('redirectTarget', () => {
  it('sends signed-out users in the app group to login', () => {
    expect(redirectTarget('signed-out', false)).toBe('/login');
  });
  it('sends signed-in users on the login screen into the app', () => {
    expect(redirectTarget('signed-in', true)).toBe('/');
  });
  it('does nothing while loading', () => {
    expect(redirectTarget('loading', true)).toBeNull();
    expect(redirectTarget('loading', false)).toBeNull();
  });
  it('leaves correctly-placed users alone', () => {
    expect(redirectTarget('signed-in', false)).toBeNull();
    expect(redirectTarget('signed-out', true)).toBeNull();
  });
});
