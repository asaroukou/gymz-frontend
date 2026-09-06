# Front Desk Walk-in and Pass Check-in Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let the front desk admit members without a booking (by member or by walk-in QR) and marketplace pass-holders (by pass QR), by consuming the three unused check-in endpoints.

**Architecture:** A new pure module decodes the QR token's `kind` (readable base64url JSON) so one scan field routes to the right endpoint; a third tab adds walk-in by member. No API generation work — all three hooks already exist in `@iziwellpass/api`.

**Tech Stack:** Next 15, React 19, TanStack Query 5, react-hook-form + zod, next-intl, vitest.

**Spec:** `docs/superpowers/specs/2026-09-06-frontdesk-walkin-pass-design.md`

## Global Constraints

- Never hand-edit `packages/api/src/generated/**`.
- French-first i18n: every key exists in BOTH `apps/owner/messages/fr.json` and `en.json`, exactly.
- `verbatimModuleSyntax` (use `import type`) and `noUncheckedIndexedAccess` (guard indexed access) are on.
- `@iziwellpass/ui` subpath imports only (`@iziwellpass/ui/components/button`).
- Run prettier on every file you touch (`pnpm exec prettier --write <files>`).
- Shell paths containing `(` `)` `[` `]` must be wrapped in **single quotes**. Never backslash-escape them.
- Gates after each task, from the repo root: `pnpm build && pnpm typecheck && pnpm lint && pnpm test`.
- **Never run `pnpm build` while a dev server (`turbo run dev`) is up** — they share `.next/` and produce phantom failures.
- The QR field's rush-hour behaviour is load-bearing and must not regress: single autofocused input, in-flight submit guard (native Enter bypasses a disabled button), clear-and-refocus on success, keep-token-and-refocus on error.

## Reference: generated API (already exists — do not regenerate)

Verify names before use with:
`grep -n 'useCheckInWalkin\|useCheckInWalkinQr\|usePassCheckin' packages/api/src/generated/endpoints.ts | grep export`

All three are mutation hooks shaped exactly like the `useCheckInViaQr` already used in `register-panel.tsx` (`mutate({ data })`, `onSuccess` receives `ApiResponseCheckIn`):

| Hook | Payload | Notes |
|---|---|---|
| `useCheckInWalkin` | `{ member_id, venue_id }` | no capability gate (free tier OK) |
| `useCheckInWalkinQr` | `{ qr_token, venue_id }` | requires `QrCheckin` (starter+) |
| `usePassCheckin` | `{ qr_token }` | **no `venue_id`**; free tier OK |

All return `201` with `ApiResponseCheckIn`, whose `data.member_id` is nullable (null ⇒ pass-holder).

## File Structure

```
apps/owner/lib/qr-token.ts               ← Create (Task 1): pure decoder
apps/owner/lib/qr-token.test.ts          ← Create (Task 1): its tests
apps/owner/app/(app)/checkins/register-panel.tsx
                                         ← Modify (Task 2: QR routing; Task 3: walk-in tab)
apps/owner/messages/fr.json, en.json     ← Modify (Tasks 2, 3): new copy, parity enforced
```

---

### Task 1: The pure token decoder

**Files:**
- Create: `apps/owner/lib/qr-token.ts`
- Test: `apps/owner/lib/qr-token.test.ts`

**Interfaces:**
- Produces: `decodeQrToken(raw: string): DecodedQrToken | null`, `type QrTokenKind = 'booking' | 'walkin' | 'pass_booking'`, `interface DecodedQrToken { kind: QrTokenKind; venueId: string | null; expiresAt: number | null }`. Task 2 consumes all three.

**Background:** tokens are `iwp1.<base64url(json)>.<base64url(hmac)>`. The middle segment is base64url (no padding, `-`/`_` alphabet) JSON with `kind`, `tenant_id`, `venue_id`, `jti`, `iat`, `exp`, and `member_id` only on `walkin`. Decoding is **routing only, never a security check** — the client holds no key and the server verifies the MAC on every call.

- [ ] **Step 1: Write the failing tests**

Create `apps/owner/lib/qr-token.test.ts`:

