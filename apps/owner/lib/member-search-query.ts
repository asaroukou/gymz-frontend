'use client';

import { useEffect, useState } from 'react';
import { keepPreviousData, useInfiniteQuery } from '@tanstack/react-query';

import { searchMembers } from '@iziwellpass/api/generated';
import type { MemberSearchRequest } from '@iziwellpass/api/schemas';

export type DirectoryScope = 'venue' | 'all';
export type DirectoryStatus = 'all' | 'active' | 'expired' | 'suspended';

export const MEMBER_SEARCH_KEY = ['members', 'search'] as const;
export const SEARCH_PAGE_SIZE = 20;
const Q_MAX = 100;

/**
 * Builds the `POST /gms/v1/members/search` body. `null` means the search is
 * not runnable yet (venue scope with no venue selected) — the caller disables
 * the query in that case rather than sending a request.
 */
export function buildSearchRequest(input: {
  scope: DirectoryScope;
  venueId: string | null;
  status: DirectoryStatus;
  q: string;
  cursor?: string | null;
}): MemberSearchRequest | null {
  if (input.scope === 'venue' && !input.venueId) return null;
  const q = input.q.trim().slice(0, Q_MAX);
  return {
    ...(input.scope === 'all' ? { all_venues: true } : { venue_id: input.venueId }),
    status: input.status,
    ...(q ? { q } : {}),
    ...(input.cursor ? { cursor: input.cursor } : {}),
    limit: SEARCH_PAGE_SIZE,
  };
}

/** Debounces `value` by `ms`: the directory search input uses this to avoid a request per keystroke. */
export function useDebouncedValue<T>(value: T, ms: number): T {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setDebounced(value), ms);
    return () => clearTimeout(t);
  }, [value, ms]);
  return debounced;
}

/**
 * Infinite query over the member directory search. `q` travels only in the
 * POST body, never in the URL or as a query key's URL part — personal data
 * (names, emails, phone numbers) must not end up in server or proxy access
 * logs.
 */
export function useMemberSearch(input: {
  scope: DirectoryScope;
  venueId: string | null;
  status: DirectoryStatus;
  q: string;
}) {
  const q = input.q.trim().slice(0, Q_MAX);
  const enabled = buildSearchRequest(input) !== null;
  return useInfiniteQuery({
    queryKey: [...MEMBER_SEARCH_KEY, input.scope, input.venueId, input.status, q],
    enabled,
    initialPageParam: null as string | null,
    queryFn: ({ pageParam, signal }) => {
      const body = buildSearchRequest({ ...input, cursor: pageParam });
      if (!body) {
        // Unreachable while `enabled` is false, but keeps the function total
        // without a non-null assertion.
        throw new Error('member search is disabled without a selected venue');
      }
      return searchMembers(body, { signal });
    },
    getNextPageParam: (last) => last.meta.next_cursor ?? null,
    placeholderData: keepPreviousData,
  });
}
