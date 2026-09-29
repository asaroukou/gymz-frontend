import { describe, expect, it } from 'vitest';

import { createMemberMockClient } from './member-mock';

describe('createMemberMockClient', () => {
  it('signs a member in', async () => {
    const result = await createMemberMockClient().signIn('awa@x.sn', 'anything');
    expect(result.kind).toBe('success');
  });

  it('refuses a TOTP challenge like bad credentials', async () => {
    await expect(createMemberMockClient().signIn('awa@x.sn', 'totp')).rejects.toMatchObject({
      name: 'NotAuthorizedException',
    });
  });

  it('verifies the e-mail code 123456 and maps the demo codes', async () => {
    const client = createMemberMockClient();
    await expect(client.verifyEmailCode('123456')).resolves.toBeUndefined();
    await expect(client.verifyEmailCode('000000')).rejects.toMatchObject({ name: 'ExpiredCodeException' });
    await expect(client.verifyEmailCode('111111')).rejects.toMatchObject({ name: 'AliasExistsException' });
    await expect(client.verifyEmailCode('999999')).rejects.toMatchObject({ name: 'LimitExceededException' });
    await expect(client.verifyEmailCode('424242')).rejects.toMatchObject({ name: 'CodeMismatchException' });
    await expect(client.resendEmailCode()).resolves.toBeUndefined();
  });
});
