/**
 * Clasificación del inventario de R2 frente a los metadatos de `uploads`
 * (PER-01B, fase 1).
 *
 * Compara claves exactas: un objeto con fila está en uso, un objeto sin fila
 * con la clave esperada es un huérfano, una clave fuera del formato requiere
 * revisión y una fila sin objeto indica bytes que faltan. No borra ni
 * interpreta contenidos.
 */

/** Longitud máxima de una clave que se muestra en el inventario. */
export const MAX_INVENTORY_KEY_LENGTH = 512;

/** Formato que genera `storeUpload`: `proyecto/finalidad/id.ext`. */
export const UPLOAD_KEY_PATTERN = /^[^/]+\/(?:task-image|board-asset|document)\/[A-Za-z0-9_-]+\.[a-z0-9]+$/;

/** Objeto del bucket con los metadatos mínimos del inventario. */
export type BucketObject = {
  key: string;
  size: number;
  uploaded: number;
  etag: string;
};

/** Fila de `uploads` necesaria para el cotejo. */
export type UploadRowRef = {
  id: string;
  projectId: string;
  storageKey: string;
};

/** Estado de una entrada del inventario. */
export type InventoryStatus = "con_fila" | "objeto_sin_fila" | "fila_sin_objeto" | "clave_revisar";

/** Objeto del bucket clasificado. */
export type InventoryObjectEntry = BucketObject & {
  status: Exclude<InventoryStatus, "fila_sin_objeto">;
  uploadId: string | null;
  projectId: string | null;
};

/** Fila de `uploads` cuyo objeto no está en el conjunto recibido. */
export type InventoryMissingEntry = {
  status: "fila_sin_objeto";
  id: string;
  projectId: string;
  storageKey: string;
};

/** Entrada del inventario. */
export type InventoryEntry = InventoryObjectEntry | InventoryMissingEntry;

/** Recuentos del inventario. */
export type InventoryCounts = {
  objects: number;
  withRow: number;
  orphanObjects: number;
  missingObjects: number;
  reviewKeys: number;
};

/** Resultado del clasificador. */
export type InventoryReport = {
  entries: InventoryEntry[];
  counts: InventoryCounts;
};

/**
 * Indica si una clave sigue el formato de las subidas actuales.
 * @param key - Clave del objeto en R2.
 * @returns `true` si cumple `proyecto/finalidad/id.ext`.
 */
export function esClaveDeSubida(key: string): boolean {
  return key.length <= MAX_INVENTORY_KEY_LENGTH && UPLOAD_KEY_PATTERN.test(key);
}

/**
 * Clasifica los objetos recibidos frente a las filas recibidas.
 *
 * Las filas deben corresponder al mismo conjunto de claves que los objetos;
 * el cotejo de todas las filas de la instancia se resuelve en la fase 2.
 * @param objects - Objetos de la página de R2.
 * @param rows - Filas de `uploads` del conjunto.
 * @returns Las entradas en orden de objeto y después de fila, con sus recuentos.
 */
export function clasificarInventario(
  objects: readonly BucketObject[],
  rows: readonly UploadRowRef[],
): InventoryReport {
  const rowsByKey = new Map<string, UploadRowRef>();
  for (const row of rows) rowsByKey.set(row.storageKey, row);

  const objectKeys = new Set(objects.map((object) => object.key));
  const entries: InventoryEntry[] = [];
  const counts: InventoryCounts = { objects: objects.length, withRow: 0, orphanObjects: 0, missingObjects: 0, reviewKeys: 0 };

  for (const object of objects) {
    const row = rowsByKey.get(object.key);
    if (row) {
      entries.push({ ...object, status: "con_fila", uploadId: row.id, projectId: row.projectId });
      counts.withRow += 1;
      continue;
    }
    if (!esClaveDeSubida(object.key)) {
      entries.push({ ...object, status: "clave_revisar", uploadId: null, projectId: null });
      counts.reviewKeys += 1;
      continue;
    }
    entries.push({ ...object, status: "objeto_sin_fila", uploadId: null, projectId: null });
    counts.orphanObjects += 1;
  }

  for (const row of rows) {
    if (objectKeys.has(row.storageKey)) continue;
    entries.push({ status: "fila_sin_objeto", id: row.id, projectId: row.projectId, storageKey: row.storageKey });
    counts.missingObjects += 1;
  }

  return { entries, counts };
}
