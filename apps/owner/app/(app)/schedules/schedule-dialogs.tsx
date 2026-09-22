'use client';

import { useEffect, useMemo, useState } from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import { useQueryClient } from '@tanstack/react-query';
import { PlusIcon } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useForm } from 'react-hook-form';
import { toast } from 'sonner';
import { z } from 'zod';

import {
  getListSchedulesQueryKey,
  getListSlotsQueryKey,
  useCreateSchedule,
  useUpdateSchedule,
} from '@iziwellpass/api/generated';
import type { Resource, Schedule, Staff } from '@iziwellpass/api/schemas';
import { Button } from '@iziwellpass/ui/components/button';
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@iziwellpass/ui/components/dialog';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@iziwellpass/ui/components/form';
import { Input } from '@iziwellpass/ui/components/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@iziwellpass/ui/components/select';
import { Textarea } from '@iziwellpass/ui/components/textarea';

import { apiErrorMessage, applyFieldErrors, overrideFieldMessages } from '@/lib/api-error';
import {
  parseRecurrenceRule,
  serializeRecurrenceRule,
  type RecurrenceEditorState,
} from '@/lib/recurrence';

import { RecurrenceEditor } from './recurrence-editor';

const NO_INSTRUCTOR = '__none__';

function useScheduleSchema() {
  const t = useTranslations('planning');
  return useMemo(
    () =>
      z.object({
        title: z.string().min(1, t('validation.titleRequired')),
        resource_id: z.string().min(1, t('validation.resourceRequired')),
        instructor_staff_id: z.string(),
        start_time: z.string().min(1, t('validation.startTimeRequired')),
        end_time: z.string().min(1, t('validation.endTimeRequired')),
        effective_from: z.string().min(1, t('validation.startDateRequired')),
        effective_until: z.string(),
        description: z.string(),
      }),
    [t],
  );
}

type ScheduleValues = z.infer<ReturnType<typeof useScheduleSchema>>;

