// Opt-in integration test against the isolated local Worker and Docker stack.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { once } from 'node:events';
import { execFileSync } from 'node:child_process';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { createGateway } from './gateway.mjs';
import { createSessionGate } from './session-gate.mjs';
import { createSiteAuthorizer } from './site-authorizer.mjs';
import { openReplayStore } from './replay-store.mjs';

test('local Worker identity and real AFFiNE follow active project membership', { skip: process.env.AULA_FULL_FLOW_TEST !== '1', timeout: 30000 }, async () => {
  const worker = 'http://127.0.0.1:18977';
  const directory = mkdtempSync(path.join(tmpdir(), 'aula-full-flow-'));
  const store = openReplayStore(path.join(directory, 'replay.db'));
  const reservation = createServer(); reservation.listen(0, '127.0.0.1'); await once(reservation, 'listening');
  const port = reservation.address().port; await new Promise(resolve => reservation.close(resolve));
  const serviceToken = 'service-test-token-at-least-32-characters';
  // The local Worker uses HTTP; production requires HTTPS. This injected fetcher
  // maps only the fixed test endpoint and never runs in the production gateway.
  const authorize = createSiteAuthorizer({ siteOrigin: 'https://site.example', serviceToken, fetcher: (_url, options) => fetch(`${worker}/api/space-access/authorize`, options) });
  const gate = createSessionGate({ secret: 'ticket-test-secret-at-least-32-characters', audience: 'localtest', app: 'affine', consume: store.consume, authorize, setupOnly: false });
  const gateway = createGateway({ gate, publicOrigin: `https://127.0.0.1:${port}`, siteOrigin: 'https://site.example', upstreamPort: 13010 });
  gateway.listen(port, '127.0.0.1'); await once(gateway, 'listening');
  try {
    const response = await fetch(`${worker}/api/space-access/ticket?project=gateway-test`, { method: 'POST', headers: { origin: worker, 'content-type': 'application/json', 'oai-authenticated-user-id': 'user_student', 'oai-authenticated-user-email': 'student@example.test' }, body: JSON.stringify({ app: 'affine' }) });
    assert.equal(response.status, 200);
    const { ticket } = await response.json();
    const base = `http://127.0.0.1:${port}`;
    const launch = await fetch(`${base}/__aula/launch`, { method: 'POST', headers: { origin: 'https://site.example', 'content-type': 'application/x-www-form-urlencoded' }, body: new URLSearchParams({ ticket }), redirect: 'manual' });
    assert.equal(launch.status, 303);
    const cookie = launch.headers.get('set-cookie').split(';')[0];
    assert.equal((await fetch(`${base}/admin/setup`, { headers: { cookie } })).status, 200);
    execFileSync(process.execPath, ['node_modules/wrangler/bin/wrangler.js', 'd1', 'execute', 'DB', '--local', '--config', 'dist/server/wrangler.json', '--persist-to', 'outputs/gateway-d1', '--command', "UPDATE project_members SET status='pending',user_id=NULL WHERE id='member-test';"], { stdio: 'pipe' });
    assert.equal((await fetch(`${base}/admin/setup`, { headers: { cookie } })).status, 403);
  } finally { gateway.close(); store.close(); rmSync(directory, { recursive: true, force: true }); }
});
