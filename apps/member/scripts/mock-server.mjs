// Mock app-plane server for member-app dev: real Cognito login, fake data.
// Use when no member account exists (staging invitation emails undeliverable):
// sign in with any Main-pool account (e.g. your owner account) — this server
// ignores who you are for authorization and serves a consistent mock member,
// personalized from your ID token's claims.
//
// Usage:
//   pnpm dev:mock        # localhost:8082, same port as dev-proxy — point
//                        # EXPO_PUBLIC_API_BASE_URL=http://localhost:8082
//                        # (restart `expo start` after changing .env.local)
// Serves ONLY /gms/v1/me* (+ /health); everything else 404s loudly.
// Switches (read once at start):
//   MOCK_CARD=active|pack|expired|none   subscription shape for the Carte states (default active)
//   MOCK_BOOKINGS=empty                  /me/bookings returns []
//   MOCK_QR=unavailable                  POST /me/qr answers 403 FEATURE_NOT_AVAILABLE
//   MOCK_QR_TTL=<seconds>                QR token lifetime (default 300, the backend's)
// In-memory state: cancelling a booking flips it to `cancelled`; booking
// `bkg-fenetre` always answers 409 (cancellation window closed). Restart to reset.
import http from 'node:http';

const PORT = Number(process.env.PORT ?? 8082);

const CORS_HEADERS = {
  'access-control-allow-origin': '*',
  'access-control-allow-methods': 'GET,POST,PUT,PATCH,DELETE,OPTIONS',
  'access-control-allow-headers': 'authorization,content-type',
  'access-control-max-age': '86400',
};

const VENUE_ID = 'venue-mock-dakar-01';
const iso = (d) => d.toISOString();
const daysFromNow = (n) => new Date(Date.now() + n * 86_400_000);
const atLocal = (dayOffset, hh, mm) => {
  const d = daysFromNow(dayOffset);
  d.setHours(hh, mm, 0, 0);
  return d;
};

const MOCK_CARD = process.env.MOCK_CARD ?? 'active';
const MOCK_BOOKINGS = process.env.MOCK_BOOKINGS ?? '';
const MOCK_QR = process.env.MOCK_QR ?? '';

const slots = [
  ['slot-yoga-lun', 2, 6, 30, 60],
  ['slot-yoga-mer', 4, 6, 30, 60],
  ['slot-boxe-ven', 6, 18, 0, 60],
  ['slot-yoga-passe', -1, 6, 30, 60],
  ['slot-boxe-passe', -3, 18, 0, 60],
  ['slot-tres-ancien', -45, 7, 0, 60],
].map(([id, day, hh, mm, dur]) => {
  const start = atLocal(day, hh, mm);
  return {
    id,
    tenant_id: 'tenant-mock',
    venue_id: VENUE_ID,
    schedule_id: `sch-${id}`,
    resource_id: 'res-mock',
    date: iso(start).slice(0, 10),
    start_time: iso(start),
    end_time: iso(new Date(start.getTime() + dur * 60_000)),
    capacity: 16,
    booked_count: 8,
    status: 'available',
    created_at: iso(daysFromNow(-60)),
  };
});

const mkBooking = (id, slotId, status, extra = {}) => ({
  id,
  slot_id: slotId,
  status,
  source: 'member_app',
  tenant_id: 'tenant-mock',
  member_id: 'mbr-mock-01',
  booked_at: iso(daysFromNow(-10)),
  created_at: iso(daysFromNow(-10)),
  updated_at: iso(daysFromNow(-10)),
  ...extra,
});

// --- mutable state (reset on restart) ---------------------------------------
const bookings =
  MOCK_BOOKINGS === 'empty'
    ? []
    : [
        mkBooking('bkg-confirmee', 'slot-yoga-lun', 'confirmed'),
        mkBooking('bkg-fenetre', 'slot-yoga-mer', 'confirmed'),
        mkBooking('bkg-boxe', 'slot-boxe-ven', 'confirmed'),
        mkBooking('bkg-enregistree', 'slot-yoga-passe', 'checked_in', { checked_in_at: iso(atLocal(-1, 6, 28)) }),
        mkBooking('bkg-absent', 'slot-boxe-passe', 'no_show'),
        mkBooking('bkg-hors-fenetre', 'slot-tres-ancien', 'checked_in'),
      ];

// --- helpers -----------------------------------------------------------------
let requestSeq = 0;
const envelope = (data) => JSON.stringify({ data, request_id: `req_mock${++requestSeq}` });
const errorBody = (status, code, message) =>
  JSON.stringify({ error: { code, message }, request_id: `req_mock${++requestSeq}` });

function claimsFrom(req) {
  // Best-effort decode of the (real) Cognito ID token to personalize the mock.
  try {
    const token = (req.headers.authorization ?? '').replace(/^Bearer /i, '');
    const payload = token.split('.')[1];
    return JSON.parse(Buffer.from(payload, 'base64url').toString('utf8'));
  } catch {
    return {};
  }
}

