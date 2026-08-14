# Plans catalog & member subscriptions — design

Design spec for the billing domain in the owner app: a venue-scoped catalog of
activity plans, and per-member subscription assignment. Sub-project B of the
2026-08-14 API-gap decomposition; sub-project A (contract sync + regen) landed
in `b505faa`.

The app is pre-production — there are no real users and no production data — so
there is no back-compat or migration burden. Decisions here can be revised
freely later.

## Goal

Consume the billing surface added to the API between the Jul 12 and Aug 13
contracts:

- **Plans** — `GET/POST /gms/v1/venues/{id}/plans`,
  `GET/PUT/DELETE …/plans/{planId}`.
- **Subscriptions** — `GET/POST /gms/v1/members/{mid}/subscriptions`,
  `PUT …/subscriptions/{sid}`.

Generated surface (post-regen, confirmed): `useListPlans`, `useGetPlan`,
`useCreatePlan`, `useUpdatePlan`, `useArchivePlan`, `useListSubscriptions`,
`useAssignSubscription`, `useUpdateSubscription`. Types: `ActivityPlan`,
`CreatePlanRequest`, `UpdatePlanRequest`, `PlanKind`, `Currency`,
`MemberSubscription`, `AssignSubscriptionRequest`, `UpdateSubscriptionRequest`,
`PaymentStatus`, `SubscriptionStatus`.

`useChangePlan` is **not** ours — it is `PUT /platform/v1/pass/plan`, the
pass-holder's own plan change, and belongs to the consumer app.

Out of scope: walk-in check-in (sub-project C), venue day metrics (D), venue
settings fields (E), multi-day planning via slots `from`/`to` (its own slice),
and the whole `/gms/v1/me/*` self-service surface (consumer app).

## Decision 1 — two membership models stay, clearly separated

A member now carries two overlapping notions of membership, unconnected in the
API:

|        | Flat fields on `Member`                                                                                     | `MemberSubscription`                                                                                      |
| ------ | ----------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------- |
| Fields | `membership_type` (monthly/annual/drop_in/trial), `membership_start`, `membership_end`, `membership_status` | plan ref, price snapshot, `payment_status`, `expires_on` or `entries_remaining`/`entries_total`, `status` |
| Money  | none                                                                                                        | `price_amount_minor` + `price_currency`                                                                   |
| Scope  | tenant-wide, no activity restriction                                                                        | venue-scoped via the plan, optionally activity-restricted                                                 |
| Set by | registration + member edit form                                                                             | plan assignment                                                                                           |

**Decision: keep both and present them as distinct things.** Subscriptions do
not become the source of truth for the member status badge or the dashboard
active count; those continue to read `membership_status`. The member detail page
shows the flat record as **Adhésion** and subscriptions as **Abonnements**.

Rationale: this is what the API actually models. Deriving the badge from
subscriptions would mean inventing a reconciliation rule the backend does not
have, and the backend may yet deprecate the flat fields (see Backend asks).

**Known consequence:** check-in's new 403 ("the member has no valid, paid plan
covering this visit") appears to enforce subscriptions, while the members list
badges off `membership_status`. A member can therefore read **Actif** and still
be refused at the door. Showing both models distinctly makes this legible rather
than baffling, but it is a real support edge until backend ask (d) is answered.

## Decision 2 — plans live at a new top-level `/plans`

Nav label **Offres**, in the **venue-scoped** nav group after Planning, gated to
`owner` / `admin` in `NAV_ITEMS` (which `canAccessPath` and `navGroupsForRole`
both derive from). The page reads the active venue from the existing venue
switcher, exactly as Planning does.

Rejected: a fourth section on venue detail. That file is already 1175 lines with
Profile / Resources / Activities, and a price list owners revisit weekly should
not be two clicks deep inside venue configuration.

## Decision 3 — assignment with payment set at assign time; no payment tracking

The API stores only `paid`/`unpaid` plus a price snapshot — no payment method,
no payment date, no partial amounts. And subscriptions are listable **only per
member**; there is no venue- or tenant-level listing, so an unpaid worklist or
revenue view would require walking every member.

**Decision:** build the honest surface. The assign dialog offers a paid/unpaid
choice (owners typically collect on the spot), and a subscription can be
cancelled. There is no separate "mark paid later" action, no collection
worklist, and no revenue reporting. Cancellation is kept because without it a
mis-assigned subscription could not be corrected.

`payment_status` is optional on `AssignSubscriptionRequest` (only `plan_id` is
required), and one endpoint — `PUT …/subscriptions/{sid}` — serves both
"mark paid" and "cancel"; we use it only for `cancel: true`.

## Plans catalog (`/plans`)

List the active venue's plans via `useListPlans`, showing name, kind, price, and
either duration (`duration_days`) or entry count (`entry_count`). An
"Afficher les archivées" toggle maps to the `include_archived` query param.

**Create / edit** share one dialog whose form branches on `kind`:

