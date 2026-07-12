# Validate a booking from the bookings sheet — design

Design spec for checking in (validating) a slot booking directly from the
planning bookings sheet, using the manual check-in endpoint. Frontend only; the
booking id and venue id are already in scope, so no backend change.

## Background

- A booking created via `AddParticipant` (`POST /slots/{sid}/bookings`) returns a
  `Booking` with an `id`; `useListBookingsForSlot` also exposes each
  `Booking.id` + `status`. `BookingStatus`: `confirmed` / `checked_in` /
  `no_show` / `cancelled`.
- Manual check-in: `POST /gms/v1/checkins/manual`
  (`useCheckInManual`, body-only → `.mutate({ data: { booking_id, venue_id } })`).
- The `BookingsSheet` (`app/(app)/schedules/bookings-sheet.tsx`) already has
  `venueId`, `canManageBookings`, and each `booking` in scope, and renders a
  per-row cancel action. There is currently **no** validate/check-in action
  there; manual check-in lives only on the front-desk page and requires typing a
  booking id by hand.

## Goal

Add a one-click **"Valider"** action on each `confirmed` booking row that checks
the member in, flipping the row to `checked_in`.

## Design

### Trigger + gating (`BookingsSheet`, booking row)
- Render a **"Valider"** `Button` (ghost, `size="sm"`, matching the cancel
  button) on a row when `canManageBookings && booking.status === 'confirmed'`.
  `checked_in` rows show only their badge; `no_show` / `cancelled` get nothing.
- Placed alongside the existing cancel button in the row's action area.

### Action (one-click, no confirm dialog)
- `const checkIn = useCheckInManual();`
- Per-row pending state: `const [validatingBookingId, setValidatingBookingId] = useState<string | null>(null);`
  so only the clicked row's button shows the loading label.
- On click:
  ```ts
  setValidatingBookingId(booking.id);
  checkIn.mutate(
    { data: { booking_id: booking.id, venue_id: venueId } },
    {
      onSuccess: () => {
        toast.success(t('bookings.validateSuccess'));
        void queryClient.invalidateQueries({ queryKey: getListBookingsForSlotQueryKey(slot.id) });
        void queryClient.invalidateQueries({ queryKey: getListCheckInsQueryKey(venueId) });
        void queryClient.invalidateQueries({ queryKey: getGetAttendanceQueryKey(venueId) });
      },
      onError: (err) => toast.error(apiErrorMessage(err, t('bookings.validateError'))),
      onSettled: () => setValidatingBookingId(null),
    },
  );
  ```
- Button disabled while `validatingBookingId === booking.id`; label switches to
  `t('bookings.validating')`.
- The check-ins / attendance invalidations use prefix match (the `{ date }`
  suffix on those keys is ignored), so the front desk and dashboard reflect the
  new check-in without the sheet knowing the venue-local date.

### One-click rationale
Front-desk-first: validating a member at the counter should be immediate (few
taps). Cancel stays a confirm dialog (it's the destructive action). Tradeoff:
there is **no un-check-in endpoint**, so a mis-tap can't be reverted in-app —
accepted for speed.

## i18n (fr + en, parity)

Under `planning.bookings`:
- `validate` — button ("Valider" / "Check in").
- `validating` — loading ("Validation…" / "Checking in…").
- `validateSuccess` — toast ("Entrée validée" / "Checked in").
- `validateError` — toast ("Impossible de valider l'entrée" / "Could not check in").

## Error handling & edge cases

- Only `confirmed` rows get the button, so double check-in isn't offered; a
  server-side 409 (already checked in) still surfaces as the `validateError`
  toast, no crash.
- Per-row pending prevents double-submit on the same row.
- On success the list refetch flips the row to `checked_in` (badge updates,
  button disappears).

## Testing / verification

owner has no unit runner → `pnpm --filter owner typecheck` / `lint` / `build`
+ preview: open a slot's bookings sheet, a `confirmed` booking shows "Valider";
click it → row flips to checked-in, toast shown; `checked_in`/`cancelled` rows
show no validate button; the check-in reflects on the front desk.

## Out of scope

- Un-check-in / reverting a check-in (no endpoint).
- Marking `no_show`.
- The separate front-desk manual check-in form (`register-panel.tsx`),
  unchanged.
- Capturing the create-booking response id (the list refetch already surfaces
  it).
