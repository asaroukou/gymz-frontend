# Staff venue management Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let an owner/admin assign venues to an existing trainer/receptionist via a "Gérer les établissements" dialog (blind full-replace, since staff venue assignments aren't readable).

**Architecture:** One file (`app/(app)/staff/page.tsx`) gains a `ManageVenuesDialog` (mirroring the existing `ChangeRoleDialog` + the member `EditAccessDialog`) driven by `useSetStaffVenues`, plus a role-gated "Gérer les établissements" item in `StaffRowActions`. Reuses the shared `VenueChecklist`. Plus i18n.

**Tech Stack:** Next.js 15 + React 19, TanStack Query + Orval hooks, next-intl (fr/en), shadcn/Radix (`@iziwellpass/ui`), Tailwind v4.

---

## Conventions

- **Commits:** user-managed. Each task ends with **Verify**, not a commit.
- **owner has no unit runner** → `pnpm --filter owner typecheck` / `lint` / `build` + preview.
- Run from repo root `/Users/abdel/dev/gymz-v1/web`.

## Facts verified

- `app/(app)/staff/page.tsx` already has: `VENUE_SCOPED_ROLES = [Role.trainer, Role.receptionist]` + `isVenueScopedRole(role)` (from the invite work); `VenueChecklist` NOT yet imported here; `StaffRowActions({ staff, isSelf })` renders a `DropdownMenu` with `DropdownMenuItem`s and controls sibling dialogs (`ChangeRoleDialog`, `RemoveStaffDialog`) via local `useState` open flags; `ChangeRoleDialog`/`RemoveStaffDialog` show the Dialog + mutation + toast + `queryClient.invalidateQueries({ queryKey: getListStaffQueryKey() })` pattern.
- Generated: `useSetStaffVenues` → `.mutate({ sid, data: SetStaffVenuesRequest })`, `SetStaffVenuesRequest = { venue_ids: VenueId[] }` (`VenueId = string`); `getListStaffQueryKey()` exists.
- `VenueChecklist` at `@/components/venue-checklist` — `{ value: string[], onChange: (next: string[]) => void, disabled? }`.
- `apiErrorMessage` from `@/lib/api-error`; `Dialog*`, `Button`, `DropdownMenuItem` already imported in the file.

## File map

- **Modify** `apps/owner/app/(app)/staff/page.tsx` — `ManageVenuesDialog` + trigger item.
- **Modify** `apps/owner/messages/{fr,en}.json` — `staff.venuesDialog.*`.

---

## Task 1: i18n — `staff.venuesDialog`

**Files:**
- Modify: `apps/owner/messages/fr.json`, `apps/owner/messages/en.json`

- [ ] **Step 1: Add the `venuesDialog` object under `staff` (both files, parity)**

`fr.json` (inside the existing `staff` object):
```json
"venuesDialog": {
  "manage": "Gérer les établissements",
  "title": "Établissements assignés",
  "replaceWarning": "La liste ci-dessous remplace entièrement les établissements actuels de ce membre.",
  "venuesRequired": "Sélectionnez au moins un établissement",
  "submit": "Enregistrer",
  "submitting": "Enregistrement…",
  "success": "Établissements mis à jour",
  "error": "Impossible de mettre à jour les établissements"
}
```
`en.json` (inside the existing `staff` object):
```json
"venuesDialog": {
  "manage": "Manage venues",
  "title": "Assigned venues",
  "replaceWarning": "The list below fully replaces this member's current venues.",
  "venuesRequired": "Select at least one venue",
  "submit": "Save",
  "submitting": "Saving…",
  "success": "Venues updated",
  "error": "Could not update venues"
}
```

- [ ] **Step 2: Verify parity**

Run:
```bash
cd /Users/abdel/dev/gymz-v1/web/apps/owner && node -e 'const fr=require("./messages/fr.json"),en=require("./messages/en.json");function k(o,p=""){return Object.entries(o).flatMap(([a,v])=>v&&typeof v==="object"&&!Array.isArray(v)?k(v,p+a+"."):[p+a]);}const f=new Set(k(fr)),e=new Set(k(en));const of=[...f].filter(x=>!e.has(x)),oe=[...e].filter(x=>!f.has(x));if(of.length||oe.length){console.log("GAPS",of,oe);process.exit(1)}if(!fr.staff.venuesDialog||!en.staff.venuesDialog)throw new Error("missing venuesDialog");console.log("i18n OK");'
```
Expected: `i18n OK`.

---

## Task 2: `ManageVenuesDialog` + trigger

**Files:**
- Modify: `apps/owner/app/(app)/staff/page.tsx`

- [ ] **Step 1: Imports**

Add `VenueChecklist`:
```ts
import { VenueChecklist } from '@/components/venue-checklist';
```
Extend the generated-hooks import to include `useSetStaffVenues` (keep the existing `getListStaffQueryKey`, `useChangeRole`, `useRemoveStaff`, etc.). Ensure `useEffect` and `useState` are imported from react (useState already is; add `useEffect` if missing).

- [ ] **Step 2: Add `ManageVenuesDialog`**

