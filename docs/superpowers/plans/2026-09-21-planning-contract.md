# SP-E — Planning contract Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Wire the 2026-09-21 planning contract into the owner console exactly as drawn: preview-first cancellation with `expected_version`, the `SlotRosterEntry` roster (pass holders, arrival line, coach view, inline add errors), the instructor-eligibility message, and the resource-in-use 409 dialog.

**Architecture:** Pure helpers in `apps/owner/lib/` (tested in node) feed four UI changes: a new `CancellationPreviewDialog` replacing two plain confirms, a roster rewrite inside `bookings-sheet.tsx`, a message override in the course dialogs, and a blocked state in `DeleteResourceDialog`. `Alert` (info/warning/destructive) is the notice family; no new ui primitive. The mock server mirrors the backend so the app can be driven end to end.

**Tech Stack:** Next 15 / React 19, Tailwind v4, Radix, react-query, react-hook-form + zod, next-intl, sonner, vitest, node `http` mock.

**Spec:** `docs/superpowers/specs/2026-09-21-planning-contract-design.md` (decisions E1–E13).

## Global Constraints

- The canvas `screens.pen` is the source of truth; frames `TeQNq`, `o9VUa3`, `UKoGk`, `zvJSN`, `dAnIL`, `tMtOv`, `VM1jv`, `baN1L`, `kVC5I`, `O4Q8d`, `gLNNi`; PNGs and verbatim copy in `docs/design-refs/comptoir-clair/wave-2/` (`INVENTORY.md`).
- Base: main ≥ 24f1c6b (`openapi.json` synced; generated hooks `useSlotCancellationPreview(sid, opts)`, `useScheduleCancellationPreview(sid, opts)`, `useCancelSlot()` with variables `{ sid, params?: { expected_version?: string } }`, `useCancelSchedule()` same shape, `useListBookingsForSlot` returning `ApiResponseVecSlotRosterEntry`).
- `Alert` variants map to the canvas tints: `warning` = `#fbf1dc`, `destructive` = `#fbe9e7`, `info` = `#e8eefb`. In dialogs use `<Alert variant><Icon /><AlertDescription>…</AlertDescription></Alert>` (no title).
- Canvas « Button/Secondary » = ui `variant="outline"` (spec D11). One dark 44px control per surface; destructive confirms use `variant="destructive"`; ghost cancels use `DialogClose asChild` + `variant="ghost"`.
- Desktop rows keep the 36px « ··· » (`icon-sm`, `size-11 md:size-9`); anything below `md` uses 44px.
- Dialogs opened from a row menu stay mounted, are driven by an `open` boolean and pass `restoreFocusTo` (spec D12). Edit dialogs reset their state on close.
- Font weights `font-normal`/`font-medium`/`font-semibold` only; sentence case; hairlines only; status tints never as text colour except `text-destructive-foreground` / `text-warning-foreground` on tinted or error lines. The guard bans the literal `eyebrow`, `font-bold`, `shadow-*`, `backdrop-blur`, `tracking-wide`.
- Type scale: `text-xs` 12, `text-sm` 13, `text-md` 14, `text-base` 15, `text-lg` 16, `text-xl` 22, `text-2xl` 32.
- `apps/owner/messages/fr.json` and `en.json` change together with targeted edits (never re-serialize the file); parity one-liner must print `parity ok`:
  `node -e 'const f=require("./apps/owner/messages/fr.json"),e=require("./apps/owner/messages/en.json");const k=(o,p="")=>Object.entries(o).flatMap(([a,b])=>typeof b==="string"?[p+a]:k(b,p+a+"."));const F=new Set(k(f)),E=new Set(k(e));const d=[...F].filter(x=>!E.has(x)).concat([...E].filter(x=>!F.has(x)));if(d.length){console.error(d);process.exit(1)}console.log("parity ok")'`
- No new dependencies; no `@testing-library/jest-dom`. Owner unit tests: `apps/owner/lib/**/*.test.ts` (node environment, plain vitest assertions).
- The app must never depend on a mock-only message; the classifier in Task 1 keys on the backend's own strings (`already exists`).
- Gates before every commit: `pnpm check:design && pnpm typecheck && pnpm lint && pnpm test` from the repo root. `pnpm build` in Task 6 only, never while a dev server of the same checkout runs (build in a throwaway `git worktree` of the commit instead).
- Prettier on changed files only. Commits use explicit pathspecs. Paths contain parentheses/brackets: quote them in the shell.

---

### Task 1: Pure helpers with node tests

**Files:**
- Create: `apps/owner/lib/cancellation-preview.ts`, `apps/owner/lib/cancellation-preview.test.ts`
- Create: `apps/owner/lib/booking-errors.ts`, `apps/owner/lib/booking-errors.test.ts`
- Create: `apps/owner/lib/roster.ts`, `apps/owner/lib/roster.test.ts`
- Create: `apps/owner/lib/resource-in-use.ts`, `apps/owner/lib/resource-in-use.test.ts`
- Modify: `apps/owner/lib/api-error.ts` (add `overrideFieldMessages`), `apps/owner/lib/api-error.test.ts` (create if absent)

**Interfaces (produced, used by Tasks 3–5):**

```ts
// cancellation-preview.ts
export type PreviewRowKey = 'futureSlots' | 'bookings' | 'emails' | 'passCredits' | 'memberCredits' | 'unchanged';
export interface PreviewRow { key: PreviewRowKey; value: number | null; hint?: PreviewRowKey; hintValues?: { members: number; pass: number }; muted?: boolean }
export function previewRows(preview: CancellationPreview, kind: 'slot' | 'schedule'): PreviewRow[];
export function isStalePreviewConflict(err: unknown): boolean;
// booking-errors.ts
export type AddParticipantErrorKind = 'full' | 'duplicate' | 'ineligible';
export function addParticipantError(err: unknown): AddParticipantErrorKind | null;
// roster.ts
export interface RosterLabel { kind: 'member' | 'pass'; name: string; anonymous: boolean }
export function shortMemberId(id: string): string;
export function rosterLabel(entry: SlotRosterEntry, opts: { hideNames: boolean; passLabel: string; memberNumber: (id: string) => string }): RosterLabel;
export function rosterInitials(entry: SlotRosterEntry): string;
// resource-in-use.ts
export function isResourceInUse(err: unknown): boolean;
export function activeSchedulesUsing(schedules: Schedule[], resourceId: string): Schedule[];
// api-error.ts
export function overrideFieldMessages(err: unknown, overrides: Record<string, string>): unknown;
```

- [ ] **Step 1: Write the failing tests**

