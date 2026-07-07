'use client';

import { useMemo } from 'react';
import { useTranslations } from 'next-intl';

import type { CheckIn, Member, Staff } from '@iziwellpass/api/schemas';
import { CheckInMethod } from '@iziwellpass/api/schemas';
import { Alert, AlertDescription, AlertTitle } from '@iziwellpass/ui/components/alert';
import { Avatar, AvatarFallback } from '@iziwellpass/ui/components/avatar';
import { Badge } from '@iziwellpass/ui/components/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@iziwellpass/ui/components/card';
import { Empty, EmptyDescription, EmptyMedia, EmptyTitle } from '@iziwellpass/ui/components/empty';
import { Skeleton } from '@iziwellpass/ui/components/skeleton';
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
}: {
  checkIn: CheckIn;
  member: Member | undefined;
  staffByUserId: Map<string, Staff>;
  timeZone: string | undefined;
}) {
  const t = useTranslations('frontdesk');
  const name = member ? memberName(member) : checkIn.member_id;
  const isQr = checkIn.method === CheckInMethod.qr;

  // `checked_in_by` is a staff user_id for manual entries and null for QR
  // self-check-in — resolve the staff name, fall back to the raw id, or show
  // the "self" label.
  let recordedBy: string;
  if (checkIn.checked_in_by) {
    const staff = staffByUserId.get(checkIn.checked_in_by);
    recordedBy = staff ? staffName(staff) : checkIn.checked_in_by;
  } else {
    recordedBy = t('feed.self');
  }

  return (
    <div className="flex items-center gap-3 border-t py-3 first:border-t-0 first:pt-0">
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
      <span className="shrink-0 font-mono text-xs tabular-nums text-muted-foreground">
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
                member={memberById.get(checkIn.member_id)}
                staffByUserId={staffByUserId}
                timeZone={timeZone}
              />
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