```ts
import { describe, expect, it } from 'vitest';

import { decodeQrToken } from './qr-token';

/** Builds a token the way the backend does: iwp1.<b64url(json)>.<b64url(mac)>. */
function makeToken(payload: unknown, { prefix = 'iwp1', mac = 'c2ln' } = {}): string {
  const json = JSON.stringify(payload);
  const b64 = Buffer.from(json, 'utf8').toString('base64url');
  return `${prefix}.${b64}.${mac}`;
}

const BASE = {
  tenant_id: '11111111-1111-1111-1111-111111111111',
  venue_id: '22222222-2222-2222-2222-222222222222',
  jti: 'abc',
  iat: 1_757_000_000,
  exp: 1_757_000_300,
};

describe('decodeQrToken — the three kinds', () => {
  it('decodes a booking token', () => {
    const got = decodeQrToken(makeToken({ ...BASE, kind: 'booking', booking_id: 'b1' }));
    expect(got).toEqual({
      kind: 'booking',
      venueId: '22222222-2222-2222-2222-222222222222',
      expiresAt: 1_757_000_300,
    });
  });

  it('decodes a walkin token (which also carries member_id)', () => {
    const got = decodeQrToken(makeToken({ ...BASE, kind: 'walkin', member_id: 'm1' }));
    expect(got?.kind).toBe('walkin');
  });

  it('decodes a pass_booking token', () => {
    const got = decodeQrToken(makeToken({ ...BASE, kind: 'pass_booking', pass_booking_id: 'p1' }));
    expect(got?.kind).toBe('pass_booking');
  });
});

describe('decodeQrToken — returns null rather than guessing', () => {
  it('rejects a wrong version prefix', () => {
    expect(decodeQrToken(makeToken({ ...BASE, kind: 'booking' }, { prefix: 'iwp2' }))).toBeNull();
  });

  it('rejects a wrong segment count', () => {
    const b64 = Buffer.from(JSON.stringify({ ...BASE, kind: 'booking' })).toString('base64url');
    expect(decodeQrToken(`iwp1.${b64}`)).toBeNull();
    expect(decodeQrToken(`iwp1.${b64}.sig.extra`)).toBeNull();
  });

  it('rejects an unknown kind', () => {
    expect(decodeQrToken(makeToken({ ...BASE, kind: 'teleport' }))).toBeNull();
  });

  it('rejects a payload that is not JSON', () => {
    expect(decodeQrToken(`iwp1.${Buffer.from('not json').toString('base64url')}.sig`)).toBeNull();
  });

  it('rejects JSON that is not an object', () => {
    expect(decodeQrToken(makeToken('a string'))).toBeNull();
    expect(decodeQrToken(makeToken(42))).toBeNull();
    expect(decodeQrToken(makeToken(null))).toBeNull();
  });

  it('rejects a payload with no kind', () => {
    expect(decodeQrToken(makeToken({ ...BASE }))).toBeNull();
  });

  it('never throws on arbitrary input', () => {
    for (const bad of ['', '.', '..', 'iwp1..', 'iwp1.!!!!.sig', 'plain-text', 'iwp1.%%%.x']) {
      expect(() => decodeQrToken(bad), bad).not.toThrow();
      expect(decodeQrToken(bad), bad).toBeNull();
    }
  });
});

describe('decodeQrToken — optional fields', () => {
  it('yields null venueId/expiresAt when absent rather than undefined', () => {
    const got = decodeQrToken(makeToken({ kind: 'booking' }));
    expect(got).toEqual({ kind: 'booking', venueId: null, expiresAt: null });
  });

  it('ignores non-string venue_id and non-number exp', () => {
    const got = decodeQrToken(makeToken({ kind: 'booking', venue_id: 7, exp: 'soon' }));
    expect(got).toEqual({ kind: 'booking', venueId: null, expiresAt: null });
  });
});
```

- [ ] **Step 2: Run to verify it fails**

Run: `pnpm --filter @iziwellpass/owner test qr-token`
Expected: FAIL — cannot resolve `./qr-token`.

- [ ] **Step 3: Implement the decoder**

Create `apps/owner/lib/qr-token.ts`:

