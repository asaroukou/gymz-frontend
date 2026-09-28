// Mock app-plane server for owner-app dev: real Cognito login, fake data.
// Serves the `/gms/v1/*` app-plane routes the owner app calls, plus the
// `/platform/v1/checkins/pass` app-plane route (marketplace pass check-in).
// Control-plane routes (/platform/v1/auth|onboarding|admin|billing) are out of
// scope, except `POST /platform/v1/mfa/finalize`: point
// CONTROL_PLANE_PROXY_TARGET (and NEXT_PUBLIC_CONTROL_PLANE_BASE_URL=/api/control)
// at this server to use it.
//
// Usage:
//   pnpm dev:mock                 # localhost:8090
//   # apps/owner/.env.local:
//   #   API_PROXY_TARGET=http://localhost:8090
//   #   NEXT_PUBLIC_API_BASE_URL=/api/backend   (unchanged — same-origin proxy)
//   # restart `next dev` after editing .env.local.
// Sign in with any real Cognito account (owner/admin/trainer/receptionist) —
// this server ignores who you are for authorization (it only checks that an
// `authorization` header is present) and serves one consistent mock tenant.
// The Next proxy (`API_PROXY_TARGET` in next.config.ts) means this needs NO
// CORS handling: the browser always calls same-origin `/api/backend/*`.
//
// In-memory state: mutations really mutate (register a member and it shows
// up in the list; a walk-in check-in appends to today's feed and bumps
// attendance; booking create/cancel updates the slot's bookings; plan
// archive flips is_active; staff invite adds a row; etc). State resets on
// restart. All "today" data (slots/bookings/check-ins) is computed relative
// to Date.now() at startup, so the dashboard and front desk look alive at
// any hour you start this — if the process happens to start within an hour
// of local midnight, the "+6h later" slot can roll onto the next calendar
// day (its `date` field follows its actual instant), which is an accepted
// edge case for a dev tool.
//
// Fixed demo hooks for manual testing:
//   - booking `bkg-fenetre` (on the "soon" slot) always 409s on cancel
//     (`{ code: 'CONFLICT', message: 'Cancellation window has closed' }`).
//   - booking `bkg-qr-demo` (same slot) is confirmed and ready for a
//     `POST /gms/v1/checkins/qr` with any `iwp1.`-prefixed token.
//   - member `mbr-07` (Khadija Ndoye) has no check-in yet today — use her to
//     demo `POST /gms/v1/checkins/walkin/qr` (a second call within the same
//     day 409s as a duplicate walk-in).
//   - `POST /gms/v1/members` with `access_scope` defaulting to
//     `venue_scoped` and no `venue_ids` demoes the VALIDATION_ERROR shape.
//   - slot `slot-03` 409s once on `PUT /gms/v1/slots/{id}/cancel` — the
//     first confirm after a preview always reports a stale-version conflict
//     (and bumps its version), the next confirm succeeds — demoes the
//     preview-then-conflict-then-retry flow.
//   - staff `staff-trainer-02` (Cheikh Fall, trainer) only has access to
//     venue 2 — picking them as `instructor_staff_id` on a venue-1 course
//     always fails with a VALIDATION_ERROR on that field.
//   - Venue gallery: `venue-dakar-01` starts with three seeded photos;
//     uploads go to the same-origin `/api/backend/__media/<key>` (no auth),
//     mirroring the presigned S3 PUT; state resets on restart.
//   - `GET /gms/v1/venues/venue-dakar-01/today` shows all three « À régler »
//     reasons: `slot-06` is running with nobody arrived, `slot-07`
//     (« Stretching midi ») has bookings but no instructor, `slot-08` is
//     overbooked (4 / 3).
//   - `MOCK_PLAN=free|starter|pro|enterprise` (default `pro`) sets the plan
//     `GET /gms/v1/capabilities` returns; gated routes answer
//     403 FEATURE_NOT_AVAILABLE when the plan lacks the capability.
//   - `MOCK_MFA=required` mirrors the backend's owner/admin MFA gate: every
//     `/gms/v1/*` call whose bearer token decodes to role owner/admin without
//     an `mfa_enrolled_at` claim answers 403 MFA_ENROLLMENT_REQUIRED. With the
//     offline auth mock, the password `totp` (or any e-mail enrolled on /mfa)
//     signs in with the claim.
//   - `MOCK_MFA_FINALIZE=fail` makes `POST /platform/v1/mfa/finalize` answer
//     500 (the enrolment page's retry path).
//   - Phase 5A members: members carry `version`; `PUT /members/{mid}`, `/access`
//     and `/venues` honour `?expected_version=` (409 VERSION_MISMATCH). `mbr-05`
//     (Bineta Cissé) conflicts once on its first versioned write, and the
//     concurrent change also sets her phone to `+221 77 000 00 05`. Members
//     created with an e-mail are `login` (their e-mail can't change here: 409
//     LOGIN_EMAIL_REQUIRES_SECURE_CHANGE), others `roster` (e.g. `mbr-03`).
//     `mbr-12` (Serigne Mbaye) is `login` with `account.invitation: 'failed'`
//     (no identity was ever created), so its e-mail can still be changed here
//     — see the Member management block below for why the failure is real.
//     Unknown update fields (incl. `is_active`) are a 400.
//   - Suspend/reactivate answer 204, or 409 INVALID_LIFECYCLE_TRANSITION with
//     `details.current_status`; `mbr-06` starts suspended.
//   - Narrowing `mbr-09` (Ndeye Faye) so venue 2 is dropped is refused with 409
//     ACCESS_DOWNSCOPE_BLOCKED (2 upcoming bookings at venue 2).
//   - `chk-wallet-01` is a wallet check-in.
//
// Member management (SP-MM):
//   - `MOCK_LOGIN_MODE=roster` starts the tenant with member login disabled
//     (`configured_mode: 'roster'`); default is `login`. `GET`/`PATCH
//     /gms/v1/tenant/settings` read/write it; PATCH answers 403
//     FEATURE_NOT_AVAILABLE when switching to `login` on a plan without
//     `member_self_service`, and 400 for any other shape. `POST
//     /gms/v1/members` derives `effective_mode` from this policy (not from
//     whether the request carries an e-mail) and requires `email` when the
//     effective mode is `login`.
//   - Demo members (fixed ids, also seeded with attendance history):
//     `mbr-01` sent, `mbr-02` accepted (visits every seed period, and its
//     sessions were revoked 12 Sept), `mbr-03` roster, `mbr-04`
//     linked_existing, `mbr-08` untracked, `mbr-10` change_pending (an
//     e-mail change has been pending_verification for the last hour),
//     `mbr-12` failed with `failure_code: invalid_email` (its seed e-mail
//     `serigne.mbaye@exemple` has no TLD, so relaunching the invitation
//     without correcting it fails again), `mbr-13` sent but its resend is
//     wired to get stuck in `dispatched` forever, `mbr-14` accepted but its
//     identity is shared (`sharedIdentity`) so every account operation on it
//     answers 409 IDENTITY_SHARED, `mbr-15` only has visits older than 30
//     days (so the default 30-day attendance window is empty), `mbr-16`
//     never visited.
//   - Operation lifecycle: `provisioning`, `invitation_resend`,
//     `session_revocation` and `email_change` go `requested` -> `dispatched`
//     after 1 s -> a terminal state 4 s after creation (evaluated lazily on
//     read, in `memberProfile` and the operation routes), except `mbr-13`'s
//     resend, which is `stuck` and never leaves `dispatched`.
//   - `POST /gms/v1/members/{mid}/email-change` requires an `Idempotency-Key`
//     header (400 without it); replaying the same key with a different body
//     is a 422 IDEMPOTENCY_KEY_REUSED. A `new_email` starting with `pris@`
//     always finishes `failed` with `failure_code: email_unavailable`.
//   - `POST /gms/v1/members/search` takes exactly one of `venue_id` or
//     `all_venues` in the body (400 otherwise), plus optional `q`, `status`
//     and a base64url offset `cursor`; results exclude cancelled members and
//     are paginated 20 per page by default.
//   - `GET /gms/v1/members/{mid}/attendance` defaults to the last 30 days,
//     accepts `from`/`to`/`venue_id`/`limit`, and its `next_cursor` bundles
//     the query so a client following it need not repeat `from`/`to`.
import http from 'node:http';
import { randomUUID } from 'node:crypto';
import { crc32, deflateSync } from 'node:zlib';

const PORT = Number(process.env.PORT ?? 8090);

const TENANT_ID = 'tenant-mock-teranga';
const VENUE_1 = 'venue-dakar-01';
const VENUE_2 = 'venue-dakar-02';

// --- time helpers (all relative to server start) ----------------------------
const START = Date.now();
const iso = (d) => d.toISOString();
const hoursFromNow = (h) => new Date(START + h * 3_600_000);
const daysFromNow = (d) => new Date(START + d * 86_400_000);
const dateOnly = (d) => iso(d).slice(0, 10);
const now = () => new Date();

let idSeq = 0;
const newId = (prefix) => `${prefix}-${(++idSeq).toString(36)}-${randomUUID().slice(0, 6)}`;

// --- seed: venues ------------------------------------------------------------
const venues = [
  {
    id: VENUE_1,
    tenant_id: TENANT_ID,
    name: 'Studio Téranga',
    city: 'Dakar',
    country: 'SN',
    address_line: 'Route de Ngor, Almadies',
    description: 'Salle de sport et bien-être au cœur des Almadies.',
    phone: '+221 33 820 45 12',
    email: 'contact@studio-teranga.sn',
    latitude: 14.7447,
    longitude: -17.5145,
    cover_image_url: null,
    is_active: true,
    timezone: 'Africa/Dakar',
    venue_type: 'gym',
    settings: {
      cancellation_window_minutes: 120,
      checkin_scan_mode: 'both',
      locale: 'fr',
      walkin_dedupe_minutes: 1440,
    },
    created_at: iso(daysFromNow(-400)),
    updated_at: iso(daysFromNow(-2)),
  },
  {
    id: VENUE_2,
    tenant_id: TENANT_ID,
    name: 'Espace Wellness Plateau',
    city: 'Dakar',
    country: 'SN',
    address_line: 'Avenue Léopold Sédar Senghor, Plateau',
    description: null,
    phone: null,
    email: null,
    latitude: null,
    longitude: null,
    cover_image_url: null,
    is_active: true,
    timezone: 'Africa/Dakar',
    venue_type: 'yoga',
    settings: {
      cancellation_window_minutes: 120,
      checkin_scan_mode: 'staff_scan',
      locale: 'fr',
      walkin_dedupe_minutes: 1440,
    },
    created_at: iso(daysFromNow(-60)),
    updated_at: iso(daysFromNow(-60)),
  },
];

// --- seed: venue images (gallery, SP-D) ---------------------------------------
const IMAGE_TYPES = { 'image/jpeg': 'jpg', 'image/png': 'png', 'image/webp': 'webp' };
const MAX_IMAGES = 10;
const MAX_IMAGE_BYTES = 5 * 1024 * 1024;
const media = new Map(); // object_key -> { contentType, bytes }
const venueImages = new Map(); // venue id -> VenueImage[] in cover-first order
const mediaUrl = (key) => `/api/backend/__media/${key}`;

function pngChunk(type, data) {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length);
  const body = Buffer.concat([Buffer.from(type, 'ascii'), data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(body) >>> 0);
  return Buffer.concat([len, body, crc]);
}
/** A small solid-colour PNG so seeded photos render without fixtures on disk. */
function solidPng([r, g, b], width = 64, height = 48) {
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 2; // truecolour RGB
  const row = Buffer.alloc(1 + width * 3);
  for (let x = 0; x < width; x++) row.set([r, g, b], 1 + x * 3);
  const pixels = Buffer.concat(Array.from({ length: height }, () => row));
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    pngChunk('IHDR', ihdr),
    pngChunk('IDAT', deflateSync(pixels)),
    pngChunk('IEND', Buffer.alloc(0)),
  ]);
}
function imagesOf(venueId) {
  if (!venueImages.has(venueId)) venueImages.set(venueId, []);
  return venueImages.get(venueId);
}
/** Mirrors the backend: sort_order follows the list, the first url is the venue cover. */
function syncCover(venueId) {
  const list = imagesOf(venueId);
  list.forEach((image, index) => {
    image.sort_order = index;
  });
  const venue = venues.find((v) => v.id === venueId);
  if (venue) venue.cover_image_url = list[0]?.url ?? null;
}
function storeImage(venueId, key, contentType) {
  const image = {
    id: randomUUID(),
    tenant_id: TENANT_ID,
    venue_id: venueId,
    object_key: key,
    url: mediaUrl(key),
    content_type: contentType,
    sort_order: imagesOf(venueId).length,
    created_at: iso(now()),
  };
  imagesOf(venueId).push(image);
  syncCover(venueId);
  return image;
}
for (const rgb of [
  [233, 243, 238],
  [232, 238, 251],
  [245, 236, 220],
]) {
  const key = `venues/${TENANT_ID}/${VENUE_1}/${randomUUID()}.png`;
  media.set(key, { contentType: 'image/png', bytes: solidPng(rgb) });
  storeImage(VENUE_1, key, 'image/png');
}

const venueActivities = [
  {
    id: newId('vact'),
    tenant_id: TENANT_ID,
    venue_id: VENUE_1,
    activity_type: 'gym',
    created_at: iso(daysFromNow(-400)),
  },
  {
    id: newId('vact'),
    tenant_id: TENANT_ID,
    venue_id: VENUE_1,
    activity_type: 'yoga',
    created_at: iso(daysFromNow(-400)),
  },
  {
    id: newId('vact'),
    tenant_id: TENANT_ID,
    venue_id: VENUE_1,
    activity_type: 'crossfit',
    created_at: iso(daysFromNow(-380)),
  },
  {
    id: newId('vact'),
    tenant_id: TENANT_ID,
    venue_id: VENUE_1,
    activity_type: 'dance',
    created_at: iso(daysFromNow(-200)),
  },
  {
    id: newId('vact'),
    tenant_id: TENANT_ID,
    venue_id: VENUE_2,
    activity_type: 'yoga',
    created_at: iso(daysFromNow(-60)),
  },
];

// --- seed: staff -------------------------------------------------------------
const staff = [
  {
    id: 'staff-owner-01',
    user_id: 'user-owner-01',
    tenant_id: TENANT_ID,
    first_name: 'Ibrahima',
    last_name: 'Ndiaye',
    email: 'ibrahima.ndiaye@studio-teranga.sn',
    role: 'owner',
    is_active: true,
    created_at: iso(daysFromNow(-400)),
    updated_at: iso(daysFromNow(-400)),
  },
  {
    id: 'staff-admin-01',
    user_id: 'user-admin-01',
    tenant_id: TENANT_ID,
    first_name: 'Fatou',
    last_name: 'Diop',
    email: 'fatou.diop@studio-teranga.sn',
    role: 'admin',
    is_active: true,
    created_at: iso(daysFromNow(-390)),
    updated_at: iso(daysFromNow(-390)),
  },
  {
    id: 'staff-trainer-01',
    user_id: 'user-trainer-01',
    tenant_id: TENANT_ID,
    first_name: 'Moussa',
    last_name: 'Sarr',
    email: 'moussa.sarr@studio-teranga.sn',
    role: 'trainer',
    is_active: true,
    created_at: iso(daysFromNow(-300)),
    updated_at: iso(daysFromNow(-300)),
  },
  {
    id: 'staff-trainer-02',
    user_id: 'user-trainer-02',
    tenant_id: TENANT_ID,
    first_name: 'Cheikh',
    last_name: 'Fall',
    email: 'cheikh.fall@studio-teranga.sn',
    role: 'trainer',
    is_active: true,
    created_at: iso(daysFromNow(-100)),
    updated_at: iso(daysFromNow(-100)),
  },
  {
    id: 'staff-reception-01',
    user_id: 'user-reception-01',
    tenant_id: TENANT_ID,
    first_name: 'Aïssatou',
    last_name: 'Ba',
    email: 'aissatou.ba@studio-teranga.sn',
    role: 'receptionist',
    is_active: true,
    created_at: iso(daysFromNow(-250)),
    updated_at: iso(daysFromNow(-250)),
  },
];
// Non-owner/admin staff's venue assignments (owner/admin implicitly see all venues).
const staffVenues = new Map([
  ['staff-trainer-01', [VENUE_1]],
  ['staff-trainer-02', [VENUE_2]],
  ['staff-reception-01', [VENUE_1]],
]);

