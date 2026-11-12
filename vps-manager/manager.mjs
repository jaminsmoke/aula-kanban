import { createServer } from 'node:http';
import { timingSafeEqual } from 'node:crypto';
import { spawn } from 'node:child_process';
import { readFile, realpath, rm, statfs } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

// Cada servicio pertenece a un solo proyecto Compose de la instancia.
// Catálogo fijo: AFFiNE y Nodum. Las imágenes de Nodum salen de su compose
// oficial (deploy/docker-compose.yml + docker-compose.deploy.yml en el repo
// nodummd/nodum); las de api/web se construyen a mano en el VPS porque
// Nodum no publica imágenes oficiales y este gestor no compila
// (`up --no-build`). Ver vps-manager/nodum/compose.yaml.example.
const applications = {
  affine: { entry: 'affine', services: ['affine', 'affine_migration', 'affine_postgres', 'affine_redis'] },
  nodum: { entry: 'nodum_web', services: ['nodum_postgres', 'nodum_redis', 'nodum_redis_control', 'nodum_minio', 'nodum_migrate', 'nodum_api', 'nodum_worker', 'nodum_beat', 'nodum_web', 'nodum_caddy'] },
};
const allowedImages = {
  affine: 'ghcr.io/toeverything/affine:stable', affine_migration: 'ghcr.io/toeverything/affine:stable', affine_postgres: 'pgvector/pgvector:pg16', affine_redis: 'redis:7-alpine',
  nodum_postgres: 'pgvector/pgvector:0.8.0-pg16', nodum_redis: 'redis:7.4.2-alpine', nodum_redis_control: 'redis:7.4.2-alpine', nodum_minio: 'quay.io/minio/minio:RELEASE.2025-09-07T16-13-09Z',
  nodum_migrate: 'nodum-api:prod', nodum_api: 'nodum-api:prod', nodum_worker: 'nodum-api:prod', nodum_beat: 'nodum-api:prod', nodum_web: 'nodum-web:prod', nodum_caddy: 'caddy:2-alpine',
};
const send = (res, status, value) => { res.writeHead(status, { 'content-type': 'application/json', 'cache-control': 'no-store' }); res.end(JSON.stringify(value)); };

/** Obliga al gestor a usar el socket de Docker rootless de su propio usuario. */
export function rootlessSocket(uid, runtimeDirectory) {
  if (!Number.isInteger(uid) || uid <= 0 || runtimeDirectory !== `/run/user/${uid}`) throw new Error('El gestor requiere un usuario dedicado y Docker rootless.');
  return `unix:///run/user/${uid}/docker.sock`;
}

/** Ejecuta solo Docker Compose con argumentos separados, sin intérprete de comandos. */
export function runDocker(args, cwd) {
  return new Promise((resolve, reject) => {
    const child = spawn('docker', args, { cwd, stdio: ['ignore', 'pipe', 'ignore'], env: { PATH: process.env.PATH, HOME: process.env.HOME, XDG_RUNTIME_DIR: process.env.XDG_RUNTIME_DIR, DOCKER_HOST: process.env.DOCKER_HOST } });
    let output = '';
    child.stdout.on('data', chunk => { output = (output + chunk).slice(-1048576); });
    child.on('error', reject);
    child.on('close', code => code === 0 ? resolve(output) : reject(new Error('docker_failed')));
  });
}