function todayIsoDate(): string {
  // Local calendar date (not toISOString, which is UTC) so the default start
  // date matches the user's day near midnight in non-UTC zones.
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function scheduleToDefaults(schedule: Schedule): ScheduleValues {
  return {
    title: schedule.title,
    resource_id: schedule.resource_id,
    instructor_staff_id: schedule.instructor_staff_id ?? NO_INSTRUCTOR,
    start_time: schedule.start_time.slice(0, 5),
    end_time: schedule.end_time.slice(0, 5),
    effective_from: schedule.effective_from,
    effective_until: schedule.effective_until ?? '',
    description: schedule.description ?? '',
  };
}

function emptyScheduleDefaults(): ScheduleValues {
  return {
    title: '',
    resource_id: '',
    instructor_staff_id: NO_INSTRUCTOR,
    start_time: '09:00',
    end_time: '10:00',
    effective_from: todayIsoDate(),
    effective_until: '',
    description: '',
  };
}

/**
 * Canvas `jFogY`, top to bottom: Titre · Salle / Intervenant · Description /
 * « Horaire » / Répétition · Intervalle / Les jours / Heure de début · Heure de
 * fin / À partir du · Jusqu'au. 18px between rows, 16px gutter.
 */
function ScheduleFormFields({
  form,
  resources,
  staff,
  recurrence,
  onRecurrenceChange,
}: {
  form: ReturnType<typeof useForm<ScheduleValues>>;
  resources: Resource[];
  staff: Staff[];
  recurrence: RecurrenceEditorState;
  onRecurrenceChange: (next: RecurrenceEditorState) => void;
}) {
  const t = useTranslations('planning');

  return (
    <div className="flex flex-col gap-[18px]">
      <div className="grid gap-4 sm:grid-cols-2">
        <FormField
          control={form.control}
          name="title"
          render={({ field }) => (
            <FormItem>
              <FormLabel>{t('form.title')}</FormLabel>
              <FormControl>
                <Input {...field} placeholder={t('form.titlePlaceholder')} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="resource_id"
          render={({ field }) => (
            <FormItem>
              <FormLabel>{t('form.resource')}</FormLabel>
              <Select value={field.value} onValueChange={field.onChange}>
                <FormControl>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder={t('form.resourcePlaceholder')} />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  {resources.map((resource) => (
                    <SelectItem key={resource.id} value={resource.id}>
                      {resource.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <FormField
          control={form.control}
          name="instructor_staff_id"
          render={({ field }) => (
            <FormItem>
              <FormLabel>{t('form.instructor')}</FormLabel>
              <Select value={field.value} onValueChange={field.onChange}>
                <FormControl>
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  <SelectItem value={NO_INSTRUCTOR}>{t('form.noInstructor')}</SelectItem>
                  {staff.map((member) => (
                    <SelectItem key={member.id} value={member.id}>
                      {member.first_name} {member.last_name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="description"
          render={({ field }) => (
            <FormItem>
              <FormLabel>{t('form.description')}</FormLabel>
              <FormControl>
                <Textarea {...field} className="min-h-24" />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
      </div>

      <h3 className="text-lg font-semibold">{t('form.sectionTiming')}</h3>

      <RecurrenceEditor value={recurrence} onChange={onRecurrenceChange} />

      <div className="grid gap-4 sm:grid-cols-2">
        <FormField
          control={form.control}
          name="start_time"
          render={({ field }) => (
            <FormItem>
              <FormLabel>{t('form.startTime')}</FormLabel>
              <FormControl>
                <Input type="time" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="end_time"
          render={({ field }) => (
            <FormItem>
              <FormLabel>{t('form.endTime')}</FormLabel>
              <FormControl>
                <Input type="time" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <FormField
          control={form.control}
          name="effective_from"
          render={({ field }) => (
            <FormItem>
              <FormLabel>{t('form.effectiveFrom')}</FormLabel>
              <FormControl>
                <Input type="date" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="effective_until"
          render={({ field }) => (
            <FormItem>
              <FormLabel>{t('form.effectiveUntil')}</FormLabel>
              <FormControl>
                <Input type="date" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Add
// ---------------------------------------------------------------------------

export function AddScheduleDialog({
  venueId,
  resources,
  staff,
  variant = 'default',
}: {
  venueId: string;
  resources: Resource[];
  staff: Staff[];
  variant?: 'default' | 'secondary';
}) {
  const t = useTranslations('planning');
  const tCommon = useTranslations('common');
  const schema = useScheduleSchema();
  const [open, setOpen] = useState(false);
  const [recurrence, setRecurrence] = useState<RecurrenceEditorState>(() =>
    parseRecurrenceRule(null),
  );
  const queryClient = useQueryClient();
  const createSchedule = useCreateSchedule();

  const form = useForm<ScheduleValues>({
    resolver: zodResolver(schema),
    defaultValues: emptyScheduleDefaults(),
  });

  const resetAll = () => {
    form.reset(emptyScheduleDefaults());
    setRecurrence(parseRecurrenceRule(null));
  };

  const onSubmit = (values: ScheduleValues) => {
    createSchedule.mutate(
      {
        vid: venueId,
        data: {
          venue_id: venueId,
          resource_id: values.resource_id,
          title: values.title,
          description: values.description || null,
          instructor_staff_id:
            values.instructor_staff_id === NO_INSTRUCTOR ? null : values.instructor_staff_id,
          start_time: values.start_time,
          end_time: values.end_time,
          effective_from: values.effective_from,
          effective_until: values.effective_until || null,
          recurrence_rule: serializeRecurrenceRule(recurrence),
        },
      },
      {
        onSuccess: () => {
          toast.success(t('scheduleDialog.createSuccess'));
          void queryClient.invalidateQueries({ queryKey: getListSchedulesQueryKey(venueId) });
          void queryClient.invalidateQueries({ queryKey: getListSlotsQueryKey(venueId) });
          resetAll();
          setOpen(false);
        },
        onError: (err) => {
          const mapped = overrideFieldMessages(err, {
            instructor_staff_id: t('form.instructorIneligible'),
          });
          if (!applyFieldErrors(form, mapped)) {
            toast.error(apiErrorMessage(err, t('scheduleDialog.createError')));
          }
        },
      },
    );
  };

  const weeklyNeedsDay = recurrence.frequency === 'weekly' && recurrence.byDay.length === 0;

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (!next) resetAll();
      }}
    >
      <DialogTrigger asChild>
        <Button variant={variant}>
          <PlusIcon />
          {t('addCourse')}
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[620px]">
        <DialogHeader>
          <DialogTitle>{t('scheduleDialog.addTitle')}</DialogTitle>
          <DialogDescription>{t('scheduleDialog.addDescription')}</DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form
            onSubmit={(e) => void form.handleSubmit(onSubmit)(e)}
            className="flex flex-col gap-6"
          >
            <ScheduleFormFields
              form={form}
              resources={resources}
              staff={staff}
              recurrence={recurrence}
              onRecurrenceChange={setRecurrence}
            />
            <DialogFooter className="items-center">
              {weeklyNeedsDay ? (
                <p className="text-sm text-muted-foreground sm:mr-auto">
                  {t('form.weekdayRequired')}
                </p>
              ) : null}
              <DialogClose asChild>
                <Button type="button" variant="ghost">
                  {tCommon('cancel')}
                </Button>
              </DialogClose>
              <Button type="submit" disabled={createSchedule.isPending || weeklyNeedsDay}>
                {createSchedule.isPending
                  ? t('scheduleDialog.creating')
                  : t('scheduleDialog.create')}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}

// ---------------------------------------------------------------------------
// Edit
// ---------------------------------------------------------------------------

export function EditScheduleDialog({
  venueId,
  schedule,
  resources,
  staff,
  open,
  onOpenChange,
  restoreFocusTo,
}: {
  venueId: string;
  schedule: Schedule;
  resources: Resource[];
  staff: Staff[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
  restoreFocusTo?: () => HTMLElement | null | undefined;
}) {
  const t = useTranslations('planning');
  const tCommon = useTranslations('common');
  const schema = useScheduleSchema();
  const queryClient = useQueryClient();
  const updateSchedule = useUpdateSchedule();
  const [recurrence, setRecurrence] = useState<RecurrenceEditorState>(() =>
    parseRecurrenceRule(schedule.recurrence_rule),
  );

  const form = useForm<ScheduleValues>({
    resolver: zodResolver(schema),
    defaultValues: scheduleToDefaults(schedule),
  });

  useEffect(() => {
    form.reset(scheduleToDefaults(schedule));
    setRecurrence(parseRecurrenceRule(schedule.recurrence_rule));
  }, [schedule, form]);

  const onSubmit = (values: ScheduleValues) => {
    updateSchedule.mutate(
      {
        sid: schedule.id,
        data: {
          title: values.title,
          description: values.description || null,
          instructor_staff_id:
            values.instructor_staff_id === NO_INSTRUCTOR ? null : values.instructor_staff_id,
          start_time: values.start_time,
          end_time: values.end_time,
          effective_until: values.effective_until || null,
          recurrence_rule: serializeRecurrenceRule(recurrence),
        },
      },
      {
        onSuccess: () => {
          toast.success(t('scheduleDialog.updateSuccess'));
          void queryClient.invalidateQueries({ queryKey: getListSchedulesQueryKey(venueId) });
          void queryClient.invalidateQueries({ queryKey: getListSlotsQueryKey(venueId) });
          onOpenChange(false);
        },
        onError: (err) => {
          const mapped = overrideFieldMessages(err, {
            instructor_staff_id: t('form.instructorIneligible'),
          });
          if (!applyFieldErrors(form, mapped)) {
            toast.error(apiErrorMessage(err, t('scheduleDialog.updateError')));
          }
        },
      },
    );
  };

  const weeklyNeedsDay = recurrence.frequency === 'weekly' && recurrence.byDay.length === 0;

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        onOpenChange(next);
        if (!next) {
          form.reset(scheduleToDefaults(schedule));
          setRecurrence(parseRecurrenceRule(schedule.recurrence_rule));
        }
      }}
    >
      <DialogContent
        aria-describedby={undefined}
        className="sm:max-w-[620px]"
        restoreFocusTo={restoreFocusTo}
      >
        <DialogHeader>
          <DialogTitle>{t('scheduleDialog.editTitle')}</DialogTitle>
        </DialogHeader>
        <Form {...form}>
          <form
            onSubmit={(e) => void form.handleSubmit(onSubmit)(e)}
            className="flex flex-col gap-6"
          >
            <ScheduleFormFields
              form={form}
              resources={resources}
              staff={staff}
              recurrence={recurrence}
              onRecurrenceChange={setRecurrence}
            />
            <DialogFooter className="items-center">
              {weeklyNeedsDay ? (
                <p className="text-sm text-muted-foreground sm:mr-auto">
                  {t('form.weekdayRequired')}
                </p>
              ) : null}
              <DialogClose asChild>
                <Button type="button" variant="ghost">
                  {tCommon('cancel')}
                </Button>
              </DialogClose>
              <Button type="submit" disabled={updateSchedule.isPending || weeklyNeedsDay}>
                {updateSchedule.isPending ? t('scheduleDialog.saving') : t('scheduleDialog.save')}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
