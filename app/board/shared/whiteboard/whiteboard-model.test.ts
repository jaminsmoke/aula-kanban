import { afterEach, describe, expect, it, vi } from "vitest";
import { EMPTY_SNAPSHOT, colorForUser, mergeElements, parseSnapshot, sceneSignature, uploadBlob, type BoardElement } from "./whiteboard-model";

const { crearMiniatura } = vi.hoisted(() => ({ crearMiniatura: vi.fn() }));
vi.mock("../image-thumbnail", () => ({ crearMiniaturaDeArchivo: crearMiniatura }));

function element(id: string, version: number, versionNonce = 0, isDeleted = false): BoardElement {
  return { id, version, versionNonce, isDeleted };
}

describe("modelo de la pizarra", () => {
  it("fusiona elementos conservando la versión más reciente", () => {
    const merged = mergeElements(
      [element("a", 3), element("b", 2)],
      [element("a", 1), element("b", 4), element("c", 1)],
    );
    expect(merged.map((item) => [item.id, item.version])).toEqual([["a", 3], ["b", 4], ["c", 1]]);
  });

  it("desempata por versionNonce y conserva las tumbas de borrado", () => {
    const merged = mergeElements(
      [element("a", 5, 1), element("b", 2)],
      [element("a", 5, 2), element("b", 3, 0, true)],
    );
    expect(merged.find((item) => item.id === "a")?.versionNonce).toBe(2);
    expect(merged.find((item) => item.id === "b")?.isDeleted).toBe(true);
  });

  it("interpreta un snapshot vacío o corrupto como escena vacía", () => {
    expect(parseSnapshot("")).toBe(EMPTY_SNAPSHOT);
    expect(parseSnapshot("{no es json")).toBe(EMPTY_SNAPSHOT);
    expect(parseSnapshot(JSON.stringify({ type: "excalidraw" }))).toBe(EMPTY_SNAPSHOT);
  });

  it("descarta collaborators y completa los valores por defecto", () => {
    const snapshot = parseSnapshot(JSON.stringify({
      type: "excalidraw",
      elements: [element("a", 1)],
      appState: { zoom: { value: 1 }, collaborators: { stale: true } },
      files: { f1: { dataURL: "/api/files/f1" } },
    }));
    expect(snapshot.elements).toHaveLength(1);
    expect(snapshot.appState).toEqual({ zoom: { value: 1 } });
    expect(snapshot.files).toEqual({ f1: { dataURL: "/api/files/f1" } });
    expect(snapshot.source).toBe("aula-kanban");
  });

  it("firma la escena con elementos y ficheros", () => {
    const files = { f1: { dataURL: "abc" } };
    const base = sceneSignature([element("a", 1, 2)], files);
    expect(base).toBe(sceneSignature([element("a", 1, 2)], files));
    expect(base).not.toBe(sceneSignature([element("a", 2, 2)], files));
    expect(base).not.toBe(sceneSignature([element("a", 1, 2), element("b", 1)], files));
    expect(base).not.toBe(sceneSignature([element("a", 1, 2)], { f1: { dataURL: "abcd" } }));
  });

  it("asigna un color de presencia estable", () => {
    expect(colorForUser("user-1")).toBe(colorForUser("user-1"));
    expect(colorForUser("user-1")).toMatch(/^#[0-9a-f]{6}$/);
  });
});

describe("subida de imágenes de la pizarra", () => {
  let enviado: FormData | null = null;

  afterEach(() => {
    vi.unstubAllGlobals();
    crearMiniatura.mockReset();
    enviado = null;
  });

  function respuestaSubida() {
    vi.stubGlobal("fetch", vi.fn<(input: string, init?: RequestInit) => Promise<Response>>(async (input, init) => {
      if (input.startsWith("data:")) return new Response(new Uint8Array([1, 2, 3, 4]));
      enviado = init?.body as FormData;
      return new Response(JSON.stringify({ url: "/api/files/abc" }), { status: 201 });
    }));
  }

  it("sube un WebP de 2048 px cuando la foto se puede reducir", async () => {
    respuestaSubida();
    crearMiniatura.mockResolvedValue({ blob: new Blob(["x"], { type: "image/webp" }), width: 2048, height: 1536 });

    await expect(uploadBlob("data:image/jpeg;base64,AAAA", "image/jpeg")).resolves.toBe("/api/files/abc");

    expect(crearMiniatura).toHaveBeenCalledWith(expect.any(File), { maxWidth: 2048, onlyWhenResized: true });
    const archivo = enviado?.get("file") as File;
    expect(archivo.name).toBe("board-image.webp");
    expect(archivo.type).toBe("image/webp");
    expect(enviado?.get("purpose")).toBe("board-asset");
  });

  it("deja los PNG intactos y no intenta reducirlos", async () => {
    respuestaSubida();

    await uploadBlob("data:image/png;base64,AAAA", "image/png");

    expect(crearMiniatura).not.toHaveBeenCalled();
    const archivo = enviado?.get("file") as File;
    expect(archivo.name).toBe("board-image");
    expect(archivo.type).toBe("image/png");
  });

  it("sube el original si el generador no devuelve derivado", async () => {
    respuestaSubida();
    crearMiniatura.mockResolvedValue(null);

    await uploadBlob("data:image/jpeg;base64,AAAA", "image/jpeg");

    const archivo = enviado?.get("file") as File;
    expect(archivo.name).toBe("board-image");
    expect(archivo.type).toBe("image/jpeg");
  });
});
