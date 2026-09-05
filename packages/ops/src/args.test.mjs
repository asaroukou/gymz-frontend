import { describe, expect, it } from 'vitest';

import { isOperatorPoolName, isValidEmail, parseArgs, resolvePoolId } from './args.mjs';

describe('parseArgs', () => {
  it('reads the email and applies the default region', () => {
    expect(parseArgs(['--email', 'ops@example.com'])).toEqual({
      email: 'ops@example.com',
      region: 'eu-west-1',
      userPoolId: undefined,
      dryRun: false,
      resend: false,
      help: false,
    });
  });

  it('accepts --flag=value form', () => {
    const args = parseArgs(['--email=ops@example.com', '--region=us-east-1']);
    expect(args.email).toBe('ops@example.com');
    expect(args.region).toBe('us-east-1');
  });

  it('reads the boolean flags', () => {
    const args = parseArgs(['--email', 'ops@example.com', '--dry-run', '--resend']);
    expect(args.dryRun).toBe(true);
    expect(args.resend).toBe(true);
  });

  it('reads --user-pool-id', () => {
    expect(parseArgs(['--user-pool-id', 'eu-west-1_Abc123']).userPoolId).toBe('eu-west-1_Abc123');
  });

  it('sets help for -h and --help', () => {
    expect(parseArgs(['--help']).help).toBe(true);
    expect(parseArgs(['-h']).help).toBe(true);
  });

  it('rejects an unknown flag rather than silently ignoring it', () => {
    expect(() => parseArgs(['--emial', 'ops@example.com'])).toThrow(/unknown option/i);
  });

  it('rejects a value-taking flag with no value', () => {
    expect(() => parseArgs(['--email'])).toThrow(/--email/);
  });
});

describe('isValidEmail', () => {
  it('accepts an ordinary address', () => {
    expect(isValidEmail('ops@example.com')).toBe(true);
    expect(isValidEmail('first.last+tag@sub.example.co.uk')).toBe(true);
  });

  it('rejects malformed addresses', () => {
    for (const bad of ['', 'ops', 'ops@', '@example.com', 'ops example@x.com', 'ops@example']) {
      expect(isValidEmail(bad), bad).toBe(false);
    }
  });
});

describe('resolvePoolId', () => {
  it('prefers the explicit flag over everything else', () => {
    const got = resolvePoolId({
      flag: 'eu-west-1_Flag',
      env: { OPERATOR_USER_POOL_ID: 'eu-west-1_Env' },
      envFile: { NEXT_PUBLIC_COGNITO_USER_POOL_ID: 'eu-west-1_File' },
    });
    expect(got).toEqual({ userPoolId: 'eu-west-1_Flag', source: '--user-pool-id' });
  });

  it('falls back to OPERATOR_USER_POOL_ID', () => {
    const got = resolvePoolId({
      env: { OPERATOR_USER_POOL_ID: 'eu-west-1_Env' },
      envFile: { NEXT_PUBLIC_COGNITO_USER_POOL_ID: 'eu-west-1_File' },
    });
    expect(got).toEqual({ userPoolId: 'eu-west-1_Env', source: 'OPERATOR_USER_POOL_ID' });
  });

  it("falls back to the admin app's local env file", () => {
    const got = resolvePoolId({
      env: {},
      envFile: { NEXT_PUBLIC_COGNITO_USER_POOL_ID: 'eu-west-1_File' },
    });
    expect(got.userPoolId).toBe('eu-west-1_File');
    expect(got.source).toMatch(/apps\/admin\/\.env\.local/);
  });

  it('returns no pool id when nothing is configured', () => {
    expect(resolvePoolId({ env: {}, envFile: {} }).userPoolId).toBeUndefined();
  });
});

describe('isOperatorPoolName', () => {
  it('accepts operator pools across environments', () => {
    expect(isOperatorPoolName('iziwellpass-staging-operator')).toBe(true);
    expect(isOperatorPoolName('iziwellpass-prod-operator')).toBe(true);
  });

  it('rejects the main and consumer pools — the wrong-pool mistake this guard exists for', () => {
    expect(isOperatorPoolName('iziwellpass-staging')).toBe(false);
    expect(isOperatorPoolName('iziwellpass-staging-consumer')).toBe(false);
  });

  it('rejects a missing name rather than defaulting to permissive', () => {
    expect(isOperatorPoolName(undefined)).toBe(false);
    expect(isOperatorPoolName('')).toBe(false);
  });
});
