export interface KeyState {
  key: string;
  email: string;
}

export function normalizeEmail(value: string): string {
  return value.trim().toLowerCase();
}

/** One Idempotency-Key per intended address: reuse on retry, renew when the address changes. */
export function idempotencyKeyFor(
  prev: KeyState | null,
  email: string,
  newKey: () => string,
): KeyState {
  const normalized = normalizeEmail(email);
  if (prev && prev.email === normalized) return prev;
  return { key: newKey(), email: normalized };
}
