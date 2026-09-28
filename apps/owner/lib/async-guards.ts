/**
 * While a call is in flight, every further call gets that same promise
 * instead of starting another one. A code auto-submitted on its sixth digit
 * and then submitted again by Enter must reach Cognito once: a second
 * sendMFACode on the same challenge fails with « Invalid session ».
 */
export function singleFlight<A extends unknown[], R>(
  fn: (...args: A) => Promise<R>,
): (...args: A) => Promise<R> {
  let inflight: Promise<R> | null = null;
  return (...args: A) => {
    if (!inflight) {
      inflight = fn(...args).finally(() => {
        inflight = null;
      });
    }
    return inflight;
  };
}

/**
 * Runs `fn` once and hands every caller the same promise. A rejection is
 * forgotten so the next call retries. Used for AssociateSoftwareToken: each
 * call issues a new secret, so React StrictMode's double effect must not
 * call it twice.
 */
export function onceAsync<R>(fn: () => Promise<R>): () => Promise<R> {
  let memo: Promise<R> | null = null;
  return () => {
    if (!memo) {
      memo = fn();
      memo.catch(() => {
        memo = null;
      });
    }
    return memo;
  };
}
