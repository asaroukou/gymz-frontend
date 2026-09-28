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
});
