import { createServer } from 'node:http';
import { timingSafeEqual } from 'node:crypto';
import { spawn } from 'node:child_process';
import { readFile, realpath, readdir, lstat, rm, statfs } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

// Cada servicio pertenece a un solo proyecto Compose de la instancia.
// Catálogo fijo: AFFiNE, Nodum y n8n. Las imágenes de Nodum salen de su compose
// oficial (deploy/docker-compose.yml + docker-compose.deploy.yml en el repo
// nodummd/nodum); las de api/web se construyen a mano en el VPS porque
// Nodum no publica imágenes oficiales y este gestor no compila
// (`up --no-build`). Ver vps-manager/nodum/compose.yaml.example.
// n8n es un único contenedor oficial (n8nio/n8n). Ver
// vps-manager/n8n/compose.yaml.example.
const applications = {
  affine: { entry: 'affine', services: ['affine', 'affine_migration', 'affine_postgres', 'affine_redis'] },
  nodum: { entry: 'nodum_web', services: ['nodum_postgres', 'nodum_redis', 'nodum_redis_control', 'nodum_minio', 'nodum_migrate', 'nodum_api', 'nodum_worker', 'nodum_beat', 'nodum_web', 'nodum_caddy'] },
  n8n: { entry: 'n8n', services: ['n8n'] },
};
/**
 * Imágenes permitidas, por servicio, fijadas por DIGEST (`tag@sha256:...`) para que un
 * re-etiquetado en el registro no pueda colar código distinto al auditado. Reflejan los
 * compose.yaml.example de affine/ y nodum/ (api/web de nodum son imágenes locales
 * construidas en el VPS, ver nodum/compose.yaml.example).
 *
 * EXCEPCIONES con digest de ceros (`sha256:000...0`), a rellenar en el VPS antes del
 * primer despliegue (ver README «Imágenes por digest»):
 * - nodum_minio: quay.io/minio/minio exige autenticación para pulls anónimos; hay que
 *   resolver el digest con sesión iniciada.
 * - nodum-api/nodum-web: imágenes locales construidas en el VPS; su «digest» es el Id de
 *   la imagen construida (`docker inspect --format '{{.Id}}'`).
 * Un digest de ceros no existe en ningún registro: el pull falla hasta sustituirlo.
 */
const ZEROS = '0'.repeat(64);
const allowedImages = {
  affine: 'ghcr.io/toeverything/affine:stable@sha256:b649f5ce2384ffdf13c23bccf81d759e15973d59d0b0058af65d895a84373099', affine_migration: 'ghcr.io/toeverything/affine:stable@sha256:b649f5ce2384ffdf13c23bccf81d759e15973d59d0b0058af65d895a84373099', affine_postgres: 'pgvector/pgvector:pg16@sha256:0dd3149a06e4579a0d70d8fef9945636cd514005e7237deb27f9b67886f8dc4f', affine_redis: 'redis:7-alpine@sha256:7f7d30b7fdd09467bac58198a1f166dd69789d348d4fe859cccb20e0cf287fbe',
  nodum_postgres: 'pgvector/pgvector:0.8.0-pg16@sha256:a132765ec351c65111b5b675928a3a0515a466a40f97277329db8b8209ad8bc9', nodum_redis: 'redis:7.4.2-alpine@sha256:02419de7eddf55aa5bcf49efb74e88fa8d931b4d77c07eff8a6b2144472b6952', nodum_redis_control: 'redis:7.4.2-alpine@sha256:02419de7eddf55aa5bcf49efb74e88fa8d931b4d77c07eff8a6b2144472b6952', nodum_minio: `quay.io/minio/minio:RELEASE.2025-09-07T16-13-09Z@sha256:${ZEROS}`,
  n8n: 'n8nio/n8n:2.47.0@sha256:bde957dfc5faf0fbe64f2db3f196c83909ca26da32600da0dce60fccd099b3e5',
  nodum_migrate: `nodum-api:prod@sha256:${ZEROS}`, nodum_api: `nodum-api:prod@sha256:${ZEROS}`, nodum_worker: `nodum-api:prod@sha256:${ZEROS}`, nodum_beat: `nodum-api:prod@sha256:${ZEROS}`, nodum_web: `nodum-web:prod@sha256:${ZEROS}`, nodum_caddy: 'caddy:2-alpine@sha256:78bd35025c7ba85961dd149ae670315129954e77abe2383ac47c89106b35ade9',
};

/** Referencia de imagen fijada por digest: `repo[:tag]@sha256:<64 hex>`. */
const PINNED_IMAGE = /^[^\s@]+@sha256:[a-f0-9]{64}$/;
const send = (res, status, value) => { res.writeHead(status, { 'content-type': 'application/json', 'cache-control': 'no-store' }); res.end(JSON.stringify(value)); };

