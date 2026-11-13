import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createSiteAuthorizer } from './site-authorizer.mjs';

const serviceToken = 'test-service-token-at-least-32-characters';
const principal = { userId: 'user1', email: 'user@example.test', projectId: 'default', app: 'affine' };

test('sends a service-authenticated request only to the configured Site', async () => {
  const authorize = createSiteAuthorizer({ siteOrigin: 'https://site.example/', serviceToken, fetcher: async (url, options) => {
    assert.equal(String(url), 'https://site.example/api/space-access/authorize');
    assert.equal(options.redirect, 'manual');
    assert.equal(options.headers.authorization, `Bearer ${serviceToken}`);
    assert.deepEqual(JSON.parse(options.body), principal);
    return Response.json({ allowed: true, role: 'student' });
  } });
  assert.equal(await authorize(principal), 'student');
});

test('denies redirects, errors and unexpected roles', async () => {
  for (const fetcher of [async () => new Response(null, { status: 302 }), async () => { throw new Error('offline'); }, async () => Response.json({ allowed: true, role: 'superuser' })]) {
    assert.equal(await createSiteAuthorizer({ siteOrigin: 'https://site.example/', serviceToken, fetcher })(principal), null);
  }
  assert.throws(() => createSiteAuthorizer({ siteOrigin: 'http://site.example/', serviceToken }));
});