```ts
/**
 * Reads the *kind* out of a check-in QR token so the front desk can route one
 * scan to the right endpoint.
 *
 * Token format (see the API repo's `checkin/qr.rs`):
 *   iwp1.<base64url(json payload)>.<base64url(hmac)>
 *
 * The payload is not secret — only the MAC is — so a client can read it with
 * no key. THIS IS NOT A SECURITY CHECK: the signing key is derived from the
 * tenant AND the kind, and the server verifies the MAC on every call. Decoding
 * here only picks which endpoint to POST to; a forged or mislabelled token is
 * rejected server-side exactly as before.
 */

export type QrTokenKind = 'booking' | 'walkin' | 'pass_booking';

export interface DecodedQrToken {
  kind: QrTokenKind;
  /** Venue the token was minted for, when the payload names one. */
  venueId: string | null;
  /** Expiry in Unix seconds, when the payload carries one. */
  expiresAt: number | null;
}

const TOKEN_PREFIX = 'iwp1';
const KINDS: readonly string[] = ['booking', 'walkin', 'pass_booking'];

function decodeBase64Url(segment: string): string | null {
  try {
    const base64 = segment.replace(/-/g, '+').replace(/_/g, '/');
    const padded = base64.padEnd(Math.ceil(base64.length / 4) * 4, '=');
    // atob exists in browsers and in Node's global scope (>= 16).
    const binary = atob(padded);
    const bytes = Uint8Array.from(binary, (c) => c.charCodeAt(0));
    return new TextDecoder().decode(bytes);
  } catch {
    return null;
  }
}

/**
 * Returns null for anything not confidently decodable — callers must fall back
 * to the booking endpoint so an unknown future format still scans.
 */
export function decodeQrToken(raw: string): DecodedQrToken | null {
  const parts = raw.split('.');
  if (parts.length !== 3 || parts[0] !== TOKEN_PREFIX) {
    return null;
  }
  const payloadSegment = parts[1];
  if (!payloadSegment) {
    return null;
  }
  const json = decodeBase64Url(payloadSegment);
  if (json === null) {
    return null;
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(json);
  } catch {
    return null;
  }
  if (typeof parsed !== 'object' || parsed === null) {
    return null;
  }

  const payload = parsed as Record<string, unknown>;
  const kind = payload.kind;
  if (typeof kind !== 'string' || !KINDS.includes(kind)) {
    return null;
  }

  return {
    kind: kind as QrTokenKind,
    venueId: typeof payload.venue_id === 'string' ? payload.venue_id : null,
    expiresAt: typeof payload.exp === 'number' ? payload.exp : null,
  };
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `pnpm --filter @iziwellpass/owner test qr-token`
Expected: PASS, all cases.

Note: if `atob` is unavailable in the vitest environment, replace `decodeBase64Url`'s body with `Buffer.from(segment, 'base64url').toString('utf8')` wrapped in the same try/catch — but prefer `atob`, since this module runs in the browser. Verify whichever you choose against the tests.

- [ ] **Step 5: Run the gates and commit**

Run: `pnpm build && pnpm typecheck && pnpm lint && pnpm test`

```bash
git add apps/owner/lib/qr-token.ts apps/owner/lib/qr-token.test.ts
git commit -m "feat(owner): decode check-in QR token kind for scan routing"
```

---

### Task 2: Route the QR tab by token kind

**Files:**
- Modify: `'apps/owner/app/(app)/checkins/register-panel.tsx'` (the `QrForm` component, roughly lines 76–205)
- Modify: `apps/owner/messages/fr.json`, `apps/owner/messages/en.json`

**Interfaces:**
- Consumes: `decodeQrToken`, `DecodedQrToken` from `@/lib/qr-token` (Task 1).
- Produces: nothing new for Task 3; Task 3 adds a sibling component and a tab.

**What must not change:** the field stays a single autofocused input; the in-flight guard stays (native Enter bypasses the disabled button and a wedge scanner can double-fire); on success clear the field and refocus; on error keep the token visible and refocus.

- [ ] **Step 1: Add the two new mutation hooks**

In the import block at the top of the file, extend the existing generated import:

```ts
import {
  getGetAttendanceQueryKey,
  getListCheckInsQueryKey,
  useCheckInManual,
  useCheckInViaQr,
  useCheckInWalkinQr,
  usePassCheckin,
} from '@iziwellpass/api/generated';
```

Add the decoder import beside the existing `@/lib/api-error` import:

```ts
import { decodeQrToken } from '@/lib/qr-token';
```

- [ ] **Step 2: Instantiate the hooks and derive a combined pending flag**

Inside `QrForm`, next to `const checkInViaQr = useCheckInViaQr();`:

```ts
const checkInWalkinQr = useCheckInWalkinQr();
const passCheckin = usePassCheckin();

