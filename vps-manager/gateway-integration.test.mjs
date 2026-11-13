import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { createHmac } from 'node:crypto';
import { once } from 'node:events';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { createGateway } from './gateway.mjs';
import { createSessionGate } from './session-gate.mjs';
import { openReplayStore } from './replay-store.mjs';

test('real ticket, persistent replay store and proxy enforce revocation together', async () => {
  const directory = mkdtempSync(path.join(tmpdir(), 'aula-gateway-'));
  const store = openReplayStore(path.join(directory, 'replay.db'));
  const upstream = createServer((_req, res) => res.end('upstream'));
  upstream.listen(0, '127.0.0.1'); await once(upstream, 'listening');
  const reservation = createServer(); reservation.listen(0, '127.0.0.1'); await once(reservation, 'listening');
  const port = reservation.address().port; await new Promise(resolve => reservation.close(resolve));
  const secret = 'gateway-integration-test-key-32-bytes-minimum';
  let role = 'owner';
  const gate = createSessionGate({ secret, audience: 'site1', app: 'affine', consume: store.consume, authorize: async () => role });
  const gateway = createGateway({ gate, publicOrigin: `https://127.0.0.1:${port}`, siteOrigin: 'https://site.example', upstreamPort: upstream.address().port });
  gateway.listen(port, '127.0.0.1'); await once(gateway, 'listening');
  const now = Math.floor(Date.now() / 1000);
  const payload = Buffer.from(JSON.stringify({ aud: 'site1', app: 'affine', project: 'default', sub: 'user1', email: 'user@example.test', jti: 'once', iat: now, exp: now + 60 })).toString('base64url');
  const ticket = `${payload}.${createHmac('sha256', secret).update(payload).digest('base64url')}`;
  const base = `http://127.0.0.1:${port}`;
  const open = () => fetch(`${base}/__aula/launch`, { method: 'POST', headers: { origin: 'https://site.example', 'content-type': 'application/x-www-form-urlencoded' }, body: new URLSearchParams({ ticket }), redirect: 'manual' });
  try {
    const first = await open();
    assert.equal(first.status, 200);
    const cookie = first.headers.get('set-cookie').split(';')[0];
    assert.equal((await open()).status, 403);
    assert.equal(await (await fetch(base, { headers: { cookie } })).text(), 'upstream');
    role = null;
    assert.equal((await fetch(base, { headers: { cookie } })).status, 403);
  } finally {
    gateway.close(); upstream.close(); store.close(); rmSync(directory, { recursive: true, force: true });
  }
});
