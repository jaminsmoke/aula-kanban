import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createManager, rootlessSocket } from './manager.mjs';
const services = { affine: { image: 'ghcr.io/toeverything/affine:stable' }, affine_migration: { image: 'ghcr.io/toeverything/affine:stable' }, affine_postgres: { image: 'pgvector/pgvector:pg16' }, affine_redis: { image: 'redis:7-alpine' } };

test('solo acepta el token y operaciones para aplicaciones registradas sin borrar volúmenes', async () => {
  const calls = [], token = 'x'.repeat(40);
  const server = createManager({ token, stack: { directory: process.cwd(), project: 'aula-kanban-0123456789abcdef' }, apps: [{ id: 'affine', url: 'https://affine.example.test' }], execute: async args => { calls.push(args); return args.includes('config') ? JSON.stringify({ services }) : ''; } });
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  try {
    const root = `http://127.0.0.1:${server.address().port}`, auth = { authorization: `Bearer ${token}` };
    assert.equal((await fetch(root + '/v1/apps')).status, 401);
    assert.equal((await fetch(root + '/v1/apps', { headers: { authorization: token } })).status, 401);
    const list = await (await fetch(root + '/v1/apps', { headers: auth })).json();
    assert.equal(list.apps[0].status, 'not_installed');
    assert.equal((await fetch(root + '/v1/apps/nodum', { method: 'DELETE', headers: auth })).status, 404);
    assert.equal((await fetch(root + '/v1/apps/affine', { method: 'DELETE', headers: auth })).status, 202);
    await new Promise(resolve => setTimeout(resolve, 10));
    const command = calls.at(-1);
    assert.equal(command.includes('rm'), true);
    assert.equal(command.includes('down'), false);
    assert.equal(command.includes('--volumes'), false);
    assert.equal(command.includes('prune'), false);
    assert.equal(command.includes('aula-kanban-0123456789abcdef'), true);
    assert.equal(command.includes('identity'), false);
  } finally { await new Promise(resolve => server.close(resolve)); }
});

test('rechaza configuraciones inseguras', () => {
  const app = { id: 'affine', directory: '/tmp/a', project: 'identity', url: 'https://app.example.test' };
  assert.throws(() => createManager({ token: 'short', apps: [] }));
  assert.throws(() => createManager({ token: 'x'.repeat(40), apps: [app] }));
  assert.throws(() => createManager({ token: 'x'.repeat(40), stack: { directory: process.cwd(), project: 'aula-kanban-0123456789abcdef' }, apps: [{ ...app, url: 'http://app.example.test' }] }));
});

test('exige el socket rootless del usuario propio', () => {
  assert.equal(rootlessSocket(1234, '/run/user/1234'), 'unix:///run/user/1234/docker.sock');
  assert.throws(() => rootlessSocket(0, '/run/user/0'));
  assert.throws(() => rootlessSocket(1234, '/run/user/1000'));
  assert.throws(() => rootlessSocket(undefined, '/var/run'));
});

test('bloquea un compose que define nombres globales de contenedor', async () => {
  const calls = [], token = 'y'.repeat(40);
  const server = createManager({ token, stack: { directory: process.cwd(), project: 'aula-kanban-0123456789abcdef' }, apps: [{ id: 'affine', url: 'https://affine.example.test' }], execute: async args => { calls.push(args); return args.includes('config') ? JSON.stringify({ services: { ...services, affine: { ...services.affine, container_name: 'identity' } } }) : ''; } });
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  try {
    const root = `http://127.0.0.1:${server.address().port}`, headers = { authorization: `Bearer ${token}` };
    assert.equal((await fetch(root + '/v1/apps/affine', { method: 'POST', headers })).status, 202);
    await new Promise(resolve => setTimeout(resolve, 10));
    assert.equal(calls.some(args => args.includes('up')), false);
    assert.equal((await (await fetch(root + '/v1/apps', { headers })).json()).apps[0].status, 'error');
  } finally { await new Promise(resolve => server.close(resolve)); }
});

test('rechaza servicios ajenos dentro del stack de Aula', async () => {
  const calls = [], token = 'z'.repeat(40);
  const server = createManager({ token, stack: { directory: process.cwd(), project: 'aula-kanban-0123456789abcdef' }, apps: [{ id: 'affine', url: 'https://affine.example.test' }], execute: async args => { calls.push(args); return args.includes('config') ? JSON.stringify({ services: { ...services, identity: {} } }) : ''; } });
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  try {
    const root = `http://127.0.0.1:${server.address().port}`, headers = { authorization: `Bearer ${token}` };
    assert.equal((await fetch(root + '/v1/apps/affine', { method: 'DELETE', headers })).status, 202);
    await new Promise(resolve => setTimeout(resolve, 10));
    assert.equal(calls.some(args => args.includes('rm')), false);
    assert.equal((await (await fetch(root + '/v1/apps', { headers })).json()).apps[0].status, 'error');
  } finally { await new Promise(resolve => server.close(resolve)); }
});

test('no instala cuando queda menos de 5 GiB de espacio libre', async () => {
  const calls = [], token = 'w'.repeat(40);
  const server = createManager({ token, stack: { directory: process.cwd(), project: 'aula-kanban-0123456789abcdef' }, apps: [{ id: 'affine', url: 'https://affine.example.test' }], checkSpace: async () => ({ bavail: 1, bsize: 4096 }), execute: async args => { calls.push(args); return args.includes('config') ? JSON.stringify({ services }) : ''; } });
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  try {
    const root = `http://127.0.0.1:${server.address().port}`, headers = { authorization: `Bearer ${token}` };
    assert.equal((await fetch(root + '/v1/apps/affine', { method: 'POST', headers })).status, 202);
    await new Promise(resolve => setTimeout(resolve, 10));
    assert.equal(calls.some(args => args.includes('up')), false);
    assert.equal((await (await fetch(root + '/v1/apps', { headers })).json()).apps[0].status, 'error');
  } finally { await new Promise(resolve => server.close(resolve)); }
});

test('no marca AFFiNE activo si solo funciona Redis', async () => {
  const token = 's'.repeat(40);
  const server = createManager({ token, stack: { directory: process.cwd(), project: 'aula-kanban-0123456789abcdef' }, apps: [{ id: 'affine', url: 'https://affine.example.test' }], execute: async () => JSON.stringify([{ Service: 'affine_redis', State: 'running' }, { Service: 'affine', State: 'exited' }]) });
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  try {
    const response = await fetch(`http://127.0.0.1:${server.address().port}/v1/apps`, { headers: { authorization: `Bearer ${token}` } });
    assert.equal((await response.json()).apps[0].status, 'stopped');
  } finally { await new Promise(resolve => server.close(resolve)); }
});
