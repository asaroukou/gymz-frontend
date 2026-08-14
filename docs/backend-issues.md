# Backend issues found during owner-app testing

**Date:** 2026-07-08
**Found by:** live tour of the owner web app against **staging** (`https://ai5q6bb8h2.execute-api.eu-west-1.amazonaws.com/v1`), signed in as a real owner account with one venue (`gymz venue test`, id `42dcfc2c-767a-471f-8df2-1ff2eab08b42`).
**Audience:** IziWellPass backend team.

These are issues that surfaced from the **web client**. Where the web side has a workaround in place, it's noted — but each needs a real backend fix. File paths below are in the Rust repo (`gymz/`).

---

## 1. 🔴 BLOCKER — OpenAPI omits the required `date` query param on three endpoints

Three venue-scoped GET endpoints **reject every request** from the generated client with **HTTP 400**:

```
GET /gms/v1/venues/{vid}/slots       → 400  VALIDATION_ERROR "Missing required query parameter: date"
GET /gms/v1/venues/{vid}/attendance  → 400  VALIDATION_ERROR "Missing required query parameter: date"
GET /gms/v1/venues/{vid}/checkins    → 400  VALIDATION_ERROR "Missing required query parameter: date"
```

Captured `request_id`s (staging): slots `334a6b33-…`, attendance `72b5abf2-…`, checkins `1091054d-…`.

### Root cause — spec/handler drift

The **handlers require** a `date=YYYY-MM-DD` query parameter:

- `lambdas/schedule/src/main.rs` → `parse_date_param(...)` (~L204) then `list_slots` (~L276) — `GET /venues/{id}/slots?date=YYYY-MM-DD`
- `lambdas/checkin/src/main.rs` → `parse_date_param(...)` (~L205), `list_check_ins` (~L256), `get_attendance_stats` (~L264)

But the **OpenAPI annotations declare only the `vid` path param** — no `date`:

- `crates/iziwellpass-openapi/src/paths/schedule.rs` → `list_slots` (~L83–94): `params(("vid" = String, Path, …))`
- `crates/iziwellpass-openapi/src/paths/checkin.rs` → `list_check_ins` (~L66) and `get_attendance` (~L79): same, `vid` only

Because `web/openapi.json` is generated from those annotations, and the web client is generated from `web/openapi.json` (via Orval), the generated hooks **physically cannot send `date`** → guaranteed 400.

### Impact on the web app

Breaks, on first load, with a real venue:

- **Dashboard** — attendance KPIs, "Planning du jour", "Derniers passages".
- **Planning → Séances** tab.
- **Accueil** (front desk) — day stats strip + live check-in feed. This is the most-used daily screen.

### Requested fix (backend)

Add the `date` query parameter (required, `string`, `format: date`, `YYYY-MM-DD`) to all three `#[utoipa::path(...)]` annotations, e.g.:

```rust
params(
    ("vid" = String, Path, description = "Venue id (UUID)"),
    ("date" = String, Query, description = "Calendar day to report on (YYYY-MM-DD, venue-local)"),
),
```

Then regenerate `docs/openapi.json` (the `iziwellpass-openapi` `gen` bin). The web team re-syncs `openapi.json`, regenerates the client, and passes the param normally.

### Interim web workaround (already shipped)

Until the spec is fixed, the web app calls these three endpoints **outside** the generated client — through the shared `customFetch` mutator with `?date=<venue-local today>` appended (auth, `ApiError` mapping, and query-key invalidation all preserved). See `apps/owner/lib/dated-api.ts`. **When the backend adds `date`, that file should be deleted** and the call sites reverted to the generated hooks.

### Related question — slots is single-day only

`GET /slots?date=` returns **one day**. The Planning "Séances" view is designed to browse a timetable across days; today the web app can only show the current day. **Please consider a date-range variant** (e.g. `from`/`to` or `?week=`) for `list_slots` so the planning view can show more than one day. Not blocking, but it caps that screen's usefulness.

---

## 2. 🟠 Owner's Staff record is seeded with the venue name and no email

On **Équipe**, the owner appears as **"gymz venue test"** (the _venue_ name) with an **empty E-mail** column, and role `Propriétaire`.

