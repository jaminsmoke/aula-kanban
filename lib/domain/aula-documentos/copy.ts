import { unzipSync, zipSync, type UnzipFileInfo } from "fflate";
import {
  AULA_DOCUMENT_SCHEMA_VERSION,
  AULA_DOCUMENT_TITLE_MAX_LENGTH,
  parseAulaDocument,
  type AulaDocument,
} from "./document";
import {
  AULA_IMAGE_MAX_BYTES,
  AULA_IMAGE_MIME_TYPES,
  collectAulaImageUploadIds,
} from "./image";

/** Identificador del formato de copia portable. */
export const AULA_COPY_FORMAT = "aula-document-copy" as const;

/** Versión del contenedor de copia que entiende esta entrega. */
export const AULA_COPY_FORMAT_VERSION = 1 as const;

/** Tamaño máximo del archivo ZIP completo. */
export const AULA_COPY_MAX_ZIP_BYTES = 60 * 1024 * 1024;

/** Tope de bytes descomprimidos de todas las entradas. */
export const AULA_COPY_MAX_UNCOMPRESSED_BYTES = 60 * 1024 * 1024;

/** Tope del documento serializado. */
export const AULA_COPY_MAX_DOCUMENT_BYTES = 250_000;

/** Tope del manifiesto serializado. */
export const AULA_COPY_MAX_MANIFEST_BYTES = 64 * 1024;

/** Número máximo de imágenes de una copia. */
export const AULA_COPY_MAX_ASSETS = 30;

/** Cuota máxima de imágenes de una copia. */
export const AULA_COPY_MAX_ASSETS_BYTES = 50 * 1024 * 1024;

/** Entradas ZIP admitidas: manifiesto, documento y assets. */
export const AULA_COPY_MAX_ENTRIES = AULA_COPY_MAX_ASSETS + 2;

/** Cuota de copias por proyecto (200 MB). */
export const AULA_COPY_PROJECT_QUOTA_BYTES = 200 * 1024 * 1024;

/** Número máximo de copias retenidas por proyecto. */
export const AULA_COPY_MAX_PER_PROJECT = 20;

/** Nombres reservados del contenedor. */
export const AULA_COPY_MANIFEST_FILE = "manifest.json";
export const AULA_COPY_DOCUMENT_FILE = "document.json";

/** Códigos estables para que la interfaz traduzca los errores. */
export type AulaCopyErrorCode =
  | "invalid-zip"
  | "too-large"
  | "too-many-entries"
  | "duplicate-entry"
  | "unsafe-path"
  | "invalid-manifest"
  | "unsupported-version"
  | "invalid-document"
  | "missing-asset"
  | "unused-asset"
  | "invalid-asset"
  | "hash-mismatch";

/** Asset de imagen que viaja dentro de la copia. */
export type AulaCopyAsset = {
  id: string;
  mime: (typeof AULA_IMAGE_MIME_TYPES)[number];
  bytes: Uint8Array;
};

/** Entrada del manifiesto que describe un asset. */
export type AulaCopyManifestAsset = {
  id: string;
  path: string;
  mime: (typeof AULA_IMAGE_MIME_TYPES)[number];
  size: number;
  sha256: string;
};

/** Manifiesto de una copia portable. */
export type AulaCopyManifest = {
  app: "aula-documentos";
  format: typeof AULA_COPY_FORMAT;
  formatVersion: typeof AULA_COPY_FORMAT_VERSION;
  schemaVersion: number;
  title: string;
  createdAt: string;
  documentFile: typeof AULA_COPY_DOCUMENT_FILE;
  assets: AulaCopyManifestAsset[];
};

/** Resultado de construir una copia. */
export type AulaCopyBuildResult =
  | { ok: true; bytes: Uint8Array; manifest: AulaCopyManifest }
  | { ok: false; code: AulaCopyErrorCode; message: string };