// --- seed: members -------------------------------------------------------------
// Internal-only venue entitlement map (Member itself carries no venue_ids field
// on the wire — only access_scope; entitlements are read back only through
// setMemberVenues's response, matching the real API's shape).
const memberVenues = new Map();
const memberMode = new Map(); // P3: login when created with an e-mail

const members = [
  mkMember(
    'mbr-01',
    'Awa',
    'Ndiaye',
    'monthly',
    'active',
    'awa.ndiaye@example.sn',
    '+221 77 111 22 33',
    -200,
    165,
    [VENUE_1],
  ),
  mkMember(
    'mbr-02',
    'Cheikh',
    'Diop',
    'annual',
    'active',
    'cheikh.diop@example.sn',
    '+221 76 222 33 44',
    -100,
    265,
    [VENUE_1, VENUE_2],
    'chain_wide',
  ),
  mkMember(
    'mbr-03',
    'Mariama',
    'Fall',
    'drop_in',
    'active',
    undefined,
    '+221 78 333 44 55',
    -20,
    undefined,
    [VENUE_1],
  ),
  mkMember(
    'mbr-04',
    'Ousmane',
    'Kane',
    'monthly',
    'expired',
    'ousmane.kane@example.sn',
    '+221 70 444 55 66',
    -90,
    -10,
    [VENUE_1],
  ),
  mkMember(
    'mbr-05',
    'Bineta',
    'Cissé',
    'trial',
    'active',
    'bineta.cisse@example.sn',
    undefined,
    -5,
    25,
    [VENUE_1],
  ),
  mkMember(
    'mbr-06',
    'El Hadji',
    'Thiam',
    'monthly',
    'suspended',
    'elhadji.thiam@example.sn',
    '+221 77 555 66 77',
    -40,
    5,
    [VENUE_1],
  ),
  mkMember(
    'mbr-07',
    'Khadija',
    'Ndoye',
    'annual',
    'active',
    undefined,
    undefined,
    -150,
    215,
    [VENUE_1, VENUE_2],
    'chain_wide',
  ),
  mkMember(
    'mbr-08',
    'Abdoulaye',
    'Gueye',
    'drop_in',
    'expired',
    'abdoulaye.gueye@example.sn',
    '+221 76 666 77 88',
    -60,
    -30,
    [VENUE_1],
  ),
  mkMember(
    'mbr-09',
    'Ndeye',
    'Faye',
    'monthly',
    'active',
    'ndeye.faye@example.sn',
    '+221 78 777 88 99',
    -30,
    60,
    [VENUE_1, VENUE_2],
  ),
  mkMember(
    'mbr-10',
    'Modou',
    'Seck',
    'annual',
    'suspended',
    'modou.seck@example.sn',
    '+221 70 888 99 00',
    -200,
    100,
    [VENUE_2],
  ),
  mkMember(
    'mbr-11',
    'Aminata',
    'Diagne',
    'trial',
    'active',
    undefined,
    '+221 77 999 00 11',
    -3,
    27,
    [VENUE_1],
  ),
  mkMember(
    'mbr-12',
    'Serigne',
    'Mbaye',
    'monthly',
    'expired',
    'serigne.mbaye@example.sn',
    '+221 76 000 11 22',
    -70,
    -15,
    [VENUE_1],
  ),
  // ---- mbr-13 … mbr-26: SP-MM demo roster (search pagination, attendance, account ops) ----
  mkMember(
    'mbr-13',
    'Fatou',
    'Sow',
    'monthly',
    'active',
    'fatou.sow@example.sn',
    '+221 77 100 20 30',
    -60,
    30,
    [VENUE_1],
  ),
  mkMember(
    'mbr-14',
    'Moussa',
    'Ba',
    'annual',
    'active',
    'moussa.ba@example.sn',
    '+221 76 200 30 40',
    -80,
    285,
    [VENUE_2],
  ),
  mkMember(
    'mbr-15',
    'Astou',
    'Niang',
    'monthly',
    'active',
    undefined,
    '+221 78 300 40 50',
    -50,
    40,
    [VENUE_1],
  ),
  mkMember(
    'mbr-16',
    'Ibrahima',
    'Sarr',
    'monthly',
    'active',
    undefined,
    '+221 70 400 50 60',
    -10,
    80,
    [VENUE_2],
  ),
  mkMember(
    'mbr-17',
    'Coumba',
    'Diallo',
    'drop_in',
    'active',
    'coumba.diallo@example.sn',
    '+221 77 500 60 70',
    -15,
    undefined,
    [VENUE_1, VENUE_2],
    'chain_wide',
  ),
  mkMember(
    'mbr-18',
    'Pape',
    'Diouf',
    'monthly',
    'expired',
    undefined,
    '+221 76 600 70 80',
    -90,
    -20,
    [VENUE_1],
  ),
  mkMember(
    'mbr-19',
    'Aissatou',
    'Gaye',
    'annual',
    'active',
    'aissatou.gaye@example.sn',
    '+221 78 700 80 90',
    -120,
    245,
    [VENUE_2],
  ),
  mkMember(
    'mbr-20',
    'Boubacar',
    'Sy',
    'monthly',
    'suspended',
    undefined,
    '+221 70 800 90 10',
    -25,
    5,
    [VENUE_1],
  ),
  mkMember(
    'mbr-21',
    'Mame Diarra',
    'Diop',
    'trial',
    'active',
    'mame.diarra@example.sn',
    '+221 77 900 10 20',
    -7,
    23,
    [VENUE_1],
  ),
  mkMember(
    'mbr-22',
    'Alioune',
    'Badji',
    'monthly',
    'active',
    undefined,
    '+221 76 010 20 30',
    -35,
    25,
    [VENUE_2],
  ),
  mkMember(
    'mbr-23',
    'Rokhaya',
    'Mbengue',
    'annual',
    'cancelled',
    undefined,
    '+221 78 020 30 40',
    -200,
    -60,
    [VENUE_1],
  ),
  mkMember(
    'mbr-24',
    'Cheikhouna',
    'Touré',
    'monthly',
    'active',
    'cheikhouna.toure@example.sn',
    '+221 70 030 40 50',
    -45,
    15,
    [VENUE_1, VENUE_2],
    'chain_wide',
  ),
  mkMember(
    'mbr-25',
    'Ndella',
    'Kébé',
    'drop_in',
    'active',
    undefined,
    '+221 77 040 50 60',
    -8,
    undefined,
    [VENUE_2],
  ),
  mkMember(
    'mbr-26',
    'Omar',
    'Lô',
    'monthly',
    'expired',
    'omar.lo@example.sn',
    '+221 76 050 60 70',
    -75,
    -18,
    [VENUE_1],
  ),
];

function mkMember(
  id,
  firstName,
  lastName,
  membershipType,
  membershipStatus,
  email,
  phone,
  startDaysOffset,
  endDaysOffset,
  venueIds,
  accessScope = 'venue_scoped',
) {
  memberVenues.set(id, venueIds);
  const member = {
    id,
    tenant_id: TENANT_ID,
    first_name: firstName,
    last_name: lastName,
    email,
    phone,
    membership_type: membershipType,
    membership_status: membershipStatus,
    membership_start: dateOnly(daysFromNow(startDaysOffset)),
    membership_end: endDaysOffset === undefined ? undefined : dateOnly(daysFromNow(endDaysOffset)),
    access_scope: accessScope,
    // Legacy derived flag: true for active and expired, matching the backend
    // (NOT a lifecycle control; suspend/reactivate flip it separately above).
    is_active: ['active', 'expired'].includes(membershipStatus),
    notes: undefined,
    created_at: iso(daysFromNow(startDaysOffset)),
    updated_at: iso(daysFromNow(Math.max(startDaysOffset, -30))),
    version: iso(daysFromNow(Math.max(startDaysOffset, -30))),
  };
  memberMode.set(id, email ? 'login' : 'roster');
  return member;
}

// ---- member identity operations (Phase 5A account controls) -------------------
// Operations are evaluated on read: requested → dispatched after 1 s, then
// terminal 4 s after creation (unless `stuck`). `finish(op)` decides the end state.
const memberInvitation = new Map([
  ['mbr-01', 'sent'],
  ['mbr-04', 'linked_existing'],
  ['mbr-08', 'untracked'],
  ['mbr-12', 'failed'],
  ['mbr-13', 'sent'],
  ['mbr-14', 'accepted'],
]); // everyone else with login: 'accepted'
const memberEmailState = new Map(); // id → 'verified' | 'change_pending' | 'change_failed'
const memberOps = new Map(); // id → { provisioning, invitation_resend, session_revocation, email_change }
const sharedIdentity = new Set(['mbr-14']);
const stuckResend = new Set(['mbr-13']);
const idempotency = new Map(); // `${mid}:${key}` → { body: string, response: [status, json] }

function opsOf(id) {
  if (!memberOps.has(id)) {
    memberOps.set(id, { provisioning: null, invitation_resend: null, session_revocation: null, email_change: null });
  }
  return memberOps.get(id);
}

function mkOp(kind, { state = 'requested', at = now(), finish, stuck = false, result_code = null, failure_code = null } = {}) {
  return { id: newId('op'), kind, state, result_code, failure_code, updated_at: iso(at), createdMs: at.getTime(), finish, stuck };
}

/** Advance a running op by wall-clock time; apply its end state once. */
function advance(memberId, op) {
  if (!op || !['requested', 'dispatched'].includes(op.state)) return;
  const age = Date.now() - op.createdMs;
  if (op.stuck) {
    if (age >= 1000 && op.state === 'requested') { op.state = 'dispatched'; op.updated_at = iso(now()); }
    return;
  }
  if (age >= 4000) {
    op.finish?.(op, memberId);
    op.updated_at = iso(now());
  } else if (age >= 1000 && op.state === 'requested') {
    op.state = 'dispatched';
    op.updated_at = iso(now());
  }
}

const publicOp = (op) =>
  op && { id: op.id, kind: op.kind, state: op.state, result_code: op.result_code, failure_code: op.failure_code, updated_at: op.updated_at };

// mbr-02: accepted long ago; signed out everywhere on 12 Sept.
opsOf('mbr-02').provisioning = mkOp('provisioning', { state: 'completed', result_code: 'invitation_sent', at: daysFromNow(-200) });
opsOf('mbr-02').session_revocation = mkOp('session_revocation', { state: 'completed', result_code: 'sessions_revoked', at: daysFromNow(-17) });
opsOf('mbr-01').provisioning = mkOp('provisioning', { state: 'completed', result_code: 'invitation_sent', at: daysFromNow(-4) });
opsOf('mbr-04').provisioning = mkOp('provisioning', { state: 'completed', result_code: 'existing_identity_linked', at: daysFromNow(-40) });
opsOf('mbr-12').provisioning = mkOp('provisioning', { state: 'failed', failure_code: 'invalid_email', at: daysFromNow(-4) });
opsOf('mbr-13').provisioning = mkOp('provisioning', { state: 'completed', result_code: 'invitation_sent', at: daysFromNow(-2) });
// mbr-12's failure reason must be true: give it a malformed address (no TLD),
// so a relaunch without correcting it fails again with invalid_email.
members.find((m) => m.id === 'mbr-12').email = 'serigne.mbaye@exemple';
memberEmailState.set('mbr-10', 'change_pending');
opsOf('mbr-10').email_change = mkOp('email_change', { state: 'pending_verification', at: new Date(Date.now() - 3600_000) });

// ---- member attendance (SP-MM) --------------------------------------------------
const METHODS = ['qr', 'qr', 'manual', 'wallet'];
const memberVisits = new Map(); // id → [{ id, venue_id, venue_name, checked_in_at, method, kind, booking_id }]
(function seedVisits() {
  for (const m of members) {
    if (m.id === 'mbr-16' || m.membership_status === 'cancelled') continue;
    const visits = [];
    const vids = m.access_scope === 'chain_wide' ? [VENUE_1, VENUE_2] : (memberVenues.get(m.id) ?? [VENUE_1]);
    const seed = Number(m.id.replace(/\D/g, '')) || 1;
    const startDay = m.id === 'mbr-15' ? 40 : 0;
    for (let day = startDay; day < 95; day += 1 + ((day * seed) % 3)) {
      const at = daysFromNow(-day);
      at.setHours(6 + ((day + seed) % 13), (day * 7 + seed * 11) % 60, 0, 0);
      const venueId = vids[(day + seed) % vids.length];
      const booked = (day + seed) % 2 === 0;
      visits.push({
        id: `vis-${m.id}-${day}`,
        venue_id: venueId,
        venue_name: venues.find((v) => v.id === venueId)?.name ?? venueId,
        checked_in_at: iso(at),
        method: METHODS[(day + seed) % METHODS.length],
        kind: booked ? 'booked' : 'walk_in',
        booking_id: booked ? `bkg-hist-${m.id}-${day}` : null,
      });
    }
    memberVisits.set(m.id, visits.sort((a, b) => b.checked_in_at.localeCompare(a.checked_in_at)));
  }
})();

// --- seed: plans ---------------------------------------------------------------
const plans = [
  {
    id: 'plan-mensuel-01',
    tenant_id: TENANT_ID,
    venue_id: VENUE_1,
    name: 'Abonnement Mensuel',
    kind: 'subscription',
    all_activities: true,
    activities: [],
    duration_days: 30,
    entry_count: undefined,
    price_amount_minor: 15000,
    price_currency: 'XOF',
    is_active: true,
    created_at: iso(daysFromNow(-400)),
    updated_at: iso(daysFromNow(-400)),
  },
  {
    id: 'plan-pack10-01',
    tenant_id: TENANT_ID,
    venue_id: VENUE_1,
    name: 'Pack 10 Séances',
    kind: 'entry_pack',
    all_activities: false,
    activities: ['gym', 'crossfit'],
    duration_days: 90,
    entry_count: 10,
    price_amount_minor: 20000,
    price_currency: 'XOF',
    is_active: true,
    created_at: iso(daysFromNow(-380)),
    updated_at: iso(daysFromNow(-380)),
  },
  {
    id: 'plan-annuel-01',
    tenant_id: TENANT_ID,
    venue_id: VENUE_1,
    name: 'Abonnement Annuel',
    kind: 'subscription',
    all_activities: true,
    activities: [],
    duration_days: 365,
    entry_count: undefined,
    price_amount_minor: 150000,
    price_currency: 'XOF',
    is_active: true,
    created_at: iso(daysFromNow(-400)),
    updated_at: iso(daysFromNow(-400)),
  },
];

// --- seed: resource types & resources -------------------------------------------
const resourceTypes = [
  {
    id: 'rt-gym-01',
    tenant_id: TENANT_ID,
    venue_id: VENUE_1,
    name: 'Plateau Musculation',
    booking_mode: 'open_access',
    default_capacity: 40,
    default_duration_minutes: 60,
    activity_type: 'gym',
    icon: 'dumbbell',
    color: '#0c3d22',
    is_active: true,
    created_at: iso(daysFromNow(-400)),
  },
  {
    id: 'rt-yoga-01',
    tenant_id: TENANT_ID,
    venue_id: VENUE_1,
    name: 'Salle Yoga',
    booking_mode: 'class',
    default_capacity: 20,
    default_duration_minutes: 60,
    activity_type: 'yoga',
    icon: 'flower',
    color: '#7c9473',
    is_active: true,
    created_at: iso(daysFromNow(-400)),
  },
];

