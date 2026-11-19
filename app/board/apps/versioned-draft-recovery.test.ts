import { describe, expect, it } from "vitest";
import {
  VERSIONED_DRAFT_RECOVERY_MAX_BYTES,
  readVersionedDraftRecovery,
  saveVersionedDraftRecovery,
  versionedDraftRecoveryKey,
} from "./versioned-draft-recovery";

/** Almacenamiento en memoria para probar la recuperación sin `localStorage`. */
function createStorage() {
  const values = new Map<string, string>();
  return {
    getItem: (key: string) => values.get(key) ?? null,
    setItem: (key: string, value: string) => { values.set(key, value); },
    values,
  };
}

describe("copia recuperable de borradores", () => {
  it("guarda una sola copia por proyecto y app con su fecha", () => {
    const storage = createStorage();
    const first = saveVersionedDraftRecovery(storage, "p1", "mermaid", {
      value: { code: "graph LR" },
      reason: "conflict",
      serverUpdatedAt: 120,
      now: 500,
    });
    const second = saveVersionedDraftRecovery(storage, "p1", "mermaid", {
      value: { code: "flowchart TD" },
      reason: "replace",
      serverUpdatedAt: null,
      now: 900,
    });

    expect(first.ok).toBe(true);
    expect(second.ok).toBe(true);
    expect(storage.values).toHaveLength(1);
    expect(readVersionedDraftRecovery<{ code: string }>(storage, "p1", "mermaid")).toMatchObject({
      version: 1,
      createdAt: 900,
      reason: "replace",
      serverUpdatedAt: null,
      value: { code: "flowchart TD" },
    });
    expect(versionedDraftRecoveryKey("p1", "mermaid")).toBe("aula-kanban:borrador:p1:mermaid");
  });

  it("separa las copias de proyectos y apps distintas", () => {
    const storage = createStorage();
    saveVersionedDraftRecovery(storage, "p1", "mermaid", {
      value: { code: "graph LR" },
      reason: "conflict",
      serverUpdatedAt: 1,
      now: 10,
    });
    saveVersionedDraftRecovery(storage, "p1", "presentaciones", {
      value: { markdown: "# Hola" },
      reason: "conflict",
      serverUpdatedAt: 2,
      now: 20,
    });

    expect(storage.values).toHaveLength(2);
    expect(readVersionedDraftRecovery(storage, "p1", "mermaid")?.value).toEqual({ code: "graph LR" });
    expect(readVersionedDraftRecovery(storage, "p1", "presentaciones")?.value).toEqual({ markdown: "# Hola" });
  });

  it("rechaza copias demasiado grandes sin romper el almacenamiento", () => {
    const storage = createStorage();
    const result = saveVersionedDraftRecovery(storage, "p1", "documentos", {
      value: { text: "x".repeat(VERSIONED_DRAFT_RECOVERY_MAX_BYTES) },
      reason: "replace",
      serverUpdatedAt: null,
    });

    expect(result).toEqual({ ok: false, reason: "too-large" });
    expect(storage.values).toHaveLength(0);
  });

  it("devuelve cuota cuando el navegador rechaza la escritura", () => {
    const storage = createStorage();
    storage.setItem = () => { throw new Error("quota"); };

    const result = saveVersionedDraftRecovery(storage, "p1", "documentos", {
      value: { text: "hola" },
      reason: "conflict",
      serverUpdatedAt: 1,
    });

    expect(result).toEqual({ ok: false, reason: "quota" });
  });

  it("ignora copias corruptas o con forma desconocida", () => {
    const storage = createStorage();
    storage.setItem(versionedDraftRecoveryKey("p1", "mermaid"), "{no es json");
    expect(readVersionedDraftRecovery(storage, "p1", "mermaid")).toBeNull();

    storage.setItem(versionedDraftRecoveryKey("p1", "mermaid"), JSON.stringify({
      version: 2,
      createdAt: 1,
      reason: "conflict",
      serverUpdatedAt: null,
      value: { code: "graph LR" },
    }));
    expect(readVersionedDraftRecovery(storage, "p1", "mermaid")).toBeNull();
  });
});
