'use client';

import { useQuery } from '@tanstack/react-query';

import { customFetch, unwrap } from '@iziwellpass/api/client';
import { getListMembersQueryKey, getListMembersUrl } from '@iziwellpass/api/generated';
import type { ApiResponseVecMember } from '@iziwellpass/api/schemas';

/**
 * WORKAROUND — backend pagination gap (tracked in `docs/backend-issues.md`).
 *
 * `GET /gms/v1/members` is paginated on the live API: it defaults to
 * `limit=20` and returns a `meta` block — but the OpenAPI spec declares NO
 * query parameters for the operation (and doesn't model `meta`), so the
 * Orval-generated `useListMembers` sends no `limit` and silently shows only
 * the first 20 members. The owner app filters/searches client-side and has no
 * pagination UI, so members beyond the 20th are invisible (and the dashboard
 * "Membres actifs" count is wrong).
 *
 * Until the backend documents pagination (`limit`/`offset` + `meta`) in its
 * OpenAPI, we fetch the full list through the shared `customFetch` mutator
 * with an explicit high `limit`. The query key reuses `getListMembersQueryKey`
 * as a prefix so register/suspend/update invalidations still match. When the
 * spec is fixed, delete this file and either pass `limit` via the generated
 * hook or add real pagination.
 */
const MEMBERS_LIMIT = 1000;

export function useAllMembers() {
  return useQuery({
    queryKey: [...getListMembersQueryKey(), { limit: MEMBERS_LIMIT }],
    queryFn: () =>
      customFetch<ApiResponseVecMember>(`${getListMembersUrl()}?limit=${MEMBERS_LIMIT}`, {
        method: 'GET',
      }),
    select: unwrap,
  });
}