const resources = [
  {
    id: 'res-plateau-01',
    tenant_id: TENANT_ID,
    venue_id: VENUE_1,
    resource_type_id: 'rt-gym-01',
    name: 'Plateau Principal',
    capacity: 40,
    amenities: ['climatisation', 'vestiaires'],
    description: 'Espace cardio et musculation.',
    is_active: true,
    created_at: iso(daysFromNow(-400)),
    updated_at: iso(daysFromNow(-400)),
  },
  {
    id: 'res-yoga-01',
    tenant_id: TENANT_ID,
    venue_id: VENUE_1,
    resource_type_id: 'rt-yoga-01',
    name: 'Salle Yoga A',
    capacity: 20,
    amenities: ['tapis fournis', 'climatisation'],
    description: null,
    is_active: true,
    created_at: iso(daysFromNow(-400)),
    updated_at: iso(daysFromNow(-400)),
  },
];

// --- seed: schedules -------------------------------------------------------------
const schedules = [
  {
    id: 'sch-yoga-01',
    tenant_id: TENANT_ID,
    venue_id: VENUE_1,
    resource_id: 'res-yoga-01',
    instructor_staff_id: 'staff-trainer-01',
    title: 'Yoga Matinal',
    start_time: '06:30:00',
    end_time: '07:30:00',
    recurrence_rule: 'FREQ=WEEKLY;BYDAY=MO,WE,FR',
    effective_from: dateOnly(daysFromNow(-300)),
    effective_until: undefined,
    description: 'Séance de yoga douce pour bien démarrer la journée.',
    is_active: true,
    created_at: iso(daysFromNow(-300)),
    updated_at: iso(daysFromNow(-300)),
    version: iso(daysFromNow(-1)),
  },
  {
    id: 'sch-crossfit-01',
    tenant_id: TENANT_ID,
    venue_id: VENUE_1,
    resource_id: 'res-plateau-01',
    instructor_staff_id: 'staff-trainer-01',
    title: 'CrossFit Matinal',
    start_time: '09:00:00',
    end_time: '10:00:00',
    recurrence_rule: 'FREQ=DAILY',
    effective_from: dateOnly(daysFromNow(-300)),
    effective_until: undefined,
    description: undefined,
    is_active: true,
    created_at: iso(daysFromNow(-300)),
    updated_at: iso(daysFromNow(-300)),
    version: iso(daysFromNow(-1)),
  },
  {
    id: 'sch-danse-01',
    tenant_id: TENANT_ID,
    venue_id: VENUE_1,
    resource_id: 'res-yoga-01',
    instructor_staff_id: 'staff-trainer-01',
    title: 'Danse Afro Soir',
    start_time: '18:00:00',
    end_time: '19:00:00',
    recurrence_rule: 'FREQ=WEEKLY;BYDAY=TU,TH',
    effective_from: dateOnly(daysFromNow(-150)),
    effective_until: undefined,
    description: undefined,
    is_active: true,
    created_at: iso(daysFromNow(-150)),
    updated_at: iso(daysFromNow(-150)),
    version: iso(daysFromNow(-1)),
  },
  {
    id: 'sch-stretch-01',
    tenant_id: TENANT_ID,
    venue_id: VENUE_1,
    resource_id: 'res-plateau-01',
    instructor_staff_id: undefined,
    title: 'Stretching midi',
    start_time: '12:15:00',
    end_time: '13:00:00',
    recurrence_rule: 'FREQ=DAILY',
    effective_from: dateOnly(daysFromNow(-30)),
    effective_until: undefined,
    description: undefined,
    is_active: true,
    created_at: iso(daysFromNow(-30)),
    updated_at: iso(daysFromNow(-30)),
    version: iso(daysFromNow(-1)),
  },
];

// --- seed: today's slots -----------------------------------------------------
// Offsets are relative to server-start `now()`, so "today" always has a past
// slot, one starting in ~1h, and later slots — regardless of when this is run.
function mkSlot(id, scheduleId, resourceId, venueId, startOffsetH, durationH, capacity) {
  const start = hoursFromNow(startOffsetH);
  const end = hoursFromNow(startOffsetH + durationH);
  return {
    id,
    tenant_id: TENANT_ID,
    venue_id: venueId,
    schedule_id: scheduleId,
    resource_id: resourceId,
    date: dateOnly(start),
    start_time: iso(start),
    end_time: iso(end),
    capacity,
    booked_count: 0, // recomputed below from seeded bookings
    status: 'available',
    created_at: iso(daysFromNow(-1)),
    version: iso(daysFromNow(-1)),
  };
}

const slots = [
  mkSlot('slot-01', 'sch-yoga-01', 'res-yoga-01', VENUE_1, -3, 1, 20),
  mkSlot('slot-02', 'sch-crossfit-01', 'res-plateau-01', VENUE_1, -1, 1, 40),
  mkSlot('slot-03', 'sch-crossfit-01', 'res-plateau-01', VENUE_1, 1, 1, 40),
  mkSlot('slot-04', 'sch-danse-01', 'res-yoga-01', VENUE_1, 3, 1, 20),
  mkSlot('slot-05', 'sch-yoga-01', 'res-yoga-01', VENUE_1, 6, 1, 20),
  // « À régler » demo hooks (see header).
  mkSlot('slot-06', 'sch-yoga-01', 'res-yoga-01', VENUE_1, -0.25, 1, 12),
  mkSlot('slot-07', 'sch-stretch-01', 'res-plateau-01', VENUE_1, 2, 0.75, 16),
  mkSlot('slot-08', 'sch-crossfit-01', 'res-plateau-01', VENUE_1, 4.5, 1, 3),
];

// --- seed: bookings ------------------------------------------------------------
function mkBooking(id, slotId, memberId, status, opts = {}) {
  const member = memberId ? members.find((m) => m.id === memberId) : undefined;
  return {
    id,
    tenant_id: TENANT_ID,
    slot_id: slotId,
    member_id: memberId,
    pass_holder_id: opts.passHolderId,
    kind: opts.passHolderId ? 'pass_holder' : 'member',
    first_name: member?.first_name,
    last_name: member?.last_name,
    source: opts.source ?? 'direct',
    status,
    booked_at: opts.bookedAt ?? iso(daysFromNow(-1)),
    checked_in_at: opts.checkedInAt,
    check_in_method: opts.checkInMethod,
    cancelled_at: opts.cancelledAt,
    cancellation_reason: opts.cancellationReason,
    created_at: opts.bookedAt ?? iso(daysFromNow(-1)),
    updated_at: opts.updatedAt ?? opts.bookedAt ?? iso(daysFromNow(-1)),
  };
}

const bookings = [
  mkBooking('bkg-01', 'slot-01', 'mbr-01', 'checked_in', {
    checkedInAt: iso(hoursFromNow(-2.9)),
    updatedAt: iso(hoursFromNow(-2.9)),
  }),
  mkBooking('bkg-02', 'slot-01', 'mbr-05', 'no_show'),
  mkBooking('bkg-03', 'slot-01', 'mbr-11', 'cancelled', {
    cancelledAt: iso(daysFromNow(-1)),
    cancellationReason: 'Empêchement de dernière minute',
  }),
  // Pass-holder bookings — fixed demo hooks for the roster's pass rows.
  mkBooking('bkg-pass-01', 'slot-01', undefined, 'checked_in', {
    passHolderId: 'ph-01',
    source: 'iziwellpass',
    checkedInAt: iso(hoursFromNow(-2.8)),
    checkInMethod: 'qr',
  }),
  mkBooking('bkg-pass-02', 'slot-01', undefined, 'confirmed', {
    passHolderId: 'ph-02',
    source: 'iziwellpass',
  }),
  mkBooking('bkg-04', 'slot-02', 'mbr-02', 'checked_in', {
    checkedInAt: iso(hoursFromNow(-0.95)),
    updatedAt: iso(hoursFromNow(-0.95)),
  }),
  mkBooking('bkg-05', 'slot-02', 'mbr-09', 'checked_in', {
    checkedInAt: iso(hoursFromNow(-0.85)),
    updatedAt: iso(hoursFromNow(-0.85)),
  }),
  mkBooking('bkg-06', 'slot-02', 'mbr-04', 'no_show'),
  // Always answers 409 on cancel ("Cancellation window has closed") — fixed demo hook.
  mkBooking('bkg-fenetre', 'slot-03', 'mbr-01', 'confirmed'),
  // Confirmed and untouched — fixed demo hook for POST /gms/v1/checkins/qr.
  mkBooking('bkg-qr-demo', 'slot-03', 'mbr-03', 'confirmed'),
  mkBooking('bkg-07', 'slot-03', 'mbr-07', 'confirmed'),
  mkBooking('bkg-08', 'slot-04', 'mbr-09', 'confirmed'),
  mkBooking('bkg-09', 'slot-04', 'mbr-11', 'confirmed'),
  mkBooking('bkg-10', 'slot-05', 'mbr-02', 'confirmed'),
  // slot-06: running, nobody checked in yet.
  mkBooking('bkg-11', 'slot-06', 'mbr-04', 'confirmed'),
  mkBooking('bkg-12', 'slot-06', 'mbr-06', 'confirmed'),
  // slot-07: booked on a course with no instructor.
  mkBooking('bkg-13', 'slot-07', 'mbr-08', 'confirmed'),
  // slot-08: overbooked, 4 on 3 places.
  mkBooking('bkg-14', 'slot-08', 'mbr-02', 'confirmed'),
  mkBooking('bkg-15', 'slot-08', 'mbr-03', 'confirmed'),
  mkBooking('bkg-16', 'slot-08', 'mbr-10', 'confirmed'),
  mkBooking('bkg-17', 'slot-08', 'mbr-12', 'confirmed'),
];

// Bumps a slot/schedule's optimistic-concurrency token after a mutation.
const bump = (row) => {
  row.version = iso(now());
  row.updated_at = row.version;
};

function recomputeSlotCounts() {
  for (const slot of slots) {
    const count = bookings.filter((b) => b.slot_id === slot.id && b.status !== 'cancelled').length;
    const touched = count !== slot.booked_count;
    slot.booked_count = count;
    if (slot.status !== 'cancelled') {
      slot.status = count >= slot.capacity ? 'full' : 'available';
    }
    if (touched) bump(slot);
  }
}
recomputeSlotCounts();

// --- seed: today's check-ins -----------------------------------------------------
function mkCheckIn(
  id,
  venueId,
  memberId,
  passHolderId,
  method,
  checkedInAt,
  bookingId,
  checkedInBy,
) {
  return {
    id,
    tenant_id: TENANT_ID,
    venue_id: venueId,
    member_id: memberId,
    pass_holder_id: passHolderId,
    booking_id: bookingId,
    method,
    checked_in_by: checkedInBy,
    checked_in_at: checkedInAt,
  };
}

const checkIns = [
  mkCheckIn(
    'chk-01',
    VENUE_1,
    'mbr-01',
    undefined,
    'manual',
    iso(hoursFromNow(-2.9)),
    'bkg-01',
    'user-reception-01',
  ),
  mkCheckIn(
    'chk-02',
    VENUE_1,
    'mbr-02',
    undefined,
    'qr',
    iso(hoursFromNow(-0.95)),
    'bkg-04',
    undefined,
  ),
  mkCheckIn(
    'chk-03',
    VENUE_1,
    'mbr-09',
    undefined,
    'manual',
    iso(hoursFromNow(-0.85)),
    'bkg-05',
    'user-trainer-01',
  ),
  // Standalone walk-ins (no booking) — bump attendance without a reservation.
  mkCheckIn(
    'chk-04',
    VENUE_1,
    'mbr-05',
    undefined,
    'manual',
    iso(hoursFromNow(-0.75)),
    undefined,
    'user-reception-01',
  ),
  mkCheckIn(
    'chk-05',
    VENUE_1,
    'mbr-01',
    undefined,
    'qr',
    iso(hoursFromNow(-6)),
    undefined,
    undefined,
  ),
  mkCheckIn(
    'chk-wallet-01',
    VENUE_1,
    'mbr-11',
    undefined,
    'wallet',
    iso(hoursFromNow(-0.5)),
    undefined,
    undefined,
  ),
];

// Members with a check-in already recorded today, for walk-in dedupe checks.
function memberCheckedInToday(memberId, venueId, withinMinutes) {
  const cutoff = Date.now() - withinMinutes * 60_000;
  return checkIns.some(
    (c) =>
      c.member_id === memberId &&
      c.venue_id === venueId &&
      new Date(c.checked_in_at).getTime() >= cutoff,
  );
}

// --- seed: subscriptions -----------------------------------------------------------
function mkSubscription(id, memberId, planId, venueId, status, opts = {}) {
  const plan = plans.find((p) => p.id === planId);
  return {
    id,
    tenant_id: TENANT_ID,
    member_id: memberId,
    plan_id: planId,
    venue_id: venueId,
    status,
    payment_status: opts.paymentStatus ?? 'paid',
    starts_on: opts.startsOn ?? dateOnly(daysFromNow(-10)),
    expires_on: opts.expiresOn,
    entries_total: opts.entriesTotal ?? plan?.entry_count,
    entries_remaining: opts.entriesRemaining,
    price_amount_minor: plan?.price_amount_minor ?? 0,
    price_currency: plan?.price_currency ?? 'XOF',
    plan_name: plan?.name ?? 'Offre',
    plan_kind: plan?.kind ?? 'subscription',
    venue_name: venues.find((v) => v.id === venueId)?.name ?? 'Salle',
    assigned_by_name: 'Fatou (accueil)',
    created_at: opts.startsOn ? iso(new Date(opts.startsOn)) : iso(daysFromNow(-10)),
    updated_at: iso(daysFromNow(-1)),
  };
}

const subscriptions = [
  mkSubscription('sub-01', 'mbr-01', 'plan-mensuel-01', VENUE_1, 'active', {
    startsOn: dateOnly(daysFromNow(-10)),
    expiresOn: dateOnly(daysFromNow(20)),
  }),
  mkSubscription('sub-02', 'mbr-02', 'plan-annuel-01', VENUE_1, 'active', {
    startsOn: dateOnly(daysFromNow(-65)),
    expiresOn: dateOnly(daysFromNow(300)),
  }),
  mkSubscription('sub-03', 'mbr-03', 'plan-pack10-01', VENUE_1, 'active', {
    startsOn: dateOnly(daysFromNow(-20)),
    expiresOn: dateOnly(daysFromNow(70)),
    entriesTotal: 10,
    entriesRemaining: 6,
  }),
  mkSubscription('sub-04', 'mbr-04', 'plan-mensuel-01', VENUE_1, 'expired', {
    startsOn: dateOnly(daysFromNow(-40)),
    expiresOn: dateOnly(daysFromNow(-10)),
  }),
  mkSubscription('sub-05', 'mbr-05', 'plan-pack10-01', VENUE_1, 'active', {
    startsOn: dateOnly(daysFromNow(-5)),
    expiresOn: dateOnly(daysFromNow(85)),
    entriesTotal: 10,
    entriesRemaining: 2,
  }),
  mkSubscription('sub-06', 'mbr-06', 'plan-mensuel-01', VENUE_1, 'active', {
    paymentStatus: 'unpaid',
    startsOn: dateOnly(daysFromNow(-25)),
    expiresOn: dateOnly(daysFromNow(5)),
  }),
  mkSubscription('sub-07', 'mbr-07', 'plan-annuel-01', VENUE_1, 'active', {
    startsOn: dateOnly(daysFromNow(-150)),
    expiresOn: dateOnly(daysFromNow(215)),
  }),
  mkSubscription('sub-09', 'mbr-09', 'plan-mensuel-01', VENUE_1, 'active', {
    startsOn: dateOnly(daysFromNow(-30)),
    expiresOn: dateOnly(daysFromNow(0)),
  }),
  mkSubscription('sub-10', 'mbr-10', 'plan-annuel-01', VENUE_2, 'cancelled', {
    paymentStatus: 'unpaid',
    startsOn: dateOnly(daysFromNow(-200)),
    expiresOn: dateOnly(daysFromNow(100)),
  }),
  mkSubscription('sub-11', 'mbr-11', 'plan-pack10-01', VENUE_1, 'exhausted', {
    startsOn: dateOnly(daysFromNow(-27)),
    expiresOn: dateOnly(daysFromNow(63)),
    entriesTotal: 10,
    entriesRemaining: 0,
  }),
  mkSubscription('sub-12', 'mbr-12', 'plan-mensuel-01', VENUE_1, 'expired', {
    startsOn: dateOnly(daysFromNow(-45)),
    expiresOn: dateOnly(daysFromNow(-15)),
  }),
];

