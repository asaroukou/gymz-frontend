'use client';

import type { ReactNode } from 'react';
import Link from 'next/link';
import { CalendarPlusIcon, ScanLineIcon, UserPlusIcon } from 'lucide-react';
import { useTranslations } from 'next-intl';

import type { StaffMemberView, TodayAttendance } from '@iziwellpass/api/schemas';
import { useRole } from '@iziwellpass/auth/provider';
import { Button } from '@iziwellpass/ui/components/button';
import {
  HubEyebrow,
  HubHero,
  HubLead,
  HubSection,
  HubTitle,
} from '@iziwellpass/ui/components/hub-page';
import { Tile, TileMeta, TileTitle, TileTop } from '@iziwellpass/ui/components/tile';

import { canAccessPath } from '@/lib/nav';

import { KpiRow } from './kpi-row';
import type { QueryLike } from './use-dashboard-data';

interface Step {
  index: number;
  href: string;
  icon: ReactNode;
  title: string;
  body: string;
  cta: string;
}

/**
 * First-week starter, shown when the venue has no schedules AND no members:
 * a welcome instead of the greeting, three tinted step tiles (create a
 * schedule → add a member → first check-in), the stat strip at zero, and a
 * sentence saying what will appear here. No command bar, as drawn.
 */
export function Starter({
  dateLine,
  name,
  attendance,
  members,
}: {
  dateLine: string;
  name: string | null;
  attendance: QueryLike<TodayAttendance>;
  members: QueryLike<StaffMemberView[]>;
}) {
  const t = useTranslations('dashboard');
  const role = useRole();

  const iconClass = 'size-5 text-muted-strong';
  const steps: Step[] = [
    {
      index: 1,
      href: '/schedules',
      icon: <CalendarPlusIcon className={iconClass} aria-hidden="true" />,
      title: t('starter.step1Title'),
      body: t('starter.step1Body'),
      cta: t('starter.step1Cta'),
    },
    {
      index: 2,
      href: '/members',
      icon: <UserPlusIcon className={iconClass} aria-hidden="true" />,
      title: t('starter.step2Title'),
      body: t('starter.step2Body'),
      cta: t('starter.step2Cta'),
    },
    {
      index: 3,
      href: '/checkins',
      icon: <ScanLineIcon className={iconClass} aria-hidden="true" />,
      title: t('starter.step3Title'),
      body: t('starter.step3Body'),
      cta: t('starter.step3Cta'),
    },
  ];

  return (
    <>
      <HubHero>
        <HubEyebrow>{dateLine}</HubEyebrow>
        <HubTitle>{name ? t('starter.title', { name }) : t('starter.titleNoName')}</HubTitle>
        <HubLead>{t('starter.body')}</HubLead>
      </HubHero>
      <ol className="grid w-full grid-cols-1 gap-4 md:grid-cols-3">
        {steps.map((step, i) => (
          <li key={step.index} className="contents">
            <Tile aspect="tall" tint={i} className="gap-4 p-6">
              <TileTop>
                <span className="font-numeric text-xl font-medium">{step.index}</span>
                {step.icon}
              </TileTop>
              <div className="flex flex-col gap-4">
                <div>
                  <TileTitle>{step.title}</TileTitle>
                  <TileMeta>{step.body}</TileMeta>
                </div>
                {/* A role that can't perform the step gets it as context, not a link. */}
                {canAccessPath(role, step.href) ? (
                  <Button
                    asChild
                    variant="ghost"
                    size="sm"
                    className="self-start bg-card hover:bg-side"
                  >
                    <Link href={step.href}>{step.cta}</Link>
                  </Button>
                ) : null}
              </div>
            </Tile>
          </li>
        ))}
      </ol>
      <HubSection>
        <KpiRow attendance={attendance} members={members} />
      </HubSection>
      <p className="text-center text-md text-muted-foreground">{t('starter.placeholder')}</p>
    </>
  );
}