`apps/owner/lib/cancellation-preview.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { ApiError } from '@iziwellpass/api/client';
import type { CancellationPreview } from '@iziwellpass/api/schemas';
import { isStalePreviewConflict, previewRows } from './cancellation-preview';

const base: CancellationPreview = {
  target_kind: 'slot',
  target_id: 'slot-1',
  active_bookings_affected: 14,
  member_booking_count: 11,
  pass_booking_count: 3,
  future_slots_affected: 0,
  notification_consequences: { member_emails_to_send: 12 },
  refund_consequences: { pass_credits_refunded: 3, member_credits_refunded: 0 },
  unchanged: { bookings_unchanged: 2, past_slots_preserved: 0 },
  blocking_condition: null,
  version: 'v1',
};

describe('previewRows', () => {
  it('orders the session rows as drawn on TeQNq and ends with a muted unchanged row', () => {
    const rows = previewRows(base, 'slot');
    expect(rows.map((r) => r.key)).toEqual(['bookings', 'emails', 'passCredits', 'memberCredits', 'unchanged']);
    expect(rows[0]).toEqual({ key: 'bookings', value: 14, hint: 'bookings', hintValues: { members: 11, pass: 3 } });
    expect(rows[1]).toEqual({ key: 'emails', value: 12, hint: 'emails' });
    expect(rows[4]).toEqual({ key: 'unchanged', value: null, hint: 'unchanged', muted: true });
  });
  it('orders the course rows as drawn on o9VUa3: future slots first, no e-mail hint, no unchanged row', () => {
    const rows = previewRows({ ...base, target_kind: 'schedule', future_slots_affected: 23 }, 'schedule');
    expect(rows.map((r) => r.key)).toEqual(['futureSlots', 'bookings', 'emails', 'passCredits', 'memberCredits']);
    expect(rows[0]).toEqual({ key: 'futureSlots', value: 23, hint: 'futureSlots' });
    expect(rows[2]).toEqual({ key: 'emails', value: 12 });
  });
});

describe('isStalePreviewConflict', () => {
  it('is true only for a 409 ApiError', () => {
    expect(isStalePreviewConflict(new ApiError(409, { code: 'CONFLICT', message: 'slot changed since preview' }))).toBe(true);
    expect(isStalePreviewConflict(new ApiError(404, { code: 'NOT_FOUND', message: 'x' }))).toBe(false);
    expect(isStalePreviewConflict(new Error('x'))).toBe(false);
  });
});
```

`apps/owner/lib/booking-errors.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { ApiError } from '@iziwellpass/api/client';
import { addParticipantError } from './booking-errors';

const conflict = (message: string) => new ApiError(409, { code: 'CONFLICT', message });

describe('addParticipantError', () => {
  it('classifies the backend duplicate message', () => {
    expect(addParticipantError(conflict('A booking already exists for this actor on this slot'))).toBe('duplicate');
  });
  it('treats every other 409 as full', () => {
    expect(addParticipantError(conflict('Slot is full — no available capacity'))).toBe('full');
    expect(addParticipantError(conflict('Slot abc is not available for booking'))).toBe('full');
  });
  it('maps 403 to ineligible', () => {
    expect(addParticipantError(new ApiError(403, { code: 'FORBIDDEN', message: 'not entitled' }))).toBe('ineligible');
  });
  it('returns null for anything else', () => {
    expect(addParticipantError(new ApiError(500, { code: 'INTERNAL', message: 'x' }))).toBeNull();
    expect(addParticipantError(new Error('network'))).toBeNull();
  });
});
```

`apps/owner/lib/roster.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import type { SlotRosterEntry } from '@iziwellpass/api/schemas';
import { rosterInitials, rosterLabel, shortMemberId } from './roster';

const entry = (over: Partial<SlotRosterEntry>): SlotRosterEntry => ({
  id: 'b1', tenant_id: 't', slot_id: 's', source: 'direct', status: 'confirmed',
  booked_at: '2026-09-21T06:00:00Z', created_at: '2026-09-21T06:00:00Z', updated_at: '2026-09-21T06:00:00Z',
  kind: 'member', member_id: '3f9c1b2e-0000-4000-8000-00000000a821', first_name: 'Awa', last_name: 'Ndiaye',
  ...over,
});
const opts = { hideNames: false, passLabel: 'Visiteur pass', memberNumber: (id: string) => `Membre n° ${id}` };

describe('shortMemberId', () => {
  it('keeps the last four characters upper-cased', () => {
    expect(shortMemberId('3f9c1b2e-0000-4000-8000-00000000a821')).toBe('A821');
    expect(shortMemberId('ab')).toBe('AB');
  });
});

describe('rosterLabel', () => {
  it('names a member', () => {
    expect(rosterLabel(entry({}), opts)).toEqual({ kind: 'member', name: 'Awa Ndiaye', anonymous: false });
  });
  it('never names a pass holder', () => {
    expect(rosterLabel(entry({ kind: 'pass_holder', member_id: null, pass_holder_id: 'p1', first_name: 'X', last_name: 'Y' }), opts))
      .toEqual({ kind: 'pass', name: 'Visiteur pass', anonymous: true });
  });
  it('uses the member number in coach view or when names are missing', () => {
    expect(rosterLabel(entry({}), { ...opts, hideNames: true })).toEqual({ kind: 'member', name: 'Membre n° A821', anonymous: true });
    expect(rosterLabel(entry({ first_name: null, last_name: null }), opts)).toEqual({ kind: 'member', name: 'Membre n° A821', anonymous: true });
  });
});

describe('rosterInitials', () => {
  it('builds initials from the entry, ? when unnamed', () => {
    expect(rosterInitials(entry({}))).toBe('AN');
    expect(rosterInitials(entry({ first_name: null, last_name: null }))).toBe('?');
  });
});
```

`apps/owner/lib/resource-in-use.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { ApiError } from '@iziwellpass/api/client';
import type { Schedule } from '@iziwellpass/api/schemas';
import { activeSchedulesUsing, isResourceInUse } from './resource-in-use';

const sched = (id: string, title: string, resource_id: string, is_active = true): Schedule => ({
  id, title, resource_id, is_active, tenant_id: 't', venue_id: 'v', start_time: '06:30:00', end_time: '07:30:00',
  effective_from: '2026-01-01', created_at: 'x', updated_at: 'x',
});

describe('isResourceInUse', () => {
  it('is true for a 409 ApiError only', () => {
    expect(isResourceInUse(new ApiError(409, { code: 'CONFLICT', message: 'Resource r has active schedules' }))).toBe(true);
    expect(isResourceInUse(new ApiError(403, { code: 'FORBIDDEN', message: 'x' }))).toBe(false);
  });
});

describe('activeSchedulesUsing', () => {
  it('keeps active schedules of the resource, sorted by title', () => {
    const list = [sched('1', 'Yoga du soir', 'r1'), sched('2', 'Stretching', 'r1'), sched('3', 'Boxe', 'r2'), sched('4', 'Ancien', 'r1', false)];
    expect(activeSchedulesUsing(list, 'r1').map((s) => s.title)).toEqual(['Stretching', 'Yoga du soir']);
  });
});
```

`apps/owner/lib/api-error.test.ts` (append a block if the file exists):

