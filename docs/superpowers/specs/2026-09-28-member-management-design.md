# SP-MM: Member management (directory search, app access, visits, sign-in policy, member e-mail confirmation)

**Date:** 2026-09-28
**Status:** approved design, ready for one plan
**Builds on:** local `main` at f5584af (SP-H merged: Phase 5A client, `member-errors`, `expected_version`, suspend/reactivate).
**Backend contract:** iziwellpass `main` b572a8b. The web client (`web/openapi.json`) is already byte-identical to its `docs/openapi.json`; no regeneration. Prose contract: `docs/client-integration.md`, sections « Annuaire des membres » to « Gestion des membres ».
**Design brief:** `docs/design-briefs/2026-09-28-member-management.md`.
**Canvas:** 45 frames in `screens.pen`, rows « Flux · 10 » to « Flux · 14 ». PNG exports and the verbatim copy live in `docs/design-refs/comptoir-clair/members/` (`INVENTORY.md` + `<frameId>.png`). **The inventory is the copy source**: every French string in this spec's screens comes from it verbatim, except the deltas in §9.

## 1. Purpose

The owner console still lists members client-side from `GET /members` and has no way to see or act on a member's app access. The backend now offers:
- server search;
- visit history;
- invitation resend;
- global sign-out;
- a secure sign-in e-mail change, completed by the member in the app;
- a tenant sign-in policy.

SP-MM implements the frames drawn for these, in the owner console and the member app.

## 2. Decisions

- **MM1: One pure account mapper.** `apps/owner/lib/member-account.ts` exports `describeAccount(account, { status, role, watched })`. `account` is `StaffMemberProfile['account']`; `watched` is the set of operation ids this page is following (MM3). It returns:
  - `badge: { labelKey, tone: 'success'|'info'|'neutral'|'outline'|'danger' }`, with an optional `spinner` flag for `pending`;
  - `lines: { key, tone: 'muted'|'danger' }[]`, the explanation under the « Accès » row;
  - `emailBadge`: `null` or the badge for `change_pending` / `change_failed`, plus its line;
  - `actions: ('resend'|'relaunch'|'changeEmail')[]`, empty for receptionists;
  - `canSignOut: boolean`;
  - `lastAction: { key, at } | null`;
  - `status: StatusRow | null`, where `StatusRow = { kind: 'progress'|'waiting'|'done'|'failed', key, at?, runningAction?: 'resend'|'relaunch'|'changeEmail'|'signOut' }`.

  Components render this output and nothing else. The mapping is the `WeVjb` board:
  - **Badges per invitation state:**

    | `account.invitation` | Badge | Tone | Actions (owner/admin) |
    | --- | --- | --- | --- |
    | `not_applicable` | « Sans app » | outline | none |
    | `pending` | « Création en cours » | neutral + spinner | none |
    | `sent` | « Invitation envoyée » | info | resend + changeEmail |
    | `linked_existing` | « Compte existant lié » | info | changeEmail |
    | `accepted` | « App activée » | success | changeEmail |
    | `untracked` | « Accès app » | neutral | resend + changeEmail |
    | `failed` | « Invitation échouée » | danger | relaunch |

  - **Failed invitation.** The lines are the `provisioning.failure_code` reason in danger, then « Corrigez l'adresse si besoin, puis relancez. ». An unknown code gets only the second line.
  - **Sign-out.** `canSignOut` is true for owner/admin when the invitation is `sent`, `linked_existing`, `accepted` or `untracked`.