// =============================================================================
// Envelope / error helpers
// =============================================================================
let requestSeq = 0;
const requestId = () => `req_mock${++requestSeq}`;
const envelope = (data) => JSON.stringify({ data, request_id: requestId() });
const paginatedEnvelope = (data, meta) => JSON.stringify({ data, meta, request_id: requestId() });
const errorBody = (code, message, details) =>
  JSON.stringify({
    error: { code, message, ...(details ? { details } : {}) },
    request_id: requestId(),
  });

const notFound = (message) => [404, errorBody('NOT_FOUND', message)];
const conflict = (message) => [409, errorBody('CONFLICT', message)];
const validationError = (details) => [
  400,
  errorBody('VALIDATION_ERROR', 'La requête contient des champs invalides.', details),
];
const badRequest = (message) => [400, errorBody('VALIDATION_ERROR', message)];
const unauthorized = (message) => [401, errorBody('UNAUTHORIZED', message)];

// ---- plan capabilities (mirrors capabilities_for) ------------------------------
const ALL_CAPABILITIES = [
  'activity_pricing',
  'qr_checkin',
  'staff_accounts',
  'multi_venue',
  'analytics',
  'member_self_service',
  'member_qr',
];
const PLAN_CAPABILITIES = {
  free: [],
  starter: ['activity_pricing', 'qr_checkin', 'staff_accounts', 'member_self_service'],
  pro: ALL_CAPABILITIES,
  enterprise: ALL_CAPABILITIES,
};
const MOCK_PLAN = (() => {
  const plan = process.env.MOCK_PLAN ?? 'pro';
  if (!(plan in PLAN_CAPABILITIES)) {
    console.warn(`[mock] unknown MOCK_PLAN "${plan}", using "pro"`);
    return 'pro';
  }
  return plan;
})();
const planHas = (cap) => PLAN_CAPABILITIES[MOCK_PLAN].includes(cap);

// Routes the backend guards with `require_feature`. `when` narrows a gate
// (the first venue is created through onboarding, never refused).
const FEATURE_GATES = [
  { method: 'POST', pattern: /^\/gms\/v1\/staff\/invite$/, capability: 'staff_accounts' },
  {
    method: 'POST',
    pattern: /^\/gms\/v1\/venues$/,
    capability: 'multi_venue',
    when: () => venues.length > 0,
  },
  { method: 'POST', pattern: /^\/gms\/v1\/venues\/[^/]+\/plans$/, capability: 'activity_pricing' },
  {
    method: 'POST',
    pattern: /^\/gms\/v1\/members\/[^/]+\/subscriptions$/,
    capability: 'activity_pricing',
  },
  { method: 'POST', pattern: /^\/gms\/v1\/checkins\/qr$/, capability: 'qr_checkin' },
  { method: 'POST', pattern: /^\/gms\/v1\/checkins\/walkin\/qr$/, capability: 'qr_checkin' },
];

function featureGate(method, pathname) {
  const gate = FEATURE_GATES.find(
    (g) => g.method === method && g.pattern.test(pathname) && (!g.when || g.when()),
  );
  if (!gate || planHas(gate.capability)) return null;
  return [403, errorBody('FEATURE_NOT_AVAILABLE', `Feature not available: ${gate.capability}`)];
}

function capabilitiesHandler() {
  return [200, envelope({ plan: MOCK_PLAN, capabilities: PLAN_CAPABILITIES[MOCK_PLAN] })];
}

// --- MFA (owner/admin enrolment gate, finalize) ------------------------------
const MOCK_MFA = process.env.MOCK_MFA === 'required';
const MOCK_MFA_FINALIZE_FAIL = process.env.MOCK_MFA_FINALIZE === 'fail';

/** The bearer token's claims, or null. Reads the payload only, never verifies. */
function bearerClaims(header) {
  const token = String(header ?? '').replace(/^Bearer\s+/i, '');
  const payload = token.split('.')[1];
  if (!payload) return null;
  try {
    return JSON.parse(Buffer.from(payload, 'base64url').toString('utf8'));
  } catch {
    return null;
  }
}

function mfaGate(pathname, authorization) {
  if (!MOCK_MFA || !pathname.startsWith('/gms/v1/')) return null;
  const claims = bearerClaims(authorization);
  if (!claims || !['owner', 'admin'].includes(claims.role) || claims.mfa_enrolled_at) return null;
  return [403, errorBody('MFA_ENROLLMENT_REQUIRED', 'MFA enrollment required')];
}

function finalizeMfaHandler() {
  if (MOCK_MFA_FINALIZE_FAIL) {
    return [500, errorBody('INTERNAL', 'Mock finalize failure')];
  }
  return [200, envelope({ mfa_enrolled_at: iso(now()) })];
}

function requireFields(body, fields) {
  const details = [];
  for (const field of fields) {
    if (body?.[field] === undefined || body?.[field] === null || body?.[field] === '') {
      details.push({ field, message: `${field} est requis.` });
    }
  }
  return details;
}

// =============================================================================
// Route handlers
// =============================================================================

// ---- venues -----------------------------------------------------------------
function listVenuesHandler() {
  return [200, envelope(venues)];
}

function getVenueHandler(id) {
  const venue = venues.find((v) => v.id === id);
  if (!venue) return notFound(`Venue ${id} not found`);
  return [200, envelope(venue)];
}

function createVenueHandler(body) {
  const details = requireFields(body, ['name', 'city', 'country', 'venue_type']);
  if (details.length) return validationError(details);
  const venue = {
    id: newId('venue'),
    tenant_id: TENANT_ID,
    name: body.name,
    city: body.city,
    country: body.country,
    address_line: body.address_line ?? undefined,
    description: body.description ?? undefined,
    phone: body.phone ?? undefined,
    email: undefined,
    latitude: body.latitude ?? undefined,
    longitude: body.longitude ?? undefined,
    cover_image_url: undefined,
    is_active: true,
    timezone: body.timezone ?? 'Africa/Dakar',
    venue_type: body.venue_type,
    settings: {
      cancellation_window_minutes: 120,
      checkin_scan_mode: 'both',
      locale: 'fr',
      walkin_dedupe_minutes: 1440,
    },
    created_at: iso(now()),
    updated_at: iso(now()),
  };
  venues.push(venue);
  return [201, envelope(venue)];
}

function updateVenueHandler(id, body) {
  const venue = venues.find((v) => v.id === id);
  if (!venue) return notFound(`Venue ${id} not found`);
  const patchable = [
    'address_line',
    'cancellation_window_minutes',
    'checkin_scan_mode',
    'city',
    'country',
    'description',
    'is_active',
    'latitude',
    'longitude',
    'name',
    'phone',
    'timezone',
    'venue_type',
    'walkin_dedupe_minutes',
  ];
  for (const key of patchable) {
    if (body?.[key] === undefined) continue;
    if (
      key === 'cancellation_window_minutes' ||
      key === 'checkin_scan_mode' ||
      key === 'walkin_dedupe_minutes'
    ) {
      venue.settings = { ...venue.settings, [key]: body[key] };
    } else {
      venue[key] = body[key];
    }
  }
  venue.updated_at = iso(now());
  return [200, envelope(venue)];
}

// ---- venue activities ---------------------------------------------------------
function listVenueActivitiesHandler(venueId) {
  return [200, envelope(venueActivities.filter((a) => a.venue_id === venueId))];
}

function addVenueActivityHandler(venueId, body) {
  const details = requireFields(body, ['activity_type']);
  if (details.length) return validationError(details);
  if (
    venueActivities.some((a) => a.venue_id === venueId && a.activity_type === body.activity_type)
  ) {
    return conflict('Cette activité est déjà associée à ce lieu.');
  }
  const activity = {
    id: newId('vact'),
    tenant_id: TENANT_ID,
    venue_id: venueId,
    activity_type: body.activity_type,
    created_at: iso(now()),
  };
  venueActivities.push(activity);
  return [201, envelope(activity)];
}

function removeVenueActivityHandler(venueId, activityType) {
  const idx = venueActivities.findIndex(
    (a) => a.venue_id === venueId && a.activity_type === activityType,
  );
  if (idx === -1) return notFound(`Activity ${activityType} not found on venue ${venueId}`);
  venueActivities.splice(idx, 1);
  return [204, ''];
}

// ---- plans --------------------------------------------------------------------
function listPlansHandler(venueId, query) {
  const includeArchived = query.get('include_archived') === 'true';
  const list = plans.filter((p) => p.venue_id === venueId && (includeArchived || p.is_active));
  return [200, envelope(list)];
}

function createPlanHandler(venueId, body) {
  const details = requireFields(body, ['kind', 'name', 'price_amount_minor', 'price_currency']);
  if (details.length) return validationError(details);
  const plan = {
    id: newId('plan'),
    tenant_id: TENANT_ID,
    venue_id: venueId,
    name: body.name,
    kind: body.kind,
    all_activities: body.all_activities ?? true,
    activities: body.activities ?? [],
    duration_days: body.duration_days ?? undefined,
    entry_count: body.entry_count ?? undefined,
    price_amount_minor: body.price_amount_minor,
    price_currency: body.price_currency,
    is_active: true,
    created_at: iso(now()),
    updated_at: iso(now()),
  };
  plans.push(plan);
  return [201, envelope(plan)];
}

function updatePlanHandler(venueId, planId, body) {
  const plan = plans.find((p) => p.id === planId && p.venue_id === venueId);
  if (!plan) return notFound(`Plan ${planId} not found on venue ${venueId}`);
  for (const key of [
    'activities',
    'all_activities',
    'is_active',
    'name',
    'price_amount_minor',
    'price_currency',
  ]) {
    if (body?.[key] !== undefined) plan[key] = body[key];
  }
  plan.updated_at = iso(now());
  return [200, envelope(plan)];
}

function archivePlanHandler(venueId, planId) {
  const plan = plans.find((p) => p.id === planId && p.venue_id === venueId);
  if (!plan) return notFound(`Plan ${planId} not found on venue ${venueId}`);
  plan.is_active = false;
  plan.updated_at = iso(now());
  return [204, ''];
}

// ---- resource types -------------------------------------------------------------
function listResourceTypesHandler() {
  return [200, envelope(resourceTypes.filter((rt) => rt.is_active))];
}

function createResourceTypeHandler(body) {
  const details = requireFields(body, ['name', 'booking_mode']);
  if (details.length) return validationError(details);
  const resourceType = {
    id: newId('rt'),
    tenant_id: TENANT_ID,
    venue_id: body.venue_id ?? undefined,
    name: body.name,
    booking_mode: body.booking_mode,
    default_capacity: body.default_capacity ?? 20,
    default_duration_minutes: body.default_duration_minutes ?? 60,
    activity_type: body.activity_type ?? undefined,
    icon: body.icon ?? undefined,
    color: body.color ?? undefined,
    is_active: true,
    created_at: iso(now()),
  };
  resourceTypes.push(resourceType);
  return [201, envelope(resourceType)];
}

// ---- resources -----------------------------------------------------------------
function listResourcesHandler(venueId) {
  return [200, envelope(resources.filter((r) => r.venue_id === venueId && r.is_active))];
}

function createResourceHandler(venueId, body) {
  const details = requireFields(body, ['name', 'resource_type_id']);
  if (details.length) return validationError(details);
  if (!resourceTypes.some((rt) => rt.id === body.resource_type_id)) {
    return validationError([
      { field: 'resource_type_id', message: 'Type de ressource introuvable.' },
    ]);
  }
  const resource = {
    id: newId('res'),
    tenant_id: TENANT_ID,
    venue_id: venueId,
    resource_type_id: body.resource_type_id,
    name: body.name,
    capacity: body.capacity ?? 1,
    amenities: body.amenities ?? [],
    description: body.description ?? undefined,
    is_active: true,
    created_at: iso(now()),
    updated_at: iso(now()),
  };
  resources.push(resource);
  return [201, envelope(resource)];
}

function updateResourceHandler(venueId, resourceId, body) {
  const resource = resources.find((r) => r.id === resourceId && r.venue_id === venueId);
  if (!resource) return notFound(`Resource ${resourceId} not found on venue ${venueId}`);
  for (const key of ['amenities', 'capacity', 'description', 'name', 'resource_type_id']) {
    if (body?.[key] !== undefined) resource[key] = body[key];
  }
  resource.updated_at = iso(now());
  return [200, envelope(resource)];
}

function deleteResourceHandler(venueId, resourceId) {
  const resource = resources.find((r) => r.id === resourceId && r.venue_id === venueId);
  if (!resource) return notFound(`Resource ${resourceId} not found on venue ${venueId}`);
  if (schedules.some((s) => s.is_active && s.resource_id === resourceId)) {
    return conflict(`Resource ${resourceId} has active schedules and cannot be deleted`);
  }
  resource.is_active = false;
  resource.updated_at = iso(now());
  return [204, ''];
}

// ---- venue images (gallery) ---------------------------------------------------
const unsupportedType = () => [
  400,
  errorBody('VALIDATION_ERROR', 'Unsupported image type', [
    { field: 'content_type', message: 'Must be image/jpeg, image/png, or image/webp' },
  ]),
];
const galleryFull = () => [
  400,
  errorBody('VALIDATION_ERROR', `A venue may have at most ${MAX_IMAGES} images`),
];