```ts
import { describe, expect, it } from 'vitest';
import { ApiError } from '@iziwellpass/api/client';
import { overrideFieldMessages } from './api-error';

describe('overrideFieldMessages', () => {
  it('rewrites the message of matching validation details and keeps the rest', () => {
    const err = new ApiError(400, {
      code: 'VALIDATION_ERROR', message: 'x',
      details: [{ field: 'instructor_staff_id', message: 'server' }, { field: 'title', message: 'required' }],
    }, 'req-1');
    const out = overrideFieldMessages(err, { instructor_staff_id: 'Cet intervenant n\'a pas accès à cette salle.' }) as ApiError;
    expect(out).not.toBe(err);
    expect(out.details).toEqual([{ field: 'instructor_staff_id', message: 'Cet intervenant n\'a pas accès à cette salle.' }, { field: 'title', message: 'required' }]);
    expect(out.requestId).toBe('req-1');
  });
  it('returns the same value when nothing matches or it is not a validation error', () => {
    const plain = new Error('x');
    expect(overrideFieldMessages(plain, { a: 'b' })).toBe(plain);
    const other = new ApiError(400, { code: 'VALIDATION_ERROR', message: 'x', details: [{ field: 'title', message: 'r' }] });
    expect(overrideFieldMessages(other, { instructor_staff_id: 'y' })).toBe(other);
  });
});
```

- [ ] **Step 2: Run the tests, expect failures on missing modules/exports**

Run: `pnpm --filter @iziwellpass/owner test -- lib/cancellation-preview lib/booking-errors lib/roster lib/resource-in-use lib/api-error`
Expected: FAIL (cannot find module / not a function).

- [ ] **Step 3: Implement**

`apps/owner/lib/cancellation-preview.ts`:

```ts
import { ApiError } from '@iziwellpass/api/client';
import type { CancellationPreview } from '@iziwellpass/api/schemas';

export type PreviewRowKey = 'futureSlots' | 'bookings' | 'emails' | 'passCredits' | 'memberCredits' | 'unchanged';

export interface PreviewRow {
  key: PreviewRowKey;
  /** `null` renders « — » (the informational « Inchangé » row). */
  value: number | null;
  hint?: PreviewRowKey;
  hintValues?: { members: number; pass: number };
  muted?: boolean;
}

/** Rows in canvas order: `TeQNq` (slot) and `o9VUa3` (schedule) differ on purpose (spec E1). */
export function previewRows(preview: CancellationPreview, kind: 'slot' | 'schedule'): PreviewRow[] {
  const bookings: PreviewRow = {
    key: 'bookings',
    value: preview.active_bookings_affected,
    hint: 'bookings',
    hintValues: { members: preview.member_booking_count, pass: preview.pass_booking_count },
  };
  const passCredits: PreviewRow = { key: 'passCredits', value: preview.refund_consequences.pass_credits_refunded, hint: 'passCredits' };
  const memberCredits: PreviewRow = { key: 'memberCredits', value: preview.refund_consequences.member_credits_refunded, hint: 'memberCredits' };
  const emails = preview.notification_consequences.member_emails_to_send;
  if (kind === 'schedule') {
    return [
      { key: 'futureSlots', value: preview.future_slots_affected, hint: 'futureSlots' },
      bookings,
      { key: 'emails', value: emails },
      passCredits,
      memberCredits,
    ];
  }
  return [
    bookings,
    { key: 'emails', value: emails, hint: 'emails' },
    passCredits,
    memberCredits,
    { key: 'unchanged', value: null, hint: 'unchanged', muted: true },
  ];
}

export function isStalePreviewConflict(err: unknown): boolean {
  return err instanceof ApiError && err.status === 409;
}
```

`apps/owner/lib/booking-errors.ts`:

```ts
import { ApiError } from '@iziwellpass/api/client';

export type AddParticipantErrorKind = 'full' | 'duplicate' | 'ineligible';

/**
 * `POST /slots/{sid}/bookings` returns `CONFLICT` for both "slot full" and
 * "already booked"; the message is the only discriminator (backend
 * `booking/service.rs`: "A booking already exists for this actor on this
 * slot"). 403 means the member is not entitled to the venue.
 */
export function addParticipantError(err: unknown): AddParticipantErrorKind | null {
  if (!(err instanceof ApiError)) return null;
  if (err.status === 409) return /already exists/i.test(err.message) ? 'duplicate' : 'full';
  if (err.status === 403) return 'ineligible';
  return null;
}
```

`apps/owner/lib/roster.ts`:

```ts
import type { SlotRosterEntry } from '@iziwellpass/api/schemas';

export interface RosterLabel {
  kind: 'member' | 'pass';
  name: string;
  /** True when the row shows no personal name (pass holder, coach view, or names withheld). */
  anonymous: boolean;
}

export function shortMemberId(id: string): string {
  return id.slice(-4).toUpperCase();
}

export function rosterLabel(
  entry: SlotRosterEntry,
  opts: { hideNames: boolean; passLabel: string; memberNumber: (id: string) => string },
): RosterLabel {
  if (entry.kind === 'pass_holder') {
    return { kind: 'pass', name: opts.passLabel, anonymous: true };
  }
  const full = `${entry.first_name ?? ''} ${entry.last_name ?? ''}`.trim();
  if (!opts.hideNames && full) {
    return { kind: 'member', name: full, anonymous: false };
  }
  return { kind: 'member', name: opts.memberNumber(shortMemberId(entry.member_id ?? entry.id)), anonymous: true };
}

export function rosterInitials(entry: SlotRosterEntry): string {
  const initials = `${entry.first_name?.charAt(0) ?? ''}${entry.last_name?.charAt(0) ?? ''}`.toUpperCase();
  return initials || '?';
}
```

`apps/owner/lib/resource-in-use.ts`:

```ts
import { ApiError } from '@iziwellpass/api/client';
import type { Schedule } from '@iziwellpass/api/schemas';

/** `DELETE /venues/{vid}/resources/{rid}` → 409 when active schedules still use the room. */
export function isResourceInUse(err: unknown): boolean {
  return err instanceof ApiError && err.status === 409;
}

export function activeSchedulesUsing(schedules: Schedule[], resourceId: string): Schedule[] {
  return schedules
    .filter((s) => s.is_active && s.resource_id === resourceId)
    .sort((a, b) => a.title.localeCompare(b.title));
}
```

Append to `apps/owner/lib/api-error.ts` (after `applyFieldErrors`):

```ts
/**
 * Returns a copy of a `VALIDATION_ERROR` whose matching `details[].message`
 * are replaced by the given copy (e.g. the canvas sentence for
 * `instructor_staff_id`), so `applyFieldErrors` shows product copy instead of
 * the server's English. Anything else is returned untouched.
 */
export function overrideFieldMessages(err: unknown, overrides: Record<string, string>): unknown {
  if (!(err instanceof ApiError) || err.code !== 'VALIDATION_ERROR') return err;
  const details = parseFieldErrorDetails(err.details);
  if (!details || !details.some((d) => d.field in overrides)) return err;
  const rewritten = details.map((d) => (d.field in overrides ? { ...d, message: overrides[d.field] } : d));
  return new ApiError(err.status, { code: err.code, message: err.message, details: rewritten }, err.requestId);
}
```

