'use client';

import { useCallback, useMemo, useState } from 'react';
import { useLocale, useTranslations } from 'next-intl';

import type { MembershipStatus } from '@iziwellpass/api/schemas';
import { useSession } from '@iziwellpass/auth/provider';
import {
  HubEyebrow,
  HubHero,
  HubPage,
  HubSection,
  HubTitle,
} from '@iziwellpass/ui/components/hub-page';
import { Skeleton } from '@iziwellpass/ui/components/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@iziwellpass/ui/components/tabs';

import { CheckinCommand } from '@/components/checkin/checkin-command';
import { CheckinFeed } from '@/components/checkin/checkin-feed';
import type { CheckinMode } from '@/components/checkin/checkin-modes';
import { useRegisterCheckin } from '@/components/checkin/use-register-checkin';
import { todayLabel } from '@/lib/datetime';
import { useVenueContext } from '@/lib/venue-context';

import { KpiRow } from './dashboard/kpi-row';
import { SectionError } from './dashboard/section-error';
import { Starter } from './dashboard/starter';
import { TodayTiles } from './dashboard/today-tiles';
import { useDashboardData } from './dashboard/use-dashboard-data';

type Tab = 'schedule' | 'checkins';

function LoadingHub({ dateLine }: { dateLine: string }) {
  return (
    <>
      <HubHero>
        <HubEyebrow>{dateLine}</HubEyebrow>
        <Skeleton className="h-10 w-72 md:h-12 md:w-80" />
        <Skeleton className="h-14 w-full max-w-[45rem] rounded-full md:h-[60px]" />
      </HubHero>
      <HubSection aria-hidden="true">
        <div className="flex gap-10">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-14 w-24" />
          ))}
        </div>
      </HubSection>
      <div className="grid w-full grid-cols-2 gap-4 lg:grid-cols-4" aria-hidden="true">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="aspect-square w-full rounded-xl" />
        ))}
      </div>
    </>
  );
}

/**
 * The hub once a venue is selected. Every venue-scoped query fans out from
 * `useDashboardData`; the starter-vs-hub decision waits on schedules +
 * members so the first-week starter never flashes over the tiles.
 */
function DashboardBody({
  venueId,
  timeZone,
  dateLine,
  name,
}: {
  venueId: string;
  timeZone: string | undefined;
  dateLine: string;
  name: string | null;
}) {
  const t = useTranslations('dashboard');
  const tMembers = useTranslations('members');
  const data = useDashboardData(venueId, timeZone);
  const { attendance, members, slots, schedules, resources, checkIns, staff } = data;

  const list = useMemo(() => members.data ?? [], [members.data]);
  const memberById = useMemo(() => new Map(list.map((m) => [m.id, m])), [list]);
  const register = useRegisterCheckin({ venueId, memberById });
  const statusLabel = useCallback(
    (status: MembershipStatus) => tMembers(`status.${status}`),
    [tMembers],
  );
  const [mode, setMode] = useState<CheckinMode>('qr');
  const [tab, setTab] = useState<Tab>('schedule');

  if (schedules.isLoading || members.isLoading) {
    return <LoadingHub dateLine={dateLine} />;
  }

  const hasNoSchedules = !schedules.isError && (schedules.data ?? []).length === 0;
  const hasNoMembers = !members.isError && list.length === 0;
  if (hasNoSchedules && hasNoMembers) {
    return <Starter dateLine={dateLine} name={name} attendance={attendance} members={members} />;
  }

  return (
    <>
      <HubHero>
        <HubEyebrow>{dateLine}</HubEyebrow>
        <HubTitle>{name ? t('greeting', { name }) : t('greetingNoName')}</HubTitle>
        <CheckinCommand
          mode={mode}
          onModeChange={setMode}
          members={list}
          membersError={members.isError}
          register={register}
          statusLabel={statusLabel}
        />
      </HubHero>
      <HubSection>
        <KpiRow attendance={attendance} members={members} />
      </HubSection>
      <HubSection>
        <Tabs
          value={tab}
          onValueChange={(value) => setTab(value as Tab)}
          className="w-full items-center gap-6"
        >
          <TabsList aria-label={t('tabs.label')}>
            <TabsTrigger value="schedule">{t('tabs.schedule')}</TabsTrigger>
            <TabsTrigger value="checkins">{t('tabs.checkins')}</TabsTrigger>
          </TabsList>
          <TabsContent value="schedule" className="w-full">
            <TodayTiles
              slots={slots}
              schedules={schedules}
              resources={resources}
              staff={staff}
              timeZone={timeZone}
            />
          </TabsContent>
          <TabsContent value="checkins" className="flex w-full justify-center">
            <CheckinFeed
              checkIns={checkIns}
              members={members}
              staff={staff}
              timeZone={timeZone}
              limit={8}
            />
          </TabsContent>
        </Tabs>
      </HubSection>
    </>
  );
}

export default function DashboardPage() {
  const t = useTranslations('dashboard');
  const locale = useLocale();
  const session = useSession();

  // Greet by real given name when the token carries one; otherwise a warm
  // name-less « Bonjour » rather than the email local-part.
  const name = session.status === 'signed-in' ? session.claims.name : null;

  const { venues, isLoading, isError, error, selectedVenueId, selectedVenue } = useVenueContext();
  const timeZone = selectedVenue?.timezone;
  const date = todayLabel(locale, timeZone);
  const dateLine = selectedVenue ? t('dateLine', { date, venue: selectedVenue.name }) : date;

  return (
    <HubPage wash>
      {isLoading ? (
        <LoadingHub dateLine={dateLine} />
      ) : isError ? (
        <>
          <HubHero>
            <HubEyebrow>{dateLine}</HubEyebrow>
            <HubTitle>{name ? t('greeting', { name }) : t('greetingNoName')}</HubTitle>
          </HubHero>
          <SectionError error={error} fallback={t('errors.venues')} />
        </>
      ) : venues.length === 0 || !selectedVenueId ? (
        <>
          <HubHero>
            <HubEyebrow>{dateLine}</HubEyebrow>
            <HubTitle>{name ? t('greeting', { name }) : t('greetingNoName')}</HubTitle>
          </HubHero>
          <p className="py-6 text-center text-base text-muted-foreground">
            {venues.length === 0 ? t('venueNone') : t('venuePrompt')}
          </p>
        </>
      ) : (
        <DashboardBody
          venueId={selectedVenueId}
          timeZone={timeZone}
          dateLine={dateLine}
          name={name}
        />
      )}
    </HubPage>
  );
}
