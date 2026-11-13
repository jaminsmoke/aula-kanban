import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createHmac } from 'node:crypto';
import { createSessionGate } from './session-gate.mjs';

const secret = 'test-secret-with-at-least-32-characters';
let clock = 1700000000000;
const makeTicket = (jti, app = 'affine') => {
  const body = Buffer.from(JSON.stringify({ aud: 'site1', app, project: 'default', sub: 'user1', email: 'user@example.test', jti, iat: clock / 1000, exp: clock / 1000 + 60 })).toString('base64url');
  return `${body}.${createHmac('sha256', secret).update(body).digest('base64url')}`;
};
function fixture(setupOnly = true) {
  const consumed = new Set();
  const state = { role: 'owner', failure: false };
  const gate = createSessionGate({ secret, audience: 'site1', app: 'affine', setupOnly, now: () => clock,
    consume: id => { if (consumed.has(id)) return false; consumed.add(id); return true; },
    authorize: async () => { if (state.failure) throw new Error('offline'); return state.role; },
  });
  return { gate, state };
}

test('setup allows only administrators and rejects ticket replay', async () => {
  const { gate, state } = fixture();
  state.role = 'student';
  assert.equal(await gate.launch(makeTicket('student')), null);
  state.role = 'owner';
  const token = makeTicket('owner');
  const session = await gate.launch(token);
  assert.ok(session);
  assert.equal(await gate.launch(token), null);
  assert.equal(await gate.check(session), true);
});

test('checks current membership on every request and denies service errors', async () => {
  const { gate, state } = fixture(false);
  state.role = 'student';
  const session = await gate.launch(makeTicket('member'));
  assert.equal(await gate.check(session), true);
  state.role = null;
  assert.equal(await gate.check(session), false);
  state.role = 'student';
  assert.equal(await gate.check(session), false);
  const other = await gate.launch(makeTicket('other'));
  state.failure = true;
  assert.equal(await gate.check(other), false);
});

test('expires sessions and rejects tickets for another application', async () => {
  const { gate } = fixture();
  assert.equal(await gate.launch(makeTicket('wrongapp', 'n8n')), null);
  const session = await gate.launch(makeTicket('expires'));
  clock += 15 * 60 * 1000;
  assert.equal(await gate.check(session), false);
});