// Cuota por app sobre sus datos en data/<app>: 10 GiB por defecto y 100 GiB
// como techo de configuración (evita cifras absurdas por un error al editar
// el catálogo). Se comprueba antes de instalar; el crecimiento posterior en
// ejecución no lo puede frenar el gestor (eso requeriría cuotas de FS).
const DEFAULT_MAX_DATA_BYTES = 10 * 1024 ** 3;
const MAX_DATA_BYTES_CAP = 100 * 1024 ** 3;

/** Suma los bytes de los ficheros bajo un directorio, sin seguir symlinks; 0 si no existe. */
export async function measureUsage(directory) {
  let total = 0;
  const walk = async dir => {
    let entries;
    try { entries = await readdir(dir, { withFileTypes: true }); }
    catch (error) { if (error.code === 'ENOENT' || error.code === 'ENOTDIR') return; throw error; }
    for (const entry of entries) {
      const full = path.join(dir, entry.name);
      if (entry.isSymbolicLink()) continue;
      if (entry.isDirectory()) { await walk(full); continue; }
      if (entry.isFile()) {
        try { total += (await lstat(full)).size; }
        catch (error) { if (error.code !== 'ENOENT') throw error; }
      }
    }
  };
  await walk(directory);
  return total;
}

// Log operativo en JSON por stdout: visible en `journalctl`/logs del VPS sin
// exponer secretos (nunca se registran token ni cabeceras Authorization).
const log = (event, fields = {}) => {
  try { process.stdout.write(`${JSON.stringify({ ts: new Date().toISOString(), event, ...fields })}\n`); } catch { /* el log nunca debe tumbar el gestor */ }
};
const safeError = error => String(error?.message ?? error ?? 'unknown').slice(0, 500);

/** Obliga al gestor a usar el socket de Docker rootless de su propio usuario. */
export function rootlessSocket(uid, runtimeDirectory) {
  if (!Number.isInteger(uid) || uid <= 0 || runtimeDirectory !== `/run/user/${uid}`) throw new Error('El gestor requiere un usuario dedicado y Docker rootless.');
  return `unix:///run/user/${uid}/docker.sock`;
}

/** Ejecuta solo Docker Compose con argumentos separados, sin intérprete de comandos. */
export function runDocker(args, cwd) {
  return new Promise((resolve, reject) => {
    const child = spawn('docker', args, { cwd, stdio: ['ignore', 'pipe', 'pipe'], env: { PATH: process.env.PATH, HOME: process.env.HOME, XDG_RUNTIME_DIR: process.env.XDG_RUNTIME_DIR, DOCKER_HOST: process.env.DOCKER_HOST } });
    let output = '';
    let stderr = '';
    child.stdout.on('data', chunk => { output = (output + chunk).slice(-1048576); });
    child.stderr.on('data', chunk => { stderr = (stderr + chunk).slice(-4000); });
    child.on('error', error => { log('docker_command_failed', { command: args.slice(0, 2), error: safeError(error) }); reject(error); });
    child.on('close', code => {
      if (code === 0) return resolve(output);
      log('docker_command_failed', { command: args.slice(0, 2), exitCode: code, stderr: stderr.trim().slice(0, 2000) || undefined });
      reject(new Error('docker_failed'));
    });
  });
}

