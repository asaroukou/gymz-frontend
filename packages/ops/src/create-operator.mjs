#!/usr/bin/env node
// Creates a platform-operator account in the IziWellPass operator Cognito pool.
//
// Operator accounts cannot self-register: the operator pool has
// selfSignUpEnabled: false, so AdminCreateUser is the only way in (see
// iziwellpass/docs/client-integration.md). Cognito emails a temporary password;
// the admin app's login page (apps/admin, port 3012) handles the resulting
// newPasswordRequired challenge.
//
// Authorization needs no group or attribute: the operator pool's pre-token
// trigger stamps role=platform_admin on every token it issues, so membership in
// the pool IS the grant (lambdas/pretoken-operator in the API repo).
//
// Usage:
//   pnpm create:operator --email ops@example.com
//   pnpm create:operator --email ops@example.com --dry-run
//   pnpm create:operator --email ops@example.com --resend
//
// Requires AWS credentials with cognito-idp:AdminCreateUser and
// cognito-idp:DescribeUserPool on the operator pool (standard credential chain:
// AWS_PROFILE, env vars, SSO, instance role).

import path from 'node:path';
import process from 'node:process';

import {
  AdminCreateUserCommand,
  CognitoIdentityProviderClient,
  DescribeUserPoolCommand,
} from '@aws-sdk/client-cognito-identity-provider';

import {
  ADMIN_ENV_PATH,
  DEFAULT_REGION,
  isOperatorPoolName,
  isValidEmail,
  parseArgs,
  readEnvFile,
  resolvePoolId,
} from './args.mjs';

const repoRoot = path.resolve(import.meta.dirname, '../../..');

const USAGE = `Create a platform-operator account (IziWellPass admin app).

Usage:
  pnpm create:operator --email <address> [options]

Options:
  --email <address>       Operator's email. Cognito mails the temporary password here.
  --user-pool-id <id>     Operator pool id. Default: OPERATOR_USER_POOL_ID, else
                          NEXT_PUBLIC_COGNITO_USER_POOL_ID from ${ADMIN_ENV_PATH}.
  --region <region>       AWS region (default: ${DEFAULT_REGION}).
  --resend                Re-send the temporary password to an existing account.
  --dry-run               Print the call without creating anything.
  -h, --help              Show this help.

The pool's name must end in '-operator'; the script refuses otherwise so a
mistyped id cannot mint an account in the staff or consumer pool.`;

function fail(message, hint) {
  console.error(`create-operator: ${message}`);
  if (hint) {
    console.error(hint);
  }
  process.exit(1);
}

let args;
try {
  args = parseArgs(process.argv.slice(2));
} catch (err) {
  fail(err.message, `\n${USAGE}`);
}

if (args.help) {
  console.log(USAGE);
  process.exit(0);
}

if (!args.email) {
  fail('--email is required.', `\n${USAGE}`);
}
if (!isValidEmail(args.email)) {
  fail(`--email does not look like an email address: ${args.email}`);
}

const envFile = readEnvFile(path.join(repoRoot, ADMIN_ENV_PATH));
const { userPoolId, source } = resolvePoolId({
  flag: args.userPoolId,
  env: process.env,
  envFile,
});

if (!userPoolId) {
  fail(
    'no operator user pool id found.',
    `Pass --user-pool-id, set OPERATOR_USER_POOL_ID, or put\n` +
      `NEXT_PUBLIC_COGNITO_USER_POOL_ID in ${ADMIN_ENV_PATH}.\n` +
      `Current values live in iziwellpass/docs/client-integration.md.`,
  );
}

const client = new CognitoIdentityProviderClient({ region: args.region });

