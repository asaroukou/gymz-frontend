// EXPO_PUBLIC_* are inlined at build time by Expo; read them once here.
function required(name: string, value: string | undefined): string {
  if (!value) {
    throw new Error(`[env] ${name} is not set — copy apps/member/.env.example to .env.local`);
  }
  return value;
}

// '1' swaps Cognito for the offline mock auth client (dev only). With the mock
// on, the Cognito ids are unused, so they are not required either.
const AUTH_MOCK = process.env.EXPO_PUBLIC_AUTH_MOCK === '1';

export const env = {
  authMock: AUTH_MOCK,
  apiBaseUrl: required('EXPO_PUBLIC_API_BASE_URL', process.env.EXPO_PUBLIC_API_BASE_URL),
  cognitoUserPoolId: AUTH_MOCK
    ? (process.env.EXPO_PUBLIC_COGNITO_USER_POOL_ID ?? 'mock')
    : required('EXPO_PUBLIC_COGNITO_USER_POOL_ID', process.env.EXPO_PUBLIC_COGNITO_USER_POOL_ID),
  cognitoClientId: AUTH_MOCK
    ? (process.env.EXPO_PUBLIC_COGNITO_CLIENT_ID ?? 'mock')
    : required('EXPO_PUBLIC_COGNITO_CLIENT_ID', process.env.EXPO_PUBLIC_COGNITO_CLIENT_ID),
} as const;
