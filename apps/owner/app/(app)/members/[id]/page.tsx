'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useTranslations } from 'next-intl';

import { unwrap } from '@iziwellpass/api/client';
import { useGetMember } from '@iziwellpass/api/generated';
import { useRole } from '@iziwellpass/auth/provider';
import { Alert, AlertDescription, AlertTitle } from '@iziwellpass/ui/components/alert';
import { Skeleton } from '@iziwellpass/ui/components/skeleton';
import { BackLink, WorkingPage } from '@iziwellpass/ui/components/working-page';

import { RequirePageAccess } from '@/components/page-access';
import { apiErrorMessage } from '@/lib/api-error';
import { describeAccount, type AccountAction } from '@/lib/member-account';
import { useAccountTracking } from '@/lib/use-account-tracking';

import { AccountSection } from './account-section';
import { DangerZone } from './danger-zone';
import { EditMemberForm } from './edit-member-form';
import { MemberHeader } from './member-header';
import { MembershipSection } from './membership-section';
import { SubscriptionsSection } from './subscriptions-section';

function MemberDetailContent() {
  const t = useTranslations('members');
  const params = useParams<{ id: string }>();
  const memberId = params.id;
  const role = useRole();
  const canEdit = role === 'owner' || role === 'admin' || role === 'receptionist';

  const memberQuery = useGetMember(memberId, { query: { select: unwrap } });
  const member = memberQuery.data;
  const tracking = useAccountTracking(member?.account, memberQuery.refetch);
  const view = member
    ? describeAccount(member.account, { role, watched: tracking.watched, stale: tracking.stale })
    : null;
  // Task 7 renders the account dialogs from `dialog`.
  const [, setDialog] = useState<AccountAction | 'signOut' | null>(null);

  const backLink = (
    <BackLink href="/members" linkComponent={Link}>
      {t('detail.back')}
    </BackLink>
  );

  if (memberQuery.isLoading) {
    return (
      <WorkingPage>
        {backLink}
        <div className="flex items-center gap-5">
          <Skeleton className="size-[72px] rounded-full" />
          <Skeleton className="h-9 w-64" />
        </div>
        <div className="grid gap-10 md:grid-cols-2 md:gap-16">
          <Skeleton className="h-64 w-full" />
          <Skeleton className="h-64 w-full" />
        </div>
      </WorkingPage>
    );
  }

  if (memberQuery.isError) {
    return (
      <WorkingPage>
        {backLink}
        <Alert variant="destructive">
          <AlertTitle>{t('errorTitle')}</AlertTitle>
          <AlertDescription>
            {apiErrorMessage(memberQuery.error, t('detail.loadError'))}
          </AlertDescription>
        </Alert>
      </WorkingPage>
    );
  }

  if (!member || !view) {
    return (
      <WorkingPage>
        {backLink}
        <p className="text-base text-muted-foreground">{t('detail.notFound')}</p>
      </WorkingPage>
    );
  }

  return (
    <WorkingPage>
      {backLink}
      <MemberHeader member={member} account={view} canManage={canEdit} />
      <div className="grid gap-10 md:grid-cols-2 md:gap-16">
        <div className="flex flex-col gap-10">
          <MembershipSection member={member} />
          <SubscriptionsSection memberId={member.id} canManage={canEdit} />
        </div>
        <div className="flex flex-col gap-10">
          <EditMemberForm
            key={member.id}
            member={member}
            canEdit={canEdit}
            canChangeEmail={view.actions.includes('changeEmail')}
            onChangeEmail={() => setDialog('changeEmail')}
          />
          {canEdit ? (
            <AccountSection
              member={member}
              view={view}
              tracking={tracking}
              onAction={(action) => setDialog(action)}
            />
          ) : null}
          {canEdit ? (
            <DangerZone member={member} view={view} onSignOut={() => setDialog('signOut')} />
          ) : null}
        </div>
      </div>
    </WorkingPage>
  );
}

export default function MemberDetailPage() {
  return (
    <RequirePageAccess href="/members">
      <MemberDetailContent />
    </RequirePageAccess>
  );
}
