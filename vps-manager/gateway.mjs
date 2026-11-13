// Experimental: not enabled in production. One isolated gateway per app.
import { createServer, request as httpRequest } from 'node:http';

const COOKIE = '__Host-aula_session';
const SAFE = new Set(['GET', 'HEAD', 'OPTIONS']);
const HOP = new Set(['connection', 'proxy-connection', 'keep-alive', 'transfer-encoding', 'upgrade', 'te', 'trailer']);

function sessionCookie(header) {
  const values = (header || '').split(';').map(part => part.trim()).filter(part => part.startsWith(`${COOKIE}=`));
  return values.length === 1 ? values[0].slice(COOKIE.length + 1) : null;
}

function upstreamHeaders(req, externalHost, websocket = false) {
  const headers = {};
  const nominated = new Set((req.headers.connection || '').toLowerCase().split(',').map(v => v.trim()));
  for (const [key, value] of Object.entries(req.headers)) {
    if (HOP.has(key) || nominated.has(key) || ['host', 'forwarded', 'x-real-ip', 'x-original-url', 'x-rewrite-url', 'proxy-authorization'].includes(key) || key.startsWith('x-forwarded-') || key.startsWith('oai-') || key.startsWith('x-aula-')) continue;
    if (key === 'cookie') {
      const cookies = String(value).split(';').map(v => v.trim()).filter(v => !v.startsWith(`${COOKIE}=`));
      if (cookies.length) headers.cookie = cookies.join('; ');
    } else headers[key] = value;
  }
  headers.host = externalHost;
  headers['x-forwarded-host'] = externalHost;
  headers['x-forwarded-proto'] = 'https';
  if (websocket) { headers.connection = 'Upgrade'; headers.upgrade = 'websocket'; }
  return headers;
}

function copyResponseHeaders(headers) {
  const result = {};
  const nominated = new Set((headers.connection || '').toLowerCase().split(',').map(v => v.trim()));
  for (const [key, value] of Object.entries(headers)) {
    if (HOP.has(key) || nominated.has(key)) continue;
    if (key === 'set-cookie') {
      const cookies = (Array.isArray(value) ? value : [value]).filter(v => typeof v === 'string' && !v.trim().toLowerCase().startsWith(`${COOKIE.toLowerCase()}=`));
      if (cookies.length) result[key] = cookies;
    } else result[key] = value;
  }
  return result;
}

async function readLaunch(req) {
  let data = '';
  for await (const chunk of req) {
    data += chunk.toString('utf8');
    if (Buffer.byteLength(data) > 4096) throw new Error('body_too_large');
  }
  const form = new URLSearchParams(data);
  if ([...form.keys()].length !== 1 || !form.has('ticket')) return null;
  return form.get('ticket');
}

/** Build an HTTP gateway for a loopback-only upstream. Not a TLS terminator. */
export function createGateway({ gate, publicOrigin, siteOrigin, upstreamPort, checkIntervalMs = 30000 }) {
  const external = new URL(publicOrigin), site = new URL(siteOrigin);
  if (external.protocol !== 'https:' || site.protocol !== 'https:' || external.pathname !== '/' || site.pathname !== '/' || external.search || site.search || external.hash || site.hash || external.username || site.username || external.password || site.password || !Number.isInteger(upstreamPort) || upstreamPort < 1 || upstreamPort > 65535) throw new Error('invalid_gateway_config');
  const stop = (res, status = 403) => { res.writeHead(status, { 'content-type': 'text/plain; charset=utf-8', 'cache-control': 'no-store' }); res.end('Acceso no disponible'); };
  const validRequest = req => req.headers.host === external.host && req.url.startsWith('/') && !req.url.startsWith('//') && !req.url.includes('\\');
  // A Lax cookie can accompany a cross-site top-level GET. Only the root
  // navigation is needed after launch; deny cross-site GETs to app endpoints.
  const safeOrigin = req => {
    if (!SAFE.has(req.method)) return req.headers.origin === external.origin;
    if (req.headers.origin && req.headers.origin !== external.origin) return false;
    if (req.headers['sec-fetch-site'] !== 'cross-site') return true;
    return req.method === 'GET' && req.url === '/' && req.headers['sec-fetch-mode'] === 'navigate' && req.headers['sec-fetch-dest'] === 'document';
  };
  const server = createServer(async (req, res) => {
    try {
      if (!validRequest(req)) return stop(res);
      if (req.url === '/__aula/launch') {
        if (req.method !== 'POST' || req.headers.origin !== site.origin || req.headers['content-type']?.split(';')[0] !== 'application/x-www-form-urlencoded') return stop(res);
        const ticket = await readLaunch(req);
        const id = ticket && await gate.launch(ticket);
        if (!id) return stop(res);
        res.writeHead(303, { 'set-cookie': `${COOKIE}=${id}; Path=/; Max-Age=900; Secure; HttpOnly; SameSite=Lax`, location: '/', 'cache-control': 'no-store', 'referrer-policy': 'no-referrer' });
        return res.end();
      }
      if (req.url.startsWith('/__aula/')) return stop(res, 404);
      const id = sessionCookie(req.headers.cookie);
      if (!safeOrigin(req) || !await gate.check(id)) return stop(res);
      const upstream = httpRequest({ hostname: '127.0.0.1', port: upstreamPort, path: req.url, method: req.method, headers: upstreamHeaders(req, external.host) }, response => {
        res.writeHead(response.statusCode || 502, copyResponseHeaders(response.headers));
        response.pipe(res);
      });
      upstream.on('error', () => { if (!res.headersSent) stop(res, 502); else res.destroy(); });
      req.on('aborted', () => upstream.destroy());
      req.pipe(upstream);
    } catch { if (!res.headersSent) stop(res, 503); else res.destroy(); }
  });
  server.on('upgrade', async (req, socket, head) => {
    const deny = () => { if (!socket.destroyed) socket.end('HTTP/1.1 403 Forbidden\r\nConnection: close\r\n\r\n'); };
    try {
      const id = sessionCookie(req.headers.cookie);
      if (!validRequest(req) || req.url.startsWith('/__aula/') || req.headers.origin !== external.origin || req.headers.upgrade?.toLowerCase() !== 'websocket' || !await gate.check(id)) return deny();
      const upstream = httpRequest({ hostname: '127.0.0.1', port: upstreamPort, path: req.url, method: 'GET', headers: upstreamHeaders(req, external.host, true) });
      upstream.on('upgrade', (response, peer, upstreamHead) => {
        const lines = [`HTTP/1.1 ${response.statusCode} Switching Protocols`, 'Connection: Upgrade', 'Upgrade: websocket'];
        for (const [key, value] of Object.entries(copyResponseHeaders(response.headers))) for (const item of Array.isArray(value) ? value : [value]) lines.push(`${key}: ${item}`);
        socket.write(`${lines.join('\r\n')}\r\n\r\n`);
        if (head.length) peer.write(head);
        if (upstreamHead.length) socket.write(upstreamHead);
        socket.pipe(peer).pipe(socket);
        const timer = setInterval(async () => { if (!await gate.check(id)) { socket.destroy(); peer.destroy(); } }, checkIntervalMs);
        const cleanup = () => { clearInterval(timer); socket.destroy(); peer.destroy(); };
        socket.once('close', cleanup); peer.once('close', cleanup);
        socket.once('error', cleanup); peer.once('error', cleanup);
      });
      upstream.on('response', () => deny());
      upstream.on('error', deny);
      upstream.end();
    } catch { deny(); }
  });
  return server;
}