function presignImageHandler(venueId, body) {
  if (!venues.some((v) => v.id === venueId)) return notFound(`Venue ${venueId} not found`);
  const ext = IMAGE_TYPES[body?.content_type];
  if (!ext) return unsupportedType();
  if (imagesOf(venueId).length >= MAX_IMAGES) return galleryFull();
  const key = `venues/${TENANT_ID}/${venueId}/${randomUUID()}.${ext}`;
  return [
    201,
    envelope({
      upload_url: mediaUrl(key),
      object_key: key,
      url: mediaUrl(key),
      expires_at: Math.floor(Date.now() / 1000) + 300,
    }),
  ];
}
function registerImageHandler(venueId, body) {
  if (!venues.some((v) => v.id === venueId)) return notFound(`Venue ${venueId} not found`);
  const key = body?.object_key ?? '';
  if (!key.startsWith(`venues/${TENANT_ID}/${venueId}/`)) {
    return [
      400,
      errorBody('VALIDATION_ERROR', "object_key is outside this venue's upload prefix", [
        { field: 'object_key', message: 'must be an object uploaded for this venue' },
      ]),
    ];
  }
  const stored = media.get(key);
  if (!stored) {
    return [
      400,
      errorBody('VALIDATION_ERROR', 'Uploaded object not found', [
        { field: 'object_key', message: 'No object at this key' },
      ]),
    ];
  }
  // Intentional re-check: the unauthenticated /__media PUT accepts any content-type,
  // so this is the only place that actually enforces the image/* allow-list on it.
  if (!IMAGE_TYPES[stored.contentType]) return unsupportedType();
  if (stored.bytes.length > MAX_IMAGE_BYTES) {
    return [400, errorBody('VALIDATION_ERROR', `Image exceeds ${MAX_IMAGE_BYTES} bytes`)];
  }
  if (imagesOf(venueId).length >= MAX_IMAGES) return galleryFull();
  return [201, envelope(storeImage(venueId, key, stored.contentType))];
}
function listImagesHandler(venueId) {
  if (!venues.some((v) => v.id === venueId)) return notFound(`Venue ${venueId} not found`);
  return [200, envelope(imagesOf(venueId))];
}
function reorderImagesHandler(venueId, body) {
  const list = imagesOf(venueId);
  const ids = Array.isArray(body?.image_ids) ? body.image_ids : [];
  const sameSet =
    ids.length === list.length &&
    new Set(ids).size === ids.length &&
    ids.every((id) => list.some((i) => i.id === id));
  if (!sameSet)
    return [
      400,
      errorBody('VALIDATION_ERROR', 'image_ids must be exactly the current set of images'),
    ];
  venueImages.set(
    venueId,
    ids.map((id) => list.find((i) => i.id === id)),
  );
  syncCover(venueId);
  return [200, envelope(imagesOf(venueId))];
}
function deleteImageHandler(venueId, imageId) {
  const list = imagesOf(venueId);
  const index = list.findIndex((i) => i.id === imageId);
  if (index === -1) return notFound(`Image ${imageId} not found`);
  const [removed] = list.splice(index, 1);
  media.delete(removed.object_key);
  syncCover(venueId);
  return [204, ''];
}

// ---- attendance / check-ins list ------------------------------------------------
function getAttendanceHandler(venueId, query) {
  const date = query.get('date');
  if (!date) return badRequest('date is required');
  const dayCheckIns = checkIns.filter(
    (c) => c.venue_id === venueId && c.checked_in_at.slice(0, 10) === date,
  );
  const totalCapacity = slots
    .filter((s) => s.venue_id === venueId && s.date === date)
    .reduce((sum, s) => sum + s.capacity, 0);
  const uniqueMembers = new Set(dayCheckIns.map((c) => c.member_id).filter(Boolean));
  const stats = {
    venue_id: venueId,
    date,
    total_check_ins: dayCheckIns.length,
    unique_members: uniqueMembers.size,
    occupancy_pct:
      totalCapacity > 0 ? Math.round((dayCheckIns.length / totalCapacity) * 1000) / 10 : 0,
  };
  return [200, envelope(stats)];
}

function listCheckInsHandler(venueId, query) {
  const date = query.get('date');
  if (!date) return badRequest('date is required');
  const list = checkIns
    .filter((c) => c.venue_id === venueId && c.checked_in_at.slice(0, 10) === date)
    .sort((a, b) => b.checked_in_at.localeCompare(a.checked_in_at));
  return [200, envelope(list)];
}

// ---- today snapshot -------------------------------------------------------------
function localDateKey(date, timeZone) {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(date);
}

function localRfc3339(date, timeZone) {
  const p = Object.fromEntries(
    new Intl.DateTimeFormat('en-CA', {
      timeZone,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hourCycle: 'h23',
      timeZoneName: 'longOffset',
    })
      .formatToParts(date)
      .map((part) => [part.type, part.value]),
  );
  const offset = p.timeZoneName === 'GMT' ? '+00:00' : p.timeZoneName.replace('GMT', '');
  return `${p.year}-${p.month}-${p.day}T${p.hour}:${p.minute}:${p.second}${offset}`;
}

function lifecycleOf(slot, at) {
  if (slot.status === 'cancelled') return 'cancelled';
  if (Date.parse(slot.end_time) <= at) return 'completed';
  if (Date.parse(slot.start_time) <= at) return 'active';
  return 'upcoming';
}

function todayHandler(venueId, query) {
  const venue = venues.find((v) => v.id === venueId);
  if (!venue) return notFound(`Venue ${venueId} not found`);
  const timeZone = venue.timezone ?? 'Africa/Dakar';
  const at = Date.now();
  const date = query.get('date') ?? localDateKey(new Date(at), timeZone);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || Number.isNaN(Date.parse(`${date}T00:00:00Z`))) {
    return badRequest('date must be YYYY-MM-DD');
  }

  const todaySlots = slots
    .filter(
      (s) => s.venue_id === venueId && localDateKey(new Date(s.start_time), timeZone) === date,
    )
    .sort((a, b) => a.start_time.localeCompare(b.start_time))
    .map((s) => {
      const schedule = schedules.find((x) => x.id === s.schedule_id);
      const resource = resources.find((r) => r.id === s.resource_id);
      const instructorId = schedule?.instructor_staff_id ?? null;
      const instructor = instructorId ? staff.find((m) => m.id === instructorId) : undefined;
      const lifecycle = lifecycleOf(s, at);
      const checkedIn = bookings.filter(
        (b) => b.slot_id === s.id && b.status === 'checked_in',
      ).length;
      const needsAttention =
        lifecycle !== 'cancelled' &&
        ((lifecycle === 'active' && checkedIn === 0) ||
          s.booked_count > s.capacity ||
          (s.booked_count > 0 && !instructorId));
      return {
        slot_id: s.id,
        schedule_id: s.schedule_id,
        resource_id: s.resource_id,
        title: schedule?.title ?? null,
        description: schedule?.description ?? null,
        activity_type: null,
        resource_name: resource?.name ?? null,
        instructor_staff_id: instructorId,
        instructor_name: instructor ? `${instructor.first_name} ${instructor.last_name}` : null,
        start_utc: s.start_time,
        end_utc: s.end_time,
        start_local: localRfc3339(new Date(s.start_time), timeZone),
        end_local: localRfc3339(new Date(s.end_time), timeZone),
        capacity: s.capacity,
        booked_count: s.booked_count,
        checked_in_count: checkedIn,
        lifecycle,
        needs_attention: needsAttention,
      };
    });

  const dayCheckIns = checkIns.filter(
    (c) => c.venue_id === venueId && localDateKey(new Date(c.checked_in_at), timeZone) === date,
  );
  const attendees = new Set(
    dayCheckIns.map((c) => (c.member_id ? `m:${c.member_id}` : `p:${c.pass_holder_id}`)),
  );
  const openCapacity = todaySlots
    .filter((s) => s.lifecycle !== 'cancelled')
    .reduce((sum, s) => sum + s.capacity, 0);
  const idsWhere = (lifecycle) =>
    todaySlots.filter((s) => s.lifecycle === lifecycle).map((s) => s.slot_id);

  return [
    200,
    envelope({
      venue_id: venueId,
      timezone: timeZone,
      local_date: date,
      generated_at: iso(new Date(at)),
      attendance: {
        total_check_ins: dayCheckIns.length,
        unique_attendees: attendees.size,
        occupancy_pct:
          openCapacity > 0 ? Math.round((dayCheckIns.length / openCapacity) * 1000) / 10 : 0,
      },
      slots: todaySlots,
      buckets: {
        upcoming: idsWhere('upcoming'),
        active: idsWhere('active'),
        completed: idsWhere('completed'),
        cancelled: idsWhere('cancelled'),
      },
      needs_attention: todaySlots.filter((s) => s.needs_attention).map((s) => s.slot_id),
    }),
  ];
}

// ---- schedules ------------------------------------------------------------------
function listSchedulesHandler(venueId) {
  return [200, envelope(schedules.filter((s) => s.venue_id === venueId))];
}

function createScheduleHandler(venueId, body) {
  const details = requireFields(body, [
    'effective_from',
    'end_time',
    'resource_id',
    'start_time',
    'title',
  ]);
  if (details.length) return validationError(details);
  // Demo hook: staff-trainer-02 has no access to venue 1 — reject as an instructor.
  if (body.instructor_staff_id === 'staff-trainer-02') {
    return validationError([
      {
        field: 'instructor_staff_id',
        message: 'not an active staff member with access to this venue',
      },
    ]);
  }
  const schedule = {
    id: newId('sch'),
    tenant_id: TENANT_ID,
    venue_id: venueId,
    resource_id: body.resource_id,
    instructor_staff_id: body.instructor_staff_id ?? undefined,
    title: body.title,
    start_time: body.start_time,
    end_time: body.end_time,
    recurrence_rule: body.recurrence_rule ?? undefined,
    effective_from: body.effective_from,
    effective_until: body.effective_until ?? undefined,
    description: body.description ?? undefined,
    is_active: true,
    created_at: iso(now()),
    updated_at: iso(now()),
    version: iso(now()),
  };
  schedules.push(schedule);
  return [201, envelope(schedule)];
}

function updateScheduleHandler(scheduleId, body) {
  const schedule = schedules.find((s) => s.id === scheduleId);
  if (!schedule) return notFound(`Schedule ${scheduleId} not found`);
  if (body?.instructor_staff_id === 'staff-trainer-02') {
    return validationError([
      {
        field: 'instructor_staff_id',
        message: 'not an active staff member with access to this venue',
      },
    ]);
  }
  for (const key of [
    'description',
    'effective_until',
    'end_time',
    'instructor_staff_id',
    'is_active',
    'recurrence_rule',
    'start_time',
    'title',
  ]) {
    if (body?.[key] !== undefined) schedule[key] = body[key];
  }
  bump(schedule);
  return [200, envelope(schedule)];
}

function cancelScheduleHandler(scheduleId, query) {
  const schedule = schedules.find((s) => s.id === scheduleId);
  if (!schedule) return notFound(`Schedule ${scheduleId} not found`);
  const expectedVersion = query?.get('expected_version');
  if (expectedVersion && expectedVersion !== schedule.version) {
    return conflict('schedule changed since preview; re-fetch and retry');
  }
  schedule.is_active = false;
  bump(schedule);
  return [204, ''];
}

// ---- cancellation preview (slots and schedules) --------------------------------
function previewFor(kind, target) {
  const slotIds =
    kind === 'slot'
      ? [target.id]
      : slots
          .filter(
            (s) =>
              s.schedule_id === target.id && s.status !== 'cancelled' && s.start_time > iso(now()),
          )
          .map((s) => s.id);
  const live = bookings.filter((b) => slotIds.includes(b.slot_id) && b.status === 'confirmed');
  const memberRows = live.filter((b) => b.member_id);
  const passRows = live.filter((b) => b.pass_holder_id);
  const emails = memberRows.filter((b) => members.find((m) => m.id === b.member_id)?.email).length;
  const untouched = bookings.filter(
    (b) => slotIds.includes(b.slot_id) && b.status === 'checked_in',
  ).length;
  const alreadyCancelled = kind === 'slot' ? target.status === 'cancelled' : !target.is_active;
  return {
    target_kind: kind,
    target_id: target.id,
    future_slots_affected: kind === 'slot' ? 0 : slotIds.length,
    active_bookings_affected: live.length,
    member_booking_count: memberRows.length,
    pass_booking_count: passRows.length,
    notification_consequences: { member_emails_to_send: emails },
    refund_consequences: { pass_credits_refunded: passRows.length, member_credits_refunded: 0 },
    unchanged: {
      bookings_unchanged: untouched,
      past_slots_preserved:
        kind === 'slot'
          ? 0
          : slots.filter((s) => s.schedule_id === target.id && s.start_time <= iso(now())).length,
    },
    blocking_condition: alreadyCancelled ? `${kind} is already cancelled` : null,
    version: target.version,
  };
}

function slotCancellationPreviewHandler(slotId) {
  const slot = slots.find((s) => s.id === slotId);
  if (!slot) return notFound(`Slot ${slotId} not found`);
  return [200, envelope(previewFor('slot', slot))];
}

function scheduleCancellationPreviewHandler(scheduleId) {
  const schedule = schedules.find((s) => s.id === scheduleId);
  if (!schedule) return notFound(`Schedule ${scheduleId} not found`);
  return [200, envelope(previewFor('schedule', schedule))];
}

// ---- slots --------------------------------------------------------------------
function listSlotsHandler(venueId, query) {
  const date = query.get('date');
  const from = query.get('from');
  const to = query.get('to');
  const resourceId = query.get('resource_id');
  let list = slots.filter((s) => s.venue_id === venueId);
  if (date) list = list.filter((s) => s.date === date);
  else if (from && to) list = list.filter((s) => s.date >= from && s.date <= to);
  if (resourceId) list = list.filter((s) => s.resource_id === resourceId);
  list = [...list].sort((a, b) => a.start_time.localeCompare(b.start_time));
  return [200, envelope(list)];
}

// Demo bookkeeping only — kept beside the slot rows rather than on them, so
// the flag never serializes into a slot payload the client would see.
const conflictedOnce = new Set();

function cancelSlotHandler(slotId, query) {
  const slot = slots.find((s) => s.id === slotId);
  if (!slot) return notFound(`Slot ${slotId} not found`);
  // Demo hook: slot-03 409s the first confirm after a preview, then succeeds.
  if (slotId === 'slot-03' && !conflictedOnce.has(slotId)) {
    conflictedOnce.add(slotId);
    bump(slot);
    return conflict('slot changed since preview; re-fetch and retry');
  }
  const expectedVersion = query?.get('expected_version');
  if (expectedVersion && expectedVersion !== slot.version) {
    return conflict('slot changed since preview; re-fetch and retry');
  }
  slot.status = 'cancelled';
  bump(slot);
  return [204, ''];
}

// ---- bookings -------------------------------------------------------------------
function toRosterEntry(b) {
  const member = b.member_id ? members.find((m) => m.id === b.member_id) : undefined;
  const checkIn = checkIns.find((c) => c.booking_id === b.id);
  return {
    ...b,
    first_name: member?.first_name ?? b.first_name,
    last_name: member?.last_name ?? b.last_name,
    check_in_method:
      b.status === 'checked_in'
        ? (checkIn?.method ?? b.check_in_method ?? 'manual')
        : b.check_in_method,
    checked_in_at:
      b.status === 'checked_in' ? (checkIn?.checked_in_at ?? b.checked_in_at) : b.checked_in_at,
  };
}

function listBookingsForSlotHandler(slotId) {
  return [200, envelope(bookings.filter((b) => b.slot_id === slotId).map(toRosterEntry))];
}

function createBookingHandler(slotId, body) {
  const details = requireFields(body, ['slot_id']);
  if (!body?.member_id && !body?.pass_holder_id) {
    details.push({ field: 'member_id', message: 'member_id ou pass_holder_id est requis.' });
  }
  if (details.length) return validationError(details);
  const slot = slots.find((s) => s.id === slotId);
  if (!slot) return notFound(`Slot ${slotId} not found`);
  if (
    body.member_id &&
    bookings.some(
      (b) => b.slot_id === slotId && b.status !== 'cancelled' && b.member_id === body.member_id,
    )
  ) {
    return conflict('A booking already exists for this actor on this slot');
  }
  if (body.member_id) {
    const member = members.find((m) => m.id === body.member_id);
    if (member && !member.is_active) {
      return [403, errorBody('FORBIDDEN', 'Member is not entitled to this venue')];
    }
  }
  const liveCount = bookings.filter((b) => b.slot_id === slotId && b.status !== 'cancelled').length;
  if (liveCount >= slot.capacity) return conflict('Slot is full — no available capacity');
  const booking = mkBooking(newId('bkg'), slotId, body.member_id ?? undefined, 'confirmed', {
    source: body.source ?? 'direct',
    bookedAt: iso(now()),
    passHolderId: body.pass_holder_id ?? undefined,
  });
  bookings.push(booking);
  recomputeSlotCounts();
  bump(slot);
  return [201, envelope(booking)];
}

