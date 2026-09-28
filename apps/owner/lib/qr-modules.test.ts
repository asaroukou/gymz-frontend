import { describe, expect, it } from 'vitest';

import { qrModules } from './qr-modules';

const uri =
  'otpauth://totp/IziWellPass:moussa%40studioplateau.sn?secret=JBSWY3DPEHPK3PXPQMFRG3PZ2ZKQ&issuer=IziWellPass';

describe('qrModules', () => {
  it('returns a square module grid as one SVG path of unit squares', () => {
    const { size, path } = qrModules(uri);
    expect(size).toBeGreaterThanOrEqual(21);
    expect((size - 17) % 4).toBe(0);
    expect(path).toMatch(/^(M\d+ \d+h1v1h-1z)+$/);
  });

  it('starts with the top-left finder pattern corner', () => {
    expect(qrModules(uri).path.startsWith('M0 0h1v1h-1z')).toBe(true);
  });

  it('is deterministic', () => {
    expect(qrModules(uri)).toEqual(qrModules(uri));
  });

  it('fits a 52-character Cognito secret', () => {
    const long = uri.replace('JBSWY3DPEHPK3PXPQMFRG3PZ2ZKQ', 'A'.repeat(52));
    expect(qrModules(long).size).toBeLessThanOrEqual(49);
  });
});
