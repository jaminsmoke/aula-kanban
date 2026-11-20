import { describe, expect, it } from "vitest";
import {
  AULA_RECOVERY_MAX_COPIES,
  AULA_RECOVERY_MAX_TOTAL_BYTES,
  aulaRecoveryStorageKey,
  listAulaRecoveryCopies,
  saveAulaRecoveryCopy,
} from "./recovery";
import { AULA_DOCUMENT_JSON_MAX_LENGTH, type AulaDocument } from "./document";

/**
 * Construye un documento con suficiente texto para probar tamaños.
 * @param title - Título del documento.
 * @param textLength - Longitud del párrafo.
 * @returns Documento de prueba.
 */
function recoveryDocument(title: string, textLength = 12): AulaDocument {
  return {
    schemaVersion: 3,
    title,
    content: {
      type: "doc",
      content: [{
        type: "paragraph",
        content: [{ type: "text", text: "x".repeat(textLength) }],
      }],
    },
  };
}

/**
 * Crea un almacenamiento en memoria para las pruebas.
 * @param failWrites - Si es `true`, `setItem` lanza como una cuota agotada.
 * @returns El almacenamiento y su mapa interno.
 */
function memoryStorage(failWrites = false) {
  const values = new Map<string, string>();
  return {
    values,
    storage: {
      getItem: (key: string) => values.get(key) ?? null,
      setItem: (key: string, value: string) => {
        if (failWrites) throw new Error("QuotaExceededError");
        values.set(key, value);
      },
    },
  };
}

describe("copias locales de Aula Documentos", () => {
  it("guarda y lista las copias de la más reciente a la más antigua", () => {
    const { storage } = memoryStorage();

    saveAulaRecoveryCopy(storage, "p1", {
      document: recoveryDocument("Primera"),
      reason: "replace",
      serverUpdatedAt: 5,
      now: 1_000,
      id: "copia-1",
    });
    saveAulaRecoveryCopy(storage, "p1", {
      document: recoveryDocument("Segunda"),
      reason: "conflict",
      serverUpdatedAt: 9,
      now: 2_000,
      id: "copia-2",
    });

    const copies = listAulaRecoveryCopies(storage, "p1");
    expect(copies.map((copy) => copy.title)).toEqual(["Segunda", "Primera"]);
    expect(copies[0]).toMatchObject({
      id: "copia-2",
      reason: "conflict",
      serverUpdatedAt: 9,
    });
  });

  it("purga las copias más antiguas al superar el número máximo", () => {
    const { storage } = memoryStorage();
    for (let index = 0; index < AULA_RECOVERY_MAX_COPIES + 1; index += 1) {
      saveAulaRecoveryCopy(storage, "p1", {
        document: recoveryDocument(`Copia ${index}`),
        reason: "replace",
        serverUpdatedAt: index,
        now: 1_000 + index,
        id: `copia-${index}`,
      });
    }

    const copies = listAulaRecoveryCopies(storage, "p1");
    expect(copies).toHaveLength(AULA_RECOVERY_MAX_COPIES);
    expect(copies.map((copy) => copy.title)).toEqual(["Copia 3", "Copia 2", "Copia 1"]);
  });

  it("reduce el conjunto cuando supera el tamaño total permitido", () => {
    const { storage } = memoryStorage();
    const textLength = Math.floor(AULA_RECOVERY_MAX_TOTAL_BYTES / 3) + 10;
    for (let index = 0; index < 3; index += 1) {
      const result = saveAulaRecoveryCopy(storage, "p1", {
        document: recoveryDocument(`Grande ${index}`, textLength),
        reason: "replace",
        serverUpdatedAt: index,
        now: 1_000 + index,
        id: `grande-${index}`,
      });
      expect(result.ok).toBe(true);
    }

    const copies = listAulaRecoveryCopies(storage, "p1");
    expect(copies).toHaveLength(2);
    expect(copies.map((copy) => copy.title)).toEqual(["Grande 2", "Grande 1"]);
  });

  it("rechaza una copia que por sí sola supera el límite del documento", () => {
    const { storage } = memoryStorage();
    const result = saveAulaRecoveryCopy(storage, "p1", {
      document: recoveryDocument("Demasiado grande", AULA_DOCUMENT_JSON_MAX_LENGTH),
      reason: "replace",
      serverUpdatedAt: 1,
      now: 1_000,
    });

    expect(result).toEqual({ ok: false, reason: "too-large" });
    expect(listAulaRecoveryCopies(storage, "p1")).toEqual([]);
  });

  it("devuelve cuota agotada sin lanzar y conserva el almacenamiento intacto", () => {
    const { storage, values } = memoryStorage(true);
    const result = saveAulaRecoveryCopy(storage, "p1", {
      document: recoveryDocument("Sin espacio"),
      reason: "conflict",
      serverUpdatedAt: 1,
      now: 1_000,
    });

    expect(result).toEqual({ ok: false, reason: "quota" });
    expect(values.size).toBe(0);
  });

  it("ignora un almacenamiento corrupto y usa una clave por proyecto", () => {
    const { storage, values } = memoryStorage();
    values.set(aulaRecoveryStorageKey("p1"), "{no-json");

    expect(listAulaRecoveryCopies(storage, "p1")).toEqual([]);
    expect(aulaRecoveryStorageKey("p1")).not.toBe(aulaRecoveryStorageKey("p2"));
  });
});