// One flag for the whole tab: whichever endpoint a scan routes to, the field
// and button must lock for the in-flight window.
const isPending = checkInViaQr.isPending || checkInWalkinQr.isPending || passCheckin.isPending;
```

Then replace every remaining `checkInViaQr.isPending` in this component's JSX and guards with `isPending`.

- [ ] **Step 3: Route the submit by decoded kind**

Replace `QrForm`'s `onSubmit` with:

```ts
const onSubmit = (values: QrValues) => {
  // Guard the rapid-Enter loop: native Enter bypasses the disabled button, so
  // a fast second Enter (or a wedge-scanner double-fire) would otherwise
  // re-submit the still-visible token during the in-flight window and trip a
  // spurious "already checked in" error right after the success.
  if (isPending) return;

  const token = values.qr_token;
  // Routing only — never a security decision. The payload is readable without
  // a key; the server still verifies the MAC under the kind+tenant key.
  const decoded = decodeQrToken(token);

  const handlers = {
    onSuccess: (res: ApiResponseCheckIn) => {
      checkinSuccessToast(t, tCommon, memberById, res.data.member_id);
      void queryClient.invalidateQueries({ queryKey: getListCheckInsQueryKey(venueId) });
      void queryClient.invalidateQueries({ queryKey: getGetAttendanceQueryKey(venueId) });
      // Clear + refocus for rapid repeated scanning at the door.
      form.reset({ qr_token: '' });
      inputRef.current?.focus();
    },
    onError: (err: unknown) => {
      if (!applyFieldErrors(form, err)) {
        toast.error(qrErrorMessage(t, err, decoded, venueId));
      }
      // Keep the token visible, but refocus so continued scanning doesn't
      // stall if a field error moved focus.
      inputRef.current?.focus();
    },
  };

  if (decoded?.kind === 'pass_booking') {
    // Marketplace pass token: venue-keyed, so it carries no venue_id of ours.
    passCheckin.mutate({ data: { qr_token: token } }, handlers);
    return;
  }
  if (decoded?.kind === 'walkin') {
    checkInWalkinQr.mutate({ data: { qr_token: token, venue_id: venueId } }, handlers);
    return;
  }
  // 'booking' — and every undecodable token. Falling back here (rather than
  // refusing) keeps a future token format working exactly as it does today;
  // the server produces the authoritative error.
  checkInViaQr.mutate({ data: { qr_token: token, venue_id: venueId } }, handlers);
};
```

Add the response type to the type-only import from the schemas package (create the import if absent):

```ts
import type { ApiResponseCheckIn, Member } from '@iziwellpass/api/schemas';
```

Verify that name first: `grep -n 'ApiResponseCheckIn' packages/api/src/generated/endpoints.schemas.ts | head -3`. If the generated name differs, use the real one.

- [ ] **Step 4: Add the error-enrichment helper**

Add above `QrForm` (below `checkinSuccessToast`):

```ts
/**
 * Explains a rejection the SERVER already made; never pre-empts the call.
 * A counter tablet with a skewed clock must not be able to refuse a valid
 * scan, so expiry is only ever used to phrase an error, not to skip a request.
 */