function cancelBookingHandler(bookingId, body) {
  const booking = bookings.find((b) => b.id === bookingId);
  if (!booking) return notFound(`Booking ${bookingId} not found`);
  if (booking.id === 'bkg-fenetre') return conflict('Cancellation window has closed');
  if (booking.status === 'cancelled') return conflict('Cette réservation est déjà annulée.');
  booking.status = 'cancelled';
  booking.cancelled_at = iso(now());
  booking.cancellation_reason = body?.reason ?? undefined;
  booking.updated_at = iso(now());
  recomputeSlotCounts();
  const slot = slots.find((s) => s.id === booking.slot_id);
  if (slot) bump(slot);
  return [200, envelope(booking)];
}

// ---- staff --------------------------------------------------------------------
function listStaffHandler() {
  return [200, envelope(staff.filter((s) => s.is_active))];
}

function inviteStaffHandler(body) {
  const details = requireFields(body, ['email', 'first_name', 'last_name', 'role']);
  if (details.length) return validationError(details);
  const member = {
    id: newId('staff'),
    user_id: newId('user'),
    tenant_id: TENANT_ID,
    first_name: body.first_name,
    last_name: body.last_name,
    email: body.email,
    role: body.role,
    is_active: true,
    created_at: iso(now()),
    updated_at: iso(now()),
  };
  staff.push(member);
  if (Array.isArray(body.venue_ids) && !['owner', 'admin'].includes(body.role)) {
    staffVenues.set(member.id, body.venue_ids);
  }
  return [201, envelope(member)];
}

function removeStaffHandler(staffId) {
  const member = staff.find((s) => s.id === staffId);
  if (!member) return notFound(`Staff ${staffId} not found`);
  member.is_active = false;
  member.updated_at = iso(now());
  return [204, ''];
}

function changeRoleHandler(staffId, body) {
  const details = requireFields(body, ['role']);
  if (details.length) return validationError(details);
  const member = staff.find((s) => s.id === staffId);
  if (!member) return notFound(`Staff ${staffId} not found`);
  member.role = body.role;
  member.updated_at = iso(now());
  return [200, envelope(member)];
}

function setStaffVenuesHandler(staffId, body) {
  const details = requireFields(body, ['venue_ids']);
  if (details.length) return validationError(details);
  const member = staff.find((s) => s.id === staffId);
  if (!member) return notFound(`Staff ${staffId} not found`);
  staffVenues.set(staffId, body.venue_ids);
  return [200, envelope(body.venue_ids)];
}

// ---- members --------------------------------------------------------------------
let lastVersionMs = 0;
/** Bump updated_at and the optimistic-concurrency token; strictly increasing. */
function touch(member) {
  lastVersionMs = Math.max(Date.now(), lastVersionMs + 1);
  member.updated_at = iso(new Date(lastVersionMs));
  member.version = member.updated_at;
}

function memberAccess(member) {
  return {
    access_scope: member.access_scope,
    venue_ids: member.access_scope === 'chain_wide' ? [] : (memberVenues.get(member.id) ?? []),
  };
}

function memberProfile(member) {
  const login = memberMode.get(member.id) === 'login';
  const ops = opsOf(member.id);
  for (const op of Object.values(ops)) advance(member.id, op);
  const invitation = login ? (memberInvitation.get(member.id) ?? 'accepted') : 'not_applicable';
  const hasIdentity = login && !['failed', 'pending'].includes(invitation);
  return {
    ...member,
    access: memberAccess(member),
    account: {
      mode: login ? 'login' : 'roster',
      invitation,
      email: hasIdentity ? (memberEmailState.get(member.id) ?? 'verified') : 'not_applicable',
      provisioning: publicOp(ops.provisioning),
      invitation_resend: publicOp(ops.invitation_resend),
      session_revocation: publicOp(ops.session_revocation),
      email_change: publicOp(ops.email_change),
    },
  };
}

// Demo: mbr-05's first versioned write reports a concurrent change (and bumps
// its version), the retry with the refetched version succeeds.
const conflictOnce = new Set(['mbr-05']);

function versionConflict(member, query) {
  const expected = query.get('expected_version');
  if (!expected) return null;
  if (conflictOnce.delete(member.id)) {
    // Make the demo realistic: a colleague really did change something while
    // this request was in flight, so the browser check can show the merge.
    member.phone = '+221 77 000 00 05';
    touch(member);
    return [409, errorBody('VERSION_MISMATCH', 'The member was modified concurrently')];
  }
  if (expected !== member.version) {
    return [409, errorBody('VERSION_MISMATCH', 'The member was modified concurrently')];
  }
  return null;
}

function lifecycleConflict(member, operation, required) {
  return [
    409,
    errorBody('INVALID_LIFECYCLE_TRANSITION', `Member is not ${required}`, {
      operation,
      current_status: member.membership_status,
      required_status: required,
    }),
  ];
}

const UPDATE_MEMBER_FIELDS = new Set([
  'email',
  'first_name',
  'last_name',
  'membership_end',
  'membership_type',
  'notes',
  'phone',
]);

function listMembersHandler(query) {
  const status = query.get('status');
  if (status && !['active', 'inactive'].includes(status)) {
    return badRequest(`Unrecognized status filter: ${status}`);
  }
  let candidates = members.filter((m) => m.membership_status !== 'cancelled');
  if (status === 'active')
    candidates = candidates.filter((m) => ['active', 'expired'].includes(m.membership_status));
  if (status === 'inactive')
    candidates = candidates.filter((m) => m.membership_status === 'suspended');
  const name = query.get('name');
  if (name) {
    const needle = name.toLowerCase();
    candidates = candidates.filter((m) =>
      `${m.first_name} ${m.last_name}`.toLowerCase().includes(needle),
    );
  }
  const phone = query.get('phone');
  if (phone) candidates = candidates.filter((m) => (m.phone ?? '').includes(phone));
  const email = query.get('email');
  if (email) {
    const needle = email.toLowerCase();
    candidates = candidates.filter((m) => (m.email ?? '').toLowerCase().includes(needle));
  }

  const rawLimit = Number(query.get('limit'));
  const limit =
    Number.isFinite(rawLimit) && rawLimit > 0 ? Math.min(Math.floor(rawLimit), 100) : 20;
  const cursor = query.get('cursor');
  let offset = 0;
  if (cursor) {
    try {
      offset = Number(Buffer.from(cursor, 'base64url').toString('utf8'));
      if (!Number.isFinite(offset) || offset < 0) offset = 0;
    } catch {
      offset = 0;
    }
  }
  const page = candidates.slice(offset, offset + limit);
  const nextOffset = offset + limit;
  const nextCursor =
    nextOffset < candidates.length
      ? Buffer.from(String(nextOffset)).toString('base64url')
      : undefined;
  return [200, paginatedEnvelope(page, { next_cursor: nextCursor })];
}

// ---- tenant member-login policy (SP-MM) -----------------------------------------
let configuredLoginMode = process.env.MOCK_LOGIN_MODE === 'roster' ? 'roster' : 'login';
function loginPolicy() {
  const capability = PLAN_CAPABILITIES[MOCK_PLAN].includes('member_self_service');
  const effective = configuredLoginMode === 'login' && capability ? 'login' : 'roster';
  return {
    member_login_mode: configuredLoginMode,
    member_login: {
      configured_mode: configuredLoginMode,
      effective_mode: effective,
      required_capability: 'member_self_service',
      capability_available: capability,
      downgrade_reason: configuredLoginMode === 'login' && !capability ? 'plan_lacks_member_self_service' : null,
    },
  };
}
function getTenantSettingsHandler() {
  return [200, envelope(loginPolicy())];
}
function patchTenantSettingsHandler(body) {
  const mode = body?.member_login_mode;
  if (!['login', 'roster'].includes(mode) || Object.keys(body).length !== 1) {
    return badRequest('member_login_mode must be login or roster');
  }
  if (mode === 'login' && !PLAN_CAPABILITIES[MOCK_PLAN].includes('member_self_service')) {
    return [403, errorBody('FEATURE_NOT_AVAILABLE', 'Plan lacks member_self_service')];
  }
  configuredLoginMode = mode;
  return [200, envelope(loginPolicy())];
}

function registerMemberHandler(body) {
  const details = requireFields(body, [
    'first_name',
    'last_name',
    'membership_start',
    'membership_type',
  ]);
  const accessScope = body?.access_scope ?? 'venue_scoped';
  if (
    accessScope === 'venue_scoped' &&
    (!Array.isArray(body?.venue_ids) || body.venue_ids.length === 0)
  ) {
    details.push({ field: 'venue_ids', message: 'venue_ids requis pour un accès venue_scoped.' });
  }
  const effective = loginPolicy().member_login.effective_mode;
  if (effective === 'login' && !body?.email) {
    details.push({ field: 'email', message: 'email is required for login members' });
  }
  if (body?.email) {
    const emailLower = body.email.trim().toLowerCase();
    if (members.some((m) => m.email && m.email.toLowerCase() === emailLower)) {
      return conflict('Un membre utilise déjà cette adresse.');
    }
  }
  if (details.length) return validationError(details);
  const id = newId('mbr');
  const member = {
    id,
    tenant_id: TENANT_ID,
    first_name: body.first_name,
    last_name: body.last_name,
    email: body.email ?? undefined,
    phone: body.phone ?? undefined,
    membership_type: body.membership_type,
    membership_status: 'active',
    membership_start: body.membership_start,
    membership_end: body.membership_end ?? undefined,
    access_scope: accessScope,
    is_active: true,
    notes: body.notes ?? undefined,
    created_at: iso(now()),
    updated_at: iso(now()),
    version: iso(now()),
  };
  members.push(member);
  memberVenues.set(id, body.venue_ids ?? []);
  memberMode.set(id, effective);
  const login = effective === 'login';
  let provisioning = null;
  if (login) {
    const op = mkOp('provisioning', {
      finish: (o, mid) => {
        o.state = 'completed';
        o.result_code = 'invitation_sent';
        memberInvitation.set(mid, 'sent');
      },
    });
    opsOf(id).provisioning = op;
    memberInvitation.set(id, 'pending');
    provisioning = publicOp(op);
  }
  return [
    201,
    envelope({
      ...member,
      effective_mode: effective,
      provisioning,
    }),
  ];
}

function getMemberHandler(memberId) {
  const member = members.find((m) => m.id === memberId);
  if (!member) return notFound(`Member ${memberId} not found`);
  return [200, envelope(memberProfile(member))];
}

function updateMemberHandler(memberId, body, query) {
  const member = members.find((m) => m.id === memberId);
  if (!member) return notFound(`Member ${memberId} not found`);
  const unknown = Object.keys(body ?? {}).filter((k) => !UPDATE_MEMBER_FIELDS.has(k));
  if (unknown.length) {
    return validationError(unknown.map((field) => ({ field, message: 'Unknown field' })));
  }
  if (
    memberMode.get(member.id) === 'login' &&
    memberInvitation.get(member.id) !== 'failed' &&
    body?.email !== undefined &&
    body.email !== member.email
  ) {
    return [
      409,
      errorBody(
        'LOGIN_EMAIL_REQUIRES_SECURE_CHANGE',
        "A login member's email changes through the secure email-change flow",
      ),
    ];
  }
  const conflict = versionConflict(member, query);
  if (conflict) return conflict;
  for (const key of UPDATE_MEMBER_FIELDS) {
    if (body?.[key] !== undefined) member[key] = body[key];
  }
  touch(member);
  return [200, envelope(member)];
}

// ---- member identity operation routes (SP-MM) -----------------------------------
function memberOr404(id) {
  return members.find((m) => m.id === id) ?? null;
}

function invitationResendHandler(mid) {
  const m = memberOr404(mid);
  if (!m) return notFound(`Member ${mid} not found`);
  if (memberMode.get(mid) !== 'login') return [409, errorBody('NOT_A_LOGIN_MEMBER', 'Roster member')];
  if (m.membership_status === 'cancelled') return lifecycleConflict(m, 'invitation_resend', 'active');
  if (sharedIdentity.has(mid)) return [409, errorBody('IDENTITY_SHARED', 'Identity is shared')];
  const ops = opsOf(mid);
  for (const op of Object.values(ops)) advance(mid, op);
  const running = [ops.provisioning, ops.invitation_resend].find((op) => op && ['requested', 'dispatched'].includes(op.state));
  if (running) return [202, envelope(publicOp(running))];
  const invitation = memberInvitation.get(mid) ?? 'accepted';
  if (invitation === 'accepted') return [409, errorBody('ACCOUNT_ALREADY_ACTIVE', 'Account already active')];
  if (invitation === 'failed') {
    if (loginPolicy().member_login.effective_mode !== 'login') {
      return [409, errorBody('LOGIN_NOT_AVAILABLE', 'Tenant no longer provisions logins')];
    }
    const taken = members.some((o) => o.id !== mid && o.email && m.email && o.email.toLowerCase() === m.email.toLowerCase());
    if (taken) return conflict('A member with this email already exists');
    memberInvitation.set(mid, 'pending');
    ops.provisioning = mkOp('provisioning', {
      finish: (o) => {
        if (!m.email || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(m.email)) {
          o.state = 'failed'; o.failure_code = 'invalid_email'; memberInvitation.set(mid, 'failed');
        } else {
          o.state = 'completed'; o.result_code = 'invitation_sent'; memberInvitation.set(mid, 'sent');
        }
      },
    });
    return [202, envelope(publicOp(ops.provisioning))];
  }
  ops.invitation_resend = mkOp('invitation_resend', {
    stuck: stuckResend.has(mid),
    finish: (o) => { o.state = 'completed'; o.result_code = 'invitation_sent'; },
  });
  return [202, envelope(publicOp(ops.invitation_resend))];
}

function sessionRevocationHandler(mid) {
  const m = memberOr404(mid);
  if (!m) return notFound(`Member ${mid} not found`);
  if (memberMode.get(mid) !== 'login') return [409, errorBody('NOT_A_LOGIN_MEMBER', 'Roster member')];
  const invitation = memberInvitation.get(mid) ?? 'accepted';
  if (['pending', 'failed'].includes(invitation)) return [409, errorBody('LOGIN_NOT_PROVISIONED', 'No identity yet')];
  if (sharedIdentity.has(mid)) return [409, errorBody('IDENTITY_SHARED', 'Identity is shared')];
  const ops = opsOf(mid);
  advance(mid, ops.session_revocation);
  if (ops.session_revocation && ['requested', 'dispatched'].includes(ops.session_revocation.state)) {
    return [202, envelope(publicOp(ops.session_revocation))];
  }
  ops.session_revocation = mkOp('session_revocation', {
    finish: (o) => { o.state = 'completed'; o.result_code = 'sessions_revoked'; },
  });
  return [202, envelope(publicOp(ops.session_revocation))];
}

