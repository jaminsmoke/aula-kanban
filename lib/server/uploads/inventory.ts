import { getD1 } from "../../../db";
import {
  clasificarInventario,
  type InventoryCounts,
  type InventoryEntry,
  type UploadRowRef,
} from "../../domain/uploads/inventory";
import { listBucketPage } from "../storage";

/**
 * Cotejo del inventario de R2 con `uploads` (PER-01B, fase 2).
 *
 * Cada página de R2 cubre un rango lexicográfico de claves. Se piden las
 * filas de `uploads` dentro de ese rango y, en la última página, las que
 * quedan por encima, de modo que recorrer el bucket desde la primera página
 * revisa todas las filas. Solo lee: no borra ni modifica objetos ni metadatos.
 */

/** Informe de una página del inventario. */
export type InventoryPageReport = {
  entries: InventoryEntry[];
  counts: InventoryCounts;
  truncated: boolean;
  cursor: string | null;
  range: { from: string; to: string } | null;
};

/**
 * Lee filas de `uploads` con una condición concreta.
 * @param where - Cláusula SQL sin parámetros.
 * @param params - Valores que se enlazan en orden.
 * @returns Las filas con id, proyecto y clave.
 */
async function queryRows(where: string, params: Array<string | number> = []): Promise<UploadRowRef[]> {
  const result = await getD1()
    .prepare(`SELECT id, project_id AS projectId, storage_key AS storageKey FROM uploads ${where}`)
    .bind(...params)
    .all<UploadRowRef>();
  return result.results;
}

/**
 * Revisa una página del bucket y la coteja con sus filas de `uploads`.
 *
 * Si se empieza por una página intermedia, las filas anteriores a esa página
 * no se revisan; el inventario completo se obtiene recorriendo desde el
 * principio hasta que `truncated` sea `false`.
 * @param input - Cursor opaco y tope de la página.
 * @returns Las entradas, los recuentos y el cursor siguiente.
 */
export async function auditInventoryPage(input: { cursor?: string; limit?: number } = {}): Promise<InventoryPageReport> {
  const page = await listBucketPage(input);
  const objects = page.objects;
  const rows: UploadRowRef[] = [];
  let range: { from: string; to: string } | null = null;

  if (objects.length) {
    const from = objects[0].key;
    const to = objects[objects.length - 1].key;
    range = { from, to };
    rows.push(...await queryRows("WHERE storage_key >= ? AND storage_key <= ?", [from, to]));
  }

  if (!page.truncated) {
    const remaining = objects.length
      ? await queryRows("WHERE storage_key > ?", [objects[objects.length - 1].key])
      : await queryRows("");
    rows.push(...remaining);
  }

  const unique = [...new Map(rows.map((row) => [row.storageKey, row])).values()];
  const report = clasificarInventario(objects, unique);
  return { ...report, truncated: page.truncated, cursor: page.cursor, range };
}
