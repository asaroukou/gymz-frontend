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
// In-memory state: cancelling a booking really flips it to `cancelled`;
// booking `bkg-fenetre` always answers 409 (cancellation window closed) so the
// dedicated error UX is testable. Restart to reset.
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

// --- mutable state (reset on restart) ---------------------------------------
const bookings = [
  {
    id: 'bkg-confirmee',
    slot_id: 'slot-yoga-0630',
    status: 'confirmed',
    source: 'member_app',
    tenant_id: 'tenant-mock',
    member_id: 'mbr-mock-01',
    booked_at: iso(daysFromNow(1)),
    created_at: iso(daysFromNow(-1)),
    updated_at: iso(daysFromNow(-1)),
  },
  {
    id: 'bkg-fenetre',
    slot_id: 'slot-crossfit-1800',
    status: 'confirmed',
    source: 'member_app',
    tenant_id: 'tenant-mock',
    member_id: 'mbr-mock-01',
    booked_at: iso(daysFromNow(0.05)),
    created_at: iso(daysFromNow(-2)),
    updated_at: iso(daysFromNow(-2)),
  },
  {
    id: 'bkg-enregistree',
    slot_id: 'slot-danse-1900',
    status: 'checked_in',
    source: 'front_desk',
    tenant_id: 'tenant-mock',
    member_id: 'mbr-mock-01',
    booked_at: iso(daysFromNow(-3)),
    checked_in_at: iso(daysFromNow(-3)),
    created_at: iso(daysFromNow(-4)),
    updated_at: iso(daysFromNow(-3)),
  },
  {
    id: 'bkg-absent',
    slot_id: 'slot-piscine-0700',
    status: 'no_show',
    source: 'member_app',
    tenant_id: 'tenant-mock',
    member_id: 'mbr-mock-01',
    booked_at: iso(daysFromNow(-7)),
    created_at: iso(daysFromNow(-8)),
    updated_at: iso(daysFromNow(-7)),
  },
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
    last_name: given ? '' : '(mock)',
    email,
    phone: '+221 77 123 45 67',
    membership_start: iso(daysFromNow(-90)),
    membership_end: iso(daysFromNow(275)),
    membership_status: 'active',
    membership_type: 'standard',
    access_scope: 'single_venue',
  };
}

const subscriptions = [
  {
    id: 'sub-mock-01',
    plan_id: 'plan-trimestriel',
    venue_id: VENUE_ID,
    status: 'active',
    payment_status: 'paid',
    entries_remaining: 12,
    expires_on: iso(daysFromNow(58)).slice(0, 10),
  },
];

// --- routes ------------------------------------------------------------------
function handle(req, url, claims) {
  const cancelMatch = url.match(/^\/gms\/v1\/me\/bookings\/([^/]+)\/cancel$/);

  if (req.method === 'GET' && url === '/health') {
    return [200, JSON.stringify({ service: 'iziwellpass-mock', status: 'ok' })];
  }
  if (!req.headers.authorization) {
    return [401, errorBody(401, 'UNAUTHORIZED', 'Missing bearer token')];
  }
  if (req.method === 'GET' && url === '/gms/v1/me') {
    return [200, envelope(profileFor(claims))];
  }
  if (req.method === 'GET' && url === '/gms/v1/me/subscription') {
    return [200, envelope(subscriptions)];
  }
  if (req.method === 'GET' && url === '/gms/v1/me/venues') {
    return [200, envelope([VENUE_ID])];
  }
  if (req.method === 'GET' && url === '/gms/v1/me/bookings') {
    return [200, envelope(bookings)];
  }
  if (req.method === 'POST' && url === '/gms/v1/me/qr') {
    return [
      200,
      envelope({
        token: `iwp1.${Buffer.from(`mock:${Date.now()}`).toString('base64url')}.mockmac`,
        expires_at: Math.floor(Date.now() / 1000) + 300,
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
  return [404, errorBody(404, 'NOT_FOUND', `mock has no route for ${req.method} ${url}`)];
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
    console.log(`[mock] member API mock on http://localhost:${PORT} (state resets on restart)`);
  });
