import { env } from "cloudflare:workers";
import { eq } from "drizzle-orm";
import { getDb } from "../../db";
import { uploads } from "../../db/schema";

export const uploadPurposes = ["task-image", "board-asset", "document"] as const;
export type UploadPurpose = (typeof uploadPurposes)[number];

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
export async function storeUpload(input: { projectId: string; purpose: UploadPurpose; file: File; ownerUserId: string }) {
  const bucket = env.BUCKET;
  const database = env.DB;
  if (!bucket || !database) throw new StorageUnavailableError();
  const id = crypto.randomUUID();
  const extension = EXTENSIONS[input.file.type] ?? ".bin";
  const storageKey = `${input.projectId}/${input.purpose}/${id}${extension}`;
  await bucket.put(storageKey, input.file, {
    httpMetadata: { contentType: input.file.type, cacheControl: "private, max-age=3600" },
  });
  const url = `/api/files/${id}`;
  try {
    const result = await database.prepare(`INSERT INTO uploads (id, project_id, storage_key, url, mime_type, size_bytes, purpose, owner_user_id, created_at)
      SELECT ?, ?, ?, ?, ?, ?, ?, ?, ? WHERE EXISTS (SELECT 1 FROM projects WHERE id = ?) RETURNING id`)
      .bind(id, input.projectId, storageKey, url, input.file.type, input.file.size, input.purpose, input.ownerUserId, Date.now(), input.projectId).first();
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
