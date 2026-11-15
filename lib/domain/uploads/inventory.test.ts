import { describe, expect, it } from "vitest";
import {
  MAX_INVENTORY_KEY_LENGTH,
  clasificarInventario,
  esClaveDeSubida,
  type BucketObject,
  type UploadRowRef,
} from "./inventory";

const proyecto = "11111111-1111-4111-8111-111111111111";

/**
 * Construye un objeto del bucket.
 * @param key - Clave del objeto.
 * @param size - Tamaño en bytes.
 * @returns El objeto listo para clasificar.
 */
function objeto(key: string, size = 10): BucketObject {
  return { key, size, uploaded: 1_700_000_000_000, etag: "etag" };
}

/**
 * Construye una fila de `uploads`.
 * @param id - Identificador.
 * @param key - Clave exacta.
 * @returns La fila para el cotejo.
 */
function fila(id: string, key: string): UploadRowRef {
  return { id, projectId: proyecto, storageKey: key };
}

describe("inventario de R2", () => {
  it("marca los objetos con fila y conserva sus metadatos", () => {
    const key = `${proyecto}/task-image/aaaa.png`;
    const report = clasificarInventario([objeto(key, 42)], [fila("aaaa", key)]);
    expect(report.counts).toEqual({ objects: 1, withRow: 1, orphanObjects: 0, missingObjects: 0, reviewKeys: 0 });
    expect(report.entries).toEqual([{
      key,
      size: 42,
      uploaded: 1_700_000_000_000,
      etag: "etag",
      status: "con_fila",
      uploadId: "aaaa",
      projectId: proyecto,
    }]);
  });

  it("distingue un objeto huérfano de una clave que requiere revisión", () => {
    const report = clasificarInventario([
      objeto(`${proyecto}/document/aaaa.pdf`),
      objeto("default/original"),
      objeto(`${proyecto}/otra/aaaa.png`),
    ], []);
    expect(report.entries.map((entry) => entry.status)).toEqual(["objeto_sin_fila", "clave_revisar", "clave_revisar"]);
    expect(report.counts).toEqual({ objects: 3, withRow: 0, orphanObjects: 1, missingObjects: 0, reviewKeys: 2 });
  });

  it("señala las filas cuyo objeto no está en el conjunto", () => {
    const presente = `${proyecto}/board-asset/aaaa.png`;
    const ausente = `${proyecto}/board-asset/bbbb.png`;
    const report = clasificarInventario([objeto(presente)], [fila("aaaa", presente), fila("bbbb", ausente)]);
    expect(report.counts).toEqual({ objects: 1, withRow: 1, orphanObjects: 0, missingObjects: 1, reviewKeys: 0 });
    expect(report.entries.at(-1)).toEqual({ status: "fila_sin_objeto", id: "bbbb", projectId: proyecto, storageKey: ausente });
  });

  it("devuelve recuentos a cero con un conjunto vacío", () => {
    expect(clasificarInventario([], [])).toEqual({
      entries: [],
      counts: { objects: 0, withRow: 0, orphanObjects: 0, missingObjects: 0, reviewKeys: 0 },
    });
  });

  it("reconoce solo las claves del formato actual", () => {
    for (const key of [
      `${proyecto}/task-image/aaaa.png`,
      `${proyecto}/board-asset/bbbb.webp`,
      `${proyecto}/document/cccc.pdf`,
      `${proyecto}/task-image/id_con-guion.gif`,
    ]) {
      expect(esClaveDeSubida(key), key).toBe(true);
    }
    for (const key of [
      "",
      "original",
      `${proyecto}/task-image/aaaa.png/bis`,
      `${proyecto}/task-image/aaaa`,
      `${proyecto}/task-image/aaaa.PNG`,
      `${proyecto}/imagen/aaaa.png`,
      `/task-image/aaaa.png`,
      "x".repeat(MAX_INVENTORY_KEY_LENGTH + 1),
    ]) {
      expect(esClaveDeSubida(key), key).toBe(false);
    }
  });
});