/** Resultado de leer y validar una copia. */
export type AulaCopyReadResult =
  | { ok: true; document: AulaDocument; manifest: AulaCopyManifest; assets: AulaCopyAsset[] }
  | { ok: false; code: AulaCopyErrorCode; message: string };

/** Resultado de inspeccionar una copia sin descomprimir sus imágenes. */
export type AulaCopyInspectResult =
  | { ok: true; document: AulaDocument; manifest: AulaCopyManifest }
  | { ok: false; code: AulaCopyErrorCode; message: string };

/** Opciones de construcción de una copia. */
export type AulaCopyBuildOptions = {
  /** Fecha fija para pruebas o exportaciones reproducibles. */
  createdAt?: string | Date;
};

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const HASH_PATTERN = /^[0-9a-f]{64}$/;
const ASSET_PATH_PATTERN = /^assets\/([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})\.(png|jpg|webp|gif)$/i;
const MIME_EXTENSIONS: Record<string, string> = {
  "image/png": "png",
  "image/jpeg": "jpg",
  "image/webp": "webp",
  "image/gif": "gif",
};

/**
 * Comprueba si un valor es uno de los MIME admitidos.
 * @param value - Valor candidato.
 * @returns El MIME normalizado o `null`.
 */
function imageMime(value: unknown): (typeof AULA_IMAGE_MIME_TYPES)[number] | null {
  return typeof value === "string" && (AULA_IMAGE_MIME_TYPES as readonly string[]).includes(value)
    ? value as (typeof AULA_IMAGE_MIME_TYPES)[number]
    : null;
}

/**
 * Construye la ruta segura de un asset dentro de la copia.
 * @param id - UUID de la subida.
 * @param mime - MIME de la imagen.
 * @returns La ruta `assets/<id>.<ext>`.
 */
export function aulaCopyAssetPath(id: string, mime: (typeof AULA_IMAGE_MIME_TYPES)[number]): string {
  return `assets/${id}.${MIME_EXTENSIONS[mime]}`;
}

/**
 * Detecta el MIME real de una imagen por su cabecera.
 * @param bytes - Contenido del archivo.
 * @returns El MIME detectado o `null`.
 */
export function detectAulaImageMime(bytes: Uint8Array): (typeof AULA_IMAGE_MIME_TYPES)[number] | null {
  if (bytes.length >= 8
    && bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4e && bytes[3] === 0x47) {
    return "image/png";
  }
  if (bytes.length >= 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) {
    return "image/jpeg";
  }
  if (bytes.length >= 6) {
    const gif = new TextDecoder().decode(bytes.subarray(0, 6));
    if (gif === "GIF87a" || gif === "GIF89a") return "image/gif";
  }
  if (bytes.length >= 12) {
    const webp = new TextDecoder().decode(bytes.subarray(0, 12));
    if (webp.startsWith("RIFF") && webp.slice(8, 12) === "WEBP") return "image/webp";
  }
  return null;
}

/**
 * Calcula el SHA-256 de unos bytes.
 * @param bytes - Contenido del asset.
 * @returns El hash hexadecimal en minúsculas.
 */
async function sha256Hex(bytes: Uint8Array): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-256", bytes as unknown as BufferSource);
  return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, "0")).join("");
}

/**
 * Serializa y comprueba un objeto JSON de tamaño limitado.
 * @param value - Valor a serializar.
 * @param maxBytes - Límite en UTF-8.
 * @returns El texto o `null`.
 */
function serializedJson(value: unknown, maxBytes: number): string | null {
  try {
    const json = JSON.stringify(value);
    return new TextEncoder().encode(json).length <= maxBytes ? json : null;
  } catch {
    return null;
  }
}

/**
 * Valida la forma del manifiesto sin leer todavía el documento.
 * @param value - Manifiesto candidato.
 * @returns El manifiesto normalizado o un error.
 */
