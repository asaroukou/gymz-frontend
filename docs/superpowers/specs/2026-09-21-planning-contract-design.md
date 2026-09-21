# SP-E — Planning contract (cancellation preview, roster, eligibility, resource in use)

**Date:** 2026-09-21
**Status:** approved design, ready for one plan
**Builds on:** SP-C working screens (merged at 2dcbef7) and SP-D0 API sync (main at 24f1c6b: `openapi.json` = iziwellpass `origin/main` c2c5876, client regenerated).
**Brief:** `docs/design-briefs/2026-09-21-console-flows-and-actions.md` §2, §6, §7, §8 (resource rule), §10.
**Canvas frames (source of truth, `screens.pen`):** `TeQNq` Annuler la séance · Aperçu, `o9VUa3` Annuler le cours · Aperçu, `UKoGk` Chargement, `zvJSN` Conflit 409, `dAnIL` Déjà annulée et erreur, `tMtOv` Participants · Membres et visiteurs pass, `VM1jv` Vue coach, `baN1L` Erreur d'ajout (complète), `kVC5I` Erreur d'ajout (déjà inscrit), `O4Q8d` Intervenant non éligible, `gLNNi` Ressource utilisée par des cours. PNG exports and the frame inventory at `docs/design-refs/comptoir-clair/wave-2/` (`INVENTORY.md` has the verbatim copy and geometry).

## 1. Purpose

The backend contract of 2026-09-21 changed four planning behaviours the owner console already exposes: cancelling a session or a course now goes through a read-only preview and an optimistic-concurrency token; the slot roster returns `SlotRosterEntry` (member or pass holder, names only for `member:read` callers, arrival method and time); course create/update rejects an instructor who cannot access the room; deleting a resource still used by active courses returns 409. SP-E wires those four behaviours exactly as drawn, on top of the SP-C screens. No new page, no new primitive.

## 2. Decisions

- **E1 — Canvas copy wins over the brief.** Rows, helper lines and their presence differ per frame (the course preview has no « Inchangé » row and no e-mail helper; the session preview has both). Implement per frame, not per a unified template.
- **E2 — `Alert` is the notice family.** The canvas tints are the existing tokens (`--info #e8eefb`, `--warning #fbf1dc`, `--destructive #fbe9e7`); `Alert` already has `info`/`warning`/`destructive` variants with an icon column. No `Notice` primitive is added. In dialogs the alert renders without a title (`AlertDescription` only, icon 18px).
- **E3 — One `CancellationPreviewDialog`** at `apps/owner/app/(app)/schedules/cancellation-preview-dialog.tsx` serves both kinds (`kind: 'slot' | 'schedule'`). It replaces `CancelSlotDialog` (slots-tab) and `DeleteScheduleDialog` (schedule-dialogs), which are deleted.
- **E4 — Preview fetch policy.** The preview query runs only while the dialog is open (`enabled: open`, `staleTime: 0`, `gcTime: 0`, `retry: false`). « Réessayer » calls `refetch()`. A 409 on confirm calls `refetch()` and shows the conflict alert; the user confirms again by hand (no automatic retry). Closing the dialog clears the conflict flag.
- **E5 — `expected_version`** is the preview's `version` echoed as the cancel query parameter. When the preview has no `version` (null), the cancel is sent without the parameter.
- **E6 — Roster display reads the entry, not the members list.** Names come from `first_name`/`last_name` on `SlotRosterEntry`; the members list is only used by the add-participant combobox. Pass holders (`kind === 'pass_holder'`) are never named.
- **E7 — Coach view is the trainer role.** `useRole() === 'trainer'` shows the « Vue coach · noms masqués » chip and labels member rows « Membre n° XXXX » where XXXX is the last four characters of `member_id`, upper-cased. Pass-holder rows stay « Visiteur pass ». The add-participant control keeps its existing `canManageBookings` gate (owner, admin, receptionist).
- **E8 — Arrival line is the noun form.** « Arrivée 06:28 · QR » / « Arrivée 06:35 · manuel » for every row (the API has no gender). The former source line (« Direct », « Sur place ») disappears from the row, as drawn; the `bookingSource.*` keys stay for the member detail page.
- **E9 — Add-participant errors are inline.** The API code for both capacity and duplicate is `CONFLICT`; the message is the only signal. Classifier (`lib/booking-errors.ts`): status 409 and message containing `already exists` → `duplicate`; other 409 → `full`; status 403 → `ineligible`; anything else → `null` (keeps the toast). The message renders under the combobox as a `text-destructive-foreground` line with the `CircleAlert` icon; the combobox gets `aria-invalid`.
- **E10 — Instructor eligibility** is already a `VALIDATION_ERROR` with field `instructor_staff_id` routed through `applyFieldErrors`. The only change: when the server field is `instructor_staff_id`, the form shows the canvas copy « Cet intervenant n'a pas accès à cette salle. » instead of the raw server message.
- **E11 — Resource in use.** On 409 from `DELETE /venues/{vid}/resources/{rid}` the delete dialog switches to its blocked state: warning alert with « Cette ressource est utilisée par des cours. Annulez-les d'abord. » and the list of active courses using that resource (computed client-side from the already loaded schedules: `is_active && resource_id === rid`, rendered « {title} · {recurrence} »). Footer: ghost « Fermer » + outline « Voir les cours » linking to `/schedules`. The blocked state resets when the dialog closes.
- **E12 — Mock mirrors the backend.** `apps/owner/scripts/mock-server.mjs` gains the preview endpoints, `expected_version` checks, 204 responses, the roster shape, pass-holder rows, backend-identical conflict messages and the resource 409. Nothing in the app may depend on a mock-only message.
- **E13 — Dialog width 520** (the `DialogContent` default) for both previews; `dAnIL`'s 480px error variants use the same 520 dialog (one width per component). Row geometry follows the canvas: label 15/ink, helper 13 atténué under it, value 15/500 right-aligned tabular, hairline between rows.