- **MM2: « Dernière action ».**
  - It is the most recent of the four operations (`provisioning`, `invitation_resend`, `session_revocation`, `email_change`) by `updated_at` whose state is terminal (`completed`, `failed`, `expired`) or `pending_verification`.
  - The label depends on the operation kind and its outcome:

    | Kind | Outcome | Label |
    | --- | --- | --- |
    | provisioning | completed, `invitation_sent` | « Invitation envoyée le {date} à {time} » |
    | provisioning | completed, `existing_identity_linked` | « Compte existant lié le … » |
    | provisioning | failed | « Échec de création le … » |
    | invitation_resend | completed | « Invitation renvoyée le … » |
    | invitation_resend | failed | « Échec du renvoi le … » |
    | session_revocation | completed | « Déconnecté de tous les appareils le … » |
    | session_revocation | failed | « Échec de la déconnexion le … » |
    | email_change | pending_verification | « Changement demandé le … » |
    | email_change | completed | « Adresse modifiée le … » |
    | email_change | failed or expired | « Échec du changement d'adresse le … » |

  - Dates are `d MMM` (plus the year when it differs from the current year) and the time is `HH:mm`, both mono.
  - With no qualifying operation, the row is hidden (roster members never show it).
- **MM3: Following operations.**
  - The member page's `useGetMember` query refetches every 2 s while any of the four operations is `requested` or `dispatched`.
  - Polling stops after 30 s of continuous polling. The status row then reads « Toujours en cours. Cela peut prendre quelques minutes. » with the text button « Actualiser », which refetches and restarts a 30 s window.
  - `pending_verification` never polls.
  - The page keeps a `watched` set of operation ids:
    - the id returned by each 202;
    - any operation that was `requested`/`dispatched` when first seen.
  - The status row shows:
    1. **Progress:** the newest operation that is `requested`/`dispatched`, with the in-progress line for its kind (for `provisioning`, « Création de l'accès… »). The button that started it (`runningAction`) is disabled at 45 % opacity.
    2. **Waiting:** otherwise, an `email_change` in `pending_verification` (« Code envoyé à la nouvelle adresse. En attente de confirmation par le membre. »).
    3. **Done or failed:** otherwise, the newest *watched* operation that reached a terminal state, with its result line (MM4).
    4. **Nothing:** otherwise.
  - The same polling covers provisioning after a member is created, because the create flow leaves the user on the directory. The member page picks it up when opened.
- **MM4: Codes to copy.**
  - `apps/owner/lib/member-account-copy.ts` maps `(kind, state, result_code | failure_code)` to the result lines of the `WeVjb` « Résultats par action » column.
  - A resend `completed` whose invitation is now `accepted`, or a `failed` with `account_already_active`, reads « Ce membre a déjà activé son compte : rien n'a été envoyé. » in success tone.
  - Unknown codes fall back to the generic line of the action:

    | Action | Fallback |
    | --- | --- |
    | Resend | « L'invitation n'a pas pu être renvoyée. » |
    | Relaunch | the provisioning reason (MM1), else the resend fallback |
    | Change e-mail | « Le changement d'adresse n'a pas abouti. » |
    | Sign-out | « La déconnexion n'a pas abouti. » (§9) |
- **MM5: Error classifier grows.** `lib/member-errors.ts` (SP-H) gains these kinds, by `error.code`:
  - `accountAlreadyActive`
  - `loginNotAvailable`
  - `identityShared`
  - `notALoginMember`
  - `loginNotProvisioned`
  - `emailChangeInProgress`
  - `idempotencyInProgress`
  - `featureNotAvailable`
  - `validation` (400 `VALIDATION_ERROR`, with `field` from `details` when present)

  The existing kinds are unchanged. `duplicate` stays 409 `CONFLICT`.
- **MM6: Actions.** All actions are owner/admin only; the controls are hidden for other roles.
  - **Resend / relaunch** (`ResendInvitationDialog`, `mode: 'resend'|'relaunch'`):
    - Calls `POST …/invitation-resend`.
    - A 202 closes the dialog, adds the returned id to `watched`, and invalidates the member.
    - A 409 keeps the dialog open with an error alert and disables the confirm:
      - `LOGIN_NOT_AVAILABLE` → the `L8mxU` copy, with the link « Ouvrir les réglages » to `/settings`;
      - `CONFLICT` → « Cette adresse est déjà utilisée par un autre membre. »;
      - `ACCOUNT_ALREADY_ACTIVE` → the already-active line, and invalidate;
      - `IDENTITY_SHARED` → the shared line.
  - **Change e-mail** (`ChangeEmailDialog`):
    - An `Idempotency-Key` UUID is created when the dialog opens. It is reused while the typed address is unchanged and regenerated when the address changes.
    - Client checks: the address is trimmed, case-insensitive equal to the current one → « C'est déjà l'adresse actuelle. »; a basic format check → « Adresse e-mail invalide. ».
    - A 202 closes the dialog, shows the toast « Code envoyé à {adresse} », adds the id to `watched`, and invalidates. The new address is shown nowhere else and never stored.
    - The inline 409/400 errors are those listed in `OXBVd`.
  - **Sign out everywhere** (`SignOutEverywhereDialog`):
    - Calls `POST …/session-revocation`.
    - A 202 closes the dialog, watches the operation, and invalidates.
    - 409 errors show inline (`IDENTITY_SHARED`, `LOGIN_NOT_PROVISIONED`).
  - All three map 403 to « Accès refusé » and anything else to the generic line of the action.
- **MM7: Directory on search.** `members-directory.tsx` drops client-side filtering and the numbered pager.
  - A new hook `useMemberSearch({ scope, venueId, status, q })` wraps the generated `searchMembers` fetcher in `useInfiniteQuery`:
    - the query key is `['members','search',scope,venueId,status,q]`;
    - each page requests `limit: 20` and the cursor from `meta.next_cursor`;
    - `placeholderData` keeps the previous data while typing.
  - `q` is trimmed, debounced by 250 ms, and omitted when blank; the input has `maxLength=100`.
  - Scope:
    - `'venue'` (default) sends `venue_id` = the selected venue;
    - `'all'` sends `all_venues: true`.
    - The scope select shows only for owner/admin with 2 or more venues.
  - Status tabs are `all`, `active`, `expired`, `suspended`; « Annulés » is removed.
  - The subtitle is the selected venue name, or « Tous les établissements » in `'all'` scope.
  - « Afficher plus » (full width on phone) fetches the next page; it has a spinner while fetching and hides when there is no cursor.
  - States follow the frames:

    | State | Frame | Notes |
    | --- | --- | --- |
    | Searching | `ZInet` | Spinner and a clear button in the field |
    | No match | `F7kU0F` | « Effacer la recherche » |
    | Empty tab | `rgAty` | One line per status |
    | First member | `cKk1G` | Only when the tab is « Tous », `q` is empty and page 1 is empty; the toolbar and the header button are hidden |
    | Loading | `Cl2bM` | |
    | Error | `b9IMGN` | |
    | Loading more | `ab1dg` | |
    | Phone | `f0WPx` | |

  - Create, suspend and reactivate invalidate `['members','search']` (plus the existing keys).
  - `useAllMembers` stays for the dashboard count and the member pickers.
- **MM8: Add member follows the policy.**
  - Owner/admin read `GET /tenant/settings` (a query enabled only for those roles). They see:
    - the hint with its icon (`smartphone` for `effective_mode = login`, `file-text` for roster);
    - the e-mail label and helper for that mode;
    - an e-mail required in login mode (client validation « L'e-mail est obligatoire : ce club donne accès à l'app à ses membres. »).
  - Receptionists see no hint and the plain « E-mail » label. A 400 `VALIDATION_ERROR` on `email` maps to the same « obligatoire » message. « Accès aux établissements » is a read-only locked line with the selected venue, and the payload is `access_scope: 'venue_scoped', venue_ids: [selectedVenueId]`.
  - A 409 duplicate shows « Un membre utilise déjà cette adresse. » under the e-mail field.
  - The toast depends on the response's `effective_mode`: « Membre ajouté » (roster) or « Membre ajouté. Envoi de l'invitation… » (login). This holds for « Ajouter et enchaîner » too.
- **MM9: Member page layout.**
  - **Header:** the account badge follows the access badge. Under the top-right e-mail, « Changement d'adresse en attente » appears when `account.email === 'change_pending'`.
  - **Edit form:**
    - A login e-mail renders as the read-only field: `bg-side` fill, muted value, a 16 px `LockIcon` on the right, and the helper « Adresse de connexion : elle se change par une procédure sécurisée. ». Owner/admin also get the underlined link « Changer l'adresse de connexion », which opens `ChangeEmailDialog`.
    - With `invitation === 'failed'` the field is editable, with the helper « Corrigez l'adresse si besoin, enregistrez, puis relancez la création de l'accès. ».
    - SP-H's `emailLocked` rule is unchanged; this replaces SP-H's interim hint.
  - **`AccountSection`** (right column, after the form): the title and subtitle, then key/value rows with hairlines:
    - « Accès » with its badge and lines;
    - « Adresse de connexion » (login members) with the `emailBadge`;
    - « Dernière action »;

    then the action pills (outline), then the status row. Receptionists get the rows, no buttons, and the `shield` line.
  - **Zone sensible:** the lifecycle button (SP-H), then « Déconnecter de tous les appareils » (outline pill, danger label, `LogOutIcon`) when `canSignOut`, stacked vertically. The zone renders for owner/admin/receptionist as today; the sign-out button only for owner/admin.
  - **Phone order** (`TOqY8`): Adhésion, Abonnements, Présences, Modifier le membre, Accès à l'app, Zone sensible.
- **MM10: Présences.**
  - `AttendanceSection` in the left column after Abonnements.
  - `useInfiniteQuery` on the generated `memberAttendance`:
    - the first page sends `from`, `to` and `venue_id` (when a venue is picked), plus `limit: 20`;
    - later pages send only `cursor` and `limit`;
    - `to` is taken once when the period or venue changes (rounded down to the minute), and `from = to - N days`.
  - Period pills are 7, 30 and 90 days (default 30).
  - The venue select (« Tous les établissements » + each venue) shows only when `useVenueContext().venues.length >= 2`. It lists the venues the viewer can see; the backend already scopes a receptionist's list.
  - Pure helpers in `lib/attendance.ts`:
    - `summaryParts(total, days, lastVisitAt, now)` produces « {n} passage(s) sur {days} jours » and « Dernier passage aujourd'hui à HH:mm » / « hier à HH:mm » / « le d MMM yyyy » (no last-visit part when null);
    - `methodBadge(method)`: `qr` → info « QR », `manual` → neutral « Manuel », `wallet` → outline « Wallet »;
    - `kindLabel(kind)`: « Réservation » / « Sans réservation ».
  - Venue names show on rows only when the select is visible.
  - The six states of `Z9CwGl` are implemented.
- **MM11: Réglages page.**
  - New `/settings` route and nav item `{ labelKey: 'settings', href: '/settings', roles: ['owner','admin'], scope: 'org' }` with `Settings2Icon`, last in « Organisation ».
  - **Connexion des membres.** A radio group built from native `<input type="radio">` inside hairline rows; the selected row sits on the grey pill. « Enregistrer » is enabled only when the selection differs from `configured_mode`; it calls `PATCH { member_login_mode }` and shows the toast « Réglage enregistré ». A pure `settingsView(policy, selection)` returns `{ locked, downgraded, dirty }`:

    | Condition | Result | Frame |
    | --- | --- | --- |
    | `configured_mode = 'login'` and `downgrade_reason` set | `downgraded`: warning alert + tag « Inactif avec votre plan » | `L7nrt` |
    | `capability_available = false` and `configured_mode = 'roster'` | `locked`: « Avec l'app » disabled with a lock and « Disponible avec le plan Starter » + « Voir les plans » | `I2dKEo` |
    | 403 `FEATURE_NOT_AVAILABLE` on save | inline error | `GD3ef` |
    | Loading | skeleton | `MGrdU` |
    | Load error | error | `dkkTG` |

  - **Sécurité.** The « Double authentification » row shows « Activée » (success badge) when the session's `mfaEnrolled` is true; otherwise « Désactivée » with the outline « Activer » linking to `/mfa`.
- **MM12: MFA claim.** `SessionClaims` (`packages/auth/src/claims.ts`) gains `mfaEnrolled: boolean`, true when the ID token carries a non-empty `mfa_enrolled_at` claim. The offline mock issues it for enrolled sessions, as SP-F already does.
- **MM13: Member app e-mail confirmation.**
  - **Auth client.** `MemberAuthClient` gains `verifyEmailCode(code: string): Promise<void>` and `resendEmailCode(): Promise<void>`. On the current session user they call `verifyAttribute('email', code, …)` and `getAttributeVerificationCode('email', …)`. The member mock wrapper implements them:
    - `123456` succeeds;
    - `000000` → `ExpiredCodeException`;
    - `111111` → `AliasExistsException`;
    - `999999` → `LimitExceededException`;
    - anything else → `CodeMismatchException`;
    - resend always succeeds.
  - The app never calls `UpdateUserAttributes`.
  - `lib/email-change.ts` (pure) exports `classifyCodeError(err)`, which returns one of `mismatch`, `expired`, `tooMany`, `aliasExists`, `network` or `other`. `other` shows the network line.
  - **Carte** (`c4qkl7`). When `GET /me` returns `pending_email_change`, the banner (grey pill, `Mail` icon, chevron) sits between the greeting and the pass and links to `/email-change`. The QR and bookings are unchanged.
  - **`app/(app)/email-change.tsx`.** A stack screen without a tab (`href: null` in the tab layout):
    - a 6-box code input (one hidden `TextInput`, `keyboardType="number-pad"`, `textContentType="oneTimeCode"`, `maxLength=6`, 56 px boxes, focus stroke on the next box);
    - « Confirmer » is disabled until 6 digits are entered;
    - « Renvoyer le code » runs a 60 s countdown (« Renvoyer le code (0:45) ») that starts when the screen opens, because the backend just sent one;
    - « Plus tard » goes back.
  - **Confirm flow:**
    1. `verifyEmailCode` runs; a failure shows the inline error for its class. `aliasExists` switches to the `QR7n0` terminal state (only « Retour »).
    2. `POST /me/email-change/confirm` (with the venue selector like other `/me` calls) runs:
       - 200 → success state (`F95Y7E`);
       - 409 `NO_EMAIL_CHANGE_PENDING` → the expired state (`plDHB`);
       - 409 `EMAIL_NOT_VERIFIED` or a network error → « Connexion impossible. Réessayez. ».
  - Success « Se reconnecter » calls `signOut()` (no session-ended notice) and lands on login.
- **MM14: Session-ended notice.**
  - The member auth reducer's `signed-out` action takes an optional `reason: 'session-ended'`. `onUnauthorized` passes it when the forced refresh fails; the user's own sign-out and the MM13 success do not.
  - The login screen shows the neutral notice « Votre session a pris fin. Reconnectez-vous. » above the e-mail field (`o5BPGj`) while the reason is set, and clears it on the next successful sign-in.
- **MM15: Owner mock server.** `apps/owner/scripts/mock-server.mjs` gains the new routes and demo hooks, all listed in its header comment.
  - **`POST /gms/v1/members/search`:**
    - body validation (exactly one scope; unknown fields → 400);
    - `q` is case-insensitive across first name, last name, full name, e-mail and phone;
    - statuses are exact, and cancelled members are never listed;
    - opaque cursor, `limit` default 20;
    - venue scoping uses `venue_ids`/`access_scope`.
  - The seed grows from 12 to at least 24 non-cancelled members (new ids from `mbr-13`), so « Tous » has 2 pages.
  - **`GET /gms/v1/members/{mid}/attendance`:** about 90 days of seeded visits for most members over 2 venues and the 3 methods (booked and walk-in), with range validation (≤ 366 days, `from` < `to`), `venue_id`, a cursor, `total_visits` and `last_visit_at`. `mbr-02` has visits all period; one member only has visits older than 30 days (empty-period state); one never visited.
  - **Operations:**
    - `POST …/invitation-resend`, `…/session-revocation` and `…/email-change` (400 without `Idempotency-Key`; same-key replays return the stored 202) create an operation.
    - An operation is `requested`, becomes `dispatched` 1 s later, and reaches its terminal state 4 s after creation. Transitions are evaluated on read.
    - Profiles return full `account` objects with the four operations.
  - **Demo members:**

    | Member | Account state |
    | --- | --- |
    | `mbr-01` | `sent` |
    | `mbr-02` | `accepted` |
    | `mbr-03` | roster |
    | `mbr-04` | `linked_existing` |
    | `mbr-08` | `untracked` |
    | `mbr-10` | e-mail `change_pending`, with an `email_change` in `pending_verification` |
    | `mbr-12` | `failed` / `invalid_email` |
    | `mbr-13` | resend never leaves `dispatched` (« Toujours en cours ») |
    | `mbr-14` | 409 `IDENTITY_SHARED` on resend, sign-out and e-mail change |

    An e-mail change to an address starting with `pris@` fails with `email_unavailable`.
  - **Tenant settings.** `GET`/`PATCH /gms/v1/tenant/settings` hold state. The default is configured `login`. `effective_mode` and `capability_available` follow `MOCK_PLAN` (`member_self_service` in starter/pro/enterprise). `PATCH` to `login` without the capability → 403 `FEATURE_NOT_AVAILABLE`. `MOCK_LOGIN_MODE=roster` changes the starting configuration.
  - **Member creation** follows the effective mode:
    - login without an e-mail → 400 `VALIDATION_ERROR` on `email`;
    - login with an e-mail → `effective_mode: 'login'` and a `provisioning` operation that ends `completed`/`invitation_sent`.
  - Existing demo hooks keep working. Where a new demo member collides with an existing hook, the plan picks another free id and records it.
- **MM16: Member mock server.** `apps/member/scripts/mock-server.mjs`:
  - `MOCK_EMAIL_CHANGE=pending|expired` sets `pending_email_change: true` on `GET /me`.
  - `POST /gms/v1/me/email-change/confirm` answers 200 `{ state: 'verified' }` (pending) or 409 `NO_EMAIL_CHANGE_PENDING` (expired); without the variable it answers 409 `NO_EMAIL_CHANGE_PENDING`.

## 3. Deviations from the canvas (rulings)

- **Mobile dialogs stay centred.** `s3tkfq` draws a bottom sheet. `packages/ui` `Dialog` is centred with stacked full-width buttons on phone, and adding a sheet variant is out of scope. The copy and button order follow the frame.
- **No « Invitation acceptée le … ».** `caWdo`'s « Dernière action » reads « Invitation acceptée le 3 mars à 10:12 », but the API has no acceptance timestamp. The row shows the latest operation per MM2.
- **Neutral copy** (user decision, §9).

## 4. Out of scope

- the dashboard's member count (keeps `useAllMembers`);
- converting a roster member to login (no route);
- cancelling a pending e-mail change (no route);
- turning MFA off;
- a bottom-sheet dialog variant;
- any test against real Cognito.

## 5. Files

**Owner, new:**
- `lib/member-account.ts`
- `lib/member-account-copy.ts`
- `lib/member-search-query.ts` (the request builder and `useMemberSearch`)
- `lib/attendance.ts`
- `lib/settings-view.ts`
- `app/(app)/members/[id]/account-section.tsx`
- `resend-invitation-dialog.tsx`
- `change-email-dialog.tsx`
- `sign-out-everywhere-dialog.tsx`
- `attendance-section.tsx`
- `app/(app)/settings/page.tsx` (+ its parts)

**Owner, changed:**
- `lib/member-errors.ts`
- `lib/nav.ts` + the sidebar icon map
- `members/page.tsx`
- `members-directory.tsx`
- `add-member-dialog.tsx`
- `[id]/page.tsx`
- `member-header.tsx`
- `edit-member-form.tsx`
- `danger-zone.tsx`
- `messages/{fr,en}.json`
- `scripts/mock-server.mjs`

**Auth:** `packages/auth/src/claims.ts` (+ `mock.ts` if the claim needs seeding).

**Member app:**
- `lib/auth/cognito.ts`
- `lib/auth/member-mock.ts`
- `lib/auth/session.ts`
- `lib/auth/context.tsx`
- `lib/email-change.ts`
- `app/(app)/index.tsx`
- `app/(app)/_layout.tsx`
- `app/(app)/email-change.tsx`
- `app/(auth)/login.tsx`
- a code-input component
- i18n strings
- `scripts/mock-server.mjs`

## 6. Testing and verification

**Unit (vitest):**
- `describeAccount`: every invitation state × role, e-mail states, `canSignOut`, `lastAction` choice and labels, and the status priority (progress > waiting > watched terminal > none), including the relaunch that returns a `provisioning` operation;
- `member-account-copy`: every known code and the fallbacks;
- `member-errors`: each new kind and a malformed `details`;
- the search request builder: scope, status, `q` trim/blank, cursor;
- `attendance`: summary (0/1/n, today/yesterday/older/null, pluralisation), badges, labels;
- `settingsView`: normal, downgraded, locked, dirty;
- `parseClaims`: `mfaEnrolled`;
- member app: `classifyCodeError`, the session reducer's `reason`, the countdown formatting.

**Gates:** `pnpm typecheck && pnpm lint && pnpm test` at the root; the owner `next build` (never while a dev server of the same checkout runs).

**Browser pass against the PNGs:**
- Owner app at 1440×900 and 390×844 on the mock server with offline auth. Every directory state; the add form as owner (login and roster) and as receptionist; each demo member's account state; each dialog with a success and a refusal; « Toujours en cours » on `mbr-13`; Présences states; Réglages with `MOCK_PLAN=pro`, `free`, and a downgraded setup.
- Member app on Expo web at 390×844 with `MOCK_EMAIL_CHANGE`: the banner, each code error, the expired state, success then re-login, and the session-ended notice.
- Dev servers use ports of their own, never 8090, 3011 or 8082.

## 7. Risks

- **Polling cost.** A 2 s refetch while an operation runs, capped at 30 s per window; only on the open member page.
- **Receptionist venue list.** The Présences venue select and the add form rely on `listVenues` being scoped by the backend for receptionists (true today). If it is not, the backend still answers 403 on a foreign venue, which shows the section's error state.
- **Cognito attribute verification on web.** `verifyAttribute` needs a valid access token; the session is refreshed first via `getSession`. Real-Cognito behaviour is checked manually by the user, not in this project.

## 8. Order of work (for the plan)

1. Shared libraries: `member-errors` kinds, `member-account` + copy, the `mfaEnrolled` claim.
2. Owner mock server: search, attendance, operations, settings, demo members.
3. Directory on search.
4. Add member with policy.
5. Member page: account section, header, form, zone sensible.
6. Account dialogs and operation following.
7. Présences.
8. Réglages + nav.
9. Member app: auth calls, mock, email-change screen, banner, session-ended notice.

## 9. Copy deltas from `INVENTORY.md`

| Where | Canvas | Ships |
| --- | --- | --- |
| `eLtfl` / `s3tkfq` text | « Il devra se reconnecter avec son mot de passe. L'effet peut prendre jusqu'à 10 minutes. » | « Une nouvelle connexion avec le mot de passe sera nécessaire. L'effet peut prendre jusqu'à 10 minutes. » |
| `F95Y7E` text | « Pour votre sécurité, vous allez être déconnecté. Reconnectez-vous avec votre nouvelle adresse. » | « Pour votre sécurité, votre session va se fermer. Reconnectez-vous avec votre nouvelle adresse. » |
| `caWdo` « Dernière action » | « Invitation acceptée le 3 mars à 10:12 » | the latest operation's label (MM2) |
| Sign-out generic failure | not drawn | « La déconnexion n'a pas abouti. » |
| « Dernière action » labels other than those drawn | not drawn | the MM2 table |

English strings mirror the French ones in `messages/en.json` (owner) and the member app's i18n. The owner app's locale stays fixed to `fr`.
