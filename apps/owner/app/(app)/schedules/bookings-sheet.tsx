'use client';

import { useMemo, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import {
  CircleAlertIcon,
  EyeOffIcon,
  MoreHorizontalIcon,
  PlusIcon,
  TicketIcon,
} from 'lucide-react';
import { useTranslations } from 'next-intl';
import { toast } from 'sonner';

import { unwrap } from '@iziwellpass/api/client';
import {
  getGetAttendanceQueryKey,
  getListBookingsForSlotQueryKey,
  getListCheckInsQueryKey,
  getListSlotsQueryKey,
  getVenueTodayQueryKey,
  useCancelBooking,
  useCheckInManual,
  useCreateBooking,
  useListBookingsForSlot,
} from '@iziwellpass/api/generated';
import type {
  CreateBookingRequest,
  ScheduleSlot,
  SlotRosterEntry,
  StaffMemberView,
} from '@iziwellpass/api/schemas';
import { BookingSource } from '@iziwellpass/api/schemas';
import { useRole } from '@iziwellpass/auth/provider';
import { Alert, AlertDescription, AlertTitle } from '@iziwellpass/ui/components/alert';
import { Avatar, AvatarFallback } from '@iziwellpass/ui/components/avatar';
import { Badge } from '@iziwellpass/ui/components/badge';
import { Button } from '@iziwellpass/ui/components/button';
import { Chip } from '@iziwellpass/ui/components/chip';
import { Combobox } from '@iziwellpass/ui/components/combobox';
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@iziwellpass/ui/components/dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@iziwellpass/ui/components/dropdown-menu';
import { Label } from '@iziwellpass/ui/components/label';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@iziwellpass/ui/components/sheet';
import { Textarea } from '@iziwellpass/ui/components/textarea';

import { useFocusRegistry } from '@/components/focus-registry';
import { RowsSkeleton } from '@/components/rows-skeleton';
import { apiErrorMessage } from '@/lib/api-error';
import { addParticipantError, type AddParticipantErrorKind } from '@/lib/booking-errors';
import { formatTime } from '@/lib/datetime';
import { rosterInitials, rosterLabel } from '@/lib/roster';
import { bookingBadgeVariant } from '@/lib/slot-status';

import { memberName, usePlanningLabels } from './planning-utils';

function CancelBookingDialog({
  booking,
  venueId,
  open,
  onOpenChange,
  restoreFocusTo,
}: {
  booking: SlotRosterEntry;
  venueId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  restoreFocusTo?: () => HTMLElement | null | undefined;
}) {
  const t = useTranslations('planning');
  const tCommon = useTranslations('common');
  const queryClient = useQueryClient();
  const cancelBooking = useCancelBooking();
  const [reason, setReason] = useState('');

  const handleCancel = () => {
    cancelBooking.mutate(
      { bid: booking.id, data: { reason: reason.trim() || null } },
      {
        onSuccess: () => {
          toast.success(t('cancelBooking.success'));
          void queryClient.invalidateQueries({
            queryKey: getListBookingsForSlotQueryKey(booking.slot_id),
          });
          void queryClient.invalidateQueries({ queryKey: getListSlotsQueryKey(venueId) });
          void queryClient.invalidateQueries({ queryKey: getVenueTodayQueryKey(venueId) });
          onOpenChange(false);
        },
        onError: (err) => {
          toast.error(apiErrorMessage(err, t('cancelBooking.error')));
        },
      },
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[480px]" restoreFocusTo={restoreFocusTo}>
        <DialogHeader>
          <DialogTitle>{t('cancelBooking.title')}</DialogTitle>
          <DialogDescription>{t('cancelBooking.description')}</DialogDescription>
        </DialogHeader>
        <div className="flex flex-col gap-2">
          <Label htmlFor="cancel-booking-reason">{t('cancelBooking.reason')}</Label>
          <Textarea
            id="cancel-booking-reason"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder={t('cancelBooking.reasonPlaceholder')}
          />
        </div>
        <DialogFooter>
          <DialogClose asChild>
            <Button variant="ghost">{tCommon('close')}</Button>
          </DialogClose>
          <Button variant="destructive" onClick={handleCancel} disabled={cancelBooking.isPending}>
            {cancelBooking.isPending ? t('cancelBooking.confirming') : t('cancelBooking.confirm')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/** Canvas `skmEM`: a search pill and a 48px dark round « + ». Logic unchanged. */
function AddParticipant({
  slotId,
  venueId,
  members,
  bookedMemberIds,
  full,
}: {
  slotId: string;
  venueId: string;
  members: StaffMemberView[];
  bookedMemberIds: Set<string>;
  full: boolean;
}) {
  const t = useTranslations('planning');
  const queryClient = useQueryClient();
  const createBooking = useCreateBooking();
  const [memberId, setMemberId] = useState('');
  // A 409/403 from the add belongs on the field, not in a toast: the operator's
  // next move is to pick someone else, so the reason stays next to the picker.
  const [inlineError, setInlineError] = useState<AddParticipantErrorKind | null>(null);

  // A member can only be booked while active with a live membership. Ineligible
  // members stay in the list but are disabled with the reason, so front-desk
  // staff can find the name and understand why they can't add it (rather than
  // seeing an empty result), then go fix the membership. Members already booked
  // are kept for the same reason — and so the trigger still shows the name the
  // operator picked when the add comes back 409.
  const options = useMemo(() => {
    const ineligibleReason = (member: StaffMemberView): string | null => {
      if (bookedMemberIds.has(member.id)) return t('addBooking.errors.duplicate');
      if (!member.is_active) return t('addBooking.ineligible.inactive');
      switch (member.membership_status) {
        case 'active':
          return null;
        case 'expired':
          return t('addBooking.ineligible.expired');
        case 'suspended':
          return t('addBooking.ineligible.suspended');
        case 'cancelled':
          return t('addBooking.ineligible.cancelled');
        default:
          return null;
      }
    };

    return members
      .map((member) => {
        const reason = ineligibleReason(member);
        return {
          value: member.id,
          label: memberName(member),
          disabled: reason !== null,
          hint: reason ?? undefined,
        };
      })
      .sort((a, b) => Number(a.disabled) - Number(b.disabled)); // eligible first
  }, [members, bookedMemberIds, t]);

  const handleAdd = () => {
    if (!memberId) return;
    const data: CreateBookingRequest = {
      slot_id: slotId,
      member_id: memberId,
      source: BookingSource.walk_in,
    };
    createBooking.mutate(
      { sid: slotId, data },
      {
        onSuccess: () => {
          toast.success(t('addBooking.success'));
          void queryClient.invalidateQueries({ queryKey: getListBookingsForSlotQueryKey(slotId) });
          void queryClient.invalidateQueries({ queryKey: getListSlotsQueryKey(venueId) });
          void queryClient.invalidateQueries({ queryKey: getVenueTodayQueryKey(venueId) });
          setMemberId('');
          setInlineError(null);
        },
        onError: (err) => {
          const kind = addParticipantError(err);
          if (kind) {
            setInlineError(kind);
            // A 409/403 means the server knows something this sheet doesn't
            // (someone else booked the seat, the membership lapsed). Refetch
            // the roster and the slot so the list, the « x/y inscrits »
            // subtitle and the pre-flight « complet » helper stop contradicting
            // the error we just put under the picker.
            void queryClient.invalidateQueries({
              queryKey: getListBookingsForSlotQueryKey(slotId),
            });
            void queryClient.invalidateQueries({ queryKey: getListSlotsQueryKey(venueId) });
            void queryClient.invalidateQueries({ queryKey: getVenueTodayQueryKey(venueId) });
            return;
          }
          toast.error(apiErrorMessage(err, t('addBooking.error')));
        },
      },
    );
  };

  return (
    <div className="flex flex-col gap-2">
      <Label id="add-participant-label" className="sr-only">
        {t('addBooking.label')}
      </Label>
      <div className="flex items-center gap-2">
        <Combobox
          options={options}
          value={memberId}
          onValueChange={(value) => {
            setMemberId(value);
            setInlineError(null);
          }}
          placeholder={t('addBooking.placeholder')}
          searchPlaceholder={t('addBooking.search')}
          emptyText={t('addBooking.noMembers')}
          disabled={full}
          aria-invalid={inlineError !== null}
          className="flex-1"
        />
        <Button
          size="icon"
          className="size-12 shrink-0"
          aria-label={createBooking.isPending ? t('addBooking.adding') : t('addBooking.add')}
          onClick={handleAdd}
          disabled={full || !memberId || inlineError !== null || createBooking.isPending}
        >
          <PlusIcon />
        </Button>
      </div>
      {inlineError ? (
        <p role="alert" className="flex items-center gap-1.5 text-sm text-destructive-foreground">
          <CircleAlertIcon className="size-3.5" />
          {t(`addBooking.errors.${inlineError}`)}
        </p>
      ) : full ? (
        <p className="text-sm text-muted-foreground">{t('addBooking.slotFull')}</p>
      ) : null}
    </div>
  );
}

/** The slot fields the sheet reads; the dashboard adapts a `TodaySlot` to it. */
export type SheetSlot = Pick<
  ScheduleSlot,
  'id' | 'booked_count' | 'capacity' | 'start_time' | 'end_time'
>;

export function BookingsSheet({
  slot,
  venueId,
  timeZone,
  title,
  dayLabel,
  resourceName,
  members,
  canManageBookings,
  open,
  onOpenChange,
  restoreFocusTo,
}: {
  slot: SheetSlot;
  venueId: string;
  timeZone: string | undefined;
  title: string;
  /** « Aujourd'hui », « Demain », « Lundi 21 septembre » — the group heading of the slot. */
  dayLabel: string;
  resourceName: string;
  members: StaffMemberView[];
  canManageBookings: boolean;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  restoreFocusTo?: () => HTMLElement | null | undefined;
}) {
  const t = useTranslations('planning');
  const { bookingStatusLabel } = usePlanningLabels();
  const queryClient = useQueryClient();
  // A trainer holds no `member:read`, so the roster arrives without names
  // (`SlotRosterEntry` strips them server-side). The sheet says so out loud
  // instead of showing a wall of « Membre n° … » with no explanation.
  const hideNames = useRole() === 'trainer';

  const bookingsQuery = useListBookingsForSlot(slot.id, { query: { select: unwrap } });
  const [cancellingBooking, setCancellingBooking] = useState<SlotRosterEntry | null>(null);
  const [cancelOpen, setCancelOpen] = useState(false);
  const focus = useFocusRegistry();
  const checkIn = useCheckInManual();
  const [validatingBookingId, setValidatingBookingId] = useState<string | null>(null);

  const handleValidate = (booking: SlotRosterEntry) => {
    setValidatingBookingId(booking.id);
    checkIn.mutate(
      { data: { booking_id: booking.id, venue_id: venueId } },
      {
        onSuccess: () => {
          toast.success(t('bookings.validateSuccess'));
          void queryClient.invalidateQueries({ queryKey: getListBookingsForSlotQueryKey(slot.id) });
          void queryClient.invalidateQueries({ queryKey: getListCheckInsQueryKey(venueId) });
          void queryClient.invalidateQueries({ queryKey: getGetAttendanceQueryKey(venueId) });
          void queryClient.invalidateQueries({ queryKey: getVenueTodayQueryKey(venueId) });
        },
        onError: (err) => toast.error(apiErrorMessage(err, t('bookings.validateError'))),
        onSettled: () => setValidatingBookingId(null),
      },
    );
  };

  const bookings = useMemo(() => bookingsQuery.data ?? [], [bookingsQuery.data]);
  const bookedMemberIds = useMemo(() => {
    const set = new Set<string>();
    for (const booking of bookings) {
      if (booking.member_id && booking.status !== 'cancelled') {
        set.add(booking.member_id);
      }
    }
    return set;
  }, [bookings]);

  // Block adding once the slot is full. Count live (non-cancelled) bookings once
  // they've loaded — that reflects adds/cancels made in this sheet before the
  // parent slot prop refetches; fall back to the slot's server count until then.
  const bookedCount = bookingsQuery.data
    ? bookings.filter((booking) => booking.status !== 'cancelled').length
    : slot.booked_count;
  const isFull = bookedCount >= slot.capacity;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" restoreFocusTo={restoreFocusTo}>
        <SheetHeader>
          <p className="text-md text-muted-foreground">
            {t('bookings.dateLine', { day: dayLabel, room: resourceName })}
          </p>
          <SheetTitle>{title}</SheetTitle>
          <SheetDescription>
            {t('bookings.subtitle', {
              start: formatTime(slot.start_time, timeZone),
              end: formatTime(slot.end_time, timeZone),
              booked: bookedCount,
              cap: slot.capacity,
            })}
          </SheetDescription>
          {hideNames ? (
            <Chip className="mt-2 self-start text-sm">
              <EyeOffIcon className="size-3.5" />
              {t('bookings.coachView')}
            </Chip>
          ) : null}
        </SheetHeader>

        {canManageBookings ? (
          <AddParticipant
            slotId={slot.id}
            venueId={venueId}
            members={members}
            bookedMemberIds={bookedMemberIds}
            full={isFull}
          />
        ) : null}

        <div className="min-h-0 flex-1 overflow-y-auto">
          {bookingsQuery.isLoading ? (
            <RowsSkeleton rows={3} />
          ) : bookingsQuery.isError ? (
            <Alert variant="destructive">
              <AlertTitle>{t('errorTitle')}</AlertTitle>
              <AlertDescription>
                {apiErrorMessage(bookingsQuery.error, t('bookings.loadError'))}
              </AlertDescription>
            </Alert>
          ) : bookings.length === 0 ? (
            <div className="py-10 text-center">
              <p className="text-base font-medium">{t('bookings.emptyTitle')}</p>
              <p className="mt-1 text-base text-muted-foreground">{t('bookings.emptyBody')}</p>
            </div>
          ) : (
            <ul className="flex flex-col">
              {bookings.map((entry, index) => {
                const canCancel =
                  canManageBookings &&
                  (entry.status === 'confirmed' || entry.status === 'checked_in');
                const label = rosterLabel(entry, {
                  hideNames,
                  passLabel: t('bookings.passVisitor'),
                  memberNumber: (id) => t('bookings.memberNumber', { id }),
                });
                // A check-in can arrive without a method (older rows, imports):
                // show the time alone rather than inventing « manuel ».
                const arrival = !entry.checked_in_at
                  ? null
                  : entry.check_in_method
                    ? t('bookings.arrival', {
                        time: formatTime(entry.checked_in_at, timeZone),
                        method: t(`bookings.method.${entry.check_in_method}`),
                      })
                    : t('bookings.arrivalNoMethod', {
                        time: formatTime(entry.checked_in_at, timeZone),
                      });
                return (
                  <li
                    key={entry.id}
                    className="flex min-h-[60px] items-center gap-3 border-b border-border py-2 last:border-0"
                  >
                    <Avatar>
                      {label.kind === 'pass' ? (
                        <AvatarFallback aria-hidden className="bg-secondary text-muted-strong">
                          <TicketIcon className="size-4" />
                        </AvatarFallback>
                      ) : (
                        <AvatarFallback aria-hidden tint={index}>
                          {label.anonymous ? '?' : rosterInitials(entry)}
                        </AvatarFallback>
                      )}
                    </Avatar>
                    <div className="min-w-0 flex-1 leading-tight">
                      <p className="flex flex-wrap items-center gap-2 text-base font-medium">
                        <span className="min-w-0 truncate">{label.name}</span>
                        {label.kind === 'pass' ? (
                          <Chip className="shrink-0 bg-info py-0.5 pl-2.5 pr-2.5 text-sm text-info-foreground">
                            {t('bookings.passChip')}
                          </Chip>
                        ) : null}
                      </p>
                      {arrival ? (
                        <p className="truncate text-sm text-muted-foreground">{arrival}</p>
                      ) : null}
                    </div>
                    <Badge variant={bookingBadgeVariant(entry.status)} className="shrink-0">
                      {bookingStatusLabel(entry.status)}
                    </Badge>
                    {canManageBookings && entry.status === 'confirmed' ? (
                      <Button
                        size="sm"
                        disabled={validatingBookingId === entry.id}
                        onClick={() => handleValidate(entry)}
                      >
                        {validatingBookingId === entry.id
                          ? t('bookings.validating')
                          : t('bookings.validate')}
                      </Button>
                    ) : null}
                    {canCancel ? (
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button
                            ref={focus.register(entry.id)}
                            variant="ghost"
                            size="icon-sm"
                            className="size-11 md:size-9"
                            aria-label={t('slots.rowMenu')}
                          >
                            <MoreHorizontalIcon />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem
                            variant="destructive"
                            onSelect={() => {
                              setCancellingBooking(entry);
                              setCancelOpen(true);
                            }}
                          >
                            {t('cancelBooking.confirm')}
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    ) : null}
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </SheetContent>

      {cancellingBooking ? (
        <CancelBookingDialog
          booking={cancellingBooking}
          venueId={venueId}
          open={cancelOpen}
          onOpenChange={setCancelOpen}
          restoreFocusTo={() => focus.get(cancellingBooking?.id)}
        />
      ) : null}
    </Sheet>
  );
}