/** Construye el servidor aislado; el catálogo procede solo de configuración local de confianza. */
export function createManager({ token, stack, apps, execute = runDocker, checkSpace = statfs }) {
  if (typeof token !== 'string' || Buffer.byteLength(token) < 32) throw new Error('El token debe tener al menos 32 bytes.');
  if (!stack || !path.isAbsolute(stack.directory) || !/^aula-kanban-[a-f0-9]{16}$/.test(stack.project)) throw new Error('Proyecto de Aula no válido.');
  if (!Array.isArray(apps) || apps.length > 2) throw new Error('Catálogo no válido.');
  const catalog = new Map();
  for (const app of apps) {
    const url = new URL(app.url);
    if (!Object.hasOwn(applications, app.id) || catalog.has(app.id) || url.protocol !== 'https:' || url.username || url.password || url.search || url.hash) throw new Error('Configuración de aplicación no válida.');
    catalog.set(app.id, { ...app, url: url.href });
  }
  const working = new Set();
  const failed = new Set();
  const compose = () => ['compose', '--project-name', stack.project, '--file', path.join(stack.directory, 'compose.yaml')];
  /** Resuelve un bind aunque aún no exista (primera instalación: Docker lo crea al levantar). */
  const resolveSource = async (source, realDirectory) => {
    try { return await realpath(source); } catch { return path.isAbsolute(source) ? path.resolve(source) : path.resolve(realDirectory, source); }
  };
  const validateCompose = async () => {
    const config = JSON.parse(await execute([...compose(), 'config', '--format', 'json'], stack.directory));
    const realDirectory = await realpath(stack.directory);
    if (!config.services || !Object.keys(config.services).length) throw new Error('empty_compose');
    const permitted = new Set([...catalog.keys()].flatMap(id => applications[id].services));
    if ([...permitted].some(name => !Object.hasOwn(config.services, name))) throw new Error('missing_service');
    for (const [name, service] of Object.entries(config.services)) {
      if (!permitted.has(name)) throw new Error('unknown_service');
      if (service.image !== allowedImages[name]) throw new Error('unknown_image');
      if (service.container_name || service.privileged || service.network_mode || service.pid === 'host' || service.ipc === 'host' || service.build || service.devices?.length || service.cap_add?.length || service.volumes_from?.length || service.security_opt?.length) throw new Error('unsafe_compose');
      for (const volume of service.volumes ?? []) {
        if (volume.type === 'bind') {
          const relative = path.relative(realDirectory, await resolveSource(volume.source, realDirectory));
          if (relative.startsWith('..') || path.isAbsolute(relative)) throw new Error('outside_directory');
        }
      }
      for (const port of service.ports ?? []) if (port.published && port.host_ip !== '127.0.0.1' && port.host_ip !== '::1') throw new Error('public_port');
    }
    for (const volume of Object.values(config.volumes ?? {})) if (volume.external || volume.driver_opts && Object.keys(volume.driver_opts).length || volume.name && !volume.name.startsWith(`${stack.project}_`)) throw new Error('external_volume');
    for (const network of Object.values(config.networks ?? {})) if (network.external || network.name && !network.name.startsWith(`${stack.project}_`)) throw new Error('external_network');
    return config;
  };
  /** Extrae la etiqueta de versión de una imagen (`repo:tag` → `tag`). */
  const imageVersion = image => {
    if (typeof image !== 'string') return null;
    const slash = image.lastIndexOf('/');
    const colon = image.lastIndexOf(':');
    return colon > slash && colon < image.length - 1 ? image.slice(colon + 1) : null;
  };
  /** Borra exclusivamente los datos de la app, preservando su configuración y volúmenes ajenos. */
  const resetData = async (app, config) => {
    const realDirectory = await realpath(stack.directory);
    const binds = new Set();
    const volumeNames = new Set();
    let dataDirectory;
    try { dataDirectory = await realpath(path.join(realDirectory, 'data', app.id)); }
    catch (error) { if (error.code !== 'ENOENT') throw error; }
    if (dataDirectory) {
      const relative = path.relative(realDirectory, dataDirectory);
      if (relative !== path.join('data', app.id)) throw new Error('outside_directory');
    }
    for (const name of applications[app.id].services) {
      for (const volume of config.services[name]?.volumes ?? []) {
        if (volume.type === 'volume') {
          const named = config.volumes?.[volume.source]?.name;
          if (!named || !named.startsWith(`${stack.project}_`)) throw new Error('unknown_volume');
          volumeNames.add(named);
        }
        if (volume.type !== 'bind' || !dataDirectory) continue;
        let target;
        try { target = await realpath(volume.source); }
        catch (error) { if (error.code === 'ENOENT') continue; throw error; }
        const relative = path.relative(dataDirectory, target);
        if (!relative || (!relative.startsWith('..') && !path.isAbsolute(relative))) binds.add(target);
      }
    }
    for (const target of binds) await rm(target, { recursive: true, force: true });
    const named = [...volumeNames];
    if (named.length) await execute(['volume', 'rm', '-f', ...named], stack.directory);
  };
  const status = async app => {
    if (working.has(app.id)) return 'working';
    if (failed.has(app.id)) return 'error';
    const raw = await execute([...compose(), 'ps', '--all', '--format', 'json', ...applications[app.id].services], stack.directory);
    const trimmed = raw.trim();
    if (!trimmed) return 'not_installed';
    let rows;
    try { rows = trimmed.startsWith('[') ? JSON.parse(trimmed) : trimmed.split('\n').map(line => JSON.parse(line)); } catch { throw new Error('docker_status_invalid'); }
    if (!Array.isArray(rows)) throw new Error('docker_status_invalid');
    if (!rows.length) return 'not_installed';
    const entry = rows.find(row => row.Service === applications[app.id].entry);
    const running = rows.some(row => row.Service === applications[app.id].entry && row.State === 'running' && row.Health !== 'unhealthy');
    return { status: running ? 'installed' : 'stopped', version: imageVersion(entry?.Image) };
  };
  return createServer(async (req, res) => {
    if (!req.headers.authorization?.startsWith('Bearer ')) return send(res, 401, { message: 'No autorizado.' });
    const supplied = Buffer.from(req.headers.authorization.slice(7));
    const expected = Buffer.from(token);
    if (supplied.length !== expected.length || !timingSafeEqual(supplied, expected)) return send(res, 401, { message: 'No autorizado.' });
    if (req.method === 'GET' && req.url === '/v1/apps') {
      try { return send(res, 200, { apps: await Promise.all([...catalog.values()].map(async app => { const result = await status(app); const state = typeof result === 'string' ? { status: result, version: null } : result; return { id: app.id, status: state.status, url: app.url, version: state.version }; })) }); }
      catch { return send(res, 503, { message: 'No se pudo consultar Docker.' }); }
    }
    const match = /^\/v1\/apps\/(affine|nodum)(\/reset)?$/.exec(req.url ?? '');
    const isReset = Boolean(match?.[2]);
    if (!match || !catalog.has(match[1]) || (req.method !== 'POST' && req.method !== 'DELETE') || (isReset && req.method !== 'POST')) return send(res, 404, { message: 'No disponible.' });
    const app = catalog.get(match[1]);
    if (working.size) return send(res, 409, { message: 'Operación en curso.' });
    failed.delete(app.id);
    working.add(app.id);
    // Nunca se usa down ni prune: solo los servicios de esta app. El reset
    // añade el borrado acotado de sus binds/volúmenes (función resetData).
    const action = isReset || req.method === 'DELETE' ? ['rm', '--stop', '--force', ...applications[app.id].services] : ['up', '-d', '--no-build', applications[app.id].entry];
    void validateCompose().then(async config => {
      if (req.method === 'POST' && !isReset) {
        const disk = await checkSpace(stack.directory);
        if (disk.bavail * disk.bsize < 5 * 1024 ** 3) throw new Error('insufficient_space');
      }
      await execute([...compose(), ...action], stack.directory);
      if (isReset) await resetData(app, config);
    }).catch(() => { failed.add(app.id); }).finally(() => working.delete(app.id));
    return send(res, 202, { accepted: true });
  });
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  if (process.env.SPACE_MANAGER_EXPERIMENTAL !== '1') throw new Error('Prototipo: no está listo para producción.');
  const uid = process.getuid?.();
  // No heredar un DOCKER_HOST ajeno ni acceder al socket del daemon principal.
  process.env.DOCKER_HOST = rootlessSocket(uid, process.env.XDG_RUNTIME_DIR);
  const configPath = process.env.SPACE_MANAGER_CONFIG;
  if (!configPath || !path.isAbsolute(configPath)) throw new Error('Falta SPACE_MANAGER_CONFIG absoluto.');
  const config = JSON.parse(await readFile(configPath, 'utf8'));
  const server = createManager({ token: process.env.SPACE_MANAGER_TOKEN, stack: config.stack, apps: config.apps });
  const port = Number(process.env.SPACE_MANAGER_PORT || 8765);
  if (!Number.isInteger(port) || port < 1024 || port > 65535) throw new Error('Puerto no válido.');
  server.listen(port, '127.0.0.1');
}
