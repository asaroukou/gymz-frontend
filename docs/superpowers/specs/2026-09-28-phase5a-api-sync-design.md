# SP-H — Phase 5A API sync and repairs

**Date:** 2026-09-28
**Status:** approved design, ready for one plan
**Builds on:** local `main` at d626483 (SP-F merged).
**Backend contract:** iziwellpass `main` b572a8b (« Phase 5A: Venue Console Member Management », slices 1–11). Source of `openapi.json`: the backend's `docs/openapi.json` at that commit (`cargo run -p iziwellpass-openapi --bin gen` writes it; 88 paths). Prose contract: `docs/client-integration.md` § « Gestion des membres (console) : changements de contrat Phase 5A ».
**Canvas:** no new frames. The member page is `L6sMyP` (Membre · Fiche); its « Zone sensible » already draws « Suspendre le membre » and « Réactiver ».

## 1. Purpose

The backend's Phase 5A changed the staff member contract. The owner app no longer compiles against it, and several screens would misbehave against the real API:

- `Member` → `StaffMemberView` (no `user_id`, new `version`); `MemberSubscription` → `StaffSubscriptionView` (adds `plan_name`, `plan_kind`, `venue_name`, `assigned_by_name`; drops `assigned_by`).
- `PUT /gms/v1/members/{mid}` rejects unknown fields with 400. The edit form's « Actif / Inactif » toggle sends `is_active`, which was always ignored and now fails every edit.
- Changing a login member's e-mail through that route is a 409 `LOGIN_EMAIL_REQUIRES_SECURE_CHANGE`.
- Suspend answers 204 (no body) and 409 `INVALID_LIFECYCLE_TRANSITION` when the member is not active.
- `PUT /members/{mid}/venues` can answer 409 `ACCESS_DOWNSCOPE_BLOCKED` with `details.affected_venues`.
- Check-in `method` gains `wallet`.
- `GET /members/{mid}` returns `StaffMemberProfile` (member + `access` + `account`); `POST /members` returns `MemberCreatedResponse` (member + `effective_mode` + `provisioning`).

SP-H syncs the client, repairs the owner app, and adds two small related items the user chose: optimistic concurrency on member edits, and a working « Réactiver ».

## 2. Decisions

