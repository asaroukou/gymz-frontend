// Local CORS proxy for WEB dev only (`expo start` → browser). Native targets
// (Expo Go, simulators) call the gateway directly and never need this: CORS is
// a browser mechanism, and the staging gateway allows no localhost origins.
//
// Usage:
//   pnpm dev:proxy                       # localhost:8082 -> staging app plane
//   API_PROXY_TARGET=<url> pnpm dev:proxy
// then set EXPO_PUBLIC_API_BASE_URL=http://localhost:8082 in .env.local and
// restart `expo start` (EXPO_PUBLIC_* values are inlined at bundle time).
import http from 'node:http';

const TARGET =
  process.env.API_PROXY_TARGET ?? 'https://i6ekmmxyu5.execute-api.eu-west-1.amazonaws.com/v1';
const PORT = Number(process.env.PORT ?? 8082);

const CORS_HEADERS = {
  'access-control-allow-origin': '*',
  'access-control-allow-methods': 'GET,POST,PUT,PATCH,DELETE,OPTIONS',
  'access-control-allow-headers': 'authorization,content-type',
  'access-control-max-age': '86400',
};

http
  .createServer(async (req, res) => {
    if (req.method === 'OPTIONS') {
      res.writeHead(204, CORS_HEADERS);
      res.end();
      return;
    }

    const chunks = [];
    for await (const chunk of req) chunks.push(chunk);
    const body = chunks.length > 0 ? Buffer.concat(chunks) : undefined;

    const headers = {};
    if (req.headers.authorization) headers.authorization = req.headers.authorization;
    if (req.headers['content-type']) headers['content-type'] = req.headers['content-type'];

    try {
      const upstream = await fetch(`${TARGET}${req.url}`, { method: req.method, headers, body });
      const payload = Buffer.from(await upstream.arrayBuffer());
      res.writeHead(upstream.status, {
        ...CORS_HEADERS,
        'content-type': upstream.headers.get('content-type') ?? 'application/json',
      });
      res.end(payload);
    } catch (err) {
      console.error('[dev-proxy] upstream error:', err);
      res.writeHead(502, { ...CORS_HEADERS, 'content-type': 'application/json' });
      res.end(JSON.stringify({ error: { code: 'PROXY_ERROR', message: 'upstream unreachable' } }));
    }
  })
  .listen(PORT, () => {
    console.log(`[dev-proxy] http://localhost:${PORT} -> ${TARGET}`);
  });
