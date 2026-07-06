'use client';

import { useEffect, useMemo, useState } from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import { useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { toast } from 'sonner';
import { z } from 'zod';

import { ApiError, unwrap } from '@iziwellpass/api/client';
import {
  getListBookingsForSlotQueryKey,
  getListSchedulesQueryKey,
  getListSlotsQueryKey,
  useCancelBooking,
  useCancelSchedule,
  useCancelSlot,
  useCreateBooking,
  useCreateSchedule,
  useListBookingsForSlot,
  useListMembers,
  useListResources,
  useListSchedules,
  useListSlots,
  useListStaff,
  useUpdateSchedule,
} from '@iziwellpass/api/generated';
import type {
  Booking,
  BookingStatus,
  CreateBookingRequest,
  Member,
  Resource,
  Schedule,
  ScheduleSlot,
  Staff,
} from '@iziwellpass/api/schemas';
import { BookingSource } from '@iziwellpass/api/schemas';
import { useRole } from '@iziwellpass/auth/provider';
import { Badge } from '@iziwellpass/ui/components/badge';
import { Button } from '@iziwellpass/ui/components/button';
import { Card, CardContent, CardHeader, CardTitle } from '@iziwellpass/ui/components/card';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@iziwellpass/ui/components/dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@iziwellpass/ui/components/dropdown-menu';
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
import { Skeleton } from '@iziwellpass/ui/components/skeleton';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@iziwellpass/ui/components/table';

import { formatDateHeading, formatTime, venueDateKey } from '@/lib/datetime';
import { useVenueSelection } from '@/lib/use-venue-selection';
import {
  parseRecurrenceRule,
  serializeRecurrenceRule,
  humanizeRecurrenceRule,
  WEEKDAYS,
  weekdayLabel,
  type RecurrenceEditorState,
  type Weekday,
} from '@/lib/recurrence';

function apiErrorMessage(err: unknown, fallback: string): string {
  return err instanceof ApiError ? `${fallback} (${err.code})` : fallback;
}

function labelize(value: string): string {
  return value.replace(/_/g, ' ');
}

const NO_INSTRUCTOR = '__none__';

// ---------------------------------------------------------------------------
// Venue select
// ---------------------------------------------------------------------------

function VenueSelect() {
  const { venues, isLoading, isError, error, selectedVenueId, setSelectedVenueId } =
    useVenueSelection();

  if (isLoading) {
    return <Skeleton className="h-9 w-64" />;
  }

  if (isError) {
    return (
      <p className="text-sm text-destructive">{apiErrorMessage(error, 'Failed to load venues')}</p>
    );
  }

  if (venues.length === 0) {
    return null;
  }

  return (
    <Select value={selectedVenueId ?? undefined} onValueChange={setSelectedVenueId}>
      <SelectTrigger className="w-64">
        <SelectValue placeholder="Select a venue" />
      </SelectTrigger>
      <SelectContent>
        {venues.map((venue) => (
          <SelectItem key={venue.id} value={venue.id}>
            {venue.name}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

// ---------------------------------------------------------------------------
// Recurrence editor (maps to the `RecurrenceRule` iCal-subset string)
// ---------------------------------------------------------------------------

function RecurrenceEditor({
  value,
  onChange,
}: {
  value: RecurrenceEditorState;
  onChange: (next: RecurrenceEditorState) => void;
}) {
  const toggleDay = (day: Weekday) => {
    const has = value.byDay.includes(day);
    onChange({
      ...value,
      byDay: has ? value.byDay.filter((d) => d !== day) : [...value.byDay, day],
    });
  };

  return (
    <div className="space-y-3 rounded-md border p-3">
      <div className="space-y-1.5">
        <FormLabel>Repeats</FormLabel>
        <Select
          value={value.frequency}
          onValueChange={(frequency) =>
            onChange({
              ...value,
              frequency: frequency as RecurrenceEditorState['frequency'],
            })
          }
        >
          <SelectTrigger className="w-full">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="none">Does not repeat</SelectItem>
            <SelectItem value="daily">Daily</SelectItem>
            <SelectItem value="weekly">Weekly</SelectItem>
          </SelectContent>
        </Select>
      </div>
      {value.frequency === 'weekly' ? (
        <div className="space-y-1.5">
          <FormLabel>On these days</FormLabel>
          <div className="flex flex-wrap gap-1.5">
            {WEEKDAYS.map((day) => (
              <Button
                key={day}
                type="button"
                size="sm"
                variant={value.byDay.includes(day) ? 'default' : 'outline'}
                onClick={() => toggleDay(day)}
              >
                {weekdayLabel(day)}
              </Button>
            ))}
          </div>
        </div>
      ) : null}
      {value.frequency !== 'none' ? (
        <div className="space-y-1.5">
          <FormLabel>
            Every {value.interval} {value.frequency === 'daily' ? 'day(s)' : 'week(s)'}
          </FormLabel>
          <Input
            type="number"
            min={1}
            value={Number.isNaN(value.interval) ? '' : value.interval}
            onChange={(e) => onChange({ ...value, interval: e.target.valueAsNumber || 1 })}
            className="w-24"
          />
        </div>
      ) : null}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Create / edit schedule dialog
// ---------------------------------------------------------------------------

const scheduleSchema = z.object({
  title: z.string().min(1, 'Title is required'),
  resource_id: z.string().min(1, 'Resource is required'),
  instructor_staff_id: z.string(),
  start_time: z.string().min(1, 'Start time is required'),
  end_time: z.string().min(1, 'End time is required'),
  effective_from: z.string().min(1, 'Start date is required'),
  effective_until: z.string(),
  description: z.string(),
});

type ScheduleValues = z.infer<typeof scheduleSchema>;

function scheduleToDefaults(schedule: Schedule): ScheduleValues {
  return {
    title: schedule.title,
    resource_id: schedule.resource_id,
    instructor_staff_id: schedule.instructor_staff_id ?? NO_INSTRUCTOR,
    start_time: schedule.start_time,
    end_time: schedule.end_time,
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
    effective_from: new Date().toISOString().slice(0, 10),
    effective_until: '',
    description: '',
  };
}

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
  return (
    <>
      <FormField
        control={form.control}
        name="title"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Title</FormLabel>
            <FormControl>
              <Input {...field} placeholder="Morning Yoga" />
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
            <FormLabel>Resource</FormLabel>
            <Select value={field.value} onValueChange={field.onChange}>
              <FormControl>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Select a resource" />
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
      <FormField
        control={form.control}
        name="instructor_staff_id"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Instructor</FormLabel>
            <Select value={field.value} onValueChange={field.onChange}>
              <FormControl>
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
              </FormControl>
              <SelectContent>
                <SelectItem value={NO_INSTRUCTOR}>No instructor</SelectItem>
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
      <div className="grid gap-4 sm:grid-cols-2">
        <FormField
          control={form.control}
          name="start_time"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Start time</FormLabel>
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
              <FormLabel>End time</FormLabel>
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
              <FormLabel>Start date</FormLabel>
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
              <FormLabel>End date (optional)</FormLabel>
              <FormControl>
                <Input type="date" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
      </div>
      <RecurrenceEditor value={recurrence} onChange={onRecurrenceChange} />
      <FormField
        control={form.control}
        name="description"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Description</FormLabel>
            <FormControl>
              <Input {...field} />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />
    </>
  );
}

function AddScheduleDialog({
  venueId,
  resources,
  staff,
}: {
  venueId: string;
  resources: Resource[];
  staff: Staff[];
}) {
  const [open, setOpen] = useState(false);
  const [recurrence, setRecurrence] = useState<RecurrenceEditorState>(() =>
    parseRecurrenceRule(null),
  );
  const queryClient = useQueryClient();
  const createSchedule = useCreateSchedule();

  const form = useForm<ScheduleValues>({
    resolver: zodResolver(scheduleSchema),
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
          toast.success('Schedule created');
          void queryClient.invalidateQueries({ queryKey: getListSchedulesQueryKey(venueId) });
          void queryClient.invalidateQueries({ queryKey: getListSlotsQueryKey(venueId) });
          resetAll();
          setOpen(false);
        },
        onError: (err) => {
          toast.error(apiErrorMessage(err, 'Failed to create schedule'));
        },
      },
    );
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (!next) {
          resetAll();
        }
      }}
    >
      <DialogTrigger asChild>
        <Button>Add schedule</Button>
      </DialogTrigger>
      <DialogContent className="max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Add schedule</DialogTitle>
          <DialogDescription>
            A recurring (or one-off) time definition for a resource.
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={(e) => void form.handleSubmit(onSubmit)(e)} className="grid gap-4">
            <ScheduleFormFields
              form={form}
              resources={resources}
              staff={staff}
              recurrence={recurrence}
              onRecurrenceChange={setRecurrence}
            />
            <DialogFooter>
              <Button type="submit" disabled={createSchedule.isPending}>
                {createSchedule.isPending ? 'Creating…' : 'Create schedule'}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}

function EditScheduleDialog({
  venueId,
  schedule,
  resources,
  staff,
  open,
  onOpenChange,
}: {
  venueId: string;
  schedule: Schedule;
  resources: Resource[];
  staff: Staff[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const queryClient = useQueryClient();
  const updateSchedule = useUpdateSchedule();
  const [recurrence, setRecurrence] = useState<RecurrenceEditorState>(() =>
    parseRecurrenceRule(schedule.recurrence_rule),
  );

  const form = useForm<ScheduleValues>({
    resolver: zodResolver(scheduleSchema),
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
          toast.success('Schedule updated');
          void queryClient.invalidateQueries({ queryKey: getListSchedulesQueryKey(venueId) });
          void queryClient.invalidateQueries({ queryKey: getListSlotsQueryKey(venueId) });
          onOpenChange(false);
        },
        onError: (err) => {
          toast.error(apiErrorMessage(err, 'Failed to update schedule'));
        },
      },
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Edit schedule</DialogTitle>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={(e) => void form.handleSubmit(onSubmit)(e)} className="grid gap-4">
            <ScheduleFormFields
              form={form}
              resources={resources}
              staff={staff}
              recurrence={recurrence}
              onRecurrenceChange={setRecurrence}
            />
            <DialogFooter>
              <Button type="submit" disabled={updateSchedule.isPending}>
                {updateSchedule.isPending ? 'Saving…' : 'Save changes'}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}

function DeleteScheduleDialog({
  venueId,
  schedule,
  open,
  onOpenChange,
}: {
  venueId: string;
  schedule: Schedule;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const queryClient = useQueryClient();
  const cancelSchedule = useCancelSchedule();

  const handleDelete = () => {
    cancelSchedule.mutate(
      { sid: schedule.id },
      {
        onSuccess: () => {
          toast.success('Schedule deleted');
          void queryClient.invalidateQueries({ queryKey: getListSchedulesQueryKey(venueId) });
          void queryClient.invalidateQueries({ queryKey: getListSlotsQueryKey(venueId) });
          onOpenChange(false);
        },
        onError: (err) => {
          toast.error(apiErrorMessage(err, 'Failed to delete schedule'));
        },
      },
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Delete schedule</DialogTitle>
          <DialogDescription>
            This will permanently delete &quot;{schedule.title}&quot; and stop generating new slots.
            This action cannot be undone.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button variant="destructive" onClick={handleDelete} disabled={cancelSchedule.isPending}>
            {cancelSchedule.isPending ? 'Deleting…' : 'Delete'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ---------------------------------------------------------------------------
// Schedules section
// ---------------------------------------------------------------------------

function SchedulesSection({ venueId, canEdit }: { venueId: string; canEdit: boolean }) {
  const schedulesQuery = useListSchedules(venueId, { query: { select: unwrap } });
  const resourcesQuery = useListResources(venueId, { query: { select: unwrap } });
  const staffQuery = useListStaff({ query: { select: unwrap } });

  const resources = useMemo(() => resourcesQuery.data ?? [], [resourcesQuery.data]);
  const staff = useMemo(() => staffQuery.data ?? [], [staffQuery.data]);
  const resourceById = useMemo(() => new Map(resources.map((r) => [r.id, r])), [resources]);

  const [editingSchedule, setEditingSchedule] = useState<Schedule | null>(null);
  const [deletingSchedule, setDeletingSchedule] = useState<Schedule | null>(null);

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>Schedules</CardTitle>
        {canEdit ? (
          <AddScheduleDialog venueId={venueId} resources={resources} staff={staff} />
        ) : null}
      </CardHeader>
      <CardContent>
        {schedulesQuery.isLoading ? (
          <div className="space-y-2">
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
          </div>
        ) : schedulesQuery.isError ? (
          <p className="text-sm text-destructive">
            {apiErrorMessage(schedulesQuery.error, 'Failed to load schedules')}
          </p>
        ) : (schedulesQuery.data ?? []).length === 0 ? (
          <div className="flex flex-col items-center gap-3 py-8 text-center">
            <p className="text-sm text-muted-foreground">No schedules yet.</p>
            {canEdit ? (
              <AddScheduleDialog venueId={venueId} resources={resources} staff={staff} />
            ) : null}
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Title</TableHead>
                <TableHead>Recurrence</TableHead>
                <TableHead>Resource</TableHead>
                <TableHead>Time</TableHead>
                {canEdit ? <TableHead className="w-px">Actions</TableHead> : null}
              </TableRow>
            </TableHeader>
            <TableBody>
              {(schedulesQuery.data ?? []).map((schedule) => (
                <TableRow key={schedule.id}>
                  <TableCell className="font-medium">{schedule.title}</TableCell>
                  <TableCell>{humanizeRecurrenceRule(schedule.recurrence_rule)}</TableCell>
                  <TableCell>{resourceById.get(schedule.resource_id)?.name ?? 'Unknown'}</TableCell>
                  <TableCell>
                    {/*
                      `Schedule.start_time`/`end_time` are `NaiveTime` clock
                      strings ("09:00:00", OpenAPI `type: string` with no
                      `date-time` format) — the recurring template's daily
                      window, already venue-local with no UTC instant to
                      convert. Rendered as-is (trimmed to "HH:MM"); do not
                      run through the venue-timezone Intl formatters.
                    */}
                    {schedule.start_time.slice(0, 5)}–{schedule.end_time.slice(0, 5)}
                  </TableCell>
                  {canEdit ? (
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="sm">
                            Actions
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onSelect={() => setEditingSchedule(schedule)}>
                            Edit
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            variant="destructive"
                            onSelect={() => setDeletingSchedule(schedule)}
                          >
                            Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  ) : null}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
      {editingSchedule ? (
        <EditScheduleDialog
          venueId={venueId}
          schedule={editingSchedule}
          resources={resources}
          staff={staff}
          open={!!editingSchedule}
          onOpenChange={(open) => {
            if (!open) setEditingSchedule(null);
          }}
        />
      ) : null}
      {deletingSchedule ? (
        <DeleteScheduleDialog
          venueId={venueId}
          schedule={deletingSchedule}
          open={!!deletingSchedule}
          onOpenChange={(open) => {
            if (!open) setDeletingSchedule(null);
          }}
        />
      ) : null}
    </Card>
  );
}

// ---------------------------------------------------------------------------
// Bookings (per slot) — rendered inline as an expandable row
// ---------------------------------------------------------------------------

function bookingStatusBadgeVariant(status: BookingStatus): 'default' | 'destructive' | 'secondary' {
  if (status === 'confirmed' || status === 'checked_in') return 'default';
  if (status === 'cancelled') return 'destructive';
  return 'secondary';
}

function memberName(member: Member): string {
  return `${member.first_name} ${member.last_name}`.trim();
}

/**
 * `CreateBookingRequest` allows exactly one of `member_id`/`pass_holder_id`.
 * Marketplace pass-holder bookings are out of scope for this slice (see
 * plan's "Out of scope" list), so we resolve member bookings by name via the
 * `useListMembers` lookup map and fall back to a raw id for anything else.
 */
function resolveBookingActorLabel(booking: Booking, memberById: Map<string, Member>): string {
  if (booking.member_id) {
    const member = memberById.get(booking.member_id);
    return member ? memberName(member) : booking.member_id;
  }
  return booking.pass_holder_id ?? 'Unknown';
}

const addBookingSchema = z.object({
  member_id: z.string().min(1, 'Member is required'),
});

type AddBookingValues = z.infer<typeof addBookingSchema>;

function AddBookingDialog({
  slotId,
  venueId,
  members,
}: {
  slotId: string;
  venueId: string;
  members: Member[];
}) {
  const [open, setOpen] = useState(false);
  const queryClient = useQueryClient();
  const createBooking = useCreateBooking();

  const form = useForm<AddBookingValues>({
    resolver: zodResolver(addBookingSchema),
    defaultValues: { member_id: '' },
  });

  const onSubmit = (values: AddBookingValues) => {
    const data: CreateBookingRequest = {
      slot_id: slotId,
      member_id: values.member_id,
      source: BookingSource.walk_in,
    };
    createBooking.mutate(
      { sid: slotId, data },
      {
        onSuccess: () => {
          toast.success('Booking added');
          void queryClient.invalidateQueries({ queryKey: getListBookingsForSlotQueryKey(slotId) });
          void queryClient.invalidateQueries({ queryKey: getListSlotsQueryKey(venueId) });
          form.reset({ member_id: '' });
          setOpen(false);
        },
        onError: (err) => {
          toast.error(apiErrorMessage(err, 'Failed to add booking'));
        },
      },
    );
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (!next) form.reset({ member_id: '' });
      }}
    >
      <DialogTrigger asChild>
        <Button size="sm">Add booking</Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Add booking</DialogTitle>
          <DialogDescription>Book a member into this slot.</DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={(e) => void form.handleSubmit(onSubmit)(e)} className="grid gap-4">
            <FormField
              control={form.control}
              name="member_id"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Member</FormLabel>
                  <Select value={field.value} onValueChange={field.onChange}>
                    <FormControl>
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder="Select a member" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {members.map((member) => (
                        <SelectItem key={member.id} value={member.id}>
                          {memberName(member)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
            <DialogFooter>
              <Button type="submit" disabled={createBooking.isPending}>
                {createBooking.isPending ? 'Adding…' : 'Add booking'}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}

function CancelBookingDialog({
  booking,
  venueId,
  open,
  onOpenChange,
}: {
  booking: Booking;
  venueId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const queryClient = useQueryClient();
  const cancelBooking = useCancelBooking();

  const handleCancel = () => {
    cancelBooking.mutate(
      { bid: booking.id, data: { reason: null } },
      {
        onSuccess: () => {
          toast.success('Booking cancelled');
          void queryClient.invalidateQueries({
            queryKey: getListBookingsForSlotQueryKey(booking.slot_id),
          });
          void queryClient.invalidateQueries({ queryKey: getListSlotsQueryKey(venueId) });
          onOpenChange(false);
        },
        onError: (err) => {
          toast.error(apiErrorMessage(err, 'Failed to cancel booking'));
        },
      },
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Cancel booking</DialogTitle>
          <DialogDescription>
            This will cancel this member&apos;s booking for this slot. This action cannot be undone.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Back
          </Button>
          <Button variant="destructive" onClick={handleCancel} disabled={cancelBooking.isPending}>
            {cancelBooking.isPending ? 'Cancelling…' : 'Cancel booking'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function SlotBookings({
  slot,
  venueId,
  members,
  canManageBookings,
}: {
  slot: ScheduleSlot;
  venueId: string;
  members: Member[];
  canManageBookings: boolean;
}) {
  const bookingsQuery = useListBookingsForSlot(slot.id, { query: { select: unwrap } });
  const memberById = useMemo(() => new Map(members.map((m) => [m.id, m])), [members]);
  const [cancellingBooking, setCancellingBooking] = useState<Booking | null>(null);

  return (
    <div className="space-y-3 border-t bg-muted/30 p-4">
      <div className="flex items-center justify-between">
        <p className="text-sm font-medium">Bookings</p>
        {canManageBookings ? (
          <AddBookingDialog slotId={slot.id} venueId={venueId} members={members} />
        ) : null}
      </div>
      {bookingsQuery.isLoading ? (
        <Skeleton className="h-8 w-full" />
      ) : bookingsQuery.isError ? (
        <p className="text-sm text-destructive">
          {apiErrorMessage(bookingsQuery.error, 'Failed to load bookings')}
        </p>
      ) : (bookingsQuery.data ?? []).length === 0 ? (
        <p className="text-sm text-muted-foreground">No bookings for this slot yet.</p>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Member</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Source</TableHead>
              {canManageBookings ? <TableHead className="w-px">Actions</TableHead> : null}
            </TableRow>
          </TableHeader>
          <TableBody>
            {(bookingsQuery.data ?? []).map((booking) => (
              <TableRow key={booking.id}>
                <TableCell>{resolveBookingActorLabel(booking, memberById)}</TableCell>
                <TableCell>
                  <Badge variant={bookingStatusBadgeVariant(booking.status)} className="capitalize">
                    {labelize(booking.status)}
                  </Badge>
                </TableCell>
                <TableCell className="capitalize">{labelize(booking.source)}</TableCell>
                {canManageBookings ? (
                  <TableCell>
                    {booking.status === 'confirmed' ? (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setCancellingBooking(booking)}
                      >
                        Cancel
                      </Button>
                    ) : null}
                  </TableCell>
                ) : null}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
      {cancellingBooking ? (
        <CancelBookingDialog
          booking={cancellingBooking}
          venueId={venueId}
          open={!!cancellingBooking}
          onOpenChange={(open) => {
            if (!open) setCancellingBooking(null);
          }}
        />
      ) : null}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Slots section
// ---------------------------------------------------------------------------

function slotStatusBadgeVariant(
  status: ScheduleSlot['status'],
): 'default' | 'destructive' | 'secondary' {
  if (status === 'available') return 'default';
  if (status === 'cancelled') return 'destructive';
  return 'secondary';
}

function CancelSlotDialog({
  slot,
  venueId,
  timeZone,
  open,
  onOpenChange,
}: {
  slot: ScheduleSlot;
  venueId: string;
  timeZone: string | undefined;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const queryClient = useQueryClient();
  const cancelSlot = useCancelSlot();

  const handleCancel = () => {
    cancelSlot.mutate(
      { sid: slot.id },
      {
        onSuccess: () => {
          toast.success('Slot cancelled');
          void queryClient.invalidateQueries({ queryKey: getListSlotsQueryKey(venueId) });
          onOpenChange(false);
        },
        onError: (err) => {
          toast.error(apiErrorMessage(err, 'Failed to cancel slot'));
        },
      },
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Cancel slot</DialogTitle>
          <DialogDescription>
            This will cancel this slot on {formatDateHeading(slot.start_time, timeZone)} (
            {formatTime(slot.start_time, timeZone)}–{formatTime(slot.end_time, timeZone)}). Existing
            bookings will need to be handled separately. This action cannot be undone.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Back
          </Button>
          <Button variant="destructive" onClick={handleCancel} disabled={cancelSlot.isPending}>
            {cancelSlot.isPending ? 'Cancelling…' : 'Cancel slot'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function SlotRow({
  slot,
  venueId,
  timeZone,
  resourceById,
  members,
  canManageSlots,
  canManageBookings,
}: {
  slot: ScheduleSlot;
  venueId: string;
  timeZone: string | undefined;
  resourceById: Map<string, Resource>;
  members: Member[];
  canManageSlots: boolean;
  canManageBookings: boolean;
}) {
  const [expanded, setExpanded] = useState(false);
  const [cancelling, setCancelling] = useState(false);

  return (
    <>
      <TableRow className="cursor-pointer" onClick={() => setExpanded((v) => !v)}>
        <TableCell className="font-medium">
          {formatTime(slot.start_time, timeZone)}–{formatTime(slot.end_time, timeZone)}
        </TableCell>
        <TableCell>{resourceById.get(slot.resource_id)?.name ?? 'Unknown'}</TableCell>
        <TableCell>
          {slot.booked_count} / {slot.capacity}
        </TableCell>
        <TableCell>
          <Badge variant={slotStatusBadgeVariant(slot.status)} className="capitalize">
            {labelize(slot.status)}
          </Badge>
        </TableCell>
        <TableCell>
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="sm" onClick={() => setExpanded((v) => !v)}>
              {expanded ? 'Hide bookings' : 'View bookings'}
            </Button>
            {canManageSlots && slot.status !== 'cancelled' ? (
              <Button
                variant="ghost"
                size="sm"
                onClick={(e) => {
                  e.stopPropagation();
                  setCancelling(true);
                }}
              >
                Cancel slot
              </Button>
            ) : null}
          </div>
        </TableCell>
      </TableRow>
      {expanded ? (
        <TableRow>
          <TableCell colSpan={5} className="p-0">
            <SlotBookings
              slot={slot}
              venueId={venueId}
              members={members}
              canManageBookings={canManageBookings}
            />
          </TableCell>
        </TableRow>
      ) : null}
      {cancelling ? (
        <CancelSlotDialog
          slot={slot}
          venueId={venueId}
          timeZone={timeZone}
          open={cancelling}
          onOpenChange={setCancelling}
        />
      ) : null}
    </>
  );
}

function SlotsSection({
  venueId,
  timeZone,
  canManageSlots,
  canManageBookings,
}: {
  venueId: string;
  timeZone: string | undefined;
  canManageSlots: boolean;
  canManageBookings: boolean;
}) {
  const slotsQuery = useListSlots(venueId, { query: { select: unwrap } });
  const resourcesQuery = useListResources(venueId, { query: { select: unwrap } });
  const membersQuery = useListMembers({ query: { select: unwrap } });

  const resources = useMemo(() => resourcesQuery.data ?? [], [resourcesQuery.data]);
  const resourceById = useMemo(() => new Map(resources.map((r) => [r.id, r])), [resources]);
  const members = useMemo(() => membersQuery.data ?? [], [membersQuery.data]);

  const slotsByDate = useMemo(() => {
    const slots = slotsQuery.data ?? [];
    const groups = new Map<string, ScheduleSlot[]>();
    for (const slot of slots) {
      // Group by the venue-local calendar date derived from the slot's
      // (real UTC) `start_time`, not the raw `date` field — `date` is the
      // slot's UTC calendar date and can disagree with the venue's local
      // date near midnight for non-UTC venues.
      const key = venueDateKey(slot.start_time, timeZone);
      const list = groups.get(key) ?? [];
      list.push(slot);
      groups.set(key, list);
    }
    return [...groups.entries()].sort(([a], [b]) => a.localeCompare(b));
  }, [slotsQuery.data, timeZone]);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Slots</CardTitle>
      </CardHeader>
      <CardContent>
        {slotsQuery.isLoading ? (
          <div className="space-y-2">
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
          </div>
        ) : slotsQuery.isError ? (
          <p className="text-sm text-destructive">
            {apiErrorMessage(slotsQuery.error, 'Failed to load slots')}
          </p>
        ) : slotsByDate.length === 0 ? (
          <p className="py-8 text-center text-sm text-muted-foreground">
            No slots yet. Slots are generated automatically from schedules.
          </p>
        ) : (
          <div className="space-y-6">
            {slotsByDate.map(([dateKey, slots]) => {
              const heading = slots[0] ? formatDateHeading(slots[0].start_time, timeZone) : dateKey;
              return (
                <div key={dateKey} className="space-y-2">
                  <p className="text-sm font-semibold">{heading}</p>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Time</TableHead>
                        <TableHead>Resource</TableHead>
                        <TableHead>Booked / Capacity</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {slots.map((slot) => (
                        <SlotRow
                          key={slot.id}
                          slot={slot}
                          venueId={venueId}
                          timeZone={timeZone}
                          resourceById={resourceById}
                          members={members}
                          canManageSlots={canManageSlots}
                          canManageBookings={canManageBookings}
                        />
                      ))}
                    </TableBody>
                  </Table>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export default function SchedulesPage() {
  const role = useRole();
  const canManageSchedules = role === 'owner' || role === 'admin';
  const canManageBookings = role === 'owner' || role === 'admin' || role === 'receptionist';

  const { venues, isLoading, isError, error, selectedVenueId, selectedVenue } = useVenueSelection();

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold">Schedules</h1>
          <p className="text-sm text-muted-foreground">
            Recurring schedules, generated slots, and bookings for a venue.
          </p>
        </div>
        <VenueSelect />
      </div>

      {isLoading ? (
        <div className="space-y-2">
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-48 w-full" />
        </div>
      ) : isError ? (
        <p className="text-sm text-destructive">
          {apiErrorMessage(error, 'Failed to load venues')}
        </p>
      ) : venues.length === 0 ? (
        <p className="py-12 text-center text-sm text-muted-foreground">
          No venues yet. Venues are created via platform onboarding.
        </p>
      ) : !selectedVenueId ? (
        <p className="py-12 text-center text-sm text-muted-foreground">
          Select a venue above to view its schedules.
        </p>
      ) : (
        <>
          <SchedulesSection venueId={selectedVenueId} canEdit={canManageSchedules} />
          <SlotsSection
            venueId={selectedVenueId}
            timeZone={selectedVenue?.timezone}
            canManageSlots={canManageSchedules}
            canManageBookings={canManageBookings}
          />
        </>
      )}
    </div>
  );
}
