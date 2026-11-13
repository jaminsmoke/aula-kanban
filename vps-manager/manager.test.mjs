import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createManager, rootlessSocket, measureUsage } from './manager.mjs';
import { existsSync } from 'node:fs';
import { mkdir, mkdtemp, symlink, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';

test('la medición rootless usa un contenedor aislado de solo lectura si PostgreSQL deniega acceso', async () => {
  const root = await mkdtemp(path.join(tmpdir(), 'aula-usage-'));
  await mkdir(path.join(root, 'data', 'affine'), { recursive: true });
  const calls = [], token = 'q'.repeat(40);
  const server = createManager({ token, stack: { directory: root, project: 'aula-kanban-0123456789abcdef' }, apps: [{ id: 'affine', url: 'https://affine.example.test' }], measure: async () => { const e = new Error('denied'); e.code = 'EACCES'; throw e; }, execute: async args => { calls.push(args); return args[0] === 'run' ? '12345\t/measure\n' : ''; } });
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  try {
    const response = await fetch(`http://127.0.0.1:${server.address().port}/v1/apps`, { headers: { authorization: `Bearer ${token}` } });
    assert.equal(response.status, 200);
    assert.equal((await response.json()).apps[0].dataBytes, 12345);
    const command = calls.find(args => args[0] === 'run');
    assert.ok(command.includes('none'));
    assert.ok(command.some(arg => arg.includes('dst=/measure,readonly')));
  } finally { await new Promise(resolve => server.close(resolve)); }
});

test('si no se puede medir el espacio, el estado sigue disponible y la cuota no se omite', async () => {
  const token = 'r'.repeat(40);
  const server = createManager({ token, stack: { directory: process.cwd(), project: 'aula-kanban-0123456789abcdef' }, apps: [{ id: 'affine', url: 'https://affine.example.test' }], measure: async () => { throw new Error('disco no accesible'); }, checkSpace: async () => ({ bavail: 10 ** 9, bsize: 4096 }), execute: async args => args.includes('config') ? JSON.stringify({ services }) : '' });
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  try {
    const base = `http://127.0.0.1:${server.address().port}`, headers = { authorization: `Bearer ${token}` };
    const response = await fetch(base + '/v1/apps', { headers });
    assert.equal(response.status, 200);
    assert.equal((await response.json()).apps[0].dataBytes, null);
    assert.equal((await fetch(base + '/v1/apps/affine', { method: 'POST', headers })).status, 202);
    await new Promise(resolve => setTimeout(resolve, 20));
    assert.equal((await (await fetch(base + '/v1/apps', { headers })).json()).apps[0].status, 'error');
  } finally { await new Promise(resolve => server.close(resolve)); }
});
const services = { affine: { image: 'ghcr.io/toeverything/affine:stable@sha256:b649f5ce2384ffdf13c23bccf81d759e15973d59d0b0058af65d895a84373099' }, affine_migration: { image: 'ghcr.io/toeverything/affine:stable@sha256:b649f5ce2384ffdf13c23bccf81d759e15973d59d0b0058af65d895a84373099' }, affine_postgres: { image: 'pgvector/pgvector:pg16@sha256:0dd3149a06e4579a0d70d8fef9945636cd514005e7237deb27f9b67886f8dc4f' }, affine_redis: { image: 'redis:7-alpine@sha256:7f7d30b7fdd09467bac58198a1f166dd69789d348d4fe859cccb20e0cf287fbe' } };
const n8nServices = { n8n: { image: 'n8nio/n8n:2.47.0@sha256:bde957dfc5faf0fbe64f2db3f196c83909ca26da32600da0dce60fccd099b3e5', ports: [{ published: '5680', host_ip: '127.0.0.1', target: 5678 }], volumes: [{ type: 'bind', source: './data/n8n' }] }, n8n_runners: { image: 'n8nio/runners:2.47.0@sha256:61acfe410d5018dd5b208a4991e85b74bfebe01d96d62f19cea9e73557ed47f1' } };

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

test('acepta las tres aplicaciones registradas en el mismo catálogo', () => {
  const server = createManager({
    token: 'x'.repeat(40),
    stack: { directory: process.cwd(), project: 'aula-kanban-0123456789abcdef' },
    apps: ['affine', 'nodum', 'n8n'].map(id => ({ id, url: `https://${id}.example.test` })),
  });
  server.close();
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

test('espera a que el servicio esté sano y comunica fallos de salud', async () => {
  const token = 'h'.repeat(40);
  let health = 'starting';
  const server = createManager({ token, stack: { directory: process.cwd(), project: 'aula-kanban-0123456789abcdef' }, apps: [{ id: 'affine', url: 'https://affine.example.test' }], execute: async args => args.includes('ps') ? JSON.stringify([{ Service: 'affine', State: 'running', Health: health }]) : '' });
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  try {
    const root = `http://127.0.0.1:${server.address().port}/v1/apps`, headers = { authorization: `Bearer ${token}` };
    assert.equal((await (await fetch(root, { headers })).json()).apps[0].status, 'working');
    health = 'unhealthy';
    assert.equal((await (await fetch(root, { headers })).json()).apps[0].status, 'error');
    health = 'healthy';
    assert.equal((await (await fetch(root, { headers })).json()).apps[0].status, 'installed');
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
  nodum_postgres: { image: 'pgvector/pgvector:0.8.0-pg16@sha256:a132765ec351c65111b5b675928a3a0515a466a40f97277329db8b8209ad8bc9' },
  nodum_redis: { image: 'redis:7.4.2-alpine@sha256:02419de7eddf55aa5bcf49efb74e88fa8d931b4d77c07eff8a6b2144472b6952' },
  nodum_redis_control: { image: 'redis:7.4.2-alpine@sha256:02419de7eddf55aa5bcf49efb74e88fa8d931b4d77c07eff8a6b2144472b6952' },
  nodum_minio: { image: `quay.io/minio/minio:RELEASE.2025-09-07T16-13-09Z@sha256:${'0'.repeat(64)}` },
  nodum_migrate: { image: `nodum-api:prod@sha256:${'0'.repeat(64)}` },
  nodum_api: { image: `nodum-api:prod@sha256:${'0'.repeat(64)}` },
  nodum_worker: { image: `nodum-api:prod@sha256:${'0'.repeat(64)}` },
  nodum_beat: { image: `nodum-api:prod@sha256:${'0'.repeat(64)}` },
  nodum_web: { image: `nodum-web:prod@sha256:${'0'.repeat(64)}` },
  nodum_caddy: { image: 'caddy:2-alpine@sha256:78bd35025c7ba85961dd149ae670315129954e77abe2383ac47c89106b35ade9', ports: [{ published: '8090', host_ip: '127.0.0.1' }] },
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

test('n8n informa de error si su ejecutor no está funcionando', async () => {
  const token = '8'.repeat(40);
  const server = createManager({ token, stack: { directory: process.cwd(), project: 'aula-kanban-0123456789abcdef' }, apps: [{ id: 'n8n', url: 'https://n8n.example.test' }], execute: async args => args.includes('ps') ? JSON.stringify([{ Service: 'n8n', State: 'running', Image: 'n8nio/n8n:2.47.0' }, { Service: 'n8n_runners', State: 'exited' }]) : '' });
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  try {
    const response = await fetch(`http://127.0.0.1:${server.address().port}/v1/apps`, { headers: { authorization: `Bearer ${token}` } });
    assert.equal((await response.json()).apps[0].status, 'error');
  } finally { await new Promise(resolve => server.close(resolve)); }
});

test('instala, consulta y desinstala n8n y sus ejecutores', async () => {
  const calls = [], token = '8'.repeat(40);
  const server = createManager({ token, stack: { directory: process.cwd(), project: 'aula-kanban-0123456789abcdef' }, apps: [{ id: 'n8n', url: 'https://n8n.example.test' }], checkSpace: async () => ({ bavail: 10 ** 9, bsize: 4096 }), execute: async args => { calls.push(args); if (args.includes('config')) return JSON.stringify({ services: n8nServices }); if (args.includes('ps')) return JSON.stringify([{ Service: 'n8n', State: 'running', Image: 'n8nio/n8n:2.47.0' }, { Service: 'n8n_runners', State: 'running' }]); return ''; } });
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  try {
    const root = `http://127.0.0.1:${server.address().port}`, headers = { authorization: `Bearer ${token}` };
    const state = await (await fetch(root + '/v1/apps', { headers })).json();
    assert.equal(state.apps[0].status, 'installed');
    assert.equal(state.apps[0].version, '2.47.0');
    assert.equal((await fetch(root + '/v1/apps/n8n', { method: 'POST', headers })).status, 202);
    await new Promise(resolve => setTimeout(resolve, 10));
    const up = calls.find(args => args.includes('up'));
    assert.ok(up?.includes('n8n'), 'la entrada debe ser n8n');
    assert.equal(up.includes('--no-build'), true);
    assert.equal((await fetch(root + '/v1/apps/n8n', { method: 'DELETE', headers })).status, 202);
    await new Promise(resolve => setTimeout(resolve, 10));
    const rmCommand = calls.at(-1);
    assert.equal(rmCommand.includes('rm'), true);
    assert.equal(rmCommand.includes('n8n'), true);
    assert.equal(rmCommand.includes('n8n_runners'), true);
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

test('rechaza una imagen sin digest aunque sea la oficial (tag solo)', async () => {
  const calls = [], token = 'u'.repeat(40);
  const tampered = { ...services, affine_redis: { image: 'redis:7-alpine' } };
  const server = createManager({ token, stack: { directory: process.cwd(), project: 'aula-kanban-0123456789abcdef' }, apps: [{ id: 'affine', url: 'https://affine.example.test' }], checkSpace: async () => ({ bavail: 10 ** 9, bsize: 4096 }), execute: async args => { calls.push(args); return args.includes('config') ? JSON.stringify({ services: tampered }) : ''; } });
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  try {
    const root = `http://127.0.0.1:${server.address().port}`, headers = { authorization: `Bearer ${token}` };
    assert.equal((await fetch(root + '/v1/apps/affine', { method: 'POST', headers })).status, 202);
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

test('acepta binds bajo un stack con symlink (ruta no canónica)', async t => {
  const token = 'l'.repeat(40);
  const base = await mkdtemp(path.join(tmpdir(), 'aula-link-'));
  const realStack = path.join(base, 'real-stack');
  const linkStack = path.join(base, 'link-stack');
  await mkdir(realStack, { recursive: true });
  try { await symlink(realStack, linkStack, 'junction'); }
  catch { t.skip('Symlinks no disponibles en este entorno.'); return; }
  // El bind aún no existe en disco (primera instalación): resolveSource
  // canoniza el ancestro existente y anexa el resto. Sin el fix, la ruta
  // textual (bajo el symlink) no coincidía con la realDirectory canónica
  // y se rechazaba como outside_directory.
  const calls = [];
  const server = createManager({
    token,
    stack: { directory: linkStack, project: 'aula-kanban-0123456789abcdef' },
    apps: [{ id: 'nodum', url: 'https://nodum.example.test' }],
    checkSpace: async () => ({ bavail: 10 ** 9, bsize: 4096 }),
    execute: async args => {
      calls.push(args);
      return args.includes('config')
        ? JSON.stringify({ services: { ...nodumServices, nodum_postgres: { ...nodumServices.nodum_postgres, volumes: [{ type: 'bind', source: path.join(linkStack, 'data', 'nodum', 'postgres') }] } } })
        : '';
    },
  });
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  try {
    const root = `http://127.0.0.1:${server.address().port}`, headers = { authorization: `Bearer ${token}` };
    assert.equal((await fetch(root + '/v1/apps/nodum', { method: 'POST', headers })).status, 202);
    await new Promise(resolve => setTimeout(resolve, 30));
    assert.equal(calls.some(args => args.includes('up')), true, 'up debe ejecutarse con la ruta del symlink');
  } finally { await new Promise(resolve => server.close(resolve)); }
});

test('measureUsage suma ficheros y da 0 si el directorio no existe', async () => {
  const root = await mkdtemp(path.join(tmpdir(), 'aula-du-'));
  assert.equal(await measureUsage(path.join(root, 'falta')), 0);
  await mkdir(path.join(root, 'sub'), { recursive: true });
  await writeFile(path.join(root, 'a.bin'), 'x'.repeat(120));
  await writeFile(path.join(root, 'sub', 'b.bin'), 'y'.repeat(80));
  assert.equal(await measureUsage(root), 200);
});

test('rechaza la instalación si los datos ya superan la cuota', async () => {
  const token = 'u'.repeat(40);
  const rootDir = await mkdtemp(path.join(tmpdir(), 'aula-quota-'));
  const dataDir = path.join(rootDir, 'data', 'nodum');
  await mkdir(dataDir, { recursive: true });
  await writeFile(path.join(dataDir, 'big.bin'), 'x'.repeat(300));
  const calls = [];
  const server = createManager({ token, stack: { directory: rootDir, project: 'aula-kanban-0123456789abcdef' }, apps: [{ id: 'nodum', url: 'https://nodum.example.test', maxDataBytes: 100 }], checkSpace: async () => ({ bavail: 10 ** 9, bsize: 4096 }), execute: async args => { calls.push(args); return args.includes('config') ? JSON.stringify({ services: nodumServices }) : ''; } });
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  try {
    const root = `http://127.0.0.1:${server.address().port}`, headers = { authorization: `Bearer ${token}` };
    const state = await (await fetch(root + '/v1/apps', { headers })).json();
    assert.equal(state.apps[0].dataBytes, 300);
    assert.equal(state.apps[0].maxDataBytes, 100);
    assert.equal((await fetch(root + '/v1/apps/nodum', { method: 'POST', headers })).status, 202);
    await new Promise(resolve => setTimeout(resolve, 30));
    assert.equal(calls.some(args => args.includes('up')), false, 'no debe instalarse sobre la cuota');
    assert.equal((await (await fetch(root + '/v1/apps', { headers })).json()).apps[0].status, 'error');
  } finally { await new Promise(resolve => server.close(resolve)); }
});

test('acepta la instalación si los datos están por debajo de la cuota', async () => {
  const token = 'o'.repeat(40);
  const rootDir = await mkdtemp(path.join(tmpdir(), 'aula-quota-ok-'));
  const dataDir = path.join(rootDir, 'data', 'nodum');
  await mkdir(dataDir, { recursive: true });
  await writeFile(path.join(dataDir, 'small.bin'), 'x'.repeat(50));
  const calls = [];
  const server = createManager({ token, stack: { directory: rootDir, project: 'aula-kanban-0123456789abcdef' }, apps: [{ id: 'nodum', url: 'https://nodum.example.test', maxDataBytes: 100 }], checkSpace: async () => ({ bavail: 10 ** 9, bsize: 4096 }), execute: async args => { calls.push(args); return args.includes('config') ? JSON.stringify({ services: nodumServices }) : ''; } });
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  try {
    const root = `http://127.0.0.1:${server.address().port}`, headers = { authorization: `Bearer ${token}` };
    assert.equal((await fetch(root + '/v1/apps/nodum', { method: 'POST', headers })).status, 202);
    await new Promise(resolve => setTimeout(resolve, 30));
    assert.equal(calls.some(args => args.includes('up')), true);
  } finally { await new Promise(resolve => server.close(resolve)); }
});

test('una operación colgada en Docker acaba en error por timeout', async () => {
  const token = 't'.repeat(40);
  const server = createManager({
    token,
    stack: { directory: process.cwd(), project: 'aula-kanban-0123456789abcdef' },
    apps: [{ id: 'affine', url: 'https://affine.example.test' }],
    checkSpace: async () => ({ bavail: 10 ** 9, bsize: 4096 }),
    operationTimeoutMs: 20,
    execute: async args => args.includes('config')
      ? JSON.stringify({ services })
      : new Promise(() => {}),
  });
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  try {
    const root = `http://127.0.0.1:${server.address().port}`, headers = { authorization: `Bearer ${token}` };
    assert.equal((await fetch(root + '/v1/apps/affine', { method: 'POST', headers })).status, 202);
    await new Promise(resolve => setTimeout(resolve, 45));
    const state = await (await fetch(root + '/v1/apps', { headers })).json();
    assert.equal(state.apps[0].status, 'error');
  } finally { await new Promise(resolve => server.close(resolve)); }
});

test('durante una instalación el estado de las demás apps responde rápido desde caché', async () => {
  const token = 'c'.repeat(40);
  const calls = [];
  const server = createManager({
    token,
    stack: { directory: process.cwd(), project: 'aula-kanban-0123456789abcdef' },
    apps: [
      { id: 'affine', url: 'https://affine.example.test' },
      { id: 'n8n', url: 'https://n8n.example.test' },
    ],
    checkSpace: async () => ({ bavail: 10 ** 9, bsize: 4096 }),
    execute: async args => {
      calls.push(args);
      if (args.includes('config')) return JSON.stringify({ services: { ...services, ...n8nServices } });
      if (args.includes('up')) return new Promise(resolve => setTimeout(() => resolve(''), 150));
      if (args.includes('ps') && args.includes('n8n')) return JSON.stringify([{ Service: 'n8n', State: 'running', Image: 'n8nio/n8n:2.47.0' }, { Service: 'n8n_runners', State: 'running' }]);
      return '';
    },
  });
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  try {
    const root = `http://127.0.0.1:${server.address().port}`, headers = { authorization: `Bearer ${token}` };
    const initial = await (await fetch(root + '/v1/apps', { headers })).json();
    assert.equal(initial.apps.find(app => app.id === 'n8n').status, 'installed');
    const psCallsBefore = calls.filter(args => args.includes('ps')).length;
    assert.equal((await fetch(root + '/v1/apps/affine', { method: 'POST', headers })).status, 202);
    const during = await (await fetch(root + '/v1/apps', { headers })).json();
    assert.equal(during.apps.find(app => app.id === 'affine').status, 'working');
    assert.equal(during.apps.find(app => app.id === 'n8n').status, 'installed');
    assert.equal(calls.filter(args => args.includes('ps')).length, psCallsBefore, 'sin docker ps mientras hay una operación en curso');
    await new Promise(resolve => setTimeout(resolve, 250));
  } finally { await new Promise(resolve => server.close(resolve)); }
});

test('rechaza cuotas de datos no válidas en la configuración', () => {
  const base = { id: 'affine', url: 'https://app.example.test' };
  const stack = { directory: process.cwd(), project: 'aula-kanban-0123456789abcdef' };
  const token = 'k'.repeat(40);
  for (const maxDataBytes of [0, -1, 1.5, '100', 101 * 1024 ** 3]) assert.throws(() => createManager({ token, stack, apps: [{ ...base, maxDataBytes }] }));
  assert.doesNotThrow(() => createManager({ token, stack, apps: [base] }));
  assert.doesNotThrow(() => createManager({ token, stack, apps: [{ ...base, maxDataBytes: 100 * 1024 ** 3 }] }));
});
