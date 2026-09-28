// Pure helpers for TOTP enrolment: the otpauth:// URI authenticator apps scan,
// and the grouped secret shown for manual entry.

/** What `AuthClient.startTotpSetup()` hands the enrolment screen. */
export interface TotpSetup {
  /** Base32 secret from Cognito's AssociateSoftwareToken. */
  secret: string;
  /** `otpauth://totp/...` URI rendered as the QR code. */
  otpauthUri: string;
}

/** Issuer shown in the user's authenticator app. */
export const TOTP_ISSUER = 'IziWellPass';

/** Key URI format: https://github.com/google/google-authenticator/wiki/Key-Uri-Format */
export function buildOtpauthUri(account: string, secret: string, issuer = TOTP_ISSUER): string {
  const label = `${encodeURIComponent(issuer)}:${encodeURIComponent(account)}`;
  return `otpauth://totp/${label}?secret=${secret}&issuer=${encodeURIComponent(issuer)}`;
}

/** « JBSW Y3DP EHPK … »: groups of four for reading aloud or typing by hand. */
export function formatSecret(secret: string): string {
  return (secret.replace(/\s+/g, '').match(/.{1,4}/g) ?? []).join(' ');
}