Place it next to `ChangeRoleDialog` (mirror its shape):
```tsx
function ManageVenuesDialog({
  staff,
  open,
  onOpenChange,
}: {
  staff: Staff;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const t = useTranslations('staff');
  const queryClient = useQueryClient();
  const setVenues = useSetStaffVenues();
  const [venueIds, setVenueIds] = useState<string[]>([]);
  const [venuesError, setVenuesError] = useState(false);

  // Blind replace: staff venue assignments aren't readable, so every open
  // starts from an empty selection.
  useEffect(() => {
    if (open) {
      setVenueIds([]);
      setVenuesError(false);
    }
  }, [open]);

  const handleSave = () => {
    if (venueIds.length === 0) {
      setVenuesError(true);
      return;
    }
    setVenues.mutate(
      { sid: staff.id, data: { venue_ids: venueIds } },
      {
        onSuccess: () => {
          toast.success(t('venuesDialog.success'));
          void queryClient.invalidateQueries({ queryKey: getListStaffQueryKey() });
          onOpenChange(false);
        },
        onError: (err) => {
          toast.error(apiErrorMessage(err, t('venuesDialog.error')));
        },
      },
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t('venuesDialog.title')}</DialogTitle>
        </DialogHeader>
        <div className="grid gap-2">
          <p className="text-sm text-muted-foreground">{t('venuesDialog.replaceWarning')}</p>
          <VenueChecklist
            value={venueIds}
            onChange={(next) => {
              setVenueIds(next);
              if (next.length > 0) setVenuesError(false);
            }}
          />
          {venuesError ? (
            <p className="text-sm text-destructive">{t('venuesDialog.venuesRequired')}</p>
          ) : null}
        </div>
        <DialogFooter>
          <Button onClick={handleSave} disabled={setVenues.isPending}>
            {setVenues.isPending ? t('venuesDialog.submitting') : t('venuesDialog.submit')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
```
Notes:
- If `DialogContent` in this file's dialogs already includes a cancel button pattern, add a matching `<Button variant="outline" onClick={() => onOpenChange(false)}>{tCommon('cancel')}</Button>` before the save button, with `const tCommon = useTranslations('common');` at the top — match the file's other dialogs (`RemoveStaffDialog`/`ChangeRoleDialog`). If they don't include a cancel button, omit it.
- Confirm `toast` (sonner), `apiErrorMessage`, `getListStaffQueryKey`, `useQueryClient`, and `Staff` type are already imported (they are — used by the sibling dialogs). Add any that are missing.

- [ ] **Step 3: Add the trigger to `StaffRowActions`**

In `StaffRowActions`, add a local open flag with the others: `const [manageVenuesOpen, setManageVenuesOpen] = useState(false);`. Add a `DropdownMenuItem` — placed with the other items (e.g. before or after "Change role") — shown only for venue-scoped roles:
```tsx
          {isVenueScopedRole(staff.role) ? (
            <DropdownMenuItem onSelect={() => setManageVenuesOpen(true)}>
              {t('venuesDialog.manage')}
            </DropdownMenuItem>
          ) : null}
```
Use the file's existing `t` (`useTranslations('staff')`) — confirm `StaffRowActions` already has it (the change-role item uses it). Render the dialog alongside the sibling dialogs that `StaffRowActions` already renders:
```tsx
      <ManageVenuesDialog staff={staff} open={manageVenuesOpen} onOpenChange={setManageVenuesOpen} />
```
(Match how `ChangeRoleDialog`/`RemoveStaffDialog` are rendered — same JSX region, same conditional structure. Do not wrap the item in an extra role gate beyond `isVenueScopedRole`; the menu itself is already only shown to managers.)

- [ ] **Step 4: Verify (typecheck/lint + preview)**

Run:
```bash
cd /Users/abdel/dev/gymz-v1/web
pnpm --filter owner typecheck 2>&1 | grep 'staff/page' || echo "staff typecheck OK"
pnpm --filter owner lint 2>&1 | tail -3
```
Expected: `staff typecheck OK`; lint clean (hooks unconditional; no unused vars).
Preview: on the staff list, open a trainer/receptionist row's action menu → "Gérer les établissements" is present; open it → the replace warning + venue checklist show; saving with no venue selected shows the required error; pick ≥1 and save → success toast, dialog closes (`preview_network` shows a `PUT …/staff/{sid}/venues` with the `venue_ids`). Confirm the item is ABSENT on an owner/admin row. No console errors.

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

- **Spec coverage:** i18n → Task 1; `ManageVenuesDialog` (blind replace, empty start, ≥1 guard, warning, invalidate `getListStaffQueryKey`) → Task 2 Step 2; role-gated trigger via `isVenueScopedRole` → Task 2 Step 3; verification → Tasks 2/3. All spec sections mapped.
- **Type consistency:** `useSetStaffVenues.mutate({ sid, data: { venue_ids } })` matches the generated signature; `VenueChecklist({ value, onChange })` matches its interface; `Staff` type reused from the file.
- **No scope toggle** (staff have none) — the dialog is venue-list only, per spec. Owner/admin rows: item hidden via `isVenueScopedRole`.
- **owner has no runner:** verified by typecheck + preview; nothing test-capable is added (no new `packages/ui` surface).
