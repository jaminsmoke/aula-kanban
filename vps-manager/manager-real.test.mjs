import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdir, copyFile, writeFile, readFile } from 'node:fs/promises';
import path from 'node:path';
import { createManager } from './manager.mjs';

test('real Docker: install and uninstall retain application data', { skip: process.env.AULA_REAL_DOCKER_TEST !== '1', timeout: 180000 }, async () => {
  const directory = path.resolve('outputs', 'manager-validation');
  const project = 'aula-kanban-0123456789abcdef';
  const token = 'test-only-manager-token-at-least-32-characters';
  await mkdir(path.join(directory, 'data', 'affine'), { recursive: true });
  await copyFile(path.resolve('vps-manager/affine/compose.yaml.example'), path.join(directory, 'compose.yaml'));
  await writeFile(path.join(directory, '.env'), 'AFFINE_PORT=13011\n');
  const marker = path.join(directory, 'data', 'affine', 'retained-test-marker');
  await writeFile(marker, 'retain');
  const server = createManager({ token, stack: { directory, project }, apps: [{ id: 'affine', url: 'https://affine.example.test' }] });
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  const root = `http://127.0.0.1:${server.address().port}`, headers = { authorization: `Bearer ${token}` };
  const status = async () => (await (await fetch(`${root}/v1/apps`, { headers })).json()).apps[0].status;
  const waitFor = async expected => {
    const deadline = Date.now() + 120000;
    while (Date.now() < deadline) {
      const actual = await status();
      if (expected.includes(actual)) return actual;
      if (actual === 'error') throw new Error('manager_operation_failed');
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
    throw new Error('manager_operation_timeout');
  };
  try {
    assert.equal((await fetch(`${root}/v1/apps`)).status, 401);
    assert.equal((await fetch(`${root}/v1/apps/affine`, { method: 'POST', headers })).status, 202);
    assert.equal(await waitFor(['installed']), 'installed');
    assert.equal((await fetch('http://127.0.0.1:13011/admin/setup')).status, 200);
    assert.equal((await fetch(`${root}/v1/apps/affine`, { method: 'DELETE', headers })).status, 202);
    assert.equal(await waitFor(['not_installed']), 'not_installed');
    assert.equal(await readFile(marker, 'utf8'), 'retain');
  } finally { await new Promise(resolve => server.close(resolve)); }
});
