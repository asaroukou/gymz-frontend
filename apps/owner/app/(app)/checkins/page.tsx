'use client';

import { useMemo, useState } from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import { useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { toast } from 'sonner';
import { z } from 'zod';

import { unwrap } from '@iziwellpass/api/client';
import {
  getGetAttendanceQueryKey,
  getListCheckInsQueryKey,
  useCheckInManual,
  useCheckInViaQr,
  useGetAttendance,
  useListCheckIns,
  useListMembers,
  useListStaff,
} from '@iziwellpass/api/generated';
import type { CheckIn, Member, Staff } from '@iziwellpass/api/schemas';
import { CheckInMethod } from '@iziwellpass/api/schemas';
import { Badge } from '@iziwellpass/ui/components/badge';
import { Button } from '@iziwellpass/ui/components/button';
import { Card, CardContent, CardHeader, CardTitle } from '@iziwellpass/ui/components/card';
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

import { RequirePageAccess } from '@/components/page-access';
import { apiErrorMessage, applyFieldErrors } from '@/lib/api-error';
import { formatDateTime } from '@/lib/datetime';
import { useVenueSelection } from '@/lib/use-venue-selection';

function memberName(member: Member): string {
  return `${member.first_name} ${member.last_name}`.trim();
}

function staffName(staff: Staff): string {
  return `${staff.first_name} ${staff.last_name}`.trim();
}

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
// Attendance stats cards
// ---------------------------------------------------------------------------

function AttendanceStatsSection({ venueId }: { venueId: string }) {
  const attendanceQuery = useGetAttendance(venueId, { query: { select: unwrap } });

  if (attendanceQuery.isLoading) {
    return (
      <div className="grid gap-4 sm:grid-cols-3">
        <Skeleton className="h-24 w-full" />
        <Skeleton className="h-24 w-full" />
        <Skeleton className="h-24 w-full" />
      </div>
    );
  }

  if (attendanceQuery.isError) {
    return (
      <p className="text-sm text-destructive">
        {apiErrorMessage(attendanceQuery.error, 'Failed to load attendance stats')}
      </p>
    );
  }

  const stats = attendanceQuery.data;
  if (!stats) {
    return <p className="text-sm text-muted-foreground">No attendance data yet.</p>;
  }

  return (
    <div className="grid gap-4 sm:grid-cols-3">
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground">
            Check-ins — {stats.date}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-2xl font-semibold">{stats.total_check_ins}</p>
        </CardContent>
      </Card>
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground">
            Unique members
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-2xl font-semibold">{stats.unique_members}</p>
        </CardContent>
      </Card>
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground">Occupancy</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-2xl font-semibold">{stats.occupancy_pct.toFixed(0)}%</p>
        </CardContent>
      </Card>
    </div>
  );
}

// ---------------------------------------------------------------------------
// New check-in card (manual / QR toggle)
// ---------------------------------------------------------------------------

/**
 * `ManualCheckinRequest` requires a `booking_id` (UUID) + `venue_id` — the
 * backend resolves the member, method, and check-in record from the booking
 * itself (see `iziwellpass-domain::checkin::service::check_in_manual`; the
 * booking must be today's and `confirmed` at this venue). There is no
 * member→booking lookup endpoint in this slice's scope (only
 * `listBookingsForSlot(slot_id)` exists, and there's no per-venue "today's
 * bookings" listing), so we can't resolve a member pick straight to a
 * booking id client-side. The member select below is a convenience/lookup
 * aid — pick who you're checking in, then find their booking id from the
 * Schedules page (`/schedules`, expand the day's slot → Bookings) and enter
 * it here.
 */
const manualCheckinSchema = z.object({
  member_id: z.string().min(1, 'Select a member to look up their booking'),
  booking_id: z.string().min(1, 'Booking ID is required'),
});

type ManualCheckinValues = z.infer<typeof manualCheckinSchema>;

const qrCheckinSchema = z.object({
  qr_token: z.string().min(1, 'Paste the scanned QR token'),
});

type QrCheckinValues = z.infer<typeof qrCheckinSchema>;

function ManualCheckinForm({ venueId, members }: { venueId: string; members: Member[] }) {
  const queryClient = useQueryClient();
  const checkInManual = useCheckInManual();

  const form = useForm<ManualCheckinValues>({
    resolver: zodResolver(manualCheckinSchema),
    defaultValues: { member_id: '', booking_id: '' },
  });

  const onSubmit = (values: ManualCheckinValues) => {
    checkInManual.mutate(
      { data: { booking_id: values.booking_id, venue_id: venueId } },
      {
        onSuccess: () => {
          toast.success('Member checked in');
          void queryClient.invalidateQueries({ queryKey: getListCheckInsQueryKey(venueId) });
          void queryClient.invalidateQueries({ queryKey: getGetAttendanceQueryKey(venueId) });
          form.reset({ member_id: '', booking_id: '' });
        },
        onError: (err) => {
          if (!applyFieldErrors(form, err)) {
            toast.error(apiErrorMessage(err, 'Failed to check in member'));
          }
        },
      },
    );
  };

  return (
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
        <FormField
          control={form.control}
          name="booking_id"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Booking ID</FormLabel>
              <FormControl>
                <Input {...field} placeholder="Booking ID from today's slot" />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <Button type="submit" disabled={checkInManual.isPending} className="w-fit">
          {checkInManual.isPending ? 'Checking in…' : 'Check in'}
        </Button>
      </form>
    </Form>
  );
}

function QrCheckinForm({ venueId }: { venueId: string }) {
  const queryClient = useQueryClient();
  const checkInViaQr = useCheckInViaQr();

  const form = useForm<QrCheckinValues>({
    resolver: zodResolver(qrCheckinSchema),
    defaultValues: { qr_token: '' },
  });

  const onSubmit = (values: QrCheckinValues) => {
    checkInViaQr.mutate(
      { data: { qr_token: values.qr_token, venue_id: venueId } },
      {
        onSuccess: () => {
          toast.success('Member checked in');
          void queryClient.invalidateQueries({ queryKey: getListCheckInsQueryKey(venueId) });
          void queryClient.invalidateQueries({ queryKey: getGetAttendanceQueryKey(venueId) });
          form.reset({ qr_token: '' });
        },
        onError: (err) => {
          if (!applyFieldErrors(form, err)) {
            toast.error(apiErrorMessage(err, 'Failed to check in member'));
          }
        },
      },
    );
  };

  return (
    <Form {...form}>
      <form onSubmit={(e) => void form.handleSubmit(onSubmit)(e)} className="grid gap-4">
        <FormField
          control={form.control}
          name="qr_token"
          render={({ field }) => (
            <FormItem>
              <FormLabel>QR token</FormLabel>
              <FormControl>
                <Input {...field} placeholder="Paste scanner output" />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <Button type="submit" disabled={checkInViaQr.isPending} className="w-fit">
          {checkInViaQr.isPending ? 'Checking in…' : 'Check in'}
        </Button>
      </form>
    </Form>
  );
}

function NewCheckinCard({ venueId }: { venueId: string }) {
  const [mode, setMode] = useState<'manual' | 'qr'>('manual');
  const membersQuery = useListMembers({ query: { select: unwrap } });
  const members = useMemo(() => membersQuery.data ?? [], [membersQuery.data]);

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>New check-in</CardTitle>
        <div className="flex items-center gap-2">
          <Button
            type="button"
            size="sm"
            variant={mode === 'manual' ? 'default' : 'outline'}
            onClick={() => setMode('manual')}
          >
            Manual
          </Button>
          <Button
            type="button"
            size="sm"
            variant={mode === 'qr' ? 'default' : 'outline'}
            onClick={() => setMode('qr')}
          >
            QR
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {mode === 'manual' ? (
          membersQuery.isLoading ? (
            <Skeleton className="h-24 w-full" />
          ) : membersQuery.isError ? (
            <p className="text-sm text-destructive">
              {apiErrorMessage(membersQuery.error, 'Failed to load members')}
            </p>
          ) : (
            <ManualCheckinForm venueId={venueId} members={members} />
          )
        ) : (
          <QrCheckinForm venueId={venueId} />
        )}
      </CardContent>
    </Card>
  );
}

// ---------------------------------------------------------------------------
// Recent check-ins table
// ---------------------------------------------------------------------------

function methodBadgeVariant(method: CheckIn['method']): 'default' | 'secondary' {
  return method === CheckInMethod.qr ? 'secondary' : 'default';
}

function checkedInByLabel(checkIn: CheckIn, staffByUserId: Map<string, Staff>): string {
  if (!checkIn.checked_in_by) {
    return 'Self (QR)';
  }
  const staff = staffByUserId.get(checkIn.checked_in_by);
  return staff ? staffName(staff) : checkIn.checked_in_by;
}

function RecentCheckInsSection({
  venueId,
  timeZone,
}: {
  venueId: string;
  timeZone: string | undefined;
}) {
  const checkInsQuery = useListCheckIns(venueId, { query: { select: unwrap } });
  const membersQuery = useListMembers({ query: { select: unwrap } });
  const staffQuery = useListStaff({ query: { select: unwrap } });

  const memberById = useMemo(
    () => new Map((membersQuery.data ?? []).map((m) => [m.id, m])),
    [membersQuery.data],
  );
  const staffByUserId = useMemo(
    () => new Map((staffQuery.data ?? []).map((s) => [s.user_id, s])),
    [staffQuery.data],
  );

  return (
    <Card>
      <CardHeader>
        <CardTitle>Recent check-ins</CardTitle>
      </CardHeader>
      <CardContent>
        {checkInsQuery.isLoading ? (
          <div className="space-y-2">
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
          </div>
        ) : checkInsQuery.isError ? (
          <p className="text-sm text-destructive">
            {apiErrorMessage(checkInsQuery.error, 'Failed to load check-ins')}
          </p>
        ) : (checkInsQuery.data ?? []).length === 0 ? (
          <p className="py-8 text-center text-sm text-muted-foreground">No check-ins yet.</p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Member</TableHead>
                <TableHead>Method</TableHead>
                <TableHead>Checked in by</TableHead>
                <TableHead>Time</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {(checkInsQuery.data ?? []).map((checkIn) => {
                const member = memberById.get(checkIn.member_id);
                return (
                  <TableRow key={checkIn.id}>
                    <TableCell className="font-medium">
                      {member ? memberName(member) : checkIn.member_id}
                    </TableCell>
                    <TableCell>
                      <Badge variant={methodBadgeVariant(checkIn.method)} className="capitalize">
                        {checkIn.method}
                      </Badge>
                    </TableCell>
                    <TableCell>{checkedInByLabel(checkIn, staffByUserId)}</TableCell>
                    <TableCell>{formatDateTime(checkIn.checked_in_at, timeZone)}</TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

function CheckinsContent() {
  const { venues, isLoading, isError, error, selectedVenueId, selectedVenue } = useVenueSelection();

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold">Check-ins</h1>
          <p className="text-sm text-muted-foreground">
            Check members in and track attendance for a venue.
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
          Select a venue above to check members in.
        </p>
      ) : (
        <>
          <AttendanceStatsSection venueId={selectedVenueId} />
          <NewCheckinCard venueId={selectedVenueId} />
          <RecentCheckInsSection venueId={selectedVenueId} timeZone={selectedVenue?.timezone} />
        </>
      )}
    </div>
  );
}

export default function CheckinsPage() {
  return (
    <RequirePageAccess href="/checkins">
      <CheckinsContent />
    </RequirePageAccess>
  );
}
