import { afterEach, describe, expect, it, vi } from "vitest";
import { jsonResponse } from "../../../vitest.setup";
import {
  saveVersionedDocument,
  type LoadedDocument,
  type VersionedSaveResult,
} from "./versioned-document";

describe("contrato de documento versionado", () => {
  afterEach(() => vi.unstubAllGlobals());

  it("distingue carga, guardado y conflicto", () => {
    const loaded: LoadedDocument<{ value: number }> = { state: { value: 1 }, updatedAt: 2, ok: true };
    const saved: VersionedSaveResult = { status: "saved", updatedAt: 3 };
    const conflict: VersionedSaveResult = { status: "conflict", updatedAt: 2 };
    const failed: VersionedSaveResult = { status: "failed" };

    expect([loaded.updatedAt, saved.status, conflict.status, failed.status])
      .toEqual([2, "saved", "conflict", "failed"]);
  });

  it("comparte la petición y devuelve la versión guardada", async () => {
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse({ accepted: true, updatedAt: 12 }));
    vi.stubGlobal("fetch", fetchMock);

    await expect(saveVersionedDocument("/api/app-documents?app=mapas", { nodes: [] }, 7))
      .resolves.toEqual({ status: "saved", updatedAt: 12 });
    expect(fetchMock).toHaveBeenCalledWith("/api/app-documents?app=mapas", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ state: { nodes: [] }, expectedUpdatedAt: 7 }),
    });
  });

  it("lee la versión vigente del conflicto 409", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(
      jsonResponse({ conflict: true, updatedAt: 9 }, false, 409),
    ));

    await expect(saveVersionedDocument("/api/aula-documentos/doc1", { title: "x" }, 8))
      .resolves.toEqual({ status: "conflict", updatedAt: 9 });
  });

  it("no inventa una versión si el 409 no trae JSON válido", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({
      ok: false,
      status: 409,
      json: async () => { throw new Error("sin cuerpo"); },
    } as unknown as Response));

    await expect(saveVersionedDocument("/api/doc", {}, 1))
      .resolves.toEqual({ status: "conflict", updatedAt: null });
  });

  it("devuelve failed si la respuesta no es correcta o falla la red", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValueOnce(jsonResponse({ message: "sin conexión" }, false, 502)));
    await expect(saveVersionedDocument("/api/doc", {}, 1)).resolves.toEqual({ status: "failed" });

    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("offline")));
    await expect(saveVersionedDocument("/api/doc", {}, 1)).resolves.toEqual({ status: "failed" });
  });
});