- **H1 — Contract source.** `web/openapi.json` is replaced by the backend's generated `docs/openapi.json` at b572a8b, byte for byte; the client is regenerated with the existing orval config. `check-freshness` must pass. No hand edits to generated files.
- **H2 — Mechanical renames.** Every owner import of `Member`, `MemberSubscription` and `PaginatedApiResponseVecMember` moves to `StaffMemberView`, `StaffSubscriptionView` and `PaginatedApiResponseVecStaffMemberView`. Code that read `user_id` or `assigned_by` stops (none is expected; the plan confirms by grep). The member and admin apps compile unchanged against the new client (verified on a scratch regeneration) and are not modified.
- **H3 — No lifecycle through the edit form.** The « Actif / Inactif » field is removed from the edit form, its schema and its payload. Lifecycle changes live only in the danger zone (suspend, reactivate).
- **H4 — Login e-mail locked.** The member page reads `account.mode` from `StaffMemberProfile`. For `login` members the e-mail field is read-only with the hint below it, and the update payload never includes `email`. `roster` members edit their e-mail as today. A 409 `LOGIN_EMAIL_REQUIRES_SECURE_CHANGE` is still mapped (safety net) to the same hint as an error.
- **H5 — Optimistic concurrency.** Member edit (`PUT /members/{mid}`), access scope (`PUT /members/{mid}/access`) and venues (`PUT /members/{mid}/venues`) send `expected_version` = the `version` of the member as last loaded, verbatim. On 409 `VERSION_MISMATCH`: invalidate and refetch the member; keep the user's input (form values, dialog selections); show the warning Alert « Ce membre a été modifié entre-temps. Vérifiez puis enregistrez à nouveau. »; the next save uses the refetched `version`. The Alert clears on the next successful save or on close.
- **H6 — Suspend.** Success is the 204 (the mutation resolves `undefined`; nothing reads a body). 409 `INVALID_LIFECYCLE_TRANSITION` → toast « Ce membre n'est plus actif. » and refetch the member and the list.
- **H7 — Réactiver.** The danger zone's disabled « Réactiver » (with its « bientôt disponible » tooltip) becomes a real button opening a confirm dialog shaped like the suspend dialog, calling `PUT /members/{mid}/reactivate` (204). Enabled only when `status === 'suspended'`; « Suspendre le membre » enabled only when `status === 'active'`. 409 → toast « Ce membre n'est plus suspendu. » and refetch. Success → toast « Membre réactivé », refetch member and list. Receptionists see what the backend allows (same permission as suspend); a 403 uses the existing « Accès refusé » handling.
- **H8 — Down-scope blocked.** In the access dialog, a 409 `ACCESS_DOWNSCOPE_BLOCKED` shows, inline above the actions, « Impossible de retirer ces salles : des réservations à venir y sont encore prévues. » and one line per affected venue « {venue} · {n} réservation(s) à venir » (venue name from the tenant's venues list; unknown id → « Salle inconnue »). Nothing is saved; the dialog stays open with the user's selection.
- **H9 — Subscriptions show backend names.** The subscriptions section displays `plan_name` and `venue_name` from each `StaffSubscriptionView` and drops its client-side plan lookup.
- **H10 — Wallet check-ins.** `CheckInMethod.wallet` renders « Wallet » in the check-in feed (no icon change beyond what `manual`/`qr` use today; the plan picks Lucide `WalletIcon` at stroke 1.5).
- **H11 — One error classifier.** A pure `lib/member-errors.ts` maps an `ApiError` to `{ kind: 'versionMismatch' } | { kind: 'invalidLifecycle'; currentStatus?: string } | { kind: 'downscopeBlocked'; affected: { venueId: string; futureBookings: number }[] } | { kind: 'loginEmailLocked' } | { kind: 'duplicate' } | { kind: 'other' }` by `error.code` (and 409 `CONFLICT` for duplicates). Malformed `details` degrade to the kind without details. Screens decide presentation only.
- **H12 — Mock mirrors the contract.** `apps/owner/scripts/mock-server.mjs`: members carry `version` (updated on every write) and no `user_id`; `GET /members/{mid}` returns the profile (`access`, `account` with `mode` `login` or `roster`); `PUT /members/{mid}` rejects unknown fields (incl. `is_active`) with 400, rejects an e-mail change for login members with 409 `LOGIN_EMAIL_REQUIRES_SECURE_CHANGE`, honours `expected_version`; suspend and reactivate answer 204 or 409 `INVALID_LIFECYCLE_TRANSITION` with `details.current_status`; `PUT /members/{mid}/access` and `/venues` honour `expected_version`; a demo member conflicts once on its first versioned write; a demo member with future bookings at venue 2 blocks narrowing to venue 1 with `ACCESS_DOWNSCOPE_BLOCKED`; subscriptions carry `plan_name`, `plan_kind`, `venue_name`, `assigned_by_name`; one seeded check-in has `method: 'wallet'`. The header comment lists the demo hooks.

## 3. Out of scope

The new routes (member search, invitation resend, session revocation, secure e-mail change, attendance, member venues read, tenant settings and login policy), the account-state display (invitation/e-mail badges), provisioning polling after create, and the member app's `pending_email_change` / e-mail confirmation screen. They form the next sub-project (« member management »), which needs canvas frames.

## 4. Copy

| Key (owner `members.*`) | fr | en |
| --- | --- | --- |
| `detail.edit.emailLockedHint` | Adresse de connexion : elle se change par une procédure sécurisée, bientôt disponible ici. | Sign-in address: it changes through a secure procedure, coming here soon. |
| `detail.versionConflict` | Ce membre a été modifié entre-temps. Vérifiez puis enregistrez à nouveau. | This member was changed in the meantime. Check, then save again. |
| `detail.suspendDialog.notActive` | Ce membre n'est plus actif. | This member is no longer active. |
| `detail.reactivateDialog.title` | Réactiver ce membre ? | Reactivate this member? |
| `detail.reactivateDialog.description` | {name} retrouvera l'accès à ses salles et pourra de nouveau réserver. | {name} will get access to their venues back and can book again. |
| `detail.reactivateDialog.confirm` / `confirming` | Réactiver / Réactivation… | Reactivate / Reactivating… |
| `detail.reactivateDialog.cancel` | Annuler | Cancel |
| `detail.reactivateDialog.success` | Membre réactivé | Member reactivated |
| `detail.reactivateDialog.notSuspended` | Ce membre n'est plus suspendu. | This member is no longer suspended. |
| `detail.reactivateDialog.error` | Impossible de réactiver ce membre. | Couldn't reactivate this member. |
| `detail.access.downscopeBlocked` | Impossible de retirer ces salles : des réservations à venir y sont encore prévues. | These venues can't be removed: upcoming bookings are still planned there. |
| `detail.access.downscopeVenue` | {venue} · {count, plural, one {# réservation à venir} other {# réservations à venir}} | {venue} · {count, plural, one {# upcoming booking} other {# upcoming bookings}} |
| `detail.access.unknownVenue` | Salle inconnue | Unknown venue |
| check-in `feed.methodWallet` | Wallet | Wallet |

Existing key `detail.danger.reactivateSoon` is removed. Exact key paths follow the owner message files' existing nesting; the plan fixes them.

## 5. Testing and verification

**Unit (vitest, owner node environment):** `member-errors` (each code, missing/malformed details, non-ApiError); a pure `buildMemberUpdate(values, { mode, version })` (never `is_active`, no `email` for login members, `expected_version` present); `downscopeLines(affected, venues)` (names, unknown venue fallback, order kept); updated `member-status` and `member-search` tests on `StaffMemberView`.

**Gates:** `pnpm typecheck && pnpm lint && pnpm test` (all packages; `check-freshness` green), owner `next build`.

**Browser (mock API + offline auth, 390×844 and 1440×900):** edit a roster member (saves); edit a login member (e-mail locked with hint, save succeeds); the conflict demo member (notice, edits kept, second save succeeds); suspend then reactivate a member (buttons swap); suspend an already-suspended member (409 message); narrow the blocked demo member's venues (venue list shown, nothing saved); subscriptions show plan and venue names; the wallet check-in shows « Wallet ».

## 6. Risks

- **Receptionist permissions.** Reactivate uses the same permission as suspend; if the backend refuses a role, the existing 403 handling shows « Accès refusé ».
- **Stale version after background refetch.** The version sent is the one of the member the form was built from; a background refetch that changes the version while the user types is caught as `VERSION_MISMATCH` on save, which is the intended behaviour.
