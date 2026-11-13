import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createHmac, randomBytes } from 'node:crypto';
import { createServer } from 'node:http';
import { connect } from 'node:net';
import { once } from 'node:events';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { createGateway } from './gateway.mjs';
import { createSessionGate } from './session-gate.mjs';
import { openReplayStore } from './replay-store.mjs';

test('AFFiNE real: setup, Socket.IO and revocation through gateway', { skip: process.env.AULA_AFFINE_TEST_PORT !== '13010' }, async () => {
  const directory = mkdtempSync(path.join(tmpdir(), 'aula-affine-test-'));
  const store = openReplayStore(path.join(directory, 'replay.db'));
  const reservation = createServer(); reservation.listen(0, '127.0.0.1'); await once(reservation, 'listening');
  const port = reservation.address().port; await new Promise(resolve => reservation.close(resolve));
  const secret = 'integration-test-secret-at-least-32-characters';
  let role = 'owner';
  const gate = createSessionGate({ secret, audience: 'localtest', app: 'affine', consume: store.consume, authorize: async () => role });
  const gateway = createGateway({ gate, publicOrigin: `https://127.0.0.1:${port}`, siteOrigin: 'https://site.example', upstreamPort: 13010, checkIntervalMs: 50 });
  gateway.listen(port, '127.0.0.1'); await once(gateway, 'listening');
  const now = Math.floor(Date.now() / 1000);
  const body = Buffer.from(JSON.stringify({ aud: 'localtest', app: 'affine', project: 'default', sub: 'user1', email: 'owner@example.test', jti: randomBytes(16).toString('hex'), iat: now, exp: now + 60 })).toString('base64url');
  const ticket = `${body}.${createHmac('sha256', secret).update(body).digest('base64url')}`;
  const base = `http://127.0.0.1:${port}`;
  let socket;
  try {
    assert.equal((await fetch(`${base}/admin/setup`)).status, 403);
    const launch = await fetch(`${base}/__aula/launch`, { method: 'POST', headers: { origin: 'https://site.example', 'content-type': 'application/x-www-form-urlencoded' }, body: new URLSearchParams({ ticket }), redirect: 'manual' });
    assert.equal(launch.status, 303);
    const cookie = launch.headers.get('set-cookie').split(';')[0];
    const setup = await fetch(`${base}/admin/setup`, { headers: { cookie } });
    assert.equal(setup.status, 200);
    assert.match(setup.headers.get('content-type'), /text\/html/);
    assert.match(await setup.text(), /<html/i);
    assert.equal((await fetch(`${base}/socket.io/?EIO=4&transport=polling`, { headers: { cookie } })).status, 200);
    socket = connect(port, '127.0.0.1'); await once(socket, 'connect');
    socket.write(`GET /socket.io/?EIO=4&transport=websocket HTTP/1.1\r\nHost: 127.0.0.1:${port}\r\nOrigin: https://127.0.0.1:${port}\r\nConnection: Upgrade\r\nUpgrade: websocket\r\nSec-WebSocket-Version: 13\r\nSec-WebSocket-Key: ${randomBytes(16).toString('base64')}\r\nCookie: ${cookie}\r\n\r\n`);
    const [data] = await once(socket, 'data');
    assert.match(data.toString(), /^HTTP\/1\.1 101/);
    role = null;
    const closed = once(socket, 'close');
    // A socket in paused mode must be drained to observe FIN.
    socket.resume();
    await Promise.race([closed, new Promise((_, reject) => setTimeout(() => reject(new Error('websocket_not_revoked')), 2000))]);
    assert.equal((await fetch(`${base}/admin/setup`, { headers: { cookie } })).status, 403);
  } finally { socket?.destroy(); gateway.close(); store.close(); rmSync(directory, { recursive: true, force: true }); }
});