function emailChangeHandler(mid, body, headers) {
  const key = headers['idempotency-key'];
  if (!key) return badRequest('Idempotency-Key header is required');
  const bodyText = JSON.stringify(body ?? {});
  const stored = idempotency.get(`${mid}:${key}`);
  if (stored) {
    if (stored.body !== bodyText) return [422, errorBody('IDEMPOTENCY_KEY_REUSED', 'Key reused with another body')];
    return stored.response;
  }
  const m = memberOr404(mid);
  if (!m) return notFound(`Member ${mid} not found`);
  const unknown = Object.keys(body ?? {}).filter((k) => k !== 'new_email');
  if (unknown.length) return badRequest(`Unknown field: ${unknown[0]}`);
  const next = String(body?.new_email ?? '').trim();
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(next)) return validationError([{ field: 'new_email', message: 'invalid email' }]);
  if (m.email && next.toLowerCase() === m.email.toLowerCase()) {
    return validationError([{ field: 'new_email', message: 'same as current email' }]);
  }
  if (memberMode.get(mid) !== 'login') return [409, errorBody('NOT_A_LOGIN_MEMBER', 'Roster member')];
  const invitation = memberInvitation.get(mid) ?? 'accepted';
  if (['pending', 'failed'].includes(invitation)) return [409, errorBody('LOGIN_NOT_PROVISIONED', 'No identity yet')];
  if (sharedIdentity.has(mid)) return [409, errorBody('IDENTITY_SHARED', 'Identity is shared')];
  if (m.membership_status === 'cancelled') return lifecycleConflict(m, 'email_change', 'active');
  if (members.some((o) => o.id !== mid && (o.email ?? '').toLowerCase() === next.toLowerCase())) {
    return conflict('Email already used');
  }
  const ops = opsOf(mid);
  const current = ops.email_change;
  if (current && ['requested', 'dispatched', 'pending_verification'].includes(current.state)) {
    if (current.target === next.toLowerCase()) return [202, envelope(publicOp(current))];
    return [409, errorBody('EMAIL_CHANGE_IN_PROGRESS', 'Another change is in progress')];
  }
  const reinvite = invitation === 'sent' || invitation === 'untracked';
  ops.email_change = mkOp('email_change', {
    finish: (o) => {
      if (next.toLowerCase().startsWith('pris@')) {
        o.state = 'failed'; o.failure_code = 'email_unavailable'; memberEmailState.set(mid, 'change_failed');
      } else if (reinvite) {
        o.state = 'completed'; o.result_code = 'email_changed_reinvited'; m.email = next; touch(m);
        memberEmailState.set(mid, 'verified');
      } else {
        o.state = 'pending_verification'; memberEmailState.set(mid, 'change_pending');
      }
    },
  });
  ops.email_change.target = next.toLowerCase();
  memberEmailState.set(mid, 'change_pending');
  const response = [202, envelope(publicOp(ops.email_change))];
  idempotency.set(`${mid}:${key}`, { body: bodyText, response });
  return response;
}

// ---- member search (SP-MM) -------------------------------------------------------
const SEARCH_FIELDS = new Set(['venue_id', 'all_venues', 'q', 'status', 'cursor', 'limit']);
function searchMembersHandler(body) {
  const b = body ?? {};
  const unknown = Object.keys(b).filter((k) => !SEARCH_FIELDS.has(k));
  if (unknown.length) return badRequest('Unknown field in search body');
  const byVenue = Boolean(typeof b.venue_id === 'string' && b.venue_id);
  const all = b.all_venues === true;
  if (byVenue === all) return badRequest('Provide exactly one of venue_id or all_venues');
  if (byVenue && !venues.some((v) => v.id === b.venue_id)) return notFound('Venue not found');
  const status = b.status ?? 'all';
  if (!['active', 'expired', 'suspended', 'all'].includes(status)) return badRequest('Invalid status');
  const q = typeof b.q === 'string' ? b.q.trim().toLowerCase() : '';
  if (typeof b.q === 'string' && (b.q.length < 1 || b.q.length > 100)) return badRequest('q must be 1 to 100 characters');
  let list = members.filter((m) => m.membership_status !== 'cancelled');
  if (status !== 'all') list = list.filter((m) => m.membership_status === status);
  if (byVenue) {
    list = list.filter((m) => m.access_scope === 'chain_wide' || (memberVenues.get(m.id) ?? []).includes(b.venue_id));
  }
  if (q) {
    list = list.filter((m) =>
      [m.first_name, m.last_name, `${m.first_name} ${m.last_name}`, m.email ?? '', m.phone ?? '']
        .some((field) => field.toLowerCase().includes(q)),
    );
  }
  list = [...list].sort((a, b2) => `${a.last_name} ${a.first_name}`.localeCompare(`${b2.last_name} ${b2.first_name}`, 'fr'));
  const limit = Number.isInteger(b.limit) && b.limit >= 1 && b.limit <= 100 ? b.limit : 20;
  let offset = 0;
  if (typeof b.cursor === 'string') {
    const parsed = Number(Buffer.from(b.cursor, 'base64url').toString('utf8'));
    offset = Number.isFinite(parsed) && parsed >= 0 ? parsed : 0;
  }
  const page = list.slice(offset, offset + limit);
  const next = offset + limit < list.length ? Buffer.from(String(offset + limit)).toString('base64url') : null;
  return [200, paginatedEnvelope(page, { next_cursor: next })];
}

// ---- member attendance route (SP-MM) ---------------------------------------------
function memberAttendanceHandler(mid, query) {
  if (!memberOr404(mid)) return notFound(`Member ${mid} not found`);
  const all = memberVisits.get(mid) ?? [];
  let from; let to; let venueId; let offset = 0;
  const cursor = query.get('cursor');
  if (cursor) {
    try {
      ({ from, to, venueId, offset } = JSON.parse(Buffer.from(cursor, 'base64url').toString('utf8')));
    } catch {
      return badRequest('Invalid cursor');
    }
    for (const [param, value] of [['from', from], ['to', to], ['venue_id', venueId]]) {
      const sent = query.get(param);
      if (sent !== null && sent !== (value ?? '')) return badRequest(`${param} differs from the cursor`);
    }
  } else {
    to = query.get('to') ?? iso(now());
    from = query.get('from') ?? iso(new Date(new Date(to).getTime() - 30 * 86400_000));
    venueId = query.get('venue_id') ?? null;
  }
  const fromMs = Date.parse(from); const toMs = Date.parse(to);
  if (!Number.isFinite(fromMs) || !Number.isFinite(toMs)) return validationError([{ field: 'from', message: 'invalid' }]);
  if (fromMs >= toMs) return validationError([{ field: 'from', message: 'from must be before to' }]);
  if (toMs - fromMs > 366 * 86400_000) return validationError([{ field: 'from', message: 'range over 366 days' }]);
  const scoped = venueId ? all.filter((v) => v.venue_id === venueId) : all;
  const inRange = scoped.filter((v) => { const t = Date.parse(v.checked_in_at); return t >= fromMs && t < toMs; });
  const rawLimit = Number(query.get('limit'));
  const limit = Number.isFinite(rawLimit) && rawLimit > 0 ? Math.min(Math.floor(rawLimit), 100) : 50;
  const items = inRange.slice(offset, offset + limit);
  const nextOffset = offset + limit;
  return [200, envelope({
    from, to,
    total_visits: inRange.length,
    last_visit_at: scoped[0]?.checked_in_at ?? null,
    items,
    next_cursor: nextOffset < inRange.length
      ? Buffer.from(JSON.stringify({ from, to, venueId, offset: nextOffset })).toString('base64url')
      : null,
  })];
}

function setMemberAccessHandler(memberId, body, query) {
  const details = requireFields(body, ['scope']);
  if (details.length) return validationError(details);
  const member = members.find((m) => m.id === memberId);
  if (!member) return notFound(`Member ${memberId} not found`);
  const conflict = versionConflict(member, query);
  if (conflict) return conflict;
  member.access_scope = body.scope;
  touch(member);
  return [200, envelope(member)];
}

function suspendMemberHandler(memberId) {
  const member = members.find((m) => m.id === memberId);
  if (!member) return notFound(`Member ${memberId} not found`);
  if (member.membership_status !== 'active') return lifecycleConflict(member, 'suspend', 'active');
  member.membership_status = 'suspended';
  member.is_active = false;
  touch(member);
  return [204, ''];
}

function reactivateMemberHandler(memberId) {
  const member = members.find((m) => m.id === memberId);
  if (!member) return notFound(`Member ${memberId} not found`);
  if (member.membership_status !== 'suspended') {
    return lifecycleConflict(member, 'reactivate', 'suspended');
  }
  member.membership_status = 'active';
  member.is_active = true;
  touch(member);
  return [204, ''];
}

/** Future, non-cancelled bookings of this member at each venue about to be removed. */
function blockedVenues(member, nextVenueIds) {
  const current =
    member.access_scope === 'chain_wide'
      ? venues.map((v) => v.id)
      : (memberVenues.get(member.id) ?? []);
  const dropped = current.filter((id) => !nextVenueIds.includes(id));
  const today = dateOnly(now());
  const counts = new Map();
  for (const b of bookings) {
    if (b.member_id !== member.id || b.status === 'cancelled') continue;
    const slot = slots.find((s) => s.id === b.slot_id);
    if (!slot || !dropped.includes(slot.venue_id) || slot.date < today) continue;
    counts.set(slot.venue_id, (counts.get(slot.venue_id) ?? 0) + 1);
  }
  // Demo: Ndeye Faye (mbr-09) keeps two upcoming bookings at venue 2.
  if (member.id === 'mbr-09' && dropped.includes(VENUE_2)) {
    counts.set(VENUE_2, (counts.get(VENUE_2) ?? 0) + 2);
  }
  return [...counts].map(([venue_id, future_bookings]) => ({ venue_id, future_bookings }));
}

function setMemberVenuesHandler(memberId, body, query) {
  const details = requireFields(body, ['venue_ids']);
  if (details.length) return validationError(details);
  const member = members.find((m) => m.id === memberId);
  if (!member) return notFound(`Member ${memberId} not found`);
  const conflict = versionConflict(member, query);
  if (conflict) return conflict;
  const affected = blockedVenues(member, body.venue_ids);
  if (affected.length) {
    return [
      409,
      errorBody('ACCESS_DOWNSCOPE_BLOCKED', 'The member still has upcoming bookings there', {
        affected_venues: affected,
      }),
    ];
  }
  memberVenues.set(memberId, body.venue_ids);
  member.access_scope = 'venue_scoped';
  touch(member);
  return [200, envelope(body.venue_ids)];
}

// ---- subscriptions ----------------------------------------------------------------
function listSubscriptionsHandler(memberId, query) {
  const status = query.get('status');
  let list = subscriptions.filter((s) => s.member_id === memberId);
  if (status) list = list.filter((s) => s.status === status);
  return [200, envelope(list)];
}

function assignSubscriptionHandler(memberId, body) {
  const details = requireFields(body, ['plan_id']);
  if (details.length) return validationError(details);
  const member = members.find((m) => m.id === memberId);
  if (!member) return notFound(`Member ${memberId} not found`);
  const plan = plans.find((p) => p.id === body.plan_id);
  if (!plan) return validationError([{ field: 'plan_id', message: 'Plan introuvable.' }]);
  const startsOn = body.starts_on ?? dateOnly(now());
  const expiresOn = plan.duration_days
    ? dateOnly(new Date(new Date(startsOn).getTime() + plan.duration_days * 86_400_000))
    : undefined;
  const subscription = {
    id: newId('sub'),
    tenant_id: TENANT_ID,
    member_id: memberId,
    plan_id: plan.id,
    venue_id: plan.venue_id,
    status: 'active',
    payment_status: body.payment_status ?? 'unpaid',
    starts_on: startsOn,
    expires_on: expiresOn,
    entries_total: plan.entry_count,
    entries_remaining: plan.entry_count,
    price_amount_minor: plan.price_amount_minor,
    price_currency: plan.price_currency,
    plan_name: plan.name,
    plan_kind: plan.kind,
    venue_name: venues.find((v) => v.id === plan.venue_id)?.name ?? 'Salle',
    assigned_by_name: 'Fatou (accueil)',
    created_at: iso(now()),
    updated_at: iso(now()),
  };
  subscriptions.push(subscription);
  return [201, envelope(subscription)];
}

function updateSubscriptionHandler(memberId, subscriptionId, body) {
  const subscription = subscriptions.find(
    (s) => s.id === subscriptionId && s.member_id === memberId,
  );
  if (!subscription)
    return notFound(`Subscription ${subscriptionId} not found for member ${memberId}`);
  if (body?.payment_status !== undefined) subscription.payment_status = body.payment_status;
  if (body?.cancel === true) subscription.status = 'cancelled';
  subscription.updated_at = iso(now());
  return [200, envelope(subscription)];
}

// ---- check-ins ----------------------------------------------------------------------
const QR_TOKEN_RE = /^iwp1\./;

function checkInManualHandler(body) {
  const details = requireFields(body, ['booking_id', 'venue_id']);
  if (details.length) return validationError(details);
  const booking = bookings.find((b) => b.id === body.booking_id);
  if (!booking) return notFound(`Booking ${body.booking_id} not found`);
  if (!venues.some((v) => v.id === body.venue_id))
    return notFound(`Venue ${body.venue_id} not found`);
  if (booking.status === 'checked_in') return conflict('Cette réservation est déjà enregistrée.');
  booking.status = 'checked_in';
  booking.checked_in_at = iso(now());
  booking.updated_at = iso(now());
  const checkIn = mkCheckIn(
    newId('chk'),
    body.venue_id,
    booking.member_id,
    booking.pass_holder_id,
    'manual',
    iso(now()),
    booking.id,
    'user-reception-01',
  );
  checkIns.push(checkIn);
  return [201, envelope(checkIn)];
}

function checkInViaQrHandler(body) {
  const details = requireFields(body, ['qr_token', 'venue_id']);
  if (details.length) return validationError(details);
  if (!QR_TOKEN_RE.test(body.qr_token)) return badRequest('Jeton QR invalide.');
  if (!venues.some((v) => v.id === body.venue_id))
    return notFound(`Venue ${body.venue_id} not found`);
  // Fixed demo hook: resolves to the dedicated `bkg-qr-demo` booking.
  const booking = bookings.find((b) => b.id === 'bkg-qr-demo');
  if (booking.status === 'checked_in') return conflict('Cette réservation est déjà enregistrée.');
  booking.status = 'checked_in';
  booking.checked_in_at = iso(now());
  booking.updated_at = iso(now());
  const checkIn = mkCheckIn(
    newId('chk'),
    body.venue_id,
    booking.member_id,
    booking.pass_holder_id,
    'qr',
    iso(now()),
    booking.id,
    undefined,
  );
  checkIns.push(checkIn);
  return [201, envelope(checkIn)];
}

function checkInWalkinHandler(body) {
  const details = requireFields(body, ['member_id', 'venue_id']);
  if (details.length) return validationError(details);
  const member = members.find((m) => m.id === body.member_id);
  if (!member) return notFound(`Member ${body.member_id} not found`);
  const venue = venues.find((v) => v.id === body.venue_id);
  if (!venue) return notFound(`Venue ${body.venue_id} not found`);
  const dedupeMinutes = venue.settings.walkin_dedupe_minutes ?? 1440;
  if (memberCheckedInToday(body.member_id, body.venue_id, dedupeMinutes)) {
    return conflict("Ce membre a déjà pointé aujourd'hui à ce lieu.");
  }
  const checkIn = mkCheckIn(
    newId('chk'),
    body.venue_id,
    body.member_id,
    undefined,
    'manual',
    iso(now()),
    undefined,
    'user-reception-01',
  );
  checkIns.push(checkIn);
  return [201, envelope(checkIn)];
}

function checkInWalkinQrHandler(body) {
  const details = requireFields(body, ['qr_token', 'venue_id']);
  if (details.length) return validationError(details);
  if (!QR_TOKEN_RE.test(body.qr_token)) return badRequest('Jeton QR invalide.');
  const venue = venues.find((v) => v.id === body.venue_id);
  if (!venue) return notFound(`Venue ${body.venue_id} not found`);
  // Fixed demo hook: resolves to Khadija Ndoye (mbr-07), seeded with no check-in yet today.
  const memberId = 'mbr-07';
  const dedupeMinutes = venue.settings.walkin_dedupe_minutes ?? 1440;
  if (memberCheckedInToday(memberId, body.venue_id, dedupeMinutes)) {
    return conflict("Ce membre a déjà pointé aujourd'hui à ce lieu.");
  }
  const checkIn = mkCheckIn(
    newId('chk'),
    body.venue_id,
    memberId,
    undefined,
    'qr',
    iso(now()),
    undefined,
    undefined,
  );
  checkIns.push(checkIn);
  return [201, envelope(checkIn)];
}

