'use client';

import { UsersRoundIcon } from 'lucide-react';
import { useTranslations } from 'next-intl';

import { useRole } from '@iziwellpass/auth/provider';
import { Alert, AlertDescription, AlertTitle } from '@iziwellpass/ui/components/alert';
import { Button } from '@iziwellpass/ui/components/button';
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyMedia,
  EmptyTitle,
} from '@iziwellpass/ui/components/empty';
import { Skeleton } from '@iziwellpass/ui/components/skeleton';
import { WorkingHeader, WorkingPage } from '@iziwellpass/ui/components/working-page';

import { RequirePageAccess } from '@/components/page-access';
import { RowsSkeleton } from '@/components/rows-skeleton';
import { useAllMembers } from '@/lib/all-members';
import { apiErrorMessage } from '@/lib/api-error';

import { AddMemberDialog } from './add-member-dialog';
import { MembersDirectory } from './members-directory';

function MembersContent() {
  const t = useTranslations('members');
  const tCommon = useTranslations('common');
  const role = useRole();
  const canManage = role === 'owner' || role === 'admin' || role === 'receptionist';

  const membersQuery = useAllMembers();
  const members = membersQuery.data ?? [];

  const subtitle = membersQuery.isLoading ? (
    <Skeleton className="h-4 w-28" />
  ) : membersQuery.isError ? undefined : (
    t('subtitle', { count: members.length })
  );

  return (
    <WorkingPage>
      <WorkingHeader
        title={t('title')}
        subtitle={subtitle}
        action={canManage ? <AddMemberDialog /> : null}
      />

      {membersQuery.isLoading ? (
        <div className="flex flex-col gap-8">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <Skeleton className="h-12 w-full rounded-full md:w-[380px]" />
            <Skeleton className="h-10 w-96 rounded-full" />
          </div>
          <RowsSkeleton rows={8} />
        </div>
      ) : membersQuery.isError ? (
        <Alert variant="destructive">
          <AlertTitle>{t('errorTitle')}</AlertTitle>
          <AlertDescription className="flex flex-col items-start gap-3">
            <span>{apiErrorMessage(membersQuery.error, t('loadError'))}</span>
            <Button
              variant="secondary"
              size="sm"
              onClick={() => void membersQuery.refetch()}
              disabled={membersQuery.isFetching}
            >
              {tCommon('retry')}
            </Button>
          </AlertDescription>
        </Alert>
      ) : members.length === 0 ? (
        <Empty>
          <EmptyMedia>
            <UsersRoundIcon />
          </EmptyMedia>
          <EmptyTitle>{t('empty.title')}</EmptyTitle>
          <EmptyDescription>{t('empty.body')}</EmptyDescription>
          {canManage ? (
            <EmptyContent>
              <AddMemberDialog variant="secondary" />
            </EmptyContent>
          ) : null}
        </Empty>
      ) : (
        <MembersDirectory members={members} canManage={canManage} />
      )}
    </WorkingPage>
  );
}

export default function MembersPage() {
  return (
    <RequirePageAccess href="/members">
      <MembersContent />
    </RequirePageAccess>
  );
}