## 3. Cancellation preview dialog

### 3.1 Data

- Slot: `GET /gms/v1/slots/{sid}/cancellation-preview` (`useSlotCancellationPreview`), confirm `PUT /gms/v1/slots/{sid}/cancel?expected_version=` (`useCancelSlot`, 204).
- Schedule: `GET /gms/v1/schedules/{sid}/cancellation-preview` (`useScheduleCancellationPreview`), confirm `DELETE /gms/v1/schedules/{sid}?expected_version=` (`useCancelSchedule`, 204).
- `CancellationPreview`: `active_bookings_affected`, `member_booking_count`, `pass_booking_count`, `future_slots_affected`, `notification_consequences.member_emails_to_send`, `refund_consequences.pass_credits_refunded`, `refund_consequences.member_credits_refunded` (always 0), `unchanged.{bookings_unchanged,past_slots_preserved}`, `blocking_condition` (string when already cancelled), `version` (string | null).

### 3.2 Rows (pure helper `lib/cancellation-preview.ts`)

`previewRows(preview, kind)` returns an ordered list of `{ key, value: number | null, hint?: { key, values? }, muted?: boolean }`:

| kind | rows in order |
| --- | --- |
| `slot` | `bookings` (hint `bookingsHint` {members, pass}) · `emails` (hint `emailsHint`) · `passCredits` (hint `passCreditsHint`) · `memberCredits` (hint `memberCreditsHint`) · `unchanged` (value null → « — », muted, hint `unchangedHint`) |
| `schedule` | `futureSlots` (hint `futureSlotsHint`) · `bookings` (hint `bookingsHint`) · `emails` (no hint) · `passCredits` (hint) · `memberCredits` (hint) |

`isStalePreviewConflict(err)`: `ApiError` with status 409 → true.

### 3.3 States

| state | body | footer |
| --- | --- | --- |
| loading | caption + 4 skeleton rows (`Skeleton` 220×14 left, 32×14 right, row 42px) | ghost « Retour » + destructive confirm, both disabled |
| loaded | caption « Ce que l'annulation entraîne » + rows | ghost « Retour » + destructive « Annuler la séance » / « Annuler le cours » |
| conflict (after 409) | warning `Alert` (icon `TriangleAlert`) « Les réservations ont changé. Aperçu mis à jour — vérifiez avant de confirmer. » above the refreshed rows | as loaded |
| blocked (`blocking_condition` set) | one line « Cette séance est déjà annulée. » / « Ce cours est déjà annulé. » | single ghost « Fermer » |
| load error | destructive `Alert` (icon `CircleAlert`) « Impossible de charger l'aperçu. » with an inline outline small « Réessayer » | ghost « Retour » + confirm disabled |
| confirming | rows stay | confirm shows « Annulation… », both disabled |

Success: toast « Séance annulée » / « Cours annulé », invalidate `getListSlotsQueryKey(venueId)` (both) and `getListSchedulesQueryKey(venueId)` (schedule), close. Non-409 confirm error: toast via `apiErrorMessage`.

### 3.4 Header copy

