'use client';

import { useRef, useState } from 'react';
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

import { ACCOUNT_HEADING_ID, AccountSection } from './account-section';
import { AttendanceSection } from './attendance-section';
import { ChangeEmailDialog } from './change-email-dialog';
import { DANGER_HEADING_ID, DangerZone } from './danger-zone';
import { EditMemberForm } from './edit-member-form';
import { MemberHeader } from './member-header';
import { MembershipSection } from './membership-section';
import { ResendInvitationDialog } from './resend-invitation-dialog';
import { SignOutEverywhereDialog } from './sign-out-everywhere-dialog';
import { SubscriptionsSection } from './subscriptions-section';

function MemberDetailContent() {
  const t = useTranslations('members');
  const params = useParams<{ id: string }>();
  const memberId = params.id;
  const role = useRole();
  const canEdit = role === 'owner' || role === 'admin' || role === 'receptionist';

  const memberQuery = useGetMember(memberId, { query: { select: unwrap } });
  const member = memberQuery.data;
  // `cancelRefetch: false`: a poll tick must not cancel a slower in-flight
  // fetch, or no poll would ever complete on a response slower than 2 s.
  const tracking = useAccountTracking(member?.account, () =>
    memberQuery.refetch({ cancelRefetch: false }),
  );
  const view = member
    ? describeAccount(member.account, { role, watched: tracking.watched, stale: tracking.stale })
    : null;
  const [dialog, setDialog] = useState<AccountAction | 'signOut' | null>(null);
  // Latched so the resend/relaunch dialog keeps its copy while it animates out.
  const [resendMode, setResendMode] = useState<'resend' | 'relaunch'>('resend');
  // Focus on close: back to the opener after a cancel; after a 202 the opener
  // becomes disabled or hidden, so a stable section heading takes it.
  const openerRef = useRef<HTMLElement | null>(null);
  const startedRef = useRef(false);
  const openDialog = (next: AccountAction | 'signOut') => {
    openerRef.current = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    startedRef.current = false;
    setDialog(next);
  };
  const focusAfterClose = (headingId: string) => () => {
    const opener = openerRef.current;
    if (!startedRef.current && opener?.isConnected && !opener.matches(':disabled')) return opener;
    return document.getElementById(headingId);
  };
  const openAction = (action: AccountAction) => {
    if (action === 'resend' || action === 'relaunch') setResendMode(action);
    openDialog(action);
  };
  const closeDialog = (open: boolean) => {
    if (!open) setDialog(null);
  };
  // A started operation is watched and gets a fresh 30 s polling window.
  const onStarted = (operationId: string) => {
    startedRef.current = true;
    tracking.watch(operationId);
    tracking.refresh();
  };

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
        <div className="grid grid-cols-1 gap-10 xl:grid-cols-2 xl:gap-16">
          <Skeleton className="h-64 w-full" />
          <Skeleton className="h-64 w-full" />
        </div>
      </WorkingPage>
    );
  }

  // A failed background refetch keeps the loaded page; only a first load
  // without data shows the error.
  if (memberQuery.isError && !member) {
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
      <div className="grid grid-cols-1 gap-10 xl:grid-cols-2 xl:gap-16">
        <div className="flex min-w-0 flex-col gap-10">
          <MembershipSection member={member} />
          <SubscriptionsSection memberId={member.id} canManage={canEdit} />
          <AttendanceSection memberId={member.id} />
        </div>
        <div className="flex min-w-0 flex-col gap-10">
          <EditMemberForm
            key={member.id}
            member={member}
            canEdit={canEdit}
            canChangeEmail={
              view.actions.includes('changeEmail') && view.status?.runningAction !== 'changeEmail'
            }
            onChangeEmail={() => openDialog('changeEmail')}
          />
          {canEdit ? (
            <AccountSection member={member} view={view} tracking={tracking} onAction={openAction} />
          ) : null}
          {canEdit ? (
            <DangerZone member={member} view={view} onSignOut={() => openDialog('signOut')} />
          ) : null}
        </div>
      </div>
      <ResendInvitationDialog
        member={member}
        mode={resendMode}
        open={dialog === 'resend' || dialog === 'relaunch'}
        onOpenChange={closeDialog}
        onStarted={onStarted}
        restoreFocusTo={focusAfterClose(ACCOUNT_HEADING_ID)}
      />
      <ChangeEmailDialog
        member={member}
        open={dialog === 'changeEmail'}
        onOpenChange={closeDialog}
        onStarted={onStarted}
        restoreFocusTo={focusAfterClose(ACCOUNT_HEADING_ID)}
      />
      <SignOutEverywhereDialog
        member={member}
        open={dialog === 'signOut'}
        onOpenChange={closeDialog}
        onStarted={onStarted}
        restoreFocusTo={focusAfterClose(DANGER_HEADING_ID)}
      />
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