function parseManifest(value: unknown):
  | { ok: true; manifest: AulaCopyManifest }
  | { ok: false; code: AulaCopyErrorCode; message: string } {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    return { ok: false, code: "invalid-manifest", message: "La copia no tiene un manifiesto válido." };
  }
  const record = value as Record<string, unknown>;
  if (record.app !== "aula-documentos" || record.format !== AULA_COPY_FORMAT) {
    return { ok: false, code: "invalid-manifest", message: "La copia no es de Aula Documentos." };
  }
  const formatVersion = Number(record.formatVersion);
  if (formatVersion > AULA_COPY_FORMAT_VERSION) {
    return { ok: false, code: "unsupported-version", message: "La copia usa un formato más nuevo de lo que entiende esta app." };
  }
  if (formatVersion !== AULA_COPY_FORMAT_VERSION
    || record.documentFile !== AULA_COPY_DOCUMENT_FILE
    || typeof record.title !== "string"
    || record.title.length > AULA_DOCUMENT_TITLE_MAX_LENGTH
    || typeof record.createdAt !== "string"
    || Number.isNaN(Date.parse(record.createdAt))
    || !Number.isInteger(record.schemaVersion)
    || !Array.isArray(record.assets)
    || record.assets.length > AULA_COPY_MAX_ASSETS) {
    return { ok: false, code: "invalid-manifest", message: "La copia tiene un manifiesto incompleto o no válido." };
  }

  const assets: AulaCopyManifestAsset[] = [];
  const ids = new Set<string>();
  const paths = new Set<string>();
  let total = 0;
  for (const entry of record.assets) {
    if (typeof entry !== "object" || entry === null || Array.isArray(entry)) {
      return { ok: false, code: "invalid-manifest", message: "La copia tiene un asset mal definido." };
    }
    const asset = entry as Record<string, unknown>;
    const id = typeof asset.id === "string" ? asset.id.toLowerCase() : "";
    const mime = imageMime(asset.mime);
    const size = Number(asset.size);
    const sha256 = typeof asset.sha256 === "string" ? asset.sha256.toLowerCase() : "";
    if (!UUID_PATTERN.test(id) || !mime || !Number.isInteger(size) || size <= 0 || size > AULA_IMAGE_MAX_BYTES
      || !HASH_PATTERN.test(sha256) || typeof asset.path !== "string"
      || asset.path !== aulaCopyAssetPath(id, mime)) {
      return { ok: false, code: "invalid-asset", message: "La copia tiene una imagen no válida." };
    }
    if (ids.has(id) || paths.has(asset.path)) {
      return { ok: false, code: "duplicate-entry", message: "La copia repite la misma imagen." };
    }
    ids.add(id);
    paths.add(asset.path);
    total += size;
    if (total > AULA_COPY_MAX_ASSETS_BYTES) {
      return { ok: false, code: "too-large", message: "Las imágenes de la copia superan el tamaño permitido." };
    }
    assets.push({ id, mime, size, sha256, path: asset.path });
  }

  return {
    ok: true,
    manifest: {
      app: "aula-documentos",
      format: AULA_COPY_FORMAT,
      formatVersion: AULA_COPY_FORMAT_VERSION,
      schemaVersion: Number(record.schemaVersion),
      title: record.title,
      createdAt: record.createdAt,
      documentFile: AULA_COPY_DOCUMENT_FILE,
      assets,
    },
  };
}

/**
 * Construye una copia portable de un documento y sus imágenes.
 * @param document - Documento Aula que se quiere archivar.
 * @param assets - Imágenes referenciadas por el documento.
 * @param options - Fecha fija y otras opciones de construcción.
 * @returns El ZIP portable o un error legible.
 */
