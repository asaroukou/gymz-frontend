'use client';

import { useMemo } from 'react';
import { useTranslations } from 'next-intl';

import { unwrap } from '@iziwellpass/api/client';
import { useListCheckIns, useListMembers } from '@iziwellpass/api/generated';
import type { CheckIn, Member } from '@iziwellpass/api/schemas';
import { CheckInMethod } from '@iziwellpass/api/schemas';
import { Avatar, AvatarFallback } from '@iziwellpass/ui/components/avatar';
import { Badge } from '@iziwellpass/ui/components/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@iziwellpass/ui/components/card';
import { Skeleton } from '@iziwellpass/ui/components/skeleton';

import { formatTime } from '@/lib/datetime';

import { SectionError } from './section-error';

const MAX_ROWS = 6;

function memberName(member: Member): string {
  return `${member.first_name} ${member.last_name}`.trim();
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
  timeZone,
}: {
  checkIn: CheckIn;
  member: Member | undefined;
  timeZone: string | undefined;
}) {
  const t = useTranslations('dashboard');
  const name = member ? memberName(member) : checkIn.member_id;
  const isQr = checkIn.method === CheckInMethod.qr;

  return (
    <div className="flex items-center gap-3 border-t py-2.5 first:border-t-0 first:pt-0">
      <Avatar size="sm">
        <AvatarFallback aria-label={name}>{initials(member)}</AvatarFallback>
      </Avatar>
      <p className="min-w-0 flex-1 truncate text-sm font-medium">{name}</p>
      <Badge variant={isQr ? 'info' : 'secondary'}>
        {isQr ? t('checkins.methodQr') : t('checkins.methodManual')}
      </Badge>
      <span className="shrink-0 font-mono text-xs tabular-nums text-muted-foreground">
        {formatTime(checkIn.checked_in_at, timeZone)}
      </span>
    </div>
  );
}

export function RecentCheckins({
  venueId,
  timeZone,
}: {
  venueId: string;
  timeZone: string | undefined;
}) {
  const t = useTranslations('dashboard');
  const checkInsQuery = useListCheckIns(venueId, { query: { select: unwrap } });
  const membersQuery = useListMembers({ query: { select: unwrap } });

  const memberById = useMemo(
    () => new Map((membersQuery.data ?? []).map((m) => [m.id, m])),
    [membersQuery.data],
  );

  const recent = useMemo(
    () =>
      [...(checkInsQuery.data ?? [])]
        .sort((a, b) => b.checked_in_at.localeCompare(a.checked_in_at))
        .slice(0, MAX_ROWS),
    [checkInsQuery.data],
  );

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t('checkins.title')}</CardTitle>
      </CardHeader>
      <CardContent>
        {checkInsQuery.isLoading ? (
          <div className="space-y-3">
            <Skeleton className="h-9 w-full" />
            <Skeleton className="h-9 w-full" />
            <Skeleton className="h-9 w-full" />
          </div>
        ) : checkInsQuery.isError ? (
          <SectionError error={checkInsQuery.error} fallback={t('errors.checkins')} />
        ) : recent.length === 0 ? (
          <p className="py-6 text-center text-sm text-muted-foreground">{t('checkins.empty')}</p>
        ) : (
          <div>
            {recent.map((checkIn) => (
              <CheckInRow
                key={checkIn.id}
                checkIn={checkIn}
                member={memberById.get(checkIn.member_id)}
                timeZone={timeZone}
              />
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
