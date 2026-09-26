'use client';

import { useCallback, useMemo } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useTranslations } from 'next-intl';
import { toast } from 'sonner';

import { ApiError } from '@iziwellpass/api/client';
import {
  getGetAttendanceQueryKey,
  getListCheckInsQueryKey,
  getVenueTodayQueryKey,
  useCheckInViaQr,
  useCheckInWalkin,
  useCheckInWalkinQr,
  usePassCheckin,
} from '@iziwellpass/api/generated';
import type { ApiResponseCheckIn, Member } from '@iziwellpass/api/schemas';

import { useUpgradeToast } from '@/components/capabilities/use-upgrade-toast';
import { apiErrorMessage } from '@/lib/api-error';
import { qrErrorMessage, walkinErrorFallback } from '@/lib/checkin-errors';
import { memberName } from '@/lib/member-search';
import { isFeatureNotAvailable } from '@/lib/plan-errors';
import { checkinRouteFor, decodeQrToken } from '@/lib/qr-token';

export interface RegisterCheckin {
  /** Scan or typed token; routes to the booking, walk-in QR or pass endpoint. */
  submitToken: (token: string, onSuccess?: () => void) => void;
  /** Manual walk-in for a member picked in the type-ahead. */
  submitWalkin: (memberId: string, onSuccess?: () => void) => void;
  /** True while any of the four mutations is in flight; the bar locks. */
  isPending: boolean;
}

/**
 * The one check-in engine behind both hubs. Success toasts the member's name
 * (or the pass-visitor label), invalidates the check-in, attendance and
 * today-snapshot keys of the venue the SERVER resolved — a pass token sends
 * no venue_id, so a tenant-wide owner with another venue selected would
 * otherwise see a toast while the scanned venue's feed never moves — and
 * then runs `onSuccess` so the caller can clear and refocus the bar for the
 * next scan.
 */
export function useRegisterCheckin({
  venueId,
  memberById,
}: {
  venueId: string;
  memberById: ReadonlyMap<string, Member>;
}): RegisterCheckin {
  const t = useTranslations('frontdesk');
  const tCommon = useTranslations('common');
  const tCap = useTranslations('capabilities');
  const showUpgrade = useUpgradeToast();
  const queryClient = useQueryClient();
  const viaQr = useCheckInViaQr();
  const walkinQr = useCheckInWalkinQr();
  const pass = usePassCheckin();
  const walkin = useCheckInWalkin();

  const isPending = viaQr.isPending || walkinQr.isPending || pass.isPending || walkin.isPending;

  const settle = useCallback(
    (res: ApiResponseCheckIn, after?: () => void) => {
      // A null member_id is a marketplace pass-holder check-in; show the
      // neutral pass-visitor label instead of an identity lookup.
      const memberId = res.data.member_id;
      if (!memberId) {
        toast.success(t('success', { name: tCommon('passVisitor') }));
      } else {
        const member = memberById.get(memberId);
        toast.success(member ? t('success', { name: memberName(member) }) : t('successNoName'));
      }
      const checkedInVenueId = res.data.venue_id;
      void queryClient.invalidateQueries({ queryKey: getListCheckInsQueryKey(checkedInVenueId) });
      void queryClient.invalidateQueries({ queryKey: getGetAttendanceQueryKey(checkedInVenueId) });
      void queryClient.invalidateQueries({ queryKey: getVenueTodayQueryKey(checkedInVenueId) });
      after?.();
    },
    [memberById, queryClient, t, tCommon],
  );

  const submitToken = useCallback<RegisterCheckin['submitToken']>(
    (token, after) => {
      // Guard the rapid-Enter loop: a wedge scanner double-fire during the
      // in-flight window would re-submit the still-visible token and trip a
      // spurious "already checked in" right after the success.
      if (isPending || !token) return;
      // Routing only — never a security decision. The payload is readable
      // without a key; the server still verifies the MAC.
      const decoded = decodeQrToken(token);
      const route = checkinRouteFor(decoded);
      const handlers = {
        onSuccess: (res: ApiResponseCheckIn) => settle(res, after),
        onError: (err: unknown) => {
          // Plan-gated venue routes surface the upgrade toast instead of a
          // generic error (ruling R1); the pass route is never plan-gated.
          if (route !== 'pass' && isFeatureNotAvailable(err)) {
            showUpgrade('qr_checkin', tCap('action.qrCheckin'));
            return;
          }
          // The pass flow's most common failure: another day, another venue,
          // or already used. Gets its own copy rather than the generic fallback.
          const isPassNotSettleable =
            route === 'pass' && err instanceof ApiError && err.status === 409;
          toast.error(
            isPassNotSettleable
              ? apiErrorMessage(err, t('qr.errorPassNotSettleable'))
              : qrErrorMessage(t, err, decoded, venueId),
          );
        },
      };
      if (route === 'pass') {
        // Marketplace pass token: venue-keyed, so it carries no venue_id of ours.
        pass.mutate({ data: { qr_token: token } }, handlers);
        return;
      }
      if (route === 'walkin') {
        walkinQr.mutate({ data: { qr_token: token, venue_id: venueId } }, handlers);
        return;
      }
      // 'booking' — and every undecodable token: the server produces the
      // authoritative error, and a future token format keeps working.
      viaQr.mutate({ data: { qr_token: token, venue_id: venueId } }, handlers);
    },
    [isPending, pass, settle, showUpgrade, t, tCap, venueId, viaQr, walkinQr],
  );

  const submitWalkin = useCallback<RegisterCheckin['submitWalkin']>(
    (memberId, after) => {
      if (isPending || !memberId) return;
      walkin.mutate(
        { data: { member_id: memberId, venue_id: venueId } },
        {
          onSuccess: (res) => settle(res, after),
          onError: (err) => toast.error(apiErrorMessage(err, walkinErrorFallback(t, err))),
        },
      );
    },
    [isPending, settle, t, venueId, walkin],
  );

  return useMemo(
    () => ({ submitToken, submitWalkin, isPending }),
    [submitToken, submitWalkin, isPending],
  );
}