// Verify the pool is the operator pool BEFORE creating anything. The
// integration doc names "wrong pool" as a common mistake, and the ids carry no
// hint of which pool they are.
let poolName;
try {
  const described = await client.send(new DescribeUserPoolCommand({ UserPoolId: userPoolId }));
  poolName = described.UserPool?.Name;
} catch (err) {
  if (err.name === 'ResourceNotFoundException') {
    fail(
      `user pool ${userPoolId} not found in ${args.region}.`,
      `Resolved from: ${source}.\n` +
        `Two common causes, in order of likelihood:\n` +
        `  1. Your credentials are for the wrong AWS account. Check with\n` +
        `     \`aws sts get-caller-identity\` — staging lives in its own burner account.\n` +
        `  2. The pool id is stale. Staging stacks are rebuilt often; current ids\n` +
        `     are in iziwellpass/docs/client-integration.md.`,
    );
  }
  if (err.name === 'AccessDeniedException' || err.name === 'NotAuthorizedException') {
    fail(
      `not authorized to describe ${userPoolId}.`,
      `AWS_PROFILE=${process.env.AWS_PROFILE ?? '(default)'} — needs\n` +
        `cognito-idp:DescribeUserPool and cognito-idp:AdminCreateUser.`,
    );
  }
  if (err.name === 'CredentialsProviderError') {
    fail('no AWS credentials found.', 'Set AWS_PROFILE, run `aws sso login`, or export keys.');
  }
  fail(`could not describe user pool ${userPoolId}: ${err.name}: ${err.message}`);
}

if (!isOperatorPoolName(poolName)) {
  fail(
    `refusing to create an operator in pool "${poolName}" (${userPoolId}).`,
    `Resolved from: ${source}.\n` +
      `Operator pools are named iziwellpass-<env>-operator. This looks like the\n` +
      `staff/main or consumer pool — creating an account there would grant the\n` +
      `wrong access. Pass the operator pool with --user-pool-id.`,
  );
}

const input = {
  UserPoolId: userPoolId,
  Username: args.email,
  UserAttributes: [
    { Name: 'email', Value: args.email },
    // Pre-verified: the operator receives the temporary password at this
    // address, so a separate verification round-trip buys nothing.
    { Name: 'email_verified', Value: 'true' },
  ],
  DesiredDeliveryMediums: ['EMAIL'],
  ...(args.resend ? { MessageAction: 'RESEND' } : {}),
};

console.log(`Pool:   ${poolName} (${userPoolId})`);
console.log(`Source: ${source}`);
console.log(`Region: ${args.region}`);
console.log(`Email:  ${args.email}`);
console.log(`Action: ${args.resend ? 'RESEND temporary password' : 'create operator'}`);

if (args.dryRun) {
  console.log('\n--dry-run: no account created. Call that would be made:');
  console.log(JSON.stringify({ AdminCreateUser: input }, null, 2));
  process.exit(0);
}

try {
  const result = await client.send(new AdminCreateUserCommand(input));
  const status = result.User?.UserStatus;
  console.log(
    `\n✓ ${args.resend ? 'Temporary password re-sent' : 'Operator created'} — status ${status}.`,
  );
  console.log('Cognito emailed a temporary password. Next steps for the operator:');
  console.log('  1. Start the admin app:  pnpm --filter @iziwellpass/admin dev   (port 3012)');
  console.log('  2. Sign in with the email and temporary password.');
  console.log('  3. Set a new password when prompted (Cognito new-password challenge).');
} catch (err) {
  if (err.name === 'UsernameExistsException') {
    fail(
      `an account already exists for ${args.email}.`,
      'Re-send its temporary password with --resend (only works while the\n' +
        'account is still FORCE_CHANGE_PASSWORD).',
    );
  }
  if (err.name === 'UserNotFoundException') {
    fail(`no account for ${args.email} to resend to.`, 'Drop --resend to create it.');
  }
  if (err.name === 'AccessDeniedException' || err.name === 'NotAuthorizedException') {
    fail(
      'not authorized to create users in this pool.',
      `AWS_PROFILE=${process.env.AWS_PROFILE ?? '(default)'} — needs cognito-idp:AdminCreateUser.`,
    );
  }
  if (err.name === 'InvalidParameterException') {
    fail(`Cognito rejected the request: ${err.message}`);
  }
  fail(`${err.name}: ${err.message}`);
}