- [ ] **Step 4: Run the tests, expect PASS**

Run: `pnpm --filter @iziwellpass/owner test`
Expected: all green, output pristine.

- [ ] **Step 5: Gates and commit**

```bash
pnpm check:design && pnpm typecheck && pnpm lint && pnpm test
pnpm exec prettier --write apps/owner/lib/cancellation-preview.ts apps/owner/lib/cancellation-preview.test.ts apps/owner/lib/booking-errors.ts apps/owner/lib/booking-errors.test.ts apps/owner/lib/roster.ts apps/owner/lib/roster.test.ts apps/owner/lib/resource-in-use.ts apps/owner/lib/resource-in-use.test.ts apps/owner/lib/api-error.ts apps/owner/lib/api-error.test.ts
git add apps/owner/lib/cancellation-preview.ts apps/owner/lib/cancellation-preview.test.ts apps/owner/lib/booking-errors.ts apps/owner/lib/booking-errors.test.ts apps/owner/lib/roster.ts apps/owner/lib/roster.test.ts apps/owner/lib/resource-in-use.ts apps/owner/lib/resource-in-use.test.ts apps/owner/lib/api-error.ts apps/owner/lib/api-error.test.ts
git commit -m "feat(owner): planning-contract helpers (preview rows, add-error classifier, roster labels, resource in use)"
```

---

### Task 2: Messages and mock server

**Files:**
- Modify: `apps/owner/messages/fr.json`, `apps/owner/messages/en.json` (targeted edits)
- Modify: `apps/owner/scripts/mock-server.mjs`

**Interfaces:** message keys exactly as spec §8; mock routes as spec §7.

- [ ] **Step 1: Messages (fr) — add or replace with targeted edits (jq-free: edit the JSON text in place, keep formatting)**

Under `planning`:
- Add `cancelPreview` object with: `caption`, `rows.{futureSlots,futureSlotsHint,bookings,bookingsHint,emails,emailsHint,passCredits,passCreditsHint,memberCredits,memberCreditsHint,unchanged,unchangedHint}`, `back`, `close`, `conflict`, `loadError`, `retry`, `blocked.slot`, `blocked.schedule` — French strings verbatim from spec §8.
- Replace `cancelSlot.description` → `"{title} · {day} · {start}–{end} · {room}"`.
- Replace `deleteCourse.description` → `"{title} · {recurrence} · {start}–{end}"`, `deleteCourse.confirming` → `"Annulation…"`, `deleteCourse.success` → `"Cours annulé"`, `deleteCourse.error` → `"Impossible d'annuler le cours"`.
- Under `bookings` add `arrival: "Arrivée {time} · {method}"`, `method: { qr: "QR", manual: "manuel" }`, `passVisitor: "Visiteur pass"`, `passChip: "Pass"`, `coachView: "Vue coach · noms masqués"`, `memberNumber: "Membre n° {id}"`.
- Under `addBooking` add `errors: { full: "Séance complète.", duplicate: "Déjà inscrit à cette séance.", ineligible: "Membre non éligible à cet établissement." }`.
- Under `form` add `instructorIneligible: "Cet intervenant n'a pas accès à cette salle."`.

Under `venues.detail.resources.deleteDialog` add `inUse: { message: "Cette ressource est utilisée par des cours. Annulez-les d'abord.", close: "Fermer", viewCourses: "Voir les cours" }`.

- [ ] **Step 2: Messages (en) — same keys**

`cancelPreview`: caption "What cancelling entails"; rows: futureSlots "Future sessions affected", futureSlotsHint "From tomorrow. Today's and past sessions are kept.", bookings "Bookings affected", bookingsHint "{members} members · {pass} pass visitors", emails "E-mails sent automatically", emailsHint "To members with an address; one member may receive several.", passCredits "Pass credits refunded", passCreditsHint "Refunded by the platform.", memberCredits "Member credits refunded", memberCreditsHint "A cancellation by the team does not refund members' session credits.", unchanged "Unchanged", unchangedHint "Recorded arrivals and past sessions are kept."; back "Back"; close "Close"; conflict "Bookings have changed. Preview updated — check before confirming."; loadError "Could not load the preview."; retry "Retry"; blocked.slot "This session is already cancelled."; blocked.schedule "This course is already cancelled.".
`cancelSlot.description` "{title} · {day} · {start}–{end} · {room}"; `deleteCourse.description` "{title} · {recurrence} · {start}–{end}", `confirming` "Cancelling…", `success` "Course cancelled", `error` "Could not cancel course".
`bookings`: arrival "Arrived {time} · {method}", method.qr "QR", method.manual "manual", passVisitor "Pass visitor", passChip "Pass", coachView "Coach view · names hidden", memberNumber "Member no. {id}".
`addBooking.errors`: full "Session full.", duplicate "Already booked on this session.", ineligible "Member not eligible at this venue.".
`form.instructorIneligible` "This instructor has no access to this room.".
`venues.detail.resources.deleteDialog.inUse`: message "This resource is used by courses. Cancel them first.", close "Close", viewCourses "View courses".

Run the parity one-liner from Global Constraints → `parity ok`.

- [ ] **Step 3: Mock — versions, previews, 204 cancels**

In `apps/owner/scripts/mock-server.mjs`:
- Add `version: iso(daysFromNow(-1))` to every seeded schedule object and in `mkSlot`; add a helper `const bump = (row) => { row.version = iso(now()); row.updated_at = row.version; };` and call `bump(slot)` / `bump(schedule)` inside `recomputeSlotCounts` for touched slots, `createBookingHandler`, `cancelBookingHandler`, `updateScheduleHandler`.
- Add `function previewFor(kind, target)` returning the `CancellationPreview` shape:

```js
function previewFor(kind, target) {
  const slotIds = kind === 'slot' ? [target.id] : slots.filter((s) => s.schedule_id === target.id && s.status !== 'cancelled' && s.start_time > iso(now())).map((s) => s.id);
  const live = bookings.filter((b) => slotIds.includes(b.slot_id) && b.status === 'confirmed');
  const memberRows = live.filter((b) => b.member_id);
  const passRows = live.filter((b) => b.pass_holder_id);
  const emails = memberRows.filter((b) => members.find((m) => m.id === b.member_id)?.email).length;
  const untouched = bookings.filter((b) => slotIds.includes(b.slot_id) && b.status === 'checked_in').length;
  const alreadyCancelled = kind === 'slot' ? target.status === 'cancelled' : !target.is_active;
  return {
    target_kind: kind, target_id: target.id,
    future_slots_affected: kind === 'slot' ? 0 : slotIds.length,
    active_bookings_affected: live.length, member_booking_count: memberRows.length, pass_booking_count: passRows.length,
    notification_consequences: { member_emails_to_send: emails },
    refund_consequences: { pass_credits_refunded: passRows.length, member_credits_refunded: 0 },
    unchanged: { bookings_unchanged: untouched, past_slots_preserved: kind === 'slot' ? 0 : slots.filter((s) => s.schedule_id === target.id && s.start_time <= iso(now())).length },
    blocking_condition: alreadyCancelled ? `${kind} is already cancelled` : null,
    version: target.version,
  };
}
```