function qrErrorMessage(
  t: Translate,
  err: unknown,
  decoded: DecodedQrToken | null,
  venueId: string,
): string {
  if (decoded) {
    if (decoded.expiresAt !== null && decoded.expiresAt * 1000 < Date.now()) {
      return t('qr.errorExpired');
    }
    if (decoded.venueId !== null && decoded.venueId !== venueId) {
      return t('qr.errorWrongVenue');
    }
  }
  return apiErrorMessage(err, t('error'));
}
```

and extend the type import: `import { decodeQrToken, type DecodedQrToken } from '@/lib/qr-token';`

- [ ] **Step 5: Add the i18n keys to BOTH locale files**

Into `apps/owner/messages/fr.json` under `frontdesk.qr`:

```json
"errorExpired": "Ce code a expiré. Demandez au membre d'en générer un nouveau.",
"errorWrongVenue": "Ce code a été généré pour un autre établissement."
```

Into `apps/owner/messages/en.json` under `frontdesk.qr`:

```json
"errorExpired": "This code has expired. Ask the member to generate a new one.",
"errorWrongVenue": "This code was issued for a different venue."
```

Also update the QR tab hint to say it accepts every pass, in `fr.json` `frontdesk.qr.hint`:

```json
"hint": "Présentez le QR au lecteur, ou saisissez le jeton, puis validez. Réservations, entrées libres et pass marketplace sont acceptés."
```

and in `en.json`:

```json
"hint": "Scan the QR or type the token, then submit. Bookings, walk-ins, and marketplace passes are all accepted."
```

- [ ] **Step 6: Run the gates and commit**

Run: `pnpm build && pnpm typecheck && pnpm lint && pnpm test`
Expected: PASS. (No dev server running — see Global Constraints.)

```bash
git add 'apps/owner/app/(app)/checkins/register-panel.tsx' apps/owner/messages
git commit -m "feat(owner): route QR scans to walk-in and pass check-in by token kind"
```

---

### Task 3: The «Sans réservation» walk-in tab

**Files:**
- Modify: `'apps/owner/app/(app)/checkins/register-panel.tsx'` (new `WalkinForm` component + the `Tabs` block in `RegisterPanel`, roughly lines 324–378)
- Modify: `apps/owner/messages/fr.json`, `apps/owner/messages/en.json`

**Interfaces:**
- Consumes: `useCheckInWalkin` from `@iziwellpass/api/generated`; the file's existing `memberName`, `checkinSuccessToast`, `Translate`, and the `Member`/`QueryLike` types.
- Produces: nothing downstream — this is the last task.

**Model it on `ManualForm`** (same file): same `Combobox` usage, same `useMemo` member options, same invalidation and toast, same `h-11` control heights. The only differences are one field instead of two and a different endpoint.

- [ ] **Step 1: Write the `WalkinForm` component**

Add after `ManualForm` in the same file:

```tsx
interface WalkinValues {
  member_id: string;
}

