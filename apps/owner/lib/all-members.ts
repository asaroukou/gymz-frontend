'use client';

import { useQuery } from '@tanstack/react-query';

import { customFetch } from '@iziwellpass/api/client';
import { getListMembersQueryKey, getListMembersUrl } from '@iziwellpass/api/generated';
import type { Member, PaginatedApiResponseVecMember } from '@iziwellpass/api/schemas';

/**
 * Materialize the FULL member list via cursor pagination.
 *
 * `GET /gms/v1/members` is paginated: it caps `limit` at 100 and returns a
 * `meta.next_cursor`. Several consumers need the whole set rather than a page —
 * the dashboard "active members" count and the check-in name maps — so this
 * helper walks the cursor to completion and concatenates the pages.
 *
 * The thin `useAllMembers` wrapper keeps every call site on one query-key prefix
 * (`getListMembersQueryKey`) so register/suspend/edit invalidations still match.
 *
 * This is a candidate to replace with server-side search in a later WS6 phase
 * (browse-page search + async pickers); until then, the full list backs the
 * client-side filter and the aggregate consumers.
 */

/** Endpoint maximum page size — fewest round-trips. */
const PAGE_SIZE = 100;
/** Hard cap so a malformed/looping cursor can never spin forever (5000 members). */
const MAX_PAGES = 50;

/** Fetch every member by following `meta.next_cursor` to exhaustion. */
export async function fetchAllMembers(): Promise<Member[]> {
  const all: Member[] = [];
  let cursor: string | undefined;

  for (let page = 0; page < MAX_PAGES; page += 1) {
    const response = await customFetch<PaginatedApiResponseVecMember>(
      getListMembersUrl({ limit: PAGE_SIZE, cursor }),
      { method: 'GET' },
    );
    all.push(...response.data);
    const next = response.meta.next_cursor;
    if (!next) return all;
    cursor = next;
  }

  console.warn('[all-members] MAX_PAGES cap reached; returning a truncated member list');
  return all;
}

/**
 * `enabled` lets a caller skip the walk entirely — the roster only needs the
 * member list to populate the "add participant" picker, so a role that cannot
 * manage bookings should not pay for the pagination.
 */
export function useAllMembers(options?: { enabled?: boolean }) {
  return useQuery({
    queryKey: [...getListMembersQueryKey(), { scope: 'all' }],
    queryFn: fetchAllMembers,
    enabled: options?.enabled ?? true,
  });
}
