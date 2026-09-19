'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { useTranslations } from 'next-intl';

import type { CheckIn, Member, Staff } from '@iziwellpass/api/schemas';
import { CheckInMethod } from '@iziwellpass/api/schemas';
import { Alert, AlertDescription, AlertTitle } from '@iziwellpass/ui/components/alert';
import { Avatar, AvatarFallback } from '@iziwellpass/ui/components/avatar';
import { Badge } from '@iziwellpass/ui/components/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@iziwellpass/ui/components/card';
import { Empty, EmptyDescription, EmptyMedia, EmptyTitle } from '@iziwellpass/ui/components/empty';
import { Skeleton } from '@iziwellpass/ui/components/skeleton';
import { cn } from '@iziwellpass/ui/lib/utils';
import { ScanLineIcon } from 'lucide-react';

import { apiErrorMessage } from '@/lib/api-error';
import { formatTime } from '@/lib/datetime';

import type { QueryLike } from './use-frontdesk-data';

function memberName(member: Member): string {
  return `${member.first_name} ${member.last_name}`.trim();
}

function staffName(staff: Staff): string {
  return `${staff.first_name} ${staff.last_name}`.trim();
}

function initials(member: Member | undefined): string {
  if (!member) return '?';
  const first = member.first_name.charAt(0);
  const last = member.last_name.charAt(0);
  return `${first}${last}`.toUpperCase() || '?';
}

function CheckInRow({
  checkIn,
  member,
  staffByUserId,
  timeZone,
  justArrived,
}: {
  checkIn: CheckIn;
  member: Member | undefined;
  staffByUserId: Map<string, Staff>;
  timeZone: string | undefined;
  justArrived: boolean;
}) {
  const t = useTranslations('frontdesk');
  const tCommon = useTranslations('common');
  // Never surface a raw UUID: fall back to a generic label when the member
  // isn't in the loaded list (e.g. a stale/partial cache). A null member_id
  // means the check-in belongs to a marketplace pass-holder, not a member.
  const name = member
    ? memberName(member)
    : checkIn.member_id
      ? t('feed.unknownMember')
      : tCommon('passVisitor');
  const isQr = checkIn.method === CheckInMethod.qr;

  // `checked_in_by` is a staff user_id for manual entries and null for QR
  // self-check-in — resolve the staff name, fall back to a generic staff label
  // (never the raw id), or show the "self" label.
  let recordedBy: string;
  if (checkIn.checked_in_by) {
    const staff = staffByUserId.get(checkIn.checked_in_by);
    recordedBy = staff ? staffName(staff) : t('feed.unknownStaff');
  } else {
    recordedBy = t('feed.self');
  }

  return (
    <div
      className={cn(
        'flex items-center gap-3 border-t py-3 first:border-t-0 first:pt-0',
        justArrived && 'animate-checkin-arrive',
      )}
    >
      <Avatar>
        <AvatarFallback aria-label={name}>{initials(member)}</AvatarFallback>
      </Avatar>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium">{name}</p>
        <p className="truncate text-xs text-muted-foreground">
          {t('feed.byLabel', { name: recordedBy })}
        </p>
      </div>
      <Badge variant={isQr ? 'info' : 'secondary'}>
        {isQr ? t('feed.methodQr') : t('feed.methodManual')}
      </Badge>
      <span className="shrink-0 font-numeric text-xs text-muted-foreground">
        {formatTime(checkIn.checked_in_at, timeZone)}
      </span>
    </div>
  );
}

/**
 * Live feed of the venue's recent check-ins — avatar, name, method badge
 * (QR = info / Manuel = secondary), venue-tz time (mono), and who recorded it.
 * Refetches automatically after each successful check-in (the register panel
 * invalidates the check-in query key).
 */
export function RecentCheckins({
  checkIns,
  members,
  staff,
  timeZone,
}: {
  checkIns: QueryLike<CheckIn[]>;
  members: QueryLike<Member[]>;
  staff: QueryLike<Staff[]>;
  timeZone: string | undefined;
}) {
  const t = useTranslations('frontdesk');

  const memberById = useMemo(
    () => new Map((members.data ?? []).map((m) => [m.id, m])),
    [members.data],
  );
  const staffByUserId = useMemo(
    () => new Map((staff.data ?? []).map((s) => [s.user_id, s])),
    [staff.data],
  );
  const rows = useMemo(
    () => [...(checkIns.data ?? [])].sort((a, b) => b.checked_in_at.localeCompare(a.checked_in_at)),
    [checkIns.data],
  );

  // Animate only a genuinely new arrival: when the newest check-in id changes
  // to one we haven't shown, flash that row once. The first populated render
  // seeds the ref without flashing, so the feed doesn't animate on load.
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
    <Card>
      <CardHeader>
        <CardTitle>{t('feed.title')}</CardTitle>
      </CardHeader>
      <CardContent>
        {checkIns.isLoading ? (
          <div className="space-y-3">
            <Skeleton className="h-11 w-full" />
            <Skeleton className="h-11 w-full" />
            <Skeleton className="h-11 w-full" />
          </div>
        ) : checkIns.isError ? (
          <Alert variant="destructive">
            <AlertTitle>{t('errorTitle')}</AlertTitle>
            <AlertDescription>
              {apiErrorMessage(checkIns.error, t('feed.loadError'))}
            </AlertDescription>
          </Alert>
        ) : rows.length === 0 ? (
          <Empty>
            <EmptyMedia>
              <ScanLineIcon aria-hidden="true" />
            </EmptyMedia>
            <EmptyTitle>{t('feed.emptyTitle')}</EmptyTitle>
            <EmptyDescription>{t('feed.emptyBody')}</EmptyDescription>
          </Empty>
        ) : (
          <div>
            {rows.map((checkIn) => (
              <CheckInRow
                key={checkIn.id}
                checkIn={checkIn}
                member={checkIn.member_id ? memberById.get(checkIn.member_id) : undefined}
                staffByUserId={staffByUserId}
                timeZone={timeZone}
                justArrived={checkIn.id === arrivedId}
              />
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
