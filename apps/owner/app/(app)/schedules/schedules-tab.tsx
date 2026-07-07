'use client';

import { useMemo, useState } from 'react';
import { MoreHorizontalIcon, RepeatIcon } from 'lucide-react';
import { useLocale, useTranslations } from 'next-intl';

import { unwrap } from '@iziwellpass/api/client';
import { useListResources, useListSchedules, useListStaff } from '@iziwellpass/api/generated';
import type { Resource, Schedule, Staff } from '@iziwellpass/api/schemas';
import { Alert, AlertDescription, AlertTitle } from '@iziwellpass/ui/components/alert';
import { Button } from '@iziwellpass/ui/components/button';
import { Card } from '@iziwellpass/ui/components/card';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@iziwellpass/ui/components/dropdown-menu';
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyMedia,
  EmptyTitle,
} from '@iziwellpass/ui/components/empty';
import { Skeleton } from '@iziwellpass/ui/components/skeleton';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@iziwellpass/ui/components/table';

import { apiErrorMessage } from '@/lib/api-error';
import { formatCalendarDate } from '@/lib/datetime';

import { usePlanningLabels } from './planning-utils';
import { AddScheduleDialog, DeleteScheduleDialog, EditScheduleDialog } from './schedule-dialogs';

function CourseRow({
  schedule,
  resourceName,
  instructorName,
  canManage,
  onEdit,
  onDelete,
}: {
  schedule: Schedule;
  resourceName: string;
  instructorName: string;
  canManage: boolean;
  onEdit: (schedule: Schedule) => void;
  onDelete: (schedule: Schedule) => void;
}) {
  const t = useTranslations('planning');
  const locale = useLocale();
  const { formatRecurrence } = usePlanningLabels();

  // `Schedule.start_time`/`end_time` are `NaiveTime` clock strings
  // ("09:00:00") — the recurring template's daily window, already
  // venue-local with no UTC instant to convert. Rendered as-is (trimmed to
  // "HH:MM"); never run through the venue-timezone formatters.
  const clock = `${schedule.start_time.slice(0, 5)}–${schedule.end_time.slice(0, 5)}`;

  const dateRange = schedule.effective_until
    ? t('courses.dateRange', {
        from: formatCalendarDate(schedule.effective_from, locale),
        until: formatCalendarDate(schedule.effective_until, locale),
      })
    : t('courses.dateFrom', { from: formatCalendarDate(schedule.effective_from, locale) });

  return (
    <TableRow>
      <TableCell>
        <div className="font-medium">{schedule.title}</div>
        {schedule.description ? (
          <div className="truncate text-xs text-muted-foreground">{schedule.description}</div>
        ) : null}
      </TableCell>
      <TableCell>
        <div className="text-sm">{formatRecurrence(schedule.recurrence_rule)}</div>
        <div className="font-mono text-xs tabular-nums text-muted-foreground">{clock}</div>
      </TableCell>
      <TableCell>{resourceName}</TableCell>
      <TableCell className={instructorName ? undefined : 'text-muted-foreground'}>
        {instructorName || t('courses.noInstructor')}
      </TableCell>
      <TableCell className="text-muted-foreground">{dateRange}</TableCell>
      <TableCell className="text-right">
        {canManage ? (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon-sm" aria-label={t('courses.rowMenu')}>
                <MoreHorizontalIcon />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onSelect={() => onEdit(schedule)}>
                {t('courses.edit')}
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem variant="destructive" onSelect={() => onDelete(schedule)}>
                {t('courses.delete')}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        ) : null}
      </TableCell>
    </TableRow>
  );
}

export function SchedulesTab({ venueId, canManage }: { venueId: string; canManage: boolean }) {
  const t = useTranslations('planning');

  const schedulesQuery = useListSchedules(venueId, { query: { select: unwrap } });
  const resourcesQuery = useListResources(venueId, { query: { select: unwrap } });
  const staffQuery = useListStaff({ query: { select: unwrap } });

  const resources = useMemo(() => resourcesQuery.data ?? [], [resourcesQuery.data]);
  const staff = useMemo(() => staffQuery.data ?? [], [staffQuery.data]);
  const resourceById = useMemo(
    () => new Map(resources.map((r: Resource) => [r.id, r])),
    [resources],
  );
  const staffById = useMemo(() => new Map(staff.map((s: Staff) => [s.id, s])), [staff]);

  const schedules = useMemo(() => schedulesQuery.data ?? [], [schedulesQuery.data]);

  const [editing, setEditing] = useState<Schedule | null>(null);
  const [deleting, setDeleting] = useState<Schedule | null>(null);

  const instructorName = (schedule: Schedule): string => {
    if (!schedule.instructor_staff_id) return '';
    const member = staffById.get(schedule.instructor_staff_id);
    return member ? `${member.first_name} ${member.last_name}`.trim() : '';
  };

  if (schedulesQuery.isLoading) {
    return (
      <Card className="gap-0 py-0">
        <div className="space-y-3 p-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-10 w-full" />
          ))}
        </div>
      </Card>
    );
  }

  if (schedulesQuery.isError) {
    return (
      <Alert variant="destructive">
        <AlertTitle>{t('errorTitle')}</AlertTitle>
        <AlertDescription>
          {apiErrorMessage(schedulesQuery.error, t('courses.loadError'))}
        </AlertDescription>
      </Alert>
    );
  }

  if (schedules.length === 0) {
    return (
      <Card>
        <Empty>
          <EmptyMedia>
            <RepeatIcon />
          </EmptyMedia>
          <EmptyTitle>{t('courses.emptyTitle')}</EmptyTitle>
          <EmptyDescription>{t('courses.emptyBody')}</EmptyDescription>
          {canManage ? (
            <EmptyContent>
              <AddScheduleDialog venueId={venueId} resources={resources} staff={staff} />
            </EmptyContent>
          ) : null}
        </Empty>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {canManage ? (
        <div className="flex justify-end">
          <AddScheduleDialog venueId={venueId} resources={resources} staff={staff} />
        </div>
      ) : null}

      <Card className="gap-0 overflow-hidden py-0">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>{t('courses.columns.course')}</TableHead>
              <TableHead>{t('courses.columns.recurrence')}</TableHead>
              <TableHead>{t('courses.columns.resource')}</TableHead>
              <TableHead>{t('courses.columns.instructor')}</TableHead>
              <TableHead>{t('courses.columns.period')}</TableHead>
              <TableHead className="text-right">
                <span className="sr-only">{t('courses.columns.actions')}</span>
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {schedules.map((schedule: Schedule) => (
              <CourseRow
                key={schedule.id}
                schedule={schedule}
                resourceName={
                  resourceById.get(schedule.resource_id)?.name ?? t('courses.unknownResource')
                }
                instructorName={instructorName(schedule)}
                canManage={canManage}
                onEdit={setEditing}
                onDelete={setDeleting}
              />
            ))}
          </TableBody>
        </Table>
      </Card>

      {editing ? (
        <EditScheduleDialog
          venueId={venueId}
          schedule={editing}
          resources={resources}
          staff={staff}
          open={editing !== null}
          onOpenChange={(next) => {
            if (!next) setEditing(null);
          }}
        />
      ) : null}
      {deleting ? (
        <DeleteScheduleDialog
          venueId={venueId}
          schedule={deleting}
          open={deleting !== null}
          onOpenChange={(next) => {
            if (!next) setDeleting(null);
          }}
        />
      ) : null}
    </div>
  );
}
