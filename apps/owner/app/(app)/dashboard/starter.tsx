'use client';

import type { ReactNode } from 'react';
import Link from 'next/link';
import { ArrowRightIcon, CalendarPlusIcon, ScanLineIcon, UserPlusIcon } from 'lucide-react';
import { useTranslations } from 'next-intl';

import { useRole } from '@iziwellpass/auth/provider';
import { Card, CardContent } from '@iziwellpass/ui/components/card';
import { Empty, EmptyDescription, EmptyMedia, EmptyTitle } from '@iziwellpass/ui/components/empty';
import { cn } from '@iziwellpass/ui/lib/utils';

import { canAccessPath } from '@/lib/nav';

interface Step {
  index: number;
  href: string;
  icon: ReactNode;
  title: string;
  body: string;
}

const STEP_CARD_CLASS = 'flex items-start gap-3 border bg-card p-4 text-card-foreground';

function StepBody({ step, canAccess }: { step: Step; canAccess: boolean }) {
  return (
    <>
      <div className="grid size-9 shrink-0 place-items-center rounded-full bg-secondary text-muted-foreground">
        {step.icon}
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <span className="font-numeric text-xs text-muted-foreground">{step.index}</span>
          <p className="text-sm font-medium">{step.title}</p>
        </div>
        <p className="mt-0.5 text-xs text-muted-foreground">{step.body}</p>
      </div>
      {canAccess ? (
        <ArrowRightIcon className="mt-0.5 size-4 shrink-0 text-muted-foreground" aria-hidden />
      ) : null}
    </>
  );
}

function StepCard({ step, canAccess }: { step: Step; canAccess: boolean }) {
  if (!canAccess) {
    // A role that can't perform the action gets the step as context, not a
    // link — no dead-end navigation to a no-access page.
    return (
      <div className={STEP_CARD_CLASS}>
        <StepBody step={step} canAccess={canAccess} />
      </div>
    );
  }

  return (
    <Link href={step.href} className={cn(STEP_CARD_CLASS, 'transition-colors hover:bg-accent')}>
      <StepBody step={step} canAccess={canAccess} />
    </Link>
  );
}

/**
 * First-week starter shown when the selected venue has no schedules AND no
 * members — replaces the KPI/schedule grid with a guided 3-step path into
 * the app (create a schedule → add a member → first check-in).
 */
export function Starter() {
  const t = useTranslations('dashboard');
  const role = useRole();

  const iconClass = 'size-[18px]';
  const steps: Step[] = [
    {
      index: 1,
      href: '/schedules',
      icon: <CalendarPlusIcon className={iconClass} />,
      title: t('starter.step1Title'),
      body: t('starter.step1Body'),
    },
    {
      index: 2,
      href: '/members',
      icon: <UserPlusIcon className={iconClass} />,
      title: t('starter.step2Title'),
      body: t('starter.step2Body'),
    },
    {
      index: 3,
      href: '/checkins',
      icon: <ScanLineIcon className={iconClass} />,
      title: t('starter.step3Title'),
      body: t('starter.step3Body'),
    },
  ];

  return (
    <Card>
      <CardContent className="flex flex-col gap-6">
        <Empty className="px-0 py-2">
          <EmptyMedia>
            <CalendarPlusIcon />
          </EmptyMedia>
          <EmptyTitle>{t('starter.title')}</EmptyTitle>
          <EmptyDescription>{t('starter.body')}</EmptyDescription>
        </Empty>
        <div className="grid gap-4 md:grid-cols-3">
          {steps.map((step) => (
            <StepCard key={step.index} step={step} canAccess={canAccessPath(role, step.href)} />
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
