import { describe, expect, it } from 'vitest';

import { TOTP_ISSUER, buildOtpauthUri, formatSecret } from './totp';

describe('buildOtpauthUri', () => {
  it('builds a totp URI labelled issuer:account with the issuer parameter', () => {
    expect(buildOtpauthUri('moussa@studioplateau.sn', 'JBSWY3DP')).toBe(
      'otpauth://totp/IziWellPass:moussa%40studioplateau.sn?secret=JBSWY3DP&issuer=IziWellPass',
    );
  });

  it('encodes + and spaces in the account', () => {
    expect(buildOtpauthUri('awa+gym@x.sn', 'ABC', 'Izi Well')).toBe(
      'otpauth://totp/Izi%20Well:awa%2Bgym%40x.sn?secret=ABC&issuer=Izi%20Well',
    );
  });

  it('defaults the issuer to IziWellPass', () => {
    expect(TOTP_ISSUER).toBe('IziWellPass');
  });
});

describe('formatSecret', () => {
  it('groups the secret by four', () => {
    expect(formatSecret('JBSWY3DPEHPK3PXPQMFRG3PZ2ZKQ')).toBe('JBSW Y3DP EHPK 3PXP QMFR G3PZ 2ZKQ');
  });

  it('drops existing whitespace and keeps a short last group', () => {
    expect(formatSecret(' ab cd ef ')).toBe('abcd ef');
  });

  it('returns an empty string for an empty secret', () => {
    expect(formatSecret('')).toBe('');
  });
});
