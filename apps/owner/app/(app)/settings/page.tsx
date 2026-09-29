'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useQueryClient } from '@tanstack/react-query';
import { CircleAlertIcon, LockIcon, RefreshCwIcon, TriangleAlertIcon } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { toast } from 'sonner';

import { unwrap } from '@iziwellpass/api/client';
import {
  getGetTenantSettingsQueryKey,
  useGetTenantSettings,
  usePatchTenantSettings,
} from '@iziwellpass/api/generated';
import type { MemberLoginMode, MemberLoginPolicy } from '@iziwellpass/api/schemas';
import { useSession } from '@iziwellpass/auth/provider';
import { Alert, AlertDescription } from '@iziwellpass/ui/components/alert';
import { Badge } from '@iziwellpass/ui/components/badge';
import { Button } from '@iziwellpass/ui/components/button';
import { Skeleton } from '@iziwellpass/ui/components/skeleton';
import { SectionHeading, WorkingHeader, WorkingPage } from '@iziwellpass/ui/components/working-page';
import { cn } from '@iziwellpass/ui/lib/utils';

import { usePlanLabel } from '@/components/capabilities/capabilities-provider';
import { RequirePageAccess } from '@/components/page-access';
import { minPlanFor } from '@/lib/capabilities';
import { classifyMemberError } from '@/lib/member-errors';
import { isForbidden } from '@/lib/plan-errors';
import { settingsView } from '@/lib/settings-view';

/**
 * The two rows of « Connexion des membres » (Flow 14, canvas `yw4t9`),
 * loading skeletons standing in for the title/description/tag column while
 * `GET /gms/v1/tenant/settings` is in flight (canvas `MGrdU`).
 */
function OptionRowSkeleton() {
  return (
    <div className="flex items-start gap-3 px-4 py-4">
      <Skeleton className="mt-0.5 size-5 shrink-0 rounded-full" />
      <div className="flex min-w-0 flex-1 flex-col gap-2">
        <Skeleton className="h-4 w-28" />
        <Skeleton className="h-3.5 w-full max-w-[480px]" />
        <Skeleton className="h-3.5 w-2/3 max-w-[320px]" />
      </div>
    </div>
  );
}

function LoginSection({
  policy,
  selection,
  onSelect,
}: {
  policy: MemberLoginPolicy;
  selection: MemberLoginMode;
  onSelect: (mode: MemberLoginMode) => void;
}) {
  const t = useTranslations('settings');
  const planLabel = usePlanLabel();
  const view = settingsView(policy, selection);
  const showInactiveTag = view.downgraded && policy.configured_mode === 'login';

  const rows: {
    mode: MemberLoginMode;
    title: string;
    description: string;
  }[] = [
    { mode: 'login', title: t('login.loginTitle'), description: t('login.loginDescription') },
    { mode: 'roster', title: t('login.rosterTitle'), description: t('login.rosterDescription') },
  ];

  return (
    <>
      {view.downgraded ? (
        <Alert variant="warning">
          <TriangleAlertIcon />
          <AlertDescription>
            <p>{t('login.downgraded')}</p>
            <Link
              href="/plan"
              className="inline-flex min-h-11 items-center font-medium underline underline-offset-4 md:min-h-0"
            >
              {t('login.seePlans')}
            </Link>
          </AlertDescription>
        </Alert>
      ) : null}
      <fieldset>
        <legend className="sr-only">{t('login.title')}</legend>
        <div className="flex flex-col divide-y divide-border">
          {rows.map((row) => {
            const isSelected = selection === row.mode;
            const isLocked = row.mode === 'login' && view.locked;
            return (
              <label
                key={row.mode}
                className={cn(
                  'flex items-start gap-3 px-4 py-4',
                  isSelected && !isLocked && 'rounded-[20px] bg-secondary',
                  isLocked ? 'cursor-not-allowed' : 'cursor-pointer',
                )}
              >
                <input
                  type="radio"
                  name="member-login"
                  value={row.mode}
                  checked={isSelected}
                  disabled={isLocked}
                  onChange={() => onSelect(row.mode)}
                  className="mt-0.5 size-5 shrink-0 accent-foreground disabled:opacity-40"
                />
                <div className="flex min-w-0 flex-col gap-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span
                      className={cn(
                        'text-[15px] font-medium',
                        isLocked && 'text-muted-foreground',
                      )}
                    >
                      {row.title}
                    </span>
                    {isLocked ? (
                      <LockIcon aria-hidden strokeWidth={1.5} className="size-4 text-muted-foreground" />
                    ) : null}
                    {row.mode === 'login' && showInactiveTag ? (
                      <Badge variant="outline">{t('login.inactiveTag')}</Badge>
                    ) : null}
                  </div>
                  <p className="text-[13px] text-muted-foreground">{row.description}</p>
                  {isLocked ? (
                    <p className="flex flex-wrap items-center gap-2 text-[13px] text-muted-foreground">
                      {t('login.lockedHint', { plan: planLabel(minPlanFor('member_self_service')) })}
                      <Link
                        href="/plan"
                        className="inline-flex min-h-11 cursor-pointer items-center font-medium text-foreground underline underline-offset-4 md:min-h-0"
                      >
                        {t('login.seePlans')}
                      </Link>
                    </p>
                  ) : null}
                </div>
              </label>
            );
          })}
        </div>
      </fieldset>
    </>
  );
}

