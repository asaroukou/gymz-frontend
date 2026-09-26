'use client';

import { useEffect, useState } from 'react';

/**
 * A render tick that advances every `intervalMs`. A screen that reads
 * `Date.now()` indirectly (e.g. `venueToday(timeZone)` for the day key) only
 * ever recomputes on its own re-renders; on a front-desk tablet left open and
 * idle that can mean the midnight rollover — and everything derived from
 * "today" — never happens until something unrelated forces a render. The
 * returned value is not meant to be read; the point is the subscription.
 */
export function useNow(intervalMs: number): number {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), intervalMs);
    return () => clearInterval(id);
  }, [intervalMs]);
  return now;
}