- Routes: `GET /^\/gms\/v1\/slots\/([^/]+)\/cancellation-preview$/` → 404 if unknown else `[200, envelope(previewFor('slot', slot))]`; same for `/^\/gms\/v1\/schedules\/([^/]+)\/cancellation-preview$/`.
- `cancelSlotHandler(slotId, query)`: if `query.get('expected_version')` and it differs from `slot.version` → `conflict('slot changed since preview; re-fetch and retry')`; demo hook: `if (slotId === 'slot-03' && !slot.conflictedOnce) { slot.conflictedOnce = true; bump(slot); return conflict('slot changed since preview; re-fetch and retry'); }` placed before the version check; on success `slot.status = 'cancelled'; bump(slot); return [204, ''];`. Update the route entry to pass `query` (`handler: (m, _b, q) => cancelSlotHandler(m[1], q)`).
- `cancelScheduleHandler(scheduleId, query)`: same version check with message `'schedule changed since preview; re-fetch and retry'`, set `is_active = false`, `bump`, return `[204, '']`.
- Document both hooks in the header comment block next to `bkg-fenetre`.

- [ ] **Step 4: Mock — roster shape and pass holders**

- `mkBooking(id, slotId, memberId, status, opts)` adds: `kind: opts.passHolderId ? 'pass_holder' : 'member'`, `pass_holder_id: opts.passHolderId`, `first_name`/`last_name` from `members.find((m) => m.id === memberId)` (note: `members` is declared before `bookings`; if not, resolve lazily in `listBookingsForSlotHandler`), `check_in_method: opts.checkInMethod`, `checked_in_at: opts.checkedInAt`.
- `listBookingsForSlotHandler` maps each booking through `toRosterEntry(b)` which copies the booking and fills `first_name`/`last_name` from the member and `check_in_method`/`checked_in_at` from the matching `checkIns` row (`c.booking_id === b.id`) when the booking is `checked_in`.
- Seed on `slot-01`: `mkBooking('bkg-pass-01', 'slot-01', undefined, 'checked_in', { passHolderId: 'ph-01', source: 'iziwellpass', checkedInAt: iso(hoursFromNow(-2.8)), checkInMethod: 'qr' })` and `mkBooking('bkg-pass-02', 'slot-01', undefined, 'confirmed', { passHolderId: 'ph-02', source: 'iziwellpass' })`. Ensure `recomputeSlotCounts` counts them.
- `createBookingHandler`: replace `conflict('Ce créneau est complet.')` with `conflict('Slot is full — no available capacity')`; before it, if a live booking exists for the same `member_id` → `conflict('A booking already exists for this actor on this slot')`; if the member exists and `!member.is_active` → `[403, errorBody('FORBIDDEN', 'Member is not entitled to this venue')]`.

- [ ] **Step 5: Mock — resource 409 and instructor validation**

- `deleteResourceHandler`: before soft-deleting, `if (schedules.some((s) => s.is_active && s.resource_id === resourceId)) return conflict(\`Resource ${resourceId} has active schedules and cannot be deleted\`);`
- Seed a fifth staff row `staff-trainer-02` (Cheikh Fall, role `trainer`, `is_active: true`, `venue_ids: [VENUE_2]`) so it appears in the instructor select but has no access to venue 1.
- `createScheduleHandler` and `updateScheduleHandler`: `if (body.instructor_staff_id === 'staff-trainer-02') return validationError([{ field: 'instructor_staff_id', message: 'not an active staff member with access to this venue' }]);`

- [ ] **Step 6: Smoke the mock**

```bash
node apps/owner/scripts/mock-server.mjs & sleep 1
curl -s -H 'authorization: Bearer x' localhost:8090/gms/v1/slots/slot-01/cancellation-preview | head -c 400; echo
curl -s -H 'authorization: Bearer x' localhost:8090/gms/v1/slots/slot-01/bookings | head -c 600; echo
curl -s -o /dev/null -w '%{http_code}\n' -X PUT -H 'authorization: Bearer x' 'localhost:8090/gms/v1/slots/slot-03/cancel?expected_version=nope'   # 409
kill %1
```

- [ ] **Step 7: Gates and commit**

```bash
pnpm check:design && pnpm typecheck && pnpm lint && pnpm test
pnpm exec prettier --write apps/owner/scripts/mock-server.mjs
git add apps/owner/messages/fr.json apps/owner/messages/en.json apps/owner/scripts/mock-server.mjs
git commit -m "feat(owner): planning-contract messages and mock (previews, expected_version, roster, resource 409)"
```

---

### Task 3: `CancellationPreviewDialog` replaces both cancel dialogs

**Files:**
- Create: `apps/owner/app/(app)/schedules/cancellation-preview-dialog.tsx`
- Modify: `apps/owner/app/(app)/schedules/slots-tab.tsx` (delete `CancelSlotDialog`, pass `dayLabel` to `SlotRow`, render the new dialog)
- Modify: `apps/owner/app/(app)/schedules/schedules-tab.tsx` (render the new dialog instead of `DeleteScheduleDialog`)
- Modify: `apps/owner/app/(app)/schedules/schedule-dialogs.tsx` (delete `DeleteScheduleDialog` and its now-unused imports)

**Interfaces:**
- Consumes: `previewRows`, `isStalePreviewConflict` (Task 1); keys `planning.cancelPreview.*`, `cancelSlot.*`, `deleteCourse.*` (Task 2); `useSlotCancellationPreview`, `useScheduleCancellationPreview`, `useCancelSlot`, `useCancelSchedule`, `getListSlotsQueryKey`, `getListSchedulesQueryKey`.
- Produces: `CancellationPreviewDialog({ target, venueId, open, onOpenChange, restoreFocusTo })` with `target: { kind: 'slot'; slot: ScheduleSlot; description: string } | { kind: 'schedule'; schedule: Schedule; description: string }`.

- [ ] **Step 1: Create the dialog**