function SettingsContent() {
  const t = useTranslations('settings');
  const tCommon = useTranslations('common');
  const session = useSession();
  const queryClient = useQueryClient();

  const query = useGetTenantSettings({ query: { select: unwrap } });
  const data = query.data;

  const [selection, setSelection] = useState<MemberLoginMode | null>(null);
  useEffect(() => {
    if (data && selection === null) {
      setSelection(data.member_login.configured_mode);
    }
  }, [data, selection]);

  const [saveError, setSaveError] = useState<string | null>(null);
  const patch = usePatchTenantSettings();

  const configured = data?.member_login.configured_mode ?? 'roster';
  const effectiveSelection = selection ?? configured;
  const view = data ? settingsView(data.member_login, effectiveSelection) : null;

  // A refusal belongs to the choice that was refused.
  const select = (mode: MemberLoginMode) => {
    setSelection(mode);
    setSaveError(null);
  };

  const handleSave = () => {
    if (!selection) return;
    patch.mutate(
      { data: { member_login_mode: selection } },
      {
        onSuccess: (res) => {
          toast.success(t('login.saved'));
          queryClient.setQueryData(getGetTenantSettingsQueryKey(), res);
          setSaveError(null);
        },
        onError: (err) => {
          const kind = classifyMemberError(err).kind;
          if (kind === 'featureNotAvailable') {
            setSaveError(t('login.refused'));
          } else if (isForbidden(err)) {
            setSaveError(t('login.forbidden'));
          } else {
            setSaveError(t('login.saveError'));
          }
        },
      },
    );
  };

  const mfaEnrolled = session.status === 'signed-in' && session.claims.mfaEnrolled;

  return (
    <WorkingPage>
      <WorkingHeader title={t('title')} subtitle={t('subtitle')} />
      <div className="flex max-w-[720px] flex-col gap-12">
        {query.isError && !data ? (
          <div role="alert" className="flex flex-col items-center gap-3 border-y border-border py-10 text-center">
            <p className="text-base text-foreground">{t('loadError')}</p>
            <Button
              variant="outline"
              size="sm"
              onClick={() => void query.refetch()}
              disabled={query.isFetching}
            >
              <RefreshCwIcon aria-hidden strokeWidth={1.5} className="size-4" />
              {tCommon('retry')}
            </Button>
          </div>
        ) : (
          <>
            <section className="flex flex-col gap-4">
              <SectionHeading title={t('login.title')} description={t('login.description')} />
              {query.isLoading || !data || !view ? (
                <div className="flex flex-col divide-y divide-border">
                  <OptionRowSkeleton />
                  <OptionRowSkeleton />
                </div>
              ) : (
                <>
                  <LoginSection policy={data.member_login} selection={effectiveSelection} onSelect={select} />
                  <p className="text-[13px] text-muted-foreground">{t('login.foot')}</p>
                  <div className="flex w-full flex-col items-start gap-3">
                    <Button
                      className="w-full sm:w-auto"
                      onClick={handleSave}
                      disabled={!view.dirty || patch.isPending}
                    >
                      {t('login.save')}
                    </Button>
                    {saveError ? (
                      <p role="alert" className="flex items-start gap-2 text-[13px] text-destructive-foreground">
                        <CircleAlertIcon aria-hidden strokeWidth={1.5} className="mt-px size-4 shrink-0" />
                        {saveError}
                      </p>
                    ) : null}
                  </div>
                </>
              )}
            </section>

            <section className="flex flex-col gap-4">
              <SectionHeading title={t('security.title')} />
              <div className="flex flex-col items-start gap-3 border-y border-border py-4 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
                <div className="flex flex-col gap-1">
                  <span className="text-[15px] font-medium">{t('security.mfa')}</span>
                  <p className="text-[13px] text-muted-foreground">{t('security.mfaDescription')}</p>
                </div>
                {query.isLoading ? (
                  <Skeleton className="h-6 w-20 rounded-full" />
                ) : mfaEnrolled ? (
                  <Badge variant="success">{t('security.enabled')}</Badge>
                ) : (
                  <div className="flex items-center gap-2.5">
                    <Badge>{t('security.disabled')}</Badge>
                    <Button variant="outline" asChild>
                      <Link href="/mfa">{t('security.enable')}</Link>
                    </Button>
                  </div>
                )}
              </div>
            </section>
          </>
        )}
      </div>
    </WorkingPage>
  );
}

export default function SettingsPage() {
  return (
    <RequirePageAccess href="/settings">
      <SettingsContent />
    </RequirePageAccess>
  );
}
