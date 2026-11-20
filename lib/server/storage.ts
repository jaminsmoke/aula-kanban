import {
  DocumentCopyLimitExceededError,
  DocumentCopyQuotaExceededError,
  MAX_PROJECT_DOCUMENT_COPIES,
  UploadQuotaExceededError,
  fitsDocumentCopyQuota,
  fitsDocumentImageQuota,
  uploadExtension,
  type UploadOrigin,
  type UploadPurpose,
} from "./storage/quota";
import {
  StorageUnavailableError,
  bucketReachable,
  databaseAvailable,
  deleteBucketObject,
  deleteProjectDocumentCopyRows,
  deleteUploadRow,
  findUpload,
  getBucketObject,
  insertUploadRow,
  orphanUploadProjects,
  projectDocumentCopyUsage,
  projectDocumentImageUsage,
  projectUploadRows,
  putBucketObject,
  storageAvailable,
  uploadsCount,
  type UploadRow,
} from "./storage/repository";

/**
 * Servicio de almacenamiento: aplica la cuota y compone el repositorio R2/D1.
 *
 * Las reglas puras viven en `storage/quota.ts` y el acceso a datos en
 * `storage/repository.ts`; aquí solo queda el orden de las operaciones y la
 * compensación cuando una escritura falla a medias.
 */

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
  const database = databaseAvailable();
  const bucket = storageAvailable();
  const uploads = await uploadsCount();
  const reachable = await bucketReachable();
  return { database, bucket, bucketReachable: reachable, uploads, ok: database && bucket && reachable && uploads !== null };
}

/**
 * Guarda un fichero en R2 y registra su metadato en D1.
 * @param input - Proyecto, finalidad, contenido y propietario de la subida.
 * @returns El identificador y la URL interna del fichero (`/api/files/…`).
 */
export async function storeUpload(input: { projectId: string; purpose: UploadPurpose; origin: UploadOrigin; file: File; ownerUserId: string }) {
  if (!storageAvailable() || !databaseAvailable()) throw new StorageUnavailableError();
  if (input.purpose === "document-image") {
    const used = await projectDocumentImageUsage(input.projectId);
    if (!fitsDocumentImageQuota(used, input.file.size)) throw new UploadQuotaExceededError();
  }
  if (input.purpose === "document-copy") {
    const usage = await projectDocumentCopyUsage(input.projectId);
    if (usage.count >= MAX_PROJECT_DOCUMENT_COPIES) throw new DocumentCopyLimitExceededError();
    if (!fitsDocumentCopyQuota(usage.bytes, input.file.size)) throw new DocumentCopyQuotaExceededError();
  }
  const id = crypto.randomUUID();
  const storageKey = `${input.projectId}/${input.purpose}/${id}${uploadExtension(input.file.type)}`;
  await putBucketObject(storageKey, input.file);
  const url = `/api/files/${id}`;
  try {
    const created = await insertUploadRow({
      id,
      projectId: input.projectId,
      storageKey,
      url,
      mimeType: input.file.type,
      sizeBytes: input.file.size,
      purpose: input.purpose,
      origin: input.origin,
      ownerUserId: input.ownerUserId,
    });
    if (!created) throw new Error("project_unavailable");
  } catch (error) {
    await deleteBucketObject(storageKey);
    throw error;
  }
  return { id, url };
}

/**
 * Elimina objetos y metadatos de un proyecto ya borrado; admite reintentos.
 * @param projectId - Identificador del proyecto eliminado.
 */
export async function deleteProjectUploads(projectId: string) {
  await deleteProjectDocumentCopyRows(projectId);
  const rows = await projectUploadRows(projectId);
  if (!rows.length) return;
  if (!storageAvailable()) throw new StorageUnavailableError();
  // Se conservan los metadatos hasta completar la limpieza, para poder reintentar.
  for (const row of rows) {
    await deleteBucketObject(row.storageKey);
    await deleteUploadRow(row.id);
  }
}

/**
 * Borra un objeto y su fila de subida.
 * @param id - Identificador de la subida.
 * @returns `true` si existía y se eliminó.
 */
export async function deleteUpload(id: string): Promise<boolean> {
  const row = await findUpload(id);
  if (!row) return false;
  if (!storageAvailable()) throw new StorageUnavailableError();
  await deleteBucketObject(row.storageKey);
  await deleteUploadRow(id);
  return true;
}

/** Reintenta limpiar archivos de proyectos eliminados en una operación anterior. */
export async function cleanupOrphanUploads() {
  if (!databaseAvailable()) throw new StorageUnavailableError();
  for (const projectId of await orphanUploadProjects(10)) await deleteProjectUploads(projectId);
}

/** Resultado tipado de intentar servir un archivo subido. */
export type UploadReadResult =
  | { status: "ok"; row: UploadRow; object: R2ObjectBody }
  | { status: "not_found" | "storage_unavailable" | "object_missing" };

/**
 * Lee el metadato y el contenido de un fichero subido.
 * @param id - Identificador del fichero.
 * @returns El objeto, o el motivo concreto por el que no se puede servir.
 */
export async function readUpload(id: string): Promise<UploadReadResult> {
  const row = await findUpload(id);
  if (!row) return { status: "not_found" };
  if (!storageAvailable()) return { status: "storage_unavailable" };
  const object = await getBucketObject(row.storageKey);
  if (!object) return { status: "object_missing" };
  return { status: "ok", row, object };
}