function WalkinForm({
  venueId,
  members,
  memberById,
}: {
  venueId: string;
  members: Member[];
  memberById: Map<string, Member>;
}) {
  const t = useTranslations('frontdesk');
  const tCommon = useTranslations('common');
  const queryClient = useQueryClient();
  const checkInWalkin = useCheckInWalkin();

  const schema = useMemo(
    () => z.object({ member_id: z.string().min(1, t('validation.memberRequired')) }),
    [t],
  );

  const form = useForm<WalkinValues>({
    resolver: zodResolver(schema),
    defaultValues: { member_id: '' },
  });

  const memberOptions = useMemo(
    () => members.map((m) => ({ value: m.id, label: memberName(m) })),
    [members],
  );

  const onSubmit = (values: WalkinValues) => {
    // Same in-flight guard as the other tabs: native Enter bypasses a disabled
    // button, and a double check-in trips the dedupe 409.
    if (checkInWalkin.isPending) return;
    checkInWalkin.mutate(
      { data: { member_id: values.member_id, venue_id: venueId } },
      {
        onSuccess: (res) => {
          checkinSuccessToast(t, tCommon, memberById, res.data.member_id);
          void queryClient.invalidateQueries({ queryKey: getListCheckInsQueryKey(venueId) });
          void queryClient.invalidateQueries({ queryKey: getGetAttendanceQueryKey(venueId) });
          form.reset({ member_id: '' });
        },
        onError: (err) => {
          if (!applyFieldErrors(form, err)) {
            // 409 here means the member already walked in at this venue inside
            // the venue's dedupe window (walkin_dedupe_minutes, default 24h).
            // It is the error staff will hit most, so it gets its own copy
            // rather than the generic fallback.
            const fallback =
              err instanceof ApiError && err.status === 409 ? t('walkin.errorDuplicate') : t('error');
            toast.error(apiErrorMessage(err, fallback));
          }
        },
      },
    );
  };

  return (
    <Form {...form}>
      <form onSubmit={(e) => void form.handleSubmit(onSubmit)(e)} className="grid gap-4">
        <p className="text-sm text-muted-foreground">{t('walkin.hint')}</p>
        <FormField
          control={form.control}
          name="member_id"
          render={({ field }) => (
            <FormItem>
              <FormLabel>{t('walkin.member')}</FormLabel>
              <FormControl>
                <Combobox
                  options={memberOptions}
                  value={field.value || undefined}
                  onValueChange={field.onChange}
                  placeholder={t('walkin.memberPlaceholder')}
                  searchPlaceholder={t('walkin.memberSearch')}
                  emptyText={t('walkin.noMembers')}
                  disabled={checkInWalkin.isPending}
                  className="h-11"
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <Button type="submit" disabled={checkInWalkin.isPending} className="h-11 w-full">
          {checkInWalkin.isPending ? t('walkin.submitting') : t('walkin.submit')}
        </Button>
      </form>
    </Form>
  );
}
```

Extend the generated import with `useCheckInWalkin`, and import `ApiError` for the
409 check: `import { ApiError } from '@iziwellpass/api/client';` (verify it exposes a
numeric `status` with `grep -n 'status' packages/api/src/client.ts | head -5`).

- [ ] **Step 2: Add the third tab**

In `RegisterPanel`, change the tab list from two columns to three and add the content. The existing block uses `className="grid w-full grid-cols-2"` — change to `grid-cols-3` and add:

```tsx
<TabsTrigger value="walkin" className="h-11 lg:h-9">
  {t('register.tabWalkin')}
</TabsTrigger>
```

after the manual trigger, and after the manual `<TabsContent>`:

```tsx
<TabsContent value="walkin">
  {members.isLoading ? (
    <div className="space-y-4">
      <Skeleton className="h-11 w-full rounded-full" />
      <Skeleton className="h-11 w-full rounded-full" />
    </div>
  ) : members.isError ? (
    <Alert variant="destructive">
      <AlertTitle>{t('errorTitle')}</AlertTitle>
      <AlertDescription>
        {apiErrorMessage(members.error, t('manual.membersError'))}
      </AlertDescription>
    </Alert>
  ) : (
    <WalkinForm venueId={venueId} members={list} memberById={memberById} />
  )}
</TabsContent>
```

These are the real names in `RegisterPanel`: `members` is the `QueryLike<Member[]>` prop, `list` is `members.data ?? []`, and `memberById` is the map built from it. The loading/error branches mirror the manual tab deliberately — a members-fetch failure must not render an empty combobox that looks like "no members exist".

- [ ] **Step 3: Add the i18n keys to BOTH locale files**

`fr.json` — add `register.tabWalkin` and a `walkin` block under `frontdesk`:

```json
"tabWalkin": "Sans réservation"
```

```json
"walkin": {
  "hint": "Enregistrez un membre présent sans réservation.",
  "member": "Membre",
  "memberPlaceholder": "Rechercher un membre",
  "memberSearch": "Nom ou e-mail",
  "noMembers": "Aucun membre trouvé",
  "submit": "Enregistrer l'entrée",
  "submitting": "Enregistrement…",
  "errorDuplicate": "Ce membre a déjà été enregistré ici récemment."
}
```

`en.json` — the mirror:

```json
"tabWalkin": "No booking"
```

```json
"walkin": {
  "hint": "Check in a member who is here without a booking.",
  "member": "Member",
  "memberPlaceholder": "Search for a member",
  "memberSearch": "Name or email",
  "noMembers": "No member found",
  "submit": "Check in",
  "submitting": "Checking in…",
  "errorDuplicate": "This member was already checked in here recently."
}
```

- [ ] **Step 4: Run the gates and commit**

Run: `pnpm build && pnpm typecheck && pnpm lint && pnpm test`

```bash
git add 'apps/owner/app/(app)/checkins/register-panel.tsx' apps/owner/messages
git commit -m "feat(owner): check in members without a booking"
```

---

## Definition of Done

- Four gates green from the repo root.
- `decodeQrToken` unit tests cover all three kinds and every malformed shape without throwing.
- The QR tab still: autofocuses, guards double-submit, clears and refocuses on success, keeps the token and refocuses on error.
- Three tabs render; the walk-in tab checks a member in with no booking.
- **Human-run against staging** (needs a real member and a minted token): scan a booking QR, a walk-in QR, and a marketplace pass QR through the one field and confirm each is admitted and appears in the feed with the right label; check the same member in twice as a walk-in and confirm the dedupe 409 shows readable copy.
