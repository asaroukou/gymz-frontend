'use client';

import { useMemo, useState } from 'react';
import { SearchIcon, SearchXIcon, UsersRoundIcon } from 'lucide-react';
import { useTranslations } from 'next-intl';

import { unwrap } from '@iziwellpass/api/client';
import { useListStaff } from '@iziwellpass/api/generated';
import { useSession } from '@iziwellpass/auth/provider';
import { Alert, AlertDescription, AlertTitle } from '@iziwellpass/ui/components/alert';
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyMedia,
  EmptyTitle,
} from '@iziwellpass/ui/components/empty';
import { Input } from '@iziwellpass/ui/components/input';
import { Skeleton } from '@iziwellpass/ui/components/skeleton';
import { WorkingHeader, WorkingPage } from '@iziwellpass/ui/components/working-page';

import { RequirePageAccess } from '@/components/page-access';
import { RowsSkeleton } from '@/components/rows-skeleton';
import { apiErrorMessage } from '@/lib/api-error';
import { staffName } from '@/lib/staff-name';

import { InviteStaffDialog } from './staff-dialogs';
import { StaffTable } from './staff-table';

function StaffContent() {
  const t = useTranslations('staff');
  const session = useSession();
  const selfUserId = session.status === 'signed-in' ? session.claims.sub : null;

  const staffQuery = useListStaff({ query: { select: unwrap } });
  const staff = useMemo(() => staffQuery.data ?? [], [staffQuery.data]);
  const [query, setQuery] = useState('');

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return staff;
    return staff.filter((member) => {
      const name = staffName(member).toLowerCase();
      const email = member.email.toLowerCase();
      return name.includes(q) || email.includes(q);
    });
  }, [staff, query]);

  const subtitle = staffQuery.isLoading ? (
    <Skeleton className="h-4 w-28" />
  ) : staffQuery.isError ? undefined : (
    t('subtitle', { count: staff.length })
  );

  return (
    <WorkingPage>
      <WorkingHeader title={t('title')} subtitle={subtitle} action={<InviteStaffDialog />} />

      {staffQuery.isLoading ? (
        <div className="flex flex-col gap-8">
          <Skeleton className="h-12 w-full rounded-full md:w-[380px]" />
          <RowsSkeleton rows={6} />
        </div>
      ) : staffQuery.isError ? (
        <Alert variant="destructive">
          <AlertTitle>{t('errorTitle')}</AlertTitle>
          <AlertDescription>{apiErrorMessage(staffQuery.error, t('loadError'))}</AlertDescription>
        </Alert>
      ) : staff.length === 0 ? (
        <Empty>
          <EmptyMedia>
            <UsersRoundIcon />
          </EmptyMedia>
          <EmptyTitle>{t('empty.title')}</EmptyTitle>
          <EmptyDescription>{t('empty.body')}</EmptyDescription>
          <EmptyContent>
            <InviteStaffDialog variant="secondary" />
          </EmptyContent>
        </Empty>
      ) : (
        <div className="flex flex-col gap-8">
          <div className="relative w-full md:w-[380px]">
            <SearchIcon className="pointer-events-none absolute top-1/2 left-4 size-[18px] -translate-y-1/2 text-muted-foreground" />
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={t('search')}
              aria-label={t('search')}
              className="pl-11"
            />
          </div>
          {filtered.length === 0 ? (
            <Empty>
              <EmptyMedia>
                <SearchXIcon />
              </EmptyMedia>
              <EmptyTitle>{t('noResults.title')}</EmptyTitle>
              <EmptyDescription>{t('noResults.body')}</EmptyDescription>
            </Empty>
          ) : (
            <StaffTable staff={filtered} selfUserId={selfUserId} />
          )}
        </div>
      )}
    </WorkingPage>
  );
}

export default function StaffPage() {
  return (
    <RequirePageAccess href="/staff">
      <StaffContent />
    </RequirePageAccess>
  );
}