```tsx
'use client';

import { useEffect, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { CircleAlertIcon, TriangleAlertIcon } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { toast } from 'sonner';

import { unwrap } from '@iziwellpass/api/client';
import {
  getListSchedulesQueryKey,
  getListSlotsQueryKey,
  useCancelSchedule,
  useCancelSlot,
  useScheduleCancellationPreview,
  useSlotCancellationPreview,
} from '@iziwellpass/api/generated';
import type { Schedule, ScheduleSlot } from '@iziwellpass/api/schemas';
import { Alert, AlertDescription } from '@iziwellpass/ui/components/alert';
import { Button } from '@iziwellpass/ui/components/button';
import { Dialog, DialogClose, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@iziwellpass/ui/components/dialog';
import { Skeleton } from '@iziwellpass/ui/components/skeleton';

import { apiErrorMessage } from '@/lib/api-error';
import { isStalePreviewConflict, previewRows, type PreviewRow } from '@/lib/cancellation-preview';

export type CancellationTarget =
  | { kind: 'slot'; slot: ScheduleSlot; description: string }
  | { kind: 'schedule'; schedule: Schedule; description: string };

const PREVIEW_QUERY = { select: unwrap, staleTime: 0, gcTime: 0, retry: false } as const;

/** Canvas `TeQNq`/`o9VUa3` (loaded), `UKoGk` (loading), `zvJSN` (409), `dAnIL` (blocked, load error). */
export function CancellationPreviewDialog({ target, venueId, open, onOpenChange, restoreFocusTo }: {
  target: CancellationTarget;
  venueId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  restoreFocusTo?: () => HTMLElement | null | undefined;
}) {
  const t = useTranslations('planning');
  const queryClient = useQueryClient();
  const [conflict, setConflict] = useState(false);
  const targetId = target.kind === 'slot' ? target.slot.id : target.schedule.id;

  const slotPreview = useSlotCancellationPreview(targetId, { query: { ...PREVIEW_QUERY, enabled: open && target.kind === 'slot' } });
  const schedulePreview = useScheduleCancellationPreview(targetId, { query: { ...PREVIEW_QUERY, enabled: open && target.kind === 'schedule' } });
  const preview = target.kind === 'slot' ? slotPreview : schedulePreview;

  const cancelSlot = useCancelSlot();
  const cancelSchedule = useCancelSchedule();
  const confirming = cancelSlot.isPending || cancelSchedule.isPending;

  useEffect(() => { if (!open) setConflict(false); }, [open]);

  const labels = target.kind === 'slot'
    ? { title: t('cancelSlot.title'), confirm: t('cancelSlot.confirm'), confirming: t('cancelSlot.confirming'), success: t('cancelSlot.success'), error: t('cancelSlot.error'), blocked: t('cancelPreview.blocked.slot') }
    : { title: t('deleteCourse.title'), confirm: t('deleteCourse.confirm'), confirming: t('deleteCourse.confirming'), success: t('deleteCourse.success'), error: t('deleteCourse.error'), blocked: t('cancelPreview.blocked.schedule') };

  const handleConfirm = () => {
    const version = preview.data?.version ?? undefined;
    const params = version ? { expected_version: version } : undefined;
    const options = {
      onSuccess: () => {
        toast.success(labels.success);
        void queryClient.invalidateQueries({ queryKey: getListSlotsQueryKey(venueId) });
        if (target.kind === 'schedule') void queryClient.invalidateQueries({ queryKey: getListSchedulesQueryKey(venueId) });
        onOpenChange(false);
      },
      onError: (err: unknown) => {
        if (isStalePreviewConflict(err)) { setConflict(true); void preview.refetch(); return; }
        toast.error(apiErrorMessage(err, labels.error));
      },
    };
    if (target.kind === 'slot') cancelSlot.mutate({ sid: targetId, params }, options);
    else cancelSchedule.mutate({ sid: targetId, params }, options);
  };

  const blocked = preview.data?.blocking_condition != null;
  const rows = preview.data ? previewRows(preview.data, target.kind) : [];
  const canConfirm = preview.isSuccess && !blocked && !confirming;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent restoreFocusTo={restoreFocusTo}>
        <DialogHeader>
          <DialogTitle>{labels.title}</DialogTitle>
          <DialogDescription>{target.description}</DialogDescription>
        </DialogHeader>

        {blocked ? (
          <p className="text-base">{labels.blocked}</p>
        ) : (
          <div className="flex flex-col gap-[18px]">
            {conflict ? (
              <Alert variant="warning"><TriangleAlertIcon /><AlertDescription>{t('cancelPreview.conflict')}</AlertDescription></Alert>
            ) : null}
            {preview.isError ? (
              <Alert variant="destructive">
                <CircleAlertIcon />
                <AlertDescription className="flex flex-wrap items-center gap-3">
                  <span>{t('cancelPreview.loadError')}</span>
                  <Button variant="outline" size="sm" onClick={() => void preview.refetch()}>{t('cancelPreview.retry')}</Button>
                </AlertDescription>
              </Alert>
            ) : (
              <>
                <p className="text-sm text-muted-foreground">{t('cancelPreview.caption')}</p>
                {preview.isSuccess ? <PreviewList rows={rows} /> : <PreviewSkeleton />}
              </>
            )}
          </div>
        )}

        <DialogFooter>
          {blocked ? (
            <DialogClose asChild><Button variant="ghost">{t('cancelPreview.close')}</Button></DialogClose>
          ) : (
            <>
              <DialogClose asChild><Button variant="ghost" disabled={confirming}>{t('cancelPreview.back')}</Button></DialogClose>
              <Button variant="destructive" onClick={handleConfirm} disabled={!canConfirm}>{confirming ? labels.confirming : labels.confirm}</Button>
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function PreviewList({ rows }: { rows: PreviewRow[] }) {
  const t = useTranslations('planning.cancelPreview.rows');
  return (
    <dl className="flex flex-col [&>*+*]:border-t [&>*+*]:border-border">
      {rows.map((row) => (
        <div key={row.key} className={row.muted ? 'flex items-start justify-between gap-4 py-3 text-muted-foreground' : 'flex items-start justify-between gap-4 py-3'}>
          <div className="flex min-w-0 flex-col gap-[3px]">
            <dt className="text-base">{t(row.key)}</dt>
            {row.hint ? <dd className="text-sm text-muted-foreground">{t(`${row.hint}Hint`, row.hintValues)}</dd> : null}
          </div>
          <dd className="shrink-0 font-numeric text-base font-medium">{row.value === null ? '—' : row.value}</dd>
        </div>
      ))}
    </dl>
  );
}

function PreviewSkeleton() {
  return (
    <div className="flex flex-col" aria-busy>
      {[0, 1, 2, 3].map((i) => (
        <div key={i} className="flex h-[42px] items-center justify-between">
          <Skeleton className="h-3.5 w-[220px]" />
          <Skeleton className="h-3.5 w-8" />
        </div>
      ))}
    </div>
  );
}
```

Notes for the implementer: `font-numeric` is the existing tabular-numerals utility used by `AlertReference` — verify it exists in `packages/ui/src/styles/globals.css`; if it does not, use `tabular-nums`. `useTranslations('planning.cancelPreview.rows')` with `t(row.key)`: next-intl needs a literal key type — cast with `t(row.key as 'bookings')` if tsc complains, or map keys through a small `Record<PreviewRowKey, string>` built from `t`.

- [ ] **Step 2: Slots tab**

- Delete `CancelSlotDialog` (lines ~92–156) and its now-unused imports (`useCancelSlot`, `DialogClose`, `DialogDescription`, …; keep what `SlotRow`/`SlotsTab` still use).
- `SlotRow` gains `dayLabel: string` and renders:

```tsx
<CancellationPreviewDialog
  target={{
    kind: 'slot',
    slot,
    description: t('cancelSlot.description', {
      title,
      day: dayLabel,
      start: formatTime(slot.start_time, timeZone),
      end: formatTime(slot.end_time, timeZone),
      room: resourceName,
    }),
  }}
  venueId={slot.venue_id}
  open={cancelling}
  onOpenChange={setCancelling}
  restoreFocusTo={() => menuRef.current}
/>
```