The web client renders the correct fields (`staff.first_name`, `staff.last_name`, `staff.email`) — so this is **backend data**: onboarding, when it promotes the signing-up user to `owner` and creates their `Staff` record, appears to seed `first_name`/`last_name` from the venue name and leaves `email` blank (even though Cognito has the user's email).

**Requested fix:** when creating the owner's Staff record during onboarding, populate:

- `email` from the authenticated user's Cognito claim (`email`), and
- `first_name`/`last_name` from the user (collect at signup, or leave blank rather than reusing the venue name).

---

## 3. 🟡 Seeded resource types are English in a French-first product

A new venue is seeded with resource types **"Group Class"** and **"Gym Floor"** (seen in the "Ajouter une ressource" → type dropdown). The product is French-first (francophone West-African market). These English labels show through in the French UI.

**Options:** localize the seeded type names (`Cours collectif`, `Plateau de musculation`, …), or leave types blank and let owners name their own. Low priority, cosmetic.

---

## 4. 🟡 Intermittent 500s observed on read endpoints

During testing, transient **HTTP 500** responses were observed on otherwise-working endpoints — `GET /venues`, `GET /members`, `GET /venues/{vid}/resources` — under a burst of concurrent requests, then succeeded on the immediate retry. Could be cold-start / connection-pool churn under load, or a real intermittent fault. **Please check CloudWatch logs** around 2026-07-08 for 5xx on these routes and confirm it's just cold-start. Not reproducible on demand; flagging for awareness.

---

## 5. 🟠 `GET /members` is paginated (default `limit=20`) but the spec doesn't declare it

The members list **defaults to `limit=20`** and returns a `meta` block, but the OpenAPI operation for `GET /gms/v1/members` declares **no query parameters** and the `ApiResponseVecMember` schema **does not model `meta`**. Observed live: with 33 members, `GET /members` returns 20; `GET /members?limit=100` returns all 33 (and `offset` works too — `?limit=100&offset=0`). Note `?page_size` / `?per_page` are ignored, so the accepted param is specifically `limit`/`offset`.

Because the generated `listMembers()` sends no `limit`, the owner app (which filters/searches client-side and has no pagination UI) silently showed **only the first 20 of 33 members**, and the dashboard "Membres actifs" count was computed from that truncated list.

**Requested fix:** declare `limit` and `offset` query parameters on `GET /members` (and any other paginated Vec endpoints — please confirm which of members / bookings / checkins / slots paginate) in the OpenAPI, and model the `meta` field (total/limit/offset) on the response schema. Then the client can page properly or request the full set explicitly.

**Interim web workaround (already shipped):** `apps/owner/lib/all-members.ts` fetches `/members?limit=1000` via `customFetch` (same pattern as the `date` workaround), reusing the members query-key prefix so invalidations still fire. Delete it once pagination is in the spec.

---

## 6. ℹ️ CORS for browser clients (already ticketed — IWP-066)

Reminder that the deployed web app can only call the gateway from `*.iziwellpass.com`; localhost/preview origins are blocked, and Lambda responses carry no CORS headers, so authorizer 401/403s surface as opaque CORS errors in the browser. The web app currently works around this with a same-origin Next.js dev proxy. Tracked in `gymz/issues/IWP-066-cors-browser-clients.md`; noting here so it stays on the radar for a real deployment.

---

## Suggested guardrail

Issues #1 (and the class of bug it represents) would be caught by a **contract test that exercises each handler against the generated OpenAPI** — i.e. assert that every query/path param the handler reads is declared in its `#[utoipa::path]`, and vice-versa. The drift here (handler requires `date`, spec doesn't declare it) passed all existing checks because the two are maintained separately.

---

## Plans & subscriptions (2026-08-14, owner app)

**Found by:** building plan and subscription management in the owner web app (create/edit/archive a plan, assign and cancel a member's subscription), reading the OpenAPI spec against `ActivityPlan`, `MemberSubscription`, and `Member`.
**Audience:** IziWellPass backend team.

### 7. 🟠 No venue- or tenant-level subscription listing

`GET /gms/v1/members/{mid}/subscriptions` is the only read path, so "who hasn't paid?" and any revenue view would require walking every member. Requesting `GET /gms/v1/venues/{vid}/subscriptions` (filterable by `payment_status` and `status`).

---

### 8. 🟠 No payment method or date on `MemberSubscription`

The model stores only a `paid`/`unpaid` flag plus a price snapshot. The market collects by cash, Wave and Orange Money, and owners need to know which and when. Until this exists the owner app records payment at assign time only and offers no collection worklist.

---

### 9. 🟡 No read side for member venue entitlements

`Member` carries no `venue_ids` and `PUT /gms/v1/members/{mid}/venues` is write-only, so the assign dialog cannot filter plans to venues the member may actually enter, and `EditAccessDialog` cannot pre-fill. Mirrors the still-open staff-venues ask.

---

### 10. 🔴 Clarify the check-in "no valid, paid plan" 403

`POST /checkins/qr` and `/checkins/manual` gained a 403 for "the member has no valid, paid plan covering this visit". If that evaluates `MemberSubscription` while the members list badges off `Member.membership_status`, a member can read **Actif** in the owner app and still be refused at the door. Please confirm what it evaluates, and whether the flat `membership_*` fields are deprecated in favour of subscriptions.
