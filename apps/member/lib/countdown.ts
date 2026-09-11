/** Whole seconds from now until a Unix-seconds expiry, floored at 0. */
export function secondsUntil(expiresAtUnix: number, nowMs: number = Date.now()): number {
  const remainingMs = expiresAtUnix * 1000 - nowMs;
  return remainingMs <= 0 ? 0 : Math.floor(remainingMs / 1000);
}
