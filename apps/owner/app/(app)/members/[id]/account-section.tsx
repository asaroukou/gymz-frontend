'use client';

import type { ReactNode } from 'react';
import {
  CircleAlertIcon,
  CircleCheckIcon,
  LoaderCircleIcon,
  MailIcon,
  ShieldIcon,
  type LucideIcon,
} from 'lucide-react';
import { useLocale, useTranslations } from 'next-intl';

import type { StaffMemberProfile } from '@iziwellpass/api/schemas';
import { Badge } from '@iziwellpass/ui/components/badge';
import { Button } from '@iziwellpass/ui/components/button';
import { SectionHeading } from '@iziwellpass/ui/components/working-page';
import { cn } from '@iziwellpass/ui/lib/utils';

import {
  formatOpMoment,
  type AccountAction,
  type AccountBadge,
  type AccountTone,
  type AccountView,
  type StatusRow,
} from '@/lib/member-account';
import type { AccountTracking } from '@/lib/use-account-tracking';

const BADGE_VARIANT = {
  success: 'success',
  info: 'info',
  neutral: 'default',
  outline: 'outline',
  danger: 'destructive',
  warning: 'warning',
} as const satisfies Record<AccountTone, string>;

/** The app-access badge, shared by the section's « Accès » row and the header. */
export function AccountStatusBadge({ badge }: { badge: AccountBadge }) {
  const t = useTranslations('members');
  return (
    <span className="inline-flex items-center gap-2">
      <Badge variant={BADGE_VARIANT[badge.tone]}>{t(badge.labelKey)}</Badge>
      {badge.spinner ? (
        <LoaderCircleIcon
          aria-hidden
          strokeWidth={1.5}
          className="size-3.5 animate-spin text-muted-strong"
        />
      ) : null}
    </span>
  );
}

/**
 * One key/value row (INVENTORY « Shared patterns »): 12px vertical padding,
 * key 15px muted, value 15/500 or a badge; notes under the row at 13px. Rows
 * stack label over value on phone (`TOqY8`).
 */
function AccountRow({
  label,
  children,
  notes,
}: {
  label: string;
  children: ReactNode;
  notes?: ReactNode;
}) {
  return (
    <div className="grid gap-x-6 gap-y-2 py-3 sm:grid-cols-[auto_minmax(0,1fr)] sm:items-center">
      <dt className="text-base text-muted-foreground">{label}</dt>
      <dd className="flex min-w-0 flex-col items-start gap-1.5 text-base font-medium sm:items-end sm:text-right">
        {children}
      </dd>
      {notes}
    </div>
  );
}

function RowNote({ tone, children }: { tone: 'muted' | 'danger'; children: ReactNode }) {
  return (
    <dd
      className={cn(
        'text-sm sm:col-span-2',
        tone === 'danger' ? 'text-destructive-foreground' : 'text-muted-foreground',
      )}
    >
      {children}
    </dd>
  );
}

const STATUS_STYLE: Record<StatusRow['kind'], { icon: LucideIcon; className: string }> = {
  progress: { icon: LoaderCircleIcon, className: 'text-muted-strong' },
  waiting: { icon: MailIcon, className: 'text-muted-strong' },
  done: { icon: CircleCheckIcon, className: 'font-medium text-success-foreground' },
  failed: { icon: CircleAlertIcon, className: 'font-medium text-destructive-foreground' },
};

const ACTION_LABEL: Record<AccountAction, string> = {
  resend: 'account.actions.resend',
  relaunch: 'account.actions.relaunch',
  changeEmail: 'account.actions.changeEmail',
};

/**
 * « Accès à l'app » (canvas `caWdo`, `B50o8G`, `bvlFy`, `x7QjF`, `pb6r0`,
 * `iWohO`; board `WeVjb`). Everything shown comes from `describeAccount`;
 * the roster case falls out of the mapper plus the `mode` check.
 */
