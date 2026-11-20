import { env } from "cloudflare:workers";
import { and, eq, sql } from "drizzle-orm";
import { getDb } from "../../../db";
import { documentCopies, uploads } from "../../../db/schema";

/**
 * Repositorio de almacenamiento: D1 para `uploads`/`document_copies` y R2 para
 * los objetos. No aplica cuotas ni decide respuestas HTTP; eso vive en
 * `storage/quota.ts` y en el servicio `storage.ts`.
 */

/** Error lanzado cuando R2 o D1 no están habilitados en el despliegue. */
export class StorageUnavailableError extends Error {
  /**
   * Crea el error de almacenamiento no disponible.
   */
  constructor() {
    super("storage_unavailable");
    this.name = "StorageUnavailableError";
  }
}

/** Fila de metadatos de una subida. */
export type UploadRow = typeof uploads.$inferSelect;

/** Datos necesarios para registrar una subida. */
export type NewUploadRow = {
  id: string;
  projectId: string;
  storageKey: string;
  url: string;
  mimeType: string;
  sizeBytes: number;
  purpose: string;
  origin: string;
  ownerUserId: string;
};

/**
 * Indica si el binding R2 está vinculado en este despliegue.
 * @returns `true` cuando existe el binding `BUCKET`.
 */
export function storageAvailable(): boolean {
  return Boolean(env.BUCKET);
}

/**
 * Indica si el binding D1 está vinculado en este despliegue.
 * @returns `true` cuando existe el binding `DB`.
 */
export function databaseAvailable(): boolean {
  return Boolean(env.DB);
}

/**
 * Comprueba una lectura mínima del bucket.
 * @returns `true` si R2 responde a un listado de un objeto.
 */
export async function bucketReachable(): Promise<boolean> {
  if (!env.BUCKET) return false;
  try {
    await env.BUCKET.list({ limit: 1 });
    return true;
  } catch {
    return false;
  }
}

/**
 * Cuenta las filas de `uploads` para el diagnóstico.
 * @returns El total, o `null` si D1 no está disponible o la lectura falla.
 */
export async function uploadsCount(): Promise<number | null> {
  if (!env.DB) return null;
  try {
    const row = await env.DB.prepare("SELECT COUNT(*) AS total FROM uploads").first<{ total: number }>();
    return Number(row?.total ?? 0);
  } catch {
    return null;
  }
}

/**
 * Guarda un objeto en R2.
 * @param key - Clave del objeto.
 * @param file - Contenido y tipo del fichero.
 */
export async function putBucketObject(key: string, file: File): Promise<void> {
  if (!env.BUCKET) throw new StorageUnavailableError();
  await env.BUCKET.put(key, file, {
    // El id es único por subida y el objeto no se reemplaza: el contenido de
    // una clave nunca cambia.
    httpMetadata: { contentType: file.type, cacheControl: "private, max-age=31536000, immutable" },
  });
}

/**
 * Lee un objeto de R2.
 * @param key - Clave del objeto.
 * @returns El objeto, o `null` si no existe.
 */
export async function getBucketObject(key: string): Promise<R2ObjectBody | null> {
  if (!env.BUCKET) throw new StorageUnavailableError();
  return env.BUCKET.get(key);
}

/**
 * Borra un objeto de R2.
 * @param key - Clave del objeto.
 */
export async function deleteBucketObject(key: string): Promise<void> {
  if (!env.BUCKET) throw new StorageUnavailableError();
  await env.BUCKET.delete(key);
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
 * Suma los bytes y el número de copias portables de un proyecto.
 * @param projectId - Proyecto activo.
 * @returns Bytes y copias de la finalidad `document-copy`.
 */
export async function projectDocumentCopyUsage(projectId: string): Promise<{ bytes: number; count: number }> {
  const [row] = await getDb().select({
    total: sql<number>`coalesce(sum(${uploads.sizeBytes}), 0)`,
    count: sql<number>`count(*)`,
  }).from(uploads).where(and(
    eq(uploads.projectId, projectId),
    eq(uploads.purpose, "document-copy"),
  ));
  return { bytes: Number(row?.total ?? 0), count: Number(row?.count ?? 0) };
}

/**
 * Registra una subida solo si su proyecto existe.
 * @param input - Datos de la fila.
 * @returns `true` si se insertó la fila.
 */
export async function insertUploadRow(input: NewUploadRow): Promise<boolean> {
  if (!env.DB) throw new StorageUnavailableError();
  const result = await env.DB.prepare(`INSERT INTO uploads (id, project_id, storage_key, url, mime_type, size_bytes, purpose, origin, owner_user_id, created_at)
    SELECT ?, ?, ?, ?, ?, ?, ?, ?, ?, ? WHERE EXISTS (SELECT 1 FROM projects WHERE id = ?) RETURNING id`)
    .bind(input.id, input.projectId, input.storageKey, input.url, input.mimeType, input.sizeBytes, input.purpose, input.origin, input.ownerUserId, Date.now(), input.projectId)
    .first();
  return Boolean(result);
}

/**
 * Lee solo el metadato de un fichero subido, sin tocar R2.
 * @param id - Identificador del fichero.
 * @returns La fila de metadatos o `null` si no existe.
 */
export async function findUpload(id: string): Promise<UploadRow | null> {
  const [row] = await getDb().select().from(uploads).where(eq(uploads.id, id));
  return row ?? null;
}

/**
 * Lista las filas de subidas de un proyecto.
 * @param projectId - Proyecto activo.
 * @returns Las filas de `uploads`.
 */
export async function projectUploadRows(projectId: string): Promise<UploadRow[]> {
  return getDb().select().from(uploads).where(eq(uploads.projectId, projectId));
}

/**
 * Borra la fila de una subida.
 * @param id - Identificador del fichero.
 */
export async function deleteUploadRow(id: string): Promise<void> {
  await getDb().delete(uploads).where(eq(uploads.id, id));
}

/**
 * Borra los metadatos de copias portables de un proyecto.
 * @param projectId - Proyecto activo.
 */
export async function deleteProjectDocumentCopyRows(projectId: string): Promise<void> {
  await getDb().delete(documentCopies).where(eq(documentCopies.projectId, projectId));
}

/**
 * Busca proyectos con subidas registradas pero ya eliminados.
 * @param limit - Máximo de proyectos a devolver.
 * @returns Los identificadores de proyecto.
 */
export async function orphanUploadProjects(limit = 10): Promise<string[]> {
  if (!env.DB) throw new StorageUnavailableError();
  const result = await env.DB.prepare(`SELECT DISTINCT u.project_id AS projectId FROM uploads u
    LEFT JOIN projects p ON p.id = u.project_id WHERE p.id IS NULL LIMIT ?`).bind(limit).all<{ projectId: string }>();
  return result.results.map((row) => row.projectId);
}
