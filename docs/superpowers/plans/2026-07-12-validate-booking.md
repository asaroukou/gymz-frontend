# Validate booking from bookings sheet Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a one-click "Valider" button on `confirmed` booking rows in the planning bookings sheet that checks the member in via the manual check-in endpoint.

**Architecture:** One file (`app/(app)/schedules/bookings-sheet.tsx`) gains a per-row validate action wired to `useCheckInManual`, with a per-row pending state and query invalidation so the row flips to `checked_in` and the front desk reflects the check-in. Plus i18n.

**Tech Stack:** Next.js 15 + React 19, TanStack Query + Orval hooks, next-intl (fr/en), shadcn/Radix, Tailwind v4.

---

## Conventions

- **Commits:** user-managed. Each task ends with **Verify**, not a commit.
- **owner has no unit runner** → `pnpm --filter owner typecheck` / `lint` / `build` + preview.
- Run from repo root `/Users/abdel/dev/gymz-v1/web`.

## Facts verified

- `bookings-sheet.tsx` already imports `useQueryClient`, `toast` (sonner), `useState`, `apiErrorMessage`, `getListBookingsForSlotQueryKey`, and the `Booking` type; the generated import block lists `getListBookingsForSlotQueryKey, getListSlotsQueryKey, useCancelBooking, useCreateBooking, useListBookingsForSlot`.
- `BookingsSheet({ slot, venueId, timeZone, title, members, canManageBookings, open, onOpenChange })` renders `bookings.map((booking) => …)`; each row computes `const canCancel = canManageBookings && (booking.status === 'confirmed' || booking.status === 'checked_in');` and renders a cancel `<Button variant="ghost" size="sm" onClick={() => setCancellingBooking(booking)}>{t('bookings.cancel')}</Button>` when `canCancel`. The component has `const t = useTranslations('planning');` but does NOT yet have its own `queryClient` (cancel is handled by a child `CancelBookingDialog`).
- `useCheckInManual` is body-only: `.mutate({ data: { booking_id, venue_id } })`. `getListCheckInsQueryKey(venueId)` and `getGetAttendanceQueryKey(venueId)` exist (used by `lib/dated-api.ts`); prefix-match invalidation ignores their `{ date }` suffix.
- `BookingStatus` values: `confirmed` / `checked_in` / `no_show` / `cancelled`.

## File map

- **Modify** `apps/owner/app/(app)/schedules/bookings-sheet.tsx` — validate action.
- **Modify** `apps/owner/messages/{fr,en}.json` — `planning.bookings.validate*`.

---

## Task 1: i18n — validate copy

**Files:**
- Modify: `apps/owner/messages/fr.json`, `apps/owner/messages/en.json`

- [ ] **Step 1: Add keys under `planning.bookings` (both files, parity)**

Add these keys inside the existing `planning.bookings` object.

`fr.json`:
```json
"validate": "Valider",
"validating": "Validation…",
"validateSuccess": "Entrée validée",
"validateError": "Impossible de valider l'entrée"
```
`en.json`:
```json
"validate": "Check in",
"validating": "Checking in…",
"validateSuccess": "Checked in",
"validateError": "Could not check in"
```

- [ ] **Step 2: Verify parity + presence**

Run:
```bash
cd /Users/abdel/dev/gymz-v1/web/apps/owner && node -e 'const fr=require("./messages/fr.json"),en=require("./messages/en.json");function k(o,p=""){return Object.entries(o).flatMap(([a,v])=>v&&typeof v==="object"&&!Array.isArray(v)?k(v,p+a+"."):[p+a]);}const f=new Set(k(fr)),e=new Set(k(en));const of=[...f].filter(x=>!e.has(x)),oe=[...e].filter(x=>!f.has(x));if(of.length||oe.length){console.log("GAPS",of,oe);process.exit(1)}for(const key of ["validate","validating","validateSuccess","validateError"]){if(!fr.planning.bookings[key]||!en.planning.bookings[key])throw new Error("missing "+key)}console.log("i18n OK");'
```
Expected: `i18n OK`.

---

## Task 2: Validate action in `BookingsSheet`

