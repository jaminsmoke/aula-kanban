import { describe, expect, it } from "vitest";
import { saveAulaRecoveryCopy } from "./recovery";
import {
  aulaDocumentRecoveryStorageKey,
  listDocumentRecoveryCopies,
  migrateDocumentRecoveryCopies,
  saveDocumentRecoveryCopy,
} from "./recovery-document";
import type { AulaDocument } from "./document";

/**
 * Crea un documento de prueba.
 * @param title - Título.
 * @returns Documento válido.
 */
function document(title: string): AulaDocument {
  return {
    schemaVersion: 3,
    title,
    content: {
      type: "doc",
      content: [{ type: "paragraph", content: [{ type: "text", text: title }] }],
    },
  };
}

/**
 * Crea un almacenamiento en memoria.
 * @returns Almacenamiento y mapa.
 */
function memoryStorage() {
  const values = new Map<string, string>();
  return {
    values,
    storage: {
      getItem: (key: string) => values.get(key) ?? null,
      setItem: (key: string, value: string) => { values.set(key, value); },
      removeItem: (key: string) => { values.delete(key); },
    },
  };
}

describe("recuperaciones por documento", () => {
  it("separa las copias por documento y migra la clave antigua", () => {
    const { storage, values } = memoryStorage();
    saveAulaRecoveryCopy(storage, "p1", {
      document: document("Antigua"),
      reason: "replace",
      serverUpdatedAt: 1,
      now: 1_000,
      id: "copia-antigua",
    });

    const migrated = migrateDocumentRecoveryCopies(storage, "p1", "doc1");
    expect(migrated).toMatchObject({ ok: true, migrated: true });
    expect(listDocumentRecoveryCopies(storage, "p1", "doc1").map((copy) => copy.id)).toEqual(["copia-antigua"]);
    expect(values.has(aulaDocumentRecoveryStorageKey("p1", "doc1"))).toBe(true);

    saveDocumentRecoveryCopy(storage, "p1", "doc2", {
      document: document("Documento 2"),
      reason: "replace",
      serverUpdatedAt: 1,
      now: 2_000,
      id: "copia-doc2",
    });
    expect(listDocumentRecoveryCopies(storage, "p1", "doc1").map((copy) => copy.id)).toEqual(["copia-antigua"]);
    expect(listDocumentRecoveryCopies(storage, "p1", "doc2").map((copy) => copy.id)).toEqual(["copia-doc2"]);
    expect(migrateDocumentRecoveryCopies(storage, "p1", "doc1")).toMatchObject({ ok: true, migrated: false });
  });
});
