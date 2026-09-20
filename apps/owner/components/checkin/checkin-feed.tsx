'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { useTranslations } from 'next-intl';

import type { CheckIn, Member, Staff } from '@iziwellpass/api/schemas';
import { CheckInMethod } from '@iziwellpass/api/schemas';
import { Alert, AlertDescription, AlertTitle } from '@iziwellpass/ui/components/alert';
import { Avatar, AvatarFallback } from '@iziwellpass/ui/components/avatar';
import { Badge } from '@iziwellpass/ui/components/badge';
import { Skeleton } from '@iziwellpass/ui/components/skeleton';
import { cn } from '@iziwellpass/ui/lib/utils';

import { apiErrorMessage } from '@/lib/api-error';
import { feedRows, recordedByLabel } from '@/lib/checkin-feed';
import { formatTime } from '@/lib/datetime';
import { memberInitials, memberName } from '@/lib/member-search';

import type { QueryLike } from './query-like';

export interface CheckinFeedProps {
  checkIns: QueryLike<CheckIn[]>;
  members: QueryLike<Member[]>;
  staff: QueryLike<Staff[]>;
  timeZone: string | undefined;
  /** 22/500 heading. Omitted under the dashboard tab (the tab is the heading). */
  title?: string;
  /** « En direct » success badge with a dot, right of the title. */
  live?: boolean;
  /** The dashboard tab shows eight; the front desk shows the whole day. */
  limit?: number;
}

function CheckinRow({
  checkIn,
  index,
  member,
  staffByUserId,
  timeZone,
  justArrived,
}: {
  checkIn: CheckIn;
  index: number;
  member: Member | undefined;
  staffByUserId: ReadonlyMap<string, Staff>;
  timeZone: string | undefined;
  justArrived: boolean;
}) {
  const t = useTranslations('frontdesk');
  const tCommon = useTranslations('common');
  // Never surface a raw UUID: fall back to a generic label when the member
  // isn't in the loaded list. A null member_id is a marketplace pass-holder.
  const name = member
    ? memberName(member)
    : checkIn.member_id
      ? t('feed.unknownMember')
      : tCommon('passVisitor');
  const isQr = checkIn.method === CheckInMethod.qr;
  const meta = recordedByLabel(checkIn, staffByUserId, {
    self: t('feed.self'),
    unknownStaff: t('feed.unknownStaff'),
    by: (who) => t('feed.byLabel', { name: who }),
  });

  return (
    <li
      className={cn(
        'flex items-center gap-3.5 border-t border-border py-3 first:border-t-0',
        justArrived && 'animate-checkin-arrive',
      )}
    >
      <Avatar>
        <AvatarFallback tint={index} aria-label={name}>
          {memberInitials(member)}
        </AvatarFallback>
      </Avatar>
      <div className="min-w-0 flex-1">
        <p className="truncate text-base font-semibold">{name}</p>
        <p className="truncate text-sm text-muted-foreground">{meta}</p>
      </div>
      <Badge variant={isQr ? 'info' : 'default'}>
        {isQr ? t('feed.methodQr') : t('feed.methodManual')}
      </Badge>
      <span className="w-11 shrink-0 text-right font-numeric text-sm font-medium text-muted-foreground">
        {formatTime(checkIn.checked_in_at, timeZone)}
      </span>
    </li>
  );
}

/**
 * The hairline feed of today's check-ins, 720px wide and centred: avatar
 * tinted by position, name, who recorded it, the method badge, the venue-tz
 * time. Refetches on its own after each check-in (the hook invalidates the
 * key); a genuinely new top row flashes once.
 */
export function CheckinFeed({
  checkIns,
  members,
  staff,
  timeZone,
  title,
  live = false,
  limit,
}: CheckinFeedProps) {
  const t = useTranslations('frontdesk');

  const memberById = useMemo(
    () => new Map((members.data ?? []).map((m) => [m.id, m])),
    [members.data],
  );
  const staffByUserId = useMemo(
    () => new Map((staff.data ?? []).map((s) => [s.user_id, s])),
    [staff.data],
  );
  const rows = useMemo(() => feedRows(checkIns.data, limit), [checkIns.data, limit]);

  // Animate only a genuinely new arrival: the first populated render seeds
  // the ref without flashing, so the feed doesn't animate on load.
  const topId = rows[0]?.id;
  const lastTopId = useRef<string | undefined>(undefined);
  const [arrivedId, setArrivedId] = useState<string | null>(null);
  useEffect(() => {
    if (topId === undefined) return;
    if (lastTopId.current !== undefined && topId !== lastTopId.current) {
      setArrivedId(topId);
      const timer = setTimeout(() => setArrivedId(null), 1200);
      lastTopId.current = topId;
      return () => clearTimeout(timer);
    }
    lastTopId.current = topId;
  }, [topId]);

  return (
    <section
      className="flex w-full max-w-[45rem] flex-col gap-3"
      aria-label={title ?? t('feed.title')}
    >
      {title ? (
        <div className="flex items-center justify-between gap-3">
          <h2 className="text-lg font-medium md:text-xl">{title}</h2>
          {live ? (
            <Badge variant="success">
              <span aria-hidden="true" className="size-1.5 rounded-full bg-current" />
              {t('feed.live')}
            </Badge>
          ) : null}
        </div>
      ) : null}
      {checkIns.isLoading ? (
        <div className="flex flex-col gap-3" aria-hidden="true">
          <Skeleton className="h-[60px] w-full" />
          <Skeleton className="h-[60px] w-full" />
          <Skeleton className="h-[60px] w-full" />
        </div>
      ) : checkIns.isError ? (
        <Alert variant="destructive">
          <AlertTitle>{t('errorTitle')}</AlertTitle>
          <AlertDescription>
            {apiErrorMessage(checkIns.error, t('feed.loadError'))}
          </AlertDescription>
        </Alert>
      ) : rows.length === 0 ? (
        <p className="py-6 text-center text-base text-muted-foreground">{t('feed.empty')}</p>
      ) : (
        <ul className="flex flex-col">
          {rows.map((checkIn, index) => (
            <CheckinRow
              key={checkIn.id}
              checkIn={checkIn}
              index={index}
              member={checkIn.member_id ? memberById.get(checkIn.member_id) : undefined}
              staffByUserId={staffByUserId}
              timeZone={timeZone}
              justArrived={checkIn.id === arrivedId}
            />
          ))}
        </ul>
      )}
    </section>
  );
}
