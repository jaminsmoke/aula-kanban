import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { once } from 'node:events';
import { connect } from 'node:net';
import { createGateway } from './gateway.mjs';

test('requires a live session, rejects cross-origin writes and strips gateway identity', async () => {
  let allowed = true;
  let seen;
  const upstream = createServer((req, res) => { seen = req.headers; res.setHeader('set-cookie', ['__Host-aula_session=evil; Path=/', 'app=ok; Path=/']); res.end('app'); });
  upstream.listen(0, '127.0.0.1'); await once(upstream, 'listening');
  const gate = { launch: async ticket => ticket === 'ticket' ? 'session' : null, check: async id => id === 'session' && allowed };
  const reservation = createServer(); reservation.listen(0, '127.0.0.1'); await once(reservation, 'listening');
  const port = reservation.address().port; await new Promise(resolve => reservation.close(resolve));
  const gateway = createGateway({ gate, publicOrigin: `https://127.0.0.1:${port}`, siteOrigin: 'https://site.example', upstreamPort: upstream.address().port });
  gateway.listen(port, '127.0.0.1'); await once(gateway, 'listening');
  const base = `http://127.0.0.1:${gateway.address().port}`;
  const headers = { host: 'app.example' };
  try {
    assert.equal((await fetch(`${base}/`, { headers })).status, 403);
    assert.equal((await fetch(`${base}/__aula/launch`, { method: 'POST', headers: { ...headers, origin: 'https://evil.example', 'content-type': 'application/x-www-form-urlencoded' }, body: 'ticket=ticket', redirect: 'manual' })).status, 403);
    const launch = await fetch(`${base}/__aula/launch`, { method: 'POST', headers: { ...headers, origin: 'https://site.example', 'content-type': 'application/x-www-form-urlencoded' }, body: 'ticket=ticket', redirect: 'manual' });
    assert.equal(launch.status, 303);
    assert.match(launch.headers.get('set-cookie'), /HttpOnly; SameSite=Lax/);
    const cookie = '__Host-aula_session=session; app=own';
    const result = await fetch(`${base}/graphql`, { headers: { ...headers, cookie, 'oai-authenticated-user-id': 'forged', 'x-forwarded-host': 'evil.example', authorization: 'Bearer app-token' } });
    assert.equal(result.status, 200);
    assert.equal(await result.text(), 'app');
    assert.equal(seen.cookie, 'app=own');
    assert.equal(seen['oai-authenticated-user-id'], undefined);
    assert.equal(seen['x-forwarded-host'], `127.0.0.1:${port}`);
    assert.equal(seen.authorization, 'Bearer app-token');
    assert.doesNotMatch(result.headers.get('set-cookie'), /aula_session/);
    assert.equal((await fetch(`${base}/graphql`, { method: 'POST', headers: { ...headers, cookie, origin: 'https://evil.example' } })).status, 403);
    assert.equal((await fetch(`${base}/graphql`, { headers: { ...headers, cookie, 'sec-fetch-site': 'cross-site' } })).status, 403);
    allowed = false;
    assert.equal((await fetch(`${base}/`, { headers: { ...headers, cookie } })).status, 403);
  } finally { gateway.close(); upstream.close(); }
});

test('closes an upgraded connection when the authorization is revoked', async () => {
  let allowed = true;
  const upstream = createServer();
  upstream.on('upgrade', (_req, socket) => socket.write('HTTP/1.1 101 Switching Protocols\r\nConnection: Upgrade\r\nUpgrade: websocket\r\nSec-WebSocket-Accept: test\r\n\r\n'));
  upstream.listen(0, '127.0.0.1'); await once(upstream, 'listening');
  const reservation = createServer(); reservation.listen(0, '127.0.0.1'); await once(reservation, 'listening');
  const port = reservation.address().port; await new Promise(resolve => reservation.close(resolve));
  const gate = { launch: async () => null, check: async id => id === 'session' && allowed };
  const gateway = createGateway({ gate, publicOrigin: `https://127.0.0.1:${port}`, siteOrigin: 'https://site.example', upstreamPort: upstream.address().port, checkIntervalMs: 25 });
  gateway.listen(port, '127.0.0.1'); await once(gateway, 'listening');
  const socket = connect(port, '127.0.0.1');
  try {
    await once(socket, 'connect');
    socket.write(`GET /ws HTTP/1.1\r\nHost: 127.0.0.1:${port}\r\nOrigin: https://127.0.0.1:${port}\r\nConnection: Upgrade\r\nUpgrade: websocket\r\nCookie: __Host-aula_session=session\r\n\r\n`);
    const [data] = await once(socket, 'data');
    assert.match(data.toString(), /^HTTP\/1\.1 101/);
    allowed = false;
    await Promise.race([once(socket, 'close'), new Promise((_, reject) => setTimeout(() => reject(new Error('socket remained open')), 1000))]);
  } finally { socket.destroy(); gateway.close(); upstream.close(); }
});