- Slot: title « Annuler la séance », description « {title} · {day} · {start}–{end} · {room} » where `day` is the group heading already computed by `useDayHeading` (« Aujourd'hui », « Demain », « Lundi 21 septembre »). `SlotRow` receives `dayLabel` from `SlotsTab`.
- Schedule: title « Annuler le cours », description « {title} · {recurrence} · {start}–{end} » with `formatRecurrence(schedule.recurrence_rule)` and `scheduleClock`.

### 3.5 Component contract

```ts
type CancellationTarget =
  | { kind: 'slot'; slot: ScheduleSlot; description: string }
  | { kind: 'schedule'; schedule: Schedule; description: string };

function CancellationPreviewDialog(props: {
  target: CancellationTarget;
  venueId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  restoreFocusTo?: () => HTMLElement | null | undefined;
}): JSX.Element;
```

Stays mounted and driven by `open` (D12), `restoreFocusTo` forwarded to `DialogContent`.

## 4. Roster (participants sheet)

- Query: `useListBookingsForSlot` now returns `SlotRosterEntry[]`; every `Booking` type in `bookings-sheet.tsx` becomes `SlotRosterEntry`. `CancelBookingDialog` and « Valider » keep using `entry.id`.
- Row (60px, hairline): avatar 36 → initials from `first_name`/`last_name` (tint by index) for named members; `Ticket` icon on `bg-secondary` for pass holders; « ? » initials fallback for unnamed members (coach view). Name column: primary line (name / « Visiteur pass » + info `Chip` « Pass » / « Membre n° XXXX »), secondary line only when `checked_in_at` is set: « Arrivée {HH:MM} · {QR|manuel} » (time through `formatTime(checked_in_at, timeZone)`). Trailing: status badge (`bookingBadgeVariant`), « Valider » when confirmed and `canManageBookings`, row menu as today.
- Coach chip: below `SheetDescription`, grey `Chip` with `EyeOff` 14px + « Vue coach · noms masqués », shown when role is `trainer`.
- Pure helper `lib/roster.ts`: `rosterLabel(entry, { hideNames, passLabel, memberNumber })` → `{ kind: 'member' | 'pass', name: string, anonymous: boolean }`; `shortMemberId(id)` → last 4 chars upper-cased; `rosterInitials(entry)`.
- Members list (`useAllMembers`) stays for the add combobox only and is fetched only when `canManageBookings` (`enabled`).
- Add-participant: on error, `addParticipantError(err)` from E9; a non-null kind renders the inline error line under the combobox and no toast; `null` keeps `toast.error(apiErrorMessage(...))`. The inline error clears when the selection changes or a later add succeeds. The existing « Séance complète, aucune place disponible. » helper for a full slot (pre-flight, from counts) stays.

## 5. Instructor eligibility

In `AddScheduleDialog`/`EditScheduleDialog` `onError`: before `applyFieldErrors`, map any `VALIDATION_ERROR` detail with `field === 'instructor_staff_id'` to `t('form.instructorIneligible')`. Implemented as a small pure helper in `lib/api-error.ts`: `overrideFieldMessages(err, { instructor_staff_id: message })` returning a new `ApiError` with the details rewritten (or the same error when nothing matches), so `applyFieldErrors` stays untouched.

## 6. Resource in use

`DeleteResourceDialog` gains `schedules: Schedule[]` (the venue's schedules, already fetched by the detail page or fetched with `useListSchedules(venueId)` in `ResourcesSection`) and a `blocked` state:

- `lib/resource-in-use.ts`: `isResourceInUse(err)` (409 `ApiError`), `activeSchedulesUsing(schedules, resourceId)` sorted by title.
- Blocked body: warning `Alert` (icon `TriangleAlert`): first line the sentence, then a `ul` of « {title} · {recurrence} » using `formatRecurrence` from `usePlanningLabels` (imported from `@/app/(app)/schedules/planning-utils`; the hook stays where it is).
- Footer in blocked state: `DialogClose` ghost « Fermer » + `Button asChild variant="outline"` → `Link href="/schedules"` « Voir les cours ».
- `onOpenChange(false)` resets `blocked` to false.

## 7. Mock server

- `slots[]` and `schedules[]` get `version` (ISO string, bumped on every mutation).
- `GET /gms/v1/slots/{id}/cancellation-preview` and `/schedules/{id}/cancellation-preview` compute the `CancellationPreview` from live bookings (members with `email` count as e-mails; pass bookings = `pass_holder_id` set), `future_slots_affected` for schedules = active slots after today, `blocking_condition` when the slot is cancelled / the schedule inactive.
- `PUT /slots/{id}/cancel` and `DELETE /schedules/{id}` read `expected_version`; mismatch → `conflict('slot changed since preview; re-fetch and retry')` / `('schedule changed …')`; success → `[204, '']`. Demo hook: `slot-03` bumps its version on the first cancel attempt after a preview so the first confirm 409s once (comment at the top of the file, next to the existing hooks).
- Roster: `mkBooking` adds `kind` (`member` | `pass_holder`), `first_name`/`last_name` copied from the member, `check_in_method`/`checked_in_at` from the matching check-in; two pass-holder bookings seeded on `slot-01` (one checked in via qr, one confirmed).
- `POST /slots/{id}/bookings`: 409 messages become `'Slot is full — no available capacity'` and `'A booking already exists for this actor on this slot'`; an inactive member → `[403, errorBody('FORBIDDEN', 'Member is not entitled to this venue')]`.
- `DELETE /venues/{vid}/resources/{rid}`: 409 `'Resource {rid} has active schedules and cannot be deleted'` when an active schedule references it.
- `POST/PUT schedules` with `instructor_staff_id` = `staff-trainer-02` (a seeded trainer without access) → `validationError([{ field: 'instructor_staff_id', message: 'not an active staff member with access to this venue' }])`.

## 8. Messages (fr, en mirrored)

```
planning.cancelPreview.caption            Ce que l'annulation entraîne
planning.cancelPreview.rows.futureSlots   Séances futures concernées
planning.cancelPreview.rows.futureSlotsHint À partir de demain. La séance d'aujourd'hui et les séances passées sont conservées.
planning.cancelPreview.rows.bookings      Réservations concernées
planning.cancelPreview.rows.bookingsHint  dont {members} membres · {pass} visiteurs pass
planning.cancelPreview.rows.emails        E-mails envoyés automatiquement
planning.cancelPreview.rows.emailsHint    Aux membres ayant une adresse ; un membre peut en recevoir plusieurs.
planning.cancelPreview.rows.passCredits   Crédits pass remboursés
planning.cancelPreview.rows.passCreditsHint Remboursés par la plateforme.
planning.cancelPreview.rows.memberCredits Crédits membres remboursés
planning.cancelPreview.rows.memberCreditsHint Une annulation par l'équipe ne rembourse pas les crédits de séance des membres.
planning.cancelPreview.rows.unchanged     Inchangé
planning.cancelPreview.rows.unchangedHint Les arrivées déjà enregistrées et les séances passées sont conservées.
planning.cancelPreview.back               Retour
planning.cancelPreview.close              Fermer
planning.cancelPreview.conflict           Les réservations ont changé. Aperçu mis à jour — vérifiez avant de confirmer.
planning.cancelPreview.loadError          Impossible de charger l'aperçu.
planning.cancelPreview.retry              Réessayer
planning.cancelPreview.blocked.slot       Cette séance est déjà annulée.
planning.cancelPreview.blocked.schedule   Ce cours est déjà annulé.
planning.cancelSlot.description           {title} · {day} · {start}–{end} · {room}
planning.deleteCourse.description         {title} · {recurrence} · {start}–{end}
planning.deleteCourse.success             Cours annulé
planning.deleteCourse.error               Impossible d'annuler le cours
planning.deleteCourse.confirming          Annulation…
planning.bookings.arrival                 Arrivée {time} · {method}
planning.bookings.method.qr               QR
planning.bookings.method.manual           manuel
planning.bookings.passVisitor             Visiteur pass
planning.bookings.passChip                Pass
planning.bookings.coachView               Vue coach · noms masqués
planning.bookings.memberNumber            Membre n° {id}
planning.addBooking.errors.full           Séance complète.
planning.addBooking.errors.duplicate      Déjà inscrit à cette séance.
planning.addBooking.errors.ineligible     Membre non éligible à cet établissement.
planning.form.instructorIneligible        Cet intervenant n'a pas accès à cette salle.
venues.detail.resources.deleteDialog.inUse.message   Cette ressource est utilisée par des cours. Annulez-les d'abord.
venues.detail.resources.deleteDialog.inUse.close     Fermer
venues.detail.resources.deleteDialog.inUse.viewCourses Voir les cours
```

Keys that become orphans (deleted in the same task that stops using them): `planning.cancelSlot.confirm/confirming` are kept (reused), `planning.deleteCourse.title` kept; none deleted except `planning.deleteCourse.description` old text (replaced in place).

## 9. Testing

- Node tests (`apps/owner/lib/*.test.ts`): `previewRows` (both kinds, order, null value for unchanged), `isStalePreviewConflict`, `addParticipantError` (409 duplicate / 409 full / 403 / 500 → null / non-ApiError → null), `rosterLabel` + `shortMemberId` + `rosterInitials` (member named, member unnamed, pass holder, coach view), `overrideFieldMessages`, `isResourceInUse` + `activeSchedulesUsing`.
- Gates: `pnpm check:design && pnpm typecheck && pnpm lint && pnpm test`, fr/en parity one-liner, prettier on changed files.
- Final review: fable, live CDP screenshots of the owner app on the mock against the eleven frames at 1440 and at 390 for the sheet.

## 10. Out of scope

Gallery (SP-D), today snapshot and capabilities (SP-G), MFA and onboarding (SP-F), member app roster, a resource filter on the planning page, drag-free reorder anything, real backend verification of the trainer view (the mock ignores identity; the coach chip is verified by signing in as the seeded trainer account).
