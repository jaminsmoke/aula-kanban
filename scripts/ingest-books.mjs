// Ingesta de libros escolares a R2 (STORE-02, Fase 2).
//
// Uso:
//   node scripts/ingest-books.mjs <bookId> [--remote] [--force]
//   node scripts/ingest-books.mjs --all [--remote]
//
// Descarga el PDF de la fuente indicada en `lib/books.ts`, verifica su
// tamaño contra el catálogo y lo sube a R2 con una clave versionada
// (`books/<id>/<fecha>.pdf`, inmutable). Después actualiza
// `storageKey` y `version` de esa ficha en `lib/books.ts`.
// Sin `--remote` escribe en el R2 local del dev server (state-v20);
// con `--remote` escribe en el bucket de producción (lo hace Codex al
// publicar). Nunca se toca código ni datos remotos sin ese flag.

import { spawnSync } from "node:child_process";
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const repoRoot = join(dirname(fileURLToPath(import.meta.url)), "..");
const catalogPath = join(repoRoot, "lib", "books.ts");
const bucketName = "site-creator-r2";

const args = process.argv.slice(2);
const remote = args.includes("--remote");
const force = args.includes("--force");
const all = args.includes("--all");
const id = args.find((arg) => !arg.startsWith("--") && arg !== "--remote" && arg !== "--force" && arg !== "--all");

if (!all && !id) {
  console.error("Uso: node scripts/ingest-books.mjs <bookId> [--remote] [--force]  |  --all [--remote]");
  process.exit(2);
}

/** Extrae el bloque de una ficha del catálogo por su id. */
function catalog() {
  return readFileSync(catalogPath, "utf8");
}

/** Lee url y tamaño declarados de una ficha. */
function bookFields(source, bookId) {
  const start = source.indexOf(`id: "${bookId}"`);
  if (start === -1) throw new Error(`libro desconocido: ${bookId}`);
  const rest = source.slice(start);
  const url = rest.match(/url: "(https:\/\/[^"]+)"/)?.[1];
  const sizeBytes = Number(rest.match(/sizeBytes: (\d+)/)?.[1]);
  const storageKey = rest.match(/storageKey: ("[^"]+"|null)/)?.[1];
  if (!url || !sizeBytes) throw new Error(`ficha incompleta: ${bookId}`);
  return { url, sizeBytes, ingested: storageKey !== "null" };
}

/** Todos los ids del catálogo, en orden. */
function allIds(source) {
  return [...source.matchAll(/id: "([^"]+)"/g)].map((match) => match[1]);
}

/** Marca la ficha como ingerida con su clave y versión. */
function patchCatalog(bookId, storageKey, version) {
  const source = catalog();
  const pattern = new RegExp(`(id: "${bookId}"[\\s\\S]*?)(version: null,\\r?\\n(\\s*)storageKey: null,)`);
  if (!pattern.test(source)) throw new Error(`la ficha ${bookId} ya está ingerida o no tiene el estado pendiente`);
  const next = source.replace(pattern, (_match, head, _tail, indent) => `${head}version: "${version}",\n${indent}storageKey: "${storageKey}",`);
  writeFileSync(catalogPath, next, "utf8");
}

/** Sube un archivo temporal a R2 (local por defecto). */
function putObject(filePath, key) {
  const tempDir = mkdtempSync(join(tmpdir(), "ingest-books-"));
  const configPath = join(tempDir, "wrangler-r2.jsonc");
  writeFileSync(configPath, JSON.stringify({ r2_buckets: [{ binding: "BUCKET", bucket_name: bucketName }] }));
  const wrangler = join(repoRoot, "node_modules", "wrangler", "bin", "wrangler.js");
  const command = [
    wrangler,
    "r2", "object", "put", `${bucketName}/${key}`,
    "--file", filePath,
    "--content-type", "application/pdf",
    "--config", configPath,
    remote ? "--remote" : "--local",
    ...(!remote ? ["--persist-to", join(repoRoot, ".wrangler", "state-v20")] : []),
  ];
  const result = spawnSync(process.execPath, command, { cwd: repoRoot, stdio: "inherit" });
  rmSync(tempDir, { recursive: true, force: true });
  if (result.error) throw result.error;
  if (result.status !== 0) throw new Error(`wrangler r2 put falló (${result.status})`);
}

/** Ingiere un libro: descarga, verifica, sube y marca la ficha. */
async function ingest(bookId) {
  const source = catalog();
  const { url, sizeBytes, ingested } = bookFields(source, bookId);
  if (ingested && !force) {
    process.stdout.write(`= ${bookId}: ya ingerido, se omite (usa --force para reingerir)
`);
    return;
  }
  process.stdout.write(`→ ${bookId}: descargando ${url}
`);
  const response = await fetch(url);
  if (!response.ok) throw new Error(`${bookId}: la fuente respondió ${response.status}`);
  const bytes = Buffer.from(await response.arrayBuffer());
  if (bytes.length !== sizeBytes) {
    throw new Error(`${bookId}: la fuente cambió (catálogo: ${sizeBytes} bytes, descargado: ${bytes.length}). Actualiza lib/books.ts antes de ingerir.`);
  }
  const version = new Date().toISOString().slice(0, 10);
  const storageKey = `books/${bookId}/${version}.pdf`;
  const tempDir = mkdtempSync(join(tmpdir(), "ingest-books-"));
  try {
    const tempFile = join(tempDir, `${bookId}.pdf`);
    writeFileSync(tempFile, bytes);
    if (!existsSync(tempFile)) throw new Error("no se escribió el temporal");
    putObject(tempFile, storageKey);
  } finally {
    rmSync(tempDir, { recursive: true, force: true });
  }
  // Si se reingiere con --force, la ficha ya tiene clave: se actualiza la versión.
  const current = catalog();
  if (current.includes(`id: "${bookId}"`) && bookFields(current, bookId).ingested) {
    const pattern = new RegExp(`(id: "${bookId}"[\\s\\S]*?)version: "[^"]+",\\r?\\n(\\s*)storageKey: "[^"]+",`);
    const next = current.replace(pattern, (_match, head, indent) => `${head}version: "${version}",\n${indent}storageKey: "${storageKey}",`);
    writeFileSync(catalogPath, next, "utf8");
  } else {
    patchCatalog(bookId, storageKey, version);
  }
  process.stdout.write(`✓ ${bookId}: ${storageKey} (${bytes.length} bytes, ${remote ? "remoto" : "local"})
`);
}

const ids = all ? allIds(catalog()) : [id];
for (const bookId of ids) {
  await ingest(bookId);
}
process.stdout.write("Listo. Recuerda commitear el cambio de lib/books.ts con la ingesta.\n");
