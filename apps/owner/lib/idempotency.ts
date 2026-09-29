export interface KeyState {
  key: string;
  email: string;
}

/** Whether two addresses are the same mailbox, for « C'est déjà l'adresse actuelle ». */
export function sameAddress(a: string, b: string): boolean {
  return a.trim().toLowerCase() === b.trim().toLowerCase();
}

/**
 * One Idempotency-Key per request body: reuse it when the exact trimmed
 * address is sent again, renew it on any difference, case included, since
 * the body carries the address as typed and a reused key with a different
 * body is refused (422 IDEMPOTENCY_KEY_REUSED).
 */
export function idempotencyKeyFor(
  prev: KeyState | null,
  email: string,
  newKey: () => string,
): KeyState {
  const sent = email.trim();
  if (prev && prev.email === sent) return prev;
  return { key: newKey(), email: sent };
}
