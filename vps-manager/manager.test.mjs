import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createManager, rootlessSocket } from './manager.mjs';
import { existsSync } from 'node:fs';
import { mkdir, mkdtemp, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
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

test('incluye la versión de la imagen en el estado', async () => {
  const token = 'v'.repeat(40);
  const server = createManager({ token, stack: { directory: process.cwd(), project: 'aula-kanban-0123456789abcdef' }, apps: [{ id: 'affine', url: 'https://affine.example.test' }], execute: async args => args.includes('ps') ? JSON.stringify([{ Service: 'affine', State: 'running', Image: 'ghcr.io/toeverything/affine:stable' }]) : '' });
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  try {
    const response = await fetch(`http://127.0.0.1:${server.address().port}/v1/apps`, { headers: { authorization: `Bearer ${token}` } });
    const app = (await response.json()).apps[0];
    assert.equal(app.status, 'installed');
    assert.equal(app.version, 'stable');
  } finally { await new Promise(resolve => server.close(resolve)); }
});

test('resetear detiene los servicios y borra solo los datos de esa app', async () => {
  const token = 'r'.repeat(40);
  const rootDir = await mkdtemp(path.join(tmpdir(), 'aula-vps-'));
  const dataDir = path.join(rootDir, 'data', 'affine');
  const keepDir = path.join(rootDir, 'data', 'other');
  const configDir = path.join(rootDir, 'config', 'affine');
  await mkdir(dataDir, { recursive: true });
  await mkdir(keepDir, { recursive: true });
  await mkdir(configDir, { recursive: true });
  await writeFile(path.join(dataDir, 'notes.txt'), 'datos');
  await writeFile(path.join(keepDir, 'keep.txt'), 'ajenos');
  await writeFile(path.join(configDir, 'config.json'), '{}');
  const calls = [];
  const withBind = { ...services, affine: { ...services.affine, volumes: [{ type: 'bind', source: dataDir }, { type: 'bind', source: configDir }, { type: 'volume', source: 'affine_data' }] } };
  const volumes = { affine_data: { name: 'aula-kanban-0123456789abcdef_affine_data' }, other_data: { name: 'aula-kanban-0123456789abcdef_other_data' } };
  const server = createManager({ token, stack: { directory: rootDir, project: 'aula-kanban-0123456789abcdef' }, apps: [{ id: 'affine', url: 'https://affine.example.test' }], execute: async args => { calls.push(args); return args.includes('config') ? JSON.stringify({ services: withBind, volumes }) : ''; } });
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  try {
    const root = `http://127.0.0.1:${server.address().port}`, headers = { authorization: `Bearer ${token}` };
    assert.equal((await fetch(root + '/v1/apps/affine/reset', { method: 'DELETE', headers })).status, 404);
    assert.equal((await fetch(root + '/v1/apps/affine/reset', { method: 'POST', headers })).status, 202);
    await new Promise(resolve => setTimeout(resolve, 30));
    assert.equal(calls.some(args => args.includes('rm')), true);
    assert.equal(calls.some(args => args.includes('down') || args.includes('prune')), false);
    assert.equal(existsSync(dataDir), false);
    assert.equal(existsSync(path.join(keepDir, 'keep.txt')), true);
    assert.equal(existsSync(path.join(configDir, 'config.json')), true);
    const volumeRemoval = calls.find(args => args[0] === 'volume');
    assert.ok(volumeRemoval?.includes(volumes.affine_data.name));
    assert.equal(volumeRemoval?.includes(volumes.other_data.name), false);
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

const nodumServices = {
  nodum_postgres: { image: 'pgvector/pgvector:0.8.0-pg16' },
  nodum_redis: { image: 'redis:7.4.2-alpine' },
  nodum_redis_control: { image: 'redis:7.4.2-alpine' },
  nodum_minio: { image: 'quay.io/minio/minio:RELEASE.2025-09-07T16-13-09Z' },
  nodum_migrate: { image: 'nodum-api:prod' },
  nodum_api: { image: 'nodum-api:prod' },
  nodum_worker: { image: 'nodum-api:prod' },
  nodum_beat: { image: 'nodum-api:prod' },
  nodum_web: { image: 'nodum-web:prod' },
  nodum_caddy: { image: 'caddy:2-alpine', ports: [{ published: '8090', host_ip: '127.0.0.1' }] },
};

test('instala, consulta y desinstala Nodum con su stack completo', async () => {
  const calls = [], token = 'n'.repeat(40);
  const server = createManager({ token, stack: { directory: process.cwd(), project: 'aula-kanban-0123456789abcdef' }, apps: [{ id: 'nodum', url: 'https://nodum.example.test' }], checkSpace: async () => ({ bavail: 10 ** 9, bsize: 4096 }), execute: async args => { calls.push(args); if (args.includes('config')) return JSON.stringify({ services: nodumServices }); if (args.includes('ps')) return JSON.stringify([{ Service: 'nodum_web', State: 'running', Image: 'nodum-web:prod' }]); return ''; } });
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  try {
    const root = `http://127.0.0.1:${server.address().port}`, headers = { authorization: `Bearer ${token}` };
    const state = await (await fetch(root + '/v1/apps', { headers })).json();
    assert.equal(state.apps[0].status, 'installed');
    assert.equal(state.apps[0].version, 'prod');
    assert.equal((await fetch(root + '/v1/apps/nodum', { method: 'POST', headers })).status, 202);
    await new Promise(resolve => setTimeout(resolve, 10));
    const up = calls.find(args => args.includes('up'));
    assert.ok(up?.includes('nodum_web'), 'la entrada debe ser nodum_web');
    assert.equal(up.includes('--no-build'), true);
    assert.equal((await fetch(root + '/v1/apps/nodum', { method: 'DELETE', headers })).status, 202);
    await new Promise(resolve => setTimeout(resolve, 10));
    const rmCommand = calls.at(-1);
    assert.equal(rmCommand.includes('rm'), true);
    for (const name of Object.keys(nodumServices)) assert.equal(rmCommand.includes(name), true, `rm debe incluir ${name}`);
  } finally { await new Promise(resolve => server.close(resolve)); }
});

test('rechaza una imagen de api no oficial aunque el servicio exista', async () => {
  const calls = [], token = 'm'.repeat(40);
  const tampered = { ...nodumServices, nodum_api: { image: 'yuvytung/nodum:api-3.2.0' } };
  const server = createManager({ token, stack: { directory: process.cwd(), project: 'aula-kanban-0123456789abcdef' }, apps: [{ id: 'nodum', url: 'https://nodum.example.test' }], checkSpace: async () => ({ bavail: 10 ** 9, bsize: 4096 }), execute: async args => { calls.push(args); return args.includes('config') ? JSON.stringify({ services: tampered }) : ''; } });
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  try {
    const root = `http://127.0.0.1:${server.address().port}`, headers = { authorization: `Bearer ${token}` };
    assert.equal((await fetch(root + '/v1/apps/nodum', { method: 'POST', headers })).status, 202);
    await new Promise(resolve => setTimeout(resolve, 10));
    assert.equal(calls.some(args => args.includes('up')), false);
    assert.equal((await (await fetch(root + '/v1/apps', { headers })).json()).apps[0].status, 'error');
  } finally { await new Promise(resolve => server.close(resolve)); }
});

test('resetear Nodum borra sus datos pero conserva su configuración', async () => {
  const token = 'q'.repeat(40);
  const rootDir = await mkdtemp(path.join(tmpdir(), 'aula-nodum-'));
  const dataDir = path.join(rootDir, 'data', 'nodum');
  const pgDir = path.join(dataDir, 'postgres');
  const configDir = path.join(rootDir, 'caddy');
  await mkdir(pgDir, { recursive: true });
  await mkdir(configDir, { recursive: true });
  await writeFile(path.join(pgDir, 'PG_VERSION'), '16');
  await writeFile(path.join(configDir, 'Caddyfile'), '{}');
  const withBind = {
    ...nodumServices,
    nodum_postgres: { ...nodumServices.nodum_postgres, volumes: [{ type: 'bind', source: pgDir }] },
    nodum_caddy: { ...nodumServices.nodum_caddy, volumes: [{ type: 'bind', source: path.join(configDir, 'Caddyfile') }] },
  };
  const calls = [];
  const server = createManager({ token, stack: { directory: rootDir, project: 'aula-kanban-0123456789abcdef' }, apps: [{ id: 'nodum', url: 'https://nodum.example.test' }], execute: async args => { calls.push(args); return args.includes('config') ? JSON.stringify({ services: withBind }) : ''; } });
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  try {
    const root = `http://127.0.0.1:${server.address().port}`, headers = { authorization: `Bearer ${token}` };
    assert.equal((await fetch(root + '/v1/apps/nodum/reset', { method: 'POST', headers })).status, 202);
    await new Promise(resolve => setTimeout(resolve, 30));
    assert.equal(calls.some(args => args.includes('rm')), true);
    assert.equal(existsSync(pgDir), false, 'los datos de Nodum se borran');
    assert.equal(existsSync(path.join(configDir, 'Caddyfile')), true);
  } finally { await new Promise(resolve => server.close(resolve)); }
});
