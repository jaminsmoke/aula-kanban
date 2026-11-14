import { describe, expect, it, vi } from "vitest";
import { jsonResponse } from "../../../../vitest.setup";
import { fetchBoardSnapshot, mergeConflictSnapshot, mergeIncomingSnapshot, saveBoardSnapshot, uploadBoardFiles } from "./whiteboard-persistence";

const board = {
  ownerType: "space",
  ownerId: "board-1",
  snapshot: "{}",
  revision: 2,
  updatedAt: 10,
};

describe("persistencia de whiteboard", () => {
  it("carga el snapshot de la pizarra con el proyecto actual", async () => {
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse(board));
    vi.stubGlobal("fetch", fetchMock);

    await expect(fetchBoardSnapshot("board-1", "space")).resolves.toEqual(board);
    expect(fetchMock).toHaveBeenCalledWith(expect.stringContaining("/api/boards?project=default"), { cache: "no-store" });
  });

  it("guarda snapshot y revisión con PUT", async () => {
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse(board));
    vi.stubGlobal("fetch", fetchMock);

    await saveBoardSnapshot("board-1", "space", "{}", 2);

    expect(fetchMock).toHaveBeenCalledWith(expect.stringContaining("/api/boards?project=default"), expect.objectContaining({
      method: "PUT",
      body: JSON.stringify({ ownerType: "space", ownerId: "board-1", snapshot: "{}", revision: 2 }),
    }));
  });

  it("fusiona el snapshot local con el remoto al resolver un conflicto", () => {
    const current = { elements: [{ id: "a", version: 2, versionNonce: 1 }], files: { local: { dataURL: "local" } } };
    const remote = { elements: [{ id: "a", version: 1, versionNonce: 1 }, { id: "b", version: 1 }], files: { remote: { dataURL: "remote" } } };

    const merged = mergeConflictSnapshot(current, remote);

    expect(merged.elements).toHaveLength(2);
    expect(merged.elements?.find((element) => element.id === "a")?.version).toBe(2);
    expect(merged.files).toEqual({ remote: { dataURL: "remote" }, local: { dataURL: "local" } });
  });

  it("reutiliza las URLs de imágenes ya subidas", async () => {
    const files = { image: { dataURL: "data:image/png;base64,abc", mimeType: "image/png" } };
    const uploaded = new Map([["image", "https://cdn.example/image.png"]]);

    await expect(uploadBoardFiles(files, uploaded, new Set())).resolves.toEqual({
      image: { dataURL: "https://cdn.example/image.png", mimeType: "image/png", status: "saved" },
    });
  });

  it("prioriza los archivos recibidos en directo sin perder los archivos locales", () => {
    const current = { elements: [], files: { image: { dataURL: "data:old" }, local: { dataURL: "local" } } };
    const remote = { elements: [], files: { image: { dataURL: "https://cdn.example/new.png" } } };
    expect(mergeIncomingSnapshot(current, remote).files).toEqual({
      image: { dataURL: "https://cdn.example/new.png" }, local: { dataURL: "local" },
    });
    expect(mergeConflictSnapshot(current, remote).files?.image.dataURL).toBe("data:old");
  });
});
