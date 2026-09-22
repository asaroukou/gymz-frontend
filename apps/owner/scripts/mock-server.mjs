// Mock app-plane server for owner-app dev: real Cognito login, fake data.
// Serves the `/gms/v1/*` app-plane routes the owner app calls, plus the
// `/platform/v1/checkins/pass` app-plane route (marketplace pass check-in).
// Control-plane routes (/platform/v1/auth|onboarding|admin|billing) are
// out of scope — the app never calls them through this proxy target.
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
    undefined,
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
  return {
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
    is_active: true,
    notes: undefined,
    user_id: email ? `user-${id}` : undefined,
    created_at: iso(daysFromNow(startDaysOffset)),
    updated_at: iso(daysFromNow(Math.max(startDaysOffset, -30))),
  };
}

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
    assigned_by: 'user-reception-01',
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
    user_id: body.email ? newId('user') : undefined,
    created_at: iso(now()),
    updated_at: iso(now()),
  };
  members.push(member);
  memberVenues.set(id, body.venue_ids ?? []);
  return [201, envelope(member)];
}

function getMemberHandler(memberId) {
  const member = members.find((m) => m.id === memberId);
  if (!member) return notFound(`Member ${memberId} not found`);
  return [200, envelope(member)];
}

function updateMemberHandler(memberId, body) {
  const member = members.find((m) => m.id === memberId);
  if (!member) return notFound(`Member ${memberId} not found`);
  for (const key of [
    'email',
    'first_name',
    'is_active',
    'last_name',
    'membership_end',
    'membership_type',
    'notes',
    'phone',
  ]) {
    if (body?.[key] !== undefined) member[key] = body[key];
  }
  member.updated_at = iso(now());
  return [200, envelope(member)];
}

function setMemberAccessHandler(memberId, body) {
  const details = requireFields(body, ['scope']);
  if (details.length) return validationError(details);
  const member = members.find((m) => m.id === memberId);
  if (!member) return notFound(`Member ${memberId} not found`);
  member.access_scope = body.scope;
  member.updated_at = iso(now());
  return [200, envelope(member)];
}

function suspendMemberHandler(memberId) {
  const member = members.find((m) => m.id === memberId);
  if (!member) return notFound(`Member ${memberId} not found`);
  member.membership_status = 'suspended';
  member.updated_at = iso(now());
  return [200, envelope(member)];
}

function setMemberVenuesHandler(memberId, body) {
  const details = requireFields(body, ['venue_ids']);
  if (details.length) return validationError(details);
  const member = members.find((m) => m.id === memberId);
  if (!member) return notFound(`Member ${memberId} not found`);
  memberVenues.set(memberId, body.venue_ids);
  member.access_scope = 'venue_scoped';
  member.updated_at = iso(now());
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
    assigned_by: 'user-reception-01',
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
  {
    method: 'GET',
    pattern: /^\/gms\/v1\/members\/([^/]+)$/,
    handler: (m) => getMemberHandler(m[1]),
  },
  {
    method: 'PUT',
    pattern: /^\/gms\/v1\/members\/([^/]+)$/,
    handler: (m, body) => updateMemberHandler(m[1], body),
  },
  {
    method: 'PUT',
    pattern: /^\/gms\/v1\/members\/([^/]+)\/access$/,
    handler: (m, body) => setMemberAccessHandler(m[1], body),
  },
  {
    method: 'PUT',
    pattern: /^\/gms\/v1\/members\/([^/]+)\/suspend$/,
    handler: (m) => suspendMemberHandler(m[1]),
  },
  {
    method: 'PUT',
    pattern: /^\/gms\/v1\/members\/([^/]+)\/venues$/,
    handler: (m, body) => setMemberVenuesHandler(m[1], body),
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

function dispatch(method, pathname, body, query) {
  if (method === 'GET' && pathname === '/health') {
    return [200, JSON.stringify({ service: 'iziwellpass-owner-mock', status: 'ok' })];
  }
  for (const route of routes) {
    if (route.method !== method) continue;
    const match = route.pattern.exec(pathname);
    if (match) return route.handler(match, body, query);
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
    for await (const chunk of req) chunks.push(chunk);
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

    const [status, out] = dispatch(req.method ?? 'GET', url.pathname, body, url.searchParams);
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
    console.log(`[mock] owner API mock on http://localhost:${PORT} (state resets on restart)`);
  });