- In the `slotsByDate.map` loop, pass `dayLabel={heading}` to every `SlotRow`.

- [ ] **Step 3: Courses tab**

Replace the `DeleteScheduleDialog` render with:

```tsx
{deleting ? (
  <CancellationPreviewDialog
    target={{
      kind: 'schedule',
      schedule: deleting,
      description: t('deleteCourse.description', {
        title: deleting.title,
        recurrence: formatRecurrence(deleting.recurrence_rule),
        start: deleting.start_time.slice(0, 5),
        end: deleting.end_time.slice(0, 5),
      }),
    }}
    venueId={venueId}
    open={deleteOpen}
    onOpenChange={setDeleteOpen}
    restoreFocusTo={() => focus.get(deleting?.id)}
  />
) : null}
```

`formatRecurrence` comes from `usePlanningLabels()` inside `SchedulesTab` (already imported in the file). Remove `DeleteScheduleDialog` from the import line.

- [ ] **Step 4: Delete `DeleteScheduleDialog`** from `schedule-dialogs.tsx` together with imports that only it used (`useCancelSchedule`, `DialogClose` if unused, `getListSlotsQueryKey` if unused — check with tsc/eslint).

- [ ] **Step 5: Drive it on the mock** (`pnpm --filter @iziwellpass/owner dev:mock` + `pnpm --filter @iziwellpass/owner dev`, sign in with the owner account): open « Séances » → « ··· » → « Annuler la séance » on `slot-03` → confirm → the 409 notice appears and the rows refresh → confirm again → toast. Open « Cours récurrents » → « Annuler ce cours » → rows start with « Séances futures concernées ». Cancel a slot, reopen its menu → « Cette séance est déjà annulée. » + « Fermer ». Stop the mock to see the load-error state with « Réessayer ».

- [ ] **Step 6: Gates and commit**

```bash
pnpm check:design && pnpm typecheck && pnpm lint && pnpm test
pnpm exec prettier --write 'apps/owner/app/(app)/schedules/cancellation-preview-dialog.tsx' 'apps/owner/app/(app)/schedules/slots-tab.tsx' 'apps/owner/app/(app)/schedules/schedules-tab.tsx' 'apps/owner/app/(app)/schedules/schedule-dialogs.tsx'
git add 'apps/owner/app/(app)/schedules/cancellation-preview-dialog.tsx' 'apps/owner/app/(app)/schedules/slots-tab.tsx' 'apps/owner/app/(app)/schedules/schedules-tab.tsx' 'apps/owner/app/(app)/schedules/schedule-dialogs.tsx'
git commit -m "feat(owner): preview-first cancellation dialog with expected_version (planning)"
```

---

### Task 4: Roster on `SlotRosterEntry` (pass holders, arrival, coach view, inline add errors)

**Files:**
- Modify: `apps/owner/app/(app)/schedules/bookings-sheet.tsx`
- Modify: `apps/owner/app/(app)/schedules/planning-utils.ts` (delete `resolveBookingActorLabel`; keep `memberName`/`memberInitials` for the combobox and member pages)
- Modify: `apps/owner/app/(app)/schedules/slots-tab.tsx` (`useAllMembers` only when `canManageBookings`)

**Interfaces:**
- Consumes: `rosterLabel`, `rosterInitials`, `addParticipantError` (Task 1); keys `planning.bookings.{arrival,method.*,passVisitor,passChip,coachView,memberNumber}`, `planning.addBooking.errors.*` (Task 2); `useRole` from `@iziwellpass/auth/provider`; `Chip` from `@iziwellpass/ui/components/chip`; icons `TicketIcon`, `EyeOffIcon`, `CircleAlertIcon`.