function passCheckinHandler(body) {
  const details = requireFields(body, ['qr_token']);
  if (details.length) return validationError(details);
  if (!QR_TOKEN_RE.test(body.qr_token)) {
    return unauthorized('Jeton QR invalide ou émis pour un autre espace (tenant).');
  }
  // The real API resolves venue + pass holder from the token payload; the mock
  // always resolves to the primary venue and a fixed marketplace pass holder.
  const checkIn = mkCheckIn(
    newId('chk'),
    VENUE_1,
    undefined,
    'ph-mock-01',
    'qr',
    iso(now()),
    undefined,
    undefined,
  );
  checkIns.push(checkIn);
  return [201, envelope(checkIn)];
}

// =============================================================================
// Router
// =============================================================================
const routes = [
  {
    method: 'POST',
    pattern: /^\/platform\/v1\/mfa\/finalize$/,
    handler: () => finalizeMfaHandler(),
  },
  { method: 'GET', pattern: /^\/gms\/v1\/venues$/, handler: () => listVenuesHandler() },
  {
    method: 'POST',
    pattern: /^\/gms\/v1\/venues$/,
    handler: (_m, body) => createVenueHandler(body),
  },
  { method: 'GET', pattern: /^\/gms\/v1\/venues\/([^/]+)$/, handler: (m) => getVenueHandler(m[1]) },
  {
    method: 'PUT',
    pattern: /^\/gms\/v1\/venues\/([^/]+)$/,
    handler: (m, body) => updateVenueHandler(m[1], body),
  },
  {
    method: 'GET',
    pattern: /^\/gms\/v1\/venues\/([^/]+)\/today$/,
    handler: (m, _body, query) => todayHandler(m[1], query),
  },
  { method: 'GET', pattern: /^\/gms\/v1\/capabilities$/, handler: () => capabilitiesHandler() },

  {
    method: 'GET',
    pattern: /^\/gms\/v1\/venues\/([^/]+)\/activities$/,
    handler: (m) => listVenueActivitiesHandler(m[1]),
  },
  {
    method: 'POST',
    pattern: /^\/gms\/v1\/venues\/([^/]+)\/activities$/,
    handler: (m, body) => addVenueActivityHandler(m[1], body),
  },
  {
    method: 'DELETE',
    pattern: /^\/gms\/v1\/venues\/([^/]+)\/activities\/([^/]+)$/,
    handler: (m) => removeVenueActivityHandler(m[1], m[2]),
  },

  {
    method: 'GET',
    pattern: /^\/gms\/v1\/venues\/([^/]+)\/plans$/,
    handler: (m, _b, q) => listPlansHandler(m[1], q),
  },
  {
    method: 'POST',
    pattern: /^\/gms\/v1\/venues\/([^/]+)\/plans$/,
    handler: (m, body) => createPlanHandler(m[1], body),
  },
  {
    method: 'PUT',
    pattern: /^\/gms\/v1\/venues\/([^/]+)\/plans\/([^/]+)$/,
    handler: (m, body) => updatePlanHandler(m[1], m[2], body),
  },
  {
    method: 'DELETE',
    pattern: /^\/gms\/v1\/venues\/([^/]+)\/plans\/([^/]+)$/,
    handler: (m) => archivePlanHandler(m[1], m[2]),
  },

  {
    method: 'GET',
    pattern: /^\/gms\/v1\/venues\/([^/]+)\/resources$/,
    handler: (m) => listResourcesHandler(m[1]),
  },
  {
    method: 'POST',
    pattern: /^\/gms\/v1\/venues\/([^/]+)\/resources$/,
    handler: (m, body) => createResourceHandler(m[1], body),
  },
  {
    method: 'PUT',
    pattern: /^\/gms\/v1\/venues\/([^/]+)\/resources\/([^/]+)$/,
    handler: (m, body) => updateResourceHandler(m[1], m[2], body),
  },
  {
    method: 'DELETE',
    pattern: /^\/gms\/v1\/venues\/([^/]+)\/resources\/([^/]+)$/,
    handler: (m) => deleteResourceHandler(m[1], m[2]),
  },

  {
    method: 'POST',
    pattern: /^\/gms\/v1\/venues\/([^/]+)\/images\/presign$/,
    handler: (m, body) => presignImageHandler(m[1], body),
  },
  {
    method: 'PUT',
    pattern: /^\/gms\/v1\/venues\/([^/]+)\/images\/order$/,
    handler: (m, body) => reorderImagesHandler(m[1], body),
  },
  {
    method: 'GET',
    pattern: /^\/gms\/v1\/venues\/([^/]+)\/images$/,
    handler: (m) => listImagesHandler(m[1]),
  },
  {
    method: 'POST',
    pattern: /^\/gms\/v1\/venues\/([^/]+)\/images$/,
    handler: (m, body) => registerImageHandler(m[1], body),
  },
  {
    method: 'DELETE',
    pattern: /^\/gms\/v1\/venues\/([^/]+)\/images\/([^/]+)$/,
    handler: (m) => deleteImageHandler(m[1], m[2]),
  },

  {
    method: 'GET',
    pattern: /^\/gms\/v1\/venues\/([^/]+)\/attendance$/,
    handler: (m, _b, q) => getAttendanceHandler(m[1], q),
  },
  {
    method: 'GET',
    pattern: /^\/gms\/v1\/venues\/([^/]+)\/checkins$/,
    handler: (m, _b, q) => listCheckInsHandler(m[1], q),
  },

  {
    method: 'GET',
    pattern: /^\/gms\/v1\/venues\/([^/]+)\/schedules$/,
    handler: (m) => listSchedulesHandler(m[1]),
  },
  {
    method: 'POST',
    pattern: /^\/gms\/v1\/venues\/([^/]+)\/schedules$/,
    handler: (m, body) => createScheduleHandler(m[1], body),
  },
  {
    method: 'PUT',
    pattern: /^\/gms\/v1\/schedules\/([^/]+)$/,
    handler: (m, body) => updateScheduleHandler(m[1], body),
  },
  {
    method: 'DELETE',
    pattern: /^\/gms\/v1\/schedules\/([^/]+)$/,
    handler: (m, _b, q) => cancelScheduleHandler(m[1], q),
  },
  {
    method: 'GET',
    pattern: /^\/gms\/v1\/schedules\/([^/]+)\/cancellation-preview$/,
    handler: (m) => scheduleCancellationPreviewHandler(m[1]),
  },

  {
    method: 'GET',
    pattern: /^\/gms\/v1\/venues\/([^/]+)\/slots$/,
    handler: (m, _b, q) => listSlotsHandler(m[1], q),
  },
  {
    method: 'PUT',
    pattern: /^\/gms\/v1\/slots\/([^/]+)\/cancel$/,
    handler: (m, _b, q) => cancelSlotHandler(m[1], q),
  },
  {
    method: 'GET',
    pattern: /^\/gms\/v1\/slots\/([^/]+)\/cancellation-preview$/,
    handler: (m) => slotCancellationPreviewHandler(m[1]),
  },

  {
    method: 'GET',
    pattern: /^\/gms\/v1\/slots\/([^/]+)\/bookings$/,
    handler: (m) => listBookingsForSlotHandler(m[1]),
  },
  {
    method: 'POST',
    pattern: /^\/gms\/v1\/slots\/([^/]+)\/bookings$/,
    handler: (m, body) => createBookingHandler(m[1], body),
  },
  {
    method: 'PUT',
    pattern: /^\/gms\/v1\/bookings\/([^/]+)\/cancel$/,
    handler: (m, body) => cancelBookingHandler(m[1], body),
  },

  {
    method: 'GET',
    pattern: /^\/gms\/v1\/resource-types$/,
    handler: () => listResourceTypesHandler(),
  },
  {
    method: 'POST',
    pattern: /^\/gms\/v1\/resource-types$/,
    handler: (_m, body) => createResourceTypeHandler(body),
  },

  { method: 'GET', pattern: /^\/gms\/v1\/staff$/, handler: () => listStaffHandler() },
  {
    method: 'POST',
    pattern: /^\/gms\/v1\/staff\/invite$/,
    handler: (_m, body) => inviteStaffHandler(body),
  },
  {
    method: 'DELETE',
    pattern: /^\/gms\/v1\/staff\/([^/]+)$/,
    handler: (m) => removeStaffHandler(m[1]),
  },
  {
    method: 'PUT',
    pattern: /^\/gms\/v1\/staff\/([^/]+)\/role$/,
    handler: (m, body) => changeRoleHandler(m[1], body),
  },
  {
    method: 'PUT',
    pattern: /^\/gms\/v1\/staff\/([^/]+)\/venues$/,
    handler: (m, body) => setStaffVenuesHandler(m[1], body),
  },

  { method: 'GET', pattern: /^\/gms\/v1\/members$/, handler: (_m, _b, q) => listMembersHandler(q) },
  {
    method: 'POST',
    pattern: /^\/gms\/v1\/members$/,
    handler: (_m, body) => registerMemberHandler(body),
  },
  { method: 'POST', pattern: /^\/gms\/v1\/members\/search$/, handler: (_m, b) => searchMembersHandler(b) },
  { method: 'GET', pattern: /^\/gms\/v1\/members\/([^/]+)\/attendance$/, handler: (m, _b, q) => memberAttendanceHandler(m[1], q) },
  { method: 'POST', pattern: /^\/gms\/v1\/members\/([^/]+)\/invitation-resend$/, handler: (m) => invitationResendHandler(m[1]) },
  { method: 'POST', pattern: /^\/gms\/v1\/members\/([^/]+)\/session-revocation$/, handler: (m) => sessionRevocationHandler(m[1]) },
  { method: 'POST', pattern: /^\/gms\/v1\/members\/([^/]+)\/email-change$/, handler: (m, b, _q, h) => emailChangeHandler(m[1], b, h) },
  { method: 'GET', pattern: /^\/gms\/v1\/tenant\/settings$/, handler: () => getTenantSettingsHandler() },
  { method: 'PATCH', pattern: /^\/gms\/v1\/tenant\/settings$/, handler: (_m, b) => patchTenantSettingsHandler(b) },
  {
    method: 'GET',
    pattern: /^\/gms\/v1\/members\/([^/]+)$/,
    handler: (m) => getMemberHandler(m[1]),
  },
  {
    method: 'PUT',
    pattern: /^\/gms\/v1\/members\/([^/]+)$/,
    handler: (m, body, q) => updateMemberHandler(m[1], body, q),
  },
  {
    method: 'PUT',
    pattern: /^\/gms\/v1\/members\/([^/]+)\/access$/,
    handler: (m, body, q) => setMemberAccessHandler(m[1], body, q),
  },
  {
    method: 'PUT',
    pattern: /^\/gms\/v1\/members\/([^/]+)\/suspend$/,
    handler: (m) => suspendMemberHandler(m[1]),
  },
  {
    method: 'PUT',
    pattern: /^\/gms\/v1\/members\/([^/]+)\/reactivate$/,
    handler: (m) => reactivateMemberHandler(m[1]),
  },
  {
    method: 'PUT',
    pattern: /^\/gms\/v1\/members\/([^/]+)\/venues$/,
    handler: (m, body, q) => setMemberVenuesHandler(m[1], body, q),
  },

  {
    method: 'GET',
    pattern: /^\/gms\/v1\/members\/([^/]+)\/subscriptions$/,
    handler: (m, _b, q) => listSubscriptionsHandler(m[1], q),
  },
  {
    method: 'POST',
    pattern: /^\/gms\/v1\/members\/([^/]+)\/subscriptions$/,
    handler: (m, body) => assignSubscriptionHandler(m[1], body),
  },
  {
    method: 'PUT',
    pattern: /^\/gms\/v1\/members\/([^/]+)\/subscriptions\/([^/]+)$/,
    handler: (m, body) => updateSubscriptionHandler(m[1], m[2], body),
  },

  {
    method: 'POST',
    pattern: /^\/gms\/v1\/checkins\/manual$/,
    handler: (_m, body) => checkInManualHandler(body),
  },
  {
    method: 'POST',
    pattern: /^\/gms\/v1\/checkins\/qr$/,
    handler: (_m, body) => checkInViaQrHandler(body),
  },
  {
    method: 'POST',
    pattern: /^\/gms\/v1\/checkins\/walkin$/,
    handler: (_m, body) => checkInWalkinHandler(body),
  },
  {
    method: 'POST',
    pattern: /^\/gms\/v1\/checkins\/walkin\/qr$/,
    handler: (_m, body) => checkInWalkinQrHandler(body),
  },

  {
    method: 'POST',
    pattern: /^\/platform\/v1\/checkins\/pass$/,
    handler: (_m, body) => passCheckinHandler(body),
  },
];

function dispatch(method, pathname, body, query, headers) {
  if (method === 'GET' && pathname === '/health') {
    return [200, JSON.stringify({ service: 'iziwellpass-owner-mock', status: 'ok' })];
  }
  const gated = featureGate(method, pathname);
  if (gated) return gated;
  for (const route of routes) {
    if (route.method !== method) continue;
    const match = route.pattern.exec(pathname);
    if (match) return route.handler(match, body, query, headers);
  }
  return [404, errorBody('NOT_FOUND', `No mock route for ${method} ${pathname}`)];
}

// =============================================================================
// HTTP server
// =============================================================================
http
  .createServer(async (req, res) => {
    const url = new URL(req.url ?? '/', 'http://internal');

    const chunks = [];
    try {
      for await (const chunk of req) chunks.push(chunk);
    } catch {
      // The client went away mid-body (an upload aborted on navigation): nothing to answer.
      console.log(`[mock] ${req.method} ${url.pathname} -> aborted by client`);
      return;
    }
    const raw = Buffer.concat(chunks);

    if (url.pathname.startsWith('/__media/')) {
      let key;
      try {
        key = decodeURIComponent(url.pathname.slice('/__media/'.length));
      } catch {
        console.log(`[mock] ${req.method} ${url.pathname} -> 400 (malformed key)`);
        res.writeHead(400, { 'content-type': 'application/json' });
        res.end(errorBody('VALIDATION_ERROR', 'Malformed media key'));
        return;
      }
      if (req.method === 'PUT') {
        media.set(key, {
          contentType: req.headers['content-type'] ?? 'application/octet-stream',
          bytes: raw,
        });
        console.log(`[mock] PUT /__media/${key} (${raw.length} bytes) -> 200`);
        res.writeHead(200);
        res.end();
        return;
      }
      if (req.method === 'GET') {
        const stored = media.get(key);
        res.writeHead(
          stored ? 200 : 404,
          stored ? { 'content-type': stored.contentType, 'cache-control': 'no-store' } : {},
        );
        res.end(stored ? stored.bytes : undefined);
        return;
      }
      res.writeHead(405);
      res.end();
      return;
    }

    const rawBody = raw.toString('utf8');
    let body;
    if (rawBody) {
      try {
        body = JSON.parse(rawBody);
      } catch {
        body = {};
      }
    }

    if (url.pathname !== '/health' && !req.headers.authorization) {
      const [status, out] = [401, errorBody('UNAUTHORIZED', 'Missing bearer token')];
      console.log(`[mock] ${req.method} ${url.pathname} -> ${status}`);
      res.writeHead(status, { 'content-type': 'application/json' });
      res.end(out);
      return;
    }

    const [status, out] =
      mfaGate(url.pathname, req.headers.authorization) ??
      dispatch(req.method ?? 'GET', url.pathname, body, url.searchParams, req.headers);
    console.log(`[mock] ${req.method} ${url.pathname} -> ${status}`);
    if (status === 204) {
      res.writeHead(204);
      res.end();
      return;
    }
    res.writeHead(status, { 'content-type': 'application/json' });
    res.end(out);
  })
  .listen(PORT, () => {
    console.log(
      `[mock] owner API mock on http://localhost:${PORT} (plan ${MOCK_PLAN}${MOCK_MFA ? ', MFA required' : ''}, state resets on restart)`,
    );
  });
