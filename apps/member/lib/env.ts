// EXPO_PUBLIC_* are inlined at build time by Expo; read them once here.
function required(name: string, value: string | undefined): string {
  if (!value) {
    console.error(`[env] ${name} is not set — check apps/member/.env.local`);
    return '';
  }
  return value;
}

export const env = {
  apiBaseUrl: required('EXPO_PUBLIC_API_BASE_URL', process.env.EXPO_PUBLIC_API_BASE_URL),
  cognitoUserPoolId: required(
    'EXPO_PUBLIC_COGNITO_USER_POOL_ID',
    process.env.EXPO_PUBLIC_COGNITO_USER_POOL_ID,
  ),
  cognitoClientId: required(
    'EXPO_PUBLIC_COGNITO_CLIENT_ID',
    process.env.EXPO_PUBLIC_COGNITO_CLIENT_ID,
  ),
} as const;