export async function buildAulaDocumentCopy(
  document: AulaDocument,
  assets: AulaCopyAsset[],
  options: AulaCopyBuildOptions = {},
): Promise<AulaCopyBuildResult> {
  const parsed = parseAulaDocument(document);
  if (!parsed.ok) {
    return { ok: false, code: "invalid-document", message: parsed.message };
  }

  const imageIds = new Set([...collectAulaImageUploadIds(parsed.document.content)].map((id) => id.toLowerCase()));
  if (imageIds.size > AULA_COPY_MAX_ASSETS) {
    return { ok: false, code: "too-many-entries", message: "El documento tiene demasiadas imágenes para una copia." };
  }

  const byId = new Map<string, AulaCopyAsset>();
  let total = 0;
  for (const asset of assets) {
    const id = asset.id.toLowerCase();
    const mime = imageMime(asset.mime);
    if (!UUID_PATTERN.test(id) || !mime || asset.bytes.length <= 0 || asset.bytes.length > AULA_IMAGE_MAX_BYTES) {
      return { ok: false, code: "invalid-asset", message: "Una imagen de la copia no es válida." };
    }
    if (byId.has(id)) {
      return { ok: false, code: "duplicate-entry", message: "La copia repite la misma imagen." };
    }
    if (!imageIds.has(id)) {
      return { ok: false, code: "unused-asset", message: "La copia incluye una imagen que el documento no usa." };
    }
    total += asset.bytes.length;
    if (total > AULA_COPY_MAX_ASSETS_BYTES) {
      return { ok: false, code: "too-large", message: "Las imágenes de la copia superan el tamaño permitido." };
    }
    byId.set(id, { id, mime, bytes: asset.bytes });
  }
  for (const id of imageIds) {
    if (!byId.has(id)) {
      return { ok: false, code: "missing-asset", message: "Falta una imagen del documento en la copia." };
    }
  }

  const createdAt = options.createdAt instanceof Date
    ? options.createdAt.toISOString()
    : options.createdAt ?? new Date().toISOString();
  if (Number.isNaN(Date.parse(createdAt))) {
    return { ok: false, code: "invalid-manifest", message: "La fecha de la copia no es válida." };
  }

  const manifestAssets: AulaCopyManifestAsset[] = [];
  const entries: Record<string, Uint8Array> = {};
  const documentJson = serializedJson(parsed.document, AULA_COPY_MAX_DOCUMENT_BYTES);
  if (!documentJson) {
    return { ok: false, code: "too-large", message: "El documento es demasiado grande para una copia." };
  }
  entries[AULA_COPY_DOCUMENT_FILE] = new TextEncoder().encode(documentJson);

  for (const asset of byId.values()) {
    const path = aulaCopyAssetPath(asset.id, asset.mime);
    entries[path] = asset.bytes;
    manifestAssets.push({
      id: asset.id,
      path,
      mime: asset.mime,
      size: asset.bytes.length,
      sha256: await sha256Hex(asset.bytes),
    });
  }
  manifestAssets.sort((left, right) => left.id.localeCompare(right.id));

  const manifest: AulaCopyManifest = {
    app: "aula-documentos",
    format: AULA_COPY_FORMAT,
    formatVersion: AULA_COPY_FORMAT_VERSION,
    schemaVersion: parsed.document.schemaVersion,
    title: parsed.document.title,
    createdAt,
    documentFile: AULA_COPY_DOCUMENT_FILE,
    assets: manifestAssets,
  };
  const manifestJson = serializedJson(manifest, AULA_COPY_MAX_MANIFEST_BYTES);
  if (!manifestJson) {
    return { ok: false, code: "too-large", message: "El manifiesto de la copia es demasiado grande." };
  }
  entries[AULA_COPY_MANIFEST_FILE] = new TextEncoder().encode(manifestJson);

  const bytes = zipSync(entries, { level: 6 });
  if (bytes.length > AULA_COPY_MAX_ZIP_BYTES) {
    return { ok: false, code: "too-large", message: "La copia supera el tamaño máximo permitido." };
  }
  return { ok: true, bytes, manifest };
}

