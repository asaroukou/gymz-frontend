'use client';

import { useMemo } from 'react';
import { useTranslations } from 'next-intl';

import type { CheckIn, Member } from '@iziwellpass/api/schemas';
import { CheckInMethod } from '@iziwellpass/api/schemas';
import { Avatar, AvatarFallback } from '@iziwellpass/ui/components/avatar';
import { Badge } from '@iziwellpass/ui/components/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@iziwellpass/ui/components/card';
import { Skeleton } from '@iziwellpass/ui/components/skeleton';

import { formatTime } from '@/lib/datetime';

import { SectionError } from './section-error';
import type { QueryLike } from './use-dashboard-data';

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
  const tCommon = useTranslations('common');
  // member_id is null for marketplace pass-holder check-ins (pass_holder_id
  // carries the actor); show a neutral label until pass UX exists.
  const name = member ? memberName(member) : (checkIn.member_id ?? tCommon('passVisitor'));
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
  checkIns,
  members,
  timeZone,
}: {
  checkIns: QueryLike<CheckIn[]>;
  members: QueryLike<Member[]>;
  timeZone: string | undefined;
}) {
  const t = useTranslations('dashboard');

  const memberById = useMemo(
    () => new Map((members.data ?? []).map((m) => [m.id, m])),
    [members.data],
  );

  const recent = useMemo(
    () =>
      [...(checkIns.data ?? [])]
        .sort((a, b) => b.checked_in_at.localeCompare(a.checked_in_at))
        .slice(0, MAX_ROWS),
    [checkIns.data],
  );

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t('checkins.title')}</CardTitle>
      </CardHeader>
      <CardContent>
        {checkIns.isLoading ? (
          <div className="space-y-3">
            <Skeleton className="h-9 w-full" />
            <Skeleton className="h-9 w-full" />
            <Skeleton className="h-9 w-full" />
          </div>
        ) : checkIns.isError ? (
          <SectionError error={checkIns.error} fallback={t('errors.checkins')} />
        ) : recent.length === 0 ? (
          <p className="py-6 text-center text-sm text-muted-foreground">{t('checkins.empty')}</p>
        ) : (
          <div>
            {recent.map((checkIn) => (
              <CheckInRow
                key={checkIn.id}
                checkIn={checkIn}
                member={checkIn.member_id ? memberById.get(checkIn.member_id) : undefined}
                timeZone={timeZone}
              />
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
