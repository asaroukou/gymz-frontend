# Staff venue management (existing staff) — design

Design spec for assigning venues to an existing staff member in the owner app.
Frontend only. Complements the invite-time venue assignment already shipped.

## Background

Staff venue access differs from members:

- Staff have **no `access_scope`** — a trainer/receptionist is venue-scoped by
  their assignment list; owner/admin see all venues. There is nothing to "flip".
- Staff expose **no read side**: `Staff` has no `access_scope` and no
  `venue_ids`, and there is no `GET …/staff/{sid}/venues`. Only the write path
  exists: `PUT /gms/v1/staff/{sid}/venues` (`useSetStaffVenues`, body
  `SetStaffVenuesRequest { venue_ids }`) — a **full replace**.

So assigning venues to an existing staff member is possible but **blind**: the
current assignment can't be read, so any edit overwrites it. (Decision:
wire it now with a replace warning; a proper pre-filled edit waits on a backend
read — carried as a backend ask.)

## Scope

- Add a **"Gérer les établissements"** action + dialog for existing staff.
- Only for **trainer/receptionist** rows (owner/admin see all venues — nothing
  to assign).
- Reuse the shared `VenueChecklist`; blind full-replace, require ≥1.
- No scope toggle (staff have none).

## Design

### `ManageVenuesDialog` (new, `app/(app)/staff/page.tsx`)
Mirrors the existing `ChangeRoleDialog`/`RemoveStaffDialog` and the member
`EditAccessDialog`:

- `const setVenues = useSetStaffVenues();`
- Local state: `venueIds: string[]` (starts `[]`), `venuesError: boolean`; both
  reset whenever the dialog opens (effect on `open`).
- Renders a **replace warning** (`staff.venuesDialog.replaceWarning`) above the
  shared `<VenueChecklist value={venueIds} onChange={…}>`; clearing the error
  once a venue is picked.
- Save: guard `venueIds.length >= 1` (else set `venuesError` and return), then
  `setVenues.mutate({ sid: staff.id, data: { venue_ids: venueIds } })`.
- On success: `toast.success`, invalidate `getListStaffQueryKey()`, close.
- On error: `toast.error(apiErrorMessage(err, t('venuesDialog.error')))`.
- Submit button disabled while `setVenues.isPending`.

### Trigger (`StaffRowActions`)
- A `DropdownMenuItem` "Gérer les établissements"
  (`staff.venuesDialog.manage`), rendered **only** when
  `isVenueScopedRole(staff.role)` (the existing `trainer`/`receptionist` helper),
  alongside the current change-role / remove items.
- Controlled by a new `manageVenuesOpen` state in `StaffRowActions`; render
  `<ManageVenuesDialog staff={staff} open={manageVenuesOpen} onOpenChange={…} />`.
- Inherits the same gating as the other row actions (the menu is only shown to
  users who can manage staff).

## i18n (fr + en, parity)

New `staff.venuesDialog` object:
- `manage` — the menu-item label.
- `title` — dialog title.
- `replaceWarning` — the blind-replace warning.
- `venuesRequired` — the ≥1 validation message.
- `submit` / `submitting` — save button.
- `success` / `error` — toasts.

fr: manage "Gérer les établissements", title "Établissements assignés",
replaceWarning "La liste ci-dessous remplace entièrement les établissements
actuels de ce membre.", venuesRequired "Sélectionnez au moins un établissement",
submit "Enregistrer", submitting "Enregistrement…", success "Établissements mis
à jour", error "Impossible de mettre à jour les établissements".

en: manage "Manage venues", title "Assigned venues", replaceWarning "The list
below fully replaces this member's current venues.", venuesRequired "Select at
least one venue", submit "Save", submitting "Saving…", success "Venues updated",
error "Could not update venues".

## Error handling & edge cases

- **0 venues:** `VenueChecklist` shows its "create a venue first" note; the
  ≥1 guard blocks submit.
- **Blind replace:** empty start + warning + ≥1 required make the overwrite
  explicit and prevent stripping to an empty set.
- Errors surfaced via `apiErrorMessage` toast, consistent with sibling dialogs.

## Testing / verification

owner has no unit runner → `pnpm --filter owner typecheck` / `lint` / `build`
+ preview:
- The "Gérer les établissements" item appears on a trainer/receptionist row and
  is absent on owner/admin rows.
- The dialog shows the warning + checklist; saving with none shows the required
  error; picking ≥1 and saving succeeds (toast) and closes.

## Out of scope

- Reading/pre-filling a staff member's current venue assignments (no endpoint).
- Owner/admin venue assignment (they see all venues).

## Backend ask (carried)

- A staff venue **read** (`venue_ids` on `Staff` or `GET /staff/{sid}/venues`)
  so this dialog can pre-fill current assignments instead of blind-replacing.
