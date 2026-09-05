// Pure argument/config logic for create-operator.mjs. Kept free of AWS calls and
// filesystem reads so it can be unit-tested without credentials.

import { existsSync, readFileSync } from 'node:fs';

/** Flags that consume the following argv entry (or a `=value` suffix). */
const VALUE_FLAGS = new Map([
  ['--email', 'email'],
  ['--region', 'region'],
  ['--user-pool-id', 'userPoolId'],
]);

/** Flags that stand alone. */
const BOOLEAN_FLAGS = new Map([
  ['--dry-run', 'dryRun'],
  ['--resend', 'resend'],
  ['--help', 'help'],
  ['-h', 'help'],
]);

export const DEFAULT_REGION = 'eu-west-1';

/**
 * Parses argv (without node/script entries).
 * Throws on unknown options rather than ignoring them: a silently dropped
 * `--user-pool-id` would create the account in whatever pool the fallbacks
 * resolve to, which is exactly the mistake this tool must not make.
 */
export function parseArgs(argv) {
  const args = {
    email: undefined,
    region: DEFAULT_REGION,
    userPoolId: undefined,
    dryRun: false,
    resend: false,
    help: false,
  };

  for (let i = 0; i < argv.length; i += 1) {
    const raw = argv[i];
    const eq = raw.indexOf('=');
    const name = eq === -1 ? raw : raw.slice(0, eq);

    if (BOOLEAN_FLAGS.has(name)) {
      args[BOOLEAN_FLAGS.get(name)] = true;
      continue;
    }

    if (VALUE_FLAGS.has(name)) {
      let value;
      if (eq === -1) {
        value = argv[i + 1];
        i += 1;
      } else {
        value = raw.slice(eq + 1);
      }
      if (value === undefined || value === '' || value.startsWith('--')) {
        throw new Error(`Option ${name} requires a value.`);
      }
      args[VALUE_FLAGS.get(name)] = value;
      continue;
    }

    throw new Error(`Unknown option: ${raw}`);
  }

  return args;
}

/**
 * Deliberately conservative: local part, single @, dotted domain with a 2+ char
 * TLD. Cognito is the real validator — this only catches typos before we spend
 * an API call and create an account nobody can receive mail for.
 */
export function isValidEmail(value) {
  return typeof value === 'string' && /^[^\s@]+@[^\s@.]+(\.[^\s@.]+)+$/.test(value);
}

export const ADMIN_ENV_PATH = 'apps/admin/.env.local';

/**
 * Resolution order, most explicit first. Returns the source too, so the script
 * can print where the pool id came from — creating an operator in the wrong
 * pool is the failure this tool most needs to make visible.
 */
export function resolvePoolId({ flag, env = {}, envFile = {} } = {}) {
  if (flag) {
    return { userPoolId: flag, source: '--user-pool-id' };
  }
  if (env.OPERATOR_USER_POOL_ID) {
    return { userPoolId: env.OPERATOR_USER_POOL_ID, source: 'OPERATOR_USER_POOL_ID' };
  }
  if (envFile.NEXT_PUBLIC_COGNITO_USER_POOL_ID) {
    return {
      userPoolId: envFile.NEXT_PUBLIC_COGNITO_USER_POOL_ID,
      source: `${ADMIN_ENV_PATH} (NEXT_PUBLIC_COGNITO_USER_POOL_ID)`,
    };
  }
  return { userPoolId: undefined, source: undefined };
}

/**
 * The operator pool is named `iziwellpass-<env>-operator` (OperatorCognito in
 * the CDK). The main pool is `iziwellpass-<env>` and the consumer pool
 * `-consumer`; the integration doc calls using the wrong pool a common mistake,
 * so we verify the name instead of trusting the id.
 */
export function isOperatorPoolName(name) {
  return typeof name === 'string' && name.endsWith('-operator');
}

/** Minimal KEY=value reader. Ignores comments/blank lines; does not expand vars. */
export function readEnvFile(filePath) {
  if (!existsSync(filePath)) {
    return {};
  }
  const out = {};
  for (const line of readFileSync(filePath, 'utf8').split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) {
      continue;
    }
    const eq = trimmed.indexOf('=');
    if (eq === -1) {
      continue;
    }
    out[trimmed.slice(0, eq).trim()] = trimmed.slice(eq + 1).trim();
  }
  return out;
}