function profileFor(claims) {
  const email = typeof claims.email === 'string' ? claims.email : 'membre@example.com';
  const given = typeof claims.given_name === 'string' ? claims.given_name : null;
  return {
    id: 'mbr-mock-01',
    first_name: given ?? email.split('@')[0],
    last_name: given ? 'Ndiaye' : '(mock)',
    email,
    phone: '+221 77 123 45 67',
    membership_start: iso(atLocal(-200, 9, 0)),
    membership_end: iso(daysFromNow(275)),
    membership_status: 'active',
    membership_type: 'monthly',
    access_scope: 'single_venue',
  };
}

const SUBSCRIPTION_SHAPES = {
  active: { status: 'active', entries_remaining: null, expires_on: iso(daysFromNow(10)).slice(0, 10) },
  pack: { status: 'active', entries_remaining: 3, expires_on: iso(daysFromNow(40)).slice(0, 10) },
  expired: { status: 'expired', entries_remaining: null, expires_on: iso(daysFromNow(-20)).slice(0, 10) },
};
const subscriptions =
  MOCK_CARD === 'none'
    ? []
    : [
        {
          id: 'sub-mock-01',
          plan_id: 'plan-mensuel',
          venue_id: VENUE_ID,
          payment_status: 'paid',
          ...(SUBSCRIPTION_SHAPES[MOCK_CARD] ?? SUBSCRIPTION_SHAPES.active),
        },
      ];

// --- routes ------------------------------------------------------------------
function handle(req, url, claims) {
  const { pathname, searchParams } = new URL(url, 'http://mock');
  const cancelMatch = pathname.match(/^\/gms\/v1\/me\/bookings\/([^/]+)\/cancel$/);

  if (req.method === 'GET' && pathname === '/health') {
    return [200, JSON.stringify({ service: 'iziwellpass-mock', status: 'ok' })];
  }
  if (!req.headers.authorization) {
    return [401, errorBody(401, 'UNAUTHORIZED', 'Missing bearer token')];
  }
  if (req.method === 'GET' && pathname === '/gms/v1/me') {
    return [200, envelope(profileFor(claims))];
  }
  if (req.method === 'GET' && pathname === '/gms/v1/me/memberships') {
    return [
      200,
      envelope([
        { venue_id: VENUE_ID, gym_name: 'Studio Dakar Plateau', member_id: 'mbr-mock-01', tenant_id: 'tenant-mock' },
      ]),
    ];
  }
  if (req.method === 'GET' && pathname === '/gms/v1/me/slots') {
    const from = searchParams.get('from');
    const to = searchParams.get('to') ?? from;
    if (searchParams.get('venue_id') !== VENUE_ID || !from) {
      return [400, errorBody(400, 'VALIDATION_ERROR', 'venue_id and from are required')];
    }
    return [200, envelope(slots.filter((s) => s.date >= from && s.date <= to))];
  }
  if (req.method === 'GET' && pathname === '/gms/v1/me/subscription') {
    return [200, envelope(subscriptions)];
  }
  if (req.method === 'GET' && pathname === '/gms/v1/me/venues') {
    return [200, envelope([VENUE_ID])];
  }
  if (req.method === 'GET' && pathname === '/gms/v1/me/bookings') {
    return [200, envelope(bookings)];
  }
  if (req.method === 'POST' && pathname === '/gms/v1/me/qr') {
    if (MOCK_QR === 'unavailable') {
      return [403, errorBody(403, 'FEATURE_NOT_AVAILABLE', 'Feature not available: member_qr')];
    }
    return [
      200,
      envelope({
        token: `iwp1.${Buffer.from(`mock:${Date.now()}`).toString('base64url')}.mockmac`,
        expires_at: Math.floor(Date.now() / 1000) + Number(process.env.MOCK_QR_TTL ?? 300),
      }),
    ];
  }
  if (req.method === 'POST' && cancelMatch) {
    const bid = cancelMatch[1];
    if (bid === 'bkg-fenetre') {
      return [409, errorBody(409, 'CONFLICT', 'Cancellation window has closed')];
    }
    const booking = bookings.find((b) => b.id === bid);
    if (!booking) return [404, errorBody(404, 'NOT_FOUND', 'Booking not found')];
    booking.status = 'cancelled';
    booking.cancelled_at = iso(new Date());
    booking.updated_at = iso(new Date());
    return [200, envelope(booking)];
  }
  return [404, errorBody(404, 'NOT_FOUND', `mock has no route for ${req.method} ${pathname}`)];
}

http
  .createServer(async (req, res) => {
    if (req.method === 'OPTIONS') {
      res.writeHead(204, CORS_HEADERS);
      res.end();
      return;
    }
    // Drain the body; the mock never reads request payloads.
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    for await (const chunk of req) {
      /* drained */
    }
    const [status, body] = handle(req, req.url ?? '/', claimsFrom(req));
    console.log(`[mock] ${req.method} ${req.url} -> ${status}`);
    res.writeHead(status, { ...CORS_HEADERS, 'content-type': 'application/json' });
    res.end(body);
  })
  .listen(PORT, () => {
    console.log(`[mock] member API mock on http://localhost:${PORT} (card ${MOCK_CARD}${MOCK_BOOKINGS ? ', bookings ' + MOCK_BOOKINGS : ''}${MOCK_QR ? ', qr ' + MOCK_QR : ''})`);
  });