/**
 * Lee y valida una copia portable antes de importarla.
 * @param bytes - ZIP recibido de R2 o del equipo local.
 * @returns El documento, el manifiesto y las imágenes validadas.
 */
export async function readAulaDocumentCopy(bytes: Uint8Array): Promise<AulaCopyReadResult> {
  if (!bytes.length || bytes.length > AULA_COPY_MAX_ZIP_BYTES) {
    return { ok: false, code: "too-large", message: "La copia está vacía o supera el tamaño máximo." };
  }

  let entryCount = 0;
  let totalUncompressed = 0;
  let unsafe = false;
  let tooLarge = false;
  let duplicate = false;
  const seen = new Set<string>();
  const filter = (file: UnzipFileInfo): boolean => {
    entryCount += 1;
    if (entryCount > AULA_COPY_MAX_ENTRIES) return false;
    if (seen.has(file.name)) {
      duplicate = true;
      return false;
    }
    seen.add(file.name);
    if (file.name === AULA_COPY_MANIFEST_FILE) {
      if (file.originalSize > AULA_COPY_MAX_MANIFEST_BYTES) {
        tooLarge = true;
        return false;
      }
      totalUncompressed += file.originalSize;
      return true;
    }
    if (file.name === AULA_COPY_DOCUMENT_FILE) {
      if (file.originalSize > AULA_COPY_MAX_DOCUMENT_BYTES) {
        tooLarge = true;
        return false;
      }
      totalUncompressed += file.originalSize;
      return true;
    }
    if (!ASSET_PATH_PATTERN.test(file.name)) {
      unsafe = true;
      return false;
    }
    if (file.originalSize <= 0 || file.originalSize > AULA_IMAGE_MAX_BYTES) {
      tooLarge = true;
      return false;
    }
    totalUncompressed += file.originalSize;
    if (totalUncompressed > AULA_COPY_MAX_UNCOMPRESSED_BYTES) {
      tooLarge = true;
      return false;
    }
    return true;
  };

  let files: Record<string, Uint8Array>;
  try {
    files = unzipSync(bytes, { filter });
  } catch {
    return { ok: false, code: "invalid-zip", message: "La copia no es un archivo ZIP válido." };
  }
  if (duplicate) return { ok: false, code: "duplicate-entry", message: "La copia contiene entradas repetidas." };
  if (unsafe) return { ok: false, code: "unsafe-path", message: "La copia contiene archivos no permitidos." };
  if (tooLarge || totalUncompressed > AULA_COPY_MAX_UNCOMPRESSED_BYTES) {
    return { ok: false, code: "too-large", message: "La copia supera el tamaño descomprimido permitido." };
  }
  if (entryCount > AULA_COPY_MAX_ENTRIES) {
    return { ok: false, code: "too-many-entries", message: "La copia contiene demasiados archivos." };
  }

  const manifestBytes = files[AULA_COPY_MANIFEST_FILE];
  const documentBytes = files[AULA_COPY_DOCUMENT_FILE];
  if (!manifestBytes || !documentBytes) {
    return { ok: false, code: "invalid-manifest", message: "La copia no contiene el manifiesto y el documento." };
  }

  let manifestValue: unknown;
  let documentValue: unknown;
  try {
    manifestValue = JSON.parse(new TextDecoder().decode(manifestBytes));
    documentValue = JSON.parse(new TextDecoder().decode(documentBytes));
  } catch {
    return { ok: false, code: "invalid-manifest", message: "La copia contiene JSON ilegible." };
  }

  const manifestResult = parseManifest(manifestValue);
  if (!manifestResult.ok) return manifestResult;
  const manifest = manifestResult.manifest;
  if (manifest.schemaVersion > AULA_DOCUMENT_SCHEMA_VERSION) {
    return { ok: false, code: "unsupported-version", message: "La copia usa un documento más nuevo de lo que entiende esta app." };
  }
  const parsed = parseAulaDocument(documentValue);
  if (!parsed.ok) {
    return { ok: false, code: "invalid-document", message: `El documento de la copia no es válido: ${parsed.message}` };
  }
  if (manifest.title !== parsed.document.title || manifest.schemaVersion !== parsed.document.schemaVersion) {
    return { ok: false, code: "invalid-manifest", message: "El manifiesto no coincide con el documento." };
  }

  const imageIds = new Set([...collectAulaImageUploadIds(parsed.document.content)].map((id) => id.toLowerCase()));
  const manifestIds = new Set(manifest.assets.map((asset) => asset.id.toLowerCase()));
  const manifestPaths = new Set(manifest.assets.map((asset) => asset.path));
  for (const id of imageIds) {
    if (!manifestIds.has(id.toLowerCase())) {
      return { ok: false, code: "missing-asset", message: "Falta una imagen del documento en la copia." };
    }
  }
  for (const asset of manifest.assets) {
    if (!imageIds.has(asset.id.toLowerCase())) {
      return { ok: false, code: "unused-asset", message: "La copia incluye una imagen que el documento no usa." };
    }
    if (!files[asset.path]) {
      return { ok: false, code: "missing-asset", message: "Falta el archivo de una imagen de la copia." };
    }
  }
  for (const path of Object.keys(files)) {
    if (path.startsWith("assets/") && !manifestPaths.has(path)) {
      return { ok: false, code: "unused-asset", message: "La copia incluye una imagen no declarada." };
    }
  }

  const assets: AulaCopyAsset[] = [];
  for (const asset of manifest.assets) {
    const file = files[asset.path];
    if (!file || file.length !== asset.size) {
      return { ok: false, code: "invalid-asset", message: "El tamaño de una imagen no coincide con el manifiesto." };
    }
    const detected = detectAulaImageMime(file);
    if (detected !== asset.mime) {
      return { ok: false, code: "invalid-asset", message: "El tipo real de una imagen no coincide con el manifiesto." };
    }
    if (await sha256Hex(file) !== asset.sha256) {
      return { ok: false, code: "hash-mismatch", message: "La integridad de una imagen de la copia no es válida." };
    }
    assets.push({ id: asset.id, mime: asset.mime, bytes: file });
  }

  return { ok: true, document: parsed.document, manifest, assets };
}

