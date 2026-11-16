// Extracción de portadas y contraportadas de libros a R2 (STORE-02).
//
// Uso:
//   node scripts/extract-book-covers.mjs <bookId> [--remote] [--force]
//   node scripts/extract-book-covers.mjs --all [--remote]
//
// Descarga el PDF de la fuente del catálogo (con reintentos: la fuente
// es intermitente), rasteriza su página 1 (portada) y 2 (contraportada
// legal) a JPEG de 480 px con scripts/rasterize-pages.py, sube ambas
// imágenes a R2 con claves versionadas (`books/<id>/<versión>-cover.jpg`
// y `-back.jpg`) y marca `coverKey`/`backKey` en `lib/books.ts`.
// Sin `--remote` escribe en el R2 local; `--remote` es para Codex en
// producción. Requiere Python con PyMuPDF (`python -m pip install pymupdf`).

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
const id = args.find((arg) => !arg.startsWith("--"));

if (!all && !id) {
  console.error("Uso: node scripts/extract-book-covers.mjs <bookId> [--remote] [--force]  |  --all [--remote]");
  process.exit(2);
}

function catalog() {
  return readFileSync(catalogPath, "utf8");
}

/** Lee url, tamaño, versión y claves de una ficha. */
function bookFields(source, bookId) {
  const start = source.indexOf(`id: "${bookId}"`);
  if (start === -1) throw new Error(`libro desconocido: ${bookId}`);
  const rest = source.slice(start);
  const url = rest.match(/url: "(https:\/\/[^"]+)"/)?.[1];
  const sizeBytes = Number(rest.match(/sizeBytes: (\d+)/)?.[1]);
  const version = rest.match(/version: ("[^"]+"|null)/)?.[1];
  const coverKey = rest.match(/coverKey: ("[^"]+"|null)/)?.[1];
  if (!url || !sizeBytes || version === undefined) throw new Error(`ficha incompleta: ${bookId}`);
  return { url, sizeBytes, version: version === "null" ? null : version.slice(1, -1), extracted: coverKey !== "null" };
}

function allIds(source) {
  return [...source.matchAll(/id: "([^"]+)"/g)].map((match) => match[1]);
}

/** Marca la ficha con las claves de portada y contraportada. */
function patchCatalog(bookId, coverKey, backKey) {
  const source = catalog();
  // El catálogo admite CRLF o LF según el editor.
  const eol = source.includes("\r\n") ? "\r\n" : "\n";
  const pending = new RegExp(`(id: "${bookId}"[\\s\\S]*?)(coverKey: null,\\r?\\n(\\s*)backKey: null,)`);
  const done = new RegExp(`(id: "${bookId}"[\\s\\S]*?)coverKey: "[^"]+",\\r?\\n(\\s*)backKey: "[^"]+",`);
  const replace = (_match, head, _oldPair, indent) => `${head}coverKey: "${coverKey}",${eol}${indent}backKey: "${backKey}",`;
  const next = pending.test(source) ? source.replace(pending, replace) : source.replace(done, replace);
  if (next === source) throw new Error(`no se pudo marcar la ficha ${bookId} en lib/books.ts`);
  writeFileSync(catalogPath, next, "utf8");
}

/** Sube un archivo temporal a R2 (local por defecto). */
function putObject(filePath, key) {
  const tempDir = mkdtempSync(join(tmpdir(), "extract-covers-"));
  const configPath = join(tempDir, "wrangler-r2.jsonc");
  writeFileSync(configPath, JSON.stringify({ r2_buckets: [{ binding: "BUCKET", bucket_name: bucketName }] }));
  const wrangler = join(repoRoot, "node_modules", "wrangler", "bin", "wrangler.js");
  const command = [
    wrangler,
    "r2", "object", "put", `${bucketName}/${key}`,
    "--file", filePath,
    "--content-type", "image/jpeg",
    "--config", configPath,
    remote ? "--remote" : "--local",
    ...(!remote ? ["--persist-to", join(repoRoot, ".wrangler", "state-v20")] : []),
  ];
  const result = spawnSync(process.execPath, command, { cwd: repoRoot, stdio: "inherit" });
  rmSync(tempDir, { recursive: true, force: true });
  if (result.error) throw result.error;
  if (result.status !== 0) throw new Error(`wrangler r2 put falló (${result.status})`);
}

/** Descarga el PDF con reintentos y verifica su tamaño. */
async function download(url, sizeBytes, bookId) {
  let lastError;
  for (let attempt = 1; attempt <= 3; attempt += 1) {
    try {
      const response = await fetch(url);
      if (!response.ok) throw new Error(`la fuente respondió ${response.status}`);
      const bytes = Buffer.from(await response.arrayBuffer());
      if (bytes.length !== sizeBytes) throw new Error(`la fuente cambió (descargado: ${bytes.length} bytes, catálogo: ${sizeBytes})`);
      return bytes;
    } catch (error) {
      lastError = error;
      process.stdout.write(`  ${bookId}: intento ${attempt} falló (${error.message}); reintentando…\n`);
      await new Promise((resolve) => setTimeout(resolve, 3000));
    }
  }
  throw lastError;
}

/** Extrae portada/contraportada de un libro y las sube a R2. */
async function extract(bookId) {
  const source = catalog();
  const { url, sizeBytes, version, extracted } = bookFields(source, bookId);
  if (extracted && !force) {
    process.stdout.write(`= ${bookId}: portadas ya extraídas, se omite (usa --force para reextraer)\n`);
    return;
  }
  if (!version) throw new Error(`${bookId}: sin versión ingerida; ingiere el PDF primero`);
  process.stdout.write(`→ ${bookId}: descargando PDF…\n`);
  const bytes = await download(url, sizeBytes, bookId);
  const tempDir = mkdtempSync(join(tmpdir(), "extract-covers-"));
  try {
    const pdfPath = join(tempDir, `${bookId}.pdf`);
    writeFileSync(pdfPath, bytes);
    const imagesDir = join(tempDir, "images");
    const python = process.platform === "win32" ? "python" : "python3";
    const raster = spawnSync(python, [join(repoRoot, "scripts", "rasterize-pages.py"), pdfPath, imagesDir], { cwd: repoRoot, stdio: "inherit" });
    if (raster.error) throw raster.error;
    if (raster.status !== 0) throw new Error(`rasterize-pages.py falló (${raster.status})`);
    const coverPath = join(imagesDir, "cover.jpg");
    const backPath = join(imagesDir, "back.jpg");
    if (!existsSync(coverPath) || !existsSync(backPath)) throw new Error("no se generaron las imágenes");
    const coverKey = `books/${bookId}/${version}-cover.jpg`;
    const backKey = `books/${bookId}/${version}-back.jpg`;
    putObject(coverPath, coverKey);
    putObject(backPath, backKey);
    patchCatalog(bookId, coverKey, backKey);
    process.stdout.write(`✓ ${bookId}: ${coverKey} + ${backKey} (${remote ? "remoto" : "local"})\n`);
  } finally {
    rmSync(tempDir, { recursive: true, force: true });
  }
}

const ids = all ? allIds(catalog()) : [id];
for (const bookId of ids) {
  await extract(bookId);
}
process.stdout.write("Listo. Recuerda commitear el cambio de lib/books.ts con las portadas.\n");