/** Construye el servidor aislado; el catálogo procede solo de configuración local de confianza. */
export function createManager({ token, stack, apps, execute = runDocker, checkSpace = statfs, measure = measureUsage }) {
  if (typeof token !== 'string' || Buffer.byteLength(token) < 32) throw new Error('El token debe tener al menos 32 bytes.');
  if (!stack || !path.isAbsolute(stack.directory) || !/^aula-kanban-[a-f0-9]{16}$/.test(stack.project)) throw new Error('Proyecto de Aula no válido.');
  if (!Array.isArray(apps) || apps.length > Object.keys(applications).length) throw new Error('Catálogo no válido.');
  const catalog = new Map();
  for (const app of apps) {
    const url = new URL(app.url);
    if (!Object.hasOwn(applications, app.id) || catalog.has(app.id) || url.protocol !== 'https:' || url.username || url.password || url.search || url.hash) throw new Error('Configuración de aplicación no válida.');
    const maxDataBytes = app.maxDataBytes ?? DEFAULT_MAX_DATA_BYTES;
    if (!Number.isSafeInteger(maxDataBytes) || maxDataBytes <= 0 || maxDataBytes > MAX_DATA_BYTES_CAP) throw new Error('Cuota de datos no válida.');
    catalog.set(app.id, { ...app, url: url.href, maxDataBytes });
  }
  /** Comprueba que los datos de la app no superen su cuota; devuelve los bytes actuales. */
  const checkQuota = async app => {
    const bytes = await measure(path.join(stack.directory, 'data', app.id));
    if (bytes > app.maxDataBytes) throw new Error('quota_exceeded');
    return bytes;
  };
  const working = new Set();
  const failed = new Set();
  const compose = () => ['compose', '--project-name', stack.project, '--file', path.join(stack.directory, 'compose.yaml')];
  /**
   * Resuelve un bind aunque aún no exista (primera instalación: Docker lo crea al levantar).
   * Si no existe, canoniza el ancestro más largo que sí exista y anexa el resto: así un
   * symlink (u otro nombre no canónico) en la ruta del stack no hace que el bind parezca
   * estar fuera del stack al compararlo con la realDirectory (ya canónica).
   */
  const resolveSource = async (source, realDirectory) => {
    const absolute = path.isAbsolute(source) ? path.resolve(source) : path.resolve(realDirectory, source);
    try { return await realpath(absolute); } catch { /* puede aún no existir: se canoniza el ancestro */ }
    const { root } = path.parse(absolute);
    const segments = absolute.slice(root.length).split(path.sep).filter(Boolean);
    let current = root;
    const remainder = [];
    for (const segment of segments) {
      try { current = await realpath(path.join(current, segment)); }
      catch { remainder.push(segment); }
    }
    return remainder.length ? path.join(current, ...remainder) : current;
  };
  const validateCompose = async () => {
    const config = JSON.parse(await execute([...compose(), 'config', '--format', 'json'], stack.directory));
    const realDirectory = await realpath(stack.directory);
    if (!config.services || !Object.keys(config.services).length) throw new Error('empty_compose');
    const permitted = new Set([...catalog.keys()].flatMap(id => applications[id].services));
    if ([...permitted].some(name => !Object.hasOwn(config.services, name))) throw new Error('missing_service');
    for (const [name, service] of Object.entries(config.services)) {
      if (!permitted.has(name)) throw new Error('unknown_service');
      if (typeof service.image !== 'string' || !PINNED_IMAGE.test(service.image)) throw new Error('unpinned_image');
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
  /** Extrae la etiqueta de versión de una imagen (`repo:tag@sha256:...` → `tag`). */
  const imageVersion = image => {
    if (typeof image !== 'string') return null;
    const ref = image.split('@')[0];
    const slash = ref.lastIndexOf('/');
    const colon = ref.lastIndexOf(':');
    return colon > slash && colon < ref.length - 1 ? ref.slice(colon + 1) : null;
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
      try { return send(res, 200, { apps: await Promise.all([...catalog.values()].map(async app => { const result = await status(app); const state = typeof result === 'string' ? { status: result, version: null } : result; return { id: app.id, status: state.status, url: app.url, version: state.version, dataBytes: await measure(path.join(stack.directory, 'data', app.id)), maxDataBytes: app.maxDataBytes }; })) }); }
      catch (error) { log('status_failed', { error: safeError(error) }); return send(res, 503, { message: 'No se pudo consultar Docker.' }); }
    }
    const match = /^\/v1\/apps\/(affine|nodum|n8n)(\/reset)?$/.exec(req.url ?? '');
    const isReset = Boolean(match?.[2]);
    if (!match || !catalog.has(match[1]) || (req.method !== 'POST' && req.method !== 'DELETE') || (isReset && req.method !== 'POST')) return send(res, 404, { message: 'No disponible.' });
    const app = catalog.get(match[1]);
    if (working.size) return send(res, 409, { message: 'Operación en curso.' });
    failed.delete(app.id);
    working.add(app.id);
    // Nunca se usa down ni prune: solo los servicios de esta app. El reset
    // añade el borrado acotado de sus binds/volúmenes (función resetData).
    const action = isReset || req.method === 'DELETE' ? ['rm', '--stop', '--force', ...applications[app.id].services] : ['up', '-d', '--no-build', applications[app.id].entry];
    const operation = isReset ? 'reset' : req.method === 'DELETE' ? 'uninstall' : 'install';
    log('operation_accepted', { operation, app: app.id });
    void validateCompose().then(async config => {
      if (req.method === 'POST' && !isReset) {
        const disk = await checkSpace(stack.directory);
        if (disk.bavail * disk.bsize < 5 * 1024 ** 3) throw new Error('insufficient_space');
        await checkQuota(app);
      }
      await execute([...compose(), ...action], stack.directory);
      if (isReset) await resetData(app, config);
      log('operation_done', { operation, app: app.id });
    }).catch(error => { failed.add(app.id); log('operation_failed', { operation, app: app.id, error: safeError(error) }); }).finally(() => working.delete(app.id));
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
  server.listen(port, '127.0.0.1', () => log('listening', { port }));
}