- `subscription` — `duration_days` required; `entry_count` must be absent.
- `entry_pack` — `entry_count` required and `> 0`; `duration_days` optional
  (acts as an expiry).

`kind` is immutable per the API, so the edit dialog renders it as static text
rather than a control. `all_activities` is a switch; when off, an activities
multi-select becomes required non-empty, sourced from the venue's activities
(already fetched by `ActivitiesSection`'s `useListVenueActivities`).

**Archive** (`useArchivePlan`, a soft delete) goes behind a confirm dialog,
matching the existing resource-delete pattern on venue detail.

## Member subscriptions (member detail)

A new **Abonnements** card above the existing membership card; that existing card
is renamed **Adhésion** so the two models do not read as duplicates.

Rows come from `useListSubscriptions(memberId)`: plan name, price, status badge
(`active` / `expired` / `exhausted` / `cancelled`), and either `expires_on` or
`entries_remaining` of `entries_total`.

**Attribuer une formule** — venue picker → plan picker → start date (defaults to
today) → paid/unpaid radio → `useAssignSubscription`.

Because a member's entitled venues are **not readable** (`Member` has no
`venue_ids`, and `PUT /members/{mid}/venues` is write-only — the same gap that
makes `EditAccessDialog` reset to `[]` on open), the venue picker offers every
venue the caller can see, with a short note that the plan's venue governs where
the subscription applies. Archived plans are excluded from the picker but still
render normally on rows where they are already held.

**Annuler** — per-row, behind a confirm, via `useUpdateSubscription` with
`cancel: true`.

## Money — `lib/money.ts`

`price_amount_minor` is in minor units, and the currency exponent varies across
the `Currency` enum: XOF and XAF have **zero** decimals; EUR, USD, GHS and NGN
have two.

Derive the exponent from
`Intl.NumberFormat(locale, { style: 'currency', currency }).resolvedOptions().maximumFractionDigits`
rather than hardcoding a table, and use the same formatter for display. Owners
enter prices in **major** units (they type `25000`, not `2500000`); the module
converts both ways. Currency defaults to **XOF** (FCFA) with a picker exposed,
since the enum spans six currencies.

## Permissions & errors

The API enforces `venue:write` for plan writes and `member:write` for
subscription assignment. The owner app gates by **role**, never by permission
string (existing practice — `usePermissions` exists but no screen gates on it);
the API authorizer stays the real, fail-closed boundary.

- `/plans` — `owner` / `admin`, enforced via `NAV_ITEMS` plus the standard
  `RequirePageAccess` page gate.
- Subscriptions card — follows the members page gating
  (`owner` / `admin` / `receptionist`) so the front desk can enrol. Whether a
  receptionist actually holds `member:write` server-side is **unverified** —
  confirm live; if not, drop `receptionist` from the card's roles rather than
  letting the front desk hit a 403.
- Reuse `apiErrorMessage` for toasts and `applyFieldErrors` for
  `VALIDATION_ERROR` `details` → react-hook-form field mapping, as the existing
  dialogs already do.

## i18n

French-first via next-intl, exact key parity with `en.json`. New namespace
`plans`; new `members.detail.subscriptions.*` keys; nav label
`nav.plans` = "Offres". Existing `members.detail.subscription.*` keys are
renamed to reflect the **Adhésion** heading.

## Verification

`pnpm build && pnpm typecheck && pnpm lint && pnpm test` green. The owner app has
no test runner (only `packages/ui` and `packages/api` run under `pnpm test`), so
the real check is a live staging pass:

1. Create one plan of each kind; edit one; archive one and confirm the toggle.
2. Assign both kinds to a member; confirm price and remaining entries render.
3. Cancel one and confirm the status badge updates.
4. Check a member in at the door with a paid subscription and confirm it
   succeeds — the real proof the two models line up.
5. Assign as a `receptionist` to settle whether that role holds `member:write`.

## Backend asks

To append to `docs/backend-issues.md`:

- **(a)** Venue- or tenant-level subscription listing
  (`GET /venues/{vid}/subscriptions`), for unpaid worklists and revenue.
- **(b)** Payment method and payment date on `MemberSubscription` — the market
  is cash / Wave / Orange Money and the current model cannot record which.
- **(c)** A read side for member venues (`venue_ids` on `Member`, or
  `GET /members/{mid}/venues`), mirroring the still-open staff-venues ask.
- **(d)** Confirm exactly what the check-in "no valid, paid plan covering this
  visit" 403 evaluates, and whether the flat `membership_*` fields are
  deprecated in favour of subscriptions.

## Risks

- **Model incoherence (highest).** See Decision 1's consequence. Mitigated by
  presentation, resolved only by backend ask (d).
- **Assign dialog venue picker** can offer a venue the member is not entitled
  to, because entitlements are unreadable. The API rejects this explicitly —
  `403 "the member is not entitled to the plan's venue"` — so the UI surfaces
  that error rather than pre-filtering. Resolved by ask (c).
- **No revenue surface** may read as a gap to owners. It is a deliberate
  consequence of ask (a), not an oversight.
