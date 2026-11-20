import { env } from "cloudflare:workers";
import { and, eq, sql } from "drizzle-orm";
import { getDb } from "../../db";
import { uploads } from "../../db/schema";

export const uploadPurposes = ["task-image", "board-asset", "document", "document-image"] as const;
export type UploadPurpose = (typeof uploadPurposes)[number];

/** Vía por la que entró el archivo: la web o el servidor MCP. */
export const uploadOrigins = ["web", "mcp"] as const;
export type UploadOrigin = (typeof uploadOrigins)[number];

const IMAGE_MIME_TYPES = ["image/png", "image/jpeg", "image/webp", "image/gif"];
const DOCUMENT_MIME_TYPES = ["application/pdf", "text/plain", "text/markdown", "text/csv", ...IMAGE_MIME_TYPES];
const EXTENSIONS: Record<string, string> = {
  "image/png": ".png",
  "image/jpeg": ".jpg",
  "image/webp": ".webp",
  "image/gif": ".gif",
  "application/pdf": ".pdf",
  "text/plain": ".txt",
  "text/markdown": ".md",
  "text/csv": ".csv",
};
export const MAX_IMAGE_BYTES = 5 * 1024 * 1024;
export const MAX_DOCUMENT_BYTES = 10 * 1024 * 1024;
/** Cuota de imágenes de documento por proyecto (50 MB). */
export const MAX_PROJECT_DOCUMENT_IMAGE_BYTES = 50 * 1024 * 1024;

/**
 * Error lanzado cuando R2 aún no está habilitado en el despliegue.
 */
export class StorageUnavailableError extends Error {
  /**
   * Crea el error de almacenamiento no disponible.
   */
  constructor() {
    super("storage_unavailable");
    this.name = "StorageUnavailableError";
  }
}

/** La cuota de imágenes de documento del proyecto está llena. */
export class UploadQuotaExceededError extends Error {
  /**
   * Crea el error de cuota de imágenes.
   */
  constructor() {
    super("document_image_quota_exceeded");
    this.name = "UploadQuotaExceededError";
  }
}

/**
 * Suma los bytes de imágenes de documento de un proyecto.
 * @param projectId - Proyecto activo.
 * @returns Bytes ocupados por la finalidad `document-image`.
 */
export async function projectDocumentImageUsage(projectId: string): Promise<number> {
  const [row] = await getDb().select({
    total: sql<number>`coalesce(sum(${uploads.sizeBytes}), 0)`,
  }).from(uploads).where(and(
    eq(uploads.projectId, projectId),
    eq(uploads.purpose, "document-image"),
  ));
  return Number(row?.total ?? 0);
}

/**
 * Comprueba si una imagen cabe en la cuota del proyecto.
 * @param used - Bytes ya usados.
 * @param incoming - Bytes de la imagen nueva.
 * @returns `true` si la subida cabe.
 */
export function fitsDocumentImageQuota(used: number, incoming: number): boolean {
  return used >= 0 && incoming >= 0 && used + incoming <= MAX_PROJECT_DOCUMENT_IMAGE_BYTES;
}

/**
 * Indica si el bucket R2 está vinculado en este despliegue.
 * @returns `true` cuando existe el binding `BUCKET`.
 */
export function storageAvailable() {
  return Boolean(env.BUCKET);
}

/** Estado del almacenamiento para el diagnóstico de propietario/administración. */
export type StorageStatus = {
  database: boolean;
  bucket: boolean;
  bucketReachable: boolean;
  uploads: number | null;
  ok: boolean;
};

/**
 * Comprueba D1, el binding R2 y una lectura mínima del bucket.
 * No devuelve secretos ni lista archivos.
 * @returns El estado del almacenamiento y el número de filas de `uploads`.
 */
export async function storageStatus(): Promise<StorageStatus> {
  const database = Boolean(env.DB);
  const bucket = Boolean(env.BUCKET);
  let uploads: number | null = null;
  let bucketReachable = false;
  if (env.DB) {
    try {
      const row = await env.DB.prepare("SELECT COUNT(*) AS total FROM uploads").first<{ total: number }>();
      uploads = Number(row?.total ?? 0);
    } catch {
      uploads = null;
    }
  }
  if (env.BUCKET) {
    try {
      await env.BUCKET.list({ limit: 1 });
      bucketReachable = true;
    } catch {
      bucketReachable = false;
    }
  }
  return { database, bucket, bucketReachable, uploads, ok: database && bucket && bucketReachable && uploads !== null };
}

/**
 * Valida el tipo y el tamaño de un fichero según su finalidad.
 * @param purpose - Finalidad declarada de la subida.
 * @param mimeType - Tipo MIME del fichero.
 * @param sizeBytes - Tamaño en bytes.
 * @returns Mensaje de error para el usuario o `null` cuando es válido.
 */
export function validateUpload(purpose: UploadPurpose, mimeType: string, sizeBytes: number) {
  const allowed = purpose === "document" ? DOCUMENT_MIME_TYPES : IMAGE_MIME_TYPES;
  if (!allowed.includes(mimeType)) return "Tipo de archivo no admitido para esta subida.";
  const max = purpose === "document" ? MAX_DOCUMENT_BYTES : MAX_IMAGE_BYTES;
  if (!sizeBytes || sizeBytes > max) return purpose === "document" ? "El documento supera los 10 MB permitidos." : "La imagen supera los 5 MB permitidos.";
  return null;
}

