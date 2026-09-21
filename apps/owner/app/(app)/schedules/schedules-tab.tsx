'use client';

import { useMemo, useState } from 'react';
import { MoreHorizontalIcon, RepeatIcon } from 'lucide-react';
import { useLocale, useTranslations } from 'next-intl';

import { unwrap } from '@iziwellpass/api/client';
import { useListResources, useListSchedules, useListStaff } from '@iziwellpass/api/generated';
import type { Resource, Schedule, Staff } from '@iziwellpass/api/schemas';
import { Alert, AlertDescription, AlertTitle } from '@iziwellpass/ui/components/alert';
import { Button } from '@iziwellpass/ui/components/button';
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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@iziwellpass/ui/components/table';

import { useFocusRegistry } from '@/components/focus-registry';
import { RowsSkeleton } from '@/components/rows-skeleton';
import { apiErrorMessage } from '@/lib/api-error';
import { formatCalendarDate } from '@/lib/datetime';

import { CancellationPreviewDialog } from './cancellation-preview-dialog';
import { usePlanningLabels } from './planning-utils';
import { AddScheduleDialog, EditScheduleDialog } from './schedule-dialogs';

/** Edit/delete menu on a 36px « ··· » button, shared by the table row and the phone stack. */
function CourseActions({
  schedule,
  onEdit,
  onDelete,
  size = 'icon-sm',
  menuRef,
}: {
  schedule: Schedule;
  onEdit: (schedule: Schedule) => void;
  onDelete: (schedule: Schedule) => void;
  size?: 'icon' | 'icon-sm';
  menuRef?: (el: HTMLButtonElement | null) => void;
}) {
  const t = useTranslations('planning');
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button ref={menuRef} variant="ghost" size={size} aria-label={t('courses.rowMenu')}>
          <MoreHorizontalIcon />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem onSelect={() => onEdit(schedule)}>{t('courses.edit')}</DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem variant="destructive" onSelect={() => onDelete(schedule)}>
          {t('courses.delete')}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

/** `Schedule.start_time`/`end_time` are `NaiveTime` clock strings ("09:00:00"),
 * the recurring template's venue-local daily window. Trim to "HH:MM"; never run
 * through the venue-timezone formatters. */
function scheduleClock(schedule: Schedule): string {
  return `${schedule.start_time.slice(0, 5)}–${schedule.end_time.slice(0, 5)}`;
}

function usePeriodLabel() {
  const t = useTranslations('planning');
  const locale = useLocale();
  return (schedule: Schedule): string =>
    schedule.effective_until
      ? t('courses.dateRange', {
          from: formatCalendarDate(schedule.effective_from, locale),
          until: formatCalendarDate(schedule.effective_until, locale),
        })
      : t('courses.dateFrom', { from: formatCalendarDate(schedule.effective_from, locale) });
}

interface CourseRowProps {
  schedule: Schedule;
  resourceName: string;
  instructorName: string;
  canManage: boolean;
  onEdit: (schedule: Schedule) => void;
  onDelete: (schedule: Schedule) => void;
  menuRef?: (el: HTMLButtonElement | null) => void;
}

/** Desktop row (canvas `oouHs`): 64px, title + 13px description, rule + clock, room, instructor, period, « ··· ». */
function CourseRow({
  schedule,
  resourceName,
  instructorName,
  canManage,
  onEdit,
  onDelete,
  menuRef,
}: CourseRowProps) {
  const t = useTranslations('planning');
  const { formatRecurrence } = usePlanningLabels();
  const periodLabel = usePeriodLabel();

  return (
    <TableRow>
      <TableCell>
        <p className="font-medium">{schedule.title}</p>
        {schedule.description ? (
          <p className="truncate text-sm text-muted-foreground">{schedule.description}</p>
        ) : null}
      </TableCell>
      <TableCell>
        <p>{formatRecurrence(schedule.recurrence_rule)}</p>
        <p className="font-numeric text-sm font-medium text-muted-foreground">
          {scheduleClock(schedule)}
        </p>
      </TableCell>
      <TableCell>{resourceName}</TableCell>
      <TableCell className={instructorName ? undefined : 'text-muted-foreground'}>
        {instructorName || t('courses.noInstructor')}
      </TableCell>
      <TableCell className="text-muted-foreground">{periodLabel(schedule)}</TableCell>
      <TableCell className="text-right">
        {canManage ? (
          <CourseActions
            schedule={schedule}
            onEdit={onEdit}
            onDelete={onDelete}
            menuRef={menuRef}
          />
        ) : null}
      </TableCell>
    </TableRow>
  );
}

/** Phone stack (spec D6): the same cells stacked between hairlines, no card. */
function CourseStack({
  schedule,
  resourceName,
  instructorName,
  canManage,
  onEdit,
  onDelete,
  menuRef,
}: CourseRowProps) {
  const t = useTranslations('planning');
  const { formatRecurrence } = usePlanningLabels();
  const periodLabel = usePeriodLabel();

  return (
    <div className="flex items-start gap-3 border-b border-border py-3 last:border-0">
      <div className="min-w-0 flex-1 leading-tight">
        <p className="truncate font-medium">{schedule.title}</p>
        <p className="mt-0.5 flex flex-wrap items-center gap-x-2 text-sm text-muted-foreground">
          <span>{formatRecurrence(schedule.recurrence_rule)}</span>
          <span className="font-numeric font-medium">{scheduleClock(schedule)}</span>
        </p>
        <p className="mt-0.5 truncate text-sm text-muted-foreground">
          {resourceName}
          {instructorName ? ` · ${instructorName}` : ` · ${t('courses.noInstructor')}`}
        </p>
        <p className="mt-0.5 text-sm text-muted-foreground">{periodLabel(schedule)}</p>
      </div>
      {canManage ? (
        <CourseActions
          schedule={schedule}
          onEdit={onEdit}
          onDelete={onDelete}
          size="icon"
          menuRef={menuRef}
        />
      ) : null}
    </div>
  );
}

export function SchedulesTab({ venueId, canManage }: { venueId: string; canManage: boolean }) {
  const t = useTranslations('planning');
  const { formatRecurrence } = usePlanningLabels();

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
  const focus = useFocusRegistry();

  const [editing, setEditing] = useState<Schedule | null>(null);
  const [editOpen, setEditOpen] = useState(false);
  const [deleting, setDeleting] = useState<Schedule | null>(null);
  const [deleteOpen, setDeleteOpen] = useState(false);

  const instructorName = (schedule: Schedule): string => {
    if (!schedule.instructor_staff_id) return '';
    const member = staffById.get(schedule.instructor_staff_id);
    return member ? `${member.first_name} ${member.last_name}`.trim() : '';
  };

  // Gate on the label-feeding queries too (resource names + instructor names)
  // so rows never render fallback labels that then flash to real names once
  // the secondary queries resolve. The schedules query stays the primary driver.
  if (schedulesQuery.isLoading || resourcesQuery.isLoading || staffQuery.isLoading) {
    return <RowsSkeleton />;
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
      <Empty>
        <EmptyMedia>
          <RepeatIcon />
        </EmptyMedia>
        <EmptyTitle>{t('courses.emptyTitle')}</EmptyTitle>
        <EmptyDescription>{t('courses.emptyBody')}</EmptyDescription>
        {canManage ? (
          <EmptyContent>
            <AddScheduleDialog
              venueId={venueId}
              resources={resources}
              staff={staff}
              variant="secondary"
            />
          </EmptyContent>
        ) : null}
      </Empty>
    );
  }

  const rowProps = (schedule: Schedule): CourseRowProps => ({
    schedule,
    resourceName: resourceById.get(schedule.resource_id)?.name ?? t('courses.unknownResource'),
    instructorName: instructorName(schedule),
    canManage,
    onEdit: (s) => {
      setEditing(s);
      setEditOpen(true);
    },
    onDelete: (s) => {
      setDeleting(s);
      setDeleteOpen(true);
    },
    menuRef: focus.register(schedule.id),
  });

  return (
    <>
      {/* Phone: stacked hairline rows. The 6-column table would force horizontal scroll at 375px. */}
      <div className="md:hidden">
        {schedules.map((schedule: Schedule) => (
          <CourseStack key={schedule.id} {...rowProps(schedule)} />
        ))}
      </div>
      {/* Tablet/desktop: the hairline table at the canvas column widths. */}
      <div className="hidden md:block">
        <Table className="table-fixed">
          <TableHeader>
            <TableRow>
              <TableHead className="w-[204px]">{t('courses.columns.course')}</TableHead>
              <TableHead className="w-[300px]">{t('courses.columns.recurrence')}</TableHead>
              <TableHead className="w-[120px]">{t('courses.columns.resource')}</TableHead>
              <TableHead className="w-[160px]">{t('courses.columns.instructor')}</TableHead>
              <TableHead className="w-[220px]">{t('courses.columns.period')}</TableHead>
              <TableHead className="w-16 text-right">
                <span className="sr-only">{t('courses.columns.actions')}</span>
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {schedules.map((schedule: Schedule) => (
              <CourseRow key={schedule.id} {...rowProps(schedule)} />
            ))}
          </TableBody>
        </Table>
      </div>

      {editing ? (
        <EditScheduleDialog
          venueId={venueId}
          schedule={editing}
          resources={resources}
          staff={staff}
          open={editOpen}
          onOpenChange={setEditOpen}
          restoreFocusTo={() => focus.get(editing?.id)}
        />
      ) : null}
      {deleting ? (
        <CancellationPreviewDialog
          target={{
            kind: 'schedule',
            schedule: deleting,
            description: t('deleteCourse.description', {
              title: deleting.title,
              recurrence: formatRecurrence(deleting.recurrence_rule),
              start: deleting.start_time.slice(0, 5),
              end: deleting.end_time.slice(0, 5),
            }),
          }}
          venueId={venueId}
          open={deleteOpen}
          onOpenChange={setDeleteOpen}
          restoreFocusTo={() => focus.get(deleting?.id)}
        />
      ) : null}
    </>
  );
}