export function AccountSection({
  member,
  view,
  tracking,
  onAction,
}: {
  member: StaffMemberProfile;
  view: AccountView;
  tracking: AccountTracking;
  onAction: (action: AccountAction) => void;
}) {
  const t = useTranslations('members');
  const locale = useLocale();
  const isLogin = member.account.mode === 'login';
  const status = view.status;
  // R9: a failed relaunch reports the provisioning reason already listed under
  // « Accès »; do not say it twice.
  const showStatus = status != null && !view.lines.some((line) => line.key === status.key);

  return (
    <section className="flex flex-col gap-4">
      <SectionHeading title={t('account.title')} description={t('account.subtitle')} />
      <div className="flex flex-col gap-5">
        <dl className="flex flex-col [&>*+*]:border-t [&>*+*]:border-border">
          <AccountRow
            label={t('account.rows.access')}
            notes={view.lines.map((line) => (
              <RowNote key={line.key} tone={line.tone}>
                {t(line.key)}
              </RowNote>
            ))}
          >
            <AccountStatusBadge badge={view.badge} />
          </AccountRow>
          {isLogin ? (
            <AccountRow
              label={t('account.rows.email')}
              notes={view.emailBadge?.lineKeys.map((key) => (
                <RowNote key={key} tone="muted">
                  {t(key)}
                </RowNote>
              ))}
            >
              <span className="break-all">{member.email}</span>
              {view.emailBadge ? (
                <AccountStatusBadge
                  badge={{ labelKey: view.emailBadge.labelKey, tone: view.emailBadge.tone }}
                />
              ) : null}
            </AccountRow>
          ) : null}
          {view.lastAction ? (
            <AccountRow label={t('account.rows.lastAction')}>
              <span className="font-numeric">
                {t(view.lastAction.key, formatOpMoment(view.lastAction.at, locale))}
              </span>
            </AccountRow>
          ) : null}
        </dl>

        {view.actions.length > 0 ? (
          <div className="flex flex-wrap gap-2.5">
            {view.actions.map((action) => {
              const running = status?.runningAction === action;
              return (
                <Button
                  key={action}
                  variant="outline"
                  disabled={running}
                  className="disabled:opacity-45"
                  onClick={() => onAction(action)}
                >
                  {t(ACTION_LABEL[action])}
                </Button>
              );
            })}
          </div>
        ) : null}

        {!view.canManage && isLogin ? (
          <p className="flex items-start gap-2 text-md text-muted-foreground">
            <ShieldIcon aria-hidden strokeWidth={1.5} className="mt-0.5 size-4 shrink-0" />
            {t('account.receptionistNote')}
          </p>
        ) : null}

        {/*
          The live region stays mounted so each new status line is announced;
          the block leaves the flow (no gap) while the region is empty.
          « Actualiser » sits outside the region so it is not re-announced.
        */}
        <div className="flex flex-col items-start gap-1 has-[>[role=status]:empty]:sr-only">
          <div role="status" aria-live="polite">
            {showStatus ? <StatusLine status={status} /> : null}
          </div>
          {showStatus && status.key === 'account.status.stillRunning' ? (
            <button
              type="button"
              onClick={tracking.refresh}
              className="ml-6 inline-flex min-h-11 items-center text-md font-medium text-foreground underline underline-offset-4 md:min-h-0"
            >
              {t('account.status.refresh')}
            </button>
          ) : null}
        </div>
      </div>
    </section>
  );
}

function StatusLine({ status }: { status: StatusRow }) {
  const t = useTranslations('members');
  const locale = useLocale();
  const { icon: Icon, className } = STATUS_STYLE[status.kind];
  const time = status.at ? formatOpMoment(status.at, locale).time : '';

  return (
    <p className={cn('flex items-start gap-2 text-md', className)}>
      <Icon
        aria-hidden
        strokeWidth={1.5}
        className={cn('mt-0.5 size-4 shrink-0', status.kind === 'progress' && 'animate-spin')}
      />
      <span className="font-numeric">{t(status.key, { time })}</span>
    </p>
  );
}