/**
 * Guarda un fichero en R2 y registra su metadato en D1.
 * @param input - Proyecto, finalidad, contenido y propietario de la subida.
 * @returns El identificador y la URL interna del fichero (`/api/files/…`).
 */
export async function storeUpload(input: { projectId: string; purpose: UploadPurpose; origin: UploadOrigin; file: File; ownerUserId: string }) {
  const bucket = env.BUCKET;
  const database = env.DB;
  if (!bucket || !database) throw new StorageUnavailableError();
  if (input.purpose === "document-image") {
    const used = await projectDocumentImageUsage(input.projectId);
    if (!fitsDocumentImageQuota(used, input.file.size)) throw new UploadQuotaExceededError();
  }
  const id = crypto.randomUUID();
  const extension = EXTENSIONS[input.file.type] ?? ".bin";
  const storageKey = `${input.projectId}/${input.purpose}/${id}${extension}`;
  await bucket.put(storageKey, input.file, {
    // El id es único por subida y el objeto no se reemplaza: el contenido de
    // una clave nunca cambia.
    httpMetadata: { contentType: input.file.type, cacheControl: "private, max-age=31536000, immutable" },
  });
  const url = `/api/files/${id}`;
  try {
    const result = await database.prepare(`INSERT INTO uploads (id, project_id, storage_key, url, mime_type, size_bytes, purpose, origin, owner_user_id, created_at)
      SELECT ?, ?, ?, ?, ?, ?, ?, ?, ?, ? WHERE EXISTS (SELECT 1 FROM projects WHERE id = ?) RETURNING id`)
      .bind(id, input.projectId, storageKey, url, input.file.type, input.file.size, input.purpose, input.origin, input.ownerUserId, Date.now(), input.projectId).first();
    if (!result) throw new Error("project_unavailable");
  } catch (error) {
    await bucket.delete(storageKey);
    throw error;
  }
  return { id, url };
}

/**
 * Elimina objetos y metadatos de un proyecto ya borrado; admite reintentos.
 * @param projectId - Identificador del proyecto eliminado.
 */
export async function deleteProjectUploads(projectId: string) {
  const rows = await getDb().select().from(uploads).where(eq(uploads.projectId, projectId));
  if (!rows.length) return;
  if (!env.BUCKET) throw new StorageUnavailableError();
  // Se conservan los metadatos hasta completar la limpieza, para poder reintentar.
  for (const row of rows) {
    await env.BUCKET.delete(row.storageKey);
    await getDb().delete(uploads).where(eq(uploads.id, row.id));
  }
}

/** Reintenta limpiar archivos de proyectos eliminados en una operación anterior. */
export async function cleanupOrphanUploads() {
  if (!env.DB) throw new StorageUnavailableError();
  const result = await env.DB.prepare(`SELECT DISTINCT u.project_id AS projectId FROM uploads u
    LEFT JOIN projects p ON p.id = u.project_id WHERE p.id IS NULL LIMIT 10`).all<{ projectId: string }>();
  for (const row of result.results) await deleteProjectUploads(row.projectId);
}

/**
 * Lee solo el metadato de un fichero subido, sin tocar R2.
 * @param id - Identificador del fichero.
 * @returns La fila de metadatos o `null` si no existe.
 */
export async function findUpload(id: string) {
  const [row] = await getDb().select().from(uploads).where(eq(uploads.id, id));
  return row ?? null;
}

/** Resultado tipado de intentar servir un archivo subido. */
export type UploadReadResult =
  | { status: "ok"; row: typeof uploads.$inferSelect; object: R2ObjectBody }
  | { status: "not_found" | "storage_unavailable" | "object_missing" };

/**
 * Lee el metadato y el contenido de un fichero subido.
 * @param id - Identificador del fichero.
 * @returns El objeto, o el motivo concreto por el que no se puede servir.
 */
export async function readUpload(id: string): Promise<UploadReadResult> {
  const [row] = await getDb().select().from(uploads).where(eq(uploads.id, id));
  if (!row) return { status: "not_found" };
  if (!env.BUCKET) return { status: "storage_unavailable" };
  const object = await env.BUCKET.get(row.storageKey);
  if (!object) return { status: "object_missing" };
  return { status: "ok", row, object };
}

/** Tope de objetos que devuelve una página del inventario. */
export const MAX_BUCKET_PAGE = 100;

/** Página del inventario de R2. */
export type BucketPage = {
  objects: Array<{ key: string; size: number; uploaded: number; etag: string }>;
  truncated: boolean;
  cursor: string | null;
};

/**
 * Lista una página de objetos del bucket, sin descargar su contenido.
 * @param input - Cursor opaco y tope de la página.
 * @returns Los metadatos mínimos y el cursor para la página siguiente.
 */
export async function listBucketPage(input: { cursor?: string; limit?: number } = {}): Promise<BucketPage> {
  if (!env.BUCKET) throw new StorageUnavailableError();
  const limite = Math.min(Math.max(Math.trunc(input.limit ?? MAX_BUCKET_PAGE) || MAX_BUCKET_PAGE, 1), MAX_BUCKET_PAGE);
  const page = await env.BUCKET.list({
    limit: limite,
    ...(input.cursor ? { cursor: input.cursor } : {}),
  });
  return {
    objects: page.objects.map((object) => ({
      key: object.key,
      size: object.size,
      uploaded: object.uploaded.getTime(),
      etag: object.etag,
    })),
    truncated: page.truncated,
    cursor: page.truncated ? page.cursor ?? null : null,
  };
}
