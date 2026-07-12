'use client';

import { useMemo, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useTranslations } from 'next-intl';
import { toast } from 'sonner';

import { unwrap } from '@iziwellpass/api/client';
import {
  getListBookingsForSlotQueryKey,
  getListSlotsQueryKey,
  useCancelBooking,
  useCreateBooking,
  useListBookingsForSlot,
} from '@iziwellpass/api/generated';
import type { Booking, CreateBookingRequest, Member, ScheduleSlot } from '@iziwellpass/api/schemas';
import { BookingSource } from '@iziwellpass/api/schemas';
import { Alert, AlertDescription, AlertTitle } from '@iziwellpass/ui/components/alert';
import { Avatar, AvatarFallback } from '@iziwellpass/ui/components/avatar';
import { Badge } from '@iziwellpass/ui/components/badge';
import { Button } from '@iziwellpass/ui/components/button';
import { Combobox } from '@iziwellpass/ui/components/combobox';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@iziwellpass/ui/components/dialog';
import { Label } from '@iziwellpass/ui/components/label';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@iziwellpass/ui/components/sheet';
import { Skeleton } from '@iziwellpass/ui/components/skeleton';
import { Textarea } from '@iziwellpass/ui/components/textarea';

import { apiErrorMessage } from '@/lib/api-error';
import { formatTime } from '@/lib/datetime';

import {
  memberInitials,
  memberName,
  resolveBookingActorLabel,
  usePlanningLabels,
} from './planning-utils';

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
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t('cancelBooking.title')}</DialogTitle>
          <DialogDescription>{t('cancelBooking.description')}</DialogDescription>
        </DialogHeader>
        <div className="space-y-1.5">
          <Label htmlFor="cancel-booking-reason">{t('cancelBooking.reason')}</Label>
          <Textarea
            id="cancel-booking-reason"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder={t('cancelBooking.reasonPlaceholder')}
          />
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            {tCommon('close')}
          </Button>
          <Button variant="destructive" onClick={handleCancel} disabled={cancelBooking.isPending}>
            {cancelBooking.isPending ? t('cancelBooking.confirming') : t('cancelBooking.confirm')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function AddParticipant({
  slotId,
  venueId,
  members,
  bookedMemberIds,
  full,
}: {
  slotId: string;
  venueId: string;
  members: Member[];
  bookedMemberIds: Set<string>;
  full: boolean;
}) {
  const t = useTranslations('planning');
  const queryClient = useQueryClient();
  const createBooking = useCreateBooking();
  const [memberId, setMemberId] = useState('');

  // A member can only be booked while active with a live membership. Ineligible
  // members stay in the list but are disabled with the reason, so front-desk
  // staff can find the name and understand why they can't add it (rather than
  // seeing an empty result), then go fix the membership.
  const options = useMemo(() => {
    const ineligibleReason = (member: Member): string | null => {
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
      .filter((member) => !bookedMemberIds.has(member.id))
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
          setMemberId('');
        },
        onError: (err) => {
          toast.error(apiErrorMessage(err, t('addBooking.error')));
        },
      },
    );
  };

  return (
    <div className="space-y-1.5 rounded-2xl border p-3">
      <Label id="add-participant-label">{t('addBooking.label')}</Label>
      <div className="flex items-center gap-2">
        <Combobox
          options={options}
          value={memberId}
          onValueChange={setMemberId}
          placeholder={t('addBooking.placeholder')}
          searchPlaceholder={t('addBooking.search')}
          emptyText={t('addBooking.noMembers')}
          disabled={full}
          className="flex-1"
        />
        <Button onClick={handleAdd} disabled={full || !memberId || createBooking.isPending}>
          {createBooking.isPending ? t('addBooking.adding') : t('addBooking.add')}
        </Button>
      </div>
      {full ? (
        <p className="text-xs text-muted-foreground">{t('addBooking.slotFull')}</p>
      ) : null}
    </div>
  );
}

export function BookingsSheet({
  slot,
  venueId,
  timeZone,
  title,
  members,
  canManageBookings,
  open,
  onOpenChange,
}: {
  slot: ScheduleSlot;
  venueId: string;
  timeZone: string | undefined;
  title: string;
  members: Member[];
  canManageBookings: boolean;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const t = useTranslations('planning');
  const { bookingStatusBadge, bookingSourceLabel } = usePlanningLabels();

  const bookingsQuery = useListBookingsForSlot(slot.id, { query: { select: unwrap } });
  const memberById = useMemo(() => new Map(members.map((m) => [m.id, m])), [members]);
  const [cancellingBooking, setCancellingBooking] = useState<Booking | null>(null);

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
      <SheetContent side="right" className="w-full gap-0 sm:max-w-md">
        <SheetHeader className="border-b">
          <SheetTitle>{title}</SheetTitle>
          <SheetDescription>
            {t('bookings.subtitle', {
              start: formatTime(slot.start_time, timeZone),
              end: formatTime(slot.end_time, timeZone),
              booked: slot.booked_count,
              cap: slot.capacity,
            })}
          </SheetDescription>
        </SheetHeader>

        <div className="flex-1 space-y-3 overflow-y-auto p-4">
          {canManageBookings ? (
            <AddParticipant
              slotId={slot.id}
              venueId={venueId}
              members={members}
              bookedMemberIds={bookedMemberIds}
              full={isFull}
            />
          ) : null}

          {bookingsQuery.isLoading ? (
            <div className="space-y-2">
              <Skeleton className="h-12 w-full" />
              <Skeleton className="h-12 w-full" />
            </div>
          ) : bookingsQuery.isError ? (
            <Alert variant="destructive">
              <AlertTitle>{t('errorTitle')}</AlertTitle>
              <AlertDescription>
                {apiErrorMessage(bookingsQuery.error, t('bookings.loadError'))}
              </AlertDescription>
            </Alert>
          ) : bookings.length === 0 ? (
            <div className="rounded-2xl border border-dashed py-10 text-center">
              <p className="text-sm font-medium">{t('bookings.emptyTitle')}</p>
              <p className="mt-1 text-sm text-muted-foreground">{t('bookings.emptyBody')}</p>
            </div>
          ) : (
            <ul className="space-y-1">
              {bookings.map((booking) => {
                const badge = bookingStatusBadge(booking.status);
                const canCancel =
                  canManageBookings &&
                  (booking.status === 'confirmed' || booking.status === 'checked_in');
                const member = booking.member_id ? memberById.get(booking.member_id) : undefined;
                return (
                  <li
                    key={booking.id}
                    className="flex items-center gap-3 rounded-xl px-2 py-2 hover:bg-accent/50"
                  >
                    <Avatar size="sm">
                      <AvatarFallback aria-hidden>
                        {member ? memberInitials(member) : '—'}
                      </AvatarFallback>
                    </Avatar>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium">
                        {resolveBookingActorLabel(booking, memberById)}
                      </p>
                      <p className="truncate text-xs text-muted-foreground">
                        {bookingSourceLabel(booking.source)}
                      </p>
                    </div>
                    <Badge variant={badge.variant} className="shrink-0">
                      {badge.label}
                    </Badge>
                    {canCancel ? (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setCancellingBooking(booking)}
                      >
                        {t('bookings.cancel')}
                      </Button>
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
          open={cancellingBooking !== null}
          onOpenChange={(next) => {
            if (!next) setCancellingBooking(null);
          }}
        />
      ) : null}
    </Sheet>
  );
}
