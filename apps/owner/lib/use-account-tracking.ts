'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

import type { MemberAccountSummary } from '@iziwellpass/api/schemas';

import {
  POLL_INTERVAL_MS,
  POLL_WINDOW_MS,
  hasRunningOperation,
  runningOperationIds,
} from './member-account';

export interface AccountTracking {
  watched: ReadonlySet<string>;
  watch: (id: string) => void;
  stale: boolean;
  refresh: () => void;
}

/**
 * Spec MM3: follow identity operations by refetching the member. Polls every
 * 2 s while one runs, for at most 30 s per window; `refresh` refetches and
 * opens a new window. Operations already running when first seen are watched,
 * so their result shows even if another tab started them.
 */
export function useAccountTracking(
  account: MemberAccountSummary | undefined,
  refetch: () => unknown,
): AccountTracking {
  const [watched, setWatched] = useState<ReadonlySet<string>>(() => new Set());
  const [stale, setStale] = useState(false);
  const [epoch, setEpoch] = useState(0);
  const refetchRef = useRef(refetch);
  useEffect(() => {
    refetchRef.current = refetch;
  }, [refetch]);
  const running = account ? hasRunningOperation(account) : false;
  const runningKey = account ? runningOperationIds(account).join(',') : '';

  useEffect(() => {
    if (!runningKey) return;
    setWatched((prev) => {
      const ids = runningKey.split(',');
      if (ids.every((id) => prev.has(id))) return prev;
      return new Set([...prev, ...ids]);
    });
  }, [runningKey]);

  useEffect(() => {
    setStale(false);
    if (!running) return;
    const poll = setInterval(() => void refetchRef.current(), POLL_INTERVAL_MS);
    const windowEnd = setTimeout(() => {
      clearInterval(poll);
      setStale(true);
    }, POLL_WINDOW_MS);
    return () => {
      clearInterval(poll);
      clearTimeout(windowEnd);
    };
  }, [running, epoch]);

  const watch = useCallback((id: string) => {
    setWatched((prev) => (prev.has(id) ? prev : new Set([...prev, id])));
  }, []);
  const refresh = useCallback(() => {
    void refetchRef.current();
    setEpoch((e) => e + 1);
  }, []);

  return { watched, watch, stale: running && stale, refresh };
}