/**
 * Inspecciona una copia y valida manifiesto, documento y presencia de assets
 * sin descomprimir las imágenes en el servidor.
 * @param bytes - ZIP recibido de R2 o del equipo local.
 * @returns El documento y el manifiesto validados.
 */
export async function inspectAulaDocumentCopy(bytes: Uint8Array): Promise<AulaCopyInspectResult> {
  if (!bytes.length || bytes.length > AULA_COPY_MAX_ZIP_BYTES) {
    return { ok: false, code: "too-large", message: "La copia está vacía o supera el tamaño máximo." };
  }

  let entryCount = 0;
  let totalUncompressed = 0;
  let unsafe = false;
  let tooLarge = false;
  let duplicate = false;
  const seen = new Set<string>();
  const assetPaths = new Set<string>();
  const filter = (file: UnzipFileInfo): boolean => {
    entryCount += 1;
    if (entryCount > AULA_COPY_MAX_ENTRIES) return false;
    if (seen.has(file.name)) {
      duplicate = true;
      return false;
    }
    seen.add(file.name);
    if (file.name === AULA_COPY_MANIFEST_FILE) {
      if (file.originalSize > AULA_COPY_MAX_MANIFEST_BYTES) {
        tooLarge = true;
        return false;
      }
      totalUncompressed += file.originalSize;
      return true;
    }
    if (file.name === AULA_COPY_DOCUMENT_FILE) {
      if (file.originalSize > AULA_COPY_MAX_DOCUMENT_BYTES) {
        tooLarge = true;
        return false;
      }
      totalUncompressed += file.originalSize;
      return true;
    }
    if (!ASSET_PATH_PATTERN.test(file.name)) {
      unsafe = true;
      return false;
    }
    assetPaths.add(file.name);
    if (file.originalSize <= 0 || file.originalSize > AULA_IMAGE_MAX_BYTES) {
      tooLarge = true;
      return false;
    }
    totalUncompressed += file.originalSize;
    if (totalUncompressed > AULA_COPY_MAX_UNCOMPRESSED_BYTES) {
      tooLarge = true;
      return false;
    }
    return false;
  };

  let files: Record<string, Uint8Array>;
  try {
    files = unzipSync(bytes, { filter });
  } catch {
    return { ok: false, code: "invalid-zip", message: "La copia no es un archivo ZIP válido." };
  }
  if (duplicate) return { ok: false, code: "duplicate-entry", message: "La copia contiene entradas repetidas." };
  if (unsafe) return { ok: false, code: "unsafe-path", message: "La copia contiene archivos no permitidos." };
  if (tooLarge || totalUncompressed > AULA_COPY_MAX_UNCOMPRESSED_BYTES) {
    return { ok: false, code: "too-large", message: "La copia supera el tamaño descomprimido permitido." };
  }
  if (entryCount > AULA_COPY_MAX_ENTRIES) {
    return { ok: false, code: "too-many-entries", message: "La copia contiene demasiados archivos." };
  }

  const manifestBytes = files[AULA_COPY_MANIFEST_FILE];
  const documentBytes = files[AULA_COPY_DOCUMENT_FILE];
  if (!manifestBytes || !documentBytes) {
    return { ok: false, code: "invalid-manifest", message: "La copia no contiene el manifiesto y el documento." };
  }

  let manifestValue: unknown;
  let documentValue: unknown;
  try {
    manifestValue = JSON.parse(new TextDecoder().decode(manifestBytes));
    documentValue = JSON.parse(new TextDecoder().decode(documentBytes));
  } catch {
    return { ok: false, code: "invalid-manifest", message: "La copia contiene JSON ilegible." };
  }

  const manifestResult = parseManifest(manifestValue);
  if (!manifestResult.ok) return manifestResult;
  const manifest = manifestResult.manifest;
  if (manifest.schemaVersion > AULA_DOCUMENT_SCHEMA_VERSION) {
    return { ok: false, code: "unsupported-version", message: "La copia usa un documento más nuevo de lo que entiende esta app." };
  }
  const parsed = parseAulaDocument(documentValue);
  if (!parsed.ok) {
    return { ok: false, code: "invalid-document", message: `El documento de la copia no es válido: ${parsed.message}` };
  }
  if (manifest.title !== parsed.document.title || manifest.schemaVersion !== parsed.document.schemaVersion) {
    return { ok: false, code: "invalid-manifest", message: "El manifiesto no coincide con el documento." };
  }

  const imageIds = new Set([...collectAulaImageUploadIds(parsed.document.content)].map((id) => id.toLowerCase()));
  const manifestIds = new Set(manifest.assets.map((asset) => asset.id.toLowerCase()));
  const manifestPaths = new Set(manifest.assets.map((asset) => asset.path));
  for (const id of imageIds) {
    if (!manifestIds.has(id)) {
      return { ok: false, code: "missing-asset", message: "Falta una imagen del documento en la copia." };
    }
  }
  for (const asset of manifest.assets) {
    if (!imageIds.has(asset.id)) {
      return { ok: false, code: "unused-asset", message: "La copia incluye una imagen que el documento no usa." };
    }
    if (!assetPaths.has(asset.path)) {
      return { ok: false, code: "missing-asset", message: "Falta el archivo de una imagen de la copia." };
    }
  }
  for (const path of assetPaths) {
    if (!manifestPaths.has(path)) {
      return { ok: false, code: "unused-asset", message: "La copia incluye una imagen no declarada." };
    }
  }

  return { ok: true, document: parsed.document, manifest };
}