- [ ] **Step 1: Types.** Replace every `Booking` import/usage in `bookings-sheet.tsx` with `SlotRosterEntry` (`CancelBookingDialog`'s prop, `cancellingBooking` state, `handleValidate`, the `bookings` memo). `useListBookingsForSlot(slot.id, { query: { select: unwrap } })` already yields `SlotRosterEntry[]`.

- [ ] **Step 2: Row rendering** (canvas `tMtOv`, 60px rows, hairline):

```tsx
const role = useRole();
const hideNames = role === 'trainer';
const label = rosterLabel(entry, { hideNames, passLabel: t('bookings.passVisitor'), memberNumber: (id) => t('bookings.memberNumber', { id }) });
const arrival = entry.checked_in_at
  ? t('bookings.arrival', { time: formatTime(entry.checked_in_at, timeZone), method: t(`bookings.method.${entry.check_in_method ?? 'manual'}`) })
  : null;
```

```tsx
<li key={entry.id} className="flex min-h-[60px] items-center gap-3 border-b border-border py-2 last:border-0">
  <Avatar>
    {label.kind === 'pass' ? (
      <AvatarFallback aria-hidden className="bg-secondary text-muted-strong"><TicketIcon className="size-4" /></AvatarFallback>
    ) : (
      <AvatarFallback aria-hidden tint={index}>{label.anonymous ? '?' : rosterInitials(entry)}</AvatarFallback>
    )}
  </Avatar>
  <div className="min-w-0 flex-1 leading-tight">
    <p className="flex items-center gap-2 truncate text-base font-medium">
      <span className="truncate">{label.name}</span>
      {label.kind === 'pass' ? <Chip className="bg-info py-0.5 pl-2.5 pr-2.5 text-sm text-info-foreground">{t('bookings.passChip')}</Chip> : null}
    </p>
    {arrival ? <p className="truncate text-sm text-muted-foreground">{arrival}</p> : null}
  </div>
  …status badge, « Valider », row menu unchanged…
</li>
```

Delete the source line (`bookingSourceLabel(booking.source)`) from the row and the `resolveBookingActorLabel` helper (and its import). `usePlanningLabels` keeps `bookingSourceLabel` (used elsewhere).

- [ ] **Step 3: Coach chip** under `SheetDescription` when `hideNames`:

```tsx
{hideNames ? (
  <Chip className="mt-2 self-start text-sm"><EyeOffIcon className="size-3.5" />{t('bookings.coachView')}</Chip>
) : null}
```

- [ ] **Step 4: Inline add errors** in `AddParticipant`:

```tsx
const [inlineError, setInlineError] = useState<AddParticipantErrorKind | null>(null);
…
onSuccess: () => { …; setInlineError(null); },
onError: (err) => {
  const kind = addParticipantError(err);
  if (kind) { setInlineError(kind); return; }
  toast.error(apiErrorMessage(err, t('addBooking.error')));
},
```

The `Combobox` gets `aria-invalid={inlineError !== null}` (add the prop passthrough to `Combobox` if it does not forward `aria-*`; check `packages/ui/src/components/combobox.tsx`) and `onValueChange={(v) => { setMemberId(v); setInlineError(null); }}`. Under the row:

```tsx
{inlineError ? (
  <p role="alert" className="flex items-center gap-1.5 text-sm text-destructive-foreground"><CircleAlertIcon className="size-3.5" />{t(`addBooking.errors.${inlineError}`)}</p>
) : full ? (
  <p className="text-sm text-muted-foreground">{t('addBooking.slotFull')}</p>
) : null}
```

- [ ] **Step 5: Members fetch gate.** In `SlotsTab`, `useAllMembers` is called for every role; change `apps/owner/lib/all-members.ts` `useAllMembers(options?: { enabled?: boolean })` to forward `enabled` (default true) and call it with `{ enabled: canManageBookings }` in `SlotsTab`. Keep other call sites untouched.

- [ ] **Step 6: Drive on the mock**: `slot-01` shows two « Visiteur pass » rows with the « Pass » chip, arrival lines « Arrivée HH:MM · QR/manuel » on checked-in rows; add `mbr-01` twice → « Déjà inscrit à cette séance. » inline; fill a slot → « Séance complète. »; sign in with the trainer account → chip « Vue coach · noms masqués » and « Membre n° XXXX » rows. Check at 390px width: rows keep 44px touch targets.

- [ ] **Step 7: Gates and commit**

```bash
pnpm check:design && pnpm typecheck && pnpm lint && pnpm test
pnpm exec prettier --write 'apps/owner/app/(app)/schedules/bookings-sheet.tsx' 'apps/owner/app/(app)/schedules/planning-utils.ts' 'apps/owner/app/(app)/schedules/slots-tab.tsx' apps/owner/lib/all-members.ts
git add 'apps/owner/app/(app)/schedules/bookings-sheet.tsx' 'apps/owner/app/(app)/schedules/planning-utils.ts' 'apps/owner/app/(app)/schedules/slots-tab.tsx' apps/owner/lib/all-members.ts
git commit -m "feat(owner): roster on SlotRosterEntry — pass holders, arrival line, coach view, inline add errors"
```

---

### Task 5: Instructor eligibility copy and resource-in-use dialog

**Files:**
- Modify: `apps/owner/app/(app)/schedules/schedule-dialogs.tsx` (both `onError` blocks)
- Modify: `apps/owner/app/(app)/venues/[id]/resource-dialogs.tsx` (`DeleteResourceDialog`)
- Modify: `apps/owner/app/(app)/venues/[id]/resources-section.tsx` (fetch schedules, pass them)

**Interfaces:** consumes `overrideFieldMessages`, `isResourceInUse`, `activeSchedulesUsing` (Task 1); keys `planning.form.instructorIneligible`, `venues.detail.resources.deleteDialog.inUse.*` (Task 2); `useListSchedules(venueId, { query: { select: unwrap } })`; `usePlanningLabels` from `@/app/(app)/schedules/planning-utils`.

- [ ] **Step 1: Instructor copy.** In both course dialogs:

```tsx
onError: (err) => {
  const mapped = overrideFieldMessages(err, { instructor_staff_id: t('form.instructorIneligible') });
  if (!applyFieldErrors(form, mapped)) {
    toast.error(apiErrorMessage(err, t('scheduleDialog.createError')));
  }
},
```

(and `updateError` for the edit dialog). The `Select` for `instructor_staff_id` already sits in a `FormField`, so the message renders under it in the error style (canvas `O4Q8d`).

- [ ] **Step 2: Resource-in-use dialog.** `DeleteResourceDialog` gains `schedules: Schedule[]` and a `blocked` state:

```tsx
const [blocked, setBlocked] = useState(false);
const { formatRecurrence } = usePlanningLabels();
const inUse = useMemo(() => activeSchedulesUsing(schedules, resource.id), [schedules, resource.id]);
const handleOpenChange = (next: boolean) => { if (!next) setBlocked(false); onOpenChange(next); };
…
onError: (err) => {
  if (isResourceInUse(err)) { setBlocked(true); return; }
  toast.error(apiErrorMessage(err, t('detail.resources.deleteDialog.error')));
},
```

Body when `blocked` (canvas `gLNNi`):

```tsx
<Alert variant="warning">
  <TriangleAlertIcon />
  <AlertDescription>
    <p>{t('detail.resources.deleteDialog.inUse.message')}</p>
    {inUse.length > 0 ? (
      <ul className="flex flex-col gap-1">
        {inUse.map((s) => <li key={s.id}>· {s.title} · {formatRecurrence(s.recurrence_rule)}</li>)}
      </ul>
    ) : null}
  </AlertDescription>
</Alert>
```

Footer when `blocked`:

```tsx
<DialogClose asChild><Button variant="ghost">{t('detail.resources.deleteDialog.inUse.close')}</Button></DialogClose>
<Button asChild variant="outline"><Link href="/schedules">{t('detail.resources.deleteDialog.inUse.viewCourses')}</Link></Button>
```

Use `Dialog open={open} onOpenChange={handleOpenChange}`. `Link` from `next/link`.

- [ ] **Step 3: Resources section.** Add `const schedulesQuery = useListSchedules(venueId, { query: { select: unwrap } });` and pass `schedules={schedulesQuery.data ?? []}` to `DeleteResourceDialog`.

- [ ] **Step 4: Drive on the mock**: « Ajouter un cours » with « Cheikh Fall » as instructor → field error « Cet intervenant n'a pas accès à cette salle. »; venue detail → delete « Salle Yoga » (used by the seeded courses) → blocked dialog listing the courses; « Voir les cours » lands on `/schedules`.

- [ ] **Step 5: Gates and commit**

```bash
pnpm check:design && pnpm typecheck && pnpm lint && pnpm test
pnpm exec prettier --write 'apps/owner/app/(app)/schedules/schedule-dialogs.tsx' 'apps/owner/app/(app)/venues/[id]/resource-dialogs.tsx' 'apps/owner/app/(app)/venues/[id]/resources-section.tsx'
git add 'apps/owner/app/(app)/schedules/schedule-dialogs.tsx' 'apps/owner/app/(app)/venues/[id]/resource-dialogs.tsx' 'apps/owner/app/(app)/venues/[id]/resources-section.tsx'
git commit -m "feat(owner): instructor eligibility copy and resource-in-use dialog"
```

---

### Task 6: Full gates, parity, build

**Files:** none new.

- [ ] **Step 1:** `pnpm check:design && pnpm typecheck && pnpm lint && pnpm test` from the repo root; parity one-liner → `parity ok`.
- [ ] **Step 2:** Orphan scan: for each key added in Task 2 and for `planning.deleteCourse.*`, `planning.cancelSlot.*`, grep `apps/owner` for its use; remove unused keys in both files with targeted edits (e.g. if `cancelSlot.description` stopped being used). `bookingSource.*` stays (member detail).
- [ ] **Step 3:** `pnpm build --filter @iziwellpass/owner --filter @iziwellpass/admin` — in a throwaway worktree if a dev server of this checkout is running.
- [ ] **Step 4:** Commit any orphan cleanup: `git commit -m "chore(owner): planning-contract message cleanup"`.
