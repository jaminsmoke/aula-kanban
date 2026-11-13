import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdir, copyFile, writeFile, readFile } from 'node:fs/promises';
import path from 'node:path';
import { createManager } from './manager.mjs';

test('real Docker: n8n and its runner install and uninstall while retaining data', { skip: process.env.AULA_REAL_N8N_TEST !== '1', timeout: 180000 }, async () => {
  const directory = path.resolve('outputs', 'n8n-manager-validation');
  const project = 'aula-kanban-6e386e7465737431';
  const token = 'test-only-manager-token-at-least-32-characters';
  await mkdir(path.join(directory, 'data', 'n8n'), { recursive: true });
  await copyFile(path.resolve('vps-manager/n8n/compose.yaml.example'), path.join(directory, 'compose.yaml'));
  await writeFile(path.join(directory, '.env'), 'N8N_HTTP_PORT=15681\nN8N_HOST=n8n.example.test\nN8N_WEBHOOK_URL=https://n8n.example.test/\nN8N_RUNNERS_AUTH_TOKEN=local-test-only-token-not-a-secret-12345\n');
  const marker = path.join(directory, 'data', 'n8n', 'retained-test-marker');
  await writeFile(marker, 'retain');
  const server = createManager({ token, stack: { directory, project }, apps: [{ id: 'n8n', url: 'https://n8n.example.test' }] });
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  const root = `http://127.0.0.1:${server.address().port}`, headers = { authorization: `Bearer ${token}` };
  const waitFor = async expected => {
    const deadline = Date.now() + 120000;
    while (Date.now() < deadline) {
      const response = await fetch(`${root}/v1/apps`, { headers });
      const actual = (await response.json()).apps[0].status;
      if (expected.includes(actual)) return actual;
      if (actual === 'error') throw new Error('manager_operation_failed');
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
    throw new Error('manager_operation_timeout');
  };
  try {
    assert.equal((await fetch(`${root}/v1/apps/n8n`, { method: 'POST', headers })).status, 202);
    assert.equal(await waitFor(['installed']), 'installed');
    const deadline = Date.now() + 60000;
    let ready = false;
    while (Date.now() < deadline && !ready) {
      try { ready = (await fetch('http://127.0.0.1:15681/healthz')).ok; } catch { /* starting */ }
      if (!ready) await new Promise(resolve => setTimeout(resolve, 1000));
    }
    assert.equal(ready, true);
    assert.equal((await fetch(`${root}/v1/apps/n8n`, { method: 'DELETE', headers })).status, 202);
    assert.equal(await waitFor(['not_installed']), 'not_installed');
    assert.equal(await readFile(marker, 'utf8'), 'retain');
  } finally { await new Promise(resolve => server.close(resolve)); }
});