**Files:**
- Modify: `apps/owner/app/(app)/schedules/bookings-sheet.tsx`

- [ ] **Step 1: Extend the generated import**

Add `useCheckInManual`, `getListCheckInsQueryKey`, `getGetAttendanceQueryKey` to the existing `@iziwellpass/api/generated` import (alongside `getListBookingsForSlotQueryKey`, etc.).

- [ ] **Step 2: Add the hook, pending state, and handler to `BookingsSheet`**

Near the top of `BookingsSheet` (with `const t = useTranslations('planning');` and the `useState`/`useMemo` hooks), add:
```tsx
  const queryClient = useQueryClient();
  const checkIn = useCheckInManual();
  const [validatingBookingId, setValidatingBookingId] = useState<string | null>(null);

  const handleValidate = (booking: Booking) => {
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
  };
```
(If `BookingsSheet` already has a `queryClient`, reuse it — do not declare a second one.)

- [ ] **Step 3: Render the validate button before the cancel button**

In the row's action area, immediately before the `{canCancel ? (<Button …cancel…/>) : null}` block, add:
```tsx
                    {canManageBookings && booking.status === 'confirmed' ? (
                      <Button
                        variant="ghost"
                        size="sm"
                        disabled={validatingBookingId === booking.id}
                        onClick={() => handleValidate(booking)}
                      >
                        {validatingBookingId === booking.id
                          ? t('bookings.validating')
                          : t('bookings.validate')}
                      </Button>
                    ) : null}
```

- [ ] **Step 4: Verify (typecheck/lint + preview)**

Run:
```bash
cd /Users/abdel/dev/gymz-v1/web
pnpm --filter owner typecheck 2>&1 | grep 'bookings-sheet' || echo "bookings-sheet typecheck OK"
pnpm --filter owner lint 2>&1 | tail -3
```
Expected: `bookings-sheet typecheck OK`; lint clean (no unused vars; `handleValidate`/`checkIn`/`queryClient` all used).
Preview: open a slot with a `confirmed` booking → the row shows "Valider"; click it → button shows "Validation…", then the row's badge flips to checked-in and a success toast appears; a `checked_in`/`cancelled` row shows no "Valider" button. Confirm via `preview_network` a `POST /gms/v1/checkins/manual` with `{ booking_id, venue_id }`, no console errors.

---

## Task 3: Final verification

- [ ] **Step 1: Full checks**

Run:
```bash
cd /Users/abdel/dev/gymz-v1/web
pnpm --filter owner typecheck && pnpm --filter owner lint && pnpm --filter owner build 2>&1 | tail -10
```
Expected: all green; build completes.

- [ ] **Step 2: i18n parity**

Run:
```bash
cd /Users/abdel/dev/gymz-v1/web/apps/owner && node -e 'const fr=require("./messages/fr.json"),en=require("./messages/en.json");function k(o,p=""){return Object.entries(o).flatMap(([a,v])=>v&&typeof v==="object"&&!Array.isArray(v)?k(v,p+a+"."):[p+a]);}const f=new Set(k(fr)),e=new Set(k(en));const of=[...f].filter(x=>!e.has(x)),oe=[...e].filter(x=>!f.has(x));console.log(of.length||oe.length?["GAPS",of,oe]:"i18n parity OK");'
```
Expected: `i18n parity OK`.

---

## Self-review notes (author)

- **Spec coverage:** i18n → Task 1; validate button on `confirmed` rows + one-click `useCheckInManual` + per-row `validatingBookingId` + invalidation of bookings/check-ins/attendance → Task 2; verification → Tasks 2/3. All spec sections mapped.
- **Type consistency:** `checkIn.mutate({ data: { booking_id, venue_id } })` matches the body-only generated signature; `handleValidate(booking: Booking)` uses the file's `Booking` type; invalidation keys match the dated-api usage.
- **Gating:** button only on `canManageBookings && status === 'confirmed'` (checked_in/no_show/cancelled excluded); cancel action unchanged.
- **No un-check-in** (no endpoint) — one-click accepted per spec; a repeat/409 surfaces as the `validateError` toast.
- **owner has no runner:** verified by typecheck + preview; no test-capable surface added.
