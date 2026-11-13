import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createHmac } from 'node:crypto';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { verifyLaunchTicket } from './access-tickets.mjs';
import { openReplayStore } from './replay-store.mjs';

const secret = 'a-secret-with-at-least-32-characters';
const now = 1700000000000;
const claims = { aud: 'instance1', app: 'affine', project: 'default', sub: 'user1', email: 'student@example.test', jti: 'random1', iat: now / 1000, exp: now / 1000 + 60 };
const ticket = (data, key = secret) => {
  const body = Buffer.from(JSON.stringify(data)).toString('base64url');
  return `${body}.${createHmac('sha256', key).update(body).digest('base64url')}`;
};
const options = () => {
  const consumed = new Set();
  return { secret, audience: 'instance1', now, consume: id => { if (consumed.has(id)) return false; consumed.add(id); return true; } };
};

test('accepts a valid ticket once and rejects a replay', () => {
  const context = options();
  assert.deepEqual(verifyLaunchTicket(ticket(claims), context), claims);
  assert.equal(verifyLaunchTicket(ticket(claims), context), null);
});

test('rejects forged, malformed, wrong audience and unexpected claims', () => {
  for (const value of [ticket(claims, 'different-secret-at-least-32-characters'), 'bad.token', ticket({ ...claims, aud: 'other' }), ticket({ ...claims, admin: true }), ticket({ ...claims, app: 'unknown' })]) {
    assert.equal(verifyLaunchTicket(value, options()), null);
  }
});

test('rejects expired, future-dated, long-lived and weak-secret tickets', () => {
  for (const altered of [{ exp: claims.iat }, { iat: claims.iat + 1 }, { exp: claims.iat + 61 }, { iat: 0, exp: 1 }]) {
    assert.equal(verifyLaunchTicket(ticket({ ...claims, ...altered }), options()), null);
  }
  assert.equal(verifyLaunchTicket(ticket(claims), { ...options(), secret: 'short' }), null);
});

test('fails closed when the replay store is unavailable', () => {
  assert.equal(verifyLaunchTicket(ticket(claims), { ...options(), consume: () => { throw new Error('disk failure'); } }), null);
});

test('the replay record survives reopening and is shared across connections', () => {
  const directory = mkdtempSync(path.join(tmpdir(), 'aula-replay-'));
  const filename = path.join(directory, 'replay.sqlite');
  try {
    const first = openReplayStore(filename);
    const second = openReplayStore(filename);
    assert.deepEqual(verifyLaunchTicket(ticket(claims), { ...options(), consume: first.consume }), claims);
    assert.equal(verifyLaunchTicket(ticket(claims), { ...options(), consume: second.consume }), null);
    first.close(); second.close();
    const reopened = openReplayStore(filename);
    assert.equal(verifyLaunchTicket(ticket(claims), { ...options(), consume: reopened.consume }), null);
    assert.equal(reopened.consume('new', claims.exp + 10, claims.exp), true);
    reopened.close();
  } finally { rmSync(directory, { recursive: true, force: true }); }
});
